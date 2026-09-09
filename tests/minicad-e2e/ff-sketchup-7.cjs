// 스케치업 100% 7차 E2E — 파랑(Z) 축 자동 추론으로 세로 선 · R 사각형 2번째 클릭 뒤 바로 높이(3번째 클릭/숫자)
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9365}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(type,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(type,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__vcb=(v)=>{document.querySelector('#vcb .v-v').value=String(v);};window.__F=()=>MC3DVIEW.FF.free;window.__st=()=>document.getElementById('status').textContent;window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));'ok'`);
    // ---- R: 2번 클릭 → 바로 높이 ----
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(0,0);__mv(3000,2000);__cl(3000,2000);'ok'`); await sleep(250);
    let m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,mode:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mode,auto:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.autoBox),faces:__F().sketchFaces.length,vcb:document.querySelector('#vcb .v-l').textContent})`);
    ck(m.op==='pp'&&m.mode==='extrude'&&m.auto&&m.faces===1&&/높이/.test(m.vcb),'R 두 클릭 → 곧바로 높이 단계 '+JSON.stringify(m));
    await J(`var p=__pt(1500,1000);__ev('pointermove',p.x,p.y-60);'ok'`); await sleep(60);
    m=await J(`({d:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.delta})`);
    ck(m.d>0,'위로 끌면 높이 미리보기 '+JSON.stringify(m));
    await J(`__vcb('1200');MC3DVIEW.commitActive(1200);'ok'`); await sleep(250);
    m=await J(`({masses:__F().masses.length,h:__F().masses[0]&&__F().masses[0].h_mm,faces:__F().sketchFaces.length,tool:MC3DVIEW.ST.tool,op:!!MC3DVIEW.ST.op})`);
    ck(m.masses===1&&m.h===1200&&m.faces===0&&m.tool==='rect'&&!m.op,'숫자 1200 → 상자 (면 소비 · 도구는 R 유지) '+JSON.stringify(m));
    // 3번째 클릭으로 확정
    await J(`__cl(6000,0);__mv(8000,1500);__cl(8000,1500);var p=__pt(7000,750);__ev('pointermove',p.x,p.y-80);'ok'`); await sleep(100);
    await J(`var p=__pt(7000,750);__ev('pointerdown',p.x,p.y-80);__ev('pointerup',p.x,p.y-80);'ok'`); await sleep(250);
    m=await J(`({masses:__F().masses.length,h:__F().masses[1]&&__F().masses[1].h_mm,op:!!MC3DVIEW.ST.op})`);
    ck(m.masses===2&&m.h>0&&!m.op,'3번째 클릭으로 높이 확정 '+JSON.stringify(m));
    // Esc → 면만
    await J(`__cl(0,4000);__mv(2000,5500);__cl(2000,5500);__key('Escape');'ok'`); await sleep(200);
    m=await J(`({faces:__F().sketchFaces.length,masses:__F().masses.length})`);
    ck(m.faces===1&&m.masses===2,'Esc → 면만 남김 '+JSON.stringify(m));
    // ---- 벽면 위 R → 바로 뽑기 ----
    await J(`MC3DVIEW.setView('right');MC3DVIEW.drawFrame();MC3DVIEW.setTool('rect');__cl(3000,400,300);__mv(3000,1600,900);__cl(3000,1600,900);'ok'`); await sleep(250);
    m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,mode:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mode})`);
    ck(m.op==='pp'&&m.mode==='extrude3','벽면 위 사각형 → 곧바로 법선 뽑기 단계 '+JSON.stringify(m));
    await J(`var p=__pt(3000,1000,600);__ev('pointermove',p.x+30,p.y);__vcb('300');MC3DVIEW.commitActive(300);'ok'`); await sleep(250);
    ck((await J(`__F().masses.length`))===3,'300 → 벽면에서 돌출 매스');
    // ---- L: 위로 끌면 파랑 축 → 세로 선 ----
    await J(`MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('line');__cl(-1500,1000);var p=__pt(-1500,1000);var bd=MC3DVIEW._blueDir(new MC3DVIEW.THREE.Vector3(-1.5,0,1));window.__bd=bd;__ev('pointermove',p.x+bd.x*25,p.y+bd.y*25);__ev('pointermove',p.x+bd.x*70,p.y+bd.y*70);'ok'`); await sleep(120);
    m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,axis:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.axis,auto:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.autoBlue),nz:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.fr&&Math.abs(MC3DVIEW.ST.op.fr.n.z)<0.01,st:__st()})`);
    ck(m.op==='line3'&&m.axis==='v'&&m.auto&&m.nz&&/파랑/.test(m.st),'선을 위로 끌면 파랑 축 추론 (세로 종이) '+JSON.stringify(m));
    // 옆으로 움직이면 바닥 선으로 복귀
    await J(`var p=__pt(-1500,1000);__ev('pointermove',p.x+90,p.y+5);'ok'`); await sleep(80);
    m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,a:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.a})`);
    ck(m.op==='line'&&m.a&&m.a.x===-1500&&m.a.y===1000,'옆으로 움직이면 바닥 선으로 복귀 '+JSON.stringify(m));
    // 다시 위로 → 숫자 800 = 높이 800 세로 선
    await J(`var p=__pt(-1500,1000);var bd=__bd;__ev('pointermove',p.x+bd.x*25,p.y+bd.y*25);__ev('pointermove',p.x+bd.x*70,p.y+bd.y*70);'ok'`); await sleep(80);
    await J(`__vcb('800');MC3DVIEW.commitActive(800);'ok'`); await sleep(250);
    m=await J(`(()=>{ var pl=(__F().planes||[]).find(q=>Math.abs(q.n.z)<0.01&&q.sketchEdges.length); if(!pl) return {pl:false}; var e=pl.sketchEdges[0]; var a=pl.sketchPts.find(q=>q.id===e.a), b=pl.sketchPts.find(q=>q.id===e.b); var A=planePt(pl,a.x,a.y), B=planePt(pl,b.x,b.y); return {pl:true,dz:Math.round(Math.abs(B.z-A.z)),dxy:Math.round(Math.hypot(B.x-A.x,B.y-A.y)),op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,axis:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.axis,drew:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.drew)}; })()`);
    ck(m.pl&&m.dz===800&&m.dxy===0&&m.op==='line3'&&m.drew&&!m.axis,'숫자 800 → 세로 선 (z 800, xy 0) · 이어서 세로 종이에 남음(축 고정 해제) '+JSON.stringify(m));
    // 세로 종이에서 이어 그려 닫으면 면 → P
    var dbgT=await J(`(()=>{ var pl=(__F().planes||[]).find(q=>Math.abs(q.n.z)<0.01&&q.sketchEdges.length); var op=MC3DVIEW.ST.op; var top=planePt(pl,op.a.u,op.a.v); window.__topW=top; window.__ex=pl.ex; return {top,ex:pl.ex,op:op.type,a:op.a}; })()`); console.log('   dbg',JSON.stringify(dbgT));
    await J(`var t=__topW,ex=__ex; var q1={x:t.x+ex.x*1500,y:t.y+ex.y*1500,z:t.z}; var q2={x:q1.x,y:q1.y,z:0}; var s1=__pt(q1.x,q1.y,q1.z); __ev('pointermove',s1.x,s1.y); __click(s1.x,s1.y); var s2=__pt(q2.x,q2.y,q2.z); __ev('pointermove',s2.x,s2.y); __click(s2.x,s2.y); var s3=__pt(-1500,1000,0); __ev('pointermove',s3.x,s3.y); __click(s3.x,s3.y); 'ok'`); await sleep(300);
    m=await J(`(()=>{ var pl=(__F().planes||[]).find(q=>Math.abs(q.n.z)<0.01&&q.sketchEdges.length); return {edges:pl.sketchEdges.length,faces:pl.sketchFaces.length}; })()`);
    ck(m.faces===1&&m.edges===4,'세로 종이에 이어 그려 닫힘 → 세로 면 '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치업 100% 7차 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
