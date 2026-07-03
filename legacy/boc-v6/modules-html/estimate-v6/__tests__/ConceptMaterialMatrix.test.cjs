const {
  CONCEPT_MATERIAL_MAP, getConcept, getAllConcepts,
  getMaterialKeyword, getGradeMul
} = require('../src/matrices/ConceptMaterialMatrix.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 12 컨셉
(function() {
  assert(getAllConcepts().length === 12, '12 컨셉: ' + getAllConcepts().length);
})();

// Test 2: 가산 배수 — 클래식 가장 높음
(function() {
  assert(getGradeMul('CLASSIC_LUXURY') === 1.8, '클래식 1.8');
  assert(getGradeMul('MINIMAL_WHITE') === 1.0, '미니멀 1.0 기준');
  assert(getGradeMul('SMART_HOME') === 1.7, '스마트 1.7');
})();

// Test 3: 자재 카테고리 7개 (모든 컨셉)
(function() {
  getAllConcepts().forEach(function(id) {
    const c = getConcept(id);
    const cats = Object.keys(c.materials);
    assert(cats.length === 7, id + ' 7카테고리');
    assert(cats.includes('flooring'), 'flooring');
    assert(cats.includes('lighting'), 'lighting');
  });
})();

// Test 4: 클래식 자재
(function() {
  const flooring = getMaterialKeyword('CLASSIC_LUXURY', 'flooring');
  assert(flooring.includes('월넛'), '클래식 월넛');
})();

// Test 5: 스마트홈 IoT 플래그
(function() {
  const smart = getConcept('SMART_HOME');
  assert(smart.iot === true, '스마트홈 IoT');
  const classic = getConcept('CLASSIC_LUXURY');
  assert(!classic.iot, '클래식 IoT 없음');
})();

// Test 6: 12 × 7 = 84 자재 매핑
(function() {
  let total = 0;
  getAllConcepts().forEach(function(id) {
    total += Object.keys(getConcept(id).materials).length;
  });
  assert(total === 84, '12×7 = 84 매핑: 실제 ' + total);
})();

// Test 7: 미정의 조회 null
(function() {
  assert(getConcept('UNDEFINED') === null, '미정의 null');
  assert(getMaterialKeyword('UNDEFINED', 'flooring') === null, '미정의 자재 null');
})();

console.log('[PASS] ConceptMaterialMatrix (7/7)');
