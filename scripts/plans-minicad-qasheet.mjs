// 변환 검수 시트 — 여러 도면의 '원본 + 추출한 벽' 을 한 장에 모아 적중률을 눈으로 잰다.
// 표본 몇 장만 보고 판단하면 안 된다(그러다 틀린 변환을 놓쳤다).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const byPath = {}; rows.forEach(r => byPath[r.store_path] = r);
const sum = JSON.parse(readFileSync('scripts/lttot-minicad.json', 'utf8')).filter(s => s.ok && s.verified);
const OUT = process.argv[2] || '.';
const N = +(process.argv[3] || 24);
const COLS = 6, CW = 300, CH = 340;

// 고르게 뽑는다 (벽 개수 순으로 정렬 후 등간격)
sum.sort((a, b) => a.walls - b.walls);
const pick = [];
for (let i = 0; i < N && i < sum.length; i++) pick.push(sum[Math.floor(i * sum.length / N)]);

const tiles = [];
for (const [i, s] of pick.entries()) {
  const r = byPath[s.store_path]; if (!r) continue;
  const doc = JSON.parse(readFileSync(join('assets/plan-minicad', s.json), 'utf8'));
  const c = doc.meta.background.crop, mmpp = doc.meta.mm_per_px;
  const src = join('assets/plan-staging', r.out);
  const im = await sharp(src).metadata();
  // 크롭이 이미지 밖으로 나가면 sharp 가 죽는다 — 실제 잘리는 크기로 맞춘다
  const ew = Math.min(c.width, im.width - c.left), eh = Math.min(c.height, im.height - c.top);
  if (ew < 20 || eh < 20) { console.warn('크롭 범위 이상:', s.store_path); continue; }
  const base = sharp(src).extract({ left: c.left, top: c.top, width: ew, height: eh });
  const workW = Math.round(c.width * (mmpp / doc.meta.background.mm_per_px));
  const k = c.width / workW;
  const seg = doc.walls.map(w => {
    const x1 = (w.x1 / mmpp) * k, y1 = (w.y1 / mmpp) * k, x2 = (w.x2 / mmpp) * k, y2 = (w.y2 / mmpp) * k;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#e11" stroke-width="${Math.max(2, (w.thickness / mmpp) * k).toFixed(1)}" stroke-opacity="0.5"/>`;
  }).join('');
  const over = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ew}" height="${eh}">${seg}</svg>`);
  // sharp 는 호출 순서와 무관하게 resize 를 composite 보다 먼저 적용한다
  //  → 겹치기와 축소를 한 체인에 두면 오버레이가 커져서 실패한다. 두 단계로 나눈다.
  let png;
  try {
    const merged = await base.composite([{ input: over }]).png().toBuffer();
    png = await sharp(merged).resize({ width: CW - 8, height: CH - 26, fit: 'contain', background: '#fff' }).png().toBuffer();
  } catch (e) {
    console.warn('겹치기 실패:', s.store_path, e.message);
    continue;
  }
  const left = (i % COLS) * CW + 4, top = Math.floor(i / COLS) * CH + 22;
  tiles.push({ input: png, left, top });
  const label = `<svg width="${CW}" height="20"><rect width="${CW}" height="20" fill="#222"/>` +
    `<text x="4" y="14" font-family="monospace" font-size="12" fill="#fff">${s.store_path} · 벽${s.walls} · 문${Math.round(s.doorMed || 0)}mm</text></svg>`;
  tiles.push({ input: Buffer.from(label), left: (i % COLS) * CW, top: Math.floor(i / COLS) * CH });
}
const h = Math.ceil(pick.length / COLS) * CH;
await sharp({ create: { width: COLS * CW, height: h, channels: 3, background: '#dddddd' } })
  .composite(tiles).jpeg({ quality: 80 }).toFile(join(OUT, 'minicad-qa.jpg'));
console.log(`minicad-qa.jpg — ${pick.length}장 (벽 ${pick[0].walls}~${pick[pick.length - 1].walls}개)`);
