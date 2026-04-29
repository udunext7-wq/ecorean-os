# ECOREAN BOC — Architecture Inventory v5.7

> **상태:** Phase 3 9주 완주 후
> **모듈:** 52개 (코드 파일) / **테스트:** 33 파일 / 147+ assertions / **회귀:** 0건

---

## 1. 모듈 인벤토리

### 인프라 (3)
| 모듈 | 파일 | 테스트 |
|------|------|-------|
| CoreBus | shell/src/core-bus/CoreBus.cjs | 7/7 |
| Schemas | shell/src/core-bus/schemas.cjs | 5/5 |
| FeatureFlags | shell/src/feature-flags/flags.cjs | 6/6 |

### CAD (4)
| 모듈 | 파일 | 테스트 |
|------|------|-------|
| DrawingModel | modules-html/cad/src/core/DrawingModel.cjs | 9/9 |
| DrawingEngine | modules-html/cad/src/core/DrawingEngine.cjs | 7/7 |
| CADBus | modules-html/cad/src/core/CADBus.cjs | 2/2 |
| L1_Floorplan | modules-html/cad/src/layers/L1_Floorplan.cjs | 5/5 |

### 게이트 (6)
| 모듈 | 자동화율 | 테스트 |
|------|---------|-------|
| Gate (추상) | — | 8/8 |
| G1_Type | 0→30% | 7/7 |
| G2_Concept | 30→70% | included |
| G3_Section | 70→85% | included |
| G4_CAD | 85→95% | included |
| G5_Material | 95→99% | 5/5 (G2~G5) |
| E2E_5min | 통합 | PASS |

### 견적 (6)
| 모듈 | 테스트 |
|------|-------|
| Sections (22) | 8/8 |
| Spaces (23) | 8/8 |
| ConceptMaterialMatrix (12×7=84) | 7/7 |
| ResidenceMatrix (6+5) | 6/6 |
| CalcEngineV56 | 11/11 |
| E2E_estimate_v6 | PASS |

### KPI (3)
| 모듈 | 테스트 |
|------|-------|
| KPIData (11항목) | 10/10 |
| KPIBus | 4/4 |
| E2E_kpi_full | PASS |

### 메타 호환 (4)
| 모듈 | 테스트 |
|------|-------|
| MetaURI | 11/11 |
| Universe | 8/8 |
| JsonLD | 5/5 |
| RDFTriple | 6/6 |

### 한국 특수성 (3)
| 모듈 | 테스트 |
|------|-------|
| KSCodeMapping (8 카테고리) | 7/7 |
| RegionFactor (7 지역) | 8/8 |
| KoreaBuildingRules (7 룰) | 10/10 |

### 보안 (1)
| 모듈 | 테스트 |
|------|-------|
| Encryption (AES-256-GCM) | 9/9 |

### Closed Loop (4)
| 모듈 | 테스트 |
|------|-------|
| Contract | 10/10 |
| PurchaseOrder | 5/5 |
| Schedule | 5/5 |
| Inspection | 8/8 |

### ML + 시뮬레이션 (2)
| 모듈 | 테스트 |
|------|-------|
| MLPhase1 | 5/5 |
| Scenario_001 | PASS |

---

## 2. DB 테이블 인벤토리 (6종)

| 테이블 | 용도 | tenant_id | rollback |
|--------|------|-----------|----------|
| drawings | CAD 도형 (Week 2) | ✅ | ✅ |
| triples | RDF 트리플 (Week 6) | ✅ | ✅ |
| contracts | 계약 (Week 8) | ✅ | ✅ |
| purchase_orders | 발주 (Week 8) | ✅ | ✅ |
| schedules | 공정 (Week 8) | ✅ | ✅ |
| inspections | 검수 (Week 8) | ✅ | ✅ |

---

## 3. graph.json (12 노드 + 24 엣지)

### 활성 노드 (12)
- 게이트 5: g1_type, g2_concept, g3_section, g4_cad, g5_material
- 모듈 3: estimate, cad, kpi
- 엔진 3: calc_engine, ontology_engine, approval_engine
- AI 1: ai_executive

### 미래 노드 (15, 자리만)
- 2026: contract, purchase, schedule, inspection, cleaning
- 2027: settlement, warranty, feedback, unmanned_store, furniture
- 2029: hr_management
- 2031: franchise
- 2033: modular_house
- 2035: vc
- 2036: developer

→ Week 8에서 contract/purchase/schedule/inspection이 활성화됐지만 graph.json은 미래 노드 자리 유지 (Phase 4에서 통합)

---

## 4. 메타 호환 인터페이스 (6+α)

| # | 인터페이스 | 활성화 |
|---|-----------|-------|
| 1 | URI 식별 | ✅ |
| 2 | JSON-LD 1.1 | ✅ (graph.jsonld) |
| 3 | RDF Triple | ✅ (triples 테이블) |
| 4 | Universe ID | ✅ |
| 5 | Schema Registry | ✅ (4종) |
| 6 | Edge scope | ✅ |
| +α | DID + VC | 자리만 (L4) |
| +α | SPARQL/Cypher | 자리만 (L4) |
| +α | SHACL 검증 | 자리만 (L5) |

---

## 5. Feature Flag 활성화 표

| 플래그 | 상태 |
|--------|------|
| PHASE_3A_COMPLETE | ✅ |
| PHASE_3B_COMPLETE | ✅ |
| PHASE_3C_COMPLETE | ✅ |
| PHASE_3D_COMPLETE | ✅ |
| PHASE_3E_COMPLETE | ✅ |
| PHASE_3F_COMPLETE | ✅ |
| PHASE_3G_COMPLETE | ✅ |
| PHASE_3H_COMPLETE | ✅ |
| PHASE_3I_COMPLETE | ✅ |
| PHASE_3_FULL_COMPLETE | ✅ |
| USE_CLOSED_LOOP | ✅ |
| ML_PHASE_1_ENTRY | ✅ |
| META_COMPAT_JSONLD | ✅ |
| META_COMPAT_RDF | ✅ |
| META_COMPAT_UNIVERSE | ✅ |
| USE_CORE_BUS | ⏳ Phase 4 |
| USE_CASCADE_GATES | ⏳ Phase 4 |
| USE_CAD_MODULE | ⏳ Phase 4 |
| USE_ESTIMATE_V6 | ⏳ Phase 4 (실거래 검증 후) |
| USE_KPI_V6 | ⏳ Phase 4 |
| USE_AI_EXECUTIVE | ⏳ Phase 4 |

---

**문서 끝.**
