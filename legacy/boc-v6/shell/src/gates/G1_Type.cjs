// ECOREAN BOC v5.6 — G1 유형 게이트
// 입력: 주거형태(6) + 평형(5)  /  자동화율: 0% → 30%

const { Gate } = require('./Gate.cjs');

const RESIDENCE_TYPES = [
  'APARTMENT', 'VILLA', 'DETACHED_1F', 'DETACHED_2F', 'PENTHOUSE', 'COMMERCIAL'
];

const PYEONG_LEVELS = [24, 30, 34, 40, 50];

class G1Type extends Gate {
  constructor() {
    super({
      id: 'g1_type',
      uri: 'urn:ecorean:universe:1:node:g1_type',
      eventOnLock: 'GATE1_LOCKED',
      dependsOn: null
    });
  }

  validate(input) {
    const errors = [];
    if (!input) { return { errors: ['input 누락'] }; }
    if (!RESIDENCE_TYPES.includes(input.residence)) {
      errors.push('residence 미정의: ' + input.residence);
    }
    if (!PYEONG_LEVELS.includes(input.pyeong)) {
      errors.push('pyeong 미정의: ' + input.pyeong);
    }
    return { errors };
  }

  process(input) {
    return {
      ok: true,
      payload: {
        residence: input.residence,
        pyeong: input.pyeong,
        availableSections: this._availableSections(input.residence),
        availableSpaces: this._availableSpaces(input.residence),
        timestamp: Date.now()
      }
    };
  }

  _availableSections(residence) {
    const base = [
      'living','bedroom','kitchen','bathroom','balcony','entrance',
      'dressing','study','dining','pantry','utility','powder',
      'plumbing','electric','window'
    ];
    if (residence === 'DETACHED_1F' || residence === 'DETACHED_2F') {
      return base.concat(['boiler','rooftop','exterior','insulation']);
    }
    return base;
  }

  _availableSpaces(residence) {
    const base = [
      'LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY',
      'KITCHEN','DINING','BATHROOM','POWDER_ROOM',
      'BALCONY','TERRACE','ENTRANCE','DRESSING','PANTRY','UTILITY','BOILER',
      'HALLWAY','STAIRS'
    ];
    if (residence === 'DETACHED_1F' || residence === 'DETACHED_2F') {
      return base.concat(['ROOFTOP','ATTIC','BASEMENT','GARAGE','YARD']);
    }
    return base;
  }
}

module.exports = { G1Type, RESIDENCE_TYPES, PYEONG_LEVELS };
