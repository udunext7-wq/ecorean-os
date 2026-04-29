// ECOREAN BOC v6.0 — Cost Loader (Node.js 전용 — main 프로세스에서만)
// 브라우저는 window.boc.cost.* IPC 경유

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'ecorean-boc.db');

function loadByCategory(category, opts) {
  opts = opts || {};
  const tenantId = opts.tenantId || 'HQ';
  const onlyApproved = opts.onlyApproved === true;
  const space = opts.space;
  const concept = opts.concept;

  const db = new Database(DB_PATH);
  let rows = [];

  try {
    let sql = 'SELECT * FROM cost_items WHERE tenant_id = ? AND category = ?';
    const params = [tenantId, category];

    if (onlyApproved) sql += ' AND is_approved_by_principal = 1';

    rows = db.prepare(sql).all(...params);

    if (space) {
      rows = rows.filter(r => {
        if (!r.applies_to_spaces) return true;
        try {
          const spaces = JSON.parse(r.applies_to_spaces);
          return spaces.includes(space);
        } catch(e) { return true; }
      });
    }
    if (concept) {
      rows = rows.filter(r => {
        if (!r.applies_to_concepts) return true;
        try {
          const concepts = JSON.parse(r.applies_to_concepts);
          return concepts.includes(concept);
        } catch(e) { return true; }
      });
    }
  } catch (e) {}
  db.close();
  return rows;
}

function buildLineItemForSpace(space, concept, opts) {
  const tenantId = (opts && opts.tenantId) || 'HQ';

  const flooringItems = loadByCategory('flooring', { tenantId, space: space.typeKey, concept });
  const wallItems     = loadByCategory('wallcovering', { tenantId, space: space.typeKey, concept });
  const tileItems     = (space.typeKey === 'BATHROOM' || space.typeKey === 'KITCHEN')
    ? loadByCategory('tile', { tenantId, space: space.typeKey, concept })
    : [];

  const avg = (items) => items.length > 0
    ? items.reduce((s, i) => s + i.unit_price, 0) / items.length
    : 0;

  const flooringPrice  = avg(flooringItems);
  const wallPrice      = avg(wallItems);
  const tilePrice      = avg(tileItems);
  const materialCost   = flooringPrice + wallPrice + tilePrice;

  const laborItems = (space.typeKey === 'BATHROOM' || space.typeKey === 'KITCHEN')
    ? loadByCategory('labor', { tenantId }).filter(l => ['특별인부','배관공','설비공'].includes(l.name) || l.subcategory === 'specialist')
    : loadByCategory('labor', { tenantId }).filter(l => l.name.includes('보통인부') || !l.subcategory);

  const laborCost = avg(laborItems);

  return {
    qty: space.area_sqm,
    wasteRate: 0.05,
    laborCost: Math.round(laborCost),
    pm: 1,
    materialCost: Math.round(materialCost),
    equipment: 0,
    accessory: 0,
    difficultyAdjust: 0,
    _meta: {
      space: space.typeKey,
      concept: concept,
      flooringItems: flooringItems.length,
      wallItems: wallItems.length,
      tileItems: tileItems.length,
      laborItems: laborItems.length,
      hasUnknown: materialCost === 0 || laborCost === 0
    }
  };
}

function buildLineItems(spaces, concept, opts) {
  return spaces.map(s => buildLineItemForSpace(s, concept, opts));
}

function getApprovalStatus(opts) {
  const tenantId = (opts && opts.tenantId) || 'HQ';
  const db = new Database(DB_PATH);
  let total = 0, approved = 0, bySource = {};
  try {
    total    = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE tenant_id = ?").get(tenantId).c;
    approved = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE tenant_id = ? AND is_approved_by_principal = 1").get(tenantId).c;
    const sourceRows = db.prepare("SELECT source, COUNT(*) as c FROM cost_items WHERE tenant_id = ? GROUP BY source").all(tenantId);
    sourceRows.forEach(r => { bySource[r.source] = r.c; });
  } catch(e) {}
  db.close();
  return {
    total, approved, pending: total - approved,
    rate: total > 0 ? Math.round((approved / total) * 100) : 0,
    bySource
  };
}

function approveCostItem(id, approver) {
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      UPDATE cost_items
      SET is_approved_by_principal = 1, approved_at = ?, approved_by = ?, updated_at = ?
      WHERE id = ?
    `).run(Date.now(), approver, Date.now(), id);
  } finally {
    db.close();
  }
  return { ok: true };
}

function updateCostItem(id, opts) {
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      UPDATE cost_items
      SET unit_price = ?, is_ai_estimated = 0, is_approved_by_principal = 1,
          approved_at = ?, approved_by = ?, source = 'principal_input', updated_at = ?
      WHERE id = ?
    `).run(opts.unit_price, Date.now(), opts.approver || 'principal', Date.now(), id);
  } finally {
    db.close();
  }
  return { ok: true };
}

module.exports = {
  loadByCategory, buildLineItemForSpace, buildLineItems,
  getApprovalStatus, approveCostItem, updateCostItem
};
