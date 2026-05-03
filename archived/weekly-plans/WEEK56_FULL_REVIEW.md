# CLAUDE CODE — Week 5 + Week 6 전체 재검토
# 커밋 26e4fdb ~ af12b4c 전수 검증
# 2026-04-30

---

## 규칙: 코드를 직접 읽고 확인. 추정 보고 금지. 버그 발견 즉시 수정.

---

## STEP 1: 가장 중요한 구조적 문제 — preload 연결 확인

이것이 Week 5~6 전체의 핵심 선행 조건입니다.

```bash
# 1-A. electron/main.js에서 실제 로드하는 preload 파일
grep -n "PRELOAD\|preload" electron/main.js | head -10

# 1-B. boc-v6 BrowserWindow가 어느 preload 사용하는지
grep -n "webPreferences\|preload\|loadFile\|boc-v6" electron/main.js | head -20

# 1-C. preload/preload.js가 실제 Electron에 연결됐는지
# window.boc.* 가 boc-v6에서 접근 가능한가?
grep -n "preload/preload\|preload\\\\preload" electron/main.js
```

**판정 기준:**
- `preload/preload.js`가 boc-v6 BrowserWindow의 webPreferences.preload에 연결 → ✅ IPC 동작
- 연결 안 됨 → ❌ 모든 IPC가 mock fallback으로만 동작 (DB 저장 안 됨)

**이 결과에 따라:**
- 연결 안 됐으면 → electron/main.js에 boc-v6 BrowserWindow + preload 연결 즉시 추가
- 연결 됐으면 → 다음 STEP 진행

---

## STEP 2: window.boc 호출 일관성 확인

```bash
# Week 5 ContractController
grep -n "window\.boc\|window\.ecoreanAPI" \
  modules-html/boc-v6/src/contract/ContractController.js

# Week 6 Pages
grep -n "window\.boc\|window\.ecoreanAPI" \
  modules-html/boc-v6/src/orders/OrdersPage.js \
  modules-html/boc-v6/src/schedules/SchedulesPage.js \
  modules-html/boc-v6/src/inspections/InspectionsPage.js
```

**판정 기준:**
- `window.boc.*` 사용 → preload/preload.js가 연결된 경우만 동작
- `window.ecoreanAPI.boc.*` 사용 → electron/preload.js에 연결된 경우 동작

어느 쪽인지 STEP 1 결과와 일치해야 합니다.

---

## STEP 3: ContractPage → App.js 데이터 흐름 검증

```bash
# ContractPage에서 boc:contract:created 이벤트 발생 위치
grep -n "dispatchEvent\|boc:contract:created\|CONTRACT_CREATED" \
  modules-html/boc-v6/src/contract/ContractPage.js

# ContractController에서 CONTRACT_CREATED 이벤트 발생 위치
grep -n "CONTRACT_CREATED\|_emit\|emit" \
  modules-html/boc-v6/src/contract/ContractController.js

# App.js에서 이벤트 수신
grep -n "boc:contract:created\|addEventListener" \
  modules-html/boc-v6/src/shell/App.js | head -10

# App.js currentInput 설정 (sections 전달 확인)
grep -n "currentInput\|sections" \
  modules-html/boc-v6/src/shell/App.js
```

**흐름 검증:**
```
마법자 완료 → WizardPage._lastEstimate 저장
→ COMPLETE 단계 → ContractPage 생성 (estimate + input 전달?)
→ 계약 생성 → ContractController._emit('CONTRACT_CREATED')
→ ContractPage가 dispatchEvent(boc:contract:created)
→ App.js가 이벤트 수신 → currentContract + currentInput 저장
→ /schedules 클릭 → SchedulesPage(sections: this.currentInput.sections)
```

각 단계 코드 존재 여부 확인.

---

## STEP 4: WizardPage → ContractPage input 전달 확인

```bash
# WizardPage에서 ContractPage 생성 시 input 전달 여부
grep -n "input\|ContractPage\|getState" \
  modules-html/boc-v6/src/wizard/WizardPage.js | head -20

# ContractPage constructor에서 this.input 저장 여부
grep -n "this\.input\|opts\.input" \
  modules-html/boc-v6/src/contract/ContractPage.js | head -10
```

**판정:**
- WizardPage가 `input: this.controller.getState().input`을 ContractPage에 전달 → ✅
- ContractPage에서 `this.input = opts.input` 저장 후 dispatchEvent detail에 포함 → ✅
- 어느 하나라도 없으면 → `sections`가 SchedulesPage에 전달 안 됨 → 공정 자동생성 불가

---

## STEP 5: MASTER_PLAN 업데이트 확인

```bash
# Week 6 기록 존재 여부
grep -n "Week 6\|v6\.1\|PHASE_4F" docs/MASTER_PLAN.md | tail -10
```

**판정:**
- Week 6 ✅ 기록 없으면 → MASTER_PLAN 갱신 미완료 → 즉시 추가

---

## STEP 6: push 상태 확인

```bash
git log --oneline origin/master..HEAD
```

**판정:**
- 커밋이 남아있으면 → push 미완료
- 비어있으면 → 이미 push 완료

---

## STEP 7: 개인정보 보호 현황 재확인

```bash
# Week 5: 고객 개인정보 암호화 상태
grep -n "encrypt\|AES\|암호화\|TODO.*P6" \
  modules-html/boc-v6/src/contract/ContractController.js \
  electron/main.js | grep -i "contract\|customer"

# 동의 체크박스 존재 여부
grep -n "consent\|동의\|privacyConsent" \
  modules-html/boc-v6/src/contract/ContractPage.js
```

---

## STEP 8: 전체 테스트 재실행 + 회귀 확인

```bash
# Phase 3 엔진 전체 (39개 파일 중 Closed Loop 관련)
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

# KPI/CoreBus/Security 등
node modules-html/boc-v6/__tests__/KPIData.test.cjs 2>nul || echo "없음"
node modules-html/boc-v6/__tests__/CoreBus.test.cjs 2>nul || echo "없음"
```

---

## STEP 9: 빌드 최종 확인

```bash
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -5
cd ../..
```

---

## STEP 10: 최종 보고 형식

```
## Week 5~6 전체 재검토 결과

### 🔴 치명 (즉시 수정 필요)
- [있으면 목록 / 없으면 "없음"]

### 🟡 구조 이슈 (동작 이상)
- [있으면 목록 / 없으면 "없음"]

### preload 연결 상태
- boc-v6 → preload/preload.js 연결: [됨/안됨]
- window.boc.* 실제 동작: [가능/불가능]

### 데이터 흐름
- 마법자 → ContractPage input 전달: [됨/안됨]
- ContractPage → App.js currentInput: [됨/안됨]
- App.js → SchedulesPage sections: [됨/안됨]

### MASTER_PLAN
- Week 6 기록: [있음/없음]

### push 상태
- 미push 커밋: [N개 / 없음]

### 테스트
- 전체: [N/N PASS]

### 판정
- [✅ 이상 없음 / ❌ 수정 필요 — 항목 목록]
```
