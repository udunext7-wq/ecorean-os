const path = require('path')
const { app } = require('electron')

let db = null

function getDB() {
  if (db) return db
  try {
    const Database = require('better-sqlite3')
    const dbPath = path.join(app.getPath('userData'), 'ecorean-boc.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
    console.log('[SQLite] Connected:', dbPath)
  } catch (e) {
    console.warn('[SQLite] Not available (web mode):', e.message)
    db = null
  }
  return db
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      buildType TEXT,
      buildAge INTEGER,
      floorLevel INTEGER,
      hasElev INTEGER DEFAULT 0,
      result_json TEXT,
      spaces_json TEXT,
      scope_json TEXT,
      grades_json TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      status TEXT DEFAULT 'draft'
    );

    CREATE TABLE IF NOT EXISTS approval_log (
      id TEXT PRIMARY KEY,
      processId TEXT,
      processName TEXT,
      category TEXT,
      field TEXT,
      oldValue REAL,
      newValue REAL,
      reason TEXT,
      approvedBy TEXT,
      approvedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS completion_reports (
      id TEXT PRIMARY KEY,
      projectId TEXT,
      totalAmount REAL,
      laborRatio REAL,
      materialRatio REAL,
      spaces_json TEXT,
      processes_json TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS cost_items_override (
      id TEXT PRIMARY KEY,
      processId TEXT NOT NULL,
      field TEXT NOT NULL,
      value REAL NOT NULL,
      reason TEXT,
      updatedAt TEXT
    );
  `)
}

// ── Project CRUD ──────────────────────────────────────────────
const upsertProject = db => db.prepare(`
  INSERT INTO projects (id, name, buildType, buildAge, floorLevel, hasElev,
    result_json, spaces_json, scope_json, grades_json, createdAt, updatedAt, status)
  VALUES (@id, @name, @buildType, @buildAge, @floorLevel, @hasElev,
    @result_json, @spaces_json, @scope_json, @grades_json, @createdAt, @updatedAt, @status)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, buildType=excluded.buildType, buildAge=excluded.buildAge,
    floorLevel=excluded.floorLevel, hasElev=excluded.hasElev,
    result_json=excluded.result_json, spaces_json=excluded.spaces_json,
    scope_json=excluded.scope_json, grades_json=excluded.grades_json,
    updatedAt=excluded.updatedAt, status=excluded.status
`)

const handlers = {
  'db:save-project': (_, project) => {
    const d = getDB()
    if (!d) return { ok: false, error: 'SQLite unavailable' }
    try {
      upsertProject(d).run({
        id: project.id,
        name: project.name || '(무제)',
        buildType: project.buildType || '',
        buildAge: project.buildAge || 0,
        floorLevel: project.floorLevel || 1,
        hasElev: project.hasElev ? 1 : 0,
        result_json: JSON.stringify(project.result || null),
        spaces_json: JSON.stringify(project.spaces || []),
        scope_json: JSON.stringify(project.scope || {}),
        grades_json: JSON.stringify(project.grades || {}),
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: project.status || 'draft',
      })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  'db:list-projects': (_) => {
    const d = getDB()
    if (!d) return []
    try {
      return d.prepare('SELECT * FROM projects ORDER BY updatedAt DESC').all()
        .map(row => ({
          ...row,
          hasElev: !!row.hasElev,
          result: JSON.parse(row.result_json || 'null'),
          spaces: JSON.parse(row.spaces_json || '[]'),
          scope: JSON.parse(row.scope_json || '{}'),
          grades: JSON.parse(row.grades_json || '{}'),
        }))
    } catch (e) {
      return []
    }
  },

  'db:delete-project': (_, id) => {
    const d = getDB()
    if (!d) return { ok: false }
    try {
      d.prepare('DELETE FROM projects WHERE id = ?').run(id)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  // ── Approval log ──────────────────────────────────────────────
  'db:save-approval': (_, entry) => {
    const d = getDB()
    if (!d) return { ok: false }
    try {
      d.prepare(`
        INSERT OR REPLACE INTO approval_log
          (id, processId, processName, category, field, oldValue, newValue, reason, approvedBy, approvedAt)
        VALUES (@id, @processId, @processName, @category, @field, @oldValue, @newValue, @reason, @approvedBy, @approvedAt)
      `).run({
        id: entry.id || `APR-${Date.now()}`,
        processId: entry.processId || '',
        processName: entry.processName || '',
        category: entry.category || '',
        field: entry.field || '',
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        reason: entry.reason || '',
        approvedBy: entry.approvedBy || 'admin',
        approvedAt: entry.approvedAt || new Date().toISOString(),
      })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  'db:list-approvals': (_) => {
    const d = getDB()
    if (!d) return []
    try {
      return d.prepare('SELECT * FROM approval_log ORDER BY approvedAt DESC').all()
    } catch (e) {
      return []
    }
  },

  // ── Completion reports ────────────────────────────────────────
  'db:save-report': (_, report) => {
    const d = getDB()
    if (!d) return { ok: false }
    try {
      d.prepare(`
        INSERT OR REPLACE INTO completion_reports
          (id, projectId, totalAmount, laborRatio, materialRatio, spaces_json, processes_json, createdAt)
        VALUES (@id, @projectId, @totalAmount, @laborRatio, @materialRatio, @spaces_json, @processes_json, @createdAt)
      `).run({
        id: report.id || `RPT-${Date.now()}`,
        projectId: report.projectId || '',
        totalAmount: report.totalAmount || 0,
        laborRatio: report.laborRatio || 0,
        materialRatio: report.materialRatio || 0,
        spaces_json: JSON.stringify(report.spaces || []),
        processes_json: JSON.stringify(report.processes || []),
        createdAt: report.createdAt || new Date().toISOString(),
      })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  // ── LocalStorage migration ────────────────────────────────────
  'db:migrate-from-local': (_, { projects, approvalLog }) => {
    const d = getDB()
    if (!d) return { ok: false, error: 'SQLite unavailable' }
    const insertMany = d.transaction((items) => {
      const stmt = upsertProject(d)
      let count = 0
      for (const p of (items || [])) {
        try {
          stmt.run({
            id: p.id || `P-${Date.now()}-${count}`,
            name: p.name || '(가져온 프로젝트)',
            buildType: p.buildType || '',
            buildAge: p.buildAge || 0,
            floorLevel: p.floorLevel || 1,
            hasElev: p.hasElev ? 1 : 0,
            result_json: JSON.stringify(p.result || null),
            spaces_json: JSON.stringify(p.spaces || []),
            scope_json: JSON.stringify(p.scope || {}),
            grades_json: JSON.stringify(p.grades || {}),
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: p.status || 'completed',
          })
          count++
        } catch (_) {}
      }
      return count
    })
    try {
      const count = insertMany(projects)
      return { ok: true, migrated: count }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },
}

module.exports = { handlers, getDB }
