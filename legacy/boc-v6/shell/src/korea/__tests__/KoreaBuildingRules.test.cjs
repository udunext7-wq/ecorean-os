const {
  RULES, getRule, getAllRuleIds,
  getRulesForSpace, getRulesForSection, getRulesForResidence,
  evaluateAutoRules, getConditionalRules
} = require('../KoreaBuildingRules.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 7 룰
(function() {
  assert(getAllRuleIds().length === 7, '7 룰');
})();

// Test 2: 방수 = CONDITIONAL (절대 룰: AUTO 금지)
(function() {
  const r = getRule('WATERPROOF');
  assert(r.type === 'CONDITIONAL', '방수 CONDITIONAL');
  assert(r.requires.includes('NEEDS_CONFIRMATION'), '확인 필수');
})();

// Test 3: 욕실 → 방수 + 환기 룰
(function() {
  const rules = getRulesForSpace('BATHROOM');
  const ids = rules.map(function(r) { return r.id; });
  assert(ids.includes('WATERPROOF'), '욕실 방수');
  assert(ids.includes('VENTILATION_MECH'), '욕실 환기');
})();

// Test 4: 단독주택 → 외장 단열재
(function() {
  const rules = getRulesForResidence('DETACHED_1F');
  const ids = rules.map(function(r) { return r.id; });
  assert(ids.includes('EXTERIOR_INSULATION'), '단독 외장 단열');
})();

// Test 5: 4층 무엘 — AUTO 양중
(function() {
  const auto = evaluateAutoRules({ floorLevel: 5, hasElev: false, occupied: false });
  const ids = auto.map(function(r) { return r.id; });
  assert(ids.includes('HEIGHT_LIFTING'), '양중 자동');
  const lift = auto.find(function(r) { return r.id === 'HEIGHT_LIFTING'; });
  assert(lift.factor === 1.05, '양중 ×1.05');
})();

// Test 6: 4층 엘리베이터 있음 — 양중 미적용
(function() {
  const auto = evaluateAutoRules({ floorLevel: 5, hasElev: true });
  const ids = auto.map(function(r) { return r.id; });
  assert(!ids.includes('HEIGHT_LIFTING'), '엘 있으면 양중 X');
})();

// Test 7: 거주중 — AUTO 가산
(function() {
  const auto = evaluateAutoRules({ floorLevel: 1, hasElev: true, occupied: true });
  const ids = auto.map(function(r) { return r.id; });
  assert(ids.includes('OCCUPIED_SURCHARGE'), '거주 가산');
  const occ = auto.find(function(r) { return r.id === 'OCCUPIED_SURCHARGE'; });
  assert(occ.factor === 1.10, '거주 ×1.10');
})();

// Test 8: CONDITIONAL 룰 자동 추출
(function() {
  const conditional = getConditionalRules(
    ['BATHROOM','KITCHEN'],
    ['electric','plumbing'],
    'APARTMENT'
  );
  const ruleIds = conditional.map(function(c) { return c.rule.id; });
  assert(ruleIds.includes('WATERPROOF'), '욕실 방수 추출');
  assert(ruleIds.includes('GAS_INSTALLATION'), '주방 가스 추출');
  assert(ruleIds.includes('LICENSED_TRADES'), '전기/배관 자격 추출');
})();

// Test 9: 절대 룰 — 방수 AUTO 금지
(function() {
  const wp = getRule('WATERPROOF');
  assert(wp.type !== 'AUTO', '방수 AUTO 금지 (절대 룰)');
})();

// Test 10: 모든 룰에 legal 명시
(function() {
  getAllRuleIds().forEach(function(id) {
    const r = getRule(id);
    assert(typeof r.legal === 'string' && r.legal.length > 0, id + ' legal 명시');
  });
})();

console.log('[PASS] KoreaBuildingRules (10/10)');
