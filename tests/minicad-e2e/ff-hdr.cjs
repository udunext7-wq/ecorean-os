// HDR 배경·환경광 E2E
const {launch,sleep}=require('./cdp.cjs'); const fs=require('fs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9410}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    // 상자 두 개 (유리·금속) — 환경광이 비치는지 볼 대상
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
      {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:0,y:0},{x:1600,y:0},{x:1600,y:1600},{x:0,y:1600}],z:1600,name:'G',color:'#9FC8E8'}},
      {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:2400,y:0},{x:4000,y:0},{x:4000,y:1600},{x:2400,y:1600}],z:1600,name:'M',color:'#C9A961'}}]});
      MC3DVIEW.ffSetMatProp('C_9FC8E8',{op:0.3,ro:0.05,me:0});
      MC3DVIEW.ffSetMatProp('C_C9A961',{op:1,ro:0.15,me:1});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(600);
    ck(!(await J(`!!MC3DVIEW.scene.environment`)),'처음엔 환경광 없음');
    // HDR 적용
    const ok=await J(`MC3DVIEW.ffSetHdr('/tests/minicad-e2e/fixtures/test.hdr','테스트 하늘',true)`);
    await sleep(1200);
    ck(ok===true,'HDR 파일을 읽었다');
    let m=await J(`(()=>({sky:MC3DVIEW.ST.sky,env:!!MC3DVIEW.scene.environment,name:MC3DVIEW.ST.hdrName,url:MC3DVIEW.ST.hdrUrl}))()`);
    ck(m.sky==='image'&&m.env&&m.name==='테스트 하늘'&&/fixtures\/test\.hdr/.test(m.url||''),'배경 = HDR · 환경광 = PMREM '+JSON.stringify(m));
    let r=await b.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync('hdr-on.png',Buffer.from(r.data,'base64'));
    // 환경광 끄기/켜기
    await J(`MC3DVIEW.ffHdrLight(false);'ok'`); await sleep(300);
    ck(!(await J(`!!MC3DVIEW.scene.environment`)),'환경광 끄면 scene.environment 해제');
    await J(`MC3DVIEW.ffHdrLight(true);'ok'`); await sleep(300);
    ck(await J(`!!MC3DVIEW.scene.environment`),'다시 켜면 붙는다');
    // 노출
    await J(`MC3DVIEW.ffHdrExposure(2.5);'ok'`); await sleep(300);
    m=await J(`(()=>({exp:MC3DVIEW.ST.hdrExp,uni:MC3DVIEW.scene.environmentIntensity}))()`);
    ck(Math.abs(m.exp-2.5)<0.01,'노출 2.5 '+JSON.stringify(m));
    // 문서에 실린다 → 새로 만들고 되열기
    const doc=await J(`MC3DVIEW.ffDocJSON()`);
    ck(/fixtures\/test\.hdr/.test(doc)&&/"exp":2.5/.test(doc),'문서에 HDR 주소·노출이 실린다');
    await J(`MC3DVIEW.ffHdrClear();MC3DVIEW.setSky('sky');MC3DVIEW.ffNew();'ok'`); await sleep(400);
    ck(!(await J(`!!MC3DVIEW.scene.environment`))&&!(await J(`MC3DVIEW.ST.hdrUrl`)),'해제되었다');
    await J(`MC3DVIEW.ffApplyDoc(JSON.parse(${JSON.stringify(doc)}),'테스트');'ok'`); await sleep(1400);
    m=await J(`(()=>({env:!!MC3DVIEW.scene.environment,sky:MC3DVIEW.ST.sky,exp:MC3DVIEW.ST.hdrExp,name:MC3DVIEW.ST.hdrName}))()`);
    ck(m.env&&m.sky==='image'&&Math.abs(m.exp-2.5)<0.01,'문서를 열면 HDR 이 다시 붙는다 '+JSON.stringify(m));
    // 배경 순환에서 되돌아와도 유지
    await J(`MC3DVIEW.setSky('sky');'ok'`); await sleep(250);
    ck(!(await J(`!!MC3DVIEW.scene.environment`)),'하늘·바닥으로 바꾸면 환경광도 내린다');
    await J(`MC3DVIEW.setSky('image');'ok'`); await sleep(250);
    ck(await J(`!!MC3DVIEW.scene.environment`),'다시 그림으로 오면 HDR 환경광 복귀');
    // UI
    m=await J(`(()=>({btn:!!document.getElementById('st-hdr'),lit:!!document.getElementById('st-hdrlight'),row:document.getElementById('hdrrow').style.display,mi:!!document.getElementById('mi-hdr-light'),txt:document.querySelector('#st-hdr span').textContent}))()`);
    ck(m.btn&&m.lit&&m.row===''&&m.mi&&/테스트 하늘/.test(m.txt),'스타일 패널 버튼·노출 슬라이더·메뉴 '+JSON.stringify(m));
    // 일반 그림 배경은 종전대로 (HDR 아님)
    await J(`MC3DVIEW.ffHdrClear();MC3DVIEW.setSkyImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');'ok'`); await sleep(500);
    m=await J(`(()=>({sky:MC3DVIEW.ST.sky,env:!!MC3DVIEW.scene.environment}))()`);
    ck(m.sky==='image'&&!m.env,'보통 그림 배경은 환경광 없이 종전대로 '+JSON.stringify(m));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,3)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ HDR 배경·환경광 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
