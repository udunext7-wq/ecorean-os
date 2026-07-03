// ECOREAN BOC v5.6 — Contract (계약 모듈)
const { encrypt, hash } = require('../../security/Encryption.cjs');

const STATUSES = ['DRAFT','SIGNED','CANCELED','COMPLETED'];

function createContract(opts) {
  if (!opts.estimateId) throw new Error('Contract: estimateId 필수');
  if (typeof opts.totalAmount !== 'number') throw new Error('Contract: totalAmount 필수');

  const total = opts.totalAmount;
  const vat = Math.round(total * 0.10);
  const final2 = total + vat;

  return {
    id: opts.id || ('contract_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    estimateId: opts.estimateId,
    tenantId: opts.tenantId || 'HQ',
    customerName: opts.customerName || '',
    customerPhone: opts.customerPhone || '',
    customerAddress: opts.customerAddress || '',
    totalAmount: total,
    vatAmount: vat,
    finalAmount: final2,
    signedAt: opts.signedAt || null,
    status: opts.status || 'DRAFT',
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

function toDBRow(contract, encryptionKey) {
  return {
    id: contract.id,
    estimate_id: contract.estimateId,
    tenant_id: contract.tenantId,
    customer_name_enc: contract.customerName ? encrypt(contract.customerName, encryptionKey) : '',
    customer_phone_hash: contract.customerPhone ? hash(contract.customerPhone) : '',
    customer_address_enc: contract.customerAddress ? encrypt(contract.customerAddress, encryptionKey) : '',
    total_amount: contract.totalAmount,
    vat_amount: contract.vatAmount,
    final_amount: contract.finalAmount,
    signed_at: contract.signedAt,
    status: contract.status,
    is_simulated: contract.isSimulated ? 1 : 0,
    created_at: contract.createdAt
  };
}

function transition(contract, newStatus) {
  if (!STATUSES.includes(newStatus)) {
    return { ok: false, error: '미정의 상태: ' + newStatus };
  }
  const valid = {
    DRAFT:     ['SIGNED','CANCELED'],
    SIGNED:    ['COMPLETED','CANCELED'],
    COMPLETED: [],
    CANCELED:  []
  };
  if (!valid[contract.status].includes(newStatus)) {
    return { ok: false, error: contract.status + ' → ' + newStatus + ' 불가' };
  }
  contract.status = newStatus;
  if (newStatus === 'SIGNED' && !contract.signedAt) {
    contract.signedAt = Date.now();
  }
  return { ok: true, contract: contract };
}

function validateContract(c) {
  const errors = [];
  if (!c.id) errors.push('id 누락');
  if (!c.estimateId) errors.push('estimateId 누락');
  if (typeof c.totalAmount !== 'number') errors.push('totalAmount 타입');
  if (!STATUSES.includes(c.status)) errors.push('status 미정의');
  return errors;
}

module.exports = {
  STATUSES: STATUSES,
  createContract: createContract,
  toDBRow: toDBRow,
  transition: transition,
  validateContract: validateContract
};
