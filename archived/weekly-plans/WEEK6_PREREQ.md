# CLAUDE CODE — Week 6 사전 조사 명령
# 이 결과 없이는 Week 6 명령서 작성 불가
# 2026-04-30

---

## 명령: 아래 전부 실행하고 결과를 그대로 출력하라

```bash
# 1. Phase 3 Closed Loop 엔진 경로 + 함수명
ls shell/src/closed-loop/
cat shell/src/closed-loop/order/Order.cjs 2>nul | head -60
cat shell/src/closed-loop/schedule/Schedule.cjs 2>nul | head -60
cat shell/src/closed-loop/inspection/Inspection.cjs 2>nul | head -60
cat shell/src/closed-loop/defect/Defect.cjs 2>nul | head -60
cat shell/src/closed-loop/settlement/Settlement.cjs 2>nul | head -60

# 2. App.js placeholder 현황
grep -n "orders\|schedules\|inspections\|defects\|settlement" \
  modules-html/boc-v6/src/shell/App.js

# 3. 현재 DB 테이블 현황
grep -n "CREATE TABLE" electron/main.js
ls db/migrations/v6.0/

# 4. WizardController estimate 전체 구조
grep -n "estimate\|lineItems\|spaces\|schedule" \
  modules-html/boc-v6/src/wizard/WizardController.js | head -30

# 5. 기존 테스트 파일 목록
find . -name "*.test.cjs" -not -path "*/node_modules/*" | sort

# 6. preload/preload.js 현재 전체 구조
cat preload/preload.js
```
