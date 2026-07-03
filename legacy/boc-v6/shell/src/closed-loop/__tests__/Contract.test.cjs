const { STATUSES, createContract, toDBRow, transition, validateContract } = require('../contract/Contract.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 4 상태
(function() {
  assert(STATUSES.length === 4, '4 상태');
  assert(STATUSES.includes('DRAFT'), 'DRAFT');
  assert(STATUSES.includes('SIGNED'), 'SIGNED');
})();

// Test 2: createContract 기본
(function() {
  const c = createContract({ estimateId: 'est_001', totalAmount: 15000000 });
  assert(c.id.startsWith('contract_'), 'id 자동');
  assert(c.totalAmount === 15000000, 'total');
  assert(c.vatAmount === 1500000, 'VAT 자동 ×0.10');
  assert(c.finalAmount === 16500000, 'final 자동');
  assert(c.status === 'DRAFT', '기본 DRAFT');
  assert(c.isSimulated === false, '기본 실거래');
})();

// Test 3: 시뮬 플래그
(function() {
  const c = createContract({ estimateId: 'est_x', totalAmount: 1000000, isSimulated: true });
  assert(c.isSimulated === true, '시뮬 명시');
})();

// Test 4: 누락 throw
(function() {
  let threw = false;
  try { createContract({}); } catch(e) { threw = true; }
  assert(threw, 'estimateId 누락 throw');
})();

// Test 5: 상태 전이 — DRAFT → SIGNED
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  const r = transition(c, 'SIGNED');
  assert(r.ok === true, 'DRAFT → SIGNED');
  assert(c.status === 'SIGNED', '상태');
  assert(c.signedAt > 0, 'signedAt 자동');
})();

// Test 6: 상태 전이 — SIGNED → COMPLETED
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  transition(c, 'SIGNED');
  const r = transition(c, 'COMPLETED');
  assert(r.ok === true, 'SIGNED → COMPLETED');
})();

// Test 7: 잘못된 전이
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  const r = transition(c, 'COMPLETED');
  assert(r.ok === false, 'DRAFT → COMPLETED 차단');
})();

// Test 8: CANCELED 어디서든 가능
(function() {
  const c1 = createContract({ estimateId: 'e', totalAmount: 1000 });
  assert(transition(c1, 'CANCELED').ok === true, 'DRAFT → CANCELED');

  const c2 = createContract({ estimateId: 'e', totalAmount: 1000 });
  transition(c2, 'SIGNED');
  assert(transition(c2, 'CANCELED').ok === true, 'SIGNED → CANCELED');
})();

// Test 9: toDBRow + 암호화
(function() {
  const c = createContract({
    estimateId: 'est_001', totalAmount: 1000000,
    customerName: '홍길동', customerPhone: '010-1234-5678', customerAddress: '서울시 강남구'
  });
  const row = toDBRow(c, 'test-key');
  assert(row.customer_name_enc !== '홍길동', '이름 암호화');
  assert(row.customer_phone_hash.length === 64, '전화 해시');
  assert(row.customer_address_enc.length > 0, '주소 암호화');
  assert(row.is_simulated === 0, '실거래 0');
})();

// Test 10: validateContract
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  assert(validateContract(c).length === 0, '정상 검증');
  assert(validateContract({}).length > 0, '빈 객체 에러');
})();

console.log('[PASS] Contract (10/10)');
