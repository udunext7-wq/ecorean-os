import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(persist(
  (set, get) => ({
    // ── 건물 기본 정보 ──
    buildType: 'apt',
    buildAge: 0,
    floorLevel: 1,
    hasElev: true,
    residentDuring: false,
    region: 1.05,
    globalMul: 1.3,
    gradeMul: 1.3,
    pipeMaterial: 'pb',
    hasLeak: false,
    hasAsbestos: false,
    floorLevel2: 'good',
    kitchenScope: 'full',

    // ── 공사 범위 체크박스 (STEP4) ──
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

    // ── 자재 등급 선택 ──
    grades: {
      bt: 'import',    // 욕실타일
      fl: 'wb',        // 바닥재
      wp: 'silk',      // 도배
      win: 'triple',   // 창호
      kit: 'premium',  // 주방가구
      dr: 'mdf',       // 도어
      fix: 'premium',  // 욕실위생기기
      floorType: 'hardwood',
      vinylGrade: 'VNL_20',
      lvtGrade: 'LVT_30',
    },

    // ── 욕실별 상세 설정 ──
    bathroomDetails: [], // [{ wp: false, tileGrade: 0, shower: false }]

    // ── 공간 목록 ──
    spaces: [],

    // ── 견적 결과 ──
    result: null,

    // ── 프로젝트 / 프리셋 ──
    projects: [],
    presets: [],
    approvalReqs: [],
    approvalLog: [],

    // ── DB (앱 시작 시 로드) ──
    costItems: {},
    ontologyRules: [],
    laborRoles: [],

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Actions
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    setField: (key, val) => set({ [key]: val }),

    setScope: (key, val) => set(s => ({ scope: { ...s.scope, [key]: val } })),
    setGrade: (key, val) => set(s => ({ grades: { ...s.grades, [key]: val } })),

    setBathroomDetail: (idx, key, val) => set(s => {
      const arr = [...s.bathroomDetails]
      if (!arr[idx]) arr[idx] = {}
      arr[idx] = { ...arr[idx], [key]: val }
      return { bathroomDetails: arr }
    }),

    // 공간
    addSpace: (space) => set(s => ({ spaces: [...s.spaces, space] })),
    updateSpace: (id, patch) => set(s => ({
      spaces: s.spaces.map(x => x.id === id ? { ...x, ...patch } : x)
    })),
    removeSpace: (id) => set(s => ({ spaces: s.spaces.filter(x => x.id !== id) })),
    setSpaces: (spaces) => set({ spaces }),

    // 결과
    setResult: (result) => set({ result }),

    // DB
    setDB: (costItems) => set({ costItems }),
    setOntology: (rules) => set({ ontologyRules: rules }),
    setLaborRoles: (roles) => set({ laborRoles: roles }),

    // 프로젝트
    saveProject: (proj) => set(s => ({ projects: [proj, ...s.projects] })),
    deleteProject: (id) => set(s => ({ projects: s.projects.filter(p => p.id !== id) })),
    loadProject: (proj) => set({
      buildType: proj.buildType || 'apt',
      buildAge: proj.buildAge || 0,
      floorLevel: proj.floorLevel || 1,
      spaces: proj.spaces || [],
      scope: proj.scope || {},
      grades: proj.grades || {},
      result: null,
    }),

    // 프리셋
    savePreset: (preset) => set(s => ({ presets: [preset, ...s.presets] })),
    deletePreset: (id) => set(s => ({ presets: s.presets.filter(p => p.id !== id) })),

    // 승인
    addApprovalReq: (req) => set(s => ({ approvalReqs: [req, ...s.approvalReqs] })),
    approveReq: (id, approved, reason) => set(s => ({
      approvalReqs: s.approvalReqs.map(r =>
        r.requestId === id
          ? { ...r, approvalStatus: approved ? 'approved' : 'rejected',
              approvedAt: new Date().toISOString(), reviewNotes: reason }
          : r
      ),
      approvalLog: [{
        approvalId: 'APL-' + Date.now(),
        requestId: id,
        actionType: approved ? 'approved' : 'rejected',
        reason, approvedBy: '대표',
        approvedAt: new Date().toISOString()
      }, ...s.approvalLog]
    })),
  }),
  {
    name: 'ecorean-store-v2',
    version: 1,
  }
))
