// 스케치업 100% 8차 E2E — 높이 한계 제거: 끌기=줌 비례 · 숫자 상한 없음 · 시야·안개 모델 비례
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9369}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__vcb=(v)=>{document.querySelector('#vcb .v-v').value=String(v);};window.__F=()=>MC3DVIEW.FF.free;window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));'ok'`);
    // 같은 100px 끌기 — 가까이/멀리에서 높이가 다르다 (줌 비례)
    const dragH=async(dist)=>{ await J(`MC3DVIEW.ffNew();MC3DVIEW.setView('iso');var T=MC3DVIEW.THREE;var dir=MC3DVIEW.camera.position.clone().sub(MC3DVIEW.orbit.target).normalize();MC3DVIEW.camera.position.copy(MC3DVIEW.orbit.target).addScaledVector(dir,${dist});MC3DVIEW.orbit.update();MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(0,0);__mv(2000,1500);__cl(2000,1500);'ok'`); await sleep(200);
      await J(`var p=__pt(1000,750);var sd=MC3DVIEW._blueDir(new MC3DVIEW.THREE.Vector3(1,0,0.75));__ev('pointermove',p.x+sd.x*100,p.y+sd.y*100);'ok'`); await sleep(80);
      const d=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.delta`); await J(`__key('Escape');'ok'`); return d; };
    const dNear=await dragH(6), dFar=await dragH(30);
    ck(dNear>0&&dFar>dNear*1.8,'100px 끌기: 가까이 '+dNear+'mm < 멀리 '+dFar+'mm (줌 비례, 상한 없음)');
    // 숫자 30000 → 30m 상자 · 시야·안개가 따라온다
    await J(`MC3DVIEW.ffNew();MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(0,0);__mv(3000,2000);__cl(3000,2000);__vcb('30000');MC3DVIEW.commitActive(30000);'ok'`); await sleep(300);
    let m=await J(`({h:__F().masses[0]&&__F().masses[0].h_mm,far:MC3DVIEW.camera.far,fogFar:MC3DVIEW.scene.fog.far,fogNear:MC3DVIEW.scene.fog.near,total:MC3DVIEW.ST.built&&MC3DVIEW.ST.built.totalHeight})`);
    ck(m.h===30000&&m.far===2000&&m.fogFar>=300&&m.fogNear>=90,'숫자 30000 → 30m 상자 · far 2km · 안개 모델 비례 '+JSON.stringify(m));
    // 벽면 위 뽑기도 줌 비례 (100px)
    await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:-1000,y:-1000},{x:1000,y:-1000},{x:1000,y:1000},{x:-1000,y:1000}],z:1000,name:'A'}});MC3DVIEW.setView('right');var dir=MC3DVIEW.camera.position.clone().sub(MC3DVIEW.orbit.target).normalize();MC3DVIEW.camera.position.copy(MC3DVIEW.orbit.target).addScaledVector(dir,40);MC3DVIEW.orbit.update();MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(1000,-300,300);__mv(1000,300,700);__cl(1000,300,700);'ok'`); await sleep(250);
    await J(`var p=__pt(1000,0,500);__ev('pointermove',p.x,p.y-100);'ok'`); await sleep(80);
    m=await J(`({mode:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mode,d:MC3DVIEW.ST.op&&Math.abs(MC3DVIEW.ST.op.delta)})`);
    ck(m.mode==='extrude3'&&m.d>600,'벽면 뽑기 정면에서 위로 100px (멀리서) → '+m.d+'mm (3mm/px 고정이었으면 300)');
    await J(`__key('Escape');'ok'`);
    // 꼭짓점 z 그립도 줌 비례
    await J(`MC3DVIEW.setTool('select');MC3DVIEW.setView('iso');var dir=MC3DVIEW.camera.position.clone().sub(MC3DVIEW.orbit.target).normalize();MC3DVIEW.camera.position.copy(MC3DVIEW.orbit.target).addScaledVector(dir,40);MC3DVIEW.orbit.update();MC3DVIEW.drawFrame();var p=__pt(0,0,1000);__click(p.x,p.y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:p.x,clientY:p.y}));'ok'`); await sleep(200);
    m=await J(`(()=>{ var mk=MC3DVIEW.grips&&MC3DVIEW.grips.children[0]; if(!mk) return {grips:0}; var w=mk.getWorldPosition(new MC3DVIEW.THREE.Vector3()).project(MC3DVIEW.camera); var r=MC3DVIEW.renderer.domElement.getBoundingClientRect(); var x=r.left+(w.x+1)/2*r.width,y=r.top+(1-w.y)/2*r.height; var sd=MC3DVIEW._blueDir(mk.getWorldPosition(new MC3DVIEW.THREE.Vector3())); __ev('pointermove',x,y); __ev('pointerdown',x,y); __ev('pointermove',x+sd.x*100,y+sd.y*100); return {grips:MC3DVIEW.grips.children.length,op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,z:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.z}; })()`);
    ck(m.op==='vz'&&m.z>1500,'꼭짓점 z 그립 100px (멀리서) → z '+m.z+' (5mm/px 고정이었으면 1500)');
    await J(`__key('Escape');'ok'`);
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 8차 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
