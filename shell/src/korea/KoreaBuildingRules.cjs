// ECOREAN BOC v5.6 — 한국 건축법 특수 룰
const RULES = {
  WATERPROOF: {
    id: 'WATERPROOF',
    name: '방수 처리',
    spaces: ['BATHROOM','POWDER_ROOM','BALCONY','TERRACE','ROOFTOP','BASEMENT','UTILITY'],
    type: 'CONDITIONAL',
    requires: ['NEEDS_CONFIRMATION'],
    legal: '건축법 시행령 제51조 (방수 의무)'
  },
  EXTERIOR_INSULATION: {
    id: 'EXTERIOR_INSULATION',
    name: '외장 단열재',
    residences: ['DETACHED_1F','DETACHED_2F','PENTHOUSE'],
    type: 'CONDITIONAL',
    requires: ['HEAT_LOSS_SPEC'],
    legal: '에너지절약설계기준 (KAEC)'
  },
  GAS_INSTALLATION: {
    id: 'GAS_INSTALLATION',
    name: '가스 시공',
    spaces: ['KITCHEN','BOILER'],
    type: 'CONDITIONAL',
    requires: ['LICENSED_INSTALLER','VENTILATION'],
    legal: '도시가스사업법'
  },
  VENTILATION_MECH: {
    id: 'VENTILATION_MECH',
    name: '기계환기',
    spaces: ['BATHROOM','POWDER_ROOM','KITCHEN','BOILER','UTILITY','GARAGE'],
    type: 'CONDITIONAL',
    requires: ['VENT_SPEC'],
    legal: '건축물의 설비기준 등에 관한 규칙'
  },
  HEIGHT_LIFTING: {
    id: 'HEIGHT_LIFTING',
    name: '양중비 (4층 이상 무엘리베이터)',
    condition: function(ctx) {
      return ctx.floorLevel >= 4 && !ctx.hasElev;
    },
    type: 'AUTO',
    factor: 1.05,
    legal: '산업안전보건법 (작업환경)'
  },
  OCCUPIED_SURCHARGE: {
    id: 'OCCUPIED_SURCHARGE',
    name: '거주중 시공',
    condition: function(ctx) {
      return ctx.occupied === true;
    },
    type: 'AUTO',
    factor: 1.10,
    legal: '주거안정 보호 (가구 보양/이동 비용)'
  },
  LICENSED_TRADES: {
    id: 'LICENSED_TRADES',
    name: '자격 시공',
    sections: ['electric','plumbing'],
    type: 'CONDITIONAL',
    requires: ['LICENSED_CONTRACTOR'],
    legal: '건설산업기본법'
  }
};

function getRule(id) {
  return RULES[id] || null;
}

function getAllRuleIds() {
  return Object.keys(RULES);
}

function getRulesForSpace(spaceKey) {
  const result = [];
  Object.keys(RULES).forEach(function(id) {
    const r = RULES[id];
    if (r.spaces && r.spaces.includes(spaceKey)) {
      result.push(r);
    }
  });
  return result;
}

function getRulesForSection(sectionId) {
  const result = [];
  Object.keys(RULES).forEach(function(id) {
    const r = RULES[id];
    if (r.sections && r.sections.includes(sectionId)) {
      result.push(r);
    }
  });
  return result;
}

function getRulesForResidence(residence) {
  const result = [];
  Object.keys(RULES).forEach(function(id) {
    const r = RULES[id];
    if (r.residences && r.residences.includes(residence)) {
      result.push(r);
    }
  });
  return result;
}

function evaluateAutoRules(context) {
  const applied = [];
  Object.keys(RULES).forEach(function(id) {
    const r = RULES[id];
    if (r.type === 'AUTO' && typeof r.condition === 'function') {
      if (r.condition(context)) {
        applied.push({ id: id, name: r.name, factor: r.factor, legal: r.legal });
      }
    }
  });
  return applied;
}

function getConditionalRules(spaces, sections, residence) {
  const result = [];
  spaces.forEach(function(s) {
    getRulesForSpace(s).forEach(function(r) {
      if (r.type === 'CONDITIONAL') result.push({ rule: r, space: s });
    });
  });
  sections.forEach(function(sec) {
    getRulesForSection(sec).forEach(function(r) {
      if (r.type === 'CONDITIONAL') result.push({ rule: r, section: sec });
    });
  });
  if (residence) {
    getRulesForResidence(residence).forEach(function(r) {
      if (r.type === 'CONDITIONAL') result.push({ rule: r, residence: residence });
    });
  }
  return result;
}

module.exports = {
  RULES: RULES,
  getRule: getRule,
  getAllRuleIds: getAllRuleIds,
  getRulesForSpace: getRulesForSpace,
  getRulesForSection: getRulesForSection,
  getRulesForResidence: getRulesForResidence,
  evaluateAutoRules: evaluateAutoRules,
  getConditionalRules: getConditionalRules
};
