// ─── 공간 ───────────────────────────────────────────────────────────────────

export type SpaceType =
  | 'living'
  | 'bedroom'
  | 'bathroom'
  | 'kitchen'
  | 'balcony'
  | 'hallway'
  | 'other'

export interface WindowDim {
  w: number // mm
  h: number // mm
}

export interface DoorDim {
  w: number // mm
  h: number // mm
}

export interface Space {
  id: string
  name: string
  type: SpaceType
  width: number    // mm
  length: number   // mm
  height?: number  // mm, default 2400
  windows?: WindowDim[]
  doors?: DoorDim[]
  corners?: number
}

export interface SpaceCalc {
  fa: number       // floor area m²
  wa: number       // wall area m² (net, minus openings)
  ca: number       // ceiling area m²
  pr: number       // perimeter m
  winArea: number  // total window area m²
  doorArea: number // total door area m²
}

export interface SpaceTotals {
  fa: number           // total floor area m²
  wa: number           // total net wall area m²
  ca: number           // total ceiling area m²
  pr: number           // total perimeter m
  wn: number           // total window count
  dn: number           // total door count
  cor: number          // total corner count
  wet: number          // bathroom count
  wetFA: number        // bathroom floor area m²
  wetWA: number        // bathroom wall area m²
  dryFA: number        // non-wet, non-balcony floor area m²
  balFA: number        // balcony floor area m²
  bedroomFA: number    // bedroom floor area m²
  kitFA: number        // kitchen floor area m²
  bathroomCount: number
}

// ─── 비용 항목 DB ────────────────────────────────────────────────────────────

export type TriggerType = 'AUTO' | 'CONDITIONAL' | 'MANUAL'
export type DataStatus = 'OFFICIAL' | 'INTERNAL_ESTIMATED' | 'NEEDS_RESEARCH'

export interface CostItem {
  itemId: string
  itemName: string
  majorCategory: string
  middleCategory: string
  unit: string
  laborCost: number
  materialCost: number
  equipmentCost: number
  accessoryCost: number
  wasteRate: number
  defaultDuration: number
  triggerType: TriggerType
  quantityFormula: string
  dataStatus: DataStatus
  source: string
  sourceDate: string
  notes?: string
}

export type CostItemDB = Record<string, CostItem>

// ─── 온톨로지 ─────────────────────────────────────────────────────────────────

export type OntologyRuleType = 'AUTO_INCLUDE' | 'WARN_CONDITIONAL' | 'FORCED'

export interface OntologyRule {
  id: string
  trigger: string  // 트리거 공정 ID
  action: string   // 실행 공정 ID
  type: OntologyRuleType
  condition?: string
  note?: string
}

export interface OntologyAutoAdded {
  id: string
  note: string
  ruleId: string
}

export interface OntologyWarning {
  ruleId: string
  message: string
  trigger: string
  action: string
}

export interface OntologyResult {
  autoAdded: OntologyAutoAdded[]
  warnings: OntologyWarning[]
}

export type OntologyContext = Record<string, unknown>

// ─── 견적 상태 ────────────────────────────────────────────────────────────────

export type FloorType = 'hardwood' | 'wood' | 'vinyl' | 'lvt' | 'herringbone'
export type TileGrade = 0 | 1 | 2  // 0=국내산, 1=수입산, 2=포세린

export interface BathroomDetail {
  wp?: boolean
  tileGrade?: TileGrade
  shower?: boolean
}

export interface Grades {
  bt: 'domestic' | 'import' | 'luxury'
  fl: 'hb' | 'wb' | 'wood'
  wp: 'paper' | 'silk' | 'wide'
  win: 'double' | 'triple' | 'loe'
  kit: 'standard' | 'premium' | 'luxury'
  dr: 'abs' | 'mdf' | 'wood'
  fix: 'standard' | 'premium' | 'luxury'
  floorType: FloorType
  vinylGrade: string
  lvtGrade: string
}

export interface Scope {
  winReplace: boolean; winMid: boolean; winScreen: boolean
  doorReplace: boolean; doorFront: boolean
  balWp: boolean; balExpand: boolean; balInsul: boolean; balFloor: boolean
  lvPaint: boolean; lvWp: boolean; lvFloor: boolean; lvMold: boolean
  lvLgs: boolean; lvIndirect: boolean; lvWardrobe: boolean
  ktCab: boolean; ktTop: boolean; ktHood: boolean; ktDw: boolean; ktOven: boolean
  ktTile: boolean; ktPlb: boolean
  plbPipe: boolean; plbBoiler: boolean; plbHeat: boolean
  eleWire: boolean; elePanel: boolean; eleOutlet: boolean; eleLight: boolean; eleIndirect: boolean
  spEpoxy: boolean; spMarble: boolean; spMasonry: boolean; spEifs: boolean; spDeck: boolean
  spSnd4t: boolean; spInsBd: boolean; spExpcon: boolean; spMicrocem: boolean
  comSign: boolean; comCounter: boolean; comKitchen: boolean; comAutodr: boolean
  comFsd: boolean; comSpr: boolean; comCctv: boolean; comPos: boolean; comDuct: boolean
  strMasCb: boolean; strMasRb: boolean; strConcrete: boolean; strSteel: boolean
  strAlc: boolean; strWpu: boolean; strExtStone: boolean; strStairTile: boolean
  strStairRail: boolean; strTerrace: boolean; strScaffold: boolean
}

export interface EstimateState {
  buildType: string
  buildAge: number
  floorLevel: number
  hasElev: boolean
  residentDuring: boolean
  region: number
  globalMul: number
  gradeMul: number
  pipeMaterial: 'pb' | 'galvanized' | 'copper' | 'pex'
  hasLeak: boolean
  hasAsbestos: boolean
  floorLevel2: 'good' | 'fair' | 'poor'
  kitchenScope: 'full' | 'partial' | 'none'
  scope: Scope
  grades: Grades
  bathroomDetails: BathroomDetail[]
  spaces: Space[]
}

// ─── 견적 결과 ────────────────────────────────────────────────────────────────

export interface SelectedProcess {
  id: string
  note: string
  auto: boolean
}

export interface EstimateLine {
  id: string
  name: string
  category: string
  unit: string
  qty: number
  laborCost: number    // 인건비/단위
  materialCost: number // 자재비/단위
  supplyPrice: number  // 공급가 합계 (qty * (1+wr) * (labor*coeff + mat*matMul))
  auto: boolean
  note: string
}

export interface EstimateResult {
  lines: EstimateLine[]
  totalSupply: number    // 공급가 합계
  contractAmount: number // 도급 = totalSupply × 1.15
  finalAmount: number    // 최종 = contractAmount × 1.10 (VAT)
  duration: number       // 공사기간 (일)
  totals: SpaceTotals
}

export interface EstimateContext {
  floorArea: number
  wallArea: number
  ceilingArea: number
  totalArea: number
  perimeter: number
  windowCount: number
  doorCount: number
  wetFloorArea: number
  wetWallArea: number
  dryFloorArea: number
  balArea: number
  bathroomCount: number
  bedroomArea: number
  kitchenLen: number
  kitWallArea: number
  newWallArea: number
  indirectLen: number
}
