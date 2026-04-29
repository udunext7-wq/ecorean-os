const { KPI_FIELDS } = require('@kpi-v6/KPIData.cjs');
const { coreBus } = require('@core-bus/CoreBus.cjs');

class KPIDashboardPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.kpiData = {};
    this.approval = { total: 0, approved: 0, pending: 0, rate: 0, bySource: {} };
    this.mlPhase = { real: 0, simulated: 0, total: 0, phase: 'PHASE_1_MANUAL' };

    this.unsubscribe = coreBus.on('KPI_UPDATE', (data) => {
      Object.assign(this.kpiData, data);
      this.render();
    });

    this._loadData();
  }

  async _loadData() {
    if (typeof window !== 'undefined' && window.boc) {
      try {
        this.approval = await window.boc.cost.getApprovalStatus({});
        this.mlPhase = await window.boc.kpi.getMLPhaseStatus();
      } catch(e) { console.error('[KPIDashboard] 로드 실패:', e); }
    }
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="page-header">
        <h2>KPI 풀 대시보드</h2>
        <div class="subtitle">11항목 + 단가 승인 + ML Phase / Phase 4 Week 4-A</div>
      </div>

      <div class="card">
        <h3>cost_items 단가 승인 진행</h3>
        <div class="approval-progress">
          <div class="approval-stat">
            <div class="stat-value">${this.approval.approved}</div>
            <div class="stat-label">승인됨</div>
          </div>
          <div class="approval-stat">
            <div class="stat-value">${this.approval.pending}</div>
            <div class="stat-label">검토 대기</div>
          </div>
          <div class="approval-stat">
            <div class="stat-value">${this.approval.rate}%</div>
            <div class="stat-label">승인률</div>
          </div>
        </div>
        <div class="approval-track">
          <div class="approval-fill" style="width: ${this.approval.rate}%"></div>
        </div>
        <div class="source-breakdown">
          ${Object.entries(this.approval.bySource || {}).map(([src, count]) => `
            <span class="source-tag">${src}: ${count}</span>
          `).join('')}
        </div>
        <button class="primary" onclick="window.location.hash='#/admin/costs'">단가 검토하기 →</button>
      </div>

      <div class="kpi-grid-full">
        ${KPI_FIELDS.map(f => this._renderKPICard(f)).join('')}
      </div>

      <div class="card">
        <h3>ML Phase 진행</h3>
        <div class="ml-phase-row">
          ${[
            { id: 'PHASE_1_MANUAL', name: 'Phase 1 (수동)', range: '0 ~ 49건' },
            { id: 'PHASE_2_STATS',  name: 'Phase 2 (통계)', range: '50 ~ 99건' },
            { id: 'PHASE_3_XGBOOST', name: 'Phase 3 (XGBoost)', range: '100 ~ 499건' },
            { id: 'PHASE_4_DEEP',  name: 'Phase 4 (Deep)', range: '500+건' }
          ].map(p => `
            <div class="ml-phase ${this.mlPhase.phase === p.id ? 'active' : ''}">
              <div class="phase-name">${p.name}</div>
              <div class="phase-range">${p.range}</div>
              ${this.mlPhase.phase === p.id ? `
                <div class="phase-current">실거래: ${this.mlPhase.real}건 / 시뮬: ${this.mlPhase.simulated}건</div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _renderKPICard(f) {
    const v = this.kpiData[f.key];
    const display = v != null ? this._fmt(v, f.format) : '-';
    return `
      <div class="kpi-card-full">
        <div class="kpi-card-label">${f.label}</div>
        <div class="kpi-card-value">${display}<span class="kpi-card-unit">${f.unit}</span></div>
      </div>
    `;
  }

  _fmt(v, format) {
    switch(format) {
      case 'currency': return Math.round(v).toLocaleString('ko-KR');
      case 'decimal':  return parseFloat(v).toFixed(1);
      case 'percent':  return parseFloat(v).toFixed(1);
      case 'integer':  return Math.round(v).toString();
      default: return String(v);
    }
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

module.exports = { KPIDashboardPage };
