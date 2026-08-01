'use strict';
// ===== v5.8 Task 2: 자체 테스트 스위트 (?test=1 쿼리 시 실행) =====
// v5.9 fix: 즉시 실행 → initApp(load+50ms) 이후로 지연 — stage 미생성 상태에서 exportAIBundle 테스트가 실패하던 버그
if(new URLSearchParams(location.search).get('test')==='1'){window.addEventListener('load',()=>setTimeout(function runTests(){
  let pass=0,fail=0,results=[];
  function assert(name,cond,detail){
    if(cond){pass++;results.push('✅ '+name);}
    else{fail++;results.push('❌ '+name+(detail?' — '+detail:''));}
  }
  // === Critical Test 1: SEMANTIC_MAP keys ⊆ 전체 라이브러리 키 합집합 ===
  const allLibKeys=new Set([
    ...Object.keys(FURNITURE_LIB),...Object.keys(FIXTURE_LIB),
    ...Object.keys(LIGHT_LIB),...Object.keys(ELECTRIC_LIB),...Object.keys(HVAC_FIRE_LIB)
  ]);
  const smKeys=Object.keys(SEMANTIC_MAP);
  const deadKeys=smKeys.filter(k=>!allLibKeys.has(k));
  if(deadKeys.length>0){
    deadKeys.forEach(k=>console.error('%c[SEMANTIC_MAP 사망키] '+k+' — 라이브러리에 없음','color:#E2725B;font-weight:bold'));
  }
  assert('CT1: SEMANTIC_MAP ⊆ 라이브러리 (dead alias 없음)',deadKeys.length===0,
    deadKeys.length?'사망키: '+deadKeys.join(', '):'');
  // === Critical Test 2: 전체 라이브러리 키 ⊆ SEMANTIC_MAP (역방향) ===
  const smSet=new Set(smKeys);
  const unmappedKeys=[...allLibKeys].filter(k=>!smSet.has(k));
  if(unmappedKeys.length>0){
    unmappedKeys.forEach(k=>console.warn('%c[SEMANTIC_MAP 누락키] '+k+' — fallback generic 사용 중','color:#D4A017;font-weight:bold'));
  }
  assert('CT2: 라이브러리 ⊆ SEMANTIC_MAP (미매핑 없음)',unmappedKeys.length===0,
    unmappedKeys.length?'미매핑: '+unmappedKeys.join(', '):'');
  // 1. darkenHex
  assert('darkenHex 빨강50%',darkenHex('#FF0000',0.5)==='#7f0000');
  assert('darkenHex 흰색50%',darkenHex('#FFFFFF',0.5)==='#7f7f7f');
  assert('darkenHex null입력',darkenHex(null,0.5)==='#000');
  assert('darkenHex 0%무변화',darkenHex('#C9A961',0)==='#c9a961');
  // 2. semanticOf
  assert('semanticOf sofa3',semanticOf('sofa3').tag==='main_seating');
  assert('semanticOf bathtub v5.8',semanticOf('bathtub').tag==='sanitary');
  assert('semanticOf smoke_detector v5.8',semanticOf('smoke_detector').tag==='smoke_detector');
  assert('semanticOf outlet_w v5.8',semanticOf('outlet_w').tag==='outlet');
  assert('semanticOf ac_ceiling v5.8',semanticOf('ac_ceiling').tag==='system_ac');
  assert('semanticOf unknown fallback',semanticOf('_xyz_').tag==='generic');
  // 3. pointInPolygon
  const sq=[{x:0,y:0},{x:1000,y:0},{x:1000,y:1000},{x:0,y:1000}];
  assert('pointInPolygon 내부',pointInPolygon({x:500,y:500},sq)===true);
  assert('pointInPolygon 외부',pointInPolygon({x:1500,y:500},sq)===false);
  assert('pointInPolygon 모서리근처',pointInPolygon({x:1,y:1},sq)===true);
  // 4. findContainingSpace
  const orig4=STATE.spaces.slice();
  STATE.spaces=[{id:'tsp',polygon:sq}];
  assert('findContainingSpace 내부',findContainingSpace({x:500,y:500})==='tsp');
  assert('findContainingSpace 외부',findContainingSpace({x:2000,y:2000})===null);
  STATE.spaces=orig4;
  // 5. placementOf
  const mSp={polygon:[{x:0,y:0},{x:2000,y:0},{x:2000,y:2000},{x:0,y:2000}]};
  assert('placementOf 중앙',placementOf({x:1000,y:1000},mSp)==='center');
  assert('placementOf 북쪽',placementOf({x:1000,y:100},mSp)==='in_north');
  assert('placementOf 남쪽',placementOf({x:1000,y:1900},mSp)==='in_south');
  assert('placementOf null공간',placementOf({x:0,y:0},null)==='unknown');
  // 6. defaultMaterials
  assert('defaultMaterials BATHROOM바닥',defaultMaterials('BATHROOM').floor==='TILE_BATH');
  assert('defaultMaterials BATHROOM벽',defaultMaterials('BATHROOM').wall==='WALL_TILE');
  assert('defaultMaterials LIVING기본',defaultMaterials('LIVING').floor==='STRONG');
  assert('defaultMaterials GARAGE에폭시',defaultMaterials('GARAGE').floor==='EPOXY');
  assert('defaultMaterials KITCHEN바닥',defaultMaterials('KITCHEN').floor==='STRONG');
  // 7. snapPointToSpaceEdges
  const orig7=STATE.spaces.slice();
  STATE.spaces=[{id:'ssp',polygon:[{x:0,y:0},{x:5000,y:0},{x:5000,y:5000},{x:0,y:5000}]}];
  const sn1=snapPointToSpaceEdges({x:150,y:2500},null);
  assert('snapPointToSpaceEdges 흡착',sn1.snapped===true);
  assert('snapPointToSpaceEdges x=0',sn1.pt.x===0);
  const sn2=snapPointToSpaceEdges({x:2500,y:2500},null);
  assert('snapPointToSpaceEdges 중앙없음',sn2.snapped===false);
  STATE.spaces=orig7;
  // 8. splitWallsAtIntersections
  const orig8=STATE.walls.slice();
  STATE.walls=[
    {id:'wh',x1:0,y1:500,x2:1000,y2:500,thickness:100},
    {id:'wv',x1:500,y1:0,x2:500,y2:1000,thickness:100},
  ];
  splitWallsAtIntersections();
  assert('splitWallsAtIntersections 4개',STATE.walls.length===4);
  const cw=STATE.walls.filter(w=>(Math.abs(w.x1-500)<2&&Math.abs(w.y1-500)<2)||(Math.abs(w.x2-500)<2&&Math.abs(w.y2-500)<2));
  assert('splitWallsAtIntersections vertex',cw.length===4);
  STATE.walls=orig8;
  // 9. migrateLoadedState
  const orig9=STATE.spaces.slice(),origW9=STATE.walls.slice();
  STATE.spaces=[{id:'m1',type:'BATHROOM',polygon:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}]}];
  STATE.walls=[];
  migrateLoadedState('v5.0');
  assert('migrateLoadedState typeIndex',typeof STATE.spaces[0].typeIndex==='number');
  assert('migrateLoadedState code=BATH',STATE.spaces[0].code==='BATH');
  assert('migrateLoadedState CONDITIONAL',STATE.spaces[0].waterproofRecommended==='CONDITIONAL');
  STATE.spaces=orig9;STATE.walls=origW9;
  // 10. findNearestWallId
  const orig10=STATE.walls.slice();
  STATE.walls=[{id:'nw',x1:0,y1:0,x2:0,y2:3000,thickness:100}];
  assert('findNearestWallId 가까운벽',findNearestWallId({x:80,y:1500,w:200,h:100})==='nw');
  STATE.walls=orig10;
  // 11. exportAIBundle (download 모킹)
  const oDDU=window.downloadDataURL,oDT=window.downloadText,bFiles=[];
  window.downloadDataURL=(u,n)=>bFiles.push(n);
  window.downloadText=(t,n)=>bFiles.push(n);
  try{
    exportAIBundle();
    assert('exportAIBundle 4종',bFiles.length===4);
    assert('exportAIBundle PNG',bFiles.some(f=>f.endsWith('.png')));
    assert('exportAIBundle JSON',bFiles.some(f=>f.endsWith('.json')));
    assert('exportAIBundle 이미지프롬프트',bFiles.some(f=>f.includes('image_prompts')));
    assert('exportAIBundle 영상프롬프트',bFiles.some(f=>f.includes('video_sequence')));
  }catch(e){assert('exportAIBundle 예외없음',false,e.message);}
  finally{window.downloadDataURL=oDDU;window.downloadText=oDT;}
  // 12. AutoEstimate (v5.9+) — 헌법: 단가는 사용자 단가표만, 미입력=NEEDS_RESEARCH
  if(typeof buildAutoEstimate==='function'){
    const origSp12=STATE.spaces.slice(),origW12=STATE.walls.slice(),origCfg12=STATE.estimateConfig;
    const origItems12=JSON.parse(JSON.stringify(PRICE_TABLE.items));
    try{
      STATE.spaces=[{id:'ae1',type:'LIVING',name:'거실',polygon:[{x:0,y:0},{x:5000,y:0},{x:5000,y:4000},{x:0,y:4000}]}];
      STATE.walls=[];STATE.estimateConfig={};
      Object.keys(PRICE_TABLE.items).forEach(k=>delete PRICE_TABLE.items[k]);
      PRICE_TABLE.items['FLOORING.STRONG']=50000;
      const ae=runAE();
      function runAE(){return buildAutoEstimate();}
      const fl=ae.items.find(i=>i.catalogKey==='FLOORING');
      assert('AE: FLOORING 수량 20㎡',fl&&Math.abs(fl.quantity-20)<0.01,fl&&String(fl.quantity));
      assert('AE: 금액=수량×단가(정수)',fl&&fl.amount===Math.round(fl.quantity*50000),fl&&String(fl.amount));
      assert('AE: 미입력 단가는 NEEDS_RESEARCH',ae.items.some(i=>i.unitPrice==='NEEDS_RESEARCH'));
      assert('AE: 미입력 건수 정합',ae.missingPriceCount===ae.items.filter(i=>i.amount==null).length);
      assert('AE: 직접공사비 합계 정합',ae.subtotal===ae.items.reduce((s,i)=>s+(i.amount||0),0));
      assert('AE: 옵션 미확정 표시',fl&&fl.optionConfirmed===false);
      assert('AE: 단가 출처 명시',ae.priceSource==='USER_PRICE_TABLE');
      const j12=buildJSON();
      assert('AE: JSON에 autoEstimate 포함',!!(j12.estimateInput&&j12.estimateInput.autoEstimate));
    }catch(e){assert('AE: 예외없음',false,e.message);}
    finally{
      STATE.spaces=origSp12;STATE.walls=origW12;STATE.estimateConfig=origCfg12;
      Object.keys(PRICE_TABLE.items).forEach(k=>delete PRICE_TABLE.items[k]);
      Object.assign(PRICE_TABLE.items,origItems12);
    }
  }
  // 13. addWall 공간 귀속 (v5.9 fix — 떨어진 자유벽이 spWall 물량을 부풀리던 버그)
  if(typeof addWall==='function'&&typeof _wallBelongsToSpace==='function'){
    const o13=STATE.spaces.slice(),ow13=STATE.walls.slice(),ov13=STATE.vertices.slice();
    try{
      STATE.spaces=[{id:'wb1',type:'LIVING',polygon:[{x:0,y:0},{x:5000,y:0},{x:5000,y:4000},{x:0,y:4000}]}];
      STATE.walls=[];
      addWall(0,6000,4000,6000); // 공간 경계에서 2000mm 밖
      const wFar=STATE.walls.find(w=>w.y1===6000&&w.y2===6000);
      assert('addWall: 떨어진 자유벽 spaceId=null',wFar&&wFar.spaceId===null,wFar&&String(wFar.spaceId));
      addWall(2000,0,2000,4000); // 공간 내부 칸막이
      const wIn=STATE.walls.find(w=>w.x1===2000&&w.x2===2000);
      assert('addWall: 내부 칸막이 spaceId 귀속',wIn&&wIn.spaceId==='wb1',wIn&&String(wIn.spaceId));
    }catch(e){assert('addWall 귀속 예외없음',false,e.message);}
    finally{STATE.spaces=o13;STATE.walls=ow13;STATE.vertices=ov13;}
  }
  // 14. 벽 트림 조각 제거 (v5.9 fix — 자동 분할 이후 트림 무동작이던 버그)
  if(typeof handleTrim==='function'&&typeof addWall==='function'){
    const o14=STATE.spaces.slice(),ow14=STATE.walls.slice(),ov14=STATE.vertices.slice();
    try{
      STATE.spaces=[];STATE.walls=[];
      addWall(5500,6000,8500,6000); // 가로
      addWall(7000,5000,7000,7000); // 세로 → 자동 분할로 4조각
      const before=STATE.walls.length;
      handleTrim({x:STATE.offsetX+mmToPx(7000),y:STATE.offsetY+mmToPx(5500)}); // 위쪽 조각 클릭
      assert('트림: 십자 자동분할 4조각',before===4,'before='+before);
      assert('트림: 클릭 조각 제거 (4→3)',STATE.walls.length===3,'after='+STATE.walls.length);
    }catch(e){assert('트림 예외없음',false,e.message);}
    finally{STATE.spaces=o14;STATE.walls=ow14;STATE.vertices=ov14;}
  }
  // 15. 자유 다각형 (v5.9 — 도움말 스펙 복원)
  if(typeof finishFreePolygon==='function'){
    const o15=STATE.spaces.slice(),ov15=STATE.vertices.slice(),ow15=STATE.walls.slice();
    try{
      STATE.spaces=[];STATE.walls=[];
      // L자 공간: 4×3m − 2×1.5m = 9㎡
      freePolyState={points:[{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:2000,y:3000},{x:2000,y:1500},{x:0,y:1500}]};
      finishFreePolygon();
      assert('자유 다각형: L자 공간 생성',STATE.spaces.length===1);
      assert('자유 다각형: 면적 9㎡',STATE.spaces.length===1&&Math.abs(spArea(STATE.spaces[0])-9)<0.01,STATE.spaces[0]?String(spArea(STATE.spaces[0])):'');
    }catch(e){assert('자유 다각형 예외없음',false,e.message);}
    finally{STATE.spaces=o15;STATE.vertices=ov15;STATE.walls=ow15;freePolyState=null;}
  }
  // 16. JSON 프로파일 (v5.9)
  if(typeof buildJSONProfile==='function'){
    const e16=buildJSONProfile('estimate');
    assert('프로파일 estimate: 작도보조 제거+견적 유지',!e16.xlines&&!e16.measures&&!e16.furniture&&!!e16.estimateInput&&!!e16.spaces);
    const a16=buildJSONProfile('ai_render');
    assert('프로파일 ai_render: 견적 제거+시맨틱 유지',!a16.estimateInput&&!!a16.furniture&&!!(a16.meta&&a16.meta.aiPromptHints));
    const f16=buildJSONProfile('full');
    assert('프로파일 full: 전체 유지',!!f16.estimateInput&&!!f16.indices&&f16.profile==='full');
  }
  // 17. 견적서 발행 (v5.9 — 인쇄 문서 + 단가표 템플릿)
  if(typeof buildEstimateDocHTML==='function'){
    const o17=STATE.spaces.slice(),oc17=STATE.estimateConfig,op17=JSON.parse(JSON.stringify(PRICE_TABLE.items));
    try{
      STATE.spaces=[{id:'ed1',type:'LIVING',name:'거실',polygon:[{x:0,y:0},{x:5000,y:0},{x:5000,y:4000},{x:0,y:4000}]}];
      STATE.estimateConfig={};
      Object.keys(PRICE_TABLE.items).forEach(k=>delete PRICE_TABLE.items[k]);
      PRICE_TABLE.items['FLOORING.STRONG']=50000;
      const html=buildEstimateDocHTML();
      assert('견적서: HTML 문서 생성',typeof html==='string'&&html.includes('견 적 서'));
      assert('견적서: 총계·합계 블록',html.includes('총 견적 금액')&&html.includes('직접공사비'));
      assert('견적서: 미입력 단가 NEEDS_RESEARCH 명시',html.includes('NEEDS_RESEARCH'));
      assert('견적서: 금액 계산 반영 (20㎡×50000)',html.includes((20*50000).toLocaleString('ko-KR')));
      const oDT=window.downloadText;let tplData=null;
      window.downloadText=(t,n)=>{tplData={t,n};};
      try{exportPriceTemplate();}finally{window.downloadText=oDT;}
      const tpl=JSON.parse(tplData.t);
      assert('단가표 템플릿: 전 옵션 조합',Object.keys(tpl.items).length>=30,String(Object.keys(tpl.items).length));
      assert('단가표 템플릿: 기존 단가 유지',tpl.items['FLOORING.STRONG']===50000);
      assert('단가표 템플릿: 미입력=null (추정 금지)',tpl.items['WALLPAPER.SILK']===null);
    }catch(e){assert('견적서 예외없음',false,e.message);}
    finally{STATE.spaces=o17;STATE.estimateConfig=oc17;Object.keys(PRICE_TABLE.items).forEach(k=>delete PRICE_TABLE.items[k]);Object.assign(PRICE_TABLE.items,op17);}
  }
  // === v5.9.2: 견적OS 브리지 (sendToEstimateOS) ===
  {
    const _prevBridge=localStorage.getItem('ecorean_bridge_plan_v1');
    try{
      assert('브리지: sendToEstimateOS 정의',typeof sendToEstimateOS==='function');
      sendToEstimateOS(true); // silent — 탭 열기/토스트 없이 기록만
      const bd=JSON.parse(localStorage.getItem('ecorean_bridge_plan_v1')||'null');
      assert('브리지: plan 기록 + 스키마',!!(bd&&bd.plan&&String(bd.plan.schema||'').startsWith('ECOREAN.FloorPlan')));
      assert('브리지: sentAt ISO 타임스탬프',!!(bd&&bd.sentAt&&!isNaN(Date.parse(bd.sentAt))));
      assert('브리지: 작도보조·AI메타 제거',!!(bd&&bd.plan&&!bd.plan.measures&&!bd.plan.xlines&&!(bd.plan.meta&&bd.plan.meta.aiPromptHints)));
      assert('브리지: 배치객체 유지 (전기/설비 매핑용)',!!(bd&&bd.plan&&Array.isArray(bd.plan.lights)&&Array.isArray(bd.plan.fixtures)&&Array.isArray(bd.plan.electric)));
      assert('브리지: estimateInput 유지',!!(bd&&bd.plan&&bd.plan.estimateInput&&bd.plan.estimateInput.summary));
      assert('브리지: 도면 PNG 스냅샷 포함',!!(bd&&typeof bd.png==='string'&&bd.png.indexOf('data:image/png')===0));
      assert('브리지: 클라우드 업로드 함수 정의',typeof uploadPlanToCloud==='function');
    }catch(e){assert('브리지: 예외 없음',false,e.message);}
    finally{
      if(_prevBridge===null)localStorage.removeItem('ecorean_bridge_plan_v1');
      else localStorage.setItem('ecorean_bridge_plan_v1',_prevBridge);
    }
  }
  // 결과
  const total=pass+fail,color=fail?'#E2725B':'#7BA05B';
  console.group('%c ECOREAN v5.8 Test Suite','background:'+color+';color:#fff;font-weight:bold;padding:4px 8px');
  results.forEach(r=>console.log(r));
  console.groupEnd();
  console.log('%c '+pass+'/'+total+' 통과'+(fail?' | 실패 '+fail:''),'font-weight:bold;color:'+color);
  if(fail>0)console.error('[ECOREAN TDD] 테스트 실패 — 커밋 금지');
  const t=document.createElement('div');
  t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:'+color
    +';color:#fff;padding:12px 28px;border-radius:4px;font-family:monospace;font-size:13px;'
    +'font-weight:bold;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.6)';
  t.textContent='TEST '+(fail?'FAIL ❌':'PASS ✅')+' — '+pass+'/'+total+(fail?' (실패 '+fail+'건)':'');
  document.body.appendChild(t);
},400));}
