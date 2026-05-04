'use strict';
// ===== KONVA 전역 변수 =====
var container, stage, bgLayer, mainLayer, previewLayer, groups, labelGroup, drawGroup, snapGroup, flashGroup;

function getContainerSize(){return{width:Math.max((container||document.getElementById('canvas-container')).offsetWidth||800,100),height:Math.max((container||document.getElementById('canvas-container')).offsetHeight||600,100)};}

function initKonva(){
// ===== KONVA =====
container=document.getElementById('canvas-container');
var initSize=getContainerSize();
stage=new Konva.Stage({container:'canvas-container',width:initSize.width,height:initSize.height});
bgLayer=new Konva.Layer({listening:false});
mainLayer=new Konva.Layer();
previewLayer=new Konva.Layer({listening:false});
stage.add(bgLayer);stage.add(mainLayer);stage.add(previewLayer);
groups={
  walls:new Konva.Group(),spaces:new Konva.Group(),openings:new Konva.Group(),
  fixtures:new Konva.Group(),furniture:new Konva.Group(),electric:new Konva.Group(),
  lights:new Konva.Group(),text:new Konva.Group(),dimensions:new Konva.Group(),
  circles:new Konva.Group(),arcs:new Konva.Group(), // v5.3
  hvac:new Konva.Group(), // v5.6
};
mainLayer.add(groups.walls);mainLayer.add(groups.spaces);mainLayer.add(groups.openings);
mainLayer.add(groups.fixtures);mainLayer.add(groups.furniture);mainLayer.add(groups.electric);
mainLayer.add(groups.lights);mainLayer.add(groups.dimensions);mainLayer.add(groups.text);
mainLayer.add(groups.circles);mainLayer.add(groups.arcs); // v5.3
mainLayer.add(groups.hvac); // v5.6
labelGroup=new Konva.Group({listening:false});
drawGroup=new Konva.Group({listening:false});
snapGroup=new Konva.Group({listening:false}); // v5.2: 스냅 마커 글로우
flashGroup=new Konva.Group({listening:false});
previewLayer.add(labelGroup);previewLayer.add(drawGroup);previewLayer.add(snapGroup);previewLayer.add(flashGroup);

}

// ===== 좌표 + 스냅 + 그리드 + VEF + 히스토리 + 렌더 함수 =====
// ===== 좌표 + 스냅 =====
function mmToPx(mm){return(mm/1000)*STATE.scale*STATE.zoom;}
function pxToMm(px){return Math.round((px/STATE.zoom/STATE.scale)*1000);}
function snapMm(mm){return STATE.snap.grid?Math.round(mm/STATE.gridSize)*STATE.gridSize:Math.round(mm);}
function snapToEndpoint(mm){
  if(!STATE.snap.endpoint) return {pt:mm,snapped:false};
  const threshold=300;
  let nearest=null,minD=threshold;
  // 공간 폴리곤 점
  STATE.spaces.forEach(s=>s.polygon.forEach(p=>{
    const dx=p.x-mm.x,dy=p.y-mm.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<minD){minD=d;nearest={x:p.x,y:p.y};}
  }));
  // 벽 끝점 + 중점
  STATE.walls.forEach(w=>{
    [{x:w.x1,y:w.y1},{x:w.x2,y:w.y2},{x:(w.x1+w.x2)/2,y:(w.y1+w.y2)/2}].forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest=p;}
    });
  });
  // v5.4: 원·아크 중심 + 4분점 (사분점)
  STATE.circles.forEach(c=>{
    const pts=[{x:c.x,y:c.y},{x:c.x+c.radius_mm,y:c.y},{x:c.x-c.radius_mm,y:c.y},{x:c.x,y:c.y+c.radius_mm},{x:c.x,y:c.y-c.radius_mm}];
    pts.forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:Math.round(p.x),y:Math.round(p.y)};}
    });
  });
  STATE.arcs.forEach(a=>{
    const sa=a.startAngle*Math.PI/180, ea=a.endAngle*Math.PI/180;
    const pts=[
      {x:a.x,y:a.y}, // 중심
      {x:a.x+Math.cos(sa)*a.radius_mm,y:a.y+Math.sin(sa)*a.radius_mm}, // 시작점
      {x:a.x+Math.cos(ea)*a.radius_mm,y:a.y+Math.sin(ea)*a.radius_mm}, // 끝점
    ];
    pts.forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:Math.round(p.x),y:Math.round(p.y)};}
    });
  });
  // v5.4: 라이브러리 객체 중심점
  [STATE.furniture,STATE.fixtures,STATE.lights,STATE.electric].forEach(arr=>{
    arr.forEach(o=>{
      const dx=o.x-mm.x,dy=o.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:o.x,y:o.y};}
    });
  });
  return nearest?{pt:nearest,snapped:true}:{pt:mm,snapped:false};
}

// v5.8: 공간 변(edge) 스냅 — 점을 다른 공간 폴리곤 변에 투영해서 가장 가까운 점 찾기
// 공간 드래그 시 사용. excludeId = 자기 자신 공간은 제외
function snapPointToSpaceEdges(mm,excludeId){
  if(!STATE.snap.endpoint) return {pt:mm,snapped:false};
  const threshold=STATE.snap.grid?STATE.gridSize*2:200; // mm (그리드 스냅 활성 시 2배)
  let best=null,minD=threshold;
  STATE.spaces.forEach(s=>{
    if(s.id===excludeId) return;
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
      // 점 mm를 선분 ab에 투영
      const dx=b.x-a.x, dy=b.y-a.y;
      const len2=dx*dx+dy*dy;
      if(len2<1) continue;
      const t=Math.max(0,Math.min(1,((mm.x-a.x)*dx+(mm.y-a.y)*dy)/len2));
      const fx=a.x+t*dx, fy=a.y+t*dy;
      const d=Math.sqrt((fx-mm.x)**2+(fy-mm.y)**2);
      if(d<minD){minD=d;best={x:Math.round(fx),y:Math.round(fy)};}
    }
  });
  return best?{pt:best,snapped:true,distance:minD}:{pt:mm,snapped:false};
}
function getMm(pos){
  let mm={x:snapMm(pxToMm(pos.x-STATE.offsetX)),y:snapMm(pxToMm(pos.y-STATE.offsetY))};
  const r=snapToEndpoint(mm);
  // v5.2: 스냅 마커 갱신용 정보 저장
  if(r.snapped){STATE.snapMarker={x:r.pt.x,y:r.pt.y};}
  else{STATE.snapMarker=null;}
  return r.pt;
}
// v5.2: 스냅 마커 별도 그룹 (라벨 그룹과 분리)
function updateSnapMarker(pos){
  drawSnapMarker();
}
function drawSnapMarker(){
  snapGroup.destroyChildren();
  if(!STATE.snapMarker){previewLayer.batchDraw();return;}
  const x=STATE.offsetX+mmToPx(STATE.snapMarker.x);
  const y=STATE.offsetY+mmToPx(STATE.snapMarker.y);
  const r=STATE.isMobile?12:7;
  // v5.4: 다중 글로우 링 (펄스 효과)
  snapGroup.add(new Konva.Circle({
    x,y,radius:r+10,
    fill:'#C9A96118',
    shadowColor:'#C9A961',shadowBlur:24,shadowOpacity:1,
  }));
  snapGroup.add(new Konva.Circle({
    x,y,radius:r+5,
    fill:'#C9A96130',
    shadowColor:'#C9A961',shadowBlur:14,shadowOpacity:0.9,
  }));
  // 내부 골드 원 (작은 점)
  snapGroup.add(new Konva.Circle({
    x,y,radius:r-2,
    fill:'#C9A961',
    shadowColor:'#C9A961',shadowBlur:8,shadowOpacity:1,
  }));
  previewLayer.batchDraw();
}
function applyOrtho(start,end){
  // v5.2: snap.ortho ON이면 자동 직교, Shift 누르면 임시 반전(자유)
  // snap.ortho OFF이고 Shift 누르면 임시 직교
  const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
  if(!orthoActive) return end;
  const dx=end.x-start.x,dy=end.y-start.y;
  return Math.abs(dx)>Math.abs(dy)?{x:end.x,y:start.y}:{x:start.x,y:end.y};
}

// ===== 그리드 =====
function drawGrid(){
  bgLayer.destroyChildren();
  if(!STATE.showGrid){bgLayer.batchDraw();return;}
  const w=stage.width(),h=stage.height();
  const gpx=mmToPx(STATE.gridSize);
  if(gpx<4){bgLayer.batchDraw();return;}
  const sx=STATE.offsetX%gpx,sy=STATE.offsetY%gpx;
  for(let x=sx;x<w;x+=gpx) bgLayer.add(new Konva.Line({points:[x,0,x,h],stroke:'#1A1A1A',strokeWidth:0.5}));
  for(let y=sy;y<h;y+=gpx) bgLayer.add(new Konva.Line({points:[0,y,w,y],stroke:'#1A1A1A',strokeWidth:0.5}));
  const mpx=mmToPx(1000);
  if(mpx>30){
    const smx=STATE.offsetX%mpx,smy=STATE.offsetY%mpx;
    for(let x=smx;x<w;x+=mpx) bgLayer.add(new Konva.Line({points:[x,0,x,h],stroke:'#2A2A2A',strokeWidth:0.8}));
    for(let y=smy;y<h;y+=mpx) bgLayer.add(new Konva.Line({points:[0,y,w,y],stroke:'#2A2A2A',strokeWidth:0.8}));
  }
  bgLayer.add(new Konva.Circle({x:STATE.offsetX,y:STATE.offsetY,radius:4,fill:'#C9A961'}));
  bgLayer.add(new Konva.Text({x:STATE.offsetX+8,y:STATE.offsetY-16,text:'0,0',fontSize:10,fontFamily:'JetBrains Mono',fill:'#C9A961'}));
  bgLayer.batchDraw();
}

// ===== 면적 =====
function polyArea(pts){let a=0;for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;a+=pts[i].x*pts[j].y-pts[j].x*pts[i].y;}return Math.abs(a)/2;}
function polyPeri(pts){let p=0;for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;const dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y;p+=Math.sqrt(dx*dx+dy*dy);}return p;}
function spArea(s){return polyArea(s.polygon)/1e6;}
function spPeri(s){return polyPeri(s.polygon)/1000;}
function spCH(s){return s.ceilingHeight_mm||STATE.ceilingHeight;}
function spWall(s){
  const spaceWalls=STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine);
  let wallArea=0;
  spaceWalls.forEach(w=>{
    const len=Math.hypot(w.x2-w.x1,w.y2-w.y1)/1000;
    wallArea+=len*(w.height_mm||spCH(s))/1000;
  });
  let oa=0;
  STATE.openings.filter(o=>o.spaceId===s.id).forEach(o=>{oa+=(o.width_mm*o.height_mm)/1e6;});
  return Math.max(0,wallArea-oa);
}
function spCenter(s){let cx=0,cy=0;s.polygon.forEach(p=>{cx+=p.x;cy+=p.y;});return{x:cx/s.polygon.length,y:cy/s.polygon.length};}

// 폴리곤 시계방향 판정
function isClockwise(pts){
  let sum=0;
  for(let i=0;i<pts.length;i++){
    const j=(i+1)%pts.length;
    sum+=(pts[j].x-pts[i].x)*(pts[j].y+pts[i].y);
  }
  return sum>0;
}

// ===== 공간 회전 (점·선·면·벽·치수·가구 포함) =====
function rotateSpaceByAngle(spaceId,angleDeg){
  const sp=STATE.spaces.find(s=>s.id===spaceId);
  if(!sp) return;
  const poly=sp.polygon.slice(); // vertex 회전 전 스냅샷 (내부 판정용)
  if(poly.length<2) return;
  // 중심점 (centroid — 회전 후에도 동일 위치 유지)
  const cx=poly.reduce((s,p)=>s+p.x,0)/poly.length;
  const cy=poly.reduce((s,p)=>s+p.y,0)/poly.length;
  const rad=angleDeg*Math.PI/180;
  const cos=Math.cos(rad),sin=Math.sin(rad);
  function rotatePt(x,y){
    const dx=x-cx,dy=y-cy;
    return{x:Math.round(cx+dx*cos-dy*sin),y:Math.round(cy+dx*sin+dy*cos)};
  }
  // 0. 내부 객체 수집 (vertex 회전 전)
  const innerItems=[];
  ['furniture','fixtures','lights','electric','hvac'].forEach(kind=>{
    STATE[kind].forEach(item=>{if(typeof pointInPolygon==='function'&&pointInPolygon({x:item.x,y:item.y},poly)) innerItems.push(item);});
  });
  // 치수선: 양 끝점이 모두 공간 변 300mm 이내
  function nearEdge(x,y){
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      const ddx=b.x-a.x,ddy=b.y-a.y,len2=ddx*ddx+ddy*ddy;
      if(len2<1) continue;
      const t=Math.max(0,Math.min(1,((x-a.x)*ddx+(y-a.y)*ddy)/len2));
      if(Math.hypot(x-a.x-t*ddx,y-a.y-t*ddy)<300) return true;
    }
    return false;
  }
  const innerMeasures=STATE.measures.filter(m=>nearEdge(m.x1,m.y1)&&nearEdge(m.x2,m.y2));
  const innerCircles=STATE.circles.filter(c=>typeof pointInPolygon==='function'&&pointInPolygon({x:c.x,y:c.y},poly));
  const innerArcs=STATE.arcs.filter(a=>typeof pointInPolygon==='function'&&pointInPolygon({x:a.x,y:a.y},poly));
  // 1. Space vertex 회전 → 벽도 VEF로 자동 따라옴
  const movedVids=new Set(sp.vertexIds||[]);
  (sp.vertexIds||[]).forEach(vid=>{
    const v=getVertex(vid);if(!v) return;
    const p=rotatePt(v.x,v.y);v.x=p.x;v.y=p.y;
  });
  // 2. spaceId로 연결된 벽의 별도 vertex 회전
  STATE.walls.forEach(w=>{
    if(w.spaceId!==spaceId) return;
    [w.v1Id,w.v2Id].forEach(vid=>{
      if(!vid||movedVids.has(vid)) return;
      const v=getVertex(vid);if(!v) return;
      const p=rotatePt(v.x,v.y);v.x=p.x;v.y=p.y;
      movedVids.add(vid);
    });
  });
  // 3. 내부 가구·위생·조명·전기·공조 회전 (자체 angle도 동일 각도만큼 회전)
  innerItems.forEach(item=>{
    const p=rotatePt(item.x,item.y);
    item.x=p.x;item.y=p.y;
    item.angle=((item.angle||0)+angleDeg)%360;
  });
  // 4. 치수선 회전
  innerMeasures.forEach(m=>{
    const p1=rotatePt(m.x1,m.y1),p2=rotatePt(m.x2,m.y2);
    m.x1=p1.x;m.y1=p1.y;m.x2=p2.x;m.y2=p2.y;
  });
  // 5. 원·아크 회전
  innerCircles.forEach(c=>{const p=rotatePt(c.x,c.y);c.x=p.x;c.y=p.y;});
  innerArcs.forEach(a=>{
    const p=rotatePt(a.x,a.y);a.x=p.x;a.y=p.y;
    a.startAngle=(a.startAngle+angleDeg)%360;
    a.endAngle=(a.endAngle+angleDeg)%360;
  });
  // 원형공간 _circleMeta 중심 업데이트
  if(sp._circleMeta){
    const p=rotatePt(sp._circleMeta.cx,sp._circleMeta.cy);
    sp._circleMeta.cx=p.x;sp._circleMeta.cy=p.y;
  }
}

// ===== 분할 완료 펄스 효과 =====
function flashSplitSpaces(ids){
  const DURATION=900;
  let start=null;
  function frame(now){
    if(start===null) start=now;
    const t=Math.min(1,(now-start)/DURATION);
    const alpha=(1-t)*(1-t); // ease-out²
    flashGroup.destroyChildren();
    ids.forEach(id=>{
      const sp=STATE.spaces.find(s=>s.id===id);
      if(!sp||sp.polygon.length<3) return;
      const pts=[];
      sp.polygon.forEach(p=>{pts.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
      // 채움 레이어
      flashGroup.add(new Konva.Line({
        points:pts,closed:true,
        fill:'#FFEE44',
        stroke:'#FFAA00',
        strokeWidth:6,
        opacity:alpha*0.85,
        shadowColor:'#FFCC00',
        shadowBlur:30,
        shadowOpacity:1,
        shadowEnabled:true,
        listening:false,
      }));
    });
    previewLayer.draw();
    if(t<1) requestAnimationFrame(frame);
    else{flashGroup.destroyChildren();previewLayer.draw();}
  }
  requestAnimationFrame(frame);
}

let idCounter=0;
function makeId(p){idCounter++;return p+'_'+Date.now()+'_'+idCounter;}
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ===== VEF TOPOLOGY =====
function getVertex(id){return STATE.vertices.find(v=>v.id===id);}
function ensureVertex(x,y,tol=60){
  x=Math.round(x);y=Math.round(y);
  const found=STATE.vertices.find(v=>Math.hypot(v.x-x,v.y-y)<tol);
  if(found) return found;
  const v={id:makeId('v'),x,y};
  STATE.vertices.push(v);
  return v;
}
function moveVertex(id,x,y){const v=getVertex(id);if(v){v.x=Math.round(x);v.y=Math.round(y);}}
function verticesOfObj(obj){
  if(obj.vertexIds) return obj.vertexIds.map(getVertex).filter(Boolean);
  if(obj.v1Id) return [getVertex(obj.v1Id),getVertex(obj.v2Id)].filter(Boolean);
  return [];
}
// VEF: wall/space 팩토리 — getter로 x1/y1/x2/y2, polygon 자동 제공
function makeWallVEF(v1Id,v2Id,props={}){
  const w=Object.defineProperties({
    id:makeId('w'),v1Id,v2Id,
    thickness:props.thickness??100,
    layerName:props.layerName??'',
    spaceId:props.spaceId??null,
    finishMaterial:props.finishMaterial??null,
    height_mm:props.height_mm??null,
  },{
    x1:{get(){return getVertex(this.v1Id)?.x??0},enumerable:true,configurable:true},
    y1:{get(){return getVertex(this.v1Id)?.y??0},enumerable:true,configurable:true},
    x2:{get(){return getVertex(this.v2Id)?.x??0},enumerable:true,configurable:true},
    y2:{get(){return getVertex(this.v2Id)?.y??0},enumerable:true,configurable:true},
  });
  return w;
}
function makeSpaceVEF(vertexIds,props={}){
  const s=Object.defineProperties({
    id:props.id??makeId('sp'),
    vertexIds:[...vertexIds],
    name:props.name??'',
    type:props.type??'LIVING',
    typeIndex:props.typeIndex??1,
    layerName:props.layerName??'',
    ceilingHeight_mm:props.ceilingHeight_mm??null,
    materialGrade:props.materialGrade??'STANDARD',
    difficulty:props.difficulty??'NORMAL',
    materialColor:props.materialColor??null,
    floorMaterial:props.floorMaterial??'STRONG',
    ceilingMaterial:props.ceilingMaterial??'GYPSUM',
    videoSequenceOrder:props.videoSequenceOrder??null,
  },{
    polygon:{
      get(){return this.vertexIds.map(getVertex).filter(Boolean);},
      set(pts){this.vertexIds=polygonToVertexIds(pts);},
      enumerable:true,configurable:true,
    },
  });
  return s;
}
// 기존 plain polygon 배열을 vertexIds로 변환 (마이그레이션용)
function polygonToVertexIds(polygon){
  // tol=1: 공간 꼭짓점은 별개 점이므로 60mm 허용 오차로 병합하지 않음
  // 단, 이미 존재하는 버텍스와 1mm 이내면 재사용 (중복 방지)
  const used=new Set();
  return polygon.map(p=>{
    let best=null,bestD=Infinity;
    for(const v of STATE.vertices){
      if(used.has(v.id)) continue;
      const d=Math.hypot(v.x-p.x,v.y-p.y);
      if(d<1&&d<bestD){bestD=d;best=v;}
    }
    if(best){used.add(best.id);return best.id;}
    const nv={id:makeId('v'),x:Math.round(p.x),y:Math.round(p.y)};
    STATE.vertices.push(nv);
    used.add(nv.id);
    return nv.id;
  });
}
// JSON.parse 후 VEF getter 재설치 (history 복원·load·duplicate·mirror 공통)
function reinstallVEF(obj){
  if('v1Id' in obj){
    Object.defineProperties(obj,{
      x1:{get(){return getVertex(this.v1Id)?.x??0},enumerable:true,configurable:true},
      y1:{get(){return getVertex(this.v1Id)?.y??0},enumerable:true,configurable:true},
      x2:{get(){return getVertex(this.v2Id)?.x??0},enumerable:true,configurable:true},
      y2:{get(){return getVertex(this.v2Id)?.y??0},enumerable:true,configurable:true},
    });
  }
  if('vertexIds' in obj){
    Object.defineProperty(obj,'polygon',{
      get(){return this.vertexIds.map(getVertex).filter(Boolean);},
      set(pts){this.vertexIds=polygonToVertexIds(pts);},
      enumerable:true,configurable:true,
    });
  }
  return obj;
}
// 모든 wall/space에 VEF getter 재설치
function reinstallVEFAll(){
  STATE.walls.forEach(reinstallVEF);
  STATE.spaces.forEach(reinstallVEF);
}
// 참조되지 않는 버텍스 정리
function cleanupOrphanVertices(){
  // 레거시 벽(v1Id 없음)이 남아있으면 마이그레이션 전이므로 정리 건너뜀
  if(STATE.walls.some(w=>!w.v1Id&&'x1' in w)) return;
  const used=new Set();
  STATE.walls.forEach(w=>{if(w.v1Id)used.add(w.v1Id);if(w.v2Id)used.add(w.v2Id);});
  STATE.spaces.forEach(s=>{if(s.vertexIds)s.vertexIds.forEach(id=>used.add(id));});
  STATE.vertices=STATE.vertices.filter(v=>used.has(v.id));
}

// ===== HISTORY =====
function saveHistory(){
  const snap=JSON.stringify({
    vertices:STATE.vertices,
    spaces:STATE.spaces,walls:STATE.walls,openings:STATE.openings,
    furniture:STATE.furniture,fixtures:STATE.fixtures,lights:STATE.lights,
    electric:STATE.electric,texts:STATE.texts,measures:STATE.measures,
    circles:STATE.circles,arcs:STATE.arcs,hvac:STATE.hvac,
    estimateConfig:STATE.estimateConfig,
  });
  STATE.history=STATE.history.slice(0,STATE.historyIdx+1);
  STATE.history.push(snap);
  if(STATE.history.length>50) STATE.history.shift();
  STATE.historyIdx=STATE.history.length-1;
}
function undo(){
  if(STATE.historyIdx<=0){showStatus('실행취소 불가');return;}
  STATE.historyIdx--;
  Object.assign(STATE,JSON.parse(STATE.history[STATE.historyIdx]));
  reinstallVEFAll();
  renderAll();refreshUI();showStatus('실행취소');
}
function redo(){
  if(STATE.historyIdx>=STATE.history.length-1){showStatus('재실행 불가');return;}
  STATE.historyIdx++;
  Object.assign(STATE,JSON.parse(STATE.history[STATE.historyIdx]));
  reinstallVEFAll();
  renderAll();refreshUI();showStatus('재실행');
}

// ===== 렌더 — 공간 =====
function renderSpaces(){
  groups.spaces.destroyChildren();
  labelGroup.destroyChildren();
  STATE.spaces.forEach(s=>{
    const td=SPACE_TYPES[s.type];
    const pts=[];
    s.polygon.forEach(p=>{pts.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
    const sel=STATE.selectedKind==='space'&&STATE.selectedId===s.id||STATE.boxSelection.some(b=>b.kind==='space'&&b.id===s.id);
    const fillColor=s.materialColor||td.color+'33';
    const poly=new Konva.Line({
      points:pts,fill:fillColor,stroke:sel?'#E2725B':td.color,
      strokeWidth:sel?3.5:2.2,closed:true,id:s.id,
      shadowColor:sel?'#E2725B':'transparent',shadowBlur:sel?12:0,shadowOpacity:sel?0.6:0,
    });
    poly.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('space',s.id);});
    groups.spaces.add(poly);

    // 원형공간 리사이즈 핸들 (선택 시만 표시)
    if(sel&&s._circleMeta){
      const{cx,cy,r}=s._circleMeta;
      // 동쪽(0°), 북쪽(270°), 서쪽(180°), 남쪽(90°) 4방향 핸들
      [[r,0],[0,-r],[-r,0],[0,r]].forEach(([dx,dy])=>{
        const hx=STATE.offsetX+mmToPx(cx+dx), hy=STATE.offsetY+mmToPx(cy+dy);
        const handle=new Konva.Circle({x:hx,y:hy,radius:7,fill:'#E2725B',stroke:'#fff',strokeWidth:1.5,draggable:true,listening:true});
        let _rafId=null;
        handle.on('dragmove',()=>{
          if(_rafId) return; // 이전 프레임 처리 중이면 스킵
          _rafId=requestAnimationFrame(()=>{
            _rafId=null;
            const hxMm=pxToMm(handle.x()-STATE.offsetX);
            const hyMm=pxToMm(handle.y()-STATE.offsetY);
            const newR=Math.hypot(hxMm-cx,hyMm-cy);
            if(newR<100) return;
            s._circleMeta.r=newR;
            s.vertexIds=polygonToVertexIds(circleToPolygon(cx,cy,newR));
            renderAll();
          });
        });
        handle.on('dragend',()=>{if(_rafId){cancelAnimationFrame(_rafId);_rafId=null;}saveHistory();renderAll();});
        groups.spaces.add(handle);
      });
      // 중심점 표시
      const hcx=STATE.offsetX+mmToPx(cx), hcy=STATE.offsetY+mmToPx(cy);
      groups.spaces.add(new Konva.Circle({x:hcx,y:hcy,radius:4,fill:td.color,stroke:'#fff',strokeWidth:1,listening:false}));
      // 반지름 수치 표시
      const rLabel=new Konva.Text({x:STATE.offsetX+mmToPx(cx)+8,y:STATE.offsetY+mmToPx(cy)-20,
        text:'R '+Math.round(r)+'mm',fontSize:10,fontFamily:'JetBrains Mono',fill:'#E2725B',listening:false});
      groups.spaces.add(rLabel);
    }

    // 회전 핸들 (선택 시 상단 중앙에 표시 — ↻ 드래그 또는 R 키로 회전)
    if(sel){
      const ctr=spCenter(s);
      const cxPx=STATE.offsetX+mmToPx(ctr.x);
      const cyPx=STATE.offsetY+mmToPx(ctr.y);
      const topYPx=Math.min(...s.polygon.map(p=>STATE.offsetY+mmToPx(p.y)));
      const rhx=cxPx,rhy=topYPx-44;
      groups.spaces.add(new Konva.Line({points:[cxPx,cyPx,rhx,rhy],stroke:'#C07B3A',strokeWidth:1,dash:[4,3],listening:false}));
      const rg=new Konva.Group({x:rhx,y:rhy,listening:true,id:'__rot_'+s.id});
      rg.add(new Konva.Circle({radius:11,fill:'#C07B3A',stroke:'#fff',strokeWidth:1.5,listening:true}));
      rg.add(new Konva.Text({x:-7,y:-8,text:'↻',fontSize:15,fill:'#fff',fontFamily:'Inter',listening:false}));
      rg.on('mousedown touchstart',e2=>{
        e2.cancelBubble=true;
        const center2=spCenter(s);
        STATE.rotateState={spaceId:s.id,cxMm:center2.x,cyMm:center2.y,lastAngle:null,totalAngle:0};
      });
      groups.spaces.add(rg);
    }

    // 공간명 라벨
    const c=spCenter(s);
    const lg=new Konva.Group({x:STATE.offsetX+mmToPx(c.x),y:STATE.offsetY+mmToPx(c.y),listening:false});
    const t1=new Konva.Text({text:s.name,fontSize:13,fontFamily:'Inter',fontStyle:'500',fill:'#F5F1EB'});
    t1.offsetX(t1.width()/2);t1.offsetY(15);
    lg.add(t1);
    const t2=new Konva.Text({text:spArea(s).toFixed(1)+' ㎡',fontSize:10,fontFamily:'JetBrains Mono',fill:td.color});
    t2.offsetX(t2.width()/2);t2.offsetY(0);
    lg.add(t2);
    labelGroup.add(lg);

    // *** 치수 자동 표시 — KS F 1501 건축 평면도 치수표기법 ***
    if(STATE.showDimensions){
      const cw=isClockwise(s.polygon);
      for(let i=0;i<s.polygon.length;i++){
        const p1=s.polygon[i];
        const p2=s.polygon[(i+1)%s.polygon.length];
        const dx=p2.x-p1.x,dy=p2.y-p1.y;
        const lenmm=Math.sqrt(dx*dx+dy*dy);
        if(lenmm<200) continue;
        const ux=dx/lenmm, uy=dy/lenmm;
        // 외부 방향 노말 (공간 바깥쪽)
        const nx=cw?-uy:uy;
        const ny=cw?ux:-ux;
        const offMm=350; // 자동 치수선 오프셋
        const gapMm=40, extMm=80, tickPx=mmToPx(70);
        const cos45=Math.cos(Math.PI/4),sin45=Math.sin(Math.PI/4);
        const TX=xm=>STATE.offsetX+mmToPx(xm);
        const TY=ym=>STATE.offsetY+mmToPx(ym);

        // 치수선 끝점
        const d1x=p1.x+nx*offMm, d1y=p1.y+ny*offMm;
        const d2x=p2.x+nx*offMm, d2y=p2.y+ny*offMm;

        // 보조선
        labelGroup.add(new Konva.Line({points:[TX(p1.x+nx*gapMm),TY(p1.y+ny*gapMm),TX(p1.x+nx*(offMm+extMm)),TY(p1.y+ny*(offMm+extMm))],stroke:'#6B7A8A',strokeWidth:0.5}));
        labelGroup.add(new Konva.Line({points:[TX(p2.x+nx*gapMm),TY(p2.y+ny*gapMm),TX(p2.x+nx*(offMm+extMm)),TY(p2.y+ny*(offMm+extMm))],stroke:'#6B7A8A',strokeWidth:0.5}));

        // 치수선
        labelGroup.add(new Konva.Line({points:[TX(d1x),TY(d1y),TX(d2x),TY(d2y)],stroke:'#6B7A8A',strokeWidth:0.7}));

        // 사선 마크
        const tkx=(ux*cos45-uy*sin45)*tickPx;
        const tky=(ux*sin45+uy*cos45)*tickPx;
        labelGroup.add(new Konva.Line({points:[TX(d1x)-tkx,TY(d1y)-tky,TX(d1x)+tkx,TY(d1y)+tky],stroke:'#6B7A8A',strokeWidth:1.1}));
        labelGroup.add(new Konva.Line({points:[TX(d2x)-tkx,TY(d2y)-tky,TX(d2x)+tkx,TY(d2y)+tky],stroke:'#6B7A8A',strokeWidth:1.1}));

        // 치수 수치
        const tmx=(d1x+d2x)/2-nx*90, tmy=(d1y+d2y)/2-ny*90;
        let rot=Math.atan2(dy,dx)*180/Math.PI;
        if(rot>90||rot<-90) rot+=180;
        const t=new Konva.Text({x:TX(tmx),y:TY(tmy),text:Math.round(lenmm).toString(),fontSize:10,fontFamily:'JetBrains Mono',fill:'#8899AA',fontStyle:'500',rotation:rot});
        t.offsetX(t.width()/2);t.offsetY(t.height()/2);
        labelGroup.add(t);
      }
    }
  });
}

function renderWalls(){
  groups.walls.destroyChildren();
  // v5.4+v5.5: 중첩 감지 — 벽↔벽(주황) 와 벽↔공간변(파랑) 분리
  const overlapsWall=detectOverlappingWalls();
  const overlapsSpace=detectWallSpaceOverlap();
  STATE.walls.forEach(w=>{
    const x1=STATE.offsetX+mmToPx(w.x1),y1=STATE.offsetY+mmToPx(w.y1);
    const x2=STATE.offsetX+mmToPx(w.x2),y2=STATE.offsetY+mmToPx(w.y2);
    const sel=STATE.selectedKind==='wall'&&STATE.selectedId===w.id||STATE.boxSelection.some(b=>b.kind==='wall'&&b.id===w.id);
    const isOW=overlapsWall.has(w.id);   // 벽-벽 중첩 (동일 선 중복)
    const isOS=overlapsSpace.has(w.id);  // 벽-공간 중첩 (다른 선 겹침)
    const overlapColor=isOS?'#3D9DE2':(isOW?'#E03030':null); // 동일선=적색, 공간겹침=파랑
    const isLine=!!w.isLine;
    const lineSp=isLine&&w.spaceId?STATE.spaces.find(s=>s.id===w.spaceId):null;
    const lineBaseColor=lineSp?SPACE_TYPES[lineSp.type].color:'#7B82B5';
    const line=new Konva.Line({
      points:[x1,y1,x2,y2],
      stroke:sel?'#E2725B':(overlapColor||(isLine?lineBaseColor:'#3E3E3E')),
      strokeWidth:isLine?(sel?3.5:2.2):Math.max(4,mmToPx(w.thickness||100)),
      lineCap:isLine?'square':'square',
      id:w.id,hitStrokeWidth:isLine?16:20,
      dash:overlapColor?[4,4]:[],
      shadowColor:sel&&isLine?'#E2725B':(overlapColor||'transparent'),
      shadowBlur:(sel&&isLine)?8:(overlapColor?12:0),
      shadowOpacity:(sel&&isLine)?0.5:(overlapColor?0.8:0),
    });
    line.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('wall',w.id);});
    groups.walls.add(line);
    // 경고 마크: 동일 선 중복(적색)만 표시, 파란 겹침은 글로우만
    if(isOW&&!sel){
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      groups.walls.add(new Konva.Text({x:mx-10,y:my-14,text:'⚠',fontSize:28,fontFamily:'Inter',fill:'#E03030',shadowColor:'#000',shadowBlur:3}));
    }
  });
}
// v5.5: 벽이 공간 폴리곤 변과 같은 직선상에서 겹치는지 검사
function detectWallSpaceOverlap(){
  const overlaps=new Set();
  STATE.walls.forEach(w=>{
    STATE.spaces.forEach(s=>{
      for(let i=0;i<s.polygon.length;i++){
        const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
        if(wallsOverlap(w,{x1:a.x,y1:a.y,x2:b.x,y2:b.y})){overlaps.add(w.id);return;}
      }
    });
  });
  return overlaps;
}
// v5.4: 두 벽이 같은 직선상에 있고 겹치는지 검사
function detectOverlappingWalls(){
  const overlaps=new Set();
  const w=STATE.walls;
  for(let i=0;i<w.length;i++){
    for(let j=i+1;j<w.length;j++){
      if(wallsOverlap(w[i],w[j])){
        overlaps.add(w[i].id);overlaps.add(w[j].id);
      }
    }
  }
  return overlaps;
}
function wallsOverlap(a,b){
  // 바운딩박스 사전 검사 — 멀리 떨어진 벽쌍 즉시 제거 (O(n²) 성능 핵심)
  const TOL=20;
  const aMinX=Math.min(a.x1,a.x2)-TOL, aMaxX=Math.max(a.x1,a.x2)+TOL;
  const aMinY=Math.min(a.y1,a.y2)-TOL, aMaxY=Math.max(a.y1,a.y2)+TOL;
  const bMinX=Math.min(b.x1,b.x2)-TOL, bMaxX=Math.max(b.x1,b.x2)+TOL;
  const bMinY=Math.min(b.y1,b.y2)-TOL, bMaxY=Math.max(b.y1,b.y2)+TOL;
  if(aMaxX<bMinX||bMaxX<aMinX||aMaxY<bMinY||bMaxY<aMinY) return false;
  // 같은 직선상에 있는지: 외적 = 0
  const dxa=a.x2-a.x1, dya=a.y2-a.y1;
  const dxb=b.x2-b.x1, dyb=b.y2-b.y1;
  const cross=dxa*dyb-dya*dxb;
  const lenA=Math.sqrt(dxa*dxa+dya*dya), lenB=Math.sqrt(dxb*dxb+dyb*dyb);
  if(lenA<1||lenB<1) return false;
  if(Math.abs(cross)>lenA*lenB*0.02) return false; // 약 1.1° 이내만 평행 인정
  // a선상에 b의 시작/끝 점이 있는지
  const cross2=(b.x1-a.x1)*dya-(b.y1-a.y1)*dxa;
  if(Math.abs(cross2)>lenA*10) return false; // 10mm 이내 동일 직선 인정
  // 매개변수 t로 겹침 구간 계산
  const len2=dxa*dxa+dya*dya;
  if(len2<1) return false;
  const tb1=((b.x1-a.x1)*dxa+(b.y1-a.y1)*dya)/len2;
  const tb2=((b.x2-a.x1)*dxa+(b.y2-a.y1)*dya)/len2;
  const lo=Math.min(tb1,tb2), hi=Math.max(tb1,tb2);
  return hi>0.01&&lo<0.99;
}

// *** 개구부 — 도어/창 W×H×D 풀 데이터 (요구사항 #2, #3) ***
function renderOpenings(){
  groups.openings.destroyChildren();
  STATE.openings.forEach(o=>{
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const w=mmToPx(o.width_mm);
    const isDoor=o.type==='DOOR';
    const color=isDoor?'#D4A05B':'#5BA0D4';
    const sel=STATE.selectedKind==='opening'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='opening'&&b.id===o.id);
    const g=new Konva.Group({x,y,rotation:o.angle||0,id:o.id});
    if(isDoor){
      g.add(new Konva.Rect({x:-w/2,y:-3,width:w,height:6,fill:color,opacity:0.9,
        stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2:1}));
      g.add(new Konva.Arc({x:-w/2,y:0,innerRadius:0,outerRadius:w,angle:90,rotation:0,
        stroke:color,strokeWidth:1,fillEnabled:false,dash:[4,3]}));
      g.add(new Konva.Line({points:[-w/2,0,-w/2,w],stroke:color,strokeWidth:2}));
    }else{
      g.add(new Konva.Rect({x:-w/2,y:-4,width:w,height:8,fill:color,opacity:0.7,
        stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2:1}));
      g.add(new Konva.Line({points:[-w/2,0,w/2,0],stroke:'#FFFFFF',strokeWidth:1}));
    }
    g.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('opening',o.id);});
    groups.openings.add(g);
    // 라벨에 W×H 표시
    const subTypeName=isDoor?(DOOR_TYPES[o.subType]||{name:'문'}).name:(WINDOW_TYPES[o.subType]||{name:'창'}).name;
    labelGroup.add(new Konva.Text({
      x:x-40,y:y+12,width:80,align:'center',
      text:subTypeName+' '+o.width_mm+'×'+o.height_mm,
      fontSize:9,fontFamily:'JetBrains Mono',fill:color,
    }));
  });
}

// v5.5: 라이브러리 도형 명령(shape)을 Konva 노드로 변환
// v5.5: shape 정의를 Konva 노드로 변환
// v5.7: 2.5D 토글 ON 시 그림자(opacity 어두운 사각형) + 그라데이션(linearGradient) 적용
function drawShape(shape){
  const nodes=[];
  const plus=STATE.plus2D; // v5.7: 2.5D 활성화 여부
  shape.forEach(s=>{
    const px=mmToPx(1); // 1mm → px
    const sx=v=>v*px; // mm → px
    if(s.type==='rect'){
      // v5.7: 2.5D ON + 채워진 rect만 그라데이션 적용 (밝은 위 → 어두운 아래)
      let fill=s.fill||'transparent';
      if(plus && s.fill && s.fill!=='transparent' && s.fill!=='none'){
        // 단순 그라데이션: 시작색은 fill, 종료색은 약간 어두운 톤 (16진수 → 어둡게)
        const dark=darkenHex(s.fill,0.35);
        nodes.push(new Konva.Rect({x:sx(s.x),y:sx(s.y),width:sx(s.w),height:sx(s.h),
          fillLinearGradientStartPoint:{x:0,y:0},
          fillLinearGradientEndPoint:{x:0,y:sx(s.h)},
          fillLinearGradientColorStops:[0,s.fill,1,dark],
          stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
          cornerRadius:s.r?sx(s.r):0,dash:s.dash?s.dash.map(d=>sx(d)):[]}));
        return;
      }
      nodes.push(new Konva.Rect({x:sx(s.x),y:sx(s.y),width:sx(s.w),height:sx(s.h),
        fill,stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
        cornerRadius:s.r?sx(s.r):0,dash:s.dash?s.dash.map(d=>sx(d)):[]}));
    }else if(s.type==='circle'){
      nodes.push(new Konva.Circle({x:sx(s.cx),y:sx(s.cy),radius:sx(s.r),
        fill:s.fill||'transparent',stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
        dash:s.dash?s.dash.map(d=>sx(d)):[]}));
    }else if(s.type==='line'){
      nodes.push(new Konva.Line({points:[sx(s.x1),sx(s.y1),sx(s.x2),sx(s.y2)],
        stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10)),
        dash:s.dash?s.dash.map(d=>sx(d)):[]}));
    }else if(s.type==='arc'){
      nodes.push(new Konva.Arc({x:sx(s.cx),y:sx(s.cy),
        innerRadius:sx(s.r),outerRadius:sx(s.r),
        angle:s.end-s.start,rotation:s.start,
        fill:s.fill||'transparent',stroke:s.stroke,strokeWidth:Math.max(0.5,sx(s.sw||10))}));
    }else if(s.type==='text'){
      // v5.6: 소방 심볼용 텍스트 (S, H, E, F 등)
      nodes.push(new Konva.Text({x:sx(s.x),y:sx(s.y),
        text:s.text,fontSize:sx(s.fontSize||50),fontFamily:'Inter',fontStyle:'700',
        fill:s.fill||'#000',listening:false}));
    }
  });
  return nodes;
}

// v5.7: hex 색상 어둡게 (그라데이션용). frac 0~1 (0=원색, 1=검정)
function darkenHex(hex,frac){
  if(!hex||hex[0]!=='#'||hex.length<7) return hex||'#000';
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const k=1-frac;
  const tr=Math.round(r*k),tg=Math.round(g*k),tb=Math.round(b*k);
  return '#'+tr.toString(16).padStart(2,'0')+tg.toString(16).padStart(2,'0')+tb.toString(16).padStart(2,'0');
}

function renderRect(arr,group,lib,kind){
  group.destroyChildren();
  arr.forEach(o=>{
    const def=lib[o.type];
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind===kind&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind===kind&&b.id===o.id);
    // v5.7: flipped(미러) 좌우반전 — 그룹 scaleX(-1)로 처리, 단 텍스트 노드는 별도 보정
    const sx=o.flipped?-1:1;
    const g=new Konva.Group({x,y,rotation:o.angle||0,scaleX:sx,scaleY:1,id:o.id});
    // v5.7: 2.5D ON 시 그림자 — 객체 외곽 사각형을 어두운 색으로 약간 옵셋
    if(STATE.plus2D){
      const w=mmToPx(def.w),h=mmToPx(def.h);
      const sd=mmToPx(80); // 80mm 옵셋 (px 환산)
      g.add(new Konva.Rect({x:-w/2+sd,y:-h/2+sd,width:w,height:h,
        fill:'#000',opacity:0.18,listening:false,cornerRadius:4}));
    }
    if(def.shape){
      // v5.5: 정교한 도형 (shape 정의 기반)
      const nodes=drawShape(def.shape);
      // v5.7: flipped 시 텍스트만 다시 좌우반전(부모 -1, 자식 -1 = 정방향)
      if(o.flipped){
        nodes.forEach(n=>{
          if(n.getClassName && n.getClassName()==='Text'){
            n.scaleX(-1);
            // 텍스트 위치도 반대편으로 (본문 길이만큼 보정 필요 없음 — Konva Text는 좌상단 기준)
          }
        });
      }
      nodes.forEach(n=>g.add(n));
      if(sel){
        // 선택 시 골드 외곽 박스 (mm 좌표 기준)
        const w=mmToPx(def.w),h=mmToPx(def.h);
        g.add(new Konva.Rect({x:-w/2-3,y:-h/2-3,width:w+6,height:h+6,
          stroke:'#E2725B',strokeWidth:2.5,dash:[6,4],fill:'transparent',
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6}));
      }
    }else{
      // 폴백: 기존 단순 사각형
      const w=mmToPx(def.w),h=mmToPx(def.h);
      g.add(new Konva.Rect({x:-w/2,y:-h/2,width:w,height:h,fill:def.c+'CC',
        stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2.5:1,cornerRadius:2}));
      g.add(new Konva.Text({x:-w/2,y:-h/2,width:w,height:h,text:def.name,
        fontSize:Math.min(11,h*0.18),fontFamily:'Inter',
        fill:'#0A0A0A',align:'center',verticalAlign:'middle',listening:false}));
    }
    g.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj(kind,o.id);});
    group.add(g);
  });
}

function renderLights(){
  groups.lights.destroyChildren();
  STATE.lights.forEach(o=>{
    const def=LIGHT_LIB[o.type];
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind==='lights'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='lights'&&b.id===o.id);
    const g=new Konva.Group({x,y,rotation:o.angle||0,id:o.id});
    if(def.shape){
      drawShape(def.shape).forEach(n=>g.add(n));
      if(sel){
        const r=mmToPx(def.size||200)/2+5;
        g.add(new Konva.Circle({radius:r,stroke:'#E2725B',strokeWidth:2.5,dash:[6,4],
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6}));
      }
    }else{
      // 폴백
      const r=Math.max(8,mmToPx(def.size||200)/2);
      g.add(new Konva.Circle({radius:r,stroke:def.c,strokeWidth:2,fill:def.c+'22'}));
      if(sel) g.add(new Konva.Circle({radius:r+4,stroke:'#E2725B',strokeWidth:2,dash:[3,3]}));
    }
    g.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('lights',o.id);});
    groups.lights.add(g);
  });
}
function renderElectric(){
  groups.electric.destroyChildren();
  STATE.electric.forEach(o=>{
    const def=ELECTRIC_LIB[o.type];
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind==='electric'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='electric'&&b.id===o.id);
    const g=new Konva.Group({x,y,rotation:o.angle||0,id:o.id});
    if(def.shape){
      drawShape(def.shape).forEach(n=>g.add(n));
      if(sel){
        const r=mmToPx(def.size||200)/2+5;
        g.add(new Konva.Circle({radius:r,stroke:'#E2725B',strokeWidth:2.5,dash:[6,4],
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6}));
      }
    }else{
      // 폴백
      const r=Math.max(8,mmToPx(def.size||200)/2);
      g.add(new Konva.Circle({radius:r,fill:def.c+'88',stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2:1}));
      g.add(new Konva.Text({x:-r,y:-7,width:r*2,text:def.sym,fontSize:13,fill:'#FFFFFF',align:'center',listening:false}));
    }
    g.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('electric',o.id);});
    groups.electric.add(g);
  });
}
function renderTexts(){
  groups.text.destroyChildren();
  STATE.texts.forEach(t=>{
    const x=STATE.offsetX+mmToPx(t.x),y=STATE.offsetY+mmToPx(t.y);
    const sel=STATE.selectedKind==='texts'&&STATE.selectedId===t.id||STATE.boxSelection.some(b=>b.kind==='texts'&&b.id===t.id);
    const txt=new Konva.Text({x,y,text:t.text,fontSize:t.fontSize||14,fontFamily:'Inter',fill:sel?'#E2725B':'#F5F1EB',id:t.id});
    txt.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('texts',t.id);});
    groups.text.add(txt);
  });
}
function renderMeasures(){
  groups.dimensions.destroyChildren();
  STATE.measures.forEach(m=>{
    const style=m.style||'simple';
    const sel=STATE.selectedKind==='measures'&&STATE.selectedId===m.id||STATE.boxSelection.some(b=>b.kind==='measures'&&b.id===m.id);
    const color=sel?'#E2725B':'#7A9BB5';
    const g=new Konva.Group({id:m.id});

    if(style==='arch'){
      // ── KS F 1501 건축 평면도 치수표기법 ──
      const dx=m.x2-m.x1, dy=m.y2-m.y1;
      const lenmm=Math.sqrt(dx*dx+dy*dy);
      if(lenmm<1){groups.dimensions.add(g);return;}
      const ux=dx/lenmm, uy=dy/lenmm;   // 치수선 방향 단위벡터
      const perpx=-uy, perpy=ux;         // 수직 단위벡터 (좌회전 90°)
      const side=m.side!=null?m.side:1;
      const offMm=(m.offsetMm||1500)*side;// 벽~치수선 거리
      const gapMm=50*side;               // 벽면~보조선 시작 갭
      const extMm=100*side;              // 치수선 너머 보조선 연장
      const tickPx=mmToPx(90);           // 사선 마크 반길이 (px)
      const textOffMm=120;               // 치수수치~치수선 간격

      const TX=xmm=>STATE.offsetX+mmToPx(xmm);
      const TY=ymm=>STATE.offsetY+mmToPx(ymm);

      // 치수선 끝점
      const d1x=m.x1+perpx*offMm, d1y=m.y1+perpy*offMm;
      const d2x=m.x2+perpx*offMm, d2y=m.y2+perpy*offMm;

      // 치수 보조선 (extension lines)
      g.add(new Konva.Line({points:[TX(m.x1+perpx*gapMm),TY(m.y1+perpy*gapMm),TX(m.x1+perpx*(offMm+extMm)),TY(m.y1+perpy*(offMm+extMm))],stroke:color,strokeWidth:0.6}));
      g.add(new Konva.Line({points:[TX(m.x2+perpx*gapMm),TY(m.y2+perpy*gapMm),TX(m.x2+perpx*(offMm+extMm)),TY(m.y2+perpy*(offMm+extMm))],stroke:color,strokeWidth:0.6}));

      // 치수선 (메인)
      g.add(new Konva.Line({points:[TX(d1x),TY(d1y),TX(d2x),TY(d2y)],stroke:color,strokeWidth:0.8,hitStrokeWidth:14}));

      // 사선 마크 (45° tick — KS 건축 표준)
      const cos45=Math.cos(Math.PI/4), sin45=Math.sin(Math.PI/4);
      const tkx=(ux*cos45-uy*sin45)*tickPx;
      const tky=(ux*sin45+uy*cos45)*tickPx;
      g.add(new Konva.Line({points:[TX(d1x)-tkx,TY(d1y)-tky,TX(d1x)+tkx,TY(d1y)+tky],stroke:color,strokeWidth:1.4}));
      g.add(new Konva.Line({points:[TX(d2x)-tkx,TY(d2y)-tky,TX(d2x)+tkx,TY(d2y)+tky],stroke:color,strokeWidth:1.4}));

      // 치수 수치 — 항상 위쪽(수평)/왼쪽(수직) 고정
      let tpx=perpx,tpy=perpy;
      if(tpy>1e-9||(Math.abs(tpy)<1e-9&&tpx>0)){tpx=-tpx;tpy=-tpy;}
      const tmx=(d1x+d2x)/2+tpx*textOffMm;
      const tmy=(d1y+d2y)/2+tpy*textOffMm;
      let rot=Math.atan2(dy,dx)*180/Math.PI;
      if(rot>=90||rot<-90) rot+=180;
      const t=new Konva.Text({x:TX(tmx),y:TY(tmy),text:Math.round(lenmm).toString(),fontSize:11,fontFamily:'JetBrains Mono',fill:color,fontStyle:'600',rotation:rot});
      t.offsetX(t.width()/2);t.offsetY(t.height()/2);
      g.add(t);

    } else {
      // 기존 simple 스타일 (줄자 도구 — 하위호환)
      const x1=STATE.offsetX+mmToPx(m.x1),y1=STATE.offsetY+mmToPx(m.y1);
      const x2=STATE.offsetX+mmToPx(m.x2),y2=STATE.offsetY+mmToPx(m.y2);
      const dist=Math.sqrt((m.x2-m.x1)**2+(m.y2-m.y1)**2);
      g.add(new Konva.Line({points:[x1,y1,x2,y2],stroke:sel?'#E2725B':'#B8B0A0',strokeWidth:1,dash:[5,3],hitStrokeWidth:12}));
      g.add(new Konva.Circle({x:x1,y:y1,radius:3,fill:sel?'#E2725B':'#B8B0A0'}));
      g.add(new Konva.Circle({x:x2,y:y2,radius:3,fill:sel?'#E2725B':'#B8B0A0'}));
      const mx=(x1+x2)/2,my=(y1+y2)/2;
      g.add(new Konva.Text({x:mx-50,y:my-18,width:100,align:'center',text:Math.round(dist)+' mm',fontSize:11,fontFamily:'JetBrains Mono',fill:sel?'#E2725B':'#D4B872',stroke:'#0A0A0A',strokeWidth:0.5}));
    }

    g.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('measures',m.id);});
    groups.dimensions.add(g);
  });
}
function renderAll(){
  renderWalls();renderSpaces();renderOpenings();
  renderRect(STATE.fixtures,groups.fixtures,FIXTURE_LIB,'fixtures');
  renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture');
  renderRect(STATE.hvac,groups.hvac,HVAC_FIRE_LIB,'hvac'); // v5.6
  renderLights();renderElectric();renderTexts();renderMeasures();
  renderCircles();renderArcs(); // v5.3
  renderAutoAreas(); // v5.4
  Object.entries(STATE.layers).forEach(([k,v])=>{if(groups[k]) groups[k].visible(v);});
  mainLayer.batchDraw();previewLayer.batchDraw();
}
// v5.4: 벽들이 만드는 폐곡면 자동 감지 → 면적 라벨 표시 (㎡)
function renderAutoAreas(){
  const cycles=findClosedCyclesInWalls();
  cycles.forEach(poly=>{
    // 이미 spaces로 등록된 폴리곤과 거의 같으면 스킵 (중복 표시 방지)
    const isRegistered=STATE.spaces.some(s=>polygonsSimilar(s.polygon,poly));
    if(isRegistered) return;
    const area=polyArea(poly)/1e6; // mm² → m²
    if(area<0.5) return; // 너무 작은 면적 무시
    let cx=0,cy=0;
    poly.forEach(p=>{cx+=p.x;cy+=p.y;});
    cx/=poly.length;cy/=poly.length;
    const px=STATE.offsetX+mmToPx(cx), py=STATE.offsetY+mmToPx(cy);
    labelGroup.add(new Konva.Text({
      x:px-50,y:py-12,text:'⌂ '+area.toFixed(2)+' ㎡',width:100,align:'center',
      fontSize:11,fontFamily:'JetBrains Mono',fill:'#5BA0D4',fontStyle:'600',
      shadowColor:'#000',shadowBlur:4,shadowOpacity:0.5,
    }));
  });
}
function polygonsSimilar(a,b,tol=200){
  if(a.length!==b.length) return false;
  // 시작점 다르더라도 같은 폴리곤일 수 있으므로 회전 비교
  for(let off=0;off<a.length;off++){
    let ok=true;
    for(let i=0;i<a.length;i++){
      const pa=a[(i+off)%a.length], pb=b[i];
      if(Math.abs(pa.x-pb.x)>tol||Math.abs(pa.y-pb.y)>tol){ok=false;break;}
    }
    if(ok) return true;
  }
  return false;
}
// 벽 그래프에서 가장 작은 폐곡면들 탐색 (최대 6각형까지)
function findClosedCyclesInWalls(){
  const tol=150; // 끝점 일치 톨러런스
  // 노드 = 끝점 (근접 통합), 간선 = 벽
  const nodes=[]; // {x,y, edges:[wallIdx,...]}
  const findOrAddNode=(p)=>{
    for(let i=0;i<nodes.length;i++){
      if(Math.abs(nodes[i].x-p.x)<tol&&Math.abs(nodes[i].y-p.y)<tol) return i;
    }
    nodes.push({x:p.x,y:p.y,edges:[]});
    return nodes.length-1;
  };
  const edges=[]; // {a:nodeIdx,b:nodeIdx,wallId}
  STATE.walls.forEach((w,wi)=>{
    const a=findOrAddNode({x:w.x1,y:w.y1});
    const b=findOrAddNode({x:w.x2,y:w.y2});
    if(a!==b){
      const ei=edges.length;
      edges.push({a,b,wallId:w.id});
      nodes[a].edges.push(ei);nodes[b].edges.push(ei);
    }
  });
  // DFS로 사이클 찾기 (최대 깊이 6)
  const cycles=[];const seenCycles=new Set();
  const dfs=(start,curr,path,visited)=>{
    if(path.length>6) return;
    for(const ei of nodes[curr].edges){
      const e=edges[ei];
      const nxt=e.a===curr?e.b:e.a;
      if(nxt===start&&path.length>=3){
        // 사이클 발견
        const key=[...path].sort((a,b)=>a-b).join(',');
        if(!seenCycles.has(key)){
          seenCycles.add(key);
          cycles.push(path.map(n=>({x:nodes[n].x,y:nodes[n].y})));
        }
        continue;
      }
      if(visited.has(nxt)) continue;
      visited.add(nxt);path.push(nxt);
      dfs(start,nxt,path,visited);
      path.pop();visited.delete(nxt);
    }
  };
  for(let s=0;s<nodes.length;s++){
    const visited=new Set([s]);
    dfs(s,s,[s],visited);
    if(cycles.length>20) break; // 안전 한계
  }
  return cycles;
}
// v5.3: 원·아크 렌더
function renderCircles(){
  groups.circles.destroyChildren();
  STATE.circles.forEach(c=>{
    const sel=STATE.selectedKind==='circles'&&STATE.selectedId===c.id;
    const inBox=STATE.boxSelection.some(b=>b.kind==='circles'&&b.id===c.id);
    const sp=c.spaceId?STATE.spaces.find(s=>s.id===c.spaceId):null;
    const stroke=(sel||inBox)?'#E2725B':(sp?SPACE_TYPES[sp.type].color:'#C9A961');
    const cx=STATE.offsetX+mmToPx(c.x), cy=STATE.offsetY+mmToPx(c.y);
    const k=new Konva.Circle({x:cx,y:cy,radius:mmToPx(c.radius_mm),stroke,strokeWidth:sel?2.5:1.6,fill:stroke+'15',id:c.id});
    k.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('circles',c.id);});
    groups.circles.add(k);
  });
}
function renderArcs(){
  groups.arcs.destroyChildren();
  STATE.arcs.forEach(a=>{
    const sel=STATE.selectedKind==='arcs'&&STATE.selectedId===a.id;
    const inBox=STATE.boxSelection.some(b=>b.kind==='arcs'&&b.id===a.id);
    const sp=a.spaceId?STATE.spaces.find(s=>s.id===a.spaceId):null;
    const stroke=(sel||inBox)?'#E2725B':(sp?SPACE_TYPES[sp.type].color:'#C9A961');
    const cx=STATE.offsetX+mmToPx(a.x), cy=STATE.offsetY+mmToPx(a.y);
    // Konva.Arc는 angle을 deg로 받음, rotation으로 startAngle 설정
    const sweep=((a.endAngle-a.startAngle)%360+360)%360;
    const k=new Konva.Arc({x:cx,y:cy,innerRadius:mmToPx(a.radius_mm),outerRadius:mmToPx(a.radius_mm),
      angle:sweep,rotation:a.startAngle,
      stroke,strokeWidth:sel?2.5:1.6,id:a.id});
    k.on('click tap',e=>{e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('arcs',a.id);});
    groups.arcs.add(k);
  });
}

// ===== 선택 =====
function selectObj(kind,id){STATE.selectedKind=kind;STATE.selectedId=id;renderAll();refreshUI();}
function deselect(){STATE.selectedKind=null;STATE.selectedId=null;renderAll();refreshUI();}

