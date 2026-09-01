// LH 건축구조도면 PDF 전량 → MiniCAD 문서 (단위세대구조평면도 페이지마다 1건)
// 사용: node scripts/plans-lh-batch.mjs
// 출력: assets/plan-lh/<list_no>-p<N>.json · scripts/lh-parse-summary.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { listUnitPages, parseUnitPage, toDoc } from './plans-lh-parse.mjs';

const OUT = 'assets/plan-lh'; mkdirSync(OUT, { recursive: true });
const list = JSON.parse(readFileSync('scripts/lh-structural-list.json', 'utf8'));
const summary = [];
let files = 0, pages = 0, docs = 0, fail = 0;
for (const it of list) {
  const f = it.saved || `assets/plan-pdf/lh/lh-${it.list_no}.pdf`;
  if (!existsSync(f)) continue;
  files++;
  let lp;
  try { lp = await listUnitPages(f); } catch (e) { fail++; summary.push({ list_no: it.list_no, name: it.name, error: e.message.slice(0, 80) }); continue; }
  const rows = [];
  for (const p of lp.pages) {
    pages++;
    let r;
    try { r = await parseUnitPage(f, p.page); } catch (e) { r = { ok: false, reason: e.message.slice(0, 60) }; }
    if (!r.ok) { rows.push({ page: p.page, title: p.title, ok: false, reason: r.reason }); continue; }
    const doc = toDoc(r, { file: f, complex: it.name?.replace(/\.pdf$/i, '') || it.list_no });
    const out = `${OUT}/${it.list_no}-p${p.page}.json`;
    writeFileSync(out, JSON.stringify(doc));
    docs++;
    rows.push({ page: p.page, title: r.title, ok: true, verified: !!r.verified, warn: r.warn || [], walls: r.wallCount, scale: r.scale, scaleBasis: r.scaleBasis, longThick: r.longThick, coverage: r.coverage != null ? +r.coverage.toFixed(3) : null, widthMm: r.widthMm, heightMm: r.heightMm, clusters: r.clusters, json: out });
  }
  summary.push({ list_no: it.list_no, name: it.name, numPages: lp.numPages, unitPages: lp.pages.length, rows });
  console.log(`  ${basename(f)} — 페이지 ${lp.numPages} · 단위세대평면 ${lp.pages.length} · 문서 ${rows.filter(x => x.ok).length}`);
  writeFileSync('scripts/lh-parse-summary.json', JSON.stringify(summary, null, 1));
}
console.log(`✅ PDF ${files} · 단위세대평면 페이지 ${pages} · MiniCAD 문서 ${docs} · 실패 ${fail} → ${OUT}/`);
