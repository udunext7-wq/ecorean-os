# CLAUDE CODE — Week 7 사전 조사
# 결과 없이 명령서 작성 불가. 조사만 하고 구현 금지.
# 2026-04-30

---

## 명령: 아래 전부 실행하고 결과를 그대로 출력하라. 구현 금지.

```bash
# 1. graph.json 전체 내용
cat docs/graph.json

# 2. topology 기존 파일 확인
cat modules-html/topology/index.html 2>nul | head -80 || echo "없음"
ls modules-html/topology/ 2>nul || echo "없음"

# 3. App.js topology/ai-executive placeholder 위치
grep -n "topology\|ai-executive\|aiExecutive\|AI.*임원\|_renderTop\|_renderAI" \
  modules-html/boc-v6/src/shell/App.js

# 4. Claude API 키 관리 현황
grep -rn "ANTHROPIC\|anthropic\|claude.*api\|api.*key" \
  electron/main.js package.json .env 2>nul | grep -v "node_modules"

# 5. KPI 현재 구조
cat modules-html/boc-v6/src/kpi-dashboard/KPIDashboardPage.js | head -80
cat modules-html/boc-v6/src/kpi-bar/GlobalKPIBar.js 2>nul | head -40 || \
  find modules-html/boc-v6 -name "*KPI*" -o -name "*kpi*" | grep -v "__tests__\|build"

# 6. MASTER_PLAN Week 7 목표 확인
grep -n "Week 7\|토폴로지\|AI 임원\|topology\|executive" docs/MASTER_PLAN.md | head -20

# 7. 기존 AI/Claude API 연동 파일
find . -name "*.js" -o -name "*.cjs" | xargs grep -l "anthropic\|claude-3\|claude-sonnet" 2>nul | \
  grep -v "node_modules\|build" | head -10

# 8. feature-flags Week 7 관련
grep -n "PHASE_4G\|TOPOLOGY\|AI_EXEC\|Week7\|Week 7" \
  shell/src/feature-flags/flags.cjs
```
