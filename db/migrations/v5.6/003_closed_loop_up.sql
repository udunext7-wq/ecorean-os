-- ECOREAN BOC v5.6 — Closed Loop 4 테이블
-- contracts / purchase_orders / schedules / inspections
-- 멀티테넌시: tenant_id
-- 시뮬 분리: is_simulated 플래그

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  customer_name_enc TEXT,
  customer_phone_hash TEXT,
  customer_address_enc TEXT,
  total_amount INTEGER NOT NULL,
  vat_amount INTEGER NOT NULL,
  final_amount INTEGER NOT NULL,
  signed_at INTEGER,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (status IN ('DRAFT','SIGNED','CANCELED','COMPLETED'))
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  vendor_name TEXT,
  category TEXT,
  ks_code TEXT,
  qty REAL NOT NULL,
  unit TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  ordered_at INTEGER,
  expected_delivery INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING',
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (status IN ('PENDING','ORDERED','DELIVERED','RETURNED','CANCELED'))
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  section_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  dependencies TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','DELAYED','BLOCKED'))
);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  section_id TEXT NOT NULL,
  inspector TEXT,
  inspected_at INTEGER,
  result TEXT NOT NULL,
  notes TEXT,
  defects_json TEXT,
  needs_research INTEGER NOT NULL DEFAULT 0,
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (result IN ('PASS','FAIL','CONDITIONAL_PASS','PENDING'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant       ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_simulated    ON contracts(is_simulated);
CREATE INDEX IF NOT EXISTS idx_purchase_contract      ON purchase_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_purchase_simulated     ON purchase_orders(is_simulated);
CREATE INDEX IF NOT EXISTS idx_schedules_contract     ON schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_schedules_simulated    ON schedules(is_simulated);
CREATE INDEX IF NOT EXISTS idx_inspections_schedule   ON inspections(schedule_id);
CREATE INDEX IF NOT EXISTS idx_inspections_simulated  ON inspections(is_simulated);

COMMIT;
