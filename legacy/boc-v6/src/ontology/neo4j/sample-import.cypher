// ECOREAN BOC — Neo4j Sample Import
// 온톨로지 규칙 23개 기반 (ontology-rules.json)
// 실행: neo4j browser 또는 cypher-shell

// ─────────────────────────────────────
// 1. 인덱스 생성
// ─────────────────────────────────────
CREATE INDEX idx_process_id   IF NOT EXISTS FOR (n:Process)       ON (n.itemId);
CREATE INDEX idx_project_stat IF NOT EXISTS FOR (n:Project)       ON (n.status);
CREATE INDEX idx_ont_trigger  IF NOT EXISTS FOR (n:OntologyRule)  ON (n.trigger);
CREATE INDEX idx_case_date    IF NOT EXISTS FOR (n:Case)          ON (n.completedAt);

// ─────────────────────────────────────
// 2. Core 노드
// ─────────────────────────────────────
MERGE (core:Core {id: 'CORE-001'})
SET core.name = 'ECOREAN BOC',
    core.version = '2.0',
    core.createdAt = '2026-04-26';

// ─────────────────────────────────────
// 3. OntologyRule 노드 (R1: LGS → 석고보드)
// ─────────────────────────────────────
MERGE (r1:OntologyRule {id: 'ONT-001'})
SET r1.trigger = 'LGS 경량틀 (천장/벽)',
    r1.linked = '석고보드 (9.5T or 12.5T)',
    r1.triggerType = 'AUTO_INCLUDE',
    r1.condition = '항상',
    r1.confidenceLevel = 1.0,
    r1.status = 'active',
    r1.note = '골조 완료 후';

// R2: 타일 → 방수+보호몰탈
MERGE (r2:OntologyRule {id: 'ONT-002'})
SET r2.trigger = '바닥 타일 시공',
    r2.linked = '욕실방수 + 보호몰탈',
    r2.triggerType = 'AUTO_INCLUDE',
    r2.condition = '욕실/습식공간',
    r2.confidenceLevel = 1.0,
    r2.status = 'active',
    r2.note = '방수 선행 필수';

// R3: 타일 → 줄눈
MERGE (r3:OntologyRule {id: 'ONT-003'})
SET r3.trigger = '바닥 타일 시공',
    r3.linked = '타일 줄눈 시공',
    r3.triggerType = 'AUTO_INCLUDE',
    r3.condition = '항상',
    r3.confidenceLevel = 1.0,
    r3.status = 'active',
    r3.note = '양생 24h';

// ─────────────────────────────────────
// 4. Process 노드
// ─────────────────────────────────────
MERGE (p_lgs:Process {id: 'PROC-LGS'})
SET p_lgs.name = 'LGS 경량틀 (천장/벽)',
    p_lgs.category = '목공',
    p_lgs.unit = '㎡',
    p_lgs.laborCost = 22000,
    p_lgs.materialCost = 8000;

MERGE (p_gyp:Process {id: 'PROC-GYP'})
SET p_gyp.name = '석고보드 (9.5T)',
    p_gyp.category = '목공',
    p_gyp.unit = '㎡',
    p_gyp.laborCost = 12000,
    p_gyp.materialCost = 6000;

MERGE (p_tile:Process {id: 'PROC-TILE'})
SET p_tile.name = '욕실 바닥타일',
    p_tile.category = '타일',
    p_tile.unit = '㎡',
    p_tile.laborCost = 28000,
    p_tile.materialCost = 18000;

MERGE (p_wtp:Process {id: 'PROC-WTP'})
SET p_wtp.name = '욕실방수',
    p_wtp.category = '방수',
    p_wtp.unit = '㎡',
    p_wtp.laborCost = 15000,
    p_wtp.materialCost = 8000;

MERGE (p_grout:Process {id: 'PROC-GRT'})
SET p_grout.name = '타일 줄눈 시공',
    p_grout.category = '타일',
    p_grout.unit = '㎡',
    p_grout.laborCost = 3500,
    p_grout.materialCost = 2000;

// ─────────────────────────────────────
// 5. 관계 생성
// ─────────────────────────────────────
MATCH (r1:OntologyRule {id:'ONT-001'})
MATCH (p_gyp:Process {id:'PROC-GYP'})
MERGE (r1)-[:TRIGGERS {confidenceLevel:1.0, triggerType:'AUTO_INCLUDE'}]->(p_gyp);

MATCH (r2:OntologyRule {id:'ONT-002'})
MATCH (p_wtp:Process {id:'PROC-WTP'})
MERGE (r2)-[:TRIGGERS {confidenceLevel:1.0}]->(p_wtp);

MATCH (r3:OntologyRule {id:'ONT-003'})
MATCH (p_grout:Process {id:'PROC-GRT'})
MERGE (r3)-[:TRIGGERS {confidenceLevel:1.0}]->(p_grout);

// 공정 선행 관계
MATCH (wtp:Process {id:'PROC-WTP'})
MATCH (tile:Process {id:'PROC-TILE'})
MERGE (wtp)-[:PRECEDES {lagDays:2, isCriticalPath:true}]->(tile);

MATCH (tile:Process {id:'PROC-TILE'})
MATCH (grout:Process {id:'PROC-GRT'})
MERGE (tile)-[:PRECEDES {lagDays:1, isCriticalPath:false}]->(grout);

MATCH (lgs:Process {id:'PROC-LGS'})
MATCH (gyp:Process {id:'PROC-GYP'})
MERGE (lgs)-[:PRECEDES {lagDays:0, isCriticalPath:true}]->(gyp);

// LGS → 석고보드 의존
MATCH (gyp:Process {id:'PROC-GYP'})
MATCH (lgs:Process {id:'PROC-LGS'})
MERGE (gyp)-[:DEPENDS_ON]->(lgs);

// ─────────────────────────────────────
// 6. 검증 쿼리
// ─────────────────────────────────────
// MATCH (r:OntologyRule)-[:TRIGGERS]->(p:Process) RETURN r.trigger, p.name, r.confidenceLevel;
// MATCH (p1:Process)-[:PRECEDES]->(p2:Process) RETURN p1.name, p2.name;
