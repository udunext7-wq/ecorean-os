export function applyOntology(selectedIds, ontologyRules, ctx = {}) {
  const autoAdded = []
  const warnings = []

  ontologyRules.forEach(rule => {
    if (!rule.trigger || !rule.action) return
    const triggered = selectedIds.includes(rule.trigger)
    if (!triggered) return

    if (rule.type === 'AUTO_INCLUDE') {
      if (!selectedIds.includes(rule.action)) {
        autoAdded.push({ id: rule.action, note: rule.note || rule.trigger + '→' + rule.action + ' 자동', ruleId: rule.id })
      }
    } else if (rule.type === 'WARN_CONDITIONAL') {
      const condMet = !rule.condition || evalCondition(rule.condition, ctx)
      if (condMet && !selectedIds.includes(rule.action)) {
        warnings.push({ ruleId: rule.id, message: rule.note, trigger: rule.trigger, action: rule.action })
      }
    } else if (rule.type === 'FORCED') {
      if (!selectedIds.includes(rule.action)) {
        autoAdded.push({ id: rule.action, note: rule.note || '강제 포함', ruleId: rule.id })
      }
    }
  })

  return { autoAdded, warnings }
}

function evalCondition(condition, ctx) {
  try {
    return new Function(...Object.keys(ctx), `return !!(${condition})`)(...Object.values(ctx))
  } catch {
    return false
  }
}
