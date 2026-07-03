# ECOREAN BOC — MASTER_PLAN v5.6 갱신 명령 (Claude Code)

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** https://github.com/udunext7-wq/ecorean-os
> **현재 커밋:** d8aa164 (v5.5)
> **목표:** v5.5 → v5.6 갱신 + 노드/엣지 그래프 시각화 + 시스템 토폴로지 화면

---

## 작업 개요

마스터플랜 v5.5(108섹션 + 12부록)는 **유지**. 다음만 추가:

- **§109** 노드/엣지 그래프 아키텍처 (11 노드 + 24 엣지)
- **§110** 메타 온톨로지 호환 (L1~L7, 6+α 인터페이스)
- **§111** AI 가상 임원 (14번째 엔진, D1 하이브리드)
- **§112** L3 포도농장 OS (2026 하반기, 6 메타엣지)
- **§113** 메타엣지 결정권 (D2 자동 룰 + 대표님)
- **부록 M** Mermaid 다이어그램 (시각화)
- **부록 N** graph.json 명세
- **부록 O** 시스템 토폴로지 ASCII 다이어그램

추가 산출물:
- `docs/graph.json` (기계 판독 SoT)
- `modules-html/topology/index.html` (Cytoscape.js 시각화 화면)

---

## 절대 규칙

1. 기존 v5.5 (108섹션 + 12부록) 그대로 유지
2. 22 섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 변경 금지
3. 추가/확장만 적용 (기존 코드 영향 0)
4. 13단계 디자인 작업과 충돌 금지 (estimate.html · boc-shell.html 직접 수정 금지)
5. 작업 전 git pull → 작업 후 commit + push

---

## 작업 1: docs/MASTER_PLAN.md 끝에 §109 ~ §113 + 부록 M·N·O 추가

### 1-1. 변경 이력 표에 v5.6 행 추가

```markdown
| **v5.6** | **2026-04-28** | **§109~§113 노드/엣지 그래프 + 메타 온톨로지 호환 + AI 가상 임원 + L3 외부 우주, 부록 M~O 추가** |
```

### 1-2. v5.5 → v5.6 변경 사항 표 추가

```markdown
### v5.6 주요 변경 사항 (2026-04-28)

| 항목 | 이전(v5.5) | 이후(v5.6) | 변경 유형 |
|------|-----------|-----------|----------|
| 시스템 구조 | 평면 9탭 | **노드/엣지 그래프 (11 노드 + 24 엣지)** | 신규 §109 |
| 메타 호환 | 없음 | **6+α 인터페이스 (URI/JSON-LD/RDF/Universe)** | 신규 §110 |
| AI 가상 임원 | 없음 | **14번째 엔진, 자동/승격 분리** | 신규 §111 |
| 외부 우주 진입 | 미정 | **2026 하반기 포도농장 OS** | 신규 §112 |
| 메타엣지 결정권 | 미정 | **자동 룰 + 대표님 단독** | 신규 §113 |
| 시각화 | 없음 | **Mermaid + Cytoscape.js 토폴로지 화면** | 부록 M·N·O |

> **v5.5 → v5.6 호환성**: 모든 v5.5 결정사항 100% 유지. 추가/확장만 적용.
```

### 1-3. §109 노드/엣지 그래프 아키텍처

본문 끝(부록 L 다음)에 다음 섹션 추가:

```markdown
---

## 109. 노드/엣지 그래프 아키텍처 (v5.6 신규)

### 109.1 전환 배경

v5.5까지 BOC는 9개 평면 탭이었으나, 100호점·7사업·메타 우주 연방까지 확장하려면
**노드/엣지 그래프**로 재구조화가 필수. 5번 마스터플랜 다시 쓴 진짜 원인은
평면 코드가 그래프적 사고와 어긋났기 때문.

### 109.2 11 노드

| 분류 | 노드 ID | 책임 |
|------|--------|------|
| 게이트 | g1_type | G1 — 주거형태 + 평형 결정 |
| 게이트 | g2_concept | G2 — 컨셉 12 + 기능옵션 |
| 게이트 | g3_section | G3 — 시공 섹션 22 다중선택 |
| 게이트 | g4_cad | G4 — CAD 자동 작성 + 미세조정 |
| 게이트 | g5_material | G5 — 자재 직접 선택 (2단계) |
| 모듈 | estimate | 견적 마법자 (1단계/2단계 분리) |
| 모듈 | cad | CAD 단독 모듈 (L1~L7) |
| 모듈 | kpi | KPI 디지털 계기판 11항목 |
| 엔진 | calc_engine | CalcEngine + 보정계수 |
| 엔진 | ontology_engine | 온톨로지 26 룰 + 비즈니스 그래프 |
| 엔진 | approval_engine | ApprovalLog + Master DB 보호 |
| AI | ai_executive | 14번째 엔진 (§111) |

### 109.3 24 엣지

모든 모듈 간 통신은 단일 이벤트 버스(@ecorean/core-bus) 통과.
각 엣지는 Zod 스키마 + Contract Test로 보호.

상세: docs/graph.json 참조 (부록 N).

### 109.4 5단 자동화 게이트 (Cascade Automation)

| 게이트 | 시간 | 자동화율 |
|-------|------|---------|
| G1. 유형 | 5초 | 0 → 30% |
| G2. 컨셉 | 5초 | 30 → 70% |
| G3. 섹션 | 10초 | 70 → 85% |
| G4. CAD | 1~2분 | 85 → 95% (1단계 견적 완성) |
| G5. 자재 | 5~10분, 옵션 | 95 → 99% (2단계 견적 완성) |

각 게이트는 독립 패키지(@ecorean/gate-XX), 독립 테스트, 독립 배포.
미래 G6(모듈러하우스 2034), G7(디벨로퍼 2036)는 그래프에 노드 추가만.

### 109.5 6 분리 원칙

| # | 원칙 | 적용 사례 |
|---|------|---------|
| P1 | 데이터/코드 분리 | DB 시드 622건, 26 룰 DB 적재 |
| P2 | 분류/계산 분리 | 22 섹션 vs 13 엔진 |
| P3 | 자동/수동 분리 | AUTO/CONDITIONAL/MANUAL 3단 |
| P4 | 고객/내부 분리 | 견적서 2종 |
| P5 | 확실/추정 분리 | [확실/가정/추정] 플래그 |
| P6 | 버전/실행 분리 | graph.json vNN ↔ 코드 vNN |

### 109.6 8 버그 방지 패턴

| # | 패턴 | 도입 시점 |
|---|------|---------|
| B1 | TypeScript Strict | Phase 3-A 점진 |
| B2 | Zod 스키마 (런타임 검증) | Phase 3-A |
| B3 | Contract Test (엣지마다) | Phase 3-A |
| B4 | Single Source of Truth (graph.json) | Phase 3-A |
| B5 | Auto-generated Constants | Phase 3-A |
| B6 | Snapshot Test (UI 회귀) | Phase 3-B |
| B7 | Migration Up/Down 강제 | 즉시 |
| B8 | Feature Flag (점진 출시) | Phase 3-A |
```

### 1-4. §110 메타 온톨로지 호환

```markdown
---

## 110. 메타 온톨로지 호환 인터페이스 (v5.6 신규)

### 110.1 7단계 우주 진화

| 단계 | 시점 | 의미 |
|------|------|------|
| L1 | 현재 | 단일 우주 (BOC v5.6) |
| L2 | 2026~2030 | 단일 우주 다중 사업 통합 (7사업 노드군) |
| L3 | **2026 하반기** | **다중 우주 시작 (포도농장 OS)** |
| L4 | 2031 | 다중 우주 가맹점화 (100호점) |
| L5 | 2033 | 산업 우주 연결 (모듈러하우스 BIM) |
| L6 | 2037 | 메타 우주 (디벨로퍼/에너지) |
| L7 | 장기 | 우주 간 연방 (다른 운영자들) |

### 110.2 v5.6에 박는 6+α 인터페이스

| # | 인터페이스 | v5.6 적용 |
|---|----------|----------|
| 1 | URI 식별 | urn:ecorean:universe:N:node:X |
| 2 | JSON-LD 1.1 출력 | graph.json 표준 |
| 3 | RDF Triple 매핑 | DB triples 테이블 |
| 4 | Universe ID + trust links | graph.json universe.trust |
| 5 | Schema Registry 분리 | docs/schemas/*.schema.json |
| 6 | Intra/Inter Edge scope | Edge.scope 필드 |
| +α | DID + VC | 자리만 (L4 이후) |
| +α | SPARQL/Cypher | 자리만 (L4) |
| +α | SHACL 검증 | 자리만 (L5) |

### 110.3 두 그래프 동시 저장 (Neo4j 활성화는 L4)

- 비즈니스 그래프: 대표님 26 룰 (마스터플랜 §50~§90)
- 시스템 토폴로지 그래프: graph.json (§109)

교차 쿼리 가능:
"욕실 시공 변경이 KPI에 영향 주는 경로?"
→ 욕실 → 방수 룰 → CalcEngine → KPI

v5.6에서는 SQLite triples 테이블로 자체 저장.
L4(2031) 시점 Neo4j 활성화.
```

### 1-5. §111 AI 가상 임원

```markdown
---

## 111. AI 가상 임원 — 14번째 엔진 (v5.6 신규, D1 하이브리드)

### 111.1 정의

AI 가상 임원 = BOC 14번째 엔진.
기본 자동 처리, 중대 결정만 대표님 승격.

### 111.2 자동 결정 영역 (대표님 승인 불필요)

- 기존 자재 단가 변경
- 공정 자동 매핑
- 온톨로지 룰 적용
- ML Phase 분기

### 111.3 대표님 승격 영역 (escalation 필수)

- 새 자재 등록
- 새 컨셉 추가
- 새 사업 노드 추가
- 메타엣지 신설
- 다른 우주 연결
- 예산 1000만원 초과 결정

### 111.4 작동 메커니즘

1. AI 임원이 모든 게이트 + 모듈에서 CONTEXT_OBSERVED 이벤트 수신
2. 내부 ML로 추천 생성
3. 자동 처리 영역: estimate에 직접 RECOMMENDATION emit
4. 승격 영역: approval_engine에 ESCALATION emit → 대표님 승인 요청
```

### 1-6. §112 L3 포도농장 OS

```markdown
---

## 112. L3 외부 우주 진입 — 포도농장 OS (v5.6 신규, D3)

### 112.1 진입 시점 확정

**2026년 하반기** — 인테리어 1호점 안정 후 즉시 진입.
대표님이 이미 구상 중인 아버지 포도농장 온라인 유통이 두 번째 우주.

### 112.2 6 메타엣지

| 메타엣지 | ECOREAN 우주 | 포도농장 우주 |
|---------|-------------|--------------|
| FAMILY_TRUST | 대표님 | 아버지 |
| VEHICLE_SHARE | 1톤 더블캡 (인테리어 자재 운송) | 1톤 더블캡 (포도 운송) |
| CAPITAL_FLOW | 운영비 | 농작물 수입 |
| LABOR_POOL | 시공 인력 (비수기) | 농번기 인력 |
| DATA_CROSS | 고객 DB | 농작물 구매자 DB |
| LOGISTICS_HUB | 사무실 | 농장 |

### 112.3 검증 가치

L3 = 메타 온톨로지가 사업적으로 작동하는지 검증.
검증 통과 시 L4(가맹점 100호) → L5(산업 연결) → L7(연방)이 같은 메커니즘 반복.

### 112.4 사전 조건

- 아버지 협력 동의 필수 (2026-Q3 확인)
- ECOREAN 인테리어 첫 시공 1건 완료 (Phase 3 Week 8)
```

### 1-7. §113 메타엣지 결정권

```markdown
---

## 113. 메타엣지 결정권 (v5.6 신규, D2 자동 룰 + 대표님)

### 113.1 자동 룰 영역 (대표님 승인 불필요)

- 가맹점 인스턴스화 (조건: 본사 v5.6+ 출시)
- 가맹점 데이터 동기화
- 비수기 인력 ↔ 농번기 인력 자동 이동
  (조건: ECOREAN 인력 30% 미가동)
- 차량 일정 통합 (조건: 1톤 더블캡 사용 중)

### 113.2 대표님 단독 영역

- 새 우주 연결
- 새 메타엣지 타입 신설
- 가맹점 신규 출시
- 외부 협력사(건축사·자재사) 그래프 통합

### 113.3 결정 기록 (Audit Log)

모든 메타엣지 결정은 approval_engine을 통과.
graph.json edges[]에 type='META' 명시.
```

### 1-8. 부록 M — Mermaid 다이어그램 (시각화)

```markdown
---

## 부록 M — Mermaid 다이어그램 (v5.6 신규 시각화)

### M-1. 시스템 토폴로지

\`\`\`mermaid
graph TD
    G1[G1 유형] --> G2[G2 컨셉]
    G2 --> G3[G3 섹션]
    G3 --> G4[G4 CAD]
    G4 --> G5[G5 자재]

    G3 --> EST[견적 모듈]
    G4 --> EST
    G5 --> EST

    G4 --> CAD[CAD 모듈]
    CAD --> EST

    EST --> KPI[KPI 디지털 계기판]
    EST --> CALC[CalcEngine]
    CALC --> EST

    ONTO[OntologyEngine] --> CALC
    CALC --> APP[ApprovalEngine]
    ONTO --> APP

    G1 --> AI[AI 가상 임원]
    G2 --> AI
    G3 --> AI
    G4 --> AI
    G5 --> AI
    EST --> AI
    KPI --> AI

    AI --> EST
    AI --> APP

    style AI fill:#ffd700,stroke:#333,stroke-width:2px
    style EST fill:#90ee90,stroke:#333,stroke-width:2px
    style CAD fill:#87ceeb,stroke:#333,stroke-width:2px
\`\`\`

### M-2. 5단 자동화 게이트 흐름

\`\`\`mermaid
sequenceDiagram
    participant U as 사용자
    participant G1 as G1 유형
    participant G2 as G2 컨셉
    participant G3 as G3 섹션
    participant G4 as G4 CAD
    participant G5 as G5 자재
    participant EST as 견적

    U->>G1: 주거형태 + 평형 (5초)
    G1->>G2: GATE1_LOCKED
    Note over G1,G2: 자동화율 30%

    U->>G2: 컨셉 12 (5초)
    G2->>G3: GATE2_LOCKED
    Note over G2,G3: 자동화율 70%

    U->>G3: 섹션 22 다중 (10초)
    G3->>G4: GATE3_LOCKED
    G3->>EST: SECTIONS_LOCKED
    Note over G3,G4: 자동화율 85%

    U->>G4: CAD 미세조정 (1~2분)
    G4->>EST: GATE4_LOCKED
    Note over G4,EST: 자동화율 95% (1단계 견적 완성)

    U->>G5: 자재 직접 선택 (옵션, 5~10분)
    G5->>EST: GATE5_LOCKED
    Note over G5,EST: 자동화율 99% (2단계 견적 완성)
\`\`\`

### M-3. 7단계 우주 진화

\`\`\`mermaid
graph LR
    L1[L1 단일 우주<br/>BOC v5.6<br/>현재]
    L2[L2 7사업 통합<br/>2026~2030]
    L3[L3 포도농장 OS<br/>2026 Q4]
    L4[L4 가맹점 100호<br/>2031]
    L5[L5 산업 연결<br/>2033 BIM]
    L6[L6 메타 우주<br/>2037 디벨로퍼]
    L7[L7 우주 연방<br/>장기]

    L1 --> L2
    L1 --> L3
    L2 --> L4
    L4 --> L5
    L5 --> L6
    L6 --> L7

    style L1 fill:#ffd700
    style L3 fill:#90ee90
\`\`\`

### M-4. Closed Loop OS (대표님 사고 그대로)

\`\`\`mermaid
graph LR
    EST[견적] --> CON[계약]
    CON --> PUR[발주]
    PUR --> SCH[공정]
    SCH --> SITE[현장]
    SITE --> INS[검수]
    INS --> WAR[하자]
    WAR --> SET[정산]
    SET --> FB[피드백]
    FB --> MDB[(Master DB)]
    MDB -->|ML 학습| EST

    style MDB fill:#ffd700
    style EST fill:#90ee90
\`\`\`

### M-5. 메타 우주 연결 (L3 포도농장)

\`\`\`mermaid
graph TB
    subgraph U1[Universe-1: ECOREAN]
        IN[인테리어]
        CL[청소]
        FU[퍼니쳐]
    end

    subgraph U2[Universe-2: 포도농장 OS]
        VINE[농산물 유통]
        FARM[농장 운영]
    end

    U1 -.FAMILY_TRUST.-> U2
    U1 -.VEHICLE_SHARE.-> U2
    U1 -.LABOR_POOL.-> U2
    U2 -.CAPITAL_FLOW.-> U1
    U2 -.DATA_CROSS.-> U1
    U2 -.LOGISTICS_HUB.-> U1

    style U1 fill:#87ceeb
    style U2 fill:#90ee90
\`\`\`
```

### 1-9. 부록 N — graph.json 명세

```markdown
---

## 부록 N — graph.json 명세 (v5.6 신규)

위치: docs/graph.json
역할: 기계 판독 SoT (시스템 토폴로지 헌법)

### N-1. 11 노드 명세

| ID | URI | 타입 | 패키지 | SLA |
|----|-----|------|--------|-----|
| g1_type | urn:ecorean:universe:1:node:g1_type | gate | @ecorean/gate-type | 100ms |
| g2_concept | urn:ecorean:universe:1:node:g2_concept | gate | @ecorean/gate-concept | 200ms |
| g3_section | urn:ecorean:universe:1:node:g3_section | gate | @ecorean/gate-section | 200ms |
| g4_cad | urn:ecorean:universe:1:node:g4_cad | gate | @ecorean/gate-cad | 500ms |
| g5_material | urn:ecorean:universe:1:node:g5_material | gate | @ecorean/gate-material | 300ms |
| estimate | urn:ecorean:universe:1:node:estimate | module | @ecorean/estimate | 500ms |
| cad | urn:ecorean:universe:1:node:cad | module | @ecorean/cad | 300ms |
| kpi | urn:ecorean:universe:1:node:kpi | module | @ecorean/kpi | 100ms |
| calc_engine | urn:ecorean:universe:1:node:calc_engine | engine | @ecorean/calc-engine | 200ms |
| ontology_engine | urn:ecorean:universe:1:node:ontology_engine | engine | @ecorean/ontology | 200ms |
| approval_engine | urn:ecorean:universe:1:node:approval_engine | engine | @ecorean/approval | 100ms |
| ai_executive | urn:ecorean:universe:1:node:ai_executive | ml | @ecorean/ai-executive | 2000ms |

### N-2. 24 엣지 (요약)

게이트 흐름 (5):
g1→g2, g2→g3, g3→g4, g4→g5, g3→estimate

CAD 통신 (3):
g4→cad, cad→estimate, g4→estimate

견적 흐름 (4):
g5→estimate, estimate→calc, calc→estimate, estimate→kpi

엔진 통신 (4):
ontology→calc, calc→approval, ontology→approval, approval→ontology

AI 임원 (8):
g1~g5→ai (5), estimate→ai, kpi→ai, ai→estimate, ai→approval

### N-3. 미래 노드 (futureNodes)

7사업 확장 시 추가될 노드 미리 명세:
- contract, purchase, schedule, inspection (2026)
- settlement, warranty, feedback (2027)
- cleaning (2026), unmanned_store (2027), furniture (2027)
- hr_management (2029), franchise (2031)
- modular_house (2033), vc (2035), developer (2036)
```

### 1-10. 부록 O — ASCII 시스템 토폴로지

```markdown
---

## 부록 O — ASCII 시스템 토폴로지 (v5.6 신규)

\`\`\`
┌──────────────────────────────────────────────────────────────────┐
│  ECOREAN BOC — System Topology v5.6                              │
│  Universe: ecorean (HQ)  /  Tenant: HQ                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   GATES (Cascade Automation)                                     │
│   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                    │
│   │ G1  │─▶│ G2  │─▶│ G3  │─▶│ G4  │─▶│ G5  │                    │
│   │유형 │  │컨셉 │  │섹션 │  │ CAD │  │자재 │                    │
│   └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘                    │
│      │        │        │        │        │                       │
│      │        │        ▼        │        │                       │
│      │        │   ┌─────────┐   │        │                       │
│      │        │   │ Estimate│◀──┘        │                       │
│      │        │   └────┬────┘            │                       │
│      │        │        │ ▲               │                       │
│      │        │        ▼ │               │                       │
│      │        │   ┌─────────┐   ┌─────┐  │                       │
│      │        │   │   CAD   │◀──┤ G4  │  │                       │
│      │        │   └─────────┘   └─────┘  │                       │
│      │        │        │                 │                       │
│      │        │        ▼                 │                       │
│      │        │   ┌─────────┐            │                       │
│      │        │   │   KPI   │            │                       │
│      │        │   └─────────┘            │                       │
│      │        │                          │                       │
│      ▼        ▼                          ▼                       │
│   ┌──────────────────────────────────────────────┐               │
│   │         AI Executive (14번째 엔진)            │               │
│   │  자동: 단가/공정/룰/ML        승격: 대표님    │               │
│   └──────────────────────┬───────────────────────┘               │
│                          │                                       │
│                          ▼                                       │
│   ┌─────────┐    ┌─────────────┐    ┌────────────┐               │
│   │CalcEng  │◀──▶│OntologyEng  │───▶│ApprovalEng │               │
│   └─────────┘    └─────────────┘    └────────────┘               │
│                                                                  │
│   ─────────────────────────────────────────────────              │
│   Status: 🟢 11 healthy / 0 broken                               │
│   Edges:  24 / 24 active                                         │
│   Throughput: 158 events/min                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

INTER-UNIVERSE METAEDGES (Future)
─────────────────────────────────
[ecorean] ─── FAMILY_TRUST ────▶ [vine-farm]    (2026 Q4, D3)
          ─── VEHICLE_SHARE ────▶
          ─── LABOR_POOL ───────▶
[vine-farm] ── CAPITAL_FLOW ────▶ [ecorean]
            ── DATA_CROSS ──────▶
            ── LOGISTICS_HUB ───▶
\`\`\`
```

### 1-11. footer 갱신

```markdown
*ECOREAN BOC Master Plan v5.6 — 노드/엣지 그래프 + 메타 온톨로지*
*총 113섹션 + 15부록 | 2026-04-28 by udunext7-wq*
```

---

## 작업 2: docs/graph.json 신규 생성

루트에 docs/graph.json 파일 생성. 내용은 다음 11 노드 + 24 엣지 + universe 정의를 포함하는 JSON-LD 1.1 호환 형식. (실제 파일 생성 시 아래 구조 그대로 적재)

```json
{
  "@context": {
    "@vocab": "https://ecorean.io/ontology/v1#",
    "ecorean": "https://ecorean.io/ontology/v1#",
    "schema": "https://schema.org/"
  },
  "@type": "BusinessGraph",
  "@id": "urn:ecorean:universe:1",
  "version": "5.6",
  "generatedAt": "2026-04-28",
  "tenantId": "HQ",
  "universe": {
    "id": "ecorean",
    "uri": "urn:business:ecorean",
    "name": "ECOREAN BOC",
    "operator": "udunext7-wq",
    "trust": {
      "outgoing": [
        {
          "@id": "urn:business:vine-farm",
          "name": "포도농장 OS",
          "expectedConnectionDate": "2026-Q4",
          "metaedges": ["FAMILY_TRUST","VEHICLE_SHARE","CAPITAL_FLOW","LABOR_POOL","DATA_CROSS","LOGISTICS_HUB"]
        }
      ]
    }
  },
  "nodes": [
    { "id":"g1_type","uri":"urn:ecorean:universe:1:node:g1_type","type":"gate","package":"@ecorean/gate-type","sla":{"maxLatencyMs":100} },
    { "id":"g2_concept","uri":"urn:ecorean:universe:1:node:g2_concept","type":"gate","package":"@ecorean/gate-concept","sla":{"maxLatencyMs":200},"dependsOn":["g1_type"] },
    { "id":"g3_section","uri":"urn:ecorean:universe:1:node:g3_section","type":"gate","package":"@ecorean/gate-section","sla":{"maxLatencyMs":200},"dependsOn":["g2_concept"] },
    { "id":"g4_cad","uri":"urn:ecorean:universe:1:node:g4_cad","type":"gate","package":"@ecorean/gate-cad","sla":{"maxLatencyMs":500},"dependsOn":["g3_section"] },
    { "id":"g5_material","uri":"urn:ecorean:universe:1:node:g5_material","type":"gate","package":"@ecorean/gate-material","sla":{"maxLatencyMs":300},"dependsOn":["g4_cad"] },
    { "id":"estimate","uri":"urn:ecorean:universe:1:node:estimate","type":"module","package":"@ecorean/estimate","sla":{"maxLatencyMs":500} },
    { "id":"cad","uri":"urn:ecorean:universe:1:node:cad","type":"module","package":"@ecorean/cad","sla":{"maxLatencyMs":300},"layers":{"L1":"ACTIVE","L2":"PLANNED","L3":"PLANNED","L4":"FUTURE","L5":"FUTURE","L6":"FUTURE","L7":"FUTURE"} },
    { "id":"kpi","uri":"urn:ecorean:universe:1:node:kpi","type":"module","package":"@ecorean/kpi","sla":{"maxLatencyMs":100} },
    { "id":"calc_engine","uri":"urn:ecorean:universe:1:node:calc_engine","type":"engine","package":"@ecorean/calc-engine","sla":{"maxLatencyMs":200} },
    { "id":"ontology_engine","uri":"urn:ecorean:universe:1:node:ontology_engine","type":"engine","package":"@ecorean/ontology","sla":{"maxLatencyMs":200} },
    { "id":"approval_engine","uri":"urn:ecorean:universe:1:node:approval_engine","type":"engine","package":"@ecorean/approval","sla":{"maxLatencyMs":100},"humanApprover":"operator:udunext7-wq" },
    { "id":"ai_executive","uri":"urn:ecorean:universe:1:node:ai_executive","type":"ml","package":"@ecorean/ai-executive","sla":{"maxLatencyMs":2000},"autonomyScope":["기존자재단가변경","공정자동매핑","온톨로지룰적용","ML분기"],"escalationScope":["새자재등록","새컨셉추가","새사업노드추가","메타엣지신설","다른우주연결","예산1000만원초과"] }
  ],
  "edges": [
    {"id":"e_g1_g2","source":"g1_type","target":"g2_concept","event":"GATE1_LOCKED","scope":"INTRA"},
    {"id":"e_g2_g3","source":"g2_concept","target":"g3_section","event":"GATE2_LOCKED","scope":"INTRA"},
    {"id":"e_g3_g4","source":"g3_section","target":"g4_cad","event":"GATE3_LOCKED","scope":"INTRA"},
    {"id":"e_g3_estimate","source":"g3_section","target":"estimate","event":"SECTIONS_LOCKED","scope":"INTRA"},
    {"id":"e_g4_cad","source":"g4_cad","target":"cad","event":"CAD_INIT","scope":"INTRA"},
    {"id":"e_g4_estimate","source":"g4_cad","target":"estimate","event":"GATE4_LOCKED","scope":"INTRA"},
    {"id":"e_cad_estimate","source":"cad","target":"estimate","event":"SPACE_UPDATED","scope":"INTRA"},
    {"id":"e_g5_estimate","source":"g5_material","target":"estimate","event":"GATE5_LOCKED","scope":"INTRA"},
    {"id":"e_estimate_calc","source":"estimate","target":"calc_engine","event":"CALC_REQUEST","scope":"INTRA"},
    {"id":"e_calc_estimate","source":"calc_engine","target":"estimate","event":"CALC_RESULT","scope":"INTRA"},
    {"id":"e_ontology_calc","source":"ontology_engine","target":"calc_engine","event":"RULES_LOADED","scope":"INTRA"},
    {"id":"e_estimate_kpi","source":"estimate","target":"kpi","event":"KPI_UPDATE","scope":"INTRA"},
    {"id":"e_calc_approval","source":"calc_engine","target":"approval_engine","event":"MASTERDB_UPDATE_REQ","scope":"INTRA"},
    {"id":"e_ontology_approval","source":"ontology_engine","target":"approval_engine","event":"NEW_RULE_PROPOSED","scope":"INTRA"},
    {"id":"e_approval_ontology","source":"approval_engine","target":"ontology_engine","event":"RULE_APPROVED","scope":"INTRA"},
    {"id":"e_ai_estimate","source":"ai_executive","target":"estimate","event":"AI_RECOMMEND","scope":"INTRA"},
    {"id":"e_ai_approval","source":"ai_executive","target":"approval_engine","event":"AI_ESCALATION","scope":"INTRA"},
    {"id":"e_g1_ai","source":"g1_type","target":"ai_executive","event":"CONTEXT_OBSERVED","scope":"INTRA"},
    {"id":"e_g2_ai","source":"g2_concept","target":"ai_executive","event":"CONTEXT_OBSERVED","scope":"INTRA"},
    {"id":"e_g3_ai","source":"g3_section","target":"ai_executive","event":"CONTEXT_OBSERVED","scope":"INTRA"},
    {"id":"e_g4_ai","source":"g4_cad","target":"ai_executive","event":"CONTEXT_OBSERVED","scope":"INTRA"},
    {"id":"e_g5_ai","source":"g5_material","target":"ai_executive","event":"CONTEXT_OBSERVED","scope":"INTRA"},
    {"id":"e_estimate_ai","source":"estimate","target":"ai_executive","event":"RESULT_OBSERVED","scope":"INTRA"},
    {"id":"e_kpi_ai","source":"kpi","target":"ai_executive","event":"KPI_OBSERVED","scope":"INTRA"}
  ],
  "absoluteRules": [
    "방수=AUTO 금지·CONDITIONAL만 허용",
    "NEEDS_CONFIRMATION 누락 금지",
    "Master DB 무승인 업데이트 금지",
    "버그 있는 코드 커밋 금지·TDD 강제",
    "단가 추정 금지·UNKNOWN/NEEDS_RESEARCH 우선",
    "고객용/내부용 분리",
    "검수 실패 후 후속 공정 진행 금지",
    "rollback SQL 없는 DB 변경 금지"
  ],
  "metaCompatibilityInterfaces": [
    "URI 식별",
    "JSON-LD 1.1 출력",
    "RDF Triple 매핑",
    "Universe ID + trust links",
    "Schema Registry 분리",
    "Intra/Inter Edge scope 명시"
  ]
}
```

---

## 작업 3: modules-html/topology/index.html 신규 생성

Cytoscape.js 기반 시스템 토폴로지 시각화 화면. 대표님이 한 화면에서 11 노드 + 24 엣지를 시각적으로 보고 클릭으로 상세 확인 가능.

### 3-1. 디렉토리 생성

```bash
mkdir -p modules-html/topology
```

### 3-2. modules-html/topology/index.html 생성

다음 단일 HTML 파일 작성. Cytoscape CDN 사용. graph.json 자동 fetch.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>ECOREAN BOC — System Topology v5.6</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
<style>
:root {
  --bg: #0a0e1a;
  --bg2: #14182a;
  --gold: #c9a84c;
  --gold-bright: #ffd700;
  --text: #ede5d5;
  --dim: rgba(201,168,76,0.5);
  --gate: #4a90e2;
  --module: #50c878;
  --engine: #e8a534;
  --ml: #c9a84c;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Noto Sans KR', sans-serif;
  height: 100vh;
  overflow: hidden;
}
header {
  height: 60px;
  background: linear-gradient(180deg, #0a0e1a 0%, #14182a 100%);
  border-bottom: 1px solid rgba(201,168,76,0.3);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
}
h1 {
  font-family: 'Cinzel', serif;
  color: var(--gold);
  font-size: 18px;
  letter-spacing: 0.16em;
  text-shadow: 0 0 12px rgba(201,168,76,0.4);
}
.spacer { flex: 1; }
.status {
  font-family: monospace;
  font-size: 12px;
  color: var(--dim);
}
.status .ok { color: #4caf50; }
main {
  display: flex;
  height: calc(100vh - 60px);
}
#cy {
  flex: 1;
  background: var(--bg);
}
aside {
  width: 320px;
  background: var(--bg2);
  border-left: 1px solid rgba(201,168,76,0.15);
  padding: 16px;
  overflow-y: auto;
}
aside h2 {
  font-family: 'Cinzel', serif;
  color: var(--gold);
  font-size: 14px;
  letter-spacing: 0.12em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(201,168,76,0.15);
}
.detail-row {
  margin-bottom: 12px;
  font-size: 12px;
}
.detail-row .label {
  color: var(--dim);
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.12em;
  margin-bottom: 2px;
}
.detail-row .value {
  color: var(--text);
}
.legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(20,24,42,0.9);
  border: 1px solid rgba(201,168,76,0.2);
  padding: 12px;
  border-radius: 4px;
  font-size: 11px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
</style>
</head>
<body>
<header>
  <h1>ECOREAN BOC — SYSTEM TOPOLOGY v5.6</h1>
  <div class="spacer"></div>
  <div class="status">
    Nodes: <span class="ok" id="nodeCount">11</span> /
    Edges: <span class="ok" id="edgeCount">24</span> /
    Universe: <span class="ok">ecorean (HQ)</span>
  </div>
</header>
<main>
  <div id="cy"></div>
  <aside id="detail">
    <h2>노드 상세</h2>
    <div id="detailContent">
      <p style="color: var(--dim); font-size: 12px;">노드를 클릭하면 상세 정보가 표시됩니다.</p>
    </div>
  </aside>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#4a90e2"></div>Gate (5)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#50c878"></div>Module (3)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#e8a534"></div>Engine (3)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#c9a84c"></div>AI (1)</div>
  </div>
</main>
<script>
async function loadGraph() {
  // graph.json 위치는 docs/graph.json
  // electron 환경에서 file:// 프로토콜로 접근
  const response = await fetch('../../docs/graph.json');
  const data = await response.json();

  const elements = [];
  const typeColors = {
    gate: '#4a90e2',
    module: '#50c878',
    engine: '#e8a534',
    ml: '#c9a84c'
  };

  // 노드
  data.nodes.forEach(n => {
    elements.push({
      data: {
        id: n.id,
        label: n.id.replace(/_/g, '\n'),
        type: n.type,
        uri: n.uri,
        package: n.package,
        sla: n.sla?.maxLatencyMs || 0,
        color: typeColors[n.type] || '#888'
      }
    });
  });

  // 엣지
  data.edges.forEach(e => {
    elements.push({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.event,
        scope: e.scope || 'INTRA'
      }
    });
  });

  document.getElementById('nodeCount').textContent = data.nodes.length;
  document.getElementById('edgeCount').textContent = data.edges.length;

  const cy = cytoscape({
    container: document.getElementById('cy'),
    elements: elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': 'data(color)',
          'label': 'data(label)',
          'text-valign': 'center',
          'color': '#ede5d5',
          'font-size': '11px',
          'font-family': 'Noto Sans KR, sans-serif',
          'font-weight': 'bold',
          'text-wrap': 'wrap',
          'width': 80,
          'height': 80,
          'border-width': 2,
          'border-color': 'rgba(201,168,76,0.4)',
          'text-outline-width': 2,
          'text-outline-color': '#0a0e1a'
        }
      },
      {
        selector: 'node[type="ml"]',
        style: {
          'shape': 'star',
          'width': 100,
          'height': 100,
          'border-color': '#ffd700',
          'border-width': 3
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color': 'rgba(201,168,76,0.4)',
          'target-arrow-color': 'rgba(201,168,76,0.6)',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '8px',
          'color': 'rgba(201,168,76,0.6)',
          'text-rotation': 'autorotate',
          'text-margin-y': -8
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-color': '#ffd700',
          'border-width': 4
        }
      }
    ],
    layout: {
      name: 'concentric',
      concentric: function(node) {
        if (node.data('type') === 'ml') return 0;
        if (node.data('type') === 'engine') return 1;
        if (node.data('type') === 'module') return 2;
        if (node.data('type') === 'gate') return 3;
        return 0;
      },
      levelWidth: function() { return 1; },
      spacingFactor: 1.5,
      animate: true
    }
  });

  cy.on('tap', 'node', function(evt) {
    const node = evt.target.data();
    document.getElementById('detailContent').innerHTML = `
      <div class="detail-row"><div class="label">ID</div><div class="value">${node.id}</div></div>
      <div class="detail-row"><div class="label">Type</div><div class="value">${node.type}</div></div>
      <div class="detail-row"><div class="label">URI</div><div class="value" style="word-break:break-all">${node.uri}</div></div>
      <div class="detail-row"><div class="label">Package</div><div class="value">${node.package}</div></div>
      <div class="detail-row"><div class="label">SLA</div><div class="value">${node.sla}ms</div></div>
    `;
  });

  cy.on('tap', 'edge', function(evt) {
    const edge = evt.target.data();
    document.getElementById('detailContent').innerHTML = `
      <div class="detail-row"><div class="label">Edge</div><div class="value">${edge.id}</div></div>
      <div class="detail-row"><div class="label">Source</div><div class="value">${edge.source}</div></div>
      <div class="detail-row"><div class="label">Target</div><div class="value">${edge.target}</div></div>
      <div class="detail-row"><div class="label">Event</div><div class="value">${edge.label}</div></div>
      <div class="detail-row"><div class="label">Scope</div><div class="value">${edge.scope}</div></div>
    `;
  });
}

loadGraph().catch(err => {
  console.error('Graph load failed:', err);
  document.getElementById('detailContent').innerHTML = `<p style="color:#f44336">graph.json 로드 실패: ${err.message}</p>`;
});
</script>
</body>
</html>
```

---

## 작업 4: 검증

```bash
# 1. graph.json 형식 검증
node -e "const g = require('./docs/graph.json'); console.log('nodes:', g.nodes.length, 'edges:', g.edges.length, 'version:', g.version)"
# 기대 출력: nodes: 11 edges: 24 version: 5.6

# 2. 마스터플랜 라인 수 확인
wc -l docs/MASTER_PLAN.md
# 기대: 이전 대비 약 700~1000줄 증가

# 3. 토폴로지 HTML 존재 확인
ls -la modules-html/topology/index.html

# 4. 기존 9탭 회귀 테스트 (영향 없음 확인)
node test-engine.js
# 기대: 5/5 통과

# 5. npm start로 앱 실행 (선택)
# 13단계 디자인 작업과 충돌 없는지만 확인
```

---

## 작업 5: 커밋 + 푸시

```bash
git add docs/MASTER_PLAN.md docs/graph.json modules-html/topology/

git commit -m "docs(v5.6): 노드/엣지 그래프 + 메타 온톨로지 + AI 임원 + 시스템 토폴로지 시각화

- §109 노드/엣지 그래프 아키텍처 (11 노드 + 24 엣지)
- §110 메타 온톨로지 호환 (L1~L7, 6+α 인터페이스)
- §111 AI 가상 임원 (14번째 엔진, D1 하이브리드)
- §112 L3 포도농장 OS 진입 (2026 Q4, D3)
- §113 메타엣지 결정권 (자동 룰 + 대표님, D2)
- 부록 M Mermaid 다이어그램 5종
- 부록 N graph.json 명세
- 부록 O ASCII 시스템 토폴로지
- docs/graph.json 신규 (기계 판독 SoT)
- modules-html/topology/index.html 신규 (Cytoscape.js 시각화)

총 113섹션 + 15부록
v5.5 → v5.6 호환: 모든 v5.5 결정사항 100% 유지"

git push origin master
```

---

## 작업 후 보고

다음 형식으로 보고:

```
✅ MASTER_PLAN v5.6 갱신 완료

[추가된 섹션]
- §109 노드/엣지 그래프 아키텍처
- §110 메타 온톨로지 호환
- §111 AI 가상 임원
- §112 L3 포도농장 OS
- §113 메타엣지 결정권

[추가된 부록]
- 부록 M (Mermaid 5종)
- 부록 N (graph.json 명세)
- 부록 O (ASCII 토폴로지)

[신규 파일]
- docs/graph.json (X bytes)
- modules-html/topology/index.html (Y bytes)

[검증]
- graph.json: 11 노드 + 24 엣지 확인
- test-engine.js: 5/5 통과
- 마스터플랜 라인 수: N줄 (이전 N-X줄)

[커밋]
- 해시: <hash>
- 푸시: 완료

[다음 단계]
Phase 3 Week 1 - 핵심 인프라 (core-bus + Zod + Feature Flag)
```

---

## 절대 금지

- estimate.html 직접 수정 금지 (13단계 디자인 작업과 충돌)
- shell/boc-shell.html 직접 수정 금지
- 22 섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 변경 금지
- v5.5 기존 108섹션 + 12부록 변경 금지

---

**문서 끝.**
**작업 시작:** 위 5단계를 순차 실행. 단계마다 검증 → 다음 단계.
