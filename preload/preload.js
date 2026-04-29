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
  }
});
