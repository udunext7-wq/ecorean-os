// 자유 3D 선 E2E — 높이가 다른 점끼리 곧장 이어진다 (W 자동일 때)
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9398}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__F=()=>MC3DVIEW.FF.free;window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      // 모든 그래프의 3D 선분 목록
      window.__seg3=()=>{var out=[];var F=__F();
        (F.sketchEdges||[]).forEach(function(e){var a=F.sketchPts.find(p=>p.id===e.a),b=F.sketchPts.find(p=>p.id===e.b);if(a&&b)out.push({a:{x:a.x,y:a.y,z:0},b:{x:b.x,y:b.y,z:0},pl:'ground'});});
        (F.planes||[]).forEach(function(pl){(pl.sketchEdges||[]).forEach(function(e){var a=pl.sketchPts.find(p=>p.id===e.a),b=pl.sketchPts.find(p=>p.id===e.b);if(a&&b){var A=planePt(pl,a.x,a.y),B=planePt(pl,b.x,b.y);out.push({a:A,b:B,pl:pl.id,n:pl.n});}});});
        return out.map(function(s){return {a:{x:Math.round(s.a.x),y:Math.round(s.a.y),z:Math.round(s.a.z)},b:{x:Math.round(s.b.x),y:Math.round(s.b.y),z:Math.round(s.b.z)},pl:s.pl,nz:s.n?Math.round(Math.abs(s.n.z)*100)/100:null};});};'ok'`);
    // 상자 두 개 — 높이가 다르다
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
      {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:2000,y:0},{x:2000,y:1500},{x:0,y:1500}],z:3000,name:'A'}},
      {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:5000,y:0},{x:7000,y:0},{x:7000,y:1500},{x:5000,y:1500}],z:1000,name:'B'}}]});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(500);
    ck((await J(`MC3DVIEW.ffFree3()`))===true,'W 자동 = 자유 3D 선 켜짐');
    // A 윗면 꼭짓점(z=3000) → B 윗면 꼭짓점(z=1000) 을 잇는다
    await J(`MC3DVIEW.setTool('line');__mv(2000,1500,3000);'ok'`); await sleep(220);
    let m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,z:s&&s.W&&Math.round(s.W.y*1000),tip:document.getElementById('snaptip').textContent}})()`);
    ck(m.kind==='endpoint'&&m.z===3000&&m.tip==='끝점','첫 점 = A 윗면 꼭짓점 z=3000 (미리보기도 그 자리 · 투영 아님) '+JSON.stringify(m));
    await J(`__cl(2000,1500,3000);'ok'`); await sleep(300);
    m=await J(`(()=>{var op=MC3DVIEW.ST.op;return {op:op&&op.type,free3:!!(op&&op.free3),o:op&&op.fr&&{x:Math.round(op.fr.origin.x),y:Math.round(op.fr.origin.y),z:Math.round(op.fr.origin.z)}}})()`);
    ck(m.op==='line3'&&m.o.z===3000,'공중 점에서 바로 시작 — 바닥으로 투영하지 않음 (z=3000) '+JSON.stringify(m));
    // 뒤에 면이 없는 공중 점에서 시작하는 길 (lineClick 의 자유 3D 분기)
    await J(`__key('Escape');MC3DVIEW.ffLineBegin3({x:2000,y:1500,z:3000},null);'ok'`); await sleep(200);
    m=await J(`(()=>{var op=MC3DVIEW.ST.op;return {op:op&&op.type,free3:!!(op&&op.free3),z:op&&Math.round(op.fr.origin.z),nz:op&&Math.round(Math.abs(op.fr.n.z))}})()`);
    ck(m.op==='line3'&&m.free3&&m.z===3000&&m.nz===1,'면이 없는 공중 점 → 그 높이의 수평 종이에서 시작 '+JSON.stringify(m));
    await J(`__key('Escape');__mv(2000,1500,3000);__cl(2000,1500,3000);'ok'`); await sleep(300);
    // 두 번째 점 = B 윗면 꼭짓점 (z=1000)
    await J(`__mv(5000,0,1000);'ok'`); await sleep(250);
    m=await J(`(()=>{var op=MC3DVIEW.ST.op;return {b3:op&&op.b3&&{x:Math.round(op.b3.x),y:Math.round(op.b3.y),z:Math.round(op.b3.z)},prev:!!(op&&op._p3&&op._p3.visible),vcb:document.querySelector('#vcb .v-l').textContent,len:document.querySelector('#vcb .v-v').value}})()`);
    ck(m.b3&&m.b3.z===1000&&m.prev&&/3D 길이/.test(m.vcb),'두 번째 점(z=1000) 3D 미리보기 '+JSON.stringify(m));
    const want=Math.round(Math.hypot(5000-2000,0-1500,1000-3000));
    ck(Math.abs(parseInt(m.len)-want)<=2,'3D 길이 표시 '+m.len+'mm (계산 '+want+')');
    await J(`__cl(5000,0,1000);'ok'`); await sleep(400);
    m=await J(`__seg3()`);
    const hit=m.find(s=>(s.a.z===3000&&s.b.z===1000)||(s.a.z===1000&&s.b.z===3000));
    ck(!!hit,'높이가 다른 두 점이 실제로 이어졌다 '+JSON.stringify(hit||m.slice(0,3)));
    ck(hit&&((hit.a.x===2000&&hit.a.y===1500&&hit.b.x===5000&&hit.b.y===0)||(hit.b.x===2000&&hit.b.y===1500&&hit.a.x===5000&&hit.a.y===0)),'양 끝이 정확히 그 두 꼭짓점 '+JSON.stringify(hit));
    ck(hit&&hit.nz===0,'두 점을 품은 세로 종이에 들어갔다 (법선 z=0) '+JSON.stringify(hit&&{nz:hit.nz}));
    // 사슬 계속 — 세 번째 점은 바닥 꼭짓점
    m=await J(`(()=>{var op=MC3DVIEW.ST.op;return {op:op&&op.type,a:op&&op.a}})()`);
    ck(m.op==='line3','선 사슬이 이어진다 '+JSON.stringify(m));
    await J(`__mv(7000,1500,0);'ok'`); await sleep(250);
    await J(`__cl(7000,1500,0);'ok'`); await sleep(400);
    m=await J(`__seg3()`);
    const h2=m.find(s=>(s.a.z===1000&&s.b.z===0&&s.b.x===7000)||(s.b.z===1000&&s.a.z===0&&s.a.x===7000));
    ck(!!h2,'세 번째 점(바닥 z=0)까지 이어진다 '+JSON.stringify(h2||m.map(s=>s.a.z+'→'+s.b.z)));
    await J(`__key('Escape');'ok'`); await sleep(150);
    // 같은 높이의 두 공중 점 = 수평 종이
    await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
      {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:2000,y:0},{x:2000,y:1500},{x:0,y:1500}],z:2000,name:'A'}},
      {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:5000,y:0},{x:7000,y:0},{x:7000,y:1500},{x:5000,y:1500}],z:2000,name:'B'}}]});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('line');MC3DVIEW.drawFrame();'ok'`); await sleep(500);
    await J(`__mv(2000,0,2000);'ok'`); await sleep(200); await J(`__cl(2000,0,2000);'ok'`); await sleep(250);
    await J(`__mv(5000,0,2000);'ok'`); await sleep(220); await J(`__cl(5000,0,2000);'ok'`); await sleep(400);
    m=await J(`__seg3()`);
    const h3=m.find(s=>s.a.z===2000&&s.b.z===2000&&Math.abs(s.a.x-s.b.x)===3000);
    ck(!!h3&&h3.nz===1,'같은 높이(z=2000)의 두 공중 점 = 그 높이의 수평 종이 '+JSON.stringify(h3||m));
    await J(`__key('Escape');'ok'`); await sleep(150);
    // 작업 평면을 잡으면 종전대로 투영
    await J(`MC3DVIEW.ffSetWP('xy',null,1,true);'ok'`); await sleep(200);
    ck((await J(`MC3DVIEW.ffFree3()`))===false,'W 를 잡으면 자유 3D 선은 꺼진다 (그 면으로 투영)');
    await J(`MC3DVIEW.setTool('line');__mv(2000,0,2000);'ok'`); await sleep(220);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {proj:!!(s&&s.proj),tip:document.getElementById('snaptip').textContent}})()`);
    ck(m.proj&&/투영/.test(m.tip),'작업 평면이 잡히면 투영 표시 '+JSON.stringify(m));
    await J(`MC3DVIEW.ffSetWP('auto',null,1,true);__key('Escape');'ok'`);
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 자유 3D 선 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
