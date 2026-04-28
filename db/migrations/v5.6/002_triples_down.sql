BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_triples_graph;
DROP INDEX IF EXISTS idx_triples_tenant;
DROP INDEX IF EXISTS idx_triples_predicate;
DROP INDEX IF EXISTS idx_triples_subject;
DROP TABLE IF EXISTS triples;
COMMIT;
