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
const LIBS={
  FURNITURE_LIB:window.FURNITURE_LIB,FIXFURN_LIB:window.FIXFURN_LIB,FIXTURE_LIB:window.FIXTURE_LIB,
  LIGHT_LIB:window.LIGHT_LIB,ELECTRIC_LIB:window.ELECTRIC_LIB,HVAC_FIRE_LIB:window.HVAC_FIRE_LIB,
};
const MAX_POINT_LIGHTS=24;
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
  matCache.set(key,m);
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
    const m=matFor(p).clone(); m.side=THREE.DoubleSide;
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
  Object.keys(ST.floorCache).forEach(k=>{ if(!keep.has(k)){ disposeGroup(ST.floorCache[k].group); delete ST.floorCache[k]; } });
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
  $('proj').textContent=project?' · '+project:'';
  $('empty').style.display='none';
  invalidate(true);
}
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
// 객체 드래그 이동 (조감 모드)
const dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const dragPt=new THREE.Vector3();
let drag=null; // 화면 클릭/회전 판별
renderer.domElement.addEventListener('pointerdown',e=>{
  drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,button:e.button};
  if(e.button===0&&ST.mode==='orbit'){
    const hit=hitAt(e.clientX,e.clientY);
    const obj=hit&&hit.object.userData.obj;
    if(obj&&MOVABLE.has(obj.kind)){
      if(obj.locked){ setStatus(statusLive,'잠금된 객체 — 이동 불가'); }
      else{
        const g=hit.object.parent;
        const ent=ST.floorCache[obj.floorId];
        dragPlane.constant=-(ent?ent.z0*MM:0);   // 그 층 바닥 평면
        ray.ray.intersectPlane(dragPlane,dragPt);
        ST.editDrag={g,obj,off:{x:g.position.x-dragPt.x,z:g.position.z-dragPt.z},moved:false};
        orbit.enabled=false;
        renderer.domElement.setPointerCapture(e.pointerId);
      }
    }
  }
  if(ST.mode==='walk') renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5) drag.moved=true;
  if(ST.editDrag){
    const r=renderer.domElement.getBoundingClientRect();
    const nd=new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);
    ray.setFromCamera(nd,camera);
    if(ray.ray.intersectPlane(dragPlane,dragPt)){
      const snap=v=>Math.round(v/MM/10)*10*MM; // 10mm 스냅
      ST.editDrag.g.position.x=snap(dragPt.x+ST.editDrag.off.x);
      ST.editDrag.g.position.z=snap(dragPt.z+ST.editDrag.off.z);
      ST.editDrag.moved=true;
      invalidate(true);
    }
    return;
  }
  if(ST.mode==='walk'&&drag.button===0){
    ST.walk.yaw-=dx*0.0045; ST.walk.pitch-=dy*0.0035;
    drag.x=e.clientX; drag.y=e.clientY;
    applyWalkCamera();
  }
});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!drag) return;
  const wasClick=!drag.moved&&drag.button===0;
  const ed=ST.editDrag; ST.editDrag=null;
  if(ed){
    orbit.enabled=(ST.mode==='orbit');
    if(ed.moved){
      const x=Math.round(ed.g.position.x/MM), y=Math.round(ed.g.position.z/MM);
      ed.obj.x=x; ed.obj.y=y;
      sendEdit('move',ed.obj,{x,y});
      select(ed.g,{silent:true});
      setStatus(statusLive,'이동 → 평면 반영 ('+x+', '+y+')');
      drag=null; return;
    }
  }
  drag=null;
  if(wasClick) pick(e.clientX,e.clientY);
});
renderer.domElement.addEventListener('pointercancel',()=>{ if(ST.editDrag){orbit.enabled=(ST.mode==='orbit');ST.editDrag=null;} drag=null; });
renderer.domElement.addEventListener('dblclick',e=>{
  const hit=hitAt(e.clientX,e.clientY);
  if(hit) zoomTo(hit.object.parent);
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
  if(!obj){ props.style.display='none'; props.innerHTML=''; return; }
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
    html+=`<div class="p-row"><label>마감</label><select data-f="finishMaterial"><option value="">기본</option>${matOptions(window.WALL_MATERIALS,m.material)}</select></div>`;
  }else if(obj.kind==='floor'){
    html+=`<div class="p-row"><label>바닥재</label><select data-f="floorMaterial">${matOptions(window.FLOOR_MATERIALS,m.floorMaterial||'STRONG')}</select></div>`;
    html+=`<div class="p-row"><label>천장재</label><select data-f="ceilingMaterial">${matOptions(window.CEILING_MATERIALS,m.ceilingMaterial||'GYPSUM')}</select></div>`;
    html+=`<div class="p-row"><label>천장고</label><input type="number" step="50" data-f="ceilingHeight_mm" value="${m.ceilH}"> <span style="font-size:11px">mm</span></div>`;
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
  if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k=e.key.toLowerCase();
  ST.walk.keys[k]=true;
  if(k==='1') setMode('orbit'); if(k==='2') setMode('walk');
  if(k==='3') setView('iso'); if(k==='4') setView('top'); if(k==='5') setView('front'); if(k==='6') setView('side');
  if(k==='l') setLights(!ST.lightsOn);
  if(k==='n') setNight(!ST.night);
  if(k==='c'){ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshVisibility(); $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]); }
  if(k==='f') fitView();
  if(k==='r'&&ST.selected){ rotateSelected(e.shiftKey?-15:15); e.preventDefault(); }
  if((k==='delete'||k==='backspace')&&ST.selected){ deleteSelected3D(); e.preventDefault(); }
  if(k==='escape') select(null);
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
  const hidden=[];
  ST.root.traverse(o=>{ if((o.isSprite||o.isPointLight)&&o.visible){o.visible=false;hidden.push(o);} });
  new GLTFExporter().parse(ST.root,res=>{
    hidden.forEach(o=>{o.visible=true;}); invalidate();
    download(fileStem()+'.glb',new Blob([res],{type:'model/gltf-binary'}));
  },err=>{ hidden.forEach(o=>{o.visible=true;}); console.error(err); alert('GLB 내보내기 실패: '+(err&&err.message||err)); },{binary:true,onlyVisible:true});
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
function connect(){
  if(typeof BroadcastChannel==='undefined') return;
  chan=new BroadcastChannel('minicad-3d');
  chan.onmessage=e=>{
    const m=e.data||{};
    if(m.type==='doc') acceptDoc({at:m.at,data:m.doc},'live');
  };
  chan.postMessage({type:'hello',at:Date.now()});
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
  if(ST.editDrag) needRender=true;
  if(needRender){ renderer.render(scene,camera); needRender=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

connect();
if(!loadStored()){ $('empty').style.display='flex'; setStatus(false,'MiniCAD 연결 대기'); }
// 테스트·디버그 훅
window.MC3DVIEW={ST,scene,camera,renderer,build:acceptDoc,fitView,setMode,setLights,setView,setNight,
  sendEdit,rotateSelected,deleteSelected3D,
  selectById:(fid,id)=>{const g=findGroup(fid,id);if(g)select(g);return !!g;},
  objCount:()=>{let n=0;ST.root&&ST.root.children.forEach(fg=>{n+=fg.children.length;});return n;}};
