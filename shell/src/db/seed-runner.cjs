'use strict';

const fs = require('fs');
const path = require('path');

const COST_ITEMS_MIN = 159; // 헌법 최소 요구량 (cost_items + ontology_rules + brands 합산)

function runSeeds(db, seedsDir) {
  if (!fs.existsSync(seedsDir)) {
    console.log('[Seed] 폴더 없음:', seedsDir);
    return { loaded: 0 };
  }

  // v6.0/ 하위 폴더의 .sql, .cjs 파일 알파벳순 실행
  const files = [];
  for (const sub of ['v6.0']) {
    const subDir = path.join(seedsDir, sub);
    if (fs.existsSync(subDir)) {
      fs.readdirSync(subDir)
        .filter(f => f.endsWith('.sql') || f.endsWith('.cjs'))
        .sort()
        .forEach(f => files.push({ sub, file: f }));
    }
  }

  let loadedCount = 0;

  const transaction = db.transaction(() => {
    for (const { sub, file } of files) {
      const filePath = path.join(seedsDir, sub, file);

      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log('[Seed] SQL 적재:', file);
        db.exec(sql);
        loadedCount++;
      } else if (file.endsWith('.cjs')) {
        // .cjs 시드 파일은 run(db) 함수를 export 하거나 직접 실행
        // supplement_seed.cjs 처럼 process.argv 기반이면 건너뜀 (직접 실행 방식)
        try {
          delete require.cache[require.resolve(filePath)];
          const mod = require(filePath);
          if (typeof mod.run === 'function') {
            // DB path 직접 사용하지 않고 db 인스턴스를 받는 방식 지원
            console.log('[Seed] CJS 적재:', file);
            // supplement_seed.cjs 는 BOC_DB_PATH 환경 기반이므로 직접 run() 호출
            // 향후 시드는 module.exports = (db) => {...} 형태 권장
            mod.run(db);
            loadedCount++;
          }
        } catch (e) {
          console.warn('[Seed] 스킵 (오류):', file, '-', e.message.substring(0, 60));
        }
      }
    }
  });

  try {
    transaction();
  } catch (e) {
    console.warn('[Seed] 트랜잭션 오류:', e.message.substring(0, 80));
  }

  // 헌법 검증 (테이블별 합산)
  let grandTotal = 0;
  const counts = {};
  for (const tbl of ['cost_items', 'ontology_rules', 'brands']) {
    try {
      const r = db.prepare(`SELECT COUNT(*) as n FROM ${tbl}`).get();
      counts[tbl] = r.n;
      grandTotal += r.n;
    } catch {
      counts[tbl] = 0;
    }
  }

  console.log('[Seed] cost_items:', counts.cost_items, '/ ontology_rules:', counts.ontology_rules, '/ brands:', counts.brands, '/ 합계:', grandTotal);

  if (grandTotal < COST_ITEMS_MIN) {
    console.warn(`[Seed] ⚠️  헌법 미달: ${grandTotal}건 (목표 ${COST_ITEMS_MIN}건)`);
  } else {
    console.log(`[Seed] ✅ 헌법 충족: ${grandTotal}건`);
  }

  return { loaded: loadedCount, counts, grandTotal };
}

module.exports = { runSeeds };
