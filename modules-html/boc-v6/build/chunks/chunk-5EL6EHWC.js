import {
  require_CoreBus
} from "./chunk-HLNEQ7F5.js";
import {
  __commonJS
} from "./chunk-GLFX53DW.js";

// modules-html/kpi-v6/src/KPIData.cjs
var require_KPIData = __commonJS({
  "modules-html/kpi-v6/src/KPIData.cjs"(exports, module) {
    var KPI_FIELDS = [
      { key: "supply", label: "\uACF5\uAE09\uAC00", unit: "\uC6D0", format: "currency" },
      { key: "contract", label: "\uB3C4\uAE09\uD569\uACC4", unit: "\uC6D0", format: "currency" },
      { key: "final", label: "\uCD5C\uC885(VAT)", unit: "\uC6D0", format: "currency" },
      { key: "areaSqm", label: "\uCD1D \uBA74\uC801", unit: "\u33A1", format: "decimal" },
      { key: "sqmPrice", label: "\u33A1\uB2F9 \uB2E8\uAC00", unit: "\uC6D0/\u33A1", format: "currency" },
      { key: "pyPrice", label: "\uD3C9\uB2F9 \uB2E8\uAC00", unit: "\uC6D0/\uD3C9", format: "currency" },
      { key: "margin", label: "\uB9C8\uC9C4\uC728", unit: "%", format: "percent" },
      { key: "sectionCount", label: "\uC2DC\uACF5\uC139\uC158", unit: "\uAC74", format: "integer" },
      { key: "spaceCount", label: "\uACF5\uAC04", unit: "\uAC1C", format: "integer" },
      { key: "duration", label: "\uC608\uC0C1 \uACF5\uAE30", unit: "\uC77C", format: "integer" },
      { key: "automation", label: "\uC790\uB3D9\uD654\uC728", unit: "%", format: "percent" }
    ];
    function emptyKPIData() {
      const data = {};
      KPI_FIELDS.forEach(function(f) {
        data[f.key] = 0;
      });
      return data;
    }
    function fromEstimate(estimate, context) {
      const ctx = context || {};
      return {
        supply: estimate.supply || 0,
        contract: estimate.contract || 0,
        final: estimate.final || 0,
        areaSqm: estimate.areaSqm || 0,
        sqmPrice: estimate.sqmPrice || 0,
        pyPrice: estimate.pyPrice || 0,
        margin: estimate.margin || 0,
        sectionCount: ctx.sectionCount || 0,
        spaceCount: ctx.spaceCount || 0,
        duration: ctx.duration || 0,
        automation: ctx.automation || 0
      };
    }
    function format(value, formatType) {
      if (value == null) return "-";
      switch (formatType) {
        case "currency":
          return Math.round(value).toLocaleString("ko-KR");
        case "decimal":
          return parseFloat(value).toFixed(1);
        case "percent":
          return parseFloat(value).toFixed(1);
        case "integer":
          return Math.round(value).toString();
        default:
          return String(value);
      }
    }
    function automationFromGates(lockedCount) {
      const map = [0, 30, 70, 85, 95, 99];
      return map[Math.min(lockedCount, 5)] || 0;
    }
    function validateKPIData(data) {
      const errors = [];
      KPI_FIELDS.forEach(function(f) {
        if (typeof data[f.key] !== "number") {
          errors.push(f.key + " \uC22B\uC790 \uC544\uB2D8");
        }
      });
      return errors;
    }
    module.exports = {
      KPI_FIELDS,
      emptyKPIData,
      fromEstimate,
      format,
      automationFromGates,
      validateKPIData
    };
  }
});

// modules-html/boc-v6/src/kpi-dashboard/KPIDashboardPage.js
var require_KPIDashboardPage = __commonJS({
  "modules-html/boc-v6/src/kpi-dashboard/KPIDashboardPage.js"(exports, module) {
    var { KPI_FIELDS } = require_KPIData();
    var { coreBus } = require_CoreBus();
    var KPIDashboardPage = class {
      constructor(opts) {
        this.containerEl = opts.containerEl;
        this.kpiData = {};
        this.approval = { total: 0, approved: 0, pending: 0, rate: 0, bySource: {} };
        this.mlPhase = { real: 0, simulated: 0, total: 0, phase: "PHASE_1_MANUAL" };
        this.unsubscribe = coreBus.on("KPI_UPDATE", (data) => {
          Object.assign(this.kpiData, data);
          this.render();
        });
        this._loadData();
      }
      async _loadData() {
        if (typeof window !== "undefined" && window.boc) {
          try {
            this.approval = await window.boc.cost.getApprovalStatus({});
            this.mlPhase = await window.boc.kpi.getMLPhaseStatus();
          } catch (e) {
            console.error("[KPIDashboard] \uB85C\uB4DC \uC2E4\uD328:", e);
          }
        }
        this.render();
      }
      render() {
        this.containerEl.innerHTML = `
      <div class="page-header">
        <h2>KPI \uD480 \uB300\uC2DC\uBCF4\uB4DC</h2>
        <div class="subtitle">11\uD56D\uBAA9 + \uB2E8\uAC00 \uC2B9\uC778 + ML Phase / Phase 4 Week 4-A</div>
      </div>

      <div class="card">
        <h3>cost_items \uB2E8\uAC00 \uC2B9\uC778 \uC9C4\uD589</h3>
        <div class="approval-progress">
          <div class="approval-stat">
            <div class="stat-value">${this.approval.approved}</div>
            <div class="stat-label">\uC2B9\uC778\uB428</div>
          </div>
          <div class="approval-stat">
            <div class="stat-value">${this.approval.pending}</div>
            <div class="stat-label">\uAC80\uD1A0 \uB300\uAE30</div>
          </div>
          <div class="approval-stat">
            <div class="stat-value">${this.approval.rate}%</div>
            <div class="stat-label">\uC2B9\uC778\uB960</div>
          </div>
        </div>
        <div class="approval-track">
          <div class="approval-fill" style="width: ${this.approval.rate}%"></div>
        </div>
        <div class="source-breakdown">
          ${Object.entries(this.approval.bySource || {}).map(([src, count]) => `
            <span class="source-tag">${src}: ${count}</span>
          `).join("")}
        </div>
        <button class="primary" onclick="window.location.hash='#/admin/costs'">\uB2E8\uAC00 \uAC80\uD1A0\uD558\uAE30 \u2192</button>
      </div>

      <div class="kpi-grid-full">
        ${KPI_FIELDS.map((f) => this._renderKPICard(f)).join("")}
      </div>

      <div class="card">
        <h3>ML Phase \uC9C4\uD589</h3>
        <div class="ml-phase-row">
          ${[
          { id: "PHASE_1_MANUAL", name: "Phase 1 (\uC218\uB3D9)", range: "0 ~ 49\uAC74" },
          { id: "PHASE_2_STATS", name: "Phase 2 (\uD1B5\uACC4)", range: "50 ~ 99\uAC74" },
          { id: "PHASE_3_XGBOOST", name: "Phase 3 (XGBoost)", range: "100 ~ 499\uAC74" },
          { id: "PHASE_4_DEEP", name: "Phase 4 (Deep)", range: "500+\uAC74" }
        ].map((p) => `
            <div class="ml-phase ${this.mlPhase.phase === p.id ? "active" : ""}">
              <div class="phase-name">${p.name}</div>
              <div class="phase-range">${p.range}</div>
              ${this.mlPhase.phase === p.id ? `
                <div class="phase-current">\uC2E4\uAC70\uB798: ${this.mlPhase.real}\uAC74 / \uC2DC\uBBAC: ${this.mlPhase.simulated}\uAC74</div>
              ` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
      }
      _renderKPICard(f) {
        const v = this.kpiData[f.key];
        const display = v != null ? this._fmt(v, f.format) : "-";
        return `
      <div class="kpi-card-full">
        <div class="kpi-card-label">${f.label}</div>
        <div class="kpi-card-value">${display}<span class="kpi-card-unit">${f.unit}</span></div>
      </div>
    `;
      }
      _fmt(v, format) {
        switch (format) {
          case "currency":
            return Math.round(v).toLocaleString("ko-KR");
          case "decimal":
            return parseFloat(v).toFixed(1);
          case "percent":
            return parseFloat(v).toFixed(1);
          case "integer":
            return Math.round(v).toString();
          default:
            return String(v);
        }
      }
      destroy() {
        if (this.unsubscribe) this.unsubscribe();
      }
    };
    module.exports = { KPIDashboardPage };
  }
});

export {
  require_KPIDashboardPage
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4va3BpLXY2L3NyYy9LUElEYXRhLmNqcyIsICIuLi8uLi9zcmMva3BpLWRhc2hib2FyZC9LUElEYXNoYm9hcmRQYWdlLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCBLUEkgXHVCNTE0XHVDOUMwXHVEMTM4IFx1QUNDNFx1QUUzMFx1RDMxMCAxMVx1RDU2RFx1QkFBOVxuLy8gU29UOiBkb2NzL01BU1RFUl9QTEFOLm1kIFx1MDBBNzEwN1xuXG5jb25zdCBLUElfRklFTERTID0gW1xuICB7IGtleTogJ3N1cHBseScsICAgICAgIGxhYmVsOiAnXHVBQ0Y1XHVBRTA5XHVBQzAwJywgICAgICAgICB1bml0OiAnXHVDNkQwJywgICAgZm9ybWF0OiAnY3VycmVuY3knIH0sXG4gIHsga2V5OiAnY29udHJhY3QnLCAgICAgbGFiZWw6ICdcdUIzQzRcdUFFMDlcdUQ1NjlcdUFDQzQnLCAgICAgICB1bml0OiAnXHVDNkQwJywgICAgZm9ybWF0OiAnY3VycmVuY3knIH0sXG4gIHsga2V5OiAnZmluYWwnLCAgICAgICAgbGFiZWw6ICdcdUNENUNcdUM4ODUoVkFUKScsICAgICAgdW5pdDogJ1x1QzZEMCcsICAgIGZvcm1hdDogJ2N1cnJlbmN5JyB9LFxuICB7IGtleTogJ2FyZWFTcW0nLCAgICAgIGxhYmVsOiAnXHVDRDFEIFx1QkE3NFx1QzgwMScsICAgICAgICB1bml0OiAnXHUzM0ExJywgICAgZm9ybWF0OiAnZGVjaW1hbCcgfSxcbiAgeyBrZXk6ICdzcW1QcmljZScsICAgICBsYWJlbDogJ1x1MzNBMVx1QjJGOSBcdUIyRThcdUFDMDAnLCAgICAgIHVuaXQ6ICdcdUM2RDAvXHUzM0ExJywgZm9ybWF0OiAnY3VycmVuY3knIH0sXG4gIHsga2V5OiAncHlQcmljZScsICAgICAgbGFiZWw6ICdcdUQzQzlcdUIyRjkgXHVCMkU4XHVBQzAwJywgICAgICB1bml0OiAnXHVDNkQwL1x1RDNDOScsIGZvcm1hdDogJ2N1cnJlbmN5JyB9LFxuICB7IGtleTogJ21hcmdpbicsICAgICAgIGxhYmVsOiAnXHVCOUM4XHVDOUM0XHVDNzI4JywgICAgICAgICB1bml0OiAnJScsICAgICBmb3JtYXQ6ICdwZXJjZW50JyB9LFxuICB7IGtleTogJ3NlY3Rpb25Db3VudCcsIGxhYmVsOiAnXHVDMkRDXHVBQ0Y1XHVDMTM5XHVDMTU4JywgICAgICAgdW5pdDogJ1x1QUM3NCcsICAgIGZvcm1hdDogJ2ludGVnZXInIH0sXG4gIHsga2V5OiAnc3BhY2VDb3VudCcsICAgbGFiZWw6ICdcdUFDRjVcdUFDMDQnLCAgICAgICAgICAgdW5pdDogJ1x1QUMxQycsICAgIGZvcm1hdDogJ2ludGVnZXInIH0sXG4gIHsga2V5OiAnZHVyYXRpb24nLCAgICAgbGFiZWw6ICdcdUM2MDhcdUMwQzEgXHVBQ0Y1XHVBRTMwJywgICAgICB1bml0OiAnXHVDNzdDJywgICAgZm9ybWF0OiAnaW50ZWdlcicgfSxcbiAgeyBrZXk6ICdhdXRvbWF0aW9uJywgICBsYWJlbDogJ1x1Qzc5MFx1QjNEOVx1RDY1NFx1QzcyOCcsICAgICAgIHVuaXQ6ICclJywgICAgIGZvcm1hdDogJ3BlcmNlbnQnIH1cbl07XG5cbmZ1bmN0aW9uIGVtcHR5S1BJRGF0YSgpIHtcbiAgY29uc3QgZGF0YSA9IHt9O1xuICBLUElfRklFTERTLmZvckVhY2goZnVuY3Rpb24oZikgeyBkYXRhW2Yua2V5XSA9IDA7IH0pO1xuICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gZnJvbUVzdGltYXRlKGVzdGltYXRlLCBjb250ZXh0KSB7XG4gIGNvbnN0IGN0eCA9IGNvbnRleHQgfHwge307XG4gIHJldHVybiB7XG4gICAgc3VwcGx5OiAgICAgICBlc3RpbWF0ZS5zdXBwbHkgfHwgMCxcbiAgICBjb250cmFjdDogICAgIGVzdGltYXRlLmNvbnRyYWN0IHx8IDAsXG4gICAgZmluYWw6ICAgICAgICBlc3RpbWF0ZS5maW5hbCB8fCAwLFxuICAgIGFyZWFTcW06ICAgICAgZXN0aW1hdGUuYXJlYVNxbSB8fCAwLFxuICAgIHNxbVByaWNlOiAgICAgZXN0aW1hdGUuc3FtUHJpY2UgfHwgMCxcbiAgICBweVByaWNlOiAgICAgIGVzdGltYXRlLnB5UHJpY2UgfHwgMCxcbiAgICBtYXJnaW46ICAgICAgIGVzdGltYXRlLm1hcmdpbiB8fCAwLFxuICAgIHNlY3Rpb25Db3VudDogY3R4LnNlY3Rpb25Db3VudCB8fCAwLFxuICAgIHNwYWNlQ291bnQ6ICAgY3R4LnNwYWNlQ291bnQgfHwgMCxcbiAgICBkdXJhdGlvbjogICAgIGN0eC5kdXJhdGlvbiB8fCAwLFxuICAgIGF1dG9tYXRpb246ICAgY3R4LmF1dG9tYXRpb24gfHwgMFxuICB9O1xufVxuXG5mdW5jdGlvbiBmb3JtYXQodmFsdWUsIGZvcm1hdFR5cGUpIHtcbiAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiAnLSc7XG4gIHN3aXRjaCAoZm9ybWF0VHlwZSkge1xuICAgIGNhc2UgJ2N1cnJlbmN5JzpcbiAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlKS50b0xvY2FsZVN0cmluZygna28tS1InKTtcbiAgICBjYXNlICdkZWNpbWFsJzpcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlKS50b0ZpeGVkKDEpO1xuICAgIGNhc2UgJ3BlcmNlbnQnOlxuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWUpLnRvRml4ZWQoMSk7XG4gICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSkudG9TdHJpbmcoKTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIFN0cmluZyh2YWx1ZSk7XG4gIH1cbn1cblxuLy8gRzE9MzAsIEcyPTcwLCBHMz04NSwgRzQ9OTUsIEc1PTk5XG5mdW5jdGlvbiBhdXRvbWF0aW9uRnJvbUdhdGVzKGxvY2tlZENvdW50KSB7XG4gIGNvbnN0IG1hcCA9IFswLCAzMCwgNzAsIDg1LCA5NSwgOTldO1xuICByZXR1cm4gbWFwW01hdGgubWluKGxvY2tlZENvdW50LCA1KV0gfHwgMDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVLUElEYXRhKGRhdGEpIHtcbiAgY29uc3QgZXJyb3JzID0gW107XG4gIEtQSV9GSUVMRFMuZm9yRWFjaChmdW5jdGlvbihmKSB7XG4gICAgaWYgKHR5cGVvZiBkYXRhW2Yua2V5XSAhPT0gJ251bWJlcicpIHtcbiAgICAgIGVycm9ycy5wdXNoKGYua2V5ICsgJyBcdUMyMkJcdUM3OTAgXHVDNTQ0XHVCMkQ4Jyk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGVycm9ycztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIEtQSV9GSUVMRFM6IEtQSV9GSUVMRFMsXG4gIGVtcHR5S1BJRGF0YTogZW1wdHlLUElEYXRhLFxuICBmcm9tRXN0aW1hdGU6IGZyb21Fc3RpbWF0ZSxcbiAgZm9ybWF0OiBmb3JtYXQsXG4gIGF1dG9tYXRpb25Gcm9tR2F0ZXM6IGF1dG9tYXRpb25Gcm9tR2F0ZXMsXG4gIHZhbGlkYXRlS1BJRGF0YTogdmFsaWRhdGVLUElEYXRhXG59O1xuIiwgImNvbnN0IHsgS1BJX0ZJRUxEUyB9ID0gcmVxdWlyZSgnQGtwaS12Ni9LUElEYXRhLmNqcycpO1xuY29uc3QgeyBjb3JlQnVzIH0gPSByZXF1aXJlKCdAY29yZS1idXMvQ29yZUJ1cy5janMnKTtcblxuY2xhc3MgS1BJRGFzaGJvYXJkUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmtwaURhdGEgPSB7fTtcbiAgICB0aGlzLmFwcHJvdmFsID0geyB0b3RhbDogMCwgYXBwcm92ZWQ6IDAsIHBlbmRpbmc6IDAsIHJhdGU6IDAsIGJ5U291cmNlOiB7fSB9O1xuICAgIHRoaXMubWxQaGFzZSA9IHsgcmVhbDogMCwgc2ltdWxhdGVkOiAwLCB0b3RhbDogMCwgcGhhc2U6ICdQSEFTRV8xX01BTlVBTCcgfTtcblxuICAgIHRoaXMudW5zdWJzY3JpYmUgPSBjb3JlQnVzLm9uKCdLUElfVVBEQVRFJywgKGRhdGEpID0+IHtcbiAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5rcGlEYXRhLCBkYXRhKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLl9sb2FkRGF0YSgpO1xuICB9XG5cbiAgYXN5bmMgX2xvYWREYXRhKCkge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYm9jKSB7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLmFwcHJvdmFsID0gYXdhaXQgd2luZG93LmJvYy5jb3N0LmdldEFwcHJvdmFsU3RhdHVzKHt9KTtcbiAgICAgICAgdGhpcy5tbFBoYXNlID0gYXdhaXQgd2luZG93LmJvYy5rcGkuZ2V0TUxQaGFzZVN0YXR1cygpO1xuICAgICAgfSBjYXRjaChlKSB7IGNvbnNvbGUuZXJyb3IoJ1tLUElEYXNoYm9hcmRdIFx1Qjg1Q1x1QjREQyBcdUMyRTRcdUQzMjg6JywgZSk7IH1cbiAgICB9XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJwYWdlLWhlYWRlclwiPlxuICAgICAgICA8aDI+S1BJIFx1RDQ4MCBcdUIzMDBcdUMyRENcdUJDRjRcdUI0REM8L2gyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic3VidGl0bGVcIj4xMVx1RDU2RFx1QkFBOSArIFx1QjJFOFx1QUMwMCBcdUMyQjlcdUM3NzggKyBNTCBQaGFzZSAvIFBoYXNlIDQgV2VlayA0LUE8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8aDM+Y29zdF9pdGVtcyBcdUIyRThcdUFDMDAgXHVDMkI5XHVDNzc4IFx1QzlDNFx1RDU4OTwvaDM+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJhcHByb3ZhbC1wcm9ncmVzc1wiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJhcHByb3ZhbC1zdGF0XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7dGhpcy5hcHByb3ZhbC5hcHByb3ZlZH08L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+XHVDMkI5XHVDNzc4XHVCNDI4PC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImFwcHJvdmFsLXN0YXRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHt0aGlzLmFwcHJvdmFsLnBlbmRpbmd9PC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlx1QUM4MFx1RDFBMCBcdUIzMDBcdUFFMzA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiYXBwcm92YWwtc3RhdFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke3RoaXMuYXBwcm92YWwucmF0ZX0lPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlx1QzJCOVx1Qzc3OFx1Qjk2MDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImFwcHJvdmFsLXRyYWNrXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImFwcHJvdmFsLWZpbGxcIiBzdHlsZT1cIndpZHRoOiAke3RoaXMuYXBwcm92YWwucmF0ZX0lXCI+PC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwic291cmNlLWJyZWFrZG93blwiPlxuICAgICAgICAgICR7T2JqZWN0LmVudHJpZXModGhpcy5hcHByb3ZhbC5ieVNvdXJjZSB8fCB7fSkubWFwKChbc3JjLCBjb3VudF0pID0+IGBcbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic291cmNlLXRhZ1wiPiR7c3JjfTogJHtjb3VudH08L3NwYW4+XG4gICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8YnV0dG9uIGNsYXNzPVwicHJpbWFyeVwiIG9uY2xpY2s9XCJ3aW5kb3cubG9jYXRpb24uaGFzaD0nIy9hZG1pbi9jb3N0cydcIj5cdUIyRThcdUFDMDAgXHVBQzgwXHVEMUEwXHVENTU4XHVBRTMwIFx1MjE5MjwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3M9XCJrcGktZ3JpZC1mdWxsXCI+XG4gICAgICAgICR7S1BJX0ZJRUxEUy5tYXAoZiA9PiB0aGlzLl9yZW5kZXJLUElDYXJkKGYpKS5qb2luKCcnKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8aDM+TUwgUGhhc2UgXHVDOUM0XHVENTg5PC9oMz5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm1sLXBoYXNlLXJvd1wiPlxuICAgICAgICAgICR7W1xuICAgICAgICAgICAgeyBpZDogJ1BIQVNFXzFfTUFOVUFMJywgbmFtZTogJ1BoYXNlIDEgKFx1QzIxOFx1QjNEOSknLCByYW5nZTogJzAgfiA0OVx1QUM3NCcgfSxcbiAgICAgICAgICAgIHsgaWQ6ICdQSEFTRV8yX1NUQVRTJywgIG5hbWU6ICdQaGFzZSAyIChcdUQxQjVcdUFDQzQpJywgcmFuZ2U6ICc1MCB+IDk5XHVBQzc0JyB9LFxuICAgICAgICAgICAgeyBpZDogJ1BIQVNFXzNfWEdCT09TVCcsIG5hbWU6ICdQaGFzZSAzIChYR0Jvb3N0KScsIHJhbmdlOiAnMTAwIH4gNDk5XHVBQzc0JyB9LFxuICAgICAgICAgICAgeyBpZDogJ1BIQVNFXzRfREVFUCcsICBuYW1lOiAnUGhhc2UgNCAoRGVlcCknLCByYW5nZTogJzUwMCtcdUFDNzQnIH1cbiAgICAgICAgICBdLm1hcChwID0+IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtbC1waGFzZSAke3RoaXMubWxQaGFzZS5waGFzZSA9PT0gcC5pZCA/ICdhY3RpdmUnIDogJyd9XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwaGFzZS1uYW1lXCI+JHtwLm5hbWV9PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwaGFzZS1yYW5nZVwiPiR7cC5yYW5nZX08L2Rpdj5cbiAgICAgICAgICAgICAgJHt0aGlzLm1sUGhhc2UucGhhc2UgPT09IHAuaWQgPyBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInBoYXNlLWN1cnJlbnRcIj5cdUMyRTRcdUFDNzBcdUI3OTg6ICR7dGhpcy5tbFBoYXNlLnJlYWx9XHVBQzc0IC8gXHVDMkRDXHVCQkFDOiAke3RoaXMubWxQaGFzZS5zaW11bGF0ZWR9XHVBQzc0PC9kaXY+XG4gICAgICAgICAgICAgIGAgOiAnJ31cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfcmVuZGVyS1BJQ2FyZChmKSB7XG4gICAgY29uc3QgdiA9IHRoaXMua3BpRGF0YVtmLmtleV07XG4gICAgY29uc3QgZGlzcGxheSA9IHYgIT0gbnVsbCA/IHRoaXMuX2ZtdCh2LCBmLmZvcm1hdCkgOiAnLSc7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxkaXYgY2xhc3M9XCJrcGktY2FyZC1mdWxsXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJrcGktY2FyZC1sYWJlbFwiPiR7Zi5sYWJlbH08L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImtwaS1jYXJkLXZhbHVlXCI+JHtkaXNwbGF5fTxzcGFuIGNsYXNzPVwia3BpLWNhcmQtdW5pdFwiPiR7Zi51bml0fTwvc3Bhbj48L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfZm10KHYsIGZvcm1hdCkge1xuICAgIHN3aXRjaChmb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2N1cnJlbmN5JzogcmV0dXJuIE1hdGgucm91bmQodikudG9Mb2NhbGVTdHJpbmcoJ2tvLUtSJyk7XG4gICAgICBjYXNlICdkZWNpbWFsJzogIHJldHVybiBwYXJzZUZsb2F0KHYpLnRvRml4ZWQoMSk7XG4gICAgICBjYXNlICdwZXJjZW50JzogIHJldHVybiBwYXJzZUZsb2F0KHYpLnRvRml4ZWQoMSk7XG4gICAgICBjYXNlICdpbnRlZ2VyJzogIHJldHVybiBNYXRoLnJvdW5kKHYpLnRvU3RyaW5nKCk7XG4gICAgICBkZWZhdWx0OiByZXR1cm4gU3RyaW5nKHYpO1xuICAgIH1cbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMudW5zdWJzY3JpYmUpIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgS1BJRGFzaGJvYXJkUGFnZSB9O1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7QUFBQTtBQUFBO0FBR0EsUUFBTSxhQUFhO0FBQUEsTUFDakIsRUFBRSxLQUFLLFVBQWdCLE9BQU8sc0JBQWUsTUFBTSxVQUFRLFFBQVEsV0FBVztBQUFBLE1BQzlFLEVBQUUsS0FBSyxZQUFnQixPQUFPLDRCQUFjLE1BQU0sVUFBUSxRQUFRLFdBQVc7QUFBQSxNQUM3RSxFQUFFLEtBQUssU0FBZ0IsT0FBTyxxQkFBZ0IsTUFBTSxVQUFRLFFBQVEsV0FBVztBQUFBLE1BQy9FLEVBQUUsS0FBSyxXQUFnQixPQUFPLHVCQUFlLE1BQU0sVUFBUSxRQUFRLFVBQVU7QUFBQSxNQUM3RSxFQUFFLEtBQUssWUFBZ0IsT0FBTyw2QkFBYyxNQUFNLGlCQUFPLFFBQVEsV0FBVztBQUFBLE1BQzVFLEVBQUUsS0FBSyxXQUFnQixPQUFPLDZCQUFjLE1BQU0saUJBQU8sUUFBUSxXQUFXO0FBQUEsTUFDNUUsRUFBRSxLQUFLLFVBQWdCLE9BQU8sc0JBQWUsTUFBTSxLQUFTLFFBQVEsVUFBVTtBQUFBLE1BQzlFLEVBQUUsS0FBSyxnQkFBZ0IsT0FBTyw0QkFBYyxNQUFNLFVBQVEsUUFBUSxVQUFVO0FBQUEsTUFDNUUsRUFBRSxLQUFLLGNBQWdCLE9BQU8sZ0JBQWdC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
