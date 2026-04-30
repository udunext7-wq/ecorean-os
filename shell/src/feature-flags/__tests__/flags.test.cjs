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
  assert(isEnabled('PHASE_3G_COMPLETE') === true, 'PHASE_3G_COMPLETE Week7 완료 true');
  assert(isEnabled('PHASE_3H_COMPLETE') === true, 'PHASE_3H_COMPLETE Week8 완료');
  assert(isEnabled('PHASE_3I_COMPLETE') === true, 'PHASE_3I_COMPLETE Week9 완료');
  assert(isEnabled('PHASE_3_FULL_COMPLETE') === true, 'Phase 3 9주 전체 완료');
  assert(isEnabled('PHASE_4A_COMPLETE') === true, 'PHASE_4A_COMPLETE Week1 완료');
  assert(isEnabled('USE_BOC_V6_SHELL') === true, 'boc-v6 셸 활성');
  assert(isEnabled('USE_CLOSED_LOOP') === true, 'Closed Loop 활성');
  assert(isEnabled('ML_PHASE_1_ENTRY') === true, 'ML Phase 1 진입');
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

// Test 6: 플래그 수 + Phase 4B + Phase 4C + Phase 4D
(function() {
  const count = Object.keys(FLAGS).length;
  assert(count >= 14, '플래그 14개 이상: ' + count);
  assert(isEnabled('PHASE_4B_COMPLETE') === true, 'PHASE_4B_COMPLETE Week2 완료');
  assert(isEnabled('USE_WIZARD_UI') === true, 'Wizard UI 활성');
  assert(isEnabled('PHASE_4C_COMPLETE') === true, 'PHASE_4C_COMPLETE Week3 완료');
  assert(isEnabled('USE_CAD_CANVAS') === true, 'CAD Canvas 활성');
  assert(isEnabled('PHASE_4D_COMPLETE') === true, 'PHASE_4D_COMPLETE Week4-A 완료');
  assert(isEnabled('USE_COST_LOADER') === true, 'CostLoader 활성');
  assert(isEnabled('USE_GLOBAL_KPI_BAR') === true, '글로벌 KPI 바 활성');
  assert(isEnabled('USE_IPC_BRIDGE') === true, 'IPC Bridge 활성');
  assert(isEnabled('USE_NODE_SPLITTING') === true, '노드 분리 활성');
})();

// Test 7: Phase 4E + 계약/PDF 플래그
(function() {
  assert(isEnabled('PHASE_4E_COMPLETE') === true, 'PHASE_4E_COMPLETE Week5 완료');
  assert(isEnabled('USE_CONTRACT_UI')   === true, '계약 UI 활성');
  assert(isEnabled('USE_ESTIMATE_PDF')  === true, 'PDF 견적서 활성');
})();

// Test 8: Phase 4F + Closed Loop UI 플래그
(function() {
  assert(isEnabled('PHASE_4F_COMPLETE')  === true, 'PHASE_4F_COMPLETE Week6 완료');
  assert(isEnabled('USE_ORDERS_UI')      === true, '발주 UI 활성');
  assert(isEnabled('USE_SCHEDULES_UI')   === true, '공정 UI 활성');
  assert(isEnabled('USE_INSPECTIONS_UI') === true, '검수 UI 활성');
})();

// Test 9: Phase 4G + AI 플래그
(function() {
  assert(isEnabled('PHASE_4G_COMPLETE') === true, 'PHASE_4G_COMPLETE Week7 완료');
  assert(isEnabled('USE_TOPOLOGY_UI')   === true, '토폴로지 UI 활성');
  assert(isEnabled('USE_AI_EXECUTIVE')  === true, 'AI 임원 활성');
  assert(isEnabled('USE_MULTI_AI')      === true, '멀티 AI 활성');
})();

// Test 10: Phase 4H + Critical C2
(function() {
  assert(isEnabled('PHASE_4H_COMPLETE')    === true, 'PHASE_4H_COMPLETE Week8 완료');
  assert(isEnabled('CRITICAL_C2_RESOLVED') === true, 'Critical C2 해결');
  assert(isEnabled('USE_SETTLEMENT_UI')    === true, '정산 UI 활성');
  assert(isEnabled('USE_ML_COUNTER')       === true, 'ML 카운터 활성');
  assert(isEnabled('USE_SLA_MONITOR')      === true, 'SLA 모니터 활성');
})();

// Test 11: Phase 4I + Week 9 완료
(function() {
  assert(isEnabled('PHASE_4I_COMPLETE') === true, 'PHASE_4I Week9 완료');
  assert(isEnabled('USE_README')        === true, 'README 활성');
})();

console.log('[PASS] feature-flags (11/11)');
