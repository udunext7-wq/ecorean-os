// ECOREAN BOC v5.6 — 12 컨셉별 표준 자재 매핑
// SoT: docs/MASTER_PLAN.md §96 + 부록 H
// 절대 규칙: 단가 추정 금지 — 실제 단가는 cost_items DB 참조
// 본 매트릭스는 자재 키워드만 (실 단가는 LOAD 시 DB 조회)

const CONCEPT_MATERIAL_MAP = {
  SIMPLE_MODERN: {
    name: '심플모던', mul: 1.2, grade: '표준',
    materials: {
      flooring:    '강마루 화이트오크',
      wall:        '화이트 도장',
      ceiling:     '화이트 도장',
      door:        '무광 화이트',
      kitchen:     '화이트 + 우드손잡이',
      tile_bath:   '600x600 그레이',
      lighting:    '매립 다운라이트'
    }
  },
  MINIMAL_WHITE: {
    name: '미니멀화이트', mul: 1.0, grade: '표준',
    materials: {
      flooring: '화이트 강마루', wall: '화이트 도장', ceiling: '화이트',
      door: '화이트', kitchen: '화이트', tile_bath: '화이트 600x600', lighting: '다운라이트'
    }
  },
  CLASSIC_LUXURY: {
    name: '클래식럭셔리', mul: 1.8, grade: '프리미엄',
    materials: {
      flooring: '원목마루(월넛)', wall: '베이지 실크도배', ceiling: '우물천장+몰딩',
      door: '우드 무광+손잡이', kitchen: '대리석상판+우드', tile_bath: '대리석 패턴',
      lighting: '샹들리에+매립'
    }
  },
  VINTAGE_RETRO: {
    name: '빈티지레트로', mul: 1.1, grade: '표준',
    materials: {
      flooring: '헤링본 마루', wall: '그린/머스타드', ceiling: '우드빔(옵션)',
      door: '빈티지 우드', kitchen: '진한 그린', tile_bath: '모자이크/서브웨이',
      lighting: '펜던트+직부'
    }
  },
  NATURAL_WOOD: {
    name: '내추럴우드', mul: 1.3, grade: '표준+',
    materials: {
      flooring: '원목마루', wall: '베이지+우드 포인트', ceiling: '도장(아이보리)',
      door: '우드 무늬', kitchen: '자작나무', tile_bath: '베이지톤', lighting: '우드 펜던트'
    }
  },
  SCANDINAVIAN: {
    name: '스칸디나비안', mul: 1.2, grade: '표준',
    materials: {
      flooring: '화이트 강마루', wall: '화이트+그레이 포인트', ceiling: '화이트',
      door: '화이트', kitchen: '화이트+블랙손잡이', tile_bath: '화이트+블랙 그라우트',
      lighting: '매립+펜던트'
    }
  },
  INDUSTRIAL: {
    name: '인더스트리얼', mul: 1.1, grade: '표준',
    materials: {
      flooring: '콘크리트 마감/짙은마루', wall: '노출콘크리트+벽돌', ceiling: '노출 천장',
      door: '메탈 프레임', kitchen: '메탈+진한우드', tile_bath: '시멘트 패턴',
      lighting: '메탈 펜던트'
    }
  },
  ASIAN_ZEN: {
    name: '아시안젠', mul: 1.4, grade: '고급',
    materials: {
      flooring: '원목(오크)+다다미', wall: '회색 도장/일본벽지', ceiling: '도장(베이지)',
      door: '미닫이(시오지)', kitchen: '어두운 우드', tile_bath: '무광 베이지',
      lighting: '종이 펜던트'
    }
  },
  PROVENCE: {
    name: '프로방스', mul: 1.5, grade: '고급',
    materials: {
      flooring: '헤링본(라이트)', wall: '화이트+몰딩', ceiling: '우물+화이트',
      door: '화이트+몰딩', kitchen: '화이트+대리석', tile_bath: '대리석',
      lighting: '작은 샹들리에'
    }
  },
  CONTEMPORARY: {
    name: '컨템포러리', mul: 1.6, grade: '고급',
    materials: {
      flooring: '강마루(다크월넛)', wall: '다크 그레이', ceiling: '화이트+간접조명',
      door: '무광 다크', kitchen: '다크+골드 손잡이', tile_bath: '600x600 차콜',
      lighting: '라인 LED+펜던트'
    }
  },
  KOREAN_MODERN: {
    name: '한국모던', mul: 1.3, grade: '표준+',
    materials: {
      flooring: '강마루(월넛/그레이)', wall: '도배+한지 패턴', ceiling: '도장',
      door: '우드', kitchen: '모던+한국 손잡이', tile_bath: '한국 도자기 패턴',
      lighting: '매립'
    }
  },
  SMART_HOME: {
    name: '스마트홈', mul: 1.7, grade: '프리미엄',
    materials: {
      flooring: '강마루', wall: '화이트+컬러 강조', ceiling: '매립+LED라인',
      door: '모션센서(옵션)', kitchen: '모던 화이트', tile_bath: '600x600 모던',
      lighting: '스마트 LED 전체'
    },
    iot: true
  }
};

function getConcept(id) {
  return CONCEPT_MATERIAL_MAP[id] || null;
}

function getAllConcepts() {
  return Object.keys(CONCEPT_MATERIAL_MAP);
}

function getMaterialKeyword(conceptId, category) {
  const concept = CONCEPT_MATERIAL_MAP[conceptId];
  if (!concept || !concept.materials) return null;
  return concept.materials[category] || null;
}

function getGradeMul(conceptId) {
  const concept = CONCEPT_MATERIAL_MAP[conceptId];
  return concept ? concept.mul : 1.0;
}

module.exports = {
  CONCEPT_MATERIAL_MAP: CONCEPT_MATERIAL_MAP,
  getConcept: getConcept,
  getAllConcepts: getAllConcepts,
  getMaterialKeyword: getMaterialKeyword,
  getGradeMul: getGradeMul
};
