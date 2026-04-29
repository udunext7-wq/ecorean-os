const { STATUSES, createPO, transition, toDBRow } = require('../purchase/PurchaseOrder.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

(function() {
  assert(STATUSES.length === 5, '5 상태');
})();

(function() {
  const po = createPO({ contractId: 'c_001', qty: 10, unitPrice: 50000, category: 'flooring', ksCode: 'KS F 3110' });
  assert(po.totalPrice === 500000, '단가 × 수량 자동');
  assert(po.ksCode === 'KS F 3110', 'KS 코드');
  assert(po.status === 'PENDING', '기본 PENDING');
})();

(function() {
  const po = createPO({ contractId: 'c', qty: 1, unitPrice: 100 });
  assert(transition(po, 'ORDERED').ok === true, '주문');
  assert(po.orderedAt > 0, 'orderedAt 자동');
  assert(transition(po, 'DELIVERED').ok === true, '배송');
  assert(transition(po, 'RETURNED').ok === true, '반품');
})();

(function() {
  const po = createPO({ contractId: 'c', qty: 1, unitPrice: 100 });
  assert(transition(po, 'DELIVERED').ok === false, 'PENDING → DELIVERED 차단');
})();

(function() {
  const po = createPO({ contractId: 'c', qty: 5, unitPrice: 1000, isSimulated: true });
  const row = toDBRow(po);
  assert(row.is_simulated === 1, '시뮬 1');
})();

console.log('[PASS] PurchaseOrder (5/5)');
