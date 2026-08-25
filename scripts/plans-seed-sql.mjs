// 평면도 라이브러리 DB 시드 SQL 생성 — plans-complexes-spec.json → scripts/plans-seed.sql
// image_path 중복 가드(WHERE NOT EXISTS) 포함 멱등 INSERT. 실행은 Supabase(BOC)에서.
// 사용: node scripts/plans-seed-sql.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('scripts/plans-complexes-spec.json', 'utf8'));
const q = v => v === null || v === undefined || v === '' ? 'NULL'
  : typeof v === 'number' ? String(v)
  : `'${String(v).replace(/'/g, "''")}'`;

const NOTE = '실단지 개략 재작도 (참고용·실측 아님)';
const stmts = rows.map(r => `INSERT INTO floor_plans (complex_name, region_sido, region_gugun, address, area_type, exclusive_area_m2, rooms, baths, source, source_note, image_path, lat, lng)
SELECT ${q(r.complex_name)}, ${q(r.region_sido)}, ${q(r.region_gugun)}, ${q(r.address)}, ${q(r.area_type)}, ${q(r.exclusive_area_m2)}, ${q(r.rooms)}, ${q(r.baths)}, 'minicad', ${q(NOTE)}, ${q(r.image_path)}, ${q(r.lat)}, ${q(r.lng)}
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path = ${q(r.image_path)});`);

writeFileSync('scripts/plans-seed.sql', stmts.join('\n') + '\n');
console.log(`✅ ${rows.length}건 → scripts/plans-seed.sql (image_path 중복 가드 · 멱등)`);
