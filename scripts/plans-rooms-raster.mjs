// 분양 이미지 → '방 우선' 추출 (상담 즉석 견적용 도면의 핵심)
// 벽을 뽑는 대신 방(벽으로 둘러싸인 밝은 영역)을 뽑는다. 벽·문틀이 어떤 굵기든 어두운 선은 채움을 막아주므로
// 픽셀 벽 추출(재현 46%)이 실패한 도면에서도 방 경계는 정확히 잡힌다.
//
// 2단계 닫힘:
//  · 강한 닫힘(r≈1400mm) — 현관·외벽 창(~2.6m)까지 막아 '세대 윤곽(inside)'을 정한다
//  · 약한 닫힘(r≈450mm) — 실내 문(800~900mm)만 막아 방을 나눈다. 복도(1100mm+)는 살아남는다
// 닫힘(팽창→침식)은 방 크기를 되돌리므로 면적이 왜곡되지 않는다.
// 축척: 전용면적 ↔ 세대 윤곽 픽셀로 반복 수렴(발코니 포함이라 1차 근사 — 라벨 분류 후 재보정).
import sharp from 'sharp';
import { detectRegions } from './plans-detect-region.mjs';

const DARK = 150;   // 회색 경량벽·문틀 선도 방 경계로 작동해야 하므로 넉넉히

// 분리형 박스 팽창/침식 (이진)
function boxOp(mask, w, h, r, isDilate) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let cnt = 0;
    for (let x = -r; x < w; x++) {
      if (x + r < w && mask[y * w + x + r]) cnt++;
      if (x - r - 1 >= 0 && mask[y * w + x - r - 1]) cnt--;
      if (x >= 0) {
        const win = Math.min(x + r, w - 1) - Math.max(x - r, 0) + 1;
        tmp[y * w + x] = isDilate ? (cnt > 0 ? 1 : 0) : (cnt === win ? 1 : 0);
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let cnt = 0;
    for (let y = -r; y < h; y++) {
      if (y + r < h && tmp[(y + r) * w + x]) cnt++;
      if (y - r - 1 >= 0 && tmp[(y - r - 1) * w + x]) cnt--;
      if (y >= 0) {
        const win = Math.min(y + r, h - 1) - Math.max(y - r, 0) + 1;
        out[y * w + x] = isDilate ? (cnt > 0 ? 1 : 0) : (cnt === win ? 1 : 0);
      }
    }
  }
  return out;
}
const close = (m, w, h, r) => boxOp(boxOp(m, w, h, r, true), w, h, r, false);

// 같은 평면에 속한 영역 조각들을 묶는다 — 벽 네트워크가 현관·개구부에서 끊겨 반쪽 크롭이 나오는 문제 방지
function groupRegions(regions, gap) {
  const gs = [];
  for (const r of regions) {
    const hit = gs.find(g => r.x0 <= g.x1 + gap && g.x0 <= r.x1 + gap && r.y0 <= g.y1 + gap && g.y0 <= r.y1 + gap);
    if (hit) { hit.x0 = Math.min(hit.x0, r.x0); hit.y0 = Math.min(hit.y0, r.y0); hit.x1 = Math.max(hit.x1, r.x1); hit.y1 = Math.max(hit.y1, r.y1); hit.cnt += r.cnt; }
    else gs.push({ x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, cnt: r.cnt });
  }
  return gs.map(g => ({ ...g, bw: g.x1 - g.x0 + 1, bh: g.y1 - g.y0 + 1 })).sort((p, q) => q.cnt - p.cnt);
}

function floodOutside(sealed, w, h) {
  const N = w * h;
  const outside = new Uint8Array(N); const st = [];
  const push = i => { if (!outside[i] && !sealed[i]) { outside[i] = 1; st.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (st.length) {
    const p = st.pop(), px = p % w, py = (p / w) | 0;
    if (px > 0) push(p - 1); if (px < w - 1) push(p + 1);
    if (py > 0) push(p - w); if (py < h - 1) push(p + w);
  }
  return outside;
}

export async function extractRooms(file, opt = {}) {
  const { regions, srcW, w: dw } = await detectRegions(file, { dilate: 14 });
  if (!regions.length) return { ok: false, reason: '도면 영역 없음' };
  const meta = await sharp(file).metadata();
  const k = srcW / dw, pad = 16;
  // 잉크가 최대 조각의 30% 미만인 부속 그림(중문 삽화·범례)은 그룹핑에서 제외 —
  // 이런 조각이 평면과 닿아 있으면 크롭 상자를 엉뚱하게 늘려 놓는다
  const maxInk = Math.max(...regions.map(r => r.inkCnt || r.cnt || 0));
  const majors = regions.filter(r => (r.inkCnt || r.cnt || 0) >= maxInk * 0.3);
  const groups = groupRegions(majors, 25);   // 반쪽 조각(간격 ~3px)은 잇고, 별개 평면(간격 40px+)은 분리
  const rg = groups[opt.planIndex || 0];
  if (!rg) return { ok: false, reason: '평면 그룹 없음' };
  const L = Math.max(0, Math.round((rg.x0 - pad) * k)), T = Math.max(0, Math.round((rg.y0 - pad) * k));
  const Wd = Math.min(meta.width - L, Math.round((rg.bw + pad * 2) * k));
  const Hd = Math.min(meta.height - T, Math.round((rg.bh + pad * 2) * k));
  if (Wd < 60 || Hd < 60) return { ok: false, reason: '크롭이 너무 작음' };
  const WORK = opt.work || 1400;
  const { data, info } = await sharp(file).extract({ left: L, top: T, width: Wd, height: Hd })
    .resize({ width: WORK }).grayscale().raw().toBuffer({ resolveWithObject: true });
  // 가상 흰 여백 — 강한 닫힘 반경(최대 ~170px)이 크롭 가장자리를 봉인해 외기 판정이 막히는 것을 방지.
  // 여백은 항상 닫힘 반경보다 커야 바깥 공기가 사방에서 세대를 감쌀 수 있다.
  const M = 220;
  const w = info.width + 2 * M, h = info.height + 2 * M, N = w * h;
  const wall = new Uint8Array(N);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    wall[(y + M) * w + (x + M)] = data[y * info.width + x] < DARK ? 1 : 0;
  // 잔선 제거 — 두꺼운 부분(침식 r2 생존)이 하나라도 있는 연결 성분만 남긴다.
  // 벽 네트워크는 어디든 두꺼운 구간이 있고 경량벽·창선은 벽에 붙어 있어 함께 살아남는다.
  // 떨어져 있는 가구 윤곽·글자는 전부 얇아 제거된다. (열림은 얇은 벽까지 지워 누수를 만들었다)
  const seed = boxOp(wall, w, h, 2, false);
  const wallCore = new Uint8Array(N);
  {
    const cid = new Int32Array(N).fill(-1); const stk = [];
    let nc = 0;
    for (let i0 = 0; i0 < N; i0++) {
      if (!wall[i0] || cid[i0] >= 0) continue;
      const id = nc++; let hasSeed = false; const cells = [];
      cid[i0] = id; stk.push(i0);
      while (stk.length) {
        const p = stk.pop(), px = p % w, py = (p / w) | 0;
        cells.push(p); if (seed[p]) hasSeed = true;
        if (px > 0 && wall[p - 1] && cid[p - 1] < 0) { cid[p - 1] = id; stk.push(p - 1); }
        if (px < w - 1 && wall[p + 1] && cid[p + 1] < 0) { cid[p + 1] = id; stk.push(p + 1); }
        if (py > 0 && wall[p - w] && cid[p - w] < 0) { cid[p - w] = id; stk.push(p - w); }
        if (py < h - 1 && wall[p + w] && cid[p + w] < 0) { cid[p + w] = id; stk.push(p + w); }
      }
      if (hasSeed) for (const p of cells) wallCore[p] = 1;
    }
  }

  let mmpp = opt.mmPerPx || 20;
  let outside = null;
  for (let iter = 0; iter < 4; iter++) {
    const rH = Math.max(3, Math.round((opt.sealMm || 1400) / mmpp));   // 외벽 창(~2.6m)까지 막아야 세대 윤곽이 닫힌다 — 윤곽 판정 전용이라 방을 뭉개지 않는다
    outside = floodOutside(close(wallCore, w, h, rH), w, h);
    let insidePx = 0;
    for (let i = 0; i < N; i++) if (!outside[i]) insidePx++;
    if (!opt.area_m2) break;
    const next = Math.sqrt(opt.area_m2 * 1e6 / Math.max(1, insidePx));
    const done = Math.abs(next - mmpp) / mmpp < 0.02;
    mmpp = next;
    if (done) break;
  }

  // 방 채움을 평면 윤곽 상자(패드 제외) 안으로 제한 — 창·현관 개구로 크롭 여백까지 새는 것을 끊는다
  const padW = Math.max(2, Math.round(pad * k * (info.width / Wd)));
  const bx0 = M + padW, by0 = M + padW, bx1 = M + info.width - padW, by1 = M + info.height - padW;
  const inBox = p => { const x = p % w, y = (p / w) | 0; return x >= bx0 && x < bx1 && y >= by0 && y < by1; };
  const rL = Math.max(2, Math.round((opt.closeMm || 450) / mmpp));
  const sealedL = close(wallCore, w, h, rL);
  const lbl = new Int32Array(N).fill(-1);
  const rooms = [];
  const st = [];
  for (let i0 = 0; i0 < N; i0++) {
    if (sealedL[i0] || outside[i0] || lbl[i0] >= 0 || !inBox(i0)) continue;
    const id = rooms.length, cells = [];
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    lbl[i0] = id; st.push(i0);
    while (st.length) {
      const p = st.pop(), px = p % w, py = (p / w) | 0;
      cells.push(p);
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px > 0) { const q = p - 1; if (!sealedL[q] && !outside[q] && lbl[q] < 0 && inBox(q)) { lbl[q] = id; st.push(q); } }
      if (px < w - 1) { const q = p + 1; if (!sealedL[q] && !outside[q] && lbl[q] < 0 && inBox(q)) { lbl[q] = id; st.push(q); } }
      if (py > 0) { const q = p - w; if (!sealedL[q] && !outside[q] && lbl[q] < 0 && inBox(q)) { lbl[q] = id; st.push(q); } }
      if (py < h - 1) { const q = p + w; if (!sealedL[q] && !outside[q] && lbl[q] < 0 && inBox(q)) { lbl[q] = id; st.push(q); } }
    }
    rooms.push({ id, cells, px: cells.length, x0, y0, x1, y1 });
  }
  // 회수 — 약한 닫힘이 삼킨 밝은 영역(문틀·모서리 둘레)을 방 시드에서 벽을 넘지 않게 되돌린다.
  // 이걸 안 하면 방마다 벽 둘레 ~450mm 띠가 빠져 면적이 모자란다.
  {
    const q2 = [];
    for (let i = 0; i < N; i++) if (lbl[i] >= 0) q2.push(i);
    let head = 0;
    while (head < q2.length) {
      const p = q2[head++];
      const px = p % w, py = (p / w) | 0, id = lbl[p];
      const tryQ = (q) => { if (q < 0 || q >= N) return; if (wall[q] || outside[q] || lbl[q] >= 0 || !inBox(q)) return; lbl[q] = id; rooms[id].cells.push(q); q2.push(q); };
      if (px > 0) tryQ(p - 1);
      if (px < w - 1) tryQ(p + 1);
      if (py > 0) tryQ(p - w);
      if (py < h - 1) tryQ(p + w);
    }
    for (const rm of rooms) {
      rm.px = rm.cells.length;
      for (const p of rm.cells) { const x = p % w, y = (p / w) | 0;
        if (x < rm.x0) rm.x0 = x; if (x > rm.x1) rm.x1 = x; if (y < rm.y0) rm.y0 = y; if (y > rm.y1) rm.y1 = y; }
    }
  }
  const minPx = Math.max(200, Math.round(1.0e6 / (mmpp * mmpp)));   // 1㎡ 미만 자투리 제외
  const big = rooms.filter(r => r.px >= minPx);
  return { ok: true, w, h, M, workW: info.width, workH: info.height, crop: { L, T, Wd, Hd }, mmPerPx: mmpp, outside, wall, lbl, rooms: big, allRooms: rooms, rClose: rL, groups: groups.length };
}

if (process.argv[1]?.endsWith('plans-rooms-raster.mjs')) {
  const f = process.argv[2];
  const r = await extractRooms(f, { area_m2: +(process.argv[3] || 0) || null });
  if (!r.ok) { console.log('실패', r.reason); process.exit(1); }
  const mm = r.mmPerPx;
  console.log(`방 ${r.rooms.length} (전체 ${r.allRooms.length}) · mm/px ${mm.toFixed(2)} · 닫힘 ${r.rClose}px`);
  r.rooms.sort((a, b) => b.px - a.px).forEach(rm => console.log(`  ${(rm.px * mm * mm / 1e6).toFixed(1)}㎡  ${Math.round((rm.x1 - rm.x0) * mm)}×${Math.round((rm.y1 - rm.y0) * mm)}mm`));
  console.log('합', (r.rooms.reduce((a, x) => a + x.px, 0) * mm * mm / 1e6).toFixed(1) + '㎡');
}

// ── 방 이름 라벨 (OCR) ────────────────────────────────────────────────
// 도면에 인쇄된 방 이름을 읽어 각 방에 붙인다. 라벨 좌표가 속한 방 = 그 이름의 방.
// 타입 매핑은 MiniCAD SPACE_TYPES 기준.
export const LABEL_TYPES = [
  [/거실/, 'LIVING'], [/주방|식당/, 'KITCHEN'], [/침실|안방/, 'ROOM'], [/욕실|화장실/, 'BATHROOM'],
  [/현관/, 'ENTRANCE'], [/발코니/, 'BALCONY'], [/드레스/, 'DRESSING'], [/다용도/, 'UTILITY'],
  [/팬트리/, 'PANTRY'], [/실외기/, 'UTILITY'], [/파우더/, 'POWDER'], [/복도/, 'CORRIDOR'], [/창고/, 'STORAGE'],
];
export async function labelRooms(file, r, opt = {}) {
  const { createWorker } = await import('tesseract.js');
  const sharp = (await import('sharp')).default;
  const OCRW = 2000;
  const buf = await sharp(file).extract({ left: r.crop.L, top: r.crop.T, width: r.crop.Wd, height: r.crop.Hd })
    .resize({ width: OCRW }).grayscale().normalise().png().toBuffer();
  const worker = await createWorker('kor');
  const res = await worker.recognize(buf, {}, { blocks: true });
  await worker.terminate();
  const KW = /(침실\s*\d?|안방|거실|주방\s*\/?\s*식당?|주방|식당|욕실\s*\d?|화장실|현관|발코니\s*\d?|드레스\s*룸?|다용도\s*실?|팬트리|실외기\s*실?|알파\s*룸|파우더|세탁\s*실?|창고|복도)/;
  const sx = r.workW / OCRW;                       // OCR 좌표 → 작업(여백 포함) 좌표
  const labels = [];
  for (const b of res.data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
    const words = (l.words || []).filter(wd => wd.text.trim());
    // 한 줄에 라벨이 둘 이상 붙어 읽히는 경우("침실3침실2")가 있어 단어 단위도 본다
    const cand = words.length > 1 && KW.test(l.text) ? words : [{ text: l.text, bbox: l.bbox }];
    for (const wd of cand) {
      const m = String(wd.text).replace(/\s+/g, '').match(KW);
      if (!m) continue;
      labels.push({
        name: m[1].replace(/\s+/g, ''),
        x: Math.round((wd.bbox.x0 + wd.bbox.x1) / 2 * sx) + r.M,
        y: Math.round((wd.bbox.y0 + wd.bbox.y1) / 2 * sx) + r.M,
      });
    }
  }
  // 라벨 → 방 매핑 (라벨 중심이 속한 방; 벽 위에 찍히면 주변 5px 탐색)
  for (const lb of labels) {
    let id = r.lbl[lb.y * r.w + lb.x];
    if (id == null || id < 0) {
      outer: for (let d = 2; d <= 14; d += 3) {
        for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]]) {
          const q = (lb.y + dy) * r.w + (lb.x + dx);
          if (q >= 0 && q < r.w * r.h && r.lbl[q] >= 0) { id = r.lbl[q]; break outer; }
        }
      }
    }
    lb.roomId = (id != null && id >= 0) ? id : null;
  }
  // 방에 이름·타입 부여 (한 방에 여러 라벨이면 첫 번째, 발코니·실외기 같은 보조가 본이름을 덮지 않게 순서 유지)
  const roomsById = new Map(r.rooms.map(rm => [rm.id, rm]));
  for (const lb of labels) {
    if (lb.roomId == null) continue;
    const rm = roomsById.get(lb.roomId);
    if (!rm || rm.name) continue;
    rm.name = lb.name;
    rm.type = (LABEL_TYPES.find(([re]) => re.test(lb.name)) || [null, 'ROOM'])[1];
  }
  return labels;
}
