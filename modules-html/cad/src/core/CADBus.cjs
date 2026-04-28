// ECOREAN BOC v5.6 — CADBus
// CAD 모듈과 견적 모듈 사이의 이벤트 통신 (CoreBus 위 얇은 래퍼)

const { coreBus } = require('../../../../shell/src/core-bus/CoreBus.cjs');
const { computeAreaSqm } = require('./DrawingModel.cjs');

const EVENTS = {
  CAD_INIT:             'CAD_INIT',
  SPACE_UPDATED:        'SPACE_UPDATED',
  CAD_DRAWING_ADDED:    'CAD_DRAWING_ADDED',
  CAD_DRAWING_UPDATED:  'CAD_DRAWING_UPDATED',
  CAD_DRAWING_REMOVED:  'CAD_DRAWING_REMOVED'
};

function publishSpaceUpdated(drawing) {
  if (!drawing) return;
  const area_sqm = computeAreaSqm(drawing);
  coreBus.emit(EVENTS.SPACE_UPDATED, {
    spaceId: drawing.spaceId,
    tenantId: drawing.tenantId,
    geometry: {
      width: drawing.geometry.width,
      length: drawing.geometry.length,
      area_sqm: area_sqm
    },
    layer: drawing.layer,
    timestamp: Date.now()
  });
}

function onCADInit(handler)         { coreBus.on(EVENTS.CAD_INIT, handler); }
function onDrawingAdded(handler)    { coreBus.on(EVENTS.CAD_DRAWING_ADDED, handler); }
function onDrawingUpdated(handler)  { coreBus.on(EVENTS.CAD_DRAWING_UPDATED, handler); }
function onDrawingRemoved(handler)  { coreBus.on(EVENTS.CAD_DRAWING_REMOVED, handler); }

module.exports = {
  EVENTS,
  publishSpaceUpdated,
  onCADInit,
  onDrawingAdded,
  onDrawingUpdated,
  onDrawingRemoved
};
