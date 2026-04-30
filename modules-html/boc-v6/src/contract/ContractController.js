// ECOREAN BOC v6.0 — Contract Controller (UI 레이어)
// IPC 우선 (Electron), 로컬 fallback (시뮬, DB 미저장)
// TODO P6: 고객 개인정보 AES-256-GCM 암호화 → Phase 5에서 구현 예정

function _localCreateContract(opts) {
  const total = opts.totalAmount;
  const vat = Math.round(total * 0.10);
  return {
    id: 'contract_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    estimateId: opts.estimateId,
    tenantId: opts.tenantId || 'HQ',
    customerName: opts.customerName || '',
    customerPhone: opts.customerPhone || '',
    customerAddress: opts.customerAddress || '',
    totalAmount: total,
    vatAmount: vat,
    finalAmount: total + vat,
    signedAt: null,
    status: 'DRAFT',
    isSimulated: opts.isSimulated === true,
    createdAt: Date.now()
  };
}

class ContractController {
  constructor(opts) {
    // P5: 계약 생성 시점 견적 스냅샷 (딥카피) — 이후 견적 변경이 계약에 영향 주지 않도록
    this.estimate = JSON.parse(JSON.stringify(opts.estimate));
    this.contract = null;
    this.listeners = new Set();
  }

  subscribe(handler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  _emit(type, payload) {
    this.listeners.forEach(h => h(type, payload));
  }

  _validateCustomer(opts) {
    const errors = [];
    if (!opts.customerName || !opts.customerName.trim()) errors.push('고객명 필수');
    if (!opts.customerPhone || !opts.customerPhone.trim()) errors.push('연락처 필수');
    return errors;
  }

  getSummary() {
    const e = this.estimate;
    return {
      contractAmount: e.contract,
      vatAmount: Math.round(e.contract * 0.10),
      finalAmount: e.final,
      supply: e.supply,
      margin: e.margin,
      areaSqm: e.areaSqm,
      sqmPrice: e.sqmPrice,
      pyPrice: e.pyPrice
    };
  }

  async createDraft(customerOpts) {
    const errors = this._validateCustomer(customerOpts);
    if (errors.length > 0) return { ok: false, errors };

    const estimateId = this.estimate.id || ('est_' + Date.now());
    const totalAmount = this.estimate.contract;

    // IPC 우선 (Electron 환경)
    if (typeof window !== 'undefined' && window.boc && window.boc.contract) {
      try {
        const res = await window.boc.contract.create({
          estimateId,
          totalAmount,
          tenantId: 'HQ',
          customerName: customerOpts.customerName || '',
          customerPhone: customerOpts.customerPhone || '',
          customerAddress: customerOpts.customerAddress || ''
        });
        if (res && res.ok) {
          this.contract = res.contract;
          this._emit('CONTRACT_CREATED', this.contract);
          return { ok: true, contract: this.contract };
        }
      } catch (e) {
        console.error('[ContractController] IPC 실패:', e);
      }
    }

    // 로컬 fallback
    this.contract = _localCreateContract({
      estimateId,
      totalAmount,
      tenantId: 'HQ',
      customerName: customerOpts.customerName || '',
      customerPhone: customerOpts.customerPhone || '',
      customerAddress: customerOpts.customerAddress || '',
      isSimulated: !this.estimate.id
    });
    this._emit('CONTRACT_CREATED', this.contract);
    return { ok: true, contract: this.contract, local: true };
  }

  sign() {
    if (!this.contract) return { ok: false, error: '계약 없음' };
    if (this.contract.status !== 'DRAFT') return { ok: false, error: 'DRAFT 상태만 서명 가능' };
    this.contract.status = 'SIGNED';
    this.contract.signedAt = Date.now();
    this._emit('CONTRACT_SIGNED', this.contract);
    return { ok: true, contract: this.contract };
  }

  cancel() {
    if (!this.contract) return { ok: false, error: '계약 없음' };
    if (!['DRAFT', 'SIGNED'].includes(this.contract.status)) {
      return { ok: false, error: '취소 불가 상태' };
    }
    this.contract.status = 'CANCELED';
    this._emit('CONTRACT_CANCELED', this.contract);
    return { ok: true, contract: this.contract };
  }
}

module.exports = { ContractController };
