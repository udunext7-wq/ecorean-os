// 팔로우 미 E2E — 단면(면) + 경로(선 사슬) → 매스. 면→선, 선→면, 선 미리 선택→면, 닫힌 고리, 3D 사슬, 매스 둘레(종전)
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9425}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',Object.assign({bubbles:true,clientX:x,clientY:y,detail:1},o||{})));};window.__cl=(x,y,z,o)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y,o);__click(p.x,p.y,o);};window.__key=(k)=>window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));window.__F=()=>MC3DVIEW.FF.free;
      window.__hitKind=(x,y,z)=>{var p=__pt(x,y,z);var h=MC3DVIEW.hitAt?MC3DVIEW.hitAt(p.x,p.y):null;return h&&h.object.userData.obj&&h.object.userData.obj.kind;};
      window.__vol=(m)=>{var S=MC3DVIEW.massSolid?null:null;return null;};
      window.__mass=(i)=>{var ms=__F().masses;var m=ms[i==null?ms.length-1:i];if(!m)return null;var vs=m.solidVerts||[];var xs=vs.map(v=>v.x+m.x),ys=vs.map(v=>v.y+m.y),zs=vs.map(v=>v.z);return {name:m.name,verts:vs.length,faces:(m.solidFaces||[]).length,x0:Math.min.apply(null,xs),x1:Math.max.apply(null,xs),y0:Math.min.apply(null,ys),y1:Math.max.apply(null,ys),z0:Math.min.apply(null,zs),z1:Math.max.apply(null,zs)};};'ok'`);
    // ── 준비: 단면 = x=0 벽면(yz 평면)에 그린 100×200 사각형, 경로 = 바닥 선 +x 3000 → +y 2000 (ㄱ자)
    await J(`(()=>{ var pl=planeFrom({x:0,y:0,z:0},{x:1,y:0,z:0});
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
        {op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:300,y2:400,plane:{origin:pl.origin,ex:pl.ex,ey:pl.ey,n:pl.n}}},
        {op:'sketchline',floorId:'freeform',patch:{x1:0,y1:0,x2:3000,y2:0}},
        {op:'sketchline',floorId:'freeform',patch:{x1:3000,y1:0,x2:3000,y2:2000}}]});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();return 1; })()`); await sleep(500);
    let m=await J(`(()=>{var pl=__F().planes[0];return {faces:pl&&pl.sketchFaces.length,edges:__F().sketchEdges.length,masses:__F().masses.length}})()`);
    ck(m.faces===1&&m.edges===2&&m.masses===0,'준비: 세로 단면 1 · 바닥 선 2 '+JSON.stringify(m));
    // ① 면 클릭 → 선 클릭 (이어진 두 선을 끝까지)
    await J(`MC3DVIEW.setTool('followme');'ok'`);
        let hk=await J(`__hitKind(0,150,200)`); ck(hk==='sketchFace','단면 면 위에 커서 = sketchFace ('+hk+')');
    await J(`__cl(0,150,200);'ok'`); await sleep(300);
    m=await J(`(()=>({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,prof:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.prof)}))()`);
    ck(m.op==='followme'&&m.prof,'① 면 클릭 → 단면 잡음 '+JSON.stringify(m));
    hk=await J(`__hitKind(1500,0,0)`); ck(hk==='sketchEdge','경로 선 위에 커서 = sketchEdge ('+hk+')');
    await J(`__cl(1500,0,0);'ok'`); await sleep(600);
    m=await J(`__mass()`);
    ck(m&&m.verts===12&&m.faces===10,'선 클릭 → ㄱ자 경로 전체(3점)를 따라 매스 (12꼭짓점 10면) '+JSON.stringify(m));
    ck(m&&m.x1===3000&&m.y1===2000&&m.z1===400&&m.z0===0,'범위: x 0~3000 · y ~2000 · z 0~400 '+JSON.stringify(m));
    m=await J(`(()=>({faces:(__F().planes[0]&&__F().planes[0].sketchFaces.length),op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type}))()`);
    ck(m.faces===0&&!m.op,'단면은 소비되고 도구는 대기 상태 '+JSON.stringify(m));
    // ② 선 클릭 → 면 클릭 (반대 순서)
    await J(`MC3DVIEW.ffNew();(()=>{ var pl=planeFrom({x:0,y:0,z:0},{x:1,y:0,z:0});
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
        {op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:300,y2:400,plane:{origin:pl.origin,ex:pl.ex,ey:pl.ey,n:pl.n}}},
        {op:'sketchline',floorId:'freeform',patch:{x1:0,y1:0,x2:2500,y2:0}}]});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('followme');MC3DVIEW.drawFrame();return 1; })()`); await sleep(500);
    await J(`__cl(1200,0,0);'ok'`); await sleep(300);
    m=await J(`(()=>({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,path:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.path),n:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.path&&MC3DVIEW.ST.op.path.pts.length}))()`);
    ck(m.op==='followme'&&m.path&&m.n===2,'② 선 먼저 클릭 → 경로 잡음 (2점) '+JSON.stringify(m));
    await J(`__cl(0,150,200);'ok'`); await sleep(600);
    m=await J(`__mass()`);
    ck(m&&m.verts===8&&m.faces===6&&m.x1===2500,'면 클릭 → 직선 경로 2500 매스 (상자) '+JSON.stringify(m));
    // ③ 선을 미리 골라 두고(Shift) 면 클릭 — 스케치업 순서
    await J(`MC3DVIEW.ffNew();(()=>{ var pl=planeFrom({x:0,y:0,z:0},{x:1,y:0,z:0});
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
        {op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:300,y2:400,plane:{origin:pl.origin,ex:pl.ex,ey:pl.ey,n:pl.n}}},
        {op:'sketchline',floorId:'freeform',patch:{x1:0,y1:0,x2:2000,y2:0}},
        {op:'sketchline',floorId:'freeform',patch:{x1:2000,y1:0,x2:2000,y2:1500}},
        {op:'sketchline',floorId:'freeform',patch:{x1:2000,y1:1500,x2:5000,y2:1500}}]});   // 셋째 선은 고르지 않는다
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('select');MC3DVIEW.drawFrame();return 1; })()`); await sleep(500);
    await J(`__cl(1000,0,0);'ok'`); await sleep(200); await J(`__cl(2000,750,0,{shiftKey:true});'ok'`); await sleep(250);
    m=await J(`(()=>[...MC3DVIEW.ST.selSet].map(g=>g.userData.obj.kind))()`);
    ck(m.length===2&&m.every(k=>k==='sketchEdge'),'선 두 개 미리 선택 '+JSON.stringify(m));
    await J(`MC3DVIEW.setTool('followme');'ok'`); await sleep(100);
    await J(`__cl(0,150,200);'ok'`); await sleep(600);
    m=await J(`__mass()`);
    ck(m&&m.verts===12&&m.x1===2000&&m.y1===1500,'면 클릭 즉시 — 고른 두 선만 따라 (셋째 선 제외: x≤2000) '+JSON.stringify(m));
    // ④ 닫힌 사각 고리 → 테두리 (뚜껑 없음 · 16꼭짓점 16면)
    await J(`MC3DVIEW.ffNew();(()=>{ var pl=planeFrom({x:0,y:0,z:0},{x:1,y:0,z:0});
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
        {op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:300,y2:400,plane:{origin:pl.origin,ex:pl.ex,ey:pl.ey,n:pl.n}}},
        {op:'sketchline',floorId:'freeform',patch:{x1:0,y1:0,x2:4000,y2:0}},
        {op:'sketchline',floorId:'freeform',patch:{x1:4000,y1:0,x2:4000,y2:3000}},
        {op:'sketchline',floorId:'freeform',patch:{x1:4000,y1:3000,x2:0,y2:3000}},
        {op:'sketchline',floorId:'freeform',patch:{x1:0,y1:3000,x2:0,y2:0}}]});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('followme');MC3DVIEW.drawFrame();return 1; })()`); await sleep(500);
    await J(`__cl(0,150,200);'ok'`); await sleep(250); await J(`__cl(2000,0,0);'ok'`); await sleep(700);
    m=await J(`__mass()`);
    ck(m&&m.verts===16&&m.faces===16&&m.x1===4000&&m.y1===3000,'닫힌 고리 → 테두리 매스 (16꼭짓점 16면) '+JSON.stringify(m));
    // ⑤ 3D 사슬 경로 (바닥 → 위로 꺾임) — 파이프가 위로 올라간다
    await J(`MC3DVIEW.ffNew();(()=>{ var pl=planeFrom({x:0,y:0,z:0},{x:1,y:0,z:0});
      MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:300,y2:400,plane:{origin:pl.origin,ex:pl.ex,ey:pl.ey,n:pl.n}}});
      MC3DVIEW.setTool('line'); MC3DVIEW.ffLineBegin3({x:0,y:0,z:0},null,[{x:0,y:0,z:0}],null);
      MC3DVIEW.ffChain3Commit(MC3DVIEW.ST.op,{x:2500,y:0,z:0}); MC3DVIEW.ffChain3Commit(MC3DVIEW.ST.op,{x:2500,y:0,z:1800});
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('followme');MC3DVIEW.drawFrame();return 1; })()`); await sleep(600);
    m=await J(`(()=>{var c=0;(__F().planes||[]).forEach(p=>c+=(p.sketchEdges||[]).length);return {edges:c+__F().sketchEdges.length}})()`);
    ck(m.edges>=3,'3D 사슬(수평→수직) 준비 '+JSON.stringify(m));
    await J(`__cl(0,150,200);'ok'`); await sleep(250);
    await J(`__cl(2500,0,900);'ok'`); await sleep(700);   // 세로 선의 가운데
    m=await J(`__mass()`);
    ck(m&&m.verts===12&&m.x1===2500&&m.z1===1800,'3D 사슬 경로 → 위로 꺾인 파이프 (z 최대 1800) '+JSON.stringify(m));
    // ⑥ 종전 매스 둘레 경로도 그대로
    await J(`MC3DVIEW.ffNew();(()=>{ MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],z:1000,name:'H'}});
      var pl=planeFrom({x:3000,y:0,z:0},{x:1,y:0,z:0});
      MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:200,y2:300,plane:{origin:pl.origin,ex:pl.ex,ey:pl.ey,n:pl.n}}});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('followme');MC3DVIEW.drawFrame();return 1; })()`); await sleep(500);
    await J(`__cl(3000,100,150);'ok'`); await sleep(250);
    await J(`__cl(1500,1000,1000);'ok'`); await sleep(700);   // 매스 윗면
    m=await J(`(()=>({masses:__F().masses.length,last:__mass()}))()`);
    ck(m.masses===2&&m.last&&m.last.verts===16,'매스 윗면 클릭 = 종전 둘레 몰딩 그대로 '+JSON.stringify(m.last));
    // ⑦ 안내문
    m=await J(`(()=>{MC3DVIEW.setTool('followme');return document.getElementById('hint').textContent})()`);
    ck(/경로\(선\)/.test(m)&&/미리 골라/.test(m)||/선을 먼저 골라/.test(m),'안내문에 선 경로·선택 순서');
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 팔로우 미 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
