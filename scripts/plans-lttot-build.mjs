// 분양 실도면 → 라이브러리 적재본 생성 (이미지 정규화 + 메타데이터 매칭)
// 2026-08-28 대표 지시: "가짜도면은 필요없다 무조건 실제와 똑같은 도면이어야한다"
//
// 입력: assets/plan-sources/<slug>/*.jpg  (건설사 분양홈페이지 원본, plans-collect-lttot.mjs 수집)
//       scripts/lttot-manifest.json       (단지명·주소·시공사·출처 URL)
//       scripts/lttot-models.json         (청약홈 주택형 — 전용면적 소수 4자리. 없으면 면적 NULL)
// 출력: assets/plan-staging/<slug>/<code>.webp  (최대 1600px webp — 원본 그대로, 재작도 아님)
//       scripts/lttot-plans.json                (업로드·시드용 행 목록)
// 사용: node scripts/plans-lttot-build.mjs [--limit N]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'assets/plan-sources';
const OUT_DIR = 'assets/plan-staging';
const OUT_JSON = 'scripts/lttot-plans.json';
const MAX_W = 1600, QUALITY = 82;

const ARG = process.argv.slice(2);
const LIMIT = ARG.includes('--limit') ? +ARG[ARG.indexOf('--limit') + 1] : Infinity;

const SIDO_SHORT = { '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원특별자치도':'강원','강원도':'강원','충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','전라북도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주' };

// "경상남도 창원시 마산회원구 회원동 480-31번지" → { sido:'경남', gugun:'창원시 마산회원구' }
function parseRegion(addr) {
  const t = String(addr || '').trim().split(/\s+/);
  const sido = SIDO_SHORT[t[0]] || null;
  let gugun = t[1] || null;
  if (/시$/.test(t[1] || '') && /구$/.test(t[2] || '')) gugun = `${t[1]} ${t[2]}`; // 창원시 마산회원구 등 일반시 하위 구
  return { sido, gugun };
}

// 파일명 → 평형·타입. 건설사가 붙인 이름 그대로만 읽고, 없는 값은 만들어내지 않는다.
//   unit_60a.jpg → {py:60, letter:'A'}   84B.jpg → {py:84, letter:'B'}   153.jpg → {py:153}
//   unit01.jpg   → {seq:1}  (평형 정보 없음 — 주택형 순번으로만 대응)
function parseFileName(file) {
  const base = file.replace(/\.[a-z]+$/i, '').toLowerCase();
  const rest = base.replace(/^(unit|plan|pyeong|pyung|hotype|type)[-_ ]?/, '');
  const m = rest.match(/^(\d{1,3})\s*([a-z]?)$/);
  if (!m) return { raw: base };
  const n = +m[1];
  const seqLike = /^0\d$/.test(m[1]) || n < 16;          // 01·02… 는 평형이 아니라 순번
  if (seqLike && !m[2]) return { seq: n, raw: base };
  return { py: n, letter: (m[2] || '').toUpperCase(), raw: base };
}

const manifest = JSON.parse(readFileSync('scripts/lttot-manifest.json', 'utf8'));
const models = existsSync('scripts/lttot-models.json') ? JSON.parse(readFileSync('scripts/lttot-models.json', 'utf8')) : {};

const rows = [];
let done = 0, skipped = 0;
for (const c of manifest) {
  const dir = join(SRC, c.slug);
  if (!existsSync(dir)) { skipped++; continue; }
  const files = readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
  if (!files.length) { skipped++; continue; }
  const { sido, gugun } = parseRegion(c.address);
  const mdl = models[c.house_manage_no] || [];
  mkdirSync(join(OUT_DIR, c.slug), { recursive: true });

  for (const f of files) {
    if (done >= LIMIT) break;
    const p = parseFileName(f);
    // 주택형 매칭 — 평형+타입이 파일명에 있으면 정확 매칭, 순번뿐이면 MODEL_NO 순서 대응
    let match = null, confidence = 'none';
    if (p.py != null) {
      const cand = mdl.filter(m => Math.floor(m.area) === p.py || Math.round(m.area) === p.py);
      match = (p.letter && cand.find(m => m.letter === p.letter)) || (cand.length === 1 ? cand[0] : null);
      if (match) confidence = p.letter && match.letter === p.letter ? 'exact' : 'area';
    } else if (p.seq != null && mdl.length) {
      match = mdl[p.seq - 1] || null;
      if (match) confidence = 'order';                    // 순번 대응은 검수 대상
    }

    const code = p.raw.replace(/[^a-z0-9]+/g, '-');
    const outRel = `${c.slug}/${code}.webp`;
    const outAbs = join(OUT_DIR, outRel);
    const meta = await sharp(join(dir, f))
      .resize({ width: MAX_W, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outAbs);

    rows.push({
      slug: c.slug, file: f, out: outRel,
      complex_name: c.name, address: c.address, region_sido: sido, region_gugun: gugun,
      area_type: p.letter ? `${p.py}${p.letter}` : (p.py != null ? String(p.py) : (match ? match.house_ty : null)),
      exclusive_area_m2: match ? match.area : null,       // 청약홈 실측치만. 추정값을 넣지 않는다
      supply_area_m2: match ? match.supply_ar : null,
      match_confidence: confidence,
      builder: c.builder, homepage: c.homepage, pblanc_url: c.pblanc_url, pblanc_de: c.pblanc_de,
      src_url: (c.images.find(i => i.file === f) || {}).url || null,
      width: meta.width, height: meta.height, kb: Math.round(meta.size / 1024),
    });
    done++;
  }
}
writeFileSync(OUT_JSON, JSON.stringify(rows, null, 1));
const byConf = rows.reduce((a, r) => (a[r.match_confidence] = (a[r.match_confidence] || 0) + 1, a), {});
const kb = rows.reduce((s, r) => s + r.kb, 0);
console.log(`✅ ${rows.length}장 정규화 → ${OUT_DIR}/ (${(kb / 1024).toFixed(0)}MB, 원본 대비 압축)`);
console.log(`   단지 ${new Set(rows.map(r => r.slug)).size}곳 · 이미지 없는 단지 ${skipped}곳`);
console.log(`   주택형 매칭: ${JSON.stringify(byConf)}`);
console.log(`   → ${OUT_JSON}`);
