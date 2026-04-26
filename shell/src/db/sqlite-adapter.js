// Thin wrapper: uses window.ecoreanDB (Electron) or falls back to no-op
const isElectron = typeof window !== 'undefined' && window.ecoreanDB?.isElectron

const invoke = isElectron
  ? (ch, ...args) => window.ecoreanDB.invoke(ch, ...args)
  : () => Promise.resolve(null)

export const sqliteAdapter = {
  isAvailable: isElectron,

  saveProject: (project) => invoke('db:save-project', project),
  listProjects: ()         => invoke('db:list-projects'),
  deleteProject: (id)      => invoke('db:delete-project', id),

  saveApproval: (entry)    => invoke('db:save-approval', entry),
  listApprovals: ()        => invoke('db:list-approvals'),

  saveReport: (report)     => invoke('db:save-report', report),

  migrateFromLocal: (data) => invoke('db:migrate-from-local', data),
}
