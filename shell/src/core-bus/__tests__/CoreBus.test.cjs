const { CoreBus } = require('../CoreBus.cjs');

function assert(cond, msg) {
  if (!cond) {
    console.error('[FAIL]', msg);
    process.exit(1);
  }
}

// Test 1: emit/on 기본
(function() {
  const bus = new CoreBus();
  let received = null;
  bus.on('TEST_EVENT', function(p) { received = p; });
  bus.emit('TEST_EVENT', { value: 42 });
  assert(received && received.value === 42, 'emit/on 기본 작동');
})();

// Test 2: 다중 핸들러
(function() {
  const bus = new CoreBus();
  let count = 0;
  bus.on('MULTI', function() { count++; });
  bus.on('MULTI', function() { count++; });
  bus.emit('MULTI', {});
  assert(count === 2, '다중 핸들러');
})();

// Test 3: off (구독 해제)
(function() {
  const bus = new CoreBus();
  let count = 0;
  const handler = function() { count++; };
  bus.on('OFF_TEST', handler);
  bus.emit('OFF_TEST', {});
  bus.off('OFF_TEST', handler);
  bus.emit('OFF_TEST', {});
  assert(count === 1, 'off 작동');
})();

// Test 4: Audit log
(function() {
  const bus = new CoreBus();
  bus.emit('LOG_TEST', { a: 1 });
  bus.emit('LOG_TEST', { a: 2 });
  const log = bus.getLog({ eventType: 'LOG_TEST' });
  assert(log.length === 2, 'Audit log 2건');
  assert(log[0].payload.a === 1, 'log payload 0');
  assert(log[1].payload.a === 2, 'log payload 1');
})();

// Test 5: Feature Flag
(function() {
  const bus = new CoreBus();
  assert(!bus.isEnabled('TEST_FLAG'), '플래그 기본 false');
  bus.setFlag('TEST_FLAG', true);
  assert(bus.isEnabled('TEST_FLAG'), '플래그 활성화');
})();

// Test 6: 핸들러 에러가 다음 핸들러를 막지 않음
(function() {
  const bus = new CoreBus();
  let secondCalled = false;
  bus.on('ERR_TEST', function() { throw new Error('boom'); });
  bus.on('ERR_TEST', function() { secondCalled = true; });
  bus.emit('ERR_TEST', {});
  assert(secondCalled, '에러 격리');
})();

// Test 7: stats
(function() {
  const bus = new CoreBus();
  bus.on('S1', function() {});
  bus.on('S2', function() {});
  bus.emit('S1', {});
  const s = bus.stats();
  assert(s.handlerCount === 2, 'stats handlerCount');
  assert(s.eventTypes.length === 2, 'stats eventTypes');
  assert(s.logSize === 1, 'stats logSize');
})();

console.log('[PASS] CoreBus (7/7)');
