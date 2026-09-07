'use strict';
// ============================================================================
// MiniCAD 점·선·면 스케치 (2026-09-04) — 스케치업과 동일한 모델
//  대표 지시: "선·사각형·원을 만들면 바로 객체가 되면 안 된다. 처음엔 x,y 를 정하는 점과 선,
//             점 4개(닫힌 고리)가 면, 면에 z 를 넣으면 객체" — 미니캐드·미니폼 동일 적용
//  · STATE.sketchPts   [{id,x,y}]          점 — x,y 만 가진다
//  · STATE.sketchEdges [{id,a,b}]          선 — 점 id 두 개. 평면 그래프 유지(교차하면 자르고, 점 위를 지나면 나눈다)
//  · STATE.sketchFaces [{id,pts:[ptId..]}] 면 — 선 고리에서 자동 검출(skDetectFaces). 직접 만들지 않는다
//  · skExtrude(faceId,z,as) 가 면을 공간(+둘레 벽, 천장고=z) 또는 벽(높이=z) 으로 바꾼다 — 이때 비로소 객체
//  bag 인자 = STATE 또는 잠든 층 floors[].data (미니폼 프로토콜 6 은 잠든 층에도 스케치를 그린다)
//  순수 함수 부분(skPoint~skDetectFaces~skObb)은 node 에서도 돈다 (tests/minicad-3d.cjs 가 require)
// ============================================================================
const SK_TOL=2;        // 점 병합 허용 (mm)
const SK_MIN_EDGE=10;  // 이보다 짧은 선은 무시
const SK_MIN_FACE=100; // 이보다 작은 면적(mm²)은 면으로 안 침
const SK_COL={pt:'#F5F1EB',edge:'#E8D48B',face:'#D4FF3D',sel:'#E2725B',label:'#8A8A6A'};
let _skIdSeq=0;
function _skId(p){
  if(typeof makeId==='function') return makeId(p);
  return p+'_'+Date.now()+'_'+(++_skIdSeq);
}
function skBag(bag){return bag||(typeof STATE!=='undefined'?STATE:null);}
function skArrs(bag){
  const b=skBag(bag);
  if(!Array.isArray(b.sketchPts)) b.sketchPts=[];
  if(!Array.isArray(b.sketchEdges)) b.sketchEdges=[];
  if(!Array.isArray(b.sketchFaces)) b.sketchFaces=[];
  return b;
}
function skPtById(id,bag){return skArrs(bag).sketchPts.find(p=>p.id===id)||null;}
function skEdgeById(id,bag){return skArrs(bag).sketchEdges.find(e=>e.id===id)||null;}
function skFaceById(id,bag){return skArrs(bag).sketchFaces.find(f=>f.id===id)||null;}
function skEdgePts(e,bag){const a=skPtById(e.a,bag),b=skPtById(e.b,bag);return (a&&b)?{a,b}:null;}
function skEdgeLen(e,bag){const p=skEdgePts(e,bag);return p?Math.hypot(p.b.x-p.a.x,p.b.y-p.a.y):0;}
function skFacePoly(f,bag){return (f.pts||[]).map(id=>skPtById(id,bag)).filter(Boolean).map(p=>({x:p.x,y:p.y}));}
function skPolyArea(poly){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.y-q.x*p.y;}return a/2;}
function skFaceArea(f,bag){return Math.abs(skPolyArea(skFacePoly(f,bag)));}
function skFacePerimeter(f,bag){const poly=skFacePoly(f,bag);let L=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];L+=Math.hypot(q.x-p.x,q.y-p.y);}return L;}
function skPolyCentroid(poly){
  let a=0,cx=0,cy=0;
  for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];const c=p.x*q.y-q.x*p.y;a+=c;cx+=(p.x+q.x)*c;cy+=(p.y+q.y)*c;}
  if(Math.abs(a)<1e-9){const n=poly.length||1;return {x:poly.reduce((s,p)=>s+p.x,0)/n,y:poly.reduce((s,p)=>s+p.y,0)/n};}
  return {x:cx/(3*a),y:cy/(3*a)};
}
function skPtInPoly(pt,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    if(((yi>pt.y)!==(yj>pt.y))&&(pt.x<(xj-xi)*(pt.y-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
// ---------- 점 ----------
function skPoint(x,y,bag){
  const b=skArrs(bag);x=Math.round(x);y=Math.round(y);
  let best=null,bd=SK_TOL;
  b.sketchPts.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y);if(d<=bd){bd=d;best=p;}});
  if(best) return best;
  const p={id:_skId('skp'),x,y};b.sketchPts.push(p);return p;
}
// 점 p 가 선분 ab 의 안쪽(끝점 제외)에 있는가
function _skOnSeg(p,a,b,tol){
  const dx=b.x-a.x,dy=b.y-a.y,L2=dx*dx+dy*dy; if(L2<1) return false;
  const t=((p.x-a.x)*dx+(p.y-a.y)*dy)/L2; if(t<=1e-6||t>=1-1e-6) return false;
  return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y)<=tol;
}
// 두 선분의 안쪽 교차점 (끝점 접촉·평행 제외) — 없으면 null
function _skSegX(a,b,c,d){
  const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y;
  const den=rx*sy-ry*sx; if(Math.abs(den)<1e-9) return null;
  const qx=c.x-a.x,qy=c.y-a.y;
  const t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den,E=1e-6;
  if(t<=E||t>=1-E||u<=E||u>=1-E) return null;
  return {x:Math.round(a.x+rx*t),y:Math.round(a.y+ry*t)};
}
function _skSplitEdgeAt(e,p,bag){
  const b=skArrs(bag);const i=b.sketchEdges.indexOf(e); if(i<0) return;
  b.sketchEdges.splice(i,1);
  if(p.id!==e.a) b.sketchEdges.push({id:_skId('ske'),a:e.a,b:p.id});
  if(p.id!==e.b) b.sketchEdges.push({id:_skId('ske'),a:p.id,b:e.b});
}
function _skFindEdge(pId,qId,bag){return skArrs(bag).sketchEdges.find(e=>(e.a===pId&&e.b===qId)||(e.a===qId&&e.b===pId))||null;}
// ---------- 선 ----------
// 선 하나 추가 → 평면 그래프 유지 → 면 재검출. 만들어진(또는 이미 있던) 조각 선 배열 반환
function skAddEdge(x1,y1,x2,y2,bag){
  const b=skArrs(bag);
  x1=Math.round(x1);y1=Math.round(y1);x2=Math.round(x2);y2=Math.round(y2);
  if(Math.hypot(x2-x1,y2-y1)<SK_MIN_EDGE) return [];
  const A=skPoint(x1,y1,b),B=skPoint(x2,y2,b);
  if(A===B) return [];
  // 1) 새 끝점이 기존 선 안쪽에 놓이면 그 선을 나눈다 (T 접합)
  [A,B].forEach(P=>{
    b.sketchEdges.slice().forEach(e=>{
      if(e.a===P.id||e.b===P.id) return;
      const q=skEdgePts(e,b); if(q&&_skOnSeg(P,q.a,q.b,SK_TOL)) _skSplitEdgeAt(e,P,b);
    });
  });
  // 2) 새 선분과 기존 선의 X 교차 → 교차점 생성, 기존 선을 그 점에서 나눔
  const cuts=[];
  b.sketchEdges.slice().forEach(e=>{
    const q=skEdgePts(e,b); if(!q) return;
    const X=_skSegX(A,B,q.a,q.b); if(!X) return;
    const P=skPoint(X.x,X.y,b);
    if(P!==q.a&&P!==q.b) _skSplitEdgeAt(e,P,b);
    if(P!==A&&P!==B&&!cuts.includes(P)) cuts.push(P);
  });
  // 3) 새 선분 안쪽에 있는 기존 점들에서도 나눈다 (공선 겹침 포함)
  b.sketchPts.forEach(P=>{ if(P!==A&&P!==B&&!cuts.includes(P)&&_skOnSeg(P,A,B,SK_TOL)) cuts.push(P); });
  cuts.sort((p,q)=>Math.hypot(p.x-A.x,p.y-A.y)-Math.hypot(q.x-A.x,q.y-A.y));
  // 4) 조각 순서대로 추가 (이미 있는 조각은 재사용)
  const chain=[A,...cuts,B],made=[];
  for(let i=0;i<chain.length-1;i++){
    const p=chain[i],q=chain[i+1]; if(p===q) continue;
    let ex=_skFindEdge(p.id,q.id,b);
    if(!ex){ex={id:_skId('ske'),a:p.id,b:q.id};b.sketchEdges.push(ex);}
    made.push(ex);
  }
  skDetectFaces(b);
  return made;
}
function skAddPoly(pts,bag){
  const b=skArrs(bag);
  if(!pts||pts.length<3) return null;
  for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];skAddEdge(p.x,p.y,q.x,q.y,b);}
  const c=skPolyCentroid(pts);
  return skFaceAt(c.x,c.y,b);
}
function skAddRect(x1,y1,x2,y2,bag){
  const minX=Math.min(x1,x2),maxX=Math.max(x1,x2),minY=Math.min(y1,y2),maxY=Math.max(y1,y2);
  if(maxX-minX<SK_MIN_EDGE||maxY-minY<SK_MIN_EDGE) return null;
  return skAddPoly([{x:minX,y:minY},{x:maxX,y:minY},{x:maxX,y:maxY},{x:minX,y:maxY}],bag);
}
function skCirclePoly(cx,cy,r,n){
  n=Math.max(3,Math.min(96,Math.round(n||32)));
  const pts=[];for(let i=0;i<n;i++){const t=i/n*Math.PI*2;pts.push({x:Math.round(cx+r*Math.cos(t)),y:Math.round(cy+r*Math.sin(t))});}
  return pts;
}
function skAddCircle(cx,cy,r,n,bag){
  if(!(r>=SK_MIN_EDGE)) return null;
  return skAddPoly(skCirclePoly(cx,cy,r,n),bag);
}
// ---------- 면 검출 (평면 그래프 최소 고리) ----------
// 규칙: 방향 선 (u→v) 마다 v 에서 "되돌아가는 방향(u) 다음 반시계 이웃" 으로 계속 돈다 → 가장 오른쪽 회전.
//       그러면 안쪽 면은 신발끈 넓이가 음수, 바깥 고리는 양수 → 음수만 면으로 채택.
function skDetectFaces(bag){
  const b=skArrs(bag);
  const pts=new Map(b.sketchPts.map(p=>[p.id,p]));
  b.sketchEdges=b.sketchEdges.filter(e=>pts.has(e.a)&&pts.has(e.b)&&e.a!==e.b);
  // 같은 점 쌍 중복 제거
  {const seen=new Set();b.sketchEdges=b.sketchEdges.filter(e=>{const k=e.a<e.b?e.a+'|'+e.b:e.b+'|'+e.a;if(seen.has(k))return false;seen.add(k);return true;});}
  const adj=new Map();
  const add=(u,v)=>{if(!adj.has(u))adj.set(u,[]);const l=adj.get(u);if(!l.includes(v))l.push(v);};
  b.sketchEdges.forEach(e=>{add(e.a,e.b);add(e.b,e.a);});
  adj.forEach((nb,u)=>{const P=pts.get(u);nb.sort((v,w)=>Math.atan2(pts.get(v).y-P.y,pts.get(v).x-P.x)-Math.atan2(pts.get(w).y-P.y,pts.get(w).x-P.x));});
  const used=new Set(),cycles=[];
  b.sketchEdges.forEach(e=>{
    [[e.a,e.b],[e.b,e.a]].forEach(([s0,s1])=>{
      if(used.has(s0+'>'+s1)) return;
      let u=s0,v=s1;const cyc=[];let guard=0,closed=false;
      while(guard++<20000){
        const k=u+'>'+v; if(used.has(k)) break;
        used.add(k);cyc.push(u);
        const nb=adj.get(v);const i=nb.indexOf(u);const w=nb[(i+1)%nb.length];
        u=v;v=w;
        if(u===s0&&v===s1){closed=true;break;}
      }
      if(closed) cycles.push(cyc);
    });
  });
  const oldByKey=new Map(b.sketchFaces.map(f=>[(f.pts||[]).slice().sort().join('|'),f]));
  const faces=[],keys=new Set();
  cycles.forEach(cyc=>{
    // 막다른 가지(u,v,u) 제거
    let changed=true;
    while(changed&&cyc.length>=3){
      changed=false;
      for(let i=0;i<cyc.length;i++){
        const p=cyc[(i+cyc.length-1)%cyc.length],n=cyc[(i+1)%cyc.length];
        if(p===n){const j=(i+1)%cyc.length;[i,j].sort((a,c)=>c-a).forEach(k=>cyc.splice(k,1));changed=true;break;}
      }
    }
    if(cyc.length<3) return;
    const poly=cyc.map(id=>pts.get(id));
    const area=skPolyArea(poly);
    if(area>-SK_MIN_FACE) return; // 양수 = 바깥 고리, 0 근처 = 퇴화
    const key=cyc.slice().sort().join('|');
    if(keys.has(key)) return; keys.add(key);
    const old=oldByKey.get(key);
    faces.push(old?Object.assign(old,{pts:cyc}):{id:_skId('skf'),pts:cyc});
  });
  b.sketchFaces=faces;
  return faces;
}
function skFaceAt(x,y,bag){
  const b=skArrs(bag);let best=null,ba=Infinity;
  b.sketchFaces.forEach(f=>{const poly=skFacePoly(f,b);if(poly.length<3)return;if(skPtInPoly({x,y},poly)){const a=Math.abs(skPolyArea(poly));if(a<ba){ba=a;best=f;}}});
  return best;
}
// ---------- 삭제 ----------
function _skDropOrphans(bag){
  const b=skArrs(bag);const usedP=new Set();b.sketchEdges.forEach(e=>{usedP.add(e.a);usedP.add(e.b);});
  b.sketchPts=b.sketchPts.filter(p=>usedP.has(p.id));
}
function skRemoveEdge(id,bag){
  const b=skArrs(bag);const n=b.sketchEdges.length;
  b.sketchEdges=b.sketchEdges.filter(e=>e.id!==id);
  if(b.sketchEdges.length===n) return false;
  _skDropOrphans(b);skDetectFaces(b);return true;
}
function skRemovePoint(id,bag){
  const b=skArrs(bag);const n=b.sketchPts.length;
  b.sketchPts=b.sketchPts.filter(p=>p.id!==id);
  if(b.sketchPts.length===n) return false;
  b.sketchEdges=b.sketchEdges.filter(e=>e.a!==id&&e.b!==id);
  _skDropOrphans(b);skDetectFaces(b);return true;
}
// 면 삭제 = 다른 면과 공유하지 않는 둘레 선만 제거 (스케치업 Erase face 는 선을 남기지만 여기선 선까지 정리)
function skRemoveFace(id,bag){
  const b=skArrs(bag);const f=skFaceById(id,b); if(!f) return false;
  const mine=new Set(),others=new Set();
  const edgesOf=(face,set)=>{const n=face.pts.length;for(let i=0;i<n;i++){const e=_skFindEdge(face.pts[i],face.pts[(i+1)%n],b);if(e)set.add(e.id);}};
  edgesOf(f,mine);
  b.sketchFaces.forEach(g=>{if(g!==f)edgesOf(g,others);});
  b.sketchEdges=b.sketchEdges.filter(e=>!(mine.has(e.id)&&!others.has(e.id)));
  b.sketchFaces=b.sketchFaces.filter(g=>g!==f);
  _skDropOrphans(b);skDetectFaces(b);return true;
}
// 면이 객체가 될 때: 그 면만 쓰던 선·점을 지운다 (공유 선은 남긴다)
function _skConsumeFace(f,bag){skRemoveFace(f.id,bag);}
function skRemove(kind,id,bag){
  if(kind==='sketchFaces') return skRemoveFace(id,bag);
  if(kind==='sketchEdges') return skRemoveEdge(id,bag);
  if(kind==='sketchPts') return skRemovePoint(id,bag);
  return false;
}
function skClear(bag){const b=skArrs(bag);const n=b.sketchPts.length+b.sketchEdges.length+b.sketchFaces.length;b.sketchPts=[];b.sketchEdges=[];b.sketchFaces=[];return n;}
function skCount(bag){const b=skArrs(bag);return {pts:b.sketchPts.length,edges:b.sketchEdges.length,faces:b.sketchFaces.length};}
// ---------- 최소 면적 외접 사각형 (벽 자동 판정·벽 중심선) ----------
function skObb(poly){
  let best=null;
  for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length];
    const ang=Math.atan2(q.y-p.y,q.x-p.x);
    const c=Math.cos(-ang),s=Math.sin(-ang);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    poly.forEach(r=>{const x=r.x*c-r.y*s,y=r.x*s+r.y*c;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;});
    const w=maxX-minX,h=maxY-minY,area=w*h;
    if(!best||area<best.area){
      const mx=(minX+maxX)/2,my=(minY+maxY)/2;
      const cx=mx*Math.cos(ang)-my*Math.sin(ang),cy=mx*Math.sin(ang)+my*Math.cos(ang);
      best=w>=h?{area,cx,cy,angle:ang,len:w,wid:h}:{area,cx,cy,angle:ang+Math.PI/2,len:h,wid:w};
    }
  }
  return best;
}
// 면 → 객체 종류 자동: 가늘고 길면 벽, 아니면 공간
function skGuessKind(f,bag){
  const poly=skFacePoly(f,bag);if(poly.length<3) return 'space';
  const o=skObb(poly);
  return (o.wid<=450&&o.len/Math.max(o.wid,1)>=2.5)?'wall':'space';
}
// ---------- 면 + Z → 객체 (활성 층 전용) ----------
// as: 'solid'(기본, 자유 매스 — 스케치업 밀기끌기와 동일) | 'space'(공간+둘레 벽, 천장고=z) | 'wall'(벽, 높이=z) | 'auto'(가늘고 길면 벽, 아니면 공간)
function skExtrude(faceId,z,as,bag){
  const b=skArrs(bag);
  if(b!==STATE) return null;
  const f=skFaceById(faceId,b); if(!f) return null;
  z=Math.round(Number(z)); if(!isFinite(z)||z<10) return null;
  const poly=skFacePoly(f,b); if(poly.length<3) return null;
  as=as||'solid';
  const seq0=STATE.histSeq||0;
  const bak=JSON.stringify([b.sketchPts,b.sketchEdges,b.sketchFaces]);
  _skConsumeFace(f,b);
  let made=null;
  if(as==='solid'){
    const m=massFromPoly(poly,z,b);made={kind:'masses',id:m.id};
    saveHistory();selectObj('masses',m.id);
  }else{
    made=_skSolidify(poly,z,as);
    if(!made){const r=JSON.parse(bak);b.sketchPts=r[0];b.sketchEdges=r[1];b.sketchFaces=r[2];return null;}
    saveHistory();
    if(typeof _histMergeTail==='function'){const n=(STATE.histSeq||0)-seq0;if(n>1)_histMergeTail(n);}
  }
  renderAll();refreshUI();
  return made;
}
// ---------- 2D 렌더 (Konva) ----------
function renderSketch(){
  if(typeof groups==='undefined'||!groups.sketch) return;
  const g=groups.sketch;g.destroyChildren();
  const P=p=>({x:STATE.offsetX+mmToPx(p.x),y:STATE.offsetY+mmToPx(p.y)});
  const selIs=(k,id)=>(STATE.selectedKind===k&&STATE.selectedId===id)||(STATE.boxSelection||[]).some(t=>t.kind===k&&t.id===id);
  const onClick=(shape,kind,id)=>shape.on('click tap',e=>{
    if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0) return;
    if(STATE.selectedTool!=='select') return;
    e.cancelBubble=true;selectObj(kind,id);
  });
  (STATE.sketchFaces||[]).forEach(f=>{
    const poly=skFacePoly(f);if(poly.length<3) return;
    const sel=selIs('sketchFaces',f.id);
    const shape=new Konva.Line({points:poly.flatMap(p=>{const q=P(p);return [q.x,q.y];}),closed:true,
      fill:sel?'rgba(226,114,91,0.35)':'rgba(212,255,61,0.20)',stroke:sel?SK_COL.sel:SK_COL.face,strokeWidth:sel?2:1,dash:[5,3]});
    onClick(shape,'sketchFaces',f.id);g.add(shape);
    const c=P(skPolyCentroid(poly));
    const t=new Konva.Text({x:c.x,y:c.y,text:'면 '+(skFaceArea(f)/1e6).toFixed(2)+'㎡\nZ 입력 → 객체',fontSize:11,fill:sel?SK_COL.sel:SK_COL.label,align:'center',listening:false});
    t.offsetX(t.width()/2);t.offsetY(t.height()/2);g.add(t);
  });
  (STATE.sketchEdges||[]).forEach(e=>{
    const q=skEdgePts(e);if(!q) return;
    const a=P(q.a),b=P(q.b),sel=selIs('sketchEdges',e.id);
    const ln=new Konva.Line({points:[a.x,a.y,b.x,b.y],stroke:sel?SK_COL.sel:SK_COL.edge,strokeWidth:sel?3:1.5,hitStrokeWidth:12});
    onClick(ln,'sketchEdges',e.id);g.add(ln);
    if(sel){
      const t=new Konva.Text({x:(a.x+b.x)/2,y:(a.y+b.y)/2-14,text:Math.round(skEdgeLen(e))+'mm',fontSize:11,fill:SK_COL.sel,listening:false});
      t.offsetX(t.width()/2);g.add(t);
    }
  });
  (STATE.sketchPts||[]).forEach(p=>{
    const q=P(p),sel=selIs('sketchPts',p.id);
    const c=new Konva.Circle({x:q.x,y:q.y,radius:sel?4.5:2.5,fill:sel?SK_COL.sel:SK_COL.pt,stroke:'#6B6B55',strokeWidth:1,hitStrokeWidth:10});
    onClick(c,'sketchPts',p.id);g.add(c);
  });
}
// ---------- 자유 매스 (면 + Z 의 기본 결과 — 스케치업 솔리드) ----------
// {id,name,x,y,angle(도),pts(x,y 기준 상대 좌표),h_mm,elev_mm,color,locked}
const MASS_COLOR='#B9C6D2';
function massAbsPoly(m){
  const a=(m.angle||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return (m.pts||[]).map(p=>({x:Math.round(m.x+p.x*c-p.y*s),y:Math.round(m.y+p.x*s+p.y*c)}));
}
function massArea(m){return Math.abs(skPolyArea(massAbsPoly(m)));}
function massFromPoly(poly,z,bag){
  const b=skBag(bag);if(!Array.isArray(b.masses)) b.masses=[];
  // 2026-09-07: 감김을 여기서 한 번 바로잡아 둔다 (아래로 갈수록 고치기 어렵다)
  if(skPolyArea(poly)<0) poly=poly.slice().reverse();
  const c=skPolyCentroid(poly);
  const m={id:_skId('ms'),name:'매스'+(b.masses.length+1),x:Math.round(c.x),y:Math.round(c.y),angle:0,
    pts:poly.map(p=>({x:Math.round(p.x-c.x),y:Math.round(p.y-c.y)})),h_mm:Math.round(z),elev_mm:0,color:MASS_COLOR,locked:false};
  b.masses.push(m);return m;
}
// 면 폴리곤 + Z → 공간(둘레 벽 천장고=z) 또는 벽(높이=z). 활성 층 전용. 반환 {kind,id}|null
function _skSolidify(poly,z,as){
  const o=skObb(poly);
  if(as==='auto') as=(o.wid<=450&&o.len/Math.max(o.wid,1)>=2.5)?'wall':'space';
  if(as==='wall'){
    if(o.len<100) return null;
    const t=Math.max(30,Math.min(600,Math.round(o.wid)));
    const ux=Math.cos(o.angle),uy=Math.sin(o.angle),h=o.len/2;
    const n0=STATE.walls.length;
    addWall(o.cx-ux*h,o.cy-uy*h,o.cx+ux*h,o.cy+uy*h,{thickness:t});
    const w=STATE.walls[STATE.walls.length-1];
    if(STATE.walls.length>n0&&w){w.height_mm=z;return {kind:'wall',id:w.id};}
    return null;
  }
  if(Math.abs(skPolyArea(poly))<300*300) return null;
  const n0=STATE.spaces.length;
  addSpace(poly);
  const s=STATE.spaces[STATE.spaces.length-1];
  if(STATE.spaces.length>n0&&s){
    s.ceilingHeight_mm=z;
    STATE.walls.forEach(w=>{if(w.spaceId===s.id) w.height_mm=z;});
    return {kind:'space',id:s.id};
  }
  return null;
}
// 매스 → 공간/벽 변환 (활성 층)
function massConvert(id,as){
  const i=(STATE.masses||[]).findIndex(m=>m.id===id);if(i<0) return null;
  const m=STATE.masses[i];const poly=massAbsPoly(m);if(poly.length<3) return null;
  const seq0=STATE.histSeq||0;
  STATE.masses.splice(i,1);
  const made=_skSolidify(poly,m.h_mm||2400,as||'auto');
  if(!made){STATE.masses.splice(i,0,m);return null;}
  saveHistory();
  if(typeof _histMergeTail==='function'){const n=(STATE.histSeq||0)-seq0;if(n>1)_histMergeTail(n);}
  renderAll();refreshUI();
  return made;
}
function renderMasses(){
  if(typeof groups==='undefined'||!groups.masses) return;
  const g=groups.masses;g.destroyChildren();
  const P=p=>({x:STATE.offsetX+mmToPx(p.x),y:STATE.offsetY+mmToPx(p.y)});
  (STATE.masses||[]).forEach(m=>{
    const poly=massAbsPoly(m);if(poly.length<3) return;
    const sel=(STATE.selectedKind==='masses'&&STATE.selectedId===m.id)||(STATE.boxSelection||[]).some(t=>t.kind==='masses'&&t.id===m.id);
    const shape=new Konva.Line({points:poly.flatMap(p=>{const q=P(p);return [q.x,q.y];}),closed:true,
      fill:sel?'rgba(226,114,91,0.45)':'rgba(185,198,210,0.55)',stroke:sel?SK_COL.sel:'#5E6B78',strokeWidth:sel?2.5:1.5});
    shape.on('click tap',e=>{
      if(e.evt&&e.evt.button!==undefined&&e.evt.button!==0) return;
      if(STATE.selectedTool!=='select') return;
      e.cancelBubble=true;selectObj('masses',m.id);
    });
    g.add(shape);
    const c=P(skPolyCentroid(poly));
    const ctx=massCtx();
    const flat=massIsPrism(m);
    const top=massTopPts(m,ctx);
    let head=(m.name||'매스');
    if(flat) head+='\nH '+(m.h_mm||0)+(m.elev_mm?' ↑'+m.elev_mm:'');
    else{
      const zs=top.map(p=>p.z), lo=Math.min(...zs), hi=Math.max(...zs);
      const mt=Math.max(0,...massSlopes(m,ctx).map(f=>f.tilt));
      head+='\nH '+lo+'~'+hi+(mt?(' ∠'+Math.round(mt*10)/10+'°'):'')+(m.elev_mm?' ↑'+m.elev_mm:'');
    }
    const t=new Konva.Text({x:c.x,y:c.y,text:head,fontSize:11,fill:sel?SK_COL.sel:'#3E4750',align:'center',listening:false});
    t.offsetX(t.width()/2);t.offsetY(t.height()/2);g.add(t);
    if(!flat) renderMassZ(g,m,ctx,top,P,sel);   // 2026-09-07 Z축: 평면도의 높이 표기
  });
}

// 평면도의 높이 표기 (2026-09-07 Z축 3층) — 지붕 평면도가 백 년째 쓰는 관례 그대로.
//  ① 꼭짓점마다 높이 숫자 (천장고에 매달린 값은 CH-300 처럼 · 금색)
//  ② 경사면 가운데에 '내림 방향' 화살표 + 물매 4/10
//  ③ 마루는 굵은 실선 · 골(밸리)은 파선
//  각기둥에는 아무것도 그리지 않는다 — 높이가 하나뿐이라 표기가 잡음이 된다.
function renderMassZ(g,m,ctx,top,P,sel){
  const Z_COL='#2F6193', Z_REF='#8A6B33';
  // 화면에서 너무 작으면 숫자·화살표는 접는다 — 줌아웃하면 글자만 뭉쳐 도면을 덮는다.
  //  마루·골선은 형상이라 크기와 무관하게 늘 그린다.
  const sp=top.map(p=>P({x:p.ax,y:p.ay}));
  const w=Math.max(...sp.map(q=>q.x))-Math.min(...sp.map(q=>q.x));
  const h=Math.max(...sp.map(q=>q.y))-Math.min(...sp.map(q=>q.y));
  const roomy=Math.min(w,h)>=52;
  massRidges(m,ctx).forEach(e=>{
    if(e.kind==='fold') return;                       // 접힘일 뿐인 모서리는 도면을 어지럽힌다
    const a=P({x:e.ax,y:e.ay}), b=P({x:e.bx,y:e.by});
    g.add(new Konva.Line({points:[a.x,a.y,b.x,b.y],listening:false,
      stroke:e.kind==='ridge'?'#3E4750':Z_COL,strokeWidth:e.kind==='ridge'?2.2:1.4,
      dash:e.kind==='valley'?[7,4]:undefined}));
  });
  if(!roomy) return;
  massSlopes(m,ctx).forEach(f=>{
    const o=P({x:f.ax,y:f.ay});
    const L=26, hx=f.dx*L, hy=f.dy*L;                 // 화면 길이로 그린다 (줌과 무관하게 읽히도록)
    g.add(new Konva.Arrow({points:[o.x-hx,o.y-hy,o.x+hx,o.y+hy],listening:false,
      stroke:Z_COL,fill:Z_COL,strokeWidth:1.4,pointerLength:7,pointerWidth:6,opacity:0.85}));
    const lb=new Konva.Text({x:o.x+hx,y:o.y+hy,text:f.pitch+'/10',fontSize:10,fill:Z_COL,listening:false});
    lb.offsetX(lb.width()/2); lb.offsetY(-4); g.add(lb);
  });
  const cq=P(skPolyCentroid(massAbsPoly(m)));
  top.forEach(p=>{
    const q=P({x:p.ax,y:p.ay});
    const dx=q.x-cq.x, dy=q.y-cq.y, L=Math.hypot(dx,dy)||1;   // 바깥으로 조금 밀어 도형과 겹치지 않게
    const lb=new Konva.Text({x:q.x+dx/L*12,y:q.y+dy/L*12,text:p.label,fontSize:10,
      fill:p.ref?Z_REF:(sel?SK_COL.sel:Z_COL),fontStyle:p.ref?'bold':'normal',listening:false});
    lb.offsetX(lb.width()/2); lb.offsetY(lb.height()/2); g.add(lb);
  });
}

// ============================================================================
// 2026-09-07 대표 지시: "나는 z 값을 원한다. 높이를 주고 그 값들이 자유롭게
//   변경될 수 있도록, 호환이 되도록."
//
//  ── 무엇을 만드는가 ────────────────────────────────────────────────────────
//  스케치업은 자유롭지만 뜻이 없다 — 상자는 그냥 상자라 도배 ㎡ 가 안 나온다.
//  BIM 은 뜻이 있지만 자유롭지 않다 — 정해진 부재만 조립한다.
//  여기서는 둘 다 한다: 꼭짓점마다 높이를 자유롭게 주되, 그 높이가
//  ① 언제든 다시 바꿀 수 있는 살아 있는 값이고
//  ② 면이 스스로 무엇인지(바닥·천장·벽·경사) 알아 물량으로 바로 이어진다.
//
//  ── 살아 있는 높이 (zval) ──────────────────────────────────────────────────
//   2400              그냥 숫자
//   {r:'ch'}          이 층 천장고를 따라간다  — 천장고를 고치면 같이 움직인다
//   {r:'ch',o:-300}   천장고에서 300 내려온 자리 (우물천장 턱)
//   {r:'fh',o:0}      층 높이
//  스케치업은 밀고 나면 숫자가 사라진다. 여기서는 남아서 계속 편집된다.
//
//  ── 호환 (핵심) ───────────────────────────────────────────────────────────
//  매스는 수직 각기둥인 동안에는 옛 형식({pts,h_mm}) 그대로 저장한다.
//  꼭짓점 높이가 서로 달라지는 순간에만 다면체({solidVerts,solidFaces})로 승격한다.
//  · 옛 도면 → 그대로 열린다 (승격은 읽을 때 메모리에서만)
//  · 각기둥만 쓰는 새 도면 → 저장 바이트가 종전과 같다
//  · 진짜 3D 를 쓴 매스만 새 필드를 지닌다
//  massSolid() 는 어느 쪽이든 언제나 완전한 다면체를 돌려준다.
// ============================================================================
// 6° 안이면 평평한 것으로, 6° 안으로 서 있으면 벽으로 본다. 그 사이가 경사.
//  (빗천장은 보통 10~30°, 박공은 30~45° — 전부 'slope' 로 잡혀야 도면에서 구분된다)
const Z_UP_COS=0.9945;   // cos 6°
const Z_FLAT_COS=0.1045; // cos 84°
const Z_REF_NAMES={ch:'천장고',fh:'층 높이',fl:'층 바닥'};

function zIsRef(z){ return !!z&&typeof z==='object'&&typeof z.r==='string'; }
// 살아 있는 높이를 실제 숫자로. ctx = {ch,fh,fl} (없으면 안전한 기본값)
function zNum(z,ctx){
  if(zIsRef(z)){
    const c=ctx||{};
    const base=(z.r==='ch')?(c.ch!=null?c.ch:2400)
              :(z.r==='fh')?(c.fh!=null?c.fh:2800)
              :(z.r==='fl')?(c.fl!=null?c.fl:0):0;
    return Math.round(base+(z.o||0));
  }
  const n=Math.round(Number(z));
  return isFinite(n)?n:0;
}
// 사람이 새 숫자를 넣었을 때 — 참조였으면 참조를 지키고 오프셋만 고친다
function zSet(cur,val,ctx){
  const v=Math.round(Number(val));
  if(!isFinite(v)) return cur;
  if(zIsRef(cur)){
    const base=zNum({r:cur.r,o:0},ctx);
    return {r:cur.r,o:v-base};
  }
  return v;
}
function zLabel(z,ctx){
  if(!zIsRef(z)) return String(zNum(z,ctx));
  const nm=Z_REF_NAMES[z.r]||z.r;
  const o=z.o||0;
  return nm+(o?(o>0?(' +'+o):(' '+o)):'')+' = '+zNum(z,ctx);
}

// ---------- 면의 법선·역할·실면적 (3D) ----------
// 칸에 넣고 그대로 되돌려 읽을 수 있는 짧은 표기 (CH-300 · 2400).
//  zLabel 은 '천장고 -300 = 2100' 처럼 사람에게 읽히는 말이라 상태줄용이고,
//  입력 칸에 그 말을 넣으면 엔터를 치는 순간 못 알아듣는다 — 실제로 그랬다.
const Z_REF_SHORT={ch:'CH',fh:'FH',fl:'FL'};
function zEdit(z,ctx){
  if(!zIsRef(z)) return String(zNum(z,ctx));
  const o=z.o||0;
  return (Z_REF_SHORT[z.r]||String(z.r).toUpperCase())+(o?((o>0?'+':'')+o):'');
}
function faceNormal(verts,vs){
  // 뉴엘 방법 — 볼록하지 않은 면에서도 옳은 법선이 나온다
  let nx=0,ny=0,nz=0;
  for(let i=0;i<vs.length;i++){
    const a=verts[vs[i]],b=verts[vs[(i+1)%vs.length]];
    if(!a||!b) return {x:0,y:0,z:1};
    nx+=(a.y-b.y)*(a.z+b.z);
    ny+=(a.z-b.z)*(a.x+b.x);
    nz+=(a.x-b.x)*(a.y+b.y);
  }
  const L=Math.hypot(nx,ny,nz)||1;
  return {x:nx/L,y:ny/L,z:nz/L};
}
// 면이 스스로 무엇인지 안다 — 이 한 줄이 자유 형상을 물량으로 잇는다
function faceRole(n){
  if(n.z>=Z_UP_COS) return 'ceil';      // 위를 본다 = 천장(또는 지붕)
  if(n.z<=-Z_UP_COS) return 'floor';    // 아래를 본다 = 바닥
  if(Math.abs(n.z)<=Z_FLAT_COS) return 'wall';
  return 'slope';                        // 빗천장·박공
}
// 경사면이 위를 보는가 아래를 보는가 — 위면 천장 마감, 아래면 처마 밑
function faceFacing(n){ return n.z>0?'up':'down'; }
// 수평에서 몇 도 기울었나 (도면 표기·물매 계산)
function faceTiltDeg(n){
  const d=Math.acos(Math.min(1,Math.abs(n.z)))*180/Math.PI;
  return Math.round(d*10)/10;
}
// 실면적 (경사면은 눕힌 면적이 아니라 비탈을 따라간 진짜 면적)
function faceArea3(verts,vs){
  let ax=0,ay=0,az=0;
  for(let i=0;i<vs.length;i++){
    const a=verts[vs[i]],b=verts[vs[(i+1)%vs.length]];
    if(!a||!b) return 0;
    ax+=a.y*b.z-a.z*b.y; ay+=a.z*b.x-a.x*b.z; az+=a.x*b.y-a.y*b.x;
  }
  return Math.hypot(ax,ay,az)/2;
}
function faceCentroid3(verts,vs){
  let x=0,y=0,z=0,n=0;
  vs.forEach(i=>{const v=verts[i];if(v){x+=v.x;y+=v.y;z+=v.z;n++;}});
  return n?{x:x/n,y:y/n,z:z/n}:{x:0,y:0,z:0};
}

// ---------- 매스 = 자유 다면체 ----------
// 아직 수직 각기둥인가 — 그렇다면 저장은 옛 형식 그대로
function massIsPrism(m){
  return !!m&&!Array.isArray(m.solidVerts);
}
// 어느 형식이든 완전한 다면체로 펼친다. {verts:[{x,y,z}], faces:[{vs,role,mat}]}
//  verts 는 매스 로컬 좌표(x,y 는 중심 기준·z 는 바닥에서), elev_mm 은 놓이는 높이로 따로 둔다
function massSolid(m,ctx){
  if(!m) return {verts:[],faces:[]};
  if(Array.isArray(m.solidVerts)&&Array.isArray(m.solidFaces)){
    const verts=m.solidVerts.map(v=>({x:v.x,y:v.y,z:zNum(v.z,ctx)}));
    // 2026-09-07: 접힘은 '지금 높이' 로 그때그때 나눈다. 나눈 결과를 저장하면
    //  다음 편집이 잘못 잘린 조각 위에서 돌아 지붕이 엉킨다(박공에서 실제로 그랬다).
    //  사람이 만든 면(6각 윗면)은 그대로 두고, 보여 줄 때만 평평한 조각으로 편다.
    const flat=[];
    m.solidFaces.forEach(f=>{
      splitFoldedRing(verts,f.vs,0).forEach(r=>{
        if(r&&r.length>=3) flat.push({vs:r,mat:f.mat||null,roleFix:f.roleFix||null,src:f});
      });
    });
    const faces=flat.map(f=>{
      const n=faceNormal(verts,f.vs);
      // 갈래는 늘 지금 형상에서 다시 잰다. 저장된 값을 믿으면 면을 기울여도
      //  '천장' 인 채로 굳는다 (실제로 그렇게 굳었다). 사람이 일부러 못 박은
      //  경우(roleFix)만 그 값을 지킨다.
      const role=f.roleFix||faceRole(n);
      return {vs:f.vs.slice(),role,roleFix:f.roleFix||null,mat:f.mat||null,n,
        facing:faceFacing(n),tilt:faceTiltDeg(n)};
    });
    return _solidFlipIfInsideOut({verts,faces});
  }
  // 옛 형식 — 각기둥을 그 자리에서 만든다 (파일은 건드리지 않는다)
  const poly=(m.pts||[]);
  const h=zNum(m.h_mm,ctx);
  const N=poly.length;
  if(N<3) return {verts:[],faces:[]};
  const verts=[];
  poly.forEach(p=>verts.push({x:p.x,y:p.y,z:0}));
  poly.forEach(p=>verts.push({x:p.x,y:p.y,z:h}));
  const bot=[],top=[];
  for(let i=0;i<N;i++){bot.push(N-1-i);top.push(N+i);}   // 밑면은 뒤집어 아래를 보게
  const faces=[{vs:bot},{vs:top}];
  for(let i=0;i<N;i++){
    const j=(i+1)%N;
    faces.push({vs:[i,j,N+j,N+i]});
  }
  // 2026-09-07: 폴리곤을 반대로 감으면 법선이 통째로 뒤집혀 **바닥이 천장이 된다**.
  //  실제로 그랬다 — 매스 도구(skAddRect)가 만드는 감김이 음수라, 도구로 그린 매스는
  //  전부 안팎이 뒤집힌 채였다. 꼭짓점 순서는 그대로 두고 면의 감김만 돌린다
  //  (순서를 건드리면 밑면 i ↔ 윗면 N+i 규약이 깨져 massTryPrism 이 못 되돌린다).
  if(skPolyArea(poly)<0) faces.forEach(f=>f.vs.reverse());
  faces.forEach(f=>{const n=faceNormal(verts,f.vs);f.n=n;f.role=faceRole(n);f.mat=null;
    f.facing=faceFacing(n);f.tilt=faceTiltDeg(n);});
  return {verts,faces};
}
// 안팎이 뒤집힌 다면체 바로잡기 — 부피가 음수면 모든 면의 감김을 돌린다.
//  옛 파일(감김이 반대인 채 저장된 매스)도 열면 제대로 서게 하기 위한 것.
function _solidFlipIfInsideOut(S){
  let v=0;
  S.faces.forEach(f=>{
    const c=faceCentroid3(S.verts,f.vs), n=f.n||faceNormal(S.verts,f.vs);
    v+=(c.x*n.x+c.y*n.y+c.z*n.z)*faceArea3(S.verts,f.vs);
  });
  if(v>=0) return S;
  S.faces.forEach(f=>{
    f.vs.reverse();
    const n=faceNormal(S.verts,f.vs);
    f.n=n; f.role=f.roleFix||faceRole(n); f.facing=faceFacing(n); f.tilt=faceTiltDeg(n);
  });
  return S;
}
// 각기둥을 다면체로 승격 — 꼭짓점 높이를 따로 만지는 순간 한 번만 일어난다
function massToSolid(m,ctx){
  if(!m||!massIsPrism(m)) return m;
  const S=massSolid(m,ctx);
  const h=m.h_mm;   // 살아 있는 값이면 그대로 물려준다
  const N=(m.pts||[]).length;
  m.solidVerts=S.verts.map((v,i)=>({x:v.x,y:v.y,z:(i>=N)?h:0}));
  // 갈래는 저장하지 않는다 — 형상이 바뀌면 저절로 다시 잡혀야 하므로
  m.solidFaces=S.faces.map(f=>({vs:f.vs.slice(),mat:f.mat||null}));
  return m;
}
// 각기둥으로 되돌릴 수 있으면 되돌린다 (윗면 높이가 다시 다 같아졌을 때)
function massTryPrism(m,ctx){
  if(!m||massIsPrism(m)) return m;
  const N=(m.pts||[]).length;
  if(!N||m.solidVerts.length!==N*2) return m;
  for(let i=0;i<N;i++){
    const b=m.solidVerts[i],t=m.solidVerts[N+i];
    if(zNum(b.z,ctx)!==0) return m;
    if(b.x!==m.pts[i].x||b.y!==m.pts[i].y) return m;
    if(t.x!==m.pts[i].x||t.y!==m.pts[i].y) return m;
  }
  const z0=m.solidVerts[N].z;
  for(let i=1;i<N;i++){
    const z=m.solidVerts[N+i].z;
    if(zIsRef(z0)||zIsRef(z)){ if(JSON.stringify(z)!==JSON.stringify(z0)) return m; }
    else if(zNum(z,ctx)!==zNum(z0,ctx)) return m;
  }
  m.h_mm=z0;
  delete m.solidVerts;delete m.solidFaces;
  return m;
}
// ---------- 접힘 정리 (스케치업 Autofold 와 같은 일) ----------
//  꼭짓점 하나를 올리면 그 면이 더 이상 평평하지 않게 된다. 평평하지 않은 면은
//  법선이 뭉개져 갈래(천장/경사)도 면적도 거짓이 된다 — 박공을 세워 보고 실제로 그랬다.
//  그래서 접힌 면을 평평한 조각으로 나눈다. 나눈 뒤 같은 평면끼리는 다시 하나로 합쳐
//  삼각형 부스러기가 남지 않게 한다 (박공 지붕 = 사각 두 장).
const SK_PLANAR_TOL=1.5;   // 이보다 어긋나면 접힌 것으로 본다 (mm)

// 면이 평평한가 — 무게중심을 지나는 최적 평면에서 가장 멀리 벗어난 거리
function facePlanarDev(verts,vs){
  if(vs.length<4) return 0;
  const n=faceNormal(verts,vs), c=faceCentroid3(verts,vs);
  let d=0;
  vs.forEach(i=>{
    const v=verts[i]; if(!v) return;
    d=Math.max(d,Math.abs((v.x-c.x)*n.x+(v.y-c.y)*n.y+(v.z-c.z)*n.z));
  });
  return d;
}
function _nKey(n){
  const r=v=>Math.round(v*1000)/1000;
  return r(n.x)+','+r(n.y)+','+r(n.z);
}
// 삼각형 부채꼴 — 삼각형은 언제나 평평하다
function _fanTris(vs){
  const out=[];
  for(let i=1;i<vs.length-1;i++) out.push([vs[0],vs[i],vs[i+1]]);
  return out;
}
// 같은 평면 위 조각들의 바깥 테두리를 한 고리로 — 속에서 맞닿은 변은 사라진다
function _mergeCoplanar(tris){
  const cnt=new Map(), dir=new Map();
  tris.forEach(t=>{
    for(let i=0;i<3;i++){
      const a=t[i],b=t[(i+1)%3];
      const k=a<b?(a+'_'+b):(b+'_'+a);
      cnt.set(k,(cnt.get(k)||0)+1);
      if(!dir.has(k)) dir.set(k,[a,b]);
    }
  });
  const next=new Map();
  cnt.forEach((c,k)=>{ if(c===1){const [a,b]=dir.get(k); next.set(a,b);} });
  if(!next.size) return null;
  const start=next.keys().next().value;
  const ring=[start];
  let cur=next.get(start), guard=0;
  while(cur!==undefined&&cur!==start&&guard++<512){ ring.push(cur); cur=next.get(cur); }
  if(cur!==start||ring.length<3||ring.length!==next.size) return null;  // 구멍이 있거나 끊겼다
  return ring;
}
// 접힌 면을 '실제 접힌 선' 을 따라 나눈다.
//  부채꼴로 자르면 지붕 한가운데에 있지도 않은 세로 삼각형이 생긴다(박공에서 실제로 그랬다).
//  대신 이렇게 한다 — 이웃한 세 점이 만드는 평면마다, 그 평면에 놓인 꼭짓점이
//  고리에서 몇 개나 잇달아 있는지 세어, 가장 길게 잇달린 조각을 떼어 낸다.
//  박공이면 왼쪽 지붕(4점)이 통째로 떨어지고 남은 것이 오른쪽 지붕이 된다.
function _onPlane(v,P){ return Math.abs((v.x-P.c.x)*P.n.x+(v.y-P.c.y)*P.n.y+(v.z-P.c.z)*P.n.z)<=SK_PLANAR_TOL; }
function _planeOf(verts,a,b,c){
  const A=verts[a],B=verts[b],C=verts[c];
  if(!A||!B||!C) return null;
  const ux=B.x-A.x,uy=B.y-A.y,uz=B.z-A.z, wx=C.x-A.x,wy=C.y-A.y,wz=C.z-A.z;
  const nx=uy*wz-uz*wy, ny=uz*wx-ux*wz, nz=ux*wy-uy*wx;
  const L=Math.hypot(nx,ny,nz);
  if(L<1e-6) return null;                 // 세 점이 한 줄 위 — 평면이 안 나온다
  return {n:{x:nx/L,y:ny/L,z:nz/L},c:B};
}
// 고리에서 P 위에 잇달아 놓인 가장 긴 조각 (고리를 넘어가며 센다) — [시작index, 길이]
function _runOnPlane(verts,ring,P){
  const n=ring.length, on=ring.map(i=>_onPlane(verts[i],P));
  if(on.every(Boolean)) return [0,n];
  let bs=-1,bl=0;
  for(let s=0;s<n;s++){
    if(!on[s]||(on[(s-1+n)%n])) continue;  // 조각의 첫 칸에서만 센다
    let L=0; while(L<n&&on[(s+L)%n]) L++;
    if(L>bl){bl=L;bs=s;}
  }
  return bl>=3?[bs,bl]:null;
}
function _rotate(ring,s){ return ring.slice(s).concat(ring.slice(0,s)); }
// 고리 하나를 평평한 조각들로
function splitFoldedRing(verts,ring,depth){
  depth=depth||0;
  if(ring.length<3) return [];
  if(depth>16||facePlanarDev(verts,ring)<=SK_PLANAR_TOL) return [ring];
  let best=null;
  for(let i=0;i<ring.length;i++){
    const P=_planeOf(verts,ring[(i-1+ring.length)%ring.length],ring[i],ring[(i+1)%ring.length]);
    if(!P) continue;
    const r=_runOnPlane(verts,ring,P);
    if(!r) continue;
    const [s,L]=r;
    if(L>=ring.length) continue;           // 통째로면 이미 평평하다
    if(!best||L>best[1]) best=[s,L];
  }
  if(!best) return _fanTris(ring);         // 못 나누겠으면 삼각형으로 (넓이는 맞다)
  const [s,L]=best;
  const rot=_rotate(ring,s);
  const piece=rot.slice(0,L);              // 떼어 낸 평평한 조각
  const rest=rot.slice(L-1).concat([rot[0]]); // 남은 고리 — 자른 자리 두 점을 공유한다
  return [piece].concat(splitFoldedRing(verts,rest,depth+1));
}
// 접힌 면을 아예 갈라 굳힌다 — 갈라진 면마다 다른 마감을 주고 싶을 때만 쓴다.
//  평소에는 massSolid 가 읽을 때마다 나누므로 이걸 부를 필요가 없다.
function massHeal(m,ctx){
  if(!m||massIsPrism(m)) return 0;
  const verts=m.solidVerts.map(v=>({x:v.x,y:v.y,z:zNum(v.z,ctx)}));
  const out=[];let folded=0;
  m.solidFaces.forEach(f=>{
    if(facePlanarDev(verts,f.vs)<=SK_PLANAR_TOL){ out.push(f); return; }
    folded++;
    splitFoldedRing(verts,f.vs,0).forEach(r=>{
      if(r&&r.length>=3) out.push({vs:r,mat:f.mat||null});
    });
  });
  m.solidFaces=out;
  return folded;
}
// 꼭짓점 하나의 높이를 바꾼다 — 여기가 "자유롭게 변경" 이 일어나는 자리
function massVertZ(m,i,z,ctx){
  if(!m) return null;
  massToSolid(m,ctx);
  const v=m.solidVerts[i];
  if(!v) return null;
  v.z=(z&&typeof z==='object')?z:Math.round(Number(z));
  massTryPrism(m,ctx);   // 다시 평평해졌으면 각기둥으로 되돌린다 (파일이 가벼워진다)
  return m;
}
// 윗면 전체를 한 값으로 (밀기끌기) — 각기둥이면 각기둥인 채로 h_mm 만 고친다
function massSetTop(m,z,ctx){
  if(!m) return null;
  if(massIsPrism(m)){ m.h_mm=(z&&typeof z==='object')?z:Math.round(Number(z)); return m; }
  const N=(m.pts||[]).length;
  for(let i=N;i<m.solidVerts.length;i++) m.solidVerts[i].z=(z&&typeof z==='object')?z:Math.round(Number(z));
  massTryPrism(m,ctx);
  return m;
}
// 이 매스가 안고 있는 물량 — 면이 스스로 무엇인지 알기에 나온다
//  경사 천장은 눕힌 면적이 아니라 비탈을 따라간 실면적으로 잡힌다 (도배가 그만큼 든다)
function massQuantities(m,ctx){
  const S=massSolid(m,ctx);
  const q={floor:0,ceil:0,wall:0,slope:0,total:0,ceilAll:0,maxTilt:0};
  S.faces.forEach(f=>{
    const a=faceArea3(S.verts,f.vs)/1e6;   // mm² → ㎡
    q[f.role]=(q[f.role]||0)+a;
    q.total+=a;
    // 천장 마감(도배·페인트) 물량 — 평천장과 빗천장을 함께 센다.
    //  경사면은 눕힌 넓이가 아니라 비탈을 따라간 실면적이라 자재가 더 든다
    if(f.role==='ceil'||(f.role==='slope'&&f.facing==='up')) q.ceilAll+=a;
    if(f.tilt>q.maxTilt&&f.role!=='wall') q.maxTilt=f.tilt;
  });
  Object.keys(q).forEach(k=>{q[k]=Math.round(q[k]*1000)/1000;});
  return q;
}
// 부피 (㎥) — 발산정리. 되메움·단열 물량에 쓴다
function massVolume(m,ctx){
  const S=massSolid(m,ctx);
  let v=0;
  S.faces.forEach(f=>{
    const c=faceCentroid3(S.verts,f.vs);
    const n=faceNormal(S.verts,f.vs);
    v+=(c.x*n.x+c.y*n.y+c.z*n.z)*faceArea3(S.verts,f.vs);
  });
  return Math.round((Math.abs(v)/3/1e9-massCutsVolume(m))*1000)/1000;   // 파낸 만큼 뺀다 (프리폼 ③)
}
// 매스의 가장 높은 곳 (층 높이 계산·적층에 쓴다)
function massTopZ(m,ctx){
  const S=massSolid(m,ctx);
  let z=0;S.verts.forEach(v=>{if(v.z>z)z=v.z;});
  return z;
}

// ---------------------------------------------------------------------------
// Z축 3층(조작) — 두 창이 함께 쓰는 읽기용 헬퍼 (2026-09-07)
//  미니폼의 꼭짓점 그립과 평면도의 높이 표기가 같은 답을 보려면 계산이 한 곳에
//  있어야 한다. 두 벌로 베끼면 3D 에서 올린 지붕과 평면에 적힌 숫자가 조용히
//  어긋난다 — 이 파일을 2D·3D 가 함께 읽는 이유다.
// ---------------------------------------------------------------------------
function _mrot(m,x,y){                 // 매스 로컬 → 평면 절대 좌표
  const r=(m.angle||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return {x:m.x+x*c-y*s, y:m.y+x*s+y*c};
}
function _mdir(m,x,y){                 // 방향만 (평행이동 없이)
  const r=(m.angle||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return {x:x*c-y*s, y:x*s+y*c};
}
// 평면(2D)에서 쓰는 기준 높이 — 참조 높이가 매달릴 곳
function massCtx(){
  const S=(typeof STATE!=='undefined')?STATE:null;
  return {ch:(S&&S.ceilingHeight)||2400, fh:(S&&S.floorHeight)||2800, fl:0};
}
// 윗면 꼭짓점 목록 — 각기둥이든 다면체든 같은 모양으로 돌려준다.
//  vi = solidVerts 안의 자리. 프로토콜 setz 가 이 번호를 싣는다.
//  밑면 i ↔ 윗면 N+i 라는 짝은 massToSolid 가 세운 규약이고, massTryPrism 이
//  되돌릴 때도 그 짝을 확인한다 — 여기서도 같은 규약을 쓴다.
function massTopPts(m,ctx){
  const N=(m&&m.pts||[]).length; if(!N) return [];
  const solid=!massIsPrism(m);
  // 평면에서 뽑은 자유 다면체는 '밑면 i ↔ 윗면 N+i' 짝이 없다 — 그립을 잘못 세우면
  //  엉뚱한 꼭짓점이 끌리므로 아예 안 준다 (면 밀기끌기는 프리폼 ③에서)
  if(solid&&(m.solidVerts.length!==N*2||
     m.solidVerts.slice(0,N).some((v,i)=>Math.abs(v.x-m.pts[i].x)>1||Math.abs(v.y-m.pts[i].y)>1))) return [];
  const out=[];
  for(let i=0;i<N;i++){
    const v=solid?m.solidVerts[N+i]:null;
    const zr=solid?(v?v.z:0):m.h_mm;
    const x=(solid&&v)?v.x:m.pts[i].x, y=(solid&&v)?v.y:m.pts[i].y;
    const a=_mrot(m,x,y);
    out.push({i,vi:N+i,x,y,ax:a.x,ay:a.y,z:zNum(zr,ctx),zr,ref:zIsRef(zr),
      label:zEdit(zr,ctx),        // 칸·평면 표기 (되받아 읽힌다)
      labelLong:zLabel(zr,ctx)}); // 상태줄용 (사람 말)
  }
  return out;
}
// 물매 — 지붕은 각도보다 물매(x/10)로 말하는 일이 많다. 둘 다 적는다.
function pitchOf(tilt){ return Math.round(Math.tan((tilt||0)*Math.PI/180)*10); }
function pitchStr(tilt){ return pitchOf(tilt)+'/10'; }
// 경사면 — 평면도에 '내림 방향' 화살표를 그리기 위한 것 (지붕 평면도 관례)
//  법선이 (nx,ny,nz), nz>0 일 때 (nx,ny) 쪽으로 가면 z 가 줄어든다 = 내리막.
function massSlopes(m,ctx){
  if(!m||massIsPrism(m)) return [];
  const S=massSolid(m,ctx);
  const out=[];
  S.faces.forEach(f=>{
    if(f.role!=='slope'||f.facing!=='up') return;
    const c=faceCentroid3(S.verts,f.vs), n=f.n||faceNormal(S.verts,f.vs);
    const L=Math.hypot(n.x,n.y)||1;
    const d=_mdir(m,n.x/L,n.y/L);
    const a=_mrot(m,c.x,c.y);
    out.push({ax:a.x,ay:a.y,z:c.z,dx:d.x,dy:d.y,tilt:f.tilt,pitch:pitchOf(f.tilt),
      area:Math.round(faceArea3(S.verts,f.vs)/1e3)/1e3});
  });
  return out;
}
// 마루·골 — 위를 보는 면 둘이 만나는 모서리. 양쪽이 다 내려가면 마루(용마루),
//  양쪽이 다 올라가면 골(밸리). 지붕 평면도가 굵은 실선/파선으로 나누는 그것.
function massRidges(m,ctx){
  if(!m||massIsPrism(m)) return [];
  const S=massSolid(m,ctx);
  const seen=new Map();
  S.faces.forEach(f=>{
    if(f.facing!=='up'||(f.role!=='slope'&&f.role!=='ceil')) return;
    for(let k=0;k<f.vs.length;k++){
      const a=f.vs[k],b=f.vs[(k+1)%f.vs.length];
      const key=Math.min(a,b)+'_'+Math.max(a,b);
      if(!seen.has(key)) seen.set(key,{a:Math.min(a,b),b:Math.max(a,b),fs:[]});
      seen.get(key).fs.push(f);
    }
  });
  const out=[];
  seen.forEach(e=>{
    if(e.fs.length!==2) return;
    const va=S.verts[e.a],vb=S.verts[e.b];
    if(!va||!vb) return;
    const mz=(va.z+vb.z)/2;
    let lo=0,hi=0;
    e.fs.forEach(f=>{ const c=faceCentroid3(S.verts,f.vs); if(c.z<mz-1) lo++; else if(c.z>mz+1) hi++; });
    const kind=(lo===2)?'ridge':(hi===2)?'valley':'fold';
    const pa=_mrot(m,va.x,va.y), pb=_mrot(m,vb.x,vb.y);
    out.push({kind,ax:pa.x,ay:pa.y,bx:pb.x,by:pb.y,z:mz});
  });
  return out;
}
// 이 매스의 '윗면'이 평면 어느 점에서 얼마나 높은가 (2026-09-07 Z축 · 박공 벽)
//  경사 천장에 닿는 벽의 상단을 여기서 읽는다. 벽 끝점이 방 경계선 위에 딱 걸리는 일이
//  잦아, 어느 면에도 안 들어가면 가장 가까운 면의 평면을 연장해 읽는다.
function massZAt(m,ax,ay,ctx){
  if(!m) return null;
  const th=(m.angle||0)*Math.PI/180, c=Math.cos(th), sn=Math.sin(th);
  const dx=ax-m.x, dy=ay-m.y;
  const x=dx*c+dy*sn, y=-dx*sn+dy*c;          // 평면 절대 → 매스 로컬 (회전 역변환)
  const S=massSolid(m,ctx);
  const base=Number(m.elev_mm)||0;
  let hit=null, near=null, nd=Infinity;
  S.faces.forEach(f=>{
    if(f.facing!=='up') return;
    const n=f.n||faceNormal(S.verts,f.vs);
    if(Math.abs(n.z)<1e-6) return;
    const c0=faceCentroid3(S.verts,f.vs);
    const z=c0.z-((x-c0.x)*n.x+(y-c0.y)*n.y)/n.z;
    const poly=f.vs.map(i=>({x:S.verts[i].x,y:S.verts[i].y}));
    if(skPtInPoly({x,y},poly)){ if(hit===null||z>hit) hit=z; return; }
    let d=Infinity;
    for(let k=0;k<poly.length;k++){
      const a=poly[k],b=poly[(k+1)%poly.length];
      const vx=b.x-a.x, vy=b.y-a.y, L2=vx*vx+vy*vy||1;
      let t=((x-a.x)*vx+(y-a.y)*vy)/L2; t=Math.max(0,Math.min(1,t));
      d=Math.min(d,Math.hypot(x-(a.x+vx*t),y-(a.y+vy*t)));
    }
    if(d<nd){ nd=d; near=z; }
  });
  if(hit!==null) return base+hit;
  return (near!==null&&nd<=600)?base+near:null;   // 600mm 밖이면 이 매스 아래가 아니다
}
// 선분 a→b 가 선분 p→q 를 지나는 자리 (a→b 의 매개변수 t). 안 만나면 null
function _segT(a,b,p,q){
  const rx=b.x-a.x, ry=b.y-a.y, sx=q.x-p.x, sy=q.y-p.y;
  const d=rx*sy-ry*sx;
  if(Math.abs(d)<1e-9) return null;
  const t=((p.x-a.x)*sy-(p.y-a.y)*sx)/d;
  const u=((p.x-a.x)*ry-(p.y-a.y)*rx)/d;
  return (t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9)?t:null;
}
// 벽 한 장의 상단 옆모습 — 천장을 따라 어떻게 꺾이는가 (2026-09-07 Z축 · 박공 벽)
//  두 끝만 읽으면 마루 밑을 지나는 벽이 곧게 잘려 지붕과 사이가 벌어진다.
//  박공 벽은 가운데가 솟는다 — 윗면 조각들의 경계를 지나는 자리를 모두 찾아 꺾는다.
//  돌려주는 것: [{t:0..1, z}]
function massTopProfile(m,x1,y1,x2,y2,ctx){
  if(!m) return null;
  const L=Math.hypot(x2-x1,y2-y1);
  if(!(L>1)) return null;
  const th=(m.angle||0)*Math.PI/180, c=Math.cos(th), sn=Math.sin(th);
  const toLocal=(ax,ay)=>{const dx=ax-m.x,dy=ay-m.y;return {x:dx*c+dy*sn,y:-dx*sn+dy*c};};
  const a=toLocal(x1,y1), b=toLocal(x2,y2);
  const S=massSolid(m,ctx);
  const ts=new Set([0,1]);
  S.faces.forEach(f=>{
    if(f.facing!=='up') return;
    for(let k=0;k<f.vs.length;k++){
      const p=S.verts[f.vs[k]], q=S.verts[f.vs[(k+1)%f.vs.length]];
      const t=_segT(a,b,{x:p.x,y:p.y},{x:q.x,y:q.y});
      if(t!=null&&t>1e-4&&t<1-1e-4) ts.add(Math.round(t*1e6)/1e6);
    }
  });
  let pts=[...ts].sort((p,q)=>p-q)
    .map(t=>({t,z:massZAt(m,x1+(x2-x1)*t,y1+(y2-y1)*t,ctx)}))
    .filter(p=>p.z!=null);
  if(pts.length<2) return null;
  // 곧게 이어지는 자리는 접는다 — 꺾이지 않는 점은 무겁기만 하다
  const out=[pts[0]];
  for(let i=1;i<pts.length-1;i++){
    const A=out[out.length-1], B=pts[i], C=pts[i+1];
    const lin=A.z+(C.z-A.z)*((B.t-A.t)/((C.t-A.t)||1));
    if(Math.abs(lin-B.z)>1) out.push(B);
  }
  out.push(pts[pts.length-1]);
  return out;
}
// 옆모습의 평균 높이 — 사다리꼴 넓이 ÷ 길이. 벽면적이 여기서 나온다
function profileAvg(pf){
  if(!pf||pf.length<2) return null;
  let a=0;
  for(let i=0;i<pf.length-1;i++) a+=(pf[i].z+pf[i+1].z)/2*(pf[i+1].t-pf[i].t);
  return a;
}
// 미니폼이 꼭짓점을 끌 때 미리보기를 만들 최소 사본 — 형상 필드만 (가볍게)
function massLean(m){
  const o={pts:(m.pts||[]).map(p=>({x:p.x,y:p.y})),h_mm:m.h_mm,angle:0,x:0,y:0};
  if(Array.isArray(m.solidVerts)) o.solidVerts=m.solidVerts.map(v=>({x:v.x,y:v.y,z:(v.z&&typeof v.z==='object')?{r:v.z.r,o:v.z.o}:v.z}));
  if(Array.isArray(m.solidFaces)) o.solidFaces=m.solidFaces.map(f=>({vs:f.vs.slice(),mat:f.mat||null,roleFix:f.roleFix||null}));
  return o;
}

// ---------------------------------------------------------------------------
// 스케치 평면 (2026-09-07 프리폼 ② — "아무 데나 그리면 면이 된다")
//  스케치업의 자유는 3D 어디에나 선을 긋는 데서 나온다. 그런데 우리의 면 검출
//  (교차 분할·최소 고리)은 2D 평면 그래프다 — 그걸 버리지 않는다.
//  **평면마다 2D 그래프 하나**: 벽면에 그리면 그 벽면이 자기 점·선·면 bag 을 갖고,
//  같은 skAddEdge/skAddRect/skDetectFaces 가 (u,v) 좌표로 그 안에서 돈다.
//  10년 검증이 필요한 새 기하 대신, 이미 검증된 엔진의 좌표계만 바꿔 끼우는 것.
//
//  좌표 규약: 평면 = {origin:{x,y,z}, ex, ey} (정규직교). 3D = origin + ex·u + ey·v.
//  벽면이면 ex 는 수평(벽을 따라), ey 는 위(+z) — 그려 놓고 보면 도면처럼 읽힌다.
// ---------------------------------------------------------------------------
function _v3(x,y,z){return {x,y,z};}
function _vAdd(a,b){return _v3(a.x+b.x,a.y+b.y,a.z+b.z);}
function _vSub(a,b){return _v3(a.x-b.x,a.y-b.y,a.z-b.z);}
function _vScale(a,k){return _v3(a.x*k,a.y*k,a.z*k);}
function _vDot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function _vCross(a,b){return _v3(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);}
function _vLen(a){return Math.hypot(a.x,a.y,a.z);}
function _vNorm(a){const L=_vLen(a)||1;return _v3(a.x/L,a.y/L,a.z/L);}
// 법선에서 평면 틀을 — 늘 같은 규칙으로 (두 번 만들어도 같은 u,v 가 나와야 한다)
function planeFrom(origin,normal){
  const n=_vNorm(normal);
  let ex;
  if(Math.abs(n.z)<0.95){
    ex=_vNorm(_vCross(_v3(0,0,1),n));      // 수평 — 벽을 따라간다
  }else{
    ex=_v3(1,0,0);                          // 바닥·천장 평면 — 도면 x 그대로
  }
  let ey=_vNorm(_vCross(n,ex));
  if(Math.abs(n.z)<0.95&&ey.z<0){ ey=_vScale(ey,-1); ex=_vScale(ex,-1); } // v 는 위로
  return {origin:_v3(origin.x,origin.y,origin.z),ex,ey,n};
}
function planeUV(pl,p){
  const d=_vSub(p,pl.origin);
  return {u:_vDot(d,pl.ex),v:_vDot(d,pl.ey)};
}
function planePt(pl,u,v){
  return _vAdd(pl.origin,_vAdd(_vScale(pl.ex,u),_vScale(pl.ey,v)));
}
// 같은 기하 평면인가 — 법선이 나란하고(±) 원점 간 거리의 법선 성분이 1mm 안
function planeSame(pl,origin,normal){
  const n=_vNorm(normal);
  if(Math.abs(_vDot(pl.n,n))<0.999) return false;
  return Math.abs(_vDot(_vSub(origin,pl.origin),pl.n))<1.0;
}
// 자유 층에서 이 평면의 bag 을 찾거나 만든다 — 같은 벽면에 두 번 그리면 한 그래프
function ffPlaneBag(free,origin,normal){
  if(!Array.isArray(free.planes)) free.planes=[];
  let pl=free.planes.find(p=>planeSame(p,origin,normal));
  if(!pl){
    pl=planeFrom(origin,normal);
    pl.id=_skId('pl');
    pl.sketchPts=[];pl.sketchEdges=[];pl.sketchFaces=[];
    free.planes.push(pl);
  }
  return pl;
}
// 평면 면의 3D 꼭짓점들
function planeFaceVerts(pl,f){
  return skFacePoly(f,pl).map(p=>planePt(pl,p.x,p.y));
}
// 평면 면 → 법선 방향으로 d 만큼 뽑아 자유 다면체 매스로 (스케치업 밀기끌기의 3D 판)
//  d>0 = 법선 쪽. 안팎은 _solidFlipIfInsideOut 이 부피 부호로 바로잡는다.
function planeExtrude(pl,f,d,free){
  d=Math.round(Number(d));
  if(!isFinite(d)||Math.abs(d)<10) return null;
  const uv=skFacePoly(f,pl);
  if(uv.length<3) return null;
  const near=uv.map(p=>planePt(pl,p.x,p.y));
  const off=_vScale(pl.n,d);
  const far=near.map(p=>_vAdd(p,off));
  const all=near.concat(far);
  // 바닥(z<0) 밑으로는 내려가지 않는다 — 땅속 매스는 뜻이 없다
  const zmin=Math.min(...all.map(p=>p.z));
  const lift=zmin<0?-zmin:0;
  const verts3=all.map(p=>_v3(p.x,p.y,p.z+lift));
  const N=uv.length;
  const cx=verts3.reduce((a,p)=>a+p.x,0)/verts3.length;
  const cy=verts3.reduce((a,p)=>a+p.y,0)/verts3.length;
  // 발자국 — 라벨·스냅용 (xy 로 눕힌 그림자 상자)
  const xs=verts3.map(p=>p.x),ys=verts3.map(p=>p.y);
  const x0=Math.min(...xs)-cx,x1=Math.max(...xs)-cx,y0=Math.min(...ys)-cy,y1=Math.max(...ys)-cy;
  const m={id:_skId('ms'),name:'자유 매스'+(((free.masses||[]).length)+1),
    // 모체와 같은 색이면 벽에서 자란 게 안 보인다 — 살짝 따뜻한 모래색으로 가른다
    x:Math.round(cx),y:Math.round(cy),angle:0,elev_mm:0,color:'#C9B98E',locked:false,
    pts:[{x:Math.round(x0),y:Math.round(y0)},{x:Math.round(x1),y:Math.round(y0)},
         {x:Math.round(x1),y:Math.round(y1)},{x:Math.round(x0),y:Math.round(y1)}],
    h_mm:Math.round(Math.max(...verts3.map(p=>p.z))),
    solidVerts:verts3.map(p=>({x:Math.round(p.x-cx),y:Math.round(p.y-cy),z:Math.round(p.z)})),
    solidFaces:(()=>{
      const F=[{vs:[...Array(N).keys()].reverse()},{vs:[...Array(N).keys()].map(i=>N+i)}];
      for(let i=0;i<N;i++){const j=(i+1)%N;F.push({vs:[i,j,N+j,N+i]});}
      return F;
    })()};
  if(!Array.isArray(free.masses)) free.masses=[];
  free.masses.push(m);
  _skConsumeFace(f,pl);
  return m;
}

// ---------------------------------------------------------------------------
// 파내기 (2026-09-07 프리폼 ③ — 벽감·아치·관통)
//  스케치업의 '안으로 밀기'. CSG 는 안 쓴다 — 파냄을 cuts[] 로 **기록만** 하고,
//  그릴 때마다 호스트 면에 구멍을 뚫고 주머니(옆벽·바닥)를 다시 만든다.
//  갈래·접힘을 저장하지 않는 것과 같은 원칙: 파생물은 늘 지금 형상에서 다시 계산.
//  cut 은 **매스 로컬 좌표**로 저장한다 — 매스를 옮기고 돌리면 벽감도 따라간다.
//  cut = {id, plane:{origin,ex,ey,n}(로컬), uv:[{x,y}], d, through}
// ---------------------------------------------------------------------------
// 절대 평면 틀 → 매스 로컬 틀 (역회전·역이동, z 는 elev 만큼 내림)
function massLocalFrame(m,pl){
  const th=-(m.angle||0)*Math.PI/180, c=Math.cos(th), sn=Math.sin(th);
  const el=Number(m.elev_mm)||0;
  const pt=p=>{const dx=p.x-m.x,dy=p.y-m.y;return _v3(dx*c-dy*sn,dx*sn+dy*c,p.z-el);};
  const dir=v=>_v3(v.x*c-v.y*sn,v.x*sn+v.y*c,v.z);
  return {origin:pt(pl.origin),ex:dir(pl.ex),ey:dir(pl.ey),n:dir(pl.n)};
}
// 이 로컬 평면과 같은 판에 있는 솔리드 면 — 벽감이 앉을 호스트
function massFaceAt(m,lf,ctx){
  const S=massSolid(m,ctx);
  for(const f of S.faces){
    const n=f.n||faceNormal(S.verts,f.vs);
    if(Math.abs(_vDot(n,lf.n))<0.999) continue;
    const c0=S.verts[f.vs[0]];
    if(Math.abs(_vDot(_vSub(c0,lf.origin),lf.n))>=1.5) continue;
    return {solid:S,face:f,ring:f.vs.map(i=>S.verts[i])};
  }
  return null;
}
// 로컬 점에서 -n 방향으로 솔리드를 뚫고 나가는 거리 (벽 두께) — 관통 판정에 쓴다
function massRayExit(m,pt,dir,ctx){
  const S=massSolid(m,ctx);
  let best=null;
  S.faces.forEach(f=>{
    const n=f.n||faceNormal(S.verts,f.vs);
    const dn=_vDot(n,dir);
    if(Math.abs(dn)<1e-6) return;
    const c0=faceCentroid3(S.verts,f.vs);
    const t=_vDot(_vSub(c0,pt),n)/dn;
    if(t<1) return;                                   // 뒤나 제자리
    const hit=_vAdd(pt,_vScale(dir,t));
    const fr=planeFrom(c0,n);
    const poly=f.vs.map(i=>{const q=planeUV(fr,S.verts[i]);return {x:q.u,y:q.v};});
    const q=planeUV(fr,hit);
    if(!skPtInPoly({x:q.u,y:q.v},poly)) return;
    if(best===null||t<best) best=t;
  });
  return best;                                        // null = 못 나감 (열린 형상)
}
// 파낸다 — 평면(절대)과 그 위 uv 다각형을, 깊이 d 만큼. 관통이면 through 표시.
function massAddCut(m,planeAbs,uv,d,ctx){
  d=Math.round(Number(d));
  if(!m||!isFinite(d)||d<10||!Array.isArray(uv)||uv.length<3) return null;
  const lf=massLocalFrame(m,planeAbs);
  const host=massFaceAt(m,lf,ctx);
  if(!host) return {err:'face'};                      // 이 매스의 면이 아니다
  // 다각형이 호스트 면 안에 온전히 들어앉는가 — 걸치면 구멍 삼각화가 찢어진다
  const hostFr=planeFrom(host.ring[0],lf.n);
  const hostPoly=host.ring.map(p=>{const q=planeUV(hostFr,p);return {x:q.u,y:q.v};});
  const inHost=uv.every(p=>{
    const w=planePt(lf,p.x,p.y);
    const q=planeUV(hostFr,w);
    return skPtInPoly({x:q.u,y:q.v},hostPoly);
  });
  if(!inHost) return {err:'inside'};                  // 면 밖으로 걸쳤다
  // 두께 — 다각형 무게중심에서 -n 으로 나가는 거리
  const c2=skPolyCentroid(uv);
  const c3=planePt(lf,c2.x,c2.y);
  const exit=massRayExit(m,c3,_vScale(lf.n,-1),ctx);
  let through=false, dd=d;
  if(exit!=null&&d>=exit-1){ through=true; dd=Math.round(exit); }
  const cut={id:_skId('ct'),plane:{origin:lf.origin,ex:lf.ex,ey:lf.ey,n:lf.n},
    uv:uv.map(p=>({x:Math.round(p.x),y:Math.round(p.y)})),d:dd,through};
  if(!Array.isArray(m.cuts)) m.cuts=[];
  m.cuts.push(cut);
  return {cut,through,exit};
}
// 파낸 부피 — 표시·부피 계산에서 뺀다
function massCutsVolume(m){
  if(!m||!Array.isArray(m.cuts)) return 0;
  return m.cuts.reduce((a,c)=>a+Math.abs(skPolyArea(c.uv))*c.d,0)/1e9;
}

// ---------------------------------------------------------------------------
// Follow Me (2026-09-07 프리폼 ④ — 몰딩·걸레받이)
//  단면(u=바깥, v=위) 을 경로를 따라 훑는다. 모서리는 마이터(각의 이등분선에
//  단면을 세우고 1/cos(θ/2) 만큼 늘린다) — 목공이 몰딩을 45°로 켜서 잇는 그 방식.
//  결과는 자유 다면체 매스: 이동·삭제·undo 가 다른 매스와 똑같이 돈다.
//  훑은 사각들이 마이터 때문에 살짝 뒤틀려도 괜찮다 — massSolid 의 접힘 정리가
//  읽을 때 평평한 조각으로 나눈다 (그 함정을 이미 박공에서 겪고 만들어 둔 것).
// ---------------------------------------------------------------------------
// 경로의 '바깥쪽' — 감김에 기대지 않고 실제로 점을 넣어 본다 (감김 버그를 이미 겪었다)
function _pathOutSign(path,closed){
  if(!closed||path.length<3) return 1;
  const a=path[0],b=path[1];
  const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;
  const mx=(a.x+b.x)/2+(dy/L)*10, my=(a.y+b.y)/2-(dx/L)*10;   // 후보 법선 (dy,-dx) 쪽으로 조금
  return skPtInPoly({x:mx,y:my},path)?-1:1;                    // 안이면 반대가 바깥
}
// path [{x,y}](절대 평면), closed, base(경로선의 z), profile [{u,v}] → {verts,faces}(절대)
function sweepProfile(path,closed,base,profile){
  if(!Array.isArray(path)||path.length<2||!Array.isArray(profile)||profile.length<3) return null;
  const N=path.length,K=profile.length;
  const sign=_pathOutSign(path,closed);
  const dir=i=>{const a=path[i],b=path[(i+1)%N];const L=Math.hypot(b.x-a.x,b.y-a.y)||1;
    return {x:(b.x-a.x)/L,y:(b.y-a.y)/L};};
  const out=d=>({x:d.y*sign,y:-d.x*sign});                     // 진행방향의 바깥 법선
  const verts=[],rings=[];
  for(let i=0;i<N;i++){
    let m,scale;
    if(!closed&&i===0){ const n0=out(dir(0)); m=n0; scale=1; }
    else if(!closed&&i===N-1){ const n0=out(dir(N-2)); m=n0; scale=1; }
    else{
      const n0=out(dir((i-1+N)%N)), n1=out(dir(i));
      let mx=n0.x+n1.x,my=n0.y+n1.y;
      const L=Math.hypot(mx,my);
      if(L<1e-6){ m=out(dir(i)); scale=1; }                    // 되꺾임(180°) — 마이터 불능
      else{
        m={x:mx/L,y:my/L};
        scale=Math.min(4,1/Math.max(0.25,m.x*n0.x+m.y*n0.y)); // 예각 스파이크는 4배에서 자른다
      }
    }
    const ring=[];
    for(let k=0;k<K;k++){
      const p=profile[k];
      ring.push(verts.length);
      verts.push({x:path[i].x+m.x*p.u*scale,y:path[i].y+m.y*p.u*scale,z:base+p.v});
    }
    rings.push(ring);
  }
  const faces=[];
  const segs=closed?N:N-1;
  for(let i=0;i<segs;i++){
    const A=rings[i],B=rings[(i+1)%N];
    for(let k=0;k<K;k++){
      const k2=(k+1)%K;
      faces.push({vs:[A[k],A[k2],B[k2],B[k]]});
    }
  }
  if(!closed){
    faces.push({vs:rings[0].slice().reverse()});
    faces.push({vs:rings[N-1].slice()});
  }
  return {verts,faces};
}
// 훑은 것을 자유 매스로 — 안팎은 massSolid 의 부피 부호 교정이 맡는다
function massFromSweep(name,sw,free,color){
  if(!sw||!sw.verts.length) return null;
  const cx=sw.verts.reduce((a,p)=>a+p.x,0)/sw.verts.length;
  const cy=sw.verts.reduce((a,p)=>a+p.y,0)/sw.verts.length;
  const xs=sw.verts.map(p=>p.x-cx),ys=sw.verts.map(p=>p.y-cy);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const zt=Math.max(...sw.verts.map(p=>p.z));
  const m={id:_skId('ms'),name:name||('몰딩'+(((free.masses||[]).length)+1)),
    x:Math.round(cx),y:Math.round(cy),angle:0,elev_mm:0,color:color||'#8B6F47',locked:false,
    pts:[{x:Math.round(x0),y:Math.round(y0)},{x:Math.round(x1),y:Math.round(y0)},
         {x:Math.round(x1),y:Math.round(y1)},{x:Math.round(x0),y:Math.round(y1)}],
    h_mm:Math.round(Math.max(10,zt)),
    solidVerts:sw.verts.map(p=>({x:Math.round(p.x-cx),y:Math.round(p.y-cy),z:Math.round(p.z)})),
    solidFaces:sw.faces.map(f=>({vs:f.vs.slice()}))};
  if(!Array.isArray(free.masses)) free.masses=[];
  free.masses.push(m);
  return m;
}
// 단면 프리셋 — 인테리어에서 실제로 켜는 것들 (u=벽에서 바깥, v=경로선에서 위)
function moldingProfile(kind,w,h){
  w=Math.max(3,Math.round(Number(w)||10)); h=Math.max(3,Math.round(Number(h)||80));
  if(kind==='crown')  return [{u:0,v:0},{u:w,v:0},{u:0,v:-h}];              // 천장 몰딩 — 위 둘레에서 아래로
  if(kind==='cove')   return [{u:0,v:0},{u:w,v:0},{u:Math.round(w*0.55),v:-Math.round(h*0.55)},{u:0,v:-h}]; // 코브 근사
  return [{u:0,v:0},{u:w,v:0},{u:w,v:h},{u:0,v:h}];                          // 걸레받이·평몰딩 (사각)
}

if(typeof module!=='undefined'&&module.exports){
  module.exports={zIsRef,zNum,zSet,zLabel,facePlanarDev,massHeal,splitFoldedRing,faceNormal,faceRole,faceFacing,faceTiltDeg,faceArea3,faceCentroid3,
    zEdit,massIsPrism,massSolid,massToSolid,massTryPrism,massVertZ,massSetTop,massQuantities,massVolume,massTopZ,
    massTopPts,massSlopes,massRidges,massCtx,massLean,massZAt,massTopProfile,profileAvg,pitchOf,pitchStr,
    planeFrom,planeUV,planePt,planeSame,ffPlaneBag,planeFaceVerts,planeExtrude,
    massLocalFrame,massFaceAt,massRayExit,massAddCut,massCutsVolume,
    sweepProfile,massFromSweep,moldingProfile,
    massAbsPoly,massArea,massFromPoly,skArrs,skPoint,skAddEdge,skAddPoly,skAddRect,skAddCircle,skCirclePoly,skDetectFaces,skFaceAt,skFacePoly,skFaceArea,skFacePerimeter,skPolyArea,skPolyCentroid,skPtInPoly,skRemoveEdge,skRemovePoint,skRemoveFace,skRemove,skClear,skCount,skObb,skGuessKind,skEdgeLen,skEdgePts,skPtById,skEdgeById,skFaceById};
}
