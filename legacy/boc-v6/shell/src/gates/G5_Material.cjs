// ECOREAN BOC v5.6 — G5 자재 게이트
// 입력: 자재 배열  /  자동화율: 95% → 99%  (옵션 게이트)

const { Gate } = require('./Gate.cjs');

class G5Material extends Gate {
  constructor() {
    super({
      id: 'g5_material',
      uri: 'urn:ecorean:universe:1:node:g5_material',
      eventOnLock: 'GATE5_LOCKED',
      dependsOn: 'g4_cad'
    });
  }

  validate(input) {
    const errors = [];
    if (!input || !Array.isArray(input.materials)) {
      errors.push('materials 배열 필수');
    }
    return { errors };
  }

  process(input) {
    return {
      ok: true,
      payload: {
        materials: input.materials,
        stage2EstimateReady: true,
        timestamp: Date.now()
      }
    };
  }
}

module.exports = { G5Material };
