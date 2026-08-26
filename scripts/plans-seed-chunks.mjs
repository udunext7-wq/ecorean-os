// 대량 시드용 압축 SQL 청크 생성 — spec.json 의 자동수집(cx-a*)분을 VALUES 안티조인 INSERT 로 묶음
// (Supabase MCP 실행용. 100행/청크, image_path 안티조인이라 몇 번을 실행해도 멱등)
// 사용: node scripts/plans-seed-chunks.mjs  →  scripts/seed-chunks/chunk-NN.sql
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const rows = JSON.parse(readFileSync('scripts/plans-complexes-spec.json', 'utf8'))
  .filter(r => /\/cx-a[0-9a-z]/.test(r.image_path)); // 자동 수집분만 (표준·수기분은 기존 시드 완료)
const q = v => v === null || v === undefined || v === '' ? 'NULL'
  : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

mkdirSync('scripts/seed-chunks', { recursive: true });
const SIZE = 100;
let n = 0;
for (let i = 0; i < rows.length; i += SIZE) {
  const vals = rows.slice(i, i + SIZE).map(r =>
    `(${q(r.complex_name)},${q(r.region_sido)},${q(r.region_gugun)},${q(r.address)},${q(r.area_type)},${q(r.exclusive_area_m2)},${q(r.rooms)},${q(r.baths)},${q(r.image_path)},${q(r.lat)},${q(r.lng)})`
  ).join(',\n');
  const sql = `INSERT INTO floor_plans (complex_name,region_sido,region_gugun,address,area_type,exclusive_area_m2,rooms,baths,source,source_note,image_path,lat,lng)
SELECT v.c1,v.c2,v.c3,v.c4,v.c5,v.c6,v.c7,v.c8,'minicad','실단지 개략 재작도 (참고용·실측 아님)',v.c9,v.c10,v.c11
FROM (VALUES
${vals}
) AS v(c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11)
LEFT JOIN floor_plans f ON f.image_path = v.c9
WHERE f.id IS NULL;
`;
  writeFileSync(`scripts/seed-chunks/chunk-${String(++n).padStart(2, '0')}.sql`, sql);
}
console.log(`✅ ${rows.length}행 → 청크 ${n}개 (scripts/seed-chunks/)`);
