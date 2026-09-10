// 저장 안전망 + 클라우드 E2E — 용량 초과 경고 · 용량 미터 · 클라우드 저장/열기/삭제
const {launch,sleep}=require('./cdp.cjs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9390}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    // 평상시엔 경고가 없다
    let m=await J(`(()=>{var w=document.getElementById('savewarn');return {exists:!!w,disp:w&&w.style.display,fail:MC3DVIEW.ST.saveFail||null,bytes:MC3DVIEW.ST.saveBytes>0}})()`);
    ck(m.exists&&m.disp!=='flex'&&!m.fail&&m.bytes,'평상시 = 경고 없음 · 용량은 기록됨 '+JSON.stringify(m));
    // 모델 정보에 용량 미터
    await J(`MC3DVIEW.menuCmd?MC3DVIEW.menuCmd('modelinfo'):document.getElementById('modelinfo').style.display='flex';MC3DVIEW.ffSaveMeter();'ok'`); await sleep(150);
    m=await J(`(()=>{var e=document.getElementById('mi-save');return {html:!!e&&/저장 용량/.test(e.innerHTML),bar:!!e&&/width:/.test(e.innerHTML)}})()`);
    ck(m.html&&m.bar,'모델 정보에 저장 용량 미터 + 막대 '+JSON.stringify(m));
    await J(`document.getElementById('modelinfo').style.display='none';'ok'`);
    // 저장소를 일부러 채워서 초과를 만든다 → 경고가 뜬다
    // 먼저 문서를 키우고(매스 400개 ≈ 85KB), 저장소를 끝까지 채운 뒤 편집한다
    await J(`(()=>{ var ops=[]; for(var i=0;i<400;i++){ var x=(i%20)*1500, y=Math.floor(i/20)*1500;
      ops.push({op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:x,y:y},{x:x+1000,y:y},{x:x+1000,y:y+1000},{x:x,y:y+1000}],z:1000,name:'B'+i}}); }
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'g',ops:ops}); return 1; })()`); await sleep(600);
    m=await J(`(()=>{ var n=0;
      [1024*128,1024*8,1024].forEach(function(sz){ var s='x'.repeat(sz); try{ for(var k=0;k<600;k++){ localStorage.setItem('__fill'+(n++),s); } }catch(e){} });
      var ops=[]; for(var i=0;i<900;i++){ var x=-((i%30)*1500)-5000, y=Math.floor(i/30)*1500;
        ops.push({op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:x,y:y},{x:x+1000,y:y},{x:x+1000,y:y+1000},{x:x,y:y+1000}],z:1000,name:'Q'+i}}); }
      MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'grow',ops:ops});   // 문서가 커져 저장소에 안 들어간다
      var w=document.getElementById('savewarn');
      return {filled:n,kb:Math.round((MC3DVIEW.ST.saveBytes||0)/1024),fail:MC3DVIEW.ST.saveFail,disp:w.style.display,txt:w.querySelector('.sw-t').textContent}; })()`);
    ck(!!m.fail&&m.disp==='flex'&&/가득/.test(m.txt),'용량 초과 → 배너 경고 (종전엔 조용히 실패) '+JSON.stringify(m));
    // 자리를 비우면 경고가 내려간다
    m=await J(`(()=>{ for(var i=0;i<2000;i++) localStorage.removeItem('__fill'+i);
      MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:2000,y:0},{x:3000,y:0},{x:3000,y:1000},{x:2000,y:1000}],z:800,name:'R'}});
      var w=document.getElementById('savewarn');
      return {fail:MC3DVIEW.ST.saveFail,disp:w.style.display}; })()`);
    ck(!m.fail&&m.disp==='none','자리가 생기면 경고가 내려간다 '+JSON.stringify(m));
    // 클라우드: 로그인 없으면 안내만 (조용히 실패하지 않는다)
    m=await J(`(()=>{ MC3DVIEW.ffCloudSave(false); return {ready:MC3DVIEW.ffCloudReady(),st:document.getElementById('status').textContent}; })()`);
    ck(!m.ready&&/로그인/.test(m.st),'로그인 없으면 클라우드는 안내 문구 '+JSON.stringify(m));
    // 클라우드 저장/열기 — APP_CLOUD 를 가짜로 끼워 왕복을 검사
    await J(`window.__db={};window.APP_CLOUD={ready:()=>true,email:()=>'t@e.com',
      save:(app,k,t,d)=>{__db[k]={doc_key:k,title:t,data:d,updated_at:new Date().toISOString(),updated_by:'t@e.com'};return Promise.resolve(__db[k]);},
      list:app=>Promise.resolve(Object.keys(__db).map(k=>({doc_key:k,title:__db[k].title,updated_at:__db[k].updated_at,updated_by:__db[k].updated_by}))),
      load:(app,k)=>Promise.resolve(__db[k]||null),
      remove:(app,k)=>{delete __db[k];return Promise.resolve();}};
      window.prompt=()=>'테스트 모델';'ok'`);
    await J(`MC3DVIEW.ffCloudSave(false);'ok'`); await sleep(300);
    m=await J(`(()=>({keys:Object.keys(__db).length,title:Object.values(__db)[0]&&Object.values(__db)[0].title,masses:Object.values(__db)[0]&&Object.values(__db)[0].data.free.masses.length,st:document.getElementById('status').textContent}))()`);
    ck(m.keys===1&&m.title==='테스트 모델'&&m.masses===1301&&/저장 완료/.test(m.st),'클라우드 저장 — 저장소가 못 담는 크기도 올라간다 (매스 1301) '+JSON.stringify(m));
    // 모델을 비우고 클라우드에서 되돌린다
    await J(`MC3DVIEW.ffNew();'ok'`); await sleep(250);
    ck((await J(`MC3DVIEW.FF.free.masses.length`))===0,'새로 만들기로 비움');
    await J(`MC3DVIEW.ffCloudOpen();'ok'`); await sleep(350);
    m=await J(`(()=>{var el=document.getElementById('ffcloud');return {disp:el.style.display,items:el.querySelectorAll('.cl-it').length,name:el.querySelector('.cl-n')&&el.querySelector('.cl-n').textContent}})()`);
    ck(m.disp==='flex'&&m.items===1&&m.name==='테스트 모델','클라우드 목록에 저장한 모델이 보인다 '+JSON.stringify(m));
    await J(`document.querySelector('#ffcloud .cl-it').click();'ok'`); await sleep(400);
    m=await J(`(()=>({masses:MC3DVIEW.FF.free.masses.length,disp:document.getElementById('ffcloud').style.display,st:document.getElementById('status').textContent}))()`);
    ck(m.masses===1301&&m.disp==='none'&&/열었습니다/.test(m.st),'클라우드에서 열기 → 매스 1301개 복구 '+JSON.stringify(m));
    // 삭제
    await J(`window.confirm=()=>true;MC3DVIEW.ffCloudOpen();'ok'`); await sleep(300);
    await J(`document.querySelector('#ffcloud .cl-del').click();'ok'`); await sleep(400);
    m=await J(`(()=>({keys:Object.keys(__db).length,msg:!!document.querySelector('#ffcloud .cl-msg')}))()`);
    ck(m.keys===0&&m.msg,'클라우드에서 삭제 '+JSON.stringify(m));
    await J(`document.querySelector('#ffcloud [data-cl="close"]').click();'ok'`);
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 저장 안전망·클라우드 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
