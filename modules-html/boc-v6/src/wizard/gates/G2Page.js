// G2: 컨셉 (12 컨셉)
const { CONCEPTS } = require('@gates/G2_Concept.cjs');
const { CONCEPT_MATERIAL_MAP } = require('@estimate-v6/matrices/ConceptMaterialMatrix.cjs');

class G2Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = null;
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 2 — 컨셉</h2>
        <div class="gate-subtitle">디자인 컨셉 1개 선택 / 자동화 30% → 70%</div>

        <div class="card-grid" id="concept-grid">
          ${CONCEPTS.map(c => {
            const info = CONCEPT_MATERIAL_MAP[c];
            return `
              <div class="option-card" data-concept="${c}">
                <div class="name">${info ? info.name : c}</div>
                <div class="meta">${info ? '×' + info.mul + ' (' + info.grade + ')' : ''}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="gate-actions">
          <button id="g2-back">← 이전</button>
          <button class="primary" id="g2-next" disabled>다음 → G3 섹션</button>
        </div>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-concept]').forEach(el => {
      el.addEventListener('click', () => this._select(el.dataset.concept));
    });
    this.containerEl.querySelector('#g2-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g2-next').addEventListener('click', () => this._submit());
  }

  _select(c) {
    this.selected = c;
    this.containerEl.querySelectorAll('[data-concept]').forEach(el => {
      el.classList.toggle('selected', el.dataset.concept === c);
    });
    this.containerEl.querySelector('#g2-next').disabled = false;
  }

  _submit() {
    const r = this.controller.lockG2({ concept: this.selected });
    if (!r.ok) alert('G2 잠금 실패: ' + r.error);
  }
}

module.exports = { G2Page: G2Page };
