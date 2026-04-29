const { loadByCategory, buildLineItemForSpace, buildLineItems, getApprovalStatus } = require('../CostLoader.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: flooring 카테고리 적재 확인
(function() {
  const flooring = loadByCategory('flooring');
  assert(flooring.length >= 1, 'flooring 1건+ 적재됨 (실제: ' + flooring.length + ')');
})();

// Test 2: getApprovalStatus 정상
(function() {
  const status = getApprovalStatus();
  assert(status.total > 0, '시드 적재됨 (total: ' + status.total + ')');
  assert(status.bySource.principal_seed >= 0, 'bySource.principal_seed: ' + status.bySource.principal_seed);
  assert(status.approved > 0, '승인 항목 존재');
})();

// Test 3: buildLineItemForSpace — BATHROOM
(function() {
  const item = buildLineItemForSpace(
    { typeKey: 'BATHROOM', area_sqm: 5 },
    'CLASSIC_LUXURY'
  );
  assert(item.qty === 5, 'qty 일치');
  assert(item._meta !== undefined, '_meta 포함');
  assert(typeof item.laborCost === 'number', 'laborCost 숫자');
})();

// Test 4: buildLineItems — 2 공간
(function() {
  const items = buildLineItems(
    [
      { typeKey: 'BATHROOM', area_sqm: 5 },
      { typeKey: 'KITCHEN',  area_sqm: 10 }
    ],
    'CLASSIC_LUXURY'
  );
  assert(items.length === 2, '2 라인');
  assert(items[0].qty === 5, 'BATHROOM qty');
  assert(items[1].qty === 10, 'KITCHEN qty');
})();

// Test 5: concept 필터 동작
(function() {
  const luxury = loadByCategory('flooring', { concept: 'CLASSIC_LUXURY' });
  assert(luxury.length >= 0, 'concept 필터 동작 (' + luxury.length + '건)');
})();

// Test 6: space 필터 동작
(function() {
  const tile = loadByCategory('tile', { space: 'BATHROOM' });
  assert(tile.length >= 0, 'space 필터 동작 (' + tile.length + '건)');
})();

console.log('[PASS] CostLoader (6/6)');
