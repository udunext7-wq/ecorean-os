// 싱크로율 측정 — 도면의 '벽 잉크' 중 몇 %를 벽 좌표로 잡아냈는지(재현율),
// 그리고 내가 그린 벽 중 몇 %가 실제 잉크 위에 있는지(정밀도)를 잰다.
// "벽이 선 위에 있나" 만 보면 빠뜨린 벽을 놓친다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const by = {}; rows.forEach(r => by[r.store_path] = r);
const sum = JSON.parse(readFileSync('scripts/lttot-minicad.json', 'utf8')).filter(s => s.ok && s.verified);
const N = +(process.argv[2] || 20);
const DARK = 110;

sum.sort((a, b) => a.walls - b.walls);
const pick = [];
for (let i = 0; i < N && i < sum.length; i++) pick.push(sum[Math.floor(i * sum.length / N)]);

let rSum = 0, pSum = 0, n = 0;
for (const s of pick) {
  const r = by[s.store_path]; if (!r) continue;
  const doc = JSON.parse(readFileSync(join('assets/plan-minicad', s.json), 'utf8'));
  const c = doc.meta.background.crop, mmpp = doc.meta.mm_per_px;
  const src = join('assets/plan-staging', r.out);
  const im = await sharp(src).metadata();
  const ew = Math.min(c.width, im.width - c.left), eh = Math.min(c.height, im.height - c.top);
  const W = Math.min(900, ew);
  const { data, info } = await sharp(src).extract({ left: c.left, top: c.top, width: ew, height: eh })
    .resize({ width: W }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const k = w / ew * (ew / c.width);          // 크롭 px → 측정 해상도
  const scale = (w / ew) * (ew / (c.width)) * (c.width / (c.width));   // = w/ew
  const px = mm => (mm / mmpp) * (c.width / Math.round(c.width * (mmpp / doc.meta.background.mm_per_px))) * (w / ew);

  // 실제 '벽 잉크' = 어두우면서 긴 축 정렬 획에 속한 픽셀 (글자·가구선 제외)
  const minRun = Math.max(6, Math.round(Math.min(w, h) * 0.03));
  const ink = new Uint8Array(w * h);
  const scan = (outer, inner, idx) => {
    for (let a = 0; a < outer; a++) { let st = -1;
      for (let b = 0; b <= inner; b++) {
        const on = b < inner && data[idx(a, b)] < DARK;
        if (on && st < 0) st = b;
        if (!on && st >= 0) { if (b - st >= minRun) for (let q = st; q < b; q++) ink[idx(a, q)] = 1; st = -1; }
      } }
  };
  scan(h, w, (y, x) => y * w + x);
  scan(w, h, (x, y) => y * w + x);

  // 내가 그린 벽을 같은 해상도로 칠한다
  const drawn = new Uint8Array(w * h);
  for (const wl of doc.walls) {
    const x1 = px(wl.x1), y1 = px(wl.y1), x2 = px(wl.x2), y2 = px(wl.y2);
    const t = Math.max(1, px(wl.thickness));
    const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)));
    for (let i = 0; i <= steps; i++) {
      const x = x1 + (x2 - x1) * i / steps, y = y1 + (y2 - y1) * i / steps;
      for (let dy = -t / 2; dy <= t / 2; dy++) for (let dx = -t / 2; dx <= t / 2; dx++) {
        const xx = Math.round(x + dx), yy = Math.round(y + dy);
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) drawn[yy * w + xx] = 1;
      }
    }
  }
  let inkN = 0, hit = 0, drawnN = 0, onInk = 0;
  for (let i = 0; i < w * h; i++) {
    if (ink[i]) { inkN++; if (drawn[i]) hit++; }
    if (drawn[i]) { drawnN++; if (ink[i]) onInk++; }
  }
  const recall = inkN ? hit / inkN : 0, prec = drawnN ? onInk / drawnN : 0;
  rSum += recall; pSum += prec; n++;
  console.log(`  재현 ${(recall * 100).toFixed(0)}% · 정밀 ${(prec * 100).toFixed(0)}%  벽${s.walls}  ${s.store_path}`);
}
console.log(`\n평균 — 재현율 ${(rSum / n * 100).toFixed(1)}% (도면 벽 중 잡아낸 비율) · 정밀도 ${(pSum / n * 100).toFixed(1)}% (그린 벽이 실제 벽 위인 비율) · ${n}장`);
