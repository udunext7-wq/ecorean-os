// LH 주택 평면도 현황(공공데이터포털 15037046) → 실제 평면도 이미지 적재
// 2026-08-27 대표 지시: "가짜도면은 의미가 없다, 실제도면을 넣어야한다"
//
// 라이선스: 이용허락범위 제한 없음(상업 이용·변형 가능). 출처 표시로 게시.
// 입력 파일은 포털 로그인 다운로드가 필요하다 (비로그인 404 확인됨).
//
// 사용:
//   node scripts/plans-ingest-lh-images.mjs <파일경로> --inspect   ← 먼저 구조부터 확인
//   node scripts/plans-ingest-lh-images.mjs <파일경로>             ← 이미지 추출 + 시드 SQL 생성
// 출력: sites/net/public/catalog/plans/lh/<slug>.<ext> + scripts/lh-seed.sql
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const [file, ...rest] = process.argv.slice(2);
if (!file || !existsSync(file)) {
  console.error('❌ 사용: node scripts/plans-ingest-lh-images.mjs <다운로드한 파일경로> [--inspect]');
  console.error('   파일은 https://www.data.go.kr/data/15037046/fileData.do 에서 로그인 후 다운로드');
  process.exit(1);
}
const INSPECT = rest.includes('--inspect');
const IMG_DIR = 'sites/net/public/catalog/plans/lh';

// ── 파일 파싱 (JSON / CSV 자동 판별) ──────────────────────────────────
const raw = readFileSync(file, 'utf8').replace(/^﻿/, '');
let rows;
if (raw.trimStart().startsWith('{') || raw.trimStart().startsWith('[')) {
  const j = JSON.parse(raw);
  rows = Array.isArray(j) ? j : (j.data || j.records || j.rows || j.response?.body?.items || []);
  if (!Array.isArray(rows)) rows = [rows];
} else {
  // CSV — 따옴표 포함 필드 대응
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const split = l => { const o = []; let c = '', q = false;
    for (let i = 0; i < l.length; i++) { const ch = l[i];
      if (ch === '"') { if (q && l[i + 1] === '"') { c += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; }
    o.push(c); return o; };
  const head = split(lines[0]);
  rows = lines.slice(1).map(l => { const v = split(l), o = {}; head.forEach((h, i) => o[h.trim()] = (v[i] || '').trim()); return o; });
}
console.log(`📄 ${basename(file)} — ${rows.length}행`);
if (!rows.length) { console.error('❌ 행이 없습니다'); process.exit(1); }

// ── 필드 자동 매핑 ───────────────────────────────────────────────────
const keys = Object.keys(rows[0]);
const pick = (...pats) => keys.find(k => pats.some(p => new RegExp(p, 'i').test(k)));
const F = {
  image: pick('image', '이미지', '도면', 'file', 'base64', 'data$'),
  mime: pick('mime', 'type', '확장자', 'ext'),
  name: pick('단지', '주택명', 'name', '블록', 'bl'),
  area: pick('면적', 'area'),
  type: pick('평형', '주택형', '타입', 'type'),
  addr: pick('주소', 'addr', '소재'),
  region: pick('지역', '본부', 'region', '시도'),
};
console.log('필드 매핑:', JSON.stringify(F));
if (INSPECT) {
  console.log('\n--- 전체 컬럼 ---\n' + keys.join(', '));
  const s = rows[0];
  console.log('\n--- 첫 행 (이미지 필드는 길이만) ---');
  keys.forEach(k => {
    const v = String(s[k] ?? '');
    console.log(`  ${k}: ${v.length > 120 ? `[${v.length}자] ${v.slice(0, 40)}…` : v}`);
  });
  process.exit(0);
}
if (!F.image) { console.error('❌ 이미지 컬럼을 못 찾았습니다 — --inspect 로 컬럼명을 확인 후 알려주세요'); process.exit(1); }

// ── 이미지 추출 + 시드 SQL ───────────────────────────────────────────
mkdirSync(IMG_DIR, { recursive: true });
const q = v => v === null || v === undefined || v === '' ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const stmts = [];
let ok = 0, skip = 0;
rows.forEach((r, i) => {
  let b64 = String(r[F.image] ?? '');
  if (!b64) { skip++; return; }
  let mime = String(r[F.mime] ?? '') || 'image/jpeg';
  const m = b64.match(/^data:([^;]+);base64,(.*)$/s); // data URI 형태 대응
  if (m) { mime = m[1]; b64 = m[2]; }
  const ext = /png/i.test(mime) ? 'png' : /gif/i.test(mime) ? 'gif' : /svg/i.test(mime) ? 'svg' : 'jpg';
  let buf;
  try { buf = Buffer.from(b64, 'base64'); } catch { skip++; return; }
  if (buf.length < 1024) { skip++; return; } // 빈 값·깨진 값 제외
  const nm = String(r[F.name] ?? `LH-${i + 1}`).replace(/\s+/g, ' ').trim();
  const at = String(r[F.type] ?? '').trim();
  const slug = `lh-${String(i + 1).padStart(4, '0')}`;
  writeFileSync(`${IMG_DIR}/${slug}.${ext}`, buf);
  const areaNum = parseFloat(String(r[F.area] ?? '').replace(/[^\d.]/g, ''));
  stmts.push(`INSERT INTO floor_plans (complex_name,region_sido,address,area_type,exclusive_area_m2,source,source_note,image_path)
SELECT ${q(nm)},${q(String(r[F.region] ?? '').trim() || null)},${q(String(r[F.addr] ?? '').trim() || null)},${q(at || null)},${isNaN(areaNum) ? 'NULL' : areaNum},'public','LH 주택 평면도 현황 (공공데이터포털 15037046) — 실제 도면',${q(`/catalog/plans/lh/${slug}.${ext}`)}
WHERE NOT EXISTS (SELECT 1 FROM floor_plans WHERE image_path=${q(`/catalog/plans/lh/${slug}.${ext}`)});`);
  ok++;
});
writeFileSync('scripts/lh-seed.sql', stmts.join('\n') + '\n');
console.log(`\n✅ 이미지 ${ok}건 → ${IMG_DIR}/  (건너뜀 ${skip})`);
console.log(`✅ 시드 SQL → scripts/lh-seed.sql  (source='public', 실제 도면)`);
