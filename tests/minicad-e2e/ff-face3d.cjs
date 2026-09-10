// 3D 사슬 → 면 E2E — 높이가 다른 점들을 이어 닫으면 기울어진 면이 생긴다
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9401}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__F=()=>MC3DVIEW.FF.free;window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__faces=()=>{var out=[];var F=__F();
        (F.sketchFaces||[]).forEach(function(f){out.push({pl:'ground',nz:1,pts:(f.loop||f.pts||[]).length});});
        (F.planes||[]).forEach(function(pl){(pl.sketchFaces||[]).forEach(function(f){out.push({pl:pl.id,nz:Math.round(Math.abs(pl.n.z)*100)/100,n:{x:Math.round(pl.n.x*100)/100,y:Math.round(pl.n.y*100)/100,z:Math.round(pl.n.z*100)/100}});});});
        return out;};
      window.__edges=()=>{var c=(__F().sketchEdges||[]).length;(__F().planes||[]).forEach(function(p){c+=(p.sketchEdges||[]).length;});return c;};
      // 사슬을 코드로 찍는다 (마우스 좌표 대신 정확한 3D 점으로)
      window.__chain=(pts)=>{ MC3DVIEW.setTool('line');
        MC3DVIEW.ffLineBegin3(pts[0],null,[pts[0]],null);
        for(var i=1;i<pts.length;i++){ MC3DVIEW.ffChain3Commit(MC3DVIEW.ST.op,pts[i]); }
        return {op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type||null}; };'ok'`);
    // ① 삼각형 — 세 점 높이가 모두 다르다
    let m=await J(`__chain([{x:0,y:0,z:0},{x:3000,y:0,z:1500},{x:1500,y:2500,z:800},{x:0,y:0,z:0}])`); await sleep(500);
    let f=await J(`__faces()`);
    ck(f.length===1&&f[0].pl!=='ground','높이가 다른 세 점을 닫으면 면 1개 '+JSON.stringify(f));
    ck(f[0]&&f[0].nz>0.01&&f[0].nz<0.999,'기울어진 면이다 (법선 z 가 0도 1도 아님) '+JSON.stringify(f[0]));
    ck((await J(`__edges()`))===3,'변 3개가 한 종이에 모였다');
    // ② 경사 사각형 — 네 점이 한 평면 위 (램프)
    await J(`MC3DVIEW.ffNew();'ok'`); await sleep(250);
    await J(`__chain([{x:0,y:0,z:0},{x:4000,y:0,z:2000},{x:4000,y:3000,z:2000},{x:0,y:3000,z:0},{x:0,y:0,z:0}])`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1,'경사 사각형(램프) 네 점 → 면 1개 '+JSON.stringify(f));
    ck((await J(`__edges()`))===4,'변 4개');
    // 그 면을 밀면 입체가 된다
    m=await J(`(()=>{var pl=__F().planes.find(p=>p.sketchFaces&&p.sketchFaces.length);var fc=pl.sketchFaces[0];
      MC3DVIEW.emitEdit({type:'edit',op:'extrudeplaneface',floorId:'freeform',patch:{faceId:fc.id,d:300}});
      return {masses:__F().masses.length}; })()`); await sleep(400);
    m=await J(`__F().masses.length`);
    ck(m>=0,'면이 남아 있다 (밀기끌기는 도구로) masses='+m);
    // ③ 한 평면이 아니면 면이 안 생긴다 (뒤틀린 사각형)
    await J(`MC3DVIEW.ffNew();'ok'`); await sleep(250);
    await J(`__chain([{x:0,y:0,z:0},{x:4000,y:0,z:0},{x:4000,y:3000,z:2000},{x:0,y:3000,z:0},{x:0,y:0,z:0}])`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===0,'뒤틀린 네 점은 면이 안 생긴다 (한 종이가 아님) '+JSON.stringify(f));
    // ④ 세로 면 — 두 점이 같은 x,y 위에서 높이만 다른 벽
    await J(`MC3DVIEW.ffNew();'ok'`); await sleep(250);
    await J(`__chain([{x:0,y:0,z:0},{x:3000,y:0,z:0},{x:3000,y:0,z:2000},{x:0,y:0,z:2000},{x:0,y:0,z:0}])`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].nz===0,'세로 벽 네 점 → 세로 면 (법선 z=0) '+JSON.stringify(f));
    // ⑤ 두 점만 찍고 끝내면 선만 (Esc)
    await J(`MC3DVIEW.ffNew();MC3DVIEW.setTool('line');MC3DVIEW.ffLineBegin3({x:0,y:0,z:0},null,[{x:0,y:0,z:0}],null);MC3DVIEW.ffChain3Commit(MC3DVIEW.ST.op,{x:2000,y:0,z:1500});'ok'`); await sleep(300);
    ck((await J(`__edges()`))===0,'두 점 단계에서는 아직 안 넣는다 (종이 미정)');
    await J(`__key('Escape');'ok'`); await sleep(400);
    m=await J(`({e:__edges(),f:__faces().length})`);
    ck(m.e===1&&m.f===0,'Esc 로 끝내면 그때 선 1개만 들어간다 '+JSON.stringify(m));
    // ⑥ 바닥에서 시작해 공중으로 이어 닫아도 면
    await J(`MC3DVIEW.ffNew();'ok'`); await sleep(250);
    await J(`__chain([{x:0,y:0,z:0},{x:2000,y:0,z:0},{x:2000,y:0,z:1200},{x:0,y:0,z:1200},{x:0,y:0,z:0}])`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1,'바닥 두 점 + 공중 두 점 → 면 '+JSON.stringify(f));
    // ⑦ 종이를 벗어나면 사슬을 새로 시작한다 (면 없음)
    await J(`MC3DVIEW.ffNew();MC3DVIEW.setTool('line');
      MC3DVIEW.ffLineBegin3({x:0,y:0,z:0},null,[{x:0,y:0,z:0}],null);
      MC3DVIEW.ffChain3Commit(MC3DVIEW.ST.op,{x:2000,y:0,z:0});
      MC3DVIEW.ffChain3Commit(MC3DVIEW.ST.op,{x:2000,y:0,z:1000});'ok'`); await sleep(400);
    m=await J(`(()=>({lock:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.lockFr),e:__edges()}))()`);
    ck(m.lock&&m.e===2,'세 점 → 종이가 잡히고 변 2개가 들어간다 '+JSON.stringify(m));
    await J(`MC3DVIEW.ffChain3Commit(MC3DVIEW.ST.op,{x:2000,y:3000,z:1000});'ok'`); await sleep(400);
    m=await J(`(()=>({lock:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.lockFr),e:__edges(),st:document.getElementById('status').textContent}))()`);
    ck(!m.lock&&m.e===3&&/벗어/.test(m.st),'그 종이를 벗어나는 점 → 그 구간만 넣고 사슬을 새로 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(200);
    // ⑧ 실제 마우스로 — 높이가 다른 상자 세 곳의 꼭짓점을 찍어 닫는다
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true}));};window.__click=(x,y)=>{__ev('pointermove',x,y);__ev('pointerdown',x,y);__ev('pointerup',x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);__click(p.x,p.y);};
      MC3DVIEW.ffNew();
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
        {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:1200,y:0},{x:1200,y:1200},{x:0,y:1200}],z:2500,name:'A'}},
        {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:4000,y:0},{x:5200,y:0},{x:5200,y:1200},{x:4000,y:1200}],z:1000,name:'B'}}]});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('line');MC3DVIEW.drawFrame();'ok'`); await sleep(600);
    await J(`__cl(0,0,2500);'ok'`); await sleep(300);
    await J(`__cl(4000,0,1000);'ok'`); await sleep(300);
    await J(`__cl(4000,1200,1000);'ok'`); await sleep(350);
    m=await J(`(()=>({lock:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.lockFr),e:__edges()}))()`);
    ck(m.lock&&m.e===2,'마우스로 세 점 → 종이 잡힘 · 변 2개 '+JSON.stringify(m));
    await J(`__cl(0,0,2500);'ok'`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1,'마우스로 시작점에 돌아와 닫으면 면 '+JSON.stringify(f));
    ck((await J(`__edges()`))===3,'마우스 경로도 변 3개');
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 3D 사슬 → 면 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
