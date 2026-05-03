# CLAUDE CODE — Week 6 전수 검토 명령
# 커밋 337034c / e354e3f / af12b4c 검증
# 2026-04-30

---

## 규칙: 코드를 직접 읽고 확인. 추정 보고 금지.

---

## STEP 1: 변경 파일 목록

```bash
cd C:\Users\udune\ecorean-os
git diff 3e1cbec..af12b4c --name-only
```

---

## STEP 2: 헌법 위반 검증

```bash
# P1: PDF 내부원가 노출 여부 (Week 6 신규 파일)
grep -rn "supply\|unitPrice\|원가\|margin" \
  modules-html/boc-v6/src/orders/ \
  modules-html/boc-v6/src/schedules/ \
  modules-html/boc-v6/src/inspections/ 2>nul

# P4: is_simulated 컬럼 — 3개 테이블 모두
grep -n "is_simulated" electron/main.js | grep -E "purchase|schedule|inspect"

# B4: canProceedAfter 실제 호출 여부 (절대 룰)
grep -n "canProceedAfter\|canProceed\|FAIL" \
  modules-html/boc-v6/src/inspections/InspectionsPage.js \
  electron/main.js | grep -v "^Binary"

# B1: rollback SQL 파일 존재
ls db/migrations/v6.0/006_loop_boc_down.sql

# 원칙 15: IPC 핸들러 try/catch 누락 여부
grep -c "try {" electron/main.js
grep -c "catch(e)" electron/main.js

# 원칙 15: UI catch 누락 여부
grep -n "async\b" modules-html/boc-v6/src/orders/OrdersPage.js | head -10
grep -n "catch\|try" modules-html/boc-v6/src/orders/OrdersPage.js | head -10
```

---

## STEP 3: VAT / 금액 검증

```bash
# 발주 총금액 계산 (qty × unitPrice만 — VAT 추가 금지)
grep -n "total\|vat\|VAT\|0\.1" \
  modules-html/boc-v6/src/orders/OrdersPage.js \
  electron/main.js | grep -i "order\|po\|purchase"
```

---

## STEP 4: B4 절대룰 — FAIL 후속 차단 검증

```bash
# InspectionsPage에서 FAIL 시 경고 표시 여부
grep -n "FAIL\|canProceed\|⛔\|후속" \
  modules-html/boc-v6/src/inspections/InspectionsPage.js

# IPC에서 canProceedAfter 반환 여부
grep -n "canProceedAfter\|canProceed\|proceed" electron/main.js
```

---

## STEP 5: IPC ↔ preload 일치 검증

```bash
# main.js 핸들러 목록
grep -n "ipcMain.handle.*boc:" electron/main.js | grep -E "order|schedule|inspect"

# preload 노출 목록
grep -n "order\|schedule\|inspection" preload/preload.js

# 채널명 일치 확인 (boc:order:create ↔ ipcRenderer.invoke)
grep "invoke" preload/preload.js | grep -E "order|schedule|inspect"
```

---

## STEP 6: DB 스키마 검증

```bash
# 3개 테이블 CHECK constraint 존재 여부
grep -A2 "CHECK" electron/main.js | grep -E "PENDING|PLANNED|PASS"

# is_simulated DEFAULT 0 설정
grep -n "is_simulated" electron/main.js | grep "DEFAULT"
```

---

## STEP 7: App.js 연결 검증

```bash
# currentContract 저장 로직 존재
grep -n "currentContract\|boc:contract:created" \
  modules-html/boc-v6/src/shell/App.js

# 3개 라우트 실제 구현 (placeholder 아님)
grep -n "_renderOrders\|_renderSchedules\|_renderInspections" \
  modules-html/boc-v6/src/shell/App.js

# sections 전달 여부 (공정 자동생성)
grep -n "sections\|currentInput" modules-html/boc-v6/src/shell/App.js
```

---

## STEP 8: 전체 테스트 재실행

```bash
# Phase 3 회귀
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs
node shell/src/closed-loop/__tests__/Contract.test.cjs

# Week 6 신규
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs

# 기존
node shell/src/feature-flags/__tests__/flags.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
```

---

## STEP 9: 빌드 최종 확인

```bash
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -5
ls build/orders.js build/schedules.js build/inspections.js
cd ../..
```

---

## STEP 10: 최종 보고 형식

```
## Week 6 검토 결과

### 헌법 위반
- B1 rollback SQL: [있음/없음]
- B4 FAIL 차단: [적용/미적용]
- P4 is_simulated: [3개 테이블 모두/일부 누락]
- 원칙 15 try/catch: [전체 적용/누락 N건]

### IPC 일치
- 채널명 불일치: [없음/목록]

### 테스트
- Phase 3 회귀: [PASS/FAIL]
- Week 6 신규: [N/N PASS]
- feature-flags: [8/8 PASS]

### 누락 항목
- [있으면 목록]

### 버그
- [없으면 "없음"]

### 판정
- [✅ push 가능 / ❌ 수정 필요]
```
