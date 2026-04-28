// ECOREAN BOC v5.6 — RDF Triple 매핑
// SoT: docs/MASTER_PLAN.md §110.2 #3

const OBJECT_TYPES = ['uri', 'literal', 'number', 'boolean'];

function createTriple(opts) {
  if (!opts.subject || !opts.predicate || opts.object == null) {
    throw new Error('createTriple: subject, predicate, object 필수');
  }
  const objectType = opts.objectType || _inferType(opts.object);
  if (!OBJECT_TYPES.includes(objectType)) {
    throw new Error('createTriple: 미정의 objectType ' + objectType);
  }
  return {
    id: opts.id || ('triple_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    tenantId: opts.tenantId || 'HQ',
    subject: opts.subject,
    predicate: opts.predicate,
    object: String(opts.object),
    objectType: objectType,
    graphContext: opts.graphContext || 'system',
    createdAt: opts.createdAt || Date.now()
  };
}

function _inferType(obj) {
  if (typeof obj === 'number') return 'number';
  if (typeof obj === 'boolean') return 'boolean';
  if (typeof obj === 'string' && obj.startsWith('urn:')) return 'uri';
  return 'literal';
}

function validateTriple(triple) {
  const errors = [];
  if (!triple.id) errors.push('id 누락');
  if (!triple.subject) errors.push('subject 누락');
  if (!triple.predicate) errors.push('predicate 누락');
  if (!triple.object) errors.push('object 누락');
  if (!OBJECT_TYPES.includes(triple.objectType)) errors.push('objectType 미정의');
  return errors;
}

function graphToTriples(graph, tenantId) {
  const tenant = tenantId || graph.tenantId || 'HQ';
  const triples = [];

  (graph.nodes || []).forEach(function(n) {
    triples.push(createTriple({
      tenantId: tenant,
      subject: n.uri,
      predicate: 'rdf:type',
      object: 'urn:type:' + n.type,
      graphContext: 'system'
    }));
    triples.push(createTriple({
      tenantId: tenant,
      subject: n.uri,
      predicate: 'ecorean:hasPackage',
      object: n.package || 'unknown',
      objectType: 'literal',
      graphContext: 'system'
    }));
  });

  (graph.edges || []).forEach(function(e) {
    const sourceNode = (graph.nodes || []).find(function(n) { return n.id === e.source; });
    const targetNode = (graph.nodes || []).find(function(n) { return n.id === e.target; });
    if (!sourceNode || !targetNode) return;

    triples.push(createTriple({
      tenantId: tenant,
      subject: sourceNode.uri,
      predicate: 'ecorean:emits',
      object: targetNode.uri,
      graphContext: 'system'
    }));
  });

  return triples;
}

module.exports = {
  OBJECT_TYPES: OBJECT_TYPES,
  createTriple: createTriple,
  validateTriple: validateTriple,
  graphToTriples: graphToTriples
};
