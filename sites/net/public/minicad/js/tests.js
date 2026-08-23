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
  // 2026-08-19: 반경 파라미터 — 넘긴 반경(mm)으로 동작
  assert('snapPointToSpaceEdges 반경 파라미터 2600 → 중앙도 흡착',snapPointToSpaceEdges({x:2500,y:2500},null,2600).snapped===true);
  assert('snapPointToSpaceEdges 반경 파라미터 100 → 150mm 미흡착',snapPointToSpaceEdges({x:150,y:2500},null,100).snapped===false);
  STATE.spaces=orig7;
  // 7b. 2026-08-19: 공간 드래그 스냅 개편 — rawMm / snapRadiusMm / 축분리 스냅 / 히스테리시스 / 가이드
  (function(){
    const z0=STATE.zoom,ox=STATE.offsetX,oy=STATE.offsetY,sp0=STATE.spaces.slice(),tch=STATE.touch,ctrl0=STATE.ctrlPressed,snapEp=STATE.snap.endpoint;
    STATE.zoom=1;STATE.offsetX=0;STATE.offsetY=0;STATE.ctrlPressed=false;STATE.snap.endpoint=true;
    // rawMm: 스냅 없이 px→mm (80px/m @ zoom1)
    const r1=rawMm({x:80,y:160});
    assert('rawMm: px→mm 순수 변환',r1.x===1000&&r1.y===2000);
    // snapRadiusMm: 마우스 14px=175mm → 최소 200 적용 / 터치 28px=350mm / 줌아웃 0.2 터치 → 1750→상한 1500
    STATE.touch={lastType:'mouse'};
    assert('snapRadiusMm 마우스 zoom1 = max(200,175)=200',snapRadiusMm(200)===200);
    STATE.touch={lastType:'touch'};
    assert('snapRadiusMm 터치 zoom1 = 350',snapRadiusMm(200)===350);
    STATE.zoom=0.2;
    assert('snapRadiusMm 터치 zoom0.2 상한 1500',snapRadiusMm(200)===1500);
    STATE.zoom=1;STATE.touch={lastType:'mouse'};
    // 축분리 스냅: A(0..4000) 고정, B(5000..8000 @ y 120) 를 왼쪽으로 드래그 → x는 A 오른변(4000)에 flush, y는 A 윗변(0)에 정렬
    const A={id:'tA',polygon:[{x:0,y:0},{x:4000,y:0},{x:4000,y:3000},{x:0,y:3000}]};
    const B={id:'tB',polygon:[{x:5000,y:120},{x:8000,y:120},{x:8000,y:2000},{x:5000,y:2000}]};
    STATE.spaces=[A,B];
    const st={kind:'space',id:'tB',startMm:{x:0,y:0},baseObj:JSON.parse(JSON.stringify(B))};
    applyDragMove(st,-850,0); // 5000-850=4150 → 4000 과 150mm 차 (반경 200 안) → flush
    assert('드래그 스냅: 변-변 flush (x→4000)',B.polygon[0].x===4000,'x='+B.polygon[0].x);
    assert('드래그 스냅: 축분리 y 정렬 (y→0)',B.polygon[0].y===0,'y='+B.polygon[0].y);
    assert('드래그 스냅: 가이드 x·y 2개',Array.isArray(STATE.dragSnapGuides)&&STATE.dragSnapGuides.length===2);
    assert('드래그 스냅: snapLock 기록',!!(st.snapLock&&st.snapLock.x&&st.snapLock.x.target===4000));
    // 히스테리시스: 반경(200) 밖이지만 해제반경(360) 안으로 이동 → 붙은 상태 유지
    applyDragMove(st,-1290,0); // raw 3710 → 4000 과 290 차: 신규 흡착은 불가(>200)지만 잠금 유지(<360)
    assert('드래그 스냅: 히스테리시스 유지 (290mm)',B.polygon[0].x===4000,'x='+B.polygon[0].x);
    applyDragMove(st,-1400,0); // raw 3600 → 400 차: 해제
    assert('드래그 스냅: 해제반경 밖 → 떨어짐',B.polygon[0].x===3600,'x='+B.polygon[0].x);
    // Ctrl 누르면 스냅 OFF
    STATE.ctrlPressed=true;applyDragMove(st,-850,0);
    assert('드래그 스냅: Ctrl 시 OFF',B.polygon[0].x===4150&&!STATE.dragSnapGuides);
    STATE.ctrlPressed=false;
    // 복원
    STATE.spaces=sp0;STATE.touch=tch;STATE.ctrlPressed=ctrl0;STATE.snap.endpoint=snapEp;STATE.dragSnapGuides=null;
    STATE.zoom=z0;STATE.offsetX=ox;STATE.offsetY=oy;drawGrid();renderAll();
  })();
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
  // === 2026-08-19: 태블릿 터치·S펜 레이어 (js/touch.js) ===
  try{
    assert('터치: initTouch 정의',typeof initTouch==='function');
    assert('터치: STATE.touch 초기화',!!(STATE.touch&&typeof STATE.touch.enabled==='boolean'&&'gesture' in STATE.touch));
    assert('터치: cancelPointerGesture 전역 제공',typeof cancelPointerGesture==='function');
    assert('터치: 퀵바 DOM 생성 (Esc/Enter/Del/Undo/Redo/Shift/손가락/키보드)',
      !!document.getElementById('touch-quickbar')&&['tq-zoom-out','tq-zoom-in','tq-zoom-fit','tq-esc','tq-enter','tq-del','tq-undo','tq-redo','tq-shift','tq-finger','tq-kbd'].every(id=>!!document.getElementById(id)));
    assert('터치: 입력모드 배지',!!document.getElementById('input-mode-badge'));
    const cc=document.getElementById('canvas-container');
    assert('터치: 캔버스 touch-action:none',!!cc&&getComputedStyle(cc).touchAction==='none');
    // cancelPointerGesture 는 드래그/박스 상태가 없을 때 부작용 없이 호출 가능해야 함
    const zBefore=STATE.zoom,nSp=STATE.spaces.length;
    cancelPointerGesture();
    assert('터치: cancelPointerGesture 무상태 호출 안전',STATE.zoom===zBefore&&STATE.spaces.length===nSp);
    // 터치 기기에서만 Konva 히트영역 확대 패치 적용 (마우스 전용 기기는 원본 유지)
    const patched=!!(Konva.Shape.prototype.__ecoHitPatched);
    assert('터치: 히트영역 패치 = 터치기기 여부와 일치',patched===!!STATE.touch.enabled);
    // 줌 한계 단일화 (핀치·휠·버튼 공용) — 줌아웃 5% 까지
    assert('줌: clampZoom 한계 5%~800%',typeof clampZoom==='function'&&clampZoom(0.001)===ZOOM_MIN&&clampZoom(999)===ZOOM_MAX&&ZOOM_MIN<=0.05&&clampZoom(1)===1);
    (function(){const z0=STATE.zoom,ox=STATE.offsetX,oy=STATE.offsetY;
      for(let i=0;i<40;i++) zoomBy(0.5);
      assert('줌: zoomBy 연속 축소 → ZOOM_MIN 에서 멈춤',Math.abs(STATE.zoom-ZOOM_MIN)<1e-9);
      for(let i=0;i<40;i++) zoomBy(2);
      assert('줌: zoomBy 연속 확대 → ZOOM_MAX 에서 멈춤',Math.abs(STATE.zoom-ZOOM_MAX)<1e-9);
      STATE.zoom=z0;STATE.offsetX=ox;STATE.offsetY=oy;drawGrid();renderAll();})();
    // === 2026-08-19: PDF/DWG 가져오기 (js/import-cad.js) — 순수 함수 + ingest 왕복 ===
    (function(){
      assert('CAD: import-cad 로드',typeof importPDFFile==='function'&&typeof importDWGFile==='function'&&typeof cadIngestPrims==='function');
      const m=cadMulM([1,0,0,1,10,20],[0,1,-1,0,0,0]); // 이동 ∘ 회전90
      const p=cadApplyM(m,1,0);
      assert('CAD: 행렬 곱/적용 (회전90 후 이동)',Math.abs(p[0]-10)<1e-9&&Math.abs(p[1]-21)<1e-9,JSON.stringify(p));
      const bp=cadBulgePoints(0,0,2,0,1,6); // 반원
      assert('CAD: bulge=1 반원 → 중간점 (1,1) 근처 존재',bp.some(q=>Math.abs(q[0]-1)<0.05&&Math.abs(q[1]-1)<0.05)&&Math.abs(bp[bp.length-1][0]-2)<1e-6);
      const db={header:{INSUNITS:4},tables:{BLOCK_RECORD:{entries:[]}},entities:[
        {type:'LINE',layer:'T-WALL',startPoint:{x:0,y:0},endPoint:{x:3000,y:0}},
        {type:'LWPOLYLINE',layer:'T-AREA',flag:1,vertices:[{x:0,y:0},{x:3000,y:0},{x:3000,y:2000},{x:0,y:2000}]},
        {type:'TEXT',layer:'T-TXT',startPoint:{x:100,y:100},text:'테스트',textHeight:250}]};
      const prims=cadDwgDbToPrims(db,{});
      assert('CAD: DWG mm 단위·엔티티 추출',prims.unitFactor===1&&prims.segs.length===5&&prims.texts.length===1);
      const nW=STATE.walls.length,nS=STATE.spaces.length,nT=STATE.texts.length,nV=STATE.vertices.length;
      const res=cadIngestPrims(prims,{toMm:(x,y)=>[x+50000,-y+50000],scale:1,mode:'line',closedToSpace:true,layers:null,minLenMm:50,label:'TEST-CAD'});
      assert('CAD: ingest → 참조선 1 + 공간 1(4각) + 문자 1',res.walls===1&&res.spaces===1&&res.texts===1&&STATE.spaces[STATE.spaces.length-1].polygon.length===4,JSON.stringify(res));
      assert('CAD: 생성 객체 importedFrom 태그',STATE.walls[STATE.walls.length-1].importedFrom==='TEST-CAD'&&STATE.walls[STATE.walls.length-1].isLine===true);
      const removed=cadRemoveImported('TEST-CAD');
      assert('CAD: cadRemoveImported 로 원복',removed===3&&STATE.walls.length===nW&&STATE.spaces.length===nS&&STATE.texts.length===nT);
      STATE.vertices=STATE.vertices.slice(0,nV);
      renderAll();
    })();
    if(patched){
      const ln=new Konva.Line({points:[0,0,10,10],stroke:'#000',strokeWidth:1,hitStrokeWidth:10});
      assert('터치: hitStrokeWidth 10 → 17.5 (×1.75)',Math.abs(ln.hitStrokeWidth()-17.5)<0.01);
      const ln2=new Konva.Line({points:[0,0,10,10],stroke:'#000',strokeWidth:1});
      assert('터치: 가는 선 auto → 최소 10px',ln2.hitStrokeWidth()===10);
      ln.destroy();ln2.destroy();
    }
  }catch(e){assert('터치: 예외 없음',false,e.message);}
  // === 2026-08-19: 태블릿 통합 컨텍스트 메뉴 (우클릭 기능 대응) ===
  try{
    assert('터치메뉴: showTouchCtxMenu 정의',typeof showTouchCtxMenu==='function'&&typeof hideTouchCtxMenu==='function');
    assert('터치메뉴: 퀵바 ☰ 버튼',!!document.getElementById('tq-menu'));
    // 선택 없음 → 캔버스 메뉴 (전체보기/격자/직교/실행취소)
    const _selK=STATE.selectedKind,_selI=STATE.selectedId,_box=STATE.boxSelection.slice();
    STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];
    let m=showTouchCtxMenu(200,200,null);
    const ops=()=>Array.from(document.querySelectorAll('#touch-ctx-menu .tcm-btn')).map(b=>b.dataset.op);
    assert('터치메뉴: 빈 캔버스 — 전체보기·격자·직교·실행취소',['fit','grid','ortho','undo','redo'].every(o=>ops().includes(o)));
    hideTouchCtxMenu();
    assert('터치메뉴: 닫기',!document.getElementById('touch-ctx-menu'));
    // 공간 1개 선택 → 마감재·잠금·회전·복제·삭제 (Ctrl+우클릭 없이 마감재 도달)
    const _sp={id:'tcm_test_sp',name:'T',type:'room',vertexIds:[],locked:false};
    if(STATE.spaces.length>0){
      const sp=STATE.spaces[0];
      STATE.selectedKind='space';STATE.selectedId=sp.id;STATE.boxSelection=[];
      showTouchCtxMenu(200,200,null);
      assert('터치메뉴: 공간 1개 — 마감재·잠금·회전·복제·삭제',['finish','lock','rotate','dup','del'].every(o=>ops().includes(o)));
      hideTouchCtxMenu();
    }else{
      assert('터치메뉴: 공간 1개 케이스 (공간 없음 → 스킵)',true);
    }
    // 공간 2개 박스 선택 → Boolean
    if(STATE.spaces.length>=2){
      STATE.boxSelection=[{kind:'space',id:STATE.spaces[0].id},{kind:'space',id:STATE.spaces[1].id}];
      STATE.selectedKind='space';STATE.selectedId=STATE.spaces[0].id;
      showTouchCtxMenu(200,200,null);
      assert('터치메뉴: 공간 2개 — 병합·빼기·교집합',['merge','sub-ab','sub-ba','intersect'].every(o=>ops().includes(o)));
      hideTouchCtxMenu();
    }else{
      assert('터치메뉴: 공간 2개 Boolean 케이스 (공간 부족 → 스킵)',true);
    }
    STATE.selectedKind=_selK;STATE.selectedId=_selI;STATE.boxSelection=_box;
  }catch(e){hideTouchCtxMenu();assert('터치메뉴: 예외 없음',false,e.message);}
  // === 2026-08-19: 옵션 필드·Backspace 태블릿 대응 ===
  try{
    assert('옵션: _numField 빈 값 → null',_numField({target:{value:''}},10)===null);
    assert('옵션: _numField "abc" → null',_numField({target:{value:'abc'}},10)===null);
    assert('옵션: _numField 최소 미만 → null',_numField({target:{value:'5'}},10)===null);
    assert('옵션: _numField "1200" → 1200',_numField({target:{value:' 1200 '}},10)===1200);
    // Backspace: 태블릿(터치 기기)에서는 선택 객체를 지우지 않는다
    if(STATE.spaces.length>0){
      const n0=STATE.spaces.length;
      STATE.boxSelection=[];STATE.selectedKind='space';STATE.selectedId=STATE.spaces[0].id;
      const prevEnabled=STATE.touch.enabled;STATE.touch.enabled=true;
      document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true}));
      STATE.touch.enabled=prevEnabled;
      assert('옵션: 터치 기기 Backspace → 객체 삭제 안 함',STATE.spaces.length===n0);
      assert('옵션: 터치 기기 Backspace → 명령창 포커스',document.activeElement&&document.activeElement.id==='cmd-input');
      document.getElementById('cmd-input').blur();
      // 명령 입력 단계(cmdMode)에서도 Backspace 는 삭제 아님 (데스크톱 포함)
      STATE.cmdMode='rect-w';
      document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Backspace',bubbles:true,cancelable:true}));
      STATE.cmdMode=null;document.getElementById('cmd-input').blur();
      assert('옵션: cmdMode 중 Backspace → 객체 삭제 안 함',STATE.spaces.length===n0);
      deselect();
    }else{assert('옵션: Backspace 케이스 (공간 없음 → 스킵)',true);}
    // refreshUI 포커스 보존: 패널 필드에 포커스가 있으면 한 틱 미뤄 다시 그리고 포커스 복원
    const ph=document.getElementById('project-name');
    if(ph){
      ph.focus();
      const beforeEl=document.getElementById('project-name');
      refreshUI(); // 미뤄짐 — 동기 실행 안 됨
      assert('옵션: 패널 포커스 중 refreshUI 는 지연',document.activeElement===beforeEl);
      ph.blur();
    }
  }catch(e){assert('옵션: 예외 없음',false,e.message);}
  // === 2026-08-19: 반응형 레이아웃(서랍 모드) ===
  try{
    assert('레이아웃: initLayout/STATE.layout',typeof initLayout==='function'&&!!STATE.layout&&['auto','focus','split'].includes(STATE.layout.mode));
    assert('레이아웃: 명령바 서랍 버튼·배지·백드롭 DOM',!!document.getElementById('drawer-btn-left')&&!!document.getElementById('drawer-btn-right')&&!!document.getElementById('drawer-backdrop')&&!!document.getElementById('drawer-badge-right'));
    assert('레이아웃: 상단 ◧ 레이아웃 버튼',!!document.getElementById('btn-layout'));
    const m0=STATE.layout.mode;
    setLayoutMode('focus');
    assert('레이아웃: focus → body.layout-drawer',document.body.classList.contains('layout-drawer')&&STATE.layout.drawer===true);
    const caW=document.querySelector('.canvas-area').getBoundingClientRect().width;
    assert('레이아웃: 서랍 모드 캔버스 폭 ≥ 창 폭 - 40',caW>=window.innerWidth-40,'canvas '+caW+' / win '+window.innerWidth);
    const prEl=document.querySelector('.panel-right');
    prEl.style.transition='none'; // 테스트: 전환 애니메이션 없이 즉시 위치 확인
    toggleDrawer('right',true);
    assert('레이아웃: 속성 서랍 열림',document.body.classList.contains('drawer-right-open')&&STATE.layout.rightOpen);
    void prEl.offsetWidth;
    const pr=prEl.getBoundingClientRect();
    prEl.style.transition='';
    assert('레이아웃: 열린 서랍이 화면 안에 있음',pr.right<=window.innerWidth+1&&pr.left>=0,'left='+pr.left+' right='+pr.right);
    toggleDrawer('right',false);
    assert('레이아웃: 속성 서랍 닫힘',!document.body.classList.contains('drawer-right-open'));
    setLayoutMode('split');
    assert('레이아웃: split → 서랍 해제',!document.body.classList.contains('layout-drawer'));
    setLayoutMode(m0);
  }catch(e){assert('레이아웃: 예외 없음',false,e.message);}
  // === 2026-08-22: 태블릿 오동작 9건 배치 (대표 지시) ===
  try{
    // [3·6] 클로저 함수 전역 노출
    assert('배치9: 잠금·불린·복제·탭선택 전역 노출',
      ['applyLockToSelection','lockAllObjects','subtractSelectedSpaces','intersectSelectedSpaces','findObjById','altCopyObj','_nudgeSelected','showSelectionCtxMenu'].every(k=>typeof window[k]==='function'));
    // [3] 잠금 플래그 설정/해제
    if(STATE.spaces.length>0){
      const sp=STATE.spaces[0];
      const k0=STATE.selectedKind,i0=STATE.selectedId,b0=STATE.boxSelection.slice();
      STATE.selectedKind='space';STATE.selectedId=sp.id;STATE.boxSelection=[];
      window.applyLockToSelection(true);
      assert('배치9: 잠금 locked=true',sp.locked===true);
      window.applyLockToSelection(false);
      assert('배치9: 잠금 해제',sp.locked===false);
      STATE.selectedKind=k0;STATE.selectedId=i0;STATE.boxSelection=b0;
    }else assert('배치9: 잠금 케이스 (공간 없음 스킵)',true);
    // [4] 서버 도면 meta 누락 → 현재 스펙 유지
    const pn0=STATE.projectName,ch0=STATE.ceilingHeight,gs0=STATE.gridSize;
    const KEYS=['vertices','spaces','walls','openings','furniture','fixtures','lights','electric','texts','measures','circles','arcs','hvac','leaders','xlines','curves','pillars'];
    const snap={};KEYS.forEach(k=>snap[k]=STATE[k]);
    applyCloudDoc({schema:'ECOREAN.FloorPlan.v5.9',meta:{}});
    assert('배치9: 서버 로드 meta 빈값 → 프로젝트명·천장고·격자 유지',STATE.projectName===pn0&&STATE.ceilingHeight===ch0&&STATE.gridSize===gs0);
    KEYS.forEach(k=>STATE[k]=snap[k]);
    renderAll();refreshUI();
    // [1] 도움말 — alert 대신 모달, 열고 닫기
    assert('배치9: 텍스트 모달 함수',typeof _showTextModal==='function'&&typeof hideTextModal==='function');
    showCmdHelp();
    const tm=document.getElementById('text-modal-overlay');
    assert('배치9: ? 도움말 모달 표시',!!tm&&tm.style.display==='flex');
    hideTextModal();
    assert('배치9: ? 도움말 모달 닫힘',tm.style.display==='none');
    document.getElementById('btn-help').click();
    assert('배치9: 단축키 모달 열림',document.getElementById('canvas-help').classList.contains('visible'));
    document.getElementById('shortcut-close').click();
    assert('배치9: 단축키 모달 ✕ 닫힘',!document.getElementById('canvas-help').classList.contains('visible'));
    // [2] 옵셋 프리필 함수
    assert('배치9: 옵셋 프리필 함수',typeof _prefillCmdInput==='function');
    // [10] 공간 패널 벽자재 일괄 셀렉트 존재 (공간 선택 시)
    if(STATE.spaces.length>0){
      const k0=STATE.selectedKind,i0=STATE.selectedId;
      STATE.selectedKind='space';STATE.selectedId=STATE.spaces[0].id;refreshDetail();
      assert('배치9: 공간 패널 벽자재 일괄 셀렉트',!!document.getElementById('d-wallall'));
      STATE.selectedKind=k0;STATE.selectedId=i0;refreshDetail();
    }else assert('배치9: 벽자재 일괄 케이스 (공간 없음 스킵)',true);
  }catch(e){if(typeof hideTextModal==='function')hideTextModal();assert('배치9: 예외 없음',false,e.message);}
  // === 2026-08-23: 배치9 보강 (재검토) ===
  try{
    // [1] EULA — 시작 시 항상 표시 + storage 예외에도 동의 즉시 닫힘 + 푸터 재열람 후에도 동의 동작
    let _origSet=Storage.prototype.setItem;
    const em=document.getElementById('eula-modal');
    _showEulaIfNeeded();
    assert('보강: EULA 시작 시 항상 표시',em&&em.style.display==='flex');
    Storage.prototype.setItem=function(){throw new Error('storage blocked');};
    document.getElementById('eula-accept').click();
    Storage.prototype.setItem=_origSet;
    assert('보강: 동의 시 storage 예외에도 즉시 닫힘',em.style.display==='none');
    assert('보강: cookie 동의 이력 기록',document.cookie.indexOf('eco_eula=1')>=0);
    // 푸터 "All Rights Reserved" 재열람 → 동의로 닫힘 (이전: 무반응 버그)
    document.getElementById('copyright-link').click();
    assert('보강: 푸터 링크로 약관 재표시',em.style.display==='flex');
    // _eulaBind 중복제거(350ms)를 지나도록 대기 후 동의
    const _tw=performance.now();while(performance.now()-_tw<380){}
    document.getElementById('eula-accept').click();
    assert('보강: 재열람 후 동의 → 닫힘',em.style.display==='none');
    // [2] 옵셋 — 도구 선택 즉시 거리 입력 모드
    const _t0=STATE.selectedTool;
    setTool('select');setTool('offset');
    assert('보강: 옵셋 선택 즉시 offset-d',STATE.cmdMode==='offset-d');
    document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    setTool(_t0||'select');
    // [9] 공유 vertex 분리 헬퍼 전역
    assert('보강: _detachSharedSpaceVerts 전역',typeof window._detachSharedSpaceVerts==='function');
  }catch(e){
    try{Storage.prototype.setItem=Storage.prototype.setItem;}catch(_){ }
    assert('보강: 예외 없음',false,e.message);
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
