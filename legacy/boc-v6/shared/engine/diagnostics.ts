import type { EstimateLine, SpaceTotals, EstimateState } from './types.ts'

export interface Diagnostic {
  code: string
  type: 'error' | 'warn' | 'info' | 'ok'
  message: string
}

export function runDiagnostics(
  lines: EstimateLine[],
  state: EstimateState,
  totals: SpaceTotals,
): Diagnostic[] {
  const diags: Diagnostic[] = []
  const { buildAge: age, pipeMaterial, hasAsbestos } = state

  const hasBath = totals.bathroomCount > 0
  const hasWaterproof = lines.some(l => l.category === '방수' || l.id.startsWith('WTP'))
  const hasTile = lines.some(l => l.category === '타일' || l.id.startsWith('TILE'))
  const hasGrout = lines.some(l => l.name.includes('줄눈'))
  const hasEle = lines.some(l => l.category === '전기' || l.id.startsWith('ELE'))
  const hasPanel = lines.some(l => l.id === 'ELE_PNL' || l.name.includes('분전반'))
  const hasPlb = lines.some(l => l.category === '배관' || l.id.startsWith('PLB'))
  const hasPlbRG = lines.some(l => l.id === 'PLB_RG' || l.name.includes('배관교체'))
  const hasBathroomWp = lines.some(l => l.id === 'WTP_BT')
  const hasAbatement = lines.some(l => l.id === 'ASB_RM' || l.name.includes('석면'))

  if (hasBath && !hasWaterproof)
    diags.push({ code: 'W001', type: 'warn', message: '욕실이 있으나 방수 공정이 없습니다. 누수 위험이 높습니다.' })
  if (hasTile && !hasGrout)
    diags.push({ code: 'W002', type: 'warn', message: '타일 공정에 줄눈 시공이 없습니다. 위생·내구성 저하 우려.' })
  if (age >= 30 && hasEle && !hasPanel)
    diags.push({ code: 'I001', type: 'info', message: `건물 축${age}년: 분전반 노후 가능성 — 교체 여부 확인 권장.` })
  if (hasAsbestos && !hasAbatement)
    diags.push({ code: 'E001', type: 'error', message: '석면 의심 건물인데 석면 해체·제거 공정이 없습니다. 법적 의무 공정.' })
  if (pipeMaterial === 'galvanized' && hasPlb && !hasPlbRG)
    diags.push({ code: 'W003', type: 'warn', message: '아연도금(갈바나이즈) 배관이 감지되었으나 배관교체 공정이 없습니다.' })
  if (hasBath && totals.wetFA > 0 && !hasBathroomWp)
    diags.push({ code: 'W005', type: 'warn', message: '욕실 방수 여부 확인 — 방수+벽타일 시공 권장.' })

  if (diags.length === 0)
    diags.push({ code: 'OK', type: 'ok', message: '누락 공정 없음 — 견적 정상.' })

  return diags
}
