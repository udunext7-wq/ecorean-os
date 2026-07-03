# CLAUDE CODE — 전체 재검토 수정 명령
# Week 5~8 발견 문제 확인 + 즉시 수정
# 2026-04-30

---

## 규칙: 확인 → 문제 있으면 즉시 수정 → 테스트 → 보고

---

## 문제 1 (🔴): boc:contract:list 응답 구조 불일치

### 1-1. 현재 응답 구조 확인

```bash
grep -n "boc:contract:list\|ok: true.*contract\|return.*contract" \
  electron/main.js | grep -i "list\|return" | head -10
```

### 1-2. 호출하는 쪽 확인

```bash
grep -n "contractsRes\|contract\.list\|\.contracts\|data\.list" \
  modules-html/boc-v6/src/contract/ContractPage.js \
  modules-html/boc-v6/src/contract/screens/ContractList.js \
  modules-html/boc-v6/src/settlement/SettlementPage.js 2>nul | head -20
```

### 1-3. 판단 + 수정

**응답 구조를 `{ ok, data: { list } }` 로 통일.**

main.js `boc:contract:list` 핸들러:
```javascript
return { ok: true, data: { list: rows } };   // 통일
```

모든 호출하는 쪽도 `r.data?.list` 로 통일 확인.
불일치 발견 시 즉시 수정.

---

## 문제 2 (🔴): actual_amount 컬럼 없음

### 2-1. contracts 테이블 스키마 확인

```bash
node -e "
const b = require('better-sqlite3');
const p = require('path');
const os = require('os');
const db = new b(p.join(process.env.APPDATA || os.homedir(), 'ecorean-boc', 'ecorean-boc.db'));
const cols = db.prepare(\"PRAGMA table_info(contracts)\").all();
console.log(cols.map(c => c.name).join(', '));
"
```

### 2-2. actual_amount 컬럼 추가

없으면 마이그레이션 파일 생성 + getBocContractDB에 추가:

파일: `db/migrations/v6.0/007_actual_amount_up.sql`
```sql
BEGIN TRANSACTION;
ALTER TABLE contracts ADD COLUMN actual_amount INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN actual_note   TEXT;
COMMIT;
```

파일: `db/migrations/v6.0/007_actual_amount_down.sql`
```sql
-- SQLite ALTER TABLE DROP COLUMN 미지원 (v3.35 미만)
-- 롤백: 컬럼 제거 불가 → 값을 0으로 초기화
BEGIN TRANSACTION;
UPDATE contracts SET actual_amount = 0, actual_note = NULL;
COMMIT;
```

getBocContractDB() 내부 exec에 추가:
```sql
ALTER TABLE contracts ADD COLUMN actual_amount INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN actual_note   TEXT;
```

> `ALTER TABLE ADD COLUMN`은 멱등 실행 불가 (이미 있으면 오류).
> try/catch로 감싸야 함:

```javascript
try { _bocContractDB.exec('ALTER TABLE contracts ADD COLUMN actual_amount INTEGER DEFAULT 0'); } catch(_) {}
try { _bocContractDB.exec('ALTER TABLE contracts ADD COLUMN actual_note TEXT'); } catch(_) {}
```

### 2-3. SettlementPage 정산 UI 개선

actual_amount가 0이면 "미입력" 표시:
```javascript
const actual = c.actual_amount || 0;
const hasActual = actual > 0;
```

정산 화면에 실투입 입력 버튼 추가 (수동 입력):
```javascript
// 실투입 금액 입력 버튼
`<button data-contract-id="${c.id}" data-action="input-actual"
  style="font-size:10px;padding:2px 7px;...">실투입 입력</button>`
```

---

## 문제 3 (🟡): graph.json 변경 여부 확인

```bash
# Week 7 커밋에서 graph.json 변경 여부
git diff 4126bb4..d851173 -- docs/graph.json

# 변경 있으면 즉시 보고 (헌법 위반 — 12노드+24엣지 절대 불변)
```

변경 없으면 → OK.
변경 있으면 → `git revert` 또는 원본 복원.

---

## 문제 4 (🟡): isSimulated 전달 체인 확인

### 4-1. ContractPage → isSimulated 전달 코드 확인

```bash
grep -n "isSimulated\|is_simulated\|simulated\|radio\|real" \
  modules-html/boc-v6/src/contract/ContractPage.js | head -20
```

### 4-2. ContractController → IPC 전달 확인

```bash
grep -n "isSimulated\|is_simulated" \
  modules-html/boc-v6/src/contract/ContractController.js | head -10
```

### 4-3. main.js IPC → DB 저장 확인

```bash
grep -n "isSimulated\|is_simulated" electron/main.js | grep -i "contract" | head -10
```

**체인이 끊겨 있으면:**

ContractPage에서:
```javascript
// 실거래/시뮬 선택값 읽기
const isReal = this.containerEl.querySelector('input[name="contract-mode"]:checked')?.value === 'real';
// ContractController.createDraft에 전달
this.controller.createDraft({ ..., isSimulated: !isReal });
```

ContractController에서:
```javascript
// IPC 호출 시 isSimulated 포함
const result = await window.boc.contract.create({ ..., isSimulated: opts.isSimulated });
```

---

## 문제 5 (🔴): Week 8 실행

위 수정 완료 후 Week 8 명령서 실행:

```bash
# CLAUDE_CODE_PHASE4_WEEK8.md 순서대로 실행
# 작업 0: ContractPage 실거래/시뮬 UI
# 작업 1: ML 카운트 + SLA IPC
# 작업 2: SettlementPage
# 작업 3: esbuild + flags + MASTER_PLAN + push
```

---

## 최종 보고 형식

```
## 전체 재검토 수정 결과

### 문제 1: contract:list 응답 구조
- 실제 구조: [확인값]
- 수정: [필요 없음 / 수정 완료]

### 문제 2: actual_amount 컬럼
- 컬럼 존재: [있음 / 없음]
- 수정: [필요 없음 / 추가 완료]

### 문제 3: graph.json 변경
- 변경 여부: [없음 / 변경됨]
- 조치: [이상 없음 / 복원 완료]

### 문제 4: isSimulated 체인
- 전달 여부: [완전 / 단절 구간]
- 수정: [필요 없음 / 수정 완료]

### 문제 5: Week 8 실행
- Settlement 테스트: [N/N PASS]
- 전체 테스트: [N/N PASS]
- 빌드: [N entry]
- push: [완료]

### 최종 판정
- [✅ 이상 없음 / ❌ 남은 문제]
```
