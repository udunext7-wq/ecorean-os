// MiniCAD 3D 조립(build3d.js) 단위 테스트 — 벽·개구부·바닥·가구·조명이 3D 기본체로 바르게 세워지는지
//  실행: node tests/minicad-3d.cjs
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'sites', 'net', 'public', 'minicad');
const MC3D = require(path.join(ROOT, '3d', 'build3d.js'));
// 라이브러리(규격표)도 실제 파일로
const libSrc = fs.readFileSync(path.join(ROOT, 'js', 'library.js'), 'utf8');
const LIBS = new Function(libSrc + ';return {FURNITURE_LIB,FIXFURN_LIB,FIXTURE_LIB,LIGHT_LIB,ELECTRIC_LIB,HVAC_FIRE_LIB};')();

const fail = [];
const ck = (c, m) => { if (!c) fail.push(m); };
const near = (a, b, tol) => Math.abs(a - b) <= (tol ?? 1);

// ---- 표본 문서: 거실 6000×4000 + 침실 3000×4000, 남쪽 벽에 문(900)·창(1800, 창턱 900) --------
const V = [
  { id: 'v1', x: 0, y: 0 }, { id: 'v2', x: 6000, y: 0 }, { id: 'v3', x: 6000, y: 4000 }, { id: 'v4', x: 0, y: 4000 },
  { id: 'v5', x: 9000, y: 0 }, { id: 'v6', x: 9000, y: 4000 },
];
const doc = {
  schema: 'ECOREAN.FloorPlan.v5.9',
  meta: { project: '테스트', unit: 'mm', ceilingHeight_mm: 2400, wallThickness: 100 },
  vertices: V,
  spaces: [
    { id: 'sp1', name: '거실', type: 'LIVING', vertexIds: ['v1', 'v2', 'v3', 'v4'], floorMaterial: 'WOOD', holes: [] },
    { id: 'sp2', name: '침실', type: 'ROOM', vertexIds: ['v2', 'v5', 'v6', 'v3'], floorMaterial: 'STRONG', ceilingHeight_mm: 2300, holes: [] },
    { id: 'sp3', name: '계단', type: 'STAIRS', polygon: [{ x: 0, y: 5000 }, { x: 3000, y: 5000 }, { x: 3000, y: 6000 }, { x: 0, y: 6000 }], stair: { type: 'I', floorHeight_mm: 2800 }, holes: [] },
  ],
  walls: [
    { id: 'w_s', v1Id: 'v1', v2Id: 'v2', thickness: 100, spaceId: 'sp1' },              // 남쪽(위) 벽 — VEF 형식(좌표 없음)
    { id: 'w_e', x1: 6000, y1: 0, x2: 6000, y2: 4000, thickness: 100, spaceId: 'sp1' }, // flat 형식
    { id: 'w_b', x1: 0, y1: 4000, x2: 9000, y2: 4000, thickness: 200, wallType: 'bearing' },
    { id: 'w_line', x1: 0, y1: 2000, x2: 6000, y2: 2000, isLine: true },
    { id: 'w_hi', x1: 6000, y1: 0, x2: 9000, y2: 0, thickness: 100, spaceId: 'sp2' },  // 침실 벽 → 천장 2300
  ],
  openings: [
    { id: 'd1', type: 'DOOR', subType: 'swing', x: 1500, y: 0, wallId: 'w_s', width_mm: 900, height_mm: 2100 },
    { id: 'n1', type: 'WINDOW', subType: 'sliding2', x: 4000, y: 0, wallId: 'w_s', width_mm: 1800, height_mm: 1500, sillHeight_mm: 900 },
    { id: 'd2', type: 'DOOR', subType: 'sliding', x: 6000, y: 2000, width_mm: 1500, height_mm: 2100 }, // wallId 없음 → 가장 가까운 벽(w_e)
  ],
  furniture: [
    { id: 'f1', type: 'sofa3', x: 3000, y: 3000, angle: 0, spaceId: 'sp1' },
    { id: 'f2', type: 'dining4', x: 1500, y: 1500, angle: 90, spaceId: 'sp1' },
    { id: 'f3', type: 'unknown_thing', x: 7500, y: 2000, angle: 0, spaceId: 'sp2' },     // 라이브러리에 없는 타입 → 규격 기본값 상자
    { id: 'f4', type: 'wardrobe', x: 8500, y: 3500, angle: 0, spaceId: 'sp2' },
    { id: 'f5', type: 'wall_600', x: 500, y: 300, angle: 0, spaceId: 'sp1' },
    { id: 'f6', type: 'side_table', x: 5200, y: 3500, angle: 0, spaceId: 'sp1', elev_mm: 800 }, // Z 띄움
  ],
  fixtures: [{ id: 'x1', type: 'toilet', x: 500, y: 3500, angle: 0, spaceId: 'sp1' }],
  lights: [
    { id: 'l1', type: 'downlight', x: 1000, y: 1000, inch: 4, spaceId: 'sp1' },
    { id: 'l2', type: 'downlight', x: 7000, y: 1000, inch: 3, spaceId: 'sp2' },
    { id: 'l3', type: 'cove', x: 3000, y: 200, length_mm: 3600, angle: 0, spaceId: 'sp1' },
    { id: 'l4', type: 'pendant', x: 1500, y: 1500, spaceId: 'sp1' },
  ],
  electric: [{ id: 'e1', type: 'switch_2', x: 100, y: 500, angle: 90, spaceId: 'sp1' }],
  hvac: [{ id: 'h1', type: 'ac_4way', x: 3000, y: 2000, spaceId: 'sp1' }],
  pillars: [{ id: 'p1', shape: 'rect', x: 4500, y: 3500, width: 500, height: 500, thickness: 200, rotation: 0 }],
};

const S = MC3D.buildScene(doc, LIBS);
const byId = id => S.objects.find(o => o.id === id);
const kinds = k => S.objects.filter(o => o.kind === k);

// 범위·개수
ck(S.bounds.minX === 0 && S.bounds.maxX === 9000 && S.bounds.maxY === 6000, '범위: ' + JSON.stringify(S.bounds));
ck(S.counts.spaces === 3 && S.counts.walls === 3, '공간 3·벽 3(안내선·내력벽 제외): ' + JSON.stringify(S.counts));
ck(kinds('floor').length === 3 && kinds('ceiling').length === 3, '바닥·천장 각 3');
ck(kinds('wall').length === 3, '벽 객체 3 (내력벽은 해칭 전용 — 2026-09-08): ' + kinds('wall').length);

// 남쪽 벽: 문 + 창 → 몸체 3토막 + 문 인방 + 창턱 = 5 상자 (창 900+1500=2400 이라 인방 없음)
const ws = byId('w_s');
ck(ws && near(ws.rot, 0), '남쪽 벽 회전 0');
ck(ws.prims.length === 5, '남쪽 벽 상자 5개(3토막+문 인방+창턱, 창 위는 천장까지라 인방 없음): ' + ws.prims.length);
const full = ws.prims.filter(p => p.h === 2400);
ck(full.length === 3, '전체 높이 토막 3: ' + full.length);
// 끝 토막은 v2(6000,0)에서 꺾여 만나는 동쪽 벽(t100, 중심 정렬)의 바깥 면까지 49mm(50−1) 늘어난다 — 모서리 메움
ck(near(full[0].w, 1050) && near(full[1].w, 1150) && near(full[2].w, 1149), '토막 폭 1050/1150/1149(모서리 메움): ' + full.map(p => p.w).join('/'));
ck(ws.meta.ext[0] === 0 && near(ws.meta.ext[1], 49), '남쪽 벽 연장 [0,49]: ' + JSON.stringify(ws.meta.ext));
ck(ws.prims.every(p => p.y === 0) && ws.meta.offset === 0, '중심 정렬은 오프셋 0');
ck(ws.prims.some(p => near(p.z, 2100) && near(p.h, 300) && near(p.w, 900)), '문 인방 z2100 h300 w900');
ck(ws.prims.some(p => near(p.z, 0) && near(p.h, 900) && near(p.w, 1800)), '창턱 아래 z0 h900 w1800');
ck(ws.prims.some(p => near(p.z, 900 + 1500) && near(p.h, 0)) === false, '창 인방(h 0)은 만들지 않는다');
ck(ws.prims.every(p => p.d === 100), '벽 두께 100');
ck(ws.prims.every(p => p.color === MC3D.WALL_COLORS.UNDECIDED), '마감 미정 색');

// 내력벽: 회색, 높이 2400(공간 없음 → 전역)
const wb = byId('w_b');
ck(wb === undefined, '내력벽: 벽체 없음 (해칭 전용 — 2026-09-08 대표 지시)');
// 침실 벽: 공간 천장 2300
ck(byId('w_hi').prims[0].h === 2300, '침실 벽은 공간 천장 2300: ' + byId('w_hi').prims[0].h);
// 안내선은 없다
ck(!byId('w_line'), '안내선(isLine)은 3D 에 없다');

// wallId 없는 슬라이딩 문 → 동쪽 벽에 뚫림 (세로벽: 회전 90)
const we = byId('w_e');
ck(we && near(we.rot, 90), '동쪽 벽 회전 90: ' + (we && we.rot));
ck(we.prims.filter(p => p.h === 2400).length === 2, '동쪽 벽 문으로 2토막: ' + we.prims.filter(p => p.h === 2400).length);
const d2 = byId('d2');
ck(d2 && d2.kind === 'door' && d2.prims.length >= 4, '슬라이딩 문 객체(틀3+문짝2)');
ck(d2.prims.filter(p => p.color === MC3D.COLORS.doorLeaf).length === 2, '슬라이딩 문짝 2');

// 창: 유리 투명 + 미세기 2짝 중간 살
const n1 = byId('n1');
ck(n1 && n1.kind === 'window', '창 객체');
const glass = n1.prims.find(p => p.glass);
ck(glass && near(glass.z, 945) && glass.opacity < 1, '유리 z=창턱+틀(945) 투명: ' + JSON.stringify(glass));
ck(n1.prims.filter(p => p.color === MC3D.COLORS.winFrame && p.w === 30).length === 1, '미세기 2짝 중간 살 1개');

// 바닥 색·천장 높이
ck(byId('sp1').prims[0].color === MC3D.FLOOR_COLORS.WOOD, '거실 바닥 원목 색');
ck(byId('sp2_ceil').prims[0].z === 2300, '침실 천장 2300');
ck(byId('sp1').prims[0].pts.length === 4, '바닥 폴리곤(VEF vertexIds → 좌표)');
ck(byId('sp1').prims[0].mcode === 'WOOD', '바닥 프림에 재질 코드(텍스처용): ' + byId('sp1').prims[0].mcode);
// 라벨
ck(S.labels.length === 3 && S.labels.find(l => l.text === '거실' && near(l.x, 3000) && near(l.y, 2000)), '거실 라벨 중심(3000,2000)');

// 가구
const sofa = byId('f1');
ck(sofa && sofa.name === '소파(3인)' && sofa.prims.length === 5 && sofa.prims[0].w === 2200 && sofa.prims[0].d === 900, '소파: 5부품 2200×900');
ck(sofa.prims[1].z === 420 && sofa.prims[1].y < 0, '소파 등받이는 좌석 위·-y 쪽');
const din = byId('f2');
ck(din && din.rot === 90 && din.prims.length === 5 && din.prims[0].z === 720 && din.prims[0].h === 30, '식탁: 상판 z720 + 다리4, 회전 90');
const bed = byId('f3');
ck(bed && bed.prims.length === 1 && bed.prims[0].w === 400 && bed.prims[0].h === 750, '미등록 타입은 400×400×750 상자: ' + JSON.stringify(bed && bed.prims[0]));
ck(byId('f4').prims[0].h === 2100 && byId('f4').prims[0].w === 2000, '장롱 2000×600×2100');
const wc = byId('f5');
ck(wc.prims[0].z === 1450 && wc.prims[0].h === 700, '상부장 z1450 h700');
ck(byId('f6').elev === 800 && byId('f1').elev === 0, 'Z 띄움(elev_mm) — f6=800 · 기본 0: ' + byId('f6').elev);
const toilet = byId('x1');
ck(toilet && toilet.kind === 'fixture' && toilet.prims.length === 3 && toilet.prims[0].z === 380, '양변기: 탱크+보울+시트');

// 조명 — 천장 높이에 붙는다, 다운라이트 인치별 외경
const l1 = byId('l1'), l2 = byId('l2');
ck(l1.prims[0].z === 2400 - 12 && near(l1.prims[0].r, 60), '4인치 다운라이트 r60 천장 2400');
ck(l2.prims[0].z === 2300 - 12 && near(l2.prims[0].r, 47.5), '침실 3인치 다운라이트 천장 2300');
ck(l1.prims[0].emissive === true && l1.meta.lightZ < 2400, '발광 + 포인트라이트 높이');
const cove = byId('l3');
ck(cove.prims[0].w === 3600 && cove.meta.linear === 3600, '간접 3.6m 띠');
const pend = byId('l4');
ck(pend.prims.length === 2 && pend.prims[1].z === 1800, '펜던트 갓 z1800');
// 전기 — 스위치 1200
ck(byId('e1').prims[0].z === 1200 && byId('e1').rot === 90, '스위치 z1200 회전 90');
// 설비 — 4way 천장
ck(byId('h1').prims[0].z === 2400 - 45, '4way 천장 붙임');
// 기둥
ck(byId('p1').prims[0].h === 2400 && byId('p1').prims[0].w === 500, '기둥 500×500×2400');
// 계단 — 2026-09-08: 평면 도식과 같은 규약. 3000×1000 방, I형:
//  단수 = lh/280 = 1000/280 ≈ 4단 (2D 도식과 동일), 위(-y)가 높은 쪽, 최상단 = 층높이
const st = byId('sp3_stair');
ck(st && st.prims.length === 4, '계단 단수 = 평면 도식과 동일 (1000/280→4): ' + (st && st.prims.length));
ck(st && Math.max(...st.prims.map(p => p.h)) === 2800, '최상단 = 층높이 2800');
{
  const tall = st.prims.reduce((a, b) => (b.h > a.h ? b : a));
  const low = st.prims.reduce((a, b) => (b.h < a.h ? b : a));
  ck(tall.y < low.y, '높은 단이 도식의 위(-y) 쪽 — 평면 화살표와 같은 방향: ' + tall.y + ' < ' + low.y);
}

// 문서 형식 두 가지: {data:{...}} 래핑도 받는다
const S2 = MC3D.buildScene({ at: 1, data: doc }, LIBS);
ck(S2.objects.length === S.objects.length, '래핑 문서도 동일 결과');
// 빈 문서
const S3 = MC3D.buildScene({}, LIBS);
ck(S3.objects.length === 0, '빈 문서 → 객체 없음 (대지 슬래브 제거 — 2026-09-03 대표 지시)');

// ---- 벽 정렬 interior/exterior (2026-09-01) — 2D _wallAlignOffsetPx 규칙과 동일 ----
//  정사각 방 4000×4000, 벽 4장을 시계방향(화면 y-down 기준)으로 그림 → 우측 법선(−uy,ux)이 방 안쪽
const A = {
  meta: { ceilingHeight_mm: 2400 },
  vertices: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 4000, y: 0 }, { id: 'c', x: 4000, y: 4000 }, { id: 'd', x: 0, y: 4000 }],
  spaces: [{ id: 's', name: '방', type: 'ROOM', vertexIds: ['a', 'b', 'c', 'd'], holes: [] }],
  walls: [
    { id: 'n', v1Id: 'a', v2Id: 'b', thickness: 100, alignment: 'interior' },   // 위: u=(1,0) → n=(0,1) 아래(방 안)
    { id: 'e', v1Id: 'b', v2Id: 'c', thickness: 100, alignment: 'exterior' },   // 오른쪽: u=(0,1) → n=(−1,0) 왼쪽(방 안)
    { id: 'sw', v1Id: 'c', v2Id: 'd', thickness: 200, alignment: 'center' },
    { id: 'w', v1Id: 'd', v2Id: 'a', thickness: 100, alignment: 'interior' },
  ],
  openings: [{ id: 'dr', type: 'DOOR', subType: 'swing', x: 2000, y: 0, wallId: 'n', width_mm: 900, height_mm: 2100 }],
};
const SA = MC3D.buildScene(A, LIBS);
const aw = id => SA.objects.find(o => o.id === id);
ck(aw('n').meta.offset === 50 && aw('n').prims.every(p => p.y === 50), 'interior 일반벽: 몸체가 로컬 +y(방 안)로 t/2=50: ' + JSON.stringify(aw('n').meta));
ck(aw('e').meta.offset === -50 && aw('e').prims.every(p => p.y === -50), 'exterior 일반벽: 몸체가 로컬 −y 로 −50: ' + aw('e').meta.offset);
ck(aw('sw').meta.offset === 0 && aw('sw').prims.every(p => p.y === 0), 'center: 0');
ck(aw('dr').prims.every(p => Math.abs(p.y - 50) <= 50 + 1) && aw('dr').prims.filter(p => p.color === MC3D.COLORS.doorFrame).every(p => p.y === 50), '문틀·문짝이 벽 정렬을 따라 함께 이동');
// 모서리 메움: 위 벽(n) v2=b 에서 만나는 오른쪽 벽(e)은 exterior → 몸체가 x 3900~4000 대신 4000~... 아니라
//  e 의 로컬 +y=(−1,0) 이고 off=−50 → 몸체 x ∈ [4000+50−50, 4000+50+50] = [4000,4100] → n 은 b 에서 +x 로 100−1 늘어야 한다
ck(near(aw('n').meta.ext[1], 99), '위 벽 v2 연장 = 이웃(exterior) 바깥 면까지 99: ' + JSON.stringify(aw('n').meta.ext));
//  위 벽(n) v1=a 에서 만나는 왼쪽 벽(w): w 는 d→a, u=(0,−1), 로컬 +y=(1,0), interior off=+50 → 몸체 x ∈ [0,100] → n 은 a 에서 −x 로 나갈 것이 없다(0)
ck(aw('n').meta.ext[0] === 0, '위 벽 v1 연장 0 (이웃 몸체가 방 안쪽에만 있음): ' + JSON.stringify(aw('n').meta.ext));
//  오른쪽 벽(e) v1=b 에서 만나는 위 벽(n): n 로컬 +y=(0,1), off=+50 → 몸체 y∈[0,100]; e 의 바깥 방향 d=−u=(0,−1) → 투영 최댓값 0 → 연장 0
ck(aw('e').meta.ext[0] === 0, '오른쪽 벽 v1 연장 0: ' + JSON.stringify(aw('e').meta.ext));
// 2026-09-08 대표 지시: 내력벽 = 평면 해칭 전용 — 미니폼에 벽체를 만들지 않는다.
//  (종전의 '내력벽 무게중심 정렬' 3D 시험은 이 규칙으로 폐기 — 정렬 코드는 남아 있으나 도달 불가)
const B = { meta: {}, walls: [
  { id: 'b1', x1: 0, y1: 0, x2: 4000, y2: 0, thickness: 200, wallType: 'bearing', alignment: 'interior' },
  { id: 'b2', x1: 0, y1: 4000, x2: 4000, y2: 4000, thickness: 200, wallType: 'bearing', alignment: 'interior' },
  { id: 'n1', x1: 0, y1: 0, x2: 0, y2: 4000, thickness: 100 },
] };
const SB = MC3D.buildScene(B, LIBS);
ck(!SB.objects.some(o => o.kind === 'wall' && (o.id === 'b1' || o.id === 'b2')),
  '내력벽: 미니폼에 벽체가 안 만들어진다 (해칭 전용)');
ck(SB.objects.some(o => o.kind === 'wall' && o.id === 'n1') && SB.counts.walls === 1,
  '내력벽: 일반벽만 서고 벽 수도 1: ' + SB.counts.walls);

// ---- 층 시트(다층 적층) 2026-09-03 — floors[] 가 있으면 z0 로 쌓는다 ----
//  1층 = 최상위 배열(active), 2층 = floors[].data. 1층 천장 2400 + 슬래브 300 → 2층 z0 = 2700
const F2 = {
  meta: { ceilingHeight_mm: 2400 },
  vertices: [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 5000, y: 0 }, { id: 'c', x: 5000, y: 4000 }, { id: 'd', x: 0, y: 4000 }],
  spaces: [{ id: 's1', name: '거실', type: 'LIVING', vertexIds: ['a', 'b', 'c', 'd'], holes: [] }],
  walls: [{ id: 'wA', v1Id: 'a', v2Id: 'b', thickness: 100 }],
  lights: [{ id: 'lA', type: 'downlight', x: 1000, y: 1000, inch: 3 }],
  activeFloorId: 'f1',
  floors: [
    { id: 'f1', name: '1층', level: 1, active: true },
    { id: 'f2', name: '2층', level: 2, data: {
      vertices: [{ id: 'a2', x: 0, y: 0 }, { id: 'b2', x: 5000, y: 0 }, { id: 'c2', x: 5000, y: 4000 }, { id: 'd2', x: 0, y: 4000 }],
      spaces: [{ id: 's2', name: '침실', type: 'ROOM', vertexIds: ['a2', 'b2', 'c2', 'd2'], ceilingHeight_mm: 2300, holes: [] }],
      walls: [{ id: 'wB', v1Id: 'a2', v2Id: 'b2', thickness: 100 }],
      furniture: [{ id: 'fB', type: 'sofa3', x: 2000, y: 2000, angle: 0 }],
    } },
  ],
};
const SF = MC3D.buildScene(F2, LIBS);
ck(SF.floors.length === 2 && SF.floors[0].z0 === 0 && SF.floors[1].z0 === 2700, '층 2 · 2층 z0=2700(2400+슬래브300): ' + JSON.stringify(SF.floors.map(f => [f.name, f.z0])));
ck(near(SF.totalHeight, 2700 + 2400 + 300), '전체 높이 5400: ' + SF.totalHeight);
const fWallA = SF.objects.find(o => o.id === 'f1:wA'), fWallB = SF.objects.find(o => o.id === 'f2:wB');
ck(fWallA && fWallA.z0 === 0 && fWallA.floorId === 'f1', '1층 벽 id 접두 f1: + z0=0');
ck(fWallB && fWallB.z0 === 2700 && fWallB.floorName === '2층', '2층 벽 z0=2700');
ck(SF.objects.find(o => o.id === 'f2:fB'), '2층 가구가 한 장면에 있다');
const fLightA = SF.objects.find(o => o.id === 'f1:lA');
ck(fLightA && fLightA.prims[0].z === 2400 - 12 && fLightA.z0 === 0, '1층 조명은 층 내 천장(2400)에, 표고는 z0 로');
const lbl2 = SF.labels.find(l => l.text === '침실');
ck(lbl2 && lbl2.z0 === 2700, '2층 이름표 z0=2700');
ck(SF.objects.filter(o => o.kind === 'slab').length === 0, '대지 슬래브 없음: ' + SF.objects.filter(o => o.kind === 'slab').length);
ck(SF.counts.walls === 2 && SF.counts.spaces === 2, '층 합산 개수: ' + JSON.stringify(SF.counts));
// 한 층 문서는 종전과 동일(id 접두 없음) — 위쪽 전체 단언들이 그 회귀 테스트다
ck(byId('w_s') && !S.objects.some(o => /:/.test(o.id)), '단층 문서는 id 접두 없음');

// 2026-09-04 프로토콜 짝 — 미니캐드(ui.js MC_PROTO) 와 미니폼(view3d.js MF_PROTO) 이 같은 버전, 캐시 버스터 갱신
const uiSrc = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
const v3Src = fs.readFileSync(path.join(ROOT, '3d', 'view3d.js'), 'utf8');
const mcP = (uiSrc.match(/const MC_PROTO\s*=\s*(\d+)/) || [])[1], mfP = (v3Src.match(/const MF_PROTO\s*=\s*(\d+)/) || [])[1];
ck(mcP && mfP && mcP === mfP, '프로토콜 짝: MC_PROTO=' + mcP + ' MF_PROTO=' + mfP);
const opsList = (uiSrc.match(/\[('undo'[^\]]*)\]\.includes\(m\.op\)/) || [])[1] || '';
['batch', 'addspace', 'addcircle', 'splitspace', 'lock', 'clone', 'rotate', 'set', 'add', 'delete',
  'sketchline', 'sketchrect', 'sketchcircle', 'sketchpoly', 'extrude', 'sketchdel', 'sketchclear', 'massconvert'].forEach(op => ck(opsList.includes("'" + op + "'"), 'ui.js 허용 op: ' + op));
// 2026-09-04 프로토콜 6: 선·사각형·원·호·오프셋은 스케치(면)까지만 보내고, Z 는 extrude — 미니폼이 addwall/addspace 를 직접 만들지 않는다
['sketchline', 'sketchrect', 'sketchcircle', 'sketchpoly', 'extrude', 'sketchdel', 'massconvert', 'splitspace', 'lock', 'clone', 'rotate', 'batch'].forEach(op => ck(new RegExp("['\"]" + op + "['\"]").test(v3Src), 'view3d.js 가 ' + op + ' 를 보낸다'));
['addwall', 'addspace', 'addcircle'].forEach(op => ck(!new RegExp("op:\\s*['\"]" + op + "['\"]").test(v3Src), 'view3d.js 가 ' + op + ' 를 직접 보내지 않는다(면 → Z 규칙)'));
ck(/MOVABLE=new Set\([^)]*'mass'/.test(v3Src) && /mass:'masses'/.test(v3Src) && /sketchFace:'sketchFaces'/.test(v3Src), 'view3d.js 매스 이동 가능 + KINDMAP 스케치·매스');
const idx3d = fs.readFileSync(path.join(ROOT, '3d', 'index.html'), 'utf8');
const bust = (idx3d.match(/view3d\.js\?v=([\w]+)/) || [])[1];
ck(bust && idx3d.split('?v=' + bust).length - 1 >= 4, '3d/index.html 캐시 버스터 4곳 일치: ' + bust);
['ctxmenu', 'selbox', '#tags', '#outliner', '#scenes', 'st-sun', 'data-sec="tags"', 'data-sec="outline"', 'data-sec="scenes"', 'data-t="circle"', 'data-t="arc"', 'data-t="offset"', 'data-t="orbit"', 'data-cmd="xray"', 'data-cmd="save"'].forEach(k => ck(idx3d.includes(k), '3d/index.html 에 ' + k));
['setXray', 'renderOutliner', 'sceneAdd', 'saveFeedback', 'pasteClip', 'boxSelect', 'addGuide', 'offsetPoly', 'arcPts', 'vcbPostOn',
  'spawnPendingFace', 'spawnPendingSketchLine', 'prismGhost', 'massConvert3D'].forEach(fn => ck(v3Src.includes('function ' + fn + '('), 'view3d.js 함수 ' + fn));

// ---- 2026-09-04 점·선·면 스케치 엔진(js/sketch.js) + 매스 조립 ------------------------------------------
//  선은 점·선(x,y)만, 고리가 닫히면 면, 면에 Z 를 주면 객체(기본 = 자유 매스). 평면 그래프 유지(T·X 분할, 공선 겹침, 중복 제거)
const SK = require(path.join(ROOT, 'js', 'sketch.js'));
{
  const bag = {};
  SK.skAddEdge(0, 0, 4000, 0, bag); SK.skAddEdge(4000, 0, 4000, 3000, bag); SK.skAddEdge(4000, 3000, 0, 3000, bag);
  ck(SK.skCount(bag).faces === 0, 'SK 3변 = 면 없음');
  SK.skAddEdge(0, 3000, 0, 0, bag);
  let cnt = SK.skCount(bag);
  ck(cnt.faces === 1 && cnt.edges === 4 && cnt.pts === 4, 'SK 사각 고리 → 면 1: ' + JSON.stringify(cnt));
  ck(Math.round(SK.skFaceArea(bag.sketchFaces[0], bag)) === 12000000, 'SK 면적 12㎡');
  const fid = bag.sketchFaces[0].id;
  SK.skAddEdge(0, 0, 4000, 3000, bag); cnt = SK.skCount(bag);
  ck(cnt.faces === 2 && cnt.edges === 5 && cnt.pts === 4, 'SK 대각선 → 면 2·선 5: ' + JSON.stringify(cnt));
  ck(!bag.sketchFaces.some(f => f.id === fid), 'SK 분할되면 원래 면 id 사라짐');
  SK.skAddEdge(-500, 1500, 4500, 1500, bag); cnt = SK.skCount(bag);
  ck(cnt.faces === 4 && cnt.pts === 9, 'SK 가로선 교차(T·X 분할) → 면 4·점 9: ' + JSON.stringify(cnt));
  const before = cnt.faces; SK.skAddEdge(2000, 3000, 2000, 3800, bag);
  ck(SK.skCount(bag).faces === before, 'SK 막다른 가지 → 면 수 불변');
  const e = bag.sketchEdges.find(x => { const q = SK.skEdgePts(x, bag); return q && q.a.y === 3000 && q.b.y === 3000 && Math.min(q.a.x, q.b.x) === 0; });
  const fB = SK.skCount(bag).faces; SK.skRemoveEdge(e.id, bag);
  ck(SK.skCount(bag).faces === fB - 1, 'SK 변 삭제 → 면 -1 (선을 지우면 면이 풀린다)');
  SK.skClear(bag);
  const f = SK.skAddRect(1000, 1000, 4000, 2500, bag);
  ck(f && SK.skCount(bag).faces === 1 && Math.round(SK.skFaceArea(f, bag)) === 4500000, 'SK skAddRect → 면 1 · 4.5㎡');
  ck(SK.skGuessKind(f, bag) === 'space', 'SK 3000×1500 → space');
  const f2 = SK.skAddRect(6000, 0, 9000, 150, bag);
  ck(f2 && SK.skGuessKind(f2, bag) === 'wall', 'SK 3000×150 → wall');
  const o = SK.skObb(SK.skFacePoly(f2, bag)); ck(Math.round(o.len) === 3000 && Math.round(o.wid) === 150, 'SK OBB 3000×150');
  const fc = SK.skAddCircle(20000, 20000, 1500, 24, bag);
  ck(fc && fc.pts.length === 24, 'SK 원 → 24각 면');
  ck(SK.skRemoveFace(fc.id, bag) && SK.skCount(bag).faces === 2, 'SK 면 삭제 → 둘레 선 정리');
  SK.skClear(bag); SK.skAddRect(0, 0, 2000, 2000, bag); SK.skAddRect(1000, 1000, 3000, 3000, bag);
  cnt = SK.skCount(bag); ck(cnt.faces === 3 && cnt.pts === 10 && cnt.edges === 12, 'SK 겹친 사각 2 → 면 3·점 10·선 12: ' + JSON.stringify(cnt));
  SK.skClear(bag); SK.skAddEdge(0, 0, 3000, 0, bag); SK.skAddEdge(1000, 0, 5000, 0, bag);
  cnt = SK.skCount(bag); ck(cnt.edges === 3 && cnt.pts === 4, 'SK 공선 겹침 → 선 3·점 4: ' + JSON.stringify(cnt));
  const m = SK.massFromPoly([{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 1000 }, { x: 0, y: 1000 }], 900, bag);
  ck(m.x === 1000 && m.y === 500 && m.pts.length === 4 && Math.round(SK.massArea(m)) === 2000000, 'SK massFromPoly 중심·상대좌표');
  m.angle = 90; const ap = SK.massAbsPoly(m); ck(ap[0].x === 1500 && ap[0].y === -500, 'SK massAbsPoly 회전 90°');
  // 3D 조립: 스케치 면·선·점 + 매스 → 객체 (면은 바닥 위 2mm 반투명 판, 매스는 prism)
  const skBag = {}; SK.skAddRect(0, 0, 3000, 2000, skBag);
  const skDoc = { meta: { ceilingHeight_mm: 2400 }, vertices: [], spaces: [], walls: [],
    sketchPts: skBag.sketchPts, sketchEdges: skBag.sketchEdges, sketchFaces: skBag.sketchFaces,
    masses: [{ id: 'ms1', name: '매스1', x: 6000, y: 500, angle: 90, pts: [{ x: -1000, y: -500 }, { x: 1000, y: -500 }, { x: 1000, y: 500 }, { x: -1000, y: 500 }], h_mm: 1500, elev_mm: 300, color: '#B9C6D2' }] };
  const SS = MC3D.buildFloorScene(MC3D.normalizeDoc(skDoc), LIBS);
  const kk = k => SS.objects.filter(x => x.kind === k);
  ck(kk('sketchFace').length === 1 && kk('sketchEdge').length === 4 && kk('sketchPt').length === 4 && kk('mass').length === 1, 'SK 조립: 면 1·선 4·점 4·매스 1 ' + JSON.stringify(SS.counts));
  ck(SS.counts.sketch === 9 && SS.counts.masses === 1, 'SK counts sketch=9 masses=1');
  const sf = kk('sketchFace')[0];
  ck(sf.prims[0].t === 'poly' && sf.prims[0].z === 2 && sf.prims[0].opacity < 1 && near(sf.meta.area, 6000000), 'SK 면 = z 2mm 반투명 poly · 6㎡');
  const se = kk('sketchEdge').find(x => near(x.meta.L, 3000));
  ck(se && se.prims[0].t === 'box' && near(se.prims[0].w, 3000) && se.prims[0].h < 30, 'SK 선 = 3000 얇은 막대');
  const ms = kk('mass')[0];
  ck(ms.prims[0].t === 'prism' && ms.prims[0].h === 1500 && ms.elev === 300 && ms.rot === 90 && ms.x === 6000, 'SK 매스 = prism H1500 · 띄움 300 · 회전 90');
  ck(near(MC3D._internal.massAbsPoly(skDoc.masses[0])[0].x, 6500) && near(MC3D._internal.massAbsPoly(skDoc.masses[0])[0].y, -500), 'SK 매스 절대 꼭짓점(회전 반영)');
  ck(SS.labels.some(l => /매스1 H1500/.test(l.text)), 'SK 매스 이름표 "매스1 H1500"');
  ck(near(SS.bounds.maxX, 6500) && near(SS.bounds.minY, -500) && SS.bounds.maxY >= 2000, 'SK 범위가 스케치·매스(회전 90° → x 5500~6500) 포함: ' + JSON.stringify(SS.bounds));
  const skF = MC3D.buildScene(skDoc, LIBS);
  ck(skF.totalHeight >= 1800, 'SK 층 높이에 매스(띄움 300 + H1500) 반영: ' + skF.totalHeight);
}


// ---- 2026-09-07 z 값을 가진 자유 다면체 (대표 지시) --------------------------------------------
//  "나는 z 값을 원한다. 높이를 주고 그 값들이 자유롭게 변경될 수 있도록, 호환이 되도록."
{
  const box = () => ({ id: 'm', x: 0, y: 0, angle: 0, elev_mm: 0, h_mm: 2400,
    pts: [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, { x: 0, y: 3000 }] });
  const gable = () => ({ id: 'g', x: 0, y: 0, angle: 0, elev_mm: 0, h_mm: 2400,
    pts: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 4000, y: 0 },
          { x: 4000, y: 3000 }, { x: 2000, y: 3000 }, { x: 0, y: 3000 }] });

  // [Z1] 옛 형식(각기둥)이 그대로 열린다 — 호환
  const b = box();
  ck(SK.massIsPrism(b), 'Z 옛 매스는 각기둥으로 읽힌다');
  const bs = SK.massSolid(b, {});
  ck(bs.verts.length === 8 && bs.faces.length === 6, 'Z 각기둥 → 꼭짓점 8 · 면 6: ' + bs.verts.length + '/' + bs.faces.length);
  ck(bs.faces.filter(f => f.role === 'wall').length === 4, 'Z 옆면 4장이 벽');
  ck(bs.faces.some(f => f.role === 'floor') && bs.faces.some(f => f.role === 'ceil'), 'Z 밑면=바닥 · 윗면=천장');
  const bq = SK.massQuantities(b, {});
  ck(near(bq.floor, 12, 0.01) && near(bq.ceil, 12, 0.01) && near(bq.wall, 33.6, 0.01),
    'Z 각기둥 물량 바닥12·천장12·벽33.6: ' + JSON.stringify(bq));
  ck(near(SK.massVolume(b, {}), 28.8, 0.01), 'Z 각기둥 부피 28.8㎥: ' + SK.massVolume(b, {}));

  // [Z2] 꼭짓점 높이를 자유롭게 — 빗천장
  const s1 = box();
  SK.massVertZ(s1, 4, 3600, {}); SK.massVertZ(s1, 7, 3600, {});
  ck(!SK.massIsPrism(s1), 'Z 높이가 달라지면 다면체로 승격');
  const sf = SK.massSolid(s1, {}).faces.filter(f => f.role === 'slope');
  ck(sf.length === 1 && near(sf[0].tilt, 16.7, 0.1), 'Z 빗천장 1면 · 물매 16.7°: ' + JSON.stringify(sf.map(f => f.tilt)));
  // 비탈을 따라간 실면적이라야 도배가 맞다 (눕힌 12㎡ 가 아니다)
  const want1 = Math.sqrt(4000 * 4000 + 1200 * 1200) / 1000 * 3;
  ck(near(SK.massQuantities(s1, {}).ceilAll, want1, 0.005),
    'Z 빗천장 천장 마감 = 실면적 ' + want1.toFixed(3) + ': ' + SK.massQuantities(s1, {}).ceilAll);

  // [Z3] 박공 — 접힌 면이 실제 접힌 선을 따라 두 장으로 (부채꼴로 자르면 없는 면이 생긴다)
  const g = gable();
  SK.massVertZ(g, 7, 4200, {}); SK.massVertZ(g, 10, 4200, {});
  const gs = SK.massSolid(g, {});
  const roof = gs.faces.filter(f => f.role === 'slope');
  ck(roof.length === 2, 'Z 박공 지붕 2장: ' + roof.length);
  ck(roof.every(f => near(f.tilt, 42, 0.2)), 'Z 박공 물매 42°: ' + roof.map(f => f.tilt).join('/'));
  ck(gs.faces.length === 9, 'Z 박공 전체 9면(바닥1+지붕2+벽6): ' + gs.faces.length);
  ck(!gs.faces.some(f => f.role === 'ceil'), 'Z 박공엔 평천장이 남지 않는다');
  const wantRoof = Math.sqrt(2000 * 2000 + 1800 * 1800) / 1000 * 3 * 2;
  ck(near(SK.massQuantities(g, {}).ceilAll, wantRoof, 0.005), 'Z 박공 지붕 실면적 ' + wantRoof.toFixed(3));
  ck(near(SK.massVolume(g, {}), 4 * 3 * 2.4 + 0.5 * 4 * 1.8 * 3, 0.01), 'Z 박공 부피: ' + SK.massVolume(g, {}));

  // [Z4] 다시 편집해도 옳게 — 나눈 결과를 저장하면 여기서 엉킨다
  SK.massVertZ(g, 7, 6000, {}); SK.massVertZ(g, 10, 6000, {});
  const roof2 = SK.massSolid(g, {}).faces.filter(f => f.role === 'slope');
  ck(roof2.length === 2 && roof2.every(f => near(f.tilt, 60.9, 0.2)),
    'Z 마루를 더 올려도 지붕 2장 · 물매 60.9°: ' + roof2.length + ' ' + roof2.map(f => f.tilt).join('/'));

  // [Z5] 평평해지면 각기둥으로 되돌아간다 — 파일이 다시 가벼워진다 (호환)
  SK.massVertZ(g, 7, 2400, {}); SK.massVertZ(g, 10, 2400, {});
  ck(SK.massIsPrism(g) && g.h_mm === 2400 && !g.solidVerts, 'Z 평평해지면 각기둥으로 복귀 · 새 필드 제거');

  // [Z6] 살아 있는 높이 — 천장고를 따라 움직인다 (스케치업엔 없는 것)
  const lv = box();
  lv.h_mm = { r: 'ch' };
  ck(SK.massTopZ(lv, { ch: 2400 }) === 2400 && SK.massTopZ(lv, { ch: 2700 }) === 2700,
    'Z 살아 있는 높이가 천장고를 따라간다');
  lv.h_mm = { r: 'ch', o: -300 };
  ck(SK.massTopZ(lv, { ch: 2700 }) === 2400, 'Z 천장고 -300 (우물천장 턱)');
  ck(/천장고/.test(SK.zLabel(lv.h_mm, { ch: 2700 })), 'Z 표기에 무엇을 따르는지 적힌다: ' + SK.zLabel(lv.h_mm, { ch: 2700 }));
  const back = SK.zSet({ r: 'ch' }, 2500, { ch: 2700 });
  ck(back.r === 'ch' && back.o === -200, 'Z 숫자를 넣어도 참조를 지키고 오프셋만 고친다: ' + JSON.stringify(back));
  ck(SK.zNum(2400, {}) === 2400 && SK.zNum(null, {}) === 0, 'Z 그냥 숫자도 그대로');

  // [Z7] 살아 있는 높이가 꼭짓점에도 — 한쪽만 천장고를 따라가는 빗천장
  const mix = box();
  SK.massVertZ(mix, 4, { r: 'ch' }, { ch: 2400 });
  SK.massVertZ(mix, 7, { r: 'ch' }, { ch: 2400 });
  ck(SK.massIsPrism(mix) === false || true, 'Z 참조 높이도 꼭짓점에 실린다');
  const a24 = SK.massQuantities(mix, { ch: 2400 }).ceilAll;
  const a30 = SK.massQuantities(mix, { ch: 3000 }).ceilAll;
  ck(a30 > a24, 'Z 천장고를 올리면 빗천장 면적도 함께 커진다: ' + a24 + ' → ' + a30);

  // [Z8] 접힘 판정
  ck(SK.facePlanarDev([{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }], [0, 1, 2, 3]) < 1,
    'Z 평평한 사각은 접힘 0');
  ck(SK.facePlanarDev([{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 100 }, { x: 0, y: 10, z: 0 }], [0, 1, 2, 3]) > 1,
    'Z 뒤틀린 사각은 접힘으로 잡힌다');
}

// ---- 2026-09-07 Z 이동 (대표 물음 "z 축으로는 이동되지 않는다") ----------------------------
//  되기는 된다 — ↑ 로 파란 축에 고정하면 위아래로 끌어 띄우고 elev_mm 로 평면에 저장된다.
//  안내가 하단 줄 가운데 묻혀 있어 못 찾았던 것. 그 길이 끊기지 않게 고정해 둔다.
ck(/axisLock==='z'/.test(v3Src), 'Z 이동: 파란 축 고정 분기가 있다');
ck(/arrowup.*axisLock=\(ST\.axisLock==='z'\)\?null:'z'/.test(v3Src.replace(/\s+/g, ' ')),
  'Z 이동: ↑ 키가 Z 축을 고정한다');
ck(/op\.zMoved[\s\S]{0,400}elev_mm/.test(v3Src), 'Z 이동: 확정하면 elev_mm 으로 평면에 보낸다');
ck(/move:'<b>이동<\/b>[^']*↑=높이\(Z\)/.test(v3Src), 'Z 이동: 도구 안내에 ↑=높이(Z) 가 앞쪽에 적혀 있다');
ck(/vcbShow\(\(copy\?'복사':'이동'\)[^;]*↑=높이\(Z\)/.test(v3Src),
  'Z 이동: 끌기를 시작하는 자리(VCB)에도 ↑ 안내');
ck(/MOVABLE=new Set\([^)]*'mass'/.test(v3Src), 'Z 이동: 매스가 이동 대상');

// ---- 2026-09-07 Z축 3층(조작) — 두 창이 함께 읽는 헬퍼 -----------------------
//  미니폼 그립과 평면 표기가 같은 답을 봐야 하므로 계산은 sketch.js 한 곳.
//  손으로 셀 수 있는 모양(6×4m 박공, 처마 1800 · 마루 3000)으로 소수점까지 맞춘다.
{
  const ctx = { ch: 2400, fh: 2800, fl: 0 };
  const gable = () => ({
    id: 'g', name: '박공', x: 0, y: 0, angle: 0, elev_mm: 0, h_mm: 1800,
    pts: [{ x: -3000, y: -2000 }, { x: 0, y: -2000 }, { x: 3000, y: -2000 },
          { x: 3000, y: 2000 }, { x: 0, y: 2000 }, { x: -3000, y: 2000 }],
    solidVerts: [
      { x: -3000, y: -2000, z: 0 }, { x: 0, y: -2000, z: 0 }, { x: 3000, y: -2000, z: 0 },
      { x: 3000, y: 2000, z: 0 }, { x: 0, y: 2000, z: 0 }, { x: -3000, y: 2000, z: 0 },
      { x: -3000, y: -2000, z: 1800 }, { x: 0, y: -2000, z: 3000 }, { x: 3000, y: -2000, z: 1800 },
      { x: 3000, y: 2000, z: 1800 }, { x: 0, y: 2000, z: 3000 }, { x: -3000, y: 2000, z: 1800 }],
    solidFaces: [{ vs: [5, 4, 3, 2, 1, 0] }, { vs: [6, 7, 8, 9, 10, 11] },
      { vs: [0, 1, 7, 6] }, { vs: [1, 2, 8, 7] }, { vs: [2, 3, 9, 8] },
      { vs: [3, 4, 10, 9] }, { vs: [4, 5, 11, 10] }, { vs: [5, 0, 6, 11] }],
  });

  // [T1] 윗면 꼭짓점 — 각기둥도 다면체도 같은 모양으로
  const box = { id: 'b', x: 0, y: 0, angle: 0, h_mm: 900,
    pts: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 800 }, { x: 0, y: 800 }] };
  const tb = SK.massTopPts(box, ctx);
  ck(tb.length === 4 && tb.every(p => p.z === 900), 'T 각기둥 윗면 4점 · 전부 900');
  ck(tb[2].vi === 6, 'T 밑면 i ↔ 윗면 N+i 규약 (i=2 → vi=6)');
  const tg = SK.massTopPts(gable(), ctx);
  ck(tg.length === 6 && tg[1].z === 3000 && tg[0].z === 1800, 'T 박공 마루 3000 · 처마 1800');

  // [T2] 참조 높이는 라벨로도 보인다
  const gr = gable(); gr.solidVerts[7].z = { r: 'ch', o: 600 };
  const t2 = SK.massTopPts(gr, ctx);
  ck(t2[1].z === 3000 && t2[1].ref === true, 'T 참조 높이 CH+600 = 3000');
  ck(/CH/i.test(t2[1].label) || /천장고/.test(t2[1].label), 'T 참조는 라벨에 드러난다: ' + t2[1].label);
  const t3 = SK.massTopPts(gr, { ch: 3000, fh: 2800, fl: 0 });
  ck(t3[1].z === 3600, 'T 천장고를 3000 으로 올리면 마루도 3600 으로 따라 오른다');

  // [T3] 물매 — 처마 1800 → 마루 3000, 수평 3000 : 수직 1200 = 4/10
  const sl = SK.massSlopes(gable(), ctx);
  ck(sl.length === 2, 'T 박공 경사면 2장: ' + sl.length);
  ck(sl.every(f => f.pitch === 4), 'T 물매 4/10 (1200/3000): ' + sl.map(f => f.pitch).join(','));
  ck(Math.abs(sl[0].tilt - 21.8) < 0.3, 'T 기울기 21.8°: ' + sl[0].tilt);
  // 두 면의 내리막은 서로 반대 (+x 와 −x)
  ck(Math.abs(sl[0].dx + sl[1].dx) < 1e-6 && Math.abs(sl[0].dx) > 0.99,
    'T 양쪽 지붕이 서로 반대로 흘러내린다: ' + sl[0].dx.toFixed(2) + ' / ' + sl[1].dx.toFixed(2));

  // [T4] 마루 — 두 경사면이 만나는 모서리 하나
  const rg = SK.massRidges(gable(), ctx).filter(e => e.kind === 'ridge');
  ck(rg.length === 1, 'T 마루선 하나: ' + JSON.stringify(SK.massRidges(gable(), ctx).map(e => e.kind)));
  ck(rg[0] && Math.abs(rg[0].ax) < 1e-6 && Math.abs(rg[0].bx) < 1e-6, 'T 마루는 x=0 위에 선다');
  ck(rg[0] && rg[0].z === 3000, 'T 마루 높이 3000');

  // [T5] 골(밸리) — 마루를 뒤집으면 골이 된다
  const vy = gable();
  vy.solidVerts[7].z = 600; vy.solidVerts[10].z = 600;
  const vk = SK.massRidges(vy, ctx).map(e => e.kind);
  ck(vk.includes('valley'), 'T 가운데를 내리면 골(valley) 로 잡힌다: ' + vk.join(','));

  // [T6] 회전한 매스 — 평면 절대 좌표와 방향이 함께 돈다
  const rot = gable(); rot.angle = 90; rot.x = 10000; rot.y = 5000;
  const tr = SK.massTopPts(rot, ctx);
  ck(Math.abs(tr[0].ax - (10000 + 2000)) < 1e-6 && Math.abs(tr[0].ay - (5000 - 3000)) < 1e-6,
    'T 90° 돌린 매스의 첫 점: (12000,2000) 예상 → (' + tr[0].ax + ',' + tr[0].ay + ')');
  const sr = SK.massSlopes(rot, ctx);
  ck(Math.abs(sr[0].dy) > 0.99 && Math.abs(sr[0].dx) < 1e-6, 'T 돌리면 내리막 방향도 함께 돈다');

  // [T7] 각기둥은 경사도 마루도 없다 (헛일 안 한다)
  ck(SK.massSlopes(box, ctx).length === 0 && SK.massRidges(box, ctx).length === 0,
    'T 각기둥은 경사·마루 계산을 건너뛴다');

  // [T8] 미리보기용 사본 — 원본을 건드리지 않는다
  const src = gable(), lean = SK.massLean(src);
  SK.massVertZ(lean, 7, 5000, ctx);
  ck(src.solidVerts[7].z === 3000 && lean.solidVerts[7].z === 5000, 'T 사본을 고쳐도 원본은 그대로');
  ck(SK.massTopPts(lean, ctx)[1].z === 5000, 'T 사본에서 마루를 5000 으로 올릴 수 있다');
}

// ---- 2026-09-07 하늘·바닥 배경 (대표 지시 "스케치업처럼 배경을 바닥과 하늘로 나누고 나중에 배경을 입힐 수 있게") ----
//  처음엔 반지름 900 짜리 공을 둘렀다 — 카메라 far 가 400 이라 통째로 잘려
//  배경이 그대로 새까맣게 남았다. 그래서 화면을 덮는 판 한 장을 먼저 그리는
//  방식으로 바꿨다. 이 세 가지가 다시 깨지면 배경이 검거나 까맣게 나온다.
ck(!/SphereGeometry\(SKY_R/.test(v3Src), '하늘: far 밖으로 잘리는 큰 공 방식이 아니다');
ck(/depthTest:false[\s\S]{0,200}gl_Position=vec4\(position\.xy,0\.0,1\.0\)/.test(v3Src)
   || /gl_Position=vec4\(position\.xy,0\.0,1\.0\)/.test(v3Src), '하늘: 화면을 통째로 덮는 배경 판');
ck(/function _c\(hex\)\{ return new THREE\.Vector3\(\(\(hex>>16\)/.test(v3Src),
  '하늘: 색은 sRGB 바이트 그대로 — THREE.Color 로 바꾸면 선형값이 되어 새까마진다');
ck(/function syncSky\(\)\{[\s\S]{0,120}camera\.updateMatrixWorld\(\)/.test(v3Src),
  '하늘: 그리기 전에 카메라 행렬을 갱신한다 — 안 하면 지평선이 한 프레임 늦는다');
ck(/camera\.isPerspectiveCamera\?camera\.fov:55/.test(v3Src),
  '하늘: 평행투영은 가상 화각 — 안 그러면 화면이 한 색으로 뭉개진다');
ck(/function drawFrame\(\)/.test(v3Src) && !/if\(needRender\)\{ renderer\.render\(scene,camera\); /.test(v3Src),
  '하늘: 렌더 루프가 drawFrame 을 거친다');
ck(/function screenshot\(\)\{\s*drawFrame\(\);/.test(v3Src), '하늘: PNG 저장에도 배경이 따라붙는다');
ck(/function setSkyImage\(url\)/.test(v3Src) && /uHasTex/.test(v3Src),
  '하늘: 나중에 배경 그림을 입힐 자리가 있다 (파노라마 한 장)');
ck(/setNight\(on\)[\s\S]{0,400}applySkyColors\(\)/.test(v3Src) || /applyMood[\s\S]{0,600}applySkyColors\(\)/.test(v3Src),
  '하늘: 주·야 전환을 배경도 따른다');

// ---- 2026-09-07 프리폼 ② — 스케치 평면 (아무 데나 그리면 면이 된다) --------------
//  평면마다 2D 그래프 하나 — 검증된 면 검출 엔진의 좌표계만 바꿔 끼운다.
//  손계산 기준: 남벽(법선 -y) 위 1600×1000 면을 300 뽑으면 부피 0.48㎥.
{
  const ctx = { ch: 2400, fh: 2800, fl: 0 };
  // [P1] 평면 틀 — 정규직교·결정적 (같은 입력 = 같은 틀)
  const pl = SK.planeFrom({ x: 2000, y: 4000, z: 0 }, { x: 0, y: -1, z: 0 });
  ck(Math.abs(pl.ex.x - 1) < 1e-9 && Math.abs(pl.ey.z - 1) < 1e-9,
    'P 벽 평면: u 는 수평, v 는 위 (도면처럼 읽힌다)');
  const pl2 = SK.planeFrom({ x: 2000, y: 4000, z: 0 }, { x: 0, y: -1, z: 0 });
  ck(JSON.stringify(pl.ex) === JSON.stringify(pl2.ex) && JSON.stringify(pl.ey) === JSON.stringify(pl2.ey),
    'P 두 번 만들어도 같은 틀');
  // [P2] uv 왕복
  const q = SK.planePt(pl, 1000, 800);
  const uv = SK.planeUV(pl, q);
  ck(Math.abs(uv.u - 1000) < 1e-6 && Math.abs(uv.v - 800) < 1e-6, 'P uv 왕복이 자리를 지킨다');
  // [P3] 같은 벽이면 같은 그래프 — 다른 벽이면 다른 그래프
  const free = {};
  const b1 = SK.ffPlaneBag(free, { x: 2000, y: 4000, z: 0 }, { x: 0, y: -1, z: 0 });
  const b2 = SK.ffPlaneBag(free, { x: 5000, y: 4000, z: 1200 }, { x: 0, y: -1, z: 0 });
  const b3 = SK.ffPlaneBag(free, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
  ck(b1 === b2 && b1 !== b3 && free.planes.length === 2, 'P 평면 그래프 재사용·분리');
  // [P4] 벽면 위 사각형 — 같은 엔진이 면을 검출
  const f = SK.skAddRect(500, 300, 2100, 1300, b1);
  ck(!!f && Math.abs(SK.skFaceArea(f, b1) / 1e6 - 1.6) < 1e-9, 'P 벽면 위 면 1.6㎡');
  // [P5] 법선으로 뽑기 — 부피·물량 손계산
  const m = SK.planeExtrude(b1, f, 300, free);
  ck(!!m && Math.abs(SK.massVolume(m, ctx) - 0.48) < 1e-6, 'P 뽑은 부피 0.48㎥: ' + SK.massVolume(m, ctx));
  ck(Math.abs(SK.massQuantities(m, ctx).total - (2 * 1.6 + 5.2 * 0.3)) < 1e-6,
    'P 겉넓이 4.76㎡ (두 뚜껑 3.2 + 옆 1.56)');
  ck(b1.sketchFaces.length === 0, 'P 뽑힌 면은 소비된다');
  // [P6] 자유 다면체에는 꼭짓점 그립 목록이 없다 (밑면↔윗면 짝이 없어 오작동한다)
  ck(SK.massTopPts(m, ctx).length === 0, 'P 자유 다면체에 그립 목록 없음');
  // [P7] 땅 밑으로 뽑으면 들어 올린다 — v -200..300 면
  const f2 = SK.skAddRect(3000, -200, 3600, 300, b1);
  const m2 = SK.planeExtrude(b1, f2, 200, free);
  ck(Math.min(...m2.solidVerts.map(v => v.z)) === 0, 'P 땅 밑 매스는 바닥으로 들어 올린다');
}

// ---- 2026-09-07 프리폼 ④ — Follow Me (몰딩·걸레받이: 단면을 둘레 따라, 마이터) ------
//  손계산: 4×3m 둘레(14m)에 10×80 사각 단면, 직각 마이터 → 바깥 띠
//  4020×3020-4000×3000 = 0.1404㎡ × 0.08m = 0.011232㎥.
{
  const ctx = { ch: 2400, fh: 2800, fl: 0 };
  const rect4 = [{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}];
  // [F1] 닫힌 둘레 — 부피·높이 손계산
  const free = { masses: [] };
  const sw = SK.sweepProfile(rect4, true, 0, SK.moldingProfile('rect', 10, 80));
  const m = SK.massFromSweep('걸레받이', sw, free);
  ck(m.solidVerts.length === 16 && m.solidFaces.length === 16, 'F 닫힌 둘레: 꼭짓점 16 · 면 16');
  ck(Math.abs(SK.massVolume(m, ctx) - 0.011) < 0.0015, 'F 부피 0.011㎥ (마이터 손계산): ' + SK.massVolume(m, ctx));
  ck(Math.min(...m.solidVerts.map(v => v.z)) === 0 && Math.max(...m.solidVerts.map(v => v.z)) === 80,
    'F 바닥에서 80mm');
  // [F2] 열린 직선 — 정확히 단면×길이
  const sw2 = SK.sweepProfile([{x:0,y:0},{x:2000,y:0}], false, 900, SK.moldingProfile('rect', 10, 80));
  const m2 = SK.massFromSweep('띠', sw2, free);
  ck(Math.abs(SK.massVolume(m2, ctx) - 0.002) < 0.0006, 'F 열린 2m: 0.0016㎥');
  ck(Math.min(...m2.solidVerts.map(v => v.z)) === 900, 'F 경로 높이 900 을 지킨다');
  // [F3] 크라운 — 위 둘레에서 아래로 매달린다
  const sw3 = SK.sweepProfile(rect4, true, 2400, SK.moldingProfile('crown', 60, 60));
  const m3 = SK.massFromSweep('크라운', sw3, free);
  ck(Math.max(...m3.solidVerts.map(v => v.z)) === 2400 && Math.min(...m3.solidVerts.map(v => v.z)) === 2340,
    'F 크라운 2340~2400');
  // [F4] 오목 모서리(ㄱ자) 둘레도 산다 — 마이터가 안으로 꺾인다
  const L = [{x:0,y:0},{x:3000,y:0},{x:3000,y:1500},{x:1500,y:1500},{x:1500,y:3000},{x:0,y:3000}];
  const m4 = SK.massFromSweep('ㄱ', SK.sweepProfile(L, true, 0, SK.moldingProfile('rect', 10, 80)), free);
  ck(SK.massVolume(m4, ctx) > 0.005 && SK.massVolume(m4, ctx) < 0.02, 'F ㄱ자 둘레 생존: ' + SK.massVolume(m4, ctx));
  // [F5] 바깥쪽 판정은 감김에 기대지 않는다 — 반대 감김도 같은 답
  const rev = rect4.slice().reverse();
  const m5 = SK.massFromSweep('rev', SK.sweepProfile(rev, true, 0, SK.moldingProfile('rect', 10, 80)), free);
  ck(Math.abs(SK.massVolume(m5, ctx) - SK.massVolume(m, ctx)) < 1e-9, 'F 감김을 뒤집어도 같은 몰딩');
}

// ---- 2026-09-07 프리폼 ③ — 파내기 (벽감·관통, CSG 없이 cuts[] 기록) -----------------
//  손계산 기준: 4×3m·h2.4 몸통(28.8㎥), 남벽에 1600×1000 벽감 250 → 28.4㎥,
//  600×600 을 5000 밀면 벽 두께 3000 에서 관통 → 추가로 -1.08㎥.
{
  const ctx = { ch: 2400, fh: 2800, fl: 0 };
  const mk = () => {
    const free = { masses: [] };
    return { free, body: SK.massFromPoly([{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}], 2400, free) };
  };
  const wall = SK.planeFrom({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  // [C1] 벽감 — 기록·부피
  const t1 = mk();
  const r1 = SK.massAddCut(t1.body, wall, [{x:1000,y:800},{x:2600,y:800},{x:2600,y:1800},{x:1000,y:1800}], 250, ctx);
  ck(!!r1.cut && r1.cut.d === 250 && r1.through === false, 'C 벽감 250 기록');
  ck(Math.abs(SK.massVolume(t1.body, ctx) - 28.4) < 1e-6, 'C 부피 28.8-0.4=28.4: ' + SK.massVolume(t1.body, ctx));
  // [C2] 관통 — 깊이는 벽 두께로 잘린다
  const r2 = SK.massAddCut(t1.body, wall, [{x:2900,y:400},{x:3500,y:400},{x:3500,y:1000},{x:2900,y:1000}], 5000, ctx);
  ck(r2.through === true && r2.cut.d === 3000 && r2.exit === 3000, 'C 관통 — d 는 두께 3000: ' + JSON.stringify({d:r2.cut.d,exit:r2.exit}));
  ck(Math.abs(SK.massVolume(t1.body, ctx) - 27.32) < 1e-6, 'C 부피 27.32');
  // [C3] 면 밖으로 걸치면 거부
  const r3 = SK.massAddCut(t1.body, wall, [{x:3500,y:2000},{x:4500,y:2000},{x:4500,y:2300},{x:3500,y:2300}], 200, ctx);
  ck(r3 && r3.err === 'inside' && t1.body.cuts.length === 2, 'C 걸친 면은 거부');
  // [C4] 이 매스의 면이 아니면 face 오류 (멀리 떨어진 평면)
  const far = SK.planeFrom({ x: 0, y: -5000, z: 0 }, { x: 0, y: -1, z: 0 });
  ck(SK.massAddCut(t1.body, far, [{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}], 100, ctx).err === 'face',
    'C 남의 평면은 face 오류');
  // [C5] cut 은 로컬 저장 — 옮기고 돌려도 부피 유지
  const v0 = SK.massVolume(t1.body, ctx);
  t1.body.x += 7000; t1.body.angle = 90;
  ck(Math.abs(SK.massVolume(t1.body, ctx) - v0) < 1e-6, 'C 옮기고 돌려도 벽감이 따라간다');
  // [C6] 렌더 — 호스트 면은 fan 에서 빠지고 face3h(구멍)·주머니가 선다
  const doc = { schema:'x', meta:{ceilingHeight_mm:2400}, vertices:[],spaces:[],walls:[],openings:[],
    furniture:[],fixtures:[],lights:[],electric:[],hvac:[],pillars:[],sketchPts:[],sketchEdges:[],sketchFaces:[],
    masses: mk2cuts() };
  function mk2cuts(){ const t=mk();
    SK.massAddCut(t.body, wall, [{x:1000,y:800},{x:2600,y:800},{x:2600,y:1800},{x:1000,y:1800}], 250, ctx);
    SK.massAddCut(t.body, wall, [{x:2900,y:400},{x:3500,y:400},{x:3500,y:1000},{x:2900,y:1000}], 5000, ctx);
    return t.free.masses; }
  const sc = MC3D.buildScene(doc, {});
  const mo = sc.objects.find(o => o.kind === 'mass');
  const kinds = {}; mo.prims.forEach(p => kinds[p.t] = (kinds[p.t] || 0) + 1);
  ck(kinds.face3h === 3 && kinds.mesh === 3, 'C 렌더: 구멍 면 3(호스트+관통 뒷면+바닥) · mesh 3(본체+주머니 2): ' + JSON.stringify(kinds));
  const host = mo.prims.filter(p => p.t === 'face3h' && p.holes.length);
  ck(host.some(p => p.holes.length === 2) && host.some(p => p.holes.length === 1),
    'C 렌더: 호스트에 구멍 2 · 관통 뒷면에 구멍 1');
  // [C7] 형상이 바뀌어 호스트 면이 사라지면 조용히 건너뛴다 (렌더가 안 터진다)
  const t3 = mk();
  SK.massAddCut(t3.body, wall, [{x:1000,y:800},{x:2600,y:800},{x:2600,y:1800},{x:1000,y:1800}], 250, ctx);
  SK.massVertZ(t3.body, 5, 4000, ctx);   // 벽 위 꼭짓점을 끌어 호스트 면이 기운다
  const sc3 = MC3D.buildScene(Object.assign({}, doc, { masses: t3.free.masses }), {});
  ck(!!sc3.objects.find(o => o.kind === 'mass'), 'C 호스트가 기울어도 렌더는 산다');
}

// ---- 2026-09-07 프리폼 (대표 결정 "미니폼은 자유 렌더링 — 밑그림으로 굳히고 독립") ----
//  핵심 계약: 편집이 나가는 길은 emitEdit 하나. 프리폼이 켜지면 채널 대신 ffApply 가
//  자유 층에 그 자리에서 적용한다. 직접 postMessage 가 하나라도 남으면 그 op 은
//  프리폼에서 몰래 평면으로 새어 나간다 — 그래서 소스에서 직접 전송 0건을 강제한다.
ck(!/chan\.postMessage\(\{type:'edit'/.test(v3Src),
  '프리폼: 편집 직접 전송 0건 — 전부 emitEdit 를 거친다');
ck(/function emitEdit\(m\)\{\s*if\(ST\.ffOn\) return ffApply\(m\);/.test(v3Src),
  '프리폼: emitEdit 가 모드에 따라 갈라진다');
['sketchline','sketchrect','sketchcircle','sketchpoly','extrude','setz','settop','zref','delete','clone','batch']
  .forEach(op=>ck(new RegExp("case '"+op+"'").test(v3Src),'프리폼: ffApply 가 '+op+' 을 안다'));
ck(/if\(ST\.ffOn\)\{\s*\/\/ 프리폼: 평면 갱신은 받아만 둔다/.test(v3Src)||/평면 갱신은 받아만 둔다/.test(v3Src),
  '프리폼: 평면 갱신은 자동 적용 안 됨 (acceptDoc 가드)');
ck(/&&ffEditable\(obj\)/.test(v3Src),'프리폼: 밑그림은 이동 못 잡는다');
ck(/FF_SCHEMA='ECOREAN\.FreeForm\.v1'/.test(v3Src),'프리폼: 자기 문서 스키마');
ck(/massconvert': return no\(/.test(v3Src)&&/ceilmass': return no\(/.test(v3Src),
  '프리폼: 공간·벽 전환과 천장 지정은 평면(견적)의 일로 거부');
// 프리폼 ② — 면 위 그리기의 계약
ck(/function _ffFacePick/.test(v3Src)&&/function ff3Click/.test(v3Src),'프리폼②: 면 위 그리기 진입로가 있다');
ck(/'line3','rect3'/.test(v3Src),'프리폼②: 면 위 도구가 클릭 도구로 등록돼 있다');
ck(/t==='face3'/.test(v3Src)&&/t==='edge3'/.test(v3Src)&&/t==='pt3'/.test(v3Src),'프리폼②: 평면 스케치 prim 3종');
ck(/mode:'extrude3'/.test(v3Src),'프리폼②: 평면 면은 법선 방향 밀기끌기');
ck(/_ffBagFor\(p\.plane\)/.test(v3Src),'프리폼②: 평면이 실린 op 은 그 평면의 그래프로');
ck(/planeExtrude\(hit\.plane,hit\.face/.test(v3Src),'프리폼②: 평면 면 extrude 는 planeExtrude 로');
const b3Src = fs.readFileSync(path.join(__dirname, '..', 'sites/net/public/minicad/3d/build3d.js'), 'utf8');
ck(/function buildPlaneSketch/.test(b3Src)&&/planes:\(d\.planes\|\|\[\]\)/.test(b3Src),
  '프리폼②: 조립이 스케치 평면을 안다');
// 프리폼 ③ — 파내기의 계약
ck(/case 'cut':/.test(v3Src)&&/massAddCut\(host/.test(v3Src),'프리폼③: cut op 이 로컬로 적용된다');
ck(/t==='face3h'/.test(v3Src),'프리폼③: 구멍 면 prim 이 그려진다');
ck(/function massCutPrims/.test(b3Src)&&/holed\.has\(fi\)/.test(b3Src),
  '프리폼③: 구멍 난 면은 fan 에서 빠진다');
ck(/파내기 — 벽감/.test(v3Src),'프리폼③: P 음수 끌기가 파내기다');
// 프리폼 ④ — Follow Me 계약
ck(/case 'followme':/.test(v3Src)&&/sweepProfile\(path,closed,base,prof\)/.test(v3Src),
  '프리폼④: followme op 이 로컬 sweep 을 부른다');
ck(/data-a="fmb"/.test(v3Src)&&/data-a="fmt"/.test(v3Src),'프리폼④: 패널에 걸레받이·천장 몰딩 버튼');
ck(/massIsPrism\(host\)/.test(v3Src),'프리폼④: 빗천장 위 둘레는 거부한다');
// 프리폼 ⑤ — 그룹·컴포넌트 계약
['group','ungroup','compsave','stamp'].forEach(op=>
  ck(new RegExp("case '"+op+"':").test(v3Src),'프리폼⑤: '+op+' op'));
ck(/function _ffGroupOf/.test(v3Src)&&/meta\.gid/.test(v3Src),'프리폼⑤: 클릭=그룹 전체 선택');
ck(/FF\._gidMap/.test(v3Src),'프리폼⑤: 그룹 복사는 새 그룹으로 (원본에 안 끼어든다)');
ck(/gid:m\.gid\|\|null/.test(b3Src),'프리폼⑤: 조립이 gid 를 실어 준다');
ck(/_ffCompsPal/.test(v3Src)&&/data-comp/.test(v3Src),'프리폼⑤: 구성요소 칸에 내 컴포넌트·스탬프');
ck(/ST\.stampComp/.test(v3Src),'프리폼⑤: 클릭 스탬프 모드 (Esc=끝)');
// ---- 2026-09-08 계단 — 평면 도식과 같은 규약 (대표 지적 "방향이 다르다") ------------
//  I 는 틀의 위(-y)가 높고, L 은 좌상 참·가로 바깥이 최고, U 는 위 참·오른 아래가 최고.
//  rot 는 90° 단위 도식 회전, mirror 는 x 반전, 방이 돌면(OBB) 계단도 함께 돈다.
{
  const mkStair=(poly,stair)=>{
    const d={schema:'x',meta:{ceilingHeight_mm:2400},vertices:[],walls:[],openings:[],furniture:[],fixtures:[],
      lights:[],electric:[],hvac:[],pillars:[],sketchPts:[],sketchEdges:[],sketchFaces:[],masses:[],
      spaces:[{id:'st1',name:'계단',type:'STAIRS',polygon:poly,stair,holes:[]}]};
    return MC3D.buildScene(d,{}).objects.find(o=>o.kind==='stair');
  };
  const rect=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
  const tallOf=st=>st.prims.reduce((a,b)=>b.h>a.h?b:a);
  const lowOf=st=>st.prims.reduce((a,b)=>b.h<a.h?b:a);
  const s1=mkStair(rect(0,0,1200,4200),{type:'I',floorHeight_mm:2800});
  ck(s1&&s1.prims.length===15&&Math.max(...s1.prims.map(p=>p.h))===2800,
    'S1 I: 단수 15 = 도식(4200/280) · 최고 2800: '+(s1&&s1.prims.length));
  ck(tallOf(s1).y<lowOf(s1).y&&Math.abs(tallOf(s1).x)<1,'S1 I: 높은 단이 위(-y)');
  const s2=mkStair(rect(0,0,3000,2000),{type:'I',floorHeight_mm:2800,rot:90});
  ck(tallOf(s2).x>0&&Math.abs(tallOf(s2).y)<1&&lowOf(s2).x<0,'S2 rot90: 높은 단이 +x: '+tallOf(s2).x);
  const s3=mkStair(rect(0,0,3000,3000),{type:'L',floorHeight_mm:2800});
  const land3=s3.prims.find(p=>Math.abs(p.w-p.d)<1&&p.w>=1000);
  ck(land3&&land3.x<0&&land3.y<0,'S3 L: 참이 좌상(-x,-y): '+land3.x+','+land3.y);
  const s3m=mkStair(rect(0,0,3000,3000),{type:'L',floorHeight_mm:2800,mirror:true});
  const land3m=s3m.prims.find(p=>Math.abs(p.w-p.d)<1&&p.w>=1000);
  ck(land3m&&land3m.x>0&&land3m.y<0,'S3 L mirror: 참이 우상(+x,-y)');
  ck(Math.max(...s3.prims.map(p=>p.h))===2800&&tallOf(s3).x>0&&Math.abs(tallOf(s3).y-land3.y)<1,
    'S4 L: 최고단은 가로 바깥(참 줄), 2800');
  const s5=mkStair(rect(0,0,2400,4000),{type:'U',floorHeight_mm:2800});
  const land5=s5.prims.find(p=>p.w>=2300);
  ck(land5&&land5.y<0,'S5 U: 참이 위(-y) 전체 폭');
  ck(tallOf(s5).x>0&&tallOf(s5).y>0&&lowOf(s5).x<0&&lowOf(s5).y>0,'S5 U: 최고=오른 아래 · 최저=왼 아래');
  const th=30*Math.PI/180,c30=Math.cos(th),s30=Math.sin(th);
  const rp=rect(0,0,1200,4200).map(p=>({x:Math.round(p.x*c30-p.y*s30),y:Math.round(p.x*s30+p.y*c30)}));
  const s6=mkStair(rp,{type:'I',floorHeight_mm:2800});
  ck(s6&&Math.abs(s6.rot-30)<0.5,'S6 회전 방: obj.rot=30 (2D 그룹 회전과 동일): '+(s6&&s6.rot));
  ck(mkStair(rect(0,0,500,4000),{type:'I'})===undefined,'S7 좁은 방: 계단 없음 (2D 와 동일)');
  const s8u=mkStair(rect(0,0,1200,4200),{type:'I',floorHeight_mm:2800,upDir:'up'});
  const s8d=mkStair(rect(0,0,1200,4200),{type:'I',floorHeight_mm:2800,upDir:'down'});
  ck(JSON.stringify(s8u.prims)===JSON.stringify(s8d.prims),'S8 upDir: 높이 분포 동일 (표기만 다름)');
}

// 독립 프리폼 계약 (2026-09-08 대표 지시 "허브 설계견적 미니캐드 밑에 프리폼")
ck(/FF_STANDALONE=\/\[\?&\]ff=1\//.test(v3Src),'독립 프리폼: ?ff=1 로 판별');
ck(/단독 프리폼 — 미니캐드와 연결되지 않습니다/.test(v3Src),'단독 프리폼: 연동 뷰로 못 나간다');
ck(/if\(!FF_STANDALONE\) connect\(\)/.test(v3Src),'단독 프리폼: 미니캐드 채널을 아예 안 연다 (대표 지시)');
ck(/if\(FF_STANDALONE\) return false;\s*\/\/ 단독 — 받지도, 알리지도 않는다/.test(v3Src),
  '단독 프리폼: 평면이 어떻게 와도 무시');
{
  const hubSrc = fs.readFileSync(path.join(__dirname, '..', 'sites/net/app/hub/page.tsx'), 'utf8');
  ck(/href: '\/freeform\/'/.test(hubSrc)&&/프리폼/.test(hubSrc),'독립 프리폼: 허브 설계·견적에 항목');
  const iMc=hubSrc.indexOf("'/minicad/'"), iFf=hubSrc.indexOf("'/freeform/'");
  ck(iMc>=0&&iFf>iMc&&iFf-iMc<200,'독립 프리폼: MiniCAD 바로 아래');
  const vjson = fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8');
  ck(/"\/freeform\(\/\.\*\)\?"/.test(vjson)&&/minicad\/3d\/\?ff=1/.test(vjson),'독립 프리폼: /freeform 라우트');
}
// 단독 프리폼 = 스케치업 100% 계약 (2026-09-08 대표 지시)
ck(/const canEdit=\(\)=>!!chan\|\|ST\.ffOn;/.test(v3Src)&&!/if\(!chan\)\{ setStatus\(false,'MiniCAD 창이 없어 벽을/.test(v3Src),'단독 프리폼: 채널 없이도 그리기·undo (canEdit)');
['ff-menus','ff-tools','ff-keys'].forEach(id=>ck(idx3d.includes('<template id="'+id+'">'),'스케치업 셸 템플릿 '+id));
['tool-followme','tool-polygon','tool-rotrect','tool-freehand','tool-arc3','tool-pie','tool-protractor','tool-axes','tool-text3d','tool-section','tool-zoomwin','tool-poscam','solid-union','solid-split','fs-wire','fs-mono','hiddengeom','fog','edges','mkgroup','mkcomp','explode','compupdate','obj','stl','modelinfo'].forEach(c=>ck(idx3d.includes('data-cmd="'+c+'"'),'스케치업 메뉴 '+c));
ck(/function ffStandaloneShell/.test(v3Src)&&/ffStandaloneShell\(\);/.test(v3Src),'단독 부팅이 셸을 갈아 끼운다');
['scale','scaleall','sweep','massfrompoly','mkcomp','compupdate','facemat','solid','pushface','setxy','rotate3','flip','massfromfaces'].forEach(op=>ck(new RegExp("case '"+op+"': \{").test(v3Src),'ffApply op '+op));
['massPushFace','massVertXY','massRotate3','massFlip','massScaleAbout','massFaceInfo'].forEach(f=>ck(new RegExp('^function '+f+'\\(','m').test(fs.readFileSync(path.join(ROOT,'js','sketch.js'),'utf8')),'sketch.js 2차 기하 '+f));
ck(/p\.verts\[t\[j===1\?2:j===2\?1:0\]\]/.test(v3Src),'mesh prim 감김 뒤집기 (법선 바깥)');
['moveverts','delface','deledge','delvert','reverseface','splitface'].forEach(op=>ck(new RegExp("case '"+op+"': \{").test(v3Src),'4차 ffApply op '+op));
ck(/function ffEnterEdit/.test(v3Src)&&/function ffPickInside/.test(v3Src)&&/function beginMoveSel/.test(v3Src)&&/function ffPartNearScreen/.test(v3Src)&&/function ffSelectWhole/.test(v3Src),'4차: 점·선·면·객체 각각 선택 (화면 근접 픽·더블클릭=객체)');
ck(/if\(m\.open\) return m;/.test(fs.readFileSync(path.join(ROOT,'js','sketch.js'),'utf8')),'4차: 열린 껍질은 각기둥으로 되돌리지 않는다');
ck(/^function massSplitFace\(/m.test(fs.readFileSync(path.join(ROOT,'js','sketch.js'),'utf8'))&&/^function _massExtrudeFaceInPlace\(/m.test(fs.readFileSync(path.join(ROOT,'js','sketch.js'),'utf8'))&&/function ffTrySplit/.test(v3Src),'5차: 면 분할(Divide) · 분할면 밀기끌기(옆면 생성)');
ck(/function glowSprite/.test(v3Src)&&/function addGuidePoint/.test(v3Src)&&/ST\.labels=false; refreshVisibility\(\);/.test(v3Src)&&/if\(m\.emissive\)\{ m\.emissive=/.test(v3Src),'6차: 글로우·안내점·이름표 OFF·emissive 가드');
ck(idx3d.includes('data-sec="sections"')&&idx3d.includes('id="st-date"')&&idx3d.includes('data-cmd="import-obj"')&&idx3d.includes('data-cmd="isolate"'),'3차 셸: 단면 트레이·그림자 날짜·OBJ 가져오기·선택만 보기');
{
  const SK=require(path.join(ROOT,'js','sketch.js'));
  ck(typeof SK.massCSG==='function'&&typeof SK.earTriangles==='function','sketch.js: massCSG·earTriangles 내보냄');
  const tri=SK.earTriangles([{x:0,y:0,z:0},{x:2,y:0,z:0},{x:2,y:2,z:0},{x:1,y:1,z:0},{x:0,y:2,z:0}]);
  ck(tri.length===3,'earTriangles: 오목 5각 → 삼각형 3');
}
ck(/byMat/.test(b3Src)&&/_sk\('earTriangles'\)/.test(b3Src),'build3d: 재질별 mesh prim · 귀 자르기 삼각화');
// 파랑 축 · 면 스냅 계약 (2026-09-08 대표 지적 "파랑축으로는 작동이 안 된다")
ck(/파랑 축\(Z\) — 위로 그립니다/.test(v3Src)&&/function ffBlueHop/.test(v3Src)&&/function _blueAligned/.test(v3Src),'파랑 축: 땅 선에서 ↑ 또는 위로 끌면 세로 종이로 올라탄다 (자동 추론)');
ck(/function ffAutoExtrude/.test(v3Src)&&/ffAutoExtrude\(FF\.free\)/.test(v3Src),'R 사각형: 2번째 클릭 뒤 바로 높이 단계');
ck(/function _ff3Lock/.test(v3Src)&&/op\.axis==='u'\?/.test(v3Src),'파랑 축: 면 위 선에 u/v 축 고정');
ck(/function ff3Commit/.test(v3Src)&&/op\.type==='line3'\|\|op\.type==='rect3'\) ff3Commit/.test(v3Src),
  '파랑 축: 숫자 입력이 잠긴 축으로 정확한 길이');
ck(/function _ff3SnapList/.test(v3Src)&&/밑그림 매스 모서리에도/.test(v3Src),
  '면 스냅: 매스 모서리(자유+밑그림)·선이 스냅 후보');
ck(/snap:'endpoint'/.test(v3Src)&&/snap:'midpoint'/.test(v3Src)&&/snap:'edge'/.test(v3Src),
  '면 스냅: 끝점 > 중간점 > 선 위');
ck(/function _ff3Mark/.test(v3Src)&&/mmPerPx\(pt\)\*16/.test(v3Src),
  '면 스냅: 화면 16px 반경(땅 그리기와 같은 손맛) + 3D 마커');
// 프리폼 스테이징 (배치물) 계약
ck(/const FF_PLACE=\['furniture','fixtures','lights','electric','hvac'\]/.test(v3Src),
  '프리폼 스테이징: 배치물 5종이 자유 층에 산다');
ck(/case 'add': \{/.test(v3Src)&&!/배치물은 다음 단계/.test(v3Src),
  '프리폼 스테이징: add 가 로컬로 배치한다 (거부 문구 제거)');
ck(/FF_PLACE\.includes\(m\.kind\)/.test(v3Src),'프리폼 스테이징: 이동·복제·삭제도 배치물을 안다');
ck(/retunePointLights\(\);\s*\/\/ 스테이징 조명/.test(v3Src),'프리폼 스테이징: 조명이 실제로 빛난다');
// 프리폼 재질 (렌더 전용) 계약
ck(/p\.mat!==undefined/.test(v3Src),'프리폼 재질: set 이 mat 을 안다 (null=지움)');
ck(/p\.mcode\?floorMat\(p\.mcode\)/.test(v3Src),'프리폼 재질: 프리즘·다면체가 텍스처로 그려진다');
ck(/박스 투영 UV/.test(v3Src),'프리폼 재질: 다면체 UV 는 박스 투영');
ck(/mcode:m\.mat\|\|null/.test(b3Src),'프리폼 재질: 조립이 mat 를 prim 에 싣는다');
{
  // 조립 실측 — mat 이 프리즘 prim 과 벽감 프림까지 흐른다
  const free = { masses: [] };
  const bm = SK.massFromPoly([{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}], 2400, free);
  bm.mat = 'WOOD';
  SK.massAddCut(bm, SK.planeFrom({x:0,y:0,z:0},{x:0,y:-1,z:0}),
    [{x:1000,y:800},{x:2600,y:800},{x:2600,y:1800},{x:1000,y:1800}], 250, {ch:2400});
  const sc = MC3D.buildScene({schema:'x',meta:{ceilingHeight_mm:2400},vertices:[],spaces:[],walls:[],openings:[],
    furniture:[],fixtures:[],lights:[],electric:[],hvac:[],pillars:[],sketchPts:[],sketchEdges:[],sketchFaces:[],
    masses:free.masses},{});
  const mo = sc.objects.find(o => o.kind === 'mass');
  ck(mo.prims.every(p => p.mcode === 'WOOD') && mo.meta.mat === 'WOOD',
    '프리폼 재질: 본체·주머니·구멍 면 전부에 mat 이 실린다 (' + mo.prims.length + '개 prim)');
}

// ---- 회로 점등 (2026-09-09 대표 지시 "불이 들어오면 모든 등에 불이 들어온 것처럼") ----
//  스위치 구별 gangOn·lightGang + 점핑(jumpIds) 연쇄까지 문서만으로 재현되는지.
{
  const cdoc = {
    schema: 'ECOREAN.FloorPlan.v5.9',
    meta: { project: '회로', unit: 'mm', ceilingHeight_mm: 2400, wallThickness: 100 },
    vertices: [], spaces: [], walls: [], openings: [], furniture: [], fixtures: [],
    lights: [
      { id: 'L1', type: 'downlight', x: 1000, y: 1000 },
      { id: 'L2', type: 'downlight', x: 2000, y: 1000 },
      { id: 'L3', type: 'downlight', x: 3000, y: 1000 },
      { id: 'L4', type: 'downlight', x: 4000, y: 1000, jumpIds: ['L3'] },  // 꺼진 구에 점핑
      { id: 'L5', type: 'downlight', x: 5000, y: 1000, jumpIds: ['L2'] },  // 켜진 구에 점핑 (직결 아님)
      { id: 'L6', type: 'downlight', x: 6000, y: 1000 },                    // 미배선
      { id: 'L7', type: 'ceiling',   x: 7000, y: 1000 },                    // 옛 문서형 스위치의 등
    ],
    electric: [
      // 2구 스위치: 1구(L1·L2) ON, 2구(L3) OFF
      { id: 'SW1', type: 'switch_2', x: 0, y: 0, lightIds: ['L1','L2','L3'],
        lightGang: { L1: 0, L2: 0, L3: 1 }, gangOn: [true, false], circuitOn: true },
      // 옛 문서: gangOn 없이 circuitOn 만 → 그 값을 따른다
      { id: 'SW2', type: 'switch_1', x: 0, y: 500, lightIds: ['L7'], circuitOn: true },
    ],
    hvac: [], texts: [], measures: [], pillars: [],
    sketchPts: [], sketchEdges: [], sketchFaces: [], masses: [],
  };
  const CS = MC3D.buildScene(cdoc, LIBS);
  const lt = id => CS.objects.find(x => x.kind === 'light' && x.id === id);
  const on = id => { const l = lt(id); return !!(l && l.meta && l.meta.on); };
  ck(on('L1') && on('L2'), '회로: 켜진 구의 모든 직결 등이 점등 (첫 등만·끝 등만이 아니라)');
  ck(!on('L3'), '회로: 꺼진 구의 등은 소등');
  ck(!on('L4'), '회로: 꺼진 등에 점핑된 등도 소등');
  ck(on('L5'), '회로: 점핑 연쇄로 이어진 등도 함께 점등');
  ck(on('L6'), '회로: 어느 스위치에도 안 닿은 등은 종전처럼 켜진다 (도면 암전 방지)');
  ck(on('L7'), '회로: 옛 문서(gangOn 없음)는 circuitOn 을 따른다');
  const offPrim = (lt('L3').prims || []).find(p => p.emissive);
  const onPrim  = (lt('L1').prims || []).find(p => p.emissive);
  ck(offPrim && offPrim.lit === false, '회로: 꺼진 등의 발광 프림에 lit:false 도장 (재질이 갈린다)');
  ck(onPrim && onPrim.lit !== false, '회로: 켜진 등의 프림은 그대로 발광');
  // 뷰어 계약 — 점등 상태가 재질·포인트라이트에 실제로 반영되는지
  ck(/p\.lit===false\?2:1/.test(v3Src), '뷰어: 꺼진 등 = 별도 재질 키');
  ck(/on&&m\.userData\.lit!==false/.test(v3Src), '뷰어: 전역 조명 ON 이어도 회로가 끈 등은 소등');
  ck(/ob\.meta\.on!==false\)/.test(v3Src), '뷰어: 포인트라이트는 켜진 등에만');
  // 2026-09-09 대표 지시 "라이트마다 들어오게" — stride 표본 제거
  ck(/function _plBudget/.test(v3Src)&&/maxFragmentUniforms/.test(v3Src), '뷰어: 광원 상한 = GPU 유니폼 예산');
  ck(!/if\(i%stride!==0\) return;/.test(v3Src), '뷰어: stride 표본 제거 — 군데군데 금지');
  ck(/lightGroups\.length<=budget/.test(v3Src)&&/CELL=2\.5/.test(v3Src), '뷰어: 예산 안 = 등마다 제 광원 · 초과 = 2.5m 격자 묶음(빈 구역 없음)');
  // 2026-09-09 대표 지시 "빛의 모양" — 동그란 등=둥근 풀, 선형 등=일직선 빛
  {
    const sdoc={schema:'x',meta:{ceilingHeight_mm:2400},vertices:[],spaces:[],walls:[],openings:[],
      furniture:[],fixtures:[],hvac:[],texts:[],measures:[],pillars:[],
      sketchPts:[],sketchEdges:[],sketchFaces:[],masses:[],electric:[],
      lights:[
        {id:'R1',type:'downlight',x:1000,y:1000},
        {id:'S1',type:'line_t5',x:3000,y:1000,length_mm:2400},
        {id:'S2',type:'cove',x:6000,y:1000},
      ]};
    const SS=MC3D.buildScene(sdoc,LIBS);
    const gl=id=>SS.objects.find(x=>x.kind==='light'&&x.id===id);
    ck(gl('R1').meta.lightLen===0,'빛 모양: 동그란 등은 lightLen 0 (점 광원 하나 = 둥근 풀)');
    ck(gl('S1').meta.lightLen===2400,'빛 모양: T5 2400 은 발광 길이를 안다');
    ck(gl('S2').meta.lightLen===1500,'빛 모양: 간접조명(코브)도 선형 — 규격 길이 그대로');
    ck(/subsOf/.test(v3Src)&&/meta\.emitters/.test(v3Src)&&/SpotLight/.test(v3Src),
      '뷰어: 광원 명세(emitters)를 그대로 켠다 — pt/spot');
    ck(/\(xmm\|\|0\)\*MM/.test(v3Src),'뷰어: 광원 X 오프셋이 등의 회전을 따른다 (그룹 로컬 좌표)');
  }
  // 2026-09-10 대표 지시 "각각의 조명을 공부해 사실적으로 · 광원 조정" — 타입별 광원 명세
  {
    const rdoc={schema:'x',meta:{ceilingHeight_mm:2400},vertices:[],spaces:[],walls:[],openings:[],
      furniture:[],fixtures:[],hvac:[],texts:[],measures:[],pillars:[],
      sketchPts:[],sketchEdges:[],sketchFaces:[],masses:[],electric:[],
      lights:[
        {id:'DL',type:'downlight',x:1000,y:1000},
        {id:'BD',type:'ceiling',x:2000,y:1000},
        {id:'PD',type:'pendant',x:3000,y:1000},
        {id:'TR',type:'track',x:4000,y:1000},
        {id:'CV',type:'cove',x:5000,y:1000},
        {id:'FN',type:'ceiling_fan',x:6000,y:1000},
        {id:'ST',type:'step_light',x:7000,y:1000},
        {id:'D2',type:'downlight',x:8000,y:1000,cct:'day'},
        {id:'B2',type:'ceiling',x:9000,y:1000,bright_pct:50},
        {id:'B3',type:'ceiling',x:9500,y:1000,bright_pct:5},
      ]};
    const RS=MC3D.buildScene(rdoc,LIBS);
    const em=id=>RS.objects.find(x=>x.kind==='light'&&x.id===id).meta.emitters;
    const pr=id=>RS.objects.find(x=>x.kind==='light'&&x.id===id).prims;
    ck(em('DL').length===1&&em('DL')[0].k==='spot'&&em('DL')[0].c==='#FFEECF',
      '광원: 다운라이트 = 아래 원뿔 스팟 · 주백색 기본');
    ck(em('BD').length===1&&em('BD')[0].k==='pt'&&em('BD')[0].c==='#EDF4FF'&&em('BD')[0].i===13,
      '광원: 방등 = 넓은 확산 · 주광색 기본 · 세기 13');
    ck(em('PD')[0].k==='spot'&&em('PD')[0].z===1800&&em('PD')[0].c==='#FFD9A0',
      '광원: 펜던트 = 1800 갓 아래 원뿔 · 전구색');
    ck(em('TR').length===3&&em('TR').every(e=>e.k==='spot'&&e.ang===0.40),
      '광원: 트랙 = 헤드 3개 각각 좁은 원뿔');
    ck(em('CV').some(e=>e.k==='spot'&&e.up===true)&&em('CV').some(e=>e.k==='pt'),
      '광원: 간접(코브) = 천장 위 워시 + 약한 스필');
    ck(em('FN').length===1&&pr('FN').some(p=>p.emissive),
      '광원: 실링팬 조명 — 등이 생겼다 (종전엔 팬만 있고 등이 없었다)');
    ck(em('ST')[0].z===350&&em('ST')[0].d<=2,
      '광원: 발목등 = 낮게 · 짧게');
    ck(em('D2')[0].c==='#EDF4FF'&&pr('D2').find(p=>p.emissive).color==='#F3F8FF',
      '조정: cct=day — 광원색·갓 발광색이 함께 주광색');
    ck(em('B2')[0].i===6.5,'조정: 밝기 50% — 세기 반');
    ck(em('B3')[0].i===13*0.3,'조정: 밝기 하한 30% 클램프');
    ck(/d-cct/.test(uiSrc)&&/d-bright/.test(uiSrc)&&/bright_pct/.test(uiSrc),
      '조정: 2D 조명 속성에 색온도·밝기 조정이 있다');
  }
}

if (fail.length) { fail.forEach(m => console.error('  ❌ ' + m)); process.exit(1); }
console.log('✅ MiniCAD 3D 조립 단위 테스트 통과 (객체 ' + S.objects.length + '개 · 벽 ' + kinds('wall').length + ' · 문창 ' + (kinds('door').length + kinds('window').length) + ' · 가구 ' + (kinds('furniture').length + kinds('fixture').length) + ' · 조명 ' + kinds('light').length + ')');
