BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_cost_items_approved;
DROP INDEX IF EXISTS idx_cost_items_source;
DROP INDEX IF EXISTS idx_cost_items_ks_code;
DROP INDEX IF EXISTS idx_cost_items_category;
DROP INDEX IF EXISTS idx_cost_items_tenant;
DROP TABLE IF EXISTS cost_items;
COMMIT;
