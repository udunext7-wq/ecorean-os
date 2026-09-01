// LH 구조도면 변환본 → 라이브러리 게시 (Storage floor-plans/lh/ + floor_plans 행)
// 이미지(image_path)는 벡터 벽을 그린 썸네일 webp — 원본이 벡터라 이미지가 곧 도면이다.
// 사용: node scripts/plans-lh-publish.mjs [--dry]   (TOKEN_FILE 환경변수: 적재 토큰 파일)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY2ZxYmRndWJncHp1c2J0ZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODYzNjUsImV4cCI6MjA5Nzk2MjM2NX0.-AnRCk6rYwYCgQk-N82zmeBjpeuAnupHLtVZy6OUHrI';
const EP = 'https://gdcfqbdgubgpzusbtftf.supabase.co/functions/v1/plans-ingest';
const DRY = process.argv.includes('--dry');
const TOKEN = DRY ? '' : readFileSync(process.env.TOKEN_FILE, 'utf8').trim();

const summary = JSON.parse(readFileSync('scripts/lh-parse-summary.json', 'utf8'));
const geo = existsSync('scripts/lh-geo.json') ? JSON.parse(readFileSync('scripts/lh-geo.json', 'utf8')) : {};

// "구조설계도면(남양주진접2 A3).pdf" → "남양주진접2 A3" — 파일명에서 단지명만 남긴다
export function complexOf(name, listNo) {
  let s = String(name || '').replace(/\.pdf$/i, '');
  s = s.replace(/구조\s*설계\s*도면|구조\s*도면|구조\s*도서|건설공사|_?공개용|\(공개\)|\(최종\)|최종|붙임\.?|공동주택|정비사업/g, ' ');
  s = s.replace(/[\[\]()_]/g, ' ').replace(/\s+/g, ' ').trim();
  return s || `LH ${listNo}`;
}

function thumb(doc) {
  const W = doc.walls; if (!W.length) return null;
  const x0 = Math.min(...W.map(w => Math.min(w.x1, w.x2))) - 300, y0 = Math.min(...W.map(w => Math.min(w.y1, w.y2))) - 300;
  const x1 = Math.max(...W.map(w => Math.max(w.x1, w.x2))) + 300, y1 = Math.max(...W.map(w => Math.max(w.y1, w.y2))) + 300;
  const lines = W.map(w => `<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="#1A1814" stroke-width="${w.thickness}" stroke-linecap="square"/>`).join('');
  // mm 단위 viewBox 는 수만 px 로 래스터화돼 sharp 픽셀 상한을 넘는다 → 출력 크기를 명시한다
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${Math.max(200, Math.round(1200 * (y1 - y0) / (x1 - x0)))}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fbfaf6"/>${lines}</svg>`;
}

async function post(body) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(EP, { method: 'POST', headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, 'x-ingest-token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const txt = await r.text();
      if (r.ok) return { ok: true, txt };
      if (t === 2) return { ok: false, txt: r.status + ' ' + txt.slice(0, 100) };
    } catch (e) { if (t === 2) return { ok: false, txt: e.message }; }
    await new Promise(s => setTimeout(s, 800 * (t + 1)));
  }
}

let n = 0, ok = 0, fail = 0;
for (const site of summary) {
  const complex = complexOf(site.name, site.list_no);
  const g = geo[site.list_no] || {};
  // 같은 층 도면이 동(棟)마다 반복되는 단지가 많다 — 제목·크기·벽 수가 같은 것은 하나만 올린다
  const seen = new Set();
  for (const row of (site.rows || []).filter(r => r.ok && r.verified)) {
    const key = `${row.title}|${Math.round(row.widthMm / 200)}|${Math.round(row.heightMm / 200)}|${Math.round(row.walls / 5)}`;
    if (seen.has(key)) continue; seen.add(key);
    n++;
    const doc = JSON.parse(readFileSync(row.json, 'utf8'));
    if (!doc.meta.verified) continue;
    const svg = thumb(doc); if (!svg) continue;
    const imgPath = `lh/${site.list_no}/p${row.page}.webp`, docPath = `lh/${site.list_no}/p${row.page}.json`;
    const floor = (row.title.match(/\(([^)]*)\)/) || [])[1] || '';
    const meta = {
      complex_name: `LH ${complex}`, address: g.address || null, region_sido: g.sido || null, region_gugun: g.gugun || null,
      area_type: floor ? `${floor}${(row.title.match(/\)-(\d)/) || [])[1] ? ' -' + row.title.match(/\)-(\d)/)[1] : ''}` : null,
      source: 'public',
      source_note: `LH 건축구조도면공개 (CAD 벡터 원본 · 단위세대구조평면도 p${row.page}) · 축척 1/${row.scale} · 구조벽 ${row.walls}개 · 내력벽만(경량 칸막이 없음)`,
      lat: g.lat ?? null, lng: g.lng ?? null,
    };
    if (DRY) { console.log('[dry]', imgPath, meta.complex_name, meta.area_type, row.walls + '벽'); ok++; continue; }
    const webp = await sharp(Buffer.from(svg)).resize({ width: 1200 }).webp({ quality: 82 }).toBuffer();
    const r1 = await post({ path: `lttot/${imgPath}`, b64: webp.toString('base64'), meta });
    if (!r1.ok) { fail++; console.log('  ✗ img', imgPath, r1.txt); continue; }
    const r2 = await post({ path: `lttot/${docPath}`, image_path: `lttot/${imgPath}`, b64: Buffer.from(JSON.stringify(doc)).toString('base64'), walls: row.walls });
    if (!r2.ok) { fail++; console.log('  ✗ doc', docPath, r2.txt); continue; }
    ok++;
    if (ok % 20 === 0) console.log(`  … ${ok}/${n}`);
  }
}
console.log(`${DRY ? '[dry] ' : ''}✅ LH 문서 게시 ${ok} · 실패 ${fail} (대상 ${n})`);
