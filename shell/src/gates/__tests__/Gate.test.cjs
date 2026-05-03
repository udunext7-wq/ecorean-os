const { Gate, GateRegistry } = require('../Gate.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

class TestGate extends Gate {
  validate(input) {
    if (!input || !input.value) return { errors: ['value 필수'] };
    return { errors: [] };
  }
  process(input) {
    return { ok: true, payload: { result: input.value * 2 } };
  }
}

// Test 1: 추상 메서드 throw
(function() {
  const g = new Gate({ id: 'test', eventOnLock: 'TEST' });
  let threw = false;
  try { g.validate({}); } catch(e) { threw = true; }
  assert(threw, 'validate() 추상');
})();

// Test 2: validate 통과 후 lock 성공
(function() {
  const g = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const result = g.lock({ value: 5 });
  assert(result.ok === true, 'lock 성공');
  assert(g.locked === true, 'locked = true');
  assert(result.payload.result === 10, 'process 결과');
})();

// Test 3: validate 실패 시 lock 차단
(function() {
  const g = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const result = g.lock({});
  assert(result.ok === false, 'validate 실패 시 lock 차단');
  assert(g.locked === false, '미잠금');
})();

// Test 4: 직전 게이트 미잠금 시 lock 차단
(function() {
  const reg = new GateRegistry();
  const g1 = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const g2 = new TestGate({ id: 'g2', eventOnLock: 'G2_LOCKED', dependsOn: 'g1' });
  reg.register(g1);
  reg.register(g2);
  const result = g2.lock({ value: 3 }, reg);
  assert(result.ok === false, 'g1 미잠금 시 g2 차단');
})();

// Test 5: 직전 게이트 잠금 후 다음 게이트 가능
(function() {
  const reg = new GateRegistry();
  const g1 = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const g2 = new TestGate({ id: 'g2', eventOnLock: 'G2_LOCKED', dependsOn: 'g1' });
  reg.register(g1);
  reg.register(g2);
  g1.lock({ value: 5 });
  const result = g2.lock({ value: 3 }, reg);
  assert(result.ok === true, 'g1 잠금 후 g2 가능');
})();

// Test 6: unlock
(function() {
  const g = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  g.lock({ value: 5 });
  assert(g.locked === true, '잠금');
  g.unlock();
  assert(g.locked === false, 'unlock');
})();

// Test 7: GateRegistry getNextActivatable
(function() {
  const reg = new GateRegistry();
  const g1 = new TestGate({ id: 'g1', eventOnLock: 'G1_LOCKED' });
  const g2 = new TestGate({ id: 'g2', eventOnLock: 'G2_LOCKED', dependsOn: 'g1' });
  const g3 = new TestGate({ id: 'g3', eventOnLock: 'G3_LOCKED', dependsOn: 'g2' });
  reg.register(g1);
  reg.register(g2);
  reg.register(g3);
  assert(reg.getNextActivatable().id === 'g1', '초기엔 g1');
  g1.lock({ value: 1 });
  assert(reg.getNextActivatable().id === 'g2', 'g1 잠그면 g2');
  g2.lock({ value: 2 });
  assert(reg.getNextActivatable().id === 'g3', 'g2 잠그면 g3');
})();

// Test 8: lock 시 CoreBus 이벤트 발행
(function() {
  const { coreBus } = require('../../core-bus/CoreBus.cjs');
  const g = new TestGate({ id: 'g1', eventOnLock: 'TEST_LOCK_EVENT' });
  let received = null;
  coreBus.on('TEST_LOCK_EVENT', function(p, meta) { received = { payload: p, meta: meta }; });
  g.lock({ value: 7 });
  assert(received !== null, '이벤트 수신');
  assert(received.payload.result === 14, '페이로드');
  assert(received.meta.gateId === 'g1', 'meta.gateId');
})();

console.log('[PASS] Gate (8/8)');
