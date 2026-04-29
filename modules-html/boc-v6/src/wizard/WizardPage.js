// ECOREAN BOC v6.0 — Wizard Page (5단 통합)

const { WizardController } = require('./WizardController.js');
const { ProgressBar } = require('./components/ProgressBar.js');
const { G1Page } = require('./gates/G1Page.js');
const { G2Page } = require('./gates/G2Page.js');
const { G3Page } = require('./gates/G3Page.js');
const { G4Page } = require('./gates/G4Page.js');

class WizardPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = new WizardController();
    this.currentPage = null;

    this.render();

    this.controller.subscribe((evt) => {
      if (evt === 'GATE_LOCKED' || evt === 'GATE_UNLOCKED' || evt === 'RESET') {
        this._renderCurrentStage();
      }
    });
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="wizard-page">
        <div class="page-header">
          <h2>견적 마법자</h2>
          <div class="subtitle">5단 게이트 자동화 (G1 → G2 → G3 → G4 → G5 옵션)</div>
        </div>

        <div id="progress-container"></div>
        <div id="stage-container"></div>
      </div>
    `;

    new ProgressBar({
      containerEl: this.containerEl.querySelector('#progress-container'),
      controller: this.controller
    });

    this._renderCurrentStage();
  }

  _renderCurrentStage() {
    const stage = this.controller.getState().currentStage;
    const stageEl = this.containerEl.querySelector('#stage-container');

    if (this.currentPage && this.currentPage.destroy) this.currentPage.destroy();
    stageEl.innerHTML = '';

    switch (stage) {
      case 'G1': this.currentPage = new G1Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G2': this.currentPage = new G2Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G3': this.currentPage = new G3Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G4': this.currentPage = new G4Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G5':
      case 'COMPLETE':
        stageEl.innerHTML = `
          <div class="gate-page">
            <h2>견적 완성 (자동화 95%)</h2>
            <div class="gate-subtitle">G5 자재 선택은 옵션 / Phase 4 Week 4에서 활성화 예정</div>
            <button class="primary" onclick="location.reload()">새 견적 만들기</button>
          </div>
        `;
        break;
    }
  }
}

module.exports = { WizardPage: WizardPage };
