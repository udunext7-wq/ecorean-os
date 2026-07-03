// ECOREAN BOC v5.6 — JSON-LD 1.1 export
// SoT: docs/MASTER_PLAN.md §110.2 #2

const fs = require('fs');
const path = require('path');

const JSONLD_CONTEXT = {
  '@vocab': 'https://ecorean.io/ontology/v1#',
  'ecorean': 'https://ecorean.io/ontology/v1#',
  'schema': 'https://schema.org/'
};

function graphToJSONLD(graph) {
  if (!graph) throw new Error('graph 객체 필수');
  return {
    '@context': graph['@context'] || JSONLD_CONTEXT,
    '@type': 'BusinessGraph',
    '@id': graph['@id'],
    'version': graph.version,
    'tenantId': graph.tenantId,
    'universe': graph.universe,
    'nodes': (graph.nodes || []).map(function(n) {
      return Object.assign({ '@type': 'Node', '@id': n.uri }, n);
    }),
    'edges': (graph.edges || []).map(function(e) {
      return Object.assign({ '@type': 'Edge' }, e);
    }),
    'metaCompatibilityInterfaces': graph.metaCompatibilityInterfaces || []
  };
}

function exportGraphAsJSONLD(graphPath, outputPath) {
  const raw = fs.readFileSync(graphPath, 'utf-8');
  const graph = JSON.parse(raw);
  const jsonld = graphToJSONLD(graph);
  fs.writeFileSync(outputPath, JSON.stringify(jsonld, null, 2), 'utf-8');
  return jsonld;
}

function validateJSONLD(jsonld) {
  const errors = [];
  if (!jsonld['@context']) errors.push('@context 누락');
  if (!jsonld['@id']) errors.push('@id 누락');
  if (!jsonld['@type']) errors.push('@type 누락');
  return errors;
}

module.exports = {
  JSONLD_CONTEXT: JSONLD_CONTEXT,
  graphToJSONLD: graphToJSONLD,
  exportGraphAsJSONLD: exportGraphAsJSONLD,
  validateJSONLD: validateJSONLD
};
