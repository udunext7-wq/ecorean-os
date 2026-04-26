import { useStore } from '@ecorean/shared/store'
import { loadCostItemDB } from '@ecorean/shared/engine'
import { sqliteAdapter } from './db/sqlite-adapter'

export async function initDB() {
  try {
    const [costRes, laborRes] = await Promise.all([
      fetch('/data/cost-items-v2.json').catch(() => fetch('/data/cost-items.json')),
      fetch('/data/labor-roles.json').catch(() => Promise.resolve({ ok: false })),
    ])

    if (costRes.ok) {
      const costData = await costRes.json()
      const db = loadCostItemDB(costData)
      useStore.getState().setDB(db)
      console.log('[ECOREAN] DB loaded:', Object.keys(db).length, '공정')
    }

    // 온톨로지 규칙 (없어도 동작)
    try {
      const ontRes = await fetch('/data/ontology-rules.json')
      if (ontRes.ok) {
        const ontData = await ontRes.json()
        useStore.getState().setOntology(ontData.rules ?? ontData ?? [])
      }
    } catch {
      // 온톨로지 없이 동작 (rules는 빈 배열)
    }

    if (laborRes.ok) {
      const laborData = await laborRes.json().catch(() => [])
      useStore.getState().setLaborRoles(laborData.roles ?? laborData)
    }
  } catch (e) {
    console.error('[ECOREAN] DB load failed:', e)
  }

  if (sqliteAdapter.isAvailable) {
    await migrateLocalStorageToSQLite()
    await syncProjectsFromSQLite()
  }
}

async function migrateLocalStorageToSQLite() {
  const MIGRATION_KEY = 'ecorean_sqlite_migrated_v1'
  if (localStorage.getItem(MIGRATION_KEY)) return

  try {
    const raw = localStorage.getItem('ecorean-store-v2')
    if (!raw) return

    const parsed = JSON.parse(raw)
    const projects = parsed?.state?.projects ?? []
    const approvalLog = parsed?.state?.approvalReqs ?? []

    if (projects.length === 0) return

    const result = await sqliteAdapter.migrateFromLocal({ projects, approvalLog })
    if (result?.ok) {
      localStorage.setItem(MIGRATION_KEY, '1')
      console.log(`[SQLite] Migrated ${result.migrated} projects`)
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
