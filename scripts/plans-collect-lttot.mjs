// 분양 평면도 수집기 — 청약홈 분양정보 API → 건설사 분양홈페이지 → 평형별 평면도 원본
// 2026-08-27 대표 지시: "정밀한 도면이 필요하고 이것은 인테리어 견적 프로그램의 첫 시작"
//
// 배경: 업계(어반베이스·아키스케치)가 쓰는 방식과 동일한 경로다.
//   ① 정부 API 로 단지·주소 확보 → ② 건설사가 분양 홍보용으로 공개한 평형별 평면도 확보
//   → ③ 그 도면을 근거로 정밀 재작도(레이아웃 자체는 대법원 2008도29 로 저작물성 부인)
// 수집물은 재작도 근거자료(내부 참조용)로 보관한다. 원본 이미지를 그대로 대외 게시하지 않는다.
//
// 준수: 사이트별 robots.txt 확인 후 허용 경로만, 요청 간격 유지.
// 사용:
//   node scripts/plans-collect-lttot.mjs --list [--pages N]      공고 목록만 조회
//   node scripts/plans-collect-lttot.mjs --collect [--limit N]   평면도 수집
// 출력: assets/plan-sources/<slug>/*.jpg + scripts/lttot-manifest.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

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

const ARG = process.argv.slice(2);
const num = (flag, dflt) => { const i = ARG.indexOf(flag); return i >= 0 ? +ARG[i + 1] : dflt; };
const PAGES = num('--pages', 3), LIMIT = num('--limit', 5);
const OUT = 'assets/plan-sources';
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ecorean-plans/1.0 (+https://ecorean.net)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 청약홈 분양공고 목록 ─────────────────────────────────────────────
async function fetchPblanc(pages) {
  const rows = [];
  for (let p = 1; p <= pages; p++) {
    const u = `https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?page=${p}&perPage=100&serviceKey=${encodeURIComponent(KEY)}`;
    const j = await (await fetch(u, { headers: UA })).json();
    if (!j.data || !j.data.length) break;
    rows.push(...j.data);
    await sleep(200);
  }
  return rows;
}

// ── robots.txt 준수 확인 ─────────────────────────────────────────────
const robotsCache = new Map();
async function allowed(url) {
  const o = new URL(url);
  if (!robotsCache.has(o.origin)) {
    let dis = [];
    try {
      const r = await fetch(o.origin + '/robots.txt', { headers: UA });
      if (r.ok) {
        const t = await r.text();
        let applies = false;
        for (const line of t.split(/\r?\n/)) {
          const m = line.match(/^\s*(User-agent|Disallow)\s*:\s*(.*)$/i);
          if (!m) continue;
          if (/user-agent/i.test(m[1])) applies = (m[2].trim() === '*');
          else if (applies && m[2].trim()) dis.push(m[2].trim());
        }
      }
    } catch { /* robots 없으면 제한 없음 */ }
    robotsCache.set(o.origin, dis);
  }
  return !robotsCache.get(o.origin).some(d => o.pathname.startsWith(d));
}

// ── 분양홈페이지에서 평면도 이미지 찾기 ──────────────────────────────
// 파일명이 평면도임을 강하게 시사하는 패턴만 채택한다.
//  · 84a.jpg / 59B.png  (평형+타입)   · unit_84a.jpg / plan-84.png / type84a.jpg
// 커뮤니티·조경·투시도 사진이 unit/type 을 포함해 오검출되던 문제로 화이트리스트 방식으로 전환.
const PLAN_FILE = /(?:^|\/)(?:\d{2,3}\s*[a-z]?|(?:unit|plan|pyeong|hotype|type|pyung)[-_]?\d{0,3}\s*[a-z]?)(?:[-_](?:0?\d|big|large|org|origin|ex|expand|basic|kr|view|img))?\.(?:jpg|jpeg|png)$/i;
// 경로 자체가 평면도 폴더면 파일명이 일반적이어도 후보로 본다 (/plan/01.jpg 같은 구조)
const PLAN_DIR = /\/(?:plans?|units?|types?|pyeong|pyung|floorplan)\//i;
const SKIP_HINT = /(icon|btn|logo|banner|blank|bg|arrow|thumb|sprite|_m_|\/m\/|community|커뮤니티|facility|조경|gallery|visual|main|view|cctv|map|premium|brand|\/theme\/|\/skin\/|\/tpl\/|\/common\/|\/layout\/)/i;

async function findPlanImages(home) {
  const pages = new Set([home]);
  try {
    if (!await allowed(home)) return { skipped: 'robots.txt 차단', imgs: [] };
    const r = await fetch(home, { headers: UA, redirect: 'follow' });
    if (!r.ok) return { skipped: `HTTP ${r.status}`, imgs: [] };
    const baseUrl = r.url;
    const html = await r.text();
    // 평면/세대 안내 메뉴 링크 추가 탐색 — 링크 텍스트뿐 아니라 href 도 본다.
    // 분양 사이트 상당수가 메뉴를 이미지로 깔아, 텍스트 매칭만으론 평면 페이지를 못 찾았다.
    for (const m of html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]{0,80}?)<\/a>/g)) {
      const href = m[1], text = m[2].replace(/<[^>]*>/g, '');
      if (/평면|세대안내|주택형|타입/.test(text) || /(plan|unit|type|pyeong|pyung|house)/i.test(href)) {
        try { pages.add(new URL(href, baseUrl).href); } catch { }
      }
    }
    // 링크가 스크립트로만 열리는 사이트 대비 — 흔한 평면 페이지 경로를 직접 찔러본다
    for (const g of ['plan.html', 'plan.php', 'unit.html', 'type.html', 'sub/plan.html', 'plan/', 'unit/']) {
      try { pages.add(new URL(g, baseUrl).href); } catch { }
    }
    // SPA 사이트는 이미지 목록이 번들 js 안에 있다 — 같은 도메인 스크립트도 훑는다
    for (const m of [...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/gi)].slice(0, 6)) {
      try {
        const ju = new URL(m[1], baseUrl);
        if (ju.origin === new URL(baseUrl).origin) pages.add(ju.href);
      } catch { }
    }
    const found = new Map();
    for (const p of [...pages].slice(0, 12)) {
      if (!await allowed(p)) continue;
      let t;
      try { const pr = await fetch(p, { headers: { ...UA, Referer: baseUrl } }); if (!pr.ok) continue; t = await pr.text(); }
      catch { continue; }
      // src/href 속성 + CSS background-image + 스크립트에 박힌 경로까지 훑는다
      // (분양 사이트 상당수가 SPA·슬라이더라 img 태그로 안 나온다)
      const cands = [
        ...[...t.matchAll(/(?:src|data-src|data-original|data-lazy|href)="([^"]+\.(?:jpg|jpeg|png))"/gi)].map(m => m[1]),
        ...[...t.matchAll(/url\(\s*['"]?([^'")]+\.(?:jpg|jpeg|png))['"]?\s*\)/gi)].map(m => m[1]),
        ...[...t.matchAll(/['"]([^'"\s]+\.(?:jpg|jpeg|png))['"]/gi)].map(m => m[1]),
      ];
      for (const raw of cands) {
        const clean = raw.split('?')[0];
        if (SKIP_HINT.test(raw)) continue;
        if (!PLAN_FILE.test(clean) && !PLAN_DIR.test(clean)) continue;
        try { found.set(new URL(raw, p).href, true); } catch { }
      }
      await sleep(500);
    }
    return { imgs: [...found.keys()] };
  } catch (e) { return { skipped: e.message, imgs: [] }; }
}

// 실제 도면인지 픽셀 크기로 판별 (썸네일·아이콘 제외)
function dims(b) {
  if (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) { i++; continue; }
      const mk = b[i + 1];
      if (mk >= 0xc0 && mk <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(mk)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

// ── 실행 ─────────────────────────────────────────────────────────────
const slugify = s => String(s).replace(/[^\w가-힣]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
console.log(`📡 청약홈 분양공고 조회 (${PAGES}페이지)`);
const all = await fetchPblanc(PAGES);
const withHome = all.filter(r => r.HMPG_ADRES && /^https?:\/\//.test(r.HMPG_ADRES));
console.log(`   공고 ${all.length}건 · 분양홈페이지 보유 ${withHome.length}건`);

if (ARG.includes('--list')) {
  withHome.slice(0, 40).forEach(r => console.log(` · ${r.HOUSE_NM} | ${r.CNSTRCT_ENTRPS_NM?.slice(0, 24)} | ${r.HMPG_ADRES}`));
  process.exit(0);
}
if (!ARG.includes('--collect')) { console.log('(--list 로 목록, --collect 로 수집)'); process.exit(0); }

mkdirSync(OUT, { recursive: true });
const manifest = existsSync('scripts/lttot-manifest.json') ? JSON.parse(readFileSync('scripts/lttot-manifest.json', 'utf8')) : [];
const done = new Set(manifest.map(m => m.house_manage_no));
let ok = 0;
for (const r of withHome) {
  if (ok >= LIMIT) break;
  if (done.has(r.HOUSE_MANAGE_NO)) continue;
  const slug = slugify(r.HOUSE_NM);
  console.log(`\n▶ ${r.HOUSE_NM}  (${r.HMPG_ADRES})`);
  const { imgs, skipped } = await findPlanImages(r.HMPG_ADRES);
  if (skipped) { console.log(`   건너뜀 — ${skipped}`); continue; }
  if (!imgs.length) { console.log('   평면도 후보 없음'); continue; }
  const dir = `${OUT}/${slug}`;
  mkdirSync(dir, { recursive: true });
  const saved = [];
  for (const u of imgs.slice(0, 24)) {
    try {
      const ir = await fetch(u, { headers: { ...UA, Referer: r.HMPG_ADRES } });
      if (!ir.ok) continue;
      const b = Buffer.from(await ir.arrayBuffer());
      const d = dims(b);
      if (!d || d.w < 600 || d.h < 600) continue;   // 썸네일 제외 — 재작도엔 원본급만
      const name = decodeURIComponent(u.split('/').pop().split('?')[0]);
      writeFileSync(`${dir}/${name}`, b);
      saved.push({ file: name, url: u, w: d.w, h: d.h, kb: Math.round(b.length / 1024) });
      console.log(`   ✅ ${name} ${d.w}×${d.h}`);
      await sleep(600);
    } catch { }
  }
  if (!saved.length) { console.log('   원본급 이미지 없음'); continue; }
  manifest.push({
    house_manage_no: r.HOUSE_MANAGE_NO, name: r.HOUSE_NM, slug,
    address: r.HSSPLY_ADRES, builder: r.CNSTRCT_ENTRPS_NM,
    pblanc_de: r.RCRIT_PBLANC_DE, homepage: r.HMPG_ADRES, pblanc_url: r.PBLANC_URL,
    images: saved,
  });
  writeFileSync('scripts/lttot-manifest.json', JSON.stringify(manifest, null, 1));
  ok++;
  await sleep(1200);
}
console.log(`\n✅ 단지 ${ok}곳 수집 (누적 ${manifest.length}곳) → ${OUT}/ · scripts/lttot-manifest.json`);
