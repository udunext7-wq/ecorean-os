// ECOREAN BOC v5.6 — Edge Schemas
// 자동 생성 대상: scripts/generate-schemas.js (Phase 3 Week 4)
// 현재는 최소 스키마 (통과만). Week 4에서 본 스키마로 교체.

function defineSchema(name) {
  return {
    name: name,
    parse: function(input) {
      if (input === undefined || input === null) {
        throw new Error('Schema ' + name + ': payload required');
      }
      return input;
    },
    safeParse: function(input) {
      try { this.parse(input); return { success: true, data: input }; }
      catch (e) { return { success: false, error: e }; }
    }
  };
}

// 24 엣지 스키마 (graph.json edges[].event와 1:1 매칭)
const SCHEMAS = {
  // 게이트 흐름 (6)
  GATE1_LOCKED:           defineSchema('GATE1_LOCKED'),
  GATE2_LOCKED:           defineSchema('GATE2_LOCKED'),
  GATE3_LOCKED:           defineSchema('GATE3_LOCKED'),
  GATE4_LOCKED:           defineSchema('GATE4_LOCKED'),
  GATE5_LOCKED:           defineSchema('GATE5_LOCKED'),
  SECTIONS_LOCKED:        defineSchema('SECTIONS_LOCKED'),

  // CAD 통신 (3)
  CAD_INIT:               defineSchema('CAD_INIT'),
  SPACE_UPDATED:          defineSchema('SPACE_UPDATED'),

  // 견적 흐름 (3)
  CALC_REQUEST:           defineSchema('CALC_REQUEST'),
  CALC_RESULT:            defineSchema('CALC_RESULT'),
  KPI_UPDATE:             defineSchema('KPI_UPDATE'),

  // 엔진 통신 (4)
  RULES_LOADED:           defineSchema('RULES_LOADED'),
  MASTERDB_UPDATE_REQ:    defineSchema('MASTERDB_UPDATE_REQ'),
  NEW_RULE_PROPOSED:      defineSchema('NEW_RULE_PROPOSED'),
  RULE_APPROVED:          defineSchema('RULE_APPROVED'),

  // AI 임원 (5)
  AI_RECOMMEND:           defineSchema('AI_RECOMMEND'),
  AI_ESCALATION:          defineSchema('AI_ESCALATION'),
  CONTEXT_OBSERVED:       defineSchema('CONTEXT_OBSERVED'),
  RESULT_OBSERVED:        defineSchema('RESULT_OBSERVED'),
  KPI_OBSERVED:           defineSchema('KPI_OBSERVED'),
};

module.exports = { SCHEMAS: SCHEMAS, defineSchema: defineSchema };
