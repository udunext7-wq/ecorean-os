-- ECOREAN BOC v5.6 — drawings 테이블 신설
-- 100배 확장 호환: tenant_id + version + layer + geometry_json
-- rollback: 001_drawings_down.sql

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  version TEXT NOT NULL DEFAULT '1.0.0',
  layer TEXT NOT NULL,
  geometry_type TEXT NOT NULL,
  geometry_json TEXT NOT NULL,
  style_json TEXT,
  metadata_json TEXT,
  dxf_blob_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (layer IN ('floorplan','specification','construction','elevation','rendering_3d','dxf','bim_ifc'))
);

CREATE INDEX IF NOT EXISTS idx_drawings_space  ON drawings(space_id);
CREATE INDEX IF NOT EXISTS idx_drawings_tenant ON drawings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drawings_layer  ON drawings(layer);

COMMIT;
