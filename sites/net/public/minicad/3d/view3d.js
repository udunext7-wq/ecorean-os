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
// 2026-09-09 대표 지시 "라이트마다 들어오게" — 고정 24 상한 대신 GPU 유니폼 예산으로 계산.
//  포인트라이트 1개 = 프래그먼트 유니폼 약 4 vec4. 재질·안개·그림자 몫 200을 빼고 나눈다.
//  (약한 GPU 최소 사양 224 에서도 24개는 보장, 데스크톱·태블릿 1024+ 에서는 200개까지)
function _plBudget(){
  const mf=(renderer.capabilities&&renderer.capabilities.maxFragmentUniforms)||1024;
  return Math.max(24,Math.min(200,Math.floor((mf-200)/4)));
}
// data.js 의 최상위 const 는 window 속성이 아니라 전역 렉시컬 바인딩 — typeof 로 안전하게 집는다
/* global WALL_MATERIALS, FLOOR_MATERIALS, CEILING_MATERIALS */
const MATS={
  WALL:typeof WALL_MATERIALS!=='undefined'?WALL_MATERIALS:null,
  FLOOR:typeof FLOOR_MATERIALS!=='undefined'?FLOOR_MATERIALS:null,
  CEIL:typeof CEILING_MATERIALS!=='undefined'?CEILING_MATERIALS:null,
};
const MOVABLE=new Set(['furniture','fixture','light','electric','hvac','pillar','mass']); // 2026-09-04 매스 = 자유 이동·회전
const KINDMAP={furniture:'furniture',fixture:'fixtures',light:'lights',electric:'electric',hvac:'hvac',
  wall:'wall',floor:'space',door:'opening',window:'opening',pillar:'pillars',
  mass:'masses',sketchFace:'sketchFaces',sketchEdge:'sketchEdges',sketchPt:'sketchPts'}; // 2026-09-04 프로토콜 6
const SKETCH_KINDS=new Set(['sketchFace','sketchEdge','sketchPt']);

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

const persp=new THREE.PerspectiveCamera(55,view.clientWidth/view.clientHeight,0.05,2000);
persp.position.set(8,9,10);
// 평행 투영 (스케치업 Camera▸Parallel Projection) — 같은 위치·방향의 직교 카메라로 바꿔 끼운다
const orthoCam=new THREE.OrthographicCamera(-10,10,10,-10,-2000,2000);
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
  mode:'orbit', lightsOn:true, night:false, sky:'sky', ffOn:false,   // 2026-09-07 프리폼   // 2026-09-07 배경: 하늘·바닥 / 단색 / 그림
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

// ===========================================================================
// 단독 프리폼 = 스케치업 100% (2026-09-08 대표 지시 "여기는 100% 스케치업과 동일하게 만들어라")
//  · 셸: 메뉴(파일·편집·보기·카메라·그리기·도구·창·도움말)·큰 도구 세트·단축키표를 스케치업 그대로
//  · 도구: 다각형·회전 사각형·프리핸드·3점 호·파이·팔로우 미·각도기·축·3D 문자·단면·줌 창·
//          카메라 위치·둘러보기·걷기 + 매스 배율·그룹/컴포넌트(G)·분해·정의 갱신·솔리드 도구
//  · 표시: 면 스타일 5종·모서리·안개·숨은 형상·안내선·단면 자르기 · 단위 · OBJ/STL 내보내기
//  모든 편집은 종전 그대로 emitEdit → ffApply(로컬) 한 길로만 간다.
// ===========================================================================
Object.assign(ST,{units:'mm',polySides:6,circleSides:24,defZ:2400,gridMM:10,
  faceStyle:'textured',edges:false,fogOn:false,hiddenGeom:false,guidesOn:true,
  sections:[],sectionsOn:true,sectionCut:true,axesO:{x:0,y:0,ang:0},userTags:[],sunMonth:5,sunLight:0.6,sunDark:0.2,isolate:null,anim:null,faceInfo:null,editMass:null,parts:[]});
renderer.localClippingEnabled=true;
const FF_OPS=new Set(['rotrect','freehand','arc3','pie','protractor','axesop','poscam','followme','scale3']);
// --- 글로우 (2026-09-09 대표 지시 "스냅 표시 점과 선이 너무 두껍고 크다 — 글로우 효과로") ---
//  스냅 표시·시작점·스케치 점 = 화면 크기 고정 발광 스프라이트, 스케치 선 = 1px 코어 + 얇은 발광 헤일로
let _glowTexC=null;
function _glowTex(){ if(_glowTexC) return _glowTexC; const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); const g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.16,'rgba(255,255,255,0.98)'); g.addColorStop(0.3,'rgba(255,255,255,0.32)'); g.addColorStop(0.55,'rgba(255,255,255,0.08)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); _glowTexC=new THREE.CanvasTexture(c); _glowTexC.colorSpace=THREE.SRGBColorSpace; return _glowTexC; }
function _pxScale(px){ const h=Math.max(1,renderer.domElement.clientHeight); const f=(camera&&camera.isPerspectiveCamera)?2*Math.tan(camera.fov*Math.PI/360):2; return px*f/h; }
function glowSprite(color,px){ const m=new THREE.SpriteMaterial({map:_glowTex(),color:color||0xD4FF3D,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:false}); const s=new THREE.Sprite(m); s.scale.setScalar(_pxScale(px||14)); s.renderOrder=1000; s.userData.px=px||14; return s; }
function _glowResize(){ scene.traverse(o=>{ if(o.isSprite&&o.userData.px) o.scale.setScalar(_pxScale(o.userData.px)); }); }
function _mkStart(){ if(FF_STANDALONE) return glowSprite(0xD4FF3D,10); const m=_mkStart(); return m; }
// 발광 헤일로 재질 (스케치 선·점)
const _haloCache=new Map();
let _pickMatC=null; function _pickMat(){ if(!_pickMatC){ _pickMatC=new THREE.MeshBasicMaterial({visible:false}); } return _pickMatC; }
function haloMat(color){ const k=String(color); let m=_haloCache.get(k); if(m) return m; m=new THREE.MeshBasicMaterial({color:new THREE.Color(color),transparent:true,opacity:0.2,blending:THREE.AdditiveBlending,depthWrite:false}); _haloCache.set(k,m); return m; }
const FF_CURSOR={polygon:'crosshair',rotrect:'crosshair',freehand:'crosshair',arc3:'crosshair',pie:'crosshair',followme:'copy',protractor:'crosshair',axes:'crosshair',text3d:'text',section:'crosshair',zoomwin:'zoom-in',poscam:'crosshair',lookaround:'grab',walk:'grab',mkcomp:'default',fit:'default',prevview:'default'};
const FF_STATUS={polygon:'⬡ 다각형',rotrect:'▱ 회전 사각형',freehand:'〰 프리핸드',arc3:'◠ 3점 호',pie:'◔ 파이',followme:'⌐ 팔로우 미',protractor:'∠ 각도기',axes:'⊹ 축',text3d:'𝟯 3D 문자',section:'▥ 단면',zoomwin:'⛶ 줌 창',poscam:'📍 카메라 위치',lookaround:'👁 둘러보기',walk:'🚶 걷기'};
// 강사 — 단독 프리폼 문구 (벽·평면·견적 이야기가 없다)
const FF_HINT={
  select:'<b>선택</b> — <b>클릭=꼭짓점·모서리·면 하나</b> · <b>더블클릭=객체 전체</b> · 트리플=연결된 전체 · Shift/Ctrl+클릭=추가/제거 · 끌기=선택 상자(←=걸치기) · 요소: M 이동·P 밀기·F 오프셋·B 페인트·Del 삭제 · 그룹(gid)은 클릭=전체·더블클릭=안으로 · 끌기=이동 · Ctrl+끌기=복사 · <b>파란 꼭짓점: 끌기=높이 · Alt+끌기=xy 이동 · Shift=모서리</b> · Del · 우클릭=메뉴',
  move:'<b>이동</b> — 클릭-이동-클릭 · <b>Ctrl=복사</b>(뒤에 x3 · /3 = 배열) · ←→=빨강/초록 축 · <b>↑=파랑(높이)</b> · Shift=방향 고정 · <b>숫자=거리</b> · Esc 취소',
  rotate:'<b>회전</b> — 객체 클릭 → 각도기: 기준 방향 → 각도 · <b>세워진 면을 클릭하면 그 면의 법선이 축</b> · <b>Ctrl=복사</b>(뒤에 x3=방사 배열) · 15° 스냅(Shift=자유) · <b>숫자=각도</b>',
  scale:'<b>배율</b> — 매스를 고르면 <b>그립</b>: 초록 모서리=균등 · 빨강/파랑 면=한 축 · <b>Ctrl=중심 기준</b> · <b>숫자=배율</b>(1.5) 또는 <b>치수</b>(1500mm) · 가로,세로,높이',
  pushpull:'<b>밀기끌기</b> — <b>매스의 어느 면이든</b> 법선으로 밀면 매스가 늘고 줄어듭니다 · <b>Ctrl=면을 두고 새 매스 뽑기</b> · 바닥 면=위로(매스) · 벽면 위의 면=뽑기/안으로 밀면 파내기 · <b>숫자=mm</b>(−=안으로) · 더블클릭=직전 값',
  line:'<b>선</b> — 클릭-클릭 사슬 · <b>어느 점이든 이어집니다</b>(높이가 달라도 — 작업 평면이 <b>자동</b>일 때) · <b>위로 끌면 파랑(Z) 축</b>(숫자=높이, ↑=고정) · <b>고리가 닫히면 면</b> · <b>매스 면 위에 모서리에서 모서리로 그으면 면이 나뉜다</b>(나뉜 면은 각각 밀기끌기) · 벽면을 클릭하면 그 면이 종이 · Shift=방향 고정 · ←→↑=축 고정 · 숫자=길이 · [x,y] 절대 · &lt;dx,dy&gt; 상대 · Esc/더블클릭=끝',
  rect:'<b>사각형</b> — 두 모서리 클릭 → <b>바로 높이</b>(위로 끌어 3번째 클릭 또는 숫자) = 상자 · 벽면 위도 됨 · <b>W=작업 평면</b>(바닥·정면·측면 — 자라는 축이 바뀐다) · <b>가로,세로</b> 입력 · Esc=면만',
  rotrect:'<b>회전 사각형</b> — 첫 변 두 점 클릭 → 폭 클릭 · 숫자=길이·폭',
  circle:'<b>원</b> — 중심 클릭 → 반지름 · <b>숫자=반지름</b> · <b>24s=변 수</b>',
  polygon:'<b>다각형</b> — 중심 클릭 → 반지름 · <b>6s=변 수</b>(기본 6) · 숫자=반지름',
  arc:'<b>2점 호</b> — 시작 · 끝 · 불룩한 정도 · 숫자=불룩',
  arc3:'<b>3점 호</b> — 시작 · 호 위의 점 · 끝',
  pie:'<b>파이</b> — 중심 · 시작(반지름) · 끝(각도) = 부채꼴 면 · 숫자=각도',
  freehand:'<b>프리핸드</b> — 누른 채 끌어서 그리기 · 시작점으로 돌아오면 면',
  offset:'<b>오프셋</b> — 바닥 면·<b>매스의 면·벽면 위의 면</b> 클릭 후 안/밖 · <b>숫자=거리</b> · 결과는 그 면 위의 새 면 (P 로 뽑기/파내기)',
  followme:'<b>팔로우 미</b> — ① 단면(벽면 위에 그린 면) 클릭 → ② 경로가 될 매스 클릭 (윗면=위 둘레 · 옆면=바닥 둘레). 몰딩·난간·프레임',
  paint:'<b>페인트</b> — 트레이에서 색상·이미지·마감 고르고 클릭=매스 전체 · <b>Ctrl+클릭=그 면만</b> · <b>Shift+클릭=같은 재질 전부 교체</b> · Alt+클릭=재질 추출 · ＋ 이미지로 재질 만들기',
  erase:'<b>지우개</b> — 클릭/끌기=삭제 · Shift+클릭=숨기기',
  tape:'<b>줄자</b> — 두 점=거리 · <b>선에서 시작=평행 안내선</b>(숫자=간격) · Shift=두 점 안내선 · <b>Ctrl+클릭=안내점</b> · 각도기=각도 안내선 · 재고 나서 <b>숫자 입력=모델 전체 크기 조정</b>',
  protractor:'<b>각도기</b> — 중심 · 기준 방향 · 각도 = 각도 안내선 · 숫자=각도',
  axes:'<b>축</b> — 원점 클릭 → X(빨강) 방향 클릭 · 절대좌표 [x,y]·원점 스냅이 새 축 기준',
  dim:'<b>치수</b> — 두 점 클릭',
  text:'<b>문자</b> — 클릭한 곳에 메모',
  text3d:'<b>3D 문자</b> — 놓을 자리 클릭 → 글자·높이·두께 입력 → 입체 글자(그룹)',
  section:'<b>단면</b> — 면 클릭=그 면에 단면 · <b>숫자=안쪽으로 밀기</b> · 보기▸단면/단면 자르기 · 편집▸단면 모두 삭제',
  orbit:'<b>궤도</b> — 끌어서 회전 · Shift=팬 (휠 버튼 드래그와 같음)',
  pan:'<b>팬</b> — 끌어서 화면 이동',
  zoom:'<b>줌</b> — 위아래로 끌기 · 휠 · Shift+Z=전체',
  zoomwin:'<b>줌 창</b> — 끌어서 상자 = 그 영역을 화면 가득',
  poscam:'<b>카메라 위치</b> — 바닥 클릭=그 자리 눈높이(1.6m) · 끌면 보는 방향 → 둘러보기',
  lookaround:'<b>둘러보기</b> — 제자리에서 끌어 고개 돌리기 · 1=조감 복귀',
  walk:'<b>걷기</b> — W A S D · Q/E 위아래 · Shift=빨리 · 끌기=고개 돌리기 · 1=조감',
  add:'<b>구성요소 배치</b> — 골라서 바닥 클릭 · R=회전 · Esc=끝',
};
function fmtLen(mm){ const u=ST.units; if(u==='cm') return (mm/10).toFixed(1)+' cm'; if(u==='m') return (mm/1000).toFixed(3)+' m'; if(u==='in') return (mm/25.4).toFixed(2)+' in'; return Math.round(mm)+' mm'; }
// 새 축(원점·방향) 기준 절대좌표 → 세계 평면 좌표
function axAbs(x,y){ const a=ST.axesO, r=a.ang*Math.PI/180, c=Math.cos(r), s=Math.sin(r); return {x:Math.round(a.x+x*c-y*s),y:Math.round(a.y+x*s+y*c)}; }
function _ffLine(n,color){ const geo=new THREE.BufferGeometry().setFromPoints(new Array(n).fill(0).map(()=>new THREE.Vector3())); const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:color||0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln); return ln; }
function _ffMark(p,z0){ const m=_mkStart(); m.renderOrder=1000; m.position.set(p.x*MM,(z0||0)+0.03,p.y*MM); scene.add(m); return m; }
function _ffSetLine(ln,pts,z0){ const pos=ln.geometry.attributes.position; const n=pos.count; for(let i=0;i<n;i++){ const p=pts[Math.min(i,pts.length-1)]; pos.setXYZ(i,p.x*MM,(z0||0)+0.02,p.y*MM); } pos.needsUpdate=true; }
function _ffStart(e){ const fid=_hoverFloorId(e); const raw=_planePt(e,0); if(!raw) return null; const p=snap3(fid,raw,0); showSnap(p,0); return {fid,p}; }
function _ffSnapAt(e,fid,extra){ const raw=_planePt(e,0); if(!raw) return null; const s=snap3(fid,raw,0,extra); showSnap(s,0); return s; }
function _rdp(pts,tol){ if(pts.length<3) return pts.slice(); let dm=0,idx=0; const a=pts[0],b=pts[pts.length-1]; const L=Math.hypot(b.x-a.x,b.y-a.y)||1e-9;
  for(let i=1;i<pts.length-1;i++){ const p=pts[i]; const d=Math.abs((b.x-a.x)*(a.y-p.y)-(a.x-p.x)*(b.y-a.y))/L; if(d>dm){dm=d;idx=i;} }
  if(dm>tol){ const l=_rdp(pts.slice(0,idx+1),tol), r=_rdp(pts.slice(idx),tol); return l.slice(0,-1).concat(r); } return [a,b]; }
// 닫힌 고리 단순화 — 시작점에서 가장 먼 점으로 두 토막 내어 각각 RDP (시작=끝인 고리를 그대로 넣으면 선 하나로 뭉개진다)
function _rdpRing(ring,tol){ if(ring.length<4) return ring.slice(); const a=ring[0]; let k=1,dm=-1; for(let i=1;i<ring.length;i++){ const d=Math.hypot(ring[i].x-a.x,ring[i].y-a.y); if(d>dm){dm=d;k=i;} }
  const l=_rdp(ring.slice(0,k+1),tol), r=_rdp(ring.slice(k).concat([a]),tol); return l.slice(0,-1).concat(r.slice(0,-1)); }
// --- 회전 사각형 (Rotated Rectangle) — 첫 변 두 점 → 폭 ---
function rotrectClick(e){
  const op=ST.op;
  if(op&&op.type==='rotrect'){
    if(op.stage===1){ const ex=vcbTyped(); if(ex&&op.dir){ op.cur={x:Math.round(op.a.x+op.dir.x*ex),y:Math.round(op.a.y+op.dir.y*ex)}; } if(Math.hypot(op.cur.x-op.a.x,op.cur.y-op.a.y)<100){ setStatus(statusLive,'첫 변이 너무 짧습니다 (100mm+)'); return; } op.b=op.cur; op.stage=2; vcbShow('폭','','mm'); return; }
    commitRotrect(vcbTyped()); return;
  }
  const s=_ffStart(e); if(!s) return;
  ST.op={type:'rotrect',fid:s.fid,a:s.p,b:null,cur:s.p,w:0,dir:null,stage:1,line:_ffLine(5),startMk:_ffMark(s.p,0)};
  opOrbit(true); vcbShow('길이 (첫 변)','','mm'); invalidate();
}
function rotrectMove(e){
  const op=ST.op; const sp=_ffSnapAt(e,op.fid,[op.a]); if(!sp) return;
  if(op.stage===1){ op.cur=sp; const L=Math.hypot(sp.x-op.a.x,sp.y-op.a.y); if(L>1) op.dir={x:(sp.x-op.a.x)/L,y:(sp.y-op.a.y)/L}; _ffSetLine(op.line,[op.a,sp],0); vcbShow('길이',Math.round(L),'mm'); }
  else{ const a=op.a,b=op.b,L=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L; op.w=Math.round(((sp.x-b.x)*nx+(sp.y-b.y)*ny)/10)*10; const poly=_rotrectPoly(op); _ffSetLine(op.line,poly.concat([poly[0]]),0); vcbShow('폭',Math.abs(op.w),'mm'); }
  invalidate();
}
function _rotrectPoly(op,w){ const a=op.a,b=op.b,L=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L; const W=w!=null?w:op.w; return [a,b,{x:Math.round(b.x+nx*W),y:Math.round(b.y+ny*W)},{x:Math.round(a.x+nx*W),y:Math.round(a.y+ny*W)}]; }
function commitRotrect(exact){
  const op=ST.op; if(!op||op.type!=='rotrect'||op.stage<2) return;
  let w=(exact!=null&&exact!==0)?Math.round(exact)*(op.w<0?-1:1):op.w;
  if(Math.abs(w)<100){ setStatus(statusLive,'폭 100mm+ (숫자 입력 가능)'); return; }
  const poly=_rotrectPoly(op,w), fid=op.fid;
  spawnPendingFace(poly,0); cancelOp();
  emitEdit({type:'edit',op:'sketchpoly',floorId:fid,patch:{pts:poly}});
  setStatus(statusLive,'▱ 회전 사각형 → 면 — P 로 밀면 입체');
  ffAutoExtrude(FF.free);
}
// --- 프리핸드 (Freehand) — 누른 채 끌기 ---
function freehandDown(e){
  if(ST.ffOn){ const fp=_ffFacePick(e); if(fp){ const fr=_ffFrameFor(fp.o,fp.n); const uv=_ff3UV(e,fr); if(!uv) return; ST.op={type:'freehand',fr,pts:[{x:uv.u,y:uv.v}],line:_ffLine(2)}; opOrbit(true); vcbShow('면 위 프리핸드','',''); return; } }
  const s=_ffStart(e); if(!s) return; ST.op={type:'freehand',fid:s.fid,pts:[s.p],line:_ffLine(2)}; opOrbit(true); vcbShow('프리핸드 — 끌어서 그리기','',''); }
function freehandMove(e){
  const op=ST.op; if(!op||op.type!=='freehand') return;
  let raw; if(op.fr){ const uv=_ff3UV(e,op.fr); if(!uv) return; raw={x:uv.u,y:uv.v}; } else { raw=_planePt(e,0); if(!raw) return; }
  const last=op.pts[op.pts.length-1]; if(Math.hypot(raw.x-last.x,raw.y-last.y)<20) return;
  op.pts.push({x:Math.round(raw.x),y:Math.round(raw.y)});
  op.line.geometry.dispose(); op.line.geometry=new THREE.BufferGeometry().setFromPoints(op.pts.map(p=>{ if(op.fr){ const w=planePt(op.fr,p.x,p.y); return new THREE.Vector3(w.x*MM,w.z*MM,w.y*MM); } return new THREE.Vector3(p.x*MM,0.02,p.y*MM); }));
  invalidate();
}
function freehandEnd(){
  const op=ST.op; if(!op||op.type!=='freehand') return;
  const fid=op.fid||'freeform'; const raw=op.pts.slice(); const plane=op.fr?{origin:op.fr.origin,ex:op.fr.ex,ey:op.fr.ey,n:op.fr.n}:undefined;
  cancelOp();
  if(raw.length<2){ setStatus(statusLive,'프리핸드: 너무 짧습니다'); return; }
  const f=raw[0],l=raw[raw.length-1];
  const closed=raw.length>=4&&Math.hypot(f.x-l.x,f.y-l.y)<=150;
  let pts;
  if(closed){ const ring=(Math.hypot(f.x-l.x,f.y-l.y)<=30)?raw.slice(0,-1):raw; pts=_rdpRing(ring,25);
    if(pts.length>=3){ if(!plane) spawnPendingFace(pts,0); emitEdit({type:'edit',op:'sketchpoly',floorId:fid,patch:{pts,plane}}); setStatus(statusLive,'〰 프리핸드 → 면 ('+pts.length+'점)'); return; } }
  pts=_rdp(raw,25);
  const ops=[]; for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1]; if(Math.hypot(b.x-a.x,b.y-a.y)<10) continue; ops.push({op:'sketchline',floorId:fid,patch:{x1:a.x,y1:a.y,x2:b.x,y2:b.y,plane}}); }
  if(sendBatch(ops,'프리핸드')) setStatus(statusLive,'〰 프리핸드 → 선 '+ops.length+'조각 (Ctrl+Z 한 번)');
}
// --- 3점 호 (3 Point Arc) ---
function _circle3(a,p,b){ const ax=a.x,ay=a.y,bx=p.x,by=p.y,cx=b.x,cy=b.y; const d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by)); if(Math.abs(d)<1e-6) return null;
  const ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d, uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d; return {cx:ux,cy:uy,r:Math.hypot(ax-ux,ay-uy)}; }
function _arcThrough(a,p,b,n){ const c=_circle3(a,p,b); if(!c) return [a,b];
  const A=Math.atan2(a.y-c.cy,a.x-c.cx),P=Math.atan2(p.y-c.cy,p.x-c.cx),B=Math.atan2(b.y-c.cy,b.x-c.cx);
  const norm=x=>{ while(x<0) x+=2*Math.PI; return x; };
  let dB=norm(B-A), dP=norm(P-A); if(dP>dB){ dB=dB-2*Math.PI; }           // p 가 그 사이에 오도록 방향 결정
  const out=[]; for(let i=0;i<=n;i++){ const t=A+dB*i/n; out.push({x:Math.round(c.cx+c.r*Math.cos(t)),y:Math.round(c.cy+c.r*Math.sin(t))}); } return out; }
function arc3Click(e){
  const op=ST.op;
  if(op&&op.type==='arc3'){ if(op.stage===1){ op.p=op.cur; op.stage=2; vcbShow('끝점','',''); return; } commitArc3(); return; }
  const s=_ffStart(e); if(!s) return;
  ST.op={type:'arc3',fid:s.fid,a:s.p,p:null,cur:s.p,stage:1,line:_ffLine(33),startMk:_ffMark(s.p,0)};
  opOrbit(true); vcbShow('호 위의 점','',''); invalidate();
}
function arc3Move(e){ const op=ST.op; const sp=_ffSnapAt(e,op.fid,[op.a]); if(!sp) return; op.cur=sp;
  if(op.stage===1) _ffSetLine(op.line,[op.a,sp],0); else _ffSetLine(op.line,_arcThrough(op.a,op.p,sp,32),0); invalidate(); }
function commitArc3(){
  const op=ST.op; if(!op||op.type!=='arc3'||op.stage<2) return;
  const pts=_arcThrough(op.a,op.p,op.cur,ST.circleSides||24), fid=op.fid;
  if(pts.length<3){ setStatus(statusLive,'세 점이 한 줄 위에 있습니다'); return; }
  cancelOp(); _arcLines(pts,fid,'3점 호');
}
function _arcLines(pts,fid,label,extra){
  const ops=[]; for(let i=0;i<pts.length-1;i++){ const p=pts[i],q=pts[i+1]; if(Math.hypot(q.x-p.x,q.y-p.y)<10) continue; ops.push({op:'sketchline',floorId:fid,patch:{x1:p.x,y1:p.y,x2:q.x,y2:q.y}}); spawnPendingSketchLine(p,q,0); }
  (extra||[]).forEach(o=>ops.push(o));
  if(sendBatch(ops,label)) setStatus(statusLive,'◠ '+label+' → 선 '+ops.length+'조각 (고리가 닫히면 면 · Ctrl+Z 한 번)');
}
// --- 파이 (Pie) — 중심 · 시작 · 끝 = 부채꼴 면 ---
function pieClick(e){
  const op=ST.op;
  if(op&&op.type==='pie'){
    if(op.stage===1){ const ex=vcbTyped(); if(ex&&ex>0&&op.dir) op.cur={x:Math.round(op.c.x+op.dir.x*ex),y:Math.round(op.c.y+op.dir.y*ex)}; if(Math.hypot(op.cur.x-op.c.x,op.cur.y-op.c.y)<100){ setStatus(statusLive,'반지름 100mm+'); return; } op.a=op.cur; op.r=Math.hypot(op.a.x-op.c.x,op.a.y-op.c.y); op.a0=Math.atan2(op.a.y-op.c.y,op.a.x-op.c.x); op.sweep=0; op.prev=op.a0; op.stage=2; vcbShow('각도','','°'); return; }
    commitPie(vcbTyped()); return;
  }
  const s=_ffStart(e); if(!s) return;
  ST.op={type:'pie',fid:s.fid,c:s.p,a:null,cur:s.p,r:0,sweep:0,stage:1,line:_ffLine(40),startMk:_ffMark(s.p,0)};
  opOrbit(true); vcbShow('반지름','','mm'); invalidate();
}
function _piePts(op,sweepDeg){ const n=Math.max(4,Math.round(Math.abs(sweepDeg)/360*(ST.circleSides||24))); const out=[]; for(let i=0;i<=n;i++){ const t=op.a0+sweepDeg*Math.PI/180*i/n; out.push({x:Math.round(op.c.x+op.r*Math.cos(t)),y:Math.round(op.c.y+op.r*Math.sin(t))}); } return out; }
function pieMove(e){
  const op=ST.op; const sp=_ffSnapAt(e,op.fid,[op.c]); if(!sp) return; op.cur=sp;
  if(op.stage===1){ const L=Math.hypot(sp.x-op.c.x,sp.y-op.c.y); if(L>1) op.dir={x:(sp.x-op.c.x)/L,y:(sp.y-op.c.y)/L}; _ffSetLine(op.line,[op.c,sp],0); vcbShow('반지름',Math.round(L),'mm'); }
  else{ const ang=Math.atan2(sp.y-op.c.y,sp.x-op.c.x); let d=ang-op.prev; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; op.sweep+=d*180/Math.PI; op.prev=ang; op.sweep=Math.max(-359,Math.min(359,op.sweep));
    const sw=Math.round(op.sweep/5)*5||5; const pts=_piePts(op,sw); _ffSetLine(op.line,[op.c].concat(pts,[op.c]),0); vcbShow('각도',Math.round(sw),'°'); }
  invalidate();
}
function commitPie(exact){
  const op=ST.op; if(!op||op.type!=='pie'||op.stage<2) return;
  let sw=(exact!=null&&exact!==0)?exact:Math.round(op.sweep/5)*5;
  if(Math.abs(sw)<5){ setStatus(statusLive,'각도 5°+ (숫자 입력 가능)'); return; }
  const pts=_piePts(op,sw), fid=op.fid, c=op.c, b=pts[pts.length-1], a=pts[0];
  cancelOp();
  _arcLines(pts,fid,'파이',[{op:'sketchline',floorId:fid,patch:{x1:c.x,y1:c.y,x2:a.x,y2:a.y}},{op:'sketchline',floorId:fid,patch:{x1:b.x,y1:b.y,x2:c.x,y2:c.y}}]);
}
// --- 각도기 (Protractor) — 중심 · 기준 · 각도 = 각도 안내선 ---
function protractorClick(e){
  const op=ST.op;
  if(op&&op.type==='protractor'){
    if(op.stage===1){ op.ref=Math.atan2(op.cur.y-op.c.y,op.cur.x-op.c.x); op.stage=2; vcbShow('각도','','°'); return; }
    commitProtractor(vcbTyped()); return;
  }
  const s=_ffStart(e); if(!s) return;
  const pro=_protractor(s.p.x*MM,s.p.y*MM,0.03); scene.add(pro);
  ST.op={type:'protractor',fid:s.fid,c:s.p,cur:s.p,ref:null,ang:0,stage:1,line:_ffLine(2,0xE24CE2),protractor:pro,startMk:_ffMark(s.p,0)};
  opOrbit(true); vcbShow('기준 방향 클릭','',''); invalidate();
}
function protractorMove(e){ const op=ST.op; const sp=_ffSnapAt(e,op.fid,[op.c]); if(!sp) return; op.cur=sp;
  if(op.stage===1){ _ffSetLine(op.line,[op.c,sp],0); }
  else{ const a=Math.atan2(sp.y-op.c.y,sp.x-op.c.x); let d=(a-op.ref)*180/Math.PI; d=((d+180)%360+360)%360-180; if(!e.shiftKey) d=Math.round(d/15)*15; op.ang=d; const t=op.ref+d*Math.PI/180; _ffSetLine(op.line,[op.c,{x:op.c.x+Math.cos(t)*3000,y:op.c.y+Math.sin(t)*3000}],0); vcbShow('각도',Math.round(d),'°'); }
  invalidate(); }
function commitProtractor(exact){
  const op=ST.op; if(!op||op.type!=='protractor'||op.stage<2) return;
  const d=(exact!=null)?exact:op.ang; const t=op.ref+d*Math.PI/180; const c=op.c, fid=op.fid;
  cancelOp();
  addGuide(fid,c,{x:c.x+Math.cos(t)*1000,y:c.y+Math.sin(t)*1000},0);
  setStatus(statusLive,'∠ 각도 안내선 '+Math.round(d)+'° (편집▸안내선 모두 삭제)');
}
// --- 축 (Axes) — 원점 · X 방향 ---
function axesClick(e){
  const op=ST.op;
  if(op&&op.type==='axesop'){ const a=Math.atan2(op.cur.y-op.c.y,op.cur.x-op.c.x)*180/Math.PI; setAxesOrigin(op.c.x,op.c.y,Math.round(a)); cancelOp(); return; }
  const s=_ffStart(e); if(!s) return;
  ST.op={type:'axesop',fid:s.fid,c:s.p,cur:s.p,line:_ffLine(2,0xE24C4C),startMk:_ffMark(s.p,0)};
  opOrbit(true); vcbShow('X(빨강) 방향 클릭','',''); invalidate();
}
function axesMove(e){ const op=ST.op; const sp=_ffSnapAt(e,op.fid,[op.c]); if(!sp) return; op.cur=sp; _ffSetLine(op.line,[op.c,sp],0); invalidate(); }
function setAxesOrigin(x,y,ang){ ST.axesO={x:Math.round(x),y:Math.round(y),ang:ang||0}; buildAxes(); invalidate(); setStatus(statusLive,'⊹ 축 원점 ('+ST.axesO.x+', '+ST.axesO.y+') · X 방향 '+ST.axesO.ang+'° — 우클릭 빈 곳▸축 초기화'); }
// --- 줌 창 (Zoom Window) ---
function zoomWindow(x0,y0,x1,y1){
  const r=renderer.domElement.getBoundingClientRect();
  const fx=Math.abs(x1-x0)/r.width, fy=Math.abs(y1-y0)/r.height, f=Math.max(0.02,Math.max(fx,fy));
  const cx=(x0+x1)/2, cy=(y0+y1)/2;
  const hit=hitAt(cx,cy); let T;
  if(hit) T=hit.point.clone(); else { const p=_planePt({clientX:cx,clientY:cy},0); if(!p) return; T=new THREE.Vector3(p.x*MM,0,p.y*MM); }
  camPush();
  const dir=camera.position.clone().sub(orbit.target).normalize();
  const d=camera.position.distanceTo(orbit.target)*f;
  orbit.target.copy(T); camera.position.copy(T).addScaledVector(dir,Math.max(0.3,d));
  if(ST.ortho){ orthoCam.zoom=orthoCam.zoom/f; orthoCam.updateProjectionMatrix(); }
  orbit.update(); invalidate(); camPush();
}
// --- 카메라 위치 (Position Camera) · 둘러보기 · 걷기 ---
function poscamDown(e){ const raw=_planePt(e,0); if(!raw) return; ST.op={type:'poscam',a:{x:Math.round(raw.x),y:Math.round(raw.y)},cur:null,line:_ffLine(2,0x7FA8D4),startMk:_ffMark(raw,0)}; opOrbit(true); vcbShow('보는 방향으로 끌기 (눈높이)',ST.walk.eye*1000,'mm'); }
function poscamMove(e){ const op=ST.op; const raw=_planePt(e,0); if(!raw) return; op.cur={x:raw.x,y:raw.y}; _ffSetLine(op.line,[op.a,op.cur],0); invalidate(); }
function poscamEnd(){
  const op=ST.op; if(!op||op.type!=='poscam') return;
  const a=op.a, cur=op.cur; const ex=vcbTyped(); if(ex&&ex>200) ST.walk.eye=ex/1000;
  cancelOp();
  setMode('walk');
  camera.position.set(a.x*MM,ST.walk.eye,a.y*MM);
  if(cur&&Math.hypot(cur.x-a.x,cur.y-a.y)>100){ ST.walk.yaw=Math.atan2(-(cur.x-a.x),-(cur.y-a.y)); ST.walk.pitch=0; }
  applyWalkCamera();
  setTool('lookaround');
  setStatus(statusLive,'📍 카메라 위치 ('+a.x+', '+a.y+') 눈높이 '+Math.round(ST.walk.eye*1000)+'mm — 끌어서 둘러보기 · 1=조감');
}
// --- 단면 (Section Plane) — 면 클릭 = 그 면에 단면 · 숫자 = 안쪽으로 밀기 ---
function sectionClick(hit){
  if(!hit||!hit.face){ setStatus(statusLive,'단면: 면을 클릭하세요 (바닥·벽·매스 어느 면이든)'); return; }
  const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  const p=hit.point.clone();
  const id='sec_'+Date.now();
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(n.clone().negate(),p);
  const b=ST.built?ST.built.bounds:{minX:-5000,maxX:5000,minY:-5000,maxY:5000};
  const S=Math.max(b.maxX-b.minX,b.maxY-b.minY,4000)*MM*1.2+1;
  const q=new THREE.Mesh(new THREE.PlaneGeometry(S,S),new THREE.MeshBasicMaterial({color:0xE2725B,transparent:true,opacity:0.10,side:THREE.DoubleSide,depthWrite:false}));
  q.position.copy(p); q.lookAt(p.clone().add(n)); q.renderOrder=996; q.name='section';
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(q.geometry),new THREE.LineBasicMaterial({color:0xE2725B,depthTest:false})); q.add(edge);
  scene.add(q);
  const sec={id,p,n,plane,mesh:q,off:0};
  ST.sections.push(sec); ST.sectionsOn=true; ST.sectionCut=true; applySections(); refreshStylePanel(); renderSections(); openTraySec('sections');
  setLast('단면 밀기','mm',raw=>{ const v=parseLen(raw); if(v==null) return false; sectionOffset(sec,v); return true; },{noUndo:true});
  setStatus(statusLive,'▥ 단면 — 숫자 입력=안쪽으로 밀기(mm) · 보기▸단면 자르기 · 편집▸단면 모두 삭제');
}
function sectionOffset(sec,v){ sec.off=v; const pp=sec.p.clone().addScaledVector(sec.n,-v*MM); sec.plane.setFromNormalAndCoplanarPoint(sec.n.clone().negate(),pp); sec.mesh.position.copy(pp); applySections(); setStatus(statusLive,'▥ 단면 밀기 '+Math.round(v)+'mm'); }
function applySections(){
  const planes=(ST.sectionCut&&ST.sections.length)?ST.sections.filter(s=>s.active!==false).map(s=>s.plane):[];
  const seen=new Set();
  ST.root&&ST.root.traverse(o=>{ if(!o.isMesh||!o.material) return; const m=o.material; if(seen.has(m)) return; seen.add(m); m.clippingPlanes=planes.length?planes:null; m.clipShadows=planes.length>0; m.needsUpdate=true; });
  ST.sections.forEach(s=>{ s.mesh.visible=ST.sectionsOn; });
  invalidate(true);
}
function clearSections(){ ST.sections.forEach(s=>{ scene.remove(s.mesh); }); ST.sections=[]; applySections(); renderSections(); setStatus(statusLive,'단면 모두 삭제'); }
// --- 팔로우 미 (Follow Me) — 단면(수직 면 위의 면) → 경로(매스 둘레) ---
function followClick(hit){
  const obj=hit&&hit.object.userData.obj;
  if(!ST.op||ST.op.type!=='followme'){
    if(!obj||obj.kind!=='sketchFace'||!obj.meta||!obj.meta.plane||!ffEditable(obj)){ setStatus(statusLive,'⌐ 팔로우 미: ① 먼저 단면이 될 면(벽면 위에 그린 면)을 클릭'); return; }
    const g=hit.object.parent; _hl(g,true);
    ST.op={type:'followme',prof:obj,g,stage:1}; opOrbit(true); vcbShow('② 경로: 매스 클릭 (윗면=위 둘레 · 옆면=바닥 둘레)','','');
    setStatus(statusLive,'⌐ 단면 잡음 — 이제 경로가 될 매스를 클릭 (윗면 클릭=위 둘레 · 옆면=바닥 둘레)'); return;
  }
  const op=ST.op;
  if(!obj||obj.kind!=='mass'||!ffEditable(obj)){ setStatus(statusLive,'⌐ 경로는 프리폼 매스 (Esc=취소)'); return; }
  const m=FF.free.masses.find(x=>x.id===obj.id); if(!m){ setStatus(statusLive,'매스를 찾지 못했습니다'); return; }
  const nW=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  const top=nW.y>0.7;
  const el=Math.round(Number(m.elev_mm)||0);
  const ctx=ffCtx();
  if(top&&!massIsPrism(m)){ setStatus(statusLive,'위 둘레는 윗면이 평평한 매스만 — 옆면을 클릭하면 바닥 둘레'); return; }
  const base=top?el+Math.round(zNum(m.h_mm,ctx)):el;
  const path=massAbsPoly(m);
  const pl=op.prof.meta.plane, uv=op.prof.meta.poly;
  // 단면 평면과 수직인 경로 변 중 가장 가까운 것 = 기준 변
  const nxy={x:pl.n.x,y:pl.n.y}; const nl=Math.hypot(nxy.x,nxy.y);
  if(nl<0.5){ setStatus(statusLive,'단면은 세워진 면(벽면 위)이어야 합니다'); return; }
  nxy.x/=nl; nxy.y/=nl;
  const c2=uv.reduce((a,p)=>({x:a.x+p.x/uv.length,y:a.y+p.y/uv.length}),{x:0,y:0});
  const pc=planePt(pl,c2.x,c2.y);
  let best=null;
  const N=path.length;
  for(let i=0;i<N;i++){ const a=path[i],b=path[(i+1)%N]; const L=Math.hypot(b.x-a.x,b.y-a.y)||1; const d={x:(b.x-a.x)/L,y:(b.y-a.y)/L};
    if(Math.abs(d.x*nxy.x+d.y*nxy.y)<0.7) continue;
    const q=closestOnSeg({x:pc.x,y:pc.y},{x1:a.x,y1:a.y,x2:b.x,y2:b.y}); const dd=Math.hypot(q.x-pc.x,q.y-pc.y);
    if(!best||dd<best.dd) best={i,a,b,d,dd}; }
  if(!best){ setStatus(statusLive,'단면 면이 경로 변과 수직이 아닙니다 — 벽의 끝면(짧은 면)에 단면을 그리세요'); return; }
  const sign=_pathOutSign(path,true); const out={x:best.d.y*sign,y:-best.d.x*sign};
  const prof=uv.map(p=>{ const P=planePt(pl,p.x,p.y); const t=(P.x-best.a.x)*best.d.x+(P.y-best.a.y)*best.d.y; const Q={x:best.a.x+best.d.x*t,y:best.a.y+best.d.y*t};
    return {u:Math.round((P.x-Q.x)*out.x+(P.y-Q.y)*out.y),v:Math.round(P.z-base)}; });
  const g=op.g; _hl(g,false); cancelOp();
  emitEdit({type:'edit',op:'sweep',floorId:'freeform',patch:{pts:path,closed:true,z:base,profile:prof,faceId:op.prof.id,name:'팔로우미',color:m.color}});
}
// --- 3D 문자 (3D Text) — 글자를 래스터 → 윤곽 → 열쇠구멍 다각형 → 매스(그룹) ---
function text3dClick(e){
  const raw=_planePt(e,0); if(!raw) return;
  const txt=window.prompt('3D 문자 — 내용','ECOREAN'); if(!txt) return;
  const spec=window.prompt('높이, 두께 (mm)',(ST.t3H||300)+', '+(ST.t3D||50)); if(spec==null) return;
  const mm=spec.match(/(\d+)\D+(\d+)/); const H=mm?+mm[1]:(ST.t3H||300), D=mm?+mm[2]:(ST.t3D||50);
  ST.t3H=H; ST.t3D=D;
  const polys=text3dPolys(txt,H);
  if(!polys.length){ setStatus(statusLive,'글자 윤곽을 못 만들었습니다'); return; }
  const gid='g_'+Date.now()+'_'+Math.floor(Math.random()*1e4);
  const ops=polys.map((poly,i)=>({op:'massfrompoly',floorId:'freeform',patch:{pts:poly.map(p=>({x:Math.round(raw.x+p.x),y:Math.round(raw.y+p.y)})),z:D,name:'3D문자 '+txt.slice(0,12)+(polys.length>1?' #'+(i+1):''),gid,color:'#E8E4DA'}}));
  if(sendBatch(ops,'3D 문자')) setStatus(statusLive,'𝟯 3D 문자 "'+txt+'" — 높이 '+H+' · 두께 '+D+' ('+polys.length+'조각, 한 그룹)');
}
function text3dPolys(text,H){
  const px=96; const cv=document.createElement('canvas'); const cx=cv.getContext('2d');
  cx.font='bold '+px+'px "Noto Sans KR","Inter",sans-serif';
  const w=Math.ceil(cx.measureText(text).width)+16, h=Math.ceil(px*1.5)+8;
  cv.width=w; cv.height=h; cx.font='bold '+px+'px "Noto Sans KR","Inter",sans-serif'; cx.fillStyle='#fff'; cx.textBaseline='alphabetic'; cx.fillText(text,8,px*1.15);
  const d=cx.getImageData(0,0,w,h).data;
  const F=(x,y)=>(x>=0&&y>=0&&x<w&&y<h)&&d[(y*w+x)*4+3]>110;
  // 경계 변 — 채워진 픽셀의 채워지지 않은 이웃 쪽 변, 채워진 쪽이 왼쪽에 오게 방향 잡기
  const key=(x,y)=>x+','+y; const nxt=new Map();
  const add=(x1,y1,x2,y2)=>{ const k=key(x1,y1); if(!nxt.has(k)) nxt.set(k,[]); nxt.get(k).push([x2,y2]); };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(!F(x,y)) continue;
    if(!F(x,y-1)) add(x,y,x+1,y);           // 위 변 → 오른쪽으로
    if(!F(x+1,y)) add(x+1,y,x+1,y+1);       // 오른 변 → 아래로
    if(!F(x,y+1)) add(x+1,y+1,x,y+1);       // 아래 변 → 왼쪽으로
    if(!F(x-1,y)) add(x,y+1,x,y);           // 왼 변 → 위로
  }
  const loops=[];
  const used=new Set();
  for(const [k0,arr] of nxt){ for(let s=0;s<arr.length;s++){ const ek=k0+'>'+arr[s].join(','); if(used.has(ek)) continue;
    const loop=[]; let cur=k0.split(',').map(Number), to=arr[s]; used.add(ek); loop.push({x:cur[0],y:cur[1]});
    let guard=0;
    while(guard++<200000){ cur=to; const c=nxt.get(key(cur[0],cur[1])); if(!c) break; let pick=null; for(const t of c){ const kk=key(cur[0],cur[1])+'>'+t.join(','); if(!used.has(kk)){ pick=t; used.add(kk); break; } } loop.push({x:cur[0],y:cur[1]}); if(!pick) break; to=pick; if(key(to[0],to[1])===k0) break; }
    if(loop.length>=4) loops.push(loop); } }
  const s=H/px;
  const simp=loops.map(l=>_rdpRing(l,0.8)).filter(l=>l.length>=3).map(l=>l.map(p=>({x:p.x*s,y:(p.y-px*1.15)*s})));
  const area=poly=>{ let a=0; for(let i=0;i<poly.length;i++){ const p=poly[i],q=poly[(i+1)%poly.length]; a+=p.x*q.y-q.x*p.y; } return a/2; };
  const inside=(pt,poly)=>{ let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const a=poly[i],b=poly[j]; if(((a.y>pt.y)!==(b.y>pt.y))&&(pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y)+a.x)) c=!c; } return c; };
  const info=simp.map((poly,i)=>{ const par=[]; simp.forEach((o,j)=>{ if(i!==j&&Math.abs(area(o))>Math.abs(area(poly))&&inside(poly[0],o)) par.push(j); }); return {poly,depth:par.length,parent:par.length?par.reduce((a,b)=>Math.abs(area(simp[a]))<Math.abs(area(simp[b]))?a:b):-1}; });
  const outs=[];
  info.forEach((it,i)=>{ if(it.depth%2===0){ let poly=it.poly.slice(); if(area(poly)<0) poly.reverse(); outs.push({i,poly,holes:[]}); } });
  info.forEach((it,i)=>{ if(it.depth%2===1){ const o=outs.find(x=>x.i===it.parent); if(o){ let hp=it.poly.slice(); if(area(hp)>0) hp.reverse(); o.holes.push(hp); } } });
  return outs.map(o=>_keyhole(o.poly,o.holes)).filter(p=>p.length>=3&&Math.abs(area(p))>H*H*0.002);
}
function _keyhole(outer,holes){
  let poly=outer.slice();
  for(const hraw of holes){
    let bi=0,bj=0,bd=Infinity;
    for(let i=0;i<poly.length;i++) for(let j=0;j<hraw.length;j++){ const d=Math.hypot(poly[i].x-hraw[j].x,poly[i].y-hraw[j].y); if(d<bd){ bd=d; bi=i; bj=j; } }
    const h=hraw.slice(bj).concat(hraw.slice(0,bj));
    const P=poly[bi], Q=h[0]; const L=Math.hypot(Q.x-P.x,Q.y-P.y)||1, nx=-(Q.y-P.y)/L*0.6, ny=(Q.x-P.x)/L*0.6;
    poly=poly.slice(0,bi+1).concat(h,[{x:Q.x+nx,y:Q.y+ny}],[{x:P.x+nx,y:P.y+ny}],poly.slice(bi+1));
  }
  return poly;
}
// --- 표시: 면 스타일 · 모서리 · 안개 · 숨은 형상 · 안내선 ---
const _fsMats={wire:null,hidden:null,mono:null};
function _fsMat(kind){
  if(_fsMats[kind]) return _fsMats[kind];
  if(kind==='wire') _fsMats.wire=new THREE.MeshBasicMaterial({color:0xF5F1EB,wireframe:true});
  else if(kind==='hidden') _fsMats.hidden=new THREE.MeshBasicMaterial({color:0xF5F1EB,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  else if(kind==='mono') _fsMats.mono=new THREE.MeshStandardMaterial({color:0xC9CFD6,roughness:0.9,metalness:0,side:THREE.DoubleSide});
  else if(kind==='ghost') _fsMats.ghost=new THREE.MeshBasicMaterial({color:0x9A9AFF,wireframe:true,transparent:true,opacity:0.35,depthTest:false});
  return _fsMats[kind];
}
function setFaceStyle(st){ ST.faceStyle=st; applyFaceStyle(); refreshStylePanel(); setStatus(statusLive,'면 스타일: '+({wire:'와이어프레임',hidden:'히든 라인',shaded:'셰이딩',textured:'텍스처 셰이딩',mono:'단색'})[st]); }
function setEdges(on){ ST.edges=!!on; applyFaceStyle(); refreshStylePanel(); }
function ffSpan(){ let mx=4000,mz=0; if(FF){ (FF.free.masses||[]).forEach(m=>{ const r=Math.max(...m.pts.map(q=>Math.hypot(q.x,q.y)))||0; mx=Math.max(mx,Math.abs(m.x)+r,Math.abs(m.y)+r); mz=Math.max(mz,(Number(m.elev_mm)||0)+(Array.isArray(m.solidVerts)?Math.max(...m.solidVerts.map(v=>zNum(v.z,ffCtx()))):zNum(m.h_mm,ffCtx()))); }); (FF.free.sketchPts||[]).forEach(q=>{ mx=Math.max(mx,Math.abs(q.x),Math.abs(q.y)); }); } return Math.max(mx*2,mz)*MM; }
let _wpT=0;
function ffWPRefresh(){ if(!FF_STANDALONE||!ST.wp) return; clearTimeout(_wpT); _wpT=setTimeout(()=>{ if(ST.wp) ffWPDraw(); },90); }
function setFog(on){ ST.fogOn=!!on; const b=ST.built?ST.built.bounds:null; let span=b?Math.max(b.maxX-b.minX,b.maxY-b.minY,4000)*MM:10; if(ST.built&&ST.built.totalHeight) span=Math.max(span,ST.built.totalHeight*MM); if(FF_STANDALONE) span=Math.max(span,ffSpan()); if(scene.fog){ scene.fog.near=ST.fogOn?span*0.6:Math.max(60,span*3); scene.fog.far=ST.fogOn?span*2.4:Math.max(160,span*10); } refreshStylePanel(); invalidate(); }
function setHiddenGeom(on){ ST.hiddenGeom=!!on; refreshVisibility(); applyFaceStyle(); rebuildPickables(); refreshStylePanel(); }
function setGuidesOn(on){ ST.guidesOn=!!on; ST.guides.forEach(g=>{ if(g.line) g.line.visible=ST.guidesOn; }); (ST.guidePts||[]).forEach(g=>{ if(g.mk) g.mk.visible=ST.guidesOn; }); refreshStylePanel(); invalidate(); }
function applyFaceStyle(){
  if(!ST.root) return;
  const st=ST.faceStyle, edges=ST.edges||st==='hidden';
  ST.root.traverse(o=>{
    if(!o.isMesh) return;
    const obj=o.userData.obj; if(!obj||o.userData.pick) return;
    const g=o.parent; const hidKey=obj.floorId+'|'+obj.id;
    const ghost=ST.hiddenGeom&&ST.hidden.has(hidKey);
    if(!o.userData._fs0) o.userData._fs0=o.material;
    const orig=o.userData._fs0;
    if(o.userData._mat&&o.userData._mat!==orig){ /* 선택 하이라이트 사본은 그대로 */ }
    let want=orig;
    if(ghost) want=_fsMat('ghost');
    else if(ST.editMass&&!(obj.kind==='mass'&&obj.id===ST.editMass)&&!SKETCH_KINDS.has(obj.kind)){ if(!orig.userData._fade){ const c=orig.clone(); c.transparent=true; c.opacity=0.3; c.depthWrite=false; orig.userData._fade=c; } want=orig.userData._fade; }   // 4차: 그룹 밖은 흐리게 (스케치업 Fade rest of model)
    else if(st==='wire') want=_fsMat('wire');
    else if(st==='hidden') want=_fsMat('hidden');
    else if(st==='mono') want=(orig.transparent&&orig.opacity<0.9)?orig:_fsMat('mono');
    else if(st==='shaded'&&orig.map){ if(!orig.userData._noTex){ const c=orig.clone(); c.map=null; c.needsUpdate=true; orig.userData._noTex=c; } want=orig.userData._noTex; }
    if(o.userData._mat){ o.userData._mat=want; if(want===orig){ /* 선택 중이면 하이라이트 유지 */ } else o.material=want; }
    else o.material=want;
    // 모서리
    let eg=o.children.find(c=>c.name==='__edges');
    if(edges&&!ghost){ if(!eg){ eg=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,25),new THREE.LineBasicMaterial({color:0x0E0F1A,transparent:true,opacity:st==='hidden'?1:0.55})); eg.name='__edges'; eg.raycast=()=>{}; o.add(eg); } eg.visible=true; }
    else if(eg) eg.visible=false;
  });
  invalidate(true);
}
// --- 매스 배율 (Scale — 매스) ---
function beginScaleMass(g,obj,cy,cx){
  if(!ffEditable(obj)||obj.locked){ setStatus(statusLive,obj.locked?'잠금된 매스':'🧊 밑그림은 못 늘립니다'); return; }
  ST.op={type:'scale',mass:true,g,obj,startY:cy,startX:cx,factor:1,fx:1,fz:1,fy:1,baseSX:g.scale.x,baseSZ:g.scale.z,baseSY:g.scale.y};
  opOrbit(true); vcbShow('배율 (Shift=높이만 · 가로,세로,높이)','1.00','×');
}
function applyScaleMass(cy,shift){
  const op=ST.op; let f=1+(op.startY-cy)*0.005; f=Math.max(0.05,Math.min(20,Math.round(f*20)/20));
  if(shift){ op.fx=1; op.fz=1; op.fy=f; op.factor=null; } else { op.fx=op.fz=op.fy=f; op.factor=f; }
  op.g.scale.set(op.baseSX*op.fx,op.baseSY*op.fy,op.baseSZ*op.fz);
  vcbShow('배율'+(shift?' (높이)':''),f.toFixed(2),'×'); invalidate(true);
}
function commitScaleMass(exact){
  const op=ST.op; let fx=op.fx,fy=op.fz,fz=op.fy;
  const raw=vcbRaw(); const m3=raw.match(/^([\d.]+)\s*[,x*]\s*([\d.]+)\s*[,x*]\s*([\d.]+)$/), m2=raw.match(/^([\d.]+)\s*[,x*]\s*([\d.]+)$/);
  if(m3){ fx=+m3[1]; fy=+m3[2]; fz=+m3[3]; } else if(m2){ fx=+m2[1]; fy=+m2[2]; } else if(exact!=null&&exact>0){ if(op.factor===null){ fz=exact; } else { fx=fy=fz=exact; } }
  op.g.scale.set(op.baseSX,op.baseSY,op.baseSZ);
  const obj=op.obj; _opDone();
  if(!(fx>0&&fy>0&&fz>0)){ setStatus(statusLive,'배율은 0 보다 커야 합니다'); return; }
  emitEdit({type:'edit',op:'scale',kind:'masses',id:obj.id,floorId:'freeform',patch:{sx:fx,sy:fy,sz:fz}});
  setLast('배율','×',r=>{ const v=parseFloat(r); if(!(v>0)) return false; emitEdit({type:'edit',op:'scale',kind:'masses',id:obj.id,floorId:'freeform',patch:{sx:v,sy:v,sz:v}}); return true; });
  setStatus(statusLive,'⤢ 배율 ×'+fx.toFixed(2)+(fx!==fy||fy!==fz?'·'+fy.toFixed(2)+'·'+fz.toFixed(2):''));
}
// --- 그룹 · 컴포넌트 (G · Shift+G) · 분해 · 정의 갱신 ---
function ffSelMassIds(){ return _selObjs(o=>o.kind==='mass'&&o.floorId==='freeform'&&!o.locked).map(o=>o.id); }
function ffMakeGroup(){ const ids=ffSelMassIds(); if(!ids.length){ setStatus(statusLive,'그룹으로 묶을 매스를 먼저 선택하세요'); return; } emitEdit({type:'edit',op:'group',floorId:'freeform',patch:{ids}}); }
function ffMakeComp(){ const ids=ffSelMassIds(); if(!ids.length){ setStatus(statusLive,'컴포넌트로 만들 매스를 먼저 선택하세요'); return; } const nm=window.prompt('컴포넌트 이름','컴포넌트'+(((FF&&FF.free.comps)||[]).length+1)); if(!nm) return; emitEdit({type:'edit',op:'mkcomp',floorId:'freeform',patch:{ids,name:nm}}); }
function ffExplode(){ const o=ST.selected&&ST.selected.userData.obj; const gid=o&&o.meta&&o.meta.gid; if(!gid){ setStatus(statusLive,'분해할 그룹을 선택하세요'); return; } emitEdit({type:'edit',op:'ungroup',floorId:'freeform',patch:{gid}}); }
function ffCompUpdate(){ const o=ST.selected&&ST.selected.userData.obj; const gid=o&&o.meta&&o.meta.gid; if(!gid){ setStatus(statusLive,'컴포넌트 인스턴스(그룹)를 선택하세요'); return; } emitEdit({type:'edit',op:'compupdate',floorId:'freeform',patch:{gid}}); }
// --- 줄자로 모델 전체 크기 조정 (Tape → Resize model) ---
function ffTapeResize(d){
  setLast('줄자 → 모델 크기 조정','mm',raw=>{ const v=parseLen(raw); if(!(v>0)||!(d>0)) return false;
    if(!window.confirm('모델 전체를 '+Math.round(d)+' → '+Math.round(v)+' mm 비율('+(v/d).toFixed(3)+')로 조정할까요?')) return true;
    emitEdit({type:'edit',op:'scaleall',floorId:'freeform',patch:{k:v/d}}); return true; },{noUndo:true});
}
// --- 단위 · 모델 정보 ---
function showModelInfo(on){ const m=$('modelinfo'); if(!m) return; m.style.display=on?'flex':'none'; if(on){ $('mi-units').value=ST.units; $('mi-defz').value=ST.defZ; $('mi-grid').value=String(ST.gridMM); $('mi-sides').value=ST.circleSides;
  const st=ffStats(); const el=$('mi-stats'); if(el&&st) el.innerHTML='<b>통계</b> — 매스 '+st.masses+' · 면 '+st.faces+' · 스케치 점 '+st.sketchPts+' / 선 '+st.sketchEdges+' / 면 '+st.sketchFaces+' · 평면 '+st.planes+' · 그룹 '+st.groups+' · 컴포넌트 '+st.comps+' (미사용 '+st.unused+') · 이미지 재질 '+st.mats;
  ffSaveMeter();
  const pb=$('mi-purge'); if(pb) pb.onclick=ffPurge; } }
// --- OBJ · STL 내보내기 ---
function _exportTris(){
  const out=[]; const v=new THREE.Vector3();
  ST.root&&ST.root.traverse(o=>{ if(!o.isMesh||!o.visible||!o.userData.obj||o.name==='__edges') return; let p=o; while(p){ if(p.visible===false) return; p=p.parent; }
    const g=o.geometry; const pos=g.attributes.position; if(!pos) return; const idx=g.index; o.updateWorldMatrix(true,false);
    const tri=[]; const n=idx?idx.count:pos.count;
    for(let i=0;i<n;i++){ const k=idx?idx.getX(i):i; v.fromBufferAttribute(pos,k).applyMatrix4(o.matrixWorld); tri.push([v.x/MM,v.z/MM,v.y/MM]); if(tri.length===3){ out.push({name:(o.userData.obj.name||o.userData.obj.kind),t:tri.slice()}); tri.length=0; } } });
  return out;
}
function exportOBJ(){
  const tris=_exportTris(); if(!tris.length){ setStatus(statusLive,'내보낼 것이 없습니다'); return; }
  let s='# ECOREAN 프리폼 OBJ (mm, x right / y plan-down / z up)\n'; let vi=1; let cur=null;
  tris.forEach(tr=>{ if(tr.name!==cur){ cur=tr.name; s+='g '+cur.replace(/\s+/g,'_')+'\n'; } tr.t.forEach(p=>{ s+='v '+p[0].toFixed(1)+' '+p[2].toFixed(1)+' '+(-p[1]).toFixed(1)+'\n'; }); s+='f '+vi+' '+(vi+1)+' '+(vi+2)+'\n'; vi+=3; });
  download(fileStem()+'.obj',new Blob([s],{type:'text/plain'})); setStatus(statusLive,'OBJ 저장 ('+tris.length+' 삼각형)');
}
function exportSTL(){
  const tris=_exportTris(); if(!tris.length){ setStatus(statusLive,'내보낼 것이 없습니다'); return; }
  const buf=new ArrayBuffer(84+tris.length*50); const dv=new DataView(buf); dv.setUint32(80,tris.length,true); let o=84;
  tris.forEach(tr=>{ const [a,b,c]=tr.t; const ux=b[0]-a[0],uy=b[2]-a[2],uz=-(b[1]-a[1]), vx=c[0]-a[0],vy=c[2]-a[2],vz=-(c[1]-a[1]); const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx; const L=Math.hypot(nx,ny,nz)||1;
    dv.setFloat32(o,nx/L,true);dv.setFloat32(o+4,ny/L,true);dv.setFloat32(o+8,nz/L,true); o+=12;
    [a,b,c].forEach(p=>{ dv.setFloat32(o,p[0],true);dv.setFloat32(o+4,p[2],true);dv.setFloat32(o+8,-p[1],true); o+=12; }); dv.setUint16(o,0,true); o+=2; });
  download(fileStem()+'.stl',new Blob([buf],{type:'model/stl'})); setStatus(statusLive,'STL 저장 ('+tris.length+' 삼각형)');
}
// --- 단독 셸 부팅: 메뉴·툴바·단축키표 교체 + 바인딩 ---
function bindMenus(){
  document.querySelectorAll('#menubar .menu>button').forEach(btn=>{
    btn.onclick=e=>{ e.stopPropagation(); const m=btn.parentElement, was=m.classList.contains('open'); closeMenus(); if(!was) m.classList.add('open'); };
    btn.onmouseenter=()=>{ if(document.querySelector('.menu.open')){ closeMenus(); btn.parentElement.classList.add('open'); } };
  });
  document.querySelectorAll('#menubar .mi').forEach(mi=>{ mi.onclick=e=>{ e.stopPropagation(); closeMenus(); menuCmd(mi.dataset.cmd); }; });
}
function bindTools(){ document.querySelectorAll('#tools .btn').forEach(b=>{ b.onclick=()=>{ const t=b.dataset.t; if(t==='mkcomp'){ ffMakeGroup(); return; } if(t==='fit'){ fitView(true); return; } if(t==='prevview'){ camPrev(); return; } setTool(t); }; }); }

// ---- 단독 셸: 상단 툴바·스타일 패널 아이콘도 큰 도구 세트와 같은 선형 SVG 로 (연동 뷰는 그대로) ----
const FF_ICO={
  orbit:'<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="10" ry="3.5"/>',
  walk:'<circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2.5-6 3 2 1.5 4M7 13l3-5 3.5-1 2.5 3 3 1M11 8l-1.5 5 2.5 2"/>',
  iso:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  top:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5-8-4.5z" fill="currentColor" fill-opacity=".35"/>',
  front:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5v9l-8-4.5z" fill="currentColor" fill-opacity=".35"/>',
  side:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M20 7.5l-8 4.5v9l8-4.5z" fill="currentColor" fill-opacity=".35"/>',
  back:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/><path d="M12 12l-8 4.5M12 12l8 4.5" stroke-dasharray="1.5 2"/>',
  prev:'<path d="M15 5l-7 7 7 7"/>', next:'<path d="M9 5l7 7-7 7"/>',
  light:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
  night:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  ceil:'<path d="M4 9l8-5 8 5"/><path d="M6 9v10h12V9"/><path d="M9 19v-4h6v4"/>',
  label:'<path d="M3 12l9-9h9v9l-9 9z"/><circle cx="16.5" cy="7.5" r="1.4"/>',
  shadow:'<circle cx="12" cy="9" r="3.5"/><path d="M12 2.5v1.5M18.5 9H17M7 9H5.5M16.6 4.4l-1.1 1.1M8.5 5.5L7.4 4.4"/><path d="M4 19h16" stroke-width="2.4" stroke-opacity=".55"/><path d="M8 16h9"/>',
  shot:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.5"/>',
  glb:'<path d="M12 3v11M8 10l4 4 4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  axes:'<path d="M12 21V9M12 9l8-4M12 9L4 5"/><circle cx="12" cy="9" r="1.4" fill="currentColor"/>',
  sky:'<path d="M3 15h18"/><path d="M6 15a6 6 0 0 1 12 0"/><path d="M12 5v1.5M18.5 8.5l-1 1M5.5 8.5l1 1"/><path d="M4 19h16" stroke-dasharray="2 2"/>',
  skyimg:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.6"/>',
  plain:'<rect x="3" y="4" width="18" height="16" rx="2"/>',
  xray:'<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M4 15h16M9 4v16M15 4v16" stroke-opacity=".55"/>',
  ortho:'<rect x="5" y="5" width="14" height="14"/><path d="M5 5l4-3h14v14l-4 3M9 2v14M23 2l-4 3"/>',
  reload:'<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/>',
};
function ffSvg(k){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(FF_ICO[k]||'')+'</svg>'; }
function ffIconize(id,k,label){ const el=$(id); if(!el) return; el.innerHTML=ffSvg(k)+(label?'<span>'+label+'</span>':''); el.classList.add('ico'); }
function ffIconizeShell(){
  ffIconize('b-orbit','orbit','조감'); ffIconize('b-walk','walk','걷기');
  ffIconize('v-iso','iso'); ffIconize('v-top','top'); ffIconize('v-front','front'); ffIconize('v-side','side'); ffIconize('v-back','back'); ffIconize('v-prev','prev'); ffIconize('v-next','next');
  ffIconize('b-light','light'); ffIconize('b-night','night'); ffIconize('b-shadow','shadow'); ffIconize('b-shot','shot'); ffIconize('b-glb','glb','GLB'); ffIconize('b-reload','reload');
  ffIconize('st-light','light','조명'); ffIconize('st-night','night','야간'); ffIconize('st-ceil','ceil','천장'); ffIconize('st-label','label','이름표'); ffIconize('st-shadow','shadow','그림자');
  ffIconize('st-axes','axes','축'); ffIconize('st-xray','xray','X-ray'); ffIconize('st-ortho','ortho','평행투영'); ffSkyIcon();
}
function ffSkyIcon(){ const sb=$('st-sky'); if(!sb||!document.body.classList.contains('ff-su')) return false; sb.innerHTML=ffSvg(ST.sky==='image'?'skyimg':ST.sky==='sky'?'sky':'plain')+'<span>'+(ST.sky==='image'?'배경 그림':ST.sky==='sky'?'하늘·바닥':'단색')+'</span>'; sb.classList.add('ico'); return true; }

// ===========================================================================
// 작업 평면 + 방향기 (2026-09-10 대표 지시
//   "x→y→z 순만 말고 x→z→y 등 z 축 순서로도 객체가 만들어지도록, 방향성은 방향기로 잡게")
//   바닥(빨강·초록에 그림) → 파랑으로 자란다  = x,y → z
//   정면(빨강·파랑에 그림) → 초록으로 자란다  = x,z → y
//   측면(초록·파랑에 그림) → 빨강으로 자란다  = y,z → x
//   방향기의 축 손잡이를 누르면 그 손잡이가 가리키는 쪽이 곧 '자라는 방향'.
// ===========================================================================
const WP_KINDS={
  xy:{name:'바닥',plan:'빨강·초록',n:{x:0,y:0,z:1},col:0x4C7DE2,ax:'파랑',ord:'x,y → z'},
  xz:{name:'정면',plan:'빨강·파랑',n:{x:0,y:-1,z:0},col:0x4CAF50,ax:'초록',ord:'x,z → y'},
  yz:{name:'측면',plan:'초록·파랑',n:{x:1,y:0,z:0},col:0xE24C4C,ax:'빨강',ord:'y,z → x'},
};
const WP_AXCOL={x:0xE24C4C,y:0x4CAF50,z:0x4C7DE2};
const WP_AXNAME={x:'빨강',y:'초록',z:'파랑'};
const WP_AX2KIND={x:'yz',y:'xz',z:'xy'};
// 지금 작업 평면의 틀 (없으면 null = 자동)
function ffWPFrame(){
  const w=ST.wp; if(!w||!WP_KINDS[w.kind]) return null;
  const d=WP_KINDS[w.kind], s=(w.sign||1);
  return planeFrom(w.origin,{x:d.n.x*s,y:d.n.y*s,z:d.n.z*s});
}
// 바닥 + 원점 z=0 + 정방향 = 종전 기본 평면 그대로 (기존 동작·테스트 보존)
function ffWPGround(){ const w=ST.wp; return !!(w&&w.kind==='xy'&&(w.sign||1)>0&&Math.abs(w.origin.z)<1); }
function ffWPLabel(){
  const w=ST.wp; if(!w) return '자동 (면을 따라감)';
  const d=WP_KINDS[w.kind], s=(w.sign||1);
  return d.name+' — '+d.plan+'에 그리고 '+(s>0?'':'−')+d.ax+'으로 자람 ('+d.ord+')';
}
function ffSetWP(kind,origin,sign,quiet){
  if(!kind||kind==='auto'){ ST.wp=null; }
  else if(WP_KINDS[kind]){
    const o=origin||(ST.wp&&ST.wp.origin)||{x:0,y:0,z:0};
    ST.wp={kind,origin:{x:Math.round(o.x||0),y:Math.round(o.y||0),z:Math.round(o.z||0)},sign:sign||(ST.wp&&ST.wp.kind===kind?ST.wp.sign:1)||1};
  }
  ST.wpPick=false; cancelOp();
  ffWPDraw(); renderWPBar();
  if(!quiet) setStatus(statusLive,'▦ 작업 평면 — '+ffWPLabel());
  return ST.wp;
}
function ffWPFlip(){
  if(!ST.wp){ setStatus(statusLive,'작업 평면을 먼저 고르세요 (W)'); return; }
  ST.wp.sign=-(ST.wp.sign||1); ffWPDraw(); renderWPBar();
  setStatus(statusLive,'⇅ 자라는 방향 뒤집기 — '+ffWPLabel());
}
function ffWPCycle(){
  const seq=['auto','xy','xz','yz'];
  const i=seq.indexOf(ST.wp?ST.wp.kind:'auto');
  ffSetWP(seq[(i+1)%seq.length]);
}
// 방향기 축 손잡이를 눌렀을 때 — 그 축이 자라는 방향, 그 축에 수직인 평면이 그리는 면
function ffWPPickAxis(ax,sign){
  const kind=WP_AX2KIND[ax]; if(!kind) return;
  const base=WP_KINDS[kind].n, want=(ax==='y')?-sign:sign;   // 정면은 기본 법선이 −y
  ffSetWP(kind,(ST.wp&&ST.wp.origin)||null,want);
}
function ffWPOriginPick(){
  if(!ST.wp){ ffSetWP('xy',null,1,true); }
  ST.wpPick=true; renderWPBar();
  setStatus(statusLive,'⌖ 작업 평면 원점 — 옮길 자리를 클릭하세요 (Esc 취소)');
}
function ffWPSetOrigin(p){
  if(!p) return;
  ffSetWP((ST.wp&&ST.wp.kind)||'xy',{x:p.x,y:p.y,z:p.z||0},(ST.wp&&ST.wp.sign)||1,true);
  setStatus(statusLive,'⌖ 작업 평면 원점 '+Math.round(p.x)+', '+Math.round(p.y)+', '+Math.round(p.z||0)+' mm — '+ffWPLabel());
}
// 클릭한 면에 작업 평면을 맞춘다 (면 ▸ 우클릭 · 방향기 "면 맞춤")
function ffWPFromFace(){
  const fp=ST.lastPtr?_ffFacePickRaw({clientX:ST.lastPtr.clientX,clientY:ST.lastPtr.clientY}):null;
  if(!fp){ setStatus(statusLive,'면 위에 커서를 두고 다시 시도하세요'); return; }
  const n=fp.n, ax=(Math.abs(n.x)>Math.abs(n.y)&&Math.abs(n.x)>Math.abs(n.z))?'x':(Math.abs(n.y)>Math.abs(n.z)?'y':'z');
  const s=(ax==='x'?n.x:ax==='y'?n.y:n.z)>0?1:-1;
  ffWPPickAxis(ax,ax==='y'?-s:s); ffWPSetOrigin(fp.o);
}
// ---- 방향기: 3D 손잡이 (축마다 ±) + 작업 평면 격자 ----
let wpGrp=null, wpHandles=[];
function _wpClear(){
  if(!wpGrp) return;
  scene.remove(wpGrp);
  wpGrp.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material&&o.material.map&&o.material.map.dispose) o.material.map.dispose(); if(o.material&&o.material.dispose) o.material.dispose(); });
  wpGrp=null; wpHandles=[];
}
function ffWPDraw(){
  if(!FF_STANDALONE) return;
  _wpClear();
  const fr=ffWPFrame(); if(!fr){ invalidate(); return; }
  wpGrp=new THREE.Group(); wpGrp.name='__wp'; wpGrp.renderOrder=60;
  const O=new THREE.Vector3(fr.origin.x*MM,fr.origin.z*MM,fr.origin.y*MM);
  const mmpp=mmPerPx(O);
  const half=Math.max(2500,mmpp*230);                 // 화면에서 대략 460px 폭 — 줌과 무관하게 보인다
  const step=Math.max(100,Math.pow(10,Math.round(Math.log10(half/6))));
  const col=WP_KINDS[ST.wp.kind].col;
  const P=(u,vv)=>{ const p=planePt(fr,u,vv); return new THREE.Vector3(p.x*MM,p.z*MM,p.y*MM); };
  // 격자
  const gp=[];
  for(let t=-half;t<=half+0.5;t+=step){ gp.push(P(t,-half),P(t,half),P(-half,t),P(half,t)); }
  const grid=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp),
    new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.22,depthTest:false}));
  grid.renderOrder=60; wpGrp.add(grid);
  // 테두리 (평면을 이루는 두 축의 색으로)
  const uAx=(ST.wp.kind==='yz')?'y':'x', vAx=(ST.wp.kind==='xy')?'y':'z';
  const bd=(pts,c)=>{ const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({color:c,transparent:true,opacity:0.75,depthTest:false})); l.renderOrder=61; wpGrp.add(l); };
  bd([P(-half,-half),P(half,-half)],WP_AXCOL[uAx]); bd([P(-half,half),P(half,half)],WP_AXCOL[uAx]);
  bd([P(-half,-half),P(-half,half)],WP_AXCOL[vAx]); bd([P(half,-half),P(half,half)],WP_AXCOL[vAx]);
  // 축 손잡이 — 원점에서 ±방향, 화면 고정 거리
  const R=mmpp*78;
  const AX={x:{x:1,y:0,z:0},y:{x:0,y:1,z:0},z:{x:0,y:0,z:1}};
  const nrm=fr.n;
  ['x','y','z'].forEach(ax=>{
    const d=AX[ax];
    const w=(s)=>new THREE.Vector3((fr.origin.x+d.x*R*s)*MM,(fr.origin.z+d.z*R*s)*MM,(fr.origin.y+d.y*R*s)*MM);
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([w(-1),w(1)]),
      new THREE.LineBasicMaterial({color:WP_AXCOL[ax],transparent:true,opacity:0.8,depthTest:false}));
    line.renderOrder=62; wpGrp.add(line);
    [1,-1].forEach(s=>{
      const along=Math.abs((ax==='x'?nrm.x:ax==='y'?nrm.y:nrm.z));
      const isN=along>0.9&&(((ax==='x'?nrm.x:ax==='y'?nrm.y:nrm.z)>0?1:-1)===s);   // 지금 자라는 방향
      const mk=glowSprite(WP_AXCOL[ax],isN?18:11);
      mk.position.copy(w(1*s)); mk.renderOrder=64;
      mk.userData.wpAxis=ax; mk.userData.wpSign=s; mk.userData.wpOn=isN;
      wpGrp.add(mk); wpHandles.push(mk);
    });
  });
  // 자라는 방향 — 법선 쪽 굵은 선 (방향기의 '이쪽으로 자란다')
  { const na={x:nrm.x,y:nrm.y,z:nrm.z};
    const tip=new THREE.Vector3((fr.origin.x+na.x*R*1.35)*MM,(fr.origin.z+na.z*R*1.35)*MM,(fr.origin.y+na.y*R*1.35)*MM);
    const ar=new THREE.Line(new THREE.BufferGeometry().setFromPoints([O,tip]),
      new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0.95,depthTest:false}));
    ar.renderOrder=63; wpGrp.add(ar); }
  // 원점 알갱이
  const oc=glowSprite(0xFFFFFF,9); oc.position.copy(O); oc.renderOrder=65; wpGrp.add(oc);
  scene.add(wpGrp); invalidate();
}
// 화면 11px 안의 방향기 손잡이
function _ffWPHandleAt(cx,cy){
  if(!wpGrp||!wpHandles.length) return null;
  wpGrp.updateMatrixWorld(true); camera.updateMatrixWorld();
  const r=renderer.domElement.getBoundingClientRect();
  let best=null,bd=11;
  wpHandles.forEach(o=>{
    const w=o.getWorldPosition(new THREE.Vector3()).project(camera); if(w.z>1) return;
    const d=Math.hypot(r.left+(w.x+1)/2*r.width-cx, r.top+(1-w.y)/2*r.height-cy);
    if(d<bd){ bd=d; best=o; }
  });
  return best;
}
// ---- 방향기 막대 (상단 가운데) ----
function renderWPBar(){
  const el=$('wpbar'); if(!el) return;
  const cur=ST.wp?ST.wp.kind:'auto';
  el.querySelectorAll('[data-wp]').forEach(b=>{
    const k=b.dataset.wp;
    if(k==='flip') b.classList.toggle('on',!!(ST.wp&&(ST.wp.sign||1)<0));
    else if(k==='origin') b.classList.toggle('on',!!ST.wpPick);
    else b.classList.toggle('on',k===cur);
  });
  const n=el.querySelector('.wn');
  if(n) n.textContent=ST.wp?(((ST.wp.sign||1)<0?'−':'')+WP_KINDS[ST.wp.kind].ax+'으로 자람'):'면을 따라감';
}


function ffSaveUIBuild(){
  let el=$('savewarn');
  if(!el){ el=document.createElement('div'); el.id='savewarn'; document.body.appendChild(el); }
  if(!el.querySelector('.sw-t')){                      // index.html 에 빈 껍데기가 이미 있다 — 속을 채운다
    el.innerHTML='<span class="sw-i">⚠</span><span class="sw-t"></span>'+
      '<button class="btn sm" data-sw="cloud">☁ 클라우드에 저장</button>'+
      '<button class="btn sm" data-sw="file">파일로 저장</button>'+
      '<button class="btn sm" data-sw="x" title="닫기">✕</button>';
    el.querySelector('[data-sw="cloud"]').onclick=()=>ffCloudSave(false);
    el.querySelector('[data-sw="file"]').onclick=()=>ffExportFile();
    el.querySelector('[data-sw="x"]').onclick=()=>{ el.style.display='none'; };
  }
  const m=$('ffcloud');
  if(m){
    const c=m.querySelector('[data-cl="close"]'); if(c) c.onclick=()=>{ m.style.display='none'; };
    const s=m.querySelector('[data-cl="saveas"]'); if(s) s.onclick=()=>{ m.style.display='none'; ffCloudSave(true); };
    m.onclick=e=>{ if(e.target===m) m.style.display='none'; };
  }
}
function ffWPBarBuild(){
  if($('wpbar')) return;
  const ico=(d)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
  const P={
    auto:'<path d="M4 15l8-4 8 4-8 4z"/><path d="M12 11V4"/><path d="M9 7l3-3 3 3"/>',
    xy:'<path d="M3 15l9-4.5 9 4.5-9 4.5z"/><path d="M12 10.5V3"/><path d="M9.2 5.8L12 3l2.8 2.8"/>',
    xz:'<path d="M4 4h16v12H4z"/><path d="M20 10h3"/><path d="M21 8l2 2-2 2"/>',
    yz:'<path d="M8 4l8 3v13l-8-3z"/><path d="M8 12H3"/><path d="M5 10l-2 2 2 2"/>',
    flip:'<path d="M8 4v16M12 7l-4-4-4 4M8 20l-4-4M12 17l-4 4"/><path d="M16 6h5M16 12h5M16 18h5" stroke-opacity=".55"/>',
    origin:'<circle cx="12" cy="12" r="4"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
    face:'<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M12 12l8-4M12 12v8M12 12L4 8"/>',
  };
  const B=(k,t,label)=>'<button class="btn sm" data-wp="'+k+'" title="'+t+'">'+ico(P[k])+(label?'<span>'+label+'</span>':'')+'</button>';
  const el=document.createElement('div'); el.id='wpbar';
  el.innerHTML='<span class="wl">작업 평면</span>'+
    B('auto','자동 — 면을 클릭하면 그 면 위에 그린다 (W 로 순환)','자동')+
    B('xy','바닥 — 빨강·초록에 그리고 파랑으로 자란다 (x,y → z)','바닥')+
    B('xz','정면 — 빨강·파랑에 그리고 초록으로 자란다 (x,z → y)','정면')+
    B('yz','측면 — 초록·파랑에 그리고 빨강으로 자란다 (y,z → x)','측면')+
    '<span class="sep"></span>'+
    B('flip','자라는 방향 뒤집기 (Shift+W)','')+
    B('origin','원점 옮기기 — 다음에 클릭한 점으로','')+
    B('face','커서 아래 면에 맞추기','')+
    '<span class="wn"></span>';
  document.body.appendChild(el);
  el.querySelectorAll('[data-wp]').forEach(b=>{ b.onclick=()=>{
    const k=b.dataset.wp;
    if(k==='flip') ffWPFlip();
    else if(k==='origin') ffWPOriginPick();
    else if(k==='face') ffWPFromFace();
    else ffSetWP(k);
    renderWPBar();
  }; });
  renderWPBar();
}
function ffStandaloneShell(){
  document.body.classList.add('ff-su');           // 미래적 유리 프레임 (index.html body.ff-su 규칙)
  if(!$('ffvig')){ const vg=document.createElement('div'); vg.id='ffvig'; const vw=$('view'); if(vw) vw.insertAdjacentElement('afterend',vg); }   // 비네트 (클릭 통과)
  const mb=$('menubar'), tm=$('ff-menus'); if(mb&&tm){ mb.innerHTML=''; mb.appendChild(tm.content.cloneNode(true)); bindMenus(); }
  const tl=$('tools'), tt=$('ff-tools'); if(tl&&tt){ tl.innerHTML=''; tl.appendChild(tt.content.cloneNode(true)); bindTools(); }
  const km=document.querySelector('#keysmodal .kbox'), tk=$('ff-keys'); if(km&&tk){ km.innerHTML=''; km.appendChild(tk.content.cloneNode(true)); const kc=$('keys-close'); if(kc) kc.onclick=()=>showKeys(false); }
  ['#b-ceil','#b-label','#b-ff','#b-reload','#b-json'].forEach(sel=>{ const el=document.querySelector(sel); if(el) el.style.display='none'; });
  const mc=$('mi-close'); if(mc) mc.onclick=()=>showModelInfo(false);
  const mu=$('mi-units'); if(mu) mu.onchange=()=>{ ST.units=mu.value; setStatus(statusLive,'단위: '+ST.units); };
  const mz=$('mi-defz'); if(mz) mz.onchange=()=>{ ST.defZ=Math.max(10,parseInt(mz.value)||2400); };
  const mg=$('mi-grid'); if(mg) mg.onchange=()=>{ ST.gridMM=parseInt(mg.value)||10; };
  const ms=$('mi-sides'); if(ms) ms.onchange=()=>{ ST.circleSides=Math.max(6,Math.min(96,parseInt(ms.value)||24)); };
  const hint=$('hint'); if(hint) hint.innerHTML='<b>스케치업식:</b> Space 선택 · L 선 · R 사각형 · C 원 · A 호 · F 오프셋 · M 이동 · Q 회전 · S 배율 · P 밀기끌기 · B 페인트 · E 지우개 · T 줄자 · G 그룹 · O 궤도 · H 팬 · Z 줌 | 숫자=정확값 · Esc 취소 · ?=단축키표';
  ffSaveUIBuild();
  ffWPBarBuild();
  ffIconizeShell();
  renderTags(); renderPaintPal(); renderSections();
}
// 단독 프리폼의 우클릭 메뉴 (스케치업 컨텍스트 메뉴)
function ffCtxItems(e,sel,n){
  const items=[];
  if(sel){
    items.push(['info','개체 정보',()=>openTraySec('info')]);
    items.push(['-']);
    if(sel.kind==='mass'||SKETCH_KINDS.has(sel.kind)||FF_PLACE.includes(KINDMAP[sel.kind])) items.push(['del','지우기'+(n>1?' ('+n+'개)':'')+'\tDel',deleteSelected3D]);
    if(sel.kind==='sketchFace') items.push(['ext','밀기끌기 (Z 입력)…',()=>{ const z=window.prompt('밀기 높이(mm)',String(ST.lastPP>=10?ST.lastPP:ST.defZ)); const v=parseLen(z); if(v>=10) emitEdit({type:'edit',op:'extrude',floorId:'freeform',patch:{id:sel.id,z:Math.round(v),as:'solid'}}); }]);
    items.push(['hide','숨기기\tShift+H',hideSelected]);
    if(MOVABLE.has(sel.kind)) items.push(['lock',sel.locked?'잠금 해제':'잠금',()=>lockSelected(!sel.locked)]);
    if(sel.kind==='mass'){
      items.push(['-']);
      items.push(['grp','그룹 만들기\tG',ffMakeGroup]);
      items.push(['cmp','컴포넌트 만들기…\tShift+G',ffMakeComp]);
      if(sel.meta&&sel.meta.gid){ items.push(['exp','분해',ffExplode]); if(sel.meta.cid) items.push(['cup','컴포넌트 정의 갱신',ffCompUpdate]); }
      if(sel.meta&&sel.meta.mat) items.push(['mclr','재질 지우기',()=>emitEdit({type:'edit',op:'set',kind:'masses',id:sel.id,floorId:'freeform',patch:{mat:null}})]);
      items.push(['-']);
      items.push(['fmb','걸레받이 (바닥 둘레)',()=>emitEdit({type:'edit',op:'followme',floorId:'freeform',patch:{massId:sel.id,at:'bottom',profile:{kind:'rect',w:ST.fmW||10,h:ST.fmH||80}}})]);
      items.push(['fmt','천장 몰딩 (위 둘레)',()=>emitEdit({type:'edit',op:'followme',floorId:'freeform',patch:{massId:sel.id,at:'top',profile:{kind:'crown',w:ST.fmW||10,h:ST.fmH||80}}})]);
      items.push(['-']);
      items.push(['rotl','↺ 15°\tShift+R',()=>rotateSelected(-15)]); items.push(['rotr','↻ 15°\tR',()=>rotateSelected(15)]); items.push(['flip','180° 돌리기',()=>rotateSelected(180)]);
      items.push(['-']);
      items.push(['fx','뒤집기 — 빨강 축 방향',()=>ffFlip('x')]); items.push(['fy','뒤집기 — 초록 축 방향',()=>ffFlip('y')]); items.push(['fz','뒤집기 — 파랑 축 방향',()=>ffFlip('z')]);
    }
    items.push(['-']);
    if(MOVABLE.has(sel.kind)){ items.push(['copy','복사\tCtrl+C',copySel]); items.push(['cut','잘라내기\tCtrl+X',cutSel]); }
    if(ST.clip) items.push(['paste','붙여넣기\tCtrl+V',()=>pasteClip(e)]);
    items.push(['zoom','선택 확대',()=>zoomTo(ST.selected)]);
  }else{
    if(ST.clip) items.push(['paste','붙여넣기\tCtrl+V',()=>pasteClip(e)]);
    items.push(['all','모두 선택\tCtrl+A',selectAll]);
    if(ST.hidden.size) items.push(['unhide','숨긴 것 모두 보기 ('+ST.hidden.size+')',unhideAll]);
    if(ST.guides.length) items.push(['guides','안내선 모두 삭제',clearGuides]);
    if(ST.sections.length) items.push(['secs','단면 모두 삭제',clearSections]);
    if(ST.axesO.x||ST.axesO.y||ST.axesO.ang) items.push(['axr','축 초기화',()=>setAxesOrigin(0,0,0)]);
    items.push(['-']);
    items.push(['fit','전체 보기\tShift+Z',()=>fitView(true)]);
    items.push(['iso','기본 시점',()=>setView('iso')]);
    items.push(['prev','이전 시점',camPrev]);
  }
  return items;
}
// --- 솔리드 도구 (Solid Tools) — 선택 순서: 먼저 고른 것이 기준(A), 두 번째가 도구(B) ---
function ffSolid(kind){
  const ids=_selObjs(o=>o.kind==='mass'&&o.floorId==='freeform'&&!o.locked).map(o=>o.id);
  if(kind==='shell'){ if(ids.length<2){ setStatus(statusLive,'외곽 셸: 매스 둘 이상 선택'); return; } emitEdit({type:'edit',op:'solid',floorId:'freeform',patch:{kind:'shell',ids}}); return; }
  if(ids.length!==2){ setStatus(statusLive,'솔리드 도구: 프리폼 매스 둘을 고르세요 (Shift+클릭) — 먼저 고른 것이 기준'); return; }
  const ord=ST.selKeys.map(k=>k.split('|')[1]).filter(id=>ids.includes(id));
  emitEdit({type:'edit',op:'solid',floorId:'freeform',patch:{kind,ids:ord.length===2?ord:ids}});
}

// ===========================================================================
// 스케치업 100% 2차 (2026-09-08 대표 재지시 "아직 부족하다 — 100% 동일하게")
//  · 밀기끌기가 매스를 바꾼다 (어느 면이든 법선으로 · Ctrl=새로 뽑기 · 더블클릭=반복)
//  · 꼭짓점 그립 Alt+끌기 = xy 이동 (Shift=모서리)
//  · 원·다각형·호·3점 호·파이·회전 사각형·프리핸드를 벽면·윗면 위에서도 (shape3)
//  · 회전 도구를 세워진 면에 대면 그 면의 법선이 축 (rotate3)
//  · 배율 그립(모서리 8=균등 · 면 6=한 축, Ctrl=중심 기준, 숫자=배율 또는 치수)
//  · 뒤집기(빨강/초록/파랑) · 외곽 셸 · 매스 면 오프셋 · 클릭한 면 정보
//  미리보기는 전부 sketch.js 를 사본(lean)에 그대로 돌려 만든다 — 보이는 것 = 확정되는 것.
// ===========================================================================
function _leanOf(o){ const m=FF&&FF.free.masses.find(x=>x&&x.id===o.id); const L=m?massLean(m):JSON.parse(JSON.stringify(o.meta.z.lean)); if(m&&Array.isArray(m.cuts)) L.cuts=JSON.parse(JSON.stringify(m.cuts)); return L; }
function _ghostForMass(o){
  const z0=_massZ0(o);
  const gcol=new THREE.Color((o.meta&&o.meta.color)||'#B9C6D2');
  const ghost=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshLambertMaterial({color:gcol,transparent:true,opacity:0.92,side:THREE.DoubleSide,emissive:new THREE.Color(0x2F6193),emissiveIntensity:0.22}));
  const gwire=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x2F6193,transparent:true,opacity:0.9,depthTest:false}));
  gwire.renderOrder=850; ghost.add(gwire);
  ghost.position.set(o.x*MM,(z0+(o.elev||0))*MM,o.y*MM); ghost.rotation.y=-(o.rot||0)*Math.PI/180; ghost.renderOrder=800;
  scene.add(ghost); return {ghost,gwire,z0};
}
function _ghostSetLean(op,lean){
  const S=massSolid(lean,op.ctx);
  const pos=[],seg=[];
  S.faces.forEach(f=>{ const vs=f.vs.map(i=>S.verts[i]); const tri=earTriangles(vs); tri.forEach(t=>t.forEach(k=>{ const v=vs[k]; pos.push(v.x*MM,v.z*MM,v.y*MM); }));
    for(let k=0;k<vs.length;k++){ const a=vs[k],b=vs[(k+1)%vs.length]; seg.push(a.x*MM,a.z*MM,a.y*MM,b.x*MM,b.z*MM,b.y*MM); } });
  const g2=new THREE.BufferGeometry(); g2.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3)); g2.computeVertexNormals(); g2.computeBoundingSphere();
  if(op.ghost.geometry) op.ghost.geometry.dispose(); op.ghost.geometry=g2;
  const gw=new THREE.BufferGeometry(); gw.setAttribute('position',new THREE.BufferAttribute(new Float32Array(seg),3));
  if(op.gwire.geometry) op.gwire.geometry.dispose(); op.gwire.geometry=gw;
  op.ghost.position.y=(op.z0+(op.obj.elev||0)+(lean.elev_mm||0))*MM;
  op.solid=S; invalidate(true);
}
function _localOfHit(g,hit){ // 세계 점·법선 → 매스 로컬 mm (x, y=plan, z=up)
  const lp=g.worldToLocal(hit.point.clone());
  const q=g.getWorldQuaternion(new THREE.Quaternion()).invert();
  const ln=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).applyQuaternion(q);
  return {p:{x:lp.x/MM,y:lp.z/MM,z:lp.y/MM},n:{x:ln.x,y:ln.z,z:ln.y}};
}
function _screenDir(worldFrom,worldDir){ // 세계 방향 → 화면 방향(px, 정규화) + 길이 스케일
  camera.updateMatrixWorld(); const r=renderer.domElement.getBoundingClientRect();
  const s0=worldFrom.clone().project(camera), s1=worldFrom.clone().add(worldDir).project(camera);
  const sx=(s1.x-s0.x)*r.width/2, sy=-(s1.y-s0.y)*r.height/2, L=Math.hypot(sx,sy)||1;
  return {x:sx/L,y:sy/L,L};
}
// --- 밀기끌기 = 면 이동 (매스가 바뀐다) ---
function beginPPFace(hit,e){
  const obj=hit.object.userData.obj, g=hit.object.parent;
  const loc=_localOfHit(g,hit);
  const lean=_leanOf(obj); const ctx=obj.meta.z.ctx||ffCtx();
  const probe=JSON.parse(JSON.stringify(lean)); if(!massFindFace(probe,loc.p,loc.n,ctx)){ setStatus(statusLive,'이 면은 밀 수 없습니다'); return; }
  const gh=_ghostForMass(obj);
  const nW=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  ST.op={type:'pp',mode:'pushface',obj,g,lean,ctx,lp:loc.p,ln:loc.n,nW,c:hit.point.clone(),copy:!!(e&&(e.ctrlKey||e.metaKey)),ghost:gh.ghost,gwire:gh.gwire,z0:gh.z0,startY:null,startX:null,delta:0,origY:g.position.y};
  g.visible=false; _ghostSetLean(ST.op,JSON.parse(JSON.stringify(lean)));
  opOrbit(true);
  vcbShow(ST.op.copy?'밀기끌기 (Ctrl — 새 매스로 뽑기)':'밀기끌기 (면 이동 · 숫자=mm · −=안으로)',0,'mm');
}
function applyPPFace(clientY,clientX){
  const op=ST.op; if(op.startY===null){ op.startY=clientY; op.startX=clientX; return; }
  const sd=_screenDir(op.c,op.nW);
  const px=(clientX!=null?clientX:op.startX)-op.startX, py=clientY-op.startY;
  const mmpp=mmPerPx(op.c);
  let d=Math.round(((px*sd.x+py*sd.y)*mmpp)/10)*10;
  if(d===op.delta) return; op.delta=d;
  const L=JSON.parse(JSON.stringify(op.lean));
  if(d!==0){ if(op.copy){ /* 새 매스 미리보기: 원본은 그대로, 면만 밀어 보여준다 */ massPushFace(L,op.lp,op.ln,d,op.ctx); } else massPushFace(L,op.lp,op.ln,d,op.ctx); }
  _ghostSetLean(op,L);
  vcbShow((op.copy?'새로 뽑기':'밀기끌기')+(d<0?' (안으로)':''),Math.abs(d),'mm');
}
function commitPPFace(exact){
  const op=ST.op;
  let d=(exact!==null&&exact!==undefined)?Math.round(exact)*((op.delta<0&&exact>0)?-1:1):op.delta;
  const obj=op.obj,g=op.g,lp=op.lp,ln=op.ln,copy=op.copy;
  if(op.ghost) disposeGhost(op.ghost); g.visible=true;
  _opDone();
  if(!d||Math.abs(d)<10){ buildGrips(); setStatus(statusLive,'10mm 이상 끌거나 숫자를 넣어주세요 (−=안으로)'); return; }
  ST.lastPP=d; ST.lastPPFace={lp,ln};
  if(!copy) ffShiftParts(obj.id,q=>q.kind==='face'&&(q.ln.x*ln.x+q.ln.y*ln.y+q.ln.z*ln.z)>0.99&&Math.abs((lp.x-q.lp.x)*ln.x+(lp.y-q.lp.y)*ln.y+(lp.z-q.lp.z)*ln.z)<25,{x:ln.x*d,y:ln.y*d,z:ln.z*d});   // 선택한 면을 밀었으면 선택도 따라간다
  emitEdit({type:'edit',op:'pushface',kind:'masses',id:obj.id,floorId:'freeform',patch:{p:lp,n:ln,d,copy}});
  setLast('밀기끌기','mm',raw=>{ const v=parseLen(raw); if(v==null||!v) return false; emitEdit({type:'edit',op:'pushface',kind:'masses',id:obj.id,floorId:'freeform',patch:{p:lp,n:ln,d:Math.round(v),copy}}); return true; });
  setStatus(statusLive,'⇕ '+(copy?'새 매스 뽑기 ':'면 밀기끌기 ')+d+'mm (더블클릭=반복 · 숫자=재입력)');
}
// --- 꼭짓점 xy 이동 (Alt+그립) ---
function beginVertXY(mk,e){
  const gi=mk.userData.grip, o=gi.obj;
  const lean=_leanOf(o); const ctx=o.meta.z.ctx||ffCtx();
  const N=o.meta.z.top.length;
  const idxs=[gi.vi];
  if(e&&e.shiftKey){ const j=_gripNeighbor(o,gi.i,e.clientX,e.clientY); if(j!=null) idxs.push(N+j); }
  const gh=_ghostForMass(o);
  const wp=mk.position.clone();
  dragPlane.constant=-wp.y; rayFromEvent(e); const st=new THREE.Vector3(); ray.ray.intersectPlane(dragPlane,st);
  ST.op={type:'vxy',obj:o,g:gi.g,mk,idxs,i:gi.i,lean,ctx,ghost:gh.ghost,gwire:gh.gwire,z0:gh.z0,planeY:wp.y,start:st,dx:0,dy:0,moved:false,sticky:false};
  gi.g.visible=false; _ghostSetLean(ST.op,JSON.parse(JSON.stringify(lean)));
  opOrbit(true); vcbShow('꼭짓점 이동 (xy · Shift=모서리)',0,'mm');
  setStatus(statusLive,'✥ 꼭짓점 xy 이동 — 끌기 · 숫자=거리 · Esc=취소');
}
function applyVertXY(e){
  const op=ST.op; if(!op||op.type!=='vxy') return;
  dragPlane.constant=-op.planeY; rayFromEvent(e); const pt=new THREE.Vector3(); if(!ray.ray.intersectPlane(dragPlane,pt)) return;
  const dW=pt.clone().sub(op.start);
  const q=op.g.getWorldQuaternion(new THREE.Quaternion()).invert(); dW.applyQuaternion(q);
  let dx=Math.round(dW.x/MM/10)*10, dy=Math.round(dW.z/MM/10)*10;
  if(ST.axisLock==='x') dy=0; if(ST.axisLock==='y') dx=0;
  if(dx===op.dx&&dy===op.dy) return; op.dx=dx; op.dy=dy; op.moved=true;
  const L=JSON.parse(JSON.stringify(op.lean)); massVertXY(L,op.idxs,dx,dy,op.ctx); _ghostSetLean(op,L);
  vcbShow('꼭짓점 이동',Math.round(Math.hypot(dx,dy)),'mm');
}
function commitVertXY(exact){
  const op=ST.op; if(!op||op.type!=='vxy') return;
  let dx=op.dx,dy=op.dy;
  if(exact!==null&&exact!==undefined&&exact>0){ const L=Math.hypot(dx,dy); if(L>0){ dx=Math.round(dx/L*exact); dy=Math.round(dy/L*exact); } }
  if(op.ghost) disposeGhost(op.ghost); if(op.g) op.g.visible=true;
  const obj=op.obj, idxs=op.idxs.slice();
  _opDone();
  if(!dx&&!dy){ buildGrips(); return; }
  emitEdit({type:'edit',op:'setxy',kind:'masses',id:obj.id,floorId:'freeform',patch:{idxs,dx,dy}});
  setStatus(statusLive,'✥ 꼭짓점 이동 ('+dx+', '+dy+')');
}
// --- 면 위 도형 (shape3): 원·다각형·호·3점 호·파이·회전 사각형 ---
function shape3Start(e,fp,tool){
  const fr=_ffFrameFor(fp.o,fp.n); const uv=_ff3UV(e,fr); if(!uv) return;
  ST.op={type:'shape3',shape:tool,fr,pts:[uv],cur:uv,stage:1,line:null,sweep:0,prev:null};
  opOrbit(true); _shape3Ghost(ST.op);
  vcbShow({circle:'반지름',polygon:'반지름 ('+(ST.polySides||6)+'s)',arc:'끝점',arc3:'호 위의 점',pie:'반지름',rotrect:'첫 변 길이'}[tool]||'',' ','mm');
  setStatus(statusLive,'🧊 면 위에 '+FF_STATUS[tool]||tool);
}
function _shape3Poly(op){ // 지금 상태의 미리보기 다각형 (uv) 과 완성 여부
  const P=op.pts, c=op.cur, sh=op.shape, XY=q=>({x:q.u,y:q.v}), UV=q=>({u:q.x,v:q.y});
  if(sh==='circle'||sh==='polygon'){ const r=Math.hypot(c.u-P[0].u,c.v-P[0].v); const n=sh==='polygon'?(op.sides||ST.polySides||6):(ST.circleSides||24); const out=[]; for(let i=0;i<n;i++){ const t=i/n*Math.PI*2-Math.PI/2; out.push({u:Math.round(P[0].u+Math.cos(t)*r),v:Math.round(P[0].v+Math.sin(t)*r)}); } return {poly:out,closed:true,r}; }
  if(sh==='rotrect'){ if(op.stage===1) return {poly:[P[0],c],closed:false}; const a=XY(P[0]),b=XY(P[1]),L=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L; const w=Math.round(((c.u-b.x)*nx+(c.v-b.y)*ny)/10)*10; return {poly:[a,b,{x:Math.round(b.x+nx*w),y:Math.round(b.y+ny*w)},{x:Math.round(a.x+nx*w),y:Math.round(a.y+ny*w)}].map(UV),closed:true,w}; }
  if(sh==='arc'){ if(op.stage===1) return {poly:[P[0],c],closed:false}; const a=XY(P[0]),b=XY(P[1]),mx=(a.x+b.x)/2,my=(a.y+b.y)/2,L=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L; const bulge=Math.round(((c.u-mx)*nx+(c.v-my)*ny)/10)*10; return {poly:arcPts(a,b,bulge,ST.circleSides||24).map(UV),closed:false,bulge}; }
  if(sh==='arc3'){ if(op.stage===1) return {poly:[P[0],c],closed:false}; return {poly:_arcThrough(XY(P[0]),XY(P[1]),XY(c),ST.circleSides||24).map(UV),closed:false}; }
  if(sh==='pie'){ if(op.stage===1) return {poly:[P[0],c],closed:false}; const C=XY(P[0]),A=XY(P[1]); const r=Math.hypot(A.x-C.x,A.y-C.y); const a0=Math.atan2(A.y-C.y,A.x-C.x); const sw=Math.round(op.sweep/5)*5||5; const n=Math.max(4,Math.round(Math.abs(sw)/360*(ST.circleSides||24))); const arc=[]; for(let i=0;i<=n;i++){ const t=a0+sw*Math.PI/180*i/n; arc.push({u:Math.round(C.x+r*Math.cos(t)),v:Math.round(C.y+r*Math.sin(t))}); } return {poly:[P[0]].concat(arc),closed:true,sweep:sw}; }
  return {poly:P.concat([c]),closed:false};
}
function _shape3Ghost(op){
  const r=_shape3Poly(op); const pts=r.poly.slice(); if(r.closed&&pts.length>2) pts.push(pts[0]);
  const arr=new Float32Array(pts.length*3); pts.forEach((q,i)=>{ const w=planePt(op.fr,q.u,q.v); arr[i*3]=w.x*MM; arr[i*3+1]=w.z*MM; arr[i*3+2]=w.y*MM; });
  if(!op.line){ op.line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); op.line.renderOrder=950; op.line.frustumCulled=false; scene.add(op.line); }
  op.line.geometry.dispose(); const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(arr,3)); op.line.geometry=g; invalidate();
  return r;
}
function shape3Move(e){
  const op=ST.op; const uv=_ff3UV(e,op.fr); if(!uv) return;
  if(op.shape==='pie'&&op.stage===2){ const C=op.pts[0]; const ang=Math.atan2(uv.v-C.v,uv.u-C.u); if(op.prev!=null){ let d=ang-op.prev; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; op.sweep=Math.max(-359,Math.min(359,op.sweep+d*180/Math.PI)); } op.prev=ang; }
  op.cur=uv; const r=_shape3Ghost(op); _ff3Mark(uv.snap,planePt(op.fr,uv.u,uv.v),_ff3Seg(op.fr,uv),uv.proj);
  const ts=vcbSides(); if(ts&&op.shape==='polygon'){ op.sides=ts; ST.polySides=ts; }
  const lbl={circle:['반지름',r.r],polygon:['반지름',r.r],rotrect:op.stage===1?['첫 변',Math.hypot(uv.u-op.pts[0].u,uv.v-op.pts[0].v)]:['폭',Math.abs(r.w||0)],arc:op.stage===1?['현',Math.hypot(uv.u-op.pts[0].u,uv.v-op.pts[0].v)]:['볼록',r.bulge],arc3:['3점 호',0],pie:op.stage===1?['반지름',Math.hypot(uv.u-op.pts[0].u,uv.v-op.pts[0].v)]:['각도',r.sweep]}[op.shape]||['',0];
  vcbShow('면 위 '+lbl[0],Math.round(lbl[1]||0),op.shape==='pie'&&op.stage===2?'°':'mm');
}
function shape3Click(e){
  const op=ST.op; const uv=_ff3UV(e,op.fr); if(!uv) return; op.cur=uv;
  const need={circle:1,polygon:1,rotrect:2,arc:2,arc3:2,pie:2}[op.shape]||1;
  if(op.stage<need){ op.pts.push(uv); op.stage++; if(op.shape==='pie'){ op.sweep=0; op.prev=Math.atan2(uv.v-op.pts[0].v,uv.u-op.pts[0].u); } _shape3Ghost(op); return; }
  shape3Commit(vcbTyped());
}
function shape3Commit(exact){
  const op=ST.op; if(!op||op.type!=='shape3') return;
  if(exact!=null&&exact!==0){                              // 숫자 = 반지름·폭·볼록·각도
    const c=op.cur, P=op.pts;
    if(op.shape==='circle'||op.shape==='polygon'){ const L=Math.hypot(c.u-P[0].u,c.v-P[0].v)||1; op.cur={u:P[0].u+(c.u-P[0].u)/L*exact,v:P[0].v+(c.v-P[0].v)/L*exact}; }
    else if(op.shape==='pie'&&op.stage>=2) op.sweep=exact;
    else if(op.shape==='rotrect'&&op.stage>=2){ const a=P[0],b=P[1],L=Math.hypot(b.u-a.u,b.v-a.v)||1,nx=-(b.v-a.v)/L,ny=(b.u-a.u)/L; const s=(((c.u-b.u)*nx+(c.v-b.v)*ny)<0)?-1:1; op.cur={u:b.u+nx*exact*s,v:b.v+ny*exact*s}; }
    else if(op.shape==='arc'&&op.stage>=2){ const a=P[0],b=P[1],mx=(a.u+b.u)/2,my=(a.v+b.v)/2,L=Math.hypot(b.u-a.u,b.v-a.v)||1,nx=-(b.v-a.v)/L,ny=(b.u-a.u)/L; const s=(((c.u-mx)*nx+(c.v-my)*ny)<0)?-1:1; op.cur={u:mx+nx*exact*s,v:my+ny*exact*s}; }
    else if(op.stage<2){ op.pts.push(op.cur); op.stage++; _shape3Ghost(op); return; }
  }
  const r=_shape3Poly(op); const plane={origin:op.fr.origin,ex:op.fr.ex,ey:op.fr.ey,n:op.fr.n};
  const poly=r.poly.map(q=>({x:Math.round(q.u),y:Math.round(q.v)}));
  if(r.closed){ if(poly.length<3||Math.abs(polyArea(poly))<100*100){ setStatus(statusLive,'너무 작습니다'); return; } cancelOp(); emitEdit({type:'edit',op:'sketchpoly',floorId:'freeform',patch:{pts:poly,plane}}); setStatus(statusLive,'🧊 면 위 '+FF_STATUS[op.shape]+' → 면 (P 로 뽑기·파내기)'); ffAutoExtrude(_ffBagFor(plane)); return; }
  const ops=[]; for(let i=0;i<poly.length-1;i++){ const a=poly[i],b=poly[i+1]; if(Math.hypot(b.x-a.x,b.y-a.y)<10) continue; ops.push({op:'sketchline',floorId:'freeform',patch:{x1:a.x,y1:a.y,x2:b.x,y2:b.y,plane}}); }
  cancelOp(); if(sendBatch(ops,'면 위 호')) setStatus(statusLive,'🧊 면 위 호 → 선 '+ops.length+'조각');
}
// --- 회전 — 세워진 면 위의 각도기 (축 = 면의 법선) ---
function beginRotate3(g,obj,e,hit){
  const loc=_localOfHit(g,hit); const lean=_leanOf(obj); const ctx=obj.meta.z.ctx||ffCtx();
  const nW=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
  const c=hit.point.clone();
  const up=new THREE.Vector3(0,1,0); let ex=new THREE.Vector3().crossVectors(up,nW); if(ex.length()<1e-3) ex=new THREE.Vector3(1,0,0); ex.normalize(); const ey=new THREE.Vector3().crossVectors(nW,ex).normalize();
  const gh=_ghostForMass(obj);
  const pro=_protractor(0,0,0); pro.position.copy(c); pro.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),nW); scene.add(pro);
  ST.op={type:'rotate3',obj,g,lean,ctx,c,nW,ex,ey,lp:loc.p,ln:loc.n,ref:null,ang:0,stage:1,copy:!!(e&&(e.ctrlKey||e.metaKey)),ghost:gh.ghost,gwire:gh.gwire,z0:gh.z0,protractor:pro,
    line:new THREE.Line(new THREE.BufferGeometry().setFromPoints([c.clone(),c.clone()]),new THREE.LineBasicMaterial({color:0xE24CE2,depthTest:false}))};
  ST.op.line.renderOrder=999; scene.add(ST.op.line);
  if(!ST.op.copy) g.visible=false; _ghostSetLean(ST.op,JSON.parse(JSON.stringify(lean)));
  opOrbit(true); vcbShow('회전 (면 축): 기준 방향 클릭',0,'°');
  setStatus(statusLive,'↻ 세워진 면의 각도기 — 기준 방향 클릭 → 각도 (Shift=자유각 · 숫자=각도)');
}
function _rot3Angle(e){
  const op=ST.op; rayFromEvent(e); const pl=new THREE.Plane().setFromNormalAndCoplanarPoint(op.nW,op.c); const pt=new THREE.Vector3(); if(!ray.ray.intersectPlane(pl,pt)) return null;
  const pos=op.line.geometry.attributes.position; pos.setXYZ(1,pt.x,pt.y,pt.z); pos.needsUpdate=true;
  const d=pt.clone().sub(op.c); return Math.atan2(d.dot(op.ey),d.dot(op.ex))*180/Math.PI;
}
function applyRotate3(e,free){
  const op=ST.op; const a=_rot3Angle(e); if(a==null) return;
  if(op.stage===1){ invalidate(); return; }
  let d=a-op.ref; d=((d+180)%360+360)%360-180; if(!free) d=Math.round(d/15)*15;
  if(d===op.ang) return; op.ang=d;
  const L=JSON.parse(JSON.stringify(op.lean)); massRotate3(L,op.ln,op.lp,d,op.ctx); _ghostSetLean(op,L);
  vcbShow('회전 (면 축)'+(free?' 자유':' 15°'),Math.round(d),'°');
}
function rotate3Click(e){ const op=ST.op; const a=_rot3Angle(e); if(a==null) return; if(op.stage===1){ op.ref=a; op.stage=2; vcbShow('회전 각도 (Shift=자유)',0,'°'); return; } commitRotate3(vcbTyped()); }
function commitRotate3(exact){
  const op=ST.op; if(!op||op.type!=='rotate3') return;
  const d=(exact!==null&&exact!==undefined)?exact:op.ang; const obj=op.obj,g=op.g,lp=op.lp,ln=op.ln,copy=op.copy;
  if(op.ghost) disposeGhost(op.ghost); g.visible=true; _opDone();
  if(!d){ buildGrips(); return; }
  emitEdit({type:'edit',op:'rotate3',kind:'masses',id:obj.id,floorId:'freeform',patch:{axis:ln,about:lp,deg:d,copy}});
  setStatus(statusLive,'↻ 면 축 회전 '+Math.round(d)+'°'+(copy?' (복사)':''));
}
// --- 배율 그립 ---
function buildScaleGrips(){
  _gripInit(); clearGrips();
  const arr=[...ST.selSet]; if(arr.length!==1){ invalidate(); return; }
  const g=arr[0], o=g.userData.obj; if(!o||o.kind!=='mass'||o.locked||!ffEditable(o)) { invalidate(); return; }
  const m=FF&&FF.free.masses.find(x=>x&&x.id===o.id); if(!m){ invalidate(); return; }
  const B=massLocalBox(m,ffCtx()); const z0=_massZ0(o); const gs=_gripSize(o)/GRIP_R;
  const add=(p,a,kind,axes,col)=>{ const mk=glowSprite(col,kind==='corner'?9:8); mk.position.copy(_massWorld(o,p.x,p.y,p.z,z0)); mk.renderOrder=900; mk.userData.sgrip={obj:o,g,p,a,kind,axes}; gripsGrp.add(mk); };
  const xs=[B.x0,B.x1],ys=[B.y0,B.y1],zs=[B.z0,B.z1];
  xs.forEach((x,i)=>ys.forEach((y,j)=>zs.forEach((z,k)=>add({x,y,z},{x:xs[1-i],y:ys[1-j],z:zs[1-k]},'corner',['x','y','z'],0x2FA84F))));
  const cx=(B.x0+B.x1)/2,cy=(B.y0+B.y1)/2,cz=(B.z0+B.z1)/2;
  add({x:B.x1,y:cy,z:cz},{x:B.x0,y:cy,z:cz},'face',['x'],0xE24C4C); add({x:B.x0,y:cy,z:cz},{x:B.x1,y:cy,z:cz},'face',['x'],0xE24C4C);
  add({x:cx,y:B.y1,z:cz},{x:cx,y:B.y0,z:cz},'face',['y'],0xE24C4C); add({x:cx,y:B.y0,z:cz},{x:cx,y:B.y1,z:cz},'face',['y'],0xE24C4C);
  add({x:cx,y:cy,z:B.z1},{x:cx,y:cy,z:B.z0},'face',['z'],0x4C7DE2); add({x:cx,y:cy,z:B.z0},{x:cx,y:cy,z:B.z1},'face',['z'],0x4C7DE2);
  invalidate();
}
function beginScaleGrip(mk,e){
  const sg=mk.userData.sgrip, o=sg.obj; const lean=_leanOf(o); const ctx=o.meta.z.ctx||ffCtx(); const z0=_massZ0(o);
  const B=massLocalBox(FF.free.masses.find(x=>x.id===o.id),ctx);
  const about=(e&&(e.ctrlKey||e.metaKey))?{x:(B.x0+B.x1)/2,y:(B.y0+B.y1)/2,z:(B.z0+B.z1)/2}:sg.a;
  const A=_massWorld(o,about.x,about.y,about.z,z0), G=_massWorld(o,sg.p.x,sg.p.y,sg.p.z,z0);
  const r=renderer.domElement.getBoundingClientRect(); const sa=A.clone().project(camera), sgp=G.clone().project(camera);
  const ax=r.left+(sa.x+1)/2*r.width, ay=r.top+(1-sa.y)/2*r.height, gx=r.left+(sgp.x+1)/2*r.width, gy=r.top+(1-sgp.y)/2*r.height;
  const L=Math.hypot(gx-ax,gy-ay)||1;
  const gh=_ghostForMass(o);
  ST.op={type:'scaleg',obj:o,g:sg.g,lean,ctx,about,axes:sg.axes,kind:sg.kind,sa:{x:ax,y:ay},dir:{x:(gx-ax)/L,y:(gy-ay)/L},L,f:{x:1,y:1,z:1},base:{x:Math.abs(sg.p.x-about.x),y:Math.abs(sg.p.y-about.y),z:Math.abs(sg.p.z-about.z)},ghost:gh.ghost,gwire:gh.gwire,z0,moved:false,sticky:false};
  sg.g.visible=false; _ghostSetLean(ST.op,JSON.parse(JSON.stringify(lean)));
  opOrbit(true); vcbShow('배율 ('+(sg.kind==='corner'?'균등':sg.axes.join('')+' 축')+' · Ctrl=중심 기준)','1.00','×');
}
function applyScaleGrip(e){
  const op=ST.op; if(!op||op.type!=='scaleg') return;
  const t=((e.clientX-op.sa.x)*op.dir.x+(e.clientY-op.sa.y)*op.dir.y)/op.L;
  let f=Math.max(0.05,Math.round(t*20)/20);
  const F={x:1,y:1,z:1}; op.axes.forEach(k=>{F[k]=f;});
  if(F.x===op.f.x&&F.y===op.f.y&&F.z===op.f.z) return; op.f=F; op.moved=true;
  const L=JSON.parse(JSON.stringify(op.lean)); massScaleAbout(L,F,op.about,op.ctx); _ghostSetLean(op,L);
  vcbShow('배율',f.toFixed(2),'×');
}
function commitScaleGrip(exact){
  const op=ST.op; if(!op||op.type!=='scaleg') return;
  let F=Object.assign({},op.f);
  const raw=vcbRaw();
  if(raw){ const m3=raw.match(/^([\d.]+)\s*[,x*]\s*([\d.]+)\s*[,x*]\s*([\d.]+)$/); if(m3){ F={x:+m3[1],y:+m3[2],z:+m3[3]}; }
    else if(/(mm|cm|m)$/i.test(raw)){ const v=parseLen(raw); const k=op.axes[0]; if(v>0&&op.base[k]>0){ const s=v/op.base[k]; op.axes.forEach(a=>{F[a]=s;}); } }
    else if(exact>0){ op.axes.forEach(a=>{F[a]=exact;}); } }
  if(op.ghost) disposeGhost(op.ghost); op.g.visible=true; const obj=op.obj, about=op.about; _opDone();
  if(!(F.x>0&&F.y>0&&F.z>0)||(F.x===1&&F.y===1&&F.z===1)){ buildGrips(); return; }
  emitEdit({type:'edit',op:'scale',kind:'masses',id:obj.id,floorId:'freeform',patch:{sx:F.x,sy:F.y,sz:F.z,ax:about.x,ay:about.y,az:about.z}});
  const axes=op.axes.slice(), base=op.base;
  setLast('배율 (재입력: 배율 또는 치수 1500mm)','×',raw=>{ let G={x:1,y:1,z:1}; const m3=raw.match(/^([\d.]+)\s*[,x*]\s*([\d.]+)\s*[,x*]\s*([\d.]+)$/);
    if(m3){ G={x:+m3[1],y:+m3[2],z:+m3[3]}; } else if(/(mm|cm|m)$/i.test(raw)){ const v=parseLen(raw); const k=axes[0]; if(!(v>0&&base[k]>0)) return false; axes.forEach(a=>{G[a]=v/base[k];}); } else { const v=parseFloat(raw); if(!(v>0)) return false; axes.forEach(a=>{G[a]=v;}); }
    emitEdit({type:'edit',op:'scale',kind:'masses',id:obj.id,floorId:'freeform',patch:{sx:G.x,sy:G.y,sz:G.z,ax:about.x,ay:about.y,az:about.z}}); return true; });
  setStatus(statusLive,'⤢ 배율 ×'+[F.x,F.y,F.z].map(v=>v.toFixed(2)).join('·')+' — 숫자 입력=재입력 (1500mm=치수)');
}
// --- 뒤집기 · 외곽 셸 ---
function ffFlip(axis){ const ids=ffSelMassIds(); if(!ids.length){ setStatus(statusLive,'뒤집을 매스를 선택하세요'); return; } sendBatch(ids.map(id=>({op:'flip',kind:'masses',id,floorId:'freeform',patch:{axis}})),'뒤집기'); }
// --- 매스 면 · 벽면 위 면의 오프셋 ---
function offsetFaceClick(hit){
  const obj=hit&&hit.object.userData.obj; if(!obj||!hit.face) return false;
  let fr=null, poly=null;
  if(obj.kind==='sketchFace'&&obj.meta&&obj.meta.plane){ fr=_ffFrameFor(obj.meta.plane.origin,obj.meta.plane.n); poly=obj.meta.poly.map(p=>({x:p.x,y:p.y})); }
  else if(obj.kind==='mass'&&ffEditable(obj)){
    const g=hit.object.parent; const loc=_localOfHit(g,hit); const m=FF.free.masses.find(x=>x.id===obj.id); if(!m) return false;
    const S=massSolid(m,ffCtx()); let best=null,bd=25;
    S.faces.forEach(f=>{ const n=f.n||faceNormal(S.verts,f.vs); if(_vDot(n,loc.n)<0.8) return; const d=Math.abs(_vDot(_vSub(loc.p,S.verts[f.vs[0]]),n)); if(d<bd){bd=d;best=f;} });
    if(!best) return false;
    const th=(m.angle||0)*Math.PI/180,c=Math.cos(th),s=Math.sin(th),el=Number(m.elev_mm)||0;
    const abs=v=>({x:m.x+v.x*c-v.y*s,y:m.y+v.x*s+v.y*c,z:v.z+el});
    const nW=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const nA={x:nW.x,y:nW.z,z:nW.y}; const o0=abs(S.verts[best.vs[0]]);
    fr=_ffFrameFor(o0,nA); poly=best.vs.map(i=>{ const q=planeUV(fr,abs(S.verts[i])); return {x:q.u,y:q.v}; });
  } else return false;
  if(!fr||!poly||poly.length<3) return false;
  const pts3=poly.concat([poly[0]]).map(p=>{ const w=planePt(fr,p.x,p.y); return new THREE.Vector3(w.x*MM,w.z*MM,w.y*MM); });
  const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts3),new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln);
  ST.op={type:'offset3',fr,poly,d:0,line:ln};
  opOrbit(true); vcbShow('오프셋 거리 (+안쪽 / −바깥)',0,'mm'); return true;
}
function offset3Move(e){
  const op=ST.op; const uv=_ff3UV(e,op.fr); if(!uv) return;
  const raw={x:uv.u,y:uv.v}; const inside=MC3D._internal.pointInPoly(raw,op.poly);
  let bd=Infinity; const N=op.poly.length; for(let i=0;i<N;i++){ const q=closestOnSeg(raw,{x1:op.poly[i].x,y1:op.poly[i].y,x2:op.poly[(i+1)%N].x,y2:op.poly[(i+1)%N].y}); bd=Math.min(bd,Math.hypot(q.x-raw.x,q.y-raw.y)); }
  op.d=Math.round(bd/10)*10*(inside?1:-1);
  const pts=offsetPoly(op.poly,op.d); const pos=op.line.geometry.attributes.position;
  pts.concat([pts[0]]).forEach((p,i)=>{ const w=planePt(op.fr,p.x,p.y); pos.setXYZ(i,w.x*MM,w.z*MM,w.y*MM); }); pos.needsUpdate=true;
  vcbShow('오프셋 거리 (+안쪽 / −바깥)',op.d,'mm'); invalidate();
}
function commitOffset3(exact){
  const op=ST.op; if(!op||op.type!=='offset3') return;
  const d=(exact!=null&&exact!==0)?Math.round(exact):op.d; if(Math.abs(d)<10){ setStatus(statusLive,'오프셋 거리 10mm+'); return; }
  const pts=offsetPoly(op.poly,d); if(Math.abs(polyArea(pts))<50*50){ setStatus(statusLive,'오프셋 결과가 너무 작습니다'); return; }
  const plane={origin:op.fr.origin,ex:op.fr.ex,ey:op.fr.ey,n:op.fr.n}; cancelOp();
  emitEdit({type:'edit',op:'sketchpoly',floorId:'freeform',patch:{pts,plane}});
  setStatus(statusLive,'⧉ 면 오프셋 '+d+'mm → 면 위의 새 면 (P 로 뽑기/파내기)');
}
// --- 클릭한 면 정보 (개체 정보에 함께) ---
function ffFaceInfoAt(hit){
  const obj=hit&&hit.object.userData.obj; ST.faceInfo=null;
  if(!obj||obj.kind!=='mass'||!hit.face||!FF) return;
  const m=FF.free.masses.find(x=>x&&x.id===obj.id); if(!m) return;
  const loc=_localOfHit(hit.object.parent,hit);
  ST.faceInfo=massFaceInfo(m,loc.p,loc.n,ffCtx());
}

// ===========================================================================
// 스케치업 100% 3차 (2026-09-08) — 재질·표시·장면·가져오기·정보
//  · 재질: 색상 팔레트(스케치업 기본색) · 사용자 색 · 이미지 재질(문서에 저장) · Shift+페인트=같은 재질 전부 교체
//  · 지우개: 안내선·단면·주석도 지운다 · 선택만 보기(isolate) · 단면 목록(표시·활성·뒤집기·삭제)
//  · 장면 애니메이션 재생 · 그림자 날짜·밝기·어둡기 · 모델 정보 통계·정리 · OBJ 가져오기
//  · 개체 정보: 부피·그림자(드리움/받음)·숨김
// ===========================================================================
const SU_COLORS=[['#FFFFFF','흰색'],['#E6E6E6','밝은 회색'],['#B3B3B3','회색'],['#808080','중간 회색'],['#4D4D4D','짙은 회색'],['#1A1A1A','검정'],
  ['#FF3B30','빨강'],['#FF9500','주황'],['#FFCC00','노랑'],['#34C759','초록'],['#00C7BE','청록'],['#007AFF','파랑'],['#5856D6','남색'],['#AF52DE','보라'],['#FF2D55','분홍'],
  ['#8B6F47','목재'],['#C9B98E','모래'],['#D2B48C','황갈'],['#A0522D','벽돌'],['#7B8A8B','슬레이트'],['#B9C6D2','매스 기본'],['#F5F1EB','크림'],['#2F6193','강청'],['#6B8E23','올리브']];
function _ffMats(){ if(!FF) return []; if(!Array.isArray(FF.free.mats)) FF.free.mats=[]; return FF.free.mats; }
// 이미지 재질 (IMG_…) · 단색 재질 (C_RRGGBB) — floorMat 이 코드로 만든다

// ===========================================================================
// 재질 속성 · 원본 해상도 텍스처 (2026-09-10 대표 지시 "계속 개선해줘")
//  · 속성은 코드별로 FF.free.matProps 에 — 색(C_)·이미지(IMG_)·기본 마감 모두 같은 방식
//  · 이미지는 Supabase Storage 'freeform' 버킷에 원본(최대 2048px)으로 올리고 URL 만 문서에 둔다
//    (로그인이 없으면 종전처럼 512px data URL 로 문서 안에 — 오프라인에서도 작업은 된다)
// ===========================================================================
const FF_TEX_BUCKET='freeform';
const FF_SB='https://gdcfqbdgubgpzusbtftf.supabase.co';
const FF_ANON='sb_publishable_LU8lIQH-L5K8B1qwtezCUg_PkcCrAOQ';
const MAT_DEF={op:1,ro:0.82,me:0.02,rot:0};
const MAT_PRESETS={
  matte:{name:'무광',op:1,ro:0.95,me:0},
  satin:{name:'반광',op:1,ro:0.55,me:0},
  gloss:{name:'광택',op:1,ro:0.18,me:0},
  metal:{name:'금속',op:1,ro:0.28,me:0.9},
  glass:{name:'유리',op:0.28,ro:0.05,me:0},
};
function _ffMatKey(code){ const s=String(code||''); if(/^#/.test(s)) return 'C_'+s.slice(1).toUpperCase(); if(/^C_/i.test(s)) return 'C_'+s.slice(2).toUpperCase(); return s; }
function _ffMatProps(){ if(!FF) return {}; if(!FF.free.matProps||typeof FF.free.matProps!=='object') FF.free.matProps={}; return FF.free.matProps; }
function ffMatProp(code){ const p=_ffMatProps()[_ffMatKey(code)]||{}; return {op:p.op==null?MAT_DEF.op:p.op, ro:p.ro==null?MAT_DEF.ro:p.ro, me:p.me==null?MAT_DEF.me:p.me, rot:p.rot==null?MAT_DEF.rot:p.rot}; }
function ffSetMatProp(code,patch){
  if(!code||!FF) return;
  const key=_ffMatKey(code);
  const P=_ffMatProps(); const cur=Object.assign({},P[key]||{});
  Object.keys(patch||{}).forEach(k=>{ cur[k]=patch[k]; });
  P[key]=cur;
  texCache.delete(key); texCache.delete(code);            // 다음 그릴 때 새 재질로
  matCache.clear();                                       // 매스 통짜 색도 새 속성으로 다시
  _ffRetintCode(key);
  ffAutosave(); invalidate(true);
}
// 이미 화면에 붙어 있는 같은 코드의 재질을 그 자리에서 갱신 (다시 세우지 않고)
function _ffRetintCode(code){
  const p=ffMatProp(code);
  scene.traverse(o=>{
    const m=o.material; if(!m||!m.name) return;
    const arr=Array.isArray(m)?m:[m];
    const want=['MC_'+code,'MC_'+String(code).replace(/^C_/,'')];
    arr.forEach(mm=>{
      if(want.indexOf(mm.name)<0) return;
      mm.opacity=p.op; mm.transparent=p.op<0.999; mm.depthWrite=p.op>0.92;
      if('roughness' in mm) mm.roughness=p.ro;
      if('metalness' in mm) mm.metalness=p.me;
      if(mm.map){ mm.map.rotation=(p.rot||0)*Math.PI/180; mm.map.center.set(0.5,0.5); mm.map.needsUpdate=true; }
      mm.needsUpdate=true;
    });
  });
}
// 재질 하나를 그림 파일에서 만든다 — 로그인이면 Storage 원본, 아니면 문서 안 512px
async function ffAddImageMat(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=async()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    const S=parseFloat(window.prompt('이 그림 한 장이 덮는 실제 폭 (m)','1'))||1;
    const nm=window.prompt('재질 이름',f.name.replace(/\.[^.]+$/,''))||'이미지';
    const id='IMG_'+Date.now();
    setStatus(true,'🖼 재질 만드는 중…');
    let url=null, full=false;
    try{ url=await _ffTexUpload(f,id); full=!!url; }catch(_){ url=null; }
    if(!url) url=await _ffTexDataURL(f,512);               // 로그인 없음·업로드 실패 → 종전 방식
    _ffMats().push({id,name:nm,url,S,full});
    ffAutosave(); texCache.delete(id);
    ST.paint={cat:'img',code:id}; renderPaintPal(); if(ST.tool!=='paint') setTool('paint');
    setStatus(true,'🖼 재질 "'+nm+'" — 클릭해서 칠하기 ('+(full?'원본 해상도 · 클라우드':'512px · 문서 안')+')');
  };
  inp.click();
}
function _ffTexDataURL(file,max){
  return new Promise(res=>{
    const fr=new FileReader();
    fr.onload=()=>{ const img=new Image(); img.onload=()=>{
      const sc=Math.min(1,max/Math.max(img.width,img.height));
      const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(img.width*sc)); cv.height=Math.max(1,Math.round(img.height*sc));
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      res(cv.toDataURL('image/jpeg',0.82));
    }; img.onerror=()=>res(null); img.src=fr.result; };
    fr.onerror=()=>res(null);
    fr.readAsDataURL(file);
  });
}
// 원본(최대 2048px, JPEG 0.9) 을 버킷에 올리고 공개 URL 을 돌려준다. 실패면 null
async function _ffTexUpload(file,id){
  const sess=window.ECOREAN_AUTH&&window.ECOREAN_AUTH.session;
  const tok=sess&&sess.access_token; if(!tok) return null;
  const durl=await _ffTexDataURL(file,2048); if(!durl) return null;
  const blob=_ffDataURLBlob(durl); if(!blob) return null;
  const path=id+'.jpg';
  const r=await fetch(FF_SB+'/storage/v1/object/'+FF_TEX_BUCKET+'/'+path,{
    method:'POST',
    headers:{apikey:FF_ANON,Authorization:'Bearer '+tok,'Content-Type':'image/jpeg','x-upsert':'true','cache-control':'31536000'},
    body:blob});
  if(!r.ok) return null;
  return FF_SB+'/storage/v1/object/public/'+FF_TEX_BUCKET+'/'+path;
}
function _ffDataURLBlob(d){
  try{ const p=d.split(','); const mime=(p[0].match(/:(.*?);/)||[])[1]||'image/jpeg';
    const bin=atob(p[1]); const a=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i);
    return new Blob([a],{type:mime});
  }catch(_){ return null; }
}
function ffCustomMat(code){
  const P=ffMatProp(code);
  if(/^C_[0-9A-Fa-f]{6}$/.test(code)){
    const m=new THREE.MeshStandardMaterial({color:new THREE.Color('#'+code.slice(2)),roughness:P.ro,metalness:P.me,side:THREE.DoubleSide,
      transparent:P.op<0.999,opacity:P.op,depthWrite:P.op>0.92});
    m.name='MC_'+code.slice(2); return m; }
  if(/^IMG_/.test(code)){
    const rec=_ffMats().find(x=>x.id===code); if(!rec) return null;
    const tex=new THREE.Texture(); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.colorSpace=THREE.SRGBColorSpace;
    const S=Math.max(0.1,Number(rec.S)||1); tex.repeat.set(1/S,1/S); tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
    tex.center.set(0.5,0.5); tex.rotation=(P.rot||0)*Math.PI/180;
    const img=new Image(); if(/^https?:/.test(rec.url)) img.crossOrigin='anonymous';    // 버킷 텍스처
    img.onload=()=>{ tex.image=img; tex.needsUpdate=true; invalidate(true); }; img.src=rec.url;
    const m=new THREE.MeshStandardMaterial({map:tex,roughness:P.ro,metalness:P.me,side:THREE.DoubleSide,
      transparent:P.op<0.999,opacity:P.op,depthWrite:P.op>0.92});
    m.name='MC_'+code; return m;
  }
  return null;
}
function ffPaintPalExtra(pal){
  if(!FF_STANDALONE) return;
  let html='<div class="pp-cat">색상 (스케치업 기본)</div><div class="pp-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px">'+
    SU_COLORS.map(([hex,nm])=>'<button class="pp-it'+((ST.paint.cat==='color'&&ST.paint.code===hex)?' on':'')+'" data-cat="color" data-code="'+hex+'" title="'+nm+'" style="padding:3px;justify-content:center"><span class="pp-chip" style="background:'+hex+'"></span></button>').join('')+'</div>'+
    '<div class="p-row" style="display:flex;gap:6px;align-items:center;margin:6px 0"><label style="font-size:11px;color:var(--mute)">사용자 색</label><input type="color" id="pp-custom" value="'+((ST.paint.cat==='color'&&/^#/.test(ST.paint.code))?ST.paint.code:'#C9B98E')+'" style="width:44px;height:26px;background:transparent;border:1px solid var(--line);border-radius:6px"></div>';
  const mats=_ffMats();
  html+='<div class="pp-cat">내 재질 (이미지)</div><div class="pp-grid">'+mats.map(m=>'<button class="pp-it'+((ST.paint.cat==='img'&&ST.paint.code===m.id)?' on':'')+'" data-cat="img" data-code="'+m.id+'"><span class="pp-chip" style="background:url('+m.url+') center/cover"></span>'+m.name+' <span style="color:var(--mute);font-size:10px">'+m.S+'m</span><span data-del="'+m.id+'" title="삭제" style="margin-left:auto;color:var(--orange)">✕</span></button>').join('')+
    '<button class="btn sm" id="pp-addimg">＋ 이미지로 재질 만들기…</button></div>';
  pal.insertAdjacentHTML('afterbegin',html);
  pal.querySelectorAll('[data-cat="color"],[data-cat="img"]').forEach(b=>{ b.onclick=ev=>{ const del=ev.target&&ev.target.dataset&&ev.target.dataset.del; if(del){ ev.stopPropagation(); FF.free.mats=_ffMats().filter(x=>x.id!==del); ffAutosave(); renderPaintPal(); return; } ST.paint={cat:b.dataset.cat,code:b.dataset.code}; renderPaintPal(); if(ST.tool!=='paint') setTool('paint'); }; });
  const cc=pal.querySelector('#pp-custom'); if(cc) cc.oninput=()=>{ ST.paint={cat:'color',code:cc.value.toUpperCase()}; if(ST.tool!=='paint') setTool('paint'); setStatus(statusLive,'🎨 사용자 색 '+cc.value+' — 클릭해서 칠하기'); };
  const ai=pal.querySelector('#pp-addimg'); if(ai) ai.onclick=ffAddImageMat;
}
// 프리폼 매스 칠하기 — 색상·이미지·마감 코드 · Shift=같은 재질 전부 · Ctrl=면 하나
function ffPaintMass(hit,e,obj,c){
  const same=(a,b)=>((a.mat||'')===(b.mat||''))&&((a.mat?'':(a.color||'#B9C6D2').toUpperCase())===(b.mat?'':(b.color||'#B9C6D2').toUpperCase()));
  const patch=c.cat==='color'?{mat:null,color:c.code}:{mat:c.code};
  const src=FF.free.masses.find(x=>x&&x.id===obj.id);
  let tg=[obj];
  if(e&&e.shiftKey&&src) tg=FF.free.masses.filter(x=>x&&same(x,src));
  else if(ST.selSet.size>1&&ST.selSet.has(hit.object.parent)) tg=[...ST.selSet].map(g=>g.userData.obj).filter(o=>o&&o.kind==='mass'&&o.floorId==='freeform');
  emitEdit({type:'edit',op:'batch',label:'재질',ops:tg.map(o=>({op:'set',kind:'masses',id:o.id,floorId:'freeform',patch}))});
  setStatus(statusLive,'🪣 '+(c.cat==='color'?'색 '+c.code:c.code)+(tg.length>1?' × '+tg.length+(e&&e.shiftKey?' (같은 재질 전부)':''):'')+' · Ctrl+클릭=면 하나 · Shift+클릭=같은 재질 전부');
}
// --- 지우개: 안내선·단면·주석 ---
function eraseExtras(e){
  const raw=_planePt(e,0);
  if(raw&&ST.guides.length){ const mmpp=mmPerPx(new THREE.Vector3(raw.x*MM,0,raw.y*MM)); let bi=-1,bd=14*mmpp;
    ST.guides.forEach((g,i)=>{ const q=closestOnSeg(raw,g); const d=Math.hypot(q.x-raw.x,q.y-raw.y); if(d<bd){ bd=d; bi=i; } });
    if(bi>=0){ const g=ST.guides[bi]; if(g.line) scene.remove(g.line); ST.guides.splice(bi,1); rebuildGuideSnap(g.fid); invalidate(); setStatus(statusLive,'안내선 삭제'); return true; } }
  if(raw&&ST.guidePts&&ST.guidePts.length){ const mmpp=mmPerPx(new THREE.Vector3(raw.x*MM,0,raw.y*MM)); let bi=-1,bd=12*mmpp; ST.guidePts.forEach((g,i)=>{ const d=Math.hypot(g.x-raw.x,g.y-raw.y); if(d<bd){ bd=d; bi=i; } });
    if(bi>=0){ const g=ST.guidePts[bi]; if(g.mk) scene.remove(g.mk); ST.guidePts.splice(bi,1); rebuildGuideSnap(g.fid); invalidate(); setStatus(statusLive,'안내점 삭제'); return true; } }
  if(ST.sections.length){ rayFromEvent(e); const hs=ray.intersectObjects(ST.sections.map(s=>s.mesh),false); if(hs.length){ const sec=ST.sections.find(s=>s.mesh===hs[0].object); scene.remove(sec.mesh); ST.sections=ST.sections.filter(s=>s!==sec); applySections(); renderSections(); setStatus(statusLive,'단면 삭제'); return true; } }
  if(ST.annots.length){ rayFromEvent(e); const objs=[]; ST.annots.forEach(a=>a.traverse(o=>{ if(o.isSprite||o.isLine) objs.push(o); })); const hs=ray.intersectObjects(objs,false); if(hs.length){ let a=hs[0].object; while(a&&!ST.annots.includes(a)) a=a.parent; if(a){ scene.remove(a); ST.annots=ST.annots.filter(x=>x!==a); invalidate(); setStatus(statusLive,'주석 삭제'); return true; } } }
  return false;
}
// --- 단면 목록 (트레이) ---
function renderSections(){
  const el=$('sections'); if(!el) return;
  if(!ST.sections.length){ el.innerHTML='<div class="p-note">단면 없음 — 도구 ▸ 단면 으로 면을 클릭</div>'; return; }
  el.innerHTML=ST.sections.map((s,i)=>'<div class="sc-i" data-i="'+i+'"><button class="sc-go" style="text-align:left">'+(i+1)+'. 단면 '+(s.off?'('+Math.round(s.off)+'mm)':'')+'</button><button data-a="cut" title="자르기 활성/해제">'+(s.active===false?'▢':'✂')+'</button><button data-a="flip" title="뒤집기">⇄</button><button data-a="del" title="삭제">✕</button></div>').join('');
  el.querySelectorAll('.sc-i').forEach(d=>{ const s=ST.sections[+d.dataset.i];
    d.querySelector('.sc-go').onclick=()=>{ s.mesh.visible=true; ST.sectionsOn=true; zoomToPoint(s.p); };
    d.querySelector('[data-a="cut"]').onclick=()=>{ s.active=s.active===false; applySections(); renderSections(); };
    d.querySelector('[data-a="flip"]').onclick=()=>{ s.n.negate(); s.plane.setFromNormalAndCoplanarPoint(s.n.clone().negate(),s.mesh.position); s.mesh.lookAt(s.mesh.position.clone().add(s.n)); applySections(); setStatus(statusLive,'단면 뒤집기'); };
    d.querySelector('[data-a="del"]').onclick=()=>{ scene.remove(s.mesh); ST.sections=ST.sections.filter(x=>x!==s); applySections(); renderSections(); }; });
}
function zoomToPoint(p){ camPush(); const dir=camera.position.clone().sub(orbit.target).normalize(); const d=camera.position.distanceTo(orbit.target); orbit.target.copy(p); camera.position.copy(p).addScaledVector(dir,d); orbit.update(); invalidate(); camPush(); }
// --- 선택만 보기 (Isolate) ---
function setIsolate(on){
  if(on){ const keys=[...ST.selSet].map(keyOf).filter(Boolean); if(!keys.length){ setStatus(statusLive,'먼저 보고 싶은 것을 선택하세요'); return; } ST.isolate=new Set(keys); }
  else ST.isolate=null;
  refreshVisibility(); rebuildPickables(); refreshStylePanel(); setStatus(statusLive,on?'선택만 보기 — 나머지는 숨김 (보기▸선택만 보기 로 해제)':'전부 보기');
}
// --- 장면 애니메이션 ---
function scenePlay(on){
  if(!on){ if(ST.anim){ cancelAnimationFrame(ST.anim.raf); clearTimeout(ST.anim.tm); ST.anim=null; setStatus(statusLive,'애니메이션 정지'); } return; }
  const arr=scenesLoad(); if(arr.length<2){ setStatus(statusLive,'장면이 둘 이상 있어야 애니메이션이 됩니다'); return; }
  if(ST.mode!=='orbit') setMode('orbit');
  ST.anim={i:0,raf:0,tm:0};
  const step=()=>{ if(!ST.anim) return; const a=ST.anim; const from=a.i, to=(a.i+1)%arr.length; const sc=arr[to];
    const p0=camera.position.clone(), t0=orbit.target.clone(), p1=new THREE.Vector3().fromArray(sc.p), t1=new THREE.Vector3().fromArray(sc.t);
    const T0=performance.now(), D=1200;
    const tick=now=>{ if(!ST.anim) return; const k=Math.min(1,(now-T0)/D), s=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      camera.position.lerpVectors(p0,p1,s); orbit.target.lerpVectors(t0,t1,s); orbit.update(); invalidate();
      if(k<1) ST.anim.raf=requestAnimationFrame(tick); else { a.i=to; if(typeof sc.sunT==='number') setSunT(sc.sunT); ST.anim.tm=setTimeout(step,1800); } };
    ST.anim.raf=requestAnimationFrame(tick); };
  setStatus(statusLive,'▶ 장면 애니메이션 — 보기▸애니메이션 정지 · Esc'); step();
}
// --- 그림자: 날짜·밝기·어둡기 ---
function setSunDate(m){ ST.sunMonth=Math.max(0,Math.min(11,Math.round(m))); placeSun(); }
function setLightDark(light,dark){ if(light!=null){ ST.sunLight=light; sun.intensity=0.6+2.4*light; } if(dark!=null){ ST.sunDark=dark; hemi.intensity=0.3+1.6*(1-dark); } invalidate(true); }
// --- 모델 정보 통계 · 정리 ---
function ffStats(){
  if(!FF) return null; const f=FF.free; let pts=(f.sketchPts||[]).length,eds=(f.sketchEdges||[]).length,fcs=(f.sketchFaces||[]).length;
  (f.planes||[]).forEach(pl=>{ pts+=(pl.sketchPts||[]).length; eds+=(pl.sketchEdges||[]).length; fcs+=(pl.sketchFaces||[]).length; });
  const ms=f.masses||[]; let solidF=0; ms.forEach(m=>{ solidF+=Array.isArray(m.solidFaces)?m.solidFaces.length:((m.pts||[]).length+2); });
  const used=new Set(ms.map(m=>m.cid).filter(Boolean));
  return {masses:ms.length,faces:solidF,sketchPts:pts,sketchEdges:eds,sketchFaces:fcs,planes:(f.planes||[]).length,comps:(f.comps||[]).length,unused:(f.comps||[]).filter(c=>!used.has(c.id)).length,mats:_ffMats().length,groups:new Set(ms.map(m=>m.gid).filter(Boolean)).size};
}
function ffPurge(){ if(!FF) return; const ms=FF.free.masses||[]; const used=new Set(ms.map(m=>m.cid).filter(Boolean)); const before=(FF.free.comps||[]).length; FF.free.comps=(FF.free.comps||[]).filter(c=>used.has(c.id)); const usedM=new Set(); ms.forEach(m=>{ if(m.mat) usedM.add(m.mat); (m.solidFaces||[]).forEach(f=>{ if(f.mat) usedM.add(f.mat); }); }); const bm=_ffMats().length; FF.free.mats=_ffMats().filter(x=>usedM.has(x.id)); ffCommit('정리 — 컴포넌트 '+(before-FF.free.comps.length)+' · 재질 '+(bm-FF.free.mats.length)+' 제거'); renderAddPal(); renderPaintPal(); showModelInfo(true); }
// --- OBJ 가져오기 → 매스 (그룹 o/g 마다 하나) ---
function ffImportOBJ(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.obj';
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ const k=parseFloat(window.prompt('단위 배율 (1=mm · 1000=m · 25.4=inch)','1'))||1; const res=ffParseOBJ(String(fr.result),k); if(!res.length){ setStatus(statusLive,'OBJ 에서 면을 찾지 못했습니다'); return; }
    const ops=res.map(r=>({op:'massfromfaces',floorId:'freeform',patch:{faces:r.faces,name:r.name}})); if(sendBatch(ops,'OBJ 가져오기')) setStatus(statusLive,'📥 OBJ 가져오기 — 매스 '+res.length+'개 ('+f.name+')'); }; fr.readAsText(f); };
  inp.click();
}
function ffParseOBJ(txt,k){
  const V=[]; const groups=[]; let cur={name:'OBJ',faces:[]};
  txt.split(/\r?\n/).forEach(line=>{ const t=line.trim(); if(!t||t[0]==='#') return; const a=t.split(/\s+/);
    if(a[0]==='v'){ V.push({x:parseFloat(a[1])*k,y:-parseFloat(a[3])*k,z:parseFloat(a[2])*k}); }     // OBJ y-up → mm (x, y=plan(-z), z=y)
    else if(a[0]==='o'||a[0]==='g'){ if(cur.faces.length) groups.push(cur); cur={name:a.slice(1).join(' ')||'OBJ',faces:[]}; }
    else if(a[0]==='f'){ const ring=a.slice(1).map(s=>{ let i=parseInt(s.split('/')[0],10); if(i<0) i=V.length+1+i; return V[i-1]; }).filter(Boolean); if(ring.length>=3) cur.faces.push(ring); } });
  if(cur.faces.length) groups.push(cur);
  return groups.map(g=>({name:g.name.slice(0,40),faces:g.faces.map(r=>r.map(v=>({x:Math.round(v.x*10)/10,y:Math.round(v.y*10)/10,z:Math.round(v.z*10)/10})))}));
}

// ===========================================================================
// 스케치업 100% 5차 (2026-09-09 대표 지시 "점·선·면·객체가 모두 하나하나 다 선택될 수 있도록")
//  원시 기하처럼: 클릭 = 커서 아래 가장 작은 것 (꼭짓점 8px > 모서리 8px > 면) · Shift/Ctrl = 추가/제거
//  더블클릭 = 객체(매스) 전체 · 트리플클릭 = 연결된 전체(그룹) · 끌기 = 선택 상자(객체)
//  gid 그룹은 스케치업 그룹처럼: 클릭 = 그룹 전체, 더블클릭 = 그룹 안으로(나머지 흐림) → 안에서 요소 선택
//  선택한 요소: M 이동(면=법선 · ←→↑=축) · P 밀기끌기 · F 오프셋 · B 페인트(면) · Del 삭제 · 우클릭 · 개체 정보
//  요소는 인덱스가 아니라 로컬 좌표로 기억한다 (변환·재조립·이동 뒤에도 같은 자리를 다시 잡는다)
//  ST.parts = [{kind:'vert',id,p} | {kind:'edge',id,a,b} | {kind:'face',id,lp,ln,ring,n,area,role,mat}]
// ===========================================================================
let faceSelGrp=null;
function _fsInit(){ if(faceSelGrp) return; faceSelGrp=new THREE.Group(); faceSelGrp.name='facesel'; scene.add(faceSelGrp); }
function _fsClear(){ _fsInit(); while(faceSelGrp.children.length){ const c=faceSelGrp.children.pop(); if(c.geometry) c.geometry.dispose(); } invalidate(); }
function _massG(id){ return findGroup('freeform',id); }
function _massOf(id){ return FF&&FF.free.masses.find(x=>x&&x.id===id); }
function ffPartsOf(id){ return ST.parts.filter(p=>p.id===id); }
function ffWhole(obj){ return !!obj&&ST.selSet.has(_massG(obj.id))&&!ST.parts.some(p=>p.id===obj.id); }   // 객체로 통째 선택된 매스인가
function ffEnterEdit(id){ if(ST.editMass===id) return; ST.editMass=id; ST.parts=[]; _fsClear(); applyFaceStyle(); rebuildPickables(); setStatus(statusLive,'⛶ 그룹 안 — 클릭=면·모서리·꼭짓점 · Esc/빈 곳=밖으로'); }
function ffExitEdit(){ if(!ST.editMass) return; ST.editMass=null; ST.parts=[]; _fsClear(); applyFaceStyle(); rebuildPickables(); renderProps(ST.selected&&ST.selected.userData.obj); setStatus(statusLive,'그룹 밖으로'); }
const _sameP=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<1.5;
function _partEq(a,b){ if(a.kind!==b.kind||a.id!==b.id) return false; if(a.kind==='vert') return _sameP(a.p,b.p); if(a.kind==='edge') return (_sameP(a.a,b.a)&&_sameP(a.b,b.b))||(_sameP(a.a,b.b)&&_sameP(a.b,b.a)); return (a.ln.x*b.ln.x+a.ln.y*b.ln.y+a.ln.z*b.ln.z)>0.99&&Math.abs((a.lp.x-b.lp.x)*a.ln.x+(a.lp.y-b.lp.y)*a.ln.y+(a.lp.z-b.lp.z)*a.ln.z)<25; }
function _partPts(p){ return p.kind==='vert'?[p.p]:p.kind==='edge'?[p.a,p.b]:p.ring; }
// 선택 표시 — 꼭짓점 구슬 · 모서리 굵은 선 · 면 파란 판+테두리
function _fsDraw(){
  _fsClear();
  ST.parts.forEach(pt=>{ const g=_massG(pt.id); if(!g) return; const toW=p=>g.localToWorld(new THREE.Vector3(p.x*MM,p.z*MM,p.y*MM));
    if(pt.kind==='face'&&pt.ring&&pt.ring.length>=3){ const r=pt.ring; const tri=earTriangles(r); const pos=[]; tri.forEach(t=>t.forEach(k=>{ const w=toW(r[k]); pos.push(w.x,w.y,w.z); }));
      const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));
      const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0x4C7DE2,transparent:true,opacity:0.22,side:THREE.DoubleSide,depthTest:false})); mesh.renderOrder=940; faceSelGrp.add(mesh);
      const ln=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(r.map(toW)),new THREE.LineBasicMaterial({color:0x7FB2FF,depthTest:false,transparent:true,opacity:0.9})); ln.renderOrder=941; faceSelGrp.add(ln); }
    else if(pt.kind==='edge'){ const ln=new THREE.Line(new THREE.BufferGeometry().setFromPoints([toW(pt.a),toW(pt.b)]),new THREE.LineBasicMaterial({color:0x7FB2FF,depthTest:false,transparent:true,opacity:0.95})); ln.renderOrder=941; faceSelGrp.add(ln);
      [pt.a,pt.b].forEach(p=>{ const mk=glowSprite(0x7FB2FF,7); mk.position.copy(toW(p)); mk.renderOrder=942; faceSelGrp.add(mk); }); }
    else if(pt.kind==='vert'){ const mk=glowSprite(0xE24CE2,11); mk.position.copy(toW(pt.p)); mk.renderOrder=943; faceSelGrp.add(mk); } });
  invalidate();
}
// 재조립 뒤 같은 요소를 다시 잡는다
function ffReselectFace(){
  if(ST.editMass&&!_massOf(ST.editMass)){ ffExitEdit(); return; }
  const keep=[];
  ST.parts.forEach(pt=>{ const m=_massOf(pt.id); if(!m) return; const ctx=ffCtx();
    if(pt.kind==='face'){ const f=massFaceRing(m,pt.lp,pt.ln,ctx); if(f){ Object.assign(pt,{ring:f.ring,n:f.n,area:f.area,role:f.role,mat:f.mat}); keep.push(pt); } }
    else if(pt.kind==='edge'){ if(massEdges(m,ctx).some(e=>(_sameP(e.a,pt.a)&&_sameP(e.b,pt.b))||(_sameP(e.a,pt.b)&&_sameP(e.b,pt.a)))) keep.push(pt); }
    else if(pt.kind==='vert'){ if(massSolid(m,ctx).verts.some(v=>_sameP(v,pt.p))) keep.push(pt); } });
  ST.parts=keep; _fsDraw();
}
function _screenOf(g,p){ const r=renderer.domElement.getBoundingClientRect(); const w=g.localToWorld(new THREE.Vector3(p.x*MM,p.z*MM,p.y*MM)).project(camera); return {x:r.left+(w.x+1)/2*r.width,y:r.top+(1-w.y)/2*r.height,z:w.z}; }
function _vertNear(g,m,cx,cy,tol){ const S=massSolid(m,ffCtx()); camera.updateMatrixWorld(); g.updateWorldMatrix(true,false); let best=null,bd=tol||8; S.verts.forEach(v=>{ const s=_screenOf(g,v); if(s.z>1) return; const d=Math.hypot(s.x-cx,s.y-cy); if(d<bd){ bd=d; best={x:v.x,y:v.y,z:v.z,d}; } }); return best; }
// 레이가 빗나가도(모서리 실루엣) 화면에서 가까운 꼭짓점·모서리를 잡는다 — 보이는 프리폼 매스 전부
function ffPartNearScreen(cx,cy){
  if(!FF) return null; let best=null;
  FF.free.masses.forEach(m=>{ if(!m||m.locked) return; if(m.gid&&ST.editMass!==m.id) return; const g=_massG(m.id); if(!g||!g.visible) return;
    const v=_vertNear(g,m,cx,cy,8); if(v&&(!best||v.d<best.d)) best={d:v.d,g,obj:g.userData.obj,part:{kind:'vert',id:m.id,p:{x:v.x,y:v.y,z:v.z}}};
    if(!best||best.part.kind!=='vert'){ const ed=_edgeNear(g,m,cx,cy); if(ed&&(!best||ed.d<best.d)) best={d:ed.d,g,obj:g.userData.obj,part:{kind:'edge',id:m.id,a:{x:ed.a.x,y:ed.a.y,z:ed.a.z},b:{x:ed.b.x,y:ed.b.y,z:ed.b.z}}}; } });
  return best;
}
function _edgeNear(g,m,cx,cy){
  const E=massEdges(m,ffCtx()); camera.updateMatrixWorld(); g.updateWorldMatrix(true,false);
  let best=null,bd=8;
  E.forEach(e=>{ const a=_screenOf(g,e.a),b=_screenOf(g,e.b); if(a.z>1||b.z>1) return; const L2=(b.x-a.x)**2+(b.y-a.y)**2||1; let t=((cx-a.x)*(b.x-a.x)+(cy-a.y)*(b.y-a.y))/L2; t=Math.max(0,Math.min(1,t)); const d=Math.hypot(a.x+(b.x-a.x)*t-cx,a.y+(b.y-a.y)*t-cy); if(d<bd){ bd=d; best={a:e.a,b:e.b,d}; } });
  return best;
}
// 커서 아래 요소 하나 (꼭짓점 > 모서리 > 면)
function ffPartAt(hit,e){
  const obj=hit&&hit.object.userData.obj; if(!obj||obj.kind!=='mass'||!hit.face) return null;
  const g=hit.object.parent; const m=_massOf(obj.id); if(!m) return null;
  const v=_vertNear(g,m,e.clientX,e.clientY); if(v) return {kind:'vert',id:obj.id,p:v};
  const ed=_edgeNear(g,m,e.clientX,e.clientY); if(ed) return {kind:'edge',id:obj.id,a:{x:ed.a.x,y:ed.a.y,z:ed.a.z},b:{x:ed.b.x,y:ed.b.y,z:ed.b.z}};
  const loc=_localOfHit(g,hit); const f=massFaceRing(m,loc.p,loc.n,ffCtx()); if(!f) return null;
  return {kind:'face',id:obj.id,lp:loc.p,ln:loc.n,ring:f.ring,n:f.n,area:f.area,role:f.role,mat:f.mat};
}
function _partLabel(p){ return p.kind==='vert'?'꼭짓점 ('+Math.round(p.p.x)+', '+Math.round(p.p.y)+', '+Math.round(p.p.z)+')':p.kind==='edge'?'모서리 '+Math.round(Math.hypot(p.b.x-p.a.x,p.b.y-p.a.y,p.b.z-p.a.z))+'mm':(({floor:'바닥',ceil:'윗면',wall:'벽면',slope:'경사면'})[p.role]||'면')+' '+p.area.toFixed(2)+'㎡'; }
// 선택 도구 클릭 — 요소를 잡는다. 처리했으면 true (gid 그룹 밖에서 클릭한 그룹 멤버는 false → 그룹 전체 선택으로)
function ffPickInside(hit,e){
  let obj=hit&&hit.object.userData.obj, g=hit&&hit.object.parent, part=null;
  const nr=(!obj||obj.kind!=='mass')?ffPartNearScreen(e.clientX,e.clientY):null;          // 빗나간 레이 — 화면에서 가까운 꼭짓점·모서리
  if(nr){ obj=nr.obj; g=nr.g; part=nr.part; }
  if(ST.editMass&&(!obj||obj.kind!=='mass'||obj.id!==ST.editMass)) ffExitEdit();
  if(!obj||obj.kind!=='mass'||!ffEditable(obj)||obj.locked) return false;
  if(obj.meta&&obj.meta.gid&&ST.editMass!==obj.id) return false;               // 그룹은 통째로 (더블클릭=안으로)
  if(!part) part=ffPartAt(hit,e); if(!part) return false;
  const mod=!!(e&&(e.shiftKey||e.ctrlKey||e.metaKey));
  if(mod){ const i=ST.parts.findIndex(q=>_partEq(q,part)); if(i>=0) ST.parts.splice(i,1); else ST.parts.push(part); if(!ST.selSet.has(g)) select(g,{add:true}); }
  else { ST.parts=[part]; select(g,{silent:true}); }
  _fsDraw(); renderProps(obj);
  setStatus(statusLive,(mod?'선택 '+ST.parts.length+'개 — ':'')+_partLabel(part)+' · M 이동 · '+(part.kind==='face'?'P 밀기끌기 · F 오프셋 · B 페인트 · ':'')+'Del 삭제 · 더블클릭=객체 전체');
  return true;
}
// 객체 전체 선택 (더블클릭) · 연결된 전체 (트리플)
function ffSelectWhole(g,all){
  const obj=g&&g.userData.obj; if(!obj) return;
  ST.parts=ST.parts.filter(p=>p.id!==obj.id);
  if(all&&obj.meta&&obj.meta.gid){ selectGroups(_ffGroupOf(obj.meta.gid)); } else select(g);
  _fsDraw(); renderProps(obj,ST.selSet.size>1?{multi:_selObjs()}:null);
  setStatus(statusLive,(all?'연결된 전체':'객체 전체')+' 선택 — 끌기(M)=통째 이동 · 클릭=면·모서리·꼭짓점 하나');
}
// 이동 도구 진입 — 요소가 잡혀 있으면 그것을, 아니면 커서 아래 요소를 잡아 옮긴다. 객체 전체가 잡혀 있으면 false(통째 이동으로)
function ffMoveEntry(hit,e){
  let obj=hit&&hit.object.userData.obj;
  if(!obj||obj.kind!=='mass'){ const nr=ffPartNearScreen(e.clientX,e.clientY); if(!nr) return false; if(!ST.parts.some(p=>p.id===nr.obj.id)){ ST.parts=[nr.part]; select(nr.g,{silent:true}); _fsDraw(); } return beginMoveSel(e); }
  if(ffWhole(obj)) return false;
  if(obj.meta&&obj.meta.gid&&ST.editMass!==obj.id) return false;
  if(!ST.parts.length||!ST.parts.some(p=>p.id===obj.id)){ const part=ffPartAt(hit,e); if(!part) return false; ST.parts=[part]; select(hit.object.parent,{silent:true}); _fsDraw(); }
  return beginMoveSel(e);
}
// --- 선택한 요소 이동 (M) — 한 매스의 요소들을 함께 ---
function beginMoveSel(e){
  const parts=ST.parts; if(!parts.length) return false;
  const id=parts[0].id; if(parts.some(p=>p.id!==id)){ setStatus(statusLive,'요소 이동은 한 매스씩 — 다른 매스 요소를 선택에서 빼주세요'); return false; }
  const m=_massOf(id), g=_massG(id); if(!m||!g) return false;
  const obj=g.userData.obj; const lean=_leanOf(obj); const ctx=obj.meta.z.ctx||ffCtx();
  const pts=[]; parts.forEach(p=>_partPts(p).forEach(q=>{ if(!pts.some(r=>_sameP(r,q))) pts.push({x:q.x,y:q.y,z:q.z}); }));
  const gh=_ghostForMass(obj);
  const c=g.localToWorld(new THREE.Vector3(pts[0].x*MM,pts[0].z*MM,pts[0].y*MM));
  const faces=parts.filter(p=>p.kind==='face');
  const nW=(faces.length===1&&parts.length===1)?new THREE.Vector3(faces[0].n.x,faces[0].n.z,faces[0].n.y).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion())):null;
  ST.op={type:'movesel',obj,g,lean,ctx,pts,face:!!nW,nW,c,startX:e.clientX,startY:e.clientY,d:{x:0,y:0,z:0},moved:false,sticky:false,ghost:gh.ghost,gwire:gh.gwire,z0:gh.z0};
  g.visible=false; _ghostSetLean(ST.op,JSON.parse(JSON.stringify(lean)));
  opOrbit(true); vcbShow(nW?'면 이동 (법선 · ←→↑=축 고정 · 숫자=거리)':'요소 이동 (바닥 방향 · ↑=높이 · ←→=축)',0,'mm'); return true;
}
function applyMoveSel(e){
  const op=ST.op; if(!op||op.type!=='movesel') return;
  const q=op.g.getWorldQuaternion(new THREE.Quaternion()).invert();
  let d;
  const axisW=ST.axisLock==='x'?new THREE.Vector3(1,0,0):ST.axisLock==='y'?new THREE.Vector3(0,0,1):ST.axisLock==='z'?new THREE.Vector3(0,1,0):(op.face?op.nW:null);
  if(axisW){ const sd=_screenDir(op.c,axisW); const px=e.clientX-op.startX, py=e.clientY-op.startY; const t=Math.round(((px*sd.x+py*sd.y)*mmPerPx(op.c))/10)*10; const dW=axisW.clone().multiplyScalar(t*MM).applyQuaternion(q); d={x:Math.round(dW.x/MM),y:Math.round(dW.z/MM),z:Math.round(dW.y/MM)}; op.dist=t; }
  else{ dragPlane.constant=-op.c.y; rayFromEvent(e); const pt=new THREE.Vector3(); if(!ray.ray.intersectPlane(dragPlane,pt)) return; if(!op.start){ op.start=pt.clone(); return; } const dW=pt.clone().sub(op.start).applyQuaternion(q); d={x:Math.round(dW.x/MM/10)*10,y:Math.round(dW.z/MM/10)*10,z:0}; op.dist=Math.round(Math.hypot(d.x,d.y)); }
  if(d.x===op.d.x&&d.y===op.d.y&&d.z===op.d.z) return; op.d=d; op.moved=true;
  const L=JSON.parse(JSON.stringify(op.lean)); massMoveVerts(L,op.pts,d,op.ctx); _ghostSetLean(op,L);
  vcbShow((op.face?'면 이동':'요소 이동')+(ST.axisLock?' · 축 고정':''),Math.abs(op.dist||0),'mm');
}
function ffShiftParts(id,pred,d){ ST.parts.forEach(p=>{ if(p.id!==id||!pred(p)) return; const sh=q=>({x:q.x+d.x,y:q.y+d.y,z:q.z+d.z}); if(p.kind==='vert') p.p=sh(p.p); else if(p.kind==='edge'){ p.a=sh(p.a); p.b=sh(p.b); } else p.lp=sh(p.lp); }); }
function commitMoveSel(exact){
  const op=ST.op; if(!op||op.type!=='movesel') return;
  let d=op.d;
  if(exact!=null&&exact!==0){ const L=Math.hypot(d.x,d.y,d.z); if(L>0){ const k=exact/L; d={x:Math.round(d.x*k),y:Math.round(d.y*k),z:Math.round(d.z*k)}; } else if(op.face){ const q=op.g.getWorldQuaternion(new THREE.Quaternion()).invert(); const dW=op.nW.clone().multiplyScalar(exact*MM).applyQuaternion(q); d={x:Math.round(dW.x/MM),y:Math.round(dW.z/MM),z:Math.round(dW.y/MM)}; } }
  if(op.ghost) disposeGhost(op.ghost); op.g.visible=true; const obj=op.obj,pts=op.pts; _opDone();
  if(!d.x&&!d.y&&!d.z){ _fsDraw(); return; }
  ffShiftParts(obj.id,()=>true,d);
  emitEdit({type:'edit',op:'moveverts',kind:'masses',id:obj.id,floorId:'freeform',patch:{pts,d}});
  setStatus(statusLive,'✥ 요소 이동 ('+d.x+', '+d.y+', '+d.z+')');
}
function ffDeleteSel(){
  if(!ST.parts.length) return false;
  const ops=ST.parts.map(p=>p.kind==='face'?{op:'delface',kind:'masses',id:p.id,floorId:'freeform',patch:{p:p.lp,n:p.ln}}:p.kind==='edge'?{op:'deledge',kind:'masses',id:p.id,floorId:'freeform',patch:{a:p.a,b:p.b}}:{op:'delvert',kind:'masses',id:p.id,floorId:'freeform',patch:{p:p.p}});
  ST.parts=[]; _fsClear(); sendBatch(ops,'요소 삭제'); return true;
}
function ffReverseSel(){ const fs=ST.parts.filter(p=>p.kind==='face'); if(!fs.length) return; sendBatch(fs.map(f=>({op:'reverseface',kind:'masses',id:f.id,floorId:'freeform',patch:{p:f.lp,n:f.ln}})),'면 뒤집기'); }
// 페인트 — 클릭한 면이 선택 안에 있으면 선택한 면 전부, 아니면 그 면만
function ffPaintFaces(hit,e,obj,c){
  const g=hit.object.parent; const loc=_localOfHit(g,hit); const code=c.cat==='color'?('C_'+c.code.replace('#','')):c.code;
  const here={kind:'face',id:obj.id,lp:loc.p,ln:loc.n};
  const sel=ST.parts.filter(p=>p.kind==='face'); const inSel=sel.some(p=>_partEq(p,here));
  const tg=inSel?sel:[here];
  sendBatch(tg.map(f=>({op:'facemat',kind:'masses',id:f.id,floorId:'freeform',patch:{p:f.lp,n:f.ln,mat:code}})),'면 재질');
  setStatus(statusLive,'🪣 면 '+tg.length+'개에 '+(c.cat==='color'?c.code:c.code)+' (객체 전체는 더블클릭으로 잡고 칠하기)');
}
function ffFaceProps(obj){
  const parts=ffPartsOf(obj.id); const others=ST.parts.length-parts.length;
  let html;
  if(ST.parts.length>1){ const cnt={vert:0,edge:0,face:0}; ST.parts.forEach(p=>cnt[p.kind]++); const area=ST.parts.filter(p=>p.kind==='face').reduce((a,p)=>a+p.area,0);
    html='<h4>'+ST.parts.length+'개 요소</h4><div class="p-sub">면 '+cnt.face+' · 모서리 '+cnt.edge+' · 꼭짓점 '+cnt.vert+(others?' · 다른 매스 '+others:'')+'</div>'+(cnt.face?`<div class="p-row"><label>면적 합</label><span style="font-size:12px"><b>${area.toFixed(3)} ㎡</b></span></div>`:'')+
      `<div class="p-btns"><button class="btn" data-a="frev">⇄ 면 뒤집기</button><button class="btn danger" data-a="fdel">🗑 삭제 (Del)</button></div><div class="p-note">M=함께 이동 · B=선택한 면 전부 페인트 · Shift+클릭=추가/제거 · Esc=해제</div>`; }
  else { const p=parts[0];
    if(p.kind==='face'){ html=`<h4>면</h4><div class="p-sub">${obj.name||'매스'} · ${({floor:'바닥',ceil:'윗면',wall:'벽면',slope:'경사면'})[p.role]||p.role} · ${p.ring.length}각</div>`;
      html+=`<div class="p-row"><label>면적</label><span style="font-size:12px"><b>${p.area.toFixed(3)} ㎡</b></span></div><div class="p-row"><label>법선</label><span style="font-size:11px">(${p.n.x.toFixed(2)}, ${p.n.y.toFixed(2)}, ${p.n.z.toFixed(2)})</span></div>`;
      html+=`<div class="p-row"><label>재질</label><span style="font-size:11.5px">${p.mat?'🪣 '+p.mat:'(매스 전체 재질)'}${p.mat?' <button class="btn" data-a="fmatclr" style="padding:1px 8px;margin-left:6px">지움</button>':''}</span></div>`;
      html+=`<div class="p-btns"><button class="btn" data-a="fpp">⇕ 밀기끌기…</button><button class="btn" data-a="frev">⇄ 면 뒤집기</button></div><div class="p-btns"><button class="btn danger" data-a="fdel">🗑 면 삭제 (Del)</button><button class="btn" data-a="whole">▣ 객체 전체 선택</button></div>`;
      html+=`<div class="p-note">M=면 이동(법선, ←→↑=축, 숫자=거리) · P=밀기끌기 · F=오프셋 · B=이 면만 페인트 · Del=면 삭제(열린 껍질) · 더블클릭=객체 전체</div>`; }
    else if(p.kind==='edge'){ const L=Math.hypot(p.b.x-p.a.x,p.b.y-p.a.y,p.b.z-p.a.z); html=`<h4>모서리</h4><div class="p-sub">${obj.name||'매스'}</div><div class="p-row"><label>길이</label><span style="font-size:12px"><b>${Math.round(L)} mm</b></span></div>`;
      html+=`<div class="p-row"><label>끝점</label><span style="font-size:11px">(${Math.round(p.a.x)}, ${Math.round(p.a.y)}, ${Math.round(p.a.z)}) → (${Math.round(p.b.x)}, ${Math.round(p.b.y)}, ${Math.round(p.b.z)})</span></div>`;
      html+=`<div class="p-btns"><button class="btn danger" data-a="fdel">🗑 모서리 삭제 (Del)</button><button class="btn" data-a="whole">▣ 객체 전체 선택</button></div><div class="p-note">M=모서리 이동(바닥 방향, ↑=높이) · Del=모서리와 붙은 면 삭제</div>`; }
    else { html=`<h4>꼭짓점</h4><div class="p-sub">${obj.name||'매스'}</div><div class="p-row"><label>좌표</label><span style="font-size:12px"><b>${Math.round(p.p.x)}, ${Math.round(p.p.y)}, ${Math.round(p.p.z)}</b> mm (매스 기준)</span></div>`;
      html+=`<div class="p-btns"><button class="btn danger" data-a="fdel">🗑 꼭짓점 삭제 (Del)</button><button class="btn" data-a="whole">▣ 객체 전체 선택</button></div><div class="p-note">M=꼭짓점 이동(바닥 방향, ↑=높이, ←→=축) · Del=붙은 면 삭제</div>`; } }
  props.innerHTML=html; props.style.display='block';
  props.querySelectorAll('[data-a]').forEach(el=>{ el.onclick=()=>{ const a=el.dataset.a; const f=parts[0];
    if(a==='fdel') ffDeleteSel(); else if(a==='frev') ffReverseSel(); else if(a==='whole') ffSelectWhole(_massG(obj.id));
    else if(a==='fmatclr') emitEdit({type:'edit',op:'facemat',kind:'masses',id:obj.id,floorId:'freeform',patch:{p:f.lp,n:f.ln,mat:null}});
    else if(a==='fpp'){ const v=parseLen(window.prompt('밀기끌기 (mm, −=안으로)',String(ST.lastPP||300))); if(v) emitEdit({type:'edit',op:'pushface',kind:'masses',id:obj.id,floorId:'freeform',patch:{p:f.lp,n:f.ln,d:Math.round(v)}}); } }; });
}
function ffFaceCtxItems(e){
  const items=[]; const p=ST.parts[0]; if(!p) return items; const g=_massG(p.id);
  items.push(['pinfo',(ST.parts.length>1?ST.parts.length+'개 요소':_partLabel(p)),()=>openTraySec('info')]); items.push(['-']);
  if(p.kind==='face'&&ST.parts.length===1){ items.push(['fpp','밀기끌기…',()=>{ const v=parseLen(window.prompt('밀기끌기 (mm, −=안으로)',String(ST.lastPP||300))); if(v) emitEdit({type:'edit',op:'pushface',kind:'masses',id:p.id,floorId:'freeform',patch:{p:p.lp,n:p.ln,d:Math.round(v)}}); }]); items.push(['foff','오프셋 (F)',()=>setTool('offset')]); }
  if(ST.parts.some(q=>q.kind==='face')){ items.push(['frev','면 뒤집기',ffReverseSel]); if(p.kind==='face'&&p.mat) items.push(['fmc','면 재질 지움',()=>emitEdit({type:'edit',op:'facemat',kind:'masses',id:p.id,floorId:'freeform',patch:{p:p.lp,n:p.ln,mat:null}})]); }
  items.push(['-']); items.push(['pdel','삭제\tDel',ffDeleteSel]);
  items.push(['-']); items.push(['whole','객체 전체 선택',()=>ffSelectWhole(g)]);
  if(ST.editMass) items.push(['fexit','그룹 밖으로\tEsc',ffExitEdit]);
  return items;
}

// ---------------------------------------------------------------------------
// 재질 (전역 캐시 — 층 증분 재조립에서도 유지)
// ---------------------------------------------------------------------------
const matCache=new Map();
function matFor(p){
  // 단독 프리폼: 재질 손보기(투명도·거칠기·금속감)를 매스 통짜 색에도 적용한다
  let ff=null;
  if(FF_STANDALONE&&FF&&p.color&&!p.glass&&!p.emissive){
    const c=_ffMatKey(p.color);
    if(_ffMatProps()[c]) ff=ffMatProp(c);
  }
  const key=[p.color,p.opacity??1,p.emissive?(p.lit===false?2:1):0,p.glass?1:0,ff?ff.op+':'+ff.ro+':'+ff.me:''].join('|');   // 2026-09-09: 꺼진 등은 별도 재질
  let m=matCache.get(key);
  if(m) return m;
  const col=new THREE.Color(p.color||'#CCCCCC');
  if(p.glass){
    m=new THREE.MeshPhysicalMaterial({color:col,transparent:true,opacity:p.opacity??0.35,roughness:0.08,metalness:0,side:THREE.DoubleSide,depthWrite:false});
  }else{
    m=new THREE.MeshStandardMaterial({color:col,roughness:0.86,metalness:0.02,transparent:(p.opacity??1)<1,opacity:p.opacity??1});
    if(p.emissive){
      // 2026-09-09 대표 지시: 회로가 끈 등은 발광하지 않는다 — 갓만 살짝 어두운 실물처럼
      const litOK=p.lit!==false;
      m.emissive=col.clone(); m.emissiveIntensity=(ST.lightsOn&&litOK)?1.4:0; m.roughness=0.5;
      m.userData.emiss=true; m.userData.lit=litOK;
      if(!litOK) m.color.multiplyScalar(0.55);   // 꺼진 갓 — 소등된 실등의 잿빛
    }
  }
  if(ff){ m.roughness=ff.ro; m.metalness=ff.me; m.opacity=ff.op; m.transparent=ff.op<0.999; m.depthWrite=ff.op>0.92; }
  m.name='MC_'+String(p.color||'CCC').replace('#','')+(p.glass?'_glass':'')+(p.emissive?(p.lit===false?'_emitoff':'_emit'):''); // Blender 재질 매핑용 이름
  matCache.set(key,m);
  return m;
}
// --- 바닥 프로시저럴 텍스처 (2026-09-03) — 원목 널결·타일 줄눈·마블 결, 재질 코드별 캔버스 생성 ---
const texCache=new Map();
function _texCanvas(code){
  const c=document.createElement('canvas'); c.width=256; c.height=256;
  const x=c.getContext('2d');
  const base=MC3D.FLOOR_COLORS[code]||MC3D.WALL_COLORS[code]||'#C9B8A3';
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
  if(/^(C_|IMG_)/.test(code)){ m=ffCustomMat(code); if(m){ texCache.set(code,m); return m; } return matFor({color:'#B9C6D2'}); }   // 스케치업 100% 3차: 색상·이미지 재질
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
  if(FF_STANDALONE&&obj&&(obj.kind==='sketchEdge'||obj.kind==='sketchPt')&&(p.t==='box'||p.t==='cyl'||p.t==='edge3'||p.t==='pt3')){
    // 글로우: 선 = 얇은 발광 헤일로(집을 수 있게 r 14mm) + 1px 코어 · 점 = 화면 고정 발광 스프라이트
    const col=p.color||'#E8D48B';
    if(p.t==='box'||p.t==='edge3'){
      let a,b;
      if(p.t==='box'){ a=new THREE.Vector3((p.x-p.w/2)*MM,(p.z+p.h/2)*MM,p.y*MM); b=new THREE.Vector3((p.x+p.w/2)*MM,(p.z+p.h/2)*MM,p.y*MM); }
      else { a=new THREE.Vector3(p.a.x*MM,p.a.z*MM,p.a.y*MM); b=new THREE.Vector3(p.b.x*MM,p.b.z*MM,p.b.y*MM); }
      const L=a.distanceTo(b); if(L<1e-6) return null;
      mesh=new THREE.Mesh(geoCyl,_pickMat()); mesh.scale.set(14*MM,L,14*MM); mesh.userData.pick=true;      // 집기용(안 보임)
      mesh.position.copy(a.clone().add(b).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
      const halo=new THREE.Mesh(geoCyl,haloMat(col)); halo.scale.set(4/14,1,4/14); halo.raycast=()=>{}; mesh.add(halo);   // 얇은 발광
      const core=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-0.5,0),new THREE.Vector3(0,0.5,0)]),new THREE.LineBasicMaterial({color:new THREE.Color(col),transparent:true,opacity:0.92}));
      core.scale.set(1/(14*MM),1,1/(14*MM)); core.raycast=()=>{}; mesh.add(core);
      mesh.renderOrder=6;
    } else {
      mesh=glowSprite(new THREE.Color(col).getHex(),7);
      mesh.material.opacity=0.95;
      if(p.t==='cyl') mesh.position.set(p.x*MM,(p.z+p.h/2)*MM,p.y*MM); else mesh.position.set(p.p.x*MM,p.p.z*MM,p.p.y*MM);
      mesh.renderOrder=7;
    }
    mesh.castShadow=false; mesh.receiveShadow=false; mesh.userData.obj=obj; mesh.name=obj.name||obj.kind; return mesh;
  }
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
    if(obj.kind==='sketchFace'){ mesh.renderOrder=5; m.depthWrite=false; }   // 스케치 면은 바닥 위에 살짝 떠서 항상 보이게
  }else if(p.t==='prism'){                                   // 2026-09-04 매스 = 면 + Z (다각형 기둥)
    if(!p.pts||p.pts.length<3) return null;
    const shape=new THREE.Shape(p.pts.map(q=>new THREE.Vector2(q.x*MM,-q.y*MM)));
    const g=new THREE.ExtrudeGeometry(shape,{depth:Math.max(p.h,1)*MM,bevelEnabled:false});
    mesh=new THREE.Mesh(g,p.mcode?floorMat(p.mcode):matFor(p));   // 프리폼 재질 (렌더 전용)
    mesh.rotation.x=-Math.PI/2;                              // 로컬 +z(깊이) → 세계 +y(위)
    mesh.position.y=(p.z||0)*MM;
  }else if(p.t==='face3'){
    // 스케치 평면 위의 면 (2026-09-07 프리폼 2단계) - uv 로 삼각화(오목 지원)하고 평면 틀로 세운다
    if(!p.uv||p.uv.length<3||!p.plane) return null;
    const shape=new THREE.Shape(p.uv.map(q=>new THREE.Vector2(q.x,q.y)));
    const g=new THREE.ShapeGeometry(shape);
    const O=p.plane.origin,EX=p.plane.ex,EY=p.plane.ey;
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const u=pos.getX(i),v=pos.getY(i);
      pos.setXYZ(i,(O.x+EX.x*u+EY.x*v)*MM,(O.z+EX.z*u+EY.z*v)*MM,(O.y+EX.y*u+EY.y*v)*MM);
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    const fm=matFor(p).clone(); fm.side=THREE.DoubleSide; fm.depthWrite=false;
    mesh=new THREE.Mesh(g,fm);
    mesh.renderOrder=6;
  }else if(p.t==='face3h'){
    // 구멍 뚫린 면 (2026-09-07 프리폼 ③ 파내기) — 바깥 고리 + 구멍 고리들을 평면 틀로 세운다
    if(!p.outer||p.outer.length<3||!p.plane) return null;
    const sh=new THREE.Shape(p.outer.map(q=>new THREE.Vector2(q.x,q.y)));
    (p.holes||[]).forEach(h=>{ if(h&&h.length>=3) sh.holes.push(new THREE.Path(h.map(q=>new THREE.Vector2(q.x,q.y)))); });
    const g=new THREE.ShapeGeometry(sh);
    const O=p.plane.origin,EX=p.plane.ex,EY=p.plane.ey;
    const pos=g.attributes.position;
    for(let i=0;i<pos.count;i++){
      const u=pos.getX(i),v=pos.getY(i);
      pos.setXYZ(i,(O.x+EX.x*u+EY.x*v)*MM,(O.z+EX.z*u+EY.z*v)*MM,(O.y+EX.y*u+EY.y*v)*MM);
    }
    if(p.mcode){ const uva=g.attributes.uv; for(let i=0;i<uva.count;i++) uva.setXY(i,uva.getX(i)*MM,uva.getY(i)*MM); }
    g.computeVertexNormals(); g.computeBoundingSphere();
    const hm=(p.mcode?floorMat(p.mcode):matFor(p)).clone(); hm.side=THREE.DoubleSide;
    mesh=new THREE.Mesh(g,hm);
  }else if(p.t==='edge3'){
    const a=new THREE.Vector3(p.a.x*MM,p.a.z*MM,p.a.y*MM);
    const b=new THREE.Vector3(p.b.x*MM,p.b.z*MM,p.b.y*MM);
    const L=a.distanceTo(b); if(L<1e-6) return null;
    mesh=new THREE.Mesh(geoCyl,matFor(p));
    mesh.scale.set(Math.max(p.r||16,1)*MM,L,Math.max(p.r||16,1)*MM);
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
  }else if(p.t==='pt3'){
    mesh=new THREE.Mesh(geoSph,matFor(p));
    mesh.scale.setScalar(Math.max(p.r||30,1)*MM);
    mesh.position.set(p.p.x*MM,p.p.z*MM,p.p.y*MM);
  }else if(p.t==='mesh'){
    // 2026-09-07 대표 지시 "나는 z 값을 원한다" — 꼭짓점마다 높이가 다른 자유 다면체.
    //  빗천장·박공처럼 각기둥으로 안 되는 것이 여기로 온다. 좌표는 평면과 같은 mm
    //  (x 오른쪽 · y 아래 · z 위) 이고, 세계 좌표로 (x, z, y) 에 놓는다 — 각기둥과 같은 규약.
    if(!p.verts||!p.tris||!p.tris.length) return null;
    const pos=new Float32Array(p.tris.length*9);
    let k=0;
    // 좌표 규약 (x,y↓,z↑)→세계 (x,z,y) 는 반사라 감김이 뒤집힌다 — 삼각형을 거꾸로 감아 법선을 바깥으로
    //  (단면·면 밀기·면 재질이 hit.face.normal 을 믿는다 — 다면체 매스에서 안쪽을 가리켰다)
    for(const t of p.tris){
      for(let j=0;j<3;j++){
        const v=p.verts[t[j===1?2:j===2?1:0]];
        if(!v) return null;
        pos[k++]=v.x*MM; pos[k++]=v.z*MM; pos[k++]=v.y*MM;
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    if(p.mcode){                                             // 프리폼 재질 — 삼각형 주법선 축으로 박스 투영 UV (m 단위)
      const uv=new Float32Array(pos.length/3*2);
      for(let t=0;t<pos.length;t+=9){
        const ux=pos[t+3]-pos[t],uy=pos[t+4]-pos[t+1],uz=pos[t+5]-pos[t+2];
        const vx=pos[t+6]-pos[t],vy=pos[t+7]-pos[t+1],vz=pos[t+8]-pos[t+2];
        const nx=Math.abs(uy*vz-uz*vy),ny=Math.abs(uz*vx-ux*vz),nz=Math.abs(ux*vy-uy*vx);
        for(let j=0;j<3;j++){
          const X=pos[t+j*3],Y=pos[t+j*3+1],Z=pos[t+j*3+2],o2=(t/9*3+j)*2;
          if(ny>=nx&&ny>=nz){ uv[o2]=X; uv[o2+1]=Z; }
          else if(nx>=nz){ uv[o2]=Z; uv[o2+1]=Y; }
          else { uv[o2]=X; uv[o2+1]=Y; }
        }
      }
      g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    }
    g.computeVertexNormals();                                // 면마다 법선 — 지붕 물매가 음영으로 보인다
    g.computeBoundingSphere();
    const mm=(p.mcode?floorMat(p.mcode):matFor(p)).clone(); mm.side=THREE.DoubleSide;   // 안쪽에서 봐도 보이게
    mesh=new THREE.Mesh(g,mm);
  }
  if(!mesh) return null;
  const structural=obj.kind==='wall'||obj.kind==='pillar'||obj.kind==='stair'||obj.kind==='mass';
  mesh.castShadow=structural||obj.kind==='furniture'||obj.kind==='fixture'||obj.kind==='door';
  mesh.receiveShadow=obj.kind==='floor'||obj.kind==='slab'||structural||obj.kind==='furniture'||obj.kind==='fixture';
  if(obj.meta&&obj.meta.shadow){ const s=obj.meta.shadow; mesh.castShadow=s==='both'||s==='cast'; mesh.receiveShadow=s==='both'||s==='receive'; }
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
// 고스트(낙관적 미리보기·동작 미리보기)는 재질도 제 것이라 geometry+material 모두 해제 (2026-09-05 리뷰: GPU 누수)
function disposeGhost(g){
  if(!g) return;
  g.traverse(o=>{
    if(o.geometry&&o.geometry!==geoBox&&o.geometry!==geoCyl&&o.geometry!==geoSph) o.geometry.dispose();
    if(o.material&&!o.isSprite){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m&&m.dispose&&!m.userData._shared) m.dispose(); }); }
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
  ST.pendingG.forEach(disposeGhost); ST.pendingG=[]; // 실물이 왔으니 임시 고스트 제거 (geometry·material 해제)
  const d=(doc&&doc.data&&!doc.walls&&!doc.floors)?doc.data:doc||{};
  if(!ST.root){ ST.root=new THREE.Group(); ST.root.name='MiniCAD'; scene.add(ST.root); }
  const fls=MC3D.splitFloors(d);
  const keep=new Set();
  const floorsOut=[];
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  let z0=0,project='',ceilH=2400;
  const counts={spaces:0,walls:0,openings:0,furniture:0,lights:0,sketch:0,masses:0};
  fls.forEach(f=>{
    const D=MC3D.normalizeDoc(f.doc);
    project=project||D.meta.project||'';
    // 점·선·면 스냅 데이터 (2026-09-04) — 층별 점(끝점)·선(벽)·면(공간)과 그룹 통계
    const mpolys=(D.masses||[]).map(m=>MC3D._internal.massAbsPoly(m));               // 2026-09-04 매스 모서리
    ST.snapData[f.id]={
      verts:D.walls.filter(w=>!w.isLine).flatMap(w=>[{x:w.x1,y:w.y1},{x:w.x2,y:w.y2}])
        .concat((D.sketchPts||[]).map(p=>({x:p.x,y:p.y})),mpolys.flat()),              // 스케치 점 + 매스 꼭짓점
      walls:D.walls.filter(w=>!w.isLine).map(w=>({x1:w.x1,y1:w.y1,x2:w.x2,y2:w.y2}))
        .concat((D.sketchEdges||[]).map(e=>({x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2})),
          mpolys.flatMap(q=>q.map((p,i)=>({x1:p.x,y1:p.y,x2:q[(i+1)%q.length].x,y2:q[(i+1)%q.length].y})))),
      spaces:D.spaces.map(s=>({id:s.id,poly:s.polygon})),
      sketchFaces:(D.sketchFaces||[]).map(x=>({id:x.id,poly:x.polygon})),
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
  const season=0.6+0.4*Math.cos(((ST.sunMonth==null?5:ST.sunMonth)-5)/6*Math.PI);   // 6월 높고 12월 낮다
  const a=(t-0.5)*Math.PI*1.1, el=(0.25+0.75*Math.sin(Math.PI*t))*season;
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
  sd.gpts=(ST.guidePts||[]).filter(g=>g.fid===fid).map(g=>({x:g.x,y:g.y}));
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
  const ao=ST.axesO||{x:0,y:0,ang:0}; axesGrp.position.set(ao.x*MM,0,ao.y*MM); axesGrp.rotation.y=-ao.ang*Math.PI/180;
  axesGrp.visible=ST.axes;
  scene.add(axesGrp);
}
function setAxes(on){ ST.axes=on; if(axesGrp) axesGrp.visible=on; refreshStylePanel(); invalidate(); }
function rebuildPickables(){
  ST.pickables=[];
  ST.root&&ST.root.traverse(o=>{ if((o.isMesh||o.isSprite)&&o.userData.obj&&o.userData.obj.kind!=='slab'&&!(ST.hiddenGeom&&ST.hidden.has(o.userData.obj.floorId+'|'+o.userData.obj.id))) ST.pickables.push(o); });
  if(FF_STANDALONE){ applyFaceStyle(); applySections(); setFog(ST.fogOn); }   // 모델이 커지면 안개·시야도 따라간다
}
function retunePointLights(){
  ST.pointLights.forEach(pl=>{ if(pl.parent) pl.parent.remove(pl); });
  ST.pointLights=[];
  const lightGroups=[];
  ST.root&&ST.root.children.forEach(fg=>fg.children.forEach(g=>{
    const ob=g.userData.obj;
    if(ob&&ob.kind==='light'&&(!ob.meta||ob.meta.on!==false)) lightGroups.push(g);   // 2026-09-09: 회로가 끈 등엔 광원 없음
  }));
  // 2026-09-09 대표 지시: 종전 stride 표본(i%stride)은 등이 많으면 빛 풀이 군데군데만 생겼다.
  const budget=_plBudget();
  const mk=(g,inten,dist,xmm)=>{
    const obj=g.userData.obj;
    const pl=new THREE.PointLight(0xFFE7B8,inten,dist,2);
    pl.position.set((xmm||0)*MM,((obj.meta&&obj.meta.lightZ)||2200)*MM,0);   // 로컬 X = 등의 길이 방향
    pl.visible=ST.lightsOn;
    g.add(pl); ST.pointLights.push(pl);
  };
  const inten1=g=>{const m=g.userData.obj.meta||{};return (m.lightLen||m.linear)?9:6;};
  // 2026-09-10 대표 지시 "각각의 조명을 공부해 사실적으로" — build3d 가 타입마다 적어 준
  //  광원 명세(meta.emitters: 확산 pt / 원뿔 spot / up=천장 워시 / 색온도 / 세기·도달)를
  //  그대로 켠다. 명세 없는 옛 문서는 종전 한 점 광원으로 물러난다.
  const _emsOf=g=>{const m=g.userData.obj.meta||{};
    if(Array.isArray(m.emitters)&&m.emitters.length) return m.emitters;
    return [{k:'pt',x:0,z:m.lightZ||2200,c:'#FFE7B8',i:inten1(g),d:7}]; };
  const mkE=(g,e)=>{
    let l;
    if(e.k==='spot'){
      l=new THREE.SpotLight(new THREE.Color(e.c||'#FFE7B8'),e.i,e.d,e.ang||0.5,e.up?0.7:0.45,1.8);
      l.position.set((e.x||0)*MM,e.z*MM,0);
      l.target.position.set((e.x||0)*MM,e.up?e.z*MM+3:0,0);   // 아래 바닥 · up=천장 워시
      g.add(l.target);
    }else{
      l=new THREE.PointLight(new THREE.Color(e.c||'#FFE7B8'),e.i,e.d,2);
      l.position.set((e.x||0)*MM,e.z*MM,0);
    }
    l.visible=ST.lightsOn;
    g.add(l); ST.pointLights.push(l);
  };
  const subsOf=g=>_emsOf(g).length;
  const put1=g=>_emsOf(g).forEach(e=>mkE(g,e));
  let demand=0; lightGroups.forEach(g=>{demand+=subsOf(g);});
  if(demand<=budget){
    lightGroups.forEach(put1);                            // 등마다 제 광원 — 선형은 줄지어
  }else if(lightGroups.length<=budget){
    lightGroups.forEach(g=>mk(g,inten1(g),7,0));          // 예산 빠듯 — 등마다 하나(선형은 가운데)
  }else{
    // 예산 초과(수백 등) — 2.5m 격자로 근접 등을 묶고 √n 배 세기로 대표 광원.
    //  어느 등도 격자 대각(≈3.6m) 안에 광원이 있어 빈 구역이 없다.
    const CELL=2.5, bins=new Map(), wp=new THREE.Vector3();
    lightGroups.forEach(g=>{
      g.getWorldPosition(wp);
      const k=Math.round(wp.x/CELL)+'|'+Math.round(wp.z/CELL)+'|'+(g.parent&&g.parent.userData.floorId||'');
      let b=bins.get(k); if(!b){ b=[]; bins.set(k,b); }
      b.push(g);
    });
    bins.forEach(b=>{ const n=b.length; mk(b[0],inten1(b[0])*Math.sqrt(n),7+Math.sqrt(n)); });
  }
}
function autoPerf(){
  const n=ST.pickables.length;
  const plq=ST.pointLights.length;   // 2026-09-09: 등마다 광원 — 많으면 픽셀비로 상쇄
  renderer.setPixelRatio((n>6000||plq>96)?1:(n>3000||plq>48)?1.5:Math.min(window.devicePixelRatio||1,2));
  if(ST.shadowsAuto){
    const want=n<=3500;
    if(want!==ST.shadows){ setShadows(want,true); setStatus(statusLive,_statusTxt+(want?'':' · 대형 도면 — 그림자 자동 OFF')); }
  }
}

// ---------------------------------------------------------------------------
// 가시성 (층 필터·천장·이름표 한 곳에서)
// ---------------------------------------------------------------------------
function floorOK(fid){ if(fid==='freeform') return true; return ST.floorSel==='all'||fid===ST.floorSel; }
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
      if(ST.hidden.has(o.floorId+'|'+o.id)) vis=!!ST.hiddenGeom;      // 숨기기(H) — 숨은 형상 보기면 유령으로
      if(ST.isolate&&!ST.isolate.has(o.floorId+'|'+o.id)) vis=false;   // 선택만 보기
      g.visible=vis;
    });
  });
  invalidate(true);
}
const TAG_NAMES=['벽','바닥','천장','문','창','가구','기구','조명','전기','설비','기둥','스케치','매스'];
const TAG_OF=o=>(o.meta&&o.meta.tag)||({wall:'벽',floor:'바닥',ceiling:'천장',door:'문',window:'창',furniture:'가구',fixture:'기구',light:'조명',electric:'전기',hvac:'설비',pillar:'기둥',sketchFace:'스케치',sketchEdge:'스케치',sketchPt:'스케치',mass:'매스'})[o.kind]||null;
function ffTagNames(){ return TAG_NAMES.concat((FF&&Array.isArray(FF.free.tags))?FF.free.tags.filter(t=>!TAG_NAMES.includes(t)):[]); }
function setTag(name,on){ ST.tags[name]=!!on; refreshVisibility(); renderTags(); }
function renderTags(){
  const el=$('tags'); if(!el) return;
  el.innerHTML=ffTagNames().map(n=>'<label class="tag"><input type="checkbox" data-tag="'+n+'"'+(ST.tags[n]===false?'':' checked')+'> '+n+'</label>').join('')
    +(FF_STANDALONE?'<button class="btn sm" id="tag-add" style="grid-column:1/3;margin-top:4px">＋ 태그 추가</button>':'');
  el.querySelectorAll('input[data-tag]').forEach(i=>{ i.onchange=()=>setTag(i.dataset.tag,i.checked); });
  const ta=el.querySelector('#tag-add'); if(ta) ta.onclick=()=>{ const nm=window.prompt('새 태그 이름',''); if(!nm||!FF) return; if(!Array.isArray(FF.free.tags)) FF.free.tags=[]; if(!FF.free.tags.includes(nm)) FF.free.tags.push(nm); ffAutosave(); renderTags(); setStatus(statusLive,'태그 추가: '+nm+' — 개체 정보에서 매스에 붙입니다'); };
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
  matCache.forEach(m=>{ if(m.userData.emiss) m.emissiveIntensity=(on&&m.userData.lit!==false)?1.4:0; });   // 회로가 끈 등은 그대로 소등
  applyMood();
}
// ---------------------------------------------------------------------------
// 하늘·바닥 배경 (2026-09-07 대표 지시 — 스케치업처럼)
//  스케치업은 배경을 지평선에서 하늘과 바닥으로 갈라 칠한다. 그래야 어느 쪽이
//  위인지, 카메라가 얼마나 기울었는지가 한눈에 들어온다 — 단색 배경에서는
//  아무리 돌려도 돌아가는 느낌이 안 난다.
//  구현: 큰 공으로 두르지 않고, 화면을 통째로 덮는 판 한 장을 본 장면보다 먼저 그린다.
//   · 공으로 두르면 카메라 far(=400) 밖으로 나간 만큼 통째로 잘린다 — 실제로
//     반지름 900 으로 두르자 배경이 그대로 새까맣게 남았다. 화면 덮개는 잘릴 far 가 없다.
//   · 색은 '카메라에서 그 픽셀을 향한 세계 방향'의 높이 성분으로 정한다. 그 값이 0 인
//     곳이 곧 참 지평선이라, 돌리든 걷든 지평선이 세계 바닥면(y=0)과 늘 맞는다.
//   · 평행투영은 모든 픽셀의 방향이 같아 이 계산이 한 색으로 뭉갠다. 그래서 평행투영일
//     때만 55° 짜리 가상 화각으로 방향을 만든다 — 스케치업 평행투영도 지평선을 그린다.
//  배경 그림 자리도 함께 뒀다(setSkyImage — 가로 2:1 파노라마 한 장).
const SKY_PRESET={
  day:{ up:0x4E79A8, hz:0xC5D9EC, gd:0xA2937B, dn:0x5C5346, fog:0xC5D9EC },
  night:{ up:0x080D1A, hz:0x1E2B45, gd:0x151A24, dn:0x090B11, fog:0x1E2B45 },
};
let skyScene=null, skyCam=null, skyUni=null, skyTex=null, skyBlank=null;
// 배경 판은 셰이더가 색을 그대로 화면에 쓴다 — three 의 색공간 변환 조각이 붙지 않으므로
// THREE.Color 로 만들면 선형값이 되어 새까맣게 나온다. 여기서는 sRGB 바이트 그대로 쓴다.
function _c(hex){ return new THREE.Vector3(((hex>>16)&255)/255,((hex>>8)&255)/255,(hex&255)/255); }
function buildSky(){
  if(skyScene) return skyScene;
  const P=SKY_PRESET.day;
  skyBlank=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);
  skyBlank.needsUpdate=true;
  skyUni={
    uUp:{value:_c(P.up)}, uHz:{value:_c(P.hz)}, uGd:{value:_c(P.gd)}, uDn:{value:_c(P.dn)},
    uLine:{value:0.55},                                   // 지평선 선 진하기
    uRight:{value:new THREE.Vector3(1,0,0)},
    uUpV:{value:new THREE.Vector3(0,1,0)},
    uFwd:{value:new THREE.Vector3(0,0,-1)},
    uScale:{value:new THREE.Vector2(1,1)},                // 화면 반각(tan)
    uTex:{value:skyBlank}, uHasTex:{value:0},
  };
  const mat=new THREE.ShaderMaterial({
    uniforms:skyUni, depthTest:false, depthWrite:false, fog:false,
    vertexShader:`
      varying vec2 vUv;
      void main(){ vUv=uv*2.0-1.0; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader:`
      varying vec2 vUv;
      uniform vec3 uUp,uHz,uGd,uDn,uRight,uUpV,uFwd;
      uniform vec2 uScale;
      uniform float uLine,uHasTex;
      uniform sampler2D uTex;
      void main(){
        vec3 d=normalize(uFwd + uRight*(vUv.x*uScale.x) + uUpV*(vUv.y*uScale.y));
        vec3 col;
        if(uHasTex>0.5){
          float u=atan(d.z,-d.x)/6.2831853+0.5;           // 파노라마를 방향으로 찍어 본다
          float v=asin(clamp(d.y,-1.0,1.0))/3.1415927+0.5;
          col=texture2D(uTex,vec2(u,v)).rgb;
        }else{
          float t=d.y;                                    // 0 인 곳이 참 지평선
          if(t>=0.0) col=mix(uHz,uUp,pow(clamp(t,0.0,1.0),0.55));
          else       col=mix(uGd,uDn,pow(clamp(-t,0.0,1.0),0.65));
          float g=1.0-smoothstep(0.0,0.004,abs(t));       // 땅끝에 가는 선 한 줄
          col=mix(col,col*0.72,g*uLine);
        }
        gl_FragColor=vec4(col,1.0);
      }`,
  });
  skyScene=new THREE.Scene();
  const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);
  q.frustumCulled=false;
  skyScene.add(q);
  skyCam=new THREE.Camera();
  return skyScene;
}
// 그릴 때마다 카메라 자세를 하늘에 일러 준다
const _skR=new THREE.Vector3(),_skU=new THREE.Vector3(),_skF=new THREE.Vector3();
function syncSky(){
  if(!skyUni) return;
  camera.updateMatrixWorld();   // 그리기 전이라 아직 갱신 전이다 — 한 프레임 늦으면 지평선이 어긋난다
  const m=camera.matrixWorld.elements;
  _skR.set(m[0],m[1],m[2]).normalize();
  _skU.set(m[4],m[5],m[6]).normalize();
  _skF.set(-m[8],-m[9],-m[10]).normalize();
  skyUni.uRight.value.copy(_skR); skyUni.uUpV.value.copy(_skU); skyUni.uFwd.value.copy(_skF);
  const fov=camera.isPerspectiveCamera?camera.fov:55;     // 평행투영은 가상 화각
  const asp=camera.isPerspectiveCamera?camera.aspect:(view.clientWidth/Math.max(1,view.clientHeight));
  const ty=Math.tan(fov*Math.PI/360);
  skyUni.uScale.value.set(ty*asp,ty);
}
// 한 프레임 — 배경을 먼저 깔고 그 위에 장면을 얹는다
function drawFrame(){
  if(ST.sky!=='plain'&&skyScene){
    syncSky();
    renderer.autoClear=false;
    try{
      renderer.clear();
      renderer.render(skyScene,skyCam);
      renderer.render(scene,camera);
    }finally{ renderer.autoClear=true; }   // 중간에 터져도 다음 프레임이 안 깨지게
  }else{
    renderer.render(scene,camera);
  }
}
// 배경 그림 고르기 — 파노라마 한 장을 둘러 준다
function pickSkyImage(){
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/*';
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    const fr=new FileReader();
    fr.onload=()=>setSkyImage(String(fr.result));
    fr.readAsDataURL(f);
  };
  inp.click();
}
// 지금 무드(주/야)에 맞춰 하늘 색을 맞춘다
function applySkyColors(){
  const P=ST.night?SKY_PRESET.night:SKY_PRESET.day;
  buildSky();
  if(skyUni){
    skyUni.uUp.value.copy(_c(P.up)); skyUni.uHz.value.copy(_c(P.hz));
    skyUni.uGd.value.copy(_c(P.gd)); skyUni.uDn.value.copy(_c(P.dn));
    skyUni.uTex.value=skyTex||skyBlank;
    skyUni.uHasTex.value=(ST.sky==='image'&&skyTex)?1:0;
  }
  if(ST.sky==='plain'){
    const flat=ST.night?0x07070F:0x0E0F1A;       // 종전 단색
    scene.background=new THREE.Color(flat);
    scene.fog.color.set(flat);
  }else{
    scene.background=null;                       // 배경 패스가 맡는다
    scene.fog.color.set(P.fog);                  // 먼 것이 지평선 색으로 스민다
  }
}
// 배경 종류 — 'sky'(하늘·바닥) / 'plain'(단색) / 'image'(파노라마 그림)
function setSky(mode){
  if(mode!=='sky'&&mode!=='plain'&&mode!=='image') mode='sky';
  if(mode==='image'&&!skyTex) mode='sky';        // 그림이 없으면 하늘로
  ST.sky=mode;
  applySkyColors();
  refreshStylePanel();
  setStatus(statusLive,'배경: '+(mode==='sky'?'하늘·바닥 (지평선에서 갈라 칠함)':mode==='image'?'그림':'단색'));
  invalidate(true);
}
// 나중에 배경 그림을 입히는 자리 — 파노라마(가로 2:1) 한 장을 두른다
function setSkyImage(url){
  if(!url){ skyTex=null; if(ST.sky==='image') setSky('sky'); return; }
  new THREE.TextureLoader().load(url,tex=>{
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=THREE.RepeatWrapping;
    skyTex=tex; ST.sky='image'; applySkyColors(); refreshStylePanel(); invalidate(true);
    setStatus(statusLive,'배경 그림 적용 — 다시 하늘·바닥으로 돌리려면 배경 버튼');
  },undefined,()=>setStatus(statusLive,'배경 그림을 읽지 못했습니다'));
}
function setNight(on){
  ST.night=on;
  $('b-night').classList.toggle('on',on);
  if(on&&!ST.lightsOn){ setLights(true); return; }
  applyMood();
}
function applyMood(){
  if(ST.night){ hemi.intensity=0.32; sun.intensity=0.22; }
  else{ hemi.intensity=ST.lightsOn?1.25:1.6; sun.intensity=ST.lightsOn?2.0:2.6; }
  applySkyColors();   // 2026-09-07: 배경(하늘·바닥)도 무드를 따라간다
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
orbit.addEventListener('end',()=>{ camPush(); ffWPRefresh(); });
orbit.addEventListener('change',()=>ffWPRefresh());   // 휠 줌에도 방향기는 화면 기준 크기 유지
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
  else if(name==='bottom') camera.position.set(cx+0.01,-(span*1.5),cz+0.01);
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
  if(obj.kind==='sketchFace') return `면 <small>${((m.area||0)/1e6).toFixed(2)}㎡ · P(밀기끌기)=Z 높이 → 매스</small>`;
  if(obj.kind==='sketchEdge') return `선 <small>${Math.round(m.L||0)}mm</small>`;
  if(obj.kind==='sketchPt') return `점 <small>${Math.round(obj.x)}, ${Math.round(obj.y)}</small>`;
  if(obj.kind==='mass') return `${obj.name} <small>H ${Math.round(m.h_mm||0)} · ${((m.area||0)/1e6).toFixed(2)}㎡${obj.elev?' · ↑'+obj.elev:''}</small>`;
  return `${obj.name} <small>${m.type||obj.kind}</small>`;
}
function findGroup(floorId,id){
  if(floorId==='freeform'){                                 // 프리폼 자유 층 (층 캐시 밖)
    let f=null;
    FF&&FF.group&&FF.group.children.forEach(g=>{ if(!f&&g.userData.obj&&String(g.userData.obj.id)===String(id)) f=g; });
    return f;
  }
  const ent=ST.floorCache[floorId]; if(!ent) return null;
  let found=null;
  ent.group.children.forEach(g=>{ if(!found&&g.userData.obj&&String(g.userData.obj.id)===String(id)) found=g; });
  return found;
}
// --- 선택 (스케치업 Select) — 클릭=단일 · Ctrl/Shift+클릭=추가/토글 · Shift+Ctrl+클릭=제외 · 끌기=선택 상자 ---
//  ST.selSet = 선택된 그룹 집합, ST.selected = 대표(마지막) 객체 — 기존 단일 선택 코드와 호환
function _hl(g,on){
  g.traverse(o=>{
    if(!o.isMesh||o.userData.pick) return;
    if(on){ if(o.userData._mat) return; o.userData._mat=o.material; const m=o.material.clone(); if(m.emissive){ m.emissive=new THREE.Color('#C9A961'); m.emissiveIntensity=0.45; } else if(m.color){ m.color=m.color.clone().lerp(new THREE.Color('#C9A961'),0.6); if(m.transparent&&m.opacity<1) m.opacity=Math.min(1,m.opacity+0.3); } o.material=m; }   // 발광 헤일로·스프라이트(emissive 없음)는 색만 밝힌다
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
  if(FF_STANDALONE&&ST.parts&&ST.parts.length){ const ids=new Set([...ST.selSet].map(g=>g.userData.obj&&g.userData.obj.id)); const b0=ST.parts.length; ST.parts=ST.parts.filter(p=>ids.has(p.id)); if(ST.parts.length!==b0) _fsDraw(); }
  const arr=[...ST.selSet];
  ST.selected=arr.length?arr[arr.length-1]:null;
  ST.selKeys=arr.map(keyOf);
  ST.selKey=ST.selected?{floorId:ST.selected.userData.obj.floorId,id:ST.selected.userData.obj.id}:null;
  if(!ST.selected){ hideTip(); renderProps(null); renderOutliner(); buildGrips(); invalidate(); return; }
  renderProps(ST.selected.userData.obj,arr.length>1?{multi:arr.map(x=>x.userData.obj)}:null);
  renderOutliner();
  buildGrips();   // 2026-09-07 Z: 매스 하나면 윗면 꼭짓점 그립
  invalidate();
}
function reselect(){
  if(!ST.selKeys.length) return;
  const gs=[];
  ST.selKeys.forEach(k=>{ const i=k.indexOf('|'); const g=findGroup(k.slice(0,i),k.slice(i+1)); if(g) gs.push(g); });
  ST.selSet.clear();              // 옛 그룹은 재조립으로 폐기됨 — 새 그룹에 하이라이트 재적용
  selectGroups(gs);                // selectGroups → _syncSel → buildGrips (그립도 새 좌표로)
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
// ---------------------------------------------------------------------------
// 프리폼 ② — 면 위에 그리기 (2026-09-07)
//  스케치업의 자유가 실제로 사는 곳: 벽면·지붕면을 클릭하면 그 면이 종이가 되고,
//  거기 그린 사각형·선이 닫히면 면이 된다. 면 검출은 새로 안 만들었다 —
//  평면마다 sketch.js 그래프 하나(ffPlaneBag)를 두고 같은 엔진을 (u,v)로 돌린다.
//  첫 클릭이 평면을 정하고(스케치업 추론과 같은 손맛), 그 뒤 점은 레이∩평면.
// ---------------------------------------------------------------------------
// 클릭한 자리가 '세울 만한 면'인가 — 평면 원점·법선(도면 좌표계: x우 y아래 z위)
function _ffFacePick(e){
  if(!ST.ffOn) return null;
  const wf=ffWPFrame();                                  // 작업 평면이 잡혀 있으면 그 평면이 먼저 (면 클릭보다 우선)
  if(wf&&!ffWPGround()) return {o:wf.origin,n:wf.n,mass:null,wp:true};
  if(wf) return null;                                    // 바닥·z0·정방향 = 종전 기본 평면 경로 그대로
  return _ffFacePickRaw(e);
}
function _ffFacePickRaw(e){
  const hit=hitAt(e.clientX,e.clientY);
  if(!hit||!hit.face) return null;
  const nW=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  const n={x:nW.x,y:nW.z,z:nW.y};
  const p={x:hit.point.x/MM,y:hit.point.z/MM,z:hit.point.y/MM};
  if(Math.abs(n.z)>0.95&&p.z<50) return null;      // 땅바닥 = 종전 그대로 (기본 평면)
  const ho=hit.object.userData.obj;
  return {o:p,n,mass:(ho&&ho.kind==='mass'&&ffEditable(ho)&&!ho.locked)?{id:ho.id}:null};   // 매스 면이면 선이 면을 나눌 수 있다
}
// 그 평면의 틀 — 이미 그래프가 있으면 그 틀 (u,v 가 이어져야 스냅이 맞는다)
function _ffFrameFor(o,n){
  const ex=FF&&Array.isArray(FF.free.planes)&&FF.free.planes.find(q=>planeSame(q,o,n));
  return ex||planeFrom(o,n);
}
// patch.plane 이 실릴 때 그 평면의 bag — 없으면 보낸 틀 그대로 만든다
function _ffBagFor(plane){
  if(!plane) return FF.free;
  if(!Array.isArray(FF.free.planes)) FF.free.planes=[];
  let pl=FF.free.planes.find(p=>planeSame(p,plane.origin,plane.n));
  if(!pl){
    pl=Object.assign({},plane);
    pl.id='pl_'+Date.now()+'_'+Math.floor(Math.random()*1e4);
    pl.sketchPts=[];pl.sketchEdges=[];pl.sketchFaces=[];
    FF.free.planes.push(pl);
  }
  return pl;
}
function _ffAllBags(){
  const out=[FF.free];
  (FF.free.planes||[]).forEach(pl=>out.push(pl));
  return out;
}
function _ffFindFace(id){
  for(const b of _ffAllBags()){
    const f=skFaceById(id,b);
    if(f) return {bag:b,face:f,plane:b===FF.free?null:b};
  }
  return null;
}
// 이 평면에서 스냅이 걸릴 것들 — 평면 스케치 + 매스 모서리(자유 층·밑그림 둘 다).
//  히스토리 위치+평면으로 캐시 — 마우스 움직임마다 solid 를 다시 세우면 무겁다.
function _ff3SnapList(fr){
  const key=(FF?FF.histPos:-1)+'|'+[fr.origin.x,fr.origin.y,fr.origin.z,fr.n.x,fr.n.y,fr.n.z].map(v=>Math.round(v*1e4)).join(',');
  if(FF&&FF._ps&&FF._ps.key===key) return FF._ps;
  const pts=[],edges=[];
  const ctx=ffCtx();
  const inPl=w=>Math.abs((w.x-fr.origin.x)*fr.n.x+(w.y-fr.origin.y)*fr.n.y+(w.z-fr.origin.z)*fr.n.z)<1.5;
  const scan=m=>{
    if(!m||!Array.isArray(m.pts)||m.pts.length<3) return;
    try{
      const S=massSolid(m,ctx);
      const th=(m.angle||0)*Math.PI/180,c=Math.cos(th),sn=Math.sin(th),el=Number(m.elev_mm)||0;
      const A=S.verts.map(v=>({x:m.x+v.x*c-v.y*sn,y:m.y+v.x*sn+v.y*c,z:v.z+el}));
      const seen=new Set();
      S.faces.forEach(f=>{ for(let i=0;i<f.vs.length;i++){
        const a=f.vs[i],b=f.vs[(i+1)%f.vs.length];
        const k2=Math.min(a,b)+'_'+Math.max(a,b);
        if(seen.has(k2)) continue; seen.add(k2);
        const ia=inPl(A[a]),ib=inPl(A[b]);
        if(ia){ const q=planeUV(fr,A[a]); pts.push({u:q.u,v:q.v}); }
        if(ib){ const q=planeUV(fr,A[b]); pts.push({u:q.u,v:q.v}); }
        if(ia&&ib){ const qa=planeUV(fr,A[a]),qb=planeUV(fr,A[b]); edges.push({u1:qa.u,v1:qa.v,u2:qb.u,v2:qb.v}); }
      }});
    }catch(_){ }
  };
  (FF&&FF.free.masses||[]).forEach(scan);
  ((ST.doc&&ST.doc.masses)||[]).forEach(scan);           // 밑그림 매스 모서리에도 붙는다
  const bag=FF&&Array.isArray(FF.free.planes)&&FF.free.planes.find(q=>planeSame(q,fr.origin,fr.n));
  if(bag){
    bag.sketchPts.forEach(p=>pts.push({u:p.x,v:p.y}));
    bag.sketchEdges.forEach(e2=>{
      const a=skPtById(e2.a,bag),b=skPtById(e2.b,bag);
      if(a&&b) edges.push({u1:a.x,v1:a.y,u2:b.x,v2:b.y});
    });
  }
  const out={key,pts,edges};
  if(FF) FF._ps=out;
  return out;
}
// 평면 스냅 마커 — 3D 자리에 직접 (땅 그리기의 showSnap 과 같은 색 규약)
function _ff3Seg(fr,uv){ const e2=uv&&uv.seg; if(!e2) return null; return {a:planePt(fr,e2.u1,e2.v1),b:planePt(fr,e2.u2,e2.v2)}; }
function _ff3Mark(kind,w,seg,proj){
  if(!kind||kind==='grid'){ hideSnap(); return; }
  if(FF_STANDALONE){
    _snapPaint(kind,new THREE.Vector3(w.x*MM,w.z*MM,w.y*MM),
      seg?{a:new THREE.Vector3(seg.a.x*MM,seg.a.z*MM,seg.a.y*MM),b:new THREE.Vector3(seg.b.x*MM,seg.b.z*MM,seg.b.y*MM)}:null, proj||null);
    return;
  }
  if(!snapMk){ snapMk=FF_STANDALONE?glowSprite(0xffffff,12):new THREE.Mesh(geoSph,new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false})); if(!snapMk.isSprite) snapMk.scale.setScalar(0.045); snapMk.renderOrder=1000; scene.add(snapMk); }
  if(snapMk.isSprite) snapMk.scale.setScalar(_pxScale(12));
  snapMk.material.color.setHex(SNAP_COL[kind]||0xffffff);
  snapMk.position.set(w.x*MM,w.z*MM,w.y*MM);
  snapMk.visible=true; invalidate();
}
// 레이 ∩ 평면 → (u,v). 끝점 > 중간점 > 선 위 > 10mm 격자 — 반경은 화면 14px (줌 무관)
function _ff3UV(e,fr){
  rayFromEvent(e);                                       // ray 를 이 커서 방향으로
  const nW=new THREE.Vector3(fr.n.x,fr.n.z,fr.n.y);
  const pW=new THREE.Vector3(fr.origin.x*MM,fr.origin.z*MM,fr.origin.y*MM);
  const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(nW,pW);
  const pt=new THREE.Vector3();
  if(!ray.ray.intersectPlane(plane,pt)) return null;
  const uv=planeUV(fr,{x:pt.x/MM,y:pt.z/MM,z:pt.y/MM});
  const R=Math.max(40,mmPerPx(pt)*16);                   // 16px — 땅 그리기와 같은 손맛
  const L=_ff3SnapList(fr);
  let best=null,bd=R;
  L.pts.forEach(q=>{ const d=Math.hypot(q.u-uv.u,q.v-uv.v); if(d<bd){ bd=d; best={u:q.u,v:q.v,snap:'endpoint',seg:null}; } });
  if(!best){
    bd=R;
    L.edges.forEach(ed=>{
      const mu=(ed.u1+ed.u2)/2,mv=(ed.v1+ed.v2)/2;
      const dm=Math.hypot(mu-uv.u,mv-uv.v);
      if(dm<bd){ bd=dm; best={u:mu,v:mv,snap:'midpoint',seg:ed}; }
    });
  }
  if(!best){
    bd=R;
    L.edges.forEach(ed=>{
      const dx=ed.u2-ed.u1,dy=ed.v2-ed.v1,L2=dx*dx+dy*dy||1;
      let t=((uv.u-ed.u1)*dx+(uv.v-ed.v1)*dy)/L2; t=Math.max(0,Math.min(1,t));
      const fu=ed.u1+dx*t,fv=ed.v1+dy*t;
      const d=Math.hypot(fu-uv.u,fv-uv.v);
      if(d<bd){ bd=d; best={u:Math.round(fu),v:Math.round(fv),snap:'edge',seg:ed}; }
    });
  }
  if(best) return best;
  if(FF_STANDALONE&&ST.ffOn&&ST.lastPtr){                 // 면 위에서도 모델 전체의 점·모서리를 잡는다
    const h=_ffSnapOnPlane(ST.lastPtr.clientX,ST.lastPtr.clientY,fr.origin,fr.n);
    if(h){ const q=planeUV(fr,h.p);
      return {u:Math.round(q.u),v:Math.round(q.v),snap:h.kind,
        seg:h.seg?{u1:planeUV(fr,h.seg.a).u,v1:planeUV(fr,h.seg.a).v,u2:planeUV(fr,h.seg.b).u,v2:planeUV(fr,h.seg.b).v}:null,
        proj:h.proj}; }
  }
  const G=ST.gridMM||10; return {u:Math.round(uv.u/G)*G,v:Math.round(uv.v/G)*G};
}
// 잠긴 축이 있으면 그 축으로만 (u=평면의 가로 · v=평면의 세로/파랑)
function _ff3Lock(op,uv){
  if(!op||!op.axis||!uv) return uv;
  return op.axis==='u'?{u:uv.u,v:op.a.v}:{u:op.a.u,v:uv.v,snap:uv.snap};
}
function _ff3Ghost(op){
  const fr=op.fr;
  const pts=[];
  if(op.type==='line3') pts.push(op.a,op.cur||op.a);
  else{
    const a=op.a,c=op.cur||op.a;
    pts.push(a,{u:c.u,v:a.v},c,{u:a.u,v:c.v},a);
  }
  const arr=new Float32Array(pts.length*3);
  pts.forEach((q,i)=>{
    const w=planePt(fr,q.u,q.v);
    arr[i*3]=w.x*MM;arr[i*3+1]=w.z*MM;arr[i*3+2]=w.y*MM;
  });
  if(!op.line){
    op.line=new THREE.Line(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false,transparent:true,opacity:0.95}));
    op.line.renderOrder=950; op.line.frustumCulled=false;
    scene.add(op.line);
  }
  const vBlue=Math.abs(op.fr.n.z)<0.95;                  // 벽 평면이면 v=위(파랑)
  op.line.material.color.setHex(op.axis==='v'?(vBlue?0x4C7DE2:0x2FA84F):op.axis==='u'?0xE24C4C:0xD4FF3D);
  op.line.geometry.dispose();
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(arr,3));
  op.line.geometry=g;
  invalidate();
}
// 면 위의 선 → 매스 면 분할 시도. 양 끝이 면 모서리(꼭짓점)에 닿을 때만 나뉘고, 아니면 false (면 위 스케치 선으로)
function ffTrySplit(op,ua,ub){
  const g=_massG(op.mass.id), m=_massOf(op.mass.id); if(!g||!m) return false;
  const W=q=>planePt(op.fr,q.u,q.v);
  const toL=w=>{ const l=g.worldToLocal(new THREE.Vector3(w.x*MM,w.z*MM,w.y*MM)); return {x:Math.round(l.x/MM*10)/10,y:Math.round(l.z/MM*10)/10,z:Math.round(l.y/MM*10)/10}; };
  const A=toL(W(ua)), B=toL(W(ub));
  const qi=g.getWorldQuaternion(new THREE.Quaternion()).invert(); const nL=new THREE.Vector3(op.fr.n.x,op.fr.n.z,op.fr.n.y).applyQuaternion(qi); const ln={x:nL.x,y:nL.z,z:nL.y};
  const mid={x:(A.x+B.x)/2,y:(A.y+B.y)/2,z:(A.z+B.z)/2};
  const probe=JSON.parse(JSON.stringify(m)); if(!massSplitFace(probe,mid,ln,A,B,ffCtx())) return false;
  const ok=emitEdit({type:'edit',op:'splitface',kind:'masses',id:m.id,floorId:'freeform',patch:{p:mid,n:ln,a:A,b:B}});
  if(ok) setStatus(statusLive,'╱ 면 분할 → 두 면 (각각 P 밀기끌기·B 페인트·M 이동 가능) · 이어서 그리면 또 나뉩니다');
  return ok;
}
// 방금 생긴 면을 바로 밀기끌기 단계로 (스케치업 Rectangle+Push/Pull 을 한 흐름으로 — 대표 지시: 2번째 클릭 뒤 바로 높이)
function ffAutoExtrude(bag){
  if(!FF_STANDALONE||!bag||!Array.isArray(bag.sketchFaces)||!bag.sketchFaces.length) return false;
  const f=bag.sketchFaces[bag.sketchFaces.length-1]; const g=findGroup('freeform',f.id); const mesh=g&&g.children.find(c=>c.isMesh);
  if(!mesh) return false;
  beginPP({object:mesh,face:null,point:mesh.getWorldPosition(new THREE.Vector3())},null);
  if(!ST.op||ST.op.type!=='pp') return false;
  ST.op.autoBox=true;
  if(ST.lastPtr){ ST.op.startY=ST.lastPtr.clientY; ST.op.startX=ST.lastPtr.clientX; }   // 2번째 클릭 자리가 기준 — 첫 이동부터 높이가 보인다
  vcbShow('높이 (3번째 클릭 또는 숫자 · Esc=면만)',0,'mm');
  setStatus(statusLive,'⇕ 높이 — 위로 끌어 3번째 클릭 또는 숫자 입력(mm) · Esc=면만 남김');
  return true;
}
function ff3Click(e,fp,tool){
  if(!ST.op){
    const fr=_ffFrameFor(fp.o,fp.n);
    const uv=_ff3UV(e,fr);
    if(!uv) return;
    ST.op={type:tool==='rect'?'rect3':'line3',fr,a:uv,cur:uv,line:null,mass:fp.mass||null};
    opOrbit(true);
    _ff3Ghost(ST.op);
    const wallLike=Math.abs(fr.n.z)<0.95;
    setStatus(statusLive,'🧊 '+(wallLike?'벽면':'윗면')+' 위에 그리는 중 — '+(fp.mass?'양 끝이 모서리에 닿으면 면이 나뉘고, ':'')+'닫히면 면이 되고, P 로 뽑으면 입체가 됩니다 (Esc=취소)');
    vcbShow(tool==='rect'?'면 위 사각형':'면 위 선',0,'mm');
    return;
  }
  const op=ST.op;
  if(op.type==='line3'&&op.b3&&ffFree3()){                   // 이 종이 밖의 점으로 잇는다
    const A=planePt(op.fr,op.a.u,op.a.v), B=op.b3;
    const L=_ffLen3(A,B);
    if(L<10) return;
    const fr=ffEmitEdge3(A,B);
    ffLineBegin3(B,fr);
    setStatus(statusLive,'╱ 3D 선 '+L+'mm — 이어서 클릭 (Esc·더블클릭=끝)');
    return;
  }
  let uv=_ff3UV(e,op.fr);
  if(!uv) return;
  uv=_ff3Lock(op,uv);
  op.cur=uv;
  const plane={origin:op.fr.origin,ex:op.fr.ex,ey:op.fr.ey,n:op.fr.n};
  if(op.type==='rect3'){
    if(Math.abs(uv.u-op.a.u)<10||Math.abs(uv.v-op.a.v)<10) return;
    emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',
      patch:{x1:op.a.u,y1:op.a.v,x2:uv.u,y2:uv.v,plane}});
    cancelOp();
    ffAutoExtrude(_ffBagFor(plane));
    return;
  }
  if(Math.hypot(uv.u-op.a.u,uv.v-op.a.v)<10) return;
  if(!(op.mass&&ffTrySplit(op,op.a,uv)))                                       // 양 끝이 면의 모서리에 닿으면 면이 나뉜다 (스케치업 Divide)
    emitEdit({type:'edit',op:'sketchline',floorId:'freeform',
      patch:{x1:op.a.u,y1:op.a.v,x2:uv.u,y2:uv.v,plane}});
  op.drew=true; if(op.autoBlue){ op.autoBlue=false; op.axis=null; }            // 세로 선을 하나 그으면 이 종이에 남는다 (축 고정 해제)
  op.a=uv;                                   // 선은 사슬로 잇는다 (더블클릭=끝)
  _ff3Ghost(op);
}
function ff3Move(e){
  const op=ST.op;
  if(!op||(op.type!=='line3'&&op.type!=='rect3')) return;
  if(op.autoBlue&&!op.drew&&op.back){                     // 파랑 방향을 벗어나면 다시 바닥 선으로 (일시적 추론)
    const w=planePt(op.fr,op.a.u,op.a.v); const al=_blueAligned(new THREE.Vector3(w.x*MM,w.z*MM,w.y*MM),e,18,16);
    if(!al){ const b=op.back; cancelOp(); _lineBeginAt(b.fid,b.z0,b.a,false,b.chain); lineMove(e); return; }
  }
  let uv=_ff3UV(e,op.fr);
  if(!uv) return;
  uv=_ff3Lock(op,uv);
  op.cur=uv;
  if(op.type==='line3'&&ffFree3()&&uv.proj){                 // 이 종이 밖의 점 — 곧장 그리로 (새 종이는 확정할 때)
    const A=planePt(op.fr,op.a.u,op.a.v);
    op.b3=uv.proj; _ffPrev3(op,A,op.b3); _ffSnapAt3(uv.snap,op.b3);
    vcbShow((SNAP_NAME[uv.snap]||'')+' · 3D 길이',_ffLen3(A,op.b3),'mm');
    return;
  }
  if(op.b3){ op.b3=null; _ffPrev3Hide(op); }
  _ff3Ghost(op);
  _ff3Mark(uv.snap,planePt(op.fr,uv.u,uv.v),_ff3Seg(op.fr,uv),uv.proj);   // 면 위에서도 스냅 마커 + 닿은 선분 강조
  const vBlue=Math.abs(op.fr.n.z)<0.95;
  const axName=op.axis==='v'?(vBlue?'파랑(위) 고정 · ':'세로 고정 · '):op.axis==='u'?'빨강(가로) 고정 · ':'';
  const snName=uv.snap?SNAP_NAME[uv.snap]+' · ':'';
  vcbShow(axName+snName+(op.type==='rect3'?'면 위 사각형':'면 위 선'),
    op.type==='rect3'
      ?Math.round(Math.abs(uv.u-op.a.u))+'×'+Math.round(Math.abs(uv.v-op.a.v))
      :Math.round(Math.hypot(uv.u-op.a.u,uv.v-op.a.v)),'mm');
}
// 숫자 입력 = 지금 방향(또는 잠긴 축)으로 정확한 길이 (스케치업 VCB)
function ff3Commit(exact){
  const op=ST.op;
  if(!op||op.type!=='line3'){ cancelOp(); return; }
  if(exact===null||exact===undefined||!(exact>0)){ cancelOp(); return; }
  const a=op.a;
  let du=(op.cur?op.cur.u:a.u)-a.u, dv=(op.cur?op.cur.v:a.v)-a.v;
  if(op.axis==='u'){ dv=0; if(!du) du=1; }
  if(op.axis==='v'){ du=0; if(!dv) dv=1; }
  const L=Math.hypot(du,dv);
  if(L<1e-6){ setStatus(statusLive,'방향을 먼저 — 커서를 움직이거나 축을 고정하세요'); return; }
  const uv={u:Math.round(a.u+du/L*exact),v:Math.round(a.v+dv/L*exact)};
  if(!(op.mass&&ffTrySplit(op,a,uv)))
    emitEdit({type:'edit',op:'sketchline',floorId:'freeform',
      patch:{x1:a.u,y1:a.v,x2:uv.u,y2:uv.v,
        plane:{origin:op.fr.origin,ex:op.fr.ex,ey:op.fr.ey,n:op.fr.n}}});
  op.drew=true; if(op.autoBlue){ op.autoBlue=false; op.axis=null; }
  op.a=uv; op.cur=uv;
  _ff3Ghost(op);
}
// ---------------------------------------------------------------------------
// 프리폼 (2026-09-07 대표 결정)
//  "견적은 어디까지나 미니캐드에서 결정. 미니폼은 미니캐드 정보를 근거로 스케치업처럼
//   자유롭게 렌더링을 잡기 위한 것. 보낸 자료는 처음 밑그림으로만 남고 독립적으로
//   서비스되어야 스케치업 같은 효과가 난다."
//
//  구조 — 모드를 가른다 (연동을 버리는 게 아니다):
//   · 연동 뷰(기본): 지금 그대로 — 여기서 고치면 평면에 반영 (프로토콜 8)
//   · 프리폼 모드: 들어가는 순간 평면이 **밑그림 층**으로 굳는다. 그 위에 그리는
//     스케치·매스는 **자유 층** — 프리폼 자신의 문서·자신의 되돌리기(Ctrl+Z)를 가진다.
//     평면으로는 아무것도 자동으로 안 보낸다. 평면이 바뀌어도 자동으로 안 받는다 —
//     [평면 다시 불러오기] 를 누르면 밑그림 층만 갈아 끼우고 자유 층은 그대로 남는다.
//     (스케치업·아키캐드·레빗이 도면과 모델을 잇는 방식과 같다 — 자동 병합이 아니라
//      명시적 재기준. 자동 병합은 업계도 안 한다.)
//
//  구현의 핵심 한 수: 편집이 나가는 길이 emitEdit 하나다. 연동 뷰에서는 채널로
//  보내고, 프리폼에서는 같은 op 을 ffApply 가 **그 자리에서** 자유 층에 적용한다.
//  계산은 sketch.js 함수들(bag 인자)을 그대로 부른다 — 미니캐드의 _apply3DSketch 와
//  같은 코드가 같은 답을 낸다. 도구·스냅·VCB·그립은 한 벌 그대로 두 모드를 섬긴다.
// ---------------------------------------------------------------------------
const FF_SCHEMA='ECOREAN.FreeForm.v1';
// 독립 프리폼 (2026-09-08 대표 지시 "허브에서 설계견적 미니캐드 밑에 프리폼이라는 3d모델링")
//  /freeform → /minicad/3d/?ff=1. 평면 없이 곧장 자유 모델로 부팅하고, 연동 뷰로는 못 나간다.
//  미니캐드가 다른 탭에 열려 있으면 평면 갱신이 받아져 [평면 다시 불러오기]로 밑그림을 깔 수 있다.
const FF_STANDALONE=/[?&]ff=1/.test(location.search);
let FF=null;   // {base, free:{sketchPts,sketchEdges,sketchFaces,masses}, hist, histPos, group, planLatest, planDirty}
function ffCtx(){ return {ch:(ST.built&&ST.built.ceilH)||2400,fh:2800,fl:0}; }
const FF_PLACE=['furniture','fixtures','lights','electric','hvac'];   // 프리폼 스테이징 배치물
function ffKey(){ return 'minicad.freeform.'+(((ST.built&&ST.built.project)||'기본').replace(/\s+/g,'_')); }
// 프리폼에서 편집해도 되는 것 — 자유 층뿐. 밑그림은 평면(미니캐드)의 것이다.
function ffEditable(o){ return !ST.ffOn||!o||o.floorId==='freeform'; }
// 편집이 나가는 유일한 길
function emitEdit(m){
  if(ST.ffOn) return ffApply(m);
  if(chan) chan.postMessage(m);
  return true;
}
function ffSnapshot(){ return JSON.stringify(FF.free); }
function ffCommit(label){
  if(!FF) return;
  FF.hist=FF.hist.slice(0,FF.histPos+1);
  FF.hist.push(ffSnapshot());
  if(FF.hist.length>120) FF.hist.shift();
  FF.histPos=FF.hist.length-1;
  ffRender();
  if(label) setStatus(true,'🧊 '+label+' (프리폼)');
}
function ffUndo(){
  if(!FF||FF.histPos<=0){ setStatus(true,'🧊 더 물릴 것이 없습니다 (프리폼)'); return true; }
  FF.histPos--; FF.free=JSON.parse(FF.hist[FF.histPos]);
  ffRender(); setStatus(true,'↶ 프리폼 취소'); return true;
}
function ffRedo(){
  if(!FF||FF.histPos>=FF.hist.length-1){ setStatus(true,'🧊 더 되돌릴 것이 없습니다'); return true; }
  FF.histPos++; FF.free=JSON.parse(FF.hist[FF.histPos]);
  ffRender(); setStatus(true,'↷ 프리폼 재실행'); return true;
}
// 자유 층을 화면에 — 밑그림(층 캐시)과 별도의 그룹으로. z0=0 (땅에서부터 자유).
function ffRender(){
  if(!FF) return;
  ST.pendingG.forEach(disposeGhost); ST.pendingG=[];
  const freeDoc={meta:{project:'프리폼',ceilingHeight_mm:ffCtx().ch},
    vertices:[],spaces:[],walls:[],openings:[],pillars:[],
    furniture:FF.free.furniture||[],fixtures:FF.free.fixtures||[],lights:FF.free.lights||[],
    electric:FF.free.electric||[],hvac:FF.free.hvac||[],
    sketchPts:FF.free.sketchPts,sketchEdges:FF.free.sketchEdges,sketchFaces:FF.free.sketchFaces,masses:FF.free.masses,
    planes:FF.free.planes||[]};
  const D=MC3D.normalizeDoc(JSON.parse(JSON.stringify(freeDoc)));
  const one=MC3D.buildFloorScene(D,LIBS);
  if(FF.group) disposeGroup(FF.group);
  const fg=new THREE.Group();
  fg.name='floor:freeform';
  fg.userData.floorId='freeform';
  one.objects.forEach(o=>{ o.floorId='freeform'; o.floorName='프리폼'; addObjGroup(fg,o); });
  one.labels.forEach(l=>{
    if(!l.text) return;
    const sp=makeLabel(l.text);
    sp.position.set(l.x*MM,l.z*MM,l.y*MM);
    fg.add(sp);
  });
  ST.root.add(fg);
  FF.group=fg;
  // 자유 층 스냅 — 그린 것끼리 이어 붙을 수 있게
  // 스냅 후보 = 스케치 점·선 + 매스의 바닥 둘레 (다면체는 bbox 가 아니라 z≈0 인 진짜 꼭짓점·모서리)
  const mverts=[],medges=[];
  (FF.free.masses||[]).forEach(m=>{ try{ const S=massSolid(m,ffCtx()); const th=(m.angle||0)*Math.PI/180,c=Math.cos(th),sn=Math.sin(th),el=Number(m.elev_mm)||0;
      const A=S.verts.map(v=>({x:Math.round(m.x+v.x*c-v.y*sn),y:Math.round(m.y+v.x*sn+v.y*c),z:v.z+el}));
      A.forEach(v=>{ if(Math.abs(v.z)<1.5) mverts.push({x:v.x,y:v.y}); });
      const seen=new Set(); S.faces.forEach(f=>{ for(let i=0;i<f.vs.length;i++){ const a=f.vs[i],b=f.vs[(i+1)%f.vs.length]; const k=Math.min(a,b)+'_'+Math.max(a,b); if(seen.has(k)) continue; seen.add(k); if(Math.abs(A[a].z)<1.5&&Math.abs(A[b].z)<1.5) medges.push({x1:A[a].x,y1:A[a].y,x2:A[b].x,y2:A[b].y}); } }); }catch(_){ } });
  ST.snapData.freeform={
    verts:(D.sketchPts||[]).map(p=>({x:p.x,y:p.y})).concat(mverts),
    walls:(D.sketchEdges||[]).map(e=>({x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2})).concat(medges),
    spaces:[],sketchFaces:(D.sketchFaces||[]).map(x=>({id:x.id,poly:x.polygon})),stats:{}};
  rebuildPickables();
  refreshVisibility();
  reselect();
  if(FF_STANDALONE) ffReselectFace();          // 4차: 같은 면·모서리를 다시 잡는다
  renderOutliner();
  renderAddPal();                               // 프리폼 ⑤: 내 컴포넌트 목록도 갱신
  retunePointLights();                          // 스테이징 조명이 실제로 빛난다
  ffAutosave();
  invalidate(true);
}
// 스냅 자료 — 프리폼에서는 자유 층 + 1층 밑그림을 함께 본다 (밑그림에 이어 그리는 게 보통이라)
function _snapDataOf(fid){
  const sd=ST.snapData[fid];
  if(!(ST.ffOn&&fid==='freeform')) return sd;
  const g=ST.floors[0]&&ST.snapData[ST.floors[0].id];
  if(!sd) return g;
  if(!g) return sd;
  return {verts:sd.verts.concat(g.verts),walls:sd.walls.concat(g.walls),
    spaces:[],sketchFaces:sd.sketchFaces,stats:{},
    guides:(sd.guides||[]).concat(g.guides||[]),xpts:(sd.xpts||[]).concat(g.xpts||[]),gpts:(sd.gpts||[]).concat(g.gpts||[])};   // 안내선·교차점·안내점도 합친다 (빠져 있어 단독에서 안내선 스냅이 안 걸렸다)
}
// 프로토콜 op 을 자유 층에 그 자리에서 적용 — 미니캐드 _apply3DSketch 의 프리폼판.
//  같은 sketch.js 함수를 부르므로 두 모드가 같은 답을 낸다.
function ffApply(m){
  if(!FF||!m||!m.op) return false;
  const bag=FF.free, p=m.patch||{};
  const N=v=>Math.round(Number(v));
  const fin=(...a)=>a.every(v=>isFinite(v));
  const ctx=ffCtx();
  const massOf=id=>(bag.masses||[]).find(x=>x&&x.id===id);
  const no=t=>{ setStatus(true,'🧊 '+t); return false; };
  let ok=false,label='',madeId=null;
  switch(m.op){
    case 'undo': return ffUndo();
    case 'redo': return ffRedo();
    case 'batch': {
      let n=0; FF.mute=true; FF._gidMap={};             // 복사된 그룹이 한 몸이 되도록
      (m.ops||[]).forEach(o=>{ if(ffApply(Object.assign({type:'edit'},o))) n++; });
      FF.mute=false;
      if(n){ ffCommit((m.label||'묶음')+' '+n+'건'); return true; }
      return no('밑그림은 평면(미니캐드)에서 고칩니다 — 프리폼에서는 자유 층만');
    }
    case 'splitspace':                       // 프리폼에 방 분할은 없다 — 그냥 선이다
    case 'sketchline': {
      const x1=N(p.x1),y1=N(p.y1),x2=N(p.x2),y2=N(p.y2);
      if(!fin(x1,y1,x2,y2)||Math.hypot(x2-x1,y2-y1)<10) return false;
      const B=_ffBagFor(p.plane);                       // 프리폼 2단계: 평면이 실렸으면 그 평면의 그래프
      ok=skAddEdge(x1,y1,x2,y2,B).length>0; label=p.plane?'면 위 선':'선'; break;
    }
    case 'sketchrect': {
      const x1=N(p.x1),y1=N(p.y1),x2=N(p.x2),y2=N(p.y2);
      if(!fin(x1,y1,x2,y2)||Math.abs(x2-x1)<10||Math.abs(y2-y1)<10) return false;
      const B=_ffBagFor(p.plane);
      ok=!!skAddRect(Math.min(x1,x2),Math.min(y1,y2),Math.max(x1,x2),Math.max(y1,y2),B);
      label=p.plane?'면 위 사각형 → 면':'사각형 → 면'; break;
    }
    case 'sketchcircle': {
      const cx=N(p.cx),cy=N(p.cy),r=N(p.r);
      if(!fin(cx,cy,r)||r<10) return false;
      ok=!!skAddCircle(cx,cy,r,p.n||32,_ffBagFor(p.plane)); label='원 → 면'; break;
    }
    case 'sketchpoly': {
      if(!Array.isArray(p.pts)||p.pts.length<3) return false;
      const pts=p.pts.map(q=>({x:N(q.x),y:N(q.y)}));
      if(!pts.every(q=>fin(q.x,q.y))) return false;
      const f0=pts[0],l0=pts[pts.length-1];
      if(pts.length>3&&Math.hypot(f0.x-l0.x,f0.y-l0.y)<30) pts.pop();
      if(pts.length<3) return false;
      ok=!!skAddPoly(pts,_ffBagFor(p.plane)); label=p.plane?'면 위 다각형 → 면':'다각형 → 면'; break;
    }
    case 'sketchdel': {                                 // 모든 그래프(바닥+평면들)에서 찾는다
      ok=_ffAllBags().some(B=>skRemove(m.kind,m.id,B));
      label='스케치 삭제'; break;
    }
    case 'sketchclear': {
      let nn=0; _ffAllBags().forEach(B=>{nn+=skClear(B);});
      FF.free.planes=[];
      ok=nn>0; label='스케치 비움'; break;
    }
    case 'extrude': {
      const hit=_ffFindFace(p.id);
      if(!hit) return no('그 면은 밑그림입니다 — 프리폼 면만 올릴 수 있습니다');
      const z=N(p.z); if(!isFinite(z)||z<10) return false;
      if(hit.plane){                                     // 프리폼 2단계: 평면 면 → 법선으로 뽑아 자유 다면체
        const mm=planeExtrude(hit.plane,hit.face,z,FF.free);
        if(!mm) return false;
        madeId=mm.id; ok=true; label='면 → 입체 '+z+'mm (법선)';
        break;
      }
      const poly=skFacePoly(hit.face,hit.bag); if(poly.length<3) return false;
      _skConsumeFace(hit.face,hit.bag);
      const mm=massFromPoly(poly,z,hit.bag);
      madeId=mm.id; ok=true; label='면 → 매스 Z='+z;
      break;
    }
    case 'setz': {
      const mass=massOf(p.id); if(!mass) return no('밑그림 매스는 평면에서 — 프리폼 매스만');
      const vs=Array.isArray(p.verts)?p.verts:[]; if(!vs.length) return false;
      let n=0;
      vs.forEach(v=>{ const i=N(v&&v.i),z=N(v&&v.z);
        if(isFinite(i)&&isFinite(z)&&z>=0){ massVertZ(mass,i,z,ctx); n++; } });
      ok=n>0; label='꼭짓점 z '+(vs[0]&&N(vs[0].z))+'mm'; break;
    }
    case 'settop': {
      const mass=massOf(p.id); if(!mass) return no('밑그림 매스는 평면에서');
      const z=N(p.z); if(!isFinite(z)) return false;
      massSetTop(mass,z,ctx); ok=true; label='윗면 Z '+z; break;
    }
    case 'zref': {
      const mass=massOf(p.id); if(!mass) return no('밑그림 매스는 평면에서');
      const r=String(p.r||'ch'); if(!['ch','fh','fl'].includes(r)) return false;
      const off=N(p.o)||0;
      const vs=Array.isArray(p.verts)?p.verts:[]; if(!vs.length) return false;
      vs.forEach(i=>massVertZ(mass,N(i),{r,o:off},ctx));
      ok=true; label='꼭짓점 '+vs.length+'개 = CH'+(off>=0?'+':'')+off; break;
    }
    case 'move': case 'set': case 'rotate': case 'lock': {
      if(FF_PLACE.includes(m.kind)){                    // 프리폼 스테이징 배치물
        const o=(bag[m.kind]||[]).find(x=>x&&x.id===m.id);
        if(!o) return no('밑그림 배치물은 평면(미니캐드)에서 고칩니다');
        if(m.op==='lock'){ o.locked=!!p.locked; ok=true; label=p.locked?'잠금':'잠금 해제'; break; }
        let nn=0;
        ['x','y','angle','inch','length_mm','w','h','elev_mm'].forEach(k=>{
          if(p[k]!==undefined&&isFinite(Number(p[k]))){ o[k]=N(p[k]); nn++; } });
        if(p.flipped!==undefined){ o.flipped=!!p.flipped; nn++; }
        ok=nn>0; label=m.op==='move'?'이동':(m.op==='rotate'?'회전':'수정'); break;
      }
      if(m.kind!=='masses') return no('밑그림은 평면(미니캐드)에서 고칩니다');
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      if(m.op==='lock'){ mass.locked=!!p.locked; ok=true; label=p.locked?'잠금':'잠금 해제'; break; }
      const ALLOW=['h_mm','elev_mm','name','color','x','y','angle','tag','shadow'];
      let n=0;
      if(p.mat!==undefined){                            // 프리폼 재질 — 렌더 전용, 견적 무관
        if(p.mat===null) delete mass.mat;
        else mass.mat=String(p.mat).slice(0,40);
        n++;
      }
      ALLOW.forEach(k=>{ if(p[k]!==undefined){
        mass[k]=(k==='name'||k==='color'||k==='tag'||k==='shadow')?p[k]:N(p[k]);
        if((k==='tag'||k==='shadow')&&(!mass[k]||mass[k]==='both')) delete mass[k];
        if(k==='h_mm') mass[k]=Math.max(10,mass[k]);
        n++; } });
      ok=n>0; label=m.op==='move'?'이동':'수정'; break;
    }
    case 'clone': {
      if(FF_PLACE.includes(m.kind)){                    // 배치물 복제 (Ctrl+끌기·붙여넣기)
        const src=(bag[m.kind]||[]).find(x=>x&&x.id===m.id);
        if(!src) return no('밑그림 배치물은 평면에서');
        const cp=JSON.parse(JSON.stringify(src));
        cp.id=m.kind.charAt(0)+'f_'+Date.now()+'_'+Math.floor(Math.random()*1e4);
        cp.x=isFinite(Number(p.x))?N(p.x):src.x+300;
        cp.y=isFinite(Number(p.y))?N(p.y):src.y+300;
        bag[m.kind].push(cp); madeId=cp.id; ok=true; label='복제'; break;
      }
      if(m.kind!=='masses') return no('복제는 프리폼 매스만');
      const src=massOf(m.id); if(!src) return no('밑그림 매스는 평면에서');
      const cp=JSON.parse(JSON.stringify(src));
      cp.id='ms_'+Date.now()+'_'+Math.floor(Math.random()*1e4);
      cp.x=isFinite(Number(p.x))?N(p.x):src.x+300;
      cp.y=isFinite(Number(p.y))?N(p.y):src.y+300;
      if(isFinite(Number(p.angle))) cp.angle=((N(p.angle)%360)+360)%360;   // 회전 복사
      if(src.gid){                                      // 프리폼 ⑤: 사본이 원본 그룹에 끼어들면 안 된다
        const map=FF.mute?(FF._gidMap||(FF._gidMap={})):null;
        cp.gid=map?(map[src.gid]||(map[src.gid]='g_'+Date.now()+'_'+Math.floor(Math.random()*1e4)))
                  :('g_'+Date.now()+'_'+Math.floor(Math.random()*1e4));
      }
      bag.masses.push(cp); madeId=cp.id; ok=true; label='복제'; break;
    }
    case 'delete': {
      if(FF_PLACE.includes(m.kind)){
        const i=(bag[m.kind]||[]).findIndex(x=>x&&x.id===m.id);
        if(i<0) return no('밑그림 배치물은 평면에서 지웁니다');
        bag[m.kind].splice(i,1); ok=true; label='삭제'; break;
      }
      if(m.kind!=='masses') return no('밑그림은 평면(미니캐드)에서 지웁니다');
      const i=(bag.masses||[]).findIndex(x=>x&&x.id===m.id);
      if(i<0) return no('밑그림 매스는 평면에서 지웁니다');
      bag.masses.splice(i,1); ok=true; label='삭제'; break;
    }
    case 'cut': {                                       // 프리폼 ③: 매스 속으로 파낸다 (벽감·관통)
      const hitF=_ffFindFace(p.id);
      if(!hitF||!hitF.plane) return no('벽감은 매스 면 위에 그린 면에서만 팝니다');
      const d=N(p.d); if(!isFinite(d)||d<10) return false;
      const uvp=skFacePoly(hitF.face,hitF.bag);
      if(uvp.length<3) return false;
      const abs={origin:hitF.plane.origin,ex:hitF.plane.ex,ey:hitF.plane.ey,n:hitF.plane.n};
      let res=null,leaked=false;
      for(const host of (bag.masses||[])){
        const r=massAddCut(host,abs,uvp,d,ctx);
        if(r&&r.cut){ res=r; break; }
        if(r&&r.err==='inside'){ leaked=true; break; }
      }
      if(leaked) return no('면이 벽 밖으로 걸쳤습니다 — 벽면 안에 온전히 그려주세요');
      if(!res) return no('파낼 몸통이 없습니다 — 프리폼 매스의 면에 그린 것만 (밑그림은 평면에서)');
      _skConsumeFace(hitF.face,hitF.bag);
      ok=true;
      label=res.through?('관통 — 벽을 뚫었습니다 ('+res.cut.d+'mm)'):('벽감 '+d+'mm');
      break;
    }
    case 'followme': {                                  // 프리폼 ④: 단면을 둘레 따라 (몰딩·걸레받이)
      const prof=moldingProfile(p.profile&&p.profile.kind,p.profile&&p.profile.w,p.profile&&p.profile.h);
      let path=null,closed=true,base=0,nm='몰딩';
      if(p.massId){
        const host=(bag.masses||[]).find(x=>x&&x.id===p.massId);
        if(!host) return no('밑그림 매스에는 몰딩을 못 두릅니다 — 프리폼 매스만');
        path=massAbsPoly(host);
        const el=Math.round(Number(host.elev_mm)||0);
        if(p.at==='top'){
          if(!massIsPrism(host)) return no('위 둘레 몰딩은 윗면이 평평한 매스만 (빗천장은 아직)');
          base=el+Math.round(zNum(host.h_mm,ctx)); nm='천장몰딩';
        }else{ base=el; nm='걸레받이'; }
      }else if(Array.isArray(p.pts)&&p.pts.length>=2){
        path=p.pts.map(q=>({x:N(q.x),y:N(q.y)}));
        closed=!!p.closed; base=N(p.z)||0; nm='몰딩';
      }else return false;
      const sw=sweepProfile(path,closed,base,prof);
      if(!sw) return no('경로가 너무 짧습니다');
      const mm=massFromSweep(nm+((bag.masses||[]).length+1),sw,bag);
      if(!mm) return false;
      madeId=mm.id; ok=true;
      label=nm+' — 둘레 '+Math.round(path.reduce((a,q,i)=>{const b=path[(i+1)%path.length];
        return a+((closed||i<path.length-1)?Math.hypot(b.x-q.x,b.y-q.y):0);},0))/1000*1000/1000+'m';
      break;
    }
    case 'group': {                                     // 프리폼 ⑤: 여럿을 하나로 (스케치업 그룹)
      const ms=(Array.isArray(p.ids)?p.ids:[]).map(i=>massOf(i)).filter(Boolean);
      if(ms.length<1) return no('프리폼 매스를 골라야 묶습니다');
      const gid='g_'+Date.now()+'_'+Math.floor(Math.random()*1e4);
      ms.forEach(x=>{x.gid=gid;});
      ok=true; label='그룹 묶기 — '+ms.length+'개 (클릭=그룹 전체 · 더블클릭=하나만)'; break;
    }
    case 'ungroup': {
      const ms=(bag.masses||[]).filter(x=>x&&x.gid===p.gid);
      if(!ms.length) return false;
      ms.forEach(x=>{delete x.gid;});
      ok=true; label='그룹 풀기 — '+ms.length+'개'; break;
    }
    case 'compsave': {                                  // 그룹 → 이름 붙은 컴포넌트 (문서에 저장)
      const ms=(bag.masses||[]).filter(x=>x&&x.gid===p.gid);
      if(!ms.length) return no('그룹을 먼저 묶어주세요 (여럿 선택 → 그룹 묶기)');
      const ax=Math.round(ms.reduce((a,x)=>a+x.x,0)/ms.length);
      const ay=Math.round(ms.reduce((a,x)=>a+x.y,0)/ms.length);
      if(!Array.isArray(bag.comps)) bag.comps=[];
      const cidS='cp_'+Date.now()+'_'+Math.floor(Math.random()*1e4); ms.forEach(x=>{x.cid=cidS;});
      bag.comps.push({id:cidS,
        name:String(p.name||'컴포넌트').slice(0,40),
        masses:ms.map(x=>{const c=JSON.parse(JSON.stringify(x));
          c.x=Math.round(c.x-ax); c.y=Math.round(c.y-ay); delete c.gid; delete c.id; return c;})});
      ok=true; label='컴포넌트 저장: '+String(p.name||'컴포넌트')+' — 구성요소 칸에서 스탬프'; break;
    }
    case 'stamp': {                                     // 컴포넌트를 클릭한 자리에 찍는다 (독립 사본)
      const cp=(bag.comps||[]).find(c=>c&&c.id===p.compId);
      if(!cp) return false;
      const X=N(p.x),Y=N(p.y);
      if(!fin(X,Y)) return false;
      const gid='g_'+Date.now()+'_'+Math.floor(Math.random()*1e4);
      let seq=0;
      cp.masses.forEach(src=>{
        const c=JSON.parse(JSON.stringify(src));
        c.id='ms_'+Date.now()+'_'+(++seq)+'_'+Math.floor(Math.random()*1e4);
        c.gid=gid; c.cid=cp.id; c.x=X+c.x; c.y=Y+c.y;
        bag.masses.push(c); madeId=c.id;
      });
      ok=true; label='스탬프: '+cp.name+' ('+cp.masses.length+'개) — 계속 찍으려면 다시 클릭 · Esc=끝'; break;
    }
    case 'massconvert': return no('프리폼에서는 매스 그대로 씁니다 — 공간·벽 전환은 연동 뷰(평면)의 일');
    case 'ceilmass': return no('천장 지정은 평면(견적)의 일 — 연동 뷰에서');
    case 'add': {                                       // 프리폼 스테이징 — 가구·조명을 자유 층에
      if(!FF_PLACE.includes(m.kind)||!p.type) return false;
      const T={furniture:[LIBS.FURNITURE_LIB,LIBS.FIXFURN_LIB],fixtures:[LIBS.FIXTURE_LIB],
        lights:[LIBS.LIGHT_LIB],electric:[LIBS.ELECTRIC_LIB],hvac:[LIBS.HVAC_FIRE_LIB]}[m.kind]||[];
      const def=T.filter(Boolean).map(t=>t&&t[p.type]).find(Boolean);
      if(!def) return no('라이브러리에 없는 종류: '+p.type);
      if(!Array.isArray(bag[m.kind])) bag[m.kind]=[];
      const o={id:m.kind.charAt(0)+'f_'+Date.now()+'_'+Math.floor(Math.random()*1e4),
        type:p.type,x:N(p.x)||0,y:N(p.y)||0,angle:((N(p.angle)||0)%360+360)%360,
        flipped:!!p.flipped,spaceId:null,layerName:''};
      ['inch','length_mm','w','h','elev_mm'].forEach(k=>{ if(isFinite(Number(p[k]))) o[k]=N(p[k]); });
      bag[m.kind].push(o);
      madeId=o.id; ok=true; label='배치: '+(def.name||p.type)+' (스테이징 — 견적 무관)';
      break;
    }
    // ===== 2026-09-08 스케치업 100% — 새 op =====
    case 'scale': {                                     // 매스 배율 (스케치업 Scale) — 원점(매스 중심) 기준
      if(m.kind!=='masses') return no('배율은 프리폼 매스만');
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const sx=Number(p.sx)||1, sy=Number(p.sy)||sx, sz=Number(p.sz)||sx;
      if(!(sx>0&&sy>0&&sz>0)||[sx,sy,sz].some(v=>v<0.01||v>100)) return false;
      massScaleAbout(mass,{x:sx,y:sy,z:sz},{x:Number(p.ax)||0,y:Number(p.ay)||0,z:Number(p.az)||0},ctx);   // 기준점(그립 반대편·Ctrl=중심) 기준
      ok=true; label='배율 ×'+sx.toFixed(2)+(sx!==sy||sy!==sz?'·'+sy.toFixed(2)+'·'+sz.toFixed(2):''); break;
    }
    case 'scaleall': {                                  // 줄자 → 모델 전체 크기 조정 (원점 기준)
      const k=Number(p.k); if(!(k>0.001&&k<1000)) return false;
      const S=v=>Math.round(v*k);
      _ffAllBags().forEach(B=>{ (B.sketchPts||[]).forEach(q=>{ q.x=S(q.x); q.y=S(q.y); }); });
      (bag.planes||[]).forEach(pl=>{ if(pl.origin){ pl.origin.x*=k; pl.origin.y*=k; pl.origin.z*=k; } });
      (bag.masses||[]).forEach(ms=>{ ms.x=S(ms.x); ms.y=S(ms.y); ms.elev_mm=S(ms.elev_mm||0); ms.pts=ms.pts.map(q=>({x:S(q.x),y:S(q.y)}));
        if(Array.isArray(ms.solidVerts)){ ms.solidVerts=ms.solidVerts.map(v=>({x:S(v.x),y:S(v.y),z:S(zNum(v.z,ctx))})); ms.h_mm=Math.max(10,Math.max(...ms.solidVerts.map(v=>v.z))); }
        else ms.h_mm=Math.max(10,S(zNum(ms.h_mm,ctx)));
        if(Array.isArray(ms.cuts)) ms.cuts.forEach(c=>{ if(c.plane&&c.plane.origin){ c.plane.origin.x*=k; c.plane.origin.y*=k; c.plane.origin.z*=k; } if(Array.isArray(c.uv)) c.uv=c.uv.map(q=>({x:q.x*k,y:q.y*k})); c.d=S(c.d||0); }); });
      FF_PLACE.forEach(kk=>(bag[kk]||[]).forEach(o=>{ o.x=S(o.x); o.y=S(o.y); if(o.elev_mm) o.elev_mm=S(o.elev_mm); }));
      ok=true; label='모델 전체 크기 ×'+k.toFixed(3); break;
    }
    case 'sweep': {                                     // 팔로우 미 (일반 단면) — 단면 [{u,v}] 을 경로 따라
      const prof=(Array.isArray(p.profile)?p.profile:[]).map(q=>({u:N(q.u),v:N(q.v)}));
      const path=(Array.isArray(p.pts)?p.pts:[]).map(q=>({x:N(q.x),y:N(q.y)}));
      if(prof.length<3||path.length<2) return false;
      const sw=sweepProfile(path,!!p.closed,N(p.z)||0,prof);
      if(!sw) return no('경로가 너무 짧습니다');
      const mm=massFromSweep(String(p.name||'팔로우미'),sw,bag,p.color||'#8B6F47');
      if(!mm) return false;
      if(p.faceId){ const hf=_ffFindFace(p.faceId); if(hf) _skConsumeFace(hf.face,hf.bag); }   // 스케치업: 단면은 소비된다
      madeId=mm.id; ok=true; label='팔로우 미 ('+prof.length+'점 단면 · 경로 '+path.length+'변)'; break;
    }
    case 'massfromfaces': {                             // 절대 면 목록 → 매스 (OBJ 가져오기)
      const faces=(Array.isArray(p.faces)?p.faces:[]).map(r=>r.map(q=>({x:Number(q.x),y:Number(q.y),z:Number(q.z)}))).filter(r=>r.length>=3&&r.every(q=>fin(q.x,q.y,q.z)));
      if(!faces.length) return false;
      const mm=massFromCsgFaces(String(p.name||'가져온 매스').slice(0,40),faces,p.color||null,bag); if(!mm) return false;
      madeId=mm.id; ok=true; label='가져오기: '+mm.name; break;
    }
    case 'massfrompoly': {                              // 다각형 → 매스 곧장 (3D 문자 등 — 스케치 그래프를 거치지 않는다)
      const pts=(Array.isArray(p.pts)?p.pts:[]).map(q=>({x:N(q.x),y:N(q.y)}));
      if(pts.length<3||!pts.every(q=>fin(q.x,q.y))) return false;
      const z=N(p.z); if(!(z>=1)) return false;
      const mm=massFromPoly(pts,z,bag); if(!mm) return false;
      if(p.name) mm.name=String(p.name).slice(0,40);
      if(p.gid) mm.gid=String(p.gid);
      if(p.color) mm.color=String(p.color);
      madeId=mm.id; ok=true; label=(p.name||'매스')+' 생성'; break;
    }
    case 'mkcomp': {                                    // 컴포넌트 만들기 (Shift+G) — 그룹 + 정의 저장 + 인스턴스 표시
      const ms=(Array.isArray(p.ids)?p.ids:[]).map(i=>massOf(i)).filter(Boolean);
      if(!ms.length) return no('컴포넌트로 만들 프리폼 매스가 없습니다');
      const gid='g_'+Date.now()+'_'+Math.floor(Math.random()*1e4), cid='cp_'+Date.now()+'_'+Math.floor(Math.random()*1e4);
      const ax=Math.round(ms.reduce((a,x)=>a+x.x,0)/ms.length), ay=Math.round(ms.reduce((a,x)=>a+x.y,0)/ms.length);
      ms.forEach(x=>{ x.gid=gid; x.cid=cid; });
      if(!Array.isArray(bag.comps)) bag.comps=[];
      bag.comps.push({id:cid,name:String(p.name||'컴포넌트').slice(0,40),
        masses:ms.map(x=>{ const c=JSON.parse(JSON.stringify(x)); c.x=Math.round(c.x-ax); c.y=Math.round(c.y-ay); delete c.gid; delete c.id; delete c.cid; return c; })});
      ok=true; label='컴포넌트 "'+String(p.name||'컴포넌트')+'" — 구성요소 칸에서 스탬프 · 편집▸정의 갱신'; break;
    }
    case 'compupdate': {                                // 이 인스턴스로 정의 갱신 → 다른 인스턴스 전부 따라온다 (스케치업 컴포넌트 라이브 링크)
      const ms=(bag.masses||[]).filter(x=>x&&x.gid===p.gid);
      if(!ms.length) return no('그룹을 찾지 못했습니다');
      const cid=ms[0].cid; const cp=(bag.comps||[]).find(c=>c&&c.id===cid);
      if(!cid||!cp) return no('컴포넌트 인스턴스가 아닙니다 — 먼저 컴포넌트로 만드세요 (Shift+G)');
      const ax=Math.round(ms.reduce((a,x)=>a+x.x,0)/ms.length), ay=Math.round(ms.reduce((a,x)=>a+x.y,0)/ms.length);
      cp.masses=ms.map(x=>{ const c=JSON.parse(JSON.stringify(x)); c.x=Math.round(c.x-ax); c.y=Math.round(c.y-ay); delete c.gid; delete c.id; delete c.cid; return c; });
      const others={};
      (bag.masses||[]).forEach(x=>{ if(x&&x.cid===cid&&x.gid!==p.gid){ (others[x.gid]=others[x.gid]||[]).push(x); } });
      let nInst=0, seq=0;
      Object.entries(others).forEach(([g2,arr])=>{
        const bx=Math.round(arr.reduce((a,x)=>a+x.x,0)/arr.length), by=Math.round(arr.reduce((a,x)=>a+x.y,0)/arr.length);
        bag.masses=bag.masses.filter(x=>!(x&&x.gid===g2));
        cp.masses.forEach(src=>{ const c=JSON.parse(JSON.stringify(src)); c.id='ms_'+Date.now()+'_'+(++seq)+'_'+Math.floor(Math.random()*1e4); c.gid=g2; c.cid=cid; c.x=bx+c.x; c.y=by+c.y; bag.masses.push(c); });
        nInst++;
      });
      ok=true; label='컴포넌트 "'+cp.name+'" 정의 갱신 — 다른 인스턴스 '+nInst+'개 따라옴'; break;
    }
    case 'facemat': {                                   // 면 하나에 재질 (Ctrl+페인트) — 각기둥이면 다면체로 승격
      if(m.kind!=='masses') return false;
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      massToSolid(mass,ctx);
      const P=p.p||{}, Nn=p.n||{};
      const verts=mass.solidVerts.map(v=>({x:v.x,y:v.y,z:zNum(v.z,ctx)}));
      let hitF=null,bd=Infinity;
      mass.solidFaces.forEach(f=>{ const fn=faceNormal(verts,f.vs); const dot=fn.x*Nn.x+fn.y*Nn.y+fn.z*Nn.z; if(dot<0.8) return;
        const v0=verts[f.vs[0]]; const d=Math.abs((P.x-v0.x)*fn.x+(P.y-v0.y)*fn.y+(P.z-v0.z)*fn.z); if(d<bd){ bd=d; hitF=f; } });
      if(!hitF||bd>25) return no('클릭한 면을 찾지 못했습니다');
      if(p.mat===null) delete hitF.mat; else hitF.mat=String(p.mat).slice(0,40);
      ok=true; label='면 재질 '+(p.mat||'지움'); break;
    }
    case 'solid': {                                     // 솔리드 도구 — 결합·빼기·교차·다듬기·분할 (BSP CSG, sketch.js)
      const ids=Array.isArray(p.ids)?p.ids:[];
      if(p.kind==='shell'){                            // 외곽 셸 — 고른 것 전부 결합
        const ms=ids.map(massOf).filter(Boolean); if(ms.length<2) return no('외곽 셸: 매스 둘 이상');
        let acc=ms[0]; for(let i=1;i<ms.length;i++){ const r=massCSG('union',acc,ms[i],ctx); if(!r.length) return no('결합 실패'); acc=r[0]; }
        bag.masses=bag.masses.filter(x=>!ms.includes(x)); acc.name='외곽 셸'; bag.masses.push(acc); madeId=acc.id; ok=true; label='외곽 셸 ('+ms.length+'개 결합)'; break;
      }
      const A=massOf(ids[0]), Bm=massOf(ids[1]);
      if(!A||!Bm) return no('솔리드 도구: 프리폼 매스 둘을 고르세요 (먼저 고른 것이 기준)');
      if(typeof massCSG!=='function') return no('솔리드 엔진이 없습니다');
      const r=massCSG(p.kind,A,Bm,ctx);
      if(!r||!r.length) return no('결과가 비었습니다 (겹치지 않거나 너무 얇습니다)');
      const keepA=(p.kind==='trim');                    // 다듬기: 자르는 쪽(첫째)은 남는다 (스케치업 Trim)
      bag.masses=bag.masses.filter(x=>(keepA||x!==A)&&x!==Bm);
      r.forEach(mm=>{ bag.masses.push(mm); madeId=mm.id; });
      ok=true; label='솔리드 '+({union:'결합',subtract:'빼기',intersect:'교차',trim:'다듬기',split:'분할'})[p.kind]+' → '+r.length+'개'; break;
    }
    // ===== 스케치업 100% 2차 — 면·꼭짓점 직접 편집 =====
    case 'pushface': {                                  // 밀기끌기 = 면 이동 (Ctrl=새 매스)
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const d=N(p.d); if(!isFinite(d)||!d) return false;
      if(p.copy){ const mm=massExtrudeFaceNew(mass,p.p,p.n,d,ctx,bag); if(!mm) return no('그 면을 뽑지 못했습니다'); madeId=mm.id; ok=true; label='면에서 새 매스 '+d+'mm'; break; }
      const r=massPushFace(mass,p.p,p.n,d,ctx); if(!r) return no('그 면을 밀지 못했습니다');
      ok=true; label='면 밀기끌기 '+r.d+'mm'; break;
    }
    case 'setxy': {                                     // 꼭짓점 xy 이동
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const idxs=(Array.isArray(p.idxs)?p.idxs:[]).map(N).filter(i=>isFinite(i));
      if(!idxs.length) return false;
      if(!massVertXY(mass,idxs,p.dx,p.dy,ctx)) return false;
      ok=true; label='꼭짓점 이동 ('+N(p.dx)+', '+N(p.dy)+')'; break;
    }
    case 'rotate3': {                                   // 임의 축 회전 (면 축)
      const src=massOf(m.id); if(!src) return no('밑그림 매스는 평면에서');
      const deg=Number(p.deg); if(!isFinite(deg)||!deg) return false;
      let mass=src;
      if(p.copy){ mass=JSON.parse(JSON.stringify(src)); mass.id='ms_'+Date.now()+'_'+Math.floor(Math.random()*1e4); delete mass.gid; bag.masses.push(mass); madeId=mass.id; }
      massRotate3(mass,p.axis||{x:0,y:0,z:1},p.about||{x:0,y:0,z:0},deg,ctx);
      ok=true; label='면 축 회전 '+Math.round(deg)+'°'+(p.copy?' (복사)':''); break;
    }
    case 'flip': {                                      // 뒤집기 (Flip Along)
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const ax=String(p.axis||'x'); if(!/^[xyz]$/.test(ax)) return false;
      massFlip(mass,ax,ctx); ok=true; label='뒤집기 ('+({x:'빨강',y:'초록',z:'파랑'})[ax]+' 축 방향)'; break;
    }
    // ===== 스케치업 100% 4차 — 면·모서리 편집 =====
    case 'moveverts': {                                 // 면·모서리·꼭짓점(로컬 좌표) 이동
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const pts=(Array.isArray(p.pts)?p.pts:[]).map(q=>({x:Number(q.x),y:Number(q.y),z:Number(q.z)})); const d=p.d||{};
      if(!pts.length) return false;
      const r=massMoveVerts(mass,pts,d,ctx); if(!r) return no('옮길 꼭짓점을 찾지 못했습니다');
      ok=true; label='면·모서리 이동 ('+r.n+'점)'; break;
    }
    case 'delface': {                                   // 면 삭제 → 열린 껍질
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const r=massDeleteFace(mass,p.p,p.n,ctx); if(!r) return no('그 면을 찾지 못했습니다');
      if(!mass.solidFaces.length){ bag.masses=bag.masses.filter(x=>x!==mass); label='마지막 면 삭제 → 매스 제거'; } else label='면 삭제 (열린 껍질)';
      ok=true; break;
    }
    case 'deledge': {                                   // 모서리 삭제 → 붙은 면도
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const r=massDeleteEdge(mass,p.a,p.b,ctx); if(!r) return no('그 모서리를 찾지 못했습니다');
      if(!mass.solidFaces.length){ bag.masses=bag.masses.filter(x=>x!==mass); label='면이 다 사라져 매스 제거'; } else label='모서리 삭제 (면 '+r.removed+'개 함께)';
      ok=true; break;
    }
    case 'delvert': {                                   // 꼭짓점 삭제 → 붙은 면도
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      const r=massDeleteVertex(mass,p.p,ctx); if(!r) return no('그 꼭짓점을 찾지 못했습니다');
      if(!mass.solidFaces.length){ bag.masses=bag.masses.filter(x=>x!==mass); label='면이 다 사라져 매스 제거'; } else label='꼭짓점 삭제 (면 '+r.removed+'개 함께)';
      ok=true; break;
    }
    case 'splitface': {                                 // 면 위의 선으로 면을 나눈다
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      if(!massSplitFace(mass,p.p,p.n,p.a,p.b,ctx)) return no('선의 양 끝이 면의 모서리에 닿아야 면이 나뉩니다');
      ok=true; label='면 분할'; break;
    }
    case 'reverseface': {
      const mass=massOf(m.id); if(!mass) return no('밑그림 매스는 평면에서');
      if(!massReverseFace(mass,p.p,p.n,ctx)) return no('그 면을 찾지 못했습니다');
      ok=true; label='면 뒤집기'; break;
    }
    default: return no('프리폼이 모르는 명령: '+m.op);
  }
  if(!ok) return false;
  if(!FF.mute){
    ffCommit(label);
    if(madeId){                              // 새로 만든 것을 바로 잡아 준다 (스케치업 손버릇)
      const g=FF.group&&FF.group.children.find(x=>x.userData.obj&&String(x.userData.obj.id)===String(madeId));
      if(g){
        const o=g.userData.obj;
        const gs=(o&&o.meta&&o.meta.gid)?_ffGroupOf(o.meta.gid):[];
        if(gs.length>1) selectGroups(gs); else select(g,{silent:true});
      }
    }
  }
  return true;
}
// 저장·복원 — 프리폼은 자기 문서를 가진다
const FF_QUOTA=5*1024*1024;                       // 브라우저 저장소 한도 (실측 약 4.9MB)
function ffDocJSON(){ return JSON.stringify({schema:FF_SCHEMA,at:Date.now(),base:FF.base,free:FF.free}); }
function ffAutosave(){
  if(!FF) return;
  let s;
  try{ s=ffDocJSON(); }catch(_){ return; }
  ST.saveBytes=s.length;
  try{
    localStorage.setItem(ffKey(),s);
    if(ST.saveFail){ ST.saveFail=null; ffSaveBanner(); }        // 다시 들어갔다 — 경고 내림
  }catch(err){
    ST.saveFail=(err&&err.name)||'QuotaExceededError';           // 종전엔 여기서 조용히 삼켰다 (작업이 날아가도 모름)
    ffSaveBanner();
  }
  ffSaveMeter();
}
// 저장이 막혔다는 것을 화면에 남긴다 — 상태줄은 다음 동작에 덮이므로 배너로
function ffSaveBanner(){
  const el=$('savewarn'); if(!el) return;
  if(!ST.saveFail){ el.style.display='none'; return; }
  const mb=((ST.saveBytes||0)/1048576).toFixed(1);
  const t=el.querySelector('.sw-t'); if(t) t.textContent='브라우저 저장소가 가득 찼습니다 ('+mb+'MB · 한도 약 5MB) — 이 뒤의 작업은 자동 저장되지 않습니다';
  el.style.display='flex';
  setStatus(false,'⚠ 자동 저장 실패 — 파일이나 클라우드로 저장하세요');
}
function ffSaveMeter(){
  const el=$('mi-save'); if(!el) return;
  const b=ST.saveBytes||0, pct=Math.min(100,Math.round(b/FF_QUOTA*1000)/10);
  const col=pct>90?'#FF7A59':pct>70?'#E6C787':'#7CF2D6';
  el.innerHTML='<b>저장 용량</b> — '+(b/1024).toFixed(0)+' KB / 약 5 MB ('+pct+'%)'+
    (ST.saveFail?' <b style="color:#FF7A59">· 가득 참: 자동 저장 멈춤</b>':'')+
    '<div style="height:5px;border-radius:3px;background:rgba(255,255,255,.08);margin-top:5px;overflow:hidden">'+
    '<div style="height:100%;width:'+pct+'%;background:'+col+';box-shadow:0 0 8px '+col+'"></div></div>'+
    '<div style="margin-top:5px;font-size:10.5px">클라우드에 저장하면 이 한도를 받지 않고 다른 기기에서도 열립니다 (파일 ▸ 클라우드에 저장)</div>';
}
function ffLoadLocal(){
  try{
    const raw=localStorage.getItem(ffKey());
    if(!raw) return null;
    const j=JSON.parse(raw);
    return (j&&j.schema===FF_SCHEMA&&j.free)?j:null;
  }catch(_){ return null; }
}
// 프리폼 문서 하나를 통째로 적용 — 파일 열기·클라우드 열기가 같은 길을 쓴다
function ffApplyDoc(j,label){
  if(!j||j.schema!==FF_SCHEMA||!j.free) throw new Error('프리폼 문서가 아닙니다');
  if(!ST.ffOn) ffEnter({fresh:true});
  FF.base=j.base||FF.base;
  FF.free=j.free;
  build(FF.base);
  FF.hist=[]; FF.histPos=-1; ffCommit(label||'열기');
  return true;
}
// ===========================================================================
// 클라우드 저장 (2026-09-10) — 이미 페이지에 실려 있는 APP_CLOUD(Supabase app_documents).
//  브라우저 저장소 5MB 한도를 받지 않고, 다른 기기·팀원과 같은 문서를 연다.
//  로그인(직원 세션)이 필요하다. 없으면 파일 저장으로 안내하고 로컬 자동저장은 그대로 둔다.
// ===========================================================================
const FF_CLOUD_APP='freeform';
function ffCloudReady(){ return typeof APP_CLOUD!=='undefined'&&APP_CLOUD&&typeof APP_CLOUD.ready==='function'&&APP_CLOUD.ready(); }
function ffCloudGuard(){
  if(ffCloudReady()) return true;
  setStatus(false,'클라우드 저장은 로그인이 필요합니다 — 업무시스템에 로그인한 뒤 다시 시도하세요 (지금은 파일 ▸ 프리폼 파일 저장)');
  return false;
}
function ffCloudKey(){ try{ return localStorage.getItem('minicad.freeform.cloudkey')||''; }catch(_){ return ''; } }
function ffCloudTitle(){ try{ return localStorage.getItem('minicad.freeform.cloudtitle')||''; }catch(_){ return ''; } }
function ffCloudSetKey(k,title){ try{ localStorage.setItem('minicad.freeform.cloudkey',k||''); if(title!=null) localStorage.setItem('minicad.freeform.cloudtitle',title); }catch(_){ } }
function ffCloudSave(asNew){
  if(!FF||!ffCloudGuard()) return;
  const prev=ffCloudTitle();
  const title=(window.prompt('클라우드에 저장할 이름', prev||((ST.built&&ST.built.project)||'프리폼 모델'))||'').trim();
  if(!title) return;
  let key=ffCloudKey();
  if(asNew||!key||title!==prev) key='ff_'+Date.now().toString(36)+'_'+Math.floor(Math.random()*1e4).toString(36);
  let data; try{ data=JSON.parse(ffDocJSON()); }catch(_){ setStatus(false,'모델을 읽지 못했습니다'); return; }
  setStatus(true,'☁ 저장 중…');
  return APP_CLOUD.save(FF_CLOUD_APP,key,title,data).then(()=>{
    ffCloudSetKey(key,title);
    setStatus(true,'☁ 클라우드 저장 완료 — '+title+' ('+((ST.saveBytes||0)/1024).toFixed(0)+' KB)');
    if(ST.saveFail){ ST.saveFail=null; ffSaveBanner(); }         // 클라우드에 들어갔으니 경고 내림
  }).catch(e=>setStatus(false,'☁ 저장 실패 — '+(e&&e.message||e)));
}
function ffCloudOpen(){
  if(!ffCloudGuard()) return;
  const m=$('ffcloud'); if(!m) return;
  const list=m.querySelector('.cl-list');
  list.innerHTML='<div class="cl-msg">불러오는 중…</div>';
  m.style.display='flex';
  return APP_CLOUD.list(FF_CLOUD_APP).then(rows=>{
    rows=rows||[];
    if(!rows.length){ list.innerHTML='<div class="cl-msg">저장된 모델이 없습니다. 파일 ▸ 클라우드에 저장 으로 먼저 올리세요.</div>'; return; }
    const pad=n=>String(n).padStart(2,'0');
    list.innerHTML=rows.map(r=>{
      const t=new Date(r.updated_at);
      const when=isNaN(t.getTime())?'':(t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate())+' '+pad(t.getHours())+':'+pad(t.getMinutes()));
      return '<div class="cl-it" data-k="'+r.doc_key+'" data-t="'+String(r.title||'').replace(/"/g,'&quot;')+'">'+
        '<span class="cl-n">'+(r.title||r.doc_key)+'</span>'+
        '<span class="cl-m">'+when+(r.updated_by?' · '+r.updated_by:'')+'</span>'+
        '<button class="btn sm cl-del" data-del="'+r.doc_key+'" title="클라우드에서 삭제">✕</button></div>';
    }).join('');
    list.querySelectorAll('.cl-it').forEach(b=>{ b.onclick=ev=>{
      const del=ev.target&&ev.target.dataset&&ev.target.dataset.del;
      if(del){ ev.stopPropagation();
        if(!window.confirm('클라우드에서 삭제할까요? 되돌릴 수 없습니다.')) return;
        APP_CLOUD.remove(FF_CLOUD_APP,del).then(()=>ffCloudOpen()).catch(e=>setStatus(false,'삭제 실패 — '+(e&&e.message||e)));
        return; }
      ffCloudLoad(b.dataset.k,b.dataset.t);
    }; });
  }).catch(e=>{ list.innerHTML='<div class="cl-msg" style="color:#FF7A59">'+(e&&e.message||e)+'</div>'; });
}
function ffCloudLoad(key,title){
  if(!ffCloudGuard()) return;
  setStatus(true,'☁ 여는 중…');
  return APP_CLOUD.load(FF_CLOUD_APP,key).then(row=>{
    const j=row&&row.data;
    try{ ffApplyDoc(j,'클라우드 열기'); }
    catch(e){ setStatus(false,'☁ '+e.message); return; }
    ffCloudSetKey(key,title||(row&&row.title)||'');
    const m=$('ffcloud'); if(m) m.style.display='none';
    setStatus(true,'☁ 클라우드에서 열었습니다 — '+(title||(row&&row.title)||key));
  }).catch(e=>setStatus(false,'☁ 열기 실패 — '+(e&&e.message||e)));
}
function ffExportFile(){
  if(!FF) return;
  download(fileStem()+'_freeform.json',
    new Blob([JSON.stringify({schema:FF_SCHEMA,at:Date.now(),base:FF.base,free:FF.free},null,1)],{type:'application/json'}));
  setStatus(true,'🧊 프리폼 파일 저장 — 열기는 파일 ▸ 프리폼 파일 열기');
}
function ffImportFile(){
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='.json,application/json';
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    const fr=new FileReader();
    fr.onload=()=>{
      try{
        const j=JSON.parse(String(fr.result));
        ffApplyDoc(j,'파일 열기');
      }catch(e){ setStatus(false,'프리폼 파일을 읽지 못했습니다: '+e.message); }
    };
    fr.readAsText(f);
  };
  inp.click();
}
function ffEnter(opts){
  if(ST.ffOn) return;
  if(!ST.doc){ setStatus(false,'평면 문서가 아직 없습니다 — 미니캐드에서 먼저 열어주세요'); return; }
  const saved=(!opts||!opts.fresh)?ffLoadLocal():null;
  FF={base:JSON.parse(JSON.stringify(ST.doc)),
      free:(saved&&saved.free)||{sketchPts:[],sketchEdges:[],sketchFaces:[],masses:[],planes:[],comps:[],
        furniture:[],fixtures:[],lights:[],electric:[],hvac:[]},
      hist:[],histPos:-1,group:null,planLatest:null,planDirty:false,mute:false};
  if(saved&&saved.base) FF.base=saved.base;   // 저장본이 있으면 그때 굳힌 밑그림 그대로
  ST.ffOn=true;
  select(null);
  build(FF.base);
  FF.hist=[ffSnapshot()]; FF.histPos=0;
  ffRender();
  const b=$('b-ff'); if(b) b.classList.add('on');
  document.title='프리폼 — '+((ST.built&&ST.built.project)||'미니폼');
  setStatus(true,'🧊 프리폼 — 평면은 밑그림으로 굳었습니다. 여기서 그린 것은 여기 남고(자체 Ctrl+Z), 평면으로는 아무것도 안 보냅니다'+
    (saved?' · 저장본 복원됨 (새로 시작: 파일 ▸ 프리폼 새로 시작)':''));
}
function ffExit(){
  if(!ST.ffOn) return;
  if(FF_STANDALONE){
    ffAutosave();
    setStatus(true,'🧊 단독 프리폼 — 미니캐드와 연결되지 않습니다');
    return;
  }
  ffAutosave();
  const latest=FF&&FF.planLatest;
  if(FF&&FF.group) disposeGroup(FF.group);
  const base=FF&&FF.base;
  FF=null; ST.ffOn=false;
  delete ST.snapData.freeform;
  select(null);
  const b=$('b-ff'); if(b) b.classList.remove('on');
  document.title='미니폼 — MiniCAD 3D';
  if(latest) acceptDoc(latest,'live');
  else{ if(base) build(base); chan&&chan.postMessage({type:'hello',at:Date.now(),proto:MF_PROTO}); }
  rebuildPickables();
  setStatus(true,'연동 뷰 복귀 — 여기서 고치면 평면에 반영 (프리폼은 저장돼 있습니다: 파일 ▸ 프리폼 모드)');
}
function ffRebase(){
  if(FF_STANDALONE){ setStatus(true,'🧊 단독 프리폼 — 미니캐드와 연결되지 않습니다'); return; }
  if(!ST.ffOn||!FF) return;
  if(!FF.planLatest){ setStatus(true,'🧊 굳힌 뒤 바뀐 평면이 없습니다'); return; }
  FF.base=JSON.parse(JSON.stringify(FF.planLatest.data!==undefined?FF.planLatest.data:FF.planLatest));
  FF.planLatest=null; FF.planDirty=false;
  build(FF.base);
  ffRender();
  ffAutosave();
  setStatus(true,'🧊 밑그림을 최신 평면으로 갈았습니다 — 자유 층은 그대로');
}
function ffNew(){
  if(!ST.ffOn||!FF) return;
  FF.free={sketchPts:[],sketchEdges:[],sketchFaces:[],masses:[],planes:[],comps:[],
    furniture:[],fixtures:[],lights:[],electric:[],hvac:[]};
  ffCommit('새로 시작 (자유 층 비움)');
}
let chan=null;
// 편집이 가능한가 — 연동(채널) 또는 프리폼(로컬 적용). 단독 프리폼은 채널이 없어도 모든 편집이 된다 (2026-09-08)
const canEdit=()=>!!chan||ST.ffOn;
function sendEdit(op,obj,patch){
  if(!chan&&!ST.ffOn){ setStatus(false,'MiniCAD 창이 없어 반영 못함'); return false; }
  emitEdit({type:'edit',op,kind:KINDMAP[obj.kind],id:obj.id,floorId:obj.floorId,patch:patch||{}});
  return true;
}
function hitAt(cx,cy){
  const r=renderer.domElement.getBoundingClientRect();
  const nd=new THREE.Vector2(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);
  ray.setFromCamera(nd,camera);
  const hits=ray.intersectObjects(ST.pickables,false).filter(h=>{
    let o=h.object; while(o){ if(o.visible===false) return false; o=o.parent; } return true;
  });
  if(FF_STANDALONE){                                    // 발광 점(스프라이트)은 화면 8px 안이면 먼저 잡힌다 (스케치업 픽 조리개)
    let best=null,bd=8; ST.pickables.forEach(o=>{ if(!o.isSprite||!o.visible) return; const w=o.getWorldPosition(new THREE.Vector3()); const s=w.clone().project(camera); if(s.z>1) return; const sx=r.left+(s.x+1)/2*r.width, sy=r.top+(1-s.y)/2*r.height; const d=Math.hypot(sx-cx,sy-cy); if(d<bd){ bd=d; best={object:o,point:w,face:null,distance:camera.position.distanceTo(w)}; } });
    if(best) return best;
  }
  if(!hits.length) return null;
  const k0=hits[0].object.userData.obj&&hits[0].object.userData.obj.kind;
  if(!SKETCH_KINDS.has(k0)){                            // 면 위에 그린 스케치는 그 면과 같은 깊이 — 스케치업처럼 스케치가 먼저 잡힌다
    const alt=hits.find(h=>h.distance-hits[0].distance<0.004&&h.object.userData.obj&&SKETCH_KINDS.has(h.object.userData.obj.kind));
    if(alt) return alt;
  }
  return hits[0];
}
// 프리폼 그룹의 형제들 — 같은 gid 를 가진 화면 그룹들
function _ffGroupOf(gid){
  const out=[];
  FF&&FF.group&&FF.group.children.forEach(x=>{
    const o=x.userData.obj;
    if(o&&o.kind==='mass'&&o.meta&&o.meta.gid===gid) out.push(x);
  });
  return out;
}
function pick(cx,cy,e){
  const hit=hitAt(cx,cy);
  if(FF_STANDALONE&&ffPickInside(hit,e)) return;
  const mod=!!(e&&(e.ctrlKey||e.metaKey||e.shiftKey));
  if(!hit){ if(!mod) select(null); return; }
  const g=hit.object.parent;
  if(mod){ select(g,(e.shiftKey&&(e.ctrlKey||e.metaKey))?{remove:true}:{toggle:true}); return; }
  const o0=g.userData.obj;
  if(ST.ffOn&&o0&&o0.kind==='mass'&&o0.meta&&o0.meta.gid){   // 프리폼 ⑤: 그룹은 한 몸으로 잡힌다
    const gs=_ffGroupOf(o0.meta.gid);
    if(gs.length>1){
      selectGroups(gs);
      setStatus(statusLive,'⛓ 그룹 '+gs.length+'개 — 더블클릭=하나만 · 끌면 함께 이동 (Ctrl=통째 복사)');
      return;
    }
  }
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
  if(!canEdit()){ setStatus(false,'MiniCAD 창이 없어 반영 못함'); return false; }
  if(!ops.length) return false;
  if(ops.length===1){ const o=ops[0]; emitEdit({type:'edit',op:o.op,kind:o.kind,id:o.id,floorId:o.floorId,patch:o.patch||{}}); return true; }
  emitEdit({type:'edit',op:'batch',label:label||'',ops});
  return true;
}
// --- 확정 뒤 재입력 (스케치업: 동작 확정 직후 숫자를 치면 되돌려 그 값으로 다시) · Ctrl+복사 뒤 xN · /N = 배열 복사 ---
function setLast(label,unit,apply,opts){ ST.lastCommit={label,unit,apply,seq:0,noUndo:!!(opts&&opts.noUndo)}; }
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
  if(canEdit()&&!lc.noUndo) emitEdit({type:'edit',op:'undo'});      // 방금 확정한 것을 물리고
  const ok=lc.apply(raw); lc.seq++;                        // 새 값으로 다시 (실패하면 되돌린 것을 복구)
  if(ok===false){ if(canEdit()&&!lc.noUndo) emitEdit({type:'edit',op:'redo'}); setStatus(statusLive,'재입력 값을 이해 못했습니다: '+raw); }
  vcbHide();
}
function arrayCopy(n,div){
  const lr=ST.lastRot;
  if(lr&&(!ST.lastMove||lr.at>(ST.lastMove.at||0))&&n>1){       // 방사 배열 — 회전 복사 뒤 x3 / /3
    const o=lr.obj; const ks=div?Array.from({length:n-1},(_,i)=>(i+1)/n):Array.from({length:n-1},(_,i)=>i+2);
    const ops=ks.map(k=>({op:'clone',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{x:o.x,y:o.y,angle:(((lr.base+lr.ang*k)%360)+360)%360}}));
    if(sendBatch(ops,'방사 배열')) setStatus(statusLive,'방사 배열 '+(div?'/':'×')+n+' → '+ops.length+'개 추가'); return;
  }
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
  if(typeof buildGrips==='function') setTimeout(buildGrips,0);   // 2026-09-07 Z: 도구에 따라 그립 유무가 다르다
  cancelOp();
  clearGhost();
  hideSnap();
  vcbPostOff();
  ST.tool=t;
  if(FF_STANDALONE){                            // 걷기·둘러보기 도구 = 걷기 모드, 그 외 도구 = 조감 복귀
    if(t==='walk'||t==='lookaround'){ if(ST.mode!=='walk') setMode('walk'); }
    else if(ST.mode==='walk'&&t!=='poscam') setMode('orbit');
  }
  document.querySelectorAll('#tools .btn').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  if(t==='paint'){ openTraySec('mat'); if(FF_STANDALONE) renderPaintPal(); }    // 트레이(우측)의 재질 패널 열기 — 스케치업 Default Tray
  if(t==='add') openTraySec('comp');
  if(t==='add'&&ST.add&&ST.add.type) makeGhost();
  // 스케치업식 마우스: 좌클릭은 도구 몫 · 궤도(O)/팬(H)/줌(Z) 도구에서만 좌클릭 드래그가 카메라
  orbit.mouseButtons.LEFT=(t==='orbit')?THREE.MOUSE.ROTATE:(t==='pan')?THREE.MOUSE.PAN:(t==='zoom')?THREE.MOUSE.DOLLY:null;
  renderer.domElement.style.cursor={select:'default',move:'move',rotate:'grab',scale:'nwse-resize',line:'crosshair',rect:'crosshair',circle:'crosshair',arc:'crosshair',offset:'crosshair',pushpull:'ns-resize',paint:'copy',erase:'not-allowed',tape:'crosshair',dim:'crosshair',text:'text',orbit:'all-scroll',pan:'grab',zoom:'zoom-in',add:'copy'}[t]||FF_CURSOR[t]||'default';
  setStatus(statusLive,{select:'➤ 선택',move:'✥ 이동',rotate:'↻ 회전',scale:'⤢ 배율',line:'╱ 선(점·선)',rect:'▭ 사각형(면)',circle:'○ 원(면)',arc:'◜ 호(선)',offset:'⧉ 오프셋',pushpull:'⇕ 밀기끌기',paint:'🪣 페인트',erase:'🧽 지우개',tape:'📏 줄자',dim:'↔ 치수',text:'A 문자',orbit:'🔄 궤도',pan:'🖐 팬',zoom:'🔍 줌',add:'➕ 배치'}[t]||FF_STATUS[t]||'');
  // 하단 상태바 = 스케치업식 도구 안내 (수정자 포함)
  const hint=$('hint');
  if(hint) hint.innerHTML=(FF_STANDALONE&&FF_HINT[t])||{
    select:'<b>선택</b> — 클릭=선택 · <b>Shift/Ctrl+클릭=추가</b> · 끌기=선택 상자(←방향은 걸치기) · 더블클릭=방/연결벽 · 트리플=전체 · 배치물 끌기=이동 · Ctrl+끌기=복사 · Del · 우클릭=메뉴',
    move:'<b>이동</b> — 클릭-이동-클릭 · <b style="color:#7FA8D4">↑=높이(Z) 위아래로 띄우기</b> · ←→=X/Y 고정 · <b>Ctrl=복사</b>(뒤에 x3 · /3 = 배열) · <b>숫자=정확한 값</b>(2.5m·250cm) · 문·창은 벽 위로 · Esc 취소',
    rotate:'<b>회전</b> — 객체 클릭 → 기준점 클릭 → 각도 (각도기) · 15° 스냅(Shift=자유각) · <b>숫자=각도</b> · Esc 취소',
    scale:'<b>배율</b> — 객체 클릭 후 위아래로 (Shift=가로/세로 따로) · 클릭=확정 · <b>숫자=배율</b>(1.5) · 가구·기구·설비만',
    line:'<b>선</b> — 클릭-클릭 사슬 = <b>점·선</b>(x,y) · <b>고리가 닫히면 면</b> · 바닥 위=분할 · <b>Shift=방향 고정</b> · ←→=축 고정 · ↓=벽에 평행/수직 · 숫자=길이 · [x,y] 절대 · &lt;dx,dy&gt; 상대 · Esc/더블클릭=끝',
    rect:'<b>사각형</b> — 두 모서리 클릭 = <b>면</b>(점 4·선 4) · <b>P 로 Z 를 주면 매스</b> · <b>가로,세로</b> 입력(3m,2m) · Ctrl+Z 한 번',
    circle:'<b>원</b> — 중심 클릭 → 반지름 = <b>면</b> · <b>숫자=반지름</b> · <b>6s=육각형</b> · P 로 Z 를 주면 매스',
    arc:'<b>호</b> — 시작 · 끝 · 불룩한 정도 3클릭 → 스케치 선 조각 (고리가 닫히면 면 · Ctrl+Z 한 번)',
    offset:'<b>오프셋</b> — 면(바닥·스케치 면) 클릭 후 안/밖으로 · <b>숫자=거리</b> · 클릭=확정 (새 스케치 면)',
    pushpull:'<b>밀기끌기</b> — <b>스케치 면=Z 높이 → 매스</b> · 매스 윗면=높이 · 벽 윗면=높이 · 벽 옆면=두께 · 천장=천장고 · <b>숫자=mm</b> · <b>더블클릭=직전 값 반복</b>',
    paint:'<b>페인트</b> — 트레이 재질 고르고 벽/바닥/천장 클릭 · <b>Alt+클릭=재질 추출</b> (견적 연동)',
    erase:'<b>지우개</b> — 클릭/끌기=삭제 · <b>Shift+클릭=숨기기</b> (벽·공간은 평면에서)',
    tape:'<b>줄자</b> — 두 점 클릭 = 거리 · <b>벽(선)에서 시작하면 안내선</b>(숫자=간격) · 안내선끼리 교차점 스냅 · Esc 초기화',
    dim:'<b>치수</b> — 두 점 클릭 = 치수선(mm) — 3D 표시용',
    text:'<b>문자</b> — 클릭한 곳에 메모 — 3D 표시용',
    orbit:'<b>궤도</b> — 끌어서 회전 (휠버튼 드래그와 같음) · Shift=팬',
    pan:'<b>팬</b> — 끌어서 화면 이동 (우클릭·Shift+휠버튼 드래그와 같음)',
    zoom:'<b>줌</b> — 위아래로 끌어 확대/축소 (휠과 같음) · Shift+Z=전체',
    add:'<b>배치</b> — 오른쪽 구성요소에서 골라 바닥 클릭 · R=회전 · 계속 배치 · Esc=끝 (평면·견적 반영)',
  }[t]||FF_HINT[t]||'';
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
  if(!canEdit()){ setStatus(false,'MiniCAD 창이 없어 배치 못함'); return; }
  emitEdit({type:'edit',op:'add',kind:a.kind,floorId:a.fid,patch:{type:a.type,x,y,angle:a.rot||0}});
  setStatus(statusLive,'➕ 배치 ('+x+', '+y+') — 계속 클릭해 더 놓기, Esc=끝');
}
// 프리폼 ⑤: 저장한 컴포넌트 목록 — 구성요소 칸 맨 위 (가구 라이브러리와 한 자리)
function _ffCompsPal(el){
  if(!ST.ffOn||!FF||!Array.isArray(FF.free.comps)||!FF.free.comps.length) return;
  const html='<div class="pp-cat">🧊 내 컴포넌트 (프리폼)</div><div class="pp-grid">'+
    FF.free.comps.map(c=>'<button class="pp-it'+(ST.stampComp===c.id?' on':'')+'" data-comp="'+c.id+'">'+
      '<span class="pp-chip" style="background:#8B6F47"></span>'+c.name+' ('+c.masses.length+')</button>').join('')+'</div>';
  el.insertAdjacentHTML('afterbegin',html);
  el.querySelectorAll('[data-comp]').forEach(b=>{
    b.onclick=()=>{
      const id=b.dataset.comp;
      if(ST.stampComp===id){ ST.stampComp=null; renderAddPal(); setStatus(statusLive,'스탬프 끝'); return; }
      ST.stampComp=id; setTool('select'); renderAddPal();
      const cp=FF.free.comps.find(x=>x.id===id);
      setStatus(statusLive,'🧊 스탬프: '+(cp?cp.name:'')+' — 바닥을 클릭한 자리마다 찍힙니다 · Esc=끝');
    };
  });
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
  _ffCompsPal(el);                              // 프리폼 ⑤
}
// --- 선(L)·사각형(R) — 스케치업 Line/Rectangle: 3D 에서 벽을 그린다 ---
function _hoverFloorId(e){
  if(ST.ffOn) return 'freeform';   // 프리폼: 그리기는 자유 층에, 땅(z0=0)에서부터
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
  const sd=_snapDataOf(fid);
  const G=ST.gridMM||10; const grid={x:Math.round(p.x/G)*G,y:Math.round(p.y/G)*G,kind:'grid'};
  if(!sd) return grid;
  // 2026-09-04: 허용 반경을 화면 픽셀 기준으로 (스케치업식) — 줌을 빼도 14px 안이면 잡힌다
  const mmpp=mmPerPx(new THREE.Vector3(p.x*MM,z0m||0,p.y*MM));
  const T_END=Math.min(2500,Math.max(60,16*mmpp));
  const T_MID=Math.min(2200,Math.max(50,14*mmpp));
  const T_EDGE=Math.min(1800,Math.max(40,12*mmpp));
  let best=null;
  const pt=(v,kind)=>{ const d=Math.hypot(v.x-p.x,v.y-p.y); if(d<=T_END&&(!best||d<best.d)) best={x:v.x,y:v.y,d,kind,seg:null}; };
  // 원점(0,0) 기준점 스냅 — 끝점과 같은 우선순위
  pt({x:(ST.axesO?ST.axesO.x:0),y:(ST.axesO?ST.axesO.y:0)},'origin');
  sd.verts.forEach(v=>pt(v,'endpoint'));
  if(extra) extra.forEach(v=>pt(v,'endpoint'));                 // 그리는 중인 사슬의 점들 (폐합용)
  if(sd.xpts) sd.xpts.forEach(v=>pt(v,'intersection'));          // 안내선 교차점 (스케치업 Intersection)
  if(sd.gpts) sd.gpts.forEach(v=>pt(v,'guide'));                  // 안내점 (줄자 Ctrl+클릭)
  if(!best) sd.walls.forEach(w=>{const mx=(w.x1+w.x2)/2,my=(w.y1+w.y2)/2;const d=Math.hypot(mx-p.x,my-p.y); if(d<=T_MID&&(!best||d<best.d)) best={x:mx,y:my,d,kind:'midpoint',seg:w};});
  if(!best){
    let bd=T_EDGE,bp=null,bk='edge',bs=null;
    sd.walls.forEach(w=>{const q=closestOnSeg(p,w);const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;bp=q;bk='edge';bs=w;}});
    (sd.guides||[]).forEach(w=>{const q=closestOnSeg(p,w);const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;bp=q;bk='guide';bs=w;}});
    if(bp) best={x:bp.x,y:bp.y,d:bd,kind:bk,seg:bs};
  }
  if(best) return {x:Math.round(best.x),y:Math.round(best.y),kind:best.kind,seg:best.seg||null};
  // 2D 로 못 찾았으면 모델 전체의 점·모서리를 3D 로 찾는다 (단독 프리폼만)
  if(FF_STANDALONE&&ST.ffOn&&ST.lastPtr){
    const zmm=(z0m||0)/MM;
    const h=_ffSnapOnPlane(ST.lastPtr.clientX,ST.lastPtr.clientY,{x:0,y:0,z:zmm},{x:0,y:0,z:1});
    if(h) return {x:Math.round(h.p.x),y:Math.round(h.p.y),kind:h.kind,seg:h.seg,proj:h.proj};
  }
  return grid;
}
const SNAP_COL={endpoint:0x2FA84F,midpoint:0x35C2CF,edge:0xE24C4C,origin:0x4C7DE2,intersection:0xFF5A5A,guide:0x9A9AFF,lock:0xE24CE2,axis:0xE24C4C,from:0xE24CE2};
const SNAP_NAME={endpoint:'끝점',midpoint:'중간점',edge:'선 위',origin:'원점(0,0)',intersection:'교차점',guide:'안내선 위',lock:'방향 고정',axis:'축 위',from:'점에서'};

// ===========================================================================
// 접촉 표시 (2026-09-10 대표 지시 "점과 선이 컨택이 되었는지 확인이 안 된다")
//   ① 종류마다 다른 모양 — 끝점=사각, 중간점=마름모, 선 위=빈 사각, 교차=X, 원점=원+십자
//   ② 닿은 선분이 그 색으로 굵게 빛난다 (무엇에 붙었는지가 보인다)
//   ③ 마커 뒤 헤일로 링 — 색을 못 봐도 '붙었다'가 보인다
//   ④ 커서 옆 이름표 (끝점 / 중간점 / 선 위 …)
//   ⑤ 클릭해서 실제로 붙는 순간 링이 한 번 퍼진다
// ===========================================================================
const SNAP_SHAPE={endpoint:'square',midpoint:'diamond',edge:'squareO',intersection:'cross',
  origin:'circleO',guide:'diamondO',from:'dot',lock:'dot',axis:'dot'};
const _snapTexC=new Map();
function _snapTex(shape){
  if(_snapTexC.has(shape)) return _snapTexC.get(shape);
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,.34)'); g.addColorStop(.40,'rgba(255,255,255,.07)'); g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,64,64);
  x.strokeStyle='#fff'; x.fillStyle='#fff'; x.lineWidth=4; x.lineJoin='round'; x.lineCap='round';
  const S=11;
  const dia=(r)=>{ x.beginPath(); x.moveTo(32,32-r); x.lineTo(32+r,32); x.lineTo(32,32+r); x.lineTo(32-r,32); x.closePath(); };
  if(shape==='square') x.fillRect(32-S,32-S,S*2,S*2);
  else if(shape==='squareO') x.strokeRect(32-S+2,32-S+2,(S-2)*2,(S-2)*2);
  else if(shape==='diamond'){ dia(S+4); x.fill(); }
  else if(shape==='diamondO'){ dia(S+2); x.stroke(); }
  else if(shape==='cross'){ x.beginPath(); x.moveTo(32-S,32-S); x.lineTo(32+S,32+S); x.moveTo(32+S,32-S); x.lineTo(32-S,32+S); x.stroke(); }
  else if(shape==='circleO'){ x.beginPath(); x.arc(32,32,S-2,0,7); x.stroke(); x.lineWidth=2.5;
    x.beginPath(); x.moveTo(32-S-7,32); x.lineTo(32+S+7,32); x.moveTo(32,32-S-7); x.lineTo(32,32+S+7); x.stroke(); }
  else if(shape==='ring'){ x.lineWidth=2.6; x.beginPath(); x.arc(32,32,26,0,7); x.stroke(); }
  else { x.beginPath(); x.arc(32,32,S,0,7); x.fill(); }
  const t=new THREE.CanvasTexture(c); if(THREE.SRGBColorSpace) t.colorSpace=THREE.SRGBColorSpace;
  _snapTexC.set(shape,t); return t;
}
function _shapeSprite(shape,color,px){
  const m=new THREE.SpriteMaterial({map:_snapTex(shape),color:color||0xffffff,transparent:true,
    depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:false});
  const s=new THREE.Sprite(m); s.scale.setScalar(_pxScale(px||14)); s.renderOrder=1002; s.userData.px=px||14; return s;
}
const _snapMks=new Map();
let snapRingMk=null, snapEdgeMk=null, snapPulseMk=null, _snapPulseT=0;
function _snapShapeShow(shape,col,W,px){
  _snapMks.forEach((s,k)=>{ if(k!==shape) s.visible=false; });
  let mk=_snapMks.get(shape);
  if(!mk){ mk=_shapeSprite(shape,col,px); mk.userData.shape=shape; _snapMks.set(shape,mk); scene.add(mk); }
  mk.material.color.setHex(col);
  mk.userData.px=px; mk.scale.setScalar(_pxScale(px));
  mk.position.copy(W); mk.visible=true;
}
function _snapRingShow(col,W,px){
  if(!snapRingMk){ snapRingMk=_shapeSprite('ring',col,px); snapRingMk.renderOrder=1001; scene.add(snapRingMk); }
  snapRingMk.material.color.setHex(col); snapRingMk.material.opacity=0.38;
  snapRingMk.userData.px=px; snapRingMk.scale.setScalar(_pxScale(px));
  snapRingMk.position.copy(W); snapRingMk.visible=true;
}
// 닿은 선분을 그 색으로 굵게 — '무엇에' 붙었는지가 보인다
function _snapEdgeShow(a,b,col){
  if(!snapEdgeMk){
    snapEdgeMk=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,8,1,true),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false}));
    snapEdgeMk.renderOrder=999; scene.add(snapEdgeMk);
  }
  const d=new THREE.Vector3().subVectors(b,a); const L=d.length();
  if(!(L>1e-6)){ snapEdgeMk.visible=false; return; }
  snapEdgeMk.position.copy(a).addScaledVector(d,0.5);
  snapEdgeMk.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
  const r=Math.max(0.0018,mmPerPx(snapEdgeMk.position)*1.7*MM);
  snapEdgeMk.scale.set(r,L,r);
  snapEdgeMk.material.color.setHex(col);
  snapEdgeMk.visible=true;
}
function _snapEdgeHide(){ if(snapEdgeMk&&snapEdgeMk.visible){ snapEdgeMk.visible=false; } }
// 커서 옆 이름표
function _snapTip(kind,proj){
  const el=$('snaptip'); if(!el) return;
  if(!kind||kind==='grid'||!ST.lastPtr){ el.style.display='none'; return; }
  el.textContent=(SNAP_NAME[kind]||'')+(proj?' 투영':'');
  el.style.color='#'+('000000'+(SNAP_COL[kind]||0xffffff).toString(16)).slice(-6);
  el.style.left=Math.min(ST.lastPtr.clientX+18,window.innerWidth-el.offsetWidth-8)+'px';
  el.style.top=Math.min(ST.lastPtr.clientY+20,window.innerHeight-el.offsetHeight-8)+'px';
  el.style.display='block';
}
// 스냅 표시 한 곳 — 땅 그리기와 평면 그리기가 같은 기호를 쓴다
function _snapPaint(kind,W,seg,proj){
  if(!kind||kind==='grid'){ ffSnapHide(); return; }
  const col=SNAP_COL[kind]||0xffffff;
  const shape=SNAP_SHAPE[kind]||'dot';
  if(FF_STANDALONE){
    _snapShapeShow(shape,col,W,10);
    _snapRingShow(col,W,22);
    if(seg&&seg.a&&seg.b) _snapEdgeShow(seg.a,seg.b,col); else _snapEdgeHide();
    if(proj) _snapProjShow(W,new THREE.Vector3(proj.x*MM,proj.z*MM,proj.y*MM),col); else _snapProjHide();
    _snapTip(kind,!!proj);
    ST.lastSnap={kind,W:W.clone(),proj:proj||null};
  }
  invalidate();
}
// 면 밖의 점에서 그리는 면으로 — 어디서 온 점인지 점선으로 보여 준다
let snapProjLn=null;
function _snapProjShow(a,b,col){
  if(!snapProjLn){
    snapProjLn=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),
      new THREE.LineDashedMaterial({color:col,dashSize:0.06,gapSize:0.05,transparent:true,opacity:0.75,depthTest:false}));
    snapProjLn.renderOrder=998; scene.add(snapProjLn);
  }
  snapProjLn.geometry.setFromPoints([a,b]); snapProjLn.computeLineDistances();
  snapProjLn.material.color.setHex(col); snapProjLn.visible=true;
}
function _snapProjHide(){ if(snapProjLn&&snapProjLn.visible) snapProjLn.visible=false; }
function ffSnapHide(){
  let ch=false;
  _snapMks.forEach(s=>{ if(s.visible){ s.visible=false; ch=true; } });
  if(snapProjLn&&snapProjLn.visible){ snapProjLn.visible=false; ch=true; }
  if(snapRingMk&&snapRingMk.visible){ snapRingMk.visible=false; ch=true; }
  if(snapEdgeMk&&snapEdgeMk.visible){ snapEdgeMk.visible=false; ch=true; }
  const el=$('snaptip'); if(el&&el.style.display!=='none') el.style.display='none';
  ST.lastSnap=null;
  if(ch) invalidate();
}
// 클릭해서 실제로 붙는 순간 — 링이 한 번 퍼진다
function ffContactPulse(W,col){
  if(!FF_STANDALONE||!W) return;
  if(!snapPulseMk){ snapPulseMk=_shapeSprite('ring',0xffffff,14); snapPulseMk.renderOrder=1003; scene.add(snapPulseMk); }
  snapPulseMk.material.color.setHex(col||0x7CF2D6);
  snapPulseMk.position.copy(W); snapPulseMk.visible=true;
  const t0=(typeof performance!=='undefined'?performance.now():Date.now());
  clearInterval(_snapPulseT);
  _snapPulseT=setInterval(()=>{
    const k=((typeof performance!=='undefined'?performance.now():Date.now())-t0)/300;
    if(k>=1||!snapPulseMk){ clearInterval(_snapPulseT); if(snapPulseMk){ snapPulseMk.visible=false; snapPulseMk.material.opacity=1; } invalidate(); return; }
    snapPulseMk.scale.setScalar(_pxScale(12+30*k));
    snapPulseMk.material.opacity=1-k*k;
    invalidate();
  },16);
}
const FF_DRAWTOOLS=new Set(['line','rect','circle','polygon','arc','arc3','pie','rotrect','freehand','tape','dim','offset','protractor','axes','text3d','section']);
// 그리기 도구로 눌렀는데 그 자리가 붙는 자리였으면 확정 펄스
function ffContactOnClick(){
  if(!FF_STANDALONE) return;
  const s=ST.lastSnap;
  if(s&&s.kind&&s.kind!=='grid'&&FF_DRAWTOOLS.has(ST.tool)) ffContactPulse(s.W,SNAP_COL[s.kind]);
}

// ===========================================================================
// 모델 전체의 점·모서리 3D 스냅 (2026-09-10 대표 지시 "바닥에 점·선만 잡히는 게 아니라 모든 점·선이")
//  ① 자유 층 매스 · 밑그림 매스 · 바닥 스케치 · 모든 평면의 스케치 를 3D 점/모서리로 모은다 (히스토리로 캐시)
//  ② 화면에서 가장 가까운 것을 찾는다 (투영 행렬을 직접 곱해 점당 할당 없이)
//  ③ 그리는 면 위의 것이면 그대로, 아니면 그 면으로 투영하고 점선 안내를 보여 준다
// ===========================================================================
function _ffAll3D(){
  const key=(FF?FF.histPos:-1)+'|'+((FF&&FF.free.masses)?FF.free.masses.length:0)+'|'+((FF&&FF.free.planes)?FF.free.planes.length:0)
    +'|'+((FF&&FF.free.sketchEdges)?FF.free.sketchEdges.length:0)+'|'+((ST.doc&&ST.doc.masses)?ST.doc.masses.length:0);
  if(FF&&FF._a3&&FF._a3.key===key) return FF._a3;
  const P=[],E=[];
  const seenP=new Set();
  const addP=(x,y,z)=>{ const k=Math.round(x)+','+Math.round(y)+','+Math.round(z); if(seenP.has(k)) return; seenP.add(k); P.push(x,y,z); };
  const addE=(a,b)=>{ E.push(a.x,a.y,a.z,b.x,b.y,b.z); addP(a.x,a.y,a.z); addP(b.x,b.y,b.z); };
  const ctx=ffCtx();
  const scanMass=m=>{
    if(!m||!Array.isArray(m.pts)||m.pts.length<3) return;
    try{
      const S=massSolid(m,ctx);
      const th=(m.angle||0)*Math.PI/180,c=Math.cos(th),sn=Math.sin(th),el=Number(m.elev_mm)||0;
      const A=S.verts.map(w=>({x:m.x+w.x*c-w.y*sn,y:m.y+w.x*sn+w.y*c,z:w.z+el}));
      const seen=new Set();
      S.faces.forEach(f=>{ for(let i=0;i<f.vs.length;i++){
        const a=f.vs[i],b=f.vs[(i+1)%f.vs.length];
        const k2=Math.min(a,b)+'_'+Math.max(a,b);
        if(seen.has(k2)) continue; seen.add(k2);
        if(A[a]&&A[b]) addE(A[a],A[b]);
      }});
    }catch(_){ }
  };
  if(FF){
    (FF.free.masses||[]).forEach(scanMass);
    (FF.free.sketchPts||[]).forEach(p=>addP(p.x,p.y,0));
    (FF.free.sketchEdges||[]).forEach(e2=>{
      const a=skPtById(e2.a,FF.free),b=skPtById(e2.b,FF.free);
      if(a&&b) addE({x:a.x,y:a.y,z:0},{x:b.x,y:b.y,z:0});
    });
    (FF.free.planes||[]).forEach(pl=>{
      (pl.sketchPts||[]).forEach(p=>{ const w=planePt(pl,p.x,p.y); addP(w.x,w.y,w.z); });
      (pl.sketchEdges||[]).forEach(e2=>{
        const a=skPtById(e2.a,pl),b=skPtById(e2.b,pl);
        if(a&&b) addE(planePt(pl,a.x,a.y),planePt(pl,b.x,b.y));
      });
    });
  }
  ((ST.doc&&ST.doc.masses)||[]).forEach(scanMass);
  (ST.guides||[]).forEach(g=>{ if(g&&isFinite(g.x1)) addE({x:g.x1,y:g.y1,z:0},{x:g.x2,y:g.y2,z:0}); });
  const out={key,P:new Float64Array(P),E:new Float64Array(E),n:P.length/3,m:E.length/6};
  if(FF) FF._a3=out;
  return out;
}
// 화면에서 가장 가까운 점/중간점/모서리 — 끝점 15px > 중간점 13 > 모서리 11
function _ffPick3D(cx,cy){
  const A=_ffAll3D();
  if(!A.n&&!A.m) return null;
  if(A.n>200000) return null;                       // 너무 크면 건너뛴다 (손맛보다 응답이 먼저)
  camera.updateMatrixWorld();
  const mtx=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).elements;
  const r=renderer.domElement.getBoundingClientRect();
  const hw=r.width/2, hh=r.height/2, L=r.left, T=r.top;
  // 세계 좌표(three: x, z, y) → 화면 px. 뒤쪽이면 null
  const sx=[0,0];
  const prj=(X,Y,Z)=>{                              // X,Y,Z 는 도면 mm (x,y,z)
    const wx=X*MM, wy=Z*MM, wz=Y*MM;
    const w=mtx[3]*wx+mtx[7]*wy+mtx[11]*wz+mtx[15];
    if(!(w>1e-6)) return false;
    sx[0]=L+(( mtx[0]*wx+mtx[4]*wy+mtx[8]*wz+mtx[12])/w+1)*hw;
    sx[1]=T+(1-(mtx[1]*wx+mtx[5]*wy+mtx[9]*wz+mtx[13])/w)*hh;
    return true;
  };
  let best=null;
  const P=A.P;
  for(let i=0;i<P.length;i+=3){
    if(!prj(P[i],P[i+1],P[i+2])) continue;
    const d=Math.hypot(sx[0]-cx,sx[1]-cy);
    if(d<=15&&(!best||d<best.d)) best={d,kind:'endpoint',p:{x:P[i],y:P[i+1],z:P[i+2]},seg:null};
  }
  if(best) return best;
  const E=A.E;
  let bm=null,be=null;
  for(let i=0;i<E.length;i+=6){
    if(!prj(E[i],E[i+1],E[i+2])) continue; const ax=sx[0],ay=sx[1];
    if(!prj(E[i+3],E[i+4],E[i+5])) continue; const bx=sx[0],by=sx[1];
    const mx=(ax+bx)/2,my=(ay+by)/2;
    const dm=Math.hypot(mx-cx,my-cy);
    if(dm<=13&&(!bm||dm<bm.d)) bm={d:dm,kind:'midpoint',
      p:{x:(E[i]+E[i+3])/2,y:(E[i+1]+E[i+4])/2,z:(E[i+2]+E[i+5])/2},
      seg:{a:{x:E[i],y:E[i+1],z:E[i+2]},b:{x:E[i+3],y:E[i+4],z:E[i+5]}}};
    if(bm) continue;
    const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;
    let t=L2>1e-9?(((cx-ax)*dx+(cy-ay)*dy)/L2):0; t=Math.max(0,Math.min(1,t));
    const d=Math.hypot(ax+dx*t-cx,ay+dy*t-cy);
    if(d<=11&&(!be||d<be.d)) be={d,kind:'edge',t,
      p:{x:E[i]+(E[i+3]-E[i])*t,y:E[i+1]+(E[i+4]-E[i+1])*t,z:E[i+2]+(E[i+5]-E[i+2])*t},
      seg:{a:{x:E[i],y:E[i+1],z:E[i+2]},b:{x:E[i+3],y:E[i+4],z:E[i+5]}}};
  }
  return bm||be;
}
// 그 면(원점 o · 법선 n, 도면 mm)에 맞춘 결과 — 면 위면 그대로, 아니면 투영 + 점선 안내
function _ffSnapOnPlane(cx,cy,o,n){
  const h=_ffPick3D(cx,cy); if(!h) return null;
  const dd=(h.p.x-o.x)*n.x+(h.p.y-o.y)*n.y+(h.p.z-o.z)*n.z;
  const on=Math.abs(dd)<1.5;
  const p={x:h.p.x-n.x*dd,y:h.p.y-n.y*dd,z:h.p.z-n.z*dd};
  return {kind:h.kind,p,seg:on?h.seg:null,proj:on?null:{x:h.p.x,y:h.p.y,z:h.p.z},on};
}
let snapMk=null;
function showSnap(s,z0){
  if(s.kind==='grid'){ hideSnap(); return; }
  const W=new THREE.Vector3(s.x*MM,z0+0.03,s.y*MM);
  if(FF_STANDALONE){                                       // 단독: 모양·헤일로·선분 강조·이름표
    const seg=s.seg?{a:new THREE.Vector3(s.seg.x1*MM,z0+0.03,s.seg.y1*MM),b:new THREE.Vector3(s.seg.x2*MM,z0+0.03,s.seg.y2*MM)}:null;
    _snapPaint(s.kind,W,seg,s.proj||null); return;
  }
  if(!snapMk){ snapMk=new THREE.Mesh(geoSph,new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false})); snapMk.scale.setScalar(0.045); snapMk.renderOrder=1000; scene.add(snapMk); }
  snapMk.material.color.setHex(SNAP_COL[s.kind]||0xffffff);
  snapMk.position.copy(W);
  snapMk.visible=true;
  invalidate();
}
function hideSnap(){ if(FF_STANDALONE){ ffSnapHide(); return; } if(snapMk&&snapMk.visible){ snapMk.visible=false; invalidate(); } }
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
  if(ST.tool==='line'&&ffFree3()&&p.proj&&Math.abs(p.proj.z-(z0/MM))>1){   // 공중의 점이면 거기서 시작 (투영하지 않는다)
    _ffSnapAt3(p.kind,p.proj);
    ffLineBegin3(p.proj,null);
    setStatus(statusLive,'╱ 3D 선 — 어느 점이든 이어집니다 (높이가 다르면 두 점을 품은 종이가 생깁니다) · Esc/더블클릭=끝');
    return;
  }
  _lineBeginAt(fid,z0,p,ST.tool==='rect',null);
}

// ===========================================================================
// 자유 3D 선 (2026-09-10 대표 지시 "L 로 점과 점을 이을 때 그 점이 다른 위치에 있더라도
//                                  W 가 자동이면 어떤 점이라도 스냅이 걸려야 한다")
//  높이가 다른 두 점도 곧장 잇는다. 두 점을 모두 지나는 평면을 그 자리에서 만들어 거기에 선을 넣는다.
//   · 같은 높이 → 그 높이의 수평 종이 (z=0 이면 종전 바닥 그래프 그대로)
//   · 높이가 다르면 → 두 점을 품은 세로 종이 (법선은 AB 에 수직인 수평 방향)
//  작업 평면을 잡아 두었으면(W≠자동) 종전대로 그 면으로 투영한다.
// ===========================================================================
function ffFree3(){ return FF_STANDALONE&&ST.ffOn&&!ST.wp; }
function ffPlaneThrough(A,B){
  const d={x:B.x-A.x,y:B.y-A.y,z:B.z-A.z};
  if(Math.abs(d.z)<1) return _ffFrameFor({x:A.x,y:A.y,z:A.z},{x:0,y:0,z:1});     // 수평 종이
  const hx=Math.hypot(d.x,d.y);
  let n;
  if(hx<1){                                                                       // 완전 수직 — 화면을 마주 보는 세로 종이
    const cd=new THREE.Vector3(); camera.getWorldDirection(cd);
    let nx=-cd.x,ny=-cd.z; const nl=Math.hypot(nx,ny)||1; n={x:nx/nl,y:ny/nl,z:0};
  }else n={x:-d.y/hx,y:d.x/hx,z:0};                                               // AB 를 품은 세로 종이
  return _ffFrameFor({x:A.x,y:A.y,z:A.z},n);
}
// 두 3D 점 사이에 선 하나. 쓴 평면 틀을 돌려준다 (바닥이면 null)
function ffEmitEdge3(A,B){
  if(Math.abs(A.z)<1&&Math.abs(B.z)<1){
    emitEdit({type:'edit',op:'sketchline',floorId:'freeform',
      patch:{x1:Math.round(A.x),y1:Math.round(A.y),x2:Math.round(B.x),y2:Math.round(B.y)}});
    return null;
  }
  const fr=ffPlaneThrough(A,B);
  const a=planeUV(fr,A), b=planeUV(fr,B);
  emitEdit({type:'edit',op:'sketchline',floorId:'freeform',
    patch:{x1:Math.round(a.u),y1:Math.round(a.v),x2:Math.round(b.u),y2:Math.round(b.v),
           plane:{origin:fr.origin,ex:fr.ex,ey:fr.ey,n:fr.n}}});
  return fr;
}
// 그 3D 점에서 선을 새로 시작 — 바닥이면 종전 경로, 아니면 그 종이 위
function ffLineBegin3(P,fr){
  cancelOp();
  if(!fr&&Math.abs(P.z)<1){ _lineBeginAt('freeform',0,{x:Math.round(P.x),y:Math.round(P.y)},false,null); return; }
  const F=fr||_ffFrameFor({x:P.x,y:P.y,z:P.z},{x:0,y:0,z:1});
  const a=planeUV(F,P);
  const A={u:Math.round(a.u),v:Math.round(a.v)};
  ST.op={type:'line3',fr:F,a:A,cur:{u:A.u,v:A.v},line:null,drew:false,free3:true};
  opOrbit(true); _ff3Ghost(ST.op);
  vcbShow('길이',0,'mm');
}
// A(3D) → B(3D) 미리보기 선
function _ffPrev3(op,A,B){
  if(!op._p3){
    op._p3=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),
      new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false}));
    op._p3.renderOrder=999; scene.add(op._p3);
  }
  op._p3.geometry.setFromPoints([new THREE.Vector3(A.x*MM,A.z*MM,A.y*MM),new THREE.Vector3(B.x*MM,B.z*MM,B.y*MM)]);
  op._p3.visible=true;
  if(op.line) op.line.visible=false;
  if(op.ghost) op.ghost.visible=false;
  if(op.infLine) op.infLine.visible=false;
  invalidate();
}
function _ffPrev3Hide(op){
  if(op&&op._p3&&op._p3.visible){ op._p3.visible=false; if(op.line) op.line.visible=true; invalidate(); }
}
// 3D 점 위에 스냅 기호를 그대로 (투영 안내 없이 — 진짜 거기에 붙는다)
function _ffSnapAt3(kind,P){
  if(!kind) return;
  _snapPaint(kind,new THREE.Vector3(P.x*MM,P.z*MM,P.y*MM),null,null);
}
function _ffLen3(A,B){ return Math.round(Math.hypot(B.x-A.x,B.y-A.y,B.z-A.z)); }
function _lineBeginAt(fid,z0,p,rect,chain){
  const geo=new THREE.BufferGeometry().setFromPoints(new Array(rect?5:2).fill(0).map(()=>new THREE.Vector3(p.x*MM,z0+0.02,p.y*MM)));
  const ln=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false})); ln.renderOrder=999; scene.add(ln);
  const gh=new THREE.Mesh(geoBox,FF_STANDALONE?new THREE.MeshBasicMaterial({color:0xD4FF3D,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}):new THREE.MeshStandardMaterial({color:0xD4FF3D,transparent:true,opacity:0.22,depthWrite:false}));
  gh.visible=false; scene.add(gh);
  // 점 추론선 (스케치업 "From Point" — 지나온 점과 X/Y 가 맞으면 점선 안내)
  const inf=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:0xE24CE2,dashSize:0.08,gapSize:0.05,depthTest:false}));
  inf.renderOrder=999; inf.visible=false; scene.add(inf);
  ST.op={type:'line',rect,fid,z0,a:p,cur:p,line:ln,ghost:gh,infLine:inf,chain:chain||[p],sent:0,shiftLock:null,fromPt:null,dir:null};
  // 첫 점 고정 표시 — 점이 찍혔음을 분명하게
  const smk=_mkStart();
  smk.renderOrder=1000;
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
// 2026-09-04 점·선·면 고스트 — 선(얇은 금색 막대) · 면(반투명 판) · 매스(기둥)
function spawnPendingSketchLine(a,c,z0){
  const len=Math.hypot(c.x-a.x,c.y-a.y)*MM; if(len<0.01) return;
  const m2=new THREE.Mesh(geoBox,new THREE.MeshStandardMaterial({color:0xE8D48B,transparent:true,opacity:0.7,depthWrite:false}));
  m2.scale.set(len,0.014,0.018);
  m2.position.set((a.x+c.x)/2*MM,z0+0.008,(a.y+c.y)/2*MM);
  m2.rotation.y=-Math.atan2(c.y-a.y,c.x-a.x);
  scene.add(m2); ST.pendingG.push(m2); invalidate(true);
}
function spawnPendingFace(pts,z0){
  if(!pts||pts.length<3) return;
  const mat=new THREE.MeshStandardMaterial({color:0xD4FF3D,transparent:true,opacity:0.3,depthWrite:false,side:THREE.DoubleSide});
  const shape=new THREE.Shape(pts.map(p=>new THREE.Vector2(p.x*MM,p.y*MM)));
  const fl=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat); fl.rotation.x=Math.PI/2; fl.position.y=z0+0.003;
  scene.add(fl); ST.pendingG.push(fl); invalidate(true);
}
function prismGhost(poly,h,z0,color){ // 면 폴리곤(절대 mm) → 높이 h(mm) 기둥 고스트 (scale.z 로 높이 조절)
  const shape=new THREE.Shape(poly.map(q=>new THREE.Vector2(q.x*MM,-q.y*MM)));
  const g=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:color||0xB9C6D2,transparent:true,opacity:0.55,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.y=z0+0.002; m.scale.z=Math.max(h,1)*MM;
  return m;
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
function _blueDir(worldA){ return _screenDir(worldA,new THREE.Vector3(0,1,0)); }
// 시작 화면점에서 지금 화면점까지를 세계 방향 dirW 로 잰다 (mm, 줌 비례) — 축 방향으로 끈 만큼만
function _dragAlong(worldAt,dirW,x0,y0,x1,y1){ const sd=_screenDir(worldAt,dirW); const mmpp=mmPerPx(worldAt); const k=sd.L*mmpp/1000; if(k<0.25) return -(y1-y0)*mmpp; return ((x1-x0)*sd.x+(y1-y0)*sd.y)*mmpp; }   // 축이 화면에서 1/4 이하로 눌려 보이면(정면) 위아래로
function _blueAligned(worldA,e,minPx,maxDeg){
  const r=renderer.domElement.getBoundingClientRect(); const sa=worldA.clone().project(camera);
  const ax=r.left+(sa.x+1)/2*r.width, ay=r.top+(1-sa.y)/2*r.height; const dx=e.clientX-ax, dy=e.clientY-ay; const L=Math.hypot(dx,dy);
  if(L<minPx) return null; const bd=_blueDir(worldA); const cos=Math.abs((dx*bd.x+dy*bd.y)/L);
  return cos>Math.cos(maxDeg*Math.PI/180)?{L,sign:(dx*bd.x+dy*bd.y)>0?1:-1}:null;
}
// 땅 선 → 카메라를 보는 세로 종이(파랑 축 고정)로. auto=true 면 커서가 파랑 방향을 벗어나면 되돌아온다
function ffBlueHop(op,auto){
  const A={x:op.a.x,y:op.a.y,z:Math.round((op.z0||0)/MM)};
  const cd=new THREE.Vector3(); camera.getWorldDirection(cd);
  let nx=-cd.x,ny=-cd.z; const nl=Math.hypot(nx,ny)||1;
  const fr=_ffFrameFor(A,{x:nx/nl,y:ny/nl,z:0});
  const back={fid:op.fid,z0:op.z0,chain:op.chain.slice(),a:{x:op.a.x,y:op.a.y}};
  cancelOp();
  const a0=planeUV(fr,A);
  ST.op={type:'line3',fr,a:{u:Math.round(a0.u),v:Math.round(a0.v)},cur:{u:Math.round(a0.u),v:Math.round(a0.v)},line:null,axis:'v',autoBlue:!!auto,back,drew:false};
  opOrbit(true); _ff3Ghost(ST.op);
  setStatus(statusLive,'🧊 파랑 축(Z) — 위로 그립니다 · 숫자=높이 · '+(auto?'옆으로 움직이면 다시 바닥':'↑=해제')+' · 이어 그리면 이 세로 종이 위 · 닫히면 면 → P');
  vcbShow('파랑(Z) 길이',0,'mm');
}
function lineMove(e){
  const op=ST.op; if(!op||op.type!=='line') return;
  const raw=_planePt(e,op.z0); if(!raw) return;
  const sp=snap3(op.fid,raw,op.z0,op.rect?null:op.chain);   // 점·선 흡착이 직교 추론보다 우선 (스케치업과 동일)
  {                                                        // 자유 3D 선 — 높이가 다른 점이 잡히면 곧장 그리로
    const az=(op.z0||0)/MM;
    if(!op.rect&&ffFree3()&&sp.proj&&Math.abs(sp.proj.z-az)>1){
      const A={x:op.a.x,y:op.a.y,z:az};
      op.b3=sp.proj; _ffPrev3(op,A,op.b3); _ffSnapAt3(sp.kind,op.b3);
      vcbShow((SNAP_NAME[sp.kind]||'')+' · 3D 길이',_ffLen3(A,op.b3),'mm');
      return;
    }
    if(op.b3){ op.b3=null; _ffPrev3Hide(op); }
  }
  if(!op.rect&&ST.ffOn&&sp.kind==='grid'&&!op.shiftLock&&!ST.axisLock){   // 커서가 화면의 파랑 축 방향이면 → 세로 종이 (자동 파랑 추론)
    const al=_blueAligned(new THREE.Vector3(op.a.x*MM,op.z0,op.a.y*MM),e,18,12);
    if(al){ ffBlueHop(op,true); ff3Move(e); return; }
  }
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
    // 미리보기 — 2026-09-04: 선은 얇은 스케치 선 (면 위를 가로지르면 분할 예고)
    if(len>50){
      const th=FF_STANDALONE?0.006:0.03,H=FF_STANDALONE?0.003:0.02;
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
    if(co&&co.x!=null&&co.y!=null) cur=co.abs?axAbs(co.x,co.y):{x:Math.round(a.x+co.x),y:Math.round(a.y+co.y)};
    else if(exact!==null&&exact!==undefined&&exact!==0){    // 길이 (음수 = 반대 방향)
      const dx=cur.x-a.x,dy=cur.y-a.y,l=Math.hypot(dx,dy);
      const u=l>1?{x:dx/l,y:dy/l}:op.dir;
      if(u) cur={x:Math.round(a.x+u.x*exact),y:Math.round(a.y+u.y*exact)};
    }
  }
  if(!canEdit()){ setStatus(false,'MiniCAD 창이 없어 벽을 못 만듭니다'); return; }
  if(op.rect){
    const pr=vcbPair(); // 치수 입력 "3000,2000" → 첫 점에서 정확한 크기 (끌던 방향 부호)
    if(pr&&pr.w>0&&pr.h>0){
      const sx=(cur.x>=a.x)?1:-1, sy=(cur.y>=a.y)?1:-1;
      cur={x:Math.round(a.x+sx*pr.w),y:Math.round(a.y+sy*pr.h)};
    }
    if(Math.abs(cur.x-a.x)<100||Math.abs(cur.y-a.y)<100){ setStatus(statusLive,'면이 너무 작습니다 (100mm+) — 수치는 "가로,세로"'); return; }
    spawnPendingFace([{x:a.x,y:a.y},{x:cur.x,y:a.y},{x:cur.x,y:cur.y},{x:a.x,y:cur.y}],op.z0); // 즉시 보여주고, 실물은 재조립으로 교체
    const fid=op.fid, A={x:a.x,y:a.y};
    emitEdit({type:'edit',op:'sketchrect',floorId:fid,patch:{x1:a.x,y1:a.y,x2:cur.x,y2:cur.y}}); // 2026-09-04 점·선·면: 사각형 = 면 (Z 는 P 로)
    cancelOp();
    if(FF_STANDALONE&&ffAutoExtrude(FF.free)) return;
    setStatus(statusLive,'▭ 면 '+Math.abs(cur.x-a.x)+'×'+Math.abs(cur.y-a.y)+' — P(밀기끌기)로 Z 를 주면 매스');
    const sx=(cur.x>=A.x)?1:-1, sy=(cur.y>=A.y)?1:-1;
    setLast('가로,세로','mm',raw=>{ const m=String(raw).match(/^(-?[\d.]+\s*(?:mm|cm|m)?)\s*[,xX*]\s*(-?[\d.]+\s*(?:mm|cm|m)?)$/i); if(!m) return false;
      const w=parseLen(m[1]),h=parseLen(m[2]); if(!(w>=100&&h>=100)) return false;
      emitEdit({type:'edit',op:'sketchrect',floorId:fid,patch:{x1:A.x,y1:A.y,x2:Math.round(A.x+sx*w),y2:Math.round(A.y+sy*h)}}); return true; });
  }else{
    if(op.b3&&ffFree3()){                                    // 자유 3D 선 — 두 점을 품은 종이에 넣고 그 점에서 이어 간다
      const A={x:a.x,y:a.y,z:(op.z0||0)/MM}, B=op.b3;
      const L=_ffLen3(A,B);
      if(L<10){ setStatus(statusLive,'너무 짧습니다'); return; }
      if(!canEdit()){ setStatus(false,'편집할 수 없습니다'); return; }
      const fr=ffEmitEdge3(A,B);
      ffLineBegin3(B,fr);
      setStatus(statusLive,'╱ 3D 선 '+L+'mm — 이어서 클릭 (Esc·더블클릭=끝)');
      return;
    }
    if(Math.hypot(cur.x-a.x,cur.y-a.y)<100){ setStatus(statusLive,'너무 짧습니다 (100mm+)'); return; }
    // 시작점으로 돌아오면 폐합 = 면 (스케치업: 닫힌 선 고리는 면이 된다) — 보낸 벽들을 흡수해 한 그룹으로
    const c0=op.chain[0];
    if(op.chain.length>=3&&Math.hypot(cur.x-c0.x,cur.y-c0.y)<=50){
      // 2026-09-04 점·선·면: 마지막 변은 스케치 선으로 보내면 평면 쪽 그래프가 고리를 닫아 면을 만든다 (앞서 보낸 선들과 합쳐 한 면)
      spawnPendingFace(op.chain.map(p=>({x:p.x,y:p.y})),op.z0);
      emitEdit({type:'edit',op:'sketchline',floorId:op.fid,patch:{x1:a.x,y1:a.y,x2:c0.x,y2:c0.y}});
      cancelOp();
      setStatus(statusLive,'╱ 고리 닫힘 → 면 — P(밀기끌기)로 Z 를 주면 매스 (선은 Ctrl+Z 한 번씩)');
      return;
    }
    const sid=segHitsSpace(op.fid,a,cur);
    // 면(공간) 위를 가로지름 = 면 분할 (스케치업: 면 위의 선은 면을 나눈다) / 그 밖 = 스케치 선 (점 2 + 선 1, 고리가 닫히면 면)
    if(!sid) spawnPendingSketchLine(a,cur,op.z0);
    emitEdit({type:'edit',op:sid?'splitspace':'sketchline',floorId:op.fid,patch:{x1:a.x,y1:a.y,x2:cur.x,y2:cur.y}});
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
    if(!sid) setStatus(statusLive,'╱ 선 '+Math.round(Math.hypot(cur.x-A.x,cur.y-A.y))+'mm → 이어서 클릭 · 시작점으로 돌아오면 면 (Esc·더블클릭=끝)');
    invalidate();
    const dx=cur.x-A.x,dy=cur.y-A.y,l=Math.hypot(dx,dy);
    ST.lastCommit={label:'길이',unit:'mm',seq:0,apply:raw=>{ const v=parseLen(raw); if(v==null||v===0||wasSplit) return false;
      const nx=Math.round(A.x+dx/l*v), ny=Math.round(A.y+dy/l*v);
      emitEdit({type:'edit',op:'sketchline',floorId:fid,patch:{x1:A.x,y1:A.y,x2:nx,y2:ny}});
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
  const smk=_mkStart(); smk.renderOrder=1000; smk.position.set(c.x*MM,z0+0.03,c.y*MM); scene.add(smk);
  const isPoly=ST.tool==='polygon';
  ST.op={type:'circle',fid,z0,c,r:0,line:ln,startMk:smk,poly:isPoly,sides:isPoly?(ST.polySides||6):null};
  opOrbit(true);
  vcbShow(isPoly?'반지름 (변 수: '+(ST.polySides||6)+'s)':'반지름 (6s=육각형)','','mm');
  invalidate();
}
function circleMove(e){
  const op=ST.op; if(!op||op.type!=='circle') return;
  const raw=_planePt(e,op.z0); if(!raw) return;
  const sp=snap3(op.fid,raw,op.z0); showSnap(sp,op.z0);
  op.r=Math.round(Math.hypot(sp.x-op.c.x,sp.y-op.c.y)/10)*10;
  const pos=op.line.geometry.attributes.position;
  const ts=vcbSides(); if(ts&&op.poly){ op.sides=ts; ST.polySides=ts; }
  const segs=op.poly?op.sides:(pos.count-1);
  for(let i=0;i<pos.count;i++){ const k=Math.min(i,segs); const t=k/segs*Math.PI*2-Math.PI/2; pos.setXYZ(i,(op.c.x+Math.cos(t)*op.r)*MM,op.z0+0.02,(op.c.y+Math.sin(t)*op.r)*MM); }
  pos.needsUpdate=true; vcbShow(op.poly?'반지름 ('+op.sides+'각형 · Ns=변 수)':'반지름 (6s=육각형)',op.r,'mm'); invalidate();
}
function commitCircle(exact){
  const op=ST.op; if(!op||op.type!=='circle') return;
  const sides=vcbSides();
  const r=(exact!==null&&exact!==undefined&&exact>0)?Math.round(exact):op.r;
  if(r<100){ setStatus(statusLive,'반지름이 너무 작습니다 (100mm+) — 숫자 입력 가능'); return; }
  if(!canEdit()){ setStatus(false,'MiniCAD 창이 없어 면을 못 만듭니다'); return; }
  if(sides&&op.poly) ST.polySides=sides;
  const c=op.c, fid=op.fid, z0=op.z0, n=sides||(op.poly?op.sides:(ST.circleSides||32));
  const poly=(N)=>Array.from({length:N},(_,i)=>{const t=i/N*Math.PI*2-Math.PI/2; return {x:Math.round(c.x+Math.cos(t)*r),y:Math.round(c.y+Math.sin(t)*r)};});
  spawnPendingFace(poly(n),z0);
  emitEdit({type:'edit',op:'sketchcircle',floorId:fid,patch:{cx:c.x,cy:c.y,r,n}}); // 2026-09-04 점·선·면: 원 = 면 (Z 는 P 로)
  setStatus(statusLive,'○ '+(sides?sides+'각형':'원')+' 면 r='+r+' — P(밀기끌기)로 Z 를 주면 매스');
  cancelOp();
  if(FF_STANDALONE&&ffAutoExtrude(FF.free)) return;
  setLast('반지름','mm',raw=>{ const v=parseLen(raw); if(v==null||v<100) return false; emitEdit({type:'edit',op:'sketchcircle',floorId:fid,patch:{cx:c.x,cy:c.y,r:Math.round(v),n}}); return true; });
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
    const smk=_mkStart(); smk.renderOrder=1000; smk.position.set(p.x*MM,z0+0.03,p.y*MM); scene.add(smk);
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
  for(let i=0;i<pts.length-1;i++){ const p=pts[i],q=pts[i+1]; if(Math.hypot(q.x-p.x,q.y-p.y)<50) continue; ops.push({op:'sketchline',floorId:fid,patch:{x1:p.x,y1:p.y,x2:q.x,y2:q.y}}); spawnPendingSketchLine(p,q,z0); }
  cancelOp();
  if(sendBatch(ops,'호')) setStatus(statusLive,'◜ 호 → 스케치 선 '+ops.length+'조각 (고리가 닫히면 면 · Ctrl+Z 한 번)');
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
  if(!obj||(obj.kind!=='floor'&&obj.kind!=='sketchFace')){ setStatus(statusLive,'오프셋은 면(바닥·스케치 면)을 클릭'); return; }
  const sd=ST.snapData[obj.floorId]; const sp=sd&&(obj.kind==='floor'?sd.spaces:(sd.sketchFaces||[])).find(x=>String(x.id)===String(obj.id));
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
  if(!canEdit()){ setStatus(false,'MiniCAD 창이 없어 면을 못 만듭니다'); return; }
  const pts=offsetPoly(op.poly,d), fid=op.fid, z0=op.z0, poly=op.poly;
  if(Math.abs(polyArea(pts))<300*300){ setStatus(statusLive,'오프셋 결과 면이 너무 작습니다'); return; }
  spawnPendingFace(pts,z0);
  emitEdit({type:'edit',op:'sketchpoly',floorId:fid,patch:{pts}}); // 2026-09-04 점·선·면: 오프셋 결과 = 스케치 면
  cancelOp(); setStatus(statusLive,'⧉ 오프셋 '+d+'mm → 새 면 (P 로 Z · Ctrl+Z 한 번)');
  setLast('오프셋','mm',raw=>{ const v=parseLen(raw); if(v==null||Math.abs(v)<50) return false; emitEdit({type:'edit',op:'sketchpoly',floorId:fid,patch:{pts:offsetPoly(poly,Math.round(v))}}); return true; });
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
      if(op.copy&&op.g.parent){ op.g.parent.remove(op.g); }
      op.g.rotation.y=-(op.obj.rot||0)*Math.PI/180; if(op.orig){ op.g.position.x=op.orig.x; op.g.position.z=op.orig.z; }
      (op.extras||[]).forEach(it=>{ it.g.rotation.y=-(it.obj.rot||0)*Math.PI/180; it.g.position.x=it.orig.x; it.g.position.z=it.orig.z; });
    }
    if(op.type==='scale'&&op.g){ op.g.scale.x=op.baseSX; op.g.scale.z=op.baseSZ; if(op.baseSY!=null) op.g.scale.y=op.baseSY; }
    if(op.type==='pp'&&op.g){ op.g.scale.y=1; op.g.position.y=op.origY; if(op.baseSZ!=null) op.g.scale.z=op.baseSZ; }
    if(op.type==='vz'||op.type==='vxy'||op.type==='scaleg'||op.type==='rotate3'||op.type==='movesel'||(op.type==='pp'&&op.mode==='pushface')){ if(op.g) op.g.visible=true; if(op.ghost){ disposeGhost(op.ghost); op.ghost=null; } buildGrips(); }   // 2026-09-07 Z · 2차
    if(op.type==='followme'&&op.g) _hl(op.g,ST.selSet.has(op.g));
    ['line','ghost','startMk','infLine','protractor','guideLine','_p3'].forEach(k=>{ if(op[k]){ disposeGhost(op[k]); } });
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
  else if(op.type==='vz') commitVertZ(exact);
  else if(op.type==='vxy') commitVertXY(exact);
  else if(op.type==='movesel') commitMoveSel(exact);
  else if(op.type==='scaleg') commitScaleGrip(exact);
  else if(op.type==='shape3') shape3Commit(exact);
  else if(op.type==='rotate3') commitRotate3(exact);
  else if(op.type==='offset3') commitOffset3(exact);
  else if(op.type==='line3'||op.type==='rect3') ff3Commit(exact);
  else if(op.type==='line') commitLine(exact);
  else if(op.type==='circle') commitCircle(exact);
  else if(op.type==='arc') commitArc(exact);
  else if(op.type==='offset') commitOffset(exact);
  else if(op.type==='rotrect') commitRotrect(exact);
  else if(op.type==='arc3') commitArc3();
  else if(op.type==='pie') commitPie(exact);
  else if(op.type==='protractor') commitProtractor(exact);
  else if(op.type==='axesop'){ const a=Math.atan2(op.cur.y-op.c.y,op.cur.x-op.c.x)*180/Math.PI; setAxesOrigin(op.c.x,op.c.y,Math.round(a)); cancelOp(); }
  else if(op.type==='freehand') freehandEnd();
  else if(op.type==='poscam') poscamEnd();
}
// ---------------------------------------------------------------------------
// 꼭짓점 그립 — Z축 3층(조작) · 2026-09-07
//  엔진(sketch.js)은 이미 점마다 z 를 안다. 그런데 그것을 만질 손잡이가 없어서,
//  빗천장을 만드는 유일한 방법이 JSON 을 손으로 쓰는 것이었다. 여기가 그 손잡이다.
//   · 매스 하나를 고르면 윗면 꼭짓점마다 파란 그립이 뜬다
//   · 그립을 끌면 그 점만 위아래로 — 축 고정이 필요 없다 (꼭짓점은 Z 로만 간다)
//   · Shift = 화면에서 가까운 이웃까지 두 점 (지붕 한쪽 면이 통째로 기운다)
//   · Ctrl = 천장고에 매달기 — 숫자가 아니라 CH-300 이 되어 천장고를 따라 움직인다
//   · 숫자 입력(VCB) = 정확한 높이 · 그립 더블클릭 = 직전 높이 반복
//  미리보기는 sketch.js 를 그대로 불러 만든다. 3D 쪽에서 형상을 새로 짜면
//  평면과 답이 갈라진다 — 접힘 정리·갈래 판정이 두 벌이 되기 때문.
// ---------------------------------------------------------------------------
const GRIP_R=70;                       // 그립 기준 반지름 (mm) — 손으로 집을 만한 크기
let gripsGrp=null, gripGeo=null, gripMat=null, gripMatRef=null;
// 매스가 크면 그립도 커야 보인다 (작은 붙박이도 큰 지붕도 같은 손맛으로)
function _gripSize(o){
  const pts=(o.meta&&o.meta.z&&o.meta.z.pts)||[];
  if(pts.length<2) return GRIP_R;
  let w=0,h=0;
  const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  w=Math.max(...xs)-Math.min(...xs); h=Math.max(...ys)-Math.min(...ys);
  return Math.max(45,Math.min(260,Math.max(w,h)*0.018));
}
function _gripInit(){
  if(gripsGrp) return;
  gripsGrp=new THREE.Group(); gripsGrp.name='zgrips'; scene.add(gripsGrp);
  gripGeo=new THREE.SphereGeometry(GRIP_R*MM,12,10);
  // 늘 보이게 — 기하에 묻히면 집을 수가 없다 (스케치업의 끝점 표시와 같은 취급)
  gripMat=new THREE.MeshBasicMaterial({color:0x2F6193,depthTest:false,transparent:true,opacity:0.95});
  gripMatRef=new THREE.MeshBasicMaterial({color:0xC9A961,depthTest:false,transparent:true,opacity:0.95}); // 매달린 점은 금색
}
function clearGrips(){
  if(!gripsGrp) return;
  while(gripsGrp.children.length) gripsGrp.remove(gripsGrp.children[gripsGrp.children.length-1]);
}
// 매스 로컬 (x,y,z) → 세계 좌표. 그룹이 하는 일(층 z0 · 띄움 · 회전)을 손으로 한 번 더 한다.
//  그립을 그룹 안에 넣지 않는 이유: 그룹이 잠깐 축척되거나 숨겨져도 그립은 남아야 한다.
function _massWorld(o,x,y,z,z0){
  const r=-(o.rot||0)*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  const wx=o.x*MM+(x*MM)*c+(y*MM)*s;
  const wz=o.y*MM-(x*MM)*s+(y*MM)*c;
  return new THREE.Vector3(wx,(z0+(o.elev||0)+z)*MM,wz);
}
function _massZ0(o){ const f=ST.floors.find(x=>x.id===o.floorId); return f?f.z0:0; }
// 매스 하나만 골랐을 때만 — 여럿이면 어느 점인지 알 수 없어 오히려 방해가 된다
function buildGrips(){
  if(FF_STANDALONE&&ST.tool==='scale'){ buildScaleGrips(); return; }
  _gripInit(); clearGrips();
  if(FF_STANDALONE&&ST.parts.length){ invalidate(); return; }
  const arr=[...ST.selSet];
  if(arr.length!==1){ invalidate(); return; }
  const g=arr[0], o=g.userData.obj;
  if(!o||o.kind!=='mass'||o.locked||!o.meta||!o.meta.z||!o.meta.z.top){ invalidate(); return; }
  if(!ffEditable(o)){ invalidate(); return; }               // 프리폼: 밑그림 매스에는 그립 없음
  if(!(ST.tool==='select'||ST.tool==='move'||ST.tool==='pushpull')){ invalidate(); return; }
  const z0=_massZ0(o);
  const gs=_gripSize(o)/GRIP_R;
  o.meta.z.top.forEach(p=>{
    const mk=FF_STANDALONE?glowSprite(p.ref?0xC9A961:0x4C7DE2,9):new THREE.Mesh(gripGeo,p.ref?gripMatRef:gripMat);
    if(!mk.isSprite) mk.scale.setScalar(gs);
    mk.position.copy(_massWorld(o,p.x,p.y,p.z,z0));
    mk.renderOrder=900;
    mk.userData.grip={obj:o,g,i:p.i,vi:p.vi,x:p.x,y:p.y,z:p.z,zr:p.zr,ref:p.ref,label:p.label};
    gripsGrp.add(mk);
  });
  invalidate();
}
function _gripAt(cx,cy){
  if(!gripsGrp||!gripsGrp.children.length) return null;
  // 그립을 막 세운 프레임에서도 집혀야 한다. buildGrips 는 invalidate 만 하므로
  //  다음 rAF 전에 눌리면 matrixWorld 가 옛것이라 레이가 빗나간다 — 실제로 빗나갔다.
  gripsGrp.updateMatrixWorld(true); camera.updateMatrixWorld();
  const r=renderer.domElement.getBoundingClientRect();
  if(gripsGrp.children[0]&&gripsGrp.children[0].isSprite){                    // 발광점 그립 = 화면 9px 안 (스케치업 픽 조리개)
    let best=null,bd=9; gripsGrp.children.forEach(o=>{ if(!o.visible) return; const w=o.getWorldPosition(new THREE.Vector3()).project(camera); if(w.z>1) return; const d=Math.hypot(r.left+(w.x+1)/2*r.width-cx,r.top+(1-w.y)/2*r.height-cy); if(d<bd){ bd=d; best=o; } });
    return best;
  }
  const nd=new THREE.Vector2(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);
  ray.setFromCamera(nd,camera);
  const hits=ray.intersectObjects(gripsGrp.children,false);
  return hits.length?hits[0].object:null;
}
// 화면에서 가장 가까운 이웃 꼭짓점 — Shift 로 모서리를 함께 잡을 때
function _gripNeighbor(o,i,cx,cy){
  const top=o.meta.z.top, N=top.length;
  if(N<3) return null;
  camera.updateMatrixWorld();
  const z0=_massZ0(o), r=renderer.domElement.getBoundingClientRect();
  let best=null,bd=Infinity;
  [(i+1)%N,(i-1+N)%N].forEach(j=>{
    const p=top[j], v=_massWorld(o,p.x,p.y,p.z,z0).project(camera);
    const sx=r.left+(v.x+1)/2*r.width, sy=r.top+(1-v.y)/2*r.height;
    const d=Math.hypot(sx-cx,sy-cy);
    if(d<bd){ bd=d; best=j; }
  });
  return best;
}
// 지금 끄는 중인 모양 — 형상 계산은 sketch.js 를 그대로 부른다
function _vzPreview(op,z){
  if(typeof massVertZ!=='function'||typeof massSolid!=='function') return null;
  op.idxs.forEach(vi=>massVertZ(op.lean,vi,z,op.ctx));
  const S=massSolid(op.lean,op.ctx);
  const pos=[];
  S.faces.forEach(f=>{
    for(let i=1;i<f.vs.length-1;i++){
      [f.vs[0],f.vs[i],f.vs[i+1]].forEach(k=>{ const v=S.verts[k]; pos.push(v.x*MM,v.z*MM,v.y*MM); });
    }
  });
  return {pos:new Float32Array(pos),solid:S};
}
// 지금 미리보기의 가장 가파른 경사 — 끄는 동안 각도와 물매를 함께 보여 준다
function _vzTilt(op){
  if(!op.solid||typeof pitchOf!=='function') return null;
  let t=0;
  op.solid.faces.forEach(f=>{ if(f.role!=='wall'&&f.tilt>t) t=f.tilt; });
  return {tilt:Math.round(t*10)/10,pitch:pitchOf(t)};
}
function beginVertZ(mk,e){
  const gi=mk.userData.grip, o=gi.obj;
  if(!_floorAwake(o.floorId)){ _sleepNote('꼭짓점 높이는 바꿀 수 없습니다'); return; }
  if(!o.meta.z.lean||typeof massVertZ!=='function'){ setStatus(statusLive,'기하 파일(sketch.js)이 없어 꼭짓점을 만질 수 없습니다'); return; }
  const N=o.meta.z.top.length;
  const idxs=[gi.vi];
  let label='꼭짓점 Z';
  if(e&&e.shiftKey){
    const j=_gripNeighbor(o,gi.i,e.clientX,e.clientY);
    if(j!=null){ idxs.push(N+j); label='모서리 Z (두 점)'; }
  }
  const lean=JSON.parse(JSON.stringify(o.meta.z.lean));   // 사본만 고친다 — 원본은 확정할 때 op 로
  const ctx=o.meta.z.ctx||{ch:2400,fh:2800,fl:0};
  const z0=_massZ0(o);
  const gcol=new THREE.Color((o.meta&&o.meta.color)||'#B9C6D2');
  const ghost=new THREE.Mesh(new THREE.BufferGeometry(),
    new THREE.MeshLambertMaterial({color:gcol,transparent:true,opacity:0.92,side:THREE.DoubleSide,
      emissive:new THREE.Color(0x2F6193),emissiveIntensity:0.22}));
  const gwire=new THREE.LineSegments(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({color:0x2F6193,transparent:true,opacity:0.9,depthTest:false}));
  gwire.renderOrder=850;
  ghost.add(gwire);
  ghost.position.set(o.x*MM,(z0+(o.elev||0))*MM,o.y*MM);
  ghost.rotation.y=-(o.rot||0)*Math.PI/180;
  ghost.renderOrder=800;
  scene.add(ghost);
  // 기준점은 '누른 자리'다. 첫 pointermove 를 기준으로 잡으면 그 한 걸음만큼
  //  덜 올라간다 — 왕복 시험에서 800 을 끌었는데 600 이 들어왔다.
  ST.op={type:'vz',obj:o,g:gi.g,mk,idxs,i:gi.i,base:gi.z,z:gi.z,lean,ctx,ghost,gwire,z0,
    startY:(e&&typeof e.clientY==='number')?e.clientY:null,startX:(e&&typeof e.clientX==='number')?e.clientX:null,
    moved:false,ref:!!(e&&(e.ctrlKey||e.metaKey))||!!gi.ref,label};
  opOrbit(true);
  if(gi.g) gi.g.visible=false;                            // 실물은 잠시 감추고 미리보기를 본다
  _vzApply(gi.z);
  vcbShow(label+(ST.op.ref?' · CH 에 매달림':''),Math.round(gi.z),'mm');
  setStatus(statusLive,'⇕ '+label+' — 위아래로 끌기 · 숫자=정확한 높이 · Shift=모서리 · Ctrl=천장고에 매달기 · Esc=취소');
}
function _vzApply(z){
  const op=ST.op; if(!op||op.type!=='vz') return;
  op.z=z;
  const pv=_vzPreview(op,z);
  if(pv){
    const g2=new THREE.BufferGeometry();
    g2.setAttribute('position',new THREE.BufferAttribute(pv.pos,3));
    g2.computeVertexNormals(); g2.computeBoundingSphere();
    if(op.ghost.geometry) op.ghost.geometry.dispose();
    op.ghost.geometry=g2;
    op.solid=pv.solid;
    if(op.gwire){                                  // 모서리를 덧그려 지금 모양이 또렷하게
      const seg=[];
      pv.solid.faces.forEach(f=>{
        for(let k=0;k<f.vs.length;k++){
          const a=pv.solid.verts[f.vs[k]], b=pv.solid.verts[f.vs[(k+1)%f.vs.length]];
          seg.push(a.x*MM,a.z*MM,a.y*MM,b.x*MM,b.z*MM,b.y*MM);
        }
      });
      const gw=new THREE.BufferGeometry();
      gw.setAttribute('position',new THREE.BufferAttribute(new Float32Array(seg),3));
      if(op.gwire.geometry) op.gwire.geometry.dispose();
      op.gwire.geometry=gw;
    }
  }
  if(op.mk){
    const p=op.obj.meta.z.top[op.i];
    op.mk.position.copy(_massWorld(op.obj,p.x,p.y,z,op.z0));
  }
  invalidate(true);
}
function applyVertZ(clientY){
  const op=ST.op; if(!op||op.type!=='vz') return;
  if(op.startY===null){ op.startY=clientY; return; }
  const mkW=op.mk?op.mk.getWorldPosition(new THREE.Vector3()):op.g.getWorldPosition(new THREE.Vector3());
  const d=Math.round(_dragAlong(mkW,new THREE.Vector3(0,1,0),op.startX!=null?op.startX:0,op.startY,op.startX!=null?op.startX:0,clientY)/10)*10;   // 줌 비례 · 10mm 스냅
  const z=Math.max(0,op.base+d);
  if(z!==op.z){ op.moved=true; _vzApply(z); }
  vcbShow(op.label+(op.ref?' · CH':''),z,'mm');
  const t=_vzTilt(op);
  if(t) setStatus(statusLive,'⇕ z '+z+'mm · ∠'+t.tilt+'° · 물매 '+t.pitch+'/10');
}
function _vzSend(obj,idxs,z){
  emitEdit({type:'edit',op:'setz',floorId:obj.floorId,
    patch:{id:obj.id,verts:idxs.map(vi=>({i:vi,z}))}});
}
function commitVertZ(exact){
  const op=ST.op; if(!op||op.type!=='vz') return;
  const typed=(exact!==null&&exact!==undefined);
  const z=Math.max(0,typed?Math.round(exact):op.z);
  if(op.ghost) disposeGhost(op.ghost);
  if(op.g) op.g.visible=true;
  const obj=op.obj, idxs=op.idxs.slice(), ref=op.ref, ctx=op.ctx, moved=op.moved;
  _opDone();
  if(!moved&&!typed){ buildGrips(); setStatus(statusLive,'꼭짓점 그대로'); return; }
  ST.lastZ=z;
  if(ref){
    // 숫자가 아니라 '천장고에서 얼마' 로 적어 둔다 — 천장고가 바뀌면 따라 움직인다
    const off=Math.round(z-(ctx.ch||2400));
    emitEdit({type:'edit',op:'zref',floorId:obj.floorId,
      patch:{id:obj.id,verts:idxs,r:'ch',o:off}});
    setStatus(statusLive,'⇕ 꼭짓점 = CH'+(off>=0?'+':'')+off+' ('+z+'mm) — 천장고를 고치면 따라 움직입니다');
  }else{
    _vzSend(obj,idxs,z);
    setStatus(statusLive,'⇕ 꼭짓점 z '+z+'mm → 평면 반영 (그립 더블클릭 = 반복)');
  }
  setLast('꼭짓점 Z','mm',raw=>{ const v=parseLen(raw); if(v==null) return false; _vzSend(obj,idxs,Math.max(0,Math.round(v))); return true; });
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
  // 2026-09-07 대표 물음 "z 축으로는 이동되지 않는다" — 되기는 되는데(↑ 로 파란 축 고정)
  //  안내가 하단 줄 가운데 묻혀 있어 찾기 어려웠다. 끌기 시작하는 그 자리에 적는다.
  vcbShow((copy?'복사':'이동')+(extras.length?' ('+(extras.length+1)+'개)':'')+'  ·  ↑=높이(Z)',0,'mm');
  setStatus(statusLive,'✥ '+(copy?'복사':'이동')+' — 바닥에서 끕니다. 위로 띄우려면 <b>↑</b>(파란 Z축), ←→=가로·세로 고정, 숫자=정확한 값');
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
    vcbShow('높이(바닥에서)  ·  마우스 위아래 · 숫자=정확히',op.elev,'mm');
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
  vcbShow((s.kind!=='grid'?SNAP_NAME[s.kind]+' · ':'')+(ST.axisLock?'축 고정 · ':op.shiftLock?'방향 고정 · ':'')+(op.copy?'복사':'이동')+(ST.axisLock?'':'  ·  ↑=높이(Z)'),Math.round(Math.hypot(ddx,ddz)/MM),'mm');
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
    setStatus(statusLive,'⬆ 높이 '+op.elev+'mm (바닥에서)'+(ST.ffOn?' (프리폼 — 평면 무관)':' → 평면 데이터 반영'));
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
  ST.lastMove={at:Date.now(),copy,dx:dxm,dy:dym,items:recs.map(r=>({obj:r.obj,ox:r.ox,oy:r.oy}))};
  const L=Math.hypot(dxm,dym)||1, ux=dxm/L, uy=dym/L;
  setLast(copy?'복사':'이동','mm',raw=>{ const v=parseLen(raw); if(v==null) return false; sendBatch(mkOps(ux*v,uy*v),copy?'복사':'이동'); return true; });
  setStatus(statusLive,(copy?'복사':'이동')+(recs.length>1?' '+recs.length+'개':'')+(ST.ffOn?' (프리폼)':' → 평면 반영')+' ('+dxm+', '+dym+')'+(copy?' · 숫자 x3 = 배열 복사':''));
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
  if(obj.kind==='mass'&&ST.ffOn){ beginScaleMass(g,obj,cy,cx); return; }
  if(!SCALABLE.has(obj.kind)){ setStatus(statusLive,'배율은 가구·기구·설비만 (조명 규격은 인치·길이로)'); return; }
  ST.op={type:'scale',g,obj,startY:cy,startX:cx,factor:1,fx:1,fz:1,baseSX:g.scale.x,baseSZ:g.scale.z,baseW:(obj.meta&&obj.meta.w)||400,baseD:(obj.meta&&obj.meta.d)||400};
  opOrbit(true);
  vcbShow('배율 (Shift=한 방향 · 가로,세로)','1.00','×');
}
function applyScale(cy,shift,cx){
  const op=ST.op; if(!op||op.type!=='scale') return;
  if(op.mass){ applyScaleMass(cy,shift); return; }
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
  if(op.mass){ commitScaleMass(exact); return; }
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
function beginRotate(g,obj,e,hit){
  if(ST.ffOn&&obj.kind==='mass'&&ffEditable(obj)&&hit&&hit.face){
    const nW=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if(Math.abs(nW.y)<0.3){ beginRotate3(g,obj,e,hit); return; }          // 세워진 면 = 그 면의 법선이 축
  }
  const ent=ST.floorCache[obj.floorId], z0=(ent?ent.z0*MM:0)+((obj.elev||0)*MM);
  dragPlane.constant=-z0; rayFromEvent(e); ray.ray.intersectPlane(dragPlane,dragPt);
  const extras=_selOthers(g).map(x=>({g:x,obj:x.userData.obj,orig:{x:x.position.x,z:x.position.z},base:x.userData.obj.rot||0}));
  const pro=_protractor(g.position.x,g.position.z,z0+0.03); scene.add(pro);
  let tg=g; const copy=!!(ST.ffOn&&e&&(e.ctrlKey||e.metaKey)&&MOVABLE.has(obj.kind));   // 스케치업: 회전 중 Ctrl = 복사 (뒤에 x3 = 방사 배열)
  if(copy){ tg=g.clone(true); g.parent.add(tg); }
  ST.op={type:'rotate',g:tg,srcG:g,copy,obj,base:obj.rot||0,ang:0,stage:1,c:{x:g.position.x,z:g.position.z},orig:{x:g.position.x,z:g.position.z},ref:null,extras,protractor:pro,
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
  if(op.copy){                                           // 복사 회전 → clone (각도 동반) · 방사 배열용 기록
    const o=op.obj, ang=(((op.base+a)%360)+360)%360;
    if(op.g.parent) op.g.parent.remove(op.g);
    const g0=op.srcG; _opDone();
    emitEdit({type:'edit',op:'clone',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{x:o.x,y:o.y,angle:ang}});
    ST.lastRot={at:Date.now(),obj:o,base:op.base,ang:a};
    ST.lastMove=null;
    select(g0,{silent:true});
    setLast('회전 복사','°',raw=>{ const v=parseFloat(raw); if(!isFinite(v)) return false; emitEdit({type:'edit',op:'clone',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId,patch:{x:o.x,y:o.y,angle:(((op.base+v)%360)+360)%360}}); return true; });
    setStatus(statusLive,'↻ 회전 복사 '+Math.round(a)+'° · 숫자 x3 = 방사 배열'); return;
  }
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
// 2026-09-05 리뷰 반영: 면→객체(extrude)·매스 전환은 평면이 활성 층에서만 받는다 — 잠든 층이면 뷰어가 먼저 거부(면 숨김+고스트 유령 방지)
function _floorAwake(fid){ const f=ST.floors.find(x=>x.id===fid); return !f||f.active!==false; }
function _sleepNote(what){ setStatus(statusLive,'잠든 층의 '+what+' — 미니캐드에서 그 층으로 전환한 뒤 해주세요'); }
function beginPP(hit,e){
  const obj=hit.object.userData.obj, g=hit.object.parent;
  if(ST.ffOn&&obj.kind==='mass'&&ffEditable(obj)&&!obj.locked&&hit.face){ beginPPFace(hit,e); return; }   // 스케치업: 어느 면이든 밀면 매스가 바뀐다
  if(ST.ffOn&&!ffEditable(obj)){ setStatus(statusLive,'🧊 밑그림은 평면(미니캐드)에서 — 프리폼에서는 자유 층만 밉니다'); return; }
  let t=null;
  const n=hit.face&&hit.face.normal?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):null;
  if(obj.kind==='wall'&&!obj.locked){
    if(n&&Math.abs(n.y)<0.7&&obj.meta&&obj.meta.t) t={obj,g,mode:'thick',base:obj.meta.t,baseSZ:g.scale.z,n};   // 옆면 = 두께 (수평 밀기)
    else t={obj,g,mode:'wall',base:obj.meta.H};
  }
  else if(obj.kind==='ceiling') t={obj,g,mode:'ceil',base:Math.round((obj.prims&&obj.prims[0]&&obj.prims[0].z)||2400)};
  else if(obj.kind==='sketchFace'&&obj.meta&&obj.meta.plane){ // 2026-09-07 프리폼 2단계: 평면 면 = 법선 방향으로 뽑는다
    const pm=obj.meta.plane;
    const gh=g.children[0]?g.children[0].clone():null;         // 면을 복제해 법선 쪽으로 밀며 보여 준다
    if(gh){ gh.material=gh.material.clone(); gh.material.opacity=0.55; gh.renderOrder=7; scene.add(gh); }
    t={obj,g,mode:'extrude3',base:0,ghost:gh,n:pm.n,
       nW:new THREE.Vector3(pm.n.x,pm.n.z,pm.n.y)};
  }
  else if(obj.kind==='sketchFace'&&obj.meta&&obj.meta.poly&&obj.meta.poly.length>=3){ // 2026-09-04 면 + Z = 매스 (스케치업 Push/Pull)
    if(!_floorAwake(obj.floorId)){ _sleepNote('면은 올릴 수 없습니다'); return; }
    const f=ST.floors.find(x=>x.id===obj.floorId), z0=f?f.z0*MM:0;
    const gh=prismGhost(obj.meta.poly,10,z0,0xB9C6D2); gh.visible=false; scene.add(gh);
    t={obj,g,mode:'extrude',base:0,ghost:gh,poly:obj.meta.poly};
  }
  else if(obj.kind==='mass'&&!obj.locked) t={obj,g,mode:'mass',base:Math.max(10,Math.round((obj.meta&&obj.meta.h_mm)||10))};
  if(!t){ setStatus(statusLive,obj.kind==='mass'?'잠금된 매스':'밀기끌기는 면(스케치 면=Z 로 매스)·매스·벽·천장에서'); return; }
  ST.op={type:'pp',...t,startY:null,startX:null,delta:0,origY:t.g.position.y};
  opOrbit(true);
  vcbShow(t.mode==='thick'?'벽 두께 (밀기)':t.mode==='extrude'?'Z 높이 (면 → 매스)':'밀기끌기',0,'mm');
}
function applyPP(clientY,clientX){
  const op=ST.op; if(!op||op.type!=='pp') return;
  if(op.mode==='pushface'){ applyPPFace(clientY,clientX); return; }
  if(op.startY===null){ op.startY=clientY; op.startX=clientX; return; }
  if(op.mode==='thick'){
    // 화면 이동을 면 법선 방향으로 투영 (법선 쪽으로 끌면 두꺼워진다)
    const r=renderer.domElement.getBoundingClientRect();
    const c0=op.g.position.clone().project(camera), c1=op.g.position.clone().add(op.n).project(camera);
    const sx=(c1.x-c0.x)*r.width/2, sy=-(c1.y-c0.y)*r.height/2, L=Math.hypot(sx,sy)||1;
    const px=(clientX!=null?clientX:op.startX)-op.startX, py=clientY-op.startY;
    const mmppT=mmPerPx(op.g.position); let d=Math.round(((L*mmppT/1000<0.25)?-py:((px*sx+py*sy)/L))*mmppT/10)*10;         // 줌 비례 · 10mm 스냅 · 정면이면 위아래로
    d=Math.max(30-op.base,Math.min(600-op.base,d));
    op.delta=d; op.g.scale.z=op.baseSZ*(op.base+d)/op.base;
    vcbShow('벽 두께',op.base+d,'mm'); invalidate(true); return;
  }
  if(op.mode==='extrude3'){                             // 프리폼 2단계: 화면 이동을 면 법선에 투영
    const r=renderer.domElement.getBoundingClientRect();
    const c0=op.g.children[0].getWorldPosition(new THREE.Vector3());
    const s0=c0.clone().project(camera), s1=c0.clone().add(op.nW).project(camera);
    const sx=(s1.x-s0.x)*r.width/2, sy=-(s1.y-s0.y)*r.height/2, L=Math.hypot(sx,sy)||1;
    const px=(clientX!=null?clientX:op.startX)-op.startX, py=clientY-op.startY;
    const mmpp3=mmPerPx(c0); let d3=Math.round(((L*mmpp3/1000<0.25)?-py:((px*sx+py*sy)/L))*mmpp3/10)*10;       // 줌 비례 · 10mm 스냅 · 축을 정면으로 보면 위아래로
    op.delta=d3;                                         // 프리폼 ③: 음수 = 안으로 파낸다
    if(op.ghost){
      op.ghost.position.copy(op.nW.clone().multiplyScalar(d3*MM));
      op.ghost.material.color.set(d3<0?0x8A5A3C:0xD4FF3D);   // 파낼 땐 흙색으로
    }
    vcbShow(d3<0?'파내기 — 벽감 (끝까지 밀면 관통)':'면 뽑기 (법선 방향)',Math.abs(d3),'mm');
    invalidate(true); return;
  }
  // 줌 비례: 파랑(위) 축을 화면에 투영해 그 방향으로 끈 만큼 (스케치업식 — 한 번 끌기의 상한이 없다)
  const cW=(op.obj&&op.obj.meta&&typeof op.obj.meta.cx==='number')?new THREE.Vector3(op.obj.meta.cx*MM,op.origY||0,op.obj.meta.cy*MM):op.g.getWorldPosition(new THREE.Vector3());
  let d=Math.round(_dragAlong(cW,new THREE.Vector3(0,1,0),op.startX!=null?op.startX:clientX,op.startY,clientX!=null?clientX:op.startX,clientY)/10)*10;
  if(op.mode==='extrude'){                              // 2026-09-04 면 → 매스: 위로 끈 만큼이 Z
    d=Math.max(0,d); op.delta=d;
    op.ghost.visible=d>=10; op.ghost.scale.z=Math.max(d,10)*MM;
    vcbShow('Z 높이 (면 → 매스)',d,'mm'); invalidate(true); return;
  }
  d=Math.max((op.mode==='mass'?10:300)-op.base,d);
  op.delta=d;
  if(op.mode==='wall'||op.mode==='mass') op.g.scale.y=(op.base+d)/op.base;
  else op.g.position.y=op.origY+d*MM;
  vcbShow('밀기끌기',d,'mm');
  invalidate(true);
}
function commitPP(exact){
  const op=ST.op; if(!op||op.type!=='pp') return;
  if(op.mode==='pushface'){ commitPPFace(exact); return; }
  const obj=op.obj,mode=op.mode;
  if(mode==='thick'){
    const nv=Math.max(30,Math.min(600,(exact!==null&&exact!==undefined)?Math.round(exact):op.base+op.delta));
    op.g.scale.z=op.baseSZ; _opDone();
    sendEdit('set',obj,{thickness:nv});
    setLast('벽 두께','mm',raw=>{ const v=parseLen(raw); if(v==null||v<30||v>600) return false; sendEdit('set',obj,{thickness:Math.round(v)}); return true; });
    setStatus(statusLive,'⇔ 벽 두께 '+nv+'mm → 평면 반영'); return;
  }
  if(mode==='extrude3'){                                // 프리폼 ②③: 뽑으면 입체, 밀면 벽감
    let d3=(exact!==null&&exact!==undefined)
      ?Math.round(exact)*((op.delta<0)?-1:1)             // 숫자는 크기 — 방향은 끌던 쪽
      :op.delta;
    if(op.ghost){ disposeGhost(op.ghost); op.ghost=null; }
    const fg=op.g;
    if(Math.abs(d3)<10){ cancelOp(); setStatus(statusLive,'10mm 이상 끌어주세요 — 밖=뽑기 · 안=벽감 (숫자 입력 가능)'); return; }
    if(fg) fg.visible=false;
    _opDone();
    ST.lastPP=d3;
    if(d3>0){
      emitEdit({type:'edit',op:'extrude',floorId:'freeform',patch:{id:obj.id,z:d3,as:'solid'}});
      setStatus(statusLive,'🧊 면 → 입체 '+d3+'mm (법선 방향)');
    }else{
      const okc=emitEdit({type:'edit',op:'cut',floorId:'freeform',patch:{id:obj.id,d:-d3}});
      if(!okc&&fg) fg.visible=true;                      // 못 팠으면 면을 되살린다
    }
    return;
  }
  if(mode==='extrude'){                                 // 2026-09-04 면 + Z → 매스 (평면 skExtrude · Ctrl+Z 한 번)
    const z=(exact!==null&&exact!==undefined)?Math.round(exact):op.delta;
    if(!(z>=10)){ cancelOp(); setStatus(statusLive,'Z 높이 10mm+ 로 올려주세요 (숫자 입력 가능)'); return; }
    if(op.ghost){ op.ghost.visible=true; op.ghost.scale.z=z*MM; ST.pendingG.push(op.ghost); op.ghost=null; } // 실물이 올 때까지 고스트 유지
    if(op.g) op.g.visible=false;                        // 면은 소비된다
    _opDone();
    ST.lastPP=z;
    emitEdit({type:'edit',op:'extrude',floorId:obj.floorId,patch:{id:obj.id,z,as:'solid'}});
    setStatus(statusLive,'⬆ 면 → 매스 Z='+z+'mm (스케치업 밀기끌기) — 이동·회전·P 로 더 밀기 · 우측 속성에서 공간/벽 전환');
    return;
  }
  const d=(exact!==null&&exact!==undefined)?Math.round(exact):op.delta;
  const nv=Math.max(mode==='mass'?10:300,op.base+d);
  if(op.g){ op.g.scale.y=1; op.g.position.y=op.origY; }
  _opDone();
  ST.lastPP=d; // 스케치업: 더블클릭 = 직전 밀기끌기 반복
  if(mode==='mass'){                                     // 2026-09-04 매스 윗면 = 높이(h_mm)
    sendEdit('set',obj,{h_mm:nv});
    setLast('매스 높이','mm',raw=>{ const v=parseLen(raw); if(v==null) return false; sendEdit('set',obj,{h_mm:Math.max(10,op.base+Math.round(v))}); return true; });
    setStatus(statusLive,'⇕ 매스 높이 '+nv+'mm → 평면 반영'); return;
  }
  const target=mode==='wall'?obj:{kind:'floor',id:String(obj.id).replace(/_ceil$/,''),floorId:obj.floorId};
  const key=mode==='wall'?'height_mm':'ceilingHeight_mm', base=op.base;
  sendEdit('set',target,{[key]:nv});
  setLast('밀기끌기','mm',raw=>{ const v=parseLen(raw); if(v==null) return false; sendEdit('set',target,{[key]:Math.max(300,base+Math.round(v))}); return true; });
  setStatus(statusLive,'⇕ 높이 '+nv+'mm → 평면 반영');
}
// --- 페인트 (B) · Alt+클릭 = 재질 추출 (스케치업 Sample Paint) ---

// 고른 재질의 속성 편집 — 재질 패널 맨 위 (긴 마감 목록에 묻히지 않게)
function ffMatEditor(pal){
  if(!FF_STANDALONE||!pal) return;
  const c=ST.paint&&ST.paint.cat, code=ST.paint&&ST.paint.code;
  const editable=(c==='color'||c==='img');
  const key=editable?_ffMatKey(code):null;
  const P=key?ffMatProp(key):null;
  const rec=(c==='img')?_ffMats().find(x=>x.id===code):null;
  let html='<div class="pp-cat">지금 고른 재질 손보기</div>';
  if(!editable){
    html+='<div class="me-off">색상이나 내 재질을 고르면 투명도·거칠기·금속감을 조절할 수 있습니다</div>';
  }else{
    html+='<div class="me-pre">'+Object.keys(MAT_PRESETS).map(k=>'<button class="btn sm" data-pre="'+k+'">'+MAT_PRESETS[k].name+'</button>').join('')+'</div>'+
      _meRow('op','투명도',Math.round((1-P.op)*100),0,95,1,'%')+
      _meRow('ro','거칠기',Math.round(P.ro*100),0,100,1,'%')+
      _meRow('me','금속감',Math.round(P.me*100),0,100,1,'%');
    if(rec) html+=_meRow('S','무늬 폭',Math.round((Number(rec.S)||1)*100)/100,0.05,20,0.05,'m')+
      _meRow('rot','무늬 회전',Math.round(P.rot||0),0,180,1,'°')+
      '<div class="me-off">'+(rec.full?'원본 해상도 · 클라우드 저장':'512px · 문서 안 (로그인하면 원본으로 올라갑니다)')+'</div>';
    html+='<div class="me-pre"><button class="btn sm" data-pre="reset">기본값</button></div>';
  }
  pal.insertAdjacentHTML('afterbegin',html);
  pal.querySelectorAll('[data-me]').forEach(r=>{
    const k=r.dataset.me, inp=r.querySelector('input'), out=r.querySelector('.me-v');
    inp.oninput=()=>{
      const val=parseFloat(inp.value); out.textContent=val+(r.dataset.unit||'');
      if(k==='S'){ const rc=_ffMats().find(x=>x.id===code); if(rc){ rc.S=Math.max(0.05,val); texCache.delete(code); ffAutosave(); ffRender&&ffRender(); invalidate(true); } return; }
      ffSetMatProp(key,k==='op'?{op:1-val/100}:k==='rot'?{rot:val}:{[k]:val/100});
    };
  });
  pal.querySelectorAll('[data-pre]').forEach(b=>{ b.onclick=()=>{
    const k=b.dataset.pre;
    if(k==='reset') ffSetMatProp(key,{op:MAT_DEF.op,ro:MAT_DEF.ro,me:MAT_DEF.me,rot:0});
    else { const p=MAT_PRESETS[k]; if(p) ffSetMatProp(key,{op:p.op,ro:p.ro,me:p.me}); }
    renderPaintPal();
  }; });
}
function _meRow(k,label,val,mn,mx,st,unit){
  return '<label class="me-r" data-me="'+k+'" data-unit="'+unit+'"><span class="me-l">'+label+'</span>'+
    '<input type="range" min="'+mn+'" max="'+mx+'" step="'+st+'" value="'+val+'">'+
    '<span class="me-v">'+val+unit+'</span></label>';
}
function renderPaintPal(){
  const pal=$('paintpal'); if(!pal) return;
  const cats=[['wall','벽 마감',MATS.WALL],['floor','바닥재',MATS.FLOOR],['ceil','천장재',MATS.CEIL]];
  pal.innerHTML=cats.map(([cat,label,TBL])=>TBL?('<div class="pp-cat">'+label+'</div><div class="pp-grid">'+
    Object.entries(TBL).map(([k,v])=>'<button class="pp-it'+((ST.paint.cat===cat&&ST.paint.code===k)?' on':'')+'" data-cat="'+cat+'" data-code="'+k+'"><span class="pp-chip" style="background:'+(MC3D.WALL_COLORS[k]||MC3D.FLOOR_COLORS[k]||'#B9B2A6')+'"></span>'+(v.name||k)+'</button>').join('')+'</div>'):'').join('');
  pal.querySelectorAll('.pp-it').forEach(b=>{ b.onclick=()=>{ ST.paint={cat:b.dataset.cat,code:b.dataset.code}; renderPaintPal(); if(ST.tool!=='paint') setTool('paint'); }; }); // 스케치업: 재질 고르면 페인트 도구
  ffPaintPalExtra(pal);
  ffMatEditor(pal);
}
function samplePaint(hit){
  const obj=hit.object.userData.obj; if(!obj) return;
  const m=obj.meta||{};
  let c=null;
  if(obj.kind==='mass'&&m.mat){
    const cat=/^IMG_/.test(m.mat)?'img':/^C_/.test(m.mat)?'color':(MATS.FLOOR&&MATS.FLOOR[m.mat])?'floor':(MATS.WALL&&MATS.WALL[m.mat])?'wall':(MATS.CEIL&&MATS.CEIL[m.mat])?'ceil':'floor';
    c={cat,code:cat==='color'?'#'+m.mat.slice(2):m.mat};
  }
  else if(obj.kind==='mass'&&ST.ffOn){ c={cat:'color',code:(m.color||'#B9C6D2').toUpperCase()}; }
  else if(obj.kind==='wall'&&m.material) c={cat:'wall',code:m.material};
  else if(obj.kind==='floor') c={cat:'floor',code:m.floorMaterial||'STRONG'};
  else if(obj.kind==='ceiling'){ const fl=findGroup(obj.floorId,String(obj.id).replace(/_ceil$/,'')); const fm=fl&&fl.userData.obj.meta; c={cat:'ceil',code:(fm&&fm.ceilingMaterial)||'GYPSUM'}; }
  if(!c){ setStatus(statusLive,'추출할 재질이 없습니다'); return; }
  ST.paint=c; renderPaintPal(); openTraySec('mat');
  setStatus(statusLive,'💧 재질 추출: '+c.code+' — 클릭해서 칠하기');
}
function doPaint(hit,e){
  const _po=hit&&hit.object&&hit.object.userData.obj;
  if(ST.ffOn&&!ffEditable(_po)){ setStatus(statusLive,'🧊 밑그림 칠은 평면에서 — 프리폼 매스는 속성의 색으로'); return; }
  if(e&&e.altKey){ samplePaint(hit); return; }
  const obj=hit.object.userData.obj; if(!obj) return;
  const c=ST.paint;
  if(FF_STANDALONE&&obj.kind==='mass'&&obj.floorId==='freeform'&&hit.face&&!ffWhole(obj)&&!(obj.meta&&obj.meta.gid&&ST.editMass!==obj.id)&&!(e&&e.shiftKey)){ ffPaintFaces(hit,e,obj,c); return; }   // 5차: 클릭한 면(선택한 면들) — 객체 전체는 더블클릭으로 잡고
  if(ST.ffOn&&obj.kind==='mass'&&obj.floorId==='freeform'&&(e&&(e.ctrlKey||e.metaKey))&&hit.face){   // 스케치업: 그룹 안의 면 하나만
    const g=hit.object.parent; const lp=g.worldToLocal(hit.point.clone());
    const q=g.getWorldQuaternion(new THREE.Quaternion()).invert(); const ln=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).applyQuaternion(q);
    emitEdit({type:'edit',op:'facemat',kind:'masses',id:obj.id,floorId:'freeform',patch:{p:{x:lp.x/MM,y:lp.z/MM,z:lp.y/MM},n:{x:ln.x,y:ln.z,z:ln.y},mat:c.cat==='color'?('C_'+c.code.replace('#','')):c.code}});
    setStatus(statusLive,'🪣 면 하나에 '+c.code+' (Ctrl 없이 클릭=매스 전체)'); return;
  }
  if(ST.ffOn&&obj.kind==='mass'&&obj.floorId==='freeform'){ ffPaintMass(hit,e,obj,c); return; }   // 프리폼: 색상·이미지·마감 · Shift=같은 재질 전부
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
  const fid=obj?obj.floorId:(ST.ffOn?'freeform':(ST.floorSel!=='all'?ST.floorSel:(ST.floors[0]&&ST.floors[0].id)));
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
function clearGuides(){ ST.guides.forEach(g=>{ if(g.line) scene.remove(g.line); }); (ST.guidePts||[]).forEach(g=>{ if(g.mk) scene.remove(g.mk); }); const fids=[...new Set(ST.guides.map(g=>g.fid).concat((ST.guidePts||[]).map(g=>g.fid)))]; ST.guides=[]; ST.guidePts=[]; fids.forEach(rebuildGuideSnap); invalidate(); setStatus(statusLive,'안내선·안내점 모두 삭제'); }
// 안내점 — 그리기 스냅 대상. 작은 십자 + 발광
function addGuidePoint(fid,p,z0){
  if(!ST.guidePts) ST.guidePts=[];
  const g={fid,x:Math.round(p.x),y:Math.round(p.y)};
  const mk=new THREE.Group(); mk.name='guidept';
  const s=0.02; const pts=[[-s,0,0],[s,0,0],[0,0,-s],[0,0,s]].map(a=>new THREE.Vector3(a[0],0,a[2]));
  mk.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x9A9AFF,depthTest:false})));
  if(FF_STANDALONE){ const gl=glowSprite(0x9A9AFF,8); mk.add(gl); }
  mk.position.set(g.x*MM,z0+0.02,g.y*MM); mk.renderOrder=997; scene.add(mk); g.mk=mk;
  ST.guidePts.push(g); rebuildGuideSnap(fid); invalidate();
  setStatus(statusLive,'┼ 안내점 ('+g.x+', '+g.y+') — 그리기 스냅 · 지우개로 삭제 · 편집▸안내선 모두 삭제');
  return g;
}
function tapeClick(hit,e){
  if(!hit&&ST.ffOn&&e){ const raw=_planePt(e,0); if(!raw) return; hit={point:new THREE.Vector3(raw.x*MM,0,raw.y*MM),object:{userData:{}}}; }   // 빈 바닥에서도 줄자·안내점 (스케치업)
  if(!hit) return;
  const p=_tapeSnap(hit);
  if(!ST.op||ST.op.type!=='tape'){
    const geo=new THREE.BufferGeometry().setFromPoints([p,p.clone()]);
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xD4FF3D,depthTest:false}));
    line.renderOrder=998;
    scene.add(line);
    const u=p.userData||{};
    if(e&&(e.ctrlKey||e.metaKey)&&u.fid&&u.kind!=='edge'&&u.kind!=='midpoint'){   // Ctrl+클릭 = 안내점 (스케치업 Tape 안내점)
      scene.remove(line); line.geometry.dispose(); addGuidePoint(u.fid,u.mm,u.z0); return; }
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
    setStatus(statusLive,'📏 '+d+' mm ('+(d/1000).toFixed(2)+' m)'+(FF_STANDALONE?' — 숫자 입력=모델 전체 크기 조정':''));
    vcbShow('줄자',d,'mm');
    if(FF_STANDALONE) ffTapeResize(d);
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
const CLICK_TOOLS=new Set(['tape','line','circle','arc','offset','dim','line3','rect3','rotrect','arc3','pie','protractor','axesop','followme','shape3','offset3']); // line3/rect3 = 프리폼 면 위 그리기
renderer.domElement.addEventListener('pointerdown',e=>{
  hideCtx();
  drag={x:e.clientX,y:e.clientY,moved:false,id:e.pointerId,button:e.button,touch:e.pointerType==='touch'};
  if(ST.mode==='walk'){ renderer.domElement.setPointerCapture(e.pointerId); return; }
  if(e.button!==0) return;                                   // 우클릭·가운데는 pointerup / OrbitControls
  if(ST.ffOn&&ST.stampComp&&!ST.op){                         // 프리폼 ⑤: 클릭한 자리에 컴포넌트를 찍는다
    const raw=_planePt(e,0);
    if(raw) emitEdit({type:'edit',op:'stamp',floorId:'freeform',
      patch:{compId:ST.stampComp,x:Math.round(raw.x),y:Math.round(raw.y)}});
    drag=null; return;
  }
  if(ST.op){                                                 // 스티키 동작은 다음 클릭 = 확정 (스케치업식)
    const t=ST.op.type;
    if(CLICK_TOOLS.has(t)){}                                  // 클릭 도구는 아래 switch 에서 다음 점
    else if((t==='move'||t==='slide')&&!ST.op.sticky){}       // 버튼 눌러 끄는 중이면 pointerup 에서
    else if(t==='rotate'){ rotateClick(e); drag=null; return; }
    else if(t==='rotate3'){ rotate3Click(e); drag=null; return; }
    else { commitActive(vcbTyped()); drag=null; return; }
  }
  ffContactOnClick();                                        // 붙는 자리에서 눌렀으면 링이 한 번 퍼진다
  // 방향기가 먼저다 — 손잡이를 눌러 자라는 방향(축)을 바꾼다
  if(FF_STANDALONE&&!ST.op){
    const wh=_ffWPHandleAt(e.clientX,e.clientY);
    if(wh){ ffWPPickAxis(wh.userData.wpAxis,wh.userData.wpSign); drag=null; return; }
    if(ST.wpPick){
      const ht=hitAt(e.clientX,e.clientY);
      const p=ht?{x:ht.point.x/MM,y:ht.point.z/MM,z:ht.point.y/MM}:(()=>{const q=_planePt(e,0);return q?{x:q.x,y:q.y,z:0}:null;})();
      ST.wpPick=false; ffWPSetOrigin(p); renderWPBar(); drag=null; return;
    }
  }
  // 2026-09-07 Z: 꼭짓점 그립이 먼저다. 몸통보다 앞에 집어야 지붕을 기울일 수 있다.
  if(FF_STANDALONE&&ST.tool==='scale'&&!ST.op){
    const smk=_gripAt(e.clientX,e.clientY);
    if(smk&&smk.userData.sgrip){ drag.grip=true; beginScaleGrip(smk,e); try{renderer.domElement.setPointerCapture(e.pointerId);}catch(_){} return; }
  }
  if(ST.tool==='select'||ST.tool==='move'||ST.tool==='pushpull'){
    const mk=_gripAt(e.clientX,e.clientY);
    // 잡았다는 표시를 먼저 — 포인터 캡처는 합성 이벤트에서 던질 수 있고,
    //  거기서 멈추면 뗄 때 확정이 안 된다.
    if(mk&&mk.userData.grip){ drag.grip=true; if(FF_STANDALONE&&e.altKey) beginVertXY(mk,e); else beginVertZ(mk,e); try{renderer.domElement.setPointerCapture(e.pointerId);}catch(_){} return; }
  }
  const hit=hitAt(e.clientX,e.clientY);
  const obj=hit&&hit.object.userData.obj;
  const g=hit&&hit.object.parent;
  const movable=obj&&MOVABLE.has(obj.kind)&&!obj.locked&&ffEditable(obj);   // 프리폼: 밑그림은 못 잡는다
  const opening=obj&&(obj.kind==='door'||obj.kind==='window')&&!obj.locked&&obj.meta&&obj.meta.wall&&ffEditable(obj);
  const mod=e.ctrlKey||e.metaKey||e.shiftKey;
  const grab=()=>{
    if(ST.selSet.has(g)) return;
    if(ST.ffOn&&obj&&obj.kind==='mass'&&obj.meta&&obj.meta.gid){ // 그룹 멤버를 잡으면 그룹째 든다
      const gs=_ffGroupOf(obj.meta.gid);
      if(gs.length>1){ selectGroups(gs); return; }
    }
    select(g,{silent:true});
  };
  switch(ST.tool){
    case 'select':
      if(FF_STANDALONE&&obj&&obj.kind==='mass'&&!drag.touch){ drag.box=true; }                 // 5차: 선택 도구는 옮기지 않는다 (끌기=선택 상자) — 이동은 M
      else if(movable&&!mod){ grab(); beginMove(g,obj,false); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(opening&&!mod){ grab(); beginSlide(g,obj); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(obj&&obj.locked&&MOVABLE.has(obj.kind)&&!mod) setStatus(statusLive,'잠금된 객체 — 이동 불가 (우클릭▸잠금 해제)');
      else if(!drag.touch&&!mod&&(!hit||!(movable||opening))) drag.box=true;   // 빈 곳/벽·바닥에서 끌기 = 선택 상자
      else if(!drag.touch&&mod) drag.box=true;
      break;
    case 'move':
      if(FF_STANDALONE&&(!obj||(obj.kind==='mass'&&ffEditable(obj)&&!obj.locked))&&ffMoveEntry(hit,e)){ try{renderer.domElement.setPointerCapture(e.pointerId);}catch(_){} break; }
      if(movable){ grab(); beginMove(g,obj,e.ctrlKey||e.metaKey); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(opening){ grab(); beginSlide(g,obj); renderer.domElement.setPointerCapture(e.pointerId); }
      else if(obj&&obj.locked) setStatus(statusLive,'잠금된 객체');
      break;
    case 'rotate':
      if(movable){ grab(); beginRotate(g,obj,e,hit); }
      else if(obj&&obj.locked) setStatus(statusLive,'잠금된 객체');
      break;
    case 'scale':
      if(movable){ select(g,{silent:true}); beginScale(g,obj,e.clientY,e.clientX); }
      break;
    case 'orbit': case 'pan': case 'zoom': break; // 카메라 도구 — OrbitControls 가 처리
    case 'add': placeGhost(); break;
    case 'line': case 'rect':
      if(ST.ffOn&&ST.op&&(ST.op.type==='line3'||ST.op.type==='rect3')){ ff3Click(e,null,ST.tool); break; }
      if(ST.ffOn&&!ST.op){ const fp=_ffFacePick(e); if(fp){ ff3Click(e,fp,ST.tool); break; } }
      lineClick(e); break;
    case 'circle': case 'polygon': case 'arc': case 'rotrect': case 'arc3': case 'pie':
      if(ST.ffOn&&ST.op&&ST.op.type==='shape3'){ shape3Click(e); break; }
      if(ST.ffOn&&!ST.op){ const fp=_ffFacePick(e); if(fp){ shape3Start(e,fp,ST.tool); break; } }
      ({circle:circleClick,polygon:circleClick,arc:arcClick,rotrect:rotrectClick,arc3:arc3Click,pie:pieClick})[ST.tool](e); break;
    case 'freehand': freehandDown(e); renderer.domElement.setPointerCapture(e.pointerId); break;
    case 'protractor': protractorClick(e); break;
    case 'axes': axesClick(e); break;
    case 'section': sectionClick(hit); break;
    case 'followme': followClick(hit); break;
    case 'text3d': text3dClick(e); break;
    case 'zoomwin': if(!drag.touch) drag.zoomwin=true; break;
    case 'poscam': poscamDown(e); renderer.domElement.setPointerCapture(e.pointerId); break;
    case 'lookaround': case 'walk': break;
    case 'offset': if(ST.op&&ST.op.type==='offset3'){ commitOffset3(vcbTyped()); break; } if(ST.ffOn&&!ST.op&&hit&&offsetFaceClick(hit)) break; offsetClick(e); break;
    case 'pushpull': if(hit) beginPP(hit,e); break;
    case 'paint': if(hit) doPaint(hit,e); break;
    case 'erase': drag.erase=new Set(); if(g&&obj) eraseCollect(g); else if(FF_STANDALONE&&eraseExtras(e)) drag.erase=null; break;
    case 'tape': tapeClick(hit,e); break;
    case 'dim': dimClick(hit); break;
    case 'text': textClick(hit); break;
  }
});
renderer.domElement.addEventListener('pointermove',e=>{
  ST.lastPtr={clientX:e.clientX,clientY:e.clientY};      // 접촉 이름표가 이번 움직임 자리에 붙도록 — 맨 먼저
  if(ST.tool==='add'&&ST.add&&ST.add.ghost){ ghostFollow(e); }
  // 첫 클릭 전에도 스냅 마커 표시 (스케치업 추론 — 호버만으로 끝점/중간점/선에 흡착 예고)
  if((ST.tool==='line'||ST.tool==='rect'||ST.tool==='circle'||ST.tool==='arc'||ST.tool==='polygon'||ST.tool==='rotrect'||ST.tool==='arc3'||ST.tool==='pie'||ST.tool==='protractor'||ST.tool==='axes'||ST.tool==='freehand'||ST.tool==='text3d')&&!ST.op&&ST.mode==='orbit'){
    const fid=_hoverFloorId(e);
    const f=ST.floors.find(x=>x.id===fid), z0=f?f.z0*MM:0;
    const raw=_planePt(e,z0);
    if(raw){
      const sp=snap3(fid,raw,z0);
      // 자유 3D 선: 클릭하면 그 3D 점에서 시작하므로 미리보기도 그 점에 (투영 안내 없이)
      if(ST.tool==='line'&&ffFree3()&&sp.proj&&Math.abs(sp.proj.z-(z0/MM))>1) _ffSnapAt3(sp.kind,sp.proj);
      else showSnap(sp,z0);
    }
  }
  // 스티키 동작 — 버튼을 안 눌러도 따라온다 (클릭-이동-클릭)
  if(ST.op&&(!drag||drag.id!==e.pointerId)){
    const t=ST.op.type;
    if(t==='move'&&ST.op.sticky) applyMoveFromEvent(e);
    else if(t==='slide'&&ST.op.sticky) applySlideFromEvent(e);
    else if(t==='rotate') applyRotate(e,e.shiftKey);
    else if(t==='rotate3') applyRotate3(e,e.shiftKey);
    else if(t==='vxy'&&ST.op.sticky) applyVertXY(e);
    else if(t==='movesel'&&ST.op.sticky) applyMoveSel(e);
    else if(t==='scaleg'&&ST.op.sticky) applyScaleGrip(e);
    else if(t==='shape3') shape3Move(e);
    else if(t==='offset3') offset3Move(e);
    else if(t==='scale') applyScale(e.clientY,e.shiftKey,e.clientX);
    else if(t==='pp') applyPP(e.clientY,e.clientX);
    else if(t==='vz') applyVertZ(e.clientY);
    else if(t==='tape') tapeMove(e);
    else if(t==='line3'||t==='rect3') ff3Move(e);
    else if(t==='line') lineMove(e);
    else if(t==='circle') circleMove(e);
    else if(t==='arc') arcMove(e);
    else if(t==='offset') offsetMove(e);
    else if(t==='rotrect') rotrectMove(e);
    else if(t==='arc3') arc3Move(e);
    else if(t==='pie') pieMove(e);
    else if(t==='protractor') protractorMove(e);
    else if(t==='axesop') axesMove(e);
    else if(t==='dim'){ const hit=hitAt(e.clientX,e.clientY); if(hit){ const p=_tapeSnap(hit); const pos=ST.op.line.geometry.attributes.position; pos.setXYZ(1,p.x,p.y,p.z); pos.needsUpdate=true; vcbShow('치수',Math.round(ST.op.a.distanceTo(p)/MM),'mm'); invalidate(); } }
    return;
  }
  if(!drag||drag.id!==e.pointerId) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5) drag.moved=true;
  if(ST.op&&ST.op.type==='move'&&!ST.op.sticky){ applyMoveFromEvent(e); return; }
  if(ST.op&&ST.op.type==='slide'&&!ST.op.sticky){ applySlideFromEvent(e); return; }
  if(ST.op&&ST.op.type==='vz'){ applyVertZ(e.clientY); return; }   // 2026-09-07 Z
  if(ST.op&&ST.op.type==='vxy'){ applyVertXY(e); return; }
  if(ST.op&&ST.op.type==='scaleg'){ applyScaleGrip(e); return; }
  if(ST.op&&ST.op.type==='movesel'){ applyMoveSel(e); return; }
  if(ST.op&&ST.op.type==='tape'){ tapeMove(e); return; }
  if(ST.op&&ST.op.type==='freehand'){ freehandMove(e); return; }
  if(ST.op&&ST.op.type==='poscam'){ poscamMove(e); return; }
  if(drag.zoomwin&&drag.moved){ showSelBox(drag.x,drag.y,e.clientX,e.clientY); return; }
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
  if(d.grip&&ST.op&&ST.op.type==='vz'){
    if(ST.op.moved){ commitVertZ(vcbTyped()); return; }
    if(FF_STANDALONE){                                 // 5차: 그립을 클릭만 하면 = 그 꼭짓점 선택 (스케치업엔 그립이 없다)
      const op=ST.op; const gi=op.mk&&op.mk.userData.grip; cancelOp();
      if(gi){ const obj=gi.obj; const part={kind:'vert',id:obj.id,p:{x:gi.x,y:gi.y,z:gi.z}}; const mod=!!(e.shiftKey||e.ctrlKey||e.metaKey);
        if(mod){ const i=ST.parts.findIndex(q=>_partEq(q,part)); if(i>=0) ST.parts.splice(i,1); else ST.parts.push(part); } else ST.parts=[part];
        if(gi.g&&!ST.selSet.has(gi.g)) select(gi.g,{silent:true}); buildGrips(); _fsDraw(); renderProps(obj); setStatus(statusLive,_partLabel(part)+' · M 이동(↑=높이) · Del 삭제'); }
      return;
    }
    ST.op.sticky=true; return;                       // 클릭만 했으면 스티키 — 다음 클릭이 확정
  }
  if(d.grip&&ST.op&&(ST.op.type==='vxy'||ST.op.type==='scaleg')){
    if(ST.op.moved){ commitActive(vcbTyped()); return; }
    ST.op.sticky=true; return;
  }
  if(ST.op&&ST.op.type==='movesel'){ if(ST.op.moved){ commitMoveSel(vcbTyped()); return; } ST.op.sticky=true; return; }
  if(ST.op&&ST.op.type==='freehand'){ freehandEnd(); return; }
  if(ST.op&&ST.op.type==='poscam'){ poscamEnd(); return; }
  if(d.zoomwin){ hideSelBox(); if(d.moved) zoomWindow(d.x,d.y,e.clientX,e.clientY); return; }
  if(d.box){ hideSelBox(); if(d.moved){ boxSelect(d.x,d.y,e.clientX,e.clientY,e); return; } }
  if(d.erase){ eraseFinish(e.shiftKey); return; }
  if(wasClick&&!ST.op){ if(FF_STANDALONE) ffFaceInfoAt(hitAt(e.clientX,e.clientY)); pick(e.clientX,e.clientY,e); }
});
renderer.domElement.addEventListener('pointercancel',()=>{ if(ST.op&&!CLICK_TOOLS.has(ST.op.type)&&ST.op.type!=='rotate') cancelOp(); hideSelBox(); drag=null; });
renderer.domElement.addEventListener('click',e=>{ // 세 번 클릭 = 그 층의 모든 객체 (스케치업 triple-click = 연결된 전체)
  if(e.detail>=3&&ST.tool==='select'&&!ST.op){ const hit=hitAt(e.clientX,e.clientY); const o=hit&&hit.object.userData.obj; if(o&&FF_STANDALONE&&o.kind==='mass'){ ffSelectWhole(hit.object.parent,true); return; } if(o){ selectGroups(visibleGroups(o.floorId)); setStatus(statusLive,'층 전체 선택 ('+ST.selSet.size+'개)'); } }
});
renderer.domElement.addEventListener('dblclick',e=>{
  if(ST.op&&CLICK_TOOLS.has(ST.op.type)){ cancelOp(); setStatus(statusLive,'╱ 그리기 끝'); return; } // 스케치업: 더블클릭=사슬 끝
  // 2026-09-07 Z: 그립 더블클릭 = 직전에 준 높이 그대로 (스케치업 밀기끌기 반복과 같은 손버릇)
  const gmk=_gripAt(e.clientX,e.clientY);
  if(gmk&&typeof ST.lastZ==='number'){
    const gi=gmk.userData.grip;
    if(_floorAwake(gi.obj.floorId)){
      _vzSend(gi.obj,[gi.vi],ST.lastZ);
      setStatus(statusLive,'⇕ 꼭짓점 z '+ST.lastZ+'mm (반복)'); return;
    }
  }
  const hit=hitAt(e.clientX,e.clientY);
  if(!hit) return;
  const obj=hit.object.userData.obj, g=hit.object.parent;
  // 스케치업: 밀기끌기 도구에서 더블클릭 = 직전 값 반복
  if(ST.tool==='pushpull'&&typeof ST.lastPP==='number'&&ST.lastPP!==0){
    if(obj&&obj.kind==='wall'&&!obj.locked){ sendEdit('set',obj,{height_mm:Math.max(300,obj.meta.H+ST.lastPP)}); setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm'); return; }
    if(obj&&obj.kind==='ceiling'){ const base=Math.round((obj.prims&&obj.prims[0]&&obj.prims[0].z)||2400); sendEdit('set',{kind:'floor',id:String(obj.id).replace(/_ceil$/,''),floorId:obj.floorId},{ceilingHeight_mm:Math.max(300,base+ST.lastPP)}); setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm'); return; }
    if(ST.ffOn&&obj&&obj.kind==='mass'&&!obj.locked&&ffEditable(obj)&&hit.face){ const loc=_localOfHit(g,hit); if(emitEdit({type:'edit',op:'pushface',kind:'masses',id:obj.id,floorId:'freeform',patch:{p:loc.p,n:loc.n,d:ST.lastPP}})) setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm (면 밀기끌기)'); return; }
    if(obj&&obj.kind==='mass'&&!obj.locked){ sendEdit('set',obj,{h_mm:Math.max(10,Math.round((obj.meta&&obj.meta.h_mm)||0)+ST.lastPP)}); setStatus(statusLive,'⇕ 반복 '+ST.lastPP+'mm'); return; } // 2026-09-04
    if(obj&&obj.kind==='sketchFace'&&ST.lastPP>=10&&canEdit()){ emitEdit({type:'edit',op:'extrude',floorId:obj.floorId,patch:{id:obj.id,z:ST.lastPP,as:'solid'}}); setStatus(statusLive,'⬆ 면 → 매스 Z='+ST.lastPP+' (반복)'); return; }
  }
  if(FF_STANDALONE&&ST.tool==='select'&&obj&&obj.kind==='mass'&&ffEditable(obj)&&!obj.locked){   // 5차: 더블클릭 = 객체 전체 · gid 그룹은 안으로
    if(obj.meta&&obj.meta.gid&&ST.editMass!==obj.id){ ffEnterEdit(obj.id); ffPickInside(hit,e); return; }
    ffSelectWhole(g,false); return;
  }
  if(ST.ffOn&&obj&&obj.kind==='mass'&&obj.meta&&obj.meta.gid&&ST.tool==='select'){
    select(g);                                                  // 프리폼 ⑤: 더블클릭 = 그룹 안으로 (이 하나만)
    setStatus(statusLive,'그룹 안 — 이 하나만 잡았습니다 (빈 곳 클릭 후 다시 클릭=그룹 전체)');
    return;
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
  const _eo=g&&g.userData.obj;
  if(_eo&&!ffEditable(_eo)) return;                          // 프리폼: 밑그림은 지우개도 비켜 간다
  if(!drag||!drag.erase||!g||!g.userData.obj) return;
  const o=g.userData.obj;
  if(!(MOVABLE.has(o.kind)||o.kind==='door'||o.kind==='window'||SKETCH_KINDS.has(o.kind))){ if(!drag.erase.size) setStatus(statusLive,'벽·바닥은 평면에서 지우세요 (Shift+지우개 = 숨기기)'); if(!drag.erase.size&&drag&&!drag.moved) drag.hideOnly=g; return; }
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
  if(FF_STANDALONE) ((sel&&ST.parts.some(p=>p.id===sel.id))?ffFaceCtxItems(e):ffCtxItems(e,sel,n)).forEach(it=>items.push(it));
  else if(sel){
    items.push(['info','개체 정보',()=>openTraySec('info')]);
    items.push(['-']);
    if(MOVABLE.has(sel.kind)||sel.kind==='door'||sel.kind==='window'||SKETCH_KINDS.has(sel.kind)) items.push(['del','지우기'+(n>1?' ('+n+'개)':'')+'\tDel',deleteSelected3D]);
    if(sel.kind==='sketchFace') items.push(['ext','면 → 매스 (Z 입력)',()=>{ if(!_floorAwake(sel.floorId)){ _sleepNote('면은 올릴 수 없습니다'); return; } const z=window.prompt('Z 높이(mm)',String(ST.lastPP>=10?ST.lastPP:2400)); const v=parseLen(z); if(v>=10&&canEdit()) emitEdit({type:'edit',op:'extrude',floorId:sel.floorId,patch:{id:sel.id,z:Math.round(v),as:'solid'}}); }]);
    if(sel.kind==='mass'){ items.push(['tosp','매스 → 공간',()=>massConvert3D(sel,'space')]); items.push(['towl','매스 → 벽',()=>massConvert3D(sel,'wall')]); }
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
// 매스를 아래 방의 천장으로 (혹은 해제) — 어느 방인지는 평면이 판단한다(massOverSpace)
function ceilMass3D(o,off){
  if(!chan||!o||o.kind!=='mass') return;
  if(!_floorAwake(o.floorId)){ _sleepNote('천장 지정은 할 수 없습니다'); return; }
  emitEdit({type:'edit',op:'ceilmass',floorId:o.floorId,patch:{id:o.id,off:!!off}});
  setStatus(statusLive,off?'평천장으로 되돌림 (평면 반영)':'▣ 아래 방의 천장으로 — 천장 물량이 경사 실면적으로 (평면 반영)');
}
function massConvert3D(o,as){ if(!chan||!o||o.kind!=='mass') return; if(!_floorAwake(o.floorId)){ _sleepNote('매스는 바꿀 수 없습니다'); return; } emitEdit({type:'edit',op:'massconvert',floorId:o.floorId,patch:{id:o.id,as}}); setStatus(statusLive,'매스 → '+(as==='wall'?'벽':'공간')+' 전환 (평면 반영)'); }
function deleteGroups(gs){
  const ok=gs.filter(g=>{ const o=g.userData.obj; return o&&(MOVABLE.has(o.kind)||o.kind==='door'||o.kind==='window'||SKETCH_KINDS.has(o.kind))&&!o.locked; });
  if(!ok.length){ setStatus(statusLive,'벽·바닥은 평면에서 지우세요'); return; }
  const ops=ok.map(g=>{ const o=g.userData.obj; return SKETCH_KINDS.has(o.kind)?{op:'sketchdel',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId}:{op:'delete',kind:KINDMAP[o.kind],id:o.id,floorId:o.floorId}; }); // 2026-09-04 스케치는 sketchdel
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
  const objs=_selObjs(o=>MOVABLE.has(o.kind)&&o.kind!=='pillar'&&o.kind!=='mass'); // 매스 복제는 Ctrl+끌기
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
  if(FF_STANDALONE&&obj&&ST.parts.length&&ST.parts.some(p=>p.id===obj.id)){ ffFaceProps(obj); return; }
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
    if(ST.ffOn){
      const fms=multi.filter(o=>o.kind==='mass'&&o.floorId==='freeform');
      if(fms.length>=2) html+=`<div class="p-btns"><button class="btn" data-a="grp" title="여럿을 한 몸으로 — 클릭·이동·복사·삭제가 통째로 (스케치업 그룹)">⛓ 그룹 묶기 (${fms.length})</button></div>`;
    }
    html+=`<div class="p-note">끌면 함께 이동(Ctrl=복사) · Q 회전은 대표 중심으로 공전 · B 재질은 한 번에</div>`;
    props.innerHTML=html; props.style.display='block';
    props.querySelectorAll('[data-a]').forEach(el=>{ el.addEventListener('click',()=>{ const a=el.dataset.a;
      if(a==='rotl') rotateSelected(-15); else if(a==='rotr') rotateSelected(15); else if(a==='del') deleteSelected3D();
      else if(a==='grp'){ const ids=_selObjs(o=>o.kind==='mass'&&o.floorId==='freeform').map(o=>o.id);
        emitEdit({type:'edit',op:'group',floorId:'freeform',patch:{ids}}); }
      else if(a==='lock') lockSelected(true); else if(a==='unlock') lockSelected(false); else if(a==='copy') copySel();
      else if(a==='hide') hideSelected(); else if(a==='zoom'&&ST.selected) zoomTo(ST.selected); }); });
    return;
  }
  let html=`<h4>${obj.name||obj.kind}</h4><div class="p-sub">${obj.floorName||''}${obj.floorName?' · ':''}${m.type||obj.kind}</div>`;
  if(obj.locked){ html+='<div class="p-lock">🔒 잠금된 객체 — 보기만 가능</div><div class="p-btns"><button class="btn" data-a="unlock">🔓 잠금 해제</button></div>'; props.innerHTML=html; props.style.display='block';
    const ub=props.querySelector('[data-a="unlock"]'); if(ub) ub.onclick=()=>lockSelected(false); return; }
  if(obj.kind==='mass'){                                     // 2026-09-04 매스 (면 + Z) — 스케치업 그룹처럼 자유
    html+=`<div class="p-row"><label>이름</label><input type="text" data-f="name" value="${(obj.name||'').replace(/"/g,'&quot;')}"></div>`;
    html+=`<div class="p-row"><label>위치</label><span style="font-size:12px">${Math.round(obj.x)}, ${Math.round(obj.y)} mm · ${Math.round(obj.rot||0)}°</span></div>`;
    html+=`<div class="p-row"><label>높이(Z)</label><input type="number" step="50" min="10" data-f="h_mm" value="${Math.round(m.h_mm||0)}"> <span style="font-size:11px">mm</span></div>`;
    html+=`<div class="p-row"><label>띄움</label><input type="number" step="10" min="0" data-f="elev_mm" value="${obj.elev||0}"> <span style="font-size:11px">mm</span></div>`;
    // 2026-09-07 Z축: 기울어진 매스는 밑넓이×높이가 아니라 진짜 물량을 보여 준다
    if(m.solid&&m.qty){
      html+=`<div class="p-row"><label>면적</label><span style="font-size:12px">바닥 ${m.qty.floor} ㎡ · 천장 ${m.qty.ceilAll} ㎡ <b style="color:#7FA8D4">(경사 ${m.qty.slope} ㎡)</b></span></div>`;
      html+=`<div class="p-row"><label>기울기</label><span style="font-size:12px">∠${m.maxTilt}° · 물매 ${Math.round(Math.tan((m.maxTilt||0)*Math.PI/180)*10)}/10</span></div>`;
    }else
    html+=`<div class="p-row"><label>면적</label><span style="font-size:12px">${((m.area||0)/1e6).toFixed(2)} ㎡ · 부피 ${((m.area||0)*(m.h_mm||0)/1e9).toFixed(2)} ㎥</span></div>`;
    html+=`<div class="p-row"><label>색</label><input type="color" data-f="color" value="${m.color||'#B9C6D2'}"></div>`;
    if(ST.ffOn){ const mm0=FF&&FF.free.masses.find(x=>x&&x.id===obj.id); if(mm0) html+=`<div class="p-row"><label>부피</label><span style="font-size:12px">${massVolume(mm0,ffCtx()).toFixed(3)} ㎥${mm0.solidVerts?' · 다면체 '+mm0.solidFaces.length+'면':' · 각기둥'}</span></div>`;
      html+=`<div class="p-row"><label>그림자</label><select data-f="shadow"><option value="both"${!m.shadow||m.shadow==='both'?' selected':''}>드리움+받음</option><option value="cast"${m.shadow==='cast'?' selected':''}>드리움만</option><option value="receive"${m.shadow==='receive'?' selected':''}>받음만</option><option value="none"${m.shadow==='none'?' selected':''}>없음</option></select></div>`; }
    if(ST.ffOn&&ST.faceInfo){ const fi=ST.faceInfo; html+=`<div class="p-row"><label>클릭한 면</label><span style="font-size:11.5px">${({floor:'바닥',ceil:'윗면',wall:'벽면',slope:'경사면'})[fi.role]||fi.role} · <b>${fi.area.toFixed(2)} ㎡</b> · ${fi.nv}각${fi.tilt?' · ∠'+Math.round(fi.tilt)+'°':''}${fi.mat?' · 🪣 '+fi.mat:''}</span></div>`; }
    if(ST.ffOn) html+=`<div class="p-row"><label>태그</label><select data-f="tag"><option value="">매스 (기본)</option>${ffTagNames().filter(t=>t!=='매스').map(t=>`<option value="${t}"${m.tag===t?' selected':''}>${t}</option>`).join('')}</select></div>`;
    html+=`<div class="p-btns"><button class="btn" data-a="rotl" title="반시계 15° (Shift+R)">↺ 15°</button><button class="btn" data-a="rotr" title="시계 15° (R)">↻ 15°</button><button class="btn" data-a="lock">🔒 잠금</button></div>`;
    // 2026-09-07 Z축 4층: 기울어진 매스는 방의 천장으로 삼을 수 있다 (천장 물량이 경사 실면적으로)
    if(m.solid&&!ST.ffOn){
      html+=m.ceilOf
        ? `<div class="p-row"><label>천장</label><span style="font-size:12px;color:#C9A961">▣ <b>${m.ceilOf}</b> 의 천장</span></div>
           <div class="p-btns"><button class="btn" data-a="ceiloff">평천장으로 되돌리기</button></div>`
        : `<div class="p-btns"><button class="btn" data-a="ceilon" title="이 매스 아래 방의 천장으로 삼습니다 — 천장 ㎡ 가 경사 실면적이 되어 견적에 반영됩니다">▣ 아래 방의 천장으로</button></div>`;
    }
    if(ST.ffOn&&m.mat){                                 // 프리폼 재질 (B 로 칠함)
      html+=`<div class="p-row"><label>재질</label><span style="font-size:11px">🪣 ${m.mat}
        <button class="btn" data-a="matclr" style="padding:1px 8px;margin-left:6px">지움</button></span></div>`;
    }
    if(ST.ffOn&&m.gid){                                 // 프리폼 ⑤: 그룹·컴포넌트
      html+=`<div class="p-row"><label>그룹</label><span style="font-size:11px;color:#C9A961">⛓ ${_ffGroupOf(m.gid).length}개가 한 몸</span></div>`;
      html+=`<div class="p-btns"><button class="btn" data-a="ungrp">그룹 풀기</button>
        <button class="btn" data-a="csave" title="이 그룹을 이름 붙여 문서에 저장 — 구성요소 칸에서 어디든 다시 찍습니다">💾 컴포넌트로 저장…</button></div>`;
    }
    if(ST.ffOn){                                        // 프리폼 ④: Follow Me — 몰딩·걸레받이
      html+=`<div class="p-row" style="border-top:1px solid rgba(255,255,255,0.08);margin-top:6px;padding-top:8px"><label>몰딩</label>
        <span style="font-size:11px">단면 <input type="number" data-f="_fmw" value="${ST.fmW||10}" min="3" step="1" style="width:44px"> ×
        <input type="number" data-f="_fmh" value="${ST.fmH||80}" min="3" step="5" style="width:48px"> mm</span></div>`;
      html+=`<div class="p-btns"><button class="btn" data-a="fmb" title="바닥 둘레를 따라 걸레받이를 두릅니다 (모서리는 마이터)">⌐ 걸레받이 (바닥 둘레)</button>
        <button class="btn" data-a="fmt" title="위 둘레를 따라 천장 몰딩(크라운 단면)을 두릅니다">⌐ 천장 몰딩 (위 둘레)</button></div>`;
    }
    html+=ST.ffOn
      ?`<div class="p-btns"><button class="btn danger" data-a="del">🗑 삭제</button></div>`
      :`<div class="p-btns"><button class="btn" data-a="tosp">▣ 공간으로</button><button class="btn" data-a="towl">▬ 벽으로</button><button class="btn danger" data-a="del">🗑 삭제</button></div>`;
    html+=`<div class="p-note"><b style="color:#7FA8D4">파란 점(꼭짓점)을 끌면 그 점만 위아래로</b> — Shift=모서리 두 점 · Ctrl=천장고에 매달기(CH-300) · 숫자=정확한 높이 · 더블클릭=직전 높이 반복.<br>끌기=이동 · ↑=띄우기 · Q 회전 · P 윗면=높이 · Ctrl+끌기=복제 — 필요할 때 공간(바닥·천장·벽)이나 벽으로 바꿉니다.</div>`;
  }else if(obj.kind==='sketchFace'){
    html+=`<div class="p-row"><label>면적</label><span style="font-size:12px">${((m.area||0)/1e6).toFixed(2)} ㎡ · 꼭짓점 ${(m.poly||[]).length}</span></div>`;
    html+=`<div class="p-row"><label>Z 높이</label><input type="number" step="50" min="10" data-f="_z" value="${ST.lastPP>=10?ST.lastPP:(ST.defZ||2400)}"> <span style="font-size:11px">mm</span></div>`;
    html+=`<div class="p-row"><label>만들 것</label><select data-f="_as"><option value="solid">매스 (자유)</option><option value="space">공간 (바닥·천장·벽)</option><option value="wall">벽</option><option value="auto">자동 판별</option></select></div>`;
    html+=`<div class="p-btns"><button class="btn" data-a="ext">⬆ 객체 생성</button><button class="btn danger" data-a="del">🗑 삭제</button></div>`;
    html+=`<div class="p-note">P(밀기끌기)로 위로 끌어도 됩니다 — 점·선·면은 x,y 만, Z 를 주는 순간 객체가 됩니다.</div>`;
  }else if(obj.kind==='sketchEdge'){
    html+=`<div class="p-row"><label>길이</label><span style="font-size:12px">${Math.round(m.L||0)} mm</span></div>`;
    html+=`<div class="p-row"><label>끝점</label><span style="font-size:12px">(${Math.round(m.x1)}, ${Math.round(m.y1)}) → (${Math.round(m.x2)}, ${Math.round(m.y2)})</span></div>`;
    html+=`<div class="p-btns"><button class="btn danger" data-a="del">🗑 삭제</button></div>`;
    html+=`<div class="p-note">선이 고리를 이루면 면이 됩니다 · 선을 지우면 그 면도 풀립니다.</div>`;
  }else if(obj.kind==='sketchPt'){
    html+=`<div class="p-row"><label>좌표</label><span style="font-size:12px">${Math.round(obj.x)}, ${Math.round(obj.y)} mm</span></div>`;
    html+=`<div class="p-btns"><button class="btn danger" data-a="del">🗑 삭제</button></div>`;
  }else if(MOVABLE.has(obj.kind)){
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
      if(f==='_z'||f==='_as') return;                                   // 스케치 면 Z·종류는 [객체 생성] 버튼에서
      if(f==='name'||f==='color'||f==='tag'||f==='shadow'){ sendEdit('set',obj,{[f]:el.value}); setStatus(statusLive,'수정 → 평면 반영'); return; } // 2026-09-04 매스 문자열 속성
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
      else if(a==='matclr'){ emitEdit({type:'edit',op:'set',kind:'masses',id:obj.id,floorId:'freeform',patch:{mat:null}}); }
      else if(a==='ungrp'){ emitEdit({type:'edit',op:'ungroup',floorId:'freeform',patch:{gid:obj.meta.gid}}); }
      else if(a==='csave'){
        const nm=window.prompt('컴포넌트 이름','수납장');
        if(nm) emitEdit({type:'edit',op:'compsave',floorId:'freeform',patch:{gid:obj.meta.gid,name:nm}});
      }
      else if(a==='fmb'||a==='fmt'){                      // 프리폼 ④: Follow Me
        const wI=props.querySelector('[data-f="_fmw"]'),hI=props.querySelector('[data-f="_fmh"]');
        const w=wI?parseInt(wI.value)||10:10, h=hI?parseInt(hI.value)||80:80;
        ST.fmW=w; ST.fmH=h;                               // 다음에도 같은 단면으로
        emitEdit({type:'edit',op:'followme',floorId:'freeform',
          patch:{massId:obj.id,at:a==='fmt'?'top':'bottom',
            profile:{kind:a==='fmt'?'crown':'rect',w,h}}});
      }
      else if(a==='ceilon') ceilMass3D(obj,false);        // 2026-09-07 Z축 4층
      else if(a==='ceiloff') ceilMass3D(obj,true);
      else if(a==='tosp') massConvert3D(obj,'space');
      else if(a==='towl') massConvert3D(obj,'wall');
      else if(a==='ext'){ const zi=props.querySelector('[data-f="_z"]'), ai=props.querySelector('[data-f="_as"]'); const z=Math.round(Number(zi&&zi.value)); // 2026-09-04 면 → 객체
        if(!(z>=10)){ setStatus(statusLive,'Z 높이 10mm+'); return; }
        if(!_floorAwake(obj.floorId)){ _sleepNote('면은 올릴 수 없습니다'); return; }
        if(canEdit()){ emitEdit({type:'edit',op:'extrude',floorId:obj.floorId,patch:{id:obj.id,z,as:(ai&&ai.value)||'solid'}}); ST.lastPP=z; setStatus(statusLive,'⬆ 면 → 객체 Z='+z); } }
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
    if(canEdit()) emitEdit({type:'edit',op:(k==='y'||e.shiftKey)?'redo':'undo'});
    e.preventDefault(); return;
  }
  if(ctrl&&k==='s'){ if(e.shiftKey) screenshot(); else saveFeedback(); e.preventDefault(); return; } // Ctrl+S = 저장(평면) · Ctrl+Shift+S = PNG
  if(ctrl&&k==='a'){ selectAll(); e.preventDefault(); return; }
  if(ctrl&&k==='t'){ select(null); e.preventDefault(); return; }                       // 스케치업 Ctrl+T = 선택 없음
  if(ctrl&&k==='n'&&FF_STANDALONE){ if(window.confirm('새로 만들기 — 지금 모델을 비울까요? (파일로 저장하지 않은 것은 사라집니다)')) ffNew(); e.preventDefault(); return; }
  if(ctrl&&k==='o'&&FF_STANDALONE){ ffImportFile(); e.preventDefault(); return; }
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
    { const cm=$('ffcloud'); if(cm&&cm.style.display==='flex'){ cm.style.display='none'; e.preventDefault(); return; } }
    if(FF_STANDALONE&&ST.wpPick){ ST.wpPick=false; renderWPBar(); setStatus(statusLive,'원점 지정 취소'); e.preventDefault(); return; }
    hideCtx();
    if(ST.anim){ scenePlay(false); return; }
    const km=$('keysmodal');
    if(km&&km.style.display==='flex'){ showKeys(false); return; }
    if(document.querySelector('.menu.open')){ closeMenus(); return; }
    if(ST.lastCommit){ vcbPostOff(); }
    if(ST.stampComp){ ST.stampComp=null; renderAddPal(); setStatus(statusLive,'스탬프 끝'); return; }   // 프리폼 ⑤
    if(ST.op) cancelOp();
    else if(FF_STANDALONE&&ST.parts.length){ ST.parts=[]; _fsDraw(); renderProps(ST.selected&&ST.selected.userData.obj,ST.selSet.size>1?{multi:_selObjs()}:null); }
    else if(FF_STANDALONE&&ST.editMass){ ffExitEdit(); }
    else if(ST.tool==='add') setTool('select'); else select(null); return;
  }
  if(ST.mode==='walk'&&FF_STANDALONE&&(k===' '||k==='escape')&&!ST.op){ setTool('select'); e.preventDefault(); return; }   // 걷기에서 Space/Esc = 조감·선택
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
      if(k==='g'){ if(FF_STANDALONE){ if(e.shiftKey) ffMakeComp(); else ffMakeGroup(); e.preventDefault(); return; } setTool('add'); return; }           // 스케치업 G=그룹/컴포넌트 · 연동 뷰=배치
      if(k==='o'){ setTool('orbit'); return; }         // 스케치업 O=궤도
      if(k==='h'&&!e.shiftKey){ setTool('pan'); return; } // 스케치업 H=팬
      if(k==='z'&&!e.shiftKey){ setTool('zoom'); return; } // 스케치업 Z=줌
      if(k==='x'){ setXray(!ST.xray); return; }
      if(k==='w'&&FF_STANDALONE){ if(e.shiftKey) ffWPFlip(); else ffWPCycle(); e.preventDefault(); return; }   // 작업 평면 순환 · Shift=방향 뒤집기
      if(k==='k'&&FF_STANDALONE){ setEdges(!ST.edges); return; }   // 스케치업 K = 모서리
    }
    const op=ST.op, lockable=op&&(op.type==='move'||op.type==='line'||op.type==='rect'||op.type==='movesel');
    // 프리폼: 면 위 선(line3)의 축 고정 — →=가로(u·빨강) · ↑=세로(v·파랑) · ←/↓=해제
    if(ST.ffOn&&op&&op.type==='line3'){
      if(k==='arrowup'){ op.axis=op.axis==='v'?null:'v'; _ff3Ghost(op);
        setStatus(statusLive,op.axis?'축 고정: '+(Math.abs(op.fr.n.z)<0.95?'파랑(위)':'세로')+' — 숫자=정확한 길이':'축 고정 해제');
        e.preventDefault(); return; }
      if(k==='arrowright'){ op.axis=op.axis==='u'?null:'u'; _ff3Ghost(op);
        setStatus(statusLive,op.axis?'축 고정: 가로(빨강) — 숫자=정확한 길이':'축 고정 해제');
        e.preventDefault(); return; }
      if(k==='arrowleft'||k==='arrowdown'){ op.axis=null; _ff3Ghost(op);
        setStatus(statusLive,'축 고정 해제'); e.preventDefault(); return; }
    }
    // 프리폼: 땅에서 선을 긋다 ↑ = 파랑 축 — 그 점을 지나는, 카메라를 바라보는 세로 종이로 올라탄다.
    //  세로 선 하나만으로는 평면이 정해지지 않아서, 스케치업이 그러듯 보는 방향이 종이를 정한다.
    if(k==='arrowup'&&ST.ffOn&&op&&op.type==='line'&&!op.rect){
      ffBlueHop(op,false);
      e.preventDefault(); return;
    }
    if(k==='arrowright'&&lockable){ ST.axisLock=(ST.axisLock==='x')?null:'x'; setStatus(statusLive,'축 고정: '+(ST.axisLock==='x'?'가로(X·빨강)':'해제')); e.preventDefault(); return; }
    if(k==='arrowleft'&&lockable){ ST.axisLock=(ST.axisLock==='y')?null:'y'; setStatus(statusLive,'축 고정: '+(ST.axisLock==='y'?'세로(Y·초록)':'해제')); e.preventDefault(); return; }
    if(k==='arrowup'&&op&&op.type==='movesel'){ ST.axisLock=(ST.axisLock==='z')?null:'z'; setStatus(statusLive,'축 고정: '+(ST.axisLock==='z'?'높이(Z·파랑)':'해제')); e.preventDefault(); return; }
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
  if(k==='7') setView('back'); if(k==='8') setView('left'); if(k==='9') setView(FF_STANDALONE?'bottom':'right');
  if(k==='n'&&!ctrl) setNight(!ST.night); // (L 은 스케치업 Line 도구로 — 조명 토글은 💡 버튼)
  if(k==='c'&&e.shiftKey) toggleCeil();  // Shift+C = 천장 (C 는 원 도구)
  if(e.shiftKey&&k==='z') fitView(true);  // Shift+Z = 전체 보기 (스케치업 Zoom Extents)
  if(e.shiftKey&&k==='h') hideSelected(); // Shift+H = 선택 숨기기
  if((k==='delete'||k==='backspace')&&FF_STANDALONE&&ST.parts.length){ ffDeleteSel(); e.preventDefault(); return; }
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
  drawFrame();
  download(fileStem()+'_3d.png',renderer.domElement.toDataURL('image/png'));
}
function saveFeedback(){ // Ctrl+S = 평면(미니캐드) 저장 — 3D 는 평면의 뷰이므로 저장은 평면이 한다
  if(ST.ffOn){ if(FF_STANDALONE){ ffAutosave(); ffExportFile(); return; } ffAutosave(); setStatus(true,'🧊 프리폼 저장(브라우저 자동) — 파일로는 파일 ▸ 프리폼 파일 저장'); return; }
  if(FF_STANDALONE) return;                     // 단독 — 평면 저장 요청을 보낼 곳이 없다
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
  if(ST.ffOn){                                              // 프리폼: 평면 갱신은 받아만 둔다
    if(FF_STANDALONE) return false;                         // 단독 — 받지도, 알리지도 않는다
    if(FF){ FF.planLatest=payload; FF.planDirty=true; }
    setStatus(true,'🧊 프리폼 · ⚠ 평면이 바뀌었습니다 — 파일 ▸ 평면 다시 불러오기 (밑그림만 갱신·자유 층 유지)');
    return false;
  }
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
const MF_PROTO=8; // 미니캐드(ui.js MC_PROTO)와 짝 — 어긋나면 새로고침 안내
                  //  6 = 점·선·면 스케치 + 매스 (2026-09-04)
                  //  7 = 꼭짓점 높이 setz·settop·zref (2026-09-07 Z축)
                  //  8 = 매스를 방의 천장으로 ceilmass (2026-09-07 Z축 4층)
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
window.addEventListener('storage',e=>{
  if(FF_STANDALONE) return;                    // 단독 프리폼 — 평면을 받지 않는다
  if(e.key==='minicad.3d.doc'&&e.newValue){ try{acceptDoc(JSON.parse(e.newValue),'live');}catch(_){} }
});

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
  arr.push({name,p:camera.position.toArray(),t:orbit.target.toArray(),mode:ST.mode,ortho:ST.ortho,night:ST.night,sky:ST.sky,ceil:ST.ceil[ST.mode],xray:ST.xray,sunT:ST.sunT,floorSel:ST.floorSel,walk:ST.mode==='walk'?{yaw:ST.walk.yaw,pitch:ST.walk.pitch}:null});
  scenesSave(arr); renderScenes(); setStatus(statusLive,'장면 저장: '+name);
}
function sceneGo(i){
  const sc=scenesLoad()[i]; if(!sc) return;
  if(sc.floorSel&&sc.floorSel!==ST.floorSel&&(sc.floorSel==='all'||ST.floors.some(f=>f.id===sc.floorSel))){ ST.floorSel=sc.floorSel; renderFloorButtons(); refreshVisibility(); select(null); }
  if(ST.mode!==sc.mode) setMode(sc.mode);
  if(ST.mode==='orbit'){ if(!!sc.ortho!==ST.ortho) setOrtho(!!sc.ortho); camera.position.fromArray(sc.p); orbit.target.fromArray(sc.t); if(ST.ortho) _orthoFit(); orbit.update(); camPush(); }
  else { camera.position.fromArray(sc.p); if(sc.walk){ ST.walk.yaw=sc.walk.yaw; ST.walk.pitch=sc.walk.pitch; } applyWalkCamera(); }
  if(!!sc.night!==ST.night) setNight(!!sc.night);
  if(sc.sky&&sc.sky!==ST.sky) setSky(sc.sky);
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
buildSky(); applySkyColors();   // 2026-09-07: 하늘·바닥 배경 (스케치업식)
$('b-night').onclick=()=>setNight(!ST.night);
$('b-ceil').onclick=()=>{ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshVisibility(); $('b-ceil').classList.toggle('on',ST.ceil[ST.mode]); };
$('b-label').onclick=()=>{ ST.labels=!ST.labels; refreshVisibility(); $('b-label').classList.toggle('on',ST.labels); };
$('b-shadow').onclick=()=>setShadows(!ST.shadows);
$('b-shot').onclick=screenshot;
$('b-glb').onclick=exportGLB;
$('b-json').onclick=exportJSON;
$('b-ff').onclick=()=>{ ST.ffOn?ffExit():ffEnter(); };   // 2026-09-07 프리폼
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
  set('st-sky',ST.sky!=='plain');
  const sb=$('st-sky'); if(sb&&!ffSkyIcon()) sb.textContent=(ST.sky==='image'?'🖼 배경 그림':ST.sky==='sky'?'🌄 하늘·바닥':'🌑 단색');
  set('st-label',ST.labels); set('st-shadow',ST.shadows); set('st-axes',ST.axes);
  set('st-xray',ST.xray); set('st-ortho',ST.ortho);
  const mi=(id,on)=>{ const el=$(id); if(el){ el.classList.toggle('chk',!!on); el.classList.toggle('unchk',!on); } };
  mi('mi-light',ST.lightsOn); mi('mi-night',ST.night); mi('mi-ceil',ST.ceil[ST.mode]);
  mi('mi-sky',ST.sky!=='plain');
  mi('mi-ff',ST.ffOn);
  mi('mi-label',ST.labels); mi('mi-shadow',ST.shadows); mi('mi-axes',ST.axes);
  mi('mi-xray',ST.xray); mi('mi-ortho',ST.ortho);
  mi('mi-tray',!document.body.classList.contains('tray-off')); mi('mi-tray2',!document.body.classList.contains('tray-off'));
  mi('mi-hiddengeom',ST.hiddenGeom); mi('mi-sections',ST.sectionsOn); mi('mi-sectioncut',ST.sectionCut); mi('mi-guides',ST.guidesOn); mi('mi-fog',ST.fogOn); mi('mi-edges',ST.edges);
  ['wire','hidden','shaded','textured','mono'].forEach(s=>mi('mi-fs-'+s,ST.faceStyle===s));
  mi('mi-persp',!ST.ortho); mi('mi-toolbar',!document.body.classList.contains('tools-off')); mi('mi-isolate',!!ST.isolate);
  const sun=$('st-sun'); if(sun&&document.activeElement!==sun) sun.value=Math.round(ST.sunT*100);
}
function toggleCeil(){ ST.ceil[ST.mode]=!ST.ceil[ST.mode]; refreshVisibility(); const b=$('b-ceil'); if(b) b.classList.toggle('on',ST.ceil[ST.mode]); }
function toggleLabels(){ ST.labels=!ST.labels; refreshVisibility(); const b=$('b-label'); if(b) b.classList.toggle('on',ST.labels); }
function showKeys(on){ const m=$('keysmodal'); if(m) m.style.display=on?'flex':'none'; }
function closeMenus(){ document.querySelectorAll('.menu.open').forEach(m=>m.classList.remove('open')); }
function menuCmd(cmd){
  if(cmd.startsWith('tool-')){ setTool(cmd.slice(5)); return; }
  switch(cmd){
    case 'obj': exportOBJ(); break;
    case 'import-obj': ffImportOBJ(); break;
    case 'isolate': setIsolate(!ST.isolate); break;
    case 'anim-play': scenePlay(true); break;
    case 'anim-stop': scenePlay(false); break;
    case 'sec-sections': openTraySec('sections'); renderSections(); break;
    case 'purge': ffPurge(); break;
    case 'stl': exportSTL(); break;
    case 'modelinfo': showModelInfo(true); break;
    case 'mkgroup': ffMakeGroup(); break;
    case 'mkcomp': ffMakeComp(); break;
    case 'explode': ffExplode(); break;
    case 'compupdate': ffCompUpdate(); break;
    case 'sections-clear': clearSections(); break;
    case 'hiddengeom': setHiddenGeom(!ST.hiddenGeom); break;
    case 'sections': ST.sectionsOn=!ST.sectionsOn; applySections(); break;
    case 'sectioncut': ST.sectionCut=!ST.sectionCut; applySections(); break;
    case 'guides': setGuidesOn(!ST.guidesOn); break;
    case 'fog': setFog(!ST.fogOn); break;
    case 'edges': setEdges(!ST.edges); break;
    case 'fs-wire': setFaceStyle('wire'); break;
    case 'fs-hidden': setFaceStyle('hidden'); break;
    case 'fs-shaded': setFaceStyle('shaded'); break;
    case 'fs-textured': setFaceStyle('textured'); break;
    case 'fs-mono': setFaceStyle('mono'); break;
    case 'toolbar': document.body.classList.toggle('tools-off'); break;
    case 'bottom': setView('bottom'); break;
    case 'persp': setOrtho(false); break;
    case 'twopt': if(ST.mode!=='orbit') setMode('orbit'); camPush(); orbit.target.y=camera.position.y; orbit.update(); invalidate(); camPush(); setStatus(statusLive,'2점 투시 — 수직선이 수직으로 (시선 수평)'); break;
    case 'fov': { const v=parseFloat(window.prompt('시야각 (도, 10~120)',String(Math.round(persp.fov)))); if(v>=10&&v<=120){ persp.fov=v; persp.updateProjectionMatrix(); invalidate(); setStatus(statusLive,'시야각 '+v+'°'); } break; }
    case 'zoomsel': if(ST.selected) zoomTo(ST.selected); else setStatus(statusLive,'선택된 것이 없습니다'); break;
    case 'solid-union': case 'solid-subtract': case 'solid-intersect': case 'solid-trim': case 'solid-split': case 'solid-shell': ffSolid(cmd.slice(6)); break;
    case 'flip-x': case 'flip-y': case 'flip-z': ffFlip(cmd.slice(5)); break;
    case 'shot': screenshot(); break;
    case 'glb': exportGLB(); break;
    case 'json': exportJSON(); break;
    case 'reload': if(chan) chan.postMessage({type:'hello',at:0}); loadStored(); break;
    case 'undo': if(canEdit()) emitEdit({type:'edit',op:'undo'}); break;
    case 'redo': if(canEdit()) emitEdit({type:'edit',op:'redo'}); break;
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
    case 'ff': ST.ffOn?ffExit():ffEnter(); break;           // 2026-09-07 프리폼
    case 'ff-rebase': ffRebase(); break;
    case 'ff-cloud-save': ffCloudSave(false); break;
    case 'ff-cloud-saveas': ffCloudSave(true); break;
    case 'ff-cloud-open': ffCloudOpen(); break;
    case 'ff-save': ffExportFile(); break;
    case 'ff-open': ffImportFile(); break;
    case 'ff-new': ffNew(); break;
    case 'light': setLights(!ST.lightsOn); break;
    case 'night': setNight(!ST.night); break;
    case 'sky': setSky(ST.sky==='plain'?'sky':'plain'); break;                 // 2026-09-07
    case 'skyimg': pickSkyImage(); break;
    case 'ceil': toggleCeil(); break;
    case 'label': toggleLabels(); break;
    case 'shadow': setShadows(!ST.shadows); break;
    case 'axes': setAxes(!ST.axes); break;
    case 'orbit': setMode('orbit'); break;
    case 'walk': setMode('walk'); break;
    case 'iso': case 'top': case 'front': case 'side': setView(cmd); break;
    case 'wp-auto': ffSetWP('auto'); break;
    case 'wp-xy': ffSetWP('xy'); break;
    case 'wp-xz': ffSetWP('xz'); break;
    case 'wp-yz': ffSetWP('yz'); break;
    case 'wp-flip': ffWPFlip(); break;
    case 'wp-origin': ffWPOriginPick(); break;
    case 'wp-face': ffWPFromFace(); break;
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
  'st-sky':()=>setSky(ST.sky==='plain'?'sky':'plain'),
  'st-label':toggleLabels,'st-shadow':()=>setShadows(!ST.shadows),'st-axes':()=>setAxes(!ST.axes),
  'st-xray':()=>setXray(!ST.xray),'st-ortho':()=>setOrtho(!ST.ortho)};
const _sun=$('st-sun'); if(_sun) _sun.addEventListener('input',()=>setSunT(_sun.value/100));
const _sd=$('st-date'); if(_sd) _sd.addEventListener('input',()=>setSunDate(+_sd.value));
const _sl=$('st-light'); if(_sl) _sl.addEventListener('input',()=>setLightDark(_sl.value/100,null));
const _sk=$('st-dark'); if(_sk) _sk.addEventListener('input',()=>setLightDark(null,_sk.value/100));
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
  _glowResize();
  invalidate();
});

let prev=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-prev)/1000); prev=now;
  if(ST.mode==='orbit'){ if(orbit.enabled&&orbit.update()) needRender=true; }
  else { if(stepWalk(dt)) needRender=true; }
  if(ST.op) needRender=true;
  if(needRender){ drawFrame(); needRender=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

if(!FF_STANDALONE) connect();   // 단독 프리폼은 미니캐드와 연결하지 않는다 (2026-09-08 대표 지시)
if(FF_STANDALONE){
  const EMPTY={schema:'ECOREAN.FloorPlan.v5.9',
    meta:{project:'프리폼',ceilingHeight_mm:2400,wallThickness:100},
    vertices:[],spaces:[],walls:[],openings:[],furniture:[],fixtures:[],lights:[],electric:[],hvac:[],pillars:[],
    sketchPts:[],sketchEdges:[],sketchFaces:[],masses:[]};
  acceptDoc({at:Date.now(),data:EMPTY},'stored');
  ffEnter();                                    // 저장본이 있으면 밑그림·자유 층 그대로 복원
  document.title='프리폼 — 3D 모델링';
  const _bt=document.querySelector('.mtitle'); if(_bt) _bt.textContent='🧊 프리폼';
  // 미니캐드 관련 메뉴·버튼은 단독에서 뜻이 없다 — 걷어낸다
  ffStandaloneShell();                          // 스케치업 100% 셸 (메뉴·큰 도구 세트·단축키표)
  ST.labels=false; refreshVisibility(); { const bl=$('b-label'); if(bl) bl.classList.remove('on'); }   // 이름표 기본 OFF (2026-09-09 대표 지시)
  ST.edges=true; applyFaceStyle();               // 매스 모서리 얇게 기본 ON (스케치업처럼)
  refreshStylePanel();
  setStatus(true,'🧊 단독 프리폼 — 미니캐드와 연결되지 않습니다. 여기서 만든 것은 여기 저장 (파일 ▸ 프리폼 파일 저장/열기)');
}
if(!FF_STANDALONE&&!loadStored()){ $('empty').style.display='flex'; setStatus(false,'MiniCAD 연결 대기'); }
// 독립 프리폼은 위에서 이미 부팅했다 — 이 폴백이 '연결 대기' 안내를 되살리면 안 된다
// 테스트·디버그 훅
window.MC3DVIEW={ST,scene,THREE,_plBudget,get camera(){return camera;},renderer,build:acceptDoc,fitView,setMode,setLights,setView,setNight,
  setSky,setSkyImage,buildSky,drawFrame,
  ffEnter,ffExit,ffApply,ffRebase,ffNew,ffExportFile,emitEdit,get FF(){return FF;},
  buildGrips,beginVertZ,applyVertZ,commitVertZ,_gripAt,_massWorld,get grips(){return gripsGrp;},
  sendEdit,sendBatch,rotateSelected,deleteSelected3D,setTool,commitActive,cancelOp,menuCmd,openTraySec,setAxes,snap3,segHitsSpace,
  select,selectGroups,selectAll,boxSelect,selectSpaceGroup,selectWallNeighbors,findGroup,
  setOrtho,setXray,setSunT,setTag,camPrev,camNext,camPush,copySel,cutSel,pasteClip,lockSelected,hideSelected,unhideAll,
  addGuide,clearGuides,arcPts,offsetPoly,polyArea,parseLen,vcbTyped,vcbCoord,vcbSides,setLast,vcbPostOn,vcbPostEnter,
  sceneAdd,sceneGo,scenesLoad,renderOutliner,showCtx,hideCtx,saveFeedback,opOrbit,orbit,
  massConvert3D,describe,spawnPendingFace,prismGhost, // 2026-09-04 점·선·면 스모크용
  // 2026-09-08 스케치업 100% (단독 프리폼) — E2E 훅
  followClick,freehandEnd,freehandDown,_rdp,text3dPolys,setAxesOrigin,renderPaintPal,ffEnterEdit,ffExitEdit,ffPickInside,ffDeleteSel,ffReverseSel,beginMoveSel,ffSelectWhole,ffPartAt,ffMoveEntry,ffPaintFaces,ffWhole,ffPartNearScreen,ffTrySplit,addGuidePoint,glowSprite,ffAutoExtrude,ffBlueHop,showSnap,hideSnap,ffSnapHide,ffContactPulse,ffContactOnClick,_snapPaint,_snapTex,SNAP_SHAPE,SNAP_COL,SNAP_NAME,snap3,_dragAlong,mmPerPx,ffPlaneThrough,ffEmitEdge3,ffLineBegin3,ffFree3,ffMatProp,ffSetMatProp,_ffMatKey,ffMatEditor,ffAddImageMat,_ffTexUpload,MAT_PRESETS,_ffAll3D,_ffPick3D,_ffSnapOnPlane,ffCloudSave,ffCloudOpen,ffCloudLoad,ffCloudReady,ffApplyDoc,ffSaveBanner,ffSaveMeter,ffDocJSON,ffAutosave,FF_QUOTA,ffSetWP,ffWPFlip,ffWPCycle,ffWPFrame,ffWPGround,ffWPDraw,ffWPPickAxis,ffWPOriginPick,ffWPSetOrigin,ffWPFromFace,_ffWPHandleAt,WP_KINDS,_blueAligned,_blueDir,_screenDir,lineMove,_planePt,ffPaintMass,eraseExtras,renderSections,setIsolate,scenePlay,ffStats,ffPurge,ffParseOBJ,ffCustomMat,setSunDate,setLightDark,ffFlip,beginScaleGrip,buildScaleGrips,offsetFaceClick,ffFaceInfoAt,shape3Start,shape3Click,shape3Commit,_ffFacePick,_ffFrameFor,_localOfHit,exportOBJ,exportSTL,_exportTris,fmtLen,setLast,ffSolid,ffMakeGroup,ffMakeComp,ffExplode,ffCompUpdate,setFaceStyle,setEdges,setFog,setHiddenGeom,setGuidesOn,applySections,clearSections,zoomWindow,
  axesOn:()=>!!(axesGrp&&axesGrp.visible),
  selectById:(fid,id)=>{const g=findGroup(fid,id);if(g)select(g);return !!g;},
  selCount:()=>ST.selSet.size,
  objCount:()=>{let n=0;ST.root&&ST.root.children.forEach(fg=>{n+=fg.children.length;});return n;}};
