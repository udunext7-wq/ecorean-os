# transform-kpi-canvas.py
# 1. KPI 헤더 카드형(해결안 C) 업그레이드
# 2. STEP 2 Canvas 평면도 에디터 삽입

import re, sys

SRC = 'ECOREAN_BOC_v1.html'
with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

# ──────────────────────────────────────────────────────────────
# 1. KPI CSS 업그레이드 (세로구분선 + 색상분리 + 카드형)
# ──────────────────────────────────────────────────────────────
OLD_KPI_CSS = """.hkpis     { gap: 8px !important }
.hkpi      { padding: 8px 20px !important; min-width: 110px !important }
.hkpiv     { font-size: 22px !important; font-weight: 700 !important }
.hkpil     { font-size: 10px !important }"""

NEW_KPI_CSS = """.hkpis     {
  gap: 0 !important;
  border: 1px solid rgba(201,168,76,.2);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(3,3,5,.6);
}
.hkpi      {
  padding: 7px 22px !important;
  min-width: 120px !important;
  border-radius: 0 !important;
  border: none !important;
  border-right: 1px solid rgba(201,168,76,.15) !important;
  background: transparent !important;
  position: relative;
}
.hkpi:last-child { border-right: none !important }
.hkpi:hover { background: rgba(201,168,76,.06) !important }
.hkpiv     { font-size: 20px !important; font-weight: 700 !important; font-family: var(--font-mono) !important }
.hkpil     { font-size: 9.5px !important; letter-spacing: .1em !important }
/* 색상 분리 */
.hkpi:nth-child(1) .hkpiv { color: var(--gold-bright) !important }
.hkpi:nth-child(2) .hkpiv { color: #e8e8f0 !important }
.hkpi:nth-child(3) .hkpiv { color: #e8e8f0 !important }
.hkpi:nth-child(4) .hkpiv { color: var(--red) !important }"""

if OLD_KPI_CSS in html:
    html = html.replace(OLD_KPI_CSS, NEW_KPI_CSS)
    print('[1] KPI CSS 업그레이드 완료')
else:
    print('[1] KPI CSS: 기존 블록 없음 - CSS append')
    # 사이즈 override 블록 끝에 추가
    html = html.replace(
        '.hkpil     { font-size: 10px !important }',
        '.hkpil     { font-size: 10px !important }\n' + NEW_KPI_CSS
    )

# ──────────────────────────────────────────────────────────────
# 2. Canvas 평면도 에디터 CSS
# ──────────────────────────────────────────────────────────────
CANVAS_CSS = """
/* ── Floor Plan Editor ──────────────────────────────────── */
#fp-editor {
  background: rgba(7,7,15,.98);
  border: 1px solid rgba(201,168,76,.2);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}
#fp-toolbar {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 12px;
  background: rgba(3,3,5,.8);
  border-bottom: 1px solid rgba(201,168,76,.15);
  flex-wrap: wrap;
}
.fp-tool-group {
  display: flex; gap: 3px; align-items: center;
}
.fp-sep {
  width: 1px; height: 24px; background: rgba(201,168,76,.2); margin: 0 6px;
}
.fp-btn {
  padding: 5px 11px; border-radius: 6px; border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.05); color: #aaa;
  font-size: 10.5px; cursor: pointer; transition: all .15s;
  white-space: nowrap; font-family: var(--font-ui);
}
.fp-btn:hover { background: rgba(201,168,76,.12); color: var(--gold); border-color: rgba(201,168,76,.3) }
.fp-btn.active { background: rgba(201,168,76,.18); color: var(--gold-bright); border-color: rgba(201,168,76,.5) }
.fp-btn.accent { background: rgba(201,168,76,.25); color: var(--gold-bright); border-color: var(--gold) }
#fp-canvas-wrap {
  display: flex; position: relative;
}
#fp-canvas {
  display: block; cursor: crosshair;
  flex: 1;
}
#fp-info-panel {
  width: 180px; flex-shrink: 0;
  background: rgba(3,3,5,.9);
  border-left: 1px solid rgba(201,168,76,.15);
  padding: 12px; font-size: 10.5px; color: #aaa;
  overflow-y: auto; max-height: 600px;
}
.fp-info-title { color: var(--gold); font-size: 11px; font-weight: 700; margin-bottom: 8px; letter-spacing: .08em }
.fp-info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
.fp-info-key { color: #666 }
.fp-info-val { color: #ddd; font-family: var(--font-mono) }
#fp-scale-bar {
  position: absolute; bottom: 10px; left: 12px;
  display: flex; align-items: center; gap: 6px;
  font-size: 9px; color: rgba(201,168,76,.7); pointer-events: none;
}
.fp-scale-line {
  width: 60px; height: 3px;
  background: rgba(201,168,76,.6);
  border-radius: 2px;
}
"""

# </style> 바로 앞에 CSS 삽입
html = html.replace('</style>\n</head>', CANVAS_CSS + '\n</style>\n</head>', 1)
print('[2] Canvas CSS 삽입 완료')

# ──────────────────────────────────────────────────────────────
# 3. STEP 2 HTML: Canvas 에디터 삽입 (기존 카드 앞에)
# ──────────────────────────────────────────────────────────────
CANVAS_HTML = """
  <!-- ══ 평면도 에디터 ══ -->
  <div id="fp-editor">
    <div id="fp-toolbar">
      <div class="fp-tool-group">
        <button class="fp-btn active" id="fp-tool-select" onclick="fpSetTool('select')" title="선택·이동">선택</button>
        <button class="fp-btn" id="fp-tool-delete" onclick="fpSetTool('delete')" title="선택 후 Delete">삭제</button>
      </div>
      <div class="fp-sep"></div>
      <div class="fp-tool-group">
        <button class="fp-btn" id="fp-tool-door-swing" onclick="fpSetTool('door_swing')">여닫이문</button>
        <button class="fp-btn" id="fp-tool-door-double" onclick="fpSetTool('door_double')">쌍여닫이</button>
        <button class="fp-btn" id="fp-tool-door-slide" onclick="fpSetTool('door_slide')">미서기문</button>
        <button class="fp-btn" id="fp-tool-door-fold" onclick="fpSetTool('door_fold')">폴딩도어</button>
      </div>
      <div class="fp-sep"></div>
      <div class="fp-tool-group">
        <button class="fp-btn" id="fp-tool-win-slide" onclick="fpSetTool('win_slide')">미서기창</button>
        <button class="fp-btn" id="fp-tool-win-swing" onclick="fpSetTool('win_swing')">여닫이창</button>
        <button class="fp-btn" id="fp-tool-win-double" onclick="fpSetTool('win_double')">이중창</button>
        <button class="fp-btn" id="fp-tool-win-fixed" onclick="fpSetTool('win_fixed')">고정창</button>
      </div>
      <div class="fp-sep"></div>
      <div class="fp-tool-group">
        <button class="fp-btn" id="fp-dim-toggle" onclick="fpToggleDim()" title="치수선 표시">치수ON</button>
        <button class="fp-btn active" id="fp-grid-toggle" onclick="fpToggleGrid()" title="그리드 표시">격자ON</button>
        <button class="fp-btn" id="fp-snap-toggle" onclick="fpToggleSnap()" title="스냅">스냅ON</button>
      </div>
      <div class="fp-sep"></div>
      <div class="fp-tool-group">
        <button class="fp-btn" onclick="fpSavePNG()" title="PNG 내보내기">PNG</button>
        <button class="fp-btn" onclick="fpResetView()" title="뷰 초기화">리셋뷰</button>
        <button class="fp-btn accent" onclick="fpApplyToEstimate()" title="견적에 반영">견적 반영</button>
      </div>
    </div>
    <div id="fp-canvas-wrap">
      <canvas id="fp-canvas" width="1200" height="600"></canvas>
      <div id="fp-info-panel">
        <div class="fp-info-title">INFO</div>
        <div id="fp-info-content" style="color:#555;font-size:10px">공간을 선택하면<br>정보가 표시됩니다.</div>
      </div>
      <div id="fp-scale-bar">
        <div class="fp-scale-line"></div>
        <span id="fp-scale-label">1m</span>
      </div>
    </div>
  </div>

"""

# STEP 2 page1 내부 첫 번째 카드(공간추가) 앞에 삽입
OLD_STEP2_CARD = '  <div class="card">\n    <div class="card-title">+ 공간 추가</div>'
if OLD_STEP2_CARD in html:
    html = html.replace(OLD_STEP2_CARD, CANVAS_HTML + OLD_STEP2_CARD, 1)
    print('[3] Canvas HTML 삽입 완료')
else:
    print('[3] WARN: STEP2 카드 앵커 없음')

# ──────────────────────────────────────────────────────────────
# 4. Canvas JS 삽입 (2번째 </script> 앞에)
# ──────────────────────────────────────────────────────────────
CANVAS_JS = r"""
// ════════════════════════════════════════════════════════════════
// FLOOR PLAN EDITOR — Canvas 2D
// ════════════════════════════════════════════════════════════════
(function(){
const SCALE = 60;      // 1m = 60px
const SNAP_D = 12;
const ROOM_COLORS = {
  living:'rgba(40,80,200,0.28)', bedroom:'rgba(120,40,200,0.28)',
  kitchen:'rgba(200,110,20,0.28)', bathroom:'rgba(20,160,80,0.28)',
  balcony:'rgba(20,160,160,0.28)', corridor:'rgba(100,100,110,0.28)',
  stairs:'rgba(80,80,80,0.28)', attic:'rgba(160,140,80,0.28)',
  utility:'rgba(60,120,140,0.28)'
};

const FP = {
  rooms: [],      // {id,name,type,x,y,w,h}  (canvas px)
  doors: [],      // {id,type,roomId,wall,pos,dir,size}
  windows: [],    // {id,type,roomId,wall,pos,size}
  sel: null,      // selected id
  tool: 'select',
  showDim: false,
  showGrid: true,
  snapOn: true,
  view: {ox:40, oy:40, zoom:1},
  drag: null,     // {id, startX, startY, origX, origY}
  pan:  null,     // {startX, startY, origOx, origOy}
};

let fpCanvas, fpCtx;

function fpInit(){
  fpCanvas = document.getElementById('fp-canvas');
  if(!fpCanvas) return;
  fpCtx = fpCanvas.getContext('2d');
  resizeFpCanvas();
  window.addEventListener('resize', resizeFpCanvas);
  fpCanvas.addEventListener('mousedown', fpOnMouseDown);
  fpCanvas.addEventListener('mousemove', fpOnMouseMove);
  fpCanvas.addEventListener('mouseup',   fpOnMouseUp);
  fpCanvas.addEventListener('wheel',     fpOnWheel, {passive:false});
  fpCanvas.addEventListener('dblclick',  fpOnDblClick);
  fpCanvas.addEventListener('contextmenu', e=>{ e.preventDefault(); fpStartPan(e); });
  fpDraw();
  fpUpdateInfoPanel(null);
  syncFpFromSpaces();
}

function resizeFpCanvas(){
  if(!fpCanvas) return;
  const wrap = document.getElementById('fp-canvas-wrap');
  if(!wrap) return;
  const infoW = 180;
  const w = Math.max(600, wrap.clientWidth - infoW);
  fpCanvas.width = w;
  fpCanvas.height = 600;
  fpDraw();
}

// ── Draw ────────────────────────────────────────────────────
function fpDraw(){
  if(!fpCtx) return;
  const c = fpCtx;
  const W = fpCanvas.width, H = fpCanvas.height;
  const {ox, oy, zoom} = FP.view;

  c.clearRect(0,0,W,H);
  c.fillStyle = '#07070F';
  c.fillRect(0,0,W,H);

  c.save();
  c.translate(ox, oy);
  c.scale(zoom, zoom);

  if(FP.showGrid) fpDrawGrid(c, W, H, ox, oy, zoom);

  // rooms
  FP.rooms.forEach(r => fpDrawRoom(c, r));

  // shared walls
  fpDrawSharedWalls(c);

  // doors
  FP.doors.forEach(d => fpDrawDoor(c, d));

  // windows
  FP.windows.forEach(w => fpDrawWindow(c, w));

  // dimensions
  if(FP.showDim){
    FP.rooms.forEach(r => { if(r.id===FP.sel) fpDrawDimensions(c, r); });
  }

  c.restore();

  // scale bar
  const scaleLen = SCALE * zoom;
  document.querySelector('.fp-scale-line').style.width = scaleLen + 'px';
  document.getElementById('fp-scale-label').textContent = '1m';
}

function fpDrawGrid(c, W, H, ox, oy, zoom){
  const step10cm = SCALE * zoom * 0.1;
  const step1m   = SCALE * zoom;
  if(step10cm < 4) return;

  const startX = -((ox % step1m) / zoom);
  const startY = -((oy % step1m) / zoom);
  const endX   = (W - ox) / zoom + SCALE;
  const endY   = (H - oy) / zoom + SCALE;

  // 10cm minor grid
  c.strokeStyle = 'rgba(201,168,76,0.05)';
  c.lineWidth   = 0.5 / zoom;
  c.beginPath();
  for(let x = startX; x <= endX; x += SCALE*0.1){
    c.moveTo(x, startY); c.lineTo(x, endY);
  }
  for(let y = startY; y <= endY; y += SCALE*0.1){
    c.moveTo(startX, y); c.lineTo(endX, y);
  }
  c.stroke();

  // 1m major grid
  c.strokeStyle = 'rgba(201,168,76,0.12)';
  c.lineWidth   = 1 / zoom;
  c.beginPath();
  for(let x = startX; x <= endX; x += SCALE){
    c.moveTo(x, startY); c.lineTo(x, endY);
  }
  for(let y = startY; y <= endY; y += SCALE){
    c.moveTo(startX, y); c.lineTo(endX, y);
  }
  c.stroke();
}

function fpDrawRoom(c, r){
  const isSel = (r.id === FP.sel);
  c.fillStyle   = ROOM_COLORS[r.type] || 'rgba(100,100,100,0.25)';
  c.fillRect(r.x, r.y, r.w, r.h);

  c.strokeStyle = isSel ? '#C9A84C' : 'rgba(255,255,255,0.55)';
  c.lineWidth   = isSel ? 2.5 : 1.5;
  c.strokeRect(r.x, r.y, r.w, r.h);

  // label
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.font = `bold ${Math.max(10, Math.min(14, r.w/8))}px Inter, sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(r.name.substring(0,6), r.x+r.w/2, r.y+r.h/2 - 6);

  // area
  const areaM2 = (r.w/SCALE * r.h/SCALE).toFixed(1);
  c.font = `${Math.max(8, Math.min(11, r.w/10))}px JetBrains Mono, monospace`;
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillText(areaM2+'㎡', r.x+r.w/2, r.y+r.h/2 + 9);
}

function fpDrawSharedWalls(c){
  const rooms = FP.rooms;
  for(let i=0;i<rooms.length;i++){
    for(let j=i+1;j<rooms.length;j++){
      const a=rooms[i], b=rooms[j];
      // check shared vertical wall
      if(Math.abs((a.x+a.w)-b.x)<3){
        const top=Math.max(a.y,b.y), bot=Math.min(a.y+a.h,b.y+b.h);
        if(bot>top){
          c.strokeStyle='rgba(255,255,255,0.9)'; c.lineWidth=3;
          c.beginPath(); c.moveTo(a.x+a.w,top); c.lineTo(a.x+a.w,bot); c.stroke();
        }
      }
      if(Math.abs((b.x+b.w)-a.x)<3){
        const top=Math.max(a.y,b.y), bot=Math.min(a.y+a.h,b.y+b.h);
        if(bot>top){
          c.strokeStyle='rgba(255,255,255,0.9)'; c.lineWidth=3;
          c.beginPath(); c.moveTo(a.x,top); c.lineTo(a.x,bot); c.stroke();
        }
      }
      // check shared horizontal wall
      if(Math.abs((a.y+a.h)-b.y)<3){
        const lft=Math.max(a.x,b.x), rgt=Math.min(a.x+a.w,b.x+b.w);
        if(rgt>lft){
          c.strokeStyle='rgba(255,255,255,0.9)'; c.lineWidth=3;
          c.beginPath(); c.moveTo(lft,a.y+a.h); c.lineTo(rgt,a.y+a.h); c.stroke();
        }
      }
      if(Math.abs((b.y+b.h)-a.y)<3){
        const lft=Math.max(a.x,b.x), rgt=Math.min(a.x+a.w,b.x+b.w);
        if(rgt>lft){
          c.strokeStyle='rgba(255,255,255,0.9)'; c.lineWidth=3;
          c.beginPath(); c.moveTo(lft,a.y); c.lineTo(rgt,a.y); c.stroke();
        }
      }
    }
  }
}

function fpDrawDoor(c, d){
  const r = FP.rooms.find(rm=>rm.id===d.roomId); if(!r) return;
  const sz = d.size || 54; // px
  let x, y;
  if(d.wall==='top')    { x=r.x+d.pos; y=r.y; }
  else if(d.wall==='bottom') { x=r.x+d.pos; y=r.y+r.h; }
  else if(d.wall==='left')   { x=r.x;     y=r.y+d.pos; }
  else                       { x=r.x+r.w; y=r.y+d.pos; }

  c.save();
  c.strokeStyle='#00AAFF'; c.lineWidth=2;
  const isH = (d.wall==='top'||d.wall==='bottom');

  if(d.type==='door_swing'){
    c.beginPath();
    if(isH){ c.moveTo(x,y); c.lineTo(x+sz,y); } else { c.moveTo(x,y); c.lineTo(x,y+sz); }
    c.stroke();
    c.beginPath();
    const dir = d.dir||1;
    if(isH){
      c.arc(x, y, sz, 0, Math.PI/2 * dir);
    } else {
      c.arc(x, y, sz, Math.PI*1.5, Math.PI*2);
    }
    c.stroke();
  } else if(d.type==='door_double'){
    c.beginPath();
    if(isH){
      c.moveTo(x,y); c.lineTo(x+sz*2,y);
      c.moveTo(x,y); c.arc(x, y, sz, 0, Math.PI/2);
      c.moveTo(x+sz*2,y); c.arc(x+sz*2, y, sz, Math.PI, Math.PI/2, true);
    } else {
      c.moveTo(x,y); c.lineTo(x,y+sz*2);
    }
    c.stroke();
  } else if(d.type==='door_slide'){
    c.strokeStyle='#00AAFF';
    if(isH){
      c.strokeRect(x, y-4, sz/2, 8);
      c.strokeRect(x+sz/2-4, y-4, sz/2, 8);
    } else {
      c.strokeRect(x-4, y, 8, sz/2);
      c.strokeRect(x-4, y+sz/2-4, 8, sz/2);
    }
  } else if(d.type==='door_fold'){
    c.beginPath();
    const segs=4;
    if(isH){
      for(let i=0;i<segs;i++){
        const sx=x+i*(sz/segs), ex=x+(i+1)*(sz/segs), my=y+(i%2===0?-10:10);
        c.moveTo(sx,y); c.lineTo((sx+ex)/2, my); c.lineTo(ex,y);
      }
    } else {
      for(let i=0;i<segs;i++){
        const sy=y+i*(sz/segs), ey=y+(i+1)*(sz/segs), mx=x+(i%2===0?-10:10);
        c.moveTo(x,sy); c.lineTo(mx,(sy+ey)/2); c.lineTo(x,ey);
      }
    }
    c.stroke();
  }
  c.restore();
}

function fpDrawWindow(c, w){
  const r = FP.rooms.find(rm=>rm.id===w.roomId); if(!r) return;
  const sz = w.size || 50;
  let x, y;
  if(w.wall==='top')    { x=r.x+w.pos; y=r.y; }
  else if(w.wall==='bottom') { x=r.x+w.pos; y=r.y+r.h; }
  else if(w.wall==='left')   { x=r.x;     y=r.y+w.pos; }
  else                       { x=r.x+r.w; y=r.y+w.pos; }

  c.save();
  c.strokeStyle='#FFD700'; c.lineWidth=2;
  const isH = (w.wall==='top'||w.wall==='bottom');
  const thick = 6;

  if(w.type==='win_slide'){
    if(isH){
      c.fillStyle='rgba(0,170,255,0.12)'; c.fillRect(x,y-thick/2,sz,thick);
      c.strokeRect(x,y-thick/2,sz,thick);
      c.beginPath(); c.moveTo(x+sz/2,y-thick/2); c.lineTo(x+sz/2,y+thick/2); c.stroke();
    } else {
      c.fillStyle='rgba(0,170,255,0.12)'; c.fillRect(x-thick/2,y,thick,sz);
      c.strokeRect(x-thick/2,y,thick,sz);
      c.beginPath(); c.moveTo(x-thick/2,y+sz/2); c.lineTo(x+thick/2,y+sz/2); c.stroke();
    }
  } else if(w.type==='win_double'){
    if(isH){
      c.strokeRect(x,y-5,sz,4); c.strokeRect(x,y+1,sz,4);
    } else {
      c.strokeRect(x-5,y,4,sz); c.strokeRect(x+1,y,4,sz);
    }
  } else if(w.type==='win_fixed'){
    if(isH){
      c.strokeRect(x,y-thick/2,sz,thick);
      c.beginPath(); c.moveTo(x,y-thick/2); c.lineTo(x+sz,y+thick/2);
      c.moveTo(x+sz,y-thick/2); c.lineTo(x,y+thick/2); c.stroke();
    } else {
      c.strokeRect(x-thick/2,y,thick,sz);
      c.beginPath(); c.moveTo(x-thick/2,y); c.lineTo(x+thick/2,y+sz);
      c.moveTo(x+thick/2,y); c.lineTo(x-thick/2,y+sz); c.stroke();
    }
  } else { // win_swing default
    if(isH){
      c.strokeRect(x,y-thick/2,sz,thick);
      c.beginPath(); c.arc(x+sz/2,y,sz/2,Math.PI,0); c.stroke();
    } else {
      c.strokeRect(x-thick/2,y,thick,sz);
      c.beginPath(); c.arc(x,y+sz/2,sz/2,Math.PI*1.5,Math.PI*0.5); c.stroke();
    }
  }
  c.restore();
}

function fpDrawDimensions(c, r){
  c.save();
  c.strokeStyle = '#C9A84C'; c.fillStyle='#C9A84C';
  c.lineWidth=1; c.font='bold 10px JetBrains Mono, monospace';
  c.textAlign='center'; c.textBaseline='middle';

  const wMm = Math.round(r.w / SCALE * 1000);
  const hMm = Math.round(r.h / SCALE * 1000);
  const off = 18;

  // top dimension
  c.beginPath(); c.moveTo(r.x,r.y-off); c.lineTo(r.x+r.w,r.y-off); c.stroke();
  c.beginPath(); c.moveTo(r.x,r.y-off-5); c.lineTo(r.x,r.y-off+5); c.stroke();
  c.beginPath(); c.moveTo(r.x+r.w,r.y-off-5); c.lineTo(r.x+r.w,r.y-off+5); c.stroke();
  c.fillText(wMm+'mm', r.x+r.w/2, r.y-off-10);

  // right dimension
  c.beginPath(); c.moveTo(r.x+r.w+off,r.y); c.lineTo(r.x+r.w+off,r.y+r.h); c.stroke();
  c.beginPath(); c.moveTo(r.x+r.w+off-5,r.y); c.lineTo(r.x+r.w+off+5,r.y); c.stroke();
  c.beginPath(); c.moveTo(r.x+r.w+off-5,r.y+r.h); c.lineTo(r.x+r.w+off+5,r.y+r.h); c.stroke();
  c.save(); c.translate(r.x+r.w+off+14, r.y+r.h/2); c.rotate(-Math.PI/2);
  c.fillText(hMm+'mm', 0, 0); c.restore();

  c.restore();
}

// ── Interaction ─────────────────────────────────────────────
function toCanvas(ex, ey){
  const rect = fpCanvas.getBoundingClientRect();
  const {ox, oy, zoom} = FP.view;
  return {
    cx: (ex - rect.left - ox) / zoom,
    cy: (ey - rect.top  - oy) / zoom
  };
}

function fpHitRoom(cx, cy){
  for(let i=FP.rooms.length-1;i>=0;i--){
    const r=FP.rooms[i];
    if(cx>=r.x && cx<=r.x+r.w && cy>=r.y && cy<=r.y+r.h) return r;
  }
  return null;
}

function fpNearestWallHit(cx, cy, threshold){
  let best=null, bestD=threshold;
  FP.rooms.forEach(r=>{
    const walls=[
      {wall:'top',    dist:Math.abs(cy-r.y),      inRange:cx>=r.x&&cx<=r.x+r.w, pos:cx-r.x},
      {wall:'bottom', dist:Math.abs(cy-(r.y+r.h)), inRange:cx>=r.x&&cx<=r.x+r.w, pos:cx-r.x},
      {wall:'left',   dist:Math.abs(cx-r.x),       inRange:cy>=r.y&&cy<=r.y+r.h, pos:cy-r.y},
      {wall:'right',  dist:Math.abs(cx-(r.x+r.w)), inRange:cy>=r.y&&cy<=r.y+r.h, pos:cy-r.y},
    ];
    walls.forEach(w=>{
      if(w.inRange && w.dist<bestD){ bestD=w.dist; best={room:r, wall:w.wall, pos:w.pos}; }
    });
  });
  return best;
}

function fpSnapPos(x, y){
  if(!FP.snapOn) return {x,y};
  let sx=x, sy=y;
  FP.rooms.forEach(r=>{
    if(Math.abs(x-r.x)<SNAP_D)       sx=r.x;
    if(Math.abs(x-(r.x+r.w))<SNAP_D) sx=r.x+r.w;
    if(Math.abs(y-r.y)<SNAP_D)       sy=r.y;
    if(Math.abs(y-(r.y+r.h))<SNAP_D) sy=r.y+r.h;
  });
  return {x:sx, y:sy};
}

function fpOnMouseDown(e){
  if(e.button===2) return; // pan via contextmenu
  const {cx,cy}=toCanvas(e.clientX,e.clientY);
  const tool=FP.tool;

  if(tool==='select'){
    const hit=fpHitRoom(cx,cy);
    FP.sel = hit ? hit.id : null;
    if(hit){
      FP.drag={id:hit.id, startX:cx, startY:cy, origX:hit.x, origY:hit.y};
      fpUpdateInfoPanel(hit);
    } else { fpUpdateInfoPanel(null); }
    fpDraw(); return;
  }

  if(tool==='delete'){
    const hit=fpHitRoom(cx,cy);
    if(hit){ FP.rooms=FP.rooms.filter(r=>r.id!==hit.id); FP.sel=null; fpDraw(); } return;
  }

  // door / window placement
  const isDoor = tool.startsWith('door_');
  const isWin  = tool.startsWith('win_');
  if(isDoor||isWin){
    const hit = fpNearestWallHit(cx,cy,20);
    if(hit){
      const id = Date.now().toString(36);
      if(isDoor) FP.doors.push({id, type:tool, roomId:hit.room.id, wall:hit.wall, pos:hit.pos, dir:1, size:54});
      else        FP.windows.push({id, type:tool, roomId:hit.room.id, wall:hit.wall, pos:hit.pos, size:60});
      fpDraw();
    }
    return;
  }
}

function fpOnMouseMove(e){
  if(FP.pan){
    const dx=e.clientX-FP.pan.startX, dy=e.clientY-FP.pan.startY;
    FP.view.ox=FP.pan.origOx+dx; FP.view.oy=FP.pan.origOy+dy;
    fpDraw(); return;
  }
  if(!FP.drag) return;
  const {cx,cy}=toCanvas(e.clientX,e.clientY);
  const r=FP.rooms.find(rm=>rm.id===FP.drag.id); if(!r) return;
  const raw={x:FP.drag.origX+(cx-FP.drag.startX), y:FP.drag.origY+(cy-FP.drag.startY)};
  const snapped=fpSnapPos(raw.x, raw.y);
  r.x=snapped.x; r.y=snapped.y;
  fpDraw();
}

function fpOnMouseUp(e){
  FP.drag=null; FP.pan=null;
  fpSave();
}

function fpStartPan(e){
  FP.pan={startX:e.clientX, startY:e.clientY, origOx:FP.view.ox, origOy:FP.view.oy};
  fpCanvas.addEventListener('mousemove', fpOnMouseMove);
  window.addEventListener('mouseup', ()=>{ FP.pan=null; }, {once:true});
}

function fpOnWheel(e){
  e.preventDefault();
  const rect=fpCanvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const factor=e.deltaY<0?1.1:0.91;
  const newZoom=Math.min(4, Math.max(0.2, FP.view.zoom*factor));
  FP.view.ox = mx - (mx-FP.view.ox)*newZoom/FP.view.zoom;
  FP.view.oy = my - (my-FP.view.oy)*newZoom/FP.view.zoom;
  FP.view.zoom=newZoom;
  fpDraw();
}

function fpOnDblClick(e){
  const {cx,cy}=toCanvas(e.clientX,e.clientY);
  // delete door/window on dblclick
  const hit=fpNearestWallHit(cx,cy,16);
  if(hit){
    FP.doors=FP.doors.filter(d=>!(d.roomId===hit.room.id&&d.wall===hit.wall&&Math.abs(d.pos-hit.pos)<30));
    FP.windows=FP.windows.filter(w=>!(w.roomId===hit.room.id&&w.wall===hit.wall&&Math.abs(w.pos-hit.pos)<30));
    fpDraw();
  }
}

// ── UI actions ───────────────────────────────────────────────
window.fpSetTool = function(t){
  FP.tool=t;
  document.querySelectorAll('.fp-btn[id^=fp-tool]').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('fp-tool-'+t.replace('_','-'));
  if(el) el.classList.add('active');
  fpCanvas.style.cursor = t==='select'?'default':t==='delete'?'crosshair':'crosshair';
};
window.fpToggleDim = function(){
  FP.showDim=!FP.showDim;
  document.getElementById('fp-dim-toggle').classList.toggle('active',FP.showDim);
  fpDraw();
};
window.fpToggleGrid = function(){
  FP.showGrid=!FP.showGrid;
  document.getElementById('fp-grid-toggle').classList.toggle('active',FP.showGrid);
  fpDraw();
};
window.fpToggleSnap = function(){
  FP.snapOn=!FP.snapOn;
  document.getElementById('fp-snap-toggle').classList.toggle('active',FP.snapOn);
};
window.fpResetView = function(){
  FP.view={ox:40,oy:40,zoom:1}; fpDraw();
};
window.fpSavePNG = function(){
  fpDraw();
  const a=document.createElement('a');
  a.download='floorplan.png'; a.href=fpCanvas.toDataURL('image/png'); a.click();
};

function fpUpdateInfoPanel(room){
  const el=document.getElementById('fp-info-content'); if(!el) return;
  if(!room){ el.innerHTML='<span style="color:#444">공간을 선택하세요</span>'; return; }
  const wMm=Math.round(room.w/SCALE*1000), hMm=Math.round(room.h/SCALE*1000);
  const fa=(room.w/SCALE*room.h/SCALE).toFixed(2);
  const doors=FP.doors.filter(d=>d.roomId===room.id).length;
  const wins=FP.windows.filter(w=>w.roomId===room.id).length;
  el.innerHTML=`
    <div class="fp-info-row"><span class="fp-info-key">이름</span><span class="fp-info-val">${room.name}</span></div>
    <div class="fp-info-row"><span class="fp-info-key">유형</span><span class="fp-info-val">${room.type}</span></div>
    <hr style="border-color:rgba(201,168,76,.1);margin:6px 0">
    <div class="fp-info-row"><span class="fp-info-key">가로</span><span class="fp-info-val">${wMm}mm</span></div>
    <div class="fp-info-row"><span class="fp-info-key">세로</span><span class="fp-info-val">${hMm}mm</span></div>
    <div class="fp-info-row"><span class="fp-info-key">면적</span><span class="fp-info-val">${fa}㎡</span></div>
    <hr style="border-color:rgba(201,168,76,.1);margin:6px 0">
    <div class="fp-info-row"><span class="fp-info-key">문</span><span class="fp-info-val">${doors}개</span></div>
    <div class="fp-info-row"><span class="fp-info-key">창호</span><span class="fp-info-val">${wins}개</span></div>
  `;
}

// ── Sync S.spaces → Canvas ───────────────────────────────────
function syncFpFromSpaces(){
  if(!S || !S.spaces || !S.spaces.length) return;
  FP.rooms=[];
  let cx=0, rowH=0;
  S.spaces.forEach((sp,i)=>{
    const w=Math.round((sp.width||3000)/1000*SCALE);
    const h=Math.round((sp.length||3000)/1000*SCALE);
    if(cx+w > (fpCanvas.width-200)/FP.view.zoom){ cx=0; }
    FP.rooms.push({
      id:sp.id||'room_'+i, name:sp.name||('공간'+(i+1)),
      type:sp.type||'living', x:cx+10, y:40, w, h
    });
    cx+=w+6; rowH=Math.max(rowH,h);
  });
  fpDraw();
}

// ── Apply to Estimate ─────────────────────────────────────────
window.fpApplyToEstimate = function(){
  const updated=[];
  FP.rooms.forEach(r=>{
    const wMm=Math.round(r.w/SCALE*1000);
    const hMm=Math.round(r.h/SCALE*1000);
    const doorCnt=FP.doors.filter(d=>d.roomId===r.id).length;
    const winCnt=FP.windows.filter(w=>w.roomId===r.id).length;
    const existing=S.spaces.find(s=>(s.id||s.name)===r.id)||(S.spaces.find(s=>s.name===r.name));
    if(existing){
      existing.width=wMm; existing.length=hMm;
      if(doorCnt>0) existing.doors=Array.from({length:doorCnt},(_,i)=>existing.doors?.[i]||{w:900,h:2100});
      if(winCnt>0)  existing.windows=Array.from({length:winCnt},(_,i)=>existing.windows?.[i]||{w:1200,h:1200});
      updated.push(existing.name);
    } else {
      const newSp={
        id:r.id, name:r.name, type:r.type,
        width:wMm, length:hMm, height:2400,
        windows:Array.from({length:winCnt},()=>({w:1200,h:1200})),
        doors:Array.from({length:doorCnt},()=>({w:900,h:2100})),
        corners:4, wet:r.type==='bathroom', roof:false, floor2:false,
        tileH:2400, beamH:0
      };
      S.spaces.push(newSp); updated.push(newSp.name);
    }
  });
  renderSpaceCards(); updateBathroomScopes(); recalc();
  st('평면도 견적 반영 완료: '+updated.join(', ')+' ('+updated.length+'개)');
  fpSave();
};

// ── localStorage ─────────────────────────────────────────────
function fpSave(){
  try{ localStorage.setItem('boc_fp', JSON.stringify({rooms:FP.rooms,doors:FP.doors,windows:FP.windows})); }catch(e){}
}
function fpLoad(){
  try{
    const d=JSON.parse(localStorage.getItem('boc_fp')||'{}');
    if(d.rooms) FP.rooms=d.rooms;
    if(d.doors) FP.doors=d.doors;
    if(d.windows) FP.windows=d.windows;
  }catch(e){}
}

// ── Boot ─────────────────────────────────────────────────────
// addSpace 후 캔버스에도 공간 자동 추가
const _origAddSpace = window.addSpace;
if(typeof _origAddSpace==='function'){
  window.addSpace = function(){
    const result = _origAddSpace.apply(this, arguments);
    // 마지막으로 추가된 공간을 캔버스에 동기화
    setTimeout(()=>{
      const sp = S.spaces[S.spaces.length-1];
      if(sp && fpCanvas){
        const w=Math.round((sp.width||3000)/1000*SCALE);
        const h=Math.round((sp.length||3000)/1000*SCALE);
        let maxX = FP.rooms.reduce((m,r)=>Math.max(m,r.x+r.w),40);
        FP.rooms.push({
          id:sp.id||'room_'+Date.now().toString(36),
          name:sp.name||'공간', type:sp.type||'living',
          x:maxX+8, y:40, w, h
        });
        fpDraw();
      }
    }, 50);
    return result;
  };
}

window.addEventListener('load', ()=>{
  fpLoad();
  fpInit();
});

// STEP 2로 이동 시 캔버스 리사이즈+리드로우
const _origGoStep=window.goStep;
if(typeof _origGoStep==='function'){
  window.goStep=function(n){
    const r=_origGoStep.apply(this,arguments);
    if(n===1){ setTimeout(()=>{ resizeFpCanvas(); if(!FP.rooms.length) syncFpFromSpaces(); fpDraw(); },50); }
    return r;
  };
}

})(); // end IIFE
"""

# 2번째 </script> 직전에 삽입
# 두 번째 script 블록: </script></body></html> 또는 마지막 </script>
import re as _re
# Find last </script> before </body>
pos = html.rfind('</script>')
if pos > -1:
    html = html[:pos] + CANVAS_JS + '\n' + html[pos:]
    print('[4] Canvas JS 삽입 완료')
else:
    print('[4] WARN: </script> 없음')

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)
lines = html.count('\n') + 1
print(f'Done: {lines} lines, {len(html.encode("utf-8")):,} bytes')
