// 벡터 PDF 페이지에서 선·사각형·텍스트를 좌표 그대로 뽑는다 (픽셀 추측이 아닌 원본 좌표).
// pdfjs 연산자 목록을 따라가며 CTM(변환행렬)을 추적해 페이지 좌표(pt)로 환산한다.
// 사용: node scripts/plans-pdf-extract.mjs <pdf> <page> [out.svg]
import { readFileSync, writeFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const OPS = pdfjs.OPS;
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ap = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

export async function extractPage(file, pno) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;
  const page = await doc.getPage(pno);
  const vp = page.getViewport({ scale: 1 });
  const ol = await page.getOperatorList();
  const base = vp.transform;                     // PDF 좌표(원점 좌하) → 화면 좌표(원점 좌상)
  let ctm = base.slice(); const stack = [];
  let lineWidth = 1;
  const segs = [], rects = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i], args = ol.argsArray[i];
    if (fn === OPS.save) stack.push({ ctm: ctm.slice(), lineWidth });
    else if (fn === OPS.restore) { const s = stack.pop(); if (s) { ctm = s.ctm; lineWidth = s.lineWidth; } }
    else if (fn === OPS.transform) ctm = mul(ctm, args);
    else if (fn === OPS.setLineWidth) lineWidth = args[0];
    else if (fn === OPS.constructPath) {
      // pdfjs 6.x: args = [칠하기 연산, [경로 데이터 배열...], minMax]
      //  경로 데이터 = 태그 뒤에 좌표: 0 moveTo(x,y) 1 lineTo(x,y) 2 curveTo(6) 3 quadTo(4) 4 closePath
      const paintOp = args[0];
      const filled = paintOp !== OPS.stroke && paintOp !== OPS.closeStroke && paintOp !== OPS.endPath;
      if (paintOp === OPS.endPath) continue;
      const sx = Math.hypot(ctm[0], ctm[1]);
      for (const c of (args[1] || [])) {
        let k = 0, cur = null, start = null; const pts = [];
        while (k < c.length) {
          const tag = c[k++];
          if (tag === 0) { cur = ap(ctm, c[k], c[k + 1]); start = cur; pts.length = 0; pts.push(cur); k += 2; }
          else if (tag === 1) { const p = ap(ctm, c[k], c[k + 1]); if (cur) segs.push({ a: cur, b: p, lw: lineWidth * sx, filled }); cur = p; pts.push(p); k += 2; }
          else if (tag === 2) { const p = ap(ctm, c[k + 4], c[k + 5]); if (cur) segs.push({ a: cur, b: p, lw: lineWidth * sx, filled }); cur = p; pts.push(p); k += 6; }
          else if (tag === 3) { const p = ap(ctm, c[k + 2], c[k + 3]); if (cur) segs.push({ a: cur, b: p, lw: lineWidth * sx, filled }); cur = p; pts.push(p); k += 4; }
          else if (tag === 4) {
            if (cur && start) segs.push({ a: cur, b: start, lw: lineWidth * sx, filled });
            // 닫힌 4점 경로 = 사각형(채움 사각형은 벽 후보)
            if (pts.length === 4 || (pts.length === 5 && Math.hypot(pts[4].x - pts[0].x, pts[4].y - pts[0].y) < 0.01)) rects.push({ p: pts.slice(0, 4), lw: lineWidth * sx, filled });
            cur = start;
          } else break;
        }
      }
    }
  }
  const tc = await page.getTextContent();
  const texts = tc.items.filter(t => t.str.trim()).map(t => {
    const m = mul(base, t.transform); return { str: t.str, x: m[4], y: m[5], size: Math.hypot(m[0], m[1]) };
  });
  return { width: vp.width, height: vp.height, segs, rects, texts };
}

export function toSVG(d) {
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}"><rect width="100%" height="100%" fill="#fff"/>`];
  for (const r of d.rects) parts.push(`<polygon points="${r.p.map(q => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ')}" fill="${r.filled ? '#222' : 'none'}" stroke="#222" stroke-width="${Math.max(0.3, r.lw).toFixed(2)}"/>`);
  for (const s of d.segs) parts.push(`<line x1="${s.a.x.toFixed(1)}" y1="${s.a.y.toFixed(1)}" x2="${s.b.x.toFixed(1)}" y2="${s.b.y.toFixed(1)}" stroke="${s.filled ? '#000' : '#333'}" stroke-width="${Math.max(0.3, s.lw).toFixed(2)}"/>`);
  for (const t of d.texts) parts.push(`<text x="${t.x.toFixed(1)}" y="${t.y.toFixed(1)}" font-size="${Math.max(3, t.size).toFixed(1)}" fill="#c00">${esc(t.str)}</text>`);
  parts.push('</svg>');
  return parts.join('');
}

if (process.argv[1]?.endsWith('plans-pdf-extract.mjs')) {
  const [file, pno, out] = process.argv.slice(2);
  const d = await extractPage(file, +pno);
  const dims = d.texts.filter(t => /^\d{1,2},?\d{3}$/.test(t.str.trim())).length;
  console.log(`p${pno} ${Math.round(d.width)}x${Math.round(d.height)} · 선 ${d.segs.length} · 사각 ${d.rects.length} · 텍스트 ${d.texts.length} (치수형 ${dims})`);
  if (out) writeFileSync(out, toSVG(d));
}
