const {
  KS_CATEGORY_MAP, getKSCategory, getAllCategories,
  getKSCode, lookupByKSCode, isValidKSFormat
} = require('../KSCodeMapping.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 8 카테고리
(function() {
  assert(getAllCategories().length === 8, '8 카테고리: ' + getAllCategories().length);
  assert(getAllCategories().includes('flooring'), 'flooring');
  assert(getAllCategories().includes('plumbing'), 'plumbing');
  assert(getAllCategories().includes('electric'), 'electric');
})();

// Test 2: 각 카테고리에 ks_groups + types
(function() {
  getAllCategories().forEach(function(cat) {
    const c = getKSCategory(cat);
    assert(Array.isArray(c.ks_groups), cat + ' ks_groups');
    assert(typeof c.types === 'object', cat + ' types');
  });
})();

// Test 3: getKSCode 정상
(function() {
  assert(getKSCode('flooring', 'laminate') === 'KS F 3110', '강화마루 KS');
  assert(getKSCode('tile', 'marble') === 'KS L 1106', '대리석 KS');
  assert(getKSCode('electric', 'wire') === 'KS C IEC 60364', 'IEC');
})();

// Test 4: 미정의 조회 null
(function() {
  assert(getKSCode('UNKNOWN', 'X') === null, '미정의 null');
})();

// Test 5: lookupByKSCode 역방향
(function() {
  const results = lookupByKSCode('KS L 1001');
  assert(results.length >= 2, 'KS L 1001은 도자기/자기 2종');
})();

// Test 6: KS 형식 검증
(function() {
  assert(isValidKSFormat('KS F 3110') === true, '표준 형식');
  assert(isValidKSFormat('KS C IEC 60364') === true, 'IEC 형식');
  assert(isValidKSFormat('invalid') === false, '잘못된 형식');
  assert(isValidKSFormat('KS') === false, '미완성');
})();

// Test 7: 모든 정의된 KS 코드가 형식 검증 통과
(function() {
  let total = 0;
  let valid = 0;
  getAllCategories().forEach(function(cat) {
    const c = getKSCategory(cat);
    Object.keys(c.types).forEach(function(t) {
      total++;
      if (isValidKSFormat(c.types[t].ks)) valid++;
    });
  });
  assert(total === valid, '모든 KS 코드 형식 통과: ' + valid + '/' + total);
})();

console.log('[PASS] KSCodeMapping (7/7)');
