'use strict';
// 헌법 시드 보완 — 자재 35건 + 온톨로지 11건 + 브랜드 29건
// ecorean.db → ecorean-boc.db AppData 이식

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const BOC_DB_PATH = path.join(process.env.APPDATA, 'ecorean-boc', 'ecorean-boc.db');
const OLD_DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'ecorean.db');
const MATERIAL_JSON = path.join(__dirname, '..', '..', '..', 'src', 'master-db', 'seed', 'material-items.json');

function run() {
  const db = new Database(BOC_DB_PATH);
  const oldDb = new Database(OLD_DB_PATH, { readonly: true });
  const NOW = Date.now();

  let matInserted = 0, matSkipped = 0;
  let ontInserted = 0, ontSkipped = 0;
  let brandInserted = 0, brandSkipped = 0;

  // ── STEP A: cost_items 에 자재 35건 추가 ──────────────────────────
  console.log('\n[A] 자재 35건 → cost_items');

  const matData = JSON.parse(fs.readFileSync(MATERIAL_JSON, 'utf8'));
  const insertMat = db.prepare(`
    INSERT OR IGNORE INTO cost_items (
      id, tenant_id, category, subcategory, ks_code, name, unit, unit_price,
      applies_to_spaces, applies_to_concepts, source,
      is_ai_estimated, is_approved_by_principal, is_simulated,
      created_at, updated_at
    ) VALUES (
      @id, 'HQ', @category, @subcategory, @ks_code, @name, @unit, @unit_price,
      NULL, NULL, 'principal_seed',
      0, 1, 0,
      @now, @now
    )
  `);

  const txMat = db.transaction(() => {
    for (const item of matData.items) {
      const result = insertMat.run({
        id: 'ci_mat_' + item.matId.toLowerCase().replace(/-/g, '_'),
        category: 'material',
        subcategory: item.processId ? item.processId.split('_')[0].toLowerCase() : null,
        ks_code: null,
        name: item.name,
        unit: item.unit,
        unit_price: item.unitPrice,
        now: NOW
      });
      if (result.changes > 0) matInserted++;
      else matSkipped++;
    }
  });
  txMat();
  console.log(`  ✅ 추가: ${matInserted}건 / 스킵(중복): ${matSkipped}건`);

  // ── STEP B: ontology_rules 테이블 생성 + 11건 이식 ────────────────
  console.log('\n[B] ontology_rules 11건 → BOC DB 신규 테이블');

  db.exec(`
    CREATE TABLE IF NOT EXISTS ontology_rules (
      rule_id     TEXT PRIMARY KEY,
      trigger     TEXT NOT NULL,
      linked      TEXT NOT NULL,
      trigger_type TEXT NOT NULL DEFAULT 'AUTO',
      condition   TEXT,
      confidence  REAL NOT NULL DEFAULT 1.0,
      status      TEXT NOT NULL DEFAULT 'active',
      approved_by TEXT,
      source      TEXT NOT NULL DEFAULT 'manual',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    )
  `);

  const oldRules = oldDb.prepare("SELECT * FROM ontology_rules").all();
  const insertRule = db.prepare(`
    INSERT OR IGNORE INTO ontology_rules (
      rule_id, trigger, linked, trigger_type, condition,
      confidence, status, approved_by, source,
      created_at, updated_at
    ) VALUES (
      @rule_id, @trigger, @linked, @trigger_type, @condition,
      @confidence, @status, @approved_by, @source,
      @created_at, @updated_at
    )
  `);

  const txRules = db.transaction(() => {
    for (const r of oldRules) {
      const result = insertRule.run({
        rule_id: r.ruleId,
        trigger: r.trigger,
        linked: r.linked,
        trigger_type: r.triggerType || 'AUTO',
        condition: r.condition || null,
        confidence: r.confidenceLevel || 1.0,
        status: r.status || 'active',
        approved_by: r.approvedBy || null,
        source: r.source || 'manual',
        created_at: NOW,
        updated_at: NOW
      });
      if (result.changes > 0) ontInserted++;
      else ontSkipped++;
    }
  });
  txRules();
  console.log(`  ✅ 추가: ${ontInserted}건 / 스킵(중복): ${ontSkipped}건`);

  // ── STEP C: brands 테이블 생성 + 29건 이식 ────────────────────────
  console.log('\n[C] brands 29건 → BOC DB 신규 테이블');

  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      category   TEXT NOT NULL,
      product    TEXT NOT NULL,
      grade      TEXT,
      price      INTEGER NOT NULL,
      unit       TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  const oldBrands = oldDb.prepare("SELECT * FROM brands").all();
  const insertBrand = db.prepare(`
    INSERT OR IGNORE INTO brands (
      id, name, category, product, grade, price, unit,
      status, created_at, updated_at
    ) VALUES (
      @id, @name, @category, @product, @grade, @price, @unit,
      @status, @created_at, @updated_at
    )
  `);

  const txBrands = db.transaction(() => {
    for (const b of oldBrands) {
      const result = insertBrand.run({
        id: b.id,
        name: b.name,
        category: b.category,
        product: b.product,
        grade: b.grade || null,
        price: b.price,
        unit: b.unit,
        status: b.status || 'active',
        created_at: NOW,
        updated_at: NOW
      });
      if (result.changes > 0) brandInserted++;
      else brandSkipped++;
    }
  });
  txBrands();
  console.log(`  ✅ 추가: ${brandInserted}건 / 스킵(중복): ${brandSkipped}건`);

  // ── 최종 집계 ────────────────────────────────────────────────────
  console.log('\n=== 최종 집계 ===');
  const costItemsTotal = db.prepare("SELECT COUNT(*) as n FROM cost_items").get().n;
  const ontTotal = db.prepare("SELECT COUNT(*) as n FROM ontology_rules").get().n;
  const brandTotal = db.prepare("SELECT COUNT(*) as n FROM brands").get().n;

  console.log(`  cost_items:     ${costItemsTotal}건`);
  console.log(`  ontology_rules: ${ontTotal}건`);
  console.log(`  brands:         ${brandTotal}건`);
  console.log(`  합계:           ${costItemsTotal + ontTotal + brandTotal}건`);

  const grandTotal = costItemsTotal + ontTotal + brandTotal;
  if (grandTotal >= 159) {
    console.log(`\n  ✅ 헌법 목표 159건 충족 (${grandTotal}건)`);
  } else {
    console.log(`\n  ⚠️  헌법 목표 159건 미달 (${grandTotal}건, ${159 - grandTotal}건 부족)`);
  }

  oldDb.close();
  db.close();
}

if (require.main === module) run();
module.exports = { run };
