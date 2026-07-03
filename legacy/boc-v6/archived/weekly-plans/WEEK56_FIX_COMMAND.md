# CLAUDE CODE — Week 5~6 발견 문제 즉시 수정
# 4개 문제 확인 → 수정 → 테스트 → push
# 2026-04-30

---

## 규칙: 확인 → 문제 있으면 즉시 수정 → 테스트 → 보고 순서

---

## 문제 1 (🔴 치명): preload 연결 확인 + 수정

### 1-1. 현재 상태 확인

```bash
# boc-v6 BrowserWindow 생성 코드 확인
grep -n "boc-v6\|preload/preload\|preload\\\\preload\|PRELOAD" electron/main.js | head -20

# 현재 PRELOAD 상수값
grep -n "const PRELOAD\|PRELOAD =" electron/main.js

# boc-v6 index.html 로드 위치
grep -n "boc-v6\|boc_v6\|index\.html" electron/main.js | head -10
```

### 1-2. 판단 기준

**Case A: boc-v6 BrowserWindow가 별도로 없음**
→ boc-v6가 Electron에 아직 연결 안 된 상태
→ 1-3 실행

**Case B: boc-v6 BrowserWindow가 있고 preload/preload.js 로드 중**
→ 정상
→ 문제 2로 이동

**Case C: boc-v6 BrowserWindow가 있고 electron/preload.js 로드 중**
→ window.boc.* 미노출
→ 1-3 실행

### 1-3. 수정 — electron/main.js에 boc-v6 BrowserWindow 추가

> boc-v6가 어떻게 실행되는지 먼저 확인

```bash
# npm start 스크립트 확인
cat package.json | grep -A5 '"scripts"'

# boc-v6 실행 방식 확인
cat modules-html/boc-v6/package.json 2>nul | grep -A5 '"scripts"' || echo "없음"
```

**boc-v6가 독립 실행(개발 서버) 방식이면:**
- Electron IPC 연결 없이 브라우저에서 개발 중
- 모든 `window.boc.*` 호출은 mock fallback으로 정상 동작
- 실제 Electron 연결은 Phase 4 후반(Week 8~9)에서 처리
- → 이 경우 문제 없음. 문제 2로 이동.

**boc-v6가 Electron BrowserWindow로 실행 중이면:**
- preload/preload.js 연결 여부 확인 후 수정

```bash
# boc-v6 실제 실행 방식 최종 확인
grep -rn "boc-v6\|bocV6\|boc_v6" electron/main.js modules-html/boc-v6/package.json 2>nul
```

수정이 필요한 경우 electron/main.js createWindow() 또는 별도 함수에 추가:

```javascript
// boc-v6 전용 BrowserWindow (preload/preload.js 사용)
function createBocV6Window() {
  const BOC_PRELOAD = path.join(__dirname, '../preload/preload.js');
  const BOC_SHELL   = path.join(__dirname, '../modules-html/boc-v6/index.html');

  const win = new BrowserWindow({
    width: 1440, height: 900,
    webPreferences: {
      preload: BOC_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(BOC_SHELL);
  return win;
}
```

> ⚠️ 실제 main.js 구조(whenReady, createWindow 등) 읽은 후 기존 패턴과 동일하게 삽입

---

## 문제 2 (🔴 치명): sections 전달 체인 확인 + 수정

### 2-1. 체인 전체 코드 확인

```bash
# [A] WizardPage → ContractPage 생성 시 input 전달 여부
grep -n "ContractPage\|input\|getState" modules-html/boc-v6/src/wizard/WizardPage.js

# [B] ContractPage constructor에서 this.input 저장
grep -n "this\.input\|opts\.input" modules-html/boc-v6/src/contract/ContractPage.js | head -10

# [C] dispatchEvent에 input 포함 여부
grep -n "dispatchEvent\|boc:contract:created\|detail" modules-html/boc-v6/src/contract/ContractPage.js

# [D] App.js에서 currentInput 저장
grep -n "currentInput\|detail\.input" modules-html/boc-v6/src/shell/App.js

# [E] SchedulesPage 생성 시 sections 전달
grep -n "sections\|currentInput" modules-html/boc-v6/src/shell/App.js
```

### 2-2. 각 단계 판단 + 수정

**[A] WizardPage에서 input 전달 안 되면:**

```bash
# 현재 ContractPage 생성 코드 확인
grep -n -A10 "ContractPage" modules-html/boc-v6/src/wizard/WizardPage.js
```

수정 — WizardPage.js에서 ContractPage 생성 시 input 추가:
```javascript
this.currentPage = new ContractPage({
  containerEl: stageEl,
  estimate: est,
  input: this.controller.getState().input  // ← input 추가
});
```

**[B] ContractPage에서 this.input 없으면:**

ContractPage constructor에 추가:
```javascript
constructor(opts) {
  this.containerEl = opts.containerEl;
  this.estimate    = opts.estimate;
  this.input       = opts.input || {};     // ← 추가
  ...
}
```

**[C] dispatchEvent에 input 없으면:**

ContractPage에서 수정:
```javascript
document.dispatchEvent(new CustomEvent('boc:contract:created', {
  detail: {
    contract: payload,
    input: this.input        // ← input 추가
  }
}));
```

**[D] App.js currentInput 없으면:**

App.js 이벤트 리스너 수정:
```javascript
document.addEventListener('boc:contract:created', (e) => {
  this.currentContract = e.detail.contract;
  this.currentInput    = e.detail.input || {};  // ← 추가
});
```

**[E] SchedulesPage에 sections 전달 안 되면:**

App.js _renderSchedules 수정:
```javascript
new SchedulesPage({
  containerEl: main,
  contractId:  this.currentContract?.id || null,
  sections:    this.currentInput?.sections || []   // ← 확인
});
```

### 2-3. 수정 후 체인 검증 테스트

```bash
# 체인 연결 확인
echo "=== [A] WizardPage → ContractPage input 전달 ===" && \
grep -n "input" modules-html/boc-v6/src/wizard/WizardPage.js | grep -i "ContractPage\|getState"

echo "=== [B] ContractPage this.input ===" && \
grep -n "this.input\|opts.input" modules-html/boc-v6/src/contract/ContractPage.js | head -5

echo "=== [C] dispatchEvent input ===" && \
grep -n "input" modules-html/boc-v6/src/contract/ContractPage.js | grep -i "dispatch\|detail"

echo "=== [D] App.js currentInput ===" && \
grep -n "currentInput" modules-html/boc-v6/src/shell/App.js

echo "=== [E] SchedulesPage sections ===" && \
grep -n "sections" modules-html/boc-v6/src/shell/App.js
```

---

## 문제 3 (🟡): MASTER_PLAN Week 6 기록 추가

### 3-1. 현재 상태 확인

```bash
grep -n "Week 6\|v6\.1\|PHASE_4F\|발주\|공정\|검수" docs/MASTER_PLAN.md | tail -10
```

### 3-2. 없으면 즉시 추가

docs/MASTER_PLAN.md 버전 테이블에 추가:
```markdown
| **v6.1** | **2026-04-30** | **§117.3 Phase 4 Week 6 완료 — 발주+공정+검수 Closed Loop UI** |
```

Week 6 내용 섹션에 추가:
```markdown
- Week 6: 발주/공정/검수 화면 ✅
  - OrdersPage (발주 목록/추가/상태전환 PENDING→ORDERED→DELIVERED)
  - SchedulesPage (공정 목록 + generateSchedulesForContract 자동생성)
  - InspectionsPage (검수 기록 + B4 canProceedAfter FAIL→후속공정 차단)
  - IPC: boc:order/schedule/inspection (create/list/transition/record)
  - DB: purchase_orders/schedules/inspections (ecorean-boc.db, B1 rollback)
  - preload: order/schedule/inspection 3개 네임스페이스 추가
  - Feature flags: PHASE_4F_COMPLETE/USE_ORDERS_UI/USE_SCHEDULES_UI/USE_INSPECTIONS_UI
  - esbuild: 9 entry points
```

---

## 문제 4 (🟡): 전체 테스트 + push

### 4-1. 전체 테스트 재실행

```bash
# Phase 3 Closed Loop 회귀
node shell/src/closed-loop/__tests__/Contract.test.cjs
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs

# boc-v6 전체
node modules-html/boc-v6/__tests__/WizardController.test.cjs
node modules-html/boc-v6/__tests__/Router.test.cjs
node modules-html/boc-v6/__tests__/CADCanvas.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
```

### 4-2. 빌드

```bash
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -3
cd ../..
```

### 4-3. 모두 PASS 후 커밋 + push

```bash
# 수정된 파일 커밋
git add -A
git status --short

git commit -m "fix: Week5~6 전체 재검토 수정 — preload 연결 + sections 체인 + MASTER_PLAN v6.1"

git push origin master

# push 확인
git log --oneline origin/master..HEAD
# 비어있어야 정상
```

---

## 최종 보고 형식

```
## Week 5~6 재검토 수정 결과

### 문제 1: preload 연결
- 현황: [boc-v6가 독립 실행 / Electron BrowserWindow]
- 수정: [필요 없음 / 수정 완료]
- 근거: [실제 코드]

### 문제 2: sections 전달 체인
- [A] WizardPage → input 전달: [됨 / 수정 완료]
- [B] ContractPage this.input: [있음 / 수정 완료]
- [C] dispatchEvent input: [있음 / 수정 완료]
- [D] App.js currentInput: [있음 / 수정 완료]
- [E] SchedulesPage sections: [있음 / 수정 완료]

### 문제 3: MASTER_PLAN
- [이미 있음 / 추가 완료]

### 테스트
- 전체: [N/N PASS]

### push
- 완료 여부: [완료 / 미완료 — 이유]

### 최종 판정
- [✅ 이상 없음 / ❌ 남은 문제 — 항목]
```
