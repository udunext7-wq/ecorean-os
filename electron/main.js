/**
 * ECOREAN BOC v2 — Electron Main Process
 * BrowserView로 각 모듈 탭을 격리 로드
 * IPC로 상태·KPI·탭전환 공유
 */
const { app, BrowserWindow, BrowserView, ipcMain, Menu, shell } = require('electron')
const path = require('path')

// ── SQLite (선택적) ────────────────────────────────────────
let db = null
function getDB() {
  if (db) return db
  try {
    const Database = require('better-sqlite3')
    const dbPath = path.join(app.getPath('userData'), 'ecorean-boc.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    _migrate(db)
    console.log('[SQLite] Connected:', dbPath)
  } catch(e) {
    console.warn('[SQLite] Not available:', e.message)
    db = null
  }
  return db
}

function _migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      buildType TEXT, buildAge INTEGER, floorLevel INTEGER,
      hasElev INTEGER DEFAULT 0,
      result_json TEXT, spaces_json TEXT, scope_json TEXT, grades_json TEXT,
      createdAt TEXT, updatedAt TEXT, status TEXT DEFAULT 'draft'
    );
    CREATE TABLE IF NOT EXISTS approval_log (
      id TEXT PRIMARY KEY, requestId TEXT,
      actionType TEXT, reason TEXT, approvedBy TEXT, approvedAt TEXT
    );
  `)
}

// ── 공유 상태 (Main Process가 master) ─────────────────────
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

// ── 창 / 뷰 ───────────────────────────────────────────────
let mainWindow = null
const views = {}           // tabId → BrowserView
let currentTabId = 'estimate'

const SHELL_H = 90         // KPI(52) + Tabs(38)
const TABS = ['estimate','projects','presets','reports',
              'approval','dbmgr','ontology','aiengine','dashboard']

const MODULE_DIR = path.join(__dirname, '..', 'modules-html')
const SHELL_FILE  = path.join(__dirname, '..', 'shell', 'boc-shell.html')
const PRELOAD     = path.join(__dirname, 'preload.js')

// ── 뷰 영역 계산 ──────────────────────────────────────────
function getViewBounds() {
  const [w, h] = mainWindow.getContentSize()
  return { x:0, y:SHELL_H, width:w, height:Math.max(0, h - SHELL_H) }
}

// ── 탭 전환 ───────────────────────────────────────────────
function showTab(tabId) {
  // 현재 뷰 제거
  if (views[currentTabId]) {
    try { mainWindow.removeBrowserView(views[currentTabId]) } catch(e) {}
  }
  currentTabId = tabId
  const view = views[tabId]
  if (view) {
    mainWindow.addBrowserView(view)
    view.setBounds(getViewBounds())
  }
  // 셸에 탭 전환 알림
  mainWindow.webContents.send('tab:switch', tabId)
}

// ── 뷰 생성 ───────────────────────────────────────────────
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

// ── 메인 윈도우 생성 ──────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 1024, minHeight: 700,
    title: 'ECOREAN BOC v2 — Build Operation Center',
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

  // 모든 모듈 뷰 사전 생성
  for (const tabId of TABS) {
    createModuleView(tabId)
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    showTab('estimate')
  })

  // 창 크기 변경 시 현재 뷰 리사이즈
  mainWindow.on('resize', () => {
    const view = views[currentTabId]
    if (view) view.setBounds(getViewBounds())
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  Menu.setApplicationMenu(null)
}

// ── IPC 핸들러 ────────────────────────────────────────────
function registerIPC() {
  // 상태 조회
  ipcMain.handle('state:get', () => sharedState)

  // 상태 변경 → 전체 브로드캐스트
  ipcMain.handle('state:set', (event, patch) => {
    Object.assign(sharedState, patch)
    // 셸에 전달
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('state:changed', sharedState)
    }
    // 모든 모듈 뷰에 전달
    for (const [tid, view] of Object.entries(views)) {
      if (!view.webContents.isDestroyed()) {
        view.webContents.send('state:changed', sharedState)
      }
    }
    return sharedState
  })

  // 탭 전환 (모듈이 요청)
  ipcMain.on('tab:switch', (event, tabId) => {
    if (TABS.includes(tabId)) showTab(tabId)
  })

  // KPI 갱신 (estimate 모듈이 계산 후 전송)
  ipcMain.on('kpi:update', (event, data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('kpi:update', data)
    }
  })

  // 앱 버전
  ipcMain.handle('app:version', () => app.getVersion() || '2.0.0')

  // SQLite: 프로젝트 저장
  ipcMain.handle('db:save-project', (event, proj) => {
    const db = getDB(); if (!db) return { ok:false, reason:'SQLite unavailable' }
    try {
      db.prepare(`INSERT OR REPLACE INTO projects
        (id,name,buildType,buildAge,floorLevel,hasElev,result_json,spaces_json,scope_json,grades_json,createdAt,updatedAt,status)
        VALUES (@id,@name,@buildType,@buildAge,@floorLevel,@hasElev,@result_json,@spaces_json,@scope_json,@grades_json,@createdAt,@updatedAt,@status)
      `).run({
        id:         proj.id,
        name:       proj.name,
        buildType:  proj.buildType || 'apt',
        buildAge:   proj.buildAge  || 0,
        floorLevel: proj.floorLevel|| 1,
        hasElev:    proj.hasElev ? 1 : 0,
        result_json: JSON.stringify(proj.result || null),
        spaces_json: JSON.stringify(proj.spaces || []),
        scope_json:  JSON.stringify(proj.scope  || {}),
        grades_json: JSON.stringify(proj.grades || {}),
        createdAt:  proj.createdAt || new Date().toISOString(),
        updatedAt:  new Date().toISOString(),
        status:     proj.status || 'draft',
      })
      return { ok:true }
    } catch(e) { return { ok:false, reason:e.message } }
  })

  // SQLite: 프로젝트 목록
  ipcMain.handle('db:list-projects', () => {
    const db = getDB(); if (!db) return []
    try {
      return db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC').all()
        .map(row => ({
          ...row,
          hasElev: !!row.hasElev,
          result:  JSON.parse(row.result_json  || 'null'),
          spaces:  JSON.parse(row.spaces_json  || '[]'),
          scope:   JSON.parse(row.scope_json   || '{}'),
          grades:  JSON.parse(row.grades_json  || '{}'),
        }))
    } catch(e) { return [] }
  })

  // SQLite: 프로젝트 삭제
  ipcMain.handle('db:delete-project', (event, id) => {
    const db = getDB(); if (!db) return { ok:false }
    try { db.prepare('DELETE FROM projects WHERE id=?').run(id); return { ok:true } }
    catch(e) { return { ok:false, reason:e.message } }
  })

  // SQLite: 승인 저장
  ipcMain.handle('db:save-approval', (event, req) => {
    const db = getDB(); if (!db) return { ok:false }
    try {
      db.prepare(`INSERT OR REPLACE INTO approval_log
        (id,requestId,actionType,reason,approvedBy,approvedAt)
        VALUES (@id,@requestId,@actionType,@reason,@approvedBy,@approvedAt)`).run({
        id:         req.id || Date.now().toString(),
        requestId:  req.requestId,
        actionType: req.actionType,
        reason:     req.reason || '',
        approvedBy: req.approvedBy || 'system',
        approvedAt: new Date().toISOString(),
      })
      return { ok:true }
    } catch(e) { return { ok:false, reason:e.message } }
  })

  // SQLite: 승인 목록
  ipcMain.handle('db:list-approvals', () => {
    const db = getDB(); if (!db) return []
    try { return db.prepare('SELECT * FROM approval_log ORDER BY approvedAt DESC').all() }
    catch(e) { return [] }
  })
}

// ── App 생명주기 ──────────────────────────────────────────
app.whenReady().then(() => {
  registerIPC()
  createWindow()
  getDB()  // SQLite 초기화 (실패해도 무방)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
