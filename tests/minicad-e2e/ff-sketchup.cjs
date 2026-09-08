// 단독 프리폼 = 스케치업 100% E2E — 진짜 포인터·키로 도구 전부
const {launch,sleep}=require('./cdp.cjs');
var fails=[]; let n=0;
var ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{
  var b=await launch({port:9335});
  var J=(s)=>b.evalJS(s);
  try{
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1');
    await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF');
    await J(`localStorage.clear();'ok'`);
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1');
    await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF');
    await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};
      window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__cl=(x,y,z,o)=>{var p=__pt(x,y,z);__click(p.x,p.y,o);};
      window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};
      window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__st=()=>document.getElementById('status').textContent;
      window.__F=()=>MC3DVIEW.FF.free; 'ok'`);
    // ---- 셸 ----
    var shell=await J(`({menus:document.querySelectorAll('#menubar .menu').length,title:document.querySelector('#menubar .mtitle').textContent,tools:[...document.querySelectorAll('#tools .btn')].map(b=>b.dataset.t),keysH3:document.querySelector('#keysmodal h3').textContent,hasSave:!!document.querySelector('#menubar [data-cmd="ff-save"]'),hasReload:!!document.querySelector('#menubar [data-cmd="reload"]'),solid:document.querySelectorAll('#menubar [data-cmd^="solid-"]').length,chanNull:MC3DVIEW.ST.ffOn})`);
    ck(shell.menus===8,'메뉴 8개 (파일·편집·보기·카메라·그리기·도구·창·도움말)');
    ck(shell.title.includes('프리폼'),'브랜드 = 프리폼');
    ck(shell.tools.length>=30&&shell.tools[0]==='select'&&shell.tools[1]==='mkcomp'&&shell.tools.includes('followme')&&shell.tools.includes('section')&&shell.tools.includes('text3d'),'큰 도구 세트 스케치업 순서 ('+shell.tools.length+'개)');
    ck(shell.keysH3.includes('프리폼'),'단축키표 = 프리폼');
    ck(shell.hasSave&&!shell.hasReload,'미니캐드 메뉴 없음 · 파일 저장 있음');
    ck(shell.solid===6,'솔리드 도구 메뉴 6개');
    // ---- 위에서 보기 · 사각형 → 밀기끌기 → 매스 ----
    await J(`MC3DVIEW.setView('top');MC3DVIEW.drawFrame();'ok'`); await sleep(150);
    await J(`MC3DVIEW.setTool('rect');__cl(0,0);__mv(3000,2000);__cl(3000,2000);'ok'`); await sleep(200);
    ck((await J(`__F().sketchFaces.length`))===1,'R 사각형 → 면 1');
    // 면 클릭 → P 로 Z=1500 (숫자)
    await J(`MC3DVIEW.setTool('pushpull');__mv(1500,1000);__ev('pointerdown',__pt(1500,1000).x,__pt(1500,1000).y);__ev('pointerup',__pt(1500,1000).x,__pt(1500,1000).y);'ok'`); await sleep(100);
    await J(`__ev('pointermove',__pt(1500,1000).x,__pt(1500,1000).y-40);'ok'`); await sleep(50);
    await J(`document.querySelector('#vcb .v-v').value='1500';MC3DVIEW.commitActive(1500);'ok'`); await sleep(250);
    let m=await J(`({n:__F().masses.length,h:__F().masses[0]&&__F().masses[0].h_mm,faces:__F().sketchFaces.length})`);
    ck(m.n===1&&m.h===1500&&m.faces===0,'P 밀기끌기 1500 → 매스 (면 소비) '+JSON.stringify(m));
    // ---- 매스 배율 (S) ----
    await J(`MC3DVIEW.setView('top');MC3DVIEW.drawFrame();'ok'`); await sleep(100);
    await J(`MC3DVIEW.setTool('scale');var p=__pt(1500,1000,1500);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(100);
    var sop=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type+':'+!!MC3DVIEW.ST.op.mass`);
    ck(sop==='scale:true','S 배율 — 매스 잡힘 ('+sop+')');
    await J(`document.querySelector('#vcb .v-v').value='2';MC3DVIEW.commitActive(2);'ok'`); await sleep(250);
    m=await J(`({h:__F().masses[0].h_mm,w:Math.max(...__F().masses[0].pts.map(p=>p.x))-Math.min(...__F().masses[0].pts.map(p=>p.x))})`);
    ck(m.h===3000&&m.w===6000,'배율 ×2 → 높이 3000·폭 6000 '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    ck((await J(`__F().masses[0].h_mm`))===1500,'Ctrl+Z 배율 취소');
    // ---- 다각형 ----
    await J(`MC3DVIEW.setTool('polygon');__cl(8000,0);__mv(9000,0);'ok'`); await sleep(50);
    await J(`document.querySelector('#vcb .v-v').value='1000';MC3DVIEW.commitActive(1000);'ok'`); await sleep(200);
    m=await J(`({f:__F().sketchFaces.length,pts:__F().sketchFaces[0]&&__F().sketchFaces[0].pts.length})`);
    ck(m.f===1&&m.pts===6,'다각형 r=1000 → 6각 면 '+JSON.stringify(m));
    // ---- 회전 사각형 ----
    await J(`MC3DVIEW.setTool('rotrect');__cl(0,6000);__mv(2000,7000);__cl(2000,7000);__mv(1500,8000);__cl(1500,8000);'ok'`); await sleep(200);
    ck((await J(`__F().sketchFaces.length`))===2,'회전 사각형 → 면 (총 2)');
    // ---- 프리핸드 (닫힘) ----
    await J(`MC3DVIEW.setTool('freehand');var P=[[12000,0],[13000,200],[14000,1500],[13500,3000],[12200,2800],[12000,1400],[12000,0]];var a=__pt(P[0][0],P[0][1]);__ev('pointermove',a.x,a.y);__ev('pointerdown',a.x,a.y);P.forEach(q=>{var s=__pt(q[0],q[1]);__ev('pointermove',s.x,s.y);});var l=__pt(12000,0);__ev('pointerup',l.x,l.y);'ok'`); await sleep(200);
    ck((await J(`__F().sketchFaces.length`))===3,'프리핸드 닫힘 → 면 (총 3)');
    // ---- 3점 호 ----
    await J(`MC3DVIEW.setTool('arc3');__cl(0,12000);__mv(1500,10500);__cl(1500,10500);__mv(3000,12000);__cl(3000,12000);'ok'`); await sleep(200);
    let e0=await J(`__F().sketchEdges.length`);
    ck(e0>=10,'3점 호 → 선 조각 '+e0);
    // ---- 파이 ----
    await J(`MC3DVIEW.setTool('pie');__cl(8000,8000);__mv(10000,8000);__cl(10000,8000);__mv(9700,9200);__mv(9000,9700);__mv(8000,10000);'ok'`); await sleep(50);
    await J(`document.querySelector('#vcb .v-v').value='90';MC3DVIEW.commitActive(90);'ok'`); await sleep(250);
    m=await J(`({f:__F().sketchFaces.length,e:__F().sketchEdges.length})`);
    ck(m.f===4,'파이 90° → 부채꼴 면 (총 4) '+JSON.stringify(m));
    // ---- 각도기 → 안내선 ----
    await J(`MC3DVIEW.setTool('protractor');__cl(20000,0);__mv(22000,0);__cl(22000,0);__mv(22000,2000);'ok'`); await sleep(50);
    await J(`document.querySelector('#vcb .v-v').value='30';MC3DVIEW.commitActive(30);'ok'`); await sleep(100);
    ck((await J(`MC3DVIEW.ST.guides.length`))===1,'각도기 30° → 안내선 1');
    // ---- 축 ----
    await J(`MC3DVIEW.setTool('axes');__cl(1000,1000);__mv(3000,1000);__cl(3000,1000);'ok'`); await sleep(100);
    m=await J(`({o:MC3DVIEW.ST.axesO,ax:MC3DVIEW.axesOn()})`);
    ck(m.o.x===1000&&m.o.y===1000&&m.o.ang===0,'축 원점 (1000,1000) '+JSON.stringify(m.o));
    await J(`MC3DVIEW.setAxesOrigin(0,0,0);'ok'`);
    // ---- 3D 문자 (엔진) ----
    m=await J(`(()=>{var P=text3dPolysTest();return P;})()`).catch(()=>null);
    var t3=await J(`(()=>{ var ps=MC3DVIEW.text3dPolys('AO',300); return {n:ps.length,pts:ps.map(p=>p.length)}; })()`);
    ck(t3.n===2&&t3.pts.every(x=>x>=8),'3D 문자 "AO" → 윤곽 2 (구멍은 열쇠구멍) '+JSON.stringify(t3));
    var before=await J(`__F().masses.length`);
    await J(`window.prompt=(q,d)=>q.startsWith('3D')?'B':'200, 40';MC3DVIEW.setTool('text3d');__cl(30000,0);'ok'`); await sleep(300);
    m=await J(`({n:__F().masses.length,gid:__F().masses[__F().masses.length-1].gid,h:__F().masses[__F().masses.length-1].h_mm})`);
    ck(m.n===before+1&&!!m.gid&&m.h===40,'3D 문자 "B" 배치 → 매스(그룹) 두께 40 '+JSON.stringify(m));
    // ---- 그룹 (G) · 컴포넌트 (Shift+G) · 정의 갱신 · 분해 ----
    await J(`MC3DVIEW.setTool('select');MC3DVIEW.select(null);var ids=__F().masses.slice(0,1).map(x=>x.id);MC3DVIEW.selectById('freeform',ids[0]);'ok'`);
    await J(`window.prompt=()=>'수납장';__key('G',{shiftKey:true});'ok'`); await sleep(200);
    m=await J(`({cid:__F().masses[0].cid,gid:__F().masses[0].gid,comps:__F().comps.length})`);
    ck(!!m.cid&&!!m.gid&&m.comps===1,'Shift+G → 컴포넌트 "수납장" '+JSON.stringify(m));
    // 스탬프 2개 → 정의 갱신 → 인스턴스 따라옴
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'stamp',floorId:'freeform',patch:{compId:__F().comps[0].id,x:40000,y:0}});MC3DVIEW.emitEdit({type:'edit',op:'stamp',floorId:'freeform',patch:{compId:__F().comps[0].id,x:50000,y:0}});'ok'`); await sleep(200);
    var inst=await J(`__F().masses.filter(x=>x.cid===__F().comps[0].id).length`);
    ck(inst===3,'스탬프 → 인스턴스 3');
    await J(`var m0=__F().masses[0];MC3DVIEW.emitEdit({type:'edit',op:'set',kind:'masses',id:m0.id,floorId:'freeform',patch:{h_mm:777}});MC3DVIEW.emitEdit({type:'edit',op:'compupdate',floorId:'freeform',patch:{gid:m0.gid}});'ok'`); await sleep(200);
    m=await J(`__F().masses.filter(x=>x.cid===__F().comps[0].id).map(x=>x.h_mm)`);
    ck(m.length===3&&m.every(h=>h===777),'정의 갱신 → 인스턴스 전부 777 '+JSON.stringify(m));
    await J(`MC3DVIEW.selectById('freeform',__F().masses[0].id);MC3DVIEW.menuCmd('explode');'ok'`); await sleep(150);
    ck(!(await J(`__F().masses[0].gid`)),'분해 → gid 없음');
    // ---- 면 하나 재질 (Ctrl+페인트) ----
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.ST.paint={cat:'floor',code:'WOOD'};MC3DVIEW.setTool('paint');'ok'`); await sleep(100);
    await J(`var mm0=__F().masses[0];var pp=__pt(mm0.x,mm0.y,mm0.h_mm);__click(pp.x,pp.y,{ctrlKey:true});'ok'`); await sleep(250);
    m=await J(`({solid:!!__F().masses[0].solidFaces,mats:(__F().masses[0].solidFaces||[]).map(f=>f.mat).filter(Boolean)})`);
    ck(m.solid&&m.mats.length===1&&m.mats[0]==='WOOD','Ctrl+페인트 → 면 하나만 WOOD '+JSON.stringify(m));
    // ---- 팔로우 미 (일반 단면 op) ----
    var nb=await J(`__F().masses.length`);
    await J(`var path=[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}];MC3DVIEW.emitEdit({type:'edit',op:'sweep',floorId:'freeform',patch:{pts:path,closed:true,z:0,profile:[{u:0,v:0},{u:20,v:0},{u:20,v:100},{u:0,v:100}],name:'테스트몰딩'}});'ok'`); await sleep(200);
    ck((await J(`__F().masses.length`))===nb+1,'팔로우 미(sweep) → 몰딩 매스');
    // ---- 팔로우 미 도구 (면 위 단면 → 매스) : 벽면에 단면 그리기 ----
    await J(`MC3DVIEW.setTool('select');MC3DVIEW.select(null);'ok'`);
    var fm=await J(`(()=>{ // 기준 매스 (첫 매스) 의 짧은 끝면(x=min 면)에 단면을 그린다 — 평면 bag 직접
      var m0=__F().masses[0]; var xs=m0.pts.map(p=>p.x); var x0=m0.x+Math.min(...xs);
      var pl=ffPlaneBag(__F(),{x:x0,y:m0.y,z:0},{x:-1,y:0,z:0});
      var uv0=planeUV(pl,{x:x0,y:m0.y+Math.min(...m0.pts.map(p=>p.y)),z:0});
      var u=uv0.u,v=uv0.v;
      var r=MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:u,y1:v,x2:u+60,y2:v+120,plane:{origin:pl.origin,ex:pl.ex,ey:pl.ey,n:pl.n}}});
      return {r,faces:pl.sketchFaces.length,id:pl.sketchFaces[0]&&pl.sketchFaces[0].id}; })()`);
    ck(fm.r&&fm.faces===1,'벽 끝면에 단면 면 '+JSON.stringify(fm));
    await sleep(200);
    var fm2=await J(`(()=>{ var g=MC3DVIEW.findGroup('freeform','${fm.id}'); if(!g) return 'nogroup'; MC3DVIEW.setTool('followme');
      var mesh=g.children[0]; var hit={object:mesh,face:{normal:new MC3DVIEW.THREE.Vector3(0,0,1)},point:mesh.getWorldPosition(new MC3DVIEW.THREE.Vector3())};
      var n0=__F().masses.length; MC3DVIEW.followClick(hit); var st1=MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type;
      var m0=__F().masses[0]; var g0=MC3DVIEW.findGroup('freeform',m0.id); var mesh0=g0.children[0];
      var hit2={object:mesh0,face:{normal:new MC3DVIEW.THREE.Vector3(1,0,0)},point:new MC3DVIEW.THREE.Vector3(m0.x*0.001,0.3,m0.y*0.001)};
      MC3DVIEW.followClick(hit2); return {st1,n0,n1:__F().masses.length,st:__st()}; })()`).catch(e=>'ERR '+e.message);
    ck(fm2&&fm2.st1==='followme'&&fm2.n1===fm2.n0+1,'팔로우 미 도구: 단면 클릭 → 매스 클릭 → 스윕 매스 '+JSON.stringify(fm2));
    // ---- 단면 ----
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('section');var m0=__F().masses[0];var p=__pt(m0.x,m0.y,m0.h_mm);__click(p.x,p.y);'ok'`); await sleep(200);
    m=await J(`({n:MC3DVIEW.ST.sections.length,clip:(()=>{let c=0;MC3DVIEW.ST.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.clippingPlanes&&o.material.clippingPlanes.length)c++;});return c;})()})`);
    ck(m.n===1&&m.clip>0,'단면 배치 → 클리핑 적용 '+JSON.stringify(m));
    await J(`MC3DVIEW.menuCmd('sectioncut');'ok'`);
    ck((await J(`(()=>{let c=0;MC3DVIEW.ST.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.clippingPlanes&&o.material.clippingPlanes.length)c++;});return c;})()`))===0,'단면 자르기 끔 → 클리핑 0');
    await J(`MC3DVIEW.menuCmd('sections-clear');'ok'`);
    ck((await J(`MC3DVIEW.ST.sections.length`))===0,'단면 모두 삭제');
    // ---- 면 스타일 · 모서리 · 안개 · 숨은 형상 ----
    await J(`MC3DVIEW.menuCmd('fs-wire');'ok'`);
    ck(await J(`(()=>{let w=0,t=0;MC3DVIEW.ST.root.traverse(o=>{if(o.isMesh&&o.userData.obj){t++;if(o.material.wireframe)w++;}});return w>0&&w===t;})()`),'와이어프레임 → 전 메시');
    await J(`MC3DVIEW.menuCmd('fs-hidden');'ok'`);
    ck(await J(`(()=>{let e=0;MC3DVIEW.ST.root.traverse(o=>{if(o.name==='__edges'&&o.visible)e++;});return e>0;})()`),'히든 라인 → 모서리 선');
    await J(`MC3DVIEW.menuCmd('fs-textured');__key('k');'ok'`);
    m=await J(`({edges:MC3DVIEW.ST.edges,style:MC3DVIEW.ST.faceStyle,chk:document.getElementById('mi-edges').classList.contains('chk')})`);
    ck(m.edges===true&&m.style==='textured'&&m.chk,'K = 모서리 토글 + 메뉴 체크 '+JSON.stringify(m));
    await J(`__key('k');MC3DVIEW.menuCmd('fog');'ok'`);
    ck(await J(`MC3DVIEW.ST.fogOn&&MC3DVIEW.scene.fog.near<60`),'안개 켜짐');
    await J(`MC3DVIEW.menuCmd('fog');MC3DVIEW.selectById('freeform',__F().masses[1].id);MC3DVIEW.hideSelected();MC3DVIEW.menuCmd('hiddengeom');'ok'`); await sleep(100);
    ck(await J(`(()=>{var g=MC3DVIEW.findGroup('freeform',__F().masses[1].id);return g.visible&&g.children[0].material.wireframe;})()`),'숨은 형상 → 유령(와이어) 표시');
    await J(`MC3DVIEW.menuCmd('hiddengeom');MC3DVIEW.unhideAll();'ok'`);
    // ---- 안내선 토글 · 줄자 크기 조정 ----
    await J(`MC3DVIEW.menuCmd('guides');'ok'`);
    ck(await J(`!MC3DVIEW.ST.guidesOn&&MC3DVIEW.ST.guides.every(g=>!g.line.visible)`),'보기▸안내선 끔');
    await J(`MC3DVIEW.menuCmd('guides');window.confirm=()=>true;var m0=__F().masses[0];MC3DVIEW.setLast('t','mm',()=>true);MC3DVIEW.emitEdit({type:'edit',op:'scaleall',floorId:'freeform',patch:{k:2}});'ok'`); await sleep(150);
    ck((await J(`__F().masses[0].h_mm`))===1554,'모델 전체 크기 ×2 (777→1554)');
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(100);
    // ---- 태그 ----
    await J(`window.prompt=()=>'가구층';document.getElementById('tag-add').click();'ok'`); await sleep(50);
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'set',kind:'masses',id:__F().masses[0].id,floorId:'freeform',patch:{tag:'가구층'}});'ok'`); await sleep(150);
    await J(`MC3DVIEW.setTag('가구층',false);'ok'`);
    m=await J(`({tags:__F().tags,vis:MC3DVIEW.findGroup('freeform',__F().masses[0].id).visible,cnt:document.querySelectorAll('#tags input').length})`);
    ck(m.tags[0]==='가구층'&&m.vis===false,'태그 추가·부여·끄기 → 그 매스 숨김 '+JSON.stringify(m));
    await J(`MC3DVIEW.setTag('가구층',true);'ok'`);
    // ---- 줌 창 · 카메라 위치 · 둘러보기 · Space 복귀 ----
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('zoomwin');var a=__pt(0,0),c=__pt(3000,2000);__ev('pointermove',a.x,a.y);__ev('pointerdown',a.x,a.y);__ev('pointermove',c.x,c.y);__ev('pointerup',c.x,c.y);'ok'`); await sleep(100);
    m=await J(`MC3DVIEW.camera.position.distanceTo(MC3DVIEW.orbit.target)`);
    ck(m<8,'줌 창 → 가까워짐 (거리 '+m.toFixed(2)+')');
    await J(`MC3DVIEW.setTool('poscam');var a=__pt(1000,1000),c=__pt(3000,1000);__ev('pointermove',a.x,a.y);__ev('pointerdown',a.x,a.y);__ev('pointermove',c.x,c.y);__ev('pointerup',c.x,c.y);'ok'`); await sleep(150);
    m=await J(`({mode:MC3DVIEW.ST.mode,tool:MC3DVIEW.ST.tool,y:MC3DVIEW.camera.position.y})`);
    ck(m.mode==='walk'&&m.tool==='lookaround'&&Math.abs(m.y-1.6)<0.01,'카메라 위치 → 걷기 모드 눈높이 1.6 · 둘러보기 '+JSON.stringify(m));
    await J(`__key(' ');'ok'`); await sleep(50);
    ck((await J(`MC3DVIEW.ST.mode+':'+MC3DVIEW.ST.tool`))==='orbit:select','Space → 조감·선택 복귀');
    // ---- 카메라 메뉴: 2점 투시 · 시야각 · 아래 · 평행/원근 ----
    await J(`window.prompt=()=>'45';MC3DVIEW.menuCmd('fov');MC3DVIEW.menuCmd('twopt');MC3DVIEW.menuCmd('bottom');MC3DVIEW.menuCmd('ortho');MC3DVIEW.menuCmd('persp');'ok'`); await sleep(100);
    m=await J(`({fov:MC3DVIEW.camera.fov,ortho:MC3DVIEW.ST.ortho,persp:document.getElementById('mi-persp').classList.contains('chk')})`);
    ck(m.fov===45&&m.ortho===false&&m.persp,'시야각 45 · 아래 · 원근 복귀 '+JSON.stringify(m));
    // ---- Ctrl+T · 우클릭 메뉴 · OBJ/STL ----
    await J(`MC3DVIEW.selectById('freeform',__F().masses[0].id);__key('t',{ctrlKey:true});'ok'`);
    ck((await J(`MC3DVIEW.selCount()`))===0,'Ctrl+T 선택 없음');
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();var m0=__F().masses[0];var p=__pt(m0.x,m0.y,m0.h_mm/2);MC3DVIEW.showCtx({clientX:p.x,clientY:p.y});'ok'`); await sleep(50);
    m=await J(`[...document.querySelectorAll('#ctxmenu button span')].map(s=>s.textContent)`);
    ck(m.includes('그룹 만들기')&&m.includes('컴포넌트 만들기…')&&m.includes('걸레받이 (바닥 둘레)')&&!m.some(x=>x.includes('공간')),'우클릭 메뉴 = 스케치업식 (그룹·컴포넌트·몰딩, 공간/벽 없음)');
    await J(`MC3DVIEW.hideCtx();'ok'`);
    m=await J(`(()=>{ let n=0; var dl=window.__dl=[]; var A=document.createElement; MC3DVIEW.exportOBJ(); MC3DVIEW.exportSTL(); return {st:__st(),tris:MC3DVIEW._exportTris().length}; })()`);
    ck(m.tris>50&&m.st.includes('STL'),'OBJ·STL 내보내기 ('+m.tris+' 삼각형)');
    // ---- 단위 · 모델 정보 ----
    await J(`MC3DVIEW.menuCmd('modelinfo');var u=document.getElementById('mi-units');u.value='cm';u.dispatchEvent(new Event('change'));document.getElementById('mi-close').click();'ok'`);
    ck((await J(`MC3DVIEW.ST.units+':'+MC3DVIEW.fmtLen(1234)`))==='cm:123.4 cm','모델 정보 단위 cm');
    await J(`MC3DVIEW.ST.units='mm';'ok'`);
    // ---- 솔리드 도구 (결합·빼기·교차·다듬기·분할) ----
    await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'상자2',ops:[{op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:2000,y:0},{x:2000,y:2000},{x:0,y:2000}],z:1000,name:'A'}},{op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:1000,y:0},{x:3000,y:0},{x:3000,y:2000},{x:1000,y:2000}],z:1000,name:'B'}}]});'ok'`); await sleep(200);
    await J(`MC3DVIEW.select(null);MC3DVIEW.selectById('freeform',__F().masses[0].id);MC3DVIEW.select(MC3DVIEW.findGroup('freeform',__F().masses[1].id),{add:true});MC3DVIEW.menuCmd('solid-union');'ok'`); await sleep(250);
    m=await J(`({n:__F().masses.length,vol:massVolume(__F().masses[0],{ch:2400,fh:2800,fl:0}),st:__st()})`);
    ck(m.n===1&&Math.abs(m.vol-6)<0.01,'솔리드 결합 → 매스 1 · 부피 6㎥ '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    await J(`MC3DVIEW.select(null);MC3DVIEW.selectById('freeform',__F().masses[0].id);MC3DVIEW.select(MC3DVIEW.findGroup('freeform',__F().masses[1].id),{add:true});MC3DVIEW.menuCmd('solid-subtract');'ok'`); await sleep(250);
    m=await J(`({n:__F().masses.length,vol:massVolume(__F().masses[0],{ch:2400,fh:2800,fl:0}),name:__F().masses[0].name})`);
    ck(m.n===1&&Math.abs(m.vol-2)<0.01&&m.name==='B−A','솔리드 빼기 (둘째−첫째) → 부피 2㎥ '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    await J(`MC3DVIEW.select(null);MC3DVIEW.selectById('freeform',__F().masses[0].id);MC3DVIEW.select(MC3DVIEW.findGroup('freeform',__F().masses[1].id),{add:true});MC3DVIEW.menuCmd('solid-split');'ok'`); await sleep(250);
    m=await J(`({n:__F().masses.length,vols:__F().masses.map(x=>+massVolume(x,{ch:2400,fh:2800,fl:0}).toFixed(2))})`);
    ck(m.n===3&&m.vols.every(v=>Math.abs(v-2)<0.01),'솔리드 분할 → 3조각 각 2㎥ '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});MC3DVIEW.select(null);MC3DVIEW.selectById('freeform',__F().masses[0].id);MC3DVIEW.select(MC3DVIEW.findGroup('freeform',__F().masses[1].id),{add:true});MC3DVIEW.menuCmd('solid-trim');'ok'`); await sleep(250);
    m=await J(`({n:__F().masses.length,names:__F().masses.map(x=>x.name)})`);
    ck(m.n===2&&m.names.includes('A')&&m.names.includes('B−A'),'솔리드 다듬기 → 자르는 쪽 유지 '+JSON.stringify(m));
    // ---- 새로고침 복원 ----
    var cnt=await J(`({m:__F().masses.length,f:__F().sketchFaces.length,c:__F().comps.length})`);
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await sleep(300);
    m=await J(`({m:MC3DVIEW.FF.free.masses.length,f:MC3DVIEW.FF.free.sketchFaces.length,c:MC3DVIEW.FF.free.comps.length,ch:(()=>{return typeof BroadcastChannel;})()})`);
    ck(m.m===cnt.m&&m.f===cnt.f&&m.c===cnt.c,'새로고침 복원 '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
