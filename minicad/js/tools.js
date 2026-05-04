'use strict';
// ===== 도구 핸들러 / 마우스 / 키보드 =====
// ===== 추가 =====
// v5.3: 레이어 명명 헬퍼 (DXF 표준 + 공간 ID)
function makeLayerName(element,space){
  // element: WALL | DOOR | WIND | FURN | FIXT | LITE | ELEC | ANNO | DIMS | AREA | CIRC | ARC
  if(!space) return 'A-'+element;
  const code=SPACE_TYPES[space.type].code;
  return 'A-'+element+'-'+code+'-'+String(space.typeIndex||1).padStart(2,'0');
}
function findNearestSpace(mm){
  let nearest=null,minD=Infinity;
  STATE.spaces.forEach(s=>{
    s.polygon.forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest=s;}
    });
  });
  return nearest;
}

function addSpace(polygon){
  if(polygon.length<3) return;
  const tk=STATE.selectedSpaceType;
  const typeIndex=STATE.spaces.filter(s=>s.type===tk).length+1;
  const layerName='A-AREA-'+SPACE_TYPES[tk].code+'-'+String(typeIndex).padStart(2,'0');
  const dm=defaultMaterials(tk);
  // VEF: polygon → vertexIds (좌표를 공유 버텍스로 변환)
  const vertexIds=polygonToVertexIds(polygon);
  const s=makeSpaceVEF(vertexIds,{
    name:SPACE_TYPES[tk].name+typeIndex,type:tk,typeIndex,layerName,
    ceilingHeight_mm:SPACE_TYPES[tk].ceil||null,
    floorMaterial:dm.floor,ceilingMaterial:'GYPSUM',
  });
  STATE.spaces.push(s);
  // VEF: 공간 각 변을 벽 객체로 자동 생성 (이미 같은 버텍스 쌍의 벽이 있으면 건너뜀)
  const N=vertexIds.length;
  for(let i=0;i<N;i++){
    const aId=vertexIds[i], bId=vertexIds[(i+1)%N];
    const exists=STATE.walls.some(w=>(w.v1Id===aId&&w.v2Id===bId)||(w.v1Id===bId&&w.v2Id===aId));
    if(!exists){
      const wallLayer=layerName.replace('AREA','WALL');
      STATE.walls.push(makeWallVEF(aId,bId,{layerName:wallLayer,spaceId:s.id,finishMaterial:dm.wall}));
    }
  }
  STATE.videoSequenceOrder=null;
  saveHistory();selectObj('space',s.id);
}
function addWall(x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1;
  if(Math.sqrt(dx*dx+dy*dy)<100) return;
  const mid={x:(x1+x2)/2,y:(y1+y2)/2};
  const sp=findNearestSpace(mid);
  const layerName=makeLayerName('WALL',sp);
  const v1=ensureVertex(x1,y1), v2=ensureVertex(x2,y2);
  STATE.walls.push(makeWallVEF(v1.id,v2.id,{layerName,spaceId:sp?sp.id:null}));
  splitWallsAtIntersections();
  saveHistory();renderAll();refreshUI();
}
// 폴리곤을 선분 a-b로 분할 → [poly1, poly2] 또는 null
// 핵심: a-b를 폴리곤 바깥까지 무한 연장 후 교차 검사
// (선의 양 끝이 공간 내부에 있어도 분할 가능)
function splitPolygonByLine(polygon, a, b){
  const n=polygon.length;
  if(n<3) return null;
  // 선을 폴리곤 범위의 3배로 연장 (선 끝점이 공간 내부여도 분할 가능)
  const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y);
  const margin=(Math.max(...xs)-Math.min(...xs)+Math.max(...ys)-Math.min(...ys))*3+50000;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  if(len<1) return null;
  const ux=dx/len,uy=dy/len;
  const extA={x:a.x-ux*margin,y:a.y-uy*margin};
  const extB={x:b.x+ux*margin,y:b.y+uy*margin};
  // 각 꼭짓점의 부호 거리 (+1/-1/0=선 위)
  const lineLen=Math.hypot(extB.x-extA.x,extB.y-extA.y);
  const signOf=p=>{
    const d=((extB.y-extA.y)*p.x-(extB.x-extA.x)*p.y+extB.x*extA.y-extB.y*extA.x)/lineLen;
    return Math.abs(d)<2?0:d>0?1:-1;
  };
  const sides=polygon.map(signOf);
  // augmented polygon 생성: 변 중간 교차점 삽입
  const aug=[];
  for(let i=0;i<n;i++){
    aug.push({pt:{x:polygon[i].x,y:polygon[i].y},isInt:false,pi:i});
    const ni=(i+1)%n,s1=sides[i],s2=sides[ni];
    // 양 끝점이 반대편에 있을 때만 변 중간 교차점 삽입
    if(s1!==0&&s2!==0&&s1!==s2){
      const ip=segIntersection(extA,extB,polygon[i],polygon[ni]);
      if(ip){
        const edx=polygon[ni].x-polygon[i].x,edy=polygon[ni].y-polygon[i].y,len2=edx*edx+edy*edy;
        if(len2>=1){
          const t=((ip.x-polygon[i].x)*edx+(ip.y-polygon[i].y)*edy)/len2;
          if(t>0.001&&t<0.999) aug.push({pt:{x:Math.round(ip.x),y:Math.round(ip.y)},isInt:true,pi:-1});
        }
      }
    }
  }
  // 선 위에 있는 꼭짓점 중 진짜 교차점(이웃이 반대편)만 isInt 표시
  for(let i=0;i<aug.length;i++){
    const e=aug[i];
    if(e.pi<0||sides[e.pi]!==0) continue;
    let prev=0,next=0;
    for(let k=1;k<=n;k++){const s=sides[(e.pi-k+n)%n];if(s!==0){prev=s;break;}}
    for(let k=1;k<=n;k++){const s=sides[(e.pi+k)%n];if(s!==0){next=s;break;}}
    if(prev!==0&&next!==0&&prev!==next) e.isInt=true;
  }
  const intIdxs=[];
  aug.forEach((p,i)=>{if(p.isInt) intIdxs.push(i);});
  if(intIdxs.length<2) return null;
  // 두 교차점으로 폴리곤 분할 시도
  function trySplit(ia,ib){
    const m=aug.length;
    const p1=[];
    for(let k=ia;k<=ib;k++) p1.push(aug[k].pt);
    const p2=[];
    let k=ib;
    do{p2.push(aug[k].pt);k=(k+1)%m;}while(k!==ia);
    p2.push(aug[ia].pt);
    return(p1.length>=3&&p2.length>=3)?[p1,p2]:null;
  }
  if(intIdxs.length===2) return trySplit(intIdxs[0],intIdxs[1]);
  // 교차점이 3개 이상(오목 다각형): 가장 먼 쌍(첫·끝)부터 시도
  const r=trySplit(intIdxs[0],intIdxs[intIdxs.length-1]);
  if(r) return r;
  for(let ai=0;ai<intIdxs.length-1;ai++)
    for(let bi=ai+1;bi<intIdxs.length;bi++){
      const r2=trySplit(intIdxs[ai],intIdxs[bi]);
      if(r2) return r2;
    }
  return null;
}

function addLine(x1,y1,x2,y2){
  if(Math.hypot(x2-x1,y2-y1)<50) return;
  const a={x:x1,y:y1},b={x:x2,y:y2};
  // 공간을 가로지르면 분할
  const toRemove=[],toAdd=[];
  STATE.spaces.forEach(s=>{
    const result=splitPolygonByLine(s.polygon,a,b);
    if(!result) return;
    toRemove.push(s.id);
    result.forEach(poly=>toAdd.push({poly,source:s}));
  });
  if(toAdd.length){
    const srcWallMats=new Map(toRemove.map(id=>[id,STATE.walls.find(w=>w.spaceId===id&&!w.isLine)?.finishMaterial||null]));
    STATE.spaces=STATE.spaces.filter(s=>!toRemove.includes(s.id));
    STATE.walls=STATE.walls.filter(w=>!toRemove.includes(w.spaceId));
    const newIds=[];
    toAdd.forEach(({poly,source},idx)=>{
      const tk=source.type;
      const typeIndex=STATE.spaces.filter(s=>s.type===tk).length+1;
      const layerName='A-AREA-'+SPACE_TYPES[tk].code+'-'+String(typeIndex).padStart(2,'0');
      const vertexIds=polygonToVertexIds(simplifySpacePoly(poly.map(p=>({x:Math.round(p.x),y:Math.round(p.y)}))));
      const s=makeSpaceVEF(vertexIds,{
        name:source.name+'-'+(idx+1),type:tk,typeIndex,layerName,
        ceilingHeight_mm:source.ceilingHeight_mm,
        floorMaterial:source.floorMaterial,
        ceilingMaterial:source.ceilingMaterial,
      });
      STATE.spaces.push(s);
      newIds.push(s.id);
      const N=vertexIds.length;
      for(let i=0;i<N;i++){
        const aId=vertexIds[i],bId=vertexIds[(i+1)%N];
        if(!STATE.walls.some(w=>(w.v1Id===aId&&w.v2Id===bId)||(w.v1Id===bId&&w.v2Id===aId)))
          STATE.walls.push(makeWallVEF(aId,bId,{layerName:layerName.replace('AREA','WALL'),spaceId:s.id,finishMaterial:srcWallMats.get(source.id)||null}));
      }
    });
    saveHistory();renderAll();refreshUI();
    cmdToast('공간 분할 — '+toAdd.length+'개로 분리');
    setTimeout(()=>flashSplitSpaces(newIds),16);
    return;
  }
  // 공간 없으면 참조선으로 추가 (공간 테두리 스타일)
  const mid={x:(x1+x2)/2,y:(y1+y2)/2};
  const sp=findNearestSpace(mid);
  const v1=ensureVertex(x1,y1),v2=ensureVertex(x2,y2);
  const w=makeWallVEF(v1.id,v2.id,{layerName:makeLayerName('LINE',sp),spaceId:sp?sp.id:null});
  w.isLine=true;
  STATE.walls.push(w);
  saveHistory();renderAll();refreshUI();
}

// v5.8: 모든 벽 쌍 검사 → 교차점이 양 끝점이 아니면 양쪽 벽을 분할
// (vertex 자동 생성 — 교차점에서 4개 작은 벽으로 분할)
// 무한 루프 방지: 한 패스만 실행, 새 벽들은 큐에 추가
function splitWallsAtIntersections(){
  const TOL=50;
  let changed=true, safety=20;
  while(changed&&safety-->0){
    changed=false;
    outer: for(let i=0;i<STATE.walls.length;i++){
      const a=STATE.walls[i];
      for(let j=i+1;j<STATE.walls.length;j++){
        const b=STATE.walls[j];
        const ip=segIntersection(
          {x:a.x1,y:a.y1},{x:a.x2,y:a.y2},
          {x:b.x1,y:b.y1},{x:b.x2,y:b.y2});
        if(!ip) continue;
        const dAe=Math.min(Math.hypot(ip.x-a.x1,ip.y-a.y1),Math.hypot(ip.x-a.x2,ip.y-a.y2));
        const dBe=Math.min(Math.hypot(ip.x-b.x1,ip.y-b.y1),Math.hypot(ip.x-b.x2,ip.y-b.y2));
        if(dAe<TOL&&dBe<TOL) continue;
        // VEF: 교차 버텍스를 공유 버텍스로 생성
        const iv=ensureVertex(Math.round(ip.x),Math.round(ip.y),TOL);
        const newWalls=[];
        if(dAe>=TOL){
          if(Math.hypot(iv.x-a.x1,iv.y-a.y1)>=100) newWalls.push(makeWallVEF(a.v1Id,iv.id,a));
          if(Math.hypot(iv.x-a.x2,iv.y-a.y2)>=100) newWalls.push(makeWallVEF(iv.id,a.v2Id,a));
        }else newWalls.push(a);
        if(dBe>=TOL){
          if(Math.hypot(iv.x-b.x1,iv.y-b.y1)>=100) newWalls.push(makeWallVEF(b.v1Id,iv.id,b));
          if(Math.hypot(iv.x-b.x2,iv.y-b.y2)>=100) newWalls.push(makeWallVEF(iv.id,b.v2Id,b));
        }else newWalls.push(b);
        STATE.walls=STATE.walls.filter(w=>w.id!==a.id&&w.id!==b.id);
        newWalls.forEach(w=>{if(w!==a&&w!==b) STATE.walls.push(w);});
        if(newWalls.includes(a)) STATE.walls.push(a);
        if(newWalls.includes(b)) STATE.walls.push(b);
        changed=true;
        break outer;
      }
    }
  }
  if(safety<=0) console.warn('[VEF] splitWallsAtIntersections: 안전 한계');
}
function addOpening(pos,type){
  const mm=getMm(pos);
  // v5.2: 가까운 벽 또는 공간 모서리 탐색 → 각도 자동 적용
  let bestAngle=0, bestDist=Infinity, nearestSpace=null;
  // (1) walls 배열의 벽 객체 우선
  STATE.walls.forEach(w=>{
    const d=pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<bestDist){
      bestDist=d;
      bestAngle=Math.atan2(w.y2-w.y1,w.x2-w.x1)*180/Math.PI;
    }
  });
  // (2) 공간 폴리곤 모서리 (각 변)
  STATE.spaces.forEach(s=>{
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
      const d=pointToSegmentDist(mm,a,b);
      if(d<bestDist){
        bestDist=d;
        bestAngle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
        nearestSpace=s;
      }
      // 가까운 점도 별도 추적 (spaceId 결정용 fallback)
      const dx=a.x-mm.x,dy=a.y-mm.y;
      const dp=Math.sqrt(dx*dx+dy*dy);
      if(dp<bestDist+10&&!nearestSpace) nearestSpace=s;
    }
  });
  // 공간이 없으면 nearestSpace 결정 안됨 → 가까운 모서리 점으로 재시도
  if(!nearestSpace){
    let minD=Infinity;
    STATE.spaces.forEach(s=>s.polygon.forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearestSpace=s;}
    }));
  }
  if(!nearestSpace||bestDist>3000){showStatus('공간 모서리 또는 벽 가까이 클릭');return;}
  const lib=type==='DOOR'?DOOR_TYPES:WINDOW_TYPES;
  const subType=type==='DOOR'?'swing':'casement';
  const def=lib[subType];
  // 각도 정규화 0~359, 90도 스냅 옵션 (벽이 거의 수평/수직이면 정확히 0/90/180/270으로 보정)
  let ang=((bestAngle%360)+360)%360;
  const snapTo90=Math.round(ang/90)*90;
  if(Math.abs(ang-snapTo90)<5||Math.abs(ang-snapTo90)>355) ang=snapTo90%360;
  STATE.openings.push({
    id:makeId(type==='DOOR'?'d':'wn'),type,subType,
    spaceId:nearestSpace.id,x:mm.x,y:mm.y,
    width_mm:def.w,height_mm:def.h,depth_mm:def.d,
    sillHeight_mm:type==='WINDOW'?def.sill:null,
    angle:ang,
    layerName:makeLayerName(type==='DOOR'?'DOOR':'WIND',nearestSpace),
  });
  saveHistory();renderAll();refreshUI();
  cmdToast((type==='DOOR'?'문':'창')+' 추가 — 각도 '+Math.round(ang)+'°');
}
// v5.2: 점-선분 거리
function pointToSegmentDist(p,a,b){
  const dx=b.x-a.x, dy=b.y-a.y;
  const len2=dx*dx+dy*dy;
  if(len2<1) {const ddx=p.x-a.x,ddy=p.y-a.y; return Math.sqrt(ddx*ddx+ddy*ddy);}
  let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/len2;
  t=Math.max(0,Math.min(1,t));
  const px=a.x+t*dx, py=a.y+t*dy;
  const ex=p.x-px, ey=p.y-py;
  return Math.sqrt(ex*ex+ey*ey);
}
function addLibObject(pos,kind,type){
  const mm=getMm(pos);
  const sp=findNearestSpace(mm);
  const elem={fixtures:'FIXT',furniture:'FURN',lights:'LITE',electric:'ELEC',hvac:'HVAC'}[kind]||'OBJ';
  const o={id:makeId(kind.charAt(0)),type,x:mm.x,y:mm.y,angle:0,
    layerName:makeLayerName(elem,sp),spaceId:sp?sp.id:null};
  if(kind==='fixtures') STATE.fixtures.push(o);
  else if(kind==='furniture') STATE.furniture.push(o);
  else if(kind==='lights') STATE.lights.push(o);
  else if(kind==='electric') STATE.electric.push(o);
  else if(kind==='hvac') STATE.hvac.push(o); // v5.6
  saveHistory();renderAll();refreshUI();
}

// v5.3: 원·아크
function addCircle(cx,cy,radius){
  if(radius<10) return;
  const sp=findNearestSpace({x:cx,y:cy});
  STATE.circles.push({
    id:makeId('cir'),x:cx,y:cy,radius_mm:Math.round(radius),
    layerName:makeLayerName('CIRC',sp),spaceId:sp?sp.id:null,
  });
  saveHistory();renderAll();refreshUI();
  cmdToast('원 추가 — R '+Math.round(radius)+'mm');
}
function addArc(cx,cy,radius,startAngle,endAngle){
  if(radius<10) return;
  const sp=findNearestSpace({x:cx,y:cy});
  STATE.arcs.push({
    id:makeId('arc'),x:cx,y:cy,radius_mm:Math.round(radius),
    startAngle:Math.round(startAngle*100)/100,
    endAngle:Math.round(endAngle*100)/100,
    layerName:makeLayerName('ARC',sp),spaceId:sp?sp.id:null,
  });
  saveHistory();renderAll();refreshUI();
  cmdToast('아크 추가 — R '+Math.round(radius)+'mm');
}
function addText(pos){
  // v5.1: 명령창에서 단계별 입력
  const mm=getMm(pos);
  enterCmdMode('text-input',{pos:mm},'텍스트:','텍스트 입력 후 Enter (esc=취소)');
}
function handleMeasure(pos){
  const mm=getMm(pos);
  if(!STATE.measureFirst){
    STATE.measureFirst=mm;
    showStatus('두 번째 점 클릭 또는 거리(mm) 입력');
    enterCmdMode('measure-rel',{curX:mm.x,curY:mm.y},'길이(mm):','거리 또는 @dx,dy 입력 / 두 번째 점 클릭 가능 / esc=취소');
  }
  else{
    let end=mm;
    end=applyOrtho(STATE.measureFirst,end);
    STATE.measures.push({id:makeId('m'),x1:STATE.measureFirst.x,y1:STATE.measureFirst.y,x2:end.x,y2:end.y});
    STATE.measureFirst=null;
    saveHistory();renderAll();refreshUI();showStatus('치수 추가');
    if(STATE.cmdMode==='measure-rel') exitCmdMode();
  }
}

// ===== 그리기 =====
let drawState=null;
function startRect(pos){const mm=getMm(pos);drawState={type:'rect',start:mm,current:mm};updatePreview();}
function updateRect(pos){if(!drawState||drawState.type!=='rect') return;drawState.current=getMm(pos);updatePreview();}
function endRect(){
  if(!drawState||drawState.type!=='rect') return;
  const{start,current}=drawState;
  const minX=Math.min(start.x,current.x),maxX=Math.max(start.x,current.x);
  const minY=Math.min(start.y,current.y),maxY=Math.max(start.y,current.y);
  if(maxX-minX>=100&&maxY-minY>=100){
    addSpace([{x:minX,y:minY},{x:maxX,y:minY},{x:maxX,y:maxY},{x:minX,y:maxY}]);
  }
  drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
}
let polyState=null; // {n:int, center?:{x,y}, phase:'center'|'radius'}
let polyClickGuard=false; // polygon-n 처리 직후 Enter keyup 등 의도치 않은 클릭 방지
function clickPolygon(pos){
  if(!polyState||polyClickGuard) return;
  if(polyState.phase==='center'){
    polyState.center=getMm(pos);
    polyState.phase='radius';
    enterCmdMode('polygon-r',{},'반지름(mm):','반지름 Enter 또는 캔버스 클릭으로 지정');
  } else if(polyState.phase==='radius'&&polyState.center){
    const mm=getMm(pos);
    const r=Math.hypot(mm.x-polyState.center.x,mm.y-polyState.center.y);
    if(r>=50) createRegularPolygon(polyState.center,r,polyState.n);
    else cmdToast('50mm 이상 반지름 클릭');
  }
}
function updatePolygonPreview(pos){
  if(!polyState||polyState.phase!=='radius'||!polyState.center) return;
  drawGroup.destroyChildren();
  const mm=getMm(pos);
  const r=Math.hypot(mm.x-polyState.center.x,mm.y-polyState.center.y);
  if(r<10){previewLayer.batchDraw();return;}
  const n=polyState.n;
  const pts=[];
  for(let i=0;i<n;i++){
    const angle=2*Math.PI*i/n-Math.PI/2;
    pts.push(STATE.offsetX+mmToPx(polyState.center.x+r*Math.cos(angle)));
    pts.push(STATE.offsetY+mmToPx(polyState.center.y+r*Math.sin(angle)));
  }
  drawGroup.add(new Konva.Line({points:pts,closed:true,stroke:'#C9A961',strokeWidth:1.5,dash:[6,4]}));
  drawGroup.add(new Konva.Circle({x:STATE.offsetX+mmToPx(polyState.center.x),y:STATE.offsetY+mmToPx(polyState.center.y),radius:4,fill:'#C9A961',opacity:0.8}));
  drawGroup.add(new Konva.Text({x:STATE.offsetX+mmToPx(polyState.center.x)+6,y:STATE.offsetY+mmToPx(polyState.center.y)-14,text:'R'+Math.round(r),fontSize:11,fontFamily:'JetBrains Mono',fill:'#C9A961'}));
  previewLayer.batchDraw();
}
function createRegularPolygon(center,radius,n){
  const pts=[];
  for(let i=0;i<n;i++){
    const angle=2*Math.PI*i/n-Math.PI/2;
    pts.push({x:Math.round(center.x+radius*Math.cos(angle)),y:Math.round(center.y+radius*Math.sin(angle))});
  }
  addSpace(pts);
  polyState=null;
  if(STATE.cmdMode==='polygon-r') exitCmdMode();
  drawGroup.destroyChildren();previewLayer.batchDraw();
  cmdToast(n+'각형 R'+Math.round(radius)+'mm 생성');
}
function startWall(pos){const mm=getMm(pos);drawState={type:'wall',start:mm,current:mm};updatePreview();}
function updateWall(pos){if(!drawState||drawState.type!=='wall') return;let mm=getMm(pos);mm=applyOrtho(drawState.start,mm);drawState.current=mm;updatePreview();}
function startLine(pos){const mm=getMm(pos);drawState={type:'line',start:mm,current:mm};updatePreview();}
function updateLine(pos){if(!drawState||drawState.type!=='line') return;let mm=getMm(pos);mm=applyOrtho(drawState.start,mm);drawState.current=mm;updatePreview();}
function endLine(){
  if(!drawState||drawState.type!=='line') return;
  const s=drawState.start,e=drawState.current;
  addLine(s.x,s.y,e.x,e.y);
  drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
}
function endWall(){
  if(!drawState||drawState.type!=='wall') return;
  let end=drawState.current;
  end=applyOrtho(drawState.start,end);
  addWall(drawState.start.x,drawState.start.y,end.x,end.y);
  drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
}
// v5.3: 원
function startCircle(pos){const mm=getMm(pos);drawState={type:'circle',center:mm,current:mm};updatePreview();}
function updateCircle(pos){if(!drawState||drawState.type!=='circle') return;drawState.current=getMm(pos);updatePreview();}
function endCircle(){
  if(!drawState||drawState.type!=='circle') return;
  const c=drawState.center, p=drawState.current;
  const r=Math.sqrt((p.x-c.x)**2+(p.y-c.y)**2);
  if(r>=10) addCircle(c.x,c.y,r);
  drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
}

// ===== 원형공간 (64점 폴리곤 공간) =====
function circleToPolygon(cx,cy,r,n=32){
  return Array.from({length:n},(_,i)=>{
    const a=(2*Math.PI*i)/n;
    return {x:Math.round(cx+r*Math.cos(a)),y:Math.round(cy+r*Math.sin(a))};
  });
}
function startCircleSpace(pos){
  const mm=getMm(pos);
  drawState={type:'circlespace',center:mm,current:mm};
  updatePreview();
}
function updateCircleSpace(pos){
  if(!drawState||drawState.type!=='circlespace') return;
  drawState.current=getMm(pos);
  updatePreview();
}
function endCircleSpace(){
  if(!drawState||drawState.type!=='circlespace') return;
  const c=drawState.center,p=drawState.current;
  const r=Math.hypot(p.x-c.x,p.y-c.y);
  if(r>=100){
    addCircleSpace(c.x,c.y,r);
  }else{
    // 클릭만 했으면 수치 입력 모드
    enterCmdMode('circlespace-r',{cx:c.x,cy:c.y},'반지름(mm):','원형공간 반지름 입력 후 Enter');
    return;
  }
  drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
}
function addCircleSpace(cx,cy,r){
  const poly=circleToPolygon(cx,cy,r);
  const tk=STATE.selectedSpaceType;
  const typeIndex=STATE.spaces.filter(s=>s.type===tk).length+1;
  const layerName='A-AREA-'+SPACE_TYPES[tk].code+'-'+String(typeIndex).padStart(2,'0');
  const dm=defaultMaterials(tk);
  const vertexIds=polygonToVertexIds(poly);
  const s=makeSpaceVEF(vertexIds,{
    name:SPACE_TYPES[tk].name+typeIndex,type:tk,typeIndex,layerName,
    ceilingHeight_mm:SPACE_TYPES[tk].ceil||null,
    floorMaterial:dm.floor,ceilingMaterial:'GYPSUM',
  });
  s._circleMeta={cx,cy,r};
  STATE.spaces.push(s);
  const N=vertexIds.length;
  for(let i=0;i<N;i++){
    const aId=vertexIds[i],bId=vertexIds[(i+1)%N];
    if(!STATE.walls.some(w=>(w.v1Id===aId&&w.v2Id===bId)||(w.v1Id===bId&&w.v2Id===aId))){
      STATE.walls.push(makeWallVEF(aId,bId,{layerName:layerName.replace('AREA','WALL'),spaceId:s.id,finishMaterial:dm.wall}));
    }
  }
  STATE.videoSequenceOrder=null;
  saveHistory();selectObj('space',s.id);
}

// v5.3: 아크 (드래그=중심+반지름, 미리 그리고 cmdMode로 각도 입력)
function startArc(pos){const mm=getMm(pos);drawState={type:'arc',center:mm,current:mm,startAngle:0,endAngle:90};updatePreview();}
function updateArc(pos){if(!drawState||drawState.type!=='arc') return;drawState.current=getMm(pos);updatePreview();}
function endArc(){
  if(!drawState||drawState.type!=='arc') return;
  const c=drawState.center, p=drawState.current;
  const r=Math.sqrt((p.x-c.x)**2+(p.y-c.y)**2);
  if(r>=10){
    // 드래그 끝점 각도를 시작각, 시작각+90을 끝각으로 (사용자가 cmdMode로 수정 가능)
    const ang=Math.atan2(p.y-c.y,p.x-c.x)*180/Math.PI;
    addArc(c.x,c.y,r,ang,ang+90);
  }
  drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
}
// v5.3: 박스 선택 종료 — 박스 안 객체들 boxSelection에 추가
function finishBoxSelection(){
  if(!drawState||drawState.type!=='box') return;
  const s=drawState.start, c=drawState.current;
  const x1=Math.min(s.x,c.x), y1=Math.min(s.y,c.y);
  const x2=Math.max(s.x,c.x), y2=Math.max(s.y,c.y);
  const isCrossing=c.x<s.x; // 우→좌 = crossing
  const inBox=(p)=>p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2;
  // 객체별 검사: window=완전포함 / crossing=하나라도 걸치면
  const tests={
    walls:w=>{const a=inBox({x:w.x1,y:w.y1}),b=inBox({x:w.x2,y:w.y2});return isCrossing?(a||b):(a&&b);},
    spaces:s=>{const all=s.polygon.every(inBox), any=s.polygon.some(inBox);return isCrossing?any:all;},
    openings:o=>inBox({x:o.x,y:o.y}),
    furniture:o=>inBox({x:o.x,y:o.y}),
    fixtures:o=>inBox({x:o.x,y:o.y}),
    lights:o=>inBox({x:o.x,y:o.y}),
    electric:o=>inBox({x:o.x,y:o.y}),
    texts:o=>inBox({x:o.x,y:o.y}),
    measures:m=>{const a=inBox({x:m.x1,y:m.y1}),b=inBox({x:m.x2,y:m.y2});return isCrossing?(a||b):(a&&b);},
    circles:c=>inBox({x:c.x,y:c.y}),
    arcs:a=>inBox({x:a.x,y:a.y}),
    hvac:o=>inBox({x:o.x,y:o.y}),
  };
  const map={walls:'wall',spaces:'space',openings:'opening',furniture:'furniture',fixtures:'fixtures',lights:'lights',electric:'electric',texts:'texts',measures:'measures',circles:'circles',arcs:'arcs',hvac:'hvac'};
  let added=0;
  Object.entries(tests).forEach(([key,fn])=>{
    STATE[key].forEach(o=>{if(fn(o)){STATE.boxSelection.push({kind:map[key],id:o.id});added++;}});
  });
  // 중복 제거
  const seen=new Set();
  STATE.boxSelection=STATE.boxSelection.filter(b=>{const k=b.kind+':'+b.id;if(seen.has(k))return false;seen.add(k);return true;});
  cmdToast(STATE.boxSelection.length+'개 선택됨'+(isCrossing?' (Crossing)':' (Window)'));
  renderAll();refreshUI();
}
// v5.3: 다중 삭제
function deleteBoxSelection(){
  if(STATE.boxSelection.length===0) return false;
  const groups2={wall:'walls',space:'spaces',opening:'openings',furniture:'furniture',fixtures:'fixtures',lights:'lights',electric:'electric',texts:'texts',measures:'measures',circles:'circles',arcs:'arcs',hvac:'hvac'};
  STATE.boxSelection.forEach(b=>{
    const arrName=groups2[b.kind];
    if(!arrName) return;
    if(b.kind==='space'){
      STATE.spaces=STATE.spaces.filter(x=>x.id!==b.id);
      STATE.openings=STATE.openings.filter(o=>o.spaceId!==b.id);
    }else{
      STATE[arrName]=STATE[arrName].filter(x=>x.id!==b.id);
    }
  });
  const n=STATE.boxSelection.length;
  STATE.boxSelection=[];
  saveHistory();renderAll();refreshUI();
  cmdToast(n+'개 삭제');
  return true;
}

// v5.3+v5.4: 트림 — 벽·공간·원 모두 지원, 깨지면 도형 분해
function handleTrim(pos){
  // Boolean 메뉴가 열려있으면 트림 무시 (메뉴 버튼 클릭 중)
  const bm=document.getElementById('bool-menu');
  if(bm&&bm.style.display==='flex') return;
  const mm=getMm(pos);

  // ====== 면 트림: 클릭한 공간 = 상위(커터) → Boolean 메뉴 표시 ======
  const faceSp=[...STATE.spaces].reverse().find(s=>ptInPoly(mm,s.polygon));
  if(faceSp){
    // 겹치는 하위 공간 수집 (faceSp 안에 포함되거나 겹치는 것 모두)
    const lowers=STATE.spaces.filter(s=>{
      if(s.id===faceSp.id) return false;
      return suthHodg(s.polygon,faceSp.polygon).length>=3&&
        (ptInPoly(mm,s.polygon)||s.polygon.every(p=>ptInPoly(p,faceSp.polygon)));
    });
    if(lowers.length){showBoolMenu(pos,faceSp,lowers);return;}
    cmdToast('클릭 위치에 겹치는 하위 공간 없음 — 겹침 영역을 직접 클릭하세요');
    return;
  }

  // 후보: 벽 우선 → 벽 없을 때만 공간 에지 → 원
  let kind=null,target=null,minD=500,extra=null;

  // 1순위: 벽 (공간 에지보다 항상 우선)
  STATE.walls.forEach(w=>{
    const d=pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<minD){minD=d;target=w;kind='wall';extra=null;}
  });

  // 2순위: 공간 에지 — 벽이 선택되지 않은 경우에만 체크
  if(kind!=='wall'){
    STATE.spaces.forEach(s=>{
      for(let i=0;i<s.polygon.length;i++){
        const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
        const d=pointToSegmentDist(mm,a,b);
        if(d<minD){minD=d;target=s;kind='space';extra={edgeIdx:i};}
      }
    });
  }

  // 3순위: 원 (항상 체크)
  STATE.circles.forEach(c=>{
    const dx=mm.x-c.x, dy=mm.y-c.y;
    const dr=Math.abs(Math.sqrt(dx*dx+dy*dy)-c.radius_mm);
    if(dr<minD){minD=dr;target=c;kind='circle';extra=null;}
  });
  if(!target){cmdToast('자를 객체 가까이 클릭 (벽/사각공간 변/원)');return;}

  // ====== 벽 트림 (기존 v5.3 로직) ======
  if(kind==='wall'){
    const intersections=collectWallIntersections(target);
    if(intersections.length===0){cmdToast('교차하는 다른 선분 없음');return;}
    const t0=segParam(target,mm);
    let leftT=0, rightT=1;
    intersections.forEach(ip=>{const t=segParam(target,ip);if(t<t0&&t>leftT) leftT=t;if(t>t0&&t<rightT) rightT=t;});
    const fragments=[];
    if(leftT>0.01) fragments.push({t1:0,t2:leftT});
    if(rightT<0.99) fragments.push({t1:rightT,t2:1});
    STATE.walls=STATE.walls.filter(w=>w.id!==target.id);
    fragments.forEach(f=>{
      const ax=target.x1+(target.x2-target.x1)*f.t1, ay=target.y1+(target.y2-target.y1)*f.t1;
      const bx=target.x1+(target.x2-target.x1)*f.t2, by=target.y1+(target.y2-target.y1)*f.t2;
      if(Math.sqrt((bx-ax)**2+(by-ay)**2)<100) return;
      // VEF: t=0이면 원래 v1Id, t=1이면 원래 v2Id 재사용 (vertex 공유 유지)
      const hasVEF='v1Id' in target;
      const va=hasVEF&&f.t1<0.001?target.v1Id:ensureVertex(Math.round(ax),Math.round(ay),20).id;
      const vb=hasVEF&&f.t2>0.999?target.v2Id:ensureVertex(Math.round(bx),Math.round(by),20).id;
      STATE.walls.push(makeWallVEF(va,vb,{thickness:target.thickness||100,layerName:target.layerName,spaceId:target.spaceId,isLine:target.isLine||false}));
    });
    saveHistory();renderAll();refreshUI();
    cmdToast('벽 트림 — '+fragments.length+'조각');
    return;
  }

  // ====== 공간 에지 클릭 → 클릭한 공간 = 상위(커터) → Boolean 메뉴 ======
  if(kind==='space'){
    const lowers2=STATE.spaces.filter(s=>s.id!==target.id&&suthHodg(s.polygon,target.polygon).length>=3);
    if(lowers2.length){showBoolMenu(pos,target,lowers2);return;}
    cmdToast('겹치는 공간 없음 — 면 트림 불가');
    return;
  }

  // ====== 원 트림: 클릭 위치를 기준으로 가장 가까운 두 교차점 사이 호 제거 → 아크 1~2개 ======
  if(kind==='circle'){
    const circle=target;
    // v5.5: 모든 선분(벽 + 공간 폴리곤 변)과 다른 원과의 교차점 수집
    const intersections=[];
    const addLineIntersect=(pa,pb)=>{
      const ipts=lineCircleIntersection(pa,pb,circle.x,circle.y,circle.radius_mm);
      ipts.forEach(p=>{
        const dx=pb.x-pa.x, dy=pb.y-pa.y;
        const len2=dx*dx+dy*dy;
        if(len2<1) return;
        const t=((p.x-pa.x)*dx+(p.y-pa.y)*dy)/len2;
        if(t>=-0.001&&t<=1.001) intersections.push(p);
      });
    };
    STATE.walls.forEach(w=>addLineIntersect({x:w.x1,y:w.y1},{x:w.x2,y:w.y2}));
    STATE.spaces.forEach(s=>{
      for(let i=0;i<s.polygon.length;i++){
        const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
        addLineIntersect(a,b);
      }
    });
    // 다른 원과의 교차점 (2 circles intersection)
    STATE.circles.forEach(c2=>{
      if(c2.id===circle.id) return;
      const ipts=circleCircleIntersection(circle.x,circle.y,circle.radius_mm,c2.x,c2.y,c2.radius_mm);
      ipts.forEach(p=>intersections.push(p));
    });
    if(intersections.length<2){cmdToast('교차하는 선/원이 부족 (최소 2개 필요)');return;}
    // 클릭 위치의 각도
    const clickAng=Math.atan2(mm.y-circle.y,mm.x-circle.x)*180/Math.PI;
    // 교차점들의 각도 → 정렬
    const angs=intersections.map(p=>{
      let a=Math.atan2(p.y-circle.y,p.x-circle.x)*180/Math.PI;
      return ((a%360)+360)%360;
    }).sort((x,y)=>x-y);
    const ca=((clickAng%360)+360)%360;
    // 클릭 각도를 둘러싼 인접 두 각도 찾기
    let lo=null,hi=null;
    for(let i=0;i<angs.length;i++){
      const next=angs[(i+1)%angs.length];
      const inSegment=next>angs[i]?(ca>=angs[i]&&ca<=next):(ca>=angs[i]||ca<=next);
      if(inSegment){lo=angs[i];hi=next;break;}
    }
    if(lo===null){cmdToast('각도 계산 실패');return;}
    // 원 제거 → 잘리고 남은 호를 아크로 추가 (제거 구간 = lo~hi)
    STATE.circles=STATE.circles.filter(c=>c.id!==circle.id);
    // 남은 부분: hi → lo (시계방향으로 lo 포함하도록)
    addArc(circle.x,circle.y,circle.radius_mm,hi,lo+(hi>lo?360:0));
    saveHistory();renderAll();refreshUI();
    cmdToast('원 → 아크로 분해 (잘린 부분 제거)');
    return;
  }
}
function collectWallIntersections(target){
  const intersections=[];
  const ta={x:target.x1,y:target.y1}, tb={x:target.x2,y:target.y2};
  // 다른 벽과의 교차점
  STATE.walls.forEach(w=>{
    if(w.id===target.id) return;
    const ip=segIntersection(ta,tb,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(ip) intersections.push(ip);
  });
  // 공간 폴리곤 변과의 교차점 — 공간은 수정하지 않고 절단 기준으로만 참조
  STATE.spaces.forEach(s=>{
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i],b=s.polygon[(i+1)%s.polygon.length];
      const ip=segIntersection(ta,tb,a,b);
      if(ip&&!intersections.some(p=>Math.abs(p.x-ip.x)<2&&Math.abs(p.y-ip.y)<2))
        intersections.push(ip);
    }
  });
  return intersections;
}
// v5.4: 선과 원의 교차점 (최대 2점)
function lineCircleIntersection(p1,p2,cx,cy,r){
  const dx=p2.x-p1.x, dy=p2.y-p1.y;
  const fx=p1.x-cx, fy=p1.y-cy;
  const a=dx*dx+dy*dy;
  const b=2*(fx*dx+fy*dy);
  const c=fx*fx+fy*fy-r*r;
  const disc=b*b-4*a*c;
  if(disc<0) return [];
  const sq=Math.sqrt(disc);
  const t1=(-b-sq)/(2*a), t2=(-b+sq)/(2*a);
  return [{x:p1.x+dx*t1,y:p1.y+dy*t1},{x:p1.x+dx*t2,y:p1.y+dy*t2}];
}
// v5.5: 두 원의 교차점 (최대 2점)
function circleCircleIntersection(x1,y1,r1,x2,y2,r2){
  const dx=x2-x1, dy=y2-y1;
  const d=Math.sqrt(dx*dx+dy*dy);
  if(d>r1+r2||d<Math.abs(r1-r2)||d<1e-6) return [];
  const a=(r1*r1-r2*r2+d*d)/(2*d);
  const h2=r1*r1-a*a;
  if(h2<0) return [];
  const h=Math.sqrt(h2);
  const px=x1+a*dx/d, py=y1+a*dy/d;
  return [
    {x:px+h*dy/d, y:py-h*dx/d},
    {x:px-h*dy/d, y:py+h*dx/d},
  ];
}
// v5.3: 브레이크 — 선분을 클릭점에서 분할
// v5.4: 벽 클릭 → 자동 치수선 생성 (벽 양 끝점 기준)
// v5.9: Offset — 같은 타입 복사(선→선, 벽→벽), 연속 사용
let offsetState=null; // {distance, target?}
function handleOffsetClick(pos){
  const mm=getMm(pos);
  if(!offsetState?.distance){
    enterCmdMode('offset-d',{},'옵셋 거리(mm):','거리 Enter → 객체 클릭 → 방향 클릭');
    return;
  }
  // 1단계: 객체 선택 (벽/선/원 중 가장 가까운 것)
  if(!offsetState.target){
    let best=null,minD=500;
    STATE.walls.forEach(w=>{
      const d=pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
      if(d<minD){minD=d;best={kind:'wall',obj:w};}
    });
    STATE.circles.forEach(c=>{
      const dx=mm.x-c.x,dy=mm.y-c.y;
      const dr=Math.abs(Math.sqrt(dx*dx+dy*dy)-c.radius_mm);
      if(dr<minD){minD=dr;best={kind:'circle',obj:c};}
    });
    if(!best){cmdToast('옵셋할 객체 가까이 클릭 (벽/선/원)');return;}
    offsetState.target=best;
    drawGroup.destroyChildren();
    cmdToast((best.obj.isLine?'선':'벽/원')+' 선택 — 방향을 클릭하세요 (거리: '+offsetState.distance+'mm)');
    return;
  }
  // 2단계: 방향 클릭 → 같은 타입으로 복사
  const t=offsetState.target;
  const dist=offsetState.distance;
  if(t.kind==='wall'){
    const w=t.obj;
    const dx=w.x2-w.x1, dy=w.y2-w.y1;
    const len=Math.sqrt(dx*dx+dy*dy);
    if(len<1){offsetState.target=null;return;}
    const nx=-dy/len, ny=dx/len;
    const cx=(w.x1+w.x2)/2, cy=(w.y1+w.y2)/2;
    const sgn=Math.sign((mm.x-cx)*nx+(mm.y-cy)*ny)||1;
    const ox=nx*sgn*dist, oy=ny*sgn*dist;
    const x1=w.x1+ox, y1=w.y1+oy, x2=w.x2+ox, y2=w.y2+oy;
    if(w.isLine){
      // 선 → 선 복사 (공간 분할 없이 직접 생성)
      if(Math.hypot(x2-x1,y2-y1)>=50){
        const v1=ensureVertex(x1,y1),v2=ensureVertex(x2,y2);
        const nw=makeWallVEF(v1.id,v2.id,{layerName:w.layerName,spaceId:w.spaceId});
        nw.isLine=true;
        STATE.walls.push(nw);
        saveHistory();renderAll();refreshUI();
        cmdToast('선 옵셋 '+dist+'mm — 다음 객체 클릭 (Esc=종료)');
      }
    }else{
      // 벽 → 벽 복사 (두께·마감재 유지)
      if(Math.hypot(x2-x1,y2-y1)>=100){
        const mid={x:(x1+x2)/2,y:(y1+y2)/2};
        const sp=findNearestSpace(mid);
        const v1=ensureVertex(x1,y1),v2=ensureVertex(x2,y2);
        STATE.walls.push(makeWallVEF(v1.id,v2.id,{
          layerName:makeLayerName('WALL',sp),
          spaceId:sp?sp.id:null,
          thickness:w.thickness,
          finishMaterial:w.finishMaterial,
          height_mm:w.height_mm,
        }));
        splitWallsAtIntersections();
        saveHistory();renderAll();refreshUI();
        cmdToast('벽 옵셋 '+dist+'mm — 다음 객체 클릭 (Esc=종료)');
      }
    }
  }else if(t.kind==='circle'){
    const c=t.obj;
    const dx=mm.x-c.x,dy=mm.y-c.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    const sgn=d>c.radius_mm?1:-1;
    const newR=c.radius_mm+sgn*dist;
    if(newR>10){
      addCircle(c.x,c.y,newR);
      cmdToast('원 옵셋 R'+newR+'mm — 다음 객체 클릭 (Esc=종료)');
    }else{
      cmdToast('반지름이 너무 작습니다');
    }
  }
  // 연속 사용: target만 초기화, distance·tool 유지
  offsetState.target=null;
  drawGroup.destroyChildren();previewLayer.batchDraw();
}

// v5.6: Mirror — 박스선택 또는 단일선택 객체를 기준선 대칭 복제
let mirrorState=null; // {phase:'pickLine1'|'pickLine2', p1?}
function startMirror(){
  if(STATE.boxSelection.length===0&&!STATE.selectedKind){
    cmdToast('미러할 객체를 먼저 선택 (V로 박스 선택 또는 객체 클릭)');
    return false;
  }
  mirrorState={phase:'pickLine1'};
  setTool('mirror');
  enterCmdMode('mirror-line1',{},'기준선 1점:','기준선 첫 점 클릭');
  return true;
}
function handleMirrorClick(pos){
  const mm=getMm(pos);
  if(!mirrorState) return;
  if(mirrorState.phase==='pickLine1'){
    mirrorState.p1=mm;
    mirrorState.phase='pickLine2';
    enterCmdMode('mirror-line2',{},'기준선 2점:','기준선 끝 점 클릭');
    return;
  }
  if(mirrorState.phase==='pickLine2'){
    mirrorState.p2=mm;
    // 미러 적용
    const targets=STATE.boxSelection.length>0?[...STATE.boxSelection]:[{kind:STATE.selectedKind,id:STATE.selectedId}];
    let cnt=0;
    targets.forEach(t=>{
      const obj=getArr(t.kind)?.find(o=>o.id===t.id);
      if(!obj) return;
      const copy=JSON.parse(JSON.stringify(obj));
      copy.id=makeId(t.kind.charAt(0));
      mirrorObject(copy,mirrorState.p1,mirrorState.p2);
      const arrName={wall:'walls',space:'spaces',opening:'openings',furniture:'furniture',fixtures:'fixtures',lights:'lights',electric:'electric',texts:'texts',measures:'measures',circles:'circles',arcs:'arcs',hvac:'hvac'}[t.kind];
      if(arrName) STATE[arrName].push(copy);
      cnt++;
    });
    saveHistory();renderAll();refreshUI();
    cmdToast('미러 — '+cnt+'개 복제');
    mirrorState=null;
    drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    setTool('select');
  }
}
// 점 p를 직선 (a,b) 기준 대칭
function reflectPoint(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  const len2=dx*dx+dy*dy;
  if(len2<1) return {x:p.x,y:p.y};
  const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/len2;
  const fx=a.x+t*dx, fy=a.y+t*dy; // 발 (foot)
  return {x:Math.round(2*fx-p.x), y:Math.round(2*fy-p.y)};
}
function mirrorObject(obj,a,b){
  if('x' in obj){
    const r=reflectPoint({x:obj.x,y:obj.y},a,b);
    obj.x=r.x;obj.y=r.y;
    // 각도 반전
    if('angle' in obj){
      const lineAng=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
      obj.angle=(2*lineAng-(obj.angle||0)+360)%360;
    }
    // v5.7: shape 좌우반전 플래그 — 라이브러리 shape이 비대칭일 때 시각 반영
    obj.flipped=!obj.flipped;
  }
  // VEF: 벽 미러 — 새 버텍스 생성 후 getter 재설치
  if('v1Id' in obj){
    const r1=reflectPoint({x:obj.x1,y:obj.y1},a,b);
    const r2=reflectPoint({x:obj.x2,y:obj.y2},a,b);
    obj.v1Id=ensureVertex(r1.x,r1.y).id;
    obj.v2Id=ensureVertex(r2.x,r2.y).id;
    reinstallVEF(obj);
  } else if('x1' in obj){
    const r1=reflectPoint({x:obj.x1,y:obj.y1},a,b);
    const r2=reflectPoint({x:obj.x2,y:obj.y2},a,b);
    obj.x1=r1.x;obj.y1=r1.y;obj.x2=r2.x;obj.y2=r2.y;
  }
  // VEF: 공간 미러 — 새 버텍스 생성 후 getter 재설치
  if('vertexIds' in obj&&obj.polygon){
    const reflected=obj.polygon.map(p=>reflectPoint(p,a,b));
    obj.vertexIds=reflected.map(p=>ensureVertex(p.x,p.y).id);
    reinstallVEF(obj);
  } else if(obj.polygon&&!('vertexIds' in obj)){
    obj.polygon=obj.polygon.map(p=>reflectPoint(p,a,b));
  }
  if('startAngle' in obj){
    // 아크 각도 반전 (선 각도가 0이면 y축 대칭)
    const lineAng=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    const sa=(2*lineAng-obj.startAngle+360)%360;
    const ea=(2*lineAng-obj.endAngle+360)%360;
    obj.startAngle=ea;obj.endAngle=sa; // 방향 반전
  }
}

function handleDimWall(pos){
  const mm=getMm(pos);
  let target=null,minD=Infinity;
  STATE.walls.forEach(w=>{
    const d=pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<minD){minD=d;target=w;}
  });
  if(!target||minD>500){cmdToast('치수 잴 벽 가까이 클릭');return;}

  // 클릭 위치 기준 치수선 방향 결정 (클릭한 쪽으로 치수선 나감)
  const wdx=target.x2-target.x1, wdy=target.y2-target.y1;
  const wlen=Math.sqrt(wdx*wdx+wdy*wdy)||1;
  const perpx=-wdy/wlen, perpy=wdx/wlen; // 좌회전 수직
  const midx=(target.x1+target.x2)/2, midy=(target.y1+target.y2)/2;
  const side=-1; // 항상 외부(CW 기준 우회전 방향)

  const layerSuffix=target.spaceId?(STATE.spaces.find(s=>s.id===target.spaceId)?SPACE_TYPES[STATE.spaces.find(s=>s.id===target.spaceId).type].code:'GEN'):'GEN';
  STATE.measures.push({
    id:makeId('m'),
    x1:target.x1,y1:target.y1,x2:target.x2,y2:target.y2,
    layerName:'A-DIMS-'+layerSuffix+'-01',
    style:'arch',
    offsetMm:1500,
    side:side,
  });
  saveHistory();renderAll();refreshUI();
  const len=Math.round(Math.sqrt((target.x2-target.x1)**2+(target.y2-target.y1)**2));
  cmdToast('치수선 추가 — '+len+'mm (I 키 반복·클릭 위치로 방향 전환)');
}
function handleBreak(pos){
  const mm=getMm(pos);
  let target=null,minD=Infinity;
  STATE.walls.forEach(w=>{
    const d=pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<minD){minD=d;target=w;}
  });
  if(!target||minD>500){cmdToast('분할할 선분 가까이 클릭 (벽)');return;}
  const t=segParam(target,mm);
  if(t<=0.01||t>=0.99){cmdToast('선분 끝점 너무 가까움');return;}
  const px=target.x1+(target.x2-target.x1)*t, py=target.y1+(target.y2-target.y1)*t;
  STATE.walls=STATE.walls.filter(w=>w.id!==target.id);
  const bv=ensureVertex(Math.round(px),Math.round(py));
  if('v1Id' in target){
    STATE.walls.push(makeWallVEF(target.v1Id,bv.id,target));
    STATE.walls.push(makeWallVEF(bv.id,target.v2Id,target));
  }else{
    const sv1=ensureVertex(target.x1,target.y1);
    const sv2=ensureVertex(target.x2,target.y2);
    STATE.walls.push(makeWallVEF(sv1.id,bv.id,target));
    STATE.walls.push(makeWallVEF(bv.id,sv2.id,target));
  }
  saveHistory();renderAll();refreshUI();
  cmdToast('브레이크 완료 — 2조각');
}
// 지우개: 클릭 위치의 가장 가까운 객체 삭제 (모든 타입)
function handleEraser(pos){
  const mm=getMm(pos);
  const HIT=300;
  let best=null,bestD=HIT;
  function tryHit(kind,obj,d){if(d<bestD){bestD=d;best={kind,obj};}}

  // 포인트 객체 (문/창/가구/위생/조명/전기/공조)
  STATE.openings.forEach(o=>tryHit('opening',o,Math.hypot(mm.x-o.x,mm.y-o.y)));
  [[STATE.furniture,'furniture'],[STATE.fixtures,'fixtures'],
   [STATE.lights,'lights'],[STATE.electric,'electric'],[STATE.hvac,'hvac']
  ].forEach(([arr,k])=>arr.forEach(o=>tryHit(k,o,Math.hypot(mm.x-o.x,mm.y-o.y))));
  STATE.texts.forEach(t=>tryHit('texts',t,Math.hypot(mm.x-t.x,mm.y-t.y)));

  // 선/호 객체
  STATE.walls.forEach(w=>tryHit('wall',w,pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2})));
  STATE.measures.forEach(m=>tryHit('measures',m,pointToSegmentDist(mm,{x:m.x1,y:m.y1},{x:m.x2,y:m.y2})));
  STATE.circles.forEach(c=>tryHit('circles',c,Math.abs(Math.hypot(mm.x-c.x,mm.y-c.y)-c.radius_mm)));
  STATE.arcs.forEach(a=>tryHit('arcs',a,Math.abs(Math.hypot(mm.x-a.x,mm.y-a.y)-a.radius_mm)));

  // 공간 에지 (벽보다 낮은 우선순위)
  if(!best||bestD>50){
    STATE.spaces.forEach(s=>{
      for(let i=0;i<s.polygon.length;i++){
        const a=s.polygon[i],b=s.polygon[(i+1)%s.polygon.length];
        tryHit('space',s,pointToSegmentDist(mm,a,b));
      }
    });
  }

  // 공간 면 (최후 수단: 에지/선 없을 때)
  if(!best){
    const sp=[...STATE.spaces].reverse().find(s=>ptInPoly(mm,s.polygon));
    if(sp) best={kind:'space',obj:sp};
  }

  if(!best){cmdToast('지울 객체 없음');return;}

  const {kind,obj}=best;
  if(kind==='space'){
    STATE.spaces=STATE.spaces.filter(x=>x.id!==obj.id);
    STATE.openings=STATE.openings.filter(o=>o.spaceId!==obj.id);
    STATE.walls=STATE.walls.filter(w=>w.spaceId!==obj.id);
  }else if(kind==='wall'){
    STATE.walls=STATE.walls.filter(x=>x.id!==obj.id);
  }else if(kind==='opening'){
    STATE.openings=STATE.openings.filter(x=>x.id!==obj.id);
  }else{
    const arr=getArr(kind);
    if(arr){const idx=arr.findIndex(x=>x.id===obj.id);if(idx>=0)arr.splice(idx,1);}
  }
  cleanupOrphanVertices();
  saveHistory();renderAll();refreshUI();
  const names={space:'공간',wall:'벽/선',opening:'문/창',furniture:'가구',fixtures:'위생',lights:'조명',electric:'전기',hvac:'공조',texts:'텍스트',measures:'치수',circles:'원',arcs:'아크'};
  cmdToast((names[kind]||'객체')+' 삭제됨');
}
// 헬퍼: 선분 매개변수 t (0~1)
function segParam(seg,p){
  const dx=seg.x2-seg.x1, dy=seg.y2-seg.y1;
  const len2=dx*dx+dy*dy;
  if(len2<1) return 0;
  let t=((p.x-seg.x1)*dx+(p.y-seg.y1)*dy)/len2;
  return Math.max(0,Math.min(1,t));
}
// 레이캐스팅 — 점이 폴리곤 내부인지
function ptInPoly(pt,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    if(((yi>pt.y)!==(yj>pt.y))&&(pt.x<(xj-xi)*(pt.y-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
// 선분 P→Q와 직선 A→B의 교차점 (clip 쪽은 무한선, subject 쪽만 [0,1] 제한)
function lineSegIntersect(P,Q,A,B){
  const dx1=Q.x-P.x,dy1=Q.y-P.y,dx2=B.x-A.x,dy2=B.y-A.y;
  const denom=dx1*dy2-dy1*dx2;
  if(Math.abs(denom)<1e-6) return null;
  const t=((A.x-P.x)*dy2-(A.y-P.y)*dx2)/denom;
  if(t<-0.001||t>1.001) return null;
  return {x:P.x+t*dx1,y:P.y+t*dy1};
}
// Sutherland-Hodgman 폴리곤 교집합 — clip 변은 무한선으로 처리(버그 수정)
function suthHodg(subject,clip){
  let out=subject.map(p=>({x:p.x,y:p.y}));
  for(let c=0;c<clip.length;c++){
    if(!out.length) return [];
    const inp=out.slice();out=[];
    const A=clip[c],B=clip[(c+1)%clip.length];
    const ins=p=>(B.x-A.x)*(p.y-A.y)-(B.y-A.y)*(p.x-A.x)>=-1;
    for(let p=0;p<inp.length;p++){
      const curr=inp[p],prev=inp[(p+inp.length-1)%inp.length];
      const ci=ins(curr),pi=ins(prev);
      if(ci){
        if(!pi){const ip=lineSegIntersect(prev,curr,A,B);if(ip)out.push({x:Math.round(ip.x),y:Math.round(ip.y)});}
        out.push(curr);
      }else if(pi){
        const ip=lineSegIntersect(prev,curr,A,B);if(ip)out.push({x:Math.round(ip.x),y:Math.round(ip.y)});
      }
    }
  }
  return out;
}
// 공간 경계 벽 동기화: 트림 후 점(vertex)·선(wall)·면(polygon) 전부 갱신
function syncSpaceWalls(space,oldPoly){
  const newPoly=space.polygon;
  const TOL=8;
  function edgeEq(x1,y1,x2,y2,px,py,qx,qy){
    return (Math.hypot(x1-px,y1-py)<TOL&&Math.hypot(x2-qx,y2-qy)<TOL)||
           (Math.hypot(x1-qx,y1-qy)<TOL&&Math.hypot(x2-px,y2-py)<TOL);
  }
  // 1. 이 공간 소속 벽(spaceId 일치) 중 newPoly에 없는 에지 제거
  //    다른 공간의 벽(spaceId 불일치)은 절대 건드리지 않음 → 중복선 방지
  STATE.walls=STATE.walls.filter(w=>{
    if(w.spaceId!==space.id) return true; // 타 공간 소속 → 무조건 유지
    const onNew=newPoly.some((_,i)=>{
      const a=newPoly[i],b=newPoly[(i+1)%newPoly.length];
      return edgeEq(w.x1,w.y1,w.x2,w.y2,a.x,a.y,b.x,b.y);
    });
    return onNew;
  });
  // 2. 새 에지에 벽 없으면 생성 (교차점으로 생긴 신규 경계)
  newPoly.forEach((_,i)=>{
    const p=newPoly[i],q=newPoly[(i+1)%newPoly.length];
    const exists=STATE.walls.some(w=>edgeEq(w.x1,w.y1,w.x2,w.y2,p.x,p.y,q.x,q.y));
    if(!exists){
      const v1=ensureVertex(p.x,p.y,1),v2=ensureVertex(q.x,q.y,1);
      const layer=(space.layerName||'SPACE_1F').replace('SPACE','WALL').replace('AREA','WALL');
      STATE.walls.push(makeWallVEF(v1.id,v2.id,{layerName:layer,spaceId:space.id,thickness:100}));
    }
  });
  // 3. vertexIds를 newPoly 전체와 완전 재동기화
  //    트림 후 cut edge에 생긴 신규 vertex가 vertexIds에 없으면
  //    이동 시 해당 vertex가 안 따라오고 벽이 늘어나는 버그 발생
  if('vertexIds' in space){
    space.vertexIds=newPoly.map(p=>{
      // 최소거리 버텍스 선택 (first-match → min-dist, tol=2)
      let best=null,bestD=Infinity;
      STATE.vertices.forEach(v=>{const d=Math.hypot(v.x-p.x,v.y-p.y);if(d<2&&d<bestD){bestD=d;best=v;}});
      if(best) return best.id;
      const nv={id:makeId('v'),x:p.x,y:p.y};
      STATE.vertices.push(nv);
      return nv.id;
    });
  }
  cleanupOrphanVertices(); // 4. 고아 버텍스(점) 정리
}
// ===== Boolean 연산 메뉴 =====
let boolOpCtx=null; // {faceSp, lowers, pos}

function showBoolMenu(pos,faceSp,lowers){
  boolOpCtx={faceSp,lowers};
  const menu=document.getElementById('bool-menu');
  if(!menu) return;
  // 흡수 버튼: 하위 공간 중 하나라도 faceSp에 완전 포함이면 표시
  const hasContained=lowers.some(s=>s.polygon.every(p=>ptInPoly(p,faceSp.polygon)));
  const absorbBtn=document.getElementById('bool-absorb-btn');
  if(absorbBtn) absorbBtn.style.display=hasContained?'flex':'none';
  // 화면 좌표 변환
  const rect=stage.container().getBoundingClientRect();
  let px=rect.left+pos.x, py=rect.top+pos.y-80;
  if(py<10) py=rect.top+pos.y+20;
  menu.style.left=px+'px'; menu.style.top=py+'px';
  menu.style.display='flex';
}
function hideBoolMenu(){
  const menu=document.getElementById('bool-menu');
  if(menu) menu.style.display='none';
  boolOpCtx=null;
}
function applyBoolOp(op){
  const ctx=boolOpCtx;   // hideBoolMenu가 null로 만들기 전에 먼저 저장
  hideBoolMenu();
  if(op==='cancel'||!ctx) return;
  const {faceSp,lowers}=ctx;

  if(op==='subtract'){
    // 차감: 하위 공간에서 상위 공간만큼 차감
    let ok=false;
    for(const ls of lowers){if(doFaceTrimBy(ls,faceSp)) ok=true;}
    if(ok){saveHistory();renderAll();refreshUI();cmdToast('차감 완료');}
    else cmdToast('차감 불가');

  }else if(op==='union'){
    // 병합: 가장 많이 겹치는 하위 공간과 합집합
    const lower=lowers[0];
    const merged=polyUnion(lower.polygon,faceSp.polygon);
    if(merged&&merged.length>=3){
      const poly=simplifySpacePoly(merged.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})));
      if(poly.length>=3){
        const oldPoly=lower.polygon.map(p=>({x:p.x,y:p.y}));
        lower.polygon=poly;
        // 상위 공간(faceSp)의 이름·타입을 하위에 병합 (하위가 기본 이름인 경우만)
        if(faceSp.name&&lower.name===SPACE_TYPES[lower.type]?.name+(lower.typeIndex||'')){
          lower.name=lower.name+'+'+faceSp.name;
        }
        // 상위 공간(faceSp) 제거 — 하위 공간에 흡수됨
        STATE.spaces=STATE.spaces.filter(s=>s.id!==faceSp.id);
        STATE.walls=STATE.walls.filter(w=>w.spaceId!==faceSp.id);
        syncSpaceWalls(lower,oldPoly);
        saveHistory();renderAll();refreshUI();
        cmdToast('병합 완료 — '+parseFloat(spArea(lower).toFixed(2))+'㎡');
      }
    }else cmdToast('병합 불가 — 겹침 없음');

  }else if(op==='intersect'){
    // 교집합: 두 공간의 겹치는 부분만 남김
    const lower=lowers[0];
    const inter=suthHodg(lower.polygon,faceSp.polygon);
    if(inter&&inter.length>=3){
      const poly=simplifySpacePoly(inter.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})));
      if(poly.length>=3){
        const oldPolyL=lower.polygon.map(p=>({x:p.x,y:p.y}));
        lower.polygon=poly;
        STATE.spaces=STATE.spaces.filter(s=>s.id!==faceSp.id);
        STATE.walls=STATE.walls.filter(w=>w.spaceId!==faceSp.id);
        syncSpaceWalls(lower,oldPolyL);
        saveHistory();renderAll();refreshUI();
        cmdToast('교집합 완료 — '+parseFloat(spArea(lower).toFixed(2))+'㎡');
      }
    }else cmdToast('교집합 불가 — 겹침 없음');

  }else if(op==='absorb'){
    // 흡수: faceSp 안에 완전히 포함된 하위 공간 삭제
    const contained=lowers.filter(s=>s.polygon.every(p=>ptInPoly(p,faceSp.polygon)));
    if(contained.length){
      contained.forEach(s=>{
        STATE.spaces=STATE.spaces.filter(x=>x.id!==s.id);
        STATE.walls=STATE.walls.filter(w=>w.spaceId!==s.id);
        STATE.openings=STATE.openings.filter(o=>o.spaceId!==s.id);
      });
      cleanupOrphanVertices();
      saveHistory();renderAll();refreshUI();
      cmdToast('흡수 완료 — '+contained.length+'개 공간 제거');
    }else cmdToast('완전 포함된 공간 없음');
  }
}

// 두 폴리곤의 합집합 (Weiler-Atherton Union)
function polyUnion(subject,clip){
  const TOL=3;
  if(suthHodg(subject,clip).length<3) return null;
  if(subject.every(p=>ptInPoly(p,clip))) return clip.slice();
  if(clip.every(p=>ptInPoly(p,subject))) return subject.slice();
  function buildAug(poly,other){
    const aug=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      aug.push({x:a.x,y:a.y,isIP:false});
      const ips=[];
      for(let j=0;j<other.length;j++){
        const c=other[j],d=other[(j+1)%other.length];
        const ip=segIntersection(a,b,c,d);
        if(ip){
          const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
          if(l2<1) continue;
          const t=((ip.x-a.x)*dx+(ip.y-a.y)*dy)/l2;
          if(t>0.002&&t<0.998) ips.push({x:Math.round(ip.x),y:Math.round(ip.y),isIP:true,t});
        }
      }
      ips.sort((a,b)=>a.t-b.t);
      ips.forEach(ip=>{if(!aug.some(p=>p.isIP&&Math.abs(p.x-ip.x)<TOL&&Math.abs(p.y-ip.y)<TOL))aug.push(ip);});
    }
    return aug;
  }
  const augS=buildAug(subject,clip),augC=buildAug(clip,subject);
  let inC=ptInPoly(augS[0],clip);
  for(const p of augS){if(p.isIP){p.entering=!inC;inC=!inC;}}
  let inS=ptInPoly(augC[0],subject);
  for(const p of augC){if(p.isIP){p.entering=!inS;inS=!inS;}}
  const startIdx=augS.findIndex(p=>!p.isIP&&!ptInPoly(p,clip));
  if(startIdx<0) return null; // 부분 겹침인데 subject 외부점 없음 = 부동소수점 오류 → 실패 반환
  const result=[],visited=new Set();
  let onSubject=true,cur=startIdx;
  for(let iter=0;iter<augS.length+augC.length+10;iter++){
    const list=onSubject?augS:augC;
    const p=list[cur];
    const key=`${onSubject?'s':'c'}:${cur}`;
    if(visited.has(key)&&result.length>2) break;
    visited.add(key);
    result.push({x:p.x,y:p.y});
    if(p.isIP){
      if(onSubject&&p.entering){
        const ci=augC.findIndex(q=>q.isIP&&Math.abs(q.x-p.x)<TOL&&Math.abs(q.y-p.y)<TOL);
        if(ci>=0){onSubject=false;cur=(ci+1)%augC.length;continue;}
      }else if(!onSubject&&p.entering){
        const si=augS.findIndex(q=>q.isIP&&Math.abs(q.x-p.x)<TOL&&Math.abs(q.y-p.y)<TOL);
        if(si>=0){onSubject=true;cur=(si+1)%augS.length;continue;}
      }
    }
    cur=(cur+1)%list.length;
  }
  return result.length>=3?result:null;
}

// subject 공간에서 cutter 공간 영역을 차감 (점·선·면 전부 갱신)
function doFaceTrimBy(subject,cutter){
  const oldPoly=subject.polygon.map(p=>({x:p.x,y:p.y}));
  const d=polyDiff(oldPoly,cutter.polygon);
  if(!d||d.length<3){cmdToast('차감 결과가 유효하지 않음 — 차감 후 공간이 사라짐');return false;}
  const poly=simplifySpacePoly(d.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})));
  if(poly.length>=3){
    subject.polygon=poly;
    syncSpaceWalls(subject,oldPoly);
    return true;
  }
  cmdToast('차감 불가 — 결과 폴리곤 꼭짓점 부족');
  return false;
}
// 공간 면 트림: 점·선·면 전부 갱신. 성공 시 true 반환
// clickPt 지정 시 해당 위치의 겹침 영역만 차감; null 이면 전체 차감
function doFaceTrim(space,clickPt){
  const allOver=STATE.spaces.filter(o=>o.id!==space.id&&suthHodg(space.polygon,o.polygon).length>=3);
  if(!allOver.length) return false;
  let over;
  if(clickPt){
    // 1순위: 클릭 지점이 겹침 영역 내부에 있는 공간
    over=allOver.filter(o=>ptInPoly(clickPt,suthHodg(space.polygon,o.polygon)));
    // 2순위(에지 클릭 등): 겹침 중심점이 클릭 위치에 가장 가까운 공간 하나
    if(!over.length){
      let bestO=null,bestD=Infinity;
      allOver.forEach(o=>{
        const inter=suthHodg(space.polygon,o.polygon);
        const cx=inter.reduce((s,p)=>s+p.x,0)/inter.length;
        const cy=inter.reduce((s,p)=>s+p.y,0)/inter.length;
        const d=Math.hypot(cx-clickPt.x,cy-clickPt.y);
        if(d<bestD){bestD=d;bestO=o;}
      });
      // 에지 클릭 허용 범위: 겹침 중심까지 최대 2000mm (2m)
      if(bestO&&bestD<2000) over=[bestO]; else return false;
    }
  }else{
    over=allOver;
  }
  if(!over.length) return false;
  const oldPoly=space.polygon.map(p=>({x:p.x,y:p.y}));
  let poly=oldPoly.slice();
  for(const o of over){
    const d=polyDiff(poly,o.polygon);
    if(d&&d.length>=3) poly=d;
  }
  poly=simplifySpacePoly(poly.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})));
  if(poly.length>=3){
    space.polygon=poly;
    syncSpaceWalls(space,oldPoly);
    return true;
  }
  return false;
}
// 폴리곤 차집합: subject - clip (Weiler-Atherton 방식)
function polyDiff(subject,clip){
  const TOL=3;
  const inter=suthHodg(subject,clip);
  // 교집합 없음 → 차감 없이 원본 반환
  if(inter.length<3) return subject.slice();
  // subject가 clip에 완전 포함 → 완전 제거
  if(inter.length>=3&&subject.every(p=>ptInPoly(p,clip))) return [];
  function buildAug(poly,other){
    const aug=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      aug.push({x:a.x,y:a.y,isIP:false});
      const ips=[];
      for(let j=0;j<other.length;j++){
        const c=other[j],d=other[(j+1)%other.length];
        const ip=segIntersection(a,b,c,d);
        if(ip){
          const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
          if(l2<1)continue;
          const t=((ip.x-a.x)*dx+(ip.y-a.y)*dy)/l2;
          if(t>0.002&&t<0.998) ips.push({x:Math.round(ip.x),y:Math.round(ip.y),isIP:true,t});
        }
      }
      ips.sort((a,b)=>a.t-b.t);
      ips.forEach(ip=>{if(!aug.some(p=>p.isIP&&Math.abs(p.x-ip.x)<TOL&&Math.abs(p.y-ip.y)<TOL))aug.push(ip);});
    }
    return aug;
  }
  const augS=buildAug(subject,clip),augC=buildAug(clip,subject);
  let inC=ptInPoly(augS[0],clip);
  for(const p of augS){if(p.isIP){p.entering=!inC;inC=!inC;}}
  const startIdx=augS.findIndex(p=>!p.isIP&&!ptInPoly(p,clip));
  if(startIdx<0) return [];
  const result=[],visited=new Set();
  let onSubject=true,cur=startIdx;
  for(let iter=0;iter<augS.length+augC.length+10;iter++){
    const list=onSubject?augS:augC;
    const p=list[cur];
    const key=`${onSubject?'s':'c'}:${cur}`;
    if(onSubject&&visited.has(key)&&result.length>2) break;
    visited.add(key);
    result.push({x:p.x,y:p.y});
    if(p.isIP){
      if(onSubject){
        const ci=augC.findIndex(q=>q.isIP&&Math.abs(q.x-p.x)<TOL&&Math.abs(q.y-p.y)<TOL);
        if(ci>=0){onSubject=false;cur=(ci-1+augC.length)%augC.length;continue;}
      }else{
        const si=augS.findIndex(q=>q.isIP&&Math.abs(q.x-p.x)<TOL&&Math.abs(q.y-p.y)<TOL);
        if(si>=0&&!augS[si].entering){onSubject=true;cur=(si+1)%augS.length;continue;}
      }
    }
    if(onSubject) cur=(cur+1)%augS.length;
    else cur=(cur-1+augC.length)%augC.length;
  }
  return result.length>=3?result:null;
}
// 헬퍼: 두 선분 교차점 (없으면 null)
function segIntersection(p1,p2,p3,p4){
  const x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y,x3=p3.x,y3=p3.y,x4=p4.x,y4=p4.y;
  const denom=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
  if(Math.abs(denom)<1e-6) return null;
  const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/denom;
  const u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/denom;
  if(t<-0.001||t>1.001||u<-0.001||u>1.001) return null;
  return {x:x1+t*(x2-x1), y:y1+t*(y2-y1)};
}
// 두 폴리곤의 공유 경계(P1→P2)를 제거하고 병합된 폴리곤 반환
function mergeSpacesBySharedEdge(polyA, polyB, P1, P2, TOL){
  function vd(a,b){return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);}
  function segT(a,b,p){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;return l2<1?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2));}
  // P1,P2를 각 폴리곤에 삽입하여 연속 버텍스로 만들기
  function insertPts(poly, P1, P2){
    const N=poly.length, res=[];
    for(let i=0;i<N;i++){
      res.push({x:poly[i].x,y:poly[i].y});
      const nxt=poly[(i+1)%N];
      const t1=segT(poly[i],nxt,P1), t2=segT(poly[i],nxt,P2);
      const p1On=pointToSegmentDist(P1,poly[i],nxt)<TOL, p2On=pointToSegmentDist(P2,poly[i],nxt)<TOL;
      if(p1On&&p2On){
        if(t1<t2){if(t1>0.01) res.push({x:P1.x,y:P1.y});if(t2<0.99) res.push({x:P2.x,y:P2.y});}
        else{if(t2>0.01) res.push({x:P2.x,y:P2.y});if(t1<0.99) res.push({x:P1.x,y:P1.y});}
      } else if(p1On&&t1>0.01&&t1<0.99) res.push({x:P1.x,y:P1.y});
      else if(p2On&&t2>0.01&&t2<0.99) res.push({x:P2.x,y:P2.y});
    }
    return res;
  }
  const pA=insertPts(polyA,P1,P2), pB=insertPts(polyB,P1,P2);
  const nA=pA.length, nB=pB.length;
  // A에서 P1→P2 에지 인덱스 찾기
  let idxA=-1;
  for(let i=0;i<nA;i++) if(vd(pA[i],P1)<TOL&&vd(pA[(i+1)%nA],P2)<TOL){idxA=i;break;}
  if(idxA===-1) for(let i=0;i<nA;i++) if(vd(pA[i],P2)<TOL&&vd(pA[(i+1)%nA],P1)<TOL){idxA=i;break;}
  if(idxA===-1) return null;
  // B에서 P2→P1 에지 인덱스 찾기 (A와 반대 방향)
  let idxB=-1;
  for(let i=0;i<nB;i++){
    if(vd(pB[i],P2)<TOL&&vd(pB[(i+1)%nB],P1)<TOL){idxB=i;break;}
  }
  // 같은 방향인 경우도 처리
  let bReverse=false;
  if(idxB===-1) for(let i=0;i<nB;i++){
    if(vd(pB[i],P1)<TOL&&vd(pB[(i+1)%nB],P2)<TOL){idxB=i;bReverse=true;break;}
  }
  if(idxB===-1) return null;
  // 병합: A 순회(공유에지 제외) + B 순회(공유에지 제외)
  const result=[];
  for(let i=0;i<nA-1;i++) result.push({x:Math.round(pA[(idxA+1+i)%nA].x),y:Math.round(pA[(idxA+1+i)%nA].y)});
  if(!bReverse){
    for(let i=0;i<nB-1;i++) result.push({x:Math.round(pB[(idxB+1+i)%nB].x),y:Math.round(pB[(idxB+1+i)%nB].y)});
  } else {
    for(let i=1;i<nB;i++) result.push({x:Math.round(pB[(idxB-i+nB)%nB].x),y:Math.round(pB[(idxB-i+nB)%nB].y)});
  }
  return result.length>=3?result:null;
}
// 공선 버텍스 제거 (폴리곤 단순화)
function simplifySpacePoly(poly){
  const N=poly.length;
  if(N<3) return poly;
  const res=[];
  for(let i=0;i<N;i++){
    const a=poly[(i+N-1)%N], b=poly[i], c=poly[(i+1)%N];
    const cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    if(Math.abs(cross)>1) res.push({x:b.x,y:b.y});
  }
  return res.length>=3?res:poly;
}
function updatePreview(){
  drawGroup.destroyChildren();
  if(!drawState){
    if(STATE.selectedTool==='measure'&&STATE.measureFirst){
      const x1=STATE.offsetX+mmToPx(STATE.measureFirst.x);
      const y1=STATE.offsetY+mmToPx(STATE.measureFirst.y);
      drawGroup.add(new Konva.Circle({x:x1,y:y1,radius:5,fill:'#D4B872'}));
    }
    previewLayer.batchDraw();return;
  }
  // v5.3: 박스 선택 미리보기
  if(drawState.type==='box'){
    const{start,current}=drawState;
    const x1=STATE.offsetX+mmToPx(start.x),y1=STATE.offsetY+mmToPx(start.y);
    const x2=STATE.offsetX+mmToPx(current.x),y2=STATE.offsetY+mmToPx(current.y);
    const isCrossing=current.x<start.x; // 우→좌 = crossing
    drawGroup.add(new Konva.Rect({
      x:Math.min(x1,x2),y:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1),
      fill:isCrossing?'#E2725B14':'#5BA0D414',
      stroke:isCrossing?'#E2725B':'#5BA0D4',
      strokeWidth:1.2,dash:isCrossing?[3,3]:[]
    }));
    previewLayer.batchDraw();return;
  }
  // 원형공간 미리보기
  if(drawState.type==='circlespace'){
    const c=drawState.center,p=drawState.current;
    const r=Math.hypot(p.x-c.x,p.y-c.y);
    const cx=STATE.offsetX+mmToPx(c.x),cy=STATE.offsetY+mmToPx(c.y);
    const td=SPACE_TYPES[STATE.selectedSpaceType];
    drawGroup.add(new Konva.Circle({x:cx,y:cy,radius:mmToPx(r),stroke:td.color,strokeWidth:2,dash:[6,4],fill:td.color+'33'}));
    // 중심점
    drawGroup.add(new Konva.Circle({x:cx,y:cy,radius:4,fill:td.color}));
    // 반지름 안내선
    drawGroup.add(new Konva.Line({points:[cx,cy,STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y)],stroke:td.color,strokeWidth:1,dash:[4,4]}));
    drawGroup.add(new Konva.Text({x:cx+10,y:cy-18,text:'R '+Math.round(r)+'mm  A '+parseFloat((Math.PI*r*r/1e6).toFixed(2))+'㎡',fontSize:11,fontFamily:'JetBrains Mono',fill:td.color}));
    previewLayer.batchDraw();return;
  }
  // v5.3: 원 미리보기
  if(drawState.type==='circle'){
    const c=drawState.center, p=drawState.current;
    const r=Math.sqrt((p.x-c.x)**2+(p.y-c.y)**2);
    const cx=STATE.offsetX+mmToPx(c.x), cy=STATE.offsetY+mmToPx(c.y);
    drawGroup.add(new Konva.Circle({x:cx,y:cy,radius:mmToPx(r),stroke:'#C9A961',strokeWidth:1.5,dash:[6,4],fill:'#C9A96111'}));
    drawGroup.add(new Konva.Text({x:cx+10,y:cy-10,text:'R '+Math.round(r)+'mm',fontSize:11,fontFamily:'JetBrains Mono',fill:'#C9A961'}));
    previewLayer.batchDraw();return;
  }
  // v5.3: 아크 미리보기
  if(drawState.type==='arc'){
    const c=drawState.center, p=drawState.current;
    const r=Math.sqrt((p.x-c.x)**2+(p.y-c.y)**2);
    const cx=STATE.offsetX+mmToPx(c.x), cy=STATE.offsetY+mmToPx(c.y);
    drawGroup.add(new Konva.Circle({x:cx,y:cy,radius:mmToPx(r),stroke:'#C9A961',strokeWidth:1,dash:[3,3],opacity:0.4}));
    // 반지름 안내선
    const px=STATE.offsetX+mmToPx(p.x), py=STATE.offsetY+mmToPx(p.y);
    drawGroup.add(new Konva.Line({points:[cx,cy,px,py],stroke:'#C9A961',strokeWidth:1,dash:[4,4]}));
    drawGroup.add(new Konva.Text({x:cx+10,y:cy-10,text:'R '+Math.round(r)+'mm — 클릭 후 각도 입력',fontSize:11,fontFamily:'JetBrains Mono',fill:'#C9A961'}));
    previewLayer.batchDraw();return;
  }
  if(drawState.type==='rect'){
    const{start,current}=drawState;
    const x1=STATE.offsetX+mmToPx(start.x),y1=STATE.offsetY+mmToPx(start.y);
    const x2=STATE.offsetX+mmToPx(current.x),y2=STATE.offsetY+mmToPx(current.y);
    const color=SPACE_TYPES[STATE.selectedSpaceType].color;
    drawGroup.add(new Konva.Rect({x:Math.min(x1,x2),y:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1),fill:color+'22',stroke:color,strokeWidth:1.5,dash:[6,4]}));
    const wMm=Math.abs(current.x-start.x),hMm=Math.abs(current.y-start.y);
    drawGroup.add(new Konva.Text({x:(x1+x2)/2-50,y:Math.min(y1,y2)-18,text:wMm+' mm',width:100,align:'center',fontSize:11,fontFamily:'JetBrains Mono',fill:'#C9A961'}));
    drawGroup.add(new Konva.Text({x:Math.min(x1,x2)-60,y:(y1+y2)/2-6,text:hMm+' mm',width:50,align:'right',fontSize:11,fontFamily:'JetBrains Mono',fill:'#C9A961'}));
  }else if(drawState.type==='polygon'){
    const pts=[];
    drawState.points.forEach(p=>{pts.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
    pts.push(STATE.offsetX+mmToPx(drawState.current.x),STATE.offsetY+mmToPx(drawState.current.y));
    const color=SPACE_TYPES[STATE.selectedSpaceType].color;
    drawGroup.add(new Konva.Line({points:pts,stroke:color,strokeWidth:1.5,dash:[6,4]}));
    drawState.points.forEach(p=>{drawGroup.add(new Konva.Circle({x:STATE.offsetX+mmToPx(p.x),y:STATE.offsetY+mmToPx(p.y),radius:4,fill:color}));});
  }else if(drawState.type==='wall'||drawState.type==='line'){
    const x1=STATE.offsetX+mmToPx(drawState.start.x),y1=STATE.offsetY+mmToPx(drawState.start.y);
    const x2=STATE.offsetX+mmToPx(drawState.current.x),y2=STATE.offsetY+mmToPx(drawState.current.y);
    const isLine=drawState.type==='line';
    const prevColor=isLine?(SPACE_TYPES[STATE.selectedSpaceType]?.color||'#7B82B5'):'#C9A961';
    drawGroup.add(new Konva.Line({points:[x1,y1,x2,y2],stroke:prevColor,strokeWidth:isLine?2.2:6,opacity:0.85,lineCap:'square',dash:isLine?[10,4]:[]}));
    const dxMm=drawState.current.x-drawState.start.x,dyMm=drawState.current.y-drawState.start.y;
    const d=Math.sqrt(dxMm*dxMm+dyMm*dyMm);
    // 선이 공간을 관통하면 "분할 예정" 표시
    if(isLine){
      const a={x:drawState.start.x,y:drawState.start.y},b={x:drawState.current.x,y:drawState.current.y};
      const willSplit=STATE.spaces.some(s=>splitPolygonByLine(s.polygon,a,b));
      if(willSplit) drawGroup.add(new Konva.Text({x:(x1+x2)/2-50,y:(y1+y2)/2-22,text:'✂ 분할',width:100,align:'center',fontSize:12,fontFamily:'Inter',fill:prevColor,fontStyle:'bold'}));
    }
    drawGroup.add(new Konva.Text({x:(x1+x2)/2-50,y:(y1+y2)/2-6,text:Math.round(d)+' mm',width:100,align:'center',fontSize:11,fontFamily:'JetBrains Mono',fill:prevColor}));
  }
  previewLayer.batchDraw();
}


function initTools(){
// ===== 마우스 =====
let mouseDownPos=null,isMouseDown=false,isPanning=false,panStart=null;
let dragMoveState=null; // v5.4: {kind,id,startMm,baseObj}
stage.on('mousedown touchstart',e=>{
  const pos=stage.getPointerPosition();if(!pos) return;
  mouseDownPos=pos;isMouseDown=true;
  const isMiddleClick=e.evt&&e.evt.button===1; // v5.5: 휠클릭 패닝
  if(isMiddleClick||STATE.selectedTool==='pan'){isPanning=true;panStart={x:pos.x,y:pos.y};if(e.evt) e.evt.preventDefault();return;}
  if(STATE.selectedTool==='rect') startRect(pos);
  else if(STATE.selectedTool==='circlespace') startCircleSpace(pos);
  // v5.5: wall은 mousedown으로 시작 안 함 (클릭+클릭 모드만)
  else if(STATE.selectedTool==='circle') startCircle(pos);
  else if(STATE.selectedTool==='arc') startArc(pos);
  else if(STATE.selectedTool==='select'){
    // v5.4: 객체 위 mousedown = 드래그 이동 시작 / 빈 영역 = 박스 선택
    if(e.target===stage){
      const mm=getMm(pos);
      drawState={type:'box',start:mm,current:mm};
      STATE.selectedKind=null;STATE.selectedId=null;
      if(!STATE.shiftPressed) STATE.boxSelection=[];
      renderAll();refreshUI();
    }else{
      // 객체 위 — 클릭 이벤트가 selectObj 호출. 그 직후 드래그 가능
      // selectObj 호출은 Konva click 핸들러가 mouseup 시점에 처리하지만,
      // 우리는 mousedown 시점에 미리 선택 후 드래그 준비
      let target=e.target;
      let id=target.id();
      // v5.8: 라이브러리 객체(가구/위생/조명/전기/공조)는 group 안 자식 노드가 hit 됨
      //  → 부모 group 탐색해서 group의 id를 사용해야 드래그 가능
      if(!id){
        let p=target.getParent();
        while(p && p!==stage && !p.id()) p=p.getParent();
        if(p && p!==stage) id=p.id();
      }
      if(id){
        const found=findObjById(id);
        if(found){
          const isAlt=!!(e.evt&&e.evt.altKey);
          STATE.selectedKind=found.kind;STATE.selectedId=found.id;
          STATE.boxSelection=[];
          if(isAlt){
            // Alt+드래그: 복사본 생성 후 복사본을 드래그 (원본 제자리)
            const copy=altCopyObj(found.kind,found.obj);
            if(copy){
              STATE.selectedKind=found.kind;STATE.selectedId=copy.id;
              dragMoveState={kind:found.kind,id:copy.id,startMm:getMm(pos),baseObj:JSON.parse(JSON.stringify(copy)),altCopy:true};
            }
          }else{
            // 공간 드래그 시작: 다른 공간과 공유 중인 vertex 분리 (이동 오염 방지)
            // vertexIds 뿐 아니라 이 공간의 walls.v1Id/v2Id도 함께 교체해야 벽이 늘어나지 않음
            if(found.kind==='space'&&found.obj.vertexIds){
              found.obj.vertexIds=found.obj.vertexIds.map(vid=>{
                const isShared=STATE.spaces.some(s=>s.id!==found.obj.id&&s.vertexIds&&s.vertexIds.includes(vid));
                if(isShared){
                  const v=STATE.vertices.find(v=>v.id===vid);
                  if(v){
                    const nv={id:makeId('v'),x:v.x,y:v.y};
                    STATE.vertices.push(nv);
                    STATE.walls.forEach(w=>{
                      if(w.spaceId!==found.obj.id) return;
                      if(w.v1Id===vid) w.v1Id=nv.id;
                      if(w.v2Id===vid) w.v2Id=nv.id;
                    });
                    return nv.id;
                  }
                }
                return vid;
              });
            }
            dragMoveState={kind:found.kind,id:found.id,startMm:getMm(pos),baseObj:JSON.parse(JSON.stringify(found.obj))};
          }
          renderAll();refreshUI();
        }
      }
    }
  }
});
// Alt+드래그 복사: 원본 제자리, 복사본을 새 위치로 드래그
function altCopyObj(kind,obj){
  const arr=getArr(kind);
  if(!arr) return null;
  const raw=JSON.parse(JSON.stringify(obj));
  raw.id=makeId(kind.charAt(0));
  if('v1Id' in raw){
    // 벽: 독립 버텍스 생성
    const nv1={id:makeId('v'),x:Math.round(obj.x1),y:Math.round(obj.y1)};
    const nv2={id:makeId('v'),x:Math.round(obj.x2),y:Math.round(obj.y2)};
    STATE.vertices.push(nv1,nv2);
    raw.v1Id=nv1.id; raw.v2Id=nv2.id;
    reinstallVEF(raw);
  }else if('vertexIds' in raw){
    // 공간: 버텍스 복제 + 소속 벽도 같은 버텍스 공유로 복사
    const poly=obj.polygon;
    const vidMap={};
    obj.vertexIds.forEach((vid,i)=>{
      const p=poly[i]||{x:0,y:0};
      const nv={id:makeId('v'),x:Math.round(p.x),y:Math.round(p.y)};
      STATE.vertices.push(nv);
      vidMap[vid]=nv.id;
    });
    raw.vertexIds=obj.vertexIds.map(vid=>vidMap[vid]||vid);
    STATE.walls.filter(w=>w.spaceId===obj.id).forEach(w=>{
      const wraw=JSON.parse(JSON.stringify(w));
      wraw.id=makeId('w'); wraw.spaceId=raw.id;
      if(vidMap[w.v1Id]){wraw.v1Id=vidMap[w.v1Id];}else{const nv={id:makeId('v'),x:Math.round(w.x1),y:Math.round(w.y1)};STATE.vertices.push(nv);wraw.v1Id=nv.id;}
      if(vidMap[w.v2Id]){wraw.v2Id=vidMap[w.v2Id];}else{const nv={id:makeId('v'),x:Math.round(w.x2),y:Math.round(w.y2)};STATE.vertices.push(nv);wraw.v2Id=nv.id;}
      reinstallVEF(wraw);
      STATE.walls.push(wraw);
    });
    reinstallVEF(raw);
  }
  arr.push(raw);
  return raw;
}

// v5.4: id로 객체 검색 (모든 배열 순회)
function findObjById(id){
  const map=[
    {arr:STATE.walls,kind:'wall'},{arr:STATE.spaces,kind:'space'},
    {arr:STATE.openings,kind:'opening'},{arr:STATE.furniture,kind:'furniture'},
    {arr:STATE.fixtures,kind:'fixtures'},{arr:STATE.lights,kind:'lights'},
    {arr:STATE.electric,kind:'electric'},{arr:STATE.texts,kind:'texts'},
    {arr:STATE.measures,kind:'measures'},{arr:STATE.circles,kind:'circles'},
    {arr:STATE.arcs,kind:'arcs'},{arr:STATE.hvac,kind:'hvac'},
  ];
  for(const m of map){
    const obj=m.arr.find(o=>o.id===id);
    if(obj) return {kind:m.kind,id,obj};
  }
  return null;
}
// Shift 누름/해제 시 드래그·선 미리보기 즉시 재계산
function _refreshShiftOrtho(){
  const cur=stage.getPointerPosition();
  if(!cur) return;
  const mm=getMm(cur);
  // 드래그 이동 중
  if(dragMoveState&&isMouseDown){
    const dx2=mm.x-dragMoveState.startMm.x, dy2=mm.y-dragMoveState.startMm.y;
    applyDragMove(dragMoveState,dx2,dy2);
    renderAll();
  }
  // 선/벽·다각형 그리기 중
  if(drawState){
    if(drawState.type==='wall'||drawState.type==='arc'){
      drawState.current=applyOrtho(drawState.start,mm);
    } else if(drawState.type==='polygon'&&drawState.points.length>0){
      drawState.current=applyOrtho(drawState.points[drawState.points.length-1],mm);
    }
    updatePreview();
  }
}

// v5.4: 드래그 이동 적용 — 원본 baseObj 기준으로 dx,dy 만큼
// v5.8: 공간 드래그 시 폴리곤 점들을 다른 공간 변에 자동 스냅 (#1 요구사항)
function applyDragMove(state,dx,dy){
  const arr=getArr(state.kind);
  if(!arr) return;
  const obj=arr.find(o=>o.id===state.id);
  if(!obj) return;
  const base=state.baseObj;
  let sx=Math.round(dx), sy=Math.round(dy);
  // Shift 직교: F8 OFF+Shift 또는 F8 ON+Shift 미누름 시 수평/수직 이동만 허용
  const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
  if(orthoActive){
    if(Math.abs(sx)>=Math.abs(sy)) sy=0; else sx=0;
  }

  // v5.8: 공간 드래그 — 한 점이라도 다른 공간 변에 가까우면 그 점 기준으로 전체 이동량 보정
  if(state.kind==='space' && base.polygon){
    let bestSnapDx=0, bestSnapDy=0, bestSnapD=Infinity;
    base.polygon.forEach(p=>{
      const moved={x:p.x+sx, y:p.y+sy};
      const snap=snapPointToSpaceEdges(moved, obj.id);
      if(snap.snapped && snap.distance<bestSnapD){
        bestSnapD=snap.distance;
        bestSnapDx=snap.pt.x-moved.x;
        bestSnapDy=snap.pt.y-moved.y;
      }
    });
    if(bestSnapD<Infinity){sx+=bestSnapDx; sy+=bestSnapDy;}
  }
  // v5.8: 라이브러리/기타 객체 드래그 — 끝점·중심 스냅 (snapToEndpoint 활용)
  else if(state.kind!=='space' && state.kind!=='wall' && 'x' in obj){
    const moved={x:base.x+sx, y:base.y+sy};
    const snap=snapToEndpoint(moved);
    if(snap.snapped){
      const sd=Math.sqrt((snap.pt.x-moved.x)**2+(snap.pt.y-moved.y)**2);
      if(sd<150){sx+=snap.pt.x-moved.x; sy+=snap.pt.y-moved.y;}
    }
  }

  if('x' in obj&&'x' in base){obj.x=base.x+sx;obj.y=base.y+sy;}
  // VEF: 벽 — 공유 버텍스를 이동 (연결된 모든 벽/공간 자동 연동)
  if('v1Id' in obj){
    if(base.x1!=null) moveVertex(obj.v1Id,base.x1+sx,base.y1+sy);
    if(base.x2!=null) moveVertex(obj.v2Id,base.x2+sx,base.y2+sy);
  } else if('x1' in base){
    obj.x1=base.x1+sx;obj.y1=base.y1+sy;obj.x2=base.x2+sx;obj.y2=base.y2+sy;
  }
  // VEF: 공간 — vertex만 이동 (polygon getter가 vertexIds→vertices에서 자동 계산)
  // setter 호출 금지: polygonToVertexIds가 vertexIds를 덮어써서 벽 참조 불일치 유발
  if('vertexIds' in obj&&base.polygon){
    obj.vertexIds.forEach((vid,i)=>{const bp=base.polygon[i];if(bp)moveVertex(vid,bp.x+sx,bp.y+sy);});
  } else if(base.polygon){
    obj.polygon=base.polygon.map(p=>({x:p.x+sx,y:p.y+sy}));
  }
}
stage.on('mousemove touchmove',e=>{
  const pos=stage.getPointerPosition();if(!pos) return;
  const mm=getMm(pos);
  document.getElementById('cursor-pos').textContent=mm.x+','+mm.y;
  if(isPanning&&panStart){
    const dx=pos.x-panStart.x,dy=pos.y-panStart.y;
    STATE.offsetX+=dx;STATE.offsetY+=dy;
    panStart={x:pos.x,y:pos.y};
    drawGrid();renderAll();return;
  }
  // 공간 회전 핸들 드래그 — centroid 기준 각도 delta 누적
  if(STATE.rotateState){
    const cxPx=STATE.offsetX+mmToPx(STATE.rotateState.cxMm);
    const cyPx=STATE.offsetY+mmToPx(STATE.rotateState.cyMm);
    const curAngle=Math.atan2(pos.y-cyPx,pos.x-cxPx)*180/Math.PI;
    if(STATE.rotateState.lastAngle!==null){
      let delta=curAngle-STATE.rotateState.lastAngle;
      if(delta>180) delta-=360;
      if(delta<-180) delta+=360;
      if(Math.abs(delta)>0.1){
        STATE.rotateState.totalAngle=(STATE.rotateState.totalAngle||0)+delta;
        rotateSpaceByAngle(STATE.rotateState.spaceId,delta);
        renderAll();
      }
    }
    STATE.rotateState.lastAngle=curAngle;
    return;
  }
  if(STATE.selectedTool==='rect'&&isMouseDown) updateRect(pos);
  // v5.5: wall은 mousemove 미리보기를 cmdMode wall-len에서 처리
  else if(STATE.selectedTool==='circlespace'&&isMouseDown) updateCircleSpace(pos);
  else if(STATE.selectedTool==='circle'&&isMouseDown) updateCircle(pos);
  else if(STATE.selectedTool==='arc'&&isMouseDown) updateArc(pos);
  else if(STATE.selectedTool==='select'&&isMouseDown&&dragMoveState){
    // v5.4: 선택된 객체 드래그 이동
    const dx=mm.x-dragMoveState.startMm.x, dy=mm.y-dragMoveState.startMm.y;
    applyDragMove(dragMoveState,dx,dy);
    renderAll();
  }
  else if(STATE.selectedTool==='select'&&isMouseDown&&drawState&&drawState.type==='box'){
    drawState.current=getMm(pos);updatePreview();
  }
  else if(STATE.selectedTool==='polygon') updatePolygonPreview(pos);
  // v5.1+v5.2: cmdMode 활성 시 마우스 방향 추적
  else if(STATE.cmdMode==='wall-len'&&drawState&&(drawState.type==='wall'||drawState.type==='line')){
    let p=applyOrtho(drawState.start,mm);
    drawState.current=p;updatePreview();
  }
  else if(STATE.cmdMode==='measure-rel'&&STATE.measureFirst){
    STATE.cmdData.curX=mm.x;STATE.cmdData.curY=mm.y;
  }
  else if(STATE.cmdMode==='polygon-r'&&polyState?.phase==='radius'){
    updatePolygonPreview(pos);
  }
  // v5.9: offset 방향 프리뷰 (target 선택 후 마우스 이동 시 점선 미리보기)
  if(STATE.selectedTool==='offset'&&offsetState?.target?.kind==='wall'){
    const w=offsetState.target.obj;
    const dist=offsetState.distance;
    const dx=w.x2-w.x1,dy=w.y2-w.y1,len=Math.sqrt(dx*dx+dy*dy);
    drawGroup.destroyChildren();
    if(len>1){
      const nx=-dy/len,ny=dx/len;
      const cx=(w.x1+w.x2)/2,cy=(w.y1+w.y2)/2;
      const sgn=Math.sign((mm.x-cx)*nx+(mm.y-cy)*ny)||1;
      const ox=nx*sgn*dist,oy=ny*sgn*dist;
      drawGroup.add(new Konva.Line({
        points:[
          STATE.offsetX+mmToPx(w.x1+ox),STATE.offsetY+mmToPx(w.y1+oy),
          STATE.offsetX+mmToPx(w.x2+ox),STATE.offsetY+mmToPx(w.y2+oy),
        ],
        stroke:'#FFD700',strokeWidth:w.isLine?2:Math.max(4,mmToPx(w.thickness||100)),
        dash:[6,4],opacity:0.75,lineCap:'square',
      }));
    }
  }
  // 미러 기준선 가상선 프리뷰 (p1 찍은 뒤 p2 클릭 전)
  if(mirrorState&&mirrorState.phase==='pickLine2'&&mirrorState.p1){
    const p1=mirrorState.p1;
    const dx=mm.x-p1.x, dy=mm.y-p1.y;
    const len=Math.hypot(dx,dy);
    drawGroup.destroyChildren();
    if(len>30){
      const margin=pxToMm(Math.max(stage.width(),stage.height())*2);
      const ux=dx/len, uy=dy/len;
      const extA={x:p1.x-ux*margin, y:p1.y-uy*margin};
      const extB={x:p1.x+ux*margin, y:p1.y+uy*margin};
      drawGroup.add(new Konva.Line({
        points:[STATE.offsetX+mmToPx(extA.x),STATE.offsetY+mmToPx(extA.y),
                STATE.offsetX+mmToPx(extB.x),STATE.offsetY+mmToPx(extB.y)],
        stroke:'#7BB5E8',strokeWidth:1.5,dash:[12,5],opacity:0.9,listening:false,
      }));
      drawGroup.add(new Konva.Circle({
        x:STATE.offsetX+mmToPx(p1.x),y:STATE.offsetY+mmToPx(p1.y),
        radius:5,fill:'#7BB5E8',stroke:'#fff',strokeWidth:1.5,listening:false,
      }));
      drawGroup.add(new Konva.Circle({
        x:STATE.offsetX+mmToPx(mm.x),y:STATE.offsetY+mmToPx(mm.y),
        radius:4,fill:'#fff',stroke:'#7BB5E8',strokeWidth:1.5,listening:false,
      }));
    }
    previewLayer.batchDraw();
  }
  // v5.2: 스냅 마커 갱신 (모든 도구에서 endpoint 스냅 시 글로우 표시)
  updateSnapMarker(pos);
});
stage.on('mouseup touchend',e=>{
  isMouseDown=false;isPanning=false;panStart=null;
  // 공간 회전 핸들 드래그 종료
  if(STATE.rotateState){
    saveHistory();renderAll();
    showStatus('공간 회전 '+Math.round(STATE.rotateState.totalAngle||0)+'°');
    STATE.rotateState=null;
    mouseDownPos=null;
    return;
  }
  const pos=stage.getPointerPosition();
  if(!pos||!mouseDownPos){mouseDownPos=null;dragMoveState=null;return;}
  const dragDist=Math.abs(pos.x-mouseDownPos.x)+Math.abs(pos.y-mouseDownPos.y);
  const isClick=dragDist<5;
  // v5.4: 객체 드래그 이동 종료
  if(dragMoveState){
    if(!isClick){
      saveHistory();
      if(dragMoveState.altCopy) cmdToast('복사됨 (Alt+드래그)');
    }else if(dragMoveState.altCopy){
      // Alt+클릭(드래그 없음): 제자리 복사본 제거
      const arr=getArr(dragMoveState.kind);
      if(arr){
        if(dragMoveState.kind==='space') STATE.walls=STATE.walls.filter(w=>w.spaceId!==dragMoveState.id);
        const idx=arr.findIndex(o=>o.id===dragMoveState.id);
        if(idx>=0) arr.splice(idx,1);
        cleanupOrphanVertices();
      }
    }
    dragMoveState=null;
    mouseDownPos=null;
    return;
  }
  if(STATE.selectedTool==='rect'){
    if(isClick&&drawState&&drawState.type==='rect'){
      // 클릭만 = 단계별 프롬프트 모드
      drawState.current=drawState.start;
      drawGroup.destroyChildren();previewLayer.batchDraw();
      enterCmdMode('rect-w',{},'폭(mm):','가로 길이 입력 후 Enter (esc=취소)');
    }else{
      endRect();
    }
  }else if(STATE.selectedTool==='wall'){
    if(!isClick) return;
    if(STATE.cmdMode==='wall-len'&&drawState&&drawState.type==='wall'){
      let endMm=getMm(pos);endMm=applyOrtho(drawState.start,endMm);
      addWall(drawState.start.x,drawState.start.y,endMm.x,endMm.y);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      exitCmdMode();cmdToast('벽 추가');
    }else{
      const mm=getMm(pos);
      drawState={type:'wall',start:mm,current:mm};
      enterCmdMode('wall-len',{},'길이(mm):','거리 Enter / 끝점 클릭 / Shift=직교 / esc=취소');
    }
  }else if(STATE.selectedTool==='line'){
    if(!isClick) return;
    if(STATE.cmdMode==='wall-len'&&drawState&&drawState.type==='line'){
      let endMm=getMm(pos);endMm=applyOrtho(drawState.start,endMm);
      addLine(drawState.start.x,drawState.start.y,endMm.x,endMm.y);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      exitCmdMode();cmdToast('선 추가');
    }else{
      const mm=getMm(pos);
      drawState={type:'line',start:mm,current:mm};
      enterCmdMode('wall-len',{},'길이(mm):','거리 Enter / 끝점 클릭 / Shift=직교 / esc=취소');
    }
  }
  else if(STATE.selectedTool==='circlespace'){
    if(isClick&&drawState&&drawState.type==='circlespace'){
      enterCmdMode('circlespace-r',{cx:drawState.center.x,cy:drawState.center.y},'반지름(mm):','원형공간 반지름 입력 후 Enter (esc=취소)');
    }else{ endCircleSpace(); }
  }
  else if(STATE.selectedTool==='circle'){
    if(isClick&&drawState&&drawState.type==='circle'){
      enterCmdMode('circle-r',{},'반지름(mm):','반지름 입력 후 Enter (esc=취소)');
    }else{ endCircle(); }
  }
  else if(STATE.selectedTool==='arc'){
    if(isClick&&drawState&&drawState.type==='arc'){
      enterCmdMode('arc-r',{},'반지름(mm):','반지름 → 시작각° → 끝각°');
    }else{ endArc(); }
  }
  else if(STATE.selectedTool==='select'&&drawState&&drawState.type==='box'){
    // v5.3: 박스 선택 종료
    finishBoxSelection();
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    if(isClick){ /* 단순 클릭은 이미 deselect 처리 */ }
  }
  else if(isClick){
    if(STATE.selectedTool==='polygon') clickPolygon(pos);
    else if(STATE.selectedTool==='door') addOpening(pos,'DOOR');
    else if(STATE.selectedTool==='window') addOpening(pos,'WINDOW');
    else if(STATE.selectedTool==='furniture'&&STATE.selectedLib) addLibObject(pos,'furniture',STATE.selectedLib);
    else if(STATE.selectedTool==='fixture'&&STATE.selectedLib) addLibObject(pos,'fixtures',STATE.selectedLib);
    else if(STATE.selectedTool==='light'&&STATE.selectedLib) addLibObject(pos,'lights',STATE.selectedLib);
    else if(STATE.selectedTool==='electric'&&STATE.selectedLib) addLibObject(pos,'electric',STATE.selectedLib);
    else if(STATE.selectedTool==='hvac'&&STATE.selectedLib) addLibObject(pos,'hvac',STATE.selectedLib);  // v5.6
    else if(STATE.selectedTool==='text') addText(pos);
    else if(STATE.selectedTool==='measure') handleMeasure(pos);
    else if(STATE.selectedTool==='trim') handleTrim(pos);
    else if(STATE.selectedTool==='break') handleBreak(pos);
    else if(STATE.selectedTool==='eraser') handleEraser(pos);
    else if(STATE.selectedTool==='dimwall') handleDimWall(pos);
    else if(STATE.selectedTool==='offset') handleOffsetClick(pos); // v5.6
    else if(STATE.selectedTool==='mirror') handleMirrorClick(pos); // v5.6
  }
  mouseDownPos=null;
});
stage.on('dblclick dbltap',e=>{});
stage.on('wheel',e=>{
  e.evt.preventDefault();
  const oldZoom=STATE.zoom;
  const delta=e.evt.deltaY>0?0.9:1.1;
  const newZoom=Math.max(0.2,Math.min(5,oldZoom*delta));
  if(newZoom===oldZoom) return;
  const pos=stage.getPointerPosition();
  STATE.offsetX=pos.x-(pos.x-STATE.offsetX)*(newZoom/oldZoom);
  STATE.offsetY=pos.y-(pos.y-STATE.offsetY)*(newZoom/oldZoom);
  STATE.zoom=newZoom;
  drawGrid();renderAll();
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
});
container.addEventListener('contextmenu',e=>{
  e.preventDefault();
  // Ctrl+우클릭: 공간·벽 자재 설정 메뉴
  if(e.ctrlKey){
    const rect=container.getBoundingClientRect();
    const hit=stage.getIntersection({x:e.clientX-rect.left,y:e.clientY-rect.top});
    if(hit){
      let node=hit,id=null;
      while(node&&node!==stage){if(node.id&&node.id()){id=node.id();break;}node=node.getParent();}
      if(id){
        const found=findObjById(id);
        if(found&&(found.kind==='wall'||found.kind==='space')){
          showFinishMenu(found.kind,found.obj,e.clientX,e.clientY);
          return;
        }
      }
    }
    return;
  }
  // 일반 우클릭: 비어있으면 명령창 활성화, 값 있으면 실행
  doEnterAction();
});

// ===== 키보드 =====
document.addEventListener('keydown',e=>{
  // Shift는 INPUT focus 무관하게 항상 감지
  if(e.key==='Shift'){
    STATE.shiftPressed=true;
    _refreshShiftOrtho();
  }
  // Boolean 메뉴 열려있으면 Esc로 닫기
  if(e.key==='Escape'){hideBoolMenu();}
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA') return;
  // v5.2: F8 직교 토글
  if(e.key==='F8'){e.preventDefault();toggleOrtho();return;}
  if(e.ctrlKey||e.metaKey){
    if(e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
    if(e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
    // v5.2: Ctrl+L 직교 토글 (AutoCAD 보조 단축키)
    if(e.key.toLowerCase()==='l'){e.preventDefault();toggleOrtho();return;}
    return; // 기타 Ctrl+키는 도구 단축키로 안 흐르게
  }
  switch(e.key.toLowerCase()){
    case 'v':setTool('select');break;
    case 'r':if(STATE.selectedKind&&STATE.selectedId) rotateSelected();else setTool('rect');break;
    case 'g':setTool('circle');break;
    case 'p':setTool('polygon');break;
    case 'a':setTool('arc');break;  // v5.6: A = arc (단독)
    case 'l':setTool('line');break;
    case 'b':setTool('wall');break;
    case 'd':setTool('door');break;
    case 'w':setTool('window');break;
    case 'o':setTool('offset');cmdToast('옵셋 — 거리 입력 후 객체 클릭, 방향 클릭');break; // v5.6: O = offset
    case 't':setTool('text');break;
    case 'm':setTool('measure');break;
    case 'h':setTool('pan');break;
    case 'c':setTool('circlespace');break;
    case 'i':setTool('dimwall');cmdToast('치수 모드 — 벽 클릭');break;
    case 'f':toggleGrid();break;
    case 'x':setTool('trim');cmdToast('트림 모드 — 자를 부분 클릭');break;
    case 'z':setTool('break');cmdToast('분할 모드 — 분할할 점 클릭');break;
    case 'e':setTool('eraser');cmdToast('지우개 — 지울 객체 클릭');break;
    // v5.6: 1~5 = 라이브러리 카테고리
    case '1':setTool('furniture');setLibCategory('furniture');break;
    case '2':setTool('fixture');setLibCategory('fixture');break;
    case '3':setTool('light');setLibCategory('light');break;
    case '4':setTool('electric');setLibCategory('electric');break;
    case '5':setTool('hvac');setLibCategory('hvac');break;
    case 'enter':
      e.preventDefault();
      doEnterAction();
      break;
    case ' ':
      e.preventDefault();
      doEnterAction();
      break;
    case 'escape':drawState=null;STATE.measureFirst=null;offsetState=null;polyState=null;polyClickGuard=false;
      drawGroup.destroyChildren();previewLayer.batchDraw();deselect();
      if(STATE.cmdMode) exitCmdMode();
      STATE.boxSelection=[];renderAll();
      break;
    case 'delete':case 'backspace':
      if(!deleteBoxSelection()) deleteSelected();
      break;
  }
});
document.addEventListener('keyup',e=>{
  if(e.key==='Shift'){STATE.shiftPressed=false;_refreshShiftOrtho();}
  if(e.key==='Alt'){stage.container().style.cursor='';}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Alt'&&STATE.selectedTool==='select'){stage.container().style.cursor='copy';e.preventDefault();}
});


}
