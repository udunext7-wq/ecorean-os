// ECOREAN OS — 타일 카탈로그(벤더 실 SKU 2,550건) → Supabase 시드 SQL 생성기
// 원천: C:\Users\udune\projects\ecorean-tile-catalog\index.html 의 TILE_CATALOG 리터럴
//       (지금까지 1MB HTML 한 줄 + 브라우저 localStorage 에만 존재하던 데이터)
// 원칙: 원본 index.html은 읽기 전용. 단가 추정 금지 — 무단가 항목은 unit_price=null / NEEDS_RESEARCH.
// 실행: node supabase/seeds/etl/generate-tile-seeds.mjs [경로]
// 출력: supabase/seeds/tile/seed_tile_NN.sql (멱등 upsert, 청크 분할) + 콘솔 파싱 리포트

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SRC = process.argv[2] || 'C:\\Users\\udune\\projects\\ecorean-tile-catalog\\index.html';
const OUT = join(ROOT, 'supabase', 'seeds', 'tile');
mkdirSync(OUT, { recursive: true });

const buf = readFileSync(SRC);
const sha256 = createHash('sha256').update(buf).digest('hex');
const html = buf.toString('utf8');

const m = html.match(/(?:var|const|let)\s+TILE_CATALOG\s*=\s*(\[[\s\S]*?\]);/);
if (!m) { console.error('TILE_CATALOG 리터럴을 찾지 못했습니다.'); process.exit(1); }
const catalog = JSON.parse(m[1]);
const items = catalog.flatMap(c => c.items || []);

// ── SQL 리터럴 헬퍼 ──
const S = v => (v == null || v === '') ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const N = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 'null' : String(Number(v));
const I = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 'null' : String(Math.round(Number(v)));
const JB = o => `${S(JSON.stringify(o))}::jsonb`;

// ── spec 파싱 ──
// 예: "600X1200X12T · 수입 · 에코스톤 · 이태리 · BOX/들이(2)/1.44㎡/36.4KG · 재고: 여주(27) 대자동(25)"
const RE_SIZE  = /(\d+)\s*[Xx*]\s*(\d+)(?:\s*[Xx*]\s*([\d.]+)\s*T)?/;
const RE_BOX   = /BOX\/들이\((\d+(?:\.\d+)?)\)\/([\d.]+)㎡\/([\d.]+)KG/i;
const RE_STOCK = /재고:\s*(.+)$/;
const RE_IMG   = /^https:\/\/usongtile\.netlify\.app\/images\/(?:thumb|original)\/portal_(\d+)\.jpg$/;

const stat = { size: 0, box: 0, stock: 0, portal: 0, noPrice: 0 };

const rows = items.map(it => {
  const spec = it.spec || '';
  const mSize = spec.match(RE_SIZE);
  const mBox = spec.match(RE_BOX);
  const mStock = spec.match(RE_STOCK);
  const mImg = (it.img || '').match(RE_IMG);

  if (mSize) stat.size++;
  if (mBox) stat.box++;
  if (mStock) stat.stock++;
  if (mImg) stat.portal++;

  const stock = {};
  if (mStock) for (const g of mStock[1].matchAll(/([가-힣A-Za-z]+)\((\d+)\)/g)) stock[g[1]] = Number(g[2]);

  const hasPrice = Number(it.price) > 0;
  if (!hasPrice) stat.noPrice++;

  return [
    `'HQ'`, S(it.code), S(it.tag), S(it.name), S(it.cat), S(it.section), S(it.brand), S(it.unit),
    hasPrice ? I(it.price) : 'null',
    mSize ? I(mSize[1]) : 'null',
    mSize ? I(mSize[2]) : 'null',
    mSize && mSize[3] ? N(mSize[3]) : 'null',
    mBox ? N(mBox[1]) : 'null',
    mBox ? N(mBox[2]) : 'null',
    mBox ? N(mBox[3]) : 'null',
    JB(stock),
    S(spec),
    mImg ? I(mImg[1]) : 'null',
    `'principal_seed'`,
    S('유송타일 벤더 카탈로그 (ecorean-tile-catalog 앱 내장)'),
    // 헌법: 단가 추정 금지 — 무단가는 NEEDS_RESEARCH 로 분리
    hasPrice ? `'MARKET_RESEARCH'` : `'NEEDS_RESEARCH'`,
    S('ecorean-tile-catalog/index.html:TILE_CATALOG'),
  ];
});

const COLS = ['tenant_id','code','tag','name','category','section','brand','unit','unit_price',
  'size_w_mm','size_h_mm','thickness_mm','box_qty','area_per_box_m2','weight_kg','stock','spec_raw',
  'portal_id','source','source_detail','data_status','origin_dataset'];
const UPD = COLS.filter(c => !['tenant_id','code'].includes(c));

// 문장당 행수 + 파일당 문장수 → execute_sql 페이로드(약 50KB) 안에 들어오도록 분할
const ROWS_PER_STMT = 60;
const MAX_FILE_BYTES = 48000;

const stmts = [];
for (let i = 0; i < rows.length; i += ROWS_PER_STMT) {
  const vals = rows.slice(i, i + ROWS_PER_STMT).map(r => `(${r.join(',')})`).join(',\n');
  stmts.push(`insert into public.tile_products (${COLS.join(',')})\nvalues\n${vals}\non conflict (tenant_id,code) do update set ${UPD.map(c => `${c} = excluded.${c}`).join(', ')}, updated_at = now();`);
}

const files = [];
let cur = '', idx = 0;
const flush = () => {
  if (!cur.trim()) return;
  idx++;
  const name = `seed_tile_${String(idx).padStart(2, '0')}.sql`;
  writeFileSync(join(OUT, name), `-- 자동 생성: generate-tile-seeds.mjs — 직접 수정 금지\n-- 원천: ecorean-tile-catalog/index.html TILE_CATALOG (sha256 ${sha256.slice(0, 16)}…)\n-- 멱등: on conflict do update\n\n${cur}`, 'utf8');
  files.push(name);
  cur = '';
};
for (const st of stmts) {
  if (cur && cur.length + st.length > MAX_FILE_BYTES) flush();
  cur += st + '\n\n';
}
flush();

// import_batches 계보 기록 (마지막 파일에 덧붙임)
const batch = `insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)\nvalues ('tile_products', 'ecorean-tile-catalog/index.html', '${sha256}', ${rows.length})\non conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();\n`;
const last = join(OUT, files[files.length - 1]);
writeFileSync(last, readFileSync(last, 'utf8') + '\n' + batch, 'utf8');

console.log(`✔ ${files.length}개 파일 생성 (${OUT})`);
console.log(files.join(' '));
console.log('\n═══ 파싱 리포트 (총 ' + rows.length + '건) ═══');
console.log(`· 카테고리 ${catalog.length}종, 코드 중복 ${rows.length - new Set(items.map(i => i.code)).size}건`);
console.log(`· 규격(사이즈) 파싱 ${stat.size} (${(stat.size / rows.length * 100).toFixed(1)}%) — 미파싱분은 spec_raw 로 보존`);
console.log(`· 박스입수/㎡/중량 파싱 ${stat.box} (${(stat.box / rows.length * 100).toFixed(1)}%)`);
console.log(`· 창고재고 파싱 ${stat.stock} (${(stat.stock / rows.length * 100).toFixed(1)}%)`);
console.log(`· 이미지 portal_id ${stat.portal} (${(stat.portal / rows.length * 100).toFixed(1)}%)`);
console.log(`· 무단가 ${stat.noPrice}건 → unit_price=null, data_status='NEEDS_RESEARCH' (단가 추정 금지)`);
