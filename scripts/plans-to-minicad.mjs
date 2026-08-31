// 분양 실도면(래스터) → MiniCAD 도면 JSON (벽 + 배경 이미지)
// 2026-08-29 대표 지시: "미니캐드에서 활용할수있게 전환. 단 지금의 이미지도 있어야한다"
//
// 원칙 — 없는 것을 만들지 않는다:
//  · 스케일 검증(전용면적 ↔ 검출 내부면적, 벽 두께 타당성)을 통과하지 못하면 벽 좌표를 내보내지 않고
//    배경 이미지만 담은 문서를 만든다. 치수가 틀린 벽은 견적을 망가뜨리기 때문이다.
//  · 방 이름은 도면 글자를 읽어야 알 수 있으므로 지어내지 않는다(빈 이름 + 면적).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import sharp from 'sharp';
import { detectRegions } from './plans-detect-region.mjs';
import { roomsFromWalls } from './plans-rooms.mjs';

const DARK = +(process.env.PLAN_DARK || 110);   // 실험으로 정한다 (plans-sweep)
const PUB = 'https://gdcfqbdgubgpzusbtftf.supabase.co/storage/v1/object/public/floor-plans/';

// ── 축에 나란한 벽 밴드 추출 ─────────────────────────────────────────
// ── 축에 나란한 벽 밴드 추출 ─────────────────────────────────────────
// 이전 방식은 '어두운 긴 획' 만 봐서 회색 경량벽을 통째로 놓치고(재현율 45%),
// 가구 윤곽선까지 벽으로 잡았다(정밀도 64%). 두 가지를 바꾼다.
//  ① 밝기 기준을 넓히되(회색 벽 포함) 1~2px 얇은 선은 침식으로 떨어뜨린다 → 벽은 '두께가 있는 띠'다
//  ② 가로/세로 점유 표시를 분리한다 → 교차점에서 한쪽 벽이 통째로 사라지던 문제 해결
function erode1(mask, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (mask[i] && mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w]) out[i] = 1;
  }
  return out;
}
// 벽 네트워크만 남긴다 — 벽은 방을 둘러싸며 서로 이어진 큰 덩어리이고,
// 가구·설비·글자는 그와 떨어진 작은 덩어리다. 크기로 가르면 침식 없이도 가구를 뺄 수 있다.
function wallNetwork(mask, w, h) {
  const lbl = new Int32Array(w * h).fill(-1);
  const keep = new Uint8Array(w * h);
  const areaMin = w * h * 0.004;
  const diagMin = Math.hypot(w, h) * 0.28;
  const st = [];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (!mask[i0] || lbl[i0] >= 0) continue;
    const id = i0, cells = [];
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    lbl[i0] = id; st.push(i0);
    while (st.length) {
      const p = st.pop(), px = p % w, py = (p / w) | 0;
      cells.push(p);
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && lbl[q] < 0) { lbl[q] = id; st.push(q); }
      }
    }
    const diag = Math.hypot(x1 - x0 + 1, y1 - y0 + 1);
    if (cells.length >= areaMin || diag >= diagMin) for (const p of cells) keep[p] = 1;
  }
  return keep;
}
function bands(mask, core, w, h, horiz, minLen, maxThick) {
  const A = horiz ? h : w, B = horiz ? w : h;
  const seen = new Uint8Array(w * h);              // 방향별로 따로 — 교차점에서 서로를 지우지 않게
  const out = [];
  const coverAt = (row, s0, e0) => {
    let c = 0;
    for (let k = s0; k < e0; k++) {
      if (horiz) { if (row >= 0 && row < h && mask[row * w + k]) c++; }
      else { if (row >= 0 && row < w && mask[k * w + row]) c++; }
    }
    return c;
  };
  for (let a2 = 0; a2 < A; a2++) {
    let st = -1;
    for (let b2 = 0; b2 <= B; b2++) {
      const on = b2 < B && (horiz ? core[a2 * w + b2] : core[b2 * w + a2]);
      if (on && st < 0) st = b2;
      if (!on && st >= 0) {
        const len = b2 - st;
        if (len >= minLen) {
          let dup = false;
          for (let k = st; k < b2 && !dup; k++) if (horiz ? seen[a2 * w + k] : seen[k * w + a2]) dup = true;
          if (!dup) {
            let up = 0, dn = 0;
            while (up < maxThick && coverAt(a2 - up - 1, st, b2) >= len * 0.8) up++;
            while (dn < maxThick && coverAt(a2 + dn + 1, st, b2) >= len * 0.8) dn++;
            const t = up + dn + 1;
            if (t <= maxThick) {
              for (let tt = -up; tt <= dn; tt++) {
                const rr = a2 + tt; if (rr < 0) continue;
                for (let k = st; k < b2; k++) {
                  if (horiz) { if (rr < h) seen[rr * w + k] = 1; }
                  else { if (rr < w) seen[k * w + rr] = 1; }
                }
              }
              out.push({ horiz: horiz ? 1 : 0, a1: st, a2: b2, c: a2 + (dn - up) / 2, t });
            }
          }
        }
        st = -1;
      }
    }
  }
  return out;
}

function mergeCollinear(list, tol, gap) {
  const sorted = [...list].sort((a, b) => a.c - b.c || a.a1 - b.a1);
  const out = [];
  for (const s of sorted) {
    const prev = out.find(o => Math.abs(o.c - s.c) <= tol && s.a1 <= o.a2 + gap && s.a2 >= o.a1 - gap);
    if (prev) {
      prev.a1 = Math.min(prev.a1, s.a1); prev.a2 = Math.max(prev.a2, s.a2);
      prev.c = (prev.c * prev.n + s.c) / (prev.n + 1); prev.n++;
      prev.t = Math.max(prev.t, s.t);
    } else out.push({ ...s, n: 1 });
  }
  return out;
}

// 같은 선 위에 놓인 벽 조각들 사이의 빈 구간 = 문·창 개구부
function gapsBetween(list, tol, maxGap) {
  const lines = [];
  for (const s2 of list) {
    let ln = lines.find(l => Math.abs(l.c - s2.c) <= tol);
    if (!ln) { ln = { c: s2.c, items: [] }; lines.push(ln); }
    ln.items.push(s2);
  }
  const gaps = [];
  for (const ln of lines) {
    ln.items.sort((x, y) => x.a1 - y.a1);
    for (let i = 1; i < ln.items.length; i++) {
      const g = ln.items[i].a1 - ln.items[i - 1].a2;
      if (g > 2 && g <= maxGap) gaps.push(g);
    }
  }
  return gaps;
}

// 크롭이 '직교 2D 평면도' 인지 판정하는 특징값.
//  · step : 바깥 윤곽이 계단형인가. 2D 평면도의 외곽은 축에 나란해 행마다 최좌단 x 가 그대로다.
//           3D 아이소메트릭은 모서리가 기울어 행마다 밀린다. (실측: 2D 0.85~0.97 / 3D 0.33~0.37)
//  · axis : 어두운 획이 긴 수평·수직 선에 속한 비율
//  · dark : 잉크 밀도. 배너·사양표는 지나치게 높다
function shapeStats(mask, w, h) {
  const minRun = Math.max(6, Math.round(Math.min(w, h) * 0.03));
  const run = new Uint8Array(w * h);
  const scan = (outer, inner, idx) => {
    for (let a = 0; a < outer; a++) {
      let st = -1;
      for (let b = 0; b <= inner; b++) {
        const on = b < inner && mask[idx(a, b)];
        if (on && st < 0) st = b;
        if (!on && st >= 0) { if (b - st >= minRun) for (let k = st; k < b; k++) run[idx(a, k)] = 1; st = -1; }
      }
    }
  };
  scan(h, w, (y, x) => y * w + x);
  scan(w, h, (x, y) => y * w + x);
  let dark = 0, inRun = 0;
  for (let i = 0; i < w * h; i++) if (mask[i]) { dark++; if (run[i]) inRun++; }

  const L = [], R = [], T = [], B = [];
  for (let y = 0; y < h; y++) { let a = -1, b = -1;
    for (let x = 0; x < w; x++) if (mask[y * w + x]) { if (a < 0) a = x; b = x; }
    L.push(a); R.push(b); }
  for (let x = 0; x < w; x++) { let a = -1, b = -1;
    for (let y = 0; y < h; y++) if (mask[y * w + x]) { if (a < 0) a = y; b = y; }
    T.push(a); B.push(b); }
  const flat = arr => { let same = 0, n = 0;
    for (let i = 1; i < arr.length; i++) { if (arr[i] < 0 || arr[i - 1] < 0) continue; n++; if (arr[i] === arr[i - 1]) same++; }
    return n ? same / n : 0; };
  return { axis: dark ? inRun / dark : 0, dark: dark / (w * h), step: (flat(L) + flat(R) + flat(T) + flat(B)) / 4 };
}

export async function convert(file, opt = {}) {
  const area_m2 = opt.exclusive_area_m2 || null;
  const { regions, srcW, w: dw } = await detectRegions(file, { dilate: 14 });
  if (!regions.length) return { ok: false, reason: '평면도 영역 없음' };
  // 가장 큰 영역 하나만 벡터화한다 (여러 타입이 한 장에 쌓인 경우, 나머지는 배경으로 남는다)
  const r = regions[0];
  const k = srcW / dw, pad = 16;   // 여백을 넉넉히 — 좁으면 도면 가장자리가 잘려 면적·축척이 틀어진다
  const L = Math.max(0, Math.round((r.x0 - pad) * k)), T = Math.max(0, Math.round((r.y0 - pad) * k));
  const { width: sw, height: sh } = await sharp(file).metadata();
  const Wd = Math.min(sw - L, Math.round((r.bw + pad * 2) * k));
  const Hd = Math.min(sh - T, Math.round((r.bh + pad * 2) * k));
  if (Wd < 60 || Hd < 60) return { ok: false, reason: '평면도 영역이 너무 작음' };
  const { data, info } = await sharp(file).extract({ left: L, top: T, width: Wd, height: Hd })
    .resize({ width: Math.min(opt.work || +(process.env.PLAN_WORK || 1000), Wd) }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const mask = new Uint8Array(w * h);
  let darkPx = 0;
  for (let i = 0; i < w * h; i++) { mask[i] = data[i] < DARK ? 1 : 0; darkPx += mask[i]; }

  // 이 크롭이 그릴 수 있는 도면인지 먼저 가린다 — 아니면 벽을 만들지 않는다
  const shape = shapeStats(mask, w, h);
  const aspect = w / h;
  const shapeBad = [];
  if (shape.step < 0.70) shapeBad.push(`3D 투시 추정(외곽 계단 ${shape.step.toFixed(2)})`);
  if (shape.axis < 0.80) shapeBad.push(`직교 획 부족(${shape.axis.toFixed(2)})`);
  if (shape.dark > 0.28) shapeBad.push(`잉크 과다(${shape.dark.toFixed(2)}) — 배너·사양표 추정`);
  if (aspect > 2.1 || aspect < 0.45) shapeBad.push(`비율 이상(${aspect.toFixed(2)}) — 여러 도면이 한 영역`);

  const minLen = Math.max(10, Math.round(Math.min(w, h) * 0.018));  // 문 옆 짧은 벽까지
  const maxThick = Math.round(Math.min(w, h) * 0.05);
  const tol0 = Math.max(2, maxThick / 2);
  const CORE = process.env.PLAN_CORE || 'raw';   // 현재 배포본 기준. erode/net 은 실험용(plans-sweep)
  const core = CORE === 'net' ? wallNetwork(mask, w, h)
    : CORE === 'erode' ? erode1(mask, w, h) : mask;
  const rawH = bands(mask, core, w, h, true, minLen, maxThick);
  const rawV = bands(mask, core, w, h, false, minLen, maxThick);
  const hb = mergeCollinear(rawH, tol0, minLen);
  const vb = mergeCollinear(rawV, tol0, minLen);
  if (hb.length + vb.length < 6) return { ok: false, reason: '벽 검출 부족' };

  // 내부 면적(픽셀) — 도면 바깥에서 채워 들어가 닿지 않는 곳이 '내부'다.
  // 원본 마스크는 문·창 자리에서 끊겨 바깥 물이 새어 들어온다 → 병합한 벽을 다시 그려 닫은 뒤 채운다.
  const wallRaster = new Uint8Array(w * h);
  const stamp = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) wallRaster[y * w + x] = 1; };
  const SEAL = Math.max(2, Math.round(maxThick * 0.6));   // 문 개구부만큼 벌어진 틈을 메운다
  for (const b of hb) for (let x = Math.round(b.a1) - SEAL; x <= Math.round(b.a2) + SEAL; x++)
    for (let d = -SEAL; d <= SEAL; d++) stamp(x, Math.round(b.c) + d);
  for (const b of vb) for (let y = Math.round(b.a1) - SEAL; y <= Math.round(b.a2) + SEAL; y++)
    for (let d = -SEAL; d <= SEAL; d++) stamp(Math.round(b.c) + d, y);
  const outside = new Uint8Array(w * h);
  const st = [];
  const push = i => { if (!outside[i] && !wallRaster[i]) { outside[i] = 1; st.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (st.length) {
    const p = st.pop(), px = p % w, py = (p / w) | 0;
    if (px > 0) push(p - 1); if (px < w - 1) push(p + 1);
    if (py > 0) push(p - w); if (py < h - 1) push(p + w);
  }
  let interiorPx = 0;
  for (let i = 0; i < w * h; i++) if (!outside[i]) interiorPx++;   // 벽 두께 포함 내부 = 안목치수에 가깝다

  // ── 스케일 ─────────────────────────────────────────────────────────
  // 전용면적이 있으면 '검출 내부면적 = 전용면적' 으로 맞춘다. 없으면 벡터를 만들지 않는다.
  let mmPerPx = null, scaleBasis = null, warn = [];
  if (area_m2 && interiorPx > 1000) {
    mmPerPx = Math.sqrt((area_m2 * 1e6) / interiorPx);
    scaleBasis = '전용면적';
  }
  const thicks = [...hb, ...vb].map(b => b.t).sort((a, b) => a - b);
  const medThick = thicks.length ? thicks[thicks.length >> 1] : 0;
  const thickMm = mmPerPx ? medThick * mmPerPx : null;
  // 검증 — 벽 두께가 상식 범위를 벗어나면 스케일이 틀린 것이다
  if (thickMm != null && (thickMm < 50 || thickMm > 450)) warn.push(`벽두께 ${Math.round(thickMm)}mm`);
  const unitWmm = mmPerPx ? w * mmPerPx : null;
  if (unitWmm != null && (unitWmm < 3000 || unitWmm > 40000)) warn.push(`전체폭 ${Math.round(unitWmm)}mm`);
  // 검증 기준을 벽 두께 분포에서 "문 개구부 폭" 으로 바꾼다.
  // 벽 조각 사이의 틈이 곧 문·창 개구부이고, 한국 실내문은 800~900mm 로 표준화돼 있다.
  // 스케일이 맞으면 그 구간에 봉우리가 생긴다 — 축척이 맞는지를 직접 재는 셈이라
  // 두께 분포보다 근거가 분명하고, 3D 투시 렌더처럼 축척이 없는 그림은 자연히 걸러진다.
  // (실측: 검증 통과 도면 40장·표본 1,192개에서 문 구간 중앙값 862mm)
  let doorMed = null, doorN = 0;
  if (mmPerPx) {
    const gaps = gapsBetween(hb, tol0, w * 0.25).concat(gapsBetween(vb, tol0, h * 0.25))
      .map(g => g * mmPerPx).filter(v => v >= 600 && v <= 1300).sort((x, y) => x - y);
    doorN = gaps.length;
    doorMed = doorN ? gaps[doorN >> 1] : null;
    if (doorN < 6) warn.push(`개구부 표본 ${doorN}개`);
    else if (doorMed < 700 || doorMed > 1060) warn.push(`문폭 ${Math.round(doorMed)}mm`);
  }
  warn.push(...shapeBad);
  const verified = !!mmPerPx && warn.length === 0;

  // ── 방(공간) 추출 ───────────────────────────────────────────────────
  // 픽셀 덩어리가 아니라 '검출된 벽 선분'으로 격자를 만들어 나눈다.
  // 문틈은 벽 병합 단계에서 이미 이어 놓았으므로, 벽이 없는 경계만 같은 방으로 합쳐진다.
  const isInside = (cx, cy) => {
    const x = Math.round(cx), y = Math.round(cy);
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return !outside[y * w + x];
  };
  const rooms = verified ? roomsFromWalls(hb, vb, w, h, isInside)
    .filter(r2 => r2.area > w * h * 0.004 && r2.rectFill > 0.9) : [];

  const R = v => Math.round(v * mmPerPx);
  // 400mm 를 넘는 '벽'은 벽이 아니라 채워진 그래픽(난간·기둥 블록·강조 띠)이다 → 내보내지 않는다.
  // 벽으로 내보내면 MiniCAD 에서 벽 물량이 부풀어 견적이 틀어진다.
  const MAXW = 400;
  const wallOf = (id, x1, y1, x2, y2, t) => {
    const mm = Math.max(50, R(t));
    return mm > MAXW ? null : { id, x1: R(x1), y1: R(y1), x2: R(x2), y2: R(y2), thickness: mm };
  };
  // 2026-08-31 대표 지시 "정확도 우선": 픽셀 추출 벽은 재현 46%·정밀 54% 로 실측됐다.
  // 반쯤 맞는 벽은 없느니만 못하다(사용자가 믿고 견적을 낸다). 축척(검증됨)만 넘기고 벽은 내보내지 않는다.
  // 벽 좌표는 벡터 PDF 파서(plans-pdf-*.mjs)로만 만든다. 실험이 필요하면 PLAN_EMIT_WALLS=1.
  const EMIT = process.env.PLAN_EMIT_WALLS === '1';
  const walls = (verified && EMIT) ? [
    ...hb.map((b, i) => wallOf(`w-h${i}`, b.a1, b.c, b.a2, b.c, b.t)),
    ...vb.map((b, i) => wallOf(`w-v${i}`, b.c, b.a1, b.c, b.a2, b.t)),
  ].filter(Boolean).filter(w => w.x1 !== w.x2 || w.y1 !== w.y2) : [];

  const spaces = rooms.map((r2, i) => ({
    id: `sp-${String(i + 1).padStart(2, '0')}`,
    name: '',                       // 방 이름은 도면 글자를 읽어야 안다 — 지어내지 않는다
    type: 'ROOM',
    polygon: [
      { x: R(r2.x0), y: R(r2.y0) }, { x: R(r2.x1), y: R(r2.y0) },
      { x: R(r2.x1), y: R(r2.y1) }, { x: R(r2.x0), y: R(r2.y1) },
    ],
  }));
  const spaceArea = spaces.reduce((a, sp) => {
    const dx = Math.abs(sp.polygon[1].x - sp.polygon[0].x), dy = Math.abs(sp.polygon[2].y - sp.polygon[1].y);
    return a + dx * dy / 1e6;
  }, 0);

  const spaceOk = !!area_m2 && spaceArea >= area_m2 * 0.85 && spaceArea <= area_m2 * 1.15;
  const outSpaces = (spaceOk && EMIT) ? spaces : [];   // 공간도 픽셀 추정치 — 벡터 파서 전까지 내보내지 않는다

  return {
    ok: true, verified, warn, walls, spaces: outSpaces, spaceArea, spaceOk, spaceFound: spaces.length,
    crop: { left: L, top: T, width: Wd, height: Hd },
    work: { w, h },
    mm_per_px: mmPerPx,                      // 크롭 후 작업 해상도 기준
    bg_mm_per_px: mmPerPx ? mmPerPx * (Wd / w) : null,  // 원본 크롭 픽셀 기준(배경 이미지용)
    interiorPx, medThickPx: medThick, thickMm, scaleBasis, doorMed, doorN, shape, aspect,
    regionCount: regions.length,
  };
}

if (process.argv[1]?.endsWith('plans-to-minicad.mjs')) {
  const f = process.argv[2], a = process.argv[3] ? +process.argv[3] : null;
  const r = await convert(f, { exclusive_area_m2: a });
  console.log(JSON.stringify({ ...r, walls: r.walls ? r.walls.length : 0 }, null, 1));
}

// ── MiniCAD 문서로 포장 ───────────────────────────────────────────────
// 배경 이미지는 반드시 함께 넣는다 (대표 지시: "지금의 이미지도 있어야한다").
// MiniCAD 는 meta.background 의 mm_per_px 로 배경을 실제 치수에 맞춰 깐다.
export function toMiniCadDoc(res, row) {
  const title = [row.complex_name, row.area_type].filter(Boolean).join(' ');
  const note = res.verified
    ? '건설사 공개 평면도를 실제 축척(전용면적 기준·문폭 검증)으로 깐 밑그림. 벽은 스냅으로 따라 그릴 것. 시공 전 실측 확인 필요.'
    : '스케일 검증 실패 — 벽 좌표를 넣지 않았다. 배경 이미지를 보고 직접 작도할 것.';
  return {
    schema: 'ECOREAN.FloorPlan.v5.0',
    meta: {
      project: title, unit: 'mm', ceilingHeight_mm: 2400,
      wallThickness: 150,
      tool: 'ECOREAN 분양도면 벡터 변환기 v1',
      note,
      verified: res.verified,
      scale_basis: res.scaleBasis, mm_per_px: res.mm_per_px,
      exclusive_area_m2: row.exclusive_area_m2 || null,
      source_image: PUB + 'lttot/' + row.store_path,
      source_note: row.complex_name + (row.src_url ? ' · ' + row.src_url : ''),
      // 배경 이미지 — 크롭 영역과 실제 치수 환산값
      background: {
        url: PUB + 'lttot/' + row.store_path,
        crop: res.crop,
        mm_per_px: res.bg_mm_per_px,
        opacity: 0.45,
      },
    },
    spaces: res.spaces || [],
    walls: res.walls || [],
    openings: [],
  };
}
