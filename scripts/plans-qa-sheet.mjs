// 수집 도면 검수용 컨택트시트 — 평면도가 아닌 이미지(조감도·마감재컷 등)가 섞였는지 한눈에 거른다.
// "가짜도면은 필요없다"(대표 지시)를 지키려면 적재 전에 눈으로 확인할 수단이 있어야 한다.
// 타일마다 lttot-plans.json 인덱스를 찍어 문제 도면을 바로 지목할 수 있게 한다.
// 사용: node scripts/plans-qa-sheet.mjs <출력디렉터리>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const COLS = 12, ROWS = 8, CW = 160, CH = 200, PER = COLS * ROWS;
const OUT = process.argv[2] || '.';

for (let s = 0; s * PER < rows.length; s++) {
  const chunk = rows.slice(s * PER, (s + 1) * PER);
  const tiles = [];
  for (const [i, r] of chunk.entries()) {
    const idx = s * PER + i;
    const left = (i % COLS) * CW + 3, top = Math.floor(i / COLS) * CH + 3;
    tiles.push({
      input: await sharp(join('assets/plan-staging', r.out))
        .resize({ width: CW - 6, height: CH - 6, fit: 'contain', background: '#fff' }).png().toBuffer(),
      left, top,
    });
    const label = '<svg width="50" height="20"><rect width="50" height="20" fill="#cc2222"/>'
      + '<text x="4" y="15" font-family="monospace" font-size="14" fill="#ffffff">' + idx + '</text></svg>';
    tiles.push({ input: Buffer.from(label), left, top });
  }
  const h = Math.ceil(chunk.length / COLS) * CH;
  await sharp({ create: { width: COLS * CW, height: h, channels: 3, background: '#dddddd' } })
    .composite(tiles).jpeg({ quality: 72 }).toFile(join(OUT, `sheet-${s + 1}.jpg`));
  console.log(`sheet-${s + 1}.jpg — ${chunk.length}장 (index ${s * PER}~${s * PER + chunk.length - 1})`);
}
