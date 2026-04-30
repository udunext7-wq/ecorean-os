// ECOREAN BOC v6.0 — 공정 화면
// [D][E][F] Schedule 확정값 사용
// [L] input.sections → generateSchedulesForContract 입력

const STATUS_COLOR = {
  PLANNED: '#666', IN_PROGRESS: '#C9A84C',
  COMPLETED: '#6DB96D', DELAYED: '#E8A87C', BLOCKED: '#C96D6D'
};

class SchedulesPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.contractId  = opts.contractId || null;
    this.sections    = opts.sections   || [];
    this.schedules   = [];
    this._render();
    this._load();
  }

  async _load() {
    const api = window.boc?.schedule;
    if (!api) { this._mockLoad(); return; }
    try {
      const r = await api.list(this.contractId ? { contractId: this.contractId } : {});
      if (r.ok) { this.schedules = r.data.list; this._renderList(); }
    } catch(e) { console.error('[Schedules:load]', e); }
  }

  _mockLoad() {
    const base = new Date('2026-05-15').getTime();
    this.schedules = [
      { id: 'sch_001', section_id: '철거',   start_date: base,               duration_days: 3, status: 'COMPLETED',   is_simulated: 1 },
      { id: 'sch_002', section_id: '방수',   start_date: base + 3 * 86400000, duration_days: 2, status: 'IN_PROGRESS', is_simulated: 1 },
      { id: 'sch_003', section_id: '바닥재', start_date: base + 5 * 86400000, duration_days: 4, status: 'PLANNED',     is_simulated: 1 }
    ];
    this._renderList();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div>
      <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">SCHEDULE</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">공정 관리</div>
    </div>
    ${this.sections.length ? `<button id="btn-gen-schedule" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">🗓 일정 자동 생성</button>` : ''}
  </div>
  <div id="schedule-list"></div>
</div>`;

    this.containerEl.addEventListener('click', e => {
      if (e.target.id === 'btn-gen-schedule')                                  this._generate();
      if (e.target.dataset.schedId && e.target.dataset.status)                 this._transition(e.target.dataset.schedId, e.target.dataset.status);
    });
  }

  _renderList() {
    const el = this.containerEl.querySelector('#schedule-list');
    if (!el) return;
    const TH = 'padding:5px 8px;font-size:9px;color:#C9A84C;border:1px solid #1A1A1A;';
    const TD = 'padding:7px 8px;font-size:11px;border:1px solid #1A1A1A;';

    if (!this.schedules.length) {
      el.innerHTML = '<div style="padding:30px;text-align:center;color:#333;">공정 없음 — 일정 자동 생성 버튼을 누르세요</div>';
      return;
    }

    const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('ko-KR') : '-';

    el.innerHTML = `
<table style="width:100%;border-collapse:collapse;">
  <thead><tr>
    <th style="${TH}">No</th><th style="${TH};text-align:left">공종</th>
    <th style="${TH}">착공일</th><th style="${TH}">기간</th>
    <th style="${TH}">완료 예정</th><th style="${TH}">상태</th><th style="${TH}">처리</th>
  </tr></thead>
  <tbody>
    ${this.schedules.map((s, i) => {
      const endDate = s.end_date || (s.start_date + s.duration_days * 86400000);
      return `<tr>
        <td style="${TD};text-align:center">${i + 1}</td>
        <td style="${TD}">${s.section_id || '-'}</td>
        <td style="${TD};text-align:center">${fmtDate(s.start_date)}</td>
        <td style="${TD};text-align:center">${s.duration_days}일</td>
        <td style="${TD};text-align:center">${fmtDate(endDate)}</td>
        <td style="${TD};text-align:center"><span style="color:${STATUS_COLOR[s.status] || '#666'};font-size:10px">${s.status}</span></td>
        <td style="${TD};text-align:center">
          ${s.status === 'PLANNED'     ? `<button data-sched-id="${s.id}" data-status="IN_PROGRESS" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #C9A84C;color:#C9A84C;cursor:pointer;">착공</button>` : ''}
          ${s.status === 'IN_PROGRESS' ? `<button data-sched-id="${s.id}" data-status="COMPLETED"  style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #6DB96D;color:#6DB96D;cursor:pointer;">완료</button>` : ''}
        </td>
      </tr>`;
    }).join('')}
  </tbody>
</table>`;
  }

  async _generate() {
    if (!this.sections.length) { alert('공종 정보가 없습니다. 마법자를 먼저 완료해주세요.'); return; }
    const api  = window.boc?.schedule;
    const opts = {
      contractId:  this.contractId || `contract_dev_${Date.now()}`,
      sections:    this.sections,
      startDate:   Date.now(),
      isSimulated: !this.contractId
    };
    try {
      if (api) {
        const r = await api.generate(opts);
        if (r.ok) { await this._load(); alert(`${r.data.count}개 공정 생성 완료`); }
        else alert('생성 실패: ' + (r.error?.message || ''));
      } else {
        alert('Electron 환경에서만 자동 생성 가능합니다.');
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }

  async _transition(id, newStatus) {
    const api = window.boc?.schedule;
    try {
      if (api) {
        const r = await api.transition(id, newStatus);
        if (r.ok) await this._load();
        else alert('상태 변경 실패: ' + (r.error?.message || ''));
      } else {
        const s = this.schedules.find(x => x.id === id);
        if (s) { s.status = newStatus; this._renderList(); }
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }
}

module.exports = { SchedulesPage };
