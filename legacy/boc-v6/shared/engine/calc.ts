import type { Space, SpaceCalc, SpaceTotals } from './types.ts'

// ─── 단일 공간 면적 계산 ──────────────────────────────────────────────────────

export function calcSpace(sp: Space): SpaceCalc {
  const w = sp.width / 1000
  const l = sp.length / 1000
  const h = (sp.height ?? 2400) / 1000

  const fa = w * l
  const ca = fa
  const rawWall = 2 * (w + l) * h
  const pr = 2 * (w + l)

  const winArea = (sp.windows ?? []).reduce(
    (s, wn) => s + (wn.w / 1000) * (wn.h / 1000),
    0,
  )
  const doorArea = (sp.doors ?? []).reduce(
    (s, d) => s + (d.w / 1000) * (d.h / 1000),
    0,
  )
  const wa = Math.max(0, rawWall - winArea - doorArea)

  return { fa, wa, ca, pr, winArea, doorArea }
}

// ─── 전체 공간 집계 ────────────────────────────────────────────────────────────

export function getTotals(spaces: Space[]): SpaceTotals {
  let fa = 0, wa = 0, ca = 0, pr = 0
  let wn = 0, dn = 0, cor = 0
  let wetFA = 0, wetWA = 0, dryFA = 0, balFA = 0
  let bedroomFA = 0, kitFA = 0
  let bathroomCount = 0

  for (const sp of spaces) {
    const c = calcSpace(sp)
    fa += c.fa
    wa += c.wa
    ca += c.ca
    pr += c.pr
    wn += sp.windows?.length ?? 0
    dn += sp.doors?.length ?? 0
    cor += sp.corners ?? 4

    if (sp.type === 'bathroom') {
      bathroomCount++
      wetFA += c.fa
      wetWA += c.wa
    } else if (sp.type === 'balcony') {
      balFA += c.fa
    } else {
      dryFA += c.fa
    }

    if (sp.type === 'bedroom') bedroomFA += c.fa
    if (sp.type === 'kitchen') kitFA += c.fa
  }

  return {
    fa, wa, ca, pr, wn, dn, cor,
    wet: bathroomCount, wetFA, wetWA, dryFA, balFA,
    bedroomFA, kitFA, bathroomCount,
  }
}

// ─── 층수·양중 계수 ────────────────────────────────────────────────────────────

export function getHoistMul(floorLevel: number, hasElev: boolean): number {
  if (hasElev) {
    if (floorLevel >= 20) return 1.25
    if (floorLevel >= 15) return 1.20
    if (floorLevel >= 10) return 1.15
    if (floorLevel >= 5)  return 1.08
    return 1.0
  } else {
    if (floorLevel >= 20) return 1.35
    if (floorLevel >= 15) return 1.30
    if (floorLevel >= 10) return 1.20
    if (floorLevel >= 5)  return 1.12
    return 1.05
  }
}
