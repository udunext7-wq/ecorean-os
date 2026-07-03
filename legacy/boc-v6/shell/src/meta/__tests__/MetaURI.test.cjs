const {
  buildNodeURI, buildEdgeURI, buildUniverseURI, buildMetaedgeURI,
  parseURI, isValidURI
} = require('../MetaURI.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: buildNodeURI 기본
(function() {
  const uri = buildNodeURI({ nodeId: 'g1_type' });
  assert(uri === 'urn:ecorean:universe:1:node:g1_type', 'default node URI');
})();

// Test 2: buildNodeURI 커스텀 universe
(function() {
  const uri = buildNodeURI({ namespace: 'vine-farm', universeId: '1', nodeId: 'harvest' });
  assert(uri === 'urn:vine-farm:universe:1:node:harvest', 'vine-farm URI');
})();

// Test 3: buildNodeURI nodeId 누락 throw
(function() {
  let threw = false;
  try { buildNodeURI({}); } catch(e) { threw = true; }
  assert(threw, 'nodeId 누락 throw');
})();

// Test 4: buildEdgeURI
(function() {
  const uri = buildEdgeURI({ edgeId: 'e_g1_g2' });
  assert(uri === 'urn:ecorean:universe:1:edge:e_g1_g2', 'edge URI');
})();

// Test 5: buildUniverseURI
(function() {
  const uri = buildUniverseURI({ namespace: 'ecorean', universeId: '1' });
  assert(uri === 'urn:ecorean:universe:1', 'universe URI');
})();

// Test 6: buildMetaedgeURI
(function() {
  const uri = buildMetaedgeURI({
    sourceUniverse: 'ecorean',
    targetUniverse: 'vine-farm',
    metaedgeType: 'FAMILY_TRUST'
  });
  assert(uri === 'urn:metaedge:ecorean:vine-farm:FAMILY_TRUST', 'metaedge URI');
})();

// Test 7: parseURI 노드
(function() {
  const result = parseURI('urn:ecorean:universe:1:node:g1_type');
  assert(result.ok === true, 'parse OK');
  assert(result.type === 'node', 'type node');
  assert(result.namespace === 'ecorean', 'namespace');
  assert(result.universeId === '1', 'universeId');
  assert(result.id === 'g1_type', 'id');
})();

// Test 8: parseURI 메타엣지
(function() {
  const result = parseURI('urn:metaedge:ecorean:vine-farm:VEHICLE_SHARE');
  assert(result.ok === true, 'parse metaedge OK');
  assert(result.type === 'metaedge', 'type metaedge');
  assert(result.sourceUniverse === 'ecorean', 'source');
  assert(result.targetUniverse === 'vine-farm', 'target');
  assert(result.metaedgeType === 'VEHICLE_SHARE', 'metaedge type');
})();

// Test 9: parseURI 우주
(function() {
  const result = parseURI('urn:ecorean:universe:1');
  assert(result.ok === true, 'parse universe');
  assert(result.type === 'universe', 'type');
})();

// Test 10: parseURI 잘못된 형식
(function() {
  assert(parseURI('not-a-uri').ok === false, '잘못된 prefix');
  assert(parseURI('urn:invalid').ok === false, '짧은 URI');
})();

// Test 11: isValidURI
(function() {
  assert(isValidURI('urn:ecorean:universe:1:node:g1_type') === true, '유효');
  assert(isValidURI('garbage') === false, '무효');
})();

console.log('[PASS] MetaURI (11/11)');
