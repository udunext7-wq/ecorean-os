/**
 * ECOREAN BOC v2 — Electron Main Process
 * BrowserView 탭 격리 + SQLite + IPC + 사진 + 자동백업
 */
'use strict'

const { app, BrowserWindow, BrowserView, ipcMain, Menu, shell } = require('electron')
const path = require('path')
const fs   = require('fs')

// ── 경로 상수 ─────────────────────────────────────────────
const ROOT_DIR   = path.join(__dirname, '..')
const MODULE_DIR = path.join(ROOT_DIR, 'modules-html')
const SHELL_FILE = path.join(ROOT_DIR, 'shell', 'boc-shell.html')
const PRELOAD    = path.join(__dirname, 'preload.js')
const SCHEMA_FILE= path.join(ROOT_DIR, 'shared', 'db', 'schema.sql')

// ── 엔진 ──────────────────────────────────────────────────
// shared/package.json "type":"module" 환경에서 UMD를 CJS로 수동 로딩
let BOCEngine = null
try {
  const engineSrc  = fs.readFileSync(path.join(ROOT_DIR, 'shared', 'engine', 'boc-engine.js'), 'utf8')
  const engineMod  = { exports: {} }
  const engineLoad = new Function('module', 'exports', 'require', '__dirname', '__filename', engineSrc)
  engineLoad(engineMod, engineMod.exports, require, ROOT_DIR, 'boc-engine.js')
  BOCEngine = engineMod.exports
  console.log('[Engine] boc-engine.js 로드 완료 →', Object.keys(BOCEngine).join(','))
} catch (e) {
  console.warn('[Engine] boc-engine.js 로드 실패:', e.message)
}

// ── SQLite ────────────────────────────────────────────────
let db = null

function getDB() {
  if (db) return db
  try {
    const Database = require('better-sqlite3')
    const dbPath   = path.join(app.getPath('userData'), 'ecorean.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    _initSchema(db)
    _seedData(db)
    console.log('[SQLite] Connected:', dbPath)
  } catch (e) {
    console.warn('[SQLite] Not available:', e.message)
    db = null
  }
  return db
}

function _initSchema(d) {
  try {
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8')
    d.exec(sql)
    console.log('[SQLite] Schema applied from', SCHEMA_FILE)
  } catch (e) {
    console.warn('[SQLite] Schema load failed:', e.message, '— fallback')
    d.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS approval_log (
        id TEXT PRIMARY KEY, requestType TEXT, targetId TEXT,
        action TEXT, beforeValue TEXT, afterValue TEXT,
        reason TEXT, approvedBy TEXT, approvedAt TEXT NOT NULL,
        status TEXT DEFAULT 'approved'
      );
    `)
  }
}

// ── 엔진 런타임 로드 ──────────────────────────────────────
function _loadEngines(d) {
  if (!BOCEngine) return
  try {
    const costItems = d.prepare("SELECT * FROM cost_items WHERE status='active'").all()
    BOCEngine.CalcEngine.loadFromDB(costItems)
    const ontRules = d.prepare("SELECT * FROM ontology_rules WHERE status='active'").all()
    BOCEngine.OntologyEngine.loadRulesFromDB(ontRules)
    console.log(`[Engine] CalcEngine: ${costItems.length}건, OntologyEngine: ${ontRules.length}건 로드 완료`)
  } catch (e) {
    console.warn('[Engine] 로드 실패:', e.message)
  }
}

// ── 시드 데이터 (최초 1회) ────────────────────────────────
function _seedData(d) {
  try {
    const already = d.prepare('SELECT COUNT(*) AS cnt FROM cost_items').get()
    if (already.cnt > 0) {
      console.log('[Seed] 이미 시딩됨 (cost_items:', already.cnt, ') — 스킵')
      return
    }
    const seedScript = path.join(ROOT_DIR, 'scripts', 'seed-db.js')
    if (!fs.existsSync(seedScript)) {
      console.warn('[Seed] seed-db.js 없음 — 스킵')
      return
    }
    // seed-db.js를 child_process로 실행 (userData DB에 직접 시딩)
    const { execFileSync } = require('child_process')
    execFileSync(process.execPath, [seedScript], {
      cwd: ROOT_DIR,
      env: { ...process.env, SEED_DB_PATH: d.name },
      timeout: 30000,
      stdio: 'pipe',
    })
    const after = d.prepare('SELECT COUNT(*) AS cnt FROM cost_items').get()
    console.log('[Seed] 완료 — cost_items:', after.cnt)
  } catch (e) {
    console.warn('[Seed] 실패:', e.message)
  }
  _loadEngines(d)
}

// ── 사진 관리 ─────────────────────────────────────────────
function getPhotoDir(projectId, date) {
  const d   = date || new Date().toISOString().slice(0, 10)
  const dir = path.join(app.getPath('userData'), 'photos', String(projectId), d)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// ── 백업 ──────────────────────────────────────────────────
const MAX_BACKUPS = 30
let   lastBackupDate = null

async function createBackup() {
  const d = getDB()
  if (!d) return { ok: false, reason: 'SQLite unavailable' }
  try {
    const backupDir  = path.join(app.getPath('userData'), 'backups')
    fs.mkdirSync(backupDir, { recursive: true })
    const ts         = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupPath = path.join(backupDir, `ecorean-${ts}.db`)
    await d.backup(backupPath)
    // 오래된 파일 정리 (최대 30개)
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('ecorean-') && f.endsWith('.db'))
      .sort()
    if (files.length > MAX_BACKUPS) {
      files.slice(0, files.length - MAX_BACKUPS).forEach(f => {
        try { fs.unlinkSync(path.join(backupDir, f)) } catch (_) {}
      })
    }
    lastBackupDate = new Date().toISOString().slice(0, 10)
    console.log('[Backup] Created:', backupPath)
    return { ok: true, path: backupPath, timestamp: ts }
  } catch (e) {
    console.error('[Backup] Error:', e.message)
    return { ok: false, reason: e.message }
  }
}

function scheduleAutoBackup() {
  // 1시간마다 체크 — 오늘 백업 없으면 실행
  setInterval(async () => {
    const today = new Date().toISOString().slice(0, 10)
    if (lastBackupDate !== today) await createBackup()
  }, 3_600_000)
}

// ── 공유 상태 ─────────────────────────────────────────────
const DEFAULT_STATE = {
  buildType:'apt', buildAge:10, floorLevel:5,
  hasElev:true, resid:false, region:1.0, gradeMul:1.3,
  pipeMat:'pb', hasLeak:false, hasAsbestos:false,
  floorLevel2:'good', kitchenScope:'none',
  spaces:[], selectedProcessIds:[],
  result:null, step:0,
  projects:[], presets:[],
  approvalReqs:[], approvalLog:[],
  currentTab:'estimate',
}
let sharedState = Object.assign({}, DEFAULT_STATE)

// ── BrowserView 관리 ──────────────────────────────────────
let mainWindow = null
const views    = {}
let   currentTabId = 'estimate'

const SHELL_H = 128
const TABS    = ['estimate','projects','presets','reports',
                 'approval','dbmgr','ontology','aiengine','dashboard']

function getViewBounds() {
  const [w, h] = mainWindow.getContentSize()
  return { x:0, y:SHELL_H, width:w, height:Math.max(0, h - SHELL_H) }
}

function showTab(tabId) {
  if (views[currentTabId]) {
    try { mainWindow.removeBrowserView(views[currentTabId]) } catch (_) {}
  }
  currentTabId = tabId
  const view   = views[tabId]
  if (view) {
    mainWindow.addBrowserView(view)
    view.setBounds(getViewBounds())
  }
  mainWindow.webContents.send('tab:switch', tabId)
}

function createModuleView(tabId) {
  const view = new BrowserView({
    webPreferences: {
      preload:          PRELOAD,
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,
    },
  })
  const htmlPath = path.join(MODULE_DIR, tabId + '.html')
  view.webContents.loadFile(htmlPath).catch(e => {
    console.warn('[BrowserView] load failed:', tabId, e.message)
  })
  views[tabId] = view
  return view
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 1024, minHeight: 700,
    title:           'ECOREAN BOC v2 — Build Operation Center',
    backgroundColor: '#030305',
    webPreferences: {
      preload:          PRELOAD,
      nodeIntegration:  false,
      contextIsolation: true,
      sandbox:          false,
    },
    show: false,
  })

  mainWindow.loadFile(SHELL_FILE)

  // 모든 탭 BrowserView 사전 생성
  for (const tabId of TABS) createModuleView(tabId)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    showTab('estimate')
    // 시작시 백업 체크
    const today = new Date().toISOString().slice(0, 10)
    if (lastBackupDate !== today) createBackup().catch(() => {})
  })

  mainWindow.on('resize', () => {
    const view = views[currentTabId]
    if (view) view.setBounds(getViewBounds())
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // ── DevTools 단축키 (Ctrl+Shift+I) ────────────────────────
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key === 'I') {
      const view = views[currentTabId]
      if (view && !view.webContents.isDestroyed()) {
        view.webContents.toggleDevTools()
      } else {
        mainWindow.webContents.toggleDevTools()
      }
      event.preventDefault()
    }
  })

  // ── 개발 메뉴 ─────────────────────────────────────────────
  const devMenu = Menu.buildFromTemplate([
    {
      label: '도구',
      submenu: [
        {
          label: 'DevTools (현재 탭)',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            const view = views[currentTabId]
            if (view && !view.webContents.isDestroyed()) {
              view.webContents.toggleDevTools()
            }
          },
        },
        {
          label: 'DevTools (Shell)',
          click: () => mainWindow.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강제 새로고침' },
      ],
    },
  ])
  Menu.setApplicationMenu(devMenu)

  // 개발 모드 시 자동으로 DevTools 열기
  if (process.env.NODE_ENV === 'development') {
    mainWindow.once('ready-to-show', () => {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    })
  }
}

// ── 전체 브로드캐스트 ─────────────────────────────────────
function broadcast(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
  for (const view of Object.values(views)) {
    if (!view.webContents.isDestroyed()) {
      view.webContents.send(channel, data)
    }
  }
}

// ── 유틸 ──────────────────────────────────────────────────
function parseJSON(str, fallback) {
  try { return str ? JSON.parse(str) : fallback } catch (_) { return fallback }
}
function now() { return new Date().toISOString() }

// ── IPC 핸들러 등록 ───────────────────────────────────────
function registerIPC() {

  // ────────── 상태 공유 ─────────────────────────────────
  ipcMain.handle('state:get', () => sharedState)

  ipcMain.handle('state:set', (_, patch) => {
    Object.assign(sharedState, patch)
    broadcast('state:changed', sharedState)
    return sharedState
  })

  // ────────── 탭 전환 ──────────────────────────────────
  ipcMain.on('tab:switch', (_, tabId) => {
    if (TABS.includes(tabId)) showTab(tabId)
  })

  // ────────── KPI 갱신 ─────────────────────────────────
  ipcMain.on('kpi:update', (_, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('kpi:update', data)
    }
  })

  // ────────── 앱 정보 ──────────────────────────────────
  ipcMain.handle('app:version', () => app.getVersion() || '2.0.0')

  // ────────── 범용 SELECT ───────────────────────────────
  ipcMain.handle('db:query', (_, { sql, params }) => {
    const d = getDB(); if (!d) return []
    try {
      return d.prepare(sql).all(params || [])
    } catch (e) {
      console.error('[db:query]', e.message, '\n', sql)
      return { error: e.message }
    }
  })

  // ────────── 범용 INSERT / UPDATE / DELETE ─────────────
  ipcMain.handle('db:execute', (_, { sql, params }) => {
    const d = getDB()
    if (!d) return { ok: false, reason: 'SQLite unavailable' }
    try {
      const r = d.prepare(sql).run(params || [])
      return { ok: true, changes: r.changes, lastInsertRowid: r.lastInsertRowid }
    } catch (e) {
      console.error('[db:execute]', e.message, '\n', sql)
      return { ok: false, reason: e.message }
    }
  })

  // ────────── 트랜잭션 (다중 실행) ─────────────────────
  ipcMain.handle('db:transaction', (_, statements) => {
    const d = getDB()
    if (!d) return { ok: false, reason: 'SQLite unavailable' }
    try {
      const tx = d.transaction((stmts) => {
        return stmts.map(({ sql, params }) => {
          const r = d.prepare(sql).run(params || [])
          return { changes: r.changes, lastInsertRowid: r.lastInsertRowid }
        })
      })
      return { ok: true, results: tx(statements) }
    } catch (e) {
      console.error('[db:transaction]', e.message)
      return { ok: false, reason: e.message }
    }
  })

  // ────────── 프로젝트 저장 ────────────────────────────
  ipcMain.handle('db:save-project', (_, proj) => {
    const d = getDB()
    if (!d) return { ok: false, reason: 'SQLite unavailable' }
    const ts  = now()
    const pid = proj.id || ('p' + Date.now())
    try {
      // projects 행 upsert
      d.prepare(`
        INSERT OR REPLACE INTO projects
          (id,name,address,buildType,buildAge,floorLevel,hasElev,resid,region,
           manager,status,contractAmount,startDate,endDate,conceptId,sections,createdAt,updatedAt)
        VALUES
          (@id,@name,@address,@buildType,@buildAge,@floorLevel,@hasElev,@resid,@region,
           @manager,@status,@contractAmount,@startDate,@endDate,@conceptId,@sections,@createdAt,@updatedAt)
      `).run({
        id:             pid,
        name:           proj.name           || '새 프로젝트',
        address:        proj.address        || '',
        buildType:      proj.buildType      || 'apt',
        buildAge:       proj.buildAge       || 0,
        floorLevel:     proj.floorLevel     || 1,
        hasElev:        proj.hasElev        ? 1 : 0,
        resid:          proj.resid          ? 1 : 0,
        region:         proj.region         || 1.0,
        manager:        proj.manager        || '',
        status:         proj.status         || 'draft',
        contractAmount: proj.contractAmount || proj.result?.contractAmount || 0,
        startDate:      proj.startDate      || '',
        endDate:        proj.endDate        || '',
        conceptId:      proj.conceptId      || '',
        sections:       JSON.stringify(proj.sections || []),
        createdAt:      proj.createdAt      || ts,
        updatedAt:      ts,
      })

      // spaces 저장 (기존 삭제 후 재삽입)
      if (Array.isArray(proj.spaces) && proj.spaces.length) {
        const delSp  = d.prepare('DELETE FROM spaces WHERE projectId=?')
        const insSp  = d.prepare(`
          INSERT OR REPLACE INTO spaces
            (id,projectId,name,type,width,length,height,floor,wet,windows,doors,
             floorMat,wallMat,ceilMat,cadX,cadY,status,createdAt,updatedAt)
          VALUES
            (@id,@projectId,@name,@type,@width,@length,@height,@floor,@wet,@windows,@doors,
             @floorMat,@wallMat,@ceilMat,@cadX,@cadY,@status,@createdAt,@updatedAt)
        `)
        const saveSp = d.transaction(() => {
          delSp.run(pid)
          for (const sp of proj.spaces) {
            const side = sp.area ? Math.sqrt(sp.area) * 1000 : 0
            insSp.run({
              id:        sp.id       || ('sp' + Date.now() + Math.random().toString(36).slice(2, 6)),
              projectId: pid,
              name:      sp.name    || '공간',
              type:      sp.type    || 'living',
              width:     sp.width   || side,
              length:    sp.length  || side,
              height:    sp.height  || 2400,
              floor:     sp.floor   || 1,
              wet:       sp.wet     ? 1 : 0,
              windows:   JSON.stringify(Array.isArray(sp.windows)
                ? sp.windows
                : Array(sp.windows || 0).fill({ w:1200, h:1200 })),
              doors:     JSON.stringify(Array.isArray(sp.doors)
                ? sp.doors
                : Array(sp.doors || 1).fill({ w:900, h:2100 })),
              floorMat:  sp.floorMat || '',
              wallMat:   sp.wallMat  || '',
              ceilMat:   sp.ceilMat  || '',
              cadX:      sp.cadX     || 0,
              cadY:      sp.cadY     || 0,
              status:    'active',
              createdAt: ts,
              updatedAt: ts,
            })
          }
        })
        saveSp()
      }

      // estimates 저장
      if (proj.result) {
        const r = proj.result
        d.prepare(`
          INSERT OR REPLACE INTO estimates
            (id,projectId,grade,gradeMul,selectedProcessIds,autoProcessIds,
             totalSupply,contractAmount,finalAmount,duration,lines,validUntil,status,createdAt,updatedAt)
          VALUES
            (@id,@projectId,@grade,@gradeMul,@selectedProcessIds,@autoProcessIds,
             @totalSupply,@contractAmount,@finalAmount,@duration,@lines,@validUntil,@status,@createdAt,@updatedAt)
        `).run({
          id:                 'est-' + pid,
          projectId:          pid,
          grade:              proj.grades?.pkg  || 'std',
          gradeMul:           proj.grades?.mul  || 1.0,
          selectedProcessIds: JSON.stringify(proj.scope?.selectedProcessIds || []),
          autoProcessIds:     '[]',
          totalSupply:        r.totalSupply    || 0,
          contractAmount:     r.contractAmount || 0,
          finalAmount:        r.finalAmount    || 0,
          duration:           r.duration       || 0,
          lines:              JSON.stringify(r.lines || []),
          validUntil:         new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
          status:             'active',
          createdAt:          ts,
          updatedAt:          ts,
        })
      }

      return { ok: true, id: pid }
    } catch (e) {
      console.error('[db:save-project]', e.message)
      return { ok: false, reason: e.message }
    }
  })

  // ────────── 프로젝트 목록 ────────────────────────────
  ipcMain.handle('db:list-projects', () => {
    const d = getDB(); if (!d) return []
    try {
      return d.prepare(
        "SELECT * FROM projects WHERE status != 'disabled' ORDER BY updatedAt DESC"
      ).all().map(row => ({
        ...row,
        hasElev:  !!row.hasElev,
        resid:    !!row.resid,
        sections: parseJSON(row.sections, []),
      }))
    } catch (e) { return [] }
  })

  // ────────── 프로젝트 삭제 (disabled) ─────────────────
  ipcMain.handle('db:delete-project', (_, id) => {
    const d = getDB(); if (!d) return { ok: false }
    try {
      d.prepare("UPDATE projects SET status='disabled', updatedAt=? WHERE id=?")
        .run(now(), id)
      return { ok: true }
    } catch (e) { return { ok: false, reason: e.message } }
  })

  // ────────── 승인 로그 저장 ───────────────────────────
  ipcMain.handle('db:save-approval', (_, req) => {
    const d = getDB(); if (!d) return { ok: false }
    try {
      d.prepare(`
        INSERT OR REPLACE INTO approval_log
          (id,requestType,targetId,action,beforeValue,afterValue,reason,approvedBy,approvedAt,status)
        VALUES
          (@id,@requestType,@targetId,@action,@beforeValue,@afterValue,@reason,@approvedBy,@approvedAt,@status)
      `).run({
        id:          req.id          || ('al' + Date.now()),
        requestType: req.requestType || req.actionType || 'general',
        targetId:    req.targetId    || req.requestId  || '',
        action:      req.action      || req.actionType || '',
        beforeValue: JSON.stringify(req.beforeValue ?? null),
        afterValue:  JSON.stringify(req.afterValue  ?? null),
        reason:      req.reason      || '',
        approvedBy:  req.approvedBy  || 'system',
        approvedAt:  req.approvedAt  || now(),
        status:      'approved',
      })
      return { ok: true }
    } catch (e) { return { ok: false, reason: e.message } }
  })

  // ────────── 승인 로그 목록 ───────────────────────────
  ipcMain.handle('db:list-approvals', () => {
    const d = getDB(); if (!d) return []
    try {
      return d.prepare('SELECT * FROM approval_log ORDER BY approvedAt DESC').all()
    } catch (e) { return [] }
  })

  // ────────── 사진 저장 ────────────────────────────────
  ipcMain.handle('photo:save', async (_, { projectId, date, dataUrl, filename }) => {
    try {
      const dir  = getPhotoDir(projectId, date)
      const name = filename || ('photo-' + Date.now() + '.jpg')
      const dest = path.join(dir, name)
      const b64  = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      fs.writeFileSync(dest, Buffer.from(b64, 'base64'))
      return { ok: true, path: dest, filename: name }
    } catch (e) {
      return { ok: false, reason: e.message }
    }
  })

  // ────────── 사진 목록 ────────────────────────────────
  ipcMain.handle('photo:list', (_, { projectId, date }) => {
    try {
      const dir   = getPhotoDir(projectId, date)
      const files = fs.readdirSync(dir)
        .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
        .map(f => ({ name: f, path: path.join(dir, f) }))
      return { ok: true, files }
    } catch (_) {
      return { ok: true, files: [] }
    }
  })

  // ────────── 엔진 재로드 ──────────────────────────────
  ipcMain.handle('db:reload-engine', () => {
    const d = getDB(); if (!d) return { ok: false, reason: 'SQLite unavailable' }
    try {
      _loadEngines(d)
      const ci = d.prepare("SELECT COUNT(*) AS cnt FROM cost_items WHERE status='active'").get()
      const or = d.prepare("SELECT COUNT(*) AS cnt FROM ontology_rules WHERE status='active'").get()
      return { ok: true, costItems: ci.cnt, ontologyRules: or.cnt }
    } catch (e) { return { ok: false, reason: e.message } }
  })

  // ────────── 백업 생성 ────────────────────────────────
  ipcMain.handle('backup:create', async () => createBackup())

  // ────────── 백업 목록 ────────────────────────────────
  ipcMain.handle('backup:list', () => {
    try {
      const dir = path.join(app.getPath('userData'), 'backups')
      if (!fs.existsSync(dir)) return { ok: true, files: [] }
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.db'))
        .sort().reverse()
        .map(f => ({
          name: f,
          path: path.join(dir, f),
          size: fs.statSync(path.join(dir, f)).size,
        }))
      return { ok: true, files }
    } catch (e) {
      return { ok: false, reason: e.message }
    }
  })

  // ────────── BOC v6.0 cost/kpi/meta IPC ──────────────
  let CostLoader = null;
  try {
    CostLoader = require('../shell/src/cost-items/CostLoader.cjs');
  } catch(e) {
    console.warn('[IPC] CostLoader 로드 실패:', e.message);
  }

  ipcMain.handle('boc:cost:loadByCategory', async (e, { category, opts }) => {
    if (!CostLoader) return [];
    return CostLoader.loadByCategory(category, opts);
  });
  ipcMain.handle('boc:cost:buildLineItems', async (e, { spaces, concept, opts }) => {
    if (!CostLoader) return [];
    return CostLoader.buildLineItems(spaces, concept, opts);
  });
  ipcMain.handle('boc:cost:getApprovalStatus', async (e, { opts }) => {
    if (!CostLoader) return { total: 0, approved: 0, pending: 0, rate: 0, bySource: {} };
    return CostLoader.getApprovalStatus(opts);
  });
  ipcMain.handle('boc:cost:approve', async (e, { id }) => {
    return { ok: false, error: 'Phase 5에서 활성 (현재는 Excel 임포트만)' };
  });
  ipcMain.handle('boc:cost:update', async (e, { id, opts }) => {
    return { ok: false, error: 'Phase 5에서 활성 (현재는 Excel 임포트만)' };
  });

  ipcMain.handle('boc:kpi:getCurrent',     async () => null);
  ipcMain.handle('boc:kpi:getActiveCount', async () => 1);
  ipcMain.handle('boc:kpi:getMLPhaseStatus', async () => {
    if (!CostLoader) return { real: 0, simulated: 0, total: 0, phase: 'PHASE_1_MANUAL' };
    const status = CostLoader.getApprovalStatus();
    const real = status.bySource['invoice'] || 0;
    const simulated = status.bySource['simulation'] || 0;
    let phase = 'PHASE_1_MANUAL';
    if (real >= 500) phase = 'PHASE_4_DEEP';
    else if (real >= 100) phase = 'PHASE_3_XGBOOST';
    else if (real >= 50) phase = 'PHASE_2_STATS';
    return { real, simulated, total: real, phase };
  });

  ipcMain.handle('boc:meta:getVersion', async () => '6.0.0-alpha.2');
  ipcMain.handle('boc:meta:getPhase',   async () => 'PHASE_4');

  // ────────── 핸들러 목록 출력 (개발용) ────────────────
  console.log('[IPC] Registered handlers:')
  ;[
    'state:get','state:set','tab:switch (on)','kpi:update (on)','app:version',
    'db:query','db:execute','db:transaction',
    'db:save-project','db:list-projects','db:delete-project',
    'db:save-approval','db:list-approvals',
    'db:reload-engine',
    'photo:save','photo:list',
    'backup:create','backup:list',
  ].forEach(h => console.log('  ·', h))
}

// ── App 생명주기 ──────────────────────────────────────────
app.whenReady().then(() => {
  registerIPC()
  createWindow()
  getDB()
  scheduleAutoBackup()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
