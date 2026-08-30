'use strict';
// ===== KONVA 전역 변수 =====
var container, stage, bgLayer, mainLayer, previewLayer, groups, labelGroup, drawGroup, snapGroup, flashGroup, ghostHintGroup;
var labelSpacesGroup, labelOpeningsGroup; // v5.9.4: 증분 렌더 — 라벨 소유 렌더러별 분리 (공유 시 스킵 불가)

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
  curves:new Konva.Group(), // v5.9: 자유곡선 (Bezier)
  hvac:new Konva.Group(), // v5.6
  leaders:new Konva.Group(), // v5.9
  xlines:new Konva.Group(), // v5.9: 무한 안내선 (XLINE)
  pillars:new Konva.Group(), // v5.9: 기둥 (RC) — 내력벽과 함께 최상단
  spaceHandles:new Konva.Group(), // v5.9: 공간 vertex 편집 핸들 (선택 시만 표시, 가장 위 z-order)
  printFrame:new Konva.Group(), // 2026-08-28: 화면에서 잡는 인쇄 영역 틀 (최상단, 인쇄엔 미포함)
};
// v5.9: 공간(fill 배경) → 벽(상단) 순서 — 벽이 위에 그려져 클릭 가능, 공간 fill에 가려지지 않음
mainLayer.add(groups.spaces);mainLayer.add(groups.walls);mainLayer.add(groups.openings);
mainLayer.add(groups.fixtures);mainLayer.add(groups.furniture);mainLayer.add(groups.electric);
mainLayer.add(groups.lights);mainLayer.add(groups.dimensions);mainLayer.add(groups.text);
mainLayer.add(groups.circles);mainLayer.add(groups.arcs); // v5.3
mainLayer.add(groups.curves); // v5.9: 자유곡선
mainLayer.add(groups.hvac); // v5.6
mainLayer.add(groups.leaders); // v5.9
mainLayer.add(groups.xlines); // v5.9: 무한 안내선 — 벽 위, 핸들 아래 (클릭 선택 가능)
mainLayer.add(groups.pillars); // v5.9: 기둥 — 벽 위로
mainLayer.add(groups.spaceHandles); // v5.9: 핸들이 가장 위 — 벽보다 위에서 클릭 가능
mainLayer.add(groups.printFrame);   // 2026-08-28: 인쇄 영역 틀은 모든 것 위
labelGroup=new Konva.Group({listening:false});
labelSpacesGroup=new Konva.Group({listening:false});
labelOpeningsGroup=new Konva.Group({listening:false});
labelGroup.add(labelSpacesGroup);labelGroup.add(labelOpeningsGroup);
drawGroup=new Konva.Group({listening:false});
snapGroup=new Konva.Group({listening:false}); // v5.2: 스냅 마커 글로우
ghostHintGroup=new Konva.Group({listening:false}); // v5.9: 고스트 스냅 힌트 (선 위 잠재적 스냅점 미리 표시)
flashGroup=new Konva.Group({listening:false});
previewLayer.add(labelGroup);previewLayer.add(drawGroup);previewLayer.add(ghostHintGroup);previewLayer.add(snapGroup);previewLayer.add(flashGroup);

}

// ===== 좌표 + 스냅 + 그리드 + VEF + 히스토리 + 렌더 함수 =====
// ===== 좌표 + 스냅 =====
// 2026-08-19: 줌 한계 단일 정의 — 휠·버튼·핀치·명령 모두 clampZoom 사용 (태블릿 줌아웃 강화: 20% → 5%)
const ZOOM_MIN=0.05,ZOOM_MAX=8;
function clampZoom(z){return Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,isFinite(z)?z:1));}
function mmToPx(mm){return(mm/1000)*STATE.scale*STATE.zoom;}
function pxToMm(px){return Math.round((px/STATE.zoom/STATE.scale)*1000);}
// 2026-08-19: 스냅 없는 순수 커서 좌표 (객체 드래그용 — 커서 자체가 주변 꼭짓점에 붙어 튀는 현상 방지)
function rawMm(pos){return{x:pxToMm(pos.x-STATE.offsetX),y:pxToMm(pos.y-STATE.offsetY)};}
// 2026-08-19: 스냅 반경을 "화면 px" 기준으로 환산 — 줌아웃하면 mm 반경이 커지고, 손가락은 마우스보다 넓게
const SNAP_PX={mouse:14,pen:18,touch:28};
function snapRadiusMm(minMm){
  const t=(STATE.touch&&STATE.touch.lastType)||'mouse';
  const px=SNAP_PX[t]||SNAP_PX.mouse;
  return Math.max(minMm||50,Math.min(1500,pxToMm(px)));
}
// 2026-08-27: 치수 입력 계산식 (대표 지시) — 6000/2, (1200+800)/2, 3*900 등
//  eval 미사용 재귀 하강 파서. + - * / ( ) 와 소수점, mm 접미사, 공백/천단위 콤마 허용.
//  실패 시 null → 호출부가 기존 값 유지
function evalDim(raw){
  if(raw===null||raw===undefined) return null;
  let t=String(raw).trim();
  if(!t) return null;
  t=t.replace(/mm/gi,'').replace(/÷/g,'/').replace(/[·∙]/g,'*').replace(/\s+/g,'');
  t=t.replace(/(\d),(?=\d{3}(\D|$))/g,'$1'); // 1,200 → 1200 (좌표 구분 콤마는 호출부가 먼저 분리)
  if(!/^[0-9+\-*/().]+$/.test(t)) return null;
  let i=0;
  function factor(){
    if(t[i]==='+'){i++;return factor();}
    if(t[i]==='-'){i++;const v=factor();return v===null?null:-v;}
    if(t[i]==='('){
      i++;const v=expr();
      if(t[i]!==')') return null;
      i++;return v;
    }
    const st=i;
    while(i<t.length&&/[0-9.]/.test(t[i])) i++;
    if(i===st) return null;
    const tok=t.slice(st,i);
    if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(tok)) return null; // 2026-08-27: '1..2' 등 잘못된 숫자 거부
    const v=parseFloat(tok);
    return isFinite(v)?v:null;
  }
  function term(){
    let v=factor(); if(v===null) return null;
    while(t[i]==='*'||t[i]==='/'){
      const op=t[i++]; const r=factor(); if(r===null) return null;
      if(op==='*') v*=r; else { if(r===0) return null; v/=r; }
    }
    return v;
  }
  function expr(){
    let v=term(); if(v===null) return null;
    while(t[i]==='+'||t[i]==='-'){
      const op=t[i++]; const r=term(); if(r===null) return null;
      v = op==='+' ? v+r : v-r;
    }
    return v;
  }
  const out=expr();
  return (i===t.length&&out!==null&&isFinite(out))?out:null;
}
// mm 정수 결과 (헌법: mm 정수)
function evalDimInt(raw){
  const v=evalDim(raw);
  return v===null?null:Math.round(v);
}
function snapMm(mm){
  // v5.9: Ctrl 누르면 그리드 스냅도 OFF (자유 입력)
  if(STATE.ctrlPressed) return Math.round(mm);
  return STATE.snap.grid?Math.round(mm/STATE.gridSize)*STATE.gridSize:Math.round(mm);
}
// v5.9: 두 무한 직선의 교차점 (각 직선은 두 점으로 정의, 세그먼트 아님)
function lineLineIntersect(p1,p2,p3,p4){
  const x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y,x3=p3.x,y3=p3.y,x4=p4.x,y4=p4.y;
  const denom=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
  if(Math.abs(denom)<1e-6) return null; // 평행
  const px=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/denom;
  const py=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/denom;
  return {x:px,y:py};
}
// 2026-08-27: excludeIds — 드래그 중인 객체가 '자기 자신'에 스냅해 제자리로 되돌아가던 문제 (대표 보고)
function snapToEndpoint(mm,excludeIds){
  // v5.9: Ctrl 누르면 자석 스냅 OFF
  if(STATE.ctrlPressed) return {pt:mm,snapped:false};
  if(!STATE.snap.endpoint) return {pt:mm,snapped:false};
  const _ex=excludeIds?(excludeIds instanceof Set?excludeIds:new Set([].concat(excludeIds))):null;
  const _skip=id=>!!(_ex&&id&&_ex.has(id));
  const threshold=Math.max(300,snapRadiusMm()); // 2026-08-19: 터치·줌아웃 시 반경 확대 (마우스 100%에선 기존 300mm 유지)
  let nearest=null,minD=threshold;
  // 공간 폴리곤 점
  STATE.spaces.forEach(s=>{if(_skip(s.id))return;s.polygon.forEach(p=>{
    const dx=p.x-mm.x,dy=p.y-mm.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<minD){minD=d;nearest={x:p.x,y:p.y};}
  });});
  // 벽 끝점 + 중점 — 도구별 격리: 일반 벽 그리기 중엔 내력벽 무시, 내력벽 그리기 중엔 일반벽 무시
  const _isDrawingBearing=STATE.selectedTool==='gabyeok';
  const _isDrawingRegular=STATE.selectedTool==='wall'||STATE.selectedTool==='line';
  STATE.walls.forEach(w=>{
    if(_skip(w.id)) return;
    const isB=w.wallType==='bearing';
    if(_isDrawingBearing&&!isB) return; // 내력벽 그릴 때 일반벽 끝점 무시
    if(_isDrawingRegular&&isB) return;  // 일반벽 그릴 때 내력벽 끝점 무시
    [{x:w.x1,y:w.y1},{x:w.x2,y:w.y2},{x:(w.x1+w.x2)/2,y:(w.y1+w.y2)/2}].forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest=p;}
    });
  });
  // v5.9: 내력벽끼리의 중심선 교차점 스냅 — "선과 선이 만나는 곳은 모두 점" 원칙
  // v5.9 fix: T-자 교차(끝점이 다른 벽 가까이 있지만 살짝 못 닿은 경우)도 검출 — 200mm 연장 허용
  const bearingWalls=STATE.walls.filter(w=>w.wallType==='bearing');
  const extIntersect=(p1,p2,p3,p4,extPx=200)=>{
    const x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y,x3=p3.x,y3=p3.y,x4=p4.x,y4=p4.y;
    const denom=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
    if(Math.abs(denom)<1e-6) return null;
    const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/denom;
    const u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/denom;
    const len12=Math.hypot(x2-x1,y2-y1)||1;
    const len34=Math.hypot(x4-x3,y4-y3)||1;
    const tExt=extPx/len12, uExt=extPx/len34;
    if(t<-tExt||t>1+tExt||u<-uExt||u>1+uExt) return null;
    return {x:x1+t*(x2-x1), y:y1+t*(y2-y1)};
  };
  for(let i=0;i<bearingWalls.length;i++){
    for(let j=i+1;j<bearingWalls.length;j++){
      const a=bearingWalls[i], b=bearingWalls[j];
      const ip=extIntersect({x:a.x1,y:a.y1},{x:a.x2,y:a.y2},{x:b.x1,y:b.y1},{x:b.x2,y:b.y2},200);
      if(!ip) continue;
      const dx=ip.x-mm.x, dy=ip.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:Math.round(ip.x),y:Math.round(ip.y)};}
    }
  }
  // v5.9: 도어/창 중심점 스냅 — 라이브러리 객체와 동일하게 끌어당김
  STATE.openings.forEach(o=>{
    if(_skip(o.id)) return;
    const dx=o.x-mm.x, dy=o.y-mm.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<minD){minD=d;nearest={x:o.x,y:o.y};}
  });
  // v5.4: 원·아크 중심 + 4분점 (사분점)
  STATE.circles.forEach(c=>{
    if(_skip(c.id)) return;
    const pts=[{x:c.x,y:c.y},{x:c.x+c.radius_mm,y:c.y},{x:c.x-c.radius_mm,y:c.y},{x:c.x,y:c.y+c.radius_mm},{x:c.x,y:c.y-c.radius_mm}];
    pts.forEach(p=>{
      const dx=p.x-mm.x,dy=p.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:Math.round(p.x),y:Math.round(p.y)};}
    });
  });
  STATE.arcs.forEach(a=>{
    if(_skip(a.id)) return;
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
  // v5.9: 곡선 (Bezier) — 각 segment의 앵커 + 컨트롤 + 중점
  if(STATE.curves) STATE.curves.forEach(cv=>{
    if(!cv.segments||_skip(cv.id)) return;
    cv.segments.forEach(s=>{
      const t=0.5, mt=1-t;
      const midX=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
      const midY=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
      [s.p0,s.p3,s.p1,s.p2,{x:midX,y:midY}].forEach(p=>{
        const dx=p.x-mm.x,dy=p.y-mm.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<minD){minD=d;nearest={x:Math.round(p.x),y:Math.round(p.y)};}
      });
    });
  });
  // v5.4: 라이브러리 객체 중심점 (v5.9: hvac도 포함)
  [STATE.furniture,STATE.fixtures,STATE.lights,STATE.electric,STATE.hvac||[]].forEach(arr=>{
    arr.forEach(o=>{
      if(_skip(o.id)) return; // 2026-08-27: 자기 자신 제외
      const dx=o.x-mm.x,dy=o.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:o.x,y:o.y};}
    });
  });
  // v5.9: 기둥 — 중심점 + 폴리곤 corner 점 모두 스냅 대상
  if(STATE.pillars) STATE.pillars.forEach(p=>{
    if(_skip(p.id)) return;
    [{x:p.x,y:p.y},...pillarPolygon(p)].forEach(pt=>{
      const dx=pt.x-mm.x, dy=pt.y-mm.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<minD){minD=d;nearest={x:pt.x,y:pt.y};}
    });
  });
  // v5.9: 무한 안내선(xline) 교차점 스냅 — 안내선끼리 / 안내선×벽이 만나는 곳은 점
  if(STATE.xlines&&STATE.xlines.length){
    const xls=STATE.xlines;
    for(let i=0;i<xls.length;i++)for(let j=i+1;j<xls.length;j++){
      const ip=lineLineIntersect({x:xls[i].x1,y:xls[i].y1},{x:xls[i].x2,y:xls[i].y2},{x:xls[j].x1,y:xls[j].y1},{x:xls[j].x2,y:xls[j].y2});
      if(ip){const d=Math.hypot(ip.x-mm.x,ip.y-mm.y);if(d<minD){minD=d;nearest={x:Math.round(ip.x),y:Math.round(ip.y)};}}
    }
    xls.forEach(xl=>{
      STATE.walls.forEach(w=>{
        const ip=lineLineIntersect({x:xl.x1,y:xl.y1},{x:xl.x2,y:xl.y2},{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
        if(!ip) return;
        const dxw=w.x2-w.x1, dyw=w.y2-w.y1, l2=dxw*dxw+dyw*dyw; if(l2<1) return;
        const t=((ip.x-w.x1)*dxw+(ip.y-w.y1)*dyw)/l2; // 교차점이 벽 세그먼트 범위 안
        if(t<-0.05||t>1.05) return;
        const d=Math.hypot(ip.x-mm.x,ip.y-mm.y);
        if(d<minD){minD=d;nearest={x:Math.round(ip.x),y:Math.round(ip.y)};}
      });
    });
  }
  // v5.9: 점 스냅 결과 우선 (코너·끝점·중점·교차점은 항상 작동)
  if(nearest) return {pt:nearest,snapped:true,type:'point'};
  // v5.9 NEW: 수직 발(perpendicular foot) — 항상 작동, 작은 임계값 80mm
  // 끝점/중점/코너 다음 가장 신뢰성 있는 스냅. 벽 위 임의 지점에 직각으로 떨어뜨림
  {
    const perpThreshold=120;
    let pMin=perpThreshold, pPt=null, pEdge=null;
    STATE.walls.forEach(w=>{
      const isB=w.wallType==='bearing';
      if(_isDrawingBearing&&!isB) return;
      if(_isDrawingRegular&&isB) return;
      const dx=w.x2-w.x1, dy=w.y2-w.y1;
      const len2=dx*dx+dy*dy; if(len2<1) return;
      const t=Math.max(0,Math.min(1,((mm.x-w.x1)*dx+(mm.y-w.y1)*dy)/len2));
      const fx=w.x1+t*dx, fy=w.y1+t*dy;
      const d=Math.hypot(fx-mm.x,fy-mm.y);
      if(d<pMin){pMin=d;pPt={x:Math.round(fx),y:Math.round(fy)};pEdge={ax:w.x1,ay:w.y1,bx:w.x2,by:w.y2};}
    });
    // v5.9: 무한 안내선 위 투영 — 가까우면 그 선 위에 떨어뜨림 (안내선을 따라 그리기)
    if(STATE.xlines) STATE.xlines.forEach(xl=>{
      const dx=xl.x2-xl.x1, dy=xl.y2-xl.y1; const len2=dx*dx+dy*dy; if(len2<1) return;
      const t=((mm.x-xl.x1)*dx+(mm.y-xl.y1)*dy)/len2; // 무한선이므로 클램프 없음
      const fx=xl.x1+t*dx, fy=xl.y1+t*dy;
      const d=Math.hypot(fx-mm.x,fy-mm.y);
      if(d<pMin){pMin=d;pPt={x:Math.round(fx),y:Math.round(fy)};pEdge={ax:xl.x1,ay:xl.y1,bx:xl.x2,by:xl.y2};}
    });
    if(pPt) return {pt:pPt,snapped:true,type:'perp',edge:pEdge};
  }
  // v5.9: 고스트 스냅 (선 근처 자동 흡착) — 별도 토글로만 작동
  if(!STATE.snap.ghost) return {pt:mm,snapped:false};
  const lineThreshold=400;
  let lineMinD=lineThreshold;
  let lineNearest=null;
  let lineEdge=null; // {ax,ay,bx,by} — 마커를 이 선에 수직으로 그리기 위함
  STATE.walls.forEach(w=>{
    // v5.9: 도구 격리 (벽/내력벽 그릴 때 반대 종류 무시) — point 스냅과 일관성
    const isB=w.wallType==='bearing';
    if(_isDrawingBearing&&!isB) return;
    if(_isDrawingRegular&&isB) return;
    const dx=w.x2-w.x1, dy=w.y2-w.y1;
    const len2=dx*dx+dy*dy;
    if(len2<1) return;
    const t=Math.max(0,Math.min(1,((mm.x-w.x1)*dx+(mm.y-w.y1)*dy)/len2));
    const fx=w.x1+t*dx, fy=w.y1+t*dy;
    const d=Math.hypot(fx-mm.x,fy-mm.y);
    if(d<lineMinD){lineMinD=d;lineNearest={x:Math.round(fx),y:Math.round(fy)};lineEdge={ax:w.x1,ay:w.y1,bx:w.x2,by:w.y2};}
  });
  STATE.spaces.forEach(s=>{
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
      const dx=b.x-a.x, dy=b.y-a.y;
      const len2=dx*dx+dy*dy;
      if(len2<1) continue;
      const t=Math.max(0,Math.min(1,((mm.x-a.x)*dx+(mm.y-a.y)*dy)/len2));
      const fx=a.x+t*dx, fy=a.y+t*dy;
      const d=Math.hypot(fx-mm.x,fy-mm.y);
      if(d<lineMinD){lineMinD=d;lineNearest={x:Math.round(fx),y:Math.round(fy)};lineEdge={ax:a.x,ay:a.y,bx:b.x,by:b.y};}
    }
  });
  // v5.9: 원/타원 둘레 스냅 (각도 샘플링 + 접선)
  STATE.circles.forEach(c=>{
    const rx=c.rx_mm!=null?c.rx_mm:c.radius_mm;
    const ry=c.ry_mm!=null?c.ry_mm:c.radius_mm;
    const rot=(c.rotation||0)*Math.PI/180;
    const cosA=Math.cos(rot), sinA=Math.sin(rot);
    // 360° 36단계로 샘플링 (10°마다)
    let bestT=0,bestD=Infinity,bestPt=null;
    for(let deg=0;deg<360;deg+=10){
      const θ=deg*Math.PI/180;
      const lx=rx*Math.cos(θ), ly=ry*Math.sin(θ);
      const px=c.x+lx*cosA-ly*sinA;
      const py=c.y+lx*sinA+ly*cosA;
      const d=Math.hypot(px-mm.x,py-mm.y);
      if(d<bestD){bestD=d;bestT=θ;bestPt={x:px,y:py};}
    }
    if(bestPt&&bestD<lineMinD){
      lineMinD=bestD;
      lineNearest={x:Math.round(bestPt.x),y:Math.round(bestPt.y)};
      // 접선 방향 (둘레 점에서의 ellipse 접선)
      const tx_loc=-rx*Math.sin(bestT), ty_loc=ry*Math.cos(bestT);
      const tx=tx_loc*cosA-ty_loc*sinA, ty=tx_loc*sinA+ty_loc*cosA;
      lineEdge={ax:bestPt.x-tx,ay:bestPt.y-ty,bx:bestPt.x+tx,by:bestPt.y+ty};
    }
  });
  // v5.9: 곡선(Bezier) 스냅 — segment마다 t 샘플링
  if(STATE.curves) STATE.curves.forEach(cv=>{
    if(!cv.segments) return;
    cv.segments.forEach(s=>{
      let bestT=0,bestD=Infinity,bestPt=null;
      for(let i=0;i<=20;i++){
        const t=i/20, mt=1-t;
        const x=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
        const y=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
        const d=Math.hypot(x-mm.x,y-mm.y);
        if(d<bestD){bestD=d;bestT=t;bestPt={x,y};}
      }
      if(bestPt&&bestD<lineMinD){
        lineMinD=bestD;
        lineNearest={x:Math.round(bestPt.x),y:Math.round(bestPt.y)};
        // 접선 (Bezier 미분: B'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2))
        const t=bestT, mt=1-t;
        const tx=3*mt*mt*(s.p1.x-s.p0.x)+6*mt*t*(s.p2.x-s.p1.x)+3*t*t*(s.p3.x-s.p2.x);
        const ty=3*mt*mt*(s.p1.y-s.p0.y)+6*mt*t*(s.p2.y-s.p1.y)+3*t*t*(s.p3.y-s.p2.y);
        const tlen=Math.hypot(tx,ty)||1;
        const ux=tx/tlen*30, uy=ty/tlen*30;
        lineEdge={ax:bestPt.x-ux,ay:bestPt.y-uy,bx:bestPt.x+ux,by:bestPt.y+uy};
      }
    });
  });
  return lineNearest?{pt:lineNearest,snapped:true,type:'ghost',edge:lineEdge}:{pt:mm,snapped:false};
}

// v5.8: 공간 변(edge) 스냅 — 점을 다른 공간 폴리곤 변에 투영해서 가장 가까운 점 찾기
// 공간 드래그 시 사용. excludeId = 자기 자신 공간은 제외
function snapPointToSpaceEdges(mm,excludeId,thresholdMm){
  if(!STATE.snap.endpoint) return {pt:mm,snapped:false};
  // v5.9 fix: 그리드 스냅 활성+gridSize 1mm이면 threshold가 2mm가 되어 기능이 사실상 죽던 버그 — 최소 200mm 보장
  // 2026-08-19: 호출자가 반경(mm)을 넘기면 그 값 사용 (드래그 스냅은 화면 px 기준 반경)
  const threshold=thresholdMm||Math.max(200,STATE.snap.grid?STATE.gridSize*2:0); // mm (v5.8 스펙: 200mm 이내 흡착)
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
// 2026-08-27: 드래그용 그리드 스냅 — '이동량'이 아니라 '결과 위치'가 격자에 맞도록 (대표 보고)
//  기존엔 delta 만 격자화해 원래 좌표의 어긋남이 그대로 남아 격자에 절대 안 붙었다.
function gridQuantizeDelta(refX,refY,sx,sy,orthoAxisLocked){
  if(!STATE.snap.grid||STATE.ctrlPressed) return {sx:Math.round(sx),sy:Math.round(sy)};
  const g=Math.max(1,STATE.gridSize||1);
  const qx=(orthoAxisLocked==='x')?0:Math.round((refX+sx)/g)*g-refX;
  const qy=(orthoAxisLocked==='y')?0:Math.round((refY+sy)/g)*g-refY;
  return {sx:Math.round(qx),sy:Math.round(qy)};
}
function _dragRefPoint(base){
  if(!base) return {x:0,y:0};
  if(typeof base.x==='number') return {x:base.x,y:base.y};
  if(base.polygon&&base.polygon.length) return {x:base.polygon[0].x,y:base.polygon[0].y};
  if(typeof base.x1==='number') return {x:base.x1,y:base.y1};
  return {x:0,y:0};
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
// v5.9: 마우스 호버 시 스냅 마커 자동 갱신 — 도구 선택 + 자석 활성 시 항상 표시
function updateSnapMarker(pos){
  // 2026-08-19: 객체 드래그 중엔 커서 글로우 대신 드래그 정렬 가이드만 표시
  if(typeof dragMoveState!=='undefined'&&dragMoveState&&typeof isMouseDown!=='undefined'&&isMouseDown){
    STATE.snapMarker=null;STATE.snapCursor=null;drawSnapMarker();return;
  }
  if(pos&&STATE.snap.endpoint&&!STATE.ctrlPressed){
    const mm={x:pxToMm(pos.x-STATE.offsetX),y:pxToMm(pos.y-STATE.offsetY)};
    const r=snapToEndpoint(mm);
    if(r.snapped){
      STATE.snapMarker={x:r.pt.x,y:r.pt.y,type:r.type||'point',edge:r.edge||null};
      STATE.snapCursor={x:mm.x,y:mm.y};
    }else{
      STATE.snapMarker=null;
      STATE.snapCursor=null;
    }
  }else{
    STATE.snapMarker=null;
    STATE.snapCursor=null;
  }
  drawSnapMarker();
}
// 2026-08-19: 공간 드래그 정렬 가이드 — 붙은 축에 화면 끝까지 점선 + 붙은 꼭짓점 점
function drawDragSnapGuides(){
  const g=STATE.dragSnapGuides; if(!g||!g.length) return;
  const w=stage.width(),h=stage.height(),col='#5BC9F5';
  g.forEach(gd=>{
    if(gd.axis==='x'){const x=STATE.offsetX+mmToPx(gd.mm);
      snapGroup.add(new Konva.Line({points:[x,0,x,h],stroke:col,strokeWidth:1,dash:[6,4],opacity:0.9,listening:false}));}
    else if(gd.axis==='y'){const y=STATE.offsetY+mmToPx(gd.mm);
      snapGroup.add(new Konva.Line({points:[0,y,w,y],stroke:col,strokeWidth:1,dash:[6,4],opacity:0.9,listening:false}));}
    if(gd.pt){const x=STATE.offsetX+mmToPx(gd.pt.x),y=STATE.offsetY+mmToPx(gd.pt.y);
      snapGroup.add(new Konva.Circle({x,y,radius:STATE.isMobile?7:5,fill:col,stroke:'#000',strokeWidth:1,opacity:0.95,listening:false,
        shadowColor:col,shadowBlur:8,shadowOpacity:0.9}));}
  });
}
function drawSnapMarker(){
  snapGroup.destroyChildren();
  drawDragSnapGuides();
  if(!STATE.snapMarker){previewLayer.batchDraw();return;}
  const x=STATE.offsetX+mmToPx(STATE.snapMarker.x);
  const y=STATE.offsetY+mmToPx(STATE.snapMarker.y);
  const r=STATE.isMobile?12:7;
  // v5.9: 수직 발(perp) 스냅 — 작은 직각 표시 (┴) 형태
  if(STATE.snapMarker.type==='perp'){
    let nx=0,ny=-1, tx=1,ty=0;
    if(STATE.snapMarker.edge){
      const e=STATE.snapMarker.edge;
      const dxE=e.bx-e.ax, dyE=e.by-e.ay;
      const lenE=Math.hypot(dxE,dyE);
      if(lenE>0.5){tx=dxE/lenE; ty=dyE/lenE; nx=-ty; ny=tx;}
    }
    const L=8;
    // ⊥ 모양: 선 위에 짧은 평행선 + 그 위에 수직선
    snapGroup.add(new Konva.Line({points:[x-tx*L,y-ty*L,x+tx*L,y+ty*L],stroke:'#5BC9F5',strokeWidth:2,lineCap:'round',opacity:0.95}));
    snapGroup.add(new Konva.Line({points:[x,y,x+nx*L*0.9,y+ny*L*0.9],stroke:'#5BC9F5',strokeWidth:2,lineCap:'round',opacity:0.95}));
    snapGroup.add(new Konva.Rect({x:x-2.5,y:y-2.5,width:5,height:5,fill:'#5BC9F5',stroke:'#000',strokeWidth:0.8}));
    previewLayer.batchDraw();
    return;
  }
  // v5.9: 고스트 스냅 — 라인에 수직으로 짧은 대시 + 작은 사각 (선 위에 묻히지 않게)
  if(STATE.snapMarker.type==='ghost'){
    let nx=0,ny=-1; // 기본 수직 (위 방향)
    if(STATE.snapMarker.edge){
      const e=STATE.snapMarker.edge;
      const dxE=e.bx-e.ax, dyE=e.by-e.ay;
      const lenE=Math.hypot(dxE,dyE);
      if(lenE>0.5){nx=-dyE/lenE; ny=dxE/lenE;}
    }
    const dashLen=10;
    // 라인에 수직으로 한 일자 대시
    snapGroup.add(new Konva.Line({
      points:[x-nx*dashLen,y-ny*dashLen,x+nx*dashLen,y+ny*dashLen],
      stroke:'#FFE066',strokeWidth:2.5,
      lineCap:'round',opacity:0.95,
      shadowColor:'#000',shadowBlur:3,shadowOpacity:0.6,
    }));
    // 중앙에 작은 사각 (배경 대비로 또렷하게)
    snapGroup.add(new Konva.Rect({
      x:x-2.5,y:y-2.5,width:5,height:5,
      fill:'#FFE066',stroke:'#000',strokeWidth:0.8,
      shadowColor:'#FFE066',shadowBlur:4,shadowOpacity:0.8,
    }));
    previewLayer.batchDraw();return;
  }
  // 코너·끝점·중점·교차점 — 기존 글로우 표시
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
// v5.9: 배경 이미지 노드 캐시 — drawGrid 호출 시마다 재생성 안 하도록
let _bgImageNode=null;
function ensureBgImageNode(){
  if(!STATE.bgImage){_bgImageNode=null;return null;}
  // dataURL 변경 시 새 노드 생성
  if(_bgImageNode&&_bgImageNode._dataURL===STATE.bgImage.dataURL){
    _bgImageNode.x(STATE.offsetX+mmToPx(STATE.bgImage.x_mm||0));
    _bgImageNode.y(STATE.offsetY+mmToPx(STATE.bgImage.y_mm||0));
    // 2026-08-19 fix: 배경 이미지가 줌을 따라가지 않던 버그 — scale 은 줌 100% 기준 화면px/이미지px, 노드에는 ×zoom
    _bgImageNode.scaleX((STATE.bgImage.scale||1)*STATE.zoom);
    _bgImageNode.scaleY((STATE.bgImage.scale||1)*STATE.zoom);
    _bgImageNode.opacity(STATE.bgImage.opacity!=null?STATE.bgImage.opacity:0.5);
    _bgImageNode.listening(!STATE.bgImage.locked);
    return _bgImageNode;
  }
  const img=new Image();
  img.onload=()=>{if(typeof bgLayer!=='undefined') bgLayer.batchDraw();};
  img.src=STATE.bgImage.dataURL;
  _bgImageNode=new Konva.Image({
    image:img,
    x:STATE.offsetX+mmToPx(STATE.bgImage.x_mm||0),
    y:STATE.offsetY+mmToPx(STATE.bgImage.y_mm||0),
    scaleX:(STATE.bgImage.scale||1)*STATE.zoom,
    scaleY:(STATE.bgImage.scale||1)*STATE.zoom,
    opacity:STATE.bgImage.opacity!=null?STATE.bgImage.opacity:0.5,
    listening:!STATE.bgImage.locked,
  });
  _bgImageNode._dataURL=STATE.bgImage.dataURL;
  // 드래그로 이동 가능 (잠금 해제 시)
  _bgImageNode.draggable(true);
  _bgImageNode.on('dragend',()=>{
    if(STATE.bgImage&&!STATE.bgImage.locked){
      const dx=_bgImageNode.x()-STATE.offsetX;
      const dy=_bgImageNode.y()-STATE.offsetY;
      STATE.bgImage.x_mm=Math.round(pxToMm(dx)); // 2026-08-19 fix: 줌 반영
      STATE.bgImage.y_mm=Math.round(pxToMm(dy));
    }
  });
  return _bgImageNode;
}

// ===== 2026-08-27: 인쇄 도면 모드 (대표 지시 — 인쇄물이 도면으로 안 읽히는 문제) =====
//  화면은 어두운 배경에 네온색이 잘 읽히지만, 종이에서는 그 색이 그대로 옅은 색면이 되어
//  선·글씨가 묻힌다. 인쇄 때는 도면 관례대로 '흰 바탕 + 검정 선화'로 바꾼다.
function _pm(){return !!STATE.printMode;}
// 2026-08-29: 칼라 인쇄 (대표 지시) — 공간·가구 색을 살려 제안용 도면으로 낸다
function _pcolor(){return !!STATE.printColor;}
// 채움색 → 아주 밝은 무채색 (선과 글씨가 살아나도록). 투명도는 보존.
function _inkFill(c){
  if(!c||typeof c!=='string'||c==='transparent') return c;
  let r,g,b,a=1;
  if(c.charAt(0)==='#'){
    let h=c.slice(1);
    if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if(h.length===8){a=parseInt(h.slice(6,8),16)/255;h=h.slice(0,6);}
    if(h.length!==6) return '#F2F2F2';
    r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);
  }else if(/^rgba?\(/i.test(c)){
    const m=c.match(/[\d.]+/g)||[];
    r=+m[0]||0;g=+m[1]||0;b=+m[2]||0;a=(m[3]!==undefined)?+m[3]:1;
  }else return '#F2F2F2';
  const L=(0.299*r+0.587*g+0.114*b)/255;
  const v=Math.round(255*(0.82+0.18*L));
  if(a<0.55) return 'transparent'; // 화면용 글로우/헤일로 — 종이에서는 회색 얼룩이 된다
  if(a>=0.999){const hx=v.toString(16).padStart(2,'0');return '#'+hx+hx+hx;}
  return 'rgba('+v+','+v+','+v+','+a.toFixed(3)+')';
}
// 2026-08-29: 칼라 인쇄 — 화면 색을 그대로 쓰되, 종이에서 문제되는 것만 손본다.
//  · 그림자: 회색 얼룩으로 찍힌다  · 흰 글씨: 흰 종이에서 사라진다 → 검정으로 뒤집고 외곽선은 흰색
// 종이에서 사라지는 옆은 선은 진하게 — 화면은 어두운 배경이라 옆은 선도 보였다.
//  색상(색조)은 유지하고 밝기만 낮춘다 — 칼라 인쇄의 색 구분이 죽지 않게.
function _darkenIfPale(c){
  if(!c||typeof c!=='string'||c==='transparent') return c;
  let r,g,b;
  if(c.charAt(0)==='#'){
    let h=c.slice(1);
    if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if(h.length===8) h=h.slice(0,6);
    if(h.length!==6) return c;
    r=parseInt(h.slice(0,2),16);g=parseInt(h.slice(2,4),16);b=parseInt(h.slice(4,6),16);
  }else if(/^rgba?\(/i.test(c)){
    const m=c.match(/[\d.]+/g)||[];r=+m[0]||0;g=+m[1]||0;b=+m[2]||0;
  }else return c;
  const L=(0.299*r+0.587*g+0.114*b)/255;
  if(L<0.72) return c;
  const k=0.48/L;
  const hx=v=>Math.max(0,Math.min(255,Math.round(v*k))).toString(16).padStart(2,'0');
  return '#'+hx(r)+hx(g)+hx(b);
}
function applyPrintColor(){
  try{
    mainLayer.find('Shape').forEach(n=>{
      try{
        if(n.shadowBlur&&n.shadowBlur()){n.shadowBlur(0);n.shadowOpacity(0);}
        const cls=n.getClassName?n.getClassName():'';
        if(cls==='Text'){
          const f=String((n.fill&&n.fill())||'').toLowerCase();
          if(f==='white'||/^#f{3}$|^#f{6}$|^#fff/.test(f)) n.fill('#111111');
          else if(n.fill&&n.fill()) n.fill(_darkenIfPale(n.fill()));
          if(n.stroke&&n.stroke()) n.stroke('#FFFFFF');
          return;
        }
        const op=n.opacity?n.opacity():1;
        if(op<0.05){n.visible(false);return;} // 화면 전용 투명 클릭영역
        if(n.stroke&&n.stroke()) n.stroke(_darkenIfPale(n.stroke())); // 채움은 그대로, 선만
      }catch(_){}
    });
    mainLayer.draw();
  }catch(_){}
}
// 렌더가 끝난 장면 전체를 인쇄용 잉크로 환산 (sceneFunc 로 그린 내력벽은 이미 검정)
function applyPrintInk(){
  try{
    mainLayer.find('Shape').forEach(n=>{
      try{
        if(n.shadowBlur&&n.shadowBlur()){n.shadowBlur(0);n.shadowOpacity(0);}
        const cls=n.getClassName?n.getClassName():'';
        if(cls==='Text'){
          n.fill('#000000');
          if(n.stroke&&n.stroke()) n.stroke('#FFFFFF'); // 헤일로는 흰색 (겹침 가독)
          return;
        }
        // 화면 전용 투명 클릭영역(opacity 0.001)은 인쇄에서 숨긴다
        const op=n.opacity?n.opacity():1;
        if(op<0.05){n.visible(false);return;}
        if(n.fill&&n.fill()) n.fill(_inkFill(n.fill()));
        if(n.stroke&&n.stroke()) n.stroke('#000000');
        if(op<1) n.opacity(1); // 잠금 등으로 흐려진 객체도 도면에는 또렷하게
      }catch(_){}
    });
    mainLayer.draw();
  }catch(_){}
}
// 명시 치수(전체 자동치수 포함)와 같은 변인지 — 인쇄 시 같은 치수가 2중으로 찍히던 문제
function _hasExplicitDim(a,b){
  const ms=STATE.measures;
  if(!ms||!ms.length) return false;
  const T=80, nr=(u,v)=>Math.abs(u-v)<T;
  for(let i=0;i<ms.length;i++){
    const m=ms[i];
    if((nr(m.x1,a.x)&&nr(m.y1,a.y)&&nr(m.x2,b.x)&&nr(m.y2,b.y))||
       (nr(m.x1,b.x)&&nr(m.y1,b.y)&&nr(m.x2,a.x)&&nr(m.y2,a.y))) return true;
  }
  return false;
}
function drawGrid(){
  bgLayer.destroyChildren();
  if(_pm()){bgLayer.batchDraw();return;} // 2026-08-27: 인쇄 도면에는 그리드/배경 트레이싱 없음
  // v5.9: 배경 이미지 (그리드보다 뒤에 깔림)
  const bgImg=ensureBgImageNode();
  if(bgImg) bgLayer.add(bgImg);
  if(!STATE.showGrid){bgLayer.batchDraw();return;}
  const w=stage.width(),h=stage.height();
  const gpx=mmToPx(STATE.gridSize);
  if(gpx<4){bgLayer.batchDraw();return;}
  // v5.9: 테마별 그리드 색상 — 라이트(아이보리)에선 객체 안 가리도록 매우 옅게
  const _theme=document.body&&document.body.getAttribute('data-theme');
  const _isLight=_theme==='architect';
  const minorCol=_isLight?'rgba(20,18,12,0.07)':'#1A1A1A';
  const majorCol=_isLight?'rgba(20,18,12,0.14)':'#2A2A2A';
  const minorW=_isLight?0.4:0.5;
  const majorW=_isLight?0.6:0.8;
  const sx=STATE.offsetX%gpx,sy=STATE.offsetY%gpx;
  for(let x=sx;x<w;x+=gpx) bgLayer.add(new Konva.Line({points:[x,0,x,h],stroke:minorCol,strokeWidth:minorW}));
  for(let y=sy;y<h;y+=gpx) bgLayer.add(new Konva.Line({points:[0,y,w,y],stroke:minorCol,strokeWidth:minorW}));
  // 1m 대격자 — 줌아웃으로 1m 간격이 30px 미만이면 5m → 10m → 50m 간격으로 승격 (방향 감각 유지)
  let majorMm=1000;
  while(mmToPx(majorMm)<=30&&majorMm<50000) majorMm*=(majorMm===1000||majorMm===10000)?5:2;
  const mpx=mmToPx(majorMm);
  if(mpx>30){
    const smx=STATE.offsetX%mpx,smy=STATE.offsetY%mpx;
    for(let x=smx;x<w;x+=mpx) bgLayer.add(new Konva.Line({points:[x,0,x,h],stroke:majorCol,strokeWidth:majorW}));
    for(let y=smy;y<h;y+=mpx) bgLayer.add(new Konva.Line({points:[0,y,w,y],stroke:majorCol,strokeWidth:majorW}));
  }
  // 원점 마커 — 라이트에선 브래스, 다크에선 라임
  const originCol=_isLight?'#B8923D':'#D4FF3D';
  bgLayer.add(new Konva.Circle({x:STATE.offsetX,y:STATE.offsetY,radius:4,fill:originCol}));
  bgLayer.add(new Konva.Text({x:STATE.offsetX+8,y:STATE.offsetY-16,text:'0,0',fontSize:10,fontFamily:'JetBrains Mono',fill:originCol}));
  bgLayer.batchDraw();
}

// ===== 면적 =====
function polyArea(pts){let a=0;for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;a+=pts[i].x*pts[j].y-pts[j].x*pts[i].y;}return Math.abs(a)/2;}
function polyPeri(pts){let p=0;for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;const dx=pts[j].x-pts[i].x,dy=pts[j].y-pts[i].y;p+=Math.sqrt(dx*dx+dy*dy);}return p;}
function spArea(s){
  let a=polyArea(s.polygon);
  if(s.holes&&s.holes.length){
    s.holes.forEach(h=>{a-=polyArea(h);});
  }
  return Math.max(0,a)/1e6;
}
function spPeri(s){return polyPeri(s.polygon)/1000;}
function spCH(s){return s.ceilingHeight_mm||STATE.ceilingHeight;}
function spWall(s){
  // v5.9: 내력벽은 KPI/적산에서 제외 (보여주기 전용)
  const spaceWalls=STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine&&w.wallType!=='bearing');
  let wallArea=0;
  spaceWalls.forEach(w=>{
    const len=Math.hypot(w.x2-w.x1,w.y2-w.y1)/1000;
    wallArea+=len*(w.height_mm||spCH(s))/1000;
  });
  let oa=0;
  // v5.9: subtractMode (single=단면 ×1, double=양면 ×2) — 도어 종류 또는 사용자 설정에 따름
  STATE.openings.filter(o=>o.spaceId===s.id).forEach(o=>{
    const factor=o.subtractMode==='double'?2:1;
    oa+=(o.width_mm*o.height_mm)/1e6*factor;
  });
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
// ===== 2026-08-29: '이 공간 안의 객체' 판정 단일화 (대표 보고 — 공간을 옮겨도 가구가 남는다) =====
//  회전은 폴리곤 안쪽(pointInPolygon)으로 판정하는데 이동은 spaceId 만 봐서,
//  배치 시 spaceId 가 기록되지 않은 객체는 공간만 움직이고 제자리에 남았다.
//  문·창(openings)은 벽 위 점이라 경계 판정이 불안정 → 종전대로 spaceId 로만 본다.
const SPACE_CONTAINED_KINDS=['openings','furniture','fixtures','lights','electric','hvac'];
function spaceContainedObjects(spaceId,kinds){
  const sp=(STATE.spaces||[]).find(s=>s.id===spaceId);
  const poly=sp&&sp.polygon;
  const out={};
  (kinds||SPACE_CONTAINED_KINDS).forEach(k=>{
    const byId=k==='openings';
    out[k]=(STATE[k]||[]).filter(o=>{
      if(!o||!('x' in o)) return false;
      if(o.spaceId===spaceId) return true;
      if(byId||o.spaceId) return false; // 다른 방 소속으로 이미 기록됨
      if(!poly||poly.length<3) return false;
      return typeof pointInPolygon==='function'&&pointInPolygon({x:o.x,y:o.y},poly);
    });
  });
  return out;
}
function rotateSpaceByAngle(spaceId,angleDeg){
  const sp=STATE.spaces.find(s=>s.id===spaceId);
  if(!sp) return;
  // 2026-08-24: 잠금 강화 — 잠긴 공간은 회전 불가
  if(sp.locked){if(typeof cmdToast==='function')cmdToast('잠금된 공간 — 회전 불가');return;}
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
  // v5.9: bearing vertex(내력벽 전용)는 일반벽 그래프에 재사용 안 됨
  // 2026-08-24: 잠긴 객체의 버텍스는 재사용 안 함 — 새 벽/공간이 잠긴 도형과 용접되는 것 방지
  const found=STATE.vertices.find(v=>v.kind!=='bearing'&&!isVertexLocked(v.id)&&Math.hypot(v.x-x,v.y-y)<tol);
  if(found) return found;
  const v={id:makeId('v'),x,y};
  STATE.vertices.push(v);
  return v;
}
// v5.9: 내력벽 전용 vertex — 내력벽들끼리만 공유 (코너 짤림 해결)
function ensureBearingVertex(x,y,tol=30){
  x=Math.round(x);y=Math.round(y);
  const found=STATE.vertices.find(v=>v.kind==='bearing'&&Math.hypot(v.x-x,v.y-y)<tol);
  if(found) return found;
  const v={id:makeId('v'),x,y,kind:'bearing'};
  STATE.vertices.push(v);
  return v;
}
// 2026-08-24: 잠금 강화 — 잠긴 벽/공간이 참조하는 버텍스는 어떤 경로로도 이동 금지 (대표 지시)
function isVertexLocked(vid){
  if(!vid) return false;
  return STATE.walls.some(w=>w.locked&&(w.v1Id===vid||w.v2Id===vid))
      ||STATE.spaces.some(s=>s.locked&&s.vertexIds&&s.vertexIds.includes(vid));
}
function moveVertex(id,x,y){if(isVertexLocked(id))return;const v=getVertex(id);if(v){v.x=Math.round(x);v.y=Math.round(y);}}
function verticesOfObj(obj){
  if(obj.vertexIds) return obj.vertexIds.map(getVertex).filter(Boolean);
  if(obj.v1Id) return [getVertex(obj.v1Id),getVertex(obj.v2Id)].filter(Boolean);
  return [];
}
// VEF: wall/space 팩토리 — getter로 x1/y1/x2/y2, polygon 자동 제공
function makeWallVEF(v1Id,v2Id,props={}){
  // v5.9 fix: 화이트리스트 방식이라 구버전 마이그레이션 시 id/isLine 등 임의 필드가 소실되던 버그
  // → 알 수 없는 필드는 보존하고, flat 좌표(x1..y2)는 getter로 대체되므로 제거
  const {x1:_x1,y1:_y1,x2:_x2,y2:_y2,...rest}=props;
  const w=Object.defineProperties({
    ...rest,
    id:props.id??makeId('w'),v1Id,v2Id,
    thickness:props.thickness??STATE.wallThickness,
    // v5.9: 벽 분류 + 정렬 (적산·렌더링 양쪽에서 사용)
    wallType:props.wallType??'standard', // 'standard' | 'partition' (가벽)
    alignment:props.alignment??(STATE.wallAlignment||'center'), // 'interior'|'center'|'exterior'
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
  // v5.9 fix: 화이트리스트 방식이라 마이그레이션에서 보충한 code/waterproofRecommended/waterproofApplied 등이
  // VEF 변환 시 소실되던 버그 → 알 수 없는 필드 보존, polygon은 getter로 대체되므로 제거
  const {polygon:_poly,vertexIds:_vi,...rest}=props;
  const s=Object.defineProperties({
    ...rest,
    id:props.id??makeId('sp'),
    vertexIds:[...vertexIds],
    holes:props.holes??[], // v5.9: 도넛 hole 폴리곤 배열 [[{x,y},...], ...]
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
  // v5.9: 내력벽 vertex는 공간 vertex와 절대 공유 안 함 — 격리 보장
  const used=new Set();
  return polygon.map(p=>{
    let best=null,bestD=Infinity;
    for(const v of STATE.vertices){
      if(used.has(v.id)) continue;
      if(v.kind==='bearing') continue; // 내력벽 vertex 제외
      if(isVertexLocked(v.id)) continue; // 2026-08-27: 잠긴 객체 버텍스는 재사용 금지 — 스냅은 되되 묶이지는 않는다 (대표 지시)
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
    leaders:STATE.leaders,
    estimateConfig:STATE.estimateConfig,
  });
  STATE.history=STATE.history.slice(0,STATE.historyIdx+1);
  STATE.history.push(snap);
  if(STATE.history.length>50) STATE.history.shift();
  STATE.historyIdx=STATE.history.length-1;
  // 2026-08-24 v6.0: 변경 시 자동 저장 (ui.js, 2초 디바운스)
  if(typeof scheduleAutosave==='function') scheduleAutosave();
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

// v5.9: 잠금 시각효과 — 반투명(0.30) + 점선만 사용 (배지 제거)
// ===== 렌더 — 공간 =====
function renderSpaces(){
  groups.spaces.destroyChildren();
  labelSpacesGroup.destroyChildren();
  /* v5.9.4 PERF: 치수 보조선(공간당 변×5개 미세 Line)을 굵기별 통합 Shape 3개로 일괄 드로잉
     — 수백 공간에서 노드 수 대폭 감소. 색·굵기·시각 결과 동일 */
  const _dimSegs={w05:[],w07:[],w11:[]};
  // 2026-08-27: 공유 변은 한 번만 치수 표기 (VEF 라 두 공간이 같은 좌표를 공유)
  const _dimDone=new Set();
  // 2026-08-27: 인쇄에서는 다른 공간과 맞닿은 변(=내부 칸막이)의 자동치수를 생략한다.
  //  실마다 사방 치수를 넣으면 옆방 안쪽으로 같은 숫자가 겹쳐 들어가 도면이 지저분해진다.
  //  종이에는 도면 바깥 치수 체인만 남기고, 실내 치수가 필요하면 치수 도구로 직접 넣는다.
  const _sharedEdge=new Set();
  if(_pm()){
    const seen=new Set();
    STATE.spaces.forEach(sp=>{
      const pg=sp.polygon||[];
      for(let i=0;i<pg.length;i++){
        const a=pg[i], b=pg[(i+1)%pg.length];
        const ka=Math.round(a.x)+','+Math.round(a.y), kb=Math.round(b.x)+','+Math.round(b.y);
        const k=(ka<kb)?(ka+'|'+kb):(kb+'|'+ka);
        if(seen.has(k)) _sharedEdge.add(k); else seen.add(k);
      }
    });
  }
  STATE.spaces.forEach(s=>{
    const td=SPACE_TYPES[s.type];
    const pts=[];
    s.polygon.forEach(p=>{pts.push(STATE.offsetX+mmToPx(p.x),STATE.offsetY+mmToPx(p.y));});
    const sel=STATE.selectedKind==='space'&&STATE.selectedId===s.id||STATE.boxSelection.some(b=>b.kind==='space'&&b.id===s.id);
    // 2026-08-27: 인쇄는 흰 바탕 (색면이 선·글씨를 덮던 문제)
    // 2026-08-29: 흑백 인쇄만 흰 바탕 — 칼라 인쇄는 공간 색을 그대로
    const fillColor=(_pm()&&!_pcolor())?'#FFFFFF':(s.materialColor||td.color+'33');
    let poly;
    if(s.holes&&s.holes.length){
      // v5.9: 도넛 (hole 있음) — Konva.Shape sceneFunc로 even-odd 채우기
      const strokeCol=sel?'#E2725B':td.color;
      poly=new Konva.Shape({
        id:s.id,
        sceneFunc(ctx,sh){
          ctx.beginPath();
          // 외곽
          for(let i=0;i<s.polygon.length;i++){
            const p=s.polygon[i];
            const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.closePath();
          // hole — 외곽과 반대 방향으로 (even-odd 룰)
          s.holes.forEach(h=>{
            for(let i=0;i<h.length;i++){
              const p=h[i];
              const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
              if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.closePath();
          });
          ctx.fillStyle=fillColor;
          // Konva.Context의 fill은 인자 통과 → 무조건 'evenodd' 룰로 호출 (도넛 hole 표현)
          try{ctx.fill('evenodd');}catch(e){ctx.fill();}
          ctx.strokeStyle=strokeCol;
          ctx.lineWidth=sel?3.5:2.2;
          ctx.stroke();
        },
        hitFunc(ctx,sh){
          // 외곽으로만 hit (hole 영역은 제외)
          ctx.beginPath();
          for(let i=0;i<s.polygon.length;i++){
            const p=s.polygon[i];
            const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.closePath();
          ctx.fillStrokeShape(sh);
        },
        shadowColor:sel?'#E2725B':'transparent',shadowBlur:sel?12:0,shadowOpacity:sel?0.6:0,
      });
    }else{
      poly=new Konva.Line({
        points:pts,fill:fillColor,stroke:_pm()?'#000000':(sel?'#E2725B':td.color),
        strokeWidth:_pm()?0.9:(sel?3.5:2.2),closed:true,id:s.id,
        shadowColor:sel?'#E2725B':'transparent',shadowBlur:sel?12:0,shadowOpacity:sel?0.6:0,
        // 2026-08-27: 잠금 표시(반투명·점선)는 작업 보조 — 인쇄에는 내지 않는다
        opacity:(!_pm()&&s.locked)?0.30:1, dash:(!_pm()&&s.locked)?[8,5]:null,
      });
    }
    poly.on('click tap',e=>{
      if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;
      e.cancelBubble=true;
      // 2026-08-29: 방 안에서 박스 선택을 끌고 놓은 직후의 click 은 무시
      //  (그렇지 않으면 공간이 다시 잡혀 박스 결과가 날아간다)
      if(window._suppressClickSelect) return;
      if(STATE.selectedTool==='select') selectObj('space',s.id);
    });
    groups.spaces.add(poly);

    // 2026-08-24: 계단실(STAIRS) 타입 — 공간 크기에 자동 맞춘 계단 도식 (대표 지시)
    if(s.type==='STAIRS'){
      const stairShp=buildSpaceStairShape(s);
      const _sf=stairShp?_polyFrameMm(s.polygon):null;
      if(stairShp&&_sf){
        const sg=new Konva.Group({
          x:STATE.offsetX+mmToPx(_sf.cx),
          y:STATE.offsetY+mmToPx(_sf.cy),
          rotation:_sf.deg, // 2026-08-26: 방이 돌아가면 계단도 같이 돌아간다 (대표 보고)
          listening:false,name:'space-stairs',opacity:s.locked?0.30:0.9});
        drawShape(stairShp).forEach(n=>{n.listening(false);sg.add(n);});
        groups.spaces.add(sg);
      }
    }

    // 원형공간 리사이즈 핸들 (선택 시만 표시 — 잠금 시 숨김)
    if(sel&&!s.locked&&s._circleMeta){
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

    // 회전 핸들 (선택 시 상단 중앙에 표시 — ↻ 드래그 또는 R 키로 회전; 잠금 시 숨김)
    if(sel&&!s.locked){
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
    // 2026-08-27: 아이보리 글씨는 흰 종이에서 사라진다 — 인쇄는 검정
    const t1=new Konva.Text({text:s.name,fontSize:13,fontFamily:'Inter',fontStyle:'500',fill:_pm()?'#000000':'#F5F1EB'});
    t1.offsetX(t1.width()/2);t1.offsetY(15);
    lg.add(t1);
    const t2=new Konva.Text({text:spArea(s).toFixed(1)+' ㎡',fontSize:10,fontFamily:'JetBrains Mono',fill:_pm()?'#333333':td.color});
    t2.offsetX(t2.width()/2);t2.offsetY(0);
    lg.add(t2);
    labelSpacesGroup.add(lg);

    // *** 치수 자동 표시 — KS F 1501 건축 평면도 치수표기법 ***
    if(STATE.showDimensions){
      const cw=isClockwise(s.polygon);
      for(let i=0;i<s.polygon.length;i++){
        const p1=s.polygon[i];
        const p2=s.polygon[(i+1)%s.polygon.length];
        const dx=p2.x-p1.x,dy=p2.y-p1.y;
        const lenmm=Math.sqrt(dx*dx+dy*dy);
        if(lenmm<200) continue;
        // 2026-08-27: '전체 자동치수'로 만든 치수와 같은 변이면 자동 표시는 생략 (인쇄 2중 치수)
        if(_hasExplicitDim(p1,p2)) continue;
        const _ka=Math.round(p1.x)+','+Math.round(p1.y), _kb=Math.round(p2.x)+','+Math.round(p2.y);
        const _dk1=_ka+'|'+_kb, _dk2=_kb+'|'+_ka;
        if(_dimDone.has(_dk1)||_dimDone.has(_dk2)) continue; // 공유 변 중복 표기 방지
        if(_pm()&&_sharedEdge.has(_ka<_kb?_dk1:_dk2)) continue; // 인쇄: 내부 칸막이 치수 생략
        _dimDone.add(_dk1);
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

        // 보조선 (PERF: 통합 Shape로 배치)
        _dimSegs.w05.push(TX(p1.x+nx*gapMm),TY(p1.y+ny*gapMm),TX(p1.x+nx*(offMm+extMm)),TY(p1.y+ny*(offMm+extMm)));
        _dimSegs.w05.push(TX(p2.x+nx*gapMm),TY(p2.y+ny*gapMm),TX(p2.x+nx*(offMm+extMm)),TY(p2.y+ny*(offMm+extMm)));

        // 치수선
        _dimSegs.w07.push(TX(d1x),TY(d1y),TX(d2x),TY(d2y));

        // 사선 마크
        const tkx=(ux*cos45-uy*sin45)*tickPx;
        const tky=(ux*sin45+uy*cos45)*tickPx;
        _dimSegs.w11.push(TX(d1x)-tkx,TY(d1y)-tky,TX(d1x)+tkx,TY(d1y)+tky);
        _dimSegs.w11.push(TX(d2x)-tkx,TY(d2y)-tky,TX(d2x)+tkx,TY(d2y)+tky);

        // 치수 수치
        const tmx=(d1x+d2x)/2-nx*90, tmy=(d1y+d2y)/2-ny*90;
        let rot=Math.atan2(dy,dx)*180/Math.PI;
        if(rot>90||rot<-90) rot+=180;
        const t=new Konva.Text({x:TX(tmx),y:TY(tmy),text:Math.round(lenmm).toString(),fontSize:10,fontFamily:'JetBrains Mono',fill:'#8899AA',fontStyle:'500',rotation:rot});
        t.offsetX(t.width()/2);t.offsetY(t.height()/2);
        labelSpacesGroup.add(t);
      }
    }
  });
  /* PERF: 누적된 치수 보조선을 굵기별 통합 Shape로 1회 드로잉 */
  [['w05',0.5],['w07',0.7],['w11',1.1]].forEach(([k,wd])=>{
    const segs=_dimSegs[k];
    if(!segs.length)return;
    labelSpacesGroup.add(new Konva.Shape({
      listening:false,
      sceneFunc(ctx){
        ctx.save();
        ctx.strokeStyle='#6B7A8A';
        ctx.lineWidth=wd;
        ctx.beginPath();
        for(let i=0;i<segs.length;i+=4){
          ctx.moveTo(segs[i],segs[i+1]);
          ctx.lineTo(segs[i+2],segs[i+3]);
        }
        ctx.stroke();
        ctx.restore();
      },
    }));
  });
}

// v5.9: 내력벽 네트워크의 centroid 기준 "안쪽" 판정 — 클릭 방향 독립
// 모든 내력벽 중점 평균을 공간 안쪽으로 가정. 그 점이 이 벽의 +n쪽이면 +1, -n쪽이면 -1
function _bearingInteriorSign(w){
  let cx=0,cy=0,count=0;
  STATE.walls.forEach(o=>{
    if(o.wallType==='bearing'){
      cx+=(o.x1+o.x2)/2; cy+=(o.y1+o.y2)/2; count++;
    }
  });
  if(count<=1) return 1; // 단일 벽 — 기본 convention (+n 쪽 = 안쪽)
  cx/=count; cy/=count;
  const wmx=(w.x1+w.x2)/2, wmy=(w.y1+w.y2)/2;
  const tx=cx-wmx, ty=cy-wmy;
  const dx=w.x2-w.x1, dy=w.y2-w.y1;
  const len=Math.hypot(dx,dy);
  if(len<1) return 1;
  const ux=dx/len, uy=dy/len;
  const nx=-uy, ny=ux;
  const dot=tx*nx+ty*ny;
  return dot>0?1:-1;
}

// v5.9: 벽 정렬 오프셋 (px) — 클릭 방향 독립 (centroid 기반)
//   interior(내벽) = 그린 선이 실내쪽 면 → body는 centroid 반대 (바깥으로)
//   exterior(외벽) = 그린 선이 외부쪽 면 → body는 centroid 쪽 (안으로)
//   center = 양쪽 ±half (정렬 무관)
function _wallAlignOffsetPx(w){
  if(w.isLine) return 0;
  const align=w.alignment||'center';
  if(align==='center') return 0;
  const tPx=mmToPx(w.thickness||100);
  // 내력벽이 아닌 일반벽은 단순 정렬 (centroid 영향 없음 — 기본 convention 사용)
  if(w.wallType!=='bearing'){
    return align==='interior'?(tPx/2):(-tPx/2);
  }
  // 내력벽: centroid 방향 기준
  const sign=_bearingInteriorSign(w);
  // 내벽: centroid 쪽(안쪽)으로 body, 외벽: centroid 반대(바깥쪽)으로 body
  const factor=(align==='interior')?sign:-sign;
  return factor*(tPx/2);
}

// v5.9: 미터 조인트 — 두 직선의 교점 (px 기준)
function _lineIntersect(p1,d1,p2,d2){
  const det=d1.x*d2.y-d1.y*d2.x;
  if(Math.abs(det)<1e-6) return null; // 평행
  const t=((p2.x-p1.x)*d2.y-(p2.y-p1.y)*d2.x)/det;
  return {x:p1.x+t*d1.x,y:p1.y+t*d1.y};
}

// v5.9: 내력벽 미터 조인트 — 비대칭 오프셋(topOff/botOff) + 원본 vertex 기준
// 정렬(center/interior/exterior)이 어떻든 두 벽이 원본 vertex에서 같은 미터점을 산출하도록 설계
// vertexPx: 원본 vertex(shift 없음) px, tFwd: vertex→body 방향, tN: tFwd의 CCW 수직
// tTopOffPx: 이 벽 +tN 쪽 edge 오프셋(px), tBotOffPx: -tN 쪽 edge 오프셋(px, 보통 음수)
function _miterEnd(thisWall,neighbor,thisVId,vertexPx,tFwd,tN,tTopOffPx,tBotOffPx){
  const nx1=neighbor.x1,ny1=neighbor.y1,nx2=neighbor.x2,ny2=neighbor.y2;
  const ndx=nx2-nx1,ndy=ny2-ny1;
  const nlen=Math.hypot(ndx,ndy);
  if(nlen<1) return null;
  const nuxMm=ndx/nlen, nuyMm=ndy/nlen;
  const intoBodyX=(neighbor.v1Id===thisVId)?nuxMm:-nuxMm;
  const intoBodyY=(neighbor.v1Id===thisVId)?nuyMm:-nuyMm;
  const nFwd={x:intoBodyX,y:intoBodyY};
  const nN={x:-intoBodyY,y:intoBodyX};
  // 이웃 벽의 비대칭 오프셋 (centroid 기반 클릭 방향 독립)
  const nbT=neighbor.thickness||200;
  const nbIntSign=(typeof _bearingInteriorSign==='function')?_bearingInteriorSign(neighbor):1;
  const nbAlignFactor=(neighbor.alignment==='interior')?nbIntSign:(neighbor.alignment==='exterior')?-nbIntSign:0;
  const nbHalfMm=nbT/2;
  const nbOffMm=nbAlignFactor*nbHalfMm;
  let nbTopOffPx=mmToPx(nbOffMm+nbHalfMm);
  let nbBotOffPx=mmToPx(nbOffMm-nbHalfMm);
  // v5.9 fix: 이웃의 v2가 공유 vertex면 nN 방향이 이웃 원본 n과 반대 → 오프셋 부호 반전
  if(neighbor.v2Id===thisVId){
    nbTopOffPx = -nbTopOffPx;
    nbBotOffPx = -nbBotOffPx;
  }

  // 내부 각도등분선
  const bisX=tFwd.x+nFwd.x, bisY=tFwd.y+nFwd.y;
  const bisLen=Math.hypot(bisX,bisY);
  if(bisLen<1e-3) return null;
  const innerBis={x:bisX/bisLen,y:bisY/bisLen};

  // 각 edge가 inner인지 outer인지 판정 — 오프셋 부호 × n방향과 bisector 내적
  function sideOf(offPx,n){
    if(Math.abs(offPx)<0.5) return 0; // edge가 vertex 위 (interior/exterior 정렬 시 한쪽 edge가 centerline에 정확히 위치)
    const sign=offPx>0?1:-1;
    const v=sign*(n.x*innerBis.x+n.y*innerBis.y);
    return v>0?1:-1; // 1=inner, -1=outer
  }
  const aTopSide=sideOf(tTopOffPx,tN);
  const aBotSide=sideOf(tBotOffPx,tN);
  const bTopSide=sideOf(nbTopOffPx,nN);
  const bBotSide=sideOf(nbBotOffPx,nN);

  // 4개 edge 직선
  const aTop={x:vertexPx.x+tN.x*tTopOffPx, y:vertexPx.y+tN.y*tTopOffPx};
  const aBot={x:vertexPx.x+tN.x*tBotOffPx, y:vertexPx.y+tN.y*tBotOffPx};
  const bTop={x:vertexPx.x+nN.x*nbTopOffPx, y:vertexPx.y+nN.y*nbTopOffPx};
  const bBot={x:vertexPx.x+nN.x*nbBotOffPx, y:vertexPx.y+nN.y*nbBotOffPx};

  // 매칭: 같은 inner/outer 상태인 edge 우선, 없으면 vertex(0) edge로 fallback
  // (혼합 정렬에서 inner/outer 짝이 안 맞을 때 잘못된 반대측 매칭 방지)
  function pickB(aSide){
    if(aSide===1){
      if(bTopSide===1) return bTop;
      if(bBotSide===1) return bBot;
      // 같은 inner 없음 — vertex edge로 fallback (vertex edge는 어느 쪽이든 통과)
      if(bTopSide===0) return bTop;
      if(bBotSide===0) return bBot;
    }else if(aSide===-1){
      if(bTopSide===-1) return bTop;
      if(bBotSide===-1) return bBot;
      if(bTopSide===0) return bTop;
      if(bBotSide===0) return bBot;
    }else{ // aSide===0
      if(bTopSide===0) return bTop;
      if(bBotSide===0) return bBot;
      return bTop;
    }
    return bTop;
  }
  const matchAtop=pickB(aTopSide);
  const matchAbot=pickB(aBotSide);
  // edge가 vertex와 일치하면 미터 점도 vertex
  const top = (aTopSide===0||(matchAtop===bTop?bTopSide===0:bBotSide===0))
              ? aTop : (_lineIntersect(aTop,tFwd,matchAtop,nFwd)||aTop);
  const bot = (aBotSide===0||(matchAbot===bTop?bTopSide===0:bBotSide===0))
              ? aBot : (_lineIntersect(aBot,tFwd,matchAbot,nFwd)||aBot);
  // sub-pixel 차이로 양쪽 벽이 미세하게 어긋나는 것 방지: 정수 반올림
  return {
    top:{x:Math.round(top.x),y:Math.round(top.y)},
    bot:{x:Math.round(bot.x),y:Math.round(bot.y)},
  };
}
// v5.9: 내력벽 4코너 계산 헬퍼 — 미터 조인트 적용
function _computeBearingCorners(w){
  const x1Orig=STATE.offsetX+mmToPx(w.x1), y1Orig=STATE.offsetY+mmToPx(w.y1);
  const x2Orig=STATE.offsetX+mmToPx(w.x2), y2Orig=STATE.offsetY+mmToPx(w.y2);
  const dxO=x2Orig-x1Orig, dyO=y2Orig-y1Orig, lenO=Math.hypot(dxO,dyO);
  if(lenO<1) return null;
  const ux=dxO/lenO, uy=dyO/lenO, nx=-uy, ny=ux;
  const tT=w.thickness||200;
  const halfMm=tT/2;
  const intSign=_bearingInteriorSign(w);
  const alignFactor=(w.alignment==='interior')?intSign:(w.alignment==='exterior')?-intSign:0;
  const offMm=alignFactor*halfMm;
  const topOffPx=mmToPx(offMm+halfMm);
  const botOffPx=mmToPx(offMm-halfMm);
  let c1={x:x1Orig+nx*topOffPx,y:y1Orig+ny*topOffPx};
  let c2={x:x2Orig+nx*topOffPx,y:y2Orig+ny*topOffPx};
  let c3={x:x2Orig+nx*botOffPx,y:y2Orig+ny*botOffPx};
  let c4={x:x1Orig+nx*botOffPx,y:y1Orig+ny*botOffPx};
  let v1Mitered=false, v2Mitered=false;
  const adjV1=STATE.walls.filter(o=>o.id!==w.id&&o.wallType==='bearing'&&(o.v1Id===w.v1Id||o.v2Id===w.v1Id));
  if(adjV1.length===1){
    const m=_miterEnd(w,adjV1[0],w.v1Id,{x:x1Orig,y:y1Orig},{x:ux,y:uy},{x:nx,y:ny},topOffPx,botOffPx);
    if(m){c1=m.top;c4=m.bot;v1Mitered=true;}
  }
  const adjV2=STATE.walls.filter(o=>o.id!==w.id&&o.wallType==='bearing'&&(o.v1Id===w.v2Id||o.v2Id===w.v2Id));
  if(adjV2.length===1){
    const m=_miterEnd(w,adjV2[0],w.v2Id,{x:x2Orig,y:y2Orig},{x:-ux,y:-uy},{x:-nx,y:-ny},-botOffPx,-topOffPx);
    if(m){c3=m.top;c2=m.bot;v2Mitered=true;}
  }
  return {c1,c2,c3,c4,ux,uy,nx,ny,v1Mitered,v2Mitered};
}
function renderWalls(){
  groups.walls.destroyChildren();
  // v5.4+v5.5: 중첩 감지 — 벽↔벽(주황) 와 벽↔공간변(파랑) 분리
  const overlapsWall=detectOverlappingWalls();
  const overlapsSpace=detectWallSpaceOverlap();
  // v5.9: 내력벽 통합 렌더 — 본체(fill+hatch+외곽선)를 단일 패스로 합쳐서 겹치는 부분 자연 병합
  const _bearingDataAll=STATE.walls.filter(w=>w.wallType==='bearing'&&!w.isLine).map(w=>{
    const c=_computeBearingCorners(w);
    return c?{wall:w,...c}:null;
  }).filter(Boolean);
  // v5.9: 내력벽이 일반벽보다 위 레이어에 오도록 — 렌더 후 moveToTop 호출용 참조 보관
  let _mergedBearingRef=null;
  const _bearingPerWallRefs=[];
  const _bearingCenterlineRefs=[];
  if(_bearingDataAll.length>0){
    const _theme=document.body&&document.body.getAttribute('data-theme');
    const _isLight=_theme==='architect';
    const _bearingMain=_isLight?'#000000':'#FFFFFF';
    const _bearingHatch=_isLight?'#1A1A1A':'#E5E5E5';
    const _bearingFill=_isLight?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.10)';
    const merged=new Konva.Shape({
      listening:false,
      sceneFunc(ctx,sh){
        // 1. 통합 path: nonzero 룰로 한 번에 fill (겹침 영역도 한 픽셀당 한번만 칠해짐)
        const buildPath=()=>{
          ctx.beginPath();
          _bearingDataAll.forEach(({c1,c2,c3,c4})=>{
            ctx.moveTo(c1.x,c1.y);
            ctx.lineTo(c2.x,c2.y);
            ctx.lineTo(c3.x,c3.y);
            ctx.lineTo(c4.x,c4.y);
            ctx.closePath();
          });
        };
        buildPath();
        ctx.fillStyle=_bearingFill;
        ctx.fill();
        // 2. 해치 (통합 영역 클립 + 글로벌 y=x+c 격자)
        ctx.save();
        buildPath();
        ctx.clip();
        ctx.strokeStyle=_bearingHatch;
        ctx.lineWidth=1.0;
        let minX=Infinity,maxX=-Infinity;
        let cMin=Infinity,cMax=-Infinity;
        _bearingDataAll.forEach(({c1,c2,c3,c4})=>{
          [c1,c2,c3,c4].forEach(p=>{
            if(p.x<minX) minX=p.x;
            if(p.x>maxX) maxX=p.x;
            const cv=p.y-p.x;
            if(cv<cMin) cMin=cv;
            if(cv>cMax) cMax=cv;
          });
        });
        const HATCH_SPACING=6;
        const cStep=HATCH_SPACING*Math.SQRT2;
        cMin-=cStep; cMax+=cStep;
        const cStart=Math.ceil(cMin/cStep)*cStep;
        for(let c=cStart;c<=cMax;c+=cStep){
          ctx.beginPath();
          ctx.moveTo(minX-100, minX-100+c);
          ctx.lineTo(maxX+100, maxX+100+c);
          ctx.stroke();
        }
        ctx.restore();
        // 3. 외곽선 — 오프스크린 캔버스에 strokes 그린 후, 각 폴리곤 inset 영역 destination-out으로 내부 선 제거
        const cw=ctx.canvas.width, ch=ctx.canvas.height;
        const off=document.createElement('canvas');
        off.width=cw; off.height=ch;
        const o=off.getContext('2d');
        o.strokeStyle=_bearingMain;
        o.lineWidth=2.0;
        o.lineCap='square';
        o.lineJoin='miter';
        _bearingDataAll.forEach(({c1,c2,c3,c4})=>{
          o.beginPath();
          o.moveTo(c1.x,c1.y);
          o.lineTo(c2.x,c2.y);
          o.lineTo(c3.x,c3.y);
          o.lineTo(c4.x,c4.y);
          o.closePath();
          o.stroke();
        });
        // 자기 경계선은 보존(±1px stroke)하고 내부 침투 선만 제거: 1.05px 만큼 안쪽 inset
        o.globalCompositeOperation='destination-out';
        o.fillStyle='#000';
        const insetAmt=1.05;
        _bearingDataAll.forEach(({c1,c2,c3,c4,ux,uy,nx,ny})=>{
          const i1={x:c1.x-nx*insetAmt+ux*insetAmt, y:c1.y-ny*insetAmt+uy*insetAmt};
          const i2={x:c2.x-nx*insetAmt-ux*insetAmt, y:c2.y-ny*insetAmt-uy*insetAmt};
          const i3={x:c3.x+nx*insetAmt-ux*insetAmt, y:c3.y+ny*insetAmt-uy*insetAmt};
          const i4={x:c4.x+nx*insetAmt+ux*insetAmt, y:c4.y+ny*insetAmt+uy*insetAmt};
          o.beginPath();
          o.moveTo(i1.x,i1.y);
          o.lineTo(i2.x,i2.y);
          o.lineTo(i3.x,i3.y);
          o.lineTo(i4.x,i4.y);
          o.closePath();
          o.fill();
        });
        o.globalCompositeOperation='source-over';
        ctx.drawImage(off, 0, 0);
      },
    });
    groups.walls.add(merged);
    _mergedBearingRef=merged;
  }
  // v5.9: 자유벽(공간 vertex 미공유) 중 다른 자유벽과 vertex 공유하는 것을 미리 식별 → 파란색 표시
  const _spaceVertexSet=new Set();
  STATE.spaces.forEach(s=>s.vertexIds&&s.vertexIds.forEach(vid=>_spaceVertexSet.add(vid)));
  const _isFreeWall=w=>!w.isLine&&w.wallType!=='bearing'&&!_spaceVertexSet.has(w.v1Id)&&!_spaceVertexSet.has(w.v2Id);
  const _connectedFreeWallIds=new Set();
  const _freeWalls=STATE.walls.filter(_isFreeWall);
  for(let i=0;i<_freeWalls.length;i++){
    for(let j=i+1;j<_freeWalls.length;j++){
      const a=_freeWalls[i], b=_freeWalls[j];
      if(a.v1Id===b.v1Id||a.v1Id===b.v2Id||a.v2Id===b.v1Id||a.v2Id===b.v2Id){
        _connectedFreeWallIds.add(a.id);
        _connectedFreeWallIds.add(b.id);
      }
    }
  }
  STATE.walls.forEach(w=>{
    let x1=STATE.offsetX+mmToPx(w.x1),y1=STATE.offsetY+mmToPx(w.y1);
    let x2=STATE.offsetX+mmToPx(w.x2),y2=STATE.offsetY+mmToPx(w.y2);
    // v5.9: 정렬에 따른 수직 오프셋 (방향벡터의 우측 = (-dy, dx) 기준)
    const offT=_wallAlignOffsetPx(w);
    if(offT!==0){
      const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
      if(len>1){
        const nx=-dy/len, ny=dx/len; // 진행방향 우측 perpendicular
        x1+=nx*offT;y1+=ny*offT;x2+=nx*offT;y2+=ny*offT;
      }
    }
    const sel=STATE.selectedKind==='wall'&&STATE.selectedId===w.id||STATE.boxSelection.some(b=>b.kind==='wall'&&b.id===w.id);
    const isOW=overlapsWall.has(w.id);
    const isOS=overlapsSpace.has(w.id);
    // 2026-08-27: 중첩 경고는 작업 보조 표시 — 인쇄물에는 내지 않는다
    const overlapColor=_pm()?null:(isOS?'#3D9DE2':(isOW?'#E03030':null));
    const isLine=!!w.isLine;
    const isPartition=w.wallType==='bearing';
    const lineSp=isLine&&w.spaceId?STATE.spaces.find(s=>s.id===w.spaceId):null;
    const lineBaseColor=lineSp?SPACE_TYPES[lineSp.type].color:'#7B82B5';

    if(!isLine && isPartition){
      // v5.9: 내력벽 본체는 위쪽 통합 렌더로 처리. 여기선 hit / 선택표시 / 경고만.
      const corners=_computeBearingCorners(w);
      if(!corners) return;
      const {c1,c2,c3,c4}=corners;
      const shape=new Konva.Shape({
        id:w.id,
        sceneFunc(ctx,sh){
          if(sel){
            // 선택 강조: 주황 fill + 외곽선
            ctx.beginPath();
            ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
            ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
            ctx.closePath();
            ctx.fillStyle='rgba(226,114,91,0.18)';
            ctx.fill();
            ctx.strokeStyle='#E2725B';
            ctx.lineWidth=2.8;
            ctx.lineCap='square';ctx.lineJoin='miter';
            ctx.stroke();
          } else if(overlapColor){
            // 중첩 경고 — 점선 외곽
            ctx.setLineDash([4,4]);
            ctx.strokeStyle=overlapColor;
            ctx.lineWidth=1.5;
            ctx.beginPath();
            ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
            ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
          }
        },
        hitFunc(ctx,sh){
          ctx.beginPath();
          ctx.moveTo(c1.x,c1.y);ctx.lineTo(c2.x,c2.y);
          ctx.lineTo(c3.x,c3.y);ctx.lineTo(c4.x,c4.y);
          ctx.closePath();
          ctx.fillStrokeShape(sh);
        },
        shadowColor:sel?'#E2725B':(overlapColor||'transparent'),
        shadowBlur:sel?8:(overlapColor?10:0),
        shadowOpacity:sel?0.5:(overlapColor?0.7:0),
      });
      shape.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('wall',w.id);});
      groups.walls.add(shape);
      _bearingPerWallRefs.push(shape);
    }else{
      // 기존 표준벽/선 렌더링
      const _isConnectedFree=_connectedFreeWallIds.has(w.id);
      // 2026-08-27: 인쇄는 벽을 검정 실선으로 (화면의 하늘색은 종이에서 벽으로 안 읽힘)
      const _baseStroke=_pm()?'#000000':(isLine?lineBaseColor:(_isConnectedFree?'#5BA0D4':'#3E3E3E'));
      const line=new Konva.Line({
        points:[x1,y1,x2,y2],
        stroke:sel?'#E2725B':(overlapColor||_baseStroke),
        strokeWidth:isLine?(sel?3.5:2.2):Math.max(4,mmToPx(w.thickness||100)),
        lineCap:'square',
        id:w.id,hitStrokeWidth:isLine?16:20,
        dash:overlapColor?[4,4]:[],
        shadowColor:sel&&isLine?'#E2725B':(overlapColor||'transparent'),
        shadowBlur:(sel&&isLine)?8:(overlapColor?12:0),
        shadowOpacity:(sel&&isLine)?0.5:(overlapColor?0.8:0),
      });
      line.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('wall',w.id);});
      // v5.9: 잠금 시 반투명+점선
      if(w.locked){line.opacity(0.30);line.dash([6,4]);}
      groups.walls.add(line);
    }
    // 경고 마크
    if(isOW&&!sel&&!_pm()){
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      groups.walls.add(new Konva.Text({x:mx-10,y:my-14,text:'⚠',fontSize:28,fontFamily:'Inter',fill:'#E03030',shadowColor:'#000',shadowBlur:3}));
    }
  });

  // v5.9: 내력벽 코너는 미터 조인트로 자연스럽게 처리 (위 _miterEnd) — 별도 캡 불필요

  // v5.9: 기준선(centerline) 별도 패스 — 정렬에 따라 wall body가 offset된 경우 클릭한 선 위치 식별용
  // CAD 표준 CENTER linetype (장-단 점선) + 라임/골드 강조색
  /* v5.9.4 PERF: 일반벽 센터라인은 장식 전용(listening:false)이라 벽당 노드 대신
     단일 통합 Shape 1개로 일괄 드로잉 — 대형 도면에서 노드 수 절반. 시각 결과 동일.
     내력벽 센터라인만 개별 유지 (moveToTop z-순서 제어 필요) */
  const _clSegs=[];
  STATE.walls.forEach(w=>{
    if(w.isLine) return;
    const x1c=STATE.offsetX+mmToPx(w.x1),y1c=STATE.offsetY+mmToPx(w.y1);
    const x2c=STATE.offsetX+mmToPx(w.x2),y2c=STATE.offsetY+mmToPx(w.y2);
    if(w.wallType==='bearing'){
      const cl=new Konva.Line({
        points:[x1c,y1c,x2c,y2c],
        stroke:'#D4FF3D',strokeWidth:0.8,
        dash:[10,3,2,3], // CENTER linetype: 장점-짧점-장점
        opacity:0.85,listening:false,
      });
      groups.walls.add(cl);
      _bearingCenterlineRefs.push(cl);
    }else{
      _clSegs.push(x1c,y1c,x2c,y2c);
    }
  });
  if(_clSegs.length){
    groups.walls.add(new Konva.Shape({
      listening:false,opacity:0.85,
      sceneFunc(ctx){
        ctx.save();
        ctx.strokeStyle='#C9A961';
        ctx.lineWidth=0.8;
        ctx.setLineDash([10,3,2,3]);
        ctx.beginPath();
        for(let i=0;i<_clSegs.length;i+=4){
          ctx.moveTo(_clSegs[i],_clSegs[i+1]);
          ctx.lineTo(_clSegs[i+2],_clSegs[i+3]);
        }
        ctx.stroke();
        ctx.restore();
      },
    }));
  }
  // v5.9: 내력벽 시각효과를 일반벽 위로 — 통합 본체 → 개별 hit/select → 센터라인 순으로 moveToTop
  // (moveToTop은 호출 순서대로 쌓이므로 마지막 호출이 최상단)
  if(_mergedBearingRef) _mergedBearingRef.moveToTop();
  _bearingPerWallRefs.forEach(s=>s.moveToTop());
  _bearingCenterlineRefs.forEach(c=>c.moveToTop());
}
// v5.5: 벽이 공간 폴리곤 변과 같은 직선상에서 겹치는지 검사
/* v5.9.3 PERF: mm 좌표 기반 계산이라 뷰(팬/줌)와 무관 — 지오메트리 서명 캐시.
   벽·공간을 실제 편집할 때만 재계산 (대형 도면에서 renderWalls의 지배 비용이었음) */
let _wsoCache={key:null,val:null};
function detectWallSpaceOverlap(){
  let key;
  try{
    key=STATE.walls.length+':'+STATE.spaces.length+':'+
      JSON.stringify(STATE.walls.map(w=>[w.id,w.x1,w.y1,w.x2,w.y2,w.wallType||0]))+
      JSON.stringify(STATE.spaces.map(s=>s.polygon));
  }catch(e){key=null;}
  if(key!==null&&_wsoCache.key===key) return _wsoCache.val;
  const overlaps=new Set();
  /* v5.9.4 PERF: 공간 변을 2m 그리드 버킷에 색인 → 벽마다 인근 변만 검사.
     O(벽×전체변) → O(벽+변). 여유 마진 60mm ≥ wallsOverlap 허용오차(20mm) */
  const CELL=2000, MARGIN=60;
  const buckets=new Map();
  const cellsOf=(x1,y1,x2,y2)=>{
    const cx1=Math.floor((Math.min(x1,x2)-MARGIN)/CELL), cx2=Math.floor((Math.max(x1,x2)+MARGIN)/CELL);
    const cy1=Math.floor((Math.min(y1,y2)-MARGIN)/CELL), cy2=Math.floor((Math.max(y1,y2)+MARGIN)/CELL);
    const out=[];
    for(let cx=cx1;cx<=cx2;cx++)for(let cy=cy1;cy<=cy2;cy++)out.push(cx+'_'+cy);
    return out;
  };
  const segs=[];
  STATE.spaces.forEach(s=>{
    const P=s.polygon;
    for(let i=0;i<P.length;i++){
      const a=P[i], b=P[(i+1)%P.length];
      const seg={x1:a.x,y1:a.y,x2:b.x,y2:b.y};
      const idx=segs.push(seg)-1;
      cellsOf(a.x,a.y,b.x,b.y).forEach(c=>{
        let arr=buckets.get(c);
        if(!arr){arr=[];buckets.set(c,arr);}
        arr.push(idx);
      });
    }
  });
  const seen=new Set();
  STATE.walls.forEach(w=>{
    if(w.wallType==='bearing') return; // v5.9: 내력벽 격리 — 공간 겹침 무시
    seen.clear();
    outer:
    for(const c of cellsOf(w.x1,w.y1,w.x2,w.y2)){
      const arr=buckets.get(c);
      if(!arr) continue;
      for(const idx of arr){
        if(seen.has(idx)) continue;
        seen.add(idx);
        if(wallsOverlap(w,segs[idx])){overlaps.add(w.id);break outer;}
      }
    }
  });
  if(key!==null)_wsoCache={key,val:overlaps};
  return overlaps;
}
// v5.4: 두 벽이 같은 직선상에 있고 겹치는지 검사
// v5.9 (개정): 점단위 스택 카운트 — 같은 직선 그룹에서 1D 스윕으로 어느 한 점에 3겹 이상 쌓이는지 검사
// pairwise cnt 방식은 장거리 벽이 두 짧은 벽과 다른 구간에서 각각 2겹인 경우도 3겹으로 오탐했음
function detectOverlappingWalls(){
  const overlaps=new Set();
  const candidates=STATE.walls.filter(w=>w.wallType!=='bearing'&&!w.isLine);
  // 직선 그룹핑 — 같은 직선상에 있는 벽들끼리 묶음
  const groups=[];
  candidates.forEach(w=>{
    for(const g of groups){
      if(_wallsCollinear(g[0],w)){g.push(w);return;}
    }
    groups.push([w]);
  });
  // 그룹별 1D 스윕
  groups.forEach(g=>{
    if(g.length<3) return; // 3겹 이상 가능성 없음
    const ref=g[0];
    const dxR=ref.x2-ref.x1, dyR=ref.y2-ref.y1;
    const lenR=Math.hypot(dxR,dyR);
    if(lenR<1) return;
    const ux=dxR/lenR, uy=dyR/lenR;
    const ox=ref.x1, oy=ref.y1;
    // 각 벽을 t-구간으로 투영
    const intervals=g.map((w,idx)=>{
      const t1=(w.x1-ox)*ux+(w.y1-oy)*uy;
      const t2=(w.x2-ox)*ux+(w.y2-oy)*uy;
      return{wall:w,idx,lo:Math.min(t1,t2),hi:Math.max(t1,t2)};
    });
    // 이벤트: +1 = 진입, -1 = 이탈
    const events=[];
    intervals.forEach(iv=>{
      events.push({t:iv.lo,type:1,idx:iv.idx});
      events.push({t:iv.hi,type:-1,idx:iv.idx});
    });
    // 같은 t에서는 -1 먼저 (끝점만 닿는 경우는 동시 활성 아님)
    events.sort((a,b)=>a.t-b.t||a.type-b.type);
    const active=new Set();
    for(const e of events){
      if(e.type===1) active.add(e.idx); else active.delete(e.idx);
      if(active.size>=3){
        active.forEach(idx=>overlaps.add(intervals[idx].wall.id));
      }
    }
  });
  return overlaps;
}
// 두 벽이 같은 직선상에 있는지 (구간 겹침 여부 무관)
function _wallsCollinear(a,b){
  const dxa=a.x2-a.x1, dya=a.y2-a.y1;
  const dxb=b.x2-b.x1, dyb=b.y2-b.y1;
  const lenA=Math.hypot(dxa,dya), lenB=Math.hypot(dxb,dyb);
  if(lenA<1||lenB<1) return false;
  const cross=dxa*dyb-dya*dxb;
  if(Math.abs(cross)>lenA*lenB*0.02) return false; // ~1.1° 이내 평행
  const cross2=(b.x1-a.x1)*dya-(b.y1-a.y1)*dxa;
  if(Math.abs(cross2)>lenA*10) return false; // 10mm 이내 동일 직선
  return true;
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
  /* v5.9.4 버그수정: 문/창 치수 라벨이 자기 그룹을 비우지 않아 팬/줌(재렌더)마다
     텍스트가 계속 누적되던 문제 — 본체와 함께 라벨도 매 렌더마다 초기화 */
  labelOpeningsGroup.destroyChildren();
  STATE.openings.forEach(o=>{
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const w=mmToPx(o.width_mm);
    const isDoor=o.type==='DOOR';
    const color=(_pm()&&!_pcolor())?'#000000':(isDoor?'#D4A05B':'#5BA0D4'); // 2026-08-29: 칼라 인쇄은 문·창도 색으로
    const sel=STATE.selectedKind==='opening'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='opening'&&b.id===o.id);
    const g=new Konva.Group({x,y,rotation:o.angle||0,scaleX:o.flipped?-1:1,id:o.id});
    // v5.9: depth_mm가 클수록 jamb(벽 단면) 사각형 시각 두께 증가
    const dPx=Math.max(3,mmToPx(o.depth_mm||(isDoor?40:200)));
    const isDouble=isDoor&&(o.subtractMode||'double')==='double';
    if(isDoor){
      // 2026-08-24: 도어 종류별 평면 도식 (대표 지시) — 슬라이딩 계열은 여닫이 호 대신 패널 표기
      const st=o.subType||'swing';
      // 2026-08-26: 포켓도어는 바탕도 자체 도식 (전체 폭 = 개구부 절반 + 포켓 절반) — 대표 지시
      if(st!=='pocket'){
        // 양면차감 시 jamb를 살짝 더 진하게(opacity ↑) + 양쪽 끝에 표시 라인
        g.add(new Konva.Rect({x:-w/2,y:-dPx/2,width:w,height:dPx,
          fill:color,opacity:isDouble?0.95:0.75,
          stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2:1}));
        // 양면차감 표시: 양쪽 면(jamb 외곽)에 가는 라인
        if(isDouble){
          g.add(new Konva.Line({points:[-w/2,-dPx/2,w/2,-dPx/2],stroke:'#0A0A0A',strokeWidth:1.2,opacity:0.6}));
          g.add(new Konva.Line({points:[-w/2,dPx/2,w/2,dPx/2],stroke:'#0A0A0A',strokeWidth:1.2,opacity:0.6}));
        }
      }
      if(st==='sliding'||st==='folding'||st==='pocket'){
        const panelT=Math.max(3,dPx*0.30);           // 패널 시각 두께
        const jamb=Math.max(2,Math.min(dPx*0.18,6));
        const iL=-w/2+jamb, iR=w/2-jamb, iW=iR-iL;
        const arrow=(x1,x2,y)=>{ // 슬라이드 방향 화살표 (x1→x2)
          const dir=x2>x1?1:-1, ah=Math.max(4,panelT*0.9);
          g.add(new Konva.Line({points:[x1,y,x2,y],stroke:color,strokeWidth:1.3,listening:false}));
          g.add(new Konva.Line({points:[x2-dir*ah,y-ah*0.7,x2,y,x2-dir*ah,y+ah*0.7],stroke:color,strokeWidth:1.3,listening:false}));
        };
        const panel=(x0,len,yc)=>g.add(new Konva.Rect({x:x0,y:yc-panelT/2,width:len,height:panelT,
          fill:'#F5F1EB',stroke:'#0A0A0A',strokeWidth:1.4,listening:false}));
        if(st==='pocket'){
          // 2026-08-26: 포켓도어 치수 정합 (대표 지시) — 전체 폭 W 안에서
          //  우측 절반 = 개구부 + 도어 패널(실선, W/2 만큼 돌출), 좌측 절반 = 벽 속 포켓(문틀 구간 — 점선만)
          const half=w/2;
          // 개구부 바탕 (우측 절반)
          g.add(new Konva.Rect({x:0,y:-dPx/2,width:half,height:dPx,
            fill:color,opacity:isDouble?0.95:0.75,
            stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2:1}));
          // 벽 속 포켓 (좌측 절반) — 문틀에 들어가는 부분: 점선 외곽만
          g.add(new Konva.Rect({x:-half,y:-dPx/2,width:half,height:dPx,
            stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:1.2,dash:[6,4],fillEnabled:false,listening:false}));
          // 도어 패널 (닫힘 상태 — 개구부 절반을 실선으로 정확히 덮음)
          panel(0,half*0.97,0);
          // 패널이 포켓으로 들어갈 자리 (점선 패널)
          g.add(new Konva.Rect({x:-half*0.97,y:-panelT/2,width:half*0.97,height:panelT,
            stroke:'#0A0A0A',strokeWidth:1.1,dash:[5,3],fillEnabled:false,listening:false}));
          // 열림 방향 화살표 (개구부 → 포켓)
          arrow(half*0.6,-half*0.6,-dPx*0.9);
        }else{
          // 슬라이딩(미서기 2짝) / 3연동(3짝): 짝들을 위아래로 어긋나게 + 물림(오버랩)
          const n=st==='sliding'?2:3;
          const seg=iW/n, ov=iW*0.07;
          for(let i=0;i<n;i++){
            const x0=iL+i*seg-(i>0?ov:0);
            const len=seg+ov*((i>0?1:0)+(i<n-1?1:0));
            panel(x0,len,(i-(n-1)/2)*panelT*1.15);
          }
          arrow(iL+seg*0.85,iL+seg*0.10,-dPx*0.85);
          arrow(iR-seg*0.85,iR-seg*0.10,dPx*0.85);
        }
      }else{
        // 여닫이(swing/entry): 90° 개폐 호 + 문짝
        g.add(new Konva.Arc({x:-w/2,y:0,innerRadius:0,outerRadius:w,angle:90,rotation:0,
          stroke:color,strokeWidth:1,fillEnabled:false,dash:[4,3]}));
        g.add(new Konva.Line({points:[-w/2,0,-w/2,w],stroke:color,strokeWidth:2}));
      }
    }else{
      // v5.9: KS F 1501 표준 창 표기 — 미닫이창 Z자 이중 표시
      // 외창(상단 1/4 y)이 좌→중앙오버랩, 내창(하단 1/4 y)이 중앙오버랩→우 (Z 형태)
      const _wTheme=document.body&&document.body.getAttribute('data-theme');
      const _isLight=_wTheme==='architect';
      const fillCol=_isLight?'#FFFFFF':'#F5F1EB';
      const strokeCol=sel?'#E2725B':'#0A0A0A';
      // 좌우 jamb (벽 단면)
      const jambW=Math.max(2,Math.min(dPx*0.18,8));
      g.add(new Konva.Rect({x:-w/2,y:-dPx/2,width:jambW,height:dPx,
        fill:'#0A0A0A',opacity:0.9,listening:false}));
      g.add(new Konva.Rect({x:w/2-jambW,y:-dPx/2,width:jambW,height:dPx,
        fill:'#0A0A0A',opacity:0.9,listening:false}));
      // 본체 흰 바탕
      g.add(new Konva.Rect({x:-w/2,y:-dPx/2,width:w,height:dPx,
        fill:fillCol,opacity:0.95,
        stroke:strokeCol,strokeWidth:sel?2:1.2}));
      // Z자 미닫이창 표기
      const innerL=-w/2+jambW;
      const innerR=w/2-jambW;
      const innerW=innerR-innerL;
      const half=innerW/2;
      const overlap=innerW*0.06;
      const upperY=-dPx*0.25;
      const lowerY=dPx*0.25;
      const outerEnd=innerL+half+overlap;
      const innerStart=innerR-half-overlap;
      // 좌·우 프레임 수직선 (jamb 안쪽 — 창틀 측면)
      g.add(new Konva.Line({points:[innerL,-dPx/2,innerL,dPx/2],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      g.add(new Konva.Line({points:[innerR,-dPx/2,innerR,dPx/2],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 중앙 긴 수평선 (창 중심선 — KS F 1501 표준)
      g.add(new Konva.Line({points:[innerL,0,innerR,0],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 외창 상단 수평선
      g.add(new Konva.Line({points:[innerL,upperY,outerEnd,upperY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 외창 우측 수직 (Z 첫 수직)
      g.add(new Konva.Line({points:[outerEnd,upperY,outerEnd,lowerY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 내창 하단 수평선
      g.add(new Konva.Line({points:[innerStart,lowerY,innerR,lowerY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
      // 내창 좌측 수직 (Z 두 번째 수직)
      g.add(new Konva.Line({points:[innerStart,upperY,innerStart,lowerY],
        stroke:'#0A0A0A',strokeWidth:1.5,listening:false}));
    }
    // 미부착 경고 — spaceId 없거나 해당 공간이 삭제된 경우 빨간 점선
    const isAttached=o.spaceId&&STATE.spaces.some(s=>s.id===o.spaceId);
    if(!isAttached){
      g.add(new Konva.Rect({x:-w/2-5,y:-9,width:w+10,height:18,
        stroke:'#E2725B',strokeWidth:1.5,fillEnabled:false,dash:[5,3],cornerRadius:2,listening:false}));
    }
    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('opening',o.id);});
    groups.openings.add(g);
    // 라벨에 W×H 표시 — 2026-08-24 v6.0: LOD (45% 미만 축소 시 생략)
    if(STATE.zoom<0.45) return;
    const subTypeName=isDoor?(DOOR_TYPES[o.subType]||{name:'문'}).name:(WINDOW_TYPES[o.subType]||{name:'창'}).name;
    labelOpeningsGroup.add(new Konva.Text({
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
  const tr=Math.floor(r*k),tg=Math.floor(g*k),tb=Math.floor(b*k); // v5.9 fix: round→floor 회귀 복원 (테스트 스펙 기준)
  return '#'+tr.toString(16).padStart(2,'0')+tg.toString(16).padStart(2,'0')+tb.toString(16).padStart(2,'0');
}

// 2026-08-24: 계단실(STAIRS) 공간 연동 계단 — 공간 bbox에 자동 맞춤 (대표 지시)
// s.stair = {type:'I'|'L'|'U', stepCount?, splitCount?, width_mm?, floorHeight_mm?, upDir?, showBreak?, rot?, mirror?}
// 미지정 값은 전부 자동: 단수=길이/280, 꺾임 배분=플라이트 길이 비례, 폭/참=공간 절반
function _polyBBoxMm(poly){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  poly.forEach(p=>{if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.y<minY)minY=p.y;if(p.y>maxY)maxY=p.y;});
  return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
}
// 2026-08-26: 방 자체 기준축(OBB) — 공간을 회전시키면 계단도 방을 따라가야 한다 (대표 보고)
//  가장 긴 변의 각도를 방 축으로 삼되 90° 로 접어 (-45,45] 로 정규화 →
//  축정렬 방은 각도 0 이라 기존 동작과 완전히 동일 (회귀 없음)
function _polyFrameMm(poly){
  let bestLen=-1,ang=0;
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
    if(len>bestLen){bestLen=len;ang=Math.atan2(dy,dx);}
  }
  let deg=ang*180/Math.PI;
  deg=((deg%90)+90)%90; if(deg>45) deg-=90;
  if(Math.abs(deg)<0.05) deg=0;
  const r=-deg*Math.PI/180, cos=Math.cos(r), sin=Math.sin(r);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  poly.forEach(p=>{
    const x=p.x*cos-p.y*sin, y=p.x*sin+p.y*cos;
    if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y;
  });
  const cxL=(minX+maxX)/2, cyL=(minY+maxY)/2;
  const r2=deg*Math.PI/180, c2=Math.cos(r2), s2=Math.sin(r2);
  return {deg,w:maxX-minX,h:maxY-minY,cx:cxL*c2-cyL*s2,cy:cxL*s2+cyL*c2};
}
function spaceStairInfo(s){
  if(!s||!s.polygon||s.polygon.length<3) return null;
  const bb=_polyFrameMm(s.polygon); // 2026-08-26: 방 기준축(회전 추종). 축정렬 방은 deg=0 → 기존과 동일
  if(bb.w<600||bb.h<600) return null;
  const st=s.stair||{};
  const rot=(((Math.round((st.rot||0)/90)*90)%360)+360)%360;
  const swap=(rot===90||rot===270);
  const lw=swap?bb.h:bb.w, lh=swap?bb.w:bb.h;
  const type=(st.type==='L'||st.type==='U')?st.type:'I';
  if(type==='I'){
    const N=Math.max(2,Math.round(st.stepCount||lh/280));
    return {bb,rot,lw,lh,type,N,T:lh/N,W:lw};
  }
  if(type==='L'){
    const W=Math.max(300,Math.min(Math.round(st.width_mm||Math.min(lw,lh)*0.5),Math.min(lw,lh)-300));
    const LA=lh-W,LB=lw-W;
    const N=Math.max(2,Math.round(st.stepCount||(LA+LB)/280));
    const N1=Math.max(1,Math.min(N-1,Math.round(st.splitCount||N*LA/(LA+LB))));
    const N2=N-N1;
    return {bb,rot,lw,lh,type,W,LA,LB,N,N1,N2,T1:LA/N1,T2:LB/N2};
  }
  const W=lw/2;
  const L0=Math.max(300,Math.min(Math.round(st.width_mm||lw/2),Math.round(lh*0.5)));
  const LF=lh-L0;
  const N=Math.max(2,Math.round(st.stepCount||2*LF/280));
  const N1=Math.max(1,Math.min(N-1,Math.round(st.splitCount||N/2)));
  const N2=N-N1;
  return {bb,rot,lw,lh,type,W,L0,LF,N,N1,N2,T1:LF/N1,T2:LF/N2};
}
// 도식 명령 회전(90° 단위)·미러 변환 — 텍스트는 위치만 이동 (글자는 항상 정방향)
function _xformShape(shp,rot,mir){
  const r=(((rot||0)%360)+360)%360;
  if(r===0&&!mir) return shp;
  const t=(x,y)=>{
    if(mir) x=-x;
    if(r===90) return {x:-y,y:x};
    if(r===180) return {x:-x,y:-y};
    if(r===270) return {x:y,y:-x};
    return {x,y};
  };
  return shp.map(c=>{
    if(c.type==='rect'){
      const p1=t(c.x,c.y),p2=t(c.x+c.w,c.y+c.h);
      return {...c,x:Math.min(p1.x,p2.x),y:Math.min(p1.y,p2.y),w:Math.abs(p2.x-p1.x),h:Math.abs(p2.y-p1.y)};
    }
    if(c.type==='line'){const p1=t(c.x1,c.y1),p2=t(c.x2,c.y2);return {...c,x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y};}
    if(c.type==='circle'){const p=t(c.cx,c.cy);return {...c,cx:p.x,cy:p.y};}
    if(c.type==='text'){const p=t(c.x,c.y);return {...c,x:p.x,y:p.y};}
    return c;
  });
}
function buildSpaceStairShape(s){
  const P=spaceStairInfo(s);
  if(!P) return null;
  const st=s.stair||{};
  const up=(st.upDir||'up')!=='down';
  const brk=st.showBreak!==false;
  const S='#0A0A0A';
  const {lw,lh,type}=P;
  const x0=-lw/2,y0=-lh/2;
  const shp=[];
  const seg=(x1,y1,x2,y2,sw,dash)=>shp.push({type:'line',x1,y1,x2,y2,stroke:S,sw:sw||16,dash});
  const AW=Math.min(1500,type==='U'?P.W:lw);
  const circle=(cx,cy)=>shp.push({type:'circle',cx,cy,r:Math.min(70,AW*0.07),stroke:S,sw:20});
  const head=(x,y,dx,dy)=>{const ah=Math.min(160,AW*0.14),px=-dy,py=dx;
    seg(x,y,x-dx*ah+px*ah*0.45,y-dy*ah+py*ah*0.45,20);
    seg(x,y,x-dx*ah-px*ah*0.45,y-dy*ah-py*ah*0.45,20);};
  const label=(x,y)=>shp.push({type:'text',x,y,text:up?'UP':'DN',fontSize:Math.min(240,Math.max(120,AW*0.2)),fill:S});
  if(type==='I'){
    const {N,T}=P;
    const brkY=y0+lh*0.38;
    for(let i=1;i<N;i++){const y=y0+i*T;seg(x0,y,x0+lw,y,16,(brk&&y<brkY)?[120,90]:undefined);}
    if(brk){seg(x0,brkY+T*0.8,x0+lw,brkY-T*0.6,30);seg(x0,brkY+T*1.4,x0+lw,brkY,18);}
    const sy=up?y0+lh-T*0.6:y0+T*0.6, ey=up?y0+T*0.9:y0+lh-T*0.9;
    circle(0,sy);seg(0,sy,0,ey,20);head(0,ey,0,up?-1:1);
    label(AW*0.10,sy-(up?T*1.1:0));
  }else if(type==='L'){
    const {W,LA,LB,N1,N2,T1,T2}=P;
    // 참(좌상)·플라이트 경계선
    seg(x0,y0+W,x0+W,y0+W,18);
    seg(x0+W,y0,x0+W,y0+W,18);
    seg(x0+W,y0+W,x0+W,y0+lh,18);
    seg(x0+W,y0+W,x0+lw,y0+W,18);
    for(let i=1;i<N1;i++) seg(x0,y0+W+i*T1,x0+W,y0+W+i*T1);
    const bX=x0+W+LB*0.60;
    for(let i=1;i<N2;i++){const x=x0+W+i*T2;seg(x,y0,x,y0+W,16,(brk&&x>bX)?[120,90]:undefined);}
    if(brk){seg(bX-T2*0.6,y0,bX+T2*0.8,y0+W,30);seg(bX,y0,bX+T2*1.4,y0+W,18);}
    const ax=x0+W/2,sy=y0+W+LA-T1*0.6,my=y0+W/2,ex=x0+W+LB-T2*0.9;
    if(up){circle(ax,sy);seg(ax,sy,ax,my,20);seg(ax,my,ex,my,20);head(ex,my,1,0);label(ax+AW*0.10,sy-T1*1.1);}
    else{circle(ex,my);seg(ex,my,ax,my,20);seg(ax,my,ax,sy,20);head(ax,sy,0,1);label(ex-AW*0.55,my-T2*1.4);}
  }else{
    const {W,L0,LF,N1,N2,T1,T2}=P;
    seg(x0,y0+L0,x0+lw,y0+L0,18);
    seg(x0+W-15,y0+L0,x0+W-15,y0+lh,13);seg(x0+W+15,y0+L0,x0+W+15,y0+lh,13);
    for(let i=1;i<N1;i++) seg(x0,y0+L0+i*T1,x0+W,y0+L0+i*T1);
    const bY=y0+L0+LF*0.55;
    for(let i=1;i<N2;i++){const y=y0+L0+i*T2;seg(x0+W,y,x0+lw,y,16,(brk&&y>bY)?[120,90]:undefined);}
    if(brk){seg(x0+W,bY+T2*0.8,x0+lw,bY-T2*0.6,30);seg(x0+W,bY+T2*1.4,x0+lw,bY,18);}
    const lx=x0+W/2,rx=x0+W*1.5,sy=y0+L0+LF-T1*0.6,ey=y0+L0+LF-T2*0.9,my=y0+L0/2;
    if(up){circle(lx,sy);seg(lx,sy,lx,my,20);seg(lx,my,rx,my,20);seg(rx,my,rx,ey,20);head(rx,ey,0,1);label(lx+AW*0.10,sy-T1*1.1);}
    else{circle(rx,ey);seg(rx,ey,rx,my,20);seg(rx,my,lx,my,20);seg(lx,my,lx,sy,20);head(lx,sy,0,1);label(rx+AW*0.10,ey-T2*1.1);}
  }
  return _xformShape(shp,P.rot,!!st.mirror);
}
// 2026-08-24 v6.1: 점형 기호 비축척 보정 (대표 지시 — 기호가 너무 작아 안 보임)
// 실무 CAD 관례: 전기·감지기·점형 조명 기호는 Not-to-Scale. 화면 최소 크기(px) 보장, 실좌표·데이터 불변.
function symbolBoostFactor(kind,def){
  if(STATE.symbolBoost===false) return 1;
  if(!(kind==='electric'||kind==='hvac'||kind==='lights')) return 1;
  const baseMm=def.size||Math.max(def.w||0,def.h||0);
  if(!baseMm) return 1;
  const basePx=mmToPx(baseMm);
  const MINPX=34;
  if(basePx>=MINPX||basePx<=0) return 1;
  return Math.min(MINPX/basePx,5); // 최대 5배 (과대 확대 방지)
}
// 2026-08-24: 점형 기호 글씨 라벨 — 기호는 실척 그대로, 이름만 고정 px 크기로 항상 판독 (대표 지시)
// 2026-08-26: 소형 기호 픽 어퍼처 (대표 보고 — 기호가 8px라 정중앙만 눌려 패널이 안 뜨던 문제)
//  화면 표시 크기는 실척 그대로 두고, 클릭 판정 영역만 최소 34px 로 확대 (CAD 픽 어퍼처 관례)
const SYM_PICK_PX=17; // 반경
function addSymbolPickArea(g,def,boost){
  if(_pm()) return; // 2026-08-27: 클릭 편의용 영역 — 인쇄에는 만들지 않는다
  const wMm=def.w||def.size||200, hMm=def.h||def.size||200;
  const maxPx=Math.max(mmToPx(wMm),mmToPx(hMm));
  if(maxPx>=SYM_PICK_PX*2) return; // 충분히 크면 불필요
  const b=Math.max(boost||1,0.001);
  g.add(new Konva.Circle({radius:SYM_PICK_PX/b,fill:'#000',opacity:0.001,listening:true}));
}
// 2026-08-26: 이름 글씨 클릭 = 해당 객체 선택 (작은 기호 대신 큰 글씨를 눌러도 되게)
function _symbolLabelClick(kind,id){
  return e=>{
    if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0) return;
    e.cancelBubble=true;
    if(kind==='lights'&&window._circuitLink&&typeof toggleCircuitLink==='function'){toggleCircuitLink(window._circuitLink.switchId,id);return;}
    if(kind==='lights'&&window._jumpLink&&typeof toggleJumpLink==='function'){toggleJumpLink(window._jumpLink.lightId,id);return;}
    if(STATE.selectedTool==='select'&&typeof selectObj==='function') selectObj(kind,id);
  };
}
// ===== 2026-08-28: 기호 이름 라벨 표시 모드 (대표 지시 — 다운라이트를 넣을수록 같은 글씨가 도배되고 렉이 걸린다) =====
//  종전엔 소형 기호마다 이름 글씨를 하나씩 붙였다. 다운라이트를 수십 개 깔면 같은 글씨가 도면을
//  덮고, 글씨마다 그림자(Konva shadow)가 붙어 렌더도 눈에 띄게 느려졌다.
//   · smart(기본) : 같은 공간 안의 같은 종류는 대표 1개만 「다운라이트 3\" ×8」 로 표시
//   · off        : 선택한 것만 표시
//   · all        : 전부 표시 (종전 동작)
//  객체별 o.showLabel(true/false)는 모드보다 우선 — 속성 패널에서 그 하나만 켜고 끕 수 있다.
const SYMBOL_LABEL_MODES=['smart','off','all'];
const SYMBOL_LABEL_KINDS=['lights','electric','hvac','fixtures'];
function symbolLabelMode(){
  return SYMBOL_LABEL_MODES.indexOf(STATE.symbolLabelMode)>=0?STATE.symbolLabelMode:'smart';
}
// 이름 라벨을 붙일 '작은 점형 기호'인지 — 종전 렌더 조건들을 한 곳으로 모은 것
function symbolLabelEligible(kind,def){
  if(!def) return false;
  if(kind==='electric') return true;
  if(kind==='lights')   return (def.size||0)<=400;   // 라인·간접조명(길이 가변)은 제외
  if(kind==='hvac')     return (def.size||0)<=600;
  if(kind==='fixtures') return Math.max(def.w||0,def.h||0)<=300; // 바닥 배수구 등
  return false;
}
// 종류별 정의 조회 (다운라이트 인치·라인조명 길이 반영)
function symbolDefOf(kind,o){
  if(!o) return null;
  if(kind==='lights') return (o.type==='downlight')?downlightDef(o)
    :(o.type==='bath_light'?bathLightDef(o)
    :(isLinearLight(o.type)?linearLightDef(o):LIGHT_LIB[o.type]));
  const lib=(kind==='electric')?ELECTRIC_LIB:(kind==='hvac')?HVAC_FIRE_LIB
           :(kind==='fixtures')?FIXTURE_LIB
           :(kind==='furniture')?FURNITURE_LIB:null; // 2026-08-29: 범례가 가구 한글명을 쓰도록
  return lib?lib[o.type]:null;
}
// ===== 2026-08-29: 범례용 품명·규격 (대표 보고 — 범례에 다운라이트 인치가 안 적혀 있다) =====
//  종전엔 LIGHT_LIB[type].name 을 그대로 썼다. 그러면 2"·3"·6" 가 전부 '다운라이트' 한 줄로
//  묶여, 현장에서 몇 인치를 몇 개 사야 하는지 알 수 없었다.
function legendItemOf(kind,o){
  const def=(typeof symbolDefOf==='function')?symbolDefOf(kind,o):null;
  const base=def||{};
  if(kind==='lights'&&o&&o.type==='downlight'){
    const d=downlightDef(o);
    return {name:d.name, spec:'외경 Ø'+d.size+' · 타공 Ø'+d.boreDia_mm};
  }
  if(kind==='lights'&&o&&o.type==='bath_light'){
    const d=bathLightDef(o);
    return {name:d.name, spec:'\uC678\uACBD \u00D8'+d.size}; // 직부형 — 타공경 없음
  }
  if(kind==='lights'&&o&&typeof isLinearLight==='function'&&isLinearLight(o.type)){
    const L=linearLightLen(o);
    return {name:(LIGHT_LIB[o.type]||{}).name||o.type, spec:(L/1000).toFixed(1)+'m'};
  }
  const w=base.w, h=base.h, sz=base.size;
  let spec='';
  if(w&&h) spec=w+'×'+h;
  else if(sz) spec='Ø'+sz;
  return {name:base.name||(o&&o.type)||'', spec:spec};
}
// 점이 들어있는 공간 id (없으면 null) — 묶음의 기준. 거실 8개·주방 4개가 따로 세어진다.
function spaceIdAtMm(x,y){
  if(typeof pointInPolygon!=='function') return null;
  const ss=STATE.spaces||[];
  for(let i=ss.length-1;i>=0;i--){
    const poly=ss[i].polygon;
    if(poly&&poly.length>2&&pointInPolygon({x:x,y:y},poly)) return ss[i].id;
  }
  return null;
}
// 묶음 계획: 대표 객체 id → 찍을 글자. 서명이 같으면 다시 계산하지 않는다.
let _symLabelPlan=null,_symLabelPlanSig=null;
function symbolLabelPlan(){
  let sig;
  try{
    sig=JSON.stringify((STATE.spaces||[]).map(sp=>[sp.id,sp.polygon]))+'§'
       +SYMBOL_LABEL_KINDS.map(k=>JSON.stringify((STATE[k]||[]).map(o=>[o.id,o.type,o.x,o.y,o.inch||0,o.length_mm||0]))).join('§');
  }catch(_){sig=null;}
  if(sig!==null&&_symLabelPlan&&_symLabelPlanSig===sig) return _symLabelPlan;
  const buckets=new Map();
  SYMBOL_LABEL_KINDS.forEach(kind=>{
    (STATE[kind]||[]).forEach(o=>{
      const def=symbolDefOf(kind,o);
      if(!symbolLabelEligible(kind,def)) return;
      const key=kind+'|'+(def.name||o.type)+'|'+(spaceIdAtMm(o.x,o.y)||'-');
      let arr=buckets.get(key); if(!arr){arr=[];buckets.set(key,arr);}
      arr.push({o:o,def:def});
    });
  });
  const rep=new Map();
  buckets.forEach(list=>{
    // 대표 = 묶음 무게중심에 가장 가까운 것 (글씨가 그 무리의 한가운데에 농인다)
    let cx=0,cy=0;
    list.forEach(it=>{cx+=it.o.x;cy+=it.o.y;});
    cx/=list.length;cy/=list.length;
    let best=list[0],bd=Infinity;
    list.forEach(it=>{const dx=it.o.x-cx,dy=it.o.y-cy,d=dx*dx+dy*dy;if(d<bd){bd=d;best=it;}});
    rep.set(best.o.id,(best.def.name||'')+(list.length>1?' ×'+list.length:''));
  });
  _symLabelPlan={rep:rep};_symLabelPlanSig=sig;
  return _symLabelPlan;
}
function invalidateSymbolLabelPlan(){_symLabelPlan=null;_symLabelPlanSig=null;}
// 이 객체에 지금 찍을 글자 (없으면 null)
function symbolLabelTextFor(kind,o,def){
  if(!def||!o) return null;
  const sel=(STATE.selectedKind===kind&&STATE.selectedId===o.id)
          ||(STATE.boxSelection||[]).some(b=>b.kind===kind&&b.id===o.id);
  if(sel) return def.name||null;                 // 선택한 것은 모드와 무관하게 항상 보여준다
  if(o.showLabel===false) return null;           // 이 하나만 숨김
  if(o.showLabel===true)  return def.name||null; // 이 하나만 항상 표시
  const m=symbolLabelMode();
  if(m==='all') return def.name||null;
  if(m==='off') return null;
  return symbolLabelPlan().rep.get(o.id)||null;
}
function addSymbolLabel(group,xPx,yPx,def,kind,id,o){
  // 2026-08-27: 인쇄에서는 기본적으로 범례를 쓴다 (라벨이 심볼보다 커서 도면을 덮음).
  // 2026-08-28: 다만 조명·전기 도면은 이름이 있어야 읽힌다 — 인쇄 설정에서 켜면 찍는다
  if(_pm()&&!STATE.printLabels) return;
  if(STATE.zoom<0.3) return; // 극축소 시 겹침 방지
  const text=symbolLabelTextFor(kind,o||{id:id},def);
  if(!text) return;
  const halfPx=mmToPx((def.size||Math.max(def.w||0,def.h||0)||200))/2;
  // 2026-08-28: 글씨가 작아 안 읽힌다는 지적 — 개수가 줄어든 만큼 키우고,
  //  그림자 대신 외곽선으로 가독성을 낸다 (Konva 그림자가 라벨 수만큼 느려지던 주범)
  const t=new Konva.Text({
    x:xPx-75,y:yPx+halfPx+4,width:150,align:'center',
    text:text,fontSize:11.5,fontFamily:'Inter',fontStyle:'700',
    fill:def.c||'#9aa0b5',listening:!!kind,
    stroke:'#0A0A0A',strokeWidth:2.6,fillAfterStrokeEnabled:true,lineJoin:'round',
  });
  if(kind){t.on('click tap',_symbolLabelClick(kind,id));t.on('mouseenter',()=>{document.body.style.cursor='pointer';});t.on('mouseleave',()=>{document.body.style.cursor='';});}
  group.add(t);
}
// 2026-08-29: 배선 선 규격 — 회로선·점핑선이 따로 놀지 않게 한 곳에서 정한다
//  가는 점선 — 기구(다운라이트)보다 약하게 보여야 도면이 읽힌다
const CIRCUIT_LINE_W=1.0;
const CIRCUIT_LINE_DASH=[5,4];
// 2026-08-26: 스위치→조명 회로 연동 (대표 지시) — 스위치 ON 시 연결된 조명 점등 표시
function isSwitchType(t){return /^switch|^dimmer/.test(t||'');}
// 2026-08-27: 실무 배선 반영 — 조명끼리 '점핑(데이지 체인)'으로 이어지면 스위치 ON 시 연쇄 점등 (대표 지시)
//  o.jumpIds = 이 조명과 직접 연결된 다른 조명 id 배열 (무방향)
function lightById(id){return (STATE.lights||[]).find(l=>l.id===id);}
function jumpNeighbors(id){
  const out=new Set();
  const l=lightById(id);
  if(l&&Array.isArray(l.jumpIds)) l.jumpIds.forEach(j=>{if(lightById(j))out.add(j);});
  (STATE.lights||[]).forEach(o=>{if(Array.isArray(o.jumpIds)&&o.jumpIds.indexOf(id)>=0) out.add(o.id);});
  out.delete(id);
  return [...out];
}
// 시드(스위치 직결 조명)에서 점핑을 따라 확장한 전체 집합
function expandJumpChain(seedIds){
  const seen=new Set(),stack=[];
  (seedIds||[]).forEach(id=>{if(lightById(id)&&!seen.has(id)){seen.add(id);stack.push(id);}});
  while(stack.length){
    const cur=stack.pop();
    jumpNeighbors(cur).forEach(n=>{if(!seen.has(n)){seen.add(n);stack.push(n);}});
  }
  return seen;
}
// ===== 2026-08-30: 스위치 구(gang)별 점등 (대표 지시 — 6구면 1~6번을 따로 켜고 꺼서 조명 테스트) =====
//  종전엔 스위치 하나에 lightIds 한 묶음 + circuitOn 하나뿐이라, 6구 스위치라도
//  전부 켜지거나 전부 꺼지는 두 상태만 있었다. 실제 현장은 구마다 회로가 다르다.
//  · sw.lightGang = {lightId: 구번호(0-based)}  — 없으면 1구(0)
//  · sw.gangOn    = [bool × 구수]               — 구별 점등
//  · sw.circuitOn 은 '하나라도 켜졌나'로 유지 (기존 문서·코드 호환)
const SWITCH_GANGS={switch_1:1,switch_2:2,switch_3:3,switch_4:4,switch_5:5,switch_6:6,
                    switch_3way:1,dimmer:1};
function switchGangCount(t){return SWITCH_GANGS[t]||1;}
function switchGangOn(sw){
  const n=switchGangCount(sw&&sw.type);
  if(!sw) return [];
  if(!Array.isArray(sw.gangOn)) sw.gangOn=[];
  // 예전 문서: circuitOn 하나로 전체가 켜져 있었다 → 1구에 몰아넣지 말고 전 구에 반영
  while(sw.gangOn.length<n) sw.gangOn.push(!!sw.circuitOn);
  if(sw.gangOn.length>n) sw.gangOn.length=n;
  // 2026-08-30: circuitOn 을 그냥 대입하는 경로(구형 코드·불러온 문서)가 살아있다.
  //  마지막으로 맞춘 값과 달라졌으면 밖에서 건드린 것 — 전 구에 그대로 반영한다.
  if(sw._gangSync!==!!sw.circuitOn){
    const any=sw.gangOn.some(v=>v);
    if(!!sw.circuitOn!==any){ for(let i=0;i<n;i++) sw.gangOn[i]=!!sw.circuitOn; }
    sw._gangSync=!!sw.circuitOn;
  }
  return sw.gangOn;
}
function lightGangOf(sw,lightId){
  const g=sw&&sw.lightGang&&sw.lightGang[lightId];
  const n=switchGangCount(sw&&sw.type);
  const i=Math.round(g||0);
  return (i>=0&&i<n)?i:0;
}
function setLightGang(sw,lightId,gangIdx){
  if(!sw) return;
  if(!sw.lightGang||typeof sw.lightGang!=='object') sw.lightGang={};
  const n=switchGangCount(sw.type);
  sw.lightGang[lightId]=Math.max(0,Math.min(n-1,Math.round(gangIdx||0)));
}
// 이 구에 걸린 조명들
function gangLightIds(sw,gangIdx){
  if(!sw||!Array.isArray(sw.lightIds)) return [];
  return sw.lightIds.filter(id=>lightGangOf(sw,id)===gangIdx);
}
// circuitOn 을 구 상태에서 다시 계산 (배지·기존 코드가 이 값을 본다)
function syncSwitchCircuitOn(sw){
  if(!sw) return false;
  const on=switchGangOn(sw).some((v,i)=>v&&gangLightIds(sw,i).length>0);
  sw.circuitOn=on;sw._gangSync=on;
  return on;
}
function toggleSwitchGang(switchId,gangIdx,force){
  const sw=(STATE.electric||[]).find(e=>e.id===switchId);
  if(!sw) return false;
  const arr=switchGangOn(sw);
  const n=switchGangCount(sw.type);
  if(gangIdx<0||gangIdx>=n) return false;
  arr[gangIdx]=(typeof force==='boolean')?force:!arr[gangIdx];
  syncSwitchCircuitOn(sw);
  return arr[gangIdx];
}
function setAllSwitchGangs(switchId,on){
  const sw=(STATE.electric||[]).find(e=>e.id===switchId);
  if(!sw) return 0;
  const arr=switchGangOn(sw);
  for(let i=0;i<arr.length;i++) arr[i]=!!on;
  syncSwitchCircuitOn(sw);
  return arr.length;
}
// ===== 2026-08-30: 조명 점등에 영향을 주는 스위치 상태 서명 =====
//  ⚠ 스위치에 '어느 조명이 켜지나'를 바꾸는 필드를 추가하면 반드시 여기에도 넣을 것.
//  빠뜨리면 값은 바뀌는데 화면이 그대로다 — 렌더 캐시가 서명으로 재렌더를 판단하기 때문.
//  (2026-08-30 대표 보고: gangOn 을 빠뜨려 '전체 토글은 되는데 구별 토글은 즉시 안 보임')
function switchLightingSig(e){
  // lightGang 은 점등뿐 아니라 '다른 구 연결' 경고 판정에도 쓰인다
  return [e.id, e.circuitOn?1:0, (e.lightIds||[]).join('.'),
          (e.gangOn||[]).map(v=>v?1:0).join(''),
          e.lightGang?Object.keys(e.lightGang).sort().map(k=>k+':'+e.lightGang[k]).join(','):''];
}
function litLightIds(){
  const seeds=[];
  (STATE.electric||[]).forEach(sw=>{
    if(!isSwitchType(sw.type)||!Array.isArray(sw.lightIds)) return;
    // 2026-08-30: 구별로 따진다 — 6구 스위치의 2번만 켜면 2번 조명만 점등
    const on=switchGangOn(sw);
    sw.lightIds.forEach(id=>{ if(on[lightGangOf(sw,id)]) seeds.push(id); });
  });
  return expandJumpChain(seeds); // 점핑 연쇄 포함
}
// 점핑선을 그릴 대상 집합 (선택·회로 상시표시·연결 모드 기준)
function jumpVisibleSet(){
  const set=new Set();
  if(STATE.showCircuits){ (STATE.lights||[]).forEach(l=>set.add(l.id)); return set; }
  if(window._jumpLink&&window._jumpLink.lightId){
    set.add(window._jumpLink.lightId);
    jumpNeighbors(window._jumpLink.lightId).forEach(n=>set.add(n));
  }
  if(STATE.selectedKind==='lights'&&STATE.selectedId){
    set.add(STATE.selectedId);
    jumpNeighbors(STATE.selectedId).forEach(n=>set.add(n));
  }
  if(STATE.selectedKind==='electric'&&STATE.selectedId){
    const sw=(STATE.electric||[]).find(e=>e.id===STATE.selectedId);
    if(sw&&isSwitchType(sw.type)) expandJumpChain(sw.lightIds||[]).forEach(id=>set.add(id));
  }
  (STATE.boxSelection||[]).forEach(b=>{if(b.kind==='lights'){set.add(b.id);jumpNeighbors(b.id).forEach(n=>set.add(n));}});
  return set;
}
function renderRect(arr,group,lib,kind){
  group.destroyChildren();
  arr.forEach(o=>{
    const def=lib[o.type];
    if(!def) return;
    const shapeDef=def.shape;
    const defW=def.w, defH=def.h;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind===kind&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind===kind&&b.id===o.id);
    // v5.7: flipped(미러) 좌우반전 — 그룹 scaleX(-1)로 처리, 단 텍스트 노드는 별도 보정
    const sx=o.flipped?-1:1;
    const _boost=symbolBoostFactor(kind,def); // v6.1: 점형 기호 비축척 보정
    const g=new Konva.Group({x,y,rotation:o.angle||0,scaleX:sx*_boost,scaleY:_boost,id:o.id});
    if(kind==='hvac'||kind==='fixtures'||kind==='lights'||kind==='electric') addSymbolPickArea(g,def,_boost); // 2026-08-26: 픽 어퍼처
    // v5.7: 2.5D ON 시 그림자 — 객체 외곽 사각형을 어두운 색으로 약간 옵셋
    if(STATE.plus2D){
      const w=mmToPx(defW),h=mmToPx(defH);
      const sd=mmToPx(80); // 80mm 옵셋 (px 환산)
      g.add(new Konva.Rect({x:-w/2+sd,y:-h/2+sd,width:w,height:h,
        fill:'#000',opacity:0.18,listening:false,cornerRadius:4}));
    }
    if(shapeDef){
      // v5.5: 정교한 도형 (shape 정의 기반)
      const nodes=drawShape(shapeDef);
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
      // v5.9: 영문 이름 라벨 — 객체 중앙. 흰 글자 + 검정 외곽선으로 모든 배경에서 가독성 확보
      // 2026-08-24 v6.0: LOD — 45% 미만 축소 시 라벨 생략 (대형 도면 렌더 부하·글자 뭉침 방지)
      // 2026-08-27: 도면 위 영문명 대형 라벨은 인쇄 제외 — 2페이지 범례로 대신한다
      if(def.nameEn&&STATE.zoom>=0.45&&!_pm()){
        const w=mmToPx(defW),h=mmToPx(defH);
        const minDim=Math.min(w,h);
        const fontSize=Math.max(10,Math.min(18,minDim*0.14));
        const txt=new Konva.Text({
          x:-w/2,y:-fontSize*0.7,
          width:w,height:fontSize*1.4,
          text:def.nameEn,
          fontSize:fontSize,
          fontFamily:'Inter Tight, Inter, sans-serif',
          fontStyle:'700',
          fill:'#FFFFFF',
          stroke:'#000000',
          strokeWidth:Math.max(2.5,fontSize*0.22),
          fillAfterStrokeEnabled:true,
          lineJoin:'round',
          align:'center',verticalAlign:'middle',
          listening:false,
          shadowColor:'#000000',
          shadowBlur:3,
          shadowOpacity:0.6,
        });
        if(o.flipped) txt.scaleX(-1);
        g.add(txt);
      }
      if(sel){
        // 선택 시 골드 외곽 박스 (mm 좌표 기준)
        const w=mmToPx(defW),h=mmToPx(defH);
        g.add(new Konva.Rect({x:-w/2-3,y:-h/2-3,width:w+6,height:h+6,
          stroke:'#E2725B',strokeWidth:2.5,dash:[6,4],fill:'transparent',
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6}));
      }
    }else{
      // 폴백: 기존 단순 사각형
      const w=mmToPx(defW),h=mmToPx(defH);
      g.add(new Konva.Rect({x:-w/2,y:-h/2,width:w,height:h,fill:def.c+'CC',
        stroke:sel?'#E2725B':'#0A0A0A',strokeWidth:sel?2.5:1,cornerRadius:2}));
      g.add(new Konva.Text({x:-w/2,y:-h/2,width:w,height:h,text:def.name,
        fontSize:Math.min(11,h*0.18),fontFamily:'Inter',
        fill:'#0A0A0A',align:'center',verticalAlign:'middle',listening:false}));
    }
    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj(kind,o.id);});
    // v5.9: 잠금 시각효과 — 반투명만
    if(o.locked) g.opacity(0.30);
    group.add(g);
    // 2026-08-24: 소형 점형 기호(감지기·스프링클러 등)는 이름 라벨 고정 표시
    // 2026-08-28: 라벨 표시 조건은 symbolLabelEligible 한 곳으로 통일 (묶음 계획과 어긋나지 않도록)
    if((kind==='hvac'||kind==='fixtures')&&symbolLabelEligible(kind,def)) addSymbolLabel(group,x,y,def,kind,o.id,o);
  });
}

// 2026-08-25: 라인·간접조명 길이 가변 (대표 지시) — 하나를 넣고 길이를 입력해 길게 뺀다
//  o.length_mm 인스턴스 속성. 단면 높이는 고정, 길이 방향만 실치수로 다시 그린다.
const LINEAR_LIGHT_TYPES=['line_t5','cove','magnet_track','fluorescent','pendant_linear'];
const LINEAR_LIGHT_CROSS={line_t5:60,cove:140,magnet_track:70,fluorescent:100,pendant_linear:140};
const LINEAR_LIGHT_MIN=300, LINEAR_LIGHT_MAX=30000;
function isLinearLight(t){return LINEAR_LIGHT_TYPES.indexOf(t)>=0;}
function linearLightLen(o){
  const base=LIGHT_LIB[o&&o.type]||{};
  const n=Math.round((o&&o.length_mm)||0);
  return Math.max(LINEAR_LIGHT_MIN,Math.min(LINEAR_LIGHT_MAX,n||base.size||1200));
}
function linearLightShape(type,L){
  const h=L/2;
  if(type==='cove'){
    return [
      {type:'rect',x:-h,y:-25,w:L,h:50,fill:'#FFF8E0',stroke:'#F5E5B8',sw:3,r:25},
      {type:'line',x1:-h,y1:-70,x2:h,y2:-70,stroke:'#D4B872',sw:5,dash:[70,50]},
      {type:'line',x1:-h,y1:70,x2:h,y2:70,stroke:'#D4B872',sw:5,dash:[70,50]},
    ];
  }
  if(type==='magnet_track'){
    const out=[{type:'rect',x:-h,y:-35,w:L,h:70,fill:'#2E2E2E',stroke:'#101010',sw:6,r:8}];
    const n=Math.max(2,Math.round(L/450));
    const seg=L/n;
    for(let i=0;i<n;i++){
      const cx=-h+(i+0.5)*seg;
      if(i%2===0) out.push({type:'circle',cx,cy:0,r:45,fill:'#D4B872',stroke:'#A88248',sw:4});
      else{
        const mw=Math.min(360,seg*0.7);
        out.push({type:'rect',x:cx-mw/2,y:-22,w:mw,h:44,fill:'#FFF3D0',stroke:'#D4B872',sw:3,r:22});
      }
    }
    return out;
  }
  if(type==='fluorescent'){
    return [
      {type:'rect',x:-h,y:-50,w:L,h:100,fill:'#F5E5B8',stroke:'#D4B872',sw:5,r:5},
      {type:'rect',x:-h+20,y:-30,w:Math.max(10,L-40),h:60,fill:'#FFF8E0',stroke:'#F5E5B8',sw:2,r:3},
    ];
  }
  if(type==='pendant_linear'){
    return [
      {type:'rect',x:-h,y:-70,w:L,h:140,fill:'#2E2E2E',stroke:'#101010',sw:6,r:70},
      {type:'rect',x:-h+60,y:-28,w:Math.max(10,L-120),h:56,fill:'#FFF3D0',stroke:'#D4B872',sw:3,r:28},
      {type:'circle',cx:-L*0.32,cy:0,r:10,fill:'#5A5A5A',stroke:'#2E2E2E',sw:2},
      {type:'circle',cx:L*0.32,cy:0,r:10,fill:'#5A5A5A',stroke:'#2E2E2E',sw:2},
    ];
  }
  // line_t5 (기본)
  return [
    {type:'rect',x:-h,y:-30,w:L,h:60,fill:'#FFF3D0',stroke:'#D4B872',sw:5,r:30},
    {type:'rect',x:-h-20,y:-18,w:40,h:36,fill:'#5A5A5A',stroke:'#2A2A2A',sw:3,r:8},
    {type:'rect',x:h-20,y:-18,w:40,h:36,fill:'#5A5A5A',stroke:'#2A2A2A',sw:3,r:8},
    {type:'line',x1:-h+40,y1:0,x2:h-40,y2:0,stroke:'#FFE9A8',sw:14},
  ];
}
function linearLightDef(o){
  const base=LIGHT_LIB[o.type]||{};
  const L=linearLightLen(o);
  return {...base,size:L,length_mm:L,crossH:LINEAR_LIGHT_CROSS[o.type]||80,
    name:base.name+' '+L+'mm',shape:linearLightShape(o.type,L)};
}
// ===== 2026-08-30: 라이브러리 규격 변형 (대표 지시 — 방습등·다운라이트를 사이즈별로) =====
//  팔레트 키에 '#'로 규격을 붙인다: downlight#3 / bath_light#300
//  타입 자체는 하나로 두고(downlight, bath_light) 규격은 객체 속성으로 간다 —
//  타입을 쪼개면 견적·범례·기존 문서가 전부 갈라진다.
function libBaseType(key){
  const k=String(key||''); const i=k.indexOf('#');
  return i<0?k:k.slice(0,i);
}
function libVariantVal(key){
  const k=String(key||''); const i=k.indexOf('#');
  if(i<0) return null;
  const v=parseInt(k.slice(i+1),10);
  return isFinite(v)?v:null;
}
// 규격 변형을 객체에 실어준다 (배치 시점)
function applyLibVariant(o,key){
  const v=libVariantVal(key);
  if(v===null||!o) return o;
  const t=libBaseType(key);
  if(t==='downlight'||t==='bath_light') o.inch=v; // 2026-08-30: 방습등도 인치
  return o;
}
// 팔레트 키('downlight#3')로 정의를 가져온다 — 썸네일·고스트·이름이 규격을 따른다
function libDefForKey(lib,key){
  const t=libBaseType(key), v=libVariantVal(key);
  const base=lib&&lib[t];
  if(!base) return null;
  if(v===null) return base;
  if(t==='downlight'&&typeof downlightDef==='function') return downlightDef({type:t,inch:v});
  if(t==='bath_light') return bathLightDef({type:t,inch:v});
  return base;
}
// 도형 전체를 비율로 키우고 줄인다 (각도는 건드리지 않는다)
const SHAPE_SCALE_FIELDS=['x','y','w','h','r','cx','cy','x1','y1','x2','y2','sw','rx','ry'];
function scaleShape(shape,k){
  if(!Array.isArray(shape)||!isFinite(k)||k===1) return shape;
  return shape.map(c=>{
    const o={...c};
    SHAPE_SCALE_FIELDS.forEach(f=>{ if(typeof o[f]==='number') o[f]=o[f]*k; });
    if(Array.isArray(o.dash)) o.dash=o.dash.map(v=>v*k);
    if(Array.isArray(o.points)) o.points=o.points.map(v=>v*k);
    return o;
  });
}
// 방습등 규격 — 욕실 크기에 따라 흔히 쓰는 지름
// 2026-08-30 대표 지시: 방습등도 다운라이트처럼 인치로 (2~6인치, 같은 규격표)
//  직부형이라 타공경은 안 쓰고 외경만 본다.
const BATH_LIGHT_INCH_DEFAULT=3;
function bathLightInchOf(o){
  const n=Math.round((o&&o.inch)||0);
  if(DOWNLIGHT_INCH[n]) return n;
  // 지름(mm)으로 넣어둔 예전 값은 가까운 인치로 옮긴다
  const mm=Math.round((o&&o.size_mm)||0);
  if(mm>0){
    let best=BATH_LIGHT_INCH_DEFAULT,bd=Infinity;
    Object.keys(DOWNLIGHT_INCH).forEach(k=>{
      const d=Math.abs(DOWNLIGHT_INCH[k].outer-mm);
      if(d<bd){bd=d;best=Math.round(+k);}
    });
    return best;
  }
  return BATH_LIGHT_INCH_DEFAULT;
}
function bathLightDef(o){
  const base=LIGHT_LIB.bath_light;
  const inch=bathLightInchOf(o);
  const d=DOWNLIGHT_INCH[inch];
  const k=d.outer/(base.size||350);
  return {...base, size:d.outer, inch:inch,
    name:'방습등 '+inch+'\"', nameEn:inch+'-inch moisture-proof bath light',
    shape:scaleShape(base.shape,k)};
}
// 2026-08-25: 다운라이트 인치별 도식 (대표 지시) — 외경/타공경 실치수로 그린다
function downlightInchOf(o){
  const n=Math.round((o&&o.inch)||DOWNLIGHT_INCH_DEFAULT);
  return DOWNLIGHT_INCH[n]?n:DOWNLIGHT_INCH_DEFAULT;
}
function downlightDef(o){
  const base=LIGHT_LIB.downlight;
  const inch=downlightInchOf(o);
  const d=DOWNLIGHT_INCH[inch];
  return {...base,
    size:d.outer,
    name:base.name+' '+inch+'"',
    nameEn:inch+'-inch recessed downlight',
    inch,boreDia_mm:d.bore,
    shape:[
      {type:'circle',cx:0,cy:0,r:d.outer/2,fill:'#D4B872',stroke:'#A88248',sw:5},
      {type:'circle',cx:0,cy:0,r:d.bore/2,fill:'#F5E5B8',stroke:'#D4B872',sw:2},
    ]};
}
// ===== 2026-08-29: 간접·라인조명 점등 표현 + 길이 주기 (대표 지시) =====
//  대표 질문 — "간접이 그렇게 불이 들어오는지 생각해봐라."
//  맞다. 종전엔 기구 길이를 반지름으로 삼아 동그란 빛을 그렸다(반지름 = 길이×1.35).
//  3m 코브면 지름 8m짜리 원이 뜬다. 간접조명은 점광원이 아니라 선광원이고,
//  코브에서 천장·벽을 타고 '기구를 따라 띠 모양으로' 은은하게 퍼진다.
//  그래서 길이 방향으로 길고 폭은 좁은 띠 + 낮은 밝기(간접은 직부보다 은은)로 바꾼다.
// 평면도에서 이게 간접인지 라인인지 읽히게 — 도면 위 주기 (길이 m 포함)
const LINEAR_LIGHT_TAG={cove:'간접',line_t5:'T5 라인',magnet_track:'마그넷',
                        fluorescent:'형광',pendant_linear:'펜던트'};
function linearLightTagText(o,def){
  const nm=LINEAR_LIGHT_TAG[o.type]||(def&&def.name)||o.type;
  const L=(def&&def.size)||linearLightLen(o);
  return nm+' '+(L/1000).toFixed(1)+'m';
}
// 기구를 따라 붙는 주기 — 회전해도 글씨는 눕지 않게 수평으로, 기구 옆으로 비켜서
function addLinearLightTag(group,xPx,yPx,def,o){
  if(STATE.zoom<0.3) return;
  if(o&&o.showLabel===false) return; // 개별 끄기는 존중
  const ang=((o&&o.angle)||0)*Math.PI/180;
  const off=mmToPx((def.crossH||80)/2)+15;
  const px=xPx-Math.sin(ang)*off, py=yPx+Math.cos(ang)*off;
  const t=new Konva.Text({
    x:px-80,y:py-7,width:160,align:'center',
    text:linearLightTagText(o,def),
    fontSize:11.5,fontFamily:'Inter',fontStyle:'700',
    fill:'#FFE9A8',stroke:'#0A0A0A',strokeWidth:2.8,
    fillAfterStrokeEnabled:true,lineJoin:'round',listening:!!o,
  });
  if(o){
    t.on('click tap',_symbolLabelClick('lights',o.id));
    t.on('mouseenter',()=>{document.body.style.cursor='pointer';});
    t.on('mouseleave',()=>{document.body.style.cursor='';});
  }
  group.add(t);
}

// ===== 2026-08-29: 조명 중복 경고 (대표 지시 — "다운라이트가 중복되면 빨간색으로") =====
//  같은 종류를 같은 자리에 두 번 놓으면(더블클릭·복제 실수) 도면상 구분이 안 된다.
//  기구가 물리적으로 겹치는 것만 잡는다 — 간격이 촘촘한 배치를 중복으로 몰지 않기 위해.
function lightOuterMm(o){
  if(!o) return 200;
  if(o.type==='downlight'){const d=downlightDef(o);return d.size||200;}
  const b=LIGHT_LIB[o.type];
  return (b&&b.size)||200;
}
const DUP_LIGHT_SCAN_MM=600; // 정렬 스캔 폭 — 이보다 멀면 겹칠 수 없다
let _dupLightCache=null,_dupLightSig=null;
function duplicateLightGroups(){
  let sig;
  try{sig=JSON.stringify((STATE.lights||[]).map(o=>[o.id,o.type,o.x,o.y,o.inch||0]));}catch(_){sig=null;}
  if(sig!==null&&_dupLightCache&&_dupLightSig===sig) return _dupLightCache;
  const arr=(STATE.lights||[]).filter(o=>!isLinearLight(o.type)).slice().sort((p,q)=>p.x-q.x);
  const adj=new Map();
  const link=(a,b)=>{if(!adj.has(a))adj.set(a,new Set());adj.get(a).add(b);};
  for(let i=0;i<arr.length;i++){
    for(let j=i+1;j<arr.length;j++){
      const a=arr[i],b=arr[j];
      if(b.x-a.x>DUP_LIGHT_SCAN_MM) break;
      if(a.type!==b.type) continue; // 종류가 다르면 의도적으로 겹쳐 쓰는 설계일 수 있다
      const lim=Math.max(80,(lightOuterMm(a)+lightOuterMm(b))/2*0.9);
      const dx=a.x-b.x,dy=a.y-b.y;
      if(dx*dx+dy*dy<lim*lim){link(a.id,b.id);link(b.id,a.id);}
    }
  }
  const ids=new Set(adj.keys());
  // 무리별 대표 1개에만 ⚠ 글씨 (겹친 것마다 글씨를 쓰면 오히려 안 읽힌다)
  const seen=new Set(), rep=new Map(), members=new Map();
  ids.forEach(id=>{
    if(seen.has(id)) return;
    const stack=[id], mem=[];
    seen.add(id);
    while(stack.length){
      const cur=stack.pop();mem.push(cur);
      (adj.get(cur)||[]).forEach(n=>{if(!seen.has(n)){seen.add(n);stack.push(n);}});
    }
    rep.set(mem[0],mem.length);
    mem.forEach(m=>members.set(m,mem));
  });
  _dupLightCache={ids,rep,members};_dupLightSig=sig;
  return _dupLightCache;
}
function invalidateDuplicateLights(){_dupLightCache=null;_dupLightSig=null;}
// 이 조명과 같은 자리에 겹친 조명들 (자기 자신 포함)
function duplicateLightPeers(id){
  const d=duplicateLightGroups();
  return (d.members.get(id)||[]).slice();
}

// ===== 2026-08-30: 조명 종류별 '켜졌을 때' 표현 (대표 지시 — 라인과 간접이 똑같아 구분이 안 된다) =====
//  기구가 다르면 빛의 성질이 다르다. 도면에서도 그게 보여야 한다.
//   · 간접(코브) : 천장·벽에 부딪혀 되돌아오는 빛. 넓게 퍼지고 가장자리가 거의 없다. 어둡다.
//   · 라인 T5    : 직부 선광원. 기구 바로 아래를 좁고 또렷하게 비춘다. 밝다.
//   · 형광등     : 확산 커버가 있는 면광원. 중간 폭으로 고르게.
//   · 리니어 펜던트 : 아래로 내려 달아 식탁 등을 집중해서 비춘다. 좁고 진하게.
//   · 마그넷 트랙 : 레일에 스팟이 여러 개. 띠가 아니라 '점이 줄지어' 켜진다.
//  spread=편측 퍼짐(mm) · peak=한가운데 밝기 · soft=가장자리 흐림(0 또렷 ~ 1 아주 부드럽게)
// 2026-08-30 대표 지시: 선형 조명은 수치를 300/30 으로 고정한다.
//  spread 는 **편측** 값 — 기구를 가운데 두고 위로 300mm, 아래로 300mm (합 600mm).
//  가장자리 흐림(soft)만 종류별로 남긴다 — 간접은 경계가 물러지고 T5는 선명하다.
const LINEAR_GLOW_SPREAD_FIXED=300, LINEAR_GLOW_PEAK_FIXED=0.30;
const LINEAR_GLOW={
  cove:          {spread:LINEAR_GLOW_SPREAD_FIXED, peak:LINEAR_GLOW_PEAK_FIXED, soft:0.90},
  fluorescent:   {spread:LINEAR_GLOW_SPREAD_FIXED, peak:LINEAR_GLOW_PEAK_FIXED, soft:0.55},
  line_t5:       {spread:LINEAR_GLOW_SPREAD_FIXED, peak:LINEAR_GLOW_PEAK_FIXED, soft:0.28},
  pendant_linear:{spread:LINEAR_GLOW_SPREAD_FIXED, peak:LINEAR_GLOW_PEAK_FIXED, soft:0.35},
  magnet_track:  {spots:true, spread:LINEAR_GLOW_SPREAD_FIXED, peak:LINEAR_GLOW_PEAK_FIXED},
};
const LINEAR_GLOW_DEFAULT={spread:LINEAR_GLOW_SPREAD_FIXED, peak:LINEAR_GLOW_PEAK_FIXED, soft:0.5};
function linearGlowOf(type){return LINEAR_GLOW[type]||LINEAR_GLOW_DEFAULT;}
// 점광원의 빛 반경(mm) — 기구 크기가 아니라 '바닥을 얼마나 밝히나'로 잡는다.
//  종전엔 기구 외경×1.35 라, 95mm 다운라이트는 빛이 거의 안 보이고
//  350mm 방습등은 이유 없이 더 넓었다. 배광각이 다른 것이지 하우징 크기 문제가 아니다.
const POINT_GLOW={
  ceiling:{r:1700,peak:0.50}, bath_light:{r:1300,peak:0.50},
  sensor_light:{r:1500,peak:0.44}, kitchen_flat:{r:1200,peak:0.52},
  edge_flat_600:{r:1400,peak:0.50},
  spot_cyl:{r:620,peak:0.64}, spot_bar_3:{r:950,peak:0.58},
  pendant:{r:900,peak:0.52}, pendant_cluster:{r:1200,peak:0.52}, chandelier:{r:1800,peak:0.50},
  wall_lamp:{r:700,peak:0.42}, step_light:{r:420,peak:0.36},
  floor_lamp:{r:900,peak:0.44}, table_lamp:{r:700,peak:0.44},
};
const POINT_GLOW_DEFAULT={r:1000,peak:0.50};
function pointGlowOf(o){
  if(!o) return POINT_GLOW_DEFAULT;
  // 다운라이트는 인치가 커질수록 배광이 넓어진다 (2"≈1.4m / 6"≈4.2m 지름)
  if(o.type==='downlight') return {r:350*downlightInchOf(o), peak:0.56};
  // 방습등도 인치에 비례 — 확산형이라 같은 인치에서 다운라이트보다 넓게 퍼진다
  if(o.type==='bath_light') return {r:400*bathLightInchOf(o), peak:0.50};
  return POINT_GLOW[o.type]||POINT_GLOW_DEFAULT;
}
const GLOW_RGB='255,233,168';
function _ga(a){return 'rgba('+GLOW_RGB+','+Math.max(0,Math.min(1,a)).toFixed(3)+')';}
// 선광원 띠 — soft 가 클수록 일찍부터 서서히 밝아진다(가장자리가 흐리다)
function linearGlowStops(peak,soft){
  const inner=0.5-(0.06+soft*0.34);
  return [0,_ga(0),
          inner,_ga(peak*0.45),
          0.5,_ga(peak),
          1-inner,_ga(peak*0.45),
          1,_ga(0)];
}

// ===== 2026-08-30: 회로 충돌 경고 (대표 지시 — 다른 구끼리 점핑되면 표시) =====
//  점핑으로 이어진 조명들은 전기적으로 한 회로다. 그런데 그 무리에 급전하는
//  (스위치, 구)가 둘 이상이면 서로 다른 회로를 한 가닥으로 묶은 셈이 된다.
//   · 같은 스위치의 1구와 2구를 점핑 → 구별 스위칭이 무의미해진다 (1구만 켜도 2구가 켜짐)
//   · 다른 스위치끼리 점핑 → 두 회로가 단락된다
//  둘 다 도면대로 시공하면 안 되는 배선이라 눈에 띄게 표시한다.
//  ※ 무리 중 하나만 스위치에 물린 것은 정상이다 — 스위치→첫 기구, 나머지는 점핑.
function lightFeedKeys(lightId){
  const out=[];
  (STATE.electric||[]).forEach(e=>{
    if(!isSwitchType(e.type)||!Array.isArray(e.lightIds)) return;
    if(e.lightIds.indexOf(lightId)<0) return;
    out.push(e.id+'#'+lightGangOf(e,lightId));
  });
  return out;
}
let _jumpConflictCache=null,_jumpConflictSig=null;
function invalidateJumpConflicts(){_jumpConflictCache=null;_jumpConflictSig=null;}
function jumpConflictGroups(){
  let sig;
  try{
    sig=JSON.stringify((STATE.lights||[]).map(l=>[l.id,(l.jumpIds||[]).join('.')]))
       +'§'+JSON.stringify((STATE.electric||[]).map(e=>[e.id,(e.lightIds||[]).join('.'),
            e.lightGang?Object.keys(e.lightGang).sort().map(k=>k+':'+e.lightGang[k]).join(','):'']));
  }catch(_){sig=null;}
  if(sig!==null&&_jumpConflictCache&&_jumpConflictSig===sig) return _jumpConflictCache;
  const seen=new Set(), groups=[], ids=new Set();
  (STATE.lights||[]).forEach(l=>{
    if(seen.has(l.id)) return;
    // 점핑으로 이어진 무리 하나
    const stack=[l.id], mem=[];
    seen.add(l.id);
    while(stack.length){
      const cur=stack.pop();mem.push(cur);
      jumpNeighbors(cur).forEach(n=>{if(!seen.has(n)){seen.add(n);stack.push(n);}});
    }
    if(mem.length<2) return; // 점핑이 없으면 볼 것도 없다
    const feeds=new Set();
    mem.forEach(id=>lightFeedKeys(id).forEach(k=>feeds.add(k)));
    if(feeds.size<2) return;
    mem.forEach(id=>ids.add(id));
    groups.push({members:mem,feeds:[...feeds]});
  });
  _jumpConflictCache={ids,groups};_jumpConflictSig=sig;
  return _jumpConflictCache;
}
// 이 조명이 낀 충돌 무리 (없으면 null)
function jumpConflictOf(lightId){
  const c=jumpConflictGroups();
  if(!c.ids.has(lightId)) return null;
  return c.groups.find(g=>g.members.indexOf(lightId)>=0)||null;
}
// 충돌 내용을 사람이 읽는 문장으로 — '몇 구와 몇 구가 묶였다'
function jumpConflictText(g){
  if(!g) return '';
  const bySw={};
  g.feeds.forEach(k=>{
    const i=k.lastIndexOf('#');
    const sid=k.slice(0,i), gi=parseInt(k.slice(i+1),10)||0;
    (bySw[sid]=bySw[sid]||[]).push(gi+1);
  });
  const parts=Object.keys(bySw).map(sid=>{
    const sw=(STATE.electric||[]).find(e=>e.id===sid);
    const nm=(sw&&ELECTRIC_LIB[sw.type]&&ELECTRIC_LIB[sw.type].name)||'스위치';
    const gs=[...new Set(bySw[sid])].sort((a,b)=>a-b);
    return nm+' '+gs.join('·')+'구';
  });
  return parts.join(' + ');
}

// ===== 2026-08-30: 조명별 빛 표현 설정 (대표 지시) =====
//  종류별 기본값(LINEAR_GLOW / POINT_GLOW) 위에 조명 하나하나의 설정을 얹는다.
//  기본값은 그 종류의 배광을 따르고, 현장에서 다르면 그 조명만 고쳐 쓴다.
//  o.glow = {spread|r, peak, soft} — 없는 값은 종류 기본값 그대로.
const GLOW_LIMITS={spread:[100,4000], r:[100,6000], peak:[0.05,1], soft:[0,1]};
function _glowClamp(k,v,dflt){
  const n=parseFloat(v);
  if(!isFinite(n)) return dflt;
  const L=GLOW_LIMITS[k];
  return L?Math.max(L[0],Math.min(L[1],n)):n;
}
function resolveGlow(o){
  const lin=(typeof isLinearLight==='function')&&isLinearLight(o&&o.type);
  const base=lin?linearGlowOf(o&&o.type):pointGlowOf(o);
  const g=(o&&o.glow)||{};
  if(lin) return {spread:_glowClamp('spread',g.spread,base.spread),
                  peak:_glowClamp('peak',g.peak,base.peak),
                  soft:_glowClamp('soft',g.soft,base.soft),
                  spots:base.spots};
  return {r:_glowClamp('r',g.r,base.r), peak:_glowClamp('peak',g.peak,base.peak)};
}
// 이 조명이 기본값에서 벗어나 있나 (패널에서 '기본값' 버튼을 살릴지 판단)
function hasCustomGlow(o){
  const g=o&&o.glow;
  if(!g) return false;
  return ['spread','r','peak','soft'].some(k=>g[k]!==undefined&&g[k]!==null);
}

// ===== 2026-08-30: 조명 배열 배치 (대표 지시 — 밭 전(田)자처럼 여러 개를 간격 맞춰) =====
//  다운라이트는 한 개만 놓는 일이 드물다. 가로·세로 개수와 간격을 미리 정해 두고
//  도면에서 중심점 하나만 찍으면 그 모양대로 한 번에 놓는다. 간격은 50mm 단위.
const LIGHT_ARRAY_STEP=50;
const LIGHT_ARRAY_MIN=150, LIGHT_ARRAY_MAX=6000;
const LIGHT_ARRAY_MAX_N=6;
// 현장에서 자주 쓰는 모양 — '밭 전'은 2×2
const LIGHT_ARRAY_PRESETS=[
  {key:'1x1',name:'하나',      cols:1,rows:1},
  {key:'1x2',name:'일자 2',    cols:2,rows:1},
  {key:'1x3',name:'일자 3',    cols:3,rows:1},
  {key:'2x2',name:'밭 전(田)', cols:2,rows:2},
  {key:'2x3',name:'2×3',       cols:3,rows:2},
  {key:'3x3',name:'3×3',       cols:3,rows:3},
];
function lightArrayCfg(){
  if(!STATE.lightArray||typeof STATE.lightArray!=='object') STATE.lightArray={};
  const a=STATE.lightArray;
  const clampN=v=>Math.max(1,Math.min(LIGHT_ARRAY_MAX_N,Math.round(v||0)||1));
  a.cols=clampN(a.cols);
  a.rows=clampN(a.rows);
  a.dx=snapArrayGap(a.dx);
  a.dy=snapArrayGap(a.dy);
  return a;
}
function snapArrayGap(v){
  const n=parseFloat(v);
  if(!isFinite(n)) return 900;
  const r=Math.round(n/LIGHT_ARRAY_STEP)*LIGHT_ARRAY_STEP;
  return Math.max(LIGHT_ARRAY_MIN,Math.min(LIGHT_ARRAY_MAX,r));
}
function lightArrayActive(){
  const a=lightArrayCfg();
  return (a.cols*a.rows)>1;
}
// 중심점(mm) 기준 배치 좌표들 — 가운데를 찍으면 그 둘레로 고르게 퍼진다
function lightArrayOffsets(cfg){
  const a=cfg||lightArrayCfg();
  const out=[];
  const w=(a.cols-1)*a.dx, h=(a.rows-1)*a.dy;
  for(let r=0;r<a.rows;r++){
    for(let c=0;c<a.cols;c++){
      out.push({dx:Math.round(-w/2+c*a.dx), dy:Math.round(-h/2+r*a.dy)});
    }
  }
  return out;
}
// 배치 전체가 차지하는 크기 (mm)
function lightArraySpanMm(cfg){
  const a=cfg||lightArrayCfg();
  return {w:(a.cols-1)*a.dx, h:(a.rows-1)*a.dy};
}

function renderLights(){
  groups.lights.destroyChildren();
  const _litSet=litLightIds(); // 2026-08-26: 회로 점등 집합 (2026-08-27: 점핑 연쇄 포함)
  const _dup=_pm()?{ids:new Set(),rep:new Map()}:duplicateLightGroups(); // 2026-08-29: 겹친 조명 — 경고는 화면에만
  const _cfl=_pm()?{ids:new Set(),groups:[]}:jumpConflictGroups(); // 2026-08-30: 다른 구끼리 점핑
  // 2026-08-27: 조명↔조명 점핑선 (중복 방지 위해 id 사전순 한 번만)
  const _jvis=jumpVisibleSet();
  const _drawn=new Set();
  (STATE.lights||[]).forEach(l=>{
    jumpNeighbors(l.id).forEach(nid=>{
      const key=l.id<nid?l.id+'|'+nid:nid+'|'+l.id;
      if(_drawn.has(key)) return;
      if(!(_jvis.has(l.id)||_jvis.has(nid))) return;
      _drawn.add(key);
      const t=lightById(nid); if(!t) return;
      let x1=STATE.offsetX+mmToPx(l.x),y1=STATE.offsetY+mmToPx(l.y);
      let x2=STATE.offsetX+mmToPx(t.x),y2=STATE.offsetY+mmToPx(t.y);
      // 2026-08-30: 기구 밖에서 시작하고 끝난다 — 선이 심볼을 관통하면 지저분해 보인다
      (function(){
        const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
        if(len<1) return;
        const r1=mmToPx(lightOuterMm(l))/2+2, r2=mmToPx(lightOuterMm(t))/2+2;
        if(r1+r2>=len-4) return; // 너무 가까우면 그대로
        const ux=dx/len, uy=dy/len;
        x1+=ux*r1; y1+=uy*r1; x2-=ux*r2; y2-=uy*r2;
      })();
      const on=_litSet.has(l.id)&&_litSet.has(nid);
      // 2026-08-29: 배선은 가는 점선 (대표 지시). 문제였던 건 선의 끈기가 아니라
      //  선 위에 박힌 둥근 마커들이었다 — 그건 없았고, 굵기만 얼파 두께 기구를 덮지 않게 한다.
      // 2026-08-30: 서로 다른 회로를 묶어버린 선은 빨간색으로 — 이대로 시공하면 안 된다
      const _bad=_cfl.ids.has(l.id)&&_cfl.ids.has(nid);
      groups.lights.add(new Konva.Line({points:[x1,y1,x2,y2],
        stroke:_bad?'#FF3B30':(on?'#D4B872':'#7BA05B'),
        strokeWidth:_bad?CIRCUIT_LINE_W*1.8:CIRCUIT_LINE_W,
        dash:CIRCUIT_LINE_DASH,opacity:0.95,listening:false,
        name:_bad?'jump-line jump-conflict':'jump-line'}));
    });
  });
  STATE.lights.forEach(o=>{
    const def=symbolDefOf('lights',o); // 2026-08-30: 정의 조회를 한 곳으로 (인치·방습등 규격·길이 가변)
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind==='lights'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='lights'&&b.id===o.id);
    const _boost=symbolBoostFactor('lights',def); // v6.1: 점형 기호 비축척 보정
    const g=new Konva.Group({x,y,rotation:o.angle||0,scaleX:_boost,scaleY:_boost,id:o.id});
    addSymbolPickArea(g,def,_boost); // 2026-08-26: 픽 어퍼처
    // 2026-08-26: 회로 점등 — 연결된 스위치가 ON이면 빛 퍼짐(글로우) 표시
    if(_litSet.has(o.id)){
      // 2026-08-30: 종류별로 다르게 켜진다 — 간접과 라인이 같아 보이던 문제
      const gp=isLinearLight(o.type)?resolveGlow(o):null;
      if(gp&&gp.spots){
        // 마그넷 트랙 — 레일에 스팟이 줄지어 달린다. 띄가 아니라 점이 여러 개.
        const L=def.size||1500, Lpx=mmToPx(L);
        const nMod=Math.max(2,Math.round(L/450));
        const seg=Lpx/nMod, gr=mmToPx(gp.spread);
        for(let i=0;i<nMod;i+=2){
          const cx=-Lpx/2+(i+0.5)*seg;
          g.add(new Konva.Circle({x:cx,radius:gr,listening:false,
            fillRadialGradientStartPoint:{x:0,y:0},fillRadialGradientEndPoint:{x:0,y:0},
            fillRadialGradientStartRadius:0,fillRadialGradientEndRadius:gr,
            fillRadialGradientColorStops:[0,_ga(gp.peak),0.5,_ga(gp.peak*0.34),1,_ga(0)]}));
        }
      }else if(gp){
        const Lpx=mmToPx(def.size||1200);
        const sp=mmToPx(gp.spread);   // 편측 퍼짐
        // 기구를 가운데 두고 위아래로 같은 폭 — 한쪽으로 치우치지 않는다
        const gw=Lpx+sp*0.5, gh=sp*2;
        g.add(new Konva.Rect({x:-gw/2,y:-gh/2,width:gw,height:gh,cornerRadius:sp*0.5,listening:false,
          fillLinearGradientStartPoint:{x:0,y:-gh/2},fillLinearGradientEndPoint:{x:0,y:gh/2},
          fillLinearGradientColorStops:linearGlowStops(gp.peak,gp.soft)}));
      }else{
        const pg=resolveGlow(o);
        const gr=Math.max(mmToPx(def.size||200)/2+10, mmToPx(pg.r));
        g.add(new Konva.Circle({radius:gr,listening:false,
          fillRadialGradientStartPoint:{x:0,y:0},fillRadialGradientEndPoint:{x:0,y:0},
          fillRadialGradientStartRadius:0,fillRadialGradientEndRadius:gr,
          fillRadialGradientColorStops:[0,_ga(pg.peak),0.55,_ga(pg.peak*0.36),1,_ga(0)]}));
      }
    }
    if(def.shape){
      drawShape(def.shape).forEach(n=>g.add(n));
      if(sel&&isLinearLight(o.type)){
        // 2026-08-25: 라인·간접조명 — 길이 방향 점선 박스 + 양 끝 길이 조절 핸들
        const Lpx=mmToPx(def.size), Hpx=mmToPx(def.crossH||80);
        g.add(new Konva.Rect({x:-Lpx/2-6,y:-Hpx/2-6,width:Lpx+12,height:Hpx+12,
          stroke:'#E2725B',strokeWidth:2,dash:[6,4],fillEnabled:false,listening:false}));
        [-1,1].forEach(sign=>{
          const hd=new Konva.Circle({x:sign*Lpx/2,y:0,radius:7,fill:'#E2725B',stroke:'#fff',strokeWidth:1.5,
            draggable:true,hitStrokeWidth:24});
          hd.on('mousedown touchstart',e=>{e.cancelBubble=true;});
          hd.on('mouseenter',()=>{document.body.style.cursor='ew-resize';});
          hd.on('mouseleave',()=>{document.body.style.cursor='';});
          hd.on('dragmove',()=>{
            hd.y(0);
            const newLen=Math.max(LINEAR_LIGHT_MIN,Math.min(LINEAR_LIGHT_MAX,
              Math.round(pxToMm(Math.abs(hd.x()))*2/10)*10));
            // 드래그 중에는 재렌더 없이 미리보기만 (노드 파괴 방지)
            drawGroup.destroyChildren();
            const a=g.getAbsoluteTransform().point({x:-sign*mmToPx(newLen)/2,y:0});
            const b=g.getAbsoluteTransform().point({x:sign*mmToPx(newLen)/2,y:0});
            drawGroup.add(new Konva.Line({points:[a.x,a.y,b.x,b.y],stroke:'#E2725B',strokeWidth:2,dash:[8,5],listening:false}));
            drawGroup.add(new Konva.Text({x:(a.x+b.x)/2-45,y:(a.y+b.y)/2-24,width:90,align:'center',
              text:newLen+'mm',fontSize:12,fontFamily:'JetBrains Mono',fontStyle:'700',
              fill:'#FFFFFF',stroke:'#000000',strokeWidth:3,fillAfterStrokeEnabled:true,listening:false}));
            previewLayer.batchDraw();
          });
          hd.on('dragend',()=>{
            const newLen=Math.max(LINEAR_LIGHT_MIN,Math.min(LINEAR_LIGHT_MAX,
              Math.round(pxToMm(Math.abs(hd.x()))*2/10)*10));
            drawGroup.destroyChildren();previewLayer.batchDraw();
            o.length_mm=newLen;
            saveHistory();renderAll();refreshUI();
            if(typeof cmdToast==='function') cmdToast('조명 길이 '+newLen+'mm');
          });
          g.add(hd);
        });
      }else if(sel){
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
    g.on('click tap',e=>{
      if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;
      e.cancelBubble=true;
      // 2026-08-26: 조명 연결 모드 — 클릭한 조명을 스위치 회로에 연결/해제
      if(window._circuitLink&&typeof toggleCircuitLink==='function'){toggleCircuitLink(window._circuitLink.switchId,o.id);return;}
      // 2026-08-27: 조명↔조명 점핑 연결 모드
      if(window._jumpLink&&typeof toggleJumpLink==='function'){toggleJumpLink(window._jumpLink.lightId,o.id);return;}
      if(STATE.selectedTool==='select') selectObj('lights',o.id);
    });
    // 2026-08-29: 같은 자리에 겹친 조명 — 빨간 점선 링으로 경고
    if(_dup.ids.has(o.id)){
      const rr=mmToPx(def.size||200)/2+7;
      g.add(new Konva.Circle({radius:rr,stroke:'#FF3B30',strokeWidth:2.6,dash:[5,4],listening:false,
        shadowColor:'#FF3B30',shadowBlur:9,shadowOpacity:0.75}));
      g.add(new Konva.Line({points:[-rr*0.62,-rr*0.62,rr*0.62,rr*0.62],stroke:'#FF3B30',
        strokeWidth:2.2,listening:false}));
    }
    if(symbolLabelEligible('lights',def)) addSymbolLabel(groups.lights,x,y,def,'lights',o.id,o); // 2026-08-24: 소형 조명 라벨 (클릭 = 선택/회로 연결)
    // 2026-08-29: 라인·간접은 평면에서 구분이 안 된다 — 종류와 길이(m)를 도면에 적는다
    if(isLinearLight(o.type)) addLinearLightTag(groups.lights,x,y,def,o);
    if(o.locked) g.opacity(0.30);
    groups.lights.add(g);
    // 2026-08-30: 회로 충돌 — 무리당 한 번, 무엇과 무엇이 묶였는지까지 적는다
    if(_cfl.ids.has(o.id)&&STATE.zoom>=0.3){
      const grp=_cfl.groups.find(gg=>gg.members[0]===o.id);
      if(grp){
        const rr=mmToPx(def.size||200)/2+9;
        groups.lights.add(new Konva.Text({x:x-130,y:y+rr+16,width:260,align:'center',
          text:'⚠ 다른 회로 연결 — '+jumpConflictText(grp),
          fontSize:11,fontFamily:'Inter',fontStyle:'700',
          fill:'#FF6B60',stroke:'#0A0A0A',strokeWidth:2.8,fillAfterStrokeEnabled:true,
          lineJoin:'round',listening:false}));
      }
    }
    // 겹친 무리당 글씨는 한 번만 (겹친 것마다 쓰면 오히려 안 읽힐다)
    if(_dup.rep.has(o.id)&&STATE.zoom>=0.3){
      const n=_dup.rep.get(o.id);
      const rr=mmToPx(def.size||200)/2+9;
      groups.lights.add(new Konva.Text({x:x-90,y:y-rr-19,width:180,align:'center',
        text:'⚠ 중복 '+n+'개',fontSize:11.5,fontFamily:'Inter',fontStyle:'700',
        fill:'#FF6B60',stroke:'#0A0A0A',strokeWidth:2.8,fillAfterStrokeEnabled:true,
        lineJoin:'round',listening:false}));
    }
  });
}
function renderElectric(){
  groups.electric.destroyChildren();
  STATE.electric.forEach(o=>{
    const def=ELECTRIC_LIB[o.type];
    if(!def) return;
    const x=STATE.offsetX+mmToPx(o.x),y=STATE.offsetY+mmToPx(o.y);
    const sel=STATE.selectedKind==='electric'&&STATE.selectedId===o.id||STATE.boxSelection.some(b=>b.kind==='electric'&&b.id===o.id);
    const _boost=symbolBoostFactor('electric',def); // v6.1: 비축척 확대 — 기본 OFF ('sym' 명령으로만)
    const g=new Konva.Group({x,y,rotation:o.angle||0,scaleX:_boost,scaleY:_boost,id:o.id});
    addSymbolPickArea(g,def,_boost); // 2026-08-26: 픽 어퍼처 — 작은 기호도 쉽게 선택
    addSymbolLabel(groups.electric,x,y,def,'electric',o.id,o); // 2026-08-24: 이름 라벨 (클릭 = 선택)
    // 2026-08-26: 스위치 회로 — ON 배지 + (선택/연결 모드 시) 조명 연결 곡선
    if(isSwitchType(o.type)){
      // 2026-08-30: 구별 점등 — 켜진 구가 하나라도 있으면 배지, 여러 구면 숫자로
      const _gOn=switchGangOn(o).filter((v,i)=>v&&gangLightIds(o,i).length>0).length;
      if(_gOn>0){
        const _bx=mmToPx((def.size||200))/2*0.9, _by=-mmToPx((def.size||200))/2*0.9;
        const _br=6/Math.max(_boost,0.001);
        g.add(new Konva.Circle({x:_bx,y:_by,radius:_br,
          fill:'#7BA05B',stroke:'#3B4032',strokeWidth:1.5,listening:false}));
        if(switchGangCount(o.type)>1){
          g.add(new Konva.Text({x:_bx-_br,y:_by-_br*0.78,width:_br*2,align:'center',
            text:String(_gOn),fontSize:_br*1.25,fontFamily:'Inter',fontStyle:'700',
            fill:'#0A0A0A',listening:false}));
        }
      }
      const showCurves=(STATE.selectedKind==='electric'&&STATE.selectedId===o.id)
        ||(window._circuitLink&&window._circuitLink.switchId===o.id)||STATE.showCircuits;
      if(showCurves&&Array.isArray(o.lightIds)&&o.lightIds.length){
        // 2026-08-30: 점핑으로 이미 이어진 무리에는 급전선을 하나만 그린다 (대표 지시).
        //  종전엔 연결된 조명 수만큼 부챗살처럼 뻗어 서로 교차했다.
        //  실제 배선도 스위치→첫 기구 한 가닥이고, 나머지는 기구끼리 점핑한다.
        const _feed=[], _seen=new Set();
        o.lightIds.forEach(lid=>{
          if(_seen.has(lid)) return;
          const gi=lightGangOf(o,lid);
          const grp=[...expandJumpChain([lid])]
            .filter(id=>o.lightIds.indexOf(id)>=0&&lightGangOf(o,id)===gi);
          if(!grp.length){_seen.add(lid);_feed.push(lid);return;}
          grp.forEach(id=>_seen.add(id));
          let best=grp[0],bd=Infinity;
          grp.forEach(id=>{const lt=STATE.lights.find(l=>l.id===id);if(!lt)return;
            const dd=(lt.x-o.x)*(lt.x-o.x)+(lt.y-o.y)*(lt.y-o.y);if(dd<bd){bd=dd;best=id;}});
          _feed.push(best);
        });
        _feed.forEach(lid=>{
          const lt=STATE.lights.find(l=>l.id===lid);if(!lt)return;
          const x2=STATE.offsetX+mmToPx(lt.x),y2=STATE.offsetY+mmToPx(lt.y);
          const mx=(x+x2)/2,my=(y+y2)/2;
          const dx=x2-x,dy=y2-y,len=Math.hypot(dx,dy)||1;
          const cx=mx-dy/len*Math.min(60,len*0.25),cy=my+dx/len*Math.min(60,len*0.25);
          // 끝점 좌표를 노드에 실어 둔다 — 점을 없앱으니 선이 조명을 따라오는지 확인할 수단이 필요
          groups.electric.add(new Konva.Shape({listening:false,
            name:'circuit-curve',lightId:lid,endX:x2,endY:y2,
            sceneFunc:(ctx,shp)=>{
            ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(cx,cy,x2,y2);
            // 2026-08-29: 끝점 마커만 없애고 — 선은 점핑선과 같은 가는 점선
            // 2026-08-30: 이 조명이 매달린 구가 켜졌을 때만 금색
            ctx.setLineDash(CIRCUIT_LINE_DASH);
            ctx.strokeStyle=(switchGangOn(o)[lightGangOf(o,lid)])?'#D4B872':'#7BA05B';
            ctx.lineWidth=CIRCUIT_LINE_W;ctx.stroke();
          }}));
        });
      }
      // 더블클릭/더블탭 = 점등 토글 (연결된 조명이 켜진 것처럼 표시)
      g.on('dblclick dbltap',e=>{
        e.cancelBubble=true;
        if(!Array.isArray(o.lightIds)||!o.lightIds.length){if(typeof cmdToast==='function')cmdToast('연결된 조명 없음 — 스위치 선택 후 [조명 연결]');return;}
        // 2026-08-30: 더블클릭은 전체 구를 한 번에 — 구별 토글은 속성 패널에서
        const _anyOn=switchGangOn(o).some(v=>v);
        setAllSwitchGangs(o.id,!_anyOn);
        saveHistory();renderAll();refreshUI();
        if(typeof cmdToast==='function')cmdToast('💡 회로 전체 '+(!_anyOn?'ON — 조명 '+o.lightIds.length+'개 점등':'OFF'));
      });
    }
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
    g.on('click tap',e=>{
      if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;
      e.cancelBubble=true;
      // 2026-08-29: 조명을 먼저 고른 상태라면, 이 스위치에 한 번에 붙인다
      if(window._circuitAttach&&typeof attachLightsToSwitch==='function'){
        attachLightsToSwitch(o.id,window._circuitAttach.lightIds);return;
      }
      if(STATE.selectedTool==='select') selectObj('electric',o.id);
    });
    if(o.locked) g.opacity(0.30);
    groups.electric.add(g);
  });
}
function renderTexts(){
  groups.text.destroyChildren();
  STATE.texts.forEach(t=>{
    const x=STATE.offsetX+mmToPx(t.x),y=STATE.offsetY+mmToPx(t.y);
    const sel=STATE.selectedKind==='texts'&&STATE.selectedId===t.id||STATE.boxSelection.some(b=>b.kind==='texts'&&b.id===t.id);
    const txt=new Konva.Text({x,y,text:t.text,fontSize:t.fontSize||14,fontFamily:'Inter',fill:sel?'#E2725B':'#F5F1EB',id:t.id,opacity:t.locked?0.30:1});
    txt.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('texts',t.id);});
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

    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('measures',m.id);});
    groups.dimensions.add(g);
  });
}
// v5.9: 지시선 (LE)
function renderLeaders(){
  groups.leaders.destroyChildren();
  STATE.leaders.forEach(ld=>{
    if(!ld.points||ld.points.length<2) return;
    const sel=STATE.selectedKind==='leaders'&&STATE.selectedId===ld.id||STATE.boxSelection.some(b=>b.kind==='leaders'&&b.id===ld.id);
    const color=sel?'#E2725B':'#A8D8A8';
    const g=new Konva.Group({id:ld.id});

    const TX=xmm=>STATE.offsetX+mmToPx(xmm);
    const TY=ymm=>STATE.offsetY+mmToPx(ymm);

    // 선 세그먼트 (모든 점 연결)
    const flatPts=[];
    ld.points.forEach(p=>{flatPts.push(TX(p.x),TY(p.y));});
    g.add(new Konva.Line({points:flatPts,stroke:color,strokeWidth:1.2,hitStrokeWidth:12,lineCap:'round',lineJoin:'round'}));

    // 화살표 (점[0] 방향 — points[1]→points[0] 방향, 고정 px 크기)
    const p0=ld.points[0], p1=ld.points[1];
    const adx=p0.x-p1.x, ady=p0.y-p1.y;
    const alen=Math.hypot(adx,ady)||1;
    const ax=adx/alen, ay=ady/alen;
    const arrLen=14, arrW=7; // 고정 픽셀 (줌 독립)
    const tip={x:TX(p0.x),y:TY(p0.y)};
    const base={x:tip.x-ax*arrLen,y:tip.y-ay*arrLen};
    const lx=base.x+ay*arrW/2, ly=base.y-ax*arrW/2;
    const rx=base.x-ay*arrW/2, ry=base.y+ax*arrW/2;
    g.add(new Konva.Line({points:[tip.x,tip.y,lx,ly,rx,ry,tip.x,tip.y],closed:true,fill:color,stroke:color,strokeWidth:0.5}));

    // shelf (마지막 점에서 수평 연장)
    const last=ld.points[ld.points.length-1];
    const prev=ld.points[ld.points.length-2];
    const sdx=last.x-prev.x;
    const shelfDir=sdx>=0?1:-1;
    const shelfMm=300;
    const shelfEndX=last.x+shelfDir*shelfMm;
    g.add(new Konva.Line({points:[TX(last.x),TY(last.y),TX(shelfEndX),TY(last.y)],stroke:color,strokeWidth:1.2}));

    // 텍스트
    if(ld.text){
      const tx=new Konva.Text({
        x:TX(shelfEndX)+(shelfDir>0?4:-4),
        y:TY(last.y)-mmToPx(120),
        text:ld.text,
        fontSize:ld.fontSize||13,
        fontFamily:'Inter',
        fill:color,
      });
      if(shelfDir<0) tx.x(TX(shelfEndX)-tx.width()-4);
      g.add(tx);
    }

    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('leaders',ld.id);});
    groups.leaders.add(g);
  });
}
// v5.9: 무한 안내선 렌더 — 두 점이 정의하는 방향으로 화면 끝까지 가는 실선 연장
function renderXlines(){
  groups.xlines.destroyChildren();
  if(!STATE.xlines||STATE.xlines.length===0) return;
  const EXT=(stage.width()+stage.height())*4; // 화면을 충분히 덮는 길이 (px)
  STATE.xlines.forEach(xl=>{
    const sel=(STATE.selectedKind==='xlines'&&STATE.selectedId===xl.id)||STATE.boxSelection.some(b=>b.kind==='xlines'&&b.id===xl.id);
    const ax=STATE.offsetX+mmToPx(xl.x1), ay=STATE.offsetY+mmToPx(xl.y1);
    const bx=STATE.offsetX+mmToPx(xl.x2), by=STATE.offsetY+mmToPx(xl.y2);
    let dx=bx-ax, dy=by-ay; const len=Math.hypot(dx,dy)||1; dx/=len; dy/=len;
    const cx=(ax+bx)/2, cy=(ay+by)/2;
    const color=sel?'#E2725B':'#4FC3D9'; // 안내선 = 가는 청록 실선 / 선택 시 주황
    const g=new Konva.Group({id:xl.id});
    g.add(new Konva.Line({
      points:[cx-dx*EXT,cy-dy*EXT,cx+dx*EXT,cy+dy*EXT],
      stroke:color,strokeWidth:sel?1.1:0.7,opacity:sel?0.95:0.7,
      hitStrokeWidth:10,lineCap:'butt',
    }));
    // 기준점 2개 작은 마커 (선택 시만)
    if(sel){
      g.add(new Konva.Circle({x:ax,y:ay,radius:3,fill:'#E2725B',stroke:'#000',strokeWidth:0.5}));
      g.add(new Konva.Circle({x:bx,y:by,radius:3,fill:'#E2725B',stroke:'#000',strokeWidth:0.5}));
    }
    g.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('xlines',xl.id);});
    groups.xlines.add(g);
  });
}
// ═══ v5.9.3 PERF: 뷰 제스처 최적화 ═══════════════════════════
// 팬/줌 중 매 이벤트마다 전체 씬을 재구성(약 160ms/대형도면)하던 것을
// 레이어 변환(scale/position, 약 4ms)으로 대체 — 제스처 종료 시 1회만 재구성.
// 수학: 노드가 (offset0, zoom0) 기준으로 구성됐을 때 현재 (offset1, zoom1) 뷰는
//       k=zoom1/zoom0 스케일 + (offset1 - k·offset0) 평행이동과 시각적으로 동일.
let _viewBase=null;      // {offX,offY,zoom} — 마지막 재구성 시점의 뷰
let _viewRaf=false;
let _zoomSettleTimer=null;
function beginViewTransform(){
  if(!_viewBase) _viewBase={offX:STATE.offsetX,offY:STATE.offsetY,zoom:STATE.zoom};
}
function applyViewTransform(){
  if(!_viewBase) return;
  const k=STATE.zoom/_viewBase.zoom;
  const tx=STATE.offsetX-k*_viewBase.offX;
  const ty=STATE.offsetY-k*_viewBase.offY;
  [bgLayer,mainLayer,previewLayer].forEach(l=>{l.scale({x:k,y:k});l.position({x:tx,y:ty});});
  if(!_viewRaf){_viewRaf=true;requestAnimationFrame(()=>{_viewRaf=false;stage.batchDraw();});}
}
function endViewTransform(){
  if(!_viewBase) return;
  drawGrid();
  renderAll(); // renderAll이 변환을 리셋하고 새 좌표로 재구성
}
// 데이터 변형 드래그(객체 이동·회전) 중 재구성을 프레임당 1회로 병합
let _renderRaf=false;
function renderAllThrottled(){
  if(_renderRaf) return;
  _renderRaf=true;
  requestAnimationFrame(()=>{_renderRaf=false;renderAll();});
}

/* v5.9.4 PERF: 증분 렌더 — 카테고리별 (데이터+뷰+선택) 서명을 비교해
   변경된 카테고리만 재구성. 수백 공간 도면에서 클릭 액션당 비용을
   "전체 재구성"에서 "변경 카테고리 1개 재구성"으로 축소.
   서명에 누락된 의존성이 생기면 화면 갱신 누락 버그가 되므로,
   렌더러가 새 STATE 필드를 읽게 되면 반드시 아래 서명에도 추가할 것. */
const _rsig={};
function invalidateRenderCache(){for(const k in _rsig)delete _rsig[k];}
function _rif(cat,sig,fn){
  if(sig!==null&&_rsig[cat]===sig)return;
  fn();
  if(sig!==null)_rsig[cat]=sig;else delete _rsig[cat];
}
function renderAll(){
  /* 뷰 변환이 걸려 있으면 리셋 후 재구성 (이중 이동 방지) */
  if(_viewBase){
    _viewBase=null;
    [bgLayer,mainLayer,previewLayer].forEach(l=>{l.scale({x:1,y:1});l.position({x:0,y:0});});
  }
  /* 서명 계산 — 직렬화 실패 시 전 카테고리 무조건 렌더(기존 동작 폴백) */
  let J=null,sSpaces=null,gk=null;
  try{
    J=JSON.stringify;
    sSpaces=J(STATE.spaces);
    const theme=document.body?document.body.getAttribute('data-theme')||'':'';
    gk=[STATE.offsetX,STATE.offsetY,STATE.zoom,theme,STATE.plus2D?1:0,STATE.selectedTool,
        symbolLabelMode(),(STATE.printMode?'P':'')+(STATE.printLabels?'L':'')+(STATE.printColor?'C':'')
       ].join('|')+'§'; // 2026-08-28: 라벨 모드·인쇄 모드 — 토글 즉시 반영
  }catch(e){J=null;}
  const selK=k=>{
    if(!J)return '';
    const box=(STATE.boxSelection||[]);
    return (STATE.selectedKind===k?String(STATE.selectedId):'')+'·'+box.filter(b=>b.kind===k).map(b=>b.id).join(',')+'§';
  };
  const sig=(k,extra)=>{ if(!J)return null; try{return gk+selK(k)+extra;}catch(e){return null;} };
  // 2026-08-27: 레이어 간 상호 의존 서명 (대표 보고 — 스위치를 켜도 화면을 움직여야 조명이 켜졌다)
  //  · 조명 점등은 STATE.electric(스위치)에 달려 있으므로 lights 서명에 회로 상태를 포함
  //  · 회로 연결선은 조명 위치에 달려 있으므로 electric 서명에 조명 좌표를 포함
  let circuitSig='',lightPosSig='';
  try{
    if(J){
      // 2026-08-27: 점핑 연결·배선 전체보기도 조명 레이어에 영향 → 서명에 포함 (토글 즉시 반영)
      circuitSig='§'+J((STATE.electric||[]).map(switchLightingSig))
                +'§'+J((STATE.lights||[]).map(l=>[l.id,(l.jumpIds||[]).join('.')]))
                +(STATE.showCircuits?'C':'')+(window._jumpLink?'J':'');
      // 2026-08-30: 급전선을 '점핑 무리당 하나'로 그리면서 전기 레이어가 점핑 관계에도 의존한다.
      //  jumpIds 를 서명에 넣지 않으면 점핑을 끊어도 급전선이 그대로 남는다.
      lightPosSig='§'+J((STATE.lights||[]).map(l=>[l.id,l.x,l.y,(l.jumpIds||[]).join('.')]))
                 +(STATE.showCircuits?'C':'');
    }
  }catch(e){circuitSig='';lightPosSig='';}

  _rif('walls',   sig('wall',   (J?J(STATE.walls):'')+sSpaces),                                        ()=>renderWalls());
  _rif('spaces',  sig('space',  sSpaces+(J?J(STATE.rotateState||0):'')+(STATE.showDimensions?1:0)),    ()=>renderSpaces());
  _rif('openings',sig('opening',(J?J(STATE.openings):'')+sSpaces),                                     ()=>renderOpenings());
  _rif('fixtures',sig('fixtures',J?J(STATE.fixtures):''),  ()=>renderRect(STATE.fixtures,groups.fixtures,FIXTURE_LIB,'fixtures'));
  _rif('furniture',sig('furniture',J?J(STATE.furniture):''),()=>renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture'));
  _rif('hvac',    sig('hvac',   J?J(STATE.hvac):''),        ()=>renderRect(STATE.hvac,groups.hvac,HVAC_FIRE_LIB,'hvac'));
  _rif('lights',  sig('lights', (J?J(STATE.lights):'')+circuitSig),      ()=>renderLights());
  _rif('electric',sig('electric',(J?J(STATE.electric):'')+lightPosSig),   ()=>renderElectric());
  _rif('texts',   sig('texts',  J?J(STATE.texts):''),       ()=>renderTexts());
  _rif('measures',sig('measures',J?J(STATE.measures):''),   ()=>renderMeasures());
  _rif('circles', sig('circles',(J?J(STATE.circles):'')+sSpaces), ()=>renderCircles());
  _rif('arcs',    sig('arcs',   (J?J(STATE.arcs):'')+sSpaces),    ()=>renderArcs());
  _rif('curves',  sig('curves', (J?J(STATE.curves||[]):'')+sSpaces),()=>renderCurves());
  _rif('leaders', sig('leaders',J?J(STATE.leaders):''),     ()=>renderLeaders());
  _rif('xlines',  sig('xlines', J?J(STATE.xlines||[]):''),  ()=>renderXlines());
  _rif('pillars', sig('pillars',J?J(STATE.pillars||[]):''), ()=>renderPillars());
  // v5.9: 자동 면적 라벨 비활성화 — 공간 공유 변 사이 부분영역마다 라벨이 생겨 도면이 어지러움
  renderSpaceHandles(); // 선택 의존·저비용 — 항상 실행
  renderGhostHints();   // 저비용 — 항상 실행
  renderPrintFrame();   // 2026-08-28: 인쇄 영역 틀 (팜·줌을 따라온다)
  Object.entries(STATE.layers).forEach(([k,v])=>{if(groups[k]) groups[k].visible(v);});
  mainLayer.batchDraw();previewLayer.batchDraw();
}

// ===== 2026-08-28: 화면에서 인쇄 영역 잡기 (대표 지시 — "인쇄를 화면으로 잡을 수 있게") =====
//  설정창에서 한 번 드래그하고 끝나는 게 아니라, 도면 위에 인쇄 틀을 띄워 두고
//  손으로 끌어 옮기고 모서리를 잡아 늘린다. 틀 바깥은 어둡게 덮어 뭐가 찍히는지 바로 보인다.
let _pfNodes=null;
const PRINT_FRAME_MIN_MM=300;
function printFrameActive(){
  if(!STATE.printFrameOn||_pm()) return false;
  // 영역을 새로 드래그하는 중에는 틀을 치운다 (틀이 클릭을 가로채지 않게)
  if(typeof _printRectActive!=='undefined'&&_printRectActive) return false;
  return true;
}
// 지금 틀이 잡고 있는 범위 (mm)
function printFrameRectMm(){
  if(typeof printCfg!=='function') return null;
  const c=printCfg();
  if(c.region==='rect'&&c.rect){
    return {minX:Math.min(c.rect.x1,c.rect.x2),minY:Math.min(c.rect.y1,c.rect.y2),
            maxX:Math.max(c.rect.x1,c.rect.x2),maxY:Math.max(c.rect.y1,c.rect.y2)};
  }
  const bb=(typeof printRegionBBox==='function')?printRegionBBox(c):null;
  return bb?{minX:bb.minX,minY:bb.minY,maxX:bb.maxX,maxY:bb.maxY}:null;
}
function _pfHandlePos(k,x,y,w,h){
  return {nw:{x:x,y:y},n:{x:x+w/2,y:y},ne:{x:x+w,y:y},e:{x:x+w,y:y+h/2},
          se:{x:x+w,y:y+h},s:{x:x+w/2,y:y+h},sw:{x:x,y:y+h},w:{x:x,y:y+h/2}}[k];
}
const PF_CURSOR={nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',
                 n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize'};
function renderPrintFrame(){
  if(!groups.printFrame) return;
  groups.printFrame.destroyChildren();
  _pfNodes=null;
  if(!printFrameActive()) return;
  const r=printFrameRectMm();
  if(!r) return;
  const SW=stage.width(), SH=stage.height(), PAD=3000; // 팬 중에도 덮개가 벌어지지 않도록 넉넉히
  let cur={x:STATE.offsetX+mmToPx(r.minX), y:STATE.offsetY+mmToPx(r.minY),
           w:mmToPx(r.maxX-r.minX), h:mmToPx(r.maxY-r.minY)};
  const MIN=Math.max(10,mmToPx(PRINT_FRAME_MIN_MM));
  // 바깥 덮개 — 찍히지 않는 곳을 어둡게
  const mask=[0,1,2,3].map(()=>{
    const m=new Konva.Rect({fill:'#000',opacity:0.34,listening:false});
    groups.printFrame.add(m);return m;
  });
  // 틀 안쪽은 클릭을 먹지 않는다 — 안에 들어있는 객체를 그대로 고르고 고칠 수 있게.
  //  틀은 테두리(폭 18px)와 손잡이로만 잡는다 — 사진 크롭 박스와 같은 방식.
  const rect=new Konva.Rect({stroke:'#D4B872',strokeWidth:2,dash:[10,6],
    fillEnabled:false,draggable:true,hitStrokeWidth:18,
    shadowColor:'#D4B872',shadowBlur:7,shadowOpacity:0.55});
  groups.printFrame.add(rect);
  const label=new Konva.Text({text:'',fontSize:12.5,fontFamily:'JetBrains Mono, monospace',
    fontStyle:'700',fill:'#FFE9A8',stroke:'#0A0A0A',strokeWidth:3.2,
    fillAfterStrokeEnabled:true,lineJoin:'round',listening:false});
  groups.printFrame.add(label);
  const HK=['nw','n','ne','e','se','s','sw','w'];
  const handles={};
  HK.forEach(k=>{
    const nd=new Konva.Circle({radius:6.5,fill:'#D4B872',stroke:'#0A0A0A',strokeWidth:1.6,
      draggable:true,hitStrokeWidth:22});
    nd.dragBoundFunc(function(pos){
      const out={x:pos.x,y:pos.y};
      if(k==='n'||k==='s') out.x=cur.x+cur.w/2;
      if(k==='e'||k==='w') out.y=cur.y+cur.h/2;
      return out;
    });
    handles[k]=nd;groups.printFrame.add(nd);
  });
  // 틀 정보 — 이 범위가 어떤 용지·축척으로 나오는지
  const infoText=()=>{
    const wMm=Math.round(pxToMm(cur.w)), hMm=Math.round(pxToMm(cur.h));
    let head='';
    try{
      if(typeof choosePrintLayout==='function'&&typeof printCfg==='function'){
        const c=printCfg();
        const L=choosePrintLayout({w:wMm+600,h:hMm+600},c); // 여백 300mm 양쪽 반영
        head=L.paper+' '+(L.orientation==='landscape'?'가로':'세로')+' · 1/'+L.scale+' · ';
      }
    }catch(_){}
    return '🖨 '+head+wMm+'×'+hMm+'mm';
  };
  const layout=(nx,ny,nw,nh,skip)=>{
    cur={x:nx,y:ny,w:nw,h:nh};
    if(rect!==skip) rect.position({x:nx,y:ny});
    rect.size({width:nw,height:nh});
    mask[0].setAttrs({x:-PAD,y:-PAD,width:SW+PAD*2,height:ny+PAD});
    mask[1].setAttrs({x:-PAD,y:ny+nh,width:SW+PAD*2,height:SH-(ny+nh)+PAD});
    mask[2].setAttrs({x:-PAD,y:ny,width:nx+PAD,height:nh});
    mask[3].setAttrs({x:nx+nw,y:ny,width:SW-(nx+nw)+PAD,height:nh});
    HK.forEach(k=>{const nd=handles[k];if(nd&&nd!==skip) nd.position(_pfHandlePos(k,nx,ny,nw,nh));});
    label.text(infoText());
    label.position({x:Math.max(2,nx+2),y:(ny-21<2)?(ny+6):(ny-21)});
    mainLayer.batchDraw();
  };
  const commit=()=>{
    if(typeof printCfg!=='function') return;
    // 틀 노드 자체가 기준 — 마지막 dragmove 가 생략돼도 위치가 어긋나지 않게
    cur={x:rect.x(),y:rect.y(),w:rect.width(),h:rect.height()};
    const c=printCfg();
    c.region='rect';
    c.rect={x1:Math.round(pxToMm(cur.x-STATE.offsetX)),y1:Math.round(pxToMm(cur.y-STATE.offsetY)),
            x2:Math.round(pxToMm(cur.x+cur.w-STATE.offsetX)),y2:Math.round(pxToMm(cur.y+cur.h-STATE.offsetY))};
    if(typeof refreshPrintFrameBar==='function') refreshPrintFrameBar();
    renderPrintFrame();
  };
  rect.on('mousedown touchstart',e=>{e.cancelBubble=true;});
  rect.on('mouseenter',()=>{document.body.style.cursor='move';});
  rect.on('mouseleave',()=>{document.body.style.cursor='';});
  rect.on('dragmove',()=>{const p=rect.position();layout(p.x,p.y,cur.w,cur.h,rect);});
  rect.on('dragend',commit);
  HK.forEach(k=>{
    const nd=handles[k];
    nd.on('mousedown touchstart',e=>{e.cancelBubble=true;});
    nd.on('mouseenter',()=>{document.body.style.cursor=PF_CURSOR[k]||'pointer';});
    nd.on('mouseleave',()=>{document.body.style.cursor='';});
    nd.on('dragmove',()=>{
      const p=nd.position();
      let l=cur.x,t=cur.y,rr=cur.x+cur.w,b=cur.y+cur.h;
      if(k.indexOf('w')>=0) l=Math.min(p.x,rr-MIN);
      if(k.indexOf('e')>=0) rr=Math.max(p.x,l+MIN);
      if(k.indexOf('n')>=0) t=Math.min(p.y,b-MIN);
      if(k.indexOf('s')>=0) b=Math.max(p.y,t+MIN);
      layout(l,t,rr-l,b-t,nd);
      nd.position(_pfHandlePos(k,l,t,rr-l,b-t)); // 최소 크기에 걸리면 핸들도 모서리에 붙인다
    });
    nd.on('dragend',commit);
  });
  layout(cur.x,cur.y,cur.w,cur.h,null);
  _pfNodes={rect,handles,mask,label,layout,commit};
}

// v5.9: 고스트 스냅 힌트 — 모든 객체의 잠재적 스냅점 미리 표시
function renderGhostHints(){
  ghostHintGroup.destroyChildren();
  if(!STATE.snap.ghost){previewLayer.batchDraw();return;}
  const seen=new Set();
  const drawHint=(mmX,mmY,emphasize)=>{
    const k=Math.round(mmX)+':'+Math.round(mmY);
    if(seen.has(k)) return; seen.add(k);
    const x=STATE.offsetX+mmToPx(mmX), y=STATE.offsetY+mmToPx(mmY);
    ghostHintGroup.add(new Konva.Circle({
      x,y,radius:emphasize?3:2,
      fill:emphasize?'#FFE066':'#A8A8B8',
      stroke:'#000',strokeWidth:0.5,opacity:emphasize?0.85:0.55,
    }));
  };
  // 모든 벽 (일반 + 내력벽 + line) — 끝점·중점·1/4·3/4
  // 내력벽은 두꺼운 벽체 안에 점이 묻히므로 크게 + 검정 외곽으로 또렷하게
  const drawWallHint=(mmX,mmY,emphasize,isBearing)=>{
    const k=Math.round(mmX)+':'+Math.round(mmY);
    if(seen.has(k)) return; seen.add(k);
    const x=STATE.offsetX+mmToPx(mmX), y=STATE.offsetY+mmToPx(mmY);
    const r=isBearing?(emphasize?4:3):(emphasize?3:2);
    ghostHintGroup.add(new Konva.Circle({
      x,y,radius:r,
      fill:emphasize?'#FFE066':'#A8A8B8',
      stroke:'#000',strokeWidth:isBearing?1.2:0.5,
      opacity:emphasize?0.95:0.75,
      shadowColor:isBearing?'#000':'transparent',shadowBlur:isBearing?4:0,shadowOpacity:isBearing?0.7:0,
    }));
  };
  STATE.walls.forEach(w=>{
    const isBrg=w.wallType==='bearing';
    drawWallHint(w.x1,w.y1,true,isBrg);
    drawWallHint(w.x2,w.y2,true,isBrg);
    drawWallHint((w.x1+w.x2)/2,(w.y1+w.y2)/2,false,isBrg);
    drawWallHint(w.x1+(w.x2-w.x1)*0.25,w.y1+(w.y2-w.y1)*0.25,false,isBrg);
    drawWallHint(w.x1+(w.x2-w.x1)*0.75,w.y1+(w.y2-w.y1)*0.75,false,isBrg);
  });
  // 내력벽끼리 교차점
  const bearings=STATE.walls.filter(w=>w.wallType==='bearing');
  for(let i=0;i<bearings.length;i++){
    for(let j=i+1;j<bearings.length;j++){
      const a=bearings[i], b=bearings[j];
      const ip=(typeof segIntersection==='function')?
        segIntersection({x:a.x1,y:a.y1},{x:a.x2,y:a.y2},{x:b.x1,y:b.y1},{x:b.x2,y:b.y2}):null;
      if(ip) drawHint(ip.x,ip.y,true);
    }
  }
  // 공간 — 코너·변 중점·1/4·3/4
  STATE.spaces.forEach(s=>{
    s.polygon.forEach(p=>drawHint(p.x,p.y,true));
    for(let i=0;i<s.polygon.length;i++){
      const a=s.polygon[i], b=s.polygon[(i+1)%s.polygon.length];
      drawHint((a.x+b.x)/2,(a.y+b.y)/2,false);
      drawHint(a.x+(b.x-a.x)*0.25,a.y+(b.y-a.y)*0.25,false);
      drawHint(a.x+(b.x-a.x)*0.75,a.y+(b.y-a.y)*0.75,false);
    }
  });
  // 도어·창 — 중심점
  STATE.openings.forEach(o=>drawHint(o.x,o.y,true));
  // 라이브러리 — 중심점
  [STATE.furniture,STATE.fixtures,STATE.lights,STATE.electric,STATE.hvac].forEach(arr=>{
    arr.forEach(o=>drawHint(o.x,o.y,false));
  });
  // 원 — 중심 + 4분점 (사분점)
  STATE.circles.forEach(c=>{
    drawHint(c.x,c.y,true);
    drawHint(c.x+c.radius_mm,c.y,false);
    drawHint(c.x-c.radius_mm,c.y,false);
    drawHint(c.x,c.y+c.radius_mm,false);
    drawHint(c.x,c.y-c.radius_mm,false);
  });
  // 아크 — 중심 + 시작·끝점
  STATE.arcs.forEach(a=>{
    const sa=a.startAngle*Math.PI/180, ea=a.endAngle*Math.PI/180;
    drawHint(a.x,a.y,true);
    drawHint(a.x+Math.cos(sa)*a.radius_mm,a.y+Math.sin(sa)*a.radius_mm,true);
    drawHint(a.x+Math.cos(ea)*a.radius_mm,a.y+Math.sin(ea)*a.radius_mm,true);
  });
  // 텍스트·치수 — 위치
  STATE.texts.forEach(t=>drawHint(t.x,t.y,false));
  STATE.measures.forEach(m=>{drawHint(m.x1,m.y1,true);drawHint(m.x2,m.y2,true);});
  // 지시선 — 모든 꼭지점
  if(STATE.leaders) STATE.leaders.forEach(l=>{
    if(l.points) l.points.forEach(p=>drawHint(p.x,p.y,true));
  });
  // 곡선 — 각 segment의 앵커(P0, P3) 강조 + 중점 표식
  if(STATE.curves) STATE.curves.forEach(cv=>{
    if(!cv.segments) return;
    cv.segments.forEach((s,i)=>{
      if(i===0) drawHint(s.p0.x,s.p0.y,true);
      drawHint(s.p3.x,s.p3.y,true);
      const t=0.5, mt=1-t;
      const midX=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
      const midY=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
      drawHint(midX,midY,false);
    });
  });
  previewLayer.batchDraw();
}
// v5.9: vertex 편집 핸들 — 선택된 공간/벽의 모서리·끝점에 드래그 핸들
// 드래그 시 vertex 좌표만 갱신 → getter로 모든 연결 객체 자동 따라옴
let _spaceHandleDragging=false;
let _spaceHandleStartMm=null; // 직교 모드 기준점
let _vertexSnapIndicator=null; // vertex-vertex 스냅 시각 마커
function renderSpaceHandles(){
  if(_spaceHandleDragging) return; // 드래그 중에는 핸들 재생성 안 함 (위치 리셋 방지)
  groups.spaceHandles.destroyChildren();
  if(STATE.selectedTool!=='select') return;

  // 표시할 vertex ID 수집 (선택된 공간·벽·박스선택 모두) — v5.9: 잠금 객체는 핸들 숨김
  const vidSet=new Set();
  const collectFromObj=(kind,id)=>{
    if(kind==='space'){
      const s=STATE.spaces.find(x=>x.id===id);
      if(s&&!s.locked&&s.vertexIds) s.vertexIds.forEach(vid=>vidSet.add(vid));
    }else if(kind==='wall'){
      const w=STATE.walls.find(x=>x.id===id);
      if(w&&!w.locked){if(w.v1Id) vidSet.add(w.v1Id); if(w.v2Id) vidSet.add(w.v2Id);}
    }
  };
  if(STATE.selectedKind&&STATE.selectedId) collectFromObj(STATE.selectedKind,STATE.selectedId);
  if(STATE.boxSelection&&STATE.boxSelection.length){
    STATE.boxSelection.forEach(b=>collectFromObj(b.kind,b.id));
  }

  // 각 vertex에 핸들 생성
  vidSet.forEach(vid=>{
    const v=getVertex(vid);
    if(!v) return;
    const hx=STATE.offsetX+mmToPx(v.x), hy=STATE.offsetY+mmToPx(v.y);
    // v5.9: 미니멀 글로우 핸들 — opacity 30%, 클릭 영역 30px
    const handle=new Konva.Circle({
      x:hx,y:hy,radius:5,
      fill:'#D4FF3D',
      strokeEnabled:false,
      draggable:true,
      opacity:0.3,
      shadowColor:'#D4FF3D',shadowBlur:12,shadowOpacity:1,
      hitStrokeWidth:30, // 클릭 영역 확장
    });
    handle.on('mouseenter',()=>{
      document.body.style.cursor='move';
      handle.opacity(0.9);handle.radius(7);handle.shadowBlur(18);
      groups.spaceHandles.batchDraw();
    });
    handle.on('mouseleave',()=>{
      document.body.style.cursor='';
      handle.opacity(0.3);handle.radius(5);handle.shadowBlur(12);
      groups.spaceHandles.batchDraw();
    });
    handle.on('mousedown touchstart',e=>{e.cancelBubble=true;});
    handle.on('dragstart',()=>{
      _spaceHandleDragging=true;
      // v5.9: 선택(드래그 시작) — 흰색 코어 + 강한 라임 글로우로 강조
      handle.opacity(1);handle.radius(8);
      handle.fill('#FFFFFF');
      handle.shadowColor('#D4FF3D');handle.shadowBlur(28);handle.shadowOpacity(1);
      // 2026-08-22: 대표 지시 9번 — 공간 꼭짓점이 다른 공간·타 소속 벽과 공유돼 있으면 분리 후 이동
      //  (이전: 공유 vertex 를 그대로 이동 → 이웃 공간 모서리가 함께 끌려옴)
      if(STATE.selectedKind==='space'){
        const sp=STATE.spaces.find(s=>s.id===STATE.selectedId);
        if(sp&&sp.vertexIds&&sp.vertexIds.includes(vid)){
          const shared=STATE.spaces.some(s=>s.id!==sp.id&&s.vertexIds&&s.vertexIds.includes(vid))
                     ||STATE.walls.some(w=>w.spaceId!==sp.id&&(w.v1Id===vid||w.v2Id===vid));
          if(shared){
            const v0=getVertex(vid);
            if(v0){
              const nv={id:makeId('v'),x:v0.x,y:v0.y};
              STATE.vertices.push(nv);
              sp.vertexIds=sp.vertexIds.map(x=>x===vid?nv.id:x);
              STATE.walls.forEach(w=>{if(w.spaceId===sp.id){if(w.v1Id===vid)w.v1Id=nv.id;if(w.v2Id===vid)w.v2Id=nv.id;}});
              vid=nv.id;
            }
          }
        }
      }
      // 2026-08-24: 잠금 강화 — 잠긴 객체와 공유된 꼭짓점은 드래그 자체를 차단 (따라 움직임 방지)
      if(isVertexLocked(vid)){
        _spaceHandleDragging=false;
        handle.stopDrag();
        handle.opacity(0.3);handle.radius(5);handle.fill('#D4FF3D');handle.shadowBlur(12);
        if(typeof cmdToast==='function')cmdToast('잠금된 객체와 연결된 꼭짓점 — 이동 불가');
        groups.spaceHandles.batchDraw();
        return;
      }
      // 직교 기준점 = vertex 원래 mm 좌표
      const vNow=getVertex(vid);
      _spaceHandleStartMm=vNow?{x:vNow.x,y:vNow.y}:null;
      groups.spaceHandles.batchDraw();
    });
    handle.on('dragmove',()=>{
      let newXmm=Math.round((handle.x()-STATE.offsetX)/STATE.scale*1000/STATE.zoom);
      let newYmm=Math.round((handle.y()-STATE.offsetY)/STATE.scale*1000/STATE.zoom);
      // v5.9: 직교 모드 — Shift로 토글 (snap.ortho XOR shiftPressed)
      const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
      if(orthoActive&&_spaceHandleStartMm){
        const dx=newXmm-_spaceHandleStartMm.x, dy=newYmm-_spaceHandleStartMm.y;
        if(Math.abs(dx)>=Math.abs(dy)) newYmm=_spaceHandleStartMm.y;
        else newXmm=_spaceHandleStartMm.x;
      }
      if(STATE.snap.grid){
        newXmm=Math.round(newXmm/STATE.gridSize)*STATE.gridSize;
        newYmm=Math.round(newYmm/STATE.gridSize)*STATE.gridSize;
      }
      // v5.9: vertex-to-vertex 스냅 (자기 자신 제외, 가장 가까운 80mm 이내)
      const SNAP_TOL_MM=80;
      let snapTarget=null, snapBest=Infinity;
      STATE.vertices.forEach(o=>{
        if(o.id===vid) return;
        const d=Math.hypot(o.x-newXmm,o.y-newYmm);
        if(d<SNAP_TOL_MM&&d<snapBest){snapBest=d;snapTarget=o;}
      });
      if(snapTarget){
        newXmm=snapTarget.x;newYmm=snapTarget.y;
        handle.fill('#FF8B6B');handle.shadowColor('#FF8B6B');
        if(!_vertexSnapIndicator){
          _vertexSnapIndicator=new Konva.Circle({
            radius:13,stroke:'#FF8B6B',strokeWidth:2,fill:'transparent',
            listening:false,
            shadowColor:'#FF8B6B',shadowBlur:14,shadowOpacity:1,
          });
          // 작은 십자도 추가 (정확한 스냅 위치 표시)
          groups.spaceHandles.add(_vertexSnapIndicator);
        }
        _vertexSnapIndicator.x(STATE.offsetX+mmToPx(snapTarget.x));
        _vertexSnapIndicator.y(STATE.offsetY+mmToPx(snapTarget.y));
        _vertexSnapIndicator.visible(true);
      }else{
        handle.fill('#FFFFFF');handle.shadowColor('#D4FF3D');
        if(_vertexSnapIndicator) _vertexSnapIndicator.visible(false);
      }
      moveVertex(vid,newXmm,newYmm);
      handle.x(STATE.offsetX+mmToPx(newXmm));
      handle.y(STATE.offsetY+mmToPx(newYmm));
      // 벽·공간 + 개구부(벽 부착) 재렌더 (핸들은 유지)
      renderWalls();renderSpaces();renderOpenings();
      groups.spaceHandles.batchDraw();
    });
    handle.on('dragend',()=>{
      _spaceHandleDragging=false;
      _spaceHandleStartMm=null;
      if(_vertexSnapIndicator){_vertexSnapIndicator.destroy();_vertexSnapIndicator=null;}
      saveHistory();
      renderAll();refreshUI();
    });
    groups.spaceHandles.add(handle);
  });
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
    if(w.wallType==='bearing') return; // v5.9: 내력벽 격리 — 자동 면적 감지에서 제외
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
    // v5.9: 타원 지원 — rx_mm/ry_mm/rotation 사용, 없으면 radius_mm으로 폴백
    const rx=c.rx_mm!=null?c.rx_mm:c.radius_mm;
    const ry=c.ry_mm!=null?c.ry_mm:c.radius_mm;
    const rotDeg=c.rotation||0;
    // v5.9: 사용자 지정 색상 적용 (없으면 기본 - stroke + 15% 투명)
    const fillCol=c.fillColor||(stroke+'15');
    const strokeCol=c.strokeColor||stroke;
    const k=new Konva.Ellipse({x:cx,y:cy,radiusX:mmToPx(rx),radiusY:mmToPx(ry),rotation:rotDeg,
      stroke:(sel||inBox)?'#E2725B':strokeCol,strokeWidth:sel?2.5:1.6,fill:fillCol,id:c.id,
      opacity:c.locked?0.30:1, dash:c.locked?[6,4]:null}); // v5.9: 잠금 시 반투명+점선
    k.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('circles',c.id);});
    groups.circles.add(k);
    // v5.9: 중앙 텍스트 (사용자 지정)
    if(c.centerText){
      // 텍스트 크기 — 단축 반지름의 30%, 최소 10, 최대 28
      const minR=Math.min(rx,ry);
      const fontSize=Math.max(10,Math.min(28,mmToPx(minR)*0.30));
      const txt=new Konva.Text({
        x:cx,y:cy,text:c.centerText,
        fontSize:fontSize,fontFamily:'Inter',fontStyle:'600',
        fill:'#F5F1EB',
        shadowColor:'#000',shadowBlur:3,shadowOpacity:0.7,
        listening:false,align:'center',verticalAlign:'middle',
      });
      txt.offsetX(txt.width()/2);
      txt.offsetY(txt.height()/2);
      groups.circles.add(txt);
    }
    // v5.9: 선택 시 편집 핸들 — rx± / ry± / 회전 (잠금 시 핸들 숨김)
    if(sel&&!c.locked){
      const cosA=Math.cos(rotDeg*Math.PI/180), sinA=Math.sin(rotDeg*Math.PI/180);
      const rxPx=mmToPx(rx), ryPx=mmToPx(ry);
      const handles=[
        {axis:'rx',sign: 1,x:cx+rxPx*cosA, y:cy+rxPx*sinA},
        {axis:'rx',sign:-1,x:cx-rxPx*cosA, y:cy-rxPx*sinA},
        {axis:'ry',sign: 1,x:cx-ryPx*sinA, y:cy+ryPx*cosA},
        {axis:'ry',sign:-1,x:cx+ryPx*sinA, y:cy-ryPx*cosA},
      ];
      handles.forEach(h=>{
        const hd=new Konva.Rect({x:h.x-4,y:h.y-4,width:8,height:8,
          fill:'#FFD700',stroke:'#000',strokeWidth:1,draggable:true,hitStrokeWidth:14});
        hd.on('dragmove',()=>{
          const mx=pxToMm(hd.x()+4-STATE.offsetX), my=pxToMm(hd.y()+4-STATE.offsetY);
          const dx=mx-c.x, dy=my-c.y;
          const along=dx*Math.cos(rotDeg*Math.PI/180)+dy*Math.sin(rotDeg*Math.PI/180);
          const perp =-dx*Math.sin(rotDeg*Math.PI/180)+dy*Math.cos(rotDeg*Math.PI/180);
          if(h.axis==='rx') c.rx_mm=Math.max(10,Math.abs(along));
          else c.ry_mm=Math.max(10,Math.abs(perp));
          c.radius_mm=Math.max(c.rx_mm||c.radius_mm,c.ry_mm||c.radius_mm);
          // Ellipse 본체 직접 업데이트 (renderAll 호출 안 함 → 드래그 끊김 없음)
          k.radiusX(mmToPx(c.rx_mm));
          k.radiusY(mmToPx(c.ry_mm));
          mainLayer.batchDraw();
        });
        hd.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.circles.add(hd);
      });
      // 회전 핸들 (rx 양극 너머 30px)
      const rotHx=cx+(rxPx+30)*cosA, rotHy=cy+(rxPx+30)*sinA;
      const rotGuide=new Konva.Line({points:[cx+rxPx*cosA,cy+rxPx*sinA,rotHx,rotHy],
        stroke:'#C07B3A',strokeWidth:1,dash:[4,3],listening:false});
      groups.circles.add(rotGuide);
      const rotH=new Konva.Circle({x:rotHx,y:rotHy,radius:7,fill:'#C07B3A',stroke:'#fff',strokeWidth:1.5,draggable:true,hitStrokeWidth:18});
      rotH.on('dragmove',()=>{
        const mx=pxToMm(rotH.x()-STATE.offsetX), my=pxToMm(rotH.y()-STATE.offsetY);
        c.rotation=Math.atan2(my-c.y,mx-c.x)*180/Math.PI;
        // Ellipse 회전 + 가이드라인 끝점 직접 업데이트
        k.rotation(c.rotation);
        const newCosA=Math.cos(c.rotation*Math.PI/180), newSinA=Math.sin(c.rotation*Math.PI/180);
        const guideStart=[cx+rxPx*newCosA,cy+rxPx*newSinA,rotH.x(),rotH.y()];
        rotGuide.points(guideStart);
        mainLayer.batchDraw();
      });
      rotH.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
      groups.circles.add(rotH);
      // 중심점 표시
      groups.circles.add(new Konva.Circle({x:cx,y:cy,radius:3,fill:'#E2725B',stroke:'#fff',strokeWidth:1,listening:false}));
      // R 라벨
      groups.circles.add(new Konva.Text({x:cx+10,y:cy-22,
        text:'rx '+Math.round(rx)+' / ry '+Math.round(ry)+'mm',
        fontSize:10,fontFamily:'JetBrains Mono',fill:'#E2725B',listening:false}));
    }
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
    k.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('arcs',a.id);});
    groups.arcs.add(k);
  });
}
// v5.9: 아크를 3차 베지에 segments로 변환 (90° 단위 분할)
function arcToBezier(cx,cy,r,startAng,endAng){
  const segments=[];
  let a=startAng;
  // sweep 정규화
  let sweep=endAng-startAng;
  while(sweep<=0) sweep+=360;
  while(sweep>360) sweep-=360;
  const stop=startAng+sweep;
  while(a<stop){
    const a2=Math.min(a+90,stop);
    const theta=(a2-a)*Math.PI/180;
    const k=(4/3)*Math.tan(theta/4);
    const a1Rad=a*Math.PI/180, a2Rad=a2*Math.PI/180;
    const p0={x:Math.round(cx+r*Math.cos(a1Rad)),y:Math.round(cy+r*Math.sin(a1Rad))};
    const p3={x:Math.round(cx+r*Math.cos(a2Rad)),y:Math.round(cy+r*Math.sin(a2Rad))};
    const t1x=-Math.sin(a1Rad), t1y=Math.cos(a1Rad);
    const t2x=-Math.sin(a2Rad), t2y=Math.cos(a2Rad);
    const p1={x:Math.round(p0.x+t1x*k*r),y:Math.round(p0.y+t1y*k*r)};
    const p2={x:Math.round(p3.x-t2x*k*r),y:Math.round(p3.y-t2y*k*r)};
    segments.push({p0,p1,p2,p3});
    a=a2;
  }
  return segments;
}
// v5.9: 자유곡선 (3차 베지에) 렌더링 + 편집 핸들
function renderCurves(){
  groups.curves.destroyChildren();
  if(!STATE.curves) return;
  STATE.curves.forEach(c=>{
    if(!c.segments||c.segments.length===0) return;
    const sel=STATE.selectedKind==='curves'&&STATE.selectedId===c.id;
    const inBox=STATE.boxSelection.some(b=>b.kind==='curves'&&b.id===c.id);
    const sp=c.spaceId?STATE.spaces.find(s=>s.id===c.spaceId):null;
    const stroke=(sel||inBox)?'#E2725B':(sp?SPACE_TYPES[sp.type].color:'#C9A961');
    const k=new Konva.Shape({
      id:c.id,
      stroke:stroke, // Konva.Shape의 stroke 속성 — strokeShape(sh) 호출 시 사용
      strokeWidth:sel?2.5:1.6,
      hitStrokeWidth:24, // v5.9: 클릭 영역 확장 (곡선 위 24px 이내 클릭이면 선택)
      opacity:c.locked?0.30:1, dash:c.locked?[6,4]:null, // v5.9: 잠금 시각효과
      sceneFunc(ctx,sh){
        ctx.beginPath();
        const s0=c.segments[0];
        ctx.moveTo(STATE.offsetX+mmToPx(s0.p0.x),STATE.offsetY+mmToPx(s0.p0.y));
        c.segments.forEach(s=>{
          ctx.bezierCurveTo(
            STATE.offsetX+mmToPx(s.p1.x),STATE.offsetY+mmToPx(s.p1.y),
            STATE.offsetX+mmToPx(s.p2.x),STATE.offsetY+mmToPx(s.p2.y),
            STATE.offsetX+mmToPx(s.p3.x),STATE.offsetY+mmToPx(s.p3.y)
          );
        });
        ctx.strokeShape(sh);
      },
      hitFunc(ctx,sh){
        ctx.beginPath();
        const s0=c.segments[0];
        ctx.moveTo(STATE.offsetX+mmToPx(s0.p0.x),STATE.offsetY+mmToPx(s0.p0.y));
        c.segments.forEach(s=>{
          ctx.bezierCurveTo(
            STATE.offsetX+mmToPx(s.p1.x),STATE.offsetY+mmToPx(s.p1.y),
            STATE.offsetX+mmToPx(s.p2.x),STATE.offsetY+mmToPx(s.p2.y),
            STATE.offsetX+mmToPx(s.p3.x),STATE.offsetY+mmToPx(s.p3.y)
          );
        });
        ctx.strokeShape(sh);
      },
    });
    k.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('curves',c.id);});
    groups.curves.add(k);
    // 선택 시 편집 핸들 (앵커 + 컨트롤 + 가이드라인) — 잠금 시 핸들 숨김
    if(sel&&!c.locked){
      const drawAnchor=(p,segIdx,ptKey)=>{
        const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
        const hd=new Konva.Rect({x:x-5,y:y-5,width:10,height:10,
          fill:'#FFD700',stroke:'#000',strokeWidth:1,draggable:true,hitStrokeWidth:14});
        hd.on('dragmove',()=>{
          c.segments[segIdx][ptKey]={x:Math.round(pxToMm(hd.x()+5-STATE.offsetX)),y:Math.round(pxToMm(hd.y()+5-STATE.offsetY))};
          if(ptKey==='p3'&&segIdx+1<c.segments.length) c.segments[segIdx+1].p0={...c.segments[segIdx][ptKey]};
          if(ptKey==='p0'&&segIdx>0) c.segments[segIdx-1].p3={...c.segments[segIdx][ptKey]};
          mainLayer.batchDraw(); // 곡선 path만 갱신, 핸들은 유지
        });
        hd.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.curves.add(hd);
      };
      const drawControl=(p,segIdx,ptKey,anchor)=>{
        const x=STATE.offsetX+mmToPx(p.x), y=STATE.offsetY+mmToPx(p.y);
        const ax=STATE.offsetX+mmToPx(anchor.x), ay=STATE.offsetY+mmToPx(anchor.y);
        const guide=new Konva.Line({points:[ax,ay,x,y],stroke:'#7BA05B',strokeWidth:1,dash:[3,3],listening:false});
        groups.curves.add(guide);
        const hd=new Konva.Circle({x,y,radius:5,fill:'#7BA05B',stroke:'#fff',strokeWidth:1.5,draggable:true,hitStrokeWidth:14});
        hd.on('dragmove',()=>{
          c.segments[segIdx][ptKey]={x:Math.round(pxToMm(hd.x()-STATE.offsetX)),y:Math.round(pxToMm(hd.y()-STATE.offsetY))};
          // 가이드라인 끝점도 따라 업데이트
          guide.points([ax,ay,hd.x(),hd.y()]);
          mainLayer.batchDraw();
        });
        hd.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.curves.add(hd);
      };
      c.segments.forEach((s,i)=>{
        // 마지막 p3는 다음 segment의 p0과 같으므로 첫 segment에서만 p0 그림
        if(i===0) drawAnchor(s.p0,i,'p0');
        drawControl(s.p1,i,'p1',s.p0);
        drawControl(s.p2,i,'p2',s.p3);
        drawAnchor(s.p3,i,'p3');
        // v5.9: 중점 bend 핸들 — 드래그한 위치로 곡선 중점이 자연스럽게 도달
        // 곡선 중점 B(0.5) = chord_midpoint + 0.75 × offset
        // → 사용자가 원하는 위치로 이동: offset = (drag - chord_midpoint) / 0.75
        const t=0.5, mt=1-t;
        const mxMm=mt*mt*mt*s.p0.x+3*mt*mt*t*s.p1.x+3*mt*t*t*s.p2.x+t*t*t*s.p3.x;
        const myMm=mt*mt*mt*s.p0.y+3*mt*mt*t*s.p1.y+3*mt*t*t*s.p2.y+t*t*t*s.p3.y;
        const mxPx=STATE.offsetX+mmToPx(mxMm), myPx=STATE.offsetY+mmToPx(myMm);
        const bend=new Konva.Circle({x:mxPx,y:myPx,radius:7,fill:'#E2725B',stroke:'#fff',strokeWidth:1.5,
          draggable:true,hitStrokeWidth:18,
          shadowColor:'#E2725B',shadowBlur:8,shadowOpacity:0.6});
        bend.on('mouseenter',()=>{document.body.style.cursor='grab';bend.radius(9);groups.curves.batchDraw();});
        bend.on('mouseleave',()=>{document.body.style.cursor='';bend.radius(7);groups.curves.batchDraw();});
        bend.on('dragmove',()=>{
          const dx=pxToMm(bend.x()-STATE.offsetX);
          const dy=pxToMm(bend.y()-STATE.offsetY);
          const cmidX=(s.p0.x+s.p3.x)/2, cmidY=(s.p0.y+s.p3.y)/2;
          const offX=(dx-cmidX)/0.75, offY=(dy-cmidY)/0.75;
          const dxv=s.p3.x-s.p0.x, dyv=s.p3.y-s.p0.y;
          s.p1={x:Math.round(s.p0.x+dxv/3+offX),y:Math.round(s.p0.y+dyv/3+offY)};
          s.p2={x:Math.round(s.p3.x-dxv/3+offX),y:Math.round(s.p3.y-dyv/3+offY)};
          mainLayer.batchDraw();
        });
        bend.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
        groups.curves.add(bend);
      });
    }
  });
}

// v5.9: 기둥 (RC 콘크리트) — 사각/원형/L자 + 콘크리트 해치
// 기둥 폴리곤 (회전 전, 중심 기준 mm 좌표)
function pillarPolygonLocal(p){
  const w=p.width||500, h=p.height||500, t=p.thickness||200;
  if(p.shape==='circle'){
    const r=w/2; const N=48; const pts=[];
    for(let i=0;i<N;i++){const a=(i/N)*Math.PI*2;pts.push({x:r*Math.cos(a),y:r*Math.sin(a)});}
    return pts;
  }
  if(p.shape==='L'){
    // L자: 중심 = 두 팔의 무게중심 근처 (대칭 위해 외곽 사각의 중심에서 보정)
    // 외곽: w x h. 안쪽 칼라: (w-t) x (h-t)
    // 중심 기준 좌표: 외곽 사각의 중심을 원점으로 두고 L 모양을 그림
    const x0=-w/2, y0=-h/2;
    return [
      {x:x0,y:y0},{x:x0+w,y:y0},{x:x0+w,y:y0+t},
      {x:x0+t,y:y0+t},{x:x0+t,y:y0+h},{x:x0,y:y0+h}
    ];
  }
  // rect (default)
  return [{x:-w/2,y:-h/2},{x:w/2,y:-h/2},{x:w/2,y:h/2},{x:-w/2,y:h/2}];
}
// 기둥 폴리곤 (회전 + 위치 적용) → mm 좌표
function pillarPolygon(p){
  const local=pillarPolygonLocal(p);
  const rad=(p.rotation||0)*Math.PI/180;
  const cosA=Math.cos(rad), sinA=Math.sin(rad);
  return local.map(pt=>({x:Math.round(p.x+pt.x*cosA-pt.y*sinA),y:Math.round(p.y+pt.x*sinA+pt.y*cosA)}));
}
function renderPillars(){
  groups.pillars.destroyChildren();
  if(!STATE.pillars) return;
  const _theme=document.body&&document.body.getAttribute('data-theme');
  const _isLight=_theme==='architect';
  const _outline=_isLight?'#000000':'#FFFFFF';
  const _hatch=_isLight?'#1A1A1A':'#E5E5E5';
  const _fill=_isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.12)';
  STATE.pillars.forEach(p=>{
    const sel=STATE.selectedKind==='pillars'&&STATE.selectedId===p.id||STATE.boxSelection.some(b=>b.kind==='pillars'&&b.id===p.id);
    const polyMm=pillarPolygon(p);
    const polyPx=polyMm.map(pt=>({x:STATE.offsetX+mmToPx(pt.x),y:STATE.offsetY+mmToPx(pt.y)}));
    // 본체 + 콘크리트 해치 (45° 빗금 + 작은 점 — RC 콘크리트 표준 표기)
    const shape=new Konva.Shape({
      id:p.id,
      sceneFunc(ctx,sh){
        // 1. fill
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.fillStyle=_fill; ctx.fill();
        // 2. 콘크리트 해치 — 단순화: 긴 대각선 3줄 + 큰 원 1개 + 작은 원 1개
        ctx.save();
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.clip();
        ctx.strokeStyle=_hatch;
        ctx.fillStyle=_hatch;
        ctx.lineWidth=0.9;
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        polyPx.forEach(pt=>{minX=Math.min(minX,pt.x);maxX=Math.max(maxX,pt.x);minY=Math.min(minY,pt.y);maxY=Math.max(maxY,pt.y);});
        const w=maxX-minX, h=maxY-minY;
        const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
        const seed=(p.id||'').split('').reduce((s,c)=>s+c.charCodeAt(0),0)||1;
        const rnd=(i)=>{const x=Math.sin(seed*9999+i*131.71)*43758.5453;return x-Math.floor(x);};
        // 모든 해치 요소를 기둥 크기에 비례 (mm 공간 고정) — 줌해도 기둥과 같은 비율 유지
        const minDim=Math.min(w,h);
        const span=Math.hypot(w,h)+minDim*0.1;        // 대각선 길이 ≒ 폴리곤 대각선
        const gap=minDim/8;                            // 평행 간격 = 짧은 변의 1/8
        const shiftMag=minDim*0.15;                    // 비대칭 오프셋 ±15%
        const rBig=minDim*0.18;                        // 큰 원 반지름 = 짧은 변의 18% (기존의 절반)
        const rSml=rBig*0.4;                           // 작은 원 = 큰 원의 40%
        ctx.lineWidth=Math.max(0.6,minDim*0.018);      // 선 굵기도 비례
        const sX=(rnd(5)-0.5)*2*shiftMag, sY=(rnd(6)-0.5)*2*shiftMag;
        // (1) 대각선 3줄 (45°) — 폴리곤 끝~끝 길이, 짧은 변 1/8 간격
        for(let k=-1;k<=1;k++){
          ctx.beginPath();
          const offX=-k*gap/Math.SQRT2+sX, offY=k*gap/Math.SQRT2+sY;
          ctx.moveTo(cx+offX-span/2/Math.SQRT2, cy+offY-span/2/Math.SQRT2);
          ctx.lineTo(cx+offX+span/2/Math.SQRT2, cy+offY+span/2/Math.SQRT2);
          ctx.stroke();
        }
        // (2) 큰 원 — 폴리곤 하단 절반 안 임의 위치 (시드)
        const bxRange=Math.max(0,w-rBig*2);
        const byRangeLower=Math.max(0,h/2-rBig*2);
        const bx=minX+rBig+rnd(1)*bxRange;
        const by=minY+h/2+rBig+rnd(2)*byRangeLower;
        ctx.beginPath();
        ctx.arc(bx,by,rBig,0,Math.PI*2);
        ctx.stroke();
        // (3) 작은 원 (외곽선만)
        const sxRange=Math.max(0,w-rSml*2), syRange=Math.max(0,h-rSml*2);
        const sx=minX+rSml+rnd(3)*sxRange;
        const sy=minY+rSml+rnd(4)*syRange;
        ctx.beginPath();
        ctx.arc(sx,sy,rSml,0,Math.PI*2);
        ctx.stroke();
        ctx.restore();
        // 3. 외곽선 (굵게)
        ctx.strokeStyle=sel?'#E2725B':_outline;
        ctx.lineWidth=sel?2.8:2.2;
        ctx.lineJoin='miter';
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.stroke();
        // 선택 fill 강조
        if(sel){
          ctx.fillStyle='rgba(226,114,91,0.18)';
          ctx.beginPath();
          polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
          ctx.closePath();
          ctx.fill();
        }
      },
      hitFunc(ctx,sh){
        ctx.beginPath();
        polyPx.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
        ctx.closePath();
        ctx.fillStrokeShape(sh);
      },
      shadowColor:sel?'#E2725B':'transparent',shadowBlur:sel?10:0,shadowOpacity:sel?0.55:0,
      opacity:p.locked?0.30:1,
    });
    shape.on('click tap',e=>{if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0)return;e.cancelBubble=true;if(STATE.selectedTool==='select') selectObj('pillars',p.id);});
    groups.pillars.add(shape);
    // 선택 시 회전 핸들 (잠금 시 숨김)
    if(sel&&!p.locked){
      const cxPx=STATE.offsetX+mmToPx(p.x), cyPx=STATE.offsetY+mmToPx(p.y);
      // 중심점
      groups.pillars.add(new Konva.Circle({x:cxPx,y:cyPx,radius:3,fill:'#E2725B',stroke:'#fff',strokeWidth:1,listening:false}));
      // 회전 핸들 (위쪽 60px)
      const rad=(p.rotation||0)*Math.PI/180;
      const upY=-(p.shape==='circle'?p.width/2:p.height/2)-300;
      const rhx=cxPx+mmToPx(upY*Math.sin(-rad)*0+0)+0; // simpler: place at top-of-bounding
      const _rh={x:cxPx-Math.sin(rad)*40, y:cyPx-Math.cos(rad)*40-30};
      const guide=new Konva.Line({points:[cxPx,cyPx,_rh.x,_rh.y],stroke:'#C07B3A',strokeWidth:1,dash:[4,3],listening:false});
      groups.pillars.add(guide);
      const rh=new Konva.Circle({x:_rh.x,y:_rh.y,radius:7,fill:'#C07B3A',stroke:'#fff',strokeWidth:1.5,draggable:true,hitStrokeWidth:18});
      rh.on('dragmove',()=>{
        const mx=pxToMm(rh.x()-STATE.offsetX), my=pxToMm(rh.y()-STATE.offsetY);
        p.rotation=Math.atan2(my-p.y,mx-p.x)*180/Math.PI+90;
        renderPillars();mainLayer.batchDraw();
      });
      rh.on('dragend',()=>{saveHistory();renderAll();refreshUI();});
      groups.pillars.add(rh);
    }
  });
}

// ===== 선택 =====
// v5.9: Shift 누른 채 클릭 시 boxSelection에 토글 추가 (다중 선택)
function selectObj(kind,id){
  if(STATE.shiftPressed){
    const idx=STATE.boxSelection.findIndex(b=>b.kind===kind&&b.id===id);
    if(idx>=0){
      STATE.boxSelection.splice(idx,1);
    }else{
      // 단일 선택만 있고 박스가 비었으면 기존 단일도 박스에 포함
      if(STATE.boxSelection.length===0&&STATE.selectedKind&&STATE.selectedId
         &&!(STATE.selectedKind===kind&&STATE.selectedId===id)){
        STATE.boxSelection.push({kind:STATE.selectedKind,id:STATE.selectedId});
      }
      STATE.boxSelection.push({kind,id});
    }
    STATE.selectedKind=kind;STATE.selectedId=id;
    renderAll();refreshUI();return;
  }
  STATE.selectedKind=kind;STATE.selectedId=id;
  STATE.boxSelection=[];
  renderAll();refreshUI();
  // 2026-08-26: 태블릿 서랍 모드 — 선택 즉시 속성 패널 노출 (대표 보고)
  if(typeof autoOpenPropsDrawer==='function') autoOpenPropsDrawer();
}
function deselect(){STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];renderAll();refreshUI();}

