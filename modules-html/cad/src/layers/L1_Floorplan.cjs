// ECOREAN BOC v5.6 — L1 Floorplan Layer
// 평면도 레이어 — Konva.js (브라우저 환경)
// .cjs는 로직만, 실제 Konva 렌더는 브라우저 HTML에서 호출

const { DrawingEngine } = require('../core/DrawingEngine.cjs');
const { LAYERS, createRectSpace } = require('../core/DrawingModel.cjs');

class FloorplanEngine extends DrawingEngine {
  constructor(opts) {
    super(opts);
    this.layer = LAYERS.L1;
    this.containerEl = opts.containerEl || null;
    this.konvaStage = null;
    this.konvaLayer = null;
    this.initialized = false;
  }

  init() {
    if (typeof window === 'undefined' || typeof Konva === 'undefined') {
      // Node 테스트 환경: 스킵
      this.initialized = true;
      return;
    }
    if (!this.containerEl) throw new Error('FloorplanEngine: containerEl 필수');
    this.konvaStage = new Konva.Stage({
      container: this.containerEl,
      width: this.opts.width || 800,
      height: this.opts.height || 600
    });
    this.konvaLayer = new Konva.Layer();
    this.konvaStage.add(this.konvaLayer);
    this.initialized = true;
  }

  render() {
    if (typeof window === 'undefined' || typeof Konva === 'undefined') return;
    if (!this.konvaLayer) return;

    this.konvaLayer.destroyChildren();

    const list = this.getByLayer(this.layer);
    list.forEach((d) => {
      const rect = new Konva.Rect({
        x: d.geometry.x / 10,
        y: d.geometry.y / 10,
        width: d.geometry.width / 10,
        height: d.geometry.length / 10,
        fill: d.style.fillColor,
        stroke: d.style.strokeColor,
        strokeWidth: d.style.strokeWidth,
        draggable: true,
        id: d.id
      });

      rect.on('dragend', () => {
        this.update(d.id, {
          geometry: {
            x: rect.x() * 10,
            y: rect.y() * 10,
            width: d.geometry.width,
            length: d.geometry.length
          }
        });
      });

      this.konvaLayer.add(rect);

      if (d.metadata && d.metadata.typeKey) {
        const label = new Konva.Text({
          x: rect.x() + 5,
          y: rect.y() + 5,
          text: d.metadata.typeKey,
          fontSize: 12,
          fill: '#C9A84C'
        });
        this.konvaLayer.add(label);
      }
    });

    this.konvaLayer.draw();
  }

  destroy() {
    if (this.konvaStage) {
      this.konvaStage.destroy();
      this.konvaStage = null;
      this.konvaLayer = null;
    }
    this.initialized = false;
  }
}

module.exports = { FloorplanEngine };
