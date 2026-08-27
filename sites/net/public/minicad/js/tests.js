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
    // [D2] 개수 = 숨김 제외 라이브러리 수
    const visible=Object.entries(LIGHT_LIB).filter(([k,d])=>!d.hidden).length;
    assert('중복: 팔레트 수 = 표시 대상 수',btns.length===visible,btns.length+' vs '+visible);
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
        if(!lb[k]) badRef.push(tool+':'+k);
        used[k]=(used[k]||0)+1;
        if(used[k]>1) dupInGroup.push(tool+':'+k);
      }));
    });
    assert('분류: 분류표 키 실재',badRef.length===0,badRef.join(', '));
    assert('분류: 분류표 내 중복 없음',dupInGroup.length===0,dupInGroup.join(', '));
    // [G4] 팔레트 — 모든 표시 대상이 정확히 한 번 등장 + 섹션 헤더 존재
    ['furniture','furniture2','fixture','light','electric','hvac'].forEach(t=>{
      setLibCategory(t);
      const bs=[...document.querySelectorAll('#lib-popup-grid .lib-thumb-btn')];
      const hs=[...document.querySelectorAll('#lib-popup-grid .lib-group-title')];
      const cnt={};bs.forEach(b=>{cnt[b.dataset.libKey]=(cnt[b.dataset.libKey]||0)+1;});
      const lb=LIBMAP[t];
      const visible=Object.entries(lb).filter(([k,d])=>!d.hidden&&!(t==='furniture'&&FIXFURN_LIB[k])).map(e=>e[0]);
      assert('분류: '+t+' 항목 1회씩',bs.length===visible.length&&Object.values(cnt).every(v=>v===1),
        bs.length+' vs '+visible.length);
      assert('분류: '+t+' 누락 없음',visible.every(k=>cnt[k]===1),visible.filter(k=>!cnt[k]).join(','));
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
    let far=false;
    groups.electric.getChildren().forEach(nd=>{
      if(nd.getClassName()==='Circle'&&Math.abs(nd.x()-(STATE.offsetX+mmToPx(G+4000)))<2) far=true;
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
