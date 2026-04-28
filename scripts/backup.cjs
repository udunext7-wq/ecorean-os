#!/usr/bin/env node
// ECOREAN BOC v5.6 — 자동 백업
// 사용: node scripts/backup.cjs [--label "설명"]

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'ecorean-boc.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function timestamp() {
  const d = new Date();
  return d.getFullYear()
    + pad(d.getMonth() + 1)
    + pad(d.getDate())
    + '-'
    + pad(d.getHours())
    + pad(d.getMinutes())
    + pad(d.getSeconds());
}

function getLabel() {
  const idx = process.argv.indexOf('--label');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1].replace(/[^a-zA-Z0-9_-]/g, '_');
  return 'auto';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backup() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('[FAIL] DB 파일 없음: ' + DB_PATH);
    process.exit(1);
  }
  ensureDir(BACKUP_DIR);
  const label = getLabel();
  const filename = 'ecorean-boc.db.bak.' + timestamp() + '-' + label;
  const dest = path.join(BACKUP_DIR, filename);
  fs.copyFileSync(DB_PATH, dest);

  const stat = fs.statSync(dest);
  console.log('[PASS] 백업 완료');
  console.log('  파일: backups/' + filename);
  console.log('  크기: ' + (stat.size / 1024).toFixed(1) + ' KB');
  return dest;
}

function pruneOldBackups(retentionDays) {
  const days = retentionDays || 30;
  if (!fs.existsSync(BACKUP_DIR)) return 0;

  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(BACKUP_DIR);
  let pruned = 0;
  files.forEach(function(f) {
    if (!f.startsWith('ecorean-boc.db.bak.')) return;
    const fp = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(fp);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(fp);
      pruned++;
    }
  });
  if (pruned > 0) console.log('  정리: ' + pruned + '건 (>' + days + '일)');
  return pruned;
}

if (require.main === module) {
  backup();
  pruneOldBackups(30);
}

module.exports = { backup: backup, pruneOldBackups: pruneOldBackups };
