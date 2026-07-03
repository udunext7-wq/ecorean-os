// ECOREAN BOC v5.6 — CalcEngine 견적 계산 (보정계수 통합)
// SoT: docs/MASTER_PLAN.md §107 (KPI 11항목)
//
// 핵심 공식:
//   공급가 = sum(qty × (1+wasteRate) × (laborCost×pm + materialCost) + equipment + accessory + difficultyAdjust)
//   도급합계 = 공급가 × baseFactor × gradeMul × occupiedFactor × elevatorFactor
//   최종 = 도급합계 × 1.10 (VAT)
//
// 보정계수:
//   - baseFactor: 주거형태별 (0.95 ~ 1.25)
//   - gradeMul: 컨셉별 (1.0 ~ 1.8)
//   - occupiedFactor: 거주중 시공 ×1.10
//   - elevatorFactor: 4층+ 무엘리베이터 ×1.05 (양중비)
//
// 절대 규칙: 단가 추정 금지 — 실제 cost_items DB에서 LOAD

const { getResidence } = require('../matrices/ResidenceMatrix.cjs');
const { getGradeMul } = require('../matrices/ConceptMaterialMatrix.cjs');

const VAT_RATE = 0.10;
const BASE_CONTRACT_RATIO = 1.15;

function calcSupplyAmount(lineItems) {
  let total = 0;
  lineItems.forEach(function(it) {
    const qty = it.qty || 0;
    const waste = it.wasteRate || 0;
    const labor = it.laborCost || 0;
    const pm = it.pm || 0;
    const material = it.materialCost || 0;
    const equip = it.equipment || 0;
    const access = it.accessory || 0;
    const diff = it.difficultyAdjust || 0;

    const lineCost = qty * (1 + waste) * (labor * pm + material) + equip + access + diff;
    total += lineCost;
  });
  return Math.round(total);
}

function calcContractAmount(supply, opts) {
  const baseFactor      = opts.baseFactor || 1.0;
  const gradeMul        = opts.gradeMul || 1.0;
  const occupiedFactor  = opts.occupied ? 1.10 : 1.0;
  const elevatorFactor  = opts.floorLevel >= 4 && !opts.hasElev ? 1.05 : 1.0;

  return Math.round(
    supply * BASE_CONTRACT_RATIO * baseFactor * gradeMul * occupiedFactor * elevatorFactor
  );
}

function calcFinalAmount(contract) {
  return Math.round(contract * (1 + VAT_RATE));
}

function calculateEstimate(input) {
  if (!input || !Array.isArray(input.lineItems)) {
    return { ok: false, errors: ['lineItems 배열 필수'] };
  }

  const supply = calcSupplyAmount(input.lineItems);

  const residenceData = getResidence(input.residence);
  const baseFactor = residenceData ? residenceData.baseFactor : 1.0;
  const gradeMul = getGradeMul(input.concept);

  const contract = calcContractAmount(supply, {
    baseFactor: baseFactor,
    gradeMul: gradeMul,
    occupied: input.occupied,
    floorLevel: input.floorLevel,
    hasElev: input.hasElev
  });

  const final2 = calcFinalAmount(contract);

  const areaSqm = input.areaSqm || 0;
  const sqmPrice = areaSqm > 0 ? Math.round(final2 / areaSqm) : 0;
  const pyPrice = areaSqm > 0 ? Math.round(final2 / (areaSqm / 3.3058)) : 0;

  const margin = contract > 0 ? ((contract - supply) / contract * 100) : 0;

  return {
    ok: true,
    payload: {
      supply: supply,
      contract: contract,
      final: final2,
      areaSqm: areaSqm,
      sqmPrice: sqmPrice,
      pyPrice: pyPrice,
      margin: parseFloat(margin.toFixed(1)),
      factors: {
        baseFactor: baseFactor,
        gradeMul: gradeMul,
        occupied: !!input.occupied,
        elevator: input.floorLevel >= 4 && !input.hasElev
      }
    }
  };
}

module.exports = {
  calcSupplyAmount: calcSupplyAmount,
  calcContractAmount: calcContractAmount,
  calcFinalAmount: calcFinalAmount,
  calculateEstimate: calculateEstimate,
  VAT_RATE: VAT_RATE,
  BASE_CONTRACT_RATIO: BASE_CONTRACT_RATIO
};
