// LH 공개 자료(주택기술품질자료 게시판)에서 공동주택 평면·BIM 자료 수집 — 2026-08-26 대표 지시(공공기관 공개 도면)
// LH robots.txt: Googlebot 2개 경로 외 전면 Allow. 공공저작물 — 출처 표시 후 이용 가능.
//
// 2026-08-26 조사 결과: bid=0027 게시판은 총 9건(모듈러 매뉴얼·PC설계가이드·BIM 적용지침 등)뿐이고
// **세대 평면도/주력평면 라이브러리는 없다.** 이 스크립트는 게시판이 갱신될 때 재확인하는 용도로 유지한다.
// 실제 LH 평면도 이미지는 공공데이터포털 15037046 파일데이터(로그인 다운로드)에 있다.
// 사용: node scripts/plans-fetch-lh-public.mjs [--download] [--pages N]
//   기본은 목록만 조사(dry-run). --download 시 assets/lh-plans/ 로 내려받는다.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ecorean-plans/1.0 (+https://ecorean.net)' };
const BOARD = 'https://www.lh.or.kr/board.es?mid=a10402030100&bid=0027';
const OUT_DIR = 'assets/lh-plans';
const ARG = process.argv.slice(2);
const DO_DL = ARG.includes('--download');
const PAGES = (() => { const i = ARG.indexOf('--pages'); return i >= 0 ? +ARG[i + 1] : 5; })();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

// 평면 관련 자료만 (구조·설비 지침류 제외)
const WANTED = /(평면|BIM\s*라이브러리|주력평면|세대\s*평면|표준\s*평면)/;

async function listPage(n) {
  const res = await fetch(`${BOARD}&nPage=${n}`, { headers: UA });
  if (!res.ok) throw new Error(`목록 HTTP ${res.status}`);
  const html = await res.text();
  const rows = html.split(/<tr[\s>]/).slice(1);
  const out = [];
  for (const row of rows) {
    const t = (row.match(/onclick="goView3\('\d+','[^']*'\);\s*return false;"\s*>\s*([\s\S]*?)<\/a>/) || [])[1];
    if (!t) continue;
    const title = dec(t.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
    const files = [...row.matchAll(/href="(\/boardDownload\.es\?[^"]+)"[^>]*title="([^"]*?)\s*다운로드"/g)]
      .map(m => ({ url: 'https://www.lh.or.kr' + dec(m[1]), name: dec(m[2]).trim() }));
    const size = [...row.matchAll(/\(([\d.]+(?:MB|KB|GB))\)/g)].map(m => m[1]);
    files.forEach((f, i) => { f.size = size[i] || '?'; });
    out.push({ title, files });
  }
  return out;
}

const all = [];
for (let p = 1; p <= PAGES; p++) {
  try {
    const rows = await listPage(p);
    if (!rows.length) break;
    all.push(...rows);
    console.log(`  · ${p}페이지 ${rows.length}건`);
    await sleep(400); // 공공 서버 예의
  } catch (e) { console.warn(`  ⚠ ${p}페이지: ${e.message}`); break; }
}
console.log(`\n총 ${all.length}건 게시글`);

const hits = all.filter(r => WANTED.test(r.title) && r.files.length);
console.log(`평면 관련 ${hits.length}건:`);
hits.forEach(h => {
  console.log(` ★ ${h.title}`);
  h.files.forEach(f => console.log(`     - ${f.name} (${f.size})`));
});

writeFileSync('scripts/lh-plan-assets.json', JSON.stringify(hits, null, 1));
console.log(`\n목록 저장 → scripts/lh-plan-assets.json`);

if (!DO_DL) { console.log('(다운로드하려면 --download)'); process.exit(0); }
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
let ok = 0;
for (const h of hits) for (const f of h.files) {
  const safe = f.name.replace(/[\\/:*?"<>|]/g, '_');
  const path = `${OUT_DIR}/${safe}`;
  if (existsSync(path)) { console.log(`  = 이미 있음 ${safe}`); continue; }
  try {
    const r = await fetch(f.url, { headers: UA });
    if (!r.ok) { console.warn(`  ⚠ ${safe}: HTTP ${r.status}`); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(path, buf);
    console.log(`  ✅ ${safe} (${(buf.length / 1048576).toFixed(1)}MB)`);
    ok++;
    await sleep(900);
  } catch (e) { console.warn(`  ⚠ ${safe}: ${e.message}`); }
}
console.log(`\n✅ ${ok}개 파일 → ${OUT_DIR}/ (출처: LH 공개자료, 사용 시 출처 표시)`);
