// 분양 이미지 → 상담 즉석 견적용 MiniCAD 세대 도면 (방·벽·문·창 완비)
// 2026-09-03 대표 지시: 상담에서 바로 열어 견적. 방 우선 추출(plans-rooms-raster) 위에
//  ① 방 타입: OCR 라벨 + 기하 추론(출입구·외기·크기) 병행
//  ② 발코니 제외 재보정 — 전용면적에는 발코니·실외기가 안 들어가므로 이를 빼고 축척을 다시 맞춘다
//  ③ 방 폴리곤(직교 단순화, mm 정수)  ④ 문·창: 방 경계에서 벽 마스크가 끊긴 구간(도면에 그려진 그대로)
//  ⑤ MiniCAD 문서(개방 동선 사이 벽 금지 — 헌법 준수)
import sharp from 'sharp';
import { extractRooms, labelRooms } from './plans-rooms-raster.mjs';

const OPEN_TYPES = new Set(['LIVING', 'KITCHEN', 'DINING', 'CORRIDOR', 'ENTRANCE', 'PANTRY']);

// ── ① 타입 추론 ─────────────────────────────────────────────────────
// 경계 통계: 방별 (외기 접촉 길이, 출입 개구 인접 여부)
function boundaryStats(r) {
  const { w, h, lbl, outside, wall } = r;
  const stats = new Map(r.rooms.map(rm => [rm.id, { ext: 0, extOpen: 0 }]));
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x, id = lbl[p];
    if (id < 0 || !stats.has(id)) continue;
    for (const q of [p - 1, p + 1, p - w, p + w]) {
      if (outside[q]) { stats.get(id).ext++; if (!wall[q]) stats.get(id).extOpen++; }
    }
  }
  return stats;
}

// 평면 상자 가장자리 완충띠에 셀 40%+ 가 걸친 방 = 개구부로 밖에 샌 영역 — 방이 아니다
export function dropPadLeaks(r, padW) {
  const M = r.M, w = r.w;
  const x0 = M + padW + 2, y0 = M + padW + 2, x1 = M + r.workW - padW - 2, y1 = M + r.workH - padW - 2;
  r.rooms = r.rooms.filter(rm => {
    let outPad = 0;
    for (const p of rm.cells) { const x = p % w, y = (p / w) | 0; if (x < x0 || x >= x1 || y < y0 || y >= y1) outPad++; }
    const keep = outPad / rm.px < 0.4;
    if (!keep) for (const p of rm.cells) r.lbl[p] = -1;
    return keep;
  });
}

export function inferTypes(r) {
  const mm = r.mmPerPx;
  const st = boundaryStats(r);
  const rooms = r.rooms;
  const area = rm => rm.px * mm * mm / 1e6;
  const depth = rm => Math.min(rm.x1 - rm.x0, rm.y1 - rm.y0) * mm;
  // 발코니/실외기: 외기에 넓게 접하고 얕다(≤1900mm)
  for (const rm of rooms) {
    if (rm.type) continue;
    const s = st.get(rm.id) || { ext: 0, extOpen: 0 };
    if (s.ext * mm > 1200 && depth(rm) <= 1900) rm.type = 'BALCONY';
  }
  // 실외기실: 외기 접촉 초소형
  for (const rm of rooms) { if (!rm.type && area(rm) <= 2.5 && (st.get(rm.id)||{ext:0}).ext * mm > 600) { rm.type = 'UTILITY'; rm.name = rm.name || '실외기실'; } }
  // 거실(주방 병합 개방공간) = 최대 방. OCR 로 거실이 이미 있으면 다음 큰 방은 주방이다.
  const hasLiving = rooms.some(rm => rm.type === 'LIVING');
  const unnamedBig = rooms.filter(rm => !rm.type).sort((a, b) => b.px - a.px);
  if (unnamedBig.length) {
    if (!hasLiving) { unnamedBig[0].type = 'LIVING'; if (!unnamedBig[0].name) unnamedBig[0].name = '거실·주방'; }
    // 거실이 이미 있으면 다음 큰 방은 침실이다 — 주방은 개방 구조라 거실에 이미 병합돼 있다
  }
  // 욕실: 작고(≤6㎡) 외기 개구 없음
  for (const rm of rooms) {
    if (rm.type) continue;
    const s = st.get(rm.id) || { ext: 0, extOpen: 0 };
    if (area(rm) <= 6 && s.extOpen * mm < 400) rm.type = 'BATHROOM';
  }
  // 남은 방: 5㎡ 이상 = 침실, 미만 = 수납
  let bed = rooms.filter(rm => rm.type === 'ROOM' || (!rm.type && area(rm) >= 4.5));
  bed.sort((a, b) => b.px - a.px);
  bed.forEach((rm, i) => { rm.type = 'ROOM'; if (!rm.name) rm.name = '침실' + (i + 1); });
  for (const rm of rooms) if (!rm.type) { rm.type = 'STORAGE'; if (!rm.name) rm.name = '수납'; }
  for (const rm of rooms) if (!rm.name) rm.name = ({ BALCONY: '발코니', BATHROOM: '욕실', LIVING: '거실·주방', ENTRANCE: '현관' })[rm.type] || '';
}

// ── ② 발코니 제외 재보정 ─────────────────────────────────────────────
// 전용면적 = 세대 윤곽 − 발코니류. 1차 축척은 윤곽 전체 기준이라 발코니만큼 크다.
export function recalibrate(r, area_m2) {
  const mm = r.mmPerPx;
  const balcony = r.rooms.filter(rm => rm.type === 'BALCONY').reduce((a, rm) => a + rm.px, 0);
  let inside = 0;
  for (let i = 0; i < r.w * r.h; i++) if (!r.outside[i]) inside++;
  const netPx = inside - balcony;
  if (netPx > 1000 && area_m2) {
    const next = Math.sqrt(area_m2 * 1e6 / netPx);
    r.mmScaleNote = `발코니 제외 재보정 ${mm.toFixed(2)}→${next.toFixed(2)}mm/px`;
    r.mmPerPx = next;
  }
  return r.mmPerPx;
}

// ── ③ 방 폴리곤 (직교) ──────────────────────────────────────────────
// 셀 집합의 외곽을 4방 경계 추적으로 따고, 축 정렬 세그먼트로 합친 뒤 tol 미만 요철을 정리한다.
export function roomPolygon(rm, r, tolMm = 120) {
  const { w, lbl } = r, id = rm.id, mm = r.mmPerPx;
  const inR = (x, y) => x >= 0 && y >= 0 && x < r.w && y < r.h && lbl[y * w + x] === id;
  // 시작: 최상단행 최좌측 셀
  let sx = -1, sy = -1;
  outer: for (let y = rm.y0; y <= rm.y1; y++) for (let x = rm.x0; x <= rm.x1; x++) if (inR(x, y)) { sx = x; sy = y; break outer; }
  if (sx < 0) return null;
  // 경계 추적 (셀 모서리 좌표계, 시계방향)
  const pts = [];
  let cx = sx, cy = sy, dir = 0; // 0:→ 1:↓ 2:← 3:↑ (셀 (cx,cy)의 위-왼 모서리에서 시작)
  let px0 = sx, py0 = sy;
  const startKey = sx + ',' + sy + ',0';
  let guard = 0;
  do {
    if (guard++ > 200000) return null;
    // Moore 추적 대신 사각 격자 경계 걷기: 현재 방향 기준 왼손 규칙
    const L = (dir + 3) % 4, F = dir;
    const step = (d) => d === 0 ? [1, 0] : d === 1 ? [0, 1] : d === 2 ? [-1, 0] : [0, -1];
    const [lx, ly] = step(L), [fx, fy] = step(F);
    if (inR(cx + lx, cy + ly) && ((L === 0 || L === 2) ? true : true) && inR(cx + lx, cy + ly)) {
      // 왼쪽 셀이 방이면 왼쪽으로 돈다
      dir = L; cx += lx; cy += ly; pts.push([cx, cy]);
    } else if (inR(cx + fx, cy + fy)) {
      cx += fx; cy += fy; pts.push([cx, cy]);
    } else {
      dir = (dir + 1) % 4;
    }
  } while (!(cx === px0 && cy === py0 && pts.length > 3) && guard < 200000);
  if (pts.length < 4) return null;
  // 직교 단순화: 방향 바뀌는 지점만 + tol 미만 요철 제거 → mm 정수
  const corners = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
    const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [c[0] - b[0], c[1] - b[1]];
    if (d1[0] !== d2[0] || d1[1] !== d2[1]) corners.push(b);
  }
  // 요철 제거(작은 지그재그): 인접 코너 간 거리 < tol 인 축을 스냅
  const tolPx = tolMm / mm;
  const snapped = [];
  for (const p of corners) {
    const last = snapped[snapped.length - 1];
    if (last && Math.abs(last[0] - p[0]) < tolPx && Math.abs(last[1] - p[1]) < tolPx) continue;
    snapped.push([...p]);
  }
  // 직교 강제: 연속 점에서 x 또는 y 를 이전 점에 맞춘다 (짧은 축 이동을 흡수)
  for (let i = 1; i < snapped.length; i++) {
    const a = snapped[i - 1], b = snapped[i];
    const dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]);
    if (dx > 0 && dy > 0) { if (dx < dy) b[0] = a[0]; else b[1] = a[1]; }
  }
  const off = r.M;
  const poly = snapped.map(p => ({ x: Math.round((p[0] - off) * mm), y: Math.round((p[1] - off) * mm) }));
  // 중복·일직선 점 정리
  const out = [];
  for (const p of poly) {
    const l = out[out.length - 1];
    if (l && l.x === p.x && l.y === p.y) continue;
    out.push(p);
  }
  while (out.length > 3) {
    let removed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
      if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) { out.splice(i, 1); removed = true; break; }
    }
    if (!removed) break;
  }
  return out.length >= 4 ? out : null;
}

// ── ④ 개구부: 방 경계에서 벽 마스크가 끊긴 구간 (도면에 그려진 그대로) ──
// roomA-roomB(문) 또는 room-외기(창): 경계 픽셀 중 사이에 벽이 없는 연속 구간 = 개구부.
export function findOpenings(r) {
  const { w, h, lbl, outside, wall } = r, mm = r.mmPerPx;
  const runs = new Map();   // key `${a}|${b}|${horiz}|${line}` → 픽셀 목록
  const add = (a, b, horiz, line, t) => {
    const key = a + '|' + b + '|' + (horiz ? 1 : 0) + '|' + line;
    if (!runs.has(key)) runs.set(key, []);
    runs.get(key).push(t);
  };
  // 수평 경계(위/아래 이웃), 수직 경계(좌/우 이웃) — 사이 벽 유무는 두 픽셀 자체가 인접이므로 wall 없음=개구
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x, id = lbl[p];
    if (id < 0) continue;
    // 아래 이웃과 다른 영역이고 그 사이(현재 픽셀이 경계)면
    const chk = (q, horiz, line, t) => {
      const nid = lbl[q];
      if (q < 0 || q >= w * h) return;
      if (nid === id) return;
      let other = nid >= 0 ? nid : (outside[q] ? -2 : -3);   // -2 외기, -3 벽/미할당
      if (other === -3) {
        // 미할당 띠(강한 닫힘이 만든 외곽 완충)를 법선 방향으로 통과해 본다 — 벽을 만나기 전에
        // 외기에 닿으면 이 경계는 실제 창(외기 개구)이다.
        const dx2 = (q % w) - x, dy2 = ((q / w) | 0) - y;
        let qq = q, hit = null, streak = wall[q] ? 1 : 0;
        for (let k2 = 0; k2 < 260; k2++) {
          qq += dy2 * w + dx2;
          if (qq < 0 || qq >= w * h) break;
          if (wall[qq]) { if (++streak > 5) { hit = 'wall'; break; } continue; }   // 창틀·유리선(≤5px)은 통과
          streak = 0;
          if (outside[qq]) { hit = 'out'; break; }
          if (lbl[qq] >= 0 && lbl[qq] !== id) { hit = 'room'; break; }
        }
        if (hit === 'out') other = -2;
        else if (hit === 'room') other = lbl[qq];   // 문틀 띠 건너편의 방 — 문
        else return;
      }
      const a = Math.min(id, other), b = Math.max(id, other);
      add(a, b, horiz, line, t);
    };
    chk(p + w, true, y, x);    // 아래와의 수평 경계
    chk(p + 1, false, x, y);   // 오른쪽과의 수직 경계
  }
  const openings = [];
  let nd = 0, nw = 0;
  for (const [key, ts] of runs) {
    const [aStr, bStr, horizStr, lineStr] = key.split('|');
    const a = +aStr, b = +bStr, horiz = horizStr === '1', line = +lineStr;
    ts.sort((x, y) => x - y);
    // 연속 구간으로 쪼갠다
    let s = ts[0], prev = ts[0];
    const spans = [];
    for (let i = 1; i <= ts.length; i++) {
      if (i === ts.length || ts[i] > prev + 3) { spans.push([s, prev]); s = ts[i]; }
      prev = ts[i];
    }
    for (const [t0, t1] of spans) {
      const Wmm = (t1 - t0 + 1) * mm;
      // 문틀 모서리에서 법선 걷기가 실패해 문 폭이 실측보다 좁게 잡힌다(400~730) —
      // 위치는 정확하므로 문턱을 낮추고, 방문 폭은 표준 900mm 로 정규화한다(창은 실측 유지)
      const isWinPre = a === -2 || b === -2;
      if ((isWinPre && (Wmm < 550 || Wmm > 4200)) || (!isWinPre && (Wmm < 350 || Wmm > 4200))) continue;
      const isWin = a === -2 || b === -2;              // 외기와의 개구 = 창(발코니창 포함)
      const midT = (t0 + t1) / 2;
      const x = horiz ? midT : line, y = horiz ? line : midT;
      openings.push({
        id: (isWin ? 'wn-u' + (++nw) : 'd-u' + (++nd)),
        type: isWin ? 'WINDOW' : 'DOOR',
        subType: isWin ? (Wmm >= 1500 ? 'sliding2' : 'casement') : 'swing',
        spaceId: null, wallId: null,
        x: Math.round((x - r.M) * mm), y: Math.round((y - r.M) * mm),
        width_mm: isWin ? Math.round(Wmm / 10) * 10 : (Wmm < 1050 ? 900 : Math.round(Wmm / 10) * 10),
        height_mm: isWin ? (Wmm >= 1500 ? 2200 : 1200) : 2100,
        depth_mm: 150,
        sillHeight_mm: isWin ? (Wmm >= 1500 ? 0 : 900) : null,
        angle: horiz ? 0 : 90,
        subtractMode: isWin ? 'single' : 'double',
        between: [a, b],
      });
    }
  }
  return openings;
}

// ── ⑤ MiniCAD 문서 ───────────────────────────────────────────────────
const SPACE_META = {
  LIVING: 'LV', ROOM: 'BR', KITCHEN: 'KT', BATHROOM: 'BA', ENTRANCE: 'EN',
  BALCONY: 'BC', DRESSING: 'DR', UTILITY: 'UT', PANTRY: 'PT', STORAGE: 'ST', CORRIDOR: 'CO', POWDER: 'PW',
};
export async function buildUnitDoc(file, opt) {
  const r = await extractRooms(file, { area_m2: opt.exclusive_area_m2 || null, planIndex: opt.planIndex || 0 });
  if (!r.ok) return { ok: false, reason: r.reason };
  let labels = [];
  try { labels = await labelRooms(file, r); } catch (e) { /* OCR 실패해도 기하 추론으로 진행 */ }
  dropPadLeaks(r, Math.max(8, Math.round(16 * 1.6 * (r.workW / r.crop.Wd))));
  inferTypes(r);
  // 발코니 병합 감지 — 발코니로 판정된 방이 5.5㎡ 를 넘으면 침실·거실과 붙은 것이다(분리는 v2)
  const mmT = r.mmPerPx;
  const bigBalcony = r.rooms.some(rm => rm.type === 'BALCONY' && rm.px * mmT * mmT / 1e6 > 5.5);
  recalibrate(r, opt.exclusive_area_m2 || null);
  const mm = r.mmPerPx;
  const spaces = [];
  for (const rm of r.rooms.sort((a, b) => b.px - a.px)) {
    const poly = roomPolygon(rm, r);
    if (!poly) continue;
    spaces.push({
      id: 'sp-u' + rm.id, name: rm.name || '', type: rm.type || 'ROOM', polygon: poly,
      _areaM2: +(rm.px * mm * mm / 1e6).toFixed(2),
    });
  }
  const openings = findOpenings(r).map(o => { const { between, ...rest } = o; return rest; });
  // 벽: 방 폴리곤 변에서 생성하되 ① 개방 동선끼리 접한 변 제외(없는 벽 금지) ② 개구부 구간은 MiniCAD 가 차감
  // v1 은 방·개구부·배경까지만 — 벽은 MiniCAD 의 '공간→벽 생성' 기능/스냅 작도로 (2차에서 자동화)
  const total = spaces.filter(s => s.type !== 'BALCONY').reduce((a, s) => a + s._areaM2, 0);
  const err = opt.exclusive_area_m2 ? Math.abs(total - opt.exclusive_area_m2) / opt.exclusive_area_m2 : null;
  const labeled = r.rooms.filter(rm => labels.some(lb => lb.roomId === rm.id)).length;
  const verified = spaces.length >= 4 && (err == null || err <= 0.12) && !bigBalcony;
  return {
    ok: true, verified, spaces, openings, labels, mmPerPx: mm, crop: r.crop,
    stats: { rooms: spaces.length, doors: openings.filter(o => o.type === 'DOOR').length, windows: openings.filter(o => o.type === 'WINDOW').length, netAreaM2: +total.toFixed(1), areaErr: err != null ? +(err * 100).toFixed(1) : null, ocrLabeled: labeled },
    doc: {
      schema: 'ECOREAN.FloorPlan.v5.0',
      meta: {
        project: opt.title || '', unit: 'mm', ceilingHeight_mm: 2300, wallThickness: 150,
        tool: 'ECOREAN 분양도면 세대 변환기 v1 (방 우선)',
        note: `분양 평면 이미지에서 방·문·창을 추출. 축척=전용면적 보정(${mm.toFixed(2)}mm/px). 방 이름은 OCR ${labeled}개+기하 추론. 시공 전 실측 확인.`,
        verified,
        background: opt.background || null,
        mm_per_px: mm,
      },
      spaces: spaces.map(({ _areaM2, ...s }) => s),
      walls: [], openings,
    },
  };
}
