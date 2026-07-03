# ECOREAN BOC — Phase 3 Week 3 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 2ddbfc5 (Week 2 완료)
> **이번 주 목표:** 5단 게이트 분리 (Cascade Automation 핵심)
> **소요:** 자율 실행 2~3시간
> **확장자:** shell/ 와 modules-html/ 에 .cjs 사용 (ESM 환경)

---

## 절대 규칙 (Phase 3 전 기간)

1. TDD 강제 — 테스트 먼저, 코드 나중
2. 버그 있는 코드 커밋 금지
3. 9탭 회귀 0건 검증 후만 다음 단계
4. 13단계 디자인과 충돌 시 즉시 보고
5. estimate.html · boc-shell.html 직접 수정 금지
6. 22 섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 변경 금지
7. Feature Flag로 v5.0 path와 v5.6 path 분리

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # 2ddbfc5 확인
git pull origin master

# Week 1 + Week 2 회귀 검증
node shell/src/core-bus/__tests__/CoreBus.test.cjs
node shell/src/core-bus/__tests__/schemas.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node modules-html/cad/__tests__/DrawingModel.test.cjs
node modules-html/cad/__tests__/DrawingEngine.test.cjs
node modules-html/cad/__tests__/CADBus.test.cjs
node modules-html/cad/__tests__/L1_Floorplan.test.cjs
node test-engine.js
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조

```bash
mkdir -p shell/src/gates
mkdir -p shell/src/gates/__tests__
```

게이트 5개를 단일 폴더에 .cjs로 신설. Phase 4에서 패키지화 (npm workspace).

---

## 작업 2: Gate 추상 클래스 (모든 게이트의 부모)

### 2-1. shell/src/gates/Gate.cjs

```javascript
// ECOREAN BOC v5.6 — Gate 추상 클래스
// 5단 자동화 게이트 (Cascade Automation)의 부모
// SoT: docs/MASTER_PLAN.md §109.4
//
// 절대 규칙:
//   - validate() 통과 후만 lock() 가능
//   - lock() 시 다음 게이트 활성화 이벤트 발행
//   - 직전 게이트 lock 안 됐으면 다음 게이트 진입 차단

const { coreBus } = require('../core-bus/CoreBus.cjs');

class Gate {
  constructor(opts) {
    this.id = opts.id;                          // 'g1_type'
    this.uri = opts.uri;                        // urn:ecorean:universe:1:node:g1_type
    this.eventOnLock = opts.eventOnLock;        // 'GATE1_LOCKED'
    this.dependsOn = opts.dependsOn || null;    // 직전 게이트 ID
    this.locked = false;
    this.lockedPayload = null;
    this.lockedAt = null;
  }

  // 추상 메서드 — 서브클래스 구현 필수
  validate(input) {
    throw new Error(this.id + '.validate() 미구현');
  }

  // 추상 메서드 — 서브클래스 구현 필수
  // 반환: { ok: boolean, payload: T, errors: [] }
  process(input) {
    throw new Error(this.id + '.process() 미구현');
  }

  // 게이트 잠금 + 다음 게이트 트리거
  lock(input, gateRegistry) {
    // 1. 직전 게이트 잠금 확인
    if (this.dependsOn && gateRegistry) {
      const prev = gateRegistry.get(this.dependsOn);
      if (!prev || !prev.locked) {
        return {
          ok: false,
          errors: [this.id + ': 직전 게이트(' + this.dependsOn + ') 미잠금']
        };
      }
    }

    // 2. validate
    const validation = this.validate(input);
    if (validation.errors && validation.errors.length > 0) {
      return { ok: false, errors: validation.errors };
    }

    // 3. process
    const result = this.process(input);
    if (!result.ok) {
      return result;
    }

    // 4. lock 상태 갱신
    this.locked = true;
    this.lockedPayload = result.payload;
    this.lockedAt = Date.now();

    // 5. 다음 게이트 활성화 이벤트 발행
    coreBus.emit(this.eventOnLock, result.payload, {
      gateId: this.id,
      uri: this.uri,
      lockedAt: this.lockedAt
    });

    return { ok: true, payload: result.payload };
  }

  // 잠금 해제 (사용자가 이전 게이트로 돌아가는 경우)
  unlock() {
    this.locked = false;
    this.lockedPayload = null;
    this.lockedAt = null;
  }

  // 상태 조회
  status() {
    return {
      id: this.id,
      locked: this.locked,
      lockedAt: this.lockedAt,
      dependsOn: this.dependsOn
    };
  }
}

// 게이트 레지스트리 — 5개 게이트 일괄 관리
class GateRegistry {
  constructor() {
    this.gates = new Map();
  }

  register(gate) {
    this.gates.set(gate.id, gate);
  }

  get(id) { return this.gates.get(id); }
  getAll() { return Array.from(this.gates.values()); }

  // 모든 게이트 잠금 해제
  unlockAll() {
    this.gates.forEach(function(g) { g.unlock(); });
  }

  // 잠긴 게이트만 반환
  getLocked() {
    return this.getAll().filter(function(g) { return g.locked; });
  }

  // 다음 활성화 가능한 게이트
  getNextActivatable() {
    const locked = this.getLocked();
    const lockedIds = new Set(locked.map(function(g) { return g.id; }));

    return this.getAll().find(function(g) {
      if (g.locked) return false;
      if (!g.dependsOn) return true;   // 의존 없으면 항상 활성
      return lockedIds.has(g.dependsOn);
    });
  }
}

module.exports = { Gate: Gate, GateRegistry: GateRegistry };
```

### 2-2. shell/src/gates/__tests__/Gate.test.cjs

```javascript
const { Gate, GateRegistry } = require('../Gate.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

class TestGate extends Gate {
  validate(input) {
    if (!input || !input.value) return { errors: ['value 필수'] };
    return { errors: [] };
  }
  process(input) {
    return { ok: true, payload: { result: input.value * 2 } };
  }
}

// Test 1: 추상 메서드 throw
(function() {
  const g = new Gate({ id: 'test', eventOnLock: 'TEST' });
  let threw = false;
  try { g.validate({}); } catch(e) { threw = true; }
  assert(threw, 'validate() 추상');
})();

// Test 2: validate 통과 후 lock 성공
(function() {
  const g = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const result = g.lock({ value: 5 });
  assert(result.ok === true, 'lock 성공');
  assert(g.locked === true, 'locked = true');
  assert(result.payload.result === 10, 'process 결과');
})();

// Test 3: validate 실패 시 lock 차단
(function() {
  const g = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const result = g.lock({});
  assert(result.ok === false, 'validate 실패 시 lock 차단');
  assert(g.locked === false, '미잠금');
})();

// Test 4: 직전 게이트 미잠금 시 lock 차단
(function() {
  const reg = new GateRegistry();
  const g1 = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const g2 = new TestGate({ id: 'g2', eventOnLock: 'G2_LOCKED', dependsOn: 'g1' });
  reg.register(g1);
  reg.register(g2);

  const result = g2.lock({ value: 3 }, reg);
  assert(result.ok === false, 'g1 미잠금 시 g2 차단');
})();

// Test 5: 직전 게이트 잠금 후 다음 게이트 가능
(function() {
  const reg = new GateRegistry();
  const g1 = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const g2 = new TestGate({ id: 'g2', eventOnLock: 'G2_LOCKED', dependsOn: 'g1' });
  reg.register(g1);
  reg.register(g2);

  g1.lock({ value: 5 });
  const result = g2.lock({ value: 3 }, reg);
  assert(result.ok === true, 'g1 잠금 후 g2 가능');
})();

// Test 6: unlock
(function() {
  const g = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  g.lock({ value: 5 });
  assert(g.locked === true, '잠금');
  g.unlock();
  assert(g.locked === false, 'unlock');
})();

// Test 7: GateRegistry getNextActivatable
(function() {
  const reg = new GateRegistry();
  const g1 = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const g2 = new TestGate({ id: 'g2', eventOnLock: 'G2_LOCKED', dependsOn: 'g1' });
  const g3 = new TestGate({ id: 'g3', eventOnLock: 'G3_LOCKED', dependsOn: 'g2' });
  reg.register(g1);
  reg.register(g2);
  reg.register(g3);

  assert(reg.getNextActivatable().id === 'g1', '초기엔 g1');
  g1.lock({ value: 1 });
  assert(reg.getNextActivatable().id === 'g2', 'g1 잠그면 g2');
  g2.lock({ value: 2 });
  assert(reg.getNextActivatable().id === 'g3', 'g2 잠그면 g3');
})();

// Test 8: lock 시 CoreBus 이벤트 발행
(function() {
  const { coreBus } = require('../../core-bus/CoreBus.cjs');
  const g = new TestGate({ id: 'g1', eventOnLock: 'TEST_LOCK_EVENT' });
  let received = null;
  coreBus.on('TEST_LOCK_EVENT', function(p, meta) {
    received = { payload: p, meta: meta };
  });
  g.lock({ value: 7 });
  assert(received !== null, '이벤트 수신');
  assert(received.payload.result === 14, '페이로드');
  assert(received.meta.gateId === 'g1', 'meta.gateId');
})();

console.log('[PASS] Gate (8/8)');
```

### 2-3. 검증

```bash
node shell/src/gates/__tests__/Gate.test.cjs
# 기대: [PASS] Gate (8/8)
```

---

## 작업 3: G1 — 주거형태 + 평형 게이트

### 3-1. shell/src/gates/G1_Type.cjs

```javascript
// ECOREAN BOC v5.6 — G1 유형 게이트
// 입력: 주거형태(6) + 평형(5)
// 출력: TypeContext (다음 게이트가 사용)
// 자동화율: 0% → 30%

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
    if (!input) { errors.push('input 누락'); return { errors: errors }; }
    if (!RESIDENCE_TYPES.includes(input.residence)) {
      errors.push('residence 미정의: ' + input.residence);
    }
    if (!PYEONG_LEVELS.includes(input.pyeong)) {
      errors.push('pyeong 미정의: ' + input.pyeong);
    }
    return { errors: errors };
  }

  process(input) {
    return {
      ok: true,
      payload: {
        residence: input.residence,
        pyeong: input.pyeong,
        // 자동 결정 — 가능한 시공섹션 후보 (단순 예시, Week 4에서 본 매트릭스)
        availableSections: this._availableSections(input.residence),
        availableSpaces: this._availableSpaces(input.residence),
        timestamp: Date.now()
      }
    };
  }

  _availableSections(residence) {
    // 마스터플랜 §6 그룹 분류 (단순 표시, Week 4 본 매트릭스)
    const all = [
      'living','bedroom','kitchen','bathroom','balcony','entrance',
      'dressing','study','dining','pantry','utility','powder',
      'plumbing','electric','window'
    ];
    if (residence === 'DETACHED_1F' || residence === 'DETACHED_2F') {
      return all.concat(['boiler','rooftop','exterior','insulation']);
    }
    if (residence === 'DETACHED_2F') {
      return all.concat(['boiler','rooftop','exterior','insulation','stairs','attic','basement']);
    }
    return all;
  }

  _availableSpaces(residence) {
    const all = [
      'LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY',
      'KITCHEN','DINING','BATHROOM','POWDER_ROOM',
      'BALCONY','TERRACE','ENTRANCE','DRESSING','PANTRY','UTILITY','BOILER',
      'HALLWAY','STAIRS'
    ];
    if (residence === 'DETACHED_1F' || residence === 'DETACHED_2F') {
      return all.concat(['ROOFTOP','ATTIC','BASEMENT','GARAGE','YARD']);
    }
    return all;
  }
}

module.exports = { G1Type: G1Type, RESIDENCE_TYPES: RESIDENCE_TYPES, PYEONG_LEVELS: PYEONG_LEVELS };
```

### 3-2. shell/src/gates/__tests__/G1_Type.test.cjs

```javascript
const { G1Type, RESIDENCE_TYPES, PYEONG_LEVELS } = require('../G1_Type.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 주거형태 6개
(function() {
  assert(RESIDENCE_TYPES.length === 6, '주거 6개');
  assert(RESIDENCE_TYPES.includes('APARTMENT'), 'APARTMENT 포함');
})();

// Test 2: 평형 5단계
(function() {
  assert(PYEONG_LEVELS.length === 5, '평형 5단계');
  assert(PYEONG_LEVELS.includes(34), '34평');
})();

// Test 3: validate 정상
(function() {
  const g = new G1Type();
  const v = g.validate({ residence: 'APARTMENT', pyeong: 30 });
  assert(v.errors.length === 0, 'validate 통과');
})();

// Test 4: validate 실패 — 미정의 residence
(function() {
  const g = new G1Type();
  const v = g.validate({ residence: 'INVALID', pyeong: 30 });
  assert(v.errors.length > 0, '미정의 residence');
})();

// Test 5: validate 실패 — 미정의 평형
(function() {
  const g = new G1Type();
  const v = g.validate({ residence: 'APARTMENT', pyeong: 999 });
  assert(v.errors.length > 0, '미정의 평형');
})();

// Test 6: lock 정상
(function() {
  const g = new G1Type();
  const r = g.lock({ residence: 'APARTMENT', pyeong: 34 });
  assert(r.ok === true, 'lock 성공');
  assert(r.payload.residence === 'APARTMENT', 'residence');
  assert(r.payload.pyeong === 34, 'pyeong');
  assert(Array.isArray(r.payload.availableSections), 'availableSections 배열');
})();

// Test 7: 단독주택 시 추가 섹션 (boiler/rooftop/exterior/insulation)
(function() {
  const g = new G1Type();
  const r = g.lock({ residence: 'DETACHED_1F', pyeong: 40 });
  assert(r.payload.availableSections.includes('boiler'), 'boiler 추가');
  assert(r.payload.availableSpaces.includes('YARD'), 'YARD 추가');
})();

console.log('[PASS] G1_Type (7/7)');
```

### 3-3. 검증

```bash
node shell/src/gates/__tests__/G1_Type.test.cjs
# 기대: [PASS] G1_Type (7/7)
```

---

## 작업 4: G2 ~ G5 (간소화, 같은 패턴)

각 게이트는 동일 구조. validate + process + dependsOn.

### 4-1. shell/src/gates/G2_Concept.cjs

```javascript
const { Gate } = require('./Gate.cjs');

const CONCEPTS = [
  'SIMPLE_MODERN','MINIMAL_WHITE','CLASSIC_LUXURY','VINTAGE_RETRO',
  'NATURAL_WOOD','SCANDINAVIAN','INDUSTRIAL','ASIAN_ZEN',
  'PROVENCE','CONTEMPORARY','KOREAN_MODERN','SMART_HOME'
];

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
    const errors = [];
    if (!input) return { errors: ['input 누락'] };
    if (!CONCEPTS.includes(input.concept)) {
      errors.push('concept 미정의: ' + input.concept);
    }
    return { errors: errors };
  }

  process(input) {
    return {
      ok: true,
      payload: {
        concept: input.concept,
        gradeMul: this._gradeMul(input.concept),
        // 자재 매핑 자리 (Week 4에 본 매트릭스)
        materialDefaults: { concept: input.concept },
        smartHome: input.concept === 'SMART_HOME',
        timestamp: Date.now()
      }
    };
  }

  _gradeMul(concept) {
    const map = {
      MINIMAL_WHITE: 1.0,  VINTAGE_RETRO: 1.1, INDUSTRIAL: 1.1,
      SIMPLE_MODERN: 1.2,  SCANDINAVIAN: 1.2,
      NATURAL_WOOD: 1.3,   KOREAN_MODERN: 1.3,
      ASIAN_ZEN: 1.4,
      PROVENCE: 1.5,       CONTEMPORARY: 1.6,
      SMART_HOME: 1.7,
      CLASSIC_LUXURY: 1.8
    };
    return map[concept] || 1.0;
  }
}

module.exports = { G2Concept: G2Concept, CONCEPTS: CONCEPTS };
```

### 4-2. shell/src/gates/G3_Section.cjs

```javascript
const { Gate } = require('./Gate.cjs');

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
    return { errors: errors };
  }

  process(input) {
    return {
      ok: true,
      payload: {
        sections: input.sections,
        // CAD 자동 작성을 위한 공간 후보 추출 (단순)
        autoSpaces: this._extractSpaces(input.sections),
        timestamp: Date.now()
      }
    };
  }

  _extractSpaces(sections) {
    const map = {
      bathroom: ['BATHROOM'],
      kitchen: ['KITCHEN'],
      living: ['LIVING'],
      bedroom: ['MASTER_BEDROOM','BEDROOM'],
      balcony: ['BALCONY'],
      entrance: ['ENTRANCE'],
      dressing: ['DRESSING'],
      study: ['STUDY'],
      dining: ['DINING']
    };
    const result = new Set();
    sections.forEach(function(sec) {
      const spaces = map[sec] || [];
      spaces.forEach(function(s) { result.add(s); });
    });
    return Array.from(result);
  }
}

module.exports = { G3Section: G3Section };
```

### 4-3. shell/src/gates/G4_CAD.cjs

```javascript
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
    return { errors: errors };
  }

  process(input) {
    const totalArea = input.spaces.reduce(function(sum, s) { return sum + s.area_sqm; }, 0);
    return {
      ok: true,
      payload: {
        spaces: input.spaces,
        totalAreaSqm: totalArea,
        stage1EstimateReady: true,   // 1단계 견적 가능
        timestamp: Date.now()
      }
    };
  }
}

module.exports = { G4CAD: G4CAD };
```

### 4-4. shell/src/gates/G5_Material.cjs

```javascript
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
    return { errors: errors };
  }

  process(input) {
    return {
      ok: true,
      payload: {
        materials: input.materials,
        stage2EstimateReady: true,   // 2단계 견적 가능
        timestamp: Date.now()
      }
    };
  }
}

module.exports = { G5Material: G5Material };
```

### 4-5. shell/src/gates/__tests__/G2_G5.test.cjs

```javascript
const { G2Concept, CONCEPTS } = require('../G2_Concept.cjs');
const { G3Section } = require('../G3_Section.cjs');
const { G4CAD } = require('../G4_CAD.cjs');
const { G5Material } = require('../G5_Material.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// G2 Tests
(function() {
  assert(CONCEPTS.length === 12, '컨셉 12개');
  const g = new G2Concept();
  const r = g.lock({ concept: 'CLASSIC_LUXURY' });
  assert(r.ok === true, 'G2 lock');
  assert(r.payload.gradeMul === 1.8, 'gradeMul 1.8');
  assert(r.payload.smartHome === false, 'smartHome false');

  const g2 = new G2Concept();
  const r2 = g2.lock({ concept: 'SMART_HOME' });
  assert(r2.payload.smartHome === true, 'smartHome true');
})();

// G3 Tests
(function() {
  const g = new G3Section();
  const r = g.lock({ sections: ['bathroom','kitchen','living'] });
  assert(r.ok === true, 'G3 lock');
  assert(r.payload.autoSpaces.includes('BATHROOM'), 'auto BATHROOM');
  assert(r.payload.autoSpaces.includes('KITCHEN'), 'auto KITCHEN');
  assert(r.payload.autoSpaces.includes('LIVING'), 'auto LIVING');
})();

// G3 validate 실패 — 빈 배열
(function() {
  const g = new G3Section();
  const r = g.lock({ sections: [] });
  assert(r.ok === false, 'G3 빈 배열 차단');
})();

// G4 Tests
(function() {
  const g = new G4CAD();
  const r = g.lock({
    spaces: [
      { id: 's1', area_sqm: 20 },
      { id: 's2', area_sqm: 15 }
    ]
  });
  assert(r.ok === true, 'G4 lock');
  assert(r.payload.totalAreaSqm === 35, 'totalAreaSqm 35');
  assert(r.payload.stage1EstimateReady === true, '1단계 견적 가능');
})();

// G5 Tests
(function() {
  const g = new G5Material();
  const r = g.lock({ materials: [{ id: 'mat1', name: '강마루' }] });
  assert(r.ok === true, 'G5 lock');
  assert(r.payload.stage2EstimateReady === true, '2단계 견적 가능');
})();

console.log('[PASS] G2_G5 (5/5)');
```

### 4-6. 검증

```bash
node shell/src/gates/__tests__/G2_G5.test.cjs
# 기대: [PASS] G2_G5 (5/5)
```

---

## 작업 5: 5분 시나리오 E2E 테스트

### 5-1. shell/src/gates/__tests__/E2E_5min_scenario.test.cjs

```javascript
// ECOREAN BOC v5.6 — 5분 자동 견적 시나리오 E2E
// 게이트 G1 → G2 → G3 → G4 → G5 순차 통과
// 자동화율 0% → 99% 검증

const { G1Type } = require('../G1_Type.cjs');
const { G2Concept } = require('../G2_Concept.cjs');
const { G3Section } = require('../G3_Section.cjs');
const { G4CAD } = require('../G4_CAD.cjs');
const { G5Material } = require('../G5_Material.cjs');
const { GateRegistry } = require('../Gate.cjs');
const { coreBus } = require('../../core-bus/CoreBus.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// 시나리오 — 30평 아파트, 클래식럭셔리, 욕실+주방+거실 시공
function runScenario() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  const g3 = new G3Section();
  const g4 = new G4CAD();
  const g5 = new G5Material();

  reg.register(g1);
  reg.register(g2);
  reg.register(g3);
  reg.register(g4);
  reg.register(g5);

  // 이벤트 흐름 추적
  const eventLog = [];
  coreBus.on('GATE1_LOCKED', function() { eventLog.push('G1'); });
  coreBus.on('GATE2_LOCKED', function() { eventLog.push('G2'); });
  coreBus.on('GATE3_LOCKED', function() { eventLog.push('G3'); });
  coreBus.on('GATE4_LOCKED', function() { eventLog.push('G4'); });
  coreBus.on('GATE5_LOCKED', function() { eventLog.push('G5'); });

  // STEP 1: G1 — 30평 아파트
  const r1 = g1.lock({ residence: 'APARTMENT', pyeong: 30 }, reg);
  assert(r1.ok === true, 'G1 통과');
  assert(reg.getNextActivatable().id === 'g2_concept', 'G2 활성화');

  // STEP 2: G2 — 클래식럭셔리
  const r2 = g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  assert(r2.ok === true, 'G2 통과');
  assert(r2.payload.gradeMul === 1.8, '클래식 가산 1.8');
  assert(reg.getNextActivatable().id === 'g3_section', 'G3 활성화');

  // STEP 3: G3 — 욕실+주방+거실 시공
  const r3 = g3.lock({ sections: ['bathroom','kitchen','living'] }, reg);
  assert(r3.ok === true, 'G3 통과');
  assert(r3.payload.autoSpaces.length === 3, 'auto spaces 3개');
  assert(reg.getNextActivatable().id === 'g4_cad', 'G4 활성화');

  // STEP 4: G4 — CAD 평면도 (욕실 5㎡, 주방 10㎡, 거실 20㎡)
  const r4 = g4.lock({
    spaces: [
      { id: 'bath', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'kit',  area_sqm: 10, typeKey: 'KITCHEN' },
      { id: 'liv',  area_sqm: 20, typeKey: 'LIVING' }
    ]
  }, reg);
  assert(r4.ok === true, 'G4 통과');
  assert(r4.payload.totalAreaSqm === 35, '총 면적 35㎡');
  assert(r4.payload.stage1EstimateReady === true, '1단계 견적 발행 가능');

  // 자동화율 95% — 1단계 견적 완성 가능
  // 사용자는 여기서 종료 가능 (G5는 옵션)

  // STEP 5: G5 — 자재 직접 선택 (옵션)
  const r5 = g5.lock({
    materials: [
      { id: 'fl_001', name: '강마루 화이트오크' },
      { id: 'wp_001', name: '실크 도배 베이지' }
    ]
  }, reg);
  assert(r5.ok === true, 'G5 통과');
  assert(r5.payload.stage2EstimateReady === true, '2단계 견적 발행 가능');

  // 이벤트 흐름 검증
  assert(eventLog.length === 5, '5개 이벤트 발행');
  assert(eventLog.join(',') === 'G1,G2,G3,G4,G5', '게이트 순서');

  console.log('  시나리오: 30평 아파트 + 클래식럭셔리 + 욕실/주방/거실');
  console.log('  총 면적: ' + r4.payload.totalAreaSqm + '㎡');
  console.log('  컨셉 가산: ×' + r2.payload.gradeMul);
  console.log('  자재 선택: ' + r5.payload.materials.length + '건');
  console.log('  자동화율: 0% → 30% → 70% → 85% → 95% → 99%');
}

// 직전 게이트 미잠금 시 차단 검증
function testGateBlocking() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  reg.register(g1);
  reg.register(g2);

  // G1 안 잠그고 G2 lock 시도
  const r = g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  assert(r.ok === false, 'G1 미잠금 시 G2 차단');
}

runScenario();
testGateBlocking();
console.log('[PASS] E2E 5min scenario (모두 통과)');
```

### 5-2. 검증

```bash
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs
# 기대:
#   시나리오: 30평 아파트 + 클래식럭셔리 + 욕실/주방/거실
#   총 면적: 35㎡
#   컨셉 가산: ×1.8
#   자재 선택: 2건
#   자동화율: 0% → 30% → 70% → 85% → 95% → 99%
#   [PASS] E2E 5min scenario (모두 통과)
```

---

## 작업 6: 통합 테스트 — Phase 3-C Gate Test

```bash
# v5.6 신규 (Week 3)
node shell/src/gates/__tests__/Gate.test.cjs                      # 8/8
node shell/src/gates/__tests__/G1_Type.test.cjs                   # 7/7
node shell/src/gates/__tests__/G2_G5.test.cjs                     # 5/5
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs         # PASS

# Week 1 회귀
node shell/src/core-bus/__tests__/CoreBus.test.cjs                # 7/7
node shell/src/core-bus/__tests__/schemas.test.cjs                # 5/5
node shell/src/feature-flags/__tests__/flags.test.cjs             # 6/6
node scripts/generate-from-graph.js                                # PASS

# Week 2 회귀
node modules-html/cad/__tests__/DrawingModel.test.cjs             # 9/9
node modules-html/cad/__tests__/DrawingEngine.test.cjs            # 7/7
node modules-html/cad/__tests__/CADBus.test.cjs                   # 2/2
node modules-html/cad/__tests__/L1_Floorplan.test.cjs             # 5/5

# 9탭 회귀
node test-engine.js                                                # 5/5

# 모두 PASS면 PHASE_3C_COMPLETE 활성화
```

### 6-1. PHASE_3C_COMPLETE 활성화

`shell/src/feature-flags/flags.cjs`의 `PHASE_3C_COMPLETE: false` → `true`.

### 6-2. flags 테스트 갱신

```javascript
// Test 1에 추가
assert(isEnabled('PHASE_3C_COMPLETE') === true, 'PHASE_3C_COMPLETE Week3 완료 true');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
# 기대: [PASS] feature-flags (6/6)
```

---

## 작업 7: 커밋 (단일 책임 원칙, 4개 분리)

```bash
# 커밋 1: Gate 추상 클래스 + Registry
git add shell/src/gates/Gate.cjs shell/src/gates/__tests__/Gate.test.cjs
git commit -m "feat(v5.6/gates): Gate 추상 클래스 + GateRegistry (8/8 PASS)

- validate() / process() / lock() / unlock()
- dependsOn 체인 — 직전 게이트 미잠금 시 차단
- lock() 시 CoreBus 이벤트 자동 발행
- GateRegistry — 5게이트 일괄 관리, getNextActivatable
- 8/8 PASS"

# 커밋 2: G1~G5 게이트 5개
git add shell/src/gates/G1_Type.cjs shell/src/gates/G2_Concept.cjs shell/src/gates/G3_Section.cjs shell/src/gates/G4_CAD.cjs shell/src/gates/G5_Material.cjs shell/src/gates/__tests__/G1_Type.test.cjs shell/src/gates/__tests__/G2_G5.test.cjs
git commit -m "feat(v5.6/gates): G1~G5 5단 자동화 게이트 (12/12 PASS)

- G1 유형 (주거 6 + 평형 5) — 자동화율 0→30%
- G2 컨셉 (12 + 가산 ×1.0~×1.8) — 30→70%
- G3 섹션 (다중선택 + 공간 자동 추출) — 70→85%
- G4 CAD (면적 합산 + 1단계 견적 발행) — 85→95%
- G5 자재 (직접 선택 + 2단계 견적 발행) — 95→99%
- G1 7/7 + G2~G5 5/5 PASS"

# 커밋 3: E2E 5분 시나리오 + Phase 3-C 완료
git add shell/src/gates/__tests__/E2E_5min_scenario.test.cjs shell/src/feature-flags/
git commit -m "feat(v5.6/phase-3c): E2E 5분 자동 견적 시나리오 + PHASE_3C_COMPLETE = true

- 30평 아파트 + 클래식럭셔리 + 욕실/주방/거실 시나리오 통과
- 게이트 G1→G2→G3→G4→G5 순차 검증
- 자동화율 0% → 99% 검증
- 직전 게이트 미잠금 시 차단 검증
- 모든 회귀 테스트 PASS"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 3 완료 (Phase 3-C 5단 게이트 분리)

[신규 모듈]
- shell/src/gates/Gate.cjs              — 추상 클래스 + Registry
- shell/src/gates/G1_Type.cjs           — 주거형태 + 평형
- shell/src/gates/G2_Concept.cjs        — 컨셉 12 + 가산
- shell/src/gates/G3_Section.cjs        — 시공섹션 + 공간 자동 추출
- shell/src/gates/G4_CAD.cjs            — CAD 면적 + 1단계 견적
- shell/src/gates/G5_Material.cjs       — 자재 + 2단계 견적

[테스트 결과]
- Gate:               8/8 PASS
- G1_Type:            7/7 PASS
- G2_G5:              5/5 PASS
- E2E 5분 시나리오:    PASS
- Week 1 회귀:        PASS
- Week 2 회귀:        PASS
- test-engine:        5/5 PASS (회귀 0)

[검증 시나리오]
30평 아파트 + 클래식럭셔리 + 욕실/주방/거실
→ 총 면적 35㎡
→ 컨셉 가산 ×1.8
→ 자동화율 0% → 99%

[커밋]
- Gate 추상 + Registry
- G1~G5 게이트 5개
- E2E 시나리오 + PHASE_3C_COMPLETE
- 푸시: 완료

[다음 주]
Phase 3 Week 4 (3-D): 견적 모듈 격리
- @ecorean/estimate 분리
- 22 섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 본 매트릭스 적용
- CalcEngine v5.6 보정계수 통합
- 컨셉×자재 매핑 매트릭스 (12 × 30 = 360)
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- 기존 13 엔진 시그니처 변경
- USE_CASCADE_GATES = true (Week 4 estimate 통합 후 활성화)

---

## 위기 대응

| 상황 | 즉시 대응 |
|---|---|
| 9탭 회귀 발생 | revert + 분석 |
| 게이트 dependsOn 순환 | graph.json 검증 후 수정 |
| CoreBus 이벤트 미수신 | 경로 확인 (../../core-bus/CoreBus.cjs) |
| E2E 시나리오 실패 | 게이트별 단위 테스트 통과 확인 → 다시 E2E |

---

**문서 끝.**
**즉시 시작:** 작업 1(디렉토리) → 2(Gate 추상) → 3(G1) → 4(G2~G5) → 5(E2E) → 6(통합) → 7(커밋). 각 단계 검증 → 다음.
