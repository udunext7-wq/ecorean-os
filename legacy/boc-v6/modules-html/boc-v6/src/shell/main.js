// ECOREAN BOC v6.0 — 진입점
const { App } = require('./App.js');

document.addEventListener('DOMContentLoaded', function() {
  const app = new App({ rootEl: document.getElementById('app') });
  window.BOC = window.BOC || {};
  window.BOC.app = app;
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
