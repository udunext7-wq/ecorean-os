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
