import EventEmitter from 'eventemitter3'

export const bus = new EventEmitter()

export const EVENTS = {
  SPACES_CHANGE: 'spaces:change',
  ESTIMATE_COMPLETE: 'estimate:complete',
  APPROVAL_REQUEST: 'approval:request',
  DB_UPDATE: 'db:update',
  TAB_CHANGE: 'tab:change',
  CAD_SYNC: 'cad:sync',
  RECALC: 'recalc',
}
