const { SCHEMAS } = require('../schemas.cjs');
const { CoreBus } = require('../CoreBus.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 20개 스키마 정의됨
(function() {
  const count = Object.keys(SCHEMAS).length;
  assert(count >= 20, '스키마 20개 이상: 실제 ' + count);
})();

// Test 2: 모든 스키마는 parse 메서드 가짐
(function() {
  Object.keys(SCHEMAS).forEach(function(name) {
    assert(typeof SCHEMAS[name].parse === 'function', name + '.parse 존재');
  });
})();

// Test 3: null/undefined는 거부
(function() {
  const s = SCHEMAS.GATE1_LOCKED;
  let threw = false;
  try { s.parse(null); } catch(e) { threw = true; }
  assert(threw, 'null 거부');
})();

// Test 4: 객체는 통과 (현재 최소 스키마)
(function() {
  const s = SCHEMAS.GATE1_LOCKED;
  const result = s.parse({ residence: 'APARTMENT', pyeong: 'P_30' });
  assert(result.residence === 'APARTMENT', '객체 통과');
})();

// Test 5: CoreBus에 등록 시 스키마 검증 작동
(function() {
  const bus = new CoreBus();
  bus.registerSchema('TEST', SCHEMAS.GATE1_LOCKED);
  bus.setFlag('STRICT_SCHEMA', true);

  let threw = false;
  try { bus.emit('TEST', null); } catch(e) { threw = true; }
  assert(threw, 'STRICT_SCHEMA 모드 null 차단');

  bus.setFlag('STRICT_SCHEMA', false);
  bus.emit('TEST', null);
})();

console.log('[PASS] schemas (5/5)');
