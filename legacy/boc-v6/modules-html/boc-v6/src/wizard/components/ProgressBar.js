// ECOREAN BOC v6.0 — Wizard Progress Bar
// 5단 게이트 진행 + 자동화율 시각화

class ProgressBar {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;

    this.unsubscribe = this.controller.subscribe((evt) => {
      if (evt === 'GATE_LOCKED' || evt === 'GATE_UNLOCKED' || evt === 'RESET') {
        this.render();
      }
    });

    this.render();
  }

  render() {
    const state = this.controller.getState();
    const stages = ['G1', 'G2', 'G3', 'G4', 'G5'];
    const stageNames = { G1: '유형', G2: '컨셉', G3: '섹션', G4: 'CAD', G5: '자재' };

    this.containerEl.innerHTML = `
      <div class="wizard-progress">
        <div class="progress-stages">
          ${stages.map(stage => {
            const isLocked = state.lockedGates.includes(stage);
            const isCurrent = state.currentStage === stage;
            const cls = isLocked ? 'locked' : (isCurrent ? 'current' : 'pending');
            return `
              <div class="stage ${cls}">
                <div class="stage-circle">
                  ${isLocked ? '✓' : stage[1]}
                </div>
                <div class="stage-label">${stageNames[stage]}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="automation-meter">
          <div class="meter-label">
            <span>자동화</span>
            <span class="meter-value">${state.automation}%</span>
          </div>
          <div class="meter-track">
            <div class="meter-fill" style="width: ${state.automation}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    this.containerEl.innerHTML = '';
  }
}

module.exports = { ProgressBar: ProgressBar };
