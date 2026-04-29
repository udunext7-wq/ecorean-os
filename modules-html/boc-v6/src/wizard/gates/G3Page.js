// G3: 섹션 (22 섹션, 4 그룹)
const { SECTIONS, getAvailableSections } = require('@estimate-v6/matrices/Sections.cjs');

const GROUP_NAMES = {
  RESIDENTIAL: '주거 공간',
  AUXILIARY:   '부가 공간',
  SPECIAL:     '특수 공간',
  PROCESS:     '공정'
};

class G3Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = new Set();
    this.residence = this.controller.getState().input.residence;
    this.render();
  }

  render() {
    const available = getAvailableSections(this.residence);

    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 3 — 시공 섹션</h2>
        <div class="gate-subtitle">시공할 섹션 다중 선택 (최소 1개) / 자동화 70% → 85%</div>

        ${['RESIDENTIAL', 'AUXILIARY', 'SPECIAL', 'PROCESS'].map(group => {
          const sections = SECTIONS[group];
          if (!sections) return '';
          const sectionIds = Object.keys(sections).filter(id => available.includes(id));
          if (sectionIds.length === 0) return '';
          return `
            <div class="section-group-label">${GROUP_NAMES[group]}</div>
            <div class="card-grid">
              ${sectionIds.map(id => {
                const sec = sections[id];
                return `
                  <div class="option-card" data-section="${id}">
                    <div class="name">${sec.name}</div>
                    <div class="meta">${sec.required ? '필수' : '선택'}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}

        <div class="gate-actions">
          <button id="g3-back">← 이전</button>
          <button class="primary" id="g3-next" disabled>다음 → G4 CAD</button>
        </div>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('click', () => this._toggle(el.dataset.section));
    });
    this.containerEl.querySelector('#g3-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g3-next').addEventListener('click', () => this._submit());
  }

  _toggle(id) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);

    this.containerEl.querySelectorAll('[data-section]').forEach(el => {
      el.classList.toggle('selected', this.selected.has(el.dataset.section));
    });
    this.containerEl.querySelector('#g3-next').disabled = this.selected.size === 0;
  }

  _submit() {
    const r = this.controller.lockG3({ sections: Array.from(this.selected) });
    if (!r.ok) alert('G3 잠금 실패: ' + r.error);
  }
}

module.exports = { G3Page: G3Page };
