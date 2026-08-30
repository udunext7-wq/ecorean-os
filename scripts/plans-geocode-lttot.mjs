// 분양 실도면 단지 좌표 수집 — 지도에 점을 찍으려면 좌표가 있어야 한다.
// 적재 때 좌표를 넣지 않아 floor_plans 577행이 전부 lat/lng NULL 이었다(지도가 비어 있던 원인).
//
// 방식: Nominatim(OSM). 번지 주소는 매칭이 안 되므로 '시도 시군구 읍면동' 까지 줄여 조회한다.
//       → 동 중심 좌표라 단지 정문과는 수백 m 차이가 난다(카탈로그에 이미 그렇게 안내 중).
// 예의: 1.2초 간격, 연락처 있는 User-Agent, 결과 캐시(재실행 시 이미 받은 단지는 건너뜀).
// 사용: node scripts/plans-geocode-lttot.mjs
// 출력: scripts/lttot-geo.json (키 = 단지명|주소) + scripts/lttot-geo.sql
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const UA = { 'User-Agent': 'ecorean-plans/1.0 (+https://ecorean.net; contact udunext7@gmail.com)' };
const OUT = 'scripts/lttot-geo.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 번지·필지·블록 표기를 걷어내고 '시도 시군구 읍면동' 까지만 남긴다
function dongOf(a) {
  const t = String(a || '').replace(/외\s*\d+\s*필지.*$/, '').split(/\s+/);
  const out = [];
  for (const w of t) {
    if (/^\d/.test(w)) break;
    out.push(w);
    if (/(동|읍|면|리)$/.test(w) && out.length >= 3) break;
  }
  return out.slice(0, 4).join(' ');
}
function gunOf(a) { return String(a || '').split(/\s+/).slice(0, 2).join(' '); }

async function geo(q) {
  const u = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=' + encodeURIComponent(q);
  try {
    const r = await fetch(u, { headers: UA });
    if (!r.ok) return null;
    const j = await r.json();
    return j[0] ? { lat: +(+j[0].lat).toFixed(6), lng: +(+j[0].lon).toFixed(6), matched: j[0].display_name } : null;
  } catch { return null; }
}

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const cx = new Map();
for (const r of rows) {
  const k = r.complex_name + '|' + (r.address || '');
  if (!cx.has(k)) cx.set(k, { name: r.complex_name, address: r.address });
}
const cache = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const todo = [...cx.entries()].filter(([k]) => !cache[k]);
console.log(`📍 단지 ${cx.size}곳 중 ${todo.length}곳 조회`);

let ok = 0, miss = 0;
for (const [k, c] of todo) {
  const tries = [dongOf(c.address), gunOf(c.address)].filter(Boolean);
  let hit = null, used = null;
  for (const q of tries) {
    hit = await geo(q); used = q;
    await sleep(1200);
    if (hit) break;
  }
  cache[k] = hit ? { ...hit, query: used, level: used === tries[0] ? 'dong' : 'gungu' } : { lat: null, lng: null, query: used };
  hit ? ok++ : miss++;
  if ((ok + miss) % 20 === 0) {
    writeFileSync(OUT, JSON.stringify(cache, null, 1));
    console.log(`  … ${ok + miss}/${todo.length} (성공 ${ok})`);
  }
}
writeFileSync(OUT, JSON.stringify(cache, null, 1));

// 적용용 SQL — 단지명+주소로 묶어 한 번에 갱신
const vals = Object.entries(cache).filter(([, v]) => v.lat != null)
  .map(([k, v]) => {
    const [n, a] = k.split('|');
    const q = s => "'" + String(s).replace(/'/g, "''") + "'";
    return `(${q(n)},${q(a)},${v.lat},${v.lng})`;
  });
writeFileSync('scripts/lttot-geo.sql',
  `-- 단지 좌표 갱신 (동 중심 개략 좌표)\nupdate floor_plans f set lat=v.lat, lng=v.lng\nfrom (values\n${vals.join(',\n')}\n) as v(name,addr,lat,lng)\nwhere f.complex_name=v.name and coalesce(f.address,'')=v.addr;\n`);
console.log(`✅ 좌표 ${ok} · 실패 ${miss} → ${OUT} · scripts/lttot-geo.sql (${vals.length}건)`);
