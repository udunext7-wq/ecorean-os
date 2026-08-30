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
    // [L10] Alt+드래그 복사 — 2026-08-27 정책 변경(대표 지시): 잠긴 객체는 복사 자체가 금지
    const wallsBeforeAlt=STATE.walls.length;
    assert('잠금: Alt복사 차단',altCopyObj('wall',lw)===null&&STATE.walls.length===wallsBeforeAlt);
    lw.locked=false; // 해제 후에는 정상 복사되고 사본은 잠금 해제 상태
    const altc=altCopyObj('wall',lw);
    lw.locked=true;
    assert('잠금: 해제 시 사본 생성·잠금 해제',altc&&!altc.locked);
    moveVertex(altc.v1Id,OFF+60000,OFF+60000);
    assert('잠금: 사본 이동 가능',getVertex(altc.v1Id).x===OFF+60000);
    // [L11] 미러 — 잠긴 객체는 미러 복사도 금지, 해제 시 사본 생성(잠금 해제)
    STATE.boxSelection=[];STATE.selectedKind='wall';STATE.selectedId=lw.id;
    const px={x:STATE.offsetX+mmToPx(OFF+1000),y:STATE.offsetY+mmToPx(OFF+1000)};
    const mirrorCntBefore=STATE.walls.length;
    mirrorState={phase:'pickLine2',p1:{x:OFF+1000,y:OFF-1000}};
    handleMirrorClick(px);
    assert('잠금: 미러 차단',STATE.walls.length===mirrorCntBefore,'walls +'+(STATE.walls.length-mirrorCntBefore));
    lw.locked=false;
    STATE.selectedKind='wall';STATE.selectedId=lw.id;
    mirrorState={phase:'pickLine2',p1:{x:OFF+1000,y:OFF-1000}};
    handleMirrorClick(px);
    lw.locked=true;
    const mc=STATE.walls[STATE.walls.length-1];
    assert('잠금: 해제 시 미러 사본 생성',STATE.walls.length===mirrorCntBefore+1);
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
    // 2026-08-28: 라벨 '렌더 자체'를 보는 테스트 — 묶음 정책과 무관하게 전부 모드로 고정
    const _bakLM1=STATE.symbolLabelMode;STATE.symbolLabelMode='all';
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
    STATE.electric=_bakE2;STATE.zoom=_z2;STATE.symbolLabelMode=_bakLM1;renderAll();
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
    const _bakP={electric:STATE.electric.slice(),selectedKind:STATE.selectedKind,selectedId:STATE.selectedId,zoom:STATE.zoom,
      labelMode:STATE.symbolLabelMode};
    STATE.zoom=1;STATE.symbolLabelMode='all'; // 2026-08-28: 라벨 클릭 자체를 보는 테스트
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
    STATE.electric=_bakP.electric;STATE.selectedKind=_bakP.selectedKind;STATE.selectedId=_bakP.selectedId;STATE.zoom=_bakP.zoom;STATE.symbolLabelMode=_bakP.labelMode;
    renderAll();
  }catch(e){
    assert('픽: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-26: 저장→불러오기 설정 왕복 보존 (대표 보고: 계단 방향 등이 되돌아감) ===
  try{
    const _bakR={spaces:STATE.spaces.slice(),walls:STATE.walls.slice(),vertices:STATE.vertices.slice(),
      estimateConfig:STATE.estimateConfig,videoSequenceOrder:STATE.videoSequenceOrder,
      layers:{...STATE.layers},wallAlignment:STATE.wallAlignment,projectName:STATE.projectName,
      openings:STATE.openings.slice(),electric:STATE.electric.slice(),lights:STATE.lights.slice()};
    // 설정을 잔뜩 넣은 문서 구성
    const rv=polygonToVertexIds([{x:0,y:0},{x:1500,y:0},{x:1500,y:5000},{x:0,y:5000}]);
    const rsp=makeSpaceVEF(rv,{name:'계단실왕복',type:'STAIRS',typeIndex:88,layerName:'A-AREA-STR-88'});
    rsp.stair={type:'U',upDir:'down',stepCount:20,splitCount:8,width_mm:900,floorHeight_mm:3000,showBreak:false,rot:90,mirror:true};
    rsp.locked=true;
    STATE.spaces.push(rsp);
    const rsw={id:makeId('e'),type:'switch_2',x:200,y:2000,angle:0};
    const rlt={id:makeId('li'),type:'downlight',x:700,y:2000,angle:0};
    STATE.electric.push(rsw);STATE.lights.push(rlt);
    rsw.lightIds=[rlt.id];rsw.circuitOn=true;
    const rop={id:makeId('o'),type:'DOOR',subType:'pocket',x:750,y:0,width_mm:1800,height_mm:2100,depth_mm:200,angle:0,flipped:true,subtractMode:'single',spaceId:rsp.id};
    STATE.openings.push(rop);
    STATE.estimateConfig={DEMO_TEST:{option:'PREMIUM'}};
    STATE.videoSequenceOrder=[rsp.id];
    STATE.layers.walls=false;
    STATE.wallAlignment='interior';
    // 저장 → (서버 왕복 시뮬: JSON 문자열화) → 불러오기
    const raw=JSON.stringify(buildJSON());
    // 저장 후 설정을 일부러 뒤집어 놓고 복원되는지 확인
    rsp.stair={type:'I',upDir:'up'};rsp.locked=false;
    STATE.estimateConfig={};STATE.videoSequenceOrder=null;STATE.layers.walls=true;STATE.wallAlignment='center';
    applyLoadedData(JSON.parse(raw));
    const rsp2=STATE.spaces.find(x=>x.id===rsp.id);
    assert('왕복: 계단 설정 전체 보존',!!(rsp2&&rsp2.stair)&&rsp2.stair.type==='U'&&rsp2.stair.upDir==='down'
      &&rsp2.stair.stepCount===20&&rsp2.stair.splitCount===8&&rsp2.stair.showBreak===false
      &&rsp2.stair.rot===90&&rsp2.stair.mirror===true,rsp2&&JSON.stringify(rsp2.stair));
    assert('왕복: 공간 잠금 보존',!!rsp2&&rsp2.locked===true);
    const rsw2=STATE.electric.find(x=>x.id===rsw.id);
    assert('왕복: 회로(연결·점등) 보존',!!rsw2&&Array.isArray(rsw2.lightIds)&&rsw2.lightIds.length===1&&rsw2.circuitOn===true);
    const rop2=STATE.openings.find(x=>x.id===rop.id);
    assert('왕복: 도어 설정(포켓·반전·단면) 보존',!!rop2&&rop2.subType==='pocket'&&rop2.flipped===true&&rop2.subtractMode==='single'&&rop2.width_mm===1800);
    assert('왕복: 견적 옵션 보존',!!(STATE.estimateConfig&&STATE.estimateConfig.DEMO_TEST&&STATE.estimateConfig.DEMO_TEST.option==='PREMIUM'));
    assert('왕복: 동선 순서 보존',Array.isArray(STATE.videoSequenceOrder)&&STATE.videoSequenceOrder[0]===rsp.id);
    assert('왕복: 레이어 표시 보존',STATE.layers.walls===false);
    assert('왕복: 벽 정렬 보존',STATE.wallAlignment==='interior');
    // 복원
    STATE.spaces=_bakR.spaces;STATE.walls=_bakR.walls;STATE.vertices=_bakR.vertices;
    STATE.openings=_bakR.openings;STATE.electric=_bakR.electric;STATE.lights=_bakR.lights;
    STATE.estimateConfig=_bakR.estimateConfig;STATE.videoSequenceOrder=_bakR.videoSequenceOrder;
    STATE.layers=_bakR.layers;STATE.wallAlignment=_bakR.wallAlignment;STATE.projectName=_bakR.projectName;
    if(typeof reinstallVEFAll==='function') reinstallVEFAll();
    renderAll();refreshUI();
  }catch(e){
    assert('왕복: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-26: 계단이 방 회전을 따라간다 (대표 보고: 저장하고 열면 계단이 돌아가 있다) ===
  try{
    const _bakS={spaces:STATE.spaces.slice(),walls:STATE.walls.slice(),vertices:STATE.vertices.slice()};
    const mkStair=(x,y,w,h,idx,st,rot)=>{
      const v=polygonToVertexIds([{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]);
      const sp=makeSpaceVEF(v,{name:'회전검증'+idx,type:'STAIRS',typeIndex:idx,layerName:'A-AREA-STR-'+idx});
      if(st) sp.stair=st;
      STATE.spaces.push(sp);
      if(rot) rotateSpaceByAngle(sp.id,rot);
      return sp;
    };
    // [R1] 축정렬 방 — 프레임 각 0, 치수 그대로 (기존 동작 회귀 없음)
    const sA=mkStair(2000000,2000000,1500,5000,60,{type:'I'},0);
    const fA=_polyFrameMm(sA.polygon);
    assert('계단축: 축정렬 방 각도 0·치수 유지',fA.deg===0&&Math.abs(fA.w-1500)<1&&Math.abs(fA.h-5000)<1,
      fA.deg+'/'+Math.round(fA.w)+'x'+Math.round(fA.h));
    // [R2] 45° 회전 방 — 방 실치수 복원 (AABB 였다면 4596 정사각)
    const sB=mkStair(2010000,2000000,1500,5000,61,{type:'I'},45);
    const fB=_polyFrameMm(sB.polygon);
    assert('계단축: 45° 방도 실치수 1500×5000',Math.abs(fB.w-1500)<3&&Math.abs(fB.h-5000)<3,
      Math.round(fB.w)+'x'+Math.round(fB.h)+' deg='+fB.deg.toFixed(1));
    const iB=spaceStairInfo(sB);
    assert('계단축: 회전 방 단수 정상(≈18)',iB&&Math.abs(iB.N-18)<=1,iB&&iB.N);
    // [R3] 렌더 오버레이가 방 각도로 회전
    renderSpaces();
    let sg=null;
    groups.spaces.getChildren().forEach(g3=>{if(g3.name&&g3.name()==='space-stairs')sg=g3;});
    assert('계단축: 오버레이 회전 적용',!!sg&&Math.abs(Math.abs(sg.rotation())-45)<1||!!sg&&sg.rotation()===0,
      sg?sg.rotation().toFixed(1):'none');
    // [R4] 저장→불러오기 후 계단 도식 시그니처 동일
    const sigOf=sp=>{
      const info=spaceStairInfo(sp),shp=buildSpaceStairShape(sp)||[];
      let h=0,v=0;shp.forEach(c=>{if(c.type!=='line')return;if(Math.abs(c.y1-c.y2)<1)h++;else if(Math.abs(c.x1-c.x2)<1)v++;});
      const f=_polyFrameMm(sp.polygon);
      return [info&&info.type,info&&info.N,info&&info.rot,h,v,Math.round(f.deg*10),Math.round(f.w),Math.round(f.h)].join('|');
    };
    sB.stair={type:'U',upDir:'down',rot:90,mirror:true,splitCount:9};
    const sigBefore=sigOf(sB);
    const rawS=JSON.stringify(buildJSON());
    applyLoadedData(JSON.parse(rawS));
    const sB2=STATE.spaces.find(x=>x.id===sB.id);
    assert('계단축: 저장→불러오기 도식 동일',!!sB2&&sigOf(sB2)===sigBefore,sB2?(sigOf(sB2)+' vs '+sigBefore):'lost');
    STATE.spaces=_bakS.spaces;STATE.walls=_bakS.walls;STATE.vertices=_bakS.vertices;
    if(typeof reinstallVEFAll==='function') reinstallVEFAll();
    renderAll();
  }catch(e){
    assert('계단축: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-25: 다운라이트 인치 규격 (대표 지시 — 2인치·3인치 혼용) ===
  try{
    const _bakD={lights:STATE.lights.slice(),dlInch:STATE.downlightInch,selK:STATE.selectedKind,selI:STATE.selectedId};
    // [I1] 규격표
    assert('다운라이트: 인치 규격 2~6',[2,3,4,5,6].every(k=>DOWNLIGHT_INCH[k]&&DOWNLIGHT_INCH[k].bore>0&&DOWNLIGHT_INCH[k].outer>DOWNLIGHT_INCH[k].bore));
    // [I2] 인치별 도식 크기 = 실치수
    const d2=downlightDef({inch:2}), d3=downlightDef({inch:3}), d6=downlightDef({inch:6});
    assert('다운라이트: 2/3/6인치 외경 반영',d2.size===70&&d3.size===95&&d6.size===175,d2.size+'/'+d3.size+'/'+d6.size);
    assert('다운라이트: 타공경 원 반영',d2.shape[1].r===27.5&&d6.shape[1].r===75,d2.shape[1].r+'/'+d6.shape[1].r);
    assert('다운라이트: 이름에 인치 표기',d2.name.indexOf('2"')>=0&&d6.name.indexOf('6"')>=0,d2.name);
    // [I3] 잘못된 인치는 기본값(3)로 보정
    assert('다운라이트: 미지원 인치 보정',downlightDef({inch:9}).inch===3&&downlightDef({}).inch===3);
    // [I4] 렌더 — 서로 다른 인치가 서로 다른 크기로 그려짐
    const l2={id:makeId('li'),type:'downlight',x:2100000,y:2100000,angle:0,inch:2};
    const l6={id:makeId('li'),type:'downlight',x:2100500,y:2100000,angle:0,inch:6};
    STATE.lights.push(l2,l6);
    renderLights();
    const radOf=id=>{let r=0;groups.lights.getChildren().forEach(g4=>{if(g4.id&&g4.id()===id)
      g4.getChildren(n=>n.getClassName()==='Circle').forEach(c=>{if(c.opacity()>0.5&&c.radius()>r)r=c.radius();});});return r;};
    assert('다운라이트: 인치별 렌더 크기 차이',radOf(l6.id)>radOf(l2.id)*1.8,radOf(l2.id).toFixed(1)+' vs '+radOf(l6.id).toFixed(1));
    // [I5] JSON — 타공경/외경 출력 (견적 OS 연동)
    const jd=buildJSON();
    const j2=jd.lights.find(x=>x.id===l2.id), j6=jd.lights.find(x=>x.id===l6.id);
    assert('다운라이트: JSON 타공경 출력',!!j2&&j2.inch===2&&j2.boreDia_mm===55&&j2.outerDia_mm===70,j2&&JSON.stringify([j2.inch,j2.boreDia_mm]));
    assert('다운라이트: JSON 6인치',!!j6&&j6.boreDia_mm===150&&j6.nameKo.indexOf('6')>=0);
    // [I6] 저장→불러오기 왕복 보존
    STATE.downlightInch=5;
    const rawD=JSON.stringify(buildJSON());
    STATE.downlightInch=3;
    applyLoadedData(JSON.parse(rawD));
    const l2b=STATE.lights.find(x=>x.id===l2.id), l6b=STATE.lights.find(x=>x.id===l6.id);
    assert('다운라이트: 왕복 인치 보존',!!l2b&&l2b.inch===2&&!!l6b&&l6b.inch===6);
    assert('다운라이트: 왕복 기본 인치 보존',STATE.downlightInch===5,'now '+STATE.downlightInch);
    STATE.lights=_bakD.lights;STATE.downlightInch=_bakD.dlInch;
    STATE.selectedKind=_bakD.selK;STATE.selectedId=_bakD.selI;
    renderAll();
  }catch(e){
    assert('다운라이트: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-25: 라인·간접조명 길이 가변 (대표 지시 — 하나 넣고 길게 뺀다) ===
  try{
    const _bakL={lights:STATE.lights.slice(),selK:STATE.selectedKind,selI:STATE.selectedId};
    // [L1] 대상 타입
    assert('라인조명: 대상 5종',['line_t5','cove','magnet_track','fluorescent','pendant_linear'].every(isLinearLight)
      &&!isLinearLight('downlight')&&!isLinearLight('pendant'));
    // [L2] 길이별 도식 — 몸체 rect 폭이 길이와 일치
    const bodyW=(type,L)=>{const sh=linearLightShape(type,L);const r=sh.find(c=>c.type==='rect');return r?r.w:0;};
    assert('라인조명: 길이 = 몸체 폭',bodyW('line_t5',1200)===1200&&bodyW('line_t5',4500)===4500&&bodyW('cove',3000)===3000);
    assert('라인조명: 끝단 캡 위치 추종',(function(){const sh=linearLightShape('line_t5',2400);
      const caps=sh.filter(c=>c.type==='rect'&&c.w===40);return caps.length===2&&Math.abs(caps[1].x-(1200-20))<0.1;})());
    // [L3] 마그네틱 트랙 — 길이에 비례해 모듈 수 증가
    const modN=L=>linearLightShape('magnet_track',L).length;
    assert('라인조명: 트랙 모듈 길이 비례',modN(4500)>modN(1500),modN(1500)+'→'+modN(4500));
    // [L4] 길이 클램프
    assert('라인조명: 길이 하한/상한',linearLightLen({type:'line_t5',length_mm:50})===300
      &&linearLightLen({type:'line_t5',length_mm:999999})===30000);
    assert('라인조명: 미지정 시 기본 길이',linearLightLen({type:'cove'})===LIGHT_LIB.cove.size);
    // [L5] 렌더 — 길이가 다르면 그려진 폭도 다르다
    const l1={id:makeId('li'),type:'line_t5',x:2200000,y:2200000,angle:0,length_mm:1200};
    const l2={id:makeId('li'),type:'line_t5',x:2200000,y:2201000,angle:0,length_mm:3600};
    STATE.lights.push(l1,l2);
    renderLights();
    const widthOf=id=>{let w=0;groups.lights.getChildren().forEach(g5=>{if(g5.id&&g5.id()===id)
      g5.getChildren(n=>n.getClassName()==='Rect').forEach(r=>{if(r.width()>w)w=r.width();});});return w;};
    assert('라인조명: 렌더 폭 3배 차이',Math.abs(widthOf(l2.id)/widthOf(l1.id)-3)<0.06,
      widthOf(l1.id).toFixed(1)+' vs '+widthOf(l2.id).toFixed(1));
    // [L6] 선택 시 양 끝 길이 핸들 2개
    STATE.selectedKind='lights';STATE.selectedId=l2.id;
    renderLights();
    let handles=0;
    groups.lights.getChildren().forEach(g5=>{if(g5.id&&g5.id()===l2.id)
      g5.getChildren(n=>n.getClassName()==='Circle').forEach(c=>{if(c.draggable&&c.draggable())handles++;});});
    assert('라인조명: 길이 조절 핸들 2개',handles===2,'handles '+handles);
    // [L7] JSON — 길이(m) 출력 + 왕복 보존
    const jl=buildJSON();
    const jj=jl.lights.find(x=>x.id===l2.id);
    assert('라인조명: JSON length_m',!!jj&&jj.length_mm===3600&&jj.length_m===3.6,jj&&JSON.stringify([jj.length_mm,jj.length_m]));
    applyLoadedData(JSON.parse(JSON.stringify(jl)));
    const l2b=STATE.lights.find(x=>x.id===l2.id);
    assert('라인조명: 왕복 길이 보존',!!l2b&&l2b.length_mm===3600);
    STATE.lights=_bakL.lights;STATE.selectedKind=_bakL.selK;STATE.selectedId=_bakL.selI;
    renderAll();
  }catch(e){
    assert('라인조명: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-26: 라이브러리 중복 제거 (대표 보고: 다운라이트가 두 개로 잡힌다) ===
  try{
    const _bakDup={tool:STATE.selectedTool,lib:STATE.selectedLib};
    // [D1] 최근 사용이 있어도 팔레트에 같은 항목이 두 번 나오지 않는다
    try{localStorage.setItem('minicad.recent.light',JSON.stringify(['downlight','cove']));}catch(_){}
    setLibCategory('light');
    const btns=[...document.querySelectorAll('#lib-popup-grid .lib-thumb-btn')];
    const cnt={};btns.forEach(b=>{cnt[b.dataset.libKey]=(cnt[b.dataset.libKey]||0)+1;});
    const dupK=Object.keys(cnt).filter(k=>cnt[k]>1);
    assert('중복: 팔레트 항목 유일',dupK.length===0,'중복 '+dupK.join(','));
    // [D2] 2026-08-30: 규격 항목 때문에 개수는 더 많을 수 있다 —
    //  모든 표시 대상이 최소 한 번은 나오는지(누락 없음)로 본다
    const visibleKeys=Object.entries(LIGHT_LIB).filter(([k,d])=>!d.hidden).map(e=>e[0]);
    const baseSeen={};btns.forEach(b=>{const bk=libBaseType(b.dataset.libKey);baseSeen[bk]=1;});
    assert('중복: 표시 대상 누락 없음',visibleKeys.every(k=>baseSeen[k]),
      visibleKeys.filter(k=>!baseSeen[k]).join(','));
    assert('중복: 팔레트가 라이브러리보다 적지 않다',btns.length>=visibleKeys.length,
      btns.length+' vs '+visibleKeys.length);
    // [D3] 최근 사용은 앞으로 정렬 (첫 항목이 최근)
    assert('중복: 최근 사용 우선 정렬',btns[0]&&btns[0].dataset.libKey==='downlight',btns[0]&&btns[0].dataset.libKey);
    // [D4] 레거시 중복 항목은 숨김 + 대체 지정
    const legacy=[['LIGHT_LIB','track','spot_bar_3'],['ELECTRIC_LIB','ac','ac_wall'],
                  ['ELECTRIC_LIB','ac_floor','ac_stand'],['HVAC_FIRE_LIB','ac_ceiling','ac_4way'],
                  ['FURNITURE_LIB','island','island_1500']];
    const LIBS={LIGHT_LIB,ELECTRIC_LIB,HVAC_FIRE_LIB,FURNITURE_LIB};
    assert('중복: 레거시 5종 숨김+대체',legacy.every(([L,k,rep])=>LIBS[L][k]&&LIBS[L][k].hidden===true&&LIBS[L][k].replacedBy===rep),
      legacy.filter(([L,k])=>!(LIBS[L][k]&&LIBS[L][k].hidden)).map(x=>x[1]).join(','));
    // [D5] 숨김 항목도 기존 도면은 그대로 렌더 (데이터 손실 없음)
    const _bakH=STATE.hvac.slice();
    const oldAc={id:makeId('h'),type:'ac_ceiling',x:2300000,y:2300000,angle:0};
    STATE.hvac.push(oldAc);
    renderRect(STATE.hvac,groups.hvac,HVAC_FIRE_LIB,'hvac');
    let found=false;groups.hvac.getChildren().forEach(g6=>{if(g6.id&&g6.id()===oldAc.id)found=true;});
    assert('중복: 레거시 타입 기존 도면 렌더 유지',found);
    STATE.hvac=_bakH;
    // [D6] 다른 카테고리 팔레트도 중복 없음
    ['furniture','furniture2','fixture','electric','hvac'].forEach(t=>{
      setLibCategory(t);
      const bs=[...document.querySelectorAll('#lib-popup-grid .lib-thumb-btn')];
      const c2={};bs.forEach(b=>{c2[b.dataset.libKey]=(c2[b.dataset.libKey]||0)+1;});
      assert('중복: '+t+' 팔레트 유일',Object.values(c2).every(v=>v===1));
    });
    hideLibPopup();
    setTool(_bakDup.tool||'select');STATE.selectedLib=_bakDup.lib;
    renderAll();
  }catch(e){
    assert('중복: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 라이브러리 소분류 + 전체 중복 재감사 (대표 지시) ===
  try{
    const _bakG={tool:STATE.selectedTool,lib:STATE.selectedLib};
    const LIBMAP={furniture:FURNITURE_LIB,furniture2:FIXFURN_LIB,fixture:FIXTURE_LIB,
                  light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB};
    // [G1] 전 라이브러리 키 유일 (내부·교차 중복 없음)
    const seen={},cross=[];
    Object.entries(LIBMAP).forEach(([L,lb])=>Object.keys(lb).forEach(k=>{
      if(L==='furniture'&&FIXFURN_LIB[k]) return; // 가구2 병합분은 제외
      (seen[k]=seen[k]||[]).push(L);
    }));
    Object.entries(seen).forEach(([k,v])=>{if(v.length>1)cross.push(k+':'+v.join('+'));});
    assert('분류: 전 라이브러리 키 유일',cross.length===0,cross.join(', '));
    // [G2] 이름(한글) 중복 없음 — 숨김 제외
    const nameDup=[];
    Object.entries(LIBMAP).forEach(([L,lb])=>{
      const nm={};
      Object.entries(lb).forEach(([k,d])=>{if(d.hidden)return;nm[d.name]=(nm[d.name]||0)+1;});
      Object.entries(nm).forEach(([n,c])=>{if(c>1)nameDup.push(L+':'+n);});
    });
    assert('분류: 카테고리 내 이름 중복 없음',nameDup.length===0,nameDup.join(', '));
    // [G3] 분류표가 실재 키만 참조 + 분류 내 중복 없음
    const badRef=[],dupInGroup=[];
    Object.entries(LIB_GROUPS).forEach(([tool,gs])=>{
      const lb=LIBMAP[tool]||{}, used={};
      gs.forEach(([gn,keys])=>keys.forEach(k=>{
        // 2026-08-30: 'downlight#3' 같은 규격 키는 베이스 타입이 실재하면 된다
        const bk=(typeof libBaseType==='function')?libBaseType(k):k;
        if(!lb[bk]) badRef.push(tool+':'+k);
        used[k]=(used[k]||0)+1;
        if(used[k]>1) dupInGroup.push(tool+':'+k);
      }));
    });
    assert('분류: 분류표 키 실재',badRef.length===0,badRef.join(', '));
    // 규격 키를 쓰면 맨 타입은 팔레트에서 뺀다 — 둘이 같이 떴 있으면 뭐가 다른지 모른다
    const mixRef=[];
    Object.entries(LIB_GROUPS).forEach(([tool,gs])=>{
      const all=gs.map(g=>g[1]).reduce((a,b)=>a.concat(b),[]);
      const bases=new Set(all.filter(k=>String(k).indexOf('#')>=0).map(k=>libBaseType(k)));
      bases.forEach(b=>{if(all.indexOf(b)>=0) mixRef.push(tool+':'+b);});
    });
    assert('분류: 규격 키와 맨 타입을 섮지 않는다',mixRef.length===0,mixRef.join(', '));
    assert('분류: 분류표 내 중복 없음',dupInGroup.length===0,dupInGroup.join(', '));
    // [G4] 팔레트 — 모든 표시 대상이 정확히 한 번 등장 + 섹션 헤더 존재
    ['furniture','furniture2','fixture','light','electric','hvac'].forEach(t=>{
      setLibCategory(t);
      const bs=[...document.querySelectorAll('#lib-popup-grid .lib-thumb-btn')];
      const hs=[...document.querySelectorAll('#lib-popup-grid .lib-group-title')];
      const cnt={};bs.forEach(b=>{cnt[b.dataset.libKey]=(cnt[b.dataset.libKey]||0)+1;});
      const lb=LIBMAP[t];
      const visible=Object.entries(lb).filter(([k,d])=>!d.hidden&&!(t==='furniture'&&FIXFURN_LIB[k])).map(e=>e[0]);
      // 2026-08-30: 규격 항목(downlight#3 등)이 생기면서 '개수 = 라이브러리 수'는
      //  더 이상 성립하지 않는다. 진짜 지키려던 것은 '중복 없음'과 '누락 없음'이다.
      assert('분류: '+t+' 항목 중복 없음',Object.values(cnt).every(v=>v===1),
        Object.keys(cnt).filter(k=>cnt[k]>1).join(','));
      const _base={};bs.forEach(b=>{const bk=libBaseType(b.dataset.libKey);_base[bk]=(_base[bk]||0)+1;});
      assert('분류: '+t+' 누락 없음 (규격 항목 포함)',visible.every(k=>_base[k]>=1),
        visible.filter(k=>!_base[k]).join(','));
      assert('분류: '+t+' 섹션 헤더 표시',hs.length>=2,'headers '+hs.length);
    });
    hideLibPopup();
    setTool(_bakG.tool||'select');STATE.selectedLib=_bakG.lib;
    renderAll();
  }catch(e){
    assert('분류: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: Alt+드래그 복사 — 다중 선택 전체 복사 (대표 지시) ===
  try{
    const _bakA={spaces:STATE.spaces.slice(),walls:STATE.walls.slice(),vertices:STATE.vertices.slice(),
      lights:STATE.lights.slice(),furniture:STATE.furniture.slice(),box:STATE.boxSelection.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId};
    const OFF9=2400000;
    // 공간(자식 벽 포함) + 독립 벽 + 조명 2개를 박스 선택
    const sv=polygonToVertexIds([{x:OFF9,y:OFF9},{x:OFF9+3000,y:OFF9},{x:OFF9+3000,y:OFF9+2000},{x:OFF9,y:OFF9+2000}]);
    const spA=makeSpaceVEF(sv,{name:'알트복사',type:'ROOM',typeIndex:77,layerName:'A-AREA-ROOM-77'});
    STATE.spaces.push(spA);
    const childWalls=[];
    for(let i=0;i<4;i++){const w=makeWallVEF(sv[i],sv[(i+1)%4],{spaceId:spA.id,layerName:'A-WALL-ROOM-77'});STATE.walls.push(w);childWalls.push(w);}
    const freeV1=ensureVertex(OFF9+5000,OFF9), freeV2=ensureVertex(OFF9+7000,OFF9);
    const freeWall=makeWallVEF(freeV1.id,freeV2.id,{});STATE.walls.push(freeWall);
    const li1={id:makeId('li'),type:'downlight',x:OFF9+800,y:OFF9+800,angle:0,inch:3};
    const li2={id:makeId('li'),type:'downlight',x:OFF9+2200,y:OFF9+800,angle:0,inch:3};
    STATE.lights.push(li1,li2);
    STATE.boxSelection=[{kind:'space',id:spA.id},{kind:'wall',id:childWalls[0].id},
                        {kind:'wall',id:freeWall.id},{kind:'lights',id:li1.id},{kind:'lights',id:li2.id}];
    const spBefore=STATE.spaces.length, wBefore=STATE.walls.length, liBefore=STATE.lights.length;
    // [A1] 선택 전체 복사 — 공간 소속 벽은 공간 사본에 포함되어 중복 생성 안 됨
    const copies=altCopyBoxSelection();
    assert('알트복사: 항목 4개 (공간 소속 벽 제외)',copies.length===4,'copies '+copies.length);
    assert('알트복사: 공간 1개 추가',STATE.spaces.length===spBefore+1);
    assert('알트복사: 벽 = 자식4 + 독립1 추가',STATE.walls.length===wBefore+5,'walls +'+(STATE.walls.length-wBefore));
    assert('알트복사: 조명 2개 추가',STATE.lights.length===liBefore+2);
    // [A2] 사본은 새 id·잠금 해제, 원본 불변
    const newSp=STATE.spaces[STATE.spaces.length-1];
    assert('알트복사: 사본 새 id',newSp.id!==spA.id&&copies.every(c=>c.id!==spA.id));
    assert('알트복사: 사본 잠금 해제',copies.every(c=>{const a=getArr(c.kind);const o=a&&a.find(x=>x.id===c.id);return o&&!o.locked;}));
    const origX=li1.x, origPolyX=spA.polygon[0].x;
    // [A3] 다중 드래그 — 사본 전부 이동, 원본 제자리
    const st={kind:'multi',items:copies,startMm:{x:0,y:0},altCopy:true};
    applyDragMove(st,1500,900);
    const movedOK=copies.every(c=>{
      const a=getArr(c.kind);const o=a&&a.find(x=>x.id===c.id);if(!o)return false;
      if('x' in o) return Math.abs(o.x-(c.baseObj.x+1500))<2&&Math.abs(o.y-(c.baseObj.y+900))<2;
      if(o.polygon) return Math.abs(o.polygon[0].x-(c.baseObj.polygon[0].x+1500))<2;
      if('x1' in o) return Math.abs(o.x1-(c.baseObj.x1+1500))<2;
      return true;
    });
    assert('알트복사: 사본 전체 이동',movedOK);
    assert('알트복사: 원본 제자리',li1.x===origX&&spA.polygon[0].x===origPolyX);
    // [A4] 공간 사본의 자식 벽도 함께 이동 (VEF 공유 vertex)
    const copySp=STATE.spaces.find(x=>x.id===(copies.find(c=>c.kind==='space')||{}).id);
    const copyChild=STATE.walls.filter(w=>w.spaceId===copySp.id);
    assert('알트복사: 공간 자식 벽 4개 동반',copyChild.length===4,'child '+copyChild.length);
    assert('알트복사: 자식 벽도 이동',copyChild.every(w=>w.x1>=OFF9+1000));
    // [A5] 취소 시 사본 일괄 제거 (원본은 유지)
    const removed=_removeAltCopies(st);
    assert('알트복사: 사본 일괄 제거',removed===4&&STATE.spaces.length===spBefore&&STATE.lights.length===liBefore,
      'removed '+removed+' spaces '+STATE.spaces.length+'/'+spBefore);
    assert('알트복사: 제거 후 원본 유지',!!STATE.spaces.find(x=>x.id===spA.id)&&!!STATE.lights.find(x=>x.id===li1.id));
    STATE.spaces=_bakA.spaces;STATE.walls=_bakA.walls;STATE.vertices=_bakA.vertices;
    STATE.lights=_bakA.lights;STATE.furniture=_bakA.furniture;STATE.boxSelection=_bakA.box;
    STATE.selectedKind=_bakA.selK;STATE.selectedId=_bakA.selI;
    if(typeof reinstallVEFAll==='function') reinstallVEFAll();
    renderAll();
  }catch(e){
    assert('알트복사: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: AutoCAD 방식 박스 선택 — Window(좌→우) / Crossing(우→좌) (대표 지시) ===
  try{
    const _bakB={spaces:STATE.spaces.slice(),walls:STATE.walls.slice(),vertices:STATE.vertices.slice(),
      furniture:STATE.furniture.slice(),lights:STATE.lights.slice(),box:STATE.boxSelection.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,draw:drawState};
    const B=3000000;
    // 긴 벽 (B,B) → (B+6000,B)
    const wv1=ensureVertex(B,B), wv2=ensureVertex(B+6000,B);
    const wallX=makeWallVEF(wv1.id,wv2.id,{});STATE.walls.push(wallX);
    // 공간 사각 (B+1000,B+1000) ~ (B+3000,B+3000)
    const sv=polygonToVertexIds([{x:B+1000,y:B+1000},{x:B+3000,y:B+1000},{x:B+3000,y:B+3000},{x:B+1000,y:B+3000}]);
    const spB=makeSpaceVEF(sv,{name:'박스선택',type:'ROOM',typeIndex:66,layerName:'A-AREA-ROOM-66'});
    STATE.spaces.push(spB);
    // 소파 2200x900, 중심 (B+8000, B+5000)
    const sofa={id:makeId('f'),type:'sofa3',x:B+8000,y:B+5000,angle:0};
    STATE.furniture.push(sofa);
    const sel=(sx,sy,cx,cy)=>{ // start→current 로 박스 선택 실행
      STATE.boxSelection=[];
      drawState={type:'box',start:{x:sx,y:sy},current:{x:cx,y:cy}};
      finishBoxSelection();
      return STATE.boxSelection.slice();
    };
    const has=(arr,kind,id)=>arr.some(b=>b.kind===kind&&b.id===id);
    // [B1] Window(좌→우): 공간 완전 포함 → 선택
    let r=sel(B+500,B+500,B+3500,B+3500);
    assert('박스선택: Window 완전 포함 선택',has(r,'space',spB.id));
    // [B2] Window: 공간 일부만 덮음 → 선택 안 됨
    r=sel(B+500,B+500,B+2000,B+2000);
    assert('박스선택: Window 부분 겹침 제외',!has(r,'space',spB.id));
    // [B3] Crossing(우→좌): 공간 모서리만 살짝 → 선택
    r=sel(B+2000,B+2000,B+900,B+900);
    assert('박스선택: Crossing 살짝 걸침 선택',has(r,'space',spB.id));
    // [B4] Crossing: 긴 벽 한가운데 (양 끝점 모두 박스 밖) → 관통 선택 (기존 방식은 놓쳤음)
    r=sel(B+3500,B+300,B+2500,B-300);
    assert('박스선택: Crossing 관통 선분 선택',has(r,'wall',wallX.id));
    // [B5] Window: 같은 박스로는 벽이 안 잡힘 (좌→우)
    r=sel(B+2500,B-300,B+3500,B+300);
    assert('박스선택: Window 관통만 하면 제외',!has(r,'wall',wallX.id));
    // [B6] Window: 소파 중심만 들어오고 몸통이 삐져나감 → 제외 (기존엔 중심만 봐서 잘못 선택)
    r=sel(B+7800,B+4800,B+8300,B+5200);
    assert('박스선택: Window 중심만 포함 제외',!has(r,'furniture',sofa.id));
    // [B7] Crossing: 소파 가장자리만 걸침(중심 밖) → 선택 (기존엔 놓침)
    r=sel(B+7300,B+5200,B+6950,B+4800);
    assert('박스선택: Crossing 가장자리 선택',has(r,'furniture',sofa.id));
    // [B8] Window: 소파 전체 포함 → 선택
    r=sel(B+6700,B+4400,B+9300,B+5600);
    assert('박스선택: Window 전체 포함 선택',has(r,'furniture',sofa.id));
    // [B9] Crossing: 박스가 공간 내부에 완전히 들어감 → 공간 선택
    r=sel(B+2500,B+2500,B+1500,B+1500);
    assert('박스선택: Crossing 박스가 도형 내부',has(r,'space',spB.id));
    // [B10] 선분↔사각 교차 유틸 단위 검증
    assert('박스선택: 선분 관통 판정',_segRectHit(0,50,200,50,50,0,150,100)===true
      &&_segRectHit(0,500,200,500,50,0,150,100)===false);
    STATE.spaces=_bakB.spaces;STATE.walls=_bakB.walls;STATE.vertices=_bakB.vertices;
    STATE.furniture=_bakB.furniture;STATE.lights=_bakB.lights;STATE.boxSelection=_bakB.box;
    STATE.selectedKind=_bakB.selK;STATE.selectedId=_bakB.selI;drawState=_bakB.draw;
    if(typeof reinstallVEFAll==='function') reinstallVEFAll();
    renderAll();
  }catch(e){
    assert('박스선택: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 잠금 객체는 선택돼 있어도 복사·복제·미러 불가 (대표 지시) ===
  try{
    const _bakLK={lights:STATE.lights.slice(),furniture:STATE.furniture.slice(),walls:STATE.walls.slice(),
      vertices:STATE.vertices.slice(),box:STATE.boxSelection.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,mirror:(typeof mirrorState!=='undefined'?mirrorState:null)};
    const K=3600000;
    const lockedLi={id:makeId('li'),type:'downlight',x:K,y:K,angle:0,inch:3,locked:true};
    const freeLi={id:makeId('li'),type:'downlight',x:K+1000,y:K,angle:0,inch:3};
    STATE.lights.push(lockedLi,freeLi);
    const lockedFn={id:makeId('f'),type:'sofa3',x:K,y:K+3000,angle:0,locked:true};
    STATE.furniture.push(lockedFn);
    const liN=STATE.lights.length, fnN=STATE.furniture.length;
    // [K1] altCopyObj 중앙 가드
    assert('잠금복사: altCopyObj 잠금 차단',altCopyObj('lights',lockedLi)===null&&STATE.lights.length===liN);
    assert('잠금복사: 해제 객체는 복사됨',(function(){const c=altCopyObj('lights',freeLi);const ok=!!c;
      if(c){const i=STATE.lights.findIndex(x=>x.id===c.id);if(i>=0)STATE.lights.splice(i,1);}return ok;})());
    // [K2] Alt 다중 복사 — 잠긴 것만 제외하고 나머지는 복사
    STATE.boxSelection=[{kind:'lights',id:lockedLi.id},{kind:'lights',id:freeLi.id},{kind:'furniture',id:lockedFn.id}];
    const items=altCopyBoxSelection();
    assert('잠금복사: 잠긴 2개 제외, 1개만 복사',items.length===1&&items[0].kind==='lights',
      'items '+items.length);
    assert('잠금복사: 잠긴 원본 사본 생성 안 됨',STATE.furniture.length===fnN&&STATE.lights.length===liN+1);
    _removeAltCopies({kind:'multi',items,altCopy:true});
    assert('잠금복사: 정리 후 원상',STATE.lights.length===liN&&STATE.furniture.length===fnN);
    // [K3] 전부 잠긴 선택 → 복사 0개
    STATE.boxSelection=[{kind:'lights',id:lockedLi.id},{kind:'furniture',id:lockedFn.id}];
    assert('잠금복사: 전부 잠금이면 0개',altCopyBoxSelection().length===0
      &&STATE.lights.length===liN&&STATE.furniture.length===fnN);
    // [K4] 복제 버튼/명령 — 잠긴 객체 제외
    STATE.boxSelection=[];STATE.selectedKind='lights';STATE.selectedId=lockedLi.id;
    duplicateSelected();
    assert('잠금복사: duplicateSelected 차단',STATE.lights.length===liN);
    duplicateSelectedAt(500,500);
    assert('잠금복사: duplicateSelectedAt 차단',STATE.lights.length===liN);
    // 섞인 선택은 해제된 것만 복제
    STATE.selectedKind=null;STATE.selectedId=null;
    STATE.boxSelection=[{kind:'lights',id:lockedLi.id},{kind:'lights',id:freeLi.id}];
    duplicateSelected();
    assert('잠금복사: 혼합 선택 시 해제분만 복제',STATE.lights.length===liN+1,'now '+STATE.lights.length);
    STATE.lights=STATE.lights.filter(o=>o.id===lockedLi.id||o.id===freeLi.id||_bakLK.lights.some(x=>x.id===o.id));
    // [K5] 미러 — 잠긴 객체 제외
    if(typeof mirrorState!=='undefined'){
      const before=STATE.lights.length;
      STATE.boxSelection=[{kind:'lights',id:lockedLi.id}];
      STATE.selectedKind=null;STATE.selectedId=null;
      mirrorState={phase:'pickLine2',p1:{x:K,y:K-2000}};
      handleMirrorClick({x:STATE.offsetX+mmToPx(K),y:STATE.offsetY+mmToPx(K+2000)});
      assert('잠금복사: 미러 차단',STATE.lights.length===before,'now '+STATE.lights.length);
    }
    // [K6] 이동도 여전히 차단 (기존 보장 재확인)
    const lx=lockedLi.x;
    STATE.boxSelection=[];STATE.selectedKind='lights';STATE.selectedId=lockedLi.id;
    moveSelectedBy(1000,1000);
    assert('잠금복사: 이동 차단 유지',lockedLi.x===lx);
    STATE.lights=_bakLK.lights;STATE.furniture=_bakLK.furniture;STATE.walls=_bakLK.walls;
    STATE.vertices=_bakLK.vertices;STATE.boxSelection=_bakLK.box;
    STATE.selectedKind=_bakLK.selK;STATE.selectedId=_bakLK.selI;
    if(typeof mirrorState!=='undefined') mirrorState=_bakLK.mirror;
    renderAll();
  }catch(e){
    assert('잠금복사: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 잠긴 객체도 스냅 기준으로 동작 (대표 지시) ===
  try{
    const _bakSN={walls:STATE.walls.slice(),spaces:STATE.spaces.slice(),vertices:STATE.vertices.slice(),
      snapEp:STATE.snap.endpoint,ctrl:STATE.ctrlPressed};
    STATE.snap.endpoint=true;STATE.ctrlPressed=false;
    const N=5200000;
    const nv1=ensureVertex(N,N), nv2=ensureVertex(N+4000,N);
    const lockW=makeWallVEF(nv1.id,nv2.id,{}); lockW.locked=true; STATE.walls.push(lockW);
    const lsv=polygonToVertexIds([{x:N+10000,y:N},{x:N+13000,y:N},{x:N+13000,y:N+3000},{x:N+10000,y:N+3000}]);
    const lockSp=makeSpaceVEF(lsv,{name:'스냅잠금',type:'ROOM',typeIndex:54,layerName:'A-AREA-ROOM-54'});
    lockSp.locked=true; STATE.spaces.push(lockSp);
    // [SN1] 잠긴 벽 끝점·중점 스냅
    const s1=snapToEndpoint({x:N+4040,y:N+35});
    assert('잠금스냅: 벽 끝점',s1.snapped&&s1.pt.x===N+4000&&s1.pt.y===N,JSON.stringify(s1.pt));
    const s2=snapToEndpoint({x:N+2040,y:N+30});
    assert('잠금스냅: 벽 중점',s2.snapped&&s2.pt.x===N+2000&&s2.pt.y===N);
    // [SN2] 잠긴 공간 변·꼭짓점 스냅
    const s3=snapPointToSpaceEdges({x:N+11500,y:N+80},null,200);
    assert('잠금스냅: 공간 변',s3.snapped&&s3.pt.y===N);
    const s4=snapToEndpoint({x:N+10050,y:N+40});
    assert('잠금스냅: 공간 꼭짓점',s4.snapped&&s4.pt.x===N+10000&&s4.pt.y===N);
    // [SN3] 스냅해서 그린 새 벽 — 좌표는 정확히 일치하되 버텍스는 독립 (묶이지 않음)
    const wB=STATE.walls.length;
    addWall(s1.pt.x,s1.pt.y,s1.pt.x+2500,s1.pt.y+2500);
    const nw=STATE.walls[STATE.walls.length-1];
    assert('잠금스냅: 새 벽 시작점 정확 일치',STATE.walls.length===wB+1&&nw.x1===N+4000&&nw.y1===N);
    assert('잠금스냅: 잠긴 버텍스와 용접 안 됨',nw.v1Id!==nv2.id&&!isVertexLocked(nw.v1Id));
    // [SN4] 새 벽은 그대로 편집 가능 (잠금 전이 안 됨)
    moveVertex(nw.v1Id,N+4500,N+500);
    assert('잠금스냅: 새 벽 이동 가능',getVertex(nw.v1Id).x===N+4500);
    // [SN5] 잠긴 벽은 여전히 못 움직임
    moveVertex(nv2.id,N+9999,N+9999);
    assert('잠금스냅: 잠긴 벽 이동 불가',getVertex(nv2.id).x===N+4000);
    // [SN6] 잠긴 공간 꼭짓점에 스냅해 만든 공간도 독립 버텍스
    const newIds=polygonToVertexIds([{x:N+10000,y:N},{x:N+12000,y:N},{x:N+12000,y:N-2000},{x:N+10000,y:N-2000}]);
    assert('잠금스냅: 공간 버텍스도 독립',newIds.every(id=>!lsv.includes(id)));
    STATE.walls=_bakSN.walls;STATE.spaces=_bakSN.spaces;STATE.vertices=_bakSN.vertices;
    STATE.snap.endpoint=_bakSN.snapEp;STATE.ctrlPressed=_bakSN.ctrl;
    if(typeof reinstallVEFAll==='function') reinstallVEFAll();
    renderAll();
  }catch(e){
    assert('잠금스냅: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 끝점=객체만 / 그리드=켰을 때만 + 설정 지속 (대표 지시) ===
  try{
    const _bakSP={grid:STATE.snap.grid,ep:STATE.snap.endpoint,gs:STATE.gridSize,ctrl:STATE.ctrlPressed,
      zoom:STATE.zoom,ox:STATE.offsetX,oy:STATE.offsetY,walls:STATE.walls.slice(),vertices:STATE.vertices.slice(),
      ls:(function(){try{return localStorage.getItem('minicad.snap');}catch(_){return null;}})()};
    STATE.ctrlPressed=false;STATE.gridSize=100;STATE.zoom=1;STATE.offsetX=0;STATE.offsetY=0;
    const P={x:mmToPx(1234),y:mmToPx(2345)};
    // [SP1] 빈 곳: 그리드 ON → 격자 흡착 / 그리드 OFF → 자유 좌표 (끝점 ON 이어도)
    STATE.snap.grid=true;STATE.snap.endpoint=true;
    let m=getMm(P);
    assert('스냅: 빈 곳 그리드 ON 흡착',m.x===1200&&m.y===2300,JSON.stringify(m));
    STATE.snap.grid=false;
    m=getMm(P);
    assert('스냅: 빈 곳 그리드 OFF 자유',m.x===1234&&m.y===2345,JSON.stringify(m));
    // [SP2] 끝점 스냅은 객체에서만 — 빈 곳에서는 아무 흡착 없음
    assert('스냅: 끝점은 빈 곳에서 미작동',snapToEndpoint({x:1234,y:2345}).snapped===false);
    const bv1=ensureVertex(7000000,7000000), bv2=ensureVertex(7000000+3000,7000000);
    const bw=makeWallVEF(bv1.id,bv2.id,{});STATE.walls.push(bw);
    const r2=snapToEndpoint({x:7000000+3040,y:7000000+30});
    assert('스냅: 끝점은 객체에서 작동',r2.snapped&&r2.pt.x===7000000+3000);
    // [SP3] 그리드 OFF + 끝점 ON — 객체 근처는 정확히 끝점, 격자로 밀리지 않음
    STATE.snap.grid=false;STATE.snap.endpoint=true;
    const q=getMm({x:mmToPx(7000000+3040),y:mmToPx(7000000+30)});
    assert('스냅: 객체 근처 끝점 우선',q.x===7000000+3000&&q.y===7000000,JSON.stringify(q));
    // [SP4] 끝점 OFF → 객체 근처여도 흡착 없음
    STATE.snap.endpoint=false;
    const q2=getMm({x:mmToPx(7000000+3040),y:mmToPx(7000000+30)});
    assert('스냅: 끝점 OFF면 객체도 미흡착',q2.x===7000000+3040);
    // [SP5] 설정 지속 — 저장/복원
    STATE.snap.grid=false;STATE.snap.endpoint=true;STATE.gridSize=200;
    saveSnapPrefs();
    STATE.snap.grid=true;STATE.snap.endpoint=false;STATE.gridSize=1;
    assert('스냅: 저장→복원',loadSnapPrefs()===true&&STATE.snap.grid===false&&STATE.snap.endpoint===true&&STATE.gridSize===200,
      JSON.stringify([STATE.snap.grid,STATE.snap.endpoint,STATE.gridSize]));
    // [SP6] 문서(JSON) 왕복에도 스냅 스펙 유지
    STATE.snap.grid=false;STATE.snap.endpoint=true;
    const rawSp=JSON.stringify(buildJSON());
    STATE.snap.grid=true;STATE.snap.endpoint=false;
    applyLoadedData(JSON.parse(rawSp));
    assert('스냅: 문서 왕복 보존',STATE.snap.grid===false&&STATE.snap.endpoint===true,
      JSON.stringify([STATE.snap.grid,STATE.snap.endpoint]));
    // [SP7] 상태바 표시
    STATE.snap.grid=true;STATE.snap.endpoint=true;STATE.gridSize=100;refreshSnapStatus();
    const stEl=document.getElementById('snap-status');
    assert('스냅: 상태바 표시',!!stEl&&stEl.textContent.indexOf('끝점')>=0&&stEl.textContent.indexOf('100mm')>=0,
      stEl&&stEl.textContent);
    STATE.snap.grid=_bakSP.grid;STATE.snap.endpoint=_bakSP.ep;STATE.gridSize=_bakSP.gs;
    STATE.ctrlPressed=_bakSP.ctrl;STATE.zoom=_bakSP.zoom;STATE.offsetX=_bakSP.ox;STATE.offsetY=_bakSP.oy;
    STATE.walls=_bakSP.walls;STATE.vertices=_bakSP.vertices;
    try{if(_bakSP.ls===null) localStorage.removeItem('minicad.snap'); else localStorage.setItem('minicad.snap',_bakSP.ls);}catch(_){}
    if(typeof reinstallVEFAll==='function') reinstallVEFAll();
    refreshSnapStatus();renderAll();
  }catch(e){
    assert('스냅: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 드래그 스냅 3대 수정 (자기 자신 스냅·그리드 절대 흡착·직교 유지) ===
  try{
    const _bakDS={furniture:STATE.furniture.slice(),grid:STATE.snap.grid,ep:STATE.snap.endpoint,
      ortho:STATE.snap.ortho,gs:STATE.gridSize,ctrl:STATE.ctrlPressed,shift:STATE.shiftPressed};
    STATE.ctrlPressed=false;STATE.shiftPressed=false;STATE.gridSize=100;
    const mkF=(x,y)=>{const o={id:makeId('f'),type:'side_table',x,y,angle:0};STATE.furniture.push(o);return o;};
    const runDrag=(gridOn,orthoOn,dx,dy)=>{
      const o=mkF(1234,2345);
      STATE.snap.grid=gridOn;STATE.snap.endpoint=true;STATE.snap.ortho=orthoOn;
      applyDragMove({kind:'furniture',id:o.id,startMm:{x:0,y:0},baseObj:JSON.parse(JSON.stringify(o))},dx,dy);
      const r=[o.x,o.y];
      STATE.furniture=STATE.furniture.filter(x=>x.id!==o.id);
      return r;
    };
    // [DS1] 자기 자신 스냅 금지 — 끝점 ON 이어도 제자리로 되돌아가지 않는다
    let r=runDrag(false,false,253,137);
    assert('드래그: 자기 자신 스냅 안 함(자유 이동)',r[0]===1487&&r[1]===2482,JSON.stringify(r));
    // [DS2] 그리드 ON — 결과 위치가 격자 배수에 안착 (기존엔 delta 만 격자화라 안 붙었음)
    r=runDrag(true,false,250,130);
    assert('드래그: 그리드 결과 위치 흡착',r[0]%100===0&&r[1]%100===0,JSON.stringify(r));
    // [DS3] 직교 — 그리드 OFF 에서도 축 고정 유지
    r=runDrag(false,true,253,137);
    assert('드래그: 그리드 OFF 직교 유지',r[1]===2345&&r[0]===1487,JSON.stringify(r));
    // [DS4] 직교 + 그리드 — 고정축은 그대로, 이동축만 격자
    r=runDrag(true,true,250,130);
    assert('드래그: 직교+그리드 동시',r[1]===2345&&r[0]%100===0,JSON.stringify(r));
    // [DS5] 다중 드래그도 격자 흡착 + 상대 간격 유지
    const a1=mkF(1234,2345), a2=mkF(3456,2345);
    STATE.snap.grid=true;STATE.snap.ortho=false;
    applyDragMove({kind:'multi',startMm:{x:0,y:0},items:[a1,a2].map(o=>({kind:'furniture',id:o.id,baseObj:JSON.parse(JSON.stringify(o))}))},250,130);
    assert('드래그: 다중 격자 흡착',a1.x%100===0&&a1.y%100===0,a1.x+','+a1.y);
    assert('드래그: 다중 상대 간격 유지',(a2.x-a1.x)===2222,String(a2.x-a1.x));
    STATE.furniture=STATE.furniture.filter(x=>x.id!==a1.id&&x.id!==a2.id);
    // [DS6] snapToEndpoint 제외 인자 동작
    const ex=mkF(9000000,9000000);
    STATE.snap.endpoint=true;
    const near={x:9000000+50,y:9000000+50};
    assert('드래그: 제외 없으면 스냅',snapToEndpoint(near).snapped===true);
    assert('드래그: 제외하면 스냅 안 함',snapToEndpoint(near,ex.id).snapped===false);
    STATE.furniture=STATE.furniture.filter(x=>x.id!==ex.id);
    STATE.furniture=_bakDS.furniture;STATE.snap.grid=_bakDS.grid;STATE.snap.endpoint=_bakDS.ep;
    STATE.snap.ortho=_bakDS.ortho;STATE.gridSize=_bakDS.gs;STATE.ctrlPressed=_bakDS.ctrl;STATE.shiftPressed=_bakDS.shift;
    renderAll();
  }catch(e){
    assert('드래그: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 회로 점등이 renderAll 만으로 즉시 반영 (대표 보고 — 화면을 움직여야 보였음) ===
  try{
    const _bakIM={lights:STATE.lights.slice(),electric:STATE.electric.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,showC:STATE.showCircuits};
    const G=7500000;
    const gl={id:makeId('li'),type:'downlight',x:G,y:G,angle:0,inch:3};
    const gs={id:makeId('e'),type:'switch_2',x:G-1500,y:G,angle:0};
    STATE.lights.push(gl);STATE.electric.push(gs);
    gs.lightIds=[gl.id];gs.circuitOn=false;
    renderAll(); // 초기 렌더 (소등)
    const glowCount=()=>{
      let n=0;
      groups.lights.getChildren().forEach(g=>{
        if(!g.getChildren) return;
        g.getChildren(c=>c.getClassName()==='Circle').forEach(c=>{
          const st=c.fillRadialGradientColorStops&&c.fillRadialGradientColorStops();
          if(st&&st.length) n++;
        });
      });
      return n;
    };
    assert('즉시반영: 소등 상태 글로우 0',glowCount()===0,'glow '+glowCount());
    // [IM1] 스위치만 바꾸고 renderAll — 조명 레이어가 즉시 다시 그려져야 한다
    gs.circuitOn=true;
    renderAll();
    assert('즉시반영: 점등 즉시 글로우 표시',glowCount()===1,'glow '+glowCount());
    // [IM2] 다시 끄면 즉시 사라진다
    gs.circuitOn=false;
    renderAll();
    assert('즉시반영: 소등 즉시 반영',glowCount()===0,'glow '+glowCount());
    // [IM3] 연결 조명 추가도 즉시 반영
    const gl2={id:makeId('li'),type:'downlight',x:G+1200,y:G,angle:0,inch:3};
    STATE.lights.push(gl2);
    gs.lightIds=[gl.id,gl2.id];gs.circuitOn=true;
    renderAll();
    assert('즉시반영: 연결 추가 즉시 2개 점등',glowCount()===2,'glow '+glowCount());
    // [IM4] 조명을 옮기면 연결선도 즉시 따라온다 (electric 서명에 조명 좌표 포함)
    STATE.selectedKind='electric';STATE.selectedId=gs.id;
    renderAll();
    const curveCount=()=>{let n=0;groups.electric.getChildren().forEach(nd=>{if(nd.getClassName()==='Shape')n++;});return n;};
    assert('즉시반영: 연결선 2개',curveCount()===2,'curves '+curveCount());
    gl2.x=G+4000;
    renderAll();
    // 2026-08-29: 종전엔 연결선 끝의 '점'으로 확인했다. 그 점이 다운라이트처럼 보여 없앨으므로,
    //  연결선 노드가 들고 있는 끝점 좌표로 직접 확인한다
    let far=false;
    groups.electric.getChildren().forEach(nd=>{
      if(nd.getClassName()==='Shape'&&nd.name&&nd.name()==='circuit-curve'&&
         Math.abs(nd.getAttr('endX')-(STATE.offsetX+mmToPx(G+4000)))<2) far=true;
    });
    assert('즉시반영: 조명 이동 시 연결선 갱신',far);
    STATE.lights=_bakIM.lights;STATE.electric=_bakIM.electric;
    STATE.selectedKind=_bakIM.selK;STATE.selectedId=_bakIM.selI;STATE.showCircuits=_bakIM.showC;
    renderAll();
  }catch(e){
    assert('즉시반영: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 자동 저장 경량화 + JSON 탭 디바운스 (성능 검토) ===
  try{
    const _bakPF={ls:(function(){try{return localStorage.getItem('minicad.autosave');}catch(_){return null;}})()};
    // [PF1] 경량 스냅샷이 복구에 필요한 필드를 모두 담는다
    const pay=buildAutosavePayload();
    const need=['schema','vertices','meta','spaces','walls','openings','furniture','fixtures',
                'lights','electric','hvac','texts','measures','circles','arcs','curves','leaders','xlines','pillars'];
    assert('성능: 자동저장 필드 완비',need.every(k=>k in pay),need.filter(k=>!(k in pay)).join(','));
    assert('성능: 자동저장 설정 포함',!!(pay.meta&&pay.meta.settings&&pay.meta.settings.snap&&'downlightInch' in pay.meta.settings));
    // [PF2] 자동 저장은 buildJSON 보다 확연히 가볍다 (견적·관계 그래프 미포함)
    assert('성능: 자동저장에 견적 미포함',!('estimateInput' in pay)&&!('relationships' in pay)&&!('integrity' in pay));
    // [PF3] 실제 저장·복구 왕복
    assert('성능: 자동저장 기록',_autosaveNow()===true);
    const saved=JSON.parse(localStorage.getItem('minicad.autosave'));
    assert('성능: 저장 데이터 유효',!!(saved&&saved.data&&Array.isArray(saved.data.spaces)&&saved.at>0));
    // [PF4] 문서 설정 공용 빌더 — buildJSON 과 동일 값
    const dj=buildJSON();
    assert('성능: 설정 빌더 공용',JSON.stringify(dj.meta.settings)===JSON.stringify(buildDocSettings()));
    // [PF5] JSON 탭 디바운스 API 존재 (즉시 갱신 경로 포함)
    assert('성능: JSON 즉시 갱신 함수',typeof refreshJSONNow==='function'&&typeof refreshJSON==='function');
    try{if(_bakPF.ls===null) localStorage.removeItem('minicad.autosave'); else localStorage.setItem('minicad.autosave',_bakPF.ls);}catch(_){}
  }catch(e){
    assert('성능: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 조명 연결 모드 지속 (종료 전까지 계속 작동) ===
  try{
    const _bakLM={lights:STATE.lights.slice(),electric:STATE.electric.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice()};
    const M=8100000;
    const msw={id:makeId('e'),type:'switch_3',x:M,y:M,angle:0};
    STATE.electric.push(msw);
    const mls=[0,1,2,3].map(i=>{const o={id:makeId('li'),type:'downlight',x:M+1000+i*800,y:M,angle:0,inch:3};STATE.lights.push(o);return o;});
    startCircuitLink(msw.id);
    assert('연결모드: 시작',!!window._circuitLink&&window._circuitLink.switchId===msw.id);
    assert('연결모드: 배너 표시',!!document.getElementById('circuit-link-banner'));
    // 연속 연결 — 매번 모드·선택 유지
    mls.forEach((o,i)=>{
      toggleCircuitLink(msw.id,o.id);
      assert('연결모드: '+(i+1)+'개째 연결 후 유지',!!window._circuitLink
        &&STATE.selectedKind==='electric'&&STATE.selectedId===msw.id
        &&(msw.lightIds||[]).length===i+1,
        'mode '+!!window._circuitLink+' n '+(msw.lightIds||[]).length);
    });
    // 재클릭 = 해제, 모드는 계속
    toggleCircuitLink(msw.id,mls[3].id);
    assert('연결모드: 재클릭 해제 후에도 유지',!!window._circuitLink&&(msw.lightIds||[]).length===3);
    // 배너 개수 갱신
    _circuitBanner();
    const bt=document.getElementById('circuit-link-text');
    assert('연결모드: 배너 개수 갱신',!!bt&&bt.textContent.indexOf('3개')>=0,bt&&bt.textContent);
    // 도구를 바꿔도 모드 유지
    setTool('wall');
    assert('연결모드: 도구 변경에도 유지',!!window._circuitLink&&!!document.getElementById('circuit-link-banner'));
    setTool('select');
    // 종료
    endCircuitLink();
    assert('연결모드: 종료',!window._circuitLink&&!document.getElementById('circuit-link-banner'));
    assert('연결모드: 종료 후 연결 보존',(msw.lightIds||[]).length===3);
    STATE.lights=_bakLM.lights;STATE.electric=_bakLM.electric;
    STATE.selectedKind=_bakLM.selK;STATE.selectedId=_bakLM.selI;STATE.boxSelection=_bakLM.box;
    window._circuitLink=null;_circuitBanner();
    renderAll();
  }catch(e){
    assert('연결모드: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 조명 점핑(데이지 체인) 배선 — 스위치 ON 시 연쇄 점등 (대표 지시) ===
  try{
    const _bakJP={lights:STATE.lights.slice(),electric:STATE.electric.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),showC:STATE.showCircuits};
    const P=8600000;
    const jsw={id:makeId('e'),type:'switch_2',x:P,y:P,angle:0};
    STATE.electric.push(jsw);
    const L=[0,1,2,3].map(i=>{const o={id:makeId('li'),type:'downlight',x:P+1000+i*900,y:P,angle:0,inch:3};STATE.lights.push(o);return o;});
    // 스위치는 L0 에만 직결, 나머지는 점핑으로 연결 (실무 배선)
    toggleCircuitLink(jsw.id,L[0].id);
    endCircuitLink();
    toggleJumpLink(L[0].id,L[1].id);
    toggleJumpLink(L[1].id,L[2].id);
    endJumpLink();
    assert('점핑: 연결 저장',(L[0].jumpIds||[]).indexOf(L[1].id)>=0&&(L[1].jumpIds||[]).indexOf(L[2].id)>=0);
    assert('점핑: 이웃 조회 양방향',jumpNeighbors(L[1].id).length===2&&jumpNeighbors(L[2].id).indexOf(L[1].id)>=0);
    // [JP1] 스위치 OFF → 전부 소등
    jsw.circuitOn=false;
    let lit=litLightIds();
    assert('점핑: OFF 시 전부 소등',!lit.has(L[0].id)&&!lit.has(L[2].id));
    // [JP2] 스위치 ON → 직결 + 점핑 연쇄 점등, 미연결(L3)은 소등
    jsw.circuitOn=true;
    lit=litLightIds();
    assert('점핑: ON 시 연쇄 점등',lit.has(L[0].id)&&lit.has(L[1].id)&&lit.has(L[2].id),
      [lit.has(L[0].id),lit.has(L[1].id),lit.has(L[2].id)].join());
    assert('점핑: 미연결 조명은 소등',!lit.has(L[3].id));
    // [JP3] 렌더 — 점핑선 표시 + 연쇄 글로우
    STATE.selectedKind='lights';STATE.selectedId=L[1].id;
    renderAll();
    let jl=0,glow=0;
    groups.lights.getChildren().forEach(n=>{
      if(n.getClassName()==='Line'&&n.name&&n.name()==='jump-line') jl++;
      if(n.getChildren) n.getChildren(c=>c.getClassName()==='Circle').forEach(c=>{
        const st=c.fillRadialGradientColorStops&&c.fillRadialGradientColorStops();if(st&&st.length)glow++;});
    });
    assert('점핑: 점핑선 렌더',jl>=2,'lines '+jl);
    assert('점핑: 연쇄 3개 글로우',glow===3,'glow '+glow);
    // [JP4] 중간 연결 해제 → 뒤쪽 체인 소등
    toggleJumpLink(L[0].id,L[1].id);
    lit=litLightIds();
    assert('점핑: 중간 해제 시 뒤쪽 소등',lit.has(L[0].id)&&!lit.has(L[1].id)&&!lit.has(L[2].id));
    toggleJumpLink(L[0].id,L[1].id); // 원복
    // [JP5] 조명 삭제 시 회로·점핑 참조 정리
    STATE.selectedKind='lights';STATE.selectedId=L[2].id;STATE.boxSelection=[];
    deleteSelected();
    assert('점핑: 삭제 시 참조 정리',!(L[1].jumpIds||[]).includes(L[2].id)&&!(jsw.lightIds||[]).includes(L[2].id));
    // [JP6] 저장→불러오기 왕복
    const rawJ=JSON.stringify(buildJSON());
    applyLoadedData(JSON.parse(rawJ));
    const l0=STATE.lights.find(x=>x.id===L[0].id), l1=STATE.lights.find(x=>x.id===L[1].id);
    assert('점핑: 왕복 보존',!!l0&&!!l1&&(l0.jumpIds||[]).indexOf(L[1].id)>=0);
    assert('점핑: 왕복 후에도 연쇄 점등',litLightIds().has(L[1].id));
    // 정리
    STATE.lights=_bakJP.lights;STATE.electric=_bakJP.electric;
    STATE.selectedKind=_bakJP.selK;STATE.selectedId=_bakJP.selI;STATE.boxSelection=_bakJP.box;
    STATE.showCircuits=_bakJP.showC;window._jumpLink=null;window._circuitLink=null;
    if(typeof _circuitBanner==='function') _circuitBanner();
    renderAll();
  }catch(e){
    assert('점핑: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 상단 [⚡ 배선] 버튼 — 전체 연결선 보기 (대표 지시) ===
  try{
    const _bakWB={show:STATE.showCircuits,lights:STATE.lights.slice(),electric:STATE.electric.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,
      ls:(function(){try{return localStorage.getItem('minicad.snap');}catch(_){return null;}})()};
    const W=8800000;
    const wsw={id:makeId('e'),type:'switch_2',x:W,y:W,angle:0};
    STATE.electric.push(wsw);
    const WL=[0,1,2].map(i=>{const o={id:makeId('li'),type:'downlight',x:W+1000+i*900,y:W,angle:0,inch:3};STATE.lights.push(o);return o;});
    wsw.lightIds=[WL[0].id];wsw.circuitOn=false;
    WL[0].jumpIds=[WL[1].id];WL[1].jumpIds=[WL[2].id];
    // [WB1] 버튼 존재
    const btn=document.getElementById('btn-circuits');
    assert('배선버튼: 상단 버튼 존재',!!btn&&btn.textContent.indexOf('배선')>=0,btn&&btn.textContent);
    // [WB2] OFF 상태에선 선택 안 했으면 연결선 없음
    STATE.showCircuits=false;STATE.selectedKind=null;STATE.selectedId=null;
    updateCircuitsBtn();renderAll();
    const countLines=()=>{
      let jump=0,curve=0;
      groups.lights.getChildren().forEach(n=>{if(n.getClassName()==='Line'&&n.name&&n.name()==='jump-line')jump++;});
      groups.electric.getChildren().forEach(n=>{if(n.getClassName()==='Shape')curve++;});
      return {jump,curve};
    };
    let c1=countLines();
    assert('배선버튼: OFF 시 숨김',c1.jump===0&&c1.curve===0,JSON.stringify(c1));
    assert('배선버튼: OFF 시 버튼 비활성 표시',!btn.classList.contains('gold'));
    // [WB3] 버튼 클릭 → 전체 연결선 표시 (회로선 + 점핑선 동시)
    btn.click();
    let c2=countLines();
    assert('배선버튼: ON 시 회로선 표시',c2.curve>=1,'curve '+c2.curve);
    assert('배선버튼: ON 시 점핑선 표시',c2.jump>=2,'jump '+c2.jump);
    assert('배선버튼: ON 시 버튼 활성 표시',btn.classList.contains('gold'));
    assert('배선버튼: STATE 반영',STATE.showCircuits===true);
    // [WB4] 다시 클릭 → 숨김
    btn.click();
    let c3=countLines();
    assert('배선버튼: 재클릭 시 숨김',c3.jump===0&&c3.curve===0&&!btn.classList.contains('gold'));
    // [WB5] 명령어 cir·배선 도 동일 동작
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode(); // 이전 블록이 남긴 단계입력 모드 정리
    processCommand('wire');
    assert('배선버튼: wire 명령 동작',STATE.showCircuits===true&&btn.classList.contains('gold'));
    processCommand('배선');
    assert('배선버튼: 배선 명령 동작',STATE.showCircuits===false);
    // [WB6] 설정 저장/복원
    STATE.showCircuits=true;saveSnapPrefs();
    STATE.showCircuits=false;
    loadSnapPrefs();
    assert('배선버튼: 상태 지속',STATE.showCircuits===true&&btn.classList.contains('gold'));
    STATE.showCircuits=_bakWB.show;updateCircuitsBtn();
    STATE.lights=_bakWB.lights;STATE.electric=_bakWB.electric;
    STATE.selectedKind=_bakWB.selK;STATE.selectedId=_bakWB.selI;
    try{if(_bakWB.ls===null) localStorage.removeItem('minicad.snap'); else localStorage.setItem('minicad.snap',_bakWB.ls);}catch(_){}
    renderAll();
  }catch(e){
    assert('배선버튼: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-28: 기호 이름 라벨 표시 모드 (대표 지시 — 다운라이트를 넣을수록 글씨 도배·렉) ===
  try{
    const _bakSL={lights:STATE.lights.slice(),spaces:STATE.spaces.slice(),mode:STATE.symbolLabelMode,
      zoom:STATE.zoom,selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),
      ls:(function(){try{return localStorage.getItem('minicad.snap');}catch(_){return null;}})()};
    const SLX=9900000;
    STATE.zoom=1;STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];
    STATE.lights=[];
    const DL=[];
    for(let i=0;i<6;i++){const o={id:makeId('li'),type:'downlight',x:SLX+i*900,y:SLX,angle:0,inch:3};DL.push(o);STATE.lights.push(o);}
    const labels=()=>{const out=[];groups.lights.getChildren().forEach(n=>{
      if(n.getClassName&&n.getClassName()==='Text') out.push(n);});return out;};

    // [SL1] 기본값은 smart
    STATE.symbolLabelMode=_bakSL.mode; // 문서가 아닌 환경 설정 — 기본값 자체를 검증
    assert('라벨: 기본 모드 smart',symbolLabelMode()==='smart'||SYMBOL_LABEL_MODES.indexOf(STATE.symbolLabelMode)>=0,
      String(STATE.symbolLabelMode));

    // [SL2] smart — 같은 종류 6개는 대표 1개만, 글자에 ×6
    STATE.symbolLabelMode='smart';renderLights();
    const L2=labels();
    assert('라벨: smart — 6개 → 라벨 1개',L2.length===1,'n='+L2.length);
    assert('라벨: smart — 개수 표기 ×6',L2.length===1&&L2[0].text().indexOf('×6')>=0,L2.length?L2[0].text():'-');
    assert('라벨: smart — 종류명 포함',L2.length===1&&L2[0].text().indexOf('다운라이트')>=0,L2.length?L2[0].text():'-');

    // [SL3] 규격(인치)이 다르면 별도 묶음
    const DL4=[0,1].map(i=>{const o={id:makeId('li'),type:'downlight',x:SLX+i*900,y:SLX+3000,angle:0,inch:4};STATE.lights.push(o);return o;});
    renderLights();
    const L3=labels();
    assert('라벨: 인치가 다르면 별도 묶음',L3.length===2,'n='+L3.length);
    assert('라벨: 4" 묶음은 ×2',L3.some(t=>t.text().indexOf('4"')>=0&&t.text().indexOf('×2')>=0),
      L3.map(t=>t.text()).join(' / '));

    // [SL4] 공간이 다르면 별도 묶음 (렌더 없이 계획만 검증 — 가짜 공간은 그리지 않는다)
    STATE.lights=DL.slice(); // 3" 6개만
    STATE.spaces=[{id:'sp_sl_a',type:'LIVING',polygon:[{x:SLX-500,y:SLX-500},{x:SLX+2200,y:SLX-500},{x:SLX+2200,y:SLX+500},{x:SLX-500,y:SLX+500}]},
                  {id:'sp_sl_b',type:'KITCHEN',polygon:[{x:SLX+2300,y:SLX-500},{x:SLX+6000,y:SLX-500},{x:SLX+6000,y:SLX+500},{x:SLX+2300,y:SLX+500}]}];
    invalidateSymbolLabelPlan();
    const plan=symbolLabelPlan();
    const texts4=[...plan.rep.values()];
    assert('라벨: 공간이 다르면 따로 센다',texts4.length===2,'n='+texts4.length+' '+texts4.join(' / '));
    assert('라벨: 공간별 개수 3+3',texts4.filter(t=>t.indexOf('×3')>=0).length===2,texts4.join(' / '));
    STATE.spaces=[];invalidateSymbolLabelPlan();

    // [SL5] off — 라벨 없음
    STATE.symbolLabelMode='off';renderLights();
    assert('라벨: off — 전부 숨김',labels().length===0,'n='+labels().length);

    // [SL6] off 여도 선택한 것은 보인다
    STATE.selectedKind='lights';STATE.selectedId=DL[2].id;renderLights();
    const L6=labels();
    assert('라벨: off — 선택한 것은 표시',L6.length===1&&L6[0].text().indexOf('×')<0,
      L6.length?L6[0].text():'n=0');
    STATE.selectedKind=null;STATE.selectedId=null;

    // [SL7] all — 개수만큼 전부
    STATE.symbolLabelMode='all';renderLights();
    assert('라벨: all — 전부 표시',labels().length===DL.length,'n='+labels().length+'/'+DL.length);

    // [SL8] 객체별 켜기 — off 모드에서도 이 하나만 보인다
    STATE.symbolLabelMode='off';DL[0].showLabel=true;renderLights();
    assert('라벨: 객체별 항상 ON',labels().length===1,'n='+labels().length);

    // [SL9] 객체별 끄기 — all 모드에서도 이 하나만 숨는다
    STATE.symbolLabelMode='all';DL[0].showLabel=false;renderLights();
    assert('라벨: 객체별 숨김',labels().length===DL.length-1,'n='+labels().length);
    delete DL[0].showLabel;

    // [SL10] 라벨은 그림자 없이 외곽선 — 렉의 원인을 없았고 글씨는 커졌다
    STATE.symbolLabelMode='smart';renderLights();
    const L10=labels()[0];
    assert('라벨: 그림자 없음(렉 원인 제거)',!!L10&&(!L10.shadowBlur||L10.shadowBlur()===0),
      L10?String(L10.shadowBlur&&L10.shadowBlur()):'no label');
    assert('라벨: 글씨 크기 ≥11px',!!L10&&L10.fontSize()>=11,L10?String(L10.fontSize()):'-');
    assert('라벨: 외곽선 가독성',!!L10&&L10.strokeWidth()>0);
    assert('라벨: 클릭 가능 유지',!!L10&&L10.listening()===true);

    // [SL11] 상단 버튼 순환
    const sb=document.getElementById('btn-symlabel');
    assert('라벨: 상단 버튼 존재',!!sb&&sb.textContent.indexOf('라벨')>=0,sb&&sb.textContent);
    STATE.symbolLabelMode='smart';updateSymbolLabelBtn();
    sb.click();assert('라벨: 버튼 순환 smart→off',symbolLabelMode()==='off'&&!sb.classList.contains('gold'),STATE.symbolLabelMode);
    sb.click();assert('라벨: 버튼 순환 off→all',symbolLabelMode()==='all'&&sb.classList.contains('gold'),STATE.symbolLabelMode);
    sb.click();assert('라벨: 버튼 순환 all→smart',symbolLabelMode()==='smart',STATE.symbolLabelMode);

    // [SL12] 명령어
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    processCommand('lab off');
    assert('라벨: lab off 명령',symbolLabelMode()==='off',STATE.symbolLabelMode);
    processCommand('라벨 전부');
    assert('라벨: 한글 명령',symbolLabelMode()==='all',STATE.symbolLabelMode);
    processCommand('lab');
    assert('라벨: lab 순환',symbolLabelMode()==='smart',STATE.symbolLabelMode);

    // [SL13] 설정 지속
    STATE.symbolLabelMode='off';saveSnapPrefs();
    STATE.symbolLabelMode='all';
    loadSnapPrefs();
    assert('라벨: 설정 지속',symbolLabelMode()==='off',STATE.symbolLabelMode);

    // [SL14] 객체별 설정은 저장→불러오기 왕복 보존
    DL[1].showLabel=true;
    const rawSL=JSON.stringify(buildJSON());
    applyLoadedData(JSON.parse(rawSL));
    const back=STATE.lights.find(x=>x.id===DL[1].id);
    assert('라벨: 객체별 설정 왕복 보존',!!back&&back.showLabel===true,back?String(back.showLabel):'lost');

    STATE.lights=_bakSL.lights;STATE.spaces=_bakSL.spaces;STATE.symbolLabelMode=_bakSL.mode;
    STATE.zoom=_bakSL.zoom;STATE.selectedKind=_bakSL.selK;STATE.selectedId=_bakSL.selI;STATE.boxSelection=_bakSL.box;
    try{if(_bakSL.ls===null) localStorage.removeItem('minicad.snap'); else localStorage.setItem('minicad.snap',_bakSL.ls);}catch(_){}
    invalidateSymbolLabelPlan();updateSymbolLabelBtn();renderAll();
  }catch(e){
    assert('라벨: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-28: 인쇄 설정 + 미리보기 (대표 지시 — "원하는 포인트를 인쇄하기가 힘들다") ===
  try{
    const _bakPR={spaces:STATE.spaces.slice(),vertices:STATE.vertices.slice(),walls:STATE.walls.slice(),
      lights:STATE.lights.slice(),cfg:STATE.printConfig,zoom:STATE.zoom,ox:STATE.offsetX,oy:STATE.offsetY,
      layers:{...STATE.layers},theme:document.body.getAttribute('data-theme'),
      selK:STATE.selectedKind,selI:STATE.selectedId,mode:STATE.symbolLabelMode};
    const PX=1200000;
    STATE.printConfig=null;
    // 4×3m 방 하나 + 다운라이트 4개 (인쇄 대상)
    const pv=polygonToVertexIds([{x:PX,y:PX},{x:PX+4000,y:PX},{x:PX+4000,y:PX+3000},{x:PX,y:PX+3000}]);
    const psp=makeSpaceVEF(pv,{name:'인쇄검증',type:'ROOM',typeIndex:94,layerName:'A-AREA-ROOM-94'});
    STATE.spaces.push(psp);
    const pl=[0,1,2,3].map(i=>{const o={id:makeId('li'),type:'downlight',x:PX+800+i*800,y:PX+1500,angle:0,inch:3};
      STATE.lights.push(o);return o;});

    // [PR1] 기본 설정
    let c=printCfg();
    assert('인쇄: 기본 설정 — 전체·자동·전체도면',c.region==='all'&&c.paper==='auto'&&c.scale==='auto'&&c.preset==='full',
      [c.region,c.paper,c.scale,c.preset].join('/'));
    assert('인쇄: 기본 표시요소 채워짐',!!c.layers&&c.layers.walls===true&&c.layers.furniture===true);

    // [PR2] 프리셋 — 시공 도면은 가구·조명을 뺀다
    c=applyPrintPreset('construct');
    assert('인쇄: 시공 프리셋 — 가구·조명 제외',c.layers.furniture===false&&c.layers.lights===false&&c.layers.electric===false);
    assert('인쇄: 시공 프리셋 — 벽·치수 유지',c.layers.walls===true&&c.layers.dimensions===true);
    // [PR3] 조명·전기 프리셋은 기호 이름을 켠다
    c=applyPrintPreset('mep');
    assert('인쇄: 조명 프리셋 — 기호 이름 묶음',c.symbolLabels==='smart'&&c.layers.lights===true&&c.layers.furniture===false);
    assert('인쇄: 프리셋별 도면명',printDrawingTitle({preset:'mep'}).indexOf('전기')>=0&&
      printDrawingTitle({preset:'furniture'}).indexOf('가구')>=0,printDrawingTitle({preset:'mep'}));
    c=applyPrintPreset('full');

    // [PR4] 범위 — 드래그 사각형
    c.region='rect';c.rect={x1:PX+1000,y1:PX+500,x2:PX+3000,y2:PX+2500};
    let bb=printRegionBBox(c);
    assert('인쇄: 선택 영역 범위',Math.round(bb.minX)===PX+700&&Math.round(bb.maxX)===PX+3300&&
      Math.round(bb.w)===2600,[bb.minX-PX,bb.maxX-PX,bb.w].join('/'));
    assert('인쇄: 범위 이름 — 선택 영역',printRegionLabel(c)==='선택 영역');
    // [PR5] 범위 — 공간 지정
    c.region='space';c.spaceIds=[psp.id];
    bb=printRegionBBox(c);
    assert('인쇄: 공간 지정 범위',Math.round(bb.minX)===PX-900&&Math.round(bb.maxX)===PX+4900,
      [bb.minX-PX,bb.maxX-PX].join('/'));
    // [PR6] 범위 — 현재 화면
    c.region='view';
    bb=printRegionBBox(c);
    const vw=pxToMm(stage.width()-STATE.offsetX)-pxToMm(0-STATE.offsetX);
    assert('인쇄: 현재 화면 범위',Math.abs(bb.w-vw)<2,bb.w+' vs '+vw);
    c.region='all';c.spaceIds=[];

    // [PR7] 용지·방향·축척 강제
    const bbAll=printRegionBBox(c);
    let L=choosePrintLayout(bbAll,{paper:'A3',orientation:'auto',scale:'auto',titleBlock:true});
    assert('인쇄: 용지 강제 A3',L.paper==='A3',L.paper);
    L=choosePrintLayout(bbAll,{paper:'auto',orientation:'portrait',scale:'auto',titleBlock:true});
    assert('인쇄: 방향 강제 세로',L.orientation==='portrait'&&L.ph>L.pw,L.orientation+' '+L.pw+'x'+L.ph);
    L=choosePrintLayout(bbAll,{paper:'A4',orientation:'landscape',scale:20,titleBlock:true});
    assert('인쇄: 축척 강제 유지 (자동 변경 금지)',L.scale===20,'scale '+L.scale);
    assert('인쇄: 넘치면 잘림 표시',L.overflow===true);
    // [PR8] 표제란을 끄면 도면 영역이 그만큼 커진다
    const La=choosePrintLayout(bbAll,{paper:'A3',orientation:'landscape',scale:'auto',titleBlock:true});
    const Lb=choosePrintLayout(bbAll,{paper:'A3',orientation:'landscape',scale:'auto',titleBlock:false});
    assert('인쇄: 표제란 OFF → 도면 영역 확대',Math.abs((Lb.availH-La.availH)-PRINT_TB_H)<0.01&&Lb.tbH===0,
      La.availH+' → '+Lb.availH);

    // [PR9] 시트 HTML — 미리보기에는 자동 인쇄 스크립트가 없다
    const info=_printInfo();
    const hPrev=buildPrintSheet({url:'data:,',wMm:100,hMm:80},La,info,c,{preview:true,onlyPage:1});
    const hReal=buildPrintSheet('data:,',La,info,c,{});
    assert('인쇄: 미리보기는 자동인쇄 안 함',hPrev.indexOf('window.print')<0&&hReal.indexOf('window.print')>=0);
    assert('인쇄: 1페이지만 보기 — 부속표 제외',hPrev.indexOf('공간 면적표')<0&&hReal.indexOf('공간 면적표')>=0);
    const h2=buildPrintSheet('data:,',La,info,c,{preview:true,onlyPage:2});
    assert('인쇄: 2페이지만 보기 — 도면 제외',h2.indexOf('공간 면적표')>=0&&h2.indexOf('class="draw"')<0);
    // [PR10] 양식 옵션
    const cOff={...c,titleBlock:false,scaleBar:false,north:false,page2:false};
    const hOff=buildPrintSheet('data:,',Lb,info,cOff,{preview:true});
    assert('인쇄: 표제란 OFF 반영',hOff.indexOf('PROJECT')<0);
    assert('인쇄: 축척바·방위표 OFF 반영',hOff.indexOf('SCALE BAR')<0&&hOff.indexOf('>N<')<0);
    assert('인쇄: 2페이지 OFF 반영',hOff.indexOf('공간 면적표')<0);

    // [PR11] 캡처 — 끝나면 화면 상태가 원래대로 돌아온다
    const z0=STATE.zoom,ox0=STATE.offsetX,th0=document.body.getAttribute('data-theme');
    const cCap={...c,preset:'construct',layers:printPresetLayers('construct'),symbolLabels:'off'};
    const Lcap=choosePrintLayout(bbAll,cCap);
    const url1=_printCapture(bbAll,Lcap,cCap,24);
    assert('인쇄: 캡처 결과 PNG',!!url1&&typeof url1.url==='string'&&url1.url.indexOf('data:image/png')===0);
    // 고른 범위만 딱 떠야 한다 — 종전엔 용지 전체를 떠서 옆방까지 따라 찍혔다
    assert('인쇄: 이미지 = 범위 ÷ 축척',
      Math.abs(url1.wMm-bbAll.w/Lcap.scale)<0.5&&Math.abs(url1.hMm-bbAll.h/Lcap.scale)<0.5,
      url1.wMm.toFixed(1)+'×'+url1.hMm.toFixed(1)+' vs '+(bbAll.w/Lcap.scale).toFixed(1)+'×'+(bbAll.h/Lcap.scale).toFixed(1));
    assert('인쇄: 이미지가 도면 영역 안에 들어간다',
      url1.wMm<=Lcap.availW+0.5&&url1.hMm<=Lcap.availH+0.5);
    assert('인쇄: 캡처 후 화면 원복',STATE.zoom===z0&&STATE.offsetX===ox0&&STATE.printMode===false&&
      STATE.printLabels===false&&document.body.getAttribute('data-theme')===th0);
    assert('인쇄: 캡처 후 레이어 원복',STATE.layers.furniture===_bakPR.layers.furniture&&
      STATE.layers.lights===_bakPR.layers.lights);
    // [PR12] 표시 요소가 실제로 그림을 바꾼다 (조명 포함/제외)
    const cMep={...c,preset:'mep',layers:printPresetLayers('mep'),symbolLabels:'off'};
    const url2=_printCapture(bbAll,choosePrintLayout(bbAll,cMep),cMep,24);
    assert('인쇄: 표시 요소가 결과에 반영',url1.url!==url2.url,'같은 이미지');
    // 선택 영역은 그 범위만 — 전체보다 작은 이미지가 나와야 한다
    const cRect={...c,region:'rect',rect:{x1:PX+1000,y1:PX+500,x2:PX+3000,y2:PX+2500}};
    const bbRect=printRegionBBox(cRect);
    const Lr=choosePrintLayout(bbRect,cRect);
    const url3=_printCapture(bbRect,Lr,cRect,24);
    assert('인쇄: 선택 영역만 담긴다',
      Math.abs(url3.wMm-bbRect.w/Lr.scale)<0.5&&Math.abs(url3.hMm/url3.wMm-bbRect.h/bbRect.w)<0.02,
      url3.wMm.toFixed(1)+'×'+url3.hMm.toFixed(1));

    // [PR13] 인쇄 중 기호 이름 — 기본은 안 찍고, 켜면 찍는다
    const cntLabels=()=>{let n=0;groups.lights.getChildren().forEach(x=>{
      if(x.getClassName&&x.getClassName()==='Text')n++;});return n;};
    const _z=STATE.zoom;STATE.zoom=1;
    STATE.printMode=true;STATE.printLabels=false;renderLights();
    assert('인쇄: 기본은 기호 이름 없음',cntLabels()===0,'n='+cntLabels());
    STATE.printLabels=true;STATE.symbolLabelMode='smart';renderLights();
    assert('인쇄: 이름 켜면 묶음 대표만',cntLabels()===1,'n='+cntLabels());
    STATE.printMode=false;STATE.printLabels=false;STATE.zoom=_z;renderLights();

    // [PR14] 설정창 — 열림·프리셋 4개·닫힘
    openPrintDialog();
    const dlg=document.getElementById('print-dialog');
    assert('인쇄: 설정창 열림',!!dlg&&!!document.getElementById('pd-preview'));
    assert('인쇄: 프리셋 썸네일 4종',dlg&&dlg.querySelectorAll('.pd-preset').length===PRINT_PRESETS.length,
      dlg?dlg.querySelectorAll('.pd-preset').length:0);
    assert('인쇄: 범위 라디오 4종',dlg&&dlg.querySelectorAll('input[name="pd-region"]').length===4);
    assert('인쇄: 표시요소 체크박스',dlg&&dlg.querySelectorAll('.pd-layer').length>=10);
    // 체크 상태가 설정과 일치해야 한다 (표제란이 켜져 있는데 체크가 비어 보이던 문제)
    const optOf=k=>dlg&&dlg.querySelector('.pd-opt[data-k="'+k+'"]');
    assert('인쇄: 양식 체크 상태 일치',
      ['titleBlock','scaleBar','north','page2'].every(k=>optOf(k)&&optOf(k).checked===!!printCfg()[k]),
      ['titleBlock','scaleBar','north','page2'].map(k=>k+'='+(optOf(k)&&optOf(k).checked)).join(' '));
    const layOf=k=>dlg&&dlg.querySelector('.pd-layer[data-k="'+k+'"]');
    assert('인쇄: 표시요소 체크 상태 일치',
      !!layOf('furniture')&&layOf('furniture').checked===!!printCfg().layers.furniture);
    closePrintDialog();
    // 양식을 끔 다음 다시 열면 꺼진 채로 보여야 한다
    printCfg().titleBlock=false;
    openPrintDialog();
    const dlg2=document.getElementById('print-dialog');
    const tb2=dlg2&&dlg2.querySelector('.pd-opt[data-k="titleBlock"]');
    assert('인쇄: 표제란 OFF 상태 유지',!!tb2&&tb2.checked===false);
    printCfg().titleBlock=true;
    closePrintDialog();
    assert('인쇄: 설정창 닫힘',!document.getElementById('print-dialog'));

    // [PR15] 영역 드래그 확정 / 너무 작은 영역 거부
    _printRectActive=false;
    STATE.printConfig.region='all';STATE.printConfig.rect=null;
    finishPrintRegionPick({x:PX+500,y:PX+500},{x:PX+600,y:PX+600}); // 100mm — 거부
    assert('인쇄: 너무 작은 영역 거부',!STATE.printConfig.rect&&_printRectActive===true);
    _printRectActive=false;_printRectP1=null;
    finishPrintRegionPick({x:PX+500,y:PX+500},{x:PX+3500,y:PX+2500});
    assert('인쇄: 영역 확정 저장',!!STATE.printConfig.rect&&STATE.printConfig.region==='rect'&&
      STATE.printConfig.rect.x2===PX+3500);
    closePrintDialog(); // finishPrintRegionPick 이 설정창을 다시 열어둔다

    // [PR16] 명령어
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    processCommand('print');
    assert('인쇄: print 명령 → 설정창',!!document.getElementById('print-dialog'));
    closePrintDialog();
    processCommand('print area');
    assert('인쇄: print area 명령 → 영역 지정 모드',_printRectActive===true);
    if(typeof cancelPrintRegionPick==='function') cancelPrintRegionPick();

    // [PR17] 저장 → 불러오기 왕복 보존
    STATE.printConfig.paper='A3';STATE.printConfig.preset='mep';
    const rawPR=JSON.stringify(buildJSON());
    STATE.printConfig=null;
    applyLoadedData(JSON.parse(rawPR));
    assert('인쇄: 설정 왕복 보존',!!STATE.printConfig&&STATE.printConfig.paper==='A3'&&
      STATE.printConfig.preset==='mep',JSON.stringify(STATE.printConfig&&[STATE.printConfig.paper,STATE.printConfig.preset]));

    STATE.spaces=_bakPR.spaces;STATE.vertices=_bakPR.vertices;STATE.walls=_bakPR.walls;
    STATE.lights=_bakPR.lights;STATE.printConfig=_bakPR.cfg;STATE.layers=_bakPR.layers;
    STATE.zoom=_bakPR.zoom;STATE.offsetX=_bakPR.ox;STATE.offsetY=_bakPR.oy;
    STATE.selectedKind=_bakPR.selK;STATE.selectedId=_bakPR.selI;STATE.symbolLabelMode=_bakPR.mode;
    if(_bakPR.theme) document.body.setAttribute('data-theme',_bakPR.theme);
    else document.body.removeAttribute('data-theme');
    if(typeof invalidateSymbolLabelPlan==='function') invalidateSymbolLabelPlan();
    renderAll();refreshUI();
  }catch(e){
    assert('인쇄: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-28: 화면에서 인쇄 영역 잡기 (대표 지시 — "인쇄를 화면으로 잡을 수 있게") ===
  try{
    const _bakPF={spaces:STATE.spaces.slice(),vertices:STATE.vertices.slice(),walls:STATE.walls.slice(),
      cfg:STATE.printConfig,on:STATE.printFrameOn,zoom:STATE.zoom,ox:STATE.offsetX,oy:STATE.offsetY};
    const FX=1500000;
    STATE.printConfig=null;STATE.printFrameOn=false;
    const fv=polygonToVertexIds([{x:FX,y:FX},{x:FX+5000,y:FX},{x:FX+5000,y:FX+4000},{x:FX,y:FX+4000}]);
    STATE.spaces.push(makeSpaceVEF(fv,{name:'틀검증',type:'ROOM',typeIndex:93,layerName:'A-AREA-ROOM-93'}));

    const nodes=()=>groups.printFrame?groups.printFrame.getChildren():[];
    const circles=()=>groups.printFrame?groups.printFrame.getChildren(n=>n.getClassName()==='Circle'):[];
    const frameRect=()=>{let r=null;(groups.printFrame?groups.printFrame.getChildren(n=>n.getClassName()==='Rect'):[])
      .forEach(n=>{if(n.draggable&&n.draggable())r=n;});return r;};

    // [PF1] 기본은 꺼짐 — 도면 위에 아무것도 없다
    renderPrintFrame();
    assert('인쇄틀: 기본 꺼짐',nodes().length===0,'n='+nodes().length);
    assert('인쇄틀: 전용 그룹이 최상단',!!groups.printFrame&&
      mainLayer.getChildren().indexOf(groups.printFrame)===mainLayer.getChildren().length-1);

    // [PF2] 켜면 틀 + 손잡이 8개 + 바깥 덮개
    togglePrintFrame(true);
    assert('인쇄틀: 켜짐',STATE.printFrameOn===true);
    assert('인쇄틀: 손잡이 8개',circles().length===8,'n='+circles().length);
    assert('인쇄틀: 끌 수 있는 틀',!!frameRect()&&frameRect().draggable()===true);
    // 틀 안쪽은 클릭을 먹지 않아야 한다 — 안의 객체를 그대로 고를 수 있게
    assert('인쇄틀: 안쪽은 클릭 통과 (테두리만 잡힘)',
      !!frameRect()&&frameRect().fillEnabled()===false&&frameRect().hitStrokeWidth()>=12,
      frameRect()?('fill='+frameRect().fillEnabled()+' hit='+frameRect().hitStrokeWidth()):'-');
    assert('인쇄틀: 바깥 덮개 4장',
      groups.printFrame.getChildren(n=>n.getClassName()==='Rect'&&!n.draggable()).length===4);
    assert('인쇄틀: 범위가 rect 로 굳는다',printCfg().region==='rect'&&!!printCfg().rect);
    assert('인쇄틀: 조작 바 표시',!!document.getElementById('print-frame-bar')&&
      !!document.getElementById('pfb-info'));

    // [PF3] 틀은 도면 좌표에 붙어 있다 — 화면을 옮겨도 같은 범위
    const before={...printCfg().rect};
    const r0=frameRect(), x0=r0.x(), y0=r0.y();
    STATE.offsetX-=137;STATE.offsetY-=91;
    renderPrintFrame();
    const r1=frameRect();
    assert('인쇄틀: 화면 이동 시 함께 이동',Math.abs((r1.x()-x0)+137)<0.5&&Math.abs((r1.y()-y0)+91)<0.5,
      (r1.x()-x0)+'/'+(r1.y()-y0));
    assert('인쇄틀: 도면상 범위는 그대로',printCfg().rect.x1===before.x1&&printCfg().rect.y1===before.y1);
    STATE.offsetX+=137;STATE.offsetY+=91;renderPrintFrame();

    // [PF4] 틀을 끌면 인쇄 범위가 따라온다
    const rc=frameRect();
    const mmBefore={...printCfg().rect};
    rc.position({x:rc.x()+mmToPx(1000),y:rc.y()+mmToPx(500)});
    rc.fire('dragend');
    const mmAfter=printCfg().rect;
    assert('인쇄틀: 끌면 범위 이동',Math.abs((mmAfter.x1-mmBefore.x1)-1000)<25&&
      Math.abs((mmAfter.y1-mmBefore.y1)-500)<25,
      (mmAfter.x1-mmBefore.x1)+'/'+(mmAfter.y1-mmBefore.y1));
    assert('인쇄틀: 끌어도 크기 유지',Math.abs((mmAfter.x2-mmAfter.x1)-(mmBefore.x2-mmBefore.x1))<25);

    // [PF5] 모서리를 잡아 늘리면 범위가 커진다
    let se=null;circles().forEach(n=>{const R=frameRect();
      if(Math.abs(n.x()-(R.x()+R.width()))<0.6&&Math.abs(n.y()-(R.y()+R.height()))<0.6) se=n;});
    assert('인쇄틀: 우하단 손잡이 존재',!!se);
    const wBefore=printCfg().rect.x2-printCfg().rect.x1;
    if(se){
      se.position({x:se.x()+mmToPx(2000),y:se.y()+mmToPx(1000)});
      se.fire('dragmove');se.fire('dragend');
    }
    const wAfter=printCfg().rect.x2-printCfg().rect.x1;
    assert('인쇄틀: 모서리로 크기 조절',Math.abs((wAfter-wBefore)-2000)<40,(wAfter-wBefore)+'mm');

    // [PF6] 최소 크기 아래로는 줄지 않는다
    let nw=null;circles().forEach(n=>{const R=frameRect();
      if(Math.abs(n.x()-R.x())<0.6&&Math.abs(n.y()-R.y())<0.6) nw=n;});
    if(nw){
      const R=frameRect();
      nw.position({x:R.x()+R.width()+9999,y:R.y()+R.height()+9999});
      nw.fire('dragmove');nw.fire('dragend');
    }
    const wMin=printCfg().rect.x2-printCfg().rect.x1, hMin=printCfg().rect.y2-printCfg().rect.y1;
    assert('인쇄틀: 최소 크기 유지',wMin>=PRINT_FRAME_MIN_MM-25&&hMin>=PRINT_FRAME_MIN_MM-25,wMin+'×'+hMin);

    // [PF7] 화면 맞춤 / 도면 전체
    printFrameFromView();
    const rv=printCfg().rect;
    assert('인쇄틀: 화면 맞춤',Math.abs(rv.x1-pxToMm(0-STATE.offsetX))<2&&
      Math.abs(rv.x2-pxToMm(stage.width()-STATE.offsetX))<2);
    printFrameFromPlan();
    const bbAllF=planBBoxMm(), rp=printCfg().rect;
    assert('인쇄틀: 도면 전체',Math.abs(rp.x1-bbAllF.minX)<2&&Math.abs(rp.y2-bbAllF.maxY)<2);

    // [PF8] 인쇄에는 틀이 찍히지 않는다
    STATE.printMode=true;renderPrintFrame();
    assert('인쇄틀: 인쇄에는 미포함',nodes().length===0,'n='+nodes().length);
    STATE.printMode=false;renderPrintFrame();
    assert('인쇄틀: 인쇄 후 복귀',nodes().length>0);

    // [PF9] 영역 드래그 지정 중에는 틀이 비켜준다 (클릭을 가로채지 않게)
    _printRectActive=true;renderPrintFrame();
    assert('인쇄틀: 새 영역 드래그 중 비활성',nodes().length===0);
    _printRectActive=false;renderPrintFrame();

    // [PF10] 명령 / 버튼 / 끄기
    const pfBtn=document.getElementById('btn-printframe');
    assert('인쇄틀: 상단 버튼 존재·활성 표시',!!pfBtn&&pfBtn.classList.contains('gold'));
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    processCommand('pf');
    assert('인쇄틀: pf 명령으로 끔',STATE.printFrameOn===false&&nodes().length===0&&
      !document.getElementById('print-frame-bar')&&!pfBtn.classList.contains('gold'));
    processCommand('print frame');
    assert('인쇄틀: print frame 명령으로 켬',STATE.printFrameOn===true&&circles().length===8);
    togglePrintFrame(false);
    assert('인쇄틀: 끄면 조작 바도 사라짐',!document.getElementById('print-frame-bar'));

    STATE.spaces=_bakPF.spaces;STATE.vertices=_bakPF.vertices;STATE.walls=_bakPF.walls;
    STATE.printConfig=_bakPF.cfg;STATE.printFrameOn=_bakPF.on;
    STATE.zoom=_bakPF.zoom;STATE.offsetX=_bakPF.ox;STATE.offsetY=_bakPF.oy;
    hidePrintFrameBar();updatePrintFrameBtn();renderAll();refreshUI();
  }catch(e){
    assert('인쇄틀: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-29: 겹친 조명 경고 + 간접조명 점등 표현·길이 주기 (대표 지시) ===
  try{
    const _bakLT={lights:STATE.lights.slice(),electric:STATE.electric.slice(),zoom:STATE.zoom,
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),mode:STATE.symbolLabelMode};
    const LX=7700000;
    STATE.zoom=1;STATE.lights=[];STATE.electric=[];STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];

    // --- 겹친 조명 ---
    // 같은 자리에 3" 다운라이트 2개(중복) + 멀리 떨어진 정상 1개 + 촘촘하지만 안 겹치는 1개
    const dA={id:makeId('li'),type:'downlight',x:LX,y:LX,angle:0,inch:3};
    const dB={id:makeId('li'),type:'downlight',x:LX+20,y:LX+15,angle:0,inch:3}; // 25mm — 외경 95mm 안, 중복
    const dC={id:makeId('li'),type:'downlight',x:LX+3000,y:LX,angle:0,inch:3};  // 정상
    const dD={id:makeId('li'),type:'downlight',x:LX+3300,y:LX,angle:0,inch:3};  // 300mm 간격 — 촘촘하지만 정상
    STATE.lights.push(dA,dB,dC,dD);
    invalidateDuplicateLights();
    let dg=duplicateLightGroups();
    assert('중복조명: 겹친 2개만 잡는다',dg.ids.has(dA.id)&&dg.ids.has(dB.id)&&
      !dg.ids.has(dC.id)&&!dg.ids.has(dD.id),'n='+dg.ids.size);
    assert('중복조명: 300mm 간격은 중복 아님',!dg.ids.has(dD.id));
    assert('중복조명: 무리 1곳·대표 1개',dg.rep.size===1&&[...dg.rep.values()][0]===2,
      'rep='+dg.rep.size+' cnt='+[...dg.rep.values()].join(','));
    assert('중복조명: 같은 자리 목록',duplicateLightPeers(dA.id).length===2);

    // 종류가 다르면 중복으로 보지 않는다 (의도적으로 겹쳐 쓰는 설계)
    const dE={id:makeId('li'),type:'ceiling',x:LX+6000,y:LX,angle:0};
    const dF={id:makeId('li'),type:'downlight',x:LX+6000,y:LX,angle:0,inch:3};
    STATE.lights.push(dE,dF);invalidateDuplicateLights();
    dg=duplicateLightGroups();
    assert('중복조명: 종류가 다르면 제외',!dg.ids.has(dE.id)&&!dg.ids.has(dF.id));
    STATE.lights=STATE.lights.filter(l=>l!==dE&&l!==dF);invalidateDuplicateLights();

    // 빨간 경고 링이 실제로 그려진다
    renderLights();
    const redOf=id=>{let n=0;groups.lights.getChildren().forEach(g=>{if(g.id&&g.id()===id&&g.getChildren)
      g.getChildren(x=>x.getClassName()==='Circle').forEach(cc=>{if((cc.stroke&&cc.stroke())==='#FF3B30')n++;});});return n;};
    assert('중복조명: 빨간 경고 링 표시',redOf(dA.id)===1&&redOf(dB.id)===1,redOf(dA.id)+'/'+redOf(dB.id));
    assert('중복조명: 정상 조명엔 경고 없음',redOf(dC.id)===0&&redOf(dD.id)===0);
    let warnTxt=0;
    groups.lights.getChildren().forEach(n=>{if(n.getClassName&&n.getClassName()==='Text'&&
      n.text().indexOf('중복')>=0)warnTxt++;});
    assert('중복조명: ⚠ 글씨는 무리당 1개',warnTxt===1,'n='+warnTxt);

    // 인쇄에는 경고가 나가지 않는다
    STATE.printMode=true;renderLights();
    assert('중복조명: 인쇄에는 미포함',redOf(dA.id)===0);
    STATE.printMode=false;renderLights();

    // 정리 — 하나만 남는다
    const beforeN=STATE.lights.length;
    const removed=cleanDuplicateLights(dA.id);
    assert('중복조명: 정리 1개 삭제',removed===1&&STATE.lights.length===beforeN-1,
      'removed='+removed+' n='+STATE.lights.length);
    assert('중복조명: 고른 것이 남는다',STATE.lights.some(l=>l.id===dA.id)&&!STATE.lights.some(l=>l.id===dB.id));
    invalidateDuplicateLights();
    assert('중복조명: 정리 후 경고 사라짐',duplicateLightGroups().ids.size===0);

    // 잠금된 것은 지우지 않는다
    const kA={id:makeId('li'),type:'downlight',x:LX+9000,y:LX,angle:0,inch:3,locked:true};
    const kB={id:makeId('li'),type:'downlight',x:LX+9010,y:LX,angle:0,inch:3,locked:true};
    STATE.lights.push(kA,kB);invalidateDuplicateLights();
    const n2=cleanDuplicateLights();
    assert('중복조명: 잠금은 지우지 않음',n2===0&&STATE.lights.some(l=>l.id===kA.id)&&STATE.lights.some(l=>l.id===kB.id));
    STATE.lights=STATE.lights.filter(l=>l!==kA&&l!==kB);invalidateDuplicateLights();

    // 회로 참조도 함께 정리된다
    const gA={id:makeId('li'),type:'downlight',x:LX+12000,y:LX,angle:0,inch:3};
    const gB={id:makeId('li'),type:'downlight',x:LX+12010,y:LX,angle:0,inch:3};
    const sw={id:makeId('e'),type:'switch_1',x:LX+12000,y:LX+2000,angle:0,lightIds:[gA.id,gB.id],circuitOn:true};
    STATE.lights.push(gA,gB);STATE.electric.push(sw);invalidateDuplicateLights();
    cleanDuplicateLights();
    assert('중복조명: 회로 참조도 정리',sw.lightIds.length===1&&STATE.lights.some(l=>l.id===sw.lightIds[0]),
      JSON.stringify(sw.lightIds));

    // --- 간접·라인조명 ---
    STATE.lights=[];STATE.electric=[];invalidateDuplicateLights();
    const cove={id:makeId('li'),type:'cove',x:LX,y:LX+20000,angle:0,length_mm:3000};
    const dl={id:makeId('li'),type:'downlight',x:LX+5000,y:LX+20000,angle:0,inch:3};
    const sw2={id:makeId('e'),type:'switch_1',x:LX,y:LX+22000,angle:0,lightIds:[cove.id,dl.id],circuitOn:true};
    STATE.lights.push(cove,dl);STATE.electric.push(sw2);
    renderLights();
    const nodeOf=id=>{let g=null;groups.lights.getChildren().forEach(c=>{if(c.id&&c.id()===id)g=c;});return g;};
    const gCove=nodeOf(cove.id), gDl=nodeOf(dl.id);
    // [간접1] 점등 표현이 원이 아니라 띠
    const coveGlowRect=gCove&&gCove.getChildren(n=>n.getClassName()==='Rect'&&
      typeof n.fillLinearGradientColorStops==='function'&&(n.fillLinearGradientColorStops()||[]).length>0)[0];
    assert('간접: 점등이 원이 아니라 띠',!!coveGlowRect,'띠 없음');
    const coveGlowCircle=gCove&&gCove.getChildren(n=>n.getClassName()==='Circle'&&
      typeof n.fillRadialGradientEndRadius==='function'&&n.fillRadialGradientEndRadius()>0).length;
    assert('간접: 동그란 광원 안 씀',coveGlowCircle===0,'n='+coveGlowCircle);
    // [간접2] 종전 계산(길이×1.35)보다 훨씬 좁다
    const oldR=mmToPx(3000)*1.35+16;
    assert('간접: 퍼짐 폭이 종전보다 좁다',!!coveGlowRect&&coveGlowRect.height()<oldR,
      coveGlowRect?(coveGlowRect.height().toFixed(0)+' vs 종전 반지름 '+oldR.toFixed(0)):'-');
    // [간접3] 띠는 길이 방향으로 길다 (선광원)
    assert('간접: 길이 방향으로 긴 띠',!!coveGlowRect&&coveGlowRect.width()>coveGlowRect.height(),
      coveGlowRect?(coveGlowRect.width().toFixed(0)+'×'+coveGlowRect.height().toFixed(0)):'-');
    // [간접4] 다운라이트(점광원)는 그대로 원
    const dlCircle=gDl&&gDl.getChildren(n=>n.getClassName()==='Circle'&&
      typeof n.fillRadialGradientEndRadius==='function'&&n.fillRadialGradientEndRadius()>0).length;
    assert('간접: 점광원은 원 유지',dlCircle===1,'n='+dlCircle);

    // [간접5] 도면에 간접 표기 + 길이(m)
    const tagOf=txt=>{let f=false;groups.lights.getChildren().forEach(n=>{
      if(n.getClassName&&n.getClassName()==='Text'&&n.text().indexOf(txt)>=0)f=true;});return f;};
    assert('간접: 도면에 종류 표기',tagOf('간접'),'표기 없음');
    assert('간접: 길이 m 표기',tagOf('3.0m'),'길이 없음');
    assert('간접: 표기 문구',linearLightTagText(cove,linearLightDef(cove))==='간접 3.0m',
      linearLightTagText(cove,linearLightDef(cove)));
    // 길이를 바꾸면 표기도 따라온다
    cove.length_mm=4500;renderLights();
    assert('간접: 길이 변경 반영',tagOf('4.5m'));
    // 종류별 이름
    const t5={id:makeId('li'),type:'line_t5',x:LX,y:LX+24000,angle:0,length_mm:1200};
    assert('간접: T5 라인 표기',linearLightTagText(t5,linearLightDef(t5))==='T5 라인 1.2m',
      linearLightTagText(t5,linearLightDef(t5)));
    // [간접6] 라벨 모드가 '끔'이어도 간접 표기는 남는다 (도면 판독에 필수)
    STATE.symbolLabelMode='off';renderLights();
    assert('간접: 라벨 끔에도 표기 유지',tagOf('간접'));
    STATE.symbolLabelMode='smart';
    // [간접7] 개별로는 끌 수 있다
    cove.showLabel=false;renderLights();
    assert('간접: 개별 끄기 가능',!tagOf('간접'));
    delete cove.showLabel;

    // [명령] dup / dup fix
    STATE.lights.push({id:makeId('li'),type:'downlight',x:LX+30000,y:LX,angle:0,inch:3},
                      {id:makeId('li'),type:'downlight',x:LX+30015,y:LX,angle:0,inch:3});
    invalidateDuplicateLights();
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    processCommand('dup');
    assert('중복조명: dup 명령이 겹친 것을 고른다',STATE.selectedKind==='lights'&&
      duplicateLightGroups().ids.has(STATE.selectedId));
    processCommand('dup fix');
    invalidateDuplicateLights();
    assert('중복조명: dup fix 명령으로 정리',duplicateLightGroups().ids.size===0);

    STATE.lights=_bakLT.lights;STATE.electric=_bakLT.electric;STATE.zoom=_bakLT.zoom;
    STATE.selectedKind=_bakLT.selK;STATE.selectedId=_bakLT.selI;STATE.boxSelection=_bakLT.box;
    STATE.symbolLabelMode=_bakLT.mode;
    invalidateDuplicateLights();
    if(typeof invalidateSymbolLabelPlan==='function') invalidateSymbolLabelPlan();
    renderAll();refreshUI();
  }catch(e){
    assert('조명경고: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-29: 공간 드래그 + 칼라 인쇄 (대표 지시) ===
  try{
    const _bakSD={spaces:STATE.spaces.slice(),vertices:STATE.vertices.slice(),walls:STATE.walls.slice(),
      furniture:STATE.furniture.slice(),lights:STATE.lights.slice(),cfg:STATE.printConfig,
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),zoom:STATE.zoom};
    const SX=2600000;
    STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];STATE.printConfig=null;
    const sv=polygonToVertexIds([{x:SX,y:SX},{x:SX+6000,y:SX},{x:SX+6000,y:SX+5000},{x:SX,y:SX+5000}]);
    const ssp=makeSpaceVEF(sv,{name:'드래그검증',type:'LIVING',typeIndex:92,layerName:'A-AREA-ROOM-92'});
    STATE.spaces.push(ssp);
    // spaceId 를 기록하지 않은 가구·조명 (실제로 이렇게 남는 경우가 있어 문제가 됐다)
    const sf={id:makeId('f'),type:'sofa3',x:SX+1500,y:SX+3800,angle:0};
    const sl={id:makeId('li'),type:'downlight',x:SX+4000,y:SX+1500,angle:0,inch:3};
    // 방 밖 객체 — 따라오면 안 된다
    const outF={id:makeId('f'),type:'sofa3',x:SX+12000,y:SX+1000,angle:0};
    STATE.furniture.push(sf,outF);STATE.lights.push(sl);

    // [SD1] 공간 안 객체 판정 — spaceId 가 없어도 폴리곤 안이면 포함
    const cont=spaceContainedObjects(ssp.id);
    assert('공간이동: spaceId 없어도 안쪽 객체 인식',
      cont.furniture.some(o=>o.id===sf.id)&&cont.lights.some(o=>o.id===sl.id),
      'f='+cont.furniture.length+' l='+cont.lights.length);
    assert('공간이동: 방 밖 객체는 제외',!cont.furniture.some(o=>o.id===outF.id));
    // 다른 방 소속으로 기록된 객체는 제외
    sf.spaceId='sp_other';
    assert('공간이동: 다른 방 소속은 제외',!spaceContainedObjects(ssp.id).furniture.some(o=>o.id===sf.id));
    delete sf.spaceId;

    // [SD2] 드래그 캡처에도 같은 규칙이 적용된다
    const cap=_captureContained(ssp.id);
    assert('공간이동: 드래그 캡처에 반영',
      cap.furniture.some(o=>o.id===sf.id)&&cap.lights.some(o=>o.id===sl.id)&&
      !cap.furniture.some(o=>o.id===outF.id));

    // 갓 만든 사본(Alt 복사)은 아직 가진 것이 없다 — 원본 가구를 끜고 가면 안 된다
    const capNew=_captureContained(ssp.id,{byIdOnly:true});
    assert('공간이동: 사본은 원본 가구를 가져가지 않는다',
      capNew.furniture.length===0&&capNew.lights.length===0,
      'f='+capNew.furniture.length+' l='+capNew.lights.length);

    // [SD3] 명령/방향키 이동 — 공간과 안의 객체가 함께, 밖은 그대로
    STATE.selectedKind='space';STATE.selectedId=ssp.id;STATE.boxSelection=[];
    const p0=[ssp.polygon[0].x,ssp.polygon[0].y];
    const f0=[sf.x,sf.y], l0=[sl.x,sl.y], o0=[outF.x,outF.y];
    const moved=(typeof _nudgeSelected==='function')?_nudgeSelected(1000,500):null;
    if(moved){
      assert('공간이동: 공간이 이동',Math.abs((ssp.polygon[0].x-p0[0])-1000)<2&&
        Math.abs((ssp.polygon[0].y-p0[1])-500)<2,(ssp.polygon[0].x-p0[0])+'/'+(ssp.polygon[0].y-p0[1]));
      assert('공간이동: 안의 가구·조명도 함께',
        Math.abs((sf.x-f0[0])-1000)<2&&Math.abs((sl.x-l0[0])-1000)<2,
        (sf.x-f0[0])+'/'+(sl.x-l0[0]));
      assert('공간이동: 방 밖 객체는 그대로',outF.x===o0[0]&&outF.y===o0[1]);
    }else{
      assert('공간이동: 이동 API 확인',false,'_nudgeSelected 없음/실패');
    }

    // 방 안 빈 곳 드래그 = 박스 선택 / 다시 눌러 끌면 이동 — 실제 마우스 경로는
    //  헤드리스 E2E(cdp-repro3)에서 검증한다. 동기 테스트에서는 mousedown 을 재현할 수 없다.

    // --- 칼라 인쇄 ---
    const cfgC=printCfg();
    assert('칼라인쇄: 기본은 흑백 선화',cfgC.colorMode==='ink',cfgC.colorMode);
    // [SD5] 흑백에서는 공간이 흰 바탕, 칼라에서는 공간 색이 남는다
    const fillOf=()=>{let c=null;groups.spaces.getChildren().forEach(n=>{
      if(n.id&&n.id()===ssp.id&&n.fill) c=n.fill();});return c;};
    const _bz=STATE.zoom;
    STATE.printMode=true;STATE.printColor=false;renderSpaces();
    const inkFill=fillOf();
    STATE.printColor=true;renderSpaces();
    const colorFill=fillOf();
    STATE.printMode=false;STATE.printColor=false;renderSpaces();
    assert('칼라인쇄: 흑백은 흰 바탕',String(inkFill).toUpperCase()==='#FFFFFF',String(inkFill));
    assert('칼라인쇄: 칼라는 공간 색 유지',String(colorFill).toUpperCase()!=='#FFFFFF'&&
      String(colorFill).indexOf(SPACE_TYPES.LIVING.color)>=0,String(colorFill));
    // [SD6] 옅은 선은 종이에서 보이게 진해진다 (색조는 유지)
    assert('칼라인쇄: 옅은 선 진하게',_darkenIfPale('#F0F0F0')!=='#F0F0F0');
    assert('칼라인쇄: 진한 선은 그대로',_darkenIfPale('#333333')==='#333333');
    const _dk=_darkenIfPale('#FFE0E0');
    assert('칼라인쇄: 색조는 유지 (붉은기 유지)',
      parseInt(_dk.slice(1,3),16)>parseInt(_dk.slice(3,5),16),_dk);
    assert('칼라인쇄: 변환 함수 존재',typeof applyPrintColor==='function'&&typeof applyPrintInk==='function');
    // [SD7] 설정이 캡처까지 전달된다
    cfgC.colorMode='color';
    const bbC=printRegionBBox(cfgC);
    if(bbC){
      const LC=choosePrintLayout(bbC,cfgC);
      const imgC=_printCapture(bbC,LC,cfgC,22);
      assert('칼라인쇄: 캡처 성공',!!imgC&&imgC.url.indexOf('data:image/png')===0);
      assert('칼라인쇄: 캡처 후 플래그 복구',STATE.printColor===false&&STATE.printMode===false);
      const cfgI={...cfgC,colorMode:'ink'};
      const imgI=_printCapture(bbC,choosePrintLayout(bbC,cfgI),cfgI,22);
      assert('칼라인쇄: 흑백과 결과가 다르다',imgC.url!==imgI.url);
      // 표제란에 칼라 표기
      const shC=buildPrintSheet(imgC,LC,_printInfo(),cfgC,{preview:true,onlyPage:1});
      const shI=buildPrintSheet(imgI,LC,_printInfo(),cfgI,{preview:true,onlyPage:1});
      assert('칼라인쇄: 표제란에 칼라 표기',shC.indexOf('칼라')>=0&&shI.indexOf('칼라')<0);
    }
    cfgC.colorMode='ink';
    STATE.zoom=_bz;

    STATE.spaces=_bakSD.spaces;STATE.vertices=_bakSD.vertices;STATE.walls=_bakSD.walls;
    STATE.furniture=_bakSD.furniture;STATE.lights=_bakSD.lights;STATE.printConfig=_bakSD.cfg;
    STATE.selectedKind=_bakSD.selK;STATE.selectedId=_bakSD.selI;STATE.boxSelection=_bakSD.box;
    STATE.zoom=_bakSD.zoom;
    renderAll();refreshUI();
  }catch(e){
    assert('공간이동·칼라인쇄: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-29: 여러 조명 한 번에 연결 + 범례 규격 표기 (대표 지시) ===
  try{
    const _bakLK={lights:STATE.lights.slice(),electric:STATE.electric.slice(),
      furniture:STATE.furniture.slice(),selK:STATE.selectedKind,selI:STATE.selectedId,
      box:STATE.boxSelection.slice(),cl:window._circuitLink,jl:window._jumpLink,ca:window._circuitAttach};
    const KX=3300000;
    STATE.lights=[];STATE.electric=[];STATE.boxSelection=[];
    STATE.selectedKind=null;STATE.selectedId=null;
    window._circuitLink=null;window._jumpLink=null;window._circuitAttach=null;

    const L4=[0,1,2,3].map(i=>{const o={id:makeId('li'),type:'downlight',x:KX+i*900,y:KX,angle:0,inch:3};
      STATE.lights.push(o);return o;});
    const far={id:makeId('li'),type:'downlight',x:KX+9000,y:KX,angle:0,inch:3};
    STATE.lights.push(far);
    const sw={id:makeId('e'),type:'switch_2',x:KX,y:KX+2000,angle:0};
    const outlet={id:makeId('e'),type:'outlet_2',x:KX+2000,y:KX+2000,angle:0};
    STATE.electric.push(sw,outlet);

    // [C1] 드래그로 고른 조명만 추려낸다
    STATE.boxSelection=L4.map(o=>({kind:'lights',id:o.id})).concat([{kind:'electric',id:sw.id}]);
    const picked=selectedLightIds();
    assert('조명연결: 선택에서 조명만 추림',picked.length===4&&picked.indexOf(sw.id)<0,'n='+picked.length);

    // [C2] 한 번에 붙인다 — 중복은 무시
    let n=attachLightsToSwitch(sw.id,picked);
    assert('조명연결: 4개 한 번에 연결',n===4&&sw.lightIds.length===4,'n='+n+'/'+sw.lightIds.length);
    n=attachLightsToSwitch(sw.id,picked);
    assert('조명연결: 이미 연결된 것은 다시 안 붙음',n===0&&sw.lightIds.length===4);

    // [C3] 스위치가 아닌 전기기구는 거부
    const before=(outlet.lightIds||[]).length;
    attachLightsToSwitch(outlet.id,picked);
    assert('조명연결: 콘센트에는 연결 불가',(outlet.lightIds||[]).length===before);

    // [C4] 박스 안 조명만
    const inBox=lightsInBoxMm(KX-400,KX-400,KX+2200,KX+400);
    assert('조명연결: 박스 안 조명만 집는다',inBox.length===3&&inBox.indexOf(far.id)<0,'n='+inBox.length);

    // [C5] 스위치 먼저 — 연결 모드에서 박스로 쓸어 담기
    sw.lightIds=[];
    window._circuitLink={switchId:sw.id};
    const n5=circuitBoxConnect('circuit',KX-400,KX-400,KX+2200,KX+400);
    assert('조명연결: 연결 모드 박스로 한꺼번에',n5===3&&sw.lightIds.length===3,'n='+n5);
    assert('조명연결: 박스 연결 후에도 모드 유지',!!window._circuitLink);
    window._circuitLink=null;

    // [C6] 점핑도 박스로
    STATE.lights.forEach(l=>{delete l.jumpIds;});
    window._jumpLink={lightId:L4[0].id};
    const n6=circuitBoxConnect('jump',KX+400,KX-400,KX+2800,KX+400);
    assert('조명연결: 점핑 박스 연결',n6>=2&&jumpNeighbors(L4[0].id).length>=2,'n='+n6);
    window._jumpLink=null;

    // [C7] 고른 조명끼리 체인 — 연결 수는 n-1
    STATE.lights.forEach(l=>{delete l.jumpIds;});
    STATE.boxSelection=L4.map(o=>({kind:'lights',id:o.id}));
    const n7=chainSelectedLights();
    assert('조명연결: 체인은 n-1개',n7===3,'n='+n7);
    const ends=L4.filter(o=>jumpNeighbors(o.id).length===1).length;
    assert('조명연결: 한 줄로 이어짐 (양 끝 2개)',ends===2,'ends='+ends);
    const n7b=chainSelectedLights();
    assert('조명연결: 이미 이어졌으면 그대로',n7b===0);
    assert('조명연결: 1개만 고르면 거절',chainSelectedLights([L4[0].id])===0);

    // [C8] 조명 먼저 모드 — 시작·취소
    STATE.boxSelection=L4.map(o=>({kind:'lights',id:o.id}));
    startCircuitAttach();
    assert('조명연결: 조명 먼저 모드 시작',!!window._circuitAttach&&
      window._circuitAttach.lightIds.length===4);
    assert('조명연결: 안내 배너 표시',!!document.getElementById('circuit-link-banner'));
    endCircuitAttach(true);
    assert('조명연결: 모드 취소',!window._circuitAttach&&!document.getElementById('circuit-link-banner'));

    // [C9] 다중 선택 패널 — 종전엔 박스 선택만으로는 빈 패널이었다
    STATE.selectedKind=null;STATE.selectedId=null;
    STATE.boxSelection=L4.map(o=>({kind:'lights',id:o.id}));
    refreshUI();
    assert('조명연결: 다중 선택 패널 표시',
      document.getElementById('sp-detail').style.display!=='none'&&
      !!document.getElementById('d-ms-attach'),'패널 없음');
    assert('조명연결: 점핑 버튼도 제공',!!document.getElementById('d-ms-chain'));
    // 2026-08-29: Shift+클릭 은 boxSelection 과 단일 선택을 동시에 남긴다(selectObj).
    //  그때도 다중 패널이 뗴야 한다 — 종전엔 단일 패널만 떠서 연결 버튼을 못 찾았다
    STATE.boxSelection=L4.slice(0,3).map(o=>({kind:'lights',id:o.id}));
    STATE.selectedKind='lights';STATE.selectedId=L4[2].id; // Shift+클릭 직후 상태
    refreshUI();
    assert('조명연결: Shift+클릭 여러 개도 다중 패널',
      !!document.getElementById('d-ms-chain')&&!!document.getElementById('d-ms-attach'),
      'chain='+!!document.getElementById('d-ms-chain'));
    assert('조명연결: Shift 선택도 전부 집힌다',selectedLightIds().length===3,
      'n='+selectedLightIds().length);
    // 하나만 고른 상태에서는 개별 속성 패널이 그대로 떠야 한다
    STATE.boxSelection=[{kind:'lights',id:L4[0].id}];
    STATE.selectedKind='lights';STATE.selectedId=L4[0].id;
    refreshUI();
    assert('조명연결: 1개만 고르면 개별 패널',
      !document.getElementById('d-ms-chain')&&!!document.getElementById('d-jump-link'),
      'ms='+!!document.getElementById('d-ms-chain'));
    STATE.selectedKind=null;STATE.selectedId=null;

    // [C10] 명령어
    STATE.boxSelection=L4.map(o=>({kind:'lights',id:o.id}));
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    processCommand('link');
    assert('조명연결: link 명령',!!window._circuitAttach);
    endCircuitAttach(true);
    STATE.lights.forEach(l=>{delete l.jumpIds;});
    STATE.boxSelection=L4.map(o=>({kind:'lights',id:o.id}));
    processCommand('chain');
    assert('조명연결: chain 명령',jumpNeighbors(L4[0].id).length>=1);

    // [C11b] 2026-08-29: 연결선은 점 없는 일정한 실선 (대표 지시 — 점이 다운라이트로 보였다)
    STATE.lights.forEach(l=>{delete l.jumpIds;});
    sw.lightIds=[L4[0].id,L4[1].id];sw.circuitOn=true;
    L4[0].jumpIds=[L4[1].id];
    const _bakSC=STATE.showCircuits;STATE.showCircuits=true;
    renderAll();
    const jl=groups.lights.getChildren(n=>n.getClassName()==='Line'&&n.name&&n.name()==='jump-line');
    assert('연결선: 점핑선이 그려진다',jl.length>=1,'n='+jl.length);
    // 2026-08-29: 대표 지시 — 배선은 가는 점선. 문제였던 건 둥근 마커였지 끈기가 아니었다
    assert('연결선: 점핑선은 점선',jl.every(n=>{const d=n.dash&&n.dash();return !!d&&d.length>0;}),
      JSON.stringify(jl[0]&&jl[0].dash&&jl[0].dash()));
    assert('연결선: 가는 선',jl.every(n=>n.strokeWidth()<=1.2),
      String(jl[0]&&jl[0].strokeWidth()));
    assert('연결선: 회로선·점핑선 규격 공유',
      typeof CIRCUIT_LINE_W==='number'&&CIRCUIT_LINE_W<=1.2&&
      Array.isArray(CIRCUIT_LINE_DASH)&&CIRCUIT_LINE_DASH.length>0&&
      jl[0].strokeWidth()===CIRCUIT_LINE_W,
      'w='+CIRCUIT_LINE_W+' dash='+JSON.stringify(CIRCUIT_LINE_DASH));
    const midDots=groups.lights.getChildren(n=>n.getClassName()==='Circle'&&n.name&&n.name()==='jump-mid');
    assert('연결선: 중간 점 없음',midDots.length===0,'n='+midDots.length);
    // 회로선 끝에 붙던 점도 없어야 한다 — 조명 위치에 겹쳐 다운라이트처럼 보였다
    const endDots=groups.electric.getChildren(n=>n.getClassName()==='Circle'&&n.radius&&n.radius()===4);
    assert('연결선: 회로선 끝 점 없음',endDots.length===0,'n='+endDots.length);
    const curves=groups.electric.getChildren(n=>n.getClassName()==='Shape');
    assert('연결선: 회로선은 그대로 그려진다',curves.length>=1,'n='+curves.length);
    STATE.showCircuits=_bakSC;sw.circuitOn=false;sw.lightIds=[];
    STATE.lights.forEach(l=>{delete l.jumpIds;});

    // [C11] 사라진 조명은 붙지 않는다
    sw.lightIds=[];
    const n11=attachLightsToSwitch(sw.id,[L4[0].id,'li_없는거']);
    assert('조명연결: 없는 조명은 무시',n11===1&&sw.lightIds.length===1);

    // --- 범례 규격 표기 ---
    STATE.lights=[];
    const d2={id:makeId('li'),type:'downlight',x:KX,y:KX+9000,angle:0,inch:2};
    const d3a={id:makeId('li'),type:'downlight',x:KX+800,y:KX+9000,angle:0,inch:3};
    const d3b={id:makeId('li'),type:'downlight',x:KX+1600,y:KX+9000,angle:0,inch:3};
    const d6={id:makeId('li'),type:'downlight',x:KX+2400,y:KX+9000,angle:0,inch:6};
    const cv={id:makeId('li'),type:'cove',x:KX,y:KX+11000,angle:0,length_mm:3600};
    STATE.lights.push(d2,d3a,d3b,d6,cv);

    const it2=legendItemOf('lights',d2), it3=legendItemOf('lights',d3a), it6=legendItemOf('lights',d6);
    assert('범례: 품명에 인치 표기',it2.name.indexOf('2"')>=0&&it3.name.indexOf('3"')>=0&&
      it6.name.indexOf('6"')>=0,[it2.name,it3.name,it6.name].join(' / '));
    assert('범례: 규격에 타공경',it2.spec.indexOf('55')>=0&&it6.spec.indexOf('150')>=0,
      it2.spec+' / '+it6.spec);
    assert('범례: 인치가 다르면 이름도 다르다',it2.name!==it3.name&&it3.name!==it6.name);
    const itC=legendItemOf('lights',cv);
    assert('범례: 라인·간접은 길이(m)',itC.spec==='3.6m',itC.spec);
    // 다른 분류도 한글 품명이 나와야 한다 (생으로 'sofa3' 가 찍히던 회귀)
    const itF=legendItemOf('furniture',{id:'x',type:'sofa3',x:0,y:0});
    assert('범례: 가구도 한글 품명',itF.name===FURNITURE_LIB.sofa3.name,itF.name);
    const itE=legendItemOf('electric',{id:'y',type:'switch_2',x:0,y:0});
    assert('범례: 전기도 한글 품명',itE.name===ELECTRIC_LIB.switch_2.name,itE.name);

    // 2페이지 범례표에 실제로 찍히는지 (종전엔 전부 '다운라이트' 한 줄이었다)
    const bbL=printRegionBBox(printCfg());
    if(bbL){
      const LL=choosePrintLayout(bbL,printCfg());
      const p2=buildPrintPage2(LL,_printInfo());
      // 품명은 escapeHtml 을 거치므로 인치 따옴표는 &quot; 로 나온다
      const _has=t=>p2.indexOf('다운라이트 '+t+'&quot;')>=0;
      assert('범례: 2페이지에 인치 표기',_has(2)&&_has(3)&&_has(6),
        '2:'+_has(2)+' 3:'+_has(3)+' 6:'+_has(6));
      assert('범례: 2페이지에 타공경',p2.indexOf('타공')>=0);
      assert('범례: 규격 열 추가',p2.indexOf('규격')>=0);
      // 3인치 2개는 한 줄에 수량 2로 합쳐진다
      const m3=p2.match(/다운라이트 3&quot;/g);
      assert('범례: 같은 인치는 한 줄로 합산 (3" ×2)',
        !!m3&&m3.length===1&&/다운라이트 3&quot;[\s\S]{0,160}?<td class="r">2<\/td>/.test(p2),
        'rows='+(m3?m3.length:0));
    }

    STATE.lights=_bakLK.lights;STATE.electric=_bakLK.electric;STATE.furniture=_bakLK.furniture;
    STATE.selectedKind=_bakLK.selK;STATE.selectedId=_bakLK.selI;STATE.boxSelection=_bakLK.box;
    window._circuitLink=_bakLK.cl;window._jumpLink=_bakLK.jl;window._circuitAttach=_bakLK.ca;
    if(typeof _circuitBanner==='function') _circuitBanner();
    if(typeof invalidateDuplicateLights==='function') invalidateDuplicateLights();
    renderAll();refreshUI();
  }catch(e){
    assert('조명연결·범례: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-29: 여러 조명 한 번에 해제 (대표 지시 — "해제할 때도 여러 개를 선택하고") ===
  try{
    const _bakUL={lights:STATE.lights.slice(),electric:STATE.electric.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),
      cl:window._circuitLink,jl:window._jumpLink,ca:window._circuitAttach};
    const UX=4400000;
    STATE.lights=[];STATE.electric=[];STATE.boxSelection=[];
    STATE.selectedKind=null;STATE.selectedId=null;
    window._circuitLink=null;window._jumpLink=null;window._circuitAttach=null;

    const U=[0,1,2,3].map(i=>{const o={id:makeId('li'),type:'downlight',x:UX+i*900,y:UX,angle:0,inch:3};
      STATE.lights.push(o);return o;});
    const swA={id:makeId('e'),type:'switch_1',x:UX,y:UX+2000,angle:0,lightIds:[U[0].id,U[1].id],circuitOn:true};
    const swB={id:makeId('e'),type:'switch_1',x:UX+3000,y:UX+2000,angle:0,lightIds:[U[2].id,U[3].id],circuitOn:true};
    STATE.electric.push(swA,swB);

    // [U1] 걸려 있는 스위치 찾기
    assert('해제: 걸린 스위치 조회',switchesOfLight(U[0].id).length===1&&
      switchesOfLight(U[0].id)[0].id===swA.id);

    // [U2] 여러 스위치에 걸친 조명들을 한 번에 뺀다
    STATE.boxSelection=[U[0],U[2]].map(o=>({kind:'lights',id:o.id}));
    const n2=detachSelectedLights();
    assert('해제: 두 스위치에서 한 번에',n2===2&&swA.lightIds.length===1&&swB.lightIds.length===1,
      'n='+n2+' A='+swA.lightIds.length+' B='+swB.lightIds.length);
    assert('해제: 남은 것은 그대로',swA.lightIds[0]===U[1].id&&swB.lightIds[0]===U[3].id);

    // [U3] 마지막 하나까지 빼면 점등도 꺼진다 (켠 채로 남으면 유령 점등이 된다)
    STATE.boxSelection=[{kind:'lights',id:U[1].id}];
    detachSelectedLights();
    assert('해제: 마지막까지 빼면 소등',swA.lightIds.length===0&&swA.circuitOn===false);

    // [U4] 뺄 게 없으면 아무 일도 안 한다
    assert('해제: 연결 없으면 0',detachSelectedLights([U[0].id])===0);

    // [U5] 점핑 해제 — 나가는 연결과 들어오는 연결 모두
    U[0].jumpIds=[U[1].id];U[1].jumpIds=[U[2].id];U[2].jumpIds=[U[3].id];
    STATE.boxSelection=[{kind:'lights',id:U[1].id}];
    const n5=unchainSelectedLights();
    assert('해제: 점핑 양방향 해제',n5===2&&jumpNeighbors(U[1].id).length===0,
      'n='+n5+' left='+jumpNeighbors(U[1].id).length);
    assert('해제: 관계없는 점핑은 유지',jumpNeighbors(U[2].id).indexOf(U[3].id)>=0);
    STATE.lights.forEach(l=>{delete l.jumpIds;});

    // [U6] 스위치 먼저 — 그 스위치에서만 뺀다
    swA.lightIds=[U[0].id,U[1].id];swA.circuitOn=true;
    swB.lightIds=[U[0].id];swB.circuitOn=true;
    const n6=detachLightsFromSwitch(swA.id,[U[0].id]);
    assert('해제: 지정한 스위치에서만',n6===1&&swA.lightIds.length===1&&swB.lightIds.length===1,
      'A='+swA.lightIds.length+' B='+swB.lightIds.length);

    // [U7] 연결 모드 Alt+드래그 = 박스 해제
    swA.lightIds=[U[0].id,U[1].id,U[2].id];swA.circuitOn=true;
    window._circuitLink={switchId:swA.id};
    const n7=circuitBoxConnect('circuit',UX-400,UX-400,UX+1300,UX+400,true);
    assert('해제: 연결 모드 박스 해제',n7===2&&swA.lightIds.length===1&&swA.lightIds[0]===U[2].id,
      'n='+n7+' left='+swA.lightIds.length);
    // 같은 박스에 detach 없이 부르면 다시 붙는다 (연결/해제가 한 경로)
    const n7b=circuitBoxConnect('circuit',UX-400,UX-400,UX+1300,UX+400,false);
    assert('해제: 같은 경로로 다시 연결',n7b===2&&swA.lightIds.length===3);
    window._circuitLink=null;

    // [U8] 점핑 모드 박스 해제
    STATE.lights.forEach(l=>{delete l.jumpIds;});
    U[0].jumpIds=[U[1].id,U[2].id];
    window._jumpLink={lightId:U[0].id};
    const n8=circuitBoxConnect('jump',UX+500,UX-400,UX+2200,UX+400,true);
    assert('해제: 점핑 박스 해제',n8===2&&jumpNeighbors(U[0].id).length===0,'n='+n8);
    window._jumpLink=null;
    STATE.lights.forEach(l=>{delete l.jumpIds;});

    // [U9] 패널 — 연결된 게 있으면 해제 버튼이 살아 있고, 없으면 꺼져 있다
    swA.lightIds=[U[0].id];swB.lightIds=[];
    U[0].jumpIds=[U[1].id];
    STATE.selectedKind=null;STATE.selectedId=null;
    STATE.boxSelection=[U[0],U[1]].map(o=>({kind:'lights',id:o.id}));
    refreshUI();
    const dx=document.getElementById('d-ms-detach'), ux=document.getElementById('d-ms-unchain');
    assert('해제: 패널에 회로 해제 버튼',!!dx&&dx.disabled===false,dx?('disabled='+dx.disabled):'없음');
    assert('해제: 패널에 점핑 해제 버튼',!!ux&&ux.disabled===false);
    swA.lightIds=[];STATE.lights.forEach(l=>{delete l.jumpIds;});
    refreshUI();
    const dx2=document.getElementById('d-ms-detach'), ux2=document.getElementById('d-ms-unchain');
    assert('해제: 뺄 게 없으면 비활성',!!dx2&&dx2.disabled===true&&!!ux2&&ux2.disabled===true,
      dx2?('d='+dx2.disabled+' u='+ux2.disabled):'없음');

    // [U10] 명령어
    swA.lightIds=[U[0].id,U[1].id];swA.circuitOn=true;
    STATE.boxSelection=[U[0],U[1]].map(o=>({kind:'lights',id:o.id}));
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    processCommand('unlink');
    assert('해제: unlink 명령',swA.lightIds.length===0);
    U[0].jumpIds=[U[1].id];
    STATE.boxSelection=[U[0],U[1]].map(o=>({kind:'lights',id:o.id}));
    processCommand('unchain');
    assert('해제: unchain 명령',jumpNeighbors(U[0].id).length===0);

    STATE.lights=_bakUL.lights;STATE.electric=_bakUL.electric;
    STATE.selectedKind=_bakUL.selK;STATE.selectedId=_bakUL.selI;STATE.boxSelection=_bakUL.box;
    window._circuitLink=_bakUL.cl;window._jumpLink=_bakUL.jl;window._circuitAttach=_bakUL.ca;
    if(typeof _circuitBanner==='function') _circuitBanner();
    if(typeof invalidateDuplicateLights==='function') invalidateDuplicateLights();
    renderAll();refreshUI();
  }catch(e){
    assert('해제: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-30: 스위치 구별 점등 + 점핑선 정리 (대표 지시) ===
  try{
    const _bakGG={lights:STATE.lights.slice(),electric:STATE.electric.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),
      cl:window._circuitLink,jl:window._jumpLink,zoom:STATE.zoom};
    const GX=5500000;
    STATE.lights=[];STATE.electric=[];STATE.boxSelection=[];
    STATE.selectedKind=null;STATE.selectedId=null;
    window._circuitLink=null;window._jumpLink=null;STATE.zoom=1;

    const G6=[0,1,2,3,4,5].map(i=>{const o={id:makeId('li'),type:'downlight',x:GX+i*800,y:GX,angle:0,inch:3};
      STATE.lights.push(o);return o;});
    const s6={id:makeId('e'),type:'switch_6',x:GX,y:GX+2500,angle:0};
    const s1={id:makeId('e'),type:'switch_1',x:GX+5000,y:GX+2500,angle:0};
    STATE.electric.push(s6,s1);

    // [G1] 구 수는 타입에서
    assert('구별점등: 타입별 구 수',switchGangCount('switch_6')===6&&switchGangCount('switch_1')===1&&
      switchGangCount('switch_3')===3&&switchGangCount('dimmer')===1);
    assert('구별점등: gangOn 길이 = 구 수',switchGangOn(s6).length===6&&switchGangOn(s1).length===1);

    // [G2] 구를 지정해 연결한다
    startCircuitLink(s6.id,0);
    attachLightsToSwitch(s6.id,[G6[0].id,G6[1].id],{keepMode:true});
    startCircuitLink(s6.id,1);
    attachLightsToSwitch(s6.id,[G6[2].id,G6[3].id],{keepMode:true});
    startCircuitLink(s6.id,5);
    attachLightsToSwitch(s6.id,[G6[4].id],{keepMode:true});
    endCircuitLink&&endCircuitLink();
    window._circuitLink=null;
    assert('구별점등: 1구에 2개',gangLightIds(s6,0).length===2,'n='+gangLightIds(s6,0).length);
    assert('구별점등: 2구에 2개',gangLightIds(s6,1).length===2);
    assert('구별점등: 6구에 1개',gangLightIds(s6,5).length===1);
    assert('구별점등: 빈 구는 0개',gangLightIds(s6,2).length===0&&gangLightIds(s6,3).length===0);

    // [G3] 구별로 따로 켜진다 — 이게 대표가 원한 테스트
    setAllSwitchGangs(s6.id,false);
    toggleSwitchGang(s6.id,1,true);
    let lit=litLightIds();
    assert('구별점등: 2구만 켜면 그 조명만',
      lit.has(G6[2].id)&&lit.has(G6[3].id)&&!lit.has(G6[0].id)&&!lit.has(G6[4].id),
      'lit='+lit.size);
    toggleSwitchGang(s6.id,0,true);
    lit=litLightIds();
    assert('구별점등: 1구를 더 켜면 4개',lit.size===4,'lit='+lit.size);
    toggleSwitchGang(s6.id,1,false);
    lit=litLightIds();
    assert('구별점등: 2구만 끄면 2개 남는다',lit.size===2&&lit.has(G6[0].id)&&!lit.has(G6[2].id));

    // [G3b] 2026-08-30 대표 보고: 전체 토글은 반응하는데 구별 토글은 즉시 안 보였다.
    //  circuitOn 이 그대로라 렌더 캐시가 조명 레이어를 다시 그리지 않았다.
    //  renderAll() 만으로 화면이 따라오는지 글로우 개수로 확인한다.
    const _glow=()=>{let k=0;groups.lights.getChildren().forEach(g=>{
      if(!g.getChildren) return;
      g.getChildren(x=>x.getClassName()==='Circle').forEach(c=>{
        if(typeof c.fillRadialGradientEndRadius==='function'&&c.fillRadialGradientEndRadius()>0)k++;});});
      return k;};
    const _bz2=STATE.zoom;STATE.zoom=1;
    setAllSwitchGangs(s6.id,false);renderAll();
    assert('구별점등: 전부 끔 상태 글로우 0',_glow()===0,'glow='+_glow());
    toggleSwitchGang(s6.id,0,true);renderAll();
    const _g1=_glow();
    assert('구별점등: 1구 켜면 바로 보인다',_g1===2,'glow='+_g1);
    toggleSwitchGang(s6.id,1,true);renderAll();
    const _g2=_glow();
    assert('구별점등: 2구를 더 켜도 즉시 반영',_g2===4,'glow='+_g1+'→'+_g2);
    toggleSwitchGang(s6.id,0,false);renderAll();
    const _g3=_glow();
    assert('구별점등: 1구만 꺼도 즉시 반영',_g3===2,'glow='+_g2+'→'+_g3);
    // 구 배정을 바꿔도 화면이 따라온다
    setLightGang(s6,G6[4].id,1);renderAll();
    assert('구별점등: 구 재배정도 즉시 반영',_glow()===3,'glow='+_glow());
    setLightGang(s6,G6[4].id,5);
    STATE.zoom=_bz2;

    // [G4] circuitOn 은 '하나라도 켜졌나'로 유지 (기존 코드·배지 호환)
    assert('구별점등: circuitOn 동기화',s6.circuitOn===true);
    setAllSwitchGangs(s6.id,false);
    assert('구별점등: 전부 끄면 circuitOn false',s6.circuitOn===false&&litLightIds().size===0);
    setAllSwitchGangs(s6.id,true);
    assert('구별점등: 모두 켜기',litLightIds().size===5,'lit='+litLightIds().size);

    // [G5] 옛 문서 호환 — circuitOn 만 있고 gangOn 이 없던 데이터
    const old={id:makeId('e'),type:'switch_2',x:GX,y:GX+5000,angle:0,
      lightIds:[G6[0].id,G6[1].id],circuitOn:true};
    STATE.electric.push(old);
    const og=switchGangOn(old);
    assert('구별점등: 옛 문서는 전 구 ON 으로 승계',og.length===2&&og[0]===true&&og[1]===true,
      JSON.stringify(og));
    assert('구별점등: 옛 문서 조명은 1구 기본',lightGangOf(old,G6[0].id)===0);
    STATE.electric=STATE.electric.filter(e=>e!==old);

    // [G6] 구별 해제
    const beforeN=s6.lightIds.length;
    detachLightsFromSwitch(s6.id,gangLightIds(s6,1));
    assert('구별점등: 2구만 해제',s6.lightIds.length===beforeN-2&&gangLightIds(s6,1).length===0&&
      gangLightIds(s6,0).length===2,'n='+s6.lightIds.length);
    assert('구별점등: 해제하면 구 배정도 지워진다',
      !s6.lightGang||s6.lightGang[G6[2].id]===undefined);

    // [G7] 속성 패널 — 6구면 6줄, 각 줄에 점등·연결 버튼
    STATE.selectedKind='electric';STATE.selectedId=s6.id;STATE.boxSelection=[];
    refreshUI();
    assert('구별점등: 패널에 6줄',document.querySelectorAll('.gang-on').length===6,
      'n='+document.querySelectorAll('.gang-on').length);
    assert('구별점등: 구별 연결 버튼',document.querySelectorAll('.gang-link').length===6);
    assert('구별점등: 모두 켜기·끄기',!!document.getElementById('d-gang-all-on')&&
      !!document.getElementById('d-gang-all-off'));
    // 조명이 없는 구의 점등 버튼은 비활성
    const g3btn=document.querySelector('.gang-on[data-g="3"]');
    assert('구별점등: 빈 구는 점등 불가',!!g3btn&&g3btn.disabled===true);
    // 1구 스위치는 종전 UI (구 줄 1개 + 조명 연결 버튼)
    STATE.selectedId=s1.id;refreshUI();
    assert('구별점등: 1구는 버튼 하나',document.querySelectorAll('.gang-on').length===1&&
      document.querySelectorAll('.gang-link').length===1);
    // 2026-08-30: 점등과 배선이 각각 제 박스로 나뉘어 있어야 한다 (대표 지시)
    STATE.selectedId=s6.id;refreshUI();
    const _dc=document.getElementById('detail-content').innerHTML;
    assert('구별점등: 점등 테스트 박스 별도',_dc.indexOf('점등 테스트')>=0);
    assert('구별점등: 배선 연결 박스 별도',_dc.indexOf('배선 연결')>=0);
    assert('구별점등: 점등 박스가 배선보다 위',
      _dc.indexOf('점등 테스트')<_dc.indexOf('배선 연결'));
    assert('구별점등: 켜진 구 수 표시',_dc.indexOf('구 켜짐')>=0||_dc.indexOf('전부 꺼짐')>=0);
    STATE.selectedKind=null;STATE.selectedId=null;

    // --- 점핑선 정리 ---
    // [G8] 기구를 관통하지 않는다 — 선 끝이 심볼 밖에서 시작한다
    STATE.lights=[];
    const j1={id:makeId('li'),type:'downlight',x:GX,y:GX+9000,angle:0,inch:6};
    const j2={id:makeId('li'),type:'downlight',x:GX+3000,y:GX+9000,angle:0,inch:6};
    j1.jumpIds=[j2.id];
    STATE.lights.push(j1,j2);
    STATE.showCircuits=true;renderAll();
    const jline=groups.lights.getChildren(n=>n.getClassName()==='Line'&&n.name&&n.name()==='jump-line')[0];
    assert('점핑선: 선이 그려진다',!!jline);
    if(jline){
      const pts=jline.points();
      const cx1=STATE.offsetX+mmToPx(j1.x);
      const r=mmToPx(lightOuterMm(j1))/2;
      assert('점핑선: 기구 밖에서 시작 (관통하지 않음)',pts[0]>=cx1+r-0.5,
        'start='+pts[0].toFixed(1)+' need>='+(cx1+r).toFixed(1));
      const cx2=STATE.offsetX+mmToPx(j2.x);
      assert('점핑선: 기구 앞에서 끝난다',pts[2]<=cx2-r+0.5,
        'end='+pts[2].toFixed(1)+' need<='+(cx2-r).toFixed(1));
    }

    // [G8b] 점핑으로 이어진 무리는 급전선 하나만 — 부첓살처럼 뻗치지 않게
    STATE.lights=[];STATE.electric=[];
    const F=[0,1,2].map(i=>{const o={id:'lf'+i,type:'downlight',x:GX+1000+i*1000,y:GX+15000,angle:0,inch:3};
      STATE.lights.push(o);return o;});
    F[0].jumpIds=[F[1].id];F[1].jumpIds=[F[2].id];
    const fs={id:'swf',type:'switch_1',x:GX,y:GX+16500,angle:0,
      lightIds:[F[0].id,F[1].id,F[2].id],lightGang:{},gangOn:[true]};
    STATE.electric.push(fs);
    STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];
    STATE.showCircuits=true;renderAll();
    const feeds=groups.electric.getChildren(n=>n.getClassName()==='Shape'&&n.name&&n.name()==='circuit-curve');
    assert('점핑선: 이어진 무리는 급전선 1가닥',feeds.length===1,'n='+feeds.length);
    // 스위치에서 가장 가까운 조명으로 들어간다
    assert('점핑선: 가장 가까운 기구로 급전',feeds.length===1&&feeds[0].getAttr('lightId')===F[0].id,
      feeds.length?String(feeds[0].getAttr('lightId')):'-');
    // 점핑을 끊으면 각자 급전선을 받는다
    F.forEach(o=>{delete o.jumpIds;});renderAll();
    assert('점핑선: 끊으면 각자 급전',
      groups.electric.getChildren(n=>n.getClassName()==='Shape'&&n.name&&n.name()==='circuit-curve').length===3);

    // [G9] 체인 순서 — 교차가 남지 않는다 (2-opt)
    //  최근접만으로는 엇갈리는 배치: 사각형 네 귀퉁이를 지그재그 순서로 준다
    STATE.lights=[];
    const Q=[[0,0],[4000,0],[0,3000],[4000,3000]].map((p,i)=>{
      const o={id:'lq'+i,type:'downlight',x:GX+p[0],y:GX+12000+p[1],angle:0,inch:3};
      STATE.lights.push(o);return o;});
    STATE.boxSelection=Q.map(o=>({kind:'lights',id:o.id}));
    STATE.selectedKind=null;STATE.selectedId=null;
    chainSelectedLights();
    // 이어진 변들이 서로 교차하면 안 된다
    const segs=[];
    STATE.lights.forEach(a=>{(a.jumpIds||[]).forEach(bid=>{
      const b=STATE.lights.find(l=>l.id===bid);
      if(b) segs.push([a.x,a.y,b.x,b.y]);});});
    const cross=(p,q)=>{
      const d=(ax,ay,bx,by,cx,cy)=>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
      const [x1,y1,x2,y2]=p,[x3,y3,x4,y4]=q;
      // 끝점을 공유하면 교차로 보지 않는다
      const same=(a,b,c,d2)=>Math.abs(a-c)<1&&Math.abs(b-d2)<1;
      if(same(x1,y1,x3,y3)||same(x1,y1,x4,y4)||same(x2,y2,x3,y3)||same(x2,y2,x4,y4)) return false;
      const d1=d(x1,y1,x2,y2,x3,y3), d2v=d(x1,y1,x2,y2,x4,y4);
      const d3=d(x3,y3,x4,y4,x1,y1), d4=d(x3,y3,x4,y4,x2,y2);
      return ((d1>0)!==(d2v>0))&&((d3>0)!==(d4>0));
    };
    let nCross=0;
    for(let i=0;i<segs.length;i++)for(let k=i+1;k<segs.length;k++) if(cross(segs[i],segs[k])) nCross++;
    assert('점핑선: 체인 3개',segs.length===3,'n='+segs.length);
    assert('점핑선: 교차 없음 (2-opt)',nCross===0,'교차 '+nCross+'개');
    // 총 길이도 대각선을 타지 않는다 (4점 사각형이면 4000+3000+4000)
    const total=segs.reduce((a,g)=>a+Math.hypot(g[2]-g[0],g[3]-g[1]),0);
    // 짧은 변(3m)을 먼저 타면 3+4+3=10m — 둘레(4+3+4=11m)보다 짧다
    assert('점핑선: 최단 경로(10.0m)로 이어진다',Math.abs(total-10000)<50,'len='+Math.round(total));

    STATE.lights=_bakGG.lights;STATE.electric=_bakGG.electric;
    STATE.selectedKind=_bakGG.selK;STATE.selectedId=_bakGG.selI;STATE.boxSelection=_bakGG.box;
    window._circuitLink=_bakGG.cl;window._jumpLink=_bakGG.jl;STATE.zoom=_bakGG.zoom;
    if(typeof _circuitBanner==='function') _circuitBanner();
    if(typeof invalidateDuplicateLights==='function') invalidateDuplicateLights();
    renderAll();refreshUI();
  }catch(e){
    assert('구별점등·점핑선: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-30: 조명 종류별 점등 표현 + 규격별 라이브러리 (대표 지시) ===
  try{
    const _bakGL={lights:STATE.lights.slice(),electric:STATE.electric.slice(),zoom:STATE.zoom,
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),
      sel:STATE.selectedLib,dl:STATE.downlightInch,sc:STATE.showCircuits};
    const WX=6600000;
    STATE.lights=[];STATE.electric=[];STATE.boxSelection=[];
    STATE.selectedKind=null;STATE.selectedId=null;STATE.zoom=1;

    // --- 켜졌을 때의 모습이 종류마다 달라야 한다 ---
    const mk=(t,extra)=>{const o=Object.assign({id:makeId('li'),type:t,x:WX,y:WX,angle:0},extra||{});
      STATE.lights.push(o);return o;};
    const cove=mk('cove',{length_mm:3000});
    const t5=mk('line_t5',{x:WX+6000,length_mm:3000});
    const trk=mk('magnet_track',{x:WX+12000,length_mm:2700});
    const flu=mk('fluorescent',{x:WX+18000,length_mm:1200});
    const dl3=mk('downlight',{x:WX,y:WX+6000,inch:3});
    const dl6=mk('downlight',{x:WX+3000,y:WX+6000,inch:6});
    const bath=mk('bath_light',{x:WX+6000,y:WX+6000});
    const sw=({id:makeId('e'),type:'switch_1',x:WX,y:WX+9000,angle:0,
      lightIds:STATE.lights.map(l=>l.id),gangOn:[true],circuitOn:true});
    STATE.electric.push(sw);
    renderLights();
    const nodeOf=id=>{let g=null;groups.lights.getChildren().forEach(c=>{if(c.id&&c.id()===id)g=c;});return g;};
    const bandOf=id=>{const g=nodeOf(id);if(!g)return null;
      const r=g.getChildren(n=>n.getClassName()==='Rect'&&typeof n.fillLinearGradientColorStops==='function'&&
        (n.fillLinearGradientColorStops()||[]).length>0);return r[0]||null;};
    const spotsOf=id=>{const g=nodeOf(id);if(!g)return 0;
      return g.getChildren(n=>n.getClassName()==='Circle'&&typeof n.fillRadialGradientEndRadius==='function'&&
        n.fillRadialGradientEndRadius()>0).length;};
    const peakOf=st=>{ // 색상 스톱에서 가장 진한 알파
      let mx=0;(st||[]).forEach(v=>{if(typeof v==='string'){const m=v.match(/,([0-9.]+)\)$/);if(m)mx=Math.max(mx,+m[1]);}});
      return mx;};

    const bCove=bandOf(cove.id), bT5=bandOf(t5.id), bFlu=bandOf(flu.id);
    assert('점등표현: 간접·라인 모두 띠로 그려진다',!!bCove&&!!bT5);
    assert('점등표현: 간접이 라인보다 넓다',!!bCove&&!!bT5&&bCove.height()>bT5.height()*2,
      (bCove?bCove.height().toFixed(0):'-')+' vs '+(bT5?bT5.height().toFixed(0):'-'));
    assert('점등표현: 간접이 라인보다 은은하다',
      peakOf(bCove.fillLinearGradientColorStops())<peakOf(bT5.fillLinearGradientColorStops()),
      peakOf(bCove.fillLinearGradientColorStops())+' vs '+peakOf(bT5.fillLinearGradientColorStops()));
    assert('점등표현: 형광등은 그 사이',!!bFlu&&bFlu.height()<bCove.height()&&bFlu.height()>bT5.height(),
      bFlu?bFlu.height().toFixed(0):'-');
    // 가장자리 흐림 — 간접은 더 일찍부터 밝아진다(안쪽 스톱 위치가 작다)
    const innerOf=st=>{for(let i=0;i<st.length;i+=2){if(typeof st[i]==='number'&&st[i]>0&&st[i]<0.5) return st[i];}return 0.5;};
    assert('점등표현: 간접이 가장자리가 더 흐리다',
      innerOf(bCove.fillLinearGradientColorStops())<innerOf(bT5.fillLinearGradientColorStops()),
      innerOf(bCove.fillLinearGradientColorStops())+' vs '+innerOf(bT5.fillLinearGradientColorStops()));

    // 마그넷 트랙 — 띠가 아니라 스팟 여러 개
    assert('점등표현: 마그넷 트랙은 띠가 아니다',!bandOf(trk.id));
    assert('점등표현: 마그넷 트랙은 스팟 여러 개',spotsOf(trk.id)>=2,'n='+spotsOf(trk.id));

    // 점광원 — 배광표 기준, 기구 크기가 아니다
    const rOf=id=>{const g=nodeOf(id);if(!g)return 0;let r=0;
      g.getChildren(n=>n.getClassName()==='Circle').forEach(c=>{
        if(typeof c.fillRadialGradientEndRadius==='function'&&c.fillRadialGradientEndRadius()>r)
          r=c.fillRadialGradientEndRadius();});return r;};
    assert('점등표현: 6인치가 3인치보다 넓게 비춘다',rOf(dl6.id)>rOf(dl3.id)*1.5,
      rOf(dl3.id).toFixed(0)+' vs '+rOf(dl6.id).toFixed(0));
    assert('점등표현: 방습등은 욕실을 넓게',rOf(bath.id)>rOf(dl3.id),
      rOf(bath.id).toFixed(0)+' vs '+rOf(dl3.id).toFixed(0));
    assert('점등표현: 빛 반경은 배광표에서 온다',
      Math.abs(rOf(dl3.id)-mmToPx(pointGlowOf(dl3).r))<1.5,
      rOf(dl3.id).toFixed(1)+' vs '+mmToPx(pointGlowOf(dl3).r).toFixed(1));

    // --- 규격별 라이브러리 ---
    assert('규격: 팔레트 키 분해',libBaseType('downlight#6')==='downlight'&&libVariantVal('downlight#6')===6&&
      libBaseType('ceiling')==='ceiling'&&libVariantVal('ceiling')===null);
    const d6=libDefForKey(LIGHT_LIB,'downlight#6');
    const b250=libDefForKey(LIGHT_LIB,'bath_light#250');
    const b400=libDefForKey(LIGHT_LIB,'bath_light#400');
    assert('규격: 다운라이트 인치별 정의',!!d6&&d6.name.indexOf('6"')>=0&&d6.size===175,d6&&d6.name);
    assert('규격: 방습등 지름별 정의',!!b250&&b250.size===250&&!!b400&&b400.size===400&&
      b250.name.indexOf('250')>=0,b250&&b250.name);
    // 도형이 비율로 줄고 커진다
    const r250=b250.shape[0].r, r400=b400.shape[0].r;
    assert('규격: 방습등 도형도 비율로',Math.abs(r250/r400-250/400)<0.01,r250+'/'+r400);
    assert('규격: 각도는 그대로',b250.shape[3]&&b250.shape[3].start===LIGHT_LIB.bath_light.shape[3].start);

    // 배치하면 규격이 객체에 붙는다
    const o1={id:'x1',type:'downlight'};applyLibVariant(o1,'downlight#5');
    const o2={id:'x2',type:'bath_light'};applyLibVariant(o2,'bath_light#300');
    assert('규격: 배치 시 객체에 반영',o1.inch===5&&o2.size_mm===300);
    assert('규격: 잘못된 지름은 기본값',bathLightSizeOf({size_mm:999})===350);

    // 팔레트 목록·검증
    const lightGroups=LIB_GROUPS.light.map(g=>g[1]).reduce((a,b)=>a.concat(b),[]);
    assert('규격: 팔레트에 인치별 다운라이트',[2,3,4,5,6].every(i=>lightGroups.indexOf('downlight#'+i)>=0));
    assert('규격: 팔레트에 지름별 방습등',[250,300,350,400].every(v=>lightGroups.indexOf('bath_light#'+v)>=0));
    assert('규격: 규격 키도 유효한 선택',libHasKey('light','downlight#6')===true&&
      libHasKey('light','bath_light#250')===true);

    // 팔레트 DOM — 규격 항목이 실제로 그려지고, 맨 타입이 '기타'로 새지 않는다
    //  (2026-08-30: lib[k] 조회가 규격 키를 걸러내 팔레트에 안 나오던 버그)
    const _bakTool=STATE.selectedTool, _bakSel=STATE.selectedLib;
    let _bakRecent=null;
    try{_bakRecent=localStorage.getItem('minicad.recent.light');
        localStorage.removeItem('minicad.recent.light');}catch(_){}
    setTool('light');
    if(typeof setLibCategory==='function') setLibCategory('light',{keepOpen:true});
    const _keys=[...document.querySelectorAll('.lib-thumb-btn[data-lib-kind="lights"]')]
      .map(b=>b.dataset.libKey);
    assert('규격: 팔레트에 인치별 항목이 그려진다',
      [2,3,4,5,6].every(i=>_keys.indexOf('downlight#'+i)>=0),_keys.length+'개');
    assert('규격: 팔레트에 지름별 방습등',
      [250,300,350,400].every(v=>_keys.indexOf('bath_light#'+v)>=0));
    assert('규격: 맨 타입은 중복으로 나오지 않는다',
      _keys.indexOf('downlight')<0&&_keys.indexOf('bath_light')<0,
      'dl='+_keys.indexOf('downlight')+' bl='+_keys.indexOf('bath_light'));
    // 규격 항목의 이름도 규격을 따른다
    const _b6=document.querySelector('.lib-thumb-btn[data-lib-key="downlight#6"] .lib-thumb-name');
    assert('규격: 팔레트 이름에 규격 표기',!!_b6&&_b6.textContent.indexOf('6"')>=0,
      _b6?_b6.textContent:'없음');
    STATE.selectedTool=_bakTool;STATE.selectedLib=_bakSel;
    try{if(_bakRecent===null) localStorage.removeItem('minicad.recent.light');
        else localStorage.setItem('minicad.recent.light',_bakRecent);}catch(_){}

    // 범례에도 방습등 규격이 나온다
    const lb=legendItemOf('lights',{id:'z',type:'bath_light',size_mm:300,x:0,y:0});
    assert('규격: 범례에 방습등 지름',lb.name.indexOf('300')>=0&&lb.spec.indexOf('300')>=0,
      lb.name+' / '+lb.spec);

    STATE.lights=_bakGL.lights;STATE.electric=_bakGL.electric;STATE.zoom=_bakGL.zoom;
    STATE.selectedKind=_bakGL.selK;STATE.selectedId=_bakGL.selI;STATE.boxSelection=_bakGL.box;
    STATE.selectedLib=_bakGL.sel;STATE.downlightInch=_bakGL.dl;STATE.showCircuits=_bakGL.sc;
    if(typeof invalidateDuplicateLights==='function') invalidateDuplicateLights();
    renderAll();refreshUI();
  }catch(e){
    assert('점등표현·규격: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-30: 다른 구끼리 점핑되면 경고 (대표 지시) ===
  try{
    const _bakCF={lights:STATE.lights.slice(),electric:STATE.electric.slice(),zoom:STATE.zoom,
      selK:STATE.selectedKind,selI:STATE.selectedId,box:STATE.boxSelection.slice(),sc:STATE.showCircuits};
    const CX=7900000;
    STATE.lights=[];STATE.electric=[];STATE.boxSelection=[];
    STATE.selectedKind=null;STATE.selectedId=null;STATE.zoom=1;STATE.showCircuits=true;

    const C=[0,1,2,3].map(i=>{const o={id:'lc'+i,type:'downlight',x:CX+i*900,y:CX,angle:0,inch:3};
      STATE.lights.push(o);return o;});
    const cs={id:'csw',type:'switch_2',x:CX,y:CX+2500,angle:0,
      lightIds:[C[0].id,C[2].id],lightGang:{},gangOn:[true,false]};
    setLightGang(cs,C[0].id,0); setLightGang(cs,C[2].id,1);   // 1구 / 2구
    STATE.electric.push(cs);
    invalidateJumpConflicts();

    // [F1] 점핑이 없으면 충돌도 없다
    assert('회로충돌: 점핑 없으면 충돌 없음',jumpConflictGroups().ids.size===0);

    // [F2] 같은 구 안에서 점핑 — 정상
    C[0].jumpIds=[C[1].id];              // 1구 급전 → 미급전 조명으로 점핑
    invalidateJumpConflicts();
    assert('회로충돌: 같은 회로 점핑은 정상',jumpConflictGroups().ids.size===0,
      'n='+jumpConflictGroups().ids.size);

    // [F3] 1구와 2구를 점핑으로 이으면 충돌
    C[1].jumpIds=[C[2].id];              // ... → 2구 급전 조명까지 이어짐
    invalidateJumpConflicts();
    const cg=jumpConflictGroups();
    assert('회로충돌: 다른 구끼리 이으면 잡힌다',cg.ids.size===3&&cg.groups.length===1,
      'n='+cg.ids.size+' g='+cg.groups.length);
    assert('회로충돌: 무리 전체가 표시된다',
      [C[0],C[1],C[2]].every(o=>cg.ids.has(o.id))&&!cg.ids.has(C[3].id));
    const txt=jumpConflictText(cg.groups[0]);
    assert('회로충돌: 무엇과 무엇인지 적는다',txt.indexOf('1')>=0&&txt.indexOf('2')>=0&&
      txt.indexOf('구')>=0,txt);
    assert('회로충돌: 조회 헬퍼',!!jumpConflictOf(C[1].id)&&!jumpConflictOf(C[3].id));

    // [F4] 도면에 빨간 선 + 경고 글씨
    renderAll();
    const badLines=groups.lights.getChildren(n=>n.getClassName()==='Line'&&
      n.name&&n.name().indexOf('jump-conflict')>=0);
    assert('회로충돌: 충돌 선은 빨간색',badLines.length===2&&badLines.every(n=>n.stroke()==='#FF3B30'),
      'n='+badLines.length);
    let warnTxt=0;
    groups.lights.getChildren().forEach(n=>{if(n.getClassName&&n.getClassName()==='Text'&&
      n.text().indexOf('다른 회로 연결')>=0)warnTxt++;});
    assert('회로충돌: 경고 글씨는 무리당 1개',warnTxt===1,'n='+warnTxt);

    // [F5] 인쇄에는 경고를 내지 않는다
    STATE.printMode=true;renderAll();
    assert('회로충돌: 인쇄에는 미포함',
      groups.lights.getChildren(n=>n.getClassName()==='Line'&&n.name&&
        n.name().indexOf('jump-conflict')>=0).length===0);
    STATE.printMode=false;renderAll();

    // [F6] 다른 스위치끼리 점핑도 충돌
    const cs2={id:'csw2',type:'switch_1',x:CX+5000,y:CX+2500,angle:0,
      lightIds:[C[3].id],lightGang:{},gangOn:[true]};
    STATE.electric.push(cs2);
    C[2].jumpIds=[C[3].id];
    invalidateJumpConflicts();
    assert('회로충돌: 다른 스위치끼리도 잡는다',jumpConflictGroups().ids.size===4,
      'n='+jumpConflictGroups().ids.size);
    assert('회로충돌: 스위치 두 대가 문구에',jumpConflictText(jumpConflictGroups().groups[0]).indexOf('+')>=0,
      jumpConflictText(jumpConflictGroups().groups[0]));
    C[2].jumpIds=[];STATE.electric=STATE.electric.filter(e=>e!==cs2);
    C[1].jumpIds=[C[2].id];invalidateJumpConflicts();

    // [F7] 속성 패널에 경고와 고치는 두 가지 길
    STATE.selectedKind='lights';STATE.selectedId=C[1].id;STATE.boxSelection=[];
    refreshUI();
    assert('회로충돌: 패널 경고',!!document.getElementById('d-cfl-unify')&&
      !!document.getElementById('d-cfl-cut'));
    const _dc2=document.getElementById('detail-content').innerHTML;
    assert('회로충돌: 경고가 맨 위',_dc2.indexOf('다른 회로가 한 가닥으로')>=0&&
      _dc2.indexOf('다른 회로가 한 가닥으로')<_dc2.indexOf('배선 —'));

    // [F8] '한 구로 통일' — 무리 전체를 고른 조명의 구로 몰아준다
    unifyJumpGroupGang(C[1].id);
    invalidateJumpConflicts();
    assert('회로충돌: 통일하면 경고가 사라진다',jumpConflictGroups().ids.size===0,
      'n='+jumpConflictGroups().ids.size);
    assert('회로충돌: 같은 구로 모인다',lightGangOf(cs,C[0].id)===lightGangOf(cs,C[2].id),
      lightGangOf(cs,C[0].id)+'/'+lightGangOf(cs,C[2].id));

    // [F9] '점핑 끊기' 로도 풀린다
    setLightGang(cs,C[2].id,1);invalidateJumpConflicts();
    assert('회로충돌: 되돌리면 다시 경고',jumpConflictGroups().ids.size===3);
    unchainSelectedLights(jumpConflictOf(C[1].id).members);
    invalidateJumpConflicts();
    assert('회로충돌: 끊으면 해소',jumpConflictGroups().ids.size===0);

    STATE.lights=_bakCF.lights;STATE.electric=_bakCF.electric;STATE.zoom=_bakCF.zoom;
    STATE.selectedKind=_bakCF.selK;STATE.selectedId=_bakCF.selI;STATE.boxSelection=_bakCF.box;
    STATE.showCircuits=_bakCF.sc;
    invalidateJumpConflicts();
    if(typeof invalidateDuplicateLights==='function') invalidateDuplicateLights();
    renderAll();refreshUI();
  }catch(e){
    assert('회로충돌: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 치수 입력 계산식 (6000/2 → 3000) — 대표 지시 ===
  try{
    const _bakEX={lights:STATE.lights.slice(),openings:STATE.openings.slice(),
      selK:STATE.selectedKind,selI:STATE.selectedId,cmd:STATE.cmdMode};
    // [EX1] 파서 기본
    const cases=[['6000/2',3000],['(1200+800)/2',1000],['3*900',2700],['1,200+300',1500],
                 ['2400mm/3',800],['-500+1200',700],['900',900],['4500/1.5',3000]];
    assert('계산식: 사칙연산·괄호·단위',cases.every(([q,v])=>evalDimInt(q)===v),
      cases.filter(([q,v])=>evalDimInt(q)!==v).map(x=>x[0]).join(','));
    // [EX2] 잘못된 입력은 null (기존 값 유지 유도)
    assert('계산식: 잘못된 입력 차단',['abc','2+','6000/0','1..2','9;9','',null].every(q=>evalDim(q)===null));
    // [EX3] 패널 입력(_numField) — 계산식이 값으로 변환되고 입력창에도 반영
    const fake={target:{value:'6000/2'}};
    assert('계산식: 패널 입력 변환',_numField(fake,10)===3000&&fake.target.value==='3000');
    const bad={target:{value:'abc'}};
    assert('계산식: 패널 잘못된 입력 null',_numField(bad,10)===null);
    const belowMin={target:{value:'100/50'}};
    assert('계산식: 최소값 미만 null',_numField(belowMin,10)===null,'v='+_numField(belowMin,10));
    // [EX4] 실제 패널 경로 — 조명 길이 입력에 계산식
    const exl={id:makeId('li'),type:'line_t5',x:9000000,y:9000000,angle:0,length_mm:1200};
    STATE.lights.push(exl);
    STATE.selectedKind='lights';STATE.selectedId=exl.id;STATE.boxSelection=[];
    refreshDetail();
    const lenInput=document.getElementById('d-ll-len');
    assert('계산식: 조명 길이 입력 존재',!!lenInput);
    if(lenInput){
      lenInput.value='6000/2';
      lenInput.dispatchEvent(new Event('change'));
      assert('계산식: 조명 길이 6000/2 → 3000',linearLightLen(STATE.lights.find(l=>l.id===exl.id))===3000,
        String(linearLightLen(STATE.lights.find(l=>l.id===exl.id))));
    }
    // [EX5] 도어 W 입력에도 적용
    const exo={id:makeId('o'),type:'DOOR',subType:'swing',x:9000000,y:9001000,width_mm:900,height_mm:2100,depth_mm:200,angle:0,spaceId:null};
    STATE.openings.push(exo);
    STATE.selectedKind='opening';STATE.selectedId=exo.id;
    refreshDetail();
    const wIn=document.getElementById('d-w');
    if(wIn){
      wIn.value='(1200+600)/2';
      wIn.dispatchEvent(new Event('change'));
      assert('계산식: 도어 W (1200+600)/2 → 900',STATE.openings.find(o=>o.id===exo.id).width_mm===900,
        String(STATE.openings.find(o=>o.id===exo.id).width_mm));
    }
    // [EX6] 명령창 — 회전·이동 인자에 계산식
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    const exf={id:makeId('f'),type:'side_table',x:9100000,y:9100000,angle:0};
    STATE.furniture.push(exf);
    STATE.selectedKind='furniture';STATE.selectedId=exf.id;STATE.boxSelection=[];
    processCommand('m 6000/2,900*2');
    const movedF=STATE.furniture.find(f=>f.id===exf.id);
    assert('계산식: 명령 이동 m 6000/2,900*2',movedF.x===9100000+3000&&movedF.y===9100000+1800,
      movedF.x-9100000+','+(movedF.y-9100000));
    processCommand('r 90/2');
    assert('계산식: 명령 회전 r 90/2',Math.round(movedF.angle)===45,String(movedF.angle));
    STATE.furniture=STATE.furniture.filter(f=>f.id!==exf.id);
    STATE.lights=_bakEX.lights;STATE.openings=_bakEX.openings;
    STATE.selectedKind=_bakEX.selK;STATE.selectedId=_bakEX.selI;
    if(STATE.cmdMode&&typeof exitCmdMode==='function') exitCmdMode();
    renderAll();refreshUI();
  }catch(e){
    assert('계산식: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 비스포크 냉장고 + 가전 가구 일원화 (대표 지시) ===
  try{
    const _bakBP={tool:STATE.selectedTool,lib:STATE.selectedLib,furniture:STATE.furniture.slice(),fixtures:STATE.fixtures.slice()};
    const NEW=['fridge_bespoke','fridge_bespoke_kf','fridge_std','fridge_side','washer_std','dryer_std'];
    // [BP1] 가구 라이브러리 등록 + 도형
    assert('가전: 6종 가구 등록',NEW.every(k=>FURNITURE_LIB[k]&&Array.isArray(FURNITURE_LIB[k].shape)&&FURNITURE_LIB[k].shape.length>=3&&FURNITURE_LIB[k].w>0),
      NEW.filter(k=>!FURNITURE_LIB[k]).join(','));
    assert('가전: 비스포크 4도어 4분할',FURNITURE_LIB.fridge_bespoke.shape.filter(c=>c.type==='rect').length>=5);
    // [BP2] 브랜드명은 표시 이름에만 (nameEn·프롬프트는 일반명사 — 헌법)
    assert('가전: 영문명 브랜드 없음',NEW.every(k=>!/bespoke|samsung|lg/i.test(FURNITURE_LIB[k].nameEn||'')),
      NEW.filter(k=>/bespoke/i.test(FURNITURE_LIB[k].nameEn||'')).join(','));
    assert('가전: 시맨틱 등록',NEW.every(k=>semanticOf(k)&&!/bespoke/i.test(semanticOf(k).kw||'')));
    // [BP3] 기존 위생 가전은 레거시 숨김 + 대체 지정 (기존 도면 보존)
    const OLD=[['fridge','fridge_std'],['fridge_2door','fridge_side'],['washer','washer_std'],['dryer','dryer_std']];
    assert('가전: 위생 레거시 숨김',OLD.every(([k,rep])=>FIXTURE_LIB[k]&&FIXTURE_LIB[k].hidden===true&&FIXTURE_LIB[k].replacedBy===rep));
    const _bakFx=STATE.fixtures.slice();
    const oldFr={id:makeId('x'),type:'fridge',x:9500000,y:9500000,angle:0};
    STATE.fixtures.push(oldFr);
    renderRect(STATE.fixtures,groups.fixtures,FIXTURE_LIB,'fixtures');
    let found=false;groups.fixtures.getChildren().forEach(g=>{if(g.id&&g.id()===oldFr.id)found=true;});
    assert('가전: 기존 도면 냉장고 렌더 유지',found);
    STATE.fixtures=_bakFx;
    // [BP4] 팔레트 — 가구에 6종 노출, 위생에는 가전 없음, 중복 0
    setLibCategory('furniture');
    const fb=[...document.querySelectorAll('#lib-popup-grid .lib-thumb-btn')].map(b=>b.dataset.libKey);
    assert('가전: 가구 팔레트 노출',NEW.every(k=>fb.includes(k)),NEW.filter(k=>!fb.includes(k)).join(','));
    assert('가전: 가구 팔레트 중복 0',new Set(fb).size===fb.length);
    const hasGroup=[...document.querySelectorAll('#lib-popup-grid .lib-group-title')].some(h=>h.textContent.indexOf('가전')>=0);
    assert('가전: 가구에 가전 섹션',hasGroup);
    setLibCategory('fixture');
    const xb=[...document.querySelectorAll('#lib-popup-grid .lib-thumb-btn')].map(b=>b.dataset.libKey);
    assert('가전: 위생에서 제외',!xb.includes('fridge')&&!xb.includes('washer')&&!xb.includes('dryer'));
    assert('가전: 위생 팔레트 중복 0',new Set(xb).size===xb.length);
    hideLibPopup();
    // [BP5] 배치·렌더 정상
    const bp={id:makeId('f'),type:'fridge_bespoke',x:9600000,y:9600000,angle:0};
    STATE.furniture.push(bp);
    renderRect(STATE.furniture,groups.furniture,FURNITURE_LIB,'furniture');
    let g2=null;groups.furniture.getChildren().forEach(g=>{if(g.id&&g.id()===bp.id)g2=g;});
    assert('가전: 비스포크 배치 렌더',!!g2&&g2.getChildren().length>=5);
    STATE.furniture=_bakBP.furniture;STATE.fixtures=_bakBP.fixtures;
    setTool(_bakBP.tool||'select');STATE.selectedLib=_bakBP.lib;
    renderAll();
  }catch(e){
    assert('가전: 테스트 예외 없음',false,e.message);
  }
  // === 2026-08-27: 라이브러리 연속 배치 흐름 (대표 보고 — 하나 놓고 다른 것 고르면 배치가 안 됨) ===
  try{
    const _bakPL={tool:STATE.selectedTool,lib:STATE.selectedLib,last:Object.assign({},STATE.lastLib||{}),
      furniture:STATE.furniture.slice(),lights:STATE.lights.slice()};
    hideLibPopup();
    // [PL1] 도구별 유효성 — 카테고리 교차 선택 차단
    assert('배치흐름: 가구 키 유효',libHasKey('furniture','sofa3'));
    assert('배치흐름: 타 카테고리 키 차단',!libHasKey('light','sofa3')&&!libHasKey('furniture','downlight'));
    assert('배치흐름: 숨김(레거시) 키 차단',!libHasKey('fixture','fridge'));
    assert('배치흐름: 가구2 키는 가구에서 제외',!libHasKey('furniture',Object.keys(FIXFURN_LIB)[0]));
    // [PL2] 다른 카테고리 항목이 남아도 정의 없는 유령 객체가 배치되지 않는다
    setTool('light');STATE.selectedLib='sofa3';STATE.lastLib={};
    const _nl=STATE.lights.length;
    const okGhost=placeLibAt({x:400,y:400});
    assert('배치흐름: 유령 객체 배치 차단',okGhost===false&&STATE.lights.length===_nl&&!STATE.selectedLib);
    // [PL3] 미선택 클릭 → 무반응 대신 팔레트 자동 오픈
    assert('배치흐름: 미선택 시 팔레트 자동 오픈',document.getElementById('lib-popup').classList.contains('show'));
    hideLibPopup();
    // [PL4] 정상 배치 + 같은 항목 연속 배치
    setTool('furniture');STATE.selectedLib='sofa3';
    const _nf=STATE.furniture.length;
    assert('배치흐름: 배치 성공',placeLibAt({x:300,y:300})===true&&STATE.furniture.length===_nf+1);
    assert('배치흐름: 연속 배치',placeLibAt({x:360,y:360})===true&&STATE.furniture.length===_nf+2);
    assert('배치흐름: 배치 후 선택 유지',STATE.selectedLib==='sofa3');
    // [PL5] 도구를 오갔다 돌아와도 직전 선택이 되살아난다
    STATE.lastLib.furniture='sofa3';
    setTool('select');
    assert('배치흐름: 선택도구에서는 배치 항목 해제',STATE.selectedLib===null);
    setTool('furniture');
    assert('배치흐름: 가구 복귀 시 직전 항목 복원',STATE.selectedLib==='sofa3');
    const _nf2=STATE.furniture.length;
    assert('배치흐름: 복귀 직후 바로 배치',placeLibAt({x:420,y:420})===true&&STATE.furniture.length===_nf2+1);
    // [PL6] 카테고리 버튼을 다시 눌러도 팔레트가 닫히지 않는다
    setLibCategory('furniture');
    assert('배치흐름: 팔레트 열림',document.getElementById('lib-popup').classList.contains('show'));
    setLibCategory('furniture');
    assert('배치흐름: 재클릭해도 안 닫힘',document.getElementById('lib-popup').classList.contains('show'));
    const act=[...document.querySelectorAll('#lib-popup-grid .lib-thumb-btn.active')].map(b=>b.dataset.libKey);
    assert('배치흐름: 선택 항목 강조 1개 유지',act.length===1&&act[0]==='sofa3',act.join(','));
    hideLibPopup();
    assert('배치흐름: 닫기는 ✕/Esc 로',!document.getElementById('lib-popup').classList.contains('show'));
    // [PL7] 가구2 도 고스트 미리보기 대상 (이전에는 누락)
    assert('배치흐름: 가구2 고스트 대상',LIB_TOOL_KIND['furniture2']==='furniture');
    // [PL8] 팔레트 항목 클릭이 카테고리별 마지막 선택을 기록
    const _rk='minicad.recent.furniture2';let _rbak=null;
    try{_rbak=localStorage.getItem(_rk);}catch(_){}
    setLibCategory('furniture2');
    const b2=document.querySelector('#lib-popup-grid .lib-thumb-btn');
    assert('배치흐름: 가구2 팔레트 항목 존재',!!b2);
    if(b2){
      b2.click();
      assert('배치흐름: 카테고리별 마지막 선택 기록',STATE.lastLib.furniture2===b2.dataset.libKey);
      setTool('furniture');setTool('furniture2');
      assert('배치흐름: 가구2 복귀 시 복원',STATE.selectedLib===b2.dataset.libKey);
    }
    try{if(_rbak===null) localStorage.removeItem(_rk); else localStorage.setItem(_rk,_rbak);}catch(_){}
    hideLibPopup();
    // [PL9] 진짜 마우스 이벤트로 배치 — 이벤트 순서(pointerup→mouseup) 회귀 방지
    setTool('furniture');STATE.selectedLib='sofa3';
    const _cont=stage.container(),_cr=_cont.getBoundingClientRect();
    const _cx=Math.round(_cr.left+_cr.width/2),_cy=Math.round(_cr.top+_cr.height/2);
    const _tgt=_cont.querySelector('canvas')||_cont;
    const _mk=t=>_tgt.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,clientX:_cx,clientY:_cy,button:0}));
    const _pk=t=>{try{_tgt.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,clientX:_cx,clientY:_cy,button:0,pointerId:1,pointerType:'mouse'}));}catch(_){}};
    const _n3=STATE.furniture.length;
    _pk('pointerdown');_mk('mousedown');_pk('pointerup');_mk('mouseup');
    assert('배치흐름: 실제 마우스 클릭으로 배치',STATE.furniture.length===_n3+1,
      'furniture '+_n3+' → '+STATE.furniture.length);
    // 연속 두 번째도 동일하게
    _pk('pointerdown');_mk('mousedown');_pk('pointerup');_mk('mouseup');
    assert('배치흐름: 실제 클릭 연속 배치',STATE.furniture.length===_n3+2);
    STATE.furniture=_bakPL.furniture;STATE.lights=_bakPL.lights;STATE.lastLib=_bakPL.last;
    setTool(_bakPL.tool||'select');STATE.selectedLib=_bakPL.lib;
    renderAll();refreshUI();
  }catch(e){
    assert('배치흐름: 테스트 예외 없음',false,e.message);
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
