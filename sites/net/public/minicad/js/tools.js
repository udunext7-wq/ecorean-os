'use strict';
// ===== 도구 핸들러 / 마우스 / 키보드 =====
// v5.9: 라이브러리 배치 미리보기 상태 (TDZ 회피용 상단 선언)
let _libPreviewActive=false;
let _libPlaceAngle=0;       // 고스트 회전각 (0/90/180/270 등, deg)
let _libPlaceFlipped=false; // 고스트 좌우 미러
let _libLastPos=null;       // 마지막 마우스 위치 (회전 후 즉시 미리보기 갱신용)
// v5.9: 스케일 보정 모드 (배경 이미지 픽셀↔mm 비율 결정)
let _scaleCalActive=false;
let _scaleCalP1=null;
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
    ceilingHeight_mm:null, // v5.9: null = 프로젝트 기본 천장고 추종 (개별 입력 시에만 고정)
    floorMaterial:dm.floor,ceilingMaterial:'GYPSUM',
  });
  STATE.spaces.push(s);
  // v5.9: 각 공간이 자기 벽을 항상 보유 — 공유 변에서도 두 공간이 각각 벽 소유 (Option C)
  // 이전엔 중복 체크로 한쪽만 가졌지만 KPI/마감재/도어 부착이 한 공간으로 쏠리는 문제가 있었음
  const N=vertexIds.length;
  for(let i=0;i<N;i++){
    const aId=vertexIds[i], bId=vertexIds[(i+1)%N];
    const wallLayer=layerName.replace('AREA','WALL');
    STATE.walls.push(makeWallVEF(aId,bId,{layerName:wallLayer,spaceId:s.id,finishMaterial:dm.wall}));
  }
  STATE.videoSequenceOrder=null;
  saveHistory();selectObj('space',s.id);
}
// v5.9: 자유벽 전용 vertex 확보 — 공간에 속한 vertex는 공유 대상에서 제외 (자유벽 독립성 보장)
// 다른 자유벽의 vertex는 공유 가능 (벽-벽 연결은 의도된 동작)
function _ensureFreeWallVertex(x,y,tol=60){
  x=Math.round(x);y=Math.round(y);
  const spaceVertexSet=new Set();
  STATE.spaces.forEach(s=>s.vertexIds&&s.vertexIds.forEach(vid=>spaceVertexSet.add(vid)));
  // 2026-08-27: 잠긴 객체의 버텍스에 용접되면 새 벽까지 못 움직이게 된다 (대표 지시)
  //  → 스냅 좌표는 그대로 쓰되 버텍스는 독립 생성 (잠긴 객체는 '스냅 기준선'으로만 동작)
  const found=STATE.vertices.find(v=>
    v.kind!=='bearing'&&!spaceVertexSet.has(v.id)
    &&!(typeof isVertexLocked==='function'&&isVertexLocked(v.id))
    &&Math.hypot(v.x-x,v.y-y)<tol
  );
  if(found) return found;
  const v={id:makeId('v'),x,y};
  STATE.vertices.push(v);
  return v;
}
// v5.9: 기둥 추가 (RC 콘크리트) — 좌측 패널의 pillarDefaults 사용
function addPillar(x,y,opts={}){
  const def=STATE.pillarDefaults||{shape:'rect',width:500,height:500,thickness:200,rotation:0};
  const p={
    id:makeId('pl'),
    shape:opts.shape||def.shape||'rect',
    x:Math.round(x),y:Math.round(y),
    width:opts.width??def.width??500,
    height:opts.height??def.height??500,
    thickness:opts.thickness??def.thickness??200,
    rotation:opts.rotation??def.rotation??0,
    locked:false,
  };
  STATE.pillars.push(p);
  saveHistory();renderAll();refreshUI();
  return p;
}
// 클릭 위치에 기둥 배치 (스냅 적용된 좌표 사용)
function addPillarAtPos(pos){
  const mm=getMm(pos);
  addPillar(mm.x,mm.y);
  cmdToast('기둥 배치 — 연속 클릭으로 추가, Esc 종료');
}

// v5.9: 기둥 고스트 미리보기 — 기둥 도구 활성 시 마우스 위치에 폴리곤 윤곽 표시
function updatePillarGhost(mm){
  drawGroup.destroyChildren();
  const def=STATE.pillarDefaults||{shape:'rect',width:500,height:500,thickness:200,rotation:0};
  const ghostP={shape:def.shape,x:mm.x,y:mm.y,width:def.width,height:def.height,thickness:def.thickness,rotation:def.rotation};
  const polyMm=pillarPolygon(ghostP);
  const pts=[];
  polyMm.forEach(p=>{pts.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
  drawGroup.add(new Konva.Line({
    points:pts,closed:true,
    stroke:'#FFE066',strokeWidth:2,dash:[6,4],opacity:0.9,
    fill:'rgba(255,224,102,0.12)',listening:false,
    shadowColor:'#FFE066',shadowBlur:6,shadowOpacity:0.5,
  }));
  // 중심점
  drawGroup.add(new Konva.Circle({x:STATE.offsetX+mmToPx(mm.x),y:STATE.offsetY+mmToPx(mm.y),radius:3,fill:'#FFE066',listening:false}));
  // 사이즈 라벨
  const lbl=def.shape==='circle'?('Ø '+def.width):(def.shape==='L'?(def.width+'×'+def.height+' t'+def.thickness):(def.width+'×'+def.height));
  drawGroup.add(new Konva.Text({
    x:STATE.offsetX+mmToPx(mm.x)+10, y:STATE.offsetY+mmToPx(mm.y)-22,
    text:lbl,fontSize:11,fontFamily:'JetBrains Mono',fill:'#FFE066',listening:false,
    shadowColor:'#000',shadowBlur:2,shadowOpacity:0.7,
  }));
  previewLayer.batchDraw();
}

// v5.9 fix: 벽 중점이 공간 내부 또는 경계 300mm 이내일 때만 그 공간에 귀속.
// (기존: 거리 무제한 최근접 → 멀리 떨어진 자유 벽이 spWall 벽면적을 부풀려 견적 물량 왜곡 + JSON free_wall 오분류)
function _wallBelongsToSpace(sp,p,tol){
  if(!sp||!sp.polygon||sp.polygon.length<3) return false;
  if(typeof pointInPolygon==='function'&&pointInPolygon(p,sp.polygon)) return true;
  for(let i=0;i<sp.polygon.length;i++){
    const a=sp.polygon[i],b=sp.polygon[(i+1)%sp.polygon.length];
    if(pointToSegmentDist(p,a,b)<=tol) return true;
  }
  return false;
}
function addWall(x1,y1,x2,y2,opts={}){
  const dx=x2-x1,dy=y2-y1;
  if(Math.sqrt(dx*dx+dy*dy)<100) return;
  const mid={x:(x1+x2)/2,y:(y1+y2)/2};
  const spNear=findNearestSpace(mid);
  const sp=_wallBelongsToSpace(spNear,mid,300)?spNear:null;
  const wallType=opts.wallType||'standard';
  // v5.9: 내력벽은 spaceId 부여 안 함 → 공간 경계 영향 차단
  const isBearing=wallType==='bearing';
  const layerName=makeLayerName(isBearing?'WALLB':'WALL',isBearing?null:sp);
  const thickness=isBearing?(STATE.bearingWallThickness||200):(opts.thickness||STATE.wallThickness);
  // v5.9: 내력벽은 내력벽 전용 그래프에서 vertex 공유 (tol=30mm) — 코너 끊김 방지
  // v5.9: 자유벽(벽 도구로 그린 벽)은 공간 vertex와 공유 안 함 — 공간 이동에 끌려가지 않도록 독립 vertex 사용
  const v1=isBearing?ensureBearingVertex(x1,y1,30):_ensureFreeWallVertex(x1,y1);
  const v2=isBearing?ensureBearingVertex(x2,y2,30):_ensureFreeWallVertex(x2,y2);
  STATE.walls.push(makeWallVEF(v1.id,v2.id,{
    layerName,spaceId:isBearing?null:(sp?sp.id:null),
    wallType,thickness,
    alignment:STATE.wallAlignment||'center',
  }));
  if(!isBearing) splitWallsAtIntersections(); // v5.9: 내력벽 추가 시 자동 분할 안 함
  saveHistory();renderAll();refreshUI();
}
// 폴리곤을 선분 a-b로 분할 → [poly1, poly2] 또는 null
// v5.9: 사용자가 그린 선분 그대로 사용 (무한 연장 제거) — 지정한 만큼만 분할
function splitPolygonByLine(polygon, a, b){
  const n=polygon.length;
  if(n<3) return null;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  if(len<1) return null;
  // 폴리곤 vertex의 사이드는 a-b 무한직선 기준 (분할 후 두 영역 구분용)
  const signOf=p=>{
    const d=((b.y-a.y)*p.x-(b.x-a.x)*p.y+b.x*a.y-b.y*a.x)/len;
    return Math.abs(d)<2?0:d>0?1:-1;
  };
  const sides=polygon.map(signOf);
  // 점이 선분 a-b 위(연장선 X)에 있는지 검사 헬퍼
  const onSegmentAB=p=>{
    const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(len*len);
    return t>=-0.001&&t<=1.001;
  };
  // augmented polygon: 변 중간 교차점 삽입 — 선분 a-b 내에서만
  const aug=[];
  for(let i=0;i<n;i++){
    aug.push({pt:{x:polygon[i].x,y:polygon[i].y},isInt:false,pi:i});
    const ni=(i+1)%n,s1=sides[i],s2=sides[ni];
    if(s1!==0&&s2!==0&&s1!==s2){
      const ip=segIntersection(a,b,polygon[i],polygon[ni]);
      if(ip){
        const edx=polygon[ni].x-polygon[i].x,edy=polygon[ni].y-polygon[i].y,len2=edx*edx+edy*edy;
        if(len2>=1){
          const t=((ip.x-polygon[i].x)*edx+(ip.y-polygon[i].y)*edy)/len2;
          if(t>0.001&&t<0.999) aug.push({pt:{x:Math.round(ip.x),y:Math.round(ip.y)},isInt:true,pi:-1});
        }
      }
    }
  }
  // 선 위 vertex(side=0) 중 a-b 선분 위에 실제로 있고 양 이웃이 반대편이면 교차점
  for(let i=0;i<aug.length;i++){
    const e=aug[i];
    if(e.pi<0||sides[e.pi]!==0) continue;
    if(!onSegmentAB(e.pt)) continue;
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

// v5.9: 폴리라인(점 배열)으로 폴리곤 분할 — 다중 선분이 공간을 가로지를 때 사용
function splitPolygonByPolyline(polygon, polyline){
  if(polygon.length<3||polyline.length<2) return null;
  const n=polygon.length;
  // 폴리라인 각 segment와 폴리곤 각 변의 교차점 모두 수집
  // v5.9 fix: 코너(t_poly=0 또는 1) 교차도 허용 — 끝점이 공간 모서리에 스냅된 경우 대응
  const rawInt=[];
  for(let li=0;li<polyline.length-1;li++){
    const la=polyline[li],lb=polyline[li+1];
    for(let pi=0;pi<n;pi++){
      const pa=polygon[pi],pb=polygon[(pi+1)%n];
      const ip=segIntersection(la,lb,pa,pb);
      if(!ip) continue;
      const lineDx=lb.x-la.x,lineDy=lb.y-la.y;
      const lineLen2=lineDx*lineDx+lineDy*lineDy;
      const polyDx=pb.x-pa.x,polyDy=pb.y-pa.y;
      const polyLen2=polyDx*polyDx+polyDy*polyDy;
      if(lineLen2<1||polyLen2<1) continue;
      const t_line=((ip.x-la.x)*lineDx+(ip.y-la.y)*lineDy)/lineLen2;
      const t_poly=((ip.x-pa.x)*polyDx+(ip.y-pa.y)*polyDy)/polyLen2;
      // 폴리라인 segment 내부 + 폴리곤 변 위 (코너 포함, 약간 여유)
      if(t_line>-0.01&&t_line<1.01&&t_poly>-0.005&&t_poly<1.005){
        rawInt.push({polyIdx:pi,lineIdx:li,pt:{x:Math.round(ip.x),y:Math.round(ip.y)},t_poly:Math.max(0,Math.min(1,t_poly)),t_line:Math.max(0,Math.min(1,t_line))});
      }
    }
  }
  // 같은 (polyIdx, t_line~) 또는 같은 좌표 교차점 중복 제거 — 코너에서 두 변과 동시 교차 시 1개만 남김
  const intersections=[];
  for(const ix of rawInt){
    const dup=intersections.find(q=>Math.abs(q.pt.x-ix.pt.x)<3&&Math.abs(q.pt.y-ix.pt.y)<3);
    if(!dup) intersections.push(ix);
  }
  if(intersections.length<2) return null;
  // t_poly~=1을 다음 변의 t_poly=0으로 정규화 — 코너에서 중복 제거 안정화
  intersections.forEach(ix=>{if(ix.t_poly>0.995){ix.polyIdx=(ix.polyIdx+1)%n;ix.t_poly=0;}});
  // 폴리라인 진행 순서로 정렬 (lineIdx 우선, 같은 line이면 t_line)
  intersections.sort((x,y)=>x.lineIdx-y.lineIdx||x.t_line-y.t_line);
  // 첫·끝 교차점 = entry/exit
  const entry=intersections[0],exit=intersections[intersections.length-1];
  if(entry.lineIdx===exit.lineIdx&&Math.abs(entry.t_line-exit.t_line)<0.001) return null;
  // entry → polyline 중간 → exit 구간 추출
  const polylinePiece=[entry.pt];
  for(let li=entry.lineIdx+1;li<=exit.lineIdx;li++) polylinePiece.push(polyline[li]);
  polylinePiece.push(exit.pt);
  // 두 부분 폴리곤 구성
  const part1=[entry.pt];
  let pi=(entry.polyIdx+1)%n,safety=n+2;
  while(pi!==(exit.polyIdx+1)%n&&safety-->0){part1.push(polygon[pi]);pi=(pi+1)%n;}
  part1.push(exit.pt);
  for(let i=polylinePiece.length-2;i>=1;i--) part1.push(polylinePiece[i]);
  const part2=[entry.pt];
  for(let i=1;i<polylinePiece.length-1;i++) part2.push(polylinePiece[i]);
  part2.push(exit.pt);
  pi=(exit.polyIdx+1)%n;safety=n+2;
  while(pi!==(entry.polyIdx+1)%n&&safety-->0){part2.push(polygon[pi]);pi=(pi+1)%n;}
  // 연속 중복점 제거 (코너 교차로 인한 중복 보정)
  const dedupe=pts=>{
    const r=[];
    for(const p of pts){
      if(r.length===0||Math.abs(r[r.length-1].x-p.x)>3||Math.abs(r[r.length-1].y-p.y)>3) r.push(p);
    }
    if(r.length>=2&&Math.abs(r[0].x-r[r.length-1].x)<3&&Math.abs(r[0].y-r[r.length-1].y)<3) r.pop();
    return r;
  };
  const p1=dedupe(part1), p2=dedupe(part2);
  if(p1.length<3||p2.length<3) return null;
  return [p1,p2];
}
// v5.9: 새 선분(a-b)을 기존 isLine 벽들과 연결해서 폴리라인 만들고, 공간을 가로지르는지 확인
function tryPolylineSplit(a,b){
  const TOL=150; // mm — 끝점 매칭 허용 오차 (자유 클릭 시 약간 어긋나도 결합)
  const samePoint=(p1,p2)=>Math.hypot(p1.x-p2.x,p1.y-p2.y)<TOL;
  const lineWalls=STATE.walls.filter(w=>w.isLine);
  if(lineWalls.length===0) return null;
  const segs=lineWalls.map(w=>{
    const v1=STATE.vertices.find(v=>v.id===w.v1Id);
    const v2=STATE.vertices.find(v=>v.id===w.v2Id);
    return v1&&v2?{pa:{x:v1.x,y:v1.y},pb:{x:v2.x,y:v2.y},wallId:w.id}:null;
  }).filter(Boolean);
  // startPt에서 연결된 segment를 따라 끝까지 체이닝
  function chainFrom(startPt,used){
    const path=[startPt];
    let cur=startPt;
    let safety=segs.length+1;
    while(safety-->0){
      let found=null;
      for(const seg of segs){
        if(used.has(seg.wallId)) continue;
        if(samePoint(seg.pa,cur)){found={seg,next:seg.pb};break;}
        if(samePoint(seg.pb,cur)){found={seg,next:seg.pa};break;}
      }
      if(!found) break;
      used.add(found.seg.wallId);
      path.push(found.next);
      cur=found.next;
    }
    return path;
  }
  const used=new Set();
  const backChain=chainFrom(a,used); // [a, prev1, prev2, ...]
  const fwdChain=chainFrom(b,used);  // [b, next1, next2, ...]
  // 폴리라인: backChain 역순(a 제외) + a,b + fwdChain(b 제외)
  const polyline=[...backChain.slice(1).reverse(),a,b,...fwdChain.slice(1)];
  if(polyline.length<3) return null; // 연결된 추가 세그먼트 없음
  for(const s of STATE.spaces){
    const result=splitPolygonByPolyline(s.polygon,polyline);
    if(result) return {space:s,parts:result,consumedWallIds:[...used],polyline};
  }
  return null;
}

function addLine(x1,y1,x2,y2){
  if(Math.hypot(x2-x1,y2-y1)<50) return;
  const a={x:x1,y:y1},b={x:x2,y:y2};
  // 1) 단일 선분으로 공간 가로지르면 분할 (기존 동작)
  const toRemove=[],toAdd=[];
  STATE.spaces.forEach(s=>{
    if(s.locked) return; // 2026-08-24: 잠긴 공간은 분할 금지
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
        // v5.9: 분할된 sub-공간도 자기 벽을 항상 소유 (Option C)
        STATE.walls.push(makeWallVEF(aId,bId,{layerName:layerName.replace('AREA','WALL'),spaceId:s.id,finishMaterial:srcWallMats.get(source.id)||null}));
      }
    });
    saveHistory();renderAll();refreshUI();
    cmdToast('공간 분할 — '+toAdd.length+'개로 분리');
    setTimeout(()=>flashSplitSpaces(newIds),16);
    return;
  }
  // 2) v5.9: 다중 선분 폴리라인 분할 시도 — 새 선이 기존 isLine과 연결되어 공간을 가로지르면
  let plResult=tryPolylineSplit(a,b);
  if(plResult&&plResult.space&&plResult.space.locked){plResult=null;cmdToast('잠금된 공간 — 분할 대신 참조선 추가');} // 2026-08-24
  if(plResult){
    const {space,parts,consumedWallIds}=plResult;
    const srcWallMat=STATE.walls.find(w=>w.spaceId===space.id&&!w.isLine)?.finishMaterial||null;
    STATE.spaces=STATE.spaces.filter(s=>s.id!==space.id);
    STATE.walls=STATE.walls.filter(w=>w.spaceId!==space.id&&!consumedWallIds.includes(w.id));
    const newIds=[];
    parts.forEach((poly,idx)=>{
      const tk=space.type;
      const typeIndex=STATE.spaces.filter(s=>s.type===tk).length+1;
      const layerName='A-AREA-'+SPACE_TYPES[tk].code+'-'+String(typeIndex).padStart(2,'0');
      const vertexIds=polygonToVertexIds(simplifySpacePoly(poly.map(p=>({x:Math.round(p.x),y:Math.round(p.y)}))));
      const sNew=makeSpaceVEF(vertexIds,{
        name:space.name+'-'+(idx+1),type:tk,typeIndex,layerName,
        ceilingHeight_mm:space.ceilingHeight_mm,
        floorMaterial:space.floorMaterial,
        ceilingMaterial:space.ceilingMaterial,
      });
      STATE.spaces.push(sNew);
      newIds.push(sNew.id);
      const N=vertexIds.length;
      for(let i=0;i<N;i++){
        const aId=vertexIds[i],bId=vertexIds[(i+1)%N];
        STATE.walls.push(makeWallVEF(aId,bId,{layerName:layerName.replace('AREA','WALL'),spaceId:sNew.id,finishMaterial:srcWallMat}));
      }
    });
    saveHistory();renderAll();refreshUI();
    cmdToast('폴리라인 공간 분할 — '+parts.length+'개로 분리 ('+(consumedWallIds.length+1)+'개 선 결합)');
    setTimeout(()=>flashSplitSpaces(newIds),16);
    return;
  }
  // 3) 분할 안 되면 참조선(isLine)으로 추가 (기존)
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
      if(a.wallType==='bearing') continue; // v5.9: 내력벽 격리 — 자동 분할 대상에서 제외
      if(a.locked) continue; // 2026-08-24: 잠긴 벽은 분할·버텍스 신설 금지 (대표 지시)
      for(let j=i+1;j<STATE.walls.length;j++){
        const b=STATE.walls[j];
        if(b.wallType==='bearing') continue; // v5.9: 내력벽은 다른 벽도 분할 안 시킴
        if(b.locked) continue; // 2026-08-24: 잠긴 벽은 분할·버텍스 신설 금지
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
          // v5.9 fix: 원본 벽 객체를 props로 넘기면 id가 복제되어 분할 조각들이 같은 id를 가짐 → 새 id 강제
          if(Math.hypot(iv.x-a.x1,iv.y-a.y1)>=100) newWalls.push(makeWallVEF(a.v1Id,iv.id,{...a,id:undefined}));
          if(Math.hypot(iv.x-a.x2,iv.y-a.y2)>=100) newWalls.push(makeWallVEF(iv.id,a.v2Id,{...a,id:undefined}));
        }else newWalls.push(a);
        if(dBe>=TOL){
          if(Math.hypot(iv.x-b.x1,iv.y-b.y1)>=100) newWalls.push(makeWallVEF(b.v1Id,iv.id,{...b,id:undefined}));
          if(Math.hypot(iv.x-b.x2,iv.y-b.y2)>=100) newWalls.push(makeWallVEF(iv.id,b.v2Id,{...b,id:undefined}));
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
  let bestWallId=null, bestWallDist=Infinity; // v5.9: 배치 시점 벽 귀속 기록 (JSON parentWallId 정확도)
  // (1) walls 배열의 벽 객체 우선
  STATE.walls.forEach(w=>{
    const d=pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<bestDist){
      bestDist=d;
      bestAngle=Math.atan2(w.y2-w.y1,w.x2-w.x1)*180/Math.PI;
    }
    // 내력벽은 도어/창 부착 대상 아님 (v5.9 정책) — 각도 참조만 허용
    if(w.wallType!=='bearing'&&d<bestWallDist){bestWallDist=d;bestWallId=w.id;}
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
    wallId:bestWallDist<=500?bestWallId:null, // v5.9: 배치 시점 확정 벽 (export 시 재추측 대신 사용)
    width_mm:def.w,height_mm:def.h,depth_mm:def.d,
    sillHeight_mm:type==='WINDOW'?def.sill:null,
    angle:ang,
    // v5.9: 단면/양면 차감 — 도어는 종류별 기본값, 창은 항상 단면(외기 면)
    subtractMode:type==='DOOR'?(def.subtract||'double'):'single',
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
  const o={id:makeId(kind.charAt(0)),type,x:mm.x,y:mm.y,angle:_libPlaceAngle||0,flipped:!!_libPlaceFlipped,
    layerName:makeLayerName(elem,sp),spaceId:sp?sp.id:null};
  // 2026-08-25: 다운라이트는 마지막에 고른 인치로 배치 (대표 지시 — 2인치·3인치 혼용)
  if(type==='downlight') o.inch=Math.round(STATE.downlightInch||DOWNLIGHT_INCH_DEFAULT);
  // 2026-08-25: 라인·간접조명은 길이 속성으로 배치 (이후 입력/드래그로 늘림)
  if(typeof isLinearLight==='function'&&isLinearLight(type)) o.length_mm=linearLightLen({type});
  if(kind==='fixtures') STATE.fixtures.push(o);
  else if(kind==='furniture') STATE.furniture.push(o);
  else if(kind==='lights') STATE.lights.push(o);
  else if(kind==='electric') STATE.electric.push(o);
  else if(kind==='hvac') STATE.hvac.push(o); // v5.6
  // v5.9: 미리보기 즉시 정리 (ghost가 새 객체를 가리는 문제 방지) + 강제 즉시 그리기
  drawGroup.destroyChildren();
  _libPreviewActive=false;
  saveHistory();renderAll();refreshUI();
  mainLayer.draw();previewLayer.draw();
}

// v5.3: 원·아크
// v5.9: 선택된 아크를 자유 베지에 곡선으로 변환
function convertArcToCurve(){
  if(STATE.selectedKind!=='arcs'||!STATE.selectedId){cmdToast('아크를 먼저 선택');return;}
  const arc=STATE.arcs.find(a=>a.id===STATE.selectedId);
  if(!arc){cmdToast('아크 찾을 수 없음');return;}
  const segments=arcToBezier(arc.x,arc.y,arc.radius_mm,arc.startAngle,arc.endAngle);
  if(!segments||segments.length===0){cmdToast('곡선 변환 실패');return;}
  const curve={
    id:makeId('cv'),segments,
    layerName:arc.layerName||'CURVE',spaceId:arc.spaceId||null,
  };
  STATE.curves.push(curve);
  STATE.arcs=STATE.arcs.filter(a=>a.id!==arc.id);
  STATE.selectedKind='curves';STATE.selectedId=curve.id;
  saveHistory();renderAll();refreshUI();
  cmdToast('곡선 변환 완료 — 컨트롤 핸들 드래그로 자유 편집');
}
function addCircle(cx,cy,radius){
  if(radius<10) return;
  const sp=findNearestSpace({x:cx,y:cy});
  const r=Math.round(radius);
  STATE.circles.push({
    id:makeId('cir'),x:cx,y:cy,radius_mm:r,
    rx_mm:r,ry_mm:r,rotation:0, // v5.9: 타원 지원 (생성 시 정원)
    layerName:makeLayerName('CIRC',sp),spaceId:sp?sp.id:null,
  });
  saveHistory();renderAll();refreshUI();
  cmdToast('원 추가 — R '+r+'mm');
}
// v5.9: 아크를 처음부터 베지에 곡선으로 생성 — 컨트롤 핸들로 자유 편집 가능
function addArc(cx,cy,radius,startAngle,endAngle){
  if(radius<10) return;
  const sp=findNearestSpace({x:cx,y:cy});
  const segments=arcToBezier(cx,cy,radius,startAngle,endAngle);
  if(!segments||segments.length===0) return;
  const curve={
    id:makeId('cv'),segments,
    layerName:makeLayerName('CURVE',sp),spaceId:sp?sp.id:null,
  };
  STATE.curves.push(curve);
  STATE.selectedKind='curves';STATE.selectedId=curve.id;
  saveHistory();renderAll();refreshUI();
  cmdToast('곡선 추가 — R '+Math.round(radius)+'mm (컨트롤 핸들로 편집)');
}
function addText(pos){
  // v5.1: 명령창에서 단계별 입력
  const mm=getMm(pos);
  enterCmdMode('text-input',{pos:mm},'텍스트:','텍스트 입력 후 Enter (esc=취소)');
}

// v5.9: 지시선 (LE)
let leaderDrawState=null; // {points:[{x,y},...]}
// v5.9: 지시선·도형 그리기 시 직교 제약 (이전 점 기준 수평/수직)
function _orthoConstrain(prev,cur){
  const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
  if(!orthoActive||!prev) return cur;
  const dx=cur.x-prev.x, dy=cur.y-prev.y;
  return Math.abs(dx)>=Math.abs(dy)?{x:cur.x,y:prev.y}:{x:prev.x,y:cur.y};
}
function handleLeaderClick(pos){
  let mm=getMm(pos);
  if(!leaderDrawState){
    leaderDrawState={points:[mm]};
    showStatus('다음 점 클릭 — 더블클릭 또는 Enter로 텍스트 입력');
  } else {
    const prev=leaderDrawState.points[leaderDrawState.points.length-1];
    mm=_orthoConstrain(prev,mm);
    leaderDrawState.points.push(mm);
    updateLeaderPreview();
  }
}
function finishLeader(){
  if(!leaderDrawState||leaderDrawState.points.length<2){
    leaderDrawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();return;
  }
  enterCmdMode('leader-text',{points:leaderDrawState.points},'레이블:','텍스트 입력 후 Enter (esc=취소)');
  leaderDrawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
}
function updateLeaderPreview(cursorMm){
  if(!leaderDrawState) return;
  drawGroup.destroyChildren();
  const pts=[...leaderDrawState.points];
  if(cursorMm){
    const prev=pts[pts.length-1];
    pts.push(_orthoConstrain(prev,cursorMm));
  }
  if(pts.length<2){previewLayer.batchDraw();return;}
  const flat=[];
  pts.forEach(p=>{flat.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
  drawGroup.add(new Konva.Line({points:flat,stroke:'#A8D8A8',strokeWidth:1.2,dash:[6,3],lineCap:'round',lineJoin:'round'}));
  // 화살표 미리보기
  const p0=pts[0],p1=pts[1];
  const adx=p0.x-p1.x,ady=p0.y-p1.y,alen=Math.hypot(adx,ady)||1;
  const ax=adx/alen,ay=ady/alen;
  const arrLen=14,arrW=7; // 고정 픽셀
  const tip={x:STATE.offsetX+mmToPx(p0.x),y:STATE.offsetY+mmToPx(p0.y)};
  const base={x:tip.x-ax*arrLen,y:tip.y-ay*arrLen};
  const lx=base.x+ay*arrW/2,ly=base.y-ax*arrW/2;
  const rx=base.x-ay*arrW/2,ry=base.y+ax*arrW/2;
  drawGroup.add(new Konva.Line({points:[tip.x,tip.y,lx,ly,rx,ry,tip.x,tip.y],closed:true,fill:'#A8D8A8',stroke:'#A8D8A8',strokeWidth:0.5}));
  previewLayer.batchDraw();
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
// v5.9: 자유 다각형 — 점 클릭으로 꼭짓점 추가 (도움말 스펙 복원: L자/ㄷ자 공간용). {points:[{x,y}]}
let freePolyState=null;
function clickPolygon(pos){
  if(polyClickGuard) return;
  if(polyState){
    // 정다각형 모드 (꼭짓점 수 입력 후): 중심 → 반지름
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
    return;
  }
  // 자유 다각형 모드 (기본): 클릭 = 꼭짓점 추가
  const mm=getMm(pos);
  if(!freePolyState){
    freePolyState={points:[mm]};
    if(STATE.cmdMode==='polygon-n') exitCmdMode();
    document.getElementById('cmd-hint').textContent='자유 다각형 — 점 클릭 추가 / Enter·더블클릭=닫기 / Esc=취소';
    cmdToast('자유 다각형 시작 — 3점 이상 클릭 후 Enter/더블클릭으로 닫기');
  }else{
    const prev=freePolyState.points[freePolyState.points.length-1];
    const p=_orthoConstrain(prev,mm);
    if(Math.hypot(p.x-prev.x,p.y-prev.y)<50){cmdToast('같은 위치 — 다른 점을 클릭하거나 Enter로 닫기');return;}
    freePolyState.points.push(p);
  }
  updateFreePolyPreview();
  const fab=document.getElementById('polyclose-fab');
  if(fab) fab.classList.toggle('hidden',freePolyState.points.length<3);
}
function updateFreePolyPreview(cursorMm){
  if(!freePolyState) return;
  drawGroup.destroyChildren();
  const pts=[...freePolyState.points];
  if(cursorMm){const prev=pts[pts.length-1];pts.push(_orthoConstrain(prev,cursorMm));}
  const flat=[];pts.forEach(p=>{flat.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
  if(pts.length>=2) drawGroup.add(new Konva.Line({points:flat,stroke:'#C9A961',strokeWidth:1.5,dash:[6,4],closed:pts.length>=3}));
  pts.forEach((p,i)=>drawGroup.add(new Konva.Circle({x:STATE.offsetX+mmToPx(p.x),y:STATE.offsetY+mmToPx(p.y),radius:3,fill:i===0?'#7BA05B':'#C9A961'})));
  previewLayer.batchDraw();
}
function finishFreePolygon(){
  if(!freePolyState||freePolyState.points.length<3){cmdToast('3점 이상 클릭 후 닫기');return;}
  const pts=freePolyState.points.map(p=>({x:Math.round(p.x),y:Math.round(p.y)}));
  freePolyState=null;
  drawGroup.destroyChildren();previewLayer.batchDraw();
  const fab=document.getElementById('polyclose-fab');
  if(fab) fab.classList.add('hidden');
  addSpace(pts);
  cmdToast('다각 공간 생성 ('+pts.length+'점)');
}
function updatePolygonPreview(pos){
  if(freePolyState){updateFreePolyPreview(getMm(pos));return;} // v5.9: 자유 다각형 미리보기
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
// v5.9: 무한 안내선 (XLINE) — 두 점이 방향을 정의, 무한 연장
function addXline(x1,y1,x2,y2){
  if(Math.hypot(x2-x1,y2-y1)<1) return;
  STATE.xlines.push({id:makeId('xl'),x1:Math.round(x1),y1:Math.round(y1),x2:Math.round(x2),y2:Math.round(y2)});
  saveHistory();renderAll();refreshUI();
}
function endWall(){
  if(!drawState||drawState.type!=='wall') return;
  let end=drawState.current;
  end=applyOrtho(drawState.start,end);
  // v5.9: 도구가 'gabyeok'이면 내력벽으로 추가 (tool key 유지, 라벨만 내력벽)
  const wallType=STATE.selectedTool==='gabyeok'?'bearing':'standard';
  addWall(drawState.start.x,drawState.start.y,end.x,end.y,{wallType});
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
    ceilingHeight_mm:null, // v5.9: null = 프로젝트 기본 천장고 추종 (개별 입력 시에만 고정)
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

// v5.9: A 도구 — 두 점 클릭으로 직선 생성, Bezier 컨트롤 핸들로 곡선 변형 가능
function startArc(pos){/* 더 이상 사용 안 함 — 2-click 흐름으로 변경 */}
function updateArc(pos){/* deprecated */}
function endArc(){/* deprecated */}
// 2-click 흐름으로 직선 → Bezier 곡선 객체 생성
function addLinearCurve(x1,y1,x2,y2){
  const sp=findNearestSpace({x:(x1+x2)/2,y:(y1+y2)/2});
  // 직선 형태로 Bezier 만들기 — P1, P2를 1/3, 2/3 지점에 두면 시각적으로 직선
  const p0={x:Math.round(x1),y:Math.round(y1)};
  const p3={x:Math.round(x2),y:Math.round(y2)};
  const p1={x:Math.round(x1+(x2-x1)/3),y:Math.round(y1+(y2-y1)/3)};
  const p2={x:Math.round(x1+(x2-x1)*2/3),y:Math.round(y1+(y2-y1)*2/3)};
  const curve={
    id:makeId('cv'),
    segments:[{p0,p1,p2,p3}],
    layerName:makeLayerName('CURVE',sp),spaceId:sp?sp.id:null,
  };
  STATE.curves.push(curve);
  STATE.selectedKind='curves';STATE.selectedId=curve.id;
  saveHistory();renderAll();refreshUI();
  cmdToast('선/곡선 추가 — 컨트롤 핸들 드래그로 곡선화');
}
// 2026-08-27: AutoCAD 방식 박스 선택 기하 판정 (대표 지시)
//  Window(좌→우): 객체가 박스에 '완전히' 들어와야 선택
//  Crossing(우→좌): 박스에 조금이라도 '걸치면' 선택 (선분 교차·도형 겹침·박스가 도형 내부 포함)
// 선분 ↔ AABB 교차 (Liang-Barsky) — 양 끝점이 모두 박스 밖이어도 관통하면 true
function _segRectHit(ax,ay,bx,by,x1,y1,x2,y2){
  let t0=0,t1=1;
  const dx=bx-ax, dy=by-ay;
  const P=[-dx,dx,-dy,dy], Q=[ax-x1,x2-ax,ay-y1,y2-ay];
  for(let i=0;i<4;i++){
    if(P[i]===0){ if(Q[i]<0) return false; }
    else{
      const r=Q[i]/P[i];
      if(P[i]<0){ if(r>t1) return false; if(r>t0) t0=r; }
      else{ if(r<t0) return false; if(r<t1) t1=r; }
    }
  }
  return true;
}
function _rotPts(cx,cy,w,h,angDeg){
  const a=(angDeg||0)*Math.PI/180, co=Math.cos(a), si=Math.sin(a);
  return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([dx,dy])=>({
    x:cx+dx*co-dy*si, y:cy+dx*si+dy*co}));
}
function _libDefForSel(key,o){
  if(key==='lights'){
    if(o.type==='downlight'&&typeof downlightDef==='function') return downlightDef(o);
    if(typeof isLinearLight==='function'&&isLinearLight(o.type)&&typeof linearLightDef==='function') return linearLightDef(o);
  }
  const LB={furniture:typeof FURNITURE_LIB!=='undefined'?FURNITURE_LIB:{},
            fixtures:typeof FIXTURE_LIB!=='undefined'?FIXTURE_LIB:{},
            lights:typeof LIGHT_LIB!=='undefined'?LIGHT_LIB:{},
            electric:typeof ELECTRIC_LIB!=='undefined'?ELECTRIC_LIB:{},
            hvac:typeof HVAC_FIRE_LIB!=='undefined'?HVAC_FIRE_LIB:{}}[key];
  return LB?LB[o.type]:null;
}
// 객체 → 판정용 기하 {pts:[...], closed:bool}
function _boxSelGeom(key,o){
  const ellipse=(cx,cy,rx,ry,rot)=>{
    const pts=[],a=(rot||0)*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
    for(let i=0;i<16;i++){
      const t=i/16*Math.PI*2, ex=Math.cos(t)*rx, ey=Math.sin(t)*ry;
      pts.push({x:cx+ex*co-ey*si,y:cy+ex*si+ey*co});
    }
    return {pts,closed:true};
  };
  if(key==='walls'||key==='measures') return {pts:[{x:o.x1,y:o.y1},{x:o.x2,y:o.y2}],closed:false};
  if(key==='spaces') return {pts:o.polygon||[],closed:true};
  if(key==='leaders') return {pts:o.points||[],closed:false};
  if(key==='curves'){
    const pts=[];
    (o.segments||[]).forEach(sg=>{
      for(let i=0;i<=8;i++){
        const t=i/8, mt=1-t;
        pts.push({
          x:mt*mt*mt*sg.p0.x+3*mt*mt*t*sg.p1.x+3*mt*t*t*sg.p2.x+t*t*t*sg.p3.x,
          y:mt*mt*mt*sg.p0.y+3*mt*mt*t*sg.p1.y+3*mt*t*t*sg.p2.y+t*t*t*sg.p3.y});
      }
    });
    return {pts,closed:false};
  }
  if(key==='circles') return ellipse(o.x,o.y,o.rx_mm||o.radius_mm||100,o.ry_mm||o.radius_mm||100,o.rotation);
  if(key==='arcs'){
    const r=o.radius_mm||100, sa=(o.startAngle||0), ea=(o.endAngle||360);
    const pts=[]; const steps=12;
    for(let i=0;i<=steps;i++){
      const t=(sa+(ea-sa)*i/steps)*Math.PI/180;
      pts.push({x:o.x+Math.cos(t)*r,y:o.y+Math.sin(t)*r});
    }
    return {pts,closed:false};
  }
  if(key==='pillars') return {pts:_rotPts(o.x,o.y,o.width||500,o.height||500,o.rotation),closed:true};
  if(key==='openings') return {pts:_rotPts(o.x,o.y,o.width_mm||900,o.depth_mm||200,o.angle),closed:true};
  if(key==='texts') return {pts:[{x:o.x,y:o.y}],closed:false};
  // 라이브러리 객체 — 실제 크기(회전 반영) 사각형
  const def=_libDefForSel(key,o);
  if(def){
    const w=def.w||def.size||300;
    const h=def.h||def.crossH||def.size||300;
    return {pts:_rotPts(o.x,o.y,w,h,o.angle),closed:true};
  }
  return {pts:[{x:o.x,y:o.y}],closed:false};
}
// v5.3: 박스 선택 종료 — 박스 안 객체들 boxSelection에 추가
function finishBoxSelection(){
  if(!drawState||drawState.type!=='box') return;
  const s=drawState.start, c=drawState.current;
  const x1=Math.min(s.x,c.x), y1=Math.min(s.y,c.y);
  const x2=Math.max(s.x,c.x), y2=Math.max(s.y,c.y);
  const isCrossing=c.x<s.x; // 우→좌 = crossing
  const inBox=(p)=>p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2;
  // 2026-08-27: AutoCAD 판정 — Window=완전 포함 / Crossing=조금이라도 걸치면 (대표 지시)
  const hit=(key,o)=>{
    const g=_boxSelGeom(key,o);
    if(!g||!g.pts||!g.pts.length) return false;
    if(!isCrossing) return g.pts.every(inBox);          // Window
    if(g.pts.some(inBox)) return true;                  // Crossing — 점이 박스 안
    const n=g.pts.length, last=g.closed?n:n-1;
    for(let i=0;i<last;i++){                            // Crossing — 변이 박스를 관통
      const a=g.pts[i], b=g.pts[(i+1)%n];
      if(_segRectHit(a.x,a.y,b.x,b.y,x1,y1,x2,y2)) return true;
    }
    // Crossing — 박스가 도형(공간·가구 등) 안에 완전히 들어간 경우
    if(g.closed&&typeof ptInPoly==='function'&&ptInPoly({x:x1,y:y1},g.pts)) return true;
    return false;
  };
  const tests={
    walls:o=>hit('walls',o), spaces:o=>hit('spaces',o), openings:o=>hit('openings',o),
    furniture:o=>hit('furniture',o), fixtures:o=>hit('fixtures',o), lights:o=>hit('lights',o),
    electric:o=>hit('electric',o), texts:o=>hit('texts',o), measures:o=>hit('measures',o),
    circles:o=>hit('circles',o), arcs:o=>hit('arcs',o), hvac:o=>hit('hvac',o),
    leaders:o=>hit('leaders',o), curves:o=>hit('curves',o), pillars:o=>hit('pillars',o),
    // 무한 안내선: 길이가 무한이라 Window 로는 절대 포함될 수 없음 → Crossing 에서 관통 판정만
    xlines:xl=>{
      if(!isCrossing) return false;
      const dx=xl.x2-xl.x1, dy=xl.y2-xl.y1;
      let pos=0,neg=0;
      [[x1,y1],[x2,y1],[x2,y2],[x1,y2]].forEach(([cx,cy])=>{const sg=(cx-xl.x1)*dy-(cy-xl.y1)*dx;if(sg>0.001)pos++;else if(sg<-0.001)neg++;});
      return pos>0&&neg>0;
    },
  };
  const map={walls:'wall',spaces:'space',openings:'opening',furniture:'furniture',fixtures:'fixtures',lights:'lights',electric:'electric',texts:'texts',measures:'measures',circles:'circles',arcs:'arcs',hvac:'hvac',leaders:'leaders',xlines:'xlines',curves:'curves',pillars:'pillars'};
  let added=0;
  Object.entries(tests).forEach(([key,fn])=>{
    STATE[key].forEach(o=>{if(fn(o)){STATE.boxSelection.push({kind:map[key],id:o.id});added++;}});
  });
  // 중복 제거
  const seen=new Set();
  STATE.boxSelection=STATE.boxSelection.filter(b=>{const k=b.kind+':'+b.id;if(seen.has(k))return false;seen.add(k);return true;});
  // v5.9: 공간 2개+ 선택되면 Boolean 메뉴 안내
  const spCount=STATE.boxSelection.filter(b=>b.kind==='space').length;
  const msg=STATE.boxSelection.length+'개 선택됨'+(isCrossing?' (Crossing)':' (Window)')+(spCount>=2?' — 우클릭으로 Boolean 메뉴':'');
  cmdToast(msg);
  renderAll();refreshUI();
}
// v5.3: 다중 삭제
function deleteBoxSelection(){
  if(STATE.boxSelection.length===0) return false;
  const groups2={wall:'walls',space:'spaces',opening:'openings',furniture:'furniture',fixtures:'fixtures',lights:'lights',electric:'electric',texts:'texts',measures:'measures',circles:'circles',arcs:'arcs',hvac:'hvac',leaders:'leaders',xlines:'xlines',curves:'curves',pillars:'pillars'};
  // 2026-08-24: 잠금 강화 — 잠긴 객체는 삭제 대상에서 제외 (대표 지시)
  const _lockedSkip=STATE.boxSelection.filter(b=>{
    const arr=STATE[groups2[b.kind]];const o=arr&&arr.find(x=>x.id===b.id);return o&&o.locked;
  }).length;
  STATE.boxSelection=STATE.boxSelection.filter(b=>{
    const arr=STATE[groups2[b.kind]];const o=arr&&arr.find(x=>x.id===b.id);return !(o&&o.locked);
  });
  if(STATE.boxSelection.length===0){cmdToast('잠금된 객체 — 삭제 불가 ('+_lockedSkip+'개)');return true;}
  STATE.boxSelection.forEach(b=>{
    const arrName=groups2[b.kind];
    if(!arrName) return;
    if(b.kind==='space'){
      STATE.spaces=STATE.spaces.filter(x=>x.id!==b.id);
      STATE.openings=STATE.openings.filter(o=>o.spaceId!==b.id);
      // 공간 소유 벽도 함께 제거
      STATE.walls=STATE.walls.filter(w=>w.spaceId!==b.id);
      // 자식 라이브러리 객체도 함께 제거
      ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
        STATE[k]=STATE[k].filter(o=>o.spaceId!==b.id);
      });
    }else{
      STATE[arrName]=STATE[arrName].filter(x=>x.id!==b.id);
    }
  });
  const n=STATE.boxSelection.length;
  STATE.boxSelection=[];
  saveHistory();renderAll();refreshUI();
  cmdToast(n+'개 삭제'+(_lockedSkip?' (잠금 '+_lockedSkip+'개 제외)':''));
  return true;
}

// v5.3+v5.4: 트림 — 벽·공간·원 모두 지원, 깨지면 도형 분해
function handleTrim(pos){
  // Boolean 메뉴가 열려있으면 트림 무시 (메뉴 버튼 클릭 중)
  const bm=document.getElementById('bool-menu');
  if(bm&&bm.style.display==='flex') return;
  const mm=getMm(pos);

  // v5.9: 벽이 300mm 이내면 공간 내부 클릭이어도 벽 트림 우선 — 공간 안 내부 칸막이 트림 가능
  let _nearWallD=Infinity;
  STATE.walls.forEach(w=>{
    const d=pointToSegmentDist(mm,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<_nearWallD)_nearWallD=d;
  });

  // ====== 면 트림: 클릭한 공간 = 상위(커터) → Boolean 메뉴 표시 ======
  const faceSp=_nearWallD<=300?null:[...STATE.spaces].reverse().find(s=>ptInPoly(mm,s.polygon));
  if(faceSp){
    // 겹치는 하위 공간 수집 (faceSp 안에 포함되거나 겹치는 것 모두)
    const lowers=STATE.spaces.filter(s=>{
      if(s.id===faceSp.id) return false;
      return suthHodg(s.polygon,faceSp.polygon).length>=3&&
        (ptInPoly(mm,s.polygon)||s.polygon.every(p=>ptInPoly(p,faceSp.polygon)));
    });
    cmdToast('Boolean 연산은 공간 2개+ 선택 후 우클릭으로 이전됨');
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
  if(target.locked){cmdToast('잠금된 객체 — 트림 불가');return;} // 2026-08-24

  // ====== 벽 트림 (기존 v5.3 로직) ======
  if(kind==='wall'){
    const intersections=collectWallIntersections(target);
    if(intersections.length===0){
      // v5.9 fix: 벽 자동 분할(v5.8+) 도입 후 내부 교차가 있는 벽이 거의 없어 트림이 무동작이던 버그.
      // 끝점이 다른 벽과 공유된 조각(=절단선 사이 구간)이면 그 조각 자체를 제거 — AutoCAD 트림 의미론.
      const sharesVertex=vid=>STATE.walls.some(w=>w.id!==target.id&&(w.v1Id===vid||w.v2Id===vid));
      if(('v1Id' in target)&&(sharesVertex(target.v1Id)||sharesVertex(target.v2Id))){
        STATE.walls=STATE.walls.filter(w=>w.id!==target.id);
        cleanupOrphanVertices();
        saveHistory();renderAll();refreshUI();
        cmdToast('벽 트림 — 교차 조각 제거');
        return;
      }
      cmdToast('교차하는 다른 선분 없음');return;
    }
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
    cmdToast('Boolean 연산은 공간 2개+ 선택 후 우클릭으로 이전됨');
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
// 2026-08-23: 공간의 공유 vertex 분리 — sp 의 vertexIds 중 (keepIds 세트 밖의) 다른 공간·타 소속 벽과
//  공유된 것을 복제해 sp 와 sp 소속 벽만 새 vertex 를 쓰게 한다. 이웃이 함께 끌려오지 않게 하는 핵심.
function _detachSharedSpaceVerts(sp,keepIds){
  sp.vertexIds=sp.vertexIds.map(vid=>{
    const shared=STATE.spaces.some(s=>s.id!==sp.id&&!(keepIds&&keepIds.has(s.id))&&s.vertexIds&&s.vertexIds.includes(vid))
               ||STATE.walls.some(w=>w.spaceId!==sp.id&&!(keepIds&&w.spaceId&&keepIds.has(w.spaceId))&&(w.v1Id===vid||w.v2Id===vid));
    if(!shared) return vid;
    const v=STATE.vertices.find(x=>x.id===vid);
    if(!v) return vid;
    const nv={id:makeId('v'),x:v.x,y:v.y};
    STATE.vertices.push(nv);
    STATE.walls.forEach(w=>{
      if(w.spaceId!==sp.id) return;
      if(w.v1Id===vid) w.v1Id=nv.id;
      if(w.v2Id===vid) w.v2Id=nv.id;
    });
    return nv.id;
  });
}
window._detachSharedSpaceVerts=_detachSharedSpaceVerts;

let offsetState=null; // {distance, target?}
function handleOffsetClick(pos){
  const mm=getMm(pos);
  if(!offsetState?.distance){
    enterCmdMode('offset-d',{},'옵셋 거리(mm):','거리 Enter → 객체 클릭 → 방향 클릭'+(STATE._lastOffsetDist?' (Enter만=이전 '+STATE._lastOffsetDist+'mm)':''));
    if(STATE._lastOffsetDist) _prefillCmdInput(STATE._lastOffsetDist);
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
    // v5.9: 무한 안내선도 옵셋 대상 — 점에서 직선까지 수직거리
    (STATE.xlines||[]).forEach(xl=>{
      const dx=xl.x2-xl.x1, dy=xl.y2-xl.y1, len=Math.hypot(dx,dy)||1;
      const d=Math.abs((mm.x-xl.x1)*dy-(mm.y-xl.y1)*dx)/len;
      if(d<minD){minD=d;best={kind:'xline',obj:xl};}
    });
    if(!best){cmdToast('옵셋할 객체 가까이 클릭 (벽/선/원/안내선)');return;}
    offsetState.target=best;
    drawGroup.destroyChildren();
    const lbl=best.kind==='xline'?'안내선':best.kind==='circle'?'원':(best.obj.isLine?'선':'벽');
    cmdToast(lbl+' 선택 — 방향을 클릭하세요 (거리: '+offsetState.distance+'mm)');
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
  }else if(t.kind==='xline'){
    // 무한 안내선 → 평행 안내선 (두 점을 법선 방향으로 dist만큼 평행 이동)
    const xl=t.obj;
    const dx=xl.x2-xl.x1, dy=xl.y2-xl.y1, len=Math.hypot(dx,dy);
    if(len<1){offsetState.target=null;return;}
    const nx=-dy/len, ny=dx/len;
    const sgn=Math.sign((mm.x-xl.x1)*nx+(mm.y-xl.y1)*ny)||1;
    const ox=nx*sgn*dist, oy=ny*sgn*dist;
    addXline(xl.x1+ox, xl.y1+oy, xl.x2+ox, xl.y2+oy);
    cmdToast('안내선 옵셋 '+dist+'mm — 다음 객체 클릭 (Esc=종료)');
  }
  // 2026-08-22: 대표 지시 2번 — 옵셋은 매회 거리부터 다시 입력 (직전 값이 프리필되어 Enter만 치면 재사용)
  STATE._lastOffsetDist=dist;
  offsetState=null;
  drawGroup.destroyChildren();previewLayer.batchDraw();
  enterCmdMode('offset-d',{},'옵셋 거리(mm):','거리 입력 후 Enter → 객체 클릭 → 방향 클릭 (Enter만=이전 '+dist+'mm)');
  _prefillCmdInput(dist);
}
// 명령창 프리필 — enterCmdMode 의 0ms 클리어 이후에 값 주입
function _prefillCmdInput(v){
  setTimeout(()=>{
    const inp=document.getElementById('cmd-input');
    if(inp&&STATE.cmdMode==='offset-d'){inp.value=String(v);try{inp.select();}catch(e){}}
  },25);
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
    let cnt=0, lockedSkip=0;
    targets.forEach(t=>{
      const obj=getArr(t.kind)?.find(o=>o.id===t.id);
      if(!obj) return;
      if(obj.locked){lockedSkip++;return;} // 2026-08-27: 잠긴 객체는 미러 복사 제외 (대표 지시)
      const copy=JSON.parse(JSON.stringify(obj));
      copy.id=makeId(t.kind.charAt(0));
      copy.locked=false; // 2026-08-24: 사본은 잠금 해제로 생성 — 잠금은 원본 보호 목적, 사본은 편집 대상 (대표 지시)
      mirrorObject(copy,mirrorState.p1,mirrorState.p2);
      const arrName={wall:'walls',space:'spaces',opening:'openings',furniture:'furniture',fixtures:'fixtures',lights:'lights',electric:'electric',texts:'texts',measures:'measures',circles:'circles',arcs:'arcs',hvac:'hvac'}[t.kind];
      if(arrName) STATE[arrName].push(copy);
      cnt++;
    });
    saveHistory();renderAll();refreshUI();
    cmdToast(cnt?('미러 — '+cnt+'개 복제'+(lockedSkip?' (잠금 '+lockedSkip+'개 제외)':'')):'잠금된 객체 — 미러 불가');
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
    // v5.9 fix: id 복제 방지 — 분할 조각은 새 id
    STATE.walls.push(makeWallVEF(target.v1Id,bv.id,{...target,id:undefined}));
    STATE.walls.push(makeWallVEF(bv.id,target.v2Id,{...target,id:undefined}));
  }else{
    const sv1=ensureVertex(target.x1,target.y1);
    const sv2=ensureVertex(target.x2,target.y2);
    STATE.walls.push(makeWallVEF(sv1.id,bv.id,{...target,id:undefined}));
    STATE.walls.push(makeWallVEF(bv.id,sv2.id,{...target,id:undefined}));
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
  // v5.9: 무한 안내선 — 점에서 직선까지 수직거리
  (STATE.xlines||[]).forEach(xl=>{
    const dx=xl.x2-xl.x1, dy=xl.y2-xl.y1, len=Math.hypot(dx,dy)||1;
    tryHit('xlines',xl,Math.abs((mm.x-xl.x1)*dy-(mm.y-xl.y1)*dx)/len);
  });

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
      STATE.walls.push(makeWallVEF(v1.id,v2.id,{layerName:layer,spaceId:space.id,thickness:STATE.wallThickness}));
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
  // 참고: clip이 subject에 완전 포함되는 케이스는 subtractSelectedSpaces에서 holes 배열로 따로 처리
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
// v5.9: 선택된 인접 공간들을 공유 변 기준으로 합침
function mergeAdjacentSpaces(){
  const ids=STATE.boxSelection.length>0
    ? STATE.boxSelection.filter(b=>b.kind==='space').map(b=>b.id)
    : (STATE.selectedKind==='space'&&STATE.selectedId?[STATE.selectedId]:[]);
  if(ids.length<2){cmdToast('공간 두 개 이상 선택 필요');return;}
  if(ids.some(id=>{const sp=STATE.spaces.find(s=>s.id===id);return sp&&sp.locked;})){cmdToast('잠금된 공간 포함 — 병합 불가');return;} // 2026-08-24
  const TOL=60;
  // 두 폴리곤에서 평행 + 겹치는 변 찾기 (변 길이 차이 / 분할 모두 허용)
  function findSharedEdge(A,B){
    for(let ai=0;ai<A.polygon.length;ai++){
      const a1=A.polygon[ai], a2=A.polygon[(ai+1)%A.polygon.length];
      const aDx=a2.x-a1.x, aDy=a2.y-a1.y;
      const aLen=Math.hypot(aDx,aDy);
      if(aLen<1) continue;
      const aUx=aDx/aLen, aUy=aDy/aLen;
      for(let bi=0;bi<B.polygon.length;bi++){
        const b1=B.polygon[bi], b2=B.polygon[(bi+1)%B.polygon.length];
        const bDx=b2.x-b1.x, bDy=b2.y-b1.y;
        const bLen=Math.hypot(bDx,bDy);
        if(bLen<1) continue;
        // 평행 검사 (외적 ≈ 0)
        const cross=aDx*bDy-aDy*bDx;
        if(Math.abs(cross)>aLen*bLen*0.05) continue;
        // 동일 직선 검사 (b1이 a 직선 위에 있는지, 수직 거리)
        const perp=Math.abs((b1.x-a1.x)*aUy-(b1.y-a1.y)*aUx);
        if(perp>TOL) continue;
        // a 방향 투영 t값 (a1=0, a2=aLen 기준)
        const t1=(b1.x-a1.x)*aUx+(b1.y-a1.y)*aUy;
        const t2=(b2.x-a1.x)*aUx+(b2.y-a1.y)*aUy;
        const tMin=Math.min(t1,t2), tMax=Math.max(t1,t2);
        const ovStart=Math.max(0,tMin), ovEnd=Math.min(aLen,tMax);
        if(ovEnd-ovStart<TOL) continue; // 의미 있는 겹침 부족
        return {
          P1:{x:Math.round(a1.x+aUx*ovStart),y:Math.round(a1.y+aUy*ovStart)},
          P2:{x:Math.round(a1.x+aUx*ovEnd),  y:Math.round(a1.y+aUy*ovEnd)}
        };
      }
    }
    return null;
  }
  let safety=20;
  while(safety-->0){
    const spaces=ids.map(id=>STATE.spaces.find(s=>s.id===id)).filter(Boolean);
    if(spaces.length<2) break;
    let pair=null, overlapPair=null;
    outer: for(let i=0;i<spaces.length;i++){
      for(let j=i+1;j<spaces.length;j++){
        const A=spaces[i], B=spaces[j];
        const shared=findSharedEdge(A,B);
        if(shared){pair={A,B,P1:shared.P1,P2:shared.P2,mode:'edge'};break outer;}
        // 인접 변이 없으면 겹침(중첩) 검사 — 폴백
        if(!overlapPair){
          const inter=suthHodg(A.polygon,B.polygon);
          if(inter&&inter.length>=3) overlapPair={A,B,mode:'overlap'};
        }
      }
    }
    if(!pair&&overlapPair) pair=overlapPair;
    if(!pair){
      if(safety>=19) cmdToast('인접·겹침 공간이 없음 — 변 공유 또는 중첩 필요');
      break;
    }
    let merged;
    if(pair.mode==='edge'){
      merged=mergeSpacesBySharedEdge(pair.A.polygon,pair.B.polygon,pair.P1,pair.P2,TOL);
    }else{
      // 겹침 합집합 (polyUnion)
      merged=polyUnion(pair.A.polygon,pair.B.polygon);
      if(merged) merged=simplifySpacePoly(merged.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})));
    }
    if(!merged||merged.length<3){cmdToast('병합 실패 — 결과 폴리곤 무효');break;}
    // A의 vertexIds 갱신, B 삭제, B의 자식 객체들을 A로 이전
    pair.A.vertexIds=polygonToVertexIds(merged);
    ['openings','furniture','fixtures','lights','electric','hvac'].forEach(k=>{
      STATE[k].forEach(o=>{if(o.spaceId===pair.B.id) o.spaceId=pair.A.id;});
    });
    STATE.walls=STATE.walls.filter(w=>w.spaceId!==pair.A.id&&w.spaceId!==pair.B.id);
    STATE.spaces=STATE.spaces.filter(s=>s.id!==pair.B.id);
    // A 새 폴리곤으로 벽 재생성
    const wallLayer=(pair.A.layerName||'A-AREA').replace('AREA','WALL');
    const dmWall=pair.A.wallMaterial||'GYPSUM';
    const N=pair.A.vertexIds.length;
    for(let i=0;i<N;i++){
      const aId=pair.A.vertexIds[i], bId=pair.A.vertexIds[(i+1)%N];
      STATE.walls.push(makeWallVEF(aId,bId,{layerName:wallLayer,spaceId:pair.A.id,finishMaterial:dmWall}));
    }
    // ids 갱신 (B 제거)
    const idx=ids.indexOf(pair.B.id);
    if(idx>=0) ids.splice(idx,1);
    cleanupOrphanVertices();
  }
  STATE.boxSelection=[];
  STATE.selectedKind='space';STATE.selectedId=ids[0]||null;
  saveHistory();renderAll();refreshUI();
  cmdToast('병합 완료');
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
      // 2026-08-27: AutoCAD 관례 — Crossing(우→좌)=초록 점선 / Window(좌→우)=파랑 실선
      fill:isCrossing?'#7BA05B1F':'#5BA0D414',
      stroke:isCrossing?'#7BA05B':'#5BA0D4',
      strokeWidth:1.4,dash:isCrossing?[6,4]:[]
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
  // v5.9: 선/곡선 미리보기 — 또렷한 점선
  if(drawState.type==='arc'){
    const s=drawState.start, p=drawState.current||drawState.start;
    let endMm=p; endMm=applyOrtho(s,endMm);
    const x1=STATE.offsetX+mmToPx(s.x), y1=STATE.offsetY+mmToPx(s.y);
    const x2=STATE.offsetX+mmToPx(endMm.x), y2=STATE.offsetY+mmToPx(endMm.y);
    const prevColor='#A8D870';
    // 외곽 글로우 (어두운 배경에서 또렷하게)
    drawGroup.add(new Konva.Line({points:[x1,y1,x2,y2],stroke:prevColor,strokeWidth:7,opacity:0.2,lineCap:'round'}));
    // 본 점선
    drawGroup.add(new Konva.Line({points:[x1,y1,x2,y2],stroke:prevColor,strokeWidth:3,opacity:1,
      lineCap:'butt',dash:[12,5],
      shadowColor:prevColor,shadowBlur:6,shadowOpacity:0.6}));
    const d=Math.hypot(endMm.x-s.x,endMm.y-s.y);
    if(d>20){
      drawGroup.add(new Konva.Text({x:(x1+x2)/2-50,y:(y1+y2)/2-8,text:Math.round(d)+' mm',
        width:100,align:'center',fontSize:12,fontFamily:'JetBrains Mono',fontStyle:'bold',fill:'#FFE066',
        shadowColor:'#000',shadowBlur:3,shadowOpacity:0.8}));
    }
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
  }else if(drawState.type==='xline'){
    // 무한 안내선 미리보기 — 방향으로 화면 끝까지 연장
    const ax=STATE.offsetX+mmToPx(drawState.start.x),ay=STATE.offsetY+mmToPx(drawState.start.y);
    const bx=STATE.offsetX+mmToPx(drawState.current.x),by=STATE.offsetY+mmToPx(drawState.current.y);
    let dx=bx-ax,dy=by-ay;const len=Math.hypot(dx,dy);
    drawGroup.add(new Konva.Circle({x:ax,y:ay,radius:3,fill:'#4FC3D9'}));
    if(len>0.5){
      dx/=len;dy/=len;const EXT=(stage.width()+stage.height())*4;const cx=(ax+bx)/2,cy=(ay+by)/2;
      drawGroup.add(new Konva.Line({points:[cx-dx*EXT,cy-dy*EXT,cx+dx*EXT,cy+dy*EXT],stroke:'#4FC3D9',strokeWidth:0.8,opacity:0.8,dash:[8,4]}));
    }
  }
  previewLayer.batchDraw();
}


function initTools(){
// ===== 마우스 =====
let mouseDownPos=null,isMouseDown=false,isPanning=false,panStart=null;
let dragMoveState=null; // v5.4: {kind,id,startMm,baseObj}
// 2026-08-19 태블릿: 터치 직후 브라우저가 합성하는 호환 마우스 이벤트(mousedown/mousemove/mouseup)는 무시
//  (한 번 탭이 touchend + mouseup 두 번으로 들어와 안내선이 탭 즉시 생성되던 문제)
let _lastTouchEvtAt=0;
function _isCompatMouse(e){
  const t=(e&&e.evt&&e.evt.type)||'';
  if(t.indexOf('touch')===0){_lastTouchEvtAt=performance.now();return false;}
  return t.indexOf('mouse')===0&&(performance.now()-_lastTouchEvtAt)<700;
}
function _isTouchEvt(e){return !!(e&&e.evt&&e.evt.type&&e.evt.type.indexOf('touch')===0);}
stage.on('mousedown touchstart',e=>{
  if(_isCompatMouse(e)) return;
  const pos=stage.getPointerPosition();if(!pos) return;
  // v5.9: 우클릭은 mousedown 처리 스킵 (contextmenu 핸들러가 처리하도록)
  if(e.evt&&e.evt.button===2) return;
  mouseDownPos=pos;isMouseDown=true;
  const isMiddleClick=e.evt&&e.evt.button===1; // v5.5: 휠클릭 패닝
  if(isMiddleClick||STATE.selectedTool==='pan'){isPanning=true;panStart={x:pos.x,y:pos.y};if(e.evt) e.evt.preventDefault();return;}
  if(STATE.selectedTool==='rect') startRect(pos);
  else if(STATE.selectedTool==='circlespace') startCircleSpace(pos);
  // v5.5: wall은 mousedown으로 시작 안 함 (클릭+클릭 모드만)
  else if(STATE.selectedTool==='circle') startCircle(pos);
  // v5.9: arc 도구는 mousedown으로 시작 안 함 (클릭+클릭 2-click 모드)
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
          const isAlt=!!(e.evt&&e.evt.altKey)||!!STATE.altLatched; // 2026-08-19: 퀵바 ⎇ Alt 고정 (태블릿 드래그 복제)
          const isShift=!!(e.evt&&e.evt.shiftKey);
          // v5.9: Shift+객체 클릭 — 박스 선택 토글 (드래그/이동 안 함, click 이벤트가 selectObj 처리)
          if(isShift){return;}
          // v5.9: 클릭 객체가 박스 선택에 포함돼 있으면 다중 드래그 (boxSelection 유지)
          const isInBox=STATE.boxSelection&&STATE.boxSelection.length>1&&
                        STATE.boxSelection.some(b=>b.kind===found.kind&&b.id===found.id);
          // 2026-08-27: Alt + 다중 선택 → 선택한 객체 전부 복사 후 함께 드래그 (대표 지시)
          if(isInBox&&isAlt){
            const copies=altCopyBoxSelection();
            if(copies.length){
              STATE.boxSelection=copies.map(c=>({kind:c.kind,id:c.id}));
              STATE.selectedKind=null;STATE.selectedId=null;
              dragMoveState={kind:'multi',items:copies,startMm:rawMm(pos),altCopy:true};
              if(STATE.altLatched){STATE.altLatched=false;if(typeof refreshTouchQuickBar==='function') refreshTouchQuickBar();}
              cmdToast(copies.length+'개 복사 — 드래그로 위치 지정');
            }
            renderAll();refreshUI();
            return;
          }
          if(isInBox&&!isAlt){
            // 다중 드래그: 박스선택 모든 객체 base 캡처
            // v5.9: 클릭한 객체가 잠긴 경우 드래그 시작 안 함 (잠긴 항목은 applyDragMove에서 자동 스킵)
            if(found.obj.locked){
              renderAll();refreshUI();
              return;
            }
            STATE.selectedKind=found.kind;STATE.selectedId=found.id;
            // 2026-08-23: 다중 드래그도 공유 vertex 분리 (선택 세트 밖 공간·벽과의 공유만) — 대표 지시 9번 보강
            const _keep=new Set(STATE.boxSelection.filter(b=>b.kind==='space').map(b=>b.id));
            STATE.boxSelection.forEach(b=>{
              if(b.kind!=='space') return;
              const sp=STATE.spaces.find(x=>x.id===b.id);
              if(sp&&sp.vertexIds) _detachSharedSpaceVerts(sp,_keep);
            });
            const items=STATE.boxSelection.map(b=>{
              const arr=getArr(b.kind);
              const obj=arr?arr.find(o=>o.id===b.id):null;
              if(!obj) return null;
              return{
                kind:b.kind,id:b.id,
                baseObj:JSON.parse(JSON.stringify(obj)),
                contained:b.kind==='space'?_captureContained(b.id):null,
              };
            }).filter(Boolean);
            dragMoveState={kind:'multi',items:items,startMm:rawMm(pos)};
            renderAll();refreshUI();
            return; // 단일 드래그 분기 스킵
          }
          // 2026-08-22: 터치·펜 — 처음 누른 객체는 "선택만" 하고 이동하지 않는다 (대표 지시 8번)
          //  이동하려면 이미 선택된 객체를 다시 눌러 드래그. 오터치로 선·버텍스가 밀리는 문제 방지.
          const viaTouchSel=STATE.touch&&STATE.touch.enabled&&STATE.touch.lastType!=='mouse';
          const wasSelected=STATE.selectedKind===found.kind&&STATE.selectedId===found.id;
          if(viaTouchSel&&!wasSelected&&!isAlt){
            STATE.selectedKind=found.kind;STATE.selectedId=found.id;STATE.boxSelection=[];
            renderAll();refreshUI();
            return;
          }
          STATE.selectedKind=found.kind;STATE.selectedId=found.id;
          STATE.boxSelection=[];
          // v5.9: 잠금된 객체는 드래그 시작 안 함 (선택만 됨)
          if(found.obj.locked&&!isAlt){
            renderAll();refreshUI();
            return;
          }
          if(isAlt){
            // Alt+드래그: 복사본 생성 후 복사본을 드래그 (원본 제자리)
            // 2026-08-27: 잠긴 객체는 복사 자체를 막는다 (대표 지시)
            if(found.obj.locked){
              cmdToast('잠금된 객체 — 복사 불가');
              renderAll();refreshUI();
              return;
            }
            const copy=altCopyObj(found.kind,found.obj);
            if(copy){
              STATE.selectedKind=found.kind;STATE.selectedId=copy.id;
              dragMoveState={kind:found.kind,id:copy.id,startMm:rawMm(pos),baseObj:JSON.parse(JSON.stringify(copy)),altCopy:true,
                contained:found.kind==='space'?_captureContained(copy.id):null};
              if(STATE.altLatched){STATE.altLatched=false;if(typeof refreshTouchQuickBar==='function') refreshTouchQuickBar();}
            }
          }else{
            // 공간 드래그 시작: 공유 vertex 분리 (이동 오염 방지) — 2026-08-23 헬퍼로 추출, 다중 드래그와 공용
            if(found.kind==='space'&&found.obj.vertexIds) _detachSharedSpaceVerts(found.obj,null);
            dragMoveState={kind:found.kind,id:found.id,startMm:rawMm(pos),baseObj:JSON.parse(JSON.stringify(found.obj)),
              contained:found.kind==='space'?_captureContained(found.id):null};
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
  // 2026-08-27: 잠긴 객체는 선택돼 있어도 복사 금지 (대표 지시) — 모든 복사 경로의 중앙 가드
  if(obj&&obj.locked) return null;
  const raw=JSON.parse(JSON.stringify(obj));
  raw.id=makeId(kind.charAt(0));
  raw.locked=false; // 2026-08-24: 사본은 잠금 해제로 생성 (잠긴 사본이 원본 위에 고정되던 버그 수정)
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
      wraw.locked=false; // 2026-08-24: 사본 벽도 잠금 해제
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

// 2026-08-27: Alt+드래그 복사 — 박스 선택 전체를 한 번에 복사 (대표 지시)
//  공간이 함께 선택돼 있으면 그 공간 소속 벽은 altCopyObj(space) 가 이미 복사하므로 건너뛴다(중복 방지).
function altCopyBoxSelection(){
  const sel=(STATE.boxSelection||[]).slice();
  if(!sel.length) return [];
  const spaceIds=new Set(sel.filter(b=>b.kind==='space').map(b=>b.id));
  const items=[];
  let lockedSkipped=0;
  sel.forEach(b=>{
    const arr=getArr(b.kind); const obj=arr?arr.find(o=>o.id===b.id):null;
    if(!obj) return;
    if(obj.locked){lockedSkipped++;return;} // 2026-08-27: 잠긴 객체 제외 (대표 지시)
    if(b.kind==='wall'&&obj.spaceId&&spaceIds.has(obj.spaceId)) return; // 공간 사본에 포함됨
    const cp=altCopyObj(b.kind,obj);
    if(!cp) return;
    items.push({kind:b.kind,id:cp.id,baseObj:JSON.parse(JSON.stringify(cp)),
      contained:b.kind==='space'?_captureContained(cp.id):null});
  });
  if(lockedSkipped&&typeof cmdToast==='function'){
    cmdToast(items.length?('잠금 '+lockedSkipped+'개 제외 — '+items.length+'개만 복사'):'잠금된 객체 — 복사 불가');
  }
  return items;
}
// Alt 사본 일괄 제거 (제자리 클릭·제스처 취소 시) — 단일/다중 공용
function _removeAltCopies(state){
  if(!state||!state.altCopy) return 0;
  const list=(state.kind==='multi'&&Array.isArray(state.items))
    ? state.items.map(it=>({kind:it.kind,id:it.id}))
    : [{kind:state.kind,id:state.id}];
  let n=0;
  list.forEach(function(t){
    const arr=getArr(t.kind); if(!arr) return;
    if(t.kind==='space') STATE.walls=STATE.walls.filter(w=>w.spaceId!==t.id);
    const idx=arr.findIndex(o=>o.id===t.id);
    if(idx>=0){arr.splice(idx,1);n++;}
  });
  if(typeof cleanupOrphanVertices==='function') cleanupOrphanVertices();
  STATE.boxSelection=[];STATE.selectedKind=null;STATE.selectedId=null;
  return n;
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
    {arr:STATE.leaders,kind:'leaders'},
    {arr:STATE.xlines||[],kind:'xlines'},        // v5.9: 무한 안내선
    {arr:STATE.curves||[],kind:'curves'},        // v5.9: 자유곡선
    {arr:STATE.pillars||[],kind:'pillars'},      // v5.9: 기둥
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
  if(dragMoveState&&isMouseDown&&dragMoveState.moved){
    const rmm=rawMm(cur);
    const dx2=rmm.x-dragMoveState.startMm.x, dy2=rmm.y-dragMoveState.startMm.y;
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
// v5.9: 방향키 미세이동 — 선택된 객체(들)을 dx/dy mm 만큼 이동
function _nudgeSelected(dx,dy){
  const itemsRaw=STATE.boxSelection&&STATE.boxSelection.length>0
    ? STATE.boxSelection.slice()
    : (STATE.selectedKind&&STATE.selectedId?[{kind:STATE.selectedKind,id:STATE.selectedId}]:[]);
  if(itemsRaw.length===0) return false;
  // v5.9: 잠금된 객체 제외
  const items=itemsRaw.filter(({kind,id})=>{
    const arr=getArr(kind); if(!arr) return false;
    const obj=arr.find(o=>o.id===id);
    return obj&&!obj.locked;
  });
  if(items.length===0){cmdToast('잠금된 객체 — 이동 불가');return true;}
  // 공유 vertex 중복이동 방지: 모든 vertex 이동을 한 번에 처리
  const vertexShifts=new Map(); // vid → {dx,dy}
  const containedShifts=[]; // {arrKey,id,dx,dy}
  items.forEach(({kind,id})=>{
    const arr=getArr(kind); if(!arr) return;
    const obj=arr.find(o=>o.id===id); if(!obj) return;
    if('v1Id' in obj){
      vertexShifts.set(obj.v1Id,{dx,dy});
      vertexShifts.set(obj.v2Id,{dx,dy});
    } else if('vertexIds' in obj){
      obj.vertexIds.forEach(vid=>vertexShifts.set(vid,{dx,dy}));
      // 도넛 hole도 함께 이동
      if(obj.holes&&obj.holes.length){
        obj.holes=obj.holes.map(h=>h.map(p=>({x:p.x+dx,y:p.y+dy})));
      }
      // 공간 안의 자식 객체들도 함께 이동
      ['openings','furniture','fixtures','lights','electric','hvac'].forEach(k=>{
        STATE[k].forEach(o=>{
          if(o.spaceId===id) containedShifts.push({arrKey:k,id:o.id,dx,dy});
        });
      });
    } else if('x' in obj){
      obj.x+=dx; obj.y+=dy;
    } else if('x1' in obj){
      obj.x1+=dx; obj.y1+=dy; obj.x2+=dx; obj.y2+=dy;
    } else if('segments' in obj){
      // 곡선: 모든 segment의 P0, P1, P2, P3 이동
      obj.segments.forEach(s=>{
        s.p0={x:s.p0.x+dx,y:s.p0.y+dy};
        s.p1={x:s.p1.x+dx,y:s.p1.y+dy};
        s.p2={x:s.p2.x+dx,y:s.p2.y+dy};
        s.p3={x:s.p3.x+dx,y:s.p3.y+dy};
      });
    }
  });
  // vertex 이동 (한 vertex당 한 번만)
  vertexShifts.forEach((d,vid)=>{
    const v=STATE.vertices.find(v=>v.id===vid);
    if(v) moveVertex(vid,v.x+d.dx,v.y+d.dy);
  });
  // 자식 객체 이동
  containedShifts.forEach(({arrKey,id,dx,dy})=>{
    const o=STATE[arrKey].find(x=>x.id===id);
    if(o){o.x+=dx; o.y+=dy;}
  });
  saveHistory();
  renderAll();
  refreshUI();
  return true;
}
// v5.9: 공간 드래그 시 함께 따라가야 하는 자식 객체들의 base 위치 캡처
function _captureContained(spaceId){
  const arrs=['openings','furniture','fixtures','lights','electric','hvac'];
  const result={};
  arrs.forEach(k=>{
    result[k]=STATE[k].filter(o=>o.spaceId===spaceId).map(o=>({id:o.id,x:o.x,y:o.y}));
  });
  return result;
}
// v5.9: 선택된 객체(들) 잠금/해제 — 잠긴 객체는 이동·핸들 편집 불가
function applyLockToSelection(locked){
  const items=STATE.boxSelection&&STATE.boxSelection.length>0
    ? STATE.boxSelection.slice()
    : (STATE.selectedKind&&STATE.selectedId?[{kind:STATE.selectedKind,id:STATE.selectedId}]:[]);
  if(items.length===0){cmdToast('선택된 객체 없음');return;}
  let n=0;
  items.forEach(({kind,id})=>{
    const arr=getArr(kind); if(!arr) return;
    const obj=arr.find(o=>o.id===id); if(!obj) return;
    obj.locked=!!locked;
    n++;
  });
  saveHistory();renderAll();refreshUI();
  cmdToast((locked?'잠금':'해제')+' — '+n+'개 객체');
}
// v5.9: 모든 객체 잠금/해제 토글
function lockAllObjects(locked){
  const arrs=['spaces','walls','openings','furniture','fixtures','lights','electric','hvac','texts','measures','circles','arcs','curves','leaders'];
  let n=0;
  arrs.forEach(k=>{(STATE[k]||[]).forEach(o=>{o.locked=!!locked;n++;});});
  saveHistory();renderAll();refreshUI();
  cmdToast((locked?'전체 잠금':'전체 해제')+' — '+n+'개 객체');
}

function applyDragMove(state,dx,dy){
  // v5.9: 다중 선택 일괄 드래그 — items 배열 전체에 동일 delta 적용
  if(state.kind==='multi'&&Array.isArray(state.items)){
    let sx=Math.round(dx), sy=Math.round(dy);
    const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
    if(orthoActive){if(Math.abs(sx)>=Math.abs(sy)) sy=0; else sx=0;}
    state.items.forEach(item=>{
      const arr=getArr(item.kind); if(!arr) return;
      const obj=arr.find(o=>o.id===item.id); if(!obj) return;
      if(obj.locked) return; // v5.9: 잠금된 객체는 이동 안 됨
      const base=item.baseObj;
      if('x' in obj&&'x' in base){obj.x=base.x+sx;obj.y=base.y+sy;}
      if('v1Id' in obj){
        if(base.x1!=null) moveVertex(obj.v1Id,base.x1+sx,base.y1+sy);
        if(base.x2!=null) moveVertex(obj.v2Id,base.x2+sx,base.y2+sy);
      } else if('x1' in base){
        obj.x1=base.x1+sx;obj.y1=base.y1+sy;obj.x2=base.x2+sx;obj.y2=base.y2+sy;
      }
      // 곡선 (Bezier) — segment 점들 이동
      if(obj.segments&&base.segments){
        obj.segments=base.segments.map(s=>({
          p0:{x:s.p0.x+sx,y:s.p0.y+sy},p1:{x:s.p1.x+sx,y:s.p1.y+sy},
          p2:{x:s.p2.x+sx,y:s.p2.y+sy},p3:{x:s.p3.x+sx,y:s.p3.y+sy},
        }));
      }
      if('vertexIds' in obj&&base.polygon){
        obj.vertexIds.forEach((vid,i)=>{const bp=base.polygon[i];if(bp)moveVertex(vid,bp.x+sx,bp.y+sy);});
        // 도넛 hole 이동
        if(base.holes&&base.holes.length){
          obj.holes=base.holes.map(h=>h.map(p=>({x:p.x+sx,y:p.y+sy})));
        }
        if(item.contained){
          Object.entries(item.contained).forEach(([k,arr2])=>{
            const a=STATE[k]; if(!a) return;
            arr2.forEach(saved=>{
              const o=a.find(x=>x.id===saved.id);
              if(o){o.x=saved.x+sx;o.y=saved.y+sy;}
            });
          });
        }
      } else if(base.polygon){
        obj.polygon=base.polygon.map(p=>({x:p.x+sx,y:p.y+sy}));
      }
    });
    return;
  }
  const arr=getArr(state.kind);
  if(!arr) return;
  const obj=arr.find(o=>o.id===state.id);
  if(!obj) return;
  if(obj.locked) return; // v5.9: 잠금된 객체는 드래그 안 됨
  const base=state.baseObj;
  // 2026-08-19: delta 는 순수 커서 기준(rawMm) → 그리드 스냅은 여기서 1회 적용
  let sx=snapMm(dx), sy=snapMm(dy);
  // Shift 직교: F8 OFF+Shift 또는 F8 ON+Shift 미누름 시 수평/수직 이동만 허용
  const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
  if(orthoActive){
    if(Math.abs(sx)>=Math.abs(sy)) sy=0; else sx=0;
  }

  // 2026-08-19: 공간 드래그 스냅 전면 개편 (태블릿 "연결" 불안정 해소)
  //  ① 반경: 화면 px 기준(snapRadiusMm) — 줌아웃·손가락일수록 mm 반경 확대 (기존 200/300mm 고정)
  //  ② 축 분리: X 정렬 후보 / Y 정렬 후보를 따로 골라 합성 → 변-변 맞닿음(flush) + 모서리 연결이 자연스럽게 성립
  //  ③ 우선순위: 모서리-모서리(0) > 점-변(1) > 같은 축 꼭짓점 정렬(2)
  //  ④ 히스테리시스: 한 번 붙으면 해제 반경(1.8배)을 벗어나기 전까지 유지 — 손가락 떨림에 붙었다 떨어졌다 하지 않음
  //  ⑤ 비축정렬(사선) 변은 기존 투영 스냅으로 폴백
  //  ⑥ STATE.dragSnapGuides 로 정렬 가이드 표시 (drawSnapMarker)
  STATE.dragSnapGuides=null;
  if(state.kind==='space' && base.polygon && !STATE.ctrlPressed && STATE.snap.endpoint){
    const r=snapRadiusMm(200), rel=r*1.8;
    const movedPoly=base.polygon.map(p=>({x:p.x+sx,y:p.y+sy}));
    const candX=[],candY=[]; // {d,delta,vi,target,pri}
    STATE.spaces.forEach(s=>{
      if(s.id===obj.id||!s.polygon||s.polygon.length<2) return;
      const n=s.polygon.length;
      movedPoly.forEach((p,vi)=>{
        // 점-점 (같은 축 정렬; 다른 축도 r 안이면 모서리-모서리 = 최우선)
        s.polygon.forEach(o=>{
          const ddx=o.x-p.x, ddy=o.y-p.y, ax=Math.abs(ddx), ay=Math.abs(ddy);
          if(ax<=rel) candX.push({d:ax,delta:ddx,vi,target:o.x,pri:ay<=r?0:2});
          if(ay<=rel) candY.push({d:ay,delta:ddy,vi,target:o.y,pri:ax<=r?0:2});
        });
        // 점-변 (축정렬 변: 변의 범위 ±r 안에 들어온 꼭짓점만)
        for(let i=0;i<n;i++){
          const a=s.polygon[i], b=s.polygon[(i+1)%n];
          if(Math.abs(a.x-b.x)<=1){ // 수직 변 → X 정렬
            if(p.y>=Math.min(a.y,b.y)-r&&p.y<=Math.max(a.y,b.y)+r){const ddx=a.x-p.x; if(Math.abs(ddx)<=rel) candX.push({d:Math.abs(ddx),delta:ddx,vi,target:a.x,pri:1});}
          }else if(Math.abs(a.y-b.y)<=1){ // 수평 변 → Y 정렬
            if(p.x>=Math.min(a.x,b.x)-r&&p.x<=Math.max(a.x,b.x)+r){const ddy=a.y-p.y; if(Math.abs(ddy)<=rel) candY.push({d:Math.abs(ddy),delta:ddy,vi,target:a.y,pri:1});}
          }
        }
      });
    });
    const lock=state.snapLock||{};
    function pickAxis(cands,lk,coordOf){
      let best=null;
      cands.forEach(c=>{if(c.d>r) return; if(!best||c.pri<best.pri||(c.pri===best.pri&&c.d<best.d)) best=c;});
      if(lk){
        const dd=lk.target-coordOf(lk.vi);
        // 잠금 유지: 해제 반경 안이고, 훨씬 가까운(0.4r) 다른 타깃이 없을 때
        if(Math.abs(dd)<=rel&&!(best&&best.target!==lk.target&&best.d<r*0.4)) return {delta:dd,vi:lk.vi,target:lk.target,pri:lk.pri};
      }
      return best;
    }
    const px=pickAxis(candX,lock.x,vi=>movedPoly[vi].x);
    const py=pickAxis(candY,lock.y,vi=>movedPoly[vi].y);
    if(px){sx+=px.delta;}
    if(py){sy+=py.delta;}
    state.snapLock={x:px?{vi:px.vi,target:px.target,pri:px.pri}:null,y:py?{vi:py.vi,target:py.target,pri:py.pri}:null};
    if(px||py){
      const guides=[];
      if(px) guides.push({axis:'x',mm:px.target,pt:{x:px.target,y:base.polygon[px.vi].y+sy}});
      if(py) guides.push({axis:'y',mm:py.target,pt:{x:base.polygon[py.vi].x+sx,y:py.target}});
      STATE.dragSnapGuides=guides;
    }else{
      // ⑤ 사선 변 폴백: 꼭짓점 → 다른 공간 변 투영 (가장 가까운 것 1개)
      let bestD=Infinity,bdx=0,bdy=0,bpt=null;
      movedPoly.forEach(p=>{
        const sn=snapPointToSpaceEdges(p,obj.id,r);
        if(sn.snapped&&sn.distance<bestD){bestD=sn.distance;bdx=sn.pt.x-p.x;bdy=sn.pt.y-p.y;bpt=sn.pt;}
      });
      if(bpt){sx+=bdx;sy+=bdy;STATE.dragSnapGuides=[{axis:'pt',mm:0,pt:bpt}];}
    }
  }
  // v5.8: 라이브러리/기타 객체 드래그 — 끝점·중심 스냅 (snapToEndpoint 활용)
  else if(state.kind!=='space' && state.kind!=='wall' && 'x' in obj){
    const moved={x:base.x+sx, y:base.y+sy};
    const snap=snapToEndpoint(moved);
    if(snap.snapped){
      const sd=Math.sqrt((snap.pt.x-moved.x)**2+(snap.pt.y-moved.y)**2);
      if(sd<snapRadiusMm(150)){sx+=snap.pt.x-moved.x; sy+=snap.pt.y-moved.y;}
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
  // 곡선 (Bezier) — segment 점들 이동
  if(obj.segments&&base.segments){
    obj.segments=base.segments.map(s=>({
      p0:{x:s.p0.x+sx,y:s.p0.y+sy},p1:{x:s.p1.x+sx,y:s.p1.y+sy},
      p2:{x:s.p2.x+sx,y:s.p2.y+sy},p3:{x:s.p3.x+sx,y:s.p3.y+sy},
    }));
  }
  // VEF: 공간 — vertex만 이동 (polygon getter가 vertexIds→vertices에서 자동 계산)
  // setter 호출 금지: polygonToVertexIds가 vertexIds를 덮어써서 벽 참조 불일치 유발
  if('vertexIds' in obj&&base.polygon){
    obj.vertexIds.forEach((vid,i)=>{const bp=base.polygon[i];if(bp)moveVertex(vid,bp.x+sx,bp.y+sy);});
    // 도넛 hole 이동
    if(base.holes&&base.holes.length){
      obj.holes=base.holes.map(h=>h.map(p=>({x:p.x+sx,y:p.y+sy})));
    }
    // v5.9: 공간 안의 자식 객체들도 같은 delta로 이동 (도어·창·가구·기구·조명·전기·공조)
    if(state.contained){
      Object.entries(state.contained).forEach(([k,items])=>{
        const arr=STATE[k]; if(!arr) return;
        items.forEach(saved=>{
          const o=arr.find(x=>x.id===saved.id);
          if(o){o.x=saved.x+sx;o.y=saved.y+sy;}
        });
      });
    }
  } else if(base.polygon){
    obj.polygon=base.polygon.map(p=>({x:p.x+sx,y:p.y+sy}));
  }
}
// v5.9: 라이브러리 객체 배치 미리보기 (고스트 + 벽까지 거리)
function updateLibPlacementPreview(pos){
  const tool=STATE.selectedTool;
  const libMap={furniture:FURNITURE_LIB,furniture2:FIXFURN_LIB,fixture:FIXTURE_LIB,light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB};
  const lib=libMap[tool];
  if(!lib||!STATE.selectedLib||isMouseDown){
    if(_libPreviewActive){drawGroup.destroyChildren();previewLayer.batchDraw();_libPreviewActive=false;}
    return;
  }
  let def=lib[STATE.selectedLib];
  if(!def) return;
  // 2026-08-25: 다운라이트 고스트도 선택 인치 크기로 미리보기
  if(STATE.selectedLib==='downlight'&&typeof downlightDef==='function') def=downlightDef({inch:STATE.downlightInch});
  if(typeof isLinearLight==='function'&&isLinearLight(STATE.selectedLib)) def=linearLightDef({type:STATE.selectedLib});
  drawGroup.destroyChildren();
  _libPreviewActive=true;

  const mm=getMm(pos);
  _libLastPos=pos;
  const cx=STATE.offsetX+mmToPx(mm.x);
  const cy=STATE.offsetY+mmToPx(mm.y);
  const wMm=def.w||def.size||200;
  const hMm=def.h||def.size||200;
  const wPx=mmToPx(wMm), hPx=mmToPx(hMm);
  // 회전 후 외곽선 박스 크기 (벽까지 거리 측정용)
  const ang=_libPlaceAngle||0;
  const cosA=Math.abs(Math.cos(ang*Math.PI/180));
  const sinA=Math.abs(Math.sin(ang*Math.PI/180));
  const halfW=(wMm*cosA+hMm*sinA)/2;
  const halfH=(wMm*sinA+hMm*cosA)/2;

  // 고스트 도형 (회전 + 미러 적용)
  const ghost=new Konva.Group({x:cx,y:cy,rotation:_libPlaceAngle,scaleX:_libPlaceFlipped?-1:1,scaleY:1,opacity:0.55,listening:false});
  if(def.shape){
    drawShape(def.shape).forEach(n=>{n.listening(false);ghost.add(n);});
  }else{
    ghost.add(new Konva.Rect({x:-wPx/2,y:-hPx/2,width:wPx,height:hPx,fill:(def.c||'#888888')+'66',stroke:'#D4FF3D',strokeWidth:1.5,dash:[4,3]}));
  }
  // 외곽 점선 박스 + 중심 십자 (그룹 내부 좌표 — 회전과 함께 도는 게 맞음)
  ghost.add(new Konva.Rect({x:-wPx/2,y:-hPx/2,width:wPx,height:hPx,stroke:'#D4FF3D',strokeWidth:1.5,dash:[6,4],fill:'transparent',listening:false}));
  ghost.add(new Konva.Line({points:[-9,0,9,0],stroke:'#D4FF3D',strokeWidth:1.5,listening:false}));
  ghost.add(new Konva.Line({points:[0,-9,0,9],stroke:'#D4FF3D',strokeWidth:1.5,listening:false}));
  // 정면 인디케이터 — 가구의 "앞쪽" (Y- 방향) 화살표 (회전 확인용)
  ghost.add(new Konva.Line({points:[0,-hPx/2,0,-hPx/2-12],stroke:'#FF8B6B',strokeWidth:2,listening:false}));
  ghost.add(new Konva.Line({points:[-5,-hPx/2-7,0,-hPx/2-12,5,-hPx/2-7],stroke:'#FF8B6B',strokeWidth:2,listening:false}));
  drawGroup.add(ghost);

  // 회전/미러 상태 라벨 (고스트 상단)
  if(_libPlaceAngle!==0||_libPlaceFlipped){
    const labelTxt=(_libPlaceAngle?Math.round(_libPlaceAngle)+'°':'')+(_libPlaceFlipped?(_libPlaceAngle?' · ':'')+'미러':'');
    drawGroup.add(new Konva.Text({
      x:cx-50,y:cy-Math.max(wPx,hPx)/2-26,width:100,
      text:labelTxt,fontSize:11,fontFamily:'JetBrains Mono',fontStyle:'700',
      fill:'#FFFFFF',stroke:'#000000',strokeWidth:3,fillAfterStrokeEnabled:true,
      lineJoin:'round',align:'center',listening:false,
      shadowColor:'#000000',shadowBlur:2,shadowOpacity:0.6,
    }));
  }

  // 벽까지 거리 (4방향) — 회전된 바운딩 박스 외곽에서 시작해서 가장 가까운 벽까지
  if(STATE.walls&&STATE.walls.length>0){
    const dirs=[{dx:0,dy:-1,off:halfH},{dx:0,dy:1,off:halfH},{dx:-1,dy:0,off:halfW},{dx:1,dy:0,off:halfW}];
    const maxRay=20000;
    dirs.forEach(d=>{
      const sx=mm.x+d.dx*d.off, sy=mm.y+d.dy*d.off;
      const ex=sx+d.dx*maxRay, ey=sy+d.dy*maxRay;
      let bestDist=Infinity, bestPt=null;
      STATE.walls.forEach(wall=>{
        const ip=segIntersection({x:sx,y:sy},{x:ex,y:ey},{x:wall.x1,y:wall.y1},{x:wall.x2,y:wall.y2});
        if(ip){
          const dist=Math.hypot(ip.x-sx,ip.y-sy);
          if(dist>0.5&&dist<bestDist){bestDist=dist;bestPt=ip;}
        }
      });
      if(bestPt&&bestDist<maxRay){
        const sxPx=STATE.offsetX+mmToPx(sx), syPx=STATE.offsetY+mmToPx(sy);
        const exPx=STATE.offsetX+mmToPx(bestPt.x), eyPx=STATE.offsetY+mmToPx(bestPt.y);
        // 거리 점선
        drawGroup.add(new Konva.Line({points:[sxPx,syPx,exPx,eyPx],stroke:'#D4FF3D',strokeWidth:1,dash:[4,3],opacity:0.85,listening:false}));
        // 끝점 작은 마커
        drawGroup.add(new Konva.Circle({x:exPx,y:eyPx,radius:3,fill:'#D4FF3D',listening:false}));
        // 거리 라벨 (mm) — 흰글자 + 검정 외곽선
        const lblX=(sxPx+exPx)/2, lblY=(syPx+eyPx)/2;
        drawGroup.add(new Konva.Text({
          x:lblX-40,y:lblY-8,width:80,
          text:Math.round(bestDist)+' mm',
          fontSize:11,fontFamily:'JetBrains Mono',fontStyle:'700',
          fill:'#FFFFFF',stroke:'#000000',strokeWidth:3,fillAfterStrokeEnabled:true,
          lineJoin:'round',align:'center',listening:false,
          shadowColor:'#000000',shadowBlur:2,shadowOpacity:0.6,
        }));
      }
    });
  }
  previewLayer.batchDraw();
}

stage.on('mousemove touchmove',e=>{
  if(_isCompatMouse(e)) return;
  const pos=stage.getPointerPosition();if(!pos) return;
  const mm=getMm(pos);
  document.getElementById('cursor-pos').textContent=mm.x+','+mm.y;
  if(isPanning&&panStart){
    beginViewTransform(); /* PERF: 이동 전 기준 뷰 캡처 */
    const dx=pos.x-panStart.x,dy=pos.y-panStart.y;
    STATE.offsetX+=dx;STATE.offsetY+=dy;
    panStart={x:pos.x,y:pos.y};
    applyViewTransform(); /* 씬 재구성 대신 레이어 평행이동 — 종료 시 1회 재구성 */
    return;
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
        renderAllThrottled(); /* PERF: 프레임당 1회 재구성 */
      }
    }
    STATE.rotateState.lastAngle=curAngle;
    return;
  }
  if(STATE.selectedTool==='rect'&&isMouseDown) updateRect(pos);
  // v5.5: wall은 mousemove 미리보기를 cmdMode wall-len에서 처리
  else if(STATE.selectedTool==='circlespace'&&isMouseDown) updateCircleSpace(pos);
  else if(STATE.selectedTool==='circle'&&isMouseDown) updateCircle(pos);
  // arc 도구의 미리보기는 wall/line처럼 처리됨 (drawState type='arc'로 저장됨)
  else if(STATE.selectedTool==='select'&&isMouseDown&&dragMoveState){
    // v5.4: 선택된 객체 드래그 이동
    // 2026-08-22: 드래그 데드존 — 터치·펜 12px / 마우스 3px 이상 움직여야 이동 시작 (대표 지시 7번)
    //  롱프레스(0.6s) 대기나 손떨림으로 객체가 밀려 치수가 변하던 문제 방지. 데드존 안에서 롱프레스가 뜨면 객체는 그대로.
    if(!dragMoveState.moved){
      const _viaTouch=STATE.touch&&STATE.touch.lastType&&STATE.touch.lastType!=='mouse';
      const _dz=_viaTouch?12:3;
      if(mouseDownPos&&Math.hypot(pos.x-mouseDownPos.x,pos.y-mouseDownPos.y)<_dz) return;
      dragMoveState.moved=true;
    }
    // 2026-08-19: 커서 스냅(getMm)이 아닌 순수 좌표로 delta 계산 — 커서가 주변 꼭짓점에 붙어 객체가 튀던 문제 해소
    const rmm=rawMm(pos);
    const dx=rmm.x-dragMoveState.startMm.x, dy=rmm.y-dragMoveState.startMm.y;
    applyDragMove(dragMoveState,dx,dy);
    // PERF: 단일 배치객체(가구·위생·조명·전기·공조)는 Konva 노드만 직접 이동 (재구성 생략)
    const _libKinds={fixtures:1,furniture:1,lights:1,electric:1,hvac:1};
    if(dragMoveState.kind!=='multi'&&_libKinds[dragMoveState.kind]){
      const _arr=getArr(dragMoveState.kind);
      const _obj=_arr&&_arr.find(o=>o.id===dragMoveState.id);
      const _node=_obj&&stage.findOne('#'+_obj.id);
      if(_node){
        _node.position({x:STATE.offsetX+mmToPx(_obj.x),y:STATE.offsetY+mmToPx(_obj.y)});
        mainLayer.batchDraw();
      }else renderAllThrottled();
    }else renderAllThrottled(); /* 벽·공간·다중선택은 프레임당 1회 재구성 */
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
  // v5.9: 무한 안내선 — 첫 클릭 후 마우스 따라 무한선 미리보기
  else if(STATE.selectedTool==='xline'&&drawState&&drawState.type==='xline'){
    drawState.current=applyOrtho(drawState.start,mm);updatePreview();
  }
  // v5.9: 곡선/arc 도구 — 첫 클릭 후 마우스 따라 점선 미리보기
  else if(STATE.selectedTool==='arc'&&drawState&&drawState.type==='arc'){
    drawState.current=applyOrtho(drawState.start,mm);
    updatePreview();
  }
  else if(STATE.cmdMode==='measure-rel'&&STATE.measureFirst){
    STATE.cmdData.curX=mm.x;STATE.cmdData.curY=mm.y;
  }
  if(STATE.selectedTool==='leader'&&leaderDrawState&&leaderDrawState.points.length>=1){
    updateLeaderPreview(mm);
  }
  else if(STATE.cmdMode==='polygon-r'&&polyState?.phase==='radius'){
    updatePolygonPreview(pos);
  }
  // v5.9: 기둥 도구 — 마우스 따라 고스트 미리보기
  if(STATE.selectedTool==='pillar') updatePillarGhost(mm);
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
  // v5.9: 안내선 옵셋 방향 프리뷰 (평행 무한선 점선)
  if(STATE.selectedTool==='offset'&&offsetState?.target?.kind==='xline'){
    const xl=offsetState.target.obj;
    const dist=offsetState.distance;
    const dx=xl.x2-xl.x1,dy=xl.y2-xl.y1,len=Math.hypot(dx,dy);
    drawGroup.destroyChildren();
    if(len>1){
      const nx=-dy/len,ny=dx/len;
      const sgn=Math.sign((mm.x-xl.x1)*nx+(mm.y-xl.y1)*ny)||1;
      const ox=nx*sgn*dist,oy=ny*sgn*dist;
      const ax=STATE.offsetX+mmToPx(xl.x1+ox),ay=STATE.offsetY+mmToPx(xl.y1+oy);
      const bx=STATE.offsetX+mmToPx(xl.x2+ox),by=STATE.offsetY+mmToPx(xl.y2+oy);
      let ux=bx-ax,uy=by-ay;const l2=Math.hypot(ux,uy)||1;ux/=l2;uy/=l2;
      const EXT=(stage.width()+stage.height())*4,cx=(ax+bx)/2,cy=(ay+by)/2;
      drawGroup.add(new Konva.Line({points:[cx-ux*EXT,cy-uy*EXT,cx+ux*EXT,cy+uy*EXT],stroke:'#FFD700',strokeWidth:0.9,dash:[8,4],opacity:0.8}));
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
  // 문/창 배치 중 — 가장 가까운 벽 하이라이트 + 미리보기
  if(STATE.selectedTool==='door'||STATE.selectedTool==='window'){
    drawGroup.destroyChildren();
    let bestDist=Infinity,bestSeg=null,bestPt=null,bestAngle=0;
    const checkSeg=(ax,ay,bx,by)=>{
      const d=pointToSegmentDist(mm,{x:ax,y:ay},{x:bx,y:by});
      if(d<bestDist){
        bestDist=d;
        const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
        const t=len2>0?Math.max(0,Math.min(1,((mm.x-ax)*dx+(mm.y-ay)*dy)/len2)):0;
        bestPt={x:ax+t*dx,y:ay+t*dy};
        bestAngle=Math.atan2(dy,dx)*180/Math.PI;
        bestSeg={x1:ax,y1:ay,x2:bx,y2:by};
      }
    };
    STATE.walls.forEach(w=>{if(w.wallType==='bearing') return; checkSeg(w.x1,w.y1,w.x2,w.y2);}); // v5.9: 내력벽은 도어/창 부착 후보 아님
    STATE.spaces.forEach(s=>{const N=s.polygon.length;for(let i=0;i<N;i++){const a=s.polygon[i],b=s.polygon[(i+1)%N];checkSeg(a.x,a.y,b.x,b.y);}});
    const snapped=bestDist<3000&&bestPt;
    if(snapped){
      // 벽 골드 하이라이트
      drawGroup.add(new Konva.Line({
        points:[STATE.offsetX+mmToPx(bestSeg.x1),STATE.offsetY+mmToPx(bestSeg.y1),
                STATE.offsetX+mmToPx(bestSeg.x2),STATE.offsetY+mmToPx(bestSeg.y2)],
        stroke:'#C9A961',strokeWidth:4,opacity:0.6,shadowColor:'#C9A961',shadowBlur:10,listening:false,
      }));
      // 문/창 미리보기
      const isDoor=STATE.selectedTool==='door';
      const wMm=isDoor?900:1200;
      const wpx=mmToPx(wMm);
      const px=STATE.offsetX+mmToPx(bestPt.x),py=STATE.offsetY+mmToPx(bestPt.y);
      const col=isDoor?'#D4A05B':'#5BA0D4';
      const pg=new Konva.Group({x:px,y:py,rotation:bestAngle,opacity:0.75,listening:false});
      if(isDoor){
        pg.add(new Konva.Rect({x:-wpx/2,y:-3,width:wpx,height:6,fill:col}));
        pg.add(new Konva.Arc({x:-wpx/2,y:0,innerRadius:0,outerRadius:wpx,angle:90,rotation:0,stroke:col,strokeWidth:1,fillEnabled:false,dash:[4,3]}));
        pg.add(new Konva.Line({points:[-wpx/2,0,-wpx/2,wpx],stroke:col,strokeWidth:2}));
      }else{
        pg.add(new Konva.Rect({x:-wpx/2,y:-4,width:wpx,height:8,fill:col,opacity:0.8}));
        pg.add(new Konva.Line({points:[-wpx/2,0,wpx/2,0],stroke:'#fff',strokeWidth:1}));
      }
      drawGroup.add(pg);
    }
    previewLayer.batchDraw();
  }
  // v5.9: 라이브러리 객체 배치 미리보기 (고스트 + 벽까지 거리)
  if(['furniture','fixture','light','electric','hvac'].includes(STATE.selectedTool)){
    updateLibPlacementPreview(pos);
  }else if(_libPreviewActive&&!drawState){
    // drawState가 있을 때(=다른 도구의 미리보기 그리는 중)는 지우지 않음
    drawGroup.destroyChildren();previewLayer.batchDraw();_libPreviewActive=false;
  }
  // v5.2: 스냅 마커 갱신 (모든 도구에서 endpoint 스냅 시 글로우 표시)
  updateSnapMarker(pos);
});
stage.on('mouseup touchend',e=>{
  if(_isCompatMouse(e)) return;
  const _wasPanning=isPanning;
  isMouseDown=false;isPanning=false;panStart=null;
  /* PERF: 팬 종료 — 레이어 변환을 실좌표 재구성으로 확정 (1회) */
  if(_wasPanning){endViewTransform();}
  // v5.9: 스케일 보정 모드 — 일반 도구 동작 무시
  if(_scaleCalActive){
    const pos=stage.getPointerPosition();
    if(pos){
      if(!_scaleCalP1){
        _scaleCalP1={x:pos.x,y:pos.y};
        showStatus('스케일 보정: 두 번째 점 클릭 (Esc 취소)');
      }else{
        const dx=pos.x-_scaleCalP1.x, dy=pos.y-_scaleCalP1.y;
        const pxDist=Math.hypot(dx,dy);
        if(pxDist<5){
          alert('두 점이 너무 가깝습니다. 다시 첫 점부터 클릭하세요.');
          _scaleCalP1=null;
          showStatus('스케일 보정: 첫 점 클릭 (Esc 취소)');
        }else{
          const mmStr=prompt('이 거리의 실제 길이 (mm):','3000');
          _scaleCalActive=false;_scaleCalP1=null;
          if(mmStr){
            const mm=parseFloat(mmStr);
            if(isFinite(mm)&&mm>0){
              if(STATE.bgImage){
                // 새 스케일 = mmToPx(mm) × 현재 스케일 / 픽셀 거리
                const cur=STATE.bgImage.scale||1;
                STATE.bgImage.scale=mmToPx(mm)*cur/pxDist;
                drawGrid();
                if(typeof refreshBgImageUI==='function') refreshBgImageUI();
                showStatus('스케일 보정 완료: '+Math.round(pxDist)+'px = '+mm+'mm');
              }else{
                showStatus('배경 이미지 없음');
              }
            }else{alert('유효한 mm 값 입력');}
          }else{showStatus('스케일 보정 취소');}
        }
      }
    }
    return;
  }
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
      renderAll(); /* PERF: 드래그 중 생략된 재구성을 드롭 시점에 1회 확정 */
      if(dragMoveState.altCopy){
        const _n=(dragMoveState.kind==='multi'&&Array.isArray(dragMoveState.items))?dragMoveState.items.length:1;
        cmdToast('복사됨 — '+_n+'개 (Alt+드래그)');
      }
    }else if(dragMoveState.altCopy){
      // Alt+클릭(드래그 없음): 제자리 복사본 제거 — 2026-08-27: 다중 사본도 일괄 제거
      _removeAltCopies(dragMoveState);
    }
    dragMoveState=null;
    mouseDownPos=null;
    STATE.dragSnapGuides=null;drawSnapMarker(); // 2026-08-19: 정렬 가이드 제거
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
  }else if(STATE.selectedTool==='wall'||STATE.selectedTool==='gabyeok'){
    if(!isClick) return;
    const isGabyeok=STATE.selectedTool==='gabyeok';
    if(STATE.cmdMode==='wall-len'&&drawState&&drawState.type==='wall'){
      let endMm=getMm(pos);endMm=applyOrtho(drawState.start,endMm);
      addWall(drawState.start.x,drawState.start.y,endMm.x,endMm.y,{wallType:isGabyeok?'bearing':'standard'});
      drawGroup.destroyChildren();previewLayer.batchDraw();
      // v5.9: 일반벽도 연속 클릭 모드 — 끝점이 다음 시작점. Esc로 종료
      drawState={type:'wall',start:endMm,current:endMm};
      cmdToast((isGabyeok?'내력벽':'벽')+' 추가 — 다음 끝점 클릭(연속) / Esc 종료');
    }else{
      const mm=getMm(pos);
      drawState={type:'wall',start:mm,current:mm};
      enterCmdMode('wall-len',{},'길이(mm):',(isGabyeok?'내력벽':'벽')+' 끝점 클릭(연속) / 거리 Enter / Shift=직교 / Esc=종료');
    }
  }else if(STATE.selectedTool==='line'){
    if(!isClick) return;
    if(STATE.cmdMode==='wall-len'&&drawState&&drawState.type==='line'){
      let endMm=getMm(pos);endMm=applyOrtho(drawState.start,endMm);
      addLine(drawState.start.x,drawState.start.y,endMm.x,endMm.y);
      drawGroup.destroyChildren();previewLayer.batchDraw();
      // v5.9: 선도 연속 클릭 모드 — 끝점이 다음 시작점. Esc로 종료
      drawState={type:'line',start:endMm,current:endMm};
      cmdToast('선 추가 — 다음 끝점 클릭(연속) / Esc 종료');
    }else{
      const mm=getMm(pos);
      drawState={type:'line',start:mm,current:mm};
      enterCmdMode('wall-len',{},'길이(mm):','선 끝점 클릭(연속) / 거리 Enter / Shift=직교 / Esc=종료');
    }
  }
  else if(STATE.selectedTool==='xline'){
    // 2026-08-19 태블릿: ① 탭 = 기준점 → ② 회전(펜 호버·마우스 이동, 또는 손가락 드래그) → ③ 탭 = 생성(손가락 드래그면 떼는 순간 생성)
    //  한 번 탭에 두 번 반응(호환 마우스 이벤트)하던 문제는 _isCompatMouse 로 차단
    const mm=getMm(pos);
    if(drawState&&drawState.type==='xline'){
      const touchDragConfirm=!isClick&&_isTouchEvt(e)&&dragDist>=5; // 손가락으로 돌려서 떼기 = 확정
      if(!isClick&&!touchDragConfirm) return;
      const end=applyOrtho(drawState.start,mm);
      if(Math.hypot(end.x-drawState.start.x,end.y-drawState.start.y)<1){cmdToast('방향점이 기준점과 같습니다 — 돌려서 다른 곳을 탭하세요');return;}
      addXline(drawState.start.x,drawState.start.y,end.x,end.y);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('안내선 추가됨 — 다음 기준점 탭 / Esc 종료');
    }else{
      if(!isClick) return;
      drawState={type:'xline',start:mm,current:mm};
      cmdToast('무한 안내선 — 돌려서 방향점 탭 (손가락: 드래그로 돌려 떼기) / Shift=수평·수직 / Esc=종료');
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
    if(!isClick) return;
    if(drawState&&drawState.type==='arc'){
      // 두 번째 클릭 → 직선 Bezier 곡선 생성 (그 위치에 정확히 고정)
      let endMm=getMm(pos);endMm=applyOrtho(drawState.start,endMm);
      addLinearCurve(drawState.start.x,drawState.start.y,endMm.x,endMm.y);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('선/곡선 고정됨 — 핸들로 곡선화');
    }else{
      // 첫 번째 클릭 → 시작점 설정 + 즉시 고스트 미리보기
      const mm=getMm(pos);
      drawState={type:'arc',start:mm,current:mm};
      updatePreview(); // 즉시 시작점 글로우 + 0mm 라벨 표시
      cmdToast('두 번째 점 클릭으로 고정 — Shift=직교 / Esc=취소');
    }
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
    else if(STATE.selectedTool==='furniture2'&&STATE.selectedLib) addLibObject(pos,'furniture',STATE.selectedLib); // 2026-08-24: 가구2(픽스) — kind 는 furniture 공용
    else if(STATE.selectedTool==='fixture'&&STATE.selectedLib) addLibObject(pos,'fixtures',STATE.selectedLib);
    else if(STATE.selectedTool==='light'&&STATE.selectedLib) addLibObject(pos,'lights',STATE.selectedLib);
    else if(STATE.selectedTool==='electric'&&STATE.selectedLib) addLibObject(pos,'electric',STATE.selectedLib);
    else if(STATE.selectedTool==='hvac'&&STATE.selectedLib) addLibObject(pos,'hvac',STATE.selectedLib);  // v5.6
    else if(STATE.selectedTool==='text') addText(pos);
    else if(STATE.selectedTool==='leader') handleLeaderClick(pos);
    else if(STATE.selectedTool==='pillar') addPillarAtPos(pos);
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
// 2026-08-19 태블릿: 진행 중인 포인터 제스처 안전 취소 (핀치/손가락 팬 시작, touchcancel, 롱프레스 등에서 호출)
//  — 박스 선택·드래그 이동·회전·패닝 상태를 초기화하고, 드래그 중이던 객체는 시작 위치로 되돌린다.
window.cancelPointerGesture=function(){
  let dirty=false;
  if(dragMoveState){
    try{applyDragMove(dragMoveState,0,0);}catch(err){}
    // 2026-08-27: 다중 Alt 사본도 일괄 제거
    _removeAltCopies(dragMoveState);
    dragMoveState=null;dirty=true;STATE.dragSnapGuides=null;
  }
  if(STATE.rotateState){STATE.rotateState=null;dirty=true;}
  // 박스 선택은 항상 취소, 사각형/원은 드래그 중(isMouseDown)일 때만 취소 (치수 입력 단계는 유지)
  if(drawState&&(drawState.type==='box'||(isMouseDown&&(drawState.type==='rect'||drawState.type==='circle'||drawState.type==='circlespace')))){
    drawState=null;dirty=true;
    if(typeof drawGroup!=='undefined'){drawGroup.destroyChildren();previewLayer.batchDraw();}
  }
  const wasPanning=isPanning;
  mouseDownPos=null;isMouseDown=false;isPanning=false;panStart=null;
  if(wasPanning) endViewTransform();
  if(dirty){renderAll();refreshUI();}
};
stage.on('touchcancel',()=>{window.cancelPointerGesture();});
// 2026-08-19: 자체 테스트(tests.js 드래그 스냅)가 참조 — initTools 클로저 밖으로 노출
window.applyDragMove=applyDragMove;
// 2026-08-22: 태블릿 통합 메뉴(touch.js)가 참조 — 이전엔 클로저에 갇혀 있어
//  잠금·차집합·교집합·복제·탭선택이 typeof 가드에 걸려 조용히 실패했다 (대표 지시 3·6번 근본 원인)
window.applyLockToSelection=applyLockToSelection;
window.lockAllObjects=lockAllObjects;
window.subtractSelectedSpaces=subtractSelectedSpaces;
window.intersectSelectedSpaces=intersectSelectedSpaces;
window.showSpaceCtxMenu=showSpaceCtxMenu;window.hideSpaceCtxMenu=hideSpaceCtxMenu;
window.showShapeConvertMenu=showShapeConvertMenu;window.hideShapeConvertMenu=hideShapeConvertMenu;
window.showSelectionCtxMenu=showSelectionCtxMenu;window.hideSelectionCtxMenu=hideSelectionCtxMenu;
window.findObjById=findObjById;
window.altCopyObj=altCopyObj;
// 2026-08-27: Alt 다중 복사 — initTools 내부 선언이므로 전역 노출 필수 (touch.js·테스트에서 사용)
window.altCopyBoxSelection=altCopyBoxSelection;
window._segRectHit=_segRectHit;window._boxSelGeom=_boxSelGeom;window.finishBoxSelection=finishBoxSelection;
window._removeAltCopies=_removeAltCopies;
window._nudgeSelected=_nudgeSelected;
window._captureContained=_captureContained;
stage.on('dblclick dbltap',e=>{
  if(STATE.selectedTool==='leader'&&leaderDrawState) finishLeader();
  if(STATE.selectedTool==='polygon'&&freePolyState) finishFreePolygon(); // v5.9: 자유 다각형 닫기
});
stage.on('wheel',e=>{
  e.evt.preventDefault();
  const oldZoom=STATE.zoom;
  const delta=e.evt.deltaY>0?0.9:1.1;
  const newZoom=clampZoom(oldZoom*delta);
  if(newZoom===oldZoom) return;
  beginViewTransform(); /* PERF: 휠 연타 중 레이어 변환만, 멈추면 1회 재구성 */
  const pos=stage.getPointerPosition();
  STATE.offsetX=pos.x-(pos.x-STATE.offsetX)*(newZoom/oldZoom);
  STATE.offsetY=pos.y-(pos.y-STATE.offsetY)*(newZoom/oldZoom);
  STATE.zoom=newZoom;
  applyViewTransform();
  clearTimeout(_zoomSettleTimer);
  _zoomSettleTimer=setTimeout(()=>endViewTransform(),140);
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
});
let _lastCtxMenuAt=0;
container.addEventListener('contextmenu',e=>{
  e.preventDefault();
  e.stopPropagation();
  // 2026-08-19: 롱프레스(합성)와 브라우저 네이티브 contextmenu 가 연달아 오면 한 번만 처리
  const _now=performance.now();
  if(_now-_lastCtxMenuAt<400) return;
  _lastCtxMenuAt=_now;
  // 2026-08-19: 작도 중 우클릭(롱프레스) = 완료 — 도움말(Enter/더블클릭/우클릭) 과 일치
  if(STATE.selectedTool==='leader'&&leaderDrawState){finishLeader();return;}
  if(STATE.selectedTool==='polygon'&&freePolyState){finishFreePolygon();return;}
  // 히트 테스트 (Ctrl 자재 메뉴·자동 선택·태블릿 통합 메뉴 공용)
  const rect=container.getBoundingClientRect();
  const hit=stage.getIntersection({x:e.clientX-rect.left,y:e.clientY-rect.top});
  let hitFound=null;
  if(hit){
    let node=hit,id=null;
    while(node&&node!==stage){if(node.id&&node.id()){id=node.id();break;}node=node.getParent();}
    if(id) hitFound=findObjById(id);
  }
  // Ctrl+우클릭: 공간·벽 자재 설정 메뉴 (데스크톱)
  if(e.ctrlKey){
    if(hitFound&&(hitFound.kind==='wall'||hitFound.kind==='space')){
      showFinishMenu(hitFound.kind,hitFound.obj,e.clientX,e.clientY);
    }
    return;
  }
  // 2026-08-19: 태블릿(롱프레스·S펜 버튼) 또는 선택이 비어 있을 때 — 누른 객체를 먼저 선택
  const fromTouch=e.__ecoTouch===true||!!(STATE.touch&&STATE.touch.lastType&&STATE.touch.lastType!=='mouse');
  const hasSel=!!((STATE.boxSelection&&STATE.boxSelection.length)||(STATE.selectedKind&&STATE.selectedId));
  if(hitFound&&STATE.selectedTool==='select'){
    const inSel=(STATE.selectedKind===hitFound.kind&&STATE.selectedId===hitFound.id)||
                (STATE.boxSelection||[]).some(b=>b.kind===hitFound.kind&&b.id===hitFound.id);
    if(!inSel&&(fromTouch||!hasSel)){
      const _sh=STATE.shiftPressed;STATE.shiftPressed=false;
      selectObj(hitFound.kind,hitFound.id);
      STATE.shiftPressed=_sh;
    }
  }
  // 태블릿: 우클릭 기능 전부를 한 메뉴로 (Ctrl 불필요) — js/touch.js
  if(fromTouch&&typeof showTouchCtxMenu==='function'){
    showTouchCtxMenu(e.clientX,e.clientY,hitFound);
    return;
  }
  // 박스에 공간 2개 이상 선택돼 있으면 Boolean + 잠금 메뉴 표시
  const sp=STATE.boxSelection.filter(b=>b.kind==='space').length;
  if(sp>=2){
    showSpaceCtxMenu(e.clientX,e.clientY);
    return;
  }
  // v5.9: 박스 선택 1+ (공간 1 또는 그 외 종류) — 잠금 메뉴
  if(STATE.boxSelection&&STATE.boxSelection.length>=1){
    showSelectionCtxMenu(e.clientX,e.clientY);
    return;
  }
  // v5.9: 원/곡선 선택 시 공간/벽/내력벽 변환 메뉴 (잠금 포함)
  if((STATE.selectedKind==='circles'||STATE.selectedKind==='curves')&&STATE.selectedId){
    showShapeConvertMenu(e.clientX,e.clientY,STATE.selectedKind,STATE.selectedId);
    return;
  }
  // v5.9: 단일 선택 (벽/객체 등) — 잠금 메뉴만
  if(STATE.selectedKind&&STATE.selectedId){
    showSelectionCtxMenu(e.clientX,e.clientY);
  }
});
// v5.9: 선택된 공간 컨텍스트 메뉴 (Boolean 연산 — 트림에서 이전)
function showSpaceCtxMenu(px,py){
  hideSpaceCtxMenu();
  const spaceIds=STATE.boxSelection.filter(b=>b.kind==='space').map(b=>b.id);
  const count=spaceIds.length;
  const spaces=spaceIds.map(id=>STATE.spaces.find(s=>s.id===id)).filter(Boolean);
  const nameA=spaces[0]?.name||'A';
  const nameB=spaces[1]?.name||'B';
  const menu=document.createElement('div');
  menu.id='space-ctx-menu';
  menu.style.cssText='position:fixed;z-index:9999;background:#1A1B2E;border:1px solid #3D4466;border-radius:10px;padding:8px 10px;box-shadow:0 6px 28px rgba(0,0,0,0.6);display:flex;flex-direction:column;gap:6px;min-width:200px';
  // v5.9: 잠금 상태 — 선택 중 모두 잠금이면 "해제" 버튼, 아니면 "잠금" 버튼
  const allLocked=spaces.every(s=>s.locked);
  let html=
    '<div style="font-size:10px;color:#7B82B5;margin-bottom:2px;font-weight:600;letter-spacing:.5px">선택된 공간 '+count+'개 — Boolean</div>'+
    '<button class="space-ctx-btn" data-op="merge" style="background:#2B6CB0;color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>🔗</span><span>병합 (Union) — 모두 합치기</span></button>';
  if(count===2){
    html+='<button class="space-ctx-btn" data-op="subtract-ab" style="background:#276749;color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>✂</span><span>차감 ('+escapeHtml(nameA)+' − '+escapeHtml(nameB)+')</span></button>';
    html+='<button class="space-ctx-btn" data-op="subtract-ba" style="background:#276749;color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>✂</span><span>차감 ('+escapeHtml(nameB)+' − '+escapeHtml(nameA)+')</span></button>';
    html+='<button class="space-ctx-btn" data-op="intersect" style="background:#744210;color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>◈</span><span>교집합 (Intersect)</span></button>';
  }
  html+='<div style="height:1px;background:#3D4466;margin:4px 0"></div>';
  html+='<button class="space-ctx-btn" data-op="lock-toggle" style="background:'+(allLocked?'#7B5A2D':'#5A4A2A')+';color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>'+(allLocked?'🔓':'🔒')+'</span><span>'+(allLocked?'잠금 해제':'잠금 (이동·편집 불가)')+'</span></button>';
  html+='<button class="space-ctx-btn" data-op="cancel" style="background:#2D3748;color:#9CA3AF;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:11px;text-align:center">취소 (Esc)</button>';
  menu.innerHTML=html;
  document.body.appendChild(menu);
  menu.style.left=Math.min(px,window.innerWidth-menu.offsetWidth-10)+'px';
  menu.style.top=Math.min(py,window.innerHeight-menu.offsetHeight-10)+'px';
  menu.querySelectorAll('.space-ctx-btn').forEach(btn=>{
    btn.addEventListener('click',ev=>{
      ev.stopPropagation();
      const op=btn.dataset.op;
      hideSpaceCtxMenu();
      if(op==='merge') mergeAdjacentSpaces();
      else if(op==='subtract-ab') subtractSelectedSpaces(spaceIds[0],spaceIds[1]);
      else if(op==='subtract-ba') subtractSelectedSpaces(spaceIds[1],spaceIds[0]);
      else if(op==='intersect') intersectSelectedSpaces(spaceIds[0],spaceIds[1]);
      else if(op==='lock-toggle') applyLockToSelection(!allLocked);
    });
  });
  // 외부 클릭 시 닫기 — pointerdown 사용 (click과 충돌 회피, 터치·펜 공용)
  setTimeout(()=>{
    const closeOnOutside=ev=>{
      if(!menu.contains(ev.target)){hideSpaceCtxMenu();document.removeEventListener('pointerdown',closeOnOutside);}
    };
    document.addEventListener('pointerdown',closeOnOutside);
  },50);
}
function hideSpaceCtxMenu(){
  const m=document.getElementById('space-ctx-menu');
  if(m) m.remove();
}
function hideSpaceCtxMenuOnce(){hideSpaceCtxMenu();}
// v5.9: 원/곡선 → 공간/벽/내력벽 변환 메뉴
function showShapeConvertMenu(px,py,kind,id){
  hideShapeConvertMenu();
  const menu=document.createElement('div');
  menu.id='shape-convert-menu';
  menu.style.cssText='position:fixed;z-index:9999;background:#1A1B2E;border:1px solid #3D4466;border-radius:10px;padding:8px 10px;box-shadow:0 6px 28px rgba(0,0,0,0.6);display:flex;flex-direction:column;gap:6px;min-width:180px';
  const label=kind==='circles'?'원/타원':'곡선';
  let colorRow='';
  if(kind==='circles'){
    // 색상 팔레트 + 커스텀 컬러 피커
    const presets=['#C9A961','#5BA0D4','#7BA05B','#E2725B','#9B7AC9','#D4A05B','#5B8DA0','#C97AA0','#3E3E3E','#FFFFFF'];
    const swatches=presets.map(col=>'<button class="shape-color-swatch" data-color="'+col+'" style="width:22px;height:22px;background:'+col+';border:1px solid #555;border-radius:4px;cursor:pointer" title="'+col+'"></button>').join('');
    colorRow=
      '<div style="font-size:10px;color:#7B82B5;margin-top:6px;margin-bottom:2px;font-weight:600;letter-spacing:.5px">색상</div>'+
      '<div style="display:flex;flex-wrap:wrap;gap:4px;padding:2px 0">'+swatches+
      '<input type="color" class="shape-color-custom" value="#C9A961" style="width:22px;height:22px;border:1px solid #555;border-radius:4px;cursor:pointer;padding:0;background:none">'+
      '</div>';
  }
  let textRow='';
  if(kind==='circles'){
    const obj=STATE.circles.find(c=>c.id===id);
    const curText=(obj&&obj.centerText)||'';
    textRow='<button class="shape-cv-btn" data-op="text" style="background:#C9A961;color:#000;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>T</span><span>'+(curText?'텍스트 수정 ('+escapeHtml(curText.slice(0,12))+(curText.length>12?'…':'')+')':'중앙에 텍스트 추가')+'</span></button>';
  }
  // v5.9: 잠금 상태 확인
  const arrLk=getArr(kind);
  const objLk=arrLk?arrLk.find(o=>o.id===id):null;
  const isLocked=!!(objLk&&objLk.locked);
  menu.innerHTML=
    '<div style="font-size:10px;color:#7B82B5;margin-bottom:2px;font-weight:600;letter-spacing:.5px">'+label+' 변환</div>'+
    '<button class="shape-cv-btn" data-op="space" style="background:#C9A961;color:#000;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>⬛</span><span>공간으로 변환</span></button>'+
    '<button class="shape-cv-btn" data-op="wall" style="background:#3E3E3E;color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>▬</span><span>벽으로 변환</span></button>'+
    '<button class="shape-cv-btn" data-op="bearing" style="background:#5B5B5B;color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>▤</span><span>내력벽으로 변환</span></button>'+
    textRow+
    colorRow+
    '<div style="height:1px;background:#3D4466;margin:4px 0"></div>'+
    '<button class="shape-cv-btn" data-op="lock-toggle" style="background:'+(isLocked?'#7B5A2D':'#5A4A2A')+';color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>'+(isLocked?'🔓':'🔒')+'</span><span>'+(isLocked?'잠금 해제':'잠금 (이동·편집 불가)')+'</span></button>'+
    '<button class="shape-cv-btn" data-op="cancel" style="background:#2D3748;color:#9CA3AF;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:11px;text-align:center">취소 (Esc)</button>';
  document.body.appendChild(menu);
  menu.style.left=Math.min(px,window.innerWidth-menu.offsetWidth-10)+'px';
  menu.style.top=Math.min(py,window.innerHeight-menu.offsetHeight-10)+'px';
  menu.querySelectorAll('.shape-cv-btn').forEach(btn=>{
    btn.addEventListener('click',ev=>{
      ev.stopPropagation();
      const op=btn.dataset.op;
      hideShapeConvertMenu();
      if(op==='space') convertShapeToSpace(kind,id);
      else if(op==='wall') convertShapeToWalls(kind,id,false);
      else if(op==='bearing') convertShapeToWalls(kind,id,true);
      else if(op==='lock-toggle') applyLockToSelection(!isLocked);
      else if(op==='text'){
        const obj=STATE.circles.find(c=>c.id===id);
        if(obj){
          const cur=obj.centerText||'';
          const newText=prompt('원 중앙 텍스트:',cur);
          if(newText!==null){
            obj.centerText=newText;
            saveHistory();renderAll();refreshUI();
            cmdToast(newText?'텍스트 추가됨':'텍스트 제거됨');
          }
        }
      }
    });
  });
  // 색상 swatch 클릭
  menu.querySelectorAll('.shape-color-swatch').forEach(sw=>{
    sw.addEventListener('click',ev=>{
      ev.stopPropagation();
      const col=sw.dataset.color;
      const obj=STATE.circles.find(c=>c.id===id);
      if(obj){obj.fillColor=col+'60';obj.strokeColor=col;saveHistory();renderAll();refreshUI();cmdToast('원 색상 변경 — '+col);}
    });
  });
  // 커스텀 컬러 피커
  const customPick=menu.querySelector('.shape-color-custom');
  if(customPick){
    customPick.addEventListener('input',ev=>{
      ev.stopPropagation();
      const col=customPick.value;
      const obj=STATE.circles.find(c=>c.id===id);
      if(obj){obj.fillColor=col+'60';obj.strokeColor=col;renderAll();}
    });
    customPick.addEventListener('change',ev=>{
      ev.stopPropagation();
      saveHistory();refreshUI();
    });
    customPick.addEventListener('click',ev=>ev.stopPropagation());
  }
  setTimeout(()=>{
    const closeOnOutside=ev=>{
      if(!menu.contains(ev.target)){hideShapeConvertMenu();document.removeEventListener('pointerdown',closeOnOutside);}
    };
    document.addEventListener('pointerdown',closeOnOutside);
  },50);
}
function hideShapeConvertMenu(){
  const m=document.getElementById('shape-convert-menu');
  if(m) m.remove();
}
// v5.9: 통합 선택 컨텍스트 메뉴 — 박스선택 1+개 또는 단일 선택 (잠금/해제)
function showSelectionCtxMenu(px,py){
  hideSelectionCtxMenu();
  const items=STATE.boxSelection&&STATE.boxSelection.length>0
    ? STATE.boxSelection.slice()
    : (STATE.selectedKind&&STATE.selectedId?[{kind:STATE.selectedKind,id:STATE.selectedId}]:[]);
  if(items.length===0) return;
  // 종류별 카운트
  const kindCount={};
  let allLocked=true, anyValid=false;
  items.forEach(({kind,id})=>{
    const arr=getArr(kind); if(!arr) return;
    const obj=arr.find(o=>o.id===id); if(!obj) return;
    kindCount[kind]=(kindCount[kind]||0)+1;
    anyValid=true;
    if(!obj.locked) allLocked=false;
  });
  if(!anyValid) return;
  const kindNames={spaces:'공간',walls:'벽',openings:'창문/도어',furniture:'가구',fixtures:'위생/주방',lights:'조명',electric:'전기',hvac:'공조/소방',texts:'텍스트',measures:'치수',circles:'원',arcs:'아크',curves:'곡선',leaders:'지시선'};
  const kindStr=Object.entries(kindCount).map(([k,n])=>(kindNames[k]||k)+' '+n).join(' · ');
  const menu=document.createElement('div');
  menu.id='selection-ctx-menu';
  menu.style.cssText='position:fixed;z-index:9999;background:#1A1B2E;border:1px solid #3D4466;border-radius:10px;padding:8px 10px;box-shadow:0 6px 28px rgba(0,0,0,0.6);display:flex;flex-direction:column;gap:6px;min-width:200px';
  menu.innerHTML=
    '<div style="font-size:10px;color:#7B82B5;margin-bottom:2px;font-weight:600;letter-spacing:.5px">선택 — '+escapeHtml(kindStr)+'</div>'+
    '<button class="sel-ctx-btn" data-op="lock-toggle" style="background:'+(allLocked?'#7B5A2D':'#5A4A2A')+';color:#fff;border:none;border-radius:6px;padding:7px 12px;cursor:pointer;font-size:12px;text-align:left;display:flex;align-items:center;gap:8px"><span>'+(allLocked?'🔓':'🔒')+'</span><span>'+(allLocked?'잠금 해제':'잠금 (이동·편집 불가)')+'</span></button>'+
    '<button class="sel-ctx-btn" data-op="cancel" style="background:#2D3748;color:#9CA3AF;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:11px;text-align:center">취소 (Esc)</button>';
  document.body.appendChild(menu);
  menu.style.left=Math.min(px,window.innerWidth-menu.offsetWidth-10)+'px';
  menu.style.top=Math.min(py,window.innerHeight-menu.offsetHeight-10)+'px';
  menu.querySelectorAll('.sel-ctx-btn').forEach(btn=>{
    btn.addEventListener('click',ev=>{
      ev.stopPropagation();
      const op=btn.dataset.op;
      hideSelectionCtxMenu();
      if(op==='lock-toggle') applyLockToSelection(!allLocked);
    });
  });
  setTimeout(()=>{
    const closeOnOutside=ev=>{
      if(!menu.contains(ev.target)){hideSelectionCtxMenu();document.removeEventListener('pointerdown',closeOnOutside);}
    };
    document.addEventListener('pointerdown',closeOnOutside);
  },50);
}
function hideSelectionCtxMenu(){
  const m=document.getElementById('selection-ctx-menu');
  if(m) m.remove();
}
// 도형의 외곽 점들을 mm 좌표 배열로 추출
function _shapeToPolygon(kind,id){
  if(kind==='circles'){
    const c=STATE.circles.find(x=>x.id===id);
    if(!c) return null;
    const rx=c.rx_mm!=null?c.rx_mm:c.radius_mm;
    const ry=c.ry_mm!=null?c.ry_mm:c.radius_mm;
    const rot=(c.rotation||0)*Math.PI/180;
    const cosA=Math.cos(rot), sinA=Math.sin(rot);
    const N=36; // 10° 간격
    const pts=[];
    for(let i=0;i<N;i++){
      const θ=(i/N)*2*Math.PI;
      const lx=rx*Math.cos(θ), ly=ry*Math.sin(θ);
      pts.push({x:Math.round(c.x+lx*cosA-ly*sinA),y:Math.round(c.y+lx*sinA+ly*cosA)});
    }
    return pts;
  }
  if(kind==='curves'){
    const cv=STATE.curves.find(x=>x.id===id);
    if(!cv||!cv.segments) return null;
    const pts=[];
    cv.segments.forEach((s,i)=>{
      const steps=20; // segment당 21점
      for(let k=(i===0?0:1);k<=steps;k++){
        const t=k/steps, mt=1-t;
        const x=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
        const y=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
        pts.push({x:Math.round(x),y:Math.round(y)});
      }
    });
    return pts;
  }
  return null;
}
// 도형 → 공간 변환
function convertShapeToSpace(kind,id){
  const pts=_shapeToPolygon(kind,id);
  if(!pts||pts.length<3){cmdToast('변환 실패 — 점 부족');return;}
  // 닫힌 폴리곤 보장 (마지막 점 = 첫 점이면 마지막 제거)
  if(Math.hypot(pts[0].x-pts[pts.length-1].x,pts[0].y-pts[pts.length-1].y)<2) pts.pop();
  if(pts.length<3){cmdToast('변환 실패 — 폴리곤 무효');return;}
  // 원본 도형 삭제
  if(kind==='circles') STATE.circles=STATE.circles.filter(c=>c.id!==id);
  else if(kind==='curves') STATE.curves=STATE.curves.filter(c=>c.id!==id);
  STATE.selectedKind=null;STATE.selectedId=null;
  // addSpace로 공간 + 벽 생성
  addSpace(pts);
  cmdToast((kind==='circles'?'원':'곡선')+' → 공간 변환 완료');
}
// 도형 → 벽/내력벽 변환 (연결된 polyline) — 배치 처리로 saveHistory/renderAll 1회만
function convertShapeToWalls(kind,id,isBearing){
  const pts=_shapeToPolygon(kind,id);
  if(!pts||pts.length<2){cmdToast('변환 실패 — 점 부족');return;}
  const closed=Math.hypot(pts[0].x-pts[pts.length-1].x,pts[0].y-pts[pts.length-1].y)<2;
  if(closed) pts.pop();
  // 원본 삭제
  if(kind==='circles') STATE.circles=STATE.circles.filter(c=>c.id!==id);
  else if(kind==='curves') STATE.curves=STATE.curves.filter(c=>c.id!==id);
  // 벽 일괄 생성 (saveHistory/renderAll 호출 없이 직접 push)
  const wallType=isBearing?'bearing':'standard';
  const total=closed?pts.length:pts.length-1;
  const thickness=isBearing?(STATE.bearingWallThickness||200):STATE.wallThickness;
  const layerName=isBearing?'A-WALLB-CONV':'A-WALL-CONV';
  for(let i=0;i<total;i++){
    const a=pts[i], b=pts[closed?(i+1)%pts.length:i+1];
    const v1=isBearing?ensureBearingVertex(a.x,a.y,30):ensureVertex(a.x,a.y);
    const v2=isBearing?ensureBearingVertex(b.x,b.y,30):ensureVertex(b.x,b.y);
    STATE.walls.push(makeWallVEF(v1.id,v2.id,{
      layerName,spaceId:null,wallType,thickness,
      alignment:STATE.wallAlignment||'center',
    }));
  }
  if(!isBearing) splitWallsAtIntersections(); // 일반벽일 때만 분할
  STATE.selectedKind=null;STATE.selectedId=null;
  saveHistory();renderAll();refreshUI();
  cmdToast((kind==='circles'?'원':'곡선')+' → '+(isBearing?'내력벽':'벽')+' '+total+'개 변환 완료');
}
// v5.9: 선택된 두 공간 차감 (target에서 cutter 영역 제거)
function subtractSelectedSpaces(targetId,cutterId){
  let target=STATE.spaces.find(s=>s.id===targetId);
  let cutter=STATE.spaces.find(s=>s.id===cutterId);
  if(!target||!cutter){cmdToast('공간 찾을 수 없음');return;}
  if(target.locked||cutter.locked){cmdToast('잠금된 공간 포함 — 차집합 불가');return;} // 2026-08-24
  // 포함 여부 양방향 검사 — 클릭 순서 무관하게 더 큰 공간이 외곽이 되도록
  const cutterInTarget=cutter.polygon.every(p=>ptInPoly(p,target.polygon));
  const targetInCutter=target.polygon.every(p=>ptInPoly(p,cutter.polygon));
  if(cutterInTarget||targetInCutter){
    // 외곽·안쪽 자동 결정 (큰 쪽이 외곽)
    if(targetInCutter){const tmp=target; target=cutter; cutter=tmp;}
    // holes 배열에 추가 → 깨끗한 도넛
    if(!target.holes) target.holes=[];
    target.holes.push(cutter.polygon.map(p=>({x:p.x,y:p.y})));
    // cutter의 벽·자식 객체 → target 소유로 이전, cutter 삭제
    STATE.walls.forEach(w=>{if(w.spaceId===cutter.id) w.spaceId=target.id;});
    ['openings','furniture','fixtures','lights','electric','hvac'].forEach(k=>{
      STATE[k].forEach(o=>{if(o.spaceId===cutter.id) o.spaceId=target.id;});
    });
    STATE.spaces=STATE.spaces.filter(s=>s.id!==cutter.id);
    STATE.boxSelection=[];
    STATE.selectedKind='space';STATE.selectedId=target.id;
    saveHistory();renderAll();refreshUI();
    cmdToast('hole 차감 완료 — '+parseFloat(spArea(target).toFixed(2))+'㎡');
    return;
  }
  // 부분 겹침 — 기존 polyDiff 사용 (외곽이 잘림)
  const ok=doFaceTrimBy(target,cutter);
  if(ok){
    saveHistory();renderAll();refreshUI();
    cmdToast('차감 완료 — '+parseFloat(spArea(target).toFixed(2))+'㎡');
  }else cmdToast('차감 실패 — 겹침 없음');
}
// v5.9: 선택된 두 공간 교집합 (둘 다 겹치는 영역만 남김)
function intersectSelectedSpaces(aId,bId){
  const A=STATE.spaces.find(s=>s.id===aId);
  const B=STATE.spaces.find(s=>s.id===bId);
  if(!A||!B){cmdToast('공간 찾을 수 없음');return;}
  if(A.locked||B.locked){cmdToast('잠금된 공간 포함 — 교집합 불가');return;} // 2026-08-24
  const inter=suthHodg(A.polygon,B.polygon);
  if(!inter||inter.length<3){cmdToast('겹침 없음 — 교집합 불가');return;}
  const poly=simplifySpacePoly(inter.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})));
  if(poly.length<3){cmdToast('교집합 결과 유효하지 않음');return;}
  const oldPoly=A.polygon.map(p=>({x:p.x,y:p.y}));
  A.vertexIds=polygonToVertexIds(poly);
  syncSpaceWalls(A,oldPoly);
  // B 삭제 + B의 자식 객체 A로 이전
  ['openings','furniture','fixtures','lights','electric','hvac'].forEach(k=>{
    STATE[k].forEach(o=>{if(o.spaceId===B.id) o.spaceId=A.id;});
  });
  STATE.walls=STATE.walls.filter(w=>w.spaceId!==B.id);
  STATE.spaces=STATE.spaces.filter(s=>s.id!==B.id);
  STATE.boxSelection=[];
  STATE.selectedKind='space';STATE.selectedId=A.id;
  cleanupOrphanVertices();
  saveHistory();renderAll();refreshUI();
  cmdToast('교집합 완료 — '+parseFloat(spArea(A).toFixed(2))+'㎡');
}

// ===== 키보드 =====
document.addEventListener('keydown',e=>{
  // Shift는 INPUT focus 무관하게 항상 감지
  if(e.key==='Shift'){
    STATE.shiftPressed=true;
    _refreshShiftOrtho();
  }
  // v5.9: Ctrl(또는 Mac Cmd) 누르고 있으면 자석 스냅 일시 OFF
  if(e.key==='Control'||e.key==='Meta') STATE.ctrlPressed=true;
  // Boolean 메뉴 / 라이브러리 팝업 / 스케일 보정 — Esc로 취소
  if(e.key==='Escape'){
    hideBoolMenu();
    if(typeof hideLibPopup==='function') hideLibPopup();
    document.getElementById('canvas-help')?.classList.remove('visible'); // 2026-08-22: 단축키 모달
    if(typeof hideTextModal==='function') hideTextModal();               // 2026-08-22: ? 도움말 모달
    if(_scaleCalActive){_scaleCalActive=false;_scaleCalP1=null;showStatus('스케일 보정 취소');}
  }
  // 입력창에 포커스가 있으면 단축키 가로채지 않음 (명령어 입력 우선)
  // 방향키만 예외 — 미세이동 가능하도록 통과 (단, cmd-input에 값이 있으면 텍스트 커서 이동)
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA'){
    const isArrow=e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight';
    const inCmdInput=e.target.id==='cmd-input';
    if(isArrow&&inCmdInput&&!STATE.cmdMode&&!e.target.value){
      // cmd-input 비어있고 cmdMode 아닐 때만 방향키 미세이동 통과
      e.target.blur();
    } else {
      return; // 모든 다른 키는 입력창이 처리
    }
  }
  // v5.9: 방향키 미세이동 — 선택 객체를 1mm씩 (Shift 동시 누르면 10mm)
  if(e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight'){
    const step=e.shiftKey?10:1;
    let dx=0,dy=0;
    if(e.key==='ArrowLeft') dx=-step;
    else if(e.key==='ArrowRight') dx=step;
    else if(e.key==='ArrowUp') dy=-step;
    else if(e.key==='ArrowDown') dy=step;
    if(_nudgeSelected(dx,dy)){e.preventDefault();return;}
  }
  // v5.2: F8 직교 토글
  if(e.key==='F8'){e.preventDefault();toggleOrtho();return;}
  if(e.ctrlKey||e.metaKey){
    if(e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey) redo(); else undo();return;}
    if(e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
    // v5.2: Ctrl+L 직교 토글 (AutoCAD 보조 단축키)
    if(e.key.toLowerCase()==='l'){e.preventDefault();toggleOrtho();return;}
    return; // 기타 Ctrl+키는 도구 단축키로 안 흐르게
  }
  // v5.9: 고스트 회전/미러 (라이브러리 배치 모드 한정)
  const isLibMode=['furniture','furniture2','fixture','light','electric','hvac'].includes(STATE.selectedTool)&&STATE.selectedLib;
  if(isLibMode&&!STATE.selectedKind){
    if(e.key.toLowerCase()==='r'){
      e.preventDefault();
      _libPlaceAngle=(_libPlaceAngle+(e.shiftKey?-90:90)+360)%360;
      cmdToast('고스트 회전: '+_libPlaceAngle+'°');
      if(_libLastPos) updateLibPlacementPreview(_libLastPos);
      return;
    }
    if(e.key.toLowerCase()==='f'){
      e.preventDefault();
      _libPlaceFlipped=!_libPlaceFlipped;
      cmdToast('고스트 미러: '+(_libPlaceFlipped?'ON':'OFF'));
      if(_libLastPos) updateLibPlacementPreview(_libLastPos);
      return;
    }
  }
  switch(e.key.toLowerCase()){
    case 'v':setTool('select');break;
    case 'r':if(STATE.selectedKind&&STATE.selectedId) rotateSelected();else setTool('rect');break;
    case 'g':setTool('circle');break;
    case 'p':setTool('polygon');break;
    case 'a':setTool('arc');break;  // v5.6: A = arc (단독)
    case 'l':setTool('line');break;
    case 'j':setTool('xline');cmdToast('무한 안내선 — 기준점 클릭 후 방향점 클릭 / Shift=수평·수직');break; // v5.9: 무한 안내선 (XLINE)
    case 'b':setTool('wall');break;
    case 's':setTool('gabyeok');break; // v5.9: 가벽
    case 'q':setTool('pillar');cmdToast('기둥 — 좌측 패널에서 형태/크기 설정 후 클릭으로 배치');break; // v5.9: 기둥
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
    case '`':setTool('leader');cmdToast('지시선 — 화살표 끝점 클릭, 더블클릭으로 텍스트 입력');break;
    // v5.6: 1~5 = 라이브러리 카테고리
    case '1':setTool('furniture');setLibCategory('furniture');break;
    case '2':setTool('fixture');setLibCategory('fixture');break;
    case '3':setTool('light');setLibCategory('light');break;
    case '4':setTool('electric');setLibCategory('electric');break;
    case '5':setTool('hvac');setLibCategory('hvac');break;
    case '6':setTool('furniture2');setLibCategory('furniture2');break; // 2026-08-24: 가구2 (픽스)
    case 'enter':
      e.preventDefault();
      if(STATE.selectedTool==='leader'&&leaderDrawState) finishLeader();
      else if(STATE.selectedTool==='polygon'&&freePolyState) finishFreePolygon(); // v5.9
      else doEnterAction();
      break;
    case ' ':
      e.preventDefault();
      doEnterAction();
      break;
    case 'escape':drawState=null;STATE.measureFirst=null;offsetState=null;polyState=null;polyClickGuard=false;
      leaderDrawState=null;
      freePolyState=null;document.getElementById('polyclose-fab')?.classList.add('hidden'); // v5.9
      drawGroup.destroyChildren();previewLayer.batchDraw();deselect();
      if(STATE.cmdMode) exitCmdMode();
      STATE.boxSelection=[];renderAll();
      break;
    case 'delete':case 'backspace':
      // 2026-08-19: Backspace 는 "글자 지우기" 의도가 대부분 (태블릿 키보드 커버엔 Delete 키가 없음)
      //  → 태블릿 또는 명령 입력 단계에서는 객체를 지우지 않고 명령창으로 포커스만 이동.
      //    객체 삭제는 Delete 키 / 퀵바 Del / 길게 누르기 메뉴 "삭제" 로.
      if(e.key==='Backspace'&&(STATE.cmdMode||(STATE.touch&&STATE.touch.enabled))){
        e.preventDefault();
        const ci=document.getElementById('cmd-input');
        if(ci){ci.focus();try{ci.setSelectionRange(ci.value.length,ci.value.length);}catch(_){}}
        if(!STATE.cmdMode&&typeof cmdToast==='function') cmdToast('삭제는 Del 버튼 / 길게 누르기 → 삭제');
        break;
      }
      if(!deleteBoxSelection()) deleteSelected();
      break;
  }
});
document.addEventListener('keyup',e=>{
  if(e.key==='Shift'){STATE.shiftPressed=false;_refreshShiftOrtho();}
  if(e.key==='Control'||e.key==='Meta') STATE.ctrlPressed=false;
  if(e.key==='Alt'){stage.container().style.cursor='';}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Alt'&&STATE.selectedTool==='select'){stage.container().style.cursor='copy';e.preventDefault();}
});


}
