import { describe, it, expect } from 'vitest'
import { calcSpace, getTotals, getHoistMul } from '../calc.ts'
import type { Space } from '../types.ts'

// ─── calcSpace ───────────────────────────────────────────────────────────────

describe('calcSpace', () => {
  it('단순 사각형 공간의 면적을 계산한다', () => {
    const sp: Space = {
      id: '1', name: '거실', type: 'living',
      width: 5000, length: 4000,
    }
    const r = calcSpace(sp)
    expect(r.fa).toBeCloseTo(20.0)    // 5m × 4m = 20㎡
    expect(r.ca).toBeCloseTo(20.0)    // 천장 = 바닥
    expect(r.pr).toBeCloseTo(18.0)    // 2×(5+4) = 18m
  })

  it('기본 높이 2400mm를 사용한다', () => {
    const sp: Space = { id: '1', name: '방', type: 'bedroom', width: 3000, length: 3000 }
    const r = calcSpace(sp)
    // 벽면적: 2×(3+3)×2.4 = 28.8㎡, 개구부 없음
    expect(r.wa).toBeCloseTo(28.8)
  })

  it('커스텀 높이를 사용한다', () => {
    const sp: Space = { id: '1', name: '방', type: 'bedroom', width: 3000, length: 3000, height: 3000 }
    const r = calcSpace(sp)
    expect(r.wa).toBeCloseTo(36.0)  // 2×(3+3)×3 = 36㎡
  })

  it('창문 면적을 벽면적에서 차감한다', () => {
    const sp: Space = {
      id: '1', name: '방', type: 'bedroom',
      width: 3000, length: 3000, height: 2400,
      windows: [{ w: 1200, h: 1200 }],
    }
    const r = calcSpace(sp)
    expect(r.winArea).toBeCloseTo(1.44)   // 1.2×1.2
    expect(r.wa).toBeCloseTo(28.8 - 1.44)
  })

  it('문 면적을 벽면적에서 차감한다', () => {
    const sp: Space = {
      id: '1', name: '방', type: 'bedroom',
      width: 3000, length: 3000, height: 2400,
      doors: [{ w: 900, h: 2100 }],
    }
    const r = calcSpace(sp)
    expect(r.doorArea).toBeCloseTo(1.89)  // 0.9×2.1
    expect(r.wa).toBeCloseTo(28.8 - 1.89)
  })

  it('여러 창문과 문을 모두 차감한다', () => {
    const sp: Space = {
      id: '1', name: '거실', type: 'living',
      width: 5000, length: 4000, height: 2400,
      windows: [{ w: 1500, h: 1200 }, { w: 1000, h: 1000 }],
      doors: [{ w: 900, h: 2100 }],
    }
    const r = calcSpace(sp)
    const rawWall = 2 * (5 + 4) * 2.4  // 43.2
    const winTotal = 1.5 * 1.2 + 1.0 * 1.0  // 1.8 + 1.0 = 2.8
    const doorTotal = 0.9 * 2.1  // 1.89
    expect(r.wa).toBeCloseTo(rawWall - winTotal - doorTotal, 1)
  })

  it('벽면적이 0 미만이 되지 않는다', () => {
    const sp: Space = {
      id: '1', name: '방', type: 'bedroom',
      width: 1000, length: 1000, height: 2400,
      windows: [{ w: 5000, h: 5000 }],  // 개구부가 벽보다 큰 극단 케이스
    }
    const r = calcSpace(sp)
    expect(r.wa).toBeGreaterThanOrEqual(0)
  })
})

// ─── getTotals ───────────────────────────────────────────────────────────────

describe('getTotals', () => {
  it('빈 배열에서 0을 반환한다', () => {
    const t = getTotals([])
    expect(t.fa).toBe(0)
    expect(t.wa).toBe(0)
    expect(t.bathroomCount).toBe(0)
  })

  it('여러 공간의 면적을 합산한다', () => {
    const spaces: Space[] = [
      { id: '1', name: '거실', type: 'living', width: 5000, length: 4000 },
      { id: '2', name: '침실', type: 'bedroom', width: 3000, length: 3500 },
    ]
    const t = getTotals(spaces)
    expect(t.fa).toBeCloseTo(20 + 10.5)
  })

  it('욕실을 wetFA에 집계한다', () => {
    const spaces: Space[] = [
      { id: '1', name: '거실', type: 'living', width: 5000, length: 4000 },
      { id: '2', name: '욕실', type: 'bathroom', width: 1500, length: 2000 },
    ]
    const t = getTotals(spaces)
    expect(t.bathroomCount).toBe(1)
    expect(t.wetFA).toBeCloseTo(3.0)
    expect(t.dryFA).toBeCloseTo(20.0)
  })

  it('발코니를 balFA에 집계한다', () => {
    const spaces: Space[] = [
      { id: '1', name: '거실', type: 'living', width: 5000, length: 4000 },
      { id: '2', name: '발코니', type: 'balcony', width: 5000, length: 1500 },
    ]
    const t = getTotals(spaces)
    expect(t.balFA).toBeCloseTo(7.5)
    expect(t.dryFA).toBeCloseTo(20.0)
  })

  it('창문과 문 개수를 정확히 센다', () => {
    const spaces: Space[] = [
      {
        id: '1', name: '거실', type: 'living', width: 5000, length: 4000,
        windows: [{ w: 1200, h: 1200 }, { w: 900, h: 600 }],
        doors: [{ w: 900, h: 2100 }],
      },
      {
        id: '2', name: '침실', type: 'bedroom', width: 3000, length: 3000,
        windows: [{ w: 1000, h: 1000 }],
      },
    ]
    const t = getTotals(spaces)
    expect(t.wn).toBe(3)
    expect(t.dn).toBe(1)
  })
})

// ─── getHoistMul ─────────────────────────────────────────────────────────────

describe('getHoistMul', () => {
  describe('엘리베이터 있음', () => {
    it('1~4층: 1.0', () => expect(getHoistMul(3, true)).toBe(1.0))
    it('5~9층: 1.08', () => expect(getHoistMul(7, true)).toBe(1.08))
    it('10~14층: 1.15', () => expect(getHoistMul(12, true)).toBe(1.15))
    it('15~19층: 1.20', () => expect(getHoistMul(17, true)).toBe(1.20))
    it('20층+: 1.25', () => expect(getHoistMul(25, true)).toBe(1.25))
  })

  describe('엘리베이터 없음', () => {
    it('1~4층: 1.05', () => expect(getHoistMul(3, false)).toBe(1.05))
    it('5~9층: 1.12', () => expect(getHoistMul(7, false)).toBe(1.12))
    it('10~14층: 1.20', () => expect(getHoistMul(12, false)).toBe(1.20))
    it('15~19층: 1.30', () => expect(getHoistMul(17, false)).toBe(1.30))
    it('20층+: 1.35', () => expect(getHoistMul(25, false)).toBe(1.35))
  })
})
