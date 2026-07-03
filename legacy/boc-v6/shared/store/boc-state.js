/**
 * ECOREAN BOC AppState v2.0.0
 * - standalone: localStorage 기반
 * - Electron: IPC 브리지 (window.ecoreanAPI 존재 시 자동 활성화)
 */
;(function (global) {
  'use strict'

  const STORAGE_KEY = 'ecorean-boc-v2'

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

  let _state     = JSON.parse(JSON.stringify(DEFAULT_STATE))
  let _listeners = []
  let _saving    = false
  let _ipcReady  = false

  function get() { return _state }

  function set(patch) {
    Object.assign(_state, patch)
    _notify()
    _save()
    // IPC: 다른 뷰에 브로드캐스트
    if (_ipcReady && global.ecoreanAPI?.setState) {
      global.ecoreanAPI.setState(patch).catch(function(){})
    }
  }

  function _notify() {
    for (const fn of _listeners) {
      try { fn(_state) } catch(e) { console.error('[AppState] listener:', e) }
    }
  }

  function subscribe(fn) {
    _listeners.push(fn)
    return function () { _listeners = _listeners.filter(function(f){ return f!==fn }) }
  }

  function _save() {
    if (_saving) return
    _saving = true
    try { global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(_state)) } catch(e) {}
    _saving = false
  }

  function load() {
    // 1. IPC에서 최신 상태 로드 시도
    if (global.ecoreanAPI?.getState) {
      global.ecoreanAPI.getState().then(function(savedState) {
        if (savedState && typeof savedState === 'object') {
          _state = Object.assign({}, DEFAULT_STATE, savedState)
          _notify()
        }
      }).catch(function(){
        _loadLocal()
      })
      return
    }
    _loadLocal()
  }

  function _loadLocal() {
    try {
      const raw = global.localStorage?.getItem(STORAGE_KEY)
      if (!raw) return
      _state = Object.assign({}, DEFAULT_STATE, JSON.parse(raw))
    } catch(e) {
      console.warn('[AppState] load failed, using defaults')
      _state = JSON.parse(JSON.stringify(DEFAULT_STATE))
    }
  }

  function reset() {
    _state = JSON.parse(JSON.stringify(DEFAULT_STATE))
    try { global.localStorage?.removeItem(STORAGE_KEY) } catch(e) {}
    _notify()
  }

  // IPC 수신: 다른 뷰에서 상태 변경 시 반영
  function _initIPC() {
    if (!global.ecoreanAPI) return
    _ipcReady = true
    if (global.ecoreanAPI.onStateChanged) {
      global.ecoreanAPI.onStateChanged(function(newState) {
        _state = Object.assign({}, DEFAULT_STATE, newState)
        _notify()
      })
    }
    console.log('[AppState] IPC 브리지 활성화')
  }

  // DOM 로드 후 IPC 초기화
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', _initIPC)
    } else {
      _initIPC()
    }
  }

  global.AppState = { get, set, subscribe, load, reset }
})(typeof window !== 'undefined' ? window : global)
