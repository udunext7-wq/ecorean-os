# ECOREAN BOC — Master Plan
최종 확정: 2026-04-25

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
ecorean-os/
├── shell/
│   └── boc-shell.html (탭+KPI 껍데기)
├── modules-html/
│   ├── estimate.html (견적 마법사)
│   ├── projects.html (프로젝트+공사일보+재무)
│   ├── presets.html (프리셋)
│   ├── reports.html (보고서)
│   ├── approval.html (승인함)
│   ├── dbmgr.html (DB관리)
│   ├── ontology.html (온톨로지 3D)
│   ├── aiengine.html (AI엔진)
│   └── dashboard.html (CEO대시보드)
├── shared/
│   ├── engine/boc-engine.js (5개 엔진 공유)
│   ├── store/boc-state.js (상태 공유)
│   └── db/schema.sql (DB 스키마)
├── electron/
│   ├── main.js (Electron 메인+IPC+SQLite)
│   └── preload.js (IPC 브릿지)
└── docs/
    └── MASTER_PLAN.md

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
- 공간별 스페이스 카드
  바닥재/벽재/천장/창호/도어 계단식 선택
- 창호·도어 규격 직접 입력
- 면적 자동 계산 (창호·도어 공제)
- 공간별 예상 견적 실시간
- CAD 기호 표시 (문호 방향)
- 치수선 자동
- 전체화면 모드
- PNG/DXF 내보내기
- PDF 도면 파싱 자동 입력

STEP0 컨셉 선택:
시공섹션(8개): 욕실/주방/거실침실/창호/전기/설비/전체/커스텀
컨셉(10개): 모던미니멀/클래식/럭셔리/북유럽/인더스트리얼
           재팬젠/프렌치/한국모던/스마트홈/실용표준
선택즉시 STEP1~5 기본값 자동입력
커스텀 가능

STEP1 건물기본:
현장명/건물유형/연식/층수/엘리베이터
거주중(+10%자동)/지역/담당소장

STEP2 공간실측:
미니CAD 연동
공간별 가로×세로×천장고(mm)
바닥재/벽재/천장/창호/도어 계단식 선택
면적 자동계산 (오차율 목표 ±2~3%)

STEP3 기존상태:
배관재질(PB/동관/갈바나이즈→교체강제)
보일러연식/분전반용량
바닥수평/방수하자/석면의심
RuleEngine 자동판단+경고

STEP4 공사범위:
시공섹션+컨셉 기반 자동체크
온톨로지 26개 자동적용
[자동]뱃지 표시
방수=CONDITIONAL(직접선택만)
DiagEngine 실시간경고

STEP5 자재등급:
전체패키지(표준1.0/고급1.3/프리미엄1.7)
부위별 개별설정 가능
브랜드별 실공급가 반영

STEP6 견적결과:
공급가/도급합계/VAT포함최종
㎡단가/평단가
공정별 금액 테이블
카테고리별 파이차트
예상공기(CPM)
착공일입력→공정표 미리보기
발주D-Day 자동
견적 유효기간 30일 (발행시점 단가고정)
[고객용견적서][내부보고서][저장] 버튼

### 탭2 프로젝트
프로젝트 목록 (수익률/위험도/공정률/잔여공기)
상태: draft/estimated/contracted/in_progress/completed

하위메뉴:
[견적서] 고객용/내부용
[공정표] 간트차트/크리티컬패스/발주D-Day
[공사일보]
  날짜/날씨
  완료공정 체크리스트
  투입인원(직종/인원수/일당)
  특이사항/하자발견/내일예정
  사진첨부 (로컬폴더 저장, 클라우드 백업)
  공기진행률 자동
[현금출납부]
  수입: 계약금/중도금/잔금/추가공사
  지출: 노무비/자재발주/외주비/간접비
  날짜/금액/결제방식/비고
  자동집계: 잔액/미수령/미지급/예상이익
[재무상태표]
  매출: 계약금액+추가공사
  비용: 노무비+자재비+외주비+간접비
  영업이익/이익률
  수금현황(계약금/중도금/잔금)
[발주관리]
  공정표D-Day 자동알림
  발주실행→현금출납부 연동
  미지급관리/결제완료체크
[완료보고]
  실제원가입력
  예상vs실제 오차분석
  교훈기록/ML학습데이터 자동생성
  하자기록

### 탭3 프리셋
시공섹션×컨셉 조합 저장/불러오기
커스텀 가능
프리셋 선택→견적마법사 자동입력
CRUD 가능 (추가/수정/삭제)

### 탭4 보고서
고객용견적서 (원가숨김/서명란/인쇄흰색)
내부원가보고서 (전체공개/[자동]뱃지)
발주서 (자재목록/D-Day/공급사)
공정표PDF
정산서 (최종실제원가)
보고서 템플릿 커스터마이징:
  로고/도장/회사명/계좌/약관 직접수정
  설정 한번 저장→전체반영

### 탭5 승인함
DB단가보정요청/온톨로지규칙추가
새공정추가/브랜드단가수정
승인즉시 Master DB 반영
Approval Log (불변기록)
변경전/후 값 전체 기록

### 탭6 DB관리
계단식 4단계 분류:
대분류→중분류→소분류→규격
예: 창호→PVC→삼중유리→1200×1800

관리항목 (전체 CRUD):
공정DB(622개)/자재DB/브랜드DB
온톨로지규칙/인건비DB
공간-공정매핑/컨셉/시공섹션
지역계수/리스크규칙/하자유형
외주업체/발주처/담당소장

삭제원칙: status=disabled (실제삭제금지)
Master DB 변경: 대표승인 필수
변경즉시 전체모듈 반영
Approval Log 기록

### 탭7 온톨로지
Three.js r128 3D 네트워크 그래프
민들레 형태:
  중앙: ECOREAN BOC 코어
  1레이어: 온톨로지 규칙 (골드)
  2레이어: 공정 (파랑)
  3레이어: 자재/인건비 (초록)

관계선 색상:
  AUTO: 골드 실선
  CONDITIONAL: 주황 점선
  FORCED: 빨강 실선
  PRECEDES: 흰색 화살표
  AFFECTS_COST: 빨강 파선

인터랙션:
  드래그: 3D 회전
  휠: 줌
  클릭: 연결노드만 표시
  더블클릭: 해당노드 중심
  검색: 노드명 검색

필터:
  [전체][AUTO][CONDITIONAL][FORCED]
  [규칙][공정][자재][브랜드]
  최대 100개 노드 표시 (성능최적화)

규칙관리:
  공사일보→패턴감지→규칙제안 카드
  대표승인→Neo4j+MasterDB 반영
  CRUD 가능

Neo4j 연동:
  지금: JSON 로컬 운영
  나중: 프랜차이즈 확장시 Neo4j Aura 연동

### 탭8 AI엔진
학습데이터 건수 게이지 (목표 500건)
활성화 로드맵:
  0~49건: 수동보정
  50~99건: 통계회귀
  100~499건: XGBoost
  500건+: 딥러닝

공정별 오차율 차트
크롤러 현황:
  노임단가/자재물가/온톨로지후보 자동수집
  [지금실행] 버튼
도면파싱: PDF/DXF→면적자동추출→STEP2자동입력
보정제안 목록: [승인][거절] 버튼
Active Learning: 불확실→확인요청

### 탭9 대시보드(CEO)
오늘: 입금예정/지급예정/순현금흐름
진행현장: 수익률/위험도/공정률
이번달: 매출/비용/영업이익/이익률
미수금: 현장별D-Day/독촉항목
승인대기: 건수/즉시처리버튼
RED ALERT: 방수검수실패/발주초과/예산초과/미수금장기

## 7. 계산 공식
공급가 = qty×(1+wr)×(lb×pm + mt×matMul)
도급 = 공급가×1.15
최종 = 도급×1.10(VAT)
pm: 표준1.0/고급1.3/프리미엄1.7
양중: 5층+8%/10층+15%/15층+20%/엘없음+30%
거주중: +10%

## 8. DB 스키마 (SQLite)

### 프로젝트
projects: id/name/address/buildType/buildAge
          floorLevel/hasElev/resid/region
          manager/status/contractAmount
          startDate/endDate/conceptId/sections

spaces: id/projectId/name/type/width/length
        height/floor/wet/windows/doors
        floorMat/wallMat/ceilMat/cadX/cadY

estimates: id/projectId/grade/gradeMul
           selectedProcessIds/autoProcessIds
           totalSupply/contractAmount/finalAmount
           duration/lines/validUntil

### 공사관련
daily_reports: id/projectId/date/weather
               completedProcesses/workers
               issues/defects/tomorrowPlan
               progressRate/photos

cash_ledger: id/projectId/date/type/category
             subCategory/amount/payMethod
             vendor/memo/paid

purchase_orders: id/projectId/processId
                 itemName/quantity/unit
                 unitPrice/totalPrice/vendor
                 leadDays/orderDate/deliveryDate/status

### DB관리
cost_items: itemId/itemName/level1/level2
            level3/level4/unit/laborCost
            materialCost/wasteRate/duration
            formula/spaceTypes/isRequired
            dataStatus/status/updatedAt

ontology_rules: ruleId/trigger/linked
                triggerType/condition
                confidenceLevel/status
                approvedBy/approvedAt/source

approval_log: id/requestType/targetId/action
              beforeValue/afterValue/reason
              approvedBy/approvedAt

presets: id/name/sections/conceptId/grade
         gradeMul/selectedProcessIds
         materialOverrides/customizations

concepts: conceptId/name/grade/gradeMul
          priceMin/priceMax/defaultProcessIds
          materialDefaults/status

sections: sectionId/name/processIds/description/status

## 9. IPC 통신 구조
모듈→Main: state:set/db:query/db:execute
           kpi:update/tab:switch
Main→모듈: state:changed/db:result/kpi:refresh

## 10. 사용자 권한
Level1 대표: 전체제어/승인/설정/CEO대시보드
Level2 BOC직원: 견적/프로젝트/재무/DB수정요청/보고서
Level3 현장관리자: 담당현장공사일보/공정표/발주요청

견적마법사 접근:
  내부(Level1~2): 원가+마진 전체
  소장(Level3): 조회만(원가숨김)
  고객: 웹사이트 별도 경량버전(최종금액만)

## 11. 백업 정책
로컬 자동백업: 일 1회
외부드라이브: 주 1회
클라우드: 실시간 (OneDrive/구글드라이브)
사진: PC 로컬폴더+클라우드 자동업로드

## 12. 다중 현장
현장별 독립 운영
인력 충돌 감지+경고 (강제조정없음)
전사 통합 대시보드

## 13. 오프라인 작동
핵심기능: 완전 오프라인
  견적/공사일보/현금출납부/공정표
부가기능: 인터넷 필요
  크롤러/Neo4j/클라우드백업
동기화: 인터넷 연결시 자동

## 14. 고객 포털
URL 링크 공유 (비밀번호없음)
공사진행률+사진+공정표 공유
웹버전 완성후 구현

## 15. 알림
앱내 알림 + 카카오톡
대상: 발주D-Day/예산초과/미수금/승인요청/완료보고

## 16. 멀티 디바이스
클라우드 경유 실시간 동기화
대표PC+소장태블릿+직원PC
오프라인 작업후 자동 동기화

## 17. 견적 유효기간
30일 고정
발행시점 단가 고정
만료 3일전 알림
만료시 재계산 알림

## 18. 데이터 이전
BOC부터 새로 시작
나중에 Excel 임포트 기능 추가가능 구조

## 19. 연동 안전 보장
단일 진실 원천 (SQLite)
이벤트 브로드캐스트 (변경즉시 전체반영)
검증 레이어 (잘못된 데이터 저장차단)
버전관리+롤백 (문제발생시 즉시복구)

## 20. 성장형 CRUD
모든항목: 추가/수정/삭제 가능
삭제: status=disabled (실제삭제금지)
Master DB 변경: 대표승인 필수
Approval Log: 불변기록

## 21. Neo4j 순환 구조
모든 데이터→Neo4j→온톨로지학습
→견적/공정/리스크/단가/이익률보정
→더좋은운영→더많은데이터→(반복)
우리만의DB = ECOREAN 핵심자산

Neo4j 노드:
Project/Space/Process/Material/Brand
Vendor/LaborCrew/DailyReport/CashLedger
Income/Expense/PurchaseOrder
PaymentMilestone/FinancialStatement
OntologyRule/LearningSuggestion
Defect/Risk/Case/MLModel/Franchise

Neo4j 관계:
HAS_SPACE/HAS_PROCESS/USES_MATERIAL
REQUIRES_LABOR/SUPPLIED_BY/BRAND_OF
HAS_PAYMENT/NEEDS_INSPECTION
HAS_DEFECT/HAS_RISK/RECORDED_AS_CASE
GENERATES_LEARNING/NEEDS_APPROVAL
UPDATES_MASTER_DB/PRECEDES/DEPENDS_ON
AFFECTS_COST/AFFECTS_SCHEDULE
TRIGGERS/LEARNED_FROM/CRAWLED_FROM

## 22. AI 성장 구조
크롤링: 표준품셈/노임단가/자재물가/시공사례
도면파싱: PDF/DXF/CAD→면적자동
공사일보→패턴감지→온톨로지규칙제안
ML: 0~49수동/50~99통계/100~499XGBoost/500+DL
고급AI: Causal+ActiveLearning+Federated

## 23. 개발 원칙
설계확정→테스트작성→코딩→검증→커밋
버그있는코드 커밋절대금지
TDD강제/발견즉시수정
코드보다설계먼저
디자인은맨마지막

## 24. 개발 순서
1. schema.sql (DB스키마)
2. electron/main.js (IPC+SQLite)
3. shared/engine 테스트 보강
4. modules-html/estimate.html
5. modules-html/projects.html
6. modules-html/presets.html
7. modules-html/reports.html
8. modules-html/approval.html
9. modules-html/dbmgr.html
10. modules-html/ontology.html
11. modules-html/aiengine.html
12. modules-html/dashboard.html
13. 디자인 적용
14. 웹버전 포팅 (Next.js)
15. 현장 투입
