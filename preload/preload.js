// ECOREAN BOC v6.0 — Electron Preload
// 브라우저에 안전하게 IPC API 노출 (contextBridge)

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('boc', {
  cost: {
    loadByCategory:    (category, opts) =>
      ipcRenderer.invoke('boc:cost:loadByCategory', { category, opts }),
    buildLineItems:    (spaces, concept, opts) =>
      ipcRenderer.invoke('boc:cost:buildLineItems', { spaces, concept, opts }),
    getApprovalStatus: (opts) =>
      ipcRenderer.invoke('boc:cost:getApprovalStatus', { opts }),
    approve:  (id) =>    ipcRenderer.invoke('boc:cost:approve', { id }),
    update:   (id, opts) => ipcRenderer.invoke('boc:cost:update', { id, opts })
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
    create: (opts)       => ipcRenderer.invoke('boc:inspection:create', opts),
    record: (id, opts)   => ipcRenderer.invoke('boc:inspection:record', { id, ...opts }),
    list:   (opts)       => ipcRenderer.invoke('boc:inspection:list',   opts || {})
  },

  ai: {
    query:     (opts) => ipcRenderer.invoke('boc:ai:query',     opts),
    getConfig: ()     => ipcRenderer.invoke('boc:ai:getConfig')
  },

  ml: {
    countLearning: () => ipcRenderer.invoke('boc:ml:countLearning')
  },

  sla: {
    measure: () => ipcRenderer.invoke('boc:sla:measure')
  }
});
