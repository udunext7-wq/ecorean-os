// 26차 E2E — 마우스·카메라·이동이 원활하게: 감쇠 즉답 · 상호작용 중 그림자 지연·픽셀비 1 · 끝나면 복원 · 궤도 중 스냅 생략 · 수평선 아래 회전
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9471}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(300);
    await J(`(()=>{ const el=MC3DVIEW.renderer.domElement; el.setPointerCapture=()=>{}; el.releasePointerCapture=()=>{};
      Object.defineProperty(window,'devicePixelRatio',{value:2,configurable:true}); MC3DVIEW.renderer.setPixelRatio(2);   // 레티나처럼 (부팅 뒤라 직접 맞춘다)
      window.__ev=(t,x,y,o)=>el.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true},o||{})));
      const ops=[]; for(let i=0;i<12;i++){ const cx=(i%4)*2500, cy=Math.floor(i/4)*2500; ops.push({op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:cx,y:cy},{x:cx+1500,y:cy},{x:cx+1500,y:cy+1200},{x:cx,y:cy+1200}],z:800,name:'M'+i}}); }
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops}); MC3DVIEW.setView('iso'); MC3DVIEW.fitView(true); MC3DVIEW.drawFrame(); return 'ok'; })()`); await sleep(400);
    let m=await J(`({damp:MC3DVIEW.orbit.dampingFactor,polar:+MC3DVIEW.orbit.maxPolarAngle.toFixed(2),dpr:MC3DVIEW.renderer.getPixelRatio(),low:MC3DVIEW.inter.low})`);
    ck(m.damp>=0.3&&m.polar>2.5&&m.dpr===2&&!m.low,'궤도 감쇠 즉답형(≥0.3) · 수평선 아래 허용 · 쉴 때 픽셀비 2 '+JSON.stringify(m));
    // 궤도 드래그 중: 픽셀비 1 · 스냅 호버 계산 없음
    await J(`(()=>{ const el=MC3DVIEW.renderer.domElement; const R=el.getBoundingClientRect(); const cx=R.left+R.width/2, cy=R.top+R.height/2; window.__cx=cx; window.__cy=cy;
      MC3DVIEW.setTool('line'); el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:cx,clientY:cy,button:1,buttons:4,pointerId:2,pointerType:'mouse',isPrimary:true}));
      for(let i=1;i<=20;i++) el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:cx+i*5,clientY:cy+i,button:1,buttons:4,pointerId:2,pointerType:'mouse',isPrimary:true})); return 'ok'; })()`); await sleep(120);
    m=await J(`({orbit:MC3DVIEW.inter.orbit,low:MC3DVIEW.inter.low,dpr:MC3DVIEW.renderer.getPixelRatio(),snapShown:(()=>{let v=false;MC3DVIEW.scene.traverse(o=>{if(o.isSprite&&!o.userData.obj&&o.visible&&o.userData.px)v=true;});return v;})()})`);
    ck(m.orbit&&m.low&&m.dpr===1&&!m.snapShown,'휠버튼 궤도 중 → 상호작용 · 픽셀비 1 · 스냅 마커 없음 '+JSON.stringify(m));
    await J(`MC3DVIEW.renderer.domElement.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:__cx+100,clientY:__cy+20,button:1,buttons:0,pointerId:2,pointerType:'mouse',isPrimary:true}));'ok'`); await sleep(500);
    m=await J(`({orbit:MC3DVIEW.inter.orbit,low:MC3DVIEW.inter.low,dpr:MC3DVIEW.renderer.getPixelRatio()})`);
    ck(!m.orbit&&!m.low&&m.dpr===2,'놓고 잠시 뒤 → 픽셀비 2 복원 '+JSON.stringify(m));
    // 이동 끌기 30번: 그림자 재계산은 250ms 마다 한 번 이하 (매 프레임 아님) · 끝나면 밀린 그림자 갱신
    await J(`(()=>{ MC3DVIEW.setTool('select'); MC3DVIEW.select(null); const m0=MC3DVIEW.FF.free.masses[5]; MC3DVIEW.selectById('freeform',m0.id); MC3DVIEW.ST.parts=[]; MC3DVIEW.setTool('move');
      const T=MC3DVIEW.THREE; const R=MC3DVIEW.renderer.domElement.getBoundingClientRect(); const p=new T.Vector3(m0.x*0.001,0.4,m0.y*0.001).project(MC3DVIEW.camera); const px=R.left+(p.x+1)/2*R.width, py=R.top+(1-p.y)/2*R.height;
      window.__px=px; window.__py=py; __ev('pointermove',px,py); __ev('pointerdown',px,py); MC3DVIEW.inter.count.shadow=0; for(let i=1;i<=30;i++) __ev('pointermove',px+i*3,py+(i%4)); return {op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,shadow:MC3DVIEW.inter.count.shadow,pending:MC3DVIEW.inter.shadowPending}; })()`).then(r=>{ m=r; });
    ck(m.op==='move'&&m.shadow<=1&&m.pending===true,'이동 끌기 30번 → 그림자 재계산 ≤1회(지연) '+JSON.stringify(m));
    await J(`__ev('pointerup',__px+90,__py+2);'ok'`); await sleep(500);
    m=await J(`({op:!!MC3DVIEW.ST.op,pending:MC3DVIEW.inter.shadowPending,shadow:MC3DVIEW.inter.count.shadow,low:MC3DVIEW.inter.low})`);
    ck(!m.op&&!m.pending&&m.shadow>=1&&!m.low,'놓으면 확정 · 밀린 그림자 한 번 갱신 · 픽셀비 복원 '+JSON.stringify(m));
    // 궤도 감쇠: 놓은 뒤 0.4초 안에 멈춘다
    await J(`(()=>{ const el=MC3DVIEW.renderer.domElement; el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:__cx,clientY:__cy,button:1,buttons:4,pointerId:3,pointerType:'mouse',isPrimary:true})); for(let i=1;i<=10;i++) el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:__cx+i*8,clientY:__cy,button:1,buttons:4,pointerId:3,pointerType:'mouse',isPrimary:true})); el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:__cx+80,clientY:__cy,button:1,buttons:0,pointerId:3,pointerType:'mouse',isPrimary:true})); window.__c1=MC3DVIEW.camera.position.clone(); return 'ok'; })()`);
    // 감쇠 0.35 = 프레임마다 65% 로 준다 → 60fps 면 0.3초, 헤드리스(≈35fps)는 0.9초 안에 멈춘다
    await sleep(900); const d1=await J(`MC3DVIEW.camera.position.distanceTo(__c1)`); await sleep(300); const d2=await J(`MC3DVIEW.camera.position.distanceTo(__c1)`);
    ck(d1>0.01&&Math.abs(d2-d1)<Math.max(0.01,0.02*d1),'놓은 뒤 곧 멈춘다 (0.9초 뒤 0.3초간 움직임이 전체의 2% 미만) 이동='+d1.toFixed(3)+' Δ='+(d2-d1).toFixed(5));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); }
  finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 원활함 E2E '+n+'건 통과'));
  process.exit(fails.length?1:0);
})();
