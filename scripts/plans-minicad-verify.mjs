// 변환 문서 검증 — MiniCAD 가 읽을 수 있는 형태인지, 헌법(mm 정수)을 지키는지 확인한다.
// 커밋 전 필수: 좌표가 소수이거나 스키마가 다르면 MiniCAD 가 조용히 잘못 그린다.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'assets/plan-minicad';
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : (f.endsWith('.json') ? [p] : []);
});
const files = walk(ROOT);
let fail = 0, vec = 0, bgOnly = 0, wallCount = 0;
const err = (f, m) => { fail++; if (fail <= 8) console.error(`  ❌ ${f}: ${m}`); };

for (const f of files) {
  let d;
  try { d = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { err(f, 'JSON 파싱 실패'); continue; }
  if (!String(d.schema || '').startsWith('ECOREAN.FloorPlan')) { err(f, '스키마 아님'); continue; }
  if (!d.meta || !d.meta.background || !d.meta.background.url) { err(f, '배경 이미지 없음 — 원본은 항상 남아야 한다'); continue; }
  if (!/^https:\/\/gdcfqbdgubgpzusbtftf\.supabase\.co\/storage\//.test(d.meta.background.url)) { err(f, '배경 URL 이 자사 스토리지가 아님'); continue; }
  if (!Array.isArray(d.walls) || !Array.isArray(d.spaces)) { err(f, 'walls/spaces 배열 아님'); continue; }
  if (d.meta.verified) {
    vec++;
    // 축척 검증 통과 = 배경이 실제 치수로 깔린다는 뜻. 벽은 벡터 PDF 파서로만 넣으므로 0개여도 된다.
    if (!(d.meta.background.mm_per_px > 0)) { err(f, '배경 축척값 없음'); continue; }
  } else {
    bgOnly++;
    if (d.walls.length) { err(f, '미검증인데 벽 좌표가 들어감 — 틀린 치수를 내보내면 안 된다'); continue; }
  }
  // openings 검증 — mm 정수·타입·폭 범위 (openings 검증)
  for (const o of (d.openings || [])) {
    if (!['DOOR','WINDOW'].includes(o.type)) { err(f, '개구부 타입 이상 ' + o.type); break; }
    if (![o.x, o.y, o.width_mm].every(Number.isInteger)) { err(f, '개구부 mm 정수 위반'); break; }
    if (o.width_mm < 300 || o.width_mm > 4000) { err(f, '개구부 폭 이상 ' + o.width_mm); break; }
  }
  for (const w of d.walls) {
    if (![w.x1, w.y1, w.x2, w.y2, w.thickness].every(Number.isInteger)) { err(f, 'mm 정수 위반'); break; }
    if (w.x1 === w.x2 && w.y1 === w.y2) { err(f, '길이 0 벽'); break; }
    if (w.thickness < 50 || w.thickness > 600) { err(f, `벽 두께 이상 ${w.thickness}mm`); break; }
  }
  wallCount += d.walls.length;
}
console.log(`검증 대상 ${files.length}건 — 벡터 ${vec} · 배경만 ${bgOnly} · 벽 ${wallCount}개`);
console.log(fail ? `❌ 실패 ${fail}건` : '✅ 전건 통과');
process.exit(fail ? 1 : 0);
