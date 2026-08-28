// 청약홈 주택형(모델) 정보 수집 — 분양 평면도에 붙일 정확한 전용면적·타입 메타데이터
// 2026-08-28 대표 지시: "가짜도면은 필요없다 무조건 실제와 똑같은 도면이어야한다"
//
// 수집한 평면도 이미지(assets/plan-sources)는 파일명에 평형·타입만 있고 정확한 전용면적이 없다.
// 청약홈 getAPTLttotPblancMdl 의 HOUSE_TY("060.9495A")가 전용면적 소수 4자리 + 타입코드를 준다.
// 사용: node scripts/plans-lttot-models.mjs [--force]
// 출력: scripts/lttot-models.json  { [house_manage_no]: [{model_no, house_ty, area, letter, supply_ar, hshld}] }
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = (() => {
  if (process.env.DATA_GO_KR_KEY) return process.env.DATA_GO_KR_KEY;
  for (const f of ['.env', '.env.local']) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, 'utf8').match(/^DATA_GO_KR_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
})();
if (!KEY) { console.error('❌ DATA_GO_KR_KEY 없음 (.env)'); process.exit(1); }

const FORCE = process.argv.includes('--force');
const OUT = 'scripts/lttot-models.json';
const UA = { 'User-Agent': 'ecorean-plans/1.0 (+https://ecorean.net)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// HOUSE_TY "060.9495A" → { area: 60.9495, letter: 'A' } / "084.9700" → { area: 84.97, letter: '' }
export function parseHouseTy(ty) {
  const m = String(ty || '').trim().match(/^(\d+(?:\.\d+)?)\s*([A-Za-z가-힣]*)$/);
  if (!m) return null;
  return { area: parseFloat(m[1]), letter: m[2].toUpperCase() };
}

const manifest = JSON.parse(readFileSync('scripts/lttot-manifest.json', 'utf8'));
const cache = !FORCE && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const todo = manifest.filter(c => !cache[c.house_manage_no]);
console.log(`📐 주택형 조회 — 단지 ${manifest.length}곳 중 ${todo.length}곳 신규`);

let ok = 0, empty = 0;
for (const c of todo) {
  const cond = encodeURIComponent('cond[HOUSE_MANAGE_NO::EQ]');
  const url = `https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl`
    + `?page=1&perPage=50&${cond}=${c.house_manage_no}&serviceKey=${encodeURIComponent(KEY)}`;
  let rows = [];
  try {
    const j = await (await fetch(url, { headers: UA })).json();
    // cond 가 무시되는 경우가 있어 응답을 한 번 더 걸러낸다 (다른 단지 모델이 섞이면 면적이 통째로 틀어진다)
    rows = (j.data || []).filter(r => String(r.HOUSE_MANAGE_NO) === String(c.house_manage_no));
  } catch (e) { console.warn(`  ⚠ ${c.name}: ${e.message}`); }
  const models = rows.map(r => {
    const p = parseHouseTy(r.HOUSE_TY);
    return p && {
      model_no: String(r.MODEL_NO || '').trim(),
      house_ty: r.HOUSE_TY,
      area: p.area, letter: p.letter,
      supply_ar: parseFloat(r.SUPLY_AR) || null,
      hshld: Number(r.SUPLY_HSHLDCO) || null,
    };
  }).filter(Boolean).sort((a, b) => a.model_no.localeCompare(b.model_no));
  cache[c.house_manage_no] = models;
  models.length ? ok++ : empty++;
  await sleep(200);
}
writeFileSync(OUT, JSON.stringify(cache, null, 1));
const total = Object.values(cache).reduce((s, m) => s + m.length, 0);
console.log(`✅ ${OUT} — 단지 ${Object.keys(cache).length}곳 · 주택형 ${total}개 (신규 성공 ${ok} / 빈 응답 ${empty})`);
