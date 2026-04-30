'use strict';
const assert = require('assert');

// TC-1: 견적 vs 실투입 비교 계산
function calcVariance(estimated, actual) {
  const diff  = actual - estimated;
  const ratio = estimated > 0 ? ((diff / estimated) * 100).toFixed(1) : 0;
  return { estimated, actual, diff, ratio: Number(ratio),
           status: diff > 0 ? 'OVER' : diff < 0 ? 'UNDER' : 'ON_BUDGET' };
}

const r = calcVariance(16735950, 17200000);
assert(r.diff === 464050,   'TC-1 FAIL: diff');
assert(r.status === 'OVER', 'TC-1 FAIL: status');
assert(r.ratio > 0,         'TC-1 FAIL: ratio');
console.log('TC-1 PASS: 견적 vs 실투입');

// TC-2: 예산 초과 감지
function isOverBudget(variance, threshold = 10) {
  return variance.ratio > threshold;
}
assert(!isOverBudget(r, 10),              'TC-2 FAIL: 2.7% < 10%');
assert(isOverBudget({ ratio: 15 }, 10),   'TC-2 FAIL: 15% > 10%');
console.log('TC-2 PASS: 예산 초과 감지');

// TC-3: ML 단계 판단
function getMLPhase(count) {
  if (count >= 500) return 'DL';
  if (count >= 100) return 'XGBoost';
  if (count >= 50)  return 'Statistics';
  return 'Manual';
}
assert(getMLPhase(0)   === 'Manual',     'TC-3 FAIL');
assert(getMLPhase(50)  === 'Statistics', 'TC-3 FAIL');
assert(getMLPhase(100) === 'XGBoost',    'TC-3 FAIL');
assert(getMLPhase(500) === 'DL',         'TC-3 FAIL');
console.log('TC-3 PASS: ML 단계');

// TC-4: SLA 통과 여부
function checkSLA(elapsed, maxMs) { return { ok: elapsed <= maxMs, elapsed, maxMs }; }
assert(checkSLA(80, 100).ok,    'TC-4 FAIL');
assert(!checkSLA(150, 100).ok,  'TC-4 FAIL');
console.log('TC-4 PASS: SLA 체크');

// TC-5: bocError
const { bocError } = require('../../contract/utils/bocError.cjs');
const e = bocError('SETTLEMENT_FAIL', '정산 실패');
assert(!e.ok && e.error.ts, 'TC-5 FAIL');
console.log('TC-5 PASS: bocError');

console.log('\n✅ Settlement 테스트 5/5 PASS');
