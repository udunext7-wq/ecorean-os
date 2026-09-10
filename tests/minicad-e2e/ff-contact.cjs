// 접촉 표시 E2E — 모양 기호·헤일로 링·닿은 선분 강조·커서 이름표·클릭 확정 펄스
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9385}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y,o)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));};window.__click=(x,y,o)=>{__ev('pointermove',x,y,o);__ev('pointerdown',x,y,o);__ev('pointerup',x,y,o);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};window.__F=()=>MC3DVIEW.FF.free;window.__key=(k,o)=>window.dispatchEvent(new KeyboardEvent('keydown',Object.assign({key:k,bubbles:true},o||{})));
      window.__vis=()=>{var o={};MC3DVIEW.scene.traverse(function(x){ if(x.isSprite&&x.visible&&x.userData.shape) o[x.userData.shape]=1; if(x.isSprite&&x.visible&&x.renderOrder===1001) o.ring=1; });return Object.keys(o);};
      window.__edge=()=>{var e=null;MC3DVIEW.scene.traverse(function(x){ if(x.isMesh&&x.visible&&x.renderOrder===999&&x.geometry&&/Cylinder/.test(x.geometry.type)) e=x; });return e?{len:Math.round(e.scale.y*1000)}:null;};
      window.__tip=()=>{var t=document.getElementById('snaptip');return {d:t.style.display,txt:t.textContent};};'ok'`);
    // 사각형 하나 그려 두고 그 위 여러 자리에 붙여 본다
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'sketchrect',floorId:'freeform',patch:{x1:0,y1:0,x2:3000,y2:2000}});MC3DVIEW.setView('top');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();MC3DVIEW.setTool('line');'ok'`); await sleep(300);
    // 끝점
    await J(`__mv(3000,2000);'ok'`); await sleep(180);
    let m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,tip:__tip(),shapes:__vis()}})()`);
    ck(m.kind==='endpoint'&&m.tip.d==='block'&&m.tip.txt==='끝점'&&m.shapes.indexOf('square')>=0&&m.shapes.indexOf('ring')>=0,'끝점 = 사각 기호 + 헤일로 링 + 이름표 '+JSON.stringify(m));
    // 중간점 + 닿은 선분 강조
    await J(`__mv(1500,0);'ok'`); await sleep(180);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,tip:__tip(),edge:__edge(),shapes:__vis()}})()`);
    ck(m.kind==='midpoint'&&m.tip.txt==='중간점'&&m.edge&&m.edge.len===3000&&m.shapes.indexOf('diamond')>=0,'중간점 = 마름모 + 닿은 선분(3000mm) 강조 '+JSON.stringify(m));
    // 선 위
    await J(`__mv(800,0);'ok'`); await sleep(180);
    m=await J(`(()=>{var s=MC3DVIEW.ST.lastSnap;return {kind:s&&s.kind,tip:__tip(),edge:__edge(),shapes:__vis()}})()`);
    ck(m.kind==='edge'&&m.tip.txt==='선 위'&&m.shapes.indexOf('squareO')>=0&&m.edge,'선 위 = 빈 사각 기호 + 그 선분 강조 '+JSON.stringify(m));
    // 빈 곳 = 표시 없음
    await J(`__mv(9000,9000);'ok'`); await sleep(180);
    m=await J(`(()=>({snap:MC3DVIEW.ST.lastSnap,tip:__tip(),edge:__edge(),shapes:__vis()}))()`);
    ck(!m.snap&&m.tip.d==='none'&&!m.edge&&m.shapes.length===0,'빈 곳(격자) = 기호·이름표·선분 강조 모두 꺼짐 '+JSON.stringify(m));
    // 클릭 확정 펄스
    await J(`__mv(3000,2000);'ok'`); await sleep(150);
    await J(`(()=>{var p=__pt(3000,2000);__ev('pointerdown',p.x,p.y);return 1})()`); await sleep(80);
    m=await J(`(()=>{var f=null;MC3DVIEW.scene.traverse(function(x){if(x.isSprite&&x.renderOrder===1003&&x.visible)f=x;});return {pulse:!!f}})()`);
    ck(m.pulse,'붙는 자리에서 클릭 → 확정 링 펄스 '+JSON.stringify(m));
    await sleep(500);
    m=await J(`(()=>{var f=null;MC3DVIEW.scene.traverse(function(x){if(x.isSprite&&x.renderOrder===1003)f=x;});return {vis:!!f&&f.visible}})()`);
    ck(!m.vis,'펄스는 0.3초 뒤 사라진다');
    await J(`__key('Escape');'ok'`); await sleep(150);
    // 벽면(평면) 위에서도 같은 기호 + 선분 강조
    await J(`MC3DVIEW.ffNew();MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:2000,y:0},{x:2000,y:1500},{x:0,y:1500}],z:1200,name:'A'}});MC3DVIEW.setView('front');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();MC3DVIEW.setTool('line');__cl(400,1500,300);'ok'`); await sleep(350);
    await J(`__mv(2000,1500,1200);'ok'`); await sleep(220);
    m=await J(`(()=>({kind:MC3DVIEW.ST.lastSnap&&MC3DVIEW.ST.lastSnap.kind,tip:__tip(),shapes:__vis()}))()`);
    ck(!!m.kind&&m.kind!=='grid'&&m.shapes.length>=2&&m.tip.d==='block','벽면 위에서도 같은 접촉 기호·이름표 '+JSON.stringify(m));
    await J(`__key('Escape');'ok'`);
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 접촉 표시 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
