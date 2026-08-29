// 분양 페이지 이미지에서 '평면도 그림' 영역만 찾아낸다.
// 수집물은 도면 한 장이 아니라 머리 사진·사양표·유의사항이 붙은 마케팅 페이지다.
// 벽 좌표를 뽑으려면 먼저 도면 그림의 경계를 정확히 집어야 한다.
// 판정: 어두운 획이 이루는 덩어리 중 ① 충분히 크고 ② 수평·수직 획 비율이 높은 것.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

export async function detectRegions(file, opt = {}) {
  const srcMeta = await sharp(file).metadata();   // 축소 전 원본 크기 — 크롭 좌표 환산에 필요
  const W = opt.width || 700, DARK = opt.dark || 120, MINRUN = opt.minRun || 25;
  const { data, info } = await sharp(file).resize({ width: W }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, N = w * h;

  // 벽 후보 = 긴 수평/수직 획에 속한 어두운 픽셀 (글자·점선·사진 노이즈를 걸러낸다)
  const run = new Uint8Array(N);
  const mark = (idx, len, step, s) => { if (len >= MINRUN) for (let k = 0; k < len; k++) run[s + k * step] = 1; };
  for (let y = 0; y < h; y++) { let s = -1; for (let x = 0; x <= w; x++) { const d = x < w && data[y * w + x] < DARK; if (d && s < 0) s = x; if (!d && s >= 0) { mark(0, x - s, 1, y * w + s); s = -1; } } }
  for (let x = 0; x < w; x++) { let s = -1; for (let y = 0; y <= h; y++) { const d = y < h && data[y * w + x] < DARK; if (d && s < 0) s = y; if (!d && s >= 0) { mark(0, y - s, w, s * w + x); s = -1; } } }

  // 팽창 후 연결요소 — 끊긴 벽(문 개구부 등)을 하나의 도면으로 묶는다
  const R = opt.dilate || 6;
  const dil = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!run[y * w + x]) continue;
    for (let dy = -R; dy <= R; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -R; dx <= R; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; dil[yy * w + xx] = 1; } }
  }
  const lbl = new Int32Array(N).fill(-1);
  const boxes = [];
  const stack = [];
  for (let i = 0; i < N; i++) {
    if (!dil[i] || lbl[i] >= 0) continue;
    const id = boxes.length;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, cnt = 0, inkCnt = 0;
    stack.push(i); lbl[i] = id;
    while (stack.length) {
      const p = stack.pop(), px = p % w, py = (p / w) | 0;
      cnt++; if (run[p]) inkCnt++;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (dil[q] && lbl[q] < 0) { lbl[q] = id; stack.push(q); }
      }
    }
    boxes.push({ x0, y0, x1, y1, cnt, inkCnt });
  }
  const total = w * h;
  const regions = boxes
    .map(b => ({ ...b, bw: b.x1 - b.x0 + 1, bh: b.y1 - b.y0 + 1 }))
    .filter(b => b.bw > w * 0.25 && b.bh > 40 && b.cnt > total * 0.01)
    .sort((a, b) => b.cnt - a.cnt);
  return { w, h, regions, srcW: srcMeta.width, srcH: srcMeta.height };
}

if (process.argv[1]?.endsWith('plans-detect-region.mjs')) {
  const f = process.argv[2];
  const { w, h, regions } = await detectRegions(f);
  console.log(`${f} — 축소 ${w}x${h}, 후보 ${regions.length}개`);
  regions.slice(0, 8).forEach((r, i) => console.log(`  ${i}: x ${r.x0}~${r.x1} y ${r.y0}~${r.y1} (${r.bw}x${r.bh}) 잉크 ${r.inkCnt}`));
}
