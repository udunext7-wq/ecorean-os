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
    const sc0=STATE.scale; STATE.scale=80; // 2026-08-24: 본 블록 수치는 scale=80 기준 검증 (기본 축척은 1/100=37.8)
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
    STATE.scale=sc0;
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
  // === 2026-08-24: 잠금(lock) 강화 회귀 테스트 — 잠긴 객체는 버텍스 신설·이동·삭제 절대 불가 (대표 지시) ===
  try{
    const OFF=700000; // 기존 도형과 겹치지 않는 원격 좌표
    const _bak={vertices:STATE.vertices.slice(),walls:STATE.walls.slice(),spaces:STATE.spaces.slice(),
      selectedKind:STATE.selectedKind,selectedId:STATE.selectedId,boxSelection:STATE.boxSelection.slice()};
    // [L1] moveVertex — 잠긴 벽의 버텍스는 이동 불가
    const lv1=ensureVertex(OFF,OFF),lv2=ensureVertex(OFF+2000,OFF);
    const lw=makeWallVEF(lv1.id,lv2.id,{});lw.locked=true;STATE.walls.push(lw);
    moveVertex(lv1.id,OFF+500,OFF+500);
    assert('잠금: moveVertex 차단',lv1.x===OFF&&lv1.y===OFF,'이동됨: '+lv1.x+','+lv1.y);
    // [L2] moveVertex — 해제 시 정상 이동
    lw.locked=false;
    moveVertex(lv1.id,OFF+500,OFF+500);
    assert('잠금: 해제 후 moveVertex 정상',lv1.x===OFF+500&&lv1.y===OFF+500);
    moveVertex(lv1.id,OFF,OFF);lw.locked=true;
    // [L3] ensureVertex — 잠긴 객체의 버텍스는 재사용(용접) 안 함
    const nv=ensureVertex(OFF+10,OFF+10,60);
    assert('잠금: ensureVertex 재사용 금지',nv.id!==lv1.id,'잠긴 버텍스 재사용됨');
    // [L4] splitWallsAtIntersections — 잠긴 벽은 분할·버텍스 신설 안 됨
    const xv1=ensureVertex(OFF+1000,OFF-1000),xv2=ensureVertex(OFF+1000,OFF+1000);
    const xw=makeWallVEF(xv1.id,xv2.id,{});STATE.walls.push(xw); // 잠긴 벽 lw 를 가로지르는 새 벽
    const wallCntBefore=STATE.walls.length;
    splitWallsAtIntersections();
    const lwStill=STATE.walls.find(w=>w.id===lw.id);
    assert('잠금: 교차 분할 금지 (벽 유지)',!!lwStill&&STATE.walls.length===wallCntBefore,
      '벽 수 '+wallCntBefore+'→'+STATE.walls.length);
    assert('잠금: 교차 분할 금지 (끝점 유지)',!!lwStill&&lwStill.v1Id===lv1.id&&lwStill.v2Id===lv2.id);
    // [L5] deleteSelected — 잠긴 벽 삭제 불가
    STATE.boxSelection=[];STATE.selectedKind='wall';STATE.selectedId=lw.id;
    deleteSelected();
    assert('잠금: deleteSelected 차단',STATE.walls.some(w=>w.id===lw.id),'잠긴 벽이 삭제됨');
    // [L6] deleteBoxSelection — 잠긴 벽 삭제 불가
    STATE.selectedKind=null;STATE.selectedId=null;
    STATE.boxSelection=[{kind:'wall',id:lw.id}];
    deleteBoxSelection();
    assert('잠금: deleteBoxSelection 차단',STATE.walls.some(w=>w.id===lw.id),'잠긴 벽이 삭제됨');
    // [L7] addLine — 잠긴 공간은 분할되지 않는다 (참조선만 추가)
    const sq=[{x:OFF+10000,y:OFF},{x:OFF+13000,y:OFF},{x:OFF+13000,y:OFF+3000},{x:OFF+10000,y:OFF+3000}];
    const svIds=sq.map(pt=>ensureVertex(pt.x,pt.y).id);
    const lsp=makeSpaceVEF(svIds,{name:'잠금테스트',type:'ROOM',typeIndex:99,layerName:'A-AREA-ROOM-99'});
    lsp.locked=true;STATE.spaces.push(lsp);
    const spCntBefore=STATE.spaces.length;
    addLine(OFF+11500,OFF-500,OFF+11500,OFF+3500); // 공간을 세로로 가로지르는 선
    assert('잠금: addLine 공간 분할 금지',STATE.spaces.length===spCntBefore&&STATE.spaces.some(x=>x.id===lsp.id),
      '공간 수 '+spCntBefore+'→'+STATE.spaces.length);
    // [L8] rotateSpaceByAngle — 잠긴 공간 회전 불가
    const v0x=getVertex(svIds[0]).x,v0y=getVertex(svIds[0]).y;
    rotateSpaceByAngle(lsp.id,45);
    assert('잠금: rotateSpaceByAngle 차단',getVertex(svIds[0]).x===v0x&&getVertex(svIds[0]).y===v0y);
    // [L9] 복제 — 사본은 잠금 해제로 생성 + 이동 가능, 원본 불변 (2026-08-24 대표 지시)
    STATE.boxSelection=[];STATE.selectedKind='wall';STATE.selectedId=lw.id;
    duplicateSelected();
    const dup=STATE.walls[STATE.walls.length-1];
    assert('잠금: 복제 사본 잠금 해제',dup&&dup.id!==lw.id&&!dup.locked);
    moveVertex(dup.v1Id,OFF+50000,OFF+50000);
    assert('잠금: 복제 사본 이동 가능',getVertex(dup.v1Id).x===OFF+50000);
    assert('잠금: 복제 후 원본 불변',getVertex(lw.v1Id).x===OFF&&getVertex(lw.v1Id).y===OFF);
    // [L10] Alt+드래그 복사 — 사본 잠금 해제 (잠긴 사본이 원본 위에 고정되던 버그)
    const altc=altCopyObj('wall',lw);
    assert('잠금: Alt복사 사본 잠금 해제',altc&&!altc.locked);
    moveVertex(altc.v1Id,OFF+60000,OFF+60000);
    assert('잠금: Alt복사 사본 이동 가능',getVertex(altc.v1Id).x===OFF+60000);
    // [L11] 미러 — 사본 잠금 해제 + 원본 불변 (handleMirrorClick 실제 흐름)
    STATE.boxSelection=[];STATE.selectedKind='wall';STATE.selectedId=lw.id;
    mirrorState={phase:'pickLine2',p1:{x:OFF+1000,y:OFF-1000}};
    const mirrorCntBefore=STATE.walls.length;
    const px={x:STATE.offsetX+mmToPx(OFF+1000),y:STATE.offsetY+mmToPx(OFF+1000)};
    handleMirrorClick(px);
    const mc=STATE.walls[STATE.walls.length-1];
    assert('잠금: 미러 사본 생성',STATE.walls.length===mirrorCntBefore+1);
    assert('잠금: 미러 사본 잠금 해제',mc&&mc.id!==lw.id&&!mc.locked);
    assert('잠금: 미러 후 원본 불변',getVertex(lw.v1Id).x===OFF&&lw.v1Id===lv1.id);
    // 복원
    STATE.vertices=_bak.vertices;STATE.walls=_bak.walls;STATE.spaces=_bak.spaces;
    STATE.selectedKind=_bak.selectedKind;STATE.selectedId=_bak.selectedId;STATE.boxSelection=_bak.boxSelection;
    renderAll();
  }catch(e){
    assert('잠금: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-24: 도어 도식·계단 파라메트릭 회귀 테스트 (대표 지시) ===
  try{
    const OFF2=900000;
    const _bakO={openings:STATE.openings.slice(),furniture:STATE.furniture.slice()};
    const findG=(grp,id)=>{let f=null;grp.getChildren().forEach(c=>{if(c.id&&c.id()===id)f=c;});return f;};
    const cntCls=(g,cls)=>g?g.getChildren(n=>n.getClassName()===cls).length:0;
    // [D1] 여닫이(swing): 90° 호(Arc) 존재
    const dsw={id:makeId('o'),type:'DOOR',subType:'swing',x:OFF2,y:OFF2,width_mm:900,height_mm:2100,depth_mm:200,angle:0,spaceId:null};
    // [D2] 슬라이딩: Arc 없음 + 패널(Rect) 2짝 이상
    const dsl={id:makeId('o'),type:'DOOR',subType:'sliding',x:OFF2+5000,y:OFF2,width_mm:1500,height_mm:2100,depth_mm:200,angle:0,spaceId:null};
    // [D3] 포켓: Arc 없음 + 점선 수납부
    const dpk={id:makeId('o'),type:'DOOR',subType:'pocket',x:OFF2+10000,y:OFF2,width_mm:900,height_mm:2100,depth_mm:200,angle:0,spaceId:null};
    // [D4] 3연동(folding): 패널 3짝
    const dfd={id:makeId('o'),type:'DOOR',subType:'folding',x:OFF2+15000,y:OFF2,width_mm:2400,height_mm:2100,depth_mm:200,angle:0,spaceId:null};
    STATE.openings.push(dsw,dsl,dpk,dfd);
    renderOpenings();
    const gsw=findG(groups.openings,dsw.id),gsl=findG(groups.openings,dsl.id);
    const gpk=findG(groups.openings,dpk.id),gfd=findG(groups.openings,dfd.id);
    assert('도어: 여닫이 호(Arc) 표기',cntCls(gsw,'Arc')===1);
    assert('도어: 슬라이딩 호 없음',cntCls(gsl,'Arc')===0);
    assert('도어: 슬라이딩 패널 2짝+',cntCls(gsl,'Rect')>=3,'Rect '+cntCls(gsl,'Rect'));
    assert('도어: 포켓 호 없음',cntCls(gpk,'Arc')===0);
    assert('도어: 포켓 수납부+패널',cntCls(gpk,'Rect')>=4,'Rect '+cntCls(gpk,'Rect'));
    // 2026-08-26: 포켓 치수 정합 — 전체 W 중 실선 패널 = W/2(도어 돌출), 점선(벽 속 문틀) 2개
    (function(){
      const wPx=mmToPx(dpk.width_mm);
      let dashN=0, solidPanelOK=false;
      gpk.getChildren(n=>n.getClassName()==='Rect').forEach(r=>{
        if(r.dash()&&r.dash().length&&r.stroke()!=='#E2725B') dashN++; // 미부착 경고 rect 제외
        else if(Math.abs(r.width()-wPx/2*0.97)<1.5&&r.height()<wPx*0.2) solidPanelOK=true;
      });
      assert('도어: 포켓 점선(문틀 구간) 2개',dashN===2,'dash '+dashN);
      assert('도어: 포켓 도어 돌출 = 전체 절반',solidPanelOK);
    })();
    assert('도어: 3연동 패널 3짝+',cntCls(gfd,'Rect')>=4,'Rect '+cntCls(gfd,'Rect'));
    // [S9] 2026-08-24: 계단실 공간 연동 — 공간 크기 자동 맞춤 (대표 지시)
    const mkSq=(x,y,w,h)=>polygonToVertexIds([{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]);
    const spI=makeSpaceVEF(mkSq(OFF2+50000,OFF2,1200,4200),{name:'계단실I',type:'STAIRS',typeIndex:97,layerName:'A-AREA-STR-97'});
    STATE.spaces.push(spI);
    const infoI=spaceStairInfo(spI);
    assert('계단실: 직선 자동 단수 15',infoI&&infoI.type==='I'&&infoI.N===15,infoI&&infoI.N);
    const shpI=buildSpaceStairShape(spI);
    const trI=shpI.filter(c=>c.type==='line'&&c.y1===c.y2&&Math.abs((c.x2-c.x1)-1200)<1).length;
    assert('계단실: 직선 디딤판 14',trI===14,'treads '+trI);
    // [S10] U턴 — 옵션 변경 반영
    spI.stair={type:'U',stepCount:20,splitCount:10};
    const infoU=spaceStairInfo(spI);
    assert('계단실: U턴 전환',infoU.type==='U'&&infoU.N===20&&infoU.N1===10,JSON.stringify([infoU.type,infoU.N,infoU.N1]));
    // [S11] 회전 90° — 디딤판이 세로로
    spI.stair={rot:90};
    const shpR=buildSpaceStairShape(spI);
    const infoR=spaceStairInfo(spI);
    // 회전 90°: 진행축이 X(1200)로, 디딤판은 Y축 4200mm 전체 폭으로 매핑
    const trR=shpR.filter(c=>c.type==='line'&&c.x1===c.x2&&Math.abs(Math.abs(c.y2-c.y1)-4200)<1).length;
    assert('계단실: 회전 90° 디딤판 세로',infoR.N>=2&&trR===infoR.N-1,'treads '+trR+'/'+infoR.N);
    // [S12] renderSpaces 오버레이 생성
    spI.stair={};
    renderSpaces();
    let hasOverlay=false;
    groups.spaces.getChildren().forEach(c=>{if(c.name&&c.name()==='space-stairs')hasOverlay=true;});
    assert('계단실: renderSpaces 계단 오버레이',hasOverlay);
    // [S13] ㄱ자 — 참·플라이트 배분
    spI.stair={type:'L'};
    const infoL=spaceStairInfo(spI); // bbox 1200×4200 → W=min/2=600, LA=3600, LB=600
    assert('계단실: ㄱ자 자동 폭',infoL.type==='L'&&infoL.W===600&&infoL.LA===3600&&infoL.LB===600,JSON.stringify([infoL.W,infoL.LA,infoL.LB]));
    STATE.spaces=STATE.spaces.filter(x=>x.id!==spI.id);
    STATE.walls=STATE.walls.filter(w=>w.spaceId!==spI.id);
    // 복원
    STATE.openings=_bakO.openings;STATE.furniture=_bakO.furniture;
    renderAll();
  }catch(e){
    assert('도어·계단: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-24: 트렌드 라이브러리 추가 (가구 13·조명 6) ===
  (function(){
    const newFurn=['island','sofa_modular','sofa_curved','lounge_chair','side_table','console','home_bar','massage_chair','styler','desk_motion','beanbag','cat_tower','system_hanger'];
    const newLight=['line_t5','magnet_track','cove','spot_cyl','table_lamp','pendant_cluster'];
    const okF=newFurn.every(k=>FURNITURE_LIB[k]&&Array.isArray(FURNITURE_LIB[k].shape)&&FURNITURE_LIB[k].shape.length>=3&&FURNITURE_LIB[k].w>0);
    const okL=newLight.every(k=>LIGHT_LIB[k]&&Array.isArray(LIGHT_LIB[k].shape)&&LIGHT_LIB[k].shape.length>=3&&LIGHT_LIB[k].size>0);
    assert('트렌드: 가구 13종 등록+도형',okF,newFurn.filter(k=>!FURNITURE_LIB[k]).join(','));
    assert('트렌드: 조명 6종 등록+도형',okL,newLight.filter(k=>!LIGHT_LIB[k]).join(','));
    // 도형 명령 유효성 (drawShape가 아는 타입만 사용)
    const okTypes=new Set(['rect','circle','line','arc','text']);
    const bad=[];
    newFurn.forEach(k=>FURNITURE_LIB[k].shape.forEach(c=>{if(!okTypes.has(c.type))bad.push(k+':'+c.type);}));
    newLight.forEach(k=>LIGHT_LIB[k].shape.forEach(c=>{if(!okTypes.has(c.type))bad.push(k+':'+c.type);}));
    assert('트렌드: 도형 타입 유효',bad.length===0,bad.join(','));
  })();
  // === 2026-08-24 v6.0 업그레이드 회귀 (자동치수·정렬·배분·자동배치·자동저장·표제란·팔레트·LOD) ===
  try{
    const OFF3=1100000;
    const _bak3={spaces:STATE.spaces.slice(),walls:STATE.walls.slice(),measures:STATE.measures.slice(),
      furniture:STATE.furniture.slice(),fixtures:STATE.fixtures.slice(),lights:STATE.lights.slice(),
      boxSelection:STATE.boxSelection.slice(),selectedKind:STATE.selectedKind,selectedId:STATE.selectedId,zoom:STATE.zoom};
    // [V1] 전체 자동 치수 — 사각 공간 1개 → 4변 치수, 재실행 → 제거
    const sq3=polygonToVertexIds([{x:OFF3,y:OFF3},{x:OFF3+3000,y:OFF3},{x:OFF3+3000,y:OFF3+3000},{x:OFF3,y:OFF3+3000}]);
    const spV=makeSpaceVEF(sq3,{name:'V6검증',type:'ROOM',typeIndex:96,layerName:'A-AREA-ROOM-96'});
    STATE.spaces.push(spV);
    const mBefore=STATE.measures.length;
    dimAllSpaces();
    const autoN=STATE.measures.filter(m=>m._auto).length;
    assert('v6: 전체 자동 치수 4변',autoN===4&&STATE.measures.length===mBefore+4,'auto '+autoN);
    dimAllSpaces();
    assert('v6: 자동 치수 토글 제거',STATE.measures.filter(m=>m._auto).length===0);
    // [V2] 정렬 — side_table 2개 top 정렬
    const st1={id:makeId('f'),type:'side_table',x:OFF3+10000,y:OFF3,angle:0};
    const st2={id:makeId('f'),type:'side_table',x:OFF3+12000,y:OFF3+800,angle:0};
    STATE.furniture.push(st1,st2);
    STATE.selectedKind=null;STATE.selectedId=null;
    STATE.boxSelection=[{kind:'furniture',id:st1.id},{kind:'furniture',id:st2.id}];
    alignSelection('top');
    assert('v6: 정렬(top) y 일치',st1.y===st2.y,st1.y+'/'+st2.y);
    // [V3] 균등 배분 — 3개 가로
    const st3={id:makeId('f'),type:'side_table',x:OFF3+12500,y:OFF3,angle:0};
    STATE.furniture.push(st3);
    st1.x=OFF3+10000;st2.x=OFF3+10400;st3.x=OFF3+14000;
    STATE.boxSelection=[{kind:'furniture',id:st1.id},{kind:'furniture',id:st2.id},{kind:'furniture',id:st3.id}];
    distributeSelection('h');
    const gap1=st2.x-st1.x,gap2=st3.x-st2.x;
    assert('v6: 균등 배분 간격 동일',Math.abs(gap1-gap2)<=2,gap1+'/'+gap2);
    // [V4] AI 자동 배치 — ROOM 4000×4000
    const sq4=polygonToVertexIds([{x:OFF3+20000,y:OFF3},{x:OFF3+24000,y:OFF3},{x:OFF3+24000,y:OFF3+4000},{x:OFF3+20000,y:OFF3+4000}]);
    const spAF=makeSpaceVEF(sq4,{name:'침실검증',type:'ROOM',typeIndex:95,layerName:'A-AREA-ROOM-95'});
    STATE.spaces.push(spAF);
    STATE.boxSelection=[];
    const fBefore=STATE.furniture.length;
    autoFurnish(spAF.id);
    const added=STATE.furniture.slice(fBefore);
    const inBox=added.every(o=>o.x>=OFF3+20000&&o.x<=OFF3+24000&&o.y>=OFF3&&o.y<=OFF3+4000);
    assert('v6: 자동 배치 침실 3개+내부',added.length===3&&inBox,'added '+added.length);
    assert('v6: 자동 배치 spaceId 연결',added.every(o=>o.spaceId===spAF.id));
    // [V5] 자동 저장
    assert('v6: 자동 저장 기록',_autosaveNow()===true&&!!localStorage.getItem('minicad.autosave'));
    const savedAS=JSON.parse(localStorage.getItem('minicad.autosave'));
    assert('v6: 자동 저장 데이터 유효',savedAS&&savedAS.data&&Array.isArray(savedAS.data.spaces)&&typeof applyLoadedData==='function');
    // [V6] 인쇄 표제란
    const tb=buildPrintTitleBlock();
    assert('v6: 표제란 구성',tb.indexOf('ECOREAN')>=0&&tb.indexOf('PROJECT')>=0&&tb.indexOf('공간 면적표')>=0&&tb.indexOf('범 례')>=0);
    // [V7] 명령 팔레트
    const pc=_paletteCommands();
    assert('v6: 팔레트 명령 30+',pc.length>=30&&pc.every(x=>x.label&&typeof x.run==='function'),'n='+pc.length);
    openCmdPalette();
    const hasPal=!!document.getElementById('cmd-palette');
    closeCmdPalette();
    assert('v6: 팔레트 열림/닫힘',hasPal&&!document.getElementById('cmd-palette'));
    // [V8] 라벨 LOD — 45% 미만 축소 시 가구 영문 라벨 생략
    STATE.zoom=0.3;
    renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture');
    let lblLow=0;
    groups.furniture.getChildren().forEach(g=>{g.getChildren(nd=>nd.getClassName()==='Text').forEach(t=>{if(/sofa|table/i.test(t.text()))lblLow++;});});
    STATE.zoom=1;
    renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture');
    let lblHi=0;
    groups.furniture.getChildren().forEach(g=>{g.getChildren(nd=>nd.getClassName()==='Text').forEach(t=>{if(/sofa|table/i.test(t.text()))lblHi++;});});
    assert('v6: 라벨 LOD (0.3 생략 / 1.0 표시)',lblLow===0&&lblHi>0,lblLow+'/'+lblHi);
    // 복원
    STATE.spaces=_bak3.spaces;STATE.walls=_bak3.walls;STATE.measures=_bak3.measures;
    STATE.furniture=_bak3.furniture;STATE.fixtures=_bak3.fixtures;STATE.lights=_bak3.lights;
    STATE.boxSelection=_bak3.boxSelection;STATE.selectedKind=_bak3.selectedKind;STATE.selectedId=_bak3.selectedId;
    STATE.zoom=_bak3.zoom;
    try{localStorage.removeItem('minicad.autosave');}catch(_){ }
    renderAll();
  }catch(e){
    assert('v6: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-24: 가구2 (픽스가구) — 견적 OS 연동 회귀 ===
  try{
    const FIX_KEYS=['base_600','base_900','base_sink_900','base_cook_600','base_drawer_600','wall_600','wall_900','corner_base_900','corner_wall_600','tall_600','fridge_cab_900','island_1500','wardrobe_fix_1200','shoe_cab_1200','tv_lowcab_2400','bath_vanity_900','laundry_cab_700'];
    // [F1] 등록 + 도형 + FURNITURE_LIB 병합 (렌더/JSON 공용)
    const okReg=FIX_KEYS.every(k=>FIXFURN_LIB[k]&&FURNITURE_LIB[k]&&Array.isArray(FIXFURN_LIB[k].shape)&&FIXFURN_LIB[k].shape.length>=2);
    assert('가구2: 17종 등록+병합',okReg&&FIX_KEYS.length===Object.keys(FIXFURN_LIB).length,
      FIX_KEYS.filter(k=>!FIXFURN_LIB[k]).join(','));
    // [F2] 견적 메타 — est.code 전원 보유 + 중복 없음 (견적 OS 소비 기준)
    const codes=FIX_KEYS.map(k=>FIXFURN_LIB[k].est&&FIXFURN_LIB[k].est.code).filter(Boolean);
    assert('가구2: est.code 전원+유일',codes.length===FIX_KEYS.length&&new Set(codes).size===codes.length);
    assert('가구2: est.cat 분류',FIX_KEYS.every(k=>['KITCHEN','BUILTIN'].includes(FIXFURN_LIB[k].est.cat)));
    // [F3] 상부장 = 점선 표기 관례
    assert('가구2: 상부장 점선 도식',FIXFURN_LIB.wall_600.shape.some(c=>c.dash)&&FIXFURN_LIB.corner_wall_600.shape.some(c=>c.dash));
    // [F4] JSON export — estModule 승계
    const _bakF=STATE.furniture.slice();
    const fx={id:makeId('f'),type:'base_sink_900',x:1200000,y:1200000,angle:0};
    STATE.furniture.push(fx);
    const jj=buildJSON();
    const je=jj.furniture.find(o=>o.id===fx.id);
    assert('가구2: JSON estModule 승계',!!je&&je.estModule&&je.estModule.code==='KB-SINK-900'&&je.nameEn==='sink base 900',je&&JSON.stringify(je.estModule));
    // [F5] 렌더 정상 (renderRect 경유)
    renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture');
    let fxG=null;groups.furniture.getChildren().forEach(c=>{if(c.id&&c.id()===fx.id)fxG=c;});
    assert('가구2: 배치 렌더 정상',!!fxG&&fxG.getChildren().length>=3);
    STATE.furniture=_bakF;
    renderAll();
  }catch(e){
    assert('가구2: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-24: 공조 확충 (에어컨 계열 7 + ERV + 보일러) ===
  (function(){
    const HK=['ac_4way','ac_2way','ac_1way','ac_wall','ac_stand','ac_duct','ac_outdoor','erv','boiler_unit'];
    assert('공조: 9종 등록+도형',HK.every(k=>HVAC_FIRE_LIB[k]&&Array.isArray(HVAC_FIRE_LIB[k].shape)&&HVAC_FIRE_LIB[k].shape.length>=3&&HVAC_FIRE_LIB[k].size>0),
      HK.filter(k=>!HVAC_FIRE_LIB[k]).join(','));
    assert('공조: 매립형(덕트·ERV) 점선 표기',HVAC_FIRE_LIB.ac_duct.shape.some(c=>c.dash)&&HVAC_FIRE_LIB.erv.shape.some(c=>c.dash));
    assert('공조: semanticOf ac_4way',semanticOf('ac_4way').tag==='system_ac');
  })();
  // === 2026-08-24: 전기 확충 (스위치 4~6구·3로·디머·분전반·특수 콘센트·월패드·초인종) ===
  (function(){
    const EK=['switch_4','switch_5','switch_6','switch_3way','dimmer','dist_panel','outlet_220','outlet_wp','outlet_usb','wallpad','doorbell'];
    assert('전기: 11종 등록+도형',EK.every(k=>ELECTRIC_LIB[k]&&Array.isArray(ELECTRIC_LIB[k].shape)&&ELECTRIC_LIB[k].shape.length>=2&&ELECTRIC_LIB[k].size>0),
      EK.filter(k=>!ELECTRIC_LIB[k]).join(','));
    // 스위치 구 수 = 버튼 rect 수 (외곽 1 제외)
    const btnCnt=k=>ELECTRIC_LIB[k].shape.filter(c=>c.type==='rect').length-1;
    assert('전기: 스위치 4/5/6구 버튼 수',btnCnt('switch_4')===4&&btnCnt('switch_5')===5&&btnCnt('switch_6')===6,
      btnCnt('switch_4')+'/'+btnCnt('switch_5')+'/'+btnCnt('switch_6'));
    assert('전기: semanticOf dist_panel',semanticOf('dist_panel').tag==='panelboard');
  })();
  // === 2026-08-24 v6.1: 점형 기호 비축척 보정 회귀 ===
  (function(){
    const _z=STATE.zoom,_sb=STATE.symbolBoost;
    STATE.zoom=1;STATE.symbolBoost=true;
    // 스위치(220mm)는 확대, 2way AC(1200mm)는 확대 안 함, 가구는 대상 아님
    const fSw=symbolBoostFactor('electric',ELECTRIC_LIB.switch_1);
    const fAc=symbolBoostFactor('hvac',HVAC_FIRE_LIB.ac_2way);
    const fFn=symbolBoostFactor('furniture',FURNITURE_LIB.sofa3);
    assert('기호확대: 스위치 확대(>1)·상한 5',fSw>1&&fSw<=5,'f='+fSw.toFixed(2));
    assert('기호확대: 대형(2way)·가구 미적용',fAc===1&&fFn===1,fAc+'/'+fFn);
    STATE.symbolBoost=false;
    assert('기호확대: OFF 시 실척',symbolBoostFactor('electric',ELECTRIC_LIB.switch_1)===1);
    // 렌더 그룹 스케일 반영
    STATE.symbolBoost=true;
    const _bakE=STATE.electric.slice();
    const sw={id:makeId('e'),type:'switch_6',x:1300000,y:1300000,angle:0};
    STATE.electric.push(sw);
    renderRect(STATE.electric,groups.electric,ELECTRIC_LIB,'electric');
    let swG=null;groups.electric.getChildren().forEach(c=>{if(c.id&&c.id()===sw.id)swG=c;});
    assert('기호확대: 렌더 그룹 스케일 적용',!!swG&&swG.scaleY()>1,swG&&swG.scaleY().toFixed(2));
    STATE.electric=_bakE;STATE.zoom=_z;STATE.symbolBoost=_sb;
    renderAll();
  })();
  // === 2026-08-24: 축척 1/100 + 기호 실척 유지 + 글씨 라벨 (대표 지시 정정) ===
  (function(){
    assert('축척: 기준 1/100 (37.8px/m)',Math.abs(STATE.scale-37.8)<0.001,'scale='+STATE.scale);
    // 기호 확대 기본 OFF (실척)
    const _sb2=STATE.symbolBoost;STATE.symbolBoost=false;
    assert('기호: 기본 실척 (확대 OFF)',symbolBoostFactor('electric',ELECTRIC_LIB.switch_1)===1);
    STATE.symbolBoost=_sb2;
    // 전기 기호 라벨 — 고정 px 글씨
    const _bakE2=STATE.electric.slice(),_z2=STATE.zoom;STATE.zoom=1;
    const sw2={id:makeId('e'),type:'switch_6',x:1400000,y:1400000,angle:0};
    STATE.electric.push(sw2);
    renderElectric();
    let lblFound=false;
    groups.electric.getChildren().forEach(n=>{
      if(n.getClassName&&n.getClassName()==='Text'&&n.text&&n.text().indexOf('스위치(6구)')>=0) lblFound=true;
    });
    assert('기호: 이름 라벨 고정 표시',lblFound);
    // 극축소 시 라벨 생략 (겹침 방지)
    STATE.zoom=0.2;renderElectric();
    let lblLow2=0;
    groups.electric.getChildren().forEach(n=>{if(n.getClassName&&n.getClassName()==='Text')lblLow2++;});
    assert('기호: 극축소 라벨 생략',lblLow2===0,'n='+lblLow2);
    STATE.electric=_bakE2;STATE.zoom=_z2;renderAll();
  })();
  // === 2026-08-24: 위생기구 업그레이드 (신규 8종 + 기존 4종 도식 정밀화) ===
  (function(){
    const SK=['sink_counter_1200','sink_vessel','sink_double_1500','bathtub_free','shower_slide','urinal','utility_sink','floor_drain'];
    assert('위생: 8종 등록+도형',SK.every(k=>FIXTURE_LIB[k]&&Array.isArray(FIXTURE_LIB[k].shape)&&FIXTURE_LIB[k].shape.length>=3&&FIXTURE_LIB[k].w>0),
      SK.filter(k=>!FIXTURE_LIB[k]).join(','));
    // 기존 4종 정밀화 — 요소 수 증가 확인
    assert('위생: 도식 정밀화(양변기 7+·샤워 10+)',FIXTURE_LIB.toilet.shape.length>=7&&FIXTURE_LIB.shower.shape.length>=10,
      FIXTURE_LIB.toilet.shape.length+'/'+FIXTURE_LIB.shower.shape.length);
    assert('위생: semanticOf floor_drain',semanticOf('floor_drain').tag==='sanitary');
  })();
  // === 2026-08-25: 조명 업그레이드 (신규 8종 + 기존 3종 정밀화) ===
  (function(){
    const LK=['edge_flat_600','kitchen_flat','sensor_light','bath_light','pendant_linear','ceiling_fan','step_light','spot_bar_3'];
    assert('조명: 8종 등록+도형',LK.every(k=>LIGHT_LIB[k]&&Array.isArray(LIGHT_LIB[k].shape)&&LIGHT_LIB[k].shape.length>=3&&LIGHT_LIB[k].size>0),
      LK.filter(k=>!LIGHT_LIB[k]).join(','));
    assert('조명: 기존 정밀화(천장 5+·펜던트 5+)',LIGHT_LIB.ceiling.shape.length>=5&&LIGHT_LIB.pendant.shape.length>=5);
    assert('조명: semanticOf edge_flat_600',semanticOf('edge_flat_600').tag==='ceiling_light');
  })();
  // === 2026-08-26: 스위치→조명 회로 연동 (대표 지시) ===
  try{
    const _bakC={electric:STATE.electric.slice(),lights:STATE.lights.slice(),selectedKind:STATE.selectedKind,selectedId:STATE.selectedId};
    const sw3={id:makeId('e'),type:'switch_2',x:1500000,y:1500000,angle:0};
    const lt1={id:makeId('li'),type:'downlight',x:1502000,y:1500000,angle:0};
    const lt2={id:makeId('li'),type:'pendant',x:1504000,y:1500000,angle:0};
    STATE.electric.push(sw3);STATE.lights.push(lt1,lt2);
    // [C1] 연결/해제 토글
    toggleCircuitLink(sw3.id,lt1.id);toggleCircuitLink(sw3.id,lt2.id);
    assert('회로: 조명 2개 연결',Array.isArray(sw3.lightIds)&&sw3.lightIds.length===2);
    toggleCircuitLink(sw3.id,lt2.id);
    assert('회로: 재클릭 해제',sw3.lightIds.length===1&&sw3.lightIds[0]===lt1.id);
    toggleCircuitLink(sw3.id,lt2.id);
    // [C2] 점등 집합
    sw3.circuitOn=true;
    const lit=litLightIds();
    assert('회로: ON 시 점등 집합',lit.has(lt1.id)&&lit.has(lt2.id));
    sw3.circuitOn=false;
    assert('회로: OFF 시 소등',litLightIds().size===0);
    // [C3] 점등 글로우 렌더 (radial gradient circle)
    sw3.circuitOn=true;
    renderLights();
    let glowN=0;
    groups.lights.getChildren().forEach(g2=>{
      if(g2.getChildren) g2.getChildren(nn=>nn.getClassName()==='Circle').forEach(c2=>{
        var _st=c2.fillRadialGradientColorStops&&c2.fillRadialGradientColorStops();if(_st&&_st.length) glowN++;
      });
    });
    assert('회로: 점등 글로우 2개',glowN===2,'glow '+glowN);
    // [C4] 선택 시 연결 곡선 표시
    STATE.selectedKind='electric';STATE.selectedId=sw3.id;
    renderElectric();
    let curveN=0;
    groups.electric.getChildren().forEach(n2=>{if(n2.getClassName()==='Shape')curveN++;});
    assert('회로: 연결 곡선 2개',curveN===2,'curve '+curveN);
    // [C5] JSON 승계 (raw spread)
    const jc=buildJSON();
    const je2=jc.electric.find(e2=>e2.id===sw3.id);
    assert('회로: JSON lightIds/circuitOn 승계',je2&&Array.isArray(je2.lightIds)&&je2.lightIds.length===2&&je2.circuitOn===true);
    // 복원
    STATE.electric=_bakC.electric;STATE.lights=_bakC.lights;
    STATE.selectedKind=_bakC.selectedKind;STATE.selectedId=_bakC.selectedId;
    window._circuitLink=null;
    renderAll();
  }catch(e){
    assert('회로: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-26: 소형 기호 픽 어퍼처 + 라벨 클릭 선택 + 서랍 자동 열기 (대표 보고 — 패널 미표시) ===
  try{
    const _bakP={electric:STATE.electric.slice(),selectedKind:STATE.selectedKind,selectedId:STATE.selectedId,zoom:STATE.zoom};
    STATE.zoom=1;
    // getIntersection 은 화면(히트 캔버스) 안에서만 동작 → 스테이지 중앙 mm 좌표에 배치
    const _mx=Math.round(pxToMm(stage.width()/2-STATE.offsetX)), _my=Math.round(pxToMm(stage.height()/2-STATE.offsetY));
    const swP={id:makeId('e'),type:'switch_2',x:_mx,y:_my,angle:0};
    STATE.electric.push(swP);
    renderElectric();
    let gP=null;groups.electric.getChildren().forEach(c=>{if(c.id&&c.id()===swP.id)gP=c;});
    // [P1] 픽 어퍼처 — 반경 17px 이상 원이 그룹에 존재 (기호 자체는 8px대)
    let pick=null;
    if(gP) gP.getChildren(n=>n.getClassName()==='Circle').forEach(c=>{if(c.radius()>=17&&c.opacity()<0.01)pick=c;});
    assert('픽: 소형 기호 히트 영역 ≥17px',!!pick,'symbol '+mmToPx(ELECTRIC_LIB.switch_2.size).toFixed(1)+'px');
    // [P2] 히트 반경 검증 — 중심에서 12px 떨어진 점이 픽 영역 안 (실제 클릭은 E2E 하네스로 별도 검증)
    //  (stage.getIntersection 은 히트 캔버스가 rAF 이후에 그려져 동기 테스트에서 신뢰 불가)
    assert('픽: 중심 12px 밖도 히트 반경 내',!!pick&&pick.isListening()&&Math.hypot(12,12)<=pick.radius(),
      pick?('r='+pick.radius().toFixed(1)):'no pick');
    // [P3] 라벨(이름 글씨) 클릭 가능
    let lbl=null;
    groups.electric.getChildren(n=>n.getClassName()==='Text').forEach(t=>{if(t.text()===ELECTRIC_LIB.switch_2.name)lbl=t;});
    assert('픽: 이름 라벨 클릭 가능',!!lbl&&lbl.listening()===true);
    // [P4] 서랍 자동 열기 API 존재
    assert('픽: 속성 서랍 자동 열기 API',typeof window.autoOpenPropsDrawer==='function');
    // [P5] 대형 객체(가구)에는 픽 어퍼처 미적용 (오클릭 방지)
    const _bakF2=STATE.furniture.slice();
    const sofa={id:makeId('f'),type:'sofa3',x:_mx,y:_my+10000,angle:0};
    STATE.furniture.push(sofa);
    renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture');
    let gF=null;groups.furniture.getChildren().forEach(c=>{if(c.id&&c.id()===sofa.id)gF=c;});
    let bigPick=false;
    if(gF) gF.getChildren(n=>n.getClassName()==='Circle').forEach(c=>{if(c.opacity()<0.01&&c.radius()>=17)bigPick=true;});
    assert('픽: 대형 가구는 미적용',!bigPick);
    STATE.furniture=_bakF2;
    STATE.electric=_bakP.electric;STATE.selectedKind=_bakP.selectedKind;STATE.selectedId=_bakP.selectedId;STATE.zoom=_bakP.zoom;
    renderAll();
  }catch(e){
    assert('픽: 테스트 예외 없음',false,e.message);
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
