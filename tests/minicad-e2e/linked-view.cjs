// 연동 뷰(?ff 없음) 회귀 — 부팅 오류 0 · 옛 메뉴 그대로
const {launch,sleep}=require('./cdp.cjs');
(async()=>{ const b=await launch({port:9339}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/'); await b.waitFor('!!window.MC3DVIEW'); await sleep(800);
    const r=await J(`({menus:document.querySelectorAll('#menubar .menu').length,title:document.querySelector('#menubar .mtitle').textContent,tools:document.querySelectorAll('#tools .btn').length,save:!!document.querySelector('[data-cmd="save"]'),empty:getComputedStyle(document.getElementById('empty')).display,ff:MC3DVIEW.ST.ffOn,status:document.getElementById('status').textContent})`);
    console.log(JSON.stringify(r)); console.log('errors',b.errors.slice(0,3));
    const ok=r.menus===8&&r.title.includes('미니폼')&&r.tools===19&&r.save&&r.ff===false&&b.errors.length===0;
    console.log(ok?'✅ 연동 뷰 회귀 통과':'❌ 연동 뷰 회귀 실패'); process.exitCode=ok?0:1;
  }catch(e){ console.error('FAIL',e.message); process.exitCode=1; } finally{ b.close(); } })();
