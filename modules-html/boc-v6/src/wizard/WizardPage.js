// ECOREAN BOC v6.0 — Wizard Page (5단 통합 + 계약 연결)

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
    this._lastEstimate = null;

    this.render();

    this.controller.subscribe((evt, payload) => {
      if (evt === 'GATE_LOCKED' || evt === 'GATE_UNLOCKED' || evt === 'RESET') {
        this._renderCurrentStage();
      }
      if (evt === 'ESTIMATE_CALCULATED') {
        this._lastEstimate = payload;
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
        try {
          const { ContractPage } = require('../contract/ContractPage.js');
          const est = this._lastEstimate || this.controller.estimate;
          if (est) {
            this.currentPage = new ContractPage({
              containerEl: stageEl,
              estimate: est,
              input: this.controller.getState().input
            });
          } else {
            stageEl.innerHTML = `
              <div class="gate-page">
                <h2>견적 완성 ✅</h2>
                <div class="gate-subtitle">견적 계산 중... 잠시 기다려주세요</div>
              </div>
            `;
          }
        } catch(e) {
          stageEl.innerHTML = `
            <div class="gate-page">
              <h2>견적 완성 ✅</h2>
              <div class="gate-subtitle">계약 화면 로드 실패: ${e.message}</div>
              <button class="primary" onclick="location.reload()">새 견적 만들기</button>
            </div>
          `;
        }
        break;
    }
  }
}

module.exports = { WizardPage: WizardPage };
