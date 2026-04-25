export function runDiagnostics(lines, state, totals) {
  const diags = []
  const { buildAge: age, pipeMaterial, hasAsbestos } = state

  const hasBath = totals.bathroomCount > 0
  const hasWaterproof = lines.some(l => l.cat === '방수' || (l.id && l.id.startsWith('WTP')))
  const hasTile = lines.some(l => l.cat === '타일' || (l.id && l.id.startsWith('TILE')))
  const hasGrout = lines.some(l => l.nm && l.nm.includes('줄눈'))
  const hasEle = lines.some(l => l.cat === '전기' || (l.id && l.id.startsWith('ELE')))
  const hasPanel = lines.some(l => l.id === 'ELE_RG' || (l.nm && l.nm.includes('분전반')))
  const hasPlb = lines.some(l => l.cat === '배관' || (l.id && l.id.startsWith('PLB')))
  const hasPlbRG = lines.some(l => l.id === 'PLB_RG' || (l.nm && l.nm.includes('배관교체')))
  const hasBathroomWp = lines.some(l => l.id === 'WTP_BT')
  const hasAbatement = lines.some(l => l.id === 'ASB_RM' || (l.nm && l.nm.includes('석면')))

  if (hasBath && !hasWaterproof)
    diags.push({ code: 'W001', t: 'warn', m: '욕실이 있으나 방수 공정이 없습니다. 누수 위험이 높습니다.' })
  if (hasTile && !hasGrout)
    diags.push({ code: 'W002', t: 'warn', m: '타일 공정에 줄눈 시공이 없습니다. 위생·내구성 저하 우려.' })
  if (age >= 30 && hasEle && !hasPanel)
    diags.push({ code: 'I001', t: 'info', m: `건물 축${age}년: 분전반 노후 가능성 — 교체 여부 확인 권장.` })
  if (hasAsbestos && !hasAbatement)
    diags.push({ code: 'E001', t: 'error', m: '석면 의심 건물인데 석면 해체·제거 공정이 없습니다. 법적 의무 공정.' })
  if ((pipeMaterial === 'galvanized' || pipeMaterial === 'galv') && hasPlb && !hasPlbRG)
    diags.push({ code: 'W003', t: 'warn', m: '아연도금(갈바나이즈) 배관이 감지되었으나 배관교체 공정이 없습니다.' })
  if (hasBath && totals.wetFA > 0 && !hasBathroomWp)
    diags.push({ code: 'W005', t: 'warn', m: '욕실 방수석고보드 사용 시 욕실방수+벽타일 필수 — 체크 권장.' })

  if (!diags.length) diags.push({ code: 'OK', t: 'ok', m: '누락 공정 없음 — 견적 정상.' })
  return diags
}
