# ECOREAN BOC — Build Operation Center

**ECOREAN 인테리어 자동 견적 OS**  
견적 → 계약 → 발주 → 공정 → 현장 → 검수 → 하자 → 정산 → 피드백 → DB 업데이트까지 단일 Closed Loop

---

## 빠른 시작

```bash
# 즉시 사용 (Node.js 불필요)
ECOREAN_BOC_v1.html 파일을 Chrome으로 열기
```

---

## 구조

```
ECOREAN_BOC_v1.html          ← 메인 앱 (7탭 통합 OS)
ECOREAN_전문견적OS_v2.html   ← 견적 마법사 단독

src/
  master-db/
    seed/                    ← Master DB (JSON, 단일 원본)
      cost-items-v2.json     ← 공정 단가 62개 (2025 시중노임단가)
      labor-roles.json       ← 인건비 18직종 (공식 기준)
      material-items.json    ← 자재 35개
      schedule-templates.json← 공정 일정 35개 (CPM 기반)
      ontology-rules.json    ← 자동연결 규칙 23개
      subcontractors.json    ← 외주업체 단가 21개
      defect-types.json      ← 하자 유형 16개
      brand-price-db.json    ← 브랜드 공급가 35개
      risks.json             ← 리스크 10개
      region-factors.json    ← 지역 계수 5개
    brands/
      brand-price-db.json    ← 브랜드별 실공급가
  estimate-engine/           ← 견적 엔진 (TypeScript)
    estimate-engine.ts       ← 메인 계산 엔진
    rule-engine.ts           ← 조건부 공정 판단
    diagnostics.ts           ← 누락 공정 탐지
    margin-engine.ts         ← 마진 계산
    process-selector.ts      ← 공사 범위 → 공정 목록
    fee-engine.ts            ← 공과잡비·VAT
  shared/                    ← 공통 유틸
    types.ts, money.ts, units.ts, errors.ts, date.ts
  test-runner/
    test-runner.js           ← 32개 자동 테스트

docs/                        ← 문서 12개
```

---

## DB 현황 (2026-04-25 기준)

| DB | 항목 수 | 데이터 상태 |
|----|---------|------------|
| 공정 단가 | 62개 | 공식 시중노임단가 기반 |
| 인건비 | 18개 | 대한건설협회 공식 발표 |
| 자재 | 35개 | 시장조사 |
| 공정 일정 | 35개 | CPM 크리티컬패스 |
| 온톨로지 규칙 | 23개 | 검증 완료 |
| 외주업체 | 21개 | 시장조사 |
| 하자 유형 | 16개 | 현장 기반 |
| 브랜드 공급가 | 35개 | 시장조사 |

---

## 핵심 계산 공식

```
공급가 = qty × (1+손실률) × (노무비×패키지계수 + 자재비)
도급합계 = 공급가 × 1.15 (공과잡비2%+관리비3%+이윤10%)
최종 = 도급합계 × 1.10 (VAT)

패키지계수: 표준=1.0 / 고급=1.3 / 프리미엄=1.7
양중비: 5층+8% / 10층+15% / 15층+20% / 엘리없음+30%
거주중: +10%
```

---

## 절대 규칙

- 방수 = AUTO 금지, CONDITIONAL만 허용
- Master DB 무승인 업데이트 금지
- 고객용/내부용 보고서 혼합 금지

---

## TestRunner 실행

```bash
node src/test-runner/test-runner.js
# → 32개 테스트 전체 통과 확인
```

---

**GitHub:** https://github.com/udunext7-wq/ecorean-os  
**로컬:** C:\Users\udune\ecorean-os
