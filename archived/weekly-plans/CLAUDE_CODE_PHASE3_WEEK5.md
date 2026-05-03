# ECOREAN BOC — Phase 3 Week 5 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 d3be90d (Week 4 완료)
> **이번 주 목표:** KPI 모듈 분리 + 시스템 토폴로지 시각화 활성화
> **소요:** 자율 실행 2~3시간
> **확장자:** .cjs (ESM 환경)

---

## 절대 규칙

1. TDD 강제 — 테스트 먼저, 코드 나중
2. 버그 있는 코드 커밋 금지
3. 9탭 회귀 0건 검증 후만 다음 단계
4. **boc-shell.html 직접 수정 금지** (13단계 디자인과 충돌 0)
5. **estimate.html 직접 수정 금지**
6. 22/23/12/6/5 변경 금지
7. Feature Flag로 v5.0 path와 v5.6 path 분리

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # d3be90d 확인
git pull origin master

# Week 1~4 전체 회귀
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
node test-engine.js
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조

```bash
mkdir -p modules-html/kpi-v6/src
mkdir -p modules-html/kpi-v6/__tests__

# 토폴로지 화면 디렉토리 확인 (Week 1 시점에 생성됨)
ls -la modules-html/topology/
# 기대: index.html 존재
```

---

## 작업 2: KPI 11항목 데이터 모델

### 2-1. modules-html/kpi-v6/src/KPIData.cjs

```javascript
// ECOREAN BOC v5.6 — KPI 디지털 계기판 11항목
// SoT: docs/MASTER_PLAN.md §107
//
// 11항목:
//   1. supply       공급가
//   2. contract     도급합계
//   3. final        최종(VAT 포함)
//   4. areaSqm      총 면적 (㎡)
//   5. sqmPrice     ㎡당 단가
//   6. pyPrice      평당 단가
//   7. margin       마진율 (%)
//   8. sectionCount 시공섹션 개수
//   9. spaceCount   공간 개수
//  10. duration     예상 공기 (일)
//  11. automation   자동화율 (%)

const KPI_FIELDS = [
  { key: 'supply',       label: '공급가',         unit: '원',    format: 'currency' },
  { key: 'contract',     label: '도급합계',       unit: '원',    format: 'currency' },
  { key: 'final',        label: '최종(VAT)',      unit: '원',    format: 'currency' },
  { key: 'areaSqm',      label: '총 면적',        unit: '㎡',    format: 'decimal' },
  { key: 'sqmPrice',     label: '㎡당 단가',      unit: '원/㎡', format: 'currency' },
  { key: 'pyPrice',      label: '평당 단가',      unit: '원/평', format: 'currency' },
  { key: 'margin',       label: '마진율',         unit: '%',     format: 'percent' },
  { key: 'sectionCount', label: '시공섹션',       unit: '건',    format: 'integer' },
  { key: 'spaceCount',   label: '공간',           unit: '개',    format: 'integer' },
  { key: 'duration',     label: '예상 공기',      unit: '일',    format: 'integer' },
  { key: 'automation',   label: '자동화율',       unit: '%',     format: 'percent' }
];

// 빈 KPI 데이터 (모든 필드 0)
function emptyKPIData() {
  const data = {};
  KPI_FIELDS.forEach(function(f) { data[f.key] = 0; });
  return data;
}

// estimate 결과 + 게이트 상태 → KPI 데이터 변환
function fromEstimate(estimate, context) {
  const ctx = context || {};
  return {
    supply:       estimate.supply || 0,
    contract:     estimate.contract || 0,
    final:        estimate.final || 0,
    areaSqm:      estimate.areaSqm || 0,
    sqmPrice:     estimate.sqmPrice || 0,
    pyPrice:      estimate.pyPrice || 0,
    margin:       estimate.margin || 0,
    sectionCount: ctx.sectionCount || 0,
    spaceCount:   ctx.spaceCount || 0,
    duration:     ctx.duration || 0,
    automation:   ctx.automation || 0
  };
}

// 포맷팅 (UI 출력용)
function format(value, formatType) {
  if (value == null) return '-';
  switch (formatType) {
    case 'currency':
      return Math.round(value).toLocaleString('ko-KR');
    case 'decimal':
      return parseFloat(value).toFixed(1);
    case 'percent':
      return parseFloat(value).toFixed(1);
    case 'integer':
      return Math.round(value).toString();
    default:
      return String(value);
  }
}

// 게이트 진행도 → 자동화율 (0~99%)
function automationFromGates(lockedCount) {
  // G1=30, G2=70, G3=85, G4=95, G5=99
  const map = [0, 30, 70, 85, 95, 99];
  return map[Math.min(lockedCount, 5)] || 0;
}

// 검증
function validateKPIData(data) {
  const errors = [];
  KPI_FIELDS.forEach(function(f) {
    if (typeof data[f.key] !== 'number') {
      errors.push(f.key + ' 숫자 아님');
    }
  });
  return errors;
}

module.exports = {
  KPI_FIELDS: KPI_FIELDS,
  emptyKPIData: emptyKPIData,
  fromEstimate: fromEstimate,
  format: format,
  automationFromGates: automationFromGates,
  validateKPIData: validateKPIData
};
```

### 2-2. modules-html/kpi-v6/__tests__/KPIData.test.cjs

```javascript
const {
  KPI_FIELDS, emptyKPIData, fromEstimate, format,
  automationFromGates, validateKPIData
} = require('../src/KPIData.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 11항목 정의
(function() {
  assert(KPI_FIELDS.length === 11, '11 항목: ' + KPI_FIELDS.length);
})();

// Test 2: 모든 항목에 key/label/unit/format
(function() {
  KPI_FIELDS.forEach(function(f) {
    assert(f.key && f.label && f.unit && f.format, f.key + ' 속성');
  });
})();

// Test 3: emptyKPIData
(function() {
  const data = emptyKPIData();
  assert(Object.keys(data).length === 11, 'empty 11키');
  assert(data.supply === 0, 'supply 0');
  assert(data.areaSqm === 0, 'areaSqm 0');
})();

// Test 4: fromEstimate 변환
(function() {
  const estimate = {
    supply: 1000, contract: 1500, final: 1650,
    areaSqm: 30, sqmPrice: 55000, pyPrice: 181500, margin: 33.3
  };
  const ctx = { sectionCount: 5, spaceCount: 7, duration: 14, automation: 95 };
  const data = fromEstimate(estimate, ctx);
  assert(data.supply === 1000, 'supply');
  assert(data.sectionCount === 5, 'sectionCount');
  assert(data.automation === 95, 'automation');
})();

// Test 5: format currency
(function() {
  assert(format(1234567, 'currency') === '1,234,567', 'currency');
  assert(format(0, 'currency') === '0', 'currency 0');
})();

// Test 6: format decimal/percent/integer
(function() {
  assert(format(35.5, 'decimal') === '35.5', 'decimal');
  assert(format(13.333, 'percent') === '13.3', 'percent');
  assert(format(14.7, 'integer') === '15', 'integer 반올림');
})();

// Test 7: format null/undefined
(function() {
  assert(format(null, 'currency') === '-', 'null');
  assert(format(undefined, 'currency') === '-', 'undef');
})();

// Test 8: automationFromGates
(function() {
  assert(automationFromGates(0) === 0, '0게이트 = 0%');
  assert(automationFromGates(1) === 30, '1게이트 = 30%');
  assert(automationFromGates(2) === 70, '2게이트 = 70%');
  assert(automationFromGates(3) === 85, '3게이트 = 85%');
  assert(automationFromGates(4) === 95, '4게이트 = 95%');
  assert(automationFromGates(5) === 99, '5게이트 = 99%');
  assert(automationFromGates(99) === 99, '초과해도 99 max');
})();

// Test 9: validateKPIData 정상
(function() {
  const data = emptyKPIData();
  const errors = validateKPIData(data);
  assert(errors.length === 0, 'empty 검증 통과');
})();

// Test 10: validateKPIData 누락 검증
(function() {
  const data = emptyKPIData();
  delete data.supply;
  const errors = validateKPIData(data);
  assert(errors.length > 0, '누락 검증');
})();

console.log('[PASS] KPIData (10/10)');
```

### 2-3. 검증

```bash
node modules-html/kpi-v6/__tests__/KPIData.test.cjs
# 기대: [PASS] KPIData (10/10)
```

---

## 작업 3: KPIBus — estimate → kpi 자동 갱신

### 3-1. modules-html/kpi-v6/src/KPIBus.cjs

```javascript
// ECOREAN BOC v5.6 — KPIBus
// estimate 결과 → KPI 디지털 계기판 자동 갱신
// CoreBus 위 얇은 래퍼

const { coreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
const { fromEstimate, automationFromGates } = require('./KPIData.cjs');

const EVENTS = {
  KPI_UPDATE:    'KPI_UPDATE',
  KPI_OBSERVED:  'KPI_OBSERVED'
};

// 견적 결과 + 컨텍스트 → KPI_UPDATE 발행
function publishKPIUpdate(estimate, context) {
  const kpiData = fromEstimate(estimate, context);
  coreBus.emit(EVENTS.KPI_UPDATE, kpiData, {
    timestamp: Date.now(),
    source: 'estimate-v6'
  });
  return kpiData;
}

// 게이트 잠금 카운트 → 자동화율 자동 갱신
function publishAutomationUpdate(lockedGateCount) {
  const automation = automationFromGates(lockedGateCount);
  coreBus.emit(EVENTS.KPI_UPDATE, { automation: automation }, {
    timestamp: Date.now(),
    source: 'gates',
    partial: true
  });
  return automation;
}

// KPI 갱신 구독
function onKPIUpdate(handler) {
  coreBus.on(EVENTS.KPI_UPDATE, handler);
}

// AI 임원에게 KPI 관찰 데이터 발행
function publishKPIObserved(kpiData) {
  coreBus.emit(EVENTS.KPI_OBSERVED, kpiData, {
    timestamp: Date.now(),
    source: 'kpi-v6'
  });
}

module.exports = {
  EVENTS: EVENTS,
  publishKPIUpdate: publishKPIUpdate,
  publishAutomationUpdate: publishAutomationUpdate,
  onKPIUpdate: onKPIUpdate,
  publishKPIObserved: publishKPIObserved
};
```

### 3-2. modules-html/kpi-v6/__tests__/KPIBus.test.cjs

```javascript
const { CoreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
const {
  EVENTS, publishKPIUpdate, publishAutomationUpdate,
  onKPIUpdate, publishKPIObserved
} = require('../src/KPIBus.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: EVENTS 정의
(function() {
  assert(EVENTS.KPI_UPDATE === 'KPI_UPDATE', 'KPI_UPDATE');
  assert(EVENTS.KPI_OBSERVED === 'KPI_OBSERVED', 'KPI_OBSERVED');
})();

// Test 2: publishKPIUpdate — 견적 결과 → KPI 변환
(function() {
  let received = null;
  onKPIUpdate(function(data, meta) {
    received = { data: data, meta: meta };
  });

  const estimate = {
    supply: 1000000, contract: 1500000, final: 1650000,
    areaSqm: 35, sqmPrice: 47000, pyPrice: 156000, margin: 33.3
  };
  const ctx = { sectionCount: 3, spaceCount: 3, duration: 14, automation: 95 };
  const result = publishKPIUpdate(estimate, ctx);

  assert(received !== null, 'KPI_UPDATE 수신');
  assert(received.data.supply === 1000000, 'supply');
  assert(received.data.sectionCount === 3, 'sectionCount');
  assert(received.meta.source === 'estimate-v6', 'source');
  assert(result.final === 1650000, 'return value');
})();

// Test 3: publishAutomationUpdate — 게이트 카운트 → 자동화율
(function() {
  let received = null;
  onKPIUpdate(function(data, meta) {
    if (meta && meta.partial) received = data;
  });

  publishAutomationUpdate(3);
  assert(received !== null, 'automation 수신');
  assert(received.automation === 85, '3게이트 = 85%');
})();

// Test 4: publishKPIObserved — AI 임원 관찰
(function() {
  const { coreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
  let received = null;
  coreBus.on(EVENTS.KPI_OBSERVED, function(data) { received = data; });

  publishKPIObserved({ supply: 5000 });
  assert(received !== null, 'KPI_OBSERVED 수신');
  assert(received.supply === 5000, 'data');
})();

console.log('[PASS] KPIBus (4/4)');
```

### 3-3. 검증

```bash
node modules-html/kpi-v6/__tests__/KPIBus.test.cjs
# 기대: [PASS] KPIBus (4/4)
```

---

## 작업 4: KPI 디지털 계기판 HTML (다크 + 골드 디자인)

### 4-1. modules-html/kpi-v6/index.html

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>ECOREAN BOC — KPI 디지털 계기판 v5.6</title>
<style>
:root {
  --bg: #0a0e1a;
  --bg2: #14182a;
  --gold: #c9a84c;
  --gold-bright: #ffd700;
  --text: #ede5d5;
  --dim: rgba(201,168,76,0.5);
  --border: rgba(201,168,76,0.15);
  --pos: #4caf50;
  --neg: #f44336;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Noto Sans KR', sans-serif;
  min-height: 100vh;
  padding: 24px;
}
header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
  margin-bottom: 24px;
}
h1 {
  font-family: 'Cinzel', serif;
  color: var(--gold);
  font-size: 18px;
  letter-spacing: 0.16em;
  text-shadow: 0 0 12px rgba(201,168,76,0.4);
}
.subtitle {
  color: var(--dim);
  font-size: 11px;
  letter-spacing: 0.12em;
  margin-top: 4px;
  text-transform: uppercase;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.kpi-card {
  background: linear-gradient(180deg, var(--bg2) 0%, rgba(20,24,42,0.6) 100%);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}
.kpi-card:hover {
  border-color: var(--gold);
  box-shadow: 0 0 24px rgba(201,168,76,0.2);
}
.kpi-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
  opacity: 0.6;
}
.kpi-label {
  font-size: 10px;
  color: var(--dim);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.kpi-value {
  font-family: 'Cinzel', 'Noto Sans KR', serif;
  font-size: 28px;
  color: var(--text);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.kpi-unit {
  font-size: 12px;
  color: var(--dim);
  margin-left: 4px;
  font-weight: 400;
}
.kpi-card.highlight .kpi-value {
  color: var(--gold-bright);
  text-shadow: 0 0 16px rgba(255,215,0,0.4);
}
.controls {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  color: var(--dim);
  font-family: monospace;
}
.controls code {
  color: var(--gold);
}
</style>
</head>
<body>
<header>
  <h1>ECOREAN BOC — KPI DIGITAL DASHBOARD</h1>
  <div class="subtitle">Real-time / 11 metrics / v5.6</div>
</header>
<div class="kpi-grid" id="kpiGrid"></div>
<div class="controls">
  소스: estimate-v6 → KPIBus → coreBus.emit('KPI_UPDATE') → 본 화면 자동 갱신<br>
  데모: 콘솔에서 <code>window.demoKPI()</code> 입력 시 샘플 데이터 표시
</div>
<script src="../../shell/src/core-bus/CoreBus.cjs" type="module" onerror="this.remove()"></script>
<script>
const KPI_FIELDS = [
  { key: 'final',        label: '최종(VAT)',      unit: '원',    format: 'currency', highlight: true },
  { key: 'contract',     label: '도급합계',       unit: '원',    format: 'currency' },
  { key: 'supply',       label: '공급가',         unit: '원',    format: 'currency' },
  { key: 'areaSqm',      label: '총 면적',        unit: '㎡',    format: 'decimal',  highlight: true },
  { key: 'sqmPrice',     label: '㎡당 단가',      unit: '원/㎡', format: 'currency' },
  { key: 'pyPrice',      label: '평당 단가',      unit: '원/평', format: 'currency' },
  { key: 'margin',       label: '마진율',         unit: '%',     format: 'percent' },
  { key: 'sectionCount', label: '시공섹션',       unit: '건',    format: 'integer' },
  { key: 'spaceCount',   label: '공간',           unit: '개',    format: 'integer' },
  { key: 'duration',     label: '예상 공기',      unit: '일',    format: 'integer' },
  { key: 'automation',   label: '자동화율',       unit: '%',     format: 'percent', highlight: true }
];

let currentData = {};
KPI_FIELDS.forEach(f => currentData[f.key] = 0);

function formatValue(value, formatType) {
  if (value == null) return '-';
  switch (formatType) {
    case 'currency': return Math.round(value).toLocaleString('ko-KR');
    case 'decimal':  return parseFloat(value).toFixed(1);
    case 'percent':  return parseFloat(value).toFixed(1);
    case 'integer':  return Math.round(value).toString();
    default: return String(value);
  }
}

function render() {
  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = KPI_FIELDS.map(f => `
    <div class="kpi-card ${f.highlight ? 'highlight' : ''}">
      <div class="kpi-label">${f.label}</div>
      <div class="kpi-value">${formatValue(currentData[f.key], f.format)}<span class="kpi-unit">${f.unit}</span></div>
    </div>
  `).join('');
}

// CoreBus 구독 (브라우저 환경에서 window.coreBus 사용)
if (window.coreBus) {
  window.coreBus.on('KPI_UPDATE', function(data, meta) {
    if (meta && meta.partial) {
      Object.assign(currentData, data);
    } else {
      currentData = Object.assign({}, currentData, data);
    }
    render();
  });
}

// 데모 함수
window.demoKPI = function() {
  currentData = {
    supply: 7350000, contract: 15214500, final: 16735950,
    areaSqm: 35, sqmPrice: 478170, pyPrice: 1580640, margin: 13.0,
    sectionCount: 3, spaceCount: 3, duration: 14, automation: 95
  };
  render();
};

render();
</script>
</body>
</html>
```

---

## 작업 5: 시스템 토폴로지 화면 점검

### 5-1. 기존 파일 검증

Week 1에서 modules-html/topology/index.html이 이미 생성됨 (커밋 6cf695f). 다음만 확인:

```bash
ls -la modules-html/topology/index.html
# 기대: 파일 존재
```

### 5-2. graph.json 무결성 재확인

```bash
node scripts/generate-from-graph.js
# 기대: 12 nodes / 24 edges / PASS
```

토폴로지 화면이 graph.json을 실시간으로 읽으므로 graph.json 무결성만 확인하면 됨. 별도 작업 없음.

---

## 작업 6: KPI ↔ Estimate ↔ Gates 통합 E2E

### 6-1. modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs

```javascript
// ECOREAN BOC v5.6 — KPI 통합 E2E
// G1~G4 → estimate-v6 → KPIBus → KPI 데이터 검증

const { G1Type } = require('../../../shell/src/gates/G1_Type.cjs');
const { G2Concept } = require('../../../shell/src/gates/G2_Concept.cjs');
const { G3Section } = require('../../../shell/src/gates/G3_Section.cjs');
const { G4CAD } = require('../../../shell/src/gates/G4_CAD.cjs');
const { GateRegistry } = require('../../../shell/src/gates/Gate.cjs');
const { calculateEstimate } = require('../../estimate-v6/src/calc/CalcEngineV56.cjs');
const { getSpacesForSections } = require('../../estimate-v6/src/matrices/Sections.cjs');
const { publishKPIUpdate, publishAutomationUpdate, onKPIUpdate } = require('../src/KPIBus.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

function runFlow() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  const g3 = new G3Section();
  const g4 = new G4CAD();
  reg.register(g1); reg.register(g2); reg.register(g3); reg.register(g4);

  // KPI 수신 추적
  const kpiHistory = [];
  onKPIUpdate(function(data, meta) {
    kpiHistory.push({ data: Object.assign({}, data), meta: meta });
  });

  // STEP 1: G1
  g1.lock({ residence: 'APARTMENT', pyeong: 30 }, reg);
  publishAutomationUpdate(1);

  // STEP 2: G2
  g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  publishAutomationUpdate(2);

  // STEP 3: G3
  g3.lock({ sections: ['bathroom','kitchen','living'] }, reg);
  publishAutomationUpdate(3);

  // STEP 4: G4
  const r4 = g4.lock({
    spaces: [
      { id: 'b1', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'k1', area_sqm: 10, typeKey: 'KITCHEN' },
      { id: 'l1', area_sqm: 20, typeKey: 'LIVING' }
    ]
  }, reg);
  publishAutomationUpdate(4);

  // 견적 계산
  const estimate = calculateEstimate({
    lineItems: [
      { qty: 5,  wasteRate: 0.05, laborCost: 100000, pm: 1, materialCost: 200000 },
      { qty: 10, wasteRate: 0.05, laborCost: 80000,  pm: 1, materialCost: 150000 },
      { qty: 20, wasteRate: 0.05, laborCost: 60000,  pm: 1, materialCost: 100000 }
    ],
    residence: 'APARTMENT',
    concept: 'CLASSIC_LUXURY',
    occupied: false, floorLevel: 5, hasElev: true,
    areaSqm: r4.payload.totalAreaSqm
  });

  // KPI 발행
  const kpiData = publishKPIUpdate(estimate.payload, {
    sectionCount: 3,
    spaceCount: 3,
    duration: 14,
    automation: 95
  });

  // 검증
  assert(kpiHistory.length >= 5, 'KPI 5번 이상 갱신: ' + kpiHistory.length);
  assert(kpiData.supply > 0, 'supply > 0');
  assert(kpiData.final > kpiData.contract, 'final > contract');
  assert(kpiData.sectionCount === 3, 'sectionCount');
  assert(kpiData.automation === 95, 'automation 95');

  // 자동화율 진행 검증
  const autoUpdates = kpiHistory.filter(function(h) {
    return h.meta && h.meta.partial && h.data.automation !== undefined;
  });
  assert(autoUpdates.length === 4, '자동화 4회 갱신');
  assert(autoUpdates[0].data.automation === 30, 'G1 30%');
  assert(autoUpdates[1].data.automation === 70, 'G2 70%');
  assert(autoUpdates[2].data.automation === 85, 'G3 85%');
  assert(autoUpdates[3].data.automation === 95, 'G4 95%');

  console.log('  자동화율 진행: 30% → 70% → 85% → 95%');
  console.log('  공급가:        ' + kpiData.supply.toLocaleString() + '원');
  console.log('  도급:          ' + kpiData.contract.toLocaleString() + '원');
  console.log('  최종(VAT):     ' + kpiData.final.toLocaleString() + '원');
  console.log('  총 면적:       ' + kpiData.areaSqm + '㎡');
  console.log('  ㎡당:          ' + kpiData.sqmPrice.toLocaleString() + '원/㎡');
}

runFlow();
console.log('[PASS] E2E KPI Full (모두 통과)');
```

### 6-2. 검증

```bash
node modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs
# 기대: 자동화율 진행 + KPI 데이터 + [PASS]
```

---

## 작업 7: 통합 테스트 — Phase 3-E Gate Test

```bash
# Week 5 신규
node modules-html/kpi-v6/__tests__/KPIData.test.cjs
node modules-html/kpi-v6/__tests__/KPIBus.test.cjs
node modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs

# Week 1~4 회귀
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

# graph.json + 9탭
node scripts/generate-from-graph.js
node test-engine.js

# 모두 PASS면 PHASE_3E_COMPLETE 활성화
```

### 7-1. PHASE_3E_COMPLETE 활성화

`shell/src/feature-flags/flags.cjs`:
- `PHASE_3E_COMPLETE: false` → `true`
- `USE_KPI_V6:` 신설 `false` 기본값

### 7-2. flags 테스트 갱신

```javascript
// Test 1에 추가
assert(isEnabled('PHASE_3E_COMPLETE') === true, 'PHASE_3E_COMPLETE Week5 완료 true');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
```

---

## 작업 8: 커밋 (3개 분리)

```bash
# 커밋 1: KPIData + KPIBus
git add modules-html/kpi-v6/src/KPIData.cjs modules-html/kpi-v6/src/KPIBus.cjs modules-html/kpi-v6/__tests__/KPIData.test.cjs modules-html/kpi-v6/__tests__/KPIBus.test.cjs
git commit -m "feat(v5.6/kpi-v6): KPI 11항목 데이터 모델 + KPIBus (14/14 PASS)

- KPI_FIELDS 11항목 (공급/도급/최종/면적/㎡당/평당/마진/섹션/공간/공기/자동화)
- emptyKPIData / fromEstimate / format / automationFromGates / validate
- KPIBus.publishKPIUpdate — estimate → KPI 자동 변환
- KPIBus.publishAutomationUpdate — 게이트 카운트 → 자동화율
- 자동화 매핑: 0/30/70/85/95/99
- KPIData 10/10 + KPIBus 4/4 PASS"

# 커밋 2: KPI 디지털 계기판 HTML + E2E
git add modules-html/kpi-v6/index.html modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs
git commit -m "feat(v5.6/kpi-v6): KPI 디지털 계기판 HTML (다크+골드) + E2E 통합

- 11 카드 그리드 (반응형)
- final/areaSqm/automation 골드 강조 효과
- coreBus 'KPI_UPDATE' 자동 구독 + 부분/전체 갱신 지원
- demoKPI() 콘솔 함수 (샘플 데이터)
- E2E: G1~G4 → estimate-v6 → KPIBus → 자동화율 30→70→85→95"

# 커밋 3: PHASE_3E_COMPLETE 활성화
git add shell/src/feature-flags/
git commit -m "feat(v5.6/phase-3e): Phase 3 Week 5 완료 — PHASE_3E_COMPLETE = true (모든 회귀 PASS)

- USE_KPI_V6 플래그 신설 (기본 false, Week 8 첫 시공 검증 후 활성화)
- 토폴로지 화면(modules-html/topology/) 검증 PASS"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 5 완료 (Phase 3-E KPI 분리 + 토폴로지 활성화)

[신규 모듈]
- modules-html/kpi-v6/src/KPIData.cjs    — 11항목 데이터 모델
- modules-html/kpi-v6/src/KPIBus.cjs     — estimate → kpi 자동 갱신
- modules-html/kpi-v6/index.html         — 디지털 계기판 (다크+골드)

[기존 활용]
- modules-html/topology/index.html       — 시스템 토폴로지 (Week 1 생성)
  → graph.json 12노드 + 24엣지 시각화 검증 PASS

[테스트 결과]
- KPIData:           10/10 PASS
- KPIBus:             4/4 PASS
- E2E KPI Full:      PASS (자동화 30→70→85→95)
- Week 1~4 회귀:    PASS
- test-engine:       5/5 PASS

[KPI 11항목]
공급가/도급/최종(VAT)/총면적/㎡당/평당/마진율/시공섹션/공간/공기/자동화율

[다음 주]
Phase 3 Week 6: 메타 호환 (URI/JSON-LD/RDF/Universe ID)
- docs/schemas/ 분리
- DB triples 테이블 신설
- graph.json → JSON-LD export
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- USE_KPI_V6 = true (Week 8 첫 시공 검증 후 활성화)

---

**문서 끝.**
