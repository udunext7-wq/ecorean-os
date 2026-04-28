const {
  RESIDENCES, PYEONG_PRESETS, getResidence, getPreset,
  getAllResidences, getAllPyeongs
} = require('../src/matrices/ResidenceMatrix.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 6 주거형태
(function() {
  assert(getAllResidences().length === 6, '6 주거형태');
})();

// Test 2: 5 평형
(function() {
  assert(getAllPyeongs().length === 5, '5 평형');
})();

// Test 3: 단독주택 외장
(function() {
  assert(getResidence('DETACHED_1F').exterior === true, '단독 외장');
  assert(getResidence('APARTMENT').exterior === false, '아파트 외장 없음');
})();

// Test 4: 단독 복층 multiFloor
(function() {
  assert(getResidence('DETACHED_2F').multiFloor === true, '복층 multi');
  assert(getResidence('DETACHED_1F').multiFloor === false, '단층 single');
})();

// Test 5: 평형 매핑
(function() {
  assert(getPreset(34).sqm === 112, '34평 112㎡');
  assert(getPreset(34).spaces === 13, '34평 13공간');
})();

// Test 6: baseFactor — 펜트가 가장 높음
(function() {
  assert(getResidence('PENTHOUSE').baseFactor === 1.25, '펜트 1.25');
  assert(getResidence('COMMERCIAL').baseFactor === 0.95, '상가 0.95');
})();

console.log('[PASS] ResidenceMatrix (6/6)');
