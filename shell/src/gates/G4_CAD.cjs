// ECOREAN BOC v5.6 — G4 CAD 게이트
// 입력: 공간 배열 (id + area_sqm)  /  자동화율: 85% → 95%

const { Gate } = require('./Gate.cjs');

class G4CAD extends Gate {
  constructor() {
    super({
      id: 'g4_cad',
      uri: 'urn:ecorean:universe:1:node:g4_cad',
      eventOnLock: 'GATE4_LOCKED',
      dependsOn: 'g3_section'
    });
  }

  validate(input) {
    const errors = [];
    if (!input || !Array.isArray(input.spaces) || input.spaces.length === 0) {
      errors.push('spaces 1개 이상 필수');
    }
    if (input && input.spaces) {
      input.spaces.forEach(function(s, i) {
        if (!s.id) errors.push('spaces[' + i + '].id 누락');
        if (typeof s.area_sqm !== 'number') errors.push('spaces[' + i + '].area_sqm 누락');
      });
    }
    return { errors };
  }

  process(input) {
    const totalArea = input.spaces.reduce(function(sum, s) { return sum + s.area_sqm; }, 0);
    return {
      ok: true,
      payload: {
        spaces: input.spaces,
        totalAreaSqm: totalArea,
        stage1EstimateReady: true,
        timestamp: Date.now()
      }
    };
  }
}

module.exports = { G4CAD };
