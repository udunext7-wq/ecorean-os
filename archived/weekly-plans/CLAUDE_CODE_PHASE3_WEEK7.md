# ECOREAN BOC — Phase 3 Week 7 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 3452df5 (Week 6 완료)
> **이번 주 목표:** 한국 특수성 + NFR (Week 8 첫 시공 검증 준비)
> **소요:** 자율 실행 3~4시간

---

## 절대 규칙

1. TDD 강제
2. 버그 있는 코드 커밋 금지
3. 9탭 회귀 0건 검증
4. estimate.html · boc-shell.html 직접 수정 금지
5. 22/23/12/6/5 변경 금지
6. CalcEngine v5.6 기존 시그니처 변경 금지 (확장만)
7. rollback SQL 없는 DB 변경 금지

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # 3452df5 확인
git pull origin master

# Week 1~6 회귀
node shell/src/core-bus/__tests__/CoreBus.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node shell/src/gates/__tests__/Gate.test.cjs
node shell/src/gates/__tests__/G1_Type.test.cjs
node shell/src/gates/__tests__/G2_G5.test.cjs
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs
node modules-html/cad/__tests__/DrawingModel.test.cjs
node modules-html/estimate-v6/__tests__/Sections.test.cjs
node modules-html/estimate-v6/__tests__/CalcEngineV56.test.cjs
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs
node modules-html/kpi-v6/__tests__/KPIData.test.cjs
node modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs
node shell/src/meta/__tests__/MetaURI.test.cjs
node shell/src/meta/__tests__/Universe.test.cjs
node shell/src/meta/__tests__/JsonLD.test.cjs
node shell/src/meta/__tests__/RDFTriple.test.cjs
node test-engine.js
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조

```bash
mkdir -p shell/src/korea
mkdir -p shell/src/korea/__tests__
mkdir -p shell/src/security
mkdir -p shell/src/security/__tests__
```

---

## 작업 2: KS 자재 코드 매핑

### 2-1. shell/src/korea/KSCodeMapping.cjs

```javascript
// ECOREAN BOC v5.6 — KS 자재 코드 매핑
// SoT: docs/MASTER_PLAN.md §11 (자재 표준)
//
// KS = 한국 산업 표준 (Korean Industrial Standards)
// 본 매핑은 BOC 자재 카테고리 ↔ KS 코드 키워드만
// 실 KS 번호는 cost_items.ks_code 컬럼에 LOAD (단가 추정 금지)

// 자재 카테고리별 KS 표준 그룹 (KS L = 요업 / KS F = 건축 / KS M = 화학)
const KS_CATEGORY_MAP = {
  flooring: {
    name: '바닥재',
    ks_groups: ['KS F 3110', 'KS F 3111', 'KS M 3802'],   // 강화마루/원목/PVC
    types: {
      laminate:    { name: '강화마루',  ks: 'KS F 3110' },
      hardwood:    { name: '원목마루',  ks: 'KS F 3111' },
      vinyl:       { name: 'PVC 시트',  ks: 'KS M 3802' },
      tile:        { name: '타일',      ks: 'KS L 1001' }
    }
  },
  wallcovering: {
    name: '벽지',
    ks_groups: ['KS M 7305'],
    types: {
      paper:       { name: '종이벽지',  ks: 'KS M 7305' },
      silk:        { name: '실크벽지',  ks: 'KS M 7305' },
      paint:       { name: '도장',      ks: 'KS M 6010' }
    }
  },
  ceiling: {
    name: '천장재',
    ks_groups: ['KS F 3501'],
    types: {
      gypsum:      { name: '석고보드',  ks: 'KS F 3504' },
      paint:       { name: '도장',      ks: 'KS M 6010' }
    }
  },
  door: {
    name: '문',
    ks_groups: ['KS F 3109'],
    types: {
      wood:        { name: '목재 문',   ks: 'KS F 3109' },
      steel:       { name: '강제 문',   ks: 'KS F 4520' },
      sliding:     { name: '미닫이',    ks: 'KS F 3109' }
    }
  },
  window: {
    name: '창호',
    ks_groups: ['KS F 3117', 'KS F 3221'],
    types: {
      pvc:         { name: 'PVC 창',    ks: 'KS F 3117' },
      aluminum:    { name: '알루미늄',  ks: 'KS F 3221' },
      lowE:        { name: '로이유리',  ks: 'KS L 2003' }
    }
  },
  tile: {
    name: '타일',
    ks_groups: ['KS L 1001'],
    types: {
      ceramic:     { name: '도자기',    ks: 'KS L 1001' },
      porcelain:   { name: '자기',      ks: 'KS L 1001' },
      marble:      { name: '대리석',    ks: 'KS L 1106' }
    }
  },
  plumbing: {
    name: '배관',
    ks_groups: ['KS B 5301', 'KS B 5341'],
    types: {
      water:       { name: '급수관',    ks: 'KS B 5301' },
      drain:       { name: '배수관',    ks: 'KS B 5341' },
      gas:         { name: '가스관',    ks: 'KS B 5311' }
    }
  },
  electric: {
    name: '전기',
    ks_groups: ['KS C IEC 60364'],
    types: {
      wire:        { name: '전선',      ks: 'KS C IEC 60364' },
      outlet:      { name: '콘센트',    ks: 'KS C 8301' },
      switch:      { name: '스위치',    ks: 'KS C 8302' }
    }
  }
};

function getKSCategory(category) {
  return KS_CATEGORY_MAP[category] || null;
}

function getAllCategories() {
  return Object.keys(KS_CATEGORY_MAP);
}

function getKSCode(category, type) {
  const cat = KS_CATEGORY_MAP[category];
  if (!cat || !cat.types[type]) return null;
  return cat.types[type].ks;
}

function lookupByKSCode(ksCode) {
  const results = [];
  Object.keys(KS_CATEGORY_MAP).forEach(function(cat) {
    const c = KS_CATEGORY_MAP[cat];
    Object.keys(c.types).forEach(function(t) {
      if (c.types[t].ks === ksCode) {
        results.push({ category: cat, type: t, name: c.types[t].name });
      }
    });
  });
  return results;
}

// 검증 — KS 형식 (KS X 0000)
function isValidKSFormat(code) {
  if (typeof code !== 'string') return false;
  return /^KS\s+[A-Z]+(\s+IEC\s+\d+)?\s+\d+$/.test(code);
}

module.exports = {
  KS_CATEGORY_MAP: KS_CATEGORY_MAP,
  getKSCategory: getKSCategory,
  getAllCategories: getAllCategories,
  getKSCode: getKSCode,
  lookupByKSCode: lookupByKSCode,
  isValidKSFormat: isValidKSFormat
};
```

### 2-2. shell/src/korea/__tests__/KSCodeMapping.test.cjs

```javascript
const {
  KS_CATEGORY_MAP, getKSCategory, getAllCategories,
  getKSCode, lookupByKSCode, isValidKSFormat
} = require('../KSCodeMapping.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 8 카테고리
(function() {
  assert(getAllCategories().length === 8, '8 카테고리: ' + getAllCategories().length);
  assert(getAllCategories().includes('flooring'), 'flooring');
  assert(getAllCategories().includes('plumbing'), 'plumbing');
  assert(getAllCategories().includes('electric'), 'electric');
})();

// Test 2: 각 카테고리에 ks_groups + types
(function() {
  getAllCategories().forEach(function(cat) {
    const c = getKSCategory(cat);
    assert(Array.isArray(c.ks_groups), cat + ' ks_groups');
    assert(typeof c.types === 'object', cat + ' types');
  });
})();

// Test 3: getKSCode 정상
(function() {
  assert(getKSCode('flooring', 'laminate') === 'KS F 3110', '강화마루 KS');
  assert(getKSCode('tile', 'marble') === 'KS L 1106', '대리석 KS');
  assert(getKSCode('electric', 'wire') === 'KS C IEC 60364', 'IEC');
})();

// Test 4: 미정의 조회 null
(function() {
  assert(getKSCode('UNKNOWN', 'X') === null, '미정의 null');
})();

// Test 5: lookupByKSCode 역방향
(function() {
  const results = lookupByKSCode('KS L 1001');
  assert(results.length >= 2, 'KS L 1001은 도자기/자기 2종');
})();

// Test 6: KS 형식 검증
(function() {
  assert(isValidKSFormat('KS F 3110') === true, '표준 형식');
  assert(isValidKSFormat('KS C IEC 60364') === true, 'IEC 형식');
  assert(isValidKSFormat('invalid') === false, '잘못된 형식');
  assert(isValidKSFormat('KS') === false, '미완성');
})();

// Test 7: 모든 정의된 KS 코드가 형식 검증 통과
(function() {
  let total = 0;
  let valid = 0;
  getAllCategories().forEach(function(cat) {
    const c = getKSCategory(cat);
    Object.keys(c.types).forEach(function(t) {
      total++;
      if (isValidKSFormat(c.types[t].ks)) valid++;
    });
  });
  assert(total === valid, '모든 KS 코드 형식 통과: ' + valid + '/' + total);
})();

console.log('[PASS] KSCodeMapping (7/7)');
```

### 2-3. 검증

```bash
node shell/src/korea/__tests__/KSCodeMapping.test.cjs
# 기대: [PASS] KSCodeMapping (7/7)
```

---

## 작업 3: 지역별 단가 보정

### 3-1. shell/src/korea/RegionFactor.cjs

```javascript
// ECOREAN BOC v5.6 — 지역별 단가 보정
// SoT: docs/MASTER_PLAN.md §107 (보정계수)
//
// 지역 분류:
//   SEOUL_GANGNAM: 강남 3구 (강남/서초/송파) — 1.20
//   SEOUL_OTHER:   서울 기타 — 1.10
//   METRO_BUSAN:   부산 — 1.05
//   METRO_OTHER:   광역시 기타 (대구/인천/대전/광주/울산) — 1.00
//   PROVINCE_MAJOR: 도청소재지 — 0.95
//   PROVINCE_OTHER: 기타 지방 — 0.90
//   JEJU:          제주 (운반비) — 1.15

const REGION_FACTORS = {
  SEOUL_GANGNAM:  { name: '서울 강남3구', factor: 1.20, areas: ['강남구','서초구','송파구'] },
  SEOUL_OTHER:    { name: '서울 기타',    factor: 1.10, areas: ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','강동구'] },
  METRO_BUSAN:    { name: '부산',         factor: 1.05, areas: ['부산'] },
  METRO_OTHER:    { name: '광역시',       factor: 1.00, areas: ['대구','인천','대전','광주','울산'] },
  PROVINCE_MAJOR: { name: '도청소재지',   factor: 0.95, areas: ['수원','춘천','청주','전주','창원','포항'] },
  PROVINCE_OTHER: { name: '기타 지방',    factor: 0.90, areas: [] },
  JEJU:           { name: '제주',         factor: 1.15, areas: ['제주','서귀포'] }
};

function getRegionByArea(area) {
  if (!area) return null;
  const upper = area.toString();

  for (let regionId in REGION_FACTORS) {
    const region = REGION_FACTORS[regionId];
    if (region.areas.some(function(a) { return upper.includes(a); })) {
      return regionId;
    }
  }
  return 'PROVINCE_OTHER';   // 기본값
}

function getRegionFactor(regionId) {
  const r = REGION_FACTORS[regionId];
  return r ? r.factor : 1.0;
}

function getRegionFactorByArea(area) {
  const regionId = getRegionByArea(area);
  return getRegionFactor(regionId);
}

function getAllRegions() {
  return Object.keys(REGION_FACTORS);
}

module.exports = {
  REGION_FACTORS: REGION_FACTORS,
  getRegionByArea: getRegionByArea,
  getRegionFactor: getRegionFactor,
  getRegionFactorByArea: getRegionFactorByArea,
  getAllRegions: getAllRegions
};
```

### 3-2. shell/src/korea/__tests__/RegionFactor.test.cjs

```javascript
const {
  REGION_FACTORS, getRegionByArea, getRegionFactor,
  getRegionFactorByArea, getAllRegions
} = require('../RegionFactor.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 7 지역
(function() {
  assert(getAllRegions().length === 7, '7 지역');
})();

// Test 2: 강남 1.20
(function() {
  assert(getRegionFactor('SEOUL_GANGNAM') === 1.20, '강남 1.20');
})();

// Test 3: 지역 자동 매핑 — 강남구
(function() {
  assert(getRegionByArea('서울특별시 강남구') === 'SEOUL_GANGNAM', '강남구 매핑');
  assert(getRegionByArea('서초구') === 'SEOUL_GANGNAM', '서초구 매핑');
  assert(getRegionByArea('송파구') === 'SEOUL_GANGNAM', '송파구 매핑');
})();

// Test 4: 서울 기타
(function() {
  assert(getRegionByArea('서울 마포구') === 'SEOUL_OTHER', '마포구');
  assert(getRegionByArea('영등포구') === 'SEOUL_OTHER', '영등포구');
})();

// Test 5: 광역시
(function() {
  assert(getRegionByArea('부산') === 'METRO_BUSAN', '부산');
  assert(getRegionByArea('대구광역시') === 'METRO_OTHER', '대구');
})();

// Test 6: 제주 운반비
(function() {
  assert(getRegionFactorByArea('제주특별자치도 제주시') === 1.15, '제주 1.15');
})();

// Test 7: 기타 지방 기본값
(function() {
  assert(getRegionByArea('알수없는동네') === 'PROVINCE_OTHER', '기본 지방');
  assert(getRegionFactor('PROVINCE_OTHER') === 0.90, '지방 0.90');
})();

// Test 8: 도청소재지
(function() {
  assert(getRegionByArea('수원시') === 'PROVINCE_MAJOR', '수원 도청');
  assert(getRegionFactor('PROVINCE_MAJOR') === 0.95, '도청 0.95');
})();

console.log('[PASS] RegionFactor (8/8)');
```

### 3-3. 검증

```bash
node shell/src/korea/__tests__/RegionFactor.test.cjs
# 기대: [PASS] RegionFactor (8/8)
```

---

## 작업 4: 한국 건축법 룰

### 4-1. shell/src/korea/KoreaBuildingRules.cjs

```javascript
// ECOREAN BOC v5.6 — 한국 건축법 특수 룰
// SoT: docs/MASTER_PLAN.md §50~§90 (절대 룰)
//
// 본 룰은 한국 시공 환경의 절대 규칙
// 위반 시 법적/안전 문제 → CalcEngine 적용 시 자동 검증

const RULES = {
  // 방수 — 욕실/발코니/지하 (절대 룰: AUTO 금지·CONDITIONAL만)
  WATERPROOF: {
    id: 'WATERPROOF',
    name: '방수 처리',
    spaces: ['BATHROOM','POWDER_ROOM','BALCONY','TERRACE','ROOFTOP','BASEMENT','UTILITY'],
    type: 'CONDITIONAL',                  // AUTO 금지
    requires: ['NEEDS_CONFIRMATION'],     // 확인 필수
    legal: '건축법 시행령 제51조 (방수 의무)'
  },

  // 단독주택 외장 — 단열재 의무
  EXTERIOR_INSULATION: {
    id: 'EXTERIOR_INSULATION',
    name: '외장 단열재',
    residences: ['DETACHED_1F','DETACHED_2F','PENTHOUSE'],
    type: 'CONDITIONAL',
    requires: ['HEAT_LOSS_SPEC'],
    legal: '에너지절약설계기준 (KAEC)'
  },

  // 가스 — 가스배관 + 환기구 의무
  GAS_INSTALLATION: {
    id: 'GAS_INSTALLATION',
    name: '가스 시공',
    spaces: ['KITCHEN','BOILER'],
    type: 'CONDITIONAL',
    requires: ['LICENSED_INSTALLER','VENTILATION'],
    legal: '도시가스사업법'
  },

  // 환기 — 욕실/주방 기계환기 의무
  VENTILATION_MECH: {
    id: 'VENTILATION_MECH',
    name: '기계환기',
    spaces: ['BATHROOM','POWDER_ROOM','KITCHEN','BOILER','UTILITY','GARAGE'],
    type: 'CONDITIONAL',
    requires: ['VENT_SPEC'],
    legal: '건축물의 설비기준 등에 관한 규칙'
  },

  // 4층 이상 — 양중 의무
  HEIGHT_LIFTING: {
    id: 'HEIGHT_LIFTING',
    name: '양중비 (4층 이상 무엘리베이터)',
    condition: function(ctx) {
      return ctx.floorLevel >= 4 && !ctx.hasElev;
    },
    type: 'AUTO',                         // 자동 적용
    factor: 1.05,                          // ×5%
    legal: '산업안전보건법 (작업환경)'
  },

  // 거주중 시공 — 가산
  OCCUPIED_SURCHARGE: {
    id: 'OCCUPIED_SURCHARGE',
    name: '거주중 시공',
    condition: function(ctx) {
      return ctx.occupied === true;
    },
    type: 'AUTO',
    factor: 1.10,                          // ×10%
    legal: '주거안정 보호 (가구 보양/이동 비용)'
  },

  // 외주 자격 — 전기/가스/소방 (자격 보유자만)
  LICENSED_TRADES: {
    id: 'LICENSED_TRADES',
    name: '자격 시공',
    sections: ['electric','plumbing'],
    type: 'CONDITIONAL',
    requires: ['LICENSED_CONTRACTOR'],
    legal: '건설산업기본법'
  }
};

// 룰 ID 조회
function getRule(id) {
  return RULES[id] || null;
}

function getAllRuleIds() {
  return Object.keys(RULES);
}

// 공간/섹션에 적용되는 룰 자동 추출
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

// AUTO 룰만 평가 (CalcEngine 통합용)
function evaluateAutoRules(context) {
  const applied = [];
  Object.keys(RULES).forEach(function(id) {
    const r = RULES[id];
    if (r.type === 'AUTO' && typeof r.condition === 'function') {
      if (r.condition(context)) {
        applied.push({
          id: id,
          name: r.name,
          factor: r.factor,
          legal: r.legal
        });
      }
    }
  });
  return applied;
}

// CONDITIONAL 룰 — NEEDS_CONFIRMATION 추출
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
```

### 4-2. shell/src/korea/__tests__/KoreaBuildingRules.test.cjs

```javascript
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
```

### 4-3. 검증

```bash
node shell/src/korea/__tests__/KoreaBuildingRules.test.cjs
# 기대: [PASS] KoreaBuildingRules (10/10)
```

---

## 작업 5: 백업·복구 자동화

### 5-1. scripts/backup.cjs

```javascript
#!/usr/bin/env node
// ECOREAN BOC v5.6 — 자동 백업
// 사용: node scripts/backup.cjs [--label "설명"]
// 결과: ecorean-boc.db.bak.YYYYMMDD-HHMMSS-LABEL

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ecorean-boc.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function timestamp() {
  const d = new Date();
  return d.getFullYear()
    + pad(d.getMonth() + 1)
    + pad(d.getDate())
    + '-'
    + pad(d.getHours())
    + pad(d.getMinutes())
    + pad(d.getSeconds());
}

function getLabel() {
  const idx = process.argv.indexOf('--label');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].replace(/[^a-zA-Z0-9_-]/g, '_');
  return 'auto';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('[FAIL] DB 파일 없음: ' + DB_PATH);
    process.exit(1);
  }
  ensureDir(BACKUP_DIR);
  const label = getLabel();
  const filename = 'ecorean-boc.db.bak.' + timestamp() + '-' + label;
  const dest = path.join(BACKUP_DIR, filename);
  fs.copyFileSync(DB_PATH, dest);

  const stat = fs.statSync(dest);
  console.log('[PASS] 백업 완료');
  console.log('  파일: backups/' + filename);
  console.log('  크기: ' + (stat.size / 1024).toFixed(1) + ' KB');
  return dest;
}

// 오래된 백업 정리 (30일 이상, 자동 보존 정책)
function pruneOldBackups(retentionDays) {
  const days = retentionDays || 30;
  if (!fs.existsSync(BACKUP_DIR)) return 0;

  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(BACKUP_DIR);
  let pruned = 0;
  files.forEach(function(f) {
    if (!f.startsWith('ecorean-boc.db.bak.')) return;
    const fp = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fp);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(fp);
      pruned++;
    }
  });
  if (pruned > 0) console.log('  정리: ' + pruned + '건 (>' + days + '일)');
  return pruned;
}

if (require.main === module) {
  backup();
  pruneOldBackups(30);
}

module.exports = { backup: backup, pruneOldBackups: pruneOldBackups };
```

### 5-2. scripts/restore.cjs

```javascript
#!/usr/bin/env node
// ECOREAN BOC v5.6 — 백업 복구
// 사용: node scripts/restore.cjs <backup-filename>
//   예: node scripts/restore.cjs ecorean-boc.db.bak.20260428-143000-pre_week8

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ecorean-boc.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('백업 폴더 없음');
    return [];
  }
  return fs.readdirSync(BACKUP_DIR)
    .filter(function(f) { return f.startsWith('ecorean-boc.db.bak.'); })
    .sort()
    .reverse();
}

function restore(filename) {
  if (!filename) {
    console.log('사용: node scripts/restore.cjs <backup-filename>');
    console.log('\n사용 가능한 백업:');
    listBackups().slice(0, 10).forEach(function(f) {
      console.log('  ' + f);
    });
    process.exit(1);
  }

  const src = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(src)) {
    console.error('[FAIL] 백업 파일 없음: ' + filename);
    process.exit(1);
  }

  // 현재 DB를 안전 백업
  if (fs.existsSync(DB_PATH)) {
    const safeBak = DB_PATH + '.before-restore';
    fs.copyFileSync(DB_PATH, safeBak);
    console.log('  현재 DB 안전 백업: ' + path.basename(safeBak));
  }

  fs.copyFileSync(src, DB_PATH);
  console.log('[PASS] 복구 완료');
  console.log('  소스: ' + filename);
}

if (require.main === module) {
  restore(process.argv[2]);
}

module.exports = { restore: restore, listBackups: listBackups };
```

### 5-3. 검증

```bash
# 백업 실행
node scripts/backup.cjs --label test_week7
# 기대: [PASS] 백업 완료 + 파일 크기 + 정리 0건

# 백업 목록 확인
ls -la backups/

# 복구 (실행 안 함, 사용법만 확인)
node scripts/restore.cjs
# 기대: 사용 가능한 백업 목록 표시
```

---

## 작업 6: 개인정보 암호화 (고객 DB 보호)

### 6-1. shell/src/security/Encryption.cjs

```javascript
// ECOREAN BOC v5.6 — 개인정보 암호화
// SoT: NFR 보안 (개인정보보호법 준수)
//
// 대상: 고객 이름, 전화번호, 주소, 주민등록번호 일부
// 알고리즘: AES-256-GCM (인증된 암호화)

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;        // 256-bit
const IV_LENGTH = 12;          // 96-bit (GCM 권장)
const TAG_LENGTH = 16;

// 키 파생 — 운영 환경에서는 별도 키 관리 시스템(KMS) 사용
function deriveKey(masterKey, salt) {
  if (!masterKey) throw new Error('마스터 키 필수');
  return crypto.scryptSync(masterKey, salt || 'ecorean-boc-v5.6', KEY_LENGTH);
}

function encrypt(plaintext, masterKey) {
  if (plaintext == null || plaintext === '') return '';
  const key = deriveKey(masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  // 형식: [iv].[tag].[encrypted]  base64
  return iv.toString('base64') + '.' + tag.toString('base64') + '.' + encrypted.toString('base64');
}

function decrypt(ciphertext, masterKey) {
  if (!ciphertext) return '';
  const parts = ciphertext.split('.');
  if (parts.length !== 3) throw new Error('잘못된 암호화 형식');

  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');

  const key = deriveKey(masterKey);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

// 마스킹 (로그 출력용)
function mask(value, type) {
  if (!value) return '';
  switch (type) {
    case 'phone':
      // 010-1234-5678 → 010-****-5678
      return String(value).replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
    case 'email':
      // user@example.com → u***@example.com
      return String(value).replace(/^(.)(.+)(@.+)$/, '$1***$3');
    case 'name':
      // 홍길동 → 홍*동
      const s = String(value);
      if (s.length <= 1) return s;
      if (s.length === 2) return s[0] + '*';
      return s[0] + '*'.repeat(s.length - 2) + s.slice(-1);
    case 'rrn':
      // 주민번호 991231-1234567 → 991231-1******
      return String(value).replace(/(\d{6})-?(\d)(\d{6})/, '$1-$2******');
    default:
      return '***';
  }
}

// 해시 (검색용 단방향)
function hash(value, salt) {
  if (!value) return '';
  return crypto.createHash('sha256').update((salt || '') + String(value)).digest('hex');
}

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  mask: mask,
  hash: hash,
  ALGORITHM: ALGORITHM
};
```

### 6-2. shell/src/security/__tests__/Encryption.test.cjs

```javascript
const { encrypt, decrypt, mask, hash } = require('../Encryption.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

const TEST_KEY = 'test-master-key-for-week7';

// Test 1: 암호화 → 복호화 라운드트립
(function() {
  const original = '홍길동';
  const enc = encrypt(original, TEST_KEY);
  assert(enc !== original, '암호화 결과 다름');
  assert(enc.includes('.'), '구분자 포함');
  const dec = decrypt(enc, TEST_KEY);
  assert(dec === original, '복호화 일치');
})();

// Test 2: 한국어 + 특수문자
(function() {
  const original = '서울특별시 강남구 역삼동 123-45 (주소)';
  const enc = encrypt(original, TEST_KEY);
  const dec = decrypt(enc, TEST_KEY);
  assert(dec === original, '한국어 라운드트립');
})();

// Test 3: 빈 값
(function() {
  assert(encrypt('', TEST_KEY) === '', '빈 문자열');
  assert(encrypt(null, TEST_KEY) === '', 'null');
  assert(decrypt('', TEST_KEY) === '', '빈 ciphertext');
})();

// Test 4: 잘못된 키 → 복호화 실패
(function() {
  const enc = encrypt('비밀데이터', TEST_KEY);
  let threw = false;
  try { decrypt(enc, 'wrong-key'); } catch(e) { threw = true; }
  assert(threw, '잘못된 키 throw');
})();

// Test 5: 매번 다른 IV (같은 평문이라도 암호문 다름)
(function() {
  const enc1 = encrypt('동일평문', TEST_KEY);
  const enc2 = encrypt('동일평문', TEST_KEY);
  assert(enc1 !== enc2, '매번 다른 암호문');
})();

// Test 6: 마스킹 — 전화번호
(function() {
  assert(mask('010-1234-5678', 'phone') === '010-****-5678', '전화 마스크');
  assert(mask('01012345678', 'phone') === '010-****-5678', '하이픈 없는 전화');
})();

// Test 7: 마스킹 — 이메일
(function() {
  assert(mask('user@example.com', 'email') === 'u***@example.com', '이메일 마스크');
})();

// Test 8: 마스킹 — 이름
(function() {
  assert(mask('홍길동', 'name') === '홍*동', '3자 이름');
  assert(mask('김철수영', 'name') === '김**영', '4자 이름');
  assert(mask('김철', 'name') === '김*', '2자 이름');
})();

// Test 9: 해시 (단방향, 검색용)
(function() {
  const h1 = hash('010-1234-5678');
  const h2 = hash('010-1234-5678');
  assert(h1 === h2, '같은 입력 같은 해시');
  assert(h1 !== '010-1234-5678', '평문 노출 X');
  assert(h1.length === 64, 'SHA-256 hex 64자');
})();

console.log('[PASS] Encryption (9/9)');
```

### 6-3. 검증

```bash
node shell/src/security/__tests__/Encryption.test.cjs
# 기대: [PASS] Encryption (9/9)
```

---

## 작업 7: 통합 테스트 — Phase 3-G Gate Test

```bash
# Week 7 신규
node shell/src/korea/__tests__/KSCodeMapping.test.cjs        # 7/7
node shell/src/korea/__tests__/RegionFactor.test.cjs          # 8/8
node shell/src/korea/__tests__/KoreaBuildingRules.test.cjs    # 10/10
node shell/src/security/__tests__/Encryption.test.cjs         # 9/9
node scripts/backup.cjs --label test_week7                    # 백업 PASS

# 누적 회귀 (Week 1~6)
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
node modules-html/estimate-v6/__tests__/Sections.test.cjs
node modules-html/estimate-v6/__tests__/Spaces.test.cjs
node modules-html/estimate-v6/__tests__/ConceptMaterialMatrix.test.cjs
node modules-html/estimate-v6/__tests__/ResidenceMatrix.test.cjs
node modules-html/estimate-v6/__tests__/CalcEngineV56.test.cjs
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs
node modules-html/kpi-v6/__tests__/KPIData.test.cjs
node modules-html/kpi-v6/__tests__/KPIBus.test.cjs
node modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs
node shell/src/meta/__tests__/MetaURI.test.cjs
node shell/src/meta/__tests__/Universe.test.cjs
node shell/src/meta/__tests__/JsonLD.test.cjs
node shell/src/meta/__tests__/RDFTriple.test.cjs
node test-engine.js
```

### 7-1. PHASE_3G_COMPLETE 활성화

`shell/src/feature-flags/flags.cjs`:
- `PHASE_3G_COMPLETE: false` → `true`

### 7-2. flags 테스트 갱신

```javascript
// Test 1에 추가
assert(isEnabled('PHASE_3G_COMPLETE') === true, 'PHASE_3G_COMPLETE Week7 완료 true');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
```

---

## 작업 8: 커밋 (3개 분리)

```bash
# 커밋 1: 한국 매트릭스 3종
git add shell/src/korea/
git commit -m "feat(v5.6/korea): 한국 특수성 3종 매트릭스 (25/25 PASS)

- KSCodeMapping: 8 카테고리 KS 표준 코드 (KS F/L/M/B/C IEC)
- RegionFactor: 7 지역 보정 (강남 1.20 / 제주 1.15 / 지방 0.90)
- KoreaBuildingRules: 7 건축법 룰 (방수 CONDITIONAL 절대룰 포함)
- AUTO 룰: 양중 ×1.05, 거주중 ×1.10
- CONDITIONAL 룰: 방수, 외장단열, 가스, 환기, 자격시공
- KS 7/7 + Region 8/8 + Building 10/10 PASS"

# 커밋 2: 백업 + 보안
git add scripts/backup.cjs scripts/restore.cjs shell/src/security/
git commit -m "feat(v5.6/nfr): 백업·복구 자동화 + 개인정보 암호화 (9/9 PASS)

- scripts/backup.cjs: 자동 라벨 + 30일 보존 정책
- scripts/restore.cjs: 사전 안전 백업 + 복구
- backups/ 디렉토리 자동 생성
- Encryption: AES-256-GCM (인증 암호화)
- mask: 전화/이메일/이름/주민번호 마스킹
- hash: SHA-256 단방향 (검색용)
- Encryption 9/9 PASS"

# 커밋 3: PHASE_3G_COMPLETE 활성화
git add shell/src/feature-flags/
git commit -m "feat(v5.6/phase-3g): Phase 3 Week 7 완료 — PHASE_3G_COMPLETE = true (한국 특수성 + NFR)"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 7 완료 (Phase 3-G 한국 특수성 + NFR)

[신규 모듈]
- shell/src/korea/KSCodeMapping.cjs        — 8 카테고리 KS 표준
- shell/src/korea/RegionFactor.cjs          — 7 지역 보정
- shell/src/korea/KoreaBuildingRules.cjs    — 7 건축법 룰
- shell/src/security/Encryption.cjs         — AES-256-GCM
- scripts/backup.cjs                        — 자동 백업 + 30일 정책
- scripts/restore.cjs                       — 안전 복구

[테스트 결과]
- KSCodeMapping:        7/7 PASS
- RegionFactor:         8/8 PASS
- KoreaBuildingRules:   10/10 PASS
- Encryption:           9/9 PASS
- 백업·복구:            PASS
- 누적 회귀 (Week 1~6): PASS
- test-engine:          5/5 PASS

[한국 시장 적용 완료]
- KS 자재 코드: KS F 3110(강화마루) / KS L 1106(대리석) / KS C IEC 60364(전기) 등
- 지역 보정: 강남 ×1.20 / 서울기타 ×1.10 / 광역시 ×1.00 / 지방 ×0.90 / 제주 ×1.15
- AUTO 룰: 4층 무엘 양중 ×1.05 / 거주중 ×1.10
- CONDITIONAL 룰: 방수(절대 룰) / 외장단열 / 가스 / 환기 / 자격시공

[NFR 활성화]
✅ 백업: 자동 + 30일 보존 정책
✅ 복구: 사전 안전 백업 + 명령행 도구
✅ 암호화: AES-256-GCM (개인정보보호법 준수)

[다음 주 — Critical]
Phase 3 Week 8: 첫 시공 1건 검증 (실거래)
- 견적 → 계약 → 발주 → 공정 → 검수 전 흐름 BOC 통과
- ML Phase 1 진입 데이터 확보
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- CalcEngineV56 시그니처 변경 (확장만 가능)
- 방수를 AUTO 룰로 분류 (절대 룰 위반)

---

**문서 끝.**
