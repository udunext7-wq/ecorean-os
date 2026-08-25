// 표준 평면도 SVG 생성기 — 대한민국 아파트 전 평형대 확충 (2026-08-25 대표 지시)
// 기존 수작성 std-*.svg 와 동일한 스타일·구조(56px/m, 동일 색상·치수선·푸터)로 신규 평형 SVG 를 생성.
// 방 배치는 격자 타일링(빈틈·겹침 없음)을 코드로 검증한다. 생성 후 plans-svg-to-minicad.mjs 로 JSON 변환.
import { writeFileSync } from 'node:fs';

const S = 56;            // px per meter (기존 도면과 동일)
const PADL = 46, PADT = 41.4;

// 방 이름 → 채움색 (기존 도면 팔레트)
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
const typeOf = n => (TYPE_OF.find(([re]) => re.test(n)) || [null, 'ROOM'])[1];

// ── 평형별 스펙: 이름, 제목, 전용면적 표기, 방/욕실 수, 외곽 W×H(m), rooms [이름,x,y,w,h], 발코니 높이(m) ──
const PLANS = [
  { slug:'std-16', title:'표준 미니 원룸 16㎡ (도시형 생활주택)', rooms_n:1, baths:1, W:3.6, H:4.5,
    rooms:[['원룸',0,0,3.6,3.0],['현관',0,3.0,1.2,1.5],['욕실',1.2,3.0,1.4,1.5],['주방',2.6,3.0,1.0,1.5]] },
  { slug:'std-29', title:'표준 1.5룸 29㎡ (오피스텔형)', rooms_n:2, baths:1, W:5.4, H:5.4,
    rooms:[['침실',0,0,2.7,3.0],['거실·주방',2.7,0,2.7,3.0],['알파룸',0,3.0,1.8,2.4],['현관',1.8,3.0,1.6,2.4],['욕실',3.4,3.0,2.0,2.4]] },
  { slug:'std-33', title:'표준 투룸 33㎡ (빌라형)', rooms_n:2, baths:1, W:6.0, H:5.5,
    rooms:[['침실1',0,0,3.0,3.1],['거실·주방',3.0,0,3.0,3.1],['침실2',0,3.1,2.6,2.4],['현관',2.6,3.1,1.4,2.4],['욕실',4.0,3.1,2.0,2.4]] },
  { slug:'std-39', title:'표준 투룸 39㎡ (복도식 구축)', rooms_n:2, baths:1, W:7.2, H:5.4, balcony:1.2,
    rooms:[['침실1',0,0,3.3,3.0],['거실',3.3,0,3.9,3.0],['침실2',0,3.0,3.0,2.4],['주방',3.0,3.0,1.8,2.4],['현관',4.8,3.0,1.2,2.4],['욕실',6.0,3.0,1.2,2.4]] },
  { slug:'std-46', title:'표준 투룸 46㎡ (계단식 구축)', rooms_n:2, baths:1, W:7.8, H:5.9, balcony:1.2,
    rooms:[['침실1',0,0,3.6,3.3],['거실',3.6,0,4.2,3.3],['침실2',0,3.3,3.0,2.6],['주방',3.0,3.3,2.0,2.6],['현관',5.0,3.3,1.3,2.6],['욕실',6.3,3.3,1.5,2.6]] },
  { slug:'std-51', title:'표준 쓰리룸 51㎡ (소형 3룸)', rooms_n:3, baths:1, W:8.4, H:6.1, balcony:1.2,
    rooms:[['침실2',0,0,3.0,3.3],['거실',3.0,0,3.0,3.3],['침실3',6.0,0,2.4,3.3],['안방',0,3.3,3.2,2.8],['주방',3.2,3.3,2.2,2.8],['현관',5.4,3.3,1.2,2.8],['욕실',6.6,3.3,1.8,2.8]] },
  { slug:'std-59c', title:'표준 59㎡ C타입 (타워형)', rooms_n:2, baths:2, W:8.4, H:7.0,
    rooms:[['안방',0,0,3.6,3.0],['부부욕실',3.6,0,1.6,3.0],['주방·식당',5.2,0,3.2,3.0],['거실',0,3.0,4.2,4.0],['현관·복도',4.2,3.0,1.8,2.0],['공용욕실',6.0,3.0,2.4,2.0],['침실2',4.2,5.0,4.2,2.0]] },
  { slug:'std-74a', title:'표준 74㎡ A타입 (3베이 판상형)', rooms_n:3, baths:2, W:10.2, H:7.3, balcony:1.2,
    rooms:[['침실2',0,0,3.0,3.9],['주방·식당',3.0,0,3.6,3.9],['현관·복도',6.6,0,1.4,3.9],['침실3',8.0,0,2.2,3.9],
           ['안방',0,3.9,3.4,3.4],['거실',3.4,3.9,4.6,3.4],['공용욕실',8.0,3.9,2.2,1.7],['부부욕실',8.0,5.6,2.2,1.7]] },
  { slug:'std-74b', title:'표준 74㎡ B타입 (타워형)', rooms_n:2, baths:2, W:9.6, H:7.8,
    rooms:[['안방',0,0,3.9,3.2],['드레스룸',3.9,0,1.7,3.2],['주방·식당',5.6,0,4.0,3.2],['거실',0,3.2,4.8,4.6],
           ['현관·복도',4.8,3.2,2.4,1.8],['공용욕실',7.2,3.2,2.4,1.8],['침실2',4.8,5.0,3.0,2.8],['부부욕실',7.8,5.0,1.8,2.8]] },
  { slug:'std-99', title:'표준 99㎡ (구축 판상형)', rooms_n:3, baths:1, W:12.0, H:8.3, balcony:1.2,
    rooms:[['침실2',0,0,3.3,4.2],['거실',3.3,0,5.4,4.2],['침실3',8.7,0,3.3,4.2],['안방',0,4.2,4.2,4.1],['주방·식당',4.2,4.2,4.2,4.1],
           ['현관·복도',8.4,4.2,3.6,2.0],['욕실',8.4,6.2,1.8,2.1],['다용도실',10.2,6.2,1.8,2.1]] },
  { slug:'std-125', title:'표준 125㎡ (방4 판상형)', rooms_n:4, baths:2, W:13.2, H:9.5, balcony:1.2,
    rooms:[['침실2',0,0,3.3,4.0],['주방·식당',3.3,0,4.5,4.0],['현관·복도',7.8,0,1.8,4.0],['침실3',9.6,0,3.6,4.0],
           ['안방',0,4.0,4.2,3.3],['부부욕실',0,7.3,4.2,2.2],['거실',4.2,4.0,5.4,5.5],
           ['공용욕실',9.6,4.0,1.8,2.0],['드레스룸',11.4,4.0,1.8,2.0],['침실4',9.6,6.0,3.6,3.5]] },
  { slug:'std-135', title:'표준 135㎡ (방4 대형)', rooms_n:4, baths:2, W:13.8, H:9.8, balcony:1.2,
    rooms:[['침실2',0,0,3.3,4.2],['주방·식당',3.3,0,4.5,4.2],['현관·복도',7.8,0,1.5,4.2],['드레스룸',9.3,0,1.5,4.2],['침실3',10.8,0,3.0,4.2],
           ['안방',0,4.2,4.2,3.6],['부부욕실',0,7.8,4.2,2.0],['거실',4.2,4.2,5.7,5.6],
           ['공용욕실',9.9,4.2,2.1,1.8],['다용도실',12.0,4.2,1.8,1.8],['침실4',9.9,6.0,3.9,3.8]] },
  { slug:'std-145', title:'표준 145㎡ (방4 광폭)', rooms_n:4, baths:2, W:14.4, H:10.1, balcony:1.2,
    rooms:[['침실2',0,0,3.6,4.2],['주방·식당',3.6,0,5.1,4.2],['현관·복도',8.7,0,1.8,4.2],['침실3',10.5,0,3.9,4.2],
           ['안방',0,4.2,4.5,3.7],['드레스룸',0,7.9,2.3,2.2],['부부욕실',2.3,7.9,2.2,2.2],['거실',4.5,4.2,6.0,5.9],
           ['공용욕실',10.5,4.2,2.1,1.9],['팬트리',12.6,4.2,1.8,1.9],['침실4',10.5,6.1,3.9,4.0]] },
  { slug:'std-163', title:'표준 163㎡ (펜트하우스형)', rooms_n:4, baths:2, W:15.0, H:10.9, balcony:1.5,
    rooms:[['침실2',0,0,3.9,4.5],['주방·식당',3.9,0,5.4,4.5],['현관·복도',9.3,0,1.8,4.5],['침실3',11.1,0,3.9,4.5],
           ['안방',0,4.5,4.8,4.0],['드레스룸',0,8.5,2.4,2.4],['부부욕실',2.4,8.5,2.4,2.4],['거실',4.8,4.5,6.0,6.4],
           ['공용욕실',10.8,4.5,2.2,2.0],['다용도실',13.0,4.5,2.0,2.0],['침실4',10.8,6.5,4.2,4.4]] },
];

const f1 = v => Math.round(v * 10) / 10;
const px = v => Math.round(v * S * 10) / 10;

let made = 0;
for (const p of PLANS) {
  // ── 타일링 검증: 방 면적 합 = W×H, 겹침 없음 ──
  let sum = 0;
  for (const [, , , w, h] of p.rooms) sum += w * h;
  if (Math.abs(sum - p.W * p.H) > 0.01) { console.error(`❌ ${p.slug}: 타일링 불일치 — 합 ${sum.toFixed(2)} ≠ ${(p.W * p.H).toFixed(2)}`); continue; }
  let overlap = false;
  for (let i = 0; i < p.rooms.length; i++) for (let j = i + 1; j < p.rooms.length; j++) {
    const a = p.rooms[i], b = p.rooms[j];
    if (Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0.001 &&
        Math.min(a[2] + a[4], b[2] + b[4]) - Math.max(a[2], b[2]) > 0.001) { overlap = true; console.error(`❌ ${p.slug}: 겹침 ${a[0]}∩${b[0]}`); }
  }
  if (overlap) continue;
  const exclusive = f1(p.W * p.H);

  const Wpx = px(p.W), Hpx = px(p.H);
  const outR = PADL + Wpx, outB = PADT + Hpx;
  const balH = p.balcony ? px(p.balcony) : 0;
  const contentB = outB + balH;
  const lineY = contentB + 33 - 0.4, titleY = contentB + 51 - 0.4, subY = contentB + 70 - 0.4, svgH = contentB + 87 - 0.4;
  const svgW = outR + 46;

  let b = '';
  b += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" font-family="'Malgun Gothic','Apple SD Gothic Neo',sans-serif">\n`;
  b += `<defs><pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#f3f0e8"/><line x1="0" y1="0" x2="0" y2="8" stroke="#ddd6c6" stroke-width="2"/></pattern></defs>\n`;
  b += `<rect width="${svgW}" height="${svgH}" fill="#faf9f6"/>\n`;
  // 방
  for (const [name, x, y, w, h] of p.rooms) {
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
  // 발코니
  if (balH) {
    b += `<rect x="${PADL}" y="${outB}" width="${Wpx}" height="${balH}" fill="url(#hatch)" stroke="#3a352c" stroke-width="2" stroke-dasharray="6 4"/>\n`;
    b += `<text x="${PADL + Wpx / 2}" y="${outB + balH / 2 + 4}" font-size="11" text-anchor="middle" fill="#8a8272" font-weight="700">발코니 (확장 가능)</text>\n`;
  }
  // 외곽 경계
  b += `<rect x="${PADL}" y="${PADT}" width="${Wpx}" height="${Hpx}" fill="none" stroke="#26221b" stroke-width="5"/>\n`;
  // 치수선 (상단 가로)
  b += `<line x1="${PADL}" y1="25.4" x2="${outR}" y2="25.4" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="${PADL}" y1="20.4" x2="${PADL}" y2="30.4" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="${outR}" y1="20.4" x2="${outR}" y2="30.4" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<text x="${PADL + Wpx / 2}" y="19.4" font-size="11" text-anchor="middle" fill="#8a713f">${f1(p.W)}m</text>\n`;
  // 치수선 (좌측 세로)
  b += `<line x1="30" y1="${PADT}" x2="30" y2="${outB}" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="25" y1="${PADT}" x2="35" y2="${PADT}" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<line x1="25" y1="${outB}" x2="35" y2="${outB}" stroke="#B8965A" stroke-width="1"/>\n`;
  b += `<text x="24" y="${PADT + Hpx / 2}" font-size="11" text-anchor="middle" fill="#8a713f" transform="rotate(-90 24 ${PADT + Hpx / 2})">${f1(p.H)}m</text>\n`;
  // 푸터
  b += `<line x1="${PADL}" y1="${lineY}" x2="${outR}" y2="${lineY}" stroke="#d9d2c2" stroke-width="1"/>\n`;
  b += `<text x="${PADL}" y="${titleY}" font-size="15" font-weight="800" fill="#26221b">${p.title}</text>\n`;
  b += `<text x="${PADL}" y="${subY}" font-size="11.5" fill="#7a7263">전용 ${exclusive}㎡ · 방 ${p.rooms_n} · 욕실 ${p.baths} — ECOREAN 자체 작성 표준 도면 (실측 아님·밑그림용)</text>\n`;
  b += `<text x="${outR}" y="${titleY}" font-size="11" text-anchor="end" fill="#B8965A" font-weight="800" letter-spacing="2">ECOREAN</text>\n`;
  b += `</svg>`;
  writeFileSync(`sites/net/public/catalog/plans/img/${p.slug}.svg`, b);
  made++;
  console.log(`✅ ${p.slug}: ${p.title} — 방 ${p.rooms.length}칸 · 전용 ${exclusive}㎡`);
}
console.log(`\n${made}/${PLANS.length} 생성 완료`);
// DB 시드용 스펙 내보내기 (plans-seed.sql 생성 등에 사용)
writeFileSync('scripts/plans-standards-spec.json', JSON.stringify(PLANS.map(p => ({
  slug: p.slug, title: p.title, exclusive_area_m2: f1(p.W * p.H), rooms: p.rooms_n, baths: p.baths,
})), null, 1));
