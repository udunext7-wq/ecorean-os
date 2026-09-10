// 작업 평면·방향기 E2E — 바닥/정면/측면 순서로 객체가 만들어지는가 + 방향기로 방향이 잡히는가
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9380}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__vcb=v=>{document.querySelector('#vcb .v-v').value=String(v);};window.__F=()=>MC3DVIEW.FF.free;window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));'ok'`);
    // 방향기 막대가 있고 기본은 자동
    let m=await J(`(()=>{var el=document.getElementById('wpbar');return {bar:!!el,btns:el?el.querySelectorAll('[data-wp]').length:0,auto:!MC3DVIEW.ST.wp,on:el?el.querySelector('[data-wp="auto"]').classList.contains('on'):false}})()`);
    ck(m.bar&&m.btns===7&&m.auto&&m.on,'방향기 막대 · 기본 자동 '+JSON.stringify(m));
    // 자동일 때는 종전 그대로 (바닥에 사각형 → 파랑으로 자람)
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(0,0);__mv(2000,1500);__cl(2000,1500);__vcb('900');MC3DVIEW.commitActive(900);'ok'`); await sleep(300);
    m=await J(`(()=>{var ms=__F().masses;return {n:ms.length,h:ms[0]&&ms[0].h_mm,planes:(__F().planes||[]).length}})()`);
    ck(m.n===1&&m.h===900&&m.planes===0,'자동 = 종전 바닥 경로 (x,y → z) '+JSON.stringify(m));
    // 정면(XZ) — x,z 로 그리고 초록(y)으로 자란다
    await J(`MC3DVIEW.ffNew();MC3DVIEW.ffSetWP('xz');'ok'`); await sleep(200);
    m=await J(`(()=>{var fr=MC3DVIEW.ffWPFrame();return {kind:MC3DVIEW.ST.wp.kind,n:fr.n,ground:MC3DVIEW.ffWPGround()}})()`);
    ck(m.kind==='xz'&&Math.abs(m.n.y)>0.99&&Math.abs(m.n.z)<0.01&&!m.ground,'정면 평면 = 법선이 초록(y) 축 '+JSON.stringify(m));
    await J(`MC3DVIEW.setView('front');MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(0,0,0);__mv(2000,0,1500);__cl(2000,0,1500);'ok'`); await sleep(300);
    m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,mode:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mode,planes:(__F().planes||[]).length,faces:(__F().planes[0]||{}).sketchFaces&&__F().planes[0].sketchFaces.length})`);
    ck(m.op==='pp'&&m.mode==='extrude3'&&m.planes===1,'정면에 사각형 → 곧바로 법선(초록) 뽑기 '+JSON.stringify(m));
    await J(`__vcb('800');MC3DVIEW.commitActive(800);'ok'`); await sleep(300);
    m=await J(`(()=>{var ms=__F().masses; if(!ms.length) return {n:0}; var vs=ms[0].solidVerts||[]; var ys=vs.map(v=>v.y), zs=vs.map(v=>MC3DVIEW.zNumX?0:v.z);
      return {n:ms.length,dy:Math.round(Math.max.apply(null,ys)-Math.min.apply(null,ys))}; })()`);
    ck(m.n===1&&m.dy===800,'정면 800 → 초록(y) 축으로 800 두께 = x,z → y 순 '+JSON.stringify(m));
    // 측면(YZ) — y,z 로 그리고 빨강(x)으로 자란다
    await J(`MC3DVIEW.ffNew();MC3DVIEW.ffSetWP('yz');MC3DVIEW.setView('right');MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(0,0,0);__mv(0,2000,1200);__cl(0,2000,1200);'ok'`); await sleep(300);
    await J(`__vcb('600');MC3DVIEW.commitActive(600);'ok'`); await sleep(300);
    m=await J(`(()=>{var ms=__F().masses; if(!ms.length) return {n:0}; var vs=ms[0].solidVerts||[]; var xs=vs.map(v=>v.x);
      return {n:ms.length,dx:Math.round(Math.max.apply(null,xs)-Math.min.apply(null,xs))}; })()`);
    ck(m.n===1&&m.dx===600,'측면 600 → 빨강(x) 축으로 600 두께 = y,z → x 순 '+JSON.stringify(m));
    // 방향 뒤집기
    await J(`MC3DVIEW.ffSetWP('xz',null,1,true);'ok'`); await sleep(100);
    const n1=await J(`MC3DVIEW.ffWPFrame().n.y`);
    await J(`MC3DVIEW.ffWPFlip();'ok'`); await sleep(100);
    const n2=await J(`MC3DVIEW.ffWPFrame().n.y`);
    ck(n1*n2<0,'방향 뒤집기 = 법선 반전 ('+n1+' → '+n2+')');
    // W 로 순환
    await J(`MC3DVIEW.ffSetWP('auto',null,1,true);__key('w');'ok'`); await sleep(120);
    const k1=await J(`MC3DVIEW.ST.wp&&MC3DVIEW.ST.wp.kind`);
    await J(`__key('w');'ok'`); await sleep(120);
    const k2=await J(`MC3DVIEW.ST.wp&&MC3DVIEW.ST.wp.kind`);
    ck(k1==='xy'&&k2==='xz','W 로 자동→바닥→정면 순환 ('+k1+' → '+k2+')');
    // 방향기 손잡이 클릭 = 그 축이 자라는 방향
    await J(`MC3DVIEW.ffSetWP('xy',null,1,true);MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();'ok'`); await sleep(200);
    m=await J(`(()=>{ var r=MC3DVIEW.renderer.domElement.getBoundingClientRect(); var C=MC3DVIEW.camera;
      var g=MC3DVIEW.scene.getObjectByName('__wp'); if(!g) return {no:1};
      var h=null; g.traverse(function(o){ if(o.userData&&o.userData.wpAxis==='x'&&o.userData.wpSign===1) h=o; });
      if(!h) return {no:2};
      var w=h.getWorldPosition(new MC3DVIEW.THREE.Vector3()).project(C);
      var x=r.left+(w.x+1)/2*r.width, y=r.top+(1-w.y)/2*r.height;
      __click(x,y);
      return {kind:MC3DVIEW.ST.wp.kind,sign:MC3DVIEW.ST.wp.sign,nx:MC3DVIEW.ffWPFrame().n.x}; })()`);
    ck(m.kind==='yz'&&m.nx>0.99,'방향기 빨강(+x) 손잡이 클릭 → 측면 평면·빨강으로 자람 '+JSON.stringify(m));
    // 원점 옮기기
    await J(`MC3DVIEW.ffWPSetOrigin({x:1000,y:2000,z:500});'ok'`); await sleep(150);
    m=await J(`MC3DVIEW.ST.wp.origin`);
    ck(m.x===1000&&m.y===2000&&m.z===500,'원점 옮기기 '+JSON.stringify(m));
    // 자동 복귀 후 기존 경로 유지
    await J(`MC3DVIEW.ffSetWP('auto');MC3DVIEW.ffNew();MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(0,0);__mv(1500,1000);__cl(1500,1000);__vcb('500');MC3DVIEW.commitActive(500);'ok'`); await sleep(300);
    m=await J(`({n:__F().masses.length,h:__F().masses[0]&&__F().masses[0].h_mm,planes:(__F().planes||[]).length})`);
    ck(m.n===1&&m.h===500&&m.planes===0,'자동 복귀 → 종전 바닥 경로 '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 작업 평면·방향기 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
