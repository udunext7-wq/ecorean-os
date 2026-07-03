const fs = require('fs');
const path = require('path');
const { graphToJSONLD, exportGraphAsJSONLD, validateJSONLD } = require('../JsonLD.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: graphToJSONLD 기본
(function() {
  const graph = {
    '@id': 'urn:ecorean:universe:1',
    'version': '5.6',
    'tenantId': 'HQ',
    'nodes': [{ id: 'g1_type', uri: 'urn:ecorean:universe:1:node:g1_type' }],
    'edges': [{ id: 'e_test', source: 'g1', target: 'g2', event: 'TEST' }]
  };
  const ld = graphToJSONLD(graph);
  assert(ld['@type'] === 'BusinessGraph', '@type');
  assert(ld['@id'] === 'urn:ecorean:universe:1', '@id');
  assert(ld.nodes[0]['@type'] === 'Node', 'node @type');
  assert(ld.edges[0]['@type'] === 'Edge', 'edge @type');
})();

// Test 2: graph.json 실제 파일 변환
(function() {
  const graphPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.json');
  if (!fs.existsSync(graphPath)) {
    console.warn('[SKIP] graph.json not found');
    return;
  }
  const raw = fs.readFileSync(graphPath, 'utf-8');
  const graph = JSON.parse(raw);
  const ld = graphToJSONLD(graph);
  assert(ld['@type'] === 'BusinessGraph', '실제 graph.json @type');
  assert(ld.nodes.length >= 11, '11+ 노드');
})();

// Test 3: exportGraphAsJSONLD 파일 출력
(function() {
  const graphPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.json');
  const outPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.jsonld');
  if (!fs.existsSync(graphPath)) {
    console.warn('[SKIP] graph.json not found');
    return;
  }
  exportGraphAsJSONLD(graphPath, outPath);
  assert(fs.existsSync(outPath), 'JSON-LD 파일 생성');
  const ld = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
  assert(ld['@context'], '@context 출력');
})();

// Test 4: validateJSONLD 정상
(function() {
  const ld = { '@context': {}, '@id': 'x', '@type': 'BusinessGraph' };
  const errors = validateJSONLD(ld);
  assert(errors.length === 0, '검증 통과');
})();

// Test 5: validateJSONLD 누락
(function() {
  const errors = validateJSONLD({});
  assert(errors.length === 3, '3 누락');
})();

console.log('[PASS] JsonLD (5/5)');
