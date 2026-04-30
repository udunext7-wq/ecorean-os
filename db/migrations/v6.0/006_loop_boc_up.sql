-- ECOREAN BOC v6.0 — Closed Loop 테이블 (ecorean-boc.db)
-- Week 6: purchase_orders / schedules / inspections
-- 원칙: is_simulated 분리, B1 rollback 파일 006_loop_boc_down.sql

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                TEXT    PRIMARY KEY,
  contract_id       TEXT    NOT NULL,
  tenant_id         TEXT    NOT NULL DEFAULT 'HQ',
  vendor_name       TEXT,
  category          TEXT,
  ks_code           TEXT,
  unit              TEXT,
  qty               REAL    NOT NULL,
  unit_price        INTEGER NOT NULL,
  total_price       INTEGER NOT NULL,
  ordered_at        INTEGER,
  expected_delivery INTEGER,
  status            TEXT    NOT NULL DEFAULT 'PENDING',
  is_simulated      INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  CHECK (status IN ('PENDING','ORDERED','DELIVERED','RETURNED','CANCELED'))
);

CREATE TABLE IF NOT EXISTS schedules (
  id             TEXT    PRIMARY KEY,
  contract_id    TEXT    NOT NULL,
  tenant_id      TEXT    NOT NULL DEFAULT 'HQ',
  section_id     TEXT    NOT NULL,
  start_date     INTEGER NOT NULL,
  duration_days  INTEGER NOT NULL DEFAULT 1,
  end_date       INTEGER NOT NULL,
  dependencies   TEXT,
  status         TEXT    NOT NULL DEFAULT 'PLANNED',
  is_simulated   INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','DELAYED','BLOCKED'))
);

CREATE TABLE IF NOT EXISTS inspections (
  id              TEXT    PRIMARY KEY,
  schedule_id     TEXT    NOT NULL,
  section_id      TEXT    NOT NULL,
  tenant_id       TEXT    NOT NULL DEFAULT 'HQ',
  inspector       TEXT,
  result          TEXT    NOT NULL DEFAULT 'PENDING',
  notes           TEXT,
  defects         TEXT,
  needs_research  INTEGER NOT NULL DEFAULT 0,
  inspected_at    INTEGER,
  is_simulated    INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  CHECK (result IN ('PENDING','PASS','FAIL','CONDITIONAL_PASS'))
);

CREATE INDEX IF NOT EXISTS idx_po_contract    ON purchase_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_po_status      ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_simulated   ON purchase_orders(is_simulated);
CREATE INDEX IF NOT EXISTS idx_sch_contract   ON schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_sch_status     ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_ins_schedule   ON inspections(schedule_id);
CREATE INDEX IF NOT EXISTS idx_ins_result     ON inspections(result);

COMMIT;
