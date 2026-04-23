/* ECOREAN UI 렌더링 엔진 */
'use strict';

const UI = (() => {
  let toastTimer = null;

  function init() {
    renderTabBar();
    renderTab(MODULES.getCurrentTab());
    bindKeyboard();
  }

  function renderTabBar() {
    const bar = document.getElementById('tabBar');
    if (!bar) return;
    const tabs = MODULES.getTabConfig();
    bar.innerHTML = tabs.map(t => `
      <button class="tab-btn ${t.id === MODULES.getCurrentTab() ? 'active' : ''}"
        data-id="${t.id}" onclick="UI.activateTab(${t.id})" title="${t.label} (Alt+${t.id < 10 ? t.id : t.id === 10 ? '0' : '-'})">
        <span class="tab-icon">${t.icon}</span>
        <span class="tab-label">${t.label}</span>
        ${t.id === 10 ? '<span class="tab-badge">견적</span>' : ''}
      </button>
    `).join('');
  }

  function activateTab(id) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.id) === id);
    });
    MODULES.switchTab(id);
  }

  function renderTab(id) {
    const container = document.getElementById('tabContent');
    if (!container) return;
    container.innerHTML = '<div class="loading">로딩 중...</div>';
    const cfg = MODULES.getTabConfig().find(t => t.id === id);
    if (cfg && cfg.render) {
      try {
        cfg.render(container);
      } catch (e) {
        container.innerHTML = `<div class="error">렌더링 오류: ${e.message}<br><pre>${e.stack}</pre></div>`;
        console.error(e);
      }
    }
  }

  function showToast(msg, type = 'success', duration = 2500) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `toast toast-${type} show`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, duration);
  }

  function showLogin() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  }

  function showApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
  }

  function updateHeaderInfo(user) {
    const el = document.getElementById('headerUser');
    if (el) el.textContent = user;
  }

  /* ── 키보드 단축키: Alt+숫자 → 탭 전환 ── */
  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (!e.altKey) return;
      const appContainer = document.getElementById('appContainer');
      if (!appContainer || appContainer.style.display === 'none') return;

      /* Alt+1~9 → Tab 1~9, Alt+0 → Tab 10, Alt+- → Tab 11, Alt+` → Tab 0 */
      const map = {
        '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
        '6': 6, '7': 7, '8': 8, '9': 9, '0': 10,
        '-': 11, '`': 0
      };
      const tabId = map[e.key];
      if (tabId !== undefined) {
        e.preventDefault();
        activateTab(tabId);
      }

      /* Alt+← / Alt+→ → 이전/다음 탭 */
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const cur = MODULES.getCurrentTab();
        activateTab(cur > 0 ? cur - 1 : 11);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const cur = MODULES.getCurrentTab();
        activateTab(cur < 11 ? cur + 1 : 0);
      }
    });
  }

  return { init, renderTabBar, activateTab, renderTab, showToast, showLogin, showApp, updateHeaderInfo };
})();
