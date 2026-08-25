// 공공데이터(국토교통부 K-apt) 기반 실단지 스펙 자동 수집 — 2026-08-25 대표 지시 (합법 확장)
// 호갱노노·네이버 이미지 크롤링 대신, 공공 API의 사실 정보(단지명·주소·세대수·면적구간)만 수집해
// 기존 "개략 재작도" 파이프라인(plans-generate-complexes.mjs)에 병합할 스펙을 생성한다.
//
// 사용:
//   node scripts/plans-fetch-public-specs.mjs --sido 서울 [--gugun 강남구] [--limit 20]
//        [--min-households 300] [--no-geocode] [--probe]
// 필요 키: DATA_GO_KR_KEY (공공데이터포털 일반 인증키 Decoding).
//   - .env 의 DATA_GO_KR_KEY=... 또는 환경변수. 활용신청 필요 서비스(즉시 자동승인):
//     ① 국토교통부_공동주택 단지 목록제공 서비스  ② 국토교통부_공동주택 기본 정보제공 서비스
// 출력: scripts/plans-complexes-auto.json (generate 스크립트가 자동 병합, 기존 slug/단지명+평형 중복 제외)
// 지오코딩: OSM Nominatim (키 불필요, 1req/1.1s 예의 준수). --no-geocode 시 생략(lat/lng null).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// ── 설정 ─────────────────────────────────────────────────────────────
const ARG = parseArgs(process.argv.slice(2));
const KEY = loadKey();
const SIDO_CODES = { // 법정동코드 시도 2자리 (특별자치도 개편 신·구 코드 모두 시도)
  '서울': ['11'], '부산': ['26'], '대구': ['27'], '인천': ['28'], '광주': ['29'],
  '대전': ['30'], '울산': ['31'], '세종': ['36'], '경기': ['41'], '강원': ['51', '42'],
  '충북': ['43'], '충남': ['44'], '전북': ['52', '45'], '전남': ['46'], '경북': ['47'],
  '경남': ['48'], '제주': ['50'],
};
const SIDO_SHORT = { '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원특별자치도':'강원','강원도':'강원','충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','전라북도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주' };
// API 버전이 갱신돼도 앞에서부터 순차 시도 (2026-08-25 프로브로 확인된 현행: List4 · BasisV5)
const LIST_ENDPOINTS = [
  'https://apis.data.go.kr/1613000/AptListService4/getSidoAptList4',
  'https://apis.data.go.kr/1613000/AptListService3/getSidoAptList3',
];
const BASIS_ENDPOINTS = [
  'https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5',
  'https://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getAphusBassInfoV3',
];
const OUT = 'scripts/plans-complexes-auto.json';
const SPEC_EXISTING = 'scripts/plans-complexes-spec.json';

// ── 유틸 ─────────────────────────────────────────────────────────────
function parseArgs(a) {
  const o = { limit: 20, minH: 300, geocode: true };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--sido') o.sido = a[++i];
    else if (a[i] === '--gugun') o.gugun = a[++i];
    else if (a[i] === '--limit') o.limit = +a[++i];
    else if (a[i] === '--min-households') o.minH = +a[++i];
    else if (a[i] === '--no-geocode') o.geocode = false;
    else if (a[i] === '--probe') o.probe = true;
  }
  return o;
}
function loadKey() {
  if (process.env.DATA_GO_KR_KEY) return process.env.DATA_GO_KR_KEY;
  for (const f of ['.env', '.env.local']) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, 'utf8').match(/^DATA_GO_KR_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
}
// XML·JSON 응답 겸용 필드 추출 (List4/BasisV5 는 JSON, 구버전은 XML)
const tag = (chunk, name) => {
  let m = chunk.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  if (m) return m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
  m = chunk.match(new RegExp(`"${name}"\\s*:\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|(-?[\\d.]+))`));
  return m ? (m[1] ?? m[2] ?? '').trim() : '';
};
const items = body => {
  const xml = [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
  if (xml.length) return xml;
  try {
    const j = JSON.parse(body);
    let arr = j?.response?.body?.items?.item ?? j?.response?.body?.items ?? [];
    if (!Array.isArray(arr)) arr = arr ? [arr] : [];
    return arr.map(x => JSON.stringify(x));
  } catch { return []; }
};
const num = v => { const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function apiGet(endpoints, params) {
  for (const base of endpoints) {
    const url = `${base}?serviceKey=${encodeURIComponent(KEY)}&${new URLSearchParams(params)}`;
    try {
      const res = await fetch(url);
      const body = await res.text();
      if (ARG.probe) { console.log(`\n── PROBE ${base}\n${body.slice(0, 2000)}`); }
      const code = tag(body, 'resultCode');
      if (code === '00' || code === '0') return body;
      const auth = tag(body, 'returnAuthMsg') || tag(body, 'resultMsg') || `HTTP ${res.status}`;
      console.warn(`  ⚠ ${base.split('/').pop()}: ${auth}`);
    } catch (e) { console.warn(`  ⚠ ${base.split('/').pop()}: ${e.message}`); }
  }
  return null;
}

// ── 템플릿 매핑 (개략 재작도용 — 면적구간·연식·동당세대 휴리스틱) ────
function pickTypes(b) {
  const y = num((b.kaptUsedate || '').slice(0, 4)) || 2010;
  const old = y > 1970 && y < 2000;
  const tower = num(b.kaptdaCnt) / Math.max(1, num(b.kaptDongCnt)) > 200; // 동당 세대 多 → 타워/주상복합형
  const v = num(b.kaptCode.replace(/\D/g, '')) % 2; // a/b 변형 분산
  const out = [];
  if (num(b.kaptMparea60) > 0) out.push({ at: '59', tpl: tower ? 'std-59c' : (v ? 'std-59b' : 'std-59a') });
  if (num(b.kaptMparea85) > 0) out.push({ at: '84', tpl: old ? 'std-99' : (tower ? 'std-84c' : (v ? 'std-84b' : 'std-84a')) });
  if (num(b.kaptMparea135) > 0) out.push({ at: '114', tpl: 'std-114' });
  if (num(b.kaptMparea136) > 0) out.push({ at: '145', tpl: 'std-145' });
  return out;
}

// ── 지오코딩 (Nominatim, 예의: 1.1s 간격·식별 UA) ────────────────────
async function geocode(q) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'ecorean-plans-pipeline/1.0 (https://ecorean.net)' } });
    const j = await res.json();
    if (j[0]) return { lat: +(+j[0].lat).toFixed(4), lng: +(+j[0].lon).toFixed(4) };
  } catch { /* 아래 null 반환 */ }
  return null;
}

// ── 메인 ─────────────────────────────────────────────────────────────
if (!KEY) {
  console.error('❌ DATA_GO_KR_KEY 없음 — 공공데이터포털(data.go.kr) 일반 인증키(Decoding)를 .env 에 DATA_GO_KR_KEY= 로 추가하세요.');
  console.error('   활용신청(즉시 승인): ① 공동주택 단지 목록제공 서비스 ② 공동주택 기본 정보제공 서비스');
  process.exit(1);
}
if (!ARG.sido || !SIDO_CODES[ARG.sido]) {
  console.error(`❌ --sido 필요. 지원: ${Object.keys(SIDO_CODES).join(' ')}`);
  process.exit(1);
}

const existing = JSON.parse(readFileSync(SPEC_EXISTING, 'utf8'));
const seenNameAt = new Set(existing.map(e => `${e.complex_name}|${String(e.area_type).replace(/\D/g, '')}`));
const prevAuto = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
prevAuto.forEach(e => seenNameAt.add(`${e.name}|${String(e.at).replace(/\D/g, '')}`));

console.log(`🔎 ${ARG.sido}${ARG.gugun ? ' ' + ARG.gugun : ''} — 목표 ${ARG.limit}단지 (세대수 ≥ ${ARG.minH})`);
const picked = [];
outer:
for (const sidoCode of SIDO_CODES[ARG.sido]) {
  for (let page = 1; page <= 40; page++) {
    const xml = await apiGet(LIST_ENDPOINTS, { sidoCode, pageNo: page, numOfRows: 100 });
    if (!xml) break;
    const rows = items(xml);
    if (!rows.length) break;
    for (const r of rows) {
      const name = tag(r, 'kaptName'), kaptCode = tag(r, 'kaptCode');
      const as2 = tag(r, 'as2');
      if (ARG.gugun && !(as2 || '').includes(ARG.gugun)) continue;
      if (!name || !kaptCode) continue;
      if ([...seenNameAt].some(k => k.startsWith(name + '|'))) continue; // 단지 자체가 이미 있음
      await sleep(120);
      const bx = await apiGet(BASIS_ENDPOINTS, { kaptCode });
      if (!bx) continue;
      const b = {
        kaptCode, name,
        kaptAddr: tag(bx, 'kaptAddr'), doroJuso: tag(bx, 'doroJuso'),
        kaptdaCnt: tag(bx, 'kaptdaCnt'), kaptDongCnt: tag(bx, 'kaptDongCnt'),
        kaptUsedate: tag(bx, 'kaptUsedate'),
        kaptMparea60: tag(bx, 'kaptMparea60'), kaptMparea85: tag(bx, 'kaptMparea85'),
        kaptMparea135: tag(bx, 'kaptMparea135'), kaptMparea136: tag(bx, 'kaptMparea136'),
      };
      if (num(b.kaptdaCnt) < ARG.minH) continue;
      const types = pickTypes(b);
      if (!types.length) continue;
      picked.push(b);
      console.log(`  · ${name} (${as2}, ${b.kaptdaCnt}세대, 사용승인 ${b.kaptUsedate || '?'}) → ${types.map(t => t.at).join('/')}`);
      if (picked.length >= ARG.limit) break outer;
    }
  }
}
if (!picked.length) { console.error('❌ 조건에 맞는 신규 단지 없음'); process.exit(1); }

// 주소 분해 + 지오코딩 + 스펙 변환
const specs = [];
for (const b of picked) {
  const addrFull = b.doroJuso || b.kaptAddr;
  const parts = (b.kaptAddr || '').split(/\s+/);           // [시도, 시군구(1~2토큰), 법정동, 번지...]
  const sido = SIDO_SHORT[parts[0]] || ARG.sido;
  const gugunEnd = parts[1]?.endsWith('시') && parts[2]?.endsWith('구') ? 3 : 2;
  const gugun = parts.slice(1, gugunEnd).join(' ') || ARG.gugun || '';
  const dong = parts[gugunEnd] || '';
  const road = (b.doroJuso || '').split(/\s+/).slice(gugunEnd).join(' ');
  const addr = road ? `${road}${dong ? ` (${dong})` : ''}` : dong;
  let geo = null;
  if (ARG.geocode) { geo = await geocode(addrFull); await sleep(1100); }
  if (!geo) console.warn(`  ⚠ 지오코딩 실패: ${b.name} — lat/lng null (지도 마커 제외됨)`);
  for (const t of pickTypes(b)) {
    specs.push({
      slug: `cx-a${b.kaptCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${t.at}`,
      name: b.name, at: t.at, tpl: t.tpl, sido, gugun, addr,
      lat: geo?.lat ?? null, lng: geo?.lng ?? null,
      src: `K-apt ${b.kaptCode} · ${b.kaptdaCnt}세대 · 사용승인 ${b.kaptUsedate || '?'}`,
    });
  }
}
const merged = [...prevAuto, ...specs];
writeFileSync(OUT, JSON.stringify(merged, null, 1));
console.log(`\n✅ ${picked.length}단지 → 스펙 ${specs.length}건 추가 (누적 ${merged.length}건) → ${OUT}`);
console.log('   다음: node scripts/plans-generate-complexes.mjs && node scripts/plans-svg-to-minicad.mjs && node scripts/plans-svg-openings.mjs');
