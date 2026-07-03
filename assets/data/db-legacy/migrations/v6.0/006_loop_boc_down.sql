-- ECOREAN BOC v6.0 — Closed Loop 롤백 (ecorean-boc.db)

BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_ins_result;
DROP INDEX IF EXISTS idx_ins_schedule;
DROP INDEX IF EXISTS idx_sch_status;
DROP INDEX IF EXISTS idx_sch_contract;
DROP INDEX IF EXISTS idx_po_simulated;
DROP INDEX IF EXISTS idx_po_status;
DROP INDEX IF EXISTS idx_po_contract;
DROP TABLE IF EXISTS inspections;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS purchase_orders;
COMMIT;
