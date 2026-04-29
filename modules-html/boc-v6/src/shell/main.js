// ECOREAN BOC v6.0 — 진입점
const { App } = require('./App.js');

document.addEventListener('DOMContentLoaded', function() {
  const app = new App({ rootEl: document.getElementById('app') });
  window.BOC = window.BOC || {};
  window.BOC.app = app;
  console.log('%c ECOREAN BOC v6.0 ', 'background: #c9a84c; color: #0a0e1a; font-weight: bold; padding: 4px 8px;');
  console.log('Phase 4 Week 1 — boc-v6 셸 시작');
});
