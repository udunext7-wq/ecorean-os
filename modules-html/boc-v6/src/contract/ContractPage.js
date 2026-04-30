// ECOREAN BOC v6.0 — Contract Page (계약 작성 UI)
const { ContractController } = require('./ContractController.js');
const { EstimatePDF } = require('./EstimatePDF.js');

function fmt(n) {
  return (n || 0).toLocaleString('ko-KR') + '원';
}

function _maskPhone(phone) {
  if (!phone) return '-';
  return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
}

class ContractPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.estimate = opts.estimate;
    this.input = opts.input || {};
    this.controller = new ContractController({ estimate: this.estimate });
    this._render();
    this.controller.subscribe((evt, payload) => {
      if (evt === 'CONTRACT_CREATED' || evt === 'CONTRACT_SIGNED' || evt === 'CONTRACT_CANCELED') {
        this._renderContractResult(payload);
      }
    });
  }

  _render() {
    const s = this.controller.getSummary();
    this.containerEl.innerHTML = `
      <div class="contract-page">
        <div class="page-header">
          <h2>계약서 작성</h2>
          <div class="subtitle">견적 완성 → 계약 초안 작성 (Phase 4 Week 5)</div>
        </div>

        <div class="contract-grid">
          <div class="card estimate-summary-card">
            <h3>견적 요약</h3>
            <div class="summary-row">
              <span>공급가</span><span>${fmt(s.supply)}</span>
            </div>
            <div class="summary-row">
              <span>도급합계 (VAT 전)</span><span class="highlight">${fmt(s.contractAmount)}</span>
            </div>
            <div class="summary-row">
              <span>VAT (10%)</span><span>${fmt(s.vatAmount)}</span>
            </div>
            <div class="summary-row total">
              <span>최종금액 (VAT 포함)</span><span class="gold">${fmt(s.finalAmount)}</span>
            </div>
            <div class="summary-meta">
              <span>평당 ${fmt(s.pyPrice)}</span>
              <span>마진 ${s.margin || 0}%</span>
            </div>
          </div>

          <div class="card customer-form-card" id="customer-form-wrap">
            <h3>고객 정보</h3>
            <div class="form-group">
              <label>고객명 *</label>
              <input type="text" id="contract-name" placeholder="홍길동">
            </div>
            <div class="form-group">
              <label>연락처 *</label>
              <input type="text" id="contract-phone" placeholder="010-0000-0000">
            </div>
            <div class="form-group">
              <label>공사 주소</label>
              <input type="text" id="contract-address" placeholder="서울시 강남구 ...">
            </div>
            <div class="form-group privacy-consent">
              <label style="flex-direction:row; align-items:flex-start; gap:8px; cursor:pointer;">
                <input type="checkbox" id="contract-consent" style="width:auto; margin-top:3px;">
                <span style="font-size:0.82rem; color:var(--text-dim); line-height:1.5;">
                  [필수] 인테리어 공사 견적·계약을 위한 개인정보(성명·연락처·주소) 수집·이용에 동의합니다.
                  수집된 정보는 계약 목적으로만 사용되며, 계약 종료 후 5년간 보관 후 파기됩니다.
                </span>
              </label>
            </div>
            <div class="form-error" id="contract-error" style="display:none;"></div>
            <div class="form-actions">
              <button class="primary" id="btn-create-draft">계약서 초안 작성</button>
              <button class="btn-secondary" id="btn-print-estimate">📄 PDF 견적서</button>
            </div>
          </div>
        </div>

        <div id="contract-result" style="display:none;"></div>
      </div>
    `;

    this.containerEl.querySelector('#btn-create-draft').addEventListener('click', () => {
      this._onCreateDraft();
    });
    this.containerEl.querySelector('#btn-print-estimate').addEventListener('click', () => {
      this._onPrintEstimate();
    });
  }

  async _onCreateDraft() {
    const name    = this.containerEl.querySelector('#contract-name').value.trim();
    const phone   = this.containerEl.querySelector('#contract-phone').value.trim();
    const address = this.containerEl.querySelector('#contract-address').value.trim();
    const consent = this.containerEl.querySelector('#contract-consent').checked;
    const errEl   = this.containerEl.querySelector('#contract-error');
    const btn     = this.containerEl.querySelector('#btn-create-draft');

    if (!consent) {
      errEl.textContent = '개인정보 수집·이용 동의가 필요합니다.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = '작성 중...';

    const r = await this.controller.createDraft({ customerName: name, customerPhone: phone, customerAddress: address });

    btn.disabled = false;
    btn.textContent = '계약서 초안 작성';

    if (!r.ok) {
      errEl.textContent = r.errors.join(' / ');
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
  }

  _renderContractResult(contract) {
    const resultEl  = this.containerEl.querySelector('#contract-result');
    const formWrap  = this.containerEl.querySelector('#customer-form-wrap');
    formWrap.style.opacity = '0.5';
    formWrap.querySelector('#btn-create-draft').disabled = true;

    const isCanceled = contract.status === 'CANCELED';

    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="card contract-result-card">
        <div class="result-badge ${contract.status.toLowerCase()}">
          ${contract.status === 'SIGNED'   ? '✅ 계약 완료 (SIGNED)'   :
            contract.status === 'CANCELED' ? '❌ 계약 취소 (CANCELED)' :
                                             '📄 계약 초안 (DRAFT)'}
        </div>
        <div class="result-grid">
          <div class="result-item"><span>계약 ID</span><span style="font-size:0.75rem;">${contract.id}</span></div>
          <div class="result-item"><span>고객명</span><span>${contract.customerName}</span></div>
          <div class="result-item"><span>연락처</span><span>${_maskPhone(contract.customerPhone)}</span></div>
          <div class="result-item"><span>공사 주소</span><span>${contract.customerAddress || '-'}</span></div>
          <div class="result-item"><span>도급합계</span><span>${fmt(contract.totalAmount)}</span></div>
          <div class="result-item"><span>VAT</span><span>${fmt(contract.vatAmount)}</span></div>
          <div class="result-item total"><span>최종금액</span><span>${fmt(contract.finalAmount)}</span></div>
          <div class="result-item"><span>상태</span><span class="status-badge ${contract.status}">${contract.status}</span></div>
          ${contract.local ? '<div class="result-item warn" style="grid-column:1/-1;"><span>⚠️</span><span>로컬 생성 (IPC 미연결 — DB 미저장)</span></div>' : ''}
        </div>
        ${!isCanceled && contract.status === 'DRAFT' ? `
          <div class="result-actions">
            <button class="primary" id="btn-sign">✍️ 서명 완료 (DRAFT → SIGNED)</button>
            <button class="btn-danger" id="btn-cancel-contract">계약 취소</button>
          </div>
        ` : ''}
        <div class="result-actions" style="margin-top: 8px;">
          <button class="btn-secondary" id="btn-print-signed">📄 계약서 출력</button>
          <button class="btn-secondary" id="btn-new-estimate" onclick="location.reload()">새 견적 만들기</button>
        </div>
      </div>
    `;

    if (!isCanceled && contract.status === 'DRAFT') {
      resultEl.querySelector('#btn-sign').addEventListener('click', () => {
        const r = this.controller.sign();
        if (r.ok) this._renderContractResult(r.contract);
      });
      resultEl.querySelector('#btn-cancel-contract').addEventListener('click', () => {
        if (confirm('계약을 취소하시겠습니까?')) {
          const r = this.controller.cancel();
          if (r.ok) this._renderContractResult(r.contract);
        }
      });
    }

    resultEl.querySelector('#btn-print-signed').addEventListener('click', () => {
      this._onPrintEstimate(contract);
    });
  }

  _onPrintEstimate(contract) {
    const s = this.controller.getSummary();
    EstimatePDF.printEstimate(
      { ...this.estimate, ...s },
      contract || this.controller.contract,
      this.input
    );
  }

  destroy() {}
}

module.exports = { ContractPage };
