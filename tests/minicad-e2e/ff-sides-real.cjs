// 다각형 변 수·반지름 — 진짜 키 입력(CDP) E2E: 찍기 전 5s · 한글 IME 5ㄴ · 조합 Enter(keyup) · 클릭 전 반지름 · 그리는 중 반지름
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9442}); const J=s=>b.evalJS(s);
  const key=async(ch)=>{ let ev;
    if(ch==='Enter') ev={type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'};
    else if(ch==='Escape') ev={type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27};
    else ev={type:'keyDown',key:ch,code:(/\d/.test(ch)?'Digit'+ch:'Key'+ch.toUpperCase()),windowsVirtualKeyCode:ch.toUpperCase().charCodeAt(0),text:ch,unmodifiedText:ch};
    await b.send('Input.dispatchKeyEvent',ev); const up=Object.assign({},ev,{type:'keyUp'}); delete up.text; delete up.unmodifiedText; await b.send('Input.dispatchKeyEvent',up); await sleep(50); };
  const type=async(s)=>{ for(const ch of s) await key(ch); };
  // 한글 IME 흉내: keydown 'Process'(229) → 입력값에 ㄴ 삽입 → Enter 도 'Process' 로만 keydown, keyup 은 Enter
  const imeChar=async(hangul)=>{ await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Process',code:'KeyS',windowsVirtualKeyCode:229});
    await J(`(()=>{var i=document.activeElement;if(i&&i.closest&&i.closest('#vcb')){i.value+=${JSON.stringify(hangul)};}return 1})()`);
    await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS',windowsVirtualKeyCode:83}); await sleep(50); };
  const imeEnter=async()=>{ await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Process',code:'Enter',windowsVirtualKeyCode:229});
    await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13}); await sleep(80); };
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__pt=(x,y,z)=>{var V=MC3DVIEW,T=V.THREE;var p=new T.Vector3(x*0.001,(z||0)*0.001,y*0.001).project(V.camera);var r=V.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)/2*r.width,y:r.top+(1-p.y)/2*r.height};};window.__ev=(t,x,y)=>{var el=MC3DVIEW.renderer.domElement;el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:t==='pointerup'?0:1,pointerId:1,pointerType:'mouse',isPrimary:true}));};window.__click=(x,y)=>{__ev('pointermove',x,y);__ev('pointerdown',x,y);__ev('pointerup',x,y);MC3DVIEW.renderer.domElement.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:x,clientY:y,detail:1}));};window.__cl=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);__click(p.x,p.y);};window.__mv=(x,y,z)=>{var p=__pt(x,y,z);__ev('pointermove',p.x,p.y);};
      window.__faces=()=>{var out=[];var F=MC3DVIEW.FF.free;(F.sketchFaces||[]).forEach(f=>out.push({n:f.pts.length,gen:f.gen||null}));return out;};
      window.__st=()=>({tool:MC3DVIEW.ST.tool,op:MC3DVIEW.ST.op&&MC3DVIEW.ST.op.type,sides:MC3DVIEW.ST.polySides,pre:MC3DVIEW.ST.preRadius||null,vcb:(document.querySelector('#vcb .v-v')||{}).value});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.setTool('polygon');MC3DVIEW.drawFrame();'ok'`); await sleep(300);
    // ① 찍기 전 "5s" Enter (영문)
    await type('5s'); await key('Enter');
    let m=await J(`__st()`);
    ck(m.sides===5&&!m.op&&m.tool==='polygon','찍기 전 키보드 "5s" Enter → 5각 · 도구는 그대로(5=시점, s=배율로 안 샘) '+JSON.stringify(m));
    // ② 찍기 전 반지름 "1500" Enter → 중심 클릭에 바로 완성
    await type('1500'); await key('Enter');
    m=await J(`__st()`);
    ck(m.pre===1500&&!m.op,'찍기 전 "1500" Enter → 반지름 준비 '+JSON.stringify(m));
    await J(`__cl(0,0,0);'ok'`); await sleep(500);
    let f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===5&&f[0].gen.r===1500,'중심 클릭 → 바로 5각형 r=1500 '+JSON.stringify(f));
    await key('Escape'); await sleep(150);
    // ③ 한글 IME: "5" + ㄴ(=s) + 조합 Enter(keydown 은 Process, keyup 만 Enter)
    await J(`MC3DVIEW.ffNew();MC3DVIEW.setTool('circle');MC3DVIEW.setTool('polygon');'ok'`); await sleep(100);
    await type('7'); await imeChar('ㄴ');
    m=await J(`__st()`); ck(m.vcb==='7ㄴ','IME 로 "7ㄴ" 이 입력됨 '+JSON.stringify(m));
    await imeEnter();
    m=await J(`__st()`);
    ck(m.sides===7&&!m.op&&m.vcb==='','조합 중 Enter(keydown=Process) 도 keyup 으로 받아 7각 '+JSON.stringify(m));
    // ④ 5각 / 5변 표기도
    await type('8'); await J(`(()=>{var i=document.activeElement;if(i&&i.closest('#vcb'))i.value+='각';return 1})()`); await key('Enter');
    ck((await J(`__st()`)).sides===8,'"8각" 도 변 수로');
    // ⑤ 중심 클릭 뒤 그리는 중 반지름 "900" Enter
    await J(`__cl(0,0,0);__mv(600,0,0);'ok'`); await sleep(200);
    await type('900'); await key('Enter'); await sleep(450);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===8&&f[0].gen.r===900,'그리는 중 "900" Enter → 8각형 r=900 '+JSON.stringify(f));
    await key('Escape'); await sleep(150);
    // ⑥ 그린 직후 "12s" Enter (키보드) → 12각
    await type('12s'); await key('Enter'); await sleep(450);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===12&&f[0].gen.r===900,'그린 직후 키보드 "12s" → 12각 (r 유지) '+JSON.stringify(f));
    // ⑦ 그린 직후는 높이 단계(pp) — 숫자는 높이. Esc 로 높이 단계를 나온 뒤 숫자 Enter = 반지름 다시 (스케치업 후속 입력)
    m=await J(`__st()`); ck(m.op==='pp','"12s" 뒤에도 높이 단계가 이어진다 '+JSON.stringify(m));
    await key('Escape'); await sleep(150);
    await type('2000'); await key('Enter'); await sleep(450);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===12&&f[0].gen.r===2000,'Esc 뒤 "2000" Enter → 12각형 반지름 2000 으로 다시 '+JSON.stringify(f));
    await key('Escape'); await sleep(150);
    // ⑧ 도구를 바꿨다 돌아오면 '그린 직후' 가 끝나 숫자는 미리 반지름이 되고, 다시 바꾸면 해제
    await J(`MC3DVIEW.setTool('line');MC3DVIEW.setTool('polygon');'ok'`); await sleep(50);
    await type('2000'); await key('Enter');
    ck((await J(`__st()`)).pre===2000,'도구를 바꿨다 오면 "2000" = 미리 반지름');
    await J(`MC3DVIEW.setTool('line');'ok'`); await sleep(50);
    ck(!(await J(`__st()`)).pre,'도구를 바꾸면 미리 반지름 해제');
    // ⑧ 원 도구: "24s" + 미리 반지름 → 클릭에 바로 24분할 원
    await J(`MC3DVIEW.ffNew();MC3DVIEW.setTool('circle');'ok'`); await sleep(50);
    await type('24s'); await key('Enter'); await type('800'); await key('Enter');
    await J(`__cl(0,0,0);'ok'`); await sleep(500);
    f=await J(`__faces()`);
    ck(f.length===1&&f[0].n===24&&f[0].gen.kind==='circle'&&f[0].gen.r===800,'원: "24s" + "800" 미리 → 클릭에 바로 24분할 r=800 '+JSON.stringify(f));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 변 수·반지름 실제 키 입력 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
