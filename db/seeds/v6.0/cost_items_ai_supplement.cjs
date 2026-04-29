#!/usr/bin/env node
// AI 시장 평균 단가 보충 시드 (마스터에 없는 항목만)

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'ecorean-boc.db');
const NOW = Date.now();

const SUPPLEMENT_SEEDS = [
  { category: 'flooring', subcategory: 'hardwood', ks_code: 'KS F 3111', name: '원목마루 (월넛 프리미엄)', unit: '㎡', unit_price: 250000, applies_to_concepts: ['CLASSIC_LUXURY','CONTEMPORARY'] },
  { category: 'tile', subcategory: 'marble', ks_code: 'KS L 1106', name: '대리석 타일 (이태리 카라라)', unit: '㎡', unit_price: 320000, applies_to_concepts: ['CLASSIC_LUXURY'] },
  { category: 'wallcovering', subcategory: 'panel', name: '나무 패널 (오크/월넛)', unit: '㎡', unit_price: 180000, applies_to_concepts: ['VINTAGE','INDUSTRIAL','CLASSIC_LUXURY'] },
  { category: 'wallcovering', subcategory: 'concrete', name: '노출콘크리트 마감', unit: '㎡', unit_price: 95000, applies_to_concepts: ['INDUSTRIAL','MINIMALIST'] },
  { category: 'tile', subcategory: 'porcelain', name: '베란다 타일 (방수)', unit: '㎡', unit_price: 38000, applies_to_spaces: ['BALCONY','TERRACE'] },
  { category: 'flooring', subcategory: 'epoxy', name: '에폭시 코팅 (창고/주차장)', unit: '㎡', unit_price: 55000, applies_to_spaces: ['WAREHOUSE','GARAGE'] },
  { category: 'hvac', subcategory: 'ventilation', name: '환풍기 (욕실)', unit: 'EA', unit_price: 180000, applies_to_spaces: ['BATHROOM','POWDER_ROOM'] },
  { category: 'hvac', subcategory: 'aircon', name: '에어컨 매립형', unit: 'EA', unit_price: 1850000 },
  { category: 'accessory', subcategory: 'hardware', name: '욕실 잡자재 (수전/거울/타올링)', unit: 'EA', unit_price: 280000, applies_to_spaces: ['BATHROOM'] },
  { category: 'accessory', subcategory: 'kitchen', name: '주방 잡자재 (수전/싱크볼/후드)', unit: 'EA', unit_price: 650000, applies_to_spaces: ['KITCHEN'] }
];

function run() {
  const db = new Database(DB_PATH);

  let inserted = 0, skipped = 0;

  const insert = db.prepare(`
    INSERT INTO cost_items (
      id, tenant_id, category, subcategory, ks_code, name, unit, unit_price,
      applies_to_spaces, applies_to_concepts, source,
      is_ai_estimated, is_approved_by_principal, is_simulated,
      created_at, updated_at
    ) VALUES (
      @id, 'HQ', @category, @subcategory, @ks_code, @name, @unit, @unit_price,
      @applies_to_spaces, @applies_to_concepts, 'ai_market_avg',
      1, 0, 0,
      @now, @now
    )
  `);

  const checkExisting = db.prepare(
    "SELECT id FROM cost_items WHERE name = ? AND COALESCE(ks_code,'') = COALESCE(?, '')"
  );

  SUPPLEMENT_SEEDS.forEach((seed, idx) => {
    const existing = checkExisting.get(seed.name, seed.ks_code || null);
    if (existing) {
      skipped++;
      return;
    }
    insert.run({
      id: 'ci_ai_' + Date.now() + '_' + String(idx).padStart(3, '0'),
      category: seed.category,
      subcategory: seed.subcategory || null,
      ks_code: seed.ks_code || null,
      name: seed.name,
      unit: seed.unit,
      unit_price: seed.unit_price,
      applies_to_spaces: seed.applies_to_spaces ? JSON.stringify(seed.applies_to_spaces) : null,
      applies_to_concepts: seed.applies_to_concepts ? JSON.stringify(seed.applies_to_concepts) : null,
      now: NOW
    });
    inserted++;
  });

  console.log('[PASS] AI 보충: ' + inserted + '건 추가 / ' + skipped + '건 스킵 (중복)');

  const total = db.prepare("SELECT COUNT(*) as c FROM cost_items").get().c;
  const principalApproved = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE source='principal_seed' AND is_approved_by_principal=1").get().c;
  const aiPending = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE source='ai_market_avg' AND is_approved_by_principal=0").get().c;
  console.log('총:', total, '/ 마스터승인:', principalApproved, '/ AI대기:', aiPending);

  db.close();
}

if (require.main === module) run();
module.exports = { run };
