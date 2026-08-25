// 평면도 SVG 공용 렌더러 — 표준 평면도·실단지 재작도 공용 (2026-08-25)
// 스펙(외곽 W×H m, rooms [이름,x,y,w,h] m, 발코니 높이 m)을 기존 수작성 도면과 동일한
// 스타일(56px/m, 팔레트·치수선·푸터)의 SVG 문자열로 렌더. 격자 타일링(빈틈·겹침) 검증 포함.
export const S = 56;            // px per meter
export const PADL = 46, PADT = 41.4;

const FILL = {
  ROOM: '#fdfcf6', LIVING: '#fbf6ec', KITCHEN: '#e9f1f5', BATHROOM: '#e9f1f5',
  ENTRANCE: '#f3f0ea', CORRIDOR: '#f3f0ea', DRESSING: '#f6f1e8', PANTRY: '#f6f1e8',
  UTILITY: '#e9f1f5',
};
const TYPE_OF = [
  [/욕실/, 'BATHROOM'], [/^거실/, 'LIVING'], [/주방|식당/, 'KITCHEN'],
  [/^현관/, 'ENTRANCE'], [/^복도/, 'CORRIDOR'], [/드레스룸/, 'DRESSING'],
  [/다용도실/, 'UTILITY'], [/팬트리/, 'PANTRY'],
];
export const typeOf = n => (TYPE_OF.find(([re]) => re.test(n)) || [null, 'ROOM'])[1];
export const f1 = v => Math.round(v * 10) / 10;
const px = v => Math.round(v * S * 10) / 10;

// 타일링 검증: 방 면적 합 = W×H, 겹침 없음. 위반 시 문자열(오류) 반환, 정상이면 null
export function validateTiling({ W, H, rooms }) {
  let sum = 0;
  for (const [, , , w, h] of rooms) sum += w * h;
  if (Math.abs(sum - W * H) > 0.01) return `타일링 불일치 — 합 ${sum.toFixed(2)} ≠ ${(W * H).toFixed(2)}`;
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    const a = rooms[i], b = rooms[j];
    if (Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0.001 &&
        Math.min(a[2] + a[4], b[2] + b[4]) - Math.max(a[2], b[2]) > 0.001) return `겹침 ${a[0]}∩${b[0]}`;
  }
  return null;
}

// spec: {title, sub, W, H, rooms:[[이름,x,y,w,h],...], balcony?:높이m}
export function renderPlanSVG(spec) {
  const { title, sub, W, H, rooms, balcony } = spec;
  const Wpx = px(W), Hpx = px(H);
  const outR = PADL + Wpx, outB = PADT + Hpx;
  const balH = balcony ? px(balcony) : 0;
  const contentB = outB + balH;
  const lineY = contentB + 32.6, titleY = contentB + 50.6, subY = contentB + 69.6, svgH = contentB + 86.6;
  const svgW = outR + 46;

  let b = '';
  b += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" font-family="'Malgun Gothic','Apple SD Gothic Neo',sans-serif">\n`;
  b += `<defs><pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#f3f0e8"/><line x1="0" y1="0" x2="0" y2="8" stroke="#ddd6c6" stroke-width="2"/></pattern></defs>\n`;
  b += `<rect width="${svgW}" height="${svgH}" fill="#faf9f6"/>\n`;
  for (const [name, x, y, w, h] of rooms) {
    const rx = PADL + px(x), ry = PADT + px(y), rw = px(w), rh = px(h);
    const t = typeOf(name);
    const cx = rx + rw / 2, cy = ry + rh / 2;
    const area = f1(w * h);
    const showArea = area >= 3.5 && rh >= 60;
    b += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${FILL[t]}" stroke="#3a352c" stroke-width="2"/>\n`;
    if (showArea) {
      b += `<text x="${cx}" y="${cy - 3}" font-size="13" text-anchor="middle" fill="#3a352c" font-weight="700">${name}</text>\n`;
      b += `<text x="${cx}" y="${cy + 13}" font-size="9.5" text-anchor="middle" fill="#9a917f">${area}㎡</text>\n`;
    } else {
      b += `<text x="${cx}" y="${cy + 4}" font-size="${rw < 75 ? 11 : 13}" text-anchor="middle" fill="#3a352c" font-weight="700">${name}</text>\n`;
    }
  }
  if (balH) {
    b += `<rect x="${PADL}" y="${outB}" width="${Wpx}" height="${balH}" fill="url(#hatch)" stroke="#3a352c" stroke-width="2" stroke-dasharray="6 4"/>\n`;
    b += `<text x="${PADL + Wpx / 2}" y="${outB + balH / 2 + 4}" font-size="11" text-anchor="middle" fill="#8a8272" font-weight="700">발코니 (확장 가능)</text>\n`;
  }
  b += `<rect x="${PADL}" y="${PADT}" width="${Wpx}" height="${Hpx}" fill="none" stroke="#26221b" stroke-width="5"/>\n`;
  b += `<line x1="${PADL}" y1="25.4" x2="${outR}" y2="25.4" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="${PADL}" y1="20.4" x2="${PADL}" y2="30.4" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="${outR}" y1="20.4" x2="${outR}" y2="30.4" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<text x="${PADL + Wpx / 2}" y="19.4" font-size="11" text-anchor="middle" fill="#8a713f">${f1(W)}m</text>\n`;
  b += `<line x1="30" y1="${PADT}" x2="30" y2="${outB}" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="25" y1="${PADT}" x2="35" y2="${PADT}" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="25" y1="${outB}" x2="35" y2="${outB}" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<text x="24" y="${PADT + Hpx / 2}" font-size="11" text-anchor="middle" fill="#8a713f" transform="rotate(-90 24 ${PADT + Hpx / 2})">${f1(H)}m</text>\n`;
  b += `<line x1="${PADL}" y1="${lineY}" x2="${outR}" y2="${lineY}" stroke="#d9d2c2" stroke-width="1"/>\n`;
  b += `<text x="${PADL}" y="${titleY}" font-size="15" font-weight="800" fill="#26221b">${title}</text>\n`;
  b += `<text x="${PADL}" y="${subY}" font-size="11.5" fill="#7a7263">${sub}</text>\n`;
  b += `<text x="${outR}" y="${titleY}" font-size="11" text-anchor="end" fill="#B8965A" font-weight="800" letter-spacing="2">ECOREAN</text>\n`;
  b += `</svg>`;
  return b;
}

// 기존 표준 도면 JSON(data/std-*.json)을 rooms 스펙으로 역변환 (실단지 템플릿용)
// 발코니 공간은 balcony 높이로 분리, polygon 은 bbox 사각형으로 취급
export function specFromPlanJSON(json) {
  const rooms = [], balcs = [];
  for (const sp of json.spaces) {
    const xs = sp.polygon.map(p => p.x), ys = sp.polygon.map(p => p.y);
    const r = [sp.name, Math.min(...xs) / 1000, Math.min(...ys) / 1000,
      (Math.max(...xs) - Math.min(...xs)) / 1000, (Math.max(...ys) - Math.min(...ys)) / 1000];
    (sp.type === 'BALCONY' ? balcs : rooms).push(r);
  }
  const W = Math.max(...rooms.map(r => r[1] + r[3]));
  const H = Math.max(...rooms.map(r => r[2] + r[4]));
  const balcony = balcs.length ? f1(Math.max(...balcs.map(r => r[4]))) : 0;
  const bedrooms = json.spaces.filter(s => s.type === 'ROOM').length;
  const baths = json.spaces.filter(s => s.type === 'BATHROOM').length;
  return { W: f1(W), H: f1(H), rooms, balcony, bedrooms, baths, area: f1(rooms.reduce((s, r) => s + r[3] * r[4], 0)) };
}
