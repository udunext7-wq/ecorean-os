// 24차 E2E — 면 위에 그리면 나뉜다 (스케치업): 대각선 → 두 조각 각각 선택 · 원 → 안쪽 면(바로 밀기끌기) · 호(모서리→모서리) → 분할
//  · 폴리라인 사슬(모아 두었다 모서리에서 분할) · 프리핸드 고리 → 안쪽 면 · 분할선이 보인다 · 그린 직후 "Ns" 다시 나누기 · 스케치 면 분할은 종전대로
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9451}); const J=s=>b.evalJS(s);
  const box=async()=>{ await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],z:1000}});MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(250); };
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;V.camera.updateMatrixWorld();var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ev=(t,x,y)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true}));};
      window.__click=(x,y)=>{__ev('pointermove',x,y);__ev('pointerdown',x,y);__ev('pointerup',x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};
      window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};
      // 윗면 위의 점 (x,y) 를 면 가운데 쪽으로 6px 들여서 클릭 — 모서리·꼭짓점은 스냅이 잡는다 (사람이 그리는 그대로)
      window.__clTop=(x,y)=>{var p=__pt(x,y,1000),c=__pt(1500,1000,1000);var d=Math.hypot(c.x-p.x,c.y-p.y)||1;var q={x:p.x+(c.x-p.x)/d*6,y:p.y+(c.y-p.y)/d*6};__ev('pointermove',q.x,q.y);__click(q.x,q.y);};
      window.__mvTop=(x,y)=>{var p=__pt(x,y,1000),c=__pt(1500,1000,1000);var d=Math.hypot(c.x-p.x,c.y-p.y)||1;__ev('pointermove',p.x+(c.x-p.x)/d*6,p.y+(c.y-p.y)/d*6);};
      window.__key=(k)=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}));};
      window.__ctx={ch:2400,fh:2800,fl:0};window.__mass=()=>MC3DVIEW.FF.free.masses[0];window.__nf=()=>massSolid(__mass(),__ctx).faces.length;window.__vol=()=>massVolume(__mass(),__ctx);
      window.__face=(x,y,z)=>{var f=massFindFace(JSON.parse(JSON.stringify(__mass())),{x:x,y:y,z:z||1000},{x:0,y:0,z:1},__ctx);return f?{n:f.face.vs.length,area:Math.round(faceArea3(f.verts,f.face.vs))}:null;};
      window.__part=(x,y,z)=>{var p=__pt(x,y,z);var h=MC3DVIEW.hitAt(p.x,p.y,{noSprite:true});if(!h)return null;var pt=MC3DVIEW.ffPartAt(h,{clientX:p.x,clientY:p.y});return pt?{kind:pt.kind,n:pt.ring?pt.ring.length:0,area:pt.area?Math.round(pt.area*1e6):0,cx:pt.ring?Math.round(pt.ring.reduce((s,q)=>s+q.x,0)/pt.ring.length):null}:null;};
      window.__edgeSegs=()=>{var c=0;MC3DVIEW.ST.root.traverse(o=>{if(o.name==='__edges'&&o.visible&&o.parent&&o.parent.userData.obj&&o.parent.userData.obj.kind==='mass')c+=o.geometry.attributes.position.count/2;});return c;};
      window.__bags=()=>{var F=MC3DVIEW.FF.free;return {g:(F.sketchFaces||[]).length,pl:(F.planes||[]).reduce((s,p)=>s+(p.sketchFaces||[]).length,0),ple:(F.planes||[]).reduce((s,p)=>s+(p.sketchEdges||[]).length,0)};};'ok'`);
    // ① 대각선 (꼭짓점 → 반대 꼭짓점) → 윗면이 두 삼각형 · 왼쪽·오른쪽 각각 선택 · 분할선이 보인다
    await box();
    let m=await J(`({nf:__nf(),segs:__edgeSegs()})`);
    ck(m.nf===6&&m.segs===12,'상자 매스: 면 6 · 그리는 모서리 12 '+JSON.stringify(m));
    await J(`MC3DVIEW.setTool('line');__clTop(0,0);'ok'`); await sleep(120);
    m=await J(`({op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,mass:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mass),a:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.a})`);
    ck(m.op==='line3'&&m.mass,'윗면 꼭짓점 클릭 → 매스 면 위 선 시작 '+JSON.stringify(m));
    await J(`__mvTop(3000,2000);__clTop(3000,2000);'ok'`); await sleep(300);
    m=await J(`({nf:__nf(),vol:+__vol().toFixed(3),segs:__edgeSegs(),st:document.getElementById('status')?document.getElementById('status').textContent:''})`);
    ck(m.nf===7&&m.vol===6,'대각선 → 면 7 (윗면이 두 삼각형) · 부피 그대로 6㎥ '+JSON.stringify({nf:m.nf,vol:m.vol}));
    ck(m.segs===13,'분할선이 모서리로 보인다 (12 → 13) '+m.segs);
    await J(`__key('Escape');MC3DVIEW.setTool('select');'ok'`); await sleep(100);
    let L=await J(`__part(500,1500,1000)`), R=await J(`__part(2500,500,1000)`);
    ck(L&&R&&L.kind==='face'&&R.kind==='face'&&L.n===3&&R.n===3&&L.cx!==R.cx,'왼쪽·오른쪽 클릭 → 각각 다른 삼각형 면이 잡힌다 '+JSON.stringify({L,R}));
    ck(L.area+R.area===6000000,'두 삼각형 면적 합 = 3000×2000 '+(L.area+R.area));
    // 왼쪽 조각만 밀기끌기 → 그 조각 면적×300 만큼만
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'pushface',kind:'masses',id:__mass().id,floorId:'freeform',patch:{p:{x:-1000,y:500,z:1000},n:{x:0,y:0,z:1},d:300}});'ok'`); await sleep(150);
    m=await J(`({vol:+__vol().toFixed(3),nf:__nf()})`);
    ck(m.vol===6.9&&m.nf===8,'왼쪽 삼각형만 300 뽑기 → 부피 6.9㎥ (3㎡×0.3) · 갈라진 선을 따라 벽 1장 '+JSON.stringify(m));
    // ② 원 → 안쪽 면 + 바깥 면, 바로 밀기끌기 단계
    await box();
    await J(`MC3DVIEW.setTool('circle');__clTop(1500,1000);__mvTop(1900,1000);__clTop(1900,1000);'ok'`); await sleep(350);
    m=await J(`({nf:__nf(),inner:__face(1500-1500,1000-1000),outer:__face(-1200,-800),op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,mode:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mode,bags:__bags()})`);
    ck(m.nf===7&&m.inner&&m.inner.n===24&&m.outer&&m.outer.n===30,'윗면 위 원 → 안쪽 면(24각) + 열쇠구멍 바깥 면 · 면 7 '+JSON.stringify({nf:m.nf,inner:m.inner,outer:m.outer}));
    ck(m.op==='pp'&&m.mode==='pushface','원을 그리면 바로 안쪽 면 밀기끌기 단계 '+JSON.stringify({op:m.op,mode:m.mode}));
    ck(m.bags.pl===0&&m.bags.ple===0,'면 위 스케치 면·선은 안 생긴다 (진짜 분할) '+JSON.stringify(m.bags));
    await J(`__key('Escape');'ok'`); await sleep(100);
    const aIn=m.inner.area;
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'pushface',kind:'masses',id:__mass().id,floorId:'freeform',patch:{p:{x:0,y:0,z:1000},n:{x:0,y:0,z:1},d:-300}});'ok'`); await sleep(150);
    m=await J(`({vol:+__vol().toFixed(4),nf:__nf()})`);
    ck(Math.abs((6-m.vol)-aIn*300*1e-9)<0.002&&m.nf===7+24,'안쪽 면을 300 파기 → 부피 −(원 면적×0.3) · 구멍 벽 24장 '+JSON.stringify(m));
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'pushface',kind:'masses',id:__mass().id,floorId:'freeform',patch:{p:{x:-1200,y:-800,z:1000},n:{x:0,y:0,z:1},d:200}});'ok'`); await sleep(150);
    m=await J(`({vol:+__vol().toFixed(4),bottomStill:__face(0,0,700)})`);
    ck(m.bottomStill&&m.bottomStill.n===24&&Math.abs(m.vol-(6-aIn*300*1e-9+(6000000-aIn)*200*1e-9))<0.003,'바깥 면을 200 올려도 구멍 바닥은 제자리 · 부피 = +바깥 면적×0.2 '+JSON.stringify(m));
    // ③ 그린 직후 "8s" → 되돌리고 8각으로 다시 나눈다
    await box();
    await J(`MC3DVIEW.setTool('polygon');__clTop(1500,1000);__mvTop(1900,1000);__clTop(1900,1000);'ok'`); await sleep(350);
    m=await J(`({nf:__nf(),inner:__face(0,0),last:!!(MC3DVIEW.ST.lastShape&&MC3DVIEW.ST.lastShape.mass)})`);
    ck(m.nf===7&&m.inner&&m.inner.n===6&&m.last,'윗면 위 6각형 → 안쪽 면(6각) · 그린 직후 기억 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(80);
    m=await J(`({ok:MC3DVIEW.ffRegenLastShape(8),nf:__nf(),inner:__face(0,0),op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type})`);
    ck(m.ok&&m.nf===7&&m.inner&&m.inner.n===8&&m.op==='pp','"8s" → 같은 자리에 8각으로 다시 나뉜다 (면 7 그대로) · 다시 밀기끌기 단계 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(80);
    // ④ 호 (앞 모서리 → 뒤 모서리, 볼록) → 그 구간으로 두 조각
    await box();
    await J(`MC3DVIEW.setTool('arc');__clTop(1000,0);__mvTop(1000,2000);__clTop(1000,2000);__mvTop(1400,1000);__clTop(1400,1000);'ok'`); await sleep(350);
    m=await J(`({nf:__nf(),left:__face(-1200,0),right:__face(1200,0),bags:__bags()})`);
    ck(m.nf===7&&m.left&&m.right&&m.left.n>=20&&m.right.n>=20&&m.left.area<m.right.area&&m.left.area+m.right.area===6000000&&m.bags.ple===0,'호(모서리→모서리) → 곡선을 따라 두 조각(왼쪽이 작다) · 면적 합 그대로 '+JSON.stringify(m));
    // ⑤ 폴리라인 사슬: 모서리 → 안쪽 → 안쪽 → 모서리 (안쪽 점에서는 아직 안 나뉘고 미리보기만)
    await box();
    await J(`MC3DVIEW.setTool('line');__clTop(600,0);__mvTop(900,600);__clTop(900,600);'ok'`); await sleep(150);
    m=await J(`({nf:__nf(),ch:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.mchain&&MC3DVIEW.ST.op.mchain.length,mc:!!(MC3DVIEW.ST.op&&MC3DVIEW.ST.op._mc&&MC3DVIEW.ST.op._mc.visible),bags:__bags()})`);
    ck(m.nf===6&&m.ch===2&&m.mc&&m.bags.ple===0,'안쪽 점 → 아직 안 나뉘고 사슬 미리보기 (스케치 선도 없음) '+JSON.stringify(m));
    await J(`__mvTop(1500,700);__clTop(1500,700);__mvTop(1800,2000);__clTop(1800,2000);'ok'`); await sleep(300);
    m=await J(`({nf:__nf(),left:__face(-1200,0),right:__face(1200,0),bags:__bags()})`);
    ck(m.nf===7&&m.left&&m.right&&m.left.area+m.right.area===6000000&&m.left.n===6&&m.right.n===6,'뒤 모서리에 닿는 순간 폴리라인 전체로 두 조각(6각+6각) '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(80);
    // ⑥ 안쪽에서 시작해 모서리에서 끝나는 선 = 자투리 → 면 위 스케치 선으로 (종전과 같다), 면은 그대로
    await box();
    await J(`MC3DVIEW.setTool('line');__clTop(1500,1000);__mvTop(3000,1000);__clTop(3000,1000);'ok'`); await sleep(250);
    m=await J(`({nf:__nf(),bags:__bags()})`);
    ck(m.nf===6&&m.bags.ple===1,'안쪽 → 모서리 선 = 자투리 → 면 위 스케치 선 1 · 면은 그대로 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(80);
    // ⑦ 프리핸드 고리 → 안쪽 면
    await box();
    await J(`MC3DVIEW.setTool('freehand');(function(){var pts=[];for(var i=0;i<=20;i++){var t=i/20*Math.PI*2;pts.push([1500+Math.cos(t)*450,1000+Math.sin(t)*350]);}var p0=__pt(pts[0][0],pts[0][1],1000);__ev('pointermove',p0.x,p0.y);__ev('pointerdown',p0.x,p0.y);pts.forEach(function(q){var p=__pt(q[0],q[1],1000);__ev('pointermove',p.x,p.y);});__ev('pointerup',p0.x,p0.y);})();'ok'`); await sleep(350);
    m=await J(`({nf:__nf(),inner:__face(0,0),op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type})`);
    ck(m.nf===7&&m.inner&&m.inner.n>=8&&m.inner.area>400000&&m.inner.area<520000,'프리핸드 고리 → 안쪽 면 (타원 ≈ 49만㎟) '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`); await sleep(80);
    // ⑧ 스케치 면(바닥) 분할은 종전대로 — 대각선 → 두 면
    await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:3000,y2:2000}});MC3DVIEW.emitEdit({type:'edit',op:'sketchline',floorId:'freeform',patch:{x1:0,y1:0,x2:3000,y2:2000}});'ok'`); await sleep(150);
    m=await J(`__bags()`);
    ck(m.g===2,'바닥 스케치 면 + 대각선 → 두 면 (종전대로) '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 면 분할 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
