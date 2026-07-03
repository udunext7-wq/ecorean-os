const { RESULTS, createInspection, recordResult, canProceedAfter, toDBRow } = require('../inspection/Inspection.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

(function() {
  assert(RESULTS.length === 4, '4 결과 타입');
})();

(function() {
  const i = createInspection({ scheduleId: 's1', sectionId: 'bathroom' });
  assert(i.result === 'PENDING', '기본 PENDING');
  assert(i.needsResearch === false, '기본 false');
})();

(function() {
  const i = createInspection({ scheduleId: 's1', sectionId: 'bathroom' });
  const r = recordResult(i, { result: 'PASS', inspector: '대표님' });
  assert(r.ok === true, 'PASS 기록');
  assert(i.result === 'PASS', '결과 PASS');
  assert(i.inspectedAt > 0, '시점 자동');
})();

// 절대 룰 — PENDING 후속 차단
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'bathroom' });
  const can = canProceedAfter(i);
  assert(can.ok === false, 'PENDING 차단');
})();

// 절대 룰 — FAIL 후속 차단
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'bathroom' });
  recordResult(i, { result: 'FAIL', defects: [{ severity: 'high', desc: '방수 누수' }] });
  const can = canProceedAfter(i);
  assert(can.ok === false, 'FAIL 차단');
  assert(can.reason.includes('실패'), 'reason 명시');
})();

// PASS 후속 진행 가능
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'living' });
  recordResult(i, { result: 'PASS' });
  assert(canProceedAfter(i).ok === true, 'PASS 진행');
})();

// CONDITIONAL_PASS — needsResearch 미해결 차단
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'kitchen' });
  recordResult(i, { result: 'CONDITIONAL_PASS', needsResearch: true });
  assert(canProceedAfter(i).ok === false, 'NEEDS_RESEARCH 차단');
})();

// CONDITIONAL_PASS — needsResearch 해결 진행 가능
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'kitchen' });
  recordResult(i, { result: 'CONDITIONAL_PASS', needsResearch: false });
  assert(canProceedAfter(i).ok === true, '해결 후 진행');
})();

console.log('[PASS] Inspection (8/8)');
