# CLAUDE CODE — Week 9 통합 사전 조사
# 잔여 위험 7건 + 허점 3개 + 마무리 작업 통합 진단
# 조사만, 구현 금지
# 2026-04-30

---

## 명령: 아래 전부 실행하고 결과 그대로 출력. 구현 금지.

```bash
cd C:\Users\udune\ecorean-os
echo "=================== Week 9 통합 진단 시작 ==================="

# ─── 1. 현재 상태 ───
echo ""
echo "=== 1. git 현황 ==="
git log --oneline -5
git status --short | head -20
git log --oneline origin/master..HEAD || echo "(push 완료)"

# ─── 2. 잔여 위험 7건 조사 ───

echo ""
echo "=== 2-1. 빌드 결과물 git 추적 여부 ==="
git ls-files modules-html/boc-v6/build/ 2>nul | wc -l
echo "(0이면 미추적, 1+이면 추적 중)"
grep -E "build" modules-html/boc-v6/.gitignore 2>nul || echo "(boc-v6/.gitignore에 build 등록 없음)"

echo ""
echo "=== 2-2. dotenv 의존성 ==="
grep -A1 "dotenv" package.json | head -5 || echo "(package.json에 dotenv 없음)"
node -e "require('dotenv'); console.log('OK')" 2>&1 | tail -1

echo ""
echo "=== 2-3. Cytoscape 의존성 ==="
grep -A1 "cytoscape" package.json | head -5 || echo "(package.json에 cytoscape 없음)"
grep -n "cdnjs\|cytoscape.min.js" modules-html/boc-v6/src/topology/TopologyPage.js

echo ""
echo "=== 2-4. 각 페이지 unmount 메서드 존재 여부 ==="
for f in \
  modules-html/boc-v6/src/contract/ContractPage.js \
  modules-html/boc-v6/src/orders/OrdersPage.js \
  modules-html/boc-v6/src/schedules/SchedulesPage.js \
  modules-html/boc-v6/src/inspections/InspectionsPage.js \
  modules-html/boc-v6/src/topology/TopologyPage.js \
  modules-html/boc-v6/src/ai-executive/AIExecutivePage.js \
  modules-html/boc-v6/src/settlement/SettlementPage.js; do
  count=$(grep -c "unmount" "$f" 2>nul || echo "0")
  echo "$f → unmount: $count"
done

echo ""
echo "=== 2-5. preload 두 파일 동기화 ==="
echo "--- preload/preload.js boc 항목 ---"
grep -E "create:|list:|update|generate|transition|record|query|getConfig|countLearning|measure" preload/preload.js 2>nul | sort | head -30
echo "--- electron/preload.js boc 항목 ---"
grep -E "create:|list:|update|generate|transition|record|query|getConfig|countLearning|measure" electron/preload.js 2>nul | sort | head -30

echo ""
echo "=== 2-6. XSS — 사용자 입력값 innerHTML 직접 보간 ==="
grep -rn '${[a-z]*\.\(vendor_name\|customer_name\|category\|notes\|inspector\|section_id\)' \
  modules-html/boc-v6/src/orders/ \
  modules-html/boc-v6/src/schedules/ \
  modules-html/boc-v6/src/inspections/ \
  modules-html/boc-v6/src/settlement/ 2>nul | grep -v "test\|build\|__tests__" | head -15

echo ""
echo "=== 2-7. console.log 잔존 위치 ==="
grep -rn "console\.log" \
  modules-html/boc-v6/src/ \
  shell/src/ai/ \
  shell/src/closed-loop/ 2>nul | grep -v "__tests__\|test\.cjs\|build\|console\.error" | wc -l
echo "(위 숫자가 정리 대상 console.log 개수)"

# ─── 3. 허점 3개 조사 ───

echo ""
echo "=== 3-1. App.js currentPage 명시적 관리 ==="
grep -n "currentPage\|this\.currentPage" modules-html/boc-v6/src/shell/App.js | head -10

echo ""
echo "=== 3-2. 직접 보간 ${} 위치 전수 (사용자 입력 가능 변수) ==="
grep -rn '\${[a-z_.]*\(name\|note\|vendor\|inspector\|comment\|message\|address\)' \
  modules-html/boc-v6/src/ 2>nul | grep -v "__tests__\|build\|escapeHtml\|esc(" | head -20

echo ""
echo "=== 3-3. Cytoscape 번들 크기 (현재 빌드 결과) ==="
ls -la modules-html/boc-v6/build/chunks/ 2>nul | grep -i "cyto\|chunk-" | head -5
ls modules-html/boc-v6/build/ 2>nul | head -20

# ─── 4. Week 9 본래 작업 사전 조사 ───

echo ""
echo "=== 4-1. README.md 현황 ==="
ls README.md 2>nul && wc -l README.md
ls docs/README*.md 2>nul

echo ""
echo "=== 4-2. git tag 현황 ==="
git tag -l "v*" | head -10

echo ""
echo "=== 4-3. MASTER_PLAN 최종 버전 ==="
grep -n "v6\." docs/MASTER_PLAN.md | tail -5

echo ""
echo "=== 4-4. feature-flags 최종 상태 ==="
grep -n "PHASE_4.*COMPLETE" shell/src/feature-flags/flags.cjs

echo ""
echo "=== 4-5. 전체 entry 수 ==="
grep -c "path.join" modules-html/boc-v6/build.config.cjs

echo ""
echo "=================== 진단 종료 ==================="
```
