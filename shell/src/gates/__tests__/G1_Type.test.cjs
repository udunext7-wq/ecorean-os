const { G1Type, RESIDENCE_TYPES, PYEONG_LEVELS } = require('../G1_Type.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 주거형태 6개
(function() {
  assert(RESIDENCE_TYPES.length === 6, '주거 6개');
  assert(RESIDENCE_TYPES.includes('APARTMENT'), 'APARTMENT 포함');
})();

// Test 2: 평형 5단계
(function() {
  assert(PYEONG_LEVELS.length === 5, '평형 5단계');
  assert(PYEONG_LEVELS.includes(34), '34평');
})();

// Test 3: validate 정상
(function() {
  const g = new G1Type();
  const v = g.validate({ residence: 'APARTMENT', pyeong: 30 });
  assert(v.errors.length === 0, 'validate 통과');
})();

// Test 4: validate 실패 — 미정의 residence
(function() {
  const g = new G1Type();
  const v = g.validate({ residence: 'INVALID', pyeong: 30 });
  assert(v.errors.length > 0, '미정의 residence');
})();

// Test 5: validate 실패 — 미정의 평형
(function() {
  const g = new G1Type();
  const v = g.validate({ residence: 'APARTMENT', pyeong: 999 });
  assert(v.errors.length > 0, '미정의 평형');
})();

// Test 6: lock 정상
(function() {
  const g = new G1Type();
  const r = g.lock({ residence: 'APARTMENT', pyeong: 34 });
  assert(r.ok === true, 'lock 성공');
  assert(r.payload.residence === 'APARTMENT', 'residence');
  assert(r.payload.pyeong === 34, 'pyeong');
  assert(Array.isArray(r.payload.availableSections), 'availableSections 배열');
})();

// Test 7: 단독주택 시 추가 섹션 + 공간
(function() {
  const g = new G1Type();
  const r = g.lock({ residence: 'DETACHED_1F', pyeong: 40 });
  assert(r.payload.availableSections.includes('boiler'), 'boiler 추가');
  assert(r.payload.availableSpaces.includes('YARD'), 'YARD 추가');
})();

console.log('[PASS] G1_Type (7/7)');
