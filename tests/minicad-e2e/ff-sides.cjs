// 다각형 변 수 E2E — "Ns" 를 찍기 전·그리는 중·그린 뒤 언제 넣어도 먹는다 (바닥·면 위 둘 다) + 개체 정보에서 바꾸기
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9435}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true}));};window.__click=(x,y)=>{__ev('pointermove',x,y);__ev('pointerdown',x,y);__ev('pointerup',x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__F=()=>MC3DVIEW.FF.free;
      window.__type=(s)=>{ var i=document.querySelector('#vcb .v-v'); i.value=s; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
      window.__keyWin=(k)=>window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));
      window.__faces=()=>{var out=[];var F=__F();(F.sketchFaces||[]).forEach(f=>out.push({n:f.pts.length,gen:f.gen||null,pl:false}));(F.planes||[]).forEach(pl=>(pl.sketchFaces||[]).forEach(f=>out.push({n:f.pts.length,gen:f.gen||null,pl:true})));return out;};
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(300);
    // ── ① 찍기 전에 "5s" Enter → 다음 다각형이 5각
    await J(`MC3DVIEW.setTool('polygon');'ok'`); await sleep(100);
    await J(`__type('5s');'ok'`); await sleep(150);
    let m=await J(`({sides:MC3DVIEW.ST.polySides,op:!!MC3DVIEW.ST.op,st:document.getElementById('status').textContent.slice(0,40)})`);
    ck(m.sides===5&&!m.op,'찍기 전 "5s" Enter → 변 수 5 로 (op 없음) '+JSON.stringify(m));
    await J(`__cl(0,0,0);__mv(1500,0,0);__cl(1500,0,0);'ok'`); await sleep(500);
    let f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===5&&f[0].gen&&f[0].gen.n===5&&f[0].gen.kind==='polygon','5각형 면이 생기고 gen 메타(중심·반지름·변 수)가 붙는다 '+JSON.stringify(f));
    await J(`__keyWin('Escape');'ok'`); await sleep(200);
    // ── ② 그리는 중 "7s" Enter → 확정되지 않고 변 수만 바뀐다 (종전엔 반지름 7 로 오해)
    await J(`MC3DVIEW.ffNew();MC3DVIEW.setTool('polygon');__cl(0,0,0);__mv(1200,0,0);'ok'`); await sleep(250);
    await J(`__type('7s');'ok'`); await sleep(150);
    m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,sides:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.sides,faces:__faces().length,st:document.getElementById('status').textContent.slice(0,60)})`);
    ck(m.op==='circle'&&m.sides===7&&m.faces===0&&!/작습니다/.test(m.st),'그리는 중 "7s" Enter = 변 수만 7 로, 아직 확정 안 함 '+JSON.stringify(m));
    await J(`__type('1200');'ok'`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===7&&f[0].gen.n===7,'이어서 1200 Enter → 반지름 1200 의 7각형 '+JSON.stringify(f));
    await J(`__keyWin('Escape');'ok'`); await sleep(200);
    // ── ③ 그린 직후 "9s" Enter → 방금 그린 다각형이 9각으로 (스케치업 후속 입력)
    await J(`__type('9s');'ok'`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===9&&f[0].gen.n===9,'그린 직후 "9s" Enter → 같은 자리 9각형으로 '+JSON.stringify(f));
    // ── ④ 개체 정보에서 변 수 바꾸기 (선택 → 입력 → 재생성 → 재선택)
    await J(`MC3DVIEW.setTool('select');__cl(0,0,0);'ok'`); await sleep(300);
    m=await J(`(()=>{var i=document.querySelector('#props [data-f="_sides"]');return {has:!!i,val:i&&i.value}})()`);
    ck(m.has&&m.val==='9','개체 정보에 「변 수」 입력이 뜬다 (9) '+JSON.stringify(m));
    await J(`(()=>{var i=document.querySelector('#props [data-f="_sides"]');i.value='12';i.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===12&&f[0].gen.n===12&&f[0].gen.r===1200,'12 로 바꾸면 같은 중심·반지름으로 12각형 재생성 '+JSON.stringify(f));
    m=await J(`(()=>{var s=MC3DVIEW.ST.selected;var o=s&&s.userData.obj;var i=document.querySelector('#props [data-f="_sides"]');return {sel:o&&o.kind,val:i&&i.value}})()`);
    ck(m.sel==='sketchFace'&&m.val==='12','재생성된 면이 다시 선택되어 있다 '+JSON.stringify(m));
    // ── ⑤ 원 도구도 "24s" → 원의 분할 수
    await J(`MC3DVIEW.ffNew();MC3DVIEW.setTool('circle');__type('16s');__cl(0,0,0);__mv(1000,0,0);__cl(1000,0,0);'ok'`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===16&&f[0].gen.kind==='circle','원 도구 "16s" → 16분할 원 '+JSON.stringify(f));
    await J(`__keyWin('Escape');'ok'`); await sleep(150);
    // ── ⑥ 면 위(벽면) 다각형도 같은 흐름 — 상자 옆면에 5각형, 그린 뒤 "8s"
    await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],z:2500,name:'W'}});MC3DVIEW.setView('front');MC3DVIEW.fitView(true);MC3DVIEW.setTool('polygon');MC3DVIEW.drawFrame();'ok'`); await sleep(400);
    await J(`__type('5s');'ok'`); await sleep(100);
    await J(`__cl(1500,2000,1200);__mv(2100,2000,1200);__cl(2100,2000,1200);'ok'`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].pl&&f[0].n===5&&f[0].gen&&f[0].gen.n===5,'벽면 위 5각형 + gen '+JSON.stringify(f));
    await J(`__keyWin('Escape');'ok'`); await sleep(200);
    await J(`__type('8s');'ok'`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].pl&&f[0].n===8,'벽면 위 다각형도 그린 직후 "8s" → 8각형 '+JSON.stringify(f));
    // ── ⑦ 벽면 다각형 개체 정보에서 변 수 바꾸기
    await J(`MC3DVIEW.setTool('select');__cl(1500,2000,1200);'ok'`); await sleep(300);
    m=await J(`(()=>{var i=document.querySelector('#props [data-f="_sides"]');return {has:!!i,val:i&&i.value}})()`);
    ck(m.has&&m.val==='8','벽면 다각형도 개체 정보에 변 수 (8) '+JSON.stringify(m));
    await J(`(()=>{var i=document.querySelector('#props [data-f="_sides"]');i.value='6';i.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].pl&&f[0].n===6,'벽면 다각형 6각으로 재생성 '+JSON.stringify(f));
    // ── ⑧ 범위 밖·잘못된 값은 거부 (2s → 최소 3)
    await J(`(()=>{var i=document.querySelector('#props [data-f="_sides"]');i.value='2';i.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`); await sleep(400);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n>=3,'2 는 최소 3 으로 막힌다 '+JSON.stringify(f));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 다각형 변 수 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
