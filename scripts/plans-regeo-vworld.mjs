// 정밀 재지오코딩 — VWorld(국토교통부 공간정보 오픈플랫폼) 지오코더
// 2026-08-27: Nominatim 은 한국 도로명주소에서 건물번호를 무시하고 "도로 중간점"을 반환해
//   같은 길의 단지들이 한 점에 뭉쳤다(43개 지점에 102개 단지). VWorld 는 건물번호까지 해석한다.
//
// 준비: vworld.kr 가입 → 오픈API 인증키 발급(무료·즉시) → .env 에 VWORLD_KEY=... 추가
// 사용: node scripts/plans-regeo-vworld.mjs [--limit N] [--all]
//   기본: 좌표가 없거나(=NULL) 부정확한 것으로 표시된 단지만. --all 이면 전 단지 재지오코딩.
// 출력: scripts/plans-coords.json  (slug 없이 단지명+주소 키로 저장 → DB 업데이트 SQL 생성에 사용)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = (() => {
  if (process.env.VWORLD_KEY) return process.env.VWORLD_KEY;
  for (const f of ['.env', '.env.local']) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, 'utf8').match(/^VWORLD_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  return null;
})();
if (!KEY) {
  console.error('❌ VWORLD_KEY 없음 — vworld.kr 오픈API 인증키를 .env 에 VWORLD_KEY= 로 추가하세요 (무료·즉시 발급).');
  process.exit(1);
}

const ARG = process.argv.slice(2);
const LIMIT = (() => { const i = ARG.indexOf('--limit'); return i >= 0 ? +ARG[i + 1] : Infinity; })();
const SIDO_FULL = { '서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시', '인천': '인천광역시', '광주': '광주광역시', '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시', '경기': '경기도', '강원': '강원특별자치도', '충북': '충청북도', '충남': '충청남도', '전북': '전북특별자치도', '전남': '전라남도', '경북': '경상북도', '경남': '경상남도', '제주': '제주특별자치도' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// K-apt gugun 은 '수원장안구'·'창원의창구'처럼 붙어 있어 '수원시 장안구' 로 되돌린다
function normGugun(g) {
  if (!g) return '';
  const m = g.match(/^(.+?)(장안구|권선구|팔달구|영통구|의창구|성산구|마산합포구|마산회원구|진해구|덕진구|완산구|동남구|서북구|상당구|서원구|흥덕구|청원구|남구|북구|동구|서구|중구|처인구|기흥구|수지구|일산동구|일산서구|덕양구|단원구|상록구|분당구|수정구|중원구)$/);
  if (m && m[1].length >= 2) return `${m[1]}시 ${m[2]}`;
  return g;
}
// address 는 '장안구 대평로51번길 22 (정자동)' 처럼 구가 앞에 붙어 있을 수 있다 → 정리
function buildRoadAddress(r) {
  const sido = SIDO_FULL[r.region_sido] || r.region_sido || '';
  const gugun = normGugun(r.region_gugun);
  let road = String(r.address || '').replace(/\s*\([^)]*\)\s*$/, '').trim(); // 괄호 법정동 제거
  const guTail = gugun.split(' ').pop();
  if (guTail && road.startsWith(guTail + ' ')) road = road.slice(guTail.length + 1); // 중복 구 제거
  return [sido, gugun, road].filter(Boolean).join(' ');
}

async function vworld(address, type) {
  const u = 'https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0' +
    `&crs=epsg:4326&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=${type}&key=${encodeURIComponent(KEY)}`;
  const r = await fetch(u, { headers: { 'User-Agent': 'ecorean-plans/1.0 (https://ecorean.net)' } });
  const j = await r.json();
  const st = j?.response?.status;
  if (st === 'OK') {
    const p = j.response.result.point;
    return { lat: +(+p.y).toFixed(6), lng: +(+p.x).toFixed(6), matched: j.response.refined?.text || address };
  }
  if (st === 'ERROR') throw new Error(j.response.error?.text || 'VWorld ERROR');
  return null; // NOT_FOUND
}

// 대상 = 시드 스펙의 고유 단지(단지명+주소). 전 단지를 다시 찍어 좌표 품질을 통일한다.
const spec = JSON.parse(readFileSync('scripts/plans-complexes-spec.json', 'utf8'));
const seen = new Set(), rows = [];
for (const s of spec) {
  const k = `${s.complex_name}|${s.address}`;
  if (seen.has(k)) continue;
  seen.add(k);
  rows.push({ complex_name: s.complex_name, region_sido: s.region_sido, region_gugun: s.region_gugun, address: s.address });
}
console.log(`🔎 재지오코딩 대상 ${rows.length}개 단지 (VWorld)`);
const out = [];
let ok = 0, miss = 0;
for (const r of rows.slice(0, LIMIT)) {
  const addr = buildRoadAddress(r);
  let geo = null;
  try {
    geo = await vworld(addr, 'road');                       // ① 도로명주소
    if (!geo) geo = await vworld(addr, 'parcel');           // ② 지번으로 재시도
  } catch (e) {
    console.error(`  ⚠ ${r.complex_name}: ${e.message}`);
    if (/인증키|KEY/i.test(e.message)) process.exit(1);     // 키 문제면 즉시 중단
  }
  if (geo) { out.push({ ...r, lat: geo.lat, lng: geo.lng, matched: geo.matched }); ok++; console.log(`  ✅ ${r.complex_name} → ${geo.lat},${geo.lng}`); }
  else { miss++; console.log(`  ❌ ${r.complex_name} — 매칭 실패 (${addr})`); }
  await sleep(120); // VWorld 예의
}
writeFileSync('scripts/plans-coords.json', JSON.stringify(out, null, 1));
console.log(`\n✅ 성공 ${ok} · 실패 ${miss} → scripts/plans-coords.json`);
console.log('   다음: 이 파일로 floor_plans UPDATE (complex_name + address 매칭)');
