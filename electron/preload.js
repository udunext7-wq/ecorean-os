const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ecoreanAPI', {
  version: () => ipcRenderer.invoke('app:version'),
  platform: process.platform,
});
