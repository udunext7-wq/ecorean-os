// 벽 추출 파라미터 실험 — 고정 표본에서 재현율/정밀도를 재서 임계값을 정한다.
// 눈대중으로 임계를 바꾸면 한쪽이 좋아지고 다른 쪽이 나빠지는 걸 놓친다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SAMPLE = ['2023000178/84c.webp','2024000387/unit01.webp','2026000043/unit2.webp','2023000623/unit-84c.webp',
  '2024000572/unit01.webp','2025000448/unit-84a.webp','2024000573/unit03.webp','2026000301/unit06.webp',
  '2022000580/84b.webp','2025000660/unit02.webp'];
const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const by = {}; rows.forEach(r => by[r.store_path] = r);
const GT_DARK = 110;   // 정답(벽 잉크) 정의는 고정해 둔다 — 비교가 흔들리지 않게

async function score(sp, convert) {
  const r = by[sp]; if (!r) return null;
  const res = await convert(join('assets/plan-staging', r.out), { exclusive_area_m2: r.exclusive_area_m2 });
  if (!res.ok || !res.walls.length) return { recall: 0, prec: 0, walls: 0, verified: !!res.verified };
  const c = res.crop, mmpp = res.mm_per_px;
  const src = join('assets/plan-staging', r.out);
  const { data, info } = await sharp(src).extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    .resize({ width: Math.min(900, c.width) }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const px = mm => (mm / mmpp) * (res.work.w / c.width) * (c.width / res.work.w) * (w / c.width) * (c.width / res.work.w);
  const f = (w / res.work.w);                   // work px → 측정 px
  const minRun = Math.max(6, Math.round(Math.min(w, h) * 0.03));
  const ink = new Uint8Array(w * h);
  const scan = (outer, inner, idx) => {
    for (let a = 0; a < outer; a++) { let st = -1;
      for (let b = 0; b <= inner; b++) {
        const on = b < inner && data[idx(a, b)] < GT_DARK;
        if (on && st < 0) st = b;
        if (!on && st >= 0) { if (b - st >= minRun) for (let q = st; q < b; q++) ink[idx(a, q)] = 1; st = -1; }
      } } };
  scan(h, w, (y, x) => y * w + x);
  scan(w, h, (x, y) => y * w + x);
  const drawn = new Uint8Array(w * h);
  for (const wl of res.walls) {
    const x1 = (wl.x1 / mmpp) * f, y1 = (wl.y1 / mmpp) * f, x2 = (wl.x2 / mmpp) * f, y2 = (wl.y2 / mmpp) * f;
    const t = Math.max(1, (wl.thickness / mmpp) * f);
    const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))) || 1;
    for (let i = 0; i <= steps; i++) {
      const x = x1 + (x2 - x1) * i / steps, y = y1 + (y2 - y1) * i / steps;
      for (let dy = -t / 2; dy <= t / 2; dy++) for (let dx = -t / 2; dx <= t / 2; dx++) {
        const xx = Math.round(x + dx), yy = Math.round(y + dy);
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) drawn[yy * w + xx] = 1;
      } }
  }
  let inkN = 0, hit = 0, drawnN = 0, onInk = 0;
  for (let i = 0; i < w * h; i++) {
    if (ink[i]) { inkN++; if (drawn[i]) hit++; }
    if (drawn[i]) { drawnN++; if (ink[i]) onInk++; }
  }
  return { recall: inkN ? hit / inkN : 0, prec: drawnN ? onInk / drawnN : 0, walls: res.walls.length, verified: !!res.verified };
}

const dark = process.env.PLAN_DARK || '110';
const { convert } = await import('./plans-to-minicad.mjs');
let R = 0, P = 0, W = 0, V = 0, n = 0;
for (const sp of SAMPLE) {
  const s = await score(sp, convert);
  if (!s) continue;
  R += s.recall; P += s.prec; W += s.walls; V += s.verified ? 1 : 0; n++;
}
console.log(`DARK=${dark} → 재현 ${(R / n * 100).toFixed(1)}% · 정밀 ${(P / n * 100).toFixed(1)}% · 평균벽 ${(W / n).toFixed(0)} · 검증통과 ${V}/${n}`);
