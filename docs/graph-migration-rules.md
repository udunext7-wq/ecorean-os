# Graph Migration Rules — ECOREAN BOC

## 핵심 원칙 7가지

### R1. Stable ID 보장
모든 노드는 `stableIdPrefix + 시퀀스` 형식의 ID 사용.
예: `PROJ-001`, `PROC-042`, `ONT-007`
SQLite AUTO_INCREMENT ID는 Neo4j 이전 시 매핑 테이블 유지.

### R2. 단방향 관계 우선
관계는 데이터 흐름 방향으로 정의.
`TRIGGERS` (OntologyRule → Process) — 역방향 탐색은 `<-[:TRIGGERS]-` 쿼리로.

### R3. confidenceLevel 필수
모든 관계에 `confidenceLevel` (0.0~1.0) 속성 부여.
- 1.0: 확정 (예: `HAS_SPACE`)
- 0.8~0.9: 높음 (예: `SUPPLIED_BY`)
- 0.5~0.7: 조건부 (예: `AFFECTS_COST`)

### R4. 승인 이력 보존
`ApprovalLog` 노드는 삭제 금지 — 영구 감사 추적.
`UPDATES_MASTER_DB` 관계로 변경 전·후 값 추적.

### R5. 버전 관리
`MasterDbItem`은 `version` 속성 + `effectiveFrom` 날짜.
이전 버전도 노드로 유지, `SUPERSEDES` 관계로 연결.

### R6. 배치 임포트
초기 이전 시 APOC `apoc.periodic.iterate` 사용.
10,000건 이상 데이터는 배치 크기 500으로 분할.

### R7. 인덱스 전략
```cypher
CREATE INDEX FOR (n:Process) ON (n.itemId)
CREATE INDEX FOR (n:Project) ON (n.status)
CREATE INDEX FOR (n:OntologyRule) ON (n.trigger)
CREATE INDEX FOR (n:Case) ON (n.createdAt)
```

## 추가 규칙 (ECOREAN 전용)

### R8. 온톨로지 규칙 → OntologyRule 노드
현재 `ontology-rules.json` 23개 규칙 전체를 Neo4j OntologyRule 노드로.
`triggerProcess`, `autoLinkProcess`, `condition`, `confidenceLevel` 속성 보존.

### R9. ML 모델 → MLModel 노드
학습 완료 모델마다 MLModel 노드 생성.
`LEARNED_FROM` 관계로 사용된 Case 노드 연결.
정확도(`accuracy`), 학습 데이터 수(`dataCount`) 추적.

### R10. 크롤러 결과 → CrawlerResult 노드
가격 크롤러 수집 데이터를 CrawlerResult 노드로.
`CRAWLED_FROM` 관계로 MasterDbItem 업데이트 출처 추적.
`status`: `pending` → `approved` → `rejected` 상태 관리.

### R11. 프랜차이즈 지점 → Franchise 노드
각 지점을 Franchise 노드로.
`BELONGS_TO_MODULE` 관계로 지점별 활성화 모듈 추적.
지역(`region`), 등급(`tier`: basic/standard/premium) 속성.
