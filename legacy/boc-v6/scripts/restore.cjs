#!/usr/bin/env node
// ECOREAN BOC v5.6 — 백업 복구
// 사용: node scripts/restore.cjs <backup-filename>

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ecorean-boc.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('백업 폴더 없음');
    return [];
  }
  return fs.readdirSync(BACKUP_DIR)
    .filter(function(f) { return f.startsWith('ecorean-boc.db.bak.'); })
    .sort()
    .reverse();
}

function restore(filename) {
  if (!filename) {
    console.log('사용: node scripts/restore.cjs <backup-filename>');
    console.log('\n사용 가능한 백업:');
    listBackups().slice(0, 10).forEach(function(f) {
      console.log('  ' + f);
    });
    process.exit(1);
  }

  const src = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(src)) {
    console.error('[FAIL] 백업 파일 없음: ' + filename);
    process.exit(1);
  }

  if (fs.existsSync(DB_PATH)) {
    const safeBak = DB_PATH + '.before-restore';
    fs.copyFileSync(DB_PATH, safeBak);
    console.log('  현재 DB 안전 백업: ' + path.basename(safeBak));
  }

  fs.copyFileSync(src, DB_PATH);
  console.log('[PASS] 복구 완료');
  console.log('  소스: ' + filename);
}

if (require.main === module) {
  restore(process.argv[2]);
}

module.exports = { restore: restore, listBackups: listBackups };
