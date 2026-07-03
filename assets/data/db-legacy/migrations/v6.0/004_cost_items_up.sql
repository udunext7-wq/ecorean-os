-- ECOREAN BOC v6.0 — cost_items 테이블
-- 5종 출처 분리 + ML 학습 룰 보존

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS cost_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',

  -- 분류
  category TEXT NOT NULL,
  subcategory TEXT,
  ks_code TEXT,
  name TEXT NOT NULL,

  -- 단가
  unit TEXT NOT NULL,
  unit_price INTEGER NOT NULL,

  -- 보정 메타
  applies_to_spaces TEXT,
  applies_to_concepts TEXT,

  -- 5종 출처 분류 (ML 학습 룰)
  source TEXT NOT NULL CHECK (source IN (
    'principal_seed',
    'principal_input',
    'invoice',
    'simulation',
    'ai_market_avg'
  )),

  -- 승인 플래그 (ML 학습 데이터 분리)
  is_ai_estimated INTEGER NOT NULL DEFAULT 0,
  is_approved_by_principal INTEGER NOT NULL DEFAULT 0,
  is_simulated INTEGER NOT NULL DEFAULT 0,

  approved_at INTEGER,
  approved_by TEXT,

  -- 메타
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  CHECK (is_ai_estimated IN (0,1)),
  CHECK (is_approved_by_principal IN (0,1)),
  CHECK (is_simulated IN (0,1)),
  CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cost_items_tenant     ON cost_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_items_category   ON cost_items(category);
CREATE INDEX IF NOT EXISTS idx_cost_items_ks_code    ON cost_items(ks_code);
CREATE INDEX IF NOT EXISTS idx_cost_items_source     ON cost_items(source);
CREATE INDEX IF NOT EXISTS idx_cost_items_approved   ON cost_items(is_approved_by_principal);

COMMIT;
