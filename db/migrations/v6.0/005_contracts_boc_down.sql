-- ECOREAN BOC v6.0 — contracts 롤백 (ecorean-boc.db)

BEGIN TRANSACTION;

DROP INDEX IF EXISTS idx_boc_contracts_tenant;
DROP INDEX IF EXISTS idx_boc_contracts_status;
DROP INDEX IF EXISTS idx_boc_contracts_simulated;
DROP INDEX IF EXISTS idx_boc_contracts_created;
DROP TABLE IF EXISTS contracts;

COMMIT;
