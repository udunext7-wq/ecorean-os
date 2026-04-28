// ECOREAN BOC v5.6 — Drawing 데이터 모델
// SoT: docs/MASTER_PLAN.md §109 (CAD 모듈 L1~L7 진화)
// 절대 규칙: version 컬럼으로 마이그레이션 안전성 보장
// 100배 확장 호환: tenant_id + version + layer + geometry_json

const DRAWING_MODEL_VERSION = '1.0.0';

const LAYERS = {
  L1: 'floorplan',
  L2: 'specification',
  L3: 'construction',
  L4: 'elevation',
  L5: 'rendering_3d',
  L6: 'dxf',
  L7: 'bim_ifc'
};

const GEOMETRY_TYPES = {
  RECT: 'rect',
  POLYGON: 'polygon',
  CIRCLE: 'circle',
  POLYLINE: 'polyline',
  GROUP: 'group'
};

function createDrawing(opts) {
  if (!opts.spaceId) throw new Error('Drawing: spaceId 필수');
  if (!opts.layer) throw new Error('Drawing: layer 필수');
  if (!opts.geometryType) throw new Error('Drawing: geometryType 필수');

  return {
    id: opts.id || ('drw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    spaceId: opts.spaceId,
    tenantId: opts.tenantId || 'HQ',
    version: DRAWING_MODEL_VERSION,
    layer: opts.layer,
    geometryType: opts.geometryType,
    geometry: opts.geometry || {},
    style: opts.style || {},
    metadata: opts.metadata || {},
    createdAt: opts.createdAt || Date.now(),
    updatedAt: Date.now()
  };
}

function createRectSpace(opts) {
  return createDrawing({
    spaceId: opts.spaceId,
    tenantId: opts.tenantId,
    layer: LAYERS.L1,
    geometryType: GEOMETRY_TYPES.RECT,
    geometry: {
      x: opts.x || 0,
      y: opts.y || 0,
      width: opts.width || 4000,
      length: opts.length || 3000
    },
    style: {
      fillColor: opts.fillColor || 'rgba(245,222,179,0.35)',
      strokeColor: opts.strokeColor || '#C9A84C',
      strokeWidth: opts.strokeWidth || 2
    },
    metadata: {
      typeKey: opts.typeKey || 'LIVING'
    }
  });
}

function computeAreaSqm(drawing) {
  if (drawing.geometryType !== GEOMETRY_TYPES.RECT) {
    throw new Error('computeAreaSqm: rect 외 타입 미지원 (Week 3 확장 예정)');
  }
  const w = drawing.geometry.width || 0;
  const l = drawing.geometry.length || 0;
  return (w * l) / 1000000;
}

function validateDrawing(drawing) {
  const errors = [];
  if (!drawing.id) errors.push('id 누락');
  if (!drawing.spaceId) errors.push('spaceId 누락');
  if (!drawing.tenantId) errors.push('tenantId 누락');
  if (!drawing.version) errors.push('version 누락');
  if (!Object.values(LAYERS).includes(drawing.layer)) errors.push('layer 미정의: ' + drawing.layer);
  if (!Object.values(GEOMETRY_TYPES).includes(drawing.geometryType)) errors.push('geometryType 미정의');
  if (!drawing.geometry) errors.push('geometry 누락');
  return errors;
}

module.exports = {
  DRAWING_MODEL_VERSION,
  LAYERS,
  GEOMETRY_TYPES,
  createDrawing,
  createRectSpace,
  computeAreaSqm,
  validateDrawing
};
