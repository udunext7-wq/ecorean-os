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

  // Phase 3 진행 상태
  PHASE_3A_COMPLETE:      true,
  PHASE_3B_COMPLETE:      true,
  PHASE_3C_COMPLETE:      true,
  PHASE_3D_COMPLETE:      false,
  PHASE_3E_COMPLETE:      false,
  PHASE_3F_COMPLETE:      false,
  PHASE_3G_COMPLETE:      false,

  // 메타 호환 (Week 6)
  META_COMPAT_JSONLD:     false,
  META_COMPAT_RDF:        false,
  META_COMPAT_UNIVERSE:   false,

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
