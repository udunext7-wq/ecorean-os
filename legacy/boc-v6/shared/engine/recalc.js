// 순수 함수 견적 엔진 — DOM 접근 없음, state + db 파라미터로 완전 동작

// ── 공간 면적/둘레 계산 ──
export function calcSpace(sp) {
  const w = sp.width / 1000, l = sp.length / 1000, h = (sp.height || 2400) / 1000
  const fa = w * l
  const ca = fa
  const rawWall = 2 * (w + l) * h
  const winArea = (sp.windows || []).reduce((s, wn) => s + (wn.w / 1000) * (wn.h / 1000), 0)
  const doorArea = (sp.doors || []).reduce((s, d) => s + (d.w / 1000) * (d.h / 1000), 0)
  const wa = Math.max(0, rawWall - winArea - doorArea)
  const pr = 2 * (w + l)
  return { fa, wa, ca, pr, winArea, doorArea }
}

// ── 전체 면적/수량 집계 ──
export function getTotals(spaces) {
  let fa = 0, wa = 0, ca = 0, pr = 0, wn = 0, dn = 0, cor = 0, wet = 0
  let wetFA = 0, wetWA = 0, dryFA = 0, balFA = 0
  spaces.forEach(sp => {
    const c = calcSpace(sp)
    fa += c.fa; wa += c.wa; ca += c.ca; pr += c.pr
    wn += sp.windows ? sp.windows.length : 0
    dn += sp.doors ? sp.doors.length : 0
    cor += sp.corners || 4
    if (sp.type === 'bathroom') { wet++; wetFA += c.fa; wetWA += c.wa }
    else if (sp.type === 'balcony') { balFA += c.fa }
    else { dryFA += c.fa }
  })
  const bedroomSps = spaces.filter(s => s.type === 'bedroom')
  const kitSps = spaces.filter(s => s.type === 'kitchen')
  return {
    fa, wa, ca, pr, wn, dn, cor, wet, wetFA, wetWA, dryFA, balFA,
    bedroomFA: bedroomSps.reduce((s, sp) => s + calcSpace(sp).fa, 0),
    kitFA: kitSps.reduce((s, sp) => s + calcSpace(sp).fa, 0),
    bathroomCount: wet
  }
}

// ── 호이스트(양중) 계수 ──
export function getHoistMul(floorLevel, hasElev) {
  const fl = parseInt(floorLevel) || 1
  if (!hasElev) return fl >= 20 ? 1.35 : fl >= 15 ? 1.30 : fl >= 10 ? 1.20 : fl >= 5 ? 1.12 : 1.05
  return fl >= 20 ? 1.25 : fl >= 15 ? 1.20 : fl >= 10 ? 1.15 : fl >= 5 ? 1.08 : 1.0
}

// ── 공정 선택 (scope + 온톨로지 규칙 적용) ──
export function getSelectedProcesses(state, db) {
  const { spaces, buildAge, pipeMaterial, floorLevel2, kitchenScope, scope, grades, bathroomDetails } = state
  const t = getTotals(spaces)
  if (t.fa === 0) return []

  const selected = []
  const age = buildAge || 0
  const pipeBad = pipeMaterial === 'galvanized'
  const floorBad = floorLevel2 === 'poor'
  const hasBath = t.bathroomCount > 0
  const hasKitchen = t.kitFA > 0 || (kitchenScope && kitchenScope !== 'none')

  const add = (id, note = '') => { if (db[id] && !selected.some(s => s.id === id)) selected.push({ id, note, auto: false }) }
  const addAuto = (id, note = '') => { if (db[id] && !selected.some(s => s.id === id)) selected.push({ id, note, auto: true }) }

  // ── 사전공정 ──
  addAuto('PRE_BY', '철거→보양 자동')
  if (t.wetFA > 0) { add('PRE_DM_T', '욕실바닥철거'); add('PRE_DM_TW', '욕실벽철거') }
  if (t.dryFA > 0) add('PRE_DM_F', '바닥재철거')
  add('PRE_DM_W')
  addAuto('PRE_WS', '철거→폐기물처리 자동')

  // ── 방수 ──
  const bathSpaces = spaces.filter(sp => sp.type === 'bathroom')
  bathSpaces.forEach((sp, i) => {
    if (bathroomDetails[i]?.wp) {
      add('WTP_BT', '욕실방수')
      addAuto('WTP_PM', 'R12: 욕실방수→보호몰탈 자동')
    }
  })
  if (t.balFA > 0 && scope.balWp) add('WTP_BAL')

  // ── 미장 ──
  add('MSN_FL')
  if (floorBad || age > 20) addAuto('MSN_SL', '레벨불량/노후→셀프레벨링 자동')

  // ── 타일 ──
  if (t.wetFA > 0) {
    const usePorcelain = bathroomDetails.some(d => d?.tileGrade === 2)
    if (usePorcelain) {
      add('TILE_PO', '대형포세린바닥'); add('TILE_BW')
      addAuto('MSN_SL', 'R5: 대형포세린→셀프레벨링 자동')
    } else {
      add('TILE_BT'); add('TILE_BW')
    }
    addAuto('TILE_GRF', 'R3: 타일→줄눈 자동')
    addAuto('TILE_GRW', 'R3: 타일→줄눈 자동')
  }
  if (scope.ktTile) add('TILE_KT')
  if (scope.balFloor) add('TILE_BAL')

  // ── 목공·구조 ──
  if (scope.lvLgs) add('LGS_WL', 'LGS경량칸막이')
  if (t.wa > 0) { add('GYP_WL'); add('GYP_CL') }
  if (scope.lvIndirect) {
    add('GYP_ID')
    addAuto('LGS_WL', 'R19: 간접등박스→LGS틀 자동')
  }

  // ── 창호 ──
  if (scope.winReplace) {
    add('WIN_SYS')
    addAuto('WIN_PU', '창호→우레탄폼 자동')
  }
  if (scope.winMid) add('WIN_MID')
  if (scope.winScreen) add('WIN_SCRN')

  // ── 도어 ──
  if (scope.doorReplace) add('DR_INT')
  if (scope.doorFront) add('DR_FRONT')

  // ── 도장 vs 도배 ──
  if (scope.lvPaint) {
    addAuto('PNT_PT', '수성페인트→퍼티 자동')
    addAuto('PNT_PR', '수성페인트→프라이머 자동')
    add('PNT_WB')
  } else if (scope.lvWp) {
    addAuto('WLP_UB', '도배→초배 자동')
    add('WLP_PP')
  }

  // ── 바닥재 ──
  if (scope.lvFloor) {
    const flType = grades.floorType || 'hardwood'
    if (flType === 'herringbone') {
      add('FLR_HB', '헤링본강마루')
      addAuto('MSN_SL', 'R4: 헤링본→셀프레벨링 자동')
    } else if (flType === 'wood') {
      add('FLR_OW', '원목마루')
      addAuto('FLR_OS', 'R7: 원목마루→오일스테인 자동')
    } else if (flType === 'vinyl') {
      add(grades.vinylGrade || 'VNL_20', '장판')
    } else if (flType === 'lvt') {
      add(grades.lvtGrade || 'LVT_30', 'LVT')
    } else {
      add('FLR_HW')
    }
    addAuto('FLR_SK', 'R6: 바닥재→걸레받이 자동')
  }
  if (scope.lvMold) {
    if (!selected.some(s => s.id === 'FLR_SK')) addAuto('FLR_SK', '몰딩포함')
    add('FLR_CM')
  }

  // ── 특수공정 ──
  if (scope.spEpoxy)    { add('FLR_EP'); addAuto('MSN_SL', 'R16'); addAuto('PNT_PR', 'R16') }
  if (scope.spMarble)   { add('MAR_FL'); add('MAR_WL'); addAuto('MAR_POL', 'R17') }
  if (scope.spMasonry)  { add('MAS_BLK'); addAuto('MSN_FL', 'R18') }
  if (scope.spEifs)     { add('EXT_EIFS'); addAuto('EXT_STC', 'R21') }
  if (scope.spDeck)     { add('FLR_DK'); addAuto('FLR_OS', 'R22'); addAuto('TILE_GRF', 'R22') }
  if (scope.spSnd4t)    add('SND_4T')
  if (scope.spInsBd)    add('INS_BD1')
  if (scope.spExpcon)   add('SPC_CC')
  if (scope.spMicrocem) add('SPC_MC')

  // ── 상업공간 ──
  if (scope.comSign)    add('COM_SGL')
  if (scope.comCounter) add('COM_CNT')
  if (scope.comKitchen) { add('COM_SNK'); add('COM_HD'); add('COM_GTP') }
  if (scope.comAutodr)  add('COM_ADR')
  if (scope.comFsd)     add('COM_FSD')
  if (scope.comSpr)     { add('COM_SPK'); add('COM_FDT'); add('COM_EM') }
  if (scope.comCctv)    { add('COM_CTV'); add('COM_ACS') }
  if (scope.comPos)     add('COM_POS')
  if (scope.comDuct)    add('COM_DKT')

  // ── 건축·구조 ──
  if (scope.strMasCb)     add('STR_MB')
  if (scope.strMasRb)     add('STR_RB')
  if (scope.strConcrete)  { add('STR_FW'); add('STR_CON'); add('STR_CUR') }
  if (scope.strSteel)     add('STR_STL')
  if (scope.strAlc)       add('STR_ALC')
  if (scope.strWpu)       add('STR_WPU')
  if (scope.strExtStone)  add('STR_EXT')
  if (scope.strStairTile) add('STR_HR1')
  if (scope.strStairRail) add('STR_RL_S')
  if (scope.strTerrace)   add('TER_OUT')
  if (scope.strScaffold)  add('MGT_SC')

  // ── 설비 ──
  if (pipeBad) {
    add('PLB_RG', '갈바나이즈관 교체 필수')
  } else if (scope.plbPipe) {
    add('PLB_RG')
  }
  if (scope.plbBoiler || age > 15) {
    add('PLB_BLR', age > 15 ? '노후보일러교체권장' : '')
    addAuto('PLB_HTF', 'R14: 보일러→난방배관 자동')
  }
  if (scope.plbHeat) add('PLB_HTF')
  if (hasBath) { add('PLB_SAN'); add('PLB_WF') }
  if (hasKitchen && scope.ktPlb) add('PLB_KIT')

  // ── 전기 ──
  if (scope.eleWire) {
    add('ELE_RG')
  } else if (age > 20) {
    add('ELE_RG', '노후배선교체권장')
  }
  if (scope.elePanel)    add('ELE_PNL')
  if (scope.eleOutlet)   add('ELE_OUT')
  if (scope.eleLight)    add('ELE_DL')
  if (scope.eleIndirect) add('ELE_LB')

  // ── 가구 ──
  if (hasKitchen) {
    if (scope.ktCab)  add('FUR_KIT')
    if (scope.ktTop)  add('FUR_TOP')
    if (scope.ktHood) add('FUR_HOOD')
    if (scope.ktDw)   add('FUR_DW')
    if (scope.ktOven) add('FUR_OVN')
  }
  if (scope.lvWardrobe) add('FUR_WRD')

  // ── 욕실마감 ──
  if (hasBath) { add('BAT_FIX'); add('BAT_FAU'); add('BAT_CEIL'); add('BAT_EXH'); add('BAT_DOOR'); add('BAT_JD') }

  // ── 발코니 ──
  if (scope.balExpand) add('BAL_EXP')
  if (scope.balInsul)  add('BAL_INSUL')

  // ── 준공 ──
  add('CLN_FN')

  return selected
}

// ── 자재 등급별 계수 ──
function getMatMul(id, grades, globalMul) {
  const pm = globalMul || 1.3
  if (['TILE_BT', 'TILE_BW', 'TILE_GRF', 'TILE_GRW'].includes(id))
    return { domestic: 1.0, import: 1.4, luxury: 2.0 }[grades.bt] || pm
  if (id === 'FLR_HW')
    return { hb: 1.0, wb: 1.3, wood: 2.0 }[grades.fl] || pm
  if (['WLP_PP', 'WLP_UB'].includes(id))
    return { paper: 0.8, silk: 1.2, wide: 1.6 }[grades.wp] || pm
  if (id === 'WIN_SYS')
    return { double: 1.0, triple: 1.4, loe: 1.8 }[grades.win] || pm
  if (['FUR_KIT', 'FUR_TOP'].includes(id))
    return { standard: 1.0, premium: 1.5, luxury: 2.5 }[grades.kit] || pm
  if (['DR_INT', 'DR_FRONT'].includes(id))
    return { abs: 1.0, mdf: 1.3, wood: 2.2 }[grades.dr] || pm
  if (['BAT_FIX', 'BAT_FAU'].includes(id))
    return { standard: 1.0, premium: 1.5, luxury: 2.5 }[grades.fix] || pm
  return pm
}

// ── 메인 견적 계산 (순수 함수) ──
export function calculateEstimate(state, db) {
  if (!db || Object.keys(db).length === 0) return null
  const t = getTotals(state.spaces)
  if (t.fa === 0) return { lines: [], totalSup: 0, contract: 0, final: 0, dur: 0, totals: t }

  const hoist = getHoistMul(state.floorLevel, state.hasElev)
  const region = state.region || 1.05
  const resident = state.residentDuring ? 1.10 : 1.0
  const adjMul = hoist * region * resident

  const ctx = {
    floorArea: t.fa, wallArea: t.wa, ceilingArea: t.ca, totalArea: t.fa,
    perimeter: t.pr, windowCount: t.wn, doorCount: t.dn,
    wetFloorArea: t.wetFA, wetWallArea: t.wetWA,
    dryFloorArea: t.dryFA, balArea: t.balFA,
    bathroomCount: t.bathroomCount,
    bedroomArea: t.bedroomFA,
    kitchenLen: t.kitFA > 0 ? Math.sqrt(t.kitFA) * 2 : 0,
    kitWallArea: t.kitFA * 1.5 || 0,
    newWallArea: t.wa * 0.2, indirectLen: t.pr * 0.3,
  }

  const procs = getSelectedProcesses(state, db)
  const lines = []

  procs.forEach(({ id, note, auto }) => {
    const p = db[id]; if (!p) return
    let qty = 0
    try {
      qty = new Function(...Object.keys(ctx), `return Math.max(0,${p.f})`)(...Object.values(ctx))
    } catch (e) {}
    if (qty <= 0) return
    const qw = qty * (1 + (p.wr || 0))
    const matMul = getMatMul(id, state.grades || {}, state.globalMul || 1.3)
    const sup = Math.round(qw * ((p.lb || 0) * adjMul + (p.mt || 0) * matMul))
    lines.push({ id, nm: p.nm, cat: p.cat, unit: p.unit, qty: Math.round(qty * 100) / 100, lb: p.lb, mt: p.mt, sup, auto: !!auto, note })
  })

  const totalSup = lines.reduce((s, l) => s + l.sup, 0)
  const contract = totalSup * 1.15
  const final = contract * 1.10
  const dur = Math.ceil(t.fa / 3) + 5

  return { lines, totalSup, contract, final, dur, totals: t }
}
