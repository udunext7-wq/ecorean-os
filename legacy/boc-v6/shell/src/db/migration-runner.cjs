'use strict';

const fs = require('fs');
const path = require('path');

function runMigrations(db, migrationsDir) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const applied = new Set(
    db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
  );

  if (!fs.existsSync(migrationsDir)) {
    console.log('[Migration] 폴더 없음:', migrationsDir);
    return { applied: 0, skipped: 0 };
  }

  // v5.6/ 과 v6.0/ 하위 폴더 포함, _up.sql 파일만 알파벳순 정렬
  const files = [];
  for (const sub of ['v5.6', 'v6.0']) {
    const subDir = path.join(migrationsDir, sub);
    if (fs.existsSync(subDir)) {
      fs.readdirSync(subDir)
        .filter(f => f.endsWith('_up.sql'))
        .sort()
        .forEach(f => files.push(path.join(sub, f)));
    }
  }

  let appliedCount = 0;
  let skippedCount = 0;

  const transaction = db.transaction(() => {
    for (const file of files) {
      if (applied.has(file)) {
        skippedCount++;
        continue;
      }

      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      console.log('[Migration] 적용:', file);
      db.exec(sql);

      db.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)')
        .run(file, Date.now());

      appliedCount++;
    }
  });

  transaction();
  return { applied: appliedCount, skipped: skippedCount };
}

module.exports = { runMigrations };
