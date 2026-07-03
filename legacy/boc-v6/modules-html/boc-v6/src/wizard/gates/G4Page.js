// G4: CAD 면적 입력 — 듀얼 모드 (숫자 입력 ↔ 평면도)
const { getSpacesForSections } = require('@estimate-v6/matrices/Sections.cjs');
const { getSpace } = require('@estimate-v6/matrices/Spaces.cjs');
const { CADCanvas } = require('../../cad/CADCanvas.js');
const { CADToolbar } = require('../../cad/components/CADToolbar.js');
const { CADSpacesList } = require('../../cad/components/CADSpacesList.js');

class G4Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;

    const state = this.controller.getState();
    this.autoSpaces = getSpacesForSections(state.input.sections);

    this.mode = 'numeric';

    this.spaceInputs = this.autoSpaces.map((spaceKey, idx) => ({
      id: 'sp_' + idx,
      typeKey: spaceKey,
      area_sqm: 0
    }));

    this.cadCanvas = null;
    this.cadSpaces = [];

    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 4 — 공간 면적 입력</h2>
        <div class="gate-subtitle">자동화 85% → 95% (1단계 견적 완성)</div>

        <div class="mode-toggle">
          <button data-mode="numeric" class="${this.mode === 'numeric' ? 'active' : ''}">숫자 입력</button>
          <button data-mode="cad" class="${this.mode === 'cad' ? 'active' : ''}">📐 평면도</button>
        </div>

        <div id="g4-mode-content"></div>

        <div class="gate-actions">
          <button id="g4-back">← 이전</button>
          <button class="primary" id="g4-next" disabled>견적 계산 →</button>
        </div>
      </div>

      <div id="estimate-preview-container"></div>
    `;

    this.containerEl.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this._switchMode(btn.dataset.mode));
    });
    this.containerEl.querySelector('#g4-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g4-next').addEventListener('click', () => this._submit());

    this._renderModeContent();
  }

  _switchMode(mode) {
    this.mode = mode;
    this.containerEl.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    this._renderModeContent();
  }

  _renderModeContent() {
    const contentEl = this.containerEl.querySelector('#g4-mode-content');

    if (this.cadCanvas) {
      this.cadCanvas.destroy();
      this.cadCanvas = null;
    }

    if (this.mode === 'numeric') {
      this._renderNumericMode(contentEl);
    } else {
      this._renderCADMode(contentEl);
    }
  }

  _renderNumericMode(el) {
    el.innerHTML = `
      <div class="card">
        ${this.spaceInputs.map((input, idx) => {
          const meta = getSpace(input.typeKey);
          return `
            <div class="space-row">
              <div class="space-name" style="font-family: var(--font-display); color: var(--gold);">${input.typeKey}</div>
              <div class="space-name">${meta ? meta.name : input.typeKey}</div>
              <input type="number" min="0" step="0.5" placeholder="면적(㎡)" data-idx="${idx}" value="${input.area_sqm || ''}">
              <div style="text-align: right; color: var(--text-dim); font-size: 11px;">㎡</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    el.querySelectorAll('input[data-idx]').forEach(inp => {
      inp.addEventListener('input', () => this._onNumericInput(inp));
    });

    this._updateNextBtn();
  }

  _renderCADMode(el) {
    el.innerHTML = `
      <div id="cad-toolbar-container"></div>
      <div class="cad-canvas-wrapper">
        <div id="cad-canvas-container" style="width: 100%; height: 500px;"></div>
        <div class="canvas-hint">사각형 도구 → 드래그하여 공간 추가</div>
      </div>
      <div id="cad-spaces-container"></div>
    `;

    setTimeout(() => {
      const canvasContainer = document.getElementById('cad-canvas-container');
      const wrapperWidth = canvasContainer.clientWidth || 800;

      this.cadCanvas = new CADCanvas({
        containerEl: canvasContainer,
        width: wrapperWidth,
        height: 500,
        scale: 50
      });

      new CADToolbar({
        containerEl: document.getElementById('cad-toolbar-container'),
        canvas: this.cadCanvas
      });

      new CADSpacesList({
        containerEl: document.getElementById('cad-spaces-container'),
        canvas: this.cadCanvas
      });

      this.cadCanvas.onAreaChange(spaces => {
        this.cadSpaces = spaces.filter(s => s.typeKey !== 'UNKNOWN' && s.area_sqm > 0);
        this._updateNextBtn();
      });
    }, 50);
  }

  _onNumericInput(inp) {
    const idx = parseInt(inp.dataset.idx);
    const val = parseFloat(inp.value) || 0;
    this.spaceInputs[idx].area_sqm = val;
    this._updateNextBtn();
  }

  _updateNextBtn() {
    const btn = this.containerEl.querySelector('#g4-next');
    if (!btn) return;
    if (this.mode === 'numeric') {
      btn.disabled = !this.spaceInputs.every(s => s.area_sqm > 0);
    } else {
      btn.disabled = this.cadSpaces.length === 0;
    }
  }

  _submit() {
    const spaces = this.mode === 'numeric' ? this.spaceInputs : this.cadSpaces;
    const r = this.controller.lockG4({ spaces: spaces });
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
          <span class="label">도급합계 (×${e.factors.gradeMul} 컨셉 + ×${e.factors.baseFactor} 주거)</span>
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
          <span class="label">㎡당 / 평당</span>
          <span class="value">${e.sqmPrice.toLocaleString()} / ${e.pyPrice.toLocaleString()}원</span>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.cadCanvas) this.cadCanvas.destroy();
  }
}

module.exports = { G4Page: G4Page };
