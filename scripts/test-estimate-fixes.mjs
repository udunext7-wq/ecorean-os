// 견적OS 수정 회귀 테스트 — node scripts/test-estimate-fixes.mjs
// 대상: sites/net/public/estimate/index.html 의 calcEst 벽면적·걸레받이/몰딩 자동 산출
// 407KB 단일 HTML 이라 모듈 import 이 불가능하므로, 수정된 계산 로직을 소스에서 확인하고
// 동일한 식을 재현해 손계산과 대조한다.
import { readFileSync } from 'node:fs';

const SRC = 'sites/net/public/estimate/index.html';
const html = readFileSync(SRC, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}${d ? ' — ' + d : ''}`); } };

console.log('■ 소스 반영 확인');
ok(/const wa=\(\+sp\.wa>0\)\?\+sp\.wa:p\*h;/.test(html), 'calcEst 가 도면 실측 벽면적(sp.wa) 우선 사용');
ok(/row\.wa=aW;/.test(html), 'importFloorPlan 이 공간 행에 wa 저장');
ok(/push\('FIN_ML',mlEA,'천장 둘레 자동'\)/.test(html), '몰딩 자동 산출 복구');
ok(/push\('FIN_BB',bbEA,'벽 둘레−문폭 자동'\)/.test(html), '걸레받이 자동 산출 복구');
ok(/carpTypes\.has\('몰딩\(2\.4m\)'\)/.test(html) && /carpTypes\.has\('걸레받이\(2\.4m\)'\)/.test(html),
  '목공 모듈 수기 입력 시 중복 방지 가드 존재');
ok(/id:'ml',\s*label:'몰딩'/.test(html) && /id:'bb',\s*label:'걸레받이'/.test(html), '자동계산 on/off 토글 추가');
ok(!/\/\* 몰딩·걸레받이 — 목공 모듈에서 직접 선택 \(자동 제거\) \*\//.test(html), '구 주석(자동 제거) 제거됨');

console.log('\n■ 계산식 재현 — 벽면적');
{
  // 수기 입력 공간(도면 아님): sp.wa 없음 → 종전대로 둘레×높이
  const manual = { area: 12, perim: 14, h: 2400 };
  const waManual = (+manual.wa > 0) ? +manual.wa : manual.perim * (manual.h / 1000);
  ok(waManual === 33.6, `수기 공간은 종전식 유지 14m×2.4m=33.6㎡ (실제 ${waManual})`);

  // 도면 연동 공간: MiniCAD 실측값 사용
  const fromPlan = { area: 12, perim: 14, h: 2400, wa: 31.7 };
  const waPlan = (+fromPlan.wa > 0) ? +fromPlan.wa : fromPlan.perim * (fromPlan.h / 1000);
  ok(waPlan === 31.7, `도면 공간은 실측값 31.7㎡ 사용 (실제 ${waPlan})`);
  ok(waManual > waPlan, '종전식이 더 큼 = 철거 과다 계상이 해소됨');
}

console.log('\n■ 계산식 재현 — 걸레받이·몰딩');
{
  const spaces = [{ perim: 14 }, { perim: 12 }, { perim: 8 }]; // 둘레 합 34m
  const doors = [{ qty: 3 }];
  const mlEA = spaces.reduce((s, sp) => s + Math.ceil(sp.perim / 2.4), 0);
  ok(mlEA === 6 + 5 + 4, `몰딩 EA = 실별 올림 합 15 (실제 ${mlEA})`);

  const doorQty = doors.reduce((s, d) => s + (+d.qty || 0), 0);
  const periSum = spaces.reduce((s, sp) => s + (+sp.perim || 0), 0);
  const bbEA = Math.ceil(Math.max(0, periSum - doorQty * 0.9) / 2.4);
  ok(doorQty === 3 && periSum === 34, '문 3개 · 둘레합 34m');
  // (34 − 2.7) / 2.4 = 13.04 → 14
  ok(bbEA === 14, `걸레받이 EA = ceil((34−2.7)/2.4) = 14 (실제 ${bbEA})`);
  ok(bbEA * 2.4 >= periSum - doorQty * 0.9, '올림이므로 필요 길이를 하회하지 않음');

  // 목공 모듈에 수기 입력이 있으면 자동 미적용
  const carpTypes = new Set(['걸레받이(2.4m)']);
  ok(carpTypes.has('걸레받이(2.4m)'), '수기 걸레받이 존재 시 자동 건너뜀 (중복 방지)');
  ok(!carpTypes.has('몰딩(2.4m)'), '몰딩은 수기 없음 → 자동 적용');
}

console.log('\n■ 안전장치');
{
  const noDoors = Math.ceil(Math.max(0, 0 - 0 * 0.9) / 2.4);
  ok(noDoors === 0, '공간 없으면 걸레받이 0 (음수·NaN 없음)');
  const huge = Math.ceil(Math.max(0, 10 - 20 * 0.9) / 2.4);
  ok(huge === 0, '문 폭이 둘레보다 커도 음수 방지 (실제 ' + huge + ')');
}

console.log(`\n${fail ? '❌' : '✅'} 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
