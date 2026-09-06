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
    const t=new Konva.Text({x:c.x,y:c.y,text:(m.name||'매스')+'\nH '+(m.h_mm||0)+(m.elev_mm?' ↑'+m.elev_mm:''),fontSize:11,fill:sel?SK_COL.sel:'#3E4750',align:'center',listening:false});
    t.offsetX(t.width()/2);t.offsetY(t.height()/2);g.add(t);
  });
}
if(typeof module!=='undefined'&&module.exports){
  module.exports={massAbsPoly,massArea,massFromPoly,skArrs,skPoint,skAddEdge,skAddPoly,skAddRect,skAddCircle,skCirclePoly,skDetectFaces,skFaceAt,skFacePoly,skFaceArea,skFacePerimeter,skPolyArea,skPolyCentroid,skPtInPoly,skRemoveEdge,skRemovePoint,skRemoveFace,skRemove,skClear,skCount,skObb,skGuessKind,skEdgeLen,skEdgePts,skPtById,skEdgeById,skFaceById};
}
