// 스케치업 100% 6차 E2E — 면 위에 선을 그으면 면이 나뉜다 (Divide) · 나뉜 반쪽 밀기끌기 = 옆면 생성
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0;
const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{
  const b=await launch({port:9356}); const J=s=>b.evalJS(s);
  try{
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF');
    await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};
      window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__click(p.x,p.y);}; window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};
      window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__st=()=>document.getElementById('status').textContent; window.__F=()=>MC3DVIEW.FF.free; window.__M=()=>__F().masses[0]; window.__P=()=>MC3DVIEW.ST.parts;
      window.__vcb=(v)=>{document.querySelector('#vcb .v-v').value=String(v);}; window.__vol=()=>massVolume(__M(),{ch:2400,fh:2800,fl:0});
      window.__setup=()=>{MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:-1000,y:-1000},{x:1000,y:-1000},{x:1000,y:1000},{x:-1000,y:1000}],z:1000,name:'A'}});MC3DVIEW.setView('right');MC3DVIEW.drawFrame();MC3DVIEW.setTool('select');}; 'ok'`);
    // ---- 면을 선택하고 그 위에 세로선 (윗모서리 → 아랫모서리) ----
    await J(`__setup();'ok'`); await sleep(200);
    await J(`__cl(1000,0,300);'ok'`); await sleep(120);
    ck((await J(`__P()[0]&&__P()[0].kind`))==='face','옆면 선택');
    await J(`MC3DVIEW.setTool('line');__cl(1000,0,985);'ok'`); await sleep(100);
    let m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,mass:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mass),a:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.a})`);
    ck(m.op==='line3'&&m.mass&&!!m.a.snap,'면 위 선 시작 (모서리에 스냅 · 매스 면) '+JSON.stringify(m));
    await J(`__mv(1000,0,15);__cl(1000,0,15);'ok'`); await sleep(300);
    m=await J(`({faces:(__M().solidFaces||[]).length,verts:(__M().solidVerts||[]).length,vol:__vol(),st:__st(),planes:(__F().planes||[]).length,parts:__P().length})`);
    ck(m.faces===7&&m.verts===10&&Math.abs(m.vol-4)<0.001&&/면 분할/.test(m.st),'모서리→모서리 선 → 면 분할 (면 7 · 점 10 · 부피 그대로) '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(50);
    // ---- 나뉜 오른쪽 반(y>0) 을 P 로 300 → 옆면이 새로 생긴다 ----
    await J(`MC3DVIEW.setTool('pushpull');var p=__pt(1000,500,500);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__ev('pointermove',p.x+30,p.y);__vcb('300');MC3DVIEW.commitActive(300);'ok'`); await sleep(300);
    m=await J(`(()=>{ var S=massSolid(__M(),{ch:2400,fh:2800,fl:0}); return {faces:__M().solidFaces.length,vol:+__vol().toFixed(3),planar:S.faces.every(f=>facePlanarDev(S.verts,f.vs)<1.5),xs:__M().solidVerts.map(v=>v.x).filter(x=>x>1000).length}; })()`);
    ck(m.faces===8&&Math.abs(m.vol-4.3)<0.001&&m.planar&&m.xs===4,'반쪽 P 300 → 옆면 생성 · 부피 4.3 · 전 면 평평 · 왼쪽 반은 그대로 '+JSON.stringify(m));
    // ---- 안쪽에서 안쪽으로 그은 선은 나뉘지 않고 면 위 스케치 선이 된다 ----
    await J(`MC3DVIEW.setTool('line');__cl(1000,-600,300);__mv(1000,-200,700);__cl(1000,-200,700);__key('Escape');'ok'`); await sleep(250);
    m=await J(`({faces:__M().solidFaces.length,edges:((__F().planes||[])[0]||{sketchEdges:[]}).sketchEdges.length})`);
    ck(m.faces===8&&m.edges===1,'안쪽 선 → 분할 없음 · 면 위 스케치 선 1 '+JSON.stringify(m));
    // ---- 윗면을 가로선으로 나누고 반쪽 위로 ----
    await J(`__setup();MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('line');__cl(-985,0,1000);__mv(985,0,1000);__cl(985,0,1000);__key('Escape');'ok'`); await sleep(300);
    m=await J(`({faces:(__M().solidFaces||[]).length})`);
    ck(m.faces===7,'윗면 가로선 → 면 7 '+JSON.stringify(m));
    await J(`MC3DVIEW.setTool('pushpull');var p=__pt(0,500,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__ev('pointermove',p.x,p.y-30);__vcb('400');MC3DVIEW.commitActive(400);'ok'`); await sleep(300);
    m=await J(`({faces:__M().solidFaces.length,vol:+__vol().toFixed(3),h:__M().h_mm})`);
    ck(m.faces===8&&Math.abs(m.vol-4.8)<0.001&&m.h===1400,'윗면 반쪽 P 400 → 계단 (부피 4.8 · 높이 1400) '+JSON.stringify(m));
    // ---- Ctrl+Z 로 한 단계씩 ----
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    ck((await J(`__M().solidFaces.length`))===7,'Ctrl+Z → 분할만 남음');
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    ck((await J(`!__M().solidVerts`)),'Ctrl+Z → 원래 상자(각기둥)');
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 6차 E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
