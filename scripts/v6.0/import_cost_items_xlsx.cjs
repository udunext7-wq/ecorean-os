#!/usr/bin/env node
// Excel → cost_items 임포트
// BOM/콤마/타입 정규화 + 트랜잭션 + 자동 백업

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const { execSync } = require('child_process');

const DB_PATH = path.join(__dirname, '..', '..', 'ecorean-boc.db');
const ROOT = path.join(__dirname, '..', '..');

function normalizeNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return null;
  const cleaned = val.replace(/[,\s원]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

function run(filePath, dryRun) {
  if (!fs.existsSync(filePath)) {
    console.error('[FAIL] 파일 미존재: ' + filePath);
    process.exit(1);
  }

  if (!dryRun) {
    console.log('자동 백업 중...');
    execSync('node scripts/backup.cjs --label pre_xlsx_import', { cwd: ROOT });
  }

  const wb = XLSX.readFile(filePath);
  const ws1 = wb.Sheets['검토용'];
  const ws2 = wb.Sheets['신규자재'];

  if (!ws1) {
    console.error('[FAIL] 검토용 시트 없음');
    process.exit(1);
  }

  const reviewRows = XLSX.utils.sheet_to_json(ws1);
  const newRows = ws2 ? XLSX.utils.sheet_to_json(ws2) : [];

  console.log('Excel 로드: 검토 ' + reviewRows.length + '건 / 신규 ' + newRows.length + '건');

  const db = new Database(DB_PATH);
  const stats = { updated: 0, inserted: 0, errors: [] };
  const NOW = Date.now();

  const updateStmt = db.prepare(`
    UPDATE cost_items SET
      unit_price = ?,
      is_ai_estimated = 0,
      is_approved_by_principal = ?,
      source = ?,
      approved_at = ?,
      approved_by = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO cost_items (
      id, tenant_id, category, subcategory, ks_code, name, unit, unit_price,
      applies_to_spaces, applies_to_concepts, source,
      is_ai_estimated, is_approved_by_principal, is_simulated,
      approved_at, approved_by, notes, created_at, updated_at
    ) VALUES (
      ?, 'HQ', ?, ?, ?, ?, ?, ?,
      ?, ?, 'principal_input',
      0, 1, 0,
      ?, ?, ?, ?, ?
    )
  `);

  const tx = db.transaction(() => {
    reviewRows.forEach((row, idx) => {
      const id = row['id (수정 금지)'];
      if (!id) return;

      const newPrice = normalizeNumber(row['대표님 단가 (수정시 입력)']);
      const currentPrice = normalizeNumber(row['현재 단가 (원)']);
      const finalPrice = newPrice !== null ? newPrice : currentPrice;
      const approval = String(row['승인 (Y/N)'] || '').toUpperCase().trim();
      const isApproved = approval === 'Y' ? 1 : 0;
      const newSource = newPrice !== null ? 'principal_input' : (row['출처'] || 'principal_seed');

      if (finalPrice === null || finalPrice < 0) {
        stats.errors.push({ row: idx + 2, error: '단가 형식 오류', value: row['현재 단가 (원)'] });
        return;
      }

      try {
        updateStmt.run(finalPrice, isApproved, newSource, NOW, 'principal_xlsx', row['메모'] || null, NOW, id);
        if (newPrice !== null || isApproved !== 0) stats.updated++;
      } catch (e) {
        stats.errors.push({ row: idx + 2, error: e.message });
      }
    });

    newRows.forEach((row, idx) => {
      const name = row.name || '';
      if (!name.trim()) return;

      const unitPrice = normalizeNumber(row['unit_price (원)']);
      if (unitPrice === null) {
        stats.errors.push({ row: idx + 2, sheet: '신규자재', error: '단가 누락', name: name });
        return;
      }

      const id = 'ci_principal_' + Date.now() + '_' + String(stats.inserted).padStart(3, '0');
      try {
        insertStmt.run(
          id, row.category || 'unknown', row.subcategory || null,
          row.ks_code || null, name, row.unit || '㎡', unitPrice,
          row['applies_to_spaces (JSON)'] || null,
          row['applies_to_concepts (JSON)'] || null,
          NOW, 'principal_xlsx', row['메모'] || null,
          NOW, NOW
        );
        stats.inserted++;
      } catch (e) {
        stats.errors.push({ row: idx + 2, sheet: '신규자재', error: e.message, name: name });
      }
    });
  });

  if (dryRun) {
    console.log('\n=== DRY RUN ===');
    console.log('변경 미적용. --apply 옵션으로 실제 임포트.');
  } else {
    try {
      tx();
      console.log('[PASS] 업데이트 ' + stats.updated + '건 / 신규 ' + stats.inserted + '건');
      if (stats.errors.length > 0) {
        console.log('[WARN] 에러 ' + stats.errors.length + '건:');
        stats.errors.slice(0, 10).forEach(e => console.log('  ' + JSON.stringify(e)));
      }
    } catch (e) {
      console.error('[FAIL] 트랜잭션 실패:', e.message);
      process.exit(1);
    }
  }

  db.close();
}

const filePath = process.argv[2];
const dryRun = !process.argv.includes('--apply');

if (!filePath) {
  console.log('사용:');
  console.log('  node scripts/v6.0/import_cost_items_xlsx.cjs <file.xlsx>           # dry-run');
  console.log('  node scripts/v6.0/import_cost_items_xlsx.cjs <file.xlsx> --apply  # 적용');
  process.exit(0);
}

if (require.main === module) run(filePath, dryRun);
module.exports = { run };
