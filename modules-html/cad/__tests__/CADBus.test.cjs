const { coreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
const { EVENTS, publishSpaceUpdated } = require('../src/core/CADBus.cjs');
const { createRectSpace } = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: EVENTS 정의
(function() {
  assert(EVENTS.CAD_INIT === 'CAD_INIT', 'CAD_INIT');
  assert(EVENTS.SPACE_UPDATED === 'SPACE_UPDATED', 'SPACE_UPDATED');
})();

// Test 2: SPACE_UPDATED 발행 시 면적 자동 계산
(function() {
  let received = null;
  coreBus.on(EVENTS.SPACE_UPDATED, function(p) { received = p; });

  const d = createRectSpace({ spaceId: 's1', width: 5000, length: 4000 });
  publishSpaceUpdated(d);

  assert(received !== null, 'SPACE_UPDATED 수신');
  assert(received.spaceId === 's1', 'spaceId');
  assert(received.geometry.area_sqm === 20, '면적 20㎡');
  assert(received.tenantId === 'HQ', 'tenantId');
})();

console.log('[PASS] CADBus (2/2)');
