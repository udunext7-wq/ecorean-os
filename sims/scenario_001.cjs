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

  // STEP 3: 발주 (3건)
  const orders = [
    createPO({ contractId: contract.id, vendorName: 'SIM 자재상사', category: 'tile',         ksCode: 'KS L 1106', qty: 5,   unit: '㎡', unitPrice: 200000, isSimulated: true }),
    createPO({ contractId: contract.id, vendorName: 'SIM 자재상사', category: 'flooring',     ksCode: 'KS F 3111', qty: 30,  unit: '㎡', unitPrice: 150000, isSimulated: true }),
    createPO({ contractId: contract.id, vendorName: 'SIM 자재상사', category: 'wallcovering', ksCode: 'KS M 7305', qty: 100, unit: '㎡', unitPrice: 30000,  isSimulated: true })
  ];
  orders.forEach(function(po) {
    transitionPO(po, 'ORDERED');
    db.prepare(`INSERT INTO purchase_orders (id, contract_id, tenant_id, vendor_name, category, ks_code, qty, unit, unit_price, total_price, ordered_at, expected_delivery, status, is_simulated, created_at) VALUES (@id, @contract_id, @tenant_id, @vendor_name, @category, @ks_code, @qty, @unit, @unit_price, @total_price, @ordered_at, @expected_delivery, @status, @is_simulated, @created_at)`).run(poToDBRow(po));
  });
  console.log('[3] 발주 ' + orders.length + '건 (' + orders.reduce(function(s,p){return s+p.totalPrice;},0).toLocaleString() + '원)');

  // STEP 4: 공정 일정 (3 섹션, 시공 시작일 7일 후)
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
      scheduleId: sch.id, sectionId: sch.sectionId,
      inspector: '시뮬-검수자', isSimulated: true
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
