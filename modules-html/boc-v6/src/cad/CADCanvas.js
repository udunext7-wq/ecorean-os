// ECOREAN BOC v6.0 — CAD Canvas (Konva 기반 평면도 에디터)
// Phase 3 DrawingEngine 추상 추상의 정신을 이어받되, 브라우저 UI 목적의 자체 모델 사용

const Konva = require('konva');

// 간단한 도형 저장소 (Phase 3 DrawingModel API와 독립 — UI 레이어 전용)
class SimpleShapeModel {
  constructor() {
    this._shapes = new Map();
  }

  addShape(shape) {
    this._shapes.set(shape.id, Object.assign({}, shape));
  }

  getShape(id) {
    return this._shapes.get(id) || null;
  }

  getAllShapes() {
    return Array.from(this._shapes.values());
  }

  removeShape(id) {
    this._shapes.delete(id);
  }

  clear() {
    this._shapes.clear();
  }
}

class CADCanvas {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.width = opts.width || 800;
    this.height = opts.height || 500;
    this.scale = opts.scale || 50;     // 50px = 1m

    this.model = new SimpleShapeModel();
    this.konvaShapes = new Map();      // shapeId → Konva.Shape

    this._setupStage();

    this.currentTool = 'select';
    this.tempShape = null;
    this.tempStartPos = null;

    this._setupEventListeners();

    this.spaceTypeMap = new Map();     // shapeId → typeKey (BATHROOM 등)
    this.areaListeners = new Set();
  }

  _setupStage() {
    this.stage = new Konva.Stage({
      container: this.containerEl,
      width: this.width,
      height: this.height
    });
    this.gridLayer = new Konva.Layer();
    this.layer = new Konva.Layer();
    this.stage.add(this.gridLayer);
    this.stage.add(this.layer);
    this._drawGrid();
  }

  _drawGrid() {
    const gridSize = this.scale;
    for (let x = 0; x <= this.width; x += gridSize) {
      this.gridLayer.add(new Konva.Line({
        points: [x, 0, x, this.height],
        stroke: 'rgba(201, 168, 76, 0.05)',
        strokeWidth: 1
      }));
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      this.gridLayer.add(new Konva.Line({
        points: [0, y, this.width, y],
        stroke: 'rgba(201, 168, 76, 0.05)',
        strokeWidth: 1
      }));
    }
    this.gridLayer.draw();
  }

  _setupEventListeners() {
    this.stage.on('mousedown touchstart', () => this._onPointerDown());
    this.stage.on('mousemove touchmove', () => this._onPointerMove());
    this.stage.on('mouseup touchend', () => this._onPointerUp());
  }

  _onPointerDown() {
    if (this.currentTool !== 'rect') return;
    const pos = this.stage.getPointerPosition();
    this.tempStartPos = pos;
    this.tempShape = new Konva.Rect({
      x: pos.x, y: pos.y,
      width: 0, height: 0,
      fill: 'rgba(201, 168, 76, 0.2)',
      stroke: '#ffd700',
      strokeWidth: 2,
      dash: [5, 5]
    });
    this.layer.add(this.tempShape);
  }

  _onPointerMove() {
    if (!this.tempShape || !this.tempStartPos) return;
    const pos = this.stage.getPointerPosition();
    this.tempShape.width(pos.x - this.tempStartPos.x);
    this.tempShape.height(pos.y - this.tempStartPos.y);
    this.layer.draw();
  }

  _onPointerUp() {
    if (!this.tempShape || !this.tempStartPos) return;
    const w = this.tempShape.width();
    const h = this.tempShape.height();

    if (Math.abs(w) < 10 || Math.abs(h) < 10) {
      this.tempShape.destroy();
      this.tempShape = null;
      this.tempStartPos = null;
      this.layer.draw();
      return;
    }

    let x = this.tempShape.x();
    let y = this.tempShape.y();
    let width = w, height = h;
    if (w < 0) { x += w; width = -w; }
    if (h < 0) { y += h; height = -h; }

    this.tempShape.destroy();
    this.tempShape = null;
    this.tempStartPos = null;

    const shapeId = 'shape_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const shape = { id: shapeId, type: 'rect', x: x, y: y, width: width, height: height };
    this.model.addShape(shape);

    const rect = new Konva.Rect({
      x: x, y: y, width: width, height: height,
      fill: 'rgba(201, 168, 76, 0.1)',
      stroke: '#c9a84c',
      strokeWidth: 2,
      draggable: true
    });
    this.konvaShapes.set(shapeId, rect);
    this.layer.add(rect);
    this.layer.draw();

    this._notifyAreaChange();
    this.currentTool = 'select';
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setScale(scale) {
    if (scale <= 0) return;
    this.scale = scale;
    this.gridLayer.destroyChildren();
    this._drawGrid();
    this._notifyAreaChange();
  }

  assignSpaceType(shapeId, typeKey) {
    this.spaceTypeMap.set(shapeId, typeKey);
    const konvaShape = this.konvaShapes.get(shapeId);
    if (konvaShape) {
      const label = new Konva.Text({
        x: typeof konvaShape.x === 'function' ? konvaShape.x() + 8 : 8,
        y: typeof konvaShape.y === 'function' ? konvaShape.y() + 8 : 8,
        text: typeKey,
        fontSize: 12,
        fontFamily: 'Cinzel, sans-serif',
        fill: '#ffd700'
      });
      this.layer.add(label);
      this.layer.draw();
    }
    this._notifyAreaChange();
  }

  // 픽셀 → ㎡ (scale px = 1m)
  pxToSqm(pxArea) {
    const mPerPx = 1 / this.scale;
    return pxArea * mPerPx * mPerPx;
  }

  getSpacesForCalc() {
    const spaces = [];
    this.model.getAllShapes().forEach((shape, idx) => {
      if (shape.type !== 'rect') return;
      const typeKey = this.spaceTypeMap.get(shape.id) || 'UNKNOWN';
      const pxArea = shape.width * shape.height;
      const sqm = this.pxToSqm(pxArea);
      spaces.push({
        id: 'sp_' + idx,
        typeKey: typeKey,
        area_sqm: parseFloat(sqm.toFixed(2))
      });
    });
    return spaces;
  }

  onAreaChange(handler) {
    this.areaListeners.add(handler);
    return () => this.areaListeners.delete(handler);
  }

  _notifyAreaChange() {
    const spaces = this.getSpacesForCalc();
    this.areaListeners.forEach(h => h(spaces));
  }

  reset() {
    this.konvaShapes.forEach(s => { if (s.destroy) s.destroy(); });
    this.konvaShapes.clear();
    this.model.clear();
    this.spaceTypeMap.clear();
    this.layer.destroyChildren();
    this.layer.draw();
    this._notifyAreaChange();
  }

  destroy() {
    this.stage.destroy();
    this.areaListeners.clear();
  }
}

module.exports = { CADCanvas: CADCanvas };
