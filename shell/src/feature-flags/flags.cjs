// ECOREAN BOC v5.6 — Feature Flags
// 절대 규칙: 신기능은 모두 플래그 뒤에 둔다. 13단계 디자인과 충돌 차단.

const FLAGS = {
  // v5.6 그래프 아키텍처
  USE_CORE_BUS:           false,
  STRICT_SCHEMA:          false,
  USE_CASCADE_GATES:      false,
  USE_AI_EXECUTIVE:       false,

  // CAD 모듈 분리 (Week 2)
  USE_CAD_MODULE:         false,

  // 견적 모듈 v6 (Week 4 — Week 8 첫 시공 검증 후 활성화)
  USE_ESTIMATE_V6:        false,

  // KPI 모듈 v6 (Week 5 — Week 8 첫 시공 검증 후 활성화)
  USE_KPI_V6:             false,

  // Phase 3 진행 상태
  PHASE_3A_COMPLETE:      true,
  PHASE_3B_COMPLETE:      true,
  PHASE_3C_COMPLETE:      true,
  PHASE_3D_COMPLETE:      true,
  PHASE_3E_COMPLETE:      true,
  PHASE_3F_COMPLETE:      true,
  PHASE_3G_COMPLETE:      true,
  PHASE_3H_COMPLETE:      true,
  PHASE_3I_COMPLETE:      true,
  PHASE_3_FULL_COMPLETE:  true,
  USE_CLOSED_LOOP:        true,
  ML_PHASE_1_ENTRY:       true,

  // 메타 호환 (Week 6)
  META_COMPAT_JSONLD:     true,
  META_COMPAT_RDF:        true,
  META_COMPAT_UNIVERSE:   true,

  // Phase 4 진행 상태
  PHASE_4A_COMPLETE:      true,
  PHASE_4B_COMPLETE:      true,
  USE_WIZARD_UI:          true,
  PHASE_4C_COMPLETE:      true,
  USE_CAD_CANVAS:         true,
  PHASE_4D_COMPLETE:      true,
  USE_COST_LOADER:        true,
  USE_GLOBAL_KPI_BAR:     true,
  USE_KPI_DASHBOARD:      true,
  USE_IPC_BRIDGE:         true,
  USE_NODE_SPLITTING:     true,
  PHASE_4E_COMPLETE:      true,   // Week 5: 계약 화면 + PDF
  USE_CONTRACT_UI:        true,
  USE_ESTIMATE_PDF:       true,
  PHASE_4F_COMPLETE:      false,
  PHASE_4G_COMPLETE:      false,
  PHASE_4H_COMPLETE:      false,
  PHASE_4I_COMPLETE:      false,

  // boc-v6 셸 (Week 1)
  USE_BOC_V6_SHELL:       true,

  // 디버그
  VERBOSE_LOG:            false,
  AUDIT_LOG_ENABLED:      true
};

function isEnabled(name) {
  return !!FLAGS[name];
}

function setFlag(name, value) {
  if (!(name in FLAGS)) {
    console.warn('[FeatureFlag] Unknown flag:', name);
    return false;
  }
  FLAGS[name] = !!value;
  return true;
}

function getAllFlags() {
  return Object.assign({}, FLAGS);
}

module.exports = { FLAGS: FLAGS, isEnabled: isEnabled, setFlag: setFlag, getAllFlags: getAllFlags };
