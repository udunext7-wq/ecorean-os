#!/usr/bin/env node
// cost_items → Excel 출력 (대표님 검토용)

const path = require('path');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');

const DB_PATH   = path.join(__dirname, '..', '..', 'ecorean-boc.db');
const OUTPUT_DIR = path.join(__dirname, '..', '..');

function fmt(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

function run() {
  const db = new Database(DB_PATH);

  const items = db.prepare(`
    SELECT * FROM cost_items
    ORDER BY source, category, name
  `).all();

  if (items.length === 0) {
    console.error('[FAIL] cost_items 데이터 없음. 먼저 마이그레이션 + 시드 실행');
    process.exit(1);
  }

  const sheet1Data = items.map(i => ({
    'id (수정 금지)': i.id,
    'category': i.category,
    'subcategory': i.subcategory || '',
    'ks_code': i.ks_code || '',
    'name': i.name,
    'unit': i.unit,
    '현재 단가 (원)': i.unit_price,
    '대표님 단가 (수정시 입력)': '',
    '메모': i.notes || '',
    '승인 (Y/N)': i.is_approved_by_principal === 1 ? 'Y' : 'N',
    '출처': i.source,
    'AI 추정?': i.is_ai_estimated === 1 ? 'AI' : '',
    'updated_at': new Date(i.updated_at).toISOString().slice(0, 16).replace('T', ' ')
  }));

  const sheet2Data = [{
    'category': '',
    'subcategory': '',
    'ks_code': '',
    'name': '',
    'unit': '',
    'unit_price (원)': '',
    'applies_to_spaces (JSON)': '',
    'applies_to_concepts (JSON)': '',
    '메모': ''
  }];

  const sheet3Data = [
    { '항목': '검토 워크플로우', '설명': '시트 1에서 단가 검토 후 H열에 입력' },
    { '항목': '단가 수정', '설명': 'H열 (대표님 단가)에 새 단가 입력. 빈칸이면 G열 (현재 단가) 유지' },
    { '항목': '승인', '설명': 'J열 (승인) Y/N 변경. Y는 ML 학습 데이터로 사용됨' },
    { '항목': '신규 자재', '설명': '시트 2에 새 행으로 추가. category/name/unit/unit_price 필수' },
    { '항목': '임포트', '설명': 'node scripts/v6.0/import_cost_items_xlsx.cjs <파일경로> --apply' },
    { '항목': '주의', '설명': 'A열 (id) 절대 수정 금지. ML 학습 데이터 추적용' }
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);

  ws1['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 35 }, { wch: 6 }, { wch: 14 }, { wch: 14 },
    { wch: 25 }, { wch: 8 }, { wch: 16 }, { wch: 6 }, { wch: 16 }
  ];
  ws2['!cols'] = Array(9).fill({ wch: 18 });
  ws3['!cols'] = [{ wch: 16 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(wb, ws1, '검토용');
  XLSX.utils.book_append_sheet(wb, ws2, '신규자재');
  XLSX.utils.book_append_sheet(wb, ws3, '가이드');

  const filename = `cost_items_review_${fmt(new Date())}.xlsx`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  XLSX.writeFile(wb, outputPath);

  console.log('[PASS] Excel 출력 완료');
  console.log('  파일: ' + outputPath);
  console.log('  시트 1 (검토용): ' + sheet1Data.length + '건');
  console.log('  시트 2 (신규자재): 빈 템플릿');
  console.log('  시트 3 (가이드): ' + sheet3Data.length + '건');
  console.log('\n다음: node scripts/v6.0/import_cost_items_xlsx.cjs "' + filename + '" --apply');

  db.close();
}

if (require.main === module) run();
module.exports = { run };
