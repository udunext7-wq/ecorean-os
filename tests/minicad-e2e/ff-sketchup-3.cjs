// 스케치업 100% 3차 E2E — 재질(색상·이미지·Shift 전부)·지우개 확장·단면 목록·선택만 보기·애니메이션·그림자·통계·정리·OBJ·개체 정보
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0;
const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{
  const b=await launch({port:9348}); const J=s=>b.evalJS(s);
  try{
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF');
    await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};
      window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__st=()=>document.getElementById('status').textContent; window.__F=()=>MC3DVIEW.FF.free;
      window.__boxes=()=>{MC3DVIEW.ffNew();[[-3000,0],[0,0],[3000,0]].forEach((c,i)=>MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:c[0]-800,y:-800},{x:c[0]+800,y:-800},{x:c[0]+800,y:800},{x:c[0]-800,y:800}],z:1000,name:'B'+i}}));MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();}; 'ok'`);
    // ---- 재질: 색상 팔레트 · Shift 전부 · 이미지 재질 ----
    await J(`__boxes();'ok'`); await sleep(200);
    let m=await J(`({colors:document.querySelectorAll('#paintpal [data-cat="color"]').length,custom:!!document.getElementById('pp-custom'),addimg:!!document.getElementById('pp-addimg')})`);
    ck(m.colors===24&&m.custom&&m.addimg,'재질 트레이: 스케치업 색상 24 · 사용자 색 · 이미지 재질 버튼 '+JSON.stringify(m));
    await J(`document.querySelector('#paintpal [data-cat="color"][data-code="#FF3B30"]').click();var p=__pt(0,0,1000);__click(p.x,p.y);'ok'`); await sleep(200);
    m=await J(`({tool:MC3DVIEW.ST.tool,c:__F().masses[1].color,others:[__F().masses[0].color,__F().masses[2].color]})`);
    ck(m.tool==='paint'&&m.c==='#FF3B30'&&m.others.every(c=>c!=='#FF3B30'),'색상 클릭 → 페인트 · 가운데 상자만 빨강 '+JSON.stringify(m));
    await J(`document.querySelector('#paintpal [data-cat="color"][data-code="#007AFF"]').click();var p=__pt(-3000,0,1000);__click(p.x,p.y,{shiftKey:true});'ok'`); await sleep(200);
    m=await J(`__F().masses.map(x=>x.color)`);
    ck(m[0]==='#007AFF'&&m[2]==='#007AFF'&&m[1]==='#FF3B30','Shift+클릭 → 같은 재질(기본색) 전부 파랑, 빨강은 그대로 '+JSON.stringify(m));
    await J(`(()=>{ FF.free.mats=[{id:'IMG_test',name:'벽돌사진',url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',S:0.5}]; renderPaintPal(); })()`).catch(()=>{});
    await J(`MC3DVIEW.FF.free.mats=[{id:'IMG_test',name:'벽돌사진',url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',S:0.5}];MC3DVIEW.setTool('select');MC3DVIEW.setTool('paint');'ok'`); await sleep(100);
    m=await J(`!!document.querySelector('#paintpal [data-cat="img"][data-code="IMG_test"]')`);
    ck(m,'이미지 재질이 트레이에 보인다');
    await J(`document.querySelector('#paintpal [data-cat="img"][data-code="IMG_test"]').click();var p=__pt(3000,0,1000);__click(p.x,p.y);'ok'`); await sleep(250);
    m=await J(`(()=>{ var g=MC3DVIEW.findGroup('freeform',__F().masses[2].id); var mesh=g.children[0]; return {mat:__F().masses[2].mat,map:!!(mesh.material&&mesh.material.map),rep:mesh.material&&mesh.material.map&&mesh.material.map.repeat.x}; })()`);
    ck(m.mat==='IMG_test'&&m.map&&m.rep===2,'이미지 재질 칠하기 → 텍스처(0.5m 반복=2) '+JSON.stringify(m));
    // Ctrl+면 하나 = 색상
    await J(`document.querySelector('#paintpal [data-cat="color"][data-code="#FFCC00"]').click();var p=__pt(800,0,500);MC3DVIEW.setView('right');MC3DVIEW.drawFrame();p=__pt(800,0,500);__click(p.x,p.y,{ctrlKey:true});'ok'`); await sleep(250);
    m=await J(`(__F().masses[1].solidFaces||[]).map(f=>f.mat).filter(Boolean)`);
    ck(m.length===1&&m[0]==='C_FFCC00','Ctrl+면 하나 색상 → C_FFCC00 '+JSON.stringify(m));
    // 재질 추출 (Alt) → 색
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();var p=__pt(-3000,0,1000);__click(p.x,p.y,{altKey:true});'ok'`); await sleep(100);
    m=await J(`MC3DVIEW.ST.paint`);
    ck(m.cat==='color'&&m.code==='#007AFF','Alt+클릭 재질 추출 → 파랑 '+JSON.stringify(m));
    // ---- 지우개: 안내선 · 단면 · 주석 ----
    await J(`MC3DVIEW.setView('top');MC3DVIEW.drawFrame();MC3DVIEW.addGuide('freeform',{x:0,y:5000},{x:1000,y:5000},0);MC3DVIEW.setTool('erase');var p=__pt(500,5000);__click(p.x,p.y);'ok'`); await sleep(150);
    ck((await J(`MC3DVIEW.ST.guides.length`))===0,'지우개 → 안내선 삭제');
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('section');var p=__pt(0,0,1000);__click(p.x,p.y);'ok'`); await sleep(200);
    m=await J(`({n:MC3DVIEW.ST.sections.length,list:document.querySelectorAll('#sections .sc-i').length,open:document.querySelector('.tsec[data-sec="sections"]').classList.contains('open')})`);
    ck(m.n===1&&m.list===1&&m.open,'단면 배치 → 단면 트레이 목록 열림 '+JSON.stringify(m));
    await J(`document.querySelector('#sections [data-a="cut"]').click();'ok'`); await sleep(100);
    ck((await J(`(()=>{let c=0;MC3DVIEW.ST.root.traverse(o=>{if(o.isMesh&&o.material&&o.material.clippingPlanes&&o.material.clippingPlanes.length)c++;});return c;})()`))===0,'단면 목록 ✂ → 자르기 해제');
    const dbgF=await J(`(()=>{ var s=MC3DVIEW.ST.sections[0]; var b=document.querySelector('#sections [data-a="flip"]'); var has=!!(b&&b.onclick); var n0=s.n.toArray(); var ids=MC3DVIEW.ST.sections.map(x=>x.id); var src=b.onclick.toString().slice(0,40); try{ b.onclick(); }catch(e){ var err=e.message; } var n1=s.n.toArray(); var n2=MC3DVIEW.ST.sections[0].n.toArray(); document.querySelector('#sections [data-a="cut"]').click(); return {has,n0,n1,n2,ids,src,err,rows:document.querySelectorAll('#sections .sc-i').length}; })()`); console.log('   flip dbg',JSON.stringify(dbgF)); await sleep(100);
    m=await J(`({n:MC3DVIEW.ST.sections[0].n.toArray().map(v=>Math.round(v)),act:MC3DVIEW.ST.sections[0].active})`);
    ck(m.n[1]===-1&&m.act!==false,'단면 뒤집기·활성 '+JSON.stringify(m));
    await J(`document.querySelector('#sections [data-a="del"]').click();'ok'`); await sleep(100);
    ck((await J(`MC3DVIEW.ST.sections.length`))===0,'단면 목록 ✕ → 삭제');
    // ---- 선택만 보기 ----
    await J(`MC3DVIEW.setTool('select');MC3DVIEW.select(null);MC3DVIEW.selectById('freeform',__F().masses[1].id);MC3DVIEW.menuCmd('isolate');'ok'`); await sleep(100);
    m=await J(`__F().masses.map(x=>MC3DVIEW.findGroup('freeform',x.id).visible)`);
    ck(m[0]===false&&m[1]===true&&m[2]===false,'선택만 보기 → 나머지 숨김 '+JSON.stringify(m));
    await J(`MC3DVIEW.menuCmd('isolate');'ok'`); await sleep(100);
    ck((await J(`__F().masses.every(x=>MC3DVIEW.findGroup('freeform',x.id).visible)`)),'선택만 보기 해제 → 전부 보임');
    // ---- 장면 애니메이션 ----
    await J(`localStorage.setItem('minicad.3d.scenes','[]');window.prompt=()=>'A';MC3DVIEW.sceneAdd('A');MC3DVIEW.setView('front');MC3DVIEW.sceneAdd('B');MC3DVIEW.setView('top');MC3DVIEW.menuCmd('anim-play');'ok'`); await sleep(700);
    m=await J(`({anim:!!MC3DVIEW.ST.anim,st:__st()})`);
    ck(m.anim&&/애니메이션/.test(m.st),'애니메이션 재생 중 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(100);
    ck(!(await J(`!!MC3DVIEW.ST.anim`)),'Esc → 애니메이션 정지');
    // ---- 그림자: 날짜·밝기·어둡기 ----
    await J(`(()=>{ var d=document.getElementById('st-date'); d.value='11'; d.dispatchEvent(new Event('input')); var l=document.getElementById('st-light'); l.value='100'; l.dispatchEvent(new Event('input')); var k=document.getElementById('st-dark'); k.value='90'; k.dispatchEvent(new Event('input')); })()`); await sleep(100);
    m=await J(`({month:MC3DVIEW.ST.sunMonth,light:MC3DVIEW.ST.sunLight,dark:MC3DVIEW.ST.sunDark})`);
    ck(m.month===11&&m.light===1&&m.dark===0.9,'그림자 날짜 12월 · 밝기 · 어둡기 '+JSON.stringify(m));
    // ---- 개체 정보: 부피 · 그림자 ----
    await J(`MC3DVIEW.select(null);MC3DVIEW.selectById('freeform',__F().masses[0].id);'ok'`); await sleep(100);
    m=await J(`({vol:document.getElementById('props').textContent.includes('2.560 ㎥'),sel:!!document.querySelector('#props [data-f="shadow"]')})`);
    ck(m.vol&&m.sel,'개체 정보 부피 2.560㎥ · 그림자 선택 '+JSON.stringify(m));
    await J(`var s=document.querySelector('#props [data-f="shadow"]');s.value='none';s.dispatchEvent(new Event('change'));'ok'`); await sleep(200);
    m=await J(`(()=>{ var g=MC3DVIEW.findGroup('freeform',__F().masses[0].id); return {shadow:__F().masses[0].shadow,cast:g.children[0].castShadow,recv:g.children[0].receiveShadow}; })()`);
    ck(m.shadow==='none'&&m.cast===false&&m.recv===false,'그림자 없음 → 메시 castShadow/receiveShadow 꺼짐 '+JSON.stringify(m));
    // ---- 모델 정보 통계 · 정리 ----
    await J(`MC3DVIEW.FF.free.comps=[{id:'cp_unused',name:'안씀',masses:[]}];MC3DVIEW.menuCmd('modelinfo');'ok'`); await sleep(100);
    m=await J(`document.getElementById('mi-stats').textContent`);
    ck(/매스 3/.test(m)&&/미사용 1/.test(m),'모델 정보 통계 (매스 3 · 미사용 컴포넌트 1)');
    await J(`document.getElementById('mi-purge').click();'ok'`); await sleep(150);
    ck((await J(`__F().comps.length`))===0,'정리 → 미사용 컴포넌트 제거');
    await J(`document.getElementById('mi-close').click();'ok'`);
    // ---- OBJ 가져오기 (파서 + op) ----
    const obj='o cube\\nv 0 0 0\\nv 1000 0 0\\nv 1000 500 0\\nv 0 500 0\\nv 0 0 -700\\nv 1000 0 -700\\nv 1000 500 -700\\nv 0 500 -700\\nf 1 4 3 2\\nf 5 6 7 8\\nf 1 2 6 5\\nf 2 3 7 6\\nf 3 4 8 7\\nf 4 1 5 8\\n';
    m=await J(`(()=>{ var r=MC3DVIEW.ffParseOBJ("${obj}",1); var n0=__F().masses.length; MC3DVIEW.emitEdit({type:'edit',op:'massfromfaces',floorId:'freeform',patch:{faces:r[0].faces,name:r[0].name}}); var mm=__F().masses[__F().masses.length-1]; return {groups:r.length,faces:r[0].faces.length,added:__F().masses.length-n0,name:mm.name,vol:massVolume(mm,{ch:2400,fh:2800,fl:0}),h:mm.h_mm}; })()`);
    ck(m.groups===1&&m.faces===6&&m.added===1&&m.name==='cube'&&Math.abs(m.vol-0.35)<0.01&&m.h===500,'OBJ 가져오기 → 매스 (1000×700×500 = 0.35㎥) '+JSON.stringify(m));
    // ---- 새로고침 복원 (이미지 재질 포함) ----
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await sleep(300);
    m=await J(`({mats:(MC3DVIEW.FF.free.mats||[]).length,masses:MC3DVIEW.FF.free.masses.length,img:!!document.querySelector('#paintpal [data-cat="img"]')})`);
    ck(m.mats===1&&m.masses===4&&m.img,'새로고침 → 이미지 재질·매스 복원 '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 3차 E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
