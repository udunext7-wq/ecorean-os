import { useStore } from '@ecorean/shared/store'

export async function initDB() {
  try {
    const [costRes, ontologyRes, laborRes] = await Promise.all([
      fetch('/data/cost-items-v2.json').catch(() => fetch('/data/cost-items.json')),
      fetch('/data/ontology-rules.json'),
      fetch('/data/labor-roles.json'),
    ])

    const costData = await costRes.json()
    const ontologyData = await ontologyRes.json().catch(() => ({ rules: [] }))
    const laborData = await laborRes.json().catch(() => ({ roles: [] }))

    // cost-items: { costItems: { ID: { nm, cat, unit, f, lb, mt, wr } } }
    const db = costData.costItems || costData
    useStore.getState().setDB(db)
    useStore.getState().setOntology(ontologyData.rules || [])
    useStore.getState().setLaborRoles(laborData.roles || laborData)

    console.log('[ECOREAN] DB loaded:', Object.keys(db).length, '공정')
  } catch (e) {
    console.error('[ECOREAN] DB load failed:', e)
  }
}
