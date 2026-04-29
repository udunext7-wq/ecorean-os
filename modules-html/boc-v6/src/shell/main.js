// ECOREAN BOC v6.0 — 진입점
const { App } = require('./App.js');

document.addEventListener('DOMContentLoaded', function() {
  const app = new App({ rootEl: document.getElementById('app') });
  window.BOC = window.BOC || {};
  window.BOC.app = app;
  console.log('%c ECOREAN BOC v6.0 ', 'background: #c9a84c; color: #0a0e1a; font-weight: bold; padding: 4px 8px;');
  console.log('Phase 4 Week 4-A — cost_items DB + IPC + KPI 3 레이어');
});

// 백그라운드 프리페치 (ESM 모드에서 동작)
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      import('../wizard/entry.js').catch(() => {});
      import('../kpi-dashboard/entry.js').catch(() => {});
    }, 2000);
  });
}
