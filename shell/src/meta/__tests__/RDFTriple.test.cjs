const fs = require('fs');
const path = require('path');
const { OBJECT_TYPES, createTriple, validateTriple, graphToTriples } = require('../RDFTriple.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 4 object 타입
(function() {
  assert(OBJECT_TYPES.length === 4, '4 타입');
})();

// Test 2: createTriple 기본
(function() {
  const t = createTriple({
    subject: 'urn:ecorean:universe:1:node:g1_type',
    predicate: 'rdf:type',
    object: 'urn:type:gate'
  });
  assert(t.subject.includes('g1_type'), 'subject');
  assert(t.objectType === 'uri', '자동 추론 uri');
  assert(t.graphContext === 'system', '기본 system');
})();

// Test 3: 자동 타입 추론
(function() {
  assert(createTriple({ subject: 'a', predicate: 'b', object: 'literal' }).objectType === 'literal', 'literal');
  assert(createTriple({ subject: 'a', predicate: 'b', object: 42 }).objectType === 'number', 'number');
  assert(createTriple({ subject: 'a', predicate: 'b', object: true }).objectType === 'boolean', 'boolean');
})();

// Test 4: 누락 throw
(function() {
  let threw = false;
  try { createTriple({ subject: 'a' }); } catch(e) { threw = true; }
  assert(threw, '누락 throw');
})();

// Test 5: validateTriple
(function() {
  const t = createTriple({ subject: 'a', predicate: 'b', object: 'c' });
  assert(validateTriple(t).length === 0, '정상 검증');
  assert(validateTriple({}).length > 0, '빈 객체 에러');
})();

// Test 6: graphToTriples 실제 graph.json
(function() {
  const graphPath = path.join(__dirname, '..', '..', '..', '..', 'docs', 'graph.json');
  if (!fs.existsSync(graphPath)) {
    console.warn('[SKIP] graph.json not found');
    return;
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  const triples = graphToTriples(graph);
  // 12 노드 × 2 트리플 + 24 엣지 트리플 (엣지 중 source/target 매핑 성공한 것만)
  assert(triples.length >= 40, '40+ 트리플 생성: 실제 ' + triples.length);

  triples.forEach(function(t) {
    const errs = validateTriple(t);
    assert(errs.length === 0, '트리플 검증: ' + t.id);
  });
})();

console.log('[PASS] RDFTriple (6/6)');
