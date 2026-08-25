// 표준 평면도 SVG 에 도어·창호 심볼 표기 (2026-08-25 대표 지시)
// data/std-*.json 의 openings(mm) 를 img/std-*.svg 위에 도어 스윙 호·창호 이중선으로 그려 넣는다.
// 멱등: 기존 <g id="openings"> 블록을 제거 후 재삽입. 외곽 경계 rect(stroke-width 5) 뒤에 삽입해
// 벽선(2px)·경계선(5px) 위에 개구부 갭이 얹히도록 한다. 방 rect 파싱 정규식에는 영향 없음.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const IMG = 'sites/net/public/catalog/plans/img';
const DATA = 'sites/net/public/catalog/plans/data';
const S = 56 / 1000; // mm → px
const PADL = 46, PADT = 41.4;
const GAP = '#fdfcf6', LINE = '#3a352c';

let done = 0;
for (const file of readdirSync(IMG).filter(f => /^(std|cx)-.*.svg$/.test(f))) {
  const slug = basename(file, '.svg');
  let json;
  try { json = JSON.parse(readFileSync(join(DATA, `${slug}.json`), 'utf8')); }
  catch { console.warn(`⚠ ${slug}: JSON 없음 — 건너뜀`); continue; }
  const openings = json.openings || [];
  if (!openings.length) { console.warn(`⚠ ${slug}: openings 없음`); continue; }

  const centroid = id => {
    const sp = json.spaces.find(s => s.id === id);
    if (!sp) return null;
    const xs = sp.polygon.map(p => p.x), ys = sp.polygon.map(p => p.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  };
  const r1 = v => Math.round(v * 10) / 10;

  let g = `<g id="openings">\n`;
  for (const o of openings) {
    const X = r1(PADL + o.x * S), Y = r1(PADT + o.y * S), w = r1(o.width_mm * S);
    const c = centroid(o.spaceId) || { x: o.x, y: o.y - 1 };
    if (o.type === 'DOOR') {
      const sw = o.subType === 'entry' ? 1.6 : 1.2;
      if (o.angle % 180 === 0) { // 수평 벽
        const dir = c.y > o.y ? 1 : -1; // 문이 열리는 방(공간 중심) 방향
        const hx = r1(X - w / 2), jx = r1(X + w / 2), ly = r1(Y + dir * w);
        g += `<rect x="${hx}" y="${Y - 3.5}" width="${w}" height="7" fill="${GAP}"/>\n`;
        g += `<path d="M ${hx} ${Y} L ${hx} ${ly} A ${w} ${w} 0 0 ${dir > 0 ? 0 : 1} ${jx} ${Y}" fill="none" stroke="${LINE}" stroke-width="${sw}"/>\n`;
      } else { // 수직 벽
        const dir = c.x > o.x ? 1 : -1;
        const hy = r1(Y - w / 2), jy = r1(Y + w / 2), lx = r1(X + dir * w);
        g += `<rect x="${X - 3.5}" y="${hy}" width="7" height="${w}" fill="${GAP}"/>\n`;
        g += `<path d="M ${X} ${hy} L ${lx} ${hy} A ${w} ${w} 0 0 ${dir > 0 ? 1 : 0} ${X} ${jy}" fill="none" stroke="${LINE}" stroke-width="${sw}"/>\n`;
      }
    } else { // WINDOW — 갭 + 이중선 + 양끝 잼 눈금
      if (o.angle % 180 === 0) {
        const x1 = r1(X - w / 2), x2 = r1(X + w / 2);
        g += `<rect x="${x1}" y="${Y - 3.5}" width="${w}" height="7" fill="${GAP}"/>\n`;
        g += `<line x1="${x1}" y1="${Y - 1.8}" x2="${x2}" y2="${Y - 1.8}" stroke="${LINE}" stroke-width="1"/>\n`;
        g += `<line x1="${x1}" y1="${Y + 1.8}" x2="${x2}" y2="${Y + 1.8}" stroke="${LINE}" stroke-width="1"/>\n`;
        g += `<line x1="${x1}" y1="${Y - 4}" x2="${x1}" y2="${Y + 4}" stroke="${LINE}" stroke-width="1.4"/>\n`;
        g += `<line x1="${x2}" y1="${Y - 4}" x2="${x2}" y2="${Y + 4}" stroke="${LINE}" stroke-width="1.4"/>\n`;
      } else {
        const y1 = r1(Y - w / 2), y2 = r1(Y + w / 2);
        g += `<rect x="${X - 3.5}" y="${y1}" width="7" height="${w}" fill="${GAP}"/>\n`;
        g += `<line x1="${X - 1.8}" y1="${y1}" x2="${X - 1.8}" y2="${y2}" stroke="${LINE}" stroke-width="1"/>\n`;
        g += `<line x1="${X + 1.8}" y1="${y1}" x2="${X + 1.8}" y2="${y2}" stroke="${LINE}" stroke-width="1"/>\n`;
        g += `<line x1="${X - 4}" y1="${y1}" x2="${X + 4}" y2="${y1}" stroke="${LINE}" stroke-width="1.4"/>\n`;
        g += `<line x1="${X - 4}" y1="${y2}" x2="${X + 4}" y2="${y2}" stroke="${LINE}" stroke-width="1.4"/>\n`;
      }
    }
  }
  g += `</g>\n`;

  let svg = readFileSync(join(IMG, file), 'utf8');
  svg = svg.replace(/<g id="openings">[\s\S]*?<\/g>\n?/, '');
  const anchor = svg.match(/<rect [^>]*stroke-width="5"\/>\n?/);
  if (!anchor) { console.error(`❌ ${slug}: 외곽 경계 rect 없음`); continue; }
  svg = svg.replace(anchor[0], anchor[0] + g);
  writeFileSync(join(IMG, file), svg);
  done++;
  console.log(`✅ ${slug}: 문 ${openings.filter(o => o.type === 'DOOR').length} · 창 ${openings.filter(o => o.type === 'WINDOW').length} 표기`);
}
console.log(`\n${done}개 SVG 개구부 표기 완료`);
