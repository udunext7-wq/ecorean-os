import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Store, StoreState, Project } from './types.ts'
import type { BathroomDetail, Grades, Scope } from '../engine/types.ts'

const DEFAULT_SCOPE: Scope = {
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

const DEFAULT_GRADES: Grades = {
  bt: 'import', fl: 'wb', wp: 'silk', win: 'triple',
  kit: 'premium', dr: 'mdf', fix: 'premium',
  floorType: 'hardwood', vinylGrade: 'VNL_20', lvtGrade: 'LVT_30',
}

const INITIAL: StoreState = {
  buildType: 'apt', buildAge: 0, floorLevel: 1,
  hasElev: true, residentDuring: false, region: 1.05,
  globalMul: 1.3, gradeMul: 1.3, pipeMaterial: 'pb',
  hasLeak: false, hasAsbestos: false, floorLevel2: 'good', kitchenScope: 'none',
  scope: { ...DEFAULT_SCOPE },
  grades: { ...DEFAULT_GRADES },
  bathroomDetails: [],
  spaces: [],
  result: null,
  projects: [], presets: [],
  approvalReqs: [], approvalLog: [],
  costItems: {}, ontologyRules: [], laborRoles: [],
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...INITIAL,

      setField: (key, val) => set({ [key]: val } as Partial<StoreState>),

      setScope: (key, val) =>
        set(s => ({ scope: { ...s.scope, [key]: val } })),

      setGrade: <K extends keyof Grades>(key: K, val: Grades[K]) =>
        set(s => ({ grades: { ...s.grades, [key]: val } })),

      setBathroomDetail: (idx, key, val) =>
        set(s => {
          const arr: BathroomDetail[] = [...s.bathroomDetails]
          arr[idx] = { ...arr[idx], [key]: val }
          return { bathroomDetails: arr }
        }),

      addSpace: (space) =>
        set(s => ({ spaces: [...s.spaces, space] })),

      updateSpace: (id, patch) =>
        set(s => ({ spaces: s.spaces.map(x => x.id === id ? { ...x, ...patch } : x) })),

      removeSpace: (id) =>
        set(s => ({ spaces: s.spaces.filter(x => x.id !== id) })),

      setSpaces: (spaces) => set({ spaces }),

      setResult: (result) => set({ result }),

      setDB: (costItems) => set({ costItems }),
      setOntology: (rules) => set({ ontologyRules: rules }),
      setLaborRoles: (roles) => set({ laborRoles: roles }),

      saveProject: (proj) =>
        set(s => ({ projects: [proj, ...s.projects] })),

      deleteProject: (id) =>
        set(s => ({ projects: s.projects.filter(p => p.id !== id) })),

      loadProject: (proj: Project) =>
        set({
          buildType: proj.buildType,
          buildAge: proj.buildAge,
          floorLevel: proj.floorLevel,
          spaces: proj.spaces,
          scope: { ...DEFAULT_SCOPE, ...proj.scope },
          grades: { ...DEFAULT_GRADES, ...proj.grades },
          result: null,
        }),

      savePreset: (preset) =>
        set(s => ({ presets: [preset, ...s.presets] })),

      deletePreset: (id) =>
        set(s => ({ presets: s.presets.filter(p => p.id !== id) })),

      addApprovalReq: (req) =>
        set(s => ({ approvalReqs: [req, ...s.approvalReqs] })),

      approveReq: (id, approved, reason) =>
        set(s => ({
          approvalReqs: s.approvalReqs.map(r =>
            r.requestId === id
              ? {
                  ...r,
                  approvalStatus: approved ? 'approved' : 'rejected',
                  approvedAt: new Date().toISOString(),
                  reviewNotes: reason,
                }
              : r,
          ),
          approvalLog: [
            {
              approvalId: `APL-${Date.now()}`,
              requestId: id,
              actionType: approved ? 'approved' : 'rejected',
              reason,
              approvedBy: '대표',
              approvedAt: new Date().toISOString(),
            },
            ...s.approvalLog,
          ],
        })),
    }),
    {
      name: 'ecorean-store-v2',
      version: 2,
    },
  ),
)
