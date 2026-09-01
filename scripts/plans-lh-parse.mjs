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
    // 도면명 표기가 단지마다 다르다: "단위세대구조평면도(3~5층)-1" / "단위세대 구조평면도-1" /
    // "기준층(3~23층) 구조평면도-1" / "1층 구조평면도-2". '전체구조평면도'(동 전체 배치)와
    // 주석의 "…구조평면도 참조" 는 제외한다. 최종 판정은 기하 검증(벽 수·크기)이 한다.
    const cands = [...txt.matchAll(/(?:단위\s*세대\s*구조\s*평면도|기준층\s*(?:\([^)]*\))?\s*구조\s*평면도|(?:지상\s*)?\d+\s*층\s*구조\s*평면도)(?:\s*\([^)]*\))?(?:\s*-\s*\d)?(?!\s*참조)/g)]
      .map(m => ({ s: m[0], i: m.index }))
      .filter(m => !/전체\s*$/.test(txt.slice(Math.max(0, m.i - 8), m.i)));
    const isRebar = /(?:슬래브|벽체|보)\s*배근도\s*(?:\(|-|\d)/.test(txt) && !/단위\s*세대\s*구조\s*평면도\s*\(/.test(txt);
    if (cands.length && !isRebar) out.push({ page: p, title: cands[0].s.replace(/\s+/g, ' ') });
  }
  return { numPages: doc.numPages, pages: out };
}

// 축척 — "축척:1/60(A3:1/120)" 처럼 표기. 페이지 크기가 A3(1191x842)면 A3 값을 쓴다.
// 표기가 단지마다 다르다: "축척:1/60(A3:1/120)" / "축척=1/120(A1:60)" / "SCALE 1:100" …
// 페이지가 A3(≈1191pt)면 A1 원도를 절반으로 줄인 것이라 두 분모 중 큰 값이 A3 축척이다.
function scaleOf(texts, width) {
  const all = texts.map(t => t.str).join(' ');
  const isA3 = width < 1300;
  const explicit = isA3 ? all.match(/A3\s*[:：=]?\s*(?:1\s*[\/:])?\s*(\d{2,3})\b/) : all.match(/A1\s*[:：=]?\s*(?:1\s*[\/:])?\s*(\d{2,3})\b/);
  if (explicit) return { S: +explicit[1], basis: isA3 ? 'A3 표기' : 'A1 표기' };
  const near = [];
  for (const m of all.matchAll(/(?:축\s*척|SCALE|Scale)[^0-9]{0,12}1\s*[\/:]\s*(\d{2,3})(?:\s*\(\s*A[13]\s*[:：]?\s*(?:1\s*[\/:])?\s*(\d{2,3})\s*\))?/g)) {
    near.push(+m[1]); if (m[2]) near.push(+m[2]);
  }
  if (near.length) return { S: isA3 ? Math.max(...near) : Math.min(...near), basis: '축척 문구' };
  return null;
}

// 평행 외곽선 쌍 → 벽. 축 정렬 선만 다룬다(구조도면 벽은 직교).
// 두 단계로 짝짓는다:
//  1차: 두 면 사이에 다른 선이 없는 깨끗한 쌍만.
//  2차: 1차에서 못 잡은 구간에 한해, 사이에 선이 있어도(벽 중심선을 같은 굵기로 그린 도면) 짝을 허용.
//  tMin 125mm — 200mm 벽의 '면–중심선' 거리(100mm)를 벽으로 오인하지 않게 하는 하한.
function pairWalls(segs, mmPerPt, opt = {}) {
  const tMin = (opt.tMin || 125) / mmPerPt, tMax = (opt.tMax || 450) / mmPerPt;
  const H = [], V = [];
  for (const s of segs) {
    const dx = Math.abs(s.b.x - s.a.x), dy = Math.abs(s.b.y - s.a.y);
    const L = Math.hypot(dx, dy); if (L < 2) continue;
    if (dy < 0.5) H.push({ c: (s.a.y + s.b.y) / 2, a1: Math.min(s.a.x, s.b.x), a2: Math.max(s.a.x, s.b.x) });
    else if (dx < 0.5) V.push({ c: (s.a.x + s.b.x) / 2, a1: Math.min(s.a.y, s.b.y), a2: Math.max(s.a.y, s.b.y) });
  }
  const walls = [];
  const pair = (list, horiz, allowBlocked, covered) => {
    list.sort((p, q) => p.c - q.c);
    const used = new Set();
    // 이미 벽이 된 구간인가 (중심선 c, 구간 [o1,o2]) — 2차에서 중복 생성을 막는다
    const isCovered = (c, o1, o2) => covered.some(w => Math.abs(w.c - c) <= 1.5 && Math.min(w.a2, o2) - Math.max(w.a1, o1) > (o2 - o1) * 0.6);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = list[j].c - list[i].c;
        if (d > tMax) break;
        if (d < tMin) continue;
        const o1 = Math.max(list[i].a1, list[j].a1), o2 = Math.min(list[i].a2, list[j].a2);
        const ov = o2 - o1;
        if (ov < Math.min(4, tMin)) continue;
        let blocked = false;
        for (let k = i + 1; k < j && !allowBlocked; k++) {
          const m = list[k];
          if (Math.min(m.a2, o2) - Math.max(m.a1, o1) > ov * 0.5) { blocked = true; break; }
        }
        if (blocked) continue;
        const c = (list[i].c + list[j].c) / 2;
        if (allowBlocked && isCovered(c, o1, o2)) continue;
        const key = [Math.round(list[i].c), Math.round(list[j].c), Math.round(o1), Math.round(o2)].join(',');
        if (used.has(key)) continue; used.add(key);
        walls.push(horiz ? { x1: o1, y1: c, x2: o2, y2: c, t: d } : { x1: c, y1: o1, x2: c, y2: o2, t: d });
      }
    }
  };
  const cov = (horiz) => walls.filter(w => horiz ? Math.abs(w.y1 - w.y2) < 0.01 : Math.abs(w.x1 - w.x2) < 0.01)
    .map(w => horiz ? { c: w.y1, a1: Math.min(w.x1, w.x2), a2: Math.max(w.x1, w.x2) } : { c: w.x1, a1: Math.min(w.y1, w.y2), a2: Math.max(w.y1, w.y2) });
  pair(H, true, false, []); pair(V, false, false, []);
  pair(H, true, true, cov(true)); pair(V, false, true, cov(false));
  return walls;
}

// 같은 중심선·같은 두께의 토막을 잇는다.
// gap: CAD 가 파선 선종을 짧은 실선 조각으로 내보내는 경우가 있어(벽이 점선처럼 끊김) 이 간격까지는 이어 붙인다.
// 문 개구부(700mm 이상)는 잇지 않도록 300mm 안쪽으로 둔다.
function mergeWalls(walls, tol, gap = 0) {
  const out = [];
  for (const w of walls.slice().sort((p, q) => (p.horiz ? p.y1 : p.x1) - (q.horiz ? q.y1 : q.x1))) {
    const horiz = Math.abs(w.y1 - w.y2) < 0.01;
    const c = horiz ? w.y1 : w.x1, a1 = horiz ? w.x1 : w.y1, a2 = horiz ? w.x2 : w.y2;
    const hit = out.find(o => o.horiz === horiz && Math.abs(o.c - c) <= tol && Math.abs(o.t - w.t) <= tol * 2
      && a1 <= o.a2 + tol + gap && a2 >= o.a1 - tol - gap);
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

// 축척 후보 — 표기 방식이 단지마다 달라 후보를 순서대로 모으고, 벽 두께로 실제 맞는 것을 고른다.
//  ① 명시 표기 "A3:1/120" "축척=1/100(A3:200)"  ② 표(칸) 배치: "A3" 토큰과 같은 행의 "1/N" 토큰
//  ③ 페이지의 모든 "1/N" (A3면 큰 값 우선)  ④ 흔한 축척 목록(숫자가 글꼴 외곽선이라 안 읽히는 도면)
function scaleCandidates(texts, width) {
  const isA3 = width < 1300;
  const out = [];
  const push = (S, basis) => { if (S >= 20 && S <= 400 && !out.some(o => o.S === S)) out.push({ S, basis }); };
  const sc = scaleOf(texts, width);
  if (sc) push(sc.S, sc.basis);
  const tag = isA3 ? /^A3$/ : /^A1$/;
  const ratio = /^1\s*[\/:]\s*(\d{2,3})$/;
  for (const t of texts) {
    if (!tag.test(t.str.trim())) continue;
    let best = null;
    for (const u of texts) {
      const m = u.str.trim().match(ratio); if (!m) continue;
      if (Math.abs(u.y - t.y) > 8 || u.x < t.x) continue;
      const dx = u.x - t.x;
      if (!best || dx < best.dx) best = { dx, S: +m[1] };
    }
    if (best) push(best.S, '표 배치');
  }
  const all = [...new Set(texts.map(t => (t.str.trim().match(ratio) || [])[1]).filter(Boolean).map(Number))].sort((x, y) => isA3 ? y - x : x - y);
  for (const S of all) push(S, '1/N 토큰');
  for (const S of [120, 100, 60, 150, 200, 80, 50, 40, 30]) push(S, '두께 추정');
  return out;
}

export async function parseUnitPage(file, page) {
  const d = await extractPage(file, page);
  // 벽 외곽선 클래스 — 단지마다 굵기 체계가 다르다(담양 0.96pt, 다른 단지 0.72pt).
  // 가장 많이 쓰인 가는 선(치수·해치) 굵기의 1.4배 이상인 클래스 중 총 길이가 가장 긴 것을 벽으로 본다.
  const byLw = {};
  for (const sg of d.segs) { if (sg.filled || sg.dashed) continue; const k = sg.lw.toFixed(2); byLw[k] = (byLw[k] || 0) + Math.hypot(sg.b.x - sg.a.x, sg.b.y - sg.a.y); }
  const sorted = Object.entries(byLw).sort((x, y) => y[1] - x[1]);
  if (!sorted.length) return { ok: false, reason: '획 없음' };
  const thinLw = +sorted[0][0];
  const lwKey = sorted.filter(([k]) => +k >= Math.max(0.45, thinLw * 1.4))[0];
  if (!lwKey) return { ok: false, reason: `굵은 획(벽) 없음 (가는 선 ${thinLw}pt)` };
  const wallSegs = d.segs.filter(sg => !sg.filled && !sg.dashed && sg.lw.toFixed(2) === lwKey[0]);   // 파선(상부선) 제외
  const title = (d.texts.map(t => t.str).join(' ').match(/(?:단위\s*세대\s*구조\s*평면도|기준층\s*(?:\([^)]*\))?\s*구조\s*평면도|(?:지상\s*)?\d+\s*층\s*구조\s*평면도)(?:\s*\([^)]*\))?(?:\s*-\s*\d)?/) || [''])[0].replace(/\s+/g, ' ');
  const dimVals = d.texts.map(t => +t.str.replace(/,/g, '').trim()).filter(v => v >= 1000 && v <= 60000);
  const bigDim = dimVals.length ? Math.max(...dimVals) : null;

  // 주어진 축척으로 벽을 만들어 본다
  const buildAt = (S) => {
    const mmPerPt = PT_MM * S;
    const raw = pairWalls(wallSegs, mmPerPt);
    const merged = mergeWalls(mergeWalls(raw, 0.6), 0.6, 300 / mmPerPt);   // 2회: 먼저 맞닿은 것, 다음 파선 간격
    const cl = clusters(merged, 40);
    if (!cl.length) return null;
    const main = cl[0];
    // 재현율 — 주 도면 영역 안의 벽 외곽선 길이 중 벽 footprint 에 덮인 비율. 낮으면 벽을 놓친 것이다.
    const bx0 = main.x0 - 2, by0 = main.y0 - 2, bx1 = main.x1 + 2, by1 = main.y1 + 2;
    let outlineLen = 0, coveredLen = 0;
    for (const sg of wallSegs) {
      const hx = Math.abs(sg.b.y - sg.a.y) < 0.5, vx = Math.abs(sg.b.x - sg.a.x) < 0.5;
      if (!hx && !vx) continue;
      const mx = (sg.a.x + sg.b.x) / 2, my = (sg.a.y + sg.b.y) / 2;
      if (mx < bx0 || mx > bx1 || my < by0 || my > by1) continue;
      const L = Math.hypot(sg.b.x - sg.a.x, sg.b.y - sg.a.y); if (L < 1) continue;
      outlineLen += L;
      const c = hx ? my : mx, s1 = hx ? Math.min(sg.a.x, sg.b.x) : Math.min(sg.a.y, sg.b.y), s2 = hx ? Math.max(sg.a.x, sg.b.x) : Math.max(sg.a.y, sg.b.y);
      let cov = 0;
      for (const w of main.walls) {
        const wh = Math.abs(w.y1 - w.y2) < 0.01; if (wh !== hx) continue;
        const wc = wh ? w.y1 : w.x1; if (Math.abs(wc - c) > w.t / 2 + 1) continue;
        const w1 = wh ? Math.min(w.x1, w.x2) : Math.min(w.y1, w.y2), w2 = wh ? Math.max(w.x1, w.x2) : Math.max(w.y1, w.y2);
        cov = Math.max(cov, Math.min(w2, s2) - Math.max(w1, s1));
      }
      coveredLen += Math.max(0, Math.min(L, cov));
    }
    const coverage = outlineLen ? coveredLen / outlineLen : 0;
    const ox = main.x0, oy = main.y0;
    const R = v => Math.round(v * mmPerPt);
    const walls = main.walls.map((w, i) => ({
      id: `w-lh-${i}`, x1: R(w.x1 - ox), y1: R(w.y1 - oy), x2: R(w.x2 - ox), y2: R(w.y2 - oy),
      thickness: Math.max(50, Math.round(w.t * mmPerPt / 10) * 10),
    })).filter(w => w.x1 !== w.x2 || w.y1 !== w.y2);
    const widthMm = Math.round((main.x1 - main.x0) * mmPerPt), heightMm = Math.round((main.y1 - main.y0) * mmPerPt);
    const longWalls = walls.slice().sort((p, q) => Math.hypot(q.x2 - q.x1, q.y2 - q.y1) - Math.hypot(p.x2 - p.x1, p.y2 - p.y1)).slice(0, Math.max(4, walls.length >> 2));
    const lt = longWalls.map(w => w.thickness).sort((p, q) => p - q);
    const longThick = lt[lt.length >> 1] || null;
    const tks = walls.map(w => w.thickness).sort((p, q) => p - q);
    return { mmPerPt, walls, main, widthMm, heightMm, longThick, coverage, clusters: cl.length, medianThick: tks[tks.length >> 1] || null, origin: { x: ox, y: oy } };
  };
  // 축척·품질 검증 — 긴 벽 두께가 벽체 상식 범위(130~320mm), 세대 평면 크기, 외곽선 재현율 80% 이상
  // 축척 선택은 두께·크기로만 한다 (재현율로 고르면 엉뚱한 축척이 '맞아 보일' 수 있다)
  const fits = r => r && r.longThick != null && r.longThick >= 130 && r.longThick <= 320 && r.widthMm >= 6000 && r.widthMm <= 60000 && r.heightMm >= 4000 && r.walls.length >= 20;
  const COV_MIN = 0.5;   // 외곽선에는 100mm 난간·계단 상세도 섞여 있어 80% 는 정상 도면도 못 넘는다(실측 59~83%)
  let picked = null, first = null;
  for (const cand of scaleCandidates(d.texts, d.width)) {
    const r = buildAt(cand.S);
    if (!r) continue;
    if (!first) first = { ...r, scale: cand.S, scaleBasis: cand.basis };
    if (fits(r)) { picked = { ...r, scale: cand.S, scaleBasis: cand.basis }; break; }
  }
  const r = picked || first;
  if (!r) return { ok: false, reason: '벽 쌍 없음' };
  const warn = [];
  if (picked && r.coverage < COV_MIN) { warn.push(`외곽선 재현율 ${Math.round(r.coverage * 100)}% — 벽 누락`); picked = null; }
  if (!picked && r.coverage >= COV_MIN) {
    if (r.longThick == null || r.longThick < 130 || r.longThick > 320) warn.push(`장벽 두께 ${r.longThick}mm — 축척 의심`);
    if (r.walls.length < 20) warn.push(`벽 ${r.walls.length}개 — 도면 아님(부재 일람·상세)`);
    if (r.widthMm < 6000 || r.heightMm < 4000) warn.push(`크기 ${r.widthMm}×${r.heightMm}mm — 세대 평면 아님`);
    if (r.coverage < 0.8) warn.push(`외곽선 재현율 ${Math.round(r.coverage * 100)}% — 벽 누락`);
  }
  // 표기 축척과 다른 축척이 채택됐으면 남긴다 (한 장에 축척이 다른 도면이 섞인 경우가 있다)
  const explicitS = scaleOf(d.texts, d.width);
  const scaleNote = (picked && explicitS && explicitS.S !== r.scale) ? `표기 1/${explicitS.S} 대신 벽 두께로 1/${r.scale} 채택` : null;
  const widthErr = bigDim ? Math.abs(r.widthMm - bigDim) / bigDim : null;
  return {
    ok: true, page, title, scale: r.scale, scaleBasis: r.scaleBasis, scaleNote, mmPerPt: r.mmPerPt, lw: +lwKey[0], longThick: r.longThick, coverage: r.coverage, warn, verified: !!picked,
    walls: r.walls, wallCount: r.walls.length, clusters: r.clusters,
    widthMm: r.widthMm, heightMm: r.heightMm, bigDim, widthErr, medianThick: r.medianThick,
    origin: r.origin, pageSize: { w: d.width, h: d.height },
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
      verified: !!res.verified, warn: res.warn || [], source: 'LH 건축구조도면공개', source_file: basename(meta.file), source_page: res.page,
      scale: res.scale, scale_basis: res.scaleBasis, scale_note: res.scaleNote || null, mm_per_pt: res.mmPerPt, width_mm: res.widthMm, height_mm: res.heightMm,
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
