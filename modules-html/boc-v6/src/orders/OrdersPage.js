// ECOREAN BOC v6.0 — 발주 화면
// [A][B][C] PurchaseOrder 확정값 사용
// 원칙 15: 모든 IPC 호출 try/catch

const STATUS_COLOR = {
  PENDING: '#666', ORDERED: '#C9A84C',
  DELIVERED: '#6DB96D', RETURNED: '#E8A87C', CANCELED: '#C96D6D'
};

function fmt(n) { return (Number(n) || 0).toLocaleString('ko-KR'); }

class OrdersPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.contractId  = opts.contractId || null;
    this.orders      = [];
    this._render();
    this._load();
  }

  async _load() {
    const api = window.boc?.order;
    if (!api) { this._mockLoad(); return; }
    try {
      const r = await api.list(this.contractId ? { contractId: this.contractId } : {});
      if (r.ok) { this.orders = r.data.list; this._renderList(); }
      else console.error('[Orders]', r.error);
    } catch(e) { console.error('[Orders:load]', e); }
  }

  _mockLoad() {
    this.orders = [
      { id: 'po_001', vendor_name: '한국타일', category: '바닥재', qty: 30,
        unit_price: 85000, total_price: 2550000, status: 'ORDERED', is_simulated: 1 },
      { id: 'po_002', vendor_name: 'LX하우시스', category: '도배', qty: 50,
        unit_price: 12000, total_price: 600000, status: 'PENDING', is_simulated: 1 }
    ];
    this._renderList();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div>
      <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">ORDERS</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">발주 관리</div>
    </div>
    <button id="btn-add-order" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">+ 발주 추가</button>
  </div>
  <div id="order-list"></div>
  <div id="order-form" style="display:none;"></div>
</div>`;

    this.containerEl.addEventListener('click', e => {
      if (e.target.id === 'btn-add-order')         this._showForm();
      if (e.target.dataset.orderId)                this._transition(e.target.dataset.orderId, e.target.dataset.status);
      if (e.target.id === 'btn-order-submit')       this._submitForm();
      if (e.target.id === 'btn-order-cancel-form')  this._hideForm();
    });
  }

  _renderList() {
    const el = this.containerEl.querySelector('#order-list');
    if (!el) return;
    const TH = 'padding:5px 8px;font-size:9px;color:#C9A84C;border:1px solid #1A1A1A;';
    const TD = 'padding:7px 8px;font-size:11px;border:1px solid #1A1A1A;';
    if (!this.orders.length) {
      el.innerHTML = '<div style="padding:30px;text-align:center;color:#333;">발주 내역 없음</div>';
      return;
    }
    el.innerHTML = `
<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
  <thead><tr>
    <th style="${TH}">No</th><th style="${TH};text-align:left">업체</th>
    <th style="${TH};text-align:left">품목</th><th style="${TH}">수량</th>
    <th style="${TH}">단가</th><th style="${TH}">금액</th>
    <th style="${TH}">상태</th><th style="${TH}">처리</th>
  </tr></thead>
  <tbody>
    ${this.orders.map((o, i) => `<tr>
      <td style="${TD};text-align:center">${i + 1}</td>
      <td style="${TD}">${o.vendor_name || '-'}</td>
      <td style="${TD}">${o.category || '-'}</td>
      <td style="${TD};text-align:right">${fmt(o.qty)}</td>
      <td style="${TD};text-align:right">${fmt(o.unit_price)}</td>
      <td style="${TD};text-align:right;font-weight:500">${fmt(o.total_price)}</td>
      <td style="${TD};text-align:center"><span style="color:${STATUS_COLOR[o.status] || '#666'};font-size:10px">${o.status}</span></td>
      <td style="${TD};text-align:center">
        ${o.status === 'PENDING'  ? `<button data-order-id="${o.id}" data-status="ORDERED"   style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #C9A84C;color:#C9A84C;cursor:pointer;">발주</button>` : ''}
        ${o.status === 'ORDERED'  ? `<button data-order-id="${o.id}" data-status="DELIVERED" style="font-size:10px;padding:2px 7px;background:transparent;border:1px solid #6DB96D;color:#6DB96D;cursor:pointer;">입고</button>` : ''}
      </td>
    </tr>`).join('')}
  </tbody>
</table>`;
  }

  _showForm() {
    const IS = 'width:100%;padding:6px 8px;background:#141414;border:1px solid #2A2A2A;color:#F0EDE8;font-size:11px;outline:none;';
    const f  = this.containerEl.querySelector('#order-form');
    f.style.display = 'block';
    f.innerHTML = `
<div style="background:#0F0F0F;border:1px solid #2A2A2A;padding:14px;margin-top:12px;">
  <div style="font-size:9px;color:#C9A84C;letter-spacing:2px;margin-bottom:10px;">신규 발주</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">업체명</label>
         <input id="o-vendor" style="${IS}" placeholder="한국타일"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">품목/자재</label>
         <input id="o-category" style="${IS}" placeholder="바닥재"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">수량</label>
         <input id="o-qty" type="number" style="${IS}" placeholder="30"></div>
    <div><label style="font-size:9px;color:#666;display:block;margin-bottom:3px;">단가 (원)</label>
         <input id="o-price" type="number" style="${IS}" placeholder="85000"></div>
  </div>
  <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
    <button id="btn-order-cancel-form" style="padding:7px 14px;background:transparent;border:1px solid #333;color:#666;font-size:11px;cursor:pointer;">취소</button>
    <button id="btn-order-submit" style="padding:7px 16px;background:#C9A84C;border:none;color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;">발주 등록</button>
  </div>
</div>`;
  }

  _hideForm() {
    const f = this.containerEl.querySelector('#order-form');
    if (f) { f.style.display = 'none'; f.innerHTML = ''; }
  }

  async _submitForm() {
    const g = id => this.containerEl.querySelector(id)?.value?.trim();
    const qty       = Number(g('#o-qty'));
    const unitPrice = Number(g('#o-price'));

    if (!qty || !unitPrice) { alert('수량과 단가를 입력해주세요.'); return; }

    const opts = {
      contractId:  this.contractId || `contract_dev_${Date.now()}`,
      vendorName:  g('#o-vendor')   || '',
      category:    g('#o-category') || '',
      qty, unitPrice,
      isSimulated: !this.contractId
    };

    const api = window.boc?.order;
    try {
      if (api) {
        const r = await api.create(opts);
        if (r.ok) { this._hideForm(); await this._load(); }
        else alert('등록 실패: ' + (r.error?.message || ''));
      } else {
        this.orders.push({
          id: 'po_' + Date.now(), vendor_name: opts.vendorName,
          category: opts.category, qty, unit_price: unitPrice,
          total_price: qty * unitPrice, status: 'PENDING', is_simulated: 1
        });
        this._hideForm();
        this._renderList();
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }

  async _transition(id, newStatus) {
    const api = window.boc?.order;
    try {
      if (api) {
        const r = await api.transition(id, newStatus);
        if (r.ok) await this._load();
        else alert('상태 변경 실패: ' + (r.error?.message || ''));
      } else {
        const o = this.orders.find(x => x.id === id);
        if (o) { o.status = newStatus; this._renderList(); }
      }
    } catch(e) { alert('[오류] ' + e.message); }
  }
}

module.exports = { OrdersPage };
