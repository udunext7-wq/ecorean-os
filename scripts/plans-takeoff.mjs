// 물량표 출력 — 도면 JSON 하나를 견적 입력용 물량으로 변환
// 사용:
//   node scripts/plans-takeoff.mjs <plan.json>            표로 출력
//   node scripts/plans-takeoff.mjs <plan.json> --json     JSON 출력 (견적 엔진 입력용)
//   node scripts/plans-takeoff.mjs --all                  카탈로그 전체 요약
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { takeoff } from './lib/quantity-takeoff.mjs';

const DATA = 'sites/net/public/catalog/plans/data';
const ARG = process.argv.slice(2);
const pad = (s, n, right = false) => { s = String(s); const w = [...s].reduce((a, c) => a + (c.charCodeAt(0) > 0x1100 ? 2 : 1), 0); const sp = ' '.repeat(Math.max(0, n - w)); return right ? sp + s : s + sp; };

function report(plan) {
  const t = takeoff(plan);
  console.log(`\n■ ${t.project || '(제목 없음)'}   천장고 ${t.ceiling_height_mm}mm`);
  console.log('─'.repeat(78));
  console.log(pad('실', 14) + pad('바닥㎡', 9, true) + pad('벽㎡', 9, true) + pad('천장㎡', 9, true) + pad('걸레받이m', 11, true) + pad('문', 4, true) + pad('창', 4, true) + '  개방m');
  console.log('─'.repeat(78));
  for (const s of t.spaces) {
    console.log(pad(s.name, 14) + pad(s.floor_m2, 9, true) + pad(s.wall_m2, 9, true) + pad(s.ceiling_m2, 9, true) +
      pad(s.baseboard_m, 11, true) + pad(s.doors, 4, true) + pad(s.windows, 4, true) + '  ' + (s.open_edge_m || ''));
  }
  console.log('─'.repeat(78));
  const T = t.totals;
  console.log(pad('실내 합계', 14) + pad(T.floor_m2, 9, true) + pad(T.wall_m2, 9, true) + pad(T.ceiling_m2, 9, true) +
    pad(T.baseboard_m, 11, true) + pad(T.doors, 4, true) + pad(T.windows, 4, true));
  console.log('\n[견적 물량]');
  console.log(`  도배    벽 ${T.wallpaper_wall_m2}㎡ · 천장 ${T.wallpaper_ceiling_m2}㎡`);
  console.log(`  바닥재  ${T.floor_m2 - T.tile_floor_m2 > 0 ? (Math.round((T.floor_m2 - T.tile_floor_m2) * 100) / 100) : 0}㎡ (욕실 제외)`);
  console.log(`  욕실타일 벽 ${T.tile_wall_m2}㎡ · 바닥 ${T.tile_floor_m2}㎡`);
  console.log(`  걸레받이 ${T.baseboard_m}m · 천장몰딩 ${T.cornice_m}m`);
  console.log(`  문 ${T.doors}개 · 창 ${T.windows}개`);
  console.log(`  발코니  ${T.balcony_floor_m2}㎡ (확장 여부 확인 필요)`);
  console.log(`  구조벽  ${T.structural_wall_length_m}m (철거 검토용, 중복 제거)`);
  console.log(`\n  ※ 도면 기반 산출값입니다. 착공 전 현장 실측으로 검증하세요.`);
  return t;
}

if (ARG.includes('--all')) {
  const files = readdirSync(DATA).filter(f => f.endsWith('.json'));
  console.log(`도면 ${files.length}건 요약\n`);
  console.log(pad('도면', 22) + pad('실', 5, true) + pad('바닥㎡', 9, true) + pad('도배벽㎡', 11, true) + pad('걸레받이m', 11, true) + pad('문', 4, true));
  for (const f of files.slice(0, 40)) {
    try {
      const t = takeoff(JSON.parse(readFileSync(`${DATA}/${f}`, 'utf8')));
      console.log(pad(f.replace('.json', ''), 22) + pad(t.spaces.length, 5, true) + pad(t.totals.floor_m2, 9, true) +
        pad(t.totals.wallpaper_wall_m2, 11, true) + pad(t.totals.baseboard_m, 11, true) + pad(t.totals.doors, 4, true));
    } catch (e) { console.log(pad(f, 22) + ' ERR ' + e.message); }
  }
  process.exit(0);
}

const file = ARG.find(a => !a.startsWith('--'));
if (!file || !existsSync(file)) {
  console.error('❌ 사용: node scripts/plans-takeoff.mjs <plan.json> [--json]  |  --all');
  process.exit(1);
}
const plan = JSON.parse(readFileSync(file, 'utf8'));
if (ARG.includes('--json')) console.log(JSON.stringify(takeoff(plan), null, 1));
else report(plan);
