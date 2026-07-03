#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH  = path.join(__dirname, '..', 'ecorean-boc.db');
const UP_SQL   = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '001_drawings_up.sql');
const DOWN_SQL = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '001_drawings_down.sql');

const cmd = process.argv[2] || 'up';
const sqlFile = cmd === 'down' ? DOWN_SQL : UP_SQL;

const db = new Database(DB_PATH);
const sql = fs.readFileSync(sqlFile, 'utf-8');
db.exec(sql);

const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drawings'").get();
if (cmd === 'up') {
  if (!row) { console.error('[FAIL] drawings 테이블 미생성'); process.exit(1); }
  console.log('[PASS] drawings 테이블 생성');
  const cnt = db.prepare('SELECT COUNT(*) as c FROM drawings').get();
  console.log('  현재 rows: ' + cnt.c);
} else {
  if (row) { console.error('[FAIL] drawings 테이블 미삭제'); process.exit(1); }
  console.log('[PASS] drawings 테이블 삭제');
}
db.close();
