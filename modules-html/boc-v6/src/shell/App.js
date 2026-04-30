// ECOREAN BOC v6.0 — App 메인 컨테이너
const { Router } = require('../router/Router.js');

class App {
  constructor(opts) {
    this.rootEl = opts.rootEl || document.getElementById('app');
    this.router        = new Router();
    this.currentPage   = null;
    this.globalKPI     = null;
    this.currentContract = null;
    this.currentInput    = null;

    document.addEventListener('boc:contract:created', (e) => {
      this.currentContract = e.detail.contract;
      this.currentInput    = e.detail.input || {};
    });

    this._setupRoutes();
    this._render();
  }

  _setupRoutes() {
    this.router.register('/', this._renderHome.bind(this), { meta: { title: '대시보드' } });
    this.router.register('/wizard', this._renderWizard.bind(this), { meta: { title: '견적 마법자' } });
    this.router.register('/cad', this._renderCAD.bind(this), { meta: { title: 'CAD 평면도' } });
    this.router.register('/kpi', this._renderKPI.bind(this), { meta: { title: 'KPI 대시보드' } });
    this.router.register('/admin/costs', this._renderAdminCosts.bind(this), { meta: { title: '단가 관리' } });
    this.router.register('/contracts', this._renderContracts.bind(this), { meta: { title: '계약' } });
    this.router.register('/orders', this._renderOrders.bind(this), { meta: { title: '발주' } });
    this.router.register('/schedules', this._renderSchedules.bind(this), { meta: { title: '공정' } });
    this.router.register('/inspections', this._renderInspections.bind(this), { meta: { title: '검수' } });
    this.router.register('/topology', this._renderTopology.bind(this), { meta: { title: '시스템 토폴로지' } });
    this.router.register('/ai-executive', this._renderAIExecutive.bind(this), { meta: { title: 'AI 임원' } });
    this.router.setNotFound(this._render404.bind(this));
  }

  _render() {
    this.rootEl.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <h1>ECOREAN BOC v6.0</h1>
          <div class="spacer"></div>
          <div class="status">
            <span class="live">● LIVE</span>
            Phase 4 / Week 6
          </div>
        </header>
        <div class="app-kpibar" id="global-kpi-bar"></div>
        <aside class="app-sidebar">${this._renderSidebar()}</aside>
        <main class="app-main" id="main-content"></main>
      </div>
    `;

    try {
      const { GlobalKPIBar } = require('../components/GlobalKPIBar.js');
      this.globalKPI = new GlobalKPIBar({
        containerEl: document.getElementById('global-kpi-bar')
      });
    } catch(e) {
      console.warn('[App] GlobalKPIBar 로드 실패:', e.message);
    }

    this.rootEl.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        const path = el.dataset.path;
        this.router.navigate(path);
      });
    });

    this.router.start();
  }

  _renderSidebar() {
    return `
      <div class="nav-section">
        <div class="label">메인</div>
        <div class="nav-item" data-path="/">대시보드</div>
        <div class="nav-item" data-path="/wizard">견적 마법자</div>
      </div>
      <div class="nav-section">
        <div class="label">제작</div>
        <div class="nav-item" data-path="/cad">CAD 평면도</div>
        <div class="nav-item" data-path="/kpi">KPI 대시보드</div>
      </div>
      <div class="nav-section">
        <div class="label">Closed Loop</div>
        <div class="nav-item" data-path="/contracts">계약</div>
        <div class="nav-item" data-path="/orders">발주</div>
        <div class="nav-item" data-path="/schedules">공정</div>
        <div class="nav-item" data-path="/inspections">검수</div>
      </div>
      <div class="nav-section">
        <div class="label">관리</div>
        <div class="nav-item" data-path="/admin/costs">단가 관리</div>
      </div>
      <div class="nav-section">
        <div class="label">시스템</div>
        <div class="nav-item" data-path="/topology">토폴로지</div>
        <div class="nav-item" data-path="/ai-executive">AI 임원</div>
      </div>
    `;
  }

  _setActiveNav(path) {
    this.rootEl.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.path === path);
    });
  }

  _renderPageHeader(title, subtitle) {
    return `
      <div class="page-header">
        <h2>${title}</h2>
        <div class="subtitle">${subtitle || ''}</div>
      </div>
    `;
  }

  _renderHome(path) {
    this._setActiveNav(path);
    document.getElementById('main-content').innerHTML = `
      ${this._renderPageHeader('대시보드', 'ECOREAN BOC v6.0 — Phase 4 Week 5')}
      <div class="card">
        <h3>Phase 4 Week 5 완료 ✅</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          계약 화면 (ContractPage) + PDF 견적서 출력 + CAD 라우트 활성화<br/>
          ContractController (IPC + 로컬 fallback) + EstimatePDF (window.print)<br/>
          DRAFT → SIGNED → CANCELED 상태 전이 + 고객 정보 폼
        </p>
      </div>
      <div class="card">
        <h3>Phase 4 진행 현황</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          ✅ Week 1: boc-v6 셸 + 라우팅 + 다크 테마 + esbuild<br/>
          ✅ Week 2: 5단 게이트 마법자 UI (G1~G5)<br/>
          ✅ Week 3: CAD L1 평면도 인터랙티브 (Konva.js)<br/>
          ✅ Week 4-A: cost_items DB + IPC + 노드분리 + KPI 3레이어<br/>
          ✅ Week 5: 계약 화면 + PDF 견적서 출력
        </p>
      </div>
    `;
  }

  _renderPlaceholder(path, title, weekTarget) {
    this._setActiveNav(path);
    document.getElementById('main-content').innerHTML = `
      ${this._renderPageHeader(title, weekTarget + ' 활성화 예정')}
      <div class="card">
        <h3>준비 중</h3>
        <p style="color: var(--text-dim);">본 화면은 ${weekTarget}에서 활성화됩니다.</p>
      </div>
    `;
  }

  _renderWizard(path) {
    this._setActiveNav(path);
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="padding: 40px; color: var(--gold);">로딩 중...</div>';
    try {
      const { WizardPage } = require('../wizard/WizardPage.js');
      main.innerHTML = '';
      new WizardPage({ containerEl: main });
    } catch(e) {
      main.innerHTML = `<div class="card"><p style="color: var(--negative);">마법자 로드 실패: ${e.message}</p></div>`;
    }
  }

  _renderKPI(path) {
    this._setActiveNav(path);
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="padding: 40px; color: var(--gold);">KPI 로딩 중...</div>';
    try {
      const { KPIDashboardPage } = require('../kpi-dashboard/KPIDashboardPage.js');
      main.innerHTML = '';
      new KPIDashboardPage({ containerEl: main });
    } catch(e) {
      main.innerHTML = `<div class="card"><p style="color: var(--negative);">KPI 로드 실패: ${e.message}</p></div>`;
    }
  }

  _renderAdminCosts(path) {
    this._setActiveNav('/admin/costs');
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="padding: 40px; color: var(--gold);">로딩 중...</div>';
    try {
      const { CostsAdminPage } = require('../admin/CostsAdminPage.js');
      main.innerHTML = '';
      new CostsAdminPage({ containerEl: main });
    } catch(e) {
      main.innerHTML = `<div class="card"><p style="color: var(--negative);">단가관리 로드 실패: ${e.message}</p></div>`;
    }
  }

  _renderCAD(path) {
    this._setActiveNav(path);
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="padding: 40px; color: var(--gold);">CAD 로딩 중...</div>';
    try {
      const { CADCanvas }     = require('../cad/CADCanvas.js');
      const { CADToolbar }    = require('../cad/components/CADToolbar.js');
      const { CADSpacesList } = require('../cad/components/CADSpacesList.js');
      main.innerHTML = `
        <div style="padding: 16px;">
          ${this._renderPageHeader('CAD 평면도', 'L1 인터랙티브 — 사각형 드래그로 공간 추가')}
          <div id="cad-toolbar-area"></div>
          <div style="display:grid; grid-template-columns:1fr 220px; gap:12px; margin-top:12px;">
            <div id="cad-canvas-area"></div>
            <div id="cad-spaces-area"></div>
          </div>
        </div>
      `;
      const canvas = new CADCanvas({
        containerEl: main.querySelector('#cad-canvas-area'),
        width: 760, height: 520
      });
      new CADToolbar({ containerEl: main.querySelector('#cad-toolbar-area'), canvas });
      new CADSpacesList({ containerEl: main.querySelector('#cad-spaces-area'), canvas });
    } catch(e) {
      main.innerHTML = `<div class="card"><p style="color: var(--negative);">CAD 로드 실패: ${e.message}</p></div>`;
    }
  }

  _renderContracts(path) {
    this._setActiveNav(path);
    const main = document.getElementById('main-content');
    main.innerHTML = `
      ${this._renderPageHeader('계약 목록', '마법자에서 견적 완성 후 계약서 작성')}
      <div class="card">
        <h3>계약 화면 안내</h3>
        <p style="color: var(--text-dim); line-height: 1.7;">
          견적 마법자(G1→G5)를 완료하면 자동으로 계약서 작성 화면이 나타납니다.<br/>
          고객명 / 연락처 / 공사 주소 입력 → 계약 초안 → 서명 완료 → PDF 출력
        </p>
        <div style="margin-top: 16px;">
          <button class="primary" onclick="window.location.hash='#/wizard'">견적 마법자로 이동</button>
        </div>
      </div>
    `;
  }
  _renderOrders(path) {
    this._setActiveNav(path);
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    try {
      const { OrdersPage } = require('../orders/OrdersPage.js');
      new OrdersPage({
        containerEl: main,
        contractId:  this.currentContract?.id || null
      });
    } catch(e) {
      main.innerHTML = `<div class="card"><p style="color:var(--negative)">발주 로드 실패: ${e.message}</p></div>`;
    }
  }

  _renderSchedules(path) {
    this._setActiveNav(path);
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    try {
      const { SchedulesPage } = require('../schedules/SchedulesPage.js');
      new SchedulesPage({
        containerEl: main,
        contractId:  this.currentContract?.id || null,
        sections:    this.currentInput?.sections || []
      });
    } catch(e) {
      main.innerHTML = `<div class="card"><p style="color:var(--negative)">공정 로드 실패: ${e.message}</p></div>`;
    }
  }

  _renderInspections(path) {
    this._setActiveNav(path);
    const main = document.getElementById('main-content');
    main.innerHTML = '';
    try {
      const { InspectionsPage } = require('../inspections/InspectionsPage.js');
      new InspectionsPage({
        containerEl: main,
        contractId:  this.currentContract?.id || null
      });
    } catch(e) {
      main.innerHTML = `<div class="card"><p style="color:var(--negative)">검수 로드 실패: ${e.message}</p></div>`;
    }
  }
  _renderTopology(path)    { this._renderPlaceholder(path, '시스템 토폴로지', 'Phase 4 Week 7'); }
  _renderAIExecutive(path) { this._renderPlaceholder(path, 'AI 임원 대시보드', 'Phase 4 Week 7'); }

  _render404(path) {
    document.getElementById('main-content').innerHTML = `
      ${this._renderPageHeader('404', '경로 없음: ' + path)}
      <div class="card">
        <p style="color: var(--text-dim);">요청하신 경로는 존재하지 않습니다.</p>
        <button onclick="location.hash='#/'">홈으로</button>
      </div>
    `;
  }
}

module.exports = { App: App };
