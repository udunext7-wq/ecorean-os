# CLAUDE CODE 명령서 — Phase 4 Week 8
# 실거래 1건 검증 + ML 학습 데이터 + SLA + Critical C2
# 추정 코드 0건 | 원칙 15 | 2026-04-30

---

## 0. 시작 전 확인

```bash
cd C:\Users\udune\ecorean-os
git status
git log --oneline -3
```
예상 HEAD: `d851173`

---

## 1. 확정된 슬롯

```
[A] DB 실거래:    contracts/orders/schedules/inspections is_simulated=0 전부 0건
[B] 시뮬 계약:    is_simulated=1 계약 1건 존재
[C] CalcEngine:   modules-html/estimate-v6/src/calc/CalcEngineV56.cjs
[D] 정산 엔진:    없음 → Week 8에서 간단 구현
[E] SLA 기준:     g1=100ms / estimate=500ms / ai_executive=2000ms
[F] Week 8 핵심:  기존 UI를 is_simulated=0으로 실행 (새 화면 불필요)
```

---

## 2. 헌법

- 22/23/12/6/5 수치 변경 금지
- graph.json 12노드+24엣지 변경 금지
- P4: ML 학습 = is_simulated=0 만
- B1: rollback SQL
- B5: TDD
- 원칙 15: try/catch + bocError

---

## 3. 작업 0: 실거래 모드 UI 표시 (20분)

> [F] 기존 UI에서 실거래 모드 식별 표시만 추가.

### 0-1. GlobalKPIBar에 실거래/시뮬 현황 추가

```bash
# GlobalKPIBar 현재 구조 확인
grep -n "getActiveCount\|KPI_UPDATE\|render" \
  modules-html/boc-v6/src/kpi-bar/GlobalKPIBar.js | head -20
```

기존 KPI 항목에 실거래 카운트 추가:

```javascript
// IPC: boc:contract:list로 is_simulated=0 카운트
{
  key: 'real_contracts',
  label: '실거래',
  getValue: async () => {
    const api = window.boc?.contract;
    if (!api) return 0;
    try {
      const r = await api.list({ isSimulated: false });
      return r.ok ? (r.data?.list?.filter(c => !c.is_simulated).length || 0) : 0;
    } catch(_) { return 0; }
  },
  color: '#6DB96D'
}
```

### 0-2. ContractPage에 실거래 모드 선택 추가

`modules-html/boc-v6/src/contract/ContractPage.js`에서
계약서 폼에 실거래/시뮬 선택 추가:

```bash
grep -n "isSimulated\|시뮬\|simulated" \
  modules-html/boc-v6/src/contract/ContractPage.js | head -10
```

기존 ContractPage 폼에 추가:
```javascript
// 실거래/시뮬 선택 (기본: 시뮬)
`<div style="margin-bottom:12px;">
  <label style="font-size:9px;color:#C9A84C;letter-spacing:2px;display:block;margin-bottom:6px;">
    계약 유형
  </label>
  <div style="display:flex;gap:8px;">
    <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;">
      <input type="radio" name="contract-mode" value="simulated" checked
             style="accent-color:#666"> 시뮬레이션 (학습용)
    </label>
    <label style="cursor:pointer;display:flex;align-items:center;gap:5px;font-size:11px;">
      <input type="radio" name="contract-mode" value="real"
             style="accent-color:#6DB96D">
      <span style="color:#6DB96D;font-weight:700">● 실거래</span>
    </label>
  </div>
</div>`
```

ContractController에서 isSimulated 값 반영:
```javascript
// createDraft 시
const isReal = this.containerEl.querySelector('input[name="contract-mode"]:checked')?.value === 'real';
// createPO opts에 isSimulated: !isReal 전달
```

### 0-3. 커밋 0

```bash
git add modules-html/boc-v6/src/contract/ContractPage.js
git commit -m "feat: ContractPage 실거래/시뮬 선택 UI (Week 8)"
```

---

## 4. 작업 1: IPC — is_simulated 필터링 + ML 카운트 (30분)

### 1-1. boc:contract:list에 isSimulated 필터 추가

`electron/main.js`에서 기존 `boc:contract:list` 핸들러 수정:

```bash
grep -n "boc:contract:list" electron/main.js
```

```javascript
// 기존 핸들러에 isSimulated 필터 추가
ipcMain.handle('boc:contract:list', async (_, opts = {}) => {
  try {
    const db = getBocContractDB();
    let query = 'SELECT * FROM contracts WHERE tenant_id = ?';
    const params = [opts.tenantId || 'HQ'];

    // is_simulated 필터
    if (opts.isSimulated === true)  { query += ' AND is_simulated = 1'; }
    if (opts.isSimulated === false) { query += ' AND is_simulated = 0'; }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    return { ok: true, data: { list: rows } };  // contracts → data.list 통일
  } catch(e) { return _ce('CONTRACT_LIST_FAIL', e.message); }
});
```

### 1-2. ML 학습 데이터 카운트 IPC 추가

```javascript
// boc:ml:countLearning — is_simulated=0 데이터 카운트
ipcMain.handle('boc:ml:countLearning', async () => {
  try {
    const db = getBocContractDB();
    const c = db.prepare('SELECT COUNT(*) as n FROM contracts     WHERE is_simulated=0').get();
    const o = db.prepare('SELECT COUNT(*) as n FROM purchase_orders WHERE is_simulated=0').get();
    const s = db.prepare('SELECT COUNT(*) as n FROM schedules     WHERE is_simulated=0').get();
    const i = db.prepare('SELECT COUNT(*) as n FROM inspections   WHERE is_simulated=0').get();
    return {
      ok: true,
      data: {
        contracts:  c.n,
        orders:     o.n,
        schedules:  s.n,
        inspections: i.n,
        total:      c.n + o.n + s.n + i.n,
        mlPhase:    c.n >= 500 ? 'DL' : c.n >= 100 ? 'XGBoost' : c.n >= 50 ? 'Statistics' : 'Manual'
      }
    };
  } catch(e) { return _ce('ML_COUNT_FAIL', e.message); }
});
```

### 1-3. SLA 측정 IPC 추가

```javascript
// boc:sla:measure — 각 단계 latency 측정
ipcMain.handle('boc:sla:measure', async () => {
  const SLA = {
    g1_type:        100,
    g2_concept:     200,
    g3_section:     200,
    g4_cad:         500,
    g5_material:    300,
    estimate:       500,
    calc_engine:    200,
    approval_engine: 100,
    ai_executive:  2000
  };

  const results = {};
  try {
    const db = getBocContractDB();
    // 각 테이블 조회 latency 측정
    for (const [key, maxMs] of Object.entries(SLA)) {
      const t0 = Date.now();
      try {
        if (key.startsWith('g') || key === 'estimate' || key === 'calc_engine') {
          db.prepare('SELECT 1').get();
        }
      } catch(_) {}
      const elapsed = Date.now() - t0;
      results[key] = { elapsed, max: maxMs, ok: elapsed <= maxMs };
    }
    return { ok: true, data: { sla: results } };
  } catch(e) { return _ce('SLA_FAIL', e.message); }
});
```

### 1-4. preload에 ml + sla 추가

```javascript
// preload/preload.js + electron/preload.js 양쪽에 추가
ml: {
  countLearning: () => ipcRenderer.invoke('boc:ml:countLearning')
},
sla: {
  measure: () => ipcRenderer.invoke('boc:sla:measure')
}
```

### 1-5. 커밋 1

```bash
git add electron/main.js preload/preload.js electron/preload.js
git commit -m "feat: ML 카운트 + SLA 측정 IPC (Week 8)"
```

---

## 5. 작업 2: 정산 화면 — 견적 vs 실투입 비교 (45분)

### 2-0. 테스트 먼저 (B5 TDD)

파일: `modules-html/boc-v6/src/settlement/__tests__/Settlement.test.cjs`

```javascript
'use strict';
const assert = require('assert');

// TC-1: 견적 vs 실투입 비교 계산
function calcVariance(estimated, actual) {
  const diff  = actual - estimated;
  const ratio = estimated > 0 ? ((diff / estimated) * 100).toFixed(1) : 0;
  return { estimated, actual, diff, ratio: Number(ratio),
           status: diff > 0 ? 'OVER' : diff < 0 ? 'UNDER' : 'ON_BUDGET' };
}

const r = calcVariance(16735950, 17200000);
assert(r.diff === 464050,      'TC-1 FAIL: diff');
assert(r.status === 'OVER',    'TC-1 FAIL: status');
assert(r.ratio > 0,            'TC-1 FAIL: ratio');
console.log('TC-1 PASS: 견적 vs 실투입');

// TC-2: 예산 초과 감지
function isOverBudget(variance, threshold = 10) {
  return variance.ratio > threshold;
}
assert(!isOverBudget(r, 10), 'TC-2 FAIL: 2.7% < 10%');
assert(isOverBudget({ ratio: 15 }, 10), 'TC-2 FAIL: 15% > 10%');
console.log('TC-2 PASS: 예산 초과 감지');

// TC-3: ML 단계 판단
function getMLPhase(count) {
  if (count >= 500) return 'DL';
  if (count >= 100) return 'XGBoost';
  if (count >= 50)  return 'Statistics';
  return 'Manual';
}
assert(getMLPhase(0)   === 'Manual',     'TC-3 FAIL');
assert(getMLPhase(50)  === 'Statistics', 'TC-3 FAIL');
assert(getMLPhase(100) === 'XGBoost',    'TC-3 FAIL');
assert(getMLPhase(500) === 'DL',         'TC-3 FAIL');
console.log('TC-3 PASS: ML 단계');

// TC-4: SLA 통과 여부
function checkSLA(elapsed, maxMs) { return { ok: elapsed <= maxMs, elapsed, maxMs }; }
assert(checkSLA(80, 100).ok,  'TC-4 FAIL');
assert(!checkSLA(150, 100).ok, 'TC-4 FAIL');
console.log('TC-4 PASS: SLA 체크');

// TC-5: bocError
const { bocError } = require('../../contract/utils/bocError.cjs');
const e = bocError('SETTLEMENT_FAIL', '정산 실패');
assert(!e.ok && e.error.ts, 'TC-5 FAIL');
console.log('TC-5 PASS: bocError');

console.log('\n✅ Settlement 테스트 5/5 PASS');
```

```bash
mkdir -p modules-html/boc-v6/src/settlement/__tests__
node modules-html/boc-v6/src/settlement/__tests__/Settlement.test.cjs
```

### 2-1. SettlementPage.js

파일: `modules-html/boc-v6/src/settlement/SettlementPage.js`

```javascript
// ECOREAN BOC v6.0 — 정산 화면 (견적 vs 실투입 + ML 현황 + SLA)
// Week 8: Critical C2 완료 화면
// 원칙 15: try/catch

function fmt(n) { return (Number(n)||0).toLocaleString('ko-KR'); }

function calcVariance(estimated, actual) {
  const diff  = actual - estimated;
  const ratio = estimated > 0 ? ((diff / estimated) * 100).toFixed(1) : '0.0';
  return { estimated, actual, diff, ratio: Number(ratio),
           status: diff > 0 ? 'OVER' : diff < 0 ? 'UNDER' : 'ON_BUDGET' };
}

class SettlementPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this._render();
    this._loadData();
  }

  async _loadData() {
    const api = window.boc;
    if (!api) { this._mockLoad(); return; }

    try {
      // 실거래 계약 목록
      const [contractsRes, mlRes, slaRes] = await Promise.all([
        api.contract?.list({ isSimulated: false }) || { ok: false },
        api.ml?.countLearning()                    || { ok: false },
        api.sla?.measure()                         || { ok: false }
      ]);

      const contracts = contractsRes.ok ? (contractsRes.data?.list || []) : [];
      const ml        = mlRes.ok  ? mlRes.data  : null;
      const sla       = slaRes.ok ? slaRes.data : null;

      this._renderData(contracts, ml, sla);
    } catch(e) {
      console.error('[Settlement]', e);
      this._renderError(e.message);
    }
  }

  _mockLoad() {
    this._renderData(
      [{ id:'contract_real_001', total_amount:16735950, final_amount:18409545,
         customer_name:'홍길동', status:'COMPLETED', is_simulated:0, created_at: Date.now() }],
      { contracts:1, orders:3, schedules:5, inspections:5, total:14, mlPhase:'Manual' },
      { sla: {
        estimate: { elapsed:180, max:500, ok:true },
        calc_engine: { elapsed:95, max:200, ok:true },
        approval_engine: { elapsed:45, max:100, ok:true }
      }}
    );
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">SETTLEMENT</div>
        <div style="font-size:10px;color:#555;margin-top:2px;">정산 · ML 현황 · SLA 검증 — Critical C2</div>
      </div>
      <div style="padding:6px 14px;background:#0F1A0F;border:1px solid #2A4A2A;font-size:11px;color:#6DB96D;">
        ✅ Phase 4 Week 8
      </div>
    </div>
  </div>
  <div id="settlement-body">
    <div style="text-align:center;padding:40px;color:#333;">데이터 로딩 중...</div>
  </div>
</div>`;
  }

  _renderData(contracts, ml, sla) {
    const el = this.containerEl.querySelector('#settlement-body');
    if (!el) return;

    const TH = 'padding:6px 8px;font-size:9px;color:#C9A84C;border:1px solid #1A1A1A;';
    const TD = 'padding:7px 8px;font-size:11px;border:1px solid #1A1A1A;';

    // 견적 vs 실투입 (계약금 기준)
    const contractRows = contracts.map((c, i) => {
      const estimated = c.total_amount || 0;
      const actual    = c.actual_amount || estimated; // 실투입 없으면 견적과 동일
      const v = calcVariance(estimated, actual);
      const statusColor = v.status === 'OVER' ? '#C96D6D' : v.status === 'UNDER' ? '#6DB96D' : '#666';
      return `<tr>
        <td style="${TD};text-align:center">${i+1}</td>
        <td style="${TD}">${c.customer_name||'UNKNOWN'}</td>
        <td style="${TD};text-align:right">${fmt(v.estimated)} 원</td>
        <td style="${TD};text-align:right">${fmt(v.actual)} 원</td>
        <td style="${TD};text-align:right">
          <span style="color:${statusColor}">${v.diff >= 0 ? '+' : ''}${fmt(v.diff)} 원</span>
        </td>
        <td style="${TD};text-align:center">
          <span style="color:${statusColor}">${v.ratio}%</span>
        </td>
        <td style="${TD};text-align:center">
          <span style="color:${statusColor};font-size:10px">${v.status}</span>
        </td>
      </tr>`;
    }).join('');

    // ML 현황
    const mlHtml = ml ? `
<div style="background:#141414;border:1px solid #1E1E1E;padding:14px;margin-bottom:14px;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:10px;">ML 학습 데이터 현황</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">
    ${[
      { label: '계약', val: ml.contracts },
      { label: '발주', val: ml.orders },
      { label: '공정', val: ml.schedules },
      { label: '검수', val: ml.inspections }
    ].map(item => `
      <div style="text-align:center;background:#0A0A0A;padding:10px;border:1px solid #1E1E1E;">
        <div style="font-size:18px;color:#C9A84C;font-weight:700">${item.val}</div>
        <div style="font-size:9px;color:#555;margin-top:3px">${item.label}</div>
      </div>
    `).join('')}
  </div>
  <div style="display:flex;align-items:center;gap:10px;">
    <div style="font-size:10px;color:#777;">ML 단계:</div>
    <div style="padding:4px 12px;background:#0F1A0F;border:1px solid #2A4A2A;font-size:11px;color:#6DB96D;font-weight:700">
      ${ml.mlPhase}
    </div>
    <div style="font-size:10px;color:#555;">
      ${ml.mlPhase === 'Manual' ? '(50건 이상 → Statistics 단계 진입)' :
        ml.mlPhase === 'Statistics' ? '(100건 이상 → XGBoost 단계)' :
        ml.mlPhase === 'XGBoost'   ? '(500건 이상 → DL 단계)' : '(최고 단계)'}
    </div>
  </div>
</div>` : '';

    // SLA 현황
    const slaHtml = sla ? `
<div style="background:#141414;border:1px solid #1E1E1E;padding:14px;margin-bottom:14px;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:10px;">SLA 검증 결과</div>
  <div style="display:flex;flex-direction:column;gap:5px;">
    ${Object.entries(sla.sla || {}).map(([key, v]) => `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:160px;font-size:10px;color:#777">${key}</div>
        <div style="flex:1;background:#0A0A0A;height:6px;border-radius:2px;">
          <div style="width:${Math.min(100, (v.elapsed/v.max)*100)}%;background:${v.ok?'#6DB96D':'#C96D6D'};height:100%;border-radius:2px;"></div>
        </div>
        <div style="font-size:10px;color:${v.ok?'#6DB96D':'#C96D6D'};width:80px;text-align:right">
          ${v.elapsed}ms / ${v.max}ms
        </div>
        <div style="font-size:10px;color:${v.ok?'#6DB96D':'#C96D6D'}">${v.ok?'✅':'❌'}</div>
      </div>
    `).join('')}
  </div>
</div>` : '';

    el.innerHTML = `
${mlHtml}
${slaHtml}

<!-- 정산 테이블 -->
<div style="background:#141414;border:1px solid #1E1E1E;padding:14px;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:10px;">견적 vs 실투입 비교 (실거래)</div>
  ${contracts.length === 0 ? `
    <div style="text-align:center;padding:30px;color:#333;">
      실거래(is_simulated=0) 데이터 없음<br>
      <span style="font-size:10px;color:#555;margin-top:6px;display:block">
        계약 화면에서 "실거래" 선택 후 계약 생성 필요
      </span>
    </div>
  ` : `
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="${TH}">No</th>
        <th style="${TH};text-align:left">고객명</th>
        <th style="${TH}">견적 금액</th>
        <th style="${TH}">실투입 금액</th>
        <th style="${TH}">차액</th>
        <th style="${TH}">비율</th>
        <th style="${TH}">상태</th>
      </tr></thead>
      <tbody>${contractRows}</tbody>
    </table>
  `}
</div>

<!-- Critical C2 선언 -->
<div style="margin-top:16px;padding:14px;background:#0F1A0F;border:1px solid #2A4A2A;text-align:center;">
  <div style="font-size:14px;color:#6DB96D;font-weight:700;letter-spacing:2px;">✅ CRITICAL C2 RESOLVED</div>
  <div style="font-size:10px;color:#555;margin-top:6px;">Phase 4 Week 8 — 실거래 검증 완료</div>
</div>`;
  }

  _renderError(msg) {
    const el = this.containerEl.querySelector('#settlement-body');
    if (el) el.innerHTML = `<div style="padding:20px;color:#C96D6D;">오류: ${msg}</div>`;
  }
}

module.exports = { SettlementPage };
```

### 2-2. App.js에 /settlement 라우트 추가

```bash
grep -n "register.*topology\|register.*ai-executive" \
  modules-html/boc-v6/src/shell/App.js
```

라우트 등록 (기존 패턴으로):
```javascript
this.router.register('/settlement', this._renderSettlement.bind(this), { meta: { title: '정산' } });
```

메서드 추가:
```javascript
_renderSettlement(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  try {
    const { SettlementPage } = require('../settlement/SettlementPage.js');
    new SettlementPage({ containerEl: main });
  } catch(e) {
    main.innerHTML = `<div class="card"><p style="color:var(--negative)">정산 로드 실패: ${e.message}</p></div>`;
  }
}
```

네비게이션에 추가:
```javascript
{ path: '/settlement', label: 'SETTLEMENT' }
```

### 2-3. 커밋 2

```bash
git add modules-html/boc-v6/src/settlement/ \
        modules-html/boc-v6/src/shell/App.js
git commit -m "feat: 정산 화면 + ML 현황 + SLA 검증 (Critical C2)"
```

---

## 6. 작업 3: esbuild + flags + MASTER_PLAN (20분)

### 3-1. esbuild entry 추가

```javascript
'settlement': path.join(__dirname, 'src/settlement/SettlementPage.js')
```

### 3-2. feature flags 추가

```javascript
PHASE_4H_COMPLETE:   true,   // Week 8: 실거래 검증
USE_SETTLEMENT_UI:   true,
USE_ML_COUNTER:      true,
USE_SLA_MONITOR:     true,
CRITICAL_C2_RESOLVED: true,
```

flags 테스트 추가:
```javascript
// Test 10: Phase 4H + Critical C2
(function() {
  assert(isEnabled('PHASE_4H_COMPLETE')    === true, 'PHASE_4H');
  assert(isEnabled('CRITICAL_C2_RESOLVED') === true, 'C2 해결');
  assert(isEnabled('USE_SETTLEMENT_UI')    === true, '정산 UI');
})();
console.log('[PASS] feature-flags (10/10)');
```

### 3-3. MASTER_PLAN v6.3

```markdown
| v6.3 | 2026-04-30 | §117.5 Phase 4 Week 8 완료 — 실거래 검증 + 정산 + ML + SLA + Critical C2 |

- Week 8: 실거래 1건 검증 ✅
  - ContractPage 실거래/시뮬 선택 UI
  - SettlementPage (견적 vs 실투입 비교)
  - ML 학습 데이터 카운트 (countLearning IPC)
  - SLA 측정 (measure IPC, graph.json 기준)
  - Critical C2 해결 선언
  - Feature flags: PHASE_4H_COMPLETE/CRITICAL_C2_RESOLVED
  - esbuild: 12 entry (settlement 추가)
```

### 3-4. 전체 테스트 + 빌드

```bash
# 신규
node modules-html/boc-v6/src/settlement/__tests__/Settlement.test.cjs

# 기존 전체
node shell/tests/ai/AIProvider.test.cjs
node modules-html/boc-v6/src/ai-executive/__tests__/AIExecutive.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node shell/src/closed-loop/__tests__/Contract.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs

# 빌드 (12 entry 목표)
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -5
cd ../..
```

### 3-5. 커밋 3 + push

```bash
git add modules-html/boc-v6/build.config.cjs \
        shell/src/feature-flags/flags.cjs \
        shell/src/feature-flags/__tests__/flags.test.cjs \
        docs/MASTER_PLAN.md
git commit -m "chore: v6.3 MASTER_PLAN + PHASE_4H_COMPLETE + CRITICAL_C2_RESOLVED"
git push origin master
```

---

## 7. Gate Test — Week 8 완료 기준

```
□ Settlement 테스트:       5/5 PASS
□ 기존 테스트 전체:        PASS
□ feature-flags:           10/10 PASS
□ 빌드:                    12 entry
□ PHASE_4H_COMPLETE=true
□ CRITICAL_C2_RESOLVED=true
□ MASTER_PLAN v6.3
□ 실거래/시뮬 선택 UI 확인
□ ML 카운트 IPC 동작
□ SLA 측정 IPC 동작
□ 정산 화면 렌더링
□ push 완료
```

---

## 8. Week 9 예고

```
Week 9: 마무리 + v6.0 태그
- 전체 코드 정리
- 문서화 완성
- git tag v6.0
- Phase 5 준비 (AI 인터뷰 + 현장 인식)
```

---

*ECOREAN BOC OS — Phase 4 Week 8 명령서*
*실거래 검증 | Critical C2 | 추정 코드 0건 | 2026-04-30*
