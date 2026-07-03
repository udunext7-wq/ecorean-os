# ECOREAN BOC — Phase 4 Week 1 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 태그 v5.7.0 (Phase 3 완료)
> **이번 주 목표:** boc-v6 통합 셸 신설 + 라우팅 + 다크 테마 + esbuild 번들링
> **소요:** 자율 실행 3~4시간
> **의의:** Phase 3 25 모듈을 브라우저에서 사용 가능하게 만드는 첫 주차

---

## 절대 규칙 (Phase 4 전 기간)

1. TDD 강제 — UI도 가능한 부분은 테스트 먼저
2. 버그 있는 코드 커밋 금지
3. **estimate.html · boc-shell.html 직접 수정 금지** (13단계 디자인 작업 보호)
4. 22/23/12/6/5 변경 금지 (헌법)
5. Phase 3 25 모듈 시그니처 변경 금지 (확장만 가능)
6. graph.json + MASTER_PLAN v5.7 변경 금지 (지금은 추가만)
7. 9탭 회귀 0건 검증 후만 다음 단계
8. Phase 3에서 박은 .cjs는 그대로, ESM 빌드는 별도

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # e45cd0f, v5.7.0 태그 확인
git pull origin master
git tag | grep v5.7    # v5.7.0 존재 확인

# 최종 백업
node scripts/backup.cjs --label phase4_week1_pre

# Phase 3 회귀 (전체 PASS 확인)
node test-engine.js
node shell/src/feature-flags/__tests__/flags.test.cjs
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조

```bash
mkdir -p modules-html/boc-v6/src/shell
mkdir -p modules-html/boc-v6/src/router
mkdir -p modules-html/boc-v6/src/components
mkdir -p modules-html/boc-v6/src/styles
mkdir -p modules-html/boc-v6/build
mkdir -p modules-html/boc-v6/__tests__
```

---

## 작업 2: esbuild 번들링 설정

### 2-1. modules-html/boc-v6/build.config.cjs

```javascript
// ECOREAN BOC v6.0 — esbuild 번들링 설정
// 목적: Phase 3 .cjs 모듈을 브라우저에서 사용 가능하게 변환
// 결과물: modules-html/boc-v6/build/boc-v6.bundle.js

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const config = {
  entryPoints: [path.join(__dirname, 'src/shell/main.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',                  // 즉시 실행 함수 — window.BOC 노출
  globalName: 'BOC',
  outfile: path.join(__dirname, 'build', 'boc-v6.bundle.js'),
  sourcemap: 'inline',
  target: ['es2020'],

  // .cjs 파일도 처리
  resolveExtensions: ['.js', '.cjs', '.mjs'],

  // Phase 3 백엔드 모듈 alias
  alias: {
    '@core-bus':     path.join(ROOT, 'shell/src/core-bus'),
    '@gates':        path.join(ROOT, 'shell/src/gates'),
    '@meta':         path.join(ROOT, 'shell/src/meta'),
    '@korea':        path.join(ROOT, 'shell/src/korea'),
    '@security':     path.join(ROOT, 'shell/src/security'),
    '@closed-loop':  path.join(ROOT, 'shell/src/closed-loop'),
    '@ml':           path.join(ROOT, 'shell/src/ml'),
    '@feature-flags':path.join(ROOT, 'shell/src/feature-flags'),
    '@estimate-v6':  path.join(ROOT, 'modules-html/estimate-v6/src'),
    '@kpi-v6':       path.join(ROOT, 'modules-html/kpi-v6/src'),
    '@cad':          path.join(ROOT, 'modules-html/cad/src')
  },

  // 브라우저에서 못 쓰는 Node 전용 모듈은 외부화 + 브라우저 폴리필
  external: [
    'better-sqlite3',                // DB 액세스는 IPC로 분리
    'crypto',                        // 브라우저 crypto.subtle 사용
    'fs',                            // 파일 시스템 미사용
    'path'                           // 폴리필
  ],

  // 환경 변수
  define: {
    'process.env.NODE_ENV': '"development"',
    '__BOC_VERSION__': '"6.0.0-alpha.1"'
  },

  logLevel: 'info'
};

module.exports = { config: config, ROOT: ROOT };
```

### 2-2. modules-html/boc-v6/build.cjs

```javascript
#!/usr/bin/env node
// 빌드 실행 스크립트
const esbuild = require('esbuild');
const { config } = require('./build.config.cjs');

async function build() {
  try {
    const result = await esbuild.build(config);
    console.log('[PASS] boc-v6 번들 빌드 완료');
    console.log('  결과: ' + config.outfile);
    if (result.warnings && result.warnings.length > 0) {
      console.warn('  경고: ' + result.warnings.length + '건');
    }
  } catch (e) {
    console.error('[FAIL] 빌드 실패:', e.message);
    process.exit(1);
  }
}

if (require.main === module) build();

module.exports = { build: build };
```

### 2-3. esbuild 설치 확인

```bash
# 이미 설치되어 있으면 skip
node -e "require('esbuild'); console.log('esbuild OK')" 2>/dev/null || npm install --save-dev esbuild
```

---

## 작업 3: 다크 + 골드 테마 CSS

### 3-1. modules-html/boc-v6/src/styles/theme.css

```css
/* ECOREAN BOC v6.0 — 다크 + 골드 에디토리얼 테마 */
/* SoT: 13단계 디자인과 호환되는 색상 팔레트 */

:root {
  /* Background */
  --bg:         #0a0e1a;
  --bg-2:       #14182a;
  --bg-3:       #1c2138;
  --bg-card:    rgba(20, 24, 42, 0.6);

  /* Gold (Primary Accent) */
  --gold:        #c9a84c;
  --gold-bright: #ffd700;
  --gold-dim:    rgba(201, 168, 76, 0.5);
  --gold-faint:  rgba(201, 168, 76, 0.15);

  /* Text */
  --text:        #ede5d5;
  --text-dim:    rgba(237, 229, 213, 0.6);
  --text-faint:  rgba(237, 229, 213, 0.35);

  /* Status */
  --positive:    #4caf50;
  --negative:    #f44336;
  --warning:     #ff9800;
  --info:        #2196f3;

  /* Component Specific */
  --gate:        #4a90e2;
  --module:      #50c878;
  --engine:      #e8a534;
  --ml:          #c9a84c;

  /* Layout */
  --sidebar-width: 240px;
  --header-height: 56px;
  --border-radius: 4px;

  /* Typography */
  --font-display: 'Cinzel', 'Noto Sans KR', serif;
  --font-body:    'Noto Sans KR', sans-serif;
  --font-mono:    'JetBrains Mono', 'Courier New', monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  height: 100vh;
  overflow: hidden;
}

a {
  color: var(--gold);
  text-decoration: none;
  transition: color 0.2s;
}
a:hover { color: var(--gold-bright); }

button {
  background: transparent;
  border: 1px solid var(--gold-faint);
  color: var(--text);
  padding: 8px 16px;
  border-radius: var(--border-radius);
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s;
}
button:hover {
  border-color: var(--gold);
  background: var(--gold-faint);
}
button.primary {
  background: var(--gold);
  color: var(--bg);
  border-color: var(--gold);
}
button.primary:hover {
  background: var(--gold-bright);
  color: var(--bg);
}

input, select, textarea {
  background: var(--bg-2);
  border: 1px solid var(--gold-faint);
  color: var(--text);
  padding: 8px 12px;
  border-radius: var(--border-radius);
  font-family: var(--font-body);
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--gold);
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--gold-faint); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--gold-dim); }
```

### 3-2. modules-html/boc-v6/src/styles/layout.css

```css
/* Layout — Header + Sidebar + Main */

.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--header-height) 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
}

.app-header {
  grid-area: header;
  background: linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
  border-bottom: 1px solid var(--gold-faint);
  display: flex;
  align-items: center;
  padding: 0 24px;
}
.app-header h1 {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 16px;
  letter-spacing: 0.16em;
  text-shadow: 0 0 12px var(--gold-faint);
}
.app-header .spacer { flex: 1; }
.app-header .status {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
}
.app-header .status .live { color: var(--positive); }

.app-sidebar {
  grid-area: sidebar;
  background: var(--bg-2);
  border-right: 1px solid var(--gold-faint);
  padding: 16px 0;
  overflow-y: auto;
}
.nav-section {
  margin-bottom: 16px;
}
.nav-section .label {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 0 24px 8px;
  border-bottom: 1px solid var(--gold-faint);
  margin-bottom: 8px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
  border-left: 2px solid transparent;
}
.nav-item:hover {
  color: var(--text);
  background: var(--gold-faint);
}
.nav-item.active {
  color: var(--gold);
  background: var(--gold-faint);
  border-left-color: var(--gold);
}
.nav-item .icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

.app-main {
  grid-area: main;
  overflow-y: auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--gold-faint);
}
.page-header h2 {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 20px;
  letter-spacing: 0.12em;
}
.page-header .subtitle {
  color: var(--text-dim);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-top: 4px;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 24px;
  margin-bottom: 16px;
  position: relative;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%);
  opacity: 0.6;
}
.card h3 {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 14px;
  letter-spacing: 0.12em;
  margin-bottom: 16px;
}
```

---

## 작업 4: 라우터 (해시 기반 SPA)

### 4-1. modules-html/boc-v6/src/router/Router.js

```javascript
// ECOREAN BOC v6.0 — Hash-based SPA Router
// 단순한 해시 라우팅 (외부 라이브러리 없음)

class Router {
  constructor() {
    this.routes = new Map();
    this.notFoundHandler = null;
    this.beforeHooks = [];
    this.currentPath = null;
  }

  // 라우트 등록
  register(path, handler, opts) {
    this.routes.set(path, {
      handler: handler,
      meta: (opts && opts.meta) || {}
    });
  }

  // 404 핸들러
  setNotFound(handler) {
    this.notFoundHandler = handler;
  }

  // 진입 전 훅 (인증, 권한 등)
  beforeEach(hook) {
    this.beforeHooks.push(hook);
  }

  // 시작
  start() {
    window.addEventListener('hashchange', this._onHashChange.bind(this));
    this._onHashChange();
  }

  // 프로그래매틱 이동
  navigate(path) {
    window.location.hash = path;
  }

  _onHashChange() {
    const hash = window.location.hash || '#/';
    const path = hash.replace(/^#/, '') || '/';

    // beforeEach 훅
    for (let hook of this.beforeHooks) {
      const result = hook(path, this.currentPath);
      if (result === false) return;   // 차단
    }

    const route = this.routes.get(path);
    if (route) {
      this.currentPath = path;
      route.handler(path, route.meta);
    } else if (this.notFoundHandler) {
      this.notFoundHandler(path);
    }
  }

  getCurrentPath() {
    return this.currentPath;
  }
}

module.exports = { Router: Router };
```

### 4-2. modules-html/boc-v6/__tests__/Router.test.cjs

```javascript
const { Router } = require('../src/router/Router.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// 브라우저 환경 시뮬레이션 (window.location.hash, addEventListener)
global.window = {
  location: { hash: '' },
  addEventListener: function() {}
};

// Test 1: register + 핸들러 호출
(function() {
  const r = new Router();
  let called = false;
  r.register('/test', function() { called = true; });
  // 시작 전 hash 설정
  global.window.location.hash = '#/test';
  r.start();
  assert(called === true, 'route 핸들러 호출');
})();

// Test 2: 404 핸들러
(function() {
  const r = new Router();
  let notFoundCalled = null;
  r.setNotFound(function(path) { notFoundCalled = path; });
  global.window.location.hash = '#/unknown';
  r.start();
  assert(notFoundCalled === '/unknown', '404 호출');
})();

// Test 3: beforeEach 차단
(function() {
  const r = new Router();
  let handlerCalled = false;
  r.register('/blocked', function() { handlerCalled = true; });
  r.beforeEach(function() { return false; });   // 차단
  global.window.location.hash = '#/blocked';
  r.start();
  assert(handlerCalled === false, 'beforeEach 차단');
})();

// Test 4: 라우트 메타
(function() {
  const r = new Router();
  let receivedMeta = null;
  r.register('/with-meta', function(path, meta) { receivedMeta = meta; }, { meta: { title: 'Test' } });
  global.window.location.hash = '#/with-meta';
  r.start();
  assert(receivedMeta && receivedMeta.title === 'Test', '메타 전달');
})();

// Test 5: getCurrentPath
(function() {
  const r = new Router();
  r.register('/current', function() {});
  global.window.location.hash = '#/current';
  r.start();
  assert(r.getCurrentPath() === '/current', 'currentPath');
})();

console.log('[PASS] Router (5/5)');
```

### 4-3. 검증

```bash
node modules-html/boc-v6/__tests__/Router.test.cjs
# 기대: [PASS] Router (5/5)
```

---

## 작업 5: 메인 셸 (App + 라우트)

### 5-1. modules-html/boc-v6/src/shell/App.js

```javascript
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
    // 메인
    this.router.register('/', this._renderHome.bind(this), {
      meta: { title: '대시보드', icon: 'home' }
    });

    // 5단 게이트 마법자 (Week 2)
    this.router.register('/wizard', this._renderWizard.bind(this), {
      meta: { title: '견적 마법자', icon: 'wizard' }
    });

    // CAD (Week 3)
    this.router.register('/cad', this._renderCAD.bind(this), {
      meta: { title: 'CAD 평면도', icon: 'cad' }
    });

    // KPI (Week 4)
    this.router.register('/kpi', this._renderKPI.bind(this), {
      meta: { title: 'KPI 대시보드', icon: 'kpi' }
    });

    // Closed Loop (Week 5~6)
    this.router.register('/contracts', this._renderContracts.bind(this), {
      meta: { title: '계약', icon: 'contract' }
    });
    this.router.register('/orders', this._renderOrders.bind(this), {
      meta: { title: '발주', icon: 'order' }
    });
    this.router.register('/schedules', this._renderSchedules.bind(this), {
      meta: { title: '공정', icon: 'schedule' }
    });
    this.router.register('/inspections', this._renderInspections.bind(this), {
      meta: { title: '검수', icon: 'inspection' }
    });

    // 시스템 (Week 7)
    this.router.register('/topology', this._renderTopology.bind(this), {
      meta: { title: '시스템 토폴로지', icon: 'graph' }
    });
    this.router.register('/ai-executive', this._renderAIExecutive.bind(this), {
      meta: { title: 'AI 임원', icon: 'ai' }
    });

    // 404
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
        <aside class="app-sidebar">
          ${this._renderSidebar()}
        </aside>
        <main class="app-main" id="main-content">
          <!-- 페이지 내용 -->
        </main>
      </div>
    `;

    // 사이드바 클릭 → 라우트 이동
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
          25개 모듈 / 147+ assertions / 회귀 0건<br/>
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
        <p style="color: var(--text-dim);">
          본 화면은 ${weekTarget}에서 활성화됩니다.
        </p>
      </div>
    `;
  }

  _renderWizard(path)      { this._renderPlaceholder(path, '견적 마법자', 'Phase 4 Week 2'); }
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
```

### 5-2. modules-html/boc-v6/src/shell/main.js

```javascript
// ECOREAN BOC v6.0 — 진입점

const { App } = require('./App.js');

document.addEventListener('DOMContentLoaded', function() {
  const app = new App({ rootEl: document.getElementById('app') });
  window.BOC = window.BOC || {};
  window.BOC.app = app;
  console.log('%c ECOREAN BOC v6.0 ', 'background: #c9a84c; color: #0a0e1a; font-weight: bold; padding: 4px 8px;');
  console.log('Phase 4 Week 1 — boc-v6 셸 시작');
});
```

---

## 작업 6: index.html (진입 HTML)

### 6-1. modules-html/boc-v6/index.html

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>ECOREAN BOC v6.0</title>
<link rel="stylesheet" href="src/styles/theme.css">
<link rel="stylesheet" href="src/styles/layout.css">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Sans+KR:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
<div id="app">
  <!-- App.js가 여기 렌더링 -->
  <div style="padding: 40px; color: #c9a84c; font-family: 'Cinzel', serif; text-align: center;">
    Loading ECOREAN BOC v6.0...
  </div>
</div>
<script src="build/boc-v6.bundle.js"></script>
</body>
</html>
```

---

## 작업 7: 빌드 + 검증

### 7-1. esbuild 번들 생성

```bash
node modules-html/boc-v6/build.cjs
# 기대: [PASS] boc-v6 번들 빌드 완료
#        결과: modules-html/boc-v6/build/boc-v6.bundle.js
```

### 7-2. 라우터 테스트

```bash
node modules-html/boc-v6/__tests__/Router.test.cjs
# 기대: [PASS] Router (5/5)
```

### 7-3. Phase 3 회귀 (전체 회귀 0건 검증)

```bash
node test-engine.js                                              # 5/5
node shell/src/feature-flags/__tests__/flags.test.cjs           # 6/6

# Phase 3 핵심 모듈 회귀
node shell/src/core-bus/__tests__/CoreBus.test.cjs              # 7/7
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs        # PASS
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs # PASS
node modules-html/kpi-v6/__tests__/E2E_kpi_full.test.cjs         # PASS
node shell/src/closed-loop/__tests__/Contract.test.cjs           # 10/10
```

### 7-4. 브라우저 검증 (수동)

```
1. modules-html/boc-v6/index.html을 브라우저로 열기
2. 다크 + 골드 테마 표시 확인
3. 사이드바 메뉴 클릭 → 라우팅 작동 확인
4. 콘솔에 "ECOREAN BOC v6.0" 배너 출력 확인
5. /wizard, /cad 등 클릭 시 "준비 중" 화면 표시
```

---

## 작업 8: PHASE_4A_COMPLETE 활성화

### 8-1. shell/src/feature-flags/flags.cjs에 추가

```javascript
// Phase 4 진행 상태 (신규 섹션 추가)
PHASE_4A_COMPLETE:      true,    // Week 1 셸 완료
PHASE_4B_COMPLETE:      false,
PHASE_4C_COMPLETE:      false,
PHASE_4D_COMPLETE:      false,
PHASE_4E_COMPLETE:      false,
PHASE_4F_COMPLETE:      false,
PHASE_4G_COMPLETE:      false,
PHASE_4H_COMPLETE:      false,
PHASE_4I_COMPLETE:      false,

// boc-v6 셸 (Week 1)
USE_BOC_V6_SHELL:       true     // 신규 셸 활성
```

### 8-2. flags 테스트 갱신

```javascript
// Test 1에 추가
assert(isEnabled('PHASE_4A_COMPLETE') === true, 'PHASE_4A_COMPLETE Week1 완료');
assert(isEnabled('USE_BOC_V6_SHELL') === true, 'boc-v6 셸 활성');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
# 기대: [PASS] feature-flags (6/6)
```

---

## 작업 9: 커밋 (3개 분리 + push)

```bash
# 커밋 1: esbuild + 다크 테마 + 라우터
git add modules-html/boc-v6/build.config.cjs modules-html/boc-v6/build.cjs modules-html/boc-v6/src/styles/ modules-html/boc-v6/src/router/ modules-html/boc-v6/__tests__/Router.test.cjs
git commit -m "feat(v6/shell): boc-v6 셸 인프라 — esbuild + 다크 테마 + Hash 라우터 (5/5 PASS)

- build.config.cjs: Phase 3 .cjs 모듈을 브라우저 번들로 변환
  - alias: @core-bus, @gates, @meta, @korea, @security, @closed-loop, @ml, @estimate-v6, @kpi-v6, @cad
  - external: better-sqlite3 (IPC 분리), crypto (브라우저 subtle)
- theme.css: 다크 + 골드 (Cinzel + Noto Sans KR + JetBrains Mono)
- layout.css: 그리드 (Header + Sidebar + Main)
- Router.js: Hash 기반 SPA + beforeEach 훅 + 메타
- Router 5/5 PASS"

# 커밋 2: App 셸 + index.html + 빌드
git add modules-html/boc-v6/src/shell/ modules-html/boc-v6/index.html modules-html/boc-v6/build/
git commit -m "feat(v6/shell): App 메인 셸 + 11 라우트 + 빌드 결과

- App.js: 11 라우트 등록 (/, /wizard, /cad, /kpi, /contracts, /orders, /schedules, /inspections, /topology, /ai-executive, 404)
- 사이드바 4 섹션 (메인 / 제작 / Closed Loop / 시스템)
- 'Phase 4 Week N 활성화 예정' 플레이스홀더
- main.js 진입점 + 콘솔 배너
- index.html + esbuild 번들 결과물"

# 커밋 3: PHASE_4A_COMPLETE
git add shell/src/feature-flags/
git commit -m "feat(v6/phase-4a): Phase 4 Week 1 완료 — PHASE_4A_COMPLETE = true

- USE_BOC_V6_SHELL = true (신규 셸 활성)
- PHASE_4A~PHASE_4I 9주 플래그 자리
- Phase 3 회귀 0건 / 33 테스트 파일 PASS 유지"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 4 Week 1 완료 — boc-v6 셸 신설

[신규 모듈]
- modules-html/boc-v6/build.config.cjs      — esbuild 설정 (Phase 3 alias)
- modules-html/boc-v6/build.cjs              — 빌드 스크립트
- modules-html/boc-v6/src/styles/theme.css   — 다크 + 골드
- modules-html/boc-v6/src/styles/layout.css  — 그리드
- modules-html/boc-v6/src/router/Router.js   — Hash SPA
- modules-html/boc-v6/src/shell/App.js       — 11 라우트 셸
- modules-html/boc-v6/src/shell/main.js      — 진입점
- modules-html/boc-v6/index.html              — HTML 진입
- modules-html/boc-v6/build/boc-v6.bundle.js — 번들 결과

[테스트 결과]
- Router:           5/5 PASS
- Phase 3 회귀:    0건
- test-engine:      5/5 PASS
- 9탭 회귀:        0건

[커밋]
- 셸 인프라 (esbuild + 테마 + 라우터)
- App + index.html + 빌드
- PHASE_4A_COMPLETE = true
- 푸시: 완료

[브라우저 검증]
- modules-html/boc-v6/index.html 열기
- 다크 + 골드 테마 표시 ✅
- 11 라우트 모두 작동 (현재는 플레이스홀더)
- 콘솔에 "ECOREAN BOC v6.0" 배너 ✅

[다음 주]
Phase 4 Week 2: 5단 게이트 마법자 UI
- G1 유형 화면 (주거 6 + 평형 5)
- G2 컨셉 화면 (12 컨셉 카드)
- G3 섹션 화면 (22 섹션 다중선택)
- G4 CAD 화면 (Konva 평면도 인터랙티브)
- G5 자재 화면 (옵션, 12×7=84 자재)
- 진행 표시바 + 자동화율 (0% → 30% → 70% → 85% → 95% → 99%)
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- Phase 3 25 모듈 시그니처 변경
- graph.json 노드/엣지 변경 (Phase 4에서는 자리만 활용)

---

## 위기 대응

| 상황 | 즉시 대응 |
|---|---|
| esbuild 미설치 | npm install --save-dev esbuild |
| Phase 3 회귀 발생 | revert + 분석 |
| 브라우저에서 .cjs 직접 import 시도 | esbuild 번들 사용 강제 |
| better-sqlite3 브라우저 에러 | external 처리 확인 (IPC 분리는 Week 5에) |

---

**문서 끝.**
**즉시 시작:** 작업 1(디렉토리) → 2(esbuild) → 3(테마) → 4(라우터) → 5(셸) → 6(HTML) → 7(빌드+검증) → 8(플래그) → 9(커밋+push). 단계마다 검증 → 다음.
