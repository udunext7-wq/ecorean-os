// G1: 유형 (주거 6 + 평형 5)
const { RESIDENCE_TYPES, PYEONG_LEVELS } = require('@gates/G1_Type.cjs');

const RESIDENCE_INFO = {
  APARTMENT:    { name: '아파트',      icon: '🏢' },
  VILLA:        { name: '빌라',        icon: '🏘️' },
  DETACHED_1F:  { name: '단독주택',    icon: '🏠', meta: '단층' },
  DETACHED_2F:  { name: '단독주택',    icon: '🏡', meta: '복층' },
  PENTHOUSE:    { name: '펜트하우스',  icon: '🌆' },
  COMMERCIAL:   { name: '상가/오피스', icon: '🏬' }
};

class G1Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = { residence: null, pyeong: null };
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 1 — 유형</h2>
        <div class="gate-subtitle">주거 형태 + 평형 선택 / 자동화 0% → 30%</div>

        <div class="section-group-label">주거 형태</div>
        <div class="card-grid" id="residence-grid">
          ${RESIDENCE_TYPES.map(r => {
            const info = RESIDENCE_INFO[r];
            return `
              <div class="option-card" data-residence="${r}">
                <div class="icon">${info.icon}</div>
                <div class="name">${info.name}</div>
                <div class="meta">${info.meta || ''}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="section-group-label">평형</div>
        <div class="card-grid" id="pyeong-grid">
          ${PYEONG_LEVELS.map(p => `
            <div class="option-card" data-pyeong="${p}">
              <div class="name">${p}평</div>
              <div class="meta">~${Math.round(p * 3.3058)}㎡</div>
            </div>
          `).join('')}
        </div>

        <div class="gate-actions">
          <div></div>
          <button class="primary" id="g1-next" disabled>다음 → G2 컨셉</button>
        </div>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-residence]').forEach(el => {
      el.addEventListener('click', () => this._selectResidence(el.dataset.residence));
    });
    this.containerEl.querySelectorAll('[data-pyeong]').forEach(el => {
      el.addEventListener('click', () => this._selectPyeong(parseInt(el.dataset.pyeong)));
    });
    this.containerEl.querySelector('#g1-next').addEventListener('click', () => this._submit());
  }

  _selectResidence(r) {
    this.selected.residence = r;
    this.containerEl.querySelectorAll('[data-residence]').forEach(el => {
      el.classList.toggle('selected', el.dataset.residence === r);
    });
    this._updateNextBtn();
  }

  _selectPyeong(p) {
    this.selected.pyeong = p;
    this.containerEl.querySelectorAll('[data-pyeong]').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.pyeong) === p);
    });
    this._updateNextBtn();
  }

  _updateNextBtn() {
    const btn = this.containerEl.querySelector('#g1-next');
    btn.disabled = !(this.selected.residence && this.selected.pyeong);
  }

  _submit() {
    const r = this.controller.lockG1(this.selected);
    if (!r.ok) alert('G1 잠금 실패: ' + r.error);
  }
}

module.exports = { G1Page: G1Page };
