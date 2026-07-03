-- ECOREAN BOC v5.6 — RDF Triple 저장 테이블
-- SoT: docs/MASTER_PLAN.md §110.2 #3
-- Subject-Predicate-Object 트리플 저장 / 멀티테넌시: tenant_id

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS triples (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  object_type TEXT NOT NULL,
  graph_context TEXT,
  created_at INTEGER NOT NULL,
  CHECK (object_type IN ('uri','literal','number','boolean'))
);

CREATE INDEX IF NOT EXISTS idx_triples_subject   ON triples(subject);
CREATE INDEX IF NOT EXISTS idx_triples_predicate ON triples(predicate);
CREATE INDEX IF NOT EXISTS idx_triples_tenant    ON triples(tenant_id);
CREATE INDEX IF NOT EXISTS idx_triples_graph     ON triples(graph_context);

COMMIT;
