const CONFIG = Object.freeze({
  VERSION: '2.0.0',
  STORAGE_KEY: 'ecorean-boc-v2',
  TABS: ['estimate','projects','presets','reports','completion','approval','dbmgr','ontology','aiengine'],
  BUILD_TYPES: [
    {id:'apt', nm:'아파트'}, {id:'officetel', nm:'오피스텔'},
    {id:'villa', nm:'빌라/다세대'}, {id:'commercial', nm:'상가/근생'},
    {id:'office', nm:'사무실'}
  ],
  SPACE_TYPES: {
    living:'거실', bedroom:'침실', bathroom:'욕실', kitchen:'주방',
    balcony:'발코니', hallway:'복도/현관', other:'기타'
  },
  GRADE_OPTS: {
    bt: [{v:'domestic',l:'국내산'},{v:'import',l:'수입산'},{v:'luxury',l:'포세린'}],
    fl: [{v:'hb',l:'헤링본'},{v:'wb',l:'강마루'},{v:'wood',l:'원목'}],
    wp: [{v:'paper',l:'합지'},{v:'silk',l:'실크'},{v:'wide',l:'광폭실크'}],
    win:[{v:'double',l:'이중창'},{v:'triple',l:'삼중창'},{v:'loe',l:'로이유리'}],
    kit:[{v:'standard',l:'표준'},{v:'premium',l:'고급'},{v:'luxury',l:'프리미엄'}],
    dr: [{v:'abs',l:'ABS'},{v:'mdf',l:'MDF'},{v:'wood',l:'목재'}],
    fix:[{v:'standard',l:'표준'},{v:'premium',l:'고급'},{v:'luxury',l:'프리미엄'}]
  },
  REGION_OPTS: [{v:1.0,l:'지방'},{v:1.03,l:'수도권'},{v:1.07,l:'서울'}]
})

/* ── CalcEngine ──────────────────────────────────────────────────────────── */
const CalcEngine = (function(){

  /* 공정 DB (compact: id, nm, cat, unit, lb=인건비, mt=자재비, wr=폐기율, dur=일, f=수량공식) */
  const DB_RAW = [
    {id:'PRE_BY',   nm:'바닥 보양',      cat:'사전공정', unit:'㎡',  lb:1200, mt:900,  wr:0.05, dur:0.5, f:'floorArea'},
    {id:'PRE_WS',   nm:'현장 정리',      cat:'사전공정', unit:'식',  lb:150000,mt:50000,wr:0,   dur:1,   f:'1'},
    {id:'PRE_DM_T', nm:'타일 철거',      cat:'사전공정', unit:'㎡',  lb:8000, mt:2000, wr:0.1,  dur:1,   f:'wetFA+kitFA'},
    {id:'PRE_DM_F', nm:'바닥재 철거',    cat:'사전공정', unit:'㎡',  lb:5000, mt:1000, wr:0.1,  dur:1,   f:'dryFA'},
    {id:'PRE_DM_W', nm:'벽지 철거',      cat:'사전공정', unit:'㎡',  lb:3000, mt:500,  wr:0.05, dur:0.5, f:'wallArea'},
    {id:'WTP_BT',   nm:'욕실 방수',      cat:'방수',     unit:'㎡',  lb:18000,mt:12000,wr:0.1,  dur:1,   f:'wetFA'},
    {id:'WTP_BAL',  nm:'발코니 방수',    cat:'방수',     unit:'㎡',  lb:15000,mt:10000,wr:0.1,  dur:1,   f:'balFA'},
    {id:'MSN_FL',   nm:'바닥 미장',      cat:'미장',     unit:'㎡',  lb:12000,mt:6000, wr:0.05, dur:1,   f:'dryFA'},
    {id:'MSN_SL',   nm:'셀프레벨링',     cat:'미장',     unit:'㎡',  lb:8000, mt:15000,wr:0.03, dur:1,   f:'dryFA'},
    {id:'TILE_BT',  nm:'욕실 타일',      cat:'타일',     unit:'㎡',  lb:35000,mt:45000,wr:0.1,  dur:2,   f:'wetFA+wetWA'},
    {id:'TILE_GRF', nm:'줄눈 시공',      cat:'타일',     unit:'㎡',  lb:8000, mt:5000, wr:0.05, dur:0.5, f:'wetFA+wetWA+kitFA'},
    {id:'TILE_KT',  nm:'주방 타일',      cat:'타일',     unit:'㎡',  lb:30000,mt:35000,wr:0.1,  dur:1,   f:'kitWA'},
    {id:'FLR_HW',   nm:'원목마루',       cat:'바닥재',   unit:'㎡',  lb:25000,mt:80000,wr:0.1,  dur:2,   f:'dryFA'},
    {id:'FLR_WB',   nm:'강마루',         cat:'바닥재',   unit:'㎡',  lb:15000,mt:40000,wr:0.08, dur:1,   f:'dryFA'},
    {id:'FLR_VNL',  nm:'비닐타일(LVT)',  cat:'바닥재',   unit:'㎡',  lb:10000,mt:25000,wr:0.08, dur:1,   f:'dryFA'},
    {id:'FLR_HB',   nm:'헤링본마루',     cat:'바닥재',   unit:'㎡',  lb:40000,mt:90000,wr:0.15, dur:3,   f:'dryFA'},
    {id:'WLP_SILK', nm:'실크 도배',      cat:'도배',     unit:'㎡',  lb:6000, mt:8000, wr:0.15, dur:1,   f:'wallArea+ceilingArea'},
    {id:'WLP_WIDE', nm:'광폭실크 도배',  cat:'도배',     unit:'㎡',  lb:7000, mt:12000,wr:0.1,  dur:1,   f:'wallArea+ceilingArea'},
    {id:'WLP_PAPER',nm:'합지 도배',      cat:'도배',     unit:'㎡',  lb:4000, mt:4000, wr:0.15, dur:1,   f:'wallArea+ceilingArea'},
    {id:'PLT_WS',   nm:'수성페인트',     cat:'도장',     unit:'㎡',  lb:5000, mt:4000, wr:0.1,  dur:1,   f:'wallArea+ceilingArea'},
    {id:'WIN_SYS',  nm:'창호 교체',      cat:'창호',     unit:'창',  lb:80000,mt:350000,wr:0,   dur:0.5, f:'windowCount'},
    {id:'DR_FRONT', nm:'현관문 교체',    cat:'도어',     unit:'짝',  lb:100000,mt:600000,wr:0,  dur:1,   f:'1'},
    {id:'DR_ROOM',  nm:'방문 교체',      cat:'도어',     unit:'짝',  lb:60000,mt:150000,wr:0,   dur:0.3, f:'doorCount'},
    {id:'PLB_PIPE', nm:'배관 교체',      cat:'설비',     unit:'식',  lb:800000,mt:400000,wr:0,  dur:3,   f:'1'},
    {id:'PLB_BOIL', nm:'보일러 교체',    cat:'설비',     unit:'식',  lb:150000,mt:1500000,wr:0, dur:1,   f:'1'},
    {id:'PLB_HEAT', nm:'난방코일 교체',  cat:'설비',     unit:'㎡',  lb:15000,mt:20000, wr:0.05,dur:1,   f:'dryFA'},
    {id:'ELE_WIRE', nm:'전기 배선',      cat:'전기',     unit:'식',  lb:600000,mt:300000,wr:0,  dur:3,   f:'1'},
    {id:'ELE_PANEL',nm:'분전함 교체',    cat:'전기',     unit:'식',  lb:80000,mt:200000, wr:0,  dur:0.5, f:'1'},
    {id:'ELE_OUT',  nm:'콘센트·스위치',  cat:'전기',     unit:'개',  lb:15000,mt:12000, wr:0,   dur:0.1, f:'floorArea*0.3'},
    {id:'ELE_LIGHT',nm:'조명 교체',      cat:'전기',     unit:'개',  lb:20000,mt:30000, wr:0,   dur:0.2, f:'floorArea*0.15'},
    {id:'FUR_KIT',  nm:'주방가구',       cat:'가구',     unit:'m',   lb:120000,mt:500000,wr:0,  dur:2,   f:'kitchenLen'},
    {id:'FUR_TOP',  nm:'주방 상판',      cat:'가구',     unit:'m',   lb:50000,mt:200000, wr:0,  dur:0.5, f:'kitchenLen'},
    {id:'FUR_WARD', nm:'붙박이장',       cat:'가구',     unit:'m',   lb:80000,mt:300000, wr:0,  dur:1,   f:'bedroomArea*0.5'},
    {id:'BAT_FIX',  nm:'욕실 위생도기',  cat:'욕실마감', unit:'식',  lb:120000,mt:400000,wr:0,  dur:1,   f:'bathroomCount'},
    {id:'BAT_FAU',  nm:'욕실 수전',      cat:'욕실마감', unit:'식',  lb:40000,mt:150000, wr:0,  dur:0.5, f:'bathroomCount'},
    {id:'FIN_MOL',  nm:'몰딩·걸레받이',  cat:'마감',     unit:'m',   lb:5000, mt:8000,  wr:0.1, dur:0.5, f:'perimeter'},
    {id:'IND_CEIL', nm:'간접등 박스',    cat:'마감',     unit:'m',   lb:25000,mt:15000, wr:0.05,dur:1,   f:'indirectLen'},
    {id:'BAL_EXP',  nm:'발코니 확장',    cat:'발코니',   unit:'㎡',  lb:80000,mt:50000, wr:0.1, dur:2,   f:'balFA'},
    {id:'BAL_INSUL',nm:'발코니 단열',    cat:'발코니',   unit:'㎡',  lb:20000,mt:25000, wr:0.05,dur:1,   f:'balFA'},
    {id:'DEMO_CERT',nm:'폐기물 처리',    cat:'준공',     unit:'㎡',  lb:3000, mt:5000,  wr:0,   dur:0.5, f:'floorArea'},
    {id:'CLEAN_FIN',nm:'준공 청소',      cat:'준공',     unit:'㎡',  lb:4000, mt:1000,  wr:0,   dur:0.5, f:'floorArea'},
    {id:'BAL_WP',   nm:'발코니 도배',    cat:'발코니',   unit:'㎡',  lb:5000, mt:7000,  wr:0.15,dur:0.5, f:'balFA*2'},
    {id:'BAL_FL',   nm:'발코니 바닥재',  cat:'발코니',   unit:'㎡',  lb:8000, mt:15000, wr:0.08,dur:0.5, f:'balFA'},
    {id:'ELE_IND',  nm:'간접조명',       cat:'전기',     unit:'m',   lb:15000,mt:20000, wr:0.05,dur:0.5, f:'indirectLen'},
    {id:'LV_SMART', nm:'스마트홈 IoT',   cat:'전기',     unit:'식',  lb:200000,mt:500000,wr:0,  dur:1,   f:'1'},
    {id:'STR_WPU',  nm:'구조 방수(옥상)',cat:'구조',     unit:'㎡',  lb:25000,mt:30000, wr:0.05,dur:2,   f:'floorArea*0.3'},
    {id:'ASB_RM',   nm:'석면 제거',      cat:'철거',     unit:'㎡',  lb:80000,mt:50000, wr:0,   dur:2,   f:'ceilingArea'},
    {id:'FLR_EPX',  nm:'에폭시 코팅',    cat:'바닥재',   unit:'㎡',  lb:8000, mt:12000, wr:0.05,dur:1,   f:'dryFA'},
  ]

  /* DB를 id로 인덱싱 */
  const DB = {}
  for (const item of DB_RAW) DB[item.id] = item

  /* ── 공간 계산 ──────────────────────────────────────────────────────────── */
  function calcSpace(sp) {
    const w = sp.width  / 1000
    const l = sp.length / 1000
    const h = (sp.height || 2400) / 1000
    const fa = w * l
    const ca = fa
    const rawWall = 2 * (w + l) * h
    const pr = 2 * (w + l)
    const wn  = sp.windows || 0
    const dn  = sp.doors   || 0
    const winArea  = wn * 1.2   // 창문 1개 평균 1.2㎡
    const doorArea = dn * 1.89  // 문 1개 평균 0.9×2.1
    const wa = Math.max(0, rawWall - winArea - doorArea)
    return { fa, wa, ca, pr, winArea, doorArea, wn, dn }
  }

  /* ── 공간 합계 ──────────────────────────────────────────────────────────── */
  function getTotals(spaces) {
    const T = {fa:0,wa:0,ca:0,pr:0,wn:0,dn:0,
               wet:0,wetFA:0,wetWA:0,dryFA:0,balFA:0,
               bedroomFA:0,kitFA:0,bathroomCount:0}
    for (const sp of spaces) {
      const c = calcSpace(sp)
      T.fa += c.fa; T.wa += c.wa; T.ca += c.ca; T.pr += c.pr
      T.wn += c.wn; T.dn += c.dn
      if (sp.type === 'bathroom') { T.wet++; T.wetFA += c.fa; T.wetWA += c.wa; T.bathroomCount++ }
      else if (sp.type === 'balcony') T.balFA += c.fa
      else if (sp.type === 'bedroom') T.bedroomFA += c.fa
      else if (sp.type === 'kitchen') T.kitFA += c.fa
      else T.dryFA += c.fa
    }
    return T
  }

  /* ── 양중 할증 ──────────────────────────────────────────────────────────── */
  function getHoistMul(fl, elev) {
    if (elev) {
      if (fl >= 20) return 1.25; if (fl >= 15) return 1.20
      if (fl >= 10) return 1.15; if (fl >= 5)  return 1.08
      return 1.0
    } else {
      if (fl >= 20) return 1.35; if (fl >= 15) return 1.30
      if (fl >= 10) return 1.20; if (fl >= 5)  return 1.12
      return 1.05
    }
  }

  /* ── 수량 공식 평가 ─────────────────────────────────────────────────────── */
  const SAFE_RE = /^[a-zA-Z0-9+\-*\/.()\s]+$/
  function evalFormula(formula, ctx) {
    if (!SAFE_RE.test(formula)) return 0
    let expr = formula
    const keys = Object.keys(ctx).sort((a,b) => b.length - a.length)
    for (const k of keys) expr = expr.replace(new RegExp('\b' + k + '\b', 'g'), String(ctx[k]))
    try { return Math.max(0, Function('"use strict"; return (' + expr + ')')()) } catch { return 0 }
  }

  /* ── 자재 할증 배율 ─────────────────────────────────────────────────────── */
  const MAT_MUL = {
    bt:  {domestic:1.0, import:1.3, luxury:1.8},
    fl:  {hb:1.8, wb:1.0, wood:2.2},
    wp:  {paper:0.7, silk:1.0, wide:1.4},
    win: {double:1.0, triple:1.3, loe:1.5},
    kit: {standard:0.8, premium:1.0, luxury:1.5},
    dr:  {abs:0.8, mdf:1.0, wood:1.4},
    fix: {standard:0.8, premium:1.0, luxury:1.5}
  }
  function getMatMul(id, grades, globalMul) {
    if (id.startsWith('TILE_BT') || id.startsWith('BAT_FIX') || id.startsWith('BAT_FAU'))
      return MAT_MUL.bt[grades.bt] || 1.0
    if (id.startsWith('FLR_')) return MAT_MUL.fl[grades.fl] || 1.0
    if (id.startsWith('WLP_')) return MAT_MUL.wp[grades.wp] || 1.0
    if (id.startsWith('WIN_')) return MAT_MUL.win[grades.win] || 1.0
    if (id.startsWith('FUR_KIT') || id.startsWith('FUR_TOP')) return MAT_MUL.kit[grades.kit] || 1.0
    if (id.startsWith('DR_'))  return MAT_MUL.dr[grades.dr]  || 1.0
    return globalMul
  }

  /* ── 선택 공정 목록 결정 ────────────────────────────────────────────────── */
  function getSelectedProcesses(state) {
    const sc = state.scope || {}
    const procs = []
    const added = new Set()
    function add(id, auto=false, note='') {
      if (!DB[id] || added.has(id)) return
      added.add(id); procs.push({id, auto, note})
    }

    // 사전공정 (항상)
    add('PRE_BY'); add('PRE_WS')
    if (state.spaces && state.spaces.some(s => s.type === 'bathroom')) add('PRE_DM_T')
    if (sc.lvFloor) add('PRE_DM_F')
    if (sc.lvWp || sc.lvPaint) add('PRE_DM_W')

    // 방수 (욕실 있을 때만, 절대 AUTO 아님)
    if (sc.btWtp && state.spaces && state.spaces.some(s => s.type === 'bathroom')) add('WTP_BT')
    if (sc.balWp) add('WTP_BAL')

    // 미장
    if (sc.plbPipe || (state.buildAge >= 20)) add('MSN_FL', true, '배관/노후 건물 필수')
    if (state.floorLevel2 === 'poor') add('MSN_SL', true, '바닥 불량')

    // 타일
    if (sc.btTile) add('TILE_BT')
    if (sc.ktTile) add('TILE_KT')
    if ((sc.btTile || sc.ktTile) && !added.has('TILE_GRF')) add('TILE_GRF', true, '타일→줄눈 자동')

    // 바닥재
    const fl = state.grades && state.grades.fl
    if (sc.lvFloor) {
      if (fl === 'hb')   add('FLR_HB')
      else if (fl === 'wood') add('FLR_HW')
      else               add('FLR_WB')
    }
    if (sc.spEpoxy) add('FLR_EPX')

    // 도배/도장
    if (sc.lvWp) {
      const wp = state.grades && state.grades.wp
      if (wp === 'paper') add('WLP_PAPER')
      else if (wp === 'wide') add('WLP_WIDE')
      else add('WLP_SILK')
    }
    if (sc.lvPaint) add('PLT_WS')

    // 창호/도어
    if (sc.winReplace) add('WIN_SYS')
    if (sc.doorFront)  add('DR_FRONT')
    if (sc.doorReplace) add('DR_ROOM')
    if ((sc.winReplace || sc.doorReplace) && sc.lvWp) add('FIN_MOL', true, '창호·도배 후 몰딩')

    // 설비
    if (sc.plbPipe)   add('PLB_PIPE')
    if (sc.plbBoiler) add('PLB_BOIL')
    if (sc.plbHeat || sc.plbPipe) add('PLB_HEAT', sc.plbPipe, '배관교체→코일교체')

    // 전기
    if (sc.eleWire)  add('ELE_WIRE')
    if (sc.elePanel) add('ELE_PANEL')
    if (sc.eleOutlet) add('ELE_OUT')
    if (sc.eleLight)  add('ELE_LIGHT')
    if (sc.eleIndirect) { add('IND_CEIL'); add('ELE_IND', true, '간접등→조명') }
    if (sc.lvSmart) add('LV_SMART')

    // 주방
    if (sc.ktCab)  add('FUR_KIT')
    if (sc.ktTop)  add('FUR_TOP')
    if (sc.ktCab && !added.has('FUR_TOP')) add('FUR_TOP', true, '주방가구→상판')
    if (sc.ktPlb)  add('BAT_FAU')  // 주방수전

    // 욕실마감
    if (sc.btFix)  add('BAT_FIX')
    if (sc.btFau || sc.btFix) add('BAT_FAU', sc.btFix, '위생도기→수전')

    // 붙박이장
    if (sc.lvWardrobe) add('FUR_WARD')

    // 발코니
    if (sc.balExpand) { add('BAL_EXP'); add('BAL_INSUL', true, '발코니확장→단열필수'); add('MSN_FL', true, '발코니확장→미장') }
    if (sc.balFloor) add('BAL_FL')
    if (sc.balWp && sc.lvWp) add('BAL_WP', true, '발코니도배')

    // 석면
    if (state.hasAsbestos) add('ASB_RM')

    // 구조
    if (sc.strWpu) add('STR_WPU')

    // 준공
    add('DEMO_CERT', true, '준공필수'); add('CLEAN_FIN', true, '준공필수')

    return procs
  }

  /* ── 전체 견적 계산 ─────────────────────────────────────────────────────── */
  function calculateEstimate(state) {
    if (!state.spaces || state.spaces.length === 0) return null
    const totals = getTotals(state.spaces)
    const hoist  = getHoistMul(state.floorLevel || 1, !!state.hasElev)
    const region = state.region  || 1.0
    const resid  = state.residentDuring ? 1.10 : 1.0
    const adjMul = hoist * region * resid
    const grades = state.grades  || {}
    const globalMul = state.globalMul || 1.0

    const ctx = {
      floorArea:    totals.fa,
      wallArea:     totals.wa,
      ceilingArea:  totals.ca,
      perimeter:    totals.pr,
      windowCount:  totals.wn,
      doorCount:    totals.dn,
      wetFA:        totals.wetFA,
      wetWA:        totals.wetWA,
      kitWA:        (totals.kitFA > 0 ? Math.sqrt(totals.kitFA) * 2 * 2.4 : 0),
      dryFA:        totals.dryFA,
      balFA:        totals.balFA,
      bathroomCount:totals.bathroomCount,
      bedroomArea:  totals.bedroomFA,
      kitFA:        totals.kitFA,
      kitchenLen:   totals.kitFA > 0 ? Math.sqrt(totals.kitFA) * 2 : 0,
      indirectLen:  totals.pr * 0.3,
    }

    const procs = getSelectedProcesses(state)
    const lines = []
    let totalSupply = 0
    let duration = 0

    for (const {id, auto, note} of procs) {
      const p = DB[id]; if (!p) continue
      const qty = Math.max(0, evalFormula(p.f, ctx))
      if (qty === 0 && p.unit !== '식') continue
      const matMul = getMatMul(id, grades, globalMul)
      const laborTotal   = p.lb * adjMul
      const materialTotal = p.mt * matMul
      const supplyPrice  = Math.round(qty * (1 + p.wr) * (laborTotal + materialTotal))
      totalSupply += supplyPrice
      duration   += p.dur * (qty > 0 ? 1 : 0)
      lines.push({
        id, name: p.nm, category: p.cat, unit: p.unit,
        qty: Math.round(qty * 10) / 10,
        laborCost: Math.round(laborTotal),
        materialCost: Math.round(materialTotal),
        supplyPrice, auto, note
      })
    }

    const contractAmount = Math.round(totalSupply * 1.15)
    const finalAmount    = Math.round(contractAmount * 1.10)
    return { lines, totalSupply, contractAmount, finalAmount, duration: Math.round(duration), totals }
  }

  /* ── 단위 테스트 ─────────────────────────────────────────────────────────── */
  function runTests() {
    let pass = 0, fail = 0
    function assert(name, cond) {
      if (cond) { pass++; console.log('[CalcEngine] ✓', name) }
      else       { fail++; console.error('[CalcEngine] ✗', name) }
    }

    // calcSpace
    const cs = calcSpace({id:'t', type:'living', width:4000, length:3000, height:2400, windows:1, doors:1})
    assert('calcSpace: floor area 12㎡', Math.abs(cs.fa - 12) < 0.01)
    assert('calcSpace: ceiling area 12㎡', Math.abs(cs.ca - 12) < 0.01)
    assert('calcSpace: wall positive', cs.wa > 0)

    // getTotals
    const spaces = [
      {id:'s1', type:'bathroom', width:1500, length:2000, height:2400, windows:0, doors:1},
      {id:'s2', type:'living',   width:5000, length:4000, height:2400, windows:2, doors:1},
    ]
    const t = getTotals(spaces)
    assert('getTotals: bathroomCount 1', t.bathroomCount === 1)
    assert('getTotals: wetFA ~3', Math.abs(t.wetFA - 3) < 0.01)
    assert('getTotals: fa total', Math.abs(t.fa - 23) < 0.01)

    // getHoistMul
    assert('hoistMul: fl1 noElev → 1.05', getHoistMul(1, false) === 1.05)
    assert('hoistMul: fl5 elev   → 1.08', getHoistMul(5, true)  === 1.08)
    assert('hoistMul: fl10 elev  → 1.15', getHoistMul(10, true) === 1.15)
    assert('hoistMul: fl20 noElev→ 1.35', getHoistMul(20, false)=== 1.35)

    // evalFormula
    const ctx = {floorArea:20, wallArea:50, bathroomCount:2}
    assert('evalFormula: variable', Math.abs(evalFormula('floorArea', ctx) - 20) < 0.01)
    assert('evalFormula: expr', Math.abs(evalFormula('floorArea*2', ctx) - 40) < 0.01)
    assert('evalFormula: injection blocked', evalFormula('alert(1)', ctx) === 0)
    assert('evalFormula: multivar', Math.abs(evalFormula('floorArea+wallArea', ctx) - 70) < 0.01)

    // calculateEstimate: null when no spaces
    const r0 = calculateEstimate({spaces:[]})
    assert('calcEstimate: null when no spaces', r0 === null)

    // calculateEstimate: valid result
    const state = {
      spaces, floorLevel:3, hasElev:true, region:1.0, residentDuring:false,
      globalMul:1.0, buildAge:5, floorLevel2:'good', hasAsbestos:false,
      grades:{bt:'domestic',fl:'wb',wp:'silk',win:'double',kit:'standard',dr:'abs',fix:'standard'},
      scope:{lvFloor:true, lvWp:true, btWtp:true, btTile:true, btFix:true}
    }
    const r1 = calculateEstimate(state)
    assert('calcEstimate: returns result', r1 !== null)
    assert('calcEstimate: contractAmount = totalSupply*1.15', r1 && Math.abs(r1.contractAmount - r1.totalSupply*1.15) < 1)
    assert('calcEstimate: finalAmount = contract*1.10', r1 && Math.abs(r1.finalAmount - r1.contractAmount*1.10) < 1)
    assert('calcEstimate: has lines', r1 && r1.lines.length > 0)

    console.log('[CalcEngine] Tests:', pass, 'pass,', fail, 'fail')
    return fail === 0
  }

  return { calcSpace, getTotals, getHoistMul, evalFormula, calculateEstimate, getSelectedProcesses, DB, runTests }
})()


/* ── OntologyEngine ────────────────────────────────────────────────────────── */
const OntologyEngine = (function(){

  const RULES = [
    {id:'R01', trigger:'WTP_BT',   action:'TILE_BT',   type:'AUTO_INCLUDE',     note:'욕실방수→타일 시공 필수'},
    {id:'R02', trigger:'TILE_BT',  action:'TILE_GRF',  type:'AUTO_INCLUDE',     note:'욕실타일→줄눈 필수'},
    {id:'R03', trigger:'TILE_KT',  action:'TILE_GRF',  type:'AUTO_INCLUDE',     note:'주방타일→줄눈 필수'},
    {id:'R04', trigger:'FLR_HW',   action:'PRE_BY',    type:'AUTO_INCLUDE',     note:'원목마루→보양 필수'},
    {id:'R05', trigger:'FLR_WB',   action:'PRE_BY',    type:'AUTO_INCLUDE',     note:'강마루→보양 필수'},
    {id:'R06', trigger:'FLR_HB',   action:'PRE_BY',    type:'AUTO_INCLUDE',     note:'헤링본→보양 필수'},
    {id:'R07', trigger:'PLB_PIPE', action:'MSN_FL',    type:'AUTO_INCLUDE',     note:'배관교체→바닥미장 필수'},
    {id:'R08', trigger:'PLB_BOIL', action:'PLB_HEAT',  type:'AUTO_INCLUDE',     note:'보일러교체→난방코일 점검'},
    {id:'R09', trigger:'WIN_SYS',  action:'FIN_MOL',   type:'AUTO_INCLUDE',     note:'창호교체→몰딩 필수'},
    {id:'R10', trigger:'FUR_KIT',  action:'FUR_TOP',   type:'AUTO_INCLUDE',     note:'주방가구→상판 필수'},
    {id:'R11', trigger:'FUR_KIT',  action:'ELE_OUT',   type:'AUTO_INCLUDE',     note:'주방가구→콘센트 추가'},
    {id:'R12', trigger:'BAL_EXP',  action:'BAL_INSUL', type:'AUTO_INCLUDE',     note:'발코니확장→단열 법적 필수'},
    {id:'R13', trigger:'BAL_EXP',  action:'MSN_FL',    type:'AUTO_INCLUDE',     note:'발코니확장→바닥미장'},
    {id:'R14', trigger:'ELE_WIRE', action:'ELE_PANEL', type:'WARN_CONDITIONAL', note:'전기배선→분전함 용량 확인'},
    {id:'R15', trigger:'ELE_LIGHT',action:'ELE_OUT',   type:'AUTO_INCLUDE',     note:'조명→콘센트 연동'},
    {id:'R16', trigger:'WTP_BT',   action:'BAT_FIX',   type:'AUTO_INCLUDE',     note:'욕실방수→위생도기 교체 권장'},
    {id:'R17', trigger:'BAT_FIX',  action:'BAT_FAU',   type:'AUTO_INCLUDE',     note:'위생도기→수전 세트 교체'},
    {id:'R18', trigger:'FLR_HW',   action:'FIN_MOL',   type:'AUTO_INCLUDE',     note:'원목마루→걸레받이 필수'},
    {id:'R19', trigger:'WLP_SILK', action:'FIN_MOL',   type:'AUTO_INCLUDE',     note:'도배→몰딩 마감'},
    {id:'R20', trigger:'PLT_WS',   action:'FIN_MOL',   type:'AUTO_INCLUDE',     note:'페인트→몰딩 마감'},
    {id:'R21', trigger:'PRE_DM_T', action:'WTP_BT',    type:'WARN_CONDITIONAL', note:'타일철거→방수 재시공 확인'},
    {id:'R22', trigger:'PRE_DM_W', action:'WLP_SILK',  type:'WARN_CONDITIONAL', note:'벽철거→도배 확인'},
    {id:'R23', trigger:'MSN_SL',   action:'FLR_HW',    type:'AUTO_INCLUDE',     note:'셀프레벨링→원목마루 적합'},
    {id:'R24', trigger:'IND_CEIL', action:'ELE_LIGHT', type:'AUTO_INCLUDE',     note:'간접등박스→조명기구 필수'},
    {id:'R25', trigger:'CLEAN_FIN',action:'DEMO_CERT', type:'AUTO_INCLUDE',     note:'준공청소→폐기물처리 선행'},
    {id:'R26', trigger:'ASB_RM',   action:'PRE_WS',    type:'AUTO_INCLUDE',     note:'석면제거→현장정리 필수'},
  ]

  function applyOntology(selectedIds, rules, ctx) {
    const selected = new Set(selectedIds)
    const autoAdded = []
    const warnings  = []
    const ruleList  = rules || RULES

    for (const rule of ruleList) {
      if (!selected.has(rule.trigger)) continue
      if (rule.type === 'AUTO_INCLUDE' || rule.type === 'FORCED') {
        if (!selected.has(rule.action)) {
          autoAdded.push({id: rule.action, note: rule.note, ruleId: rule.id})
          selected.add(rule.action)
        }
      } else if (rule.type === 'WARN_CONDITIONAL') {
        if (!selected.has(rule.action)) {
          warnings.push({ruleId: rule.id, message: rule.note, trigger: rule.trigger, action: rule.action})
        }
      }
    }
    return { autoAdded, warnings }
  }

  function runTests() {
    let pass = 0, fail = 0
    function assert(name, cond) {
      if (cond) { pass++; console.log('[OntologyEngine] ✓', name) }
      else       { fail++; console.error('[OntologyEngine] ✗', name) }
    }

    // AUTO_INCLUDE: trigger present → action auto-added
    const r1 = applyOntology(['TILE_BT'], RULES, {})
    assert('TILE_BT→TILE_GRF auto', r1.autoAdded.some(a => a.id === 'TILE_GRF'))

    // No trigger → no auto-add
    const r2 = applyOntology([], RULES, {})
    assert('empty → no auto-add', r2.autoAdded.length === 0)
    assert('empty → no warnings', r2.warnings.length  === 0)

    // Already present → no duplicate
    const r3 = applyOntology(['TILE_BT', 'TILE_GRF'], RULES, {})
    assert('already present → no duplicate', r3.autoAdded.filter(a => a.id === 'TILE_GRF').length === 0)

    // WARN_CONDITIONAL: generates warning not auto-add
    const r4 = applyOntology(['ELE_WIRE'], RULES, {})
    const R14 = RULES.find(r => r.id === 'R14')
    if (R14 && R14.type === 'WARN_CONDITIONAL') {
      assert('ELE_WIRE→ELE_PANEL is warning', r4.warnings.some(w => w.action === 'ELE_PANEL'))
      assert('ELE_WIRE→ELE_PANEL not auto-added', !r4.autoAdded.some(a => a.id === 'ELE_PANEL'))
    }

    // Chain: WTP_BT → TILE_BT → TILE_GRF (chain resolves)
    const r5 = applyOntology(['WTP_BT'], RULES, {})
    assert('WTP_BT chain→TILE_BT', r5.autoAdded.some(a => a.id === 'TILE_BT'))
    assert('WTP_BT chain→BAT_FIX', r5.autoAdded.some(a => a.id === 'BAT_FIX'))

    // BAL_EXP → BAL_INSUL
    const r6 = applyOntology(['BAL_EXP'], RULES, {})
    assert('BAL_EXP→BAL_INSUL auto', r6.autoAdded.some(a => a.id === 'BAL_INSUL'))

    // FLR_HW → PRE_BY + FIN_MOL
    const r7 = applyOntology(['FLR_HW'], RULES, {})
    assert('FLR_HW→PRE_BY auto', r7.autoAdded.some(a => a.id === 'PRE_BY'))
    assert('FLR_HW→FIN_MOL auto', r7.autoAdded.some(a => a.id === 'FIN_MOL'))

    // 26 rules exist
    assert('26 ontology rules defined', RULES.length === 26)

    console.log('[OntologyEngine] Tests:', pass, 'pass,', fail, 'fail')
    return fail === 0
  }

  return { applyOntology, RULES, runTests }
})()

/* ── DiagEngine ──────────────────────────────────────────────────────────── */
const DiagEngine = (function(){

  function runDiagnostics(lines, state, totals) {
    const diags = []
    const lineIds = new Set(lines.map(l => l.id))
    const cats    = new Set(lines.map(l => l.category))

    // OK baseline
    if (lines.length === 0) {
      diags.push({type:'info', code:'I000', message:'공정이 선택되지 않았습니다.'})
      return diags
    }

    // W001: 욕실 있는데 방수 없음
    if (totals.bathroomCount > 0 && !lineIds.has('WTP_BT')) {
      diags.push({type:'warn', code:'W001', message:'욕실이 있으나 방수 공정이 없습니다. 누수 위험이 있습니다.'})
    }

    // W002: 타일 있는데 줄눈 없음
    if (cats.has('타일') && !lineIds.has('TILE_GRF')) {
      diags.push({type:'warn', code:'W002', message:'타일 공정이 있으나 줄눈 시공이 없습니다.'})
    }

    // E001: 석면 의심인데 제거 없음
    if (state.hasAsbestos && !lineIds.has('ASB_RM')) {
      diags.push({type:'error', code:'E001', message:'석면 의심 건물인데 석면 제거 공정이 없습니다. 법적 의무 공정입니다.'})
    }

    // W003: 갈바나이즈 배관 경고
    if (state.pipeMaterial === 'galvanized' && !lineIds.has('PLB_PIPE')) {
      diags.push({type:'warn', code:'W003', message:'갈바나이즈 배관은 교체를 권장합니다. (녹물 위험)'})
    }

    // I001: 노후 건물 + 전기 공사
    if (state.buildAge >= 30 && lineIds.has('ELE_WIRE')) {
      diags.push({type:'info', code:'I001', message:'30년 이상 건물의 전기배선 교체 시 분전함 용량도 확인하세요.'})
    }

    // W005: 욕실 방수 후 타일 확인
    if (lineIds.has('WTP_BT') && !lineIds.has('TILE_BT')) {
      diags.push({type:'warn', code:'W005', message:'욕실 방수 후 타일 시공이 없습니다.'})
    }

    if (diags.length === 0) {
      diags.push({type:'ok', code:'OK', message:'진단 이상 없음. 모든 공정이 적절히 구성되었습니다.'})
    }
    return diags
  }

  return { runDiagnostics }
})()

// === 엔진 테스트 실행 ===
const cr = CalcEngine.runTests()
const or2 = OntologyEngine.runTests()
console.log('
=== 결과 ===')
console.log('CalcEngine:', cr ? 'PASS ✓' : 'FAIL ✗')
console.log('OntologyEngine:', or2 ? 'PASS ✓' : 'FAIL ✗')
