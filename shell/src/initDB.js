import { useStore } from '@ecorean/shared/store'
import { sqliteAdapter } from './db/sqlite-adapter'

export async function initDB() {
  // Load JSON master data
  try {
    const [costRes, ontologyRes, laborRes] = await Promise.all([
      fetch('/data/cost-items-v2.json').catch(() => fetch('/data/cost-items.json')),
      fetch('/data/ontology-rules.json'),
      fetch('/data/labor-roles.json'),
    ])

    const costData = await costRes.json()
    const ontologyData = await ontologyRes.json().catch(() => ({ rules: [] }))
    const laborData = await laborRes.json().catch(() => ({ roles: [] }))

    const db = costData.costItems || costData
    useStore.getState().setDB(db)
    useStore.getState().setOntology(ontologyData.rules || [])
    useStore.getState().setLaborRoles(laborData.roles || laborData)

    console.log('[ECOREAN] DB loaded:', Object.keys(db).length, '공정')
  } catch (e) {
    console.error('[ECOREAN] DB load failed:', e)
  }

  // SQLite: migrate localStorage projects on first Electron run
  if (sqliteAdapter.isAvailable) {
    await migrateLocalStorageToSQLite()
    await syncProjectsFromSQLite()
  }
}

async function migrateLocalStorageToSQLite() {
  const MIGRATION_KEY = 'ecorean_sqlite_migrated_v1'
  if (localStorage.getItem(MIGRATION_KEY)) return

  try {
    const raw = localStorage.getItem('ecorean-boc-store')
    if (!raw) return

    const parsed = JSON.parse(raw)
    const projects = parsed?.state?.projects || []
    const approvalLog = parsed?.state?.approvalReqs || []

    if (projects.length === 0) return

    const result = await sqliteAdapter.migrateFromLocal({ projects, approvalLog })
    if (result?.ok) {
      localStorage.setItem(MIGRATION_KEY, '1')
      console.log(`[SQLite] Migrated ${result.migrated} projects from localStorage`)
    }
  } catch (e) {
    console.warn('[SQLite] Migration error:', e)
  }
}

async function syncProjectsFromSQLite() {
  try {
    const projects = await sqliteAdapter.listProjects()
    if (projects?.length > 0) {
      useStore.getState().setField('projects', projects)
      console.log(`[SQLite] Loaded ${projects.length} projects`)
    }
  } catch (e) {
    console.warn('[SQLite] Sync error:', e)
  }
}
