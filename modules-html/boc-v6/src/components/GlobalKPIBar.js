const { coreBus } = require('@core-bus/CoreBus.cjs');

class GlobalKPIBar {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.state = {
      automation: 0, final: 0, margin: 0, activeCount: 1, isSimulated: true
    };

    this.unsubscribe = coreBus.on('KPI_UPDATE', (data) => {
      if (data.automation !== undefined) this.state.automation = data.automation;
      if (data.final      !== undefined) this.state.final      = data.final;
      if (data.margin     !== undefined) this.state.margin     = data.margin;
      if (data.isSimulated!== undefined) this.state.isSimulated= data.isSimulated;
      this.render();
    });

    this._loadActiveCount();
    this.render();
  }

  async _loadActiveCount() {
    if (typeof window !== 'undefined' && window.boc && window.boc.kpi) {
      try {
        this.state.activeCount = await window.boc.kpi.getActiveCount();
        this.render();
      } catch(e) {}
    }
  }

  render() {
    const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
    const simBadge = this.state.isSimulated
      ? '<span class="sim-badge">시뮬</span>' : '';

    this.containerEl.innerHTML = `
      <div class="global-kpi-bar">
        <div class="kpi-item">
          <span class="kpi-label">자동화</span>
          <span class="kpi-value">${this.state.automation}%</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item highlight">
          <span class="kpi-label">최종</span>
          <span class="kpi-value">${fmt(this.state.final)}원</span>
          ${simBadge}
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-label">마진</span>
          <span class="kpi-value">${this.state.margin.toFixed ? this.state.margin.toFixed(1) : '0.0'}%</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-label">진행</span>
          <span class="kpi-value">${this.state.activeCount}건</span>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

module.exports = { GlobalKPIBar };
