import {
  require_WizardPage
} from "./chunks/chunk-QZCQF2JJ.js";
import {
  require_CADCanvas,
  require_CADSpacesList,
  require_CADToolbar
} from "./chunks/chunk-UQHNSZZM.js";
import {
  require_KPIDashboardPage
} from "./chunks/chunk-SPK4FEFH.js";
import {
  require_CoreBus
} from "./chunks/chunk-HEM7EM3V.js";
import {
  require_CostsAdminPage
} from "./chunks/chunk-SSN2WWPB.js";
import "./chunks/chunk-MHBS5SYM.js";
import {
  __commonJS
} from "./chunks/chunk-GLFX53DW.js";

// src/router/Router.js
var require_Router = __commonJS({
  "src/router/Router.js"(exports, module) {
    var Router = class {
      constructor() {
        this.routes = /* @__PURE__ */ new Map();
        this.notFoundHandler = null;
        this.beforeHooks = [];
        this.currentPath = null;
      }
      register(path, handler, opts) {
        this.routes.set(path, {
          handler,
          meta: opts && opts.meta || {}
        });
      }
      setNotFound(handler) {
        this.notFoundHandler = handler;
      }
      beforeEach(hook) {
        this.beforeHooks.push(hook);
      }
      start() {
        window.addEventListener("hashchange", this._onHashChange.bind(this));
        this._onHashChange();
      }
      navigate(path) {
        window.location.hash = path;
      }
      _onHashChange() {
        const hash = window.location.hash || "#/";
        const path = hash.replace(/^#/, "") || "/";
        for (let hook of this.beforeHooks) {
          const result = hook(path, this.currentPath);
          if (result === false) return;
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
    };
    module.exports = { Router };
  }
});

// src/components/GlobalKPIBar.js
var require_GlobalKPIBar = __commonJS({
  "src/components/GlobalKPIBar.js"(exports, module) {
    var { coreBus } = require_CoreBus();
    var GlobalKPIBar = class {
      constructor(opts) {
        this.containerEl = opts.containerEl;
        this.state = {
          automation: 0,
          final: 0,
          margin: 0,
          activeCount: 1,
          isSimulated: true
        };
        this.unsubscribe = coreBus.on("KPI_UPDATE", (data) => {
          if (data.automation !== void 0) this.state.automation = data.automation;
          if (data.final !== void 0) this.state.final = data.final;
          if (data.margin !== void 0) this.state.margin = data.margin;
          if (data.isSimulated !== void 0) this.state.isSimulated = data.isSimulated;
          this.render();
        });
        this._loadActiveCount();
        this.render();
      }
      async _loadActiveCount() {
        if (typeof window !== "undefined" && window.boc && window.boc.kpi) {
          try {
            this.state.activeCount = await window.boc.kpi.getActiveCount();
            this.render();
          } catch (e) {
          }
        }
      }
      render() {
        const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
        const simBadge = this.state.isSimulated ? '<span class="sim-badge">\uC2DC\uBBAC</span>' : "";
        this.containerEl.innerHTML = `
      <div class="global-kpi-bar">
        <div class="kpi-item">
          <span class="kpi-label">\uC790\uB3D9\uD654</span>
          <span class="kpi-value">${this.state.automation}%</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item highlight">
          <span class="kpi-label">\uCD5C\uC885</span>
          <span class="kpi-value">${fmt(this.state.final)}\uC6D0</span>
          ${simBadge}
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-label">\uB9C8\uC9C4</span>
          <span class="kpi-value">${this.state.margin.toFixed ? this.state.margin.toFixed(1) : "0.0"}%</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-label">\uC9C4\uD589</span>
          <span class="kpi-value">${this.state.activeCount}\uAC74</span>
        </div>
      </div>
    `;
      }
      destroy() {
        if (this.unsubscribe) this.unsubscribe();
      }
    };
    module.exports = { GlobalKPIBar };
  }
});

// src/shell/App.js
var require_App = __commonJS({
  "src/shell/App.js"(exports, module) {
    var { Router } = require_Router();
    var App2 = class {
      constructor(opts) {
        this.rootEl = opts.rootEl || document.getElementById("app");
        this.router = new Router();
        this.currentPage = null;
        this.globalKPI = null;
        this._setupRoutes();
        this._render();
      }
      _setupRoutes() {
        this.router.register("/", this._renderHome.bind(this), { meta: { title: "\uB300\uC2DC\uBCF4\uB4DC" } });
        this.router.register("/wizard", this._renderWizard.bind(this), { meta: { title: "\uACAC\uC801 \uB9C8\uBC95\uC790" } });
        this.router.register("/cad", this._renderCAD.bind(this), { meta: { title: "CAD \uD3C9\uBA74\uB3C4" } });
        this.router.register("/kpi", this._renderKPI.bind(this), { meta: { title: "KPI \uB300\uC2DC\uBCF4\uB4DC" } });
        this.router.register("/admin/costs", this._renderAdminCosts.bind(this), { meta: { title: "\uB2E8\uAC00 \uAD00\uB9AC" } });
        this.router.register("/contracts", this._renderContracts.bind(this), { meta: { title: "\uACC4\uC57D" } });
        this.router.register("/orders", this._renderOrders.bind(this), { meta: { title: "\uBC1C\uC8FC" } });
        this.router.register("/schedules", this._renderSchedules.bind(this), { meta: { title: "\uACF5\uC815" } });
        this.router.register("/inspections", this._renderInspections.bind(this), { meta: { title: "\uAC80\uC218" } });
        this.router.register("/topology", this._renderTopology.bind(this), { meta: { title: "\uC2DC\uC2A4\uD15C \uD1A0\uD3F4\uB85C\uC9C0" } });
        this.router.register("/ai-executive", this._renderAIExecutive.bind(this), { meta: { title: "AI \uC784\uC6D0" } });
        this.router.setNotFound(this._render404.bind(this));
      }
      _render() {
        this.rootEl.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <h1>ECOREAN BOC v6.0</h1>
          <div class="spacer"></div>
          <div class="status">
            <span class="live">\u25CF LIVE</span>
            Phase 4 / Week 5
          </div>
        </header>
        <div class="app-kpibar" id="global-kpi-bar"></div>
        <aside class="app-sidebar">${this._renderSidebar()}</aside>
        <main class="app-main" id="main-content"></main>
      </div>
    `;
        try {
          const { GlobalKPIBar } = require_GlobalKPIBar();
          this.globalKPI = new GlobalKPIBar({
            containerEl: document.getElementById("global-kpi-bar")
          });
        } catch (e) {
          console.warn("[App] GlobalKPIBar \uB85C\uB4DC \uC2E4\uD328:", e.message);
        }
        this.rootEl.querySelectorAll(".nav-item").forEach((el) => {
          el.addEventListener("click", () => {
            const path = el.dataset.path;
            this.router.navigate(path);
          });
        });
        this.router.start();
      }
      _renderSidebar() {
        return `
      <div class="nav-section">
        <div class="label">\uBA54\uC778</div>
        <div class="nav-item" data-path="/">\uB300\uC2DC\uBCF4\uB4DC</div>
        <div class="nav-item" data-path="/wizard">\uACAC\uC801 \uB9C8\uBC95\uC790</div>
      </div>
      <div class="nav-section">
        <div class="label">\uC81C\uC791</div>
        <div class="nav-item" data-path="/cad">CAD \uD3C9\uBA74\uB3C4</div>
        <div class="nav-item" data-path="/kpi">KPI \uB300\uC2DC\uBCF4\uB4DC</div>
      </div>
      <div class="nav-section">
        <div class="label">Closed Loop</div>
        <div class="nav-item" data-path="/contracts">\uACC4\uC57D</div>
        <div class="nav-item" data-path="/orders">\uBC1C\uC8FC</div>
        <div class="nav-item" data-path="/schedules">\uACF5\uC815</div>
        <div class="nav-item" data-path="/inspections">\uAC80\uC218</div>
      </div>
      <div class="nav-section">
        <div class="label">\uAD00\uB9AC</div>
        <div class="nav-item" data-path="/admin/costs">\uB2E8\uAC00 \uAD00\uB9AC</div>
      </div>
      <div class="nav-section">
        <div class="label">\uC2DC\uC2A4\uD15C</div>
        <div class="nav-item" data-path="/topology">\uD1A0\uD3F4\uB85C\uC9C0</div>
        <div class="nav-item" data-path="/ai-executive">AI \uC784\uC6D0</div>
      </div>
    `;
      }
      _setActiveNav(path) {
        this.rootEl.querySelectorAll(".nav-item").forEach((el) => {
          el.classList.toggle("active", el.dataset.path === path);
        });
      }
      _renderPageHeader(title, subtitle) {
        return `
      <div class="page-header">
        <h2>${title}</h2>
        <div class="subtitle">${subtitle || ""}</div>
      </div>
    `;
      }
      _renderHome(path) {
        this._setActiveNav(path);
        document.getElementById("main-content").innerHTML = `
      ${this._renderPageHeader("\uB300\uC2DC\uBCF4\uB4DC", "ECOREAN BOC v6.0 \u2014 Phase 4 Week 5")}
      <div class="card">
        <h3>Phase 4 Week 5 \uC644\uB8CC \u2705</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          \uACC4\uC57D \uD654\uBA74 (ContractPage) + PDF \uACAC\uC801\uC11C \uCD9C\uB825 + CAD \uB77C\uC6B0\uD2B8 \uD65C\uC131\uD654<br/>
          ContractController (IPC + \uB85C\uCEEC fallback) + EstimatePDF (window.print)<br/>
          DRAFT \u2192 SIGNED \u2192 CANCELED \uC0C1\uD0DC \uC804\uC774 + \uACE0\uAC1D \uC815\uBCF4 \uD3FC
        </p>
      </div>
      <div class="card">
        <h3>Phase 4 \uC9C4\uD589 \uD604\uD669</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          \u2705 Week 1: boc-v6 \uC178 + \uB77C\uC6B0\uD305 + \uB2E4\uD06C \uD14C\uB9C8 + esbuild<br/>
          \u2705 Week 2: 5\uB2E8 \uAC8C\uC774\uD2B8 \uB9C8\uBC95\uC790 UI (G1~G5)<br/>
          \u2705 Week 3: CAD L1 \uD3C9\uBA74\uB3C4 \uC778\uD130\uB799\uD2F0\uBE0C (Konva.js)<br/>
          \u2705 Week 4-A: cost_items DB + IPC + \uB178\uB4DC\uBD84\uB9AC + KPI 3\uB808\uC774\uC5B4<br/>
          \u2705 Week 5: \uACC4\uC57D \uD654\uBA74 + PDF \uACAC\uC801\uC11C \uCD9C\uB825
        </p>
      </div>
    `;
      }
      _renderPlaceholder(path, title, weekTarget) {
        this._setActiveNav(path);
        document.getElementById("main-content").innerHTML = `
      ${this._renderPageHeader(title, weekTarget + " \uD65C\uC131\uD654 \uC608\uC815")}
      <div class="card">
        <h3>\uC900\uBE44 \uC911</h3>
        <p style="color: var(--text-dim);">\uBCF8 \uD654\uBA74\uC740 ${weekTarget}\uC5D0\uC11C \uD65C\uC131\uD654\uB429\uB2C8\uB2E4.</p>
      </div>
    `;
      }
      _renderWizard(path) {
        this._setActiveNav(path);
        const main = document.getElementById("main-content");
        main.innerHTML = '<div style="padding: 40px; color: var(--gold);">\uB85C\uB529 \uC911...</div>';
        try {
          const { WizardPage } = require_WizardPage();
          main.innerHTML = "";
          new WizardPage({ containerEl: main });
        } catch (e) {
          main.innerHTML = `<div class="card"><p style="color: var(--negative);">\uB9C8\uBC95\uC790 \uB85C\uB4DC \uC2E4\uD328: ${e.message}</p></div>`;
        }
      }
      _renderKPI(path) {
        this._setActiveNav(path);
        const main = document.getElementById("main-content");
        main.innerHTML = '<div style="padding: 40px; color: var(--gold);">KPI \uB85C\uB529 \uC911...</div>';
        try {
          const { KPIDashboardPage } = require_KPIDashboardPage();
          main.innerHTML = "";
          new KPIDashboardPage({ containerEl: main });
        } catch (e) {
          main.innerHTML = `<div class="card"><p style="color: var(--negative);">KPI \uB85C\uB4DC \uC2E4\uD328: ${e.message}</p></div>`;
        }
      }
      _renderAdminCosts(path) {
        this._setActiveNav("/admin/costs");
        const main = document.getElementById("main-content");
        main.innerHTML = '<div style="padding: 40px; color: var(--gold);">\uB85C\uB529 \uC911...</div>';
        try {
          const { CostsAdminPage } = require_CostsAdminPage();
          main.innerHTML = "";
          new CostsAdminPage({ containerEl: main });
        } catch (e) {
          main.innerHTML = `<div class="card"><p style="color: var(--negative);">\uB2E8\uAC00\uAD00\uB9AC \uB85C\uB4DC \uC2E4\uD328: ${e.message}</p></div>`;
        }
      }
      _renderCAD(path) {
        this._setActiveNav(path);
        const main = document.getElementById("main-content");
        main.innerHTML = '<div style="padding: 40px; color: var(--gold);">CAD \uB85C\uB529 \uC911...</div>';
        try {
          const { CADCanvas } = require_CADCanvas();
          const { CADToolbar } = require_CADToolbar();
          const { CADSpacesList } = require_CADSpacesList();
          main.innerHTML = `
        <div style="padding: 16px;">
          ${this._renderPageHeader("CAD \uD3C9\uBA74\uB3C4", "L1 \uC778\uD130\uB799\uD2F0\uBE0C \u2014 \uC0AC\uAC01\uD615 \uB4DC\uB798\uADF8\uB85C \uACF5\uAC04 \uCD94\uAC00")}
          <div id="cad-toolbar-area"></div>
          <div style="display:grid; grid-template-columns:1fr 220px; gap:12px; margin-top:12px;">
            <div id="cad-canvas-area"></div>
            <div id="cad-spaces-area"></div>
          </div>
        </div>
      `;
          const canvas = new CADCanvas({
            containerEl: main.querySelector("#cad-canvas-area"),
            width: 760,
            height: 520
          });
          new CADToolbar({ containerEl: main.querySelector("#cad-toolbar-area"), canvas });
          new CADSpacesList({ containerEl: main.querySelector("#cad-spaces-area"), canvas });
        } catch (e) {
          main.innerHTML = `<div class="card"><p style="color: var(--negative);">CAD \uB85C\uB4DC \uC2E4\uD328: ${e.message}</p></div>`;
        }
      }
      _renderContracts(path) {
        this._setActiveNav(path);
        const main = document.getElementById("main-content");
        main.innerHTML = `
      ${this._renderPageHeader("\uACC4\uC57D \uBAA9\uB85D", "\uB9C8\uBC95\uC790\uC5D0\uC11C \uACAC\uC801 \uC644\uC131 \uD6C4 \uACC4\uC57D\uC11C \uC791\uC131")}
      <div class="card">
        <h3>\uACC4\uC57D \uD654\uBA74 \uC548\uB0B4</h3>
        <p style="color: var(--text-dim); line-height: 1.7;">
          \uACAC\uC801 \uB9C8\uBC95\uC790(G1\u2192G5)\uB97C \uC644\uB8CC\uD558\uBA74 \uC790\uB3D9\uC73C\uB85C \uACC4\uC57D\uC11C \uC791\uC131 \uD654\uBA74\uC774 \uB098\uD0C0\uB0A9\uB2C8\uB2E4.<br/>
          \uACE0\uAC1D\uBA85 / \uC5F0\uB77D\uCC98 / \uACF5\uC0AC \uC8FC\uC18C \uC785\uB825 \u2192 \uACC4\uC57D \uCD08\uC548 \u2192 \uC11C\uBA85 \uC644\uB8CC \u2192 PDF \uCD9C\uB825
        </p>
        <div style="margin-top: 16px;">
          <button class="primary" onclick="window.location.hash='#/wizard'">\uACAC\uC801 \uB9C8\uBC95\uC790\uB85C \uC774\uB3D9</button>
        </div>
      </div>
    `;
      }
      _renderOrders(path) {
        this._renderPlaceholder(path, "\uBC1C\uC8FC", "Phase 4 Week 6");
      }
      _renderSchedules(path) {
        this._renderPlaceholder(path, "\uACF5\uC815", "Phase 4 Week 6");
      }
      _renderInspections(path) {
        this._renderPlaceholder(path, "\uAC80\uC218", "Phase 4 Week 6");
      }
      _renderTopology(path) {
        this._renderPlaceholder(path, "\uC2DC\uC2A4\uD15C \uD1A0\uD3F4\uB85C\uC9C0", "Phase 4 Week 7");
      }
      _renderAIExecutive(path) {
        this._renderPlaceholder(path, "AI \uC784\uC6D0 \uB300\uC2DC\uBCF4\uB4DC", "Phase 4 Week 7");
      }
      _render404(path) {
        document.getElementById("main-content").innerHTML = `
      ${this._renderPageHeader("404", "\uACBD\uB85C \uC5C6\uC74C: " + path)}
      <div class="card">
        <p style="color: var(--text-dim);">\uC694\uCCAD\uD558\uC2E0 \uACBD\uB85C\uB294 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</p>
        <button onclick="location.hash='#/'">\uD648\uC73C\uB85C</button>
      </div>
    `;
      }
    };
    module.exports = { App: App2 };
  }
});

// src/shell/main.js
var { App } = require_App();
document.addEventListener("DOMContentLoaded", function() {
  const app = new App({ rootEl: document.getElementById("app") });
  window.BOC = window.BOC || {};
  window.BOC.app = app;
  console.log("%c ECOREAN BOC v6.0 ", "background: #c9a84c; color: #0a0e1a; font-weight: bold; padding: 4px 8px;");
  console.log("Phase 4 Week 5 \u2014 \uACC4\uC57D \uD654\uBA74 + PDF \uACAC\uC801\uC11C + CAD \uB77C\uC6B0\uD2B8 \uD65C\uC131\uD654");
});
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    setTimeout(() => {
      import("./wizard.js").catch(() => {
      });
      import("./kpi.js").catch(() => {
      });
    }, 2e3);
  });
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3JvdXRlci9Sb3V0ZXIuanMiLCAiLi4vc3JjL2NvbXBvbmVudHMvR2xvYmFsS1BJQmFyLmpzIiwgIi4uL3NyYy9zaGVsbC9BcHAuanMiLCAiLi4vc3JjL3NoZWxsL21haW4uanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IEhhc2gtYmFzZWQgU1BBIFJvdXRlclxuXG5jbGFzcyBSb3V0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJvdXRlcyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLm5vdEZvdW5kSGFuZGxlciA9IG51bGw7XG4gICAgdGhpcy5iZWZvcmVIb29rcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSBudWxsO1xuICB9XG5cbiAgcmVnaXN0ZXIocGF0aCwgaGFuZGxlciwgb3B0cykge1xuICAgIHRoaXMucm91dGVzLnNldChwYXRoLCB7XG4gICAgICBoYW5kbGVyOiBoYW5kbGVyLFxuICAgICAgbWV0YTogKG9wdHMgJiYgb3B0cy5tZXRhKSB8fCB7fVxuICAgIH0pO1xuICB9XG5cbiAgc2V0Tm90Rm91bmQoaGFuZGxlcikge1xuICAgIHRoaXMubm90Rm91bmRIYW5kbGVyID0gaGFuZGxlcjtcbiAgfVxuXG4gIGJlZm9yZUVhY2goaG9vaykge1xuICAgIHRoaXMuYmVmb3JlSG9va3MucHVzaChob29rKTtcbiAgfVxuXG4gIHN0YXJ0KCkge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdGhpcy5fb25IYXNoQ2hhbmdlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuX29uSGFzaENoYW5nZSgpO1xuICB9XG5cbiAgbmF2aWdhdGUocGF0aCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcbiAgfVxuXG4gIF9vbkhhc2hDaGFuZ2UoKSB7XG4gICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoIHx8ICcjLyc7XG4gICAgY29uc3QgcGF0aCA9IGhhc2gucmVwbGFjZSgvXiMvLCAnJykgfHwgJy8nO1xuXG4gICAgZm9yIChsZXQgaG9vayBvZiB0aGlzLmJlZm9yZUhvb2tzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBob29rKHBhdGgsIHRoaXMuY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZmFsc2UpIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZSA9IHRoaXMucm91dGVzLmdldChwYXRoKTtcbiAgICBpZiAocm91dGUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSBwYXRoO1xuICAgICAgcm91dGUuaGFuZGxlcihwYXRoLCByb3V0ZS5tZXRhKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMubm90Rm91bmRIYW5kbGVyKSB7XG4gICAgICB0aGlzLm5vdEZvdW5kSGFuZGxlcihwYXRoKTtcbiAgICB9XG4gIH1cblxuICBnZXRDdXJyZW50UGF0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGF0aDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUm91dGVyOiBSb3V0ZXIgfTtcbiIsICJjb25zdCB7IGNvcmVCdXMgfSA9IHJlcXVpcmUoJ0Bjb3JlLWJ1cy9Db3JlQnVzLmNqcycpO1xuXG5jbGFzcyBHbG9iYWxLUElCYXIge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5jb250YWluZXJFbCA9IG9wdHMuY29udGFpbmVyRWw7XG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGF1dG9tYXRpb246IDAsIGZpbmFsOiAwLCBtYXJnaW46IDAsIGFjdGl2ZUNvdW50OiAxLCBpc1NpbXVsYXRlZDogdHJ1ZVxuICAgIH07XG5cbiAgICB0aGlzLnVuc3Vic2NyaWJlID0gY29yZUJ1cy5vbignS1BJX1VQREFURScsIChkYXRhKSA9PiB7XG4gICAgICBpZiAoZGF0YS5hdXRvbWF0aW9uICE9PSB1bmRlZmluZWQpIHRoaXMuc3RhdGUuYXV0b21hdGlvbiA9IGRhdGEuYXV0b21hdGlvbjtcbiAgICAgIGlmIChkYXRhLmZpbmFsICAgICAgIT09IHVuZGVmaW5lZCkgdGhpcy5zdGF0ZS5maW5hbCAgICAgID0gZGF0YS5maW5hbDtcbiAgICAgIGlmIChkYXRhLm1hcmdpbiAgICAgIT09IHVuZGVmaW5lZCkgdGhpcy5zdGF0ZS5tYXJnaW4gICAgID0gZGF0YS5tYXJnaW47XG4gICAgICBpZiAoZGF0YS5pc1NpbXVsYXRlZCE9PSB1bmRlZmluZWQpIHRoaXMuc3RhdGUuaXNTaW11bGF0ZWQ9IGRhdGEuaXNTaW11bGF0ZWQ7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fbG9hZEFjdGl2ZUNvdW50KCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIGFzeW5jIF9sb2FkQWN0aXZlQ291bnQoKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5ib2MgJiYgd2luZG93LmJvYy5rcGkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuc3RhdGUuYWN0aXZlQ291bnQgPSBhd2FpdCB3aW5kb3cuYm9jLmtwaS5nZXRBY3RpdmVDb3VudCgpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgfSBjYXRjaChlKSB7fVxuICAgIH1cbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBmbXQgPSAobikgPT4gTWF0aC5yb3VuZChuKS50b0xvY2FsZVN0cmluZygna28tS1InKTtcbiAgICBjb25zdCBzaW1CYWRnZSA9IHRoaXMuc3RhdGUuaXNTaW11bGF0ZWRcbiAgICAgID8gJzxzcGFuIGNsYXNzPVwic2ltLWJhZGdlXCI+XHVDMkRDXHVCQkFDPC9zcGFuPicgOiAnJztcblxuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImdsb2JhbC1rcGktYmFyXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktaXRlbVwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLWxhYmVsXCI+XHVDNzkwXHVCM0Q5XHVENjU0PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLXZhbHVlXCI+JHt0aGlzLnN0YXRlLmF1dG9tYXRpb259JTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktZGl2aWRlclwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwia3BpLWl0ZW0gaGlnaGxpZ2h0XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJrcGktbGFiZWxcIj5cdUNENUNcdUM4ODU8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJrcGktdmFsdWVcIj4ke2ZtdCh0aGlzLnN0YXRlLmZpbmFsKX1cdUM2RDA8L3NwYW4+XG4gICAgICAgICAgJHtzaW1CYWRnZX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktZGl2aWRlclwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwia3BpLWl0ZW1cIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImtwaS1sYWJlbFwiPlx1QjlDOFx1QzlDNDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImtwaS12YWx1ZVwiPiR7dGhpcy5zdGF0ZS5tYXJnaW4udG9GaXhlZCA/IHRoaXMuc3RhdGUubWFyZ2luLnRvRml4ZWQoMSkgOiAnMC4wJ30lPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImtwaS1kaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktaXRlbVwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLWxhYmVsXCI+XHVDOUM0XHVENTg5PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLXZhbHVlXCI+JHt0aGlzLnN0YXRlLmFjdGl2ZUNvdW50fVx1QUM3NDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy51bnN1YnNjcmliZSkgdGhpcy51bnN1YnNjcmliZSgpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHbG9iYWxLUElCYXIgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBBcHAgXHVCQTU0XHVDNzc4IFx1Q0VFOFx1RDE0Q1x1Qzc3NFx1QjEwOFxuY29uc3QgeyBSb3V0ZXIgfSA9IHJlcXVpcmUoJy4uL3JvdXRlci9Sb3V0ZXIuanMnKTtcblxuY2xhc3MgQXBwIHtcbiAgY29uc3RydWN0b3Iob3B0cykge1xuICAgIHRoaXMucm9vdEVsID0gb3B0cy5yb290RWwgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcCcpO1xuICAgIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBudWxsO1xuICAgIHRoaXMuZ2xvYmFsS1BJID0gbnVsbDtcblxuICAgIHRoaXMuX3NldHVwUm91dGVzKCk7XG4gICAgdGhpcy5fcmVuZGVyKCk7XG4gIH1cblxuICBfc2V0dXBSb3V0ZXMoKSB7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy8nLCB0aGlzLl9yZW5kZXJIb21lLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL3dpemFyZCcsIHRoaXMuX3JlbmRlcldpemFyZC5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUFDQUNcdUM4MDEgXHVCOUM4XHVCQzk1XHVDNzkwJyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvY2FkJywgdGhpcy5fcmVuZGVyQ0FELmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ0NBRCBcdUQzQzlcdUJBNzRcdUIzQzQnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9rcGknLCB0aGlzLl9yZW5kZXJLUEkuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnS1BJIFx1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL2FkbWluL2Nvc3RzJywgdGhpcy5fcmVuZGVyQWRtaW5Db3N0cy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUIyRThcdUFDMDAgXHVBRDAwXHVCOUFDJyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvY29udHJhY3RzJywgdGhpcy5fcmVuZGVyQ29udHJhY3RzLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QUNDNFx1QzU3RCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL29yZGVycycsIHRoaXMuX3JlbmRlck9yZGVycy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUJDMUNcdUM4RkMnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9zY2hlZHVsZXMnLCB0aGlzLl9yZW5kZXJTY2hlZHVsZXMuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnXHVBQ0Y1XHVDODE1JyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvaW5zcGVjdGlvbnMnLCB0aGlzLl9yZW5kZXJJbnNwZWN0aW9ucy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUFDODBcdUMyMTgnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy90b3BvbG9neScsIHRoaXMuX3JlbmRlclRvcG9sb2d5LmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QzJEQ1x1QzJBNFx1RDE1QyBcdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzAnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9haS1leGVjdXRpdmUnLCB0aGlzLl9yZW5kZXJBSUV4ZWN1dGl2ZS5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdBSSBcdUM3ODRcdUM2RDAnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIuc2V0Tm90Rm91bmQodGhpcy5fcmVuZGVyNDA0LmJpbmQodGhpcykpO1xuICB9XG5cbiAgX3JlbmRlcigpIHtcbiAgICB0aGlzLnJvb3RFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwiYXBwLXNoZWxsXCI+XG4gICAgICAgIDxoZWFkZXIgY2xhc3M9XCJhcHAtaGVhZGVyXCI+XG4gICAgICAgICAgPGgxPkVDT1JFQU4gQk9DIHY2LjA8L2gxPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGFjZXJcIj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxpdmVcIj5cdTI1Q0YgTElWRTwvc3Bhbj5cbiAgICAgICAgICAgIFBoYXNlIDQgLyBXZWVrIDVcbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9oZWFkZXI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJhcHAta3BpYmFyXCIgaWQ9XCJnbG9iYWwta3BpLWJhclwiPjwvZGl2PlxuICAgICAgICA8YXNpZGUgY2xhc3M9XCJhcHAtc2lkZWJhclwiPiR7dGhpcy5fcmVuZGVyU2lkZWJhcigpfTwvYXNpZGU+XG4gICAgICAgIDxtYWluIGNsYXNzPVwiYXBwLW1haW5cIiBpZD1cIm1haW4tY29udGVudFwiPjwvbWFpbj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBHbG9iYWxLUElCYXIgfSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvR2xvYmFsS1BJQmFyLmpzJyk7XG4gICAgICB0aGlzLmdsb2JhbEtQSSA9IG5ldyBHbG9iYWxLUElCYXIoe1xuICAgICAgICBjb250YWluZXJFbDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2dsb2JhbC1rcGktYmFyJylcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbQXBwXSBHbG9iYWxLUElCYXIgXHVCODVDXHVCNERDIFx1QzJFNFx1RDMyODonLCBlLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIHRoaXMucm9vdEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYXYtaXRlbScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBlbC5kYXRhc2V0LnBhdGg7XG4gICAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKHBhdGgpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJvdXRlci5zdGFydCgpO1xuICB9XG5cbiAgX3JlbmRlclNpZGViYXIoKSB7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxkaXYgY2xhc3M9XCJuYXYtc2VjdGlvblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj5cdUJBNTRcdUM3Nzg8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL1wiPlx1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQzwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvd2l6YXJkXCI+XHVBQ0FDXHVDODAxIFx1QjlDOFx1QkM5NVx1Qzc5MDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwibmF2LXNlY3Rpb25cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+XHVDODFDXHVDNzkxPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9jYWRcIj5DQUQgXHVEM0M5XHVCQTc0XHVCM0M0PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9rcGlcIj5LUEkgXHVCMzAwXHVDMkRDXHVCQ0Y0XHVCNERDPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJuYXYtc2VjdGlvblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj5DbG9zZWQgTG9vcDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvY29udHJhY3RzXCI+XHVBQ0M0XHVDNTdEPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9vcmRlcnNcIj5cdUJDMUNcdUM4RkM8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL3NjaGVkdWxlc1wiPlx1QUNGNVx1QzgxNTwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvaW5zcGVjdGlvbnNcIj5cdUFDODBcdUMyMTg8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cIm5hdi1zZWN0aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPlx1QUQwMFx1QjlBQzwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvYWRtaW4vY29zdHNcIj5cdUIyRThcdUFDMDAgXHVBRDAwXHVCOUFDPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJuYXYtc2VjdGlvblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj5cdUMyRENcdUMyQTRcdUQxNUM8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL3RvcG9sb2d5XCI+XHVEMUEwXHVEM0Y0XHVCODVDXHVDOUMwPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9haS1leGVjdXRpdmVcIj5BSSBcdUM3ODRcdUM2RDA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfc2V0QWN0aXZlTmF2KHBhdGgpIHtcbiAgICB0aGlzLnJvb3RFbC5xdWVyeVNlbGVjdG9yQWxsKCcubmF2LWl0ZW0nKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGVsLmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2ZScsIGVsLmRhdGFzZXQucGF0aCA9PT0gcGF0aCk7XG4gICAgfSk7XG4gIH1cblxuICBfcmVuZGVyUGFnZUhlYWRlcih0aXRsZSwgc3VidGl0bGUpIHtcbiAgICByZXR1cm4gYFxuICAgICAgPGRpdiBjbGFzcz1cInBhZ2UtaGVhZGVyXCI+XG4gICAgICAgIDxoMj4ke3RpdGxlfTwvaDI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzdWJ0aXRsZVwiPiR7c3VidGl0bGUgfHwgJyd9PC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgX3JlbmRlckhvbWUocGF0aCkge1xuICAgIHRoaXMuX3NldEFjdGl2ZU5hdihwYXRoKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50JykuaW5uZXJIVE1MID0gYFxuICAgICAgJHt0aGlzLl9yZW5kZXJQYWdlSGVhZGVyKCdcdUIzMDBcdUMyRENcdUJDRjRcdUI0REMnLCAnRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgUGhhc2UgNCBXZWVrIDUnKX1cbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgIDxoMz5QaGFzZSA0IFdlZWsgNSBcdUM2NDRcdUI4Q0MgXHUyNzA1PC9oMz5cbiAgICAgICAgPHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tdGV4dC1kaW0pOyBsaW5lLWhlaWdodDogMS42O1wiPlxuICAgICAgICAgIFx1QUNDNFx1QzU3RCBcdUQ2NTRcdUJBNzQgKENvbnRyYWN0UGFnZSkgKyBQREYgXHVBQ0FDXHVDODAxXHVDMTFDIFx1Q0Q5Q1x1QjgyNSArIENBRCBcdUI3N0NcdUM2QjBcdUQyQjggXHVENjVDXHVDMTMxXHVENjU0PGJyLz5cbiAgICAgICAgICBDb250cmFjdENvbnRyb2xsZXIgKElQQyArIFx1Qjg1Q1x1Q0VFQyBmYWxsYmFjaykgKyBFc3RpbWF0ZVBERiAod2luZG93LnByaW50KTxici8+XG4gICAgICAgICAgRFJBRlQgXHUyMTkyIFNJR05FRCBcdTIxOTIgQ0FOQ0VMRUQgXHVDMEMxXHVEMERDIFx1QzgwNFx1Qzc3NCArIFx1QUNFMFx1QUMxRCBcdUM4MTVcdUJDRjQgXHVEM0ZDXG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImNhcmRcIj5cbiAgICAgICAgPGgzPlBoYXNlIDQgXHVDOUM0XHVENTg5IFx1RDYwNFx1RDY2OTwvaDM+XG4gICAgICAgIDxwIHN0eWxlPVwiY29sb3I6IHZhcigtLXRleHQtZGltKTsgbGluZS1oZWlnaHQ6IDEuNjtcIj5cbiAgICAgICAgICBcdTI3MDUgV2VlayAxOiBib2MtdjYgXHVDMTc4ICsgXHVCNzdDXHVDNkIwXHVEMzA1ICsgXHVCMkU0XHVEMDZDIFx1RDE0Q1x1QjlDOCArIGVzYnVpbGQ8YnIvPlxuICAgICAgICAgIFx1MjcwNSBXZWVrIDI6IDVcdUIyRTggXHVBQzhDXHVDNzc0XHVEMkI4IFx1QjlDOFx1QkM5NVx1Qzc5MCBVSSAoRzF+RzUpPGJyLz5cbiAgICAgICAgICBcdTI3MDUgV2VlayAzOiBDQUQgTDEgXHVEM0M5XHVCQTc0XHVCM0M0IFx1Qzc3OFx1RDEzMFx1Qjc5OVx1RDJGMFx1QkUwQyAoS29udmEuanMpPGJyLz5cbiAgICAgICAgICBcdTI3MDUgV2VlayA0LUE6IGNvc3RfaXRlbXMgREIgKyBJUEMgKyBcdUIxNzhcdUI0RENcdUJEODRcdUI5QUMgKyBLUEkgM1x1QjgwOFx1Qzc3NFx1QzVCNDxici8+XG4gICAgICAgICAgXHUyNzA1IFdlZWsgNTogXHVBQ0M0XHVDNTdEIFx1RDY1NFx1QkE3NCArIFBERiBcdUFDQUNcdUM4MDFcdUMxMUMgXHVDRDlDXHVCODI1XG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgdGl0bGUsIHdlZWtUYXJnZXQpIHtcbiAgICB0aGlzLl9zZXRBY3RpdmVOYXYocGF0aCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcih0aXRsZSwgd2Vla1RhcmdldCArICcgXHVENjVDXHVDMTMxXHVENjU0IFx1QzYwOFx1QzgxNScpfVxuICAgICAgPGRpdiBjbGFzcz1cImNhcmRcIj5cbiAgICAgICAgPGgzPlx1QzkwMFx1QkU0NCBcdUM5MTE8L2gzPlxuICAgICAgICA8cCBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7XCI+XHVCQ0Y4IFx1RDY1NFx1QkE3NFx1Qzc0MCAke3dlZWtUYXJnZXR9XHVDNUQwXHVDMTFDIFx1RDY1Q1x1QzEzMVx1RDY1NFx1QjQyOVx1QjJDOFx1QjJFNC48L3A+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgX3JlbmRlcldpemFyZChwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGNvbnN0IG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50Jyk7XG4gICAgbWFpbi5pbm5lckhUTUwgPSAnPGRpdiBzdHlsZT1cInBhZGRpbmc6IDQwcHg7IGNvbG9yOiB2YXIoLS1nb2xkKTtcIj5cdUI4NUNcdUI1MjkgXHVDOTExLi4uPC9kaXY+JztcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBXaXphcmRQYWdlIH0gPSByZXF1aXJlKCcuLi93aXphcmQvV2l6YXJkUGFnZS5qcycpO1xuICAgICAgbWFpbi5pbm5lckhUTUwgPSAnJztcbiAgICAgIG5ldyBXaXphcmRQYWdlKHsgY29udGFpbmVyRWw6IG1haW4gfSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBtYWluLmlubmVySFRNTCA9IGA8ZGl2IGNsYXNzPVwiY2FyZFwiPjxwIHN0eWxlPVwiY29sb3I6IHZhcigtLW5lZ2F0aXZlKTtcIj5cdUI5QzhcdUJDOTVcdUM3OTAgXHVCODVDXHVCNERDIFx1QzJFNFx1RDMyODogJHtlLm1lc3NhZ2V9PC9wPjwvZGl2PmA7XG4gICAgfVxuICB9XG5cbiAgX3JlbmRlcktQSShwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGNvbnN0IG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50Jyk7XG4gICAgbWFpbi5pbm5lckhUTUwgPSAnPGRpdiBzdHlsZT1cInBhZGRpbmc6IDQwcHg7IGNvbG9yOiB2YXIoLS1nb2xkKTtcIj5LUEkgXHVCODVDXHVCNTI5IFx1QzkxMS4uLjwvZGl2Pic7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgS1BJRGFzaGJvYXJkUGFnZSB9ID0gcmVxdWlyZSgnLi4va3BpLWRhc2hib2FyZC9LUElEYXNoYm9hcmRQYWdlLmpzJyk7XG4gICAgICBtYWluLmlubmVySFRNTCA9ICcnO1xuICAgICAgbmV3IEtQSURhc2hib2FyZFBhZ2UoeyBjb250YWluZXJFbDogbWFpbiB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIG1haW4uaW5uZXJIVE1MID0gYDxkaXYgY2xhc3M9XCJjYXJkXCI+PHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tbmVnYXRpdmUpO1wiPktQSSBcdUI4NUNcdUI0REMgXHVDMkU0XHVEMzI4OiAke2UubWVzc2FnZX08L3A+PC9kaXY+YDtcbiAgICB9XG4gIH1cblxuICBfcmVuZGVyQWRtaW5Db3N0cyhwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KCcvYWRtaW4vY29zdHMnKTtcbiAgICBjb25zdCBtYWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpO1xuICAgIG1haW4uaW5uZXJIVE1MID0gJzxkaXYgc3R5bGU9XCJwYWRkaW5nOiA0MHB4OyBjb2xvcjogdmFyKC0tZ29sZCk7XCI+XHVCODVDXHVCNTI5IFx1QzkxMS4uLjwvZGl2Pic7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgQ29zdHNBZG1pblBhZ2UgfSA9IHJlcXVpcmUoJy4uL2FkbWluL0Nvc3RzQWRtaW5QYWdlLmpzJyk7XG4gICAgICBtYWluLmlubmVySFRNTCA9ICcnO1xuICAgICAgbmV3IENvc3RzQWRtaW5QYWdlKHsgY29udGFpbmVyRWw6IG1haW4gfSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBtYWluLmlubmVySFRNTCA9IGA8ZGl2IGNsYXNzPVwiY2FyZFwiPjxwIHN0eWxlPVwiY29sb3I6IHZhcigtLW5lZ2F0aXZlKTtcIj5cdUIyRThcdUFDMDBcdUFEMDBcdUI5QUMgXHVCODVDXHVCNERDIFx1QzJFNFx1RDMyODogJHtlLm1lc3NhZ2V9PC9wPjwvZGl2PmA7XG4gICAgfVxuICB9XG5cbiAgX3JlbmRlckNBRChwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGNvbnN0IG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50Jyk7XG4gICAgbWFpbi5pbm5lckhUTUwgPSAnPGRpdiBzdHlsZT1cInBhZGRpbmc6IDQwcHg7IGNvbG9yOiB2YXIoLS1nb2xkKTtcIj5DQUQgXHVCODVDXHVCNTI5IFx1QzkxMS4uLjwvZGl2Pic7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgQ0FEQ2FudmFzIH0gICAgID0gcmVxdWlyZSgnLi4vY2FkL0NBRENhbnZhcy5qcycpO1xuICAgICAgY29uc3QgeyBDQURUb29sYmFyIH0gICAgPSByZXF1aXJlKCcuLi9jYWQvY29tcG9uZW50cy9DQURUb29sYmFyLmpzJyk7XG4gICAgICBjb25zdCB7IENBRFNwYWNlc0xpc3QgfSA9IHJlcXVpcmUoJy4uL2NhZC9jb21wb25lbnRzL0NBRFNwYWNlc0xpc3QuanMnKTtcbiAgICAgIG1haW4uaW5uZXJIVE1MID0gYFxuICAgICAgICA8ZGl2IHN0eWxlPVwicGFkZGluZzogMTZweDtcIj5cbiAgICAgICAgICAke3RoaXMuX3JlbmRlclBhZ2VIZWFkZXIoJ0NBRCBcdUQzQzlcdUJBNzRcdUIzQzQnLCAnTDEgXHVDNzc4XHVEMTMwXHVCNzk5XHVEMkYwXHVCRTBDIFx1MjAxNCBcdUMwQUNcdUFDMDFcdUQ2MTUgXHVCNERDXHVCNzk4XHVBREY4XHVCODVDIFx1QUNGNVx1QUMwNCBcdUNEOTRcdUFDMDAnKX1cbiAgICAgICAgICA8ZGl2IGlkPVwiY2FkLXRvb2xiYXItYXJlYVwiPjwvZGl2PlxuICAgICAgICAgIDxkaXYgc3R5bGU9XCJkaXNwbGF5OmdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMjIwcHg7IGdhcDoxMnB4OyBtYXJnaW4tdG9wOjEycHg7XCI+XG4gICAgICAgICAgICA8ZGl2IGlkPVwiY2FkLWNhbnZhcy1hcmVhXCI+PC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGlkPVwiY2FkLXNwYWNlcy1hcmVhXCI+PC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgYDtcbiAgICAgIGNvbnN0IGNhbnZhcyA9IG5ldyBDQURDYW52YXMoe1xuICAgICAgICBjb250YWluZXJFbDogbWFpbi5xdWVyeVNlbGVjdG9yKCcjY2FkLWNhbnZhcy1hcmVhJyksXG4gICAgICAgIHdpZHRoOiA3NjAsIGhlaWdodDogNTIwXG4gICAgICB9KTtcbiAgICAgIG5ldyBDQURUb29sYmFyKHsgY29udGFpbmVyRWw6IG1haW4ucXVlcnlTZWxlY3RvcignI2NhZC10b29sYmFyLWFyZWEnKSwgY2FudmFzIH0pO1xuICAgICAgbmV3IENBRFNwYWNlc0xpc3QoeyBjb250YWluZXJFbDogbWFpbi5xdWVyeVNlbGVjdG9yKCcjY2FkLXNwYWNlcy1hcmVhJyksIGNhbnZhcyB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIG1haW4uaW5uZXJIVE1MID0gYDxkaXYgY2xhc3M9XCJjYXJkXCI+PHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tbmVnYXRpdmUpO1wiPkNBRCBcdUI4NUNcdUI0REMgXHVDMkU0XHVEMzI4OiAke2UubWVzc2FnZX08L3A+PC9kaXY+YDtcbiAgICB9XG4gIH1cblxuICBfcmVuZGVyQ29udHJhY3RzKHBhdGgpIHtcbiAgICB0aGlzLl9zZXRBY3RpdmVOYXYocGF0aCk7XG4gICAgY29uc3QgbWFpbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWluLWNvbnRlbnQnKTtcbiAgICBtYWluLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcignXHVBQ0M0XHVDNTdEIFx1QkFBOVx1Qjg1RCcsICdcdUI5QzhcdUJDOTVcdUM3OTBcdUM1RDBcdUMxMUMgXHVBQ0FDXHVDODAxIFx1QzY0NFx1QzEzMSBcdUQ2QzQgXHVBQ0M0XHVDNTdEXHVDMTFDIFx1Qzc5MVx1QzEzMScpfVxuICAgICAgPGRpdiBjbGFzcz1cImNhcmRcIj5cbiAgICAgICAgPGgzPlx1QUNDNFx1QzU3RCBcdUQ2NTRcdUJBNzQgXHVDNTQ4XHVCMEI0PC9oMz5cbiAgICAgICAgPHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tdGV4dC1kaW0pOyBsaW5lLWhlaWdodDogMS43O1wiPlxuICAgICAgICAgIFx1QUNBQ1x1QzgwMSBcdUI5QzhcdUJDOTVcdUM3OTAoRzFcdTIxOTJHNSlcdUI5N0MgXHVDNjQ0XHVCOENDXHVENTU4XHVCQTc0IFx1Qzc5MFx1QjNEOVx1QzczQ1x1Qjg1QyBcdUFDQzRcdUM1N0RcdUMxMUMgXHVDNzkxXHVDMTMxIFx1RDY1NFx1QkE3NFx1Qzc3NCBcdUIwOThcdUQwQzBcdUIwQTlcdUIyQzhcdUIyRTQuPGJyLz5cbiAgICAgICAgICBcdUFDRTBcdUFDMURcdUJBODUgLyBcdUM1RjBcdUI3N0RcdUNDOTggLyBcdUFDRjVcdUMwQUMgXHVDOEZDXHVDMThDIFx1Qzc4NVx1QjgyNSBcdTIxOTIgXHVBQ0M0XHVDNTdEIFx1Q0QwOFx1QzU0OCBcdTIxOTIgXHVDMTFDXHVCQTg1IFx1QzY0NFx1QjhDQyBcdTIxOTIgUERGIFx1Q0Q5Q1x1QjgyNVxuICAgICAgICA8L3A+XG4gICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tdG9wOiAxNnB4O1wiPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgb25jbGljaz1cIndpbmRvdy5sb2NhdGlvbi5oYXNoPScjL3dpemFyZCdcIj5cdUFDQUNcdUM4MDEgXHVCOUM4XHVCQzk1XHVDNzkwXHVCODVDIFx1Qzc3NFx1QjNEOTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cbiAgX3JlbmRlck9yZGVycyhwYXRoKSAgICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QkMxQ1x1QzhGQycsICdQaGFzZSA0IFdlZWsgNicpOyB9XG4gIF9yZW5kZXJTY2hlZHVsZXMocGF0aCkgICB7IHRoaXMuX3JlbmRlclBsYWNlaG9sZGVyKHBhdGgsICdcdUFDRjVcdUM4MTUnLCAnUGhhc2UgNCBXZWVrIDYnKTsgfVxuICBfcmVuZGVySW5zcGVjdGlvbnMocGF0aCkgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnXHVBQzgwXHVDMjE4JywgJ1BoYXNlIDQgV2VlayA2Jyk7IH1cbiAgX3JlbmRlclRvcG9sb2d5KHBhdGgpICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QzJEQ1x1QzJBNFx1RDE1QyBcdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzAnLCAnUGhhc2UgNCBXZWVrIDcnKTsgfVxuICBfcmVuZGVyQUlFeGVjdXRpdmUocGF0aCkgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnQUkgXHVDNzg0XHVDNkQwIFx1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycsICdQaGFzZSA0IFdlZWsgNycpOyB9XG5cbiAgX3JlbmRlcjQwNChwYXRoKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcignNDA0JywgJ1x1QUNCRFx1Qjg1QyBcdUM1QzZcdUM3NEM6ICcgKyBwYXRoKX1cbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgIDxwIHN0eWxlPVwiY29sb3I6IHZhcigtLXRleHQtZGltKTtcIj5cdUM2OTRcdUNDQURcdUQ1NThcdUMyRTAgXHVBQ0JEXHVCODVDXHVCMjk0IFx1Qzg3NFx1QzdBQ1x1RDU1OFx1QzlDMCBcdUM1NEFcdUMyQjVcdUIyQzhcdUIyRTQuPC9wPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9XCJsb2NhdGlvbi5oYXNoPScjLydcIj5cdUQ2NDhcdUM3M0NcdUI4NUM8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEFwcDogQXBwIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgXHVDOUM0XHVDNzg1XHVDODEwXG5jb25zdCB7IEFwcCB9ID0gcmVxdWlyZSgnLi9BcHAuanMnKTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKHsgcm9vdEVsOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJykgfSk7XG4gIHdpbmRvdy5CT0MgPSB3aW5kb3cuQk9DIHx8IHt9O1xuICB3aW5kb3cuQk9DLmFwcCA9IGFwcDtcbiAgY29uc29sZS5sb2coJyVjIEVDT1JFQU4gQk9DIHY2LjAgJywgJ2JhY2tncm91bmQ6ICNjOWE4NGM7IGNvbG9yOiAjMGEwZTFhOyBmb250LXdlaWdodDogYm9sZDsgcGFkZGluZzogNHB4IDhweDsnKTtcbiAgY29uc29sZS5sb2coJ1BoYXNlIDQgV2VlayA1IFx1MjAxNCBcdUFDQzRcdUM1N0QgXHVENjU0XHVCQTc0ICsgUERGIFx1QUNBQ1x1QzgwMVx1QzExQyArIENBRCBcdUI3N0NcdUM2QjBcdUQyQjggXHVENjVDXHVDMTMxXHVENjU0Jyk7XG59KTtcblxuLy8gXHVCQzMxXHVBREY4XHVCNzdDXHVDNkI0XHVCNERDIFx1RDUwNFx1QjlBQ1x1RDM5OFx1Q0U1OCAoRVNNIFx1QkFBOFx1QjREQ1x1QzVEMFx1QzExQyBcdUIzRDlcdUM3OTEpXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpbXBvcnQoJy4uL3dpemFyZC9lbnRyeS5qcycpLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgIGltcG9ydCgnLi4va3BpLWRhc2hib2FyZC9lbnRyeS5qcycpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9LCAyMDAwKTtcbiAgfSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFFQSxRQUFNLFNBQU4sTUFBYTtBQUFBLE1BQ1gsY0FBYztBQUNaLGFBQUssU0FBUyxvQkFBSSxJQUFJO0FBQ3RCLGFBQUssa0JBQWtCO0FBQ3ZCLGFBQUssY0FBYyxDQUFDO0FBQ3BCLGFBQUssY0FBYztBQUFBLE1BQ3JCO0FBQUEsTUFFQSxTQUFTLE1BQU0sU0FBUyxNQUFNO0FBQzVCLGFBQUssT0FBTyxJQUFJLE1BQU07QUFBQSxVQUNwQjtBQUFBLFVBQ0EsTUFBTyxRQUFRLEtBQUssUUFBUyxDQUFDO0FBQUEsUUFDaEMsQ0FBQztBQUFBLE1BQ0g7QUFBQSxNQUVBLFlBQVksU0FBUztBQUNuQixhQUFLLGtCQUFrQjtBQUFBLE1BQ3pCO0FBQUEsTUFFQSxXQUFXLE1BQU07QUFDZixhQUFLLFlBQVksS0FBSyxJQUFJO0FBQUEsTUFDNUI7QUFBQSxNQUVBLFFBQVE7QUFDTixlQUFPLGlCQUFpQixjQUFjLEtBQUssY0FBYyxLQUFLLElBQUksQ0FBQztBQUNuRSxhQUFLLGNBQWM7QUFBQSxNQUNyQjtBQUFBLE1BRUEsU0FBUyxNQUFNO0FBQ2IsZUFBTyxTQUFTLE9BQU87QUFBQSxNQUN6QjtBQUFBLE1BRUEsZ0JBQWdCO0FBQ2QsY0FBTSxPQUFPLE9BQU8sU0FBUyxRQUFRO0FBQ3JDLGNBQU0sT0FBTyxLQUFLLFFBQVEsTUFBTSxFQUFF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
