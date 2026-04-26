const { contextBridge, ipcRenderer } = require('electron')

const IPC_CHANNELS = [
  'db:save-project',
  'db:list-projects',
  'db:delete-project',
  'db:save-approval',
  'db:list-approvals',
  'db:save-report',
  'db:migrate-from-local',
]

contextBridge.exposeInMainWorld('ecoreanDB', {
  invoke: (channel, ...args) => {
    if (!IPC_CHANNELS.includes(channel)) {
      return Promise.reject(new Error(`IPC channel not allowed: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },
  isElectron: true,
})
