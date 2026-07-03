#!/usr/bin/env node
// ECOREAN BOC v5.6 — graph.json → 코드 자동 생성기 (스켈레톤)
// SoT: docs/graph.json
// Week 1 (현재): 무결성 검증만
// Week 4 (예정): 실제 코드 생성

const fs = require('fs');
const path = require('path');

const GRAPH_PATH = path.join(__dirname, '..', 'docs', 'graph.json');

function load() {
  const raw = fs.readFileSync(GRAPH_PATH, 'utf-8');
  return JSON.parse(raw);
}

function validate(g) {
  const errors = [];

  if (!g['@context']) errors.push('@context 누락');
  if (!g['@id']) errors.push('@id 누락');
  if (!g.version) errors.push('version 누락');
  if (!g.universe) errors.push('universe 누락');
  if (!Array.isArray(g.nodes)) errors.push('nodes 배열 아님');
  if (!Array.isArray(g.edges)) errors.push('edges 배열 아님');

  const nodeIds = new Set();
  (g.nodes || []).forEach(function(n, i) {
    if (!n.id) errors.push('node[' + i + '].id 누락');
    if (!n.uri) errors.push('node[' + i + '].uri 누락');
    if (nodeIds.has(n.id)) errors.push('node id 중복: ' + n.id);
    nodeIds.add(n.id);
  });

  (g.edges || []).forEach(function(e, i) {
    if (!e.source || !e.target) errors.push('edge[' + i + '] source/target 누락');
    if (!e.event) errors.push('edge[' + i + '].event 누락');
    if (e.source && !nodeIds.has(e.source)) errors.push('edge[' + i + '].source 미존재 노드: ' + e.source);
    if (e.target && !nodeIds.has(e.target)) errors.push('edge[' + i + '].target 미존재 노드: ' + e.target);
  });

  return errors;
}

function summary(g) {
  console.log('graph.json 요약');
  console.log('  버전:     ' + g.version);
  console.log('  Universe: ' + (g.universe && g.universe.id));
  console.log('  Tenant:   ' + g.tenantId);
  console.log('  노드:     ' + g.nodes.length);
  console.log('  엣지:     ' + g.edges.length);
  console.log('  미래 노드: ' + ((g.futureNodes && g.futureNodes.length) || 0));
}

function main() {
  const g = load();
  summary(g);
  const errors = validate(g);
  if (errors.length > 0) {
    console.error('\n[FAIL] graph.json 검증 실패:');
    errors.forEach(function(e) { console.error('  - ' + e); });
    process.exit(1);
  }
  console.log('\n[PASS] graph.json 무결성 OK');
}

if (require.main === module) main();

module.exports = { load: load, validate: validate, summary: summary };
