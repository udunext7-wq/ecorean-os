// CADCanvas 테스트 — Konva 목(mock) 사용
// 핵심 로직(픽셀→㎡, 스케일, 공간 할당) 단위 검증

// Konva mock (브라우저 전용)
const mockLayer = () => ({ add: function() {}, draw: function() {}, destroyChildren: function() {} });
const mockStage = () => ({
  on: function() {},
  getPointerPosition: function() { return { x: 0, y: 0 }; },
  destroy: function() {},
  add: function() {}
});

require.cache[require.resolve('konva')] = {
  id: require.resolve('konva'),
  filename: require.resolve('konva'),
  loaded: true,
  exports: {
    Stage: function() { return mockStage(); },
    Layer: function() { return mockLayer(); },
    Rect: function(opts) {
      let _w = (opts && opts.width) || 0;
      let _h = (opts && opts.height) || 0;
      let _x = (opts && opts.x) || 0;
      let _y = (opts && opts.y) || 0;
      return {
        width:   function(v) { if (v !== undefined) _w = v; return _w; },
        height:  function(v) { if (v !== undefined) _h = v; return _h; },
        x:       function() { return _x; },
        y:       function() { return _y; },
        destroy: function() {}
      };
    },
    Line:  function() { return {}; },
    Text:  function() { return {}; }
  }
};

const { CADCanvas } = require('../src/cad/CADCanvas.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 인스턴스화
(function() {
  const canvas = new CADCanvas({ containerEl: {}, width: 800, height: 500, scale: 50 });
  assert(canvas.scale === 50, '기본 스케일 50');
  assert(canvas.currentTool === 'select', '기본 도구 select');
})();

// Test 2: 픽셀 → ㎡ 변환 (scale=50: 50px=1m → 100×100px = 2×2m = 4㎡)
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  const sqm = canvas.pxToSqm(100 * 100);
  assert(Math.abs(sqm - 4) < 0.01, '100×100px = 4㎡: 실제 ' + sqm);
})();

// Test 3: 스케일 변경 (scale=100: 100px=1m → 100×100px = 1㎡)
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  canvas.setScale(100);
  const sqm = canvas.pxToSqm(100 * 100);
  assert(Math.abs(sqm - 1) < 0.01, '100×100px @ scale 100 = 1㎡: 실제 ' + sqm);
})();

// Test 4: 잘못된 스케일 무시
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  canvas.setScale(0);
  assert(canvas.scale === 50, '0 무시');
  canvas.setScale(-10);
  assert(canvas.scale === 50, '음수 무시');
})();

// Test 5: 도구 전환
(function() {
  const canvas = new CADCanvas({ containerEl: {} });
  canvas.setTool('rect');
  assert(canvas.currentTool === 'rect', 'rect 도구');
  canvas.setTool('select');
  assert(canvas.currentTool === 'select', 'select 도구');
})();

// Test 6: 공간 타입 할당
(function() {
  const canvas = new CADCanvas({ containerEl: {} });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 100, height: 100 });
  canvas.assignSpaceType('s1', 'BATHROOM');
  assert(canvas.spaceTypeMap.get('s1') === 'BATHROOM', 'BATHROOM 라벨');
})();

// Test 7: getSpacesForCalc — CalcEngine 입력 형식 (250×250px @ scale=50 → 5×5m = 25㎡)
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 250, height: 250 });
  canvas.assignSpaceType('s1', 'BATHROOM');
  const spaces = canvas.getSpacesForCalc();
  assert(spaces.length === 1, '1개 공간');
  assert(spaces[0].typeKey === 'BATHROOM', 'typeKey BATHROOM');
  assert(Math.abs(spaces[0].area_sqm - 25) < 0.01, '25㎡: 실제 ' + spaces[0].area_sqm);
})();

// Test 8: 면적 변경 구독
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  let received = null;
  canvas.onAreaChange(spaces => { received = spaces; });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 100, height: 100 });
  canvas.assignSpaceType('s1', 'KITCHEN');
  assert(received !== null, '구독 호출됨');
  assert(received[0].typeKey === 'KITCHEN', 'KITCHEN');
})();

// Test 9: reset
(function() {
  const canvas = new CADCanvas({ containerEl: {} });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 100, height: 100 });
  canvas.assignSpaceType('s1', 'LIVING');
  canvas.reset();
  assert(canvas.spaceTypeMap.size === 0, 'spaceTypeMap 비움');
  assert(canvas.model.getAllShapes().length === 0, 'model 비움');
})();

console.log('[PASS] CADCanvas (9/9)');
