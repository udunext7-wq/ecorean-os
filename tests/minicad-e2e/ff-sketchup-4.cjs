// 스케치업 100% 4차 E2E — 그룹 안으로 → 면·모서리 선택·이동·삭제·페인트·뒤집기
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0;
const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{
  const b=await launch({port:9352}); const J=s=>b.evalJS(s);
  try{
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF');
    await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};
      window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__dbl=(x,y)=>{__click(x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:x,clientY:y}));};
      window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__st=()=>document.getElementById('status').textContent; window.__F=()=>MC3DVIEW.FF.free; window.__M=()=>__F().masses[0];
      window.__vcb=(v)=>{document.querySelector('#vcb .v-v').value=String(v);};
      window.__W=()=>{var m=__M();return Math.max(...m.pts.map(p=>p.x))-Math.min(...m.pts.map(p=>p.x));};
      window.__setup=()=>{MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[{op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:-1000,y:-1000},{x:1000,y:-1000},{x:1000,y:1000},{x:-1000,y:1000}],z:1000,name:'A'}},{op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:4000,y:-500},{x:5000,y:-500},{x:5000,y:500},{x:4000,y:500}],z:600,name:'B'}}]});MC3DVIEW.setView('right');MC3DVIEW.drawFrame();MC3DVIEW.setTool('select');}; 'ok'`);
    // ---- 더블클릭 → 그룹 안으로 · 면 선택 ----
    await J(`__setup();'ok'`); await sleep(200);
    await J(`var p=__pt(1000,0,300);__dbl(p.x,p.y);'ok'`); await sleep(200);
    let m=await J(`({edit:MC3DVIEW.ST.editMass===__M().id,face:!!MC3DVIEW.ST.selFace,role:MC3DVIEW.ST.selFace&&MC3DVIEW.ST.selFace.role,area:MC3DVIEW.ST.selFace&&MC3DVIEW.ST.selFace.area,ov:MC3DVIEW.scene.getObjectByName('facesel').children.length,props:document.getElementById('props').textContent.slice(0,40)})`);
    ck(m.edit&&m.face&&m.role==='wall'&&Math.abs(m.area-2)<0.01&&m.ov===2&&/^면/.test(m.props),'더블클릭 → 그룹 안 · 옆면 선택(2㎡) · 파란 표시 · 개체 정보=면 '+JSON.stringify(m));
    m=await J(`(()=>{ var g=MC3DVIEW.findGroup('freeform',__F().masses[1].id); return g.children[0].material.opacity; })()`);
    ck(m===0.3,'그룹 밖 매스는 흐리게 (opacity 0.3)');
    // ---- M 면 이동 (법선) 숫자 300 ----
    await J(`MC3DVIEW.setTool('move');var p=__pt(1000,0,300);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type+':'+MC3DVIEW.ST.op.face`);
    ck(m==='movesel:true','M + 선택 면 → 면 이동 op ('+m+')');
    await J(`var p=__pt(1000,0,300);__ev('pointermove',p.x+40,p.y);__vcb('300');MC3DVIEW.commitActive(300);'ok'`); await sleep(250);
    m=await J(`({w:__W(),prism:!__M().solidVerts,edit:!!MC3DVIEW.ST.editMass,face:!!MC3DVIEW.ST.selFace,area:MC3DVIEW.ST.selFace&&MC3DVIEW.ST.selFace.area})`);
    ck(m.w===2300&&m.prism&&m.edit&&m.face,'면 300 이동 → 폭 2300 · 각기둥 유지 · 편집 상태·면 선택 유지 '+JSON.stringify(m));
    // 축 고정 이동: ↑ (z) 로 옆면을 위로 200 → 다면체 (기울어짐)
    await J(`var p=__pt(1300,0,300);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__key('ArrowUp');__ev('pointermove',p.x,p.y-30);__vcb('200');MC3DVIEW.commitActive(200);'ok'`); await sleep(250);
    m=await J(`({solid:!!__M().solidVerts,h:__M().h_mm,zs:(__M().solidVerts||[]).map(v=>v.z).sort((a,b)=>a-b)})`);
    ck(m.solid&&m.h===1200,'↑ 축 고정 면 이동 200 → 다면체 · 높이 1200 '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(200);
    // ---- 모서리 선택 → 이동 · 삭제 ----
    await J(`MC3DVIEW.setTool('select');var p=__pt(1300,0,1000);__click(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({edge:!!MC3DVIEW.ST.selEdge,face:!!MC3DVIEW.ST.selFace,props:document.getElementById('props').textContent.slice(0,8)})`);
    ck(m.edge&&!m.face&&/모서리/.test(m.props),'윗모서리 클릭 → 모서리 선택 '+JSON.stringify(m));
    await J(`MC3DVIEW.setTool('move');var p=__pt(1300,0,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__key('ArrowUp');__ev('pointermove',p.x,p.y-30);__vcb('150');MC3DVIEW.commitActive(150);'ok'`); await sleep(250);
    m=await J(`({h:__M().h_mm,solid:!!__M().solidVerts})`);
    ck(m.h===1150&&m.solid,'모서리 ↑ 150 이동 → 높이 1150 (박공) '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(200);
    await J(`MC3DVIEW.setTool('select');var p=__pt(1300,0,1000);__click(p.x,p.y);__key('Delete');'ok'`); await sleep(250);
    m=await J(`({faces:(__M().solidFaces||[]).length,open:!!__M().open,edge:!!MC3DVIEW.ST.selEdge})`);
    ck(m.faces===4&&m.open&&!m.edge,'Del 모서리 → 붙은 면 2개 함께 삭제 (열린 껍질) '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(200);
    // ---- 면 페인트(B, Ctrl 없이) · 면 삭제 · 뒤집기 ----
    await J(`MC3DVIEW.setTool('select');var p=__pt(1300,0,300);__click(p.x,p.y);MC3DVIEW.ST.paint={cat:'color',code:'#FF9500'};MC3DVIEW.setTool('paint');__click(p.x,p.y);'ok'`); await sleep(250);
    m=await J(`({mats:(__M().solidFaces||[]).map(f=>f.mat).filter(Boolean),color:__M().color,selmat:MC3DVIEW.ST.selFace&&MC3DVIEW.ST.selFace.mat})`);
    ck(m.mats.length===1&&m.mats[0]==='C_FF9500'&&m.color==='#B9C6D2'&&m.selmat==='C_FF9500','그룹 안 페인트 → 그 면만 · 선택 유지 '+JSON.stringify(m));
    await J(`MC3DVIEW.ffReverseSel();'ok'`); await sleep(200);
    m=await J(`({faces:__M().solidFaces.length,st:__st()})`);
    ck(m.faces===6&&/뒤집기/.test(m.st),'면 뒤집기 '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(200);
    await J(`MC3DVIEW.setTool('select');MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();var p=__pt(0,0,1000);__click(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`MC3DVIEW.ST.selFace&&MC3DVIEW.ST.selFace.role`);
    ck(m==='ceil','윗면 클릭 → 윗면 선택');
    await J(`__key('Delete');'ok'`); await sleep(250);
    m=await J(`({faces:(__M().solidFaces||[]).length,open:!!__M().open,tris:(()=>{var g=MC3DVIEW.findGroup('freeform',__M().id);var t=0;g.children.forEach(c=>{if(c.isMesh&&c.geometry.attributes.position)t+=c.geometry.attributes.position.count/3;});return t;})()})`);
    ck(m.faces===5&&m.open&&m.tris===10,'Del 면 → 열린 껍질(면 5 · 삼각형 10) '+JSON.stringify(m));
    // ---- 우클릭 메뉴 · Esc · 다른 매스 클릭 = 밖으로 ----
    await J(`MC3DVIEW.setView('right');MC3DVIEW.drawFrame();var p=__pt(1300,0,300);__click(p.x,p.y);MC3DVIEW.showCtx({clientX:p.x,clientY:p.y});'ok'`); await sleep(50);
    m=await J(`[...document.querySelectorAll('#ctxmenu button span')].map(s=>s.textContent)`);
    ck(m.some(x=>/면 정보/.test(x))&&m.includes('면 뒤집기')&&m.includes('면 삭제')&&m.includes('그룹 밖으로'),'우클릭 = 면 메뉴 '+JSON.stringify(m));
    await J(`MC3DVIEW.hideCtx();__key('Escape');'ok'`); await sleep(50);
    m=await J(`({edit:!!MC3DVIEW.ST.editMass,face:!!MC3DVIEW.ST.selFace})`);
    ck(m.edit&&!m.face,'Esc 1회 → 면 선택 해제, 그룹 안 유지');
    await J(`__key('Escape');'ok'`); await sleep(50);
    m=await J(`(()=>{ var g=MC3DVIEW.findGroup('freeform',__F().masses[1].id); return {edit:!!MC3DVIEW.ST.editMass,op:g.children[0].material.opacity}; })()`);
    ck(!m.edit&&m.op===1,'Esc 2회 → 그룹 밖 · 흐림 해제 '+JSON.stringify(m));
    await J(`var p=__pt(0,0,1000);__dbl(p.x,p.y);'ok'`); await sleep(150);
    await J(`MC3DVIEW.setView('top');MC3DVIEW.drawFrame();var p=__pt(4500,0,600);__click(p.x,p.y);'ok'`); await sleep(150);
    m=await J(`({edit:!!MC3DVIEW.ST.editMass,sel:MC3DVIEW.ST.selected&&MC3DVIEW.ST.selected.userData.obj.name})`);
    ck(!m.edit&&m.sel==='B','그룹 안에서 다른 매스 클릭 → 밖으로 + 그 매스 선택 '+JSON.stringify(m));
    // ---- 새로고침: 열린 껍질 그대로 ----
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await sleep(300);
    m=await J(`({faces:MC3DVIEW.FF.free.masses[0].solidFaces.length,open:!!MC3DVIEW.FF.free.masses[0].open})`);
    ck(m.faces===5&&m.open,'새로고침 → 열린 껍질 유지 '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 4차 E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
