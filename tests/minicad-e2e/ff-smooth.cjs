// 부드러운 곡면 E2E — 곡면은 법선이 섞이고 상자 모서리는 그대로 각진다
const {launch,sleep}=require('./cdp.cjs'); const fs=require('fs');
const fails=[]; let n=0; const ck=(c,m)=>{ n++; if(!c) fails.push(m); console.log((c?'  ✅ ':'  ❌ ')+m); };
(async()=>{ const b=await launch({port:9407}); const J=s=>b.evalJS(s);
  try{ await b.goto('http://127.0.0.1:8090/sites/net/public/minicad/3d/?ff=1'); await b.waitFor('!!window.MC3DVIEW&&!!MC3DVIEW.FF'); await J(`localStorage.clear();MC3DVIEW.ffNew();'ok'`); await sleep(400);
    await J(`window.__poly=(r,k,cx)=>{var a=[];for(var i=0;i<k;i++){var t=i/k*Math.PI*2;a.push({x:Math.round(Math.cos(t)*r)+(cx||0),y:Math.round(Math.sin(t)*r)});}return a;};
      window.__norm=(name)=>{var out=null;MC3DVIEW.scene.traverse(function(o){ if(o.isMesh&&o.userData.obj&&o.userData.obj.name===name){ var g=o.geometry,N=g.getAttribute('normal').array,P=g.getAttribute('position').array;
        // 옆면 삼각형 하나의 세 법선이 서로 다르면 스무스, 같으면 플랫
        var best=null;
        for(var t=0;t<N.length;t+=9){ if(Math.abs(N[t+1])>0.5) continue;  // 위/아래 뚜껑 건너뛰기
          var d=Math.abs(N[t]-N[t+3])+Math.abs(N[t+2]-N[t+5]); if(best===null||d>best) best=d; }
        out={spread:Math.round((best||0)*1000)/1000,tris:N.length/9}; } }); return out; };'ok'`);
    // 24각 원기둥 + 상자
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'batch',label:'x',ops:[
      {op:'massfrompoly',floorId:'freeform',patch:{pts:__poly(1200,24,0),z:2000,name:'CYL'}},
      {op:'massfrompoly',floorId:'freeform',patch:{pts:[{x:4000,y:-1000},{x:6000,y:-1000},{x:6000,y:1000},{x:4000,y:1000}],z:2000,name:'BOX'}}]});
      MC3DVIEW.setView('iso');MC3DVIEW.fitView(true);MC3DVIEW.drawFrame();'ok'`); await sleep(700);
    ck((await J(`MC3DVIEW.ST.smooth`))===true,'부드러운 곡면 기본 켬');
    let cyl=await J(`__norm('CYL')`), box=await J(`__norm('BOX')`);
    ck(cyl&&cyl.spread>0.05,'원기둥 옆면 = 꼭짓점마다 법선이 다르다 (매끄러움) '+JSON.stringify(cyl));
    ck(box&&box.spread<0.001,'상자 옆면 = 법선이 같다 (각짐 유지) '+JSON.stringify(box));
    let r=await b.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync('smooth-on.png',Buffer.from(r.data,'base64'));
    // 끄면 면마다
    await J(`MC3DVIEW.setSmooth(false);MC3DVIEW.drawFrame();'ok'`); await sleep(400);
    cyl=await J(`__norm('CYL')`);
    ck(cyl&&cyl.spread<0.001,'끄면 원기둥도 면마다 각지게 '+JSON.stringify(cyl));
    r=await b.send('Page.captureScreenshot',{format:'png'}); fs.writeFileSync('smooth-off.png',Buffer.from(r.data,'base64'));
    // 다시 켜기
    await J(`MC3DVIEW.setSmooth(true);MC3DVIEW.drawFrame();'ok'`); await sleep(400);
    cyl=await J(`__norm('CYL')`);
    ck(cyl&&cyl.spread>0.05,'다시 켜면 매끄러워진다 '+JSON.stringify(cyl));
    // 새로 만든 매스도 자동으로
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:__poly(900,32,-4000),z:1500,name:'CYL2'}});MC3DVIEW.drawFrame();'ok'`); await sleep(600);
    const c2=await J(`__norm('CYL2')`);
    ck(c2&&c2.spread>0.03,'새로 만든 곡면도 자동으로 매끄럽다 '+JSON.stringify(c2));
    // 각이 크면 안 섞는다 — 6각 기둥(60°)은 각져야
    await J(`MC3DVIEW.emitEdit({type:'edit',op:'massfrompoly',floorId:'freeform',patch:{pts:__poly(900,6,8000),z:1500,name:'HEX'}});MC3DVIEW.drawFrame();'ok'`); await sleep(600);
    const hx=await J(`__norm('HEX')`);
    ck(hx&&hx.spread<0.001,'6각 기둥(60°)은 기준 20° 밖이라 각짐 유지 '+JSON.stringify(hx));
    // 메뉴·패널 배선
    const ui=await J(`(()=>({mi:!!document.getElementById('mi-smooth'),st:!!document.getElementById('st-smooth'),on:document.getElementById('st-smooth').classList.contains('on')}))()`);
    ck(ui.mi&&ui.st&&ui.on,'보기 메뉴 + 스타일 패널 버튼 '+JSON.stringify(ui));
    ck(b.errors.length===0,'콘솔 오류 0'+(b.errors.length?' — '+JSON.stringify(b.errors.slice(0,2)):''));
  }catch(e){ console.error('FAIL',e.message); fails.push('예외: '+e.message); } finally{ b.close(); }
  console.log(fails.length?('❌ '+fails.length+'/'+n+' 실패:\n - '+fails.join('\n - ')):('✅ 부드러운 곡면 E2E '+n+'건 통과')); process.exit(fails.length?1:0); })();
