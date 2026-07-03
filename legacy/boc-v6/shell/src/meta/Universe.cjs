// ECOREAN BOC v5.6 — Universe 정의 + Trust Links
// SoT: docs/MASTER_PLAN.md §110.2 #4 + §112 + §113

const { buildUniverseURI, buildMetaedgeURI } = require('./MetaURI.cjs');

const METAEDGE_TYPES = [
  'FAMILY_TRUST',
  'VEHICLE_SHARE',
  'CAPITAL_FLOW',
  'LABOR_POOL',
  'DATA_CROSS',
  'LOGISTICS_HUB',
  'INSTANCE',
  'DATA_SYNC',
  'VERSION_PROP',
  'INTER_ORG',
  'SUPPLY',
  'CONTRACT'
];

const DECISION_AUTHORITY = {
  AUTO:   'auto_rule',
  HUMAN:  'operator_only',
  BOTH:   'auto_with_oversight'
};

class Universe {
  constructor(opts) {
    this.id = opts.id;
    this.namespace = opts.namespace || opts.id;
    this.universeId = opts.universeId || '1';
    this.uri = buildUniverseURI({
      namespace: this.namespace,
      universeId: this.universeId
    });
    this.name = opts.name || opts.id;
    this.operator = opts.operator;
    this.purpose = opts.purpose || '';
    this.expectedConnectionDate = opts.expectedConnectionDate || null;
    this.trust = {
      incoming: opts.incomingTrust || [],
      outgoing: opts.outgoingTrust || []
    };
    this.metaedges = opts.metaedges || [];
  }

  addMetaedge(opts) {
    const targetUni = opts.targetUniverse;
    const type = opts.metaedgeType;
    if (!targetUni || !type) throw new Error('addMetaedge: targetUniverse, metaedgeType 필수');
    if (!METAEDGE_TYPES.includes(type)) {
      throw new Error('addMetaedge: 미정의 메타엣지 타입 ' + type);
    }

    const uri = buildMetaedgeURI({
      sourceUniverse: this.namespace,
      targetUniverse: targetUni,
      metaedgeType: type
    });

    const edge = {
      uri: uri,
      sourceUniverse: this.namespace,
      targetUniverse: targetUni,
      metaedgeType: type,
      description: opts.description || '',
      decisionAuthority: opts.decisionAuthority || DECISION_AUTHORITY.HUMAN,
      autoRule: opts.autoRule || null,
      createdAt: Date.now(),
      activated: opts.activated || false
    };

    this.metaedges.push(edge);

    if (!this.trust.outgoing.includes(targetUni)) {
      this.trust.outgoing.push(targetUni);
    }

    return edge;
  }

  activateMetaedge(uri, approver) {
    const edge = this.metaedges.find(function(e) { return e.uri === uri; });
    if (!edge) return { ok: false, error: 'metaedge not found' };

    if (edge.decisionAuthority === DECISION_AUTHORITY.AUTO) {
      edge.activated = true;
      edge.activatedAt = Date.now();
      return { ok: true, edge: edge };
    }

    if (edge.decisionAuthority === DECISION_AUTHORITY.HUMAN) {
      if (!approver) return { ok: false, error: 'human approval required' };
      edge.activated = true;
      edge.activatedAt = Date.now();
      edge.approvedBy = approver;
      return { ok: true, edge: edge };
    }

    return { ok: false, error: 'unknown decision authority' };
  }

  toJSONLD() {
    return {
      '@context': 'https://ecorean.io/ontology/v1',
      '@type': 'Universe',
      '@id': this.uri,
      'id': this.id,
      'name': this.name,
      'operator': this.operator,
      'purpose': this.purpose,
      'trust': this.trust,
      'metaedges': this.metaedges.map(function(e) {
        return Object.assign({ '@type': 'Metaedge' }, e);
      })
    };
  }
}

module.exports = {
  Universe: Universe,
  METAEDGE_TYPES: METAEDGE_TYPES,
  DECISION_AUTHORITY: DECISION_AUTHORITY
};
