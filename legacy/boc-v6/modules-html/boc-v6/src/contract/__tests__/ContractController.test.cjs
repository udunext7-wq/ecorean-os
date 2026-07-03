const { ContractController } = require('../ContractController.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

const mockEstimate = {
  id: 'est_test_001',
  supply: 7000000,
  contract: 8500000,
  final: 9350000,
  margin: 17.6,
  areaSqm: 66.0,
  sqmPrice: 141666,
  pyPrice: 468333,
  factors: { baseFactor: 1.0, gradeMul: 1.2, occupied: false, elevator: false }
};

// Test 1: getSummary 구조 확인
(function() {
  const cc = new ContractController({ estimate: mockEstimate });
  const s = cc.getSummary();
  assert(s.contractAmount === 8500000, 'getSummary contractAmount');
  assert(s.vatAmount === 850000, 'getSummary vatAmount = 10%');
  assert(s.finalAmount === 9350000, 'getSummary finalAmount');
  assert(s.supply === 7000000, 'getSummary supply');
  assert(typeof s.margin === 'number', 'getSummary margin');
  assert(s.areaSqm === 66.0, 'getSummary areaSqm');
})();

// Test 2: createDraft - 유효한 고객 정보
(async function() {
  const cc = new ContractController({ estimate: mockEstimate });
  const r = await cc.createDraft({ customerName: '홍길동', customerPhone: '010-1234-5678', customerAddress: '서울시 강남구' });
  assert(r.ok === true, '계약 초안 생성 성공');
  assert(r.contract.totalAmount === 8500000, 'totalAmount = estimate.contract (VAT 전)');
  assert(r.contract.vatAmount === 850000, 'vatAmount = 10%');
  assert(r.contract.finalAmount === 9350000, 'finalAmount = total + vat');
  assert(r.contract.status === 'DRAFT', 'status DRAFT');
  assert(r.contract.customerName === '홍길동', 'customerName 저장');
  assert(typeof r.contract.id === 'string' && r.contract.id.length > 0, 'id 생성됨');
})().then(() => {}).catch(e => { console.error('[FAIL] Test 2:', e.message); process.exit(1); });

// Test 3: createDraft - 이름 누락 → 실패
(async function() {
  const cc = new ContractController({ estimate: mockEstimate });
  const r = await cc.createDraft({ customerName: '', customerPhone: '010-0000-0000', customerAddress: '' });
  assert(r.ok === false, '이름 없으면 실패');
  assert(Array.isArray(r.errors) && r.errors.length > 0, '에러 배열');
})().then(() => {}).catch(e => { console.error('[FAIL] Test 3:', e.message); process.exit(1); });

// Test 4: sign() - DRAFT → SIGNED
(async function() {
  const cc = new ContractController({ estimate: mockEstimate });
  await cc.createDraft({ customerName: '홍길동', customerPhone: '010-1234-5678', customerAddress: '서울시' });
  const r = cc.sign();
  assert(r.ok === true, 'DRAFT → SIGNED');
  assert(cc.contract.status === 'SIGNED', 'status SIGNED');
  assert(typeof cc.contract.signedAt === 'number', 'signedAt 타임스탬프');
})().then(() => {}).catch(e => { console.error('[FAIL] Test 4:', e.message); process.exit(1); });

// Test 5: sign() - 계약 없이 서명 시도
(function() {
  const cc = new ContractController({ estimate: mockEstimate });
  const r = cc.sign();
  assert(r.ok === false, '계약 없이 서명 불가');
  assert(r.error, '에러 메시지');
})();

// Test 6: subscribe 이벤트
(async function() {
  const cc = new ContractController({ estimate: mockEstimate });
  let evtReceived = null;
  cc.subscribe((evt) => { evtReceived = evt; });
  await cc.createDraft({ customerName: '홍길동', customerPhone: '010-1234-5678', customerAddress: '서울시' });
  assert(evtReceived === 'CONTRACT_CREATED', 'CONTRACT_CREATED 이벤트 발생');
})().then(() => {}).catch(e => { console.error('[FAIL] Test 6:', e.message); process.exit(1); });

setTimeout(() => console.log('[PASS] ContractController (6/6)'), 50);
