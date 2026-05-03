# ECOREAN BOC — Phase 4 Week 3 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 d4647f3 (Phase 4 Week 2 완료)
> **이번 주 목표:** CAD L1 평면도 인터랙티브 (Konva.js) + G4 듀얼 모드
> **소요:** 자율 실행 4~5시간
> **의의:** 대표님이 평면도를 드래그로 그리면 면적 자동 계산되어 견적 즉시 갱신

---

## 절대 규칙 (Phase 4 전 기간 동일)

1. TDD 강제
2. 버그 있는 코드 커밋 금지
3. estimate.html · boc-shell.html 직접 수정 금지
4. 22/23/12/6/5 변경 금지
5. Phase 3 25 모듈 시그니처 변경 금지
6. **Konva는 CDN 또는 npm 둘 중 택1 (esbuild external 권장)**
7. **G4 기존 숫자 입력 모드 보존 (평면도는 추가 모드)**
8. 9탭 회귀 0건 검증

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # d4647f3 확인 (Phase 4 Week 2)
git pull origin master
node scripts/backup.cjs --label phase4_week3_pre

# Phase 3 + Week 1+2 회귀
node test-engine.js                                              # 5/5
node shell/src/feature-flags/__tests__/flags.test.cjs           # 6/6
node modules-html/boc-v6/__tests__/Router.test.cjs              # 5/5
node modules-html/boc-v6/__tests__/WizardController.test.cjs    # 10/10
node modules-html/cad/__tests__/DrawingModel.test.cjs            # 9/9
node modules-html/cad/__tests__/DrawingEngine.test.cjs           # 7/7
node modules-html/cad/__tests__/CADBus.test.cjs                  # 2/2
node modules-html/cad/__tests__/L1_Floorplan.test.cjs            # 5/5
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 + Konva 설치

```bash
mkdir -p modules-html/boc-v6/src/cad
mkdir -p modules-html/boc-v6/src/cad/components
mkdir -p modules-html/boc-v6/src/cad/styles

# Konva 설치 (npm)
npm install --save konva
node -e "require('konva'); console.log('konva OK')"
```

---

## 작업 2: esbuild 설정 갱신 (Konva 외부화)

### 2-1. modules-html/boc-v6/build.config.cjs 수정

`external` 배열을 다음으로 교체 (또는 추가):

```javascript
external: [
  'better-sqlite3',
  'crypto',
  'fs',
  'path'
],
// Konva는 번들에 포함 (브라우저용)
// 만약 번들 크기 부담되면 CDN으로 분리 가능
```

→ 기본값: Konva 번들 포함 (216.5kb → ~400kb 예상). 너무 크면 CDN 옵션 추후.

---

## 작업 3: CADCanvas 컴포넌트 (Konva 래퍼)

### 3-1. modules-html/boc-v6/src/cad/CADCanvas.js

```javascript
// ECOREAN BOC v6.0 — CAD Canvas (Konva 기반 평면도 에디터)
// Phase 3 DrawingModel + DrawingEngine + L1_Floorplan과 연동

const Konva = require('konva');
const { DrawingModel } = require('@cad/core/DrawingModel.cjs');
const { DrawingEngine } = require('@cad/core/DrawingEngine.cjs');
const { L1_Floorplan } = require('@cad/layers/L1_Floorplan.cjs');
const { CADBus } = require('@cad/core/CADBus.cjs');

// Konva DrawingEngine 구현 (Phase 3 DrawingEngine 추상 클래스 확장)
class KonvaDrawingEngine extends DrawingEngine {
  constructor(stage, layer) {
    super();
    this.stage = stage;
    this.layer = layer;
    this.shapes = new Map();   // shapeId → Konva.Shape
  }

  drawRect(shape) {
    const rect = new Konva.Rect({
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      fill: 'rgba(201, 168, 76, 0.1)',
      stroke: '#c9a84c',
      strokeWidth: 2,
      draggable: true
    });
    this.shapes.set(shape.id, rect);
    this.layer.add(rect);
    this.layer.draw();
    return rect;
  }

  drawPolygon(shape) {
    const flat = shape.points.flatMap(p => [p.x, p.y]);
    const poly = new Konva.Line({
      points: flat,
      fill: 'rgba(201, 168, 76, 0.1)',
      stroke: '#c9a84c',
      strokeWidth: 2,
      closed: true,
      draggable: true
    });
    this.shapes.set(shape.id, poly);
    this.layer.add(poly);
    this.layer.draw();
    return poly;
  }

  drawText(opts) {
    const text = new Konva.Text({
      x: opts.x,
      y: opts.y,
      text: opts.text,
      fontSize: opts.fontSize || 14,
      fontFamily: 'Cinzel, sans-serif',
      fill: opts.fill || '#ffd700'
    });
    this.layer.add(text);
    this.layer.draw();
    return text;
  }

  removeShape(shapeId) {
    const shape = this.shapes.get(shapeId);
    if (shape) {
      shape.destroy();
      this.shapes.delete(shapeId);
      this.layer.draw();
    }
  }

  clear() {
    this.layer.destroyChildren();
    this.shapes.clear();
    this.layer.draw();
  }
}

// CADCanvas 메인 컴포넌트
class CADCanvas {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.width = opts.width || 800;
    this.height = opts.height || 500;
    this.scale = opts.scale || 50;        // 50px = 1m (기본), 사용자 조정 가능

    this.model = new DrawingModel();
    this.bus = new CADBus();

    this._setupStage();
    this.engine = new KonvaDrawingEngine(this.stage, this.layer);
    this.l1 = new L1_Floorplan({ model: this.model, engine: this.engine, bus: this.bus });

    this.currentTool = 'select';   // 'select' | 'rect' | 'polygon'
    this.tempShape = null;
    this.tempStartPos = null;

    this._setupEventListeners();

    this.spaceTypeMap = new Map();   // shapeId → typeKey (BATHROOM 등)
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
    this.stage.on('mousedown touchstart', (e) => this._onPointerDown(e));
    this.stage.on('mousemove touchmove', (e) => this._onPointerMove(e));
    this.stage.on('mouseup touchend', (e) => this._onPointerUp(e));
  }

  _onPointerDown(e) {
    if (this.currentTool !== 'rect') return;
    const pos = this.stage.getPointerPosition();
    this.tempStartPos = pos;
    this.tempShape = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      fill: 'rgba(201, 168, 76, 0.2)',
      stroke: '#ffd700',
      strokeWidth: 2,
      dash: [5, 5]
    });
    this.layer.add(this.tempShape);
  }

  _onPointerMove(e) {
    if (!this.tempShape || !this.tempStartPos) return;
    const pos = this.stage.getPointerPosition();
    this.tempShape.width(pos.x - this.tempStartPos.x);
    this.tempShape.height(pos.y - this.tempStartPos.y);
    this.layer.draw();
  }

  _onPointerUp(e) {
    if (!this.tempShape || !this.tempStartPos) return;
    const w = this.tempShape.width();
    const h = this.tempShape.height();

    // 너무 작으면 무시 (실수 클릭)
    if (Math.abs(w) < 10 || Math.abs(h) < 10) {
      this.tempShape.destroy();
      this.tempShape = null;
      this.tempStartPos = null;
      this.layer.draw();
      return;
    }

    // 정규화 (음수 방지)
    let x = this.tempShape.x();
    let y = this.tempShape.y();
    let width = w, height = h;
    if (w < 0) { x += w; width = -w; }
    if (h < 0) { y += h; height = -h; }

    // 임시 도형 제거
    this.tempShape.destroy();
    this.tempShape = null;
    this.tempStartPos = null;

    // 정식 도형 추가 (DrawingModel에)
    const shapeId = 'shape_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    this.model.addShape({
      id: shapeId,
      type: 'rect',
      x: x, y: y,
      width: width, height: height
    });
    this.engine.drawRect({ id: shapeId, x: x, y: y, width: width, height: height });
    this._notifyAreaChange();

    // 도구 자동 복귀 (한 번 그리면 select로)
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

  // 도형 → 공간 라벨링
  assignSpaceType(shapeId, typeKey) {
    this.spaceTypeMap.set(shapeId, typeKey);
    const konvaShape = this.engine.shapes.get(shapeId);
    if (konvaShape) {
      // 라벨 추가
      const label = new Konva.Text({
        x: konvaShape.x() + 8,
        y: konvaShape.y() + 8,
        text: typeKey,
        fontSize: 12,
        fontFamily: 'Cinzel, sans-serif',
        fill: '#ffd700'
      });
      konvaShape.label = label;
      this.layer.add(label);
      this.layer.draw();
    }
    this._notifyAreaChange();
  }

  // 픽셀 → ㎡ 변환
  pxToSqm(pxArea) {
    const mPerPx = 1 / this.scale;          // 50px = 1m → 1px = 0.02m
    return pxArea * mPerPx * mPerPx;
  }

  // 모든 공간의 면적 계산 → CalcEngine 입력 형식
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

  // 면적 변경 알림 구독
  onAreaChange(handler) {
    this.areaListeners.add(handler);
    return () => this.areaListeners.delete(handler);
  }

  _notifyAreaChange() {
    const spaces = this.getSpacesForCalc();
    this.areaListeners.forEach(h => h(spaces));
  }

  reset() {
    this.engine.clear();
    this.model.clear();
    this.spaceTypeMap.clear();
    this._notifyAreaChange();
  }

  destroy() {
    this.stage.destroy();
    this.areaListeners.clear();
  }
}

module.exports = { CADCanvas: CADCanvas, KonvaDrawingEngine: KonvaDrawingEngine };
```

### 3-2. modules-html/boc-v6/src/cad/styles/cad.css

```css
/* ECOREAN BOC v6.0 — CAD Canvas Styles */

.cad-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: var(--bg-2);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.cad-toolbar .tool-btn {
  padding: 6px 12px;
  font-size: 12px;
}
.cad-toolbar .tool-btn.active {
  background: var(--gold);
  color: var(--bg);
  border-color: var(--gold);
}
.cad-toolbar .scale-input {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-dim);
}
.cad-toolbar .scale-input input {
  width: 80px;
  padding: 4px 8px;
}
.cad-toolbar .spacer { flex: 1; }

.cad-canvas-wrapper {
  background: var(--bg);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  overflow: hidden;
  position: relative;
}
.cad-canvas-wrapper .canvas-hint {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(10, 14, 26, 0.85);
  border: 1px solid var(--gold-faint);
  padding: 6px 12px;
  font-size: 11px;
  color: var(--gold);
  font-family: var(--font-mono);
  border-radius: var(--border-radius);
  pointer-events: none;
}

.cad-spaces-list {
  background: var(--bg-2);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 16px;
  margin-top: 16px;
}
.cad-spaces-list h4 {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.cad-space-row {
  display: grid;
  grid-template-columns: 100px 1fr 80px 60px;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--gold-faint);
  font-size: 12px;
}
.cad-space-row:last-child { border-bottom: none; }
.cad-space-row .shape-id {
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-size: 10px;
}
.cad-space-row select {
  width: 100%;
  font-size: 12px;
  padding: 4px 8px;
}
.cad-space-row .area {
  font-family: var(--font-mono);
  text-align: right;
  color: var(--gold);
}
.cad-space-row .area-unit {
  font-size: 10px;
  color: var(--text-dim);
  text-align: right;
}

.mode-toggle {
  display: flex;
  background: var(--bg-2);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 4px;
  margin-bottom: 16px;
  width: fit-content;
}
.mode-toggle button {
  border: none;
  padding: 8px 16px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.mode-toggle button.active {
  background: var(--gold);
  color: var(--bg);
}
```

---

## 작업 4: CADCanvas 단위 테스트

### 4-1. modules-html/boc-v6/__tests__/CADCanvas.test.cjs

```javascript
// CADCanvas 테스트 — Konva 의존성 없이 핵심 로직만 검증
// 실제 Konva 통합은 브라우저에서 수동 검증

const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');

// 별칭 등록
const Module = require('module');
const _resolveFilename = Module._resolveFilename.bind(Module);
const aliases = {
  '@cad/': path.join(ROOT, 'modules-html/cad/src/'),
  '@gates/': path.join(ROOT, 'shell/src/gates/')
};
Module._resolveFilename = function(request, parent, ...args) {
  for (const prefix in aliases) {
    if (request.startsWith(prefix)) {
      return _resolveFilename(request.replace(prefix, aliases[prefix]), parent, ...args);
    }
  }
  return _resolveFilename(request, parent, ...args);
};

// Konva mock (브라우저 전용)
require.cache[require.resolve('konva')] = {
  exports: {
    Stage: function() { return { on: function() {}, getPointerPosition: function() { return {x:0, y:0}; }, destroy: function() {}, add: function() {} }; },
    Layer: function() { return { add: function() {}, draw: function() {}, destroyChildren: function() {} }; },
    Rect: function() { return { width: function() {return 100;}, height: function() {return 100;}, x: function() {return 0;}, y: function() {return 0;}, destroy: function() {} }; },
    Line: function() { return {}; },
    Text: function() { return {}; }
  }
};

const { CADCanvas } = require('../src/cad/CADCanvas.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 인스턴스화
(function() {
  const canvas = new CADCanvas({
    containerEl: { /* mock */ },
    width: 800,
    height: 500,
    scale: 50
  });
  assert(canvas.scale === 50, '기본 스케일 50');
  assert(canvas.currentTool === 'select', '기본 도구 select');
})();

// Test 2: 픽셀 → ㎡ 변환
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  // 50px = 1m → 100×100px = 2×2m = 4㎡
  const sqm = canvas.pxToSqm(100 * 100);
  assert(Math.abs(sqm - 4) < 0.01, '100×100px = 4㎡: 실제 ' + sqm);
})();

// Test 3: 스케일 변경
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  canvas.setScale(100);  // 100px = 1m
  // 100×100px = 1×1m = 1㎡
  const sqm = canvas.pxToSqm(100 * 100);
  assert(Math.abs(sqm - 1) < 0.01, '100×100px @ scale 100 = 1㎡');
})();

// Test 4: 잘못된 스케일 무시
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  canvas.setScale(0);
  assert(canvas.scale === 50, '0 무시');
  canvas.setScale(-10);
  assert(canvas.scale === 50, '음수 무시');
})();

// Test 5: 도구 전환
(function() {
  const canvas = new CADCanvas({ containerEl: {} });
  canvas.setTool('rect');
  assert(canvas.currentTool === 'rect', 'rect 도구');
  canvas.setTool('select');
  assert(canvas.currentTool === 'select', 'select 도구');
})();

// Test 6: 공간 타입 할당
(function() {
  const canvas = new CADCanvas({ containerEl: {} });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 100, height: 100 });
  canvas.assignSpaceType('s1', 'BATHROOM');
  assert(canvas.spaceTypeMap.get('s1') === 'BATHROOM', 'BATHROOM 라벨');
})();

// Test 7: getSpacesForCalc — CalcEngine 입력 형식
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 250, height: 250 });
  canvas.assignSpaceType('s1', 'BATHROOM');
  const spaces = canvas.getSpacesForCalc();
  assert(spaces.length === 1, '1개 공간');
  assert(spaces[0].typeKey === 'BATHROOM', 'typeKey');
  // 250×250px @ scale 50 = 5×5m = 25㎡
  assert(Math.abs(spaces[0].area_sqm - 25) < 0.01, '25㎡: 실제 ' + spaces[0].area_sqm);
})();

// Test 8: 면적 변경 구독
(function() {
  const canvas = new CADCanvas({ containerEl: {}, scale: 50 });
  let received = null;
  canvas.onAreaChange(spaces => { received = spaces; });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 100, height: 100 });
  canvas.assignSpaceType('s1', 'KITCHEN');
  assert(received !== null, '구독 호출됨');
  assert(received[0].typeKey === 'KITCHEN', 'KITCHEN');
})();

// Test 9: reset
(function() {
  const canvas = new CADCanvas({ containerEl: {} });
  canvas.model.addShape({ id: 's1', type: 'rect', x: 0, y: 0, width: 100, height: 100 });
  canvas.assignSpaceType('s1', 'LIVING');
  canvas.reset();
  assert(canvas.spaceTypeMap.size === 0, 'spaceTypeMap 비움');
})();

console.log('[PASS] CADCanvas (9/9)');
```

### 4-2. 검증

```bash
node modules-html/boc-v6/__tests__/CADCanvas.test.cjs
# 기대: [PASS] CADCanvas (9/9)
```

---

## 작업 5: CADToolbar 컴포넌트

### 5-1. modules-html/boc-v6/src/cad/components/CADToolbar.js

```javascript
// ECOREAN BOC v6.0 — CAD Toolbar
// 도구 선택 + 스케일 입력 + 리셋

class CADToolbar {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.canvas = opts.canvas;
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="cad-toolbar">
        <button class="tool-btn active" data-tool="select">선택</button>
        <button class="tool-btn" data-tool="rect">📐 사각형</button>
        <div class="spacer"></div>
        <div class="scale-input">
          <span>스케일</span>
          <input type="number" id="scale-input" value="${this.canvas.scale}" min="10" max="200" step="10">
          <span>px = 1m</span>
        </div>
        <button id="cad-reset">초기화</button>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.containerEl.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.canvas.setTool(btn.dataset.tool);
      });
    });

    this.containerEl.querySelector('#scale-input').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (val > 0) this.canvas.setScale(val);
    });

    this.containerEl.querySelector('#cad-reset').addEventListener('click', () => {
      if (confirm('평면도를 초기화할까요?')) this.canvas.reset();
    });
  }
}

module.exports = { CADToolbar: CADToolbar };
```

### 5-2. modules-html/boc-v6/src/cad/components/CADSpacesList.js

```javascript
// ECOREAN BOC v6.0 — CAD Spaces List
// 그려진 도형 목록 + 공간 타입 할당 드롭다운

const { SPACES, getAllSpaceKeys } = require('@estimate-v6/matrices/Spaces.cjs');

class CADSpacesList {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.canvas = opts.canvas;
    this.spaceKeys = getAllSpaceKeys();

    this.unsubscribe = this.canvas.onAreaChange(() => this.render());
    this.render();
  }

  render() {
    const shapes = this.canvas.model.getAllShapes();

    if (shapes.length === 0) {
      this.containerEl.innerHTML = `
        <div class="cad-spaces-list">
          <h4>공간 목록</h4>
          <p style="color: var(--text-dim); font-size: 12px;">
            평면도에 사각형을 그려서 공간을 추가하세요.<br>
            "사각형" 도구 클릭 → 캔버스에서 드래그
          </p>
        </div>
      `;
      return;
    }

    this.containerEl.innerHTML = `
      <div class="cad-spaces-list">
        <h4>공간 목록 (${shapes.length})</h4>
        ${shapes.map((shape, idx) => {
          const typeKey = this.canvas.spaceTypeMap.get(shape.id) || '';
          const sqm = this.canvas.pxToSqm(shape.width * shape.height);
          return `
            <div class="cad-space-row" data-shape-id="${shape.id}">
              <div class="shape-id">${shape.id.slice(0, 12)}...</div>
              <select data-shape-id="${shape.id}">
                <option value="">공간 선택</option>
                ${this.spaceKeys.map(k => `
                  <option value="${k}" ${typeKey === k ? 'selected' : ''}>${SPACES[k].name} (${k})</option>
                `).join('')}
              </select>
              <div class="area">${sqm.toFixed(2)}</div>
              <div class="area-unit">㎡</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.containerEl.querySelectorAll('select[data-shape-id]').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const shapeId = e.target.dataset.shapeId;
        const typeKey = e.target.value;
        if (typeKey) this.canvas.assignSpaceType(shapeId, typeKey);
      });
    });
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

module.exports = { CADSpacesList: CADSpacesList };
```

---

## 작업 6: G4Page 듀얼 모드 갱신

### 6-1. modules-html/boc-v6/src/wizard/gates/G4Page.js 전체 교체

```javascript
// G4: CAD 면적 입력 — 듀얼 모드 (숫자 입력 ↔ 평면도)
const { getSpacesForSections } = require('@estimate-v6/matrices/Sections.cjs');
const { getSpace } = require('@estimate-v6/matrices/Spaces.cjs');
const { CADCanvas } = require('../../cad/CADCanvas.js');
const { CADToolbar } = require('../../cad/components/CADToolbar.js');
const { CADSpacesList } = require('../../cad/components/CADSpacesList.js');

class G4Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;

    const state = this.controller.getState();
    this.autoSpaces = getSpacesForSections(state.input.sections);

    // 모드: 'numeric' (숫자 입력) | 'cad' (평면도)
    this.mode = 'numeric';

    // numeric 모드 데이터
    this.spaceInputs = this.autoSpaces.map((spaceKey, idx) => ({
      id: 'sp_' + idx,
      typeKey: spaceKey,
      area_sqm: 0
    }));

    // cad 모드 데이터
    this.cadCanvas = null;
    this.cadSpaces = [];

    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 4 — 공간 면적 입력</h2>
        <div class="gate-subtitle">자동화 85% → 95% (1단계 견적 완성)</div>

        <div class="mode-toggle">
          <button data-mode="numeric" class="${this.mode === 'numeric' ? 'active' : ''}">숫자 입력</button>
          <button data-mode="cad" class="${this.mode === 'cad' ? 'active' : ''}">📐 평면도</button>
        </div>

        <div id="g4-mode-content"></div>

        <div class="gate-actions">
          <button id="g4-back">← 이전</button>
          <button class="primary" id="g4-next" disabled>견적 계산 →</button>
        </div>
      </div>

      <div id="estimate-preview-container"></div>
    `;

    this.containerEl.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this._switchMode(btn.dataset.mode));
    });
    this.containerEl.querySelector('#g4-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g4-next').addEventListener('click', () => this._submit());

    this._renderModeContent();
  }

  _switchMode(mode) {
    this.mode = mode;
    this.containerEl.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    this._renderModeContent();
  }

  _renderModeContent() {
    const contentEl = document.getElementById('g4-mode-content');

    if (this.cadCanvas) {
      this.cadCanvas.destroy();
      this.cadCanvas = null;
    }

    if (this.mode === 'numeric') {
      this._renderNumericMode(contentEl);
    } else {
      this._renderCADMode(contentEl);
    }
  }

  _renderNumericMode(el) {
    el.innerHTML = `
      <div class="card">
        ${this.spaceInputs.map((input, idx) => {
          const meta = getSpace(input.typeKey);
          return `
            <div class="space-row">
              <div class="space-name" style="font-family: var(--font-display); color: var(--gold);">${input.typeKey}</div>
              <div class="space-name">${meta ? meta.name : input.typeKey}</div>
              <input type="number" min="0" step="0.5" placeholder="면적(㎡)" data-idx="${idx}" value="${input.area_sqm || ''}">
              <div style="text-align: right; color: var(--text-dim); font-size: 11px;">㎡</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    el.querySelectorAll('input[data-idx]').forEach(inp => {
      inp.addEventListener('input', () => this._onNumericInput(inp));
    });

    this._updateNextBtn();
  }

  _renderCADMode(el) {
    el.innerHTML = `
      <div id="cad-toolbar-container"></div>
      <div class="cad-canvas-wrapper">
        <div id="cad-canvas-container" style="width: 100%; height: 500px;"></div>
        <div class="canvas-hint">사각형 도구 → 드래그하여 공간 추가</div>
      </div>
      <div id="cad-spaces-container"></div>
    `;

    setTimeout(() => {
      const canvasContainer = document.getElementById('cad-canvas-container');
      const wrapperWidth = canvasContainer.clientWidth || 800;

      this.cadCanvas = new CADCanvas({
        containerEl: canvasContainer,
        width: wrapperWidth,
        height: 500,
        scale: 50
      });

      new CADToolbar({
        containerEl: document.getElementById('cad-toolbar-container'),
        canvas: this.cadCanvas
      });

      new CADSpacesList({
        containerEl: document.getElementById('cad-spaces-container'),
        canvas: this.cadCanvas
      });

      this.cadCanvas.onAreaChange(spaces => {
        this.cadSpaces = spaces.filter(s => s.typeKey !== 'UNKNOWN' && s.area_sqm > 0);
        this._updateNextBtn();
      });
    }, 50);
  }

  _onNumericInput(inp) {
    const idx = parseInt(inp.dataset.idx);
    const val = parseFloat(inp.value) || 0;
    this.spaceInputs[idx].area_sqm = val;
    this._updateNextBtn();
  }

  _updateNextBtn() {
    const btn = this.containerEl.querySelector('#g4-next');
    if (this.mode === 'numeric') {
      btn.disabled = !this.spaceInputs.every(s => s.area_sqm > 0);
    } else {
      btn.disabled = this.cadSpaces.length === 0;
    }
  }

  _submit() {
    const spaces = this.mode === 'numeric' ? this.spaceInputs : this.cadSpaces;
    const r = this.controller.lockG4({ spaces: spaces });
    if (!r.ok) {
      alert('G4 잠금 실패: ' + r.error);
      return;
    }
    this._renderEstimate();
  }

  _renderEstimate() {
    const state = this.controller.getState();
    const e = state.estimate;
    if (!e) return;

    document.getElementById('estimate-preview-container').innerHTML = `
      <div class="estimate-preview">
        <h3>1단계 견적 (자동화 95%)</h3>
        <div class="estimate-row">
          <span class="label">총 면적</span>
          <span class="value">${e.areaSqm.toFixed(1)}㎡</span>
        </div>
        <div class="estimate-row">
          <span class="label">공급가</span>
          <span class="value">${e.supply.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">도급합계 (×${e.factors.gradeMul} 컨셉 + ×${e.factors.baseFactor} 주거)</span>
          <span class="value">${e.contract.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">VAT 10%</span>
          <span class="value">${(e.final - e.contract).toLocaleString()}원</span>
        </div>
        <div class="estimate-row highlight">
          <span class="label">최종 금액</span>
          <span class="value">${e.final.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">㎡당 / 평당</span>
          <span class="value">${e.sqmPrice.toLocaleString()} / ${e.pyPrice.toLocaleString()}원</span>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.cadCanvas) this.cadCanvas.destroy();
  }
}

module.exports = { G4Page: G4Page };
```

---

## 작업 7: index.html 갱신 + 빌드

### 7-1. modules-html/boc-v6/index.html

`<head>` 안 wizard.css 다음에 추가:

```html
<link rel="stylesheet" href="src/cad/styles/cad.css">
```

### 7-2. 빌드 + 검증

```bash
# 빌드 (Konva 포함, 번들 크기 증가 예상)
node modules-html/boc-v6/build.cjs
# 기대: 빌드 PASS (~400~500kb)

# CADCanvas 테스트
node modules-html/boc-v6/__tests__/CADCanvas.test.cjs
# 기대: [PASS] CADCanvas (9/9)

# 전체 회귀
node test-engine.js
node modules-html/boc-v6/__tests__/Router.test.cjs
node modules-html/boc-v6/__tests__/WizardController.test.cjs
node modules-html/cad/__tests__/DrawingModel.test.cjs
node modules-html/cad/__tests__/L1_Floorplan.test.cjs
```

### 7-3. 브라우저 검증 (수동)

```
1. modules-html/boc-v6/index.html 열기
2. /wizard 진입 → G1 → G2 → G3 → G4
3. G4에서 "📐 평면도" 토글 클릭
4. "사각형" 도구 클릭 → 캔버스에서 드래그
5. 도형 그려짐 → 공간 목록에 등장
6. 드롭다운에서 공간 타입 선택 (BATHROOM 등)
7. 면적 자동 계산 (㎡)
8. "견적 계산 →" 클릭 → 견적 미리보기 표시
9. "숫자 입력" 토글로 다시 전환 → 기존 모드도 작동
```

---

## 작업 8: PHASE_4C_COMPLETE 활성화

### 8-1. shell/src/feature-flags/flags.cjs

```javascript
PHASE_4C_COMPLETE:      true,    // 변경
USE_CAD_CANVAS:         true     // 신규
```

### 8-2. flags 테스트 갱신

```javascript
assert(isEnabled('PHASE_4C_COMPLETE') === true, 'PHASE_4C_COMPLETE Week3 완료');
assert(isEnabled('USE_CAD_CANVAS') === true, 'CAD Canvas 활성');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
```

---

## 작업 9: 커밋 (3개 + push)

```bash
# 커밋 1: CADCanvas + KonvaDrawingEngine + 테스트
git add modules-html/boc-v6/src/cad/CADCanvas.js modules-html/boc-v6/src/cad/styles/ modules-html/boc-v6/__tests__/CADCanvas.test.cjs package.json package-lock.json
git commit -m "feat(v6/cad): Konva 기반 CADCanvas + 면적 자동 계산 (9/9 PASS)

- KonvaDrawingEngine: Phase 3 DrawingEngine 추상 클래스 구현
- CADCanvas: 사각형 드래그 그리기 + 그리드 + 스케일 조정
- pxToSqm 변환: 50px = 1m 기본 (사용자 조정 가능)
- assignSpaceType: 도형 → 공간 매핑 (23 공간 키)
- onAreaChange 구독: 면적 변경 시 CalcEngine 입력 자동 갱신
- cad.css: 다크+골드 도구 모음 + 캔버스 스타일
- CADCanvas 9/9 PASS"

# 커밋 2: CADToolbar + CADSpacesList + G4 듀얼 모드
git add modules-html/boc-v6/src/cad/components/ modules-html/boc-v6/src/wizard/gates/G4Page.js modules-html/boc-v6/index.html modules-html/boc-v6/build/
git commit -m "feat(v6/cad): CADToolbar + SpacesList + G4 듀얼 모드 (숫자↔평면도)

- CADToolbar: 선택/사각형 도구 + 스케일 입력 + 초기화
- CADSpacesList: 도형 목록 + 23 공간 드롭다운 + 면적 자동 표시
- G4Page 듀얼 모드: 숫자 입력 ↔ 평면도 토글
- 평면도 모드: 사각형 그리기 → 공간 라벨링 → CalcEngine 자동 연결
- 기존 숫자 입력 모드 보존
- esbuild 번들 갱신"

# 커밋 3: PHASE_4C_COMPLETE
git add shell/src/feature-flags/
git commit -m "feat(v6/phase-4c): Phase 4 Week 3 완료 — PHASE_4C_COMPLETE = true (CAD Canvas 활성)"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 4 Week 3 완료 — CAD L1 평면도 인터랙티브

[신규 모듈]
- src/cad/CADCanvas.js          — Konva 기반 평면도 에디터
- src/cad/components/CADToolbar.js — 도구 모음
- src/cad/components/CADSpacesList.js — 공간 목록
- src/cad/styles/cad.css         — 다크+골드 CAD 스타일

[수정]
- src/wizard/gates/G4Page.js     — 듀얼 모드 (숫자/평면도)

[테스트 결과]
- CADCanvas: 9/9 PASS
- WizardController: 10/10 PASS (회귀)
- Router: 5/5 PASS (회귀)
- Phase 3 회귀: 0건
- test-engine: 5/5 PASS

[브라우저 검증]
- /wizard → G4 → "평면도" 토글 → 사각형 드래그 → 면적 자동 계산
- 30평 아파트 + 클래식럭셔리 + 욕실 5㎡ + 주방 10㎡ + 거실 20㎡
  → 평면도로 그려서도 16,735,950원 견적 동일

[다음 주]
Phase 4 Week 4: 견적 결과 화면 + KPI 디지털 계기판 통합
- /kpi 라우트 활성화
- KPIBus → KPI 11항목 실시간 갱신
- 견적 → KPI 자동 연결
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- Phase 3 25 모듈 시그니처 변경
- G4 기존 숫자 입력 모드 제거 (보존)

---

**문서 끝.**
**즉시 시작:** 작업 1(디렉토리+Konva) → 2(esbuild) → 3(CADCanvas+CSS) → 4(테스트) → 5(Toolbar+SpacesList) → 6(G4 듀얼) → 7(빌드+검증) → 8(플래그) → 9(커밋+push).
