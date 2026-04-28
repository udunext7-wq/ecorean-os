// ECOREAN BOC v5.6 — G3 섹션 게이트
// 입력: 시공 섹션 다중선택  /  자동화율: 70% → 85%

const { Gate } = require('./Gate.cjs');

const SECTION_SPACE_MAP = {
  bathroom: ['BATHROOM'],
  kitchen:  ['KITCHEN'],
  living:   ['LIVING'],
  bedroom:  ['MASTER_BEDROOM','BEDROOM'],
  balcony:  ['BALCONY'],
  entrance: ['ENTRANCE'],
  dressing: ['DRESSING'],
  study:    ['STUDY'],
  dining:   ['DINING'],
  pantry:   ['PANTRY'],
  utility:  ['UTILITY'],
  powder:   ['POWDER_ROOM'],
  boiler:   ['BOILER'],
  hallway:  ['HALLWAY'],
  stairs:   ['STAIRS']
};

class G3Section extends Gate {
  constructor() {
    super({
      id: 'g3_section',
      uri: 'urn:ecorean:universe:1:node:g3_section',
      eventOnLock: 'GATE3_LOCKED',
      dependsOn: 'g2_concept'
    });
  }

  validate(input) {
    const errors = [];
    if (!input || !Array.isArray(input.sections) || input.sections.length === 0) {
      errors.push('sections 1개 이상 필수');
    }
    return { errors };
  }

  process(input) {
    const result = new Set();
    input.sections.forEach(function(sec) {
      (SECTION_SPACE_MAP[sec] || []).forEach(function(s) { result.add(s); });
    });
    return {
      ok: true,
      payload: {
        sections: input.sections,
        autoSpaces: Array.from(result),
        timestamp: Date.now()
      }
    };
  }
}

module.exports = { G3Section, SECTION_SPACE_MAP };
