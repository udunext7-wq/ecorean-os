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
ck(S.counts.spaces === 3 && S.counts.walls === 4, '공간 3·벽 4(안내선 제외): ' + JSON.stringify(S.counts));
ck(kinds('floor').length === 3 && kinds('ceiling').length === 3, '바닥·천장 각 3');
ck(kinds('wall').length === 4, '벽 객체 4: ' + kinds('wall').length);

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
ck(wb && wb.prims.length === 1 && wb.prims[0].color === MC3D.COLORS.bearing && wb.prims[0].h === 2400 && wb.prims[0].d === 200, '내력벽 1상자 회색 h2400 t200');
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
// 계단 — 15단(2800/180≈15.6 → 16)
const st = byId('sp3_stair');
ck(st && st.prims.length === Math.round(2800 / 180) && st.prims[st.prims.length - 1].h === 2800, '계단 단수·최상단 높이: ' + (st && st.prims.length));

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
//  내력벽 무게중심 규칙: 내력벽 2장이 마주보면 각각 '안쪽'이 서로를 향한다
const B = { meta: {}, walls: [
  { id: 'b1', x1: 0, y1: 0, x2: 4000, y2: 0, thickness: 200, wallType: 'bearing', alignment: 'interior' },      // n=(0,1) → 무게중심(2000,2000) 쪽 → sign +1 → off +100
  { id: 'b2', x1: 0, y1: 4000, x2: 4000, y2: 4000, thickness: 200, wallType: 'bearing', alignment: 'interior' }, // n=(0,1) → 무게중심은 −n 쪽 → sign −1 → off −100
] };
const SB = MC3D.buildScene(B, LIBS);
const bw = id => SB.objects.find(o => o.id === id);
ck(bw('b1').meta.offset === 100 && bw('b2').meta.offset === -100, '내력벽 interior: 무게중심 쪽으로 t/2 (+100 / −100): ' + bw('b1').meta.offset + '/' + bw('b2').meta.offset);
B.walls.forEach(w => { w.alignment = 'exterior'; });
const SB2 = MC3D.buildScene(B, LIBS);
ck(SB2.objects.find(o => o.id === 'b1').meta.offset === -100 && SB2.objects.find(o => o.id === 'b2').meta.offset === 100, '내력벽 exterior: 무게중심 반대');
const one = MC3D.buildScene({ meta: {}, walls: [B.walls[1]] }, LIBS).objects.find(o => o.id === 'b2');
ck(one.meta.offset === -100, '내력벽 1장뿐이면 기본 규약(sign=+1) → exterior −100: ' + one.meta.offset);

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

if (fail.length) { fail.forEach(m => console.error('  ❌ ' + m)); process.exit(1); }
console.log('✅ MiniCAD 3D 조립 단위 테스트 통과 (객체 ' + S.objects.length + '개 · 벽 ' + kinds('wall').length + ' · 문창 ' + (kinds('door').length + kinds('window').length) + ' · 가구 ' + (kinds('furniture').length + kinds('fixture').length) + ' · 조명 ' + kinds('light').length + ')');
