// 면적 기반 스케일 검증 — 벽 조각 사이 '틈'(문·창 개구부) 분포를 mm 로 환산해 본다.
// 한국 실내문은 800~900mm 로 표준화돼 있어, 스케일이 맞다면 그 근처에 봉우리가 있어야 한다.
// 봉우리가 체계적으로 작게 나오면 면적 기준 스케일이 그만큼 작다는 뜻이다.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { detectRegions } from './plans-detect-region.mjs';

const DARK = 110;
function bandsOf(mask, w, h, horiz, minLen, maxThick) {
  const at = (x, y) => mask[y * w + x];
  const out = [], seen = new Uint8Array(w * h);
  const A = horiz ? h : w, B = horiz ? w : h;
  for (let a = 0; a < A; a++) {
    let s = -1;
    for (let b = 0; b <= B; b++) {
      const on = b < B && (horiz ? at(b, a) : at(a, b));
      if (on && s < 0) s = b;
      if (!on && s >= 0) {
        const len = b - s;
        if (len >= minLen) {
          let t = 0;
          while (a + t < A) { let cov = 0;
            for (let k = s; k < b; k++) if (horiz ? at(k, a + t) : at(a + t, k)) cov++;
            if (cov < len * 0.8) break; t++; }
          if (t >= 1 && t <= maxThick) {
            let dup = false;
            for (let k = s; k < b && !dup; k++) if (horiz ? seen[a * w + k] : seen[k * w + a]) dup = true;
            if (!dup) {
              for (let tt = 0; tt < t; tt++) for (let k = s; k < b; k++) {
                if (horiz) { if (a + tt < h) seen[(a + tt) * w + k] = 1; }
                else { if (a + tt < w) seen[k * w + a + tt] = 1; } }
              out.push({ a1: s, a2: b, c: a + t / 2, t });
            }
          }
        }
        s = -1;
      }
    }
  }
  return out;
}
// 같은 선 위 조각들 사이의 '틈' 을 모은다
function gapsOf(list, tol, maxGap) {
  const byLine = new Map();
  for (const s of list) {
    let key = null;
    for (const k of byLine.keys()) if (Math.abs(k - s.c) <= tol) { key = k; break; }
    if (key == null) { key = s.c; byLine.set(key, []); }
    byLine.get(key).push(s);
  }
  const gaps = [];
  for (const arr of byLine.values()) {
    arr.sort((a, b) => a.a1 - b.a1);
    for (let i = 1; i < arr.length; i++) {
      const g = arr[i].a1 - arr[i - 1].a2;
      if (g > 2 && g <= maxGap) gaps.push(g);
    }
  }
  return gaps;
}

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const sum = JSON.parse(readFileSync('scripts/lttot-minicad.json', 'utf8')).filter(x => x.ok && x.verified);
const byPath = {}; rows.forEach(r => byPath[r.store_path] = r);
const LIMIT = +(process.argv[2] || 40);

const all = [];
for (const s of sum.slice(0, LIMIT)) {
  const r = byPath[s.store_path]; if (!r) continue;
  const file = join('assets/plan-staging', r.out);
  const { regions, srcW, w: dw } = await detectRegions(file, { dilate: 14 });
  if (!regions.length) continue;
  const k = srcW / dw, pad = 6, g0 = regions[0];
  const meta = await sharp(file).metadata();
  const L = Math.max(0, Math.round((g0.x0 - pad) * k)), T = Math.max(0, Math.round((g0.y0 - pad) * k));
  const Wd = Math.min(meta.width - L, Math.round((g0.bw + pad * 2) * k));
  const Hd = Math.min(meta.height - T, Math.round((g0.bh + pad * 2) * k));
  if (Wd < 60 || Hd < 60) continue;
  const { data, info } = await sharp(file).extract({ left: L, top: T, width: Wd, height: Hd })
    .resize({ width: Math.min(1000, Wd) }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = data[i] < DARK ? 1 : 0;
  const minLen = Math.round(Math.min(w, h) * 0.03), maxThick = Math.round(Math.min(w, h) * 0.05);
  const hb = bandsOf(mask, w, h, true, minLen, maxThick), vb = bandsOf(mask, w, h, false, minLen, maxThick);
  const tol = Math.max(2, maxThick / 2);
  const gaps = gapsOf(hb, tol, w * 0.25).concat(gapsOf(vb, tol, h * 0.25));
  const mm = gaps.map(g => g * s.mm_per_px).filter(v => v >= 300 && v <= 3000);
  all.push(...mm);
}
all.sort((a, b) => a - b);
const hist = {};
all.forEach(v => { const b = Math.round(v / 100) * 100; hist[b] = (hist[b] || 0) + 1; });
console.log(`표본 ${all.length}개 (도면 ${Math.min(LIMIT, sum.length)}장)`);
console.log('개구부 폭 분포(mm):', JSON.stringify(hist));
const door = all.filter(v => v >= 600 && v <= 1300).sort((a, b) => a - b);
console.log('문 구간(600~1300mm) 중앙값:', door.length ? Math.round(door[door.length >> 1]) : '-', '· 개수', door.length);
