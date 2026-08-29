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

const DARK = 110;
const PUB = 'https://gdcfqbdgubgpzusbtftf.supabase.co/storage/v1/object/public/floor-plans/';

// ── 축에 나란한 벽 밴드 추출 ─────────────────────────────────────────
function bands(mask, w, h, horiz, minLen, maxThick) {
  const at = (x, y) => mask[y * w + x];
  const out = [], seen = new Uint8Array(w * h);
  const A = horiz ? h : w, B = horiz ? w : h;
  for (let a = 0; a < A; a++) {
    let s = -1;
    for (let b = 0; b <= B; b++) {
      const on = b < B && (horiz ? at(b, a) : at(a, b));
      if (on && s < 0) s = b;
      if (!on && s >= 0) {
        const len = b - s;
        if (len >= minLen) {
          let t = 0;
          while (a + t < A) {
            let cover = 0;
            for (let k = s; k < b; k++) if (horiz ? at(k, a + t) : at(a + t, k)) cover++;
            if (cover < len * 0.8) break;
            t++;
          }
          if (t >= 1 && t <= maxThick) {
            let dup = false;
            for (let k = s; k < b && !dup; k++) if (horiz ? seen[a * w + k] : seen[k * w + a]) dup = true;
            if (!dup) {
              for (let tt = 0; tt < t; tt++) for (let k = s; k < b; k++) {
                if (horiz) { if (a + tt < h) seen[(a + tt) * w + k] = 1; }
                else { if (a + tt < w) seen[k * w + a + tt] = 1; }
              }
              out.push(horiz ? { horiz: 1, a1: s, a2: b, c: a + t / 2, t } : { horiz: 0, a1: s, a2: b, c: a + t / 2, t });
            }
          }
        }
        s = -1;
      }
    }
  }
  return out;
}

// 같은 선상에 있는 조각을 하나로 잇는다 (문틀·기둥에서 끊긴 벽 복원)
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

export async function convert(file, opt = {}) {
  const area_m2 = opt.exclusive_area_m2 || null;
  const { regions, srcW, w: dw } = await detectRegions(file, { dilate: 14 });
  if (!regions.length) return { ok: false, reason: '평면도 영역 없음' };
  // 가장 큰 영역 하나만 벡터화한다 (여러 타입이 한 장에 쌓인 경우, 나머지는 배경으로 남는다)
  const r = regions[0];
  const k = srcW / dw, pad = 6;
  const L = Math.max(0, Math.round((r.x0 - pad) * k)), T = Math.max(0, Math.round((r.y0 - pad) * k));
  const { width: sw, height: sh } = await sharp(file).metadata();
  const Wd = Math.min(sw - L, Math.round((r.bw + pad * 2) * k));
  const Hd = Math.min(sh - T, Math.round((r.bh + pad * 2) * k));
  if (Wd < 60 || Hd < 60) return { ok: false, reason: '평면도 영역이 너무 작음' };
  const { data, info } = await sharp(file).extract({ left: L, top: T, width: Wd, height: Hd })
    .resize({ width: Math.min(opt.work || 1000, Wd) }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const mask = new Uint8Array(w * h);
  let darkPx = 0;
  for (let i = 0; i < w * h; i++) { mask[i] = data[i] < DARK ? 1 : 0; darkPx += mask[i]; }

  const minLen = Math.round(Math.min(w, h) * 0.03);
  const maxThick = Math.round(Math.min(w, h) * 0.05);
  const hb = mergeCollinear(bands(mask, w, h, true, minLen, maxThick), Math.max(2, maxThick / 2), minLen);
  const vb = mergeCollinear(bands(mask, w, h, false, minLen, maxThick), Math.max(2, maxThick / 2), minLen);
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
  if (thickMm != null && (thickMm < 60 || thickMm > 400)) warn.push(`벽두께 ${Math.round(thickMm)}mm`);
  const unitWmm = mmPerPx ? w * mmPerPx : null;
  if (unitWmm != null && (unitWmm < 3000 || unitWmm > 40000)) warn.push(`전체폭 ${Math.round(unitWmm)}mm`);
  let thickPeakOk = false;
  if (mmPerPx) {
    const all = [...hb, ...vb].map(b => b.t * mmPerPx);
    const inRange = all.filter(t => t >= 90 && t <= 260).length;
    thickPeakOk = all.length >= 8 && inRange / all.length >= 0.35;
    if (!thickPeakOk) warn.push(`벽두께 분포 이상(실벽 구간 ${Math.round(100 * inRange / (all.length || 1))}%)`);
  }
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
  const walls = verified ? [
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
  const outSpaces = spaceOk ? spaces : [];

  return {
    ok: true, verified, warn, walls, spaces: outSpaces, spaceArea, spaceOk, spaceFound: spaces.length,
    crop: { left: L, top: T, width: Wd, height: Hd },
    work: { w, h },
    mm_per_px: mmPerPx,                      // 크롭 후 작업 해상도 기준
    bg_mm_per_px: mmPerPx ? mmPerPx * (Wd / w) : null,  // 원본 크롭 픽셀 기준(배경 이미지용)
    interiorPx, medThickPx: medThick, thickMm, scaleBasis,
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
    ? '건설사 공개 평면도를 좌표로 옮긴 도면 — 스케일은 전용면적 기준 산출값이다. 시공 전 실측 확인 필요.'
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
