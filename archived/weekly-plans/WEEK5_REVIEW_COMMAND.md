# CLAUDE CODE 검토 명령 — Phase 4 Week 5 구현 검증
# 커밋 26e4fdb 전수 검토
# 2026-04-30

---

## 명령 개요

Week 5가 대표님 명시적 승인 없이 자율 구현되었다.
구현된 코드가 Week 5 목표 대비 빠진 것, 잘못된 것, 위험한 것이 있는지
**전수 검토 후 보고**하라.

---

## 검토 순서 (건너뜀 금지)

### STEP 1: 구현된 파일 전체 목록 확인

```bash
cd C:\Users\udune\ecorean-os
git diff c42cf16..26e4fdb --name-only
```

출력된 파일 목록을 전부 읽어라.

---

### STEP 2: 각 파일 전체 내용 읽기

```bash
# 신규 파일 6개 전체 읽기
cat modules-html/boc-v6/src/contract/ContractController.js
cat modules-html/boc-v6/src/contract/ContractPage.js
cat modules-html/boc-v6/src/contract/EstimatePDF.js
cat modules-html/boc-v6/src/contract/styles/contract.css
cat modules-html/boc-v6/src/contract/entry.js
cat modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs

# 수정된 파일 8개 전체 읽기
cat modules-html/boc-v6/src/wizard/WizardPage.js
cat modules-html/boc-v6/src/shell/App.js
cat electron/main.js
cat preload/preload.js
cat modules-html/boc-v6/build.config.cjs
cat shell/src/feature-flags/flags.cjs
cat shell/src/feature-flags/__tests__/flags.test.cjs
```

---

### STEP 3: 헌법 위반 검증 (14+1 원칙)

다음 항목을 구현 코드에서 직접 확인하라.

#### 3-1. 절대 수치 변경 여부
```bash
# 22 시공섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형
# 이 수치들이 Week 5 코드 어디에서도 변경되지 않았는지 확인
grep -rn "22\|23\|12\|6\|5" modules-html/boc-v6/src/contract/ | grep -i "section\|space\|concept\|type\|size"
```

#### 3-2. 원칙 P1 — 고객용 PDF ≠ 내부 원가
```bash
# EstimatePDF.js에서 내부 원가(단가/unitPrice/원가) 노출 여부
grep -n "unitPrice\|원가\|cost_item\|supply\b" modules-html/boc-v6/src/contract/EstimatePDF.js
```

#### 3-3. 원칙 P2 — 단가 추정 금지
```bash
# ContractController에서 임의 단가 생성 여부
grep -n "price\|단가\|estimate.*=.*[0-9]" modules-html/boc-v6/src/contract/ContractController.js
```

#### 3-4. 원칙 P4 — is_simulated 분리
```bash
# contracts 테이블에 is_simulated 컬럼 존재 여부
grep -n "is_simulated\|isSimulated" electron/main.js | grep -i "contract"
```

#### 3-5. 원칙 P5 — 계약 = 딥카피 스냅샷
```bash
# ContractController에서 estimate 딥카피 여부
grep -n "JSON.parse\|JSON.stringify\|deepCopy\|snapshot" modules-html/boc-v6/src/contract/ContractController.js
```

#### 3-6. 원칙 P6 — 개인정보 AES-256-GCM
```bash
# 고객 정보 암호화 여부 (Phase 3 Contract.cjs 암호화 호출 여부)
grep -n "encrypt\|AES\|crypto\|toDBRow" modules-html/boc-v6/src/contract/ContractController.js
grep -n "encrypt\|AES\|crypto" electron/main.js | grep -i "contract"
```

#### 3-7. 원칙 13 — 개인정보보호법
```bash
# 동의 체크박스 존재 여부
grep -n "consent\|동의\|privacyConsent" modules-html/boc-v6/src/contract/ContractPage.js

# 전화번호 마스킹 여부
grep -n "mask\|마스킹\|\*\*\*\*" modules-html/boc-v6/src/contract/EstimatePDF.js
```

#### 3-8. 원칙 14 — 계약 동결
```bash
# 계약 생성 후 estimate 수정 차단 여부
grep -n "readOnly\|readonly\|freeze\|동결\|snapshot" modules-html/boc-v6/src/contract/ContractPage.js
```

#### 3-9. 원칙 15 — 에러 처리
```bash
# 모든 async 함수에 try/catch 여부
grep -n "async\|try\|catch" modules-html/boc-v6/src/contract/ContractController.js
grep -n "async\|try\|catch" electron/main.js | grep -A2 "contract"
```

#### 3-10. B1 — rollback SQL 없는 DB 변경 금지
```bash
# contracts 테이블 생성 시 rollback/migration 처리 여부
grep -n "rollback\|BEGIN\|TRANSACTION\|migration" electron/main.js | grep -i "contract"
```

---

### STEP 4: VAT 이중 계산 검증 (치명 버그)

```bash
# [E] estimate.contract (VAT 전) 사용 여부 확인
# estimate.final 사용하면 VAT 이중 계산 발생
grep -n "estimate\.final\|estimate\.contract\|totalAmount" \
  modules-html/boc-v6/src/contract/ContractController.js \
  modules-html/boc-v6/src/contract/ContractPage.js \
  electron/main.js
```

**판정 기준:**
- `totalAmount: estimate.contract` → ✅ 정상
- `totalAmount: estimate.final`   → ❌ VAT 이중 계산

---

### STEP 5: PDF 방식 검증

```bash
# window.print 방식 사용 여부
grep -n "window.print\|printToPDF\|print()" modules-html/boc-v6/src/contract/EstimatePDF.js

# 외부 폰트 URL 사용 여부 (오프라인 위험)
grep -n "googleapis\|fonts\.\|http://" modules-html/boc-v6/src/contract/EstimatePDF.js
```

**판정 기준:**
- `window.print()` + 외부 URL 없음 → ✅ 정상 (오프라인 가능)
- `printToPDF` + `fonts.googleapis.com` → ❌ 오프라인 실패 위험

---

### STEP 6: IPC 연결 검증

```bash
# preload/preload.js에 contract API 노출 여부
grep -n "contract\|boc:contract" preload/preload.js

# electron/main.js에 핸들러 등록 여부
grep -n "boc:contract:create\|boc:contract:list" electron/main.js

# window.boc.contract 호출 일치 여부
grep -n "window.boc\|ecoreanAPI\|boc\.contract" modules-html/boc-v6/src/contract/ContractController.js
```

**판정 기준:**
- preload `boc:contract:create` ↔ main.js `ipcMain.handle('boc:contract:create')` 일치 → ✅
- ContractController에서 `window.boc.contract.create()` 호출 → ✅

---

### STEP 7: WizardPage → ContractPage 연결 검증

```bash
# ESTIMATE_CALCULATED 이벤트 처리 여부
grep -n "ESTIMATE_CALCULATED\|_lastEstimate\|ContractPage" \
  modules-html/boc-v6/src/wizard/WizardPage.js

# COMPLETE 단계에서 ContractPage 렌더링 여부
grep -n "COMPLETE\|G5\|ContractPage" modules-html/boc-v6/src/wizard/WizardPage.js
```

---

### STEP 8: 테스트 전수 실행

```bash
# 기존 회귀 테스트 (Phase 3 포함)
node shell/tests/engines/InputNormalizer.test.cjs
node shell/tests/engines/PresetEngine.test.cjs
node shell/tests/engines/RuleEngine.test.cjs
node shell/tests/engines/DefaultSpecEngine.test.cjs
node shell/tests/engines/EstimateEngine.test.cjs
node shell/tests/engines/ScheduleEngine.test.cjs
node shell/tests/engines/DocumentGenerator.test.cjs
node shell/tests/engines/DiagnosticsEngine.test.cjs
node shell/tests/engines/TestRunner.test.cjs
node shell/tests/db/CostLoader.test.cjs

# Week 4-A 테스트
node shell/src/feature-flags/__tests__/flags.test.cjs

# Week 5 신규 테스트
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
```

**실패 항목 전부 보고. 1건이라도 실패 시 즉시 수정.**

---

### STEP 9: 빌드 검증

```bash
cd modules-html/boc-v6
node build.cjs

# contract 노드 존재 확인
ls build/contract*.js 2>nul || ls build/ | grep contract
```

---

### STEP 10: Week 5 목표 대비 누락 항목 점검

아래 항목이 구현되었는지 코드에서 직접 확인하고 체크하라.

```
□ ContractController.js — IPC + 로컬 fallback
□ ContractPage.js — 고객정보 폼 (이름/주소/전화/이메일)
□ ContractPage.js — 개인정보 동의 체크박스 [필수]
□ ContractPage.js — 계약조건 폼 (계약금/잔금/공기/특약)
□ ContractPage.js — 견적 요약 read-only 표시
□ ContractPage.js — DRAFT → SIGNED → CANCELED 상태 전환
□ EstimatePDF.js — 한국 표준 견적서 양식 (공사명/발주처/수급인/항목/합계/서명란)
□ EstimatePDF.js — 부가세 10% 표시
□ EstimatePDF.js — 전화번호 마스킹
□ electron/main.js — boc:contract:create IPC
□ electron/main.js — boc:contract:list IPC
□ electron/main.js — contracts 테이블 자동 생성
□ preload/preload.js — window.boc.contract 노출
□ WizardPage.js — COMPLETE 후 ContractPage 자동 표시
□ App.js — /contracts 라우트 활성화
□ App.js — /cad 라우트 활성화
□ build.config.cjs — contract entry 추가
□ flags.cjs — PHASE_4E_COMPLETE = true
□ MASTER_PLAN.md — v6.0 Week 5 기록
```

---

### STEP 11: 최종 보고

위 STEP 1~10 결과를 다음 형식으로 보고하라:

```
## Week 5 검토 결과

### 헌법 위반
- P1~P6: [위반 있음/없음] + 상세
- 원칙 13: [위반 있음/없음] + 상세
- 원칙 14: [위반 있음/없음] + 상세
- 원칙 15: [위반 있음/없음] + 상세
- B1~B8: [위반 있음/없음] + 상세

### VAT 이중 계산
- [estimate.contract 사용 확인 / estimate.final 사용 — 버그]

### 테스트 결과
- 회귀 10종: [PASS/FAIL]
- Week 5 신규: [N/N PASS]
- feature-flags: [N/N PASS]

### 누락 항목
- [있으면 목록, 없으면 "없음"]

### 버그/위험
- [발견된 버그 목록, 없으면 "없음"]

### 판정
- [✅ 이상 없음 / ❌ 수정 필요 — 수정 항목 목록]
```

---

## 중요 지침

- 코드를 읽지 않고 추정으로 보고 금지
- 각 항목을 실제 파일에서 확인 후 보고
- 버그 발견 시 즉시 수정 제안 (원칙 15)
- 수정이 필요하면 수정 후 테스트 재실행
- 모든 항목 PASS 확인 후 "이상 없음" 보고
