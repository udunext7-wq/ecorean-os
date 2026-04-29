const {
  PHASE_THRESHOLDS, getCurrentPhase,
  countLearningData, computeBasicStatistics
} = require('../MLPhase1.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 4 Phase 정의
(function() {
  assert(Object.keys(PHASE_THRESHOLDS).length === 4, '4 Phase');
})();

// Test 2: Phase 분기
(function() {
  assert(getCurrentPhase(0) === 'PHASE_1_MANUAL', '0건 = Phase 1');
  assert(getCurrentPhase(49) === 'PHASE_1_MANUAL', '49건 = Phase 1');
  assert(getCurrentPhase(50) === 'PHASE_2_STATS', '50건 = Phase 2');
  assert(getCurrentPhase(99) === 'PHASE_2_STATS', '99건 = Phase 2');
  assert(getCurrentPhase(100) === 'PHASE_3_XGBOOST', '100건 = Phase 3');
  assert(getCurrentPhase(499) === 'PHASE_3_XGBOOST', '499건 = Phase 3');
  assert(getCurrentPhase(500) === 'PHASE_4_DEEP', '500건 = Phase 4');
  assert(getCurrentPhase(10000) === 'PHASE_4_DEEP', '대량 = Phase 4');
})();

// Test 3: 시뮬 1건 후 카운트 (scenario_001.cjs 실행 후)
(function() {
  const result = countLearningData({ includeSimulated: true });
  assert(result.simulated >= 1, '시뮬 1건 이상');
  assert(result.phase === 'PHASE_1_MANUAL', 'Phase 1 (49건 이하)');
})();

// Test 4: 실거래만 카운트 — 시뮬 제외
(function() {
  const realOnly = countLearningData({ includeSimulated: false });
  assert(realOnly.simulated === 0, '실거래만 = simulated 0');
  if (realOnly.real === 0) {
    assert(realOnly.phase === 'PHASE_1_MANUAL', '실거래 0 = Phase 1');
  }
})();

// Test 5: 통계 — 시뮬 포함
(function() {
  const stats = computeBasicStatistics({ includeSimulated: true });
  assert(typeof stats.count === 'number', 'count 숫자');
  assert(typeof stats.avgContract === 'number', 'avgContract 숫자');
})();

console.log('[PASS] MLPhase1 (5/5)');
