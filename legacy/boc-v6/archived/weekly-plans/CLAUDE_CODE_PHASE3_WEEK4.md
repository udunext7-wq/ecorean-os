# ECOREAN BOC — Phase 3 Week 4 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 aabfc9d (Week 3 완료)
> **이번 주 목표:** 견적 모듈 격리 + 22/23/12/6/5 본 매트릭스 + CalcEngine v5.6 보정계수
> **소요:** 자율 실행 3~4시간
> **확장자:** .cjs (ESM 환경)

---

## 절대 규칙 (Phase 3 전 기간)

1. TDD 강제 — 테스트 먼저, 코드 나중
2. 버그 있는 코드 커밋 금지
3. 단가 추정 금지 — UNKNOWN/NEEDS_RESEARCH 우선
4. 9탭 회귀 0건 검증 후만 다음 단계
5. **estimate.html · boc-shell.html 직접 수정 금지**
6. 22 섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 변경 금지 (마스터플랜 §6, §91, §96, §97, §104)
7. 기존 13 엔진 시그니처 변경 금지
8. Feature Flag `USE_ESTIMATE_V6 = false` 기본값

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # aabfc9d 확인
git pull origin master

# Week 1+2+3 전체 회귀
node shell/src/core-bus/__tests__/CoreBus.test.cjs
node shell/src/core-bus/__tests__/schemas.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node modules-html/cad/__tests__/DrawingModel.test.cjs
node modules-html/cad/__tests__/DrawingEngine.test.cjs
node modules-html/cad/__tests__/CADBus.test.cjs
node modules-html/cad/__tests__/L1_Floorplan.test.cjs
node shell/src/gates/__tests__/Gate.test.cjs
node shell/src/gates/__tests__/G1_Type.test.cjs
node shell/src/gates/__tests__/G2_G5.test.cjs
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs
node test-engine.js
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조

```bash
mkdir -p modules-html/estimate-v6/src/matrices
mkdir -p modules-html/estimate-v6/src/calc
mkdir -p modules-html/estimate-v6/__tests__
```

---

## 작업 2: 22 시공섹션 본 매트릭스 (마스터플랜 §6 + 부록 I)

### 2-1. modules-html/estimate-v6/src/matrices/Sections.cjs

```javascript
// ECOREAN BOC v5.6 — 시공 섹션 22개 본 매트릭스
// SoT: docs/MASTER_PLAN.md §6 STEP 0 + 부록 I

const SECTIONS = {
  // 그룹 A: 주거 공간 (6) — 필수
  RESIDENTIAL: {
    living:    { name: '거실',           group: 'A', required: true,  spaces: ['LIVING'] },
    bedroom:   { name: '침실',           group: 'A', required: true,  spaces: ['MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM'] },
    kitchen:   { name: '주방',           group: 'A', required: true,  spaces: ['KITCHEN'] },
    bathroom:  { name: '욕실',           group: 'A', required: true,  spaces: ['BATHROOM'] },
    balcony:   { name: '발코니/테라스',   group: 'A', required: false, spaces: ['BALCONY','TERRACE'] },
    entrance:  { name: '현관',           group: 'A', required: true,  spaces: ['ENTRANCE'] }
  },
  // 그룹 B: 부가 공간 (6) — 평형/필요시
  AUXILIARY: {
    dressing:  { name: '드레스룸',       group: 'B', required: false, spaces: ['DRESSING'] },
    study:     { name: '서재',           group: 'B', required: false, spaces: ['STUDY'] },
    dining:    { name: '식당',           group: 'B', required: false, spaces: ['DINING'] },
    pantry:    { name: '팬트리',         group: 'B', required: false, spaces: ['PANTRY'] },
    utility:   { name: '다용도실',       group: 'B', required: false, spaces: ['UTILITY'] },
    powder:    { name: '파우더룸',       group: 'B', required: false, spaces: ['POWDER_ROOM'] }
  },
  // 그룹 C: 특수 공간 (5) — 단독/대형
  SPECIAL: {
    boiler:    { name: '보일러실',       group: 'C', required: false, spaces: ['BOILER'],     residences: ['DETACHED_1F','DETACHED_2F','VILLA'] },
    hallway:   { name: '복도',           group: 'C', required: false, spaces: ['HALLWAY'] },
    stairs:    { name: '계단',           group: 'C', required: false, spaces: ['STAIRS'],     residences: ['DETACHED_2F'] },
    rooftop:   { name: '옥상',           group: 'C', required: false, spaces: ['ROOFTOP'],    residences: ['DETACHED_1F','DETACHED_2F','PENTHOUSE'] },
    basement:  { name: '지하/다락',      group: 'C', required: false, spaces: ['BASEMENT','ATTIC'], residences: ['DETACHED_1F','DETACHED_2F'] }
  },
  // 그룹 D: 공정 (5) — 전체 영향
  PROCESS: {
    plumbing:  { name: '배관',           group: 'D', required: true,  type: 'process' },
    electric:  { name: '전기',           group: 'D', required: true,  type: 'process' },
    window:    { name: '창호',           group: 'D', required: true,  type: 'process' },
    insulation:{ name: '단열(외벽)',      group: 'D', required: false, type: 'process', residences: ['DETACHED_1F','DETACHED_2F','PENTHOUSE'] },
    exterior:  { name: '외장/지붕',       group: 'D', required: false, type: 'process', residences: ['DETACHED_1F','DETACHED_2F'] }
  }
};

// 모든 섹션 ID 평탄화
function getAllSectionIds() {
  const ids = [];
  ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
    Object.keys(SECTIONS[group]).forEach(function(id) { ids.push(id); });
  });
  return ids;
}

// 섹션 → 공간 매핑
function getSpacesForSections(sectionIds) {
  const result = new Set();
  const all = SECTIONS;
  sectionIds.forEach(function(secId) {
    ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
      const sec = all[group][secId];
      if (sec && sec.spaces) {
        sec.spaces.forEach(function(s) { result.add(s); });
      }
    });
  });
  return Array.from(result);
}

// 주거형태별 가능 섹션
function getAvailableSections(residence) {
  const ids = [];
  ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
    Object.keys(SECTIONS[group]).forEach(function(id) {
      const sec = SECTIONS[group][id];
      if (!sec.residences || sec.residences.includes(residence)) {
        ids.push(id);
      }
    });
  });
  return ids;
}

// 섹션 정보 조회
function getSection(id) {
  let result = null;
  ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
    if (SECTIONS[group][id]) result = SECTIONS[group][id];
  });
  return result;
}

module.exports = {
  SECTIONS: SECTIONS,
  getAllSectionIds: getAllSectionIds,
  getSpacesForSections: getSpacesForSections,
  getAvailableSections: getAvailableSections,
  getSection: getSection
};
```

### 2-2. modules-html/estimate-v6/__tests__/Sections.test.cjs

```javascript
const {
  SECTIONS, getAllSectionIds, getSpacesForSections,
  getAvailableSections, getSection
} = require('../src/matrices/Sections.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 22개 섹션 (6+6+5+5)
(function() {
  const all = getAllSectionIds();
  assert(all.length === 22, '22 섹션: 실제 ' + all.length);
})();

// Test 2: 그룹별 개수
(function() {
  assert(Object.keys(SECTIONS.RESIDENTIAL).length === 6, '주거 6');
  assert(Object.keys(SECTIONS.AUXILIARY).length === 6, '부가 6');
  assert(Object.keys(SECTIONS.SPECIAL).length === 5, '특수 5');
  assert(Object.keys(SECTIONS.PROCESS).length === 5, '공정 5');
})();

// Test 3: 섹션 → 공간 매핑
(function() {
  const spaces = getSpacesForSections(['bathroom','kitchen','living']);
  assert(spaces.includes('BATHROOM'), 'BATHROOM');
  assert(spaces.includes('KITCHEN'), 'KITCHEN');
  assert(spaces.includes('LIVING'), 'LIVING');
})();

// Test 4: bedroom → 3공간
(function() {
  const spaces = getSpacesForSections(['bedroom']);
  assert(spaces.length === 3, 'bedroom 3공간');
  assert(spaces.includes('MASTER_BEDROOM'), 'MASTER_BEDROOM');
})();

// Test 5: 아파트 — 단독 전용 섹션 제외
(function() {
  const apt = getAvailableSections('APARTMENT');
  assert(!apt.includes('boiler'), '아파트는 보일러 없음');
  assert(!apt.includes('exterior'), '아파트는 외장 없음');
  assert(apt.includes('living'), '아파트도 거실');
})();

// Test 6: 단독주택 복층 — 모든 특수 섹션
(function() {
  const det = getAvailableSections('DETACHED_2F');
  assert(det.includes('boiler'), '단독 보일러');
  assert(det.includes('stairs'), '단독 복층 계단');
  assert(det.includes('rooftop'), '단독 옥상');
  assert(det.includes('exterior'), '단독 외장');
})();

// Test 7: 펜트하우스 — 옥상만
(function() {
  const pent = getAvailableSections('PENTHOUSE');
  assert(pent.includes('rooftop'), '펜트 옥상');
  assert(!pent.includes('basement'), '펜트 지하 없음');
})();

// Test 8: getSection 정상
(function() {
  const sec = getSection('bathroom');
  assert(sec.name === '욕실', '욕실 이름');
  assert(sec.group === 'A', '욕실 그룹 A');
  assert(sec.required === true, '욕실 필수');
})();

console.log('[PASS] Sections (8/8)');
```

### 2-3. 검증

```bash
node modules-html/estimate-v6/__tests__/Sections.test.cjs
# 기대: [PASS] Sections (8/8)
```

---

## 작업 3: 23 공간 유형 본 매트릭스 (마스터플랜 §91 + 부록 J)

### 3-1. modules-html/estimate-v6/src/matrices/Spaces.cjs

```javascript
// ECOREAN BOC v5.6 — 공간 유형 23개 본 매트릭스
// SoT: docs/MASTER_PLAN.md §91 + 부록 J

const SPACES = {
  // 거주 (5)
  LIVING:           { name: '거실',     group: '거주', wet: false, plumbing: false, vent: 'natural' },
  MASTER_BEDROOM:   { name: '안방',     group: '거주', wet: false, plumbing: false, vent: 'natural' },
  BEDROOM:          { name: '침실',     group: '거주', wet: false, plumbing: false, vent: 'natural' },
  SMALL_BEDROOM:    { name: '작은방',   group: '거주', wet: false, plumbing: false, vent: 'natural' },
  STUDY:            { name: '서재',     group: '거주', wet: false, plumbing: false, vent: 'natural' },

  // 수도 (4)
  KITCHEN:          { name: '주방',     group: '수도', wet: true,  plumbing: true,  vent: 'mechanical', gas: true },
  DINING:           { name: '식당',     group: '수도', wet: false, plumbing: false, vent: 'natural' },
  BATHROOM:         { name: '욕실',     group: '수도', wet: true,  plumbing: true,  vent: 'mechanical', waterproof: true },
  POWDER_ROOM:      { name: '파우더룸',  group: '수도', wet: true,  plumbing: true,  vent: 'mechanical', waterproof: true },

  // 보조 (8)
  BALCONY:          { name: '발코니',   group: '보조', wet: true,  plumbing: false, vent: 'natural', waterproof: true },
  TERRACE:          { name: '테라스',   group: '보조', wet: true,  plumbing: false, vent: 'natural', waterproof: true },
  ROOFTOP:          { name: '옥상',     group: '보조', wet: true,  plumbing: false, vent: 'natural', waterproof: true },
  ENTRANCE:         { name: '현관',     group: '보조', wet: false, plumbing: false, vent: 'natural' },
  DRESSING:         { name: '드레스룸',  group: '보조', wet: false, plumbing: false, vent: 'natural' },
  PANTRY:           { name: '팬트리',   group: '보조', wet: false, plumbing: false, vent: 'natural' },
  UTILITY:          { name: '다용도실',  group: '보조', wet: true,  plumbing: true,  vent: 'mechanical' },
  BOILER:           { name: '보일러실',  group: '보조', wet: false, plumbing: true,  vent: 'mechanical', gas: true },

  // 연결 (2)
  HALLWAY:          { name: '복도',     group: '연결', wet: false, plumbing: false, vent: 'natural' },
  STAIRS:           { name: '계단',     group: '연결', wet: false, plumbing: false, vent: 'natural' },

  // 단독주택 추가 (4)
  ATTIC:            { name: '다락',     group: '단독', wet: false, plumbing: false, vent: 'natural' },
  BASEMENT:         { name: '지하실',   group: '단독', wet: true,  plumbing: false, vent: 'mechanical', waterproof: true },
  GARAGE:           { name: '차고',     group: '단독', wet: false, plumbing: false, vent: 'mechanical' },
  YARD:             { name: '마당',     group: '단독', wet: false, plumbing: false, vent: 'natural' }
};

function getAllSpaceKeys() {
  return Object.keys(SPACES);
}

function getSpace(key) {
  return SPACES[key] || null;
}

function getSpacesByGroup(group) {
  return Object.keys(SPACES).filter(function(k) {
    return SPACES[k].group === group;
  });
}

// 메타 플래그 조회
function isWet(key) { return SPACES[key] && SPACES[key].wet === true; }
function hasPlumbing(key) { return SPACES[key] && SPACES[key].plumbing === true; }
function needsWaterproof(key) { return SPACES[key] && SPACES[key].waterproof === true; }

module.exports = {
  SPACES: SPACES,
  getAllSpaceKeys: getAllSpaceKeys,
  getSpace: getSpace,
  getSpacesByGroup: getSpacesByGroup,
  isWet: isWet,
  hasPlumbing: hasPlumbing,
  needsWaterproof: needsWaterproof
};
```

### 3-2. modules-html/estimate-v6/__tests__/Spaces.test.cjs

```javascript
const {
  SPACES, getAllSpaceKeys, getSpace, getSpacesByGroup,
  isWet, hasPlumbing, needsWaterproof
} = require('../src/matrices/Spaces.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 23개 공간 (5+4+8+2+4)
(function() {
  const all = getAllSpaceKeys();
  assert(all.length === 23, '23 공간: 실제 ' + all.length);
})();

// Test 2: 그룹별 개수
(function() {
  assert(getSpacesByGroup('거주').length === 5, '거주 5');
  assert(getSpacesByGroup('수도').length === 4, '수도 4');
  assert(getSpacesByGroup('보조').length === 8, '보조 8');
  assert(getSpacesByGroup('연결').length === 2, '연결 2');
  assert(getSpacesByGroup('단독').length === 4, '단독 4');
})();

// Test 3: 욕실 메타
(function() {
  assert(isWet('BATHROOM') === true, '욕실 wet');
  assert(hasPlumbing('BATHROOM') === true, '욕실 배관');
  assert(needsWaterproof('BATHROOM') === true, '욕실 방수');
})();

// Test 4: 거실 메타
(function() {
  assert(isWet('LIVING') === false, '거실 dry');
  assert(hasPlumbing('LIVING') === false, '거실 배관 없음');
  assert(needsWaterproof('LIVING') === false, '거실 방수 없음');
})();

// Test 5: 주방 — 가스
(function() {
  assert(SPACES.KITCHEN.gas === true, '주방 가스');
  assert(SPACES.BOILER.gas === true, '보일러실 가스');
  assert(!SPACES.LIVING.gas, '거실 가스 없음');
})();

// Test 6: 발코니 — 방수 + 자연환기
(function() {
  assert(needsWaterproof('BALCONY') === true, '발코니 방수');
  assert(SPACES.BALCONY.vent === 'natural', '발코니 자연환기');
})();

// Test 7: 지하실 — 기계환기 + 방수
(function() {
  assert(needsWaterproof('BASEMENT') === true, '지하 방수');
  assert(SPACES.BASEMENT.vent === 'mechanical', '지하 기계환기');
})();

// Test 8: 차고 — 기계환기
(function() {
  assert(SPACES.GARAGE.vent === 'mechanical', '차고 기계환기');
})();

console.log('[PASS] Spaces (8/8)');
```

### 3-3. 검증

```bash
node modules-html/estimate-v6/__tests__/Spaces.test.cjs
# 기대: [PASS] Spaces (8/8)
```

---

## 작업 4: 12 컨셉×자재 매핑 (마스터플랜 §96 + 부록 H)

### 4-1. modules-html/estimate-v6/src/matrices/ConceptMaterialMatrix.cjs

```javascript
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
```

### 4-2. modules-html/estimate-v6/__tests__/ConceptMaterialMatrix.test.cjs

```javascript
const {
  CONCEPT_MATERIAL_MAP, getConcept, getAllConcepts,
  getMaterialKeyword, getGradeMul
} = require('../src/matrices/ConceptMaterialMatrix.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 12 컨셉
(function() {
  assert(getAllConcepts().length === 12, '12 컨셉: ' + getAllConcepts().length);
})();

// Test 2: 가산 배수 — 클래식 가장 높음
(function() {
  assert(getGradeMul('CLASSIC_LUXURY') === 1.8, '클래식 1.8');
  assert(getGradeMul('MINIMAL_WHITE') === 1.0, '미니멀 1.0 기준');
  assert(getGradeMul('SMART_HOME') === 1.7, '스마트 1.7');
})();

// Test 3: 자재 카테고리 7개 (모든 컨셉)
(function() {
  getAllConcepts().forEach(function(id) {
    const c = getConcept(id);
    const cats = Object.keys(c.materials);
    assert(cats.length === 7, id + ' 7카테고리');
    assert(cats.includes('flooring'), 'flooring');
    assert(cats.includes('lighting'), 'lighting');
  });
})();

// Test 4: 클래식 자재
(function() {
  const flooring = getMaterialKeyword('CLASSIC_LUXURY', 'flooring');
  assert(flooring.includes('월넛'), '클래식 월넛');
})();

// Test 5: 스마트홈 IoT 플래그
(function() {
  const smart = getConcept('SMART_HOME');
  assert(smart.iot === true, '스마트홈 IoT');
  const classic = getConcept('CLASSIC_LUXURY');
  assert(!classic.iot, '클래식 IoT 없음');
})();

// Test 6: 12 × 7 = 84 자재 매핑
(function() {
  let total = 0;
  getAllConcepts().forEach(function(id) {
    total += Object.keys(getConcept(id).materials).length;
  });
  assert(total === 84, '12×7 = 84 매핑: 실제 ' + total);
})();

// Test 7: 미정의 조회 null
(function() {
  assert(getConcept('UNDEFINED') === null, '미정의 null');
  assert(getMaterialKeyword('UNDEFINED', 'flooring') === null, '미정의 자재 null');
})();

console.log('[PASS] ConceptMaterialMatrix (7/7)');
```

### 4-3. 검증

```bash
node modules-html/estimate-v6/__tests__/ConceptMaterialMatrix.test.cjs
# 기대: [PASS] ConceptMaterialMatrix (7/7)
```

---

## 작업 5: 6 주거형태 + 5 평형 매트릭스 (마스터플랜 §97 + §104 + 부록 K, L)

### 5-1. modules-html/estimate-v6/src/matrices/ResidenceMatrix.cjs

```javascript
// ECOREAN BOC v5.6 — 6 주거형태 + 5 평형 매트릭스
// SoT: docs/MASTER_PLAN.md §97 + §104 + 부록 K, L

const RESIDENCES = {
  APARTMENT:    { name: '아파트',         exterior: false, multiFloor: false, baseFactor: 1.0  },
  VILLA:        { name: '빌라',           exterior: false, multiFloor: false, baseFactor: 1.0  },
  DETACHED_1F:  { name: '단독주택(단층)',  exterior: true,  multiFloor: false, baseFactor: 1.15 },
  DETACHED_2F:  { name: '단독주택(복층)',  exterior: true,  multiFloor: true,  baseFactor: 1.20 },
  PENTHOUSE:    { name: '펜트하우스',      exterior: true,  multiFloor: false, baseFactor: 1.25 },
  COMMERCIAL:   { name: '상가/오피스',     exterior: false, multiFloor: false, baseFactor: 0.95 }
};

const PYEONG_PRESETS = {
  24: { sqm: 79,  spaces: 7,  spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','KITCHEN','BATHROOM','BALCONY','ENTRANCE'] },
  30: { sqm: 99,  spaces: 11, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','KITCHEN','BATHROOM','POWDER_ROOM','DRESSING','BALCONY','TERRACE','ENTRANCE'] },
  34: { sqm: 112, spaces: 13, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY','KITCHEN','DINING','BATHROOM','POWDER_ROOM','DRESSING','BALCONY','UTILITY','ENTRANCE'] },
  40: { sqm: 132, spaces: 15, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY','KITCHEN','DINING','BATHROOM','POWDER_ROOM','DRESSING','PANTRY','BALCONY','UTILITY','HALLWAY','ENTRANCE'] },
  50: { sqm: 165, spaces: 18, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY','KITCHEN','DINING','BATHROOM','POWDER_ROOM','DRESSING','PANTRY','BALCONY','TERRACE','UTILITY','BOILER','HALLWAY','ENTRANCE'] }
};

function getResidence(id) { return RESIDENCES[id] || null; }
function getPreset(pyeong) { return PYEONG_PRESETS[pyeong] || null; }
function getAllResidences() { return Object.keys(RESIDENCES); }
function getAllPyeongs() { return Object.keys(PYEONG_PRESETS).map(Number); }

module.exports = {
  RESIDENCES: RESIDENCES,
  PYEONG_PRESETS: PYEONG_PRESETS,
  getResidence: getResidence,
  getPreset: getPreset,
  getAllResidences: getAllResidences,
  getAllPyeongs: getAllPyeongs
};
```

### 5-2. modules-html/estimate-v6/__tests__/ResidenceMatrix.test.cjs

```javascript
const {
  RESIDENCES, PYEONG_PRESETS, getResidence, getPreset,
  getAllResidences, getAllPyeongs
} = require('../src/matrices/ResidenceMatrix.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 6 주거형태
(function() {
  assert(getAllResidences().length === 6, '6 주거형태');
})();

// Test 2: 5 평형
(function() {
  assert(getAllPyeongs().length === 5, '5 평형');
})();

// Test 3: 단독주택 외장
(function() {
  assert(getResidence('DETACHED_1F').exterior === true, '단독 외장');
  assert(getResidence('APARTMENT').exterior === false, '아파트 외장 없음');
})();

// Test 4: 단독 복층 multiFloor
(function() {
  assert(getResidence('DETACHED_2F').multiFloor === true, '복층 multi');
  assert(getResidence('DETACHED_1F').multiFloor === false, '단층 single');
})();

// Test 5: 평형 매핑
(function() {
  assert(getPreset(34).sqm === 112, '34평 112㎡');
  assert(getPreset(34).spaces === 13, '34평 13공간');
})();

// Test 6: baseFactor — 펜트가 가장 높음
(function() {
  assert(getResidence('PENTHOUSE').baseFactor === 1.25, '펜트 1.25');
  assert(getResidence('COMMERCIAL').baseFactor === 0.95, '상가 0.95');
})();

console.log('[PASS] ResidenceMatrix (6/6)');
```

### 5-3. 검증

```bash
node modules-html/estimate-v6/__tests__/ResidenceMatrix.test.cjs
# 기대: [PASS] ResidenceMatrix (6/6)
```

---

## 작업 6: CalcEngine v5.6 보정계수

### 6-1. modules-html/estimate-v6/src/calc/CalcEngineV56.cjs

```javascript
// ECOREAN BOC v5.6 — CalcEngine 견적 계산 (보정계수 통합)
// SoT: docs/MASTER_PLAN.md §107 (KPI 11항목)
//
// 핵심 공식:
//   공급가 = sum(qty × (1+wasteRate) × (laborCost×pm + materialCost) + equipment + accessory + difficultyAdjust)
//   도급합계 = 공급가 × baseFactor × gradeMul × occupiedFactor × elevatorFactor
//   최종 = 도급합계 × 1.10 (VAT)
//
// 보정계수:
//   - baseFactor: 주거형태별 (0.95 ~ 1.25)
//   - gradeMul: 컨셉별 (1.0 ~ 1.8)
//   - occupiedFactor: 거주중 시공 ×1.10
//   - elevatorFactor: 4층+ 무엘리베이터 ×1.05 (양중비)
//
// 절대 규칙: 단가 추정 금지 — 실제 cost_items DB에서 LOAD

const { getResidence } = require('../matrices/ResidenceMatrix.cjs');
const { getGradeMul } = require('../matrices/ConceptMaterialMatrix.cjs');

const VAT_RATE = 0.10;
const BASE_CONTRACT_RATIO = 1.15;   // 도급 기본 ×1.15

// 단순 공급가 계산 (실 단가 LOAD 가정 — 인자로 lineItems 받음)
// lineItems: [{ qty, wasteRate, laborCost, pm, materialCost, equipment, accessory, difficultyAdjust }]
function calcSupplyAmount(lineItems) {
  let total = 0;
  lineItems.forEach(function(it) {
    const qty = it.qty || 0;
    const waste = it.wasteRate || 0;
    const labor = it.laborCost || 0;
    const pm = it.pm || 0;
    const material = it.materialCost || 0;
    const equip = it.equipment || 0;
    const access = it.accessory || 0;
    const diff = it.difficultyAdjust || 0;

    const lineCost = qty * (1 + waste) * (labor * pm + material) + equip + access + diff;
    total += lineCost;
  });
  return Math.round(total);
}

// 보정계수 적용
function calcContractAmount(supply, opts) {
  const baseFactor      = opts.baseFactor || 1.0;
  const gradeMul        = opts.gradeMul || 1.0;
  const occupiedFactor  = opts.occupied ? 1.10 : 1.0;
  const elevatorFactor  = opts.floorLevel >= 4 && !opts.hasElev ? 1.05 : 1.0;

  return Math.round(
    supply * BASE_CONTRACT_RATIO * baseFactor * gradeMul * occupiedFactor * elevatorFactor
  );
}

function calcFinalAmount(contract) {
  return Math.round(contract * (1 + VAT_RATE));
}

// 입력: { lineItems, residence, concept, occupied, floorLevel, hasElev, areaSqm }
// 출력: { supply, contract, final, sqmPrice, pyPrice, ... } (KPI 11항목 매핑)
function calculateEstimate(input) {
  if (!input || !Array.isArray(input.lineItems)) {
    return { ok: false, errors: ['lineItems 배열 필수'] };
  }

  const supply = calcSupplyAmount(input.lineItems);

  const residenceData = getResidence(input.residence);
  const baseFactor = residenceData ? residenceData.baseFactor : 1.0;
  const gradeMul = getGradeMul(input.concept);

  const contract = calcContractAmount(supply, {
    baseFactor: baseFactor,
    gradeMul: gradeMul,
    occupied: input.occupied,
    floorLevel: input.floorLevel,
    hasElev: input.hasElev
  });

  const final2 = calcFinalAmount(contract);

  const areaSqm = input.areaSqm || 0;
  const sqmPrice = areaSqm > 0 ? Math.round(final2 / areaSqm) : 0;
  const pyPrice = areaSqm > 0 ? Math.round(final2 / (areaSqm / 3.3058)) : 0;

  // 마진율 (도급 - 공급) / 도급
  const margin = contract > 0 ? ((contract - supply) / contract * 100) : 0;

  return {
    ok: true,
    payload: {
      supply: supply,
      contract: contract,
      final: final2,
      areaSqm: areaSqm,
      sqmPrice: sqmPrice,
      pyPrice: pyPrice,
      margin: parseFloat(margin.toFixed(1)),
      factors: {
        baseFactor: baseFactor,
        gradeMul: gradeMul,
        occupied: !!input.occupied,
        elevator: input.floorLevel >= 4 && !input.hasElev
      }
    }
  };
}

module.exports = {
  calcSupplyAmount: calcSupplyAmount,
  calcContractAmount: calcContractAmount,
  calcFinalAmount: calcFinalAmount,
  calculateEstimate: calculateEstimate,
  VAT_RATE: VAT_RATE,
  BASE_CONTRACT_RATIO: BASE_CONTRACT_RATIO
};
```

### 6-2. modules-html/estimate-v6/__tests__/CalcEngineV56.test.cjs

```javascript
const {
  calcSupplyAmount, calcContractAmount, calcFinalAmount,
  calculateEstimate, VAT_RATE, BASE_CONTRACT_RATIO
} = require('../src/calc/CalcEngineV56.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 단순 공급가
(function() {
  // qty=10, waste=0.1, labor=100, pm=1, material=200, equip=0, access=0, diff=0
  // = 10 × 1.1 × (100×1 + 200) = 10 × 1.1 × 300 = 3300
  const supply = calcSupplyAmount([{
    qty: 10, wasteRate: 0.1, laborCost: 100, pm: 1, materialCost: 200,
    equipment: 0, accessory: 0, difficultyAdjust: 0
  }]);
  assert(supply === 3300, '단순 공급가 3300: ' + supply);
})();

// Test 2: 도급 = 공급 × 1.15 (기본)
(function() {
  // baseFactor=1, gradeMul=1, occupied=false, elev=ok
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: false, floorLevel: 2, hasElev: true
  });
  assert(contract === 1150000, '도급 ×1.15: ' + contract);
})();

// Test 3: 클래식럭셔리 가산 (gradeMul 1.8)
(function() {
  // 1000000 × 1.15 × 1.8 = 2070000
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.8, occupied: false, floorLevel: 2, hasElev: true
  });
  assert(contract === 2070000, '클래식 도급 2070000: ' + contract);
})();

// Test 4: 거주중 +10%
(function() {
  // 1000000 × 1.15 × 1.10 = 1265000
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: true, floorLevel: 2, hasElev: true
  });
  assert(contract === 1265000, '거주중 1265000: ' + contract);
})();

// Test 5: 4층 무엘 +5% (양중비)
(function() {
  // 1000000 × 1.15 × 1.05 = 1207500
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: false, floorLevel: 4, hasElev: false
  });
  assert(contract === 1207500, '양중 1207500: ' + contract);
})();

// Test 6: 4층 엘리베이터 있음 — 양중 미적용
(function() {
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: false, floorLevel: 4, hasElev: true
  });
  assert(contract === 1150000, '엘리베이터 있으면 양중 X: ' + contract);
})();

// Test 7: 펜트하우스 baseFactor 1.25
(function() {
  // 1000000 × 1.15 × 1.25 = 1437500
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.25, gradeMul: 1.0, occupied: false, floorLevel: 2, hasElev: true
  });
  assert(contract === 1437500, '펜트 1437500: ' + contract);
})();

// Test 8: 최종 = 도급 × 1.10
(function() {
  const final2 = calcFinalAmount(1000000);
  assert(final2 === 1100000, 'VAT 1100000: ' + final2);
})();

// Test 9: 통합 — 30평 아파트 + 클래식 + 거주중
(function() {
  const r = calculateEstimate({
    lineItems: [{
      qty: 100, wasteRate: 0.05, laborCost: 50, pm: 1, materialCost: 100,
      equipment: 0, accessory: 0, difficultyAdjust: 0
    }],
    residence: 'APARTMENT',
    concept: 'CLASSIC_LUXURY',
    occupied: true,
    floorLevel: 5,
    hasElev: true,
    areaSqm: 99
  });
  assert(r.ok === true, '통합 OK');
  // supply = 100 × 1.05 × (50 + 100) = 100 × 1.05 × 150 = 15750
  assert(r.payload.supply === 15750, 'supply 15750: ' + r.payload.supply);
  // contract = 15750 × 1.15 × 1.0(아파트) × 1.8(클래식) × 1.10(거주) = 35840.25 → 35840
  assert(r.payload.contract === 35840, 'contract 35840: ' + r.payload.contract);
  // final = 35840 × 1.10 = 39424
  assert(r.payload.final === 39424, 'final 39424: ' + r.payload.final);
  assert(r.payload.factors.gradeMul === 1.8, 'gradeMul 1.8');
  assert(r.payload.factors.occupied === true, 'occupied true');
})();

// Test 10: 단독주택 + 4층 무엘 + 펜트 baseFactor
(function() {
  const r = calculateEstimate({
    lineItems: [{
      qty: 10, wasteRate: 0, laborCost: 100, pm: 1, materialCost: 0,
      equipment: 0, accessory: 0, difficultyAdjust: 0
    }],
    residence: 'PENTHOUSE',
    concept: 'MINIMAL_WHITE',
    occupied: false,
    floorLevel: 5,
    hasElev: false,
    areaSqm: 50
  });
  assert(r.payload.supply === 1000, 'supply 1000');
  // 1000 × 1.15 × 1.25(펜트) × 1.0(미니멀) × 1.05(양중) = 1509.375 → 1509
  assert(r.payload.contract === 1509, 'contract 1509: ' + r.payload.contract);
  assert(r.payload.factors.elevator === true, '양중 적용');
})();

// Test 11: 마진율 계산
(function() {
  const r = calculateEstimate({
    lineItems: [{ qty: 1, laborCost: 1000, pm: 1, materialCost: 0 }],
    residence: 'APARTMENT', concept: 'MINIMAL_WHITE',
    occupied: false, floorLevel: 1, hasElev: true, areaSqm: 10
  });
  // supply 1000, contract 1150 → margin = (1150-1000)/1150 × 100 = 13.04
  assert(Math.abs(r.payload.margin - 13.0) < 0.1, '마진율 ~13%: ' + r.payload.margin);
})();

console.log('[PASS] CalcEngineV56 (11/11)');
```

### 6-3. 검증

```bash
node modules-html/estimate-v6/__tests__/CalcEngineV56.test.cjs
# 기대: [PASS] CalcEngineV56 (11/11)
```

---

## 작업 7: 게이트 ↔ 견적 통합 E2E

### 7-1. modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs

```javascript
// ECOREAN BOC v5.6 — 견적 모듈 v6 통합 E2E
// G1 → G2 → G3 → G4 → CalcEngineV56 → 1단계 견적

const { G1Type } = require('../../../shell/src/gates/G1_Type.cjs');
const { G2Concept } = require('../../../shell/src/gates/G2_Concept.cjs');
const { G3Section } = require('../../../shell/src/gates/G3_Section.cjs');
const { G4CAD } = require('../../../shell/src/gates/G4_CAD.cjs');
const { GateRegistry } = require('../../../shell/src/gates/Gate.cjs');
const { calculateEstimate } = require('../src/calc/CalcEngineV56.cjs');
const { getSpacesForSections, getAvailableSections } = require('../src/matrices/Sections.cjs');
const { getPreset } = require('../src/matrices/ResidenceMatrix.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

function runFullFlow() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  const g3 = new G3Section();
  const g4 = new G4CAD();
  reg.register(g1); reg.register(g2); reg.register(g3); reg.register(g4);

  // STEP 1: G1
  const r1 = g1.lock({ residence: 'APARTMENT', pyeong: 30 }, reg);
  assert(r1.ok, 'G1');

  // STEP 2: G2
  const r2 = g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  assert(r2.ok, 'G2');

  // STEP 3: G3 — 본 매트릭스로 자동 공간 결정
  const r3 = g3.lock({ sections: ['bathroom','kitchen','living'] }, reg);
  assert(r3.ok, 'G3');
  const autoSpaces = getSpacesForSections(['bathroom','kitchen','living']);
  assert(autoSpaces.includes('BATHROOM'), 'BATHROOM 자동');

  // 평형 프리셋 — 30평
  const preset = getPreset(30);
  assert(preset.sqm === 99, '30평 99㎡');

  // STEP 4: G4 — CAD 면적 입력
  const r4 = g4.lock({
    spaces: [
      { id: 'b1', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'k1', area_sqm: 10, typeKey: 'KITCHEN' },
      { id: 'l1', area_sqm: 20, typeKey: 'LIVING' }
    ]
  }, reg);
  assert(r4.ok, 'G4');

  // 견적 계산
  const estimate = calculateEstimate({
    lineItems: [
      // 욕실 (qty 5㎡, 자재 추정 안 함 — 임의 단가)
      { qty: 5,  wasteRate: 0.05, laborCost: 100000, pm: 1, materialCost: 200000 },
      // 주방
      { qty: 10, wasteRate: 0.05, laborCost: 80000,  pm: 1, materialCost: 150000 },
      // 거실
      { qty: 20, wasteRate: 0.05, laborCost: 60000,  pm: 1, materialCost: 100000 }
    ],
    residence: 'APARTMENT',
    concept: 'CLASSIC_LUXURY',
    occupied: false,
    floorLevel: 5,
    hasElev: true,
    areaSqm: r4.payload.totalAreaSqm   // 35
  });

  assert(estimate.ok === true, '견적 OK');
  assert(estimate.payload.supply > 0, '공급가 > 0');
  assert(estimate.payload.contract > estimate.payload.supply, '도급 > 공급');
  assert(estimate.payload.final > estimate.payload.contract, '최종 > 도급 (VAT)');
  assert(estimate.payload.areaSqm === 35, '면적 35㎡');
  assert(estimate.payload.sqmPrice > 0, '㎡당 단가');
  assert(estimate.payload.pyPrice > 0, '평당 단가');
  assert(estimate.payload.factors.gradeMul === 1.8, '클래식 가산 1.8');

  console.log('  시나리오: 30평 아파트 + 클래식럭셔리 + 욕실/주방/거실 35㎡');
  console.log('  공급가:   ' + estimate.payload.supply.toLocaleString() + '원');
  console.log('  도급:     ' + estimate.payload.contract.toLocaleString() + '원');
  console.log('  최종(VAT):' + estimate.payload.final.toLocaleString() + '원');
  console.log('  ㎡당:     ' + estimate.payload.sqmPrice.toLocaleString() + '원/㎡');
  console.log('  평당:     ' + estimate.payload.pyPrice.toLocaleString() + '원/평');
  console.log('  마진율:   ' + estimate.payload.margin + '%');
}

runFullFlow();
console.log('[PASS] E2E estimate v6 (모두 통과)');
```

### 7-2. 검증

```bash
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs
# 기대: 시나리오 출력 + [PASS] E2E estimate v6
```

---

## 작업 8: 통합 테스트 — Phase 3-D Gate Test

```bash
# Week 4 신규
node modules-html/estimate-v6/__tests__/Sections.test.cjs
node modules-html/estimate-v6/__tests__/Spaces.test.cjs
node modules-html/estimate-v6/__tests__/ConceptMaterialMatrix.test.cjs
node modules-html/estimate-v6/__tests__/ResidenceMatrix.test.cjs
node modules-html/estimate-v6/__tests__/CalcEngineV56.test.cjs
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs

# Week 1+2+3 회귀
node shell/src/core-bus/__tests__/CoreBus.test.cjs
node shell/src/core-bus/__tests__/schemas.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node modules-html/cad/__tests__/DrawingModel.test.cjs
node modules-html/cad/__tests__/DrawingEngine.test.cjs
node modules-html/cad/__tests__/CADBus.test.cjs
node modules-html/cad/__tests__/L1_Floorplan.test.cjs
node shell/src/gates/__tests__/Gate.test.cjs
node shell/src/gates/__tests__/G1_Type.test.cjs
node shell/src/gates/__tests__/G2_G5.test.cjs
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs

# 9탭 회귀
node test-engine.js

# 모두 PASS면 PHASE_3D_COMPLETE 활성화
```

### 8-1. PHASE_3D_COMPLETE 활성화

`shell/src/feature-flags/flags.cjs`:
- `PHASE_3D_COMPLETE: false` → `true`
- `USE_ESTIMATE_V6:` 신설 (없으면) `false` 기본값 추가

### 8-2. flags 테스트 갱신

```javascript
// Test 1에 추가
assert(isEnabled('PHASE_3D_COMPLETE') === true, 'PHASE_3D_COMPLETE Week4 완료 true');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
```

---

## 작업 9: 커밋 (3개 분리)

```bash
# 커밋 1: 매트릭스 4개 (Sections + Spaces + Concept + Residence)
git add modules-html/estimate-v6/src/matrices/ modules-html/estimate-v6/__tests__/Sections.test.cjs modules-html/estimate-v6/__tests__/Spaces.test.cjs modules-html/estimate-v6/__tests__/ConceptMaterialMatrix.test.cjs modules-html/estimate-v6/__tests__/ResidenceMatrix.test.cjs
git commit -m "feat(v5.6/estimate-v6): 본 매트릭스 4종 (29/29 PASS)

- Sections: 22 시공섹션 (4그룹 + 공간 매핑) — 8/8
- Spaces: 23 공간 유형 (5그룹 + 메타) — 8/8
- ConceptMaterialMatrix: 12 컨셉 × 7 자재 = 84 매핑 — 7/7
- ResidenceMatrix: 6 주거 + 5 평형 (baseFactor) — 6/6"

# 커밋 2: CalcEngine v5.6 + E2E 견적
git add modules-html/estimate-v6/src/calc/ modules-html/estimate-v6/__tests__/CalcEngineV56.test.cjs modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs
git commit -m "feat(v5.6/estimate-v6): CalcEngine v5.6 보정계수 통합 + E2E (12 PASS)

- 공식: 공급 → 도급(×baseFactor×gradeMul×occupied×elevator) → 최종(×1.10 VAT)
- baseFactor 6 (주거형태별 0.95~1.25)
- gradeMul 12 (컨셉별 1.0~1.8)
- 거주중 가산 +10%
- 양중비 (4층+ 무엘) +5%
- E2E: 30평 아파트 + 클래식 + 35㎡ 시나리오"

# 커밋 3: PHASE_3D_COMPLETE 활성화
git add shell/src/feature-flags/
git commit -m "feat(v5.6/phase-3d): Phase 3 Week 4 완료 — PHASE_3D_COMPLETE = true (모든 회귀 PASS)"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 4 완료 (Phase 3-D 견적 모듈 격리)

[신규 모듈]
- modules-html/estimate-v6/src/matrices/Sections.cjs           — 22 섹션
- modules-html/estimate-v6/src/matrices/Spaces.cjs             — 23 공간
- modules-html/estimate-v6/src/matrices/ConceptMaterialMatrix.cjs — 12×7=84 매핑
- modules-html/estimate-v6/src/matrices/ResidenceMatrix.cjs    — 6 주거 + 5 평형
- modules-html/estimate-v6/src/calc/CalcEngineV56.cjs          — 보정계수 통합

[테스트 결과]
- Sections:                8/8 PASS
- Spaces:                  8/8 PASS
- ConceptMaterialMatrix:   7/7 PASS
- ResidenceMatrix:         6/6 PASS
- CalcEngineV56:          11/11 PASS
- E2E estimate v6:        PASS
- Week 1+2+3 회귀:        PASS
- test-engine:             5/5 PASS (회귀 0)

[검증 시나리오]
30평 아파트 + 클래식럭셔리 + 욕실/주방/거실 35㎡
→ 공급/도급/최종/㎡당/평당/마진율 모두 정상

[다음 주]
Phase 3 Week 5: KPI 분리 + 시스템 토폴로지 시각화
- @ecorean/kpi 분리
- modules-html/kpi-v6/ 신설
- Cytoscape 토폴로지 화면 (modules-html/topology/) 활성화
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- 단가 추정 — 실 단가는 cost_items DB LOAD만
- USE_ESTIMATE_V6 = true (Week 5에서도 false 유지, Week 8 첫 시공 검증 후 활성화)

---

**문서 끝.**
