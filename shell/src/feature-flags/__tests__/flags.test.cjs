const { isEnabled, setFlag, getAllFlags, FLAGS } = require('../flags.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 기본값 — 핵심 v5.6 플래그 확인
(function() {
  assert(isEnabled('USE_CORE_BUS') === false, 'USE_CORE_BUS 기본 false');
  assert(isEnabled('USE_CASCADE_GATES') === false, 'USE_CASCADE_GATES 기본 false');
  assert(isEnabled('PHASE_3A_COMPLETE') === true, 'PHASE_3A_COMPLETE Week1 완료 true');
  assert(isEnabled('PHASE_3B_COMPLETE') === true, 'PHASE_3B_COMPLETE Week2 완료 true');
  assert(isEnabled('PHASE_3C_COMPLETE') === true, 'PHASE_3C_COMPLETE Week3 완료 true');
  assert(isEnabled('PHASE_3D_COMPLETE') === true, 'PHASE_3D_COMPLETE Week4 완료 true');
  assert(isEnabled('PHASE_3E_COMPLETE') === true, 'PHASE_3E_COMPLETE Week5 완료 true');
  assert(isEnabled('PHASE_3F_COMPLETE') === true, 'PHASE_3F_COMPLETE Week6 완료 true');
  assert(isEnabled('META_COMPAT_JSONLD') === true, 'JSON-LD 활성');
  assert(isEnabled('META_COMPAT_RDF') === true, 'RDF 활성');
  assert(isEnabled('META_COMPAT_UNIVERSE') === true, 'Universe 활성');
})();

// Test 2: AUDIT_LOG_ENABLED 기본 true
(function() {
  assert(isEnabled('AUDIT_LOG_ENABLED') === true, 'AUDIT_LOG_ENABLED 기본 true');
})();

// Test 3: setFlag 작동
(function() {
  setFlag('USE_CORE_BUS', true);
  assert(isEnabled('USE_CORE_BUS') === true, 'setFlag true');
  setFlag('USE_CORE_BUS', false);
  assert(isEnabled('USE_CORE_BUS') === false, 'setFlag false');
})();

// Test 4: 미정의 플래그 setFlag 거부
(function() {
  const result = setFlag('UNKNOWN_FLAG', true);
  assert(result === false, '미정의 플래그 거부');
})();

// Test 5: getAllFlags 정상
(function() {
  const all = getAllFlags();
  assert(typeof all === 'object', 'getAllFlags 객체 반환');
  assert('USE_CORE_BUS' in all, 'USE_CORE_BUS 포함');
  assert('PHASE_3A_COMPLETE' in all, 'PHASE_3A_COMPLETE 포함');
})();

// Test 6: 플래그 수 (17개 정의)
(function() {
  const count = Object.keys(FLAGS).length;
  assert(count >= 14, '플래그 14개 이상: ' + count);
})();

console.log('[PASS] feature-flags (6/6)');
