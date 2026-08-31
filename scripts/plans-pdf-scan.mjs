// 벡터 도면 공급원 조사 — 분양 홈페이지의 PDF 를 전수 확인해 '선 좌표가 들어 있는 평면도' 가 있는지 센다.
// 배경: 픽셀 추출은 재현 46% 가 한계였다. 정확한 벽·치수는 벡터 원본에서만 나온다.
// 판정: 페이지에 path 연산이 많고(≥300) 이미지가 적고(≤3) 치수형 숫자(3~5자리)가 여럿이면 벡터 도면 페이지.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const UA = { 'User-Agent': 'Mozilla/5.0 ecorean-plans/1.0 (+https://ecorean.net)' };
const OUT = 'scripts/lttot-pdf-scan.json';
const DIR = 'assets/plan-pdf';
mkdirSync(DIR, { recursive: true });
const man = JSON.parse(readFileSync('scripts/lttot-manifest.json', 'utf8'));
const res = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const OPS = pdfjs.OPS;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function probe(buf) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= Math.min(doc.numPages, 80); p++) {
    const page = await doc.getPage(p);
    const ol = await page.getOperatorList();
    let paths = 0, imgs = 0;
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i];
      if (fn === OPS.constructPath) paths++;
      else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject || fn === OPS.paintImageMaskXObject) imgs++;
    }
    const tc = await page.getTextContent();
    const dims = tc.items.map(i => i.str.replace(/,/g, '').trim()).filter(s => /^\d{3,5}$/.test(s) && +s >= 300 && +s <= 20000).length;
    const vec = paths >= 300 && imgs <= 3 && dims >= 6;
    pages.push({ p, paths, imgs, dims, vec });
  }
  return { numPages: doc.numPages, vecPages: pages.filter(x => x.vec).map(x => x.p), pages: pages.slice(0, 12) };
}

let sites = 0, withPdf = 0, vecSites = 0;
for (const c of man) {
  if (res[c.house_manage_no]) { if (res[c.house_manage_no].pdfs?.length) withPdf++; if (res[c.house_manage_no].vec) vecSites++; sites++; continue; }
  const entry = { name: c.name, homepage: c.homepage, pdfs: [], vec: false };
  try {
    const r = await fetch(c.homepage, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const html = await r.text();
      const links = [...new Set((html.match(/["']([^"'<>]+\.pdf)(?:\?[^"']*)?["']/gi) || []).map(m => m.slice(1, -1).split('?')[0]))];
      for (const l of links.slice(0, 6)) {
        let u; try { u = new URL(l, r.url).href; } catch { continue; }
        const item = { url: u, kb: 0, numPages: 0, vecPages: [] };
        try {
          const pr = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40000) });
          if (pr.ok) {
            const buf = Buffer.from(await pr.arrayBuffer());
            item.kb = Math.round(buf.length / 1024);
            if (buf.length < 60 * 1024 * 1024) {
              const pb = await probe(buf);
              item.numPages = pb.numPages; item.vecPages = pb.vecPages; item.sample = pb.pages;
              if (pb.vecPages.length) {
                entry.vec = true;
                const fn = `${DIR}/${c.house_manage_no}-${entry.pdfs.length}.pdf`;
                writeFileSync(fn, buf); item.file = fn;
              }
            }
          }
        } catch (e) { item.err = String(e.message).slice(0, 60); }
        entry.pdfs.push(item);
        await sleep(400);
      }
    }
  } catch (e) { entry.err = String(e.message).slice(0, 60); }
  res[c.house_manage_no] = entry;
  sites++; if (entry.pdfs.length) withPdf++; if (entry.vec) vecSites++;
  writeFileSync(OUT, JSON.stringify(res, null, 1));
  if (sites % 10 === 0) console.log(`  … ${sites}/${man.length} · PDF 보유 ${withPdf} · 벡터 도면 ${vecSites}`);
  await sleep(500);
}
console.log(`✅ 단지 ${sites} · PDF 보유 ${withPdf} · 벡터 평면도 페이지 보유 ${vecSites} → ${OUT}`);
