import type {
  Space,
  CostItemDB,
  OntologyRule,
  Scope,
  Grades,
  BathroomDetail,
  EstimateResult,
} from '../engine/types.ts'

export type BuildType = 'apt' | 'officetel' | 'villa' | 'commercial' | 'office'

export interface Project {
  id: string
  name: string
  createdAt: string
  buildType: BuildType
  buildAge: number
  floorLevel: number
  spaces: Space[]
  scope: Scope
  grades: Grades
  result: EstimateResult | null
}

export interface Preset {
  id: string
  name: string
  scope: Partial<Scope>
  grades: Partial<Grades>
}

export interface ApprovalRequest {
  requestId: string
  type: string
  amount: number
  requestedBy: string
  requestedAt: string
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedAt?: string
  reviewNotes?: string
  data: Record<string, unknown>
}

export interface ApprovalLog {
  approvalId: string
  requestId: string
  actionType: 'approved' | 'rejected'
  reason: string
  approvedBy: string
  approvedAt: string
}

export interface StoreState {
  // ── 건물 기본 정보 ────────────────────────────────────────────────────────
  buildType: BuildType
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

  // ── 공사 범위 ─────────────────────────────────────────────────────────────
  scope: Scope

  // ── 자재 등급 ─────────────────────────────────────────────────────────────
  grades: Grades

  // ── 욕실 상세 ─────────────────────────────────────────────────────────────
  bathroomDetails: BathroomDetail[]

  // ── 공간 목록 ─────────────────────────────────────────────────────────────
  spaces: Space[]

  // ── 견적 결과 ─────────────────────────────────────────────────────────────
  result: EstimateResult | null

  // ── 프로젝트·프리셋 ───────────────────────────────────────────────────────
  projects: Project[]
  presets: Preset[]

  // ── 승인 ──────────────────────────────────────────────────────────────────
  approvalReqs: ApprovalRequest[]
  approvalLog: ApprovalLog[]

  // ── DB (앱 시작 시 로드) ──────────────────────────────────────────────────
  costItems: CostItemDB
  ontologyRules: OntologyRule[]
  laborRoles: unknown[]
}

export type StoreActions = {
  setField: <K extends keyof StoreState>(key: K, val: StoreState[K]) => void
  setScope: (key: keyof Scope, val: boolean) => void
  setGrade: <K extends keyof Grades>(key: K, val: Grades[K]) => void
  setBathroomDetail: (idx: number, key: keyof BathroomDetail, val: boolean | number) => void

  // 공간
  addSpace: (space: Space) => void
  updateSpace: (id: string, patch: Partial<Space>) => void
  removeSpace: (id: string) => void
  setSpaces: (spaces: Space[]) => void

  // 결과
  setResult: (result: EstimateResult | null) => void

  // DB
  setDB: (costItems: CostItemDB) => void
  setOntology: (rules: OntologyRule[]) => void
  setLaborRoles: (roles: unknown[]) => void

  // 프로젝트
  saveProject: (proj: Project) => void
  deleteProject: (id: string) => void
  loadProject: (proj: Project) => void

  // 프리셋
  savePreset: (preset: Preset) => void
  deletePreset: (id: string) => void

  // 승인
  addApprovalReq: (req: ApprovalRequest) => void
  approveReq: (id: string, approved: boolean, reason: string) => void
}

export type Store = StoreState & StoreActions
