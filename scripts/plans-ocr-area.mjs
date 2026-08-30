// 도면에 인쇄된 전용면적을 직접 읽어 주택형을 확정한다.
// 2026-08-30 대표 지시: "전체 도면들을 미니캐드로 만드는 작업을해라 정확도가 높아야한다"
//
// 왜 필요한가: 파일명이 순번(unit01)뿐인 도면이 많아 주택형을 '순서'로 짐작해 왔다.
// 그러면 면적이 틀리고, 면적으로 스케일을 잡는 변환기가 통째로 틀어진다.
// 도면에는 전용면적이 소수 4자리로 인쇄돼 있으니, 읽어서 청약홈 주택형과 대조하면 확정된다.
// 확정 조건은 '소수 4자리까지 일치' 하나뿐이라, 잘못 읽은 값이 우연히 통과할 여지가 없다.
//
// 사용: node scripts/plans-ocr-area.mjs [--limit N] [--force]
// 출력: scripts/lttot-ocr.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const OUT = 'scripts/lttot-ocr.json';
const ARG = process.argv.slice(2);
const LIMIT = ARG.includes('--limit') ? +ARG[ARG.indexOf('--limit') + 1] : Infinity;
const FORCE = ARG.includes('--force');

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const models = JSON.parse(readFileSync('scripts/lttot-models.json', 'utf8'));
const manifest = JSON.parse(readFileSync('scripts/lttot-manifest.json', 'utf8'));
const hmBySlug = {}; manifest.forEach(c => hmBySlug[c.slug] = c.house_manage_no);
const cache = !FORCE && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};

const NUM = /\d{1,4}\.\d{2,4}/g;
// 앞 글자(㎡ 기호·머리표·괄호)를 숫자로 붙여 읽는 일이 잦다: "184.9079" ← 84.9079
// 후보를 넓혀 두고, 확정은 주택형과 정확히 일치할 때만 한다.
function expand(list) {
  const out = new Set();
  for (const t of list) {
    const v = Number(t);
    if (v >= 15 && v <= 300) out.add(v);
    for (const k of [1, 2]) {
      if (t.length > 4 + k) {
        const c = Number(t.slice(k));
        if (c >= 15 && c <= 300) out.add(c);
      }
    }
  }
  return [...out];
}

const worker = await createWorker('eng');
await worker.setParameters({ tessedit_char_whitelist: '0123456789.m2ABCDEFPT ' });

let done = 0, hit = 0, miss = 0;
for (const r of rows) {
  if (done >= LIMIT) break;
  if (cache[r.store_path]) continue;
  done++;

  const read = async (width) => {
    try {
      const buf = await sharp(join('assets/plan-staging', r.out))
        .resize({ width, withoutEnlargement: true }).grayscale().normalise().png().toBuffer();
      const { data } = await worker.recognize(buf);
      return data.text.match(NUM) || [];
    } catch { return []; }
  };
  const mdl = models[hmBySlug[r.slug]] || [];
  const fileLetter = (r.area_type || '').replace(/^\d+/, '').toUpperCase();
  const match = (nums) => {
    let b = null;
    for (const n of nums) for (const m of mdl) {
      if (Math.abs(m.area - n) <= 0.02) {
        const sc = (fileLetter && m.letter === fileLetter) ? 2 : 1;
        if (!b || sc > b.score) b = { score: sc, area: m.area, house_ty: m.house_ty, letter: m.letter };
      }
    }
    return b;
  };

  let raw = await read(1500);
  let nums = expand(raw);
  let best = match(nums);
  if (!best) { raw = raw.concat(await read(2200)); nums = expand(raw); best = match(nums); } // 더 크게 다시 읽는다

  cache[r.store_path] = best
    ? { area: best.area, house_ty: best.house_ty, letter: best.letter, source: 'ocr+api', nums: nums.slice(0, 8) }
    : { area: null, source: nums.length ? 'ocr-only' : 'none', nums: nums.slice(0, 8) };
  best ? hit++ : miss++;
  if (done % 25 === 0) { writeFileSync(OUT, JSON.stringify(cache, null, 1)); console.log(`  … ${done} (확정 ${hit} / 미상 ${miss})`); }
}
await worker.terminate();
writeFileSync(OUT, JSON.stringify(cache, null, 1));
console.log(`✅ OCR ${done}장 — 주택형 확정 ${hit} · 미상 ${miss} → ${OUT}`);
