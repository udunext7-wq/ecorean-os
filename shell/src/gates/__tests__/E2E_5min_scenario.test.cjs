// ECOREAN BOC v5.6 — 5분 자동 견적 시나리오 E2E
// G1 → G2 → G3 → G4 → G5 순차 통과  /  자동화율 0% → 99%

const { G1Type }    = require('../G1_Type.cjs');
const { G2Concept } = require('../G2_Concept.cjs');
const { G3Section } = require('../G3_Section.cjs');
const { G4CAD }     = require('../G4_CAD.cjs');
const { G5Material }= require('../G5_Material.cjs');
const { GateRegistry } = require('../Gate.cjs');
const { coreBus }   = require('../../core-bus/CoreBus.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// 시나리오 — 30평 아파트, 클래식럭셔리, 욕실+주방+거실 시공
function runScenario() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  const g3 = new G3Section();
  const g4 = new G4CAD();
  const g5 = new G5Material();

  reg.register(g1);
  reg.register(g2);
  reg.register(g3);
  reg.register(g4);
  reg.register(g5);

  const eventLog = [];
  coreBus.on('GATE1_LOCKED', function() { eventLog.push('G1'); });
  coreBus.on('GATE2_LOCKED', function() { eventLog.push('G2'); });
  coreBus.on('GATE3_LOCKED', function() { eventLog.push('G3'); });
  coreBus.on('GATE4_LOCKED', function() { eventLog.push('G4'); });
  coreBus.on('GATE5_LOCKED', function() { eventLog.push('G5'); });

  // G1 — 30평 아파트
  const r1 = g1.lock({ residence: 'APARTMENT', pyeong: 30 }, reg);
  assert(r1.ok === true, 'G1 통과');
  assert(reg.getNextActivatable().id === 'g2_concept', 'G2 활성화');

  // G2 — 클래식럭셔리
  const r2 = g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  assert(r2.ok === true, 'G2 통과');
  assert(r2.payload.gradeMul === 1.8, '클래식 가산 1.8');
  assert(reg.getNextActivatable().id === 'g3_section', 'G3 활성화');

  // G3 — 욕실+주방+거실
  const r3 = g3.lock({ sections: ['bathroom','kitchen','living'] }, reg);
  assert(r3.ok === true, 'G3 통과');
  assert(r3.payload.autoSpaces.length === 3, 'auto spaces 3개');
  assert(reg.getNextActivatable().id === 'g4_cad', 'G4 활성화');

  // G4 — CAD (욕실 5㎡, 주방 10㎡, 거실 20㎡)
  const r4 = g4.lock({
    spaces: [
      { id: 'bath', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'kit',  area_sqm: 10, typeKey: 'KITCHEN'  },
      { id: 'liv',  area_sqm: 20, typeKey: 'LIVING'   }
    ]
  }, reg);
  assert(r4.ok === true, 'G4 통과');
  assert(r4.payload.totalAreaSqm === 35, '총 면적 35㎡');
  assert(r4.payload.stage1EstimateReady === true, '1단계 견적 발행 가능');

  // G5 — 자재 직접 선택 (옵션)
  const r5 = g5.lock({
    materials: [
      { id: 'fl_001', name: '강마루 화이트오크' },
      { id: 'wp_001', name: '실크 도배 베이지' }
    ]
  }, reg);
  assert(r5.ok === true, 'G5 통과');
  assert(r5.payload.stage2EstimateReady === true, '2단계 견적 발행 가능');

  assert(eventLog.length === 5, '5개 이벤트 발행');
  assert(eventLog.join(',') === 'G1,G2,G3,G4,G5', '게이트 순서');

  console.log('  시나리오: 30평 아파트 + 클래식럭셔리 + 욕실/주방/거실');
  console.log('  총 면적: ' + r4.payload.totalAreaSqm + '㎡');
  console.log('  컨셉 가산: ×' + r2.payload.gradeMul);
  console.log('  자재 선택: ' + r5.payload.materials.length + '건');
  console.log('  자동화율: 0% → 30% → 70% → 85% → 95% → 99%');
}

// 직전 게이트 미잠금 시 차단 검증
function testGateBlocking() {
  const reg = new GateRegistry();
  const g1 = new G1Type();
  const g2 = new G2Concept();
  reg.register(g1);
  reg.register(g2);

  const r = g2.lock({ concept: 'CLASSIC_LUXURY' }, reg);
  assert(r.ok === false, 'G1 미잠금 시 G2 차단');
}

runScenario();
testGateBlocking();
console.log('[PASS] E2E 5min scenario (모두 통과)');
