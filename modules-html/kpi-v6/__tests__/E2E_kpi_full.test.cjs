// ECOREAN BOC v5.6 — KPI 통합 E2E
// G1~G4 → estimate-v6 → KPIBus → KPI 데이터 검증

const { G1Type } = require('../../../shell/src/gates/G1_Type.cjs');
const { G2Concept } = require('../../../shell/src/gates/G2_Concept.cjs');
const { G3Section } = require('../../../shell/src/gates/G3_Section.cjs');
const { G4CAD } = require('../../../shell/src/gates/G4_CAD.cjs');
const { GateRegistry } = require('../../../shell/src/gates/Gate.cjs');
const { calculateEstimate } = require('../../estimate-v6/src/calc/CalcEngineV56.cjs');
const { publishKPIUpdate, publishAutomationUpdate, onKPIUpdate } = require('../src/KPIBus.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

function runFlow() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  const g3 = new G3Section();
  const g4 = new G4CAD();
  reg.register(g1); reg.register(g2); reg.register(g3); reg.register(g4);

  const kpiHistory = [];
  onKPIUpdate(function(data, meta) {
    kpiHistory.push({ data: Object.assign({}, data), meta: meta });
  });

  // STEP 1: G1
  g1.lock({ residence: 'APARTMENT', pyeong: 30 }, reg);
  publishAutomationUpdate(1);

  // STEP 2: G2
  g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  publishAutomationUpdate(2);

  // STEP 3: G3
  g3.lock({ sections: ['bathroom','kitchen','living'] }, reg);
  publishAutomationUpdate(3);

  // STEP 4: G4
  const r4 = g4.lock({
    spaces: [
      { id: 'b1', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'k1', area_sqm: 10, typeKey: 'KITCHEN' },
      { id: 'l1', area_sqm: 20, typeKey: 'LIVING' }
    ]
  }, reg);
  publishAutomationUpdate(4);

  // 견적 계산
  const estimate = calculateEstimate({
    lineItems: [
      { qty: 5,  wasteRate: 0.05, laborCost: 100000, pm: 1, materialCost: 200000 },
      { qty: 10, wasteRate: 0.05, laborCost: 80000,  pm: 1, materialCost: 150000 },
      { qty: 20, wasteRate: 0.05, laborCost: 60000,  pm: 1, materialCost: 100000 }
    ],
    residence: 'APARTMENT',
    concept: 'CLASSIC_LUXURY',
    occupied: false, floorLevel: 5, hasElev: true,
    areaSqm: r4.payload.totalAreaSqm
  });

  // KPI 발행
  const kpiData = publishKPIUpdate(estimate.payload, {
    sectionCount: 3,
    spaceCount: 3,
    duration: 14,
    automation: 95
  });

  // 검증
  assert(kpiHistory.length >= 5, 'KPI 5번 이상 갱신: ' + kpiHistory.length);
  assert(kpiData.supply > 0, 'supply > 0');
  assert(kpiData.final > kpiData.contract, 'final > contract');
  assert(kpiData.sectionCount === 3, 'sectionCount');
  assert(kpiData.automation === 95, 'automation 95');

  const autoUpdates = kpiHistory.filter(function(h) {
    return h.meta && h.meta.partial && h.data.automation !== undefined;
  });
  assert(autoUpdates.length === 4, '자동화 4회 갱신');
  assert(autoUpdates[0].data.automation === 30, 'G1 30%');
  assert(autoUpdates[1].data.automation === 70, 'G2 70%');
  assert(autoUpdates[2].data.automation === 85, 'G3 85%');
  assert(autoUpdates[3].data.automation === 95, 'G4 95%');

  console.log('  자동화율 진행: 30% → 70% → 85% → 95%');
  console.log('  공급가:        ' + kpiData.supply.toLocaleString() + '원');
  console.log('  도급:          ' + kpiData.contract.toLocaleString() + '원');
  console.log('  최종(VAT):     ' + kpiData.final.toLocaleString() + '원');
  console.log('  총 면적:       ' + kpiData.areaSqm + '㎡');
  console.log('  ㎡당:          ' + kpiData.sqmPrice.toLocaleString() + '원/㎡');
}

runFlow();
console.log('[PASS] E2E KPI Full (모두 통과)');
