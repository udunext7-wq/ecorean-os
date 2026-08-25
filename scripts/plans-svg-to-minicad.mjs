// 표준 평면도 SVG → MiniCAD 도면 JSON 변환 (2026-08-25 대표 지시)
// /catalog/plans/img/std-*.svg 의 방 rect(mm 정합 56px/m)를 ECOREAN.FloorPlan 공간·벽 데이터로 변환.
// 출력: /catalog/plans/data/std-*.json — MiniCAD ?plan= 로더가 applyLoadedData 로 실제 객체 생성.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const IMG = 'sites/net/public/catalog/plans/img';
const OUT = 'sites/net/public/catalog/plans/data';
mkdirSync(OUT, { recursive: true });

// 방 이름 → MiniCAD SPACE_TYPES 키
const TYPE_MAP = [
  [/^발코니/, 'BALCONY'],
  [/욕실/, 'BATHROOM'],           // 욕실·공용욕실·부부욕실
  [/^거실/, 'LIVING'],            // 거실·거실:식당·거실:주방 (거실 우선)
  [/주방|식당/, 'KITCHEN'],       // 주방·주방:식당
  [/^현관/, 'ENTRANCE'],          // 현관·현관:복도
  [/^복도/, 'CORRIDOR'],
  [/드레스룸/, 'DRESSING'],
  [/다용도실/, 'UTILITY'],
  [/팬트리/, 'PANTRY'],
  [/원룸|안방|침실|^방/, 'ROOM'],
];
function toType(name) {
  for (const [re, t] of TYPE_MAP) if (re.test(name)) return t;
  return 'ROOM';
}

let totalPlans = 0, totalSpaces = 0;
for (const file of readdirSync(IMG).filter(f => /^std-.*\.svg$/.test(f))) {
  const svg = readFileSync(join(IMG, file), 'utf8');
  const slug = basename(file, '.svg');

  // 외곽 경계 (stroke-width="5") — 원점·스케일 기준
  const outer = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*stroke-width="5"/);
  if (!outer) { console.error(`❌ ${file}: 외곽 rect 없음`); continue; }
  const [ox, oy, ow, oh] = outer.slice(1, 5).map(Number);

  // 치수 라벨 "N.Nm" — 가로(회전 없음) / 세로(rotate) → px→mm 스케일 검증
  const dims = [...svg.matchAll(/<text[^>]*>([\d.]+)m<\/text>/g)];
  const horiz = dims.find(d => !d[0].includes('transform')), vert = dims.find(d => d[0].includes('transform'));
  if (!horiz || !vert) { console.error(`❌ ${file}: 치수 라벨 누락`); continue; }
  const mmPerPxX = Number(horiz[1]) * 1000 / ow;
  const mmPerPxY = Number(vert[1]) * 1000 / oh;
  if (Math.abs(mmPerPxX - mmPerPxY) > 0.01) console.warn(`⚠ ${file}: 가로/세로 스케일 불일치 ${mmPerPxX} vs ${mmPerPxY}`);

  // 제목 (font-size 15) — 프로젝트명
  const title = (svg.match(/<text[^>]*font-size="15"[^>]*>([^<]+)<\/text>/) || [])[1] || slug;

  // 방 rect (stroke #3a352c, width 2) + 바로 다음 굵은 라벨
  const roomRe = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*stroke="#3a352c" stroke-width="2"([^>]*)\/>\s*<text[^>]*font-weight="700">([^<]+)<\/text>/g;
  const spaces = [], walls = [];
  let i = 0;
  for (const m of svg.matchAll(roomRe)) {
    i++;
    const [rx, ry, rw, rh] = m.slice(1, 5).map(Number);
    const extra = m[5], label = m[6].trim();
    const isBalcony = /dasharray|hatch/.test(extra) || /발코니/.test(label);
    const x1 = Math.round((rx - ox) * mmPerPxX), y1 = Math.round((ry - oy) * mmPerPxY);
    const x2 = Math.round((rx + rw - ox) * mmPerPxX), y2 = Math.round((ry + rh - oy) * mmPerPxY);
    const id = `sp-${slug}-${String(i).padStart(2, '0')}`;
    const type = isBalcony ? 'BALCONY' : toType(label);
    const polygon = [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }];
    spaces.push({ id, name: label, type, polygon });
    polygon.forEach((a, k) => {
      const b = polygon[(k + 1) % 4];
      walls.push({ id: `w-${slug}-${String(i).padStart(2, '0')}-${k}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y, spaceId: id, thickness: 50 });
    });
  }
  if (!spaces.length) { console.error(`❌ ${file}: 방 rect 파싱 실패`); continue; }

  const areaSum = spaces.reduce((s, sp) => {
    const p = sp.polygon; return s + Math.abs((p[1].x - p[0].x) * (p[2].y - p[1].y)) / 1e6;
  }, 0);

  const json = {
    schema: 'ECOREAN.FloorPlan.v5.0',
    meta: {
      project: title,
      unit: 'mm',
      ceilingHeight_mm: 2400,
      wallThickness: 50,
      tool: 'ECOREAN 표준 평면도 변환기 v1',
      note: 'ECOREAN 자체 작성 표준 도면 — 실측 아님, 견적 전 실측 확인 필요 (NEEDS_CONFIRMATION)',
      source_svg: `/catalog/plans/img/${file}`,
    },
    spaces, walls,
  };
  writeFileSync(join(OUT, `${slug}.json`), JSON.stringify(json, null, 1));
  totalPlans++; totalSpaces += spaces.length;
  console.log(`✅ ${slug}: 공간 ${spaces.length}개 · 벽 ${walls.length}개 · 합계 ${areaSum.toFixed(1)}㎡ (${title})`);
}
console.log(`\n${totalPlans}/10 변환 완료, 공간 총 ${totalSpaces}개`);
