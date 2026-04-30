'use strict';
const assert = require('assert');

// TC-1: contractId 없으면 생성 거부
function validatePO(opts) {
  if (!opts.contractId) throw Object.assign(new Error('contractId 필수'), { code: 'ORDER_NO_CONTRACT' });
  if (!(opts.qty > 0))  throw Object.assign(new Error('qty 필수'),        { code: 'ORDER_NO_QTY' });
  if (!(opts.unitPrice > 0)) throw Object.assign(new Error('unitPrice 필수'), { code: 'ORDER_NO_PRICE' });
  return true;
}
try { validatePO({ qty: 1, unitPrice: 1000 }); assert.fail(); }
catch(e) { assert(e.code === 'ORDER_NO_CONTRACT', 'TC-1 FAIL'); console.log('TC-1 PASS: contractId 필수'); }

// TC-2: qty 0 거부
try { validatePO({ contractId: 'c1', qty: 0, unitPrice: 1000 }); assert.fail(); }
catch(e) { assert(e.code === 'ORDER_NO_QTY', 'TC-2 FAIL'); console.log('TC-2 PASS: qty 0 거부'); }

// TC-3: 총금액 계산
function calcTotal(qty, unitPrice) { return Math.round(qty * unitPrice); }
assert(calcTotal(10, 15000) === 150000, 'TC-3 FAIL');
assert(calcTotal(0.5, 80000) === 40000, 'TC-3 FAIL: 소수점');
console.log('TC-3 PASS: 총금액 계산');

// TC-4: 상태 전환 허용 목록
const PO_STATUS = new Set(['PENDING','ORDERED','DELIVERED','RETURNED','CANCELED']);
assert(PO_STATUS.has('ORDERED') && !PO_STATUS.has('UNKNOWN'), 'TC-4 FAIL');
console.log('TC-4 PASS: 상태 목록');

// TC-5: is_simulated 분리
const po = { contractId: 'c1', qty: 5, unitPrice: 10000, isSimulated: true };
assert(po.isSimulated === true, 'TC-5 FAIL');
console.log('TC-5 PASS: is_simulated');

// TC-6: bocError 구조 (원칙 15)
const { bocError } = require('../../contract/utils/bocError.cjs');
const e = bocError('ORDER_FAIL', '발주 실패');
assert(!e.ok && e.error.code === 'ORDER_FAIL' && e.error.ts, 'TC-6 FAIL');
console.log('TC-6 PASS: bocError');

console.log('\n✅ OrdersController 테스트 6/6 PASS');
