import { describe, it, expect } from 'vitest'
import { applyOntology } from '../ontology.ts'
import type { OntologyRule } from '../types.ts'

const rules: OntologyRule[] = [
  { id: 'R1', trigger: 'TILE_BT', action: 'TILE_GRF', type: 'AUTO_INCLUDE', note: '타일→줄눈 자동' },
  { id: 'R2', trigger: 'WTP_BT', action: 'WTP_PM', type: 'AUTO_INCLUDE', note: '방수→보호몰탈 자동' },
  { id: 'R3', trigger: 'PLB_BLR', action: 'PLB_HTF', type: 'AUTO_INCLUDE', note: '보일러→난방배관 자동' },
  { id: 'R4', trigger: 'MSN_SL', action: 'MSN_FL', type: 'WARN_CONDITIONAL', condition: 'true', note: '셀프레벨링 시 미장 확인' },
  { id: 'R5', trigger: 'WTP_BT', action: 'WTP_CHECK', type: 'WARN_CONDITIONAL', condition: 'false', note: '조건 미충족 경고 없음' },
  { id: 'R6', trigger: 'ELE_RG', action: 'ELE_PNL', type: 'FORCED', note: '배선교체→분전반 강제' },
]

describe('applyOntology', () => {
  it('빈 선택 목록에서 아무것도 추가하지 않는다', () => {
    const r = applyOntology([], rules)
    expect(r.autoAdded).toHaveLength(0)
    expect(r.warnings).toHaveLength(0)
  })

  it('AUTO_INCLUDE: 트리거 공정 선택 시 action 공정 자동 추가', () => {
    const r = applyOntology(['TILE_BT'], rules)
    expect(r.autoAdded).toHaveLength(1)
    expect(r.autoAdded[0]).toMatchObject({ id: 'TILE_GRF', ruleId: 'R1' })
  })

  it('AUTO_INCLUDE: action이 이미 선택된 경우 중복 추가 안 함', () => {
    const r = applyOntology(['TILE_BT', 'TILE_GRF'], rules)
    expect(r.autoAdded).toHaveLength(0)
  })

  it('여러 AUTO_INCLUDE 규칙을 동시에 처리한다', () => {
    const r = applyOntology(['TILE_BT', 'WTP_BT'], rules)
    const ids = r.autoAdded.map(a => a.id)
    expect(ids).toContain('TILE_GRF')
    expect(ids).toContain('WTP_PM')
  })

  it('WARN_CONDITIONAL: 조건 true이고 action 미선택 시 경고 추가', () => {
    const r = applyOntology(['MSN_SL'], rules)
    expect(r.warnings).toHaveLength(1)
    expect(r.warnings[0]).toMatchObject({ ruleId: 'R4', trigger: 'MSN_SL', action: 'MSN_FL' })
  })

  it('WARN_CONDITIONAL: 조건 false이면 경고 없음', () => {
    const r = applyOntology(['WTP_BT'], rules)
    const warnings = r.warnings.filter(w => w.ruleId === 'R5')
    expect(warnings).toHaveLength(0)
  })

  it('WARN_CONDITIONAL: action이 이미 선택된 경우 경고 없음', () => {
    const r = applyOntology(['MSN_SL', 'MSN_FL'], rules)
    expect(r.warnings).toHaveLength(0)
  })

  it('FORCED: 트리거 선택 시 action 강제 추가', () => {
    const r = applyOntology(['ELE_RG'], rules)
    const forced = r.autoAdded.find(a => a.id === 'ELE_PNL')
    expect(forced).toBeDefined()
    expect(forced?.ruleId).toBe('R6')
  })

  it('트리거가 없는 규칙은 무시한다', () => {
    const r = applyOntology(['MSN_FL'], rules)
    // MSN_FL은 어떤 트리거도 아님
    expect(r.autoAdded).toHaveLength(0)
  })

  it('rule에 trigger/action 없으면 무시한다', () => {
    const badRules: OntologyRule[] = [
      { id: 'BAD', trigger: '', action: '', type: 'AUTO_INCLUDE' },
    ]
    const r = applyOntology(['TILE_BT'], badRules)
    expect(r.autoAdded).toHaveLength(0)
  })

  it('note가 없는 rule도 처리한다', () => {
    const noNoteRules: OntologyRule[] = [
      { id: 'R_NO_NOTE', trigger: 'TILE_BT', action: 'TILE_GRF', type: 'AUTO_INCLUDE' },
    ]
    const r = applyOntology(['TILE_BT'], noNoteRules)
    expect(r.autoAdded[0]?.note).toBeTruthy()
  })
})
