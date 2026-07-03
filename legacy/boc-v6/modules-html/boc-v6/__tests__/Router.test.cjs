const { Router } = require('../src/router/Router.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// 브라우저 환경 시뮬레이션
global.window = {
  location: { hash: '' },
  addEventListener: function() {}
};

// Test 1: register + 핸들러 호출
(function() {
  const r = new Router();
  let called = false;
  r.register('/test', function() { called = true; });
  global.window.location.hash = '#/test';
  r.start();
  assert(called === true, 'route 핸들러 호출');
})();

// Test 2: 404 핸들러
(function() {
  const r = new Router();
  let notFoundCalled = null;
  r.setNotFound(function(path) { notFoundCalled = path; });
  global.window.location.hash = '#/unknown';
  r.start();
  assert(notFoundCalled === '/unknown', '404 호출');
})();

// Test 3: beforeEach 차단
(function() {
  const r = new Router();
  let handlerCalled = false;
  r.register('/blocked', function() { handlerCalled = true; });
  r.beforeEach(function() { return false; });
  global.window.location.hash = '#/blocked';
  r.start();
  assert(handlerCalled === false, 'beforeEach 차단');
})();

// Test 4: 라우트 메타
(function() {
  const r = new Router();
  let receivedMeta = null;
  r.register('/with-meta', function(path, meta) { receivedMeta = meta; }, { meta: { title: 'Test' } });
  global.window.location.hash = '#/with-meta';
  r.start();
  assert(receivedMeta && receivedMeta.title === 'Test', '메타 전달');
})();

// Test 5: getCurrentPath
(function() {
  const r = new Router();
  r.register('/current', function() {});
  global.window.location.hash = '#/current';
  r.start();
  assert(r.getCurrentPath() === '/current', 'currentPath');
})();

console.log('[PASS] Router (5/5)');
