# ECOREAN BOC — Master Plan

## 1. 프로젝트 정의

**BOC = Build Operation Center**

견적 → 계약 → 발주 → 공정 → 현장 → 검수 → 하자 → 정산 → 피드백

인테리어 공사 전 주기를 단일 플랫폼에서 운영한다.

---

## 2. 확정된 구조

### 파일 아키텍처

단일 HTML + 내부 모듈 패턴 (IIFE)

```
CONFIG → CalcEngine → OntologyEngine → DiagEngine
       → AppState → Router → UI → INIT
```

### 절대 원칙

- `<script>` 블록 1개 (CDN 제외)
- 함수 중복 정의 금지
- 모든 DOM 접근 optional chaining (`?.`) 필수
- 단방향 데이터 흐름: State → UI (역방향 금지)
- onclick 내 `JSON.stringify` 금지 → 단일따옴표 객체 리터럴 사용

---

## 3. 개발 원칙

**순서:** 설계 → 테스트 → 코딩 → 검증 → 커밋

- TDD 강제: 테스트 먼저, 코드 나중
- 버그 있는 코드 커밋 절대 금지
- 테스트 미통과 시 앱 시작 차단 (INIT에서 검증)
- 발견 즉시 수정

---

## 4. DB 현황

| 항목 | 수량 |
|------|------|
| 공정 항목 | 622개 |
| 온톨로지 룰 | 26개 |
| 총 데이터 | 808개 |

### 온톨로지 룰 타입

- `AUTO_INCLUDE` — 조건 충족 시 자동 추가
- `WARN_CONDITIONAL` — 경고 후 사용자 확인
- `FORCED` — 강제 포함

---

## 5. 로드맵

```
인테리어 → 건축 → 신축 → 모듈하우스 → 프랜차이즈
```

### 단계별 목표

| 단계 | 범위 | 상태 |
|------|------|------|
| Phase 1 | 인테리어 BOC | 개발 중 |
| Phase 2 | 건축 공사 | 예정 |
| Phase 3 | 신축 | 예정 |
| Phase 4 | 모듈하우스 | 예정 |
| Phase 5 | 프랜차이즈 플랫폼 | 예정 |

---

## 6. Neo4j 연동 계획

- Readiness Layer: **완성됨**
- 연동 스택: Electron + `neo4j-driver`
- 데이터 모델: 3D Ontology Graph (공정 노드 + 의존 엣지)
- 목표: 실시간 공정 의존성 분석 + 경고 전파

---

## 7. ML 파이프라인

| 데이터 수 | 모델 |
|-----------|------|
| 0 ~ 49건 | 수동 규칙 |
| 50 ~ 99건 | 통계 (평균/중앙값) |
| 100 ~ 499건 | XGBoost |
| 500건+ | Deep Learning |

단가 예측, 공기 예측, 이상 탐지에 순차 적용.

---

## 8. 다음 우선순위

| 순위 | 작업 |
|------|------|
| 1 | ECOREAN_BOC_v2.html 설계 완성 |
| 2 | 구조 구축 (뼈대만) |
| 3 | 기능 추가 (하나씩) |
| 4 | 디자인 적용 (마지막) |
| 5 | Neo4j 연동 |
| 6 | ML 활성화 |

---

## 9. v2.html 탭 구성

| 탭 ID | 이름 |
|-------|------|
| estimate | 견적 (6-step wizard) |
| projects | 프로젝트 관리 |
| presets | 프리셋 관리 |
| reports | 보고서 (4종) |
| completion | 준공 처리 |
| approval | 결재 승인 |
| dbmgr | DB 관리자 |
| ontology | 온톨로지 뷰어 |
| aiengine | AI 엔진 |

---

## 10. 계산 공식

```
supplyPrice    = qty × (1 + wasteRate) × (laborCost × adjMul + materialCost × matMul)
contractAmount = supplyPrice × 1.15
finalAmount    = contractAmount × 1.10  (VAT 포함)

adjMul = hoistMul × regionMul × residentMul
```

---

_Last updated: 2026-04-26_
