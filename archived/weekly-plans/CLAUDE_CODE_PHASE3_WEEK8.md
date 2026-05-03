# ECOREAN BOC — Phase 3 Week 8 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 c886d79 (Week 7 완료)
> **이번 주 목표:** Closed Loop 4 모듈 신설 + 시뮬레이션 1건 + ML Phase 1 진입
> **소요:** 자율 실행 4~5시간
> **시나리오:** B (시뮬레이션) — 실거래 들어오면 데이터만 교체

---

## 절대 규칙

1. TDD 강제
2. 버그 있는 코드 커밋 금지
3. 9탭 회귀 0건 검증
4. estimate.html · boc-shell.html 직접 수정 금지
5. 22/23/12/6/5 변경 금지
6. **시뮬레이션 데이터에 [SIMULATED] 플래그 명시 — 실거래 데이터와 혼동 금지**
7. 시뮬레이션 데이터로 ML 학습 시 isSimulated=true로 분리 저장
8. rollback SQL 없는 DB 변경 금지

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # c886d79 확인
git pull origin master

# Week 1~7 회귀
node shell/src/core-bus/__tests__/CoreBus.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs
node modules-html/cad/__tests__/DrawingModel.test.cjs
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs
node modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs
node shell/src/meta/__tests__/Universe.test.cjs
node shell/src/korea/__tests__/KoreaBuildingRules.test.cjs
node shell/src/security/__tests__/Encryption.test.cjs
node test-engine.js

# DB 백업 (Critical)
node scripts/backup.cjs --label pre_week8
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 + DB 마이그레이션

### 1-1. 디렉토리

```bash
mkdir -p shell/src/closed-loop/contract
mkdir -p shell/src/closed-loop/purchase
mkdir -p shell/src/closed-loop/schedule
mkdir -p shell/src/closed-loop/inspection
mkdir -p shell/src/closed-loop/__tests__
mkdir -p shell/src/ml
mkdir -p shell/src/ml/__tests__
mkdir -p db/migrations/v5.6
mkdir -p sims
```

### 1-2. db/migrations/v5.6/003_closed_loop_up.sql

```sql
-- ECOREAN BOC v5.6 — Closed Loop 4 테이블
-- contracts / purchase_orders / schedules / inspections
-- 멀티테넌시: tenant_id
-- 시뮬 분리: is_simulated 플래그

BEGIN TRANSACTION;

-- 계약
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  estimate_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  customer_name_enc TEXT,             -- 암호화 저장
  customer_phone_hash TEXT,           -- 검색용 해시
  customer_address_enc TEXT,          -- 암호화 저장
  total_amount INTEGER NOT NULL,      -- 도급합계
  vat_amount INTEGER NOT NULL,        -- VAT
  final_amount INTEGER NOT NULL,      -- 최종(VAT 포함)
  signed_at INTEGER,                  -- 계약 체결 시점
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (status IN ('DRAFT','SIGNED','CANCELED','COMPLETED'))
);

-- 발주
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  vendor_name TEXT,
  category TEXT,                      -- flooring/wallcovering/...
  ks_code TEXT,                       -- KS 표준
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

-- 공정 일정
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  section_id TEXT NOT NULL,           -- bathroom/kitchen/...
  task_name TEXT NOT NULL,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  dependencies TEXT,                  -- JSON 배열 (선행 task ID)
  status TEXT NOT NULL DEFAULT 'PLANNED',
  is_simulated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','DELAYED','BLOCKED'))
);

-- 검수
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  section_id TEXT NOT NULL,
  inspector TEXT,
  inspected_at INTEGER,
  result TEXT NOT NULL,               -- PASS / FAIL / CONDITIONAL_PASS
  notes TEXT,
  defects_json TEXT,                  -- 발견된 하자 JSON 배열
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
```

### 1-3. db/migrations/v5.6/003_closed_loop_down.sql

```sql
BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_inspections_simulated;
DROP INDEX IF EXISTS idx_inspections_schedule;
DROP INDEX IF EXISTS idx_schedules_simulated;
DROP INDEX IF EXISTS idx_schedules_contract;
DROP INDEX IF EXISTS idx_purchase_simulated;
DROP INDEX IF EXISTS idx_purchase_contract;
DROP INDEX IF EXISTS idx_contracts_simulated;
DROP INDEX IF EXISTS idx_contracts_tenant;
DROP TABLE IF EXISTS inspections;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS contracts;
COMMIT;
```

### 1-4. scripts/migrate_v5.6_closed_loop.cjs

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH  = path.join(__dirname, '..', 'ecorean-boc.db');
const UP_SQL   = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '003_closed_loop_up.sql');
const DOWN_SQL = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '003_closed_loop_down.sql');

const cmd = process.argv[2] || 'up';
const sqlFile = cmd === 'down' ? DOWN_SQL : UP_SQL;

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(sqlFile, 'utf-8'));

const tables = ['contracts','purchase_orders','schedules','inspections'];
if (cmd === 'up') {
  tables.forEach(function(t) {
    const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
    if (!r) { console.error('[FAIL] ' + t + ' 미생성'); process.exit(1); }
  });
  console.log('[PASS] 4 테이블 생성 완료');
  tables.forEach(function(t) {
    const c = db.prepare("SELECT COUNT(*) as c FROM " + t).get();
    console.log('  ' + t + ': ' + c.c + ' rows');
  });
} else {
  tables.forEach(function(t) {
    const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
    if (r) { console.error('[FAIL] ' + t + ' 미삭제'); process.exit(1); }
  });
  console.log('[PASS] 4 테이블 삭제 완료');
}
db.close();
```

### 1-5. 마이그레이션 실행

```bash
node scripts/migrate_v5.6_closed_loop.cjs up
# 기대: [PASS] 4 테이블 생성 완료 (각 0 rows)
```

---

## 작업 2: Contract 모듈

### 2-1. shell/src/closed-loop/contract/Contract.cjs

```javascript
// ECOREAN BOC v5.6 — Contract (계약 모듈)
// SoT: docs/MASTER_PLAN.md §80 (Closed Loop)

const { encrypt, hash } = require('../../security/Encryption.cjs');

const STATUSES = ['DRAFT','SIGNED','CANCELED','COMPLETED'];

function createContract(opts) {
  if (!opts.estimateId) throw new Error('Contract: estimateId 필수');
  if (typeof opts.totalAmount !== 'number') throw new Error('Contract: totalAmount 필수');

  const total = opts.totalAmount;
  const vat = Math.round(total * 0.10);
  const final2 = total + vat;

  return {
    id: opts.id || ('contract_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    estimateId: opts.estimateId,
    tenantId: opts.tenantId || 'HQ',
    customerName: opts.customerName || '',
    customerPhone: opts.customerPhone || '',
    customerAddress: opts.customerAddress || '',
    totalAmount: total,
    vatAmount: vat,
    finalAmount: final2,
    signedAt: opts.signedAt || null,
    status: opts.status || 'DRAFT',
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

// DB 저장 형식 변환 (개인정보 암호화)
function toDBRow(contract, encryptionKey) {
  return {
    id: contract.id,
    estimate_id: contract.estimateId,
    tenant_id: contract.tenantId,
    customer_name_enc: contract.customerName ? encrypt(contract.customerName, encryptionKey) : '',
    customer_phone_hash: contract.customerPhone ? hash(contract.customerPhone) : '',
    customer_address_enc: contract.customerAddress ? encrypt(contract.customerAddress, encryptionKey) : '',
    total_amount: contract.totalAmount,
    vat_amount: contract.vatAmount,
    final_amount: contract.finalAmount,
    signed_at: contract.signedAt,
    status: contract.status,
    is_simulated: contract.isSimulated ? 1 : 0,
    created_at: contract.createdAt
  };
}

function transition(contract, newStatus) {
  if (!STATUSES.includes(newStatus)) {
    return { ok: false, error: '미정의 상태: ' + newStatus };
  }
  // DRAFT → SIGNED → COMPLETED 정상 흐름
  // 어떤 상태에서든 CANCELED 가능
  const valid = {
    DRAFT:     ['SIGNED','CANCELED'],
    SIGNED:    ['COMPLETED','CANCELED'],
    COMPLETED: [],
    CANCELED:  []
  };
  if (!valid[contract.status].includes(newStatus)) {
    return { ok: false, error: contract.status + ' → ' + newStatus + ' 불가' };
  }
  contract.status = newStatus;
  if (newStatus === 'SIGNED' && !contract.signedAt) {
    contract.signedAt = Date.now();
  }
  return { ok: true, contract: contract };
}

function validateContract(c) {
  const errors = [];
  if (!c.id) errors.push('id 누락');
  if (!c.estimateId) errors.push('estimateId 누락');
  if (typeof c.totalAmount !== 'number') errors.push('totalAmount 타입');
  if (!STATUSES.includes(c.status)) errors.push('status 미정의');
  return errors;
}

module.exports = {
  STATUSES: STATUSES,
  createContract: createContract,
  toDBRow: toDBRow,
  transition: transition,
  validateContract: validateContract
};
```

### 2-2. shell/src/closed-loop/__tests__/Contract.test.cjs

```javascript
const { STATUSES, createContract, toDBRow, transition, validateContract } = require('../contract/Contract.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 4 상태
(function() {
  assert(STATUSES.length === 4, '4 상태');
  assert(STATUSES.includes('DRAFT'), 'DRAFT');
  assert(STATUSES.includes('SIGNED'), 'SIGNED');
})();

// Test 2: createContract 기본
(function() {
  const c = createContract({
    estimateId: 'est_001',
    totalAmount: 15000000
  });
  assert(c.id.startsWith('contract_'), 'id 자동');
  assert(c.totalAmount === 15000000, 'total');
  assert(c.vatAmount === 1500000, 'VAT 자동 ×0.10');
  assert(c.finalAmount === 16500000, 'final 자동');
  assert(c.status === 'DRAFT', '기본 DRAFT');
  assert(c.isSimulated === false, '기본 실거래');
})();

// Test 3: 시뮬 플래그
(function() {
  const c = createContract({ estimateId: 'est_x', totalAmount: 1000000, isSimulated: true });
  assert(c.isSimulated === true, '시뮬 명시');
})();

// Test 4: 누락 throw
(function() {
  let threw = false;
  try { createContract({}); } catch(e) { threw = true; }
  assert(threw, 'estimateId 누락 throw');
})();

// Test 5: 상태 전이 — DRAFT → SIGNED
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  const r = transition(c, 'SIGNED');
  assert(r.ok === true, 'DRAFT → SIGNED');
  assert(c.status === 'SIGNED', '상태');
  assert(c.signedAt > 0, 'signedAt 자동');
})();

// Test 6: 상태 전이 — SIGNED → COMPLETED
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  transition(c, 'SIGNED');
  const r = transition(c, 'COMPLETED');
  assert(r.ok === true, 'SIGNED → COMPLETED');
})();

// Test 7: 잘못된 전이
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  const r = transition(c, 'COMPLETED');
  assert(r.ok === false, 'DRAFT → COMPLETED 차단');
})();

// Test 8: CANCELED 어디서든 가능
(function() {
  const c1 = createContract({ estimateId: 'e', totalAmount: 1000 });
  assert(transition(c1, 'CANCELED').ok === true, 'DRAFT → CANCELED');

  const c2 = createContract({ estimateId: 'e', totalAmount: 1000 });
  transition(c2, 'SIGNED');
  assert(transition(c2, 'CANCELED').ok === true, 'SIGNED → CANCELED');
})();

// Test 9: toDBRow + 암호화
(function() {
  const c = createContract({
    estimateId: 'est_001',
    totalAmount: 1000000,
    customerName: '홍길동',
    customerPhone: '010-1234-5678',
    customerAddress: '서울시 강남구'
  });
  const row = toDBRow(c, 'test-key');
  assert(row.customer_name_enc !== '홍길동', '이름 암호화');
  assert(row.customer_phone_hash.length === 64, '전화 해시');
  assert(row.customer_address_enc.length > 0, '주소 암호화');
  assert(row.is_simulated === 0, '실거래 0');
})();

// Test 10: validateContract
(function() {
  const c = createContract({ estimateId: 'e', totalAmount: 1000 });
  assert(validateContract(c).length === 0, '정상 검증');
  assert(validateContract({}).length > 0, '빈 객체 에러');
})();

console.log('[PASS] Contract (10/10)');
```

### 2-3. 검증

```bash
node shell/src/closed-loop/__tests__/Contract.test.cjs
# 기대: [PASS] Contract (10/10)
```

---

## 작업 3: Purchase 모듈

### 3-1. shell/src/closed-loop/purchase/PurchaseOrder.cjs

```javascript
// ECOREAN BOC v5.6 — PurchaseOrder (발주 모듈)

const STATUSES = ['PENDING','ORDERED','DELIVERED','RETURNED','CANCELED'];

function createPO(opts) {
  if (!opts.contractId) throw new Error('PO: contractId 필수');
  if (typeof opts.qty !== 'number') throw new Error('PO: qty 필수');
  if (typeof opts.unitPrice !== 'number') throw new Error('PO: unitPrice 필수');

  const total = Math.round(opts.qty * opts.unitPrice);

  return {
    id: opts.id || ('po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    contractId: opts.contractId,
    tenantId: opts.tenantId || 'HQ',
    vendorName: opts.vendorName || 'TBD',
    category: opts.category || 'unknown',
    ksCode: opts.ksCode || null,
    qty: opts.qty,
    unit: opts.unit || 'EA',
    unitPrice: opts.unitPrice,
    totalPrice: total,
    orderedAt: opts.orderedAt || null,
    expectedDelivery: opts.expectedDelivery || null,
    status: opts.status || 'PENDING',
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

function transition(po, newStatus) {
  if (!STATUSES.includes(newStatus)) return { ok: false, error: '미정의' };
  const valid = {
    PENDING:    ['ORDERED','CANCELED'],
    ORDERED:    ['DELIVERED','RETURNED','CANCELED'],
    DELIVERED:  ['RETURNED'],
    RETURNED:   [],
    CANCELED:   []
  };
  if (!valid[po.status].includes(newStatus)) {
    return { ok: false, error: po.status + ' → ' + newStatus };
  }
  po.status = newStatus;
  if (newStatus === 'ORDERED' && !po.orderedAt) po.orderedAt = Date.now();
  return { ok: true, po: po };
}

function toDBRow(po) {
  return {
    id: po.id,
    contract_id: po.contractId,
    tenant_id: po.tenantId,
    vendor_name: po.vendorName,
    category: po.category,
    ks_code: po.ksCode,
    qty: po.qty,
    unit: po.unit,
    unit_price: po.unitPrice,
    total_price: po.totalPrice,
    ordered_at: po.orderedAt,
    expected_delivery: po.expectedDelivery,
    status: po.status,
    is_simulated: po.isSimulated ? 1 : 0,
    created_at: po.createdAt
  };
}

module.exports = {
  STATUSES: STATUSES,
  createPO: createPO,
  transition: transition,
  toDBRow: toDBRow
};
```

### 3-2. shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs

```javascript
const { STATUSES, createPO, transition, toDBRow } = require('../purchase/PurchaseOrder.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

(function() {
  assert(STATUSES.length === 5, '5 상태');
})();

(function() {
  const po = createPO({
    contractId: 'c_001',
    qty: 10,
    unitPrice: 50000,
    category: 'flooring',
    ksCode: 'KS F 3110'
  });
  assert(po.totalPrice === 500000, '단가 × 수량 자동');
  assert(po.ksCode === 'KS F 3110', 'KS 코드');
  assert(po.status === 'PENDING', '기본 PENDING');
})();

// 상태 전이
(function() {
  const po = createPO({ contractId: 'c', qty: 1, unitPrice: 100 });
  assert(transition(po, 'ORDERED').ok === true, '주문');
  assert(po.orderedAt > 0, 'orderedAt 자동');
  assert(transition(po, 'DELIVERED').ok === true, '배송');
  assert(transition(po, 'RETURNED').ok === true, '반품');
})();

// 잘못된 전이
(function() {
  const po = createPO({ contractId: 'c', qty: 1, unitPrice: 100 });
  assert(transition(po, 'DELIVERED').ok === false, 'PENDING → DELIVERED 차단');
})();

// toDBRow
(function() {
  const po = createPO({ contractId: 'c', qty: 5, unitPrice: 1000, isSimulated: true });
  const row = toDBRow(po);
  assert(row.is_simulated === 1, '시뮬 1');
})();

console.log('[PASS] PurchaseOrder (5/5)');
```

### 3-3. 검증

```bash
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
# 기대: [PASS] PurchaseOrder (5/5)
```

---

## 작업 4: Schedule 모듈

### 4-1. shell/src/closed-loop/schedule/Schedule.cjs

```javascript
// ECOREAN BOC v5.6 — Schedule (공정 일정 모듈)

const STATUSES = ['PLANNED','IN_PROGRESS','COMPLETED','DELAYED','BLOCKED'];

// 섹션별 표준 공정 기간 (일) — 시뮬레이션 기본값
const SECTION_DURATION_DAYS = {
  bathroom: 5, kitchen: 4, living: 3, bedroom: 2, balcony: 2,
  entrance: 1, dressing: 2, study: 2, dining: 1, pantry: 1,
  utility: 2, powder: 2, plumbing: 3, electric: 3, window: 2,
  insulation: 4, exterior: 7, boiler: 2, hallway: 1, stairs: 2,
  rooftop: 3, basement: 3
};

function createSchedule(opts) {
  if (!opts.contractId) throw new Error('Schedule: contractId 필수');
  if (!opts.sectionId) throw new Error('Schedule: sectionId 필수');
  if (!opts.startDate) throw new Error('Schedule: startDate 필수');

  const duration = opts.durationDays || SECTION_DURATION_DAYS[opts.sectionId] || 3;
  const endDate = opts.endDate || (opts.startDate + duration * 24 * 60 * 60 * 1000);

  return {
    id: opts.id || ('sch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    contractId: opts.contractId,
    tenantId: opts.tenantId || 'HQ',
    sectionId: opts.sectionId,
    taskName: opts.taskName || (opts.sectionId + ' 공정'),
    startDate: opts.startDate,
    endDate: endDate,
    durationDays: duration,
    dependencies: opts.dependencies || [],
    status: opts.status || 'PLANNED',
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

// 계약 → 다중 공정 자동 생성
function generateSchedulesForContract(contractId, sections, startDate, opts) {
  const schedules = [];
  let cursor = startDate;

  sections.forEach(function(secId) {
    const duration = SECTION_DURATION_DAYS[secId] || 3;
    const sched = createSchedule({
      contractId: contractId,
      tenantId: (opts && opts.tenantId) || 'HQ',
      sectionId: secId,
      startDate: cursor,
      durationDays: duration,
      isSimulated: opts && opts.isSimulated
    });
    schedules.push(sched);
    cursor = sched.endDate;
  });

  return schedules;
}

function transition(sched, newStatus) {
  if (!STATUSES.includes(newStatus)) return { ok: false, error: '미정의' };
  const valid = {
    PLANNED:     ['IN_PROGRESS','BLOCKED','DELAYED'],
    IN_PROGRESS: ['COMPLETED','DELAYED','BLOCKED'],
    COMPLETED:   [],
    DELAYED:     ['IN_PROGRESS','BLOCKED'],
    BLOCKED:     ['PLANNED','IN_PROGRESS']
  };
  if (!valid[sched.status].includes(newStatus)) {
    return { ok: false, error: sched.status + ' → ' + newStatus };
  }
  sched.status = newStatus;
  return { ok: true, sched: sched };
}

function toDBRow(s) {
  return {
    id: s.id,
    contract_id: s.contractId,
    tenant_id: s.tenantId,
    section_id: s.sectionId,
    task_name: s.taskName,
    start_date: s.startDate,
    end_date: s.endDate,
    duration_days: s.durationDays,
    dependencies: JSON.stringify(s.dependencies),
    status: s.status,
    is_simulated: s.isSimulated ? 1 : 0,
    created_at: s.createdAt
  };
}

module.exports = {
  STATUSES: STATUSES,
  SECTION_DURATION_DAYS: SECTION_DURATION_DAYS,
  createSchedule: createSchedule,
  generateSchedulesForContract: generateSchedulesForContract,
  transition: transition,
  toDBRow: toDBRow
};
```

### 4-2. shell/src/closed-loop/__tests__/Schedule.test.cjs

```javascript
const {
  STATUSES, SECTION_DURATION_DAYS, createSchedule,
  generateSchedulesForContract, transition, toDBRow
} = require('../schedule/Schedule.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

(function() {
  assert(STATUSES.length === 5, '5 상태');
})();

// 단일 일정
(function() {
  const start = Date.now();
  const s = createSchedule({
    contractId: 'c1',
    sectionId: 'bathroom',
    startDate: start
  });
  assert(s.durationDays === 5, '욕실 5일');
  assert(s.endDate === start + 5 * 24 * 60 * 60 * 1000, 'end 자동');
})();

// 다중 일정 자동 생성 — 의존성
(function() {
  const start = Date.now();
  const list = generateSchedulesForContract(
    'c1', ['bathroom','kitchen','living'], start
  );
  assert(list.length === 3, '3 공정');
  assert(list[0].sectionId === 'bathroom', '욕실 첫 공정');
  // 두 번째 공정 시작 = 첫 번째 공정 종료
  assert(list[1].startDate === list[0].endDate, '의존 시점');
})();

// 상태 전이
(function() {
  const s = createSchedule({ contractId: 'c', sectionId: 'living', startDate: Date.now() });
  assert(transition(s, 'IN_PROGRESS').ok === true, '진행');
  assert(transition(s, 'COMPLETED').ok === true, '완료');
})();

// DELAYED → IN_PROGRESS 가능
(function() {
  const s = createSchedule({ contractId: 'c', sectionId: 'living', startDate: Date.now() });
  transition(s, 'IN_PROGRESS');
  transition(s, 'DELAYED');
  assert(transition(s, 'IN_PROGRESS').ok === true, '재개');
})();

console.log('[PASS] Schedule (5/5)');
```

### 4-3. 검증

```bash
node shell/src/closed-loop/__tests__/Schedule.test.cjs
# 기대: [PASS] Schedule (5/5)
```

---

## 작업 5: Inspection 모듈

### 5-1. shell/src/closed-loop/inspection/Inspection.cjs

```javascript
// ECOREAN BOC v5.6 — Inspection (검수 모듈)
// 절대 룰: 검수 실패 후 후속 공정 진행 금지

const RESULTS = ['PASS','FAIL','CONDITIONAL_PASS','PENDING'];

function createInspection(opts) {
  if (!opts.scheduleId) throw new Error('Inspection: scheduleId 필수');
  if (!opts.sectionId) throw new Error('Inspection: sectionId 필수');

  return {
    id: opts.id || ('insp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    scheduleId: opts.scheduleId,
    tenantId: opts.tenantId || 'HQ',
    sectionId: opts.sectionId,
    inspector: opts.inspector || 'TBD',
    inspectedAt: opts.inspectedAt || null,
    result: opts.result || 'PENDING',
    notes: opts.notes || '',
    defects: opts.defects || [],
    needsResearch: opts.needsResearch === true,
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

function recordResult(inspection, opts) {
  if (!RESULTS.includes(opts.result)) {
    return { ok: false, error: '미정의 결과: ' + opts.result };
  }
  inspection.result = opts.result;
  inspection.inspectedAt = opts.inspectedAt || Date.now();
  inspection.inspector = opts.inspector || inspection.inspector;
  inspection.notes = opts.notes || '';
  inspection.defects = opts.defects || [];
  inspection.needsResearch = opts.needsResearch === true;
  return { ok: true, inspection: inspection };
}

// 절대 룰 — 검수 실패 후 후속 공정 진행 금지
function canProceedAfter(inspection) {
  if (inspection.result === 'PENDING') return { ok: false, reason: '검수 미실시' };
  if (inspection.result === 'FAIL') return { ok: false, reason: '검수 실패 — 후속 공정 진행 금지' };
  if (inspection.result === 'CONDITIONAL_PASS' && inspection.needsResearch) {
    return { ok: false, reason: 'NEEDS_RESEARCH 미해결' };
  }
  return { ok: true };
}

function toDBRow(i) {
  return {
    id: i.id,
    schedule_id: i.scheduleId,
    tenant_id: i.tenantId,
    section_id: i.sectionId,
    inspector: i.inspector,
    inspected_at: i.inspectedAt,
    result: i.result,
    notes: i.notes,
    defects_json: JSON.stringify(i.defects || []),
    needs_research: i.needsResearch ? 1 : 0,
    is_simulated: i.isSimulated ? 1 : 0,
    created_at: i.createdAt
  };
}

module.exports = {
  RESULTS: RESULTS,
  createInspection: createInspection,
  recordResult: recordResult,
  canProceedAfter: canProceedAfter,
  toDBRow: toDBRow
};
```

### 5-2. shell/src/closed-loop/__tests__/Inspection.test.cjs

```javascript
const {
  RESULTS, createInspection, recordResult, canProceedAfter, toDBRow
} = require('../inspection/Inspection.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

(function() {
  assert(RESULTS.length === 4, '4 결과 타입');
})();

(function() {
  const i = createInspection({ scheduleId: 's1', sectionId: 'bathroom' });
  assert(i.result === 'PENDING', '기본 PENDING');
  assert(i.needsResearch === false, '기본 false');
})();

// 결과 기록
(function() {
  const i = createInspection({ scheduleId: 's1', sectionId: 'bathroom' });
  const r = recordResult(i, { result: 'PASS', inspector: '대표님' });
  assert(r.ok === true, 'PASS 기록');
  assert(i.result === 'PASS', '결과 PASS');
  assert(i.inspectedAt > 0, '시점 자동');
})();

// 절대 룰 — PENDING 후속 차단
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'bathroom' });
  const can = canProceedAfter(i);
  assert(can.ok === false, 'PENDING 차단');
})();

// 절대 룰 — FAIL 후속 차단
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'bathroom' });
  recordResult(i, { result: 'FAIL', defects: [{ severity: 'high', desc: '방수 누수' }] });
  const can = canProceedAfter(i);
  assert(can.ok === false, 'FAIL 차단');
  assert(can.reason.includes('실패'), 'reason 명시');
})();

// PASS 후속 진행 가능
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'living' });
  recordResult(i, { result: 'PASS' });
  assert(canProceedAfter(i).ok === true, 'PASS 진행');
})();

// CONDITIONAL_PASS — needsResearch 미해결 차단
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'kitchen' });
  recordResult(i, { result: 'CONDITIONAL_PASS', needsResearch: true });
  assert(canProceedAfter(i).ok === false, 'NEEDS_RESEARCH 차단');
})();

// CONDITIONAL_PASS — needsResearch 해결 진행 가능
(function() {
  const i = createInspection({ scheduleId: 's', sectionId: 'kitchen' });
  recordResult(i, { result: 'CONDITIONAL_PASS', needsResearch: false });
  assert(canProceedAfter(i).ok === true, '해결 후 진행');
})();

console.log('[PASS] Inspection (8/8)');
```

### 5-3. 검증

```bash
node shell/src/closed-loop/__tests__/Inspection.test.cjs
# 기대: [PASS] Inspection (8/8)
```

---

## 작업 6: 시뮬레이션 1건 자동 생성

### 6-1. sims/scenario_001.cjs

```javascript
#!/usr/bin/env node
// ECOREAN BOC v5.6 — 시뮬레이션 시나리오 #001
// 30평 아파트 + 클래식럭셔리 + 욕실/주방/거실
// 견적 → 계약 → 발주 → 공정 → 검수 전 흐름
//
// 절대 규칙: isSimulated = true 명시

const path = require('path');
const Database = require('better-sqlite3');

const { calculateEstimate } = require(path.join(__dirname, '..', 'modules-html', 'estimate-v6', 'src', 'calc', 'CalcEngineV56.cjs'));
const { createContract, transition: transitionContract, toDBRow: contractToDBRow } = require(path.join(__dirname, '..', 'shell', 'src', 'closed-loop', 'contract', 'Contract.cjs'));
const { createPO, transition: transitionPO, toDBRow: poToDBRow } = require(path.join(__dirname, '..', 'shell', 'src', 'closed-loop', 'purchase', 'PurchaseOrder.cjs'));
const { generateSchedulesForContract, transition: transitionSched, toDBRow: schedToDBRow } = require(path.join(__dirname, '..', 'shell', 'src', 'closed-loop', 'schedule', 'Schedule.cjs'));
const { createInspection, recordResult, toDBRow: inspToDBRow } = require(path.join(__dirname, '..', 'shell', 'src', 'closed-loop', 'inspection', 'Inspection.cjs'));

const DB_PATH = path.join(__dirname, '..', 'ecorean-boc.db');
const SIM_KEY = 'simulation-master-key-week8';

function run() {
  const db = new Database(DB_PATH);
  console.log('===== 시뮬레이션 #001 시작 =====');
  console.log('30평 아파트 + 클래식럭셔리 + 욕실/주방/거실 35㎡');
  console.log('');

  // STEP 1: 견적
  const estimate = calculateEstimate({
    lineItems: [
      { qty: 5,  wasteRate: 0.05, laborCost: 100000, pm: 1, materialCost: 200000 },
      { qty: 10, wasteRate: 0.05, laborCost: 80000,  pm: 1, materialCost: 150000 },
      { qty: 20, wasteRate: 0.05, laborCost: 60000,  pm: 1, materialCost: 100000 }
    ],
    residence: 'APARTMENT', concept: 'CLASSIC_LUXURY',
    occupied: false, floorLevel: 5, hasElev: true, areaSqm: 35
  });
  console.log('[1] 견적 완료');
  console.log('    공급:    ' + estimate.payload.supply.toLocaleString() + '원');
  console.log('    도급:    ' + estimate.payload.contract.toLocaleString() + '원');
  console.log('    최종:    ' + estimate.payload.final.toLocaleString() + '원');

  // STEP 2: 계약
  const contract = createContract({
    estimateId: 'sim_estimate_001',
    totalAmount: estimate.payload.contract,
    customerName: '시뮬레이션 고객',
    customerPhone: '010-0000-0000',
    customerAddress: '서울시 강남구 시뮬동',
    isSimulated: true
  });
  transitionContract(contract, 'SIGNED');
  db.prepare(`INSERT INTO contracts (id, estimate_id, tenant_id, customer_name_enc, customer_phone_hash, customer_address_enc, total_amount, vat_amount, final_amount, signed_at, status, is_simulated, created_at) VALUES (@id, @estimate_id, @tenant_id, @customer_name_enc, @customer_phone_hash, @customer_address_enc, @total_amount, @vat_amount, @final_amount, @signed_at, @status, @is_simulated, @created_at)`).run(contractToDBRow(contract, SIM_KEY));
  console.log('[2] 계약 체결: ' + contract.id);

  // STEP 3: 발주 (3건 — 욕실 자재, 주방 자재, 거실 자재)
  const orders = [
    createPO({ contractId: contract.id, vendorName: 'SIM 자재상사', category: 'tile', ksCode: 'KS L 1106', qty: 5, unit: '㎡', unitPrice: 200000, isSimulated: true }),
    createPO({ contractId: contract.id, vendorName: 'SIM 자재상사', category: 'flooring', ksCode: 'KS F 3111', qty: 30, unit: '㎡', unitPrice: 150000, isSimulated: true }),
    createPO({ contractId: contract.id, vendorName: 'SIM 자재상사', category: 'wallcovering', ksCode: 'KS M 7305', qty: 100, unit: '㎡', unitPrice: 30000, isSimulated: true })
  ];
  orders.forEach(function(po) {
    transitionPO(po, 'ORDERED');
    db.prepare(`INSERT INTO purchase_orders (id, contract_id, tenant_id, vendor_name, category, ks_code, qty, unit, unit_price, total_price, ordered_at, expected_delivery, status, is_simulated, created_at) VALUES (@id, @contract_id, @tenant_id, @vendor_name, @category, @ks_code, @qty, @unit, @unit_price, @total_price, @ordered_at, @expected_delivery, @status, @is_simulated, @created_at)`).run(poToDBRow(po));
  });
  console.log('[3] 발주 ' + orders.length + '건 (' + orders.reduce(function(s,p){return s+p.totalPrice;},0).toLocaleString() + '원)');

  // STEP 4: 공정 일정 (3 섹션, 첫 시공 가정 시작일 7일 후)
  const startDate = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const schedules = generateSchedulesForContract(
    contract.id, ['bathroom','kitchen','living'], startDate, { isSimulated: true }
  );
  schedules.forEach(function(s) {
    transitionSched(s, 'IN_PROGRESS');
    db.prepare(`INSERT INTO schedules (id, contract_id, tenant_id, section_id, task_name, start_date, end_date, duration_days, dependencies, status, is_simulated, created_at) VALUES (@id, @contract_id, @tenant_id, @section_id, @task_name, @start_date, @end_date, @duration_days, @dependencies, @status, @is_simulated, @created_at)`).run(schedToDBRow(s));
  });
  const totalDays = schedules.reduce(function(s,sc){return s+sc.durationDays;},0);
  console.log('[4] 공정 일정 ' + schedules.length + '건 (총 ' + totalDays + '일)');

  // STEP 5: 검수 (각 공정 PASS)
  schedules.forEach(function(sch) {
    const insp = createInspection({
      scheduleId: sch.id,
      sectionId: sch.sectionId,
      inspector: '시뮬-검수자',
      isSimulated: true
    });
    recordResult(insp, { result: 'PASS', notes: '시뮬레이션 검수 통과' });
    transitionSched(sch, 'COMPLETED');
    db.prepare(`INSERT INTO inspections (id, schedule_id, tenant_id, section_id, inspector, inspected_at, result, notes, defects_json, needs_research, is_simulated, created_at) VALUES (@id, @schedule_id, @tenant_id, @section_id, @inspector, @inspected_at, @result, @notes, @defects_json, @needs_research, @is_simulated, @created_at)`).run(inspToDBRow(insp));
  });
  console.log('[5] 검수 ' + schedules.length + '건 모두 PASS');

  // STEP 6: 계약 완료
  transitionContract(contract, 'COMPLETED');
  db.prepare(`UPDATE contracts SET status = ? WHERE id = ?`).run(contract.status, contract.id);
  console.log('[6] 계약 완료');

  // 요약
  console.log('');
  console.log('===== 시뮬레이션 #001 완료 =====');
  const cnt = {
    contracts: db.prepare("SELECT COUNT(*) as c FROM contracts WHERE is_simulated=1").get().c,
    orders:    db.prepare("SELECT COUNT(*) as c FROM purchase_orders WHERE is_simulated=1").get().c,
    sched:     db.prepare("SELECT COUNT(*) as c FROM schedules WHERE is_simulated=1").get().c,
    insp:      db.prepare("SELECT COUNT(*) as c FROM inspections WHERE is_simulated=1").get().c
  };
  console.log('  시뮬 계약:   ' + cnt.contracts);
  console.log('  시뮬 발주:   ' + cnt.orders);
  console.log('  시뮬 공정:   ' + cnt.sched);
  console.log('  시뮬 검수:   ' + cnt.insp);

  db.close();
}

if (require.main === module) run();

module.exports = { run: run };
```

### 6-2. 실행

```bash
node sims/scenario_001.cjs
# 기대:
# [1] 견적 완료
# [2] 계약 체결
# [3] 발주 3건
# [4] 공정 일정 3건 (총 12일)
# [5] 검수 3건 모두 PASS
# [6] 계약 완료
# 시뮬 계약: 1, 시뮬 발주: 3, 시뮬 공정: 3, 시뮬 검수: 3
```

---

## 작업 7: ML Phase 1 진입 자리

### 7-1. shell/src/ml/MLPhase1.cjs

```javascript
// ECOREAN BOC v5.6 — ML Phase 1 (수동 단계, 0~49건)
// SoT: docs/MASTER_PLAN.md ML 피드백 루프
// 0~49건: 수동 / 50~99: 통계 / 100~499: XGBoost / 500+: DL

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'ecorean-boc.db');

const PHASE_THRESHOLDS = {
  PHASE_1_MANUAL:    { min: 0,    max: 49,  algo: 'manual' },
  PHASE_2_STATS:     { min: 50,   max: 99,  algo: 'statistics' },
  PHASE_3_XGBOOST:   { min: 100,  max: 499, algo: 'xgboost' },
  PHASE_4_DEEP:      { min: 500,  max: Infinity, algo: 'deep_learning' }
};

// 현재 ML Phase 결정
function getCurrentPhase(realCount) {
  if (realCount <= 49) return 'PHASE_1_MANUAL';
  if (realCount <= 99) return 'PHASE_2_STATS';
  if (realCount <= 499) return 'PHASE_3_XGBOOST';
  return 'PHASE_4_DEEP';
}

// 학습 데이터 카운트 — 시뮬 vs 실거래 분리
function countLearningData(opts) {
  const includeSimulated = opts && opts.includeSimulated === true;
  const tenantId = (opts && opts.tenantId) || 'HQ';

  const db = new Database(DB_PATH);
  let real = 0;
  let sim = 0;

  try {
    // COMPLETED 상태의 계약만 학습 데이터로 인정
    real = db.prepare(`SELECT COUNT(*) as c FROM contracts WHERE status='COMPLETED' AND is_simulated=0 AND tenant_id=?`).get(tenantId).c;
    sim  = db.prepare(`SELECT COUNT(*) as c FROM contracts WHERE status='COMPLETED' AND is_simulated=1 AND tenant_id=?`).get(tenantId).c;
  } catch(e) {
    // 테이블 미존재 등
  }
  db.close();

  return {
    real: real,
    simulated: sim,
    total: includeSimulated ? real + sim : real,
    phase: getCurrentPhase(includeSimulated ? real + sim : real)
  };
}

// ML 통계 (Phase 1: 수동 — 단순 평균)
function computeBasicStatistics(opts) {
  const tenantId = (opts && opts.tenantId) || 'HQ';
  const includeSimulated = opts && opts.includeSimulated === true;

  const db = new Database(DB_PATH);
  let rows = [];
  try {
    if (includeSimulated) {
      rows = db.prepare(`SELECT total_amount, final_amount, is_simulated FROM contracts WHERE status='COMPLETED' AND tenant_id=?`).all(tenantId);
    } else {
      rows = db.prepare(`SELECT total_amount, final_amount, is_simulated FROM contracts WHERE status='COMPLETED' AND is_simulated=0 AND tenant_id=?`).all(tenantId);
    }
  } catch(e) {}
  db.close();

  if (rows.length === 0) {
    return { count: 0, avgContract: 0, avgFinal: 0, phase: 'PHASE_1_MANUAL' };
  }

  const sumContract = rows.reduce(function(s, r) { return s + r.total_amount; }, 0);
  const sumFinal = rows.reduce(function(s, r) { return s + r.final_amount; }, 0);

  return {
    count: rows.length,
    realCount: rows.filter(function(r) { return r.is_simulated === 0; }).length,
    simulatedCount: rows.filter(function(r) { return r.is_simulated === 1; }).length,
    avgContract: Math.round(sumContract / rows.length),
    avgFinal: Math.round(sumFinal / rows.length),
    phase: getCurrentPhase(rows.length)
  };
}

module.exports = {
  PHASE_THRESHOLDS: PHASE_THRESHOLDS,
  getCurrentPhase: getCurrentPhase,
  countLearningData: countLearningData,
  computeBasicStatistics: computeBasicStatistics
};
```

### 7-2. shell/src/ml/__tests__/MLPhase1.test.cjs

```javascript
const {
  PHASE_THRESHOLDS, getCurrentPhase,
  countLearningData, computeBasicStatistics
} = require('../MLPhase1.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 4 Phase 정의
(function() {
  assert(Object.keys(PHASE_THRESHOLDS).length === 4, '4 Phase');
})();

// Test 2: Phase 분기
(function() {
  assert(getCurrentPhase(0) === 'PHASE_1_MANUAL', '0건 = Phase 1');
  assert(getCurrentPhase(49) === 'PHASE_1_MANUAL', '49건 = Phase 1');
  assert(getCurrentPhase(50) === 'PHASE_2_STATS', '50건 = Phase 2');
  assert(getCurrentPhase(99) === 'PHASE_2_STATS', '99건 = Phase 2');
  assert(getCurrentPhase(100) === 'PHASE_3_XGBOOST', '100건 = Phase 3');
  assert(getCurrentPhase(499) === 'PHASE_3_XGBOOST', '499건 = Phase 3');
  assert(getCurrentPhase(500) === 'PHASE_4_DEEP', '500건 = Phase 4');
  assert(getCurrentPhase(10000) === 'PHASE_4_DEEP', '대량 = Phase 4');
})();

// Test 3: 시뮬 1건 후 카운트
(function() {
  const result = countLearningData({ includeSimulated: true });
  assert(result.simulated >= 1, '시뮬 1건 이상');
  assert(result.phase === 'PHASE_1_MANUAL', 'Phase 1 (49건 이하)');
})();

// Test 4: 실거래만 카운트 — 시뮬 제외
(function() {
  const realOnly = countLearningData({ includeSimulated: false });
  assert(realOnly.simulated === 0, '실거래만 = simulated 0');
  // 실거래 0이면 phase = Phase 1
  if (realOnly.real === 0) {
    assert(realOnly.phase === 'PHASE_1_MANUAL', '실거래 0 = Phase 1');
  }
})();

// Test 5: 통계 — 시뮬 포함
(function() {
  const stats = computeBasicStatistics({ includeSimulated: true });
  assert(typeof stats.count === 'number', 'count 숫자');
  assert(typeof stats.avgContract === 'number', 'avgContract 숫자');
})();

console.log('[PASS] MLPhase1 (5/5)');
```

### 7-3. 검증

```bash
node shell/src/ml/__tests__/MLPhase1.test.cjs
# 기대: [PASS] MLPhase1 (5/5)
```

---

## 작업 8: 통합 테스트 — Phase 3-H Gate Test

```bash
# Week 8 신규
node shell/src/closed-loop/__tests__/Contract.test.cjs           # 10/10
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs      # 5/5
node shell/src/closed-loop/__tests__/Schedule.test.cjs           # 5/5
node shell/src/closed-loop/__tests__/Inspection.test.cjs         # 8/8
node shell/src/ml/__tests__/MLPhase1.test.cjs                    # 5/5
node sims/scenario_001.cjs                                        # PASS

# 누적 회귀 (Week 1~7 핵심)
node shell/src/core-bus/__tests__/CoreBus.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs
node modules-html/cad/__tests__/DrawingModel.test.cjs
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs
node modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs
node shell/src/meta/__tests__/Universe.test.cjs
node shell/src/korea/__tests__/KoreaBuildingRules.test.cjs
node shell/src/security/__tests__/Encryption.test.cjs
node test-engine.js
```

### 8-1. PHASE_3H_COMPLETE 활성화 (신설)

`shell/src/feature-flags/flags.cjs`에 추가:
```javascript
PHASE_3H_COMPLETE:      true,
USE_CLOSED_LOOP:        true,    // Closed Loop 4 모듈 활성
ML_PHASE_1_ENTRY:       true     // ML Phase 1 진입 (시뮬 데이터 포함)
```

### 8-2. flags 테스트 갱신

```javascript
assert(isEnabled('PHASE_3H_COMPLETE') === true, 'PHASE_3H_COMPLETE Week8 완료');
assert(isEnabled('USE_CLOSED_LOOP') === true, 'Closed Loop 활성');
assert(isEnabled('ML_PHASE_1_ENTRY') === true, 'ML Phase 1 진입');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
```

---

## 작업 9: 커밋 (4개 분리)

```bash
# 커밋 1: DB 마이그레이션 + Closed Loop 4 모듈
git add db/migrations/v5.6/003_closed_loop_up.sql db/migrations/v5.6/003_closed_loop_down.sql scripts/migrate_v5.6_closed_loop.cjs shell/src/closed-loop/
git commit -m "feat(v5.6/closed-loop): Closed Loop 4 모듈 + DB 4 테이블 (28/28 PASS)

- contracts/purchase_orders/schedules/inspections 테이블
- 멀티테넌시 + is_simulated 플래그 + rollback SQL
- Contract: 4상태 + 개인정보 암호화 + VAT 자동 (10/10)
- PurchaseOrder: 5상태 + 단가×수량 자동 (5/5)
- Schedule: 5상태 + 22 섹션 표준 공정일 + 의존성 (5/5)
- Inspection: 4결과 + 절대 룰 (검수실패 후속 차단) (8/8)
- 모든 모듈 toDBRow/transition/validate 표준 인터페이스"

# 커밋 2: 시뮬레이션 시나리오 #001
git add sims/scenario_001.cjs
git commit -m "feat(v5.6/sims): 시뮬레이션 시나리오 #001 (30평 아파트 + 클래식럭셔리)

- 견적 → 계약(SIGNED) → 발주(3건 ORDERED) → 공정(3건 IN_PROGRESS) → 검수(3건 PASS) → 완료
- isSimulated=true 명시 (실거래 데이터와 분리)
- 35㎡ / 12일 공정 / KS 코드 매핑 자동
- DB 적재 검증 (시뮬 1+3+3+3 row)"

# 커밋 3: ML Phase 1 진입
git add shell/src/ml/
git commit -m "feat(v5.6/ml): ML Phase 1 진입 자리 (시뮬+실거래 분리 카운트, 5/5 PASS)

- 4 Phase 자동 분기 (수동 0~49 / 통계 50~99 / XGBoost 100~499 / DL 500+)
- countLearningData(includeSimulated): 시뮬 학습 가능 + 실거래만 카운트 분리
- computeBasicStatistics: avg 계약/최종 (Phase 1 단순 평균)
- 실거래 들어오면 즉시 교체 가능"

# 커밋 4: PHASE_3H_COMPLETE
git add shell/src/feature-flags/
git commit -m "feat(v5.6/phase-3h): Phase 3 Week 8 완료 — Closed Loop + ML Phase 1 진입

- PHASE_3H_COMPLETE = true
- USE_CLOSED_LOOP = true (4 모듈 활성)
- ML_PHASE_1_ENTRY = true (시뮬 1건 기반)
- Critical 위험 C2 백업 계획 발동: 시뮬 → 실거래 교체 가능 구조
- 모든 회귀 PASS"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 8 완료 (Phase 3-H Closed Loop + ML Phase 1)

[신규 모듈]
- shell/src/closed-loop/contract/Contract.cjs           — 계약 (4상태)
- shell/src/closed-loop/purchase/PurchaseOrder.cjs      — 발주 (5상태)
- shell/src/closed-loop/schedule/Schedule.cjs           — 공정 (5상태)
- shell/src/closed-loop/inspection/Inspection.cjs       — 검수 (절대 룰)
- shell/src/ml/MLPhase1.cjs                              — ML 카운트 + Phase 분기
- sims/scenario_001.cjs                                  — 시뮬레이션 #001

[신규 DB]
- contracts / purchase_orders / schedules / inspections (4 테이블)
- rollback SQL 쌍

[테스트 결과]
- Contract:        10/10 PASS
- PurchaseOrder:    5/5 PASS
- Schedule:         5/5 PASS
- Inspection:       8/8 PASS
- MLPhase1:         5/5 PASS
- 시뮬 시나리오:   PASS (1 계약 + 3 발주 + 3 공정 + 3 검수)
- 누적 회귀:       PASS

[Closed Loop 1 사이클 완성]
견적(35㎡) → 계약(SIGNED) → 발주(3건 ORDERED) → 공정(12일 IN_PROGRESS) → 검수(PASS×3) → 완료
공급 7,350,000원 → 도급 15,214,500원 → 최종 16,735,950원

[ML Phase 1 진입]
- 시뮬 1건 학습 데이터 적재 (is_simulated=1)
- 실거래 0건 → Phase 1 (수동) 단계
- 실거래 들어오면 즉시 교체 가능 구조

[Critical 위험 C2 대응]
✅ 시뮬레이션 백업 계획 발동
✅ 실거래 들어오면 즉시 교체 가능 (isSimulated=false 데이터만 추가)

[다음 주 — 마지막]
Phase 3 Week 9: 마무리
- MASTER_PLAN.md v5.7 보정
- RISK_REGISTER 갱신
- ARCHITECTURE 통합 문서
- 9주 완주 회고
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- 시뮬 데이터에 is_simulated=0 표시 (실거래 위장 금지)
- 검수 실패 후 후속 공정 진행 (절대 룰)
- 단가 추정 (시뮬 단가는 임의 — 실 cost_items DB는 별도)

---

**문서 끝.**
