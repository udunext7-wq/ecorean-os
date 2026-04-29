// ECOREAN BOC v5.6 — PurchaseOrder (발주 모듈)
const STATUSES = ['PENDING','ORDERED','DELIVERED','RETURNED','CANCELED'];

function createPO(opts) {
  if (!opts.contractId) throw new Error('PO: contractId 필수');
  if (typeof opts.qty !== 'number') throw new Error('PO: qty 필수');
  if (typeof opts.unitPrice !== 'number') throw new Error('PO: unitPrice 필수');

  const total = Math.round(opts.qty * opts.unitPrice);

  return {
    id: opts.id || ('po_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    contractId: opts.contractId,
    tenantId: opts.tenantId || 'HQ',
    vendorName: opts.vendorName || 'TBD',
    category: opts.category || 'unknown',
    ksCode: opts.ksCode || null,
    qty: opts.qty,
    unit: opts.unit || 'EA',
    unitPrice: opts.unitPrice,
    totalPrice: total,
    orderedAt: opts.orderedAt || null,
    expectedDelivery: opts.expectedDelivery || null,
    status: opts.status || 'PENDING',
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

function transition(po, newStatus) {
  if (!STATUSES.includes(newStatus)) return { ok: false, error: '미정의' };
  const valid = {
    PENDING:    ['ORDERED','CANCELED'],
    ORDERED:    ['DELIVERED','RETURNED','CANCELED'],
    DELIVERED:  ['RETURNED'],
    RETURNED:   [],
    CANCELED:   []
  };
  if (!valid[po.status].includes(newStatus)) {
    return { ok: false, error: po.status + ' → ' + newStatus };
  }
  po.status = newStatus;
  if (newStatus === 'ORDERED' && !po.orderedAt) po.orderedAt = Date.now();
  return { ok: true, po: po };
}

function toDBRow(po) {
  return {
    id: po.id,
    contract_id: po.contractId,
    tenant_id: po.tenantId,
    vendor_name: po.vendorName,
    category: po.category,
    ks_code: po.ksCode,
    qty: po.qty,
    unit: po.unit,
    unit_price: po.unitPrice,
    total_price: po.totalPrice,
    ordered_at: po.orderedAt,
    expected_delivery: po.expectedDelivery,
    status: po.status,
    is_simulated: po.isSimulated ? 1 : 0,
    created_at: po.createdAt
  };
}

module.exports = { STATUSES, createPO, transition, toDBRow };
