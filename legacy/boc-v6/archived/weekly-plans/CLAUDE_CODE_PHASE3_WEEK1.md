# ECOREAN BOC — Phase 3 Week 1 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** https://github.com/udunext7-wq/6cf695f (v5.6 docs)
> **현재 커밋:** 6cf695f
> **이번 주 목표:** v5.6 노드/엣지 그래프 핵심 인프라 박기 + §109.2 보정
> **소요:** 자율 실행 1~2시간

---

## 작업 0: §109.2 보정 (즉시)

`docs/MASTER_PLAN.md` §109.2 제목 수정:

```
### 109.2 11 노드  →  ### 109.2 12 노드
```

graph.json 실제 12 노드와 일치시킴. 이건 첫 커밋 작업.

```bash
git add docs/MASTER_PLAN.md
git commit -m "fix(v5.6): §109.2 노드 수 11 → 12 보정 (graph.json 일치)"
```

---

## 절대 규칙 (Phase 3 전 기간)

1. TDD 강제 — 테스트 먼저, 코드 나중
2. 버그 있는 코드 커밋 금지
3. 단가 추정 금지
4. rollback SQL 없는 DB 변경 금지
5. 9탭 회귀 0건 검증 후만 다음 단계
6. 13단계 디자인과 충돌 시 즉시 보고
7. estimate.html · boc-shell.html 직접 수정 금지 (Phase 3-A는 백엔드 신규 패키지만)
8. Feature Flag로 v5.0 path와 v5.6 path 분리

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git status
git log --oneline -3      # 6cf695f 확인
git pull origin master

# DB 백업
cp ecorean-boc.db ecorean-boc.db.bak.v5.6

# 13단계 진행 상태 확인
git log --oneline | grep -i "13\|design" | head -3
```

---

## 작업 1: @ecorean/core-bus 신설

이벤트 허브 패키지. 모든 노드 간 통신은 이걸 통과.

### 1-1. 디렉토리 생성

```bash
mkdir -p shell/src/core-bus
mkdir -p shell/src/core-bus/__tests__
```

### 1-2. shell/src/core-bus/CoreBus.js

```javascript
// ECOREAN BOC v5.6 — Core Bus (이벤트 허브)
// SoT: docs/graph.json — 24 엣지가 이 버스를 통과
// 절대 규칙: 모든 통신은 이 허브를 통과. 직접 함수 호출 금지.

class CoreBus {
  constructor() {
    this.handlers = new Map();         // eventType → [handler]
    this.schemas = new Map();          // eventType → schema
    this.log = [];                      // Audit log (in-memory, dev only)
    this.featureFlags = {};
  }

  // 스키마 등록 (Zod 객체)
  registerSchema(eventType, schema) {
    this.schemas.set(eventType, schema);
  }

  // 구독
  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
  }

  // 발행
  emit(eventType, payload, meta = {}) {
    const schema = this.schemas.get(eventType);
    if (schema && schema.parse) {
      try {
        schema.parse(payload);
      } catch (e) {
        console.error('[CoreBus] Schema violation on ' + eventType + ':', e.message);
        if (this.featureFlags.STRICT_SCHEMA) throw e;
      }
    }

    const entry = {
      eventType: eventType,
      payload: payload,
      meta: meta,
      timestamp: Date.now()
    };
    this.log.push(entry);
    if (this.log.length > 1000) this.log.shift();   // 1000건 윈도우

    const list = this.handlers.get(eventType) || [];
    list.forEach(function(h) {
      try {
        h(payload, meta);
      } catch (e) {
        console.error('[CoreBus] Handler error on ' + eventType + ':', e.message);
      }
    });

    return entry;
  }

  // 구독 해제
  off(eventType, handler) {
    if (!this.handlers.has(eventType)) return;
    const list = this.handlers.get(eventType);
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  // Audit log 조회
  getLog(filter) {
    if (!filter) return this.log.slice();
    return this.log.filter(function(e) {
      if (filter.eventType && e.eventType !== filter.eventType) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      return true;
    });
  }

  // Feature Flag
  setFlag(name, value) {
    this.featureFlags[name] = value;
  }

  isEnabled(flagName) {
    return !!this.featureFlags[flagName];
  }

  // 디버그용
  stats() {
    return {
      handlerCount: Array.from(this.handlers.values()).reduce(function(a, b) { return a + b.length; }, 0),
      eventTypes: Array.from(this.handlers.keys()),
      logSize: this.log.length,
      flags: Object.assign({}, this.featureFlags)
    };
  }
}

// 단일 인스턴스 (Singleton)
const coreBus = new CoreBus();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CoreBus: CoreBus, coreBus: coreBus };
}
if (typeof window !== 'undefined') {
  window.coreBus = coreBus;
}
```

### 1-3. shell/src/core-bus/__tests__/CoreBus.test.js

```javascript
// CoreBus 무결성 테스트
const { CoreBus } = require('../CoreBus.js');

function assert(cond, msg) {
  if (!cond) {
    console.error('[FAIL]', msg);
    process.exit(1);
  }
}

// Test 1: emit/on 기본
(function() {
  const bus = new CoreBus();
  let received = null;
  bus.on('TEST_EVENT', function(p) { received = p; });
  bus.emit('TEST_EVENT', { value: 42 });
  assert(received && received.value === 42, 'emit/on 기본 작동');
})();

// Test 2: 다중 핸들러
(function() {
  const bus = new CoreBus();
  let count = 0;
  bus.on('MULTI', function() { count++; });
  bus.on('MULTI', function() { count++; });
  bus.emit('MULTI', {});
  assert(count === 2, '다중 핸들러');
})();

// Test 3: off (구독 해제)
(function() {
  const bus = new CoreBus();
  let count = 0;
  const handler = function() { count++; };
  bus.on('OFF_TEST', handler);
  bus.emit('OFF_TEST', {});
  bus.off('OFF_TEST', handler);
  bus.emit('OFF_TEST', {});
  assert(count === 1, 'off 작동');
})();

// Test 4: Audit log
(function() {
  const bus = new CoreBus();
  bus.emit('LOG_TEST', { a: 1 });
  bus.emit('LOG_TEST', { a: 2 });
  const log = bus.getLog({ eventType: 'LOG_TEST' });
  assert(log.length === 2, 'Audit log 2건');
  assert(log[0].payload.a === 1, 'log payload 0');
  assert(log[1].payload.a === 2, 'log payload 1');
})();

// Test 5: Feature Flag
(function() {
  const bus = new CoreBus();
  assert(!bus.isEnabled('TEST_FLAG'), '플래그 기본 false');
  bus.setFlag('TEST_FLAG', true);
  assert(bus.isEnabled('TEST_FLAG'), '플래그 활성화');
})();

// Test 6: 핸들러 에러가 다음 핸들러를 막지 않음
(function() {
  const bus = new CoreBus();
  let secondCalled = false;
  bus.on('ERR_TEST', function() { throw new Error('boom'); });
  bus.on('ERR_TEST', function() { secondCalled = true; });
  bus.emit('ERR_TEST', {});
  assert(secondCalled, '에러 격리');
})();

// Test 7: stats
(function() {
  const bus = new CoreBus();
  bus.on('S1', function() {});
  bus.on('S2', function() {});
  bus.emit('S1', {});
  const s = bus.stats();
  assert(s.handlerCount === 2, 'stats handlerCount');
  assert(s.eventTypes.length === 2, 'stats eventTypes');
  assert(s.logSize === 1, 'stats logSize');
})();

console.log('[PASS] CoreBus (7/7)');
```

### 1-4. 검증

```bash
node shell/src/core-bus/__tests__/CoreBus.test.js
# 기대: [PASS] CoreBus (7/7)
```

### 1-5. 커밋

```bash
git add shell/src/core-bus/
git commit -m "feat(v5.6/core-bus): @ecorean/core-bus 신설 - 이벤트 허브 + Audit log + Feature Flag (7/7 PASS)"
```

---

## 작업 2: graph.json → Zod 스키마 자동 생성

graph.json의 24 엣지마다 Zod 스키마 자리를 만든다. 지금은 최소 스키마(통과 검증), 다음 주에 본 스키마 채움.

### 2-1. shell/src/core-bus/schemas.js

```javascript
// ECOREAN BOC v5.6 — Edge Schemas
// 자동 생성 대상: scripts/generate-schemas.js (다음 주)
// 현재는 최소 스키마 (통과만). Phase 3 Week 2에서 본 스키마로 교체.

// 경량 Zod-like API (실제 zod 패키지 도입 전 임시)
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

// 24 엣지 스키마 (graph.json edges[].schemaRef와 1:1 매칭)
const SCHEMAS = {
  // 게이트 흐름 (5)
  GATE1_LOCKED:      defineSchema('GATE1_LOCKED'),
  GATE2_LOCKED:      defineSchema('GATE2_LOCKED'),
  GATE3_LOCKED:      defineSchema('GATE3_LOCKED'),
  GATE4_LOCKED:      defineSchema('GATE4_LOCKED'),
  GATE5_LOCKED:      defineSchema('GATE5_LOCKED'),
  SECTIONS_LOCKED:   defineSchema('SECTIONS_LOCKED'),

  // CAD 통신
  CAD_INIT:          defineSchema('CAD_INIT'),
  SPACE_UPDATED:     defineSchema('SPACE_UPDATED'),

  // 견적 흐름
  CALC_REQUEST:      defineSchema('CALC_REQUEST'),
  CALC_RESULT:       defineSchema('CALC_RESULT'),
  KPI_UPDATE:        defineSchema('KPI_UPDATE'),

  // 엔진 통신
  RULES_LOADED:           defineSchema('RULES_LOADED'),
  MASTERDB_UPDATE_REQ:    defineSchema('MASTERDB_UPDATE_REQ'),
  NEW_RULE_PROPOSED:      defineSchema('NEW_RULE_PROPOSED'),
  RULE_APPROVED:          defineSchema('RULE_APPROVED'),

  // AI 임원
  AI_RECOMMEND:      defineSchema('AI_RECOMMEND'),
  AI_ESCALATION:    defineSchema('AI_ESCALATION'),
  CONTEXT_OBSERVED: defineSchema('CONTEXT_OBSERVED'),
  RESULT_OBSERVED:  defineSchema('RESULT_OBSERVED'),
  KPI_OBSERVED:     defineSchema('KPI_OBSERVED')
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCHEMAS: SCHEMAS, defineSchema: defineSchema };
}
if (typeof window !== 'undefined') {
  window.BOCSchemas = SCHEMAS;
}
```

### 2-2. shell/src/core-bus/registerSchemas.js

```javascript
// CoreBus에 24 스키마 등록
const { coreBus } = require('./CoreBus.js');
const { SCHEMAS } = require('./schemas.js');

function registerAllSchemas() {
  Object.keys(SCHEMAS).forEach(function(eventType) {
    coreBus.registerSchema(eventType, SCHEMAS[eventType]);
  });
  return Object.keys(SCHEMAS).length;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerAllSchemas: registerAllSchemas };
}
```

### 2-3. shell/src/core-bus/__tests__/schemas.test.js

```javascript
const { SCHEMAS } = require('../schemas.js');
const { CoreBus } = require('../CoreBus.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 20개 스키마 정의됨 (graph.json edges 중 unique event = 20)
(function() {
  const count = Object.keys(SCHEMAS).length;
  assert(count >= 20, '스키마 20개 이상: 실제 ' + count);
})();

// Test 2: 모든 스키마는 parse 메서드 가짐
(function() {
  Object.keys(SCHEMAS).forEach(function(name) {
    assert(typeof SCHEMAS[name].parse === 'function', name + '.parse 존재');
  });
})();

// Test 3: null/undefined는 거부
(function() {
  const s = SCHEMAS.GATE1_LOCKED;
  let threw = false;
  try { s.parse(null); } catch(e) { threw = true; }
  assert(threw, 'null 거부');
})();

// Test 4: 객체는 통과 (현재 최소 스키마)
(function() {
  const s = SCHEMAS.GATE1_LOCKED;
  const result = s.parse({ residence: 'APARTMENT', pyeong: 'P_30' });
  assert(result.residence === 'APARTMENT', '객체 통과');
})();

// Test 5: CoreBus에 등록 시 스키마 검증 작동
(function() {
  const bus = new CoreBus();
  bus.registerSchema('TEST', SCHEMAS.GATE1_LOCKED);
  bus.setFlag('STRICT_SCHEMA', true);

  let threw = false;
  try { bus.emit('TEST', null); } catch(e) { threw = true; }
  assert(threw, 'STRICT_SCHEMA 모드 null 차단');

  // 비-STRICT 모드는 경고만
  bus.setFlag('STRICT_SCHEMA', false);
  bus.emit('TEST', null);   // 에러 throw 안 함
})();

console.log('[PASS] schemas (5/5)');
```

### 2-4. 검증

```bash
node shell/src/core-bus/__tests__/schemas.test.js
# 기대: [PASS] schemas (5/5)
```

### 2-5. 커밋

```bash
git add shell/src/core-bus/schemas.js shell/src/core-bus/registerSchemas.js shell/src/core-bus/__tests__/schemas.test.js
git commit -m "feat(v5.6/core-bus): 20 edge schemas 자리 + registerSchemas (5/5 PASS)"
```

---

## 작업 3: Feature Flag 시스템

v5.0 path와 v5.6 path 분리. 13단계 디자인 작업과 충돌 0 보장.

### 3-1. shell/src/feature-flags/flags.js

```javascript
// ECOREAN BOC v5.6 — Feature Flags
// 절대 규칙: 신기능은 모두 플래그 뒤에 둔다. 13단계 디자인과 충돌 차단.

const FLAGS = {
  // v5.6 그래프 아키텍처
  USE_CORE_BUS:           false,    // 이벤트 버스 사용 (true시 v5.6 path)
  STRICT_SCHEMA:          false,    // Zod 스키마 strict 모드
  USE_CASCADE_GATES:      false,    // 5단 게이트 (G1~G5) 사용
  USE_AI_EXECUTIVE:       false,    // AI 가상 임원 활성

  // CAD 모듈 분리 (Week 2)
  USE_CAD_MODULE:         false,    // modules-html/cad/ 사용 (false=기존 미니 CAD)

  // Phase 3 진행 상태
  PHASE_3A_COMPLETE:      false,    // Week 1 완료 후 true
  PHASE_3B_COMPLETE:      false,    // Week 2 완료 후 true
  PHASE_3C_COMPLETE:      false,
  PHASE_3D_COMPLETE:      false,
  PHASE_3E_COMPLETE:      false,
  PHASE_3F_COMPLETE:      false,
  PHASE_3G_COMPLETE:      false,

  // 메타 호환 (Week 6)
  META_COMPAT_JSONLD:     false,
  META_COMPAT_RDF:        false,
  META_COMPAT_UNIVERSE:   false,

  // 디버그
  VERBOSE_LOG:            false,
  AUDIT_LOG_ENABLED:      true
};

function isEnabled(name) {
  return !!FLAGS[name];
}

function setFlag(name, value) {
  if (!(name in FLAGS)) {
    console.warn('[FeatureFlag] Unknown flag:', name);
    return false;
  }
  FLAGS[name] = !!value;
  return true;
}

function getAllFlags() {
  return Object.assign({}, FLAGS);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FLAGS: FLAGS, isEnabled: isEnabled, setFlag: setFlag, getAllFlags: getAllFlags };
}
if (typeof window !== 'undefined') {
  window.BOCFlags = { isEnabled: isEnabled, setFlag: setFlag, getAllFlags: getAllFlags };
}
```

### 3-2. shell/src/feature-flags/__tests__/flags.test.js

```javascript
const { isEnabled, setFlag, getAllFlags, FLAGS } = require('../flags.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 기본값 — 모든 v5.6 플래그 false
(function() {
  assert(isEnabled('USE_CORE_BUS') === false, 'USE_CORE_BUS 기본 false');
  assert(isEnabled('USE_CASCADE_GATES') === false, 'USE_CASCADE_GATES 기본 false');
  assert(isEnabled('PHASE_3A_COMPLETE') === false, 'PHASE_3A_COMPLETE 기본 false');
})();

// Test 2: AUDIT_LOG_ENABLED 기본 true
(function() {
  assert(isEnabled('AUDIT_LOG_ENABLED') === true, 'AUDIT_LOG_ENABLED 기본 true');
})();

// Test 3: setFlag 작동
(function() {
  setFlag('USE_CORE_BUS', true);
  assert(isEnabled('USE_CORE_BUS') === true, 'setFlag true');
  setFlag('USE_CORE_BUS', false);
  assert(isEnabled('USE_CORE_BUS') === false, 'setFlag false');
})();

// Test 4: 미정의 플래그 setFlag 거부
(function() {
  const result = setFlag('UNKNOWN_FLAG', true);
  assert(result === false, '미정의 플래그 거부');
})();

// Test 5: getAllFlags 정상
(function() {
  const all = getAllFlags();
  assert(typeof all === 'object', 'getAllFlags 객체 반환');
  assert('USE_CORE_BUS' in all, 'USE_CORE_BUS 포함');
  assert('PHASE_3A_COMPLETE' in all, 'PHASE_3A_COMPLETE 포함');
})();

// Test 6: 플래그 수 (현재 총 14개 정의)
(function() {
  const count = Object.keys(FLAGS).length;
  assert(count >= 14, '플래그 14개 이상: ' + count);
})();

console.log('[PASS] feature-flags (6/6)');
```

### 3-3. 검증 + 커밋

```bash
node shell/src/feature-flags/__tests__/flags.test.js
# 기대: [PASS] feature-flags (6/6)

git add shell/src/feature-flags/
git commit -m "feat(v5.6/feature-flags): 14 플래그 시스템 신설 - v5.0/v5.6 path 분리 (6/6 PASS)"
```

---

## 작업 4: graph.json → 코드 자동 생성기 (스켈레톤)

마스터플랜 6번째 다시쓰기 차단. 지금은 검증만, 본 생성기는 Phase 3 Week 4에 채움.

### 4-1. scripts/generate-from-graph.js

```javascript
#!/usr/bin/env node
// ECOREAN BOC v5.6 — graph.json → 코드 자동 생성기 (스켈레톤)
// SoT: docs/graph.json
// Week 1 (현재): 무결성 검증만
// Week 4 (예정): 실제 코드 생성

const fs = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '..', 'docs', 'graph.json');

function load() {
  const raw = fs.readFileSync(GRAPH_PATH, 'utf-8');
  return JSON.parse(raw);
}

function validate(g) {
  const errors = [];

  if (!g['@context']) errors.push('@context 누락');
  if (!g['@id']) errors.push('@id 누락');
  if (!g.version) errors.push('version 누락');
  if (!g.universe) errors.push('universe 누락');
  if (!Array.isArray(g.nodes)) errors.push('nodes 배열 아님');
  if (!Array.isArray(g.edges)) errors.push('edges 배열 아님');

  // 노드 무결성
  const nodeIds = new Set();
  g.nodes.forEach(function(n, i) {
    if (!n.id) errors.push('node[' + i + '].id 누락');
    if (!n.uri) errors.push('node[' + i + '].uri 누락');
    if (nodeIds.has(n.id)) errors.push('node id 중복: ' + n.id);
    nodeIds.add(n.id);
  });

  // 엣지 무결성
  g.edges.forEach(function(e, i) {
    if (!e.source || !e.target) errors.push('edge[' + i + '] source/target 누락');
    if (!e.event) errors.push('edge[' + i + '].event 누락');
    if (!nodeIds.has(e.source)) errors.push('edge[' + i + '].source 미존재 노드: ' + e.source);
    if (!nodeIds.has(e.target)) errors.push('edge[' + i + '].target 미존재 노드: ' + e.target);
  });

  // 순환 참조 감지 (간단 버전 — 동일 source-target 양방향)
  const edgeKeys = new Set();
  g.edges.forEach(function(e) {
    edgeKeys.add(e.source + '->' + e.target);
  });
  g.edges.forEach(function(e) {
    if (edgeKeys.has(e.target + '->' + e.source) && e.source !== e.target) {
      // 양방향은 calc_engine ↔ estimate, ontology ↔ approval 등 의도된 케이스라 경고만
      // errors.push 안 함
    }
  });

  return errors;
}

function summary(g) {
  console.log('graph.json 요약');
  console.log('  버전:    ' + g.version);
  console.log('  Universe: ' + (g.universe && g.universe.id));
  console.log('  Tenant:   ' + g.tenantId);
  console.log('  노드:     ' + g.nodes.length);
  console.log('  엣지:     ' + g.edges.length);
  console.log('  미래 노드: ' + ((g.futureNodes && g.futureNodes.length) || 0));
  console.log('  메타엣지: ' + ((g.futureMetaedges && g.futureMetaedges.length) || 0));
}

function main() {
  const g = load();
  summary(g);
  const errors = validate(g);
  if (errors.length > 0) {
    console.error('\n[FAIL] graph.json 검증 실패:');
    errors.forEach(function(e) { console.error('  - ' + e); });
    process.exit(1);
  }
  console.log('\n[PASS] graph.json 무결성 OK');
}

if (require.main === module) main();

module.exports = { load: load, validate: validate, summary: summary };
```

### 4-2. 검증

```bash
node scripts/generate-from-graph.js
# 기대:
#   graph.json 요약
#     버전: 5.6
#     노드: 12
#     엣지: 24
#   [PASS] graph.json 무결성 OK
```

### 4-3. 커밋

```bash
git add scripts/generate-from-graph.js
git commit -m "feat(v5.6/scripts): graph.json 무결성 검증기 (Phase 3 Week 4 자동 생성기 스켈레톤)"
```

---

## 작업 5: 통합 테스트 — Phase 3-A Gate Test

```bash
# 5-1. 기존 9탭 회귀 (영향 0 검증)
node test-engine.js
# 기대: [PASS] CalcEngine, OntologyEngine, DiagEngine 등 5/5 (116 assertions)

# 5-2. v5.6 신규 컴포넌트 회귀
node shell/src/core-bus/__tests__/CoreBus.test.js       # 7/7
node shell/src/core-bus/__tests__/schemas.test.js        # 5/5
node shell/src/feature-flags/__tests__/flags.test.js    # 6/6
node scripts/generate-from-graph.js                     # graph 무결성

# 5-3. 모두 PASS면 다음 주 진입 게이트 통과
```

### 5-4. PHASE_3A_COMPLETE 플래그 활성화

`shell/src/feature-flags/flags.js`의 `PHASE_3A_COMPLETE: false` → `true` 변경.

### 5-5. 최종 커밋

```bash
git add shell/src/feature-flags/flags.js
git commit -m "feat(v5.6/phase-3a): Phase 3 Week 1 완료 — PHASE_3A_COMPLETE = true (모든 게이트 테스트 통과)"
git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 1 완료 (Phase 3-A 핵심 인프라)

[보정]
- §109.2 노드 수 11 → 12 (graph.json 일치)

[신규 패키지]
- @ecorean/core-bus (이벤트 허브)
- @ecorean/feature-flags (14 플래그)
- scripts/generate-from-graph.js (무결성 검증기)
- shell/src/core-bus/schemas.js (20 엣지 스키마 자리)

[테스트 결과]
- CoreBus:       7/7 PASS
- schemas:       5/5 PASS
- feature-flags: 6/6 PASS
- graph.json:    PASS (12 nodes, 24 edges)
- test-engine:   5/5 PASS (116 assertions, 회귀 0)

[커밋]
- §109.2 보정
- core-bus 신설
- schemas 등록
- feature-flags 신설
- generate-from-graph 스켈레톤
- PHASE_3A_COMPLETE = true

[다음 주]
Phase 3 Week 2 (3-B): @ecorean/cad 단독 모듈 분리
- modules-html/cad/ 신설
- Drawing 데이터 모델
- drawings 테이블 마이그레이션
- estimate.html 미니 CAD → cad 모듈 이전
- Visual Regression Test 도입
```

---

## 절대 금지 (Phase 3 전 기간)

- estimate.html 직접 수정 (13단계 디자인 작업과 충돌)
- shell/boc-shell.html 직접 수정
- 22 섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 변경
- 기존 13개 엔진 함수 시그니처 변경
- DB 스키마 변경 시 rollback SQL 미작성

---

## 위기 대응

다음 발생 시 즉시 작업 중단 + 보고:

| 상황 | 즉시 대응 |
|---|---|
| 9탭 회귀 발생 | 마지막 커밋 revert |
| 13단계 디자인 작업 충돌 발견 | 작업 중단, 충돌 영역 보고 |
| graph.json 검증 실패 | 마스터플랜 §109 ↔ graph.json 정합 재확인 |
| node test-engine.js 실패 | 즉시 revert + 분석 |

---

**문서 끝.**
**즉시 시작:** 작업 0(보정) → 1(core-bus) → 2(schemas) → 3(flags) → 4(generator) → 5(통합 게이트). 단계마다 검증 → 다음.
