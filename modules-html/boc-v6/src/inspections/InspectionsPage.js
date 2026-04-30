// ECOREAN BOC v6.0 — 검수 화면
// [G][H][I][J] Inspection 확정값 사용
// B4 절대 룰: FAIL → 후속 공정 진행 금지 (canProceedAfter)

const RESULT_COLOR = {
  PENDING: '#666', PASS: '#6DB96D',
  FAIL: '#C96D6D', CONDITIONAL_PASS: '#C9A84C'
};

class InspectionsPage {
  constructor(opts) {
    this.containerEl    = opts.containerEl;
    this.contractId     = opts.contractId || null;
    this.inspections    = [];
    this._currentInsId  = null;
    this._render();
    this._load();
  }

  async _load() {
    const api = window.boc?.inspection;
    if (!api) { this._mockLoad(); return; }
    try {
      const r = await api.list(this.contractId ? { contractId: this.contractId } : {});
      if (r.ok) { this.inspections = r.data.list; this._renderList(); }
    } catch(e) { console.error('[Inspections:load]', e); }
  }

  _mockLoad() {
    this.inspections = [
      { id: 'ins_001', section_id: '철거',   result: 'PASS',    inspector: '김현장', needs_research: 0, is_simulated: 1 },
      { id: 'ins_002', section_id: '방수',   result: 'FAIL',    inspector: '이현장', notes: '방수층 균열 발견', needs_research: 0, is_simulated: 1 },
      { id: 'ins_003', section_id: '바닥재', result: 'PENDING', inspector: '',       needs_research: 0, is_simulated: 1 }
    ];
    this._renderList();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">INSPECTION</div>
    <div style="font-size:10px;color:#555;margin-top:2px;">현장 검수</div>
  </div>
  <div id="ins-list"></div>
  <div id="ins-form" style="display:none;"></div>
</div>`;

    this.containerEl.addEventListener('click', e => {
      if (e.target.dataset.insId && e.target.dataset.action === 'record') this._showRecordForm(e.target.dataset.insId);
      if (e.target.id === 'btn-ins-submit')       this._submitRecord();
      if (e.target.id === 'btn-ins-cancel-form')  this._hideForm();
    });
  }

  _renderList() {
    const el = this.containerEl.querySelector('#ins-list');
    if (!el) return;
    const TH = 'padding:5px 8px;font-size:9px;color:#C9A84C;border:1px solid #1A1A1A;';
    const TD = 'padding:7px 8px;font-size:11px;border:1px solid #1A1A1A;';

    const failCount = this.inspections.filter(i => i.result === 'FAIL').length;

    el.innerHTML = `
${failCount ? `<div style="padding:8px 12px;background:#1A0F0F;border:1px solid #4A2A2A;margin-bottom:10px;font-size:11px;color:#C96D6D;">
  ⛔ FAIL ${failCount}건 — 해당 공종 후속 공정 진행 불가 (원칙 B4)
</div>` : ''}
<table style="width:100%;border-collapse:collapse;">
  <thead><tr>
    <th style="${TH}">No</th><th style="${TH};text-align:left">공종</th>
    <th style="${TH}">검수자</th><th style="${TH}">결과</th>
    <th style="${TH}">비고</th><th style="${TH}">처리</th>
  </tr></thead>
  <tbody>
    ${this.inspections.map((ins, i) => `<tr>
      <td style="${TD};text-align:center">${i + 1}</td>
      <td style="${TD}">${ins.section_id || '-'}</td>
      <td style="${TD}">${ins.inspector || '-'}</td>
      <td style="${TD};text-align:center">
        <span style="color:${RESULT_COLOR[ins.result] || '#666'};font-size:10px;font-weight:700">${ins.result}</span>
        ${ins.result === 'FAIL' ? '<span style="font-size:9px;color:#C96D6D;margin-left:4px">⛔</span>' : ''}
      </td>
      <td style="${TD};font-size:10px;color:#666">${ins.notes || ''}</td>
      <td style="${TD};text-align:center">
        ${ins.result === 'PENDING' ? `<button data-ins-id="${ins.id}" data-action="record" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #C9A84C;color:#C9A84C;cursor:pointer;">검수 기록</button>` : ''}
        ${ins.result === 'FAIL'    ? `<button data-ins-id="${ins.id}" data-action="record" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #E8A87C;color:#E8A87C;cursor:pointer;">재검수</button>` : ''}
      </td>
    </tr>`).join('')}
  </tbody>
</table>`;
  }

  _showRecordForm(insId) {
    this._currentInsId = insId;
    const ins = this.inspections.find(i => i.id === insId);
    const IS  = 'width:100%;padding:6px 8px;background:#141414;border:1px solid #2A2A2A;color:#F0EDE8;font-size:11px;outline:none;';
    const f   = this.containerEl.querySelector('#ins-form');
    f.style.display = 'block';
    f.innerHTML = `
<div style="background:#0F0F0F;border:1px solid #2A2A2A;padding:14px;margin-top:12px;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:10px;">검수 결과 기록 — ${ins?.section_id || insId}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">검수자</label>
         <input id="ins-inspector" style="${IS}" value="${ins?.inspector || ''}"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">결과 <span style="color:#C9A84C">*</span></label>
         <select id="ins-result" style="${IS}">
           <option value="PASS">PASS</option>
           <option value="FAIL">FAIL</option>
           <option value="CONDITIONAL_PASS">CONDITIONAL_PASS</option>
         </select></div>
    <div style="grid-column:1/-1"><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">비고</label>
         <textarea id="ins-notes" rows="2" style="${IS}height:auto;" placeholder="검수 내용 입력...">${ins?.notes || ''}</textarea></div>
  </div>
  <div id="ins-canproceed" style="margin-top:8px;"></div>
  <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
    <button id="btn-ins-cancel-form" style="padding:7px 14px;background:transparent;border:1px solid #333;color:#666;font-size:11px;cursor:pointer;">취소</button>
    <button id="btn-ins-submit" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">기록 저장</button>
  </div>
</div>`;

    const sel = f.querySelector('#ins-result');
    sel.addEventListener('change', () => {
      const warn = f.querySelector('#ins-canproceed');
      if (sel.value === 'FAIL') {
        warn.innerHTML = '<div style="padding:6px 10px;background:#1A0F0F;border:1px solid #4A2A2A;font-size:10px;color:#C96D6D;">⛔ FAIL 선택 시 후속 공정 진행 불가 (원칙 B4)</div>';
      } else {
        warn.innerHTML = '';
      }
    });
  }

  _hideForm() {
    const f = this.containerEl.querySelector('#ins-form');
    if (f) { f.style.display = 'none'; f.innerHTML = ''; }
    this._currentInsId = null;
  }

  async _submitRecord() {
    const g = id => this.containerEl.querySelector(id)?.value;
    const result    = g('#ins-result');
    const inspector = g('#ins-inspector')?.trim();
    const notes     = g('#ins-notes')?.trim();

    if (!result) { alert('결과를 선택해주세요.'); return; }

    const api = window.boc?.inspection;
    try {
      if (api) {
        const r = await api.record(this._currentInsId, { result, inspector, notes });
        if (r.ok) {
          // [I] B4 절대 룰: canProceed 결과 표시
          if (!r.data.canProceed) {
            alert(`⛔ ${result} — 후속 공정 진행 불가\n사유: ${r.data.reason}\n\n결함 해소 후 재검수 필요합니다.`);
          }
          this._hideForm();
          await this._load();
        } else alert('기록 실패: ' + (r.error?.message || ''));
      } else {
        const ins = this.inspections.find(i => i.id === this._currentInsId);
        if (ins) { ins.result = result; ins.inspector = inspector; ins.notes = notes; }
        this._hideForm();
        this._renderList();
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }
}

module.exports = { InspectionsPage };
