const { CoreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
const {
  EVENTS, publishKPIUpdate, publishAutomationUpdate,
  onKPIUpdate, publishKPIObserved
} = require('../src/KPIBus.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: EVENTS 정의
(function() {
  assert(EVENTS.KPI_UPDATE === 'KPI_UPDATE', 'KPI_UPDATE');
  assert(EVENTS.KPI_OBSERVED === 'KPI_OBSERVED', 'KPI_OBSERVED');
})();

// Test 2: publishKPIUpdate — 견적 결과 → KPI 변환
(function() {
  let received = null;
  onKPIUpdate(function(data, meta) {
    received = { data: data, meta: meta };
  });

  const estimate = {
    supply: 1000000, contract: 1500000, final: 1650000,
    areaSqm: 35, sqmPrice: 47000, pyPrice: 156000, margin: 33.3
  };
  const ctx = { sectionCount: 3, spaceCount: 3, duration: 14, automation: 95 };
  const result = publishKPIUpdate(estimate, ctx);

  assert(received !== null, 'KPI_UPDATE 수신');
  assert(received.data.supply === 1000000, 'supply');
  assert(received.data.sectionCount === 3, 'sectionCount');
  assert(received.meta.source === 'estimate-v6', 'source');
  assert(result.final === 1650000, 'return value');
})();

// Test 3: publishAutomationUpdate — 게이트 카운트 → 자동화율
(function() {
  let received = null;
  onKPIUpdate(function(data, meta) {
    if (meta && meta.partial) received = data;
  });

  publishAutomationUpdate(3);
  assert(received !== null, 'automation 수신');
  assert(received.automation === 85, '3게이트 = 85%');
})();

// Test 4: publishKPIObserved — AI 임원 관찰
(function() {
  const { coreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
  let received = null;
  coreBus.on(EVENTS.KPI_OBSERVED, function(data) { received = data; });

  publishKPIObserved({ supply: 5000 });
  assert(received !== null, 'KPI_OBSERVED 수신');
  assert(received.supply === 5000, 'data');
})();

console.log('[PASS] KPIBus (4/4)');
