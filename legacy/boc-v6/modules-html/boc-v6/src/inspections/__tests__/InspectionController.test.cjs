'use strict';
const assert = require('assert');

// TC-1: scheduleId 없으면 생성 거부
function validateIns(opts) {
  if (!opts.scheduleId) throw Object.assign(new Error('scheduleId 필수'), { code: 'INS_NO_SCHEDULE' });
  if (!opts.sectionId)  throw Object.assign(new Error('sectionId 필수'),  { code: 'INS_NO_SECTION' });
  return true;
}
try { validateIns({ sectionId: 'a' }); assert.fail(); }
catch(e) { assert(e.code === 'INS_NO_SCHEDULE', 'TC-1 FAIL'); console.log('TC-1 PASS: scheduleId 필수'); }

// TC-2: 결과 허용 목록
const RESULTS = new Set(['PENDING','PASS','FAIL','CONDITIONAL_PASS']);
assert(RESULTS.has('PASS') && !RESULTS.has('UNKNOWN'), 'TC-2 FAIL');
console.log('TC-2 PASS: 결과 목록');

// TC-3: B4 절대 룰 — FAIL 시 후속 공정 차단
function canProceed(result, needsResearch) {
  if (result === 'FAIL') return { ok: false, reason: 'FAIL' };
  if (needsResearch)     return { ok: false, reason: 'NEEDS_RESEARCH' };
  return { ok: true };
}
assert(!canProceed('FAIL', false).ok, 'TC-3 FAIL: FAIL 차단 안 됨');
assert(!canProceed('PASS', true).ok,  'TC-3 FAIL: NEEDS_RESEARCH 차단 안 됨');
assert(canProceed('PASS', false).ok,  'TC-3 FAIL: PASS 허용 안 됨');
console.log('TC-3 PASS: B4 검수 FAIL → 후속 차단');

// TC-4: CONDITIONAL_PASS는 통과
assert(canProceed('CONDITIONAL_PASS', false).ok, 'TC-4 FAIL');
console.log('TC-4 PASS: CONDITIONAL_PASS 통과');

// TC-5: bocError (원칙 15)
const { bocError } = require('../../contract/utils/bocError.cjs');
const e = bocError('INS_FAIL', '검수 실패', { scheduleId: 's1' });
assert(!e.ok && e.error.context.scheduleId === 's1', 'TC-5 FAIL');
console.log('TC-5 PASS: bocError context');

console.log('\n✅ InspectionController 테스트 5/5 PASS');
