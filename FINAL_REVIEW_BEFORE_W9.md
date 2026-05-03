# CLAUDE CODE — Week 9 진입 전 최종 재검토 수정
# 4개 문제 확인 + 수정 + 전체 테스트 + push
# 2026-04-30

---

## 규칙: 확인 → 문제 있으면 즉시 수정 → 테스트 → 보고

---

## 문제 1 (🔴): SettlementPage once:true 버그 수정

### 1-1. 확인

```bash
grep -n "once\|addEventListener" \
  modules-html/boc-v6/src/settlement/SettlementPage.js
```

### 1-2. 수정

`_bindActualInput`에서 `{ once: true }` 제거 + 기존 리스너 정리:

```javascript
// 기존 (버그):
this.containerEl.addEventListener('click', async (e) => { ... }, { once: true });

// 수정:
if (this._actualInputHandler) {
  this.containerEl.removeEventListener('click', this._actualInputHandler);
}
this._actualInputHandler = async (e) => {
  if (e.target.dataset.action !== 'input-actual') return;
  const contractId = e.target.dataset.contractId;
  const input = prompt('실투입 금액 입력 (원):');
  if (!input) return;
  const amount = parseInt(input.replace(/,/g, ''), 10);
  if (isNaN(amount) || amount <= 0) { alert('올바른 금액을 입력해주세요.'); return; }
  try {
    const api = window.boc?.contract;
    if (api?.updateActual) {
      await api.updateActual({ id: contractId, actualAmount: amount });
    }
    this._loadData();
  } catch(err) { console.error('[Settlement:actualInput]', err); }
};
this.containerEl.addEventListener('click', this._actualInputHandler);
```

---

## 문제 2 (🔴): customer_name_enc 암호화값 노출 수정

### 2-1. 확인

```bash
grep -n "customer_name\|customer_name_enc" \
  modules-html/boc-v6/src/settlement/SettlementPage.js
```

### 2-2. 수정

암호화된 값 노출 제거:

```javascript
// 기존 (버그):
c.customer_name || c.customer_name_enc || 'UNKNOWN'

// 수정 (암호화값은 표시 안 함):
c.customer_name || '(암호화됨)'
```

> P6 원칙: 복호화 키 없이 customer_name_enc를 표시하는 것은 의미 없고 혼란을 줌.
> Phase 5 AES 복호화 구현 전까지 '(암호화됨)' 표시.

---

## 문제 3 (🟡): Week 8 구현 범위 전수 확인

### 3-1. ContractPage 실거래/시뮬 선택 UI 존재 여부

```bash
grep -n "radio\|실거래\|simulated\|contract-mode" \
  modules-html/boc-v6/src/contract/ContractPage.js | head -10
```

없으면 → ContractPage.js에 추가:

기존 고객정보 폼 다음에 삽입:
```javascript
// 실거래/시뮬 선택
`<div style="margin-bottom:12px;padding:10px 12px;background:#0F0F0F;border:1px solid #1E1E1E;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:8px;">계약 유형</div>
  <div style="display:flex;gap:16px;">
    <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11px;">
      <input type="radio" name="contract-mode" value="simulated" checked
             style="accent-color:#666">
      <span style="color:#777">시뮬레이션 (학습용)</span>
    </label>
    <label style="cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11px;">
      <input type="radio" name="contract-mode" value="real"
             style="accent-color:#6DB96D">
      <span style="color:#6DB96D;font-weight:700">● 실거래</span>
    </label>
  </div>
</div>`
```

createDraft()에서 isSimulated 값 읽기:
```javascript
const modeEl = this.containerEl.querySelector('input[name="contract-mode"]:checked');
const isSimulated = !modeEl || modeEl.value !== 'real';
// ContractController.createDraft({ ..., isSimulated })
```

### 3-2. boc:contract:list isSimulated 필터 확인

```bash
grep -n "isSimulated\|is_simulated" electron/main.js | grep -i "list\|filter" | head -5
```

필터 없으면 → main.js 핸들러 수정:
```javascript
ipcMain.handle('boc:contract:list', async (_, opts = {}) => {
  try {
    const db = getBocContractDB();
    let query = 'SELECT * FROM contracts WHERE tenant_id=?';
    const params = [opts.tenantId || 'HQ'];
    if (opts.isSimulated === true)  { query += ' AND is_simulated=1'; }
    if (opts.isSimulated === false) { query += ' AND is_simulated=0'; }
    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    return { ok: true, data: { list: rows } };
  } catch(e) { return _ce('CONTRACT_LIST_FAIL', e.message); }
});
```

### 3-3. feature flags PHASE_4H_COMPLETE 확인

```bash
grep -n "PHASE_4H\|CRITICAL_C2\|USE_SETTLEMENT" \
  shell/src/feature-flags/flags.cjs
```

없으면 → flags.cjs에 추가:
```javascript
PHASE_4H_COMPLETE:    true,   // Week 8: 실거래 검증
USE_SETTLEMENT_UI:    true,
USE_ML_COUNTER:       true,
USE_SLA_MONITOR:      true,
CRITICAL_C2_RESOLVED: true,
```

flags 테스트 Test 10 추가:
```javascript
(function() {
  assert(isEnabled('PHASE_4H_COMPLETE')    === true, 'PHASE_4H');
  assert(isEnabled('CRITICAL_C2_RESOLVED') === true, 'C2 해결');
  assert(isEnabled('USE_SETTLEMENT_UI')    === true, '정산 UI');
})();
console.log('[PASS] feature-flags (10/10)');
```

### 3-4. MASTER_PLAN v6.3 기록 확인

```bash
grep -n "v6\.3\|Week 8.*✅\|PHASE_4H\|Critical C2" \
  docs/MASTER_PLAN.md | tail -10
```

없으면 → docs/MASTER_PLAN.md에 추가:
```markdown
| **v6.3** | **2026-04-30** | **§117.5 Phase 4 Week 8 완료 — 실거래 검증 + 정산 + ML + SLA + Critical C2** |

- Week 8: 실거래 1건 검증 ✅
  - ContractPage 실거래/시뮬 선택 UI
  - SettlementPage (견적 vs 실투입 + ML 현황 + SLA)
  - actual_amount 컬럼 마이그레이션 007
  - boc:contract:updateActual IPC
  - boc:ml:countLearning + boc:sla:measure IPC
  - Feature flags: PHASE_4H_COMPLETE/CRITICAL_C2_RESOLVED
  - esbuild: 12 entry
```

---

## 문제 4 (🟡): SLA 측정 개선

### 4-1. 현재 코드 확인

```bash
grep -n "SELECT 1\|sla\|measure\|elapsed" \
  electron/main.js | grep -i "sla\|measure\|SELECT" | head -10
```

### 4-2. 수정 — 실제 업무 latency 측정으로 개선

```javascript
ipcMain.handle('boc:sla:measure', async () => {
  const SLA_MAX = {
    db_read:         100,   // DB 단순 읽기
    contract_list:   200,   // 계약 목록 조회
    schedule_list:   200,   // 공정 목록 조회
    inspection_list: 200,   // 검수 목록 조회
    order_list:      200,   // 발주 목록 조회
    cost_items:      500,   // cost_items 전체 로드
  };

  const results = {};
  try {
    const db = getBocContractDB();

    for (const [key, maxMs] of Object.entries(SLA_MAX)) {
      const t0 = Date.now();
      try {
        switch(key) {
          case 'db_read':         db.prepare('SELECT 1').get(); break;
          case 'contract_list':   db.prepare('SELECT * FROM contracts LIMIT 100').all(); break;
          case 'schedule_list':   db.prepare('SELECT * FROM schedules LIMIT 100').all(); break;
          case 'inspection_list': db.prepare('SELECT * FROM inspections LIMIT 100').all(); break;
          case 'order_list':      db.prepare('SELECT * FROM purchase_orders LIMIT 100').all(); break;
          case 'cost_items':      db.prepare('SELECT * FROM cost_items LIMIT 500').all(); break;
        }
      } catch(_) {}
      const elapsed = Date.now() - t0;
      results[key] = { elapsed, max: maxMs, ok: elapsed <= maxMs };
    }
    return { ok: true, data: { sla: results } };
  } catch(e) { return _ce('SLA_FAIL', e.message); }
});
```

---

## 전체 테스트 + 빌드 + push

```bash
# Settlement 테스트
node modules-html/boc-v6/src/settlement/__tests__/Settlement.test.cjs

# feature-flags
node shell/src/feature-flags/__tests__/flags.test.cjs

# Closed Loop 회귀
node shell/src/closed-loop/__tests__/Contract.test.cjs
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs

# AI + Week 5~8
node shell/tests/ai/AIProvider.test.cjs
node modules-html/boc-v6/src/ai-executive/__tests__/AIExecutive.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs

# 빌드
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -5 && cd ../..

# 커밋 + push
git add -A
git status --short
git commit -m "fix: 최종 재검토 수정 — once:true버그 + 암호화값노출 + SLA개선 + Week8 플래그"
git push origin master
git log --oneline origin/master..HEAD
```

---

## 보고 형식

```
## 최종 재검토 수정 결과

### 문제 1: once:true 버그
- 수정: [완료]

### 문제 2: customer_name_enc 노출
- 수정: [완료]

### 문제 3: Week 8 구현 범위
- ContractPage 실거래 UI: [있었음/추가]
- isSimulated 필터: [있었음/추가]
- PHASE_4H_COMPLETE: [있었음/추가]
- MASTER_PLAN v6.3: [있었음/추가]

### 문제 4: SLA 측정
- 수정: [완료]

### 테스트
- 전체: [N/N PASS]

### 빌드
- entry 수: [N개]

### push
- [완료]

### 최종 판정
- [✅ Week 9 진입 가능 / ❌ 남은 문제]
```
