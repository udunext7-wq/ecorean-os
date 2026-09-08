// 스케치업 100% 2차 E2E — 면 밀기끌기·꼭짓점 xy·면 위 도형·면 축 회전·배율 그립·뒤집기·외곽 셸·면 오프셋·면 정보
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0;
const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{
  const b=await launch({port:9345}); const J=s=>b.evalJS(s);
  try{
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF');
    await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};
      window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__cl=(x,y,z,o)=>{var p=__pt(x,y,z);__click(p.x,p.y,o);};
      window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};
      window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__st=()=>document.getElementById('status').textContent; window.__F=()=>MC3DVIEW.FF.free; window.__M=()=>__F().masses[0];
      window.__vcb=(v)=>{document.querySelector('#vcb .v-v').value=String(v);};
      window.__box=()=>{MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:-1000,y:-1000},{x:1000,y:-1000},{x:1000,y:1000},{x:-1000,y:1000}],z:1000,name:'상자'}});MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();};
      window.__side=()=>{MC3DVIEW.setView('right');MC3DVIEW.drawFrame();};window.__topv=()=>{MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();};window.__W=()=>{var m=__M();return Math.max(...m.pts.map(p=>p.x))-Math.min(...m.pts.map(p=>p.x));}; 'ok'`);
    // ---- 1. 면 밀기끌기 (P 로 +x 옆면을 500) ----
    await J(`__box();'ok'`); await sleep(200);
    await J(`__side();MC3DVIEW.setTool('pushpull');var p=__pt(1000,0,300);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(80);
    let m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type+':'+MC3DVIEW.ST.op.mode`);
    ck(m==='pp:pushface','P 옆면 클릭 → 면 밀기끌기 op ('+m+')');
    await J(`var p=__pt(1000,0,300);__ev('pointermove',p.x+30,p.y);__vcb('500');MC3DVIEW.commitActive(500);'ok'`); await sleep(250);
    m=await J(`({w:__W(),prism:!__M().solidVerts,n:__F().masses.length,st:__st()})`);
    ck(m.w===2500&&m.prism&&m.n===1,'옆면 500 밀기 → 폭 2500 · 각기둥 유지 · 매스 1 '+JSON.stringify(m));
    // 더블클릭 반복
    await J(`var p=__pt(1500,0,300);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,clientX:p.x,clientY:p.y}));'ok'`); await sleep(250);
    ck((await J(`__W()`))===3000,'더블클릭 = 직전 값 반복 → 폭 3000');
    // 윗면 −300 (숫자 −)
    await J(`__topv();var p=__pt(0,0,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__ev('pointermove',p.x,p.y+40);window.__op2=MC3DVIEW.ST.op&&(MC3DVIEW.ST.op.type+':'+MC3DVIEW.ST.op.mode);'ok'`);
    ck((await J(`__op2`))==='pp:pushface','윗면 클릭 → 면 밀기끌기 op'); await sleep(80);
    await J(`__vcb('-300');MC3DVIEW.commitActive(-300);'ok'`); await sleep(250);
    ck((await J(`__M().h_mm`))===700,'윗면 −300 → 높이 700');
    // ---- 2. Ctrl+P = 새 매스 ----
    await J(`__side();var p=__pt(2000,0,300);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y,{ctrlKey:true});__ev('pointerup',p.x,p.y,{ctrlKey:true});__ev('pointermove',p.x+30,p.y);__vcb('400');MC3DVIEW.commitActive(400);'ok'`); await sleep(250);
    m=await J(`({n:__F().masses.length,w:__W(),v:massVolume(__F().masses[1],{ch:2400,fh:2800,fl:0})})`);
    ck(m.n===2&&m.w===3000&&Math.abs(m.v-0.56)<0.01,'Ctrl+P → 원본 그대로 · 새 매스 (2000×700×400=0.56㎥) '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    // ---- 3. 꼭짓점 Alt+끌기 = xy ----
    await J(`__topv();MC3DVIEW.setTool('select');MC3DVIEW.select(null);MC3DVIEW.selectById('freeform',__M().id);'ok'`); await sleep(150);
    m=await J(`(()=>{ var g=MC3DVIEW.grips; return g?g.children.length:0; })()`);
    ck(m===4,'선택 → 꼭짓점 그립 4');
    await J(`(()=>{ var mk=MC3DVIEW.grips.children[1]; mk.updateWorldMatrix(true,false); var v=mk.position.clone().project(MC3DVIEW.camera); var r=MC3DVIEW.renderer.domElement.getBoundingClientRect(); var x=r.left+(v.x+1)/2*r.width,y=r.top+(1-v.y)/2*r.height; window.__gx=x;window.__gy=y; __ev('pointermove',x,y,{altKey:true}); __ev('pointerdown',x,y,{altKey:true}); })()`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type`);
    ck(m==='vxy','Alt+그립 → 꼭짓점 xy 이동 op ('+m+')');
    await J(`__ev('pointermove',__gx+60,__gy+20,{altKey:true});'ok'`); await sleep(60);
    const before=await J(`JSON.stringify(__M().pts[1])`);
    await J(`__vcb('300');MC3DVIEW.commitActive(300);'ok'`); await sleep(250);
    m=await J(`({p1:__M().pts[1],prism:!__M().solidVerts})`);
    var b0=JSON.parse(before); ck(JSON.stringify(m.p1)!==before&&m.prism&&Math.round(Math.hypot(m.p1.x-b0.x,m.p1.y-b0.y))===300,'꼭짓점 300mm 이동 (각기둥 유지) '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    // ---- 4. 면 위 도형: 원 ----
    await J(`__side();MC3DVIEW.select(null);MC3DVIEW.setTool('circle');var p=__pt(1500,0,350);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type+':'+MC3DVIEW.ST.op.shape`);
    ck(m==='shape3:circle','벽면 클릭 → 면 위 원 op ('+m+')');
    await J(`var p=__pt(1500,0,500);__ev('pointermove',p.x,p.y);__vcb('200');MC3DVIEW.commitActive(200);'ok'`); await sleep(250);
    m=await J(`({pl:(__F().planes||[]).length,nx:__F().planes[0]&&Math.round(__F().planes[0].n.x),f:(__F().planes[0]||{}).sketchFaces.length,pts:((__F().planes[0]||{}).sketchFaces[0]||{}).pts.length})`);
    ck(m.pl===1&&m.nx===1&&m.f===1&&m.pts===24,'면 위 원 r=200 → 벽면 평면에 24각 면 '+JSON.stringify(m));
    // 면 위 다각형 · 회전 사각형 (클릭 흐름)
    await J(`MC3DVIEW.setTool('polygon');__cl(1500,-600,350);__mv(1500,-600,450);__vcb('100');MC3DVIEW.commitActive(100);'ok'`); await sleep(200);
    await J(`MC3DVIEW.setTool('rotrect');__cl(1500,500,150);__cl(1500,800,150);__mv(1500,800,300);__cl(1500,800,300);'ok'`); await sleep(200);
    m=await J(`__F().planes[0].sketchFaces.length`);
    ck(m===3,'면 위 다각형·회전 사각형 → 면 3');
    // ---- 5. 면 위 프리핸드 ----
    await J(`MC3DVIEW.setTool('freehand');var P=[[1500,-900,100],[1500,-700,120],[1500,-650,280],[1500,-850,300],[1500,-900,100]];var a=__pt(P[0][0],P[0][1],P[0][2]);__ev('pointermove',a.x,a.y);__ev('pointerdown',a.x,a.y);P.forEach(q=>{var s=__pt(q[0],q[1],q[2]);__ev('pointermove',s.x,s.y);});__ev('pointerup',a.x,a.y);'ok'`); await sleep(250);
    ck((await J(`__F().planes[0].sketchFaces.length`))===4,'면 위 프리핸드 닫힘 → 면 4');
    // ---- 6. 면 축 회전 (rotate3) ----
    await J(`__box();__side();'ok'`); await sleep(200);
    await J(`MC3DVIEW.setTool('rotate');var p=__pt(1000,0,500);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type`);
    ck(m==='rotate3','세워진 면에 회전 도구 → 면 축 각도기 ('+m+')');
    await J(`var p=__pt(1000,0,900);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__mv(1000,-400,500);__vcb('90');MC3DVIEW.commitActive(90);'ok'`); await sleep(250);
    m=await J(`({h:__M().h_mm,solid:!!__M().solidVerts,v:massVolume(__M(),{ch:2400,fh:2800,fl:0})})`);
    ck(m.h===2000&&m.solid&&Math.abs(m.v-4)<0.01,'면 축 90° 회전 → 높이 2000 · 부피 4 유지 '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    // ---- 7. 배율 그립 ----
    await J(`__topv();MC3DVIEW.setTool('select');MC3DVIEW.selectById('freeform',__M().id);MC3DVIEW.setTool('scale');'ok'`); await sleep(150);
    m=await J(`(()=>{ var g=MC3DVIEW.grips; return g?g.children.filter(c=>c.userData.sgrip).length:0; })()`);
    ck(m===14,'배율 도구 → 그립 14 (모서리 8 + 면 6)');
    await J(`(()=>{ var mk=MC3DVIEW.grips.children.find(c=>c.userData.sgrip&&c.userData.sgrip.kind==='face'&&c.userData.sgrip.axes[0]==='x'&&c.userData.sgrip.p.x>0); mk.updateWorldMatrix(true,false); var v=mk.position.clone().project(MC3DVIEW.camera); var r=MC3DVIEW.renderer.domElement.getBoundingClientRect(); var x=r.left+(v.x+1)/2*r.width,y=r.top+(1-v.y)/2*r.height; __ev('pointermove',x,y); __ev('pointerdown',x,y); __ev('pointerup',x,y); __ev('pointermove',x+25,y+5); })()`); await sleep(120);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type+':'+MC3DVIEW.ST.op.axes.join('')`);
    ck(m==='scaleg:x','+x 면 그립 → x 축 배율 op ('+m+')');
    await J(`__vcb('3000mm');MC3DVIEW.commitActive(3000);'ok'`); await sleep(250);
    m=await J(`({w:__W(),minx:Math.min(...__M().pts.map(p=>p.x)),h:__M().h_mm,prism:!__M().solidVerts})`);
    ck(m.w===3000&&m.minx===-1000&&m.h===1000&&m.prism,'치수 3000mm 입력 → 폭 3000 (반대편 고정) '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    // 모서리 그립 = 균등 (숫자 2)
    await J(`MC3DVIEW.setTool('scale');'ok'`); await sleep(100);
    await J(`(()=>{ var mk=MC3DVIEW.grips.children.find(c=>c.userData.sgrip&&c.userData.sgrip.kind==='corner'&&c.userData.sgrip.p.x>0&&c.userData.sgrip.p.z>0&&c.userData.sgrip.p.y>0); mk.updateWorldMatrix(true,false); var v=mk.position.clone().project(MC3DVIEW.camera); var r=MC3DVIEW.renderer.domElement.getBoundingClientRect(); var x=r.left+(v.x+1)/2*r.width,y=r.top+(1-v.y)/2*r.height; __ev('pointermove',x,y); __ev('pointerdown',x,y); __ev('pointerup',x,y); __ev('pointermove',x+20,y-20); __vcb('2'); MC3DVIEW.commitActive(2); })()`); await sleep(250);
    m=await J(`({w:__W(),h:__M().h_mm})`);
    ck(m.w===4000&&m.h===2000,'모서리 그립 ×2 → 균등 4000×2000 '+JSON.stringify(m));
    await J(`__key('z',{ctrlKey:true});'ok'`); await sleep(150);
    // ---- 8. 뒤집기 · 외곽 셸 ----
    await J(`MC3DVIEW.setTool('select');MC3DVIEW.emitEdit({type:'edit',op:'setxy',kind:'masses',id:__M().id,floorId:'freeform',patch:{idxs:[1],dx:500,dy:0}});MC3DVIEW.selectById('freeform',__M().id);MC3DVIEW.menuCmd('flip-x');'ok'`); await sleep(250);
    m=await J(`__M().pts.map(p=>p.x)`);
    ck(m[1]===-1500,'뒤집기 빨강 축 → x 반전 '+JSON.stringify(m));
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:3000,y:0},{x:3000,y:500},{x:0,y:500}],z:800,name:'B'}});MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:2500,y:-500},{x:3500,y:-500},{x:3500,y:500},{x:2500,y:500}],z:800,name:'C'}});MC3DVIEW.selectAll();MC3DVIEW.menuCmd('solid-shell');'ok'`); await sleep(400);
    m=await J(`({n:__F().masses.length,name:__M().name})`);
    ck(m.n===1&&m.name==='외곽 셸','외곽 셸 → 3개 → 1개 '+JSON.stringify(m));
    // ---- 9. 매스 면 오프셋 (윗면) ----
    await J(`__box();__topv();MC3DVIEW.setTool('offset');var p=__pt(0,0,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type`);
    ck(m==='offset3','매스 윗면 오프셋 op ('+m+')');
    await J(`__mv(300,300,1000);__vcb('200');MC3DVIEW.commitActive(200);'ok'`); await sleep(250);
    m=await J(`(()=>{ var pl=(__F().planes||[]).find(p=>Math.abs(p.n.z)>0.9); var f=pl&&pl.sketchFaces[0]; var poly=f&&f.pts.map(id=>pl.sketchPts.find(q=>q.id===id)); var xs=poly&&poly.map(q=>q.x); return {pl:!!pl,pts:poly&&poly.length,w:xs&&Math.max(...xs)-Math.min(...xs)}; })()`);
    ck(m.pl&&m.pts===4&&m.w===1600,'윗면 오프셋 200 → 윗면 평면에 1600 폭 면 '+JSON.stringify(m));
    // 그 면을 P 로 뽑으면 (extrude3) 새 매스
    await J(`MC3DVIEW.setTool('pushpull');var p=__pt(0,0,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);'ok'`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mode`);
    ck(m==='extrude3','오프셋 면 클릭 → 법선 뽑기 op ('+m+')');
    await J(`var p=__pt(0,0,1000);__ev('pointermove',p.x,p.y-30);__vcb('300');MC3DVIEW.commitActive(300);'ok'`); await sleep(250);
    ck((await J(`__F().masses.length`))===2,'오프셋 면 300 뽑기 → 매스 2');
    // ---- 10. 클릭한 면 정보 · 회전 복사 · 방사 배열 ----
    await J(`__side();MC3DVIEW.setTool('select');var p=__pt(1000,0,300);__click(p.x,p.y);'ok'`); await sleep(100);
    m=await J(`MC3DVIEW.ST.faceInfo&&{role:MC3DVIEW.ST.faceInfo.role,area:MC3DVIEW.ST.faceInfo.area}`);
    ck(m&&m.role==='wall'&&Math.abs(m.area-2)<0.01,'옆면 클릭 → 면 정보 벽면 2㎡ '+JSON.stringify(m));
    ck((await J(`document.getElementById('props').textContent.startsWith('면')&&MC3DVIEW.ST.parts.length===1`)),'개체 정보 = 선택한 면 (면적)');
    await J(`__topv();MC3DVIEW.select(null);MC3DVIEW.setTool('rotate');var p=__pt(0,0,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y,{ctrlKey:true});__ev('pointerup',p.x,p.y,{ctrlKey:true});'ok'`); await sleep(80);
    m=await J(`MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type+':'+MC3DVIEW.ST.op.copy`);
    ck(m==='rotate:true','Ctrl+회전 → 복사 회전 op ('+m+')');
    const n0=await J(`__F().masses.length`);
    await J(`__mv(1500,0,1000);var p=__pt(1500,0,1000);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__mv(0,-1500,1000);__vcb('45');MC3DVIEW.commitActive(45);'ok'`); await sleep(250);
    m=await J(`({n:__F().masses.length,ang:__F().masses[__F().masses.length-1].angle})`);
    ck(m.n===n0+1&&m.ang===45,'복사 회전 45° → 매스 +1 (angle 45) '+JSON.stringify(m));
    await J(`__key('x');'ok'`); await sleep(50);
    await J(`(()=>{ var i=document.querySelector('#vcb .v-v'); i.value='x3'; i.dataset.post='1'; MC3DVIEW.vcbPostEnter(); })()`); await sleep(250);
    m=await J(`({n:__F().masses.length,angs:__F().masses.slice(-2).map(x=>x.angle)})`);
    ck(m.n===n0+3&&m.angs[0]===90&&m.angs[1]===135,'x3 → 방사 배열 (90°·135°) '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 2차 E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
