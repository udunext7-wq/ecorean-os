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

const persp=new THREE.PerspectiveCamera(55,view.clientWidth/view.clientHeight,0.05,400);
persp.position.set(8,9,10);
// 평행 투영 (스케치업 Camera▸Parallel Projection) — 같은 위치·방향의 직교 카메라로 바꿔 끼운다
const orthoCam=new THREE.OrthographicCamera(-10,10,10,-10,-200,400);
let camera=persp;

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
orbit.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.ROTATE,RIGHT:THREE.MOUSE.PAN}; // 좌클릭=선택/도구 · 휠버튼=궤도 · 우클릭=팬 (스케치업과 동일)
orbit.zoomToCursor=true;                     // 스케치업: 휠 줌은 커서 위치를 향해
// Shift+휠버튼 드래그 = 팬 (스케치업) — OrbitControls 보다 먼저(캡처) 버튼 매핑을 바꾼다
renderer.domElement.addEventListener('pointerdown',e=>{
  if(e.button===1) orbit.mouseButtons.MIDDLE=e.shiftKey?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;
},true);
// 동작(선 긋기·이동…) 중에도 휠버튼 궤도는 살아 있다(스케치업) — 터치 한 손가락 궤도만 잠근다
function opOrbit(on){ orbit.touches.ONE=on?null:THREE.TOUCH.ROTATE; }

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
  // 2026-09-04 스케치업 동등화
  selSet:new Set(), selKeys:[],             // 다중 선택 (Shift/Ctrl 클릭 · 선택 상자 · 더블/트리플 클릭)
  hidden:new Set(), guides:[], clip:null,   // 숨김 키(fid|id) · 줄자 안내선 · 복사 버퍼(Ctrl+C/V)
  lastCommit:null, camHist:[], camPos:-1,   // VCB 후속 입력(동작 뒤 숫자 재입력·xN 배열) · 카메라 이전/다음
  sunT:0.42, ortho:false, xray:false, tags:{}, // 태양 시각 · 평행 투영 · X-ray · 태그(레이어) 표시
  annots:[],                                 // 치수·문자 주석 (3D 표시용)
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
  g.position.set(obj.x*MM,(obj.elev||0)*MM,obj.y*MM); // elev = 바닥에서 띄움 (Z 자유)
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
  Object.keys(ST.snapData).forEach(fid=>rebuildGuideSnap(fid)); // 안내선·교차점 스냅 재구성
  placeSun();                                                    // 태양·그림자 범위 (시각 슬라이더 반영)
  if(ST.xray) setXray(true,true);                                // X-ray 유지
  renderOutliner();
  const projEl=$('proj'); if(projEl) projEl.textContent=project?' · '+project:'';
  $('empty').style.display='none';
  buildAxes();
  invalidate(true);
}
// --- 태양 위치 (스케치업 Shadows 시각 슬라이더: 0=아침 · 0.5=정오 · 1=저녁) ---
function placeSun(){
  if(!ST.built) return;
  const b=ST.built.bounds, zt=ST.built.totalHeight||2700;
  const cx=(b.minX+b.maxX)/2*MM, cz=(b.minY+b.maxY)/2*MM;
  const span=Math.max(b.maxX-b.minX,b.maxY-b.minY,1000)*MM;
  const t=Math.max(0.02,Math.min(0.98,ST.sunT));
  const a=(t-0.5)*Math.PI*1.1, el=0.25+0.75*Math.sin(Math.PI*t);
  sun.position.set(cx+Math.sin(a)*span*0.9,(span*0.9+zt*MM+6)*el,cz+Math.cos(a)*span*0.5+span*0.2);
  sun.target.position.set(cx,0,cz);
  const sc=sun.shadow.camera; sc.left=-span*0.8; sc.right=span*0.8; sc.top=span*0.8; sc.bottom=-span*0.8; sc.near=0.5; sc.far=span*3+zt*MM+20; sc.updateProjectionMatrix();
  invalidate(true);
}
function setSunT(t){ ST.sunT=Math.max(0,Math.min(1,t)); placeSun(); const s=$('st-sun'); if(s&&document.activeElement!==s) s.value=Math.round(ST.sunT*100); }
// --- 줄자 안내선(Guide) → 스냅 데이터: 'guide' 선 + 안내선끼리·안내선-벽 'intersection' 점 ---
function rebuildGuideSnap(fid){
  const sd=ST.snapData[fid]; if(!sd) return;
  const gs=ST.guides.filter(g=>g.fid===fid);
  sd.guides=gs.map(g=>({x1:g.x1,y1:g.y1,x2:g.x2,y2:g.y2}));
  const pts=[];
  const X=(a,b)=>{ // 두 무한직선 교점
    const d=(a.x2-a.x1)*(b.y2-b.y1)-(a.y2-a.y1)*(b.x2-b.x1); if(Math.abs(d)<1e-9) return null;
    const t=((b.x1-a.x1)*(b.y2-b.y1)-(b.y1-a.y1)*(b.x2-b.x1))/d;
    return {x:a.x1+t*(a.x2-a.x1),y:a.y1+t*(a.y2-a.y1)};
  };
  const onSeg=(p,w)=>{const q=closestOnSeg(p,w);return Math.hypot(q.x-p.x,q.y-p.y)<1;};
  sd.guides.forEach((g,i)=>{
    sd.guides.forEach((h,j)=>{ if(j>i){const p=X(g,h); if(p) pts.push(p);} });
    sd.walls.forEach(w=>{ const p=X(g,w); if(p&&onSeg(p,w)) pts.push(p); });
  });
  sd.xpts=pts;
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
      let vis=true;
      if(o.kind==='ceiling') vis=ST.ceil[ST.mode];
      const tg=TAG_OF(o); if(tg&&ST.tags[tg]===false) vis=false;   // 태그(레이어) 끔
      if(ST.hidden.has(o.floorId+'|'+o.id)) vis=false;               // 숨기기(H)
      g.visible=vis;
    });
  });
  invalidate(true);
}
const TAG_NAMES=['벽','바닥','천장','문','창','가구','기구','조명','전기','설비','기둥'];
const TAG_OF=o=>({wall:'벽',floor:'바닥',ceiling:'천장',door:'문',window:'창',furniture:'가구',fixture:'기구',light:'조명',electric:'전기',hvac:'설비',pillar:'기둥'})[o.kind]||null;
function setTag(name,on){ ST.tags[name]=!!on; refreshVisibility(); renderTags(); }
function renderTags(){
  const el=$('tags'); if(!el) return;
  el.innerHTML=TAG_NAMES.map(n=>'<label class="tag"><input type="checkbox" data-tag="'+n+'"'+(ST.tags[n]===false?'':' checked')+'> '+n+'</label>').join('');
  el.querySelectorAll('input[data-tag]').forEach(i=>{ i.onchange=()=>setTag(i.dataset.tag,i.checked); });
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
  if(m==='walk'&&ST.ortho) setOrtho(false);   // 걷기는 원근으로
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
// --- 평행 투영 (스케치업 Parallel Projection) ---
function _orthoFit(){
  const d=camera.position.distanceTo(orbit.target);
  const h=Math.max(0.5,d)*Math.tan(persp.fov*Math.PI/360), asp=view.clientWidth/Math.max(1,view.clientHeight);
  orthoCam.left=-h*asp; orthoCam.right=h*asp; orthoCam.top=h; orthoCam.bottom=-h; orthoCam.updateProjectionMatrix();
}
function setOrtho(on){
  on=!!on&&ST.mode!=='walk';
  ST.ortho=on;
  const to=on?orthoCam:persp;
  if(camera!==to){ to.position.copy(camera.position); to.quaternion.copy(camera.quaternion); to.zoom=1; camera=to; orbit.object=camera; }
  if(on) _orthoFit(); else { persp.aspect=view.clientWidth/view.clientHeight; persp.updateProjectionMatrix(); }
  orbit.update(); refreshStylePanel(); invalidate();
}
// 화면 1px 이 평면에서 몇 mm 인가 — 스냅 허용 반경(픽셀 기준)용
function mmPerPx(wp){
  const h=Math.max(1,renderer.domElement.clientHeight);
  if(camera.isOrthographicCamera) return ((camera.top-camera.bottom)/camera.zoom)/h/MM;
  return (2*camera.position.distanceTo(wp)*Math.tan(camera.fov*Math.PI/360))/h/MM;
}
// --- 카메라 이전/다음 (스케치업 Previous/Next) ---
function camPush(){
  if(ST.mode!=='orbit') return;
  const s={p:camera.position.clone(),t:orbit.target.clone(),o:ST.ortho};
  const last=ST.camHist[ST.camPos];
  if(last&&last.p.distanceTo(s.p)<1e-3&&last.t.distanceTo(s.t)<1e-3&&last.o===s.o) return;
  ST.camHist=ST.camHist.slice(0,ST.camPos+1); ST.camHist.push(s);
  if(ST.camHist.length>40) ST.camHist.shift();
  ST.camPos=ST.camHist.length-1;
}
function camGo(i){
  const s=ST.camHist[i]; if(!s) return;
  ST.camPos=i; if(ST.mode!=='orbit') setMode('orbit');
  if(s.o!==ST.ortho) setOrtho(s.o);
  camera.position.copy(s.p); orbit.target.copy(s.t); if(ST.ortho) _orthoFit(); orbit.update(); invalidate();
}
function camPrev(){ if(ST.camPos>0) camGo(ST.camPos-1); else setStatus(statusLive,'이전 시점 없음'); }
function camNext(){ if(ST.camPos<ST.camHist.length-1) camGo(ST.camPos+1); else setStatus(statusLive,'다음 시점 없음'); }
orbit.addEventListener('end',()=>camPush());
function setView(name){
  if(!ST.built) return;
  const b=ST.built.bounds, cx=(b.minX+b.maxX)/2*MM, cz=(b.minY+b.maxY)/2*MM;
  const span=Math.max(b.maxX-b.minX,b.maxY-b.minY,4000)*MM;
  const midY=(ST.built.totalHeight||2700)*MM/2;
  setMode('orbit'); camPush();
  orbit.target.set(cx,Math.min(midY,1.2),cz);
  const hw=(b.maxX-b.minX)*MM/2, hd=(b.maxY-b.minY)*MM/2;
  if(name==='top') camera.position.set(cx+0.01,span*1.5+ST.built.totalHeight*MM,cz+0.01);
  else if(name==='front') camera.position.set(cx,midY+span*0.12,cz+hd+span*1.05);
  else if(name==='back') camera.position.set(cx,midY+span*0.12,cz-hd-span*1.05);
  else if(name==='side'||name==='right') camera.position.set(cx+hw+span*1.05,midY+span*0.12,cz);
  else if(name==='left') camera.position.set(cx-hw-span*1.05,midY+span*0.12,cz);
  else camera.position.set(cx+span*0.35,span*0.95+2,cz+span*0.85); // iso
  if(ST.ortho) _orthoFit();
  orbit.update(); invalidate(); camPush();
}
function fitView(keepDir){
  if(!ST.built) return;
  if(ST.mode==='orbit'){
    if(!keepDir){ setView('iso'); return; }
    camPush();                                     // 스케치업 Zoom Extents: 보던 방향 그대로 전체가 들어오게
    const b=ST.built.bounds, cx=(b.minX+b.maxX)/2*MM, cz=(b.minY+b.maxY)/2*MM;
    const span=Math.max(b.maxX-b.minX,b.maxY-b.minY,4000)*MM;
    const dir=camera.position.clone().sub(orbit.target); if(dir.length()<1e-6) dir.set(0.35,0.95,0.85); dir.normalize();
    orbit.target.set(cx,Math.min((ST.built.totalHeight||2700)*MM/2,1.2),cz);
    camera.position.copy(orbit.target).addScaledVector(dir,span*1.3+2);
    if(ST.ortho){ orthoCam.zoom=1; _orthoFit(); }
    orbit.update(); invalidate(); camPush(); return;
  }
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
  ent.group.children.forEach(g=>{ if(!found&&g.userData.obj&&String(g.userData.obj.id)===String(id)) found=g; });
  return found;
}
// --- 선택 (스케치업 Select) — 클릭=단일 · Ctrl/Shift+클릭=추가/토글 · Shift+Ctrl+클릭=제외 · 끌기=선택 상자 ---
//  ST.selSet = 선택된 그룹 집합, ST.selected = 대표(마지막) 객체 — 기존 단일 선택 코드와 호환
function _hl(g,on){
  g.traverse(o=>{
    if(!o.isMesh) return;
    if(on){ if(o.userData._mat) return; o.userData._mat=o.material; const m=o.material.clone(); m.emissive=new THREE.Color('#C9A961'); m.emissiveIntensity=0.45; o.material=m; }
    else if(o.userData._mat){ o.material=o.userData._mat; delete o.userData._mat; }
  });
}
const keyOf=g=>{ const o=g&&g.userData.obj; return o?o.floorId+'|'+o.id:null; };
function select(g,opts){
  opts=opts||{};
  if(g&&g.isMesh) g=g.parent;
  if(opts.toggle||opts.add||opts.remove){
    if(!g) return;
    const has=ST.selSet.has(g);
    if(opts.remove||(opts.toggle&&has)){ ST.selSet.delete(g); _hl(g,false); }
    else { ST.selSet.add(g); _hl(g,true); }
  }else{
    ST.selSet.forEach(x=>_hl(x,false)); ST.selSet.clear();
    if(g){ ST.selSet.add(g); _hl(g,true); }
  }
  _syncSel();
}
function selectGroups(gs,opts){
  opts=opts||{};
  if(!opts.add&&!opts.remove){ ST.selSet.forEach(x=>_hl(x,false)); ST.selSet.clear(); }
  gs.forEach(g=>{ if(opts.remove){ ST.selSet.delete(g); _hl(g,false); } else { ST.selSet.add(g); _hl(g,true); } });
  _syncSel();
}
function _syncSel(){
  const arr=[...ST.selSet];
  ST.selected=arr.length?arr[arr.length-1]:null;
  ST.selKeys=arr.map(keyOf);
  ST.selKey=ST.selected?{floorId:ST.selected.userData.obj.floorId,id:ST.selected.userData.obj.id}:null;
  if(!ST.selected){ hideTip(); renderProps(null); renderOutliner(); invalidate(); return; }
  renderProps(ST.selected.userData.obj,arr.length>1?{multi:arr.map(x=>x.userData.obj)}:null);
  renderOutliner();
  invalidate();
}
function reselect(){
  if(!ST.selKeys.length) return;
  const gs=[];
  ST.selKeys.forEach(k=>{ const i=k.indexOf('|'); const g=findGroup(k.slice(0,i),k.slice(i+1)); if(g) gs.push(g); });
  ST.selSet.clear();              // 옛 그룹은 재조립으로 폐기됨 — 새 그룹에 하이라이트 재적용
  selectGroups(gs);
}
function visibleGroups(fid){
  const out=[];
  ST.root&&ST.root.children.forEach(fg=>{
    if(!fg.visible||(fid&&fg.userData.floorId!==fid)) return;
    fg.children.forEach(g=>{ if(g.visible&&g.userData.obj&&g.userData.obj.kind!=='slab') out.push(g); });
  });
  return out;
}
function selectAll(){ // Ctrl+A — 보이는 층의 모든 객체 (천장 제외)
  selectGroups(visibleGroups(ST.floorSel!=='all'?ST.floorSel:null).filter(g=>g.userData.obj.kind!=='ceiling'));
  setStatus(statusLive,'모두 선택 ('+ST.selSet.size+'개)');
}
function selectSpaceGroup(fid,sid){ // 바닥 더블클릭 = 그 방(면+벽+천장+배치) 전체 — 스케치업 그룹 진입에 해당
  const S=String(sid);
  const gs=visibleGroups(fid).filter(g=>{ const o=g.userData.obj, m=o.meta||{};
    return (o.kind==='floor'&&String(o.id)===S)||(o.kind==='ceiling'&&String(o.id)===S+'_ceil')||String(m.spaceId)===S||String(o.spaceId)===S; });
  selectGroups(gs);
  setStatus(statusLive,'방 전체 선택 ('+gs.length+'개) — Del 은 배치물만, 벽·면은 평면에서');
}
function selectWallNeighbors(g){ // 벽 더블클릭 = 끝점이 이어진 벽들 (스케치업 면+연결선 선택)
  const o=g.userData.obj, m=o.meta||{};
  if(o.kind!=='wall'||m.x1==null){ select(g); return; }
  const near=(a,b,c,d)=>Math.hypot(a-c,b-d)<5;
  const gs=visibleGroups(o.floorId).filter(x=>{ const w=x.userData.obj, wm=w.meta||{};
    if(w.kind!=='wall'||wm.x1==null) return false; if(x===g) return true;
    return near(wm.x1,wm.y1,m.x1,m.y1)||near(wm.x1,wm.y1,m.x2,m.y2)||near(wm.x2,wm.y2,m.x1,m.y1)||near(wm.x2,wm.y2,m.x2,m.y2); });
  selectGroups(gs);
  setStatus(statusLive,'연결된 벽 '+gs.length+'개 선택');
}
// 선택 상자 — 왼→오른쪽 = 완전히 들어온 것(창), 오른→왼쪽 = 걸친 것(걸치기, 점선)
let selbox=null;
function showSelBox(x0,y0,x1,y1){
  if(!selbox){ selbox=document.createElement('div'); selbox.id='selbox'; document.body.appendChild(selbox); }
  selbox.style.display='block';
  selbox.style.left=Math.min(x0,x1)+'px'; selbox.style.top=Math.min(y0,y1)+'px';
  selbox.style.width=Math.abs(x1-x0)+'px'; selbox.style.height=Math.abs(y1-y0)+'px';
  selbox.classList.toggle('cross',x1<x0);
}
function hideSelBox(){ if(selbox) selbox.style.display='none'; }
function _screenRect(g){
  const box=new THREE.Box3().setFromObject(g); if(box.isEmpty()) return null;
  const r=renderer.domElement.getBoundingClientRect();
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(let i=0;i<8;i++){
    const v=new THREE.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(camera);
    if(v.z>1) return null;
    const sx=r.left+(v.x+1)/2*r.width, sy=r.top+(1-v.y)/2*r.height;
    minX=Math.min(minX,sx); maxX=Math.max(maxX,sx); minY=Math.min(minY,sy); maxY=Math.max(maxY,sy);
  }
  return {minX,minY,maxX,maxY};
}
function boxSelect(x0,y0,x1,y1,e){
  const crossing=x1<x0;
  const L=Math.min(x0,x1),R=Math.max(x0,x1),T=Math.min(y0,y1),B=Math.max(y0,y1);
  const gs=visibleGroups(ST.floorSel!=='all'?ST.floorSel:null).filter(g=>{
    const k=g.userData.obj.kind; if(k==='floor'||k==='ceiling') return false;
    const s=_screenRect(g); if(!s) return false;
    return crossing?(s.maxX>=L&&s.minX<=R&&s.maxY>=T&&s.minY<=B):(s.minX>=L&&s.maxX<=R&&s.minY>=T&&s.maxY<=B);
  });
  const minus=!!(e&&e.shiftKey&&(e.ctrlKey||e.metaKey));
  const add=!!(e&&(e.ctrlKey||e.metaKey||e.shiftKey))&&!minus;
  selectGroups(gs,{add,remove:minus});
  setStatus(statusLive,'선택 '+ST.selSet.size+'개'+(crossing?' (걸치기)':''));
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
function pick(cx,cy,e){
  const hit=hitAt(cx,cy);
  const mod=!!(e&&(e.ctrlKey||e.metaKey||e.shiftKey));
  if(!hit){ if(!mod) select(null); return; }
  const g=hit.object.parent;
  if(mod){ select(g,(e.shiftKey&&(e.ctrlKey||e.metaKey))?{remove:true}:{toggle:true}); return; }
  select(g);                                   // 스케치업: 같은 것을 다시 클릭해도 선택 유지
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
  setMode('orbit'); camPush();
  orbit.target.copy(c); orbit.target.y=Math.max(0.4,c.y*0.5);
  camera.position.set(c.x+span*0.5,Math.max(size.y,1)+span*0.9,c.z+span*0.95);
  if(ST.ortho){ orthoCam.zoom=1; _orthoFit(); }
  orbit.update(); invalidate(); camPush();
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
// 단위 접미 (스케치업 Measurements): "2.5m" "250cm" "2500" "2500mm" → mm · 각도 ° · 배율 × 는 벗긴다 · 음수 허용(반대 방향)
function parseLen(str){
  const t=String(str==null?'':str).trim().replace(/[°×]+$/,'').trim();
  const m=t.match(/^(-?[\d.]+)\s*(mm|cm|m)?$/i); if(!m) return null;
  const v=parseFloat(m[1]); if(!isFinite(v)) return null;
  const u=(m[2]||'mm').toLowerCase();
  return u==='m'?v*1000:u==='cm'?v*10:v;
}
function vcbRaw(){ const i=vcb&&vcb.querySelector('.v-v'); return i?String(i.value).trim():''; }
function vcbTyped(){ const r=vcbRaw(); if(!r||/^[\[<]/.test(r)) return null; const v=parseLen(r); if(v!=null) return v; const f=parseFloat(r); return isFinite(f)?f:null; }
function vcbPair(){ // 사각형 치수 "3000,2000" · "3000x2000" · "3m,2m"
  const m=vcbRaw().match(/^(-?[\d.]+\s*(?:mm|cm|m)?)\s*[,xX*]\s*(-?[\d.]+\s*(?:mm|cm|m)?)$/i);
  return m?{w:parseLen(m[1]),h:parseLen(m[2])}:null;
}
function vcbCoord(){ // 선 도구: "[x,y]" = 절대 좌표 · "<dx,dy>" = 상대 좌표 (스케치업 Measurements)
  const m=vcbRaw().match(/^([\[<])\s*(-?[\d.]+\s*(?:mm|cm|m)?)\s*[,;]\s*(-?[\d.]+\s*(?:mm|cm|m)?)\s*[\]>]?$/i);
  return m?{abs:m[1]==='[',x:parseLen(m[2]),y:parseLen(m[3])}:null;
}
function vcbSides(){ // 원 도구: "6s" = 다각형 변 수
  const m=vcbRaw().match(/^(\d+)\s*s$/i); return m?Math.max(3,Math.min(64,parseInt(m[1],10))):null;
}
// --- 여러 편집을 한 메시지로 (미니캐드 batch → Ctrl+Z 한 단계) ---
function sendBatch(ops,label){
  if(!chan){ setStatus(false,'MiniCAD 창이 없어 반영 못함'); return false; }
  if(!ops.length) return false;
  if(ops.length===1){ const o=ops[0]; chan.postMessage({type:'edit',op:o.op,kind:o.kind,id:o.id,floorId:o.floorId,patch:o.patch||{}}); return true; }
  chan.postMessage({type:'edit',op:'batch',label:label||'',ops});
  return true;
}
// --- 확정 뒤 재입력 (스케치업: 동작 확정 직후 숫자를 치면 되돌려 그 값으로 다시) · Ctrl+복사 뒤 xN · /N = 배열 복사 ---
function setLast(label,unit,apply){ ST.lastCommit={label,unit,apply,seq:0}; }
function vcbPostOn(ch){
  const lc=ST.lastCommit; if(!lc||!vcb) return false;
  vcbShow(lc.label+' (재입력)',ch,lc.unit);
  const i=vcb.querySelector('.v-v'); i.value=ch; i.dataset.post='1'; i.focus();
  return true;
}
function vcbPostOff(){ ST.lastCommit=null; const i=vcb&&vcb.querySelector('.v-v'); if(i&&i.dataset.post){ delete i.dataset.post; vcbHide(); } }
function vcbPostEnter(){
  const lc=ST.lastCommit, raw=vcbRaw();
  const i=vcb&&vcb.querySelector('.v-v'); if(i){ delete i.dataset.post; i.blur(); }
  if(!lc||!raw){ vcbHide(); return; }
  const a1=raw.match(/^([x*\/])\s*(\d+)$/i), a2=raw.match(/^(\d+)\s*([x*\/])$/i);
  if(a1||a2){ const n=parseInt(a1?a1[2]:a2[1],10), div=(a1?a1[1]:a2[2])==='/'; arrayCopy(n,div); vcbHide(); return; }
  if(chan) chan.postMessage({type:'edit',op:'undo'});      // 방금 확정한 것을 물리고
  const ok=lc.apply(raw); lc.seq++;                        // 새 값으로 다시 (실패하면 되돌린 것을 복구)
  if(ok===false){ if(chan) chan.postMessage({type:'edit',op:'redo'}); setStatus(statusLive,'재입력 값을 이해 못했습니다: '+raw); }
  vcbHide();
}
function arrayCopy(n,div){
  const lm=ST.lastMove;
  if(!lm||!lm.copy||!(n>1)){ setStatus(statusLive,'배열 복사는 Ctrl+이동(복사) 직후에 x3 또는 /3'); return; }
  const ks=div?Array.from({length:n-1},(_,i)=>(i+1)/n):Array.from({length:n-1},(_,i)=>i+2);
  const ops=[];
  ks.forEach(k=>lm.items.forEach(it=>ops.push({op:'clone',kind:KINDMAP[it.obj.kind],id:it.obj.id,floorId:it.obj.floorId,patch:{x:Math.round(it.ox+lm.dx*k),y:Math.round(it.oy+lm.dy*k)}})));
  if(sendBatch(ops,'배열 복사')) setStatus(statusLive,'배열 복사 '+(div?'/':'×')+n+' → '+ops.length+'개 추가 (Ctrl+Z 한 번)');
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
  vcbPostOff();
  ST.tool=t;
  document.querySelectorAll('#tools .btn').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  if(t==='paint') openTraySec('mat');    // 트레이(우측)의 재질 패널 열기 — 스케치업 Default Tray
  if(t==='add') openTraySec('comp');
  if(t==='add'&&ST.add&&ST.add.type) makeGhost();
  // 스케치업식 마우스: 좌클릭은 도구 몫 · 궤도(O)/팬(H)/줌(Z) 도구에서만 좌클릭 드래그가 카메라
  orbit.mouseButtons.LEFT=(t==='orbit')?THREE.MOUSE.ROTATE:(t==='pan')?THREE.MOUSE.PAN:(t==='zoom')?THREE.MOUSE.DOLLY:null;
  renderer.domElement.style.cursor={select:'default',move:'move',rotate:'grab',scale:'nwse-resize',line:'crosshair',rect:'crosshair',circle:'crosshair',arc:'crosshair',offset:'crosshair',pushpull:'ns-resize',paint:'copy',erase:'not-allowed',tape:'crosshair',dim:'crosshair',text:'text',orbit:'all-scroll',pan:'grab',zoom:'zoom-in',add:'copy'}[t]||'default';
  setStatus(statusLive,{select:'➤ 선택',move:'✥ 이동',rotate:'↻ 회전',scale:'⤢ 배율',line:'╱ 선(벽)',rect:'▭ 사각형(면)',circle:'○ 원(면)',arc:'◜ 호(벽)',offset:'⧉ 오프셋',pushpull:'⇕ 밀기끌기',paint:'🪣 페인트',erase:'🧽 지우개',tape:'📏 줄자',dim:'↔ 치수',text:'A 문자',orbit:'🔄 궤도',pan:'🖐 팬',zoom:'🔍 줌',add:'➕ 배치'}[t]||'');
  // 하단 상태바 = 스케치업식 도구 안내 (수정자 포함)
  const hint=$('hint');
  if(hint) hint.innerHTML={
    select:'<b>선택</b> — 클릭=선택 · <b>Shift/Ctrl+클릭=추가</b> · 끌기=선택 상자(←방향은 걸치기) · 더블클릭=방/연결벽 · 트리플=전체 · 배치물 끌기=이동 · Ctrl+끌기=복사 · Del · 우클릭=메뉴',
    move:'<b>이동</b> — 클릭-이동-클릭 · <b>Ctrl=복사</b>(뒤에 x3 · /3 = 배열) · ←→=X/Y 고정 · <b>↑=높이(Z)</b> · <b>숫자=거리</b>(2.5m·250cm) · 문·창은 벽 위로 · Esc 취소',
    rotate:'<b>회전</b> — 객체 클릭 → 기준점 클릭 → 각도 (각도기) · 15° 스냅(Shift=자유각) · <b>숫자=각도</b> · Esc 취소',
    scale:'<b>배율</b> — 객체 클릭 후 위아래로 (Shift=가로/세로 따로) · 클릭=확정 · <b>숫자=배율</b>(1.5) · 가구·기구·설비만',
    line:'<b>선</b> — 클릭-클릭 사슬 · <b>시작점으로 돌아오면 면</b> · 면 위=분할 · 빈 곳=벽 · <b>Shift=방향 고정</b> · ←→=축 고정 · ↓=벽에 평행/수직 · 숫자=길이 · [x,y] 절대 · &lt;dx,dy&gt; 상대 · Esc/더블클릭=끝',
    rect:'<b>사각형</b> — 두 모서리 클릭 = <b>면 생성</b>(점 4·선 4·면 1 이 한 그룹) · <b>가로,세로</b> 입력(3m,2m) · Ctrl+Z 한 번에 취소',
    circle:'<b>원</b> — 중심 클릭 → 반지름 · <b>숫자=반지름</b> · <b>6s=육각형</b> · 면(공간)으로 생성',
    arc:'<b>호</b> — 시작 · 끝 · 불룩한 정도 3클릭 → 벽 조각 사슬 (Ctrl+Z 한 번)',
    offset:'<b>오프셋</b> — 바닥(면) 클릭 후 안/밖으로 · <b>숫자=거리</b> · 클릭=확정 (안쪽 면 생성)',
    pushpull:'<b>밀기끌기</b> — 벽 윗면=높이 · <b>벽 옆면=두께</b> · 천장=천장고 · 클릭=확정 · <b>숫자=mm</b> · <b>더블클릭=직전 값 반복</b>',
    paint:'<b>페인트</b> — 트레이 재질 고르고 벽/바닥/천장 클릭 · <b>Alt+클릭=재질 추출</b> (견적 연동)',
    erase:'<b>지우개</b> — 클릭/끌기=삭제 · <b>Shift+클릭=숨기기</b> (벽·공간은 평면에서)',
    tape:'<b>줄자</b> — 두 점 클릭 = 거리 · <b>벽(선)에서 시작하면 안내선</b>(숫자=간격) · 안내선끼리 교차점 스냅 · Esc 초기화',
    dim:'<b>치수</b> — 두 점 클릭 = 치수선(mm) — 3D 표시용',
    text:'<b>문자</b> — 클릭한 곳에 메모 — 3D 표시용',
    orbit:'<b>궤도</b> — 끌어서 회전 (휠버튼 드래그와 같음) · Shift=팬',
    pan:'<b>팬</b> — 끌어서 화면 이동 (우클릭·Shift+휠버튼 드래그와 같음)',
    zoom:'<b>줌</b> — 위아래로 끌어 확대/축소 (휠과 같음) · Shift+Z=전체',
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
  // 배치 고스트도 점·선·원점 스냅 (2026-09-04)
  const s=snap3(fid,{x:dragPt.x/MM,y:dragPt.z/MM},z0);
  if(s.kind!=='grid') showSnap(s,z0); else hideSnap();
  a.ghost.position.set(s.x*MM,z0,s.y*MM);
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
function snap3(fid,p,z0m,extra){
  const sd=ST.snapData[fid];
  const grid={x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10,kind:'grid'};
  if(!sd) return grid;
  // 2026-09-04: 허용 반경을 화면 픽셀 기준으로 (스케치업식) — 줌을 빼도 14px 안이면 잡힌다
  const mmpp=mmPerPx(new THREE.Vector3(p.x*MM,z0m||0,p.y*MM));
  const T_END=Math.min(2500,Math.max(60,14*mmpp));
  const T_MID=Math.min(2200,Math.max(50,12*mmpp));
  const T_EDGE=Math.min(1800,Math.max(40,10*mmpp));
  let best=null;
  const pt=(v,kind)=>{ const d=Math.hypot(v.x-p.x,v.y-p.y); if(d<=T_END&&(!best||d<best.d)) best={x:v.x,y:v.y,d,kind}; };
  // 원점(0,0) 기준점 스냅 — 끝점과 같은 우선순위
  pt({x:0,y:0},'origin');
  sd.verts.forEach(v=>pt(v,'endpoint'));
  if(extra) extra.forEach(v=>pt(v,'endpoint'));                 // 그리는 중인 사슬의 점들 (폐합용)
  if(sd.xpts) sd.xpts.forEach(v=>pt(v,'intersection'));          // 안내선 교차점 (스케치업 Intersection)
  if(!best) sd.walls.forEach(w=>{const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2;const d=Math.hypot(mx-p.x,my-p.y); if(d<=T_MID&&(!best||d<best.d)) best={x:mx,y:my,d,kind:'midpoint'};});
  if(!best){
    let bd=T_EDGE,bp=null,bk='edge';
    sd.walls.forEach(w=>{const q=closestOnSeg(p,w);const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;bp=q;bk='edge';}});
    (sd.guides||[]).forEach(w=>{const q=closestOnSeg(p,w);const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;bp=q;bk='guide';}});
    if(bp) best={x:bp.x,y:bp.y,d:bd,kind:bk};
  }
  return best?{x:Math.round(best.x),y:Math.round(best.y),kind:best.kind}:grid;
}
const SNAP_COL={endpoint:0x2FA84F,midpoint:0x35C2CF,edge:0xE24C4C,origin:0x4C7DE2,intersection:0xFF5A5A,guide:0x9A9AFF,lock:0xE24CE2,axis:0xE24C4C,from:0xE24CE2};
const SNAP_NAME={endpoint:'끝점',midpoint:'중간점',edge:'선 위',origin:'원점(0,0)',intersection:'교차점',guide:'안내선 위',lock:'방향 고정',axis:'축 위',from:'점에서'};
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
  const p=snap3(fid,raw,z0); showSnap(p,z0); // 시작점도 점·선에 흡착 (픽셀 기준 반경)
  const rect=(ST.tool==='rect');
  const geo=new THREE.BufferGeometry().setFromPoints(new Array(rect?5:2).fill(0).map(()=>new THREE.Vector3(p.x*MM,z0+0.02,p.y*MM)));
  const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln);
  const gh=new THREE.Mesh(geoBox,new THREE.MeshStandardMaterial({color:0xD4FF3D,transparent:true,opacity:0.22,depthWrite:false}));
  gh.visible=false; scene.add(gh);
  // 점 추론선 (스케치업 "From Point" — 지나온 점과 X/Y 가 맞으면 점선 안내)
  const inf=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:0xE24CE2,dashSize:0.08,gapSize:0.05,depthTest:false}));
  inf.renderOrder=999; inf.visible=false; scene.add(inf);
  ST.op={type:'line',rect,fid,z0,a:p,cur:p,line:ln,ghost:gh,infLine:inf,chain:[p],sent:0,shiftLock:null,fromPt:null,dir:null};
  // 첫 점 고정 표시 — 점이 찍혔음을 분명하게
  const smk=new THREE.Mesh(geoSph,new THREE.MeshBasicMaterial({color:0xD4FF3D,depthTest:false}));
  smk.scale.setScalar(0.055); smk.renderOrder=1000;
  smk.position.set(p.x*MM,z0+0.03,p.y*MM);
  scene.add(smk); ST.op.startMk=smk;
  opOrbit(true);
  vcbShow(rect?'가로,세로':'길이 · [x,y] · <dx,dy>','', 'mm');
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
function spawnPendingPoly(pts,z0){ // 다각형 면 + 둘레 벽 임시 표시
  if(!pts||pts.length<3) return;
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0xC9A961,transparent:true,opacity:0.35,depthWrite:false,side:THREE.DoubleSide});
  const shape=new THREE.Shape(pts.map(p=>new THREE.Vector2(p.x*MM,p.y*MM)));
  const fl=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat); fl.rotation.x=Math.PI/2; fl.position.y=z0+0.01; g.add(fl);
  for(let i=0;i<pts.length;i++){ const a=pts[i],c=pts[(i+1)%pts.length]; const len=Math.hypot(c.x-a.x,c.y-a.y)*MM; if(len<0.05) continue;
    const m2=new THREE.Mesh(geoBox,mat); m2.scale.set(len,2.4,0.1); m2.position.set((a.x+c.x)/2*MM,z0+1.2,(a.y+c.y)/2*MM); m2.rotation.y=-Math.atan2(c.y-a.y,c.x-a.x); g.add(m2); }
  scene.add(g); ST.pendingG.push(g); invalidate(true);
}
function lineMove(e){
  const op=ST.op; if(!op||op.type!=='line') return;
  const raw=_planePt(e,op.z0); if(!raw) return;
  const sp=snap3(op.fid,raw,op.z0,op.rect?null:op.chain);   // 점·선 흡착이 직교 추론보다 우선 (스케치업과 동일)
  let px=sp.x,py=sp.y,kind=sp.kind,col=0xD4FF3D;
  if(op.infLine) op.infLine.visible=false;
  if(!op.rect){
    const a=op.a, mmpp=mmPerPx(new THREE.Vector3(raw.x*MM,op.z0,raw.y*MM));
    const src=(sp.kind==='grid')?raw:sp;                     // 잠금선 위로 투영할 원천 (점 스냅이면 그 점)
    const proj=(u)=>{ const t=(src.x-a.x)*u.x+(src.y-a.y)*u.y; px=Math.round((a.x+u.x*t)/10)*10; py=Math.round((a.y+u.y*t)/10)*10; };
    if(op.shiftLock){ proj(op.shiftLock); kind='lock'; col=0xE24CE2; }                       // Shift = 지금 방향 고정
    else if(ST.axisLock==='x'){ proj({x:1,y:0}); kind='axis'; col=0xE24C4C; }               // → 빨강 축
    else if(ST.axisLock==='y'){ proj({x:0,y:1}); kind='axis'; col=0x2FA84F; }               // ← 초록 축
    else if((ST.axisLock==='par'||ST.axisLock==='perp')&&op.refDir){                        // ↓ 가까운 벽에 평행/수직
      proj(ST.axisLock==='par'?op.refDir:{x:-op.refDir.y,y:op.refDir.x}); kind='lock'; col=0xE24CE2; }
    else if(sp.kind==='grid'){
      const dx=px-a.x, dy=py-a.y;
      if(Math.abs(dy)<Math.abs(dx)*0.09){ py=a.y; kind='axis'; col=0xE24C4C; }             // 5° 안이면 축에 붙는다
      else if(Math.abs(dx)<Math.abs(dy)*0.09){ px=a.x; kind='axis'; col=0x2FA84F; }
      else if(op.fromPt){                                                                  // 지나온 점과 X/Y 정렬
        const tol=8*mmpp;
        if(Math.abs(raw.x-op.fromPt.x)<tol){ px=op.fromPt.x; kind='from'; }
        else if(Math.abs(raw.y-op.fromPt.y)<tol){ py=op.fromPt.y; kind='from'; }
        if(kind==='from'){ const ip=op.infLine.geometry.attributes.position; ip.setXYZ(0,op.fromPt.x*MM,op.z0+0.02,op.fromPt.y*MM); ip.setXYZ(1,px*MM,op.z0+0.02,py*MM); ip.needsUpdate=true; op.infLine.computeLineDistances(); op.infLine.visible=true; }
      }
    }else if(sp.kind==='endpoint'||sp.kind==='midpoint'||sp.kind==='intersection'||sp.kind==='origin'){
      if(!(sp.x===a.x&&sp.y===a.y)) op.fromPt={x:sp.x,y:sp.y};                             // 점 위를 지나면 기억
    }
    if(px!==a.x||py!==a.y){ const l=Math.hypot(px-a.x,py-a.y); op.dir={x:(px-a.x)/l,y:(py-a.y)/l}; }
  }
  showSnap({x:px,y:py,kind:kind},op.z0);
  op.line.material.color.setHex(col);
  op.snapKind=kind;
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
    const c0=op.chain[0], closing=op.chain.length>=3&&Math.hypot(px-c0.x,py-c0.y)<=50;
    vcbShow((closing?'시작점 — 클릭=면 닫기 · ':'')+(kind&&kind!=='grid'?SNAP_NAME[kind]+' · ':'')+'길이',len,'mm');
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
  if(!op.rect){
    const co=vcbCoord();                                     // [x,y] 절대 · <dx,dy> 상대
    if(co&&co.x!=null&&co.y!=null) cur=co.abs?{x:Math.round(co.x),y:Math.round(co.y)}:{x:Math.round(a.x+co.x),y:Math.round(a.y+co.y)};
    else if(exact!==null&&exact!==undefined&&exact!==0){    // 길이 (음수 = 반대 방향)
      const dx=cur.x-a.x,dy=cur.y-a.y,l=Math.hypot(dx,dy);
      const u=l>1?{x:dx/l,y:dy/l}:op.dir;
      if(u) cur={x:Math.round(a.x+u.x*exact),y:Math.round(a.y+u.y*exact)};
    }
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
    const fid=op.fid, A={x:a.x,y:a.y};
    chan.postMessage({type:'edit',op:'addspace',floorId:fid,patch:{x1:a.x,y1:a.y,x2:cur.x,y2:cur.y}});
    cancelOp();
    setStatus(statusLive,'▭ 면 생성 '+Math.abs(cur.x-a.x)+'×'+Math.abs(cur.y-a.y)+' → 점·선·면 한 그룹');
    const sx=(cur.x>=A.x)?1:-1, sy=(cur.y>=A.y)?1:-1;
    setLast('가로,세로','mm',raw=>{ const m=String(raw).match(/^(-?[\d.]+\s*(?:mm|cm|m)?)\s*[,xX*]\s*(-?[\d.]+\s*(?:mm|cm|m)?)$/i); if(!m) return false;
      const w=parseLen(m[1]),h=parseLen(m[2]); if(!(w>=300&&h>=300)) return false;
      chan.postMessage({type:'edit',op:'addspace',floorId:fid,patch:{x1:A.x,y1:A.y,x2:Math.round(A.x+sx*w),y2:Math.round(A.y+sy*h)}}); return true; });
  }else{
    if(Math.hypot(cur.x-a.x,cur.y-a.y)<100){ setStatus(statusLive,'너무 짧습니다 (100mm+)'); return; }
    // 시작점으로 돌아오면 폐합 = 면 (스케치업: 닫힌 선 고리는 면이 된다) — 보낸 벽들을 흡수해 한 그룹으로
    const c0=op.chain[0];
    if(op.chain.length>=3&&Math.hypot(cur.x-c0.x,cur.y-c0.y)<=50){
      const pts=op.chain.map(p=>({x:p.x,y:p.y}));
      spawnPendingPoly(pts,op.z0);
      chan.postMessage({type:'edit',op:'addspace',floorId:op.fid,patch:{pts,absorb:true,merge:op.sent+1}});
      cancelOp();
      setStatus(statusLive,'╱ 사슬 폐합 → 면 생성 (점 '+pts.length+'·선 '+pts.length+'·면 1 이 한 그룹, Ctrl+Z 한 번)');
      return;
    }
    const sid=segHitsSpace(op.fid,a,cur);
    // 면 위(가로지름) = 면 분할 (스케치업: 면 위의 선은 면을 나눈다) / 빈 곳 = 벽
    if(!sid) spawnPendingWall(a,cur,op.z0); // 벽은 즉시 임시 표시
    chan.postMessage({type:'edit',op:sid?'splitspace':'addwall',floorId:op.fid,patch:{x1:a.x,y1:a.y,x2:cur.x,y2:cur.y}});
    if(sid){ setStatus(statusLive,'╱ 면 분할 → 두 면으로 (평면 반영)'); op.chain=[cur]; op.sent=0; }
    else { op.chain.push(cur); op.sent++; }
    // 스케치업 Line 처럼 사슬 잇기 — 끝점이 새 시작점
    const A={x:a.x,y:a.y}, fid=op.fid, wasSplit=!!sid;
    op.a=cur; op.shiftLock=null; op.fromPt=null; ST.axisLock=null;
    if(op.startMk) op.startMk.position.set(cur.x*MM,op.z0+0.03,cur.y*MM);
    const pos=op.line.geometry.attributes.position, y3=op.z0+0.02;
    pos.setXYZ(0,cur.x*MM,y3,cur.y*MM); pos.setXYZ(1,cur.x*MM,y3,cur.y*MM); pos.needsUpdate=true;
    op.ghost.visible=false; if(op.infLine) op.infLine.visible=false;
    vcbShow('길이',0,'mm');
    if(!sid) setStatus(statusLive,'╱ 벽 추가 → 이어서 클릭 · 시작점으로 돌아오면 면 (Esc·더블클릭=끝)');
    invalidate();
    const dx=cur.x-A.x,dy=cur.y-A.y,l=Math.hypot(dx,dy);
    ST.lastCommit={label:'길이',unit:'mm',seq:0,apply:raw=>{ const v=parseLen(raw); if(v==null||v===0||wasSplit) return false;
      const nx=Math.round(A.x+dx/l*v), ny=Math.round(A.y+dy/l*v);
      chan.postMessage({type:'edit',op:'addwall',floorId:fid,patch:{x1:A.x,y1:A.y,x2:nx,y2:ny}});
      if(ST.op&&ST.op.type==='line'){ ST.op.a={x:nx,y:ny}; ST.op.chain[ST.op.chain.length-1]={x:nx,y:ny}; if(ST.op.startMk) ST.op.startMk.position.set(nx*MM,ST.op.z0+0.03,ny*MM); }
      return true; }};
  }
}
// --- 원 (C · 스케치업 Circle) — 중심 클릭 → 반지름 · 숫자=반지름 · "6s"=육각형 → 면(공간) ---
function circleClick(e){
  if(ST.op&&ST.op.type==='circle'){ commitCircle(vcbTyped()); return; }
  const fid=_hoverFloorId(e); const f=ST.floors.find(x=>x.id===fid), z0=f?f.z0*MM:0;
  const raw=_planePt(e,z0); if(!raw) return;
  const c=snap3(fid,raw,z0); showSnap(c,z0);
  const geo=new THREE.BufferGeometry().setFromPoints(new Array(49).fill(0).map(()=>new THREE.Vector3(c.x*MM,z0+0.02,c.y*MM)));
  const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln);
  const smk=new THREE.Mesh(geoSph,new THREE.MeshBasicMaterial({color:0xD4FF3D,depthTest:false})); smk.scale.setScalar(0.055); smk.renderOrder=1000; smk.position.set(c.x*MM,z0+0.03,c.y*MM); scene.add(smk);
  ST.op={type:'circle',fid,z0,c,r:0,line:ln,startMk:smk};
  opOrbit(true);
  vcbShow('반지름 (6s=육각형)','','mm');
  invalidate();
}
function circleMove(e){
  const op=ST.op; if(!op||op.type!=='circle') return;
  const raw=_planePt(e,op.z0); if(!raw) return;
  const sp=snap3(op.fid,raw,op.z0); showSnap(sp,op.z0);
  op.r=Math.round(Math.hypot(sp.x-op.c.x,sp.y-op.c.y)/10)*10;
  const pos=op.line.geometry.attributes.position, n=pos.count-1;
  for(let i=0;i<=n;i++){ const t=i/n*Math.PI*2; pos.setXYZ(i,(op.c.x+Math.cos(t)*op.r)*MM,op.z0+0.02,(op.c.y+Math.sin(t)*op.r)*MM); }
  pos.needsUpdate=true; vcbShow('반지름 (6s=육각형)',op.r,'mm'); invalidate();
}
function commitCircle(exact){
  const op=ST.op; if(!op||op.type!=='circle') return;
  const sides=vcbSides();
  const r=(exact!==null&&exact!==undefined&&exact>0)?Math.round(exact):op.r;
  if(r<150){ setStatus(statusLive,'반지름이 너무 작습니다 (150mm+) — 숫자 입력 가능'); return; }
  if(!chan){ setStatus(false,'MiniCAD 창이 없어 면을 못 만듭니다'); return; }
  const c=op.c, fid=op.fid, z0=op.z0;
  const poly=(N)=>Array.from({length:N},(_,i)=>{const t=i/N*Math.PI*2-Math.PI/2; return {x:Math.round(c.x+Math.cos(t)*r),y:Math.round(c.y+Math.sin(t)*r)};});
  spawnPendingPoly(poly(sides||36),z0);
  if(sides){ chan.postMessage({type:'edit',op:'addspace',floorId:fid,patch:{pts:poly(sides)}}); setStatus(statusLive,'○ '+sides+'각형 면 생성 r='+r+' (Ctrl+Z 한 번)'); }
  else { chan.postMessage({type:'edit',op:'addcircle',floorId:fid,patch:{cx:c.x,cy:c.y,r}}); setStatus(statusLive,'○ 원 면(공간) 생성 r='+r); }
  cancelOp();
  setLast('반지름','mm',raw=>{ const v=parseLen(raw); if(v==null||v<150) return false; chan.postMessage({type:'edit',op:'addcircle',floorId:fid,patch:{cx:c.x,cy:c.y,r:Math.round(v)}}); return true; });
}
// --- 호 (A · 스케치업 2-Point Arc) — 시작·끝·볼록 3클릭 → 벽 조각 사슬 (batch = Ctrl+Z 한 번) ---
function arcPts(a,b,bulge,n){
  const L=Math.hypot(b.x-a.x,b.y-a.y); if(L<1||Math.abs(bulge)<1) return [a,b];
  const h=Math.abs(bulge), R=(L*L/4+h*h)/(2*h), sg=Math.sign(bulge);
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2, nx=-(b.y-a.y)/L*sg, ny=(b.x-a.x)/L*sg;
  const cx=mx+nx*(h-R), cy=my+ny*(h-R);
  const a0=Math.atan2(a.y-cy,a.x-cx), a1=Math.atan2(b.y-cy,b.x-cx), ap=Math.atan2(my+ny*h-cy,mx+nx*h-cx);
  const norm=x=>{ while(x<=-Math.PI) x+=2*Math.PI; while(x>Math.PI) x-=2*Math.PI; return x; };
  let da=norm(a1-a0); const dap=norm(ap-a0);
  if(Math.sign(dap)!==Math.sign(da)||Math.abs(dap)>Math.abs(da)) da=da-Math.sign(da||1)*2*Math.PI;
  const out=[]; for(let i=0;i<=n;i++){ const t=a0+da*i/n; out.push({x:Math.round(cx+R*Math.cos(t)),y:Math.round(cy+R*Math.sin(t))}); }
  return out;
}
function arcClick(e){
  const op=ST.op;
  if(op&&op.type==='arc'&&op.stage===2){ commitArc(vcbTyped()); return; }
  const fid=op?op.fid:_hoverFloorId(e); const f=ST.floors.find(x=>x.id===fid), z0=f?f.z0*MM:0;
  const raw=_planePt(e,z0); if(!raw) return;
  const p=snap3(fid,raw,z0); showSnap(p,z0);
  if(!op||op.type!=='arc'){
    const geo=new THREE.BufferGeometry().setFromPoints(new Array(25).fill(0).map(()=>new THREE.Vector3(p.x*MM,z0+0.02,p.y*MM)));
    const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln);
    const smk=new THREE.Mesh(geoSph,new THREE.MeshBasicMaterial({color:0xD4FF3D,depthTest:false})); smk.scale.setScalar(0.055); smk.renderOrder=1000; smk.position.set(p.x*MM,z0+0.03,p.y*MM); scene.add(smk);
    ST.op={type:'arc',fid,z0,a:p,b:p,bulge:0,line:ln,startMk:smk,stage:1};
    opOrbit(true); vcbShow('호: 끝점 클릭','','mm'); invalidate(); return;
  }
  if(op.stage===1){ op.b=p; op.stage=2; vcbShow('볼록한 정도','','mm'); }
}
function arcMove(e){
  const op=ST.op; if(!op||op.type!=='arc') return;
  const raw=_planePt(e,op.z0); if(!raw) return; const sp=snap3(op.fid,raw,op.z0); showSnap(sp,op.z0);
  if(op.stage===1){ op.b=sp; op.bulge=0; }
  else { const a=op.a,b=op.b, mx=(a.x+b.x)/2,my=(a.y+b.y)/2, L=Math.hypot(b.x-a.x,b.y-a.y)||1, nx=-(b.y-a.y)/L, ny=(b.x-a.x)/L;
    op.bulge=Math.round(((sp.x-mx)*nx+(sp.y-my)*ny)/10)*10; }
  const pts=arcPts(op.a,op.b,op.bulge,24), pos=op.line.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){ const p=pts[Math.min(i,pts.length-1)]; pos.setXYZ(i,p.x*MM,op.z0+0.02,p.y*MM); }
  pos.needsUpdate=true;
  vcbShow(op.stage===1?'현 길이':'볼록한 정도 (+/−)',op.stage===1?Math.round(Math.hypot(op.b.x-op.a.x,op.b.y-op.a.y)):op.bulge,'mm');
  invalidate();
}
function commitArc(exact){
  const op=ST.op; if(!op||op.type!=='arc'||op.stage<2) return;
  if(exact!==null&&exact!==undefined&&exact!==0) op.bulge=Math.round(exact);
  const L=Math.hypot(op.b.x-op.a.x,op.b.y-op.a.y);
  if(L<200||Math.abs(op.bulge)<20){ setStatus(statusLive,'호가 너무 작습니다 (현 200mm+, 볼록 20mm+)'); return; }
  const n=Math.max(4,Math.min(24,Math.round(L/300)));
  const pts=arcPts(op.a,op.b,op.bulge,n), fid=op.fid, z0=op.z0, ops=[];
  for(let i=0;i<pts.length-1;i++){ const p=pts[i],q=pts[i+1]; if(Math.hypot(q.x-p.x,q.y-p.y)<50) continue; ops.push({op:'addwall',floorId:fid,patch:{x1:p.x,y1:p.y,x2:q.x,y2:q.y}}); spawnPendingWall(p,q,z0); }
  cancelOp();
  if(sendBatch(ops,'호')) setStatus(statusLive,'◜ 호 → 벽 '+ops.length+'조각 (Ctrl+Z 한 번)');
}
// --- 오프셋 (F · 스케치업 Offset) — 바닥(면) 폴리곤을 안/밖으로 평행 이동한 새 면 ---
function polyArea(poly){ let a=0; for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.y-q.x*p.y;} return a/2; }
function offsetPoly(poly,d){
  const N=poly.length, sgn=polyArea(poly)>0?1:-1;
  const nrm=(a,b)=>{ const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1; return {x:-dy/l*sgn,y:dx/l*sgn}; }; // 안쪽 법선
  const out=[];
  for(let i=0;i<N;i++){
    const p0=poly[(i+N-1)%N],p1=poly[i],p2=poly[(i+1)%N], n1=nrm(p0,p1),n2=nrm(p1,p2);
    const bx=n1.x+n2.x,by=n1.y+n2.y,bl=Math.hypot(bx,by);
    if(bl<1e-6){ out.push({x:Math.round(p1.x+n1.x*d),y:Math.round(p1.y+n1.y*d)}); continue; }
    const len=d/Math.max(0.2,bl/2);
    out.push({x:Math.round(p1.x+bx/bl*len),y:Math.round(p1.y+by/bl*len)});
  }
  if(d>0&&Math.abs(polyArea(out))>Math.abs(polyArea(poly))) return offsetPoly(poly.slice().reverse(),d).reverse(); // 방향 안전장치
  return out;
}
function offsetClick(e){
  const op=ST.op;
  if(op&&op.type==='offset'){ commitOffset(vcbTyped()); return; }
  const hit=hitAt(e.clientX,e.clientY); const obj=hit&&hit.object.userData.obj;
  if(!obj||obj.kind!=='floor'){ setStatus(statusLive,'오프셋은 바닥(면)을 클릭'); return; }
  const sd=ST.snapData[obj.floorId]; const sp=sd&&sd.spaces.find(x=>String(x.id)===String(obj.id));
  if(!sp||!sp.poly||sp.poly.length<3){ setStatus(statusLive,'면 정보를 찾지 못했습니다'); return; }
  const f=ST.floors.find(x=>x.id===obj.floorId), z0=f?f.z0*MM:0;
  const geo=new THREE.BufferGeometry().setFromPoints(sp.poly.concat([sp.poly[0]]).map(p=>new THREE.Vector3(p.x*MM,z0+0.02,p.y*MM)));
  const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln);
  ST.op={type:'offset',fid:obj.floorId,z0,poly:sp.poly.map(p=>({x:p.x,y:p.y})),d:0,line:ln};
  opOrbit(true); vcbShow('오프셋 거리 (+안쪽 / −바깥)',0,'mm'); invalidate();
}
function offsetMove(e){
  const op=ST.op; if(!op||op.type!=='offset') return;
  const raw=_planePt(e,op.z0); if(!raw) return;
  const inside=MC3D._internal.pointInPoly(raw,op.poly);
  let bd=Infinity; const N=op.poly.length;
  for(let i=0;i<N;i++){ const q=closestOnSeg(raw,{x1:op.poly[i].x,y1:op.poly[i].y,x2:op.poly[(i+1)%N].x,y2:op.poly[(i+1)%N].y}); bd=Math.min(bd,Math.hypot(q.x-raw.x,q.y-raw.y)); }
  op.d=Math.round(bd/10)*10*(inside?1:-1);
  const pts=offsetPoly(op.poly,op.d), pos=op.line.geometry.attributes.position;
  pts.concat([pts[0]]).forEach((p,i)=>pos.setXYZ(i,p.x*MM,op.z0+0.02,p.y*MM)); pos.needsUpdate=true;
  vcbShow('오프셋 거리 (+안쪽 / −바깥)',op.d,'mm'); invalidate();
}
function commitOffset(exact){
  const op=ST.op; if(!op||op.type!=='offset') return;
  const d=(exact!==null&&exact!==undefined&&exact!==0)?Math.round(exact):op.d;
  if(Math.abs(d)<50){ setStatus(statusLive,'오프셋 거리 50mm+ (숫자 입력 가능, 음수=바깥)'); return; }
  if(!chan){ setStatus(false,'MiniCAD 창이 없어 면을 못 만듭니다'); return; }
  const pts=offsetPoly(op.poly,d), fid=op.fid, z0=op.z0, poly=op.poly;
  if(Math.abs(polyArea(pts))<300*300){ setStatus(statusLive,'오프셋 결과 면이 너무 작습니다'); return; }
  spawnPendingPoly(pts,z0);
  chan.postMessage({type:'edit',op:'addspace',floorId:fid,patch:{pts}});
  cancelOp(); setStatus(statusLive,'⧉ 오프셋 '+d+'mm → 새 면 (Ctrl+Z 한 번)');
  setLast('오프셋','mm',raw=>{ const v=parseLen(raw); if(v==null||Math.abs(v)<50) return false; chan.postMessage({type:'edit',op:'addspace',floorId:fid,patch:{pts:offsetPoly(poly,Math.round(v))}}); return true; });
}
// --- 치수(D)·문자 — 3D 표시용 주석 (평면 미반영) ---
function dimClick(hit){
  if(!hit) return;
  const p=_tapeSnap(hit);
  if(!ST.op||ST.op.type!=='dim'){
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([p,p.clone()]),new THREE.LineBasicMaterial({color:0xFFFFFF,depthTest:false})); line.renderOrder=998; scene.add(line);
    ST.op={type:'dim',a:p,line}; opOrbit(true); vcbShow('치수: 두 번째 점',0,'mm'); invalidate(); return;
  }
  const d=Math.round(ST.op.a.distanceTo(p)/MM);
  const g=new THREE.Group(); g.name='annot:dim';
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([ST.op.a,p]),new THREE.LineBasicMaterial({color:0xFFFFFF,depthTest:false})));
  const lb=makeLabel(d+' mm'); lb.position.copy(ST.op.a).lerp(p,0.5); lb.position.y+=0.12; g.add(lb);
  scene.add(g); ST.annots.push(g);
  scene.remove(ST.op.line); ST.op=null; opOrbit(false); vcbHide(); invalidate();
  setStatus(statusLive,'↔ 치수 '+d+' mm (3D 표시용 · 메뉴 편집▸주석 모두 삭제)');
}
function textClick(hit){
  if(!hit) return;
  const t=window.prompt('문자 내용 (3D 표시용)',''); if(!t) return;
  const lb=makeLabel(t); lb.position.copy(hit.point); lb.position.y+=0.1; lb.scale.multiplyScalar(1.3); lb.name='annot:text';
  scene.add(lb); ST.annots.push(lb); invalidate();
}
function clearAnnots(){ ST.annots.forEach(a=>{ scene.remove(a); }); ST.annots=[]; invalidate(); setStatus(statusLive,'주석 모두 삭제'); }
function cancelOp(){
  const op=ST.op; ST.op=null; ST.axisLock=null; vcbHide();
  if(op){
    if(op.type==='move'&&op.g){
      const restore=(it)=>{ if(it.copy){ if(it.g.parent) it.g.parent.remove(it.g); } else { it.g.position.x=it.orig.x; it.g.position.z=it.orig.z; if(it.orig.y!=null) it.g.position.y=it.orig.y; } };
      restore(op); (op.extras||[]).forEach(restore);
    }
    if(op.type==='slide'&&op.g){ op.g.position.copy(op.orig); }
    if(op.type==='rotate'&&op.g){
      op.g.rotation.y=-(op.obj.rot||0)*Math.PI/180; if(op.orig){ op.g.position.x=op.orig.x; op.g.position.z=op.orig.z; }
      (op.extras||[]).forEach(it=>{ it.g.rotation.y=-(it.obj.rot||0)*Math.PI/180; it.g.position.x=it.orig.x; it.g.position.z=it.orig.z; });
    }
    if(op.type==='scale'&&op.g){ op.g.scale.x=op.baseSX; op.g.scale.z=op.baseSZ; }
    if(op.type==='pp'&&op.g){ op.g.scale.y=1; op.g.position.y=op.origY; if(op.baseSZ!=null) op.g.scale.z=op.baseSZ; }
    ['line','ghost','startMk','infLine','protractor','guideLine'].forEach(k=>{ if(op[k]){ scene.remove(op[k]); if(op[k].geometry) op[k].geometry.dispose(); } });
    hideSnap();
    invalidate(true);
  }
  opOrbit(false);
  orbit.enabled=(ST.mode==='orbit');
}
function _opDone(){ ST.op=null; ST.axisLock=null; vcbHide(); hideSnap(); opOrbit(false); orbit.enabled=(ST.mode==='orbit'); }
function commitActive(exact){
  const op=ST.op; if(!op) return;
  if(op.type==='move') commitMove(exact);
  else if(op.type==='slide') commitSlide(exact);
  else if(op.type==='rotate') commitRotate(exact);
  else if(op.type==='scale') commitScale(exact);
  else if(op.type==='pp') commitPP(exact);
  else if(op.type==='line') commitLine(exact);
  else if(op.type==='circle') commitCircle(exact);
  else if(op.type==='arc') commitArc(exact);
  else if(op.type==='offset') commitOffset(exact);
}
// --- 이동 (Ctrl = 복사, 스케치업과 동일) — 다중 선택이면 함께 (batch = Ctrl+Z 한 번) ---
function _selOthers(g){ // 잡은 것 외의 선택된 이동 가능 객체들
  return [...ST.selSet].filter(x=>x!==g&&x.userData.obj&&MOVABLE.has(x.userData.obj.kind)&&!x.userData.obj.locked&&x.userData.obj.floorId===g.userData.obj.floorId);
}
function beginMove(g,obj,copy){
  const ent=ST.floorCache[obj.floorId];
  dragPlane.constant=-((ent?ent.z0*MM:0)+((obj.elev||0)*MM)); // 띄워진 객체는 그 높이 평면에서 끈다
  ray.ray.intersectPlane(dragPlane,dragPt);
  const mk=(src,o)=>{ let tg=src; if(copy){ tg=src.clone(true); src.parent.add(tg); } return {g:tg,obj:o,copy:!!copy,orig:{x:src.position.x,y:src.position.y,z:src.position.z}}; };
  const extras=_selOthers(g).map(x=>mk(x,x.userData.obj));
  const me=mk(g,obj);
  ST.op={type:'move',g:me.g,obj,copy:!!copy,orig:me.orig,off:{x:g.position.x-dragPt.x,z:g.position.z-dragPt.z},moved:false,sticky:false,extras};
  opOrbit(true);
  vcbShow((copy?'복사':'이동')+(extras.length?' ('+(extras.length+1)+'개)':''),0,'mm');
}
function applyMoveFromEvent(e){
  const op=ST.op; if(!op||op.type!=='move') return;
  // 2026-09-04: ↑키 = 파란 Z축 고정 — 위아래로 끌어 바닥에서 띄우기 (숫자=정확 높이)
  if(ST.axisLock==='z'){
    if(op.zRefY==null){ op.zRefY=e.clientY; op.zBase=(op.elev!=null?op.elev:(op.obj.elev||0)); }
    const d=Math.round((op.zRefY-e.clientY)*5/10)*10;   // 5mm/px · 10mm 스냅
    op.elev=Math.max(0,op.zBase+d);
    const z0=((ST.floorCache[op.obj.floorId]||{z0:0}).z0||0)*MM;
    op.g.position.y=op.elev*MM+z0;
    op.extras.forEach(it=>{ it.g.position.y=Math.max(0,(it.obj.elev||0)+(op.elev-(op.obj.elev||0)))*MM+z0; });
    op.moved=true; op.zMoved=true;
    hideSnap();
    vcbShow('높이(바닥에서)',op.elev,'mm');
    invalidate(true);
    return;
  }
  rayFromEvent(e);
  if(!ray.ray.intersectPlane(dragPlane,dragPt)) return;
  let x=dragPt.x+op.off.x, z=dragPt.z+op.off.z;
  // 2026-09-04: 이동 중에도 점·선·원점 스냅 (잡은 객체의 기준점이 흡착 — 스케치업 Move 추론)
  const z0m=-dragPlane.constant;
  const s=snap3(op.obj.floorId,{x:x/MM,y:z/MM},z0m);
  if(s.kind!=='grid'){ x=s.x*MM; z=s.y*MM; showSnap(s,z0m); }
  else { hideSnap(); const g10=v=>Math.round(v/MM/10)*10*MM; x=g10(x); z=g10(z); }
  if(ST.axisLock==='x') z=op.orig.z;
  if(ST.axisLock==='y') x=op.orig.x;
  if(op.shiftLock){ const u=op.shiftLock, t=(x-op.orig.x)*u.x+(z-op.orig.z)*u.z; x=op.orig.x+u.x*t; z=op.orig.z+u.z*t; }
  op.g.position.x=x; op.g.position.z=z;
  const ddx=x-op.orig.x, ddz=z-op.orig.z;
  op.extras.forEach(it=>{ it.g.position.x=it.orig.x+ddx; it.g.position.z=it.orig.z+ddz; });
  op.moved=true;
  vcbShow((s.kind!=='grid'?SNAP_NAME[s.kind]+' · ':'')+(ST.axisLock?'축 고정 · ':op.shiftLock?'방향 고정 · ':'')+(op.copy?'복사':'이동'),Math.round(Math.hypot(ddx,ddz)/MM),'mm');
  invalidate(true);
}
function commitMove(exact){
  const op=ST.op; if(!op||op.type!=='move') return;
  const items=[op].concat(op.extras||[]);
  if(op.zMoved&&!op.copy){                       // Z 이동 확정 — elev_mm 로 평면 데이터에 저장
    if(exact!==null&&exact!==undefined) op.elev=Math.max(0,Math.round(exact));
    const dE=op.elev-(op.obj.elev||0);
    const ops=items.map(it=>{ const o=it.obj, x=Math.round(it.g.position.x/MM), y=Math.round(it.g.position.z/MM), ev=Math.max(0,(o.elev||0)+dE);
      o.elev=ev; o.x=x; o.y=y; return {op:'set',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{x,y,elev_mm:ev}}; });
    const g=op.g; _opDone();
    sendBatch(ops,'높이');
    select(g,{silent:true});
    setStatus(statusLive,'⬆ 높이 '+op.elev+'mm (바닥에서) → 평면 데이터 반영');
    return;
  }
  if(exact!==null&&exact!==undefined){          // 입력 거리 — 지금 끌던 방향으로 정확히
    const dx=op.g.position.x-op.orig.x, dz=op.g.position.z-op.orig.z;
    const len=Math.hypot(dx,dz);
    if(len>1e-6){ const nx=dx/len*exact*MM, nz=dz/len*exact*MM; items.forEach(it=>{ it.g.position.x=it.orig.x+nx; it.g.position.z=it.orig.z+nz; }); }
  }
  const dxm=Math.round((op.g.position.x-op.orig.x)/MM), dym=Math.round((op.g.position.z-op.orig.z)/MM);
  const g=op.g,copy=op.copy;
  const recs=items.map(it=>({obj:it.obj,ox:Math.round(it.orig.x/MM),oy:Math.round(it.orig.z/MM),x:Math.round(it.g.position.x/MM),y:Math.round(it.g.position.z/MM)}));
  _opDone();
  if(copy) items.forEach(it=>{ if(it.g.parent) it.g.parent.remove(it.g); });   // 진짜 사본은 재조립으로 온다
  else recs.forEach(r=>{ r.obj.x=r.x; r.obj.y=r.y; });
  const mkOps=(dx,dy)=>recs.map(r=>({op:copy?'clone':'move',kind:KINDMAP[r.obj.kind],id:r.obj.id,floorId:r.obj.floorId,patch:{x:Math.round(r.ox+dx),y:Math.round(r.oy+dy)}}));
  sendBatch(mkOps(dxm,dym),copy?'복사':'이동');
  if(!copy) select(g,{silent:true});
  ST.lastMove={copy,dx:dxm,dy:dym,items:recs.map(r=>({obj:r.obj,ox:r.ox,oy:r.oy}))};
  const L=Math.hypot(dxm,dym)||1, ux=dxm/L, uy=dym/L;
  setLast(copy?'복사':'이동','mm',raw=>{ const v=parseLen(raw); if(v==null) return false; sendBatch(mkOps(ux*v,uy*v),copy?'복사':'이동'); return true; });
  setStatus(statusLive,(copy?'복사':'이동')+(recs.length>1?' '+recs.length+'개':'')+' → 평면 반영 ('+dxm+', '+dym+')'+(copy?' · 숫자 x3 = 배열 복사':''));
}
// --- 문·창 슬라이드 — 벽을 따라 이동 (스케치업: 구성요소가 붙은 면 위에서만 이동) ---
function beginSlide(g,obj){
  const w=obj.meta&&obj.meta.wall; if(!w||w.L==null){ setStatus(statusLive,'벽 정보가 없어 슬라이드 불가'); return; }
  const ent=ST.floorCache[obj.floorId]; dragPlane.constant=-((ent?ent.z0*MM:0)+0.01);
  ST.op={type:'slide',g,obj,w,orig:g.position.clone(),along0:obj.meta.along||0,along:obj.meta.along||0,moved:false,sticky:false};
  opOrbit(true); vcbShow('벽 따라 이동',0,'mm');
}
function applySlideFromEvent(e){
  const op=ST.op; if(!op||op.type!=='slide') return;
  rayFromEvent(e); if(!ray.ray.intersectPlane(dragPlane,dragPt)) return;
  const w=op.w, px=dragPt.x/MM, py=dragPt.z/MM, ux=(w.x2-w.x1)/w.L, uy=(w.y2-w.y1)/w.L;
  const half=(op.obj.meta.w||900)/2;
  let t=(px-w.x1)*ux+(py-w.y1)*uy; t=Math.round(t/10)*10; t=Math.max(half,Math.min(w.L-half,t));
  op.along=t;
  const d=(t-op.along0)*MM;
  op.g.position.x=op.orig.x+ux*d; op.g.position.z=op.orig.z+uy*d;
  op.moved=true; vcbShow('벽 따라 이동',Math.round(t-op.along0),'mm'); invalidate(true);
}
function commitSlide(exact){
  const op=ST.op; if(!op||op.type!=='slide') return;
  const w=op.w, half=(op.obj.meta.w||900)/2;
  let t=op.along; if(exact!==null&&exact!==undefined) t=Math.max(half,Math.min(w.L-half,op.along0+exact));
  const ux=(w.x2-w.x1)/w.L, uy=(w.y2-w.y1)/w.L;
  const x=Math.round(w.x1+ux*t), y=Math.round(w.y1+uy*t), obj=op.obj, g=op.g;
  _opDone();
  sendEdit('set',obj,{x,y});
  select(g,{silent:true});
  setStatus(statusLive,'문·창 이동 → 평면 반영 (벽 위 '+Math.round(t)+'mm)');
}
// --- 배율 (S · 스케치업 Scale) — 가구·기구·설비 footprint · Shift = 한 방향(비균등) ---
const SCALABLE=new Set(['furniture','fixture','hvac']);
function beginScale(g,obj,cy,cx){
  if(!SCALABLE.has(obj.kind)){ setStatus(statusLive,'배율은 가구·기구·설비만 (조명 규격은 인치·길이로)'); return; }
  ST.op={type:'scale',g,obj,startY:cy,startX:cx,factor:1,fx:1,fz:1,baseSX:g.scale.x,baseSZ:g.scale.z,baseW:(obj.meta&&obj.meta.w)||400,baseD:(obj.meta&&obj.meta.d)||400};
  opOrbit(true);
  vcbShow('배율 (Shift=한 방향 · 가로,세로)','1.00','×');
}
function applyScale(cy,shift,cx){
  const op=ST.op; if(!op||op.type!=='scale') return;
  let f=1+(op.startY-cy)*0.005;
  f=Math.max(0.2,Math.min(5,Math.round(f*20)/20));                    // 0.05 스냅
  if(shift){ // 비균등: 가로 끌기=X, 세로 끌기=Z
    const dx=Math.abs((cx||op.startX)-op.startX), dy=Math.abs(cy-op.startY);
    let fx=1+((cx||op.startX)-op.startX)*0.005; fx=Math.max(0.2,Math.min(5,Math.round(fx*20)/20));
    if(dx>dy){ op.fx=fx; op.fz=1; } else { op.fx=1; op.fz=f; }
    op.factor=null;
  } else { op.factor=f; op.fx=f; op.fz=f; }
  op.g.scale.x=op.baseSX*op.fx; op.g.scale.z=op.baseSZ*op.fz;
  vcbShow('배율'+(shift?' (한 방향)':''),op.factor!=null?op.factor.toFixed(2):(op.fx.toFixed(2)+','+op.fz.toFixed(2)),'×');
  invalidate(true);
}
function commitScale(exact){
  const op=ST.op; if(!op||op.type!=='scale') return;
  let fx=op.fx,fz=op.fz;
  const pr=vcbPair(); if(pr&&pr.w>0&&pr.h>0){ fx=pr.w; fz=pr.h; }
  else if(exact!==null&&exact!==undefined&&exact>0){ fx=exact; fz=exact; }
  op.g.scale.x=op.baseSX; op.g.scale.z=op.baseSZ;
  const obj=op.obj, baseW=op.baseW, baseD=op.baseD;
  _opDone();
  const send=(a,b)=>sendEdit('set',obj,{w:Math.max(50,Math.round(baseW*a)),h:Math.max(50,Math.round(baseD*b))});
  send(fx,fz);
  setLast('배율','×',raw=>{ const m=String(raw).match(/^([\d.]+)\s*[,x*]\s*([\d.]+)$/); if(m){ send(+m[1],+m[2]); return true; } const v=parseFloat(raw); if(!(v>0)) return false; send(v,v); return true; });
  setStatus(statusLive,'⤢ 배율 ×'+fx.toFixed(2)+(fx!==fz?'×'+fz.toFixed(2):'')+' → 평면 반영');
}
// --- 회전 (Q · 스케치업 Rotate) — 각도기: 클릭=중심 → 클릭=기준 방향 → 클릭=각도 · 다중 선택은 함께 공전 ---
function _protractor(cx,cz,y){
  const N=72, pts=[]; for(let i=0;i<=N;i++){ const a=i/N*Math.PI*2; pts.push(new THREE.Vector3(cx+Math.cos(a)*0.6,y,cz+Math.sin(a)*0.6)); }
  for(let i=0;i<24;i++){ const a=i/24*Math.PI*2, r0=(i%6===0)?0.45:0.53; pts.push(new THREE.Vector3(cx+Math.cos(a)*0.6,y,cz+Math.sin(a)*0.6),new THREE.Vector3(cx+Math.cos(a)*r0,y,cz+Math.sin(a)*r0)); }
  const ln=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts.slice(0,N+1).flatMap((p,i,arr)=>i<N?[p,arr[i+1]]:[]).concat(pts.slice(N+1))),new THREE.LineBasicMaterial({color:0x4C7DE2,depthTest:false}));
  ln.renderOrder=999; return ln;
}
function beginRotate(g,obj,e){
  const ent=ST.floorCache[obj.floorId], z0=(ent?ent.z0*MM:0)+((obj.elev||0)*MM);
  dragPlane.constant=-z0; rayFromEvent(e); ray.ray.intersectPlane(dragPlane,dragPt);
  const extras=_selOthers(g).map(x=>({g:x,obj:x.userData.obj,orig:{x:x.position.x,z:x.position.z},base:x.userData.obj.rot||0}));
  const pro=_protractor(g.position.x,g.position.z,z0+0.03); scene.add(pro);
  ST.op={type:'rotate',g,obj,base:obj.rot||0,ang:0,stage:1,c:{x:g.position.x,z:g.position.z},orig:{x:g.position.x,z:g.position.z},ref:null,extras,protractor:pro,
    line:new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(g.position.x,z0+0.03,g.position.z),new THREE.Vector3(g.position.x,z0+0.03,g.position.z)]),new THREE.LineBasicMaterial({color:0xE24CE2,depthTest:false}))};
  ST.op.line.renderOrder=999; scene.add(ST.op.line);
  opOrbit(true); vcbShow('회전: 기준 방향 클릭 (숫자=각도)',0,'°'); invalidate();
}
function _rotAngleAt(e){ // 중심에서 커서 방향 각도(도, 평면 기준)
  const op=ST.op; rayFromEvent(e); if(!ray.ray.intersectPlane(dragPlane,dragPt)) return null;
  const pos=op.line.geometry.attributes.position; pos.setXYZ(1,dragPt.x,-dragPlane.constant+0.03,dragPt.z); pos.needsUpdate=true;
  return Math.atan2(dragPt.z-op.c.z,dragPt.x-op.c.x)*180/Math.PI;
}
function _applyRot(op,a){ // a = 회전량(도, 시계) — 대표는 제자리 회전, 나머지는 중심 둘레 공전
  op.ang=a;
  op.g.rotation.y=-((op.base+a)%360)*Math.PI/180;
  const r=a*Math.PI/180, cs=Math.cos(r), sn=Math.sin(r);
  op.extras.forEach(it=>{ const dx=it.orig.x-op.c.x, dz=it.orig.z-op.c.z;
    it.g.position.x=op.c.x+dx*cs-dz*sn; it.g.position.z=op.c.z+dx*sn+dz*cs; it.g.rotation.y=-((it.base+a)%360)*Math.PI/180; });
  invalidate(true);
}
function rotateClick(e){ // 각도기 단계 진행
  const op=ST.op; if(!op||op.type!=='rotate') return;
  const a=_rotAngleAt(e); if(a==null) return;
  if(op.stage===1){ op.ref=a; op.stage=2; vcbShow('회전 각도 (Shift=자유)',0,'°'); return; }
  commitRotate(vcbTyped());
}
function applyRotate(e,free){
  const op=ST.op; if(!op||op.type!=='rotate') return;
  const a=_rotAngleAt(e); if(a==null) return;
  if(op.stage===1){ invalidate(); return; }
  let d=a-op.ref; d=((d+180)%360+360)%360-180;
  if(!free) d=Math.round(d/15)*15;
  _applyRot(op,d);
  vcbShow('회전'+(free?' (자유)':' (15° 스냅)'),Math.round(d),'°');
}
function commitRotate(exact){
  const op=ST.op; if(!op||op.type!=='rotate') return;
  const a=(exact!==null&&exact!==undefined)?exact:op.ang;
  _applyRot(op,a);
  const items=[{g:op.g,obj:op.obj,base:op.base,orig:op.orig}].concat(op.extras);
  const ops=items.map(it=>{ const o=it.obj; o.rot=(((it.base+a)%360)+360)%360; const x=Math.round(it.g.position.x/MM), y=Math.round(it.g.position.z/MM);
    if(it.g!==op.g){ o.x=x; o.y=y; }
    return {op:'rotate',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{angle:o.rot,x,y}}; });
  const g=op.g, c=op.c, base=op.base;
  _opDone();
  sendBatch(ops,'회전');
  select(g,{silent:true});
  setLast('회전','°',raw=>{ const v=parseFloat(raw); if(!isFinite(v)) return false; const r=v*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r);
    sendBatch(items.map(it=>{ const o=it.obj, ox=it.orig?it.orig.x:it.g.position.x, oz=it.orig?it.orig.z:it.g.position.z, dx=ox-c.x, dz=oz-c.z;
      return {op:'rotate',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{angle:(((it.base+v)%360)+360)%360,x:Math.round((c.x+dx*cs-dz*sn)/MM),y:Math.round((c.z+dx*sn+dz*cs)/MM)}}; }),'회전'); return true; });
  setStatus(statusLive,'↻ 회전 '+Math.round(a)+'° → 평면 반영'+(items.length>1?' ('+items.length+'개)':''));
}
// --- 밀기끌기 (벽 높이·공간 천장고 · 벽 옆면 = 두께) ---
function beginPP(hit){
  const obj=hit.object.userData.obj, g=hit.object.parent;
  let t=null;
  const n=hit.face&&hit.face.normal?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):null;
  if(obj.kind==='wall'&&!obj.locked){
    if(n&&Math.abs(n.y)<0.7&&obj.meta&&obj.meta.t) t={obj,g,mode:'thick',base:obj.meta.t,baseSZ:g.scale.z,n};   // 옆면 = 두께 (수평 밀기)
    else t={obj,g,mode:'wall',base:obj.meta.H};
  }
  else if(obj.kind==='ceiling') t={obj,g,mode:'ceil',base:Math.round((obj.prims&&obj.prims[0]&&obj.prims[0].z)||2400)};
  if(!t){ setStatus(statusLive,'밀기끌기는 벽·천장에서 (가구 높이는 종류가 정합니다)'); return; }
  ST.op={type:'pp',...t,startY:null,startX:null,delta:0,origY:t.g.position.y};
  opOrbit(true);
  vcbShow(t.mode==='thick'?'벽 두께 (밀기)':'밀기끌기',0,'mm');
}
function applyPP(clientY,clientX){
  const op=ST.op; if(!op||op.type!=='pp') return;
  if(op.startY===null){ op.startY=clientY; op.startX=clientX; return; }
  if(op.mode==='thick'){
    // 화면 이동을 면 법선 방향으로 투영 (법선 쪽으로 끌면 두꺼워진다)
    const r=renderer.domElement.getBoundingClientRect();
    const c0=op.g.position.clone().project(camera), c1=op.g.position.clone().add(op.n).project(camera);
    const sx=(c1.x-c0.x)*r.width/2, sy=-(c1.y-c0.y)*r.height/2, L=Math.hypot(sx,sy)||1;
    const px=(clientX!=null?clientX:op.startX)-op.startX, py=clientY-op.startY;
    let d=Math.round(((px*sx+py*sy)/L)*3/10)*10;         // 3mm/px · 10mm 스냅
    d=Math.max(30-op.base,Math.min(600-op.base,d));
    op.delta=d; op.g.scale.z=op.baseSZ*(op.base+d)/op.base;
    vcbShow('벽 두께',op.base+d,'mm'); invalidate(true); return;
  }
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
  const obj=op.obj,mode=op.mode;
  if(mode==='thick'){
    const nv=Math.max(30,Math.min(600,(exact!==null&&exact!==undefined)?Math.round(exact):op.base+op.delta));
    op.g.scale.z=op.baseSZ; _opDone();
    sendEdit('set',obj,{thickness:nv});
    setLast('벽 두께','mm',raw=>{ const v=parseLen(raw); if(v==null||v<30||v>600) return false; sendEdit('set',obj,{thickness:Math.round(v)}); return true; });
    setStatus(statusLive,'⇔ 벽 두께 '+nv+'mm → 평면 반영'); return;
  }
  const d=(exact!==null&&exact!==undefined)?Math.round(exact):op.delta;
  const nv=Math.max(300,op.base+d);
  if(op.g){ op.g.scale.y=1; op.g.position.y=op.origY; }
  _opDone();
  ST.lastPP=d; // 스케치업: 더블클릭 = 직전 밀기끌기 반복
  const target=mode==='wall'?obj:{kind:'floor',id:String(obj.id).replace(/_ceil$/,''),floorId:obj.floorId};
  const key=mode==='wall'?'height_mm':'ceilingHeight_mm', base=op.base;
  sendEdit('set',target,{[key]:nv});
  setLast('밀기끌기','mm',raw=>{ const v=parseLen(raw); if(v==null) return false; sendEdit('set',target,{[key]:Math.max(300,base+Math.round(v))}); return true; });
  setStatus(statusLive,'⇕ 높이 '+nv+'mm → 평면 반영');
}
// --- 페인트 (B) · Alt+클릭 = 재질 추출 (스케치업 Sample Paint) ---
function renderPaintPal(){
  const pal=$('paintpal'); if(!pal) return;
  const cats=[['wall','벽 마감',MATS.WALL],['floor','바닥재',MATS.FLOOR],['ceil','천장재',MATS.CEIL]];
  pal.innerHTML=cats.map(([cat,label,TBL])=>TBL?('<div class="pp-cat">'+label+'</div><div class="pp-grid">'+
    Object.entries(TBL).map(([k,v])=>'<button class="pp-it'+((ST.paint.cat===cat&&ST.paint.code===k)?' on':'')+'" data-cat="'+cat+'" data-code="'+k+'"><span class="pp-chip" style="background:'+(MC3D.WALL_COLORS[k]||MC3D.FLOOR_COLORS[k]||'#B9B2A6')+'"></span>'+(v.name||k)+'</button>').join('')+'</div>'):'').join('');
  pal.querySelectorAll('.pp-it').forEach(b=>{ b.onclick=()=>{ ST.paint={cat:b.dataset.cat,code:b.dataset.code}; renderPaintPal(); if(ST.tool!=='paint') setTool('paint'); }; }); // 스케치업: 재질 고르면 페인트 도구
}
function samplePaint(hit){
  const obj=hit.object.userData.obj; if(!obj) return;
  const m=obj.meta||{};
  let c=null;
  if(obj.kind==='wall'&&m.material) c={cat:'wall',code:m.material};
  else if(obj.kind==='floor') c={cat:'floor',code:m.floorMaterial||'STRONG'};
  else if(obj.kind==='ceiling'){ const fl=findGroup(obj.floorId,String(obj.id).replace(/_ceil$/,'')); const fm=fl&&fl.userData.obj.meta; c={cat:'ceil',code:(fm&&fm.ceilingMaterial)||'GYPSUM'}; }
  if(!c){ setStatus(statusLive,'추출할 재질이 없습니다'); return; }
  ST.paint=c; renderPaintPal(); openTraySec('mat');
  setStatus(statusLive,'💧 재질 추출: '+c.code+' — 클릭해서 칠하기');
}
function doPaint(hit,e){
  if(e&&e.altKey){ samplePaint(hit); return; }
  const obj=hit.object.userData.obj; if(!obj) return;
  const c=ST.paint;
  const targets=(ST.selSet.size>1&&ST.selSet.has(hit.object.parent))?[...ST.selSet].map(g=>g.userData.obj):[obj]; // 다중 선택 위 클릭 = 한 번에
  const ops=[];
  targets.forEach(o=>{
    if(o.kind==='wall'&&c.cat==='wall') ops.push({op:'set',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{finishMaterial:c.code}});
    else if(o.kind==='floor'&&c.cat==='floor') ops.push({op:'set',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{floorMaterial:c.code}});
    else if(o.kind==='floor'&&c.cat==='ceil') ops.push({op:'set',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{ceilingMaterial:c.code}});
    else if(o.kind==='ceiling'&&c.cat==='ceil') ops.push({op:'set',kind:KINDMAP.floor,id:String(o.id).replace(/_ceil$/,''),floorId:o.floorId,patch:{ceilingMaterial:c.code}});
  });
  if(!ops.length){ setStatus(statusLive,'이 재질은 '+({wall:'벽',floor:'바닥',ceil:'천장'})[c.cat]+'에 칠합니다 (Alt+클릭=재질 추출)'); return; }
  if(sendBatch(ops,'재질')) setStatus(statusLive,'🪣 재질 적용'+(ops.length>1?' '+ops.length+'개':'')+' → 평면·견적 반영');
}
// --- 줄자 (T) — 두 점 거리 · 선/중간점에서 시작하면 안내선(점선) 생성 (스케치업 Tape Measure) ---
function _tapeSnap(hit){ // 줄자도 점·선·원점에 흡착 — 수평 좌표만 스냅, 높이는 표면 유지
  const p=hit.point.clone();
  const obj=hit.object.userData.obj;
  const fid=obj?obj.floorId:(ST.floorSel!=='all'?ST.floorSel:(ST.floors[0]&&ST.floors[0].id));
  const f=ST.floors.find(x=>x.id===fid), z0=f?f.z0*MM:0;
  const s=snap3(fid,{x:p.x/MM,y:p.z/MM},z0);
  if(s.kind!=='grid'){ p.x=s.x*MM; p.z=s.y*MM; showSnap(s,z0); }
  else hideSnap();
  p.userData={kind:s.kind,fid,z0,mm:{x:s.x,y:s.y}};
  return p;
}
function _guideDirAt(fid,pt){ // 점 근처 벽의 방향 (안내선은 그 벽에 평행)
  const sd=ST.snapData[fid]; if(!sd) return null;
  let best=null,bd=Infinity;
  sd.walls.forEach(w=>{ const q=closestOnSeg(pt,w); const d=Math.hypot(q.x-pt.x,q.y-pt.y); if(d<bd){ bd=d; best=w; } });
  if(!best||bd>80) return null;
  const L=Math.hypot(best.x2-best.x1,best.y2-best.y1)||1; return {x:(best.x2-best.x1)/L,y:(best.y2-best.y1)/L};
}
function addGuide(fid,a,b,z0){ // 무한 안내선 (그리기 스냅 대상) — 화면엔 긴 점선
  const L=Math.hypot(b.x-a.x,b.y-a.y)||1, ux=(b.x-a.x)/L, uy=(b.y-a.y)/L, EXT=60000;
  const g={fid,x1:Math.round(a.x-ux*EXT),y1:Math.round(a.y-uy*EXT),x2:Math.round(a.x+ux*EXT),y2:Math.round(a.y+uy*EXT)};
  const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(g.x1*MM,z0+0.02,g.y1*MM),new THREE.Vector3(g.x2*MM,z0+0.02,g.y2*MM)]),new THREE.LineDashedMaterial({color:0x9A9AFF,dashSize:0.12,gapSize:0.08,depthTest:false}));
  ln.computeLineDistances(); ln.renderOrder=997; ln.name='guide'; scene.add(ln); g.line=ln;
  ST.guides.push(g); rebuildGuideSnap(fid); invalidate();
  return g;
}
function clearGuides(){ ST.guides.forEach(g=>{ if(g.line) scene.remove(g.line); }); const fids=[...new Set(ST.guides.map(g=>g.fid))]; ST.guides=[]; fids.forEach(rebuildGuideSnap); invalidate(); setStatus(statusLive,'안내선 모두 삭제'); }
function tapeClick(hit,e){
  if(!hit) return;
  const p=_tapeSnap(hit);
  if(!ST.op||ST.op.type!=='tape'){
    const geo=new THREE.BufferGeometry().setFromPoints([p,p.clone()]);
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false}));
    line.renderOrder=998;
    scene.add(line);
    const u=p.userData||{};
    const guideDir=(u.kind==='edge'||u.kind==='midpoint')?_guideDirAt(u.fid,u.mm):null;   // 선/중간점에서 시작 = 평행 안내선 모드
    ST.op={type:'tape',a:p,line,fid:u.fid,z0:u.z0,guideDir,ctrl:!!(e&&(e.ctrlKey||e.metaKey))};
    opOrbit(true);
    vcbShow(guideDir?'안내선 간격 (선에서)':'줄자',0,'mm');
    invalidate();
  }else{
    const op=ST.op;
    const d=Math.round(op.a.distanceTo(p)/MM);
    const exact=vcbTyped();
    scene.remove(op.line); op.line.geometry.dispose();
    if(op.guideDir&&op.fid){                       // 선에서 시작 → 그 선에 평행한 안내선 (거리 입력 가능)
      const a0=op.a.userData.mm, u=op.guideDir, nx=-u.y, ny=u.x;
      let off=(p.userData.mm.x-a0.x)*nx+(p.userData.mm.y-a0.y)*ny;
      if(exact!=null&&exact!==0) off=Math.sign(off||1)*Math.abs(exact);
      off=Math.round(off);
      const q={x:a0.x+nx*off,y:a0.y+ny*off};
      addGuide(op.fid,q,{x:q.x+u.x*1000,y:q.y+u.y*1000},op.z0);
      _opDone(); setStatus(statusLive,'┆ 안내선 생성 (간격 '+Math.abs(off)+'mm) — 그리기 스냅 · 메뉴 편집▸안내선 삭제');
      return;
    }
    if(op.fid&&(op.a.userData.kind==='endpoint'||op.a.userData.kind==='origin'||op.a.userData.kind==='intersection')&&(e&&e.shiftKey)){ // Shift = 두 점 지나는 안내선
      addGuide(op.fid,op.a.userData.mm,p.userData.mm,op.z0); _opDone(); setStatus(statusLive,'┆ 두 점 안내선 생성'); return;
    }
    _opDone();
    setStatus(statusLive,'📏 '+d+' mm ('+(d/1000).toFixed(2)+' m)');
    vcbShow('줄자',d,'mm');
    invalidate();
  }
}
function tapeMove(e){
  const op=ST.op; if(!op||op.type!=='tape') return;
  const hit=hitAt(e.clientX,e.clientY); if(!hit) return;
  const p=_tapeSnap(hit);
  const pos=op.line.geometry.attributes.position;
  pos.setXYZ(1,p.x,p.y,p.z); pos.needsUpdate=true;
  if(op.guideDir){ const a0=op.a.userData.mm,u=op.guideDir; const off=(p.userData.mm.x-a0.x)*-u.y+(p.userData.mm.y-a0.y)*u.x; vcbShow('안내선 간격',Math.abs(Math.round(off)),'mm'); }
  else vcbShow('줄자',Math.round(op.a.distanceTo(p)/MM),'mm');
  invalidate();
}
// --- 포인터 흐름 (스케치업: 좌=도구 · 가운데 끌기=궤도(Shift=이동) · 우클릭=상황 메뉴/동작 취소 · 선택 도구 빈 곳 끌기=선택 상자) ---
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
const CLICK_TOOLS=new Set(['tape','line','circle','arc','offset','dim']);
renderer.domElement.addEventListener('pointerdown',e=>{
  hideCtx();
  drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,button:e.button,touch:e.pointerType==='touch'};
  if(ST.mode==='walk'){ renderer.domElement.setPointerCapture(e.pointerId); return; }
  if(e.button!==0) return;                                   // 우클릭·가운데는 pointerup / OrbitControls
  if(ST.op){                                                 // 스티키 동작은 다음 클릭 = 확정 (스케치업식)
    const t=ST.op.type;
    if(CLICK_TOOLS.has(t)){}                                  // 클릭 도구는 아래 switch 에서 다음 점
    else if((t==='move'||t==='slide')&&!ST.op.sticky){}       // 버튼 눌러 끄는 중이면 pointerup 에서
    else if(t==='rotate'){ rotateClick(e); drag=null; return; }
    else { commitActive(vcbTyped()); drag=null; return; }
  }
  const hit=hitAt(e.clientX,e.clientY);
  const obj=hit&&hit.object.userData.obj;
  const g=hit&&hit.object.parent;
  const movable=obj&&MOVABLE.has(obj.kind)&&!obj.locked;
  const opening=obj&&(obj.kind==='door'||obj.kind==='window')&&!obj.locked&&obj.meta&&obj.meta.wall;
  const mod=e.ctrlKey||e.metaKey||e.shiftKey;
  const grab=()=>{ if(!ST.selSet.has(g)) select(g,{silent:true}); };
  switch(ST.tool){
    case 'select':
      if(movable&&!mod){ grab(); beginMove(g,obj,false); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(opening&&!mod){ grab(); beginSlide(g,obj); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(obj&&obj.locked&&MOVABLE.has(obj.kind)&&!mod) setStatus(statusLive,'잠금된 객체 — 이동 불가 (우클릭▸잠금 해제)');
      else if(!drag.touch&&!mod&&(!hit||!(movable||opening))) drag.box=true;   // 빈 곳/벽·바닥에서 끌기 = 선택 상자
      else if(!drag.touch&&mod) drag.box=true;
      break;
    case 'move':
      if(movable){ grab(); beginMove(g,obj,e.ctrlKey||e.metaKey); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(opening){ grab(); beginSlide(g,obj); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(obj&&obj.locked) setStatus(statusLive,'잠금된 객체');
      break;
    case 'rotate':
      if(movable){ grab(); beginRotate(g,obj,e); }
      else if(obj&&obj.locked) setStatus(statusLive,'잠금된 객체');
      break;
    case 'scale':
      if(movable){ select(g,{silent:true}); beginScale(g,obj,e.clientY,e.clientX); }
      break;
    case 'orbit': case 'pan': case 'zoom': break; // 카메라 도구 — OrbitControls 가 처리
    case 'add': placeGhost(); break;
    case 'line': case 'rect': lineClick(e); break;
    case 'circle': circleClick(e); break;
    case 'arc': arcClick(e); break;
    case 'offset': offsetClick(e); break;
    case 'pushpull': if(hit) beginPP(hit); break;
    case 'paint': if(hit) doPaint(hit,e); break;
    case 'erase': drag.erase=new Set(); if(g&&obj) eraseCollect(g); break;
    case 'tape': tapeClick(hit,e); break;
    case 'dim': dimClick(hit); break;
    case 'text': textClick(hit); break;
  }
});
renderer.domElement.addEventListener('pointermove',e=>{
  if(ST.tool==='add'&&ST.add&&ST.add.ghost){ ghostFollow(e); }
  // 첫 클릭 전에도 스냅 마커 표시 (스케치업 추론 — 호버만으로 끝점/중간점/선에 흡착 예고)
  if((ST.tool==='line'||ST.tool==='rect'||ST.tool==='circle'||ST.tool==='arc')&&!ST.op&&ST.mode==='orbit'){
    const fid=_hoverFloorId(e);
    const f=ST.floors.find(x=>x.id===fid), z0=f?f.z0*MM:0;
    const raw=_planePt(e,z0);
    if(raw) showSnap(snap3(fid,raw,z0),z0);
  }
  // 스티키 동작 — 버튼을 안 눌러도 따라온다 (클릭-이동-클릭)
  if(ST.op&&(!drag||drag.id!==e.pointerId)){
    const t=ST.op.type;
    if(t==='move'&&ST.op.sticky) applyMoveFromEvent(e);
    else if(t==='slide'&&ST.op.sticky) applySlideFromEvent(e);
    else if(t==='rotate') applyRotate(e,e.shiftKey);
    else if(t==='scale') applyScale(e.clientY,e.shiftKey,e.clientX);
    else if(t==='pp') applyPP(e.clientY,e.clientX);
    else if(t==='tape') tapeMove(e);
    else if(t==='line') lineMove(e);
    else if(t==='circle') circleMove(e);
    else if(t==='arc') arcMove(e);
    else if(t==='offset') offsetMove(e);
    else if(t==='dim'){ const hit=hitAt(e.clientX,e.clientY); if(hit){ const p=_tapeSnap(hit); const pos=ST.op.line.geometry.attributes.position; pos.setXYZ(1,p.x,p.y,p.z); pos.needsUpdate=true; vcbShow('치수',Math.round(ST.op.a.distanceTo(p)/MM),'mm'); invalidate(); } }
    return;
  }
  if(!drag||drag.id!==e.pointerId) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5) drag.moved=true;
  if(ST.op&&ST.op.type==='move'&&!ST.op.sticky){ applyMoveFromEvent(e); return; }
  if(ST.op&&ST.op.type==='slide'&&!ST.op.sticky){ applySlideFromEvent(e); return; }
  if(ST.op&&ST.op.type==='tape'){ tapeMove(e); return; }
  if(drag.box&&drag.moved){ showSelBox(drag.x,drag.y,e.clientX,e.clientY); return; }
  if(drag.erase&&drag.moved){ const hit=hitAt(e.clientX,e.clientY); if(hit) eraseCollect(hit.object.parent); return; }
  if(ST.mode==='walk'&&drag.button===0){
    ST.walk.yaw-=dx*0.0045; ST.walk.pitch-=dy*0.0035;
    drag.x=e.clientX; drag.y=e.clientY;
    applyWalkCamera();
  }
});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!drag) return;
  const d=drag; drag=null;
  if(d.button===2){                                          // 우클릭: 끌었으면 OrbitControls 이동, 아니면 취소/메뉴
    if(d.moved||ST.mode==='walk') return;
    if(ST.op){ cancelOp(); setStatus(statusLive,'동작 취소 (우클릭)'); return; }
    showCtx(e); return;
  }
  if(d.button!==0) return;
  const wasClick=!d.moved;
  const op=ST.op;
  if(op&&(op.type==='move'||op.type==='slide')&&!op.sticky){
    if(op.moved){ commitActive(vcbTyped()); return; }
    if(ST.tool==='move'){ op.sticky=true; return; }   // 이동 도구: 클릭=집기 → 스티키
    cancelOp();                                        // 선택 도구: 클릭이면 그냥 선택
  }
  if(d.box){ hideSelBox(); if(d.moved){ boxSelect(d.x,d.y,e.clientX,e.clientY,e); return; } }
  if(d.erase){ eraseFinish(e.shiftKey); return; }
  if(wasClick&&!ST.op) pick(e.clientX,e.clientY,e);
});
renderer.domElement.addEventListener('pointercancel',()=>{ if(ST.op&&!CLICK_TOOLS.has(ST.op.type)&&ST.op.type!=='rotate') cancelOp(); hideSelBox(); drag=null; });
renderer.domElement.addEventListener('click',e=>{ // 세 번 클릭 = 그 층의 모든 객체 (스케치업 triple-click = 연결된 전체)
  if(e.detail>=3&&ST.tool==='select'&&!ST.op){ const hit=hitAt(e.clientX,e.clientY); const o=hit&&hit.object.userData.obj; if(o){ selectGroups(visibleGroups(o.floorId)); setStatus(statusLive,'층 전체 선택 ('+ST.selSet.size+'개)'); } }
});
renderer.domElement.addEventListener('dblclick',e=>{
  if(ST.op&&CLICK_TOOLS.has(ST.op.type)){ cancelOp(); setStatus(statusLive,'╱ 그리기 끝'); return; } // 스케치업: 더블클릭=사슬 끝
  const hit=hitAt(e.clientX,e.clientY);
  if(!hit) return;
  const obj=hit.object.userData.obj, g=hit.object.parent;
  // 스케치업: 밀기끌기 도구에서 더블클릭 = 직전 값 반복
  if(ST.tool==='pushpull'&&typeof ST.lastPP==='number'&&ST.lastPP!==0){
    if(obj&&obj.kind==='wall'&&!obj.locked){ sendEdit('set',obj,{height_mm:Math.max(300,obj.meta.H+ST.lastPP)}); setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm'); return; }
    if(obj&&obj.kind==='ceiling'){ const base=Math.round((obj.prims&&obj.prims[0]&&obj.prims[0].z)||2400); sendEdit('set',{kind:'floor',id:String(obj.id).replace(/_ceil$/,''),floorId:obj.floorId},{ceilingHeight_mm:Math.max(300,base+ST.lastPP)}); setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm'); return; }
  }
  if(ST.tool==='select'&&obj){                                // 스케치업: 더블클릭 = 그룹 안으로 (방 전체 / 연결된 벽)
    if(obj.kind==='floor'){ selectSpaceGroup(obj.floorId,obj.id); return; }
    if(obj.kind==='ceiling'){ selectSpaceGroup(obj.floorId,String(obj.id).replace(/_ceil$/,'')); return; }
    if(obj.kind==='wall'){ selectWallNeighbors(g); return; }
  }
  zoomTo(g);
});
// --- 지우개 (E) — 끌면서 지나간 것 모으기 → 떼면 한 번에 (Shift = 숨기기) ---
function eraseCollect(g){
  if(!drag||!drag.erase||!g||!g.userData.obj) return;
  const o=g.userData.obj;
  if(!(MOVABLE.has(o.kind)||o.kind==='door'||o.kind==='window')){ if(!drag.erase.size) setStatus(statusLive,'벽·면은 평면에서 지우세요 (Shift+지우개 = 숨기기)'); if(!drag.erase.size&&drag&&!drag.moved) drag.hideOnly=g; return; }
  if(o.locked){ setStatus(statusLive,'잠금된 객체 — 삭제 불가'); return; }
  if(!drag.erase.has(g)){ drag.erase.add(g); _hl(g,true); invalidate(); }
}
function eraseFinish(shift){
  const set=drag&&drag.erase; const hideOnly=drag&&drag.hideOnly;
  const gs=set?[...set]:[];
  gs.forEach(g=>_hl(g,ST.selSet.has(g)));
  if(shift){ (gs.length?gs:(hideOnly?[hideOnly]:[])).forEach(hideGroup); return; }
  if(!gs.length) return;
  deleteGroups(gs);
}
// --- 상황 메뉴 (우클릭) ---
let ctxEl=null;
function hideCtx(){ if(ctxEl) ctxEl.style.display='none'; }
function showCtx(e){
  const hit=hitAt(e.clientX,e.clientY); const g=hit&&hit.object.parent;
  if(g&&!ST.selSet.has(g)) select(g,{silent:true});
  if(!ctxEl){ ctxEl=document.createElement('div'); ctxEl.id='ctxmenu'; document.body.appendChild(ctxEl);
    document.addEventListener('pointerdown',ev=>{ if(ctxEl.style.display!=='none'&&!ctxEl.contains(ev.target)) hideCtx(); },true); }
  const items=[], sel=ST.selected&&ST.selected.userData.obj, n=ST.selSet.size;
  if(sel){
    items.push(['info','개체 정보',()=>openTraySec('info')]);
    items.push(['-']);
    if(MOVABLE.has(sel.kind)||sel.kind==='door'||sel.kind==='window') items.push(['del','지우기'+(n>1?' ('+n+'개)':'')+'\tDel',deleteSelected3D]);
    items.push(['hide','숨기기\tShift+H',hideSelected]);
    if(MOVABLE.has(sel.kind)) items.push(['lock',sel.locked?'잠금 해제':'잠금',()=>lockSelected(!sel.locked)]);
    items.push(['-']);
    if(MOVABLE.has(sel.kind)){ items.push(['copy','복사\tCtrl+C',copySel]); items.push(['cut','잘라내기\tCtrl+X',cutSel]); }
    if(ST.clip) items.push(['paste','붙여넣기\tCtrl+V',()=>pasteClip(e)]);
    items.push(['-']);
    items.push(['zoom','선택 확대',()=>zoomTo(ST.selected)]);
    if(sel.kind==='floor') items.push(['room','방 전체 선택',()=>selectSpaceGroup(sel.floorId,sel.id)]);
    if(sel.kind==='wall') items.push(['nb','연결된 벽 선택',()=>selectWallNeighbors(ST.selected)]);
    if(MOVABLE.has(sel.kind)){ items.push(['-']); items.push(['rotl','↺ 15°\tShift+R',()=>rotateSelected(-15)]); items.push(['rotr','↻ 15°\tR',()=>rotateSelected(15)]); items.push(['flip','180° 돌리기',()=>rotateSelected(180)]); }
  }else{
    if(ST.clip) items.push(['paste','붙여넣기\tCtrl+V',()=>pasteClip(e)]);
    items.push(['all','모두 선택\tCtrl+A',selectAll]);
    if(ST.hidden.size) items.push(['unhide','숨긴 것 모두 보기 ('+ST.hidden.size+')',unhideAll]);
    if(ST.guides.length) items.push(['guides','안내선 모두 삭제',clearGuides]);
    items.push(['-']);
    items.push(['fit','전체 보기\tShift+Z',()=>fitView(true)]);
    items.push(['iso','기본 시점',()=>setView('iso')]);
    items.push(['prev','이전 시점',camPrev]);
  }
  ctxEl.innerHTML=items.map(it=>it[0]==='-'?'<div class="sep"></div>':('<button data-k="'+it[0]+'"><span>'+it[1].split('\t')[0]+'</span>'+(it[1].split('\t')[1]?'<kbd>'+it[1].split('\t')[1]+'</kbd>':'')+'</button>')).join('');
  items.filter(it=>it[0]!=='-').forEach(it=>{ const b=ctxEl.querySelector('[data-k="'+it[0]+'"]'); if(b) b.onclick=()=>{ hideCtx(); it[2](); }; });
  ctxEl.style.display='block';
  const W=ctxEl.offsetWidth||200,H=ctxEl.offsetHeight||240;
  ctxEl.style.left=Math.max(4,Math.min(e.clientX,innerWidth-W-4))+'px'; ctxEl.style.top=Math.max(4,Math.min(e.clientY,innerHeight-H-4))+'px';
}
// --- 선택 대상 일괄 동작 (회전·삭제·잠금·숨김·클립보드) ---
function _selObjs(pred){ return [...ST.selSet].map(g=>g.userData.obj).filter(o=>o&&(!pred||pred(o))); }
function rotateSelected(deg){
  const gs=[...ST.selSet].filter(g=>MOVABLE.has(g.userData.obj.kind)); if(!gs.length) return;
  if(gs.some(g=>g.userData.obj.locked)){ setStatus(statusLive,'잠금된 객체가 있습니다'); return; }
  const ops=gs.map(g=>{ const o=g.userData.obj; o.rot=(((o.rot||0)+deg)%360+360)%360; g.rotation.y=-o.rot*Math.PI/180; return {op:'rotate',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{angle:o.rot}}; });
  sendBatch(ops,'회전'); invalidate(true);
}
function deleteGroups(gs){
  const ok=gs.filter(g=>{ const o=g.userData.obj; return o&&(MOVABLE.has(o.kind)||o.kind==='door'||o.kind==='window')&&!o.locked; });
  if(!ok.length){ setStatus(statusLive,'벽·공간은 평면에서 지우세요'); return; }
  const ops=ok.map(g=>{ const o=g.userData.obj; return {op:'delete',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId}; });
  ok.forEach(g=>ST.selSet.delete(g));
  _syncSel();
  if(!sendBatch(ops,'삭제')) return;
  ok.forEach(disposeGroup); rebuildPickables(); invalidate(true);
  setStatus(statusLive,'삭제'+(ok.length>1?' '+ok.length+'개':'')+' → 평면 반영'+(ok.length>1?' (Ctrl+Z 한 번)':''));
}
function deleteSelected3D(){ if(ST.selSet.size) deleteGroups([...ST.selSet]); }
function lockSelected(on){
  const gs=[...ST.selSet].filter(g=>MOVABLE.has(g.userData.obj.kind)); if(!gs.length){ setStatus(statusLive,'잠금은 가구·기구·조명·설비·기둥'); return; }
  const ops=gs.map(g=>{ const o=g.userData.obj; o.locked=!!on; return {op:'lock',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{locked:!!on}}; });
  sendBatch(ops,on?'잠금':'잠금 해제'); renderProps(ST.selected&&ST.selected.userData.obj,ST.selSet.size>1?{multi:_selObjs()}:null);
  setStatus(statusLive,(on?'🔒 잠금':'🔓 잠금 해제')+' '+gs.length+'개 → 평면 반영');
}
function hideGroup(g){ const o=g&&g.userData.obj; if(!o) return; ST.hidden.add(o.floorId+'|'+o.id); if(ST.selSet.has(g)){ ST.selSet.delete(g); _hl(g,false); } refreshVisibility(); rebuildPickables(); }
function hideSelected(){ const gs=[...ST.selSet]; if(!gs.length) return; gs.forEach(hideGroup); _syncSel(); setStatus(statusLive,'숨김 '+gs.length+'개 (3D 표시만 · 편집▸숨긴 것 모두 보기)'); }
function unhideAll(){ const n=ST.hidden.size; ST.hidden.clear(); refreshVisibility(); rebuildPickables(); setStatus(statusLive,'숨긴 것 모두 보기 ('+n+')'); }
function copySel(){
  const objs=_selObjs(o=>MOVABLE.has(o.kind)&&o.kind!=='pillar');
  if(!objs.length){ setStatus(statusLive,'복사는 가구·기구·조명·전기·설비 (벽·면은 평면에서)'); return false; }
  const cx=objs.reduce((a,o)=>a+o.x,0)/objs.length, cy=objs.reduce((a,o)=>a+o.y,0)/objs.length;
  ST.clip={at:Date.now(),items:objs.map(o=>{ const m=o.meta||{}; return {kind:o.kind,type:m.type,dx:Math.round(o.x-cx),dy:Math.round(o.y-cy),angle:o.rot||0,inch:m.inch,length_mm:m.linear,w:m.w,h:m.d,elev_mm:o.elev||0,flipped:!!m.flipped}; }),cx:Math.round(cx),cy:Math.round(cy)};
  setStatus(statusLive,'📋 복사 '+objs.length+'개 (Ctrl+V 붙여넣기)'); return true;
}
function cutSel(){ if(copySel()) deleteSelected3D(); }
function pasteClip(e){
  const c=ST.clip; if(!c||!c.items.length){ setStatus(statusLive,'붙여넣을 것이 없습니다 (Ctrl+C 먼저)'); return; }
  let fid=ST.floorSel!=='all'?ST.floorSel:(ST.floors[0]&&ST.floors[0].id), at=null;
  if(e&&e.clientX!=null){ fid=_hoverFloorId(e)||fid; const f=ST.floors.find(x=>x.id===fid); const p=_planePt(e,f?f.z0*MM:0); if(p) at={x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10}; }
  if(!at){ c.n=(c.n||0)+1; at={x:c.cx+300*c.n,y:c.cy+300*c.n}; }        // 커서 없으면 300mm 씩 밀어서
  const ops=c.items.map(it=>{ const patch={type:it.type,x:at.x+it.dx,y:at.y+it.dy,angle:it.angle,elev_mm:it.elev_mm,flipped:it.flipped}; ['inch','length_mm','w','h'].forEach(k=>{ if(typeof it[k]==='number') patch[k]=it[k]; }); return {op:'add',kind:KINDMAP[it.kind],floorId:fid,patch}; });
  if(sendBatch(ops,'붙여넣기')) setStatus(statusLive,'📋 붙여넣기 '+ops.length+'개 → 평면 반영');
}

// ---------------------------------------------------------------------------
// 속성 패널 — 3D 에서 바로 수정 (재질·높이·회전…)
// ---------------------------------------------------------------------------
const props=$('props');
function matOptions(TBL,cur){
  if(typeof TBL==='undefined'||!TBL) return '';
  return Object.entries(TBL).map(([k,v])=>`<option value="${k}"${k===cur?' selected':''}>${v.name||k}</option>`).join('');
}
function renderProps(obj,opts){
  if(!obj){ props.innerHTML='<div class="p-note">객체를 클릭하면 여기서 정보·수정 (스케치업 Entity Info)<br>Ctrl/Shift+클릭=추가 · 끌기=선택 상자 · 더블클릭=방 전체</div>'; return; } // 트레이 상주
  const m=obj.meta||{};
  const multi=opts&&opts.multi;
  if(multi&&multi.length>1){                                   // 다중 선택 요약 (스케치업 Entity Info "N Entities")
    const cnt={}; multi.forEach(o=>{ const t=TAG_OF(o)||o.kind; cnt[t]=(cnt[t]||0)+1; });
    const mv=multi.filter(o=>MOVABLE.has(o.kind)), locked=mv.filter(o=>o.locked).length;
    let html=`<h4>${multi.length}개 선택</h4><div class="p-sub">${Object.entries(cnt).map(([k,v])=>k+' '+v).join(' · ')}</div>`;
    if(mv.length){
      html+=`<div class="p-btns"><button class="btn" data-a="rotl" title="반시계 15° (Shift+R)">↺ 15°</button><button class="btn" data-a="rotr" title="시계 15° (R)">↻ 15°</button><button class="btn" data-a="${locked?'unlock':'lock'}">${locked?'🔓 잠금 해제':'🔒 잠금'}</button></div>`;
      html+=`<div class="p-btns"><button class="btn" data-a="copy">📋 복사 (Ctrl+C)</button><button class="btn danger" data-a="del">🗑 삭제 (Del)</button></div>`;
    }
    html+=`<div class="p-btns"><button class="btn" data-a="hide">숨기기</button><button class="btn" data-a="zoom">선택 확대</button></div>`;
    html+=`<div class="p-note">끌면 함께 이동(Ctrl=복사) · Q 회전은 대표 중심으로 공전 · B 재질은 한 번에</div>`;
    props.innerHTML=html; props.style.display='block';
    props.querySelectorAll('[data-a]').forEach(el=>{ el.addEventListener('click',()=>{ const a=el.dataset.a;
      if(a==='rotl') rotateSelected(-15); else if(a==='rotr') rotateSelected(15); else if(a==='del') deleteSelected3D();
      else if(a==='lock') lockSelected(true); else if(a==='unlock') lockSelected(false); else if(a==='copy') copySel();
      else if(a==='hide') hideSelected(); else if(a==='zoom'&&ST.selected) zoomTo(ST.selected); }); });
    return;
  }
  let html=`<h4>${obj.name||obj.kind}</h4><div class="p-sub">${obj.floorName||''}${obj.floorName?' · ':''}${m.type||obj.kind}</div>`;
  if(obj.locked){ html+='<div class="p-lock">🔒 잠금된 객체 — 보기만 가능</div><div class="p-btns"><button class="btn" data-a="unlock">🔓 잠금 해제</button></div>'; props.innerHTML=html; props.style.display='block';
    const ub=props.querySelector('[data-a="unlock"]'); if(ub) ub.onclick=()=>lockSelected(false); return; }
  if(MOVABLE.has(obj.kind)){
    html+=`<div class="p-row"><label>위치</label><span style="font-size:12px">${Math.round(obj.x)}, ${Math.round(obj.y)} mm</span></div>`;
    html+=`<div class="p-row"><label>띄움(Z)</label><input type="number" step="10" min="0" data-f="elev_mm" value="${obj.elev||0}"> <span style="font-size:11px">mm</span></div>`;
    if(obj.kind==='light'&&m.inch) html+=`<div class="p-row"><label>인치</label><select data-f="inch">${[2,3,4,5,6].map(i=>`<option value="${i}"${i===m.inch?' selected':''}>${i}"</option>`).join('')}</select></div>`;
    if(m.linear) html+=`<div class="p-row"><label>길이</label><input type="number" step="100" data-f="length_mm" value="${m.linear}"> <span style="font-size:11px">mm</span></div>`;
    html+=`<div class="p-btns"><button class="btn" data-a="rotl" title="반시계 15° (Shift+R)">↺ 15°</button><button class="btn" data-a="rotr" title="시계 15° (R)">↻ 15°</button></div>`;
    html+=`<div class="p-btns"><button class="btn" data-a="lock">🔒 잠금</button><button class="btn" data-a="copy">📋 복사</button><button class="btn danger" data-a="del">🗑 삭제 (Del)</button></div>`;
    html+=`<div class="p-note">드래그로 이동(10mm 스냅) — 수정은 평면도에 바로 반영됩니다.</div>`;
  }else if(obj.kind==='wall'){
    html+=`<div class="p-row"><label>길이</label><span style="font-size:12px">${m.L} mm · 면적 ${((m.L||0)*(m.H||0)/1e6).toFixed(2)} ㎡</span></div>`;
    html+=`<div class="p-row"><label>두께</label><input type="number" step="10" min="30" max="600" data-f="thickness" value="${m.t}"> <span style="font-size:11px">mm</span></div>`;
    html+=`<div class="p-row"><label>높이</label><input type="number" step="50" data-f="height_mm" value="${m.H}"> <span style="font-size:11px">mm</span></div>`;
    html+=`<div class="p-row"><label>마감</label><select data-f="finishMaterial"><option value="">기본</option>${matOptions(MATS.WALL,m.material)}</select></div>`;
  }else if(obj.kind==='floor'){
    html+=`<div class="p-row"><label>바닥재</label><select data-f="floorMaterial">${matOptions(MATS.FLOOR,m.floorMaterial||'STRONG')}</select></div>`;
    html+=`<div class="p-row"><label>천장재</label><select data-f="ceilingMaterial">${matOptions(MATS.CEIL,m.ceilingMaterial||'GYPSUM')}</select></div>`;
    html+=`<div class="p-row"><label>천장고</label><input type="number" step="50" data-f="ceilingHeight_mm" value="${m.ceilH}"> <span style="font-size:11px">mm</span></div>`;
    const _st=ST.snapData[obj.floorId]&&ST.snapData[obj.floorId].stats&&ST.snapData[obj.floorId].stats[obj.id];
    const _sp=ST.snapData[obj.floorId]&&ST.snapData[obj.floorId].spaces&&ST.snapData[obj.floorId].spaces.find(x=>String(x.id)===String(obj.id));
    if(_sp&&_sp.poly&&_sp.poly.length>=3) html+=`<div class="p-row"><label>면적</label><span style="font-size:12px">${(Math.abs(polyArea(_sp.poly))/1e6).toFixed(2)} ㎡ · 둘레 ${(_sp.poly.reduce((a,p,i,arr)=>a+Math.hypot(arr[(i+1)%arr.length].x-p.x,arr[(i+1)%arr.length].y-p.y),0)/1000).toFixed(2)} m</span></div>`;
    if(_st) html+=`<div class="p-row"><label>그룹</label><span style="font-size:12px">면 1 · 선(벽) ${_st.walls} · 배치 ${_st.items}</span></div>`;
  }else if(obj.kind==='door'||obj.kind==='window'){
    html+=`<div class="p-row"><label>폭</label><input type="number" step="50" data-f="width_mm" value="${m.w}"></div>`;
    html+=`<div class="p-row"><label>높이</label><input type="number" step="50" data-f="height_mm" value="${m.h}"></div>`;
    if(obj.kind==='window') html+=`<div class="p-row"><label>창턱</label><input type="number" step="50" data-f="sillHeight_mm" value="${m.sill||0}"></div>`;
    if(m.wall&&m.wall.L!=null) html+=`<div class="p-row"><label>벽 위 위치</label><span style="font-size:12px">${Math.round(m.along||0)} / ${m.wall.L} mm — 끌면 벽 따라 이동</span></div>`;
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
      else if(a==='lock') lockSelected(true);
      else if(a==='copy') copySel();
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
      if(e.key==='Enter'){ if(tgt.dataset.post) vcbPostEnter(); else commitActive(vcbTyped()); e.preventDefault(); }
      if(e.key==='Escape'){ if(tgt.dataset.post){ vcbPostOff(); tgt.blur(); } else cancelOp(); }
    }
    return;
  }
  const k=e.key.toLowerCase(), ctrl=e.ctrlKey||e.metaKey;
  // Ctrl+Z / Ctrl+Y — MiniCAD 히스토리로 실행취소/재실행 (스케치업 그 이상: 평면과 한 몸)
  if(ctrl&&(k==='z'||k==='y')){
    if(chan) chan.postMessage({type:'edit',op:(k==='y'||e.shiftKey)?'redo':'undo'});
    e.preventDefault(); return;
  }
  if(ctrl&&k==='s'){ if(e.shiftKey) screenshot(); else saveFeedback(); e.preventDefault(); return; } // Ctrl+S = 저장(평면) · Ctrl+Shift+S = PNG
  if(ctrl&&k==='a'){ selectAll(); e.preventDefault(); return; }
  if(ctrl&&k==='c'){ copySel(); e.preventDefault(); return; }
  if(ctrl&&k==='x'){ cutSel(); e.preventDefault(); return; }
  if(ctrl&&k==='v'){ pasteClip(ST.lastPtr); e.preventDefault(); return; }
  if(e.key==='?'){ showKeys(true); e.preventDefault(); return; }                    // ? = 단축키표
  // 동작 중 숫자 입력 → VCB 로 (스케치업 수치 입력) — [x,y] · <dx,dy> · 6s · 3000,2000 · 음수
  if(ST.op&&/^[0-9.,\-\[<]$/.test(e.key)){
    const i=vcb&&vcb.querySelector('.v-v');
    if(i){ i.value=e.key; i.focus(); e.preventDefault(); }
    return;
  }
  // 확정 직후 숫자 = 되돌려 그 값으로 다시 · x3 / /3 = 배열 복사 (스케치업)
  if(!ST.op&&ST.lastCommit&&!ctrl&&/^[0-9.\-x*\/]$/.test(e.key)){ if(vcbPostOn(e.key)){ e.preventDefault(); return; } }
  if(e.key==='Enter'&&ST.op){ commitActive(vcbTyped()); return; }
  if(k==='escape'){
    hideCtx();
    const km=$('keysmodal');
    if(km&&km.style.display==='flex'){ showKeys(false); return; }
    if(document.querySelector('.menu.open')){ closeMenus(); return; }
    if(ST.lastCommit){ vcbPostOff(); }
    if(ST.op) cancelOp(); else if(ST.tool==='add') setTool('select'); else select(null); return;
  }
  ST.walk.keys[k]=true;
  if(ST.mode==='orbit'){
    if(k==='shift'&&ST.op){                       // Shift 누르기 = 지금 방향 고정 (스케치업 추론 잠금)
      const op=ST.op;
      if(op.type==='line'&&op.dir&&!op.shiftLock){ op.shiftLock={x:op.dir.x,y:op.dir.y}; setStatus(statusLive,'방향 고정 (Shift 놓으면 해제)'); }
      if(op.type==='move'&&!op.shiftLock){ const dx=op.g.position.x-op.orig.x,dz=op.g.position.z-op.orig.z,l=Math.hypot(dx,dz); if(l>1e-6){ op.shiftLock={x:dx/l,z:dz/l}; setStatus(statusLive,'방향 고정 (Shift 놓으면 해제)'); } }
      return;
    }
    if(!ctrl){
      if(k===' '){ setTool('select'); e.preventDefault(); return; }
      if(k==='m'){ setTool('move'); return; }
      if(k==='q'){ setTool('rotate'); return; }
      if(k==='s'){ setTool('scale'); return; }
      if(k==='p'){ setTool('pushpull'); return; }
      if(k==='b'){ setTool('paint'); return; }
      if(k==='e'){ setTool('erase'); return; }
      if(k==='t'){ setTool('tape'); return; }
      if(k==='r'&&ST.tool==='add'&&ST.add&&ST.add.ghost){ ST.add.rot=((ST.add.rot||0)+(e.shiftKey?-15:15)+360)%360; ST.add.ghost.rotation.y=-ST.add.rot*Math.PI/180; invalidate(); e.preventDefault(); return; }
      if(k==='r'&&ST.selSet.size&&ST.tool==='select'&&[...ST.selSet].every(g=>MOVABLE.has(g.userData.obj.kind))){ rotateSelected(e.shiftKey?-15:15); e.preventDefault(); return; } // 선택물 있으면 R = 15° 회전
      if(k==='l'){ setTool('line'); return; }          // 스케치업 L=Line — 벽 그리기
      if(k==='r'){ setTool('rect'); return; }          // 스케치업 R=Rectangle — 사각 벽
      if(k==='c'&&!e.shiftKey){ setTool('circle'); return; } // 스케치업 C=Circle
      if(k==='a'){ setTool('arc'); return; }           // 스케치업 A=Arc
      if(k==='f'&&!e.shiftKey){ setTool('offset'); return; } // 스케치업 F=Offset
      if(k==='d'){ setTool('dim'); return; }           // 스케치업 D=Dimension
      if(k==='g'){ setTool('add'); return; }           // 배치 (스케치업 컴포넌트 자리)
      if(k==='o'){ setTool('orbit'); return; }         // 스케치업 O=궤도
      if(k==='h'&&!e.shiftKey){ setTool('pan'); return; } // 스케치업 H=팬
      if(k==='z'&&!e.shiftKey){ setTool('zoom'); return; } // 스케치업 Z=줌
      if(k==='x'){ setXray(!ST.xray); return; }
    }
    const op=ST.op, lockable=op&&(op.type==='move'||op.type==='line'||op.type==='rect');
    if(k==='arrowright'&&lockable){ ST.axisLock=(ST.axisLock==='x')?null:'x'; setStatus(statusLive,'축 고정: '+(ST.axisLock==='x'?'가로(X·빨강)':'해제')); e.preventDefault(); return; }
    if(k==='arrowleft'&&lockable){ ST.axisLock=(ST.axisLock==='y')?null:'y'; setStatus(statusLive,'축 고정: '+(ST.axisLock==='y'?'세로(Y·초록)':'해제')); e.preventDefault(); return; }
    if(k==='arrowup'&&op&&op.type==='move'){ ST.axisLock=(ST.axisLock==='z')?null:'z'; if(ST.axisLock==='z')ST.op.zRefY=null; setStatus(statusLive,'축 고정: '+(ST.axisLock==='z'?'높이(Z·파랑) — 위아래로 끌어 띄우기, 숫자=정확 높이':'해제')); e.preventDefault(); return; }
    if(k==='arrowdown'&&op&&op.type==='line'){    // ↓ = 가까운 벽에 평행 → 수직 → 해제 (스케치업 Parallel/Perpendicular)
      const d=_guideDirAt(op.fid,op.cur||op.a)||_guideDirAt(op.fid,op.a);
      if(!d){ setStatus(statusLive,'가까운 벽이 없어 평행/수직 고정 불가'); e.preventDefault(); return; }
      op.refDir=d; ST.axisLock=ST.axisLock==='par'?'perp':(ST.axisLock==='perp'?null:'par');
      setStatus(statusLive,'고정: '+(ST.axisLock==='par'?'벽에 평행(자홍)':ST.axisLock==='perp'?'벽에 수직(자홍)':'해제')); e.preventDefault(); return;
    }
  }
  if(k==='1') setMode('orbit'); if(k==='2') setMode('walk');
  if(k==='3') setView('iso'); if(k==='4') setView('top'); if(k==='5') setView('front'); if(k==='6') setView('side');
  if(k==='7') setView('back'); if(k==='8') setView('left'); if(k==='9') setView('right');
  if(k==='n'&&!ctrl) setNight(!ST.night); // (L 은 스케치업 Line 도구로 — 조명 토글은 💡 버튼)
  if(k==='c'&&e.shiftKey) toggleCeil();  // Shift+C = 천장 (C 는 원 도구)
  if(e.shiftKey&&k==='z') fitView(true);  // Shift+Z = 전체 보기 (스케치업 Zoom Extents)
  if(e.shiftKey&&k==='h') hideSelected(); // Shift+H = 선택 숨기기
  if((k==='delete'||k==='backspace')&&ST.selSet.size){ deleteSelected3D(); e.preventDefault(); }
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase(); ST.walk.keys[k]=false;
  if(k==='shift'&&ST.op&&ST.op.shiftLock){ ST.op.shiftLock=null; setStatus(statusLive,'방향 고정 해제'); }
});
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
function saveFeedback(){ // Ctrl+S = 평면(미니캐드) 저장 — 3D 는 평면의 뷰이므로 저장은 평면이 한다
  if(!chan){ setStatus(false,'MiniCAD 창이 없어 저장 요청 불가 (PNG 는 Ctrl+Shift+S)'); return; }
  chan.postMessage({type:'save',at:Date.now()});
  setStatus(statusLive,'💾 저장 요청 → 미니캐드 (PNG 는 Ctrl+Shift+S)');
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
const MF_PROTO=5; // 미니캐드(ui.js MC_PROTO)와 짝 — 어긋나면 새로고침 안내
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
// X-ray · 아웃라이너 · 장면 (스케치업 View▸Face Style▸X-ray · Outliner · Scenes)
// ---------------------------------------------------------------------------
function setXray(on,silent){
  ST.xray=!!on;
  ST.root&&ST.root.traverse(o=>{
    if(!o.isMesh||!o.material) return;
    const m=o.material; m.userData=m.userData||{};
    if(on){ if(!m.userData._xr) m.userData._xr={t:m.transparent,o:m.opacity,d:m.depthWrite}; m.transparent=true; m.opacity=0.35; m.depthWrite=false; }
    else if(m.userData._xr){ const r=m.userData._xr; m.transparent=r.t; m.opacity=r.o; m.depthWrite=r.d; delete m.userData._xr; }
    m.needsUpdate=true;
  });
  refreshStylePanel(); invalidate(true);
  if(!silent) setStatus(statusLive,'X-ray '+(on?'켜짐 (X)':'꺼짐'));
}
function renderOutliner(){
  const el=$('outliner'); if(!el) return;
  const sec=el.closest('.tsec'); if(sec&&!sec.classList.contains('open')){ ST._olDirty=true; return; }
  ST._olDirty=false;
  if(!ST.root){ el.innerHTML='<div class="p-note">모델 없음</div>'; return; }
  const selKeys=new Set(ST.selKeys);
  let html='';
  ST.root.children.forEach(fg=>{
    const fid=fg.userData.floorId, f=ST.floors.find(x=>x.id===fid);
    const items=fg.children.filter(g=>g.userData.obj&&g.userData.obj.kind!=='slab'&&g.userData.obj.kind!=='ceiling');
    html+='<div class="ol-f'+(fg.visible?'':' off')+'">'+(f?f.name:fid)+' <span class="ol-n">'+items.length+'</span></div>';
    items.slice(0,400).forEach(g=>{ const o=g.userData.obj, key=o.floorId+'|'+o.id;
      html+='<div class="ol-i'+(selKeys.has(key)?' sel':'')+(ST.hidden.has(key)?' hid':'')+(o.locked?' lock':'')+'" data-k="'+key+'"><span class="ol-k">'+(TAG_OF(o)||o.kind)+'</span>'+(o.name||o.kind)+(o.locked?' 🔒':'')+'</div>'; });
    if(items.length>400) html+='<div class="p-note">… 외 '+(items.length-400)+'개</div>';
  });
  el.innerHTML=html;
  const grp=k=>{ const i=k.indexOf('|'); return findGroup(k.slice(0,i),k.slice(i+1)); };
  el.querySelectorAll('.ol-i').forEach(d=>{
    d.onclick=ev=>{ const k=d.dataset.k, g=grp(k); if(!g) return; if(ST.hidden.has(k)){ ST.hidden.delete(k); refreshVisibility(); rebuildPickables(); } select(g,(ev.ctrlKey||ev.metaKey||ev.shiftKey)?{toggle:true}:null); };
    d.ondblclick=()=>{ const g=grp(d.dataset.k); if(g) zoomTo(g); };
  });
}
function scenesLoad(){ try{ return JSON.parse(localStorage.getItem('minicad.3d.scenes')||'[]'); }catch(_){ return []; } }
function scenesSave(arr){ try{ localStorage.setItem('minicad.3d.scenes',JSON.stringify(arr)); }catch(_){} }
function sceneAdd(name){
  const arr=scenesLoad();
  name=name||window.prompt('장면 이름','장면 '+(arr.length+1)); if(!name) return;
  arr.push({name,p:camera.position.toArray(),t:orbit.target.toArray(),mode:ST.mode,ortho:ST.ortho,night:ST.night,ceil:ST.ceil[ST.mode],xray:ST.xray,sunT:ST.sunT,floorSel:ST.floorSel,walk:ST.mode==='walk'?{yaw:ST.walk.yaw,pitch:ST.walk.pitch}:null});
  scenesSave(arr); renderScenes(); setStatus(statusLive,'장면 저장: '+name);
}
function sceneGo(i){
  const sc=scenesLoad()[i]; if(!sc) return;
  if(sc.floorSel&&sc.floorSel!==ST.floorSel&&(sc.floorSel==='all'||ST.floors.some(f=>f.id===sc.floorSel))){ ST.floorSel=sc.floorSel; renderFloorButtons(); refreshVisibility(); select(null); }
  if(ST.mode!==sc.mode) setMode(sc.mode);
  if(ST.mode==='orbit'){ if(!!sc.ortho!==ST.ortho) setOrtho(!!sc.ortho); camera.position.fromArray(sc.p); orbit.target.fromArray(sc.t); if(ST.ortho) _orthoFit(); orbit.update(); camPush(); }
  else { camera.position.fromArray(sc.p); if(sc.walk){ ST.walk.yaw=sc.walk.yaw; ST.walk.pitch=sc.walk.pitch; } applyWalkCamera(); }
  if(!!sc.night!==ST.night) setNight(!!sc.night);
  if(sc.ceil!=null&&sc.ceil!==ST.ceil[ST.mode]) toggleCeil();
  if(!!sc.xray!==ST.xray) setXray(!!sc.xray,true);
  if(typeof sc.sunT==='number') setSunT(sc.sunT);
  renderScenes(i); invalidate(true); setStatus(statusLive,'장면: '+sc.name);
}
function sceneUpdate(i){ const arr=scenesLoad(); if(!arr[i]) return; const nm=arr[i].name; arr.splice(i,1); scenesSave(arr); sceneAdd(nm); }
function sceneDel(i){ const arr=scenesLoad(); if(!arr[i]) return; arr.splice(i,1); scenesSave(arr); renderScenes(); }
function renderScenes(cur){
  const el=$('scenes'); if(!el) return;
  const arr=scenesLoad();
  el.innerHTML=arr.map((sc,i)=>'<div class="sc-i'+(i===cur?' on':'')+'" data-i="'+i+'"><button class="sc-go">'+(i+1)+'. '+sc.name+'</button><button class="sc-up" title="현재 시점으로 갱신">↻</button><button class="sc-del" title="삭제">✕</button></div>').join('')+
    '<div class="p-btns"><button class="btn" id="sc-add">＋ 장면 추가 (현재 시점)</button></div>';
  el.querySelectorAll('.sc-i').forEach(d=>{ const i=+d.dataset.i; d.querySelector('.sc-go').onclick=()=>sceneGo(i); d.querySelector('.sc-up').onclick=()=>sceneUpdate(i); d.querySelector('.sc-del').onclick=()=>sceneDel(i); });
  const ab=$('sc-add'); if(ab) ab.onclick=()=>sceneAdd();
}
// ---------------------------------------------------------------------------
// UI 배선·루프
// ---------------------------------------------------------------------------
$('b-orbit').onclick=()=>setMode('orbit');
$('b-walk').onclick=()=>setMode('walk');
$('v-iso').onclick=()=>setView('iso');
$('v-top').onclick=()=>setView('top');
$('v-front').onclick=()=>setView('front');
$('v-side').onclick=()=>setView('side');
const _vb=$('v-back'); if(_vb) _vb.onclick=()=>setView('back');
const _vl=$('v-left'); if(_vl) _vl.onclick=()=>setView('left');
const _vr=$('v-right'); if(_vr) _vr.onclick=()=>setView('right');
const _vp=$('v-prev'); if(_vp) _vp.onclick=camPrev;
const _vn=$('v-next'); if(_vn) _vn.onclick=camNext;
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
  set('st-xray',ST.xray); set('st-ortho',ST.ortho);
  const mi=(id,on)=>{ const el=$(id); if(el){ el.classList.toggle('chk',!!on); el.classList.toggle('unchk',!on); } };
  mi('mi-light',ST.lightsOn); mi('mi-night',ST.night); mi('mi-ceil',ST.ceil[ST.mode]);
  mi('mi-label',ST.labels); mi('mi-shadow',ST.shadows); mi('mi-axes',ST.axes);
  mi('mi-xray',ST.xray); mi('mi-ortho',ST.ortho);
  mi('mi-tray',!document.body.classList.contains('tray-off'));
  const sun=$('st-sun'); if(sun&&document.activeElement!==sun) sun.value=Math.round(ST.sunT*100);
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
    case 'selectall': selectAll(); break;
    case 'copy': copySel(); break;
    case 'cut': cutSel(); break;
    case 'paste': pasteClip(ST.lastPtr); break;
    case 'lock': lockSelected(true); break;
    case 'unlock': lockSelected(false); break;
    case 'hide': hideSelected(); break;
    case 'unhide': unhideAll(); break;
    case 'guides-clear': clearGuides(); break;
    case 'annots-clear': clearAnnots(); break;
    case 'xray': setXray(!ST.xray); break;
    case 'ortho': setOrtho(!ST.ortho); break;
    case 'prev': camPrev(); break;
    case 'next': camNext(); break;
    case 'back': case 'left': case 'right': setView(cmd); break;
    case 'scene-add': sceneAdd(); break;
    case 'sec-outline': openTraySec('outline'); renderOutliner(); break;
    case 'sec-scenes': openTraySec('scenes'); break;
    case 'sec-tags': openTraySec('tags'); break;
    case 'save': saveFeedback(); break;
    case 'light': setLights(!ST.lightsOn); break;
    case 'night': setNight(!ST.night); break;
    case 'ceil': toggleCeil(); break;
    case 'label': toggleLabels(); break;
    case 'shadow': setShadows(!ST.shadows); break;
    case 'axes': setAxes(!ST.axes); break;
    case 'orbit': setMode('orbit'); break;
    case 'walk': setMode('walk'); break;
    case 'iso': case 'top': case 'front': case 'side': setView(cmd); break;
    case 'fit': fitView(true); break;
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
  th.addEventListener('click',()=>{ const sec=th.parentElement; sec.classList.toggle('open'); if(sec.dataset.sec==='outline'&&sec.classList.contains('open')&&ST._olDirty!==false) renderOutliner(); });
});
const _stWire={'st-light':()=>setLights(!ST.lightsOn),'st-night':()=>setNight(!ST.night),'st-ceil':toggleCeil,
  'st-label':toggleLabels,'st-shadow':()=>setShadows(!ST.shadows),'st-axes':()=>setAxes(!ST.axes),
  'st-xray':()=>setXray(!ST.xray),'st-ortho':()=>setOrtho(!ST.ortho)};
const _sun=$('st-sun'); if(_sun) _sun.addEventListener('input',()=>setSunT(_sun.value/100));
renderTags(); renderScenes();
renderer.domElement.addEventListener('pointermove',e=>{ ST.lastPtr={clientX:e.clientX,clientY:e.clientY}; },{passive:true});
Object.entries(_stWire).forEach(([id,fn])=>{ const b=$(id); if(b) b.onclick=()=>{ fn(); refreshStylePanel(); }; });
const _kc=$('keys-close'); if(_kc) _kc.onclick=()=>showKeys(false);
const _bc2=$('b-ceil'); if(_bc2) _bc2.onclick=toggleCeil;      // 툴바 천장/이름표도 공용 토글로 일원화
const _bl2=$('b-label'); if(_bl2) _bl2.onclick=toggleLabels;
renderProps(null);
setTool('select');            // 강사·커서·상태 초기화
refreshStylePanel();

window.addEventListener('resize',()=>{
  persp.aspect=view.clientWidth/view.clientHeight; persp.updateProjectionMatrix();
  if(ST.ortho) _orthoFit();
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
window.MC3DVIEW={ST,scene,get camera(){return camera;},renderer,build:acceptDoc,fitView,setMode,setLights,setView,setNight,
  sendEdit,sendBatch,rotateSelected,deleteSelected3D,setTool,commitActive,cancelOp,menuCmd,openTraySec,setAxes,snap3,segHitsSpace,
  select,selectGroups,selectAll,boxSelect,selectSpaceGroup,selectWallNeighbors,findGroup,
  setOrtho,setXray,setSunT,setTag,camPrev,camNext,camPush,copySel,cutSel,pasteClip,lockSelected,hideSelected,unhideAll,
  addGuide,clearGuides,arcPts,offsetPoly,polyArea,parseLen,vcbTyped,vcbCoord,vcbSides,setLast,vcbPostOn,vcbPostEnter,
  sceneAdd,sceneGo,scenesLoad,renderOutliner,showCtx,hideCtx,saveFeedback,opOrbit,orbit,
  axesOn:()=>!!(axesGrp&&axesGrp.visible),
  selectById:(fid,id)=>{const g=findGroup(fid,id);if(g)select(g);return !!g;},
  selCount:()=>ST.selSet.size,
  objCount:()=>{let n=0;ST.root&&ST.root.children.forEach(fg=>{n+=fg.children.length;});return n;}};
