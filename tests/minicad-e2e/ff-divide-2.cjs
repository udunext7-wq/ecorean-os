// 25차 E2E — 반으로 나뉜 윗면 가운데 원 → 원이 분할선에 걸려 반원 둘 (조각 4) · 반원 하나만 밀기끌기 · 가로선이 다시 전부를 가른다
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9461}); const J=s=>b.evalJS(s);
  const box=async()=>{ await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],z:1000}});MC3DVIEW.setView('iso');MC3DVIEW.drawFrame();MC3DVIEW.setTool('select');'ok'`); await sleep(300); };
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;V.camera.updateMatrixWorld();var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(t,x,y)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true}));};
      window.__click=(x,y)=>{__ev('pointermove',x,y);__ev('pointerdown',x,y);__ev('pointerup',x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__clTop=(x,y)=>{var p=__pt(x,y,1000),c=__pt(1500,1000,1000);var d=Math.hypot(c.x-p.x,c.y-p.y)||1;var q={x:p.x+(c.x-p.x)/d*6,y:p.y+(c.y-p.y)/d*6};__ev('pointermove',q.x,q.y);__click(q.x,q.y);};
      window.__mvTop=(x,y)=>{var p=__pt(x,y,1000),c=__pt(1500,1000,1000);var d=Math.hypot(c.x-p.x,c.y-p.y)||1;__ev('pointermove',p.x+(c.x-p.x)/d*6,p.y+(c.y-p.y)/d*6);};
      window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};
      window.__key=(k)=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));};
      window.__ctx={ch:2400,fh:2800,fl:0};window.__mass=()=>MC3DVIEW.FF.free.masses[0];window.__S=()=>massSolid(__mass(),__ctx);window.__vol=()=>massVolume(__mass(),__ctx);
      window.__tops=()=>{var S=__S();return S.faces.filter(f=>f.role==='ceil'&&Math.abs(faceCentroid3(S.verts,f.vs).z-1000)<1).map(f=>Math.round(faceArea3(S.verts,f.vs))).sort((a,b)=>a-b);};
      window.__face=(x,y,z)=>{var M=__mass();var f=massFindFace(JSON.parse(JSON.stringify(M)),{x:x-M.x,y:y-M.y,z:z||1000},{x:0,y:0,z:1},__ctx);return f?{n:f.face.vs.length,area:Math.round(faceArea3(f.verts,f.face.vs))}:null;};
      window.__bags=()=>{var F=MC3DVIEW.FF.free;return {pl:(F.planes||[]).reduce((s,p)=>s+(p.sketchFaces||[]).length,0),ple:(F.planes||[]).reduce((s,p)=>s+(p.sketchEdges||[]).length,0)};};'ok'`);
    // ① 세로선(앞 모서리 → 뒤 모서리, x=1500)으로 윗면을 반으로
    await box();
    await J(`MC3DVIEW.setTool('line');__clTop(1500,0);__mvTop(1500,2000);__clTop(1500,2000);'ok'`); await sleep(400);
    let m=await J(`({nf:__S().faces.length,tops:__tops()})`);
    ck(m.nf===7&&m.tops.length===2&&m.tops[0]===3000000&&m.tops[1]===3000000,'세로선 → 윗면이 반으로 (3㎡ × 2) '+JSON.stringify(m));
    // ② 분할선 한가운데(1500,1000)를 중심으로 원 r=400 → 원이 분할선에 걸려 반원 둘 + 바깥 둘
    await J(`MC3DVIEW.setTool('circle');__cl(1500,1000,1000);__mv(1900,1000,1000);document.querySelector('#vcb .v-v').value='400';MC3DVIEW.commitActive(400);'ok'`); await sleep(500);
    m=await J(`({nf:__S().faces.length,tops:__tops(),vol:+__vol().toFixed(3),bags:__bags(),st:document.getElementById('status').textContent})`);
    const half=Math.round(0.5*24*400*400*Math.sin(Math.PI/12)/2);   // 원 도구 24각형의 절반
    ck(m.tops.length===4&&Math.abs(m.tops[0]-half)<1500&&Math.abs(m.tops[1]-half)<1500&&m.tops[0]+m.tops[1]+m.tops[2]+m.tops[3]===6000000,'분할선 가운데 원 → 조각 4 (반원 둘 ≈ '+half+' + 바깥 둘, 합 6㎡) '+JSON.stringify({tops:m.tops}));
    ck(m.vol===6&&m.bags.pl===0&&m.bags.ple===0,'부피 그대로 6㎥ · 면 위 스케치는 안 생김 (진짜 분할) '+JSON.stringify({vol:m.vol,bags:m.bags}));
    ck(/나뉘/.test(m.st),'상태줄: 나뉘었다 — '+m.st);
    // ③ 오른쪽 반원만 클릭해 잡고 300 뽑기 → 부피 + 반원×0.3 · 왼쪽 반원은 그대로
    await J(`MC3DVIEW.setTool('select');__cl(1700,1000,1000);'ok'`); await sleep(200);
    m=await J(`({kind:MC3DVIEW.ST.parts[0]&&MC3DVIEW.ST.parts[0].kind,area:MC3DVIEW.ST.parts[0]&&Math.round(MC3DVIEW.ST.parts[0].area*1e6)})`);
    ck(m.kind==='face'&&Math.abs(m.area-half)<1500,'오른쪽 반원 클릭 → 그 반원 면만 선택 '+JSON.stringify(m));
    const aR=m.area;
    await J(`MC3DVIEW.setTool('pushpull');var p=__pt(1700,1000,1000);__ev('pointermove',p.x,p.y);__ev('pointerdown',p.x,p.y);__ev('pointerup',p.x,p.y);__ev('pointermove',p.x,p.y-30);document.querySelector('#vcb .v-v').value='300';MC3DVIEW.commitActive(300);'ok'`); await sleep(500);
    m=await J(`({vol:+__vol().toFixed(3),tops:__tops(),left:__face(1300,1000,1000),planar:(()=>{var S=__S();return S.faces.every(f=>facePlanarDev(S.verts,f.vs)<1.5);})()})`);
    ck(Math.abs(m.vol-(6+aR*300e-9))<0.002&&m.planar,'오른쪽 반원 300 뽑기 → 부피 6+반원×0.3 = '+m.vol+' · 전 면 평평');
    ck(m.tops.length===3&&m.left&&Math.abs(m.left.area-half)<1500,'왼쪽 반원은 제자리에 그대로 '+JSON.stringify({tops:m.tops,left:m.left}));
    // ④ 되돌리고 가로선(왼 모서리 → 오른 모서리, y=1000)을 그으면 분할선·반원 둘을 모두 가른다 → 조각 8
    await J(`__key('z');'ok'`); await sleep(100); await J(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}));'ok'`); await sleep(300);
    m=await J(`__tops().length`); ck(m===4,'Ctrl+Z → 조각 4 로');
    await J(`MC3DVIEW.setTool('line');__clTop(0,1000);__mvTop(3000,1000);__clTop(3000,1000);'ok'`); await sleep(500);
    m=await J(`({tops:__tops(),vol:+__vol().toFixed(3),bags:__bags()})`);
    ck(m.tops.length===8&&m.tops.reduce((a,b)=>a+b,0)===6000000&&m.vol===6&&m.bags.ple===0,'가로선 → 반원 넷 + 바깥 넷 = 조각 8 · 합 6㎡ '+JSON.stringify({n:m.tops.length}));
    // ⑤ 새로고침 뒤에도 조각이 남는다
    await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await sleep(400);
    m=await J(`(()=>{var S=massSolid(MC3DVIEW.FF.free.masses[0],{ch:2400,fh:2800,fl:0});return S.faces.filter(f=>f.role==='ceil').length;})()`);
    ck(m===8,'새로고침 → 조각 8 유지');
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 25차 E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
