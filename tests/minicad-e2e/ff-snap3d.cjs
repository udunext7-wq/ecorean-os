// 모든 점·선 3D 스냅 E2E — 공중의 꼭짓점·모서리도 잡히고, 그리는 면으로 투영되며, 표시는 가늘다
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9392}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__F=()=>MC3DVIEW.FF.free;window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__tip=()=>{var t=document.getElementById('snaptip');return {d:t.style.display,txt:t.textContent};};
      window.__proj=()=>{var f=null;MC3DVIEW.scene.traverse(function(x){if(x.isLine&&x.renderOrder===998&&x.visible)f=x;});return !!f;};'ok'`);
    // 키 큰 상자 하나 — 윗면 꼭짓점은 바닥에서 멀리 떨어져 보인다
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:2000,y:0},{x:2000,y:1500},{x:0,y:1500}],z:4000,name:'A'}});MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(400);
    // 모아 놓은 3D 점·모서리
    let m=await J(`(()=>{var A=MC3DVIEW._ffAll3D();return {pts:A.n,edges:A.m}})()`);
    ck(m.pts===8&&m.edges===12,'상자 하나 = 점 8 · 모서리 12 를 3D 로 모은다 '+JSON.stringify(m));
    // 바닥 그리기 중 공중의 윗면 꼭짓점이 잡힌다 (투영)
    await J(`MC3DVIEW.setTool('line');__mv(2000,1500,4000);'ok'`); await sleep(200);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,z:s&&s.W&&Math.round(s.W.y*1000),tip:__tip()}})()`);
    ck(m.kind==='endpoint'&&m.z===4000&&m.tip.txt==='끝점','공중 꼭짓점(z=4000) → 그 자리에 끝점 기호 (자유 3D 선이라 투영 아님) '+JSON.stringify(m));
    // 그 자리를 클릭하면 바닥이 아니라 그 3D 점에서 시작한다
    await J(`(()=>{var p=__pt(2000,1500,4000);__click(p.x,p.y);return 1})()`); await sleep(250);
    m=await J(`(()=>{var op=MC3DVIEW.ST.op;return {op:op&&op.type,z:op&&op.fr&&Math.round(op.fr.origin.z)}})()`);
    ck(m.op==='line3'&&m.z===4000,'클릭 → 투영하지 않고 그 3D 점(z=4000)에서 시작 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(150);
    // 공중의 윗면 모서리 중간점도 잡힌다
    await J(`__mv(1000,1500,4000);'ok'`); await sleep(200);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,z:s&&s.W&&Math.round(s.W.y*1000),tip:__tip().txt}})()`);
    ck((m.kind==='midpoint'||m.kind==='endpoint')&&m.z===4000,'공중 윗면 모서리 중간점도 그 자리에서 잡힌다 '+JSON.stringify(m));
    // 세로 모서리 중간 높이도 잡힌다
    await J(`__mv(0,0,2000);'ok'`); await sleep(200);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,z:s&&s.W&&Math.round(s.W.y*1000),tip:__tip().txt}})()`);
    ck(m.kind==='edge'&&m.z>800&&m.z<3200&&m.tip==='선 위','세로 모서리의 중간 높이도 「선 위」로 그 자리에서 잡힌다 '+JSON.stringify(m));
    // 작업 평면을 잡으면 투영 + 점선 안내 (자유 3D 선이 꺼진다)
    await J(`__key('Escape');MC3DVIEW.ffSetWP('xy',null,1,true);MC3DVIEW.setTool('line');__mv(2000,1500,4000);'ok'`); await sleep(250);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,pz:s&&s.proj&&Math.round(s.proj.z),tip:__tip().txt,line:__proj()}})()`);
    ck(m.kind==='endpoint'&&m.pz===4000&&/투영/.test(m.tip)&&m.line,'작업 평면을 잡으면 그 면으로 투영 + 점선 안내 '+JSON.stringify(m));
    await J(`MC3DVIEW.ffSetWP('auto',null,1,true);'ok'`); await sleep(150);
    // 바닥 위 것은 종전대로 투영이 아니라 진짜 스냅
    await J(`__mv(2000,1500,0);'ok'`); await sleep(200);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,proj:s&&s.proj,tip:__tip().txt,line:__proj()}})()`);
    ck(m.kind==='endpoint'&&!m.proj&&m.tip==='끝점'&&!m.line,'바닥 위 점은 종전대로 진짜 끝점 (투영 아님) '+JSON.stringify(m));
    // 벽면 위에 그릴 때도 다른 곳의 점이 잡힌다
    await J(`__key('Escape');MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:5000,y:0},{x:7000,y:0},{x:7000,y:1500},{x:5000,y:1500}],z:900,name:'B'}});MC3DVIEW.drawFrame();'ok'`); await sleep(350);
    await J(`MC3DVIEW.setTool('line');MC3DVIEW.setView('right');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();__cl(2000,300,1000);'ok'`); await sleep(300);
    m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,nx:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.fr&&Math.abs(MC3DVIEW.ST.op.fr.n.x)})`);
    ck(m.op==='line3'&&m.nx>0.99,'오른쪽 벽면 위 그리기 시작 '+JSON.stringify(m));
    await J(`__mv(7000,1500,900);'ok'`); await sleep(220);
    m=await J(`(()=>{var op=MC3DVIEW.ST.op,s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,bx:op&&op.b3&&Math.round(op.b3.x),bz:op&&op.b3&&Math.round(op.b3.z),prev:!!(op&&op._p3&&op._p3.visible)}})()`);
    ck(m.kind==='endpoint'&&m.bx===7000&&m.prev,'벽면에 그리는 중 다른 상자(x=7000)의 점이 잡혀 3D 로 이어진다 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`);
    // 가늘어졌나
    m=await J(`(()=>{MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('line');var p=__pt(2000,1500,0);__ev('pointermove',p.x,p.y);
      var sh=null,ring=null,edge=null;
      MC3DVIEW.scene.traverse(function(x){ if(x.isSprite&&x.visible&&x.userData.shape) sh=x.userData.px; if(x.isSprite&&x.visible&&x.renderOrder===1001) ring=x.userData.px; if(x.isMesh&&x.visible&&x.renderOrder===999) edge=x.scale.x; });
      return {shape:sh,ring:ring,edgeR:edge}; })()`);
    ck(m.shape===10&&m.ring===22,'표시가 가늘어짐 — 기호 10px · 링 22px (종전 13 · 30) '+JSON.stringify(m));
    // 큰 모델에서도 반응이 살아 있나
    m=await J(`(()=>{ MC3DVIEW.ffNew(); var ops=[]; for(var i=0;i<600;i++){ var x=(i%25)*1500,y=Math.floor(i/25)*1500;
        ops.push({op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:x,y:y},{x:x+1000,y:y},{x:x+1000,y:y+1000},{x:x,y:y+1000}],z:1000,name:'M'+i}}); }
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'g',ops:ops}); MC3DVIEW.setView('iso'); MC3DVIEW.fitView(true); MC3DVIEW.drawFrame();
      var A=MC3DVIEW._ffAll3D(); var r=MC3DVIEW.renderer.domElement.getBoundingClientRect();
      var t0=performance.now(); for(var k=0;k<20;k++) MC3DVIEW._ffPick3D(r.left+r.width/2,r.top+r.height/2); var ms=(performance.now()-t0)/20;
      return {pts:A.n,edges:A.m,ms:Math.round(ms*100)/100}; })()`);
    ck(m.pts>4000&&m.ms<25,'매스 600개(점 '+m.pts+' · 모서리 '+m.edges+') 에서 한 번 찾기 '+m.ms+'ms');
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 모든 점·선 3D 스냅 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
