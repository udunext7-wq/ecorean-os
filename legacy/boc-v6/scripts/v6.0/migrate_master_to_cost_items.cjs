#!/usr/bin/env node
// 마스터 시드 JSON → cost_items 마이그레이션
// cost-items-v2.json (62건) + labor-roles.json (22건) → principal_seed / is_approved_by_principal=1

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT    = path.join(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'ecorean-boc.db');
const NOW     = Date.now();

const dryRun = !process.argv.includes('--apply');

// 카테고리 매핑 (majorCategory → cost_items.category)
const CAT_MAP = {
  '사전공정': 'preprocess',
  '방수': 'waterproof',
  '미장': 'plaster',
  '타일': 'tile',
  '목공구조': 'carpentry',
  '창호': 'window',
  '도어': 'door',
  '도장': 'paint',
  '도배': 'wallpaper',
  '바닥재': 'flooring',
  '설비': 'plumbing',
  '전기': 'electric',
  '가구': 'furniture',
  '욕실': 'bathroom',
  '준공': 'completion',
  '발코니': 'balcony',
  '석면': 'asbestos'
};

function loadCostItems() {
  const raw = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'src/master-db/seed/cost-items-v2.json'), 'utf8'
  ));
  return (raw.costItems || []).map((r, idx) => ({
    id: 'ci_seed_' + r.itemId.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    tenant_id: 'HQ',
    category: CAT_MAP[r.majorCategory] || r.majorCategory || 'unknown',
    subcategory: r.middleCategory || null,
    ks_code: null,
    name: r.itemName,
    unit: r.unit || '㎡',
    unit_price: (r.laborCost || 0) + (r.materialCost || 0) + (r.equipmentCost || 0) + (r.accessoryCost || 0),
    applies_to_spaces: null,
    applies_to_concepts: null,
    source: 'principal_seed',
    is_ai_estimated: 0,
    is_approved_by_principal: 1,
    is_simulated: 0,
    approved_at: NOW,
    approved_by: 'principal_seed_migration',
    notes: r.notes || null,
    created_at: NOW,
    updated_at: NOW
  }));
}

function loadLaborRoles() {
  const raw = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'src/master-db/seed/labor-roles.json'), 'utf8'
  ));
  const items = Array.isArray(raw) ? raw : (raw.items || Object.values(raw));
  return items.map((r) => ({
    id: 'ci_labor_' + r.id.replace(/[^a-zA-Z0-9가-힣]/g, '_'),
    tenant_id: 'HQ',
    category: 'labor',
    subcategory: r.category || null,
    ks_code: null,
    name: r.name,
    unit: r.unit || '일',
    unit_price: r.dailyRate || 0,
    applies_to_spaces: null,
    applies_to_concepts: null,
    source: 'principal_seed',
    is_ai_estimated: 0,
    is_approved_by_principal: 1,
    is_simulated: 0,
    approved_at: NOW,
    approved_by: 'principal_seed_migration',
    notes: r.source ? ('출처: ' + r.source) : null,
    created_at: NOW,
    updated_at: NOW
  }));
}

function migrate() {
  const db = new Database(DB_PATH);

  const items = [...loadCostItems(), ...loadLaborRoles()];
  console.log('적재 예정:', items.length, '건 (cost-items:', loadCostItems().length, '/ labor:', loadLaborRoles().length, ')');

  const stats = { inserted: 0, skipped: 0, conflicts: [] };

  const check = db.prepare("SELECT id FROM cost_items WHERE id = ?");

  items.forEach(item => {
    const existing = check.get(item.id);
    if (existing) {
      stats.skipped++;
      stats.conflicts.push(item.id);
    } else {
      stats.inserted++;
    }
  });

  if (dryRun) {
    console.log('\n=== DRY RUN ===');
    console.log('적재 예정:', stats.inserted, '건');
    console.log('스킵 (중복):', stats.skipped, '건');
    console.log('\n변경 미적용. --apply 옵션으로 실제 마이그레이션 실행.');
    db.close();
    return;
  }

  const insert = db.prepare(`
    INSERT INTO cost_items (
      id, tenant_id, category, subcategory, ks_code, name, unit, unit_price,
      applies_to_spaces, applies_to_concepts, source,
      is_ai_estimated, is_approved_by_principal, is_simulated,
      approved_at, approved_by, notes, created_at, updated_at
    ) VALUES (
      @id, @tenant_id, @category, @subcategory, @ks_code, @name, @unit, @unit_price,
      @applies_to_spaces, @applies_to_concepts, @source,
      @is_ai_estimated, @is_approved_by_principal, @is_simulated,
      @approved_at, @approved_by, @notes, @created_at, @updated_at
    )
  `);

  const tx = db.transaction((rows) => {
    rows.forEach(r => insert.run(r));
  });

  try {
    tx(items.filter(i => !db.prepare("SELECT id FROM cost_items WHERE id=?").get(i.id)));
    const total = db.prepare("SELECT COUNT(*) as c FROM cost_items").get().c;
    console.log('[PASS]', stats.inserted, '건 마이그레이션 완료 (DB 합계:', total, '건)');
  } catch (e) {
    console.error('[FAIL] 트랜잭션 실패:', e.message);
    process.exit(1);
  }

  db.close();
}

migrate();
