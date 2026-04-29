var BOC = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

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

  // modules-html/boc-v6/src/shell/App.js
  var require_App = __commonJS({
    "modules-html/boc-v6/src/shell/App.js"(exports, module) {
      var { Router } = require_Router();
      var App2 = class {
        constructor(opts) {
          this.rootEl = opts.rootEl || document.getElementById("app");
          this.router = new Router();
          this.currentPage = null;
          this._setupRoutes();
          this._render();
        }
        _setupRoutes() {
          this.router.register("/", this._renderHome.bind(this), { meta: { title: "\uB300\uC2DC\uBCF4\uB4DC" } });
          this.router.register("/wizard", this._renderWizard.bind(this), { meta: { title: "\uACAC\uC801 \uB9C8\uBC95\uC790" } });
          this.router.register("/cad", this._renderCAD.bind(this), { meta: { title: "CAD \uD3C9\uBA74\uB3C4" } });
          this.router.register("/kpi", this._renderKPI.bind(this), { meta: { title: "KPI \uB300\uC2DC\uBCF4\uB4DC" } });
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
            Phase 4 / Week 1
          </div>
        </header>
        <aside class="app-sidebar">${this._renderSidebar()}</aside>
        <main class="app-main" id="main-content"></main>
      </div>
    `;
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
        <div class="nav-item" data-path="/kpi">KPI \uACC4\uAE30\uD310</div>
      </div>
      <div class="nav-section">
        <div class="label">Closed Loop</div>
        <div class="nav-item" data-path="/contracts">\uACC4\uC57D</div>
        <div class="nav-item" data-path="/orders">\uBC1C\uC8FC</div>
        <div class="nav-item" data-path="/schedules">\uACF5\uC815</div>
        <div class="nav-item" data-path="/inspections">\uAC80\uC218</div>
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
      ${this._renderPageHeader("\uB300\uC2DC\uBCF4\uB4DC", "ECOREAN BOC v6.0 \u2014 Phase 4 Week 1")}
      <div class="card">
        <h3>9\uC8FC Phase 3 \uC644\uC8FC \u2705</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          52\uAC1C \uD30C\uC77C / 33 \uD14C\uC2A4\uD2B8 / 147+ assertions / \uD68C\uADC0 0\uAC74<br/>
          \uB9C8\uC2A4\uD130\uD50C\uB79C \uC7AC\uC791\uC131 0\uD68C / TDD \uAC15\uC81C \uC791\uB3D9 3\uD68C<br/>
          \uC2DC\uBBAC\uB808\uC774\uC158 1\uAC74 (30\uD3C9 \uC544\uD30C\uD2B8 + \uD074\uB798\uC2DD\uB7ED\uC154\uB9AC, 16,735,950\uC6D0)
        </p>
      </div>
      <div class="card">
        <h3>Phase 4 \uC9C4\uC785</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          Week 1 \uC644\uB8CC: boc-v6 \uC178 + \uB77C\uC6B0\uD305 + \uB2E4\uD06C \uD14C\uB9C8 + esbuild<br/>
          Week 2 \uC9C4\uC785: 5\uB2E8 \uAC8C\uC774\uD2B8 \uB9C8\uBC95\uC790 UI (G1~G5)
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
          this._renderPlaceholder(path, "\uACAC\uC801 \uB9C8\uBC95\uC790", "Phase 4 Week 2");
        }
        _renderCAD(path) {
          this._renderPlaceholder(path, "CAD \uD3C9\uBA74\uB3C4", "Phase 4 Week 3");
        }
        _renderKPI(path) {
          this._renderPlaceholder(path, "KPI \uACC4\uAE30\uD310", "Phase 4 Week 4");
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
    console.log("Phase 4 Week 1 \u2014 boc-v6 \uC178 \uC2DC\uC791");
  });
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3JvdXRlci9Sb3V0ZXIuanMiLCAiLi4vc3JjL3NoZWxsL0FwcC5qcyIsICIuLi9zcmMvc2hlbGwvbWFpbi5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgSGFzaC1iYXNlZCBTUEEgUm91dGVyXG5cbmNsYXNzIFJvdXRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucm91dGVzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMubm90Rm91bmRIYW5kbGVyID0gbnVsbDtcbiAgICB0aGlzLmJlZm9yZUhvb2tzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9IG51bGw7XG4gIH1cblxuICByZWdpc3RlcihwYXRoLCBoYW5kbGVyLCBvcHRzKSB7XG4gICAgdGhpcy5yb3V0ZXMuc2V0KHBhdGgsIHtcbiAgICAgIGhhbmRsZXI6IGhhbmRsZXIsXG4gICAgICBtZXRhOiAob3B0cyAmJiBvcHRzLm1ldGEpIHx8IHt9XG4gICAgfSk7XG4gIH1cblxuICBzZXROb3RGb3VuZChoYW5kbGVyKSB7XG4gICAgdGhpcy5ub3RGb3VuZEhhbmRsZXIgPSBoYW5kbGVyO1xuICB9XG5cbiAgYmVmb3JlRWFjaChob29rKSB7XG4gICAgdGhpcy5iZWZvcmVIb29rcy5wdXNoKGhvb2spO1xuICB9XG5cbiAgc3RhcnQoKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCB0aGlzLl9vbkhhc2hDaGFuZ2UuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5fb25IYXNoQ2hhbmdlKCk7XG4gIH1cblxuICBuYXZpZ2F0ZShwYXRoKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBwYXRoO1xuICB9XG5cbiAgX29uSGFzaENoYW5nZSgpIHtcbiAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2ggfHwgJyMvJztcbiAgICBjb25zdCBwYXRoID0gaGFzaC5yZXBsYWNlKC9eIy8sICcnKSB8fCAnLyc7XG5cbiAgICBmb3IgKGxldCBob29rIG9mIHRoaXMuYmVmb3JlSG9va3MpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhvb2socGF0aCwgdGhpcy5jdXJyZW50UGF0aCk7XG4gICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSkgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlID0gdGhpcy5yb3V0ZXMuZ2V0KHBhdGgpO1xuICAgIGlmIChyb3V0ZSkge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICByb3V0ZS5oYW5kbGVyKHBhdGgsIHJvdXRlLm1ldGEpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ub3RGb3VuZEhhbmRsZXIpIHtcbiAgICAgIHRoaXMubm90Rm91bmRIYW5kbGVyKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIGdldEN1cnJlbnRQYXRoKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYXRoO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBSb3V0ZXI6IFJvdXRlciB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IEFwcCBcdUJBNTRcdUM3NzggXHVDRUU4XHVEMTRDXHVDNzc0XHVCMTA4XG5jb25zdCB7IFJvdXRlciB9ID0gcmVxdWlyZSgnLi4vcm91dGVyL1JvdXRlci5qcycpO1xuXG5jbGFzcyBBcHAge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5yb290RWwgPSBvcHRzLnJvb3RFbCB8fCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJyk7XG4gICAgdGhpcy5yb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IG51bGw7XG5cbiAgICB0aGlzLl9zZXR1cFJvdXRlcygpO1xuICAgIHRoaXMuX3JlbmRlcigpO1xuICB9XG5cbiAgX3NldHVwUm91dGVzKCkge1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvJywgdGhpcy5fcmVuZGVySG9tZS5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUIzMDBcdUMyRENcdUJDRjRcdUI0REMnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy93aXphcmQnLCB0aGlzLl9yZW5kZXJXaXphcmQuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnXHVBQ0FDXHVDODAxIFx1QjlDOFx1QkM5NVx1Qzc5MCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL2NhZCcsIHRoaXMuX3JlbmRlckNBRC5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdDQUQgXHVEM0M5XHVCQTc0XHVCM0M0JyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcva3BpJywgdGhpcy5fcmVuZGVyS1BJLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ0tQSSBcdUIzMDBcdUMyRENcdUJDRjRcdUI0REMnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9jb250cmFjdHMnLCB0aGlzLl9yZW5kZXJDb250cmFjdHMuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnXHVBQ0M0XHVDNTdEJyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvb3JkZXJzJywgdGhpcy5fcmVuZGVyT3JkZXJzLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QkMxQ1x1QzhGQycgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL3NjaGVkdWxlcycsIHRoaXMuX3JlbmRlclNjaGVkdWxlcy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUFDRjVcdUM4MTUnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9pbnNwZWN0aW9ucycsIHRoaXMuX3JlbmRlckluc3BlY3Rpb25zLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QUM4MFx1QzIxOCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL3RvcG9sb2d5JywgdGhpcy5fcmVuZGVyVG9wb2xvZ3kuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnXHVDMkRDXHVDMkE0XHVEMTVDIFx1RDFBMFx1RDNGNFx1Qjg1Q1x1QzlDMCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL2FpLWV4ZWN1dGl2ZScsIHRoaXMuX3JlbmRlckFJRXhlY3V0aXZlLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ0FJIFx1Qzc4NFx1QzZEMCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5zZXROb3RGb3VuZCh0aGlzLl9yZW5kZXI0MDQuYmluZCh0aGlzKSk7XG4gIH1cblxuICBfcmVuZGVyKCkge1xuICAgIHRoaXMucm9vdEVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJhcHAtc2hlbGxcIj5cbiAgICAgICAgPGhlYWRlciBjbGFzcz1cImFwcC1oZWFkZXJcIj5cbiAgICAgICAgICA8aDE+RUNPUkVBTiBCT0MgdjYuMDwvaDE+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInNwYWNlclwiPjwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0dXNcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGl2ZVwiPlx1MjVDRiBMSVZFPC9zcGFuPlxuICAgICAgICAgICAgUGhhc2UgNCAvIFdlZWsgMVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2hlYWRlcj5cbiAgICAgICAgPGFzaWRlIGNsYXNzPVwiYXBwLXNpZGViYXJcIj4ke3RoaXMuX3JlbmRlclNpZGViYXIoKX08L2FzaWRlPlxuICAgICAgICA8bWFpbiBjbGFzcz1cImFwcC1tYWluXCIgaWQ9XCJtYWluLWNvbnRlbnRcIj48L21haW4+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5yb290RWwucXVlcnlTZWxlY3RvckFsbCgnLm5hdi1pdGVtJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGVsLmRhdGFzZXQucGF0aDtcbiAgICAgICAgdGhpcy5yb3V0ZXIubmF2aWdhdGUocGF0aCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRoaXMucm91dGVyLnN0YXJ0KCk7XG4gIH1cblxuICBfcmVuZGVyU2lkZWJhcigpIHtcbiAgICByZXR1cm4gYFxuICAgICAgPGRpdiBjbGFzcz1cIm5hdi1zZWN0aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPlx1QkE1NFx1Qzc3ODwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvXCI+XHVCMzAwXHVDMkRDXHVCQ0Y0XHVCNERDPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi93aXphcmRcIj5cdUFDQUNcdUM4MDEgXHVCOUM4XHVCQzk1XHVDNzkwPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJuYXYtc2VjdGlvblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj5cdUM4MUNcdUM3OTE8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL2NhZFwiPkNBRCBcdUQzQzlcdUJBNzRcdUIzQzQ8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL2twaVwiPktQSSBcdUFDQzRcdUFFMzBcdUQzMTA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cIm5hdi1zZWN0aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPkNsb3NlZCBMb29wPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9jb250cmFjdHNcIj5cdUFDQzRcdUM1N0Q8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL29yZGVyc1wiPlx1QkMxQ1x1QzhGQzwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvc2NoZWR1bGVzXCI+XHVBQ0Y1XHVDODE1PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9pbnNwZWN0aW9uc1wiPlx1QUM4MFx1QzIxODwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwibmF2LXNlY3Rpb25cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+XHVDMkRDXHVDMkE0XHVEMTVDPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi90b3BvbG9neVwiPlx1RDFBMFx1RDNGNFx1Qjg1Q1x1QzlDMDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvYWktZXhlY3V0aXZlXCI+QUkgXHVDNzg0XHVDNkQwPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgX3NldEFjdGl2ZU5hdihwYXRoKSB7XG4gICAgdGhpcy5yb290RWwucXVlcnlTZWxlY3RvckFsbCgnLm5hdi1pdGVtJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdhY3RpdmUnLCBlbC5kYXRhc2V0LnBhdGggPT09IHBhdGgpO1xuICAgIH0pO1xuICB9XG5cbiAgX3JlbmRlclBhZ2VIZWFkZXIodGl0bGUsIHN1YnRpdGxlKSB7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxkaXYgY2xhc3M9XCJwYWdlLWhlYWRlclwiPlxuICAgICAgICA8aDI+JHt0aXRsZX08L2gyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic3VidGl0bGVcIj4ke3N1YnRpdGxlIHx8ICcnfTwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcbiAgfVxuXG4gIF9yZW5kZXJIb21lKHBhdGgpIHtcbiAgICB0aGlzLl9zZXRBY3RpdmVOYXYocGF0aCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcignXHVCMzAwXHVDMkRDXHVCQ0Y0XHVCNERDJywgJ0VDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IFBoYXNlIDQgV2VlayAxJyl9XG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8aDM+OVx1QzhGQyBQaGFzZSAzIFx1QzY0NFx1QzhGQyBcdTI3MDU8L2gzPlxuICAgICAgICA8cCBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7IGxpbmUtaGVpZ2h0OiAxLjY7XCI+XG4gICAgICAgICAgNTJcdUFDMUMgXHVEMzBDXHVDNzdDIC8gMzMgXHVEMTRDXHVDMkE0XHVEMkI4IC8gMTQ3KyBhc3NlcnRpb25zIC8gXHVENjhDXHVBREMwIDBcdUFDNzQ8YnIvPlxuICAgICAgICAgIFx1QjlDOFx1QzJBNFx1RDEzMFx1RDUwQ1x1Qjc5QyBcdUM3QUNcdUM3OTFcdUMxMzEgMFx1RDY4QyAvIFRERCBcdUFDMTVcdUM4MUMgXHVDNzkxXHVCM0Q5IDNcdUQ2OEM8YnIvPlxuICAgICAgICAgIFx1QzJEQ1x1QkJBQ1x1QjgwOFx1Qzc3NFx1QzE1OCAxXHVBQzc0ICgzMFx1RDNDOSBcdUM1NDRcdUQzMENcdUQyQjggKyBcdUQwNzRcdUI3OThcdUMyRERcdUI3RURcdUMxNTRcdUI5QUMsIDE2LDczNSw5NTBcdUM2RDApXG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImNhcmRcIj5cbiAgICAgICAgPGgzPlBoYXNlIDQgXHVDOUM0XHVDNzg1PC9oMz5cbiAgICAgICAgPHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tdGV4dC1kaW0pOyBsaW5lLWhlaWdodDogMS42O1wiPlxuICAgICAgICAgIFdlZWsgMSBcdUM2NDRcdUI4Q0M6IGJvYy12NiBcdUMxNzggKyBcdUI3N0NcdUM2QjBcdUQzMDUgKyBcdUIyRTRcdUQwNkMgXHVEMTRDXHVCOUM4ICsgZXNidWlsZDxici8+XG4gICAgICAgICAgV2VlayAyIFx1QzlDNFx1Qzc4NTogNVx1QjJFOCBcdUFDOENcdUM3NzRcdUQyQjggXHVCOUM4XHVCQzk1XHVDNzkwIFVJIChHMX5HNSlcbiAgICAgICAgPC9wPlxuICAgICAgPC9kaXY+XG4gICAgYDtcbiAgfVxuXG4gIF9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCB0aXRsZSwgd2Vla1RhcmdldCkge1xuICAgIHRoaXMuX3NldEFjdGl2ZU5hdihwYXRoKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50JykuaW5uZXJIVE1MID0gYFxuICAgICAgJHt0aGlzLl9yZW5kZXJQYWdlSGVhZGVyKHRpdGxlLCB3ZWVrVGFyZ2V0ICsgJyBcdUQ2NUNcdUMxMzFcdUQ2NTQgXHVDNjA4XHVDODE1Jyl9XG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8aDM+XHVDOTAwXHVCRTQ0IFx1QzkxMTwvaDM+XG4gICAgICAgIDxwIHN0eWxlPVwiY29sb3I6IHZhcigtLXRleHQtZGltKTtcIj5cdUJDRjggXHVENjU0XHVCQTc0XHVDNzQwICR7d2Vla1RhcmdldH1cdUM1RDBcdUMxMUMgXHVENjVDXHVDMTMxXHVENjU0XHVCNDI5XHVCMkM4XHVCMkU0LjwvcD5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfcmVuZGVyV2l6YXJkKHBhdGgpICAgICAgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnXHVBQ0FDXHVDODAxIFx1QjlDOFx1QkM5NVx1Qzc5MCcsICdQaGFzZSA0IFdlZWsgMicpOyB9XG4gIF9yZW5kZXJDQUQocGF0aCkgICAgICAgICB7IHRoaXMuX3JlbmRlclBsYWNlaG9sZGVyKHBhdGgsICdDQUQgXHVEM0M5XHVCQTc0XHVCM0M0JywgJ1BoYXNlIDQgV2VlayAzJyk7IH1cbiAgX3JlbmRlcktQSShwYXRoKSAgICAgICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ0tQSSBcdUFDQzRcdUFFMzBcdUQzMTAnLCAnUGhhc2UgNCBXZWVrIDQnKTsgfVxuICBfcmVuZGVyQ29udHJhY3RzKHBhdGgpICAgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnXHVBQ0M0XHVDNTdEJywgJ1BoYXNlIDQgV2VlayA1Jyk7IH1cbiAgX3JlbmRlck9yZGVycyhwYXRoKSAgICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QkMxQ1x1QzhGQycsICdQaGFzZSA0IFdlZWsgNicpOyB9XG4gIF9yZW5kZXJTY2hlZHVsZXMocGF0aCkgICB7IHRoaXMuX3JlbmRlclBsYWNlaG9sZGVyKHBhdGgsICdcdUFDRjVcdUM4MTUnLCAnUGhhc2UgNCBXZWVrIDYnKTsgfVxuICBfcmVuZGVySW5zcGVjdGlvbnMocGF0aCkgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnXHVBQzgwXHVDMjE4JywgJ1BoYXNlIDQgV2VlayA2Jyk7IH1cbiAgX3JlbmRlclRvcG9sb2d5KHBhdGgpICAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QzJEQ1x1QzJBNFx1RDE1QyBcdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzAnLCAnUGhhc2UgNCBXZWVrIDcnKTsgfVxuICBfcmVuZGVyQUlFeGVjdXRpdmUocGF0aCkgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnQUkgXHVDNzg0XHVDNkQwIFx1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycsICdQaGFzZSA0IFdlZWsgNycpOyB9XG5cbiAgX3JlbmRlcjQwNChwYXRoKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcignNDA0JywgJ1x1QUNCRFx1Qjg1QyBcdUM1QzZcdUM3NEM6ICcgKyBwYXRoKX1cbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgIDxwIHN0eWxlPVwiY29sb3I6IHZhcigtLXRleHQtZGltKTtcIj5cdUM2OTRcdUNDQURcdUQ1NThcdUMyRTAgXHVBQ0JEXHVCODVDXHVCMjk0IFx1Qzg3NFx1QzdBQ1x1RDU1OFx1QzlDMCBcdUM1NEFcdUMyQjVcdUIyQzhcdUIyRTQuPC9wPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9XCJsb2NhdGlvbi5oYXNoPScjLydcIj5cdUQ2NDhcdUM3M0NcdUI4NUM8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEFwcDogQXBwIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgXHVDOUM0XHVDNzg1XHVDODEwXG5jb25zdCB7IEFwcCB9ID0gcmVxdWlyZSgnLi9BcHAuanMnKTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICBjb25zdCBhcHAgPSBuZXcgQXBwKHsgcm9vdEVsOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwJykgfSk7XG4gIHdpbmRvdy5CT0MgPSB3aW5kb3cuQk9DIHx8IHt9O1xuICB3aW5kb3cuQk9DLmFwcCA9IGFwcDtcbiAgY29uc29sZS5sb2coJyVjIEVDT1JFQU4gQk9DIHY2LjAgJywgJ2JhY2tncm91bmQ6ICNjOWE4NGM7IGNvbG9yOiAjMGEwZTFhOyBmb250LXdlaWdodDogYm9sZDsgcGFkZGluZzogNHB4IDhweDsnKTtcbiAgY29uc29sZS5sb2coJ1BoYXNlIDQgV2VlayAxIFx1MjAxNCBib2MtdjYgXHVDMTc4IFx1QzJEQ1x1Qzc5MScpO1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7O0FBQUE7QUFBQTtBQUVBLFVBQU0sU0FBTixNQUFhO0FBQUEsUUFDWCxjQUFjO0FBQ1osZUFBSyxTQUFTLG9CQUFJLElBQUk7QUFDdEIsZUFBSyxrQkFBa0I7QUFDdkIsZUFBSyxjQUFjLENBQUM7QUFDcEIs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
