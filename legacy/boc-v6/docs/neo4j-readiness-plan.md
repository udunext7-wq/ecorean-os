# Neo4j Readiness Plan — ECOREAN BOC

## 현재 아키텍처: localStorage → SQLite
- 단일 사용자 Electron 앱
- Zustand persist → localStorage
- Phase 2: better-sqlite3 전환 예정

## 향후 아키텍처: Neo4j
- **전환 시점: 프랜차이즈 10개 이상 확장 단계**
- 현재: 구조 준비만 완료 (설치 불필요)

## 단계별 로드맵

| 단계 | 조건 | 저장소 |
|------|------|--------|
| Phase 1 (현재) | 단일 운영 | localStorage + Zustand |
| Phase 2 | Electron 안정화 | better-sqlite3 |
| Phase 3 | 다중 지점 3개↑ | SQLite + REST API |
| Phase 4 | 프랜차이즈 10개↑ | Neo4j AuraDB |
| Phase 5 | 엔터프라이즈 | Neo4j Cluster |

## 지금 준비할 것

1. **노드 스키마 정의** → `neo4j-node-map.schema.json`
2. **관계 스키마 정의** → `neo4j-relationship-map.schema.json`
3. **Cypher 샘플** → `sample-import.cypher`
4. **graph-dataset.json** → 현재 온톨로지 규칙 변환본

## Neo4j 이점 (프랜차이즈 단계)

- 온톨로지 규칙 그래프 탐색 (`TRIGGERS`, `PRECEDES`, `DEPENDS_ON`)
- 지점별 견적 패턴 비교 분석
- ML 학습 데이터 관계 추적
- 실시간 공정 의존성 시각화
- 크롤러 데이터 → 마스터 DB 자동 반영 파이프라인
