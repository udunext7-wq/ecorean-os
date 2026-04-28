// ECOREAN BOC v5.6 — G2 컨셉 게이트
// 입력: 컨셉 12개  /  자동화율: 30% → 70%

const { Gate } = require('./Gate.cjs');

const CONCEPTS = [
  'SIMPLE_MODERN','MINIMAL_WHITE','CLASSIC_LUXURY','VINTAGE_RETRO',
  'NATURAL_WOOD','SCANDINAVIAN','INDUSTRIAL','ASIAN_ZEN',
  'PROVENCE','CONTEMPORARY','KOREAN_MODERN','SMART_HOME'
];

const GRADE_MUL = {
  MINIMAL_WHITE: 1.0, VINTAGE_RETRO: 1.1, INDUSTRIAL: 1.1,
  SIMPLE_MODERN: 1.2, SCANDINAVIAN: 1.2,
  NATURAL_WOOD: 1.3,  KOREAN_MODERN: 1.3,
  ASIAN_ZEN: 1.4,
  PROVENCE: 1.5,      CONTEMPORARY: 1.6,
  SMART_HOME: 1.7,
  CLASSIC_LUXURY: 1.8
};

class G2Concept extends Gate {
  constructor() {
    super({
      id: 'g2_concept',
      uri: 'urn:ecorean:universe:1:node:g2_concept',
      eventOnLock: 'GATE2_LOCKED',
      dependsOn: 'g1_type'
    });
  }

  validate(input) {
    if (!input) return { errors: ['input 누락'] };
    const errors = [];
    if (!CONCEPTS.includes(input.concept)) {
      errors.push('concept 미정의: ' + input.concept);
    }
    return { errors };
  }

  process(input) {
    return {
      ok: true,
      payload: {
        concept: input.concept,
        gradeMul: GRADE_MUL[input.concept] || 1.0,
        materialDefaults: { concept: input.concept },
        smartHome: input.concept === 'SMART_HOME',
        timestamp: Date.now()
      }
    };
  }
}

module.exports = { G2Concept, CONCEPTS, GRADE_MUL };
