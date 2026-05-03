# ECOREAN BOC — Phase 3 Week 6 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 6053379 (Week 5 완료)
> **이번 주 목표:** 메타 온톨로지 호환 6+α 인터페이스 + L3 포도농장 OS 자리
> **소요:** 자율 실행 3~4시간
> **의의:** 대표님 메타 우주 비전이 코드로 박히는 주차. L1(현재) → L7(연방)까지 호환 보증.

---

## 절대 규칙

1. TDD 강제
2. 버그 있는 코드 커밋 금지
3. 9탭 회귀 0건 검증
4. estimate.html · boc-shell.html 직접 수정 금지
5. 22/23/12/6/5 변경 금지
6. **L3 포도농장 OS는 자리만 — 실제 활성화는 2026 하반기**
7. Feature Flag로 메타 호환 단계별 활성화 제어
8. rollback SQL 없는 DB 변경 금지

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # 6053379 확인
git pull origin master

# Week 1~5 전체 회귀
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
node test-engine.js
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조

```bash
mkdir -p docs/schemas
mkdir -p docs/universes
mkdir -p shell/src/meta
mkdir -p shell/src/meta/__tests__
mkdir -p db/migrations/v5.6
```

---

## 작업 2: URI 식별 시스템 (인터페이스 #1)

### 2-1. shell/src/meta/MetaURI.cjs

```javascript
// ECOREAN BOC v5.6 — 메타 URI 식별 시스템
// SoT: docs/MASTER_PLAN.md §110.2 #1
//
// 형식: urn:{universe}:universe:{universeId}:node:{nodeId}
// 예시: urn:ecorean:universe:1:node:g1_type
//       urn:vine-farm:universe:1:node:harvest

const URI_PREFIX = 'urn';
const DEFAULT_NAMESPACE = 'ecorean';

// URI 빌드
function buildNodeURI(opts) {
  const ns = opts.namespace || DEFAULT_NAMESPACE;
  const uId = opts.universeId || '1';
  const nodeId = opts.nodeId;
  if (!nodeId) throw new Error('buildNodeURI: nodeId 필수');
  return URI_PREFIX + ':' + ns + ':universe:' + uId + ':node:' + nodeId;
}

function buildEdgeURI(opts) {
  const ns = opts.namespace || DEFAULT_NAMESPACE;
  const uId = opts.universeId || '1';
  const edgeId = opts.edgeId;
  if (!edgeId) throw new Error('buildEdgeURI: edgeId 필수');
  return URI_PREFIX + ':' + ns + ':universe:' + uId + ':edge:' + edgeId;
}

function buildUniverseURI(opts) {
  const ns = opts.namespace || DEFAULT_NAMESPACE;
  const uId = opts.universeId || '1';
  return URI_PREFIX + ':' + ns + ':universe:' + uId;
}

// 메타엣지 URI (우주 간 연결)
function buildMetaedgeURI(opts) {
  const sourceUni = opts.sourceUniverse;
  const targetUni = opts.targetUniverse;
  const metaedgeType = opts.metaedgeType;
  if (!sourceUni || !targetUni || !metaedgeType) {
    throw new Error('buildMetaedgeURI: source/target/type 필수');
  }
  return URI_PREFIX + ':metaedge:' + sourceUni + ':' + targetUni + ':' + metaedgeType;
}

// URI 파싱
function parseURI(uri) {
  if (typeof uri !== 'string' || !uri.startsWith(URI_PREFIX + ':')) {
    return { ok: false, error: 'invalid prefix' };
  }
  const parts = uri.split(':');
  // urn:ecorean:universe:1:node:g1_type → 6 parts
  // urn:metaedge:src:tgt:type → 5 parts

  if (parts[1] === 'metaedge' && parts.length === 5) {
    return {
      ok: true,
      type: 'metaedge',
      sourceUniverse: parts[2],
      targetUniverse: parts[3],
      metaedgeType: parts[4]
    };
  }

  if (parts.length === 4 && parts[2] === 'universe') {
    return {
      ok: true,
      type: 'universe',
      namespace: parts[1],
      universeId: parts[3]
    };
  }

  if (parts.length === 6 && parts[2] === 'universe' && (parts[4] === 'node' || parts[4] === 'edge')) {
    return {
      ok: true,
      type: parts[4],
      namespace: parts[1],
      universeId: parts[3],
      id: parts[5]
    };
  }

  return { ok: false, error: 'unknown format' };
}

// 검증
function isValidURI(uri) {
  return parseURI(uri).ok === true;
}

module.exports = {
  URI_PREFIX: URI_PREFIX,
  DEFAULT_NAMESPACE: DEFAULT_NAMESPACE,
  buildNodeURI: buildNodeURI,
  buildEdgeURI: buildEdgeURI,
  buildUniverseURI: buildUniverseURI,
  buildMetaedgeURI: buildMetaedgeURI,
  parseURI: parseURI,
  isValidURI: isValidURI
};
```

### 2-2. shell/src/meta/__tests__/MetaURI.test.cjs

```javascript
const {
  buildNodeURI, buildEdgeURI, buildUniverseURI, buildMetaedgeURI,
  parseURI, isValidURI
} = require('../MetaURI.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: buildNodeURI 기본
(function() {
  const uri = buildNodeURI({ nodeId: 'g1_type' });
  assert(uri === 'urn:ecorean:universe:1:node:g1_type', 'default node URI');
})();

// Test 2: buildNodeURI 커스텀 universe
(function() {
  const uri = buildNodeURI({ namespace: 'vine-farm', universeId: '1', nodeId: 'harvest' });
  assert(uri === 'urn:vine-farm:universe:1:node:harvest', 'vine-farm URI');
})();

// Test 3: buildNodeURI nodeId 누락 throw
(function() {
  let threw = false;
  try { buildNodeURI({}); } catch(e) { threw = true; }
  assert(threw, 'nodeId 누락 throw');
})();

// Test 4: buildEdgeURI
(function() {
  const uri = buildEdgeURI({ edgeId: 'e_g1_g2' });
  assert(uri === 'urn:ecorean:universe:1:edge:e_g1_g2', 'edge URI');
})();

// Test 5: buildUniverseURI
(function() {
  const uri = buildUniverseURI({ namespace: 'ecorean', universeId: '1' });
  assert(uri === 'urn:ecorean:universe:1', 'universe URI');
})();

// Test 6: buildMetaedgeURI
(function() {
  const uri = buildMetaedgeURI({
    sourceUniverse: 'ecorean',
    targetUniverse: 'vine-farm',
    metaedgeType: 'FAMILY_TRUST'
  });
  assert(uri === 'urn:metaedge:ecorean:vine-farm:FAMILY_TRUST', 'metaedge URI');
})();

// Test 7: parseURI 노드
(function() {
  const result = parseURI('urn:ecorean:universe:1:node:g1_type');
  assert(result.ok === true, 'parse OK');
  assert(result.type === 'node', 'type node');
  assert(result.namespace === 'ecorean', 'namespace');
  assert(result.universeId === '1', 'universeId');
  assert(result.id === 'g1_type', 'id');
})();

// Test 8: parseURI 메타엣지
(function() {
  const result = parseURI('urn:metaedge:ecorean:vine-farm:VEHICLE_SHARE');
  assert(result.ok === true, 'parse metaedge OK');
  assert(result.type === 'metaedge', 'type metaedge');
  assert(result.sourceUniverse === 'ecorean', 'source');
  assert(result.targetUniverse === 'vine-farm', 'target');
  assert(result.metaedgeType === 'VEHICLE_SHARE', 'metaedge type');
})();

// Test 9: parseURI 우주
(function() {
  const result = parseURI('urn:ecorean:universe:1');
  assert(result.ok === true, 'parse universe');
  assert(result.type === 'universe', 'type');
})();

// Test 10: parseURI 잘못된 형식
(function() {
  assert(parseURI('not-a-uri').ok === false, '잘못된 prefix');
  assert(parseURI('urn:invalid').ok === false, '짧은 URI');
})();

// Test 11: isValidURI
(function() {
  assert(isValidURI('urn:ecorean:universe:1:node:g1_type') === true, '유효');
  assert(isValidURI('garbage') === false, '무효');
})();

console.log('[PASS] MetaURI (11/11)');
```

### 2-3. 검증

```bash
node shell/src/meta/__tests__/MetaURI.test.cjs
# 기대: [PASS] MetaURI (11/11)
```

---

## 작업 3: Universe + Trust Links (인터페이스 #4)

### 3-1. shell/src/meta/Universe.cjs

```javascript
// ECOREAN BOC v5.6 — Universe 정의 + Trust Links
// SoT: docs/MASTER_PLAN.md §110.2 #4 + §112 + §113

const { buildUniverseURI, buildMetaedgeURI } = require('./MetaURI.cjs');

const METAEDGE_TYPES = [
  'FAMILY_TRUST',     // 가족 신뢰
  'VEHICLE_SHARE',    // 차량 공유 (1톤 더블캡)
  'CAPITAL_FLOW',     // 자본 흐름
  'LABOR_POOL',       // 인력 공유 (비수기 ↔ 농번기)
  'DATA_CROSS',       // 고객 DB 교차 마케팅
  'LOGISTICS_HUB',    // 물류 거점
  'INSTANCE',         // 가맹점 인스턴스
  'DATA_SYNC',        // 데이터 동기화
  'VERSION_PROP',     // 버전 자동 전파
  'INTER_ORG',        // 외부 협력사
  'SUPPLY',           // 자재 공급
  'CONTRACT'          // 시공 계약
];

// 결정 권한 (D2)
const DECISION_AUTHORITY = {
  AUTO:   'auto_rule',           // 자동 룰
  HUMAN:  'operator_only',       // 대표님 단독
  BOTH:   'auto_with_oversight'  // 자동 + 대표님 감독
};

class Universe {
  constructor(opts) {
    this.id = opts.id;                          // 'ecorean'
    this.namespace = opts.namespace || opts.id;
    this.universeId = opts.universeId || '1';
    this.uri = buildUniverseURI({
      namespace: this.namespace,
      universeId: this.universeId
    });
    this.name = opts.name || opts.id;
    this.operator = opts.operator;              // 'udunext7-wq'
    this.purpose = opts.purpose || '';
    this.expectedConnectionDate = opts.expectedConnectionDate || null;

    // Trust links
    this.trust = {
      incoming: opts.incomingTrust || [],
      outgoing: opts.outgoingTrust || []
    };

    // 메타엣지 정의
    this.metaedges = opts.metaedges || [];      // [{ targetUniverse, type, decisionAuthority, ... }]
  }

  // 다른 우주에 메타엣지 추가
  addMetaedge(opts) {
    const targetUni = opts.targetUniverse;
    const type = opts.metaedgeType;
    if (!targetUni || !type) throw new Error('addMetaedge: targetUniverse, metaedgeType 필수');
    if (!METAEDGE_TYPES.includes(type)) {
      throw new Error('addMetaedge: 미정의 메타엣지 타입 ' + type);
    }

    const uri = buildMetaedgeURI({
      sourceUniverse: this.namespace,
      targetUniverse: targetUni,
      metaedgeType: type
    });

    const edge = {
      uri: uri,
      sourceUniverse: this.namespace,
      targetUniverse: targetUni,
      metaedgeType: type,
      description: opts.description || '',
      decisionAuthority: opts.decisionAuthority || DECISION_AUTHORITY.HUMAN,
      autoRule: opts.autoRule || null,           // 자동 룰 (조건)
      createdAt: Date.now(),
      activated: opts.activated || false         // 자리만 → 활성화는 D3 시점
    };

    this.metaedges.push(edge);

    // outgoing trust 갱신
    if (!this.trust.outgoing.includes(targetUni)) {
      this.trust.outgoing.push(targetUni);
    }

    return edge;
  }

  // 메타엣지 활성화 (D2 결정 권한 검증)
  activateMetaedge(uri, approver) {
    const edge = this.metaedges.find(function(e) { return e.uri === uri; });
    if (!edge) return { ok: false, error: 'metaedge not found' };

    // 자동 룰만 → approver 불필요
    if (edge.decisionAuthority === DECISION_AUTHORITY.AUTO) {
      edge.activated = true;
      edge.activatedAt = Date.now();
      return { ok: true, edge: edge };
    }

    // 대표님 단독 → approver 필수
    if (edge.decisionAuthority === DECISION_AUTHORITY.HUMAN) {
      if (!approver) return { ok: false, error: 'human approval required' };
      edge.activated = true;
      edge.activatedAt = Date.now();
      edge.approvedBy = approver;
      return { ok: true, edge: edge };
    }

    return { ok: false, error: 'unknown decision authority' };
  }

  // JSON-LD 출력
  toJSONLD() {
    return {
      '@context': 'https://ecorean.io/ontology/v1',
      '@type': 'Universe',
      '@id': this.uri,
      'id': this.id,
      'name': this.name,
      'operator': this.operator,
      'purpose': this.purpose,
      'trust': this.trust,
      'metaedges': this.metaedges.map(function(e) {
        return Object.assign({ '@type': 'Metaedge' }, e);
      })
    };
  }
}

module.exports = {
  Universe: Universe,
  METAEDGE_TYPES: METAEDGE_TYPES,
  DECISION_AUTHORITY: DECISION_AUTHORITY
};
```

### 3-2. shell/src/meta/__tests__/Universe.test.cjs

```javascript
const { Universe, METAEDGE_TYPES, DECISION_AUTHORITY } = require('../Universe.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 메타엣지 12 타입
(function() {
  assert(METAEDGE_TYPES.length === 12, '12 메타엣지 타입');
  assert(METAEDGE_TYPES.includes('FAMILY_TRUST'), 'FAMILY_TRUST');
  assert(METAEDGE_TYPES.includes('VEHICLE_SHARE'), 'VEHICLE_SHARE');
})();

// Test 2: 결정 권한 3종
(function() {
  assert(DECISION_AUTHORITY.AUTO === 'auto_rule', 'AUTO');
  assert(DECISION_AUTHORITY.HUMAN === 'operator_only', 'HUMAN');
  assert(DECISION_AUTHORITY.BOTH === 'auto_with_oversight', 'BOTH');
})();

// Test 3: Universe 인스턴스화
(function() {
  const u = new Universe({
    id: 'ecorean',
    name: 'ECOREAN BOC',
    operator: 'udunext7-wq',
    purpose: 'Closed Loop OS'
  });
  assert(u.uri === 'urn:ecorean:universe:1', 'URI');
  assert(u.id === 'ecorean', 'id');
})();

// Test 4: addMetaedge 정상
(function() {
  const u = new Universe({ id: 'ecorean' });
  const edge = u.addMetaedge({
    targetUniverse: 'vine-farm',
    metaedgeType: 'FAMILY_TRUST',
    description: '대표님 ↔ 아버지',
    decisionAuthority: DECISION_AUTHORITY.HUMAN
  });
  assert(edge.uri === 'urn:metaedge:ecorean:vine-farm:FAMILY_TRUST', 'edge URI');
  assert(edge.activated === false, '자리만 (미활성)');
  assert(u.trust.outgoing.includes('vine-farm'), 'trust 등록');
})();

// Test 5: addMetaedge 미정의 타입 throw
(function() {
  const u = new Universe({ id: 'ecorean' });
  let threw = false;
  try {
    u.addMetaedge({ targetUniverse: 'x', metaedgeType: 'INVALID' });
  } catch(e) { threw = true; }
  assert(threw, '미정의 타입 throw');
})();

// Test 6: activateMetaedge — AUTO (approver 불필요)
(function() {
  const u = new Universe({ id: 'ecorean' });
  const edge = u.addMetaedge({
    targetUniverse: 'franchise-001',
    metaedgeType: 'INSTANCE',
    decisionAuthority: DECISION_AUTHORITY.AUTO
  });
  const result = u.activateMetaedge(edge.uri);   // approver 없음
  assert(result.ok === true, 'AUTO 활성화 성공');
  assert(edge.activated === true, '활성화 됨');
})();

// Test 7: activateMetaedge — HUMAN (approver 필수)
(function() {
  const u = new Universe({ id: 'ecorean' });
  const edge = u.addMetaedge({
    targetUniverse: 'vine-farm',
    metaedgeType: 'FAMILY_TRUST',
    decisionAuthority: DECISION_AUTHORITY.HUMAN
  });
  const result1 = u.activateMetaedge(edge.uri);   // approver 없음
  assert(result1.ok === false, 'HUMAN approver 없으면 차단');

  const result2 = u.activateMetaedge(edge.uri, 'udunext7-wq');
  assert(result2.ok === true, 'approver 있으면 활성화');
  assert(edge.approvedBy === 'udunext7-wq', '승인자 기록');
})();

// Test 8: toJSONLD
(function() {
  const u = new Universe({ id: 'ecorean', operator: 'udunext7-wq' });
  u.addMetaedge({
    targetUniverse: 'vine-farm',
    metaedgeType: 'CAPITAL_FLOW',
    decisionAuthority: DECISION_AUTHORITY.BOTH
  });
  const jsonld = u.toJSONLD();
  assert(jsonld['@context'] === 'https://ecorean.io/ontology/v1', '@context');
  assert(jsonld['@type'] === 'Universe', '@type');
  assert(jsonld['@id'] === 'urn:ecorean:universe:1', '@id');
  assert(jsonld.metaedges.length === 1, '메타엣지 1');
  assert(jsonld.metaedges[0]['@type'] === 'Metaedge', 'metaedge type');
})();

console.log('[PASS] Universe (8/8)');
```

### 3-3. 검증

```bash
node shell/src/meta/__tests__/Universe.test.cjs
# 기대: [PASS] Universe (8/8)
```

---

## 작업 4: JSON-LD 1.1 export (인터페이스 #2)

### 4-1. shell/src/meta/JsonLD.cjs

```javascript
// ECOREAN BOC v5.6 — JSON-LD 1.1 export
// SoT: docs/MASTER_PLAN.md §110.2 #2

const fs = require('fs');
const path = require('path');

const JSONLD_CONTEXT = {
  '@vocab': 'https://ecorean.io/ontology/v1#',
  'ecorean': 'https://ecorean.io/ontology/v1#',
  'schema': 'https://schema.org/'
};

// graph.json → JSON-LD 1.1 변환
function graphToJSONLD(graph) {
  if (!graph) throw new Error('graph 객체 필수');
  return {
    '@context': graph['@context'] || JSONLD_CONTEXT,
    '@type': 'BusinessGraph',
    '@id': graph['@id'],
    'version': graph.version,
    'tenantId': graph.tenantId,
    'universe': graph.universe,
    'nodes': (graph.nodes || []).map(function(n) {
      return Object.assign({ '@type': 'Node', '@id': n.uri }, n);
    }),
    'edges': (graph.edges || []).map(function(e) {
      return Object.assign({ '@type': 'Edge' }, e);
    }),
    'metaCompatibilityInterfaces': graph.metaCompatibilityInterfaces || []
  };
}

// graph.json 파일 → JSON-LD 파일 export
function exportGraphAsJSONLD(graphPath, outputPath) {
  const raw = fs.readFileSync(graphPath, 'utf-8');
  const graph = JSON.parse(raw);
  const jsonld = graphToJSONLD(graph);
  fs.writeFileSync(outputPath, JSON.stringify(jsonld, null, 2), 'utf-8');
  return jsonld;
}

// 검증 — JSON-LD 1.1 핵심 필드 존재
function validateJSONLD(jsonld) {
  const errors = [];
  if (!jsonld['@context']) errors.push('@context 누락');
  if (!jsonld['@id']) errors.push('@id 누락');
  if (!jsonld['@type']) errors.push('@type 누락');
  return errors;
}

module.exports = {
  JSONLD_CONTEXT: JSONLD_CONTEXT,
  graphToJSONLD: graphToJSONLD,
  exportGraphAsJSONLD: exportGraphAsJSONLD,
  validateJSONLD: validateJSONLD
};
```

### 4-2. shell/src/meta/__tests__/JsonLD.test.cjs

```javascript
const fs = require('fs');
const path = require('path');
const { graphToJSONLD, exportGraphAsJSONLD, validateJSONLD } = require('../JsonLD.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: graphToJSONLD 기본
(function() {
  const graph = {
    '@id': 'urn:ecorean:universe:1',
    'version': '5.6',
    'tenantId': 'HQ',
    'nodes': [{ id: 'g1_type', uri: 'urn:ecorean:universe:1:node:g1_type' }],
    'edges': [{ id: 'e_test', source: 'g1', target: 'g2', event: 'TEST' }]
  };
  const ld = graphToJSONLD(graph);
  assert(ld['@type'] === 'BusinessGraph', '@type');
  assert(ld['@id'] === 'urn:ecorean:universe:1', '@id');
  assert(ld.nodes[0]['@type'] === 'Node', 'node @type');
  assert(ld.edges[0]['@type'] === 'Edge', 'edge @type');
})();

// Test 2: graph.json 실제 파일 변환
(function() {
  const graphPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.json');
  if (!fs.existsSync(graphPath)) {
    console.warn('[SKIP] graph.json not found');
    return;
  }
  const raw = fs.readFileSync(graphPath, 'utf-8');
  const graph = JSON.parse(raw);
  const ld = graphToJSONLD(graph);
  assert(ld['@type'] === 'BusinessGraph', '실제 graph.json @type');
  assert(ld.nodes.length >= 11, '11+ 노드');
})();

// Test 3: exportGraphAsJSONLD 파일 출력
(function() {
  const graphPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.json');
  const outPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.jsonld');
  if (!fs.existsSync(graphPath)) {
    console.warn('[SKIP] graph.json not found');
    return;
  }
  exportGraphAsJSONLD(graphPath, outPath);
  assert(fs.existsSync(outPath), 'JSON-LD 파일 생성');
  const ld = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
  assert(ld['@context'], '@context 출력');
})();

// Test 4: validateJSONLD 정상
(function() {
  const ld = { '@context': {}, '@id': 'x', '@type': 'BusinessGraph' };
  const errors = validateJSONLD(ld);
  assert(errors.length === 0, '검증 통과');
})();

// Test 5: validateJSONLD 누락
(function() {
  const errors = validateJSONLD({});
  assert(errors.length === 3, '3 누락');
})();

console.log('[PASS] JsonLD (5/5)');
```

### 4-3. 검증

```bash
node shell/src/meta/__tests__/JsonLD.test.cjs
# 기대: [PASS] JsonLD (5/5) + docs/graph.jsonld 생성됨
```

---

## 작업 5: RDF Triple 매핑 + DB 테이블 (인터페이스 #3)

### 5-1. db/migrations/v5.6/002_triples_up.sql

```sql
-- ECOREAN BOC v5.6 — RDF Triple 저장 테이블
-- SoT: docs/MASTER_PLAN.md §110.2 #3
-- Subject-Predicate-Object 트리플 저장
-- 멀티테넌시: tenant_id

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS triples (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  subject TEXT NOT NULL,        -- URI 또는 literal
  predicate TEXT NOT NULL,      -- 관계 URI
  object TEXT NOT NULL,         -- URI 또는 literal
  object_type TEXT NOT NULL,    -- 'uri' | 'literal' | 'number' | 'boolean'
  graph_context TEXT,           -- 어느 그래프 (시스템 토폴로지 / 비즈니스)
  created_at INTEGER NOT NULL,
  CHECK (object_type IN ('uri','literal','number','boolean'))
);

CREATE INDEX IF NOT EXISTS idx_triples_subject   ON triples(subject);
CREATE INDEX IF NOT EXISTS idx_triples_predicate ON triples(predicate);
CREATE INDEX IF NOT EXISTS idx_triples_tenant    ON triples(tenant_id);
CREATE INDEX IF NOT EXISTS idx_triples_graph     ON triples(graph_context);

COMMIT;
```

### 5-2. db/migrations/v5.6/002_triples_down.sql

```sql
BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_triples_graph;
DROP INDEX IF EXISTS idx_triples_tenant;
DROP INDEX IF EXISTS idx_triples_predicate;
DROP INDEX IF EXISTS idx_triples_subject;
DROP TABLE IF EXISTS triples;
COMMIT;
```

### 5-3. scripts/migrate_v5.6_triples.cjs

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH  = path.join(__dirname, '..', 'ecorean-boc.db');
const UP_SQL   = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '002_triples_up.sql');
const DOWN_SQL = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '002_triples_down.sql');

const cmd = process.argv[2] || 'up';
const sqlFile = cmd === 'down' ? DOWN_SQL : UP_SQL;

const db = new Database(DB_PATH);
const sql = fs.readFileSync(sqlFile, 'utf-8');
db.exec(sql);

const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='triples'").get();
if (cmd === 'up') {
  if (!row) { console.error('[FAIL] triples 테이블 미생성'); process.exit(1); }
  console.log('[PASS] triples 테이블 생성');
  const cnt = db.prepare("SELECT COUNT(*) as c FROM triples").get();
  console.log('  rows: ' + cnt.c);
} else {
  if (row) { console.error('[FAIL] triples 테이블 미삭제'); process.exit(1); }
  console.log('[PASS] triples 테이블 삭제');
}
db.close();
```

### 5-4. shell/src/meta/RDFTriple.cjs

```javascript
// ECOREAN BOC v5.6 — RDF Triple 매핑
// (Subject, Predicate, Object) 형식의 의미 표현
// SoT: docs/MASTER_PLAN.md §110.2 #3

const OBJECT_TYPES = ['uri', 'literal', 'number', 'boolean'];

function createTriple(opts) {
  if (!opts.subject || !opts.predicate || opts.object == null) {
    throw new Error('createTriple: subject, predicate, object 필수');
  }
  const objectType = opts.objectType || _inferType(opts.object);
  if (!OBJECT_TYPES.includes(objectType)) {
    throw new Error('createTriple: 미정의 objectType ' + objectType);
  }
  return {
    id: opts.id || ('triple_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    tenantId: opts.tenantId || 'HQ',
    subject: opts.subject,
    predicate: opts.predicate,
    object: String(opts.object),
    objectType: objectType,
    graphContext: opts.graphContext || 'system',     // 'system' | 'business'
    createdAt: opts.createdAt || Date.now()
  };
}

function _inferType(obj) {
  if (typeof obj === 'number') return 'number';
  if (typeof obj === 'boolean') return 'boolean';
  if (typeof obj === 'string' && obj.startsWith('urn:')) return 'uri';
  return 'literal';
}

function validateTriple(triple) {
  const errors = [];
  if (!triple.id) errors.push('id 누락');
  if (!triple.subject) errors.push('subject 누락');
  if (!triple.predicate) errors.push('predicate 누락');
  if (!triple.object) errors.push('object 누락');
  if (!OBJECT_TYPES.includes(triple.objectType)) errors.push('objectType 미정의');
  return errors;
}

// graph.json → RDF Triples 변환
function graphToTriples(graph, tenantId) {
  const tenant = tenantId || graph.tenantId || 'HQ';
  const triples = [];

  // 노드 → triples
  (graph.nodes || []).forEach(function(n) {
    triples.push(createTriple({
      tenantId: tenant,
      subject: n.uri,
      predicate: 'rdf:type',
      object: 'urn:type:' + n.type,
      graphContext: 'system'
    }));
    triples.push(createTriple({
      tenantId: tenant,
      subject: n.uri,
      predicate: 'ecorean:hasPackage',
      object: n.package || 'unknown',
      objectType: 'literal',
      graphContext: 'system'
    }));
  });

  // 엣지 → triples
  (graph.edges || []).forEach(function(e) {
    const sourceNode = (graph.nodes || []).find(function(n) { return n.id === e.source; });
    const targetNode = (graph.nodes || []).find(function(n) { return n.id === e.target; });
    if (!sourceNode || !targetNode) return;

    triples.push(createTriple({
      tenantId: tenant,
      subject: sourceNode.uri,
      predicate: 'ecorean:emits',
      object: targetNode.uri,
      graphContext: 'system'
    }));
  });

  return triples;
}

module.exports = {
  OBJECT_TYPES: OBJECT_TYPES,
  createTriple: createTriple,
  validateTriple: validateTriple,
  graphToTriples: graphToTriples
};
```

### 5-5. shell/src/meta/__tests__/RDFTriple.test.cjs

```javascript
const fs = require('fs');
const path = require('path');
const { OBJECT_TYPES, createTriple, validateTriple, graphToTriples } = require('../RDFTriple.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 4 object 타입
(function() {
  assert(OBJECT_TYPES.length === 4, '4 타입');
})();

// Test 2: createTriple 기본
(function() {
  const t = createTriple({
    subject: 'urn:ecorean:universe:1:node:g1_type',
    predicate: 'rdf:type',
    object: 'urn:type:gate'
  });
  assert(t.subject.includes('g1_type'), 'subject');
  assert(t.objectType === 'uri', '자동 추론 uri');
  assert(t.graphContext === 'system', '기본 system');
})();

// Test 3: 자동 타입 추론
(function() {
  assert(createTriple({ subject: 'a', predicate: 'b', object: 'literal' }).objectType === 'literal', 'literal');
  assert(createTriple({ subject: 'a', predicate: 'b', object: 42 }).objectType === 'number', 'number');
  assert(createTriple({ subject: 'a', predicate: 'b', object: true }).objectType === 'boolean', 'boolean');
})();

// Test 4: 누락 throw
(function() {
  let threw = false;
  try { createTriple({ subject: 'a' }); } catch(e) { threw = true; }
  assert(threw, '누락 throw');
})();

// Test 5: validateTriple
(function() {
  const t = createTriple({ subject: 'a', predicate: 'b', object: 'c' });
  assert(validateTriple(t).length === 0, '정상 검증');
  assert(validateTriple({}).length > 0, '빈 객체 에러');
})();

// Test 6: graphToTriples 실제 graph.json
(function() {
  const graphPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.json');
  if (!fs.existsSync(graphPath)) {
    console.warn('[SKIP] graph.json not found');
    return;
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  const triples = graphToTriples(graph);
  // 12 노드 × 2 트리플 (rdf:type + hasPackage) + 24 엣지 트리플 = 48
  assert(triples.length >= 40, '40+ 트리플 생성: 실제 ' + triples.length);

  // 모든 트리플 검증
  triples.forEach(function(t) {
    const errs = validateTriple(t);
    assert(errs.length === 0, '트리플 검증');
  });
})();

console.log('[PASS] RDFTriple (6/6)');
```

### 5-6. 마이그레이션 + 검증

```bash
# 사전 백업
cp ecorean-boc.db ecorean-boc.db.bak.week5

# triples 테이블 생성
node scripts/migrate_v5.6_triples.cjs up
# 기대: [PASS] triples 테이블 생성

# 단위 테스트
node shell/src/meta/__tests__/RDFTriple.test.cjs
# 기대: [PASS] RDFTriple (6/6)

# 9탭 회귀
node test-engine.js
```

---

## 작업 6: Schema Registry 분리 (인터페이스 #5)

### 6-1. docs/schemas/ecorean.universe.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://ecorean.io/schemas/v1/Universe.schema.json",
  "title": "ECOREAN Universe",
  "type": "object",
  "required": ["id", "uri", "operator"],
  "properties": {
    "id": { "type": "string" },
    "uri": { "type": "string", "pattern": "^urn:" },
    "name": { "type": "string" },
    "operator": { "type": "string" },
    "purpose": { "type": "string" },
    "trust": {
      "type": "object",
      "properties": {
        "incoming": { "type": "array", "items": { "type": "string" } },
        "outgoing": { "type": "array", "items": { "type": "string" } }
      }
    },
    "metaedges": {
      "type": "array",
      "items": { "$ref": "ecorean.metaedge.schema.json" }
    }
  }
}
```

### 6-2. docs/schemas/ecorean.node.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://ecorean.io/schemas/v1/Node.schema.json",
  "title": "ECOREAN Node",
  "type": "object",
  "required": ["id", "uri", "type"],
  "properties": {
    "id": { "type": "string" },
    "uri": { "type": "string", "pattern": "^urn:" },
    "type": { "type": "string", "enum": ["gate","module","engine","ml"] },
    "package": { "type": "string" },
    "version": { "type": "string" },
    "sla": {
      "type": "object",
      "properties": { "maxLatencyMs": { "type": "number" } }
    },
    "dependsOn": { "type": ["array","string","null"] }
  }
}
```

### 6-3. docs/schemas/ecorean.edge.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://ecorean.io/schemas/v1/Edge.schema.json",
  "title": "ECOREAN Edge",
  "type": "object",
  "required": ["id", "source", "target", "event"],
  "properties": {
    "id": { "type": "string" },
    "source": { "type": "string" },
    "target": { "type": "string" },
    "event": { "type": "string" },
    "scope": { "type": "string", "enum": ["INTRA","INTER","META"] },
    "schemaRef": { "type": "string" }
  }
}
```

### 6-4. docs/schemas/ecorean.metaedge.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://ecorean.io/schemas/v1/Metaedge.schema.json",
  "title": "ECOREAN Metaedge",
  "type": "object",
  "required": ["uri", "sourceUniverse", "targetUniverse", "metaedgeType"],
  "properties": {
    "uri": { "type": "string", "pattern": "^urn:metaedge:" },
    "sourceUniverse": { "type": "string" },
    "targetUniverse": { "type": "string" },
    "metaedgeType": {
      "type": "string",
      "enum": [
        "FAMILY_TRUST","VEHICLE_SHARE","CAPITAL_FLOW","LABOR_POOL",
        "DATA_CROSS","LOGISTICS_HUB","INSTANCE","DATA_SYNC","VERSION_PROP",
        "INTER_ORG","SUPPLY","CONTRACT"
      ]
    },
    "decisionAuthority": {
      "type": "string",
      "enum": ["auto_rule","operator_only","auto_with_oversight"]
    },
    "activated": { "type": "boolean" },
    "approvedBy": { "type": "string" }
  }
}
```

---

## 작업 7: L3 포도농장 OS 자리 (§112)

### 7-1. docs/universes/vine-farm.json

```json
{
  "$schema": "../schemas/ecorean.universe.schema.json",
  "@context": {
    "@vocab": "https://ecorean.io/ontology/v1#",
    "ecorean": "https://ecorean.io/ontology/v1#"
  },
  "@type": "Universe",
  "@id": "urn:vine-farm:universe:1",
  "id": "vine-farm",
  "namespace": "vine-farm",
  "universeId": "1",
  "name": "포도농장 OS",
  "operator": "udunext7-wq",
  "purpose": "농산물 유통 플랫폼 (아버지 농장 기반)",
  "expectedConnectionDate": "2026-Q4",
  "status": "PLANNED",
  "trust": {
    "incoming": ["ecorean"],
    "outgoing": ["ecorean"]
  },
  "metaedges": [
    {
      "uri": "urn:metaedge:ecorean:vine-farm:FAMILY_TRUST",
      "sourceUniverse": "ecorean",
      "targetUniverse": "vine-farm",
      "metaedgeType": "FAMILY_TRUST",
      "description": "가족 신뢰 노드 — 대표님 + 아버지",
      "decisionAuthority": "operator_only",
      "activated": false
    },
    {
      "uri": "urn:metaedge:ecorean:vine-farm:VEHICLE_SHARE",
      "sourceUniverse": "ecorean",
      "targetUniverse": "vine-farm",
      "metaedgeType": "VEHICLE_SHARE",
      "description": "1톤 더블캡 차량 공유 (인테리어 자재 ↔ 포도 운송)",
      "decisionAuthority": "auto_rule",
      "autoRule": "1톤 더블캡 사용 일정 통합",
      "activated": false
    },
    {
      "uri": "urn:metaedge:ecorean:vine-farm:CAPITAL_FLOW",
      "sourceUniverse": "ecorean",
      "targetUniverse": "vine-farm",
      "metaedgeType": "CAPITAL_FLOW",
      "description": "자본 흐름 통합 (계절적)",
      "decisionAuthority": "auto_with_oversight",
      "activated": false
    },
    {
      "uri": "urn:metaedge:ecorean:vine-farm:LABOR_POOL",
      "sourceUniverse": "ecorean",
      "targetUniverse": "vine-farm",
      "metaedgeType": "LABOR_POOL",
      "description": "비수기 시공 인력 ↔ 농번기 인력",
      "decisionAuthority": "auto_rule",
      "autoRule": "ECOREAN 인력 30% 미가동 시 농번기 자동 이동",
      "activated": false
    },
    {
      "uri": "urn:metaedge:ecorean:vine-farm:DATA_CROSS",
      "sourceUniverse": "ecorean",
      "targetUniverse": "vine-farm",
      "metaedgeType": "DATA_CROSS",
      "description": "고객 DB 교차 마케팅",
      "decisionAuthority": "operator_only",
      "activated": false
    },
    {
      "uri": "urn:metaedge:ecorean:vine-farm:LOGISTICS_HUB",
      "sourceUniverse": "ecorean",
      "targetUniverse": "vine-farm",
      "metaedgeType": "LOGISTICS_HUB",
      "description": "물류 거점 통합 (사무실 + 농장)",
      "decisionAuthority": "auto_with_oversight",
      "activated": false
    }
  ],
  "preconditions": [
    "아버지 협력 동의 (2026-Q3 확인)",
    "ECOREAN 인테리어 첫 시공 1건 완료 (Phase 3 Week 8)"
  ],
  "verificationGoals": [
    "포도농장 데이터를 ECOREAN 그래프가 쿼리 가능한가",
    "인테리어 비수기 + 농번기 인력 자동 배치 작동하는가",
    "두 우주 정산이 단일 회계로 통합 가능한가"
  ]
}
```

---

## 작업 8: 통합 테스트 — Phase 3-F Gate Test

```bash
# Week 6 신규
node shell/src/meta/__tests__/MetaURI.test.cjs        # 11/11
node shell/src/meta/__tests__/Universe.test.cjs        # 8/8
node shell/src/meta/__tests__/JsonLD.test.cjs           # 5/5
node shell/src/meta/__tests__/RDFTriple.test.cjs       # 6/6
node scripts/migrate_v5.6_triples.cjs up               # PASS

# 누적 회귀 (Week 1~5)
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

# graph.json + 9탭
node scripts/generate-from-graph.js
node test-engine.js
```

### 8-1. PHASE_3F_COMPLETE 활성화

`shell/src/feature-flags/flags.cjs`:
- `PHASE_3F_COMPLETE: false` → `true`
- `META_COMPAT_JSONLD:` → `true` (출력 가능)
- `META_COMPAT_RDF:` → `true` (DB 적재 가능)
- `META_COMPAT_UNIVERSE:` → `true` (Universe 인터페이스 활성)

### 8-2. flags 테스트 갱신

```javascript
// Test 1에 추가
assert(isEnabled('PHASE_3F_COMPLETE') === true, 'PHASE_3F_COMPLETE Week6 완료 true');
assert(isEnabled('META_COMPAT_JSONLD') === true, 'JSON-LD 활성');
assert(isEnabled('META_COMPAT_RDF') === true, 'RDF 활성');
assert(isEnabled('META_COMPAT_UNIVERSE') === true, 'Universe 활성');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
```

---

## 작업 9: 커밋 (4개 분리)

```bash
# 커밋 1: URI + Universe + 메타엣지
git add shell/src/meta/MetaURI.cjs shell/src/meta/Universe.cjs shell/src/meta/__tests__/MetaURI.test.cjs shell/src/meta/__tests__/Universe.test.cjs
git commit -m "feat(v5.6/meta): URI 식별 시스템 + Universe + 메타엣지 12종 (19/19 PASS)

- buildNodeURI/EdgeURI/UniverseURI/MetaedgeURI
- parseURI 4종 (node/edge/universe/metaedge)
- Universe 클래스 + addMetaedge + activateMetaedge (D2 권한 검증)
- METAEDGE_TYPES 12: FAMILY_TRUST/VEHICLE_SHARE/CAPITAL_FLOW/LABOR_POOL/DATA_CROSS/LOGISTICS_HUB/INSTANCE/DATA_SYNC/VERSION_PROP/INTER_ORG/SUPPLY/CONTRACT
- DECISION_AUTHORITY 3종 (AUTO/HUMAN/BOTH)
- toJSONLD 출력
- MetaURI 11/11 + Universe 8/8"

# 커밋 2: JSON-LD + RDF Triple + DB 마이그레이션
git add shell/src/meta/JsonLD.cjs shell/src/meta/RDFTriple.cjs shell/src/meta/__tests__/JsonLD.test.cjs shell/src/meta/__tests__/RDFTriple.test.cjs db/migrations/v5.6/002_triples_up.sql db/migrations/v5.6/002_triples_down.sql scripts/migrate_v5.6_triples.cjs
git commit -m "feat(v5.6/meta): JSON-LD 1.1 export + RDF Triple + triples 테이블 (11/11 PASS)

- graphToJSONLD: graph.json → JSON-LD 1.1 표준 출력
- exportGraphAsJSONLD: docs/graph.jsonld 자동 생성
- RDFTriple: Subject-Predicate-Object 매핑
- graphToTriples: graph.json → 40+ 트리플 자동 생성
- triples 테이블 (tenant_id + S/P/O/object_type + graph_context)
- rollback SQL 쌍 + 마이그레이션 스크립트"

# 커밋 3: Schema Registry + L3 포도농장 OS 자리
git add docs/schemas/ docs/universes/
git commit -m "feat(v5.6/meta): Schema Registry 4종 + L3 포도농장 OS 자리 (D3 2026 Q4)

- docs/schemas/ecorean.universe.schema.json
- docs/schemas/ecorean.node.schema.json
- docs/schemas/ecorean.edge.schema.json
- docs/schemas/ecorean.metaedge.schema.json
- docs/universes/vine-farm.json (6 메타엣지 자리, status: PLANNED)
- 메타엣지: FAMILY_TRUST(HUMAN) / VEHICLE_SHARE(AUTO) / CAPITAL_FLOW(BOTH) / LABOR_POOL(AUTO) / DATA_CROSS(HUMAN) / LOGISTICS_HUB(BOTH)
- preconditions: 아버지 동의 + 인테리어 1호점 완료
- 활성화는 2026 하반기"

# 커밋 4: PHASE_3F_COMPLETE 활성화
git add shell/src/feature-flags/ docs/graph.jsonld
git commit -m "feat(v5.6/phase-3f): Phase 3 Week 6 완료 — 메타 호환 6+α 활성화

- META_COMPAT_JSONLD = true
- META_COMPAT_RDF = true
- META_COMPAT_UNIVERSE = true
- PHASE_3F_COMPLETE = true
- 모든 회귀 PASS"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 6 완료 (Phase 3-F 메타 호환 6+α)

[신규 모듈]
- shell/src/meta/MetaURI.cjs           — URI 식별 시스템
- shell/src/meta/Universe.cjs           — Universe + 메타엣지 12종
- shell/src/meta/JsonLD.cjs             — JSON-LD 1.1 export
- shell/src/meta/RDFTriple.cjs          — RDF Triple 매핑

[신규 데이터]
- docs/schemas/4종 (universe/node/edge/metaedge)
- docs/universes/vine-farm.json — L3 포도농장 OS 자리
- docs/graph.jsonld — graph.json의 JSON-LD 1.1 출력

[신규 DB]
- triples 테이블 (S-P-O + tenant_id + graph_context)
- rollback SQL 쌍

[테스트 결과]
- MetaURI:           11/11 PASS
- Universe:           8/8 PASS
- JsonLD:             5/5 PASS
- RDFTriple:          6/6 PASS
- 누적 회귀 (Week 1~5): PASS
- test-engine:        5/5 PASS

[메타 호환 6+α 인터페이스]
✅ #1 URI 식별 (urn:ecorean:universe:N:node:X)
✅ #2 JSON-LD 1.1 출력 (graph.jsonld 생성됨)
✅ #3 RDF Triple 매핑 (40+ 트리플 자동 생성)
✅ #4 Universe ID + trust links
✅ #5 Schema Registry 분리 (4종)
✅ #6 Intra/Inter/META Edge scope
[자리만] DID + VC, SPARQL/Cypher, SHACL

[L3 포도농장 OS 준비]
- vine-farm.json 6 메타엣지 자리 명세
- 활성화 시점: 2026-Q4 (D3 결정)
- 사전 조건: 아버지 동의 + 인테리어 첫 시공 1건

[다음 주]
Phase 3 Week 7: 한국 특수성 + NFR
- KS 자재 코드 매핑
- 지역별 단가 보정
- 양중비 강화
- 백업·복구 자동화
- 개인정보 암호화
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- L3 포도농장 OS 메타엣지 activated = true (2026 Q4 전)
- Schema Registry 키 변경 (SoT)

---

**문서 끝.**
