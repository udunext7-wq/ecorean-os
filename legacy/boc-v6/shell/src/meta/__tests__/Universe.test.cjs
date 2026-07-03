const { Universe, METAEDGE_TYPES, DECISION_AUTHORITY } = require('../Universe.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 메타엣지 12 타입
(function() {
  assert(METAEDGE_TYPES.length === 12, '12 메타엣지 타입');
  assert(METAEDGE_TYPES.includes('FAMILY_TRUST'), 'FAMILY_TRUST');
  assert(METAEDGE_TYPES.includes('VEHICLE_SHARE'), 'VEHICLE_SHARE');
})();

// Test 2: 결정 권한 3종
(function() {
  assert(DECISION_AUTHORITY.AUTO === 'auto_rule', 'AUTO');
  assert(DECISION_AUTHORITY.HUMAN === 'operator_only', 'HUMAN');
  assert(DECISION_AUTHORITY.BOTH === 'auto_with_oversight', 'BOTH');
})();

// Test 3: Universe 인스턴스화
(function() {
  const u = new Universe({
    id: 'ecorean',
    name: 'ECOREAN BOC',
    operator: 'udunext7-wq',
    purpose: 'Closed Loop OS'
  });
  assert(u.uri === 'urn:ecorean:universe:1', 'URI');
  assert(u.id === 'ecorean', 'id');
})();

// Test 4: addMetaedge 정상
(function() {
  const u = new Universe({ id: 'ecorean' });
  const edge = u.addMetaedge({
    targetUniverse: 'vine-farm',
    metaedgeType: 'FAMILY_TRUST',
    description: '대표님 ↔ 아버지',
    decisionAuthority: DECISION_AUTHORITY.HUMAN
  });
  assert(edge.uri === 'urn:metaedge:ecorean:vine-farm:FAMILY_TRUST', 'edge URI');
  assert(edge.activated === false, '자리만 (미활성)');
  assert(u.trust.outgoing.includes('vine-farm'), 'trust 등록');
})();

// Test 5: addMetaedge 미정의 타입 throw
(function() {
  const u = new Universe({ id: 'ecorean' });
  let threw = false;
  try {
    u.addMetaedge({ targetUniverse: 'x', metaedgeType: 'INVALID' });
  } catch(e) { threw = true; }
  assert(threw, '미정의 타입 throw');
})();

// Test 6: activateMetaedge — AUTO (approver 불필요)
(function() {
  const u = new Universe({ id: 'ecorean' });
  const edge = u.addMetaedge({
    targetUniverse: 'franchise-001',
    metaedgeType: 'INSTANCE',
    decisionAuthority: DECISION_AUTHORITY.AUTO
  });
  const result = u.activateMetaedge(edge.uri);
  assert(result.ok === true, 'AUTO 활성화 성공');
  assert(edge.activated === true, '활성화 됨');
})();

// Test 7: activateMetaedge — HUMAN (approver 필수)
(function() {
  const u = new Universe({ id: 'ecorean' });
  const edge = u.addMetaedge({
    targetUniverse: 'vine-farm',
    metaedgeType: 'FAMILY_TRUST',
    decisionAuthority: DECISION_AUTHORITY.HUMAN
  });
  const result1 = u.activateMetaedge(edge.uri);
  assert(result1.ok === false, 'HUMAN approver 없으면 차단');

  const result2 = u.activateMetaedge(edge.uri, 'udunext7-wq');
  assert(result2.ok === true, 'approver 있으면 활성화');
  assert(edge.approvedBy === 'udunext7-wq', '승인자 기록');
})();

// Test 8: toJSONLD
(function() {
  const u = new Universe({ id: 'ecorean', operator: 'udunext7-wq' });
  u.addMetaedge({
    targetUniverse: 'vine-farm',
    metaedgeType: 'CAPITAL_FLOW',
    decisionAuthority: DECISION_AUTHORITY.BOTH
  });
  const jsonld = u.toJSONLD();
  assert(jsonld['@context'] === 'https://ecorean.io/ontology/v1', '@context');
  assert(jsonld['@type'] === 'Universe', '@type');
  assert(jsonld['@id'] === 'urn:ecorean:universe:1', '@id');
  assert(jsonld.metaedges.length === 1, '메타엣지 1');
  assert(jsonld.metaedges[0]['@type'] === 'Metaedge', 'metaedge type');
})();

console.log('[PASS] Universe (8/8)');
