// 표준 평면도 SVG → MiniCAD 도면 JSON 변환 (2026-08-25 대표 지시)
// /catalog/plans/img/std-*.svg 의 방 rect(mm 정합 56px/m)를 ECOREAN.FloorPlan 공간·벽 데이터로 변환.
// v2 (대표 지시): ① 겹치는 공간은 차감(작은 방 우선 — 큰 방에서 겹침 제거, L자/hole 처리)
//                 ② 기본 도어(현관문·방문)와 창호(거실 미세기 4짝·방 미세기 2짝) 자동 배치
// 출력: /catalog/plans/data/std-*.json — MiniCAD ?plan= 로더가 applyLoadedData 로 실제 객체 생성.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const IMG = 'sites/net/public/catalog/plans/img';
const OUT = 'sites/net/public/catalog/plans/data';
mkdirSync(OUT, { recursive: true });

// 방 이름 → MiniCAD SPACE_TYPES 키
const TYPE_MAP = [
  [/^발코니/, 'BALCONY'],
  [/욕실/, 'BATHROOM'],
  [/^거실/, 'LIVING'],
  [/주방|식당/, 'KITCHEN'],
  [/^현관/, 'ENTRANCE'],
  [/^복도/, 'CORRIDOR'],
  [/드레스룸/, 'DRESSING'],
  [/다용도실/, 'UTILITY'],
  [/팬트리/, 'PANTRY'],
  [/원룸|안방|침실|^방/, 'ROOM'],
];
const toType = n => (TYPE_MAP.find(([re]) => re.test(n)) || [null, 'ROOM'])[1];

// MiniCAD DOOR_TYPES / WINDOW_TYPES 규격 (js/data.js 와 동일값)
const DOOR = {
  swing: { w: 900, h: 2100, d: 200, subtract: 'double' },
  entry: { w: 1000, h: 2100, d: 200, subtract: 'single' },
};
const WIN = {
  casement: { w: 1200, h: 1500, d: 200, sill: 900 },
  sliding2: { w: 1800, h: 1500, d: 200, sill: 900 },
  sliding4: { w: 3600, h: 1500, d: 200, sill: 900 },
};

const rectArea = r => (r.x2 - r.x1) * (r.y2 - r.y1);

// ── 직사각형 차집합 (target − cutters) : 격자 셀 분해 → 경계 추적 → 외곽/hole 폴리곤 ──
function rectMinusRects(t, cutters) {
  const xs = [...new Set([t.x1, t.x2, ...cutters.flatMap(c => [c.x1, c.x2])])].filter(v => v >= t.x1 && v <= t.x2).sort((a, b) => a - b);
  const ys = [...new Set([t.y1, t.y2, ...cutters.flatMap(c => [c.y1, c.y2])])].filter(v => v >= t.y1 && v <= t.y2).sort((a, b) => a - b);
  const inCut = (x, y) => cutters.some(c => x > c.x1 && x < c.x2 && y > c.y1 && y < c.y2);
  // 방향 간선 (반시계: 영역이 왼쪽) — 인접 셀 간 상쇄
  const edges = new Map(); // "x1,y1|x2,y2" -> {a,b}
  const addE = (a, b) => {
    const rk = `${b.x},${b.y}|${a.x},${a.y}`;
    if (edges.has(rk)) edges.delete(rk); else edges.set(`${a.x},${a.y}|${b.x},${b.y}`, { a, b });
  };
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
    if (inCut(cx, cy)) continue;
    const p = [{ x: xs[i], y: ys[j] }, { x: xs[i + 1], y: ys[j] }, { x: xs[i + 1], y: ys[j + 1] }, { x: xs[i], y: ys[j + 1] }];
    // 화면 좌표(+y 아래)에서 시계방향 나열이 기하학적 반시계 — 간선 상쇄에는 방향 일관성만 중요
    addE(p[0], p[1]); addE(p[1], p[2]); addE(p[2], p[3]); addE(p[3], p[0]);
  }
  // 간선 체인 → 루프
  const byStart = new Map();
  for (const e of edges.values()) {
    const k = `${e.a.x},${e.a.y}`;
    (byStart.get(k) || byStart.set(k, []).get(k)).push(e);
  }
  const loops = [];
  const used = new Set();
  for (const e0 of edges.values()) {
    const k0 = `${e0.a.x},${e0.a.y}|${e0.b.x},${e0.b.y}`;
    if (used.has(k0)) continue;
    const loop = []; let cur = e0;
    while (true) {
      const ck = `${cur.a.x},${cur.a.y}|${cur.b.x},${cur.b.y}`;
      if (used.has(ck)) break;
      used.add(ck); loop.push(cur.a);
      const nexts = (byStart.get(`${cur.b.x},${cur.b.y}`) || []).filter(e => !used.has(`${e.a.x},${e.a.y}|${e.b.x},${e.b.y}`));
      if (!nexts.length) break;
      cur = nexts[0];
    }
    if (loop.length >= 4) loops.push(simplify(loop));
  }
  // 부호 면적: 절대값 최대 = 외곽, 나머지 = hole
  loops.sort((a, b) => Math.abs(polyArea(b)) - Math.abs(polyArea(a)));
  return { outer: loops[0] || null, holes: loops.slice(1) };
}
function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; }
  return a / 2;
}
function simplify(p) { // 일직선 위 중간점 제거
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) continue;
    out.push(b);
  }
  return out;
}

// ── 두 rect 사이 공유 경계 세그먼트 (맞닿음 + 겹침 시 내부 경계) ──
function sharedSegs(a, b) {
  const segs = [];
  const ovl = (a1, a2, b1, b2) => [Math.max(a1, b1), Math.min(a2, b2)];
  const T = 1;
  // 맞닿음
  if (Math.abs(a.x2 - b.x1) <= T || Math.abs(b.x2 - a.x1) <= T) {
    const x = Math.abs(a.x2 - b.x1) <= T ? a.x2 : a.x1;
    const [y1, y2] = ovl(a.y1, a.y2, b.y1, b.y2);
    if (y2 - y1 > 0) segs.push({ dir: 'V', x, y1, y2 });
  }
  if (Math.abs(a.y2 - b.y1) <= T || Math.abs(b.y2 - a.y1) <= T) {
    const y = Math.abs(a.y2 - b.y1) <= T ? a.y2 : a.y1;
    const [x1, x2] = ovl(a.x1, a.x2, b.x1, b.x2);
    if (x2 - x1 > 0) segs.push({ dir: 'H', y, x1, x2 });
  }
  // 겹침 → 작은 쪽(cutter)의 변 중 큰 쪽 내부에 있는 것이 차감 후 공유 경계
  const iw = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1), ih = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
  if (iw > 0 && ih > 0) {
    const [big, cut] = rectArea(a) >= rectArea(b) ? [a, b] : [b, a];
    if (cut.x1 > big.x1 && cut.x1 < big.x2) { const [y1, y2] = ovl(cut.y1, cut.y2, big.y1, big.y2); if (y2 - y1 > 0) segs.push({ dir: 'V', x: cut.x1, y1, y2 }); }
    if (cut.x2 > big.x1 && cut.x2 < big.x2) { const [y1, y2] = ovl(cut.y1, cut.y2, big.y1, big.y2); if (y2 - y1 > 0) segs.push({ dir: 'V', x: cut.x2, y1, y2 }); }
    if (cut.y1 > big.y1 && cut.y1 < big.y2) { const [x1, x2] = ovl(cut.x1, cut.x2, big.x1, big.x2); if (x2 - x1 > 0) segs.push({ dir: 'H', y: cut.y1, x1, x2 }); }
    if (cut.y2 > big.y1 && cut.y2 < big.y2) { const [x1, x2] = ovl(cut.x1, cut.x2, big.x1, big.x2); if (x2 - x1 > 0) segs.push({ dir: 'H', y: cut.y2, x1, x2 }); }
  }
  return segs;
}
// 세그먼트에서 제3의 방(t)이 같은 경계선을 점유한 구간 제거 (겹침 차감 후 실제 인접 구간만 남김)
//  예) std-21: 원룸∩욕실 경계(y=4500)의 x2200~3600 구간은 주방이 원룸을 차감해 실제로는 주방-욕실 경계
function clipSegByOthers(seg, r, o, rooms) {
  let ivs = seg.dir === 'V' ? [[seg.y1, seg.y2]] : [[seg.x1, seg.x2]];
  for (const t of rooms) {
    if (t === r || t === o) continue;
    let cut = null;
    if (seg.dir === 'V') {
      if (t.x1 <= seg.x && t.x2 >= seg.x && (t.x1 < seg.x || t.x2 > seg.x)) cut = [Math.max(t.y1, seg.y1), Math.min(t.y2, seg.y2)];
    } else {
      if (t.y1 <= seg.y && t.y2 >= seg.y && (t.y1 < seg.y || t.y2 > seg.y)) cut = [Math.max(t.x1, seg.x1), Math.min(t.x2, seg.x2)];
    }
    if (!cut || cut[1] - cut[0] <= 0) continue;
    const next = [];
    for (const [a, b] of ivs) {
      if (cut[1] <= a || cut[0] >= b) { next.push([a, b]); continue; }
      if (cut[0] > a) next.push([a, cut[0]]);
      if (cut[1] < b) next.push([cut[1], b]);
    }
    ivs = next;
  }
  return ivs.map(([a, b]) => seg.dir === 'V' ? { dir: 'V', x: seg.x, y1: a, y2: b } : { dir: 'H', y: seg.y, x1: a, x2: b });
}
const segLen = s => s.dir === 'V' ? s.y2 - s.y1 : s.x2 - s.x1;
const segMid = s => s.dir === 'V' ? { x: s.x, y: (s.y1 + s.y2) / 2 } : { x: (s.x1 + s.x2) / 2, y: s.y };
const segAngle = s => s.dir === 'V' ? 90 : 0;

// rect 의 외곽 경계 위 변 (전용 외곽선에 접한 변)
function exteriorSegs(r, W, H) {
  const segs = [];
  if (r.y1 <= 1) segs.push({ dir: 'H', y: r.y1, x1: r.x1, x2: r.x2 });
  if (r.y2 >= H - 1) segs.push({ dir: 'H', y: r.y2, x1: r.x1, x2: r.x2 });
  if (r.x1 <= 1) segs.push({ dir: 'V', x: r.x1, y1: r.y1, y2: r.y2 });
  if (r.x2 >= W - 1) segs.push({ dir: 'V', x: r.x2, y1: r.y1, y2: r.y2 });
  return segs;
}

let totalPlans = 0, totalSpaces = 0, totalOpenings = 0;
for (const file of readdirSync(IMG).filter(f => /^(std|cx)-.*.svg$/.test(f))) {
  const svg = readFileSync(join(IMG, file), 'utf8');
  const slug = basename(file, '.svg');

  const outer = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*stroke-width="5"/);
  if (!outer) { console.error(`❌ ${file}: 외곽 rect 없음`); continue; }
  const [ox, oy, ow, oh] = outer.slice(1, 5).map(Number);

  const dims = [...svg.matchAll(/<text[^>]*>([\d.]+)m<\/text>/g)];
  const horiz = dims.find(d => !d[0].includes('transform')), vert = dims.find(d => d[0].includes('transform'));
  if (!horiz || !vert) { console.error(`❌ ${file}: 치수 라벨 누락`); continue; }
  const mmPerPxX = Number(horiz[1]) * 1000 / ow, mmPerPxY = Number(vert[1]) * 1000 / oh;
  const W = Math.round(Number(horiz[1]) * 1000), H = Math.round(Number(vert[1]) * 1000);

  const title = (svg.match(/<text[^>]*font-size="15"[^>]*>([^<]+)<\/text>/) || [])[1] || slug;

  // 방 rect 파싱
  const roomRe = /<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*stroke="#3a352c" stroke-width="2"([^>]*)\/>\s*<text[^>]*font-weight="700">([^<]+)<\/text>/g;
  const rooms = [];
  let i = 0;
  for (const m of svg.matchAll(roomRe)) {
    i++;
    const [rx, ry, rw, rh] = m.slice(1, 5).map(Number);
    const extra = m[5], label = m[6].trim();
    const isBalcony = /dasharray|hatch/.test(extra) || /발코니/.test(label);
    rooms.push({
      id: `sp-${slug}-${String(i).padStart(2, '0')}`,
      name: label,
      type: isBalcony ? 'BALCONY' : toType(label),
      x1: Math.round((rx - ox) * mmPerPxX), y1: Math.round((ry - oy) * mmPerPxY),
      x2: Math.round((rx + rw - ox) * mmPerPxX), y2: Math.round((ry + rh - oy) * mmPerPxY),
    });
  }
  if (!rooms.length) { console.error(`❌ ${file}: 방 rect 파싱 실패`); continue; }

  // ── ① 겹침 차감: 작은 방 우선(원형 유지), 큰 방에서 겹침 영역 제거 ──
  let cutCount = 0;
  const spaces = [], walls = [], openBoundaries = [];
  // 2026-08-26 대표 지시: 없는 벽을 만들지 말 것 — 개방 동선 공간(거실·주방·식당·복도·현관·원룸)
  //  사이 경계는 실제 벽이 없다 → 벽 생성 제외, openBoundaries 로 기록(SVG 점선 구분선용)
  const OPENFLOW = new Set(['LIVING', 'KITCHEN', 'DINING', 'CORRIDOR', 'ENTRANCE']);
  const isOpenRoom = rr => OPENFLOW.has(rr.type) || rr.name === '원룸';
  const roomAt = p => rooms.filter(o => p.x > o.x1 && p.x < o.x2 && p.y > o.y1 && p.y < o.y2)
    .sort((a2, b2) => rectArea(a2) - rectArea(b2))[0] || null; // 겹침 시 작은 방(차감 우선권) 채택
  const ptInLoop = (p, loop) => {
    let inside = false;
    for (let ii = 0, jj = loop.length - 1; ii < loop.length; jj = ii++) {
      const a2 = loop[ii], b2 = loop[jj];
      if ((a2.y > p.y) !== (b2.y > p.y) && p.x < (b2.x - a2.x) * (p.y - a2.y) / (b2.y - a2.y) + a2.x) inside = !inside;
    }
    return inside;
  };
  const obSeen = new Set();
  for (const r of rooms) {
    const cutters = rooms.filter(o => o !== r && rectArea(o) < rectArea(r)
      && Math.min(r.x2, o.x2) - Math.max(r.x1, o.x1) > 0 && Math.min(r.y2, o.y2) - Math.max(r.y1, o.y1) > 0);
    let polygon = [{ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y1 }, { x: r.x2, y: r.y2 }, { x: r.x1, y: r.y2 }];
    let holes = [];
    if (cutters.length) {
      const res = rectMinusRects(r, cutters);
      if (res.outer && res.outer.length >= 3) { polygon = res.outer; holes = res.holes; cutCount += cutters.length; }
      else console.warn(`⚠ ${slug}/${r.name}: 차감 실패 — 원형 유지`);
    }
    const sp = { id: r.id, name: r.name, type: r.type, polygon };
    if (holes.length) sp.holes = holes;
    spaces.push(sp);
    const inSpace = p => ptInLoop(p, polygon) && !holes.some(h => ptInLoop(p, h));
    const allLoops = [polygon, ...holes];
    let wk = 0;
    for (const loop of allLoops) loop.forEach((a, k) => {
      const b = loop[(k + 1) % loop.length];
      const horiz = a.y === b.y;
      const lo = Math.min(horiz ? a.x : a.y, horiz ? b.x : b.y);
      const hi = Math.max(horiz ? a.x : a.y, horiz ? b.x : b.y);
      if (hi - lo < 1) return;
      // 변을 이웃 방 경계 좌표로 분할 → 구간별로 건너편 방을 조사해 벽/개방 판정
      const cuts = new Set([lo, hi]);
      for (const o of rooms) {
        for (const c of horiz ? [o.x1, o.x2] : [o.y1, o.y2]) if (c > lo && c < hi) cuts.add(c);
      }
      const pts = [...cuts].sort((x2, y2) => x2 - y2);
      let run = null; // {open, from}
      const flush = to => {
        if (!run) return;
        const seg = horiz ? { x1: run.from, y1: a.y, x2: to, y2: a.y } : { x1: a.x, y1: run.from, x2: a.x, y2: to };
        if (run.open) {
          const key = [Math.min(seg.x1, seg.x2), Math.min(seg.y1, seg.y2), Math.max(seg.x1, seg.x2), Math.max(seg.y1, seg.y2)].join(',');
          if (!obSeen.has(key)) { obSeen.add(key); openBoundaries.push(seg); }
        } else {
          walls.push({ id: `w-${r.id}-${wk++}`, ...seg, spaceId: r.id, thickness: 50 });
        }
        run = null;
      };
      for (let s2 = 0; s2 < pts.length - 1; s2++) {
        const m = (pts[s2] + pts[s2 + 1]) / 2;
        const pA = horiz ? { x: m, y: a.y - 60 } : { x: a.x - 60, y: m };
        const pB = horiz ? { x: m, y: a.y + 60 } : { x: a.x + 60, y: m };
        const outP = inSpace(pA) ? pB : pA; // 공간 바깥쪽(건너편) 프로브
        const nb = roomAt(outP);
        const open = !!(nb && nb !== r && isOpenRoom(r) && isOpenRoom(nb));
        if (run && run.open !== open) flush(pts[s2]);
        if (!run) run = { open, from: pts[s2] };
      }
      flush(pts[pts.length - 1]);
    });
  }

  // ── ② 기본 도어·창호 ──
  const openings = [];
  let od = 0, ownd = 0;
  const push = (type, subType, sp, seg, def) => {
    const mid = segMid(seg);
    openings.push({
      id: `${type === 'DOOR' ? 'd' : 'wn'}-${slug}-${String(type === 'DOOR' ? ++od : ++ownd).padStart(2, '0')}`,
      type, subType, spaceId: sp.id, x: Math.round(mid.x), y: Math.round(mid.y), wallId: null,
      width_mm: def.w, height_mm: def.h, depth_mm: def.d,
      sillHeight_mm: type === 'WINDOW' ? def.sill : null,
      angle: segAngle(seg),
      subtractMode: type === 'DOOR' ? (def.subtract || 'double') : 'single',
    });
  };
  const CIRC = new Set(['ENTRANCE', 'CORRIDOR', 'LIVING', 'KITCHEN', 'DINING']);
  const isCirc = r => CIRC.has(r.type) || r.name === '원룸';
  // 현관문: 현관의 외곽 경계 변 중앙
  const ent = rooms.find(r => r.type === 'ENTRANCE');
  if (ent) {
    let ext = exteriorSegs(ent, W, H).sort((a, b) => segLen(b) - segLen(a))[0];
    if (!ext || segLen(ext) < DOOR.entry.w + 200) {
      // 타워형 등 현관이 내부에 있는 평면: 다른 공간과 접하지 않은(외기·공용부 방향) 변에 현관문
      const edges = [
        { dir: 'H', y: ent.y1, x1: ent.x1, x2: ent.x2 }, { dir: 'H', y: ent.y2, x1: ent.x1, x2: ent.x2 },
        { dir: 'V', x: ent.x1, y1: ent.y1, y2: ent.y2 }, { dir: 'V', x: ent.x2, y1: ent.y1, y2: ent.y2 },
      ];
      let best = null;
      for (const e of edges) {
        // 이 변에서 다른 방과 공유되는 구간을 빼고 남는 최장 빈 구간
        const covered = [];
        for (const o of rooms) if (o !== ent) for (const s of sharedSegs(ent, o)) {
          if (s.dir !== e.dir) continue;
          if (e.dir === 'H' && Math.abs(s.y - e.y) <= 1) covered.push([s.x1, s.x2]);
          if (e.dir === 'V' && Math.abs(s.x - e.x) <= 1) covered.push([s.y1, s.y2]);
        }
        covered.sort((a, b) => a[0] - b[0]);
        let cur = e.dir === 'H' ? e.x1 : e.y1;
        const end = e.dir === 'H' ? e.x2 : e.y2;
        const gaps = [];
        for (const [c1, c2] of covered) { if (c1 > cur) gaps.push([cur, c1]); cur = Math.max(cur, c2); }
        if (end > cur) gaps.push([cur, end]);
        for (const [g1, g2] of gaps) {
          const seg = e.dir === 'H' ? { dir: 'H', y: e.y, x1: g1, x2: g2 } : { dir: 'V', x: e.x, y1: g1, y2: g2 };
          if (segLen(seg) >= DOOR.entry.w + 200 && (!best || segLen(seg) > segLen(best))) best = seg;
        }
      }
      ext = best;
    }
    if (ext) push('DOOR', 'entry', ent, ext, DOOR.entry);
    else console.warn(`ℹ ${slug}: 현관이 외기와 접하지 않는 타워형 — 세대현관문 생략(공용복도 방향은 도면 범위 밖)`);
  }
  // 방문: 침실·욕실·드레스룸·다용도실·팬트리 → 동선 공간(현관·복도·거실·주방)과의 공유 변, 없으면 최장 인접 변
  const DOORED = new Set(['ROOM', 'BATHROOM', 'DRESSING', 'UTILITY', 'PANTRY', 'STORAGE', 'POWDER']);
  for (const r of rooms) {
    if (!DOORED.has(r.type) || r.name === '원룸') continue;
    let cands = [];
    for (const o of rooms) {
      if (o === r || o.type === 'BALCONY') continue;
      for (const s0 of sharedSegs(r, o)) for (const s of clipSegByOthers(s0, r, o, rooms))
        if (segLen(s) >= DOOR.swing.w + 200) cands.push({ s, circ: isCirc(o) });
    }
    if (!cands.length) { console.warn(`⚠ ${slug}/${r.name}: 문 놓을 공유 변 없음`); continue; }
    cands.sort((a, b) => (b.circ - a.circ) || (segLen(b.s) - segLen(a.s)));
    push('DOOR', 'swing', r, cands[0].s, DOOR.swing);
  }
  // 창호: 공간당 1개 — 발코니 접함 우선, 아니면 외곽 변. 거실은 미세기 4짝, 그 외 2짝/여닫이
  const WINDOWED = new Set(['ROOM', 'LIVING', 'KITCHEN', 'BALCONY']);
  const balconies = rooms.filter(r => r.type === 'BALCONY');
  for (const r of rooms) {
    if (!WINDOWED.has(r.type)) continue;
    let seg = null;
    if (r.type !== 'BALCONY') {
      for (const b of balconies) {
        const s = sharedSegs(r, b).flatMap(s0 => clipSegByOthers(s0, r, b, rooms)).sort((a, c) => segLen(c) - segLen(a))[0];
        if (s && (!seg || segLen(s) > segLen(seg))) seg = s;
      }
    }
    if (!seg) seg = exteriorSegs(r, W, H).sort((a, b) => segLen(b) - segLen(a))[0];
    if (!seg) continue;
    if (r.type === 'ENTRANCE') continue;
    const L = segLen(seg);
    const def = (r.type === 'LIVING' || r.type === 'BALCONY') && L >= WIN.sliding4.w + 400 ? ['sliding4', WIN.sliding4]
      : L >= WIN.sliding2.w + 400 ? ['sliding2', WIN.sliding2]
      : L >= WIN.casement.w + 300 ? ['casement', WIN.casement] : null;
    if (def) push('WINDOW', def[0], r, seg, def[1]);
  }

  const areaSum = spaces.reduce((s, sp) => {
    let a = Math.abs(polyArea(sp.polygon));
    (sp.holes || []).forEach(h => { a -= Math.abs(polyArea(h)); });
    return s + a / 1e6;
  }, 0);

  const json = {
    schema: 'ECOREAN.FloorPlan.v5.0',
    meta: {
      project: title,
      unit: 'mm',
      ceilingHeight_mm: 2400,
      wallThickness: 50,
      tool: 'ECOREAN 표준 평면도 변환기 v2',
      note: 'ECOREAN 자체 작성 표준 도면 — 실측 아님, 견적 전 실측 확인 필요 (NEEDS_CONFIRMATION)',
      source_svg: `/catalog/plans/img/${file}`,
    },
    spaces, walls, openings,
    // 개방 경계 (벽 없음 — 공간 구분선): MiniCAD 는 무시, SVG 데코레이터가 점선으로 표기
    openBoundaries,
  };
  writeFileSync(join(OUT, `${slug}.json`), JSON.stringify(json, null, 1));
  totalPlans++; totalSpaces += spaces.length; totalOpenings += openings.length;
  console.log(`✅ ${slug}: 공간 ${spaces.length} · 벽 ${walls.length} · 개방경계 ${openBoundaries.length} · 문 ${od} · 창 ${ownd} · 차감 ${cutCount}건 · 합계 ${areaSum.toFixed(1)}㎡ (${title})`);
}
console.log(`\n${totalPlans}/10 변환 완료 — 공간 ${totalSpaces} · 개구부 ${totalOpenings}`);
