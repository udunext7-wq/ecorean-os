import {
  require_WizardPage
} from "./chunks/chunk-CI5BRWV6.js";
import "./chunks/chunk-I2C2DGLE.js";
import {
  require_KPIDashboardPage
} from "./chunks/chunk-5EL6EHWC.js";
import {
  require_CoreBus
} from "./chunks/chunk-HLNEQ7F5.js";
import {
  require_CostsAdminPage
} from "./chunks/chunk-6HTPEMRC.js";
import {
  __commonJS
} from "./chunks/chunk-GLFX53DW.js";

// modules-html/boc-v6/src/router/Router.js
var require_Router = __commonJS({
  "modules-html/boc-v6/src/router/Router.js"(exports, module) {
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

// modules-html/boc-v6/src/components/GlobalKPIBar.js
var require_GlobalKPIBar = __commonJS({
  "modules-html/boc-v6/src/components/GlobalKPIBar.js"(exports, module) {
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

// modules-html/boc-v6/src/shell/App.js
var require_App = __commonJS({
  "modules-html/boc-v6/src/shell/App.js"(exports, module) {
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
            Phase 4 / Week 4-A
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
      ${this._renderPageHeader("\uB300\uC2DC\uBCF4\uB4DC", "ECOREAN BOC v6.0 \u2014 Phase 4 Week 4-A")}
      <div class="card">
        <h3>Phase 4 Week 4-A \uC644\uB8CC \u2705</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          cost_items DB (84\uAC74 principal_seed + 10\uAC74 AI\uBCF4\uCDA9)<br/>
          Excel \uC655\uBCF5 (export/import) + IPC Bridge + \uB178\uB4DC \uBD84\uB9AC<br/>
          G1 \uCEE8\uD14D\uC2A4\uD2B8 \uD1B5\uD569 (\uAC70\uC8FC\uC911/\uCE35\uC218/\uC5D8\uB9AC\uBCA0\uC774\uD130/\uC8FC\uC18C) + GlobalKPIBar
        </p>
      </div>
      <div class="card">
        <h3>Phase 4 \uC9C4\uD589 \uD604\uD669</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          \u2705 Week 1: boc-v6 \uC178 + \uB77C\uC6B0\uD305 + \uB2E4\uD06C \uD14C\uB9C8 + esbuild<br/>
          \u2705 Week 2: 5\uB2E8 \uAC8C\uC774\uD2B8 \uB9C8\uBC95\uC790 UI (G1~G5)<br/>
          \u2705 Week 3: CAD L1 \uD3C9\uBA74\uB3C4 \uC778\uD130\uB799\uD2F0\uBE0C (Konva.js)<br/>
          \u2705 Week 4-A: cost_items DB + IPC + \uB178\uB4DC\uBD84\uB9AC + KPI 3\uB808\uC774\uC5B4
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
        this._renderPlaceholder(path, "CAD \uD3C9\uBA74\uB3C4", "Phase 4 Week 5");
      }
      _renderContracts(path) {
        this._renderPlaceholder(path, "\uACC4\uC57D", "Phase 4 Week 5");
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

// modules-html/boc-v6/src/shell/main.js
var { App } = require_App();
document.addEventListener("DOMContentLoaded", function() {
  const app = new App({ rootEl: document.getElementById("app") });
  window.BOC = window.BOC || {};
  window.BOC.app = app;
  console.log("%c ECOREAN BOC v6.0 ", "background: #c9a84c; color: #0a0e1a; font-weight: bold; padding: 4px 8px;");
  console.log("Phase 4 Week 4-A \u2014 cost_items DB + IPC + KPI 3 \uB808\uC774\uC5B4");
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3JvdXRlci9Sb3V0ZXIuanMiLCAiLi4vc3JjL2NvbXBvbmVudHMvR2xvYmFsS1BJQmFyLmpzIiwgIi4uL3NyYy9zaGVsbC9BcHAuanMiLCAiLi4vc3JjL3NoZWxsL21haW4uanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IEhhc2gtYmFzZWQgU1BBIFJvdXRlclxuXG5jbGFzcyBSb3V0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJvdXRlcyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLm5vdEZvdW5kSGFuZGxlciA9IG51bGw7XG4gICAgdGhpcy5iZWZvcmVIb29rcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSBudWxsO1xuICB9XG5cbiAgcmVnaXN0ZXIocGF0aCwgaGFuZGxlciwgb3B0cykge1xuICAgIHRoaXMucm91dGVzLnNldChwYXRoLCB7XG4gICAgICBoYW5kbGVyOiBoYW5kbGVyLFxuICAgICAgbWV0YTogKG9wdHMgJiYgb3B0cy5tZXRhKSB8fCB7fVxuICAgIH0pO1xuICB9XG5cbiAgc2V0Tm90Rm91bmQoaGFuZGxlcikge1xuICAgIHRoaXMubm90Rm91bmRIYW5kbGVyID0gaGFuZGxlcjtcbiAgfVxuXG4gIGJlZm9yZUVhY2goaG9vaykge1xuICAgIHRoaXMuYmVmb3JlSG9va3MucHVzaChob29rKTtcbiAgfVxuXG4gIHN0YXJ0KCkge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdGhpcy5fb25IYXNoQ2hhbmdlLmJpbmQodGhpcykpO1xuICAgIHRoaXMuX29uSGFzaENoYW5nZSgpO1xuICB9XG5cbiAgbmF2aWdhdGUocGF0aCkge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gcGF0aDtcbiAgfVxuXG4gIF9vbkhhc2hDaGFuZ2UoKSB7XG4gICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoIHx8ICcjLyc7XG4gICAgY29uc3QgcGF0aCA9IGhhc2gucmVwbGFjZSgvXiMvLCAnJykgfHwgJy8nO1xuXG4gICAgZm9yIChsZXQgaG9vayBvZiB0aGlzLmJlZm9yZUhvb2tzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBob29rKHBhdGgsIHRoaXMuY3VycmVudFBhdGgpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZmFsc2UpIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZSA9IHRoaXMucm91dGVzLmdldChwYXRoKTtcbiAgICBpZiAocm91dGUpIHtcbiAgICAgIHRoaXMuY3VycmVudFBhdGggPSBwYXRoO1xuICAgICAgcm91dGUuaGFuZGxlcihwYXRoLCByb3V0ZS5tZXRhKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMubm90Rm91bmRIYW5kbGVyKSB7XG4gICAgICB0aGlzLm5vdEZvdW5kSGFuZGxlcihwYXRoKTtcbiAgICB9XG4gIH1cblxuICBnZXRDdXJyZW50UGF0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50UGF0aDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUm91dGVyOiBSb3V0ZXIgfTtcbiIsICJjb25zdCB7IGNvcmVCdXMgfSA9IHJlcXVpcmUoJ0Bjb3JlLWJ1cy9Db3JlQnVzLmNqcycpO1xuXG5jbGFzcyBHbG9iYWxLUElCYXIge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5jb250YWluZXJFbCA9IG9wdHMuY29udGFpbmVyRWw7XG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGF1dG9tYXRpb246IDAsIGZpbmFsOiAwLCBtYXJnaW46IDAsIGFjdGl2ZUNvdW50OiAxLCBpc1NpbXVsYXRlZDogdHJ1ZVxuICAgIH07XG5cbiAgICB0aGlzLnVuc3Vic2NyaWJlID0gY29yZUJ1cy5vbignS1BJX1VQREFURScsIChkYXRhKSA9PiB7XG4gICAgICBpZiAoZGF0YS5hdXRvbWF0aW9uICE9PSB1bmRlZmluZWQpIHRoaXMuc3RhdGUuYXV0b21hdGlvbiA9IGRhdGEuYXV0b21hdGlvbjtcbiAgICAgIGlmIChkYXRhLmZpbmFsICAgICAgIT09IHVuZGVmaW5lZCkgdGhpcy5zdGF0ZS5maW5hbCAgICAgID0gZGF0YS5maW5hbDtcbiAgICAgIGlmIChkYXRhLm1hcmdpbiAgICAgIT09IHVuZGVmaW5lZCkgdGhpcy5zdGF0ZS5tYXJnaW4gICAgID0gZGF0YS5tYXJnaW47XG4gICAgICBpZiAoZGF0YS5pc1NpbXVsYXRlZCE9PSB1bmRlZmluZWQpIHRoaXMuc3RhdGUuaXNTaW11bGF0ZWQ9IGRhdGEuaXNTaW11bGF0ZWQ7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fbG9hZEFjdGl2ZUNvdW50KCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIGFzeW5jIF9sb2FkQWN0aXZlQ291bnQoKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5ib2MgJiYgd2luZG93LmJvYy5rcGkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuc3RhdGUuYWN0aXZlQ291bnQgPSBhd2FpdCB3aW5kb3cuYm9jLmtwaS5nZXRBY3RpdmVDb3VudCgpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgfSBjYXRjaChlKSB7fVxuICAgIH1cbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBmbXQgPSAobikgPT4gTWF0aC5yb3VuZChuKS50b0xvY2FsZVN0cmluZygna28tS1InKTtcbiAgICBjb25zdCBzaW1CYWRnZSA9IHRoaXMuc3RhdGUuaXNTaW11bGF0ZWRcbiAgICAgID8gJzxzcGFuIGNsYXNzPVwic2ltLWJhZGdlXCI+XHVDMkRDXHVCQkFDPC9zcGFuPicgOiAnJztcblxuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImdsb2JhbC1rcGktYmFyXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktaXRlbVwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLWxhYmVsXCI+XHVDNzkwXHVCM0Q5XHVENjU0PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLXZhbHVlXCI+JHt0aGlzLnN0YXRlLmF1dG9tYXRpb259JTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktZGl2aWRlclwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwia3BpLWl0ZW0gaGlnaGxpZ2h0XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJrcGktbGFiZWxcIj5cdUNENUNcdUM4ODU8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJrcGktdmFsdWVcIj4ke2ZtdCh0aGlzLnN0YXRlLmZpbmFsKX1cdUM2RDA8L3NwYW4+XG4gICAgICAgICAgJHtzaW1CYWRnZX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktZGl2aWRlclwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwia3BpLWl0ZW1cIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImtwaS1sYWJlbFwiPlx1QjlDOFx1QzlDNDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImtwaS12YWx1ZVwiPiR7dGhpcy5zdGF0ZS5tYXJnaW4udG9GaXhlZCA/IHRoaXMuc3RhdGUubWFyZ2luLnRvRml4ZWQoMSkgOiAnMC4wJ30lPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImtwaS1kaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktaXRlbVwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLWxhYmVsXCI+XHVDOUM0XHVENTg5PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwia3BpLXZhbHVlXCI+JHt0aGlzLnN0YXRlLmFjdGl2ZUNvdW50fVx1QUM3NDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy51bnN1YnNjcmliZSkgdGhpcy51bnN1YnNjcmliZSgpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHbG9iYWxLUElCYXIgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBBcHAgXHVCQTU0XHVDNzc4IFx1Q0VFOFx1RDE0Q1x1Qzc3NFx1QjEwOFxuY29uc3QgeyBSb3V0ZXIgfSA9IHJlcXVpcmUoJy4uL3JvdXRlci9Sb3V0ZXIuanMnKTtcblxuY2xhc3MgQXBwIHtcbiAgY29uc3RydWN0b3Iob3B0cykge1xuICAgIHRoaXMucm9vdEVsID0gb3B0cy5yb290RWwgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcCcpO1xuICAgIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBudWxsO1xuICAgIHRoaXMuZ2xvYmFsS1BJID0gbnVsbDtcblxuICAgIHRoaXMuX3NldHVwUm91dGVzKCk7XG4gICAgdGhpcy5fcmVuZGVyKCk7XG4gIH1cblxuICBfc2V0dXBSb3V0ZXMoKSB7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy8nLCB0aGlzLl9yZW5kZXJIb21lLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL3dpemFyZCcsIHRoaXMuX3JlbmRlcldpemFyZC5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUFDQUNcdUM4MDEgXHVCOUM4XHVCQzk1XHVDNzkwJyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvY2FkJywgdGhpcy5fcmVuZGVyQ0FELmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ0NBRCBcdUQzQzlcdUJBNzRcdUIzQzQnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9rcGknLCB0aGlzLl9yZW5kZXJLUEkuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnS1BJIFx1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL2FkbWluL2Nvc3RzJywgdGhpcy5fcmVuZGVyQWRtaW5Db3N0cy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUIyRThcdUFDMDAgXHVBRDAwXHVCOUFDJyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvY29udHJhY3RzJywgdGhpcy5fcmVuZGVyQ29udHJhY3RzLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QUNDNFx1QzU3RCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL29yZGVycycsIHRoaXMuX3JlbmRlck9yZGVycy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUJDMUNcdUM4RkMnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9zY2hlZHVsZXMnLCB0aGlzLl9yZW5kZXJTY2hlZHVsZXMuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnXHVBQ0Y1XHVDODE1JyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvaW5zcGVjdGlvbnMnLCB0aGlzLl9yZW5kZXJJbnNwZWN0aW9ucy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUFDODBcdUMyMTgnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy90b3BvbG9neScsIHRoaXMuX3JlbmRlclRvcG9sb2d5LmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QzJEQ1x1QzJBNFx1RDE1QyBcdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzAnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9haS1leGVjdXRpdmUnLCB0aGlzLl9yZW5kZXJBSUV4ZWN1dGl2ZS5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdBSSBcdUM3ODRcdUM2RDAnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIuc2V0Tm90Rm91bmQodGhpcy5fcmVuZGVyNDA0LmJpbmQodGhpcykpO1xuICB9XG5cbiAgX3JlbmRlcigpIHtcbiAgICB0aGlzLnJvb3RFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwiYXBwLXNoZWxsXCI+XG4gICAgICAgIDxoZWFkZXIgY2xhc3M9XCJhcHAtaGVhZGVyXCI+XG4gICAgICAgICAgPGgxPkVDT1JFQU4gQk9DIHY2LjA8L2gxPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGFjZXJcIj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxpdmVcIj5cdTI1Q0YgTElWRTwvc3Bhbj5cbiAgICAgICAgICAgIFBoYXNlIDQgLyBXZWVrIDQtQVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2hlYWRlcj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImFwcC1rcGliYXJcIiBpZD1cImdsb2JhbC1rcGktYmFyXCI+PC9kaXY+XG4gICAgICAgIDxhc2lkZSBjbGFzcz1cImFwcC1zaWRlYmFyXCI+JHt0aGlzLl9yZW5kZXJTaWRlYmFyKCl9PC9hc2lkZT5cbiAgICAgICAgPG1haW4gY2xhc3M9XCJhcHAtbWFpblwiIGlkPVwibWFpbi1jb250ZW50XCI+PC9tYWluPlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IEdsb2JhbEtQSUJhciB9ID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9HbG9iYWxLUElCYXIuanMnKTtcbiAgICAgIHRoaXMuZ2xvYmFsS1BJID0gbmV3IEdsb2JhbEtQSUJhcih7XG4gICAgICAgIGNvbnRhaW5lckVsOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2xvYmFsLWtwaS1iYXInKVxuICAgICAgfSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tBcHBdIEdsb2JhbEtQSUJhciBcdUI4NUNcdUI0REMgXHVDMkU0XHVEMzI4OicsIGUubWVzc2FnZSk7XG4gICAgfVxuXG4gICAgdGhpcy5yb290RWwucXVlcnlTZWxlY3RvckFsbCgnLm5hdi1pdGVtJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGVsLmRhdGFzZXQucGF0aDtcbiAgICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUocGF0aCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRoaXMucm91dGVyLnN0YXJ0KCk7XG4gIH1cblxuICBfcmVuZGVyU2lkZWJhcigpIHtcbiAgICByZXR1cm4gYFxuICAgICAgPGRpdiBjbGFzcz1cIm5hdi1zZWN0aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPlx1QkE1NFx1Qzc3ODwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvXCI+XHVCMzAwXHVDMkRDXHVCQ0Y0XHVCNERDPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi93aXphcmRcIj5cdUFDQUNcdUM4MDEgXHVCOUM4XHVCQzk1XHVDNzkwPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJuYXYtc2VjdGlvblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj5cdUM4MUNcdUM3OTE8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL2NhZFwiPkNBRCBcdUQzQzlcdUJBNzRcdUIzQzQ8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL2twaVwiPktQSSBcdUIzMDBcdUMyRENcdUJDRjRcdUI0REM8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cIm5hdi1zZWN0aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPkNsb3NlZCBMb29wPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9jb250cmFjdHNcIj5cdUFDQzRcdUM1N0Q8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL29yZGVyc1wiPlx1QkMxQ1x1QzhGQzwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvc2NoZWR1bGVzXCI+XHVBQ0Y1XHVDODE1PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9pbnNwZWN0aW9uc1wiPlx1QUM4MFx1QzIxODwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwibmF2LXNlY3Rpb25cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+XHVBRDAwXHVCOUFDPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9hZG1pbi9jb3N0c1wiPlx1QjJFOFx1QUMwMCBcdUFEMDBcdUI5QUM8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cIm5hdi1zZWN0aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPlx1QzJEQ1x1QzJBNFx1RDE1QzwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvdG9wb2xvZ3lcIj5cdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL2FpLWV4ZWN1dGl2ZVwiPkFJIFx1Qzc4NFx1QzZEMDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcbiAgfVxuXG4gIF9zZXRBY3RpdmVOYXYocGF0aCkge1xuICAgIHRoaXMucm9vdEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYXYtaXRlbScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgZWwuZGF0YXNldC5wYXRoID09PSBwYXRoKTtcbiAgICB9KTtcbiAgfVxuXG4gIF9yZW5kZXJQYWdlSGVhZGVyKHRpdGxlLCBzdWJ0aXRsZSkge1xuICAgIHJldHVybiBgXG4gICAgICA8ZGl2IGNsYXNzPVwicGFnZS1oZWFkZXJcIj5cbiAgICAgICAgPGgyPiR7dGl0bGV9PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInN1YnRpdGxlXCI+JHtzdWJ0aXRsZSB8fCAnJ308L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfcmVuZGVySG9tZShwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWluLWNvbnRlbnQnKS5pbm5lckhUTUwgPSBgXG4gICAgICAke3RoaXMuX3JlbmRlclBhZ2VIZWFkZXIoJ1x1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycsICdFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBQaGFzZSA0IFdlZWsgNC1BJyl9XG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8aDM+UGhhc2UgNCBXZWVrIDQtQSBcdUM2NDRcdUI4Q0MgXHUyNzA1PC9oMz5cbiAgICAgICAgPHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tdGV4dC1kaW0pOyBsaW5lLWhlaWdodDogMS42O1wiPlxuICAgICAgICAgIGNvc3RfaXRlbXMgREIgKDg0XHVBQzc0IHByaW5jaXBhbF9zZWVkICsgMTBcdUFDNzQgQUlcdUJDRjRcdUNEQTkpPGJyLz5cbiAgICAgICAgICBFeGNlbCBcdUM2NTVcdUJDRjUgKGV4cG9ydC9pbXBvcnQpICsgSVBDIEJyaWRnZSArIFx1QjE3OFx1QjREQyBcdUJEODRcdUI5QUM8YnIvPlxuICAgICAgICAgIEcxIFx1Q0VFOFx1RDE0RFx1QzJBNFx1RDJCOCBcdUQxQjVcdUQ1NjkgKFx1QUM3MFx1QzhGQ1x1QzkxMS9cdUNFMzVcdUMyMTgvXHVDNUQ4XHVCOUFDXHVCQ0EwXHVDNzc0XHVEMTMwL1x1QzhGQ1x1QzE4QykgKyBHbG9iYWxLUElCYXJcbiAgICAgICAgPC9wPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8aDM+UGhhc2UgNCBcdUM5QzRcdUQ1ODkgXHVENjA0XHVENjY5PC9oMz5cbiAgICAgICAgPHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tdGV4dC1kaW0pOyBsaW5lLWhlaWdodDogMS42O1wiPlxuICAgICAgICAgIFx1MjcwNSBXZWVrIDE6IGJvYy12NiBcdUMxNzggKyBcdUI3N0NcdUM2QjBcdUQzMDUgKyBcdUIyRTRcdUQwNkMgXHVEMTRDXHVCOUM4ICsgZXNidWlsZDxici8+XG4gICAgICAgICAgXHUyNzA1IFdlZWsgMjogNVx1QjJFOCBcdUFDOENcdUM3NzRcdUQyQjggXHVCOUM4XHVCQzk1XHVDNzkwIFVJIChHMX5HNSk8YnIvPlxuICAgICAgICAgIFx1MjcwNSBXZWVrIDM6IENBRCBMMSBcdUQzQzlcdUJBNzRcdUIzQzQgXHVDNzc4XHVEMTMwXHVCNzk5XHVEMkYwXHVCRTBDIChLb252YS5qcyk8YnIvPlxuICAgICAgICAgIFx1MjcwNSBXZWVrIDQtQTogY29zdF9pdGVtcyBEQiArIElQQyArIFx1QjE3OFx1QjREQ1x1QkQ4NFx1QjlBQyArIEtQSSAzXHVCODA4XHVDNzc0XHVDNUI0XG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgdGl0bGUsIHdlZWtUYXJnZXQpIHtcbiAgICB0aGlzLl9zZXRBY3RpdmVOYXYocGF0aCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcih0aXRsZSwgd2Vla1RhcmdldCArICcgXHVENjVDXHVDMTMxXHVENjU0IFx1QzYwOFx1QzgxNScpfVxuICAgICAgPGRpdiBjbGFzcz1cImNhcmRcIj5cbiAgICAgICAgPGgzPlx1QzkwMFx1QkU0NCBcdUM5MTE8L2gzPlxuICAgICAgICA8cCBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7XCI+XHVCQ0Y4IFx1RDY1NFx1QkE3NFx1Qzc0MCAke3dlZWtUYXJnZXR9XHVDNUQwXHVDMTFDIFx1RDY1Q1x1QzEzMVx1RDY1NFx1QjQyOVx1QjJDOFx1QjJFNC48L3A+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgX3JlbmRlcldpemFyZChwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGNvbnN0IG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50Jyk7XG4gICAgbWFpbi5pbm5lckhUTUwgPSAnPGRpdiBzdHlsZT1cInBhZGRpbmc6IDQwcHg7IGNvbG9yOiB2YXIoLS1nb2xkKTtcIj5cdUI4NUNcdUI1MjkgXHVDOTExLi4uPC9kaXY+JztcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBXaXphcmRQYWdlIH0gPSByZXF1aXJlKCcuLi93aXphcmQvV2l6YXJkUGFnZS5qcycpO1xuICAgICAgbWFpbi5pbm5lckhUTUwgPSAnJztcbiAgICAgIG5ldyBXaXphcmRQYWdlKHsgY29udGFpbmVyRWw6IG1haW4gfSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBtYWluLmlubmVySFRNTCA9IGA8ZGl2IGNsYXNzPVwiY2FyZFwiPjxwIHN0eWxlPVwiY29sb3I6IHZhcigtLW5lZ2F0aXZlKTtcIj5cdUI5QzhcdUJDOTVcdUM3OTAgXHVCODVDXHVCNERDIFx1QzJFNFx1RDMyODogJHtlLm1lc3NhZ2V9PC9wPjwvZGl2PmA7XG4gICAgfVxuICB9XG5cbiAgX3JlbmRlcktQSShwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGNvbnN0IG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50Jyk7XG4gICAgbWFpbi5pbm5lckhUTUwgPSAnPGRpdiBzdHlsZT1cInBhZGRpbmc6IDQwcHg7IGNvbG9yOiB2YXIoLS1nb2xkKTtcIj5LUEkgXHVCODVDXHVCNTI5IFx1QzkxMS4uLjwvZGl2Pic7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgS1BJRGFzaGJvYXJkUGFnZSB9ID0gcmVxdWlyZSgnLi4va3BpLWRhc2hib2FyZC9LUElEYXNoYm9hcmRQYWdlLmpzJyk7XG4gICAgICBtYWluLmlubmVySFRNTCA9ICcnO1xuICAgICAgbmV3IEtQSURhc2hib2FyZFBhZ2UoeyBjb250YWluZXJFbDogbWFpbiB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIG1haW4uaW5uZXJIVE1MID0gYDxkaXYgY2xhc3M9XCJjYXJkXCI+PHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tbmVnYXRpdmUpO1wiPktQSSBcdUI4NUNcdUI0REMgXHVDMkU0XHVEMzI4OiAke2UubWVzc2FnZX08L3A+PC9kaXY+YDtcbiAgICB9XG4gIH1cblxuICBfcmVuZGVyQWRtaW5Db3N0cyhwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KCcvYWRtaW4vY29zdHMnKTtcbiAgICBjb25zdCBtYWluID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpO1xuICAgIG1haW4uaW5uZXJIVE1MID0gJzxkaXYgc3R5bGU9XCJwYWRkaW5nOiA0MHB4OyBjb2xvcjogdmFyKC0tZ29sZCk7XCI+XHVCODVDXHVCNTI5IFx1QzkxMS4uLjwvZGl2Pic7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgQ29zdHNBZG1pblBhZ2UgfSA9IHJlcXVpcmUoJy4uL2FkbWluL0Nvc3RzQWRtaW5QYWdlLmpzJyk7XG4gICAgICBtYWluLmlubmVySFRNTCA9ICcnO1xuICAgICAgbmV3IENvc3RzQWRtaW5QYWdlKHsgY29udGFpbmVyRWw6IG1haW4gfSk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBtYWluLmlubmVySFRNTCA9IGA8ZGl2IGNsYXNzPVwiY2FyZFwiPjxwIHN0eWxlPVwiY29sb3I6IHZhcigtLW5lZ2F0aXZlKTtcIj5cdUIyRThcdUFDMDBcdUFEMDBcdUI5QUMgXHVCODVDXHVCNERDIFx1QzJFNFx1RDMyODogJHtlLm1lc3NhZ2V9PC9wPjwvZGl2PmA7XG4gICAgfVxuICB9XG5cbiAgX3JlbmRlckNBRChwYXRoKSAgICAgICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ0NBRCBcdUQzQzlcdUJBNzRcdUIzQzQnLCAnUGhhc2UgNCBXZWVrIDUnKTsgfVxuICBfcmVuZGVyQ29udHJhY3RzKHBhdGgpICAgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnXHVBQ0M0XHVDNTdEJywgJ1BoYXNlIDQgV2VlayA1Jyk7IH1cbiAgX3JlbmRlck9yZGVycyhwYXRoKSAgICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QkMxQ1x1QzhGQycsICdQaGFzZSA0IFdlZWsgNicpOyB9XG4gIF9yZW5kZXJTY2hlZHVsZXMocGF0aCkgICB7IHRoaXMuX3JlbmRlclBsYWNlaG9sZGVyKHBhdGgsICdcdUFDRjVcdUM4MTUnLCAnUGhhc2UgNCBXZWVrIDYnKTsgfVxuICBfcmVuZGVySW5zcGVjdGlvbnMocGF0aCkgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnXHVBQzgwXHVDMjE4JywgJ1BoYXNlIDQgV2VlayA2Jyk7IH1cbiAgX3JlbmRlclRvcG9sb2d5KHBhdGgpICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QzJEQ1x1QzJBNFx1RDE1QyBcdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzAnLCAnUGhhc2UgNCBXZWVrIDcnKTsgfVxuICBfcmVuZGVyQUlFeGVjdXRpdmUocGF0aCkgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnQUkgXHVDNzg0XHVDNkQwIFx1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycsICdQaGFzZSA0IFdlZWsgNycpOyB9XG5cbiAgX3JlbmRlcjQwNChwYXRoKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcignNDA0JywgJ1x1QUNCRFx1Qjg1QyBcdUM1QzZcdUM3NEM6ICcgKyBwYXRoKX1cbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgIDxwIHN0eWxlPVwiY29sb3I6IHZhcigtLXRleHQtZGltKTtcIj5cdUM2OTRcdUNDQURcdUQ1NThcdUMyRTAgXHVBQ0JEXHVCODVDXHVCMjk0IFx1Qzg3NFx1QzdBQ1x1RDU1OFx1QzlDMCBcdUM1NEFcdUMyQjVcdUIyQzhcdUIyRTQuPC9wPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9XCJsb2NhdGlvbi5oYXNoPScjLydcIj5cdUQ2NDhcdUM3M0NcdUI4NUM8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEFwcDogQXBwIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgXHVDOUM0XHVDNzg1XHVDODEwXG5jb25zdCB7IEFwcCB9ID0gcmVxdWlyZSgnLi9BcHAuanMnKTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKHsgcm9vdEVsOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJykgfSk7XG4gIHdpbmRvdy5CT0MgPSB3aW5kb3cuQk9DIHx8IHt9O1xuICB3aW5kb3cuQk9DLmFwcCA9IGFwcDtcbiAgY29uc29sZS5sb2coJyVjIEVDT1JFQU4gQk9DIHY2LjAgJywgJ2JhY2tncm91bmQ6ICNjOWE4NGM7IGNvbG9yOiAjMGEwZTFhOyBmb250LXdlaWdodDogYm9sZDsgcGFkZGluZzogNHB4IDhweDsnKTtcbiAgY29uc29sZS5sb2coJ1BoYXNlIDQgV2VlayA0LUEgXHUyMDE0IGNvc3RfaXRlbXMgREIgKyBJUEMgKyBLUEkgMyBcdUI4MDhcdUM3NzRcdUM1QjQnKTtcbn0pO1xuXG4vLyBcdUJDMzFcdUFERjhcdUI3N0NcdUM2QjRcdUI0REMgXHVENTA0XHVCOUFDXHVEMzk4XHVDRTU4IChFU00gXHVCQUE4XHVCNERDXHVDNUQwXHVDMTFDIFx1QjNEOVx1Qzc5MSlcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGltcG9ydCgnLi4vd2l6YXJkL2VudHJ5LmpzJykuY2F0Y2goKCkgPT4ge30pO1xuICAgICAgaW1wb3J0KCcuLi9rcGktZGFzaGJvYXJkL2VudHJ5LmpzJykuY2F0Y2goKCkgPT4ge30pO1xuICAgIH0sIDIwMDApO1xuICB9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFFQSxRQUFNLFNBQU4sTUFBYTtBQUFBLE1BQ1gsY0FBYztBQUNaLGFBQUssU0FBUyxvQkFBSSxJQUFJO0FBQ3RCLGFBQUssa0JBQWtCO0FBQ3ZCLGFBQUssY0FBYyxDQUFDO0FBQ3BCLGFBQUssY0FBYztBQUFBLE1BQ3JCO0FBQUEsTUFFQSxTQUFTLE1BQU0sU0FBUyxNQUFNO0FBQzVCLGFBQUssT0FBTyxJQUFJLE1BQU07QUFBQSxVQUNwQjtBQUFBLFVBQ0EsTUFBTyxRQUFRLEtBQUssUUFBUyxDQUFDO0FBQUEsUUFDaEMsQ0FBQztBQUFBLE1BQ0g7QUFBQSxNQUVBLFlBQVksU0FBUztBQUNuQixhQUFLLGtCQUFrQjtBQUFBLE1BQ3pCO0FBQUEsTUFFQSxXQUFXLE1BQU07QUFDZixhQUFLLFlBQVksS0FBSyxJQUFJO0FBQUEsTUFDNUI7QUFBQSxNQUVBLFFBQVE7QUFDTixlQUFPLGlCQUFpQixjQUFjLEtBQUssY0FBYyxLQUFLLElBQUksQ0FBQztBQUNuRSxhQUFLLGNBQWM7QUFBQSxNQUNyQjtBQUFBLE1BRUEsU0FBUyxNQUFNO0FBQ2IsZUFBTyxTQUFTLE9BQU87QUFBQSxNQUN6QjtBQUFBLE1BRUEsZ0JBQWdCO0FBQ2QsY0FBTSxPQUFPLE9BQU8sU0FBUyxRQUFRO0FBQ3JDLGNBQU0sT0FBTyxLQUFLLFFBQVEsTUFBTSxFQUFFLEtBQUs7QUFFdkMsaUJBQVMsUUFBUSxLQUFLLGFBQWE7QUFDakMsZ0JBQU0sU0FBUyxLQUFLLE1BQU0sS0FBSyxXQUFXO0FBQzFDLGNBQUksV0FBVyxNQUFPO0FBQUEsUUFDeEI7QUFFQSxjQUFNLFFBQVEsS0FBSyxPQUFPLElBQUksSUFBSTtBQUNsQyxZQUFJLE9BQU87QUFDVCxlQUFLLGNBQWM7QUFDbkIsZ0JBQU0sUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUFBLFFBQ2hDLFdBQVcsS0FBSyxpQkFBaUI7QUFDL0IsZUFBSyxnQkFBZ0IsSUFBSTtBQUFBLFFBQzNCO0FBQUEsTUFDRjtBQUFBLE1BRUEsaUJBQWlCO0FBQ2YsZUFBTyxLQUFLO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFFQSxXQUFPLFVBQVUsRUFBRSxPQUFlO0FBQUE7QUFBQTs7O0FDekRsQztBQUFBO0FBQUEsUUFBTSxFQUFFLFFBQVEsSUFBSTtBQUVwQixRQUFNLGVBQU4sTUFBbUI7QUFBQSxNQUNqQixZQUFZLE1BQU07QUFDaEIsYUFBSyxjQUFjLEtBQUs7QUFDeEIsYUFBSyxRQUFRO0FBQUEsVUFDWCxZQUFZO0FBQUEsVUFBRyxPQUFPO0FBQUEsVUFBRyxRQUFRO0FBQUEsVUFBRyxhQUFhO0FBQUEsVUFBRyxhQUFhO0FBQUEsUUFDbkU7QUFFQSxhQUFLLGNBQWMsUUFBUSxHQUFHLGNBQWMsQ0FBQyxTQUFTO0FBQ3BELGNBQUksS0FBSyxlQUFlLE9BQVcsTUFBSyxNQUFNLGFBQWEsS0FBSztBQUNoRSxjQUFJLEtBQUssVUFBZSxPQUFXLE1BQUssTUFBTSxRQUFhLEtBQUs7QUFDaEUsY0FBSSxLQUFLLFdBQWUsT0FBVyxNQUFLLE1BQU0sU0FBYSxLQUFLO0FBQ2hFLGNBQUksS0FBSyxnQkFBZSxPQUFXLE1BQUssTUFBTSxjQUFhLEtBQUs7QUFDaEUsZUFBSyxPQUFPO0FBQUEsUUFDZCxDQUFDO0FBRUQsYUFBSyxpQkFBaUI7QUFDdEIsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLE1BRUEsTUFBTSxtQkFBbUI7QUFDdkIsWUFBSSxPQUFPLFdBQVcsZUFBZSxPQUFPLE9BQU8sT0FBTyxJQUFJLEtBQUs7QUFDakUsY0FBSTtBQUNGLGlCQUFLLE1BQU0sY0FBYyxNQUFNLE9BQU8sSUFBSSxJQUFJLGVBQWU7QUFDN0QsaUJBQUssT0FBTztBQUFBLFVBQ2QsU0FBUSxHQUFHO0FBQUEsVUFBQztBQUFBLFFBQ2Q7QUFBQSxNQUNGO0FBQUEsTUFFQSxTQUFTO0FBQ1AsY0FBTSxNQUFNLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxFQUFFLGVBQWUsT0FBTztBQUN2RCxjQUFNLFdBQVcsS0FBSyxNQUFNLGNBQ3hCLGdEQUFzQztBQUUxQyxhQUFLLFlBQVksWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBLG9DQUlHLEtBQUssTUFBTSxVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxvQ0FLckIsSUFBSSxLQUFLLE1BQU0sS0FBSyxDQUFDO0FBQUEsWUFDN0MsUUFBUTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsb0NBS2dCLEtBQUssTUFBTSxPQUFPLFVBQVUsS0FBSyxNQUFNLE9BQU8sUUFBUSxDQUFDLElBQUksS0FBSztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsb0NBS2hFLEtBQUssTUFBTSxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFJeEQ7QUFBQSxNQUVBLFVBQVU7QUFDUixZQUFJLEtBQUssWUFBYSxNQUFLLFlBQVk7QUFBQSxNQUN6QztBQUFBLElBQ0Y7QUFFQSxXQUFPLFVBQVUsRUFBRSxhQUFhO0FBQUE7QUFBQTs7O0FDbEVoQztBQUFBO0FBQ0EsUUFBTSxFQUFFLE9BQU8sSUFBSTtBQUVuQixRQUFNQSxPQUFOLE1BQVU7QUFBQSxNQUNSLFlBQVksTUFBTTtBQUNoQixhQUFLLFNBQVMsS0FBSyxVQUFVLFNBQVMsZUFBZSxLQUFLO0FBQzFELGFBQUssU0FBUyxJQUFJLE9BQU87QUFDekIsYUFBSyxjQUFjO0FBQ25CLGFBQUssWUFBWTtBQUVqQixhQUFLLGFBQWE7QUFDbEIsYUFBSyxRQUFRO0FBQUEsTUFDZjtBQUFBLE1BRUEsZUFBZTtBQUNiLGFBQUssT0FBTyxTQUFTLEtBQUssS0FBSyxZQUFZLEtBQUssSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sMkJBQU8sRUFBRSxDQUFDO0FBQ2xGLGFBQUssT0FBTyxTQUFTLFdBQVcsS0FBSyxjQUFjLEtBQUssSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sa0NBQVMsRUFBRSxDQUFDO0FBQzVGLGFBQUssT0FBTyxTQUFTLFFBQVEsS0FBSyxXQUFXLEtBQUssSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8seUJBQVUsRUFBRSxDQUFDO0FBQ3ZGLGFBQUssT0FBTyxTQUFTLFFBQVEsS0FBSyxXQUFXLEtBQUssSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sK0JBQVcsRUFBRSxDQUFDO0FBQ3hGLGFBQUssT0FBTyxTQUFTLGdCQUFnQixLQUFLLGtCQUFrQixLQUFLLElBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLDRCQUFRLEVBQUUsQ0FBQztBQUNwRyxhQUFLLE9BQU8sU0FBUyxjQUFjLEtBQUssaUJBQWlCLEtBQUssSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sZUFBSyxFQUFFLENBQUM7QUFDOUYsYUFBSyxPQUFPLFNBQVMsV0FBVyxLQUFLLGNBQWMsS0FBSyxJQUFJLEdBQUcsRUFBRSxNQUFNLEVBQUUsT0FBTyxlQUFLLEVBQUUsQ0FBQztBQUN4RixhQUFLLE9BQU8sU0FBUyxjQUFjLEtBQUssaUJBQWlCLEtBQUssSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sZUFBSyxFQUFFLENBQUM7QUFDOUYsYUFBSyxPQUFPLFNBQVMsZ0JBQWdCLEtBQUssbUJBQW1CLEtBQUssSUFBSSxHQUFHLEVBQUUsTUFBTSxFQUFFLE9BQU8sZUFBSyxFQUFFLENBQUM7QUFDbEcsYUFBSyxPQUFPLFNBQVMsYUFBYSxLQUFLLGdCQUFnQixLQUFLLElBQUksR0FBRyxFQUFFLE1BQU0sRUFBRSxPQUFPLDhDQUFXLEVBQUUsQ0FBQztBQUNsRyxhQUFLLE9BQU8sU0FBUyxpQkFBaUIsS0FBSyxtQkFBbUIsS0FBSyxJQUFJLEdBQUcsRUFBRSxNQUFNLEVBQUUsT0FBTyxrQkFBUSxFQUFFLENBQUM7QUFDdEcsYUFBSyxPQUFPLFlBQVksS0FBSyxXQUFXLEtBQUssSUFBSSxDQUFDO0FBQUEsTUFDcEQ7QUFBQSxNQUVBLFVBQVU7QUFDUixhQUFLLE9BQU8sWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUNBV1MsS0FBSyxlQUFlLENBQUM7QUFBQTtBQUFBO0FBQUE7QUFLdEQsWUFBSTtBQUNGLGdCQUFNLEVBQUUsYUFBYSxJQUFJO0FBQ3pCLGVBQUssWUFBWSxJQUFJLGFBQWE7QUFBQSxZQUNoQyxhQUFhLFNBQVMsZUFBZSxnQkFBZ0I7QUFBQSxVQUN2RCxDQUFDO0FBQUEsUUFDSCxTQUFRLEdBQUc7QUFDVCxrQkFBUSxLQUFLLGlEQUE2QixFQUFFLE9BQU87QUFBQSxRQUNyRDtBQUVBLGFBQUssT0FBTyxpQkFBaUIsV0FBVyxFQUFFLFFBQVEsUUFBTTtBQUN0RCxhQUFHLGlCQUFpQixTQUFTLE1BQU07QUFDakMsa0JBQU0sT0FBTyxHQUFHLFFBQVE7QUFDeEIsaUJBQUssT0FBTyxTQUFTLElBQUk7QUFBQSxVQUMzQixDQUFDO0FBQUEsUUFDSCxDQUFDO0FBRUQsYUFBSyxPQUFPLE1BQU07QUFBQSxNQUNwQjtBQUFBLE1BRUEsaUJBQWlCO0FBQ2YsZUFBTztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BNEJUO0FBQUEsTUFFQSxjQUFjLE1BQU07QUFDbEIsYUFBSyxPQUFPLGlCQUFpQixXQUFXLEVBQUUsUUFBUSxRQUFNO0FBQ3RELGFBQUcsVUFBVSxPQUFPLFVBQVUsR0FBRyxRQUFRLFNBQVMsSUFBSTtBQUFBLFFBQ3hELENBQUM7QUFBQSxNQUNIO0FBQUEsTUFFQSxrQkFBa0IsT0FBTyxVQUFVO0FBQ2pDLGVBQU87QUFBQTtBQUFBLGNBRUcsS0FBSztBQUFBLGdDQUNhLFlBQVksRUFBRTtBQUFBO0FBQUE7QUFBQSxNQUc1QztBQUFBLE1BRUEsWUFBWSxNQUFNO0FBQ2hCLGFBQUssY0FBYyxJQUFJO0FBQ3ZCLGlCQUFTLGVBQWUsY0FBYyxFQUFFLFlBQVk7QUFBQSxRQUNoRCxLQUFLLGtCQUFrQiw0QkFBUSwwQ0FBcUMsQ0FBQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BbUIzRTtBQUFBLE1BRUEsbUJBQW1CLE1BQU0sT0FBTyxZQUFZO0FBQzFDLGFBQUssY0FBYyxJQUFJO0FBQ3ZCLGlCQUFTLGVBQWUsY0FBYyxFQUFFLFlBQVk7QUFBQSxRQUNoRCxLQUFLLGtCQUFrQixPQUFPLGFBQWEsa0NBQVMsQ0FBQztBQUFBO0FBQUE7QUFBQSx1RUFHVixVQUFVO0FBQUE7QUFBQTtBQUFBLE1BRzNEO0FBQUEsTUFFQSxjQUFjLE1BQU07QUFDbEIsYUFBSyxjQUFjLElBQUk7QUFDdkIsY0FBTSxPQUFPLFNBQVMsZUFBZSxjQUFjO0FBQ25ELGFBQUssWUFBWTtBQUNqQixZQUFJO0FBQ0YsZ0JBQU0sRUFBRSxXQUFXLElBQUk7QUFDdkIsZUFBSyxZQUFZO0FBQ2pCLGNBQUksV0FBVyxFQUFFLGFBQWEsS0FBSyxDQUFDO0FBQUEsUUFDdEMsU0FBUSxHQUFHO0FBQ1QsZUFBSyxZQUFZLHNHQUFtRSxFQUFFLE9BQU87QUFBQSxRQUMvRjtBQUFBLE1BQ0Y7QUFBQSxNQUVBLFdBQVcsTUFBTTtBQUNmLGFBQUssY0FBYyxJQUFJO0FBQ3ZCLGNBQU0sT0FBTyxTQUFTLGVBQWUsY0FBYztBQUNuRCxhQUFLLFlBQVk7QUFDakIsWUFBSTtBQUNGLGdCQUFNLEVBQUUsaUJBQWlCLElBQUk7QUFDN0IsZUFBSyxZQUFZO0FBQ2pCLGNBQUksaUJBQWlCLEVBQUUsYUFBYSxLQUFLLENBQUM7QUFBQSxRQUM1QyxTQUFRLEdBQUc7QUFDVCxlQUFLLFlBQVksdUZBQW1FLEVBQUUsT0FBTztBQUFBLFFBQy9GO0FBQUEsTUFDRjtBQUFBLE1BRUEsa0JBQWtCLE1BQU07QUFDdEIsYUFBSyxjQUFjLGNBQWM7QUFDakMsY0FBTSxPQUFPLFNBQVMsZUFBZSxjQUFjO0FBQ25ELGFBQUssWUFBWTtBQUNqQixZQUFJO0FBQ0YsZ0JBQU0sRUFBRSxlQUFlLElBQUk7QUFDM0IsZUFBSyxZQUFZO0FBQ2pCLGNBQUksZUFBZSxFQUFFLGFBQWEsS0FBSyxDQUFDO0FBQUEsUUFDMUMsU0FBUSxHQUFHO0FBQ1QsZUFBSyxZQUFZLDRHQUFvRSxFQUFFLE9BQU87QUFBQSxRQUNoRztBQUFBLE1BQ0Y7QUFBQSxNQUVBLFdBQVcsTUFBYztBQUFFLGFBQUssbUJBQW1CLE1BQU0sMEJBQVcsZ0JBQWdCO0FBQUEsTUFBRztBQUFBLE1BQ3ZGLGlCQUFpQixNQUFRO0FBQUUsYUFBSyxtQkFBbUIsTUFBTSxnQkFBTSxnQkFBZ0I7QUFBQSxNQUFHO0FBQUEsTUFDbEYsY0FBYyxNQUFXO0FBQUUsYUFBSyxtQkFBbUIsTUFBTSxnQkFBTSxnQkFBZ0I7QUFBQSxNQUFHO0FBQUEsTUFDbEYsaUJBQWlCLE1BQVE7QUFBRSxhQUFLLG1CQUFtQixNQUFNLGdCQUFNLGdCQUFnQjtBQUFBLE1BQUc7QUFBQSxNQUNsRixtQkFBbUIsTUFBTTtBQUFFLGFBQUssbUJBQW1CLE1BQU0sZ0JBQU0sZ0JBQWdCO0FBQUEsTUFBRztBQUFBLE1BQ2xGLGdCQUFnQixNQUFTO0FBQUUsYUFBSyxtQkFBbUIsTUFBTSwrQ0FBWSxnQkFBZ0I7QUFBQSxNQUFHO0FBQUEsTUFDeEYsbUJBQW1CLE1BQU07QUFBRSxhQUFLLG1CQUFtQixNQUFNLDRDQUFjLGdCQUFnQjtBQUFBLE1BQUc7QUFBQSxNQUUxRixXQUFXLE1BQU07QUFDZixpQkFBUyxlQUFlLGNBQWMsRUFBRSxZQUFZO0FBQUEsUUFDaEQsS0FBSyxrQkFBa0IsT0FBTyxnQ0FBWSxJQUFJLENBQUM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFNckQ7QUFBQSxJQUNGO0FBRUEsV0FBTyxVQUFVLEVBQUUsS0FBS0EsS0FBSTtBQUFBO0FBQUE7OztBQzNNNUIsSUFBTSxFQUFFLElBQUksSUFBSTtBQUVoQixTQUFTLGlCQUFpQixvQkFBb0IsV0FBVztBQUN2RCxRQUFNLE1BQU0sSUFBSSxJQUFJLEVBQUUsUUFBUSxTQUFTLGVBQWUsS0FBSyxFQUFFLENBQUM7QUFDOUQsU0FBTyxNQUFNLE9BQU8sT0FBTyxDQUFDO0FBQzVCLFNBQU8sSUFBSSxNQUFNO0FBQ2pCLFVBQVEsSUFBSSx3QkFBd0IsMkVBQTJFO0FBQy9HLFVBQVEsSUFBSSx3RUFBb0Q7QUFDbEUsQ0FBQztBQUdELElBQUksT0FBTyxXQUFXLGFBQWE7QUFDakMsU0FBTyxpQkFBaUIsUUFBUSxNQUFNO0FBQ3BDLGVBQVcsTUFBTTtBQUNmLGFBQU8sYUFBb0IsRUFBRSxNQUFNLE1BQU07QUFBQSxNQUFDLENBQUM7QUFDM0MsYUFBTyxVQUEyQixFQUFFLE1BQU0sTUFBTTtBQUFBLE1BQUMsQ0FBQztBQUFBLElBQ3BELEdBQUcsR0FBSTtBQUFBLEVBQ1QsQ0FBQztBQUNIOyIsCiAgIm5hbWVzIjogWyJBcHAiXQp9Cg==
