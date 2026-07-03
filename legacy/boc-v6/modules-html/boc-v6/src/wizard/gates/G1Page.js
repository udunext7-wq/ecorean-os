const { RESIDENCE_TYPES, PYEONG_LEVELS } = require('@gates/G1_Type.cjs');

const RESIDENCE_INFO = {
  APARTMENT:    { name: '아파트',      icon: '🏢', meta: '' },
  VILLA:        { name: '빌라',        icon: '🏘', meta: '' },
  DETACHED_1F:  { name: '단독주택',    icon: '🏠', meta: '단층' },
  DETACHED_2F:  { name: '단독주택',    icon: '🏡', meta: '복층' },
  PENTHOUSE:    { name: '펜트하우스',  icon: '🌆', meta: '' },
  COMMERCIAL:   { name: '상가/오피스', icon: '🏬', meta: '' }
};

class G1Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = { residence: null, pyeong: null };
    this.context = {
      occupied: false,
      floorLevel: 1,
      hasElev: true,
      address: '',
      regionId: 'PROVINCE_OTHER'
    };
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 1 — 시공 유형 정의</h2>
        <div class="gate-subtitle">기본 정보 + 현장 조건 / 자동화 0% → 30%</div>

        <div class="g1-section">
          <div class="section-group-label">기본 정보</div>

          <div class="section-sublabel">주거 형태</div>
          <div class="card-grid compact" id="residence-grid">
            ${RESIDENCE_TYPES.map(r => {
              const info = RESIDENCE_INFO[r] || { name: r, icon: '🏠', meta: '' };
              return `
                <div class="option-card compact" data-residence="${r}">
                  <div class="icon">${info.icon}</div>
                  <div class="name">${info.name}</div>
                  <div class="meta">${info.meta}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="section-sublabel">평형</div>
          <div class="card-grid compact" id="pyeong-grid">
            ${PYEONG_LEVELS.map(p => `
              <div class="option-card compact" data-pyeong="${p}">
                <div class="name">${p}평</div>
                <div class="meta">~${Math.round(p * 3.3058)}㎡</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="g1-section">
          <div class="section-group-label">현장 조건</div>

          <div class="g1-context-grid">
            <div class="context-row">
              <label>거주중 시공</label>
              <div class="toggle-group">
                <button class="toggle-btn active" data-ctx="occupied" data-val="false">아니오</button>
                <button class="toggle-btn" data-ctx="occupied" data-val="true">예 (+10%)</button>
              </div>
            </div>
            <div class="context-row">
              <label>층수</label>
              <input type="number" id="ctx-floor" min="1" max="50" value="1" style="width:70px; background: var(--bg); border: 1px solid var(--gold-faint); color: var(--text); padding: 4px 8px; border-radius: 4px;">
            </div>
            <div class="context-row">
              <label>엘리베이터</label>
              <div class="toggle-group">
                <button class="toggle-btn active" data-ctx="hasElev" data-val="true">있음</button>
                <button class="toggle-btn" data-ctx="hasElev" data-val="false">없음 (4층+5%)</button>
              </div>
            </div>
            <div class="context-row full-width">
              <label>주소</label>
              <input type="text" id="ctx-address" placeholder="예: 서울 강남구 역삼동" maxlength="100" style="flex:1; background: var(--bg); border: 1px solid var(--gold-faint); color: var(--text); padding: 4px 8px; border-radius: 4px;">
              <div class="region-display" id="region-display">지역: 자동 매핑</div>
            </div>
          </div>
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
    this.containerEl.querySelectorAll('[data-ctx]').forEach(btn => {
      btn.addEventListener('click', () => this._onContextToggle(btn));
    });
    this.containerEl.querySelector('#ctx-floor').addEventListener('input', (e) => {
      this.context.floorLevel = parseInt(e.target.value) || 1;
    });
    this.containerEl.querySelector('#ctx-address').addEventListener('input', (e) => {
      this.context.address = e.target.value;
      this._updateRegion();
    });
    this.containerEl.querySelector('#g1-next').addEventListener('click', () => this._submit());
  }

  _selectResidence(r) {
    this.selected.residence = r;
    this.containerEl.querySelectorAll('[data-residence]').forEach(el => {
      el.classList.toggle('selected', el.dataset.residence === r);
    });
    this._updateNextBtn();
    setTimeout(() => {
      this.containerEl.querySelector('#pyeong-grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
  }

  _selectPyeong(p) {
    this.selected.pyeong = p;
    this.containerEl.querySelectorAll('[data-pyeong]').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.pyeong) === p);
    });
    this._updateNextBtn();
  }

  _onContextToggle(btn) {
    const ctxKey = btn.dataset.ctx;
    const val = btn.dataset.val === 'true';
    this.context[ctxKey] = val;
    this.containerEl.querySelectorAll(`[data-ctx="${ctxKey}"]`).forEach(b => {
      b.classList.toggle('active', b.dataset.val === btn.dataset.val);
    });
  }

  _updateRegion() {
    let regionId = 'PROVINCE_OTHER';
    let factor = 1.0;
    try {
      const { getRegionByArea, getRegionFactor } = require('@korea/RegionFactor.cjs');
      regionId = getRegionByArea(this.context.address);
      factor = getRegionFactor(regionId);
    } catch(e) {}
    this.context.regionId = regionId;

    const REGION_NAMES = {
      SEOUL_GANGNAM: '강남3구', SEOUL_OTHER: '서울', METRO_BUSAN: '부산',
      METRO_OTHER: '광역시', PROVINCE_MAJOR: '도청소재지',
      PROVINCE_OTHER: '지방', JEJU: '제주'
    };
    const factorPercent = ((factor - 1) * 100).toFixed(0);
    const sign = factor >= 1 ? '+' : '';
    const el = this.containerEl.querySelector('#region-display');
    if (el) el.textContent = `지역: ${REGION_NAMES[regionId] || regionId} (${sign}${factorPercent}%)`;
  }

  _updateNextBtn() {
    const btn = this.containerEl.querySelector('#g1-next');
    if (btn) btn.disabled = !(this.selected.residence && this.selected.pyeong);
  }

  _submit() {
    this.controller.input.context = this.context;
    const r = this.controller.lockG1(this.selected);
    if (r && typeof r.then === 'function') {
      r.then(res => { if (res && !res.ok) alert('G1 잠금 실패: ' + res.error); });
    } else {
      if (r && !r.ok) alert('G1 잠금 실패: ' + r.error);
    }
  }
}

module.exports = { G1Page };
