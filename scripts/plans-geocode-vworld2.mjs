// 분양 단지 정밀 지오코딩 — 브이월드 주소 API (2026-09-09)
// Nominatim(동 중심 수백 m 오차) 좌표를, 건물번호까지 해석하는 브이월드로 정밀화한다.
// 입력: scripts/lttot-manifest.json (address = 청약홈 공급위치 전체 주소)
// 출력: scripts/lttot-geo-vw.json (slug → {lat,lng,matched})  · lttot-geo.json 에 병합(브이월드 우선)
// 사용: node scripts/plans-geocode-vworld2.mjs [--merge]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KEY = 'D5489AC1-5C65-413B-9EC8-5A6A340E6184'; // 브이월드 개발키 (지오코더 일 4만건)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const manifest = JSON.parse(readFileSync('scripts/lttot-manifest.json', 'utf8'));
const OUT = 'scripts/lttot-geo-vw.json';
const cache = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

// 청약홈 주소에서 지오코더가 싫어하는 꼬리를 뗀다: "일원", "OO블록", "일대", 괄호
function cleanAddr(a) {
  return String(a || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/(일원|일대|번지\s*외.*|외\s*\d+필지.*|블록|BL\b|[A-Z]-?\d+(BL|블럭|블록)?)\s*$/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function geocode(addr, type) {
  const u = 'https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0'
    + `&crs=EPSG:4326&type=${type}&address=${encodeURIComponent(addr)}&key=${KEY}&domain=https://ecorean.net`;
  const j = await (await fetch(u)).json();
  const r = j?.response;
  if (r?.status === 'OK' && r.result?.point) {
    return { lat: +(+r.result.point.y).toFixed(6), lng: +(+r.result.point.x).toFixed(6), matched: r.refined?.text || addr };
  }
  return null;
}

let ok = 0, miss = 0, cached = 0;
for (const c of manifest) {
  if (cache[c.slug]) { cached++; continue; }
  const addr = cleanAddr(c.address);
  if (!addr) { miss++; continue; }
  let g = null;
  try {
    g = await geocode(addr, 'ROAD') || await geocode(addr, 'PARCEL');
    // 전체 주소 실패 시 마지막 토큰(번지·블록)을 하나씩 떼며 재시도 — 동 단위까지는 내려가지 않는다
    if (!g) {
      const parts = addr.split(' ');
      if (parts.length > 3) g = await geocode(parts.slice(0, -1).join(' '), 'PARCEL');
    }
  } catch (e) { console.log(`  ⚠ ${c.slug}: ${e.message}`); }
  if (g) { cache[c.slug] = g; ok++; }
  else { miss++; console.log(`  ❌ ${c.name} — ${addr}`); }
  if ((ok + miss) % 20 === 0) writeFileSync(OUT, JSON.stringify(cache, null, 1));
  await sleep(250);
}
writeFileSync(OUT, JSON.stringify(cache, null, 1));
console.log(`✅ 브이월드 지오코딩 — 성공 ${ok} · 실패 ${miss} · 캐시 ${cached} → ${OUT}`);

if (process.argv.includes('--merge')) {
  const geoF = 'scripts/lttot-geo.json';
  const geo = existsSync(geoF) ? JSON.parse(readFileSync(geoF, 'utf8')) : {};
  let merged = 0;
  for (const [slug, g] of Object.entries(cache)) {
    geo[slug] = { ...(geo[slug] || {}), lat: g.lat, lng: g.lng, src: 'vworld' };
    merged++;
  }
  writeFileSync(geoF, JSON.stringify(geo, null, 1));
  console.log(`✅ lttot-geo.json 병합 ${merged}건 (브이월드 우선)`);
}
