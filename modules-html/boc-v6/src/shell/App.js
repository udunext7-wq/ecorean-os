// ECOREAN BOC v6.0 — App 메인 컨테이너
const { Router } = require('../router/Router.js');

class App {
  constructor(opts) {
    this.rootEl = opts.rootEl || document.getElementById('app');
    this.router = new Router();
    this.currentPage = null;

    this._setupRoutes();
    this._render();
  }

  _setupRoutes() {
    this.router.register('/', this._renderHome.bind(this), { meta: { title: '대시보드' } });
    this.router.register('/wizard', this._renderWizard.bind(this), { meta: { title: '견적 마법자' } });
    this.router.register('/cad', this._renderCAD.bind(this), { meta: { title: 'CAD 평면도' } });
    this.router.register('/kpi', this._renderKPI.bind(this), { meta: { title: 'KPI 대시보드' } });
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
            Phase 4 / Week 1
          </div>
        </header>
        <aside class="app-sidebar">${this._renderSidebar()}</aside>
        <main class="app-main" id="main-content"></main>
      </div>
    `;

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
        <div class="nav-item" data-path="/kpi">KPI 계기판</div>
      </div>
      <div class="nav-section">
        <div class="label">Closed Loop</div>
        <div class="nav-item" data-path="/contracts">계약</div>
        <div class="nav-item" data-path="/orders">발주</div>
        <div class="nav-item" data-path="/schedules">공정</div>
        <div class="nav-item" data-path="/inspections">검수</div>
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
      ${this._renderPageHeader('대시보드', 'ECOREAN BOC v6.0 — Phase 4 Week 1')}
      <div class="card">
        <h3>9주 Phase 3 완주 ✅</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          52개 파일 / 33 테스트 / 147+ assertions / 회귀 0건<br/>
          마스터플랜 재작성 0회 / TDD 강제 작동 3회<br/>
          시뮬레이션 1건 (30평 아파트 + 클래식럭셔리, 16,735,950원)
        </p>
      </div>
      <div class="card">
        <h3>Phase 4 진입</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          Week 1 완료: boc-v6 셸 + 라우팅 + 다크 테마 + esbuild<br/>
          Week 2 진입: 5단 게이트 마법자 UI (G1~G5)
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
    main.innerHTML = '';
    const { WizardPage } = require('../wizard/WizardPage.js');
    new WizardPage({ containerEl: main });
  }
  _renderCAD(path)         { this._renderPlaceholder(path, 'CAD 평면도', 'Phase 4 Week 3'); }
  _renderKPI(path)         { this._renderPlaceholder(path, 'KPI 계기판', 'Phase 4 Week 4'); }
  _renderContracts(path)   { this._renderPlaceholder(path, '계약', 'Phase 4 Week 5'); }
  _renderOrders(path)      { this._renderPlaceholder(path, '발주', 'Phase 4 Week 6'); }
  _renderSchedules(path)   { this._renderPlaceholder(path, '공정', 'Phase 4 Week 6'); }
  _renderInspections(path) { this._renderPlaceholder(path, '검수', 'Phase 4 Week 6'); }
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
