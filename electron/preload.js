/**
 * ECOREAN BOC — Electron Preload
 * contextBridge로 IPC 채널을 렌더러에 노출
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ecoreanAPI', {
  // ── 상태 공유 ─────────────────────────────────────────
  getState:      ()      => ipcRenderer.invoke('state:get'),
  setState:      (patch) => ipcRenderer.invoke('state:set', patch),
  onStateChanged:(cb)    => ipcRenderer.on('state:changed', (_, s) => cb(s)),

  // ── 탭 전환 (모듈 → 셸) ──────────────────────────────
  switchTab:   (tabId) => ipcRenderer.send('tab:switch', tabId),
  onTabSwitch: (cb)    => ipcRenderer.on('tab:switch', (_, id) => cb(id)),

  // ── KPI 갱신 (모듈 → 셸) ─────────────────────────────
  updateKPI:  (data) => ipcRenderer.send('kpi:update', data),
  onKPIUpdate:(cb)   => ipcRenderer.on('kpi:update', (_, d) => cb(d)),

  // ── SQLite ────────────────────────────────────────────
  db: {
    saveProject:   (proj) => ipcRenderer.invoke('db:save-project', proj),
    listProjects:  ()     => ipcRenderer.invoke('db:list-projects'),
    deleteProject: (id)   => ipcRenderer.invoke('db:delete-project', id),
    saveApproval:  (req)  => ipcRenderer.invoke('db:save-approval', req),
    listApprovals: ()     => ipcRenderer.invoke('db:list-approvals'),
  },

  // ── 앱 정보 ───────────────────────────────────────────
  version:    () => ipcRenderer.invoke('app:version'),
  platform:   process.platform,
  isElectron: true,
})

// 기존 호환: ecoreanDB 유지
contextBridge.exposeInMainWorld('ecoreanDB', {
  invoke:     (ch, ...args) => ipcRenderer.invoke(ch, ...args),
  isElectron: true,
})
