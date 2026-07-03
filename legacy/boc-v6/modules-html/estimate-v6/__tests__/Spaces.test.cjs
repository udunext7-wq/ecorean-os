const {
  SPACES, getAllSpaceKeys, getSpace, getSpacesByGroup,
  isWet, hasPlumbing, needsWaterproof
} = require('../src/matrices/Spaces.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 23개 공간 (5+4+8+2+4)
(function() {
  const all = getAllSpaceKeys();
  assert(all.length === 23, '23 공간: 실제 ' + all.length);
})();

// Test 2: 그룹별 개수
(function() {
  assert(getSpacesByGroup('거주').length === 5, '거주 5');
  assert(getSpacesByGroup('수도').length === 4, '수도 4');
  assert(getSpacesByGroup('보조').length === 8, '보조 8');
  assert(getSpacesByGroup('연결').length === 2, '연결 2');
  assert(getSpacesByGroup('단독').length === 4, '단독 4');
})();

// Test 3: 욕실 메타
(function() {
  assert(isWet('BATHROOM') === true, '욕실 wet');
  assert(hasPlumbing('BATHROOM') === true, '욕실 배관');
  assert(needsWaterproof('BATHROOM') === true, '욕실 방수');
})();

// Test 4: 거실 메타
(function() {
  assert(isWet('LIVING') === false, '거실 dry');
  assert(hasPlumbing('LIVING') === false, '거실 배관 없음');
  assert(needsWaterproof('LIVING') === false, '거실 방수 없음');
})();

// Test 5: 주방 — 가스
(function() {
  assert(SPACES.KITCHEN.gas === true, '주방 가스');
  assert(SPACES.BOILER.gas === true, '보일러실 가스');
  assert(!SPACES.LIVING.gas, '거실 가스 없음');
})();

// Test 6: 발코니 — 방수 + 자연환기
(function() {
  assert(needsWaterproof('BALCONY') === true, '발코니 방수');
  assert(SPACES.BALCONY.vent === 'natural', '발코니 자연환기');
})();

// Test 7: 지하실 — 기계환기 + 방수
(function() {
  assert(needsWaterproof('BASEMENT') === true, '지하 방수');
  assert(SPACES.BASEMENT.vent === 'mechanical', '지하 기계환기');
})();

// Test 8: 차고 — 기계환기
(function() {
  assert(SPACES.GARAGE.vent === 'mechanical', '차고 기계환기');
})();

console.log('[PASS] Spaces (8/8)');
