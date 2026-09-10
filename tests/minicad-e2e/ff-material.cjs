// 재질 E2E — 속성(투명도·거칠기·금속감·무늬 폭/회전) · 프리셋 · 원본 해상도 업로드 · 하위호환
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9395}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:2000,y:0},{x:2000,y:1500},{x:0,y:1500}],z:1200,name:'A'}});MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();
      window.__matOf=(code)=>{var f=null;MC3DVIEW.scene.traverse(function(o){var m=o.material;if(!m)return;(Array.isArray(m)?m:[m]).forEach(function(x){if(x.name==='MC_'+code||x.name==='MC_'+String(code).slice(2))f=x;});});return f?{op:Math.round(x100(f.opacity)),tr:f.transparent,ro:Math.round(x100(f.roughness)),me:Math.round(x100(f.metalness))}:null;};
      window.x100=(v)=>(v==null?0:v*100);'ok'`); await sleep(300);
    // 기본값
    let m=await J(`MC3DVIEW.ffMatProp('C_FF9500')`);
    ck(m.op===1&&m.ro===0.82&&m.me===0.02&&m.rot===0,'기본 재질 속성 '+JSON.stringify(m));
    // 매스에 색을 칠하고 속성을 바꾼다
    await J(`MC3DVIEW.ST.paint={cat:'color',code:'#FF9500'};MC3DVIEW.setTool('paint');var p=(function(){var T=MC3DVIEW.THREE;var q=new T.Vector3(1,1.2,0.75).project(MC3DVIEW.camera);var r=MC3DVIEW.renderer.domElement.getBoundingClientRect();return {x:r.left+(q.x+1)/2*r.width,y:r.top+(1-q.y)/2*r.height};})();
      var el=MC3DVIEW.renderer.domElement;['pointermove','pointerdown','pointerup'].forEach(function(t){el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:p.x,clientY:p.y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true}));});
      el.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:p.x,clientY:p.y,detail:1}));'ok'`); await sleep(350);
    m=await J(`(()=>{var ms=MC3DVIEW.FF.free.masses[0];return {color:ms&&ms.color,key:MC3DVIEW._ffMatKey(ms&&ms.color)}})()`);
    ck(m.color==='#FF9500'&&m.key==='C_FF9500','매스에 사용자 색을 칠함 (색은 color 로, 열쇠는 C_ 로 정규화) '+JSON.stringify(m));
    const code='C_FF9500';
    // 유리 프리셋
    await J(`MC3DVIEW.ffSetMatProp('${code}',{op:0.28,ro:0.05,me:0});MC3DVIEW.drawFrame();'ok'`); await sleep(300);
    m=await J(`MC3DVIEW.ffMatProp('${code}')`);
    ck(m.op===0.28&&m.ro===0.05,'유리 속성 저장 '+JSON.stringify(m));
    m=await J(`__matOf('${code}')`);
    ck(m&&m.tr===true&&m.op===28&&m.ro===5,'매스 통짜 색도 그 자리에서 투명해짐 (matFor 경로) '+JSON.stringify(m));
    // 문서에 남는다 (다시 그려도 유지)
    await J(`MC3DVIEW.ffRender?MC3DVIEW.ffRender():0;MC3DVIEW.drawFrame();'ok'`); await sleep(250);
    m=await J(`(()=>{var p=MC3DVIEW.FF.free.matProps;return {saved:!!(p&&p['${code}']),op:p&&p['${code}']&&p['${code}'].op}})()`);
    ck(m.saved&&m.op===0.28,'문서(matProps)에 저장 '+JSON.stringify(m));
    // 저장 → 새로 → 열기 왕복에서도 유지
    const doc=await J(`MC3DVIEW.ffDocJSON()`);
    await J(`MC3DVIEW.ffNew();'ok'`); await sleep(250);
    await J(`MC3DVIEW.ffApplyDoc(JSON.parse(${JSON.stringify(doc)}),'테스트');'ok'`); await sleep(400);
    m=await J(`MC3DVIEW.ffMatProp('${code}')`);
    ck(m.op===0.28,'저장·열기 왕복에도 재질 속성 유지 '+JSON.stringify(m));
    // 프리셋 목록
    m=await J(`Object.keys(MC3DVIEW.MAT_PRESETS)`);
    ck(m.length===5&&m.indexOf('glass')>=0&&m.indexOf('metal')>=0,'프리셋 5종 '+JSON.stringify(m));
    // 재질 패널에 편집기가 붙는다
    await J(`MC3DVIEW.ST.paint={cat:'color',code:'${code}'};MC3DVIEW.renderPaintPal();'ok'`); await sleep(200);
    m=await J(`(()=>{var p=document.getElementById('paintpal');return {rows:p.querySelectorAll('[data-me]').length,pre:p.querySelectorAll('[data-pre]').length,txt:/재질 손보기/.test(p.textContent)}})()`);
    ck(m.rows===3&&m.pre===6&&m.txt,'색 재질 편집기 = 슬라이더 3 + 프리셋 5 + 기본값 '+JSON.stringify(m));
    // 슬라이더를 움직이면 값이 바뀐다
    await J(`(()=>{var r=document.querySelector('#paintpal [data-me="ro"] input');r.value='20';r.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`); await sleep(200);
    m=await J(`MC3DVIEW.ffMatProp('${code}')`);
    ck(Math.round(m.ro*100)===20,'거칠기 슬라이더 → 20% '+JSON.stringify(m));
    // 이미지 재질: 로그인 없으면 512px 문서 안 (하위호환)
    m=await J(`(()=>{ MC3DVIEW.FF.free.mats=[{id:'IMG_1',name:'옛 재질',url:'data:image/png;base64,iVBORw0KGgo=',S:1}];
      MC3DVIEW.ST.paint={cat:'img',code:'IMG_1'}; MC3DVIEW.renderPaintPal();
      var p=document.getElementById('paintpal');
      return {rows:p.querySelectorAll('[data-me]').length,has512:/512px/.test(p.textContent)}; })()`);
    ck(m.rows===5&&m.has512,'이미지 재질 편집기 = 슬라이더 5 (무늬 폭·회전 포함) + 저장 위치 안내 '+JSON.stringify(m));
    // 무늬 폭 슬라이더는 재질 기록의 S 를 바꾼다
    await J(`(()=>{var r=document.querySelector('#paintpal [data-me="S"] input');r.value='2.5';r.dispatchEvent(new Event('input',{bubbles:true}));return 1})()`); await sleep(200);
    m=await J(`MC3DVIEW.FF.free.mats[0].S`);
    ck(m===2.5,'무늬 폭 2.5m '+JSON.stringify(m));
    // 아무것도 안 고르면 안내만
    await J(`MC3DVIEW.ST.paint={cat:'wall',code:'WP_SILK'};MC3DVIEW.renderPaintPal();'ok'`); await sleep(150);
    m=await J(`(()=>{var p=document.getElementById('paintpal');return {rows:p.querySelectorAll('[data-me]').length,off:/고르면/.test(p.textContent)}})()`);
    ck(m.rows===0&&m.off,'기본 마감은 편집기 대신 안내 '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 재질 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
