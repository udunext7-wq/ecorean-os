# ECOREAN BOC — 헌법 (Constitution v7.0)
최종 확정: 2026-05-03
이전: MASTER_PLAN.md v6.4 (docs/archive/MASTER_PLAN_v6.4_backup.md)

---

## 절대 원칙 (P1~P6)

| 코드 | 원칙 | 위반 시 |
|---|---|---|
| **P1** | 고객용 PDF ≠ 내부 원가 분석서 — 두 문서 분리 강제 | 커밋 차단 |
| **P2** | 단가 추정 금지 — UNKNOWN/NEEDS_RESEARCH 우선 | 커밋 차단 |
| **P3** | VAT 이중 계산 금지 — estimate.final 직접 참조 금지 | 커밋 차단 |
| **P4** | XSS 차단 — innerHTML + 사용자 입력 시 escapeHtml 필수 | 경고 |
| **P5** | once:true 안티패턴 금지 | 커밋 차단 |
| **P6** | 13 엔진 NotImplementedError 정직 — 가짜 PASS 금지 | 커밋 차단 |

---

## 절대 수치 (B1~B8) — 변경 금지

| 코드 | 항목 | 절대값 |
|---|---|---|
| **B1** | 시공 섹션 수 | **22 시공섹션** |
| **B2** | 공간 유형 수 | **23 공간** |
| **B3** | 헌법 시드 총 건수 | **159건** |
| **B4** | 13 엔진 슬롯 수 | **13개** |
| **B5** | 컨셉 수 | **12개** |
| **B6** | 평형 프리셋 수 | **5단계** |
| **B7** | 주거 형태 수 | **6개** |
| **B8** | 메타엣지 수 | **24개** |

---

## 13 엔진 (현재 구현 0/13)

| 번호 | 엔진명 | Phase | 현재 대체 |
|---|---|---|---|
| 01 | InputNormalizer | A | WizardController |
| 02 | PresetEngine | A | shell/src/meta |
| 03 | RuleEngine | A | constitution.json |
| 04 | DefaultSpecEngine | B | 신규 |
| 05 | EstimateEngine | B | CalcEngineV56.cjs |
| 06 | ScheduleEngine | B | main.js 함수 |
| 07 | DocumentGenerator | C | EstimatePDF.js |
| 08 | DiagnosticsEngine | C | 신규 |
| 09 | TestRunner | C | 신규 |
| 10 | CompletionReportEngine | D | 신규 |
| 11 | EstimateVsActualEngine | D | SettlementPage.js |
| 12 | MasterDBUpdateRequestEngine | D | 신규 |
| 13 | ApprovalLogEngine | D | 신규 |

> 미구현 엔진은 반드시 NotImplementedError를 throw한다. 가짜 return true 금지 (P6).

---

## 헌법 시드 (159건 SSoT)

| 카테고리 | 파일 | 건수 |
|---|---|---|
| 공정 | seeds/processes-62.json | 62 |
| 자재 | seeds/materials-35.json | 35 |
| 노무비 | seeds/labor-22.json | 22 |
| 온톨로지 | seeds/ontology-11.json | 11 |
| 브랜드 | seeds/brands-29.json | 29 |
| **합계** | seeds/manifest.json | **159** |

---

## 모노레포 구조 (v7.0)

```
ecorean-os/
  apps/
    console/    — BOC Console 표지 (Launcher/Router, 200줄 이내)
    minicad/    — MiniCAD v5.8+ (JSON SSoT 출력)
    estimator/  — 견적마법사 6단계 + 13 엔진 연동
  packages/
    schema/     — JSON SSoT 스키마 v6.0 (minicad + estimate)
    engines/    — 13 엔진 슬롯 (NotImplementedError 기본)
    db/         — migration-runner + seed-runner
    ui/         — 공통 UI 컴포넌트
  seeds/        — 헌법 시드 159건 SSoT
  scripts/      — verify-constitution, verify-seeds, verify-schema
  docs/
    CONSTITUTION.md  ← 이 파일 (단 1개)
```

---

## 아키텍처 (3-Layer)

```
[Layer 1] 입력 모듈
  apps/minicad (Konva 기반) → apps/estimator (6단계 마법사)
        ↓
  JSON v6.0 SSoT (packages/schema)

[Layer 2] 통합 OS — OpenCrab
  MetaOntology Brain (9 Space + 11 MetaEdge)
  13 엔진 (packages/engines)

[Layer 3] 데이터 + 학습
  SQLite (packages/db) → Neo4j + ChromaDB + MongoDB
  closed-loop ML 자동 진화
```

---

## 개발 Phase 로드맵

| Phase | 내용 | 기간 |
|---|---|---|
| A | 13엔진 1~3 + preload 통합 | 1주 |
| B | MiniCAD 독립 (apps/minicad) | 2주 |
| C | 견적마법사 독립 (apps/estimator) | 2주 |
| D | OpenCrab 통합 + 엔진 10~13 | 1주 |
| E | Inspection→Settlement→학습 연계 | 1주 |
| F | 전체 검증 + v7 릴리즈 | 1주 |

---

## 재발 방지 자동화

- `packages/db/migration-runner.cjs` — 앱 시작 시 마이그레이션 자동 실행
- `packages/db/seed-runner.cjs` — 앱 시작 시 시드 자동 적재
- `.git/hooks/pre-commit` — 헌법 위반 커밋 자동 차단
- `.github/workflows/ci.yml` — PR 시 헌법 검증 자동 실행
