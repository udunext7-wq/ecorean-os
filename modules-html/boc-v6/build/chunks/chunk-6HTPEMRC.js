import {
  __commonJS
} from "./chunk-GLFX53DW.js";

// modules-html/boc-v6/src/admin/CostsAdminPage.js
var require_CostsAdminPage = __commonJS({
  "modules-html/boc-v6/src/admin/CostsAdminPage.js"(exports, module) {
    var CostsAdminPage = class {
      constructor(opts) {
        this.containerEl = opts.containerEl;
        this.render();
        this._loadStatus();
      }
      async _loadStatus() {
        if (typeof window !== "undefined" && window.boc) {
          try {
            const status = await window.boc.cost.getApprovalStatus({});
            const el = this.containerEl.querySelector("#admin-status");
            if (!el) return;
            el.innerHTML = `
          <div class="approval-progress">
            <div class="approval-stat">
              <div class="stat-value">${status.total}</div>
              <div class="stat-label">\uC804\uCCB4</div>
            </div>
            <div class="approval-stat">
              <div class="stat-value">${status.approved}</div>
              <div class="stat-label">\uC2B9\uC778</div>
            </div>
            <div class="approval-stat">
              <div class="stat-value">${status.rate}%</div>
              <div class="stat-label">\uC2B9\uC778\uB960</div>
            </div>
          </div>
          <div class="source-breakdown">
            ${Object.entries(status.bySource || {}).map(([src, count]) => `
              <span class="source-tag">${src}: ${count}</span>
            `).join("")}
          </div>
        `;
          } catch (e) {
          }
        }
      }
      render() {
        this.containerEl.innerHTML = `
      <div class="page-header">
        <h2>\uB2E8\uAC00 \uAD00\uB9AC</h2>
        <div class="subtitle">cost_items Excel \uC6CC\uD06C\uD50C\uB85C\uC6B0 / Phase 4 Week 4-A</div>
      </div>

      <div class="card">
        <h3>\uD604\uC7AC \uC0C1\uD0DC</h3>
        <div id="admin-status" style="color: var(--text-dim);">\uB85C\uB529 \uC911...</div>
      </div>

      <div class="card">
        <h3>Excel \uC6CC\uD06C\uD50C\uB85C\uC6B0</h3>
        <p style="color: var(--text-dim); line-height: 1.8;">
          <strong style="color: var(--gold);">1. Excel \uCD9C\uB825</strong><br>
          <code style="background: var(--bg); padding: 2px 8px; color: var(--gold); font-family: var(--font-mono);">
            node scripts/v6.0/export_cost_items_xlsx.cjs
          </code><br>
          \u2192 cost_items_review_&lt;\uB0A0\uC9DC&gt;.xlsx \uC0DD\uC131<br><br>

          <strong style="color: var(--gold);">2. \uB300\uD45C\uB2D8 \uAC80\uD1A0</strong><br>
          - \uC2DC\uD2B8 1: ${94}\uAC74 \uB2E8\uAC00 \uAC80\uD1A0 (\uD604\uC7AC \uB2E8\uAC00\uC640 \uB300\uD45C\uB2D8 \uB2E8\uAC00 \uBE44\uAD50)<br>
          - \uC2DC\uD2B8 2: \uC2E0\uADDC \uC790\uC7AC \uCD94\uAC00<br>
          - \uC2DC\uD2B8 3: \uAC00\uC774\uB4DC<br><br>

          <strong style="color: var(--gold);">3. \uC784\uD3EC\uD2B8</strong><br>
          <code style="background: var(--bg); padding: 2px 8px; color: var(--gold); font-family: var(--font-mono);">
            node scripts/v6.0/import_cost_items_xlsx.cjs &lt;\uD30C\uC77C\uACBD\uB85C&gt; --apply
          </code><br>
          \u2192 DB \uAC31\uC2E0 + IPC \uC790\uB3D9 \uBC18\uC601<br><br>

          <strong style="color: var(--negative);">\uCC38\uACE0:</strong>
          Phase 5\uC5D0\uC11C \uD654\uBA74\uC5D0\uC11C \uC9C1\uC811 \uAC80\uD1A0/\uC2B9\uC778 \uAC00\uB2A5 (IPC \uC4F0\uAE30 \uD65C\uC131\uD654).
        </p>
      </div>
    `;
      }
    };
    module.exports = { CostsAdminPage };
  }
});

export {
  require_CostsAdminPage
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FkbWluL0Nvc3RzQWRtaW5QYWdlLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjbGFzcyBDb3N0c0FkbWluUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLnJlbmRlcigpO1xuICAgIHRoaXMuX2xvYWRTdGF0dXMoKTtcbiAgfVxuXG4gIGFzeW5jIF9sb2FkU3RhdHVzKCkge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYm9jKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCB3aW5kb3cuYm9jLmNvc3QuZ2V0QXBwcm92YWxTdGF0dXMoe30pO1xuICAgICAgICBjb25zdCBlbCA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2FkbWluLXN0YXR1cycpO1xuICAgICAgICBpZiAoIWVsKSByZXR1cm47XG4gICAgICAgIGVsLmlubmVySFRNTCA9IGBcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiYXBwcm92YWwtcHJvZ3Jlc3NcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhcHByb3ZhbC1zdGF0XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtzdGF0dXMudG90YWx9PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+XHVDODA0XHVDQ0I0PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhcHByb3ZhbC1zdGF0XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtzdGF0dXMuYXBwcm92ZWR9PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+XHVDMkI5XHVDNzc4PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhcHByb3ZhbC1zdGF0XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtzdGF0dXMucmF0ZX0lPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+XHVDMkI5XHVDNzc4XHVCOTYwPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic291cmNlLWJyZWFrZG93blwiPlxuICAgICAgICAgICAgJHtPYmplY3QuZW50cmllcyhzdGF0dXMuYnlTb3VyY2UgfHwge30pLm1hcCgoW3NyYywgY291bnRdKSA9PiBgXG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic291cmNlLXRhZ1wiPiR7c3JjfTogJHtjb3VudH08L3NwYW4+XG4gICAgICAgICAgICBgKS5qb2luKCcnKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgIH0gY2F0Y2goZSkge31cbiAgICB9XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgdGhpcy5jb250YWluZXJFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwicGFnZS1oZWFkZXJcIj5cbiAgICAgICAgPGgyPlx1QjJFOFx1QUMwMCBcdUFEMDBcdUI5QUM8L2gyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic3VidGl0bGVcIj5jb3N0X2l0ZW1zIEV4Y2VsIFx1QzZDQ1x1RDA2Q1x1RDUwQ1x1Qjg1Q1x1QzZCMCAvIFBoYXNlIDQgV2VlayA0LUE8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8aDM+XHVENjA0XHVDN0FDIFx1QzBDMVx1RDBEQzwvaDM+XG4gICAgICAgIDxkaXYgaWQ9XCJhZG1pbi1zdGF0dXNcIiBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7XCI+XHVCODVDXHVCNTI5IFx1QzkxMS4uLjwvZGl2PlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgIDxoMz5FeGNlbCBcdUM2Q0NcdUQwNkNcdUQ1MENcdUI4NUNcdUM2QjA8L2gzPlxuICAgICAgICA8cCBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7IGxpbmUtaGVpZ2h0OiAxLjg7XCI+XG4gICAgICAgICAgPHN0cm9uZyBzdHlsZT1cImNvbG9yOiB2YXIoLS1nb2xkKTtcIj4xLiBFeGNlbCBcdUNEOUNcdUI4MjU8L3N0cm9uZz48YnI+XG4gICAgICAgICAgPGNvZGUgc3R5bGU9XCJiYWNrZ3JvdW5kOiB2YXIoLS1iZyk7IHBhZGRpbmc6IDJweCA4cHg7IGNvbG9yOiB2YXIoLS1nb2xkKTsgZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtbW9ubyk7XCI+XG4gICAgICAgICAgICBub2RlIHNjcmlwdHMvdjYuMC9leHBvcnRfY29zdF9pdGVtc194bHN4LmNqc1xuICAgICAgICAgIDwvY29kZT48YnI+XG4gICAgICAgICAgXHUyMTkyIGNvc3RfaXRlbXNfcmV2aWV3XyZsdDtcdUIwQTBcdUM5REMmZ3Q7Lnhsc3ggXHVDMEREXHVDMTMxPGJyPjxicj5cblxuICAgICAgICAgIDxzdHJvbmcgc3R5bGU9XCJjb2xvcjogdmFyKC0tZ29sZCk7XCI+Mi4gXHVCMzAwXHVENDVDXHVCMkQ4IFx1QUM4MFx1RDFBMDwvc3Ryb25nPjxicj5cbiAgICAgICAgICAtIFx1QzJEQ1x1RDJCOCAxOiAkezk0fVx1QUM3NCBcdUIyRThcdUFDMDAgXHVBQzgwXHVEMUEwIChcdUQ2MDRcdUM3QUMgXHVCMkU4XHVBQzAwXHVDNjQwIFx1QjMwMFx1RDQ1Q1x1QjJEOCBcdUIyRThcdUFDMDAgXHVCRTQ0XHVBRDUwKTxicj5cbiAgICAgICAgICAtIFx1QzJEQ1x1RDJCOCAyOiBcdUMyRTBcdUFEREMgXHVDNzkwXHVDN0FDIFx1Q0Q5NFx1QUMwMDxicj5cbiAgICAgICAgICAtIFx1QzJEQ1x1RDJCOCAzOiBcdUFDMDBcdUM3NzRcdUI0REM8YnI+PGJyPlxuXG4gICAgICAgICAgPHN0cm9uZyBzdHlsZT1cImNvbG9yOiB2YXIoLS1nb2xkKTtcIj4zLiBcdUM3ODRcdUQzRUNcdUQyQjg8L3N0cm9uZz48YnI+XG4gICAgICAgICAgPGNvZGUgc3R5bGU9XCJiYWNrZ3JvdW5kOiB2YXIoLS1iZyk7IHBhZGRpbmc6IDJweCA4cHg7IGNvbG9yOiB2YXIoLS1nb2xkKTsgZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtbW9ubyk7XCI+XG4gICAgICAgICAgICBub2RlIHNjcmlwdHMvdjYuMC9pbXBvcnRfY29zdF9pdGVtc194bHN4LmNqcyAmbHQ7XHVEMzBDXHVDNzdDXHVBQ0JEXHVCODVDJmd0OyAtLWFwcGx5XG4gICAgICAgICAgPC9jb2RlPjxicj5cbiAgICAgICAgICBcdTIxOTIgREIgXHVBQzMxXHVDMkUwICsgSVBDIFx1Qzc5MFx1QjNEOSBcdUJDMThcdUM2MDE8YnI+PGJyPlxuXG4gICAgICAgICAgPHN0cm9uZyBzdHlsZT1cImNvbG9yOiB2YXIoLS1uZWdhdGl2ZSk7XCI+XHVDQzM4XHVBQ0UwOjwvc3Ryb25nPlxuICAgICAgICAgIFBoYXNlIDVcdUM1RDBcdUMxMUMgXHVENjU0XHVCQTc0XHVDNUQwXHVDMTFDIFx1QzlDMVx1QzgxMSBcdUFDODBcdUQxQTAvXHVDMkI5XHVDNzc4IFx1QUMwMFx1QjJBNSAoSVBDIFx1QzRGMFx1QUUzMCBcdUQ2NUNcdUMxMzFcdUQ2NTQpLlxuICAgICAgICA8L3A+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBDb3N0c0FkbWluUGFnZSB9O1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7QUFBQTtBQUFBO0FBQUEsUUFBTSxpQkFBTixNQUFxQjtBQUFBLE1BQ25CLFlBQVksTUFBTTtBQUNoQixhQUFLLGNBQWMsS0FBSztBQUN4QixhQUFLLE9BQU87QUFDWixhQUFLLFlBQVk7QUFBQSxNQUNuQjtBQUFBLE1BRUEsTUFBTSxjQUFjO0FBQ2xCLFlBQUksT0FBTyxXQUFXLGVBQWUsT0FBTyxLQUFLO0FBQy9DLGNBQUk7QUFDRixrQkFBTSxTQUFTLE1BQU0sT0FBTyxJQUFJLEtBQUssa0JBQWtCLENBQUMsQ0FBQztBQUN6RCxrQkFBTSxLQUFLLEtBQUssWUFBWSxjQUFjLGVBQWU7QUFDekQsZ0JBQUksQ0FBQyxHQUFJO0FBQ1QsZUFBRyxZQUFZO0FBQUE7QUFBQTtBQUFBLHdDQUdpQixPQUFPLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFBQSx3Q0FJWixPQUFPLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQSx3Q0FJZixPQUFPLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGNBS3JDLE9BQU8sUUFBUSxPQUFPLFlBQVksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLE1BQU07QUFBQSx5Q0FDakMsR0FBRyxLQUFLLEtBQUs7QUFBQSxhQUN6QyxFQUFFLEtBQUssRUFBRSxDQUFDO0FBQUE7QUFBQTtBQUFBLFVBR2pCLFNBQVEsR0FBRztBQUFBLFVBQUM7QUFBQSxRQUNkO0FBQUEsTUFDRjtBQUFBLE1BRUEsU0FBUztBQUNQLGFBQUssWUFBWSxZQUFZO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLDhCQXFCYixFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BZXBCO0FBQUEsSUFDRjtBQUVBLFdBQU8sVUFBVSxFQUFFLGVBQWU7QUFBQTtBQUFBOyIsCiAgIm5hbWVzIjogW10KfQo=
