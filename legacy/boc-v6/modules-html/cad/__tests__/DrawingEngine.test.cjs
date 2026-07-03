const { DrawingEngine } = require('../src/core/DrawingEngine.cjs');
const { createRectSpace } = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

class TestEngine extends DrawingEngine {
  init()    { this.initialized = true; }
  render()  { this.rendered = true; }
  destroy() { this.destroyed = true; }
}

// Test 1: 추상 메서드 throw
(function() {
  const base = new DrawingEngine();
  let threw = false;
  try { base.init(); } catch(e) { threw = true; }
  assert(threw, 'init() 추상');
})();

// Test 2: add/get
(function() {
  const eng = new TestEngine();
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(eng.get(d.id) === d, 'add/get');
  assert(eng.getAll().length === 1, 'getAll 1');
})();

// Test 3: update
(function() {
  const eng = new TestEngine();
  const d = createRectSpace({ spaceId: 's1', width: 4000 });
  eng.add(d);
  const updated = eng.update(d.id, { geometry: { width: 5000, length: 4000 } });
  assert(updated.geometry.width === 5000, 'update 반영');
})();

// Test 4: remove
(function() {
  const eng = new TestEngine();
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(eng.remove(d.id) === true, 'remove true');
  assert(eng.getAll().length === 0, 'remove 후 0');
})();

// Test 5: getByLayer
(function() {
  const eng = new TestEngine();
  eng.add(createRectSpace({ spaceId: 's1' }));
  eng.add(createRectSpace({ spaceId: 's2' }));
  assert(eng.getByLayer('floorplan').length === 2, 'getByLayer L1');
})();

// Test 6: getBySpace
(function() {
  const eng = new TestEngine();
  eng.add(createRectSpace({ spaceId: 's1' }));
  eng.add(createRectSpace({ spaceId: 's2' }));
  eng.add(createRectSpace({ spaceId: 's1' }));
  assert(eng.getBySpace('s1').length === 2, 's1 2건');
})();

// Test 7: onChange 알림
(function() {
  const eng = new TestEngine();
  let action = null;
  eng.onChange(function(a) { action = a; });
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(action === 'ADDED', 'ADDED 알림');
  eng.update(d.id, { geometry: { width: 5000, length: 4000 } });
  assert(action === 'UPDATED', 'UPDATED 알림');
  eng.remove(d.id);
  assert(action === 'REMOVED', 'REMOVED 알림');
})();

console.log('[PASS] DrawingEngine (7/7)');
