// 방향키 축 E2E — 자동 작업 평면에서 선은 세계 축 고정, 도형은 면 바꾸기
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9415}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true}));};window.__click=(x,y)=>{__ev('pointermove',x,y);__ev('pointerdown',x,y);__ev('pointerup',x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__key=(k)=>window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));window.__vcb=v=>{document.querySelector('#vcb .v-v').value=String(v);};window.__F=()=>MC3DVIEW.FF.free;
      window.__seg3=()=>{var out=[];var F=__F();(F.sketchEdges||[]).forEach(function(e){var a=F.sketchPts.find(p=>p.id===e.a),b=F.sketchPts.find(p=>p.id===e.b);if(a&&b)out.push({a:{x:a.x,y:a.y,z:0},b:{x:b.x,y:b.y,z:0}});});(F.planes||[]).forEach(function(pl){(pl.sketchEdges||[]).forEach(function(e){var a=pl.sketchPts.find(p=>p.id===e.a),b=pl.sketchPts.find(p=>p.id===e.b);if(a&&b){var A=planePt(pl,a.x,a.y),B=planePt(pl,b.x,b.y);out.push({a:A,b:B});}});});return out.map(function(s){return {a:{x:Math.round(s.a.x),y:Math.round(s.a.y),z:Math.round(s.a.z)},b:{x:Math.round(s.b.x),y:Math.round(s.b.y),z:Math.round(s.b.z)}};});};
      window.__op=()=>{var op=MC3DVIEW.ST.op;if(!op)return null;var o={type:op.type,axis3:op.axis3||null,axisPlane:op.axisPlane||null};if(op.fr){o.n={x:Math.round(op.fr.n.x*100)/100,y:Math.round(op.fr.n.y*100)/100,z:Math.round(op.fr.n.z*100)/100};}if(op.b3)o.b3={x:Math.round(op.b3.x),y:Math.round(op.b3.y),z:Math.round(op.b3.z)};if(op.type==='rect3'||op.type==='line3'){var P=planePt(op.fr,op.a.u,op.a.v);o.P={x:Math.round(P.x),y:Math.round(P.y),z:Math.round(P.z)};}if(op.type==='shape3'){var Q=planePt(op.fr,op.pts[0].u,op.pts[0].v);o.P={x:Math.round(Q.x),y:Math.round(Q.y),z:Math.round(Q.z)};}return o;};'ok'`);
    // 상자 하나 (윗면 z=2000)
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:2000,y:0},{x:2000,y:1500},{x:0,y:1500}],z:2000,name:'A'}});MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(500);
    ck(!(await J(`MC3DVIEW.ST.wp`)),'작업 평면 = 자동');
    // ───── 선: 윗면 꼭짓점에서 시작 → ↑ 파랑 고정 → 숫자 800
    await J(`MC3DVIEW.setTool('line');__cl(2000,1500,2000);'ok'`); await sleep(300);
    let m=await J(`__op()`);
    ck(m&&m.type==='line3'&&m.P.z===2000,'윗면 꼭짓점(z=2000)에서 선 시작 '+JSON.stringify(m));
    await J(`__mv(2000,1500,3200);'ok'`); await sleep(120);           // 커서를 위쪽에 둔다 (방향 부호)
    await J(`__key('ArrowUp');'ok'`); await sleep(250);
    m=await J(`__op()`);
    ck(m.axis3==='z'&&m.b3&&m.b3.x===2000&&m.b3.y===1500&&m.b3.z>2000,'↑ = 파랑(Z) 축 고정 · 목표가 그 축 위 '+JSON.stringify(m));
    // 커서를 옆으로 옮겨도 x,y 는 그대로
    await J(`__mv(3500,1500,3000);'ok'`); await sleep(150);
    m=await J(`__op()`);
    ck(m.b3.x===2000&&m.b3.y===1500,'커서를 옆으로 옮겨도 축 위에 머문다 '+JSON.stringify(m.b3));
    await J(`__vcb('800');MC3DVIEW.commitActive(800);'ok'`); await sleep(450);
    let s;
    m=await J(`__op()`);
    ck(m&&m.type==='line3'&&m.P.z===2800&&!m.axis3,'끝점에서 사슬이 이어지고 고정은 풀린다 '+JSON.stringify(m));
    // → 빨강 고정 → 숫자 1500
    await J(`__mv(3800,1500,2800);'ok'`); await sleep(120);
    await J(`__key('ArrowRight');'ok'`); await sleep(250);
    m=await J(`__op()`);
    ck(m.axis3==='x'&&m.b3&&m.b3.y===1500&&m.b3.z===2800&&m.b3.x>2000,'→ = 빨강(X) 축 고정 '+JSON.stringify(m.b3));
    await J(`__vcb('1500');MC3DVIEW.commitActive(1500);'ok'`); await sleep(450);
    s=await J(`__seg3()`);
    let e1=s.find(q=>(q.a.z===2000&&q.b.z===2800)||(q.a.z===2800&&q.b.z===2000));
    ck(!!e1&&e1.a.x===2000&&e1.b.x===2000&&e1.a.y===1500&&e1.b.y===1500,'숫자 800 → 파랑 축으로 정확히 800 (2000→2800, 세 번째 점에서 함께 들어감) '+JSON.stringify(e1||s));
    let e2=s.find(q=>(q.a.x===2000&&q.b.x===3500&&q.a.z===2800&&q.b.z===2800)||(q.b.x===2000&&q.a.x===3500&&q.a.z===2800));
    ck(!!e2,'빨강 축으로 1500 (x 2000→3500, z 2800 유지) '+JSON.stringify(e2||s));
    // ← 초록 고정 → 음수 = 반대 방향
    await J(`__mv(3500,3000,2800);'ok'`); await sleep(120);
    await J(`__key('ArrowLeft');'ok'`); await sleep(250);
    m=await J(`__op()`);
    ck(m.axis3==='y'&&m.b3&&m.b3.x===3500&&m.b3.z===2800,'← = 초록(Y) 축 고정 '+JSON.stringify(m.b3));
    await J(`__vcb('-1000');MC3DVIEW.commitActive(-1000);'ok'`); await sleep(450);
    s=await J(`__seg3()`);
    let e3=s.find(q=>q.a.x===3500&&q.b.x===3500&&Math.abs(q.a.y-q.b.y)===1000);
    ck(!!e3&&(e3.a.y===500||e3.b.y===500),'음수 = 반대 방향 (y 1500→500) '+JSON.stringify(e3||s));
    // 같은 키 두 번 = 해제
    await J(`__key('ArrowLeft');'ok'`); await sleep(120);
    ck((await J(`__op()`)).axis3==='y','← 다시 = 고정');
    await J(`__key('ArrowLeft');'ok'`); await sleep(120);
    ck(!(await J(`__op()`)).axis3,'← 한 번 더 = 해제');
    await J(`__key('ArrowUp');'ok'`); await sleep(120); await J(`__key('ArrowDown');'ok'`); await sleep(120);
    ck(!(await J(`__op()`)).axis3,'↓ = 해제');
    // 모델의 점 위에 두면 그 점을 축에 투영 (From Point)
    await J(`__key('ArrowUp');'ok'`); await sleep(100);
    await J(`__mv(0,0,2000);'ok'`); await sleep(200);           // 상자 반대편 윗면 꼭짓점(z=2000) 위에 커서
    m=await J(`(()=>{var op=MC3DVIEW.ST.op;return {b3z:op.b3&&Math.round(op.b3.z),tip:document.getElementById('snaptip').textContent}})()`);
    ck(m.b3z===2000&&/투영/.test(m.tip),'다른 점 위에 커서 → 그 점의 높이(z=2000)를 축에 투영 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(200);
    // ───── 도형: 사각형 첫 점을 윗면에 찍고 → 로 면 바꾸기
    await J(`MC3DVIEW.setTool('rect');__cl(2000,1500,2000);'ok'`); await sleep(300);
    m=await J(`__op()`);
    ck(m&&m.type==='rect3'&&Math.abs(m.n.z)===1,'윗면에 사각형 첫 점 (수평 면) '+JSON.stringify(m));
    await J(`__key('ArrowRight');'ok'`); await sleep(250);
    m=await J(`__op()`);
    ck(m&&m.type==='rect3'&&Math.abs(m.n.x)===1&&m.P.x===2000&&m.P.y===1500&&m.P.z===2000&&m.axisPlane==='x','→ = 빨강에 수직인 면(초록·파랑)으로, 첫 점은 그대로 '+JSON.stringify(m));
    await J(`__key('ArrowLeft');'ok'`); await sleep(250);
    m=await J(`__op()`);
    ck(m&&Math.abs(m.n.y)===1&&m.P.z===2000,'← = 초록에 수직인 면(빨강·파랑) '+JSON.stringify(m));
    await J(`__key('ArrowUp');'ok'`); await sleep(250);
    m=await J(`__op()`);
    ck(m&&Math.abs(m.n.z)===1&&m.P.z===2000,'↑ = 수평 면 (z=2000 높이) '+JSON.stringify(m));
    // 빨강·파랑 면에서 두 번째 점을 찍어 사각형 완성 → 세로 면 생성
    await J(`__key('ArrowLeft');'ok'`); await sleep(200);
    await J(`__mv(3400,1500,2900);__cl(3400,1500,2900);'ok'`); await sleep(500);
    m=await J(`(()=>{var pl=(__F().planes||[]).find(p=>p.sketchFaces&&p.sketchFaces.length&&Math.abs(p.n.y)>0.99);return {face:!!pl,op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,mode:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mode}})()`);
    ck(m.face&&m.op==='pp'&&m.mode==='extrude3','두 번째 점 → 빨강·파랑 면에 사각형 → 바로 뽑기 단계 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(200);
    // ───── 원: 점을 찍기 전에 ← 예약 → 클릭하면 바로 그 면
    await J(`MC3DVIEW.setTool('circle');__key('ArrowLeft');'ok'`); await sleep(150);
    ck((await J(`MC3DVIEW.ST.axisNext`))==='y','점 찍기 전 ← = 다음 도형의 면 예약');
    await J(`__cl(2000,1500,2000);'ok'`); await sleep(350);
    m=await J(`__op()`);
    ck(m&&m.type==='shape3'&&Math.abs(m.n.y)===1&&m.P.z===2000&&!(await J(`MC3DVIEW.ST.axisNext`)),'클릭하자 그 면(빨강·파랑)에 원 시작 · 예약 해제 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(200);
    // ───── 바닥 사각형: → 로 세로 면, ↑ 로 다시 바닥
    await J(`MC3DVIEW.setTool('rect');__cl(5000,0,0);'ok'`); await sleep(300);
    m=await J(`__op()`);
    ck(m&&m.type==='line','바닥에 사각형 첫 점 (바닥 도구) '+JSON.stringify(m));
    await J(`__key('ArrowRight');'ok'`); await sleep(250);
    m=await J(`__op()`);
    ck(m&&m.type==='rect3'&&Math.abs(m.n.x)===1&&m.P.x===5000&&m.P.z===0,'→ = 바닥 점에서 세로 면 '+JSON.stringify(m));
    await J(`__key('ArrowUp');'ok'`); await sleep(250);
    m=await J(`(()=>{var op=MC3DVIEW.ST.op;return {type:op&&op.type,rect:op&&op.rect,a:op&&op.a}})()`);
    ck(m.type==='line'&&m.rect&&m.a&&m.a.x===5000,'↑ = 다시 바닥 사각형 (같은 점) '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(150);
    // ───── 작업 평면을 잡아 두면 방향키는 종전 동작
    await J(`MC3DVIEW.ffSetWP('xy',null,1,true);MC3DVIEW.setTool('rect');__cl(6000,0,0);'ok'`); await sleep(300);
    const before=await J(`__op()`);
    await J(`__key('ArrowRight');'ok'`); await sleep(200);
    const after=await J(`__op()`);
    ck(before&&after&&before.type===after.type&&!after.axisPlane,'작업 평면이 잡혀 있으면 면 바꾸기는 안 한다 '+JSON.stringify(after));
    await J(`__key('Escape');MC3DVIEW.ffSetWP('auto',null,1,true);'ok'`);
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 방향키 축 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
