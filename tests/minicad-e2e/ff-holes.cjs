// 24차-2 E2E — 스케치 면의 구멍: 바닥 사각형 안의 원 → 바깥 면에 구멍(조립 prim holes·면적) · 뽑으면 관통 구멍 매스(구멍 면은 그 자리에) ·
//  세운 종이(작업 평면)의 면도 face3h 로 구멍 · 법선 뽑기도 관통
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9457}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;V.camera.updateMatrixWorld();var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};
      window.__ctx={ch:2400,fh:2800,fl:0};window.__F=()=>MC3DVIEW.FF.free;window.__circ=(cx,cy,r,n)=>{var o=[];for(var i=0;i<n;i++){var t=i/n*Math.PI*2;o.push({x:Math.round(cx+Math.cos(t)*r),y:Math.round(cy+Math.sin(t)*r)});}return o;};
      window.__obj=(id)=>{var g=MC3DVIEW.FF.group.children.find(x=>x.userData.obj&&String(x.userData.obj.id)===String(id));return g&&g.userData.obj;};'ok'`);
    // ① 바닥: 사각형 + 안쪽 원 → 바깥 면에 구멍
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:3000,y2:2000}});MC3DVIEW.emitEdit({type:'edit',op:'sketchpoly',floorId:'freeform',patch:{pts:__circ(1500,1000,400,16)}});MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(300);
    let m=await J(`(()=>{var F=__F();var outer=F.sketchFaces.find(f=>f.pts.length===4),inner=F.sketchFaces.find(f=>f.pts.length===16);var o=outer&&__obj(outer.id);return {n:F.sketchFaces.length,holes:outer&&outer.holes,innerHoles:inner&&inner.holes.length,prim:o&&o.prims[0].holes.length,area:o&&Math.round(o.meta.area),id:outer&&outer.id,innerId:inner&&inner.id}})()`);
    const aCirc=await J(`Math.abs(skPolyArea(__circ(1500,1000,400,16)))`);
    ck(m.n===2&&m.holes&&m.holes.length===1&&m.holes[0]===m.innerId&&m.innerHoles===0,'사각형 + 원 → 면 2 · 원은 사각형의 구멍 '+JSON.stringify({n:m.n,holes:m.holes&&m.holes.length}));
    ck(m.prim===1&&m.area===Math.round(6000000-aCirc),'조립: 바깥 면 prim 에 구멍 1 · 면적 = 6,000,000 − 원 ('+m.area+')');
    // 구멍 자리를 클릭하면 바깥 면이 아니라 안쪽 원 면이 잡힌다 (구멍이 진짜 뚫려 있다)
    m=await J(`(()=>{var p=__pt(1500,1000,0);var h=MC3DVIEW.hitAt(p.x,p.y,{noSprite:true});var o=h&&h.object.userData.obj;return {kind:o&&o.kind,id:o&&o.id}})()`);
    const innerId=await J(`__F().sketchFaces.find(f=>f.pts.length===16).id`);
    ck(m.kind==='sketchFace'&&m.id===innerId,'구멍 가운데 클릭 → 안쪽 원 면 (바깥 면은 뚫려 있다) '+JSON.stringify(m));
    // ② 바깥 면을 뽑으면 관통 구멍 매스 · 원 면은 그 자리에 남는다 (스케치업)
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'extrude',floorId:'freeform',patch:{id:__F().sketchFaces.find(f=>f.pts.length===4).id,z:1000,as:'solid'}});'ok'`); await sleep(300);
    m=await J(`(()=>{var F=__F();var ms=F.masses[0];var S=massSolid(ms,__ctx);return {masses:F.masses.length,faces:S.faces.length,vol:+massVolume(ms,__ctx).toFixed(4),sf:F.sketchFaces.length,sfn:F.sketchFaces[0]&&F.sketchFaces[0].pts.length}})()`);
    ck(m.masses===1&&m.faces===22&&Math.abs(m.vol-(6000000-aCirc)*1e-6)<0.002,'뽑기 1000 → 관통 구멍 매스 (면 22 · 부피 '+m.vol+'㎥ = 6 − 원)');
    ck(m.sf===1&&m.sfn===16,'원 면은 바닥에 그대로 남는다 (구멍 바닥)');
    m=await J(`(()=>{var p=__pt(1500,1000,1000);var h=MC3DVIEW.hitAt(p.x,p.y,{noSprite:true});return {z:h&&Math.round(h.point.y*1000),kind:h&&h.object.userData.obj&&h.object.userData.obj.kind}})()`);
    ck(m.kind!=='mass'||m.z<900,'윗면 구멍 자리의 레이는 매스 윗면(z=1000)에 닿지 않고 구멍을 통과한다 '+JSON.stringify(m));
    // ③ 세운 종이(작업 평면 x=0, 법선 +x)의 면 + 구멍 → face3h · 법선 뽑기 500 → 관통
    await J(`MC3DVIEW.ffNew();var pl={origin:{x:0,y:0,z:0},ex:{x:0,y:1,z:0},ey:{x:0,y:0,z:1},n:{x:1,y:0,z:0}};MC3DVIEW.emitEdit({type:'edit',op:'sketchpoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}],plane:pl}});MC3DVIEW.emitEdit({type:'edit',op:'sketchpoly',floorId:'freeform',patch:{pts:__circ(1500,1000,400,16),plane:pl}});'ok'`); await sleep(300);
    m=await J(`(()=>{var pl=__F().planes[0];var outer=pl.sketchFaces.find(f=>f.pts.length===4);var o=__obj(outer.id);return {faces:pl.sketchFaces.length,holes:outer.holes.length,prim:o&&o.prims[0].t,ph:o&&(o.prims[0].holes||[]).length,area:o&&Math.round(o.meta.area)}})()`);
    ck(m.faces===2&&m.holes===1&&m.prim==='face3h'&&m.ph===1&&m.area===Math.round(6000000-aCirc),'세운 종이의 면 + 원 → face3h(구멍 1) · 면적 = 바깥 − 원 '+JSON.stringify(m));
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'extrude',floorId:'freeform',patch:{id:__F().planes[0].sketchFaces.find(f=>f.pts.length===4).id,z:500,as:'solid'}});'ok'`); await sleep(300);
    m=await J(`(()=>{var ms=__F().masses[0];var S=massSolid(ms,__ctx);return {masses:__F().masses.length,faces:S.faces.length,vol:+massVolume(ms,__ctx).toFixed(4)}})()`);
    ck(m.masses===1&&m.faces===22&&Math.abs(m.vol-(6000000-aCirc)*500*1e-9)<0.002,'종이 면 법선 뽑기 500 → 관통 구멍 매스 (면 22 · 부피 '+m.vol+'㎥)');
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 스케치 면 구멍 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
