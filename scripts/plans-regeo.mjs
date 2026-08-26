// 지오코딩 실패 보정 — plans-complexes-auto.json 의 lat/lng null 항목을 단계적 완화 쿼리로 재시도
// (도로명 전체 → 시도+구군+법정동 → 시도+구군+단지명 → 시도+구군). 동 단위 개략 좌표면 충분(지도 마커용).
// 사용: node scripts/plans-regeo.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'scripts/plans-complexes-auto.json';
const rows = JSON.parse(readFileSync(FILE, 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function geocode(q) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'ecorean-plans-pipeline/1.0 (https://ecorean.net)' } });
    const j = await res.json();
    if (j[0]) return { lat: +(+j[0].lat).toFixed(4), lng: +(+j[0].lon).toFixed(4) };
  } catch { /* null */ }
  return null;
}

const targets = [...new Set(rows.filter(r => r.lat == null).map(r => `${r.sido}|${r.gugun}|${r.addr}|${r.name}`))];
console.log(`🔎 좌표 없는 단지 ${targets.length}곳 재시도`);
const found = {};
for (const key of targets) {
  const [sido, gugun, addr, name] = key.split('|');
  const dong = (addr.match(/\(([^)]+)\)/) || [])[1] || '';
  const road = addr.replace(/\s*\([^)]*\)/, '').trim();
  const candidates = [
    road ? `${sido} ${gugun} ${road}` : null,
    dong ? `${sido} ${gugun} ${dong}` : null,
    `${sido} ${gugun} ${name}`,
    `${sido} ${gugun}`,
  ].filter(Boolean);
  for (const q of candidates) {
    const geo = await geocode(q); await sleep(1100);
    if (geo) { found[key] = geo; console.log(`  ✅ ${name} ← "${q}" → ${geo.lat},${geo.lng}`); break; }
  }
  if (!found[key]) console.log(`  ❌ ${name} — 전 후보 실패`);
}
let fixed = 0;
rows.forEach(r => {
  const geo = found[`${r.sido}|${r.gugun}|${r.addr}|${r.name}`];
  if (r.lat == null && geo) { r.lat = geo.lat; r.lng = geo.lng; fixed++; }
});
writeFileSync(FILE, JSON.stringify(rows, null, 1));
console.log(`✅ ${fixed}건 좌표 보정 (남은 null: ${rows.filter(r => r.lat == null).length}건)`);
