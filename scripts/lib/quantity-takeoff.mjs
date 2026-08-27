// 물량 산출 (Quantity Takeoff) — ECOREAN.FloorPlan JSON → 인테리어 견적 물량
// 2026-08-27 대표 지시: "정밀한 도면이 필요하고 이것은 인테리어 견적 프로그램의 첫 시작"
//
// 좌표 단위는 mm (도면 JSON meta.unit). 산출 단위는 ㎡ / m / 개.
//
// 핵심 구분 — 이 둘을 섞으면 견적이 틀어진다:
//  · 마감 물량(도배·바닥·걸레받이): **면(face) 기준**. 두 실이 공유하는 벽은 양쪽 다 도배하므로
//    실별 둘레를 각각 더한다(중복이 정상).
//  · 구조 물량(철거·조적): **벽(wall) 기준**. 공유 벽은 하나이므로 중복 제거해서 센다.
//
// 개방 경계(openBoundaries)는 벽이 아니다 → 걸레받이·벽면적에서 제외한다.
//  (관련 지시: 없는 벽 금지 — 개방 동선 공간 사이엔 벽을 만들지 않는다)

const MM2_TO_M2 = 1e-6;
const MM_TO_M = 1e-3;
const r2 = n => Math.round(n * 100) / 100;

// 다각형 면적 (신발끈 공식) — mm² 반환
function polygonAreaMm2(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}
function polygonPerimeterMm(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}
// 선분이 다각형 변 위에 (거의) 놓여 있는 길이 — 개방 경계가 이 실에 접한 길이 계산용
function segmentOnPolygonMm(seg, poly, tol = 60) {
  const onEdge = (px, py, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    if (!L2) return false;
    const t = ((px - a.x) * dx + (py - a.y) * dy) / L2;
    if (t < -0.001 || t > 1.001) return false;
    const cx = a.x + t * dx, cy = a.y + t * dy;
    return Math.hypot(px - cx, py - cy) <= tol;
  };
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (onEdge(seg.x1, seg.y1, a, b) && onEdge(seg.x2, seg.y2, a, b)) {
      return Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
    }
  }
  return 0;
}

export function takeoff(plan) {
  if (!plan || !Array.isArray(plan.spaces)) throw new Error('FloorPlan JSON 이 아닙니다 (spaces 없음)');
  const H = (plan.meta && plan.meta.ceilingHeight_mm) || 2400;
  const openings = plan.openings || [];
  const openBounds = plan.openBoundaries || [];

  const spaces = plan.spaces.map(sp => {
    const areaMm2 = polygonAreaMm2(sp.polygon);
    const holes = (sp.holes || []).reduce((s, h) => s + polygonAreaMm2(h), 0);
    const floorMm2 = Math.max(0, areaMm2 - holes);
    const perimMm = polygonPerimeterMm(sp.polygon);

    // 이 실에 속한 개구부
    const ops = openings.filter(o => o.spaceId === sp.id);
    const doors = ops.filter(o => o.type === 'DOOR');
    const windows = ops.filter(o => o.type === 'WINDOW');
    const opArea = o => (o.width_mm || 0) * (o.height_mm || 0);
    const doorAreaMm2 = doors.reduce((s, o) => s + opArea(o), 0);
    const winAreaMm2 = windows.reduce((s, o) => s + opArea(o), 0);

    // 이 실에 접한 개방 경계 길이 (벽이 없는 구간)
    const openMm = openBounds.reduce((s, b) => s + segmentOnPolygonMm(b, sp.polygon), 0);

    // 벽면적: (둘레 − 개방구간) × 천장고 − 개구부 면적
    const wallRunMm = Math.max(0, perimMm - openMm);
    const wallMm2 = Math.max(0, wallRunMm * H - doorAreaMm2 - winAreaMm2);

    // 걸레받이: 벽이 있는 구간에서 문 폭을 뺀 길이 (창은 바닥까지 오지 않으므로 제외 안 함)
    const doorWidthMm = doors.reduce((s, o) => s + (o.width_mm || 0), 0);
    const baseboardMm = Math.max(0, wallRunMm - doorWidthMm);

    return {
      id: sp.id, name: sp.name, type: sp.type,
      floor_m2: r2(floorMm2 * MM2_TO_M2),
      perimeter_m: r2(perimMm * MM_TO_M),
      open_edge_m: r2(openMm * MM_TO_M),      // 벽이 없는 구간 (개방 동선)
      wall_m2: r2(wallMm2 * MM2_TO_M2),        // 도배·페인트 대상 면적
      ceiling_m2: r2(floorMm2 * MM2_TO_M2),
      baseboard_m: r2(baseboardMm * MM_TO_M),
      cornice_m: r2(wallRunMm * MM_TO_M),      // 천장 몰딩 (개구부와 무관하게 연속)
      doors: doors.length,
      windows: windows.length,
      door_area_m2: r2(doorAreaMm2 * MM2_TO_M2),
      window_area_m2: r2(winAreaMm2 * MM2_TO_M2),
    };
  });

  // 구조 물량 — 공유 벽 중복 제거 (철거·조적 산출용)
  const seen = new Set();
  let structWallMm = 0;
  for (const w of plan.walls || []) {
    const k = [Math.round(w.x1), Math.round(w.y1), Math.round(w.x2), Math.round(w.y2)]
      .join(',') + '|' + [Math.round(w.x2), Math.round(w.y2), Math.round(w.x1), Math.round(w.y1)].join(',');
    const k2 = [Math.round(w.x2), Math.round(w.y2), Math.round(w.x1), Math.round(w.y1)].join(',') + '|' +
      [Math.round(w.x1), Math.round(w.y1), Math.round(w.x2), Math.round(w.y2)].join(',');
    if (seen.has(k) || seen.has(k2)) continue;
    seen.add(k);
    structWallMm += Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  }

  const sum = (k, filter = () => true) => r2(spaces.filter(filter).reduce((s, x) => s + x[k], 0));
  const isBalcony = s => s.type === 'BALCONY';
  const isWet = s => s.type === 'BATHROOM';
  const indoor = s => !isBalcony(s);

  return {
    project: (plan.meta && plan.meta.project) || '',
    ceiling_height_mm: H,
    spaces,
    totals: {
      // 실내(발코니 제외) — 마감 물량의 기준
      floor_m2: sum('floor_m2', indoor),
      wall_m2: sum('wall_m2', indoor),
      ceiling_m2: sum('ceiling_m2', indoor),
      baseboard_m: sum('baseboard_m', indoor),
      cornice_m: sum('cornice_m', indoor),
      doors: spaces.filter(indoor).reduce((s, x) => s + x.doors, 0),
      windows: spaces.reduce((s, x) => s + x.windows, 0),
      balcony_floor_m2: sum('floor_m2', isBalcony),
      // 도배 대상: 실내에서 욕실 제외 (욕실은 타일)
      wallpaper_wall_m2: sum('wall_m2', s => indoor(s) && !isWet(s)),
      wallpaper_ceiling_m2: sum('ceiling_m2', s => indoor(s) && !isWet(s)),
      tile_wall_m2: sum('wall_m2', isWet),
      tile_floor_m2: sum('floor_m2', isWet),
      // 구조 (중복 제거)
      structural_wall_length_m: r2(structWallMm * MM_TO_M),
      structural_wall_face_m2: r2(structWallMm * H * MM2_TO_M2), // 편면 기준
    },
  };
}

export { polygonAreaMm2, polygonPerimeterMm };
