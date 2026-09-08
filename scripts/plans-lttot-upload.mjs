// 분양 실도면 → Supabase Storage 업로드 + floor_plans 시드 (Edge Fn plans-ingest 경유)
// 2026-08-28 대표 지시: "가짜도면은 필요없다 무조건 실제와 똑같은 도면이어야한다"
// 2026-09-09 개편: service_role 키를 로컬에 두지 않는다 — 열려 있는 동안만 동작하는
//   plans-ingest Edge Fn(x-ingest-token 게이트)으로 적재하고, 끝나면 함수를 410 으로 닫는다.
//
// 원본 이미지는 공개 GitHub 저장소에 두지 않는다(재배포 금지). Storage 버킷 floor-plans 에만.
// Storage 키는 ASCII 만 — 경로는 lttot/<공고번호>/<파일>.webp (store_path).
// 정크 판정(lttot-junk.json plan:false)은 적재하지 않는다.
//
// 필요: TOKEN_FILE 환경변수(적재 토큰 파일 경로)
// 사용: TOKEN_FILE=... node scripts/plans-lttot-upload.mjs [--dry] [--limit N] [--only <slug>]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY2ZxYmRndWJncHp1c2J0ZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODYzNjUsImV4cCI6MjA5Nzk2MjM2NX0.-AnRCk6rYwYCgQk-N82zmeBjpeuAnupHLtVZy6OUHrI';
const EP = 'https://gdcfqbdgubgpzusbtftf.supabase.co/functions/v1/plans-ingest';
const PREFIX = 'lttot';
const STAGING = 'assets/plan-staging';
const PROG = 'scripts/lttot-upload-done.json'; // 재실행 이어달리기 (10분 단위로 끊길 수 있다)

const ARG = process.argv.slice(2);
const DRY = ARG.includes('--dry');
const LIMIT = ARG.includes('--limit') ? +ARG[ARG.indexOf('--limit') + 1] : Infinity;
const ONLY = ARG.includes('--only') ? ARG[ARG.indexOf('--only') + 1] : null;
const TOKEN = DRY ? '' : readFileSync(process.env.TOKEN_FILE, 'utf8').trim();

const junk = existsSync('scripts/lttot-junk.json')
  ? new Set(JSON.parse(readFileSync('scripts/lttot-junk.json', 'utf8')).filter(o => !o.plan).map(o => o.store_path))
  : new Set();
const geo = existsSync('scripts/lttot-geo.json') ? JSON.parse(readFileSync('scripts/lttot-geo.json', 'utf8')) : {};
const prog = existsSync(PROG) ? new Set(JSON.parse(readFileSync(PROG, 'utf8'))) : new Set();

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'))
  .filter(r => (!ONLY || r.slug === ONLY) && !junk.has(r.store_path));

// source_note — 출처를 행에 남긴다. 원본이 어느 건설사 어느 페이지에서 온 것인지 추적 가능해야 한다.
function note(r) {
  return [
    '건설사 분양홈페이지 공개 평면도 원본',
    r.builder ? `시공: ${r.builder}` : null,
    r.pblanc_de ? `공고 ${r.pblanc_de}` : null,
    r.src_url || r.homepage,
    /order/.test(r.match_confidence || '') ? '※ 주택형 순번 대응 — 면적 검수 필요' : null,
  ].filter(Boolean).join(' · ');
}

async function post(body) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(EP, { method: 'POST', headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'x-ingest-token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const txt = await r.text();
      if (r.ok) return { ok: true, txt };
      if (t === 2) return { ok: false, txt: r.status + ' ' + txt.slice(0, 120) };
    } catch (e) { if (t === 2) return { ok: false, txt: e.message }; }
    await new Promise(s => setTimeout(s, 700 * (t + 1)));
  }
}

let up = 0, ins = 0, fail = 0, skip = 0, n = 0;
for (const r of rows) {
  if (n >= LIMIT) break;
  const path = `${PREFIX}/${r.store_path}`;
  if (prog.has(path)) { skip++; continue; }
  if (DRY) { console.log(`[dry] ${path}  ${r.complex_name} ${r.area_type || ''} ${r.exclusive_area_m2 ?? ''}`); n++; continue; }
  n++;
  const g = geo[r.slug] || {};
  const meta = {
    complex_name: r.complex_name, address: r.address,
    region_sido: r.region_sido, region_gugun: r.region_gugun,
    area_type: r.area_type, exclusive_area_m2: r.exclusive_area_m2,
    source: 'public', source_note: note(r),
    lat: g.lat ?? null, lng: g.lng ?? null,
  };
  const b64 = readFileSync(join(STAGING, r.out)).toString('base64');
  const res = await post({ path, b64, meta });
  if (!res.ok) { console.error(`  ⚠ 실패 ${path}: ${res.txt}`); fail++; continue; }
  up++;
  try { if (JSON.parse(res.txt).inserted) ins++; } catch { }
  prog.add(path);
  if (up % 20 === 0) { writeFileSync(PROG, JSON.stringify([...prog])); console.log(`  … ${up}/${rows.length - skip}`); }
}
writeFileSync(PROG, JSON.stringify([...prog]));
console.log(DRY ? `[dry] 대상 ${n}건 (정크 제외 후 ${rows.length})` : `✅ 업로드 ${up} · 신규 행 ${ins} · 실패 ${fail} · 기업로드 스킵 ${skip}`);
