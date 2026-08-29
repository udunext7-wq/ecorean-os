// 수집 실도면 전량 → MiniCAD 도면 JSON 일괄 변환
// 사용: node scripts/plans-minicad-batch.mjs [--limit N]
// 출력: assets/plan-minicad/<공고번호>/<코드>.json + scripts/lttot-minicad.json(요약)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { convert, toMiniCadDoc } from './plans-to-minicad.mjs';

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const ARG = process.argv.slice(2);
const LIMIT = ARG.includes('--limit') ? +ARG[ARG.indexOf('--limit') + 1] : Infinity;
const OUT = 'assets/plan-minicad';

const summary = [];
let done = 0, vec = 0, bgOnly = 0, fail = 0;
for (const r of rows) {
  if (done >= LIMIT) break;
  done++;
  let res;
  try {
    res = await convert(join('assets/plan-staging', r.out), { exclusive_area_m2: r.exclusive_area_m2 });
  } catch (e) { res = { ok: false, reason: e.message }; }
  if (!res.ok) { fail++; summary.push({ store_path: r.store_path, ok: false, reason: res.reason }); continue; }
  const doc = toMiniCadDoc(res, r);
  const rel = r.store_path.replace(/\.webp$/, '.json');
  const abs = join(OUT, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(doc));
  res.verified ? vec++ : bgOnly++;
  summary.push({
    store_path: r.store_path, json: rel, ok: true, verified: res.verified,
    walls: res.walls.length, spaces: res.spaces.length, spaceFound: res.spaceFound,
    mm_per_px: res.mm_per_px, thickMm: res.thickMm, warn: res.warn,
  });
  if (done % 40 === 0) console.log(`  … ${done}/${rows.length} (벡터 ${vec} · 배경만 ${bgOnly})`);
}
writeFileSync('scripts/lttot-minicad.json', JSON.stringify(summary, null, 1));
const wSum = summary.filter(s => s.ok).reduce((a, s) => a + s.walls, 0);
const spOk = summary.filter(s => s.ok && s.spaces > 0).length;
console.log(`✅ ${done}장 처리 — 벡터 ${vec} · 배경만 ${bgOnly} · 실패 ${fail}`);
console.log(`   벽 ${wSum}개 · 공간까지 채택 ${spOk}장 → ${OUT}/ · scripts/lttot-minicad.json`);
