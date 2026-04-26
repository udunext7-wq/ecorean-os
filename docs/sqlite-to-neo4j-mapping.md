# SQLite → Neo4j 매핑 테이블 — ECOREAN BOC

## 노드 매핑

| SQLite / JSON | Neo4j Node | stableIdPrefix | 설명 |
|--------------|------------|----------------|------|
| projects | Project | PROJ | 견적 프로젝트 |
| spaces | Space | SPC | 공간 (거실/침실/욕실 등) |
| costItems | Process | PROC | 공정 단가 항목 |
| materialItems | Material | MAT | 자재 |
| ontologyRules | OntologyRule | ONT | 온톨로지 자동 포함 규칙 |
| laborRoles | LaborCrew | LAB | 인건비 역할 |
| brandPriceDb | Brand | BRD | 브랜드 단가 DB |
| subcontractors | Vendor | VND | 외주 업체 |
| approvalLog | ApprovalLog | APL | 승인 기록 |
| completionReports | Case | CASE | 완료 사례 |
| mlTrainingData | LearningSuggestion | LEARN | ML 학습 제안 |
| mlModels | MLModel | ML | ML 모델 메타 |
| crawlerResults | CrawlerResult | CRAWL | 크롤러 수집 결과 |
| franchises | Franchise | FRN | 프랜차이즈 지점 |
| defectTypes | Defect | DEF | 하자 유형 |
| risks | Risk | RISK | 리스크 |
| — | PurchaseOrder | PO | 발주서 |
| — | Inspection | INSP | 검수 |
| — | PaymentMilestone | PAY | 기성 마일스톤 |
| masterDbItems | MasterDbItem | MDB | 마스터 DB 항목 |

## 핵심 관계

| 관계 | from → to | 설명 |
|------|-----------|------|
| TRIGGERS | OntologyRule → Process | 온톨로지 규칙이 공정을 자동 포함 |
| PRECEDES | Process → Process | 공정 선행 관계 (gantt) |
| DEPENDS_ON | Process → Process | 의존 관계 |
| HAS_SPACE | Project → Space | 프로젝트 ↔ 공간 |
| HAS_PROCESS | Project → Process | 프로젝트 ↔ 공정 |
| LEARNED_FROM | MLModel → Case | ML 모델 학습 출처 |
| UPDATES_MASTER_DB | ApprovalLog → MasterDbItem | 승인 후 DB 반영 |
| CRAWLED_FROM | CrawlerResult → MasterDbItem | 크롤러 → 마스터DB |
| BELONGS_TO_MODULE | Process → OntologyRule | 공정 ↔ 규칙 그룹 |

## 전환 체크리스트

- [ ] Phase 1: Zustand persist (현재)
- [ ] Phase 2: better-sqlite3 로컬 DB
- [ ] Phase 3: REST API 레이어 추가
- [ ] Phase 4: Neo4j AuraDB 마이그레이션
- [ ] Phase 5: GraphQL API 노출
