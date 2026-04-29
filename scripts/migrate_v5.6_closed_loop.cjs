#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH  = path.join(__dirname, '..', 'ecorean-boc.db');
const UP_SQL   = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '003_closed_loop_up.sql');
const DOWN_SQL = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '003_closed_loop_down.sql');

const cmd = process.argv[2] || 'up';
const sqlFile = cmd === 'down' ? DOWN_SQL : UP_SQL;

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(sqlFile, 'utf-8'));

const tables = ['contracts','purchase_orders','schedules','inspections'];
if (cmd === 'up') {
  tables.forEach(function(t) {
    const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
    if (!r) { console.error('[FAIL] ' + t + ' 미생성'); process.exit(1); }
  });
  console.log('[PASS] 4 테이블 생성 완료');
  tables.forEach(function(t) {
    const c = db.prepare("SELECT COUNT(*) as c FROM " + t).get();
    console.log('  ' + t + ': ' + c.c + ' rows');
  });
} else {
  tables.forEach(function(t) {
    const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
    if (r) { console.error('[FAIL] ' + t + ' 미삭제'); process.exit(1); }
  });
  console.log('[PASS] 4 테이블 삭제 완료');
}
db.close();
