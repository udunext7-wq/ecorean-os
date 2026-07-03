-- ECOREAN BOC v6.0 — contracts 테이블 (ecorean-boc.db)
-- Week 5: ContractPage IPC 연결용
-- 원칙: is_simulated 분리, 개인정보 평문 (P6 암호화 Phase 5 예정)

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS contracts (
  id               TEXT    PRIMARY KEY,
  estimate_id      TEXT    NOT NULL,
  tenant_id        TEXT    NOT NULL DEFAULT 'HQ',
  customer_name    TEXT,
  customer_phone   TEXT,
  customer_address TEXT,
  total_amount     INTEGER NOT NULL,
  vat_amount       INTEGER NOT NULL,
  final_amount     INTEGER NOT NULL,
  signed_at        INTEGER,
  status           TEXT    NOT NULL DEFAULT 'DRAFT',
  is_simulated     INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  CHECK (status IN ('DRAFT','SIGNED','CANCELED','COMPLETED'))
);

CREATE INDEX IF NOT EXISTS idx_boc_contracts_tenant    ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_boc_contracts_status    ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_boc_contracts_simulated ON contracts(is_simulated);
CREATE INDEX IF NOT EXISTS idx_boc_contracts_created   ON contracts(created_at);

COMMIT;
