const {
  KPI_FIELDS, emptyKPIData, fromEstimate, format,
  automationFromGates, validateKPIData
} = require('../src/KPIData.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 11항목 정의
(function() {
  assert(KPI_FIELDS.length === 11, '11 항목: ' + KPI_FIELDS.length);
})();

// Test 2: 모든 항목에 key/label/unit/format
(function() {
  KPI_FIELDS.forEach(function(f) {
    assert(f.key && f.label && f.unit && f.format, f.key + ' 속성');
  });
})();

// Test 3: emptyKPIData
(function() {
  const data = emptyKPIData();
  assert(Object.keys(data).length === 11, 'empty 11키');
  assert(data.supply === 0, 'supply 0');
  assert(data.areaSqm === 0, 'areaSqm 0');
})();

// Test 4: fromEstimate 변환
(function() {
  const estimate = {
    supply: 1000, contract: 1500, final: 1650,
    areaSqm: 30, sqmPrice: 55000, pyPrice: 181500, margin: 33.3
  };
  const ctx = { sectionCount: 5, spaceCount: 7, duration: 14, automation: 95 };
  const data = fromEstimate(estimate, ctx);
  assert(data.supply === 1000, 'supply');
  assert(data.sectionCount === 5, 'sectionCount');
  assert(data.automation === 95, 'automation');
})();

// Test 5: format currency
(function() {
  assert(format(1234567, 'currency') === '1,234,567', 'currency');
  assert(format(0, 'currency') === '0', 'currency 0');
})();

// Test 6: format decimal/percent/integer
(function() {
  assert(format(35.5, 'decimal') === '35.5', 'decimal');
  assert(format(13.333, 'percent') === '13.3', 'percent');
  assert(format(14.7, 'integer') === '15', 'integer 반올림');
})();

// Test 7: format null/undefined
(function() {
  assert(format(null, 'currency') === '-', 'null');
  assert(format(undefined, 'currency') === '-', 'undef');
})();

// Test 8: automationFromGates
(function() {
  assert(automationFromGates(0) === 0, '0게이트 = 0%');
  assert(automationFromGates(1) === 30, '1게이트 = 30%');
  assert(automationFromGates(2) === 70, '2게이트 = 70%');
  assert(automationFromGates(3) === 85, '3게이트 = 85%');
  assert(automationFromGates(4) === 95, '4게이트 = 95%');
  assert(automationFromGates(5) === 99, '5게이트 = 99%');
  assert(automationFromGates(99) === 99, '초과해도 99 max');
})();

// Test 9: validateKPIData 정상
(function() {
  const data = emptyKPIData();
  const errors = validateKPIData(data);
  assert(errors.length === 0, 'empty 검증 통과');
})();

// Test 10: validateKPIData 누락 검증
(function() {
  const data = emptyKPIData();
  delete data.supply;
  const errors = validateKPIData(data);
  assert(errors.length > 0, '누락 검증');
})();

console.log('[PASS] KPIData (10/10)');
