// WizardController 테스트 — Node.js 직접 실행 (esbuild 없이)
// @gates / @estimate-v6 별칭을 실제 경로로 우회

const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');

// 별칭 수동 등록
const Module = require('module');
const _resolveFilename = Module._resolveFilename.bind(Module);
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@gates/')) {
    return _resolveFilename(path.join(ROOT, 'shell/src/gates', request.slice(7)), parent, isMain, options);
  }
  if (request.startsWith('@estimate-v6/')) {
    return _resolveFilename(path.join(ROOT, 'modules-html/estimate-v6/src', request.slice(13)), parent, isMain, options);
  }
  if (request.startsWith('@core-bus/')) {
    return _resolveFilename(path.join(ROOT, 'shell/src/core-bus', request.slice(10)), parent, isMain, options);
  }
  if (request.startsWith('@feature-flags/')) {
    return _resolveFilename(path.join(ROOT, 'shell/src/feature-flags', request.slice(15)), parent, isMain, options);
  }
  return _resolveFilename(request, parent, isMain, options);
};

const { WizardController, STAGES } = require('../src/wizard/WizardController.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 5 stages 정의
(function() {
  assert(Object.keys(STAGES).length === 5, '5 stages');
  assert(STAGES.G1.automation === 30, 'G1 30%');
  assert(STAGES.G5.automation === 99, 'G5 99%');
})();

// Test 2: 초기 상태
(function() {
  const w = new WizardController();
  const s = w.getState();
  assert(s.lockedGates.length === 0, '초기 0개');
  assert(s.currentStage === 'G1', '초기 G1');
  assert(s.automation === 0, '자동화 0%');
})();

// Test 3: G1 잠금 → G2 진입 + 자동화 30%
(function() {
  const w = new WizardController();
  const r = w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  assert(r.ok, 'G1 OK');
  assert(w.getState().currentStage === 'G2', 'G2 진입');
  assert(w.getAutomation() === 30, '30%');
})();

// Test 4: G1 미잠금 시 G2 차단
(function() {
  const w = new WizardController();
  const r = w.lockG2({ concept: 'CLASSIC_LUXURY' });
  assert(!r.ok, 'G1 없으면 차단');
})();

// Test 5: G3 잠금 시 자동 공간 추출 이벤트
(function() {
  const w = new WizardController();
  let receivedAutoSpaces = null;
  w.subscribe((evt, payload) => {
    if (evt === 'GATE_LOCKED' && payload.gate === 'G3') {
      receivedAutoSpaces = payload.autoSpaces;
    }
  });
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  w.lockG3({ sections: ['bathroom', 'kitchen', 'living'] });
  assert(receivedAutoSpaces && receivedAutoSpaces.length > 0, '자동 공간 추출');
  assert(receivedAutoSpaces.includes('BATHROOM'), 'BATHROOM 포함');
})();

// Test 6: G4 잠금 시 견적 즉시 계산
(function() {
  const w = new WizardController();
  let receivedEstimate = null;
  w.subscribe((evt, payload) => {
    if (evt === 'ESTIMATE_CALCULATED') receivedEstimate = payload;
  });
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  w.lockG3({ sections: ['bathroom', 'kitchen', 'living'] });
  w.lockG4({
    spaces: [
      { id: 'b1', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'k1', area_sqm: 10, typeKey: 'KITCHEN' },
      { id: 'l1', area_sqm: 20, typeKey: 'LIVING' }
    ]
  });
  assert(receivedEstimate, '견적 계산됨');
  assert(receivedEstimate.supply > 0, '공급가 > 0');
  assert(receivedEstimate.contract > receivedEstimate.supply, '도급 > 공급');
  assert(receivedEstimate.final > receivedEstimate.contract, '최종 > 도급 (VAT)');
  assert(w.getAutomation() === 95, 'G4 = 95%');
})();

// Test 7: 이전 단계로 돌아가기
(function() {
  const w = new WizardController();
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  const r = w.goBack();
  assert(r.ok, 'goBack OK');
  assert(w.getState().lockedGates.length === 1, '1개만 남음');
})();

// Test 8: reset
(function() {
  const w = new WizardController();
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.reset();
  assert(w.getState().lockedGates.length === 0, '리셋 후 0개');
  assert(w.getState().currentStage === 'G1', '리셋 후 G1');
})();

// Test 9: 이벤트 구독
(function() {
  const w = new WizardController();
  const events = [];
  w.subscribe((evt, payload) => events.push(evt));
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  assert(events.includes('GATE_LOCKED'), 'GATE_LOCKED 발행');
})();

// Test 10: G5 옵션 (G4 후 바로 견적 사용 가능)
(function() {
  const w = new WizardController();
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  w.lockG3({ sections: ['bathroom'] });
  w.lockG4({ spaces: [{ id: 'b1', area_sqm: 5, typeKey: 'BATHROOM' }] });
  assert(w.getState().estimate, 'G4 후 견적 존재');
  assert(w.getAutomation() === 95, 'G5 없이 95%');
})();

console.log('[PASS] WizardController (10/10)');
