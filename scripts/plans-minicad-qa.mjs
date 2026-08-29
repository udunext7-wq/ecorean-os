// 변환 검수 — 만들어진 MiniCAD 벽 좌표를 원본 도면 위에 겹쳐 그린다.
// 벽이 도면과 어긋나면 견적이 통째로 틀리므로, 눈으로 대조할 수단이 반드시 있어야 한다.
// 사용: node scripts/plans-minicad-qa.mjs <store_path(.webp)> <출력png>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const rows = JSON.parse(readFileSync('scripts/lttot-plans.json', 'utf8'));
const sp = process.argv[2], out = process.argv[3];
const row = rows.find(r => r.store_path === sp);
if (!row) { console.error('행 없음: ' + sp); process.exit(1); }
const doc = JSON.parse(readFileSync(join('assets/plan-minicad', sp.replace(/\.webp$/, '.json')), 'utf8'));
const bg = doc.meta.background, mmpp = doc.meta.mm_per_px;
const c = bg.crop;
const base = sharp(join('assets/plan-staging', row.out)).extract({ left: c.left, top: c.top, width: c.width, height: c.height });
const meta = await base.clone().metadata();
// 벽 mm → 작업 해상도 px → 크롭 px
const workW = Math.round(c.width * (doc.meta.mm_per_px / bg.mm_per_px));
const k = c.width / workW;
const seg = doc.walls.map(w => {
  const x1 = (w.x1 / mmpp) * k, y1 = (w.y1 / mmpp) * k, x2 = (w.x2 / mmpp) * k, y2 = (w.y2 / mmpp) * k;
  const t = Math.max(2, (w.thickness / mmpp) * k);
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#e11" stroke-width="${t.toFixed(1)}" stroke-opacity="0.5"/>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}">${seg.join('')}</svg>`;
await base.composite([{ input: Buffer.from(svg) }]).png().toFile(out);
console.log(`${sp} — 벽 ${doc.walls.length} · 검증 ${doc.meta.verified} · mm/px ${mmpp.toFixed(2)} → ${out}`);
