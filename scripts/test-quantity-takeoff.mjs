// 물량 산출 테스트 — node scripts/test-quantity-takeoff.mjs
import { readFileSync } from 'node:fs';
import { takeoff, polygonAreaMm2, polygonPerimeterMm } from './lib/quantity-takeoff.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${msg}`); }
  else { fail++; console.log(`  ❌ ${msg}${detail ? ' — ' + detail : ''}`); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('■ 기하 기본');
{
  const sq = [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 4000 }, { x: 0, y: 4000 }];
  ok(polygonAreaMm2(sq) === 12e6, '3m×4m 면적 = 12,000,000mm²');
  ok(polygonPerimeterMm(sq) === 14000, '3m×4m 둘레 = 14,000mm');
  const ccw = [...sq].reverse();
  ok(polygonAreaMm2(ccw) === 12e6, '정점 방향이 반대여도 면적 동일(절대값)');
}

console.log('\n■ 단일 실 손계산 대조');
{
  // 3m×4m 방, 천장고 2400, 문 900×2100 하나
  const plan = {
    meta: { unit: 'mm', ceilingHeight_mm: 2400 },
    spaces: [{ id: 's1', name: '침실', type: 'ROOM', polygon: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 4000 }, { x: 0, y: 4000 }] }],
    walls: [], openings: [{ id: 'd1', type: 'DOOR', spaceId: 's1', x: 1500, y: 0, width_mm: 900, height_mm: 2100 }],
    openBoundaries: [],
  };
  const t = takeoff(plan);
  const s = t.spaces[0];
  ok(s.floor_m2 === 12, `바닥 12㎡ (실제 ${s.floor_m2})`);
  ok(s.perimeter_m === 14, `둘레 14m (실제 ${s.perimeter_m})`);
  // 벽면적 = 14m × 2.4m − (0.9×2.1) = 33.6 − 1.89 = 31.71
  ok(near(s.wall_m2, 31.71, 0.01), `벽면적 31.71㎡ (실제 ${s.wall_m2})`);
  // 걸레받이 = 14 − 0.9 = 13.1
  ok(s.baseboard_m === 13.1, `걸레받이 13.1m (실제 ${s.baseboard_m})`);
  ok(s.cornice_m === 14, `천장몰딩 14m (실제 ${s.cornice_m})`);
  ok(s.doors === 1 && s.windows === 0, '문 1 / 창 0');
}

console.log('\n■ 개방 경계는 벽으로 세지 않는다 (없는 벽 금지)');
{
  const poly = [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }];
  const base = { meta: { ceilingHeight_mm: 2400 }, spaces: [{ id: 's1', name: '거실', type: 'LIVING', polygon: poly }], walls: [], openings: [] };
  const closed = takeoff({ ...base, openBoundaries: [] }).spaces[0];
  // 위쪽 변 4m 가 주방과 개방 경계
  const opened = takeoff({ ...base, openBoundaries: [{ x1: 0, y1: 0, x2: 4000, y2: 0 }] }).spaces[0];
  ok(opened.open_edge_m === 4, `개방 구간 4m 인식 (실제 ${opened.open_edge_m})`);
  ok(near(closed.wall_m2 - opened.wall_m2, 4 * 2.4, 0.01), '개방 구간만큼 벽면적 차감 (9.6㎡)');
  ok(near(closed.baseboard_m - opened.baseboard_m, 4, 0.01), '개방 구간만큼 걸레받이 차감 (4m)');
}

console.log('\n■ 공유 벽 처리 — 마감은 양면, 구조는 1개');
{
  // 3×3 방 두 개가 x=3000 벽을 공유
  const A = [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }, { x: 0, y: 3000 }];
  const B = [{ x: 3000, y: 0 }, { x: 6000, y: 0 }, { x: 6000, y: 3000 }, { x: 3000, y: 3000 }];
  const shared = { x1: 3000, y1: 0, x2: 3000, y2: 3000 };
  const plan = {
    meta: { ceilingHeight_mm: 2400 },
    spaces: [{ id: 'a', name: '침실1', type: 'ROOM', polygon: A }, { id: 'b', name: '침실2', type: 'ROOM', polygon: B }],
    walls: [
      { x1: 3000, y1: 0, x2: 3000, y2: 3000, spaceId: 'a' },
      { x1: 3000, y1: 3000, x2: 3000, y2: 0, spaceId: 'b' }, // 같은 벽, 반대 방향
    ],
    openings: [], openBoundaries: [],
  };
  const t = takeoff(plan);
  ok(t.totals.structural_wall_length_m === 3, `구조 벽 길이 3m (중복 제거, 실제 ${t.totals.structural_wall_length_m})`);
  const faceSum = t.spaces[0].perimeter_m + t.spaces[1].perimeter_m;
  ok(faceSum === 24, `마감 기준 둘레 합 24m (양면 계상, 실제 ${faceSum})`);
}

console.log('\n■ 마감 분류 — 욕실은 도배 아님, 발코니는 실내 제외');
{
  const sq = (x, w = 2000, h = 2000) => [{ x, y: 0 }, { x: x + w, y: 0 }, { x: x + w, y: h }, { x, y: h }];
  const plan = {
    meta: { ceilingHeight_mm: 2400 },
    spaces: [
      { id: 'r', name: '침실', type: 'ROOM', polygon: sq(0) },
      { id: 'w', name: '욕실', type: 'BATHROOM', polygon: sq(2000) },
      { id: 'b', name: '발코니', type: 'BALCONY', polygon: sq(4000) },
    ],
    walls: [], openings: [], openBoundaries: [],
  };
  const t = takeoff(plan);
  ok(t.totals.floor_m2 === 8, `실내 바닥 8㎡ = 침실4 + 욕실4 (발코니 제외, 실제 ${t.totals.floor_m2})`);
  ok(t.totals.balcony_floor_m2 === 4, `발코니 4㎡ 별도 (실제 ${t.totals.balcony_floor_m2})`);
  ok(t.totals.tile_floor_m2 === 4, `욕실 타일 바닥 4㎡ (실제 ${t.totals.tile_floor_m2})`);
  ok(near(t.totals.wallpaper_ceiling_m2, 4, 0.01), `도배 천장 4㎡ = 침실만 (실제 ${t.totals.wallpaper_ceiling_m2})`);
}

console.log('\n■ 실제 도면 (std-84a)');
{
  const plan = JSON.parse(readFileSync('sites/net/public/catalog/plans/data/std-84a.json', 'utf8'));
  const t = takeoff(plan);
  const indoorFloor = t.totals.floor_m2;
  ok(t.spaces.length === plan.spaces.length, `실 ${plan.spaces.length}개 모두 산출`);
  ok(indoorFloor > 60 && indoorFloor < 100, `실내 바닥 ${indoorFloor}㎡ — 84㎡대 도면으로 타당`);
  ok(t.totals.wall_m2 > indoorFloor, `벽면적 ${t.totals.wall_m2}㎡ > 바닥면적 (천장고 2.4m 이므로 당연)`);
  ok(t.spaces.every(s => s.floor_m2 > 0), '면적 0 이하인 실 없음');
  ok(t.spaces.every(s => s.wall_m2 >= 0 && s.baseboard_m >= 0), '음수 물량 없음');
  ok(t.totals.structural_wall_length_m > 0, `구조 벽 ${t.totals.structural_wall_length_m}m`);
  ok(t.totals.doors > 0, `문 ${t.totals.doors}개`);
  console.log(`     → 도배 벽 ${t.totals.wallpaper_wall_m2}㎡ · 천장 ${t.totals.wallpaper_ceiling_m2}㎡ · 걸레받이 ${t.totals.baseboard_m}m · 욕실타일 벽 ${t.totals.tile_wall_m2}㎡`);
}

console.log(`\n${fail ? '❌' : '✅'} 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
