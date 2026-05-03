# CLAUDE CODE — 전체 점검 + 재설계안 작성
# 중복/불필요/오류/버그 전수 검토 + 새 아키텍처 설계
# 2026-05-02

---

## 규칙: 조사 + 분석만, 실제 코드 수정 금지

이 명령은 점검 + 보고서 작성만 수행합니다.
실제 리팩토링은 보고서 검토 후 별도 명령으로 진행됩니다.

---

# 📋 PART 1: 전체 점검 (현재 상태)

## STEP 1: 전체 구조 파악

```bash
cd C:\Users\udune\ecorean-os

echo "=== 1-1. 폴더 구조 ==="
ls -la
echo ""
echo "=== 1-2. modules-html 하위 ==="
ls -la modules-html/
echo ""
echo "=== 1-3. shell/src 하위 ==="
ls -la shell/src/
echo ""
echo "=== 1-4. boc-v6 entry 수 ==="
grep -c "path.join" modules-html/boc-v6/build.config.cjs
echo ""
echo "=== 1-5. 전체 .js/.cjs 파일 수 ==="
find . -name "*.js" -o -name "*.cjs" | grep -v node_modules | grep -v build | wc -l
echo ""
echo "=== 1-6. 전체 코드 라인 수 ==="
find . -name "*.js" -o -name "*.cjs" | grep -v node_modules | grep -v build | xargs wc -l | tail -1
```

## STEP 2: 중복 코드 검출

```bash
echo "=== 2-1. 중복 IPC 핸들러 ==="
grep -rn "ipcMain.handle" electron/ | sort | uniq -d

echo ""
echo "=== 2-2. 중복 함수명 ==="
grep -rn "^function \|class " modules-html/boc-v6/src/ shell/src/ | grep -v "__tests__\|build" | awk -F':' '{print $NF}' | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== 2-3. 중복 페이지 클래스 ==="
grep -rn "class.*Page" modules-html/boc-v6/src/ | grep -v "__tests__\|build"

echo ""
echo "=== 2-4. preload 두 파일 비교 ==="
echo "--- electron/preload.js ---"
grep -E "^\s+[a-z]+:" electron/preload.js | sort
echo "--- preload/preload.js ---"
grep -E "^\s+[a-z]+:" preload/preload.js | sort

echo ""
echo "=== 2-5. estimate-v6 vs boc-v6 중복 ==="
ls modules-html/estimate-v6/ 2>nul
ls modules-html/boc-v6/src/wizard/ 2>nul
```

## STEP 3: 불필요한 파일

```bash
echo "=== 3-1. 사용되지 않는 파일 (예상) ==="
find . -name "*.js" -o -name "*.cjs" | grep -v node_modules | grep -v build | while read f; do
  filename=$(basename "$f")
  basename=$(echo "$filename" | sed 's/\.[^.]*$//')
  count=$(grep -rn "$basename" --include="*.js" --include="*.cjs" --include="*.json" . 2>/dev/null | grep -v "$f" | wc -l)
  if [ "$count" -lt 2 ]; then
    echo "참조 거의 없음: $f"
  fi
done | head -20

echo ""
echo "=== 3-2. 빌드 결과물 (자동 생성) ==="
ls modules-html/boc-v6/build/ 2>nul | wc -l
echo "(빌드 결과 — git 추적 안 됨)"

echo ""
echo "=== 3-3. 백업/임시 파일 ==="
find . -name "*.bak" -o -name "*.tmp" -o -name "*~" 2>/dev/null | grep -v node_modules
```

## STEP 4: 오류/버그 패턴 검출

```bash
echo "=== 4-1. once: true 패턴 (학습 실패 안티패턴) ==="
grep -rn "{ once: true }" modules-html/boc-v6/src/ 2>nul | grep -v "__tests__"

echo ""
echo "=== 4-2. async 함수에 try/catch 누락 ==="
grep -rn "async " modules-html/boc-v6/src/ | grep -v "__tests__" | wc -l
grep -rn "catch" modules-html/boc-v6/src/ | grep -v "__tests__" | wc -l

echo ""
echo "=== 4-3. 직접 innerHTML 사용 (XSS 위험) ==="
grep -rn 'innerHTML.*\${' modules-html/boc-v6/src/ | grep -v "__tests__\|escapeHtml\|esc(" | head -10

echo ""
echo "=== 4-4. console.log 잔존 ==="
grep -rn "console\.log" modules-html/boc-v6/src/ shell/src/ 2>/dev/null | grep -v "__tests__\|build\|console\.error" | wc -l

echo ""
echo "=== 4-5. TODO/FIXME 주석 ==="
grep -rn "TODO\|FIXME\|XXX" modules-html/boc-v6/src/ shell/src/ 2>/dev/null | grep -v "__tests__\|node_modules" | head -10

echo ""
echo "=== 4-6. 헌법 위반 패턴 ==="
echo "--- 22/23/12/6/5 직접 변경 시도 ---"
grep -rn "sections.*=.*[0-9]\|spaces.*=.*[0-9]" modules-html/boc-v6/src/ shell/src/ | grep -v "__tests__" | head -5

echo ""
echo "=== 4-7. estimate.final 잘못 사용 (VAT 이중) ==="
grep -rn "estimate\.final" modules-html/boc-v6/src/ shell/src/ | grep -v "__tests__"

echo ""
echo "=== 4-8. graph.json 변경 여부 ==="
git log --oneline --all -- docs/graph.json | head -5
```

## STEP 5: 헌법 13 엔진 실제 구현 검증

```bash
echo "=== 5-1. 13 엔진 파일 존재 여부 ==="
for engine in InputNormalizer PresetEngine RuleEngine DefaultSpecEngine \
              EstimateEngine ScheduleEngine DocumentGenerator DiagnosticsEngine \
              TestRunner CompletionReportEngine EstimateVsActualEngine \
              MasterDBUpdateRequestEngine ApprovalLogEngine; do
  result=$(find . -name "${engine}*" -not -path "*/node_modules/*" 2>/dev/null | head -3)
  if [ -z "$result" ]; then
    echo "❌ $engine — 파일 없음"
  else
    lines=$(cat $result 2>/dev/null | wc -l)
    echo "✅ $engine — $lines lines"
  fi
done

echo ""
echo "=== 5-2. 시드 데이터 적재 현황 ==="
node -e "
const b = require('better-sqlite3');
const p = require('path');
const db = new b(p.join(process.env.APPDATA, 'ecorean-boc', 'ecorean-boc.db'));
try {
  const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
  console.log('테이블 목록:', tables.map(t=>t.name).join(', '));
  const cost = db.prepare('SELECT COUNT(*) as n FROM cost_items').get();
  console.log('cost_items:', cost.n, '/', '대표님 메모리: 159건');
} catch(e) { console.log('DB 오류:', e.message); }
"
```

## STEP 6: estimate-v6 vs boc-v6 분리/통합 상태

```bash
echo "=== 6-1. estimate-v6 구조 ==="
ls modules-html/estimate-v6/ 2>/dev/null
find modules-html/estimate-v6/ -name "*.cjs" -o -name "*.js" 2>/dev/null | wc -l

echo ""
echo "=== 6-2. boc-v6에서 estimate-v6 참조 ==="
grep -rn "estimate-v6\|@estimate-v6" modules-html/boc-v6/src/ | head -10
grep -rn "calculateEstimate\|CalcEngineV56" modules-html/boc-v6/src/ | head -10

echo ""
echo "=== 6-3. 이중 견적 로직 ==="
grep -rn "function.*[Ee]stimate\|class.*Estimate" \
  modules-html/boc-v6/src/ \
  modules-html/estimate-v6/ \
  shell/src/ 2>/dev/null | grep -v "__tests__\|build" | head -10
```

## STEP 7: MiniCAD 현황

```bash
echo "=== 7-1. MiniCAD 위치 검색 ==="
find . -iname "*minicad*" -o -iname "*mini-cad*" 2>/dev/null | grep -v node_modules | head -10

echo ""
echo "=== 7-2. CAD 관련 파일 ==="
find . -iname "*cad*" -not -path "*/node_modules/*" 2>/dev/null | head -10

echo ""
echo "=== 7-3. boc-v6의 CAD 모듈 ==="
ls modules-html/boc-v6/src/cad/ 2>/dev/null
find modules-html/boc-v6/src/cad/ -type f 2>/dev/null | head -10

echo ""
echo "=== 7-4. Konva.js 의존성 ==="
grep -A1 "konva" package.json
```

## STEP 8: AI 통합 현황

```bash
echo "=== 8-1. AI Provider 코드 ==="
ls shell/src/ai/ 2>/dev/null
cat shell/src/ai/AIProvider.cjs 2>/dev/null | head -30

echo ""
echo "=== 8-2. AI 임원 페이지 ==="
ls modules-html/boc-v6/src/ai-executive/ 2>/dev/null

echo ""
echo "=== 8-3. .env 설정 ==="
cat .env 2>/dev/null | grep -v "^#" | grep -v "^$"
```

## STEP 9: 데이터 흐름 단절 검증

```bash
echo "=== 9-1. Wizard → Contract 연결 ==="
grep -n "ContractPage\|onWizardComplete\|currentEstimate" \
  modules-html/boc-v6/src/wizard/WizardPage.js 2>/dev/null

echo ""
echo "=== 9-2. Contract → Order 연결 ==="
grep -n "createPO\|OrdersPage\|contractId" \
  modules-html/boc-v6/src/contract/ContractPage.js 2>/dev/null

echo ""
echo "=== 9-3. Schedule 자동 생성 연결 ==="
grep -n "generateSchedulesForContract" \
  modules-html/boc-v6/src/ \
  electron/main.js 2>/dev/null | head -5

echo ""
echo "=== 9-4. Inspection → Settlement 연결 ==="
grep -n "actual_amount\|onInspectionComplete" \
  modules-html/boc-v6/src/inspections/InspectionsPage.js 2>/dev/null
```

---

# 📋 PART 2: 점검 보고서 형식

위 9 STEP 결과를 모아 다음 형식으로 종합 보고서 작성:

```markdown
# 전체 점검 결과 보고서
## 작성일: 2026-05-02

## 1. 시스템 규모
- 폴더 수: N개
- 파일 수: N개
- 코드 라인: N줄
- 빌드 entry: N개

## 2. 발견된 문제

### 2-1. 중복 (🔴 치명)
[발견된 중복 항목 목록]

### 2-2. 불필요 (🟡 정리 대상)
[참조되지 않는 파일 / 미사용 코드 / 빌드 결과물 추적 등]

### 2-3. 오류/버그 (🔴)
[once:true 패턴, XSS, 헌법 위반, VAT 오류 등]

### 2-4. 헌법 13 엔진 실구현
| 엔진 | 상태 | 라인 수 | 평가 |
|---|---|---|---|
| InputNormalizer | ✅/❌ | N | 구조만/실제 동작 |
... 13개 전부

### 2-5. 데이터 흐름 단절
[wizard → contract → order → schedule → inspection → settlement 흐름 검증]

## 3. 종합 점수

| 영역 | 점수 |
|---|---|
| 구조 일관성 | N/100 |
| 헌법 준수 | N/100 |
| 코드 품질 | N/100 |
| 데이터 흐름 | N/100 |
| 종합 | N/100 |
```

---

# 📋 PART 3: 새 설계안 작성

위 점검 결과를 바탕으로 다음 설계안 작성:

## 설계 원칙 (대표님 비전)

```
1. MiniCAD = 단독 모듈 (먼저 완성)
2. 견적마법사 = 단독 모듈 (이어서 완성)
3. 둘은 분리되어 있지만 데이터 자동 연결
4. JSON v5.7+ SSoT가 둘을 연결
5. OpenCrab MetaOntology가 노드/관계 표준화
6. 세부 옵션 = DB + 메타DB + 온톨로지 결합
7. 인과관계 + 상관관계 자동 정립
8. 자동 견적 + 자동 공정 출력
9. 실거래 피드백 → 학습 강화 → 자기 진화
10. 사람 개입 최소 (AI 임원 자율)
```

## 설계 보고서 형식

```markdown
# ECOREAN OS 재설계안 v7.0
## 작성일: 2026-05-02

## 1. 새 아키텍처 (3-Layer)

[Layer 1] 입력 모듈
  - MiniCAD 단독 모듈
  - 견적마법사 단독 모듈

[Layer 2] 통합 OS — OpenCrab
  - MetaOntology Brain
  - 9 Space + 11 MetaEdge
  
[Layer 3] 데이터 + 학습
  - Neo4j (그래프)
  - ChromaDB (벡터)
  - MongoDB (문서)
  - PostgreSQL (권한)
  - ML Phase 자동 진화

## 2. 모듈 분리 명세

### 2-1. MiniCAD 모듈
- 위치: ecorean-os/modules/minicad/
- 독립 폴더 + 독립 빌드
- 단독 실행 가능
- 기존 v5.8.1 라이브러리 79종 활용
- 출력: JSON v5.7+ SSoT (4종 페어)

### 2-2. 견적마법사 모듈
- 위치: ecorean-os/modules/estimator/
- 독립 폴더 + 독립 빌드
- MiniCAD JSON 자동 수신
- 세부 옵션 입력 UI
- OpenCrab 온톨로지 활용
- 출력: 견적서 + 공정 + 발주 자동

### 2-3. OpenCrab 통합
- 위치: ecorean-os/services/opencrab/
- Docker 컨테이너 (4개 DB)
- MCP 프로토콜로 연결
- 헌법 manifest로 강제

## 3. 자산 활용 결정

### 3-1. 살릴 것
[기존 boc-v6에서 재사용 가능한 화면/엔진 목록]

### 3-2. 버릴 것
[중복/짜집기/불필요 항목 목록]

### 3-3. 재구성할 것
[기존 코드 + OpenCrab 결합 방식]

## 4. 학습/진화 메커니즘

[데이터 누적 → 온톨로지 강화 → 정확도 향상 → 반복]

## 5. 단계별 로드맵

Phase A (1주): OpenCrab 파일럿 + 점검 수정
Phase B (2주): MiniCAD 단독 모듈 완성
Phase C (2주): 견적마법사 단독 모듈
Phase D (1주): OpenCrab 본격 통합
Phase E (1주): 자동 연계 + 학습 활성화
Phase F (1주): 검증 + v7.0 릴리즈

## 6. 짜집기 방지 장치

[constitution.json + pre-commit hook + 자기 진단 등]
```

---

# 📋 출력 파일

다음 2개 파일을 작성하라:

```
1. /home/claude/AUDIT_REPORT.md
   (전체 점검 결과 보고서)

2. /home/claude/REDESIGN_v7.md
   (새 아키텍처 설계안)
```

작성 후 두 파일 경로를 보고하라.

---

# ⚠️ 중요 지침

```
- 실제 코드 수정 금지 (조사 + 보고만)
- 추정 금지 (실제 파일 확인)
- 솔직하게 작성 (자기 변호 금지)
- 대표님 시간 절약을 위해 핵심만
- 표로 정리 (가독성 우선)
- 짜집기 패턴 발견 시 명확히 지적
```

---

# 📊 최종 보고 형식

```
## 점검 + 재설계 보고

### 점검 결과 요약
- 발견된 문제: N건
- 치명적 문제: N건 (🔴)
- 정리 대상: N건 (🟡)

### 살릴 자산
- N개 화면 / N개 엔진

### 버릴 자산
- N개 파일 / N개 중복

### 새 설계 핵심
- MiniCAD 단독: [설계 요약]
- 견적마법사 단독: [설계 요약]
- OpenCrab 통합: [방식]
- 학습/진화: [메커니즘]

### 다음 단계
- Phase A 즉시 시작 가능
- 예상 기간: 8주
- 위험: 15%

### 산출 파일
- AUDIT_REPORT.md (점검 보고서)
- REDESIGN_v7.md (설계안)
```
