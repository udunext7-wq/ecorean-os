import { readFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const data = new Uint8Array(readFileSync(process.argv[2]));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
console.log('페이지', doc.numPages);
const OPS = pdfjs.OPS;
for (let p = 1; p <= Math.min(doc.numPages, 6); p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const ol = await page.getOperatorList();
  let paths = 0, rects = 0, imgs = 0, txt = 0;
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i];
    if (fn === OPS.constructPath) { paths++; const a = Array.from(ol.argsArray[i][0] || []); rects += a.filter(o => o === OPS.rectangle).length; }
    else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) imgs++;
    else if (fn === OPS.showText || fn === OPS.showSpacedText) txt++;
  }
  const tc = await page.getTextContent();
  const nums = tc.items.map(i => i.str).filter(s => /^\d{3,5}$/.test(s.trim())).slice(0, 12);
  console.log(`p${p} ${Math.round(vp.width)}x${Math.round(vp.height)} · path ${paths} (rect ${rects}) · img ${imgs} · text ${txt} · 숫자표본 ${nums.join(' ')}`);
}
