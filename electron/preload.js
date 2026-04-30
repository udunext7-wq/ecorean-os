/**
 * ECOREAN BOC — Electron Preload
 * contextBridge로 IPC 채널을 렌더러에 노출
 */
'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ecoreanAPI', {
  // ── 상태 공유 ─────────────────────────────────────────
  getState:       ()      => ipcRenderer.invoke('state:get'),
  setState:       (patch) => ipcRenderer.invoke('state:set', patch),
  onStateChanged: (cb)    => ipcRenderer.on('state:changed', (_, s) => cb(s)),

  // ── 탭 전환 ──────────────────────────────────────────
  switchTab:   (tabId) => ipcRenderer.send('tab:switch', tabId),
  onTabSwitch: (cb)    => ipcRenderer.on('tab:switch', (_, id) => cb(id)),

  // ── KPI ──────────────────────────────────────────────
  updateKPI:  (data) => ipcRenderer.send('kpi:update', data),
  onKPIUpdate:(cb)   => ipcRenderer.on('kpi:update', (_, d) => cb(d)),

  kpi: {
    update:   (data) => ipcRenderer.send('kpi:update', data),
    onUpdate: (cb)   => ipcRenderer.on('kpi:update', (_, d) => cb(d)),
  },

  // ── DB: 범용 쿼리/실행/트랜잭션 ─────────────────────
  db: {
    query:       (sql, params)   => ipcRenderer.invoke('db:query',       { sql, params }),
    execute:     (sql, params)   => ipcRenderer.invoke('db:execute',     { sql, params }),
    transaction: (statements)    => ipcRenderer.invoke('db:transaction', statements),

    // 프로젝트 CRUD
    saveProject:   (proj) => ipcRenderer.invoke('db:save-project', proj),
    listProjects:  ()     => ipcRenderer.invoke('db:list-projects'),
    deleteProject: (id)   => ipcRenderer.invoke('db:delete-project', id),

    // 승인 로그
    saveApproval:  (req)  => ipcRenderer.invoke('db:save-approval', req),
    listApprovals: ()     => ipcRenderer.invoke('db:list-approvals'),
  },

  // ── 사진 ─────────────────────────────────────────────
  photo: {
    save: (projectId, date, dataUrl, filename) =>
      ipcRenderer.invoke('photo:save', { projectId, date, dataUrl, filename }),
    list: (projectId, date) =>
      ipcRenderer.invoke('photo:list', { projectId, date }),
  },

  // ── 백업 ─────────────────────────────────────────────
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    list:   () => ipcRenderer.invoke('backup:list'),
  },

  // ── 앱 정보 ──────────────────────────────────────────
  version:    () => ipcRenderer.invoke('app:version'),
  platform:   process.platform,
  isElectron: true,
})

// 기존 호환: ecoreanDB 유지
contextBridge.exposeInMainWorld('ecoreanDB', {
  invoke:     (ch, ...args) => ipcRenderer.invoke(ch, ...args),
  isElectron: true,
})

// ── BOC v6.0 IPC 브리지 (Week 4D~6) ─────────────────────
contextBridge.exposeInMainWorld('boc', {
  cost: {
    loadByCategory:    (category, opts) =>
      ipcRenderer.invoke('boc:cost:loadByCategory', { category, opts }),
    buildLineItems:    (spaces, concept, opts) =>
      ipcRenderer.invoke('boc:cost:buildLineItems', { spaces, concept, opts }),
    getApprovalStatus: (opts) =>
      ipcRenderer.invoke('boc:cost:getApprovalStatus', { opts }),
    approve:  (id)       => ipcRenderer.invoke('boc:cost:approve', { id }),
    update:   (id, opts) => ipcRenderer.invoke('boc:cost:update',  { id, opts })
  },

  kpi: {
    getCurrent:       () => ipcRenderer.invoke('boc:kpi:getCurrent'),
    getActiveCount:   () => ipcRenderer.invoke('boc:kpi:getActiveCount'),
    getMLPhaseStatus: () => ipcRenderer.invoke('boc:kpi:getMLPhaseStatus')
  },

  meta: {
    getVersion: () => ipcRenderer.invoke('boc:meta:getVersion'),
    getPhase:   () => ipcRenderer.invoke('boc:meta:getPhase')
  },

  contract: {
    create: (opts) => ipcRenderer.invoke('boc:contract:create', opts),
    list:   (opts) => ipcRenderer.invoke('boc:contract:list',   opts || {})
  },

  order: {
    create:     (opts)          => ipcRenderer.invoke('boc:order:create',      opts),
    list:       (opts)          => ipcRenderer.invoke('boc:order:list',        opts || {}),
    transition: (id, newStatus) => ipcRenderer.invoke('boc:order:transition',  { id, newStatus })
  },

  schedule: {
    generate:   (opts)          => ipcRenderer.invoke('boc:schedule:generate',   opts),
    list:       (opts)          => ipcRenderer.invoke('boc:schedule:list',        opts || {}),
    transition: (id, newStatus) => ipcRenderer.invoke('boc:schedule:transition', { id, newStatus })
  },

  inspection: {
    create: (opts)     => ipcRenderer.invoke('boc:inspection:create', opts),
    record: (id, opts) => ipcRenderer.invoke('boc:inspection:record', { id, ...opts }),
    list:   (opts)     => ipcRenderer.invoke('boc:inspection:list',   opts || {})
  }
})
