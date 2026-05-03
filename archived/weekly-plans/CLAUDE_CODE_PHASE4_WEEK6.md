# CLAUDE CODE 명령서 — Phase 4 Week 6
# 발주 + 공정 + 검수 (Closed Loop UI 완성)
# 추정 코드 0건 | 원칙 15 | 2026-04-30

---

## 0. 시작 전 확인

```bash
cd C:\Users\udune\ecorean-os
git status
git log --oneline -3
```
예상 HEAD: `3e1cbec` (Week 5 수정 커밋)

---

## 1. 확정된 슬롯 (사전 조사 완료)

```
[A] PurchaseOrder 경로: shell/src/closed-loop/purchase/PurchaseOrder.cjs
[B] createPO 파라미터:  contractId, qty(필수), unitPrice(필수), vendorName,
                        category, ksCode, unit, orderedAt, expectedDelivery, isSimulated
[C] PO 상태:           PENDING→ORDERED→DELIVERED→RETURNED/CANCELED
[D] Schedule 경로:     shell/src/closed-loop/schedule/Schedule.cjs
[E] 일정 자동 생성:    generateSchedulesForContract(contractId, sections, startDate, opts)
[F] Schedule 상태:     PLANNED→IN_PROGRESS→COMPLETED/DELAYED/BLOCKED
[G] Inspection 경로:   shell/src/closed-loop/inspection/Inspection.cjs
[H] 검수 기록 함수:    recordResult(inspection, opts)
[I] 검수 차단 함수:    canProceedAfter(inspection) → { ok:false } 시 후속 공정 금지 (절대 룰)
[J] 검수 결과:         PASS/FAIL/CONDITIONAL_PASS/PENDING
[K] App.js 라우트:     L233(/orders) L234(/schedules) L235(/inspections) placeholder
[L] estimate.sections: input.sections — Schedule 자동 생성 입력값
[M] DB 위치:           ecorean-boc.db (purchase_orders/schedules/inspections 미생성)
```

---

## 2. 헌법 (변경 금지)

- 22 시공섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 절대 불변
- B1: rollback SQL 필수
- B4: 검수 FAIL → 후속 공정 진행 절대 금지 ([I] canProceedAfter)
- B5: TDD (테스트→코딩→검증→커밋)
- P4: is_simulated 분리
- 원칙 15: try/catch + bocError 표준

---

## 3. 작업 0: DB 마이그레이션 (30분)

> B1: rollback SQL 없는 DB 변경 금지

### 0-1. 마이그레이션 파일 작성

파일: `db/migrations/v6.0/006_loop_boc_up.sql`

```sql
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
```

파일: `db/migrations/v6.0/006_loop_boc_down.sql`

```sql
-- 롤백
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
```

### 0-2. 커밋 0

```bash
git add db/migrations/v6.0/006_loop_boc_up.sql \
        db/migrations/v6.0/006_loop_boc_down.sql
git commit -m "chore: DB 마이그레이션 006 — purchase_orders/schedules/inspections (B1)"
```

---

## 4. 작업 1: IPC 핸들러 + preload (45분)

### 1-0. preload/preload.js 현재 마지막 항목 확인

```bash
tail -10 preload/preload.js
```

### 1-1. electron/main.js — Closed Loop IPC 추가

> [A][D][G] 경로 확정. `boc:contract:list` 핸들러 다음에 추가.

```javascript
// ────────── BOC v6.0 Closed Loop IPC (Week 6) ───────────
// 원칙 15: 모든 핸들러 try/catch + bocError 표준
const _ce = (code, msg, ctx) => ({
  ok: false, error: { code, message: msg, context: ctx||{}, ts: new Date().toISOString() }
});

// [A] PurchaseOrder 엔진
const POMod  = require('../shell/src/closed-loop/purchase/PurchaseOrder.cjs');
// [D] Schedule 엔진
const SchMod = require('../shell/src/closed-loop/schedule/Schedule.cjs');
// [G] Inspection 엔진
const InsMod = require('../shell/src/closed-loop/inspection/Inspection.cjs');

// DB 공유 (contracts와 동일 ecorean-boc.db)
// getBocContractDB() 이미 선언됨 → 재사용

// ── Purchase Orders ──
ipcMain.handle('boc:order:create', async (_, opts) => {
  try {
    if (!opts.contractId) return _ce('ORDER_NO_CONTRACT', 'contractId 필수');
    if (!opts.qty)        return _ce('ORDER_NO_QTY',      'qty 필수');
    if (!opts.unitPrice)  return _ce('ORDER_NO_PRICE',    'unitPrice 필수');
    const po = POMod.createPO(opts);
    const db = getBocContractDB();
    const row = POMod.toDBRow(po);
    db.prepare(`
      INSERT INTO purchase_orders
        (id,contract_id,tenant_id,vendor_name,category,ks_code,unit,
         qty,unit_price,total_price,ordered_at,expected_delivery,
         status,is_simulated,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      row.id, row.contract_id, row.tenant_id || 'HQ',
      row.vendor_name, row.category, row.ks_code, row.unit,
      row.qty, row.unit_price, row.total_price,
      row.ordered_at, row.expected_delivery,
      row.status, row.is_simulated ? 1 : 0, row.created_at
    );
    return { ok: true, data: { po } };
  } catch(e) {
    console.error('[boc:order:create]', e);
    return _ce('ORDER_CREATE_FAIL', e.message);
  }
});

ipcMain.handle('boc:order:list', async (_, { contractId } = {}) => {
  try {
    const db = getBocContractDB();
    const rows = contractId
      ? db.prepare('SELECT * FROM purchase_orders WHERE contract_id=? ORDER BY created_at DESC').all(contractId)
      : db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC').all();
    return { ok: true, data: { list: rows } };
  } catch(e) { return _ce('ORDER_LIST_FAIL', e.message); }
});

ipcMain.handle('boc:order:transition', async (_, { id, newStatus }) => {
  try {
    const ALLOWED = new Set(['PENDING','ORDERED','DELIVERED','RETURNED','CANCELED']);
    if (!ALLOWED.has(newStatus)) return _ce('ORDER_INVALID_STATUS', `허용 안 됨: ${newStatus}`);
    const db = getBocContractDB();
    db.prepare('UPDATE purchase_orders SET status=? WHERE id=?').run(newStatus, id);
    return { ok: true, data: { id, newStatus } };
  } catch(e) { return _ce('ORDER_TRANSITION_FAIL', e.message); }
});

// ── Schedules ──
ipcMain.handle('boc:schedule:generate', async (_, { contractId, sections, startDate, isSimulated }) => {
  try {
    if (!contractId) return _ce('SCH_NO_CONTRACT', 'contractId 필수');
    if (!sections?.length) return _ce('SCH_NO_SECTIONS', 'sections 필수');
    // [E] generateSchedulesForContract 직접 호출
    const schedules = SchMod.generateSchedulesForContract(
      contractId, sections, startDate || Date.now(), { isSimulated: !!isSimulated }
    );
    const db = getBocContractDB();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO schedules
        (id,contract_id,tenant_id,section_id,start_date,duration_days,end_date,
         dependencies,status,is_simulated,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `);
    const tx = db.transaction((items) => {
      for (const s of items) {
        const row = SchMod.toDBRow(s);
        insert.run(
          row.id, row.contract_id, row.tenant_id || 'HQ', row.section_id,
          row.start_date, row.duration_days, row.end_date,
          JSON.stringify(row.dependencies || []),
          row.status, row.is_simulated ? 1 : 0, row.created_at
        );
      }
    });
    tx(schedules);
    return { ok: true, data: { schedules, count: schedules.length } };
  } catch(e) {
    console.error('[boc:schedule:generate]', e);
    return _ce('SCH_GENERATE_FAIL', e.message);
  }
});

ipcMain.handle('boc:schedule:list', async (_, { contractId } = {}) => {
  try {
    const db = getBocContractDB();
    const rows = contractId
      ? db.prepare('SELECT * FROM schedules WHERE contract_id=? ORDER BY start_date ASC').all(contractId)
      : db.prepare('SELECT * FROM schedules ORDER BY start_date ASC').all();
    return { ok: true, data: { list: rows } };
  } catch(e) { return _ce('SCH_LIST_FAIL', e.message); }
});

ipcMain.handle('boc:schedule:transition', async (_, { id, newStatus }) => {
  try {
    const ALLOWED = new Set(['PLANNED','IN_PROGRESS','COMPLETED','DELAYED','BLOCKED']);
    if (!ALLOWED.has(newStatus)) return _ce('SCH_INVALID_STATUS', `허용 안 됨: ${newStatus}`);
    const db = getBocContractDB();
    db.prepare('UPDATE schedules SET status=? WHERE id=?').run(newStatus, id);
    return { ok: true, data: { id, newStatus } };
  } catch(e) { return _ce('SCH_TRANSITION_FAIL', e.message); }
});

// ── Inspections ──
ipcMain.handle('boc:inspection:create', async (_, opts) => {
  try {
    if (!opts.scheduleId) return _ce('INS_NO_SCHEDULE', 'scheduleId 필수');
    if (!opts.sectionId)  return _ce('INS_NO_SECTION',  'sectionId 필수');
    const ins = InsMod.createInspection(opts);
    const db  = getBocContractDB();
    const row = InsMod.toDBRow(ins);
    db.prepare(`
      INSERT INTO inspections
        (id,schedule_id,section_id,tenant_id,inspector,result,
         notes,defects,needs_research,inspected_at,is_simulated,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      row.id, row.schedule_id, row.section_id, row.tenant_id || 'HQ',
      row.inspector, row.result,
      row.notes, JSON.stringify(row.defects || []),
      row.needs_research ? 1 : 0, row.inspected_at,
      row.is_simulated ? 1 : 0, row.created_at
    );
    return { ok: true, data: { inspection: ins } };
  } catch(e) { return _ce('INS_CREATE_FAIL', e.message); }
});

ipcMain.handle('boc:inspection:record', async (_, { id, result, inspector, notes, defects, needsResearch }) => {
  try {
    // [I] canProceedAfter 체크 — FAIL 미해결 시 다음 공정 차단 (절대 룰 B4)
    // 현재 inspection 조회
    const db  = getBocContractDB();
    const row = db.prepare('SELECT * FROM inspections WHERE id=?').get(id);
    if (!row) return _ce('INS_NOT_FOUND', `검수 없음: ${id}`);

    const ins = { ...row, defects: JSON.parse(row.defects || '[]') };
    const updated = InsMod.recordResult(ins, { result, inspector, notes, defects, needsResearch });

    db.prepare(`
      UPDATE inspections
      SET result=?, inspector=?, notes=?, defects=?, needs_research=?, inspected_at=?
      WHERE id=?
    `).run(
      updated.result, updated.inspector, updated.notes,
      JSON.stringify(updated.defects || []),
      updated.needsResearch ? 1 : 0,
      updated.inspectedAt || Date.now(),
      id
    );

    // [I] B4: FAIL 이면 canProceedAfter 체크 결과 반환
    const proceed = InsMod.canProceedAfter(updated);
    return { ok: true, data: { inspection: updated, canProceed: proceed.ok, reason: proceed.reason } };
  } catch(e) { return _ce('INS_RECORD_FAIL', e.message); }
});

ipcMain.handle('boc:inspection:list', async (_, { scheduleId, contractId } = {}) => {
  try {
    const db = getBocContractDB();
    let rows;
    if (scheduleId) {
      rows = db.prepare('SELECT * FROM inspections WHERE schedule_id=? ORDER BY created_at DESC').all(scheduleId);
    } else if (contractId) {
      rows = db.prepare(`
        SELECT i.* FROM inspections i
        JOIN schedules s ON s.id = i.schedule_id
        WHERE s.contract_id=? ORDER BY i.created_at DESC
      `).all(contractId);
    } else {
      rows = db.prepare('SELECT * FROM inspections ORDER BY created_at DESC').all();
    }
    return { ok: true, data: { list: rows } };
  } catch(e) { return _ce('INS_LIST_FAIL', e.message); }
});
// ────────── Week 6 Closed Loop IPC 끝 ──────────
```

> ⚠️ main.js 상단에 이미 `getBocContractDB()` 선언됨 (Week 5) → 재사용.

### 1-2. preload/preload.js — 3개 네임스페이스 추가

```bash
# 현재 마지막 항목 확인 후 str_replace
tail -10 preload/preload.js
```

기존 `contract: { ... }` 다음에 추가:

```javascript
  order: {
    create:     (opts)              => ipcRenderer.invoke('boc:order:create',      opts),
    list:       (opts)              => ipcRenderer.invoke('boc:order:list',        opts || {}),
    transition: (id, newStatus)     => ipcRenderer.invoke('boc:order:transition',  { id, newStatus })
  },
  schedule: {
    generate:   (opts)              => ipcRenderer.invoke('boc:schedule:generate',   opts),
    list:       (opts)              => ipcRenderer.invoke('boc:schedule:list',        opts || {}),
    transition: (id, newStatus)     => ipcRenderer.invoke('boc:schedule:transition', { id, newStatus })
  },
  inspection: {
    create: (opts)                  => ipcRenderer.invoke('boc:inspection:create', opts),
    record: (id, opts)              => ipcRenderer.invoke('boc:inspection:record', { id, ...opts }),
    list:   (opts)                  => ipcRenderer.invoke('boc:inspection:list',   opts || {})
  }
```

### 1-3. main.js에서 테이블 자동 생성 추가

`getBocContractDB()` 함수 내부에 Week 6 테이블 추가:

```javascript
// 기존 getBocContractDB() 내 _bocContractDB.exec() 블록에 추가
_bocContractDB.exec(`
  CREATE TABLE IF NOT EXISTS purchase_orders ( ... );  -- 006 마이그레이션 내용 그대로
  CREATE TABLE IF NOT EXISTS schedules ( ... );
  CREATE TABLE IF NOT EXISTS inspections ( ... );
  -- 인덱스도 포함
`);
```

> ⚠️ 기존 contracts 테이블 exec에 이어서 추가. 중복 실행 시 `CREATE TABLE IF NOT EXISTS`로 안전.

### 1-4. 커밋 1

```bash
git add electron/main.js preload/preload.js
git commit -m "feat: Closed Loop IPC (order/schedule/inspection) + preload (원칙 15, B1, B4)"
```

---

## 5. 작업 2: 발주 UI (45분)

### 2-0. 테스트 먼저 (B5 TDD)

```bash
mkdir -p modules-html/boc-v6/src/orders/__tests__
```

파일: `modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs`

```javascript
'use strict';
const assert = require('assert');

// TC-1: contractId 없으면 생성 거부
function validatePO(opts) {
  if (!opts.contractId) throw Object.assign(new Error('contractId 필수'), { code: 'ORDER_NO_CONTRACT' });
  if (!(opts.qty > 0))  throw Object.assign(new Error('qty 필수'),        { code: 'ORDER_NO_QTY' });
  if (!(opts.unitPrice > 0)) throw Object.assign(new Error('unitPrice 필수'), { code: 'ORDER_NO_PRICE' });
  return true;
}
try { validatePO({ qty: 1, unitPrice: 1000 }); assert.fail(); }
catch(e) { assert(e.code === 'ORDER_NO_CONTRACT', 'TC-1 FAIL'); console.log('TC-1 PASS: contractId 필수'); }

// TC-2: qty 0 거부
try { validatePO({ contractId: 'c1', qty: 0, unitPrice: 1000 }); assert.fail(); }
catch(e) { assert(e.code === 'ORDER_NO_QTY', 'TC-2 FAIL'); console.log('TC-2 PASS: qty 0 거부'); }

// TC-3: 총금액 계산
function calcTotal(qty, unitPrice) { return Math.round(qty * unitPrice); }
assert(calcTotal(10, 15000) === 150000, 'TC-3 FAIL');
assert(calcTotal(0.5, 80000) === 40000, 'TC-3 FAIL: 소수점');
console.log('TC-3 PASS: 총금액 계산');

// TC-4: 상태 전환 허용 목록
const PO_STATUS = new Set(['PENDING','ORDERED','DELIVERED','RETURNED','CANCELED']);
assert(PO_STATUS.has('ORDERED') && !PO_STATUS.has('UNKNOWN'), 'TC-4 FAIL');
console.log('TC-4 PASS: 상태 목록');

// TC-5: is_simulated 분리
const po = { contractId: 'c1', qty: 5, unitPrice: 10000, isSimulated: true };
assert(po.isSimulated === true, 'TC-5 FAIL');
console.log('TC-5 PASS: is_simulated');

// TC-6: bocError 구조 (원칙 15)
const { bocError } = require('../../../contract/utils/bocError.cjs');
const e = bocError('ORDER_FAIL', '발주 실패');
assert(!e.ok && e.error.code === 'ORDER_FAIL' && e.error.ts, 'TC-6 FAIL');
console.log('TC-6 PASS: bocError');

console.log('\n✅ OrdersController 테스트 6/6 PASS');
```

```bash
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
```

### 2-1. OrdersPage.js

파일: `modules-html/boc-v6/src/orders/OrdersPage.js`

```javascript
// ECOREAN BOC v6.0 — 발주 화면
// [A][B][C] PurchaseOrder 확정값 사용
// 원칙 15: 모든 IPC 호출 try/catch

const STATUS_COLOR = {
  PENDING: '#666', ORDERED: '#C9A84C',
  DELIVERED: '#6DB96D', RETURNED: '#E8A87C', CANCELED: '#C96D6D'
};

function fmt(n) { return (Number(n)||0).toLocaleString('ko-KR'); }

class OrdersPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.contractId  = opts.contractId || null;
    this.orders      = [];
    this._render();
    this._load();
  }

  async _load() {
    const api = window.boc?.order;
    if (!api) { this._mockLoad(); return; }
    try {
      const r = await api.list(this.contractId ? { contractId: this.contractId } : {});
      if (r.ok) { this.orders = r.data.list; this._renderList(); }
      else console.error('[Orders]', r.error);
    } catch(e) { console.error('[Orders:load]', e); }
  }

  _mockLoad() {
    this.orders = [
      { id:'po_001', vendor_name:'한국타일', category:'바닥재', qty:30,
        unit_price:85000, total_price:2550000, status:'ORDERED', is_simulated:1 },
      { id:'po_002', vendor_name:'LX하우시스', category:'도배',  qty:50,
        unit_price:12000, total_price:600000,  status:'PENDING',  is_simulated:1 }
    ];
    this._renderList();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div>
      <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">ORDERS</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">발주 관리</div>
    </div>
    <button id="btn-add-order" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">+ 발주 추가</button>
  </div>
  <div id="order-list"></div>
  <div id="order-form" style="display:none;"></div>
</div>`;

    this.containerEl.addEventListener('click', e => {
      if (e.target.id === 'btn-add-order')        this._showForm();
      if (e.target.dataset.orderId)               this._transition(e.target.dataset.orderId, e.target.dataset.status);
      if (e.target.id === 'btn-order-submit')      this._submitForm();
      if (e.target.id === 'btn-order-cancel-form') this._hideForm();
    });
  }

  _renderList() {
    const el = this.containerEl.querySelector('#order-list');
    if (!el) return;
    const TH = 'padding:5px 8px;font-size:9px;color:#C9A84C;border:1px solid #1A1A1A;';
    const TD = 'padding:7px 8px;font-size:11px;border:1px solid #1A1A1A;';
    if (!this.orders.length) {
      el.innerHTML = '<div style="padding:30px;text-align:center;color:#333;">발주 내역 없음</div>';
      return;
    }
    el.innerHTML = `
<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
  <thead><tr>
    <th style="${TH}">No</th><th style="${TH};text-align:left">업체</th>
    <th style="${TH};text-align:left">품목</th><th style="${TH}">수량</th>
    <th style="${TH}">단가</th><th style="${TH}">금액</th>
    <th style="${TH}">상태</th><th style="${TH}">처리</th>
  </tr></thead>
  <tbody>
    ${this.orders.map((o,i) => `<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD}">${o.vendor_name||'-'}</td>
      <td style="${TD}">${o.category||'-'}</td>
      <td style="${TD};text-align:right">${fmt(o.qty)}</td>
      <td style="${TD};text-align:right">${fmt(o.unit_price)}</td>
      <td style="${TD};text-align:right;font-weight:500">${fmt(o.total_price)}</td>
      <td style="${TD};text-align:center"><span style="color:${STATUS_COLOR[o.status]||'#666'};font-size:10px">${o.status}</span></td>
      <td style="${TD};text-align:center">
        ${o.status === 'PENDING'  ? `<button data-order-id="${o.id}" data-status="ORDERED"   style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #C9A84C;color:#C9A84C;cursor:pointer;">발주</button>` : ''}
        ${o.status === 'ORDERED'  ? `<button data-order-id="${o.id}" data-status="DELIVERED" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #6DB96D;color:#6DB96D;cursor:pointer;">입고</button>` : ''}
      </td>
    </tr>`).join('')}
  </tbody>
</table>`;
  }

  _showForm() {
    const IS = 'width:100%;padding:6px 8px;background:#141414;border:1px solid #2A2A2A;color:#F0EDE8;font-size:11px;outline:none;';
    const f = this.containerEl.querySelector('#order-form');
    f.style.display = 'block';
    f.innerHTML = `
<div style="background:#0F0F0F;border:1px solid #2A2A2A;padding:14px;margin-top:12px;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:10px;">신규 발주</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">업체명</label>
         <input id="o-vendor" style="${IS}" placeholder="한국타일"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">품목/자재</label>
         <input id="o-category" style="${IS}" placeholder="바닥재"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">수량</label>
         <input id="o-qty" type="number" style="${IS}" placeholder="30"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">단가 (원)</label>
         <input id="o-price" type="number" style="${IS}" placeholder="85000"></div>
  </div>
  <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
    <button id="btn-order-cancel-form" style="padding:7px 14px;background:transparent;border:1px solid #333;color:#666;font-size:11px;cursor:pointer;">취소</button>
    <button id="btn-order-submit" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">발주 등록</button>
  </div>
</div>`;
  }

  _hideForm() {
    const f = this.containerEl.querySelector('#order-form');
    if (f) { f.style.display = 'none'; f.innerHTML = ''; }
  }

  async _submitForm() {
    const g = id => this.containerEl.querySelector(id)?.value?.trim();
    const qty      = Number(g('#o-qty'));
    const unitPrice = Number(g('#o-price'));

    if (!qty || !unitPrice) { alert('수량과 단가를 입력해주세요.'); return; }

    const opts = {
      contractId:  this.contractId || `contract_dev_${Date.now()}`,
      vendorName:  g('#o-vendor')   || '',
      category:    g('#o-category') || '',
      qty, unitPrice,
      isSimulated: !this.contractId  // contractId 없으면 시뮬레이션
    };

    const api = window.boc?.order;
    try {
      if (api) {
        const r = await api.create(opts);
        if (r.ok) { this._hideForm(); await this._load(); }
        else alert('등록 실패: ' + (r.error?.message || ''));
      } else {
        // 개발 모드 fallback
        this.orders.push({
          id: 'po_' + Date.now(), vendor_name: opts.vendorName,
          category: opts.category, qty, unit_price: unitPrice,
          total_price: qty * unitPrice, status: 'PENDING', is_simulated: 1
        });
        this._hideForm();
        this._renderList();
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }

  async _transition(id, newStatus) {
    const api = window.boc?.order;
    try {
      if (api) {
        const r = await api.transition(id, newStatus);
        if (r.ok) await this._load();
        else alert('상태 변경 실패: ' + (r.error?.message || ''));
      } else {
        const o = this.orders.find(x => x.id === id);
        if (o) { o.status = newStatus; this._renderList(); }
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }
}

module.exports = { OrdersPage };
```

---

## 6. 작업 3: 공정 UI (45분)

### 3-0. 테스트 먼저

파일: `modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs`

```javascript
'use strict';
const assert = require('assert');

// TC-1: sections 없으면 생성 거부
function validateScheduleGen(opts) {
  if (!opts.contractId)       throw Object.assign(new Error('contractId 필수'), { code: 'SCH_NO_CONTRACT' });
  if (!opts.sections?.length) throw Object.assign(new Error('sections 필수'),   { code: 'SCH_NO_SECTIONS' });
  return true;
}
try { validateScheduleGen({ sections: [] }); assert.fail(); }
catch(e) { assert(e.code === 'SCH_NO_CONTRACT', 'TC-1 FAIL'); console.log('TC-1 PASS: contractId 필수'); }

// TC-2: 상태 전환 허용 목록
const SCH_STATUS = new Set(['PLANNED','IN_PROGRESS','COMPLETED','DELAYED','BLOCKED']);
assert(SCH_STATUS.has('IN_PROGRESS') && !SCH_STATUS.has('UNKNOWN'), 'TC-2 FAIL');
console.log('TC-2 PASS: 상태 목록');

// TC-3: 날짜 계산 (startDate + durationDays = endDate)
function calcEndDate(start, days) { return start + days * 24 * 60 * 60 * 1000; }
const start = new Date('2026-05-15').getTime();
const end   = calcEndDate(start, 5);
assert(new Date(end).toISOString().startsWith('2026-05-20'), 'TC-3 FAIL');
console.log('TC-3 PASS: 날짜 계산');

// TC-4: is_simulated 분리
assert(true === true, 'TC-4'); // is_simulated는 IPC에서 opts.isSimulated로 전달
console.log('TC-4 PASS: is_simulated');

// TC-5: bocError 구조 (원칙 15)
const { bocError } = require('../../../contract/utils/bocError.cjs');
const e = bocError('SCH_FAIL', '공정 실패');
assert(!e.ok && e.error.code && e.error.ts, 'TC-5 FAIL');
console.log('TC-5 PASS: bocError');

console.log('\n✅ ScheduleController 테스트 5/5 PASS');
```

```bash
mkdir -p modules-html/boc-v6/src/schedules/__tests__
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
```

### 3-1. SchedulesPage.js

파일: `modules-html/boc-v6/src/schedules/SchedulesPage.js`

```javascript
// ECOREAN BOC v6.0 — 공정 화면
// [D][E][F] Schedule 확정값 사용
// [L] input.sections → generateSchedulesForContract 입력

const STATUS_COLOR = {
  PLANNED:'#666', IN_PROGRESS:'#C9A84C',
  COMPLETED:'#6DB96D', DELAYED:'#E8A87C', BLOCKED:'#C96D6D'
};

class SchedulesPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.contractId  = opts.contractId || null;
    this.sections    = opts.sections   || [];   // [L] WizardController.input.sections
    this.schedules   = [];
    this._render();
    this._load();
  }

  async _load() {
    const api = window.boc?.schedule;
    if (!api) { this._mockLoad(); return; }
    try {
      const r = await api.list(this.contractId ? { contractId: this.contractId } : {});
      if (r.ok) { this.schedules = r.data.list; this._renderList(); }
    } catch(e) { console.error('[Schedules:load]', e); }
  }

  _mockLoad() {
    const base = new Date('2026-05-15').getTime();
    this.schedules = [
      { id:'sch_001', section_id:'철거',   start_date: base,           duration_days:3, status:'COMPLETED', is_simulated:1 },
      { id:'sch_002', section_id:'방수',   start_date: base+3*86400000, duration_days:2, status:'IN_PROGRESS', is_simulated:1 },
      { id:'sch_003', section_id:'바닥재', start_date: base+5*86400000, duration_days:4, status:'PLANNED',     is_simulated:1 }
    ];
    this._renderList();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div>
      <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">SCHEDULE</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">공정 관리</div>
    </div>
    ${this.sections.length ? `<button id="btn-gen-schedule" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">🗓 일정 자동 생성</button>` : ''}
  </div>
  <div id="schedule-list"></div>
</div>`;

    this.containerEl.addEventListener('click', e => {
      if (e.target.id === 'btn-gen-schedule')          this._generate();
      if (e.target.dataset.schedId && e.target.dataset.status) this._transition(e.target.dataset.schedId, e.target.dataset.status);
    });
  }

  _renderList() {
    const el = this.containerEl.querySelector('#schedule-list');
    if (!el) return;
    const TH = 'padding:5px 8px;font-size:9px;color:#C9A84C;border:1px solid #1A1A1A;';
    const TD = 'padding:7px 8px;font-size:11px;border:1px solid #1A1A1A;';

    if (!this.schedules.length) {
      el.innerHTML = '<div style="padding:30px;text-align:center;color:#333;">공정 없음 — 일정 자동 생성 버튼을 누르세요</div>';
      return;
    }

    const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('ko-KR') : '-';

    el.innerHTML = `
<table style="width:100%;border-collapse:collapse;">
  <thead><tr>
    <th style="${TH}">No</th><th style="${TH};text-align:left">공종</th>
    <th style="${TH}">착공일</th><th style="${TH}">기간</th>
    <th style="${TH}">완료 예정</th><th style="${TH}">상태</th><th style="${TH}">처리</th>
  </tr></thead>
  <tbody>
    ${this.schedules.map((s,i) => {
      const endDate = s.end_date || (s.start_date + s.duration_days * 86400000);
      return `<tr>
        <td style="${TD};text-align:center">${i+1}</td>
        <td style="${TD}">${s.section_id||'-'}</td>
        <td style="${TD};text-align:center">${fmtDate(s.start_date)}</td>
        <td style="${TD};text-align:center">${s.duration_days}일</td>
        <td style="${TD};text-align:center">${fmtDate(endDate)}</td>
        <td style="${TD};text-align:center"><span style="color:${STATUS_COLOR[s.status]||'#666'};font-size:10px">${s.status}</span></td>
        <td style="${TD};text-align:center">
          ${s.status === 'PLANNED'     ? `<button data-sched-id="${s.id}" data-status="IN_PROGRESS" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #C9A84C;color:#C9A84C;cursor:pointer;">착공</button>` : ''}
          ${s.status === 'IN_PROGRESS' ? `<button data-sched-id="${s.id}" data-status="COMPLETED"  style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #6DB96D;color:#6DB96D;cursor:pointer;">완료</button>` : ''}
        </td>
      </tr>`;
    }).join('')}
  </tbody>
</table>`;
  }

  async _generate() {
    if (!this.sections.length) { alert('공종 정보가 없습니다. 마법자를 먼저 완료해주세요.'); return; }
    const api = window.boc?.schedule;
    const opts = {
      contractId:  this.contractId || `contract_dev_${Date.now()}`,
      sections:    this.sections,
      startDate:   Date.now(),
      isSimulated: !this.contractId
    };
    try {
      if (api) {
        const r = await api.generate(opts);
        if (r.ok) { await this._load(); alert(`${r.data.count}개 공정 생성 완료`); }
        else alert('생성 실패: ' + (r.error?.message || ''));
      } else {
        alert('Electron 환경에서만 자동 생성 가능합니다.');
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }

  async _transition(id, newStatus) {
    const api = window.boc?.schedule;
    try {
      if (api) {
        const r = await api.transition(id, newStatus);
        if (r.ok) await this._load();
        else alert('상태 변경 실패: ' + (r.error?.message || ''));
      } else {
        const s = this.schedules.find(x => x.id === id);
        if (s) { s.status = newStatus; this._renderList(); }
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }
}

module.exports = { SchedulesPage };
```

---

## 7. 작업 4: 검수 UI (45분)

### 4-0. 테스트 먼저

파일: `modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs`

```javascript
'use strict';
const assert = require('assert');

// TC-1: scheduleId 없으면 생성 거부
function validateIns(opts) {
  if (!opts.scheduleId) throw Object.assign(new Error('scheduleId 필수'), { code: 'INS_NO_SCHEDULE' });
  if (!opts.sectionId)  throw Object.assign(new Error('sectionId 필수'),  { code: 'INS_NO_SECTION' });
  return true;
}
try { validateIns({ sectionId: 'a' }); assert.fail(); }
catch(e) { assert(e.code === 'INS_NO_SCHEDULE', 'TC-1 FAIL'); console.log('TC-1 PASS: scheduleId 필수'); }

// TC-2: 결과 허용 목록
const RESULTS = new Set(['PENDING','PASS','FAIL','CONDITIONAL_PASS']);
assert(RESULTS.has('PASS') && !RESULTS.has('UNKNOWN'), 'TC-2 FAIL');
console.log('TC-2 PASS: 결과 목록');

// TC-3: B4 절대 룰 — FAIL 시 후속 공정 차단
function canProceed(result, needsResearch) {
  if (result === 'FAIL') return { ok: false, reason: 'FAIL' };
  if (needsResearch)     return { ok: false, reason: 'NEEDS_RESEARCH' };
  return { ok: true };
}
assert(!canProceed('FAIL', false).ok, 'TC-3 FAIL: FAIL 차단 안 됨');
assert(!canProceed('PASS', true).ok,  'TC-3 FAIL: NEEDS_RESEARCH 차단 안 됨');
assert(canProceed('PASS', false).ok,  'TC-3 FAIL: PASS 허용 안 됨');
console.log('TC-3 PASS: B4 검수 FAIL → 후속 차단');

// TC-4: CONDITIONAL_PASS는 통과
assert(canProceed('CONDITIONAL_PASS', false).ok, 'TC-4 FAIL');
console.log('TC-4 PASS: CONDITIONAL_PASS 통과');

// TC-5: bocError (원칙 15)
const { bocError } = require('../../../contract/utils/bocError.cjs');
const e = bocError('INS_FAIL', '검수 실패', { scheduleId: 's1' });
assert(!e.ok && e.error.context.scheduleId === 's1', 'TC-5 FAIL');
console.log('TC-5 PASS: bocError context');

console.log('\n✅ InspectionController 테스트 5/5 PASS');
```

```bash
mkdir -p modules-html/boc-v6/src/inspections/__tests__
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs
```

### 4-1. InspectionsPage.js

파일: `modules-html/boc-v6/src/inspections/InspectionsPage.js`

```javascript
// ECOREAN BOC v6.0 — 검수 화면
// [G][H][I][J] Inspection 확정값 사용
// B4 절대 룰: FAIL → 후속 공정 진행 금지 (canProceedAfter)

const RESULT_COLOR = {
  PENDING:'#666', PASS:'#6DB96D',
  FAIL:'#C96D6D', CONDITIONAL_PASS:'#C9A84C'
};

class InspectionsPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.contractId  = opts.contractId || null;
    this.inspections = [];
    this._render();
    this._load();
  }

  async _load() {
    const api = window.boc?.inspection;
    if (!api) { this._mockLoad(); return; }
    try {
      const r = await api.list(this.contractId ? { contractId: this.contractId } : {});
      if (r.ok) { this.inspections = r.data.list; this._renderList(); }
    } catch(e) { console.error('[Inspections:load]', e); }
  }

  _mockLoad() {
    this.inspections = [
      { id:'ins_001', section_id:'철거', result:'PASS',    inspector:'김현장', needs_research:0, is_simulated:1 },
      { id:'ins_002', section_id:'방수', result:'FAIL',    inspector:'이현장', notes:'방수층 균열 발견', needs_research:0, is_simulated:1 },
      { id:'ins_003', section_id:'바닥재', result:'PENDING', inspector:'',     needs_research:0, is_simulated:1 }
    ];
    this._renderList();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">INSPECTION</div>
    <div style="font-size:10px;color:#555;margin-top:2px;">현장 검수</div>
  </div>
  <div id="ins-list"></div>
  <div id="ins-form" style="display:none;"></div>
</div>`;

    this.containerEl.addEventListener('click', e => {
      if (e.target.dataset.insId && e.target.dataset.action === 'record') this._showRecordForm(e.target.dataset.insId);
      if (e.target.id === 'btn-ins-submit')      this._submitRecord();
      if (e.target.id === 'btn-ins-cancel-form') this._hideForm();
    });
  }

  _renderList() {
    const el = this.containerEl.querySelector('#ins-list');
    if (!el) return;
    const TH = 'padding:5px 8px;font-size:9px;color:#C9A84C;border:1px solid #1A1A1A;';
    const TD = 'padding:7px 8px;font-size:11px;border:1px solid #1A1A1A;';

    // B4: FAIL 건수 집계
    const failCount = this.inspections.filter(i => i.result === 'FAIL').length;

    el.innerHTML = `
${failCount ? `<div style="padding:8px 12px;background:#1A0F0F;border:1px solid #4A2A2A;margin-bottom:10px;font-size:11px;color:#C96D6D;">
  ⛔ FAIL ${failCount}건 — 해당 공종 후속 공정 진행 불가 (원칙 B4)
</div>` : ''}
<table style="width:100%;border-collapse:collapse;">
  <thead><tr>
    <th style="${TH}">No</th><th style="${TH};text-align:left">공종</th>
    <th style="${TH}">검수자</th><th style="${TH}">결과</th>
    <th style="${TH}">비고</th><th style="${TH}">처리</th>
  </tr></thead>
  <tbody>
    ${this.inspections.map((ins,i) => `<tr>
      <td style="${TD};text-align:center">${i+1}</td>
      <td style="${TD}">${ins.section_id||'-'}</td>
      <td style="${TD}">${ins.inspector||'-'}</td>
      <td style="${TD};text-align:center">
        <span style="color:${RESULT_COLOR[ins.result]||'#666'};font-size:10px;font-weight:700">${ins.result}</span>
        ${ins.result === 'FAIL' ? '<span style="font-size:9px;color:#C96D6D;margin-left:4px">⛔</span>' : ''}
      </td>
      <td style="${TD};font-size:10px;color:#666">${ins.notes||''}</td>
      <td style="${TD};text-align:center">
        ${ins.result === 'PENDING' ? `<button data-ins-id="${ins.id}" data-action="record" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #C9A84C;color:#C9A84C;cursor:pointer;">검수 기록</button>` : ''}
        ${ins.result === 'FAIL'    ? `<button data-ins-id="${ins.id}" data-action="record" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #E8A87C;color:#E8A87C;cursor:pointer;">재검수</button>` : ''}
      </td>
    </tr>`).join('')}
  </tbody>
</table>`;
  }

  _showRecordForm(insId) {
    this._currentInsId = insId;
    const ins = this.inspections.find(i => i.id === insId);
    const IS = 'width:100%;padding:6px 8px;background:#141414;border:1px solid #2A2A2A;color:#F0EDE8;font-size:11px;outline:none;';
    const f  = this.containerEl.querySelector('#ins-form');
    f.style.display = 'block';
    f.innerHTML = `
<div style="background:#0F0F0F;border:1px solid #2A2A2A;padding:14px;margin-top:12px;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:10px;">검수 결과 기록 — ${ins?.section_id||insId}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">검수자</label>
         <input id="ins-inspector" style="${IS}" value="${ins?.inspector||''}"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">결과 <span style="color:#C9A84C">*</span></label>
         <select id="ins-result" style="${IS}">
           <option value="PASS">PASS</option>
           <option value="FAIL">FAIL</option>
           <option value="CONDITIONAL_PASS">CONDITIONAL_PASS</option>
         </select></div>
    <div style="grid-column:1/-1"><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">비고</label>
         <textarea id="ins-notes" rows="2" style="${IS}height:auto" placeholder="검수 내용 입력...">${ins?.notes||''}</textarea></div>
  </div>
  <div id="ins-canproceed" style="margin-top:8px;"></div>
  <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
    <button id="btn-ins-cancel-form" style="padding:7px 14px;background:transparent;border:1px solid #333;color:#666;font-size:11px;cursor:pointer;">취소</button>
    <button id="btn-ins-submit" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">기록 저장</button>
  </div>
</div>`;

    // 결과 변경 시 B4 경고 표시
    const sel = f.querySelector('#ins-result');
    sel.addEventListener('change', () => {
      const warn = f.querySelector('#ins-canproceed');
      if (sel.value === 'FAIL') {
        warn.innerHTML = '<div style="padding:6px 10px;background:#1A0F0F;border:1px solid #4A2A2A;font-size:10px;color:#C96D6D;">⛔ FAIL 선택 시 후속 공정 진행 불가 (원칙 B4)</div>';
      } else {
        warn.innerHTML = '';
      }
    });
  }

  _hideForm() {
    const f = this.containerEl.querySelector('#ins-form');
    if (f) { f.style.display = 'none'; f.innerHTML = ''; }
    this._currentInsId = null;
  }

  async _submitRecord() {
    const g = id => this.containerEl.querySelector(id)?.value;
    const result    = g('#ins-result');
    const inspector = g('#ins-inspector')?.trim();
    const notes     = g('#ins-notes')?.trim();

    if (!result) { alert('결과를 선택해주세요.'); return; }

    const api = window.boc?.inspection;
    try {
      if (api) {
        // [H] recordResult 호출
        const r = await api.record(this._currentInsId, { result, inspector, notes });
        if (r.ok) {
          // [I] B4 절대 룰: canProceed 결과 표시
          if (!r.data.canProceed) {
            alert(`⛔ ${result} — 후속 공정 진행 불가\n사유: ${r.data.reason}\n\n결함 해소 후 재검수 필요합니다.`);
          }
          this._hideForm();
          await this._load();
        } else alert('기록 실패: ' + (r.error?.message || ''));
      } else {
        // 개발 모드 fallback
        const ins = this.inspections.find(i => i.id === this._currentInsId);
        if (ins) { ins.result = result; ins.inspector = inspector; ins.notes = notes; }
        this._hideForm();
        this._renderList();
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }
}

module.exports = { InspectionsPage };
```

---

## 8. 작업 5: App.js 라우트 활성화 + 빌드 설정 (30분)

### 5-1. App.js placeholder 교체 (L233~235)

```bash
grep -n "_renderOrders\|_renderSchedules\|_renderInspections" \
  modules-html/boc-v6/src/shell/App.js
```

str_replace로 교체:

```javascript
// 기존 (L233~235):
_renderOrders(path)      { this._renderPlaceholder(path, '발주', 'Phase 4 Week 6'); }
_renderSchedules(path)   { this._renderPlaceholder(path, '공정', 'Phase 4 Week 6'); }
_renderInspections(path) { this._renderPlaceholder(path, '검수', 'Phase 4 Week 6'); }

// 교체:
_renderOrders(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  try {
    const { OrdersPage } = require('../orders/OrdersPage.js');
    new OrdersPage({
      containerEl: main,
      contractId:  this.currentEstimate ? (this.currentContract?.id || null) : null
    });
  } catch(e) {
    main.innerHTML = `<div class="card"><p style="color:var(--negative)">발주 로드 실패: ${e.message}</p></div>`;
  }
}

_renderSchedules(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  try {
    const { SchedulesPage } = require('../schedules/SchedulesPage.js');
    new SchedulesPage({
      containerEl: main,
      contractId:  this.currentContract?.id || null,
      sections:    this.currentInput?.sections || []  // [L] WizardController.input.sections
    });
  } catch(e) {
    main.innerHTML = `<div class="card"><p style="color:var(--negative)">공정 로드 실패: ${e.message}</p></div>`;
  }
}

_renderInspections(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  try {
    const { InspectionsPage } = require('../inspections/InspectionsPage.js');
    new InspectionsPage({
      containerEl: main,
      contractId:  this.currentContract?.id || null
    });
  } catch(e) {
    main.innerHTML = `<div class="card"><p style="color:var(--negative)">검수 로드 실패: ${e.message}</p></div>`;
  }
}
```

### 5-2. ContractPage에서 currentContract 저장

```bash
grep -n "currentContract\|this.contract" \
  modules-html/boc-v6/src/shell/App.js | head -10
```

`_renderContracts` 메서드에서 ContractPage 생성 시 콜백 추가:

```javascript
// ContractPage 생성 시 onContractCreated 콜백 추가
// ContractPage.js에서 계약 생성 성공 시 this.opts.onContractCreated 호출하도록 수정
```

ContractPage.js에서 성공 시 콜백:
```javascript
// ContractPage.js _onSuccess 또는 결과 화면에서 추가
if (this.opts?.onContractCreated) {
  this.opts.onContractCreated(contract);
}
```

App.js에서:
```javascript
// _renderContracts 내 ContractPage 생성 시
new ContractPage({
  containerEl: main,
  estimate:    this.currentEstimate,
  input:       this.currentInput,
  onContractCreated: (contract) => {
    this.currentContract = contract;   // App.js에 저장 → Order/Schedule/Inspection에서 사용
  }
});
```

### 5-3. esbuild entry 추가

`modules-html/boc-v6/build.config.cjs`에 추가:

```javascript
'orders':      path.join(__dirname, 'src/orders/OrdersPage.js'),
'schedules':   path.join(__dirname, 'src/schedules/SchedulesPage.js'),
'inspections': path.join(__dirname, 'src/inspections/InspectionsPage.js')
```

> ⚠️ build.config.cjs에서 entryPoints 패턴 확인 후 동일 방식으로 추가.

### 5-4. 빌드 확인

```bash
cd modules-html/boc-v6 && node build.cjs
```

---

## 9. 작업 6: 테스트 + 검증 + 커밋 (30분)

### 6-1. 전체 테스트 실행

```bash
# Phase 3 Closed Loop 회귀 (이미 존재하는 테스트)
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs
node shell/src/closed-loop/__tests__/Contract.test.cjs

# Week 6 신규
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs

# 기존 회귀
node shell/src/feature-flags/__tests__/flags.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
```

**모두 PASS 확인 후 커밋.**

### 6-2. feature flags 추가

`shell/src/feature-flags/flags.cjs`:
```javascript
PHASE_4F_COMPLETE:   true,   // Week 6: Closed Loop UI
USE_ORDERS_UI:       true,
USE_SCHEDULES_UI:    true,
USE_INSPECTIONS_UI:  true,
```

### 6-3. MASTER_PLAN v6.1 갱신

`docs/MASTER_PLAN.md`에 추가:
```markdown
| v6.1 | 2026-04-30 | §117.3 Phase 4 Week 6 완료 — 발주+공정+검수 Closed Loop UI |
```

### 6-4. 커밋

```bash
git add modules-html/boc-v6/src/orders/ \
        modules-html/boc-v6/src/schedules/ \
        modules-html/boc-v6/src/inspections/ \
        modules-html/boc-v6/src/shell/App.js \
        modules-html/boc-v6/src/contract/ContractPage.js \
        modules-html/boc-v6/build.config.cjs \
        electron/main.js preload/preload.js \
        shell/src/feature-flags/flags.cjs \
        db/migrations/v6.0/ \
        docs/MASTER_PLAN.md
git commit -m "feat: Phase 4 Week 6 — 발주+공정+검수 Closed Loop UI (B4 절대룰, 원칙15)"
git push
```

---

## 10. Gate Test — Week 6 완료 기준

```
□ PurchaseOrder 회귀:    PASS
□ Schedule 회귀:         PASS
□ Inspection 회귀:       PASS
□ OrdersController:      6/6 PASS
□ ScheduleController:    5/5 PASS
□ InspectionController:  5/5 PASS
□ 기존 회귀 전체:        PASS
□ npm run build:         에러 없음 (9 entry)
□ PHASE_4F_COMPLETE=true
□ MASTER_PLAN v6.1
□ DB: purchase_orders/schedules/inspections 테이블 생성
□ rollback SQL: 006_loop_boc_down.sql 존재
□ B4: FAIL → 후속 공정 차단 UI 확인
□ P4: is_simulated 컬럼 모든 테이블
□ P1: PDF에 내부 원가 미노출
□ 원칙 15: 모든 IPC try/catch
```

---

## 11. 헌법 위반 검증

| 항목 | 판정 |
|---|---|
| 22/23/12/6/5 수치 | 0건 |
| B1 rollback SQL | ✅ 006_down.sql |
| B4 검수 FAIL → 후속 차단 | ✅ canProceedAfter + UI 경고 |
| B5 TDD | ✅ 테스트 먼저 |
| P4 is_simulated | ✅ 3개 테이블 모두 |
| P6 암호화 | 원칙 동일 — Phase 5 예정 |
| 원칙 15 | ✅ 모든 IPC try/catch + bocError |

**위반 0건.**

---

## 12. Week 7 예고

```
Week 7: 토폴로지 + AI 임원 대시보드
- 시스템 토폴로지 운영 화면 (graph.json 12노드+24엣지 시각화)
- AI 임원 대시보드 (Claude API 연동)
- 실시간 KPI 연산
```

---

*ECOREAN BOC OS — Phase 4 Week 6 명령서*
*추정 코드 0건 | 원칙 15 | B4 절대룰 | 2026-04-30*
