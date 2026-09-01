// 벽 자동 인식(cadPairWalls) 단위 테스트 — 외곽선 두 줄이 중심선 하나 + 실제 두께가 되는지
const fs = require('fs');
const src = fs.readFileSync('sites/net/public/minicad/js/import-cad.js', 'utf8');
const i = src.indexOf('function cadPairWalls(');
const j = src.indexOf('function cadIngestPrims(');
if (i < 0 || j < 0) { console.error('❌ cadPairWalls 없음'); process.exit(1); }
const fn = new Function(src.slice(i, j) + '; return cadPairWalls;')();
const fail = [];
const ck = (c, m) => { if (!c) fail.push(m); };
// 가로벽: y=0 과 y=200 외곽선(200mm 두께), 문 개구부로 두 토막
const segs = [
  { x1: 0, y1: 0, x2: 3000, y2: 0 }, { x1: 0, y1: 200, x2: 3000, y2: 200 },
  { x1: 3900, y1: 0, x2: 6000, y2: 0 }, { x1: 3900, y1: 200, x2: 6000, y2: 200 },
  // 세로벽 150mm
  { x1: 0, y1: 0, x2: 0, y2: 4000 }, { x1: 150, y1: 0, x2: 150, y2: 4000 },
  // 가구 윤곽(두께 범위 밖, 20mm) — 벽이 아니어야 함
  { x1: 1000, y1: 1000, x2: 2000, y2: 1000 }, { x1: 1000, y1: 1020, x2: 2000, y2: 1020 },
  // 치수선(짝 없음)
  { x1: 0, y1: -600, x2: 6000, y2: -600 },
];
const w = fn(segs);
const H = w.filter(x => x.y1 === x.y2), V = w.filter(x => x.x1 === x.x2);
ck(H.length === 2, '가로벽 2토막이어야 함: ' + H.length);
ck(H.every(x => Math.abs(x.t - 200) < 1 && Math.abs(x.y1 - 100) < 1), '가로벽 두께 200·중심 y=100');
ck(V.length === 1 && Math.abs(V[0].t - 150) < 1 && Math.abs(V[0].x1 - 75) < 1, '세로벽 두께 150·중심 x=75');
ck(!w.some(x => x.t < 50), '가구 윤곽(20mm)이 벽으로 잡힘');
ck(w.length === 3, '총 벽 3개여야 함: ' + w.length);
if (fail.length) { fail.forEach(m => console.error('  ❌ ' + m)); process.exit(1); }
console.log('✅ 벽 자동 인식 단위 테스트 통과 (가로 2 · 세로 1 · 오검출 0)');
