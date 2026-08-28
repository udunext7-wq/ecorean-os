// 분양 실도면 → Supabase Storage 업로드 + floor_plans 시드
// 2026-08-28 대표 지시: "가짜도면은 필요없다 무조건 실제와 똑같은 도면이어야한다"
//
// 원본 이미지는 공개 GitHub 저장소에 두지 않는다(재배포 금지). Storage 버킷 floor-plans 에만 올리고
// 직원 전용 카탈로그(/catalog/plans/)에서 불러 쓴다.
//
// 필요: .env 의 SUPABASE_SERVICE_ROLE_KEY (Storage 업로드·RLS 우회에 필요)
// 사용: node scripts/plans-lttot-upload.mjs [--dry] [--limit N] [--only <slug>]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REF = 'gdcfqbdgubgpzusbtftf';
const BUCKET = 'floor-plans';
const PREFIX = 'lttot';
const STAGING = 'assets/plan-staging';

const KEY = (() => {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  for (const f of ['.env', '.env.local']) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, 'utf8').match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
})();

const ARG = process.argv.slice(2);
const DRY = ARG.includes('--dry');
const LIMIT = ARG.includes('--limit') ? +ARG[ARG.indexOf('--limit') + 1] : Infinity;
const ONLY = ARG.includes('--only') ? ARG[ARG.indexOf('--only') + 1] : null;

if (!KEY && !DRY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 없음 — .env 에 추가하세요');
  console.error('   Supabase 대시보드 → Project Settings → API → service_role (secret)');
  console.error('   키 없이 확인만 하려면: node scripts/plans-lttot-upload.mjs --dry');
  process.exit(1);
}

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'))
  .filter(r => !ONLY || r.slug === ONLY)
  .slice(0, LIMIT === Infinity ? undefined : LIMIT);

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const api = (p, o = {}) => fetch(`https://${REF}.supabase.co/rest/v1${p}`, {
  ...o, headers: { ...H, 'Content-Type': 'application/json', ...(o.headers || {}) },
});

// source_note — 출처를 행에 남긴다. 원본이 어느 건설사 어느 페이지에서 온 것인지 추적 가능해야 한다.
function note(r) {
  return [
    '건설사 분양홈페이지 공개 평면도 원본',
    r.builder ? `시공: ${r.builder}` : null,
    r.pblanc_de ? `공고 ${r.pblanc_de}` : null,
    r.src_url || r.homepage,
    r.match_confidence === 'order' ? '※ 주택형 순번 대응 — 면적 검수 필요' : null,
  ].filter(Boolean).join(' · ');
}

let up = 0, ins = 0, fail = 0;
for (const r of rows) {
  const path = `${PREFIX}/${r.out}`;
  if (DRY) { console.log(`[dry] ${path}  ${r.complex_name} ${r.area_type || ''} ${r.exclusive_area_m2 ?? ''}`); continue; }

  const body = readFileSync(join(STAGING, r.out));
  const url = `https://${REF}.supabase.co/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { method: 'POST', headers: { ...H, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body });
  if (!res.ok) { console.error(`  ⚠ 업로드 실패 ${path}: ${res.status} ${(await res.text()).slice(0, 120)}`); fail++; continue; }
  up++;

  // image_path 중복 가드 — 재실행해도 행이 늘지 않는다
  const dup = await (await api(`/floor_plans?select=id&image_path=eq.${encodeURIComponent(path)}`)).json();
  if (dup.length) continue;
  const ir = await api('/floor_plans', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      complex_name: r.complex_name, address: r.address,
      region_sido: r.region_sido, region_gugun: r.region_gugun,
      area_type: r.area_type, exclusive_area_m2: r.exclusive_area_m2,
      source: 'public', source_note: note(r), image_path: path,
    }),
  });
  if (!ir.ok) { console.error(`  ⚠ 시드 실패 ${path}: ${ir.status} ${(await ir.text()).slice(0, 120)}`); fail++; continue; }
  ins++;
  if ((up % 25) === 0) console.log(`  … ${up}/${rows.length}`);
}
console.log(DRY ? `[dry] 대상 ${rows.length}건` : `✅ 업로드 ${up} · 신규 행 ${ins} · 실패 ${fail}`);
