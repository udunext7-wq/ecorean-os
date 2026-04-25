# ECOREAN 자동견적 OS — 전체 DB 카탈로그

> 버전 1.0.0 | 2026-04-25  
> **목적:** 실제 단가 입력 전, "무엇을 수집해야 하는가"를 전수 정의  
> **규칙:** 이 문서가 확정된 이후에 프로그램을 만든다

---

## 전체 현황

| DB 영역 | 항목 수 | 상태 | 최우선(P1) |
|---------|---------|------|-----------|
| 공정 DB | 201개 | NEEDS_RESEARCH | 201개 |
| 자재 DB | 113개 | NEEDS_RESEARCH | 95개 |
| 부자재/소모품 DB | 45개 | NEEDS_RESEARCH | 45개 |
| 브랜드 DB | 46개 | NEEDS_RESEARCH | 0개 |
| 인건비/품수 DB | 30개 | NEEDS_RESEARCH | 30개 |
| 외주/장비/운반 DB | 21개 | NEEDS_RESEARCH | 21개 |
| 일정/발주 DB | 33개 | PARTIAL | 33개 |
| 리스크/하자 DB | 18개 | PARTIAL | 18개 |
| 계약/수금/정산 DB | 10개 | STRUCTURE_READY | 10개 |
| 운영 문서 DB | 26개 | STRUCTURE_READY | 26개 |
| **합계** | **543개** | — | **479개** |

---

## 각 항목의 필드 구조

모든 항목은 다음 공통 구조를 가진다:

```
category          DB 영역
subcategory       세부 분류
itemName          항목명
requiredDataFields  수집해야 할 데이터 필드 목록
sourceCandidates  데이터 출처 후보
priority          1=최우선 / 2=중요 / 3=보통
dataStatus        EMPTY / STRUCTURE_READY / NEEDS_RESEARCH / PARTIAL / VERIFIED / INTERNAL_VALIDATED
owner             책임자
updateCycle       갱신 주기
notes             비고
connections       연결 엔진 (Master DB / Estimate Engine / Schedule Engine 등)
```

---

## 1. 공정 DB (201개)

**연결:** Master DB → Estimate Engine → Schedule Engine

### 필수 수집 필드 (공정당)
```
itemId            공정 코드 (예: TILE_FL_600)
itemName          공정명
unit              단위 (㎡, EA, m, 식)
laborCost         노무비 (원/단위)
materialCost      자재비 (원/단위)
equipmentCost     장비비 (원/단위)
accessoryCost     부속·부자재비 (원/단위)
wasteRate         손실률 (0.05 = 5%)
defaultDuration   기본 소요일수
leadTimeDays      자재 발주 선행일
defaultMarginRate 기본 마진율
triggerType       AUTO / SELECT / QTY / CONDITIONAL
quantityFormula   수량 계산 공식 (예: floorArea * 1.05)
defaultSpec       표준 사양 설명
optionGroups      선택 옵션 그룹 (자재등급·브랜드·시공방식 등)
ontologyRelation  선행·후행·연결자재·연결인력
```

### 소분류별 항목 수

| 소분류 | 항목 수 |
|--------|---------|
| 철거 | 15개 |
| 가설 | 6개 |
| 폐기물 | 4개 |
| 설비 | 16개 |
| 전기 | 15개 |
| 방수 | 6개 |
| 미장 | 4개 |
| 타일 | 11개 |
| 목공 | 13개 |
| 금속 | 4개 |
| 창호 | 8개 |
| 유리 | 4개 |
| 도어 | 8개 |
| 도장 | 9개 |
| 도배 | 6개 |
| 필름 | 3개 |
| 바닥재 | 10개 |
| 몰딩/걸레받이 | 5개 |
| 가구 | 9개 |
| 욕실 | 7개 |
| 주방 | 6개 |
| 조명 | 7개 |
| 환기 | 4개 |
| 냉난방 | 7개 |
| 소방 | 3개 |
| 통신 | 4개 |
| 준공청소 | 4개 |
| 하자보수 | 6개 |

---

## 2. 자재 DB (113개)

**연결:** Master DB → Estimate Engine

### 필수 수집 필드 (자재당)
```
materialId         자재 코드
materialName       자재명
brand              브랜드
series             시리즈명
size               규격 (예: 600×600×10mm)
thickness          두께
grade              등급 (standard / premium / luxury)
unit               단위
basePrice          기준 단가 (원/단위)
priceRange         가격 범위 (최저~최고)
packagingUnit      포장 단위 (박스, 롤, 포 등)
leadTimeDays       발주~입고 리드타임
sourceType         출처 유형
sourceName         출처명
sourceDate         단가 기준일
wasteRate          손실률
compatibleProcesses 적용 가능 공정 코드
```

### 소분류별 항목 수

| 소분류 | 항목 수 |
|--------|---------|
| 타일 | 10개 |
| 마루 | 4개 |
| 장판 | 2개 |
| 데코타일 | 3개 |
| 도배지 | 5개 |
| 필름 | 4개 |
| 도장재 | 6개 |
| 석고보드 | 4개 |
| 합판 | 4개 |
| MDF | 3개 |
| 각재 | 3개 |
| 단열재 | 4개 |
| 방수재 | 4개 |
| 접착재 | 4개 |
| 실리콘 | 3개 |
| 창호 | 6개 |
| 유리 | 3개 |
| 도어 | 5개 |
| 하드웨어 | 5개 |
| 조명 | 4개 |
| 배선기구 | 6개 |
| 위생도기 | 6개 |
| 수전 | 4개 |
| 가구재 | 3개 |
| 상판 | 4개 |
| 철물 | 4개 |

---

## 3. 부자재/소모품 DB (45개)

**연결:** Master DB → Estimate Engine

공정 시공 시 반드시 소모되는 보조 재료. 견적에서 누락되기 쉬운 항목.

### 필수 수집 필드
```
itemId            소모품 코드
itemName          소모품명
unit              단위
pricePerUnit      단가 (원/단위)
packagingUnit     포장 단위
usageRatePerSqm   ㎡당 소모량
linkedProcess     연결 공정 코드
```

### 주요 항목
- 압착시멘트 C1/C2, 타일본드, 아덱스급, 에폭시본드
- 프라이머 (타일용·도장용), 줄눈재, 에폭시 줄눈
- 레벨링 클립·쐐기, 스페이서, 코너비드, 졸리컷
- 우레탄폼, 보양재 (PE필름·골판지), 커팅날
- 마스킹 테이프, 비닐, 톤백, 연마지
- 전선, CD관, 셀프레벨링, 석고 퍼티, 우레탄 방수재

---

## 4. 브랜드 DB (46개)

**연결:** Master DB

거래처별 공급 단가, 납기, 할인율, 담당자 정보 관리.

### 필수 수집 필드
```
brandId           브랜드 코드
brandName         브랜드명
country           원산지
category          제품 분류
gradeLevel        등급 (표준/고급/프리미엄)
repProducts       대표 제품명
supplyChannel     공급 경로
contactInfo       담당자 연락처
discountRate      ECOREAN 할인율
deliveryLeadDays  평균 납기
warranty          보증 기간
```

### 분야별 브랜드
- 욕실: 아메리칸스탠다드, GROHE, 로얄앤컴퍼니, 대림바스, 이누스, 한샘
- 타일: 마라지(이탈리아), 아틀라스콩코르드, 살라브리쉬, LG하우시스, KCC
- 창호: 슈코(독일), 레하우, LG하우시스, KCC, 현대L&C
- 도어: 영림도어, 제이원도어, KCC
- 주방: 한샘, 현대리바트, 에넥스, 까사미아, 쿤텍
- 마감재: LG하우시스, KCC, 한화L&C, 동화자연마루
- 하드웨어: BLUM(오스트리아), HETTICH(독일), 까베오, 집팔
- 접착재: MAPEI, 신영건화, 금강고려화학
- 전기: 르그랑, ABB, 대성전기

---

## 5. 인건비/품수 DB (30개)

**연결:** Master DB → Estimate Engine

### 필수 수집 필드
```
roleId              역할 코드
roleName            역할명
grade               숙련도 (일반/숙련)
dailyRate           일당 (원)
halfDayRate         반일 단가
unitLaborRate       단위 노무비 (원/㎡ 또는 원/EA)
unitProcessName     단위 적용 공정명
normalDuration      표준 일일 작업량
difficultyMultiplier 난이도 계수
sourceType          출처 (시중노임단가/내부실적)
sourceDate          기준일
regionalFactor      지역 보정계수
```

### 직종별 목록
목수, 타일공, 전기공, 설비공, 도배공, 필름공, 도장공, 마루공, 금속공, 창호공, 유리공, 가구공, 방수공, 미장공, 철거공, 보양공, 청소부, 현장소장 등 30개

---

## 6. 외주/장비/운반 DB (21개)

**연결:** Master DB → Estimate Engine → Schedule Engine

```
vendorId          업체 코드
vendorName        업체명
serviceType       서비스 유형
unitPrice         단가 (원/단위)
minimumCharge     최소 출동 비용
availableRegions  가능 지역
leadDays          예약 선행일
ratingScore       평가 점수
```

### 항목
- 사다리차 (1톤·5톤), 크레인 양중
- 폐기물 위탁업체, 화물 운송 (1·2.5·5톤)
- 장비 대여 (그라인더·절단기·레이저레벨)
- 코어 드릴링, 콘크리트 절단
- 전문 외주 (방수·에어컨·유리·석재·스마트홈·청소)

---

## 7. 일정/발주 DB (33개)

**연결:** Master DB → Schedule Engine → Estimate Engine

```
processId           공정 코드
minDuration         최소 공기 (일)
maxDuration         최대 공기 (일)
defaultDuration     기본 공기 (일)
curingTimeHours     양생 시간 (시간)
waitTimeHours       대기 시간 (시간)
leadTimeDays        자재 발주 선행일
deliveryLeadDays    자재 입고 소요일
prerequisites       선행 공정
successors          후행 공정
conflictsWith       동시 진행 불가 공정
parallelAllowed     병행 가능 여부
seasonalConstraint  계절 제약 (방수·도장)
```

**현재 상태:** PARTIAL — 기본 공기는 정의되어 있으나, 실제 현장 기준으로 검증 필요

---

## 8. 리스크/하자 DB (18개)

**연결:** Risk Engine → Master DB → Case Library

```
riskId              리스크 코드
probability         발생 확률 (0~1, ML 자동 갱신)
impactLevel         영향도 (low/medium/high/critical)
triggerCondition    발생 조건
repairCost          평균 보수 비용
repairDays          평균 보수 일수
preventionMethod    예방 방법
responseSLA         대응 기한
historicalCount     실제 발생 횟수 (ML 학습용)
```

**주요 리스크:** 누수, 타일 들뜸, 줄눈 오염, 실리콘 곰팡이, 도배 들뜸, 마루 들뜸, 전기 불량, 배수 불량, 창호 결로, 공기 지연, 추가공사 분쟁, 잔금 지연

---

## 9. 계약/수금/정산 DB (10개)

**연결:** Finance Engine → Document Engine → Master DB

현재 상태: **STRUCTURE_READY** — 구조 확정, 실제 계약 조건 입력 필요

- 계약금 (10~30%), 중도금 (30~40%), 잔금 (20~30%)
- 추가공사비, 외주 정산, 자재비 지급
- 세금계산서, 미수금 관리, 현금흐름 예측, 부가세 신고

---

## 10. 운영 문서 DB (26개)

**연결:** Document Engine → Output Module → Finance Engine

현재 상태: **STRUCTURE_READY** — 구조 확정, 템플릿 제작 필요

자동화 수준별 분류:
- **자동화 목표:** 고객용 견적서, 내부 원가표, 마진표, 발주표, 수익률분석, 현금흐름표, 인력실적표
- **반자동:** 계약서, 시방서, 청구서, 준공검사표, 보증서, 인도서
- **앱 입력 목표:** 공사일보, 입고검수표, AS접수대장, 만족도조사
- **수동 유지:** 추가공사합의서, 세금계산서, 하자확인서

---

## DB 부족 순위 및 채우는 순서

### 🔴 1순위 — 지금 당장 채워야 하는 것 (대표님 직접 입력)

```
공정 DB 단가 (201개)
  → 노무비, 자재비, 손실률, 소요일수
  → 대표님이 알고 있는 ECOREAN 실제 단가 기준
  → 우선 주요 30개 공정만 입력해도 80% 커버 가능
```

### 🟠 2순위 — 구매팀과 함께 (거래처 확인 필요)

```
부자재/소모품 단가 (45개)
  → 공정당 소모량 + 단가
  → 건자재상·온라인몰 가격 확인

외주/장비 단가 (21개)
  → 사다리차·폐기물·전문외주 실제 견적가
```

### 🟡 3순위 — 시스템 운영하면서 채우기

```
브랜드 DB (46개)
  → 거래처별 할인율·납기·담당자
  → 지금은 브랜드명만 있어도 시작 가능

리스크 DB 확률값
  → 현장 사용하면서 실적 쌓이면 ML이 자동 갱신
```

### 🟢 4순위 — 나중에 (시스템 안정화 후)

```
인건비 품수 DB
  → 표준품셈 기준은 있음, ECOREAN 실제 계약가 비교 필요

일정/발주 DB 검증
  → 현재 구조 있음, 현장 데이터로 보정 필요
```

---

## 핵심 원칙

1. **실제 단가는 아직 입력하지 않는다** — 이 카탈로그는 구조 정의다
2. **30개 핵심 공정 단가**만 채워도 견적 OS 1차 가동 가능
3. **DB는 계속 진화한다** — 처음부터 100% 완벽할 필요 없음
4. **구조가 먼저, 단가는 나중** — 지금 이 순서가 맞다
