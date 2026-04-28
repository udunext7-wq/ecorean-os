const { FloorplanEngine } = require('../src/layers/L1_Floorplan.cjs');
const { createRectSpace } = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 인스턴스화
(function() {
  const eng = new FloorplanEngine({});
  assert(eng.layer === 'floorplan', 'layer L1');
})();

// Test 2: Node 환경에서 init은 스킵
(function() {
  const eng = new FloorplanEngine({});
  eng.init();
  assert(eng.initialized === true, 'init Node 스킵');
})();

// Test 3: drawing 추가 후 getByLayer
(function() {
  const eng = new FloorplanEngine({});
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(eng.getByLayer('floorplan').length === 1, 'L1 1건');
})();

// Test 4: render는 Node 환경에서 스킵
(function() {
  const eng = new FloorplanEngine({});
  eng.add(createRectSpace({ spaceId: 's1' }));
  eng.render();
  assert(true, 'render Node 안전');
})();

// Test 5: destroy
(function() {
  const eng = new FloorplanEngine({});
  eng.destroy();
  assert(eng.initialized === false, 'destroy 후 false');
})();

console.log('[PASS] L1_Floorplan (5/5)');
