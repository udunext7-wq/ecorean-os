# transform-fabric.py — Fabric.js 기반 CAD 에디터 (STEP 2 완전 재구성)
import re

SRC = 'ECOREAN_BOC_v1.html'
with open(SRC, 'r', encoding='utf-8') as f:
    html = f.read()

# ──────────────────────────────────────────────────────────────────────
# 1. Fabric.js CDN + </head> 앞에 삽입
# ──────────────────────────────────────────────────────────────────────
FABRIC_SCRIPT = '<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>\n'
if 'fabric.min.js' not in html:
    html = html.replace('</head>', FABRIC_SCRIPT + '</head>', 1)
    print('[1] Fabric.js CDN 삽입 OK')
else:
    print('[1] Fabric.js 이미 있음')

# ──────────────────────────────────────────────────────────────────────
# 2. page1 HTML 교체
# ──────────────────────────────────────────────────────────────────────
NEW_PAGE1 = r'''<div class="step-page" id="page1">
<div class="page-title">STEP 2 — 평면도 CAD 에디터</div>
<div class="page-sub" style="margin-bottom:10px">V=선택 R=공간 D=문 I=창호 M=치수 &nbsp;|&nbsp; G=격자 S=스냅 Ctrl+Z=취소 Del=삭제 F=전체보기</div>

<!-- 빠른 공간 추가 (기존 폼 compact 버전) -->
<div class="card" style="padding:14px;margin-bottom:12px">
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span style="font-size:10px;color:#666;letter-spacing:.08em">빠른 추가</span>
    <input id="spName" type="text" placeholder="공간명 (예: 안방)" style="padding:5px 10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#ddd;font-size:11px;width:120px">
    <select id="spType" style="padding:5px 8px;background:rgba(3,3,5,.9);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#ddd;font-size:11px">
      <option value="living">거실</option><option value="bedroom">침실</option>
      <option value="kitchen">주방</option><option value="bathroom">욕실</option>
      <option value="balcony">발코니</option><option value="corridor">복도</option>
      <option value="stairs">계단</option><option value="utility">다용도실</option>
    </select>
    <input id="spW" type="number" placeholder="가로mm" style="padding:5px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#ddd;font-size:11px;width:90px">
    <input id="spL" type="number" placeholder="세로mm" style="padding:5px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#ddd;font-size:11px;width:90px">
    <input id="spH" type="number" value="2400" placeholder="천장고" style="padding:5px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#ddd;font-size:11px;width:80px">
    <button class="btn" style="padding:5px 16px;font-size:11px" onclick="fcQuickAdd()">+ 캔버스에 추가</button>
    <input id="spWinCount" type="hidden" value="0"><input id="spDoorCount" type="hidden" value="1">
    <div id="winSizeInputs" style="display:none"></div><div id="doorSizeInputs" style="display:none"></div>
    <input id="spCorners" type="hidden" value="4"><input id="spTileH" type="hidden" value="2400">
    <input id="spBeam" type="hidden" value="0">
  </div>
</div>

<!-- CAD 에디터 본체 -->
<div id="cad-editor">
  <!-- 도구바 -->
  <div id="cad-toolbar">
    <div class="cad-btn active" id="ct-select"  onclick="fcTool('select')">선택<span class="kbd">V</span></div>
    <div class="cad-btn"        id="ct-room"    onclick="fcTool('room')">공간<span class="kbd">R</span></div>
    <div class="cad-btn"        id="ct-door"    onclick="fcTool('door')">문<span class="kbd">D</span></div>
    <div class="cad-btn"        id="ct-window"  onclick="fcTool('window')">창호<span class="kbd">I</span></div>
    <div class="cad-btn"        id="ct-dim"     onclick="fcTool('dim')">치수<span class="kbd">M</span></div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn active"  id="ct-grid"   onclick="fcToggle('grid')">격자<span class="kbd">G</span></div>
    <div class="cad-btn active"  id="ct-snap"   onclick="fcToggle('snap')">스냅<span class="kbd">S</span></div>
    <div class="cad-btn"         id="ct-ortho"  onclick="fcToggle('ortho')">직교</div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn" onclick="fcZoom(1.2)">줌+<span class="kbd">+</span></div>
    <div class="cad-btn" onclick="fcZoom(0.83)">줌-<span class="kbd">-</span></div>
    <div class="cad-btn" onclick="fcFitAll()">전체<span class="kbd">F</span></div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn" onclick="fcUndo()">취소<span class="kbd">^Z</span></div>
    <div class="cad-btn" onclick="fcRedo()">재실행<span class="kbd">^Y</span></div>
    <div class="cad-btn" onclick="fcExportPNG()">PNG</div>
    <div class="cad-btn" onclick="fcExportDXF()">DXF</div>
    <div class="cad-tb-sep"></div>
    <div class="cad-btn" onclick="fcClearAll()" style="color:#ff4466">전체삭제</div>
  </div>
  <!-- 본체 -->
  <div id="cad-body">
    <div id="cad-canvas-wrap" style="position:relative">
      <canvas id="fc-canvas"></canvas>
      <div id="cad-overlay" style="position:absolute;top:6px;left:8px;font-size:10px;color:rgba(201,168,76,.6);font-family:monospace;pointer-events:none">
        <span id="fc-coord">0, 0 mm</span> &nbsp;|&nbsp; <span id="fc-tool-label">선택</span>
      </div>
    </div>
    <div id="cad-props">
      <div class="cad-ph">PROPERTIES</div>
      <div id="cad-props-content"><div style="color:#444;font-size:10px">요소를 선택하세요</div></div>
    </div>
  </div>
  <!-- 하단 합계 -->
  <div id="cad-summary">
    <div style="display:flex;gap:18px;flex-wrap:wrap">
      <div class="cad-sum-item"><span class="cad-sum-lbl">바닥</span><span class="cad-sum-val" id="cs-fa">0㎡</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">벽면</span><span class="cad-sum-val" id="cs-wa">0㎡</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">창호</span><span class="cad-sum-val" id="cs-win">0EA</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">문</span><span class="cad-sum-val" id="cs-door">0EA</span></div>
      <div class="cad-sum-item"><span class="cad-sum-lbl">공간수</span><span class="cad-sum-val" id="cs-rooms">0</span></div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn ghost" onclick="fcApply()" style="font-size:12px">견적 반영 →</button>
    </div>
  </div>
</div>

<!-- 숨김 공간 목록 (renderSpaceCards용) -->
<div id="space-cards-wrap" style="display:none"><div class="space-grid" id="space-cards"></div></div>
<div style="display:none">
  <span id="tot-fa">0 ㎡</span><span id="tot-wa">0 ㎡</span><span id="tot-ca">0 ㎡</span>
  <span id="tot-pr">0 m</span><span id="tot-win">0 EA</span><span id="tot-door">0 EA</span>
  <span id="tot-cor">0 개</span><span id="tot-wet">0 개</span>
</div>
</div>'''

p1_pat = re.compile(r'<div class="step-page" id="page1">.*?^</div>', re.DOTALL | re.MULTILINE)
m = p1_pat.search(html)
if m:
    html = html[:m.start()] + NEW_PAGE1 + html[m.end():]
    print('[2] page1 교체 OK')
else:
    print('[2] WARN: page1 없음')

# ──────────────────────────────────────────────────────────────────────
# 3. 이전 CAD JS IIFE 제거
# ──────────────────────────────────────────────────────────────────────
old_cad = re.search(
    r'// ={5,}=\s*\n// ECOREAN CAD EDITOR v2.*?\}\)\(\); // end IIFE — ECOREAN CAD v2\s*\n',
    html, re.DOTALL)
if old_cad:
    html = html[:old_cad.start()] + html[old_cad.end():]
    print('[3] 이전 CAD v2 JS 제거 OK')
else:
    print('[3] 이전 CAD v2 JS 없음')

# ──────────────────────────────────────────────────────────────────────
# 4. Fabric.js CAD JS
# ──────────────────────────────────────────────────────────────────────
FABRIC_JS = r"""
// ════════════════════════════════════════════════════════════════════
// ECOREAN FABRIC CAD v3  (STEP 2)  — Fabric.js 5.x
// ════════════════════════════════════════════════════════════════════
;(function(){
'use strict';

// ── 상수 ─────────────────────────────────────────────────────────
const MM2PX   = 0.06;   // 60px per 1000mm → 0.06px/mm
const PX2MM   = 1/MM2PX;
const SNAP_MM = 100;
const WALL_T  = 150;    // mm
const CEIL_H  = 2400;   // mm default
const MIN_MM  = 500;
const WIN_W   = 1200;   // default window mm
const DOOR_W  = 900;    // default door mm

const ROOM_FILL = {
  living:'rgba(90,173,255,0.18)',   bedroom:'rgba(160,100,255,0.18)',
  bathroom:'rgba(0,255,178,0.18)',  kitchen:'rgba(255,170,68,0.18)',
  balcony:'rgba(0,220,220,0.18)',   corridor:'rgba(150,150,150,0.18)',
  stairs:'rgba(130,100,80,0.18)',   attic:'rgba(200,180,100,0.18)',
  utility:'rgba(80,150,160,0.18)'
};
const ROOM_STROKE = {
  living:'rgba(90,173,255,0.7)',    bedroom:'rgba(160,100,255,0.7)',
  bathroom:'rgba(0,255,178,0.7)',   kitchen:'rgba(255,170,68,0.7)',
  balcony:'rgba(0,220,220,0.7)',    corridor:'rgba(150,150,150,0.6)',
  stairs:'rgba(130,100,80,0.6)',    attic:'rgba(200,180,100,0.6)',
  utility:'rgba(80,150,160,0.6)'
};
const TYPE_KO={living:'거실',bedroom:'침실',bathroom:'욕실',kitchen:'주방',balcony:'발코니',corridor:'복도·현관',stairs:'계단',attic:'다락',utility:'다용도실'};

// ── 상태 ─────────────────────────────────────────────────────────
let fc = null;  // fabric.Canvas
const FC = {
  tool:'select', grid:true, snap:true, ortho:false,
  undoStack:[], redoStack:[],
  preview:null,   // 그리기 중 미리보기 Rect
  dimStart:null,  // 치수 첫 점 {x,y} in fabric coords
  debounce:null,
  isPanning:false, lastMouse:{x:0,y:0},
};

// ── 초기화 ───────────────────────────────────────────────────────
function fcInit(){
  const wrap = document.getElementById('cad-canvas-wrap');
  if(!wrap || !window.fabric) { setTimeout(fcInit, 200); return; }

  const W = wrap.clientWidth - 220;  // props panel width
  const H = Math.max(500, window.innerHeight - 400);

  fc = new fabric.Canvas('fc-canvas', {
    width: W, height: H,
    selection: true,
    preserveObjectStacking: true,
    stopContextMenu: true,
    fireRightClick: true,
  });

  // 배경 + 격자 렌더
  fc._renderBackground = function(ctx){
    ctx.fillStyle = '#07070F';
    ctx.fillRect(0, 0, this.width, this.height);
    if(FC.grid) drawFcGrid(ctx, this.viewportTransform, this.width, this.height);
  };

  // 마우스 이벤트
  fc.on('mouse:down',  fcOnMouseDown);
  fc.on('mouse:move',  fcOnMouseMove);
  fc.on('mouse:up',    fcOnMouseUp);
  fc.on('mouse:wheel', fcOnWheel);

  // 선택/수정 이벤트
  fc.on('selection:created',  e=>fcUpdateProps(e.selected[0]));
  fc.on('selection:updated',  e=>fcUpdateProps(e.selected[0]));
  fc.on('selection:cleared',  ()=>fcUpdateProps(null));
  fc.on('object:modified',    ()=>{ fcSyncSummary(); fcDebounceApply(); });
  fc.on('object:moving',      fcOnObjectMoving);
  fc.on('object:scaling',     fcOnObjectScaling);

  // 키보드
  document.addEventListener('keydown', fcOnKey);

  // 리사이즈
  new ResizeObserver(()=>{
    if(!wrap) return;
    const nw=Math.max(400, wrap.clientWidth-220);
    const nh=Math.max(500, window.innerHeight-400);
    fc.setWidth(nw); fc.setHeight(nh); fc.renderAll();
  }).observe(wrap);

  // 로컬스토리지 복원
  fcLoad();
  if(!fc.getObjects().filter(o=>o.spaceData).length) fcSyncFromSpaces();
  fcSyncSummary();
}

// ── 격자 그리기 ─────────────────────────────────────────────────
function drawFcGrid(ctx, vpt, W, H){
  const scale = vpt[0];  // zoom level
  const ox=vpt[4], oy=vpt[5];
  const minor=SNAP_MM*MM2PX, major=1000*MM2PX;
  const minorPx=minor*scale, majorPx=major*scale;

  ctx.save();
  // 마이너 격자 (100mm) — 충분히 크면
  if(minorPx>=4){
    ctx.strokeStyle='rgba(201,168,76,0.06)';ctx.lineWidth=0.5;
    ctx.beginPath();
    const sx=(ox%minorPx+minorPx)%minorPx;
    const sy=(oy%minorPx+minorPx)%minorPx;
    for(let x=sx;x<W;x+=minorPx){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(let y=sy;y<H;y+=minorPx){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();
  }
  // 메이저 격자 (1000mm)
  if(majorPx>=4){
    ctx.strokeStyle='rgba(201,168,76,0.18)';ctx.lineWidth=0.8;
    ctx.beginPath();
    const sx=(ox%majorPx+majorPx)%majorPx;
    const sy=(oy%majorPx+majorPx)%majorPx;
    for(let x=sx;x<W;x+=majorPx){ctx.moveTo(x,0);ctx.lineTo(x,H);}
    for(let y=sy;y<H;y+=majorPx){ctx.moveTo(0,y);ctx.lineTo(W,y);}
    ctx.stroke();
  }
  // 원점 십자
  ctx.strokeStyle='rgba(201,168,76,0.3)';ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(ox,0);ctx.lineTo(ox,H);
  ctx.moveTo(0,oy);ctx.lineTo(W,oy);
  ctx.stroke();
  ctx.restore();
}

// ── 좌표 변환 ────────────────────────────────────────────────────
function sc2fc(e){  // screen event → fabric canvas coords (accounting for zoom/pan)
  return fc.getPointer(e.e||e);
}
function snapToGrid(x, y){
  if(!FC.snap) return {x,y};
  const snapPx = SNAP_MM * MM2PX;
  return {x: Math.round(x/snapPx)*snapPx, y: Math.round(y/snapPx)*snapPx};
}
function applyOrtho(ex, ey, sx, sy){
  if(!FC.ortho) return {x:ex, y:ey};
  const dx=Math.abs(ex-sx), dy=Math.abs(ey-sy);
  return dx>dy ? {x:ex,y:sy} : {x:sx,y:ey};
}

// ── 마우스 이벤트 ────────────────────────────────────────────────
function fcOnMouseDown(e){
  const pt = sc2fc(e);
  const snapped = snapToGrid(pt.x, pt.y);

  if(FC.tool==='select') return;

  if(e.e.altKey||e.e.button===1||e.e.button===2){
    FC.isPanning=true; FC.lastMouse={x:e.e.clientX,y:e.e.clientY};
    fc.defaultCursor='grabbing'; fc.selection=false; return;
  }

  fc.selection=false;
  fc.forEachObject(o=>{ o.selectable=false; o.evented=false; });

  if(FC.tool==='room'){
    FC.preview=new fabric.Rect({
      left:snapped.x, top:snapped.y, width:0, height:0,
      fill:'rgba(201,168,76,0.05)', stroke:'rgba(201,168,76,0.7)',
      strokeWidth:1.5, strokeDashArray:[5,4],
      selectable:false, evented:false, id:'_preview'
    });
    FC.drawStart={x:snapped.x, y:snapped.y};
    fc.add(FC.preview);
    fc.renderAll();
  } else if(FC.tool==='door'||FC.tool==='window'){
    const room=fcFindRoomAtWall(snapped.x, snapped.y);
    if(room){
      pushUndo();
      if(FC.tool==='door') fcPlaceDoor(room, snapped.x, snapped.y);
      else                  fcPlaceWindow(room, snapped.x, snapped.y);
    }
  } else if(FC.tool==='dim'){
    if(!FC.dimStart){ FC.dimStart={x:snapped.x,y:snapped.y}; }
    else {
      pushUndo();
      fcCreateDim(FC.dimStart.x,FC.dimStart.y,snapped.x,snapped.y);
      FC.dimStart=null;
    }
  }
}

function fcOnMouseMove(e){
  const pt = sc2fc(e);
  let snapped = snapToGrid(pt.x, pt.y);

  // 좌표 표시
  const mmX=Math.round(snapped.x*PX2MM), mmY=Math.round(snapped.y*PX2MM);
  const coordEl=document.getElementById('fc-coord');
  if(coordEl) coordEl.textContent=`${mmX}, ${mmY} mm`;

  if(FC.isPanning){
    const dx=e.e.clientX-FC.lastMouse.x, dy=e.e.clientY-FC.lastMouse.y;
    fc.relativePan(new fabric.Point(dx,dy));
    FC.lastMouse={x:e.e.clientX,y:e.e.clientY};
    return;
  }

  if(FC.tool==='room'&&FC.drawStart&&FC.preview){
    let ex=snapped.x, ey=snapped.y;
    if(e.e.shiftKey||FC.ortho){const o=applyOrtho(ex,ey,FC.drawStart.x,FC.drawStart.y);ex=o.x;ey=o.y;}
    const x=Math.min(FC.drawStart.x,ex), y=Math.min(FC.drawStart.y,ey);
    const w=Math.abs(ex-FC.drawStart.x), h=Math.abs(ey-FC.drawStart.y);
    FC.preview.set({left:x,top:y,width:w,height:h});
    // 치수 텍스트 on preview
    const wMm=Math.round(w*PX2MM), hMm=Math.round(h*PX2MM);
    FC.preview.set('text', `${wMm}×${hMm}mm`);
    fc.renderAll();
    // 치수 오버레이
    if(coordEl) coordEl.textContent=`${wMm}×${hMm} mm (그리는 중)`;
  }
}

function fcOnMouseUp(e){
  FC.isPanning=false;
  fc.defaultCursor='default';

  if(FC.tool==='room'&&FC.drawStart&&FC.preview){
    const pt=sc2fc(e);
    let snapped=snapToGrid(pt.x,pt.y);
    let ex=snapped.x, ey=snapped.y;
    if(e.e.shiftKey||FC.ortho){const o=applyOrtho(ex,ey,FC.drawStart.x,FC.drawStart.y);ex=o.x;ey=o.y;}
    const x=Math.min(FC.drawStart.x,ex), y=Math.min(FC.drawStart.y,ey);
    const w=Math.abs(ex-FC.drawStart.x), h=Math.abs(ey-FC.drawStart.y);

    fc.remove(FC.preview);
    FC.preview=null; FC.drawStart=null;
    fc.renderAll();

    const wMm=Math.round(w*PX2MM), hMm=Math.round(h*PX2MM);
    if(wMm<MIN_MM||hMm<MIN_MM){
      fcRestoreSelect(); return;
    }
    fcShowNamePopup(x, y, w, h, wMm, hMm);
  } else {
    fcRestoreSelect();
  }
}

function fcOnWheel(e){
  e.e.preventDefault();
  const delta=e.e.deltaY;
  let zoom=fc.getZoom();
  zoom*=delta<0?1.1:0.91;
  zoom=Math.min(5,Math.max(0.1,zoom));
  const pt=new fabric.Point(e.e.offsetX, e.e.offsetY);
  fc.zoomToPoint(pt, zoom);
}

function fcOnObjectMoving(e){
  if(!FC.snap) return;
  const obj=e.target;
  const snapPx=SNAP_MM*MM2PX;
  obj.set({
    left: Math.round(obj.left/snapPx)*snapPx,
    top:  Math.round(obj.top/snapPx)*snapPx
  });
}

function fcOnObjectScaling(e){
  // 스케일링 중 치수 업데이트
  const obj=e.target;
  if(!obj.spaceData) return;
  const wMm=Math.round(obj.getScaledWidth()*PX2MM);
  const hMm=Math.round(obj.getScaledHeight()*PX2MM);
  // 내부 텍스트 업데이트
  const items=obj._objects||[];
  items.forEach(o=>{
    if(o.fcRole==='nameText') o.set('text', obj.spaceData.name);
    if(o.fcRole==='areaText') o.set('text', (wMm/1000*hMm/1000).toFixed(2)+'㎡');
  });
}

// ── 공간 생성 ────────────────────────────────────────────────────
function fcCreateRoom(fx, fy, wpx, hpx, name, type, ceilH, extraData){
  pushUndo();
  const id='room_'+Date.now().toString(36);
  const fill = ROOM_FILL[type]||'rgba(100,100,100,0.18)';
  const stroke = ROOM_STROKE[type]||'rgba(200,200,200,0.6)';
  const wallPx = WALL_T*MM2PX;

  // 외곽 (벽)
  const outer=new fabric.Rect({width:wpx,height:hpx,
    fill:'transparent',stroke,strokeWidth:2,
    left:0,top:0,originX:'left',originY:'top'});
  // 내부 채우기
  const inner=new fabric.Rect({
    left:wallPx,top:wallPx,
    width:Math.max(1,wpx-wallPx*2),height:Math.max(1,hpx-wallPx*2),
    fill,strokeWidth:0,originX:'left',originY:'top'});
  inner.fcRole='inner';
  // 공간명
  const fs=Math.max(9,Math.min(14,wpx/8));
  const nameT=new fabric.Text(name,{
    left:wpx/2,top:hpx/2-fs*0.8,fontSize:fs,
    fill:'rgba(255,255,255,0.85)',fontFamily:'Inter,sans-serif',fontWeight:'bold',
    originX:'center',originY:'center',selectable:false,evented:false});
  nameT.fcRole='nameText';
  // 면적
  const fa=(wpx*PX2MM/1000 * hpx*PX2MM/1000).toFixed(2);
  const areaT=new fabric.Text(fa+'㎡',{
    left:wpx/2,top:hpx/2+fs*0.6,fontSize:Math.max(8,fs-2),
    fill:'rgba(201,168,76,0.9)',fontFamily:'JetBrains Mono,monospace',
    originX:'center',originY:'center',selectable:false,evented:false});
  areaT.fcRole='areaText';

  const grp=new fabric.Group([outer,inner,nameT,areaT],{
    left:fx, top:fy,
    selectable:true, evented:true, hasControls:true,
    lockRotation:true,
    borderColor:'#C9A84C', cornerColor:'#C9A84C', cornerSize:8,
    transparentCorners:false,
  });
  grp.spaceData={id,name,type,ceilH:ceilH||CEIL_H,wet:type==='bathroom',
    windows:[],doors:[{w:DOOR_W,h:2100}],...(extraData||{})};
  fc.add(grp);

  // S.spaces 추가
  S.spaces.push({
    id, name, type,
    width:Math.round(wpx*PX2MM), length:Math.round(hpx*PX2MM),
    height:ceilH||CEIL_H,
    windows:[], doors:[{w:DOOR_W,h:2100}],
    corners:4, wet:type==='bathroom', roof:false, floor2:false,
    tileH:2400, beamH:0
  });

  fc.setActiveObject(grp);
  fc.renderAll();
  fcSyncSummary();
  fcUpdateProps(grp);
  return grp;
}

// ── 이름 팝업 ─────────────────────────────────────────────────
function fcShowNamePopup(fx, fy, fpx_w, fpx_h, wMm, hMm){
  document.getElementById('fc-name-popup')?.remove();
  const wrap=document.getElementById('cad-canvas-wrap');
  const popup=document.createElement('div');
  popup.id='fc-name-popup';
  // fabric canvas absolute position inside wrap
  const cx=fc.viewportTransform[4]+fx*fc.getZoom();
  const cy=fc.viewportTransform[5]+fy*fc.getZoom();
  popup.style.cssText=`position:absolute;top:${Math.max(8,cy)}px;left:${Math.max(8,cx)}px;
    background:rgba(3,3,5,.97);border:1px solid rgba(201,168,76,.5);border-radius:8px;
    padding:12px 14px;z-index:200;min-width:210px;box-shadow:0 4px 24px rgba(0,0,0,.6)`;
  popup.innerHTML=`
    <div style="font-size:11px;color:#C9A84C;font-weight:700;margin-bottom:8px">공간 추가 — ${wMm}×${hMm}mm</div>
    <input id="fnp-name" type="text" placeholder="공간명" value=""
      style="width:100%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);
      border-radius:5px;padding:5px 8px;color:#ddd;font-size:11px;margin-bottom:6px;box-sizing:border-box">
    <select id="fnp-type" style="width:100%;background:rgba(3,3,5,.9);border:1px solid rgba(255,255,255,.15);
      border-radius:5px;padding:5px 8px;color:#ddd;font-size:11px;margin-bottom:8px;box-sizing:border-box">
      <option value="living">거실</option><option value="bedroom">침실</option>
      <option value="kitchen">주방</option><option value="bathroom">욕실</option>
      <option value="balcony">발코니</option><option value="corridor">복도·현관</option>
      <option value="stairs">계단</option><option value="utility">다용도실</option>
    </select>
    <div style="display:flex;gap:6px">
      <button id="fnp-ok" style="flex:1;padding:6px;background:rgba(201,168,76,.25);border:1px solid #C9A84C;
        border-radius:5px;color:#C9A84C;cursor:pointer;font-size:11px">추가</button>
      <button onclick="document.getElementById('fc-name-popup').remove();fcRestoreSelect()"
        style="flex:1;padding:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);
        border-radius:5px;color:#888;cursor:pointer;font-size:11px">취소</button>
    </div>`;
  wrap.appendChild(popup);
  const nameInput=document.getElementById('fnp-name');
  nameInput.focus();
  const confirm=()=>{
    const nm=(nameInput.value||'').trim()||'공간';
    const tp=document.getElementById('fnp-type').value;
    popup.remove();
    fcCreateRoom(fx, fy, fpx_w, fpx_h, nm, tp);
    fcRestoreSelect();
  };
  document.getElementById('fnp-ok').onclick=confirm;
  nameInput.addEventListener('keydown',e=>{ if(e.key==='Enter') confirm(); });
}

function fcRestoreSelect(){
  fc.selection=true;
  fc.forEachObject(o=>{ if(o.id!=='_preview'){ o.selectable=true; o.evented=true; } });
  fc.renderAll();
}

// ── 문 배치 ──────────────────────────────────────────────────────
function fcFindRoomAtWall(fx, fy){
  const thr=20;
  let best=null, bestD=thr;
  fc.getObjects().forEach(obj=>{
    if(!obj.spaceData) return;
    const l=obj.left, t=obj.top;
    const w=obj.getScaledWidth(), h=obj.getScaledHeight();
    const dists=[
      {wall:'top',    d:Math.abs(fy-t),     inR:fx>=l&&fx<=l+w},
      {wall:'bottom', d:Math.abs(fy-(t+h)), inR:fx>=l&&fx<=l+w},
      {wall:'left',   d:Math.abs(fx-l),     inR:fy>=t&&fy<=t+h},
      {wall:'right',  d:Math.abs(fx-(l+w)), inR:fy>=t&&fy<=t+h},
    ];
    dists.forEach(dw=>{
      if(dw.inR&&dw.d<bestD){ bestD=dw.d; best={obj,wall:dw.wall,fx,fy}; }
    });
  });
  return best;
}

function fcPlaceDoor(roomHit, fx, fy){
  const obj=roomHit.obj;
  const l=obj.left, t=obj.top;
  const w=obj.getScaledWidth(), h=obj.getScaledHeight();
  const dWpx=DOOR_W*MM2PX;
  let dx=fx, dy=fy;
  const isH=(roomHit.wall==='top'||roomHit.wall==='bottom');

  // 여닫이 아크 path
  const pathStr=isH
    ? `M 0 0 L ${dWpx} 0 M ${dWpx} 0 A ${dWpx} ${dWpx} 0 0 0 0 ${dWpx}`
    : `M 0 0 L 0 ${dWpx} M 0 ${dWpx} A ${dWpx} ${dWpx} 0 0 1 ${dWpx} 0`;
  const door=new fabric.Path(pathStr,{
    stroke:'#C9A84C',strokeWidth:1.5,fill:'',
    left:dx-(isH?dWpx/2:0), top:dy-(isH?0:dWpx/2),
    selectable:true,evented:true,lockRotation:true,
    hasControls:false,
    borderColor:'#FFD700',
  });
  door.doorData={type:'swing',w:DOOR_W,roomId:obj.spaceData.id,wall:roomHit.wall};
  fc.add(door);
  // 해당 공간 doors 카운트
  const sp=S.spaces.find(s=>s.id===obj.spaceData.id);
  if(sp){ if(!sp.doors) sp.doors=[]; sp.doors.push({w:DOOR_W,h:2100}); }
  fc.renderAll(); fcSyncSummary();
}

// ── 창호 배치 ────────────────────────────────────────────────────
function fcPlaceWindow(roomHit, fx, fy){
  const wWpx=WIN_W*MM2PX;
  const isH=(roomHit.wall==='top'||roomHit.wall==='bottom');
  const outer=new fabric.Rect({
    left:0, top:0,
    width: isH?wWpx:8, height: isH?8:wWpx,
    fill:'rgba(90,173,255,0.1)',stroke:'rgba(90,173,255,0.8)',strokeWidth:1.5
  });
  const midLine=new fabric.Line(
    isH?[wWpx/2,0,wWpx/2,8]:[0,wWpx/2,8,wWpx/2],
    {stroke:'rgba(90,173,255,0.8)',strokeWidth:1}
  );
  const win=new fabric.Group([outer,midLine],{
    left:fx-(isH?wWpx/2:0), top:fy-(isH?4:wWpx/2),
    selectable:true,evented:true,lockRotation:true,
    hasControls:false,borderColor:'#5aadff',
  });
  win.winData={type:'slide',w:WIN_W,roomId:roomHit.obj.spaceData.id,wall:roomHit.wall};
  fc.add(win);
  const sp=S.spaces.find(s=>s.id===roomHit.obj.spaceData.id);
  if(sp){ if(!sp.windows) sp.windows=[]; sp.windows.push({w:WIN_W,h:1200}); }
  fc.renderAll(); fcSyncSummary();
}

// ── 치수선 ───────────────────────────────────────────────────────
function fcCreateDim(x1,y1,x2,y2){
  const off=20;
  const dx=x2-x1, dy=y2-y1;
  const len=Math.hypot(dx,dy); if(len<5) return;
  const nx=-dy/len*off, ny=dx/len*off;
  const distMm=Math.round(len*PX2MM);
  const line=new fabric.Line([x1+nx,y1+ny,x2+nx,y2+ny],{
    stroke:'#C9A84C',strokeWidth:1,selectable:false,evented:false
  });
  const label=new fabric.Text(distMm+'mm',{
    left:(x1+x2)/2+nx, top:(y1+y2)/2+ny-8,
    fontSize:9,fill:'#C9A84C',fontFamily:'JetBrains Mono,monospace',
    originX:'center',originY:'bottom',selectable:false,evented:false,
    backgroundColor:'rgba(7,7,15,0.7)'
  });
  fc.add(line, label);
  fc.renderAll();
}

// ── Properties 패널 ──────────────────────────────────────────────
function fcUpdateProps(obj){
  const el=document.getElementById('cad-props-content'); if(!el) return;
  if(!obj||(!obj.spaceData&&!obj.doorData&&!obj.winData)){
    el.innerHTML='<div style="color:#444;font-size:10px;padding:4px">요소를 선택하세요</div>';
    return;
  }
  if(obj.spaceData){
    const d=obj.spaceData;
    const wMm=Math.round(obj.getScaledWidth()*PX2MM);
    const hMm=Math.round(obj.getScaledHeight()*PX2MM);
    const fa=(wMm/1000*hMm/1000).toFixed(2);
    const wa=((2*(wMm+hMm)/1000)*((d.ceilH||CEIL_H)/1000)).toFixed(2);
    const dCnt=fc.getObjects().filter(o=>o.doorData&&o.doorData.roomId===d.id).length;
    const wCnt=fc.getObjects().filter(o=>o.winData&&o.winData.roomId===d.id).length;
    el.innerHTML=`
      <div class="cad-prow"><label>이름</label>
        <input value="${d.name}" onchange="fcPropSet('name',this.value)"></div>
      <div class="cad-prow"><label>유형</label>
        <select onchange="fcPropSet('type',this.value)">
          ${Object.entries(TYPE_KO).map(([v,k])=>`<option value="${v}"${d.type===v?' selected':''}>${k}</option>`).join('')}
        </select></div>
      <div class="cad-prow"><label>가로 mm</label>
        <input type="number" value="${wMm}" onchange="fcPropResize('w',+this.value)"></div>
      <div class="cad-prow"><label>세로 mm</label>
        <input type="number" value="${hMm}" onchange="fcPropResize('h',+this.value)"></div>
      <div class="cad-prow"><label>천장고 mm</label>
        <input type="number" value="${d.ceilH||CEIL_H}" onchange="fcPropSet('ceilH',+this.value)"></div>
      <hr style="border-color:rgba(255,255,255,.06);margin:8px 0">
      <div class="cad-prow"><label>면적</label><div class="cad-pval">${fa} ㎡</div></div>
      <div class="cad-prow"><label>벽면적</label><div class="cad-pval">${wa} ㎡</div></div>
      <div class="cad-prow"><label>창호</label><div class="cad-pval">${wCnt} EA</div></div>
      <div class="cad-prow"><label>문</label><div class="cad-pval">${dCnt} EA</div></div>
      <hr style="border-color:rgba(255,255,255,.06);margin:8px 0">
      <label class="cad-chk"><input type="checkbox" ${d.wet?'checked':''} onchange="fcPropSet('wet',this.checked)"> 습식</label>
      <label class="cad-chk"><input type="checkbox" ${d.roof?'checked':''} onchange="fcPropSet('roof',this.checked)"> 경사천장</label>
      <hr style="border-color:rgba(255,255,255,.06);margin:8px 0">
      <div style="display:flex;gap:6px">
        <button class="cad-btn" style="flex:1" onclick="fcDeleteSel()">삭제</button>
        <button class="cad-btn" style="flex:1" onclick="fcDuplicate()">복사</button>
      </div>`;
  } else if(obj.doorData){
    const d=obj.doorData;
    el.innerHTML=`
      <div class="cad-prow"><label>종류</label>
        <select onchange="fcDoorProp('type',this.value)">
          <option value="swing"${d.type==='swing'?' selected':''}>여닫이</option>
          <option value="slide"${d.type==='slide'?' selected':''}>미서기</option>
          <option value="double"${d.type==='double'?' selected':''}>쌍문</option>
        </select></div>
      <div class="cad-prow"><label>너비 mm</label>
        <input type="number" value="${d.w||DOOR_W}" onchange="fcDoorProp('w',+this.value)"></div>
      <button class="cad-btn" style="width:100%;margin-top:8px" onclick="fcDeleteSel()">삭제</button>`;
  } else if(obj.winData){
    const d=obj.winData;
    el.innerHTML=`
      <div class="cad-prow"><label>종류</label>
        <select onchange="fcWinProp('type',this.value)">
          <option value="slide"${d.type==='slide'?' selected':''}>미서기</option>
          <option value="double"${d.type==='double'?' selected':''}>이중</option>
          <option value="swing"${d.type==='swing'?' selected':''}>여닫이</option>
          <option value="fixed"${d.type==='fixed'?' selected':''}>고정</option>
        </select></div>
      <div class="cad-prow"><label>너비 mm</label>
        <input type="number" value="${d.w||WIN_W}" onchange="fcWinProp('w',+this.value)"></div>
      <button class="cad-btn" style="width:100%;margin-top:8px" onclick="fcDeleteSel()">삭제</button>`;
  }
}

window.fcPropSet=function(key,val){
  const obj=fc.getActiveObject(); if(!obj||!obj.spaceData) return;
  obj.spaceData[key]=val;
  if(key==='name'){
    const items=obj._objects||[];
    items.forEach(o=>{ if(o.fcRole==='nameText') o.set('text',val); });
    fc.renderAll();
  }
  if(key==='type'){
    obj.spaceData.wet=(val==='bathroom');
    const items=obj._objects||[];
    items.forEach(o=>{
      if(o.fcRole==='inner') o.set('fill',ROOM_FILL[val]||'rgba(100,100,100,0.18)');
    });
    const outer=items.find(o=>o.type==='rect'&&!o.fcRole);
    if(outer) outer.set('stroke',ROOM_STROKE[val]||'rgba(200,200,200,0.6)');
    fc.renderAll();
  }
  fcSyncSingleSpace(obj);
  fcDebounceApply();
};
window.fcPropResize=function(key,valMm){
  const obj=fc.getActiveObject(); if(!obj||!obj.spaceData) return;
  if(valMm<MIN_MM) return;
  const valPx=valMm*MM2PX;
  const items=obj._objects||[];
  const outer=items[0]; // first rect = outer
  if(key==='w'){
    obj.scaleX=valPx/obj.width;
    outer&&outer.set('width',valPx);
    items.find(o=>o.fcRole==='inner')?.set('width',Math.max(1,valPx-WALL_T*MM2PX*2));
  } else {
    obj.scaleY=valPx/obj.height;
    outer&&outer.set('height',valPx);
    items.find(o=>o.fcRole==='inner')?.set('height',Math.max(1,valPx-WALL_T*MM2PX*2));
  }
  // 면적 텍스트 업데이트
  const wMm=Math.round(obj.getScaledWidth()*PX2MM);
  const hMm=Math.round(obj.getScaledHeight()*PX2MM);
  items.find(o=>o.fcRole==='areaText')?.set('text',(wMm/1000*hMm/1000).toFixed(2)+'㎡');
  fc.renderAll(); fcSyncSingleSpace(obj); fcSyncSummary();
};
window.fcDoorProp=function(key,val){
  const obj=fc.getActiveObject(); if(!obj||!obj.doorData) return;
  obj.doorData[key]=val; fcDebounceApply();
};
window.fcWinProp=function(key,val){
  const obj=fc.getActiveObject(); if(!obj||!obj.winData) return;
  obj.winData[key]=val; fcDebounceApply();
};
window.fcDeleteSel=function(){
  const obj=fc.getActiveObject(); if(!obj) return;
  pushUndo();
  if(obj.spaceData){
    const id=obj.spaceData.id;
    S.spaces=S.spaces.filter(s=>s.id!==id);
    // 관련 문/창호도 제거
    fc.getObjects().filter(o=>(o.doorData&&o.doorData.roomId===id)||(o.winData&&o.winData.roomId===id))
      .forEach(o=>fc.remove(o));
  }
  fc.remove(obj);
  fc.discardActiveObject();
  fc.renderAll();
  fcUpdateProps(null);
  fcSyncSummary();
  if(typeof renderSpaceCards==='function') renderSpaceCards();
};
window.fcDuplicate=function(){
  const obj=fc.getActiveObject(); if(!obj||!obj.spaceData) return;
  pushUndo();
  const d=obj.spaceData;
  const wPx=obj.getScaledWidth(), hPx=obj.getScaledHeight();
  fcCreateRoom(obj.left+40,obj.top+40,wPx,hPx,d.name+'(복)',d.type,d.ceilH);
};

// ── S.spaces 동기화 ──────────────────────────────────────────────
function fcSyncSingleSpace(obj){
  if(!obj.spaceData) return;
  const d=obj.spaceData;
  const wMm=Math.round(obj.getScaledWidth()*PX2MM);
  const hMm=Math.round(obj.getScaledHeight()*PX2MM);
  const sp=S.spaces.find(s=>s.id===d.id);
  if(sp){ sp.name=d.name; sp.type=d.type; sp.width=wMm; sp.length=hMm; sp.height=d.ceilH||CEIL_H; sp.wet=d.wet; }
}

function fcSyncToSpaces(){
  // 캔버스 상태 → S.spaces 완전 재구성
  const newSpaces=[];
  fc.getObjects().forEach(obj=>{
    if(!obj.spaceData) return;
    const d=obj.spaceData;
    const wMm=Math.round(obj.getScaledWidth()*PX2MM);
    const hMm=Math.round(obj.getScaledHeight()*PX2MM);
    const dCnt=fc.getObjects().filter(o=>o.doorData&&o.doorData.roomId===d.id).length;
    const wCnt=fc.getObjects().filter(o=>o.winData&&o.winData.roomId===d.id).length;
    newSpaces.push({
      id:d.id, name:d.name, type:d.type,
      width:wMm, length:hMm, height:d.ceilH||CEIL_H,
      windows:Array.from({length:wCnt},()=>({w:WIN_W,h:1200})),
      doors:Array.from({length:Math.max(1,dCnt)},()=>({w:DOOR_W,h:2100})),
      corners:4, wet:d.wet||d.type==='bathroom', roof:d.roof||false, floor2:d.floor2||false,
      tileH:2400, beamH:0
    });
  });
  S.spaces=newSpaces;
}

function fcSyncFromSpaces(){
  if(!S||!S.spaces||!S.spaces.length) return;
  let cx=20, cy=20;
  S.spaces.forEach((sp,i)=>{
    const wPx=(sp.width||3000)*MM2PX;
    const hPx=(sp.length||3000)*MM2PX;
    const id=sp.id||('room_'+i);
    sp.id=id;
    if(!fc.getObjects().find(o=>o.spaceData&&o.spaceData.id===id)){
      fcCreateRoom(cx, cy, wPx, hPx, sp.name||(sp.type||'공간')+(i+1), sp.type||'living', sp.height||CEIL_H, {wet:sp.wet,roof:sp.roof,floor2:sp.floor2});
      cx+=wPx+30;
      if(cx>fc.width-wPx-20){ cx=20; cy+=hPx+30; }
    }
  });
  fc.renderAll();
}

function fcSyncSummary(){
  let totalFa=0, totalWa=0;
  fc.getObjects().forEach(obj=>{
    if(!obj.spaceData) return;
    const wMm=obj.getScaledWidth()*PX2MM;
    const hMm=obj.getScaledHeight()*PX2MM;
    totalFa+=wMm/1000*hMm/1000;
    const ceilH=(obj.spaceData.ceilH||CEIL_H)/1000;
    totalWa+=(2*(wMm+hMm)/1000)*ceilH;
  });
  const winCnt=fc.getObjects().filter(o=>o.winData).length;
  const doorCnt=fc.getObjects().filter(o=>o.doorData).length;
  const roomCnt=fc.getObjects().filter(o=>o.spaceData).length;
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  s('cs-fa',totalFa.toFixed(1)+'㎡'); s('cs-wa',totalWa.toFixed(1)+'㎡');
  s('cs-win',winCnt+'EA'); s('cs-door',doorCnt+'EA'); s('cs-rooms',roomCnt+'');
  // 숨김 tot-* 업데이트
  s('tot-fa',totalFa.toFixed(1)+' ㎡'); s('tot-wa',totalWa.toFixed(1)+' ㎡');
  s('tot-win',winCnt+' EA'); s('tot-door',doorCnt+' EA');
  s('tot-wet',fc.getObjects().filter(o=>o.spaceData&&(o.spaceData.wet||o.spaceData.type==='bathroom')).length+' 개');
}

// ── Undo / Redo ───────────────────────────────────────────────
function pushUndo(){
  const json=JSON.stringify(fc.toJSON(['spaceData','doorData','winData','fcRole']));
  FC.undoStack.push(json);
  if(FC.undoStack.length>30) FC.undoStack.shift();
  FC.redoStack=[];
}
window.fcUndo=function(){
  if(!FC.undoStack.length) return;
  FC.redoStack.push(JSON.stringify(fc.toJSON(['spaceData','doorData','winData','fcRole'])));
  const prev=JSON.parse(FC.undoStack.pop());
  fc.loadFromJSON(prev,()=>{ fc.renderAll(); fcSyncSummary(); fcUpdateProps(null); });
};
window.fcRedo=function(){
  if(!FC.redoStack.length) return;
  FC.undoStack.push(JSON.stringify(fc.toJSON(['spaceData','doorData','winData','fcRole'])));
  const next=JSON.parse(FC.redoStack.pop());
  fc.loadFromJSON(next,()=>{ fc.renderAll(); fcSyncSummary(); fcUpdateProps(null); });
};

// ── 디바운스 자동 반영 ────────────────────────────────────────
function fcDebounceApply(){
  clearTimeout(FC.debounce);
  FC.debounce=setTimeout(()=>{ fcSyncToSpaces(); if(typeof recalc==='function') recalc(); },500);
}

// ── 공개 함수 ────────────────────────────────────────────────
window.fcTool=function(t){
  FC.tool=t;
  document.querySelectorAll('[id^="ct-"]').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('ct-'+t); if(el) el.classList.add('active');
  const cursors={select:'default',room:'crosshair',door:'crosshair',window:'crosshair',dim:'crosshair'};
  fc.defaultCursor=cursors[t]||'crosshair';
  if(t==='select'){ fc.selection=true; fc.forEachObject(o=>{ o.selectable=true; o.evented=true; }); }
  else { fc.discardActiveObject(); fc.selection=false; }
  document.getElementById('fc-tool-label').textContent={select:'선택',room:'공간그리기',door:'문',window:'창호',dim:'치수'}[t]||t;
  FC.dimStart=null;
  fc.renderAll();
};
window.fcToggle=function(key){
  FC[key]=!FC[key];
  const el=document.getElementById('ct-'+key); if(el) el.classList.toggle('active',FC[key]);
  if(key==='grid') fc.renderAll();
};
window.fcZoom=function(f){
  const z=Math.min(5,Math.max(0.1,fc.getZoom()*f));
  fc.zoomToPoint(new fabric.Point(fc.width/2,fc.height/2),z);
};
window.fcFitAll=function(){
  const rooms=fc.getObjects().filter(o=>o.spaceData);
  if(!rooms.length){ fc.setViewportTransform([1,0,0,1,40,40]); fc.renderAll(); return; }
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  rooms.forEach(r=>{
    const l=r.left,t=r.top,w=r.getScaledWidth(),h=r.getScaledHeight();
    minX=Math.min(minX,l); maxX=Math.max(maxX,l+w);
    minY=Math.min(minY,t); maxY=Math.max(maxY,t+h);
  });
  const pad=60, rangeX=maxX-minX+pad*2, rangeY=maxY-minY+pad*2;
  const scale=Math.min(4,Math.min((fc.width-40)/rangeX,(fc.height-40)/rangeY));
  fc.setZoom(scale);
  fc.absolutePan(new fabric.Point((minX-pad)*scale-fc.width/2+rangeX*scale/2,
                                   (minY-pad)*scale-fc.height/2+rangeY*scale/2));
};
window.fcApply=function(){
  fcSyncToSpaces();
  if(typeof renderSpaceCards==='function') renderSpaceCards();
  if(typeof updateBathroomScopes==='function') updateBathroomScopes();
  if(typeof recalc==='function') recalc();
  fcSave();
  if(typeof st==='function') st('견적 반영 완료 — '+fc.getObjects().filter(o=>o.spaceData).length+'개 공간');
};
window.fcClearAll=function(){
  if(!confirm('모든 도면을 삭제합니까?')) return;
  pushUndo(); fc.clear(); S.spaces=[];
  fcSyncSummary(); fcUpdateProps(null);
  if(typeof renderSpaceCards==='function') renderSpaceCards();
};
window.fcExportPNG=function(){
  fc.renderAll();
  const a=document.createElement('a');
  a.download='floorplan.png'; a.href=fc.toDataURL({format:'png',multiplier:1}); a.click();
};
window.fcExportDXF=function(){
  let dxf='0\nSECTION\n2\nENTITIES\n';
  fc.getObjects().forEach(obj=>{
    if(obj.spaceData){
      const l=obj.left,t=obj.top,w=obj.getScaledWidth()*PX2MM,h=obj.getScaledHeight()*PX2MM;
      const x0=l*PX2MM,y0=t*PX2MM,x1=(l+obj.getScaledWidth())*PX2MM,y1=(t+obj.getScaledHeight())*PX2MM;
      [[x0,y0,x1,y0],[x1,y0,x1,y1],[x1,y1,x0,y1],[x0,y1,x0,y0]].forEach(([ax,ay,bx,by])=>{
        dxf+=`0\nLINE\n8\nROOMS\n10\n${ax}\n20\n${-ay}\n30\n0\n11\n${bx}\n21\n${-by}\n31\n0\n`;
      });
      dxf+=`0\nTEXT\n8\nLABELS\n10\n${x0+w/2}\n20\n${-(y0+h/2)}\n30\n0\n40\n200\n1\n${obj.spaceData.name}\n`;
    }
  });
  dxf+='0\nENDSEC\n0\nEOF\n';
  const b=new Blob([dxf],{type:'text/plain'});
  const a=document.createElement('a'); a.download='floorplan.dxf'; a.href=URL.createObjectURL(b); a.click();
};

// ── 빠른 추가 (폼) ────────────────────────────────────────────
window.fcQuickAdd=function(){
  const nm=(document.getElementById('spName')?.value||'').trim()||'공간';
  const tp=document.getElementById('spType')?.value||'living';
  const wMm=parseFloat(document.getElementById('spW')?.value)||3000;
  const hMm=parseFloat(document.getElementById('spL')?.value)||3000;
  const ceilH=parseFloat(document.getElementById('spH')?.value)||CEIL_H;
  if(wMm<100||hMm<100){ alert('최소 크기: 100mm'); return; }
  // 마지막 공간 오른쪽에 배치
  const rooms=fc.getObjects().filter(o=>o.spaceData);
  let nextX=30, nextY=30;
  if(rooms.length){
    const last=rooms[rooms.length-1];
    nextX=last.left+last.getScaledWidth()+20;
    nextY=last.top;
    if(nextX+wMm*MM2PX>fc.width-20){ nextX=30; nextY+=last.getScaledHeight()+30; }
  }
  fcCreateRoom(nextX, nextY, wMm*MM2PX, hMm*MM2PX, nm, tp, ceilH);
  // 폼 초기화
  ['spName','spW','spL'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  fcFitAll();
};

// ── addSpace 통합 (기존 recalc 시스템과 호환) ─────────────────
const _oAddSpace=window.addSpace;
if(typeof _oAddSpace==='function'){
  window.addSpace=function(){
    const r=_oAddSpace.apply(this,arguments);
    setTimeout(()=>{
      const sp=S.spaces[S.spaces.length-1]; if(!sp||!fc) return;
      const id=sp.id||('room_'+Date.now().toString(36)); sp.id=id;
      if(!fc.getObjects().find(o=>o.spaceData&&o.spaceData.id===id)){
        const rooms=fc.getObjects().filter(o=>o.spaceData);
        let nx=30,ny=30;
        if(rooms.length){const l=rooms[rooms.length-1];nx=l.left+l.getScaledWidth()+20;ny=l.top;}
        fcCreateRoom(nx,ny,(sp.width||3000)*MM2PX,(sp.length||3000)*MM2PX,sp.name,sp.type||'living',sp.height||CEIL_H);
        fcFitAll();
      }
    },60);
    return r;
  };
}

// ── 키보드 ───────────────────────────────────────────────────
function fcOnKey(e){
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  const k=e.key.toLowerCase();
  if(e.ctrlKey){
    if(k==='z'){fcUndo();}else if(k==='y'){fcRedo();}
    return;
  }
  const tm={v:'select',r:'room',d:'door',i:'window',m:'dim'};
  if(tm[k]){ fcTool(tm[k]); return; }
  if(k==='escape'){ fcTool('select'); FC.dimStart=null; }
  if(k==='delete'||k==='backspace'){ const o=fc&&fc.getActiveObject(); if(o) window.fcDeleteSel(); }
  if(k==='+'||k==='='){ if(fc) fcZoom(1.2); }
  if(k==='-'){  if(fc) fcZoom(0.83); }
  if(k==='f'){  if(fc) fcFitAll(); }
  if(k==='g'){  fcToggle('grid'); }
  if(k==='s'){  fcToggle('snap'); }
}

// ── localStorage ─────────────────────────────────────────────
function fcSave(){
  if(!fc) return;
  try{
    const json=fc.toJSON(['spaceData','doorData','winData','fcRole']);
    localStorage.setItem('boc_fc3',JSON.stringify(json));
  }catch(e){}
}
function fcLoad(){
  if(!fc) return;
  try{
    const raw=localStorage.getItem('boc_fc3'); if(!raw) return;
    const json=JSON.parse(raw);
    fc.loadFromJSON(json,()=>{ fc.renderAll(); fcSyncSummary(); });
  }catch(e){}
}

// ── 부트 ─────────────────────────────────────────────────────
window.addEventListener('load', ()=>{
  setTimeout(fcInit, 100);
  setInterval(fcSave, 20000);
});

const _oGoStep=window.goStep;
if(typeof _oGoStep==='function'){
  window.goStep=function(n){
    const r=_oGoStep.apply(this,arguments);
    if(n===1&&fc){
      setTimeout(()=>{
        const wrap=document.getElementById('cad-canvas-wrap');
        if(wrap){
          const nw=Math.max(400,wrap.clientWidth-220);
          const nh=Math.max(500,window.innerHeight-400);
          fc.setWidth(nw); fc.setHeight(nh);
        }
        if(!fc.getObjects().filter(o=>o.spaceData).length) fcSyncFromSpaces();
        fcFitAll();
        fc.renderAll();
      },80);
    }
    return r;
  };
}

// cadApply/cadUndo/cadRedo/cadTool/cadToggle/cadZoom/cadFitAll aliases (이전 버튼 호환)
window.cadApply=window.fcApply;
window.cadUndo=window.fcUndo;
window.cadRedo=window.fcRedo;
window.cadTool=window.fcTool;
window.cadToggle=window.fcToggle;
window.cadZoom=window.fcZoom;
window.cadFitAll=window.fcFitAll;
window.cadExportPNG=window.fcExportPNG;
window.cadExportDXF=window.fcExportDXF;
window.cadClearAll=window.fcClearAll;
window.cadSyncPreview=function(){ fcSyncToSpaces(); if(typeof st==='function') st('동기화 완료'); };

})(); // end IIFE — ECOREAN Fabric CAD v3
"""

pos = html.rfind('</script>')
if pos > -1:
    html = html[:pos] + FABRIC_JS + '\n' + html[pos:]
    print('[4] Fabric.js CAD JS 삽입 OK')
else:
    print('[4] WARN: </script> 없음')

# ──────────────────────────────────────────────────────────────────────
# 5. cad-editor 높이 CSS 업데이트
# ──────────────────────────────────────────────────────────────────────
html = html.replace(
    'height:calc(100vh - 280px); min-height:560px;',
    'height:calc(100vh - 320px); min-height:540px;'
)
print('[5] cad-editor 높이 조정 OK')

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(html)
lines = html.count('\n') + 1
print(f'Done: {lines} lines, {len(html.encode("utf-8")):,} bytes')
