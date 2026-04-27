# ECOREAN BOC — Master Plan v5.0
최종 확정: 2026-04-27
이전 버전: v4.0 (2026-04-27)

---

## 변경 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| v1.0 | 2026-04 초 | 초기 설계 |
| v2.0 | 2026-04-20 | 5개 엔진 확정, TDD 원칙 추가 |
| v3.0 | 2026-04-23 | Neo4j Readiness Layer, 3D 온톨로지 |
| v3.5 | 2026-04-25 | §1~§24 전체 확정, 개발순서 고정 |
| v4.0 | 2026-04-27 | §50~§54 도면자산화 전략 추가 |
| **v5.0** | **2026-04-27** | **§55~§90 완전 통합본, 4부록 추가** |

---

## 1. 시스템 정의
BOC = Build Operation Center
견적→계약→발주→공정→현장→검수→하자→정산→피드백→DB업데이트 (Closed Loop)
인테리어 공사 전체 생애주기를 단일 플랫폼에서 운영

## 2. 핵심 철학
1. 사람이 아닌 시스템이 판단
2. 현장 데이터가 시스템을 성장시킴
3. 대표 승인 없이 Master DB 변경 불가
4. 모든 데이터가 Neo4j로 순환
5. 버그 없는 구조 (TDD 강제)
6. 100배 확장 가능 구조
7. 성장형 시스템 (모든 항목 CRUD 필수)

## 3. 기술 스택
프론트엔드: Electron + HTML 모듈
DB 운영: SQLite (로컬, 오프라인 작동)
DB 지식: Neo4j (온톨로지 Knowledge Graph)
상태공유: IPC (Electron BrowserView)
3D 시각화: Three.js r128 (CDN)
웹버전: PC앱 완성 후 포팅 (Next.js)
사진저장: PC 로컬 폴더 + 클라우드 백업

## 4. 파일 구조
```
ecorean-os/
├── shell/
│   └── boc-shell.html
├── modules-html/
│   ├── estimate.html
│   ├── projects.html
│   ├── presets.html
│   ├── reports.html
│   ├── approval.html
│   ├── dbmgr.html
│   ├── ontology.html
│   ├── aiengine.html
│   └── dashboard.html
├── shared/
│   ├── engine/boc-engine.js
│   ├── store/boc-state.js
│   ├── db/schema.sql
│   └── boc-design.css
├── electron/
│   ├── main.js
│   └── preload.js
└── docs/
    └── MASTER_PLAN.md
```

## 5. 탭 구성 (9개)
1. 견적 마법사
2. 프로젝트
3. 프리셋
4. 보고서
5. 승인함
6. DB관리
7. 온톨로지
8. AI엔진
9. 대시보드(CEO)

## 6. 탭별 상세 설계

### 탭1 견적 마법사
미니 CAD (Fabric.js):
- 공간 그리기 (드래그, 100mm 스냅)
- 공간별 스페이스 카드 (바닥재/벽재/천장/창호/도어)
- 창호·도어 규격 직접 입력
- 면적 자동 계산 (창호·도어 공제)
- 공간별 예상 견적 실시간
- CAD 기호 표시 (문호 방향), 치수선 자동
- 전체화면 모드 / PNG·DXF 내보내기
- PDF 도면 파싱 자동 입력

STEP0 컨셉 선택:
시공섹션(8개): 욕실/주방/거실침실/창호/전기/설비/전체/커스텀
컨셉(10개): 모던미니멀/클래식/럭셔리/북유럽/인더스트리얼/재팬젠/프렌치/한국모던/스마트홈/실용표준
선택 즉시 STEP1~5 기본값 자동입력, 커스텀 가능

STEP1 건물기본: 현장명/건물유형/연식/층수/엘리베이터/거주중(+10%)/지역/담당소장
STEP2 공간실측: 미니CAD 연동, 가로×세로×천장고(mm), 면적 자동계산 (오차율 ±2~3%)
STEP3 기존상태: 배관재질/보일러연식/분전반용량/방수하자/석면의심, RuleEngine 자동판단
STEP4 공사범위: 온톨로지 26개 자동적용, [자동]뱃지, DiagEngine 실시간경고
STEP5 자재등급: 전체패키지(표준1.0/고급1.3/프리미엄1.7), 브랜드별 실공급가
STEP6 견적결과: 공급가/도급/VAT포함최종, ㎡단가/평단가, 공정별 금액 테이블, 예상공기, 발주D-Day

### 탭2 프로젝트
상태: draft/estimated/contracted/in_progress/completed
하위메뉴: 견적서/공정표/공사일보/현금출납부/재무상태표/발주관리/완료보고

### 탭3 프리셋
시공섹션×컨셉 조합 저장/불러오기, CRUD 가능, 프리셋 선택→견적마법사 자동입력

### 탭4 보고서
고객용견적서/내부원가보고서/발주서/공정표PDF/정산서
보고서 템플릿 커스터마이징: 로고/도장/회사명/계좌/약관

### 탭5 승인함
DB단가보정요청/온톨로지규칙추가/새공정추가/브랜드단가수정
승인 즉시 Master DB 반영, Approval Log (불변기록)

### 탭6 DB관리
계단식 4단계 분류: 대분류→중분류→소분류→규격
관리항목: 공정DB(622개)/자재DB/브랜드DB/온톨로지규칙/인건비DB/지역계수/하자유형/외주업체
삭제원칙: status=disabled (실제삭제금지)

### 탭7 온톨로지
Three.js r128 3D 네트워크 그래프, 민들레 형태
관계선: AUTO(골드실선)/CONDITIONAL(주황점선)/FORCED(빨강실선)/PRECEDES(흰색화살표)/AFFECTS_COST(빨강파선)
인터랙션: 드래그 회전/휠 줌/클릭 연결노드만/더블클릭 중심/검색
최대 100개 노드 표시

### 탭8 AI엔진
학습데이터 게이지 (목표 500건): 0~49 수동/50~99 통계/100~499 XGBoost/500+ 딥러닝
크롤러 현황, 도면파싱 (PDF/DXF→STEP2 자동입력), 보정제안 [승인][거절]

### 탭9 대시보드(CEO)
오늘 현금흐름 / 진행현장 (수익률/위험도/공정률) / 이번달 KPI
미수금 D-Day / 승인대기 / RED ALERT (방수실패/발주초과/예산초과/미수금장기)

## 7. 계산 공식
```
공급가 = qty × (1+wr) × (lb×pm + mt×matMul)
도급   = 공급가 × 1.15
최종   = 도급   × 1.10  (VAT)

pm: 표준1.0 / 고급1.3 / 프리미엄1.7
양중: 5층+8% / 10층+15% / 15층+20% / 엘없음+30%
거주중: +10%
```

## 8. DB 스키마 (SQLite)

### 프로젝트
```
projects:       id/name/address/buildType/buildAge/floorLevel/hasElev/resid
                region/manager/status/contractAmount/startDate/endDate/conceptId/sections
spaces:         id/projectId/name/type/width/length/height/floor/wet/windows/doors
                floorMat/wallMat/ceilMat/cadX/cadY
estimates:      id/projectId/grade/gradeMul/selectedProcessIds/autoProcessIds
                totalSupply/contractAmount/finalAmount/duration/lines/validUntil
```

### 공사관련
```
daily_reports:  id/projectId/date/weather/completedProcesses/workers
                issues/defects/tomorrowPlan/progressRate/photos
cash_ledger:    id/projectId/date/type/category/subCategory/amount
                payMethod/vendor/memo/paid
purchase_orders:id/projectId/processId/itemName/quantity/unit
                unitPrice/totalPrice/vendor/leadDays/orderDate/deliveryDate/status
```

### DB관리
```
cost_items:     itemId/itemName/level1/level2/level3/level4/unit
                laborCost/materialCost/wasteRate/duration/formula
                spaceTypes/isRequired/dataStatus/status/updatedAt
ontology_rules: ruleId/trigger/linked/triggerType/condition
                confidenceLevel/status/approvedBy/approvedAt/source
approval_log:   id/requestType/targetId/action/beforeValue/afterValue
                reason/approvedBy/approvedAt
presets:        id/name/sections/conceptId/grade/gradeMul
                selectedProcessIds/materialOverrides/customizations
concepts:       conceptId/name/grade/gradeMul/priceMin/priceMax
                defaultProcessIds/materialDefaults/status
sections:       sectionId/name/processIds/description/status
```

### 도면 자산화 (v4.0+)
```
floorplan_library: patternId/building/area/bayType/direction/yearBuilt
                   source/confidence/verified/usageCount/createdAt/updatedAt
ai_crawl_log:   id/sourceUrl/capturedAt/buildingName/address
                parsedData/confidence/status/legalReview
```

## 9. IPC 통신 구조
```
모듈→Main: state:set / db:query / db:execute / kpi:update / tab:switch
Main→모듈: state:changed / db:result / kpi:refresh
```

## 10. 사용자 권한 (3단계)
```
Level1 대표:      전체제어 / 승인 / 설정 / CEO대시보드
Level2 BOC직원:   견적 / 프로젝트 / 재무 / DB수정요청 / 보고서
Level3 현장관리자: 담당현장 공사일보 / 공정표 / 발주요청

견적마법사 접근:
  내부(Level1~2): 원가+마진 전체
  소장(Level3):   조회만 (원가숨김)
  고객:           웹사이트 별도 경량버전 (최종금액만)
```

## 11. 백업 정책
- 로컬 자동백업: 일 1회
- 외부드라이브: 주 1회
- 클라우드: 실시간 (OneDrive/구글드라이브)
- 사진: PC 로컬폴더 + 클라우드 자동업로드

## 12. 다중 현장
현장별 독립 운영, 인력 충돌 감지+경고 (강제조정없음), 전사 통합 대시보드

## 13. 오프라인 작동
- 핵심: 완전 오프라인 (견적/공사일보/현금출납부/공정표)
- 부가: 인터넷 필요 (크롤러/Neo4j/클라우드백업)
- 동기화: 인터넷 연결시 자동

## 14. 고객 포털
URL 링크 공유 (비밀번호없음), 공사진행률+사진+공정표 공유, 웹버전 완성후 구현

## 15. 알림 시스템
앱내 알림 + 카카오톡
대상: 발주D-Day / 예산초과 / 미수금 / 승인요청 / 완료보고

## 16. 멀티 디바이스
클라우드 경유 실시간 동기화, 대표PC + 소장태블릿 + 직원PC, 오프라인 후 자동 동기화

## 17. 견적 유효기간
30일 고정, 발행시점 단가 고정, 만료 3일전 알림, 만료시 재계산 알림

## 18. 데이터 이전
BOC부터 새로 시작, 추후 Excel 임포트 기능 구조 준비

## 19. 연동 안전 보장
단일 진실 원천(SQLite), 이벤트 브로드캐스트, 검증 레이어, 버전관리+롤백

## 20. 성장형 CRUD
모든항목 CRUD 가능, 삭제=status:disabled, Master DB 변경=대표승인 필수, Approval Log 불변기록

## 21. Neo4j 순환 구조
모든 데이터→Neo4j→온톨로지학습→견적/공정/리스크/단가/이익률보정→(반복)

**노드:** Project/Space/Process/Material/Brand/Vendor/LaborCrew/DailyReport
CashLedger/Income/Expense/PurchaseOrder/PaymentMilestone/FinancialStatement
OntologyRule/LearningSuggestion/Defect/Risk/Case/MLModel/Franchise
FloorplanPattern/AiCrawlLog

**관계:** HAS_SPACE/HAS_PROCESS/USES_MATERIAL/REQUIRES_LABOR/SUPPLIED_BY
BRAND_OF/HAS_PAYMENT/NEEDS_INSPECTION/HAS_DEFECT/HAS_RISK
GENERATES_LEARNING/NEEDS_APPROVAL/UPDATES_MASTER_DB/PRECEDES
DEPENDS_ON/AFFECTS_COST/AFFECTS_SCHEDULE/TRIGGERS/LEARNED_FROM
CRAWLED_FROM/MATCHES_PATTERN/DERIVED_FROM

## 22. AI 성장 구조
- 크롤링: 표준품셈/노임단가/자재물가/시공사례
- 도면파싱: PDF/DXF/CAD→면적자동
- 공사일보→패턴감지→온톨로지규칙제안
- ML: 0~49수동/50~99통계/100~499XGBoost/500+딥러닝
- 고급AI: Causal+ActiveLearning+Federated
- 도면자산화: Phase 0~4 단계 진화

## 23. 개발 원칙
1. 설계확정→테스트작성→코딩→검증→커밋
2. 버그있는코드 커밋절대금지
3. TDD강제 / 발견즉시수정
4. 코드보다 설계먼저
5. 디자인은 맨 마지막

## 24. 개발 순서
```
1.  schema.sql
2.  electron/main.js (IPC+SQLite)
3.  shared/engine 테스트 보강
4.  estimate.html
5.  projects.html
6.  presets.html
7.  reports.html
8.  approval.html
9.  dbmgr.html
10. ontology.html
11. aiengine.html
12. dashboard.html
13. 디자인 적용 (shared/boc-design.css)
14. 웹버전 포팅 (Next.js)
15. 현장 투입
```

## 25. 입력 표준화 (InputNormalizer)
```typescript
InputNormalizer {
  normalizeArea(raw: string): number         // "33평" → 109.09
  normalizeDate(raw: string): string         // "다음주월" → "2026-05-04"
  normalizeMoney(raw: string): number        // "5천만" → 50000000
  normalizeAddress(raw: string): AddressObj  // 도로명/지번 통합
  normalizeProcess(raw: string): ProcessId   // 유사어 매핑
}
```

## 26. STEP별 데이터 명세
```
STEP0: { sectionIds[], conceptId }
STEP1: { name, buildType, buildAge, floor, hasElev, resid, region, manager }
STEP2: { spaces[]: { name, type, w, h, ceilH, floorMat, wallMat, ceilMat, windows[], doors[] } }
STEP3: { pipeType, boilerAge, panelCap, isFlat, hasLeak, asbestos }
STEP4: { processIds[], autoIds[], risks[] }
STEP5: { grade, gradeMul, brandOverrides{} }
STEP6: { totalSupply, contract, final, duration, lines[], validUntil }
```

## 27. 견적→공정표→발주 자동 흐름
```
견적 확정
  → ScheduleEngine.buildGantt(lines, startDate)
  → Gantt{tasks[], criticalPath[], duration}
  → 각 task에서 leadDays 역산 → orderDate
  → purchase_orders 자동 생성
  → D-Day 알림 스케줄 등록
```

## 28. DB 라이프사이클
```
생성:  INSERT + createdAt + status='active'
수정:  UPDATE + updatedAt (승인 필요 항목은 approval_log 선행)
삭제:  UPDATE SET status='disabled' + updatedAt (실제 DELETE 금지)
복원:  UPDATE SET status='active'
조회:  WHERE status='active' (기본값)
감사:  approval_log 전체 이력 조회
```

## 29. 완료보고 학습 파이프라인
```
완료보고 입력
  → 예상 vs 실제 오차 계산
  → 오차 > 임계치 → 보정제안 생성 (approval_log)
  → 대표 승인
  → cost_items 업데이트
  → OntologyEngine 재학습
  → ML 학습 데이터 추가
  → 다음 견적 정확도 향상
```

## 30. 동적 패턴 감지 엔진
```
공사일보 N건 누적
  → PatternDetector.scan(dailyReports)
  → 빈도 높은 공정 조합 추출
  → 기존 온톨로지와 비교
  → 신규 패턴 → 규칙 후보 생성
  → 대표 검토 → 승인 시 OntologyEngine 반영
```

## 31. CEO 의사결정 지원
```
대시보드 RED ALERT 트리거:
  수익률 < 5%
  미수금 > 계약금 70%
  종료일 < 오늘 (미완료)
  잔여공기 < 7일 && 공정률 < 80%

알림 채널: 앱내 + 카카오톡
자동 행동: 독촉 메시지 초안 생성
```

## 32. 4단계 무결성 검증
```
Layer 1 입력 검증:    타입/범위/필수값 확인
Layer 2 비즈니스 검증: 논리 일관성 (예: 착공 > 계약)
Layer 3 DB 검증:      외래키/유니크 제약
Layer 4 감사 검증:    approval_log 불변성 확인
```

## 33. 견적 파이프라인 4단계
```
Stage 1 수집:    사용자 입력 → InputNormalizer → ValidatedInput
Stage 2 계산:    CalcEngine.calculate(input) → EstimateLines[]
Stage 3 강화:    OntologyEngine.applyRules(lines) → EnrichedLines[]
Stage 4 출력:    ReportGenerator.generate(lines) → {pdf, json, preview}
```

## 34. 도면 파싱 어댑터 패턴
```typescript
interface FloorplanAdapter {
  name: string
  fromAddress(address: string): Promise<FloorplanData>
  fromImage(buf: Buffer): Promise<FloorplanData>
  fromPDF(buf: Buffer): Promise<FloorplanData>
  health(): Promise<boolean>
}

// 구현체 (Phase별 순차 도입)
class ManualAdapter     implements FloorplanAdapter  // Phase 0 (지금)
class TogalAdapter      implements FloorplanAdapter  // Phase 1
class ClaudeVisionAdapter implements FloorplanAdapter // Phase 1
class HybridAdapter     implements FloorplanAdapter  // Phase 2+
```

## 35. AI 추출값 vs 사람 보정값
```
floorplan_data {
  ai_area:    number   // AI 추출 (자동)
  human_area: number   // 현장 실측 (사람)
  final_area: number   // human_area ?? ai_area
  confidence: number   // AI 신뢰도 0~1
  source:     string   // 'ai' | 'human' | 'hybrid'
}
```

## 36. 도면 파싱 정확도 게이트
```
confidence < 0.5  → 거부, 사용자 수동 입력 요청
confidence 0.5~0.8 → 경고 표시, 확인 요청
confidence > 0.8  → 자동 적용
```

## 37. 단가 데이터 상태 관리
```
dataStatus:
  'official'   → 표준품셈/노임단가 (공식)
  'crawled'    → 크롤러 자동수집
  'corrected'  → 현장 실측 보정 (승인 완료)
  'estimated'  → 추정값 (검증 필요)
  'deprecated' → 구버전 (참조용)
```

## 38. ECOREAN 진짜 해자 보호
1. **단가 DB**: 현장 실측 누적 → 시장 평균보다 정확
2. **온톨로지**: 공사 경험 자동 학습 → 규칙 지속 성장
3. **도면 자산**: 시공 누적 + AI크롤 → 한국 1위
4. **고객 데이터**: 이전 이력 = 재계약 경쟁력
5. **AI 보정**: 오차율 지속 감소 → 정확도 독보적

## 39. 시장 경쟁사 분석

| 경쟁사 | 강점 | 약점 |
|--------|------|------|
| 오늘의집 | 브랜드/소비자 | 시공 관리 없음 |
| 인테리어말 | B2B 견적 | 단순 기능 |
| 아키스케치 | 도면 | 시공 연결 없음 |
| **ECOREAN** | **전 주기 통합 + AI** | **초기 데이터** |

## 40. 한국 도면 자체 학습 로드맵
```
0개월  → 수동 입력
3개월  → 시공 누적 30건
6개월  → 외부 API 연동 + 표준 패턴 50건
12개월 → AI크롤 500건 + 자체 200건
24개월 → 자체 5,000건
36개월 → 자체 20,000건 (한국 1위)
```

## 41. 평면도 열람 시스템 (4계층)
```
1계층: 사용자 직접 입력 (지금)
2계층: 도면 업로드 파싱 (지금)
3계층: 주소 기반 자동 조회 (Phase 1)
4계층: AI 자동 크롤링 (Phase 3)
```

## 42. 도면 파싱 → STEP2 데이터 매핑
```
평면도 파싱 결과
  totalArea  → STEP1.area
  rooms[]    → STEP2.spaces[]
    type     → space.type
    w/h      → space.width/length
    windows  → space.windows[]
    doors    → space.doors[]
  confidence → UI 경고 표시
```

## 43. 승인 게이트 매트릭스

| 변경 유형 | 승인자 | 즉시반영 | 로그 |
|-----------|--------|----------|------|
| 단가 ±5% 이하 | Level2 | O | O |
| 단가 ±5% 초과 | Level1 | O | O |
| 온톨로지 규칙 추가 | Level1 | O | O |
| 공정 신규 추가 | Level1 | O | O |
| 브랜드 단가 | Level2 | O | O |
| DB 스키마 변경 | Level1 | X (배포) | O |

## 44. 모듈 간 동기화 정책
```
AppState 변경 시:
  1. IPC broadcast (state:changed)
  2. 각 모듈 onTabSwitch 수신
  3. 필요 모듈만 re-render
  4. DB 변경은 approval_log 후 broadcast

우선순위:
  긴급: RED ALERT → 즉시 push
  일반: KPI 업데이트 → 5분 주기
  배치: 보고서/통계 → 요청시
```

## 45. 견적서 버전 관리
```
estimates 테이블:
  version:     number (1, 2, 3...)
  parentId:    string | null (수정 이전 견적)
  validUntil:  string (발행일+30일)
  frozenPrices: JSON (발행시점 단가 스냅샷)
  status:      'draft' | 'issued' | 'expired' | 'accepted'

규칙:
  발행 후 단가 변경 시 frozenPrices 유지
  만료 후 재계산 시 version+1
  원본 삭제 금지
```

## 46. 권한 시스템 강화
```
JWT 토큰 구조:
  { userId, level, name, exp, iat }

권한 체크 위치:
  IPC 수신 시 (main.js)
  DB 쓰기 전 (approval gate)
  UI 렌더링 (메뉴/버튼 표시)

세션 만료: 8시간 (업무일 기준)
재인증: 비밀번호 재입력
```

## 47. 프로젝트 단계 전환 명세
```
draft → estimated:    견적 저장 시 자동
estimated → contracted: 계약금 입력 시
contracted → in_progress: 착공일 도래 또는 수동
in_progress → completed:  완료보고 제출 시
any → cancelled:     수동 (Level1만)

전환 시 자동 액션:
  contracted:    공정표 생성, 발주 D-Day 등록
  in_progress:   공사일보 템플릿 활성화
  completed:     학습 파이프라인 트리거
```

## 48. 외부 API 위험 관리
```
위험 1 서비스 종료:
  대응: Adapter 패턴 (교체 용이)
  예비: 대체 API 목록 유지

위험 2 비용 급증:
  대응: L1/L2/L3 캐싱으로 80% 절감
  예비: 월 한도 알림 + 자동 차단

위험 3 정확도 저하:
  대응: confidence gate (0.8 이상만 자동)
  예비: 사람 검토 fallback

위험 4 법적 리스크:
  대응: §54 법적 준수 가이드라인 준수
  예비: 법무 자문 정기 진행
```

## 49. 시스템 진화 로드맵
```
Phase 0 (지금~3개월):  1인 운영, SQLite, 로컬
Phase 1 (3~6개월):     직원 합류, 외부 API, 클라우드 백업
Phase 2 (6~12개월):    팀 운영, 자체 도면 라이브러리 시작
Phase 3 (1~2년):       AI 크롤러, Neo4j Aura, 프랜차이즈 준비
Phase 4 (2~3년):       한국 1위 인테리어 플랫폼 목표
```

---

## 50. 도면 시스템 단계별 진화

### Phase 0 (지금 ~ 3개월): 코딩 우선
- 도면 모듈 미구현
- 미니 CAD 수동 입력 중심
- 시공 현장 도면 자동 저장
- 외부 API 어댑터 인터페이스만 준비

### Phase 1 (3~6개월): 외부 API 연동
- TogalAdapter / ClaudeVisionAdapter 구현
- 주소 → 외부 API 호출 → 결과 저장
- 캐싱 시작 (L1/L2/L3)

### Phase 2 (6~12개월): 자체 라이브러리 시작
- 표준 패턴 매칭 시스템
- 시공 현장 누적 가속
- 외부 API + 자체 DB 하이브리드

### Phase 3 (1~2년): AI 크롤러 도입
- 백그라운드 자동 크롤링
- 부동산 사이트 모니터링
- Claude Vision 자동 추출
- 자체 형식 변환, 라이브러리 자동 확장

### Phase 4 (2~3년): 자체 자산 우위
- 자체 DB 80% 활용
- 외부 API 의존 최소
- 한국 1위 도면 자산

### 어댑터 인터페이스 (Phase 0 준비)
```typescript
interface FloorplanAdapter {
  fromAddress(address: string): Promise<FloorplanData>
  fromImage(imageBuffer: Buffer): Promise<FloorplanData>
  fromPDF(pdfBuffer: Buffer): Promise<FloorplanData>
}
interface FloorplanData {
  totalArea: number
  rooms: RoomData[]
  confidence: number
  source: string
  cachedAt: string
}
```

---

## 51. AI 크롤링 시스템 (장기 설계)

### 동작 방식
1. 일일 자동 실행 (스케줄러)
2. 부동산 사이트 검색 (네이버부동산/호갱노노/직방/다방)
3. 새 평면도 발견 → Claude Vision API 호출
4. 평면도 → 자체 형식 JSON 변환
5. 자동 검증 (신뢰도 체크) → 라이브러리 등록
6. 출처 메타데이터 저장

### 법적 준수
- robots.txt 준수, API rate limit 준수
- 자체 형식 변환 (디자인 카피 아님)
- 사실 정보만 추출 (면적/방수), 원본 이미지 저장 금지

### 기술 스택
Puppeteer (자동화) / Claude Vision API / 자체 검증 엔진 / 자동 분류 시스템

### 안전장치
출처별 호출 한도 / 비용 한도 알림 / 법적 검토 게이트 / 자동 차단 시스템

---

## 52. 캐싱 정책 강화

### 3단계 캐싱

| 레벨 | 유효시간 | 용도 | 크기 |
|------|----------|------|------|
| L1 메모리 | 1시간 | 즉시 재접근 | 100MB |
| L2 디스크 | 7일 | 세션 간 공유 | 1GB |
| L3 자체DB | 영구 | 보정된 데이터 | 무제한 |

### 우선순위
```
요청 → L1 → L2 → L3 → 외부 API → 사용자 입력
```

### 비용 효과

| 구분 | API 호출 | 월 비용(예시) |
|------|----------|--------------|
| 캐싱 없음 | 같은 주소 5회 = 5회 | 100만원 |
| 캐싱 적용 | 같은 주소 5회 = 1회 | 20만원 |
| **절감** | | **80% 절감** |

---

## 53. 도면 자산화 로드맵

| 시점 | 건수 | 구성 |
|------|------|------|
| 0개월 | 0건 | — |
| 3개월 | 30건 | 시공 누적 |
| 6개월 | 110건 | 시공 60 + 표준 50 |
| 1년 | 900건 | 시공 200 + 표준 200 + AI크롤 500 |
| 2년 | 5,000건+ | 전방위 수집 |
| 3년 | **20,000건+** | **한국 1위** |

### 라이브러리 구조
```
floorplan_library/
├── apt/   (24p_3bay / 30p_3bay / 34p_4bay / 40p_tower)
├── villa/
├── house/
└── office/
```

---

## 54. 법적 준수 가이드라인

### 한국 저작권법 분석

| 유형 | 저작물성 | 위험도 |
|------|----------|--------|
| 일반 아파트 평면도 | 부정 | 안전 |
| 독창적 건축 설계 | 인정 | 위험 |
| 워터마크/표시 도면 | 명확한 권리 | 위험 |

### 안전한 활동
✅ 자체 도면 제작 / AI로 새로 그리기 / 사용자 동의 도면 / 시공 현장 도면

### 위험한 활동
❌ 다른 사이트 도면 직접 다운로드 / 워터마크 도면 / 라이선스 위반 / DB 권리 침해

### AI 크롤링 안전 원칙
1. 사실 정보만 추출 (면적/방수)
2. 자체 형식으로 변환
3. 원본 이미지 미저장
4. 출처 메타데이터만 보존
5. 디자인 카피 금지
6. 법적 검토 정기 시행

---

## 55. 보안·개인정보 보호

### 저장 보안
- SQLite 암호화: SQLCipher 적용 (AES-256)
- 백업 파일 암호화: 동일 키 사용
- 사진 파일: 별도 암호화 (Phase 1)

### 사용자 인증
```
인증 방식: JWT (로컬 발급)
토큰 만료: 8시간 (업무일 기준)
비밀번호:  bcrypt (salt rounds 12)
세션 잠금: 30분 비활동 시 자동 잠금
```

### 접근 로그
```
access_log: userId / action / targetTable / targetId
            timestamp / ipAddress / result
보존 기간:  3년 (법적 의무)
```

### 데이터 마스킹 (권한별)
```
Level3 (소장): 원가/마진 필드 → "***"
고객 포털:     계약금액만 표시, 단가 숨김
```

### 정기 보안 감사
- 월 1회: 접근 로그 이상 패턴 검토
- 분기 1회: 취약점 점검
- 연 1회: 외부 보안 감사 (Phase 2+)

---

## 56. 재해 복구 전략

### 복구 목표
```
RTO (복구 목표 시간): 1시간
RPO (복구 목표 시점): 1시간 이내 데이터
```

### 백업 무결성 자동 검증
```
매일 자동:
  1. 백업 파일 해시 확인
  2. 백업 열기 테스트
  3. 핵심 테이블 레코드 수 확인
  4. 이상 감지 시 즉시 알림
```

### 정기 복구 테스트 (월 1회)
```
테스트 절차:
  1. 백업 파일 → 임시 DB 복원
  2. 핵심 기능 동작 확인
  3. 결과 기록 (복구성공/실패/시간)
```

### 지리적 분산 백업
```
로컬:  C드라이브 (즉시)
외장:  외부 드라이브 (주간)
클라우드: OneDrive / Google Drive (실시간)
원격:  NAS (Phase 1+)
```

### 재해 복구 매뉴얼
1. 장애 감지 → 알림 수신
2. 최신 백업 파일 확인
3. 새 환경에 앱 설치
4. 백업 복원 실행
5. 데이터 무결성 확인
6. 정상 운영 재개

---

## 57. 성능·확장성 한계

### SQLite 임계점
```
프로젝트 수:  5,000건 (쿼리 속도 저하 시작)
daily_reports: 50,000건 (인덱스 필수)
cash_ledger:   100,000건 (파티셔닝 고려)
```

### 자동 모니터링
```
모니터링 항목:
  DB 파일 크기 > 500MB → 경고
  쿼리 응답 > 200ms    → 최적화 검토
  메모리 사용 > 80%    → 알림
  디스크 여유 < 10GB   → 경고
```

### PostgreSQL 전환 트리거
```
다음 중 하나 충족 시:
  동시 접속자 3명+
  DB 파일 > 2GB
  쿼리 응답 > 500ms (최적화 후)
  프랜차이즈 확장 시작
```

---

## 58. 사용자 교육·도움말

### 인앱 가이드 (첫 사용)
```
첫 실행 시:
  1. 환영 화면 (시스템 소개)
  2. 첫 프로젝트 생성 가이드
  3. 견적 마법사 튜토리얼
  4. 공사일보 입력 연습

완료 시: 가이드 숨김 (재활성화 가능)
```

### 도움말 시스템
- F1: 현재 화면 도움말
- 툴팁: 복잡한 필드에 (?) 아이콘
- 동영상: YouTube 링크 (Phase 1)
- 매뉴얼 PDF: 설치 시 포함

### 단축키

| 단축키 | 기능 |
|--------|------|
| Ctrl+N | 새 프로젝트 |
| Ctrl+E | 견적 마법사 |
| Ctrl+S | 저장 |
| Ctrl+P | 인쇄/PDF |
| Ctrl+F | 검색 |
| F5 | 새로고침 |

### 검색 기능
- 전역 검색: Ctrl+K
- 대상: 프로젝트명/현장명/고객명/공정명
- 결과: 모듈 직접 이동

---

## 59. 데이터 마이그레이션

### 인터페이스 준비 (Phase 0)
```typescript
interface MigrationAdapter {
  fromExcel(path: string): Promise<MigrationResult>
  fromCSV(path: string): Promise<MigrationResult>
  toPostgres(target: DBConfig): Promise<MigrationResult>
  validate(): Promise<ValidationReport>
}
```

### SQLite → PostgreSQL 전환 전략
```
1단계: 스키마 검증 (자동)
2단계: 데이터 복사 (배치)
3단계: 무결성 검증 (자동)
4단계: 읽기 테스트 (수동)
5단계: 트래픽 전환 (Blue-Green)
6단계: SQLite 백업 보존 (90일)
```

### 무중단 전환
```
Blue:  기존 SQLite 운영
Green: PostgreSQL 준비
전환:  DNS/Config 변경만 (30초)
롤백:  설정 복원 (30초)
```

---

## 60. 외주업체·협력사 통합

### 단계별 확장

| 단계 | 내용 | 시점 |
|------|------|------|
| 1단계 | DB 등록 (이름/연락처/단가) | 지금 |
| 2단계 | 협력사 전용 포털 | Phase 1 |
| 3단계 | 자동 발주 메시지 발송 | Phase 1 |
| 4단계 | 마켓플레이스 (입찰) | Phase 3+ |

### 협력사 DB 구조
```
vendors: id/name/type/contact/region
         specialty[]/rating/activeProjects
         paymentTerms/bankInfo/status
```

---

## 61. 고객 경험 강화

### 알림 강화
```
카카오 알림톡:
  - 공사 착공 알림
  - 주요 공정 완료
  - 사진 첨부 (주간 보고)
  - 잔금 청구 안내
  - 하자 조치 결과
```

### 고객 포털 (Phase 1)
```
URL: ecorean.kr/project/{uuid}
내용: 공사 진행률 / 사진 타임라인 / 공정표 / 다음 공정
권한: 조회만 (수정 불가)
```

### 웹사이트 통합 (Phase 2)
```
ecorean.kr:
  - 회사 소개
  - 포트폴리오 (완료 프로젝트)
  - 견적 신청 (경량 버전)
  - 고객 포털 로그인
```

---

## 62. AI 학습 품질 보증

### 입력 시점 이상치 감지
```
이상치 기준:
  단가: 평균 ±30% 초과
  면적: 입력값이 건물 가능 범위 초과
  공기: 공정 대비 비현실적 일정

처리: 경고 표시 + 확인 요청 (자동 거부 아님)
```

### 학습 데이터 검수
```
학습 전 자동 필터:
  완료 프로젝트만 포함
  이상치 제거 (±2σ)
  데이터 완전성 80% 이상

학습 후 검증:
  holdout set 20%
  이전 모델 대비 성능 비교
```

### 모델 성능 모니터링
```
KPI:
  견적 오차율 < 5% (목표)
  온톨로지 적중률 > 90%
  사용자 거절률 < 10%
```

### 잘못된 학습 자동 롤백
```
트리거:
  오차율 > 15% (이전 대비)
  사용자 거절률 > 30% 급증
  특정 공정 단가 50%+ 변동

처리:
  이전 버전 자동 복원
  이상 데이터 격리
  담당자 알림
```

---

## 63. 법규 변경 대응

### 크롤러 통합
```
법규 크롤러 대상:
  국토교통부 고시 (노임단가)
  표준품셈 개정 (한국건설기술연구원)
  지자체 건축 조례
  안전 규정 변경
```

### 변경 감지 시스템
```
감지 주기: 월 1회 (자동)
감지 방법: 해시 비교 (문서 변경 여부)
알림:      Level1 즉시 알림
```

### 영향 분석 자동화
```
변경 감지 시:
  1. 영향 받는 cost_items 목록 추출
  2. 변경 전/후 단가 비교 보고서
  3. 업데이트 승인 요청 생성
  4. 승인 후 일괄 반영
```

---

## 64. 실패 사례 학습

### 실패 분류 자동화
```
실패 유형:
  COST_OVERRUN    단가 초과 (N%)
  SCHEDULE_DELAY  공기 지연 (N일)
  DEFECT          하자 발생
  PAYMENT_DELAY   수금 지연
  SCOPE_CHANGE    공사 범위 변경
  DESIGN_ERROR    설계 오류
```

### 손실 패턴 분석
```
패턴 감지:
  특정 공정 조합 → 자주 단가 초과
  특정 건물 유형 → 공기 지연 빈번
  특정 지역 → 수금 지연 패턴

분석 결과:
  DiagEngine 경고 규칙 자동 생성
  견적 시 사전 경고 표시
```

### 사전 경고 시스템
```
견적 STEP4 단계에서:
  유사 조건 실패 사례 N건 발견 시
  → "유사 현장 XX% 비용 초과 이력"
  → 마진 추가 권장 알림
```

---

## 65. Voice First 인터페이스

### Whisper API 연동 (Phase 1)
```typescript
VoiceInput {
  record(): Promise<AudioBuffer>
  transcribe(audio: AudioBuffer): Promise<string>
  parseCommand(text: string): Command
  execute(cmd: Command): void
}
```

### 공사일보 음성 입력
```
사용자: "오늘 타일 작업 완료, 인원 3명, 특이사항 없음"
시스템:
  → completedProcesses: ['타일']
  → workers: [{ type:'타일공', count:3 }]
  → issues: ''
  → 확인 화면 표시
```

### 명령어 음성 실행
```
"새 프로젝트 만들어" → switchTab('estimate')
"대시보드 열어"      → switchTab('dashboard')
"오늘 일보 저장해"   → saveDailyReport()
"김철수 현장 보여줘" → filterProject('김철수')
```

---

## 66. 카메라 자동 측정 (AR/LiDAR)

### 도입 전략
```
Phase 0: 수동 입력 (지금)
Phase 1: 사진 기반 추정 (Claude Vision)
Phase 2: ARKit/ARCore 연동 (모바일 앱)
Phase 3: LiDAR 스캔 (iPad Pro 등)
```

### Phase 2 ARKit/ARCore
```
기능:
  - 카메라로 공간 스캔
  - 자동 면적 계산
  - 3D 포인트 클라우드 생성
  - STEP2 자동 입력

정확도 목표: ±3%
```

---

## 67. 블록체인 견적서

### 단계별 도입
```
지금:   PDF 전자서명 (Adobe Sign / 카카오)
2년 후: 블록체인 해시 등록 (Ethereum/Klaytn)
3년 후: NFT 견적서 (고가 프로젝트)
```

### 위변조 방지
```
지금 구현:
  1. 견적서 생성 시 SHA-256 해시
  2. hash → estimates.documentHash 저장
  3. 검증: 파일 해시 vs DB 해시 비교
  4. 위변조 감지 시 즉시 알림
```

---

## 68. 가상 견적 미팅 (3D)

### 단계별 구현
```
Phase 0 (지금):
  - Three.js 단순 3D 공간 시각화
  - 공간별 색상 구분
  - 공정별 가격 오버레이

Phase 2:
  - 정밀 3D (자재 텍스처)
  - 고객 공유 링크
  - 실시간 견적 변경

Phase 3:
  - VR/AR 지원
  - 자재 실물 매핑
```

---

## 69. 협력사 마켓플레이스

### 도입 결정
- **현재: 보류** (2년 후 재검토)
- 이유: 핵심 기능 완성 후 부가 사업 검토
- 조건: 매출 N억 달성 + 프랜차이즈 확장 시

### 마켓플레이스 구조 (예비 설계)
```
구매자:  ECOREAN 인테리어사
판매자:  자재업체/노무업체/장비업체
수수료:  거래액의 2~5%
검증:    ECOREAN 품질 인증 제도
```

---

## 70. 시공 영상 AI 분석

### 단계별 도입
```
Phase 1: Claude Vision API
  - 공사일보 사진 자동 분류
  - 공정 완료 자동 감지
  - 위험 상황 감지 (기본)

Phase 2: 안전 위반 감지
  - 안전모 미착용 감지
  - 위험 구역 침입 감지
  - 실시간 알림

Phase 3: 품질 판정
  - 시공 품질 AI 평가
  - 하자 예측
  - 준공 검사 지원
```

---

## 71. 디지털 트윈

### 단계별 구현
```
Phase 0 (지금): 단순 디지털 기록
  - 공사일보 + 사진 타임라인
  - 공정별 완료 이력
  - 자재 투입 기록

Phase 2: 3D 디지털 기록
  - 공간별 시공 이력
  - 자재 교체 이력
  - 하자 위치 3D 마킹

Phase 3: 정밀 디지털 트윈
  - 건물 전체 3D 모델
  - 설비 배관 위치 기록
  - 유지보수 예측 연동
```

### 평생 고객 락인
```
완공 후:
  - 건물 디지털 트윈 보관
  - 5년 후 재시공 필요 항목 예측 알림
  - "ECOREAN이 시공한 건물" → 재계약 우선
  - 이전 이력 = 재견적 50% 단축
```

---

## 72. AI 자동 문서 생성

### Claude API 활용
```typescript
DocumentGenerator {
  generateEstimate(project: Project): Promise<EstimatePDF>
  generateContract(project: Project): Promise<ContractPDF>
  generateInvoice(project: Project, amount: number): Promise<InvoicePDF>
  generateSpec(project: Project): Promise<SpecPDF>
  generateReport(project: Project): Promise<ReportPDF>
}
```

### 자동 생성 범위

| 문서 | 자동화율 | 사람 검토 |
|------|----------|-----------|
| 견적서 | 100% | 선택 |
| 계약서 | 80% | 필수 |
| 청구서 | 100% | 선택 |
| 시방서 | 70% | 권장 |
| 완료보고 | 90% | 선택 |

---

## 73. 스마트 발주 자동화

### 단계별 자동화

| 단계 | 기능 | 시점 |
|------|------|------|
| 1단계 | D-Day 알림 | 지금 |
| 2단계 | 추천 업체 제안 | Phase 1 |
| 3단계 | 자동 메시지 발송 | Phase 1 |
| 4단계 | AI 가격 협상 | Phase 2 |

### 자동 발주 메시지 (Phase 1)
```
수신: 협력사 연락처
내용:
  안녕하세요, [회사명]입니다.
  [현장명] 현장 [자재명] 발주 요청드립니다.
  수량: [N]개, 납기: [날짜], 현장: [주소]
  견적 회신 부탁드립니다.

발송: 카카오톡 / 문자 / 이메일 선택
```

---

## 74. 예측 유지보수

### 완료 데이터 기반 분석
```
수명 예측 모델:
  도배:     5~7년
  장판:     7~10년
  욕실 방수: 10~15년
  보일러:   15~20년
  창호:     15~20년
  전기 배선: 20~30년
```

### 5년 후 점검 알림
```
완공일 기준 자동 알림:
  2년 후: "도배 상태 점검 권장"
  5년 후: "전체 점검 권장"
  10년 후: "방수/창호 교체 검토"

알림 채널: 카카오 알림톡
```

### 재계약 영업 자동화
```
알림 수신 시:
  고객명 + 이전 시공 이력
  예상 재시공 범위 + 견적 (자동 생성)
  담당자 배정 자동화
  상담 예약 링크 첨부
```

---

## 75. 블록 크기 규칙

### 파일 크기 기준

| 상태 | 줄 수 | 처리 |
|------|-------|------|
| 정상 | 1,500 ~ 3,000 | 유지 |
| 경고 | 3,001 ~ 5,000 | 분할 계획 |
| 위험 | 5,001 ~ 7,500 | 분할 준비 |
| 금지 | 7,501+ | 즉시 분할 |

### 분할 원칙
- 의미 단위로 분할 (기능 경계 기준)
- 인터페이스로만 연결 (직접 참조 금지)
- 테스트 코드는 별도 블록

---

## 76. 표준 블록 패턴

### 4블록 분리 원칙
```
입력 블록 (1,500줄):
  - 사용자 입력 수집
  - 유효성 검사
  - 정규화

계산 블록 (2,000줄):
  - 핵심 로직
  - 엔진 호출
  - 결과 계산

결과 블록 (1,500줄):
  - 결과 가공
  - 포맷팅
  - 캐싱

출력 블록 (1,500줄):
  - UI 렌더링
  - PDF 생성
  - API 응답
```

---

## 77. 4계층 아키텍처

### 계층 구조
```
Layer 4 부가 블록 (옵션)
  AI문서생성 / Voice First / 영상분석 / AR측정
        ↓
Layer 3 모듈 블록 (9개 탭)
  estimate / projects / presets / reports
  approval / dbmgr / ontology / aiengine / dashboard
        ↓
Layer 2 엔진 블록
  CalcEngine / OntologyEngine / DiagEngine
  ScheduleEngine / FinanceEngine
        ↓
Layer 1 기초 블록
  DB / 보안 / 백업 / 인증 / 로깅
```

### 계층 규칙
- 상위→하위 의존만 허용
- 동일 계층 간 직접 의존 금지 (IPC/이벤트만)
- 하위→상위 콜백은 인터페이스로만

---

## 78. 행렬 확장 프로세스

### 분할 트리거
```
파일 7,500줄 도달 시:
  1. 의미 단위 분석 (기능 경계 추출)
  2. 4분할 계획 수립
  3. 인터페이스 먼저 정의
  4. 각 블록 독립 구현
  5. 통합 테스트 통과 확인
  6. 원본 파일 삭제
```

### 분할 후 구조
```
before: engine.js (7,500줄)
after:
  engine-input.js    (1,500줄)
  engine-calc.js     (2,000줄)
  engine-result.js   (1,500줄)
  engine-output.js   (1,500줄)
  engine-index.js    (200줄, 조합기)
```

---

## 79. 상위 적층 패턴

### 조합기 원칙
```typescript
// engine-index.js (조합기)
import { normalize }  from './engine-input'
import { calculate }  from './engine-calc'
import { format }     from './engine-result'
import { render }     from './engine-output'

export function process(raw: RawInput): Output {
  const input  = normalize(raw)
  const result = calculate(input)
  const formatted = format(result)
  return render(formatted)
}
```

### 금지 패턴
```typescript
// ❌ 금지: 블록 간 직접 import
// engine-output.js
import { calculate } from './engine-calc'  // 금지!

// ✅ 허용: 조합기를 통한 연결만
```

---

## 80. 인터페이스 표준

### TypeScript 강제
```typescript
// 모든 블록 진입/출구에 타입 명세 필수
interface BlockInput<T> {
  data: T
  requestId: string
  timestamp: string
  userId?: string
}

interface BlockOutput<T> {
  data: T
  requestId: string
  duration: number
  errors: BlockError[]
}

interface BlockError {
  code: string
  message: string
  field?: string
}
```

### 인터페이스 버전 관리
```
인터페이스 변경 시:
  v1 → v2: 신구 버전 동시 지원 (3개월)
  v2 안정화 후 v1 deprecated
  deprecated 후 6개월 → 제거
```

---

## 81. 의존성 관리

### 단방향 의존성
```
허용:  Layer N → Layer N-1
금지:  Layer N → Layer N+1 (역방향)
금지:  Layer N → Layer N   (순환)
```

### 순환 의존성 차단
```
자동 검사: 빌드 시 순환 감지
도구: madge (dependency-cruiser)
실패 조건: 순환 발견 시 빌드 실패
```

### 의존성 주입 패턴
```typescript
// 직접 import 대신 주입
class CalcEngine {
  constructor(
    private db: DatabaseAdapter,
    private ontology: OntologyAdapter,
  ) {}
}
// 테스트 시 Mock 주입 가능
```

---

## 82. 블록 통신 최적화

### 같은 프로세스: 함수 직접 호출
```typescript
// ✅ 최고 성능: 직접 호출
const result = CalcEngine.calculate(input)
```

### 메모리 공유: 불변 객체
```typescript
// ✅ 공유 상태는 항상 불변
const shared = Object.freeze({ rates, rules })
// ❌ 금지: 직접 변경
shared.rates.push(...)  // 에러 발생
```

### 캐싱 전략
```
L1: 함수 메모이제이션 (순수 함수만)
L2: AppState 캐시 (5분 TTL)
L3: SQLite 쿼리 결과 캐시 (변경시 무효)
```

---

## 83. 디버깅 시스템

### 통합 로깅 (Trace ID)
```typescript
interface LogEntry {
  traceId: string      // 요청 추적
  blockId: string      // 발생 블록
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: unknown
  timestamp: string
  duration?: number
}
```

### 블록 진입/출구 자동 로깅
```typescript
// 데코레이터로 자동 적용
@logBlock('CalcEngine.calculate')
function calculate(input: Input): Output {
  // 로깅 자동: 진입, 출구, 소요시간, 에러
}
```

### 시각화 도구
- 개발중: console.log + electron DevTools
- Phase 1: 내장 로그 뷰어 (앱 내)
- Phase 2: Grafana 연동 (팀 운영 시)

---

## 84. 자동화 도구

### 블록 스캐폴딩
```bash
# 새 블록 생성 (자동 파일 구조 생성)
npm run scaffold:block -- --name=NewFeature --layer=3

# 생성 파일:
# src/blocks/l3-new-feature/
#   index.ts       (진입점)
#   input.ts       (입력 검증)
#   calc.ts        (핵심 로직)
#   output.ts      (출력 포맷)
#   index.test.ts  (테스트)
```

### 테스트 자동 생성
```bash
# 기존 함수에서 테스트 골격 생성
npm run gen:test -- --file=calc-engine.ts

# 생성: 각 export 함수에 describe/it 골격
```

### 문서 자동 생성
```bash
# JSDoc → Markdown 변환
npm run docs:gen

# 결과: docs/api/*.md (블록별 API 문서)
```

---

## 85. 메타 온톨로지 정의

### 시스템 자체가 온톨로지
```
도메인 온톨로지:  인테리어 공정/자재/브랜드/규칙
시스템 온톨로지:  블록/레이어/인터페이스/의존성

통합 그래프:
  모든 블록 = Neo4j 노드
  모든 의존 = Neo4j 엣지
  Neo4j로 시스템 자체를 질의 가능
```

### 통합 목적
```
가능해지는 질의:
  "estimate.html이 사용하는 엔진 전부?"
  "FinanceEngine 변경 시 영향 받는 블록?"
  "Layer 3에서 DB를 직접 호출하는 곳?"
  "테스트 커버리지가 낮은 블록?"
```

---

## 86. 노드 타입 9종

```
SystemRoot   최상위 루트 노드
Layer        계층 노드 (Layer 1~4)
Module       탭 모듈 (9개)
Block        기능 블록 (38개)
Function     함수/메서드
DataModel    데이터 모델/스키마
Interface    TypeScript 인터페이스
Test         테스트 케이스
Documentation 문서
```

---

## 87. 엣지 타입 17종

### 시스템 엣지 12종
```
BELONGS_TO    블록 → 레이어 소속
DEPENDS_ON    의존 관계
CALLS         함수 호출
USES_DATA     데이터 모델 사용
IMPLEMENTS    인터페이스 구현
EXTENDS       상속/확장
TESTS         테스트 대상
DOCUMENTS     문서화 대상
TRIGGERS      이벤트 발생
LISTENS       이벤트 수신
COMMUNICATES  IPC 통신
INHERITS      타입 상속
```

### 도메인 통합 엣지 5종
```
PROCESSES    블록 → 도메인 데이터 처리
STORES       블록 → DB 테이블 저장
APPLIES      블록 → 온톨로지 규칙 적용
LEARNS_FROM  블록 → ML 학습 소스
MODIFIES     블록 → Master DB 수정
```

---

## 88. 메타데이터 표준

### 모든 블록 JSDoc 필수
```typescript
/**
 * @block CalcEngine
 * @layer 2
 * @parent shared/engine
 * @input  { EstimateInput }
 * @output { EstimateResult }
 * @errors { ValidationError, CalcError }
 * @depends OntologyEngine, DatabaseAdapter
 * @testCoverage 95%
 * @author udunext7-wq
 * @since v2.0
 */
export class CalcEngine { ... }
```

### 파일 헤더 표준
```typescript
/**
 * ECOREAN BOC — [블록명]
 * Layer: [N] | Block: [블록ID]
 * 책임: [한줄 설명]
 * 입력: [타입]
 * 출력: [타입]
 */
```

---

## 89. 시스템 온톨로지 통합

### Neo4j 통합 저장
```cypher
// 블록 노드 생성
CREATE (b:Block {
  id: 'calc-engine',
  name: 'CalcEngine',
  layer: 2,
  lines: 2000,
  testCoverage: 0.95
})

// 의존성 엣지
MATCH (a:Block {id:'estimate-calc'}), (b:Block {id:'calc-engine'})
CREATE (a)-[:DEPENDS_ON]->(b)

// 도메인 연결
MATCH (b:Block {id:'calc-engine'}), (t:DataModel {id:'cost-items'})
CREATE (b)-[:USES_DATA]->(t)
```

### Week 1 즉시 도입
```
Day 1: Neo4j 설치 + 스키마 정의
Day 2: 기존 블록 노드 일괄 등록
Day 3: 의존성 엣지 자동 추출 (madge)
Day 4: 도메인 노드 연결 (cost_items 등)
Day 5: 통합 쿼리 테스트
```

---

## 90. AI 통합 전략

### Claude API → Neo4j 쿼리
```
사용자: "estimate.html이 어떤 DB 테이블을 쓰나요?"

처리:
  1. Claude API: 자연어 → Cypher 변환
  2. Neo4j: Cypher 실행
  3. 결과: 블록 + 테이블 관계 반환
  4. Claude API: 결과 → 자연어 설명

Cypher 예시:
  MATCH (m:Module {name:'estimate'})-[:DEPENDS_ON*]->(b:Block)
  -[:STORES]->(t:DataModel)
  RETURN DISTINCT t.name
```

### 시스템 자기 인식
```
가능해지는 기능:
  "지금 시스템에서 가장 위험한 블록은?"
  "테스트 없는 코드가 사용하는 DB 테이블?"
  "단일 실패점(SPOF)이 되는 블록?"
  "변경 영향이 가장 큰 인터페이스?"
```

### AI 페어 프로그래밍
```
개발 시:
  Claude가 Neo4j 시스템 그래프 조회
  → 새 블록의 최적 위치 제안
  → 의존성 충돌 사전 감지
  → 인터페이스 자동 생성
  → 테스트 골격 자동 작성
```

---

## v5.0 확정 결정 사항 (2026-04-27)

### 도면 전략 (확정)
하이브리드 모델 — 초기: 외부 API → 중기: 병행 → 장기: 자체 80%+

### 블록 아키텍처 (확정)
4계층 / 7,500줄 분할 기준 / TypeScript 인터페이스 강제

### Neo4j 메타 온톨로지 (확정)
Week 1 즉시 도입 — 인테리어 + 시스템 온톨로지 통합

### AI 통합 (확정)
Claude API + Neo4j 자연어 쿼리 — Phase 1부터 적용

---

## 부록 A — 12주 개발 일정

| 주차 | 목표 | 완료 기준 |
|------|------|-----------|
| Week 1 | 마스터플랜 확정 + Neo4j 셋업 | schema.sql + Neo4j 노드 등록 |
| Week 2 | Layer 1 완성 (DB/보안/백업/인증/로깅) | 5개 기초 블록 테스트 통과 |
| Week 3 | Layer 2 엔진 강화 | 5개 엔진 116+ assert 통과 |
| Week 4~5 | 견적 마법사 (STEP0~6) | 전체 플로우 E2E 통과 |
| Week 6~9 | 프로젝트 모듈 (7개 하위탭) | 공사일보/재무/발주 완성 |
| Week 10 | 프리셋 + 보고서 | 5종 보고서 PDF 생성 |
| Week 11 | 승인함 + DB관리 | 승인 플로우 완성 |
| Week 12 | 온톨로지 3D + 대시보드 | RED ALERT 동작 확인 |

---

## 부록 B — 38개 블록 명세

### Layer 1 기초 (5개)
| 블록 | 책임 | 목표 줄수 |
|------|------|-----------|
| DB 블록 | SQLite 연결/쿼리/트랜잭션 | 1,500 |
| 보안 블록 | 암호화/복호화/해시 | 1,000 |
| 백업 블록 | 자동백업/복원/검증 | 1,200 |
| 인증 블록 | JWT/세션/권한 확인 | 1,000 |
| 로깅 블록 | 통합로깅/Trace ID | 800 |

### Layer 2 엔진 (5개 + 2개 추가)
| 블록 | 책임 | 현재 상태 |
|------|------|-----------|
| CalcEngine | 견적 계산 | ✅ 완성 |
| OntologyEngine | 규칙 적용 | ✅ 완성 |
| DiagEngine | 위험 진단 | ✅ 완성 |
| ScheduleEngine | 공정표/발주 | ✅ 완성 |
| FinanceEngine | 재무 계산 | ✅ 완성 |
| SecurityEngine | 보안 엔진 | Phase 1 |
| BackupEngine | 백업 엔진 | Phase 1 |

### Layer 3 모듈 (26개)
```
견적 마법사 (8개 블록):
  step0-concept / step1-building / step2-spaces
  step3-condition / step4-scope / step5-grade
  step6-result / estimate-save

프로젝트 (8개 블록):
  project-list / project-estimate / gantt-chart
  daily-report / cash-ledger / financial-statement
  purchase-order / completion-report

프리셋 (2개 블록):
  preset-list / preset-form

보고서 (4개 블록):
  report-customer / report-internal
  report-order / report-settlement

승인함 (2개 블록):
  approval-pending / approval-history

DB관리 (2개 블록):
  dbmgr-list / dbmgr-form
```

### Layer 4 부가 (옵션)
```
AI 자동 문서 (Phase 1)
Voice First (Phase 1)
시공 영상 분석 (Phase 2)
AR/LiDAR 측정 (Phase 2)
디지털 트윈 (Phase 3)
```

---

## 부록 C — Phase별 인프라 비용

| Phase | 기간 | 월 비용 | 주요 비용 |
|-------|------|---------|-----------|
| Phase 0 | 지금~3개월 | 0원 | 로컬 운영 |
| Phase 1 | 3~6개월 | 18만원 | 외부 API 5만 + 클라우드 13만 |
| Phase 2 | 6~12개월 | 50만원 | 자체 서버 + AI API 확대 |
| Phase 3 | 1~2년 | 150만원 | Neo4j Aura + Claude Vision + 크롤러 |
| Phase 4 | 2~3년 | 500만원+ | 엔터프라이즈 인프라 |

### 비용 절감 전략
- L1/L2/L3 캐싱으로 API 비용 80% 절감
- 자체 DB 비중 증가로 Phase 3→4 비용 완화
- 프랜차이즈 수수료로 인프라 비용 충당

---

## 부록 D — 시스템 진화 트리거

| 전환 | 트리거 조건 | 준비 기간 |
|------|-------------|-----------|
| Phase 0→1 | 직원 입사 OR 데이터 100GB 초과 | 2주 |
| Phase 1→2 | 사용자 5명+ OR AI 본격 사용 | 1개월 |
| Phase 2→3 | 외부 고객 요청 OR 매출 목표 달성 | 2개월 |
| Phase 3→4 | 매출 N억 OR 프랜차이즈 계약 | 3개월 |

### 트리거 모니터링
```
자동 추적 항목:
  동시 사용자 수
  DB 파일 크기
  월 API 비용
  프로젝트 수
  직원 수

임계치 도달 시:
  Level1 알림
  Phase 전환 체크리스트 자동 생성
```

---

*ECOREAN BOC Master Plan v5.0 — 완전 통합본*
*총 90섹션 + 4부록 | 2026-04-27 by udunext7-wq*
