'use strict';
// ============================================================================
//  MiniCAD 3D — 문서(JSON) → 3D 기본체 목록 (build3d.js)
//  2026-09-01: Coohom 식 "평면도 그리면 바로 입체" 1단계. THREE 에 의존하지 않는 순수 계산부라
//  노드에서 그대로 테스트한다 (tests/minicad-3d.cjs). 뷰어(view3d.js)와 Blender/glTF 내보내기가
//  같은 결과를 쓴다.
//
//  좌표 규약 — 평면 mm 를 그대로 둔다. x 오른쪽, y 아래(화면), z 는 바닥에서 위로.
//  회전(rot)은 MiniCAD/Konva 의 angle(도, y-down 화면에서 시계방향)과 같다.
//
//  결과 = { bounds:{minX,minY,maxX,maxY}, ceilH, objects:[obj...], labels:[{x,y,z,text}] }
//  obj  = { id, kind:'wall'|'floor'|'ceiling'|'door'|'window'|'furniture'|'fixture'|'light'|'electric'|'hvac'|'pillar'|'stair'|'slab',
//           name, x, y, rot, flip, prims:[prim...] }      x,y = 원점(mm), prims 는 원점 기준 로컬
//  prim = { t:'box', x,y,z, w,d,h, color, opacity?, emissive? }   x,y 중심 · z 바닥 · w x방향 · d y방향
//         { t:'cyl', x,y,z, r,h, color, ... }                       세로 원기둥
//         { t:'sphere', x,y,z, r, color }
//         { t:'poly', pts:[{x,y}], holes:[[{x,y}]], z, color, side:'top'|'bottom' }   수평 다각형(바닥·천장)
// ============================================================================
(function(root){

const FLOOR_COLORS={
  STRONG:'#C8A272',WOOD:'#B98B5A',REINFORCED:'#C9A46F',LVT:'#B9A487',PVC:'#C6B9A4',
  TILE_PORC:'#D9D6CF',TILE_POLISHED:'#E6E2DA',TILE_BATH:'#BFC7CB',MARBLE:'#E8E4DC',
  WOOD_TILE:'#B39271',CARPET:'#9A8F86',EPOXY:'#A9B3B8',CONCRETE:'#9C9C98',UNDECIDED:'#C9B8A3',
};
const WALL_COLORS={
  WP_COMPOSITE:'#F0EBE2',WP_SILK:'#F2EEE6',WP_ECO:'#EFEBE3',WP_DESIGN:'#E9E1D3',
  PAINT_WATER:'#F4F1EA',PAINT_ECO:'#F3F0E9',PAINT_SPECIAL:'#E6E0D6',
  WALL_TILE:'#DDE3E5',KITCHEN_TILE:'#E4E7E2',WOOD_PANEL:'#A97C50',VENEER:'#B48A5E',
  CONCRETE:'#9A9A96',FABRIC:'#CFC4B4',METAL:'#A8ACB0',UNDECIDED:'#EEE9E0',
};
const C={
  ceiling:'#F7F5F0', bearing:'#8E8E8A', partition:'#E8E4DC', slab:'#3A3D4A',
  doorLeaf:'#B8894F', doorFrame:'#8A6238', entry:'#4C4F57',
  winFrame:'#DADDE0', glass:'#9CC8E8', sill:'#E3E5E7',
  wood:'#8B6B43', woodDark:'#5D4037', fabric:'#8B7239', fabricLight:'#A88248',
  white:'#F4F4F2', grey:'#8C8F94', dark:'#2A2A2A', steel:'#B9BDC2', ceramic:'#F1F3F3',
  mattress:'#E9E6DF', pillow:'#F5F3EE', green:'#4E8A4E', pot:'#8A6248', black:'#1C1C1E',
  lamp:'#F5E5B8', lampMetal:'#C8A961', concrete:'#9C9C98',
};
const DOWNLIGHT_OUTER={2:70,3:95,4:120,5:145,6:175};

// ---------------------------------------------------------------------------
// 도우미
// ---------------------------------------------------------------------------
function box(x,y,z,w,d,h,color,extra){ return Object.assign({t:'box',x,y,z,w,d,h,color},extra||{}); }
function cyl(x,y,z,r,h,color,extra){ return Object.assign({t:'cyl',x,y,z,r,h,color},extra||{}); }
function sphere(x,y,z,r,color,extra){ return Object.assign({t:'sphere',x,y,z,r,color},extra||{}); }
function num(v,dflt){ const n=Number(v); return isFinite(n)?n:dflt; }
function polyCentroid(poly){
  let a=0,cx=0,cy=0;
  for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length];
    const f=p.x*q.y-q.x*p.y; a+=f; cx+=(p.x+q.x)*f; cy+=(p.y+q.y)*f;
  }
  if(Math.abs(a)<1e-6){ let sx=0,sy=0; poly.forEach(p=>{sx+=p.x;sy+=p.y;}); return {x:sx/poly.length,y:sy/poly.length}; }
  return {x:cx/(3*a),y:cy/(3*a)};
}
function polyBBox(poly){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  poly.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
  return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
}
function pointInPoly(pt,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    if(((yi>pt.y)!==(yj>pt.y))&&(pt.x<(xj-xi)*(pt.y-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
function segDist(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
  if(l2<1e-9) return Math.hypot(p.x-a.x,p.y-a.y);
  let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2; t=Math.max(0,Math.min(1,t));
  return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));
}

// 문서의 벽/공간 좌표 정규화 — VEF(vertex id) 문서와 flat(x1..y2) 문서 모두 받는다
function normalizeDoc(doc){
  const d=doc&&doc.data&&!doc.walls?doc.data:doc||{};
  const vmap={};
  (d.vertices||[]).forEach(v=>{vmap[v.id]=v;});
  const walls=(d.walls||[]).map(w=>{
    const o=Object.assign({},w);
    if(!isFinite(o.x1)&&vmap[o.v1Id]){o.x1=vmap[o.v1Id].x;o.y1=vmap[o.v1Id].y;}
    if(!isFinite(o.x2)&&vmap[o.v2Id]){o.x2=vmap[o.v2Id].x;o.y2=vmap[o.v2Id].y;}
    return o;
  }).filter(w=>isFinite(w.x1)&&isFinite(w.y1)&&isFinite(w.x2)&&isFinite(w.y2));
  const spaces=(d.spaces||[]).map(s=>{
    const o=Object.assign({},s);
    let poly=Array.isArray(o.polygon)?o.polygon:null;
    if((!poly||!poly.length)&&Array.isArray(o.vertexIds)) poly=o.vertexIds.map(id=>vmap[id]).filter(Boolean).map(v=>({x:v.x,y:v.y}));
    o.polygon=(poly||[]).map(p=>({x:num(p.x,0),y:num(p.y,0)}));
    o.holes=(o.holes||[]).map(h=>(h||[]).map(p=>({x:num(p.x,0),y:num(p.y,0)})));
    return o;
  }).filter(s=>s.polygon.length>=3);
  const meta=d.meta||{};
  return {
    meta, spaces, walls,
    openings:d.openings||[], furniture:d.furniture||[], fixtures:d.fixtures||[],
    lights:d.lights||[], electric:d.electric||[], hvac:d.hvac||[], pillars:d.pillars||[],
    ceilH:num(meta.ceilingHeight_mm,2400),
  };
}

// ---------------------------------------------------------------------------
// 벽 + 개구부
// ---------------------------------------------------------------------------
function wallOpenings(wall,openings,walls){
  return openings.filter(o=>{
    if(o.wallId) return o.wallId===wall.id;
    // 배치 때 벽을 못 잡은 문·창 — 가장 가까운 벽에 붙인다
    let best=null,bd=Infinity;
    walls.forEach(w=>{ if(w.isLine) return; const dd=segDist(o,{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}); if(dd<bd){bd=dd;best=w;} });
    return best&&best.id===wall.id&&bd<=(num(wall.thickness,100)/2+120);
  });
}
// ---- 벽 정렬 (2026-09-01) — MiniCAD 2D 의 _wallAlignOffsetPx 와 같은 규칙을 mm 로 ----
//  로컬 +y = 진행방향 우측 법선 (−uy, ux). 그린 선(중심선)에서 몸체를 이만큼 옮긴다.
//  일반벽: interior +t/2 · exterior −t/2 (클릭 방향 규약). 내력벽: 내력벽 무게중심 쪽이 '안'.
function wallThk(w){ return Math.max(30,num(w.thickness,100)); }
function bearingInteriorSign(w,D){
  const bs=D.walls.filter(o=>o.wallType==='bearing'&&!o.isLine);
  if(bs.length<=1) return 1;
  let cx=0,cy=0; bs.forEach(o=>{cx+=(o.x1+o.x2)/2;cy+=(o.y1+o.y2)/2;}); cx/=bs.length; cy/=bs.length;
  const dx=w.x2-w.x1, dy=w.y2-w.y1, len=Math.hypot(dx,dy);
  if(len<1) return 1;
  const nx=-dy/len, ny=dx/len;
  return ((cx-(w.x1+w.x2)/2)*nx+(cy-(w.y1+w.y2)/2)*ny)>0?1:-1;
}
function wallAlignOffset(w,D){
  if(w.isLine) return 0;
  const a=w.alignment||'center';
  if(a!=='interior'&&a!=='exterior') return 0;
  const half=wallThk(w)/2;
  if(w.wallType!=='bearing') return a==='interior'?half:-half;
  const s=bearingInteriorSign(w,D);
  return (a==='interior'?s:-s)*half;
}
// 모서리 메움 — 같은 꼭짓점에서 꺾여 만나는 이웃 벽의 바깥 면까지 이 벽 끝을 늘린다.
//  정렬로 몸체가 밀리면 모서리에 빈 틈(또는 삐죽 나온 끝)이 생기므로, 이웃 몸체의 끝점을 이 벽 방향으로 투영한 최댓값만큼.
//  d = 꼭짓점에서 바깥으로 향하는 단위벡터(v1 끝은 −u, v2 끝은 +u). 1mm 빼서 면이 겹쳐 떨리는 것을 막는다.
function cornerExtension(w,end,D,offs){
  const L=Math.hypot(w.x2-w.x1,w.y2-w.y1); if(!(L>1)) return 0;
  const ux=(w.x2-w.x1)/L, uy=(w.y2-w.y1)/L;
  const vx=end===1?w.x1:w.x2, vy=end===1?w.y1:w.y2;
  const dx=end===1?-ux:ux, dy=end===1?-uy:uy;
  const vid=end===1?w.v1Id:w.v2Id;
  let ext=0;
  D.walls.forEach(n=>{
    if(n===w||n.isLine||n.id===w.id) return;
    let shared=null;
    if(vid&&(n.v1Id===vid||n.v2Id===vid)) shared=n.v1Id===vid?1:2;
    else if(Math.hypot(n.x1-vx,n.y1-vy)<=2) shared=1;
    else if(Math.hypot(n.x2-vx,n.y2-vy)<=2) shared=2;
    if(!shared) return;
    const nl=Math.hypot(n.x2-n.x1,n.y2-n.y1); if(!(nl>1)) return;
    const nux=(n.x2-n.x1)/nl, nuy=(n.y2-n.y1)/nl;
    if(Math.abs(nux*ux+nuy*uy)>0.995) return;           // 일직선으로 이어지는 벽은 틈이 없다
    const nnx=-nuy, nny=nux;                               // 이웃의 로컬 +y
    const off=offs[n.id]||0, half=wallThk(n)/2;
    [off-half,off+half].forEach(s=>{ ext=Math.max(ext,s*(nnx*dx+nny*dy)); });
  });
  return ext>1?ext-1:0;
}
function buildWall(w,D,spaceById,offs){
  const L=Math.hypot(w.x2-w.x1,w.y2-w.y1);
  if(!(L>1)) return null;
  const t=wallThk(w);
  const sp=w.spaceId?spaceById[w.spaceId]:null;
  const H=Math.round(num(w.height_mm,0)||num(sp&&sp.ceilingHeight_mm,0)||D.ceilH);
  const rot=Math.atan2(w.y2-w.y1,w.x2-w.x1)*180/Math.PI;
  const ux=(w.x2-w.x1)/L, uy=(w.y2-w.y1)/L;
  const bearing=w.wallType==='bearing';
  const color=bearing?C.bearing:(WALL_COLORS[w.finishMaterial]||(w.wallType==='partition'?C.partition:WALL_COLORS.UNDECIDED));
  offs=offs||{};
  const off=offs[w.id]!==undefined?offs[w.id]:wallAlignOffset(w,D);
  const ext1=cornerExtension(w,1,D,offs), ext2=cornerExtension(w,2,D,offs);
  const prims=[];
  // 개구부 — 벽을 따라간 거리 [left,right] + 높이 [z0,z1]
  const cuts=wallOpenings(w,D.openings,D.walls).map(o=>{
    const isDoor=o.type==='DOOR';
    const ow=Math.max(1,num(o.width_mm,900));
    const oh=Math.max(1,num(o.height_mm,isDoor?2100:1500));
    const sill=isDoor?0:Math.max(0,num(o.sillHeight_mm,0));
    const along=(o.x-w.x1)*ux+(o.y-w.y1)*uy;
    let left=along-ow/2,right=along+ow/2;
    // 포켓도어: 전체 폭의 절반만 뚫리고 나머지 절반은 벽 속 포켓(벽이 남는다)
    let hole=[left,right];
    if(isDoor&&o.subType==='pocket') hole=o.flipped?[along,right]:[left,along];
    return {o,isDoor,ow,oh,sill,along,left:Math.max(0,hole[0]),right:Math.min(L,hole[1]),z0:sill,z1:Math.min(H,sill+oh)};
  }).filter(c=>c.right-c.left>1).sort((a,b)=>a.left-b.left);
  // 벽 몸체 — 개구부 사이는 전체 높이, 개구부 위(인방)·아래(창턱)는 부분 높이
  let cursor=-ext1;
  const seg=(a,b,z0,z1)=>{ if(b-a>1&&z1-z0>1) prims.push(box((a+b)/2,off,z0,b-a,t,z1-z0,color)); };
  cuts.forEach(c=>{
    seg(cursor,c.left,0,H);
    seg(c.left,c.right,0,c.z0);        // 창턱 아래
    seg(c.left,c.right,c.z1,H);        // 인방
    cursor=Math.max(cursor,c.right);
  });
  seg(cursor,L+ext2,0,H);
  // 개구부 객체(문짝·창틀·유리)는 별도 obj 로 — 클릭하면 이름이 보이도록
  const openingObjs=cuts.map(c=>buildOpening(c,w,t,rot,off));
  return {
    wall:{id:w.id,kind:'wall',name:bearing?'내력벽':(w.wallType==='partition'?'가벽':'벽'),x:w.x1,y:w.y1,rot,flip:false,prims,
      meta:{L:Math.round(L),t,H,material:w.finishMaterial||null,wallType:w.wallType||'standard',alignment:w.alignment||'center',offset:off,ext:[ext1,ext2]}},
    openings:openingObjs,
  };
}
function buildOpening(c,w,t,rot,off){
  const o=c.o,isDoor=c.isDoor;
  const cx=(c.left+c.right)/2, hw=c.right-c.left, hh=c.z1-c.z0;
  const prims=[];
  const F=45; // 틀 두께
  off=off||0; // 벽 정렬 오프셋 — 개구부도 벽 몸체와 함께 움직인다
  if(isDoor){
    const entry=o.subType==='entry';
    const leafCol=entry?C.entry:C.doorLeaf;
    const st=o.subType||'swing';
    // 문틀 — 양옆 + 위
    prims.push(box(cx-hw/2+F/2,off,0,F,t+10,hh,C.doorFrame));
    prims.push(box(cx+hw/2-F/2,off,0,F,t+10,hh,C.doorFrame));
    prims.push(box(cx,off,hh-F,hw,t+10,F,C.doorFrame));
    const iw=hw-2*F, ih=hh-F;
    if(st==='sliding'){
      prims.push(box(cx-iw/4,off-t/4,0,iw/2,36,ih,leafCol));
      prims.push(box(cx+iw/4,off+t/4,0,iw/2,36,ih,leafCol));
    }else if(st==='folding'){
      for(let i=0;i<3;i++) prims.push(box(cx-iw/2+iw/6+i*iw/3,off+(i%2?1:-1)*14,0,iw/3-6,36,ih,leafCol));
    }else{ // swing / entry / pocket(뚫린 쪽 한 짝)
      prims.push(box(cx,off,0,iw,40,ih,leafCol));
      // 손잡이
      prims.push(box(cx+iw/2-90,off-30,1000,120,14,20,C.lampMetal));
      prims.push(box(cx+iw/2-90,off+30,1000,120,14,20,C.lampMetal));
    }
  }else{
    const st=o.subType||'casement';
    prims.push(box(cx-hw/2+F/2,off,c.z0,F,t+10,hh,C.winFrame));
    prims.push(box(cx+hw/2-F/2,off,c.z0,F,t+10,hh,C.winFrame));
    prims.push(box(cx,off,c.z1-F,hw,t+10,F,C.winFrame));
    prims.push(box(cx,off,c.z0,hw,t+10,F,C.sill));
    const iw=hw-2*F, ih=hh-2*F;
    prims.push(box(cx,off,c.z0+F,iw,12,ih,C.glass,{opacity:0.35,glass:true}));
    const n=st==='sliding2'?2:st==='sliding4'?4:st==='bay'?3:1;
    for(let i=1;i<n;i++) prims.push(box(cx-iw/2+iw*i/n,off,c.z0+F,30,t-10,ih,C.winFrame));
    if(st==='sliding2'||st==='sliding4'){ // 미세기는 위아래 레일
      prims.push(box(cx,off,c.z0+F,iw,t-10,18,C.winFrame));
    }
  }
  const name=isDoor?((o.subType==='entry')?'현관문':'문'):'창';
  return {id:o.id,kind:isDoor?'door':'window',name:name+' '+Math.round(c.ow)+'×'+Math.round(c.oh),
    x:w.x1,y:w.y1,rot,flip:false,prims,meta:{subType:o.subType||null,w:c.ow,h:c.oh,sill:c.sill}};
}

// ---------------------------------------------------------------------------
// 바닥·천장·기둥·계단
// ---------------------------------------------------------------------------
function buildFloor(s,D,idx){
  const color=s.materialColor||FLOOR_COLORS[s.floorMaterial]||FLOOR_COLORS.UNDECIDED;
  const name=s.name||s.type||'공간';
  return {id:s.id,kind:'floor',name,x:0,y:0,rot:0,flip:false,
    prims:[{t:'poly',pts:s.polygon,holes:s.holes||[],z:0.5+idx*0.02,color,side:'top'}],
    meta:{type:s.type,floorMaterial:s.floorMaterial||null,ceilH:num(s.ceilingHeight_mm,0)||D.ceilH}};
}
function buildCeiling(s,D){
  const H=num(s.ceilingHeight_mm,0)||D.ceilH;
  return {id:s.id+'_ceil',kind:'ceiling',name:(s.name||s.type||'공간')+' 천장',x:0,y:0,rot:0,flip:false,
    prims:[{t:'poly',pts:s.polygon,holes:s.holes||[],z:H,color:C.ceiling,side:'bottom'},
           {t:'poly',pts:s.polygon,holes:s.holes||[],z:H+150,color:C.slab,side:'top'}]};
}
function buildPillar(p,D,spaces){
  const H=ceilAt(p,D,spaces);
  const w=num(p.width,500),h=num(p.height,500),t=num(p.thickness,200);
  const prims=[];
  if(p.shape==='circle') prims.push(cyl(0,0,0,w/2,H,C.concrete));
  else if(p.shape==='L'){ prims.push(box(0,-h/2+t/2,0,w,t,H,C.concrete)); prims.push(box(-w/2+t/2,0,0,t,h,H,C.concrete)); }
  else prims.push(box(0,0,0,w,h,H,C.concrete));
  return {id:p.id,kind:'pillar',name:'기둥',x:p.x,y:p.y,rot:num(p.rotation,0),flip:false,prims};
}
function buildStairs(s,D){
  const st=s.stair||{};
  const bb=polyBBox(s.polygon);
  const c=polyCentroid(s.polygon);
  const floorH=Math.max(600,num(st.floorHeight_mm,2800));
  const horizontal=bb.w>=bb.h;
  const run=horizontal?bb.w:bb.h;
  const W=Math.max(300,Math.min(num(st.width_mm,0)||(horizontal?bb.h:bb.w),horizontal?bb.h:bb.w));
  const N=Math.max(2,Math.round(num(st.stepCount,0)||floorH/180));
  const T=run/N, R=floorH/N;
  const prims=[];
  for(let i=0;i<N;i++){
    const a=-run/2+T*i+T/2;
    prims.push(horizontal?box(a,0,0,T,W,R*(i+1),C.wood):box(0,a,0,W,T,R*(i+1),C.wood));
  }
  return {id:s.id+'_stair',kind:'stair',name:(s.name||'계단')+' '+N+'단',x:c.x,y:c.y,rot:num(st.rot,0),flip:false,prims,
    meta:{approx:true,type:st.type||'I'}};
}
function ceilAt(o,D,spaces){
  const sp=(o.spaceId&&spaces.find(s=>s.id===o.spaceId))||spaces.find(s=>pointInPoly(o,s.polygon));
  return Math.round(num(sp&&sp.ceilingHeight_mm,0)||D.ceilH);
}

// ---------------------------------------------------------------------------
// 가구·시설 — 평면 규격(w×d)에 종류별 높이 프로파일을 씌운다
// ---------------------------------------------------------------------------
const FURN_H={ // 단순 상자로 세우는 종류: 높이(mm)
  wardrobe:2100,bookshelf:1800,tv_stand:450,nightstand:500,dressing_table:750,shoe_cab_1200:1000,
  tv_lowcab_2400:450,styler:1850,piano:1000,massage_chair:1100,cat_tower:1500,treadmill:1300,
  fridge_bespoke:1850,fridge_bespoke_kf:1850,fridge_std:1750,fridge_side:1780,fridge:1750,fridge_2door:1780,
  washer_std:850,dryer_std:850,washer:850,dryer:850,
  base_600:870,base_900:870,base_sink_900:870,base_cook_600:870,base_drawer_600:870,corner_base_900:870,
  tall_600:2150,fridge_cab_900:2150,island_1500:900,wardrobe_fix_1200:2300,bath_vanity_900:850,laundry_cab_700:900,
  island:900,home_bar:1050,rug:12,utility_sink:850,urinal:600,
};
const FURN_Z={ wall_600:1450,wall_900:1450,corner_wall_600:1450,urinal:500 }; // 바닥에서 띄우는 종류
const FURN_TOP={ wall_600:2150,wall_900:2150,corner_wall_600:2150 };
const TABLE_H={coffee:450,side_table:550,console:800,dining4:750,dining6:750,dining_round:750,desk:730,desk_l:730,desk_motion:730};
const COLOR_OF={ // 라이브러리 c 가 없을 때
  fridge:C.steel,fridge_2door:C.steel,washer:C.white,dryer:C.white,
};

function libDef(type,LIBS){
  for(const L of LIBS){ if(L&&L[type]) return L[type]; }
  return null;
}
function footprint(o,def){
  const w=num(o.w,0)||num(def&&def.w,0)||num(def&&def.size,0)||400;
  const d=num(o.h,0)||num(def&&def.h,0)||num(def&&def.size,0)||400;
  return {w,d};
}
function sofaPrims(w,d,col,col2){
  const seatH=420,backT=Math.min(250,d*0.3),armW=Math.min(150,w*0.12);
  return [
    box(0,0,0,w,d,seatH,col),
    box(0,-d/2+backT/2,seatH,w,backT,430,col),
    box(-w/2+armW/2,0,seatH,armW,d,180,col),
    box(w/2-armW/2,0,seatH,armW,d,180,col),
    box(0,backT/2,seatH,w-2*armW-10,d-backT-10,90,col2),
  ];
}
function tablePrims(w,d,topH,col){
  const legT=Math.min(60,w*0.08), inset=Math.min(80,w*0.1);
  return [
    box(0,0,topH-30,w,d,30,col),
    box(-w/2+inset,-d/2+inset,0,legT,legT,topH-30,col),
    box(w/2-inset,-d/2+inset,0,legT,legT,topH-30,col),
    box(-w/2+inset,d/2-inset,0,legT,legT,topH-30,col),
    box(w/2-inset,d/2-inset,0,legT,legT,topH-30,col),
  ];
}
function chairPrims(w,d,col){
  const seatH=450;
  return [
    box(0,0,seatH-40,w,d,40,col),
    box(0,-d/2+20,seatH,w,40,450,col),
    box(-w/2+30,-d/2+30,0,30,30,seatH-40,col),
    box(w/2-30,-d/2+30,0,30,30,seatH-40,col),
    box(-w/2+30,d/2-30,0,30,30,seatH-40,col),
    box(w/2-30,d/2-30,0,30,30,seatH-40,col),
  ];
}
function bedPrims(w,d,col){
  const frameH=300;
  const p=[
    box(0,0,0,w,d,frameH,col),
    box(0,20,frameH,w-60,d-100,200,C.mattress),
    box(0,-d/2+30,0,w,60,1000,col),           // 헤드보드 (-y 쪽이 머리)
  ];
  const pw=Math.min(600,w*0.42);
  if(w>=1300){ p.push(box(-w/4,-d/2+280,frameH+200,pw,350,110,C.pillow)); p.push(box(w/4,-d/2+280,frameH+200,pw,350,110,C.pillow)); }
  else p.push(box(0,-d/2+280,frameH+200,pw,350,110,C.pillow));
  p.push(box(0,d*0.18,frameH+200,w-100,d*0.55,60,'#B9C4D0')); // 이불
  return p;
}
function buildFurniture(o,def,kind,D,spaces){
  const {w,d}=footprint(o,def);
  const type=o.type||'';
  const col=(def&&def.c)||COLOR_OF[type]||C.wood;
  const name=(def&&def.name)||type;
  let prims=null;
  if(/^sofa|^lounge_chair$/.test(type)) prims=sofaPrims(w,d,col,C.fabricLight);
  else if(type==='beanbag') prims=[cyl(0,0,0,Math.min(w,d)/2,600,col)];
  else if(TABLE_H[type]!==undefined){
    prims=tablePrims(w,d,TABLE_H[type],col);
    if(type==='desk_l') prims.push(box(-w/2+350,d/2-((d-700)/2),TABLE_H[type]-30,700,d-700,30,col));
    if(type==='dining_round') prims=[cyl(0,0,TABLE_H[type]-30,w/2,30,col),cyl(0,0,0,80,TABLE_H[type]-30,col),cyl(0,0,0,w*0.3,30,col)];
  }
  else if(type==='chair') prims=chairPrims(w,d,col);
  else if(type==='office_chair') prims=[cyl(0,0,0,w*0.5,30,C.dark),cyl(0,0,30,30,420,C.dark),box(0,0,450,w,d,60,col),box(0,-d/2+30,510,w-60,60,550,col)];
  else if(type==='bar_stool') prims=[cyl(0,0,0,w*0.45,20,C.dark),cyl(0,0,20,25,680,C.steel),cyl(0,0,700,w/2,50,col)];
  else if(/^bed_/.test(type)) prims=bedPrims(w,d,col);
  else if(type==='plant') prims=[cyl(0,0,0,w*0.3,320,C.pot),sphere(0,0,320+w*0.45,w*0.5,C.green)];
  else if(type==='mirror') prims=[box(0,0,900,w,d,900,C.glass,{opacity:0.6})];
  else if(type==='system_hanger') prims=[box(0,0,1950,w,d,50,C.steel),box(-w/2+25,0,0,50,50,1950,C.steel),box(w/2-25,0,0,50,50,1950,C.steel),box(0,0,1700,w-100,30,30,C.steel)];
  else if(type==='piano') prims=[box(0,0,0,w,d,1000,col),box(0,d/2-120,650,w,240,40,C.black)];
  else if(type==='treadmill') prims=[box(0,d*0.15,0,w*0.8,d*0.7,150,C.dark),box(0,-d/2+150,0,w,300,1300,C.grey)];
  else if(type==='toilet'||type==='toilet_round'||type==='bidet') prims=[
    box(0,-d/2+115,380,w,230,420,C.ceramic), box(0,d*0.14,0,w*0.9,d*0.62,400,C.ceramic), box(0,d*0.14,400,w*0.92,d*0.66,30,C.white)];
  else if(/^sink_b|^sink_vessel$/.test(type)) prims=[cyl(0,0,0,Math.min(w,d)*0.2,800,C.ceramic),box(0,0,800,w,d,150,C.ceramic)];
  else if(/^sink_counter|^sink_double|^bath_vanity/.test(type)) prims=[box(0,0,0,w,d,850,col),box(0,0,850,w,d,30,C.ceramic),box(0,0,880,w*0.5,d*0.55,110,C.white)];
  else if(/^bathtub/.test(type)) prims=[box(0,0,0,w,d,560,C.ceramic),box(0,0,560,w,d,20,C.white),box(0,0,300,w-160,d-160,281,'#BFD8E6',{opacity:0.5,glass:true})];
  else if(/^shower/.test(type)) prims=[box(0,0,0,w,d,40,C.ceramic),
    box(w/2-5,0,40,10,d,2000,C.glass,{opacity:0.25,glass:true}),box(0,d/2-5,40,w,10,2000,C.glass,{opacity:0.25,glass:true}),
    cyl(-w/2+60,-d/2+60,0,20,2100,C.steel),box(-w/2+60,-d/2+150,2100,80,260,30,C.steel)];
  else if(type==='floor_drain') prims=[box(0,0,0,w,d,6,C.steel)];
  else if(type==='utility_sink') prims=[box(0,0,0,w,d,850,C.ceramic)];
  else if(type==='rug') prims=[box(0,0,0,w,d,FURN_H.rug,col)];
  if(!prims){
    const H=FURN_TOP[type]!==undefined?FURN_TOP[type]-FURN_Z[type]:(FURN_H[type]||(kind==='fixtures'?850:750));
    const z=FURN_Z[type]||0;
    prims=[box(0,0,z,w,d,H,col)];
    if(/^fridge|^washer|^dryer|^styler/.test(type)) prims.push(box(0,d/2-2,z+H*0.35,w-40,4,H*0.6,C.black,{opacity:0.9}));
  }
  return {id:o.id,kind:kind==='fixtures'?'fixture':'furniture',name,x:num(o.x,0),y:num(o.y,0),rot:num(o.angle,0),flip:!!o.flipped,prims,
    meta:{type,w,d}};
}

// ---------------------------------------------------------------------------
// 조명·전기·설비
// ---------------------------------------------------------------------------
function buildLight(o,def,D,spaces){
  const H=ceilAt(o,D,spaces);
  const type=o.type||'';
  const name=(def&&def.name)||type;
  const size=num(o.size_mm,0)||num(def&&def.size,0)||300;
  const L=num(o.length_mm,0)||size;
  const em={emissive:true};
  let prims=[];
  switch(type){
    case 'downlight':{ const r=(DOWNLIGHT_OUTER[Math.round(num(o.inch,3))]||95)/2; prims=[cyl(0,0,H-12,r,12,C.lamp,em)]; break; }
    case 'bath_light':{ const r=(DOWNLIGHT_OUTER[Math.round(num(o.inch,3))]||95)/2+40; prims=[cyl(0,0,H-70,r,70,C.lamp,em)]; break; }
    case 'ceiling': prims=[cyl(0,0,H-90,size/2,90,C.lamp,em)]; break;
    case 'sensor_light': prims=[cyl(0,0,H-50,size/2,50,C.lamp,em)]; break;
    case 'pendant': prims=[cyl(0,0,2050,4,H-2050,C.dark),cyl(0,0,1800,size/2,250,C.lamp,em)]; break;
    case 'pendant_cluster': prims=[cyl(0,0,2050,4,H-2050,C.dark),cyl(-size*0.3,-size*0.2,1900,120,120,C.lamp,em),cyl(size*0.3,-size*0.1,1750,120,120,C.lamp,em),cyl(0,size*0.3,1650,120,120,C.lamp,em)]; break;
    case 'pendant_linear': prims=[cyl(-L/2+100,0,1950,3,H-1950,C.dark),cyl(L/2-100,0,1950,3,H-1950,C.dark),box(0,0,1900,L,60,50,C.lamp,em)]; break;
    case 'chandelier': prims=[cyl(0,0,H-250,4,250,C.dark),cyl(0,0,H-650,size/2,400,C.lamp,em)]; break;
    case 'wall_lamp': prims=[box(0,-40,1800,size,80,size,C.lamp,em)]; break;
    case 'floor_lamp': prims=[cyl(0,0,0,size*0.35,20,C.dark),cyl(0,0,20,14,1480,C.dark),cyl(0,0,1500,size/2,300,C.lamp,em)]; break;
    case 'table_lamp': prims=[cyl(0,0,750,size*0.3,20,C.dark),cyl(0,0,770,10,230,C.dark),cyl(0,0,1000,size/2,220,C.lamp,em)]; break;
    case 'track': prims=[box(0,0,H-40,L,40,40,C.black),cyl(-L/3,0,H-160,45,120,C.lamp,em),cyl(0,0,H-160,45,120,C.lamp,em),cyl(L/3,0,H-160,45,120,C.lamp,em)]; break;
    case 'magnet_track':{ prims=[box(0,0,H-30,L,40,30,C.black)]; const n=Math.max(2,Math.round(L/500)); for(let i=0;i<n;i++) prims.push(cyl(-L/2+L/(n*2)+i*L/n,0,H-140,30,110,C.lamp,em)); break; }
    case 'spot_cyl': prims=[cyl(0,0,H-140,size/2,140,C.black),cyl(0,0,H-145,size*0.38,5,C.lamp,em)]; break;
    case 'spot_bar_3': prims=[box(0,0,H-30,L,50,30,C.black),cyl(-L/3,0,H-150,40,120,C.lamp,em),cyl(0,0,H-150,40,120,C.lamp,em),cyl(L/3,0,H-150,40,120,C.lamp,em)]; break;
    case 'line_t5': case 'line_light': prims=[box(0,0,H-35,L,40,35,C.lamp,em)]; break;
    case 'cove': prims=[box(0,0,H-120,L,80,25,C.lamp,em),box(0,60,H-160,L,40,160,C.ceiling)]; break;
    case 'fluorescent': case 'kitchen_flat': prims=[box(0,0,H-45,L,Math.min(300,L*0.25),45,C.lamp,em)]; break;
    case 'edge_flat_600': prims=[box(0,0,H-15,size,size,15,C.lamp,em)]; break;
    case 'ceiling_fan': prims=[cyl(0,0,H-300,60,300,C.dark),box(0,0,H-330,size,120,20,C.wood),box(0,0,H-330,120,size,20,C.wood)]; break;
    case 'step_light': prims=[box(0,-20,300,size,40,size*0.5,C.lamp,em)]; break;
    default: prims=[cyl(0,0,H-60,size/2,60,C.lamp,em)];
  }
  const lz=prims.reduce((m,p)=>p.emissive?Math.min(m,p.z):m,H); // 광원 높이(포인트라이트용)
  return {id:o.id,kind:'light',name,x:num(o.x,0),y:num(o.y,0),rot:num(o.angle,0),flip:!!o.flipped,prims,
    meta:{type,lightZ:Math.max(100,lz-30),on:o.circuitOn!==false,linear:L!==size?L:0}};
}
const ELEC_Z={outlet_w:300,outlet_w4:300,outlet_f:0,outlet_220:300,outlet_wp:1100,outlet_usb:300,
  switch_1:1200,switch_2:1200,switch_3:1200,switch_4:1200,switch_5:1200,switch_6:1200,switch_3way:1200,dimmer:1200,
  dist_panel:1500,wallpad:1350,doorbell:1300,internet:300,intercom:1400,boiler_ctrl:1300,ac:2000,ac_floor:300};
function buildElectric(o,def,D,spaces){
  const type=o.type||'';
  const name=(def&&def.name)||type;
  const size=num(def&&def.size,0)||num(def&&def.w,0)||120;
  const z=ELEC_Z[type]!==undefined?ELEC_Z[type]:300;
  let prims;
  if(type==='dist_panel') prims=[box(0,-40,z,450,80,600,C.grey)];
  else if(type==='wallpad') prims=[box(0,-12,z,300,24,200,C.black)];
  else if(type==='outlet_f') prims=[box(0,0,0,size,size,8,C.steel)];
  else prims=[box(0,-8,z,Math.min(size,140)*(type.startsWith('switch')?1:1)+(type==='outlet_w4'?80:0),16,Math.min(size,120),C.white)];
  return {id:o.id,kind:'electric',name,x:num(o.x,0),y:num(o.y,0),rot:num(o.angle,0),flip:!!o.flipped,prims,meta:{type}};
}
function buildHvac(o,def,D,spaces){
  const H=ceilAt(o,D,spaces);
  const type=o.type||'';
  const name=(def&&def.name)||type;
  const {w,d}=footprint(o,def);
  let prims;
  switch(type){
    case 'ac_ceiling': case 'ac_4way': case 'ac_2way': case 'ac_1way': case 'ac_duct': case 'erv': prims=[box(0,0,H-45,w,d,45,C.white)]; break;
    case 'diffuser': case 'hvac_grille': case 'vent_fan': prims=[box(0,0,H-25,w,d,25,C.steel)]; break;
    case 'ac_wall': prims=[box(0,-d*0.15,2050,w,d*0.3,300,C.white)]; break;
    case 'ac_stand': prims=[box(0,0,0,w,d,1800,C.white)]; break;
    case 'ac_outdoor': prims=[box(0,0,0,w,d*0.4,700,C.steel)]; break;
    case 'hood': prims=[box(0,0,1500,w,d*0.55,80,C.steel),box(0,-d*0.2,1580,w*0.4,d*0.3,H-1580-1,C.steel)]; break;
    case 'boiler_unit': prims=[box(0,-d*0.3,1200,w,d*0.6,700,C.white)]; break;
    case 'sprinkler': case 'sprinkler_side': case 'smoke_detector': case 'heat_detector': case 'auto_ext': prims=[cyl(0,0,H-40,Math.min(w,d)/2,40,C.white)]; break;
    case 'emerg_light': prims=[box(0,0,H-80,w,d*0.5,80,C.white,{emissive:true})]; break;
    case 'exit_sign': prims=[box(0,-20,2100,w,40,150,'#4CAF50',{emissive:true})]; break;
    case 'fire_ext': prims=[cyl(0,0,0,Math.min(w,d)*0.35,520,'#C62828')]; break;
    case 'hydrant': prims=[box(0,-d*0.3,800,w,d*0.6,1000,'#C62828')]; break;
    case 'emerg_bell': prims=[cyl(0,0,1600,Math.min(w,d)/2,40,'#C62828')]; break;
    default: prims=[box(0,0,H-40,w,d,40,C.white)];
  }
  return {id:o.id,kind:'hvac',name,x:num(o.x,0),y:num(o.y,0),rot:num(o.angle,0),flip:!!o.flipped,prims,meta:{type}};
}

// ---------------------------------------------------------------------------
// 전체 조립
// ---------------------------------------------------------------------------
// libs = {FURNITURE_LIB, FIXFURN_LIB, FIXTURE_LIB, LIGHT_LIB, ELECTRIC_LIB, HVAC_FIRE_LIB} — 없으면 규격만으로 세운다
function buildScene(doc,libs){
  libs=libs||{};
  const D=normalizeDoc(doc);
  const spaceById={}; D.spaces.forEach(s=>{spaceById[s.id]=s;});
  const objects=[];
  const labels=[];
  // 범위
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const grow=(x,y)=>{minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);};
  D.spaces.forEach(s=>s.polygon.forEach(p=>grow(p.x,p.y)));
  D.walls.forEach(w=>{grow(w.x1,w.y1);grow(w.x2,w.y2);});
  if(!isFinite(minX)){ [].concat(D.furniture,D.fixtures,D.lights).forEach(o=>grow(num(o.x,0),num(o.y,0))); }
  if(!isFinite(minX)){ minX=0;minY=0;maxX=1;maxY=1; }
  const bounds={minX,minY,maxX,maxY};
  // 바닥판(전체) — 도면 밑을 받쳐주는 슬래브
  objects.push({id:'_slab',kind:'slab',name:'바닥 슬래브',x:0,y:0,rot:0,flip:false,prims:[
    {t:'poly',pts:[{x:minX-400,y:minY-400},{x:maxX+400,y:minY-400},{x:maxX+400,y:maxY+400},{x:minX-400,y:maxY+400}],holes:[],z:0,color:C.slab,side:'top'},
    box((minX+maxX)/2,(minY+maxY)/2,-200,maxX-minX+800,maxY-minY+800,200,C.slab)]});
  // 공간 바닥·천장·라벨·계단
  D.spaces.forEach((s,i)=>{
    objects.push(buildFloor(s,D,i));
    objects.push(buildCeiling(s,D));
    const c=polyCentroid(s.polygon);
    labels.push({id:s.id,x:c.x,y:c.y,z:1100,text:s.name||s.type||''});
    if(s.type==='STAIRS') objects.push(buildStairs(s,D));
  });
  // 벽 + 개구부 — 정렬 오프셋을 먼저 전부 구해 두어야 모서리 메움이 이웃 몸체를 볼 수 있다
  const offs={}; D.walls.forEach(w=>{ if(!w.isLine) offs[w.id]=wallAlignOffset(w,D); });
  D.walls.forEach(w=>{
    if(w.isLine) return;
    const r=buildWall(w,D,spaceById,offs);
    if(!r) return;
    objects.push(r.wall); r.openings.forEach(o=>objects.push(o));
  });
  // 기둥
  D.pillars.forEach(p=>objects.push(buildPillar(p,D,D.spaces)));
  // 가구·시설
  const FL=[libs.FURNITURE_LIB,libs.FIXFURN_LIB,libs.FIXTURE_LIB];
  D.furniture.forEach(o=>objects.push(buildFurniture(o,libDef(o.type,FL),'furniture',D,D.spaces)));
  D.fixtures.forEach(o=>objects.push(buildFurniture(o,libDef(o.type,[libs.FIXTURE_LIB,libs.FURNITURE_LIB,libs.FIXFURN_LIB]),'fixtures',D,D.spaces)));
  D.lights.forEach(o=>objects.push(buildLight(o,libDef(o.type,[libs.LIGHT_LIB]),D,D.spaces)));
  D.electric.forEach(o=>objects.push(buildElectric(o,libDef(o.type,[libs.ELECTRIC_LIB]),D,D.spaces)));
  D.hvac.forEach(o=>objects.push(buildHvac(o,libDef(o.type,[libs.HVAC_FIRE_LIB]),D,D.spaces)));
  return {bounds,ceilH:D.ceilH,project:D.meta.project||'',objects,labels,
    counts:{spaces:D.spaces.length,walls:D.walls.filter(w=>!w.isLine).length,openings:D.openings.length,
      furniture:D.furniture.length+D.fixtures.length,lights:D.lights.length}};
}

const MC3D={buildScene,normalizeDoc,FLOOR_COLORS,WALL_COLORS,COLORS:C,
  _internal:{buildWall,buildFurniture,buildLight,polyCentroid,polyBBox,pointInPoly,wallAlignOffset,cornerExtension,bearingInteriorSign}};
if(typeof module!=='undefined'&&module.exports) module.exports=MC3D;
root.MC3D=MC3D;
})(typeof window!=='undefined'?window:globalThis);
