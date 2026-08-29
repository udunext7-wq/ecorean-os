// 도면 성격 분류 — 직교 2D 평면도인지 3D 투시 렌더인지 가린다.
// 벡터 변환은 직교 2D 에만 적용해야 한다. 3D 렌더를 벽 좌표로 바꾸면 실제와 다른 도면이 된다.
// 판정: 어두운 획(벽)이 '긴 수평/수직 런'을 이루는 비율. 2D 도면은 높고, 아이소메트릭은 낮다.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const W = 900, DARK = 110, MINRUN = 40;   // 900px 기준 40px 이상 이어지면 '긴 획'

export async function classify(file) {
  const { data, info } = await sharp(file).resize({ width: W }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let dark = 0, inRun = 0;
  const runFlag = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {          // 수평 런
    let s = -1;
    for (let x = 0; x <= w; x++) {
      const d = x < w && data[y * w + x] < DARK;
      if (d && s < 0) s = x;
      if (!d && s >= 0) { if (x - s >= MINRUN) for (let k = s; k < x; k++) runFlag[y * w + k] = 1; s = -1; }
    }
  }
  for (let x = 0; x < w; x++) {          // 수직 런
    let s = -1;
    for (let y = 0; y <= h; y++) {
      const d = y < h && data[y * w + x] < DARK;
      if (d && s < 0) s = y;
      if (!d && s >= 0) { if (y - s >= MINRUN) for (let k = s; k < y; k++) runFlag[k * w + x] = 1; s = -1; }
    }
  }
  for (let i = 0; i < w * h; i++) { if (data[i] < DARK) { dark++; if (runFlag[i]) inRun++; } }
  return { darkRatio: dark / (w * h), axisRatio: dark ? inRun / dark : 0 };
}

if (process.argv[1]?.endsWith('plans-classify.mjs')) {
  const out = [];
  for (const r of rows) {
    const m = await classify(join('assets/plan-staging', r.out));
    out.push({ out: r.out, store_path: r.store_path, ...m });
  }
  writeFileSync('scripts/lttot-classify.json', JSON.stringify(out, null, 1));
  const b = { '직교 강함 ≥0.75': 0, '중간 0.5~0.75': 0, '약함 <0.5': 0 };
  out.forEach(o => { b[o.axisRatio >= 0.75 ? '직교 강함 ≥0.75' : o.axisRatio >= 0.5 ? '중간 0.5~0.75' : '약함 <0.5']++; });
  console.log(`${out.length}장 분류:`, b);
}
