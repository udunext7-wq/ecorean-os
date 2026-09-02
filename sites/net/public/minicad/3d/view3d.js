// ============================================================================
//  MiniCAD 3D 뷰어 (view3d.js) — build3d.js 가 만든 기본체 목록을 three.js 장면으로
//  2026-09-01: 1단계 실시간 3D 뷰. 조감(OrbitControls) / 걷기(눈높이 1.6m, 자체 조작) 두 모드.
//  좌표: 평면 mm(x 오른쪽, y 아래) → three (X=x/1000, Y=z/1000 위, Z=y/1000). 회전 rot(시계방향 도) → rotation.y = -rot
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

// ---------------------------------------------------------------------------
// 렌더러·장면·카메라
// ---------------------------------------------------------------------------
const view=$('view');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.setSize(view.clientWidth,view.clientHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
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
sun.shadow.bias=-0.0006;
sun.shadow.normalBias=0.02;
scene.add(sun); scene.add(sun.target);

const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true; orbit.dampingFactor=0.08;
orbit.maxPolarAngle=Math.PI*0.495;
orbit.screenSpacePanning=false;

// ---------------------------------------------------------------------------
// 상태
// ---------------------------------------------------------------------------
const ST={
  mode:'orbit',          // orbit | walk
  lightsOn:true,
  ceil:{orbit:false,walk:true},
  labels:true,
  shadows:true,
  root:null,             // 현재 장면 그룹
  built:null,            // build3d 결과
  doc:null,
  pointLights:[],
  emissiveMats:[],
  ceilMeshes:[],
  labelSprites:[],
  pickables:[],
  selected:null,
  floors:[],           // 2026-09-03: 층 시트 [{id,name,level,z0,height}]
  floorSel:'all',      // 'all' | floorId — 층 필터
  walk:{yaw:0,pitch:0,keys:{},eye:1.6,speed:2.2},
  lastDocAt:0,
};

// ---------------------------------------------------------------------------
// 재질
// ---------------------------------------------------------------------------
const matCache=new Map();
function matFor(p){
  const key=[p.color,p.opacity??1,p.emissive?1:0,p.glass?1:0].join('|');
  let m=matCache.get(key);
  if(m) return m;
  const col=new THREE.Color(p.color||'#CCCCCC');
  if(p.glass){
    m=new THREE.MeshPhysicalMaterial({color:col,transparent:true,opacity:p.opacity??0.35,roughness:0.08,metalness:0,transmission:0,side:THREE.DoubleSide,depthWrite:false});
  }else{
    m=new THREE.MeshStandardMaterial({color:col,roughness:0.86,metalness:0.02,transparent:(p.opacity??1)<1,opacity:p.opacity??1});
    if(p.emissive){ m.emissive=col.clone(); m.emissiveIntensity=ST.lightsOn?1.4:0; m.roughness=0.5; ST.emissiveMats.push(m); }
  }
  matCache.set(key,m);
  return m;
}
const geoBox=new THREE.BoxGeometry(1,1,1);
const geoCyl=new THREE.CylinderGeometry(1,1,1,28);
const geoSph=new THREE.SphereGeometry(1,20,14);

// ---------------------------------------------------------------------------
// 장면 조립
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
  mesh.castShadow=ST.shadows&&(structural||obj.kind==='furniture'||obj.kind==='fixture'||obj.kind==='door');
  mesh.receiveShadow=ST.shadows&&(obj.kind==='floor'||obj.kind==='slab'||structural||obj.kind==='furniture'||obj.kind==='fixture');
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
function disposeRoot(){
  if(!ST.root) return;
  ST.root.traverse(o=>{
    if(o.isMesh&&o.geometry&&o.geometry!==geoBox&&o.geometry!==geoCyl&&o.geometry!==geoSph) o.geometry.dispose();
    if(o.isSprite){ o.material.map.dispose(); o.material.dispose(); }
  });
  scene.remove(ST.root);
  ST.root=null; ST.pointLights=[]; ST.ceilMeshes=[]; ST.labelSprites=[]; ST.pickables=[]; ST.selected=null; hideTip();
}
function build(doc){
  const built=MC3D.buildScene(doc,LIBS);
  ST.built=built;
  disposeRoot();
  ST.emissiveMats=[]; matCache.clear();
  const root=new THREE.Group(); root.name='MiniCAD';
  const lightObjs=[];
  built.objects.forEach(obj=>{
    const g=new THREE.Group();
    g.name=obj.kind+':'+(obj.name||obj.id);
    g.position.set(obj.x*MM,(obj.z0||0)*MM,obj.y*MM); // z0 = 층 바닥 표고 (다층 적층)
    g.rotation.y=-(obj.rot||0)*Math.PI/180;
    if(obj.flip) g.scale.x=-1;
    g.userData.obj=obj;
    obj.prims.forEach(p=>{ const m=primMesh(p,obj); if(m) g.add(m); });
    if(obj.kind==='ceiling'){ g.visible=ST.ceil[ST.mode]; ST.ceilMeshes.push(g); }
    if(obj.kind!=='slab') g.children.forEach(m=>{ if(m.isMesh) ST.pickables.push(m); });
    if(obj.kind==='light') lightObjs.push({obj,g});
    root.add(g);
  });
  // 광원 — 기구 수가 많으면 고르게 솎아 MAX 개까지만 (다운라이트 80개 = 80 광원은 못 그린다)
  const stride=Math.max(1,Math.ceil(lightObjs.length/MAX_POINT_LIGHTS));
  lightObjs.forEach(({obj,g},i)=>{
    if(i%stride!==0) return;
    const pl=new THREE.PointLight(0xFFE7B8,obj.meta&&obj.meta.linear?9:6,7,2);
    pl.position.set(0,((obj.meta&&obj.meta.lightZ)||2200)*MM,0);
    pl.visible=ST.lightsOn;
    g.add(pl); ST.pointLights.push(pl);
  });
  // 공간 이름표
  built.labels.forEach(l=>{
    if(!l.text) return;
    const sp=makeLabel(l.text);
    sp.position.set(l.x*MM,(l.z+(l.z0||0))*MM,l.y*MM);
    sp.userData.floorId=l.floorId;
    sp.visible=ST.labels&&ST.mode==='orbit';
    root.add(sp); ST.labelSprites.push(sp);
  });
  scene.add(root); ST.root=root;
  // 층 필터 (2026-09-03) — 층이 2개 이상일 때만 버튼 노출
  ST.floors=built.floors||[];
  if(ST.floorSel!=='all'&&!ST.floors.some(f=>f.id===ST.floorSel)) ST.floorSel='all';
  renderFloorButtons();
  refreshVisibility();
  // 태양(그림자) 범위
  const b=built.bounds, cx=(b.minX+b.maxX)/2*MM, cz=(b.minY+b.maxY)/2*MM;
  const span=Math.max(b.maxX-b.minX,b.maxY-b.minY)*MM;
  sun.position.set(cx+span*0.5,span*0.9+6,cz+span*0.35);
  sun.target.position.set(cx,0,cz);
  const sc=sun.shadow.camera; sc.left=-span*0.8; sc.right=span*0.8; sc.top=span*0.8; sc.bottom=-span*0.8; sc.near=0.5; sc.far=span*3+20; sc.updateProjectionMatrix();
  $('proj').textContent=built.project?' · '+built.project:'';
  $('empty').style.display='none';
  return built;
}
function fitView(){
  if(!ST.built) return;
  const b=ST.built.bounds, cx=(b.minX+b.maxX)/2*MM, cz=(b.minY+b.maxY)/2*MM;
  const sx=(b.maxX-b.minX)*MM, sz=(b.maxY-b.minY)*MM, span=Math.max(sx,sz,4);
  if(ST.mode==='orbit'){
    orbit.target.set(cx,0.6,cz);
    camera.position.set(cx+span*0.35,span*0.95+2,cz+span*0.85);
    orbit.update();
  }else{
    const l=ST.built.labels.find(x=>floorOK(x.floorId))||ST.built.labels[0];
    const px=l?l.x*MM:cx, pz=l?l.y*MM:cz;
    camera.position.set(px,_selFloorZ0()+ST.walk.eye,pz);
    ST.walk.yaw=Math.PI*0.75; ST.walk.pitch=-0.05;
    applyWalkCamera();
  }
}

// ---------------------------------------------------------------------------
// 모드·토글
// ---------------------------------------------------------------------------
function setMode(m){
  if(ST.mode===m) return;
  ST.mode=m;
  $('b-orbit').classList.toggle('on',m==='orbit');
  $('b-walk').classList.toggle('on',m==='walk');
  $('walkpad').style.display=(m==='walk'&&('ontouchstart' in window))?'grid':'none';
  orbit.enabled=(m==='orbit');
  if(m==='walk'){
    // 지금 보던 방향을 이어받아 눈높이로 내려간다
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    ST.walk.yaw=Math.atan2(-dir.x,-dir.z);
    ST.walk.pitch=0;
    camera.position.set(orbit.target.x,_selFloorZ0()+ST.walk.eye,orbit.target.z);
    applyWalkCamera();
  }else{
    const dir=new THREE.Vector3(); camera.getWorldDirection(dir);
    orbit.target.copy(camera.position).addScaledVector(dir,4); orbit.target.y=0.6;
    camera.position.y=Math.max(camera.position.y,3);
    orbit.update();
  }
  refreshCeil(); refreshLabels();
  $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]);
}
// 2026-09-03: 천장·이름표·층 필터 가시성을 한 곳에서 (층 숨김이 천장 토글에 지워지지 않게)
function floorOK(fid){ return ST.floorSel==='all'||fid===ST.floorSel; }
function _selFloorZ0(){ const f=(ST.floors||[]).find(x=>x.id===ST.floorSel); return f?f.z0*MM:0; }
function refreshVisibility(){
  if(!ST.root) return;
  ST.root.children.forEach(g=>{
    if(g.isSprite){ g.visible=ST.labels&&ST.mode==='orbit'&&floorOK(g.userData.floorId); return; }
    const o=g.userData.obj; if(!o) return;
    let v=floorOK(o.floorId);
    if(o.kind==='ceiling') v=v&&ST.ceil[ST.mode];
    g.visible=v;
  });
}
function refreshCeil(){ refreshVisibility(); }
function refreshLabels(){ refreshVisibility(); }
function renderFloorButtons(){
  const el=$('floors'); if(!el) return;
  el.innerHTML='';
  if(!ST.floors||ST.floors.length<2) return;
  const mk=(label,val,title)=>{
    const b=document.createElement('button');
    b.className='btn'+(ST.floorSel===val?' on':'');
    b.textContent=label; if(title) b.title=title;
    b.onclick=()=>{
      ST.floorSel=val; renderFloorButtons(); refreshVisibility(); select(null);
      if(ST.mode==='walk'&&val!=='all'){ camera.position.y=_selFloorZ0()+ST.walk.eye; applyWalkCamera(); }
    };
    el.appendChild(b);
  };
  mk('전층','all','모든 층을 쌓아서 본다');
  ST.floors.slice().sort((a,b)=>(a.level||0)-(b.level||0)).forEach(f=>mk(f.name,f.id,'이 층만 보기'));
}
function setLights(on){
  ST.lightsOn=on;
  $('b-light').classList.toggle('on',on);
  ST.pointLights.forEach(l=>{l.visible=on;});
  ST.emissiveMats.forEach(m=>{m.emissiveIntensity=on?1.4:0;});
  hemi.intensity=on?1.25:1.6; sun.intensity=on?2.0:2.6;
}
function setShadows(on){
  ST.shadows=on; $('b-shadow').classList.toggle('on',on);
  renderer.shadowMap.enabled=on; sun.castShadow=on;
  if(ST.doc) build(ST.doc);
}

// ---------------------------------------------------------------------------
// 걷기 조작 — 드래그로 둘러보고 W A S D 로 걷는다 (포인터 잠금 없이 태블릿에서도 되게)
// ---------------------------------------------------------------------------
function applyWalkCamera(){
  const w=ST.walk;
  w.pitch=Math.max(-1.2,Math.min(1.2,w.pitch));
  const dir=new THREE.Vector3(-Math.sin(w.yaw)*Math.cos(w.pitch),Math.sin(w.pitch),-Math.cos(w.yaw)*Math.cos(w.pitch));
  camera.lookAt(camera.position.clone().add(dir));
}
let drag=null;
renderer.domElement.addEventListener('pointerdown',e=>{
  drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,button:e.button};
  if(ST.mode==='walk') renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5) drag.moved=true;
  if(ST.mode==='walk'&&drag.button===0){
    ST.walk.yaw-=dx*0.0045; ST.walk.pitch-=dy*0.0035;
    drag.x=e.clientX; drag.y=e.clientY;
    applyWalkCamera();
  }
});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!drag) return;
  const wasClick=!drag.moved&&drag.button===0;
  drag=null;
  if(wasClick) pick(e.clientX,e.clientY);
});
renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
window.addEventListener('keydown',e=>{
  if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k=e.key.toLowerCase();
  ST.walk.keys[k]=true;
  if(k==='1') setMode('orbit'); if(k==='2') setMode('walk');
  if(k==='l') setLights(!ST.lightsOn);
  if(k==='c'){ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshCeil(); $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]); }
  if(k==='f') fitView();
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
function stepWalk(dt){
  const w=ST.walk,k=w.keys;
  let fx=0,fz=0,up=0;
  if(k['w']||k['arrowup']) fz+=1; if(k['s']||k['arrowdown']) fz-=1;
  if(k['a']||k['arrowleft']) fx-=1; if(k['d']||k['arrowright']) fx+=1;
  if(k['q']) up+=1; if(k['e']) up-=1;
  if(!fx&&!fz&&!up) return;
  const sp=w.speed*dt*(k['shift']?2:1);
  const fwd=new THREE.Vector3(-Math.sin(w.yaw),0,-Math.cos(w.yaw));
  const right=new THREE.Vector3(Math.cos(w.yaw),0,-Math.sin(w.yaw));
  camera.position.addScaledVector(fwd,fz*sp).addScaledVector(right,fx*sp);
  const yMax=(ST.built&&ST.built.totalHeight?ST.built.totalHeight*MM:4)+2;
  camera.position.y=Math.max(0.3,Math.min(yMax,camera.position.y+up*sp));
  applyWalkCamera();
}

// ---------------------------------------------------------------------------
// 클릭 → 이름표
// ---------------------------------------------------------------------------
const ray=new THREE.Raycaster();
const tip=$('tip');
function hideTip(){ tip.style.display='none'; }
function describe(obj){
  const m=obj.meta||{};
  if(obj.kind==='wall') return `${obj.name} <small>${m.L}×${m.t}mm · 높이 ${m.H}${m.material?' · '+m.material:''}</small>`;
  if(obj.kind==='floor') return `${obj.name} <small>바닥${m.floorMaterial?' '+m.floorMaterial:''} · 천장 ${m.ceilH}</small>`;
  if(obj.kind==='door'||obj.kind==='window') return `${obj.name} <small>${m.subType||''}${m.sill?' · 창턱 '+m.sill:''}</small>`;
  if(obj.kind==='furniture'||obj.kind==='fixture') return `${obj.name} <small>${m.w}×${m.d}mm</small>`;
  if(obj.kind==='light') return `${obj.name} <small>${m.type}${m.linear?' · '+(m.linear/1000).toFixed(1)+'m':''}</small>`;
  if(obj.kind==='stair') return `${obj.name} <small>(도식 · 실제 단수는 계단 설정)</small>`;
  return `${obj.name} <small>${m.type||obj.kind}</small>`;
}
function select(g){
  if(ST.selected){
    ST.selected.traverse(o=>{ if(o.isMesh&&o.userData._mat){o.material=o.userData._mat;delete o.userData._mat;} });
  }
  ST.selected=g;
  if(!g){ hideTip(); return; }
  g.traverse(o=>{
    if(!o.isMesh) return;
    o.userData._mat=o.material;
    const m=o.material.clone(); m.emissive=new THREE.Color('#C9A961'); m.emissiveIntensity=0.45; o.material=m;
  });
}
function pick(cx,cy){
  const r=renderer.domElement.getBoundingClientRect();
  const nd=new THREE.Vector2(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);
  ray.setFromCamera(nd,camera);
  const hits=ray.intersectObjects(ST.pickables,false).filter(h=>h.object.visible&&h.object.parent&&h.object.parent.visible);
  if(!hits.length){ select(null); return; }
  const g=hits[0].object.parent;
  if(ST.selected===g){ select(null); return; }
  select(g);
  const _o=g.userData.obj;
  tip.innerHTML=(_o.floorName&&ST.floorSel==='all'?_o.floorName+' · ':'')+describe(_o);
  tip.style.display='block';
  tip.style.left=Math.min(cx+14,window.innerWidth-tip.offsetWidth-8)+'px';
  tip.style.top=Math.min(cy+14,window.innerHeight-tip.offsetHeight-8)+'px';
}

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
  const hidden=[...ST.labelSprites,...ST.pointLights].filter(o=>o.visible);
  hidden.forEach(o=>{o.visible=false;});
  new GLTFExporter().parse(ST.root,res=>{
    hidden.forEach(o=>{o.visible=true;});
    download(fileStem()+'.glb',new Blob([res],{type:'model/gltf-binary'}));
  },err=>{ hidden.forEach(o=>{o.visible=true;}); console.error(err); alert('GLB 내보내기 실패: '+(err&&err.message||err)); },{binary:true,onlyVisible:true});
}
function exportJSON(){
  if(!ST.built) return;
  download(fileStem()+'_3d.json',new Blob([JSON.stringify({schema:'ECOREAN.MiniCAD3D.v1',unit:'mm',axes:'x right, y down(plan), z up',...ST.built},null,1)],{type:'application/json'}));
}
function screenshot(){
  renderer.render(scene,camera);
  download(fileStem()+'_3d.png',renderer.domElement.toDataURL('image/png'));
}

// ---------------------------------------------------------------------------
// MiniCAD 와 연결 — localStorage(처음) + BroadcastChannel(실시간)
// ---------------------------------------------------------------------------
const status=$('status');
let chan=null;
function setStatus(live,txt){ status.className=live?'live':'off'; status.textContent=txt; }
function acceptDoc(payload,src){
  const doc=payload&&payload.data?payload.data:payload;
  if(!doc||typeof doc!=='object') return false;
  const at=(payload&&payload.at)||Date.now();
  if(at<ST.lastDocAt) return false;
  ST.lastDocAt=at; ST.doc=doc;
  const first=!ST.built;
  try{ build(doc); }catch(e){ console.error('[3D] build 실패',e); setStatus(false,'조립 오류: '+e.message); return false; }
  if(first) fitView();
  setStatus(src==='live',src==='live'?'MiniCAD 실시간 반영 중':'저장본 표시 (MiniCAD 창에서 고치면 갱신)');
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
// UI 배선
// ---------------------------------------------------------------------------
$('b-orbit').onclick=()=>setMode('orbit');
$('b-walk').onclick=()=>setMode('walk');
$('b-light').onclick=()=>setLights(!ST.lightsOn);
$('b-ceil').onclick=()=>{ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshCeil(); $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]); };
$('b-label').onclick=()=>{ ST.labels=!ST.labels; refreshLabels(); $('b-label').classList.toggle('on',ST.labels); };
$('b-shadow').onclick=()=>setShadows(!ST.shadows);
$('b-fit').onclick=fitView;
$('b-shot').onclick=screenshot;
$('b-glb').onclick=exportGLB;
$('b-json').onclick=exportJSON;
$('b-reload').onclick=()=>{ if(chan) chan.postMessage({type:'hello',at:Date.now()}); loadStored(); };

window.addEventListener('resize',()=>{
  camera.aspect=view.clientWidth/view.clientHeight; camera.updateProjectionMatrix();
  renderer.setSize(view.clientWidth,view.clientHeight);
});

let prev=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-prev)/1000); prev=now;
  if(ST.mode==='orbit') orbit.update(); else stepWalk(dt);
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

connect();
if(!loadStored()){ $('empty').style.display='flex'; setStatus(false,'MiniCAD 연결 대기'); }
// 테스트·디버그 훅
window.MC3DVIEW={ST,scene,camera,renderer,build:acceptDoc,fitView,setMode,setLights};
