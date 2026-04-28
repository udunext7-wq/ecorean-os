const {
  DRAWING_MODEL_VERSION, LAYERS, GEOMETRY_TYPES,
  createDrawing, createRectSpace, computeAreaSqm, validateDrawing
} = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 7 레이어 정의
(function() {
  const count = Object.keys(LAYERS).length;
  assert(count === 7, '레이어 7개: 실제 ' + count);
  assert(LAYERS.L1 === 'floorplan', 'L1 평면도');
  assert(LAYERS.L7 === 'bim_ifc', 'L7 BIM');
})();

// Test 2: 5 geometry 타입
(function() {
  const count = Object.keys(GEOMETRY_TYPES).length;
  assert(count === 5, 'geometry 5종');
})();

// Test 3: createDrawing 필수 필드 검증
(function() {
  let threw = false;
  try { createDrawing({}); } catch(e) { threw = true; }
  assert(threw, 'spaceId 없으면 throw');
})();

// Test 4: createRectSpace 정상
(function() {
  const d = createRectSpace({
    spaceId: 'space_001',
    typeKey: 'LIVING',
    width: 5000,
    length: 4000
  });
  assert(d.spaceId === 'space_001', 'spaceId');
  assert(d.layer === 'floorplan', 'L1 자동');
  assert(d.geometry.width === 5000, 'width');
  assert(d.metadata.typeKey === 'LIVING', 'typeKey');
  assert(d.tenantId === 'HQ', 'tenantId 기본 HQ');
  assert(d.version === DRAWING_MODEL_VERSION, 'version');
})();

// Test 5: 면적 자동 계산
(function() {
  const d = createRectSpace({ spaceId: 's', width: 5000, length: 4000 });
  const area = computeAreaSqm(d);
  assert(area === 20, '5000×4000mm = 20㎡');
})();

// Test 6: validateDrawing 통과
(function() {
  const d = createRectSpace({ spaceId: 's' });
  const errors = validateDrawing(d);
  assert(errors.length === 0, '정상 drawing 검증 통과');
})();

// Test 7: validateDrawing 누락 검증
(function() {
  const errors = validateDrawing({ id: 'x' });
  assert(errors.length > 0, '누락 시 에러');
})();

// Test 8: 멀티테넌시 (tenantId 분리)
(function() {
  const d1 = createRectSpace({ spaceId: 's', tenantId: 'F001' });
  const d2 = createRectSpace({ spaceId: 's', tenantId: 'F002' });
  assert(d1.tenantId !== d2.tenantId, 'tenant 격리');
})();

// Test 9: version 컬럼 (마이그레이션 호환)
(function() {
  const d = createRectSpace({ spaceId: 's' });
  assert(typeof d.version === 'string', 'version string');
  assert(d.version === '1.0.0', 'version 1.0.0');
})();

console.log('[PASS] DrawingModel (9/9)');
