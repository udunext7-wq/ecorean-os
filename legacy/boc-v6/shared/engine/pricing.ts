import type {
  CostItemDB,
  EstimateState,
  EstimateResult,
  EstimateLine,
  EstimateContext,
  Grades,
} from './types.ts'
import { getTotals, getHoistMul } from './calc.ts'
import { getSelectedProcesses } from './selector.ts'

// ─── 자재 등급 계수 ───────────────────────────────────────────────────────────

export function getMatMul(id: string, grades: Grades, globalMul: number): number {
  const TILE_IDS = ['TILE_BT', 'TILE_BW', 'TILE_GRF', 'TILE_GRW', 'TILE_KT', 'TILE_BAL']
  const FLOOR_IDS = ['FLR_HW', 'FLR_HB']
  const WALLPAPER_IDS = ['WLP_PP', 'WLP_UB']
  const KITCHEN_IDS = ['FUR_KIT', 'FUR_TOP']
  const DOOR_IDS = ['DR_INT', 'DR_FRONT']
  const FIXTURE_IDS = ['BAT_FIX', 'BAT_FAU']

  if (TILE_IDS.includes(id))
    return ({ domestic: 1.0, import: 1.4, luxury: 2.0 })[grades.bt] ?? globalMul
  if (FLOOR_IDS.includes(id))
    return ({ hb: 1.0, wb: 1.3, wood: 2.0 })[grades.fl] ?? globalMul
  if (WALLPAPER_IDS.includes(id))
    return ({ paper: 0.8, silk: 1.2, wide: 1.6 })[grades.wp] ?? globalMul
  if (id === 'WIN_SYS')
    return ({ double: 1.0, triple: 1.4, loe: 1.8 })[grades.win] ?? globalMul
  if (KITCHEN_IDS.includes(id))
    return ({ standard: 1.0, premium: 1.5, luxury: 2.5 })[grades.kit] ?? globalMul
  if (DOOR_IDS.includes(id))
    return ({ abs: 1.0, mdf: 1.3, wood: 2.2 })[grades.dr] ?? globalMul
  if (FIXTURE_IDS.includes(id))
    return ({ standard: 1.0, premium: 1.5, luxury: 2.5 })[grades.fix] ?? globalMul

  return globalMul
}

// ─── 수식 안전 평가 ───────────────────────────────────────────────────────────

const SAFE_FORMULA_RE = /^[a-zA-Z0-9+\-*/.() ]+$/

export function evalFormula(formula: string, ctx: EstimateContext): number {
  if (!SAFE_FORMULA_RE.test(formula)) return 0

  // 컨텍스트 변수명을 값으로 치환 (긴 이름 우선)
  const entries = Object.entries(ctx).sort(([a], [b]) => b.length - a.length)
  let expr = formula
  for (const [key, val] of entries) {
    expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val))
  }

  try {
    const result = new Function(`return Math.max(0, ${expr})`)() as number
    return Number.isFinite(result) ? result : 0
  } catch {
    return 0
  }
}

// ─── 메인 견적 계산 ────────────────────────────────────────────────────────────

export function calculateEstimate(
  state: EstimateState,
  db: CostItemDB,
): EstimateResult | null {
  if (Object.keys(db).length === 0) return null

  const t = getTotals(state.spaces)

  if (t.fa === 0) {
    return { lines: [], totalSupply: 0, contractAmount: 0, finalAmount: 0, duration: 0, totals: t }
  }

  const hoistMul = getHoistMul(state.floorLevel, state.hasElev)
  const regionMul = state.region ?? 1.0
  const residentMul = state.residentDuring ? 1.10 : 1.0
  const adjMul = hoistMul * regionMul * residentMul

  const ctx: EstimateContext = {
    floorArea: t.fa,
    wallArea: t.wa,
    ceilingArea: t.ca,
    totalArea: t.fa,
    perimeter: t.pr,
    windowCount: t.wn,
    doorCount: t.dn,
    wetFloorArea: t.wetFA,
    wetWallArea: t.wetWA,
    dryFloorArea: t.dryFA,
    balArea: t.balFA,
    bathroomCount: t.bathroomCount,
    bedroomArea: t.bedroomFA,
    kitchenLen: t.kitFA > 0 ? Math.sqrt(t.kitFA) * 2 : 0,
    kitWallArea: t.kitFA * 1.5,
    newWallArea: t.wa * 0.2,
    indirectLen: t.pr * 0.3,
  }

  const procs = getSelectedProcesses(state, db)
  const lines: EstimateLine[] = []

  for (const { id, note, auto } of procs) {
    const item = db[id]
    if (!item) continue

    const qty = evalFormula(item.quantityFormula, ctx)
    if (qty <= 0) continue

    const qw = qty * (1 + item.wasteRate)
    const matMul = getMatMul(id, state.grades, state.globalMul ?? 1.3)
    const supplyPrice = Math.round(
      qw * (item.laborCost * adjMul + item.materialCost * matMul),
    )

    lines.push({
      id,
      name: item.itemName,
      category: item.majorCategory,
      unit: item.unit,
      qty: Math.round(qty * 100) / 100,
      laborCost: item.laborCost,
      materialCost: item.materialCost,
      supplyPrice,
      auto,
      note,
    })
  }

  const totalSupply = lines.reduce((s, l) => s + l.supplyPrice, 0)
  const contractAmount = Math.round(totalSupply * 1.15)
  const finalAmount = Math.round(contractAmount * 1.10)
  const duration = Math.ceil(t.fa / 3) + 5

  return { lines, totalSupply, contractAmount, finalAmount, duration, totals: t }
}
