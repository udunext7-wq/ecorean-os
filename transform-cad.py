# transform-cad.py  — STEP 2 CAD Editor 완전 재구성
import re

SRC = 'ECOREAN_BOC_v1.html'
with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

# ──────────────────────────────────────────────────────────────────────
# 1. CSS
# ──────────────────────────────────────────────────────────────────────
CAD_CSS = """
/* ══ CAD EDITOR ══════════════════════════════════════════════ */
#cad-editor {
  display:flex; flex-direction:column;
  height:calc(100vh - 280px); min-height:560px;
  background:#07070F; border:1px solid rgba(201,168,76,.2);
  border-radius:12px; overflow:hidden;
}
#cad-toolbar {
  display:flex; align-items:center; gap:3px; flex-wrap:wrap;
  padding:6px 10px; background:rgba(3,3,5,.92);
  border-bottom:1px solid rgba(201,168,76,.18); flex-shrink:0;
}
.cad-tb-sep { width:1px; height:22px; background:rgba(201,168,76,.18); margin:0 4px; }
.cad-btn {
  padding:4px 11px; font-size:10.5px; border-radius:5px; cursor:pointer;
  border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04);
  color:#999; transition:all .14s; user-select:none; white-space:nowrap;
}
.cad-btn:hover { background:rgba(201,168,76,.1); color:var(--gold); border-color:rgba(201,168,76,.3); }
.cad-btn.active { background:rgba(201,168,76,.2); color:var(--gold-bright); border-color:rgba(201,168,76,.55); }
.cad-btn.accent { background:rgba(201,168,76,.28); color:#fff; border-color:var(--gold); font-weight:600; }
.cad-btn .kbd {
  display:inline-block; font-size:8.5px; padding:1px 4px; border-radius:3px;
  background:rgba(255,255,255,.08); color:#666; margin-left:4px; vertical-align:middle;
}
#cad-body { display:flex; flex:1; overflow:hidden; }
#cad-canvas-wrap { flex:1; position:relative; overflow:hidden; cursor:crosshair; }
#cad-canvas { display:block; width:100%; height:100%; }
#cad-overlay {
  position:absolute; top:6px; left:8px; pointer-events:none;
  font-size:10px; color:rgba(201,168,76,.6); font-family:var(--font-mono);
}
#cad-props {
  width:220px; flex-shrink:0; background:rgba(3,3,5,.95);
  border-left:1px solid rgba(201,168,76,.14);
  padding:12px 14px; overflow-y:auto; font-size:11px;
}
.cad-ph { color:var(--gold); font-size:10.5px; font-weight:700; letter-spacing:.1em; margin-bottom:10px; }
.cad-prow { margin-bottom:8px; }
.cad-prow label { display:block; font-size:9.5px; color:#555; margin-bottom:3px; letter-spacing:.06em; }
.cad-prow input, .cad-prow select {
  width:100%; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
  border-radius:5px; padding:5px 8px; color:#ddd; font-size:11px; font-family:var(--font-mono);
}
.cad-prow input:focus, .cad-prow select:focus {
  outline:none; border-color:rgba(201,168,76,.4); background:rgba(201,168,76,.04);
}
.cad-pval {
  font-family:var(--font-mono); color:var(--gold); font-size:12px;
  padding:4px 0; border-bottom:1px solid rgba(255,255,255,.05);
}
.cad-chk { display:flex; align-items:center; gap:6px; cursor:pointer; margin-bottom:5px; }
.cad-chk input { width:auto; }
#cad-summary {
  display:flex; align-items:center; justify-content:space-between;
  padding:8px 14px; background:rgba(3,3,5,.9);
  border-top:1px solid rgba(201,168,76,.18); flex-shrink:0; flex-wrap:wrap; gap:8px;
}
.cad-sum-item { font-size:10px; }
.cad-sum-lbl { color:#555; margin-right:4px; }
.cad-sum-val { color:var(--gold-bright); font-family:var(--font-mono); font-weight:600; }
#cad-props-empty { color:#444; font-size:10px; padding:8px 0; }
"""

# </style> 앞에 삽입
html = html.replace('</style>\n</head>', CAD_CSS + '\n</style>\n</head>', 1)
print('[1] CAD CSS OK')

# ──────────────────────────────────────────────────────────────────────
# 2. page1 전체 교체
# ──────────────────────────────────────────────────────────────────────
NEW_PAGE1 = '''\
<div class="step-page" id="page1">
<div class="page-title">STEP 2 — 평면도 CAD 에디터</div>
<div class="page-sub" style="margin-bottom:10px">R=공간 W=벽 D=문 I=창호 M=치수 E=지우개 &nbsp;|&nbsp; Shift=직교 Ctrl+Z=취소 Delete=삭제</div>

<div id="cad-editor">
  <!-- 도구바 -->
  <div id="cad-toolbar">
    <div class="cad-btn active" id="ct-select"  onclick="cadTool('select')" title="V">선택<span class="kbd">V</span></div>
    <div class="cad-btn"        id="ct-room"    onclick="cadTool('room')"   title="R">공간<span class="kbd">R</span></div>
    <div class="cad-btn"        id="ct-wall"    onclick="cadTool('wall')"   title="W">벽<span class="kbd">W</span></div>
    <div class="cad-btn"        id="ct-door"    onclick="cadTool('door')"   title="D">문<span class="kbd">D</span></div>
    <div class="cad-btn"        id="ct-window"  onclick="cadTool('window')" title="I">창호<span class="kbd">I</span></div>
    <div class="cad-btn"        id="ct-dim"     onclick="cadTool('dim')"    title="M">치수<span class="kbd">M</span></div>
    <div class="cad-btn"        id="ct-erase"   onclick="cadTool('erase')"  title="E">지우개<span class="kbd">E</span></div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn active"  id="ct-grid"   onclick="cadToggle('grid')"  >격자</div>
    <div class="cad-btn active"  id="ct-snap"   onclick="cadToggle('snap')"  >스냅</div>
    <div class="cad-btn"         id="ct-ortho"  onclick="cadToggle('ortho')" >직교</div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn" onclick="cadZoom(1.25)">줌+<span class="kbd">+</span></div>
    <div class="cad-btn" onclick="cadZoom(0.8)" >줌-<span class="kbd">-</span></div>
    <div class="cad-btn" onclick="cadFitAll()"  >전체<span class="kbd">0</span></div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn" onclick="cadExportPNG()">PNG</div>
    <div class="cad-btn" onclick="cadExportDXF()">DXF</div>
    <div class="cad-btn" onclick="cadUndo()" title="Ctrl+Z">취소<span class="kbd">^Z</span></div>
    <div class="cad-btn" onclick="cadRedo()" title="Ctrl+Y">재실행<span class="kbd">^Y</span></div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn" onclick="cadClearAll()" style="color:#ff4466">전체삭제</div>
  </div>

  <!-- 본체 -->
  <div id="cad-body">
    <div id="cad-canvas-wrap">
      <canvas id="cad-canvas"></canvas>
      <div id="cad-overlay">좌표: <span id="cad-coord">0, 0</span></div>
    </div>
    <div id="cad-props">
      <div class="cad-ph">PROPERTIES</div>
      <div id="cad-props-content"><div id="cad-props-empty">요소를 선택하세요</div></div>
    </div>
  </div>

  <!-- 하단 합계 -->
  <div id="cad-summary">
    <div style="display:flex;gap:20px;flex-wrap:wrap">
      <div class="cad-sum-item"><span class="cad-sum-lbl">바닥</span><span class="cad-sum-val" id="cs-fa">0㎡</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">벽면</span><span class="cad-sum-val" id="cs-wa">0㎡</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">창호</span><span class="cad-sum-val" id="cs-win">0EA</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">문</span><span class="cad-sum-val" id="cs-door">0EA</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">공간</span><span class="cad-sum-val" id="cs-rooms">0개</span></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn ghost" onclick="cadSyncPreview()">미리보기 동기화</button>
      <button class="btn accent" onclick="cadApply()">견적 반영 →</button>
    </div>
  </div>
</div>

<!-- 숨김 공간 목록 (렌더링용) -->
<div id="space-cards-wrap" style="display:none">
  <div class="space-grid" id="space-cards"></div>
</div>

<!-- 면적 합산 (스텝바 업데이트용) -->
<div style="display:none">
  <span id="tot-fa">0 ㎡</span><span id="tot-wa">0 ㎡</span><span id="tot-ca">0 ㎡</span>
  <span id="tot-pr">0 m</span><span id="tot-win">0 EA</span><span id="tot-door">0 EA</span>
  <span id="tot-cor">0 개</span><span id="tot-wet">0 개</span>
</div>
</div>
'''

# 정규식으로 page1 전체 교체
p1_match = re.search(r'<div class="step-page" id="page1">.*?^</div>', html, re.DOTALL | re.MULTILINE)
if p1_match:
    html = html[:p1_match.start()] + NEW_PAGE1 + html[p1_match.end():]
    print('[2] page1 교체 OK')
else:
    print('[2] WARN: page1 패턴 없음')

# ──────────────────────────────────────────────────────────────────────
# 3. 이전 Canvas JS (fp-editor) 제거 (중복 방지)
# ──────────────────────────────────────────────────────────────────────
# IIFE 패턴으로 감싼 이전 fp-editor JS 제거
old_fp = re.search(r'// ={5,}\s*\n// FLOOR PLAN EDITOR.*?\}\)\(\); // end IIFE\s*\n', html, re.DOTALL)
if old_fp:
    html = html[:old_fp.start()] + html[old_fp.end():]
    print('[3] 이전 fp-editor JS 제거 OK')
else:
    print('[3] 이전 fp-editor JS 없음 (이미 없거나 패턴 변경)')

# ──────────────────────────────────────────────────────────────────────
# 4. CAD JS 삽입
# ──────────────────────────────────────────────────────────────────────
CAD_JS = r"""
// ════════════════════════════════════════════════════════════════════
// ECOREAN CAD EDITOR v2  (STEP 2)
// ════════════════════════════════════════════════════════════════════
;(function(){
'use strict';

// ── 상수 ─────────────────────────────────────────────────────────
const MM   = 1;          // 단위: mm
const SCALE_DEFAULT = 0.06; // 60px per 1000mm
const WALL_T = 150;      // 기본 벽 두께 mm
const MIN_ROOM = 500;    // 최소 공간 크기 mm

const ROOM_COLORS = {
  living  :'rgba(90,173,255,0.15)',  bedroom :'rgba(160,100,255,0.15)',
  bathroom:'rgba(0,255,178,0.15)',   kitchen :'rgba(255,170,68,0.15)',
  balcony :'rgba(0,220,220,0.15)',   corridor:'rgba(150,150,150,0.15)',
  stairs  :'rgba(130,100,80,0.15)',  attic   :'rgba(200,180,100,0.15)',
  utility :'rgba(80,150,160,0.15)'
};
const ROOM_BORDER = {
  living:'rgba(90,173,255,0.6)',   bedroom:'rgba(160,100,255,0.6)',
  bathroom:'rgba(0,255,178,0.6)',  kitchen:'rgba(255,170,68,0.6)',
  balcony:'rgba(0,220,220,0.6)',   corridor:'rgba(150,150,150,0.5)',
  stairs:'rgba(130,100,80,0.5)',   attic:'rgba(200,180,100,0.5)',
  utility:'rgba(80,150,160,0.5)'
};
const TYPE_KO = {
  living:'거실', bedroom:'침실', bathroom:'욕실', kitchen:'주방',
  balcony:'발코니', corridor:'복도·현관', stairs:'계단', attic:'다락', utility:'다용도실'
};
const DOOR_TYPES = ['swing','double','slide','fold'];
const WIN_TYPES  = ['slide','swing','double','fixed'];

// ── 상태 ─────────────────────────────────────────────────────────
let cv, ctx, wrap;
const CAD = {
  rooms:[], doors:[], windows:[], dims:[],
  selId:null, selType:null,
  tool:'select',
  grid:true, snap:true, ortho:false,
  view:{ox:0, oy:0, scale:SCALE_DEFAULT},
  drag:null, pan:null,
  draw:{active:false, sx:0, sy:0, ex:0, ey:0},
  dimPt:null,         // 치수 첫 클릭 점
  undoStack:[], redoStack:[],
  cursor:{wx:0, wy:0},
  namePopup:null,
};

// ── 초기화 ───────────────────────────────────────────────────────
function init(){
  cv = document.getElementById('cad-canvas');
  wrap = document.getElementById('cad-canvas-wrap');
  if(!cv||!wrap) return;
  ctx = cv.getContext('2d');
  resize();
  new ResizeObserver(resize).observe(wrap);
  cv.addEventListener('mousedown',  onMD);
  cv.addEventListener('mousemove',  onMM);
  cv.addEventListener('mouseup',    onMU);
  cv.addEventListener('wheel',      onWheel, {passive:false});
  cv.addEventListener('dblclick',   onDblClick);
  cv.addEventListener('contextmenu',e=>{ e.preventDefault(); startPan(e); });
  document.addEventListener('keydown', onKey);
  // 초기 뷰: 원점 중앙
  centerOrigin();
  syncFromSpaces();
  draw();
}

function resize(){
  if(!cv||!wrap) return;
  cv.width  = wrap.clientWidth;
  cv.height = wrap.clientHeight;
  draw();
}

function centerOrigin(){
  if(!cv) return;
  CAD.view.ox = cv.width  / 2;
  CAD.view.oy = cv.height / 2;
}

// ── 좌표 변환 ────────────────────────────────────────────────────
function w2s(wx, wy){  // world(mm) → screen(px)
  const {ox,oy,scale}=CAD.view;
  return {x: ox + wx*scale, y: oy - wy*scale};
}
function s2w(sx, sy){  // screen(px) → world(mm)
  const {ox,oy,scale}=CAD.view;
  return {x:(sx-ox)/scale, y:-(sy-oy)/scale};
}
function getMouseW(e){
  const r=cv.getBoundingClientRect();
  return s2w(e.clientX-r.left, e.clientY-r.top);
}
function getMouseS(e){
  const r=cv.getBoundingClientRect();
  return {x:e.clientX-r.left, y:e.clientY-r.top};
}

// ── 스냅 ─────────────────────────────────────────────────────────
function snapW(wx, wy, skipId){
  if(!CAD.snap) return {x:wx, y:wy};
  const gridMm = 100;
  let x = Math.round(wx/gridMm)*gridMm;
  let y = Math.round(wy/gridMm)*gridMm;
  // 끝점 스냅
  const snapPx = 12 / CAD.view.scale;
  CAD.rooms.forEach(r=>{
    if(r.id===skipId) return;
    [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y-r.h],[r.x+r.w,r.y-r.h]].forEach(([px,py])=>{
      if(Math.abs(wx-px)<snapPx && Math.abs(wy-py)<snapPx){ x=px; y=py; }
    });
    // 벽면 스냅 (x 또는 y 축 정렬)
    if(Math.abs(wx-r.x)<snapPx)       x=r.x;
    if(Math.abs(wx-(r.x+r.w))<snapPx) x=r.x+r.w;
    if(Math.abs(wy-r.y)<snapPx)       y=r.y;
    if(Math.abs(wy-(r.y-r.h))<snapPx) y=r.y-r.h;
  });
  return {x,y};
}

function snapOrtho(sx, sy, bx, by){
  if(!CAD.ortho) return {x:sx, y:sy};
  const dx=Math.abs(sx-bx), dy=Math.abs(sy-by);
  return dx>dy ? {x:sx,y:by} : {x:bx,y:sy};
}

// ── 그리기 ───────────────────────────────────────────────────────
function draw(){
  if(!ctx) return;
  const W=cv.width, H=cv.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#07070F'; ctx.fillRect(0,0,W,H);

  if(CAD.grid) drawGrid();

  // 도면 요소
  CAD.rooms.forEach(r=>drawRoom(r));
  CAD.doors.forEach(d=>drawDoor(d));
  CAD.windows.forEach(w=>drawWin(w));
  CAD.dims.forEach(d=>drawDim(d));

  // 현재 그리기 미리보기
  if(CAD.draw.active) drawPreview();

  // 치수 첫 점
  if(CAD.dimPt){
    const s=w2s(CAD.dimPt.x, CAD.dimPt.y);
    ctx.beginPath(); ctx.arc(s.x,s.y,4,0,Math.PI*2);
    ctx.fillStyle='#C9A84C'; ctx.fill();
  }
}

function drawGrid(){
  const {ox,oy,scale}=CAD.view;
  const W=cv.width, H=cv.height;
  const minor=100, major=1000;
  const minorPx=minor*scale, majorPx=major*scale;

  if(minorPx<5) { drawGridLines(majorPx,'rgba(201,168,76,0.12)'); return; }
  drawGridLines(minorPx,'rgba(201,168,76,0.05)');
  drawGridLines(majorPx,'rgba(201,168,76,0.18)');

  // 원점 십자선
  const o=w2s(0,0);
  ctx.strokeStyle='rgba(201,168,76,0.35)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(o.x,0); ctx.lineTo(o.x,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,o.y); ctx.lineTo(W,o.y); ctx.stroke();
}

function drawGridLines(step, color){
  const {ox,oy}=CAD.view;
  const W=cv.width, H=cv.height;
  ctx.strokeStyle=color; ctx.lineWidth=0.5;
  const startX=(ox%step+step)%step;
  const startY=(oy%step+step)%step;
  ctx.beginPath();
  for(let x=startX;x<W;x+=step){ ctx.moveTo(x,0);ctx.lineTo(x,H); }
  for(let y=startY;y<H;y+=step){ ctx.moveTo(0,y);ctx.lineTo(W,y); }
  ctx.stroke();
}

function drawRoom(r){
  const s0=w2s(r.x,r.y), s1=w2s(r.x+r.w,r.y-r.h);
  const sx=Math.min(s0.x,s1.x), sy=Math.min(s0.y,s1.y);
  const sw=Math.abs(s1.x-s0.x), sh=Math.abs(s1.y-s0.y);
  if(sw<1||sh<1) return;

  const isSel=(r.id===CAD.selId && CAD.selType==='room');
  // 내부 채우기
  ctx.fillStyle = ROOM_COLORS[r.type]||'rgba(100,100,100,0.15)';
  ctx.fillRect(sx,sy,sw,sh);

  // 벽 (두께 시각화: scale*WALL_T)
  const wt=WALL_T*CAD.view.scale;
  ctx.fillStyle = isSel?'rgba(201,168,76,0.22)':'rgba(232,224,208,0.1)';
  // top/bottom
  ctx.fillRect(sx,sy,sw,wt);
  ctx.fillRect(sx,sy+sh-wt,sw,wt);
  // left/right
  ctx.fillRect(sx,sy,wt,sh);
  ctx.fillRect(sx+sw-wt,sy,wt,sh);

  // 테두리
  ctx.strokeStyle=isSel?'#C9A84C':(ROOM_BORDER[r.type]||'rgba(200,200,200,0.5)');
  ctx.lineWidth=isSel?2:1.5;
  ctx.strokeRect(sx,sy,sw,sh);

  // 텍스트
  const fs=Math.max(9,Math.min(14,sw/7));
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.font=`bold ${fs}px Inter,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(r.name.substring(0,8), sx+sw/2, sy+sh/2-fs*0.6);

  const fa=(r.w/1000 * r.h/1000).toFixed(2);
  ctx.font=`${Math.max(8,fs-2)}px JetBrains Mono,monospace`;
  ctx.fillStyle='rgba(201,168,76,0.85)';
  ctx.fillText(fa+'㎡', sx+sw/2, sy+sh/2+fs*0.6);

  // 치수선 (선택 시)
  if(isSel) drawRoomDims(r, sx, sy, sw, sh);

  // 크기조절 핸들 (선택 시)
  if(isSel) drawHandles(sx,sy,sw,sh);
}

function drawRoomDims(r, sx, sy, sw, sh){
  const off=18;
  ctx.strokeStyle='#C9A84C'; ctx.fillStyle='#C9A84C';
  ctx.lineWidth=1;
  ctx.font='bold 9px JetBrains Mono,monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  // 상단 가로
  ctx.beginPath();
  ctx.moveTo(sx, sy-off); ctx.lineTo(sx+sw, sy-off);
  ctx.moveTo(sx,sy-off-4); ctx.lineTo(sx,sy-off+4);
  ctx.moveTo(sx+sw,sy-off-4); ctx.lineTo(sx+sw,sy-off+4);
  ctx.stroke();
  ctx.fillText(r.w+'mm', sx+sw/2, sy-off-8);
  // 우측 세로
  ctx.beginPath();
  ctx.moveTo(sx+sw+off, sy); ctx.lineTo(sx+sw+off, sy+sh);
  ctx.moveTo(sx+sw+off-4,sy); ctx.lineTo(sx+sw+off+4,sy);
  ctx.moveTo(sx+sw+off-4,sy+sh); ctx.lineTo(sx+sw+off+4,sy+sh);
  ctx.stroke();
  ctx.save(); ctx.translate(sx+sw+off+12, sy+sh/2); ctx.rotate(-Math.PI/2);
  ctx.fillText(r.h+'mm', 0, 0); ctx.restore();
}

function drawHandles(sx,sy,sw,sh){
  const pts=[[sx,sy],[sx+sw/2,sy],[sx+sw,sy],[sx+sw,sy+sh/2],
             [sx+sw,sy+sh],[sx+sw/2,sy+sh],[sx,sy+sh],[sx,sy+sh/2]];
  pts.forEach(([hx,hy])=>{
    ctx.fillStyle='#C9A84C';
    ctx.fillRect(hx-4,hy-4,8,8);
    ctx.strokeStyle='#07070F'; ctx.lineWidth=1;
    ctx.strokeRect(hx-4,hy-4,8,8);
  });
}

function drawDoor(d){
  const r=CAD.rooms.find(rm=>rm.id===d.roomId); if(!r) return;
  const isSel=(d.id===CAD.selId);
  const sz=d.w||900; // mm
  let wx,wy;
  if(d.wall==='top')   {wx=r.x+d.pos; wy=r.y;}
  else if(d.wall==='bottom'){wx=r.x+d.pos; wy=r.y-r.h;}
  else if(d.wall==='left') {wx=r.x; wy=r.y-d.pos;}
  else                     {wx=r.x+r.w; wy=r.y-d.pos;}
  const s=w2s(wx,wy);
  const szPx=sz*CAD.view.scale;
  const isH=(d.wall==='top'||d.wall==='bottom');
  const dir=d.dir||1;

  ctx.save();
  ctx.strokeStyle=isSel?'#FFD700':'#C9A84C'; ctx.lineWidth=isSel?2:1.5;
  ctx.fillStyle='transparent';

  if(d.type==='swing'){
    ctx.beginPath();
    if(isH){
      ctx.moveTo(s.x,s.y); ctx.lineTo(s.x+szPx*dir,s.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x,s.y,szPx,0,Math.PI/2*(d.wall==='top'?1:-1)*dir);
      ctx.stroke();
    } else {
      ctx.moveTo(s.x,s.y); ctx.lineTo(s.x,s.y-szPx*dir);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x,s.y,szPx,Math.PI*1.5,Math.PI*2);
      ctx.stroke();
    }
  } else if(d.type==='double'){
    ctx.beginPath();
    if(isH){
      ctx.moveTo(s.x,s.y); ctx.lineTo(s.x+szPx*2,s.y);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x,s.y,szPx,0,Math.PI/2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x+szPx*2,s.y,szPx,Math.PI,Math.PI/2,true); ctx.stroke();
    } else {
      ctx.moveTo(s.x,s.y); ctx.lineTo(s.x,s.y-szPx*2); ctx.stroke();
    }
  } else if(d.type==='slide'){
    if(isH){
      ctx.strokeRect(s.x,s.y-3,szPx/2,6);
      ctx.strokeRect(s.x+szPx/2-3,s.y-3,szPx/2,6);
    } else {
      ctx.strokeRect(s.x-3,s.y,6,szPx/2);
      ctx.strokeRect(s.x-3,s.y+szPx/2-3,6,szPx/2);
    }
  } else if(d.type==='fold'){
    ctx.beginPath();
    const segs=4;
    if(isH){
      for(let i=0;i<segs;i++){
        const x1=s.x+i*(szPx/segs), x2=s.x+(i+1)*(szPx/segs), ym=s.y+(i%2===0?-8:8);
        ctx.moveTo(x1,s.y); ctx.lineTo((x1+x2)/2,ym); ctx.lineTo(x2,s.y);
      }
    } else {
      for(let i=0;i<segs;i++){
        const y1=s.y-i*(szPx/segs), y2=s.y-(i+1)*(szPx/segs), xm=s.x+(i%2===0?8:-8);
        ctx.moveTo(s.x,y1); ctx.lineTo(xm,(y1+y2)/2); ctx.lineTo(s.x,y2);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawWin(w){
  const r=CAD.rooms.find(rm=>rm.id===w.roomId); if(!r) return;
  const isSel=(w.id===CAD.selId);
  const sz=w.w||1200;
  let wx,wy;
  if(w.wall==='top')   {wx=r.x+w.pos; wy=r.y;}
  else if(w.wall==='bottom'){wx=r.x+w.pos; wy=r.y-r.h;}
  else if(w.wall==='left') {wx=r.x; wy=r.y-w.pos;}
  else                     {wx=r.x+r.w; wy=r.y-w.pos;}
  const s=w2s(wx,wy);
  const szPx=sz*CAD.view.scale;
  const isH=(w.wall==='top'||w.wall==='bottom');
  const th=5;

  ctx.save();
  ctx.strokeStyle=isSel?'#5aadff':'rgba(90,173,255,0.75)';
  ctx.fillStyle='rgba(90,173,255,0.08)';
  ctx.lineWidth=isSel?2:1.5;

  if(w.type==='double'){
    if(isH){ctx.strokeRect(s.x,s.y-4,szPx,3); ctx.strokeRect(s.x,s.y+1,szPx,3);}
    else    {ctx.strokeRect(s.x-4,s.y,3,szPx); ctx.strokeRect(s.x+1,s.y,3,szPx);}
  } else if(w.type==='fixed'){
    if(isH){
      ctx.strokeRect(s.x,s.y-th,szPx,th*2);
      ctx.beginPath();
      ctx.moveTo(s.x,s.y-th); ctx.lineTo(s.x+szPx,s.y+th);
      ctx.moveTo(s.x+szPx,s.y-th); ctx.lineTo(s.x,s.y+th);
      ctx.stroke();
    } else {
      ctx.strokeRect(s.x-th,s.y,th*2,szPx);
    }
  } else if(w.type==='swing'){
    if(isH){
      ctx.fillRect(s.x,s.y-th,szPx,th*2);
      ctx.strokeRect(s.x,s.y-th,szPx,th*2);
      ctx.beginPath(); ctx.arc(s.x+szPx/2,s.y,szPx/2,Math.PI,0); ctx.stroke();
    } else {
      ctx.fillRect(s.x-th,s.y,th*2,szPx);
      ctx.strokeRect(s.x-th,s.y,th*2,szPx);
    }
  } else { // slide default
    if(isH){
      ctx.fillRect(s.x,s.y-th,szPx,th*2);
      ctx.strokeRect(s.x,s.y-th,szPx,th*2);
      ctx.beginPath(); ctx.moveTo(s.x+szPx/2,s.y-th); ctx.lineTo(s.x+szPx/2,s.y+th); ctx.stroke();
      // 화살표
      ctx.beginPath();
      ctx.moveTo(s.x+szPx*0.3,s.y-th-3); ctx.lineTo(s.x+4,s.y-th-3);
      ctx.moveTo(s.x+szPx*0.7,s.y-th-3); ctx.lineTo(s.x+szPx-4,s.y-th-3);
      ctx.stroke();
    } else {
      ctx.fillRect(s.x-th,s.y,th*2,szPx);
      ctx.strokeRect(s.x-th,s.y,th*2,szPx);
      ctx.beginPath(); ctx.moveTo(s.x-th,s.y+szPx/2); ctx.lineTo(s.x+th,s.y+szPx/2); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDim(d){
  const s1=w2s(d.x1,d.y1), s2=w2s(d.x2,d.y2);
  const off=20;
  const dx=s2.x-s1.x, dy=s2.y-s1.y;
  const len=Math.hypot(dx,dy);
  if(len<5) return;
  const nx=-dy/len, ny=dx/len; // 법선
  const ox=nx*off, oy=ny*off;

  ctx.save();
  ctx.strokeStyle='#C9A84C'; ctx.fillStyle='#C9A84C';
  ctx.lineWidth=1;
  ctx.font='bold 9px JetBrains Mono,monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';

  ctx.beginPath();
  ctx.moveTo(s1.x+ox, s1.y+oy); ctx.lineTo(s2.x+ox, s2.y+oy);
  // 보조선
  ctx.moveTo(s1.x, s1.y); ctx.lineTo(s1.x+ox*1.2, s1.y+oy*1.2);
  ctx.moveTo(s2.x, s2.y); ctx.lineTo(s2.x+ox*1.2, s2.y+oy*1.2);
  // 화살표
  const ang=Math.atan2(dy,dx);
  const arrL=8;
  ctx.moveTo(s1.x+ox,s1.y+oy);
  ctx.lineTo(s1.x+ox+Math.cos(ang+0.3)*arrL, s1.y+oy+Math.sin(ang+0.3)*arrL);
  ctx.lineTo(s1.x+ox+Math.cos(ang-0.3)*arrL, s1.y+oy+Math.sin(ang-0.3)*arrL);
  ctx.moveTo(s2.x+ox,s2.y+oy);
  ctx.lineTo(s2.x+ox+Math.cos(ang+Math.PI+0.3)*arrL, s2.y+oy+Math.sin(ang+Math.PI+0.3)*arrL);
  ctx.lineTo(s2.x+ox+Math.cos(ang+Math.PI-0.3)*arrL, s2.y+oy+Math.sin(ang+Math.PI-0.3)*arrL);
  ctx.stroke();

  const mx=(s1.x+s2.x)/2+ox, my=(s1.y+s2.y)/2+oy;
  const distMm=Math.round(Math.hypot(d.x2-d.x1, d.y2-d.y1));
  ctx.fillStyle='rgba(7,7,15,0.8)';
  ctx.fillRect(mx-22,my-7,44,14);
  ctx.fillStyle='#C9A84C';
  ctx.fillText(distMm+'mm', mx, my);
  ctx.restore();
}

function drawPreview(){
  const t=CAD.tool;
  const {sx,sy,ex,ey}=CAD.draw;
  const p0=w2s(sx,sy), p1=w2s(ex,ey);
  const x=Math.min(p0.x,p1.x), y=Math.min(p0.y,p1.y);
  const w=Math.abs(p1.x-p0.x), h=Math.abs(p1.y-p0.y);

  if(t==='room'){
    ctx.strokeStyle='rgba(201,168,76,0.7)'; ctx.lineWidth=1.5;
    ctx.setLineDash([5,4]);
    ctx.strokeRect(x,y,w,h);
    ctx.setLineDash([]);
    // 치수 텍스트
    const wMm=Math.abs(Math.round(ex-sx)), hMm=Math.abs(Math.round(ey-sy));
    ctx.fillStyle='rgba(201,168,76,0.9)';
    ctx.font='bold 10px JetBrains Mono,monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(wMm+'×'+hMm+'mm', x+w/2, y+h/2);
  } else if(t==='wall'||t==='dim'){
    ctx.strokeStyle=t==='wall'?'rgba(232,224,208,0.6)':'rgba(201,168,76,0.7)';
    ctx.lineWidth=t==='wall'?3:1;
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
    ctx.setLineDash([]);
    const distMm=Math.round(Math.hypot(ex-sx,ey-sy));
    ctx.fillStyle='rgba(255,255,255,0.8)';
    ctx.font='9px JetBrains Mono,monospace';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(distMm+'mm', (p0.x+p1.x)/2, Math.min(p0.y,p1.y)-4);
  }
}

// ── 이벤트 핸들러 ─────────────────────────────────────────────
function onMD(e){
  if(e.button===1||e.button===2) return;
  const wPos=getMouseW(e);
  const sPos=getMouseS(e);
  const snapped=snapW(wPos.x,wPos.y);
  const t=CAD.tool;

  if(t==='select'){
    const hit=hitTest(snapped.x,snapped.y);
    if(hit){ CAD.selId=hit.id; CAD.selType=hit.type; updateProps();
      CAD.drag={id:hit.id,type:hit.type,sx:snapped.x,sy:snapped.y,
                ox:hit.obj.x,oy:hit.obj.y,handle:hit.handle};
    } else { CAD.selId=null; CAD.selType=null; updateProps(); }
    draw(); return;
  }

  if(t==='room'||t==='wall'||t==='dim'){
    if(t==='dim' && CAD.dimPt){
      // 두 번째 점 → 치수 확정
      pushUndo();
      CAD.dims.push({id:'d'+Date.now(),x1:CAD.dimPt.x,y1:CAD.dimPt.y,x2:snapped.x,y2:snapped.y});
      CAD.dimPt=null; CAD.draw.active=false; draw(); return;
    }
    if(t==='dim'){ CAD.dimPt={x:snapped.x,y:snapped.y}; }
    CAD.draw={active:true,sx:snapped.x,sy:snapped.y,ex:snapped.x,ey:snapped.y};
    return;
  }

  if(t==='door'||t==='window'){
    const wh=wallHitTest(snapped.x, snapped.y);
    if(wh){
      pushUndo();
      const id='elem'+Date.now();
      if(t==='door')   CAD.doors.push({id,type:'swing',roomId:wh.roomId,wall:wh.wall,pos:wh.pos,w:900,dir:1});
      else             CAD.windows.push({id,type:'slide',roomId:wh.roomId,wall:wh.wall,pos:wh.pos,w:1200});
      updateSpaces(); updateSummary(); draw();
    }
    return;
  }

  if(t==='erase'){
    const hit=hitTest(snapped.x,snapped.y);
    if(hit){ deleteById(hit.id,hit.type); draw(); }
    return;
  }
}

function onMM(e){
  const wPos=getMouseW(e);
  let snapped=snapW(wPos.x,wPos.y);
  CAD.cursor={wx:Math.round(snapped.x),wy:Math.round(snapped.y)};
  const coordEl=document.getElementById('cad-coord');
  if(coordEl) coordEl.textContent=`${CAD.cursor.wx}, ${CAD.cursor.wy}`;

  if(CAD.pan){
    const sPos=getMouseS(e);
    CAD.view.ox=CAD.pan.ox0+(sPos.x-CAD.pan.sx);
    CAD.view.oy=CAD.pan.oy0+(sPos.y-CAD.pan.sy);
    draw(); return;
  }

  if(CAD.drag){
    const d=CAD.drag;
    if(d.type==='room'){
      const r=CAD.rooms.find(rm=>rm.id===d.id); if(!r) return;
      if(d.handle===undefined){ // 이동
        r.x=d.ox+(snapped.x-d.sx); r.y=d.oy+(snapped.y-d.sy);
      } else { // 크기조절
        const dx=snapped.x-d.sx, dy=snapped.y-d.sy;
        const h=d.handle;
        if(h%2===0){ // 모서리
          const corners=[[0,0],[1,0],[1,-1],[0,-1]];
          const cidx=Math.floor(h/2);
        }
        // 간단 핸들: 우하단만
        if(h===4){ r.w=Math.max(MIN_ROOM,d.ow+dx); r.h=Math.max(MIN_ROOM,d.oh-dy); }
      }
      syncRoomToSpace(r); updateSummary(); updateProps(); draw();
    }
    return;
  }

  if(CAD.draw.active){
    let ex=snapped.x, ey=snapped.y;
    if(CAD.ortho||e.shiftKey){
      const ort=snapOrtho(ex,ey,CAD.draw.sx,CAD.draw.sy);
      ex=ort.x; ey=ort.y;
    }
    CAD.draw.ex=ex; CAD.draw.ey=ey;
    draw();
  }

  // 벽 hover 스냅 표시 (문/창호 도구)
  if(CAD.tool==='door'||CAD.tool==='window'){
    const wh=wallHitTest(snapped.x,snapped.y);
    if(wh){
      const sp=w2s(wh.wx,wh.wy);
      ctx.save();
      ctx.strokeStyle='#C9A84C'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(sp.x,sp.y,5,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  }
}

function onMU(e){
  if(CAD.drag){ CAD.drag=null; pushUndo(); updateSpaces(); updateSummary(); draw(); return; }
  if(CAD.pan){ CAD.pan=null; return; }

  const wPos=getMouseW(e);
  let snapped=snapW(wPos.x,wPos.y);

  if(CAD.draw.active && (CAD.tool==='room'||CAD.tool==='wall')){
    CAD.draw.active=false;
    if(CAD.tool==='room'){
      const wx=Math.abs(snapped.x-CAD.draw.sx);
      const wy=Math.abs(snapped.y-CAD.draw.sy);
      if(wx<MIN_ROOM||wy<MIN_ROOM){ draw(); return; }
      showNamePopup(
        Math.min(CAD.draw.sx,snapped.x),
        Math.max(CAD.draw.sy,snapped.y),
        wx, wy
      );
    }
    draw();
  }
}

function onWheel(e){
  e.preventDefault();
  const sPos=getMouseS(e);
  const factor=e.deltaY<0?1.12:0.89;
  const newScale=Math.min(0.3,Math.max(0.01,CAD.view.scale*factor));
  CAD.view.ox=sPos.x-(sPos.x-CAD.view.ox)*newScale/CAD.view.scale;
  CAD.view.oy=sPos.y-(sPos.y-CAD.view.oy)*newScale/CAD.view.scale;
  CAD.view.scale=newScale;
  draw();
}

function onDblClick(e){
  const wPos=getMouseW(e);
  const snapped=snapW(wPos.x,wPos.y);
  const hit=hitTest(snapped.x,snapped.y);
  if(hit){ deleteById(hit.id,hit.type); draw(); }
}

function startPan(e){
  const sPos=getMouseS(e);
  CAD.pan={sx:sPos.x,sy:sPos.y,ox0:CAD.view.ox,oy0:CAD.view.oy};
  const onMove=ev=>{ CAD.view.ox=CAD.pan.ox0+(ev.clientX-cv.getBoundingClientRect().left-CAD.pan.sx);
                     CAD.view.oy=CAD.pan.oy0+(ev.clientY-cv.getBoundingClientRect().top -CAD.pan.sy); draw(); };
  const onUp  =()=>{ CAD.pan=null; document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); };
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
}

function onKey(e){
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  const k=e.key.toLowerCase();
  if(e.ctrlKey){
    if(k==='z'){cadUndo();} else if(k==='y'){cadRedo();}
    return;
  }
  const toolMap={v:'select',r:'room',w:'wall',d:'door',i:'window',m:'dim',e:'erase'};
  if(toolMap[k]){ cadTool(toolMap[k]); return; }
  if(k==='escape'){ cadTool('select'); CAD.draw.active=false; CAD.dimPt=null; draw(); }
  if(k==='delete'||k==='backspace'){
    if(CAD.selId){ deleteById(CAD.selId,CAD.selType); CAD.selId=null; updateProps(); draw(); }
  }
  if(k==='+'||k==='='){ cadZoom(1.25); }
  if(k==='-'){  cadZoom(0.8); }
  if(k==='0'){ cadFitAll(); }
  if(k==='g'){ cadToggle('grid'); }
  if(k==='s'){ cadToggle('snap'); }
}

// ── 히트 테스트 ───────────────────────────────────────────────
function hitTest(wx,wy){
  const thr=10/CAD.view.scale;
  // 문/창호
  for(const d of CAD.doors){
    const r=CAD.rooms.find(rm=>rm.id===d.roomId); if(!r) continue;
    let hx,hy;
    if(d.wall==='top')   {hx=r.x+d.pos; hy=r.y;}
    else if(d.wall==='bottom'){hx=r.x+d.pos; hy=r.y-r.h;}
    else if(d.wall==='left') {hx=r.x; hy=r.y-d.pos;}
    else                     {hx=r.x+r.w; hy=r.y-d.pos;}
    if(Math.hypot(wx-hx,wy-hy)<(d.w||900)*CAD.view.scale/2+thr)
      return {id:d.id,type:'door',obj:d};
  }
  for(const w of CAD.windows){
    const r=CAD.rooms.find(rm=>rm.id===w.roomId); if(!r) continue;
    let hx,hy;
    if(w.wall==='top')   {hx=r.x+w.pos; hy=r.y;}
    else if(w.wall==='bottom'){hx=r.x+w.pos; hy=r.y-r.h;}
    else if(w.wall==='left') {hx=r.x; hy=r.y-w.pos;}
    else                     {hx=r.x+r.w; hy=r.y-w.pos;}
    if(Math.hypot(wx-hx,wy-hy)<(w.w||1200)*CAD.view.scale/2+thr)
      return {id:w.id,type:'window',obj:w};
  }
  // 공간
  for(let i=CAD.rooms.length-1;i>=0;i--){
    const r=CAD.rooms[i];
    if(wx>=r.x&&wx<=r.x+r.w&&wy<=r.y&&wy>=r.y-r.h)
      return {id:r.id,type:'room',obj:r};
  }
  return null;
}

function wallHitTest(wx,wy){
  const thr=150+100; // mm (벽 두께 + 여유)
  let best=null, bestD=thr/CAD.view.scale * CAD.view.scale;
  CAD.rooms.forEach(r=>{
    const walls=[
      {wall:'top',    dist:Math.abs(wy-r.y),        inR:wx>=r.x&&wx<=r.x+r.w, pos:wx-r.x,   wx,wy:r.y},
      {wall:'bottom', dist:Math.abs(wy-(r.y-r.h)),  inR:wx>=r.x&&wx<=r.x+r.w, pos:wx-r.x,   wx,wy:r.y-r.h},
      {wall:'left',   dist:Math.abs(wx-r.x),         inR:wy<=r.y&&wy>=r.y-r.h, pos:r.y-wy,  wx:r.x,wy},
      {wall:'right',  dist:Math.abs(wx-(r.x+r.w)),   inR:wy<=r.y&&wy>=r.y-r.h, pos:r.y-wy,  wx:r.x+r.w,wy},
    ];
    walls.forEach(w=>{
      const dPx=w.dist*CAD.view.scale;
      if(w.inR && dPx<20 && dPx<(bestD||99)){
        bestD=dPx; best={roomId:r.id,wall:w.wall,pos:w.pos,wx:w.wx,wy:w.wy};
      }
    });
  });
  return best;
}

function deleteById(id,type){
  pushUndo();
  if(type==='room'){
    CAD.rooms=CAD.rooms.filter(r=>r.id!==id);
    CAD.doors=CAD.doors.filter(d=>d.roomId!==id);
    CAD.windows=CAD.windows.filter(w=>w.roomId!==id);
    S.spaces=S.spaces.filter(s=>(s.id||s.name)!==id&&s.id!==id);
  } else if(type==='door')   CAD.doors=CAD.doors.filter(d=>d.id!==id);
  else if(type==='window')   CAD.windows=CAD.windows.filter(w=>w.id!==id);
  else if(type==='dim')      CAD.dims=CAD.dims.filter(d=>d.id!==id);
  updateSpaces(); updateSummary();
  if(typeof renderSpaceCards==='function') renderSpaceCards();
}

// ── 이름 팝업 ─────────────────────────────────────────────────
function showNamePopup(x,y,w,h){
  const existing=document.getElementById('cad-name-popup');
  if(existing) existing.remove();

  const sp=w2s(x+w/2,y-h/2);
  const popup=document.createElement('div');
  popup.id='cad-name-popup';
  popup.style.cssText=`position:absolute;top:${Math.max(10,sp.y-80)}px;left:${Math.max(10,sp.x-100)}px;
    background:rgba(7,7,15,.97);border:1px solid rgba(201,168,76,.5);border-radius:8px;
    padding:12px 14px;z-index:100;min-width:200px;`;
  popup.innerHTML=`
    <div style="font-size:11px;color:#C9A84C;font-weight:700;margin-bottom:8px">공간 추가</div>
    <input id="cpop-name" type="text" placeholder="공간명 (예: 안방)" value=""
      style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);
      border-radius:5px;padding:5px 8px;color:#ddd;font-size:11px;margin-bottom:6px;">
    <select id="cpop-type" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);
      border-radius:5px;padding:5px 8px;color:#ddd;font-size:11px;margin-bottom:8px;">
      <option value="living">거실</option><option value="bedroom">침실</option>
      <option value="kitchen">주방</option><option value="bathroom">욕실</option>
      <option value="balcony">발코니</option><option value="corridor">복도·현관</option>
      <option value="stairs">계단</option><option value="attic">다락</option><option value="utility">다용도실</option>
    </select>
    <div style="display:flex;gap:6px">
      <button onclick="cadConfirmRoom(${x},${y},${w},${h})"
        style="flex:1;padding:6px;background:rgba(201,168,76,.25);border:1px solid #C9A84C;
        border-radius:5px;color:#C9A84C;cursor:pointer;font-size:11px;">추가</button>
      <button onclick="document.getElementById('cad-name-popup').remove()"
        style="flex:1;padding:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);
        border-radius:5px;color:#888;cursor:pointer;font-size:11px;">취소</button>
    </div>`;

  document.getElementById('cad-canvas-wrap').appendChild(popup);
  document.getElementById('cpop-name').focus();
  document.getElementById('cpop-name').addEventListener('keydown',e=>{
    if(e.key==='Enter') cadConfirmRoom(x,y,w,h);
  });
}

window.cadConfirmRoom = function(x,y,w,h){
  const nm=(document.getElementById('cpop-name')?.value||'').trim()||'공간';
  const tp=document.getElementById('cpop-type')?.value||'living';
  document.getElementById('cad-name-popup')?.remove();
  pushUndo();
  const id='room_'+Date.now().toString(36);
  CAD.rooms.push({id,name:nm,type:tp,x,y,w,h});
  // S.spaces에 추가
  const wMm=Math.round(w), hMm=Math.round(h);
  S.spaces.push({
    id,name:nm,type:tp,width:wMm,length:hMm,height:2400,
    windows:[],doors:[{w:900,h:2100}],corners:4,
    wet:tp==='bathroom',roof:false,floor2:false,tileH:2400,beamH:0
  });
  CAD.selId=id; CAD.selType='room';
  updateSpaces(); updateSummary(); updateProps();
  if(typeof renderSpaceCards==='function') renderSpaceCards();
  if(typeof updateBathroomScopes==='function') updateBathroomScopes();
  if(typeof recalc==='function') recalc();
  draw();
};

// ── Properties 패널 ───────────────────────────────────────────
function updateProps(){
  const el=document.getElementById('cad-props-content'); if(!el) return;
  if(!CAD.selId){ el.innerHTML='<div id="cad-props-empty" style="color:#444;font-size:10px;padding:8px 0">요소를 선택하세요</div>'; return; }

  if(CAD.selType==='room'){
    const r=CAD.rooms.find(rm=>rm.id===CAD.selId); if(!r) return;
    const fa=(r.w/1000*r.h/1000).toFixed(2);
    const wa=((2*(r.w+r.h)/1000)*2.4-0).toFixed(2);
    const dCnt=CAD.doors.filter(d=>d.roomId===r.id).length;
    const wCnt=CAD.windows.filter(w=>w.roomId===r.id).length;
    el.innerHTML=`
      <div class="cad-prow"><label>이름</label>
        <input id="cp-name" value="${r.name}" onchange="cadPropChange('name',this.value)"></div>
      <div class="cad-prow"><label>유형</label>
        <select id="cp-type" onchange="cadPropChange('type',this.value)">
          ${Object.entries(TYPE_KO).map(([v,l])=>`<option value="${v}"${r.type===v?' selected':''}>${l}</option>`).join('')}
        </select></div>
      <div class="cad-prow"><label>가로 (mm)</label>
        <input type="number" id="cp-w" value="${Math.round(r.w)}" onchange="cadPropChange('w',+this.value)"></div>
      <div class="cad-prow"><label>세로 (mm)</label>
        <input type="number" id="cp-h" value="${Math.round(r.h)}" onchange="cadPropChange('h',+this.value)"></div>
      <div style="height:1px;background:rgba(255,255,255,.06);margin:8px 0"></div>
      <div class="cad-prow"><label>면적</label><div class="cad-pval">${fa} ㎡</div></div>
      <div class="cad-prow"><label>벽면적</label><div class="cad-pval">${wa} ㎡</div></div>
      <div class="cad-prow"><label>창호</label><div class="cad-pval">${wCnt} EA</div></div>
      <div class="cad-prow"><label>문</label><div class="cad-pval">${dCnt} EA</div></div>
      <div style="height:1px;background:rgba(255,255,255,.06);margin:8px 0"></div>
      <label class="cad-chk"><input type="checkbox" ${r.wet?'checked':''} onchange="cadPropChange('wet',this.checked)"> 습식</label>
      <label class="cad-chk"><input type="checkbox" ${r.roof?'checked':''} onchange="cadPropChange('roof',this.checked)"> 경사천장</label>
      <label class="cad-chk"><input type="checkbox" ${r.floor2?'checked':''} onchange="cadPropChange('floor2',this.checked)"> 2층</label>
      <div style="height:1px;background:rgba(255,255,255,.06);margin:8px 0"></div>
      <div style="display:flex;gap:6px">
        <button class="cad-btn" style="flex:1" onclick="cadDeleteSel()">삭제</button>
        <button class="cad-btn" style="flex:1" onclick="cadDuplicate()">복사</button>
      </div>`;
  } else if(CAD.selType==='door'){
    const d=CAD.doors.find(x=>x.id===CAD.selId); if(!d) return;
    el.innerHTML=`
      <div class="cad-prow"><label>종류</label>
        <select onchange="cadDoorProp('type',this.value)">
          ${DOOR_TYPES.map(t=>`<option value="${t}"${d.type===t?' selected':''}>${{swing:'여닫이',double:'쌍문',slide:'미서기',fold:'폴딩'}[t]}</option>`).join('')}
        </select></div>
      <div class="cad-prow"><label>너비 (mm)</label>
        <input type="number" value="${d.w||900}" onchange="cadDoorProp('w',+this.value)"></div>
      <div class="cad-prow"><label>방향</label>
        <select onchange="cadDoorProp('dir',+this.value)">
          <option value="1"${d.dir===1?' selected':''}>정방향</option>
          <option value="-1"${d.dir===-1?' selected':''}>역방향</option>
        </select></div>
      <button class="cad-btn" style="width:100%;margin-top:8px" onclick="cadDeleteSel()">삭제</button>`;
  } else if(CAD.selType==='window'){
    const w=CAD.windows.find(x=>x.id===CAD.selId); if(!w) return;
    el.innerHTML=`
      <div class="cad-prow"><label>종류</label>
        <select onchange="cadWinProp('type',this.value)">
          ${WIN_TYPES.map(t=>`<option value="${t}"${w.type===t?' selected':''}>${{slide:'미서기',swing:'여닫이',double:'이중',fixed:'고정'}[t]}</option>`).join('')}
        </select></div>
      <div class="cad-prow"><label>너비 (mm)</label>
        <input type="number" value="${w.w||1200}" onchange="cadWinProp('w',+this.value)"></div>
      <button class="cad-btn" style="width:100%;margin-top:8px" onclick="cadDeleteSel()">삭제</button>`;
  }
}

window.cadPropChange = function(key,val){
  const r=CAD.rooms.find(rm=>rm.id===CAD.selId); if(!r) return;
  if(key==='w') r.w=Math.max(MIN_ROOM,val);
  else if(key==='h') r.h=Math.max(MIN_ROOM,val);
  else r[key]=val;
  syncRoomToSpace(r); updateSummary(); updateProps();
  if(typeof recalc==='function') recalc();
  draw();
};
window.cadDoorProp = function(key,val){
  const d=CAD.doors.find(x=>x.id===CAD.selId); if(!d) return;
  d[key]=val; updateSpaces(); draw();
};
window.cadWinProp = function(key,val){
  const w=CAD.windows.find(x=>x.id===CAD.selId); if(!w) return;
  w[key]=val; updateSpaces(); draw();
};
window.cadDeleteSel = function(){
  if(CAD.selId){ deleteById(CAD.selId,CAD.selType); CAD.selId=null; updateProps(); draw(); }
};
window.cadDuplicate = function(){
  const r=CAD.rooms.find(rm=>rm.id===CAD.selId); if(!r) return;
  pushUndo();
  const id='room_'+Date.now().toString(36);
  const nr={...r,id,x:r.x+300,y:r.y-300,name:r.name+'(복)'};
  CAD.rooms.push(nr);
  S.spaces.push({id,name:nr.name,type:nr.type,width:Math.round(nr.w),length:Math.round(nr.h),height:2400,
    windows:[],doors:[{w:900,h:2100}],corners:4,wet:nr.type==='bathroom',roof:false,floor2:false,tileH:2400,beamH:0});
  CAD.selId=id; updateSpaces(); updateSummary(); updateProps(); draw();
};

// ── 공간-S.spaces 동기화 ─────────────────────────────────────
function syncRoomToSpace(r){
  const sp=S.spaces.find(s=>s.id===r.id||s.name===r.name);
  if(sp){
    sp.width=Math.round(r.w); sp.length=Math.round(r.h);
    sp.name=r.name; sp.type=r.type;
    if(r.wet!==undefined) sp.wet=r.wet;
  }
}

function updateSpaces(){
  CAD.rooms.forEach(syncRoomToSpace);
  CAD.doors.forEach(d=>{
    const sp=S.spaces.find(s=>s.id===d.roomId||CAD.rooms.find(r=>r.id===d.roomId&&s.name===r.name));
    if(sp) sp.doors=[{w:d.w||900,h:2100}];
  });
  CAD.windows.forEach(w=>{
    const sp=S.spaces.find(s=>s.id===w.roomId||CAD.rooms.find(r=>r.id===w.roomId&&s.name===r.name));
    if(sp) sp.windows=[{w:w.w||1200,h:1200}];
  });
}

function updateSummary(){
  const fa=CAD.rooms.reduce((s,r)=>s+r.w/1000*r.h/1000,0);
  const walls=CAD.rooms.reduce((s,r)=>s+(2*(r.w+r.h)/1000)*2.4,0);
  const el_fa=document.getElementById('cs-fa'); if(el_fa) el_fa.textContent=fa.toFixed(1)+'㎡';
  const el_wa=document.getElementById('cs-wa'); if(el_wa) el_wa.textContent=walls.toFixed(1)+'㎡';
  const el_w=document.getElementById('cs-win'); if(el_w) el_w.textContent=CAD.windows.length+'EA';
  const el_d=document.getElementById('cs-door'); if(el_d) el_d.textContent=CAD.doors.length+'EA';
  const el_r=document.getElementById('cs-rooms'); if(el_r) el_r.textContent=CAD.rooms.length+'개';
  // 숨김 tot-* 업데이트
  const setT=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setT('tot-fa',fa.toFixed(1)+' ㎡'); setT('tot-wa',walls.toFixed(1)+' ㎡');
  setT('tot-win',CAD.windows.length+' EA'); setT('tot-door',CAD.doors.length+' EA');
  setT('tot-wet',CAD.rooms.filter(r=>r.type==='bathroom').length+' 개');
}

// ── S.spaces → CAD 동기화 ─────────────────────────────────────
function syncFromSpaces(){
  if(!S||!S.spaces||!S.spaces.length) return;
  CAD.rooms=[];
  let cx=0;
  S.spaces.forEach((sp,i)=>{
    const w=sp.width||3000, h=sp.length||3000;
    const id=sp.id||('room_'+i);
    sp.id=id;
    CAD.rooms.push({id,name:sp.name||('공간'+(i+1)),type:sp.type||'living',
      x:cx,y:h+200,w,h,wet:sp.wet,roof:sp.roof,floor2:sp.floor2});
    cx+=w+500;
  });
  updateSummary();
}

// ── Undo/Redo ─────────────────────────────────────────────────
function pushUndo(){
  CAD.undoStack.push(JSON.stringify({rooms:CAD.rooms,doors:CAD.doors,windows:CAD.windows,dims:CAD.dims}));
  if(CAD.undoStack.length>50) CAD.undoStack.shift();
  CAD.redoStack=[];
}
window.cadUndo=function(){
  if(!CAD.undoStack.length) return;
  CAD.redoStack.push(JSON.stringify({rooms:CAD.rooms,doors:CAD.doors,windows:CAD.windows,dims:CAD.dims}));
  const s=JSON.parse(CAD.undoStack.pop());
  CAD.rooms=s.rooms; CAD.doors=s.doors; CAD.windows=s.windows; CAD.dims=s.dims;
  updateSummary(); updateProps(); draw();
};
window.cadRedo=function(){
  if(!CAD.redoStack.length) return;
  CAD.undoStack.push(JSON.stringify({rooms:CAD.rooms,doors:CAD.doors,windows:CAD.windows,dims:CAD.dims}));
  const s=JSON.parse(CAD.redoStack.pop());
  CAD.rooms=s.rooms; CAD.doors=s.doors; CAD.windows=s.windows; CAD.dims=s.dims;
  updateSummary(); updateProps(); draw();
};

// ── 외부 공개 함수 ────────────────────────────────────────────
window.cadTool = function(t){
  CAD.tool=t; CAD.draw.active=false; CAD.dimPt=null;
  document.querySelectorAll('[id^="ct-"]').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('ct-'+t); if(el) el.classList.add('active');
  cv.style.cursor = t==='select'?'default':t==='erase'?'cell':'crosshair';
};
window.cadToggle = function(key){
  CAD[key]=!CAD[key];
  const el=document.getElementById('ct-'+key); if(el) el.classList.toggle('active',CAD[key]);
};
window.cadZoom = function(f){
  const cx=cv.width/2, cy=cv.height/2;
  const newS=Math.min(0.3,Math.max(0.01,CAD.view.scale*f));
  CAD.view.ox=cx-(cx-CAD.view.ox)*newS/CAD.view.scale;
  CAD.view.oy=cy-(cy-CAD.view.oy)*newS/CAD.view.scale;
  CAD.view.scale=newS; draw();
};
window.cadFitAll = function(){
  if(!CAD.rooms.length){ centerOrigin(); CAD.view.scale=SCALE_DEFAULT; draw(); return; }
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  CAD.rooms.forEach(r=>{
    minX=Math.min(minX,r.x); maxX=Math.max(maxX,r.x+r.w);
    minY=Math.min(minY,r.y-r.h); maxY=Math.max(maxY,r.y);
  });
  const pad=500;
  const rangeX=maxX-minX+pad*2, rangeY=maxY-minY+pad*2;
  const scale=Math.min(0.28,Math.min(cv.width/rangeX,cv.height/rangeY));
  CAD.view.scale=scale;
  const s0=w2s((minX+maxX)/2,(minY+maxY)/2);
  CAD.view.ox+=cv.width/2-s0.x;
  CAD.view.oy+=cv.height/2-s0.y;
  draw();
};
window.cadApply = function(){
  updateSpaces();
  if(typeof renderSpaceCards==='function') renderSpaceCards();
  if(typeof updateBathroomScopes==='function') updateBathroomScopes();
  if(typeof recalc==='function'){ recalc(); }
  cadSave();
  if(typeof st==='function') st('평면도 견적 반영 완료 — '+CAD.rooms.length+'개 공간');
};
window.cadSyncPreview = function(){
  updateSpaces();
  if(typeof renderSpaceCards==='function') renderSpaceCards();
  if(typeof st==='function') st('미리보기 동기화 완료');
};
window.cadClearAll = function(){
  if(!confirm('모든 도면 요소를 삭제합니까?')) return;
  pushUndo(); CAD.rooms=[]; CAD.doors=[]; CAD.windows=[]; CAD.dims=[];
  S.spaces=[]; updateSummary(); updateProps();
  if(typeof renderSpaceCards==='function') renderSpaceCards();
  draw();
};
window.cadExportPNG = function(){
  draw();
  const a=document.createElement('a');
  a.download='floorplan.png'; a.href=cv.toDataURL('image/png'); a.click();
};
window.cadExportDXF = function(){
  let dxf='0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  CAD.rooms.forEach(r=>{
    const x0=r.x,y0=r.y,x1=r.x+r.w,y1=r.y-r.h;
    [[x0,y0,x1,y0],[x1,y0,x1,y1],[x1,y1,x0,y1],[x0,y1,x0,y0]].forEach(([ax,ay,bx,by])=>{
      dxf+=`0\nLINE\n8\nROOMS\n10\n${ax}\n20\n${ay}\n30\n0\n11\n${bx}\n21\n${by}\n31\n0\n`;
    });
    dxf+=`0\nTEXT\n8\nROOMS\n10\n${r.x+r.w/2}\n20\n${r.y-r.h/2}\n30\n0\n40\n200\n1\n${r.name}\n`;
  });
  CAD.doors.forEach(d=>{
    const r=CAD.rooms.find(rm=>rm.id===d.roomId); if(!r) return;
    let wx=r.x+(d.wall==='right'?r.w:0), wy=r.y-(d.wall==='bottom'?r.h:0);
    if(d.wall==='top'||d.wall==='bottom') wx=r.x+d.pos;
    else wy=r.y-d.pos;
    dxf+=`0\nLINE\n8\nDOORS\n10\n${wx}\n20\n${wy}\n30\n0\n11\n${wx+(d.wall==='top'||d.wall==='bottom'?d.w:0)}\n21\n${wy+(d.wall==='left'||d.wall==='right'?d.w:0)}\n31\n0\n`;
  });
  dxf+='0\nENDSEC\n0\nEOF\n';
  const b=new Blob([dxf],{type:'text/plain'});
  const a=document.createElement('a');
  a.download='floorplan.dxf'; a.href=URL.createObjectURL(b); a.click();
};

// ── localStorage ─────────────────────────────────────────────
function cadSave(){
  try{ localStorage.setItem('boc_cad2',JSON.stringify({rooms:CAD.rooms,doors:CAD.doors,windows:CAD.windows,dims:CAD.dims})); }catch(e){}
}
function cadLoad(){
  try{
    const d=JSON.parse(localStorage.getItem('boc_cad2')||'{}');
    if(d.rooms&&d.rooms.length){ CAD.rooms=d.rooms; CAD.doors=d.doors||[]; CAD.windows=d.windows||[]; CAD.dims=d.dims||[]; }
  }catch(e){}
}

// ── 부트 ─────────────────────────────────────────────────────
window.addEventListener('load',()=>{
  cadLoad();
  init();
  if(CAD.rooms.length) cadFitAll();
  else syncFromSpaces();
  setInterval(cadSave, 15000);
});

// STEP 이동 시 리사이즈
const _oGoStep=window.goStep;
if(typeof _oGoStep==='function'){
  window.goStep=function(n){
    const r=_oGoStep.apply(this,arguments);
    if(n===1){ setTimeout(()=>{ resize(); if(!CAD.rooms.length) syncFromSpaces(); cadFitAll(); },80); }
    return r;
  };
}

// addSpace 통합 (기존 form 사용 시 백워드 호환)
const _oAddSpace=window.addSpace;
if(typeof _oAddSpace==='function'){
  window.addSpace=function(){
    const r=_oAddSpace.apply(this,arguments);
    setTimeout(()=>{
      const sp=S.spaces[S.spaces.length-1]; if(!sp) return;
      const id=sp.id||('room_'+Date.now().toString(36)); sp.id=id;
      if(!CAD.rooms.find(rm=>rm.id===id)){
        const maxX=CAD.rooms.reduce((m,rm)=>Math.max(m,rm.x+rm.w),0);
        CAD.rooms.push({id,name:sp.name,type:sp.type||'living',
          x:maxX+500,y:(sp.length||3000)+200,w:sp.width||3000,h:sp.length||3000});
        updateSummary(); cadFitAll();
      }
    },60);
    return r;
  };
}

})(); // end IIFE — ECOREAN CAD v2
"""

# 마지막 </script> 앞에 삽입
pos = html.rfind('</script>')
if pos > -1:
    html = html[:pos] + CAD_JS + '\n' + html[pos:]
    print('[4] CAD JS 삽입 OK')
else:
    print('[4] WARN: </script> 없음')

# ──────────────────────────────────────────────────────────────────────
# 5. 이전 fp-editor CSS 정리 (중복 방지)
# ──────────────────────────────────────────────────────────────────────
# 이전 fp-editor CSS block 제거
html = re.sub(r'/\* ── Floor Plan Editor ──.*?#fp-scale-label \{[^}]+\}\s*\n', '', html, flags=re.DOTALL)
print('[5] 이전 fp-editor CSS 제거 (있으면)')

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)
lines = html.count('\n') + 1
print(f'Done: {lines} lines, {len(html.encode("utf-8")):,} bytes')
