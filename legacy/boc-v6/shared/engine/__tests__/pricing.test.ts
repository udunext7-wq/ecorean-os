import { describe, it, expect } from 'vitest'
import { getMatMul, evalFormula, calculateEstimate } from '../pricing.ts'
import type { CostItemDB, EstimateState, EstimateContext, Grades } from '../types.ts'

// ─── getMatMul ────────────────────────────────────────────────────────────────

describe('getMatMul', () => {
  const grades: Grades = {
    bt: 'import', fl: 'wb', wp: 'silk', win: 'triple',
    kit: 'premium', dr: 'mdf', fix: 'premium',
    floorType: 'hardwood', vinylGrade: 'VNL_20', lvtGrade: 'LVT_30',
  }

  it('타일 수입산 자재 계수: 1.4', () => {
    expect(getMatMul('TILE_BT', grades, 1.3)).toBeCloseTo(1.4)
  })

  it('타일 국내산 자재 계수: 1.0', () => {
    expect(getMatMul('TILE_BT', { ...grades, bt: 'domestic' }, 1.3)).toBeCloseTo(1.0)
  })

  it('타일 고급 자재 계수: 2.0', () => {
    expect(getMatMul('TILE_BT', { ...grades, bt: 'luxury' }, 1.3)).toBeCloseTo(2.0)
  })

  it('창호 트리플 유리 계수: 1.4', () => {
    expect(getMatMul('WIN_SYS', grades, 1.3)).toBeCloseTo(1.4)
  })

  it('도배 실크 계수: 1.2', () => {
    expect(getMatMul('WLP_PP', grades, 1.3)).toBeCloseTo(1.2)
  })

  it('주방가구 프리미엄 계수: 1.5', () => {
    expect(getMatMul('FUR_KIT', grades, 1.3)).toBeCloseTo(1.5)
  })

  it('도어 MDF 계수: 1.3', () => {
    expect(getMatMul('DR_INT', grades, 1.3)).toBeCloseTo(1.3)
  })

  it('욕실기기 프리미엄 계수: 1.5', () => {
    expect(getMatMul('BAT_FIX', grades, 1.3)).toBeCloseTo(1.5)
  })

  it('매핑 없는 항목은 globalMul 반환', () => {
    expect(getMatMul('PRE_BY', grades, 1.3)).toBeCloseTo(1.3)
    expect(getMatMul('UNKNOWN', grades, 1.5)).toBeCloseTo(1.5)
  })
})

// ─── evalFormula ─────────────────────────────────────────────────────────────

describe('evalFormula', () => {
  const ctx: EstimateContext = {
    floorArea: 20, wallArea: 40, ceilingArea: 20, totalArea: 20,
    perimeter: 18, windowCount: 2, doorCount: 1,
    wetFloorArea: 5, wetWallArea: 12, dryFloorArea: 15, balArea: 7,
    bathroomCount: 1, bedroomArea: 10,
    kitchenLen: 3, kitWallArea: 6, newWallArea: 8, indirectLen: 5,
  }

  it('단순 변수 참조', () => {
    expect(evalFormula('floorArea', ctx)).toBeCloseTo(20)
    expect(evalFormula('wallArea', ctx)).toBeCloseTo(40)
  })

  it('덧셈 수식', () => {
    expect(evalFormula('wallArea+ceilingArea', ctx)).toBeCloseTo(60)
  })

  it('곱셈 수식', () => {
    expect(evalFormula('floorArea*0.06', ctx)).toBeCloseTo(1.2)
  })

  it('복합 수식', () => {
    expect(evalFormula('wetFloorArea*2.5', ctx)).toBeCloseTo(12.5)
  })

  it('결과가 0보다 작으면 0 반환', () => {
    expect(evalFormula('floorArea-1000', ctx)).toBe(0)
  })

  it('잘못된 수식은 0 반환', () => {
    expect(evalFormula('INVALID!!!', ctx)).toBe(0)
  })

  it('알 수 없는 변수는 0으로 처리', () => {
    expect(evalFormula('unknownVar', ctx)).toBe(0)
  })
})

// ─── calculateEstimate ───────────────────────────────────────────────────────

describe('calculateEstimate', () => {
  const minimalDB: CostItemDB = {
    PRE_BY: {
      itemId: 'PRE_BY', itemName: '바닥 보양', majorCategory: '사전공정', middleCategory: '가설',
      unit: '㎡', laborCost: 2500, materialCost: 1800, equipmentCost: 0, accessoryCost: 300,
      wasteRate: 0.05, defaultDuration: 1, triggerType: 'AUTO', quantityFormula: 'floorArea',
      dataStatus: 'INTERNAL_ESTIMATED', source: 'test', sourceDate: '2025-01-01',
    },
    PRE_DM_W: {
      itemId: 'PRE_DM_W', itemName: '기존 도배 제거', majorCategory: '사전공정', middleCategory: '철거',
      unit: '㎡', laborCost: 3500, materialCost: 0, equipmentCost: 0, accessoryCost: 200,
      wasteRate: 0, defaultDuration: 1, triggerType: 'AUTO', quantityFormula: 'wallArea+ceilingArea',
      dataStatus: 'OFFICIAL', source: 'test', sourceDate: '2025-01-01',
    },
    MSN_FL: {
      itemId: 'MSN_FL', itemName: '바닥 미장', majorCategory: '미장', middleCategory: '미장',
      unit: '㎡', laborCost: 15000, materialCost: 5000, equipmentCost: 0, accessoryCost: 500,
      wasteRate: 0.05, defaultDuration: 2, triggerType: 'AUTO', quantityFormula: 'floorArea',
      dataStatus: 'OFFICIAL', source: 'test', sourceDate: '2025-01-01',
    },
    CLN_FN: {
      itemId: 'CLN_FN', itemName: '준공 청소', majorCategory: '준공', middleCategory: '청소',
      unit: '㎡', laborCost: 5000, materialCost: 1000, equipmentCost: 0, accessoryCost: 0,
      wasteRate: 0, defaultDuration: 1, triggerType: 'AUTO', quantityFormula: 'floorArea',
      dataStatus: 'OFFICIAL', source: 'test', sourceDate: '2025-01-01',
    },
    PRE_WS: {
      itemId: 'PRE_WS', itemName: '폐기물 처리', majorCategory: '사전공정', middleCategory: '폐기물',
      unit: '톤', laborCost: 50000, materialCost: 80000, equipmentCost: 0, accessoryCost: 0,
      wasteRate: 0, defaultDuration: 1, triggerType: 'AUTO', quantityFormula: 'floorArea*0.06',
      dataStatus: 'INTERNAL_ESTIMATED', source: 'test', sourceDate: '2025-01-01',
    },
    PRE_DM_F: {
      itemId: 'PRE_DM_F', itemName: '바닥재 철거', majorCategory: '사전공정', middleCategory: '철거',
      unit: '㎡', laborCost: 8000, materialCost: 0, equipmentCost: 0, accessoryCost: 500,
      wasteRate: 0, defaultDuration: 2, triggerType: 'AUTO', quantityFormula: 'floorArea',
      dataStatus: 'OFFICIAL', source: 'test', sourceDate: '2025-01-01',
    },
  }

  const baseState: EstimateState = {
    buildType: 'apt', buildAge: 10, floorLevel: 5, hasElev: true,
    residentDuring: false, region: 1.0, globalMul: 1.3, gradeMul: 1.3,
    pipeMaterial: 'pb', hasLeak: false, hasAsbestos: false,
    floorLevel2: 'good', kitchenScope: 'none',
    scope: {
      winReplace: false, winMid: false, winScreen: false,
      doorReplace: false, doorFront: false,
      balWp: false, balExpand: false, balInsul: false, balFloor: false,
      lvPaint: false, lvWp: false, lvFloor: false, lvMold: false,
      lvLgs: false, lvIndirect: false, lvWardrobe: false,
      ktCab: false, ktTop: false, ktHood: false, ktDw: false, ktOven: false,
      ktTile: false, ktPlb: false,
      plbPipe: false, plbBoiler: false, plbHeat: false,
      eleWire: false, elePanel: false, eleOutlet: false, eleLight: false, eleIndirect: false,
      spEpoxy: false, spMarble: false, spMasonry: false, spEifs: false, spDeck: false,
      spSnd4t: false, spInsBd: false, spExpcon: false, spMicrocem: false,
      comSign: false, comCounter: false, comKitchen: false, comAutodr: false,
      comFsd: false, comSpr: false, comCctv: false, comPos: false, comDuct: false,
      strMasCb: false, strMasRb: false, strConcrete: false, strSteel: false,
      strAlc: false, strWpu: false, strExtStone: false, strStairTile: false,
      strStairRail: false, strTerrace: false, strScaffold: false,
    },
    grades: {
      bt: 'import', fl: 'wb', wp: 'silk', win: 'triple',
      kit: 'premium', dr: 'mdf', fix: 'premium',
      floorType: 'hardwood', vinylGrade: 'VNL_20', lvtGrade: 'LVT_30',
    },
    bathroomDetails: [],
    spaces: [],
  }

  it('공간이 없으면 빈 결과 반환', () => {
    const r = calculateEstimate(baseState, minimalDB)
    expect(r).not.toBeNull()
    expect(r!.lines).toHaveLength(0)
    expect(r!.totalSupply).toBe(0)
  })

  it('DB가 비어있으면 null 반환', () => {
    const state = { ...baseState, spaces: [{ id: '1', name: '거실', type: 'living' as const, width: 5000, length: 4000 }] }
    const r = calculateEstimate(state, {})
    expect(r).toBeNull()
  })

  it('공간 추가 시 양수 견적 반환', () => {
    const state: EstimateState = {
      ...baseState,
      spaces: [{ id: '1', name: '거실', type: 'living', width: 5000, length: 4000 }],
    }
    const r = calculateEstimate(state, minimalDB)
    expect(r).not.toBeNull()
    expect(r!.lines.length).toBeGreaterThan(0)
    expect(r!.totalSupply).toBeGreaterThan(0)
  })

  it('도급 = 공급가 × 1.15', () => {
    const state: EstimateState = {
      ...baseState,
      spaces: [{ id: '1', name: '거실', type: 'living', width: 5000, length: 4000 }],
    }
    const r = calculateEstimate(state, minimalDB)!
    expect(r.contractAmount).toBeCloseTo(r.totalSupply * 1.15, 0)
  })

  it('최종 = 도급 × 1.10 (VAT)', () => {
    const state: EstimateState = {
      ...baseState,
      spaces: [{ id: '1', name: '거실', type: 'living', width: 5000, length: 4000 }],
    }
    const r = calculateEstimate(state, minimalDB)!
    expect(r.finalAmount).toBeCloseTo(r.contractAmount * 1.10, 0)
  })

  it('거주자 상주 시 adjMul에 1.10 적용', () => {
    const stateNoRes: EstimateState = {
      ...baseState,
      spaces: [{ id: '1', name: '거실', type: 'living', width: 5000, length: 4000 }],
    }
    const stateRes: EstimateState = { ...stateNoRes, residentDuring: true }
    const r1 = calculateEstimate(stateNoRes, minimalDB)!
    const r2 = calculateEstimate(stateRes, minimalDB)!
    // 거주자 상주 시 비용이 더 높아야 함
    expect(r2.totalSupply).toBeGreaterThan(r1.totalSupply)
  })

  it('공사기간은 면적 기반으로 양수', () => {
    const state: EstimateState = {
      ...baseState,
      spaces: [{ id: '1', name: '거실', type: 'living', width: 5000, length: 4000 }],
    }
    const r = calculateEstimate(state, minimalDB)!
    expect(r.duration).toBeGreaterThan(0)
  })
})
