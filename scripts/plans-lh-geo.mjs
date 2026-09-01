// LH 단지명(지구명)으로 개략 좌표 — "남양주진접2 A3" → "남양주 진접" 검색. 지도 표기용 개략값이다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const UA = { 'User-Agent': 'ecorean-plans/1.0 (+https://ecorean.net; contact udunext7@gmail.com)' };
const list = JSON.parse(readFileSync('scripts/lh-structural-list.json', 'utf8'));
const out = existsSync('scripts/lh-geo.json') ? JSON.parse(readFileSync('scripts/lh-geo.json', 'utf8')) : {};
const SIDO = { 서울:'서울',부산:'부산',대구:'대구',인천:'인천',광주:'광주',대전:'대전',울산:'울산',세종:'세종',경기:'경기',강원:'강원',충북:'충북',충남:'충남',전북:'전북',전남:'전남',경북:'경북',경남:'경남',제주:'제주' };
const SHORT = { '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천','광주광역시':'광주','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종','경기도':'경기','강원특별자치도':'강원','강원도':'강원','충청북도':'충북','충청남도':'충남','전북특별자치도':'전북','전라북도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주' };
function complexOf(name, listNo) {
  let s = String(name || '').replace(/\.pdf$/i, '');
  s = s.replace(/구조\s*설계\s*도면|구조\s*도면|구조\s*도서|건설공사|_?공개용|\(공개\)|\(최종\)|최종|붙임\.?|공동주택|정비사업/g, ' ');
  return s.replace(/[\[\]()_]/g, ' ').replace(/\s+/g, ' ').trim() || `LH ${listNo}`;
}
// 지구명에서 검색어: 첫 토큰의 '시군명+읍면' 추정 — "남양주진접2"→"남양주 진접", "담양담양"→"담양", "철원갈말2"→"철원 갈말"
function queriesOf(cx) {
  const t = cx.split(' ')[0].replace(/d+$/, '');
  const qs = [];
  for (const n of [3, 2]) if (t.length > n) { const a = t.slice(0, n), b = t.slice(n); qs.push(a === b ? a : a + ' ' + b); }
  qs.push(t);
  return [...new Set(qs)];
}
for (const it of list) {
  if (out[it.list_no]) continue;
  const cx = complexOf(it.name, it.list_no);
  let hit = null, q = null;
  for (const cand of queriesOf(cx)) { q = cand;
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&addressdetails=1&q=' + encodeURIComponent(q), { headers: UA });
    const j = await r.json();
    if (j[0]) {
      const a = j[0].address || {};
      const sido = SHORT[a.state || a.province || ''] || SHORT[a.city || ''] || null;
      hit = { lat: +(+j[0].lat).toFixed(6), lng: +(+j[0].lon).toFixed(6), address: j[0].display_name.split(',').slice(0, 3).reverse().join(' ').trim(), sido, gugun: a.county || a.city || a.town || null };
    }
  } catch {}
  if (hit) break; await new Promise(s => setTimeout(s, 1100)); }
  out[it.list_no] = { complex: cx, query: q, ...(hit || { lat: null, lng: null }) };
  console.log(hit ? '  ✓' : '  ✗', cx, '←', q, hit ? hit.address : '');
  await new Promise(s => setTimeout(s, 1200));
}
writeFileSync('scripts/lh-geo.json', JSON.stringify(out, null, 1));
console.log('✅ 좌표', Object.values(out).filter(x => x.lat != null).length, '/', list.length);
