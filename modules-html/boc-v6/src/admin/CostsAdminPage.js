class CostsAdminPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.render();
    this._loadStatus();
  }

  async _loadStatus() {
    if (typeof window !== 'undefined' && window.boc) {
      try {
        const status = await window.boc.cost.getApprovalStatus({});
        const el = this.containerEl.querySelector('#admin-status');
        if (!el) return;
        el.innerHTML = `
          <div class="approval-progress">
            <div class="approval-stat">
              <div class="stat-value">${status.total}</div>
              <div class="stat-label">전체</div>
            </div>
            <div class="approval-stat">
              <div class="stat-value">${status.approved}</div>
              <div class="stat-label">승인</div>
            </div>
            <div class="approval-stat">
              <div class="stat-value">${status.rate}%</div>
              <div class="stat-label">승인률</div>
            </div>
          </div>
          <div class="source-breakdown">
            ${Object.entries(status.bySource || {}).map(([src, count]) => `
              <span class="source-tag">${src}: ${count}</span>
            `).join('')}
          </div>
        `;
      } catch(e) {}
    }
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="page-header">
        <h2>단가 관리</h2>
        <div class="subtitle">cost_items Excel 워크플로우 / Phase 4 Week 4-A</div>
      </div>

      <div class="card">
        <h3>현재 상태</h3>
        <div id="admin-status" style="color: var(--text-dim);">로딩 중...</div>
      </div>

      <div class="card">
        <h3>Excel 워크플로우</h3>
        <p style="color: var(--text-dim); line-height: 1.8;">
          <strong style="color: var(--gold);">1. Excel 출력</strong><br>
          <code style="background: var(--bg); padding: 2px 8px; color: var(--gold); font-family: var(--font-mono);">
            node scripts/v6.0/export_cost_items_xlsx.cjs
          </code><br>
          → cost_items_review_&lt;날짜&gt;.xlsx 생성<br><br>

          <strong style="color: var(--gold);">2. 대표님 검토</strong><br>
          - 시트 1: ${94}건 단가 검토 (현재 단가와 대표님 단가 비교)<br>
          - 시트 2: 신규 자재 추가<br>
          - 시트 3: 가이드<br><br>

          <strong style="color: var(--gold);">3. 임포트</strong><br>
          <code style="background: var(--bg); padding: 2px 8px; color: var(--gold); font-family: var(--font-mono);">
            node scripts/v6.0/import_cost_items_xlsx.cjs &lt;파일경로&gt; --apply
          </code><br>
          → DB 갱신 + IPC 자동 반영<br><br>

          <strong style="color: var(--negative);">참고:</strong>
          Phase 5에서 화면에서 직접 검토/승인 가능 (IPC 쓰기 활성화).
        </p>
      </div>
    `;
  }
}

module.exports = { CostsAdminPage };
