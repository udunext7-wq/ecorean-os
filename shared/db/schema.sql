-- ECOREAN BOC v2 — SQLite Schema
-- Electron 시작시 자동 실행 (CREATE TABLE IF NOT EXISTS)
-- 삭제 원칙: status = 'disabled' (실제 행 삭제 금지)

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── 프로젝트 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id             TEXT    PRIMARY KEY,
  name           TEXT    NOT NULL,
  address        TEXT    DEFAULT '',
  buildType      TEXT    NOT NULL DEFAULT 'apt',   -- apt|villa|office|commercial
  buildAge       INTEGER NOT NULL DEFAULT 0,
  floorLevel     INTEGER NOT NULL DEFAULT 1,
  hasElev        INTEGER NOT NULL DEFAULT 1,        -- 0|1
  resid          INTEGER NOT NULL DEFAULT 0,        -- 거주중 0|1
  region         REAL    NOT NULL DEFAULT 1.0,
  manager        TEXT    DEFAULT '',
  status         TEXT    NOT NULL DEFAULT 'draft',  -- draft|estimated|contracted|in_progress|completed|disabled
  contractAmount REAL    NOT NULL DEFAULT 0,
  startDate      TEXT    DEFAULT '',
  endDate        TEXT    DEFAULT '',
  conceptId      TEXT    DEFAULT '',
  sections       TEXT    DEFAULT '[]',              -- JSON array
  createdAt      TEXT    NOT NULL,
  updatedAt      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_status    ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updatedAt ON projects(updatedAt);

-- ── 공간 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spaces (
  id          TEXT    PRIMARY KEY,
  projectId   TEXT    NOT NULL REFERENCES projects(id),
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL DEFAULT 'living',    -- living|bedroom|bathroom|kitchen|balcony|entrance
  width       REAL    NOT NULL DEFAULT 0,           -- mm
  length      REAL    NOT NULL DEFAULT 0,           -- mm
  height      REAL    NOT NULL DEFAULT 2400,        -- mm
  floor       INTEGER NOT NULL DEFAULT 1,
  wet         INTEGER NOT NULL DEFAULT 0,           -- 습식 0|1
  windows     TEXT    DEFAULT '[]',                 -- JSON [{w,h}]
  doors       TEXT    DEFAULT '[]',                 -- JSON [{w,h}]
  floorMat    TEXT    DEFAULT '',
  wallMat     TEXT    DEFAULT '',
  ceilMat     TEXT    DEFAULT '',
  cadX        REAL    DEFAULT 0,
  cadY        REAL    DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT 'active',
  createdAt   TEXT    NOT NULL,
  updatedAt   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spaces_projectId ON spaces(projectId);

-- ── 견적 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id                 TEXT PRIMARY KEY,
  projectId          TEXT NOT NULL REFERENCES projects(id),
  grade              TEXT NOT NULL DEFAULT 'std',   -- std|prem|lux
  gradeMul           REAL NOT NULL DEFAULT 1.0,
  selectedProcessIds TEXT DEFAULT '[]',             -- JSON
  autoProcessIds     TEXT DEFAULT '[]',             -- JSON (온톨로지 자동추가)
  totalSupply        REAL NOT NULL DEFAULT 0,
  contractAmount     REAL NOT NULL DEFAULT 0,
  finalAmount        REAL NOT NULL DEFAULT 0,
  duration           INTEGER NOT NULL DEFAULT 0,    -- 일수
  lines              TEXT DEFAULT '[]',             -- JSON 공정별 내역
  validUntil         TEXT DEFAULT '',               -- 견적 유효기간 (30일)
  status             TEXT NOT NULL DEFAULT 'active',
  createdAt          TEXT NOT NULL,
  updatedAt          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_estimates_projectId ON estimates(projectId);

-- ── 공사일보 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_reports (
  id                 TEXT    PRIMARY KEY,
  projectId          TEXT    NOT NULL REFERENCES projects(id),
  date               TEXT    NOT NULL,              -- YYYY-MM-DD
  weather            TEXT    DEFAULT '',
  completedProcesses TEXT    DEFAULT '[]',          -- JSON [processId]
  workers            TEXT    DEFAULT '[]',          -- JSON [{role,count,wage}]
  issues             TEXT    DEFAULT '',
  defects            TEXT    DEFAULT '',
  tomorrowPlan       TEXT    DEFAULT '',
  progressRate       REAL    NOT NULL DEFAULT 0,    -- 0~100
  photos             TEXT    DEFAULT '[]',          -- JSON [filePath]
  status             TEXT    NOT NULL DEFAULT 'active',
  createdAt          TEXT    NOT NULL,
  updatedAt          TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_daily_reports_projectId ON daily_reports(projectId);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date      ON daily_reports(date);

-- ── 현금출납부 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_ledger (
  id          TEXT    PRIMARY KEY,
  projectId   TEXT    NOT NULL REFERENCES projects(id),
  date        TEXT    NOT NULL,                     -- YYYY-MM-DD
  type        TEXT    NOT NULL,                     -- income|expense
  category    TEXT    NOT NULL,                     -- 계약금|중도금|잔금|추가공사|노무비|자재|외주|간접비 등
  subCategory TEXT    DEFAULT '',
  amount      REAL    NOT NULL DEFAULT 0,
  payMethod   TEXT    DEFAULT '',                   -- cash|transfer|card|check
  vendor      TEXT    DEFAULT '',
  memo        TEXT    DEFAULT '',
  paid        INTEGER NOT NULL DEFAULT 0,           -- 0|1
  status      TEXT    NOT NULL DEFAULT 'active',
  createdAt   TEXT    NOT NULL,
  updatedAt   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_projectId ON cash_ledger(projectId);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_date      ON cash_ledger(date);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_type      ON cash_ledger(type);

-- ── 발주관리 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id           TEXT    PRIMARY KEY,
  projectId    TEXT    NOT NULL REFERENCES projects(id),
  processId    TEXT    DEFAULT '',
  itemName     TEXT    NOT NULL,
  quantity     REAL    NOT NULL DEFAULT 0,
  unit         TEXT    DEFAULT '',
  unitPrice    REAL    NOT NULL DEFAULT 0,
  totalPrice   REAL    NOT NULL DEFAULT 0,
  vendor       TEXT    DEFAULT '',
  leadDays     INTEGER NOT NULL DEFAULT 0,
  orderDate    TEXT    DEFAULT '',
  deliveryDate TEXT    DEFAULT '',
  status       TEXT    NOT NULL DEFAULT 'pending',  -- pending|ordered|delivered|cancelled|disabled
  createdAt    TEXT    NOT NULL,
  updatedAt    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_projectId    ON purchase_orders(projectId);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status       ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deliveryDate ON purchase_orders(deliveryDate);

-- ── 공정 DB (Master DB) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_items (
  itemId       TEXT    PRIMARY KEY,
  itemName     TEXT    NOT NULL,
  level1       TEXT    DEFAULT '',                  -- 대분류
  level2       TEXT    DEFAULT '',                  -- 중분류
  level3       TEXT    DEFAULT '',                  -- 소분류
  level4       TEXT    DEFAULT '',                  -- 규격
  unit         TEXT    DEFAULT '㎡',
  laborCost    REAL    NOT NULL DEFAULT 0,
  materialCost REAL    NOT NULL DEFAULT 0,
  wasteRate    REAL    NOT NULL DEFAULT 0,
  duration     REAL    NOT NULL DEFAULT 1,          -- 일수
  formula      TEXT    DEFAULT '',                  -- 수량산정식
  spaceTypes   TEXT    DEFAULT '[]',               -- JSON 적용공간
  isRequired   INTEGER NOT NULL DEFAULT 0,
  dataStatus   TEXT    NOT NULL DEFAULT 'manual',  -- manual|crawled|ml
  status       TEXT    NOT NULL DEFAULT 'active',  -- active|disabled
  createdAt    TEXT    NOT NULL,
  updatedAt    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cost_items_level1 ON cost_items(level1);
CREATE INDEX IF NOT EXISTS idx_cost_items_level2 ON cost_items(level2);
CREATE INDEX IF NOT EXISTS idx_cost_items_status ON cost_items(status);

-- ── 온톨로지 규칙 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_rules (
  ruleId          TEXT    PRIMARY KEY,
  trigger         TEXT    NOT NULL,                -- 트리거 공정ID 또는 __special__
  linked          TEXT    NOT NULL,                -- 연결 공정ID
  triggerType     TEXT    NOT NULL DEFAULT 'AUTO', -- AUTO|CONDITIONAL|FORCED
  condition       TEXT    DEFAULT '',              -- 조건 표현식
  confidenceLevel REAL    NOT NULL DEFAULT 1.0,   -- 0.0~1.0
  status          TEXT    NOT NULL DEFAULT 'active',
  approvedBy      TEXT    DEFAULT '',
  approvedAt      TEXT    DEFAULT '',
  source          TEXT    NOT NULL DEFAULT 'manual', -- manual|ml|crawled
  createdAt       TEXT    NOT NULL,
  updatedAt       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ontology_rules_trigger ON ontology_rules(trigger);
CREATE INDEX IF NOT EXISTS idx_ontology_rules_type    ON ontology_rules(triggerType);
CREATE INDEX IF NOT EXISTS idx_ontology_rules_status  ON ontology_rules(status);

-- ── 승인 로그 (불변 기록) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_log (
  id          TEXT PRIMARY KEY,
  requestType TEXT NOT NULL,                       -- db_unit|ontology_rule|new_process|brand_price 등
  targetId    TEXT DEFAULT '',
  action      TEXT NOT NULL,                       -- create|update|delete|approve|reject
  beforeValue TEXT DEFAULT 'null',                 -- JSON 변경 전
  afterValue  TEXT DEFAULT 'null',                 -- JSON 변경 후
  reason      TEXT DEFAULT '',
  approvedBy  TEXT DEFAULT 'system',
  approvedAt  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'approved'     -- approved|rejected|pending
);
CREATE INDEX IF NOT EXISTS idx_approval_log_targetId   ON approval_log(targetId);
CREATE INDEX IF NOT EXISTS idx_approval_log_approvedAt ON approval_log(approvedAt);
CREATE INDEX IF NOT EXISTS idx_approval_log_type       ON approval_log(requestType);

-- ── 프리셋 ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presets (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  sections           TEXT DEFAULT '[]',            -- JSON
  conceptId          TEXT DEFAULT '',
  grade              TEXT NOT NULL DEFAULT 'std',
  gradeMul           REAL NOT NULL DEFAULT 1.0,
  selectedProcessIds TEXT DEFAULT '[]',            -- JSON
  materialOverrides  TEXT DEFAULT '{}',            -- JSON
  customizations     TEXT DEFAULT '{}',            -- JSON
  status             TEXT NOT NULL DEFAULT 'active',
  createdAt          TEXT NOT NULL,
  updatedAt          TEXT NOT NULL
);

-- ── 컨셉 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concepts (
  conceptId         TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  grade             TEXT NOT NULL DEFAULT 'std',
  gradeMul          REAL NOT NULL DEFAULT 1.0,
  priceMin          REAL NOT NULL DEFAULT 0,
  priceMax          REAL NOT NULL DEFAULT 0,
  defaultProcessIds TEXT DEFAULT '[]',             -- JSON
  materialDefaults  TEXT DEFAULT '{}',             -- JSON
  status            TEXT NOT NULL DEFAULT 'active',
  createdAt         TEXT NOT NULL,
  updatedAt         TEXT NOT NULL
);

-- ── 시공섹션 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  sectionId   TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  processIds  TEXT DEFAULT '[]',                   -- JSON
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);
