// 벽 선분 격자로 방을 나눈다 — 픽셀 덩어리가 아니라 '검출된 벽'만 근거로 삼는다.
// ① 세로벽 x·가로벽 y 로 격자를 만들고 ② 내부 칸만 남긴 뒤
// ③ 맞닿은 칸 사이에 벽이 없으면 같은 방으로 합친다 (문틈은 벽 병합 단계에서 이미 이어 놓았다)
export function roomsFromWalls(hb, vb, w, h, isInside) {
  const uniq = (arr, tol) => { const s = [...arr].sort((a, b) => a - b), o = []; for (const v of s) { if (!o.length || v - o[o.length - 1] > tol) o.push(v); } return o; };
  const tol = Math.max(3, Math.round(Math.min(w, h) * 0.012));
  const xs = uniq([0, w, ...vb.map(b => b.c)], tol);
  const ys = uniq([0, h, ...hb.map(b => b.c)], tol);
  const nx = xs.length - 1, ny = ys.length - 1;
  if (nx < 1 || ny < 1) return [];

  const cellIn = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
    cellIn[j * nx + i] = isInside(cx, cy) ? 1 : 0;
  }
  // 두 칸 사이 경계가 벽으로 덮여 있는지 — 60% 이상 덮였으면 벽으로 본다
  const coveredV = (x, y1, y2) => {
    const need = (y2 - y1) * 0.6;
    let cov = 0;
    for (const b of vb) { if (Math.abs(b.c - x) > tol) continue; cov += Math.max(0, Math.min(b.a2, y2) - Math.max(b.a1, y1)); }
    return cov >= need;
  };
  const coveredH = (y, x1, x2) => {
    const need = (x2 - x1) * 0.6;
    let cov = 0;
    for (const b of hb) { if (Math.abs(b.c - y) > tol) continue; cov += Math.max(0, Math.min(b.a2, x2) - Math.max(b.a1, x1)); }
    return cov >= need;
  };
  const par = new Int32Array(nx * ny).map((_, i) => i);
  const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) par[rb] = ra; };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = j * nx + i; if (!cellIn[c]) continue;
    if (i + 1 < nx && cellIn[c + 1] && !coveredV(xs[i + 1], ys[j], ys[j + 1])) uni(c, c + 1);
    if (j + 1 < ny && cellIn[c + nx] && !coveredH(ys[j + 1], xs[i], xs[i + 1])) uni(c, c + nx);
  }
  const groups = new Map();
  for (let c = 0; c < nx * ny; c++) { if (!cellIn[c]) continue; const r = find(c); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c); }
  return [...groups.values()].map(cells => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, area = 0;
    for (const c of cells) {
      const i = c % nx, j = (c / nx) | 0;
      x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i + 1]);
      y0 = Math.min(y0, ys[j]); y1 = Math.max(y1, ys[j + 1]);
      area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
    }
    return { cells: cells.length, x0, y0, x1, y1, area, rectFill: area / ((x1 - x0) * (y1 - y0)) };
  }).sort((a, b) => b.area - a.area);
}
