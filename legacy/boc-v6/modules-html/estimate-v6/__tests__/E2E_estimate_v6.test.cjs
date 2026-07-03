// ECOREAN BOC v5.6 — 견적 모듈 v6 통합 E2E
// G1 → G2 → G3 → G4 → CalcEngineV56 → 1단계 견적

const { G1Type } = require('../../../shell/src/gates/G1_Type.cjs');
const { G2Concept } = require('../../../shell/src/gates/G2_Concept.cjs');
const { G3Section } = require('../../../shell/src/gates/G3_Section.cjs');
const { G4CAD } = require('../../../shell/src/gates/G4_CAD.cjs');
const { GateRegistry } = require('../../../shell/src/gates/Gate.cjs');
const { calculateEstimate } = require('../src/calc/CalcEngineV56.cjs');
const { getSpacesForSections } = require('../src/matrices/Sections.cjs');
const { getPreset } = require('../src/matrices/ResidenceMatrix.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

function runFullFlow() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  const g3 = new G3Section();
  const g4 = new G4CAD();
  reg.register(g1); reg.register(g2); reg.register(g3); reg.register(g4);

  // STEP 1: G1
  const r1 = g1.lock({ residence: 'APARTMENT', pyeong: 30 }, reg);
  assert(r1.ok, 'G1');

  // STEP 2: G2
  const r2 = g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  assert(r2.ok, 'G2');

  // STEP 3: G3 — 본 매트릭스로 자동 공간 결정
  const r3 = g3.lock({ sections: ['bathroom','kitchen','living'] }, reg);
  assert(r3.ok, 'G3');
  const autoSpaces = getSpacesForSections(['bathroom','kitchen','living']);
  assert(autoSpaces.includes('BATHROOM'), 'BATHROOM 자동');

  // 평형 프리셋 — 30평
  const preset = getPreset(30);
  assert(preset.sqm === 99, '30평 99㎡');

  // STEP 4: G4 — CAD 면적 입력
  const r4 = g4.lock({
    spaces: [
      { id: 'b1', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'k1', area_sqm: 10, typeKey: 'KITCHEN' },
      { id: 'l1', area_sqm: 20, typeKey: 'LIVING' }
    ]
  }, reg);
  assert(r4.ok, 'G4');

  // 견적 계산
  const estimate = calculateEstimate({
    lineItems: [
      { qty: 5,  wasteRate: 0.05, laborCost: 100000, pm: 1, materialCost: 200000 },
      { qty: 10, wasteRate: 0.05, laborCost: 80000,  pm: 1, materialCost: 150000 },
      { qty: 20, wasteRate: 0.05, laborCost: 60000,  pm: 1, materialCost: 100000 }
    ],
    residence: 'APARTMENT',
    concept: 'CLASSIC_LUXURY',
    occupied: false,
    floorLevel: 5,
    hasElev: true,
    areaSqm: r4.payload.totalAreaSqm   // 35
  });

  assert(estimate.ok === true, '견적 OK');
  assert(estimate.payload.supply > 0, '공급가 > 0');
  assert(estimate.payload.contract > estimate.payload.supply, '도급 > 공급');
  assert(estimate.payload.final > estimate.payload.contract, '최종 > 도급 (VAT)');
  assert(estimate.payload.areaSqm === 35, '면적 35㎡');
  assert(estimate.payload.sqmPrice > 0, '㎡당 단가');
  assert(estimate.payload.pyPrice > 0, '평당 단가');
  assert(estimate.payload.factors.gradeMul === 1.8, '클래식 가산 1.8');

  console.log('  시나리오: 30평 아파트 + 클래식럭셔리 + 욕실/주방/거실 35㎡');
  console.log('  공급가:   ' + estimate.payload.supply.toLocaleString() + '원');
  console.log('  도급:     ' + estimate.payload.contract.toLocaleString() + '원');
  console.log('  최종(VAT):' + estimate.payload.final.toLocaleString() + '원');
  console.log('  ㎡당:     ' + estimate.payload.sqmPrice.toLocaleString() + '원/㎡');
  console.log('  평당:     ' + estimate.payload.pyPrice.toLocaleString() + '원/평');
  console.log('  마진율:   ' + estimate.payload.margin + '%');
}

runFullFlow();
console.log('[PASS] E2E estimate v6 (모두 통과)');
