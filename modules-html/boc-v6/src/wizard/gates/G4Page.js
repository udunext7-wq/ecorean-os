// G4: CAD 면적 입력 (G3에서 자동 추출된 공간)
const { getSpacesForSections } = require('@estimate-v6/matrices/Sections.cjs');
const { getSpace } = require('@estimate-v6/matrices/Spaces.cjs');

class G4Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;

    const state = this.controller.getState();
    this.autoSpaces = getSpacesForSections(state.input.sections);
    this.spaceInputs = this.autoSpaces.map((spaceKey, idx) => ({
      id: 'sp_' + idx,
      typeKey: spaceKey,
      area_sqm: 0
    }));

    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 4 — 공간 면적 입력</h2>
        <div class="gate-subtitle">G3 섹션에서 자동 추출된 공간 / 자동화 85% → 95% (1단계 견적 완성)</div>

        <div class="card">
          ${this.spaceInputs.map((input, idx) => {
            const meta = getSpace(input.typeKey);
            return `
              <div class="space-row">
                <div class="space-name" style="font-family: var(--font-display); color: var(--gold);">${input.typeKey}</div>
                <div class="space-name">${meta ? meta.name : input.typeKey}</div>
                <input type="number" min="0" step="0.5" placeholder="면적(㎡)" data-idx="${idx}">
                <div style="text-align: right; color: var(--text-dim); font-size: 11px;">㎡</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="gate-actions">
          <button id="g4-back">← 이전</button>
          <button class="primary" id="g4-next" disabled>견적 계산 →</button>
        </div>
      </div>

      <div id="estimate-preview-container"></div>
    `;

    this.containerEl.querySelectorAll('input[data-idx]').forEach(el => {
      el.addEventListener('input', () => this._onInput(el));
    });
    this.containerEl.querySelector('#g4-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g4-next').addEventListener('click', () => this._submit());
  }

  _onInput(el) {
    const idx = parseInt(el.dataset.idx);
    const val = parseFloat(el.value) || 0;
    this.spaceInputs[idx].area_sqm = val;
    const allFilled = this.spaceInputs.every(s => s.area_sqm > 0);
    this.containerEl.querySelector('#g4-next').disabled = !allFilled;
  }

  _submit() {
    const r = this.controller.lockG4({ spaces: this.spaceInputs });
    if (!r.ok) {
      alert('G4 잠금 실패: ' + r.error);
      return;
    }
    this._renderEstimate();
  }

  _renderEstimate() {
    const state = this.controller.getState();
    const e = state.estimate;
    if (!e) return;

    const previewEl = this.containerEl.querySelector('#estimate-preview-container');
    if (!previewEl) return;

    previewEl.innerHTML = `
      <div class="estimate-preview">
        <h3>1단계 견적 (자동화 95%)</h3>
        <div class="estimate-row">
          <span class="label">총 면적</span>
          <span class="value">${e.areaSqm.toFixed(1)}㎡</span>
        </div>
        <div class="estimate-row">
          <span class="label">공급가</span>
          <span class="value">${e.supply.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">도급합계</span>
          <span class="value">${e.contract.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">VAT 10%</span>
          <span class="value">${(e.final - e.contract).toLocaleString()}원</span>
        </div>
        <div class="estimate-row highlight">
          <span class="label">최종 금액</span>
          <span class="value">${e.final.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">㎡당 단가</span>
          <span class="value">${e.sqmPrice.toLocaleString()}원/㎡</span>
        </div>
        <div class="estimate-row">
          <span class="label">평당 단가</span>
          <span class="value">${e.pyPrice.toLocaleString()}원/평</span>
        </div>
        <div class="estimate-row">
          <span class="label">마진율</span>
          <span class="value">${e.margin}%</span>
        </div>
      </div>
    `;
  }
}

module.exports = { G4Page: G4Page };
