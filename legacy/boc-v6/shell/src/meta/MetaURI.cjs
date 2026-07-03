// ECOREAN BOC v5.6 — 메타 URI 식별 시스템
// SoT: docs/MASTER_PLAN.md §110.2 #1
//
// 형식: urn:{universe}:universe:{universeId}:node:{nodeId}
// 예시: urn:ecorean:universe:1:node:g1_type

const URI_PREFIX = 'urn';
const DEFAULT_NAMESPACE = 'ecorean';

function buildNodeURI(opts) {
  const ns = opts.namespace || DEFAULT_NAMESPACE;
  const uId = opts.universeId || '1';
  const nodeId = opts.nodeId;
  if (!nodeId) throw new Error('buildNodeURI: nodeId 필수');
  return URI_PREFIX + ':' + ns + ':universe:' + uId + ':node:' + nodeId;
}

function buildEdgeURI(opts) {
  const ns = opts.namespace || DEFAULT_NAMESPACE;
  const uId = opts.universeId || '1';
  const edgeId = opts.edgeId;
  if (!edgeId) throw new Error('buildEdgeURI: edgeId 필수');
  return URI_PREFIX + ':' + ns + ':universe:' + uId + ':edge:' + edgeId;
}

function buildUniverseURI(opts) {
  const ns = opts.namespace || DEFAULT_NAMESPACE;
  const uId = opts.universeId || '1';
  return URI_PREFIX + ':' + ns + ':universe:' + uId;
}

function buildMetaedgeURI(opts) {
  const sourceUni = opts.sourceUniverse;
  const targetUni = opts.targetUniverse;
  const metaedgeType = opts.metaedgeType;
  if (!sourceUni || !targetUni || !metaedgeType) {
    throw new Error('buildMetaedgeURI: source/target/type 필수');
  }
  return URI_PREFIX + ':metaedge:' + sourceUni + ':' + targetUni + ':' + metaedgeType;
}

function parseURI(uri) {
  if (typeof uri !== 'string' || !uri.startsWith(URI_PREFIX + ':')) {
    return { ok: false, error: 'invalid prefix' };
  }
  const parts = uri.split(':');

  if (parts[1] === 'metaedge' && parts.length === 5) {
    return {
      ok: true,
      type: 'metaedge',
      sourceUniverse: parts[2],
      targetUniverse: parts[3],
      metaedgeType: parts[4]
    };
  }

  if (parts.length === 4 && parts[2] === 'universe') {
    return {
      ok: true,
      type: 'universe',
      namespace: parts[1],
      universeId: parts[3]
    };
  }

  if (parts.length === 6 && parts[2] === 'universe' && (parts[4] === 'node' || parts[4] === 'edge')) {
    return {
      ok: true,
      type: parts[4],
      namespace: parts[1],
      universeId: parts[3],
      id: parts[5]
    };
  }

  return { ok: false, error: 'unknown format' };
}

function isValidURI(uri) {
  return parseURI(uri).ok === true;
}

module.exports = {
  URI_PREFIX: URI_PREFIX,
  DEFAULT_NAMESPACE: DEFAULT_NAMESPACE,
  buildNodeURI: buildNodeURI,
  buildEdgeURI: buildEdgeURI,
  buildUniverseURI: buildUniverseURI,
  buildMetaedgeURI: buildMetaedgeURI,
  parseURI: parseURI,
  isValidURI: isValidURI
};
