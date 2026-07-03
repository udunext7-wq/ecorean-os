#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH  = path.join(__dirname, '..', '..', 'ecorean-boc.db');
const UP_SQL   = path.join(__dirname, '..', '..', 'db', 'migrations', 'v6.0', '004_cost_items_up.sql');
const DOWN_SQL = path.join(__dirname, '..', '..', 'db', 'migrations', 'v6.0', '004_cost_items_down.sql');

const cmd = process.argv[2] || 'up';
const sqlFile = cmd === 'down' ? DOWN_SQL : UP_SQL;

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(sqlFile, 'utf-8'));

if (cmd === 'up') {
  const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cost_items'").get();
  if (!r) { console.error('[FAIL] cost_items 미생성'); process.exit(1); }
  const c = db.prepare("SELECT COUNT(*) as c FROM cost_items").get();
  console.log('[PASS] cost_items 테이블 생성 (' + c.c + ' rows)');
}
if (cmd === 'down') {
  const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cost_items'").get();
  if (r) { console.error('[FAIL] cost_items 미삭제'); process.exit(1); }
  console.log('[PASS] cost_items 테이블 삭제');
}
db.close();
