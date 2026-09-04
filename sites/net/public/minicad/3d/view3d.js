// ============================================================================
//  MiniCAD 3D 뷰어 v2 (view3d.js) — build3d.js 기본체 → three.js 장면
//  2026-09-03 업그레이드:
//   · 층별 증분 재조립 — 바뀐 층만 다시 만든다 (해시 비교, 대형 다층 도면 대응)
//   · 필요할 때만 렌더 — 카메라·장면이 안 움직이면 GPU 0 (태블릿 배터리·발열)
//   · 3D 직접 편집 — 가구·기구·조명·전기·설비·기둥을 끌어 이동, R 회전, Del 삭제,
//     속성 패널(높이·재질·창턱…) → BroadcastChannel 'edit' 로 MiniCAD 평면에 역반영
//   · 시점 프리셋(아이소/탑/정면/측면), 방 더블클릭 줌, 주/야 무드, 대형 도면 자동 성능 조절
//  좌표: 평면 mm(x→, y↓) → three (X=x/1000, Y=z/1000↑, Z=y/1000). rot(시계방향 도) → rotation.y=-rot
// ============================================================================
import * as THREE from 'three';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
import {GLTFExporter} from '../vendor/three/GLTFExporter.js';

const $=id=>document.getElementById(id);
const MM=1/1000;
// library.js 의 최상위 const 는 window 속성이 아니라 전역 렉시컬 바인딩 (MATS 와 같은 함정)
/* global FURNITURE_LIB, FIXFURN_LIB, FIXTURE_LIB, LIGHT_LIB, ELECTRIC_LIB, HVAC_FIRE_LIB */
const LIBS={
  FURNITURE_LIB:typeof FURNITURE_LIB!=='undefined'?FURNITURE_LIB:null,
  FIXFURN_LIB:typeof FIXFURN_LIB!=='undefined'?FIXFURN_LIB:null,
  FIXTURE_LIB:typeof FIXTURE_LIB!=='undefined'?FIXTURE_LIB:null,
  LIGHT_LIB:typeof LIGHT_LIB!=='undefined'?LIGHT_LIB:null,
  ELECTRIC_LIB:typeof ELECTRIC_LIB!=='undefined'?ELECTRIC_LIB:null,
  HVAC_FIRE_LIB:typeof HVAC_FIRE_LIB!=='undefined'?HVAC_FIRE_LIB:null,
};
const MAX_POINT_LIGHTS=24;
// data.js 의 최상위 const 는 window 속성이 아니라 전역 렉시컬 바인딩 — typeof 로 안전하게 집는다
/* global WALL_MATERIALS, FLOOR_MATERIALS, CEILING_MATERIALS */
const MATS={
  WALL:typeof WALL_MATERIALS!=='undefined'?WALL_MATERIALS:null,
  FLOOR:typeof FLOOR_MATERIALS!=='undefined'?FLOOR_MATERIALS:null,
  CEIL:typeof CEILING_MATERIALS!=='undefined'?CEILING_MATERIALS:null,
};
const MOVABLE=new Set(['furniture','fixture','light','electric','hvac','pillar']);
const KINDMAP={furniture:'furniture',fixture:'fixtures',light:'lights',electric:'electric',hvac:'hvac',
  wall:'wall',floor:'space',door:'opening',window:'opening',pillar:'pillars'};

// ---------------------------------------------------------------------------
// 렌더러·장면·카메라
// ---------------------------------------------------------------------------
const view=$('view');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(view.clientWidth,view.clientHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;          // 장면이 바뀔 때만 그림자 재계산
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
view.appendChild(renderer.domElement);

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0E0F1A);
scene.fog=new THREE.Fog(0x0E0F1A,60,160);

const camera=new THREE.PerspectiveCamera(55,view.clientWidth/view.clientHeight,0.05,400);
camera.position.set(8,9,10);

const hemi=new THREE.HemisphereLight(0xEFEAFF,0x3A2F25,1.25);
scene.add(hemi);
const sun=new THREE.DirectionalLight(0xFFF4E0,2.0);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.02;
scene.add(sun); scene.add(sun.target);

let needRender=true;
function invalidate(shadow){ needRender=true; if(shadow) renderer.shadowMap.needsUpdate=true; }

const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true; orbit.dampingFactor=0.08;
orbit.maxPolarAngle=Math.PI*0.495;
orbit.screenSpacePanning=false;
// 2026-09-03 스케치업식 마우스: 휠버튼 드래그=궤도 · 우클릭 드래그=팬 · 휠=줌 (+좌클릭 빈 곳=궤도 유지)
orbit.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.ROTATE,RIGHT:THREE.MOUSE.PAN};

// ---------------------------------------------------------------------------
// 상태
// ---------------------------------------------------------------------------
const ST={
  mode:'orbit', lightsOn:true, night:false,
  ceil:{orbit:false,walk:true}, labels:true,
  shadows:true, shadowsAuto:true,           // 사용자가 손대기 전엔 자동 성능 조절 대상
  floorSel:'all', floors:[],
  root:null, floorCache:{},                 // floorId → {hash,group,sprites,z0,counts,bounds}
  built:null, doc:null,
  pickables:[], pointLights:[],
  selected:null, selKey:null,               // {floorId,id} — 재조립 후 재선택
  editDrag:null,
  // 2026-09-03 스케치업식 도구: select|move|rotate|pushpull|paint|erase|tape
  tool:'select', op:null, axisLock:null,
  paint:{cat:'wall',code:'WP_SILK'},
  axes:true,          // 2026-09-04 스케치업식 축 표시 (X빨강·평면Y초록·높이 파랑)
  snapData:{},        // 2026-09-04 점·선·면 스냅용 층별 기하 {fid:{verts,walls,spaces,stats}}
  pendingG:[],        // 낙관적 미리보기 — 생성 직후 임시 고스트, 다음 재조립 때 실물로 교체
  walk:{yaw:0,pitch:0,keys:{},eye:1.6,speed:2.2},
  lastDocAt:0,
};

// ---------------------------------------------------------------------------
// 재질 (전역 캐시 — 층 증분 재조립에서도 유지)
// ---------------------------------------------------------------------------
const matCache=new Map();
function matFor(p){
  const key=[p.color,p.opacity??1,p.emissive?1:0,p.glass?1:0].join('|');
  let m=matCache.get(key);
  if(m) return m;
  const col=new THREE.Color(p.color||'#CCCCCC');
  if(p.glass){
    m=new THREE.MeshPhysicalMaterial({color:col,transparent:true,opacity:p.opacity??0.35,roughness:0.08,metalness:0,side:THREE.DoubleSide,depthWrite:false});
  }else{
    m=new THREE.MeshStandardMaterial({color:col,roughness:0.86,metalness:0.02,transparent:(p.opacity??1)<1,opacity:p.opacity??1});
    if(p.emissive){ m.emissive=col.clone(); m.emissiveIntensity=ST.lightsOn?1.4:0; m.roughness=0.5; m.userData.emiss=true; }
  }
  m.name='MC_'+String(p.color||'CCC').replace('#','')+(p.glass?'_glass':'')+(p.emissive?'_emit':''); // Blender 재질 매핑용 이름
  matCache.set(key,m);
  return m;
}
// --- 바닥 프로시저럴 텍스처 (2026-09-03) — 원목 널결·타일 줄눈·마블 결, 재질 코드별 캔버스 생성 ---
const texCache=new Map();
function _texCanvas(code){
  const c=document.createElement('canvas'); c.width=256; c.height=256;
  const x=c.getContext('2d');
  const base=MC3D.FLOOR_COLORS[code]||'#C9B8A3';
  x.fillStyle=base; x.fillRect(0,0,256,256);
  const shade=a=>'rgba(0,0,0,'+a+')', lite=a=>'rgba(255,255,255,'+a+')';
  const wood=rows=>{
    const h=256/rows;
    for(let r=0;r<rows;r++){
      x.fillStyle=(r%2?shade(0.05):lite(0.045)); x.fillRect(0,r*h,256,h);
      x.strokeStyle=shade(0.30); x.lineWidth=1.4;
      x.beginPath(); x.moveTo(0,r*h+0.5); x.lineTo(256,r*h+0.5); x.stroke();      // 널 사이 줄
      const off=(r*97)%256;
      x.beginPath(); x.moveTo(off,r*h); x.lineTo(off,(r+1)*h); x.stroke();        // 마구리 조인트
      x.strokeStyle=shade(0.06);
      for(let i=0;i<5;i++){ const y=r*h+(i+0.5)*h/5; x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(80,y+3,170,y-3,256,y+1); x.stroke(); } // 나뭇결
    }
  };
  const tile=(n,groutA)=>{
    const s=256/n;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){ x.fillStyle=((i+j)%2?lite(0.035):shade(0.03)); x.fillRect(i*s,j*s,s,s); }
    x.strokeStyle=shade(groutA); x.lineWidth=3;
    for(let i=0;i<=n;i++){ x.beginPath(); x.moveTo(i*s,0); x.lineTo(i*s,256); x.stroke(); x.beginPath(); x.moveTo(0,i*s); x.lineTo(256,i*s); x.stroke(); }
  };
  const noise=(nn,a)=>{ for(let i=0;i<nn;i++){ x.fillStyle=(i%2?shade(a):lite(a)); x.fillRect(Math.random()*256,Math.random()*256,2,2); } };
  let S=1.2; // 캔버스 한 장이 덮는 실제 크기(m)
  if(/^(STRONG|WOOD|REINFORCED|WOOD_TILE)$/.test(code)) wood(4);
  else if(/^(LVT|PVC)$/.test(code)){ wood(5); S=1.0; }
  else if(code==='TILE_BATH'){ tile(4,0.28); S=1.2; }               // 300각
  else if(/^(TILE_PORC|TILE_POLISHED)$/.test(code)){ tile(2,0.22); S=1.2; } // 600각
  else if(code==='MARBLE'){
    tile(1,0.10);
    x.strokeStyle=lite(0.28); x.lineWidth=1.2;
    for(let i=0;i<6;i++){ x.beginPath(); x.moveTo((i*43)%256,0); x.bezierCurveTo((i*91)%256,85,(i*137)%256,170,(i*61)%256,256); x.stroke(); }
    S=1.6;
  }
  else if(code==='CARPET'){ noise(700,0.06); S=0.8; }
  else { noise(400,0.05); S=1.0; }
  return {canvas:c,S};
}
function floorMat(code){
  let m=texCache.get(code);
  if(m) return m;
  const {canvas,S}=_texCanvas(code);
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.repeat.set(1/S,1/S);                 // ShapeGeometry UV = m 단위 → 한 장 = S m
  tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  m=new THREE.MeshStandardMaterial({map:tex,metalness:0.02,side:THREE.DoubleSide,
    roughness:/TILE|MARBLE|POLISH|EPOXY/.test(code)?0.35:0.8});
  texCache.set(code,m);
  return m;
}
const geoBox=new THREE.BoxGeometry(1,1,1);
const geoCyl=new THREE.CylinderGeometry(1,1,1,28);
const geoSph=new THREE.SphereGeometry(1,20,14);

// ---------------------------------------------------------------------------
// 기본체 → 메시
// ---------------------------------------------------------------------------
function primMesh(p,obj){
  let mesh;
  if(p.t==='box'){
    mesh=new THREE.Mesh(geoBox,matFor(p));
    mesh.scale.set(Math.max(p.w,1)*MM,Math.max(p.h,1)*MM,Math.max(p.d,1)*MM);
    mesh.position.set(p.x*MM,(p.z+p.h/2)*MM,p.y*MM);
  }else if(p.t==='cyl'){
    mesh=new THREE.Mesh(geoCyl,matFor(p));
    mesh.scale.set(Math.max(p.r,1)*MM,Math.max(p.h,1)*MM,Math.max(p.r,1)*MM);
    mesh.position.set(p.x*MM,(p.z+p.h/2)*MM,p.y*MM);
  }else if(p.t==='sphere'){
    mesh=new THREE.Mesh(geoSph,matFor(p));
    mesh.scale.setScalar(Math.max(p.r,1)*MM);
    mesh.position.set(p.x*MM,p.z*MM,p.y*MM);
  }else if(p.t==='poly'){
    if(!p.pts||p.pts.length<3) return null;
    const shape=new THREE.Shape(p.pts.map(q=>new THREE.Vector2(q.x*MM,-q.y*MM)));
    (p.holes||[]).forEach(h=>{ if(h&&h.length>=3) shape.holes.push(new THREE.Path(h.map(q=>new THREE.Vector2(q.x*MM,-q.y*MM)))); });
    const g=new THREE.ShapeGeometry(shape);
    let m;
    if(p.mcode){ m=floorMat(p.mcode); }                    // 바닥은 재질 코드 → 프로시저럴 텍스처
    else { m=matFor(p).clone(); m.side=THREE.DoubleSide; }
    mesh=new THREE.Mesh(g,m);
    mesh.rotation.x=-Math.PI/2;
    mesh.position.y=p.z*MM;
  }
  if(!mesh) return null;
  const structural=obj.kind==='wall'||obj.kind==='pillar'||obj.kind==='stair';
  mesh.castShadow=structural||obj.kind==='furniture'||obj.kind==='fixture'||obj.kind==='door';
  mesh.receiveShadow=obj.kind==='floor'||obj.kind==='slab'||structural||obj.kind==='furniture'||obj.kind==='fixture';
  mesh.userData.obj=obj;
  mesh.name=obj.name||obj.kind;
  return mesh;
}
function makeLabel(text){
  const c=document.createElement('canvas');
  const ctx=c.getContext('2d');
  ctx.font='700 34px "Inter Tight","Noto Sans KR",sans-serif';
  const w=Math.ceil(ctx.measureText(text).width)+44;
  c.width=Math.max(64,w); c.height=64;
  ctx.font='700 34px "Inter Tight","Noto Sans KR",sans-serif';
  ctx.fillStyle='rgba(26,27,46,0.82)';
  ctx.beginPath(); ctx.roundRect(2,6,c.width-4,52,14); ctx.fill();
  ctx.strokeStyle='#C9A961'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#F5F1EB'; ctx.textBaseline='middle'; ctx.textAlign='center';
  ctx.fillText(text,c.width/2,33);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  const s=0.0075; sp.scale.set(c.width*s,c.height*s,1);
  sp.renderOrder=999;
  return sp;
}

// ---------------------------------------------------------------------------
// 장면 조립 — 층별 증분 (바뀐 층만 다시 만든다)
// ---------------------------------------------------------------------------
function strHash(s){let h=5381;for(let i=0;i<s.length;i++){h=((h*33)^s.charCodeAt(i))>>>0;}return h;}
function disposeGroup(g){
  g.traverse(o=>{
    if(o.isMesh&&o.geometry&&o.geometry!==geoBox&&o.geometry!==geoCyl&&o.geometry!==geoSph) o.geometry.dispose();
    if(o.isSprite){ if(o.material.map)o.material.map.dispose(); o.material.dispose(); }
  });
  if(g.parent) g.parent.remove(g);
}
function addObjGroup(parent,obj){
  const g=new THREE.Group();
  g.name=obj.kind+':'+(obj.name||obj.id);
  g.position.set(obj.x*MM,0,obj.y*MM);
  g.rotation.y=-(obj.rot||0)*Math.PI/180;
  if(obj.flip) g.scale.x=-1;
  g.userData.obj=obj;
  obj.prims.forEach(p=>{const m=primMesh(p,obj);if(m)g.add(m);});
  parent.add(g);
  return g;
}
function build(doc){
  ST.doc=doc;
  ST.pendingG.forEach(g=>{ scene.remove(g); }); ST.pendingG=[]; // 실물이 왔으니 임시 고스트 제거
  const d=(doc&&doc.data&&!doc.walls&&!doc.floors)?doc.data:doc||{};
  if(!ST.root){ ST.root=new THREE.Group(); ST.root.name='MiniCAD'; scene.add(ST.root); }
  const fls=MC3D.splitFloors(d);
  const keep=new Set();
  const floorsOut=[];
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  let z0=0,project='',ceilH=2400;
  const counts={spaces:0,walls:0,openings:0,furniture:0,lights:0};
  fls.forEach(f=>{
    const D=MC3D.normalizeDoc(f.doc);
    project=project||D.meta.project||'';
    // 점·선·면 스냅 데이터 (2026-09-04) — 층별 점(끝점)·선(벽)·면(공간)과 그룹 통계
    ST.snapData[f.id]={
      verts:D.walls.filter(w=>!w.isLine).flatMap(w=>[{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}]),
      walls:D.walls.filter(w=>!w.isLine).map(w=>({x1:w.x1,y1:w.y1,x2:w.x2,y2:w.y2})),
      spaces:D.spaces.map(s=>({id:s.id,poly:s.polygon})),
      stats:(()=>{const st={};D.spaces.forEach(s=>{st[s.id]={walls:0,items:0};});
        D.walls.forEach(w=>{if(w.spaceId&&st[w.spaceId])st[w.spaceId].walls++;});
        [D.furniture,D.fixtures,D.lights,D.electric,D.hvac].forEach(arr=>arr.forEach(o=>{if(o.spaceId&&st[o.spaceId])st[o.spaceId].items++;}));
        return st;})(),
    };
    ceilH=Math.max(ceilH,D.ceilH);
    const fh=MC3D.floorHeightOf(D)+MC3D.SLAB_T;
    const hash=strHash(JSON.stringify(f.doc||{}));
    let ent=ST.floorCache[f.id];
    if(!ent||ent.hash!==hash){                    // 이 층만 재조립
      if(ent) disposeGroup(ent.group);
      const one=MC3D.buildFloorScene(D,LIBS);
      const fg=new THREE.Group();
      fg.name='floor:'+(f.name||f.id);
      fg.userData.floorId=f.id;
      const sprites=[];
      one.objects.forEach(obj=>{ obj.floorId=f.id; obj.floorName=f.name; addObjGroup(fg,obj); });
      one.labels.forEach(l=>{
        if(!l.text) return;
        const sp=makeLabel(l.text);
        sp.position.set(l.x*MM,l.z*MM,l.y*MM);
        fg.add(sp); sprites.push(sp);
      });
      ST.root.add(fg);
      ent={hash,group:fg,sprites,bounds:one.bounds,counts:one.counts};
      ST.floorCache[f.id]=ent;
    }
    ent.z0=z0;
    ent.group.position.y=z0*MM;
    keep.add(f.id);
    Object.keys(counts).forEach(k=>{counts[k]+=(ent.counts&&ent.counts[k])||0;});
    minX=Math.min(minX,ent.bounds.minX);minY=Math.min(minY,ent.bounds.minY);
    maxX=Math.max(maxX,ent.bounds.maxX);maxY=Math.max(maxY,ent.bounds.maxY);
    floorsOut.push({id:f.id,name:f.name||((f.level||1)+'층'),level:f.level||1,z0,height:fh,active:!!f.active});
    z0+=fh;
  });
  Object.keys(ST.floorCache).forEach(k=>{ if(!keep.has(k)){ disposeGroup(ST.floorCache[k].group); delete ST.floorCache[k]; delete ST.snapData[k]; } });
  ST.floors=floorsOut;
  if(ST.floorSel!=='all'&&!floorsOut.some(f=>f.id===ST.floorSel)) ST.floorSel='all';
  ST.built={bounds:{minX,minY,maxX,maxY},ceilH,project,floors:floorsOut,counts,totalHeight:z0};
  rebuildPickables();
  retunePointLights();
  renderFloorButtons();
  refreshVisibility();
  autoPerf();
  reselect();
  // 태양·그림자 범위
  const cx=(minX+maxX)/2*MM, cz=(minY+maxY)/2*MM;
  const span=Math.max(maxX-minX,maxY-minY,1000)*MM;
  sun.position.set(cx+span*0.5,span*0.9+z0*MM+6,cz+span*0.35);
  sun.target.position.set(cx,0,cz);
  const sc=sun.shadow.camera; sc.left=-span*0.8; sc.right=span*0.8; sc.top=span*0.8; sc.bottom=-span*0.8; sc.near=0.5; sc.far=span*3+z0*MM+20; sc.updateProjectionMatrix();
  const projEl=$('proj'); if(projEl) projEl.textContent=project?' · '+project:'';
  $('empty').style.display='none';
  buildAxes();
  invalidate(true);
}
// --- 축 표시 (스케치업 R/G/B) — X=빨강, 평면 Y=초록, 높이=파랑 ---
let axesGrp=null;
function buildAxes(){
  if(axesGrp){ scene.remove(axesGrp); axesGrp.traverse(o=>{if(o.geometry)o.geometry.dispose();}); }
  axesGrp=new THREE.Group(); axesGrp.name='axes';
  const b=ST.built?ST.built.bounds:{minX:-5000,minY:-5000,maxX:5000,maxY:5000};
  const S=Math.max(b.maxX-b.minX,b.maxY-b.minY,4000)*MM*0.9+3;
  const mk=(a,c,col)=>{
    const g=new THREE.BufferGeometry().setFromPoints([a,c]);
    const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.55}));
    axesGrp.add(l);
  };
  const y=0.005;
  mk(new THREE.Vector3(-S,y,0),new THREE.Vector3(S,y,0),0xE24C4C);   // X 빨강
  mk(new THREE.Vector3(0,y,-S),new THREE.Vector3(0,y,S),0x4CAF50);   // 평면 Y 초록
  mk(new THREE.Vector3(0,0,0),new THREE.Vector3(0,S*0.6,0),0x4C7DE2);// 높이 파랑
  axesGrp.visible=ST.axes;
  scene.add(axesGrp);
}
function setAxes(on){ ST.axes=on; if(axesGrp) axesGrp.visible=on; refreshStylePanel(); invalidate(); }
function rebuildPickables(){
  ST.pickables=[];
  ST.root&&ST.root.traverse(o=>{ if(o.isMesh&&o.userData.obj&&o.userData.obj.kind!=='slab') ST.pickables.push(o); });
}
function retunePointLights(){
  ST.pointLights.forEach(pl=>{ if(pl.parent) pl.parent.remove(pl); });
  ST.pointLights=[];
  const lightGroups=[];
  ST.root&&ST.root.children.forEach(fg=>fg.children.forEach(g=>{ if(g.userData.obj&&g.userData.obj.kind==='light') lightGroups.push(g); }));
  const stride=Math.max(1,Math.ceil(lightGroups.length/MAX_POINT_LIGHTS));
  lightGroups.forEach((g,i)=>{
    if(i%stride!==0) return;
    const obj=g.userData.obj;
    const pl=new THREE.PointLight(0xFFE7B8,obj.meta&&obj.meta.linear?9:6,7,2);
    pl.position.set(0,((obj.meta&&obj.meta.lightZ)||2200)*MM,0);
    pl.visible=ST.lightsOn;
    g.add(pl); ST.pointLights.push(pl);
  });
}
function autoPerf(){
  const n=ST.pickables.length;
  renderer.setPixelRatio(n>6000?1:n>3000?1.5:Math.min(window.devicePixelRatio||1,2));
  if(ST.shadowsAuto){
    const want=n<=3500;
    if(want!==ST.shadows){ setShadows(want,true); setStatus(statusLive,_statusTxt+(want?'':' · 대형 도면 — 그림자 자동 OFF')); }
  }
}

// ---------------------------------------------------------------------------
// 가시성 (층 필터·천장·이름표 한 곳에서)
// ---------------------------------------------------------------------------
function floorOK(fid){ return ST.floorSel==='all'||fid===ST.floorSel; }
function _selFloorZ0(){ const f=ST.floors.find(x=>x.id===ST.floorSel); return f?f.z0*MM:0; }
function refreshVisibility(){
  if(!ST.root) return;
  ST.root.children.forEach(fg=>{
    const ok=floorOK(fg.userData.floorId);
    fg.visible=ok;
    if(!ok) return;
    fg.children.forEach(g=>{
      if(g.isSprite){ g.visible=ST.labels&&ST.mode==='orbit'; return; }
      const o=g.userData.obj; if(!o) return;
      if(o.kind==='ceiling') g.visible=ST.ceil[ST.mode];
    });
  });
  invalidate(true);
}
function renderFloorButtons(){
  const el=$('floors'); if(!el) return;
  el.innerHTML='';
  if(ST.floors.length<2) return;
  const mk=(label,val,title)=>{
    const b=document.createElement('button');
    b.className='btn sm'+(ST.floorSel===val?' on':'');
    b.textContent=label; if(title) b.title=title;
    b.onclick=()=>{
      ST.floorSel=val; renderFloorButtons(); refreshVisibility(); select(null);
      if(ST.mode==='walk'&&val!=='all'){ camera.position.y=_selFloorZ0()+ST.walk.eye; applyWalkCamera(); }
    };
    el.appendChild(b);
  };
  mk('전층','all','모든 층을 쌓아서');
  ST.floors.slice().sort((a,b)=>(a.level||0)-(b.level||0)).forEach(f=>mk(f.name,f.id,'이 층만'));
}

// ---------------------------------------------------------------------------
// 모드·토글·시점
// ---------------------------------------------------------------------------
function setMode(m){
  if(ST.mode===m) return;
  ST.mode=m;
  $('b-orbit').classList.toggle('on',m==='orbit');
  $('b-walk').classList.toggle('on',m==='walk');
  $('walkpad').style.display=(m==='walk'&&('ontouchstart' in window))?'grid':'none';
  orbit.enabled=(m==='orbit');
  if(m==='walk'){
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    ST.walk.yaw=Math.atan2(-dir.x,-dir.z); ST.walk.pitch=0;
    camera.position.set(orbit.target.x,_selFloorZ0()+ST.walk.eye,orbit.target.z);
    applyWalkCamera();
  }else{
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    orbit.target.copy(camera.position).addScaledVector(dir,4); orbit.target.y=0.6;
    camera.position.y=Math.max(camera.position.y,3);
    orbit.update();
  }
  refreshVisibility();
  $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]);
}
function setLights(on){
  ST.lightsOn=on;
  $('b-light').classList.toggle('on',on);
  ST.pointLights.forEach(l=>{l.visible=on;});
  matCache.forEach(m=>{ if(m.userData.emiss) m.emissiveIntensity=on?1.4:0; });
  applyMood();
}
function setNight(on){
  ST.night=on;
  $('b-night').classList.toggle('on',on);
  if(on&&!ST.lightsOn){ setLights(true); return; }
  applyMood();
}
function applyMood(){
  if(ST.night){ hemi.intensity=0.32; sun.intensity=0.22; scene.background.set(0x07070F); scene.fog.color.set(0x07070F); }
  else{ hemi.intensity=ST.lightsOn?1.25:1.6; sun.intensity=ST.lightsOn?2.0:2.6; scene.background.set(0x0E0F1A); scene.fog.color.set(0x0E0F1A); }
  invalidate(true);
}
function setShadows(on,auto){
  ST.shadows=on;
  if(!auto) ST.shadowsAuto=false;
  $('b-shadow').classList.toggle('on',on);
  renderer.shadowMap.enabled=on; sun.castShadow=on;
  invalidate(true);
}
function setView(name){
  if(!ST.built) return;
  const b=ST.built.bounds, cx=(b.minX+b.maxX)/2*MM, cz=(b.minY+b.maxY)/2*MM;
  const span=Math.max(b.maxX-b.minX,b.maxY-b.minY,4000)*MM;
  const midY=(ST.built.totalHeight||2700)*MM/2;
  setMode('orbit');
  orbit.target.set(cx,Math.min(midY,1.2),cz);
  if(name==='top') camera.position.set(cx+0.01,span*1.5+ST.built.totalHeight*MM,cz+0.01);
  else if(name==='front') camera.position.set(cx,midY+span*0.12,cz+(b.maxY-b.minY)*MM/2+span*1.05);
  else if(name==='side') camera.position.set(cx+(b.maxX-b.minX)*MM/2+span*1.05,midY+span*0.12,cz);
  else camera.position.set(cx+span*0.35,span*0.95+2,cz+span*0.85); // iso
  orbit.update(); invalidate();
}
function fitView(){
  if(!ST.built) return;
  if(ST.mode==='orbit'){ setView('iso'); return; }
  const l=labelFor(ST.floorSel);
  const b=ST.built.bounds;
  camera.position.set(l?l.x:(b.minX+b.maxX)/2*MM,_selFloorZ0()+ST.walk.eye,l?l.z:(b.minY+b.maxY)/2*MM);
  ST.walk.yaw=Math.PI*0.75; ST.walk.pitch=-0.05;
  applyWalkCamera();
}
function labelFor(sel){
  let found=null;
  ST.root&&ST.root.children.forEach(fg=>{
    if(found||(sel!=='all'&&fg.userData.floorId!==sel)) return;
    fg.children.forEach(g=>{ if(!found&&g.isSprite){const p=new THREE.Vector3();g.getWorldPosition(p);found={x:p.x,z:p.z};} });
  });
  return found;
}

// ---------------------------------------------------------------------------
// 걷기 조작
// ---------------------------------------------------------------------------
function applyWalkCamera(){
  const w=ST.walk;
  w.pitch=Math.max(-1.2,Math.min(1.2,w.pitch));
  const dir=new THREE.Vector3(-Math.sin(w.yaw)*Math.cos(w.pitch),Math.sin(w.pitch),-Math.cos(w.yaw)*Math.cos(w.pitch));
  camera.lookAt(camera.position.clone().add(dir));
  invalidate();
}
function stepWalk(dt){
  const w=ST.walk,k=w.keys;
  let fx=0,fz=0,up=0;
  if(k['w']||k['arrowup']) fz+=1; if(k['s']||k['arrowdown']) fz-=1;
  if(k['a']||k['arrowleft']) fx-=1; if(k['d']||k['arrowright']) fx+=1;
  if(k['q']) up+=1; if(k['e']) up-=1;
  if(!fx&&!fz&&!up) return false;
  const sp=w.speed*dt*(k['shift']?2:1);
  const fwd=new THREE.Vector3(-Math.sin(w.yaw),0,-Math.cos(w.yaw));
  const right=new THREE.Vector3(Math.cos(w.yaw),0,-Math.sin(w.yaw));
  camera.position.addScaledVector(fwd,fz*sp).addScaledVector(right,fx*sp);
  const yMax=(ST.built&&ST.built.totalHeight?ST.built.totalHeight*MM:4)+2;
  camera.position.y=Math.max(0.3,Math.min(yMax,camera.position.y+up*sp));
  applyWalkCamera();
  return true;
}

// ---------------------------------------------------------------------------
// 선택·편집 (3D → 평면 역반영)
// ---------------------------------------------------------------------------
const ray=new THREE.Raycaster();
const tip=$('tip');
function hideTip(){ tip.style.display='none'; }
function describe(obj){
  const m=obj.meta||{};
  if(obj.kind==='wall') return `${obj.name} <small>${m.L}×${m.t}mm · 높이 ${m.H}</small>`;
  if(obj.kind==='floor') return `${obj.name} <small>바닥 · 천장 ${m.ceilH}</small>`;
  if(obj.kind==='door'||obj.kind==='window') return `${obj.name} <small>${m.subType||''}${m.sill?' · 창턱 '+m.sill:''}</small>`;
  if(obj.kind==='furniture'||obj.kind==='fixture') return `${obj.name} <small>${m.w}×${m.d}mm</small>`;
  if(obj.kind==='light') return `${obj.name} <small>${m.type}${m.linear?' · '+(m.linear/1000).toFixed(1)+'m':''}</small>`;
  return `${obj.name} <small>${m.type||obj.kind}</small>`;
}
function findGroup(floorId,id){
  const ent=ST.floorCache[floorId]; if(!ent) return null;
  let found=null;
  ent.group.children.forEach(g=>{ if(!found&&g.userData.obj&&g.userData.obj.id===id) found=g; });
  return found;
}
function select(g,opts){
  if(ST.selected){
    ST.selected.traverse(o=>{ if(o.isMesh&&o.userData._mat){o.material=o.userData._mat;delete o.userData._mat;} });
  }
  ST.selected=g;
  ST.selKey=g?{floorId:g.userData.obj.floorId,id:g.userData.obj.id}:null;
  if(!g){ hideTip(); renderProps(null); invalidate(); return; }
  g.traverse(o=>{
    if(!o.isMesh) return;
    o.userData._mat=o.material;
    const m=o.material.clone(); m.emissive=new THREE.Color('#C9A961'); m.emissiveIntensity=0.45; o.material=m;
  });
  renderProps(g.userData.obj);
  invalidate();
}
function reselect(){
  if(!ST.selKey) return;
  const g=findGroup(ST.selKey.floorId,ST.selKey.id);
  if(g) select(g,{silent:true}); else { ST.selected=null; ST.selKey=null; renderProps(null); hideTip(); }
}
let chan=null;
function sendEdit(op,obj,patch){
  if(!chan){ setStatus(false,'MiniCAD 창이 없어 반영 못함'); return false; }
  chan.postMessage({type:'edit',op,kind:KINDMAP[obj.kind],id:obj.id,floorId:obj.floorId,patch:patch||{}});
  return true;
}
function hitAt(cx,cy){
  const r=renderer.domElement.getBoundingClientRect();
  const nd=new THREE.Vector2(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);
  ray.setFromCamera(nd,camera);
  const hits=ray.intersectObjects(ST.pickables,false).filter(h=>{
    let o=h.object; while(o){ if(o.visible===false) return false; o=o.parent; } return true;
  });
  return hits.length?hits[0]:null;
}
function pick(cx,cy){
  const hit=hitAt(cx,cy);
  if(!hit){ select(null); return; }
  const g=hit.object.parent;
  if(ST.selected===g){ select(null); return; }
  select(g);
  const o=g.userData.obj;
  tip.innerHTML=(o.floorName&&ST.floorSel==='all'?o.floorName+' · ':'')+describe(o);
  tip.style.display='block';
  tip.style.left=Math.min(cx+14,window.innerWidth-tip.offsetWidth-8)+'px';
  tip.style.top=Math.min(cy+14,window.innerHeight-tip.offsetHeight-8)+'px';
}
function zoomTo(g){
  const box=new THREE.Box3().setFromObject(g);
  if(box.isEmpty()) return;
  const c=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3());
  const span=Math.max(size.x,size.z,1.5);
  setMode('orbit');
  orbit.target.copy(c); orbit.target.y=Math.max(0.4,c.y*0.5);
  camera.position.set(c.x+span*0.5,Math.max(size.y,1)+span*0.9,c.z+span*0.95);
  orbit.update(); invalidate();
}
// ---------------------------------------------------------------------------
// 스케치업식 도구 체계 (2026-09-03)
//  Space 선택 · M 이동 · Q 회전 · P 밀기끌기 · B 페인트 · E 지우개 · T 줄자
//  방식도 스케치업식: 클릭-이동-클릭(스티키), 동작 중 숫자 입력(VCB)=정확한 값, ←→=축 고정, Esc=취소
//  "그 이상": 모든 편집이 평면도·견적에 실시간 반영, Ctrl+Z/Y 는 MiniCAD 히스토리로 왕복
// ---------------------------------------------------------------------------
const dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const dragPt=new THREE.Vector3();
let drag=null; // 클릭/드래그 판별
const vcb=$('vcb');
function vcbShow(label,val,unit){
  if(!vcb) return;
  vcb.style.display='flex';
  vcb.querySelector('.v-l').textContent=label;
  const i=vcb.querySelector('.v-v');
  if(document.activeElement!==i) i.value=(val===''?'':String(val));
  vcb.querySelector('.v-u').textContent=unit;
}
function vcbHide(){ if(vcb){vcb.style.display='none';vcb.querySelector('.v-v').value='';} }
function vcbTyped(){ const i=vcb&&vcb.querySelector('.v-v'); const v=i?parseFloat(i.value):NaN; return isFinite(v)?v:null; }
function vcbPair(){ // 사각형 치수 입력 "3000,2000" · "3000x2000" (스케치업 Measurements)
  const i=vcb&&vcb.querySelector('.v-v'); if(!i) return null;
  const m=String(i.value).match(/([\d.]+)\s*[,xX*]\s*([\d.]+)/);
  return m?{w:parseFloat(m[1]),h:parseFloat(m[2])}:null;
}
function rayFromEvent(e){
  const r=renderer.domElement.getBoundingClientRect();
  const nd=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(nd,camera);
}
function setTool(t){
  cancelOp();
  clearGhost();
  hideSnap();
  ST.tool=t;
  document.querySelectorAll('#tools .btn').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  if(t==='paint') openTraySec('mat');    // 트레이(우측)의 재질 패널 열기 — 스케치업 Default Tray
  if(t==='add') openTraySec('comp');
  if(t==='add'&&ST.add&&ST.add.type) makeGhost();
  // 스케치업식 카메라 도구: H 팬 / Z 줌 은 좌클릭 드래그를 그 동작으로
  orbit.mouseButtons.LEFT=(t==='pan')?THREE.MOUSE.PAN:(t==='zoom')?THREE.MOUSE.DOLLY:THREE.MOUSE.ROTATE;
  renderer.domElement.style.cursor={select:'default',move:'move',rotate:'grab',scale:'nwse-resize',line:'crosshair',rect:'crosshair',pushpull:'ns-resize',paint:'copy',erase:'not-allowed',tape:'crosshair',pan:'grab',zoom:'zoom-in',add:'copy'}[t]||'default';
  setStatus(statusLive,{select:'➤ 선택',move:'✥ 이동',rotate:'↻ 회전',scale:'⤢ 배율',line:'╱ 선(벽)',rect:'▭ 사각형(벽)',pushpull:'⇕ 밀기끌기',paint:'🪣 페인트',erase:'🧽 지우개',tape:'📏 줄자',pan:'🖐 팬',zoom:'🔍 줌',add:'➕ 배치'}[t]||'');
  // 하단 상태바 = 스케치업식 도구 안내 (수정자 포함)
  const hint=$('hint');
  if(hint) hint.innerHTML={
    select:'<b>선택</b> — 클릭=속성 · 끌면 이동 · <b>Ctrl+끌기=복사</b> · Del=삭제 | Space M Q S P B E T · H팬 Z줌 · Shift+Z 전체',
    move:'<b>이동</b> — 클릭해 집고 → 옮겨서 → 클릭 확정 · <b>Ctrl=복사</b> · ←→ 축 고정 · <b>숫자=거리(mm)</b> · Esc 취소',
    rotate:'<b>회전</b> — 객체 클릭 후 좌우로 · 클릭=확정 · 15° 스냅(Shift=자유각) · <b>숫자=각도</b> · Esc 취소',
    scale:'<b>배율</b> — 객체 클릭 후 위아래로 · 클릭=확정 · <b>숫자=배율</b>(예: 1.5) · 가구·기구·설비만',
    line:'<b>선</b> — 클릭-클릭 사슬 · <b>면 위를 가로지르면 면이 나뉨</b> · 빈 곳=벽 · 끝점(초록)/중간점(청록)/선 위(빨강) 스냅 · 숫자=길이 · Esc/더블클릭=끝',
    rect:'<b>사각형</b> — 두 모서리 클릭 = <b>면 생성</b>(점 4·선 4·면 1 이 한 그룹) · 스냅 흡착 · Ctrl+Z 한 번에 취소',
    pushpull:'<b>밀기끌기</b> — 벽·천장 클릭 후 위아래 · 클릭=확정 · <b>숫자=mm</b> · <b>더블클릭=직전 값 반복</b>',
    paint:'<b>페인트</b> — 왼쪽 팔레트에서 재질 고르고 벽/바닥/천장 클릭 (견적 연동)',
    erase:'<b>지우개</b> — 클릭=삭제 (벽·공간은 평면에서)',
    tape:'<b>줄자</b> — 두 점 클릭 = 거리(mm) · Esc 초기화',
    pan:'<b>팬</b> — 끌어서 화면 이동 (우클릭 드래그와 같음)',
    zoom:'<b>줌</b> — 위아래로 끌어 확대/축소 (휠과 같음)',
    add:'<b>배치</b> — 오른쪽 구성요소에서 골라 바닥 클릭 · R=회전 · 계속 배치 · Esc=끝 (평면·견적 반영)',
  }[t]||'';
  const ins=$('instructor'); if(ins&&hint) ins.innerHTML=hint.innerHTML; // 강사 패널(스케치업 Instructor)
}
// --- 배치 (➕) — 3D 에서 라이브러리 객체를 새로 놓는다 ---
let _ghost=null;
function clearGhost(){ if(_ghost){ scene.remove(_ghost); _ghost=null; if(ST.add) ST.add.ghost=null; invalidate(); } }
function makeGhost(){
  clearGhost();
  const a=ST.add; if(!a||!a.type) return;
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0xD4FF3D,transparent:true,opacity:0.35,depthWrite:false});
  try{
    if(a.kind==='furniture'||a.kind==='fixtures'){
      const built=MC3D._internal.buildFurniture({id:'_g',type:a.type,x:0,y:0,angle:0},a.def,a.kind,{ceilH:2400},[]);
      built.prims.forEach(p=>{ const m=primMesh(p,{kind:'ghost',name:'',prims:[]}); if(m){ m.material=mat; m.castShadow=false; m.receiveShadow=false; g.add(m); } });
    }else{
      const w=((a.def&&(a.def.w||a.def.size))||300)*MM, d=((a.def&&(a.def.h||a.def.size))||300)*MM;
      const m=new THREE.Mesh(geoBox,mat); m.scale.set(w,0.05,d); m.position.y=(a.kind==='lights')?2.3:0.5; g.add(m);
    }
  }catch(_){ const m=new THREE.Mesh(geoBox,mat); m.scale.setScalar(0.4); m.position.y=0.2; g.add(m); }
  g.rotation.y=-(a.rot||0)*Math.PI/180;
  g.visible=false;
  scene.add(g); _ghost=g; a.ghost=g;
}
function ghostFollow(e){
  const a=ST.add; if(!a||!a.ghost) return;
  const hit=hitAt(e.clientX,e.clientY);
  const fid=(hit&&hit.object.userData.obj&&hit.object.userData.obj.floorId)||(ST.floorSel!=='all'?ST.floorSel:(ST.floors[0]&&ST.floors[0].id));
  const f=ST.floors.find(x=>x.id===fid);
  const z0=f?f.z0*MM:0;
  dragPlane.constant=-z0;
  rayFromEvent(e);
  if(!ray.ray.intersectPlane(dragPlane,dragPt)) return;
  a.fid=fid;
  a.ghost.position.set(Math.round(dragPt.x/MM/10)*10*MM,z0,Math.round(dragPt.z/MM/10)*10*MM);
  a.ghost.visible=true;
  invalidate();
}
function placeGhost(){
  const a=ST.add; if(!a||!a.ghost||!a.ghost.visible) return;
  const x=Math.round(a.ghost.position.x/MM), y=Math.round(a.ghost.position.z/MM);
  if(!chan){ setStatus(false,'MiniCAD 창이 없어 배치 못함'); return; }
  chan.postMessage({type:'edit',op:'add',kind:a.kind,floorId:a.fid,patch:{type:a.type,x,y,angle:a.rot||0}});
  setStatus(statusLive,'➕ 배치 ('+x+', '+y+') — 계속 클릭해 더 놓기, Esc=끝');
}
function renderAddPal(){
  const el=$('addpal'); if(!el) return;
  const CATS=[['furniture','가구',LIBS.FURNITURE_LIB],['fixtures','주방·위생·가전',LIBS.FIXTURE_LIB],['lights','조명',LIBS.LIGHT_LIB],['electric','전기',LIBS.ELECTRIC_LIB],['hvac','공조·소방',LIBS.HVAC_FIRE_LIB]];
  el.innerHTML=CATS.map(([k,label,TBL])=>TBL?('<div class="pp-cat">'+label+'</div><div class="pp-grid">'+
    Object.entries(TBL).filter(([,v])=>!v.hidden).map(([kk,v])=>'<button class="pp-it'+((ST.add&&ST.add.kind===k&&ST.add.type===kk)?' on':'')+'" data-k="'+k+'" data-type="'+kk+'"><span class="pp-chip" style="background:'+(v.c||'#8B8B8B')+'"></span>'+(v.name||kk)+'</button>').join('')+'</div>'):'').join('');
  el.querySelectorAll('.pp-it').forEach(b=>{
    b.onclick=()=>{
      const k=b.dataset.k,t=b.dataset.type;
      if(ST.tool!=='add') setTool('add'); // 스케치업: 구성요소 고르면 배치 도구
      const TBL={furniture:LIBS.FURNITURE_LIB,fixtures:LIBS.FIXTURE_LIB,lights:LIBS.LIGHT_LIB,electric:LIBS.ELECTRIC_LIB,hvac:LIBS.HVAC_FIRE_LIB}[k];
      ST.add={kind:k,type:t,def:TBL&&TBL[t],rot:(ST.add&&ST.add.rot)||0,ghost:null,fid:null};
      renderAddPal(); makeGhost();
      setStatus(statusLive,'➕ '+((TBL[t]&&TBL[t].name)||t)+' — 바닥에 클릭해 배치');
    };
  });
}
// --- 선(L)·사각형(R) — 스케치업 Line/Rectangle: 3D 에서 벽을 그린다 ---
function _hoverFloorId(e){
  const hit=hitAt(e.clientX,e.clientY);
  return (hit&&hit.object.userData.obj&&hit.object.userData.obj.floorId)||(ST.floorSel!=='all'?ST.floorSel:(ST.floors[0]&&ST.floors[0].id));
}
function _planePt(e,z0){
  dragPlane.constant=-z0; rayFromEvent(e);
  if(!ray.ray.intersectPlane(dragPlane,dragPt)) return null;
  return {x:dragPt.x/MM, y:dragPt.z/MM}; // 원시 mm — 스냅(snap3)이 반올림·흡착을 맡는다
}
// --- 점·선·면 스냅 (스케치업 추론) — 끝점(초록) > 중간점(청록) > 선 위(빨강) > 10mm 격자 ---
function closestOnSeg(p,w){
  const dx=w.x2-w.x1,dy=w.y2-w.y1,l2=dx*dx+dy*dy;
  if(l2<1e-9) return {x:w.x1,y:w.y1};
  let t=((p.x-w.x1)*dx+(p.y-w.y1)*dy)/l2; t=Math.max(0,Math.min(1,t));
  return {x:w.x1+t*dx,y:w.y1+t*dy};
}
function segIntersect(a,b,c,d){
  const s=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const d1=s(c,d,a),d2=s(c,d,b),d3=s(a,b,c),d4=s(a,b,d);
  return ((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0));
}
function snap3(fid,p){
  const sd=ST.snapData[fid];
  const grid={x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10,kind:'grid'};
  if(!sd) return grid;
  let best=null;
  sd.verts.forEach(v=>{const d=Math.hypot(v.x-p.x,v.y-p.y); if(d<=180&&(!best||d<best.d)) best={x:v.x,y:v.y,d,kind:'endpoint'};});
  if(!best) sd.walls.forEach(w=>{const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2;const d=Math.hypot(mx-p.x,my-p.y); if(d<=160&&(!best||d<best.d)) best={x:mx,y:my,d,kind:'midpoint'};});
  if(!best){
    let bd=120,bp=null;
    sd.walls.forEach(w=>{const q=closestOnSeg(p,w);const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;bp=q;}});
    if(bp) best={x:bp.x,y:bp.y,d:bd,kind:'edge'};
  }
  return best?{x:Math.round(best.x),y:Math.round(best.y),kind:best.kind}:grid;
}
const SNAP_COL={endpoint:0x2FA84F,midpoint:0x35C2CF,edge:0xE24C4C};
const SNAP_NAME={endpoint:'끝점',midpoint:'중간점',edge:'선 위'};
let snapMk=null;
function showSnap(s,z0){
  if(s.kind==='grid'){ hideSnap(); return; }
  if(!snapMk){
    snapMk=new THREE.Mesh(geoSph,new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false}));
    snapMk.scale.setScalar(0.045); snapMk.renderOrder=1000; scene.add(snapMk);
  }
  snapMk.material.color.setHex(SNAP_COL[s.kind]||0xffffff);
  snapMk.position.set(s.x*MM,z0+0.03,s.y*MM);
  snapMk.visible=true;
  invalidate();
}
function hideSnap(){ if(snapMk&&snapMk.visible){ snapMk.visible=false; invalidate(); } }
// 선분이 그 층의 어떤 면(공간)을 지나는가 — 지나면 splitspace(면 분할)
function segHitsSpace(fid,a,c){
  const sd=ST.snapData[fid]; if(!sd) return null;
  const inPoly=MC3D._internal.pointInPoly;
  for(const s of sd.spaces){
    if(!s.poly||s.poly.length<3) continue;
    const inA=inPoly(a,s.poly), inC=inPoly(c,s.poly);
    if(inA&&inC) return s.id;
    let hits=0;
    for(let i=0;i<s.poly.length;i++){
      if(segIntersect(a,c,s.poly[i],s.poly[(i+1)%s.poly.length])) hits++;
    }
    if(hits>=2||((inA||inC)&&hits>=1)) return s.id;
  }
  return null;
}
function lineClick(e){
  if(ST.op&&ST.op.type==='line'){ commitLine(vcbTyped()); return; }
  const fid=_hoverFloorId(e);
  const f=ST.floors.find(x=>x.id===fid), z0=f?f.z0*MM:0;
  const raw=_planePt(e,z0); if(!raw) return;
  const p=snap3(fid,raw); showSnap(p,z0); // 시작점도 점·선에 흡착
  const rect=(ST.tool==='rect');
  const geo=new THREE.BufferGeometry().setFromPoints(new Array(rect?5:2).fill(0).map(()=>new THREE.Vector3(p.x*MM,z0+0.02,p.y*MM)));
  const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln);
  const gh=new THREE.Mesh(geoBox,new THREE.MeshStandardMaterial({color:0xD4FF3D,transparent:true,opacity:0.22,depthWrite:false}));
  gh.visible=false; scene.add(gh);
  ST.op={type:'line',rect,fid,z0,a:p,cur:p,line:ln,ghost:gh};
  // 첫 점 고정 표시 — 점이 찍혔음을 분명하게
  const smk=new THREE.Mesh(geoSph,new THREE.MeshBasicMaterial({color:0xD4FF3D,depthTest:false}));
  smk.scale.setScalar(0.055); smk.renderOrder=1000;
  smk.position.set(p.x*MM,z0+0.03,p.y*MM);
  scene.add(smk); ST.op.startMk=smk;
  orbit.enabled=false;
  vcbShow(rect?'가로,세로':'벽 길이','', 'mm');
  invalidate();
}
// 낙관적 미리보기 — 평면 반영 응답이 오기 전까지 방금 만든 것을 즉시 보여준다 (딜레이 체감 제거)
function spawnPendingRect(a,c,z0){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0xC9A961,transparent:true,opacity:0.35,depthWrite:false});
  const w=Math.abs(c.x-a.x)*MM,h=Math.abs(c.y-a.y)*MM,cx=(a.x+c.x)/2*MM,cy=(a.y+c.y)/2*MM;
  const fl=new THREE.Mesh(geoBox,mat); fl.scale.set(w,0.02,h); fl.position.set(cx,z0+0.01,cy); g.add(fl);
  const mkw=(x,zc,ww,dd)=>{const m2=new THREE.Mesh(geoBox,mat);m2.scale.set(ww,2.4,dd);m2.position.set(x,z0+1.2,zc);g.add(m2);};
  mkw(cx,a.y*MM,w,0.1); mkw(cx,c.y*MM,w,0.1); mkw(a.x*MM,cy,0.1,h); mkw(c.x*MM,cy,0.1,h);
  scene.add(g); ST.pendingG.push(g); invalidate(true);
}
function spawnPendingWall(a,c,z0){
  const len=Math.hypot(c.x-a.x,c.y-a.y)*MM; if(len<0.05) return;
  const m2=new THREE.Mesh(geoBox,new THREE.MeshStandardMaterial({color:0xC9A961,transparent:true,opacity:0.4,depthWrite:false}));
  m2.scale.set(len,2.4,0.1);
  m2.position.set((a.x+c.x)/2*MM,z0+1.2,(a.y+c.y)/2*MM);
  m2.rotation.y=-Math.atan2(c.y-a.y,c.x-a.x);
  scene.add(m2); ST.pendingG.push(m2); invalidate(true);
}
function lineMove(e){
  const op=ST.op; if(!op||op.type!=='line') return;
  const raw=_planePt(e,op.z0); if(!raw) return;
  const sp=snap3(op.fid,raw);           // 점·선 흡착이 직교 추론보다 우선 (스케치업과 동일)
  let px=sp.x,py=sp.y;
  if(!op.rect&&sp.kind==='grid'){
    const dx=px-op.a.x, dy=py-op.a.y;
    // 스케치업 추론식 직교: 축에 5° 안이면 붙는다 · Shift=강제 직교
    if(e.shiftKey||Math.abs(dy)<Math.abs(dx)*0.09) py=op.a.y;
    else if(Math.abs(dx)<Math.abs(dy)*0.09) px=op.a.x;
  }
  showSnap({x:px,y:py,kind:sp.kind},op.z0);
  op.snapKind=sp.kind;
  op.cur={x:px,y:py};
  const pos=op.line.geometry.attributes.position;
  const y3=op.z0+0.02;
  if(op.rect){
    pos.setXYZ(0,op.a.x*MM,y3,op.a.y*MM); pos.setXYZ(1,px*MM,y3,op.a.y*MM);
    pos.setXYZ(2,px*MM,y3,py*MM); pos.setXYZ(3,op.a.x*MM,y3,py*MM); pos.setXYZ(4,op.a.x*MM,y3,op.a.y*MM);
    // 크기를 반투명 면 고스트로 (대표 피드백: 사이즈가 고스트 형태로 보이게)
    const gw=Math.abs(px-op.a.x),gh2=Math.abs(py-op.a.y);
    if(gw>10&&gh2>10){
      op.ghost.visible=true;
      op.ghost.material.opacity=0.18;
      op.ghost.material.color.setHex(0xD4FF3D);
      op.ghost.scale.set(gw*MM,0.02,gh2*MM);
      op.ghost.position.set((op.a.x+px)/2*MM,op.z0+0.012,(op.a.y+py)/2*MM);
      op.ghost.rotation.y=0;
    }else op.ghost.visible=false;
    vcbShow('▭ '+gw+'×'+gh2+' (입력: 가로,세로)','','mm');
  }else{
    pos.setXYZ(1,px*MM,y3,py*MM);
    const len=Math.round(Math.hypot(px-op.a.x,py-op.a.y));
    vcbShow((op.snapKind&&op.snapKind!=='grid'?SNAP_NAME[op.snapKind]+' · ':'')+'길이',len,'mm');
    // 반투명 벽 미리보기
    if(len>50){
      const th=0.1,H=2.4;
      op.ghost.visible=true;
      op.ghost.scale.set(len*MM,H,th);
      op.ghost.position.set((op.a.x+px)/2*MM,op.z0+H/2,(op.a.y+py)/2*MM);
      op.ghost.rotation.y=-Math.atan2(py-op.a.y,px-op.a.x);
    }else op.ghost.visible=false;
  }
  pos.needsUpdate=true;
  invalidate();
}
function commitLine(exact){
  const op=ST.op; if(!op||op.type!=='line') return;
  let a=op.a,cur=op.cur;
  if(!op.rect&&exact!==null&&exact!==undefined&&exact>0){
    const dx=cur.x-a.x,dy=cur.y-a.y,l=Math.hypot(dx,dy);
    if(l>1) cur={x:Math.round(a.x+dx/l*exact),y:Math.round(a.y+dy/l*exact)};
  }
  if(!chan){ setStatus(false,'MiniCAD 창이 없어 벽을 못 만듭니다'); return; }
  if(op.rect){
    const pr=vcbPair(); // 치수 입력 "3000,2000" → 첫 점에서 정확한 크기 (끌던 방향 부호)
    if(pr&&pr.w>0&&pr.h>0){
      const sx=(cur.x>=a.x)?1:-1, sy=(cur.y>=a.y)?1:-1;
      cur={x:Math.round(a.x+sx*pr.w),y:Math.round(a.y+sy*pr.h)};
    }
    if(Math.abs(cur.x-a.x)<300||Math.abs(cur.y-a.y)<300){ setStatus(statusLive,'면이 너무 작습니다 (300mm+) — 수치는 "가로,세로"'); return; }
    spawnPendingRect(a,cur,op.z0); // 즉시 보여주고, 실물은 재조립으로 교체
    chan.postMessage({type:'edit',op:'addspace',floorId:op.fid,patch:{x1:a.x,y1:a.y,x2:cur.x,y2:cur.y}});
    cancelOp();
    setStatus(statusLive,'▭ 면 생성 '+Math.abs(cur.x-a.x)+'×'+Math.abs(cur.y-a.y)+' → 점·선·면 한 그룹');
  }else{
    if(Math.hypot(cur.x-a.x,cur.y-a.y)<100){ setStatus(statusLive,'너무 짧습니다 (100mm+)'); return; }
    const sid=segHitsSpace(op.fid,a,cur);
    // 면 위(가로지름) = 면 분할 (스케치업: 면 위의 선은 면을 나눈다) / 빈 곳 = 벽
    if(!sid) spawnPendingWall(a,cur,op.z0); // 벽은 즉시 임시 표시
    chan.postMessage({type:'edit',op:sid?'splitspace':'addwall',floorId:op.fid,patch:{x1:a.x,y1:a.y,x2:cur.x,y2:cur.y}});
    if(sid) setStatus(statusLive,'╱ 면 분할 → 두 면으로 (평면 반영)');
    // 스케치업 Line 처럼 사슬 잇기 — 끝점이 새 시작점
    op.a=cur;
    if(op.startMk) op.startMk.position.set(cur.x*MM,op.z0+0.03,cur.y*MM);
    const pos=op.line.geometry.attributes.position, y3=op.z0+0.02;
    pos.setXYZ(0,cur.x*MM,y3,cur.y*MM); pos.setXYZ(1,cur.x*MM,y3,cur.y*MM); pos.needsUpdate=true;
    op.ghost.visible=false;
    vcbShow('벽 길이',0,'mm');
    setStatus(statusLive,'╱ 벽 추가 → 이어서 클릭 (Esc·더블클릭=끝)');
    invalidate();
  }
}
function cancelOp(){
  const op=ST.op; ST.op=null; ST.axisLock=null; vcbHide();
  if(op){
    if(op.type==='move'&&op.g){
      if(op.copy){ if(op.g.parent) op.g.parent.remove(op.g); }        // 복사 미리보기 제거
      else { op.g.position.x=op.orig.x; op.g.position.z=op.orig.z; }
    }
    if(op.type==='rotate'&&op.g){ op.g.rotation.y=-(op.obj.rot||0)*Math.PI/180; }
    if(op.type==='scale'&&op.g){ op.g.scale.x=op.baseSX; op.g.scale.z=op.baseSZ; }
    if(op.type==='pp'&&op.g){ op.g.scale.y=1; op.g.position.y=op.origY; }
    if(op.line){ scene.remove(op.line); if(op.line.geometry) op.line.geometry.dispose(); }
    if(op.ghost){ scene.remove(op.ghost); }
    if(op.startMk){ scene.remove(op.startMk); }
    hideSnap();
    invalidate(true);
  }
  orbit.enabled=(ST.mode==='orbit');
}
function commitActive(exact){
  const op=ST.op; if(!op) return;
  if(op.type==='move') commitMove(exact);
  else if(op.type==='rotate') commitRotate(exact);
  else if(op.type==='scale') commitScale(exact);
  else if(op.type==='pp') commitPP(exact);
  else if(op.type==='line') commitLine(exact);
}
// --- 이동 (Ctrl = 복사, 스케치업과 동일) ---
function beginMove(g,obj,copy){
  const ent=ST.floorCache[obj.floorId];
  dragPlane.constant=-(ent?ent.z0*MM:0);
  ray.ray.intersectPlane(dragPlane,dragPt);
  let tg=g;
  if(copy){ tg=g.clone(true); g.parent.add(tg); }                     // 복사 미리보기 (원본은 그대로)
  ST.op={type:'move',g:tg,obj,copy:!!copy,orig:{x:g.position.x,z:g.position.z},off:{x:g.position.x-dragPt.x,z:g.position.z-dragPt.z},moved:false,sticky:false};
  orbit.enabled=false;
  vcbShow(copy?'복사':'이동',0,'mm');
}
function applyMoveFromEvent(e){
  const op=ST.op; if(!op||op.type!=='move') return;
  rayFromEvent(e);
  if(!ray.ray.intersectPlane(dragPlane,dragPt)) return;
  let x=dragPt.x+op.off.x, z=dragPt.z+op.off.z;
  if(ST.axisLock==='x') z=op.orig.z;
  if(ST.axisLock==='y') x=op.orig.x;
  const snap=v=>Math.round(v/MM/10)*10*MM;
  op.g.position.x=snap(x); op.g.position.z=snap(z);
  op.moved=true;
  vcbShow('이동',Math.round(Math.hypot(op.g.position.x-op.orig.x,op.g.position.z-op.orig.z)/MM),'mm');
  invalidate(true);
}
function commitMove(exact){
  const op=ST.op; if(!op||op.type!=='move') return;
  if(exact!==null&&exact!==undefined){          // 입력 거리 — 지금 끌던 방향으로 정확히
    const dx=op.g.position.x-op.orig.x, dz=op.g.position.z-op.orig.z;
    const len=Math.hypot(dx,dz);
    if(len>1e-6){ op.g.position.x=op.orig.x+dx/len*exact*MM; op.g.position.z=op.orig.z+dz/len*exact*MM; }
  }
  const x=Math.round(op.g.position.x/MM), y=Math.round(op.g.position.z/MM);
  const g=op.g,obj=op.obj,copy=op.copy;
  ST.op=null; ST.axisLock=null; vcbHide(); orbit.enabled=(ST.mode==='orbit');
  if(copy){
    if(g.parent) g.parent.remove(g);                                  // 진짜 사본은 재조립으로 온다
    sendEdit('clone',obj,{x,y});
    setStatus(statusLive,'복사 → 평면 반영 ('+x+', '+y+')');
  }else{
    obj.x=x; obj.y=y;
    sendEdit('move',obj,{x,y});
    select(g,{silent:true});
    setStatus(statusLive,'이동 → 평면 반영 ('+x+', '+y+')');
  }
}
// --- 배율 (S · 스케치업 Scale) — 가구·기구·설비 footprint ---
const SCALABLE=new Set(['furniture','fixture','hvac']);
function beginScale(g,obj,cy){
  if(!SCALABLE.has(obj.kind)){ setStatus(statusLive,'배율은 가구·기구·설비만 (조명 규격은 인치·길이로)'); return; }
  ST.op={type:'scale',g,obj,startY:cy,factor:1,baseSX:g.scale.x,baseSZ:g.scale.z,baseW:(obj.meta&&obj.meta.w)||400,baseD:(obj.meta&&obj.meta.d)||400};
  orbit.enabled=false;
  vcbShow('배율','1.00','×');
}
function applyScale(cy){
  const op=ST.op; if(!op||op.type!=='scale') return;
  let f=1+(op.startY-cy)*0.005;
  f=Math.max(0.2,Math.min(5,Math.round(f*20)/20));                    // 0.05 스냅
  op.factor=f;
  op.g.scale.x=op.baseSX*f; op.g.scale.z=op.baseSZ*f;
  vcbShow('배율',f.toFixed(2),'×');
  invalidate(true);
}
function commitScale(exact){
  const op=ST.op; if(!op||op.type!=='scale') return;
  const f=(exact!==null&&exact!==undefined&&exact>0)?exact:op.factor;
  op.g.scale.x=op.baseSX; op.g.scale.z=op.baseSZ;
  const obj=op.obj;
  ST.op=null; vcbHide(); orbit.enabled=(ST.mode==='orbit');
  sendEdit('set',obj,{w:Math.max(50,Math.round(op.baseW*f)),h:Math.max(50,Math.round(op.baseD*f))});
  setStatus(statusLive,'⤢ 배율 ×'+f.toFixed(2)+' → 평면 반영');
}
// --- 회전 ---
function beginRotate(g,obj,cx){ ST.op={type:'rotate',g,obj,base:obj.rot||0,startX:cx,ang:0}; orbit.enabled=false; vcbShow('회전',0,'°'); }
function applyRotate(cx,free){
  const op=ST.op; if(!op||op.type!=='rotate') return;
  let a=(cx-op.startX)*0.5;
  if(!free) a=Math.round(a/15)*15;
  op.ang=a;
  op.g.rotation.y=-((op.base+a)%360)*Math.PI/180;
  vcbShow('회전',Math.round(a),'°');
  invalidate(true);
}
function commitRotate(exact){
  const op=ST.op; if(!op||op.type!=='rotate') return;
  const a=(exact!==null&&exact!==undefined)?exact:op.ang;
  op.obj.rot=(((op.base+a)%360)+360)%360;
  op.g.rotation.y=-op.obj.rot*Math.PI/180;
  const g=op.g,obj=op.obj;
  ST.op=null; vcbHide(); orbit.enabled=(ST.mode==='orbit');
  sendEdit('rotate',obj,{angle:obj.rot});
  select(g,{silent:true});
}
// --- 밀기끌기 (벽 높이·공간 천장고) ---
function beginPP(hit){
  const obj=hit.object.userData.obj, g=hit.object.parent;
  let t=null;
  if(obj.kind==='wall'&&!obj.locked) t={obj,g,mode:'wall',base:obj.meta.H};
  else if(obj.kind==='ceiling') t={obj,g,mode:'ceil',base:Math.round((obj.prims&&obj.prims[0]&&obj.prims[0].z)||2400)};
  if(!t){ setStatus(statusLive,'밀기끌기는 벽·천장에서 (가구 높이는 종류가 정합니다)'); return; }
  ST.op={type:'pp',...t,startY:null,delta:0,origY:t.g.position.y};
  orbit.enabled=false;
  vcbShow('밀기끌기',0,'mm');
}
function applyPP(clientY){
  const op=ST.op; if(!op||op.type!=='pp') return;
  if(op.startY===null){ op.startY=clientY; return; }
  let d=Math.round((op.startY-clientY)*5/25)*25;      // 5mm/px · 25mm 스냅
  d=Math.max(300-op.base,d);
  op.delta=d;
  if(op.mode==='wall') op.g.scale.y=(op.base+d)/op.base;
  else op.g.position.y=op.origY+d*MM;
  vcbShow('밀기끌기',d,'mm');
  invalidate(true);
}
function commitPP(exact){
  const op=ST.op; if(!op||op.type!=='pp') return;
  const d=(exact!==null&&exact!==undefined)?Math.round(exact):op.delta;
  const nv=Math.max(300,op.base+d);
  const obj=op.obj,mode=op.mode;
  if(op.g){ op.g.scale.y=1; op.g.position.y=op.origY; }
  ST.op=null; vcbHide(); orbit.enabled=(ST.mode==='orbit');
  ST.lastPP=d; // 스케치업: 더블클릭 = 직전 밀기끌기 반복
  if(mode==='wall') sendEdit('set',obj,{height_mm:nv});
  else sendEdit('set',{kind:'floor',id:String(obj.id).replace(/_ceil$/,''),floorId:obj.floorId},{ceilingHeight_mm:nv});
  setStatus(statusLive,'⇕ 높이 '+nv+'mm → 평면 반영');
}
// --- 페인트 ---
function renderPaintPal(){
  const pal=$('paintpal'); if(!pal) return;
  const cats=[['wall','벽 마감',MATS.WALL],['floor','바닥재',MATS.FLOOR],['ceil','천장재',MATS.CEIL]];
  pal.innerHTML=cats.map(([cat,label,TBL])=>TBL?('<div class="pp-cat">'+label+'</div><div class="pp-grid">'+
    Object.entries(TBL).map(([k,v])=>'<button class="pp-it'+((ST.paint.cat===cat&&ST.paint.code===k)?' on':'')+'" data-cat="'+cat+'" data-code="'+k+'"><span class="pp-chip" style="background:'+(MC3D.WALL_COLORS[k]||MC3D.FLOOR_COLORS[k]||'#B9B2A6')+'"></span>'+(v.name||k)+'</button>').join('')+'</div>'):'').join('');
  pal.querySelectorAll('.pp-it').forEach(b=>{ b.onclick=()=>{ ST.paint={cat:b.dataset.cat,code:b.dataset.code}; renderPaintPal(); if(ST.tool!=='paint') setTool('paint'); }; }); // 스케치업: 재질 고르면 페인트 도구
}
function doPaint(hit){
  const obj=hit.object.userData.obj; if(!obj) return;
  const c=ST.paint;
  if(obj.kind==='wall'&&c.cat==='wall') sendEdit('set',obj,{finishMaterial:c.code});
  else if(obj.kind==='floor'&&c.cat==='floor') sendEdit('set',obj,{floorMaterial:c.code});
  else if(obj.kind==='floor'&&c.cat==='ceil') sendEdit('set',obj,{ceilingMaterial:c.code});
  else if(obj.kind==='ceiling'&&c.cat==='ceil') sendEdit('set',{kind:'floor',id:String(obj.id).replace(/_ceil$/,''),floorId:obj.floorId},{ceilingMaterial:c.code});
  else { setStatus(statusLive,'이 재질은 '+({wall:'벽',floor:'바닥',ceil:'천장'})[c.cat]+'에 칠합니다'); return; }
  setStatus(statusLive,'🪣 재질 적용 → 평면·견적 반영');
}
// --- 줄자 ---
function tapeClick(hit){
  if(!hit) return;
  const p=hit.point.clone();
  if(!ST.op||ST.op.type!=='tape'){
    const geo=new THREE.BufferGeometry().setFromPoints([p,p.clone()]);
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false}));
    line.renderOrder=998;
    scene.add(line);
    ST.op={type:'tape',a:p,line};
    vcbShow('줄자',0,'mm');
    invalidate();
  }else{
    const d=Math.round(ST.op.a.distanceTo(p)/MM);
    setStatus(statusLive,'📏 '+d+' mm ('+(d/1000).toFixed(2)+' m)');
    scene.remove(ST.op.line); ST.op.line.geometry.dispose();
    ST.op=null; vcbShow('줄자',d,'mm');
    invalidate();
  }
}
function tapeMove(e){
  const op=ST.op; if(!op||op.type!=='tape') return;
  const hit=hitAt(e.clientX,e.clientY); if(!hit) return;
  const pos=op.line.geometry.attributes.position;
  pos.setXYZ(1,hit.point.x,hit.point.y,hit.point.z); pos.needsUpdate=true;
  vcbShow('줄자',Math.round(op.a.distanceTo(hit.point)/MM),'mm');
  invalidate();
}
// --- 포인터 흐름 ---
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',e=>{
  drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,button:e.button};
  if(ST.mode==='walk'){ renderer.domElement.setPointerCapture(e.pointerId); return; }
  if(e.button!==0) return;
  if(ST.op&&ST.op.type!=='tape'&&ST.op.type!=='line'){ // 스티키 동작은 다음 클릭 = 확정 (스케치업식)
    if(ST.op.type==='move'&&!ST.op.sticky){}           // (버튼 눌러 끄는 중이면 pointerup 에서)
    else { commitActive(vcbTyped()); drag=null; return; }
  }
  const hit=hitAt(e.clientX,e.clientY);
  const obj=hit&&hit.object.userData.obj;
  const g=hit&&hit.object.parent;
  const movable=obj&&MOVABLE.has(obj.kind)&&!obj.locked;
  switch(ST.tool){
    case 'select':
      if(movable){ beginMove(g,obj,e.ctrlKey||e.metaKey); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(obj&&obj.locked&&MOVABLE.has(obj.kind)) setStatus(statusLive,'잠금된 객체 — 이동 불가');
      break;
    case 'move':
      if(movable){ select(g,{silent:true}); beginMove(g,obj,e.ctrlKey||e.metaKey); renderer.domElement.setPointerCapture(e.pointerId); }
      break;
    case 'rotate':
      if(movable){ select(g,{silent:true}); beginRotate(g,obj,e.clientX); }
      else if(obj&&obj.locked) setStatus(statusLive,'잠금된 객체');
      break;
    case 'scale':
      if(movable){ select(g,{silent:true}); beginScale(g,obj,e.clientY); }
      break;
    case 'pan': case 'zoom': break; // 카메라 도구 — OrbitControls 가 처리
    case 'add': placeGhost(); break;
    case 'line': case 'rect': lineClick(e); break;
    case 'pushpull': if(hit) beginPP(hit); break;
    case 'paint': if(hit) doPaint(hit); break;
    case 'erase': if(g&&obj){ select(g,{silent:true}); deleteSelected3D(); } break;
    case 'tape': tapeClick(hit); break;
  }
});
renderer.domElement.addEventListener('pointermove',e=>{
  if(ST.tool==='add'&&ST.add&&ST.add.ghost){ ghostFollow(e); }
  // 첫 클릭 전에도 스냅 마커 표시 (스케치업 추론 — 호버만으로 끝점/중간점/선에 흡착 예고)
  if((ST.tool==='line'||ST.tool==='rect')&&!ST.op&&ST.mode==='orbit'){
    const fid=_hoverFloorId(e);
    const f=ST.floors.find(x=>x.id===fid), z0=f?f.z0*MM:0;
    const raw=_planePt(e,z0);
    if(raw) showSnap(snap3(fid,raw),z0);
  }
  // 스티키 동작 — 버튼을 안 눌러도 따라온다 (클릭-이동-클릭)
  if(ST.op&&(!drag||drag.id!==e.pointerId)){
    if(ST.op.type==='move'&&ST.op.sticky) applyMoveFromEvent(e);
    else if(ST.op.type==='rotate') applyRotate(e.clientX,e.shiftKey);
    else if(ST.op.type==='scale') applyScale(e.clientY);
    else if(ST.op.type==='pp') applyPP(e.clientY);
    else if(ST.op.type==='tape') tapeMove(e);
    else if(ST.op.type==='line') lineMove(e);
    return;
  }
  if(!drag||drag.id!==e.pointerId) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5) drag.moved=true;
  if(ST.op&&ST.op.type==='move'&&!ST.op.sticky){ applyMoveFromEvent(e); return; }
  if(ST.op&&ST.op.type==='tape'){ tapeMove(e); return; }
  if(ST.mode==='walk'&&drag.button===0){
    ST.walk.yaw-=dx*0.0045; ST.walk.pitch-=dy*0.0035;
    drag.x=e.clientX; drag.y=e.clientY;
    applyWalkCamera();
  }
});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!drag) return;
  const wasClick=!drag.moved&&drag.button===0;
  const op=ST.op;
  drag=null;
  if(op&&op.type==='move'&&!op.sticky){
    if(op.moved){ commitMove(vcbTyped()); return; }
    if(ST.tool==='move'){ op.sticky=true; return; }   // 이동 도구: 클릭=집기 → 스티키
    cancelOp();                                        // 선택 도구: 클릭이면 그냥 선택
  }
  if(wasClick&&!ST.op) pick(e.clientX,e.clientY);
});
renderer.domElement.addEventListener('pointercancel',()=>{ if(ST.op&&ST.op.type!=='tape') cancelOp(); drag=null; });
renderer.domElement.addEventListener('dblclick',e=>{
  if(ST.op&&ST.op.type==='line'){ cancelOp(); setStatus(statusLive,'╱ 그리기 끝'); return; } // 스케치업: 더블클릭=사슬 끝
  const hit=hitAt(e.clientX,e.clientY);
  if(!hit) return;
  // 스케치업: 밀기끌기 도구에서 더블클릭 = 직전 값 반복
  if(ST.tool==='pushpull'&&typeof ST.lastPP==='number'&&ST.lastPP!==0){
    const obj=hit.object.userData.obj;
    if(obj&&obj.kind==='wall'&&!obj.locked){ sendEdit('set',obj,{height_mm:Math.max(300,obj.meta.H+ST.lastPP)}); setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm'); return; }
    if(obj&&obj.kind==='ceiling'){ const base=Math.round((obj.prims&&obj.prims[0]&&obj.prims[0].z)||2400); sendEdit('set',{kind:'floor',id:String(obj.id).replace(/_ceil$/,''),floorId:obj.floorId},{ceilingHeight_mm:Math.max(300,base+ST.lastPP)}); setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm'); return; }
  }
  zoomTo(hit.object.parent);
});
function rotateSelected(deg){
  const g=ST.selected; if(!g) return;
  const o=g.userData.obj;
  if(!MOVABLE.has(o.kind)){ return; }
  if(o.locked){ setStatus(statusLive,'잠금된 객체'); return; }
  o.rot=((o.rot||0)+deg)%360;
  g.rotation.y=-o.rot*Math.PI/180;
  sendEdit('rotate',o,{angle:o.rot});
  invalidate(true);
}
function deleteSelected3D(){
  const g=ST.selected; if(!g) return;
  const o=g.userData.obj;
  if(!(MOVABLE.has(o.kind)||o.kind==='door'||o.kind==='window')){ setStatus(statusLive,'벽·공간은 평면에서 지우세요'); return; }
  if(o.locked){ setStatus(statusLive,'잠금된 객체 — 삭제 불가'); return; }
  sendEdit('delete',o);
  select(null);
  disposeGroup(g); rebuildPickables(); invalidate(true);
  setStatus(statusLive,'삭제 → 평면 반영');
}

// ---------------------------------------------------------------------------
// 속성 패널 — 3D 에서 바로 수정 (재질·높이·회전…)
// ---------------------------------------------------------------------------
const props=$('props');
function matOptions(TBL,cur){
  if(typeof TBL==='undefined'||!TBL) return '';
  return Object.entries(TBL).map(([k,v])=>`<option value="${k}"${k===cur?' selected':''}>${v.name||k}</option>`).join('');
}
function renderProps(obj){
  if(!obj){ props.innerHTML='<div class="p-note">객체를 클릭하면 여기서 정보·수정 (스케치업 Entity Info)</div>'; return; } // 트레이 상주
  const m=obj.meta||{};
  let html=`<h4>${obj.name||obj.kind}</h4><div class="p-sub">${obj.floorName||''}${obj.floorName?' · ':''}${m.type||obj.kind}</div>`;
  if(obj.locked){ html+='<div class="p-lock">🔒 잠금된 객체 — 보기만 가능</div>'; props.innerHTML=html; props.style.display='block'; return; }
  if(MOVABLE.has(obj.kind)){
    html+=`<div class="p-row"><label>위치</label><span style="font-size:12px">${Math.round(obj.x)}, ${Math.round(obj.y)} mm</span></div>`;
    if(obj.kind==='light'&&m.inch) html+=`<div class="p-row"><label>인치</label><select data-f="inch">${[2,3,4,5,6].map(i=>`<option value="${i}"${i===m.inch?' selected':''}>${i}"</option>`).join('')}</select></div>`;
    if(m.linear) html+=`<div class="p-row"><label>길이</label><input type="number" step="100" data-f="length_mm" value="${m.linear}"> <span style="font-size:11px">mm</span></div>`;
    html+=`<div class="p-btns"><button class="btn" data-a="rotl" title="반시계 15° (Shift+R)">↺ 15°</button><button class="btn" data-a="rotr" title="시계 15° (R)">↻ 15°</button></div>`;
    html+=`<div class="p-btns"><button class="btn danger" data-a="del">🗑 삭제 (Del)</button></div>`;
    html+=`<div class="p-note">드래그로 이동(10mm 스냅) — 수정은 평면도에 바로 반영됩니다.</div>`;
  }else if(obj.kind==='wall'){
    html+=`<div class="p-row"><label>길이</label><span style="font-size:12px">${m.L} mm · 두께 ${m.t}</span></div>`;
    html+=`<div class="p-row"><label>높이</label><input type="number" step="50" data-f="height_mm" value="${m.H}"> <span style="font-size:11px">mm</span></div>`;
    html+=`<div class="p-row"><label>마감</label><select data-f="finishMaterial"><option value="">기본</option>${matOptions(MATS.WALL,m.material)}</select></div>`;
  }else if(obj.kind==='floor'){
    html+=`<div class="p-row"><label>바닥재</label><select data-f="floorMaterial">${matOptions(MATS.FLOOR,m.floorMaterial||'STRONG')}</select></div>`;
    html+=`<div class="p-row"><label>천장재</label><select data-f="ceilingMaterial">${matOptions(MATS.CEIL,m.ceilingMaterial||'GYPSUM')}</select></div>`;
    html+=`<div class="p-row"><label>천장고</label><input type="number" step="50" data-f="ceilingHeight_mm" value="${m.ceilH}"> <span style="font-size:11px">mm</span></div>`;
    const _st=ST.snapData[obj.floorId]&&ST.snapData[obj.floorId].stats&&ST.snapData[obj.floorId].stats[obj.id];
    if(_st) html+=`<div class="p-row"><label>그룹</label><span style="font-size:12px">면 1 · 선(벽) ${_st.walls} · 배치 ${_st.items}</span></div>`;
  }else if(obj.kind==='door'||obj.kind==='window'){
    html+=`<div class="p-row"><label>폭</label><input type="number" step="50" data-f="width_mm" value="${m.w}"></div>`;
    html+=`<div class="p-row"><label>높이</label><input type="number" step="50" data-f="height_mm" value="${m.h}"></div>`;
    if(obj.kind==='window') html+=`<div class="p-row"><label>창턱</label><input type="number" step="50" data-f="sillHeight_mm" value="${m.sill||0}"></div>`;
    html+=`<div class="p-btns"><button class="btn danger" data-a="del">🗑 삭제</button></div>`;
  }else{ props.style.display='none'; return; }
  props.innerHTML=html;
  props.style.display='block';
  props.querySelectorAll('[data-f]').forEach(el=>{
    el.addEventListener('change',()=>{
      const f=el.dataset.f;
      const v=(el.tagName==='SELECT'&&isNaN(Number(el.value)))?el.value:Number(el.value);
      if(f==='inch'||f==='length_mm'||f==='x'||f==='y') sendEdit('set',obj,{[f]:Number(el.value)});
      else sendEdit('set',obj,{[f]:v===''?null:v});
      setStatus(statusLive,'수정 → 평면 반영');
    });
  });
  props.querySelectorAll('[data-a]').forEach(el=>{
    el.addEventListener('click',()=>{
      const a=el.dataset.a;
      if(a==='rotl') rotateSelected(-15);
      else if(a==='rotr') rotateSelected(15);
      else if(a==='del') deleteSelected3D();
    });
  });
}

// ---------------------------------------------------------------------------
// 키보드
// ---------------------------------------------------------------------------
window.addEventListener('keydown',e=>{
  const tgt=e.target;
  if(tgt&&/INPUT|TEXTAREA|SELECT/.test(tgt.tagName)){
    if(tgt.closest&&tgt.closest('#vcb')){
      if(e.key==='Enter'){ commitActive(vcbTyped()); e.preventDefault(); }
      if(e.key==='Escape'){ cancelOp(); }
    }
    return;
  }
  const k=e.key.toLowerCase();
  // Ctrl+Z / Ctrl+Y — MiniCAD 히스토리로 실행취소/재실행 (스케치업 그 이상: 평면과 한 몸)
  if((e.ctrlKey||e.metaKey)&&(k==='z'||k==='y')){
    if(chan) chan.postMessage({type:'edit',op:(k==='y'||e.shiftKey)?'redo':'undo'});
    e.preventDefault(); return;
  }
  if((e.ctrlKey||e.metaKey)&&k==='s'){ screenshot(); e.preventDefault(); return; } // Ctrl+S = PNG 저장
  if(e.key==='?'){ showKeys(true); e.preventDefault(); return; }                    // ? = 단축키표
  // 동작 중 숫자 입력 → VCB 로 (스케치업 수치 입력)
  if(ST.op&&ST.op.type!=='tape'&&/^[0-9.,\-]$/.test(e.key)){
    const i=vcb&&vcb.querySelector('.v-v');
    if(i){ i.value=e.key; i.focus(); e.preventDefault(); }
    return;
  }
  if(e.key==='Enter'&&ST.op){ commitActive(vcbTyped()); return; }
  if(k==='escape'){
    const km=$('keysmodal');
    if(km&&km.style.display==='flex'){ showKeys(false); return; }
    if(document.querySelector('.menu.open')){ closeMenus(); return; }
    if(ST.op) cancelOp(); else if(ST.tool==='add') setTool('select'); else select(null); return;
  }
  ST.walk.keys[k]=true;
  if(ST.mode==='orbit'){
    if(k===' '){ setTool('select'); e.preventDefault(); return; }
    if(k==='m'){ setTool('move'); return; }
    if(k==='q'){ setTool('rotate'); return; }
    if(k==='s'&&!e.ctrlKey){ setTool('scale'); return; }
    if(k==='p'){ setTool('pushpull'); return; }
    if(k==='b'){ setTool('paint'); return; }
    if(k==='e'){ setTool('erase'); return; }
    if(k==='t'){ setTool('tape'); return; }
    if(k==='r'&&ST.tool==='add'&&ST.add&&ST.add.ghost){ ST.add.rot=((ST.add.rot||0)+(e.shiftKey?-15:15)+360)%360; ST.add.ghost.rotation.y=-ST.add.rot*Math.PI/180; invalidate(); e.preventDefault(); return; }
    if(k==='l'){ setTool('line'); return; }          // 스케치업 L=Line — 벽 그리기
    if(k==='r'){ setTool('rect'); return; }          // 스케치업 R=Rectangle — 사각 벽
    if(k==='g'){ setTool('add'); return; }           // 배치 (스케치업 컴포넌트 자리)
    if(k==='o'){ setTool('select'); return; }        // 스케치업 O=궤도 (선택에서 항상 궤도)
    if(k==='h'){ setTool('pan'); return; }           // 스케치업 H=팬
    if(k==='z'&&!e.shiftKey&&!e.ctrlKey){ setTool('zoom'); return; } // 스케치업 Z=줌
    if(k==='arrowright'){ if(ST.op&&ST.op.type==='move'){ ST.axisLock=(ST.axisLock==='x')?null:'x'; setStatus(statusLive,'축 고정: '+(ST.axisLock==='x'?'가로(X)':'해제')); e.preventDefault(); return; } }
    if(k==='arrowleft'){ if(ST.op&&ST.op.type==='move'){ ST.axisLock=(ST.axisLock==='y')?null:'y'; setStatus(statusLive,'축 고정: '+(ST.axisLock==='y'?'세로(Y)':'해제')); e.preventDefault(); return; } }
  }
  if(k==='1') setMode('orbit'); if(k==='2') setMode('walk');
  if(k==='3') setView('iso'); if(k==='4') setView('top'); if(k==='5') setView('front'); if(k==='6') setView('side');
  if(k==='n') setNight(!ST.night); // (L 은 스케치업 Line 도구로 — 조명 토글은 💡 버튼)
  if(k==='c'){ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshVisibility(); $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]); }
  if(k==='f'||(e.shiftKey&&k==='z')) fitView(); // Shift+Z = 전체 보기 (스케치업 Zoom Extents)
  // (R 은 스케치업 Rectangle 도구로 — 회전은 Q 도구·속성 패널 버튼)
  if((k==='delete'||k==='backspace')&&ST.selected){ deleteSelected3D(); e.preventDefault(); }
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup',e=>{ ST.walk.keys[e.key.toLowerCase()]=false; });
document.querySelectorAll('#walkpad button').forEach(b=>{
  const k=b.dataset.k;
  const on=e=>{e.preventDefault();ST.walk.keys[k]=true;};
  const off=e=>{e.preventDefault();ST.walk.keys[k]=false;};
  b.addEventListener('pointerdown',on); b.addEventListener('pointerup',off); b.addEventListener('pointerleave',off); b.addEventListener('pointercancel',off);
});

// ---------------------------------------------------------------------------
// 내보내기
// ---------------------------------------------------------------------------
function download(name,blobOrUrl){
  const a=document.createElement('a');
  a.href=typeof blobOrUrl==='string'?blobOrUrl:URL.createObjectURL(blobOrUrl);
  a.download=name; document.body.appendChild(a); a.click();
  setTimeout(()=>{ if(typeof blobOrUrl!=='string') URL.revokeObjectURL(a.href); a.remove(); },1500);
}
function fileStem(){ return ((ST.built&&ST.built.project)||'minicad').replace(/[\\/:*?"<>|]+/g,'_')+'_'+new Date().toISOString().slice(0,10); }
function exportGLB(){
  if(!ST.root) return;
  // Blender 2단계용 사본 — 이름표·광원 제거, extras 에 의미 데이터(종류·재질 코드) 탑재
  const exp=ST.root.clone(true);
  const rm=[];
  exp.traverse(o=>{
    if(o.isSprite||o.isPointLight){ rm.push(o); return; }
    const obj=o.userData&&o.userData.obj;
    if(obj&&o.isGroup){
      const mt=obj.meta||{};
      o.userData={ecorean:{kind:obj.kind,id:obj.id,name:obj.name||'',floor:obj.floorName||'',
        type:mt.type||null,material:mt.material||mt.floorMaterial||null,ceilingMaterial:mt.ceilingMaterial||null,
        size_mm:(mt.w&&mt.d)?[mt.w,mt.d]:null,wall_mm:(mt.L?[mt.L,mt.t,mt.H]:null)}};
    }else o.userData={};
  });
  rm.forEach(o=>{ if(o.parent) o.parent.remove(o); });
  new GLTFExporter().parse(exp,res=>{
    download(fileStem()+'.glb',new Blob([res],{type:'model/gltf-binary'}));
    setStatus(statusLive,'GLB 저장 — Blender 에서 File→Import→glTF (재질 이름 MC_*, extras.ecorean 에 재질 코드)');
  },err=>{ console.error(err); alert('GLB 내보내기 실패: '+(err&&err.message||err)); },{binary:true,onlyVisible:true});
}
function exportJSON(){
  if(!ST.doc) return;
  const full=MC3D.buildScene(ST.doc,LIBS);
  download(fileStem()+'_3d.json',new Blob([JSON.stringify({schema:'ECOREAN.MiniCAD3D.v1',unit:'mm',axes:'x right, y down(plan), z up',...full},null,1)],{type:'application/json'}));
}
function screenshot(){
  renderer.render(scene,camera);
  download(fileStem()+'_3d.png',renderer.domElement.toDataURL('image/png'));
}

// ---------------------------------------------------------------------------
// MiniCAD 연결 — localStorage(처음) + BroadcastChannel(실시간·편집)
// ---------------------------------------------------------------------------
const status=$('status');
let statusLive=false,_statusTxt='';
function setStatus(live,txt){ statusLive=live; _statusTxt=txt; status.className=live?'live':'off'; status.textContent=txt; }
function acceptDoc(payload,src){
  const doc=payload&&payload.data?payload.data:payload;
  if(!doc||typeof doc!=='object') return false;
  const at=(payload&&payload.at)||Date.now();
  if(at<ST.lastDocAt) return false;
  ST.lastDocAt=at;
  const first=!ST.built;
  try{ build(doc); }catch(e){ console.error('[3D] build 실패',e); setStatus(false,'조립 오류: '+e.message); return false; }
  if(first) fitView();
  setStatus(src==='live',src==='live'?'실시간 양방향 — 여기서 고치면 평면에 반영':'저장본 표시');
  return true;
}
function loadStored(){
  try{
    const raw=localStorage.getItem('minicad.3d.doc');
    if(raw) return acceptDoc(JSON.parse(raw),'stored');
  }catch(e){ console.warn('[3D] 저장본 읽기 실패',e); }
  return false;
}
const MF_PROTO=4; // 미니캐드(ui.js MC_PROTO)와 짝 — 어긋나면 새로고침 안내
function connect(){
  if(typeof BroadcastChannel==='undefined') return;
  chan=new BroadcastChannel('minicad-3d');
  chan.onmessage=e=>{
    const m=e.data||{};
    if(m.type==='doc'){
      if(m.proto&&m.proto!==MF_PROTO){ setStatus(false,'⚠ 버전 불일치 — 미니캐드·미니폼 창을 모두 새로고침(F5)'); }
      acceptDoc({at:m.at,data:m.doc},'live');
    }
  };
  chan.postMessage({type:'hello',at:Date.now(),proto:MF_PROTO});
}
window.addEventListener('storage',e=>{ if(e.key==='minicad.3d.doc'&&e.newValue){ try{acceptDoc(JSON.parse(e.newValue),'live');}catch(_){} } });

// ---------------------------------------------------------------------------
// UI 배선·루프
// ---------------------------------------------------------------------------
$('b-orbit').onclick=()=>setMode('orbit');
$('b-walk').onclick=()=>setMode('walk');
$('v-iso').onclick=()=>setView('iso');
$('v-top').onclick=()=>setView('top');
$('v-front').onclick=()=>setView('front');
$('v-side').onclick=()=>setView('side');
$('b-light').onclick=()=>setLights(!ST.lightsOn);
$('b-night').onclick=()=>setNight(!ST.night);
$('b-ceil').onclick=()=>{ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshVisibility(); $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]); };
$('b-label').onclick=()=>{ ST.labels=!ST.labels; refreshVisibility(); $('b-label').classList.toggle('on',ST.labels); };
$('b-shadow').onclick=()=>setShadows(!ST.shadows);
$('b-shot').onclick=screenshot;
$('b-glb').onclick=exportGLB;
$('b-json').onclick=exportJSON;
$('b-reload').onclick=()=>{ if(chan) chan.postMessage({type:'hello',at:Date.now()}); loadStored(); };
// 스케치업식 도구 바 (2026-09-03)
document.querySelectorAll('#tools .btn').forEach(b=>{ b.addEventListener('click',()=>setTool(b.dataset.t)); });
renderPaintPal();
renderAddPal();

// ===== 2026-09-04 스케치업 인터페이스: 메뉴 바 · Default Tray · 스타일 패널 · 단축키표 =====
function openTraySec(name){
  document.body.classList.remove('tray-off');
  const sec=document.querySelector('.tsec[data-sec="'+name+'"]');
  if(sec){ sec.classList.add('open'); sec.scrollIntoView({block:'nearest'}); }
  refreshStylePanel();
}
function setTray(on){ document.body.classList.toggle('tray-off',!on); refreshStylePanel(); invalidate(); }
function refreshStylePanel(){
  const set=(id,on)=>{ const el=$(id); if(el) el.classList.toggle('on',!!on); };
  set('st-light',ST.lightsOn); set('st-night',ST.night); set('st-ceil',ST.ceil[ST.mode]);
  set('st-label',ST.labels); set('st-shadow',ST.shadows); set('st-axes',ST.axes);
  const mi=(id,on)=>{ const el=$(id); if(el){ el.classList.toggle('chk',!!on); el.classList.toggle('unchk',!on); } };
  mi('mi-light',ST.lightsOn); mi('mi-night',ST.night); mi('mi-ceil',ST.ceil[ST.mode]);
  mi('mi-label',ST.labels); mi('mi-shadow',ST.shadows); mi('mi-axes',ST.axes);
  mi('mi-tray',!document.body.classList.contains('tray-off'));
}
function toggleCeil(){ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshVisibility(); const b=$('b-ceil'); if(b) b.classList.toggle('on',ST.ceil[ST.mode]); }
function toggleLabels(){ ST.labels=!ST.labels; refreshVisibility(); const b=$('b-label'); if(b) b.classList.toggle('on',ST.labels); }
function showKeys(on){ const m=$('keysmodal'); if(m) m.style.display=on?'flex':'none'; }
function closeMenus(){ document.querySelectorAll('.menu.open').forEach(m=>m.classList.remove('open')); }
function menuCmd(cmd){
  if(cmd.startsWith('tool-')){ setTool(cmd.slice(5)); return; }
  switch(cmd){
    case 'shot': screenshot(); break;
    case 'glb': exportGLB(); break;
    case 'json': exportJSON(); break;
    case 'reload': if(chan) chan.postMessage({type:'hello',at:0}); loadStored(); break;
    case 'undo': if(chan) chan.postMessage({type:'edit',op:'undo'}); break;
    case 'redo': if(chan) chan.postMessage({type:'edit',op:'redo'}); break;
    case 'del': deleteSelected3D(); break;
    case 'deselect': select(null); break;
    case 'light': setLights(!ST.lightsOn); break;
    case 'night': setNight(!ST.night); break;
    case 'ceil': toggleCeil(); break;
    case 'label': toggleLabels(); break;
    case 'shadow': setShadows(!ST.shadows); break;
    case 'axes': setAxes(!ST.axes); break;
    case 'orbit': setMode('orbit'); break;
    case 'walk': setMode('walk'); break;
    case 'iso': case 'top': case 'front': case 'side': setView(cmd); break;
    case 'fit': fitView(); break;
    case 'tray': setTray(document.body.classList.contains('tray-off')); break;
    case 'sec-info': openTraySec('info'); break;
    case 'sec-mat': openTraySec('mat'); break;
    case 'sec-comp': openTraySec('comp'); break;
    case 'sec-style': openTraySec('style'); break;
    case 'sec-instr': openTraySec('instr'); break;
    case 'keys': showKeys(true); break;
  }
  refreshStylePanel();
}
document.querySelectorAll('#menubar .menu>button').forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    const m=btn.parentElement, was=m.classList.contains('open');
    closeMenus(); if(!was) m.classList.add('open');
  });
  btn.addEventListener('mouseenter',()=>{ // 스케치업: 메뉴 하나 열려 있으면 호버로 전환
    if(document.querySelector('.menu.open')){ closeMenus(); btn.parentElement.classList.add('open'); }
  });
});
document.querySelectorAll('#menubar .mi').forEach(mi=>{
  mi.addEventListener('click',e=>{ e.stopPropagation(); closeMenus(); menuCmd(mi.dataset.cmd); });
});
document.addEventListener('click',()=>closeMenus());
document.querySelectorAll('.tsec .th').forEach(th=>{
  th.addEventListener('click',()=>{ th.parentElement.classList.toggle('open'); });
});
const _stWire={'st-light':()=>setLights(!ST.lightsOn),'st-night':()=>setNight(!ST.night),'st-ceil':toggleCeil,
  'st-label':toggleLabels,'st-shadow':()=>setShadows(!ST.shadows),'st-axes':()=>setAxes(!ST.axes)};
Object.entries(_stWire).forEach(([id,fn])=>{ const b=$(id); if(b) b.onclick=()=>{ fn(); refreshStylePanel(); }; });
const _kc=$('keys-close'); if(_kc) _kc.onclick=()=>showKeys(false);
const _bc2=$('b-ceil'); if(_bc2) _bc2.onclick=toggleCeil;      // 툴바 천장/이름표도 공용 토글로 일원화
const _bl2=$('b-label'); if(_bl2) _bl2.onclick=toggleLabels;
renderProps(null);
setTool('select');            // 강사·커서·상태 초기화
refreshStylePanel();

window.addEventListener('resize',()=>{
  camera.aspect=view.clientWidth/view.clientHeight; camera.updateProjectionMatrix();
  renderer.setSize(view.clientWidth,view.clientHeight);
  invalidate();
});

let prev=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-prev)/1000); prev=now;
  if(ST.mode==='orbit'){ if(orbit.enabled&&orbit.update()) needRender=true; }
  else { if(stepWalk(dt)) needRender=true; }
  if(ST.op) needRender=true;
  if(needRender){ renderer.render(scene,camera); needRender=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

connect();
if(!loadStored()){ $('empty').style.display='flex'; setStatus(false,'MiniCAD 연결 대기'); }
// 테스트·디버그 훅
window.MC3DVIEW={ST,scene,camera,renderer,build:acceptDoc,fitView,setMode,setLights,setView,setNight,
  sendEdit,rotateSelected,deleteSelected3D,setTool,commitActive,cancelOp,menuCmd,openTraySec,setAxes,snap3,segHitsSpace,
  axesOn:()=>!!(axesGrp&&axesGrp.visible),
  selectById:(fid,id)=>{const g=findGroup(fid,id);if(g)select(g);return !!g;},
  objCount:()=>{let n=0;ST.root&&ST.root.children.forEach(fg=>{n+=fg.children.length;});return n;}};
