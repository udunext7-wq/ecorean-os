// 도면 아닌 이미지(조감도·인테리어 사진·브랜드 페이지·일정표) 자동 판별
// 수집기 탐색을 넓히자 정밀도가 떨어져, 적재 전에 기계적으로 거를 기준이 필요해졌다.
// 특징 3가지: ① 흰 바탕 비율 ② 채도(사진일수록 높다) ③ 축 정렬 획 비율(도면일수록 높다)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const W = 400, DARK = 110, MINRUN = 18;

export async function features(file) {
  const { data, info } = await sharp(file).resize({ width: W }).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels, N = w * h;
  const g = new Uint8Array(N);
  let white = 0, satSum = 0;
  for (let i = 0; i < N; i++) {
    const r = data[i * ch], gg = data[i * ch + 1], b = data[i * ch + 2];
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    satSum += mx ? (mx - mn) / mx : 0;
    const lum = (r * 299 + gg * 587 + b * 114) / 1000;
    g[i] = lum;
    if (lum > 235 && mx - mn < 12) white++;
  }
  const run = new Uint8Array(N);
  const scan = (outer, inner, idx) => {
    for (let a = 0; a < outer; a++) { let s = -1;
      for (let b2 = 0; b2 <= inner; b2++) {
        const on = b2 < inner && g[idx(a, b2)] < DARK;
        if (on && s < 0) s = b2;
        if (!on && s >= 0) { if (b2 - s >= MINRUN) for (let k = s; k < b2; k++) run[idx(a, k)] = 1; s = -1; }
      } }
  };
  scan(h, w, (y, x) => y * w + x);
  scan(w, h, (x, y) => y * w + x);
  let dark = 0, inRun = 0;
  for (let i = 0; i < N; i++) if (g[i] < DARK) { dark++; if (run[i]) inRun++; }
  return { white: white / N, sat: satSum / N, axis: dark ? inRun / dark : 0, dark: dark / N };
}

// 판정 규칙 — 라벨(눈으로 확인한 표본)에 맞춰 정한 기준
export function isPlan(f) {
  if (f.white < 0.30) return false;   // 사진·조감도는 흰 여백이 거의 없다
  if (f.sat > 0.20) return false;     // 채도가 높으면 사진
  if (f.axis < 0.45) return false;    // 도면은 수평·수직 획이 지배적이다
  return true;
}

if (process.argv[1]?.endsWith('plans-junk-filter.mjs')) {
  const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
  const from = +(process.argv[2] || 0), to = +(process.argv[3] || rows.length);
  const out = [];
  for (let i = from; i < to; i++) {
    const f = await features(join('assets/plan-staging', rows[i].out));
    out.push({ i, store_path: rows[i].store_path, ...f, plan: isPlan(f) });
  }
  writeFileSync('scripts/lttot-junk.json', JSON.stringify(out, null, 1));
  console.log(`${out.length}장 — 도면 ${out.filter(o => o.plan).length} · 제외 ${out.filter(o => !o.plan).length}`);
}
