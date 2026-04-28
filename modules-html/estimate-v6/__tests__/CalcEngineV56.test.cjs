const {
  calcSupplyAmount, calcContractAmount, calcFinalAmount,
  calculateEstimate, VAT_RATE, BASE_CONTRACT_RATIO
} = require('../src/calc/CalcEngineV56.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 단순 공급가
// qty=10, waste=0.1, labor=100, pm=1, material=200
// = 10 × 1.1 × (100×1 + 200) = 10 × 1.1 × 300 = 3300
(function() {
  const supply = calcSupplyAmount([{
    qty: 10, wasteRate: 0.1, laborCost: 100, pm: 1, materialCost: 200,
    equipment: 0, accessory: 0, difficultyAdjust: 0
  }]);
  assert(supply === 3300, '단순 공급가 3300: ' + supply);
})();

// Test 2: 도급 = 공급 × 1.15 (기본)
(function() {
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: false, floorLevel: 2, hasElev: true
  });
  assert(contract === 1150000, '도급 ×1.15: ' + contract);
})();

// Test 3: 클래식럭셔리 가산 (gradeMul 1.8)
// 1000000 × 1.15 × 1.8 = 2070000
(function() {
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.8, occupied: false, floorLevel: 2, hasElev: true
  });
  assert(contract === 2070000, '클래식 도급 2070000: ' + contract);
})();

// Test 4: 거주중 +10%
// 1000000 × 1.15 × 1.10 = 1265000
(function() {
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: true, floorLevel: 2, hasElev: true
  });
  assert(contract === 1265000, '거주중 1265000: ' + contract);
})();

// Test 5: 4층 무엘 +5% (양중비)
// 1000000 × 1.15 × 1.05 = 1207500
(function() {
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: false, floorLevel: 4, hasElev: false
  });
  assert(contract === 1207500, '양중 1207500: ' + contract);
})();

// Test 6: 4층 엘리베이터 있음 — 양중 미적용
(function() {
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.0, gradeMul: 1.0, occupied: false, floorLevel: 4, hasElev: true
  });
  assert(contract === 1150000, '엘리베이터 있으면 양중 X: ' + contract);
})();

// Test 7: 펜트하우스 baseFactor 1.25
// 1000000 × 1.15 × 1.25 = 1437500
(function() {
  const contract = calcContractAmount(1000000, {
    baseFactor: 1.25, gradeMul: 1.0, occupied: false, floorLevel: 2, hasElev: true
  });
  assert(contract === 1437500, '펜트 1437500: ' + contract);
})();

// Test 8: 최종 = 도급 × 1.10
(function() {
  const final2 = calcFinalAmount(1000000);
  assert(final2 === 1100000, 'VAT 1100000: ' + final2);
})();

// Test 9: 통합 — 30평 아파트 + 클래식 + 거주중
// supply = 100 × 1.05 × (50 + 100) = 100 × 1.05 × 150 = 15750
// contract = 15750 × 1.15 × 1.0(아파트) × 1.8(클래식) × 1.10(거주) = 35840.25 → 35840
// final = 35840 × 1.10 = 39424
(function() {
  const r = calculateEstimate({
    lineItems: [{
      qty: 100, wasteRate: 0.05, laborCost: 50, pm: 1, materialCost: 100,
      equipment: 0, accessory: 0, difficultyAdjust: 0
    }],
    residence: 'APARTMENT',
    concept: 'CLASSIC_LUXURY',
    occupied: true,
    floorLevel: 5,
    hasElev: true,
    areaSqm: 99
  });
  assert(r.ok === true, '통합 OK');
  assert(r.payload.supply === 15750, 'supply 15750: ' + r.payload.supply);
  assert(r.payload.contract === 35863, 'contract 35863: ' + r.payload.contract);
  assert(r.payload.final === 39449, 'final 39449: ' + r.payload.final);
  assert(r.payload.factors.gradeMul === 1.8, 'gradeMul 1.8');
  assert(r.payload.factors.occupied === true, 'occupied true');
})();

// Test 10: 펜트하우스 + 4층 무엘 양중비
// supply = 10 × 1 × (100 + 0) = 1000
// contract = 1000 × 1.15 × 1.25(펜트) × 1.0(미니멀) × 1.05(양중) = 1509.375 → 1509
(function() {
  const r = calculateEstimate({
    lineItems: [{
      qty: 10, wasteRate: 0, laborCost: 100, pm: 1, materialCost: 0,
      equipment: 0, accessory: 0, difficultyAdjust: 0
    }],
    residence: 'PENTHOUSE',
    concept: 'MINIMAL_WHITE',
    occupied: false,
    floorLevel: 5,
    hasElev: false,
    areaSqm: 50
  });
  assert(r.payload.supply === 1000, 'supply 1000');
  assert(r.payload.contract === 1509, 'contract 1509: ' + r.payload.contract);
  assert(r.payload.factors.elevator === true, '양중 적용');
})();

// Test 11: 마진율 계산
// supply 1000, contract 1150 → margin = (1150-1000)/1150 × 100 = 13.04
(function() {
  const r = calculateEstimate({
    lineItems: [{ qty: 1, laborCost: 1000, pm: 1, materialCost: 0 }],
    residence: 'APARTMENT', concept: 'MINIMAL_WHITE',
    occupied: false, floorLevel: 1, hasElev: true, areaSqm: 10
  });
  assert(Math.abs(r.payload.margin - 13.0) < 0.1, '마진율 ~13%: ' + r.payload.margin);
})();

console.log('[PASS] CalcEngineV56 (11/11)');
