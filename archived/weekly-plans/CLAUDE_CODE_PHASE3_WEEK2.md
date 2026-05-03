# ECOREAN BOC — Phase 3 Week 2 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 0bf1a1d (Week 1 완료)
> **이번 주 목표:** @ecorean/cad 단독 모듈 분리 + Drawing 모델 + L1 평면도 + CADBus
> **소요:** 자율 실행 2~3시간
> **중요:** shell/ 는 ESM, 따라서 신규 .cjs 사용 (Week 1과 동일 패턴)

---

## 절대 규칙 (Phase 3 전 기간)

1. TDD 강제 — 테스트 먼저, 코드 나중
2. 버그 있는 코드 커밋 금지
3. rollback SQL 없는 DB 변경 금지
4. 9탭 회귀 0건 검증 후만 다음 단계
5. 13단계 디자인과 충돌 시 즉시 보고
6. **estimate.html · boc-shell.html 직접 수정 금지**
7. 기존 미니 CAD는 그대로 유지 (Feature Flag USE_CAD_MODULE=false 기본값)
8. Feature Flag로 v5.0 path와 v5.6 path 분리

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git status
git log --oneline -3   # 0bf1a1d 확인
git pull origin master

# DB 백업
cp ecorean-boc.db ecorean-boc.db.bak.week1

# Week 1 테스트 회귀 확인
node shell/src/core-bus/__tests__/CoreBus.test.cjs
node shell/src/core-bus/__tests__/schemas.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node scripts/generate-from-graph.js
node test-engine.js
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조 신설

```bash
mkdir -p modules-html/cad/src/core
mkdir -p modules-html/cad/src/layers
mkdir -p modules-html/cad/src/exporters
mkdir -p modules-html/cad/src/importers
mkdir -p modules-html/cad/__tests__
mkdir -p db/migrations/v5.6
```

---

## 작업 2: Drawing 데이터 모델 (100배 확장 호환 설계)

### 2-1. modules-html/cad/src/core/DrawingModel.cjs

```javascript
// ECOREAN BOC v5.6 — Drawing 데이터 모델
// SoT: docs/MASTER_PLAN.md §109 (CAD 모듈 L1~L7 진화)
// 절대 규칙: version 컬럼으로 마이그레이션 안전성 보장
// 100배 확장 호환: tenant_id + version + layer + geometry_json

const DRAWING_MODEL_VERSION = '1.0.0';

const LAYERS = {
  L1: 'floorplan',         // 평면도 (Konva, 활성)
  L2: 'specification',     // 시방 표기 (Phase 3 Week 3)
  L3: 'construction',      // 시공 도면 (3개월 후)
  L4: 'elevation',         // 입면도 (6개월 후)
  L5: 'rendering_3d',      // 3D 시각화 (1년 후, Three.js)
  L6: 'dxf',               // DXF/DWG (1.5년 후)
  L7: 'bim_ifc'            // BIM/IFC (2034, 모듈러하우스)
};

const GEOMETRY_TYPES = {
  RECT: 'rect',            // 사각형 (공간)
  POLYGON: 'polygon',      // 다각형
  CIRCLE: 'circle',        // 원형 (테이블 등)
  POLYLINE: 'polyline',    // 선
  GROUP: 'group'           // 묶음
};

// Drawing 한 건의 표준 형식
function createDrawing(opts) {
  if (!opts.spaceId) throw new Error('Drawing: spaceId 필수');
  if (!opts.layer) throw new Error('Drawing: layer 필수');
  if (!opts.geometryType) throw new Error('Drawing: geometryType 필수');

  return {
    id: opts.id || ('drw_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    spaceId: opts.spaceId,
    tenantId: opts.tenantId || 'HQ',
    version: DRAWING_MODEL_VERSION,
    layer: opts.layer,                     // L1~L7
    geometryType: opts.geometryType,       // rect/polygon/circle 등
    geometry: opts.geometry || {},         // {x, y, width, height} 또는 {points: [...]}
    style: opts.style || {},               // 시각 스타일 (CSS 변경 자유)
    metadata: opts.metadata || {},         // 자유 확장
    createdAt: opts.createdAt || Date.now(),
    updatedAt: Date.now()
  };
}

// 사각형 공간 생성 헬퍼 (L1 평면도용)
function createRectSpace(opts) {
  return createDrawing({
    spaceId: opts.spaceId,
    tenantId: opts.tenantId,
    layer: LAYERS.L1,
    geometryType: GEOMETRY_TYPES.RECT,
    geometry: {
      x: opts.x || 0,                      // mm
      y: opts.y || 0,
      width: opts.width || 4000,           // mm (기본 4m)
      length: opts.length || 3000          // mm (기본 3m)
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

// 면적 자동 계산 (SPACE_UPDATED 이벤트 발행 시 사용)
function computeAreaSqm(drawing) {
  if (drawing.geometryType !== GEOMETRY_TYPES.RECT) {
    throw new Error('computeAreaSqm: rect 외 타입 미지원 (Week 3 확장 예정)');
  }
  const w = drawing.geometry.width || 0;
  const l = drawing.geometry.length || 0;
  return (w * l) / 1000000;   // mm² → m²
}

// 검증
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
  DRAWING_MODEL_VERSION: DRAWING_MODEL_VERSION,
  LAYERS: LAYERS,
  GEOMETRY_TYPES: GEOMETRY_TYPES,
  createDrawing: createDrawing,
  createRectSpace: createRectSpace,
  computeAreaSqm: computeAreaSqm,
  validateDrawing: validateDrawing
};
```

### 2-2. modules-html/cad/__tests__/DrawingModel.test.cjs

```javascript
const {
  DRAWING_MODEL_VERSION, LAYERS, GEOMETRY_TYPES,
  createDrawing, createRectSpace, computeAreaSqm, validateDrawing
} = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 7 레이어 정의
(function() {
  const count = Object.keys(LAYERS).length;
  assert(count === 7, '레이어 7개: 실제 ' + count);
  assert(LAYERS.L1 === 'floorplan', 'L1 평면도');
  assert(LAYERS.L7 === 'bim_ifc', 'L7 BIM');
})();

// Test 2: 5 geometry 타입
(function() {
  const count = Object.keys(GEOMETRY_TYPES).length;
  assert(count === 5, 'geometry 5종');
})();

// Test 3: createDrawing 필수 필드 검증
(function() {
  let threw = false;
  try { createDrawing({}); } catch(e) { threw = true; }
  assert(threw, 'spaceId 없으면 throw');
})();

// Test 4: createRectSpace 정상
(function() {
  const d = createRectSpace({
    spaceId: 'space_001',
    typeKey: 'LIVING',
    width: 5000,
    length: 4000
  });
  assert(d.spaceId === 'space_001', 'spaceId');
  assert(d.layer === 'floorplan', 'L1 자동');
  assert(d.geometry.width === 5000, 'width');
  assert(d.metadata.typeKey === 'LIVING', 'typeKey');
  assert(d.tenantId === 'HQ', 'tenantId 기본 HQ');
  assert(d.version === DRAWING_MODEL_VERSION, 'version');
})();

// Test 5: 면적 자동 계산
(function() {
  const d = createRectSpace({ spaceId: 's', width: 5000, length: 4000 });
  const area = computeAreaSqm(d);
  assert(area === 20, '5000×4000mm = 20㎡');
})();

// Test 6: validateDrawing 통과
(function() {
  const d = createRectSpace({ spaceId: 's' });
  const errors = validateDrawing(d);
  assert(errors.length === 0, '정상 drawing 검증 통과');
})();

// Test 7: validateDrawing 누락 검증
(function() {
  const errors = validateDrawing({ id: 'x' });
  assert(errors.length > 0, '누락 시 에러');
})();

// Test 8: 멀티테넌시 (tenantId 분리)
(function() {
  const d1 = createRectSpace({ spaceId: 's', tenantId: 'F001' });
  const d2 = createRectSpace({ spaceId: 's', tenantId: 'F002' });
  assert(d1.tenantId !== d2.tenantId, 'tenant 격리');
})();

// Test 9: version 컬럼 (마이그레이션 호환)
(function() {
  const d = createRectSpace({ spaceId: 's' });
  assert(typeof d.version === 'string', 'version string');
  assert(d.version === '1.0.0', 'version 1.0.0');
})();

console.log('[PASS] DrawingModel (9/9)');
```

### 2-3. 검증

```bash
node modules-html/cad/__tests__/DrawingModel.test.cjs
# 기대: [PASS] DrawingModel (9/9)
```

---

## 작업 3: DrawingEngine 추상 클래스 (라이브러리 격리)

### 3-1. modules-html/cad/src/core/DrawingEngine.cjs

```javascript
// ECOREAN BOC v5.6 — Drawing Engine 추상 클래스
// 목적: CAD 라이브러리 (Konva → Three.js → Fabric.js) 자유 교체 보장
// SoT: docs/ARCHITECTURE.md §5 (CAD 모듈 분리)

class DrawingEngine {
  constructor(opts) {
    this.opts = opts || {};
    this.drawings = new Map();   // id → drawing
    this.listeners = [];
  }

  // 추상 메서드 (서브클래스 구현 필수)
  init() { throw new Error('init() 미구현'); }
  render() { throw new Error('render() 미구현'); }
  destroy() { throw new Error('destroy() 미구현'); }

  // 공통 — drawing 추가/수정/삭제
  add(drawing) {
    this.drawings.set(drawing.id, drawing);
    this._notify('ADDED', drawing);
  }

  update(id, patch) {
    const existing = this.drawings.get(id);
    if (!existing) return null;
    const updated = Object.assign({}, existing, patch, { updatedAt: Date.now() });
    this.drawings.set(id, updated);
    this._notify('UPDATED', updated);
    return updated;
  }

  remove(id) {
    const existing = this.drawings.get(id);
    if (!existing) return false;
    this.drawings.delete(id);
    this._notify('REMOVED', existing);
    return true;
  }

  get(id) { return this.drawings.get(id); }
  getAll() { return Array.from(this.drawings.values()); }
  getByLayer(layer) {
    return Array.from(this.drawings.values()).filter(function(d) { return d.layer === layer; });
  }
  getBySpace(spaceId) {
    return Array.from(this.drawings.values()).filter(function(d) { return d.spaceId === spaceId; });
  }

  // 변경 알림 (CADBus 발행용)
  onChange(handler) {
    this.listeners.push(handler);
  }

  _notify(action, drawing) {
    this.listeners.forEach(function(h) {
      try { h(action, drawing); } catch (e) { console.error('[DrawingEngine] handler:', e.message); }
    });
  }
}

module.exports = { DrawingEngine: DrawingEngine };
```

### 3-2. modules-html/cad/__tests__/DrawingEngine.test.cjs

```javascript
const { DrawingEngine } = require('../src/core/DrawingEngine.cjs');
const { createRectSpace } = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// 테스트용 구체 클래스
class TestEngine extends DrawingEngine {
  init() { this.initialized = true; }
  render() { this.rendered = true; }
  destroy() { this.destroyed = true; }
}

// Test 1: 추상 메서드 throw
(function() {
  const base = new DrawingEngine();
  let threw = false;
  try { base.init(); } catch(e) { threw = true; }
  assert(threw, 'init() 추상');
})();

// Test 2: add/get
(function() {
  const eng = new TestEngine();
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(eng.get(d.id) === d, 'add/get');
  assert(eng.getAll().length === 1, 'getAll 1');
})();

// Test 3: update
(function() {
  const eng = new TestEngine();
  const d = createRectSpace({ spaceId: 's1', width: 4000 });
  eng.add(d);
  const updated = eng.update(d.id, { geometry: { width: 5000, length: 4000 } });
  assert(updated.geometry.width === 5000, 'update 반영');
})();

// Test 4: remove
(function() {
  const eng = new TestEngine();
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(eng.remove(d.id) === true, 'remove true');
  assert(eng.getAll().length === 0, 'remove 후 0');
})();

// Test 5: getByLayer
(function() {
  const eng = new TestEngine();
  eng.add(createRectSpace({ spaceId: 's1' }));
  eng.add(createRectSpace({ spaceId: 's2' }));
  assert(eng.getByLayer('floorplan').length === 2, 'getByLayer L1');
})();

// Test 6: getBySpace
(function() {
  const eng = new TestEngine();
  eng.add(createRectSpace({ spaceId: 's1' }));
  eng.add(createRectSpace({ spaceId: 's2' }));
  eng.add(createRectSpace({ spaceId: 's1' }));
  assert(eng.getBySpace('s1').length === 2, 's1 2건');
})();

// Test 7: onChange 알림
(function() {
  const eng = new TestEngine();
  let action = null;
  eng.onChange(function(a, d) { action = a; });
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(action === 'ADDED', 'ADDED 알림');
  eng.update(d.id, { geometry: { width: 5000, length: 4000 } });
  assert(action === 'UPDATED', 'UPDATED 알림');
  eng.remove(d.id);
  assert(action === 'REMOVED', 'REMOVED 알림');
})();

console.log('[PASS] DrawingEngine (7/7)');
```

### 3-3. 검증

```bash
node modules-html/cad/__tests__/DrawingEngine.test.cjs
# 기대: [PASS] DrawingEngine (7/7)
```

---

## 작업 4: CADBus — 견적 모듈과 통신

### 4-1. modules-html/cad/src/core/CADBus.cjs

```javascript
// ECOREAN BOC v5.6 — CADBus
// CAD 모듈과 견적 모듈 사이의 이벤트 통신
// CoreBus 위에 얇은 래퍼

const { coreBus } = require('../../../../shell/src/core-bus/CoreBus.cjs');
const { computeAreaSqm } = require('./DrawingModel.cjs');

const EVENTS = {
  CAD_INIT:        'CAD_INIT',         // G4 → CAD: 평형 프리셋 자동 배치
  SPACE_UPDATED:   'SPACE_UPDATED',    // CAD → 견적: 공간 변경
  CAD_DRAWING_ADDED:   'CAD_DRAWING_ADDED',
  CAD_DRAWING_UPDATED: 'CAD_DRAWING_UPDATED',
  CAD_DRAWING_REMOVED: 'CAD_DRAWING_REMOVED'
};

// CAD 모듈에서 견적으로 공간 변경 발행
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

// 견적 모듈에서 CAD 초기화 요청 수신
function onCADInit(handler) {
  coreBus.on(EVENTS.CAD_INIT, handler);
}

// CAD drawing 변경 직접 구독
function onDrawingAdded(handler) { coreBus.on(EVENTS.CAD_DRAWING_ADDED, handler); }
function onDrawingUpdated(handler) { coreBus.on(EVENTS.CAD_DRAWING_UPDATED, handler); }
function onDrawingRemoved(handler) { coreBus.on(EVENTS.CAD_DRAWING_REMOVED, handler); }

module.exports = {
  EVENTS: EVENTS,
  publishSpaceUpdated: publishSpaceUpdated,
  onCADInit: onCADInit,
  onDrawingAdded: onDrawingAdded,
  onDrawingUpdated: onDrawingUpdated,
  onDrawingRemoved: onDrawingRemoved
};
```

### 4-2. modules-html/cad/__tests__/CADBus.test.cjs

```javascript
const { coreBus, CoreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
const { EVENTS, publishSpaceUpdated } = require('../src/core/CADBus.cjs');
const { createRectSpace } = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: EVENTS 정의
(function() {
  assert(EVENTS.CAD_INIT === 'CAD_INIT', 'CAD_INIT');
  assert(EVENTS.SPACE_UPDATED === 'SPACE_UPDATED', 'SPACE_UPDATED');
})();

// Test 2: SPACE_UPDATED 발행 시 면적 자동 계산
(function() {
  let received = null;
  coreBus.on(EVENTS.SPACE_UPDATED, function(p) { received = p; });

  const d = createRectSpace({ spaceId: 's1', width: 5000, length: 4000 });
  publishSpaceUpdated(d);

  assert(received !== null, 'SPACE_UPDATED 수신');
  assert(received.spaceId === 's1', 'spaceId');
  assert(received.geometry.area_sqm === 20, '면적 20㎡');
  assert(received.tenantId === 'HQ', 'tenantId');
})();

console.log('[PASS] CADBus (2/2)');
```

### 4-3. 검증

```bash
node modules-html/cad/__tests__/CADBus.test.cjs
# 기대: [PASS] CADBus (2/2)
```

---

## 작업 5: L1 Floorplan 레이어 (첫 활성 레이어)

### 5-1. modules-html/cad/src/layers/L1_Floorplan.cjs

```javascript
// ECOREAN BOC v5.6 — L1 Floorplan Layer
// 평면도 레이어 — Konva.js (브라우저 환경)
// 현재 .cjs는 로직만, 실제 Konva 렌더는 브라우저 HTML에서 호출

const { DrawingEngine } = require('../core/DrawingEngine.cjs');
const { LAYERS, createRectSpace } = require('../core/DrawingModel.cjs');

class FloorplanEngine extends DrawingEngine {
  constructor(opts) {
    super(opts);
    this.layer = LAYERS.L1;
    this.containerEl = opts.containerEl || null;
    this.konvaStage = null;
    this.konvaLayer = null;
  }

  // 브라우저에서만 호출
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
        x: d.geometry.x / 10,           // mm → 화면 px (스케일 1:10)
        y: d.geometry.y / 10,
        width: d.geometry.width / 10,
        height: d.geometry.length / 10,
        fill: d.style.fillColor,
        stroke: d.style.strokeColor,
        strokeWidth: d.style.strokeWidth,
        draggable: true,
        id: d.id
      });

      // 드래그 종료 시 좌표 갱신
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

      // 라벨
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

module.exports = { FloorplanEngine: FloorplanEngine };
```

### 5-2. modules-html/cad/__tests__/L1_Floorplan.test.cjs

```javascript
const { FloorplanEngine } = require('../src/layers/L1_Floorplan.cjs');
const { createRectSpace } = require('../src/core/DrawingModel.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 인스턴스화
(function() {
  const eng = new FloorplanEngine({});
  assert(eng.layer === 'floorplan', 'layer L1');
})();

// Test 2: Node 환경에서 init은 스킵
(function() {
  const eng = new FloorplanEngine({});
  eng.init();
  assert(eng.initialized === true, 'init Node 스킵');
})();

// Test 3: drawing 추가 후 getByLayer
(function() {
  const eng = new FloorplanEngine({});
  const d = createRectSpace({ spaceId: 's1' });
  eng.add(d);
  assert(eng.getByLayer('floorplan').length === 1, 'L1 1건');
})();

// Test 4: render는 Node 환경에서 스킵
(function() {
  const eng = new FloorplanEngine({});
  eng.add(createRectSpace({ spaceId: 's1' }));
  // throw 없이 통과
  eng.render();
  assert(true, 'render Node 안전');
})();

// Test 5: destroy
(function() {
  const eng = new FloorplanEngine({});
  eng.destroy();
  assert(eng.initialized === false, 'destroy 후 false');
})();

console.log('[PASS] L1_Floorplan (5/5)');
```

### 5-3. 검증

```bash
node modules-html/cad/__tests__/L1_Floorplan.test.cjs
# 기대: [PASS] L1_Floorplan (5/5)
```

---

## 작업 6: drawings 테이블 마이그레이션

### 6-1. db/migrations/v5.6/001_drawings_up.sql

```sql
-- ECOREAN BOC v5.6 — drawings 테이블 신설
-- 100배 확장 호환: tenant_id + version + layer + geometry_json
-- rollback: 001_drawings_down.sql

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',
  version TEXT NOT NULL DEFAULT '1.0.0',
  layer TEXT NOT NULL,                    -- floorplan/specification/...
  geometry_type TEXT NOT NULL,            -- rect/polygon/circle/...
  geometry_json TEXT NOT NULL,            -- {x, y, width, length} 등
  style_json TEXT,                        -- {fillColor, strokeColor, ...}
  metadata_json TEXT,                     -- {typeKey, ...}
  dxf_blob_path TEXT,                     -- L6 외부 파일 경로 (자리)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (layer IN ('floorplan','specification','construction','elevation','rendering_3d','dxf','bim_ifc'))
);

CREATE INDEX IF NOT EXISTS idx_drawings_space ON drawings(space_id);
CREATE INDEX IF NOT EXISTS idx_drawings_tenant ON drawings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drawings_layer ON drawings(layer);

COMMIT;
```

### 6-2. db/migrations/v5.6/001_drawings_down.sql

```sql
-- v5.6 → v5.5 롤백
BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_drawings_layer;
DROP INDEX IF EXISTS idx_drawings_tenant;
DROP INDEX IF EXISTS idx_drawings_space;
DROP TABLE IF EXISTS drawings;
COMMIT;
```

### 6-3. scripts/migrate_v5.6_drawings.cjs

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'ecorean-boc.db');
const UP_SQL = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '001_drawings_up.sql');
const DOWN_SQL = path.join(__dirname, '..', 'db', 'migrations', 'v5.6', '001_drawings_down.sql');

const cmd = process.argv[2] || 'up';
const sqlFile = cmd === 'down' ? DOWN_SQL : UP_SQL;

const db = new Database(DB_PATH);
const sql = fs.readFileSync(sqlFile, 'utf-8');
db.exec(sql);

// 검증
const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drawings'").get();
if (cmd === 'up') {
  if (!row) { console.error('[FAIL] drawings 테이블 미생성'); process.exit(1); }
  console.log('[PASS] drawings 테이블 생성');
  const cnt = db.prepare("SELECT COUNT(*) as c FROM drawings").get();
  console.log('  현재 rows: ' + cnt.c);
} else {
  if (row) { console.error('[FAIL] drawings 테이블 미삭제'); process.exit(1); }
  console.log('[PASS] drawings 테이블 삭제');
}
db.close();
```

### 6-4. 실행 + 검증

```bash
# 사전 백업 확인
ls -la ecorean-boc.db.bak.week1

# UP 실행
node scripts/migrate_v5.6_drawings.cjs up
# 기대: [PASS] drawings 테이블 생성

# 9탭 회귀 (영향 0 확인)
node test-engine.js
# 기대: 5/5 PASS (회귀 0)

# DOWN 검증 (롤백 가능 확인 후 다시 UP)
# 본 단계는 dev 환경에서만, prod에서는 skip
# node scripts/migrate_v5.6_drawings.cjs down
# node scripts/migrate_v5.6_drawings.cjs up
```

---

## 작업 7: 통합 테스트 — Phase 3-B Gate Test

```bash
# v5.6 신규 컴포넌트
node modules-html/cad/__tests__/DrawingModel.test.cjs       # 9/9
node modules-html/cad/__tests__/DrawingEngine.test.cjs      # 7/7
node modules-html/cad/__tests__/CADBus.test.cjs             # 2/2
node modules-html/cad/__tests__/L1_Floorplan.test.cjs       # 5/5

# Week 1 회귀
node shell/src/core-bus/__tests__/CoreBus.test.cjs           # 7/7
node shell/src/core-bus/__tests__/schemas.test.cjs           # 5/5
node shell/src/feature-flags/__tests__/flags.test.cjs        # 6/6
node scripts/generate-from-graph.js                          # PASS

# 9탭 회귀
node test-engine.js                                          # 5/5

# 모두 PASS면 PHASE_3B_COMPLETE 활성화
```

### 7-1. PHASE_3B_COMPLETE 플래그 활성화

`shell/src/feature-flags/flags.cjs`의 `PHASE_3B_COMPLETE: false` → `true`.

### 7-2. flags 테스트도 갱신

`shell/src/feature-flags/__tests__/flags.test.cjs`에서 `PHASE_3B_COMPLETE` 검증 추가:

```javascript
// 기존 Test 1에 추가
assert(isEnabled('PHASE_3B_COMPLETE') === true, 'PHASE_3B_COMPLETE Week2 완료 true');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
# 기대: [PASS] feature-flags (6/6)
```

---

## 작업 8: 커밋 (단일 책임 원칙, 4개 분리)

```bash
# 커밋 1: Drawing 데이터 모델 + Engine 추상
git add modules-html/cad/src/core/DrawingModel.cjs modules-html/cad/src/core/DrawingEngine.cjs modules-html/cad/__tests__/DrawingModel.test.cjs modules-html/cad/__tests__/DrawingEngine.test.cjs
git commit -m "feat(v5.6/cad): Drawing 데이터 모델 + DrawingEngine 추상 클래스 (16/16 PASS)

- DRAWING_MODEL_VERSION 1.0.0
- 7 레이어 (L1~L7) 정의
- 5 geometry 타입
- tenant_id + version 컬럼 (멀티테넌시 + 마이그레이션 호환)
- DrawingEngine 추상 (라이브러리 격리)
- DrawingModel 9/9 + DrawingEngine 7/7 PASS"

# 커밋 2: CADBus + L1 Floorplan
git add modules-html/cad/src/core/CADBus.cjs modules-html/cad/src/layers/L1_Floorplan.cjs modules-html/cad/__tests__/CADBus.test.cjs modules-html/cad/__tests__/L1_Floorplan.test.cjs
git commit -m "feat(v5.6/cad): CADBus 이벤트 + L1 Floorplan 레이어 (Konva.js)

- CADBus.publishSpaceUpdated → 견적 모듈 자동 갱신
- SPACE_UPDATED 면적 자동 계산
- FloorplanEngine — Konva.js 기반 L1 평면도
- Node 환경에서 init/render 스킵 (테스트 안전)
- CADBus 2/2 + L1_Floorplan 5/5 PASS"

# 커밋 3: drawings 테이블 마이그레이션
git add db/migrations/v5.6/ scripts/migrate_v5.6_drawings.cjs
git commit -m "feat(v5.6/db): drawings 테이블 신설 (멀티테넌시 + 7 레이어 + rollback SQL)

- 001_drawings_up.sql / 001_drawings_down.sql 쌍
- tenant_id + version + layer + geometry_json
- 3 인덱스 (space, tenant, layer)
- migrate 스크립트 + 자동 검증"

# 커밋 4: PHASE_3B_COMPLETE 활성화
git add shell/src/feature-flags/
git commit -m "feat(v5.6/phase-3b): Phase 3 Week 2 완료 — PHASE_3B_COMPLETE = true (모든 게이트 테스트 통과)"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 3 Week 2 완료 (Phase 3-B CAD 단독 모듈 분리)

[신규 모듈]
- modules-html/cad/src/core/DrawingModel.cjs
- modules-html/cad/src/core/DrawingEngine.cjs
- modules-html/cad/src/core/CADBus.cjs
- modules-html/cad/src/layers/L1_Floorplan.cjs
- db/migrations/v5.6/001_drawings_up.sql + down.sql
- scripts/migrate_v5.6_drawings.cjs

[테스트 결과]
- DrawingModel:    9/9 PASS
- DrawingEngine:   7/7 PASS
- CADBus:          2/2 PASS
- L1_Floorplan:    5/5 PASS
- Week 1 회귀:     PASS
- test-engine:     5/5 PASS (회귀 0)

[DB]
- drawings 테이블 생성 (rollback 가능)
- 기존 9탭 영향 0

[커밋]
- DrawingModel + Engine
- CADBus + L1 Floorplan
- drawings 마이그레이션
- PHASE_3B_COMPLETE = true

[다음 주]
Phase 3 Week 3 (3-C): 5단 게이트 분리 (g1~g5 패키지화)
- @ecorean/gate-type, gate-concept, gate-section, gate-cad, gate-material
- 각 게이트 lock() 메커니즘
- Contract Test
- 5분 시나리오 E2E
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22 섹션 / 23 공간 / 12 컨셉 / 6 주거형태 / 5 평형 변경
- 기존 13 엔진 시그니처 변경
- 기존 미니 CAD 코드 삭제 (Feature Flag로 보호)
- USE_CAD_MODULE = true (Week 2에서는 false 유지, estimate 통합은 Week 4 이후)

---

## 위기 대응

| 상황 | 즉시 대응 |
|---|---|
| 9탭 회귀 발생 | revert + 분석 |
| Konva 의존성 미설치 | 로직만 .cjs로, 브라우저 HTML은 Week 5에 추가 |
| drawings 테이블 충돌 | down SQL로 즉시 롤백 |
| CADBus가 CoreBus 못 찾음 | 경로 확인 (../../../../shell/src/core-bus/CoreBus.cjs) |

---

**문서 끝.**
**즉시 시작:** 작업 1(디렉토리) → 2(DrawingModel) → 3(Engine) → 4(CADBus) → 5(L1) → 6(DB 마이그레이션) → 7(통합) → 8(커밋). 각 단계 검증 → 다음.
