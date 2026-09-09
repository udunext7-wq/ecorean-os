// 스케치업 100% 6차 E2E — 이름표 기본 OFF · 발광 스냅/스케치 · 안내점 · 스냅 보강
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9363}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__F=()=>MC3DVIEW.FF.free;'ok'`);
    let m=await J(`({labels:MC3DVIEW.ST.labels,btn:document.getElementById('b-label').classList.contains('on')})`);
    ck(m.labels===false&&!m.btn,'이름표 기본 OFF '+JSON.stringify(m));
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:3000,y2:2000}});MC3DVIEW.setView('top');MC3DVIEW.drawFrame();'ok'`); await sleep(200);
    m=await J(`(()=>{ var sp=0,halo=0,thick=0; MC3DVIEW.ST.root.traverse(o=>{ var k=o.userData.obj&&o.userData.obj.kind; if(o.isSprite&&k==='sketchPt') sp++; if(o.isMesh&&k==='sketchEdge'){ halo++; if(o.material.blending!==MC3DVIEW.THREE.AdditiveBlending||o.scale.x>0.02) thick++; } }); return {sp,halo,thick}; })()`);
    ck(m.sp===4&&m.halo===4&&m.thick===0,'스케치 점=발광 스프라이트 4 · 선=얇은 발광 헤일로 4 '+JSON.stringify(m));
    await J(`MC3DVIEW.setTool('line');var p=__pt(3000,2000);__ev('pointermove',p.x+3,p.y+2);MC3DVIEW.drawFrame();'ok'`); await sleep(100);
    m=await J(`(()=>{ var s=null; MC3DVIEW.scene.children.forEach(o=>{ if(o.isSprite&&o.visible&&o.userData.px===18) s=o; }); return s?{ok:true,col:s.material.color.getHexString(),sz:s.scale.x<0.05}:{ok:false}; })()`);
    ck(m.ok&&m.col==='2fa84f'&&m.sz,'끝점 호버 → 발광 스냅 마커(초록, 화면 고정 크기) '+JSON.stringify(m));
    // 안내점: 줄자 Ctrl+클릭
    await J(`MC3DVIEW.setTool('tape');var p=__pt(5000,5000);__click(p.x,p.y,{ctrlKey:true});'ok'`); await sleep(150);
    m=await J(`({gp:(MC3DVIEW.ST.guidePts||[]).length,snap:(MC3DVIEW.ST.snapData.freeform.gpts||[]).length})`);
    ck(m.gp===1&&m.snap===1,'빈 바닥에 줄자 Ctrl+클릭 → 안내점 + 스냅 등록 '+JSON.stringify(m));
    m=await J(`MC3DVIEW.snap3('freeform',{x:5012,y:4990},0).kind`);
    ck(m==='guide','안내점 근처 → guide 스냅');
    await J(`MC3DVIEW.setTool('erase');var p=__pt(5000,5000);__click(p.x,p.y);'ok'`); await sleep(150);
    ck((await J(`(MC3DVIEW.ST.guidePts||[]).length`))===0,'지우개 → 안내점 삭제');
    // 다면체 매스의 밑둘레 실좌표 스냅 (bbox 아님)
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'massfromfaces',floorId:'freeform',patch:{faces:[[{x:6000,y:0,z:0},{x:8000,y:0,z:0},{x:7000,y:1500,z:0}],[{x:6000,y:0,z:0},{x:7000,y:500,z:900},{x:8000,y:0,z:0}],[{x:8000,y:0,z:0},{x:7000,y:500,z:900},{x:7000,y:1500,z:0}],[{x:7000,y:1500,z:0},{x:7000,y:500,z:900},{x:6000,y:0,z:0}]],name:'피라미드'}});'ok'`); await sleep(200);
    m=await J(`({apex:MC3DVIEW.snap3('freeform',{x:7005,y:505},0).kind,base:MC3DVIEW.snap3('freeform',{x:7005,y:1495},0).kind,bboxCorner:MC3DVIEW.snap3('freeform',{x:6003,y:1497},0).kind})`);
    ck(m.base==='endpoint'&&m.bboxCorner!=='endpoint'&&m.apex!=='endpoint','다면체 스냅 = 진짜 밑둘레 꼭짓점(bbox 모서리·꼭대기는 아님) '+JSON.stringify(m));
    await J(`MC3DVIEW.ST.gridMM=50;'ok'`);
    ck((await J(`MC3DVIEW.snap3('freeform',{x:12333,y:12333},0).x`))===12350,'격자 설정(50) 반영');
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 6차 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
