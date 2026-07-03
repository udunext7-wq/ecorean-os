import type {
  OntologyRule,
  OntologyResult,
  OntologyAutoAdded,
  OntologyWarning,
  OntologyContext,
} from './types.ts'

// 조건 표현식을 안전하게 평가
function evalCondition(condition: string, ctx: OntologyContext): boolean {
  try {
    const keys = Object.keys(ctx)
    const vals = Object.values(ctx)
    return Boolean(new Function(...keys, `return !!(${condition})`)(...vals))
  } catch {
    return false
  }
}

export function applyOntology(
  selectedIds: string[],
  rules: OntologyRule[],
  ctx: OntologyContext = {},
): OntologyResult {
  const autoAdded: OntologyAutoAdded[] = []
  const warnings: OntologyWarning[] = []
  const selected = new Set(selectedIds)

  for (const rule of rules) {
    if (!rule.trigger || !rule.action) continue
    if (!selected.has(rule.trigger)) continue

    if (rule.type === 'AUTO_INCLUDE' || rule.type === 'FORCED') {
      if (!selected.has(rule.action)) {
        autoAdded.push({
          id: rule.action,
          note: rule.note ?? `${rule.trigger}→${rule.action} 자동`,
          ruleId: rule.id,
        })
      }
    } else if (rule.type === 'WARN_CONDITIONAL') {
      const condMet = !rule.condition || evalCondition(rule.condition, ctx)
      if (condMet && !selected.has(rule.action)) {
        warnings.push({
          ruleId: rule.id,
          message: rule.note ?? `${rule.trigger}→${rule.action} 확인 필요`,
          trigger: rule.trigger,
          action: rule.action,
        })
      }
    }
  }

  return { autoAdded, warnings }
}
