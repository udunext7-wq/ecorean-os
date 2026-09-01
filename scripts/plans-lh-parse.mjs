// LH 건축구조도면(CAD PDF) → MiniCAD 도면 JSON — 벡터 좌표 그대로, 축척은 도면 표기값.
// 2026-09-01 대표 지시 "정확도 우선·파싱을 제대로": 픽셀 추측이 아니라 원본 선 좌표를 읽는다.
//
// 절차: ① '단위세대구조평면도' 페이지 선택 → ② 표기 축척(A3:1/N) → mm/pt
//       ③ 굵은 획(벽 외곽선) 클래스 분리 → ④ 평행한 외곽선 쌍 → 벽 중심선 + 두께
//       ⑤ 가장 큰 도면 덩어리만 채택(같은 장의 부분평면·범례 제외) → ⑥ 치수 문자로 폭 검증
// 한계: 구조평면도라 비내력 경량벽은 없다(벽식 구조 LH 임대는 대부분 내력벽). 방 이름도 없다.
// 사용: node scripts/plans-lh-parse.mjs <pdf> [--page N] [--out dir]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractPage } from './plans-pdf-extract.mjs';

const PT_MM = 25.4 / 72;

export async function listUnitPages(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const txt = tc.items.map(i => i.str).join(' ');
    // 도면명 칸에 '단위세대구조평면도(N층)' 이 있어야 평면 페이지다 — 배근도 페이지도 참조 문구로 같은 단어를 담고 있다
    const m = txt.match(/단위세대\s*구조\s*평면도\s*\(([^)]*)\)/);
    if (m && !/단위세대\s*(?:슬래브|벽체)\s*배근도\s*\(/.test(txt)) out.push({ page: p, title: m[0] });
  }
  return { numPages: doc.numPages, pages: out };
}

// 축척 — "축척:1/60(A3:1/120)" 처럼 표기. 페이지 크기가 A3(1191x842)면 A3 값을 쓴다.
function scaleOf(texts, width) {
  const all = texts.map(t => t.str).join(' ');
  const a3 = all.match(/A3\s*[:：]\s*1\s*\/\s*(\d+)/);
  const a1 = all.match(/축\s*척\s*[:：]?\s*1\s*\/\s*(\d+)/);
  const isA3 = width < 1300;
  if (isA3 && a3) return { S: +a3[1], basis: 'A3 표기' };
  if (a1) return { S: +a1[1], basis: '표기' };
  return null;
}

// 평행 외곽선 쌍 → 벽. 축 정렬 선만 다룬다(구조도면 벽은 직교).
function pairWalls(segs, mmPerPt, opt = {}) {
  const tMin = (opt.tMin || 100) / mmPerPt, tMax = (opt.tMax || 450) / mmPerPt;
  const H = [], V = [];
  for (const s of segs) {
    const dx = Math.abs(s.b.x - s.a.x), dy = Math.abs(s.b.y - s.a.y);
    const L = Math.hypot(dx, dy); if (L < 2) continue;
    if (dy < 0.5) H.push({ c: (s.a.y + s.b.y) / 2, a1: Math.min(s.a.x, s.b.x), a2: Math.max(s.a.x, s.b.x) });
    else if (dx < 0.5) V.push({ c: (s.a.x + s.b.x) / 2, a1: Math.min(s.a.y, s.b.y), a2: Math.max(s.a.y, s.b.y) });
  }
  const walls = [];
  const pair = (list, horiz) => {
    list.sort((p, q) => p.c - q.c);
    const used = new Set();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = list[j].c - list[i].c;
        if (d > tMax) break;
        if (d < tMin) continue;
        const o1 = Math.max(list[i].a1, list[j].a1), o2 = Math.min(list[i].a2, list[j].a2);
        const ov = o2 - o1;
        if (ov < Math.min(4, tMin)) continue;
        // 두 선 사이에 다른 외곽선이 끼어 있으면(벽 두 겹) 짝이 아니다
        let blocked = false;
        for (let k = i + 1; k < j; k++) {
          const m = list[k];
          if (Math.min(m.a2, o2) - Math.max(m.a1, o1) > ov * 0.5) { blocked = true; break; }
        }
        if (blocked) continue;
        const key = [Math.round(list[i].c), Math.round(list[j].c), Math.round(o1), Math.round(o2)].join(',');
        if (used.has(key)) continue; used.add(key);
        const c = (list[i].c + list[j].c) / 2;
        walls.push(horiz ? { x1: o1, y1: c, x2: o2, y2: c, t: d } : { x1: c, y1: o1, x2: c, y2: o2, t: d });
      }
    }
  };
  pair(H, true); pair(V, false);
  return walls;
}

// 같은 중심선·같은 두께의 토막을 잇는다
function mergeWalls(walls, tol) {
  const out = [];
  for (const w of walls) {
    const horiz = Math.abs(w.y1 - w.y2) < 0.01;
    const c = horiz ? w.y1 : w.x1, a1 = horiz ? w.x1 : w.y1, a2 = horiz ? w.x2 : w.y2;
    const hit = out.find(o => o.horiz === horiz && Math.abs(o.c - c) <= tol && Math.abs(o.t - w.t) <= tol
      && a1 <= o.a2 + tol && a2 >= o.a1 - tol);
    if (hit) { hit.a1 = Math.min(hit.a1, a1); hit.a2 = Math.max(hit.a2, a2); }
    else out.push({ horiz, c, a1, a2, t: w.t });
  }
  return out.map(o => o.horiz ? { x1: o.a1, y1: o.c, x2: o.a2, y2: o.c, t: o.t } : { x1: o.c, y1: o.a1, x2: o.c, y2: o.a2, t: o.t });
}

// 벽 덩어리 묶기 — 같은 장에 부분평면·범례가 함께 있으므로 가장 큰 덩어리만 쓴다
function clusters(walls, gap) {
  const boxes = walls.map(w => ({ x0: Math.min(w.x1, w.x2) - w.t, y0: Math.min(w.y1, w.y2) - w.t, x1: Math.max(w.x1, w.x2) + w.t, y1: Math.max(w.y1, w.y2) + w.t }));
  const par = walls.map((_, i) => i);
  const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const A = boxes[i], B = boxes[j];
    if (A.x0 <= B.x1 + gap && B.x0 <= A.x1 + gap && A.y0 <= B.y1 + gap && B.y0 <= A.y1 + gap) { const ra = find(i), rb = find(j); if (ra !== rb) par[rb] = ra; }
  }
  const g = new Map();
  walls.forEach((w, i) => { const r = find(i); if (!g.has(r)) g.set(r, []); g.get(r).push(w); });
  return [...g.values()].map(ws => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, len = 0;
    for (const w of ws) { x0 = Math.min(x0, w.x1, w.x2); y0 = Math.min(y0, w.y1, w.y2); x1 = Math.max(x1, w.x1, w.x2); y1 = Math.max(y1, w.y1, w.y2); len += Math.hypot(w.x2 - w.x1, w.y2 - w.y1); }
    return { walls: ws, x0, y0, x1, y1, len, area: (x1 - x0) * (y1 - y0) };
  }).sort((a, b) => b.area - a.area);
}

export async function parseUnitPage(file, page) {
  const d = await extractPage(file, page);
  const sc = scaleOf(d.texts, d.width);
  if (!sc) return { ok: false, reason: '축척 표기 없음' };
  const mmPerPt = PT_MM * sc.S;
  // 벽 외곽선 클래스 = 굵기 0.8pt 이상 중 총 길이가 가장 긴 굵기
  const byLw = {};
  for (const s of d.segs) { if (s.filled || s.dashed || s.lw < 0.8) continue; const k = s.lw.toFixed(2); byLw[k] = (byLw[k] || 0) + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y); }
  const lwKey = Object.entries(byLw).sort((a, b) => b[1] - a[1])[0];
  if (!lwKey) return { ok: false, reason: '굵은 획(벽) 없음' };
  const wallSegs = d.segs.filter(s => !s.filled && !s.dashed && s.lw.toFixed(2) === lwKey[0]);   // 파선(상부선) 제외
  const raw = pairWalls(wallSegs, mmPerPt);
  const merged = mergeWalls(raw, 0.6);
  const cl = clusters(merged, 40);
  if (!cl.length) return { ok: false, reason: '벽 쌍 없음' };
  const main = cl[0];
  const ox = main.x0, oy = main.y0;
  const R = v => Math.round(v * mmPerPt);
  const walls = main.walls.map((w, i) => ({
    id: `w-lh-${i}`, x1: R(w.x1 - ox), y1: R(w.y1 - oy), x2: R(w.x2 - ox), y2: R(w.y2 - oy),
    thickness: Math.max(50, Math.round(w.t * mmPerPt / 10) * 10),
  })).filter(w => w.x1 !== w.x2 || w.y1 !== w.y2);
  // 치수 문자 검증 — 도면 폭(외곽선 기준)과 가장 큰 가로 치수 문자 비교
  const widthMm = Math.round((main.x1 - main.x0) * mmPerPt), heightMm = Math.round((main.y1 - main.y0) * mmPerPt);
  const dimVals = d.texts.map(t => +t.str.replace(/,/g, '').trim()).filter(v => v >= 1000 && v <= 60000);
  const bigDim = dimVals.length ? Math.max(...dimVals) : null;
  const widthErr = bigDim ? Math.abs(widthMm - bigDim) / bigDim : null;
  const title = (d.texts.map(t => t.str).join(' ').match(/단위세대\s*구조\s*평면도\s*\([^)]*\)[^\s]{0,4}/) || [''])[0];
  const tks = walls.map(w => w.thickness).sort((a, b) => a - b);
  return {
    ok: true, page, title, scale: sc.S, scaleBasis: sc.basis, mmPerPt, lw: +lwKey[0],
    walls, wallCount: walls.length, clusters: cl.length,
    widthMm, heightMm, bigDim, widthErr, medianThick: tks[tks.length >> 1] || null,
    origin: { x: ox, y: oy }, pageSize: { w: d.width, h: d.height },
  };
}

export function toDoc(res, meta) {
  return {
    schema: 'ECOREAN.FloorPlan.v5.0',
    meta: {
      project: `${meta.complex || basename(meta.file)} ${res.title}`.trim(), unit: 'mm', ceilingHeight_mm: 2300,
      wallThickness: res.medianThick || 200,
      tool: 'ECOREAN LH 구조도면 벡터 파서 v1',
      note: `LH 건축구조도면(CAD PDF) 벡터 좌표. 축척 1/${res.scale}(${res.scaleBasis}). 구조(내력)벽만 — 경량 칸막이벽·방 이름은 없다. 시공 전 실측 확인.`,
      verified: true, source: 'LH 건축구조도면공개', source_file: basename(meta.file), source_page: res.page,
      scale: res.scale, mm_per_pt: res.mmPerPt, width_mm: res.widthMm, height_mm: res.heightMm,
      dim_check: res.bigDim ? { max_dim_text: res.bigDim, width_err: +(res.widthErr * 100).toFixed(2) + '%' } : null,
    },
    spaces: [], walls: res.walls, openings: [],
  };
}

if (process.argv[1]?.endsWith('plans-lh-parse.mjs')) {
  const ARG = process.argv.slice(2);
  const file = ARG[0];
  const only = ARG.includes('--page') ? +ARG[ARG.indexOf('--page') + 1] : null;
  const outDir = ARG.includes('--out') ? ARG[ARG.indexOf('--out') + 1] : null;
  const { pages } = await listUnitPages(file);
  console.log(`${basename(file)} — 단위세대구조평면도 페이지 ${pages.map(p => p.page).join(',') || '없음'}`);
  for (const p of pages) {
    if (only && p.page !== only) continue;
    const r = await parseUnitPage(file, p.page);
    if (!r.ok) { console.log(`  p${p.page} ✘ ${r.reason}`); continue; }
    console.log(`  p${p.page} ✔ ${r.title} · 1/${r.scale} · 벽 ${r.wallCount} (두께 중앙 ${r.medianThick}mm) · 폭 ${r.widthMm}×${r.heightMm}mm · 최대치수 ${r.bigDim} (오차 ${r.widthErr != null ? (r.widthErr * 100).toFixed(1) + '%' : '-'}) · 덩어리 ${r.clusters}`);
    if (outDir) { mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, `${basename(file, '.pdf')}-p${p.page}.json`), JSON.stringify(toDoc(r, { file }))); }
  }
}
