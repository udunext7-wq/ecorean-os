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
ck(near(full[0].w, 1050) && near(full[1].w, 1150) && near(full[2].w, 1100), '토막 폭 1050/1150/1100: ' + full.map(p => p.w).join('/'));
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
ck(S3.objects.length === 1 && S3.objects[0].kind === 'slab', '빈 문서 → 슬래브만');

if (fail.length) { fail.forEach(m => console.error('  ❌ ' + m)); process.exit(1); }
console.log('✅ MiniCAD 3D 조립 단위 테스트 통과 (객체 ' + S.objects.length + '개 · 벽 ' + kinds('wall').length + ' · 문창 ' + (kinds('door').length + kinds('window').length) + ' · 가구 ' + (kinds('furniture').length + kinds('fixture').length) + ' · 조명 ' + kinds('light').length + ')');
