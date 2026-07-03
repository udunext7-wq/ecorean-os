const {
  REGION_FACTORS, getRegionByArea, getRegionFactor,
  getRegionFactorByArea, getAllRegions
} = require('../RegionFactor.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 7 지역
(function() {
  assert(getAllRegions().length === 7, '7 지역');
})();

// Test 2: 강남 1.20
(function() {
  assert(getRegionFactor('SEOUL_GANGNAM') === 1.20, '강남 1.20');
})();

// Test 3: 지역 자동 매핑 — 강남구
(function() {
  assert(getRegionByArea('서울특별시 강남구') === 'SEOUL_GANGNAM', '강남구 매핑');
  assert(getRegionByArea('서초구') === 'SEOUL_GANGNAM', '서초구 매핑');
  assert(getRegionByArea('송파구') === 'SEOUL_GANGNAM', '송파구 매핑');
})();

// Test 4: 서울 기타
(function() {
  assert(getRegionByArea('서울 마포구') === 'SEOUL_OTHER', '마포구');
  assert(getRegionByArea('영등포구') === 'SEOUL_OTHER', '영등포구');
})();

// Test 5: 광역시
(function() {
  assert(getRegionByArea('부산') === 'METRO_BUSAN', '부산');
  assert(getRegionByArea('대구광역시') === 'METRO_OTHER', '대구');
})();

// Test 6: 제주 운반비
(function() {
  assert(getRegionFactorByArea('제주특별자치도 제주시') === 1.15, '제주 1.15');
})();

// Test 7: 기타 지방 기본값
(function() {
  assert(getRegionByArea('알수없는동네') === 'PROVINCE_OTHER', '기본 지방');
  assert(getRegionFactor('PROVINCE_OTHER') === 0.90, '지방 0.90');
})();

// Test 8: 도청소재지
(function() {
  assert(getRegionByArea('수원시') === 'PROVINCE_MAJOR', '수원 도청');
  assert(getRegionFactor('PROVINCE_MAJOR') === 0.95, '도청 0.95');
})();

console.log('[PASS] RegionFactor (8/8)');
