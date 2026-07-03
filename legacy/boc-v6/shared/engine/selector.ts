import type { CostItemDB, EstimateState, SelectedProcess } from './types.ts'
import { getTotals } from './calc.ts'

export function getSelectedProcesses(
  state: EstimateState,
  db: CostItemDB,
): SelectedProcess[] {
  const { spaces, buildAge, pipeMaterial, floorLevel2, kitchenScope, scope, grades, bathroomDetails } = state
  const t = getTotals(spaces)
  if (t.fa === 0) return []

  const age = buildAge ?? 0
  const pipeBad = pipeMaterial === 'galvanized'
  const floorBad = floorLevel2 === 'poor'
  const hasBath = t.bathroomCount > 0
  const hasKitchen = t.kitFA > 0 || (kitchenScope && kitchenScope !== 'none')

  const selected: SelectedProcess[] = []
  const ids = new Set<string>()

  const add = (id: string, note = '') => {
    if (db[id] && !ids.has(id)) { selected.push({ id, note, auto: false }); ids.add(id) }
  }
  const addAuto = (id: string, note = '') => {
    if (db[id] && !ids.has(id)) { selected.push({ id, note, auto: true }); ids.add(id) }
  }

  // ── 사전공정 ──────────────────────────────────────────────────────────────
  addAuto('PRE_BY', '철거→보양 자동')
  if (t.wetFA > 0)  { add('PRE_DM_T', '욕실바닥철거'); add('PRE_DM_TW', '욕실벽철거') }
  if (t.dryFA > 0)  add('PRE_DM_F', '바닥재철거')
  add('PRE_DM_W')
  addAuto('PRE_WS', '철거→폐기물처리 자동')

  // ── 방수 (CONDITIONAL — 절대 AUTO 금지) ───────────────────────────────────
  const bathSpaces = spaces.filter(sp => sp.type === 'bathroom')
  bathSpaces.forEach((_, i) => {
    if (bathroomDetails[i]?.wp) {
      add('WTP_BT', '욕실방수 선택')
      addAuto('WTP_PM', 'R12: 욕실방수→보호몰탈 자동')
    }
  })
  if (t.balFA > 0 && scope.balWp) add('WTP_BAL', '발코니 방수 선택')

  // ── 미장 ──────────────────────────────────────────────────────────────────
  add('MSN_FL')
  if (floorBad || age > 20) addAuto('MSN_SL', '레벨불량/노후→셀프레벨링 자동')

  // ── 타일 ──────────────────────────────────────────────────────────────────
  if (t.wetFA > 0) {
    const usePorcelain = bathroomDetails.some(d => d?.tileGrade === 2)
    if (usePorcelain) {
      add('TILE_PO', '대형포세린바닥'); add('TILE_BW')
      addAuto('MSN_SL', 'R5: 대형포세린→셀프레벨링 자동')
    } else {
      add('TILE_BT'); add('TILE_BW')
    }
    addAuto('TILE_GRF', 'R3: 타일→줄눈(바닥) 자동')
    addAuto('TILE_GRW', 'R3: 타일→줄눈(벽) 자동')
  }
  if (scope.ktTile) add('TILE_KT')
  if (scope.balFloor) add('TILE_BAL')

  // ── 목공·경량 ─────────────────────────────────────────────────────────────
  if (scope.lvLgs) add('LGS_WL')
  if (t.wa > 0) { add('GYP_WL'); add('GYP_CL') }
  if (scope.lvIndirect) {
    add('GYP_ID')
    addAuto('LGS_WL', 'R19: 간접등박스→LGS틀 자동')
  }

  // ── 창호 ──────────────────────────────────────────────────────────────────
  if (scope.winReplace) { add('WIN_SYS'); addAuto('WIN_PU', '창호→우레탄폼 자동') }
  if (scope.winMid)     add('WIN_MID')
  if (scope.winScreen)  add('WIN_SCRN')

  // ── 도어 ──────────────────────────────────────────────────────────────────
  if (scope.doorReplace) add('DR_INT')
  if (scope.doorFront)   add('DR_FRONT')

  // ── 도장 vs 도배 ──────────────────────────────────────────────────────────
  if (scope.lvPaint) {
    addAuto('PNT_PT', '수성페인트→퍼티 자동')
    addAuto('PNT_PR', '수성페인트→프라이머 자동')
    add('PNT_WB')
  } else if (scope.lvWp) {
    addAuto('WLP_UB', '도배→초배 자동')
    add('WLP_PP')
  }

  // ── 바닥재 ────────────────────────────────────────────────────────────────
  if (scope.lvFloor) {
    const ft = grades.floorType ?? 'hardwood'
    if (ft === 'herringbone') {
      add('FLR_HB'); addAuto('MSN_SL', 'R4: 헤링본→셀프레벨링 자동')
    } else if (ft === 'wood') {
      add('FLR_OW'); addAuto('FLR_OS', 'R7: 원목마루→오일스테인 자동')
    } else if (ft === 'vinyl') {
      add(grades.vinylGrade ?? 'VNL_20')
    } else if (ft === 'lvt') {
      add(grades.lvtGrade ?? 'LVT_30')
    } else {
      add('FLR_HW')
    }
    addAuto('FLR_SK', 'R6: 바닥재→걸레받이 자동')
  }
  if (scope.lvMold) {
    if (!ids.has('FLR_SK')) addAuto('FLR_SK', '몰딩포함')
    add('FLR_CM')
  }

  // ── 특수공정 ──────────────────────────────────────────────────────────────
  if (scope.spEpoxy)    { add('FLR_EP'); addAuto('MSN_SL', 'R16'); addAuto('PNT_PR', 'R16') }
  if (scope.spMarble)   { add('MAR_FL'); add('MAR_WL'); addAuto('MAR_POL', 'R17') }
  if (scope.spMasonry)  { add('MAS_BLK'); addAuto('MSN_FL', 'R18') }
  if (scope.spEifs)     { add('EXT_EIFS'); addAuto('EXT_STC', 'R21') }
  if (scope.spDeck)     { add('FLR_DK'); addAuto('FLR_OS', 'R22'); addAuto('TILE_GRF', 'R22') }
  if (scope.spSnd4t)    add('SND_4T')
  if (scope.spInsBd)    add('INS_BD1')
  if (scope.spExpcon)   add('SPC_CC')
  if (scope.spMicrocem) add('SPC_MC')

  // ── 상업공간 ──────────────────────────────────────────────────────────────
  if (scope.comSign)    add('COM_SGL')
  if (scope.comCounter) add('COM_CNT')
  if (scope.comKitchen) { add('COM_SNK'); add('COM_HD'); add('COM_GTP') }
  if (scope.comAutodr)  add('COM_ADR')
  if (scope.comFsd)     add('COM_FSD')
  if (scope.comSpr)     { add('COM_SPK'); add('COM_FDT'); add('COM_EM') }
  if (scope.comCctv)    { add('COM_CTV'); add('COM_ACS') }
  if (scope.comPos)     add('COM_POS')
  if (scope.comDuct)    add('COM_DKT')

  // ── 건축·구조 ─────────────────────────────────────────────────────────────
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

  // ── 설비 ──────────────────────────────────────────────────────────────────
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

  // ── 전기 ──────────────────────────────────────────────────────────────────
  if (scope.eleWire) {
    add('ELE_RG')
  } else if (age > 20) {
    add('ELE_RG', '노후배선교체권장')
  }
  if (scope.elePanel)    add('ELE_PNL')
  if (scope.eleOutlet)   add('ELE_OUT')
  if (scope.eleLight)    add('ELE_DL')
  if (scope.eleIndirect) add('ELE_LB')

  // ── 가구 ──────────────────────────────────────────────────────────────────
  if (hasKitchen) {
    if (scope.ktCab)  add('FUR_KIT')
    if (scope.ktTop)  add('FUR_TOP')
    if (scope.ktHood) add('FUR_HOOD')
    if (scope.ktDw)   add('FUR_DW')
    if (scope.ktOven) add('FUR_OVN')
  }
  if (scope.lvWardrobe) add('FUR_WRD')

  // ── 욕실마감 ──────────────────────────────────────────────────────────────
  if (hasBath) {
    add('BAT_FIX'); add('BAT_FAU'); add('BAT_CEIL')
    add('BAT_EXH'); add('BAT_DOOR'); add('BAT_JD')
  }

  // ── 발코니 ────────────────────────────────────────────────────────────────
  if (scope.balExpand) add('BAL_EXP')
  if (scope.balInsul)  add('BAL_INSUL')

  // ── 준공 ──────────────────────────────────────────────────────────────────
  add('CLN_FN')

  return selected
}
