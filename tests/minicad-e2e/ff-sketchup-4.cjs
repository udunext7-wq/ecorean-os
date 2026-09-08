// 스케치업 100% 5차 E2E — 점·선·면·객체가 클릭 하나로 각각 선택된다 (원시 기하 방식)
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0;
const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{
  const b=await launch({port:9353}); const J=s=>b.evalJS(s);
  try{
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF');
    await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};
      window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__dbl=(x,y)=>{__click(x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:x,clientY:y}));};
      window.__tri=(x,y)=>{MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:3}));};
      window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__st=()=>document.getElementById('status').textContent; window.__F=()=>MC3DVIEW.FF.free; window.__M=()=>__F().masses[0]; window.__P=()=>MC3DVIEW.ST.parts;
      window.__vcb=(v)=>{document.querySelector('#vcb .v-v').value=String(v);};
      window.__W=()=>{var m=__M();return Math.max(...m.pts.map(p=>p.x))-Math.min(...m.pts.map(p=>p.x));};
      window.__setup=()=>{MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[{op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:-1000,y:-1000},{x:1000,y:-1000},{x:1000,y:1000},{x:-1000,y:1000}],z:1000,name:'A'}},{op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:4000,y:-500},{x:5000,y:-500},{x:5000,y:500},{x:4000,y:500}],z:600,name:'B'}}]});MC3DVIEW.setView('right');MC3DVIEW.drawFrame();MC3DVIEW.setTool('select');}; 'ok'`);
    // ---- 클릭 = 면 · 모서리 · 꼭짓점 (그룹 안으로 안 들어가도) ----
    await J(`__setup();'ok'`); await sleep(200);
    await J(`var p=__pt(1000,0,300);__click(p.x,p.y);'ok'`); await sleep(150);
    let m=await J(`({n:__P().length,kind:__P()[0]&&__P()[0].kind,role:__P()[0]&&__P()[0].role,edit:!!MC3DVIEW.ST.editMass,whole:MC3DVIEW.ffWhole(MC3DVIEW.findGroup('freeform',__M().id).userData.obj),props:document.getElementById('props').textContent.slice(0,1)})`);
    ck(m.n===1&&m.kind==='face'&&m.role==='wall'&&!m.edit&&!m.whole&&m.props==='면','클릭 → 옆면 하나 선택 (그룹 안 진입 없이) '+JSON.stringify(m));
    await J(`var p=__pt(1000,0,1000);__click(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({kind:__P()[0]&&__P()[0].kind,props:document.getElementById('props').textContent.slice(0,3)})`);
    ck(m.kind==='edge'&&m.props==='모서리','윗모서리 클릭 → 모서리 선택 '+JSON.stringify(m));
    await J(`var p=__pt(1000,-1000,1000);__click(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({kind:__P()[0]&&__P()[0].kind,p:__P()[0]&&__P()[0].p,props:document.getElementById('props').textContent.slice(0,3)})`);
    ck(m.kind==='vert'&&m.p&&m.p.x===1000&&m.p.z===1000&&m.props==='꼭짓점','모서리 끝 클릭 → 꼭짓점 선택 '+JSON.stringify(m));
    // Shift = 추가 (꼭짓점 + 면)
    await J(`var p=__pt(1000,0,300);__click(p.x,p.y,{shiftKey:true});'ok'`); await sleep(150);
    m=await J(`({n:__P().length,kinds:__P().map(p=>p.kind),props:document.getElementById('props').textContent.slice(0,5)})`);
    ck(m.n===2&&m.kinds.join(',')==='vert,face'&&/2개 요소/.test(m.props),'Shift+클릭 → 꼭짓점+면 2개 선택 '+JSON.stringify(m));
    await J(`var p=__pt(1000,0,300);__click(p.x,p.y,{shiftKey:true});'ok'`); await sleep(100);
    ck((await J(`__P().length`))===1,'Shift+다시 클릭 → 제거');
    // ---- M: 꼭짓점 이동 (↑ 높이 300) → 다면체 ----
    await J(`MC3DVIEW.setTool('move');var p=__pt(1000,-1000,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__key('ArrowUp');__ev('pointermove',p.x,p.y-30);__vcb('300');MC3DVIEW.commitActive(300);'ok'`); await sleep(250);
    m=await J(`({solid:!!__M().solidVerts,h:__M().h_mm,kept:__P().length&&__P()[0].kind==='vert'&&__P()[0].p.z===1300})`);
    ck(m.solid&&m.h===1300&&m.kept,'꼭짓점 ↑ 300 이동 → 다면체 · 높이 1300 · 선택 유지 '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(200);
    // ---- 이동 도구를 선택 없이 면에 대면 그 면이 옮겨진다 (스케치업) ----
    await J(`MC3DVIEW.setTool('select');__key('Escape');MC3DVIEW.select(null);MC3DVIEW.setTool('move');var p=__pt(1000,0,300);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(100);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type+':'+MC3DVIEW.ST.op.face`);
    ck(m==='movesel:true','선택 없이 M 로 면 클릭 → 면 이동 op ('+m+')');
    await J(`var p=__pt(1000,0,300);__ev('pointermove',p.x+30,p.y);__vcb('400');MC3DVIEW.commitActive(400);'ok'`); await sleep(250);
    ck((await J(`__W()`))===2400,'면 400 이동 → 폭 2400');
    // ---- 더블클릭 = 객체 전체 → M 통째 이동 · B 통째 페인트 ----
    await J(`MC3DVIEW.setTool('select');var p=__pt(1400,0,300);__dbl(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({parts:__P().length,whole:MC3DVIEW.ffWhole(MC3DVIEW.findGroup('freeform',__M().id).userData.obj),grips:MC3DVIEW.grips?MC3DVIEW.grips.children.length:0})`);
    ck(m.parts===0&&m.whole&&m.grips===4,'더블클릭 → 객체 전체 선택 (요소 없음 · 그립 4) '+JSON.stringify(m));
    await J(`MC3DVIEW.setTool('move');var p=__pt(1400,0,300);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);'ok'`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type`);
    ck(m==='move','객체 전체 + M → 통째 이동 op ('+m+')');
    await J(`MC3DVIEW.cancelOp();MC3DVIEW.setTool('select');var p=__pt(1400,0,300);__dbl(p.x,p.y);MC3DVIEW.ST.paint={cat:'color',code:'#34C759'};MC3DVIEW.setTool('paint');__click(p.x,p.y);'ok'`); await sleep(250);
    m=await J(`({color:__M().color,fm:(__M().solidFaces||[]).map(f=>f.mat).filter(Boolean).length})`);
    ck(m.color==='#34C759'&&m.fm===0,'객체 전체 잡고 B → 매스 통째 색 '+JSON.stringify(m));
    // 선택 없이 B → 면 하나
    await J(`MC3DVIEW.setTool('select');MC3DVIEW.select(null);MC3DVIEW.ST.paint={cat:'color',code:'#FF3B30'};MC3DVIEW.setTool('paint');var p=__pt(1400,0,300);__click(p.x,p.y);'ok'`); await sleep(250);
    m=await J(`({color:__M().color,fm:(__M().solidFaces||[]).map(f=>f.mat).filter(Boolean)})`);
    ck(m.color==='#34C759'&&m.fm.length===1&&m.fm[0]==='C_FF3B30','선택 없이 B → 클릭한 면만 '+JSON.stringify(m));
    // ---- 선택 도구 끌기 = 상자 (매스가 움직이지 않는다) ----
    await J(`MC3DVIEW.setTool('select');var x0=__M().x;var p=__pt(1400,0,300);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointermove',p.x+80,p.y+60);window.__box=document.getElementById('selbox')&&getComputedStyle(document.getElementById('selbox')).display;__ev('pointerup',p.x+80,p.y+60);window.__x0=x0;'ok'`); await sleep(150);
    m=await J(`({box:__box,x:__M().x,x0:__x0,op:!!MC3DVIEW.ST.op})`);
    ck(m.box==='block'&&m.x===m.x0&&!m.op,'선택 도구로 매스 끌기 → 선택 상자 (안 움직임) '+JSON.stringify(m));
    // ---- Del 꼭짓점 → 붙은 면 3개 삭제 ----
    await J(`var p=__pt(1400,-1000,1000);__click(p.x,p.y);'ok'`); await sleep(100);
    ck((await J(`__P()[0]&&__P()[0].kind`))==='vert','꼭짓점 다시 선택');
    await J(`__key('Delete');'ok'`); await sleep(250);
    m=await J(`({faces:(__M().solidFaces||[]).length,open:!!__M().open,parts:__P().length})`);
    ck(m.faces===3&&m.open&&m.parts===0,'Del 꼭짓점 → 붙은 면 3개 삭제 (열린 껍질) '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(200);
    // ---- gid 그룹: 클릭=그룹 전체 · 더블클릭=안으로 → 면 ----
    await J(`MC3DVIEW.select(null);MC3DVIEW.emitEdit({type:'edit',op:'group',floorId:'freeform',patch:{ids:__F().masses.map(x=>x.id)}});'ok'`); await sleep(200);
    await J(`MC3DVIEW.setTool('select');var p=__pt(1400,0,300);__click(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({sel:MC3DVIEW.selCount(),parts:__P().length})`);
    ck(m.sel===2&&m.parts===0,'그룹 멤버 클릭 → 그룹 전체 (요소 아님) '+JSON.stringify(m));
    await J(`var p=__pt(1400,0,300);__dbl(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({edit:MC3DVIEW.ST.editMass===__M().id,parts:__P().length,kind:__P()[0]&&__P()[0].kind,fade:MC3DVIEW.findGroup('freeform',__F().masses[1].id).children[0].material.opacity})`);
    ck(m.edit&&m.parts===1&&m.kind==='face'&&m.fade===0.3,'그룹 더블클릭 → 안으로 · 면 선택 · 나머지 흐림 '+JSON.stringify(m));
    await J(`var p=__pt(1400,0,300);__tri(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({sel:MC3DVIEW.selCount(),parts:__P().length})`);
    ck(m.sel===2&&m.parts===0,'트리플클릭 → 연결된 전체(그룹) '+JSON.stringify(m));
    await J(`__key('Escape');__key('Escape');'ok'`); await sleep(100);
    ck(!(await J(`!!MC3DVIEW.ST.editMass`)),'Esc → 그룹 밖으로');
    // ---- 스케치 점·선·면(바닥)도 클릭 하나로 ----
    await J(`MC3DVIEW.setView('top');MC3DVIEW.drawFrame();MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:-4000,y1:-4000,x2:-2000,y2:-2500}});'ok'`); await sleep(200);
    const picks=[];
    for(const [x,y,exp] of [[-3000,-3250,'sketchFace'],[-3000,-4000,'sketchEdge'],[-4000,-4000,'sketchPt']]){ await J(`MC3DVIEW.select(null);var p=__pt(${x},${y},2);__click(p.x,p.y);'ok'`); await sleep(100); picks.push(await J(`MC3DVIEW.ST.selected&&MC3DVIEW.ST.selected.userData.obj.kind`)); }
    ck(picks.join(',')==='sketchFace,sketchEdge,sketchPt','바닥 스케치 면·선·점 각각 클릭 선택 '+JSON.stringify(picks));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 5차 E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
