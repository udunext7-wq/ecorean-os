import { describe, it, expect } from 'vitest'
import { runDiagnostics } from '../diagnostics.ts'
import type { EstimateLine, SpaceTotals, EstimateState, Scope, Grades } from '../types.ts'

const EMPTY_SCOPE: Scope = {
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
}
const GRADES: Grades = {
  bt: 'import', fl: 'wb', wp: 'silk', win: 'triple',
  kit: 'premium', dr: 'mdf', fix: 'premium',
  floorType: 'hardwood', vinylGrade: 'VNL_20', lvtGrade: 'LVT_30',
}

const baseState: EstimateState = {
  buildType: 'apt', buildAge: 10, floorLevel: 5, hasElev: true,
  residentDuring: false, region: 1.0, globalMul: 1.3, gradeMul: 1.3,
  pipeMaterial: 'pb', hasLeak: false, hasAsbestos: false,
  floorLevel2: 'good', kitchenScope: 'none',
  scope: EMPTY_SCOPE, grades: GRADES, bathroomDetails: [], spaces: [],
}

const emptyTotals: SpaceTotals = {
  fa: 0, wa: 0, ca: 0, pr: 0, wn: 0, dn: 0, cor: 0,
  wet: 0, wetFA: 0, wetWA: 0, dryFA: 0, balFA: 0,
  bedroomFA: 0, kitFA: 0, bathroomCount: 0,
}
const bathroomTotals: SpaceTotals = { ...emptyTotals, bathroomCount: 1, wet: 1, wetFA: 3, wetWA: 10 }

function makeLine(overrides: Partial<EstimateLine>): EstimateLine {
  return {
    id: 'TEST', name: '테스트', category: '테스트',
    unit: '㎡', qty: 1, laborCost: 1000, materialCost: 500,
    supplyPrice: 1500, auto: false, note: '',
    ...overrides,
  }
}

describe('runDiagnostics', () => {
  it('문제 없으면 OK 반환', () => {
    const d = runDiagnostics([], baseState, emptyTotals)
    expect(d).toHaveLength(1)
    expect(d[0]?.code).toBe('OK')
    expect(d[0]?.type).toBe('ok')
  })

  it('W001: 욕실 있는데 방수 공정 없으면 경고', () => {
    const d = runDiagnostics([], baseState, bathroomTotals)
    expect(d.some(x => x.code === 'W001')).toBe(true)
  })

  it('욕실에 방수 공정 있으면 W001 없음', () => {
    const lines = [makeLine({ id: 'WTP_BT', category: '방수' })]
    const d = runDiagnostics(lines, baseState, bathroomTotals)
    expect(d.some(x => x.code === 'W001')).toBe(false)
  })

  it('W002: 타일 있는데 줄눈 없으면 경고', () => {
    const lines = [makeLine({ id: 'TILE_BT', category: '타일' })]
    const d = runDiagnostics(lines, baseState, bathroomTotals)
    expect(d.some(x => x.code === 'W002')).toBe(true)
  })

  it('타일과 줄눈 같이 있으면 W002 없음', () => {
    const lines = [
      makeLine({ id: 'TILE_BT', category: '타일' }),
      makeLine({ id: 'TILE_GRF', name: '타일 줄눈', category: '타일' }),
    ]
    const d = runDiagnostics(lines, baseState, emptyTotals)
    expect(d.some(x => x.code === 'W002')).toBe(false)
  })

  it('E001: 석면 의심인데 제거 공정 없으면 오류', () => {
    const state = { ...baseState, hasAsbestos: true }
    const d = runDiagnostics([], state, emptyTotals)
    expect(d.some(x => x.code === 'E001')).toBe(true)
    expect(d.find(x => x.code === 'E001')?.type).toBe('error')
  })

  it('W003: 갈바나이즈 배관인데 교체 공정 없으면 경고', () => {
    const state = { ...baseState, pipeMaterial: 'galvanized' as const }
    const lines = [makeLine({ id: 'PLB_SAN', category: '배관' })]
    const d = runDiagnostics(lines, state, emptyTotals)
    expect(d.some(x => x.code === 'W003')).toBe(true)
  })
})
