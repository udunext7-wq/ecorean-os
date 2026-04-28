-- v5.6 → v5.5 롤백
BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_drawings_layer;
DROP INDEX IF EXISTS idx_drawings_tenant;
DROP INDEX IF EXISTS idx_drawings_space;
DROP TABLE IF EXISTS drawings;
COMMIT;
