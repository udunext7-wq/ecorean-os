'use strict';
// ===== UI / 패널 / 저장·로드 / 버튼 바인딩 =====
// v5.9: 라이브러리 카테고리 — 인라인 패널 → 팝업 창 (썸네일 버튼)
function setLibCategory(toolName,opts){
  const popup=document.getElementById('lib-popup');
  const wasOpen=popup.classList.contains('show');
  const prevTool=popup.dataset.tool;
  // 2026-08-27: 같은 카테고리를 다시 눌렀을 때 팔레트가 닫혀버려 '다른 것을 고를 수 없던' 문제 (대표 보고)
  //  → 카테고리 버튼은 언제나 '연 상태'를 유지한다. 닫기는 ✕ 또는 Esc.
  if(wasOpen && prevTool===toolName && !(opts&&opts.forceClose)){
    if(typeof normalizeSelectedLib==='function') normalizeSelectedLib(toolName);
    document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===toolName));
    _syncLibActive();
    return;
  }
  const lib={furniture:FURNITURE_LIB,furniture2:FIXFURN_LIB,fixture:FIXTURE_LIB,light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB}[toolName];
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===toolName));
  if(lib){
    showLibPopup(toolName,lib);
    popup.dataset.tool=toolName;
  }
  cmdToast({furniture:'1 가구',furniture2:'6 가구2 (픽스)',fixture:'2 위생/주방',light:'3 조명',electric:'4 전기',hvac:'5 공조/소방'}[toolName]||toolName);
}
// 2026-08-27: 현재 선택 항목을 팔레트에서 강조 + 보이는 곳으로 스크롤
function _syncLibActive(){
  const grid=document.getElementById('lib-popup-grid');
  if(!grid) return;
  grid.querySelectorAll('.lib-thumb-btn').forEach(b=>b.classList.remove('active'));
  if(!STATE.selectedLib) return;
  const el=grid.querySelector('.lib-thumb-btn[data-lib-key="'+STATE.selectedLib+'"]');
  if(!el) return;
  el.classList.add('active');
  if(typeof el.scrollIntoView==='function'){
    try{el.scrollIntoView({block:'nearest'});}catch(_){el.scrollIntoView();}
  }
}
function rebuildLibPanel(toolName){
  // v5.9: 인라인 패널 비활성 — 팝업으로 이전됨. 카테고리 탭 강조만 동기화.
  const panel=document.getElementById('lib-panel');
  if(panel) panel.innerHTML='';
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===toolName));
}

// v5.2: 직교 토글 함수
function toggleOrtho(){
  STATE.snap.ortho=!STATE.snap.ortho;
  const onOff=STATE.snap.ortho?'ON':'OFF';
  cmdToast('직교 (Ortho) '+onOff+' — F8 / Ctrl+L');
  updateOrthoFAB();
  if(typeof saveSnapPrefs==='function') saveSnapPrefs();
  if(typeof refreshSnapStatus==='function') refreshSnapStatus();
  if(typeof buildSnapUI==='function') buildSnapUI();
  // snap UI checkbox 동기화
  const cb=document.querySelector('input[data-snap="ortho"]');
  if(cb) cb.checked=STATE.snap.ortho;
  _refreshShiftOrtho(); // 작업 중 F8 즉시 반영
}
function updateOrthoFAB(){
  const fab=document.getElementById('ortho-fab');
  if(!fab) return;
  fab.classList.toggle('active',STATE.snap.ortho);
  fab.textContent=STATE.snap.ortho?'직교 ON':'직교 OFF';
}

// ===== 도구 =====
function setTool(tool){
  const _prevTool=STATE.selectedTool;
  STATE.selectedTool=tool;
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  drawState=null;STATE.measureFirst=null;polyState=null;leaderDrawState=null;
  // 2026-08-23: 옵셋 — 도구 선택 즉시 거리 입력 (탭에서 캔버스를 먼저 탭할 필요 없음, 매회 입력 원칙)
  if(tool==='offset'&&_prevTool!=='offset'){
    if(typeof offsetState!=='undefined') offsetState=null;
    enterCmdMode('offset-d',{},'옵셋 거리(mm):','거리 입력 후 Enter → 객체 클릭 → 방향 클릭'+(STATE._lastOffsetDist?' (Enter만=이전 '+STATE._lastOffsetDist+'mm)':''));
    if(STATE._lastOffsetDist&&typeof _prefillCmdInput==='function') _prefillCmdInput(STATE._lastOffsetDist);
  }
  if(typeof freePolyState!=='undefined'){freePolyState=null;document.getElementById('polyclose-fab')?.classList.add('hidden');} // v5.9
  drawGroup.destroyChildren();previewLayer.batchDraw();
  container.className='tool-'+tool;
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===tool));
  const libTools={furniture:FURNITURE_LIB,furniture2:FIXFURN_LIB,fixture:FIXTURE_LIB,light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB};
  if(libTools[tool]){
    rebuildLibPanel(tool);
    // 2026-08-27: 도구를 오갔다 돌아와도 직전에 고른 항목이 그대로 살아있게 (대표 지시)
    if(typeof normalizeSelectedLib==='function') normalizeSelectedLib(tool);
    _syncLibActive();
  }
  else{const p=document.getElementById('lib-panel');if(p)p.innerHTML='';STATE.selectedLib=null;}
  showStatus('도구: '+tool);
  if(typeof _circuitBanner==='function') _circuitBanner(); // 2026-08-27: 연결 모드 배너 유지
}
document.querySelectorAll('.tool-btn').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));

// ===== 라이브러리 팝업 (v5.9: 썸네일 버튼 그리드) =====
function _libShapeBounds(shape){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  shape.forEach(s=>{
    if(s.type==='rect'){
      minX=Math.min(minX,s.x);minY=Math.min(minY,s.y);
      maxX=Math.max(maxX,s.x+s.w);maxY=Math.max(maxY,s.y+s.h);
    } else if(s.type==='circle'||s.type==='arc'){
      minX=Math.min(minX,s.cx-s.r);minY=Math.min(minY,s.cy-s.r);
      maxX=Math.max(maxX,s.cx+s.r);maxY=Math.max(maxY,s.cy+s.r);
    } else if(s.type==='line'){
      minX=Math.min(minX,s.x1,s.x2);minY=Math.min(minY,s.y1,s.y2);
      maxX=Math.max(maxX,s.x1,s.x2);maxY=Math.max(maxY,s.y1,s.y2);
    }
  });
  if(!isFinite(minX)) return {x:-50,y:-50,w:100,h:100};
  return {x:minX,y:minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
}
function _libShapeToSVG(shape){
  const b=_libShapeBounds(shape);
  const pad=Math.max(b.w,b.h)*0.05+10;
  const vbX=b.x-pad,vbY=b.y-pad,vbW=b.w+pad*2,vbH=b.h+pad*2;
  const parts=shape.map(s=>{
    const fill=(s.fill&&s.fill!=='transparent')?s.fill:'none';
    const stroke=s.stroke||'none';
    const sw=s.sw||1;
    const dash=s.dash?' stroke-dasharray="'+s.dash.join(',')+'"':'';
    if(s.type==='rect'){
      const r=s.r||0;
      return '<rect x="'+s.x+'" y="'+s.y+'" width="'+s.w+'" height="'+s.h+'" rx="'+r+'" ry="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='circle'){
      return '<circle cx="'+s.cx+'" cy="'+s.cy+'" r="'+s.r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='line'){
      const st=stroke==='none'?(s.fill||'#888'):stroke;
      return '<line x1="'+s.x1+'" y1="'+s.y1+'" x2="'+s.x2+'" y2="'+s.y2+'" stroke="'+st+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='arc'){
      const st=stroke==='none'?(s.fill||'#888'):stroke;
      return '<circle cx="'+s.cx+'" cy="'+s.cy+'" r="'+s.r+'" fill="none" stroke="'+st+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    if(s.type==='path'&&s.d){
      return '<path d="'+s.d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'+dash+'/>';
    }
    return '';
  }).join('');
  return '<svg viewBox="'+vbX+' '+vbY+' '+vbW+' '+vbH+'" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'+parts+'</svg>';
}
function _attachLibPopupDrag(popup){
  if(popup.dataset.dragWired) return;
  popup.dataset.dragWired='1';
  const handle=popup.querySelector('h4');
  if(!handle) return;
  let startX=0,startY=0,baseLeft=0,baseTop=0,dragging=false;
  // 2026-08-19: Pointer Events — 마우스·터치·S펜 공용 드래그 (setPointerCapture)
  let activePtr=null;
  handle.addEventListener('pointerdown',e=>{
    if(e.target.closest('.lib-popup-close')) return;
    if(e.button!==undefined&&e.button!==0) return;
    e.preventDefault();
    const parent=popup.offsetParent||popup.parentElement;
    const pr=parent.getBoundingClientRect();
    const r=popup.getBoundingClientRect();
    baseLeft=r.left-pr.left;baseTop=r.top-pr.top;
    popup.style.left=baseLeft+'px';popup.style.top=baseTop+'px';
    popup.style.right='auto';popup.style.bottom='auto';
    startX=e.clientX;startY=e.clientY;
    dragging=true;activePtr=e.pointerId;popup.classList.add('dragging');
    try{handle.setPointerCapture(e.pointerId);}catch(err){}
  });
  handle.addEventListener('pointermove',e=>{
    if(!dragging||(activePtr!==null&&e.pointerId!==activePtr)) return;
    const parent=popup.offsetParent||popup.parentElement;
    const pw=parent.clientWidth, ph=parent.clientHeight;
    const w=popup.offsetWidth, h=popup.offsetHeight;
    let nl=baseLeft+(e.clientX-startX);
    let nt=baseTop+(e.clientY-startY);
    nl=Math.max(0,Math.min(pw-Math.min(w,pw),nl));
    nt=Math.max(0,Math.min(ph-Math.min(h,ph),nt));
    popup.style.left=nl+'px';popup.style.top=nt+'px';
  });
  const endDrag=e=>{
    if(!dragging) return;
    dragging=false;activePtr=null;popup.classList.remove('dragging');
    try{handle.releasePointerCapture(e.pointerId);}catch(err){}
  };
  handle.addEventListener('pointerup',endDrag);
  handle.addEventListener('pointercancel',endDrag);
  handle.style.touchAction='none';
}
function showLibPopup(tool,lib){
  const titles={furniture:'1 가구',furniture2:'6 가구2 — 픽스(빌트인)',fixture:'2 위생/주방',light:'3 조명',electric:'4 전기',hvac:'5 공조/소방'};
  const popup=document.getElementById('lib-popup');
  document.getElementById('lib-popup-title').textContent=titles[tool]||'라이브러리';
  // 닫기 버튼 (없으면 1회 생성)
  if(!popup.querySelector('.lib-popup-close')){
    const close=document.createElement('button');
    close.className='lib-popup-close';close.type='button';close.title='닫기 (Esc)';close.textContent='✕';
    close.addEventListener('click',hideLibPopup);
    popup.insertBefore(close,popup.firstChild);
  }
  _attachLibPopupDrag(popup);
  const grid=document.getElementById('lib-popup-grid');
  grid.innerHTML='';
  // 2026-08-27: 이 카테고리에 없는 선택은 버리고 카테고리별 마지막 선택을 되살린다
  if(typeof normalizeSelectedLib==='function') normalizeSelectedLib(tool);
  const kindMap={furniture:'furniture',furniture2:'furniture',fixture:'fixtures',light:'lights',electric:'electric',hvac:'hvac'};
  // 2026-08-24: 픽스가구는 '6 가구2' 전용 — '1 가구' 팝업에서는 제외 (FURNITURE_LIB 병합분 숨김)
  if(tool==='furniture'&&typeof FIXFURN_LIB!=='undefined'){
    lib=Object.fromEntries(Object.entries(lib).filter(([k])=>!FIXFURN_LIB[k]));
  }
  // 2026-08-24 v6.0: 최근 사용 (도구별 최대 6개, localStorage)
  let _recent=[];
  try{_recent=JSON.parse(localStorage.getItem('minicad.recent.'+tool)||'[]');}catch(_){_recent=[];}
  // 2026-08-30: 'downlight#3' 같은 규격 키도 유효하다 — 베이스 타입으로 판정한다
  const _libOk=k=>{const b=(typeof libBaseType==='function')?libBaseType(k):k;return !!(lib[b]&&!lib[b].hidden);};
  _recent=_recent.filter(_libOk);
  const _pushRecent=key=>{
    try{
      let r=JSON.parse(localStorage.getItem('minicad.recent.'+tool)||'[]');
      r=[key].concat(r.filter(k=>k!==key)).slice(0,6);
      localStorage.setItem('minicad.recent.'+tool,JSON.stringify(r));
    }catch(_){}
  };
  // 2026-08-26: 최근 사용을 별도 행으로 '복제'하던 탓에 같은 항목이 두 번 잡히던 버그 (대표 보고)
  //  → 어느 섹션에도 중복 없이 딱 한 번만 등장한다.
  // 2026-08-27: 소분류 섹션 (대표 지시) — 최근 사용 → 분류별 → 기타
  const _recentSet=new Set(_recent);
  const _visible=Object.entries(lib).filter(([k,d])=>!d.hidden);
  const _placed=new Set(_recent);
  const _sections=[];
  if(_recent.length) _sections.push(['★ 최근 사용',_recent.slice()]);
  ((typeof LIB_GROUPS!=='undefined'&&LIB_GROUPS[tool])||[]).forEach(([gname,keys])=>{
    const ks=keys.filter(k=>_libOk(k)&&!_placed.has(k));
    if(!ks.length) return;
    // 규격 항목을 넣었으면 맨 타입은 '기타'에 다시 나오지 않게 한다
    ks.forEach(k=>{_placed.add(k);
      if(typeof libBaseType==='function') _placed.add(libBaseType(k));});
    _sections.push([gname,ks]);
  });
  const _rest=_visible.map(e=>e[0]).filter(k=>!_placed.has(k));
  if(_rest.length) _sections.push([_sections.length?'기타':'전체',_rest]);
  const _entries=[];
  _sections.forEach(([gname,keys])=>{
    _entries.push({group:gname,count:keys.length});
    // 2026-08-30: 'type#규격' 키는 규격이 반영된 정의로 그린다
    keys.forEach(k=>_entries.push({key:k,
      def:(typeof libDefForKey==='function')?libDefForKey(lib,k):lib[k],
      isRecent:_recentSet.has(k)}));
  });
  _entries.forEach(item=>{
    if(item.group){
      const h=document.createElement('div');
      h.className='lib-group-title';
      h.innerHTML='<span>'+escapeHtml(item.group)+'</span><span class="cnt">'+item.count+'</span>';
      grid.appendChild(h);
      return;
    }
    const key=item.key, def=item.def, isRecent=item.isRecent;
    if(!def) return; // 정의를 못 찾는 키는 건너뛴다
    const btn=document.createElement('button');
    btn.className='lib-thumb-btn'+(STATE.selectedLib===key?' active':'');
    btn.type='button';
    btn.dataset.libKey=key;
    btn.dataset.libKind=kindMap[tool];
    btn.title=(isRecent?'★ 최근 사용 — ':'')+def.name+(def.nameEn?' / '+def.nameEn:'')+(def.w&&def.h?' ('+def.w+'×'+def.h+'mm)':'');
    if(isRecent) btn.style.outline='1px solid rgba(201,169,97,0.55)';
    let thumbHTML;
    if(def.shape&&def.shape.length){
      thumbHTML=_libShapeToSVG(def.shape);
    } else if(def.sym){
      thumbHTML='<span class="lib-sym" style="color:'+(def.c||'#C9A961')+'">'+def.sym+'</span>';
    } else {
      thumbHTML='<span class="lib-sym">■</span>';
    }
    var enHTML=def.nameEn?'<div class="lib-thumb-name-en">'+def.nameEn+'</div>':'';
    btn.innerHTML='<div class="lib-thumb">'+thumbHTML+'</div><div class="lib-thumb-name">'+def.name+'</div>'+enHTML;
    btn.addEventListener('click',()=>{
      STATE.selectedLib=key;
      if(!STATE.lastLib) STATE.lastLib={};
      STATE.lastLib[tool]=key; // 2026-08-27: 도구 왕복 후 복원용
      _pushRecent(key);
      grid.querySelectorAll('.lib-thumb-btn').forEach(b=>b.classList.remove('active'));
      grid.querySelectorAll('.lib-thumb-btn[data-lib-key="'+key+'"]').forEach(b=>b.classList.add('active'));
      showStatus(def.name+' 선택 — 캔버스 클릭으로 배치');
      // 2026-08-30: 고르자마자 설정이 보여야 한다 — 종전엔 하나 놓아야 패널이 떴다
      refreshUI();
      if(typeof autoOpenPropsDrawer==='function') autoOpenPropsDrawer();
    });
    grid.appendChild(btn);
  });
  popup.classList.add('show');
  _syncLibActive(); // 2026-08-27: 되살린 선택을 화면에 보이게
}
function hideLibPopup(){
  const p=document.getElementById('lib-popup');
  if(p){p.classList.remove('show');delete p.dataset.tool;}
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.remove('active'));
}

// ===== 공간 타입 / 레이어 / 스냅 UI =====
function buildSpaceTypeUI(){
  const grid=document.getElementById('stype-grid');grid.innerHTML='';
  Object.entries(SPACE_TYPES).forEach(([k,td])=>{
    const btn=document.createElement('button');
    btn.className='stype-btn'+(k===STATE.selectedSpaceType?' active':'');
    btn.dataset.type=k;
    btn.innerHTML='<span class="stype-dot" style="background:'+td.color+'"></span>'+td.name;
    btn.addEventListener('click',()=>{
      STATE.selectedSpaceType=k;
      document.querySelectorAll('.stype-btn').forEach(b=>b.classList.toggle('active',b.dataset.type===k));
    });
    grid.appendChild(btn);
  });
}
function buildLayerUI(){
  const list=document.getElementById('layer-list');list.innerHTML='';
  const labels={walls:['벽','#3E3E3E'],spaces:['공간','#C9A961'],openings:['문/창','#D4A05B'],
    furniture:['가구','#8B7239'],fixtures:['위생/주방','#5BA0D4'],lights:['조명','#D4B872'],
    electric:['전기','#7BA05B'],hvac:['공조/소방','#9B7AC9'],circles:['원/타원','#C9A961'],arcs:['아크','#D4B872'],curves:['자유곡선','#7BA05B'],
    pillars:['기둥 (RC)','#D4D4D4'],
    dimensions:['치수','#B8B0A0'],text:['주석','#F5F1EB'],leaders:['지시선','#A8D8A8'],xlines:['안내선 (무한)','#4FC3D9'],
    sections:['절단선','#C0392B']};
  Object.entries(labels).forEach(([k,[name,color]])=>{
    const row=document.createElement('div');
    row.className='layer-row'+(STATE.layers[k]?'':' off');
    row.innerHTML='<span class="layer-dot" style="background:'+color+'"></span><span class="layer-name">'+name+'</span><span class="layer-eye">●</span>';
    row.addEventListener('click',()=>{
      STATE.layers[k]=!STATE.layers[k];
      row.classList.toggle('off',!STATE.layers[k]);
      if(groups[k]){groups[k].visible(STATE.layers[k]);mainLayer.batchDraw();}
    });
    list.appendChild(row);
  });
}
// 2026-08-27: 스냅 설정 지속 (대표 보고 — 껐는데 새로고침·불러오기 때마다 그리드 스냅이 되살아남)
const SNAP_LS_KEY='minicad.snap';
function saveSnapPrefs(){
  try{localStorage.setItem(SNAP_LS_KEY,JSON.stringify({
    grid:!!STATE.snap.grid,endpoint:!!STATE.snap.endpoint,
    ghost:!!STATE.snap.ghost,ortho:!!STATE.snap.ortho,gridSize:STATE.gridSize,
    showCircuits:!!STATE.showCircuits,
    symbolLabelMode:STATE.symbolLabelMode}));}catch(_){} // 2026-08-28: 라벨 모드도 유지
}
function loadSnapPrefs(){
  try{
    const p=JSON.parse(localStorage.getItem(SNAP_LS_KEY)||'null');
    if(!p) return false;
    ['grid','endpoint','ghost','ortho'].forEach(k=>{if(typeof p[k]==='boolean') STATE.snap[k]=p[k];});
    if(typeof p.showCircuits==='boolean'){STATE.showCircuits=p.showCircuits;if(typeof updateCircuitsBtn==='function')updateCircuitsBtn();}
    // 2026-08-28: 기호 이름 라벨 모드 복원
    if(typeof SYMBOL_LABEL_MODES!=='undefined'&&SYMBOL_LABEL_MODES.indexOf(p.symbolLabelMode)>=0){
      STATE.symbolLabelMode=p.symbolLabelMode;
      if(typeof updateSymbolLabelBtn==='function') updateSymbolLabelBtn();
    }
    if(p.gridSize&&isFinite(p.gridSize)){
      STATE.gridSize=p.gridSize;
      const g=document.getElementById('snap-unit'); if(g) g.value=String(p.gridSize);
    }
    return true;
  }catch(_){return false;}
}
// 상태바 표시 — 지금 무엇이 걸리는지 한눈에
function refreshSnapStatus(){
  const el=document.getElementById('snap-status'); if(!el) return;
  const on=[];
  if(STATE.snap.endpoint) on.push('끝점');
  if(STATE.snap.grid) on.push('그리드 '+STATE.gridSize+'mm');
  if(STATE.snap.ghost) on.push('고스트');
  if(STATE.snap.ortho) on.push('직교');
  el.textContent=on.length?on.join(' · '):'없음';
  el.style.color=on.length?'':'var(--ink-3)';
}
function buildSnapUI(){
  const list=document.getElementById('snap-list');list.innerHTML='';
  const labels={grid:['그리드 스냅','#C9A961'],endpoint:['끝점 스냅 (객체만)','#7BA05B'],ghost:['고스트 스냅 (선 근처)','#A8A8B8'],ortho:['직교 (Shift)','#5B8DA0']};
  Object.entries(labels).forEach(([k,[name,color]])=>{
    const row=document.createElement('div');
    row.className='layer-row'+(STATE.snap[k]?'':' off');
    row.innerHTML='<span class="layer-dot" style="background:'+color+'"></span><span class="layer-name">'+name+'</span><span class="layer-eye">●</span>';
    row.addEventListener('click',()=>{
      STATE.snap[k]=!STATE.snap[k];
      row.classList.toggle('off',!STATE.snap[k]);
      showStatus(name+': '+(STATE.snap[k]?'ON':'OFF'));
      saveSnapPrefs();refreshSnapStatus();
      if(k==='ghost'&&typeof renderGhostHints==='function') renderGhostHints();
      if(k==='ortho'&&typeof updateOrthoFAB==='function') updateOrthoFAB();
    });
    list.appendChild(row);
  });
  refreshSnapStatus();
}

// ===== UI =====
function refreshUI(){refreshHeader();refreshSpaceList();refreshDetail();refreshEstimate();refreshJSON();refreshMaterial();}
// 2026-08-19: 숫자 옵션 필드 파서 — 빈 값/NaN/최소 미만이면 null (호출자가 기존 값 유지)
function _numField(e,min){
  const raw=(e&&e.target?e.target.value:'').trim();
  if(raw==='') return null;
  // 2026-08-27: 계산식 허용 (6000/2 → 3000) — 대표 지시
  const v=(typeof evalDimInt==='function')?evalDimInt(raw):parseInt(raw,10);
  if(v===null||!isFinite(v)) return null;
  if(typeof min==='number'&&v<min) return null;
  if(e&&e.target&&String(v)!==raw){
    e.target.value=String(v); // 계산 결과를 그대로 보여준다
    if(/[+\-*/()]/.test(raw)&&typeof cmdToast==='function') cmdToast(raw+' = '+v+'mm');
  }
  return v;
}
// v5.9.4 PERF: 비활성 탭 패널은 지연 갱신 — 매 액션마다 견적표(20ms)·JSON(67ms)을
// 다시 만들던 것을, 해당 탭을 열 때 1회만 재구성 (상단 KPI 바는 항상 갱신 유지)
let _jsonDirty=false,_estimateDirty=false;
function _tabActive(tab){const el=document.querySelector('.tab-content[data-tab-content="'+tab+'"]');return !!(el&&el.classList.contains('active'));}
function refreshHeader(){
  const ta=STATE.spaces.reduce((s,sp)=>s+spArea(sp),0);
  const pyeong=(ta*0.3025).toFixed(1);
  const floorPyeong=document.getElementById('t-floor-pyeong');
  if(floorPyeong) floorPyeong.textContent=pyeong;
  document.getElementById('space-count').textContent=STATE.spaces.length;
  // v5.9: 내력벽은 KPI/카운트 영향 없음 (보여주기 전용)
  const wallCount=STATE.walls.filter(w=>w.wallType!=='bearing').length;
  const oc=STATE.openings.length+wallCount+STATE.furniture.length+STATE.fixtures.length+STATE.lights.length+STATE.electric.length+STATE.texts.length+STATE.measures.length;
  document.getElementById('object-count').textContent=oc;
}
function refreshSpaceList(){
  const list=document.getElementById('space-list');
  if(STATE.spaces.length===0){list.innerHTML='<p style="color:var(--text-tertiary);font-size:10px;text-align:center;padding:14px">공간 없음</p>';return;}
  list.innerHTML=STATE.spaces.map(s=>{
    const td=SPACE_TYPES[s.type];
    const sel=STATE.selectedKind==='space'&&STATE.selectedId===s.id||STATE.boxSelection.some(b=>b.kind==='space'&&b.id===s.id);
    return '<div class="space-item'+(sel?' selected':'')+'" data-id="'+s.id+'" style="border-left-color:'+td.color+'">'+
      '<div class="si-head"><span class="si-name">'+escapeHtml(s.name)+'</span>'+
      '<span class="si-type" style="background:'+td.color+'33;color:'+td.color+'">'+escapeHtml(td.name)+'</span></div>'+
      '<div class="si-stats"><span><span class="num">'+spArea(s).toFixed(1)+'</span>㎡</span>'+
      '<span><span class="num">'+spWall(s).toFixed(1)+'</span>벽㎡</span>'+
      '<span><span class="num">'+spPeri(s).toFixed(1)+'</span>m</span></div></div>';
  }).join('');
  list.querySelectorAll('.space-item').forEach(el=>el.addEventListener('click',()=>selectObj('space',el.dataset.id)));
}

// *** 디테일 — 도어/창 W×H×D 편집 UI (요구사항 #2, #3) ***
// ===== 2026-08-30: 조명 배열 배치 설정 패널 (대표 지시) =====
//  조명 도구를 고르고 팔레트에서 항목을 고르면, 아무것도 선택 안 한 상태에서
//  우측 패널에 배치 설정이 뜬다. 도면을 찍기 전에 모양을 정해 두는 자리다.
function _arrayPreviewSVG(cfg){
  const W=150, H=96, pad=16;
  // 2026-08-30: 실제 배치 좌표를 그대로 쓰면 회전까지 그대로 보인다
  const offs=lightArrayOffsets(cfg);
  const xs=offs.map(o=>o.dx), ys=offs.map(o=>o.dy);
  const sw=Math.max(...xs)-Math.min(...xs), sh=Math.max(...ys)-Math.min(...ys);
  const k=Math.min(sw?(W-pad*2)/sw:Infinity, sh?(H-pad*2)/sh:Infinity, 1e6);
  const kk=isFinite(k)?k:0;
  let dots='';
  offs.forEach(o=>{
    const x=W/2+o.dx*kk, y=H/2+o.dy*kk;
    dots+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="5" fill="#D4B872" stroke="#8C7434" stroke-width="1"/>';
  });
  // 중심 십자 — 도면에서 찍는 점
  dots+='<line x1="'+(W/2-7)+'" y1="'+(H/2)+'" x2="'+(W/2+7)+'" y2="'+(H/2)+'" stroke="#D4FF3D" stroke-width="1.2"/>'+
        '<line x1="'+(W/2)+'" y1="'+(H/2-7)+'" x2="'+(W/2)+'" y2="'+(H/2+7)+'" stroke="#D4FF3D" stroke-width="1.2"/>';
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="96" style="display:block">'+
    '<rect x="0.5" y="0.5" width="'+(W-1)+'" height="'+(H-1)+'" fill="rgba(255,255,255,0.02)" '+
    'stroke="rgba(212,184,114,0.35)" stroke-dasharray="4 3"/>'+dots+'</svg>';
}
function renderLightArrayPanel(){
  const dc=document.getElementById('detail-content');
  if(!dc) return;
  const a=lightArrayCfg();
  const span=lightArraySpanMm();
  const n=lightArrayOffsets(a).length;
  const libKey=STATE.selectedLib;
  const def=(typeof libDefForKey==='function')?libDefForKey(LIGHT_LIB,libKey):LIGHT_LIB[libKey];
  const nm=(def&&def.name)||'조명';
  const preset=(p)=>'<button type="button" class="btn sm la-preset" data-c="'+p.cols+'" data-r="'+p.rows+'"'+
    ' style="flex:1 1 30%;padding:4px 2px;font-size:11px'+
    ((a.cols===p.cols&&a.rows===p.rows)?';background:rgba(212,184,114,0.25);border-color:#D4B872;color:#D4B872':'')+
    '">'+p.name+'</button>';
  dc.innerHTML=
    '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">배치할 조명: '+
      '<strong style="color:var(--gold)">'+escapeHtml(nm)+'</strong></p>'+
    '<div style="padding:9px;background:rgba(212,184,114,0.07);border:1px solid rgba(212,184,114,0.45);border-radius:5px">'+
    '<div class="field-label" style="margin-bottom:6px;color:#D4B872">배치 모양 — 중심점 하나로 '+n+'개</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:4px">'+LIGHT_ARRAY_PRESETS.map(preset).join('')+'</div>'+
    // 2026-08-30: 격자 중 어느 칸을 쓸지 — 채움 / ㄱ / ㄴ / ㄷ / ㅁ(테두리)
    '<div style="display:flex;gap:3px;margin-top:5px">'+
      LIGHT_ARRAY_SHAPES.map(sh=>'<button type="button" class="btn sm la-shape" data-s="'+sh.key+'"'+
        ' style="flex:1;padding:4px 2px;font-size:12px;font-weight:700'+
        ((a.shape||'grid')===sh.key?';background:rgba(212,184,114,0.25);border-color:#D4B872;color:#D4B872':'')+
        '">'+sh.name+'</button>').join('')+
    '</div>'+
    '<div style="display:flex;gap:5px;margin-top:6px">'+
      '<div class="field" style="flex:1;margin:0"><label class="field-label">가로 개수</label>'+
      '<input type="text" inputmode="numeric" id="d-la-cols" value="'+a.cols+'"></div>'+
      '<div class="field" style="flex:1;margin:0"><label class="field-label">세로 개수</label>'+
      '<input type="text" inputmode="numeric" id="d-la-rows" value="'+a.rows+'"></div>'+
    '</div>'+
    '<div style="display:flex;gap:5px;margin-top:5px">'+
      '<div class="field" style="flex:1;margin:0"><label class="field-label">가로 간격 (mm)</label>'+
      '<input type="text" inputmode="numeric" id="d-la-dx" value="'+a.dx+'"></div>'+
      '<div class="field" style="flex:1;margin:0"><label class="field-label">세로 간격 (mm)</label>'+
      '<input type="text" inputmode="numeric" id="d-la-dy" value="'+a.dy+'"></div>'+
    '</div>'+
    // 2026-08-30: 촌촌한 간격(150~300)도 많이 쓴다 — 두 줄로
    [[0,4],[4,8]].map(rg=>'<div style="display:flex;gap:3px;margin-top:4px">'+
      LIGHT_ARRAY_GAPS.slice(rg[0],rg[1]).map(v=>'<button type="button" class="btn sm la-gap" data-v="'+v+'"'+
        ' style="flex:1;padding:3px 2px;font-size:11px'+
        ((a.dx===v&&a.dy===v)?';background:rgba(212,184,114,0.25);border-color:#D4B872;color:#D4B872':'')+
        '">'+v+'</button>').join('')+'</div>').join('')+
    '<div style="display:flex;gap:5px;margin-top:6px;align-items:flex-end">'+
      '<div class="field" style="flex:1;margin:0"><label class="field-label">배치 회전 (°)</label>'+
      '<input type="text" inputmode="numeric" id="d-la-ang" value="'+(a.angle||0)+'"></div>'+
      [0,45,90].map(v=>'<button type="button" class="btn sm la-ang" data-v="'+v+'"'+
        ' style="flex:0 0 40px;padding:5px 2px;font-size:11px'+
        ((a.angle||0)===v?';background:rgba(212,184,114,0.25);border-color:#D4B872;color:#D4B872':'')+
        '">'+v+'°</button>').join('')+
    '</div>'+
    '<div class="field-label" style="margin:8px 0 4px;color:#D4B872">배치 견본</div>'+
    _arrayPreviewSVG(a)+
    '<div class="hint" style="margin-top:4px">전체 '+span.w+' × '+span.h+'mm'+
      ((a.angle||0)?(' · '+a.angle+'° 회전'):'')+' · 간격은 50mm 단위로 맞춰집니다<br>'+
      '도면에서 <b>중심점</b>을 클릭하면 '+n+'개가 한 번에 놓입니다</div>'+
    '</div>';
  document.querySelectorAll('.la-preset').forEach(b=>b.addEventListener('click',()=>{
    const a2=lightArrayCfg();
    a2.cols=parseInt(b.dataset.c,10);a2.rows=parseInt(b.dataset.r,10);
    lightArrayCfg();refreshUI();
    showStatus('배치 '+a2.cols+'×'+a2.rows+' — 도면에서 중심점 클릭');
  }));
  document.querySelectorAll('.la-shape').forEach(b=>b.addEventListener('click',()=>{
    const a2=lightArrayCfg();
    a2.shape=b.dataset.s;
    // ㄱㄴㄷㅁ 은 2×2 부터 모양이 다른다 — 너무 작으면 키워준다
    if(a2.shape!=='grid'){ if(a2.cols<2) a2.cols=2; if(a2.rows<2) a2.rows=2; }
    lightArrayCfg();refreshUI();
    showStatus('배치 모양 '+(LIGHT_ARRAY_SHAPES.find(x=>x.key===a2.shape)||{}).name+
      ' — '+lightArrayOffsets().length+'개');
  }));
  document.querySelectorAll('.la-gap').forEach(b=>b.addEventListener('click',()=>{
    const a2=lightArrayCfg();
    a2.dx=parseInt(b.dataset.v,10);a2.dy=parseInt(b.dataset.v,10);
    lightArrayCfg();refreshUI();
  }));
  document.querySelectorAll('.la-ang').forEach(b=>b.addEventListener('click',()=>{
    const a2=lightArrayCfg();
    a2.angle=parseInt(b.dataset.v,10);
    lightArrayCfg();refreshUI();
    showStatus('배치 회전 '+lightArrayCfg().angle+'°');
  }));
  [['d-la-cols','cols'],['d-la-rows','rows'],['d-la-dx','dx'],['d-la-dy','dy'],
   ['d-la-ang','angle']].forEach(([id,key])=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('change',e=>{
      const v=parseInt(e.target.value,10);
      if(!isFinite(v)){refreshUI();return;}
      const a2=lightArrayCfg();
      a2[key]=v;
      lightArrayCfg(); // 개수 1~6, 간격 50 단위로 정리
      refreshUI();
    });
  });
}
function refreshDetail(){
  const empty=document.getElementById('sp-empty');
  const detail=document.getElementById('sp-detail');
  const stats=document.getElementById('detail-stats-card');
  const warn=document.getElementById('detail-warn-card');
  // 2026-08-29: 여러 개를 골랐을 때는 다중 작업 패널을 보여준다.
  //  Shift+클릭 은 boxSelection 을 채우면서 **단일 선택도 그대로 남긴다**(selectObj).
  //  종전 조건은 '단일 선택이 없을 때'만이라, Shift 로 골라도 단일 패널만 떠서
  //  연결·해제 버튼을 못 찾았다 (대표 보고). 2개 이상이면 무조건 다중 패널.
  const _bsel=STATE.boxSelection||[];
  if(_bsel.length>1||(_bsel.length>0&&(!STATE.selectedKind||!STATE.selectedId))){
    empty.style.display='none';detail.style.display='block';
    stats.style.display='none';warn.style.display='none';
    const _kn={space:'공간',wall:'벽',opening:'문·창',furniture:'가구',fixtures:'위생/주방',
      lights:'조명',electric:'전기',hvac:'공조/소방',texts:'텍스트',measures:'치수',
      circles:'원',arcs:'아크',curves:'공선',leaders:'지시선',xlines:'안내선',pillars:'기둥',
      sections:'절단선'};
    const _cnt={};
    STATE.boxSelection.forEach(b=>{_cnt[b.kind]=(_cnt[b.kind]||0)+1;});
    const _lit=selectedLightIds();
    document.getElementById('detail-content').innerHTML=
      '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">'+
        STATE.boxSelection.length+'개</strong></p>'+
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">'+
        Object.keys(_cnt).map(k=>'<span style="font-size:11px;padding:2px 7px;border-radius:10px;'+
          'background:rgba(201,169,97,0.15);color:var(--text-primary)">'+(_kn[k]||k)+' '+_cnt[k]+'</span>').join('')+
      '</div>'+
      (_lit.length?(function(){
        // 2026-08-29: 붙이기만 있으면 반쪽이다 — 때기도 같은 자리에
        const _cn=_lit.filter(id=>switchesOfLight(id).length>0).length;
        const _jn=_lit.filter(id=>(typeof jumpNeighbors==='function')&&jumpNeighbors(id).length>0).length;
        const _b=(id,label,on)=>'<button type="button" class="btn sm" id="'+id+'"'+(on?'':' disabled')+
          ' style="flex:1;min-width:0'+(on?'':';opacity:0.4;cursor:default')+'">'+label+'</button>';
        return '<div style="padding:8px;background:rgba(123,160,91,0.08);border:1px solid rgba(123,160,91,0.35);border-radius:4px">'+
          '<div class="field-label" style="margin-bottom:6px;color:#7BA05B">조명 <b>'+_lit.length+'개</b> — 한 번에 연결·해제</div>'+
          '<div style="display:flex;gap:4px">'+
            _b('d-ms-attach','🔌 스위치에 연결',true)+
            _b('d-ms-detach','🔌 회로 해제'+(_cn?' ('+_cn+')':''),_cn>0)+
          '</div>'+
          '<div style="display:flex;gap:4px;margin-top:4px">'+
            _b('d-ms-chain','🔗 서로 점핑',_lit.length>1)+
            _b('d-ms-unchain','🔗 점핑 해제'+(_jn?' ('+_jn+')':''),_jn>0)+
          '</div>'+
          '<div class="hint" style="margin-top:4px">연결은 버튼 후 스위치 클릭 · 해제는 걸려 있는 스위치에서 바로 빠진다</div></div>';
      })()
        :'<div class="hint">조명을 드래그로 고르면 한 번에 연결·해제할 수 있습니다</div>')+
      '<div class="hint" style="margin-top:8px">개별 속성(인치·길이 등)은 Shift 없이 하나만 클릭하세요</div>'+
      '<button class="btn danger sm" id="d-ms-del" style="width:100%;margin-top:6px">삭제 (Del)</button>';
    const _ab=document.getElementById('d-ms-attach');
    if(_ab) _ab.addEventListener('click',()=>startCircuitAttach(_lit));
    const _cb=document.getElementById('d-ms-chain');
    if(_cb) _cb.addEventListener('click',()=>chainSelectedLights(_lit));
    const _xb=document.getElementById('d-ms-detach');
    if(_xb) _xb.addEventListener('click',()=>detachSelectedLights(_lit));
    const _ub=document.getElementById('d-ms-unchain');
    if(_ub) _ub.addEventListener('click',()=>unchainSelectedLights(_lit));
    const _db=document.getElementById('d-ms-del');
    if(_db) _db.addEventListener('click',deleteSelected);
    return;
  }
  // 2026-08-30: 조명 도구 + 팔레트 선택 상태면 배치 설정을 보여준다 (찍기 전에 모양을 정하는 자리)
  if(!STATE.selectedKind||!STATE.selectedId){
    if(STATE.selectedTool==='light'&&STATE.selectedLib&&typeof lightArrayCfg==='function'){
      empty.style.display='none';detail.style.display='block';
      stats.style.display='none';warn.style.display='none';
      renderLightArrayPanel();
      return;
    }
    empty.style.display='block';detail.style.display='none';return;
  }
  empty.style.display='none';detail.style.display='block';
  stats.style.display='none';warn.style.display='none';
  const dc=document.getElementById('detail-content');

  if(STATE.selectedKind==='space'){
    const s=STATE.spaces.find(x=>x.id===STATE.selectedId);
    if(!s) return;
    // v5.8: 자재 누락 방지 — 마이그레이션
    if(!s.floorMaterial){s.floorMaterial=defaultMaterials(s.type).floor;}
    if(!s.ceilingMaterial){s.ceilingMaterial='GYPSUM';}
    dc.innerHTML=
      '<div class="field"><label class="field-label">이름</label><input type="text" id="d-name" value="'+escapeHtml(s.name)+'"></div>'+
      '<div class="field"><label class="field-label">타입</label><select id="d-type">'+
      Object.entries(SPACE_TYPES).map(([k,td])=>'<option value="'+k+'"'+(k===s.type?' selected':'')+'>'+td.name+'</option>').join('')+'</select></div>'+
      '<div class="field"><label class="field-label">개별 천장고 (mm)</label>'+
      '<input type="text" inputmode="decimal" id="d-ch" value="'+(s.ceilingHeight_mm||'')+'" placeholder="'+STATE.ceilingHeight+'"></div>'+
      // v5.8: 바닥재 / 벽자재 드롭다운
      '<div class="field-row"><div class="field"><label class="field-label">바닥재</label>'+
      '<select id="d-floor">'+
      Object.entries(FLOOR_MATERIALS).map(([k,m])=>'<option value="'+k+'"'+(k===s.floorMaterial?' selected':'')+'>'+m.name+'</option>').join('')+
      '</select></div>'+
      '<div class="field"><label class="field-label">벽자재 (일괄)</label>'+
      (function(){ // 2026-08-22: 대표 지시 10번 — 공간의 모든 벽에 일괄 적용 (개별 설정은 벽 선택)
        const spWalls=STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine);
        const set=[...new Set(spWalls.map(w=>w.finishMaterial||''))];
        const common=set.length===1?set[0]:null;
        return '<select id="d-wallall" title="이 공간의 모든 벽에 일괄 적용 — 개별 설정은 벽을 직접 선택">'+
          '<option value=""'+(common===''||common===null?' selected':'')+'>'+(common===null?'(혼합/개별)':'미정')+'</option>'+
          Object.entries(WALL_MATERIALS).map(([k,m])=>'<option value="'+k+'"'+(k===common?' selected':'')+'>'+m.name+'</option>').join('')+
        '</select>';
      })()+
      '</div></div>'+
      '<div class="field-row"><div class="field"><label class="field-label">자재 등급</label>'+
      '<select id="d-grade"><option value="STANDARD"'+(s.materialGrade==='STANDARD'?' selected':'')+'>표준</option>'+
      '<option value="PREMIUM"'+(s.materialGrade==='PREMIUM'?' selected':'')+'>프리미엄</option>'+
      '<option value="LUXURY"'+(s.materialGrade==='LUXURY'?' selected':'')+'>럭셔리</option></select></div>'+
      '<div class="field"><label class="field-label">난이도</label>'+
      '<select id="d-diff"><option value="NORMAL"'+(s.difficulty==='NORMAL'?' selected':'')+'>보통</option>'+
      '<option value="HARD"'+(s.difficulty==='HARD'?' selected':'')+'>높음</option>'+
      '<option value="VERY_HARD"'+(s.difficulty==='VERY_HARD'?' selected':'')+'>최고</option></select></div></div>'+
      '<button class="btn sm" id="d-autofurnish" style="width:100%;margin-top:6px" title="공간 타입에 맞는 가구 세트 자동 배치 (Ctrl+Z 취소)">⚡ AI 자동 가구 배치</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>'+
      (SPACE_TYPES[s.type].waterproof?
        '<div style="margin-top:10px;padding:8px;background:rgba(91,160,212,0.08);border:1px solid rgba(91,160,212,0.3);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#5BA0D4">방수 적용 여부</div>'+
        '<div style="display:flex;gap:4px">'+
        '<button class="btn sm'+(s.waterproofApplied===true?' active':'')+'" id="wp-yes" style="flex:1'+(s.waterproofApplied===true?';background:rgba(91,160,212,0.25);border-color:#5BA0D4;color:#5BA0D4':'')+'" >✓ 적용</button>'+
        '<button class="btn sm'+(s.waterproofApplied===false?' active':'')+'" id="wp-no"  style="flex:1'+(s.waterproofApplied===false?';background:rgba(226,114,91,0.2);border-color:#E2725B;color:#E2725B' :'')+'" >✗ 미적용</button>'+
        '<button class="btn sm'+(s.waterproofApplied==null?' active':'')+'"  id="wp-null" style="flex:1'+(s.waterproofApplied==null ?';background:rgba(201,169,97,0.15);border-color:var(--gold);color:var(--gold)':'')+'" >? 미결정</button>'+
        '</div></div>' : '')+
      // 2026-08-24: 계단실 타입 — 공간 자동 맞춤 계단 옵션 (대표 지시)
      (s.type==='STAIRS'?(function(){
        const st=s.stair||{};
        const info=typeof spaceStairInfo==='function'?spaceStairInfo(s):null;
        if(!info) return '<div class="warn warning" style="margin-top:8px">⚠ 공간이 너무 작아 계단 표시 불가 (한 변 600mm 이상 필요)</div>';
        const isTurn=info.type!=='I';
        const fh=Math.round(st.floorHeight_mm||2800);
        const riser=Math.round(fh/info.N);
        const rw=riser<160||riser>200;
        const rot=(((Math.round((st.rot||0)/90)*90)%360)+360)%360;
        const tsel=(v,l)=>'<option value="'+v+'"'+((st.type==='L'||st.type==='U'?st.type:'I')===v?' selected':'')+'>'+l+'</option>';
        return '<div style="margin-top:10px;padding:8px;background:rgba(142,123,92,0.10);border:1px solid rgba(142,123,92,0.4);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#C9A961">계단 설정 — 공간 크기 자동 맞춤</div>'+
        '<div class="field"><label class="field-label">유형</label><select id="stx-type">'+tsel('I','직선')+tsel('L','ㄱ자 (꺾임)')+tsel('U','U턴 (되돌음)')+'</select></div>'+
        '<div class="field-row">'+
        '<div class="field"><label class="field-label">단수 (자동 '+info.N+')</label><input type="text" inputmode="decimal" id="stx-count" value="'+(st.stepCount||'')+'" placeholder="'+info.N+'" step="1" min="2"></div>'+
        (isTurn?'<div class="field"><label class="field-label">꺾임 전 단수 (자동 '+info.N1+')</label><input type="text" inputmode="decimal" id="stx-split" value="'+(st.splitCount||'')+'" placeholder="'+info.N1+'" step="1" min="1"></div>'
               :'<div class="field"><label class="field-label">층높이 (mm)</label><input type="text" inputmode="decimal" id="stx-fh" value="'+fh+'" step="50" min="1000"></div>')+
        '</div>'+
        (isTurn?'<div class="field-row">'+
        '<div class="field"><label class="field-label">'+(info.type==='U'?'참 깊이':'플라이트 폭')+' (자동 '+Math.round(info.type==='U'?info.L0:info.W)+')</label><input type="text" inputmode="decimal" id="stx-w" value="'+(st.width_mm||'')+'" placeholder="'+Math.round(info.type==='U'?info.L0:info.W)+'" step="50" min="300"></div>'+
        '<div class="field"><label class="field-label">층높이 (mm)</label><input type="text" inputmode="decimal" id="stx-fh" value="'+fh+'" step="50" min="1000"></div>'+
        '</div>':'')+
        '<div class="hint">디딤판 '+(info.type==='I'?Math.round(info.T):Math.round(info.T1)+' / '+Math.round(info.T2))+'mm (자동) · 챌판 <b style="color:'+(rw?'#E2725B':'#7BA05B')+'">'+riser+'mm</b>'+(rw?' ⚠ 권장 160~200':' ✓ 적정')+'</div>'+
        '<div style="display:flex;gap:4px;margin-top:4px">'+
        '<button type="button" class="btn sm" id="stx-updn" style="flex:1">'+((st.upDir||'up')==='down'?'DN ↓':'UP ↑')+'</button>'+
        '<button type="button" class="btn sm" id="stx-brk" style="flex:1'+(st.showBreak!==false?';background:rgba(201,169,97,0.18);border-color:var(--gold);color:var(--gold)':'')+'">절단선</button>'+
        '<button type="button" class="btn sm" id="stx-rot" style="flex:1">↻ '+rot+'°</button>'+
        '<button type="button" class="btn sm" id="stx-mir" style="flex:1'+(st.mirror?';background:rgba(201,169,97,0.18);border-color:var(--gold);color:var(--gold)':'')+'">↔ 미러</button>'+
        '</div></div>';
      })():'');
    document.getElementById('d-name').addEventListener('change',e=>{s.name=e.target.value;renderAll();refreshUI();});
    document.getElementById('d-type').addEventListener('change',e=>{
      s.type=e.target.value;
      // v5.8: 타입 변경 시 자재 기본값 자동 갱신 (사용자 미설정 시)
      const dm=defaultMaterials(s.type);
      s.floorMaterial=dm.floor;
      STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine).forEach(w=>w.finishMaterial=dm.wall);
      renderAll();refreshUI();
    });
    document.getElementById('d-ch').addEventListener('change',e=>{s.ceilingHeight_mm=e.target.value?parseInt(e.target.value):null;refreshUI();});
    document.getElementById('d-floor').addEventListener('change',e=>{s.floorMaterial=e.target.value;saveHistory();refreshUI();showStatus('바닥재: '+FLOOR_MATERIALS[e.target.value].name);});
    // 2026-08-22: 벽자재 일괄 (대표 지시 10번)
    const _wAll=document.getElementById('d-wallall');
    if(_wAll) _wAll.addEventListener('change',e=>{
      const v=e.target.value; if(!v) return;
      let n=0;
      STATE.walls.forEach(w=>{if(w.spaceId===s.id&&!w.isLine){w.finishMaterial=v;n++;}});
      saveHistory();renderAll();refreshUI();
      showStatus('벽자재 일괄: '+(WALL_MATERIALS[v]?.name||v)+' — '+n+'개 벽');
    });
    document.getElementById('d-grade').addEventListener('change',e=>{s.materialGrade=e.target.value;refreshUI();});
    document.getElementById('d-diff').addEventListener('change',e=>{s.difficulty=e.target.value;refreshUI();});
    document.getElementById('d-del').addEventListener('click',deleteSelected);
    if(SPACE_TYPES[s.type].waterproof){
      const setWP=v=>{s.waterproofApplied=v;saveHistory();refreshUI();};
      document.getElementById('wp-yes').addEventListener('click',()=>setWP(true));
      document.getElementById('wp-no').addEventListener('click',()=>setWP(false));
      document.getElementById('wp-null').addEventListener('click',()=>setWP(null));
    }
    // 2026-08-24 v6.0: AI 자동 가구 배치
    const afBtn=document.getElementById('d-autofurnish');
    if(afBtn) afBtn.addEventListener('click',()=>autoFurnish(s.id));
    // 2026-08-24: 계단 설정 리스너 (계단실 타입)
    if(s.type==='STAIRS'){
      const st=s.stair||(s.stair={});
      const upd=()=>{saveHistory();renderAll();refreshUI();};
      const q=id=>document.getElementById(id);
      const numOrAuto=(e,min,key)=>{ // 빈값 = 자동 복귀
        const raw=(e.target.value||'').trim();
        if(raw===''){delete st[key];upd();return;}
        const v=parseInt(raw,10);
        if(isFinite(v)&&v>=min){st[key]=v;upd();}else refreshUI();
      };
      if(q('stx-type')) q('stx-type').addEventListener('change',e=>{st.type=e.target.value;upd();});
      if(q('stx-count')) q('stx-count').addEventListener('change',e=>numOrAuto(e,2,'stepCount'));
      if(q('stx-split')) q('stx-split').addEventListener('change',e=>numOrAuto(e,1,'splitCount'));
      if(q('stx-w')) q('stx-w').addEventListener('change',e=>numOrAuto(e,300,'width_mm'));
      if(q('stx-fh')) q('stx-fh').addEventListener('change',e=>{const v=parseInt(e.target.value,10);if(isFinite(v)&&v>=1000){st.floorHeight_mm=v;upd();}else refreshUI();});
      if(q('stx-updn')) q('stx-updn').addEventListener('click',()=>{st.upDir=(st.upDir||'up')==='up'?'down':'up';upd();});
      if(q('stx-brk')) q('stx-brk').addEventListener('click',()=>{st.showBreak=st.showBreak===false?true:false;upd();});
      if(q('stx-rot')) q('stx-rot').addEventListener('click',()=>{st.rot=(((st.rot||0)+90))%360;upd();});
      if(q('stx-mir')) q('stx-mir').addEventListener('click',()=>{st.mirror=!st.mirror;upd();});
    }
    stats.style.display='block';warn.style.display='block';
    document.getElementById('cell-floor').textContent=spArea(s).toFixed(2);
    document.getElementById('cell-ceiling').textContent=spArea(s).toFixed(2);
    document.getElementById('cell-wall').textContent=spWall(s).toFixed(2);
    document.getElementById('cell-peri').textContent=spPeri(s).toFixed(2);
    const ws=computeWarns(s);
    document.getElementById('detail-warns').innerHTML=ws.length===0?'<div class="warn success">✓ 입력 완료</div>':ws.map(w=>'<div class="warn '+w.lv+'">'+w.msg+'</div>').join('');
  }
  else if(STATE.selectedKind==='opening'){
    // *** 문/창 W×H×D 편집 ***
    const o=STATE.openings.find(x=>x.id===STATE.selectedId);
    if(!o) return;
    const isDoor=o.type==='DOOR';
    const lib=isDoor?DOOR_TYPES:WINDOW_TYPES;
    const sub=lib[o.subType]||Object.values(lib)[0];
    dc.innerHTML=
      '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">'+(isDoor?'문':'창')+'</strong></p>'+
      '<div class="field"><label class="field-label">'+(isDoor?'문 종류':'창 종류')+'</label>'+
      '<select id="d-subtype">'+Object.entries(lib).map(([k,d])=>'<option value="'+k+'"'+(k===o.subType?' selected':'')+'>'+d.name+'</option>').join('')+'</select></div>'+
      '<div class="field-row-3">'+
      '<div class="field"><label class="field-label">가로 W (mm)</label><input type="text" inputmode="decimal" id="d-w" value="'+o.width_mm+'" step="50"></div>'+
      '<div class="field"><label class="field-label">세로 H (mm)</label><input type="text" inputmode="decimal" id="d-h" value="'+o.height_mm+'" step="50"></div>'+
      '<div class="field"><label class="field-label">뎁스 D (mm)</label><input type="text" inputmode="decimal" id="d-d" value="'+o.depth_mm+'" step="10"></div>'+
      '</div>'+
      (!isDoor?'<div class="field"><label class="field-label">창대 높이 (mm) — 바닥에서</label><input type="text" inputmode="decimal" id="d-sill" value="'+(o.sillHeight_mm||0)+'" step="50"></div>':'')+
      (isDoor?'<div class="field"><label class="field-label">벽면 차감</label>'+
      '<div class="align-toggle" id="d-subtract-toggle" role="group" aria-label="도어 차감 모드">'+
      '<button type="button" class="align-btn'+((o.subtractMode||'double')==='single'?' active':'')+'" data-sub="single" title="단면차감 — 외부문(현관·발코니) 등">단면</button>'+
      '<button type="button" class="align-btn'+((o.subtractMode||'double')==='double'?' active':'')+'" data-sub="double" title="양면차감 — 내부문(방문·미닫이) 등 양쪽 모두 마감 차감">양면</button>'+
      '</div></div>':'')+
      '<div class="field"><label class="field-label">회전 (°) — 0~359</label>'+
      '<input type="text" inputmode="decimal" id="d-angle" value="'+Math.round(o.angle||0)+'" step="1" min="-360" max="360"></div>'+
      '<div class="hint">통상값 자동 적용. 회전은 벽 가까이 추가 시 자동 정렬됨.</div>'+
      (!(o.spaceId&&STATE.spaces.some(s=>s.id===o.spaceId))?'<div class="warn warning" style="margin-top:6px">⚠ 벽 미부착 — 공간 모서리나 벽 가까이 재배치하세요.</div>':'')+
      '<div style="display:flex;gap:4px;margin-top:6px">'+
      '<button class="btn sm" id="d-rot-90" style="flex:1">+90°</button>'+
      '<button class="btn sm" id="d-rot-m90" style="flex:1">−90°</button>'+
      '<button class="btn sm" id="d-rot-180" style="flex:1">180°</button>'+
      '<button class="btn sm" id="d-flip" style="flex:1'+(o.flipped?';background:rgba(201,169,97,0.18);border-color:var(--gold);color:var(--gold)':'')+'" title="힌지 좌우 반전">↔ 반전</button>'+
      '</div>'+
      '<button class="btn sm" id="d-dup" style="width:100%;margin-top:5px">복제</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>';
    document.getElementById('d-subtype').addEventListener('change',e=>{
      o.subType=e.target.value;
      const def=lib[o.subType];
      // 통상값 자동 적용
      o.width_mm=def.w;o.height_mm=def.h;o.depth_mm=def.d;
      if(!isDoor) o.sillHeight_mm=def.sill;
      saveHistory();renderAll();refreshUI();
    });
    // 2026-08-19: 빈 값·NaN 가드 — 백스페이스로 지운 채 포커스가 빠져도 기존 값 유지 (태블릿 키보드)
    document.getElementById('d-w').addEventListener('change',e=>{const v=_numField(e,10);if(v==null){refreshUI();return;}o.width_mm=v;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-h').addEventListener('change',e=>{const v=_numField(e,10);if(v==null){refreshUI();return;}o.height_mm=v;saveHistory();refreshUI();});
    document.getElementById('d-d').addEventListener('change',e=>{const v=_numField(e,10);if(v==null){refreshUI();return;}o.depth_mm=v;saveHistory();refreshUI();});
    if(!isDoor){
      const sf=document.getElementById('d-sill');
      if(sf) sf.addEventListener('change',e=>{const v=_numField(e,0);if(v==null){refreshUI();return;}o.sillHeight_mm=v;saveHistory();refreshUI();});
    }
    document.getElementById('d-angle').addEventListener('change',e=>{
      const v=parseFloat(e.target.value);
      if(isFinite(v)){o.angle=((v%360)+360)%360;saveHistory();renderAll();refreshUI();}
    });
    document.getElementById('d-rot-90').addEventListener('click',()=>{o.angle=((o.angle||0)+90)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-rot-m90').addEventListener('click',()=>{o.angle=((o.angle||0)-90+360)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-rot-180').addEventListener('click',()=>{o.angle=((o.angle||0)+180)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-flip').addEventListener('click',()=>{o.flipped=!o.flipped;saveHistory();renderAll();refreshUI();});
    // v5.9: 도어 차감 모드 토글
    const subToggle=document.getElementById('d-subtract-toggle');
    if(subToggle){
      subToggle.querySelectorAll('.align-btn').forEach(b=>{
        b.addEventListener('click',()=>{
          o.subtractMode=b.dataset.sub;
          saveHistory();refreshUI();
          showStatus('차감 모드: '+(o.subtractMode==='double'?'양면 (×2)':'단면 (×1)'));
        });
      });
    }
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
  else if(STATE.selectedKind==='wall'){
    const w=STATE.walls.find(x=>x.id===STATE.selectedId);
    if(!w) return;
    dc.innerHTML=
      '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">벽</strong></p>'+
      '<div class="field"><label class="field-label">벽 마감재</label>'+
      '<select id="d-wmat">'+
      '<option value=""'+(w.finishMaterial?'':' selected')+'>미정</option>'+
      Object.entries(WALL_MATERIALS).map(([k,m])=>'<option value="'+k+'"'+(k===w.finishMaterial?' selected':'')+'>'+m.name+'</option>').join('')+
      '</select></div>'+
      '<button class="btn sm" id="d-wmat-all" style="width:100%;margin:2px 0 8px" title="현재 선택한 마감재를 도면의 모든 벽에 적용">⇊ 이 자재를 모든 벽에 적용</button>'+
      '<div class="field"><label class="field-label">개별 높이 (mm)</label>'+
      '<input type="text" inputmode="decimal" id="d-wh" value="'+(w.height_mm||'')+'" placeholder="공간 천장고 따름" step="50"></div>'+
      '<div class="field"><label class="field-label">두께 (mm)</label>'+
      '<input type="text" inputmode="decimal" id="d-wthick" value="'+(w.thickness||100)+'" step="10"></div>'+
      '<button class="btn sm" id="d-dup" style="width:100%;margin-top:6px">복제</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>';
    // 2026-08-22: 전체 벽 일괄 적용 (대표 지시 10번)
    document.getElementById('d-wmat-all').addEventListener('click',()=>{
      const v=w.finishMaterial;
      if(!v){cmdToast('먼저 이 벽의 마감재를 선택하세요');return;}
      const total=STATE.walls.filter(x=>!x.isLine).length;
      if(!confirm('도면의 모든 벽 '+total+'개에 "'+(WALL_MATERIALS[v]?.name||v)+'" 적용?'))return;
      let n=0;STATE.walls.forEach(x=>{if(!x.isLine){x.finishMaterial=v;n++;}});
      saveHistory();renderAll();refreshUI();
      showStatus('전체 벽 마감재: '+(WALL_MATERIALS[v]?.name||v)+' — '+n+'개');
    });
    document.getElementById('d-wmat').addEventListener('change',e=>{w.finishMaterial=e.target.value||null;saveHistory();refreshUI();showStatus('벽 마감재: '+(WALL_MATERIALS[e.target.value]?.name||'미정'));});
    document.getElementById('d-wh').addEventListener('change',e=>{w.height_mm=e.target.value?parseInt(e.target.value):null;saveHistory();refreshUI();});
    document.getElementById('d-wthick').addEventListener('change',e=>{w.thickness=parseInt(e.target.value)||100;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
  else if(STATE.selectedKind==='sections'){
    // 2026-08-30: 절단선 — 방향과 깊이를 여기서 바로 고친다 (대표 지시)
    const sc=(STATE.sections||[]).find(x=>x.id===STATE.selectedId);
    if(!sc) return;
    const V=sectionViewDir(sc);
    const len=Math.round(V.L);
    const dbtn=v=>'<button type="button" class="btn sm sc-d" data-v="'+v+'" style="flex:1;padding:3px 2px;'+
      'font-size:11px'+(sectionDepthOf(sc)===(v?v:Infinity)?
      ';background:rgba(201,169,97,0.25);border-color:#C9A961;color:#C9A961':'')+'">'+
      (v?(v/1000+'m'):'전부')+'</button>';
    dc.innerHTML=
      '<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: '+
        '<strong style="color:var(--gold)">절단선 '+sectionLabelOf(sc)+'</strong> — 길이 '+len+'mm</p>'+
      '<div class="field"><label class="field-label">이름 (도면·인쇄에 표기)</label>'+
        '<input type="text" id="sc-name" value="'+escapeHtml(sc.name||'')+'" placeholder="예: 주방 정면"></div>'+
      '<div class="field-label" style="margin-top:8px">보는 방향</div>'+
      '<button type="button" class="btn sm" id="sc-flip" style="width:100%">⇄ 반대쪽에서 보기 (지금 '+
        elevCompass(V.dx,V.dy)+')</button>'+
      '<div class="field-label" style="margin-top:8px">깊이 — 절단면에서 이만큼 앞까지</div>'+
      '<div style="display:flex;gap:3px">'+SECTION_DEPTHS.map(dbtn).join('')+'</div>'+
      '<button class="btn sm gold" id="sc-open" style="width:100%;margin-top:9px;font-weight:700">'+
        '📐 이 방향 입면도 보기</button>'+
      '<button class="btn danger sm" id="sc-del" style="width:100%;margin-top:5px">삭제 (Del)</button>'+
      '<div class="hint" style="margin-top:8px">화살표가 가리키는 쪽을 바라본 입면이 나옵니다.</div>';
    document.getElementById('sc-name').addEventListener('change',e=>{
      sc.name=e.target.value.trim();saveHistory();renderAll();refreshUI();});
    document.getElementById('sc-flip').addEventListener('click',()=>{
      sc.side=(sc.side===-1)?1:-1;saveHistory();renderAll();refreshUI();
      showStatus('절단선 '+sectionLabelOf(sc)+' — '+elevCompass(sectionViewDir(sc).dx,sectionViewDir(sc).dy)+' 을 봅니다');});
    document.querySelectorAll('.sc-d').forEach(b=>b.addEventListener('click',()=>{
      sc.depth_mm=parseInt(b.dataset.v,10)||0;saveHistory();refreshUI();}));
    document.getElementById('sc-open').addEventListener('click',()=>
      openElevationDialog(null,{mode:'section',sectionId:sc.id}));
    document.getElementById('sc-del').addEventListener('click',deleteSelected);
  }
  else{
    const kn={wall:'벽',furniture:'가구',fixtures:'위생/주방',lights:'조명',electric:'전기',texts:'텍스트',measures:'치수',xlines:'안내선 (무한)',leaders:'지시선',circles:'원',arcs:'아크',curves:'곡선',hvac:'공조/소방',pillars:'기둥',sections:'절단선'};
    const arr=getArr(STATE.selectedKind);
    const obj=arr?arr.find(x=>x.id===STATE.selectedId):null;
    const hasAngle=obj&&'angle' in obj;
    // 2026-08-25: 라인·간접조명 길이 (대표 지시) — 하나 넣고 길이를 입력해 길게
    const isLinear=STATE.selectedKind==='lights'&&obj&&typeof isLinearLight==='function'&&isLinearLight(obj.type);
    let lenHtml='';
    if(isLinear){
      const L=linearLightLen(obj);
      lenHtml=
        '<div style="margin-top:8px;padding:8px;background:rgba(212,184,114,0.08);border:1px solid rgba(212,184,114,0.35);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#D4B872">조명 길이</div>'+
        '<div class="field"><input type="text" inputmode="decimal" id="d-ll-len" value="'+L+'" step="100" min="300" max="30000"></div>'+
        '<div style="display:flex;flex-wrap:wrap;gap:3px">'+
        [600,900,1200,1500,1800,2400,3000,4500].map(v=>'<button type="button" class="btn sm ll-preset" data-len="'+v+'" style="flex:1 1 22%;padding:4px 2px'+(v===L?';background:rgba(212,184,114,0.25);border-color:#D4B872;color:#D4B872':'')+'">'+(v>=1000?(v/1000)+'m':v)+'</button>').join('')+
        '</div>'+
        '<div class="hint" style="margin-top:4px">양 끝 <b style="color:#E2725B">●</b> 핸들을 끌어도 길이 조절 (10mm 단위) · 회전은 아래 각도</div>'+
        '</div>';
    }
    // 2026-08-25: 다운라이트 인치 선택 (대표 지시) — 2~6인치, 타공경 자동
    // 2026-08-30: 방습등도 인치로 관리한다 (대표 지시)
    const isBathLight=STATE.selectedKind==='lights'&&obj&&obj.type==='bath_light';
    const isDownlight=STATE.selectedKind==='lights'&&obj&&(obj.type==='downlight'||isBathLight);
    let inchHtml='';
    if(isDownlight){
      const cur=isBathLight?bathLightInchOf(obj)
        :Math.round(obj.inch||STATE.downlightInch||DOWNLIGHT_INCH_DEFAULT);
      const d=DOWNLIGHT_INCH[cur]||DOWNLIGHT_INCH[DOWNLIGHT_INCH_DEFAULT];
      inchHtml=
        '<div style="margin-top:8px;padding:8px;background:rgba(212,184,114,0.08);border:1px solid rgba(212,184,114,0.35);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#D4B872">'+(isBathLight?'방습등 규격':'다운라이트 규격')+'</div>'+
        '<div class="field"><select id="d-dl-inch">'+
        Object.keys(DOWNLIGHT_INCH).map(k=>'<option value="'+k+'"'+(String(cur)===String(k)?' selected':'')+'>'+
          DOWNLIGHT_INCH[k].label+(isBathLight?(' (외경 Ø'+DOWNLIGHT_INCH[k].outer+')'):(' (타공 Ø'+DOWNLIGHT_INCH[k].bore+')'))+'</option>').join('')+
        '</select></div>'+
        '<div class="hint">'+(isBathLight?('외경 Ø'+d.outer+'mm — 직부형이라 타공은 없습니다')
          :('외경 Ø'+d.outer+'mm · 타공 Ø'+d.bore+'mm — 선택한 인치가 다음 배치의 기본값이 됩니다'))+'</div>'+
        '<button type="button" class="btn sm" id="d-dl-apply-all" style="width:100%;margin-top:4px">같은 공간 '+(isBathLight?'방습등':'다운라이트')+' 전체 적용</button>'+
        '</div>';
    }
    // 2026-08-28: 객체별 이름 글씨 표기 (대표 지시 — 평소엔 꺼두고 필요한 것만 켜둔다)
    const canLabel=!!obj&&['lights','electric','hvac','fixtures'].indexOf(STATE.selectedKind)>=0
      &&typeof symbolLabelEligible==='function'&&typeof symbolDefOf==='function'
      &&symbolLabelEligible(STATE.selectedKind,symbolDefOf(STATE.selectedKind,obj));
    let labelHtml='';
    if(canLabel){
      const _st=(obj.showLabel===true)?'on':(obj.showLabel===false)?'off':'auto';
      labelHtml=
        '<div style="margin-top:8px;padding:8px;background:rgba(123,160,91,0.08);border:1px solid rgba(123,160,91,0.35);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#7BA05B">이름 글씨 표기</div>'+
        '<div style="display:flex;gap:4px">'+
        [['auto','기본'],['on','항상 ON'],['off','숨김']].map(function(kv){
          return '<button type="button" class="btn sm d-sym-lab" data-v="'+kv[0]+'" style="flex:1'+
            (_st===kv[0]?';background:rgba(123,160,91,0.25);border-color:#7BA05B;color:#7BA05B':'')+'">'+kv[1]+'</button>';
        }).join('')+
        '</div>'+
        '<div class="hint" style="margin-top:4px">기본 = 상단 [🏷 라벨] 설정을 따름 (지금: <b>'+
        SYMBOL_LABEL_DESC[symbolLabelMode()]+'</b>) · 선택 중인 기호는 언제나 이름이 보입니다</div></div>';
    }
    // 2026-08-27: 조명 점핑 패널 (대표 지시) — 조명↔조명 연결
    const isLightSel=STATE.selectedKind==='lights'&&obj;
    // 2026-08-30: 빛 표현 설정 (대표 지시) — 종류 기본값 위에 이 조명만 조정
    let glowHtml='';
    if(isLightSel&&typeof resolveGlow==='function'){
      const _lin=(typeof isLinearLight==='function')&&isLinearLight(obj.type);
      const _gv=resolveGlow(obj);
      const _base=_lin?linearGlowOf(obj.type):pointGlowOf(obj);
      const _cur=_lin?Math.round(_gv.spread):Math.round(_gv.r);
      const _bas=_lin?Math.round(_base.spread):Math.round(_base.r);
      const _lbl=_lin?'퍼짐 (편측)':'빛 반경';
      const _custom=hasCustomGlow(obj);
      glowHtml=
        '<div style="margin-top:8px;padding:8px;background:rgba(212,184,114,0.07);'+
        'border:1px solid rgba(212,184,114,0.40);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#D4B872">\uD83D\uDCA1 빛 표현 (켰을 때)</div>'+
        '<div style="display:flex;gap:5px">'+
        '<div class="field" style="flex:1;margin:0"><label class="field-label">'+_lbl+' (mm)</label>'+
        '<input type="text" inputmode="numeric" id="d-glow-size" value="'+_cur+'"></div>'+
        '<div class="field" style="flex:1;margin:0"><label class="field-label">세기 (%)</label>'+
        '<input type="text" inputmode="numeric" id="d-glow-peak" value="'+Math.round(_gv.peak*100)+'"></div>'+
        '</div>'+
        (_lin?'<div class="field" style="margin:5px 0 0"><label class="field-label">가장자리 흐림 (%)</label>'+
          '<input type="text" inputmode="numeric" id="d-glow-soft" value="'+Math.round((_gv.soft||0)*100)+'"></div>':'')+
        '<div style="display:flex;gap:4px;margin-top:5px">'+
        '<button type="button" class="btn sm" id="d-glow-reset"'+(_custom?'':' disabled')+
          ' style="flex:1'+(_custom?'':';opacity:0.4;cursor:default')+'">기본값</button>'+
        '<button type="button" class="btn sm" id="d-glow-all" style="flex:1">같은 종류 전체</button>'+
        '</div>'+
        '<div class="hint" style="margin-top:4px">'+escapeHtml((_lin?linearLightTagText(obj,symbolDefOf('lights',obj)):(symbolDefOf('lights',obj)||{}).name||'')||'')+
        ' 기본 '+_bas+'mm · '+Math.round(_base.peak*100)+'%'+(_custom?' <b style="color:#D4B872">(조정됨)</b>':'')+'</div></div>';
    }

    // 2026-08-30: 다른 구·다른 스위치의 조명이 점핑으로 묶였을 때 (대표 지시)
    let cflHtml='';
    if(isLightSel&&typeof jumpConflictOf==='function'){
      const _cg=jumpConflictOf(obj.id);
      if(_cg){
        cflHtml=
          '<div style="margin-top:8px;padding:8px;background:rgba(255,59,48,0.10);'+
          'border:1px solid rgba(255,59,48,0.55);border-radius:4px">'+
          '<div class="field-label" style="margin-bottom:6px;color:#FF6B60">'+
          '⚠ 다른 회로가 한 가닥으로 묶였습니다</div>'+
          '<div class="hint" style="margin-bottom:6px;color:var(--text-secondary)">'+
          escapeHtml(jumpConflictText(_cg))+' · 조명 <b>'+_cg.members.length+'개</b>가 점핑으로 이어져 '+
          '한 쪽만 켜도 전부 켜집니다</div>'+
          '<div style="display:flex;gap:4px">'+
          '<button type="button" class="btn sm" id="d-cfl-unify" style="flex:1">한 구로 통일</button>'+
          '<button type="button" class="btn sm" id="d-cfl-cut" style="flex:1">점핑 끊기</button>'+
          '</div>'+
          '<div class="hint" style="margin-top:4px">한 구로 통일 = 묶인 대로 살리고 도면을 맞춘다 · 끊기 = 구별로 나눈다</div></div>';
      }
    }
    // 2026-08-29: 같은 자리에 겹친 조명 경고 + 한 번에 정리 (대표 지시)
    let dupHtml='';
    if(isLightSel&&typeof duplicateLightPeers==='function'){
      const _peers=duplicateLightPeers(obj.id);
      if(_peers.length>1){
        dupHtml=
          '<div style="margin-top:8px;padding:8px;background:rgba(255,59,48,0.10);'+
          'border:1px solid rgba(255,59,48,0.55);border-radius:4px">'+
          '<div class="field-label" style="margin-bottom:6px;color:#FF6B60">'+
          '⚠ 중복 — 이 자리에 조명 <b>'+_peers.length+'개</b>가 겹쳐 있습니다</div>'+
          '<button type="button" class="btn sm" id="d-dup-fix" style="width:100%">겹친 것 정리 — '+(_peers.length-1)+'개 삭제</button>'+
          '<div class="hint" style="margin-top:4px">하나만 남기고 나머지를 지욵니다 · 잠금된 것은 지우지 않습니다</div></div>';
      }
    }
    let jumpHtml='';
    if(isLightSel){
      const nb=(typeof jumpNeighbors==='function')?jumpNeighbors(obj.id):[];
      const linkingJ=!!(window._jumpLink&&window._jumpLink.lightId===obj.id);
      const litNow=(typeof litLightIds==='function')&&litLightIds().has(obj.id);
      const feeder=(STATE.electric||[]).filter(e=>Array.isArray(e.lightIds)&&e.lightIds.indexOf(obj.id)>=0).length;
      jumpHtml=
        '<div style="margin-top:8px;padding:8px;background:rgba(212,184,114,0.08);border:1px solid rgba(212,184,114,0.35);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:6px;color:#D4B872">배선 — 점핑 <b>'+nb.length+'</b>개'+(feeder?' · 스위치 직결':'')+
        ' <span style="color:'+(litNow?'#D4B872':'#7B82B5')+'">'+(litNow?'● 점등 중':'○ 소등')+'</span></div>'+
        '<div style="display:flex;gap:4px">'+
        '<button type="button" class="btn sm" id="d-jump-link" style="flex:1'+(linkingJ?';background:rgba(212,184,114,0.25);border-color:#D4B872;color:#D4B872':'')+'">'+(linkingJ?'점핑 모드 종료 (Esc)':'🔗 조명 점핑 연결')+'</button>'+
        (nb.length?'<button type="button" class="btn sm" id="d-jump-clear" style="flex:1">점핑 전체 해제</button>':'')+
        '</div>'+
        '<div class="hint" style="margin-top:4px">스위치에 직결되지 않아도, 점핑으로 이어진 조명은 함께 켜집니다</div></div>';
    }
    // 2026-08-26: 스위치 회로 패널 (조명 연결·점등 토글)
    const isSwitch=STATE.selectedKind==='electric'&&obj&&/^switch|^dimmer/.test(obj.type||'');
    let circuitHtml='';
    if(isSwitch){
      // 2026-08-30: 구(gang)별 행 — 6구면 6줄. 구마다 연결·점등을 따로 다룬다 (대표 지시)
      const _live=id=>STATE.lights.some(l=>l.id===id);
      const n=Array.isArray(obj.lightIds)?obj.lightIds.filter(_live).length:0;
      const linking=!!(window._circuitLink&&window._circuitLink.switchId===obj.id);
      const _gn=switchGangCount(obj.type);
      const _on=switchGangOn(obj);
      const _target=(linking&&typeof window._circuitLink.gang==='number')?window._circuitLink.gang:-1;
      // 2026-08-30: 대표 지시 — 점등(테스트)과 배선(연결)을 각각 제 박스로 나눈다.
      //  한 줄에 섞여 있어 "지금 몇 구가 켜져 있나"를 한눈에 볼 수가 없었다.
      const _litN=_on.filter((v,i2)=>v&&gangLightIds(obj,i2).filter(_live).length>0).length;
      // ── 1) 점등 테스트 — 실제 스위치 조작판처럼
      const _cols=(_gn<=3)?_gn:((_gn===4)?2:3);
      const plate=[];
      for(let gi=0;gi<_gn;gi++){
        const gl=gangLightIds(obj,gi).filter(_live).length;
        const lit=_on[gi]&&gl>0;
        plate.push(
          '<button type="button" class="gang-on" data-g="'+gi+'"'+(gl?'':' disabled')+
          ' title="'+(gi+1)+'구 — 조명 '+gl+'개"'+
          ' style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;'+
            'padding:7px 2px;border-radius:5px;cursor:'+(gl?'pointer':'default')+';'+
            'font-family:Inter,sans-serif;line-height:1.1;'+
            'border:1px solid '+(lit?'#D4B872':'var(--border,#3D4466)')+';'+
            'background:'+(lit?'rgba(212,184,114,0.28)':'rgba(255,255,255,0.03)')+';'+
            'color:'+(lit?'#D4B872':'var(--text-secondary,#A9B0C9)')+';'+
            (gl?'':'opacity:0.35;')+'">'+
          '<span style="font-size:13px;font-weight:800">'+(gi+1)+'</span>'+
          '<span style="font-size:9.5px;letter-spacing:0.02em">'+(gl?(lit?'ON':'OFF'):'미연결')+'</span>'+
          '</button>');
      }
      const litBox=
        '<div style="margin-top:8px;padding:9px;background:rgba(212,184,114,0.07);'+
          'border:1px solid rgba(212,184,114,0.45);border-radius:5px">'+
        '<div class="field-label" style="margin-bottom:7px;color:#D4B872">'+
          '\uD83D\uDCA1 점등 테스트 — '+_gn+'구'+
          (_litN?' <b>'+_litN+'구 켜짐</b>':' <span style="color:var(--text-tertiary)">전부 꺼짐</span>')+'</div>'+
        '<div style="display:grid;grid-template-columns:repeat('+_cols+',1fr);gap:5px">'+plate.join('')+'</div>'+
        (_gn>1?'<div style="display:flex;gap:4px;margin-top:6px">'+
          '<button type="button" class="btn sm" id="d-gang-all-on" style="flex:1;font-size:11px">모두 켜기</button>'+
          '<button type="button" class="btn sm" id="d-gang-all-off" style="flex:1;font-size:11px">모두 끄기</button>'+
          '</div>':'')+
        '<div class="hint" style="margin-top:5px">누르면 도면의 해당 조명이 켜집니다 · 스위치 더블클릭 = 전체 토글</div>'+
        '</div>';
      // ── 2) 배선 연결 — 어느 구에 어떤 조명이 걸렸나
      const wire=[];
      for(let gi=0;gi<_gn;gi++){
        const gl=gangLightIds(obj,gi).filter(_live).length;
        wire.push(
          '<div style="display:flex;align-items:center;gap:4px;margin-top:3px'+
            (_target===gi?';outline:1px solid #7BA05B;border-radius:4px;padding:2px':'')+'">'+
          '<span style="width:34px;font-size:11px;font-weight:700;color:var(--text-secondary)">'+(gi+1)+'구</span>'+
          '<span style="width:46px;font-size:10.5px;color:var(--text-tertiary)">'+gl+'개</span>'+
          '<button type="button" class="btn sm gang-link" data-g="'+gi+'"'+
            ' style="flex:1;padding:3px 6px;font-size:11px'+
            (_target===gi?';background:rgba(123,160,91,0.25);border-color:#7BA05B;color:#7BA05B':'')+'">'+
            (_target===gi?'연결 중…':'\uD83D\uDD0C 연결')+'</button>'+
          (gl?'<button type="button" class="btn sm gang-clear" data-g="'+gi+'" style="padding:3px 7px;font-size:11px" title="'+(gi+1)+'구 연결 해제">\u2715</button>':'')+
          '</div>');
      }
      circuitHtml=
        litBox+
        '<div style="margin-top:8px;padding:8px;background:rgba(123,160,91,0.08);border:1px solid rgba(123,160,91,0.35);border-radius:4px">'+
        '<div class="field-label" style="margin-bottom:2px;color:#7BA05B">\uD83D\uDD0C 배선 연결 — 조명 <b>'+n+'</b>개</div>'+
        wire.join('')+
        (n?'<button type="button" class="btn sm" id="d-circuit-clear" style="width:100%;margin-top:5px">연결 전체 해제</button>':'')+
        '<div class="hint" style="margin-top:4px">[연결]을 누르고 도면에서 조명을 클릭·드래그하세요</div></div>';
    }
    let extraHtml='';
    if(hasAngle){
      extraHtml=
        '<div class="field"><label class="field-label">회전 (°)</label>'+
        '<input type="text" inputmode="decimal" id="d-angle" value="'+Math.round(obj.angle||0)+'" step="1" min="-360" max="360"></div>'+
        '<div style="display:flex;gap:4px;margin-top:6px">'+
        '<button class="btn sm" id="d-rot-90" style="flex:1">+90°</button>'+
        '<button class="btn sm" id="d-rot-m90" style="flex:1">−90°</button>'+
        '<button class="btn sm" id="d-rot-180" style="flex:1">180°</button>'+
        '</div>';
    }
    dc.innerHTML='<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">'+kn[STATE.selectedKind]+'</strong></p>'+
      cflHtml+dupHtml+lenHtml+inchHtml+glowHtml+labelHtml+jumpHtml+circuitHtml+extraHtml+
      '<button class="btn sm" id="d-dup" style="width:100%;margin-top:6px">복제</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>';
    if(hasAngle){
      document.getElementById('d-angle').addEventListener('change',e=>{
        const v=parseFloat(e.target.value);
        if(isFinite(v)){obj.angle=((v%360)+360)%360;saveHistory();renderAll();refreshUI();}
      });
      document.getElementById('d-rot-90').addEventListener('click',()=>{obj.angle=((obj.angle||0)+90)%360;saveHistory();renderAll();refreshUI();});
      document.getElementById('d-rot-m90').addEventListener('click',()=>{obj.angle=((obj.angle||0)-90+360)%360;saveHistory();renderAll();refreshUI();});
      document.getElementById('d-rot-180').addEventListener('click',()=>{obj.angle=((obj.angle||0)+180)%360;saveHistory();renderAll();refreshUI();});
    }
    if(canLabel){
      document.querySelectorAll('.d-sym-lab').forEach(b=>b.addEventListener('click',()=>{
        const v=b.dataset.v;
        if(v==='auto') delete obj.showLabel; else obj.showLabel=(v==='on');
        saveHistory();renderAll();refreshUI();
        showStatus('이름 글씨: '+(v==='auto'?'기본 (상단 라벨 설정을 따름)':v==='on'?'항상 표시':'숨김'));
      }));
    }
    if(isLightSel){
      // 2026-08-30: 빛 표현 — 입력 즉시 도면에 반영
      const _lin2=(typeof isLinearLight==='function')&&isLinearLight(obj.type);
      const _setGlow=(k,v)=>{
        if(!obj.glow) obj.glow={};
        obj.glow[k]=v;
        saveHistory();renderAll();refreshUI();
      };
      const _gs=document.getElementById('d-glow-size');
      if(_gs) _gs.addEventListener('change',e=>{
        const v=parseInt(e.target.value,10);
        if(!isFinite(v)){refreshUI();return;}
        _setGlow(_lin2?'spread':'r',v);
        cmdToast('빛 '+(_lin2?'퍼짐':'반경')+' '+resolveGlow(obj)[_lin2?'spread':'r']+'mm');
      });
      const _gp=document.getElementById('d-glow-peak');
      if(_gp) _gp.addEventListener('change',e=>{
        const v=parseInt(e.target.value,10);
        if(!isFinite(v)){refreshUI();return;}
        _setGlow('peak',v/100);
        cmdToast('빛 세기 '+Math.round(resolveGlow(obj).peak*100)+'%');
      });
      const _gf=document.getElementById('d-glow-soft');
      if(_gf) _gf.addEventListener('change',e=>{
        const v=parseInt(e.target.value,10);
        if(!isFinite(v)){refreshUI();return;}
        _setGlow('soft',v/100);
      });
      const _gr=document.getElementById('d-glow-reset');
      if(_gr) _gr.addEventListener('click',()=>{
        delete obj.glow;saveHistory();renderAll();refreshUI();
        cmdToast('빛 표현 기본값으로');
      });
      const _ga2=document.getElementById('d-glow-all');
      if(_ga2) _ga2.addEventListener('click',()=>{
        const src=obj.glow?JSON.parse(JSON.stringify(obj.glow)):null;
        let n=0;
        (STATE.lights||[]).forEach(l=>{
          if(l.type!==obj.type||l.id===obj.id||l.locked) return;
          if(src) l.glow=JSON.parse(JSON.stringify(src)); else delete l.glow;
          n++;
        });
        if(!n){cmdToast('같은 종류의 다른 조명이 없습니다');return;}
        saveHistory();renderAll();refreshUI();
        cmdToast('같은 종류 '+n+'개에 빛 표현 적용');
      });
      const cu=document.getElementById('d-cfl-unify');
      if(cu) cu.addEventListener('click',()=>unifyJumpGroupGang(obj.id));
      const cc=document.getElementById('d-cfl-cut');
      if(cc) cc.addEventListener('click',()=>{
        const g=jumpConflictOf(obj.id);
        if(g) unchainSelectedLights(g.members);
      });
      const dfx=document.getElementById('d-dup-fix');
      if(dfx) dfx.addEventListener('click',()=>cleanDuplicateLights(obj.id));
    }
    if(isLightSel){
      const jb=document.getElementById('d-jump-link');
      if(jb) jb.addEventListener('click',()=>{
        if(window._jumpLink&&window._jumpLink.lightId===obj.id) endJumpLink();
        else startJumpLink(obj.id);
      });
      const jc=document.getElementById('d-jump-clear');
      if(jc) jc.addEventListener('click',()=>{
        const nb=(typeof jumpNeighbors==='function')?jumpNeighbors(obj.id):[];
        obj.jumpIds=[];
        STATE.lights.forEach(l=>{if(Array.isArray(l.jumpIds)) l.jumpIds=l.jumpIds.filter(id=>id!==obj.id);});
        saveHistory();renderAll();refreshUI();
        cmdToast('점핑 전체 해제 — '+nb.length+'개');
      });
    }
    if(isLinear){
      const applyLen=v=>{
        const n=Math.max(300,Math.min(30000,Math.round(v/10)*10));
        obj.length_mm=n;saveHistory();renderAll();refreshUI();
        showStatus('조명 길이 '+n+'mm');
      };
      const li=document.getElementById('d-ll-len');
      if(li) li.addEventListener('change',e=>{const v=_numField(e,300);if(v==null){refreshUI();return;}applyLen(v);});
      document.querySelectorAll('.ll-preset').forEach(b=>b.addEventListener('click',()=>applyLen(parseInt(b.dataset.len,10))));
    }
    if(isDownlight){
      const sel=document.getElementById('d-dl-inch');
      if(sel) sel.addEventListener('change',e=>{
        const v=parseInt(e.target.value,10);
        if(!DOWNLIGHT_INCH[v]) return;
        obj.inch=v;
        if(!isBathLight) STATE.downlightInch=v; // 방습등은 다운라이트 기본값을 건드리지 않는다
        if(isBathLight) delete obj.size_mm;      // 예전 지름 값은 정리
        saveHistory();renderAll();refreshUI();
        showStatus((isBathLight?'방습등 ':'다운라이트 ')+DOWNLIGHT_INCH[v].label+
          (isBathLight?(' — 외경 Ø'+DOWNLIGHT_INCH[v].outer+'mm'):(' — 타공 Ø'+DOWNLIGHT_INCH[v].bore+'mm')));
      });
      const ab=document.getElementById('d-dl-apply-all');
      if(ab) ab.addEventListener('click',()=>{
        const v=Math.round(obj.inch||DOWNLIGHT_INCH_DEFAULT);
        let n=0;
        STATE.lights.forEach(l=>{
          if(l.type!==obj.type||l.locked) return;
          if(obj.spaceId&&l.spaceId!==obj.spaceId) return;
          l.inch=v;n++;
        });
        saveHistory();renderAll();refreshUI();
        cmdToast('다운라이트 '+DOWNLIGHT_INCH[v].label+' 일괄 적용 — '+n+'개');
      });
    }
    if(isSwitch){
      // 2026-08-30: 구별 점등 토글 — 조명 테스트의 핵심
      document.querySelectorAll('.gang-on').forEach(b=>b.addEventListener('click',()=>{
        const gi=parseInt(b.dataset.g,10);
        const now=toggleSwitchGang(obj.id,gi);
        saveHistory();renderAll();refreshUI();
        cmdToast('💡 '+(gi+1)+'구 '+(now?'ON — 조명 '+gangLightIds(obj,gi).length+'개':'OFF'));
      }));
      document.querySelectorAll('.gang-link').forEach(b=>b.addEventListener('click',()=>{
        const gi=parseInt(b.dataset.g,10);
        if(window._circuitLink&&window._circuitLink.switchId===obj.id&&window._circuitLink.gang===gi) endCircuitLink();
        else startCircuitLink(obj.id,gi);
      }));
      document.querySelectorAll('.gang-clear').forEach(b=>b.addEventListener('click',()=>{
        const gi=parseInt(b.dataset.g,10);
        const ids=gangLightIds(obj,gi);
        if(!ids.length) return;
        detachLightsFromSwitch(obj.id,ids);
      }));
      const aon=document.getElementById('d-gang-all-on');
      if(aon) aon.addEventListener('click',()=>{
        if(!Array.isArray(obj.lightIds)||!obj.lightIds.length){cmdToast('연결된 조명 없음 — 먼저 [연결]');return;}
        setAllSwitchGangs(obj.id,true);saveHistory();renderAll();refreshUI();
        cmdToast('💡 전체 구 ON');
      });
      const aoff=document.getElementById('d-gang-all-off');
      if(aoff) aoff.addEventListener('click',()=>{
        setAllSwitchGangs(obj.id,false);saveHistory();renderAll();refreshUI();
        cmdToast('전체 구 OFF');
      });
      const cb=document.getElementById('d-circuit-clear');
      if(cb) cb.addEventListener('click',()=>{
        obj.lightIds=[];obj.lightGang={};
        setAllSwitchGangs(obj.id,false); // 2026-08-30: 구 상태까지 정리
        saveHistory();renderAll();refreshUI();cmdToast('회로 연결 전체 해제');});
    }
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
}
function computeWarns(s){
  const out=[];
  if(SPACE_TYPES[s.type].waterproof){
    if(s.waterproofApplied==null) out.push({lv:'warning',msg:'⚠ 방수 미결정 — 아래에서 적용 여부를 선택하세요.'});
    else if(s.waterproofApplied===true) out.push({lv:'success',msg:'✓ 방수 적용 확정.'});
  }
  if(!spCH(s)) out.push({lv:'warning',msg:'천장고 미입력.<div class="pre">NEEDS_CONFIRMATION</div>'});
  if(s.polygon.length>4) out.push({lv:'warning',msg:'다각형 '+s.polygon.length+'각.'});
  const a=spArea(s);
  if(a<1) out.push({lv:'critical',msg:'면적 비정상: '+a.toFixed(2)+'㎡'});
  if(a>100) out.push({lv:'warning',msg:'면적 매우 큼: '+a.toFixed(2)+'㎡'});
  return out;
}

// *** 견적 카탈로그 24종 (요구사항 #5) ***
function refreshEstimate(){
  let tf=0,tw=0,tp=0,twa=0;
  STATE.spaces.forEach(s=>{tf+=spArea(s);tw+=spWall(s);tp+=spPeri(s);if(s.waterproofApplied===true) twa+=spArea(s);});
  // 공간 미소속 독립 벽도 총 벽 면적에 포함 — v5.9: 내력벽은 KPI 제외
  STATE.walls.filter(w=>!w.spaceId&&!w.isLine&&w.wallType!=='bearing').forEach(w=>{
    const len=Math.hypot((w.x2||0)-(w.x1||0),(w.y2||0)-(w.y1||0))/1000;
    tw+=len*STATE.ceilingHeight/1000;
  });
  document.getElementById('t-floor').textContent=tf.toFixed(2);
  document.getElementById('t-wall').textContent=tw.toFixed(2);
  document.getElementById('t-ceiling').textContent=tf.toFixed(2);
  document.getElementById('t-peri').textContent=tp.toFixed(2);
  document.getElementById('t-water').textContent=twa.toFixed(2);
  document.getElementById('t-open').textContent=STATE.openings.length;
  document.getElementById('t-door').textContent=STATE.openings.filter(o=>o.type==='DOOR').length;
  document.getElementById('t-window').textContent=STATE.openings.filter(o=>o.type==='WINDOW').length;
  /* PERF: 상단 KPI 바까지는 항상 갱신 — 무거운 견적표는 견적 탭 활성 시만 */
  if(!_tabActive('estimate')){_estimateDirty=true;return;}
  _estimateDirty=false;
  // v5.8: t-table을 공정별 합산으로 변경 (요구사항 #4 — 공간별 X, 공정별 O)
  document.getElementById('t-table').innerHTML=CAT_ORDER.map(cat=>{
    const items=Object.entries(CATALOG).filter(([k,c])=>c.cat===cat);
    const rows=items.map(([k,c])=>{
      const qty=computeQty(k,c);
      if(qty<=0&&!(c.applies==='set'&&isCatalogApplicable(c))) return null;
      const qtyStr=(c.unit==='식'||c.unit==='세트'||c.unit==='개'||c.unit==='톤')?qty.toFixed(0):qty.toFixed(2);
      const applicable=c.spaces?STATE.spaces.filter(s=>c.spaces.includes(s.type)).length:STATE.spaces.length;
      return '<tr><td>'+c.name+'</td><td style="color:var(--text-tertiary)">'+cat+'</td>'+
        '<td class="r"><span class="num">'+qtyStr+'</span> '+c.unit+'</td>'+
        '<td class="r">'+applicable+'</td></tr>';
    }).filter(Boolean);
    return rows.join('');
  }).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:12px">공간 추가 시 자동 산출</td></tr>';
  
  // 카탈로그 — 카테고리별 그룹
  const catalog=document.getElementById('t-catalog');
  let html='';
  CAT_ORDER.forEach(cat=>{
    const items=Object.entries(CATALOG).filter(([k,c])=>c.cat===cat);
    const visibleItems=items.filter(([k,c])=>{
      const qty=computeQty(k,c);
      return qty>0||c.applies==='set'&&isCatalogApplicable(c);
    });
    if(visibleItems.length===0) return;
    html+='<div class="cat-group"><div class="cat-title">'+cat+'</div>';
    visibleItems.forEach(([k,c])=>{
      const qty=computeQty(k,c);
      const cfg=STATE.estimateConfig[k]||{};
      const selectedOpt=cfg.option||(c.options?Object.keys(c.options)[0]:'');
      const tagClass='tag-'+c.tag.toLowerCase();
      const qtyStr=c.unit==='식'||c.unit==='세트'||c.unit==='개'||c.unit==='톤'?qty.toFixed(0):qty.toFixed(2);
      html+='<div class="est-row">';
      html+='<div class="est-row-head">';
      html+='<span class="est-row-name">'+c.name+'</span>';
      html+='<span class="proc-tag '+tagClass+'">'+c.tag+'</span>';
      html+='</div>';
      html+='<div class="est-row-options">';
      html+='<span class="est-row-qty">'+qtyStr+' '+c.unit+'</span>';
      if(c.options){
        html+='<select data-cat="'+k+'">';
        Object.entries(c.options).forEach(([ok,oname])=>{
          html+='<option value="'+ok+'"'+(ok===selectedOpt?' selected':'')+'>'+oname+'</option>';
        });
        html+='</select>';
      }
      html+='<span class="est-price">단가 NEEDS_RESEARCH</span>';
      html+='</div>';
      html+='</div>';
    });
    html+='</div>';
  });
  if(html===''){html='<p style="color:var(--text-tertiary);font-size:11px;text-align:center;padding:20px">공간 추가 시 자동</p>';}
  catalog.innerHTML=html;
  catalog.querySelectorAll('select[data-cat]').forEach(sel=>{
    sel.addEventListener('change',e=>{
      const k=e.target.dataset.cat;
      if(!STATE.estimateConfig[k]) STATE.estimateConfig[k]={};
      STATE.estimateConfig[k].option=e.target.value;
      saveHistory();refreshJSON();
    });
  });

  const aw=[];
  STATE.spaces.forEach(s=>computeWarns(s).forEach(w=>aw.push({lv:w.lv,msg:'['+escapeHtml(s.name)+'] '+w.msg})));
  if(STATE.spaces.length===0) aw.push({lv:'warning',msg:'공간 없음.'});
  if(tf>0&&STATE.openings.length===0) aw.push({lv:'warning',msg:'⚠ 개구부 0개. 벽 면적 정확도 ↓.'});
  document.getElementById('t-warns').innerHTML=aw.length===0?'<div class="warn success">✓ 견적 입력 준비 완료. 단가 = UNKNOWN/NEEDS_RESEARCH.</div>':aw.map(w=>'<div class="warn '+w.lv+'">'+w.msg+'</div>').join('');
}

function isCatalogApplicable(c){
  if(!c.spaces) return true;
  return STATE.spaces.some(s=>c.spaces.includes(s.type));
}
function computeQty(catKey,c){
  let qty=0;
  if(c.applies==='floor'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spArea(s);
    });
  }else if(c.applies==='wall'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spWall(s);
    });
  }else if(c.applies==='ceiling'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spArea(s);
    });
  }else if(c.applies==='perimeter'){
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spPeri(s);
    });
  }else if(c.applies==='partial'){
    const factor=c.partialFactor||0.5;
    STATE.spaces.forEach(s=>{
      if(c.spaces&&!c.spaces.includes(s.type)) return;
      qty+=spPeri(s)*factor;
    });
  }else if(c.applies==='set'){
    if(c.spaces) qty=STATE.spaces.filter(s=>c.spaces.includes(s.type)).length;
    else qty=1;
  }else if(c.applies==='count_doors'){
    qty=STATE.openings.filter(o=>o.type==='DOOR').length;
  }else if(c.applies==='count_windows'){
    qty=STATE.openings.filter(o=>o.type==='WINDOW').length;
  }else if(c.applies==='count_lights'){
    qty=STATE.lights.length;
  }else if(c.applies==='count_electric'){
    qty=STATE.electric.length;
  }
  return qty;
}

function showFinishMenu(kind,obj,cx,cy){
  const menu=document.getElementById('finish-ctx-menu');
  const titleEl=document.getElementById('finish-ctx-title');
  const itemsEl=document.getElementById('finish-ctx-items');
  itemsEl.innerHTML='';
  function makeSection(label,materials,currentCode,surfaceKey){
    const sec=document.createElement('div');
    const hdr=document.createElement('div');
    hdr.style.cssText='padding:5px 13px 3px;color:#6b7a99;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;';
    hdr.textContent=label;
    sec.appendChild(hdr);
    Object.values(materials).forEach(m=>{
      const btn=document.createElement('button');
      const active=m.code===currentCode;
      btn.style.cssText='display:block;width:100%;text-align:left;padding:7px 14px 7px 18px;background:none;border:none;color:'+(active?'#C9A961':'#C8C2B4')+';cursor:pointer;font-size:12px;font-family:Inter,sans-serif;white-space:nowrap;';
      btn.textContent=(active?'✓ ':'')+m.name;
      btn.addEventListener('mouseenter',()=>{btn.style.background='rgba(255,255,255,0.07)';});
      btn.addEventListener('mouseleave',()=>{btn.style.background='none';});
      btn.addEventListener('click',()=>{applyFinish(kind,obj,surfaceKey,m.code);menu.style.display='none';});
      sec.appendChild(btn);
    });
    return sec;
  }
  if(kind==='wall'){
    titleEl.textContent='벽 마감재';
    itemsEl.appendChild(makeSection('벽 마감재',WALL_MATERIALS,obj.finishMaterial||'UNDECIDED','finishMaterial'));
  }else if(kind==='space'){
    titleEl.textContent=obj.name+' 마감재';
    itemsEl.appendChild(makeSection('바닥재',FLOOR_MATERIALS,obj.floorMaterial||'UNDECIDED','floorMaterial'));
    const div=document.createElement('div');
    div.style.cssText='height:1px;background:#2e3347;margin:4px 0;';
    itemsEl.appendChild(div);
    itemsEl.appendChild(makeSection('천정재',CEILING_MATERIALS,obj.ceilingMaterial||'GYPSUM','ceilingMaterial'));
  }
  menu.style.display='block';
  const mw=menu.offsetWidth,mh=menu.offsetHeight;
  let x=cx,y=cy;
  if(x+mw>window.innerWidth) x=window.innerWidth-mw-8;
  if(y+mh>window.innerHeight) y=window.innerHeight-mh-8;
  menu.style.left=x+'px';menu.style.top=y+'px';
}
function applyFinish(kind,obj,surfaceKey,materialCode){
  obj[surfaceKey]=materialCode;
  saveHistory();
  selectObj(kind,obj.id);
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab==='material'));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('active',x.dataset.tabContent==='material'));
  renderAll();refreshUI();
  const map={floorMaterial:['바닥재',FLOOR_MATERIALS],ceilingMaterial:['천정재',CEILING_MATERIALS],finishMaterial:['벽 마감재',WALL_MATERIALS]};
  const [label,dict]=map[surfaceKey]||['마감재',{}];
  showStatus(label+': '+(dict[materialCode]?.name||materialCode));
}
// 외부 클릭 시 컨텍스트 메뉴 닫기 (pointerdown: 마우스·터치·펜 공용)
document.addEventListener('pointerdown',e=>{
  const menu=document.getElementById('finish-ctx-menu');
  if(menu&&menu.style.display!=='none'&&!menu.contains(e.target)) menu.style.display='none';
});

function refreshMaterial(){
  const md=document.getElementById('material-detail');
  function finishRow(label,name){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px;">'+
      '<span style="color:var(--text-tertiary)">'+label+'</span>'+
      '<span style="color:var(--text-primary);font-weight:500">'+name+'</span></div>';
  }
  if(STATE.selectedKind==='space'&&STATE.selectedId){
    const s=STATE.spaces.find(x=>x.id===STATE.selectedId);
    if(s){
      if(!s.ceilingMaterial) s.ceilingMaterial='GYPSUM';
      md.innerHTML=
        '<p style="font-size:11px;margin-bottom:8px">선택: <strong style="color:var(--gold)">'+escapeHtml(s.name)+'</strong></p>'+
        finishRow('바닥재',FLOOR_MATERIALS[s.floorMaterial]?.name||s.floorMaterial||'미정')+
        finishRow('벽 마감재',(()=>{const ws=STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine);const mats=[...new Set(ws.map(w=>w.finishMaterial).filter(Boolean))];return mats.length===0?'미정':mats.length===1?(WALL_MATERIALS[mats[0]]?.name||mats[0]):'('+mats.length+'종 혼합)'})())+
        finishRow('천정재',CEILING_MATERIALS[s.ceilingMaterial]?.name||s.ceilingMaterial||'미정')+
        '<p style="font-size:10px;color:var(--text-tertiary);margin:8px 0 4px">우클릭으로 마감재 변경</p>'+
        '<div class="field" style="margin-top:8px"><label class="field-label">공간 컬러</label>'+
        '<input type="color" id="mat-color" value="'+(s.materialColor?s.materialColor.substring(0,7):'#C9A961')+'" style="width:100%;height:32px;cursor:pointer"></div>'+
        '<button class="btn sm" id="mat-clear" style="width:100%;margin-top:4px">기본 색상으로</button>';
      document.getElementById('mat-color').addEventListener('change',e=>{s.materialColor=e.target.value+'66';renderAll();});
      document.getElementById('mat-clear').addEventListener('click',()=>{s.materialColor=null;renderAll();refreshMaterial();});
    }
  }else if(STATE.selectedKind==='wall'&&STATE.selectedId){
    const w=STATE.walls.find(x=>x.id===STATE.selectedId);
    if(w){
      md.innerHTML=
        '<p style="font-size:11px;margin-bottom:8px">벽 선택됨</p>'+
        finishRow('벽 마감재',WALL_MATERIALS[w.finishMaterial]?.name||'미정')+
        '<p style="font-size:10px;color:var(--text-tertiary);margin-top:8px">우클릭으로 마감재 변경</p>';
    }
  }else{
    md.innerHTML='<p style="font-size:11px;color:var(--text-tertiary)">벽 또는 공간을 우클릭하여<br>마감재를 지정하세요</p>';
  }
  document.getElementById('color-palette').innerHTML=COLOR_PALETTES.map(p=>
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:6px;background:var(--bg-tertiary);border-radius:3px">'+
    '<div style="display:flex;border-radius:2px;overflow:hidden;width:60px;height:24px">'+
    '<div style="flex:6;background:'+p.primary+'"></div>'+
    '<div style="flex:3;background:'+p.secondary+'"></div>'+
    '<div style="flex:1;background:'+p.accent+'"></div></div>'+
    '<span style="font-size:11px">'+p.name+'</span></div>').join('');
}

// ===== JSON =====
// v5.8: 라이브러리 type → AI 친화 영문 키워드/시맨틱 태그 매핑 (75종 전체 — v5.8 완성)
// 저작권: promptKeyword에 브랜드명 금지. 일반명사만 사용 (헌법 준수)
const SEMANTIC_MAP={
  // ===== FURNITURE_LIB (25종) =====
  sofa3:{tag:'main_seating',kw:'large 3-seat sofa, beige leather'},
  sofa2:{tag:'main_seating',kw:'2-seat sofa, beige leather'},
  sofa1:{tag:'accent_chair',kw:'single armchair'},
  coffee:{tag:'coffee_table',kw:'rectangular wood coffee table'},
  tv_stand:{tag:'media_console',kw:'low TV console, dark wood'},
  bookshelf:{tag:'storage',kw:'open bookshelf, wood'},
  piano:{tag:'instrument',kw:'upright piano, black'},
  rug:{tag:'rug',kw:'large area rug'},
  plant:{tag:'plant',kw:'potted indoor plant'},
  bed_d:{tag:'sleeping',kw:'double bed with headboard'},
  bed_s:{tag:'sleeping',kw:'single bed'},
  bed_k:{tag:'sleeping',kw:'king bed with headboard'},
  nightstand:{tag:'side_table',kw:'bedside nightstand'},
  wardrobe:{tag:'wardrobe',kw:'large 4-door wardrobe'},
  dressing_table:{tag:'vanity',kw:'dressing table with mirror'},
  mirror:{tag:'mirror',kw:'full-length floor mirror'},
  desk:{tag:'desk',kw:'work desk'},
  desk_l:{tag:'desk',kw:'L-shaped work desk'},
  office_chair:{tag:'chair',kw:'swivel office chair'},
  dining4:{tag:'dining_table',kw:'rectangular dining table for 4'},
  dining6:{tag:'dining_table',kw:'rectangular dining table for 6'},
  dining_round:{tag:'dining_table',kw:'round dining table'},
  chair:{tag:'chair',kw:'dining chair'},
  bar_stool:{tag:'chair',kw:'bar stool'},
  treadmill:{tag:'exercise',kw:'treadmill, fitness equipment'},
  // 2026-08-24: 트렌드 가구 13종
  island:{tag:'kitchen_island',kw:'kitchen island counter with induction and sink'},
  sofa_modular:{tag:'main_seating',kw:'modular L-shaped sectional sofa'},
  sofa_curved:{tag:'main_seating',kw:'curved sofa, soft rounded silhouette'},
  lounge_chair:{tag:'accent_chair',kw:'lounge chair with ottoman'},
  side_table:{tag:'side_table',kw:'round side table'},
  console:{tag:'console',kw:'slim console table with decor'},
  home_bar:{tag:'home_bar',kw:'home bar counter with glasses and bottles'},
  massage_chair:{tag:'massage_chair',kw:'full-body massage chair'},
  styler:{tag:'clothing_care',kw:'steam clothing care cabinet'},
  desk_motion:{tag:'desk',kw:'height-adjustable standing desk with monitor'},
  beanbag:{tag:'accent_chair',kw:'beanbag lounger'},
  cat_tower:{tag:'pet',kw:'cat tower with platforms'},
  system_hanger:{tag:'wardrobe',kw:'open system hanger rack with shelf'},
  // 2026-08-27: 가전 (가구 카테고리로 일원화) — 브랜드명 없이 일반명사만 (헌법)
  fridge_bespoke:{tag:'appliance',kw:'4-door panel refrigerator with color panels'},
  fridge_bespoke_kf:{tag:'appliance',kw:'kitchen-fit built-in style panel refrigerator'},
  fridge_std:{tag:'appliance',kw:'two-door refrigerator'},
  fridge_side:{tag:'appliance',kw:'side-by-side refrigerator'},
  washer_std:{tag:'laundry',kw:'front-load washing machine'},
  dryer_std:{tag:'laundry',kw:'clothes dryer'},
  // ===== FIXTURE_LIB (20종) =====
  toilet:{tag:'sanitary',kw:'modern wall-hung toilet'},
  toilet_round:{tag:'sanitary',kw:'round-bowl toilet'},
  bidet:{tag:'sanitary',kw:'bidet fixture'},
  sink_b:{tag:'sanitary',kw:'wall-hung washbasin'},
  sink_b_oval:{tag:'sanitary',kw:'oval washbasin'},
  bathtub:{tag:'sanitary',kw:'freestanding bathtub'},
  bathtub_corner:{tag:'sanitary',kw:'corner bathtub'},
  shower:{tag:'sanitary',kw:'shower enclosure with glass door'},
  shower_corner:{tag:'sanitary',kw:'corner shower enclosure with glass'},
  // 2026-08-24: 위생기구 확충 8종
  sink_counter_1200:{tag:'sanitary',kw:'bathroom counter with undermount basin 1200mm'},
  sink_vessel:{tag:'sanitary',kw:'vessel basin on wood counter'},
  sink_double_1500:{tag:'sanitary',kw:'double basin vanity counter 1500mm'},
  bathtub_free:{tag:'sanitary',kw:'freestanding oval bathtub with floor-mounted tap'},
  shower_slide:{tag:'sanitary',kw:'sliding door shower enclosure 1200mm'},
  urinal:{tag:'sanitary',kw:'wall-hung urinal with sensor flush'},
  utility_sink:{tag:'sanitary',kw:'deep utility laundry sink'},
  floor_drain:{tag:'sanitary',kw:'square floor drain grate'},
  fridge:{tag:'kitchen',kw:'tall refrigerator'},
  fridge_2door:{tag:'kitchen',kw:'side-by-side double-door refrigerator'},
  washer:{tag:'laundry',kw:'front-load washing machine'},
  dryer:{tag:'laundry',kw:'clothes dryer'},
  // ===== LIGHT_LIB (8종) =====
  ceiling:{tag:'ceiling_light',kw:'flush-mount ceiling light fixture'},
  downlight:{tag:'ceiling_light',kw:'recessed downlight'},
  pendant:{tag:'pendant',kw:'pendant light'},
  chandelier:{tag:'chandelier',kw:'chandelier'},
  wall_lamp:{tag:'wall_light',kw:'wall sconce light'},
  floor_lamp:{tag:'floor_lamp',kw:'floor standing lamp'},
  track:{tag:'track_light',kw:'ceiling track lighting'},
  fluorescent:{tag:'ceiling_light',kw:'fluorescent ceiling strip light'},
  // 2026-08-24: 가구2 — 픽스(빌트인) 17종
  base_600:{tag:'kitchen_cabinet',kw:'kitchen base cabinet 600mm'},
  base_900:{tag:'kitchen_cabinet',kw:'kitchen base cabinet 900mm, double door'},
  base_sink_900:{tag:'kitchen_cabinet',kw:'kitchen sink base cabinet with stainless bowl'},
  base_cook_600:{tag:'kitchen_cabinet',kw:'cooktop base cabinet with 4-burner hob'},
  base_drawer_600:{tag:'kitchen_cabinet',kw:'kitchen drawer base cabinet, 3 drawers'},
  wall_600:{tag:'kitchen_cabinet',kw:'kitchen wall cabinet 600mm, upper'},
  wall_900:{tag:'kitchen_cabinet',kw:'kitchen wall cabinet 900mm, upper'},
  corner_base_900:{tag:'kitchen_cabinet',kw:'kitchen corner base cabinet, L-shaped'},
  corner_wall_600:{tag:'kitchen_cabinet',kw:'kitchen corner wall cabinet, upper'},
  tall_600:{tag:'kitchen_cabinet',kw:'tall pantry cabinet, full height'},
  fridge_cab_900:{tag:'kitchen_cabinet',kw:'refrigerator housing cabinet'},
  island_1500:{tag:'kitchen_island',kw:'kitchen island cabinet unit 1500mm'},
  wardrobe_fix_1200:{tag:'builtin_cabinet',kw:'built-in wardrobe, floor to ceiling'},
  shoe_cab_1200:{tag:'builtin_cabinet',kw:'entry shoe cabinet, built-in'},
  tv_lowcab_2400:{tag:'builtin_cabinet',kw:'living room TV low cabinet, built-in'},
  bath_vanity_900:{tag:'builtin_cabinet',kw:'bathroom vanity cabinet with basin'},
  laundry_cab_700:{tag:'builtin_cabinet',kw:'laundry appliance cabinet'},
  // 2026-08-24: 트렌드 조명 6종
  line_t5:{tag:'ceiling_light',kw:'slim LED line light bar'},
  magnet_track:{tag:'track_light',kw:'recessed magnetic track with spot and linear modules'},
  cove:{tag:'ceiling_light',kw:'indirect cove strip lighting'},
  spot_cyl:{tag:'ceiling_light',kw:'surface-mounted cylinder spotlight'},
  table_lamp:{tag:'floor_lamp',kw:'table lamp, mood light'},
  pendant_cluster:{tag:'pendant',kw:'cluster pendant with three staggered globes'},
  // 2026-08-25: 조명 확충 8종
  edge_flat_600:{tag:'ceiling_light',kw:'slim LED edge-lit flat panel 600mm square'},
  kitchen_flat:{tag:'ceiling_light',kw:'kitchen LED flat panel light, rectangular'},
  sensor_light:{tag:'ceiling_light',kw:'entrance motion sensor ceiling light'},
  bath_light:{tag:'ceiling_light',kw:'moisture-proof bathroom ceiling light'},
  pendant_linear:{tag:'pendant',kw:'linear pendant bar over dining table'},
  ceiling_fan:{tag:'ceiling_light',kw:'ceiling fan with integrated light'},
  step_light:{tag:'wall_light',kw:'recessed step light for stairs and corridor'},
  spot_bar_3:{tag:'track_light',kw:'surface-mounted 3-head spot bar'},
  // ===== ELECTRIC_LIB (11종) =====
  outlet_w:{tag:'outlet',kw:'2-gang wall outlet'},
  outlet_w4:{tag:'outlet',kw:'4-gang wall outlet'},
  outlet_f:{tag:'outlet',kw:'floor outlet'},
  switch_1:{tag:'switch',kw:'single light switch'},
  switch_2:{tag:'switch',kw:'2-gang light switch'},
  switch_3:{tag:'switch',kw:'3-gang light switch'},
  // 2026-08-24: 전기 확충 11종
  switch_4:{tag:'switch',kw:'4-gang light switch'},
  switch_5:{tag:'switch',kw:'5-gang light switch'},
  switch_6:{tag:'switch',kw:'6-gang light switch, two rows'},
  switch_3way:{tag:'switch',kw:'3-way light switch'},
  dimmer:{tag:'switch',kw:'rotary dimmer switch'},
  dist_panel:{tag:'panelboard',kw:'electrical distribution panel with breakers'},
  outlet_220:{tag:'outlet',kw:'dedicated 220V outlet for air conditioner'},
  outlet_wp:{tag:'outlet',kw:'weatherproof outlet with cover'},
  outlet_usb:{tag:'outlet',kw:'wall outlet with USB charging ports'},
  wallpad:{tag:'wallpad',kw:'home network wall pad, video intercom screen'},
  doorbell:{tag:'doorbell',kw:'doorbell push button'},
  internet:{tag:'data_outlet',kw:'internet and TV outlet panel'},
  ac:{tag:'split_ac',kw:'wall-mounted split air conditioner'},
  ac_floor:{tag:'split_ac',kw:'floor-standing split air conditioner'},
  intercom:{tag:'intercom',kw:'intercom panel'},
  boiler_ctrl:{tag:'boiler_control',kw:'boiler control panel'},
  // ===== HVAC_FIRE_LIB (15종) =====
  ac_ceiling:{tag:'system_ac',kw:'ceiling cassette air conditioning unit'},
  // 2026-08-24: 에어컨 계열·공조 확충 9종
  ac_4way:{tag:'system_ac',kw:'4-way ceiling cassette air conditioner'},
  ac_2way:{tag:'system_ac',kw:'2-way ceiling cassette air conditioner'},
  ac_1way:{tag:'system_ac',kw:'1-way ceiling cassette air conditioner'},
  ac_wall:{tag:'system_ac',kw:'wall-mounted split air conditioner'},
  ac_stand:{tag:'system_ac',kw:'floor standing air conditioner tower'},
  ac_duct:{tag:'system_ac',kw:'concealed ceiling duct air conditioner'},
  ac_outdoor:{tag:'system_ac',kw:'air conditioner outdoor condenser unit'},
  erv:{tag:'ventilation',kw:'energy recovery ventilator unit, ceiling concealed'},
  boiler_unit:{tag:'boiler',kw:'gas boiler unit'},
  diffuser:{tag:'ac_diffuser',kw:'ceiling air diffuser'},
  vent_fan:{tag:'ventilation',kw:'ceiling exhaust ventilation fan'},
  hood:{tag:'kitchen',kw:'kitchen range hood'},
  hvac_grille:{tag:'ventilation',kw:'ceiling HVAC supply grille'},
  sprinkler:{tag:'fire_sprinkler',kw:'ceiling sprinkler head'},
  sprinkler_side:{tag:'fire_sprinkler',kw:'sidewall sprinkler head'},
  smoke_detector:{tag:'smoke_detector',kw:'ceiling smoke detector'},
  heat_detector:{tag:'heat_detector',kw:'ceiling heat detector'},
  emerg_light:{tag:'emergency_light',kw:'emergency exit light'},
  exit_sign:{tag:'emergency_light',kw:'emergency exit sign'},
  fire_ext:{tag:'fire_extinguisher',kw:'wall-mounted fire extinguisher'},
  hydrant:{tag:'fire_hydrant',kw:'indoor fire hydrant cabinet'},
  emerg_bell:{tag:'fire_alarm',kw:'fire alarm bell'},
  auto_ext:{tag:'fire_suppression',kw:'automatic fire suppression unit'},
};
function semanticOf(type){return SEMANTIC_MAP[type]||{tag:'generic',kw:type};}

// v5.7: 가구 등 객체가 어느 공간에 포함되는지 자동 산정 (point-in-polygon)
function findContainingSpace(p){
  // v5.9 fix: hole(도넛) 내부 제외 + 공간 중첩 시 최소 면적 공간 우선 (귀속 정확도)
  let best=null,bestArea=Infinity;
  for(const s of STATE.spaces){
    if(!s.polygon||s.polygon.length<3) continue;
    if(!pointInPolygon(p,s.polygon)) continue;
    if((s.holes||[]).some(h=>pointInPolygon(p,h))) continue;
    const a=polyArea(s.polygon);
    if(a<bestArea){bestArea=a;best=s.id;}
  }
  return best;
}
function pointInPolygon(p,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y,xj=poly[j].x,yj=poly[j].y;
    const intersect=((yi>p.y)!==(yj>p.y))&&(p.x<(xj-xi)*(p.y-yi)/(yj-yi+1e-9)+xi);
    if(intersect) inside=!inside;
  }
  return inside;
}

// v5.7: 가구의 placement (8방위) 자동 산정 — 공간 중심 기준 객체 위치
function placementOf(o,sp){
  if(!sp||!sp.polygon||sp.polygon.length===0) return 'unknown';
  let cx=0,cy=0;sp.polygon.forEach(p=>{cx+=p.x;cy+=p.y;});cx/=sp.polygon.length;cy/=sp.polygon.length;
  const dx=o.x-cx, dy=o.y-cy;
  const ang=Math.atan2(dy,dx)*180/Math.PI; // 화면 좌표는 y가 아래로 +이므로 'south'가 +y
  const d=Math.sqrt(dx*dx+dy*dy);
  if(d<300) return 'center';
  // 8방위 (north=위, south=아래, east=오른쪽, west=왼쪽)
  const dirs=[
    {min:-22.5,max:22.5,name:'east'},
    {min:22.5,max:67.5,name:'southeast'},
    {min:67.5,max:112.5,name:'south'},
    {min:112.5,max:157.5,name:'southwest'},
    {min:157.5,max:180,name:'west'},
    {min:-180,max:-157.5,name:'west'},
    {min:-157.5,max:-112.5,name:'northwest'},
    {min:-112.5,max:-67.5,name:'north'},
    {min:-67.5,max:-22.5,name:'northeast'},
  ];
  const found=dirs.find(d=>ang>=d.min&&ang<d.max);
  return 'in_'+(found?found.name:'center');
}

// v5.7: 도어를 가장 가까운 벽에 매핑 (parentId) — v5.9: 내력벽 제외
function findNearestWallId(o){
  let bestId=null,bestD=Infinity;
  STATE.walls.forEach(w=>{
    if(w.wallType==='bearing') return; // 내력벽은 도어/창 부착 대상 아님
    const d=pointToSegmentDist({x:o.x,y:o.y},{x:w.x1,y:w.y1},{x:w.x2,y:w.y2});
    if(d<bestD){bestD=d;bestId=w.id;}
  });
  return bestD<500?bestId:null;
}

function buildJSON(){
  // v5.3: 레이어 매핑 자동 생성
  const layers={};
  const collect=(arr,defaultElem)=>arr.forEach(o=>{
    const ln=o.layerName||('A-'+defaultElem);
    if(!layers[ln]){
      const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null;
      const spType=sp?(SPACE_TYPES[sp.type]||{}):{}; // v5.9: 미등록 타입 크래시 방지
      layers[ln]={
        element:ln.split('-')[1]||defaultElem,
        spaceCode:spType.code||null,
        spaceName:sp?sp.name:null,
        spaceType:sp?sp.type:null,
        color:spType.color||'#C9A961',
        objectIds:[],
      };
    }
    layers[ln].objectIds.push(o.id);
  });
  STATE.spaces.forEach(s=>{
    // v5.9 fix: 동일 fallback 레이어명일 때 덮어쓰기 → objectIds 유실되던 버그 (누적으로 변경)
    const st=SPACE_TYPES[s.type]||{code:'GEN',color:'#C9A961'};
    const ln=s.layerName||('A-AREA-'+st.code);
    if(!layers[ln]) layers[ln]={element:'AREA',spaceCode:st.code,spaceName:s.name,
      spaceType:s.type,color:st.color,objectIds:[]};
    layers[ln].objectIds.push(s.id);
  });
  collect(STATE.walls,'WALL');
  collect(STATE.openings.filter(o=>o.type==='DOOR'),'DOOR');
  collect(STATE.openings.filter(o=>o.type==='WINDOW'),'WIND');
  collect(STATE.furniture,'FURN');collect(STATE.fixtures,'FIXT');
  collect(STATE.lights,'LITE');collect(STATE.electric,'ELEC');
  collect(STATE.hvac,'HVAC');
  collect(STATE.circles,'CIRC');collect(STATE.arcs,'ARC');

  // v5.7: 객체별 의미 태그/프롬프트 키워드/배치 자동 산정
  // v5.9: nameKo/nameEn 추가 — AI 파싱(T2I/T2V) 정확도 향상
  const _libByKind={FURN:typeof FURNITURE_LIB!=='undefined'?FURNITURE_LIB:{},FIXT:typeof FIXTURE_LIB!=='undefined'?FIXTURE_LIB:{},LITE:typeof LIGHT_LIB!=='undefined'?LIGHT_LIB:{},ELEC:typeof ELECTRIC_LIB!=='undefined'?ELECTRIC_LIB:{},HVAC:typeof HVAC_FIRE_LIB!=='undefined'?HVAC_FIRE_LIB:{}};
  const enrichLib=(arr,kindElem)=>arr.map(o=>{
    const sm=semanticOf(o.type);
    // v5.9 fix: (기존 버그) 연산자 우선순위로 fallback 미실행 + stale spaceId 그대로 출력.
    // 현재 좌표의 기하학적 귀속을 우선하고, 폴리곤 밖(벽부착 객체 등)이면 배치 시점 spaceId 사용.
    const containedId=findContainingSpace({x:o.x,y:o.y});
    const sp=(containedId?STATE.spaces.find(s=>s.id===containedId):null)
           ||(o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null);
    const def=(_libByKind[kindElem]||{})[o.type]||{};
    return{
      ...o,
      flipped:!!o.flipped,
      nameKo:def.name||o.type,
      nameEn:def.nameEn||sm.kw||o.type,
      estModule:def.est||null, // 2026-08-24: 픽스가구 견적 모듈 코드 (견적 OS 소비용)
      // 2026-08-25: 라인·간접조명 길이 — 견적 OS 가 m 단가로 산출
      ...((typeof isLinearLight==='function'&&isLinearLight(o.type))?(function(){
        const _L=linearLightLen(o);
        return {length_mm:_L,length_m:parseFloat((_L/1000).toFixed(3)),nameKo:(def.name||o.type)+' '+_L+'mm'};
      })():{}),
      // 2026-08-25: 다운라이트 인치 규격 — 견적 OS 가 타공경으로 단가 매핑
      ...(o.type==='downlight'?(function(){
        const _i=Math.round(o.inch||DOWNLIGHT_INCH_DEFAULT);
        const _d=DOWNLIGHT_INCH[_i]||DOWNLIGHT_INCH[DOWNLIGHT_INCH_DEFAULT];
        return {inch:_i,boreDia_mm:_d.bore,outerDia_mm:_d.outer,nameKo:'다운라이트 '+_i+'"',nameEn:_i+'-inch recessed downlight'};
      })():{}),
      semanticTag:sm.tag,
      promptKeyword:def.nameEn||sm.kw,
      placement:placementOf(o,sp),
      parentSpaceId:sp?sp.id:'NEEDS_CONFIRMATION',
    };
  });

  // v5.7: 도어/창은 parentWallId 추가 — v5.9 fix: 배치 시점 기록(wallId) 우선, 없을 때만 최근접 재탐색
  const enrichOpenings=STATE.openings.map(o=>({
    ...o,
    semanticTag:o.type==='DOOR'?'door':'window',
    promptKeyword:o.type==='DOOR'?'interior door':'window with view',
    parentWallId:(o.wallId&&STATE.walls.some(w=>w.id===o.wallId)?o.wallId:findNearestWallId(o))||'NEEDS_CONFIRMATION',
    parentSpaceId:o.spaceId||'NEEDS_CONFIRMATION',
  }));

  // v5.9: 라이브러리 enrich는 1회만 계산 (출력·관계 그래프·무결성 검사 공용 — 기존엔 2회 중복 계산)
  const enriched={
    furniture:enrichLib(STATE.furniture,'FURN'),
    fixtures:enrichLib(STATE.fixtures,'FIXT'),
    lights:enrichLib(STATE.lights,'LITE'),
    electric:enrichLib(STATE.electric,'ELEC'),
    hvac:enrichLib(STATE.hvac,'HVAC'),
  };

  // v5.7: 명시적 관계 그래프
  const relationships=[];
  enrichOpenings.forEach(o=>{
    if(o.parentWallId&&o.parentWallId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentWallId,type:'embedded_in_wall'});
    if(o.parentSpaceId&&o.parentSpaceId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentSpaceId,type:'opens_into_space'});
  });
  Object.values(enriched).forEach(arr=>{
    arr.forEach(o=>{
      if(o.parentSpaceId&&o.parentSpaceId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentSpaceId,type:'contained_in_space'});
    });
  });
  // v5.9 fix: 공간 인접 관계 — 기존 doorPairs는 계산만 하고 미사용(dead code)이라 JSON에 인접 정보 누락.
  // 도어 법선 방향 양쪽 지점의 소속 공간을 감지해 connected_via_door 관계로 출력.
  enrichOpenings.filter(o=>o.type==='DOOR').forEach(d=>{
    const rad=(d.angle||0)*Math.PI/180;
    const nx=-Math.sin(rad),ny=Math.cos(rad); // 도어 진행 방향의 법선
    const off=(d.depth_mm||200)/2+150;
    const sideA=findContainingSpace({x:d.x+nx*off,y:d.y+ny*off});
    const sideB=findContainingSpace({x:d.x-nx*off,y:d.y-ny*off});
    if(sideA&&sideB&&sideA!==sideB) relationships.push({from:sideA,to:sideB,type:'connected_via_door',via:d.id});
  });

  // v5.7: 자동 폐곡면 감지 → JSON에 포함
  const autoCycles=findClosedCyclesInWalls()
    .filter(poly=>!STATE.spaces.some(s=>polygonsSimilar(s.polygon,poly)))
    .filter(poly=>polyArea(poly)/1e6>=0.5)
    .map((poly,i)=>({
      id:'autocycle_'+i,
      polygon:poly,
      area_m2:parseFloat((polyArea(poly)/1e6).toFixed(4)),
      semanticTag:'detected_closed_area',
      note:'자동 감지 폐곡면 — 명시적 공간 미등록',
    }));

  // v5.7: 색인 (byLayer / bySpace / byTag)
  const indices={
    byLayer:Object.fromEntries(Object.entries(layers).map(([k,v])=>[k,v.objectIds])),
    bySpace:{},
    byTag:{},
  };
  STATE.spaces.forEach(s=>{
    indices.bySpace[s.id]={
      walls:STATE.walls.filter(w=>w.spaceId===s.id).map(w=>w.id),
      openings:STATE.openings.filter(o=>o.spaceId===s.id).map(o=>o.id),
      furniture:STATE.furniture.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      fixtures:STATE.fixtures.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      lights:STATE.lights.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      electric:STATE.electric.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
      hvac:STATE.hvac.filter(o=>o.spaceId===s.id||findContainingSpace({x:o.x,y:o.y})===s.id).map(o=>o.id),
    };
  });
  ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
    STATE[k].forEach(o=>{
      const tag=semanticOf(o.type).tag;
      indices.byTag[tag]=indices.byTag[tag]||[];
      indices.byTag[tag].push(o.id);
    });
  });

  // v5.8: 영상 시퀀스 — 사용자 지정 순서(videoSequenceOrder) 우선, 없으면 면적순 자동
  let seqSpaces;
  if(STATE.videoSequenceOrder&&STATE.videoSequenceOrder.length>0){
    seqSpaces=STATE.videoSequenceOrder
      .map(id=>STATE.spaces.find(s=>s.id===id))
      .filter(Boolean);
    // 순서에 없는 공간 뒤에 추가
    STATE.spaces.forEach(s=>{if(!seqSpaces.find(x=>x.id===s.id))seqSpaces.push(s);});
  }else{
    seqSpaces=[...STATE.spaces].sort((a,b)=>spArea(b)-spArea(a));
  }
  const CAMERA_MOVES=['establishing_wide','dolly_in','orbit_right','push_in','pan_across'];
  const walkthrough=seqSpaces.map((s,i)=>({
    spaceId:s.id,
    spaceName:s.name||SPACE_TYPES[s.type].name,
    dwell_sec:i===0?3:5,
    cameraMove:i===0?'establishing_wide':CAMERA_MOVES[1+(i-1)%4],
  }));

  // v5.9: 자가 무결성 검사 — 소비자(BOC/EstimateEngine/AI)가 데이터 신뢰도를 판단할 근거
  const _vset=new Set(STATE.vertices.map(v=>v.id));
  const _spset=new Set(STATE.spaces.map(s=>s.id));
  const integrityIssues=[];
  STATE.walls.forEach(w=>{
    if((w.v1Id&&!_vset.has(w.v1Id))||(w.v2Id&&!_vset.has(w.v2Id))) integrityIssues.push({id:w.id,kind:'wall',problem:'dangling_vertex_ref'});
  });
  STATE.spaces.forEach(s=>{
    if((s.vertexIds||[]).some(vid=>!_vset.has(vid))) integrityIssues.push({id:s.id,kind:'space',problem:'dangling_vertex_ref'});
  });
  STATE.openings.forEach(o=>{
    if(o.spaceId&&!_spset.has(o.spaceId)) integrityIssues.push({id:o.id,kind:'opening',problem:'stale_spaceId'});
  });
  ['furniture','fixtures','lights','electric','hvac'].forEach(k=>STATE[k].forEach(o=>{
    if(o.spaceId&&!_spset.has(o.spaceId)) integrityIssues.push({id:o.id,kind:k,problem:'stale_spaceId'});
  }));
  let _ncCount=0;
  enrichOpenings.forEach(o=>{if(o.parentWallId==='NEEDS_CONFIRMATION')_ncCount++;if(o.parentSpaceId==='NEEDS_CONFIRMATION')_ncCount++;});
  Object.values(enriched).forEach(arr=>arr.forEach(o=>{if(o.parentSpaceId==='NEEDS_CONFIRMATION')_ncCount++;}));

  return{
    schema:'ECOREAN.FloorPlan.v5.9',
    // v5.9: 무결성 리포트 — valid=false면 소비자는 issues 항목을 NEEDS_CONFIRMATION으로 취급할 것
    integrity:{
      valid:integrityIssues.length===0,
      issues:integrityIssues,
      needsConfirmationCount:_ncCount,
      counts:{vertices:STATE.vertices.length,spaces:STATE.spaces.length,walls:STATE.walls.length,openings:STATE.openings.length,
        furniture:STATE.furniture.length,fixtures:STATE.fixtures.length,lights:STATE.lights.length,electric:STATE.electric.length,hvac:STATE.hvac.length},
    },
    vertices:STATE.vertices,  // VEF: 공유 버텍스 원본
    meta:{
      project:STATE.projectName,
      unit:'mm',
      ceilingHeight_mm:STATE.ceilingHeight,
      wallThickness:STATE.wallThickness,
      gridSize:STATE.gridSize, // 2026-08-22: 저장 당시 스냅 격자 스펙 왕복
      drawnAt:new Date().toISOString(),
      tool:'ECOREAN MiniCAD v5.9', // v5.9 fix: 버전 표기 불일치 수정
      coordOrigin:{x:0,y:0,units:'mm',rotation_deg:0,yAxis:'down',note:'화면 좌표계 — +y는 남쪽(아래). placement의 north는 -y 방향'}, // v5.9: 외부 파서의 남북 반전 오해석 방지
      layerNamingScheme:'A-{ELEMENT}-{SPACECODE}-{INDEX02}',
      elementCodes:['AREA','WALL','DOOR','WIND','FURN','FIXT','LITE','ELEC','HVAC','CIRC','ARC','DIMS','ANNO'],
      // 2026-08-26: 문서 설정 왕복 — 견적 옵션·동선 순서·레이어 표시·벽 정렬 (대표 보고: 불러오면 설정이 변경됨)
      settings:buildDocSettings(),
      // v5.7: 차세대 AI 생성 파이프라인 SSoT 메타
      aiPromptHints:STATE.aiPromptHints,
      videoSequence:{
        walkthrough,
        totalDuration_sec:walkthrough.reduce((s,w)=>s+w.dwell_sec,0),
        suggestedFps:24,
        suggestedResolution:'1920x1080',
      },
      ssotPipeline:{
        purpose:'JSON → text-to-image prompts → T2I model (Midjourney/FLUX/SDXL) → renders → text-to-video prompts → T2V model (Sora/Veo/Runway) → walkthrough MP4',
        plus2D_active:STATE.plus2D,
        note:STATE.plus2D?'WARNING: 2.5D mode ON — for sales preview only, NOT for AI parsing':'OK: 평면 모드 — AI vision 친화 기본값',
      },
    },
    spaces:STATE.spaces.map(s=>{
      const st=SPACE_TYPES[s.type]||{name:s.type,code:'GEN',ks:null,color:'#C9A961',waterproof:false}; // v5.9: 미등록 타입 가드
      return{
      // 2026-08-26: 화이트리스트 때문에 사용자 설정(계단 stair·잠금 locked·원형공간 _circleMeta 등)이
      //  저장 시 통째로 빠져 불러오면 기본값으로 되돌아가던 버그 (대표 보고) → 원본 필드 먼저 보존
      ...s,
      id:s.id,name:s.name,type:s.type,typeIndex:s.typeIndex||1,
      layerName:s.layerName||makeLayerName('AREA',s),
      ksCode:st.ks,
      code:st.code,
      color:st.color,
      polygon:s.polygon,
      holes:s.holes||[], // v5.9: 도넛 hole 배열 ([[{x,y},...], ...])
      vertexIds:s.vertexIds, // VEF 그래프 일관성
      ceilingHeight_mm:s.ceilingHeight_mm||STATE.ceilingHeight,
      materialGrade:s.materialGrade,difficulty:s.difficulty,
      waterproofRecommended:st.waterproof?'CONDITIONAL':false, // 헌법: AUTO 금지
      // v5.9 fix: 사용자 방수 결정(3상태)이 JSON에 누락되던 버그 — EstimateEngine 전달용
      waterproofApplied:s.waterproofApplied===true?true:(s.waterproofApplied===false?false:'NEEDS_CONFIRMATION'),
      area_m2:parseFloat(spArea(s).toFixed(4)),
      perimeter_m:parseFloat(spPeri(s).toFixed(4)),
      wallArea_m2:parseFloat(spWall(s).toFixed(4)),
      // v5.8: 자재 선정 (사용자 드롭다운 입력) — v5.9: 미등록 코드 크래시 방지
      floorMaterial:s.floorMaterial||'UNDECIDED',
      floorMaterialName:(FLOOR_MATERIALS[s.floorMaterial]||FLOOR_MATERIALS.UNDECIDED).name,
      // v5.9 fix: 천정재가 JSON에 누락되던 버그 (우클릭 자재 메뉴로 지정 가능한데 미출력)
      ceilingMaterial:s.ceilingMaterial||'UNDECIDED',
      ceilingMaterialName:(CEILING_MATERIALS[s.ceilingMaterial]||CEILING_MATERIALS.UNDECIDED).name,
      // v5.7: AI 친화 시맨틱
      semanticTag:'space_'+st.code.toLowerCase(),
      promptDescriptor:(s.name||st.name)+', '+parseFloat(spArea(s).toFixed(2))+'sqm, '+st.code.toLowerCase(),
    };}),
    walls:STATE.walls.map(w=>({
      ...w,
      wallType:w.wallType||'standard',
      alignment:w.alignment||'center',
      semanticTag:(w.wallType==='bearing')?'load_bearing_wall':(w.spaceId?'interior_partition':'free_wall'),
      promptKeyword:(w.wallType==='bearing')?'load-bearing structural wall (RC concrete)':'standard wall',
    })),
    openings:enrichOpenings,
    furniture:enriched.furniture,
    fixtures:enriched.fixtures,
    lights:enriched.lights,
    electric:enriched.electric,
    hvac:enriched.hvac,
    texts:STATE.texts,measures:STATE.measures,
    circles:STATE.circles,arcs:STATE.arcs,
    curves:STATE.curves||[], // v5.9: 자유곡선 (Bezier)
    leaders:STATE.leaders, // v5.9
    xlines:STATE.xlines||[], // v5.9: 무한 안내선
    pillars:STATE.pillars||[], // v5.9: 기둥 (RC)
    sections:STATE.sections||[], // 2026-08-30: 절단선 (입면 방향선)
    autoDetectedCycles:autoCycles, // v5.7
    relationships, // v5.7
    indices, // v5.7
    layers,
    estimateInput:buildEstimateInput(),
  };
}
function buildEstimateInput(){
  const items=[];
  Object.entries(CATALOG).forEach(([k,c])=>{
    const qty=computeQty(k,c);
    if(qty<=0&&c.applies!=='set') return;
    const cfg=STATE.estimateConfig[k]||{};
    items.push({
      catalogKey:k,name:c.name,category:c.cat,
      unit:c.unit,quantity:parseFloat(qty.toFixed(4)),
      tag:c.tag,
      selectedOption:cfg.option||(c.options?Object.keys(c.options)[0]:null),
      optionName:cfg.option&&c.options?c.options[cfg.option]:(c.options?c.options[Object.keys(c.options)[0]]:null),
      // v5.9 fix: 사용자가 실제 선택했는지 여부 — false면 첫 옵션 기본값일 뿐 (헌법: 미확정 명시)
      optionConfirmed:!!cfg.option,
      unitPrice:'NEEDS_RESEARCH',
    });
  });
  let tf=0,tw=0,tp=0,twa=0;
  STATE.spaces.forEach(s=>{tf+=spArea(s);tw+=spWall(s);tp+=spPeri(s);if(s.waterproofApplied===true) twa+=spArea(s);});
  return{
    summary:{
      totalFloorArea_m2:parseFloat(tf.toFixed(4)),
      totalWallArea_m2:parseFloat(tw.toFixed(4)),
      totalCeilingArea_m2:parseFloat(tf.toFixed(4)),
      totalPerimeter_m:parseFloat(tp.toFixed(4)),
      waterproofArea_m2:parseFloat(twa.toFixed(4)),
      doorCount:STATE.openings.filter(o=>o.type==='DOOR').length,
      windowCount:STATE.openings.filter(o=>o.type==='WINDOW').length,
      lightCount:STATE.lights.length,
      electricCount:STATE.electric.length,
      pyeong:parseFloat((tf*0.3025).toFixed(2)),
    },
    catalogItems:items,
    rules:{
      waterproof:'CONDITIONAL_ONLY',
      autoEstimate:'FORBIDDEN',
      unitPriceSource:'EXTERNAL_BOC_MASTER_DB_REQUIRED',
      needsConfirmation:STATE.spaces.filter(s=>!spCH(s)).map(s=>({spaceId:s.id,field:'ceilingHeight_mm',reason:'천장고 미입력'})),
    },
  };
}
// v5.9: 소비자별 export 프로파일 — 수신자에게 불필요한 노이즈를 제거해 파싱 정확도 향상
//  full      : 전체 (저장/불러오기 왕복용 — 기본)
//  estimate  : EstimateEngine/BOC용 — 작도 보조(안내선·줄자·텍스트)·AI 메타·시맨틱 배열 제거, 물량+공간+개구부만
//  ai_render : T2I/T2V용 — 견적·색인·작도 보조 제거, 시맨틱+지오메트리+프롬프트 힌트 유지
function buildJSONProfile(profile){
  const j=buildJSON();
  if(profile==='estimate'){
    ['texts','measures','circles','arcs','curves','leaders','xlines','autoDetectedCycles','indices','relationships','layers','vertices','furniture','fixtures','lights','electric','hvac'].forEach(k=>delete j[k]);
    if(j.meta){delete j.meta.aiPromptHints;delete j.meta.videoSequence;delete j.meta.ssotPipeline;}
    j.profile='estimate';
  }else if(profile==='ai_render'){
    ['measures','xlines','leaders','estimateInput','indices','autoDetectedCycles','layers','vertices'].forEach(k=>delete j[k]);
    j.profile='ai_render';
  }else{
    j.profile='full';
  }
  return j;
}
// 2026-08-27 PERF: JSON 탭을 열어두면 매 동작마다 무거운 재구성(대형 도면 ~1초)이 돌았다.
//  → 탭이 열려 있을 때는 250ms 디바운스로 묶어 연속 조작 중 멈칫을 없앤다. 탭 전환 시엔 즉시 갱신.
let _jsonTimer=null;
function refreshJSON(){
  if(!_tabActive('json')){_jsonDirty=true;return;}
  _jsonDirty=false;
  if(_jsonTimer) clearTimeout(_jsonTimer);
  _jsonTimer=setTimeout(refreshJSONNow,250);
}
function refreshJSONNow(){
  if(_jsonTimer){clearTimeout(_jsonTimer);_jsonTimer=null;}
  if(!_tabActive('json')){_jsonDirty=true;return;}
  _jsonDirty=false;
  const _prof=document.getElementById('json-profile');
  const t=JSON.stringify(buildJSONProfile(_prof?_prof.value:'full'),null,2);
  const h=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"([^"]+)":/g,'<span class="k">"$1"</span>:')
    .replace(/: "([^"]*)"/g,': <span class="s">"$1"</span>')
    .replace(/: (-?\d+\.?\d*)/g,': <span class="n">$1</span>')
    .replace(/: (true|false|null)/g,': <span class="b">$1</span>');
  document.getElementById('json-out').innerHTML=h;
  refreshVideoSeqUI();
}

// v5.8 Task 4: 영상 동선 순서 편집 UI (드래그 핸들)
function refreshVideoSeqUI(){
  const card=document.getElementById('video-seq-card');
  const listEl=document.getElementById('video-seq-list');
  const hint=document.getElementById('video-seq-hint');
  if(!card||!listEl) return;
  if(STATE.spaces.length===0){card.style.display='none';return;}
  card.style.display='';

  // 현재 표시 순서 결정
  let ordered;
  if(STATE.videoSequenceOrder&&STATE.videoSequenceOrder.length>0){
    ordered=STATE.videoSequenceOrder.map(id=>STATE.spaces.find(s=>s.id===id)).filter(Boolean);
    STATE.spaces.forEach(s=>{if(!ordered.find(x=>x.id===s.id))ordered.push(s);});
    if(hint) hint.textContent='사용자 지정 순서';
  }else{
    ordered=[...STATE.spaces].sort((a,b)=>spArea(b)-spArea(a));
    if(hint) hint.textContent='자동 (면적순)';
  }

  // DOM 재구성
  listEl.innerHTML='';
  let dragSrc=null;
  ordered.forEach((s,i)=>{
    const row=document.createElement('div');
    row.style.cssText='background:var(--bg-card);border:1px solid var(--border);border-radius:3px;'
      +'padding:6px 8px;display:flex;align-items:center;gap:6px;cursor:grab;user-select:none;font-size:10px';
    row.draggable=true;
    row.dataset.id=s.id;
    const sp=SPACE_TYPES[s.type];
    const dot=`<span style="width:8px;height:8px;border-radius:2px;background:${sp?sp.color:'#888'};flex-shrink:0;display:inline-block"></span>`;
    const cam=['establishing_wide','dolly_in','orbit_right','push_in','pan_across'];
    const camLabel=i===0?'establishing_wide':cam[1+(i-1)%4];
    row.innerHTML=`<span style="color:var(--text-tertiary);font-family:var(--mono);min-width:14px">${i+1}</span>`
      +dot
      +`<span style="flex:1;color:var(--text-primary)">${sp?escapeHtml(sp.name):'?'} ${escapeHtml(s.name||'')}</span>`
      +`<span style="color:var(--text-tertiary);font-family:var(--mono);font-size:9px">${camLabel}</span>`
      +`<span style="color:var(--text-tertiary);cursor:grab;padding:0 2px">⋮⋮</span>`;
    // 드래그 이벤트
    row.addEventListener('dragstart',e=>{
      dragSrc=row;
      e.dataTransfer.effectAllowed='move';
      row.style.opacity='0.4';
    });
    row.addEventListener('dragend',()=>{row.style.opacity='';dragSrc=null;});
    row.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';});
    row.addEventListener('dragenter',()=>{if(dragSrc&&dragSrc!==row) row.style.borderColor='var(--gold)';});
    row.addEventListener('dragleave',()=>{row.style.borderColor='var(--border)';});
    row.addEventListener('drop',e=>{
      e.preventDefault();
      row.style.borderColor='var(--border)';
      if(!dragSrc||dragSrc===row) return;
      // 순서 재배열
      const ids=[...listEl.querySelectorAll('[data-id]')].map(el=>el.dataset.id);
      const fi=ids.indexOf(dragSrc.dataset.id),ti=ids.indexOf(row.dataset.id);
      ids.splice(fi,1);ids.splice(ti,0,dragSrc.dataset.id);
      STATE.videoSequenceOrder=ids;
      refreshVideoSeqUI();
      refreshJSON();
    });
    listEl.appendChild(row);
  });
}

// ===== 회전·복제·삭제 =====
function getArr(kind){return{space:STATE.spaces,wall:STATE.walls,opening:STATE.openings,furniture:STATE.furniture,fixtures:STATE.fixtures,lights:STATE.lights,electric:STATE.electric,texts:STATE.texts,measures:STATE.measures,circles:STATE.circles,arcs:STATE.arcs,curves:STATE.curves,hvac:STATE.hvac,leaders:STATE.leaders,xlines:STATE.xlines,pillars:STATE.pillars,sections:STATE.sections}[kind];}

// v5.7: 다중 선택 헬퍼 — boxSelection 우선, 비어있으면 단일 selected
function getSelectedTargets(){
  if(STATE.boxSelection.length>0) return [...STATE.boxSelection];
  if(STATE.selectedKind&&STATE.selectedId) return [{kind:STATE.selectedKind,id:STATE.selectedId}];
  return [];
}

function rotateSelected(){
  // 공간 선택 시: 점·선·면·벽·치수 포함 전체 회전 — 각도 입력 모드
  if(STATE.selectedKind==='space'&&STATE.selectedId){
    const _sp=STATE.spaces.find(s=>s.id===STATE.selectedId);
    if(_sp&&_sp.locked){showStatus('잠금된 공간 — 회전 불가');return;} // 2026-08-24
    enterCmdMode('rotate-space',{spaceId:STATE.selectedId},'회전각(°):','각도 입력 (예: 45, -90, 180) — Enter / ↻ 핸들 드래그도 가능');
    return;
  }
  const targets=getSelectedTargets();
  if(targets.length===0) return;
  let n=0;
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id);
    if(!obj||!('angle' in obj)) return;
    if(obj.locked) return; // 2026-08-24: 잠긴 객체 회전 금지
    obj.angle=((obj.angle||0)+90)%360; n++;
  });
  if(n===0) return;
  saveHistory();renderAll();showStatus('회전 90° ('+n+'개)');
}
function duplicateSelected(){
  let targets=getSelectedTargets();
  if(targets.length===0) return;
  // 2026-08-27: 잠긴 객체는 복제 제외 (대표 지시)
  const _lk=targets.filter(t=>{const o=_findObjByKindId(t.kind,t.id);return o&&o.locked;}).length;
  targets=targets.filter(t=>{const o=_findObjByKindId(t.kind,t.id);return !(o&&o.locked);});
  if(targets.length===0){showStatus('잠금된 객체 — 복제 불가 ('+_lk+'개)');return;}
  const newSel=[];
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    const copy=JSON.parse(JSON.stringify(obj));
    copy.id=makeId(t.kind.charAt(0));
    copy.locked=false; // 2026-08-24: 사본은 잠금 해제로 생성 — 잠금은 원본 보호 목적 (대표 지시)
    if('x' in copy){copy.x+=500;copy.y+=500;}
    // VEF: 새 버텍스 생성 후 getter 재설치
    if('v1Id' in copy){
      copy.v1Id=ensureVertex(copy.x1+500,copy.y1+500).id;
      copy.v2Id=ensureVertex(copy.x2+500,copy.y2+500).id;
      reinstallVEF(copy);
    } else if('x1' in copy){
      copy.x1+=500;copy.y1+=500;copy.x2+=500;copy.y2+=500;
    }
    if('vertexIds' in copy&&copy.polygon){
      copy.vertexIds=copy.polygon.map(p=>ensureVertex(p.x+500,p.y+500).id);
      reinstallVEF(copy);
    } else if(copy.polygon&&!('vertexIds' in copy)){
      copy.polygon=copy.polygon.map(p=>({x:p.x+500,y:p.y+500}));
    }
    arr.push(copy);
    newSel.push({kind:t.kind,id:copy.id});
  });
  if(targets.length>1){STATE.boxSelection=newSel;STATE.selectedKind=null;STATE.selectedId=null;}
  saveHistory();renderAll();refreshUI();showStatus('복제됨 ('+targets.length+'개)');
}
// 2026-08-24: 잠금 강화 — kind/id 로 실제 객체 조회 (잠금 검사용)
function _findObjByKindId(kind,id){
  if(kind==='space') return STATE.spaces.find(x=>x.id===id);
  if(kind==='wall') return STATE.walls.find(x=>x.id===id);
  if(kind==='opening') return STATE.openings.find(x=>x.id===id);
  const arr=getArr(kind);
  return arr?arr.find(x=>x.id===id):null;
}
function deleteSelected(){
  let targets=getSelectedTargets();
  if(targets.length===0) return;
  // 2026-08-24: 잠금 강화 — 잠긴 객체는 삭제 대상에서 제외 (대표 지시)
  const lockedCnt=targets.filter(t=>{const o=_findObjByKindId(t.kind,t.id);return o&&o.locked;}).length;
  targets=targets.filter(t=>{const o=_findObjByKindId(t.kind,t.id);return !(o&&o.locked);});
  if(targets.length===0){showStatus('잠금된 객체 — 삭제 불가 ('+lockedCnt+'개)');return;}
  targets.forEach(t=>{
    if(t.kind==='space'){
      STATE.spaces=STATE.spaces.filter(x=>x.id!==t.id);
      STATE.openings=STATE.openings.filter(o=>o.spaceId!==t.id);
      // v5.9: 공간 삭제 시 그 공간 소유 벽도 함께 제거
      STATE.walls=STATE.walls.filter(w=>w.spaceId!==t.id);
      // 자식 라이브러리 객체도 함께 제거
      ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
        STATE[k]=STATE[k].filter(o=>o.spaceId!==t.id);
      });
    }else if(t.kind==='wall'){STATE.walls=STATE.walls.filter(x=>x.id!==t.id);}
    else if(t.kind==='opening'){STATE.openings=STATE.openings.filter(x=>x.id!==t.id);}
    else{
      const arr=getArr(t.kind);
      if(arr){const idx=arr.findIndex(x=>x.id===t.id);if(idx>=0) arr.splice(idx,1);}
    }
  });
  STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];
  // 공간 삭제 시 커스텀 동선 순서에서도 제거
  if(STATE.videoSequenceOrder){
    const delIds=new Set(targets.filter(t=>t.kind==='space').map(t=>t.id));
    STATE.videoSequenceOrder=STATE.videoSequenceOrder.filter(id=>!delIds.has(id));
    if(STATE.videoSequenceOrder.length===0) STATE.videoSequenceOrder=null;
  }
  // 2026-08-27: 삭제된 조명은 스위치 회로·점핑 목록에서도 제거 (끊긴 참조 방지)
  (function(){
    const gone=new Set(targets.filter(t=>t.kind==='lights').map(t=>t.id));
    if(!gone.size) return;
    (STATE.electric||[]).forEach(e=>{if(Array.isArray(e.lightIds)) e.lightIds=e.lightIds.filter(id=>!gone.has(id));});
    (STATE.lights||[]).forEach(l=>{if(Array.isArray(l.jumpIds)) l.jumpIds=l.jumpIds.filter(id=>!gone.has(id));});
  })();
  cleanupOrphanVertices();
  saveHistory();renderAll();refreshUI();showStatus('삭제 ('+targets.length+'개)'+(lockedCnt?' — 잠금 '+lockedCnt+'개 제외':''));
}

// ===== 토글 =====
function toggleGrid(){STATE.showGrid=!STATE.showGrid;document.getElementById('btn-grid').classList.toggle('gold',STATE.showGrid);drawGrid();showStatus('그리드: '+(STATE.showGrid?'ON':'OFF'));}
function toggleDim(){STATE.showDimensions=!STATE.showDimensions;document.getElementById('btn-dim').classList.toggle('gold',STATE.showDimensions);renderAll();showStatus('치수: '+(STATE.showDimensions?'ON':'OFF'));}
// 2026-08-27: 배선 전체 보기 (대표 지시) — 스위치→조명 회로선 + 조명↔조명 점핑선을 한 번에 표시
function updateCircuitsBtn(){
  const b=document.getElementById('btn-circuits');
  if(b) b.classList.toggle('gold',!!STATE.showCircuits);
}
function toggleCircuits(){
  STATE.showCircuits=!STATE.showCircuits;
  updateCircuitsBtn();
  renderAll();
  if(typeof saveSnapPrefs==='function') saveSnapPrefs();
  const n=(STATE.electric||[]).reduce((a,e)=>a+((e.lightIds||[]).length),0)
        + (STATE.lights||[]).reduce((a,l)=>a+((l.jumpIds||[]).length),0);
  showStatus('배선 전체 보기: '+(STATE.showCircuits?('ON — 연결 '+n+'개'):'OFF'));
}
// ===== 2026-08-29: 겹친 조명 찾기·정리 (대표 지시 — "다운라이트가 중복되면 빨간색으로") =====
function reportDuplicateLights(){
  const d=duplicateLightGroups();
  if(!d.ids.size){cmdToast('✅ 겹친 조명 없음');showStatus('겹친 조명 없음');return 0;}
  // 첫 번째 중복을 골라 둔다 — 속성 패널에서 바로 정리할 수 있게
  const first=[...d.rep.keys()][0];
  if(first&&typeof selectObj==='function') selectObj('lights',first);
  renderAll();refreshUI();
  cmdToast('⚠ 겹친 조명 '+d.rep.size+'곳 · '+d.ids.size+'개 — 전부 정리는 dup fix');
  showStatus('겹친 조명 '+d.rep.size+'곳 ('+d.ids.size+'개) — 빨간 점선 표시');
  return d.rep.size;
}
// onlyId 가 있으면 그 무리만, 없으면 도면 전체
function cleanDuplicateLights(onlyId){
  const d=duplicateLightGroups();
  if(!d.ids.size){cmdToast('겹친 조명 없음');return 0;}
  const reps=onlyId?[onlyId]:[...d.rep.keys()];
  const remove=new Set();
  reps.forEach(rid=>{
    const mem=duplicateLightPeers(rid).map(id=>STATE.lights.find(l=>l.id===id)).filter(Boolean);
    if(mem.length<2) return;
    // 잠금된 것이 있으면 그걸 남긴다 (잠금은 지우지 않는다는 규칙)
    const locked=mem.filter(l=>l.locked);
    const survivor=locked[0]||(onlyId?(mem.find(l=>l.id===onlyId)||mem[0]):mem[0]);
    mem.forEach(l=>{if(l===survivor||l.locked) return;remove.add(l.id);});
  });
  if(!remove.size){cmdToast('지울 것 없음 — 겹친 조명이 모두 잠금 상태입니다');return 0;}
  STATE.lights=STATE.lights.filter(l=>!remove.has(l.id));
  // 회로·점핑 참조도 함께 정리 (사라진 id 가 남지 않게)
  const live=new Set(STATE.lights.map(l=>l.id));
  (STATE.electric||[]).forEach(e=>{if(Array.isArray(e.lightIds)) e.lightIds=e.lightIds.filter(id=>live.has(id));});
  (STATE.lights||[]).forEach(l=>{if(Array.isArray(l.jumpIds)) l.jumpIds=l.jumpIds.filter(id=>live.has(id));});
  if(STATE.selectedKind==='lights'&&!live.has(STATE.selectedId)){STATE.selectedKind=null;STATE.selectedId=null;}
  STATE.boxSelection=(STATE.boxSelection||[]).filter(b=>b.kind!=='lights'||live.has(b.id));
  if(typeof invalidateDuplicateLights==='function') invalidateDuplicateLights();
  saveHistory();renderAll();refreshUI();
  cmdToast('겹친 조명 정리 — '+remove.size+'개 삭제 (Ctrl+Z 취소)');
  return remove.size;
}
// 2026-08-28: 기호 이름 라벨 표시 모드 (대표 지시 — 다운라이트 글씨 도배·렉)
const SYMBOL_LABEL_BTN={smart:'🏷 라벨·묶음',off:'🏷 라벨·끕',all:'🏷 라벨·전부'};
const SYMBOL_LABEL_DESC={smart:'묶음 대표만 — 같은 공간·같은 종류는 1개 + ×개수',
                         off:'끕 — 선택한 것만 표시',all:'전부 표시'};
function updateSymbolLabelBtn(){
  const b=document.getElementById('btn-symlabel');
  if(!b) return;
  const m=symbolLabelMode();
  b.textContent=SYMBOL_LABEL_BTN[m];
  b.classList.toggle('gold',m!=='off');
  b.title='기호 이름 글씨 — '+SYMBOL_LABEL_DESC[m]+' (클릭 = 묶음 → 끕 → 전부, 명령: lab)';
}
function setSymbolLabelMode(m){
  if(SYMBOL_LABEL_MODES.indexOf(m)<0) return;
  STATE.symbolLabelMode=m;
  updateSymbolLabelBtn();renderAll();refreshUI();
  if(typeof saveSnapPrefs==='function') saveSnapPrefs();
  showStatus('기호 이름 라벨: '+SYMBOL_LABEL_DESC[m]);
}
function cycleSymbolLabelMode(){
  const i=SYMBOL_LABEL_MODES.indexOf(symbolLabelMode());
  setSymbolLabelMode(SYMBOL_LABEL_MODES[(i+1)%SYMBOL_LABEL_MODES.length]);
}
// v5.7: 2.5D 영업 모드 토글 — 인쇄/JSON/AI번들 시 강제 OFF
function toggle2_5D(){
  STATE.plus2D=!STATE.plus2D;
  document.getElementById('btn-2_5d').classList.toggle('gold',STATE.plus2D);
  renderAll();
  showStatus('2.5D 영업 모드: '+(STATE.plus2D?'ON (영업/미리보기 전용 — 인쇄·JSON 강제 OFF)':'OFF (시공 도면 모드)'));
}

// ===== 줌 =====
function zoomBy(factor){
  const oldZoom=STATE.zoom;
  const newZoom=clampZoom(oldZoom*factor);
  if(newZoom===oldZoom) return;
  const cx=stage.width()/2,cy=stage.height()/2;
  STATE.offsetX=cx-(cx-STATE.offsetX)*(newZoom/oldZoom);
  STATE.offsetY=cy-(cy-STATE.offsetY)*(newZoom/oldZoom);
  STATE.zoom=newZoom;
  drawGrid();renderAll();
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'% · 1/'+Math.max(1,Math.round(100/STATE.zoom));
}
function zoomFit(){
  if(STATE.spaces.length===0){STATE.zoom=1;STATE.offsetX=200;STATE.offsetY=100;drawGrid();renderAll();document.getElementById('zoom-pct').textContent='100% · 1/100';return;}
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  STATE.spaces.forEach(s=>s.polygon.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}));
  const wMm=maxX-minX,hMm=maxY-minY,padding=120;
  const zw=(stage.width()-padding*2)/((wMm/1000)*STATE.scale);
  const zh=(stage.height()-padding*2)/((hMm/1000)*STATE.scale);
  STATE.zoom=clampZoom(Math.min(zw,zh,3));
  STATE.offsetX=padding-mmToPx(minX);
  STATE.offsetY=padding-mmToPx(minY);
  drawGrid();renderAll();
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'% · 1/'+Math.max(1,Math.round(100/STATE.zoom));
}

// ===== 저장/불러오기 =====
function saveJSON(){
  const json=buildJSON();
  const blob=new Blob([JSON.stringify(json,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=STATE.projectName.replace(/\s+/g,'_')+'_'+Date.now()+'.json';
  a.click();URL.revokeObjectURL(url);
  showStatus('저장됨');
}
function loadJSON(){
  const input=document.createElement('input');
  input.type='file';input.name='load-json-file';input.accept='.json';
  input.onchange=e=>{
    const f=e.target.files[0];if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const d=JSON.parse(ev.target.result);
        if(!d.schema||!d.schema.startsWith('ECOREAN.FloorPlan')){alert('ECOREAN MiniCAD 파일이 아닙니다');return;}
        // 2026-08-22: 대표 지시 4번 — 저장 당시 스펙을 그대로 적용, meta 에 없는 값은 현재 값 유지 (기본값으로 초기화 금지)
        // 2026-08-24 v6.0: 적용 로직을 applyLoadedData 로 공용화 (자동 저장 복구와 공유)
        applyLoadedData(d);
        showStatus('불러옴 ('+d.schema+' → 마이그레이션 완료)');
      }catch(err){alert('파일 읽기 실패: '+err.message);}
    };
    r.readAsText(f);
  };
  input.click();
}

// ===== v5.9+ 서버 저장/불러오기 (공용 클라우드 — 전 직원 공유) =====
// window.APP_CLOUD(app-cloud.js) 사용. 기존 파일 저장/불러오기(saveJSON/loadJSON)와 병존 — 순수 추가.
const CLOUD_APP='minicad';
function _cloudSlug(s){
  return String(s||'').trim().toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,40)||'plan';
}
function _cloudReady(){
  if(typeof APP_CLOUD==='undefined'||!APP_CLOUD.ready||!APP_CLOUD.ready()){
    alert('로그인 후 이용 가능합니다. (직원 로그인 필요)');
    return false;
  }
  return true;
}
// loadJSON의 STATE 복원 로직 재사용 — 파일 대신 서버 문서 데이터(d)로 STATE를 채운다.
function applyCloudDoc(d){
  if(!d||!d.schema||!String(d.schema).startsWith('ECOREAN.FloorPlan')){
    alert('ECOREAN MiniCAD 도면 데이터가 아닙니다');return false;
  }
  // 2026-08-26: 파일 불러오기와 동일 경로로 일원화 (applyLoadedData) —
  //  로직이 두 벌이라 한쪽만 갱신되면 설정이 유실되던 문제 재발 방지 (대표 보고)
  applyLoadedData(d);
  return true;
}
// 서버 저장 — doc_key는 STATE.cloudDocKey(없으면 생성) 고정 → 재저장 시 같은 문서 업데이트
function cloudSaveDrawing(){
  if(!_cloudReady())return;
  if(!STATE.cloudDocKey) STATE.cloudDocKey='dwg-'+_cloudSlug(STATE.projectName)+'-'+Date.now();
  const title=STATE.projectName||'제목 없음';
  const data=buildJSON();
  showStatus('서버 저장 중…');
  APP_CLOUD.save(CLOUD_APP,STATE.cloudDocKey,title,data).then(function(){
    showStatus('☁ 서버에 저장됨 — '+title);
  }).catch(function(err){
    console.error('[cloud save]',err);
    alert('서버 저장 실패: '+(err&&err.message||err));
  });
}
function _cloudEnsureModal(){
  let m=document.getElementById('cloud-modal');
  if(m)return m;
  m=document.createElement('div');
  m.id='cloud-modal';
  m.style.cssText='display:none;position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,0.7);align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  m.innerHTML='<div style="max-width:560px;width:92%;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;background:#1A1B2E;border:1px solid #3D4466;border-radius:12px;box-shadow:0 8px 50px rgba(0,0,0,0.6);color:#F5F1EB;font-family:\'Inter Tight\',Inter,sans-serif">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #2D3050">'+
        '<div style="font-size:15px;font-weight:700">☁ 서버 도면 (전 직원 공유)</div>'+
        '<button id="cloud-modal-close" style="background:#2D3748;color:#9CA3AF;border:none;border-radius:6px;padding:5px 11px;cursor:pointer;font-size:13px">✕</button>'+
      '</div>'+
      '<div id="cloud-modal-body" style="overflow-y:auto;padding:14px 18px;font-size:12px"></div>'+
    '</div>';
  document.body.appendChild(m);
  m.addEventListener('click',function(e){if(e.target===m)m.style.display='none';});
  m.querySelector('#cloud-modal-close').addEventListener('click',function(){m.style.display='none';});
  return m;
}
// 서버 도면 목록 → 모달 표시. 각 항목 [열기][삭제]
function cloudShowList(){
  if(!_cloudReady())return;
  const m=_cloudEnsureModal();
  const body=m.querySelector('#cloud-modal-body');
  body.innerHTML='<p style="color:#7B82B5;text-align:center;padding:20px">불러오는 중…</p>';
  m.style.display='flex';
  APP_CLOUD.list(CLOUD_APP).then(function(rows){
    rows=rows||[];
    if(!rows.length){body.innerHTML='<p style="color:#7B82B5;text-align:center;padding:30px">저장된 서버 도면이 없습니다.<br>도면을 그린 뒤 <b>☁ 서버 저장</b>을 눌러 보세요.</p>';return;}
    body.innerHTML=rows.map(function(r){
      const when=r.updated_at?new Date(r.updated_at).toLocaleString('ko-KR'):'';
      const cur=(STATE.cloudDocKey===r.doc_key);
      return '<div class="cloud-item" style="display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:8px;background:#0F101A;border:1px solid '+(cur?'#C9A961':'#2D3050')+';border-radius:8px">'+
          '<div style="flex:1;min-width:0">'+
            '<div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escapeHtml(r.title||r.doc_key)+(cur?' <span style="color:#C9A961;font-size:10px">(현재)</span>':'')+'</div>'+
            '<div style="color:#7B82B5;font-size:10px;margin-top:2px">'+escapeHtml(r.updated_by||'—')+' · '+escapeHtml(when)+'</div>'+
          '</div>'+
          '<button class="cloud-open btn sm gold" data-key="'+escapeHtml(r.doc_key)+'">열기</button>'+
          '<button class="cloud-del btn sm danger" data-key="'+escapeHtml(r.doc_key)+'">삭제</button>'+
        '</div>';
    }).join('');
    body.querySelectorAll('.cloud-open').forEach(function(b){b.addEventListener('click',function(){cloudOpen(b.dataset.key);});});
    body.querySelectorAll('.cloud-del').forEach(function(b){b.addEventListener('click',function(){cloudDelete(b.dataset.key);});});
  }).catch(function(err){
    console.error('[cloud list]',err);
    body.innerHTML='<p style="color:#E2725B;text-align:center;padding:20px">목록 불러오기 실패: '+escapeHtml(err&&err.message||String(err))+'</p>';
  });
}
function cloudOpen(docKey){
  if(!_cloudReady())return;
  showStatus('서버 도면 불러오는 중…');
  APP_CLOUD.load(CLOUD_APP,docKey).then(function(doc){
    if(!doc){alert('도면을 찾을 수 없습니다.');return;}
    if(applyCloudDoc(doc.data)){
      STATE.cloudDocKey=doc.doc_key;
      const m=document.getElementById('cloud-modal');if(m)m.style.display='none';
      showStatus('☁ 불러옴 — '+(doc.title||doc.doc_key));
    }
  }).catch(function(err){
    console.error('[cloud open]',err);
    alert('불러오기 실패: '+(err&&err.message||err));
  });
}
function cloudDelete(docKey){
  if(!_cloudReady())return;
  if(!confirm('이 서버 도면을 삭제할까요? (전 직원에게서 사라집니다)'))return;
  APP_CLOUD.remove(CLOUD_APP,docKey).then(function(){
    if(STATE.cloudDocKey===docKey)STATE.cloudDocKey=null;
    showStatus('서버 도면 삭제됨');
    cloudShowList();
  }).catch(function(err){
    console.error('[cloud delete]',err);
    alert('삭제 실패: '+(err&&err.message||err));
  });
}

// v5.8: 구버전 데이터 → v5.8 스키마 마이그레이션 (v5.7 확장)
// - layerName 누락 객체 자동 생성
// - typeIndex 누락 자동 채움
// - flipped 기본값 false
// - floorMaterial 누락 시 defaultMaterials() 기반 자동 보충 (v5.8)
// - wallMaterial → wall.finishMaterial 이전 (v5.9)
// - parentId(가구→공간, 도어→벽) 자동 추론 NEEDS_CONFIRMATION 처리
function migrateLoadedState(schema){
  let warns=0;
  // 공간 typeIndex/code/layerName/자재 보충
  const typeCounters={};
  STATE.spaces.forEach(s=>{
    if(!SPACE_TYPES[s.type]) s.type='ROOM';
    typeCounters[s.type]=(typeCounters[s.type]||0)+1;
    if(!s.typeIndex) s.typeIndex=typeCounters[s.type];
    if(!s.code) s.code=SPACE_TYPES[s.type].code;
    if(!s.layerName) s.layerName='A-AREA-'+s.code+'-'+String(s.typeIndex).padStart(2,'0');
    if(s.waterproofRecommended===undefined) s.waterproofRecommended=SPACE_TYPES[s.type].waterproof?'CONDITIONAL':false;
    // v5.9: 천장고 추종 모델 — 타입 기본값과 동일하게 박힌(자동 배정) 천장고는 null로 되돌려 프로젝트 기본 천장고를 따라가게 함
    if(s.ceilingHeight_mm!=null && s.ceilingHeight_mm===SPACE_TYPES[s.type].ceil) s.ceilingHeight_mm=null;
    if(!s.floorMaterial){s.floorMaterial=defaultMaterials(s.type).floor;warns++;}
    // v5.9: wallMaterial → wall.finishMaterial 이전 (구버전 호환)
    if(s.wallMaterial){
      STATE.walls.filter(w=>w.spaceId===s.id&&!w.isLine).forEach(w=>{if(!w.finishMaterial)w.finishMaterial=s.wallMaterial;});
      delete s.wallMaterial;
    }
  });
  // 벽 layerName 보충
  STATE.walls.forEach(w=>{
    if(!w.layerName){
      const sp=w.spaceId?STATE.spaces.find(s=>s.id===w.spaceId):null;
      const code=sp?sp.code:'GEN';
      const idx=sp?String(sp.typeIndex||1).padStart(2,'0'):'01';
      w.layerName='A-WALL-'+code+'-'+idx;warns++;
    }
    if(!w.thickness) w.thickness=100;
  });
  // 도어/창
  STATE.openings.forEach(o=>{
    if(!o.layerName){
      const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null;
      const code=sp?sp.code:'GEN';
      const idx=sp?String(sp.typeIndex||1).padStart(2,'0'):'01';
      o.layerName='A-'+(o.type==='DOOR'?'DOOR':'WIND')+'-'+code+'-'+idx;warns++;
    }
  });
  // 라이브러리 객체 (가구/위생/조명/전기/공조)
  ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
    (STATE[k]||[]).forEach(o=>{
      if(o.flipped===undefined) o.flipped=false;
      if(!o.layerName){
        const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null;
        const code=sp?sp.code:'GEN';
        const idx=sp?String(sp.typeIndex||1).padStart(2,'0'):'01';
        const elemMap={furniture:'FURN',fixtures:'FIXT',lights:'LITE',electric:'ELEC',hvac:'HVAC'};
        o.layerName='A-'+elemMap[k]+'-'+code+'-'+idx;warns++;
      }
    });
  });
  if(warns>0) console.warn('[ECOREAN v5.7] 마이그레이션: '+warns+'개 객체 layerName 자동 보충 (원본 schema='+schema+')');

  // VEF 마이그레이션: 구버전(flat x1/y1/x2/y2) → 버텍스 시스템으로 업그레이드
  STATE.walls=STATE.walls.map(w=>{
    if('v1Id' in w) return reinstallVEF(w); // v5.8+ 파일: getter만 재설치
    // 구버전: flat 좌표 → 버텍스 생성
    const v1=ensureVertex(w.x1||0,w.y1||0);
    const v2=ensureVertex(w.x2||0,w.y2||0);
    return makeWallVEF(v1.id,v2.id,w);
  });
  STATE.spaces=STATE.spaces.map(s=>{
    if('vertexIds' in s) return reinstallVEF(s); // v5.8+ 파일: getter만 재설치
    // 구버전: flat polygon → 버텍스 생성
    const polygon=s.polygon||[];
    const vertexIds=polygonToVertexIds(polygon);
    return makeSpaceVEF(vertexIds,{...s});
  });
}

// ===== 2026-08-24 v6.0 업그레이드 (대표 지시: 실무 도면력·UX·안정성·AI 자동화) =====

// --- 2026-08-26: 스위치→조명 회로 연동 (대표 지시) ---
// 2026-08-27: 연결 모드 상시 배너 — 종료 전까지 계속 켜져 있음을 눈으로 확인 (대표 지시)
function _circuitBanner(){
  let el=document.getElementById('circuit-link-banner');
  const link=window._circuitLink, jump=window._jumpLink, attach=window._circuitAttach;
  if(!link&&!jump&&!attach){ if(el) el.remove(); return; }
  let n=0;
  if(attach){ n=(attach.lightIds||[]).length; }
  else if(link){
    const sw=STATE.electric.find(e=>e.id===link.switchId);
    n=sw&&Array.isArray(sw.lightIds)?sw.lightIds.filter(id=>STATE.lights.some(l=>l.id===id)).length:0;
  }else{
    n=(typeof jumpNeighbors==='function')?jumpNeighbors(jump.lightId).length:0;
  }
  if(!el){
    el=document.createElement('div');
    el.id='circuit-link-banner';
    el.style.cssText='position:fixed;top:96px;left:50%;transform:translateX(-50%);z-index:9200;'
      +'background:rgba(123,160,91,0.95);color:#0A0A0A;font-family:Inter,sans-serif;font-weight:700;'
      +'font-size:12px;padding:8px 14px;border-radius:20px;box-shadow:0 4px 18px rgba(0,0,0,0.45);'
      +'display:flex;align-items:center;gap:10px;pointer-events:auto';
    const txt=document.createElement('span'); txt.id='circuit-link-text';
    const btn=document.createElement('button');
    btn.textContent='종료 (Esc)';
    btn.style.cssText='background:#0A0A0A;color:#7BA05B;border:none;border-radius:12px;padding:3px 10px;'
      +'font-size:11px;font-weight:700;cursor:pointer';
    btn.addEventListener('click',()=>{
      if(window._circuitAttach&&typeof endCircuitAttach==='function') endCircuitAttach();
      else if(window._jumpLink&&typeof endJumpLink==='function') endJumpLink();
      else if(typeof endCircuitLink==='function') endCircuitLink();
    });
    el.appendChild(txt);el.appendChild(btn);
    document.body.appendChild(el);
  }
  const t=document.getElementById('circuit-link-text');
  if(t) t.textContent=attach
    ? ('🔌 조명 '+n+'개 — 연결할 스위치를 클릭하세요')
    : ((jump?'🔗 점핑 연결 모드 — 클릭·드래그':'🔌 조명 연결 모드 — 클릭·드래그')+
       ' · Alt+드래그=해제 (연결 '+n+'개)');
  if(el) el.style.background=attach?'rgba(91,160,212,0.96)':(jump?'rgba(212,184,114,0.96)':'rgba(123,160,91,0.95)');
}
function toggleCircuitLink(switchId,lightId){
  const sw=STATE.electric.find(e=>e.id===switchId);
  if(!sw){window._circuitLink=null;_circuitBanner();return;}
  if(!Array.isArray(sw.lightIds)) sw.lightIds=[];
  const i=sw.lightIds.indexOf(lightId);
  if(i>=0){sw.lightIds.splice(i,1);if(sw.lightGang) delete sw.lightGang[lightId];
    cmdToast('조명 연결 해제 — 총 '+sw.lightIds.length+'개');}
  else{
    sw.lightIds.push(lightId);
    // 2026-08-30: 지금 고른 구에 배정
    const _g=(window._circuitLink&&window._circuitLink.switchId===switchId)?(window._circuitLink.gang||0):0;
    setLightGang(sw,lightId,_g);
    cmdToast('조명 연결 — '+(switchGangCount(sw.type)>1?((_g+1)+'구 '):'')+'총 '+gangLightIds(sw,_g).length+'개');
  }
  // 2026-08-27: 연결 후에도 모드·선택을 그대로 유지 (종료 전까지 계속 작동)
  STATE.selectedKind='electric';STATE.selectedId=switchId;STATE.boxSelection=[];
  saveHistory();renderAll();refreshUI();_circuitBanner();
}
// ===== 2026-08-29: 여러 조명을 한 번에 연결 (대표 지시 — "드래그로 선택된 조명들은 조명연결을") =====
//  종전엔 스위치를 고르고 조명을 하나씩 클릭해야 했다. 다운라이트 12개면 12번 클릭이다.
//  두 방향 모두 열어 둔다.
//   A. 조명 먼저 — 드래그로 조명들을 고른 뒤 [스위치에 연결] → 스위치 한 번 클릭
//   B. 스위치 먼저 — 조명 연결 모드에서 드래그하면 박스 안 조명이 한꺼번에 연결
function selectedLightIds(){
  const ids=[];
  (STATE.boxSelection||[]).forEach(b=>{if(b.kind==='lights'&&STATE.lights.some(l=>l.id===b.id))ids.push(b.id);});
  if(!ids.length&&STATE.selectedKind==='lights'&&STATE.selectedId) ids.push(STATE.selectedId);
  return [...new Set(ids)];
}
// 박스(mm) 안에 들어온 조명 — 점형 기호라 중심점으로 판정한다
function lightsInBoxMm(x1,y1,x2,y2){
  const lo={x:Math.min(x1,x2),y:Math.min(y1,y2)}, hi={x:Math.max(x1,x2),y:Math.max(y1,y2)};
  return (STATE.lights||[]).filter(l=>l.x>=lo.x&&l.x<=hi.x&&l.y>=lo.y&&l.y<=hi.y).map(l=>l.id);
}
// 스위치에 여러 조명을 한 번에 붙인다 (이미 붙은 건 그대로 둔다)
function attachLightsToSwitch(switchId,lightIds,opts){
  const sw=(STATE.electric||[]).find(e=>e.id===switchId);
  if(!sw){cmdToast('스위치를 찾을 수 없습니다');return 0;}
  if(typeof isSwitchType==='function'&&!isSwitchType(sw.type)){
    cmdToast('스위치·디머만 회로에 연결할 수 있습니다');return 0;
  }
  if(!Array.isArray(sw.lightIds)) sw.lightIds=[];
  let added=0;
  // 2026-08-30: 연결 모드에서 고른 구로 들어간다 (없으면 1구)
  const gIdx=(opts&&typeof opts.gang==='number')?opts.gang
    :((window._circuitLink&&window._circuitLink.switchId===switchId)?(window._circuitLink.gang||0):0);
  (lightIds||[]).forEach(id=>{
    if(!STATE.lights.some(l=>l.id===id)) return;
    if(sw.lightIds.indexOf(id)>=0){setLightGang(sw,id,gIdx);return;}
    sw.lightIds.push(id);setLightGang(sw,id,gIdx);added++;
  });
  syncSwitchCircuitOn(sw);
  if(!added){cmdToast('이미 모두 연결돼 있습니다 — 총 '+sw.lightIds.length+'개');}
  else{
    saveHistory();
    cmdToast('🔌 조명 '+added+'개 연결 — 이 스위치 총 '+sw.lightIds.length+'개');
  }
  if(!(opts&&opts.keepMode)) window._circuitAttach=null;
  STATE.selectedKind='electric';STATE.selectedId=switchId;STATE.boxSelection=[];
  renderAll();refreshUI();_circuitBanner();
  return added;
}
// A. 조명 먼저 — 고른 조명들을 들고 스위치를 기다린다
function startCircuitAttach(ids){
  const lightIds=(ids&&ids.length)?ids:selectedLightIds();
  if(!lightIds.length){cmdToast('먼저 조명을 선택하세요 (드래그로 여러 개 선택 가능)');return;}
  window._circuitAttach={lightIds};
  window._circuitLink=null;window._jumpLink=null;
  renderAll();refreshUI();_circuitBanner();
  cmdToast('🔌 조명 '+lightIds.length+'개 — 연결할 스위치를 클릭하세요 (Esc 취소)');
  showStatus('조명 '+lightIds.length+'개 연결 대기 — 스위치를 클릭하세요');
}
function endCircuitAttach(silent){
  if(!window._circuitAttach) return;
  window._circuitAttach=null;
  renderAll();refreshUI();_circuitBanner();
  if(!silent) showStatus('조명 연결 취소');
}
// 고른 조명들끼리 점핑(데이지 체인) — 가까운 순서대로 이어 붙인다
function chainSelectedLights(ids){
  const lightIds=(ids&&ids.length)?ids:selectedLightIds();
  if(lightIds.length<2){cmdToast('조명을 2개 이상 선택하세요');return 0;}
  const pts=lightIds.map(id=>STATE.lights.find(l=>l.id===id)).filter(Boolean);
  if(pts.length<2) return 0;
  // 최근접 이웃 순서로 일단 이어붙이고
  const order=[pts.shift()];
  while(pts.length){
    const cur=order[order.length-1];
    let bi=0,bd=Infinity;
    pts.forEach((p,i)=>{const d=(p.x-cur.x)**2+(p.y-cur.y)**2;if(d<bd){bd=d;bi=i;}});
    order.push(pts.splice(bi,1)[0]);
  }
  // 2026-08-30: 2-opt 로 교차를 개다 (대표 지시 — 점핑선을 최대한 깔끔하게).
  //  최근접 순서만으로는 마지막에 먼 점으로 되돌아오며 선이 서로 엇갈린다.
  //  두 변을 바꿔 총 길이가 줄면 교차가 품린다 — 평면에서 교차는 항상 더 길기 때문.
  (function(){
    const D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    let improved=true, guard=0;
    while(improved&&guard++<40){
      improved=false;
      for(let i=0;i<order.length-2;i++){
        for(let k=i+2;k<=order.length-1;k++){
          const a=order[i], b=order[i+1], c=order[k], d=order[k+1];
          const before=D(a,b)+(d?D(c,d):0);
          const after =D(a,c)+(d?D(b,d):0);
          if(after<before-1){
            const seg=order.slice(i+1,k+1).reverse();
            order.splice(i+1,k-i,...seg);
            improved=true;
          }
        }
      }
    }
  })();
  let n=0;
  for(let i=0;i<order.length-1;i++){
    const a=order[i],b=order[i+1];
    if(!Array.isArray(a.jumpIds)) a.jumpIds=[];
    if(a.jumpIds.indexOf(b.id)<0&&!(Array.isArray(b.jumpIds)&&b.jumpIds.indexOf(a.id)>=0)){
      a.jumpIds.push(b.id);n++;
    }
  }
  if(!n){cmdToast('이미 점핑으로 이어져 있습니다');return 0;}
  saveHistory();renderAll();refreshUI();
  cmdToast('🔗 점핑 '+n+'개 연결 — 조명 '+order.length+'개를 한 줄로');
  return n;
}
// ===== 2026-08-29: 여러 조명 한 번에 해제 (대표 지시 — "해제할 때도 여러 개를 선택하고") =====
//  붙이는 길만 열어 두면 반쪽이다. 12개를 쓸어 담아 붙였는데 4개를 빼려면 다시 하나씩 눌러야 했다.
//  연결과 같은 두 방향으로 해제도 연다.
// 이 조명이 걸려 있는 스위치들
function switchesOfLight(lightId){
  return (STATE.electric||[]).filter(e=>Array.isArray(e.lightIds)&&e.lightIds.indexOf(lightId)>=0);
}
// A. 조명 먼저 — 고른 조명을 걸려 있는 모든 스위치에서 뺀다 (스위치를 다시 고를 필요 없이)
function detachSelectedLights(ids){
  const lightIds=(ids&&ids.length)?ids:selectedLightIds();
  if(!lightIds.length){cmdToast('먼저 조명을 선택하세요');return 0;}
  const set=new Set(lightIds);
  let removed=0, swN=0;
  (STATE.electric||[]).forEach(e=>{
    if(!Array.isArray(e.lightIds)||!e.lightIds.length) return;
    const before=e.lightIds.length;
    e.lightIds=e.lightIds.filter(id=>!set.has(id));
    const d=before-e.lightIds.length;
    if(d){removed+=d;swN++;
      if(e.lightGang) set.forEach(id=>{delete e.lightGang[id];});
      if(typeof syncSwitchCircuitOn==='function') syncSwitchCircuitOn(e);}
  });
  if(!removed){cmdToast('연결된 회로가 없습니다');return 0;}
  saveHistory();renderAll();refreshUI();_circuitBanner();
  cmdToast('🔌 회로 해제 — 조명 '+removed+'개 (스위치 '+swN+'개에서)');
  return removed;
}
// 고른 조명들의 점핑을 푼다 — 나가는 연결과 들어오는 연결 모두
function unchainSelectedLights(ids){
  const lightIds=(ids&&ids.length)?ids:selectedLightIds();
  if(!lightIds.length){cmdToast('먼저 조명을 선택하세요');return 0;}
  const set=new Set(lightIds);
  let n=0;
  (STATE.lights||[]).forEach(l=>{
    if(!Array.isArray(l.jumpIds)||!l.jumpIds.length) return;
    const before=l.jumpIds.length;
    if(set.has(l.id)) l.jumpIds=[];                       // 고른 조명에서 나가는 연결
    else l.jumpIds=l.jumpIds.filter(id=>!set.has(id));    // 고른 조명으로 들어오는 연결
    n+=before-l.jumpIds.length;
  });
  if(!n){cmdToast('점핑 연결이 없습니다');return 0;}
  saveHistory();renderAll();refreshUI();_circuitBanner();
  cmdToast('🔗 점핑 해제 — 연결 '+n+'개');
  return n;
}
// 2026-08-30: 충돌 무리를 한 구로 몰아준다 — 묶인 대로 살리고 도면을 배선에 맞춘다
function unifyJumpGroupGang(lightId){
  const g=(typeof jumpConflictOf==='function')?jumpConflictOf(lightId):null;
  if(!g){cmdToast('충돌이 없습니다');return 0;}
  // 기준은 이 조명이 물린 회로, 없으면 무리의 첫 급전 회로
  const own=lightFeedKeys(lightId);
  const key=own[0]||g.feeds[0];
  if(!key) return 0;
  const i=key.lastIndexOf('#');
  const swId=key.slice(0,i), gang=parseInt(key.slice(i+1),10)||0;
  const sw=(STATE.electric||[]).find(e=>e.id===swId);
  if(!sw){cmdToast('스위치를 찾을 수 없습니다');return 0;}
  const set=new Set(g.members);
  // 다른 회로의 급전은 띄어낸다
  (STATE.electric||[]).forEach(e=>{
    if(!Array.isArray(e.lightIds)) return;
    if(e.id===swId){
      e.lightIds.forEach(id=>{if(set.has(id)) setLightGang(e,id,gang);});
      return;
    }
    const before=e.lightIds.length;
    e.lightIds=e.lightIds.filter(id=>!set.has(id));
    if(e.lightIds.length!==before){
      if(e.lightGang) set.forEach(id=>{delete e.lightGang[id];});
      if(typeof syncSwitchCircuitOn==='function') syncSwitchCircuitOn(e);
    }
  });
  if(typeof syncSwitchCircuitOn==='function') syncSwitchCircuitOn(sw);
  if(typeof invalidateJumpConflicts==='function') invalidateJumpConflicts();
  saveHistory();renderAll();refreshUI();_circuitBanner();
  cmdToast('한 구로 통일 — '+(gang+1)+'구 · 조명 '+g.members.length+'개');
  return g.members.length;
}
// B. 스위치 먼저 — 이 스위치에서만 뺀다 (연결 모드에서 Alt+드래그)
function detachLightsFromSwitch(switchId,lightIds){
  const sw=(STATE.electric||[]).find(e=>e.id===switchId);
  if(!sw||!Array.isArray(sw.lightIds)){cmdToast('연결된 조명이 없습니다');return 0;}
  const set=new Set(lightIds||[]);
  const before=sw.lightIds.length;
  sw.lightIds=sw.lightIds.filter(id=>!set.has(id));
  const n=before-sw.lightIds.length;
  if(!n){cmdToast('박스 안에 이 스위치에 걸린 조명이 없습니다');return 0;}
  if(sw.lightGang) set.forEach(id=>{delete sw.lightGang[id];});
  if(typeof syncSwitchCircuitOn==='function') syncSwitchCircuitOn(sw);
  saveHistory();
  STATE.selectedKind='electric';STATE.selectedId=switchId;STATE.boxSelection=[];
  renderAll();refreshUI();_circuitBanner();
  cmdToast('🔌 해제 '+n+'개 — 이 스위치 총 '+sw.lightIds.length+'개');
  return n;
}
// 점핑 모드에서 기준 조명과의 연결만 끊는다
function unjumpFromLight(fromId,ids){
  const from=(STATE.lights||[]).find(l=>l.id===fromId);
  if(!from) return 0;
  const set=new Set(ids||[]);
  let n=0;
  if(Array.isArray(from.jumpIds)){
    const b=from.jumpIds.length;
    from.jumpIds=from.jumpIds.filter(id=>!set.has(id));
    n+=b-from.jumpIds.length;
  }
  (STATE.lights||[]).forEach(l=>{
    if(!set.has(l.id)||!Array.isArray(l.jumpIds)) return;
    const b=l.jumpIds.length;
    l.jumpIds=l.jumpIds.filter(id=>id!==fromId);
    n+=b-l.jumpIds.length;
  });
  if(!n){cmdToast('박스 안에 이 조명과 점핑된 것이 없습니다');return 0;}
  saveHistory();renderAll();refreshUI();_circuitBanner();
  cmdToast('🔗 점핑 해제 '+n+'개');
  return n;
}
// B. 스위치 먼저 — 연결 모드에서 박스로 쓸어 담는다
function circuitBoxConnect(mode,x1,y1,x2,y2,detach){
  const ids=lightsInBoxMm(x1,y1,x2,y2);
  if(!ids.length){cmdToast('박스 안에 조명이 없습니다');return 0;}
  if(mode==='circuit'&&window._circuitLink){
    if(detach) return detachLightsFromSwitch(window._circuitLink.switchId,ids); // 2026-08-29: Alt+드래그
    return attachLightsToSwitch(window._circuitLink.switchId,ids,{keepMode:true});
  }
  if(mode==='jump'&&window._jumpLink){
    if(detach) return unjumpFromLight(window._jumpLink.lightId,ids); // 2026-08-29
    const from=STATE.lights.find(l=>l.id===window._jumpLink.lightId);
    if(!from) return 0;
    if(!Array.isArray(from.jumpIds)) from.jumpIds=[];
    let n=0;
    ids.forEach(id=>{
      if(id===from.id) return;
      if(from.jumpIds.indexOf(id)>=0) return;
      const t=STATE.lights.find(l=>l.id===id);
      if(Array.isArray(t.jumpIds)&&t.jumpIds.indexOf(from.id)>=0) return;
      from.jumpIds.push(id);n++;
    });
    if(!n){cmdToast('이미 모두 점핑돼 있습니다');return 0;}
    saveHistory();renderAll();refreshUI();_circuitBanner();
    cmdToast('🔗 점핑 '+n+'개 추가 — 총 '+jumpNeighbors(from.id).length+'개');
    return n;
  }
  return 0;
}
function startCircuitLink(switchId,gangIdx){
  // 2026-08-30: 어느 구에 붙일지를 들고 다닌다 (기본 1구)
  window._circuitLink={switchId,gang:Math.max(0,Math.round(gangIdx||0))};
  STATE.selectedKind='electric';STATE.selectedId=switchId;STATE.boxSelection=[];
  renderAll();refreshUI();_circuitBanner();
  const _sw=(STATE.electric||[]).find(e=>e.id===switchId);
  const _gl=(_sw&&switchGangCount(_sw.type)>1)?((window._circuitLink.gang+1)+'구 — '):'';
  cmdToast('🔌 '+_gl+'조명 연결 모드 — 조명 클릭·드래그 (다시 클릭=해제, Esc=종료)');
}
// 2026-08-27: 조명↔조명 점핑 연결 (대표 지시 — 실무는 조명에서 조명으로 점핑하는 경우가 더 많다)
function toggleJumpLink(fromId,toId){
  if(fromId===toId){cmdToast('같은 조명입니다');return;}
  const a=STATE.lights.find(l=>l.id===fromId), b=STATE.lights.find(l=>l.id===toId);
  if(!a||!b){window._jumpLink=null;_circuitBanner();return;}
  if(!Array.isArray(a.jumpIds)) a.jumpIds=[];
  const i=a.jumpIds.indexOf(toId);
  // 반대 방향에 저장돼 있으면 그쪽에서 해제
  const bi=Array.isArray(b.jumpIds)?b.jumpIds.indexOf(fromId):-1;
  if(i>=0||bi>=0){
    if(i>=0) a.jumpIds.splice(i,1);
    if(bi>=0) b.jumpIds.splice(bi,1);
    cmdToast('점핑 해제 — '+(a.jumpIds.length)+'개 연결');
  }else{
    a.jumpIds.push(toId);
    cmdToast('점핑 연결 — '+a.jumpIds.length+'개 (계속 클릭, Esc 종료)');
  }
  STATE.selectedKind='lights';STATE.selectedId=fromId;STATE.boxSelection=[];
  saveHistory();renderAll();refreshUI();_circuitBanner();
}
function startJumpLink(lightId){
  window._circuitLink=null;
  window._jumpLink={lightId};
  STATE.selectedKind='lights';STATE.selectedId=lightId;STATE.boxSelection=[];
  renderAll();refreshUI();_circuitBanner();
  cmdToast('🔗 점핑 연결 모드 — 이어 붙일 조명을 계속 클릭 (다시 클릭=해제, Esc·배너=종료)');
}
function endJumpLink(){
  if(window._jumpLink){window._jumpLink=null;renderAll();refreshUI();_circuitBanner();cmdToast('점핑 연결 모드 종료');}
}
function endCircuitLink(){
  if(window._circuitLink){window._circuitLink=null;renderAll();refreshUI();_circuitBanner();cmdToast('조명 연결 모드 종료');}
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  if(window._jumpLink) endJumpLink();
  else if(window._circuitLink) endCircuitLink();
});

// --- [도면력] 전체 자동 치수: 모든 공간 외곽 변에 치수선 일괄 생성 (재실행 시 자동분 제거 토글) ---
function dimAllSpaces(){
  const autos=STATE.measures.filter(m=>m._auto);
  if(autos.length){
    STATE.measures=STATE.measures.filter(m=>!m._auto);
    saveHistory();renderAll();refreshUI();
    cmdToast('자동 치수 제거 ('+autos.length+'개)');
    return;
  }
  let n=0;
  const near=(a,b)=>Math.abs(a-b)<30;
  STATE.spaces.forEach(s=>{
    const poly=s.polygon;if(!poly||poly.length<3)return;
    const ctr={x:poly.reduce((t,q)=>t+q.x,0)/poly.length,y:poly.reduce((t,q)=>t+q.y,0)/poly.length};
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      if(Math.hypot(b.x-a.x,b.y-a.y)<300) continue; // 300mm 미만 잔변 생략
      const dup=STATE.measures.some(m=>
        (near(m.x1,a.x)&&near(m.y1,a.y)&&near(m.x2,b.x)&&near(m.y2,b.y))||
        (near(m.x1,b.x)&&near(m.y1,b.y)&&near(m.x2,a.x)&&near(m.y2,a.y)));
      if(dup) continue;
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
      const nx=-dy/len,ny=dx/len; // handleDimWall 과 동일한 좌수직 법선
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const side=((ctr.x-mid.x)*nx+(ctr.y-mid.y)*ny)>0?-1:1; // 공간 바깥쪽으로
      STATE.measures.push({id:makeId('m'),x1:Math.round(a.x),y1:Math.round(a.y),x2:Math.round(b.x),y2:Math.round(b.y),
        layerName:'A-DIMS-'+(SPACE_TYPES[s.type]?SPACE_TYPES[s.type].code:'GEN')+'-AUTO',
        style:'arch',offsetMm:900,side,_auto:true});
      n++;
    }
  });
  saveHistory();renderAll();refreshUI();
  cmdToast(n?('전체 자동 치수 '+n+'개 생성 — 다시 실행하면 제거'):'생성할 치수 없음');
}

// --- [UX] 객체 bbox (mm) — 정렬·배분용 ---
function _objBBoxForAlign(kind,obj){
  if(obj.polygon){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    obj.polygon.forEach(q=>{if(q.x<minX)minX=q.x;if(q.x>maxX)maxX=q.x;if(q.y<minY)minY=q.y;if(q.y>maxY)maxY=q.y;});
    return {minX,minY,maxX,maxY};
  }
  if('x1' in obj) return {minX:Math.min(obj.x1,obj.x2),maxX:Math.max(obj.x1,obj.x2),minY:Math.min(obj.y1,obj.y2),maxY:Math.max(obj.y1,obj.y2)};
  if('x' in obj){
    const lib={furniture:FURNITURE_LIB,fixtures:FIXTURE_LIB,lights:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB}[kind];
    const def=lib&&lib[obj.type];
    const w=def?(def.w||def.size||200):200, h=def?(def.h||def.size||200):200;
    return {minX:obj.x-w/2,maxX:obj.x+w/2,minY:obj.y-h/2,maxY:obj.y+h/2};
  }
  return null;
}
function _moveObjBy(kind,obj,dx,dy){ // 단일 객체 이동 (잠금 스킵, moveVertex 중앙 가드 경유)
  if(obj.locked) return false;
  if('x' in obj){obj.x+=dx;obj.y+=dy;}
  if('v1Id' in obj){moveVertex(obj.v1Id,obj.x1+dx,obj.y1+dy);moveVertex(obj.v2Id,obj.x2+dx,obj.y2+dy);}
  else if('x1' in obj){obj.x1+=dx;obj.y1+=dy;obj.x2+=dx;obj.y2+=dy;}
  if('vertexIds' in obj){obj.vertexIds.forEach(vid=>{const v=getVertex(vid);if(v)moveVertex(vid,v.x+dx,v.y+dy);});}
  else if(obj.polygon){obj.polygon=obj.polygon.map(q=>({x:q.x+dx,y:q.y+dy}));}
  return true;
}
function _alignItems(){
  return STATE.boxSelection.map(b=>{
    const arr=getArr(b.kind);const o=arr&&arr.find(x=>x.id===b.id);
    const bb=o&&_objBBoxForAlign(b.kind,o);
    return o&&bb?{kind:b.kind,obj:o,bb}:null;
  }).filter(Boolean);
}
// --- [UX] 정렬: left/right/top/bottom/centerh/centerv ---
function alignSelection(mode){
  const items=_alignItems();
  if(items.length<2){cmdToast('박스 선택 2개 이상 필요 (드래그로 선택)');return;}
  const minX=Math.min(...items.map(i=>i.bb.minX)),maxX=Math.max(...items.map(i=>i.bb.maxX));
  const minY=Math.min(...items.map(i=>i.bb.minY)),maxY=Math.max(...items.map(i=>i.bb.maxY));
  let n=0;
  items.forEach(it=>{
    let dx=0,dy=0;const b=it.bb;
    if(mode==='left')dx=minX-b.minX;
    else if(mode==='right')dx=maxX-b.maxX;
    else if(mode==='top')dy=minY-b.minY;
    else if(mode==='bottom')dy=maxY-b.maxY;
    else if(mode==='centerh')dx=(minX+maxX)/2-(b.minX+b.maxX)/2;
    else if(mode==='centerv')dy=(minY+maxY)/2-(b.minY+b.maxY)/2;
    dx=Math.round(dx);dy=Math.round(dy);
    if((dx||dy)&&_moveObjBy(it.kind,it.obj,dx,dy))n++;
  });
  saveHistory();renderAll();refreshUI();
  cmdToast('정렬: '+({left:'왼쪽',right:'오른쪽',top:'위',bottom:'아래',centerh:'가로 중앙',centerv:'세로 중앙'}[mode]||mode)+' ('+n+'개)');
}
// --- [UX] 균등 배분: h/v (3개 이상) ---
function distributeSelection(axis){
  const items=_alignItems();
  if(items.length<3){cmdToast('균등 배분은 3개 이상 선택');return;}
  const c=bb=>axis==='h'?(bb.minX+bb.maxX)/2:(bb.minY+bb.maxY)/2;
  items.sort((a,b)=>c(a.bb)-c(b.bb));
  const c0=c(items[0].bb),c1=c(items[items.length-1].bb);
  const step=(c1-c0)/(items.length-1);
  let n=0;
  items.forEach((it,i)=>{
    const d=Math.round(c0+step*i-c(it.bb));
    if(d){const ok=axis==='h'?_moveObjBy(it.kind,it.obj,d,0):_moveObjBy(it.kind,it.obj,0,d);if(ok)n++;}
  });
  saveHistory();renderAll();refreshUI();
  cmdToast('균등 배분 ('+(axis==='h'?'가로':'세로')+', '+n+'개)');
}

// --- [AI] 공간 타입별 룰 기반 자동 가구 배치 (fx,fy = bbox 비율 좌표) ---
const AUTO_FURNISH_SETS={
  LIVING:[['furniture','sofa3',0.5,0.82,0],['furniture','rug',0.5,0.55,0],['furniture','coffee',0.5,0.55,0],['furniture','tv_stand',0.5,0.10,180],['furniture','plant',0.92,0.88,0]],
  ROOM:[['furniture','bed_d',0.5,0.32,0],['furniture','wardrobe',0.16,0.86,180],['furniture','nightstand',0.84,0.14,0]],
  KITCHEN:[['furniture','base_sink_900',0.28,0.12,180],['furniture','base_cook_600',0.58,0.12,180],['furniture','fridge_cab_900',0.86,0.14,180]], // 2026-08-24: 위생 카테고리 싱크대 용품 제거 → 가구2 픽스 모듈 사용
  BATHROOM:[['fixtures','toilet',0.18,0.14,180],['fixtures','sink_b',0.58,0.10,180],['fixtures','shower',0.85,0.82,0]],
  DINING:[['furniture','dining4',0.5,0.5,0],['lights','pendant_cluster',0.5,0.42,0]],
  STUDY:[['furniture','desk',0.5,0.14,180],['furniture','office_chair',0.5,0.42,0],['furniture','bookshelf',0.10,0.60,90]],
  DRESSING:[['furniture','system_hanger',0.5,0.14,180],['furniture','dressing_table',0.20,0.84,0],['furniture','mirror',0.90,0.82,0]],
  UTILITY:[['fixtures','washer',0.30,0.20,180],['fixtures','dryer',0.70,0.20,180]],
};
function autoFurnish(spaceId){
  const sid=spaceId||(STATE.selectedKind==='space'?STATE.selectedId:null);
  const s=STATE.spaces.find(x=>x.id===sid);
  if(!s){cmdToast('공간을 선택한 뒤 실행 (af)');return;}
  if(s.locked){cmdToast('잠금된 공간 — 자동 배치 불가');return;}
  const set=AUTO_FURNISH_SETS[s.type];
  if(!set){cmdToast((SPACE_TYPES[s.type]?SPACE_TYPES[s.type].name:s.type)+' 타입은 자동 배치 세트 없음');return;}
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  s.polygon.forEach(q=>{if(q.x<minX)minX=q.x;if(q.x>maxX)maxX=q.x;if(q.y<minY)minY=q.y;if(q.y>maxY)maxY=q.y;});
  const bw=maxX-minX,bh=maxY-minY;
  if(bw<1500||bh<1500){cmdToast('공간이 너무 작음 (한 변 1.5m 이상)');return;}
  let n=0;
  set.forEach(it=>{
    const kind=it[0],type=it[1],fx=it[2],fy=it[3],ang=it[4];
    const lib={furniture:FURNITURE_LIB,fixtures:FIXTURE_LIB,lights:LIGHT_LIB}[kind];
    const def=lib&&lib[type];if(!def)return;
    let w=def.w||def.size||400,h=def.h||def.size||400;
    if(ang===90||ang===270){const t=w;w=h;h=t;}
    if(w>bw*0.92||h>bh*0.92) return; // 공간보다 큰 항목 스킵
    let cx=minX+bw*fx, cy=minY+bh*fy;
    cx=Math.min(Math.max(cx,minX+w/2+50),maxX-w/2-50);
    cy=Math.min(Math.max(cy,minY+h/2+50),maxY-h/2-50);
    STATE[kind].push({id:makeId(kind.charAt(0)),type,x:Math.round(cx),y:Math.round(cy),angle:ang,spaceId:s.id});
    n++;
  });
  if(!n){cmdToast('배치 가능한 항목 없음 (공간 크기 확인)');return;}
  saveHistory();renderAll();refreshUI();
  cmdToast('⚡ 자동 배치 — '+(SPACE_TYPES[s.type]?SPACE_TYPES[s.type].name:s.type)+' 세트 '+n+'개 (Ctrl+Z 취소)');
}

// 2026-08-27: 문서 설정 블록 공용화 (buildJSON·자동저장 공용 — 한쪽만 갱신돼 설정이 새는 것 방지)
function buildDocSettings(){
  return {
    estimateConfig:STATE.estimateConfig||{},
    videoSequenceOrder:STATE.videoSequenceOrder||null,
    layers:STATE.layers?{...STATE.layers}:null,
    wallAlignment:STATE.wallAlignment||'center',
    downlightInch:STATE.downlightInch||DOWNLIGHT_INCH_DEFAULT,
    printConfig:STATE.printConfig?{...STATE.printConfig}:null, // 2026-08-28: 인쇄 범위·용지·표시요소
    symbolLabelMode:STATE.symbolLabelMode||'smart',
    snap:{grid:!!STATE.snap.grid,endpoint:!!STATE.snap.endpoint,ghost:!!STATE.snap.ghost,ortho:!!STATE.snap.ortho},
  };
}
// 2026-08-27 PERF: 자동 저장용 경량 스냅샷 — 복구에 필요한 원본 데이터만.
//  기존엔 buildJSON()(견적 산출·관계 그래프·시맨틱 enrich 포함)을 2초마다 돌려
//  대형 도면에서 0.5초대 멈칫이 생겼다. 복구 경로(applyLoadedData)는 아래 필드만 읽는다.
function buildAutosavePayload(){
  return {
    schema:'ECOREAN.FloorPlan.v5.9',
    vertices:STATE.vertices,
    meta:{
      project:STATE.projectName,unit:'mm',
      ceilingHeight_mm:STATE.ceilingHeight,wallThickness:STATE.wallThickness,gridSize:STATE.gridSize,
      aiPromptHints:STATE.aiPromptHints,
      settings:buildDocSettings(),
    },
    spaces:STATE.spaces,walls:STATE.walls,openings:STATE.openings,
    furniture:STATE.furniture,fixtures:STATE.fixtures,lights:STATE.lights,
    electric:STATE.electric,hvac:STATE.hvac,texts:STATE.texts,measures:STATE.measures,
    circles:STATE.circles,arcs:STATE.arcs,curves:STATE.curves||[],
    leaders:STATE.leaders||[],xlines:STATE.xlines||[],pillars:STATE.pillars||[],
  };
}
// --- [안정] 자동 저장 (2초 디바운스) + 복구 제안 ---
let _autosaveTimer=null;
function _autosaveNow(){
  try{
    // 2026-08-27 PERF: 경량 스냅샷 사용 (buildJSON 은 저장/전송 등 사용자 액션에서만)
    const j=buildAutosavePayload();
    localStorage.setItem('minicad.autosave',JSON.stringify({at:Date.now(),data:j}));
    return true;
  }catch(_){return false;}
}
function scheduleAutosave(){
  if(_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer=setTimeout(_autosaveNow,2000);
}
function applyLoadedData(d){
  STATE.projectName=(d.meta&&d.meta.project)||STATE.projectName;
  STATE.ceilingHeight=(d.meta&&d.meta.ceilingHeight_mm)||STATE.ceilingHeight;
  if(d.meta&&d.meta.gridSize){STATE.gridSize=d.meta.gridSize;const g=document.getElementById('snap-unit');if(g)g.value=String(d.meta.gridSize);}
  if(d.meta&&d.meta.wallThickness){STATE.wallThickness=d.meta.wallThickness;const el=document.getElementById('wall-thickness');if(el) el.value=d.meta.wallThickness;}
  STATE.vertices=d.vertices||[];
  STATE.spaces=d.spaces||[];STATE.walls=d.walls||[];
  STATE.openings=d.openings||[];STATE.furniture=d.furniture||[];
  STATE.fixtures=d.fixtures||[];STATE.lights=d.lights||[];
  STATE.electric=d.electric||[];STATE.texts=d.texts||[];
  STATE.measures=d.measures||[];
  if(d.bgImage&&d.bgImage.dataURL) STATE.bgImage=d.bgImage;   // 저장본의 배경 이미지 복원
  STATE.circles=d.circles||[];STATE.arcs=d.arcs||[];STATE.hvac=d.hvac||[];
  STATE.leaders=d.leaders||[];STATE.xlines=d.xlines||[];STATE.curves=d.curves||[];STATE.pillars=d.pillars||[];
  STATE.sections=d.sections||[]; // 2026-08-30: 절단선 (옛 저장본엔 없다)
  if(d.meta&&d.meta.aiPromptHints) STATE.aiPromptHints={...STATE.aiPromptHints,...d.meta.aiPromptHints};
  // 2026-08-26: 문서 설정 복원 (저장 당시 스펙 유지 — 없으면 현재 값 유지)
  const _set=d.meta&&d.meta.settings;
  if(_set){
    if(_set.estimateConfig&&typeof _set.estimateConfig==='object') STATE.estimateConfig=_set.estimateConfig;
    if('videoSequenceOrder' in _set) STATE.videoSequenceOrder=_set.videoSequenceOrder||null;
    if(_set.layers&&typeof _set.layers==='object') STATE.layers={...STATE.layers,..._set.layers};
    if(_set.downlightInch&&DOWNLIGHT_INCH[_set.downlightInch]) STATE.downlightInch=_set.downlightInch;
    // 2026-08-28: 인쇄 설정·라벨 모드 복원
    if(_set.printConfig&&typeof _set.printConfig==='object') STATE.printConfig={..._set.printConfig};
    if(typeof SYMBOL_LABEL_MODES!=='undefined'&&SYMBOL_LABEL_MODES.indexOf(_set.symbolLabelMode)>=0){
      STATE.symbolLabelMode=_set.symbolLabelMode;
      if(typeof updateSymbolLabelBtn==='function') updateSymbolLabelBtn();
    }
    if(_set.snap&&typeof _set.snap==='object'){
      ['grid','endpoint','ghost','ortho'].forEach(k=>{if(typeof _set.snap[k]==='boolean') STATE.snap[k]=_set.snap[k];});
      if(typeof buildSnapUI==='function') buildSnapUI();
      if(typeof saveSnapPrefs==='function') saveSnapPrefs();
    }
    if(_set.wallAlignment){
      STATE.wallAlignment=_set.wallAlignment;
      if(typeof setWallAlignment==='function') setWallAlignment(_set.wallAlignment,{silent:true});
    }
    if(typeof buildLayerUI==='function') buildLayerUI();
  }
  migrateLoadedState(d.schema||'ECOREAN.FloorPlan.v5.9');
  const pn=document.getElementById('project-name');if(pn)pn.value=STATE.projectName;
  const ch=document.getElementById('ceiling-height');if(ch)ch.value=STATE.ceilingHeight;
  saveHistory();renderAll();refreshUI();
}
function checkAutosaveRestore(){
  try{
    const raw=localStorage.getItem('minicad.autosave');
    if(!raw) return;
    const saved=JSON.parse(raw);
    const d=saved&&saved.data;
    if(!d||!((d.spaces&&d.spaces.length)||(d.walls&&d.walls.length))) return;
    if(STATE.spaces.length||STATE.walls.length) return; // 이미 작업 중이면 제안 안 함
    const bar=document.createElement('div');
    bar.id='autosave-restore';
    bar.style.cssText='position:fixed;bottom:64px;left:50%;transform:translateX(-50%);z-index:9000;background:#1A1B2E;border:1px solid #C9A961;border-radius:8px;padding:10px 14px;display:flex;gap:10px;align-items:center;font-size:12px;color:#F5F1EB;box-shadow:0 6px 24px rgba(0,0,0,0.5)';
    const span=document.createElement('span');
    span.textContent='💾 자동 저장 도면 발견 ('+new Date(saved.at).toLocaleString()+') — 복구할까요?';
    const y=document.createElement('button');y.className='btn sm';y.textContent='복구';
    const no=document.createElement('button');no.className='btn sm';no.textContent='무시';
    y.addEventListener('click',()=>{applyLoadedData(d);bar.remove();showStatus('자동 저장본 복구 완료');});
    no.addEventListener('click',()=>bar.remove());
    bar.appendChild(span);bar.appendChild(y);bar.appendChild(no);
    document.body.appendChild(bar);
  }catch(_){ }
}

// --- [도면력] 인쇄 표제란 + 공간 면적표 + 범례 ---
function buildPrintTitleBlock(){
  const t=new Date();
  const dstr=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  const floorEl=document.getElementById('t-floor'),pyEl=document.getElementById('t-floor-pyeong');
  const floor=floorEl?floorEl.textContent:'0.00', py=pyEl?pyEl.textContent:'0.0';
  const doorN=STATE.openings.filter(o=>o.type==='DOOR').length;
  const winN=STATE.openings.filter(o=>o.type==='WINDOW').length;
  const legendRows=[];
  const cnt=(arr,lib,label)=>{
    const m={};(arr||[]).forEach(o=>{const dd=lib[o.type];if(dd)m[dd.name]=(m[dd.name]||0)+1;});
    Object.keys(m).forEach(nm=>legendRows.push([label,nm,m[nm]]));
  };
  cnt(STATE.furniture,FURNITURE_LIB,'가구');cnt(STATE.fixtures,FIXTURE_LIB,'위생/주방');
  cnt(STATE.lights,LIGHT_LIB,'조명');cnt(STATE.electric,ELECTRIC_LIB,'전기');cnt(STATE.hvac,HVAC_FIRE_LIB,'공조/소방');
  const legendHTML=legendRows.length?
    '<table class="tb-side"><tr><th colspan="3">범 례 (수량)</th></tr>'+
    legendRows.map(r=>'<tr><td>'+r[0]+'</td><td>'+escapeHtml(r[1])+'</td><td class="r">'+r[2]+'</td></tr>').join('')+'</table>':'';
  const spaceRows=STATE.spaces.map(sp=>'<tr><td>'+(SPACE_TYPES[sp.type]?SPACE_TYPES[sp.type].name:sp.type)+'</td><td>'+escapeHtml(sp.name||'')+'</td><td class="r">'+spArea(sp).toFixed(2)+'㎡</td></tr>').join('');
  return '<div class="tb-wrap">'+
    '<table class="tb-main">'+
    '<tr><th colspan="4">ECOREAN — 평면 계획 도면</th></tr>'+
    '<tr><td class="k">PROJECT</td><td colspan="3">'+escapeHtml(STATE.projectName)+'</td></tr>'+
    '<tr><td class="k">DATE</td><td>'+dstr+'</td><td class="k">SCALE</td><td>1/100 기준 (Zoom 100% · mm 실측 기입)</td></tr>'+
    '<tr><td class="k">바닥면적</td><td>'+floor+'㎡ ('+py+'py)</td><td class="k">문 / 창</td><td>'+doorN+' / '+winN+'</td></tr>'+
    '<tr><td class="k">기준 천장고</td><td>'+STATE.ceilingHeight+'mm</td><td class="k">TOOL</td><td>ECOREAN MiniCAD v6.0</td></tr>'+
    '</table>'+
    (spaceRows?'<table class="tb-side"><tr><th colspan="3">공간 면적표</th></tr>'+spaceRows+'</table>':'')+
    legendHTML+'</div>';
}

// --- [UX] 명령 팔레트 (Ctrl+K) ---
let _paletteEl=null,_paletteIdx=0,_paletteItems=[];
function _paletteCommands(){
  return [
    {label:'📏 전체 자동 치수 생성/제거',kw:'dim auto da 치수 자동 전체',run:dimAllSpaces},
    {label:'⚡ AI 자동 가구 배치 (선택 공간)',kw:'auto furnish af ai 자동 배치 가구',run:()=>autoFurnish()},
    {label:'🖨 인쇄 설정 — 범위·용지·축척 미리보기',kw:'print 인쇄 출력 미리보기 범위 용지 축척 설정',run:openPrintDialog},
    {label:'🖨 바로 인쇄 (직전 설정으로)',kw:'print 인쇄 바로 출력',run:()=>printPlan()},
    {label:'⬚ 인쇄 영역 드래그로 지정',kw:'print 인쇄 영역 범위 부분 확대 crop',run:startPrintRegionPick},
    {label:'🖥 인쇄 영역 — 화면에서 잡기 (pf)',kw:'print 인쇄 영역 틀 화면 잡기 frame pf',run:()=>togglePrintFrame()},
    {label:'📐 입면도 — 평면도에서 자동 생성 (el)',kw:'elevation 입면도 입면 el 벙 방위 단면',run:()=>openElevationDialog()},
    {label:'─ 절단선 긋기 — 보는 방향 직접 고르기 (K)',kw:'section 절단선 절단면 방향 입면 sc',run:()=>setTool('section')},
    {label:'🔌 선택한 조명을 스위치에 연결 (link)',kw:'circuit link 연결 조명 스위치 회로 다중',run:()=>startCircuitAttach()},
    {label:'🔗 선택한 조명끼리 점핑 연결 (chain)',kw:'jump chain 점핑 조명 연결 데이지체인',run:()=>chainSelectedLights()},
    {label:'🔌 선택한 조명 회로 해제 (unlink)',kw:'unlink 해제 연결해제 회로 조명 스위치',run:()=>detachSelectedLights()},
    {label:'🔗 선택한 조명 점핑 해제 (unchain)',kw:'unchain 점핑해제 해제 조명 jump',run:()=>unchainSelectedLights()},
    {label:'⚠ 겹친 조명 찾기 (dup)',kw:'duplicate 중복 겹침 다운라이트 조명 경고 dup',run:()=>reportDuplicateLights()},
    {label:'⚠ 겹친 조명 전부 정리 (dup fix)',kw:'duplicate 중복 정리 삭제 조명 dup fix',run:()=>cleanDuplicateLights()},
    {label:'💾 JSON 저장',kw:'save json 저장 파일',run:saveJSON},
    {label:'📂 JSON 불러오기',kw:'load open 불러오기 열기',run:loadJSON},
    {label:'🤖 AI 번들 내보내기',kw:'ai bundle export 번들 내보내기',run:exportAIBundle},
    {label:'⬅ 정렬 — 왼쪽',kw:'align left 정렬 왼쪽',run:()=>alignSelection('left')},
    {label:'➡ 정렬 — 오른쪽',kw:'align right 정렬 오른쪽',run:()=>alignSelection('right')},
    {label:'⬆ 정렬 — 위',kw:'align top 정렬 위',run:()=>alignSelection('top')},
    {label:'⬇ 정렬 — 아래',kw:'align bottom 정렬 아래',run:()=>alignSelection('bottom')},
    {label:'↔ 정렬 — 가로 중앙',kw:'align center 정렬 가로 중앙',run:()=>alignSelection('centerh')},
    {label:'↕ 정렬 — 세로 중앙',kw:'align middle 정렬 세로 중앙',run:()=>alignSelection('centerv')},
    {label:'⇹ 균등 배분 — 가로',kw:'distribute 배분 가로 간격',run:()=>distributeSelection('h')},
    {label:'⇳ 균등 배분 — 세로',kw:'distribute 배분 세로 간격',run:()=>distributeSelection('v')},
    {label:'🔒 전체 잠금',kw:'lock all 잠금 전체',run:()=>lockAllObjects(true)},
    {label:'🔓 전체 잠금 해제',kw:'unlock 잠금 해제',run:()=>lockAllObjects(false)},
    {label:'📄 선택 복제',kw:'duplicate copy 복제',run:duplicateSelected},
    {label:'🗑 선택 삭제',kw:'delete 삭제',run:deleteSelected},
    {label:'🪞 미러 (대칭 복사)',kw:'mirror 미러 대칭',run:startMirror},
    {label:'↩ 실행 취소 (Undo)',kw:'undo 취소',run:undo},
    {label:'↪ 다시 실행 (Redo)',kw:'redo 다시',run:redo},
    {label:'🔍 화면 맞춤 (Zoom Fit)',kw:'zoom fit 화면 맞춤',run:zoomFit},
    {label:'🧲 그리드 표시 토글',kw:'grid 그리드',run:toggleGrid},
    {label:'📐 치수 표시 토글',kw:'dimension 치수 표시',run:toggleDim},
    {label:'◐ 2.5D 영업 모드 토글',kw:'2.5d 영업',run:toggle2_5D},
    {label:'🔣 기호 확대 표시 토글 (전기·감지기 비축척)',kw:'symbol sym 기호 확대 비축척',run:()=>{STATE.symbolBoost=STATE.symbolBoost===false?true:false;renderAll();cmdToast('기호 확대 표시 '+(STATE.symbolBoost!==false?'ON':'OFF'));}},
    {label:'⚡ 배선 전체 보기 토글 (회로·점핑)',kw:'circuit wiring cir 배선 회로 점핑 엣지 연결선',run:()=>toggleCircuits()},
    {label:'🏷 기호 이름 라벨 — 묶음 대표만',kw:'label 라벨 이름 글씨 묶음 다운라이트 smart',run:()=>setSymbolLabelMode('smart')},
    {label:'🏷 기호 이름 라벨 — 끕 (선택한 것만)',kw:'label 라벨 이름 글씨 끕 off 숨김 깔끔',run:()=>setSymbolLabelMode('off')},
    {label:'🏷 기호 이름 라벨 — 전부 표시',kw:'label 라벨 이름 글씨 전부 all',run:()=>setSymbolLabelMode('all')},
    {label:'🛠 도구 — 선택',kw:'tool select 선택 v',run:()=>setTool('select')},
    {label:'🛠 도구 — 벽',kw:'tool wall 벽 b',run:()=>setTool('wall')},
    {label:'🛠 도구 — 선 (참조선/분할)',kw:'tool line 선 l',run:()=>setTool('line')},
    {label:'🛠 도구 — 치수 (벽 클릭)',kw:'tool dim 치수 di',run:()=>setTool('dimwall')},
    {label:'🛠 도구 — 트림',kw:'tool trim 트림 tr',run:()=>setTool('trim')},
    {label:'🛠 도구 — 옵셋',kw:'tool offset 옵셋 o',run:()=>setTool('offset')},
    {label:'🛠 도구 — 지시선',kw:'tool leader 지시선 le',run:()=>setTool('leader')},
  ];
}
function closeCmdPalette(){if(_paletteEl){_paletteEl.remove();_paletteEl=null;}}
function openCmdPalette(){
  closeCmdPalette();
  const wrap=document.createElement('div');
  wrap.id='cmd-palette';
  wrap.style.cssText='position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.45);display:flex;justify-content:center;align-items:flex-start;padding-top:12vh';
  const box=document.createElement('div');
  box.style.cssText='width:min(520px,92vw);background:var(--bg-card,#1A1B2E);border:1px solid var(--gold,#C9A961);border-radius:10px;box-shadow:0 12px 48px rgba(0,0,0,0.6);overflow:hidden';
  const inp=document.createElement('input');
  inp.type='text';inp.name='cmd-palette-input';
  inp.placeholder='명령 검색 — 치수 / 정렬 / 배치 / 인쇄 / lock …';
  inp.style.cssText='width:100%;box-sizing:border-box;background:transparent;border:none;outline:none;color:var(--text-primary,#F5F1EB);font-size:14px;padding:14px 16px;border-bottom:1px solid var(--border,#3D4466)';
  const list=document.createElement('div');
  list.style.cssText='max-height:46vh;overflow-y:auto;padding:6px';
  box.appendChild(inp);box.appendChild(list);wrap.appendChild(box);
  wrap.addEventListener('pointerdown',e=>{if(e.target===wrap)closeCmdPalette();});
  document.body.appendChild(wrap);
  _paletteEl=wrap;
  const all=_paletteCommands();
  const runIdx=i=>{const cmd=_paletteItems[i];if(!cmd)return;closeCmdPalette();try{cmd.run();}catch(err){cmdToast('실행 실패: '+err.message);}};
  const render=()=>{
    const q=inp.value.trim().toLowerCase();
    _paletteItems=q?all.filter(c=>(c.label+' '+(c.kw||'')).toLowerCase().indexOf(q)>=0):all;
    if(_paletteIdx>=_paletteItems.length)_paletteIdx=Math.max(0,_paletteItems.length-1);
    list.innerHTML='';
    _paletteItems.slice(0,40).forEach((c,i)=>{
      const row=document.createElement('div');
      row.textContent=c.label;
      row.style.cssText='padding:9px 12px;border-radius:6px;cursor:pointer;font-size:12.5px;color:var(--text-primary,#F5F1EB)'+
        (i===_paletteIdx?';background:rgba(201,169,97,0.18);outline:1px solid var(--gold,#C9A961)':'');
      row.addEventListener('pointerenter',()=>{if(_paletteIdx!==i){_paletteIdx=i;render();}});
      row.addEventListener('click',()=>runIdx(i));
      list.appendChild(row);
    });
    if(!_paletteItems.length) list.innerHTML='<div style="padding:12px;color:var(--text-tertiary,#7B82B5);font-size:12px">일치하는 명령 없음</div>';
  };
  inp.addEventListener('input',()=>{_paletteIdx=0;render();});
  inp.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeCmdPalette();}
    else if(e.key==='ArrowDown'){e.preventDefault();_paletteIdx=Math.min(_paletteIdx+1,_paletteItems.length-1);render();}
    else if(e.key==='ArrowUp'){e.preventDefault();_paletteIdx=Math.max(_paletteIdx-1,0);render();}
    else if(e.key==='Enter'){e.preventDefault();runIdx(_paletteIdx);}
    e.stopPropagation();
  });
  _paletteIdx=0;render();
  setTimeout(()=>inp.focus(),30);
}
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&!e.altKey&&(e.key==='k'||e.key==='K')){
    e.preventDefault();
    if(_paletteEl) closeCmdPalette(); else openCmdPalette();
  }
});

// ===== 인쇄 =====
// 2026-08-27 v6.2: 인쇄 도면 전면 재작성 (대표 지시 — "도면으로써 명확하게 안 보인다")
//  이전에는 '화면 스크린샷'을 그대로 종이에 붙였다. 그래서
//   · 화면에 보이는 범위만 나오고(줌/스크롤에 따라 잘림)  · 축척이 실제와 달랐고
//   · 어두운 화면용 색이 옅은 색면으로 찍혀 선과 글씨가 묻혔다.
//  이제는 용지·축척을 먼저 정하고, 그 축척으로 도면 전체를 다시 그려 종이에 1:1로 얹는다.
const PRINT_SCALES=[20,25,30,40,50,60,75,100,125,150,200,250,300,400,500,600,800,1000];
const PRINT_PAPERS={A4:{w:297,h:210},A3:{w:420,h:297},A2:{w:594,h:420}};
const PRINT_MARGIN=8;    // 용지 가장자리 여백 mm
const PRINT_TB_H=30;     // 표제란 띠 높이 mm
const PRINT_DPI=300;

// ===== 2026-08-28: 인쇄 설정 + 미리보기 (대표 지시 — "내가 원하는 포인트를 인쇄하기가 힘들다") =====
//  종전엔 [인쇄]를 누르면 도면 전체가 자동으로 한 장에 들어가게만 나왔다. 그래서
//  주방만, 천장만, 이 구석만 뽑고 싶을 때 방법이 없었다.
//  이제 인쇄 전에 ① 범위 ② 용지·축척 ③ 표시 요소 를 정하고, 나올 종이를 그대로 미리 본다.
const PRINT_LAYER_KEYS=['walls','spaces','openings','furniture','fixtures','lights','electric','hvac',
                        'dimensions','text','circles','arcs','curves','leaders','pillars','xlines'];
const PRINT_LAYER_NAMES={walls:'벽',spaces:'공간',openings:'문·창',furniture:'가구',fixtures:'위생/주방',
  lights:'조명',electric:'전기',hvac:'공조/소방',dimensions:'치수',text:'텍스트',circles:'원',
  arcs:'아크',curves:'곡선',leaders:'지시선',pillars:'기둥',xlines:'안내선'};
// 프리셋 — 현장에서 실제로 따로 뽑는 도면 4종
const PRINT_PRESETS=[
  {key:'full',name:'전체 도면',desc:'모든 요소 + 치수',
   on:['walls','spaces','openings','furniture','fixtures','lights','electric','hvac','dimensions','text','circles','arcs','curves','leaders','pillars'],
   symbolLabels:'off'},
  {key:'construct',name:'시공 도면',desc:'벽·문창·치수 (가구 제외)',
   on:['walls','spaces','openings','dimensions','text','circles','arcs','curves','leaders','pillars'],
   symbolLabels:'off'},
  {key:'mep',name:'조명·전기',desc:'천장기구·스위치 + 이름',
   on:['walls','spaces','openings','lights','electric','hvac','text','leaders','pillars'],
   symbolLabels:'smart'},
  {key:'furniture',name:'가구 배치도',desc:'가구·위생기구 중심',
   on:['walls','spaces','openings','furniture','fixtures','text','pillars'],
   symbolLabels:'off'},
];
function printPresetLayers(key){
  const p=PRINT_PRESETS.find(x=>x.key===key)||PRINT_PRESETS[0];
  const out={};
  PRINT_LAYER_KEYS.forEach(k=>{out[k]=p.on.indexOf(k)>=0;});
  return out;
}
function printCfg(){
  if(!STATE.printConfig||typeof STATE.printConfig!=='object') STATE.printConfig={};
  const c=STATE.printConfig;
  if(!c.region) c.region='all';
  if(!c.paper) c.paper='auto';
  if(!c.orientation) c.orientation='auto';
  if(!c.scale) c.scale='auto';
  if(!c.preset) c.preset='full';
  if(!c.layers) c.layers=printPresetLayers(c.preset);
  if(!c.symbolLabels) c.symbolLabels='off';
  if(!c.colorMode) c.colorMode='ink'; // 2026-08-29: ink=흑백 선화 / color=칼라
  if(!Array.isArray(c.spaceIds)) c.spaceIds=[];
  // 2026-08-30: 평면도와 같은 묶음에 입면도까지 (대표 지시)
  if(typeof c.elevations!=='boolean') c.elevations=false;
  // 2026-08-30 대표 보고: "원하지도 않은 입면도가 보인다" → 공간 통째가 아니라 면 하나씩 고른다
  if(!Array.isArray(c.elevPick)) c.elevPick=[];
  // 한 장에 몇 면 — 0 이면 자동. 1 이면 한 면이 종이를 다 쓴다 (크게 보려고)
  if(![0,1,2,4].includes(c.elevPerPage)) c.elevPerPage=0;
  // 세로 용지일 때 입면도만 눕혀 찍기 — 입면은 옆으로 길어서 세로 종이에선 작아진다
  if(typeof c.elevLandscape!=='boolean') c.elevLandscape=true;
  // 2026-08-30 대표 보고 "더 키워야한다" — 입면도만 다른(큰) 용지로 뽑는다.
  //  크롬은 한 인쇄물 안에서 장마다 용지 크기를 다르게 낼 수 있다(@page 이름 붙이기, PDF 로 실측 확인).
  if(!['same','A4','A3','A2'].includes(c.elevPaper)) c.elevPaper='A3';
  ['titleBlock','scaleBar','north','page2'].forEach(k=>{if(typeof c[k]!=='boolean') c[k]=true;});
  return c;
}
function applyPrintPreset(key){
  const c=printCfg(), p=PRINT_PRESETS.find(x=>x.key===key);
  if(!p) return c;
  c.preset=key;
  c.layers=printPresetLayers(key);
  c.symbolLabels=p.symbolLabels||'off';
  return c;
}
// 인쇄할 범위 (mm) — 여기가 "원하는 포인트"를 정하는 곳
function printRegionBBox(cfg){
  cfg=cfg||printCfg();
  const box=(minX,minY,maxX,maxY,pad)=>{
    pad=pad||0;
    return {minX:minX-pad,minY:minY-pad,maxX:maxX+pad,maxY:maxY+pad,
            w:(maxX-minX)+pad*2,h:(maxY-minY)+pad*2};
  };
  if(cfg.region==='rect'&&cfg.rect){
    const r=cfg.rect;
    return box(Math.min(r.x1,r.x2),Math.min(r.y1,r.y2),Math.max(r.x1,r.x2),Math.max(r.y1,r.y2),300);
  }
  if(cfg.region==='space'&&cfg.spaceIds.length){
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    (STATE.spaces||[]).forEach(sp=>{
      if(cfg.spaceIds.indexOf(sp.id)<0) return;
      (sp.polygon||[]).forEach(p=>{
        if(p.x<minX)minX=p.x;if(p.y<minY)minY=p.y;
        if(p.x>maxX)maxX=p.x;if(p.y>maxY)maxY=p.y;});
    });
    if(isFinite(minX)) return box(minX,minY,maxX,maxY,900); // 벽 두께·실명 라벨 여유
  }
  if(cfg.region==='view'){
    const x1=pxToMm(0-STATE.offsetX), y1=pxToMm(0-STATE.offsetY);
    const x2=pxToMm(stage.width()-STATE.offsetX), y2=pxToMm(stage.height()-STATE.offsetY);
    if(x2>x1&&y2>y1) return box(x1,y1,x2,y2,0);
  }
  return planBBoxMm();
}
function printRegionLabel(cfg){
  cfg=cfg||printCfg();
  if(cfg.region==='rect'&&cfg.rect) return '선택 영역';
  if(cfg.region==='space'&&cfg.spaceIds.length) return '공간 '+cfg.spaceIds.length+'개';
  if(cfg.region==='view') return '현재 화면';
  return '전체 도면';
}

// 도면 전체 범위 (mm) — 치수선·치수글씨까지 포함
function planBBoxMm(){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  const put=(x,y)=>{if(!isFinite(x)||!isFinite(y))return;
    if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y;};
  (STATE.spaces||[]).forEach(sp=>(sp.polygon||[]).forEach(pt=>put(pt.x,pt.y)));
  (STATE.walls||[]).forEach(w=>{put(w.x1,w.y1);put(w.x2,w.y2);});
  [[STATE.furniture,typeof FURNITURE_LIB!=='undefined'?FURNITURE_LIB:null],
   [STATE.fixtures,typeof FIXTURE_LIB!=='undefined'?FIXTURE_LIB:null],
   [STATE.lights,typeof LIGHT_LIB!=='undefined'?LIGHT_LIB:null],
   [STATE.electric,typeof ELECTRIC_LIB!=='undefined'?ELECTRIC_LIB:null],
   [STATE.hvac,typeof HVAC_FIRE_LIB!=='undefined'?HVAC_FIRE_LIB:null]].forEach(([arr,lib])=>{
    (arr||[]).forEach(o=>{
      const d=lib&&lib[o.type];
      const r=Math.max((d&&(d.w||d.size))||400,(d&&(d.h||d.size))||400)/2+80;
      put(o.x-r,o.y-r);put(o.x+r,o.y+r);
    });
  });
  (STATE.measures||[]).forEach(m=>{put(m.x1,m.y1);put(m.x2,m.y2);});
  (STATE.circles||[]).forEach(c=>{const r=Math.max(c.rx_mm||c.radius_mm||0,c.ry_mm||c.radius_mm||0);put(c.x-r,c.y-r);put(c.x+r,c.y+r);});
  (STATE.pillars||[]).forEach(o=>{const r=Math.max(o.w||500,o.h||500);put(o.x-r,o.y-r);put(o.x+r,o.y+r);});
  (STATE.texts||[]).forEach(t=>put(t.x,t.y));
  (STATE.openings||[]).forEach(o=>put(o.x,o.y));
  if(!isFinite(minX)) return null;
  const pad=1500; // 자동 치수선·치수글씨가 도면 밖으로 나가는 여유
  return {minX:minX-pad,minY:minY-pad,maxX:maxX+pad,maxY:maxY+pad,
          w:(maxX-minX)+pad*2,h:(maxY-minY)+pad*2};
}

// 용지·방향·축척 결정 — opts 가 'auto' 가 아니면 그 값을 강제한다 (대표가 고른 대로 나온다)
function choosePrintLayout(bbox,opts){
  opts=opts||{};
  const fixedPaper=(opts.paper&&opts.paper!=='auto')?opts.paper:null;
  const fixedOri=(opts.orientation&&opts.orientation!=='auto')?opts.orientation:null;
  const fixedScale=(opts.scale&&opts.scale!=='auto')?parseInt(opts.scale,10):null;
  const TB=(opts.titleBlock===false)?0:PRINT_TB_H; // 표제란을 끄면 그만큼 도면이 커진다
  // 용지는 작은 것부터 — A4 로 읽을 만하면 A4 로 낸다 (큰 종이를 먼저 고르지 않는다)
  const papers=fixedPaper?[fixedPaper]:['A4','A3','A2'];
  const MAX_OK_SCALE=opts.maxScale||200; // 이보다 작은 축척이 되면 한 단계 큰 용지로
  const mk=(pk,ori,pw,ph,S,fill)=>({paper:pk,orientation:ori,pw,ph,tbH:TB,
    availW:pw-PRINT_MARGIN*2,availH:ph-PRINT_MARGIN*2-TB,scale:S,fill:fill||0});
  let best=null, fallback=null;
  for(let pi=0;pi<papers.length;pi++){
    const pk=papers[pi], P=PRINT_PAPERS[pk];
    if(!P) continue;
    const oris=fixedOri
      ? [[fixedOri, fixedOri==='landscape'?P.w:P.h, fixedOri==='landscape'?P.h:P.w]]
      : [['landscape',P.w,P.h],['portrait',P.h,P.w]];
    let onPaper=null;
    oris.forEach(([ori,pw,ph])=>{
      const availW=pw-PRINT_MARGIN*2, availH=ph-PRINT_MARGIN*2-TB;
      if(availW<=0||availH<=0) return;
      const cands=fixedScale?[fixedScale]:PRINT_SCALES;
      for(let i=0;i<cands.length;i++){
        const S=cands[i];
        if(bbox.w/S<=availW*0.985 && bbox.h/S<=availH*0.985){
          const fill=(bbox.w/S)*(bbox.h/S)/(availW*availH);
          if(!onPaper||S<onPaper.scale||(S===onPaper.scale&&fill>onPaper.fill))
            onPaper=mk(pk,ori,pw,ph,S,fill);
          break;
        }
      }
    });
    if(!onPaper) continue;
    if(!fallback) fallback=onPaper;
    if(onPaper.scale<=MAX_OK_SCALE){best=onPaper;break;}
  }
  if(!best) best=fallback;
  if(!best){
    // 고른 축척이 어떤 용지에도 안 들어가면 — 지정한 대로 내고 넘치는 부분은 잘린다.
    //  (대표가 축척을 직접 고른 경우, 자동으로 축척을 바꿔버리지 않는다)
    const pk=fixedPaper||'A2', P=PRINT_PAPERS[pk]||PRINT_PAPERS.A2;
    const ori=fixedOri||'landscape';
    const pw=ori==='landscape'?P.w:P.h, ph=ori==='landscape'?P.h:P.w;
    best=mk(pk,ori,pw,ph,fixedScale||PRINT_SCALES[PRINT_SCALES.length-1],0);
    best.overflow=true;
  }
  return best;
}

// 축척 바 (종이 위 실제 길이로 그린다)
function _scaleBarHTML(S){
  // 한 칸이 종이 위에서 8mm 이상 되도록 실제 길이 단위를 고른다
  const steps=[500,1000,2000,5000,10000];
  let unit=steps[steps.length-1];
  for(let i=0;i<steps.length;i++){ if(steps[i]/S>=8){unit=steps[i];break;} }
  const segMm=unit/S, N=4, totMm=segMm*N;
  let cells='';
  for(let i=0;i<N;i++)
    cells+='<div style="width:'+segMm.toFixed(3)+'mm;height:1.8mm;border:0.25mm solid #000;'+
           'background:'+(i%2?'#000':'#fff')+';box-sizing:border-box"></div>';
  let ticks='';
  for(let i=0;i<=N;i++)
    ticks+='<div style="position:absolute;left:'+(segMm*i).toFixed(3)+'mm;top:0;'+
           'transform:translateX(-50%);font-size:2.1mm;white-space:nowrap">'+
           (unit*i/1000)+'</div>';
  return '<div class="sbar">'+
    '<div style="display:flex;width:'+totMm.toFixed(3)+'mm">'+cells+'</div>'+
    '<div style="position:relative;height:3mm;width:'+totMm.toFixed(3)+'mm;margin-top:0.4mm">'+ticks+'</div>'+
    '<div style="font-size:2.1mm">SCALE BAR (m) · 1/'+S+'</div></div>';
}
function _northHTML(){
  return '<div class="north"><svg viewBox="0 0 40 52" width="9mm" height="11.7mm">'+
    '<polygon points="20,2 30,44 20,35 10,44" fill="#000"/>'+
    '<text x="20" y="52" font-size="12" text-anchor="middle" fill="#000" font-family="sans-serif">N</text>'+
    '</svg></div>';
}

// 인쇄 시트 HTML — 미리보기와 실제 인쇄가 같은 함수를 쓴다
function buildPrintSheet(dataURL,L,info,cfg,opts){
  cfg=cfg||printCfg();opts=opts||{};
  // dataURL 은 문자열(옵지 가득) 또는 {url,wMm,hMm}(고른 범위 실치수)
  const im=(dataURL&&typeof dataURL==='object')?dataURL:{url:dataURL||'',wMm:L.availW,hMm:L.availH};
  const TB=L.tbH!==undefined?L.tbH:PRINT_TB_H;
  const drawH=L.availH, drawW=L.availW;
  const onlyPage=opts.onlyPage||0;
  const _E=printElevPaper(L,cfg);
  const _mixed=_E.own&&(_E.pw!==L.pw||_E.ph!==L.ph);
  const _rowsCss=Math.max(1,Math.round(printElevPerPage(_E,cfg)/printElevCols(_E,cfg)));
  const css=
    // 입면도를 다른 용지로 낼 때만 장마다 이름을 붙인다 (크롬이 섞어서 내준다)
    (_mixed
      ? ('@page planpg{size:'+L.pw+'mm '+L.ph+'mm;margin:0}'+
         '@page elevpg{size:'+_E.pw+'mm '+_E.ph+'mm;margin:0}'+
         '@page{size:'+L.pw+'mm '+L.ph+'mm;margin:0}'+
         '.sheet,.p2{page:planpg}.pe{page:elevpg}')
      : ('@page{size:'+L.pw+'mm '+L.ph+'mm;margin:0}'))+
    '*{box-sizing:border-box}'+
    'body{margin:0;background:#fff;color:#000;'+
      "font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;"+
      '-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    '.sheet{width:'+L.pw+'mm;height:'+L.ph+'mm;position:relative;overflow:hidden;page-break-after:always}'+
    '.frame{position:absolute;left:'+PRINT_MARGIN+'mm;top:'+PRINT_MARGIN+'mm;'+
      'width:'+drawW+'mm;height:'+(L.ph-PRINT_MARGIN*2)+'mm;border:0.6mm solid #000}'+
    '.draw{position:absolute;left:0;top:0;width:'+drawW+'mm;height:'+drawH+'mm;overflow:hidden;'+
      'display:flex;align-items:center;justify-content:center}'+
    '.draw img{display:block;width:'+im.wMm.toFixed(3)+'mm;height:'+im.hMm.toFixed(3)+'mm}'+
    '.tb{position:absolute;left:0;bottom:0;width:'+drawW+'mm;height:'+TB+'mm;'+
      'border-top:0.6mm solid #000;display:flex;align-items:stretch}'+
    '.tb .cell{border-left:0.25mm solid #000;padding:1.2mm 2mm;display:flex;flex-direction:column;justify-content:center}'+
    '.tb .cell:first-child{border-left:none}'+
    '.tb .k{font-size:2.1mm;letter-spacing:0.3mm;color:#444}'+
    '.tb .v{font-size:3.1mm;font-weight:700;margin-top:0.5mm}'+
    '.tb .big{font-size:4.4mm;font-weight:800;letter-spacing:0.2mm}'+
    '.sbar{position:absolute;left:2mm;bottom:'+(TB+2)+'mm;background:rgba(255,255,255,0.9);padding:0.8mm}'+
    '.north{position:absolute;right:3mm;top:3mm}'+
    '.note{position:absolute;right:2mm;bottom:'+(TB+2)+'mm;font-size:2.2mm;color:#333;'+
      'background:rgba(255,255,255,0.9);padding:0.6mm 1mm;border:0.2mm solid #999}'+
    // 2페이지 (면적표·범례)
    '.p2{width:'+L.pw+'mm;height:'+L.ph+'mm;padding:'+PRINT_MARGIN+'mm;position:relative}'+
    '.p2 h2{font-size:4.5mm;margin:0 0 3mm 0;border-bottom:0.5mm solid #000;padding-bottom:1.5mm}'+
    '.p2 .cols{display:flex;gap:6mm;align-items:flex-start;flex-wrap:wrap}'+
    'table.dt{border-collapse:collapse;font-size:2.8mm}'+
    'table.dt th{background:#EEE;border:0.25mm solid #000;padding:1mm 2mm;font-weight:700}'+
    'table.dt td{border:0.25mm solid #666;padding:0.9mm 2mm}'+
    'table.dt td.r{text-align:right;font-family:monospace}'+
    // 입면도 뒷장 (2026-08-30)
    '.pe{width:'+_E.pw+'mm;height:'+_E.ph+'mm;padding:'+PRINT_MARGIN+'mm;position:relative;'+
      'page-break-after:always;display:flex;flex-direction:column}'+
    '.pe:last-child{page-break-after:auto}'+
    '.peh{display:flex;align-items:baseline;gap:6mm;border-bottom:0.6mm solid #000;'+
      'padding-bottom:1.8mm;flex:none}'+
    '.peh h2{font-size:4.8mm;margin:0}'+
    '.peh .pem{font-size:2.7mm;color:#333}'+
    '.peh .pep{margin-left:auto;font-size:2.7mm}'+
    '.peg{flex:1;min-height:0;display:flex;flex-wrap:wrap;align-content:flex-start;'+
      'gap:4mm;margin-top:3.5mm}'+
    '.pec{border:0.25mm solid #999;padding:2.2mm;height:calc(('+(100)+'% - '+((_rowsCss-1)*4)+
      'mm)/'+_rowsCss+');display:flex;align-items:center;justify-content:center;overflow:hidden}'+
    // 그림은 칸을 넘지 않는다 — 폭이 남아도 높이가 모자라면 높이에 맞춰 줄어든다
    '.pec>div{max-width:100%;height:100%;display:flex;align-items:center;justify-content:center}'+
    '.pec svg{max-width:100%;max-height:100%;height:auto}'+
    // 세로 용지에 입면을 눕혀 찍기 — 종이의 긴 쪽을 도면 폭으로 쓴다 (2026-08-30 대표 보고: 작다)
    //  판을 오른쪽 위 모서리 기준으로 90도 돌리면 가로·세로가 맞바뀐다.
    '.pe.rot .peh{height:'+PRINT_ELEV_HEAD+'mm}'+
    '.pe.rot .peg{position:relative;display:block;margin-top:3mm;'+
      'width:'+_elevRotW(_E)+'mm;height:'+_elevRotH(_E)+'mm}'+
    '.pe.rot .peg>.pec{position:absolute;left:100%;top:0;'+
      'width:'+_elevRotH(_E)+'mm;height:'+_elevRotW(_E)+'mm;'+
      'transform:rotate(90deg);transform-origin:0 0;'+
      'display:flex;align-items:center;justify-content:center}'+
    '.pe.rot .peg>.pec{height:'+_elevRotW(_E)+'mm}'+
    '.pe.rot .peg>.pec>div{width:100%;max-height:100%}';
  const tb=cfg.titleBlock===false?'':
    '<div class="tb">'+
      '<div class="cell" style="flex:2.2"><div class="k">PROJECT</div>'+
        '<div class="big">'+escapeHtml(STATE.projectName||'')+'</div></div>'+
      '<div class="cell" style="flex:1"><div class="k">DRAWING</div><div class="v">'+escapeHtml(printDrawingTitle(cfg))+'</div></div>'+
      '<div class="cell" style="flex:0.9"><div class="k">SCALE</div><div class="big">1 / '+L.scale+'</div></div>'+
      '<div class="cell" style="flex:0.9"><div class="k">PAPER</div><div class="v">'+L.paper+' '+(L.orientation==='landscape'?'가로':'세로')+
        (cfg.colorMode==='color'?' · 칼라':'')+'</div></div>'+
      '<div class="cell" style="flex:1"><div class="k">바닥면적</div><div class="v">'+info.area+'㎡ ('+info.py+'py)</div></div>'+
      '<div class="cell" style="flex:0.8"><div class="k">문/창</div><div class="v">'+info.doorN+' / '+info.winN+'</div></div>'+
      '<div class="cell" style="flex:0.9"><div class="k">천장고</div><div class="v">'+info.ch+'mm</div></div>'+
      '<div class="cell" style="flex:1"><div class="k">DATE</div><div class="v">'+info.date+'</div></div>'+
    '</div>';
  const page1=(onlyPage===2||onlyPage===3)?'':
    '<div class="sheet"><div class="frame">'+
      '<div class="draw"><img alt="평면도" src="'+im.url+'"></div>'+
      (cfg.north===false?'':_northHTML())+
      (cfg.scaleBar===false?'':_scaleBarHTML(L.scale))+
      '<div class="note">축척 정확 인쇄 — 프린터 배율 100%(실제 크기)로 출력</div>'+
      tb+
    '</div></div>';
  const page2=(onlyPage===1||onlyPage===3||cfg.page2===false)?'':buildPrintPage2(L,info);
  // 2026-08-30: 입면도 뒷장 — onlyPage 3 이면 입면도만 (미리보기)
  const pageE=(onlyPage===1||onlyPage===2)?'':buildPrintElevPages(L,cfg,opts);
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">'+
    '<title>'+escapeHtml(STATE.projectName||'MiniCAD')+' — '+escapeHtml(printDrawingTitle(cfg))+' 1/'+L.scale+'</title>'+
    '<style>'+css+'</style></head><body>'+
    page1+page2+pageE+
    (opts.preview?'':'<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>')+
    '</body></html>';
}
// 표제란 도면명 — 프리셋에 따라 (조명·전기 도면을 '평면도'로 내보내지 않는다)
function printDrawingTitle(cfg){
  cfg=cfg||printCfg();
  const m={full:'평 면 도',construct:'시 공 도',mep:'전기·조명 평면도',furniture:'가구 배치도'};
  return m[cfg.preset]||'평 면 도';
}

// ===== 2026-08-30: 인쇄에 입면도까지 (대표 지시) =====
//  평면도와 따로 노는 그림이 아니라 같은 묶음의 뒷장으로 붙는다.
//  용지·방향·색상은 평면도에서 고른 것을 그대로 따른다.
// 한 장에 몇 면 — 대표가 정하면 그대로, 자동이면 용지 방향에 맞춘다
function printElevPerPage(L,cfg){
  cfg=cfg||printCfg();
  if(cfg.elevPerPage===1||cfg.elevPerPage===2||cfg.elevPerPage===4) return cfg.elevPerPage;
  // 입면도만 따로 큰 종이를 골랐다는 건 크게 보겠다는 뜻이다 — 한 장에 하나.
  //  (4면으로 나누면 A3 을 골라도 A4 보다 작아진다. 2026-08-30 실측에서 나온 문제)
  if(cfg.elevPaper&&cfg.elevPaper!=='same') return 1;
  return (L&&L.orientation==='landscape')?4:2;
}
// 2면까지는 종이 폭을 다 쓰는 게 크다 (나란히 놓으면 반쪽이 된다)
function printElevCols(L,cfg){ return printElevPerPage(L,cfg)>2?2:1; }
const PRINT_ELEV_HEAD=11;   // 입면도 뒷장 머리말 높이 mm
// 입면도 뒷장의 종이 크기 — 'same' 이면 평면도와 같은 장, 아니면 그 용지를 가로로
function printElevPaper(L,cfg){
  cfg=cfg||printCfg();
  if(cfg.elevPaper&&cfg.elevPaper!=='same'&&PRINT_PAPERS[cfg.elevPaper]){
    const P=PRINT_PAPERS[cfg.elevPaper];       // PRINT_PAPERS 는 가로 기준 {w,h}
    return {pw:P.w,ph:P.h,orientation:'landscape',paper:cfg.elevPaper,own:true};
  }
  return {pw:L.pw,ph:L.ph,orientation:L.orientation,paper:L.paper,own:false};
}
// 도면이 실제로 얼마나 넓게 나오는지 (mm) — 설정창에 그대로 보여준다
function printElevDrawWidth(L,cfg){
  cfg=cfg||printCfg();
  const E=printElevPaper(L,cfg);
  const rot=printElevRot(E,cfg);
  const cols=printElevCols(E,cfg);
  const board=rot?(E.ph-PRINT_MARGIN*2-PRINT_ELEV_HEAD-3):(E.pw-PRINT_MARGIN*2);
  return Math.round(board/cols-5);            // 칸 테두리·안여백을 뺀 값
}
function _elevRotW(L){ return Math.round((L.pw-PRINT_MARGIN*2)*10)/10; }
function _elevRotH(L){ return Math.round((L.ph-PRINT_MARGIN*2-PRINT_ELEV_HEAD-3)*10)/10; }
// 세로 용지에서만 눕힌다 — 가로 용지는 이미 옆으로 넓다
function printElevRot(L,cfg){
  cfg=cfg||printCfg();
  return !!(cfg.elevLandscape&&L&&L.orientation==='portrait');
}
// 뽑을 수 있는 면 전부 — 벽 하나, 절단선 하나가 각각 한 면
function printElevCandidates(){
  const out=[];
  // 절단선을 앞에 — 대표가 일부러 그은 자리가 먼저다
  (STATE.sections||[]).forEach(sc=>{
    const e=buildSectionElevation(sc);
    if(!e) return;
    out.push({key:'s:'+sc.id, kind:'section', spaceId:null, group:'절단선 — 그은 자리',
      label:sectionLabelOf(sc), name:(sc.name||(e.dir+' · '+e.L)),
      busy:(e.ops.length+e.devs.length)+1, elev:e});
  });
  ((typeof elevationSpaces==='function')?elevationSpaces():[]).forEach(sp=>{
    const nm=sp.name||((SPACE_TYPES[sp.type]&&SPACE_TYPES[sp.type].name)||sp.type);
    buildSpaceElevations(sp.id).forEach(e=>out.push({
      key:'w:'+e.wallId, kind:'wall', spaceId:sp.id, group:nm,
      label:e.label, name:e.dir+' · '+e.L,
      busy:(e.ops.length+e.devs.length), elev:e}));
  });
  return out;
}
// 지금 설정으로 인쇄될 입면 목록
function printElevationList(cfg){
  cfg=cfg||printCfg();
  if(!cfg.elevations) return [];
  const pick=cfg.elevPick||[];
  if(!pick.length) return [];
  return printElevCandidates().filter(c=>pick.indexOf(c.key)>=0).map(c=>c.elev);
}
// 처음 켤 때 무엇을 담을지 — 대표 지시: "절단면으로 만들 자리만 입면도로 인쇄"
//  절단선을 그은 자리가 곧 뽑고 싶은 자리다. 그것만 담는다.
//  절단선이 하나도 없을 때만, 빈 장이 되지 않도록 문·창·전기가 붙은 벽면으로 대신한다.
function printElevDefaults(cfg){
  cfg=cfg||printCfg();
  if(cfg.elevPick&&cfg.elevPick.length) return cfg;
  const all=printElevCandidates();
  const secs=all.filter(c=>c.kind==='section');
  if(secs.length){ cfg.elevPick=secs.map(c=>c.key); return cfg; }
  const inRegion=(cfg.region==='space'&&cfg.spaceIds.length)
    ? all.filter(c=>cfg.spaceIds.indexOf(c.spaceId)>=0) : all;
  const busy=inRegion.filter(c=>c.busy>0);
  cfg.elevPick=(busy.length?busy:inRegion).map(c=>c.key);
  return cfg;
}
// 입면도 뒷장들 — 용지 한 장에 여러 면, 한 벌은 같은 축척으로
function buildPrintElevPages(L,cfg,opts){
  cfg=cfg||printCfg();opts=opts||{};
  const list=printElevationList(cfg);
  if(!list.length) return '';
  const E=printElevPaper(L,cfg);
  const per=printElevPerPage(E,cfg), cols=printElevCols(E,cfg);
  const rows=Math.max(1,Math.round(per/cols));
  const rot=printElevRot(E,cfg);
  const widths=elevationSetWidths(list);
  const pages=[];
  for(let i=0;i<list.length;i+=per) pages.push(i);
  const color=(cfg.colorMode==='color');
  const devices=(cfg.layers&&typeof cfg.layers.electric==='boolean')?cfg.layers.electric:true;
  const only=opts.onlyElevPage;   // 미리보기는 한 장만
  return pages.map((start,pi)=>{
    if(only&&(pi+1)!==only) return '';
    const part=list.slice(start,start+per);
    return '<div class="pe'+(rot?' rot':'')+'"><div class="peh">'+
      '<h2>'+escapeHtml(STATE.projectName||'')+' — 입 면 도</h2>'+
      '<div class="pem">단위 mm · 천장고·문창·창대 높이는 평면도에서 자동 산출 · '+
        E.paper+' '+(E.orientation==='landscape'?'가로':'세로')+
        (cfg.colorMode==='color'?' · 칼라':'')+
        // 평면도와 종이가 다르면 프린터에서 그 용지를 골라야 축소되지 않는다
        (E.own?(' <b>· 프린터에서 '+E.paper+' 선택</b>'):'')+'</div>'+
      '<div class="pep">입면 '+(start+1)+'–'+(start+part.length)+' / '+list.length+
        '  (장 '+(pi+1)+'/'+pages.length+')</div></div>'+
      '<div class="peg"'+(rows===1&&!rot?' style="align-content:center"':'')+'>'+part.map((e,j)=>
        // 눕힌 판에서는 칸 크기를 CSS 가 정한다 (인라인 폭이 이기면 판이 정사각이 된다)
        '<div class="pec"'+(rot?'':' style="width:calc('+(100/cols)+'% - '+(cols>1?3:0)+'mm)"')+'>'+
          '<div style="width:'+widths[start+j]+';margin:0 auto">'+
          elevationSVG(e,{color,devices})+'</div></div>').join('')+
      '</div></div>';
  }).join('');
}

// 2페이지 — 공간 면적표 / 범례 / 개구부 리스트
function buildPrintPage2(L,info){
  const spaceRows=(STATE.spaces||[]).map(sp=>
    '<tr><td>'+((SPACE_TYPES[sp.type]&&SPACE_TYPES[sp.type].name)||sp.type)+'</td>'+
    '<td>'+escapeHtml(sp.name||'')+'</td>'+
    '<td class="r">'+spArea(sp).toFixed(2)+'</td>'+
    '<td class="r">'+(spArea(sp)/3.3058).toFixed(1)+'</td></tr>').join('');
  // 2026-08-29: 품명에 규격을 살린다 — 다운라이트 2"/3"/6" 가 따로 집계되고 타공경도 나온다
  const legend=[];
  const cnt=(arr,kind,label)=>{
    const m={};
    (arr||[]).forEach(o=>{
      const it=(typeof legendItemOf==='function')?legendItemOf(kind,o):null;
      if(!it||!it.name) return;
      const key=it.name+'\u0000'+(it.spec||'');
      if(!m[key]) m[key]={name:it.name,spec:it.spec||'',n:0};
      m[key].n++;
    });
    Object.keys(m).sort().forEach(k=>legend.push([label,m[k].name,m[k].spec,m[k].n]));
  };
  cnt(STATE.furniture,'furniture','가구');
  cnt(STATE.fixtures,'fixtures','위생/주방');
  cnt(STATE.lights,'lights','조명');
  cnt(STATE.electric,'electric','전기');
  cnt(STATE.hvac,'hvac','공조/소방');
  const legendRows=legend.map(r=>'<tr><td>'+r[0]+'</td><td>'+escapeHtml(r[1])+'</td>'+
    '<td>'+escapeHtml(r[2]||'-')+'</td><td class="r">'+r[3]+'</td></tr>').join('');
  const opRows=(STATE.openings||[]).map((o,i)=>
    '<tr><td class="r">'+(i+1)+'</td><td>'+(o.type==='DOOR'?'문':'창')+'</td>'+
    '<td>'+escapeHtml((o.doorType&&DOOR_TYPES&&DOOR_TYPES[o.doorType]?DOOR_TYPES[o.doorType].name:(o.subType||''))||'-')+'</td>'+
    '<td class="r">'+(o.width_mm||o.w||0)+'×'+(o.height_mm||o.h||0)+'</td></tr>').join('');
  return '<div class="p2">'+
    '<h2>'+escapeHtml(STATE.projectName||'')+' — 도면 부속표 (평면도 1/'+L.scale+')</h2>'+
    '<div class="cols">'+
      '<table class="dt"><tr><th colspan="4">공간 면적표</th></tr>'+
        '<tr><th>구분</th><th>실명</th><th>㎡</th><th>평</th></tr>'+spaceRows+
        '<tr><th colspan="2">합계</th><th class="r">'+info.area+'</th><th class="r">'+info.py+'</th></tr></table>'+
      (legendRows?'<table class="dt"><tr><th colspan="4">범례 (수량)</th></tr>'+
        '<tr><th>분류</th><th>품명</th><th>규격 (mm)</th><th>수량</th></tr>'+legendRows+'</table>':'')+
      (opRows?'<table class="dt"><tr><th colspan="4">개구부 리스트</th></tr>'+
        '<tr><th>NO</th><th>종별</th><th>형식</th><th>W×H</th></tr>'+opRows+'</table>':'')+
    '</div></div>';
}

// v5.7: 인쇄 시 2.5D 강제 OFF (시공 도면은 평면 모드만 허용)
// 2026-08-28: 설정창에서 정한 범위·용지·표시요소로 인쇄 (opts 로 덮어쓸 수 있음)
function printPlan(opts){
  const cfg=printCfg();
  if(opts&&typeof opts==='object') Object.assign(cfg,opts);
  const bbox=printRegionBBox(cfg);
  if(!bbox){alert('인쇄할 도면이 없습니다 — 공간을 먼저 그려주세요');return;}
  const L=choosePrintLayout(bbox,cfg);
  let img;
  try{
    img=_printCapture(bbox,L,cfg,PRINT_DPI);
  }catch(err){
    alert('인쇄 이미지 생성 실패: '+(err.message||err));
    refreshUI();return;
  }
  const html=buildPrintSheet(img,L,_printInfo(),cfg,{});
  const w=window.open('','_blank');
  if(!w){alert('팝업이 차단되었습니다 — 팝업 허용 후 다시 인쇄하세요');refreshUI();return;}
  w.document.write(html);
  w.document.close();
  const _evN=printElevationList(cfg).length;
  cmdToast('인쇄: '+printRegionLabel(cfg)+' · '+L.paper+' '+(L.orientation==='landscape'?'가로':'세로')+
    ' · 1/'+L.scale+(_evN?(' · 입면도 '+_evN+'면'):'')+(L.overflow?' (지정 축척 — 일부 잘림)':''));
  refreshUI();
}

// 인쇄용 캡처 — 미리보기와 실제 인쇄가 같은 경로를 쓴다 (미리 본 그대로 나온다)
function _printCapture(bbox,L,cfg,dpi){
  cfg=cfg||printCfg();
  const bak={zoom:STATE.zoom,ox:STATE.offsetX,oy:STATE.offsetY,plus2D:STATE.plus2D,
    theme:document.body.getAttribute('data-theme'),grid:STATE.showGrid,
    selKind:STATE.selectedKind,selId:STATE.selectedId,box:STATE.boxSelection,
    w:stage.width(),h:stage.height(),
    layers:{...STATE.layers},labelMode:STATE.symbolLabelMode,dims:STATE.showDimensions};
  try{
    STATE.plus2D=false;STATE.showGrid=false;
    STATE.selectedKind=null;STATE.selectedId=null;STATE.boxSelection=[];
    document.body.setAttribute('data-theme','architect'); // 내력벽 등 테마 의존 색을 흑색 계열로
    STATE.printMode=true;
    // 표시 요소 — 화면 레이어와 별개로, 이 인쇄에만 적용
    PRINT_LAYER_KEYS.forEach(k=>{if(k in STATE.layers) STATE.layers[k]=!!cfg.layers[k];});
    STATE.showDimensions=!!cfg.layers.dimensions;
    // 기호 이름 라벨 — 조명·전기 도면은 이름이 있어야 읽힌다 (묶음 대표만)
    STATE.printLabels=(cfg.symbolLabels&&cfg.symbolLabels!=='off');
    if(STATE.printLabels) STATE.symbolLabelMode=cfg.symbolLabels;
    STATE.printColor=(cfg.colorMode==='color'); // 2026-08-29: 칼라 인쇄
    // 축척 1/S 을 96dpi 기준으로 배치 → 캡처 때 pixelRatio 로 승격
    const zoom=(96/25.4/L.scale)/(STATE.scale/1000);
    STATE.zoom=zoom;
    // 2026-08-28: 고른 범위만 딱 떠서 종이에 올린다.
    //  종전엔 용지 전체를 떠서 늘였기 때문에, 거실만 골라도 옆방까지 따라 찍혔다.
    const maxW=Math.round(L.availW/25.4*96), maxH=Math.round(L.availH/25.4*96);
    const wantW=Math.round(bbox.w/L.scale/25.4*96), wantH=Math.round(bbox.h/L.scale/25.4*96);
    const outW=Math.max(8,Math.min(wantW,maxW)), outH=Math.max(8,Math.min(wantH,maxH));
    const cx=(bbox.minX+bbox.maxX)/2, cy=(bbox.minY+bbox.maxY)/2;
    STATE.offsetX=outW/2-mmToPx(cx);
    STATE.offsetY=outH/2-mmToPx(cy);
    if(stage.width()<outW||stage.height()<outH) stage.size({width:outW,height:outH});
    drawGrid();renderAll();
    if(STATE.printColor) applyPrintColor(); else applyPrintInk();
    return {url:stage.toDataURL({x:0,y:0,width:outW,height:outH,
              pixelRatio:(dpi||PRINT_DPI)/96,mimeType:'image/png'}),
            wMm:outW/96*25.4, hMm:outH/96*25.4};
  }finally{
    STATE.printMode=false;STATE.printLabels=false;STATE.printColor=false;
    STATE.layers=bak.layers;STATE.symbolLabelMode=bak.labelMode;STATE.showDimensions=bak.dims;
    STATE.plus2D=bak.plus2D;STATE.showGrid=bak.grid;
    STATE.zoom=bak.zoom;STATE.offsetX=bak.ox;STATE.offsetY=bak.oy;
    STATE.selectedKind=bak.selKind;STATE.selectedId=bak.selId;STATE.boxSelection=bak.box||[];
    if(bak.theme) document.body.setAttribute('data-theme',bak.theme);
    else document.body.removeAttribute('data-theme');
    if(stage.width()!==bak.w||stage.height()!==bak.h) stage.size({width:bak.w,height:bak.h});
    drawGrid();renderAll();
  }
}
function _printInfo(){
  const t=new Date();
  return {
    date:t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'),
    area:(document.getElementById('t-floor')||{textContent:'0.00'}).textContent,
    py:(document.getElementById('t-floor-pyeong')||{textContent:'0.0'}).textContent,
    doorN:(STATE.openings||[]).filter(o=>o.type==='DOOR').length,
    winN:(STATE.openings||[]).filter(o=>o.type==='WINDOW').length,
    ch:STATE.ceilingHeight,
  };
}

// ===== 인쇄 설정 창 =====
let _printDlgEl=null,_printPreviewPage=1,_printPreviewTimer=null,_printThumbToken=0;
function closePrintDialog(){
  if(_printPreviewTimer){clearTimeout(_printPreviewTimer);_printPreviewTimer=null;}
  _printThumbToken++;
  if(_printDlgEl){_printDlgEl.remove();_printDlgEl=null;}
}
function _pdSection(title,inner){
  return '<div style="margin-bottom:12px">'+
    '<div style="font-size:10.5px;letter-spacing:0.06em;color:var(--gold,#C9A961);margin-bottom:6px;font-weight:700">'+title+'</div>'+
    inner+'</div>';
}
// 왼쪽 패널을 그리는 동안만 후보 목록을 재활용 (면마다 입면을 새로 만드는 비용이 크다)
let _pdCandCache=null;
function printElevCands$(){
  if(!_pdCandCache) _pdCandCache=printElevCandidates();
  return _pdCandCache;
}
function _pdCandsDirty(){ _pdCandCache=null; }
function _pdLeftHTML(cfg){
  _pdCandsDirty();
  const radio=(name,val,cur,label,extra)=>
    '<label style="display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:5px;cursor:pointer;font-size:12px'+
      (cur===val?';background:rgba(201,169,97,0.16);outline:1px solid var(--gold,#C9A961)':'')+'">'+
    '<input type="radio" name="'+name+'" value="'+val+'"'+(cur===val?' checked':'')+' style="accent-color:#C9A961">'+
    '<span>'+label+'</span>'+(extra?'<span style="margin-left:auto;color:var(--text-tertiary,#7B82B5);font-size:10.5px">'+extra+'</span>':'')+
    '</label>';
  const rectTxt=cfg.rect?(Math.abs(cfg.rect.x2-cfg.rect.x1)+'×'+Math.abs(cfg.rect.y2-cfg.rect.y1)+'mm'):'미지정';
  const region=_pdSection('인쇄 범위 — 어디를 뽑을지',
    '<div style="display:flex;flex-direction:column;gap:2px">'+
    radio('pd-region','all',cfg.region,'전체 도면')+
    radio('pd-region','rect',cfg.region,'선택 영역',rectTxt)+
    radio('pd-region','space',cfg.region,'공간 지정',cfg.spaceIds.length?cfg.spaceIds.length+'개':'미지정')+
    radio('pd-region','view',cfg.region,'현재 화면 그대로')+
    '</div>'+
    '<div style="display:flex;gap:5px;margin-top:6px">'+
    '<button type="button" class="btn sm" id="pd-pick-rect" style="flex:1">⬚ 드래그로 지정</button>'+
    '<button type="button" class="btn sm" id="pd-grab" style="flex:1">🖥 화면에서 잡기</button>'+
    '</div>');

  const spaceChips=(STATE.spaces||[]).length
    ? '<div style="display:flex;flex-wrap:wrap;gap:4px;max-height:96px;overflow-y:auto">'+
      (STATE.spaces||[]).map(sp=>{
        const on=cfg.spaceIds.indexOf(sp.id)>=0;
        const nm=escapeHtml(sp.name||((SPACE_TYPES[sp.type]&&SPACE_TYPES[sp.type].name)||sp.type));
        return '<button type="button" class="btn sm pd-space" data-id="'+sp.id+'" style="padding:3px 8px;font-size:11px'+
          (on?';background:rgba(201,169,97,0.25);border-color:#C9A961;color:#C9A961':'')+'">'+nm+'</button>';
      }).join('')+'</div>'
    : '<div style="font-size:11px;color:var(--text-tertiary,#7B82B5)">공간이 없습니다</div>';

  const sel=(id,cur,opts)=>'<select id="'+id+'" style="width:100%;font-size:12px">'+
    opts.map(o=>'<option value="'+o[0]+'"'+(String(cur)===String(o[0])?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
  const paper=_pdSection('용지 · 축척',
    '<div style="display:flex;gap:5px">'+
    '<div style="flex:1">'+sel('pd-paper',cfg.paper,[['auto','용지 자동'],['A4','A4'],['A3','A3'],['A2','A2']])+'</div>'+
    '<div style="flex:1">'+sel('pd-ori',cfg.orientation,[['auto','방향 자동'],['landscape','가로'],['portrait','세로']])+'</div>'+
    '</div>'+
    '<div style="margin-top:5px">'+sel('pd-scale',cfg.scale,
      [['auto','축척 자동 (가장 크게)']].concat(PRINT_SCALES.map(s=>[s,'1 / '+s])))+'</div>');

  const chk=(k,label,on)=>'<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;cursor:pointer;padding:2px 0">'+
    '<input type="checkbox" class="pd-layer" data-k="'+k+'"'+(on?' checked':'')+' style="accent-color:#C9A961">'+label+'</label>';
  const layers=_pdSection('표시 요소',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">'+
    PRINT_LAYER_KEYS.filter(k=>k!=='xlines').map(k=>chk(k,PRINT_LAYER_NAMES[k],!!cfg.layers[k])).join('')+
    '</div>'+
    '<div style="margin-top:6px">'+
    '<div style="font-size:11px;color:var(--text-secondary,#A9B0C9);margin-bottom:3px">기호 이름</div>'+
    sel('pd-symlabel',cfg.symbolLabels,[['off','표기 없음'],['smart','묶음 대표만 (이름 ×개수)'],['all','전부 표기']])+
    '</div>');

  const chk2=(id,label,on)=>'<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;cursor:pointer;padding:2px 0">'+
    '<input type="checkbox" class="pd-opt" data-k="'+id+'"'+(on?' checked':'')+' style="accent-color:#C9A961">'+label+'</label>';
  const color=_pdSection('인쇄 색상',
    sel('pd-color',cfg.colorMode,[['ink','흑백 선화 (시공도면)'],['color','칼라 (제안·영업용)']])+
    '<div class="hint" style="margin-top:4px">흑백은 흰 바탕에 검정 선화 · 칼라는 공간·문창 색을 살려 찍습니다</div>');
  const sheet=_pdSection('도면 양식',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">'+
    chk2('titleBlock','표제란',cfg.titleBlock)+chk2('scaleBar','축척바',cfg.scaleBar)+
    chk2('north','방위표',cfg.north)+chk2('page2','2페이지 부속표',cfg.page2)+
    '</div>');

  // 2026-08-30: 입면도 — 면 하나씩 골라 담고, 한 장에 몇 면인지도 대표가 정한다
  const evCands=cfg.elevations?printElevCands$(cfg):[];
  const evN=(cfg.elevPick||[]).filter(k=>evCands.some(c=>c.key===k)).length;
  const evSecN=(STATE.sections||[]).length;
  const _Lui={pw:210,ph:297,orientation:(cfg.orientation==='portrait')?'portrait':'landscape',paper:'A4'};
  if(_Lui.orientation==='landscape'){_Lui.pw=297;_Lui.ph=210;}
  const _perUI=printElevPerPage(printElevPaper(_Lui,cfg),cfg);
  const _evWmm=printElevDrawWidth(_Lui,cfg);
  const perBtn=v=>'<button type="button" class="btn sm pd-evper" data-v="'+v+'" '+
    'style="flex:1;padding:3px 2px;font-size:11px'+
    (cfg.elevPerPage===v?';background:rgba(201,169,97,0.25);border-color:#C9A961;color:#C9A961':'')+
    '">'+(v===0?'자동':(v+'면'))+'</button>';
  let evRows='',lastG=null;
  evCands.forEach(c=>{
    if(c.group!==lastG){
      lastG=c.group;
      evRows+='<div style="font-size:10.5px;color:var(--text-tertiary,#7B82B5);margin:6px 0 2px">'+
        escapeHtml(c.group)+'</div>';
    }
    const on=(cfg.elevPick||[]).indexOf(c.key)>=0;
    evRows+='<label class="pd-evrow" style="display:flex;align-items:center;gap:6px;font-size:11.5px;'+
      'padding:2px 4px;border-radius:4px;cursor:pointer;background:'+
      (on?'rgba(201,169,97,0.14)':'transparent')+'">'+
      '<input type="checkbox" class="pd-evpick" data-k="'+c.key+'"'+(on?' checked':'')+
        ' style="accent-color:#C9A961">'+
      '<b style="color:var(--gold,#C9A961);width:13px">'+escapeHtml(c.label)+'</b>'+
      '<span style="flex:1;color:var(--text-secondary,#A9B0C9)">'+escapeHtml(c.name)+'</span>'+
      '<span style="color:var(--text-tertiary,#7B82B5)">'+(c.busy?('문창·전기 '+c.busy):'빈 벽')+'</span>'+
      '</label>';
  });
  const elevBox=_pdSection('입면도 — 평면도 뒤에 붙는 뒷장',
    '<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;cursor:pointer;padding:2px 0">'+
      '<input type="checkbox" id="pd-elev"'+(cfg.elevations?' checked':'')+
      ' style="accent-color:#C9A961">평면도 뒤에 입면도 붙이기</label>'+
    (cfg.elevations?(
      (evCands.length?(
        '<div style="display:flex;gap:4px;margin:6px 0 2px">'+
          '<button type="button" class="btn sm" id="pd-evsec" style="flex:1.2;padding:3px;font-size:11px'+
            (evSecN?'':';opacity:0.45')+'">✂ 절단선만</button>'+
          '<button type="button" class="btn sm" id="pd-evbusy" style="flex:1.4;padding:3px;font-size:11px">문창·전기 있는 면</button>'+
          '<button type="button" class="btn sm" id="pd-evall" style="flex:0.8;padding:3px;font-size:11px">전체</button>'+
          '<button type="button" class="btn sm" id="pd-evnone" style="flex:0.8;padding:3px;font-size:11px">해제</button>'+
        '</div>'+
        '<div style="max-height:168px;overflow-y:auto;padding-right:2px">'+evRows+'</div>'
      ):'<div class="hint" style="margin-top:5px">입면도로 뽑을 벽이 없습니다 — 공간을 그리거나 절단선(K)을 그어주세요</div>')+
      '<div style="font-size:11px;color:var(--text-secondary,#A9B0C9);margin:9px 0 3px">'+
        '입면도 용지 — 평면도와 따로 정합니다 (크게 뽑으려면 A3·A2)</div>'+
      '<div style="display:flex;gap:3px">'+
        [['same','같게'],['A4','A4'],['A3','A3'],['A2','A2']].map(([v,t])=>
          '<button type="button" class="btn sm pd-evpaper" data-v="'+v+'" style="flex:1;padding:3px 2px;'+
          'font-size:11px'+(cfg.elevPaper===v?';background:rgba(201,169,97,0.25);border-color:#C9A961;color:#C9A961':'')+
          '">'+t+'</button>').join('')+'</div>'+
      '<div style="font-size:11px;color:var(--text-secondary,#A9B0C9);margin:9px 0 3px">'+
        '한 장에 몇 면 — 적게 담을수록 크게 나옵니다</div>'+
      '<div style="display:flex;gap:3px">'+[0,1,2,4].map(perBtn).join('')+'</div>'+
      (cfg.elevPaper==='same'
        ? ('<label style="display:flex;align-items:center;gap:5px;font-size:11.5px;cursor:pointer;'+
           'margin-top:6px">'+
           '<input type="checkbox" id="pd-evrot"'+(cfg.elevLandscape?' checked':'')+
           ' style="accent-color:#C9A961">세로 용지면 입면도는 눕혀서 크게</label>')
        : '')+
      '<div class="hint" style="margin-top:6px">'+
        (evN?('고른 입면 <b style="color:var(--gold,#C9A961)">'+evN+'면</b> · 뒷장 '+
          Math.ceil(evN/_perUI)+'장 (한 장에 '+_perUI+'면)'+
          '<br>도면 폭 <b style="color:var(--gold,#C9A961)">약 '+_evWmm+'mm</b>'+
          (cfg.elevPaper!=='same'?(' · '+cfg.elevPaper+' 가로 (평면도와 다른 용지)'):''))
        :'고른 면이 없습니다 — 위에서 골라주세요')+'</div>'
    ):'<div class="hint" style="margin-top:4px">켜면 어느 벽·절단선을 넣을지 하나씩 고를 수 있습니다</div>'));

  return region+
    (cfg.region==='space'?_pdSection('인쇄할 공간 (여러 개 선택 가능)',spaceChips):'')+
    paper+elevBox+layers+color+sheet;
}
function _pdThumbsHTML(cfg){
  return '<div style="display:flex;gap:8px">'+PRINT_PRESETS.map(p=>
    '<button type="button" class="pd-preset" data-key="'+p.key+'" style="flex:1;min-width:0;text-align:left;cursor:pointer;'+
      'background:'+(cfg.preset===p.key?'rgba(201,169,97,0.16)':'transparent')+';'+
      'border:1px solid '+(cfg.preset===p.key?'var(--gold,#C9A961)':'var(--border,#3D4466)')+';border-radius:7px;padding:6px">'+
    '<div class="pd-thumb" data-key="'+p.key+'" style="width:100%;aspect-ratio:1.414;background:#fff;border:1px solid #999;'+
      'display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:2px">'+
      '<span style="font-size:10px;color:#999">…</span></div>'+
    '<div style="font-size:11.5px;font-weight:700;color:var(--text-primary,#F5F1EB);margin-top:5px">'+p.name+'</div>'+
    '<div style="font-size:10px;color:var(--text-tertiary,#7B82B5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+p.desc+'</div>'+
    '</button>').join('')+'</div>';
}
function openPrintDialog(){
  closePrintDialog();
  const cfg=printCfg();
  if(cfg.region==='space'&&!cfg.spaceIds.length){
    // 선택 중인 공간이 있으면 그걸 기본값으로 (한 번 더 고르게 하지 않는다)
    const sels=[];
    if(STATE.selectedKind==='space'&&STATE.selectedId) sels.push(STATE.selectedId);
    (STATE.boxSelection||[]).forEach(b=>{if(b.kind==='space')sels.push(b.id);});
    cfg.spaceIds=[...new Set(sels)];
  }
  const wrap=document.createElement('div');
  wrap.id='print-dialog';
  wrap.style.cssText='position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,0.6);display:flex;'+
    'justify-content:center;align-items:center;padding:14px';
  const box=document.createElement('div');
  box.style.cssText='width:min(1140px,97vw);height:min(780px,94vh);background:var(--bg-card,#1A1B2E);'+
    'border:1px solid var(--gold,#C9A961);border-radius:10px;box-shadow:0 12px 48px rgba(0,0,0,0.6);'+
    'display:flex;flex-direction:column;overflow:hidden';
  box.innerHTML=
    '<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border,#3D4466)">'+
      '<div style="font-size:14px;font-weight:700;color:var(--text-primary,#F5F1EB)">🖨 인쇄 설정</div>'+
      '<div id="pd-info" style="font-size:11.5px;color:var(--text-secondary,#A9B0C9)"></div>'+
      '<button type="button" class="btn sm" id="pd-x" style="margin-left:auto">닫기 (Esc)</button>'+
    '</div>'+
    '<div style="flex:1;display:flex;min-height:0">'+
      '<div id="pd-left" style="width:310px;flex:none;overflow-y:auto;padding:12px 13px;'+
        'border-right:1px solid var(--border,#3D4466)"></div>'+
      '<div style="flex:1;min-width:0;display:flex;flex-direction:column;padding:10px 12px">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px">'+
          '<button type="button" class="btn sm" id="pd-pg1">1페이지 · 도면</button>'+
          '<button type="button" class="btn sm" id="pd-pg2">2페이지 · 부속표</button>'+
          '<button type="button" class="btn sm" id="pd-pg3">입면도</button>'+
          '<div id="pd-busy" style="margin-left:auto;font-size:11px;color:var(--gold,#C9A961)"></div>'+
        '</div>'+
        '<div id="pd-preview" style="flex:1;min-height:0;background:#6B6F7E;border-radius:6px;'+
          'display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px"></div>'+
        '<div style="margin-top:9px">'+
          '<div style="font-size:10.5px;letter-spacing:0.06em;color:var(--gold,#C9A961);margin-bottom:5px;font-weight:700">'+
            '용도별 프리셋 — 눌러서 비교</div>'+
          '<div id="pd-thumbs"></div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div style="display:flex;gap:7px;padding:10px 14px;border-top:1px solid var(--border,#3D4466)">'+
      '<div id="pd-hint" style="font-size:11px;color:var(--text-tertiary,#7B82B5);align-self:center"></div>'+
      '<button type="button" class="btn sm" id="pd-close" style="margin-left:auto">닫기</button>'+
      '<button type="button" class="btn sm gold" id="pd-print" style="font-weight:700">🖨 인쇄하기</button>'+
    '</div>';
  wrap.appendChild(box);
  wrap.addEventListener('pointerdown',e=>{if(e.target===wrap)closePrintDialog();});
  document.body.appendChild(wrap);
  _printDlgEl=wrap;
  _printPreviewPage=1;
  document.getElementById('pd-x').addEventListener('click',closePrintDialog);
  document.getElementById('pd-close').addEventListener('click',closePrintDialog);
  document.getElementById('pd-print').addEventListener('click',()=>{closePrintDialog();printPlan();});
  document.getElementById('pd-pg1').addEventListener('click',()=>{_printPreviewPage=1;_pdSyncPageBtns();_pdPreview();});
  document.getElementById('pd-pg2').addEventListener('click',()=>{_printPreviewPage=2;_pdSyncPageBtns();_pdPreview();});
  document.getElementById('pd-pg3').addEventListener('click',()=>{
    // 2026-08-30 대표 보고: 눌러도 안 나왔다 — 꺼져 있으면 여기서 켠다 (누른 것 자체가 보겠다는 뜻)
    const c=printCfg();
    if(!c.elevations||!printElevationList(c).length){
      c.elevations=true;
      c.elevPick=[];
      printElevDefaults(c);
      _pdRenderLeft();
    }
    _printPreviewPage=3;_pdSyncPageBtns();_pdPreview();
  });
  _pdRenderLeft();
  _pdSyncPageBtns();
  _pdPreview();
  _pdThumbs();
}
function _pdSyncPageBtns(){
  const c=printCfg();
  const b1=document.getElementById('pd-pg1'),b2=document.getElementById('pd-pg2');
  if(b1) b1.classList.toggle('gold',_printPreviewPage===1);
  if(b2){b2.classList.toggle('gold',_printPreviewPage===2);b2.disabled=!c.page2;b2.style.opacity=c.page2?'1':'0.45';}
  const b3=document.getElementById('pd-pg3');
  if(b3){
    // 잠그는 건 도면에 뽑을 벽 자체가 없을 때만. '아직 안 켬' 은 잠글 이유가 아니다 —
    // 누르면 켜지게 해 두었다 (2026-08-30 대표 보고).
    const can=((typeof elevationSpaces==='function')?elevationSpaces().length:0)+
              ((STATE.sections||[]).length);
    const n=printElevationList(c).length;
    b3.classList.toggle('gold',_printPreviewPage===3);
    b3.disabled=!can;b3.style.opacity=can?'1':'0.45';
    b3.textContent=can?('입면도'+(n?(' ('+n+'면)'):'')):'입면도 (뽑을 벽 없음)';
  }
}
function _pdRenderLeft(){
  const cfg=printCfg();
  const left=document.getElementById('pd-left');
  if(!left) return;
  left.innerHTML=_pdLeftHTML(cfg);
  const thumbs=document.getElementById('pd-thumbs');
  if(thumbs&&!thumbs.innerHTML) thumbs.innerHTML=_pdThumbsHTML(cfg);
  left.querySelectorAll('input[name="pd-region"]').forEach(r=>r.addEventListener('change',()=>{
    cfg.region=r.value;
    if(cfg.region==='rect'&&!cfg.rect){startPrintRegionPick();return;}
    _pdRenderLeft();_pdPreview();_pdThumbs();
  }));
  const pick=document.getElementById('pd-pick-rect');
  if(pick) pick.addEventListener('click',startPrintRegionPick);
  const grab=document.getElementById('pd-grab');
  if(grab) grab.addEventListener('click',()=>togglePrintFrame(true));
  left.querySelectorAll('.pd-space').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.id, i=cfg.spaceIds.indexOf(id);
    if(i>=0) cfg.spaceIds.splice(i,1); else cfg.spaceIds.push(id);
    cfg.region='space';
    _pdRenderLeft();_pdPreview();_pdThumbs();
  }));
  ['pd-paper','pd-ori','pd-scale','pd-symlabel','pd-color'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('change',()=>{
      const v=el.value;
      if(id==='pd-paper') cfg.paper=v;
      else if(id==='pd-ori') cfg.orientation=v;
      else if(id==='pd-scale') cfg.scale=(v==='auto')?'auto':parseInt(v,10);
      else if(id==='pd-color') cfg.colorMode=v;
      else cfg.symbolLabels=v;
      _pdPreview();
    });
  });
  left.querySelectorAll('.pd-layer').forEach(c=>c.addEventListener('change',()=>{
    cfg.layers[c.dataset.k]=c.checked;
    cfg.preset='custom';
    _pdMarkPreset();_pdPreview();
  }));
  left.querySelectorAll('.pd-opt').forEach(c=>c.addEventListener('change',()=>{
    cfg[c.dataset.k]=c.checked;
    _pdSyncPageBtns();
    if(c.dataset.k==='page2'&&!cfg.page2&&_printPreviewPage===2){_printPreviewPage=1;_pdSyncPageBtns();}
    _pdPreview();
  }));
  // 2026-08-30: 입면도 붙이기
  const evT=document.getElementById('pd-elev');
  if(evT) evT.addEventListener('change',()=>{
    cfg.elevations=evT.checked;
    if(cfg.elevations) printElevDefaults(cfg);
    if(!cfg.elevations&&_printPreviewPage===3) _printPreviewPage=1;
    _pdRenderLeft();_pdSyncPageBtns();_pdPreview();
  });
  // 면 하나씩 켜고 끄기
  left.querySelectorAll('.pd-evpick').forEach(c=>c.addEventListener('change',()=>{
    const k=c.dataset.k, i=cfg.elevPick.indexOf(k);
    if(c.checked){ if(i<0) cfg.elevPick.push(k); } else if(i>=0) cfg.elevPick.splice(i,1);
    _pdRenderLeft();_pdSyncPageBtns();
    if(_printPreviewPage===3) _pdPreview();
  }));
  const evSet=(fn)=>{
    cfg.elevPick=printElevCands$(cfg).filter(fn).map(c=>c.key);
    _pdRenderLeft();_pdSyncPageBtns();
    if(_printPreviewPage===3) _pdPreview();
  };
  const bs=document.getElementById('pd-evsec');   if(bs) bs.addEventListener('click',()=>evSet(c=>c.kind==='section'));
  const ba=document.getElementById('pd-evall');   if(ba) ba.addEventListener('click',()=>evSet(()=>true));
  const bb=document.getElementById('pd-evbusy');  if(bb) bb.addEventListener('click',()=>evSet(c=>c.busy>0));
  const bn=document.getElementById('pd-evnone');  if(bn) bn.addEventListener('click',()=>evSet(()=>false));
  const brot=document.getElementById('pd-evrot');
  if(brot) brot.addEventListener('change',()=>{
    cfg.elevLandscape=brot.checked;
    _pdSyncPageBtns();
    if(_printPreviewPage===3) _pdPreview();
  });
  left.querySelectorAll('.pd-evpaper').forEach(b=>b.addEventListener('click',()=>{
    cfg.elevPaper=b.dataset.v;
    _pdRenderLeft();_pdSyncPageBtns();
    if(_printPreviewPage===3) _pdPreview();
  }));
  left.querySelectorAll('.pd-evper').forEach(b=>b.addEventListener('click',()=>{
    cfg.elevPerPage=parseInt(b.dataset.v,10)||0;
    _pdRenderLeft();_pdSyncPageBtns();
    if(_printPreviewPage===3) _pdPreview();
  }));
  _pdBindPresets();
}
function _pdBindPresets(){
  const host=document.getElementById('pd-thumbs');
  if(!host) return;
  host.querySelectorAll('.pd-preset').forEach(b=>{
    if(b._bound) return; b._bound=true;
    b.addEventListener('click',()=>{
      applyPrintPreset(b.dataset.key);
      _pdRenderLeft();_pdMarkPreset();_pdPreview();
    });
  });
}
function _pdMarkPreset(){
  const cfg=printCfg(),host=document.getElementById('pd-thumbs');
  if(!host) return;
  host.querySelectorAll('.pd-preset').forEach(b=>{
    const on=cfg.preset===b.dataset.key;
    b.style.background=on?'rgba(201,169,97,0.16)':'transparent';
    b.style.borderColor=on?'var(--gold,#C9A961)':'var(--border,#3D4466)';
  });
}
// 미리보기 — 실제 인쇄와 같은 시트 HTML 을 그대로 축소해 보여준다
function _pdPreview(){
  if(_printPreviewTimer) clearTimeout(_printPreviewTimer);
  const busy=document.getElementById('pd-busy');
  if(busy) busy.textContent='미리보기 생성 중…';
  _printPreviewTimer=setTimeout(()=>{
    _printPreviewTimer=null;
    const host=document.getElementById('pd-preview');
    if(!host||!_printDlgEl) return;
    const cfg=printCfg();
    const bbox=printRegionBBox(cfg);
    if(typeof refreshPrintFrameBar==='function') refreshPrintFrameBar(); // 틀이 켜져 있으면 함께 갱신
    const info=document.getElementById('pd-info');
    if(!bbox){
      host.innerHTML='<div style="color:#fff;font-size:12px">인쇄할 도면이 없습니다 — 공간을 먼저 그려주세요</div>';
      if(info) info.textContent='';
      if(busy) busy.textContent='';
      return;
    }
    const L=choosePrintLayout(bbox,cfg);
    if(info){
      const _EP=printElevPaper(L,cfg);
      info.textContent=printRegionLabel(cfg)+' · '+L.paper+' '+(L.orientation==='landscape'?'가로':'세로')+
        ' · 1/'+L.scale+' · '+Math.round(bbox.w)+'×'+Math.round(bbox.h)+'mm'+
        ((cfg.elevations&&_EP.own)?('  |  입면도 '+_EP.paper+' 가로'):'');
    }
    // 입면도 미리보기인데 담긴 면이 없으면 흰 종이 대신 이유를 적는다
    if(_printPreviewPage===3&&!printElevationList(cfg).length){
      const can=((typeof elevationSpaces==='function')?elevationSpaces().length:0)+
                ((STATE.sections||[]).length);
      host.innerHTML='<div style="color:#fff;font-size:12px;text-align:center;line-height:1.7;padding:16px">'+
        (can?'왼쪽 <b>입면도</b> 에서 넣을 벽·절단선을 골라주세요'
            :'입면도로 뽑을 벽이 없습니다<br>공간을 그리거나 절단선(K)을 그어주세요')+'</div>';
      if(busy) busy.textContent='';
      return;
    }
    let html;
    try{
      const img=(_printPreviewPage!==1)?null:_printCapture(bbox,L,cfg,60);
      html=buildPrintSheet(img,L,_printInfo(),cfg,
        {preview:true,onlyPage:_printPreviewPage,onlyElevPage:_printPreviewPage===3?1:0});
    }catch(err){
      host.innerHTML='<div style="color:#fff;font-size:12px">미리보기 실패: '+escapeHtml(err.message||'')+'</div>';
      if(busy) busy.textContent='';
      return;
    }
    const MM=96/25.4;
    // 입면도는 종이가 다를 수 있다 — 미리보기 종이도 그 크기로 (2026-08-30)
    const _PV=(_printPreviewPage===3)?printElevPaper(L,cfg):L;
    const sw=_PV.pw*MM, sh=_PV.ph*MM;
    const bw=Math.max(80,host.clientWidth-16), bh=Math.max(80,host.clientHeight-16);
    const k=Math.min(bw/sw,bh/sh);
    host.innerHTML='';
    const holder=document.createElement('div');
    holder.style.cssText='width:'+(sw*k)+'px;height:'+(sh*k)+'px;box-shadow:0 4px 18px rgba(0,0,0,0.45);background:#fff';
    const fr=document.createElement('iframe');
    fr.setAttribute('title','인쇄 미리보기');
    fr.style.cssText='width:'+sw+'px;height:'+sh+'px;border:none;transform:scale('+k+');transform-origin:top left;background:#fff';
    holder.appendChild(fr);host.appendChild(holder);
    fr.srcdoc=html;
    if(busy) busy.textContent='';
  },130);
}
// 프리셋 썸네일 — 같은 범위·용지로 4종을 나란히 (눌러서 비교)
function _pdThumbs(){
  const host=document.getElementById('pd-thumbs');
  if(!host) return;
  if(!host.innerHTML) host.innerHTML=_pdThumbsHTML(printCfg());
  _pdBindPresets();_pdMarkPreset();
  const token=++_printThumbToken;
  const cfg=printCfg();
  const bbox=printRegionBBox(cfg);
  if(!bbox) return;
  const queue=PRINT_PRESETS.slice();
  const step=()=>{
    if(token!==_printThumbToken||!_printDlgEl) return;
    const p=queue.shift();
    if(!p) return;
    const cell=host.querySelector('.pd-thumb[data-key="'+p.key+'"]');
    if(cell){
      try{
        const tcfg={...cfg,preset:p.key,layers:printPresetLayers(p.key),symbolLabels:p.symbolLabels||'off'};
        const L=choosePrintLayout(bbox,tcfg);
        const img=_printCapture(bbox,L,tcfg,22);
        cell.innerHTML='<img alt="'+p.name+'" src="'+img.url+'" style="width:100%;height:100%;object-fit:contain">';
      }catch(err){cell.innerHTML='<span style="font-size:10px;color:#c33">실패</span>';}
    }
    setTimeout(step,0); // 한 장씩 — 창이 멈춘 것처럼 보이지 않게
  };
  setTimeout(step,0);
}
// 도면에서 인쇄 영역을 드래그로 지정 (tools.js 의 _printRectActive 와 짝)
function startPrintRegionPick(){
  closePrintDialog();
  _printRectActive=true;_printRectP1=null;
  const c=printCfg();c.region='rect';
  showStatus('인쇄 영역: 도면에서 드래그해 사각형을 그리세요 (Esc 취소)');
  cmdToast('⬚ 인쇄할 영역을 드래그하세요');
}
function finishPrintRegionPick(mm1,mm2){
  const c=printCfg();
  if(Math.abs(mm2.x-mm1.x)<200||Math.abs(mm2.y-mm1.y)<200){
    cmdToast('영역이 너무 작습니다 — 다시 드래그하세요');
    _printRectActive=true;_printRectP1=null;
    return;
  }
  c.region='rect';
  c.rect={x1:Math.round(mm1.x),y1:Math.round(mm1.y),x2:Math.round(mm2.x),y2:Math.round(mm2.y)};
  showStatus('인쇄 영역 지정: '+Math.abs(c.rect.x2-c.rect.x1)+'×'+Math.abs(c.rect.y2-c.rect.y1)+'mm');
  // 2026-08-28: 드래그로 그리면 그대로 화면 틀로 넘긴다 — 바로 다시 잡을 수 있게
  if(STATE.printFrameOn){renderPrintFrame();mainLayer.batchDraw();refreshPrintFrameBar();}
  else openPrintDialog();
}
// ===== 2026-08-28: 화면에서 인쇄 영역 잡기 — 켜기/끄기 + 도면 위 조작 바 =====
function _pfBarEl(){return document.getElementById('print-frame-bar');}
function refreshPrintFrameBar(){
  const bar=_pfBarEl();
  if(!bar) return;
  const c=printCfg();
  const bb=printRegionBBox(c);
  const info=document.getElementById('pfb-info');
  if(info&&bb){
    let head='';
    try{const L=choosePrintLayout(bb,c);head=L.paper+' '+(L.orientation==='landscape'?'가로':'세로')+' · 1/'+L.scale+' · ';}catch(_){}
    info.textContent=head+Math.round(bb.w)+'×'+Math.round(bb.h)+'mm';
  }
}
function showPrintFrameBar(){
  hidePrintFrameBar();
  const bar=document.createElement('div');
  bar.id='print-frame-bar';
  bar.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:64px;z-index:820;'+
    'display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:9px;'+
    'background:rgba(16,17,30,0.94);border:1px solid var(--gold,#C9A961);'+
    'box-shadow:0 6px 22px rgba(0,0,0,0.55);font-size:12px;color:var(--text-primary,#F5F1EB)';
  bar.innerHTML=
    '<span style="color:var(--gold,#C9A961);font-weight:700">🖨 인쇄 영역</span>'+
    '<span id="pfb-info" style="font-family:JetBrains Mono,monospace;color:var(--text-secondary,#A9B0C9)"></span>'+
    '<span style="width:1px;height:16px;background:var(--border,#3D4466)"></span>'+
    '<button type="button" class="btn sm" id="pfb-view">화면 맞춤</button>'+
    '<button type="button" class="btn sm" id="pfb-all">도면 전체</button>'+
    '<button type="button" class="btn sm" id="pfb-set">설정</button>'+
    '<button type="button" class="btn sm gold" id="pfb-print" style="font-weight:700">인쇄</button>'+
    '<button type="button" class="btn sm" id="pfb-off">끄기 (Esc)</button>';
  document.body.appendChild(bar);
  document.getElementById('pfb-view').addEventListener('click',()=>printFrameFromView());
  document.getElementById('pfb-all').addEventListener('click',()=>printFrameFromPlan());
  document.getElementById('pfb-set').addEventListener('click',()=>openPrintDialog());
  document.getElementById('pfb-print').addEventListener('click',()=>printPlan());
  document.getElementById('pfb-off').addEventListener('click',()=>togglePrintFrame(false));
  refreshPrintFrameBar();
}
function hidePrintFrameBar(){const b=_pfBarEl();if(b) b.remove();}
// 지금 범위를 '잡을 수 있는 사각형'으로 굳힌다 (전체/공간/화면 → rect)
function _pfMaterializeRect(){
  const c=printCfg();
  if(c.region==='rect'&&c.rect) return c;
  const bb=printRegionBBox(c);
  if(!bb) return c;
  c.rect={x1:Math.round(bb.minX),y1:Math.round(bb.minY),x2:Math.round(bb.maxX),y2:Math.round(bb.maxY)};
  c.region='rect';
  return c;
}
function togglePrintFrame(on){
  const next=(typeof on==='boolean')?on:!STATE.printFrameOn;
  STATE.printFrameOn=next;
  if(next){
    const c=_pfMaterializeRect();
    if(!c.rect){cmdToast('인쇄할 도면이 없습니다 — 공간을 먼저 그려주세요');STATE.printFrameOn=false;return;}
    closePrintDialog();
    showPrintFrameBar();
    showStatus('인쇄 영역 — 틀을 끌어 옮기고 모서리를 잡아 크기를 맞추세요 (Esc 끄기)');
    cmdToast('🖨 인쇄 영역을 화면에서 잡으세요');
  }else{
    hidePrintFrameBar();
    showStatus('인쇄 영역 표시 끔');
  }
  updatePrintFrameBtn();
  renderPrintFrame();
  mainLayer.batchDraw();
}
function updatePrintFrameBtn(){
  const b=document.getElementById('btn-printframe');
  if(b) b.classList.toggle('gold',!!STATE.printFrameOn);
}
// 지금 보고 있는 화면을 그대로 인쇄 영역으로
function printFrameFromView(){
  const c=printCfg();
  c.region='rect';
  c.rect={x1:pxToMm(0-STATE.offsetX),y1:pxToMm(0-STATE.offsetY),
          x2:pxToMm(stage.width()-STATE.offsetX),y2:pxToMm(stage.height()-STATE.offsetY)};
  refreshPrintFrameBar();renderPrintFrame();mainLayer.batchDraw();
  showStatus('인쇄 영역 = 현재 화면');
}
// 도면 전체를 인쇄 영역으로
function printFrameFromPlan(){
  const bb=planBBoxMm();
  if(!bb){cmdToast('도면이 없습니다');return;}
  const c=printCfg();
  c.region='rect';
  c.rect={x1:Math.round(bb.minX),y1:Math.round(bb.minY),x2:Math.round(bb.maxX),y2:Math.round(bb.maxY)};
  refreshPrintFrameBar();renderPrintFrame();mainLayer.batchDraw();
  showStatus('인쇄 영역 = 도면 전체');
}
function cancelPrintRegionPick(){
  _printRectActive=false;_printRectP1=null;
  drawGroup.destroyChildren();previewLayer.batchDraw();
  showStatus('인쇄 영역 지정 취소');
}

// ===== v5.7: AI 생성 파이프라인 SSoT 번들 export =====
// 평면 PNG + JSON + 이미지 프롬프트 + 영상 프롬프트를 동시 다운로드
// 파이프라인: JSON → 이미지프롬프트 → T2I → PNG → 영상프롬프트 → T2V → MP4
function exportAIBundle(){
  // 1) 2.5D 강제 OFF로 평면 PNG 생성
  const wasPlus2D=STATE.plus2D;
  if(wasPlus2D){STATE.plus2D=false;renderAll();}
  const pngDataURL=stage.toDataURL({pixelRatio:2,mimeType:'image/png'});
  if(wasPlus2D){STATE.plus2D=true;renderAll();}

  // 2) JSON SSoT — v5.9: AI 소비자용 ai_render 프로파일 (견적·색인 등 파싱 노이즈 제거)
  const json=buildJSONProfile('ai_render');
  json.meta.ssotPipeline.plus2D_active=false; // export 시점은 강제 OFF
  json.meta.ssotPipeline.note='AI bundle export — 평면 모드 (AI vision 친화 보장)';

  // 3) 공간별 이미지 생성 프롬프트 텍스트 조립
  const imgPrompts=[];
  imgPrompts.push('# ECOREAN MiniCAD v5.9 — 이미지 생성 프롬프트 묶음');
  imgPrompts.push('# 사용 모델: Midjourney / FLUX / SDXL / Leonardo');
  imgPrompts.push('# Project: '+STATE.projectName);
  imgPrompts.push('# 출력 시간: '+new Date().toISOString());
  imgPrompts.push('');
  const hints=STATE.aiPromptHints;
  const baseStyle=hints.style.replace(/_/g,' ');
  const baseMood=hints.mood.replace(/_/g,' ');
  const baseLight=hints.lighting.replace(/_/g,' ');
  const palette=hints.materialPalette.join(', ').replace(/_/g,' ');
  const camera=hints.cameraSuggestion.replace(/_/g,' ');

  json.spaces.forEach(s=>{
    const objs=[
      ...json.furniture.filter(o=>o.parentSpaceId===s.id),
      ...json.fixtures.filter(o=>o.parentSpaceId===s.id),
      ...json.lights.filter(o=>o.parentSpaceId===s.id),
      ...json.electric.filter(o=>o.parentSpaceId===s.id),
      ...json.hvac.filter(o=>o.parentSpaceId===s.id),
    ];
    const objList=objs.map(o=>o.promptKeyword+' ('+o.placement.replace(/_/g,' ')+')').join(', ')||'empty room';
    imgPrompts.push('## ['+s.code+'-'+String(s.typeIndex||1).padStart(2,'0')+'] '+s.promptDescriptor);
    imgPrompts.push('');
    const prompt=baseStyle+' Korean apartment, '+s.promptDescriptor+', '
      +objList+', '
      +'palette: '+palette+', '+baseLight+', '+baseMood+' mood, '
      +camera+', photorealistic, --ar 16:9';
    imgPrompts.push(prompt);
    imgPrompts.push('');
  });

  // 4) 영상 시퀀스 프롬프트 조립
  const vidLines=[];
  vidLines.push('# ECOREAN MiniCAD v5.9 — 영상 생성 프롬프트');
  vidLines.push('# 사용 모델: Sora / Veo / Runway Gen-3 / Kling');
  vidLines.push('# Project: '+STATE.projectName);
  vidLines.push('');
  vidLines.push('Cinematic walkthrough of '+baseStyle+' Korean apartment.');
  vidLines.push('Total duration: '+json.meta.videoSequence.totalDuration_sec+'s, '
    +json.meta.videoSequence.suggestedFps+'fps, '
    +json.meta.videoSequence.suggestedResolution+'.');
  vidLines.push('');
  json.meta.videoSequence.walkthrough.forEach((w,i)=>{
    const sp=json.spaces.find(s=>s.id===w.spaceId);
    vidLines.push('Shot '+(i+1)+' ('+w.dwell_sec+'s): '+w.spaceName+' — '+w.cameraMove.replace(/_/g,' ')
      +(sp?(' ('+sp.promptDescriptor+')'):''));
  });
  vidLines.push('');
  vidLines.push('Lighting: '+baseLight+'. Mood: '+baseMood+'. '
    +'Palette: '+palette+'. Photorealistic, no human figures.');

  // 5) ZIP 없이 4개 파일 순차 다운로드 (대표님 환경 단순화)
  const safeName=STATE.projectName.replace(/[^a-zA-Z0-9가-힣_-]/g,'_');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const base=safeName+'_'+stamp;

  downloadDataURL(pngDataURL,base+'_floorplan.png');
  downloadText(JSON.stringify(json,null,2),base+'_floorplan.json','application/json');
  downloadText(imgPrompts.join('\n'),base+'_image_prompts.txt','text/plain');
  downloadText(vidLines.join('\n'),base+'_video_sequence.txt','text/plain');

  showStatus('AI 번들 4종 다운로드 완료 — PNG·JSON·이미지프롬프트·영상프롬프트');
}

// ===== v5.8 Task 3: DXF 내보내기/가져오기 =====
// AutoCAD R12 ASCII DXF 호환. 외주 인테리어 업체 도면 인계용.
// 좌표계: STATE는 Y-down(화면), DXF는 Y-up → 내보낼 때 Y값 부호 반전
function exportDXF(){
  const dlines=[];let hc=1;
  const h=()=>(hc++).toString(16).toUpperCase().padStart(4,'0');
  const g=(code,val)=>dlines.push(String(code).padStart(3),String(val));

  // Layer 집합 수집
  const lyrs=new Set(['0']);
  const addL=arr=>arr.forEach(o=>o.layerName&&lyrs.add(o.layerName));
  [STATE.spaces,STATE.walls,STATE.openings,STATE.furniture,STATE.fixtures,
   STATE.lights,STATE.electric,STATE.hvac,STATE.texts,STATE.circles,STATE.arcs].forEach(addL);

  // HEADER
  g(0,'SECTION');g(2,'HEADER');
  g(9,'$ACADVER');g(1,'AC1009');
  g(9,'$INSUNITS');g(70,4); // mm
  g(9,'$MEASUREMENT');g(70,1); // metric
  g(0,'ENDSEC');

  // TABLES
  g(0,'SECTION');g(2,'TABLES');
  // LAYER table
  g(0,'TABLE');g(2,'LAYER');g(70,lyrs.size);
  const spColorMap={LIVING:3,ROOM:4,KITCHEN:2,BATHROOM:5,ENTRANCE:7,BALCONY:3,CORRIDOR:8,
    DRESSING:6,STAIRS:8,PANTRY:2,UTILITY:4,POWDER:6,STUDY:4,BOILER:1,STORAGE:8,DINING:2,FOYER:8,GARAGE:8,TERRACE:3};
  lyrs.forEach(name=>{g(0,'LAYER');g(2,name);g(70,0);g(62,7);g(6,'CONTINUOUS');});
  g(0,'ENDTAB');
  // TEXT STYLE
  g(0,'TABLE');g(2,'STYLE');g(70,1);
  g(0,'STYLE');g(2,'STANDARD');g(70,0);g(40,0);g(41,1);g(50,0);g(71,0);g(42,250);g(3,'txt');g(4,'');
  g(0,'ENDTAB');
  g(0,'ENDSEC');

  // ENTITIES
  g(0,'SECTION');g(2,'ENTITIES');

  // 공간 → 닫힌 POLYLINE + 중심 라벨 TEXT
  STATE.spaces.forEach(s=>{
    if(!s.polygon||s.polygon.length<3)return;
    const lyr=s.layerName||'A-AREA';
    const col=spColorMap[s.type]||7;
    g(0,'POLYLINE');g(5,h());g(8,lyr);g(62,col);g(66,1);g(70,1);
    s.polygon.forEach(pt=>{
      g(0,'VERTEX');g(5,h());g(8,lyr);g(10,pt.x);g(20,-pt.y);g(30,0);g(70,32);
    });
    g(0,'SEQEND');g(5,h());g(8,lyr);
    // 공간명 텍스트
    const cx=Math.round(s.polygon.reduce((a,p)=>a+p.x,0)/s.polygon.length);
    const cy=Math.round(s.polygon.reduce((a,p)=>a+p.y,0)/s.polygon.length);
    const spT=SPACE_TYPES[s.type];
    const label=((spT?spT.name:'?')+' '+(s.name||'')).trim();
    g(0,'TEXT');g(5,h());g(8,lyr);g(62,col);
    g(10,cx);g(20,-cy);g(30,0);g(40,200);g(1,label);g(72,1);g(11,cx);g(21,-cy);g(31,0);
  });

  // 벽 → LINE
  STATE.walls.forEach(w=>{
    g(0,'LINE');g(5,h());g(8,w.layerName||'A-WALL');
    g(10,w.x1);g(20,-w.y1);g(30,0);g(11,w.x2);g(21,-w.y2);g(31,0);
  });

  // 개구부(도어/창) → 중심선 LINE
  STATE.openings.forEach(o=>{
    const lyr=o.layerName||(o.type==='DOOR'?'A-DOOR':'A-WIND');
    const col=o.type==='DOOR'?2:4;
    const ang=(o.angle||0)*Math.PI/180;
    const hw=Math.round((o.w||900)/2);
    const x1=Math.round(o.x+hw*Math.cos(ang)),y1=Math.round(o.y+hw*Math.sin(ang));
    const x2=Math.round(o.x-hw*Math.cos(ang)),y2=Math.round(o.y-hw*Math.sin(ang));
    g(0,'LINE');g(5,h());g(8,lyr);g(62,col);
    g(10,x1);g(20,-y1);g(30,0);g(11,x2);g(21,-y2);g(31,0);
    // 도어 호 (단순화: 1/4 원)
    if(o.type==='DOOR'){
      g(0,'ARC');g(5,h());g(8,lyr);g(62,col);
      g(10,x2);g(20,-y2);g(30,0);g(40,o.w||900);g(50,0);g(51,90);
    }
  });

  // 텍스트 → TEXT
  STATE.texts.forEach(t=>{
    g(0,'TEXT');g(5,h());g(8,t.layerName||'A-TEXT');
    g(10,t.x);g(20,-t.y);g(30,0);g(40,Math.max(100,t.h||300));g(1,t.text||'');g(50,-(t.angle||0));
  });

  // 원 → CIRCLE, 아크 → ARC
  STATE.circles.forEach(c=>{
    g(0,'CIRCLE');g(5,h());g(8,c.layerName||'A-CIRC');g(10,c.x);g(20,-c.y);g(30,0);g(40,c.r);
  });
  STATE.arcs.forEach(a=>{
    g(0,'ARC');g(5,h());g(8,a.layerName||'A-ARC');
    g(10,a.cx);g(20,-a.cy);g(30,0);g(40,a.r);g(50,a.startAngle||0);g(51,a.endAngle||90);
  });

  g(0,'ENDSEC');g(0,'EOF');

  const dxfText=dlines.join('\n');
  const safe=(STATE.projectName||'MiniCAD').replace(/[^a-zA-Z0-9가-힣_-]/g,'_');
  downloadText(dxfText,safe+'_v5.9.dxf','application/dxf');
  showStatus('DXF 내보내기 완료 — AutoCAD R12 호환 ('+lyrs.size+'개 레이어)');
}

function importDXF(text){
  // ASCII DXF 파서 (R12 ~ AutoCAD 2018+ 호환): LINE/POLYLINE/LWPOLYLINE → 벽·공간, ARC/CIRCLE → 개별 객체
  const rows=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const pairs=[];
  for(let i=0;i+1<rows.length;i+=2) pairs.push({c:parseInt(rows[i].trim(),10),v:rows[i+1].trim()});

  let newWalls=0,newSpaces=0,newCircles=0,newArcs=0,i=0;
  while(i<pairs.length){
    const {c,v}=pairs[i];
    if(c===0&&v==='LINE'){
      let lyr='A-WALL',x1=0,y1=0,x2=0,y2=0;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===10) x1=Math.round(parseFloat(p.v));
        if(p.c===20) y1=Math.round(-parseFloat(p.v));
        if(p.c===11) x2=Math.round(parseFloat(p.v));
        if(p.c===21) y2=Math.round(-parseFloat(p.v));
        i++;
      }
      if(Math.hypot(x2-x1,y2-y1)>=50){
        const dv1=ensureVertex(x1,y1),dv2=ensureVertex(x2,y2);
        STATE.walls.push(makeWallVEF(dv1.id,dv2.id,{thickness:STATE.wallThickness,layerName:lyr}));
        newWalls++;
      }
    } else if(c===0&&v==='POLYLINE'){
      let lyr='A-AREA',flags=0;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        if(pairs[i].c===8) lyr=pairs[i].v;
        if(pairs[i].c===70) flags=parseInt(pairs[i].v,10);
        i++;
      }
      const verts=[];
      while(i<pairs.length&&pairs[i].c===0&&pairs[i].v==='VERTEX'){
        let vx=0,vy=0;i++;
        while(i<pairs.length&&pairs[i].c!==0){
          if(pairs[i].c===10) vx=Math.round(parseFloat(pairs[i].v));
          if(pairs[i].c===20) vy=Math.round(-parseFloat(pairs[i].v));
          i++;
        }
        verts.push({x:vx,y:vy});
      }
      if(verts.length>=3&&(flags&1)){
        // 레이어명에서 공간 타입 추론 (A-AREA-BATH-01 → BATHROOM)
        const typeEntry=Object.entries(SPACE_TYPES).find(([,sp])=>lyr.includes(sp.code));
        const spType=typeEntry?typeEntry[0]:'LIVING';
        const cnt=(STATE.spaces.filter(s=>s.type===spType).length)+1;
        const sp=SPACE_TYPES[spType];
        const dm=defaultMaterials(spType);
        STATE.spaces.push({
          id:makeId('s'),type:spType,polygon:verts,typeIndex:cnt,
          code:sp.code,layerName:'A-AREA-'+sp.code+'-'+String(cnt).padStart(2,'0'),
          name:'',ceilingHeight:sp.ceil||STATE.ceilingHeight,
          waterproofRecommended:sp.waterproof?'CONDITIONAL':false,
          floorMaterial:dm.floor,color:sp.color,
        });
        newSpaces++;
      }
    } else if(c===0&&v==='LWPOLYLINE'){
      // v5.9: AutoCAD 2000+ LWPOLYLINE — 벡터 좌표가 같은 entity 내에 (10/20) 반복
      let lyr='A-AREA',flags=0;
      const lwVerts=[];
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===70) flags=parseInt(p.v,10);
        if(p.c===10){
          const xv=Math.round(parseFloat(p.v));
          // 다음 pair가 c=20 이면 그 y값과 페어링
          if(i+1<pairs.length&&pairs[i+1].c===20){
            const yv=Math.round(-parseFloat(pairs[i+1].v));
            lwVerts.push({x:xv,y:yv});
            i++;
          }
        }
        i++;
      }
      if(lwVerts.length>=2){
        const closed=(flags&1)===1;
        if(closed&&lwVerts.length>=3){
          // 닫힌 polyline → 공간
          const typeEntry=Object.entries(SPACE_TYPES).find(([,sp])=>lyr.includes(sp.code));
          const spType=typeEntry?typeEntry[0]:'LIVING';
          const cnt=(STATE.spaces.filter(s=>s.type===spType).length)+1;
          const sp=SPACE_TYPES[spType];
          const dm=defaultMaterials(spType);
          STATE.spaces.push({
            id:makeId('s'),type:spType,polygon:lwVerts,typeIndex:cnt,
            code:sp.code,layerName:'A-AREA-'+sp.code+'-'+String(cnt).padStart(2,'0'),
            name:'',ceilingHeight:sp.ceil||STATE.ceilingHeight,
            waterproofRecommended:sp.waterproof?'CONDITIONAL':false,
            floorMaterial:dm.floor,color:sp.color,
          });
          newSpaces++;
        }else{
          // 열린 polyline → 연속된 벽 segments
          for(let k=0;k+1<lwVerts.length;k++){
            const a=lwVerts[k], b=lwVerts[k+1];
            if(Math.hypot(b.x-a.x,b.y-a.y)>=50){
              const dv1=ensureVertex(a.x,a.y),dv2=ensureVertex(b.x,b.y);
              STATE.walls.push(makeWallVEF(dv1.id,dv2.id,{thickness:STATE.wallThickness,layerName:lyr}));
              newWalls++;
            }
          }
        }
      }
    } else if(c===0&&v==='CIRCLE'){
      let lyr='A-CIRC',cx=0,cy=0,r=0;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===10) cx=Math.round(parseFloat(p.v));
        if(p.c===20) cy=Math.round(-parseFloat(p.v));
        if(p.c===40) r=Math.round(parseFloat(p.v));
        i++;
      }
      if(r>=10){
        STATE.circles.push({id:makeId('cir'),x:cx,y:cy,radius_mm:r,layerName:lyr,spaceId:null});
        newCircles++;
      }
    } else if(c===0&&v==='ARC'){
      let lyr='A-ARC',cx=0,cy=0,r=0,sa=0,ea=90;
      i++;
      while(i<pairs.length&&pairs[i].c!==0){
        const p=pairs[i];
        if(p.c===8) lyr=p.v;
        if(p.c===10) cx=Math.round(parseFloat(p.v));
        if(p.c===20) cy=Math.round(-parseFloat(p.v));
        if(p.c===40) r=Math.round(parseFloat(p.v));
        if(p.c===50) sa=parseFloat(p.v); // 시작각 (°)
        if(p.c===51) ea=parseFloat(p.v); // 끝각 (°)
        i++;
      }
      if(r>=10){
        STATE.arcs.push({id:makeId('arc'),x:cx,y:cy,radius_mm:r,startAngle:-ea,endAngle:-sa,layerName:lyr,spaceId:null});
        newArcs++;
      }
    } else { i++; }
  }
  STATE.videoSequenceOrder=null; // 공간 변경 시 자동 순서 초기화
  saveHistory();renderAll();refreshUI();
  const parts=['벽 '+newWalls+'개','공간 '+newSpaces+'개'];
  if(newCircles) parts.push('원 '+newCircles+'개');
  if(newArcs) parts.push('아크 '+newArcs+'개');
  showStatus('DXF 가져오기 완료 — '+parts.join(' · '));
}

function downloadDataURL(dataURL,filename){
  const a=document.createElement('a');a.href=dataURL;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
}
function downloadText(text,filename,mime){
  const blob=new Blob([text],{type:mime||'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// ===== 클립보드 =====
function copyToClipboard(text){
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>showStatus('복사됨')).catch(()=>fallbackCopy(text));
  }else fallbackCopy(text);
}
function fallbackCopy(text){
  const ta=document.createElement('textarea');
  ta.name='clipboard-fallback';ta.value=text;ta.style.position='fixed';ta.style.opacity='0';ta.style.left='-9999px';
  document.body.appendChild(ta);
  ta.select();ta.setSelectionRange(0,99999);
  let ok=false;try{ok=document.execCommand('copy');}catch(e){}
  document.body.removeChild(ta);
  showStatus(ok?'복사됨':'복사 실패');
}

// ===== 상태 =====
let statusTimer=null;
function showStatus(msg){
  const el=document.getElementById('canvas-status');
  el.textContent=msg;el.classList.remove('hidden');
  clearTimeout(statusTimer);
  statusTimer=setTimeout(()=>el.classList.add('hidden'),1800);
}

// ===== 탭 =====
document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
  const tab=b.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('active',x.dataset.tabContent===tab));
  /* PERF: 지연 갱신된 탭은 열 때 재구성 */
  if(tab==='json'&&_jsonDirty)refreshJSONNow(); // 2026-08-27: 탭 전환은 즉시
  if(tab==='estimate'&&_estimateDirty)refreshEstimate();
}));

// ===== 테마 (v5.9 Cyber dual: lime / architect) =====
function applyTheme(t){
  const theme=(t==='architect')?'architect':'lime';
  document.body.setAttribute('data-theme',theme);
  try{localStorage.setItem('minicad.theme',theme);}catch(_){}
  const btn=document.getElementById('btn-theme');
  if(btn){
    btn.textContent=theme==='lime'?'🌙':'☀';
    btn.title='테마: '+(theme==='lime'?'Lime (다크) — 클릭하여 Architect로':'Architect (라이트) — 클릭하여 Lime로');
  }
  // v5.9: 테마 변경 시 캔버스 그리드/벽 재렌더 (테마별 색상 반영)
  if(typeof drawGrid==='function'&&typeof bgLayer!=='undefined') drawGrid();
  if(typeof renderAll==='function'&&typeof groups!=='undefined'&&groups&&groups.walls) renderAll();
}
function toggleTheme(){
  const cur=document.body.getAttribute('data-theme')||'lime';
  applyTheme(cur==='lime'?'architect':'lime');
  if(typeof cmdToast==='function') cmdToast('테마: '+(document.body.getAttribute('data-theme')==='lime'?'Lime (다크)':'Architect (라이트)'));
}
(function _initTheme(){
  let saved='lime';
  try{saved=localStorage.getItem('minicad.theme')||'lime';}catch(_){}
  applyTheme(saved);
})();
document.getElementById('btn-theme').addEventListener('click',toggleTheme);

// ===== 버튼 =====
document.getElementById('btn-undo').addEventListener('click',undo);
document.getElementById('btn-redo').addEventListener('click',redo);
document.getElementById('btn-grid').addEventListener('click',toggleGrid);
document.getElementById('btn-dim').addEventListener('click',toggleDim);
document.getElementById('btn-circuits').addEventListener('click',toggleCircuits); // 2026-08-27
(function(){const b=document.getElementById('btn-symlabel');if(b)b.addEventListener('click',cycleSymbolLabelMode);})(); // 2026-08-28
(function(){const b=document.getElementById('btn-printframe');if(b)b.addEventListener('click',()=>togglePrintFrame());})(); // 2026-08-28
(function(){const b=document.getElementById('btn-elev');if(b)b.addEventListener('click',()=>openElevationDialog());})(); // 2026-08-30
document.getElementById('btn-2_5d').addEventListener('click',toggle2_5D); // v5.7
document.getElementById('btn-ai-bundle').addEventListener('click',exportAIBundle); // v5.7
// v5.9.2: 통합견적 OS 브리지 — estimate 프로파일 JSON을 localStorage로 전송.
// 같은 브라우저에서 ECOREAN_통합견적OS_v17.html이 부팅/포커스 시 자동 감지해 견적을 완성한다.
function sendToEstimateOS(silent){
  // estimate 프로파일은 배치 객체(lights/electric/fixtures)까지 제거하므로 브리지는 자체 경량화:
  // 작도 보조·AI 메타만 제거하고 배치 객체는 유지 (견적OS 전기/설비/가구 매핑에 필요)
  const j=buildJSON();
  ['texts','measures','circles','arcs','curves','leaders','xlines','autoDetectedCycles','indices','relationships','vertices'].forEach(k=>delete j[k]);
  if(j.meta){delete j.meta.aiPromptHints;delete j.meta.videoSequence;delete j.meta.ssotPipeline;}
  j.profile='bridge';
  // 도면 스냅샷 PNG — 헌법: export 시 2.5D 강제 OFF (견적서 첨부용)
  let png=null;
  try{
    // 2026-08-25: 아티팩트 생성기·견적서 첨부용 — 라이트(도면) 테마로 캡처 후 원복 (printPlan과 동일 패턴)
    const wasPlus2D=STATE.plus2D;
    const wasTheme=document.body.getAttribute('data-theme');
    const isAlreadyLight=wasTheme==='architect';
    if(wasPlus2D){STATE.plus2D=false;}
    if(!isAlreadyLight) document.body.setAttribute('data-theme','architect');
    renderAll();
    png=stage.toDataURL({pixelRatio:1.5,mimeType:'image/png'});
    if(wasPlus2D){STATE.plus2D=true;}
    if(!isAlreadyLight){
      if(wasTheme) document.body.setAttribute('data-theme',wasTheme);
      else document.body.removeAttribute('data-theme');
    }
    renderAll();
  }catch(e){console.warn('[브리지] PNG 캡처 실패 — 도면 없이 전송',e);}
  const payload={sentAt:new Date().toISOString(),from:'MiniCAD v5.9',plan:j,png};
  try{
    localStorage.setItem('ecorean_bridge_plan_v1',JSON.stringify(payload));
  }catch(e){
    // localStorage 용량 초과(대형 도면 PNG) → PNG 없이 재시도
    payload.png=null;
    localStorage.setItem('ecorean_bridge_plan_v1',JSON.stringify(payload));
  }
  // v5.9.3: Supabase 클라우드 브리지 (기기 간 공유) — 실패해도 로컬 브리지에는 영향 없음
  if(typeof uploadPlanToCloud==='function') uploadPlanToCloud(payload,silent);
  if(silent)return; // 테스트 러너용 — 탭 열기/토스트 생략
  showStatus('📊 견적OS로 전송됨 — 통합견적 OS가 자동 감지합니다');
  cmdToast('견적OS 전송 완료 (공간 '+STATE.spaces.length+'개)');
  // 통합견적 OS 자동 열기 — 배포 환경별 분기
  //  file://            : 폴더 배치 기준 상대경로 (localStorage 브리지 자동 감지)
  //  ecorean.net 업무시스템: 같은 오리진 /estimate/ (localStorage 브리지 자동 감지)
  //  단독 웹(vercel.app) : ecorean-estimate.vercel.app (☁ 클라우드 목록으로 수신)
  try{
    const target=location.protocol==='file:'
      ?'../../전문가용/ECOREAN_통합견적OS_v17.html'
      :(location.hostname.indexOf('ecorean.net')>=0?'/estimate/':'https://ecorean-estimate.vercel.app');
    window.open(target,'ecorean_estimate_os');
  }catch(e){}
}
// v5.9.3: Supabase 클라우드 브리지 — 기기 간 도면 공유 (테이블: minicad_bridge_plans, anon 정책)
// 로컬(localStorage) 브리지가 1차 경로, 클라우드는 부가 경로 — 실패해도 로컬 흐름 무영향
const BRIDGE_SUPA_URL='https://gdcfqbdgubgpzusbtftf.supabase.co';
const BRIDGE_SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkY2ZxYmRndWJncHp1c2J0ZnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODYzNjUsImV4cCI6MjA5Nzk2MjM2NX0.-AnRCk6rYwYCgQk-N82zmeBjpeuAnupHLtVZy6OUHrI';
function uploadPlanToCloud(payload,silent){
  if(silent)return; // 테스트 러너 — 네트워크 접근 금지
  var sum={
    area_m2:(payload.plan.estimateInput&&payload.plan.estimateInput.summary&&payload.plan.estimateInput.summary.totalFloorArea_m2)||0,
    spaces:(payload.plan.spaces||[]).length,
    doors:(payload.plan.openings||[]).filter(function(o){return o.type==='DOOR';}).length,
    windows:(payload.plan.openings||[]).filter(function(o){return o.type==='WINDOW';}).length,
  };
  fetch(BRIDGE_SUPA_URL+'/rest/v1/minicad_bridge_plans',{
    method:'POST',
    headers:{apikey:BRIDGE_SUPA_KEY,Authorization:'Bearer '+BRIDGE_SUPA_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},
    body:JSON.stringify({title:STATE.projectName||'무제 도면',plan:payload.plan,png:payload.png,summary:sum}),
  }).then(function(r){
    if(r.ok) showStatus('☁ 클라우드 업로드 완료 — 다른 기기의 견적OS에서도 가져올 수 있습니다');
    else showStatus('☁ 클라우드 업로드 실패('+r.status+') — 로컬 브리지는 정상 전송됨');
  }).catch(function(){
    showStatus('☁ 클라우드 업로드 실패(오프라인?) — 로컬 브리지는 정상 전송됨');
  });
}
document.getElementById('btn-send-estimate').addEventListener('click',()=>sendToEstimateOS());
// 2026-08-28: [인쇄] = 설정·미리보기 창. Shift+클릭은 직전 설정으로 바로 인쇄
document.getElementById('btn-print').addEventListener('click',e=>{
  if(e&&e.shiftKey) printPlan(); else openPrintDialog();
});
// v5.8 Task 3: DXF
document.getElementById('btn-dxf-export').addEventListener('click',exportDXF);
document.getElementById('btn-dxf-import').addEventListener('click',()=>document.getElementById('dxf-file-input').click());
document.getElementById('dxf-file-input').addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  const reader=new FileReader();
  if(ext==='dxf'){
    reader.onload=ev=>importDXF(ev.target.result);
    reader.readAsText(file,'utf-8');
  } else if(ext==='dwg'){
    // 2026-08-19: libredwg WASM 직접 가져오기 (import-cad.js). 엔진 로드 실패 시에만 변환 안내
    if(typeof importDWGFile==='function') importDWGFile(file); else showDWGGuide(file.name);
  } else if(ext==='pdf'){
    // 2026-08-19: pdf.js — 밑그림(래스터) / 선 추출(벡터)
    if(typeof importPDFFile==='function') importPDFFile(file); else alert('PDF 가져오기 모듈이 로드되지 않았습니다 (import-cad.js)');
  } else if(ext==='svg'){
    reader.onload=ev=>importSVG(ev.target.result,file.name);
    reader.readAsText(file,'utf-8');
  } else if(['png','jpg','jpeg'].includes(ext)){
    reader.onload=ev=>setBgImage(ev.target.result,file.name);
    reader.readAsDataURL(file);
  } else {
    alert('지원되지 않는 파일 형식: .'+ext+'\n지원: DXF, DWG, PDF, SVG, PNG, JPG');
  }
  e.target.value='';
});

// v5.9: SVG 가져오기 — data URL로 변환 후 배경 이미지로 처리
function importSVG(svgText,filename){
  try{
    const dataURL='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svgText)));
    setBgImage(dataURL,filename||'imported.svg');
  }catch(err){
    alert('SVG 처리 실패: '+err.message);
  }
}

// v5.9: 배경 이미지 설정 (PNG/JPG/SVG 트레이싱용)
// 도면 JSON(meta.background)의 배경을 실제 치수로 배치한다.
//  · mm_per_px : 이미지 1px 이 몇 mm 인지 → bgImage.scale 로 환산 (mmToPx 와 같은 기준)
//  · crop      : 원본 이미지에서 평면도 그림이 시작하는 위치 → 벽 좌표 원점(0,0)에 맞춰 이미지를 밀어 놓는다
function applyPlanBackground(bgMeta,filename){
  if(!bgMeta||!bgMeta.url) return;
  fetch(bgMeta.url)
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.blob();})
    .then(b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b);}))
    .then(dataURL=>{
      const img=new Image();
      img.onload=()=>{
        const mmpp=Number(bgMeta.mm_per_px)||0;
        const crop=bgMeta.crop||{left:0,top:0};
        STATE.bgImage={
          filename:filename||'평면도 원본',
          dataURL,
          x_mm:mmpp?-Math.round((crop.left||0)*mmpp):0,
          y_mm:mmpp?-Math.round((crop.top||0)*mmpp):0,
          scale:mmpp?(mmpp/1000)*STATE.scale:1,
          opacity:bgMeta.opacity!=null?bgMeta.opacity:0.45,
          locked:true,
          naturalWidth:img.width,naturalHeight:img.height,
        };
        drawGrid();renderAll();
        if(typeof refreshBgImageUI==='function') refreshBgImageUI();
      };
      img.src=dataURL;
    })
    .catch(err=>showStatus('원본 도면 이미지 로드 실패: '+err.message));
}
function setBgImage(dataURL,filename){
  const img=new Image();
  img.onload=()=>{
    STATE.bgImage={
      filename:filename||'image',
      dataURL,
      x_mm:0,y_mm:0,
      scale:1,opacity:0.5,locked:false,
      naturalWidth:img.width,naturalHeight:img.height,
    };
    drawGrid();renderAll();
    refreshBgImageUI();
    showStatus('배경 이미지 추가 — '+filename+' ('+img.width+'×'+img.height+'px) — 투명도 50%');
  };
  img.onerror=()=>alert('이미지 로드 실패');
  img.src=dataURL;
}

// v5.9: DWG 변환 안내 모달
function showDWGGuide(filename){
  let modal=document.getElementById('dwg-guide-modal');
  if(modal){modal.classList.add('visible');return;}
  modal=document.createElement('div');
  modal.id='dwg-guide-modal';
  modal.className='sc-overlay visible';
  modal.innerHTML='<div class="sc-modal" style="max-width:560px">'+
    '<div class="sc-header"><div class="sc-title">⚠ DWG 직접 가져오기 미지원</div>'+
    '<button class="sc-close" id="dwg-guide-close">✕</button></div>'+
    '<div style="padding:18px 22px">'+
      (filename?'<p style="font-size:11px;color:var(--ink-3);margin-bottom:10px">선택 파일: '+filename+'</p>':'')+
      '<p style="color:var(--ink-2);font-size:12px;line-height:1.7;margin-bottom:14px">'+
        'DWG는 AutoCAD 바이너리 포맷입니다. 다음 중 한 방법으로 <strong style="color:var(--accent-1)">DXF로 변환</strong> 후 다시 가져와 주세요.'+
      '</p>'+
      '<div style="background:var(--surface-2);border:1px solid var(--stroke-1);border-radius:6px;padding:12px;margin-bottom:14px">'+
        '<div style="font-family:var(--font-mono);font-size:10px;color:var(--accent-1);letter-spacing:0.1em;margin-bottom:8px">변환 방법</div>'+
        '<ol style="color:var(--ink-2);font-size:11px;line-height:1.9;padding-left:20px;margin:0">'+
          '<li><strong>ODA File Converter (무료, 추천)</strong><br><span style="color:var(--ink-3);font-size:10px">opendesign.com/guestfiles/oda_file_converter</span></li>'+
          '<li><strong>온라인 변환</strong><br><span style="color:var(--ink-3);font-size:10px">cloudconvert.com / aconvert.com / convertio.co</span></li>'+
          '<li><strong>AutoCAD/BricsCAD/QCAD에서 직접 저장</strong><br><span style="color:var(--ink-3);font-size:10px">SAVEAS → AutoCAD R12 DXF 선택</span></li>'+
        '</ol>'+
      '</div>'+
      '<p style="color:var(--ink-3);font-size:10px;line-height:1.6;margin-bottom:0">'+
        '💡 <strong>팁</strong>: R12 ASCII DXF 포맷이 호환성 가장 높음. R2018+ DXF도 부분 지원 (LWPOLYLINE/ARC/CIRCLE).'+
      '</p>'+
    '</div></div>';
  document.body.appendChild(modal);
  document.getElementById('dwg-guide-close').addEventListener('click',()=>{
    modal.classList.remove('visible');
  });
  modal.addEventListener('click',e=>{
    if(e.target===modal) modal.classList.remove('visible');
  });
}

// v5.9: 배경 이미지 컨트롤 패널 새로고침
function refreshBgImageUI(){
  const panel=document.getElementById('bg-image-panel');
  if(!panel) return;
  if(!STATE.bgImage){panel.style.display='none';return;}
  panel.style.display='';
  const nameEl=document.getElementById('bg-image-name');
  if(nameEl) nameEl.textContent='📎 '+STATE.bgImage.filename+' ('+(STATE.bgImage.naturalWidth||0)+'×'+(STATE.bgImage.naturalHeight||0)+'px)';
  const opEl=document.getElementById('bg-opacity');
  if(opEl) opEl.value=Math.round((STATE.bgImage.opacity||0.5)*100);
  const scEl=document.getElementById('bg-scale');
  if(scEl) scEl.value=Math.round((STATE.bgImage.scale||1)*100);
  const lockBtn=document.getElementById('bg-lock');
  if(lockBtn) lockBtn.textContent=STATE.bgImage.locked?'🔒 잠김':'🔓 잠금해제';
}
// 배경 이미지 컨트롤 이벤트
const _bgOp=document.getElementById('bg-opacity');
if(_bgOp) _bgOp.addEventListener('input',e=>{
  if(!STATE.bgImage) return;
  STATE.bgImage.opacity=parseInt(e.target.value)/100;
  drawGrid();
});
const _bgSc=document.getElementById('bg-scale');
if(_bgSc) _bgSc.addEventListener('change',e=>{
  if(!STATE.bgImage) return;
  STATE.bgImage.scale=Math.max(0.01,Math.min(20,parseInt(e.target.value)/100));
  drawGrid();
});
const _bgLock=document.getElementById('bg-lock');
if(_bgLock) _bgLock.addEventListener('click',()=>{
  if(!STATE.bgImage) return;
  STATE.bgImage.locked=!STATE.bgImage.locked;
  drawGrid();refreshBgImageUI();
});
const _bgRm=document.getElementById('bg-remove');
if(_bgRm) _bgRm.addEventListener('click',()=>{
  if(!STATE.bgImage) return;
  if(!confirm('배경 이미지 제거?')) return;
  STATE.bgImage=null;
  drawGrid();refreshBgImageUI();
  showStatus('배경 이미지 제거됨');
});

// v5.9: 스케일 보정 모드 시작 (수동 — C안). _scaleCalActive는 tools.js의 같은 스크립트 lexical scope 변수.
const _bgScaleCal=document.getElementById('bg-scale-cal');
if(_bgScaleCal) _bgScaleCal.addEventListener('click',()=>{
  if(!STATE.bgImage){alert('배경 이미지를 먼저 가져오세요'); return;}
  _scaleCalActive=true;
  _scaleCalP1=null;
  showStatus('스케일 보정: 알려진 두 점의 첫 점 클릭 (Esc 취소)');
});

// v5.9: AI 자동 스케일 — Anthropic Claude Vision으로 도면 치수 OCR + 스케일 자동 산정
async function aiAutoScale(apiKey){
  if(!STATE.bgImage){alert('배경 이미지를 먼저 가져오세요'); return;}
  const dataURL=STATE.bgImage.dataURL;
  const m=dataURL.match(/^data:([^;]+);base64,(.+)$/);
  if(!m){alert('이미지 포맷 인식 실패'); return;}
  const mediaType=m[1];
  const base64Data=m[2];
  if(mediaType==='image/svg+xml'){
    alert('SVG는 AI 자동 스케일 미지원 (Claude Vision은 raster만 처리).\n📐 수동 스케일 보정을 사용해주세요.');
    return;
  }
  if(!['image/png','image/jpeg','image/gif','image/webp'].includes(mediaType)){
    alert('지원되지 않는 이미지 형식: '+mediaType);
    return;
  }
  showStatus('AI 자동 스케일: 도면 분석 중... (10~30초)');
  const prompt=`이 건축 도면에서 치수 텍스트(예: "3000", "2400mm", "5.5m", "3,000")와 그것이 측정하는 선분의 양 끝점 픽셀 좌표를 추출하세요.

응답은 다음 JSON 형식만 (마크다운 코드블록·다른 텍스트 모두 제외):
{
  "dimensions": [
    {"value_mm": 3000, "p1": [123, 456], "p2": [789, 456], "label": "3000mm"}
  ]
}

규칙:
- value_mm은 mm 단위 정수 (m 단위면 ×1000, 콤마 제거)
- p1, p2는 입력 이미지 픽셀 좌표 (좌상단 0,0 기준)
- 끝점은 치수선 양 끝 또는 측정 대상 벽의 양 끝
- 최소 3개, 최대 8개
- 명확한 것만 (애매하면 제외)
- 방 이름·가구명 등 다른 텍스트는 무시`;

  try{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key':apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body:JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1500,
        messages:[{
          role:'user',
          content:[
            {type:'image',source:{type:'base64',media_type:mediaType,data:base64Data}},
            {type:'text',text:prompt},
          ],
        }],
      }),
    });
    if(!resp.ok){
      const errText=await resp.text();
      throw new Error('API '+resp.status+': '+errText.substring(0,200));
    }
    const data=await resp.json();
    const text=data.content&&data.content[0]&&data.content[0].text;
    if(!text) throw new Error('AI 응답 비어있음');
    // JSON 추출 (마크다운 코드블록 처리 포함)
    const jsonMatch=text.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('JSON 형식 응답 없음. AI 응답: '+text.substring(0,200));
    const parsed=JSON.parse(jsonMatch[0]);
    const dims=parsed.dimensions||[];
    if(dims.length===0) throw new Error('치수가 도면에서 인식되지 않음');

    // 각 치수에서 pixel↔mm 비율 계산 (이미지 native px 기준)
    const ratios=[];
    dims.forEach(d=>{
      if(!Array.isArray(d.p1)||!Array.isArray(d.p2)||!d.value_mm) return;
      const pxDist=Math.hypot(d.p2[0]-d.p1[0],d.p2[1]-d.p1[1]);
      if(pxDist<1) return;
      const scale=mmToPx(d.value_mm)/pxDist/STATE.zoom; // 2026-08-19: 배경 스케일은 줌 100% 기준 (engine.js ensureBgImageNode 참조)
      ratios.push({scale,value_mm:d.value_mm,pxDist,label:d.label||(d.value_mm+'mm')});
    });
    if(ratios.length===0) throw new Error('유효한 치수가 없음 (좌표 누락)');

    // 중앙값 (이상치 제거)
    const scales=ratios.map(r=>r.scale).sort((a,b)=>a-b);
    const medianScale=scales[Math.floor(scales.length/2)];

    // 신뢰도 검증: 중앙값에서 ±15% 이상 벗어나는 비율 개수
    const tolerance=0.15;
    const consistent=ratios.filter(r=>Math.abs(r.scale-medianScale)/medianScale<tolerance).length;
    const reliability=Math.round(consistent/ratios.length*100);

    STATE.bgImage.scale=medianScale;
    drawGrid();refreshBgImageUI();

    const detail=ratios.map(r=>r.label+'='+Math.round(r.pxDist)+'px').join(' / ');
    showStatus('AI 스케일 완료 — '+ratios.length+'개 치수, 신뢰도 '+reliability+'%. '+detail);
    if(reliability<70){
      setTimeout(()=>{
        alert('AI 인식 신뢰도가 낮습니다 ('+reliability+'%). 결과 재확인 후 필요 시 📐 수동 보정으로 다시 맞춰주세요.');
      },300);
    }
  }catch(err){
    console.error('[AI 자동 스케일]',err);
    alert('AI 자동 스케일 실패\n\n'+err.message+'\n\n📐 수동 스케일 보정을 사용해주세요.');
    showStatus('AI 자동 스케일 실패');
  }
}

const _bgAiScale=document.getElementById('bg-ai-scale');
if(_bgAiScale){
  // 활성화: 항상 클릭 가능 (opacity 제거)
  _bgAiScale.style.opacity='1';
  // 우클릭 → API 키 초기화
  _bgAiScale.addEventListener('contextmenu',e=>{
    e.preventDefault();
    if(confirm('저장된 Anthropic API 키를 삭제할까요?')){
      try{localStorage.removeItem('minicad.anthropicKey');}catch(_){}
      showStatus('API 키 삭제됨');
    }
  });
  _bgAiScale.addEventListener('click',()=>{
    if(!STATE.bgImage){alert('배경 이미지를 먼저 가져오세요'); return;}
    let key=null;
    try{key=localStorage.getItem('minicad.anthropicKey');}catch(_){}
    if(!key){
      const k=prompt('Anthropic API 키 입력 (sk-ant-... 형식)\n\n도면 치수를 AI가 자동 OCR해서 스케일을 계산합니다.\n키는 브라우저 localStorage에만 저장됩니다.\n발급: https://console.anthropic.com\n\n비용: 도면당 약 $0.005~0.02 (Sonnet 4.6 사용)','');
      if(!k) return;
      if(!k.startsWith('sk-ant-')){alert('잘못된 키 형식 (sk-ant-...로 시작해야 함)'); return;}
      try{localStorage.setItem('minicad.anthropicKey',k);}catch(_){}
      key=k;
    }
    aiAutoScale(key);
  });
}
// v5.8 Task 4: 영상 동선 순서 초기화
const videoSeqResetBtn=document.getElementById('btn-video-seq-reset');
if(videoSeqResetBtn) videoSeqResetBtn.addEventListener('click',()=>{
  STATE.videoSequenceOrder=null;
  refreshVideoSeqUI();refreshJSON();
  showStatus('영상 동선 순서 — 자동(면적순)으로 초기화');
});

// v5.7: AI 프롬프트 힌트 편집 UI 바인딩
['ai-style','ai-mood','ai-light','ai-camera'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  // 초기값 동기화
  const key={'ai-style':'style','ai-mood':'mood','ai-light':'lighting','ai-camera':'cameraSuggestion'}[id];
  el.value=STATE.aiPromptHints[key];
  el.addEventListener('change',e=>{
    STATE.aiPromptHints[key]=e.target.value;
    refreshJSON();
    showStatus('AI 힌트 업데이트: '+key+'='+e.target.value);
  });
});
const palEl=document.getElementById('ai-palette');
if(palEl){
  palEl.value=STATE.aiPromptHints.materialPalette.join(', ');
  palEl.addEventListener('change',e=>{
    STATE.aiPromptHints.materialPalette=e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
    refreshJSON();
    showStatus('팔레트 업데이트: '+STATE.aiPromptHints.materialPalette.length+'종');
  });
}
const sideAIBtn=document.getElementById('btn-ai-bundle-side');
if(sideAIBtn) sideAIBtn.addEventListener('click',exportAIBundle);
document.getElementById('btn-save').addEventListener('click',saveJSON);
document.getElementById('btn-load').addEventListener('click',loadJSON);
// v5.9+ 서버 저장/불러오기 (공용 클라우드)
(function(){
  const cs=document.getElementById('btn-cloud-save');if(cs)cs.addEventListener('click',cloudSaveDrawing);
  const cl=document.getElementById('btn-cloud-list');if(cl)cl.addEventListener('click',cloudShowList);
})();
document.getElementById('btn-clear-all').addEventListener('click',()=>{
  if(STATE.spaces.length===0&&STATE.walls.length===0) return;
  if(!confirm('모든 객체를 삭제할까요?')) return;
  STATE.spaces=[];STATE.walls=[];STATE.openings=[];
  STATE.furniture=[];STATE.fixtures=[];STATE.lights=[];STATE.electric=[];
  STATE.texts=[];STATE.measures=[];STATE.estimateConfig={};
  STATE.xlines=[]; // v5.9: 무한 안내선도 함께 삭제
  STATE.selectedKind=null;STATE.selectedId=null;
  saveHistory();renderAll();refreshUI();showStatus('전체 삭제');
});
document.getElementById('btn-export').addEventListener('click',()=>{
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab==='estimate'));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('active',x.dataset.tabContent==='estimate'));
  if(_estimateDirty)refreshEstimate(); /* PERF: 지연 갱신 반영 */
});
document.getElementById('btn-copy-json').addEventListener('click',()=>{
  const _prof=document.getElementById('json-profile'); // v5.9: 선택된 프로파일 그대로 복사
  copyToClipboard(JSON.stringify(buildJSONProfile(_prof?_prof.value:'full'),null,2));
});
document.getElementById('json-profile')?.addEventListener('change',()=>refreshJSON()); // v5.9
// 2026-08-22: 대표 지시 1번 — 태블릿에서 click 이 씹혀 모달이 안 닫히던 문제.
//  click + pointerup(터치·펜) 이중 바인딩, 350ms 중복 제거로 두 이벤트가 다 와도 한 번만 실행.
function _tapBind(el,fn){
  if(!el) return;
  let last=0;
  const h=e=>{const n=performance.now();if(n-last<350)return;last=n;fn(e);};
  el.addEventListener('click',h);
  el.addEventListener('pointerup',e=>{if(e.pointerType&&e.pointerType!=='mouse')h(e);});
}
_tapBind(document.getElementById('btn-help'),()=>{
  document.getElementById('canvas-help').classList.toggle('visible');
});
_tapBind(document.getElementById('shortcut-close'),()=>{
  document.getElementById('canvas-help').classList.remove('visible');
});
_tapBind(document.getElementById('canvas-help'),e=>{
  if(e.target===document.getElementById('canvas-help')) e.target.classList.remove('visible');
});
// 2026-08-22: alert() 대체 텍스트 모달 — 태블릿(전체화면/DeX)에서 alert 가 막히거나 재출현하던 문제 회피
function _showTextModal(title,text){
  let ov=document.getElementById('text-modal-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='text-modal-overlay';
    ov.style.cssText='display:none;position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,0.75);align-items:center;justify-content:center;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';
    ov.innerHTML='<div style="max-width:560px;width:92%;max-height:82vh;display:flex;flex-direction:column;background:#14151F;border:1px solid #3D4466;border-radius:12px;overflow:hidden">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 8px 10px 16px;border-bottom:1px solid #2D3050"><b id="text-modal-title" style="font-size:14px;color:#F5F1EB"></b>'
      +'<button type="button" id="text-modal-close" style="min-width:44px;min-height:44px;background:none;border:none;color:#9CA3AF;font-size:18px;cursor:pointer">✕</button></div>'
      +'<pre id="text-modal-body" style="margin:0;padding:14px 18px;overflow:auto;white-space:pre-wrap;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;line-height:1.55;color:#D8D4C8"></pre></div>';
    document.body.appendChild(ov);
    const close=()=>{ov.style.display='none';};
    _tapBind(document.getElementById('text-modal-close'),close);
    _tapBind(ov,e=>{if(e.target===ov)close();});
  }
  document.getElementById('text-modal-title').textContent=title;
  document.getElementById('text-modal-body').textContent=text;
  ov.style.display='flex';
}
function hideTextModal(){const ov=document.getElementById('text-modal-overlay');if(ov)ov.style.display='none';}
document.getElementById('snap-unit').addEventListener('change',e=>{STATE.gridSize=parseInt(e.target.value);drawGrid();showStatus('스냅 거리: '+e.target.value+'mm');
  if(typeof saveSnapPrefs==='function') saveSnapPrefs();
  if(typeof refreshSnapStatus==='function') refreshSnapStatus();});
document.getElementById('ceiling-height').addEventListener('change',e=>{const v=_numField(e,1000);if(v==null){e.target.value=STATE.ceilingHeight;return;}STATE.ceilingHeight=v;refreshUI();});
document.getElementById('wall-thickness').addEventListener('change',e=>{
  const v=parseInt(e.target.value);STATE.wallThickness=v;
  document.getElementById('wall-thickness-input').value=v;
  showStatus('벽체 두께: '+v+'mm');
});
document.getElementById('wall-thickness-input').addEventListener('change',e=>{
  const v=Math.max(10,Math.min(1000,parseInt(e.target.value)||100));
  STATE.wallThickness=v;e.target.value=v;
  // select를 일치하는 옵션으로 맞추거나 없으면 첫 옵션 유지
  const sel=document.getElementById('wall-thickness');
  const match=[...sel.options].find(o=>parseInt(o.value)===v);
  if(match) sel.value=v; else sel.selectedIndex=0;
  showStatus('벽체 두께: '+v+'mm');
});
document.getElementById('project-name').addEventListener('change',e=>{STATE.projectName=e.target.value;});

// v5.9: 내력벽 두께 — 드롭다운 + 직접입력 (벽체 두께와 동일 패턴)
const _bearTSel=document.getElementById('bearing-thickness-select');
const _bearT=document.getElementById('bearing-thickness');
if(_bearTSel){
  _bearTSel.addEventListener('change',e=>{
    const v=parseInt(e.target.value);
    STATE.bearingWallThickness=v;
    if(_bearT) _bearT.value=v;
    renderAll();showStatus('내력벽 두께: '+v+'mm');
  });
}
if(_bearT){
  _bearT.addEventListener('change',e=>{
    const v=Math.max(50,Math.min(800,parseInt(e.target.value)||200));
    STATE.bearingWallThickness=v;e.target.value=v;
    // 드롭다운 동기화 — 일치 옵션 있으면 선택, 없으면 첫 옵션 유지
    if(_bearTSel){
      const match=[...(_bearTSel.options)].find(o=>parseInt(o.value)===v);
      if(match) _bearTSel.value=v;
    }
    renderAll();showStatus('내력벽 두께: '+v+'mm');
  });
}

// v5.9: 기둥 도구 설정 패널 — 형태/너비/높이/L팔두께/회전을 STATE.pillarDefaults에 동기화
['pillar-shape','pillar-w','pillar-h','pillar-t','pillar-rot'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('change',()=>{
    const def=STATE.pillarDefaults||(STATE.pillarDefaults={shape:'rect',width:500,height:500,thickness:200,rotation:0});
    if(id==='pillar-shape') def.shape=el.value;
    else if(id==='pillar-w') def.width=Math.max(50,Math.min(5000,parseInt(el.value)||500));
    else if(id==='pillar-h') def.height=Math.max(50,Math.min(5000,parseInt(el.value)||500));
    else if(id==='pillar-t') def.thickness=Math.max(30,Math.min(800,parseInt(el.value)||200));
    else if(id==='pillar-rot') def.rotation=parseFloat(el.value)||0;
    showStatus('기둥 설정 — '+def.shape+' '+def.width+(def.shape==='rect'||def.shape==='L'?'×'+def.height:'')+'mm @ '+def.rotation+'°');
  });
  el.addEventListener('input',()=>el.dispatchEvent(new Event('change')));
});

// v5.9: 벽 정렬 토글 (프로젝트 패널 + FAB 동기화)
const ALIGN_LABELS={interior:'내벽',center:'중심',exterior:'외벽'};
function setWallAlignment(a,opts={}){
  if(!['interior','center','exterior'].includes(a)) a='interior';
  STATE.wallAlignment=a;
  document.querySelectorAll('#align-toggle .align-btn').forEach(b=>b.classList.toggle('active',b.dataset.align===a));
  const fab=document.getElementById('align-fab');
  if(fab){fab.textContent='정렬: '+ALIGN_LABELS[a];fab.classList.toggle('active',a!=='center');}
  // initKonva 전에 호출되면 renderAll이 groups 미정의로 터지므로 가드
  if(typeof groups!=='undefined'&&groups&&groups.walls){
    renderAll();
  }
  if(!opts.silent&&typeof showStatus==='function'){showStatus('벽 정렬: '+ALIGN_LABELS[a]);}
}
document.querySelectorAll('#align-toggle .align-btn').forEach(b=>{
  b.addEventListener('click',()=>setWallAlignment(b.dataset.align));
});
const _alignFab=document.getElementById('align-fab');
if(_alignFab){
  _alignFab.addEventListener('click',()=>{
    const order=['interior','center','exterior'];
    const cur=STATE.wallAlignment||'interior';
    const next=order[(order.indexOf(cur)+1)%order.length];
    setWallAlignment(next);
  });
}
// 초기 정렬 상태 반영 — UI 버튼 클래스만 업데이트, 렌더링은 initUI에서
setWallAlignment(STATE.wallAlignment||'interior',{silent:true});
document.getElementById('zoom-in').addEventListener('click',()=>zoomBy(1.2));
document.getElementById('zoom-out').addEventListener('click',()=>zoomBy(0.8));
document.getElementById('zoom-fit').addEventListener('click',zoomFit);

// ===== Boolean 메뉴 이벤트 초기화 =====
(function initBoolMenu(){
  const menu=document.getElementById('bool-menu');
  if(!menu) return;
  // 버튼 클릭
  menu.querySelectorAll('.bool-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();applyBoolOp(btn.dataset.op);});
  });
  // 외부 클릭 시 닫기 (pointerdown: 마우스·터치·펜 공용)
  document.addEventListener('pointerdown',e=>{
    if(menu.style.display!=='none'&&!menu.contains(e.target)) hideBoolMenu();
  });
})();

// ===== 리사이즈 =====
function handleResize(){const sz=getContainerSize();stage.size(sz);drawGrid();renderAll();}
window.addEventListener('resize',handleResize);

// ===== AutoCAD 스타일 명령어 시스템 =====
const CMD_HINTS={
  select:'선택(V): 클릭=단일 / 드래그=박스(좌→우 Window/우→좌 Crossing) / Del=일괄삭제',
  rect:'사각공간(R): 클릭 → 폭 → 높이 / 또는 드래그',
  polygon:'다각공간(P): 꼭짓점 수 입력 → 중심 클릭 → 반지름(mm) 입력',
  circlespace:'원형공간(G): 중심 클릭 → 반지름(mm) Enter / 또는 드래그',
  wall:'벽(B): 클릭+클릭 또는 클릭→길이 입력 (두께 100mm)',
  line:'선(L): 클릭+클릭 또는 클릭→길이 입력 / 공간 내부 → 공간 분할',
  door:'문(D): 공간/벽 가까이 클릭 → 자동 각도 정렬',
  window:'창(W): 공간/벽 가까이 클릭 → 자동 각도 정렬',
  furniture:'1 가구: 라이브러리 선택 → 클릭',
  fixture:'2 위생/주방: 라이브러리 선택 → 클릭',
  light:'3 조명: 라이브러리 선택 → 클릭',
  electric:'4 전기: 라이브러리 선택 → 클릭',
  hvac:'5 공조/소방: 라이브러리 선택 → 클릭',
  text:'텍스트(T): 위치 클릭 → 텍스트 입력 Enter',
  measure:'줄자(M): 첫 점 클릭 → 거리 또는 두 번째 점 클릭',
  dimwall:'벽치수(I): 벽 클릭 → 양 끝점 기준 자동 치수선 생성',
  pan:'화면이동(H): 마우스 드래그 또는 휠클릭 드래그',
  circle:'원(C): 클릭 → 반지름(mm) Enter / 또는 드래그',
  arc:'아크(A): 클릭 → 반지름 → 시작각° → 끝각°',
  trim:'트림(tr): 자를 선분 클릭 — 다른 선분과 교차 부분 제거',
  break:'분할(br): 선분 클릭한 위치에서 둘로 분할',
  eraser:'지우개(E): 지울 객체 클릭 — 벽/공간/문/가구 등 모든 객체 삭제',
  offset:'옵셋(O): 거리 입력 → 객체 클릭 → 방향 클릭',
  mirror:'미러(mi): 객체 선택 후 → 기준선 1점 → 2점 → 대칭 복제',
  leader:'지시선(le): 화살표 끝점 클릭 → 꺾임점 클릭 → 더블클릭/Enter로 텍스트 입력',
};

function toggleSection(el){el.parentElement.classList.toggle('collapsed');}
function cmdToast(msg){
  const el=document.getElementById('cmd-toast');
  el.textContent=msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer=setTimeout(()=>el.classList.add('hidden'),2200);
}

// ===== v5.1 단계별 프롬프트 모드 =====
function enterCmdMode(mode,data,promptLabel,hintText){
  STATE.cmdMode=mode;
  STATE.cmdData=data||{};
  document.getElementById('cmd-prompt').textContent=promptLabel||'▶';
  document.getElementById('cmd-prompt').style.color='#E2725B'; // 주황: 입력 대기 강조
  if(hintText) document.getElementById('cmd-hint').textContent=hintText;
  const inp=document.getElementById('cmd-input');
  inp.value='';
  inp.focus();
  inp.placeholder=hintText||'';
  // 단축키 문자(o, x 등)가 포커스 직후 입력창에 삽입되는 것 방지
  setTimeout(()=>{inp.value='';},0);
}
function exitCmdMode(){
  STATE.cmdMode=null;
  STATE.cmdData={};
  document.getElementById('cmd-prompt').textContent='▶';
  document.getElementById('cmd-prompt').style.color='';
  const tool=STATE.selectedTool;
  document.getElementById('cmd-hint').textContent=CMD_HINTS[tool]||'명령어 입력';
  document.getElementById('cmd-input').placeholder='명령어 — 도구 선택 후 캔버스 클릭하면 단계별 입력 / @W,H / r 90 / del / ?';
}

function doEnterAction(){
  const inp=document.getElementById('cmd-input');
  if(document.activeElement===inp){
    const cmd=inp.value;
    if(cmd.trim()){
      processCommand(cmd);
      inp.value='';
      // v5.9: 다음 단계 cmdMode가 활성이면 (예: rect-w → rect-h) 포커스 유지
      if(STATE.cmdMode){inp.focus();}
      else{inp.blur();}
    }
    else{inp.blur();}
  }else{
    inp.focus();
  }
}

function processCommand(rawCmd){
  const c=rawCmd.trim();
  if(!c) return;
  // 히스토리
  STATE.cmdHistory.unshift(c);
  if(STATE.cmdHistory.length>50) STATE.cmdHistory.pop();
  STATE.cmdHistoryIdx=-1;

  // v5.1 단계별 프롬프트 모드 우선 처리
  if(STATE.cmdMode){
    if(handleCmdModeInput(c)) return;
  }

  // 도움말
  if(c==='/'||c==='?'||c.toLowerCase()==='help'){showCmdHelp();return;}

  // v5.2: 직교 명령어
  if(/^ortho(\s+(on|off))?$/i.test(c)){
    const mm=c.match(/^ortho(\s+(on|off))?$/i);
    if(mm&&mm[2]){STATE.snap.ortho=mm[2].toLowerCase()==='on';}
    else{STATE.snap.ortho=!STATE.snap.ortho;}
    cmdToast('직교 (Ortho) '+(STATE.snap.ortho?'ON':'OFF'));
    updateOrthoFAB();
    const cb=document.querySelector('input[data-snap="ortho"]');
    if(cb) cb.checked=STATE.snap.ortho;
    return;
  }
  // v5.3: 트림 / 브레이크 도구 진입
  if(/^(tr|trim)$/i.test(c)){setTool('trim');cmdToast('트림 모드 — 자를 부분 클릭');return;}
  if(/^(br|break)$/i.test(c)){setTool('break');cmdToast('분할 모드 — 분할할 위치 클릭');return;}
  // v5.3: 원·아크 명령어
  if(/^(circle|cir)$/i.test(c)){setTool('circle');return;}
  if(/^(arc|ar)$/i.test(c)){setTool('arc');return;}
  // v5.4: 치수 명령어
  if(/^(di|dim|dimwall)$/i.test(c)){setTool('dimwall');cmdToast('치수 모드 — 벽 클릭');return;}
  // v5.6: 옵셋·미러·선 명령어
  if(/^(o|of|offset)$/i.test(c)){setTool('offset');return;}
  if(/^(mi|mirror)$/i.test(c)){startMirror();return;}
  if(/^(le|leader)$/i.test(c)){setTool('leader');cmdToast('지시선 — 화살표 끝점 클릭, 더블클릭으로 텍스트 입력');return;}
  if(/^(l|line)$/i.test(c)){setTool('line');return;}
  if(/^(b|wall|벽)$/i.test(c)){setTool('wall');return;}

  // 2026-08-24 v6.0 명령어
  if(/^(da|dimall)$/i.test(c)){dimAllSpaces();return;}
  if(/^(af|autofurnish|자동배치)$/i.test(c)){autoFurnish();return;}
  if(/^(k|palette|팔레트)$/i.test(c)){openCmdPalette();return;}
  // 2026-08-27: 'cir' 은 원(circle) 도구 단축키와 충돌해 도달하지 못했다 → wire/배선/회로 로 변경
  if(/^(wire|배선|회로)$/i.test(c)){toggleCircuits();return;}
  if(/^(pf|인쇄영역)$/i.test(c)){togglePrintFrame();return;} // 2026-08-28
  if(/^(el|elev|입면|입면도)$/i.test(c)){openElevationDialog();return;} // 2026-08-30
  if(/^(sc|section|절단|절단선)$/i.test(c)){setTool('section');return;} // 2026-08-30
  // 2026-08-29: 고른 조명들을 한 번에 — link=스위치에, chain=서로 점핑
  if(/^(link|연결)$/i.test(c)){startCircuitAttach();return;}
  if(/^(chain|점핑)$/i.test(c)){chainSelectedLights();return;}
  if(/^(unlink|연결해제)$/i.test(c)){detachSelectedLights();return;}
  if(/^(unchain|점핑해제)$/i.test(c)){unchainSelectedLights();return;}
  // 2026-08-29: 겹친 조명 — dup 은 찾기, 'dup fix' 는 전부 정리
  const dupM=c.match(/^(?:dup|중복)(?:\s+(fix|정리))?$/i);
  if(dupM){ if(dupM[1]) cleanDuplicateLights(); else reportDuplicateLights(); return; }
  // 2026-08-28: 인쇄 — 기본은 설정창, 'print now' 는 바로, 'print area' 는 영역 지정
  const prM=c.match(/^(?:print|인쇄|prn)(?:\s+(now|area|frame|바로|영역|틀|화면))?$/i);
  if(prM){
    const v=(prM[1]||'').toLowerCase();
    if(v==='now'||v==='바로') printPlan();
    else if(v==='area'||v==='영역') startPrintRegionPick();
    else if(v==='frame'||v==='틀'||v==='화면') togglePrintFrame();
    else openPrintDialog();
    return;
  }
  // 2026-08-28: 기호 이름 라벨 — lab 은 순환, 'lab off/smart/all' 은 직접 지정
  const labM=c.match(/^(?:lab|label|라벨)(?:\s+(smart|off|all|묶음|끕|전부))?$/i);
  if(labM){
    const map={'묶음':'smart','끕':'off','전부':'all'};
    const v=labM[1]?(map[labM[1]]||labM[1].toLowerCase()):null;
    if(v) setSymbolLabelMode(v); else cycleSymbolLabelMode();
    return;
  }
  if(/^(sym|기호)$/i.test(c)){STATE.symbolBoost=STATE.symbolBoost===false?true:false;renderAll();cmdToast('기호 확대 표시 '+(STATE.symbolBoost!==false?'ON (비축척)':'OFF (실척)'));return;}
  const alM=c.match(/^al\s+(l|r|t|b|ch|cv)$/i);
  if(alM){alignSelection({l:'left',r:'right',t:'top',b:'bottom',ch:'centerh',cv:'centerv'}[alM[1].toLowerCase()]);return;}
  const dsM=c.match(/^dist\s+(h|v)$/i);
  if(dsM){distributeSelection(dsM[1].toLowerCase());return;}

  // del / delete
  if(/^(del|delete|d)$/i.test(c)){deleteSelected();cmdToast('삭제');return;}

  // v5.9: cv / curve — 선택된 아크를 자유 곡선으로 변환
  if(/^(cv|curve|곡선)$/i.test(c)){convertArcToCurve();return;}

  // 2026-08-27: 아래 인자들은 모두 계산식 허용 (예: r 90/2, m 6000/2,0, @1200*2,0, 6000/2x3000)
  const EXPR='[-0-9.+*/()\\s]+';
  const _e=v=>evalDim(v);
  const _ok=(...vs)=>vs.every(v=>v!==null&&isFinite(v));

  // r [angle] — 회전
  const rotM=c.match(new RegExp('^r\\s+('+EXPR+')$','i'));
  if(rotM){const ang=_e(rotM[1]);if(_ok(ang)){rotateSelectedBy(ang);return;}}

  // m x,y — 이동
  const mvM=c.match(new RegExp('^m\\s+('+EXPR+'),('+EXPR+')$','i'));
  if(mvM){const a=_e(mvM[1]),b=_e(mvM[2]);if(_ok(a,b)){moveSelectedBy(a,b);return;}}

  // cp x,y — 복제
  const cpM=c.match(new RegExp('^cp\\s+('+EXPR+'),('+EXPR+')$','i'));
  if(cpM){const a=_e(cpM[1]),b=_e(cpM[2]);if(_ok(a,b)){duplicateSelectedAt(a,b);return;}}

  // @x,y — 상대 좌표
  const relM=c.match(new RegExp('^@\\s*('+EXPR+'),('+EXPR+')$'));
  if(relM){const a=_e(relM[1]),b=_e(relM[2]);if(_ok(a,b)){handleRelativeCoord(a,b);return;}}

  // W,H,D — 도어/창 3차원 크기
  const d3M=c.match(new RegExp('^('+EXPR+'),('+EXPR+'),('+EXPR+')$'));
  if(d3M){const a=_e(d3M[1]),b=_e(d3M[2]),d=_e(d3M[3]);if(_ok(a,b,d)){handleSizeInput(a,b,d);return;}}

  // WxHxD 또는 W×H×D
  const xM=c.match(new RegExp('^('+EXPR+')[x×]('+EXPR+')(?:[x×]('+EXPR+'))?$','i'));
  if(xM){
    const a=_e(xM[1]),b=_e(xM[2]),d=xM[3]?_e(xM[3]):null;
    if(_ok(a,b)&&(xM[3]?_ok(d):true)){handleSizeInput(a,b,d);return;}
  }

  // x,y — 절대좌표 또는 2D 크기
  const absM=c.match(new RegExp('^('+EXPR+'),('+EXPR+')$'));
  if(absM){const a=_e(absM[1]),b=_e(absM[2]);if(_ok(a,b)){handleAbsoluteOrSize(a,b);return;}}

  cmdToast('알 수 없는 명령: '+c+' — / 또는 ? 로 도움말');
}

function handleCmdModeInput(c){
  const mode=STATE.cmdMode;
  // 공통: 'esc'/'cancel' 입력으로 취소
  if(/^(esc|cancel|q)$/i.test(c)){
    drawState=null;STATE.measureFirst=null;polyState=null;
    drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    cmdToast('취소');
    return true;
  }

  // ===== rect-w: 폭 입력 대기 =====
  // v5.6: offset-d 옵셋 거리 입력
  if(mode==='offset-d'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)||num<=0){cmdToast('양수 거리(mm) 입력');return true;}
    offsetState={distance:num};
    exitCmdMode();
    cmdToast('거리 '+num+'mm 설정 — 옵셋할 객체 클릭');
    return true;
  }

  // ===== circlespace-r: 원형공간 반지름 =====
  if(mode==='circlespace-r'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    const{cx,cy}=STATE.cmdData;
    addCircleSpace(cx,cy,num);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    return true;
  }
  // v5.3 ===== circle-r: 원 반지름 =====
  if(mode==='circle-r'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    if(drawState&&drawState.type==='circle'){
      addCircle(drawState.center.x,drawState.center.y,num);
    }else{
      addCircle(0,0,num);
    }
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    return true;
  }
  // v5.3 ===== arc-r: 아크 반지름 =====
  if(mode==='arc-r'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    STATE.cmdData.r=num;
    enterCmdMode('arc-start',STATE.cmdData,'시작각(°):','시작 각도 (0=동쪽, 90=북, 180=서, 270=남)');
    return true;
  }
  if(mode==='arc-start'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)){cmdToast('각도(°) 입력');return true;}
    STATE.cmdData.startAngle=num;
    enterCmdMode('arc-end',STATE.cmdData,'끝각(°):','끝 각도 (시계방향)');
    return true;
  }
  if(mode==='arc-end'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)){cmdToast('각도(°) 입력');return true;}
    const r=STATE.cmdData.r, sa=STATE.cmdData.startAngle, ea=num;
    const cx=drawState&&drawState.type==='arc'?drawState.center.x:0;
    const cy=drawState&&drawState.type==='arc'?drawState.center.y:0;
    addArc(cx,cy,r,sa,ea);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    return true;
  }

  if(mode==='rect-w'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)||num<=0){cmdToast('양수 폭(mm) 입력 필요');return true;}
    STATE.cmdData.w=Math.round(num);
    enterCmdMode('rect-h',STATE.cmdData,'높이(mm):','세로 길이 입력 후 Enter');
    return true;
  }
  // ===== rect-h: 높이 입력 → 사각공간 생성 =====
  if(mode==='rect-h'){
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)||num<=0){cmdToast('양수 높이(mm) 입력 필요');return true;}
    const h=Math.round(num);
    const w=STATE.cmdData.w;
    const start=(drawState&&drawState.type==='rect')?drawState.start:{x:0,y:0};
    addSpace([
      {x:start.x,y:start.y},{x:start.x+w,y:start.y},
      {x:start.x+w,y:start.y+h},{x:start.x,y:start.y+h},
    ]);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    cmdToast('사각공간 '+w+'×'+h+'mm 생성');
    return true;
  }

  // ===== wall-len: 벽 길이 입력 → 마우스 방향으로 생성 =====
  if(mode==='wall-len'){
    if(!drawState||(drawState.type!=='wall'&&drawState.type!=='line')){exitCmdMode();return true;}
    const isLineMode=drawState.type==='line';
    const isGabyeok=STATE.selectedTool==='gabyeok';
    const wallOpts={wallType:isGabyeok?'bearing':'standard'};
    // @dx,dy 형식도 허용
    const relM=c.match(/^@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if(relM){
      const dx=parseFloat(relM[1]),dy=parseFloat(relM[2]);
      const s=drawState.start;
      const endX=s.x+dx, endY=s.y+dy;
      isLineMode?addLine(s.x,s.y,endX,endY):addWall(s.x,s.y,endX,endY,wallOpts);
      drawGroup.destroyChildren();previewLayer.batchDraw();
      // v5.9: 선·벽 모두 @dx,dy 입력 후도 연속 모드 유지
      drawState={type:isLineMode?'line':'wall',start:{x:endX,y:endY},current:{x:endX,y:endY}};
      cmdToast((isLineMode?'선':(isGabyeok?'내력벽':'벽'))+' 추가 — 다음 끝점 클릭 또는 길이 입력 (Esc 종료)');
      return true;
    }
    const num=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(num)||num<=0){cmdToast('양수 길이(mm) 또는 @dx,dy 입력');return true;}
    const s=drawState.start;
    let dx=drawState.current.x-s.x, dy=drawState.current.y-s.y;
    const d=Math.sqrt(dx*dx+dy*dy);
    if(d<1){dx=1;dy=0;} else {dx/=d;dy/=d;}
    let endX,endY;
    const orthoActive=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
    if(orthoActive){
      if(Math.abs(dx)>=Math.abs(dy)){endX=s.x+Math.sign(dx||1)*num;endY=s.y;}
      else{endX=s.x;endY=s.y+Math.sign(dy)*num;}
    }else{
      endX=s.x+dx*num;endY=s.y+dy*num;
    }
    endX=snapMm(endX);endY=snapMm(endY);
    isLineMode?addLine(s.x,s.y,endX,endY):addWall(s.x,s.y,endX,endY,wallOpts);
    drawGroup.destroyChildren();previewLayer.batchDraw();
    // v5.9: 선·벽·내력벽 모두 거리 입력 후 연속 모드 유지
    drawState={type:isLineMode?'line':'wall',start:{x:endX,y:endY},current:{x:endX,y:endY}};
    const tag=isLineMode?'선':(isGabyeok?'내력벽':'벽');
    cmdToast(tag+' '+Math.round(num)+'mm — 다음 끝점 클릭 또는 길이 입력 (Esc 종료)');
    return true;
  }

  // ===== polygon-n: 꼭짓점 수 입력 =====
  if(mode==='polygon-n'){
    const n=parseInt(c);
    if(!isFinite(n)||n<3||n>20){cmdToast('3~20 사이 정수 입력');return true;}
    polyState={n,phase:'center'};
    // Enter keyup 이 캔버스로 전파되어 즉시 center 클릭으로 처리되는 것을 방지
    polyClickGuard=true;
    setTimeout(()=>{polyClickGuard=false;},200);
    exitCmdMode();
    document.getElementById('cmd-hint').textContent=n+'각형 — 중심점을 클릭하세요';
    cmdToast(n+'각형 — 중심점을 클릭하세요');
    return true;
  }

  // ===== polygon-r: 반지름 입력 =====
  if(mode==='polygon-r'){
    if(!polyState||!polyState.center){exitCmdMode();return true;}
    const r=evalDim(c); // 2026-08-27: 계산식 허용
    if(!isFinite(r)||r<50){cmdToast('50mm 이상 반지름 입력');return true;}
    createRegularPolygon(polyState.center,r,polyState.n);
    return true;
  }

  // ===== measure-rel: 줄자 두 번째 점 =====
  if(mode==='measure-rel'){
    if(!STATE.measureFirst){exitCmdMode();return true;}
    const relM=c.match(/^@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    let endX,endY;
    if(relM){
      endX=STATE.measureFirst.x+parseFloat(relM[1]);
      endY=STATE.measureFirst.y+parseFloat(relM[2]);
    }else{
      const num=evalDim(c); // 2026-08-27: 계산식 허용
      if(!isFinite(num)||num<=0){cmdToast('거리(mm) 또는 @dx,dy 입력');return true;}
      const s=STATE.measureFirst;
      let dx=(STATE.cmdData.curX!=null?STATE.cmdData.curX:s.x+1)-s.x;
      let dy=(STATE.cmdData.curY!=null?STATE.cmdData.curY:s.y)-s.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<1){dx=1;dy=0;} else {dx/=d;dy/=d;}
      const orthoActiveM=(STATE.snap.ortho&&!STATE.shiftPressed)||(!STATE.snap.ortho&&STATE.shiftPressed);
      if(orthoActiveM){
        if(Math.abs(dx)>=Math.abs(dy)){endX=s.x+Math.sign(dx||1)*num;endY=s.y;}
        else{endX=s.x;endY=s.y+Math.sign(dy)*num;}
      }else{endX=s.x+dx*num;endY=s.y+dy*num;}
    }
    endX=snapMm(endX);endY=snapMm(endY);
    STATE.measures.push({id:makeId('m'),x1:STATE.measureFirst.x,y1:STATE.measureFirst.y,x2:endX,y2:endY});
    STATE.measureFirst=null;
    saveHistory();renderAll();refreshUI();
    exitCmdMode();
    cmdToast('치수선 추가');
    return true;
  }

  // ===== text-input: 텍스트 입력 =====
  if(mode==='text-input'){
    if(!STATE.cmdData.pos){exitCmdMode();return true;}
    if(!c){exitCmdMode();return true;}
    const p=STATE.cmdData.pos;
    STATE.texts.push({id:makeId('t'),x:p.x,y:p.y,text:c,fontSize:14});
    saveHistory();renderAll();refreshUI();
    exitCmdMode();
    cmdToast('텍스트 추가');
    return true;
  }

  // ===== leader-text: 지시선 텍스트 입력 =====
  if(mode==='leader-text'){
    const pts=STATE.cmdData.points;
    if(!pts||pts.length<2){exitCmdMode();return true;}
    STATE.leaders.push({id:makeId('ld'),points:pts,text:c||'',fontSize:13});
    saveHistory();renderAll();refreshUI();
    exitCmdMode();
    setTool('leader');
    cmdToast('지시선 추가 — 계속 클릭하거나 Esc');
    return true;
  }

  // ===== rotate-space: 공간 회전 각도 입력 =====
  if(mode==='rotate-space'){
    const ang=evalDim(c); // 2026-08-27: 계산식 허용
    if(isNaN(ang)){cmdToast('숫자를 입력하세요 (예: 45, -90)');return true;}
    rotateSpaceByAngle(STATE.cmdData.spaceId,ang);
    saveHistory();renderAll();refreshUI();
    cmdToast('공간 회전 '+ang+'°');
    exitCmdMode();
    return true;
  }

  return false; // 처리 안됨 → processCommand 일반 흐름으로
}

function handleRelativeCoord(dx,dy){
  // 객체 선택된 상태에서는 이동
  if(STATE.selectedKind&&STATE.selectedId&&STATE.selectedTool==='select'){
    moveSelectedBy(dx,dy);
    return;
  }
  // 사각공간
  if(STATE.selectedTool==='rect'){
    if(drawState&&drawState.type==='rect'){
      const start=drawState.start;
      addSpace([
        {x:start.x,y:start.y},{x:start.x+dx,y:start.y},
        {x:start.x+dx,y:start.y+dy},{x:start.x,y:start.y+dy},
      ]);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('사각공간 '+dx+'×'+dy+'mm 생성');
    }else{
      addSpace([{x:0,y:0},{x:dx,y:0},{x:dx,y:dy},{x:0,y:dy}]);
      cmdToast('사각공간 '+dx+'×'+dy+'mm 생성 (원점)');
      zoomFit();
    }
  }
  // 정다각형 — @dx,dy 입력 미지원 (꼭짓점 수·반지름으로 생성)
  else if(STATE.selectedTool==='polygon'){
    cmdToast('정다각형: 꼭짓점 수 입력 후 중심 클릭 → 반지름 입력');
  }
  // 벽
  else if(STATE.selectedTool==='wall'){
    if(drawState&&drawState.type==='wall'){
      const start=drawState.start;
      addWall(start.x,start.y,start.x+dx,start.y+dy);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('벽 추가: '+Math.round(Math.sqrt(dx*dx+dy*dy))+'mm');
    }else{addWall(0,0,dx,dy);cmdToast('벽 추가 (원점부터)');}
  }
  // 선
  else if(STATE.selectedTool==='line'){
    if(drawState&&drawState.type==='line'){
      const start=drawState.start;
      addLine(start.x,start.y,start.x+dx,start.y+dy);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('선 추가: '+Math.round(Math.sqrt(dx*dx+dy*dy))+'mm');
    }else{addLine(0,0,dx,dy);cmdToast('선 추가 (원점부터)');}
  }
  // 줄자
  else if(STATE.selectedTool==='measure'){
    if(STATE.measureFirst){
      const end={x:STATE.measureFirst.x+dx,y:STATE.measureFirst.y+dy};
      STATE.measures.push({id:makeId('m'),x1:STATE.measureFirst.x,y1:STATE.measureFirst.y,x2:end.x,y2:end.y});
      STATE.measureFirst=null;
      saveHistory();renderAll();refreshUI();
      cmdToast('치수선 추가');
    }else{
      cmdToast('첫 점 클릭 후 @x,y 입력');
    }
  }
  // 가구/위생/조명/전기 — 선택된 라이브러리 객체 추가
  else if(['furniture','fixture','light','electric'].includes(STATE.selectedTool)&&STATE.selectedLib){
    const kind=STATE.selectedTool==='fixture'?'fixtures':STATE.selectedTool+'s';
    const k=kind==='lights'?'lights':kind==='furnitures'?'furniture':kind;
    const target=k==='furnitures'?'furniture':k;
    const o={id:makeId(target.charAt(0)),type:STATE.selectedLib,x:dx,y:dy,angle:0};
    if(target==='fixtures') STATE.fixtures.push(o);
    else if(target==='furniture') STATE.furniture.push(o);
    else if(target==='lights') STATE.lights.push(o);
    else if(target==='electric') STATE.electric.push(o);
    saveHistory();renderAll();refreshUI();
    cmdToast(target+' 추가됨');
  }else{
    cmdToast('도구 또는 객체 선택 필요');
  }
}

function handleAbsoluteOrSize(x,y){
  // 도어/창 선택 상태 = W,H 변경
  if(STATE.selectedKind==='opening'){
    const o=STATE.openings.find(op=>op.id===STATE.selectedId);
    if(o){
      o.width_mm=Math.round(x);o.height_mm=Math.round(y);
      saveHistory();renderAll();refreshUI();
      cmdToast('개구부 W:'+x+' × H:'+y+'mm');
      return;
    }
  }
  // 사각공간 도구 + 시작점 없음 = 시작점 (절대좌표)으로 설정
  if(STATE.selectedTool==='rect'&&(!drawState||drawState.type!=='rect')){
    drawState={type:'rect',start:{x:Math.round(x),y:Math.round(y)},current:{x:Math.round(x),y:Math.round(y)}};
    updatePreview();
    cmdToast('첫 점 ('+x+','+y+') — @W,H로 끝점 입력');
    return;
  }
  // 사각공간 + 시작점 있음 = W,H로 크기 적용
  if(STATE.selectedTool==='rect'&&drawState&&drawState.type==='rect'){
    handleSizeInput(x,y,null);
    return;
  }
  // 객체 선택 상태 = 절대 위치로 이동
  if(STATE.selectedKind&&STATE.selectedId){
    const arr=getArr(STATE.selectedKind);
    if(arr){
      const obj=arr.find(o=>o.id===STATE.selectedId);
      if(obj&&'x' in obj){
        const dx=x-obj.x,dy=y-obj.y;
        moveSelectedBy(dx,dy);
        return;
      }
    }
  }
  cmdToast('컨텍스트 불명 — 도구/객체 선택 후 다시 시도');
}

function handleSizeInput(w,h,d){
  // 도어/창 선택 시 크기 적용
  if(STATE.selectedKind==='opening'){
    const o=STATE.openings.find(op=>op.id===STATE.selectedId);
    if(o){
      o.width_mm=Math.round(w);o.height_mm=Math.round(h);
      if(d!==null) o.depth_mm=Math.round(d);
      saveHistory();renderAll();refreshUI();
      cmdToast('크기: '+w+'×'+h+(d?'×'+d:'')+'mm');
      return;
    }
  }
  // 사각공간 + 시작점 = 끝점 결정
  if(STATE.selectedTool==='rect'&&drawState&&drawState.type==='rect'){
    const start=drawState.start;
    addSpace([
      {x:start.x,y:start.y},{x:start.x+w,y:start.y},
      {x:start.x+w,y:start.y+h},{x:start.x,y:start.y+h},
    ]);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    cmdToast('사각공간 '+w+'×'+h+'mm 생성');
    return;
  }
  // 사각공간 도구만 활성 = 원점에서
  if(STATE.selectedTool==='rect'){
    addSpace([{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]);
    cmdToast('사각공간 '+w+'×'+h+'mm 생성 (원점)');
    zoomFit();
    return;
  }
  cmdToast('사각공간 도구 또는 도어/창 선택 필요');
}

function moveSelectedBy(dx,dy){
  const targets=getSelectedTargets();
  if(targets.length===0){cmdToast('객체 선택 필요');return;}
  let n=0;
  let lockedCnt=0;
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    if(obj.locked){lockedCnt++;return;} // 2026-08-24: 잠긴 객체는 이동 명령 무시
    if('x' in obj){obj.x+=dx;obj.y+=dy;}
    if('v1Id' in obj){
      moveVertex(obj.v1Id,obj.x1+dx,obj.y1+dy);
      moveVertex(obj.v2Id,obj.x2+dx,obj.y2+dy);
    } else if('x1' in obj){
      obj.x1+=dx;obj.y1+=dy;obj.x2+=dx;obj.y2+=dy;
    }
    if('vertexIds' in obj){
      // 2026-08-24: 직접 좌표 수정 → moveVertex 경유 (잠긴 이웃과 공유된 버텍스 중앙 가드 적용)
      obj.vertexIds.forEach(vid=>{const v=getVertex(vid);if(v)moveVertex(vid,v.x+dx,v.y+dy);});
    } else if(obj.polygon){
      obj.polygon=obj.polygon.map(p=>({x:p.x+dx,y:p.y+dy}));
    }
    n++;
  });
  if(n===0){if(lockedCnt)cmdToast('잠금된 객체 — 이동 불가');return;}
  saveHistory();renderAll();refreshUI();
  cmdToast('이동: '+dx+','+dy+'mm ('+n+'개)'+(lockedCnt?' — 잠금 '+lockedCnt+'개 제외':''));
}

function rotateSelectedBy(angle){
  // 공간 선택 시: 점·선·면·벽·치수 포함 전체 회전
  if(STATE.selectedKind==='space'&&STATE.selectedId){
    rotateSpaceByAngle(STATE.selectedId,angle);
    saveHistory();renderAll();refreshUI();
    cmdToast('공간 회전 '+angle+'°');
    return;
  }
  const targets=getSelectedTargets();
  if(targets.length===0){cmdToast('객체 선택 필요');return;}
  let n=0;
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    if(!('angle' in obj)) return;
    if(obj.locked) return; // 2026-08-24: 잠긴 객체 회전 금지
    obj.angle=((obj.angle||0)+angle)%360; n++;
  });
  if(n===0){cmdToast('회전 가능 객체 없음');return;}
  saveHistory();renderAll();
  cmdToast('회전 '+angle+'° ('+n+'개)');
}

function duplicateSelectedAt(dx,dy){
  let targets=getSelectedTargets();
  if(targets.length===0){cmdToast('객체 선택 필요');return;}
  // 2026-08-27: 잠긴 객체는 복제 제외 (대표 지시)
  const _lk2=targets.filter(t=>{const o=_findObjByKindId(t.kind,t.id);return o&&o.locked;}).length;
  targets=targets.filter(t=>{const o=_findObjByKindId(t.kind,t.id);return !(o&&o.locked);});
  if(targets.length===0){cmdToast('잠금된 객체 — 복제 불가 ('+_lk2+'개)');return;}
  const newSel=[];
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    const copy=JSON.parse(JSON.stringify(obj));
    copy.id=makeId(t.kind.charAt(0));
    copy.locked=false; // 2026-08-24: 사본은 잠금 해제로 생성 — 잠금은 원본 보호 목적 (대표 지시)
    if('x' in copy){copy.x+=dx;copy.y+=dy;}
    if('v1Id' in copy){
      copy.v1Id=ensureVertex(copy.x1+dx,copy.y1+dy).id;
      copy.v2Id=ensureVertex(copy.x2+dx,copy.y2+dy).id;
      reinstallVEF(copy);
    } else if('x1' in copy){
      copy.x1+=dx;copy.y1+=dy;copy.x2+=dx;copy.y2+=dy;
    }
    if('vertexIds' in copy&&copy.polygon){
      copy.vertexIds=copy.polygon.map(p=>ensureVertex(p.x+dx,p.y+dy).id);
      reinstallVEF(copy);
    } else if(copy.polygon&&!('vertexIds' in copy)){
      copy.polygon=copy.polygon.map(p=>({x:p.x+dx,y:p.y+dy}));
    }
    arr.push(copy);
    newSel.push({kind:t.kind,id:copy.id});
  });
  if(targets.length>1){STATE.boxSelection=newSel;STATE.selectedKind=null;STATE.selectedId=null;}
  saveHistory();renderAll();refreshUI();
  cmdToast('복제: '+dx+','+dy+'mm ('+targets.length+'개)');
}

function showCmdHelp(){
  _showTextModal('❔ 명령어 도움말',`ECOREAN MiniCAD v5.1 — AutoCAD 스타일 단계별 입력

[새 워크플로우 v5.1 — 클릭 후 명령창 자동 활성]

▶ 사각공간 (R 키)
  1. R 키 → 사각공간 도구
  2. 캔버스 시작점 클릭
  3. 명령창에 "폭(mm):" 자동 표시 → 4500 Enter
  4. "높이(mm):" → 3200 Enter
  → 4.5m × 3.2m 사각공간 생성
  (드래그 방식도 여전히 가능)

▶ 벽 (A 키)
  1. A 키 → 벽 도구
  2. 시작점 클릭
  3. 마우스 위치로 방향 결정
  4. "길이(mm):" → 3000 Enter
  → 마우스 방향으로 3m 벽 생성
  Shift 누르면 직각 강제 (수평/수직)

▶ 다각공간 (P 키) — L자 거실
  1. P 키 → 첫 점 클릭
  2. 마우스 동쪽 → 5000 Enter (5m)
  3. 마우스 북쪽 → 3000 Enter
  4. 또는 @-2000,0 형식도 가능
  5. c Enter 또는 더블클릭으로 닫기

▶ 줄자 (M 키)
  1. M 키 → 첫 점 클릭
  2. 두 번째 점 클릭 또는
  3. 길이(mm) Enter / @dx,dy Enter

▶ 텍스트 (T 키)
  1. T 키 → 위치 클릭
  2. 명령창에 텍스트 입력 → Enter

[기존 명령 (cmdMode 외)]
@W,H        상대 좌표 (예: @4500,3200)
W,H,D       3차원 크기 (도어/창 풀 변경)
WxHxD       크기 (예: 1200x1500x200)
r 90        90도 회전 (객체 선택 후)
m 500,300   500mm 우, 300mm 아래로 이동
cp 1000,0   1000mm 우로 복제
del         삭제

[취소 / 도움말]
esc         현재 입력 모드 취소 (또는 명령창에 'esc' 입력)
↑ ↓        명령어 히스토리 탐색
/ 또는 ?    이 도움말 표시

[원칙]
모든 단위 mm. 좌표는 우측(+X) 아래쪽(+Y).
스냅 ON 시 자동 정렬. 클릭 후 명령창은 자동 포커스됨.`);
}

// 명령어 입력 이벤트
const cmdInput=document.getElementById('cmd-input');
cmdInput.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    e.preventDefault();
    doEnterAction();
  }else if(e.key==='ArrowUp'){
    e.preventDefault();
    if(STATE.cmdHistoryIdx+1<STATE.cmdHistory.length){
      STATE.cmdHistoryIdx++;
      cmdInput.value=STATE.cmdHistory[STATE.cmdHistoryIdx];
    }
  }else if(e.key==='ArrowDown'){
    e.preventDefault();
    if(STATE.cmdHistoryIdx>0){
      STATE.cmdHistoryIdx--;
      cmdInput.value=STATE.cmdHistory[STATE.cmdHistoryIdx];
    }else if(STATE.cmdHistoryIdx===0){
      STATE.cmdHistoryIdx=-1;
      cmdInput.value='';
    }
  }else if(e.key==='Escape'){
    e.preventDefault();
    cmdInput.value='';
    STATE.cmdHistoryIdx=-1;
    // v5.1: cmdMode 활성 시 모드 종료 + drawState 클리어
    if(STATE.cmdMode){
      drawState=null;STATE.measureFirst=null;polyState=null;
      drawGroup.destroyChildren();previewLayer.batchDraw();
      exitCmdMode();
      cmdToast('취소');
    }
    cmdInput.blur();
  }
});

document.getElementById('btn-cmd-help').addEventListener('click',showCmdHelp);

// 도구 변경 시 힌트 업데이트 + cmdMode 자동 종료 + 라이브러리 패널 갱신
const _origSetTool=setTool;
setTool=function(tool){
  if(STATE.cmdMode){
    drawState=null;STATE.measureFirst=null;polyState=null;
    drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
  }
  _origSetTool(tool);
  const hint=CMD_HINTS[tool]||'명령어 입력';
  document.getElementById('cmd-hint').textContent=hint;
  // v5.6: 라이브러리 도구 활성 시 패널 자동 갱신
  if(['furniture','fixture','light','electric','hvac'].includes(tool)){
    rebuildLibPanel(tool);
  }
  // v5.9: 다각공간 = 자유 다각형 기본 (점 클릭) + 숫자 입력 시 정다각형
  if(tool==='polygon'){
    polyState=null;freePolyState=null;
    enterCmdMode('polygon-n',{},'다각공간:','점 클릭=자유 다각형 (Enter·더블클릭=닫기) / 숫자 Enter=정다각형');
  }
  // v5.9: offset 도구 활성 시 — distance 없을 때만 거리 입력, 있으면 바로 재사용
  if(tool==='offset'){
    if(!offsetState?.distance){
      offsetState=null;
      enterCmdMode('offset-d',{},'옵셋 거리(mm):','거리 Enter → 객체 클릭 → 방향 클릭');
    }else{
      offsetState.target=null;
      drawGroup.destroyChildren();previewLayer.batchDraw();
      cmdToast('옵셋 거리: '+offsetState.distance+'mm — 객체 클릭 (거리 변경: Esc 후 O)');
    }
  }
  // v5.6: mirror 도구 클릭 — 선택 객체 있어야 진행
  if(tool==='mirror'){
    if(STATE.boxSelection.length===0&&!STATE.selectedKind){
      cmdToast('미러: 먼저 객체를 선택 (V 도구로 클릭/박스 선택)');
      _origSetTool('select');
      return;
    }
    mirrorState={phase:'pickLine1'};
    enterCmdMode('mirror-line1',{},'기준선 1점:','기준선 첫 점 클릭');
  }
};


function initUI(){
// ===== 초기화 =====
if(typeof loadSnapPrefs==='function') loadSnapPrefs(); // 2026-08-27: 저장된 스냅 설정 복원
buildSpaceTypeUI();buildLayerUI();buildSnapUI();
drawGrid();saveHistory();refreshUI();
document.getElementById('btn-grid').classList.add('gold');
if(typeof updateCircuitsBtn==='function') updateCircuitsBtn(); // 2026-08-27: 저장된 배선 보기 상태 반영
if(typeof updateSymbolLabelBtn==='function') updateSymbolLabelBtn(); // 2026-08-28: 라벨 모드 버튼 표시
if(typeof updatePrintFrameBtn==='function') updatePrintFrameBtn();   // 2026-08-28: 인쇄 영역 틀 버튼
document.getElementById('btn-dim').classList.add('gold');
setTimeout(handleResize,100);setTimeout(handleResize,500);
document.getElementById('cmd-hint').textContent=CMD_HINTS.select;
// v5.9 fix: 리사이즈(500ms) 완료 전 입력이 무시되던 문제 — 오버레이를 리사이즈 완료 후 숨김
setTimeout(()=>document.getElementById('loading').classList.add('hidden'),550);

// v5.2: 모바일 감지
STATE.isMobile=/Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent)||(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);

// v5.2: 직교 FAB
document.getElementById('ortho-fab').addEventListener('click',toggleOrtho);
updateOrthoFAB();

// 정다각형 도구에서는 닫기 FAB 사용 안 함
document.getElementById('polyclose-fab').addEventListener('click',()=>{
  if(typeof finishFreePolygon==='function'&&typeof freePolyState!=='undefined'&&freePolyState) finishFreePolygon(); // v5.9
});

// v5.2: 빠른 치수칩 (자주 쓰는 인테리어 치수)
const QUICK_DIMS=[600,900,1200,1500,1800,2400,3000,3600,4500];
function showQuickChips(mode){
  const el=document.getElementById('quick-chips');
  el.classList.remove('hidden');
  el.innerHTML=QUICK_DIMS.map(d=>'<button class="quick-chip" data-d="'+d+'">'+d+'</button>').join('')+
    '<button class="quick-chip" data-cmd="esc" style="border-color:#E2725B;color:#E2725B">esc 취소</button>'+
    '';
  el.querySelectorAll('.quick-chip').forEach(b=>{
    b.addEventListener('click',e=>{
      e.preventDefault();
      const d=b.dataset.d, cmd=b.dataset.cmd;
      const inp=document.getElementById('cmd-input');
      if(cmd==='esc'){
        if(STATE.cmdMode){drawState=null;STATE.measureFirst=null;polyState=null;drawGroup.destroyChildren();previewLayer.batchDraw();exitCmdMode();cmdToast('취소');}
      }else if(d){
        processCommand(String(d));
        inp.value='';inp.focus();
      }
    });
  });
}
function hideQuickChips(){
  const el=document.getElementById('quick-chips');
  el.classList.add('hidden');
  el.innerHTML='';
}

// 2026-08-19: 옵션 패널 입력 중 refreshUI 가 패널을 통째로 다시 그려 포커스·가상키보드가 날아가던 문제
//  — 패널 input/select 에 포커스가 있으면 ① 한 틱 미뤄(다음 필드로의 포커스 이동이 끝난 뒤) 다시 그리고
//    ② 같은 id 의 새 요소로 포커스·캐럿을 복원한다. cmd-input 은 제외(기존 흐름 유지).
const _origRefreshUI=refreshUI;
let _refreshUIDeferred=false;
function _panelFieldFocused(){
  const ae=document.activeElement;
  if(!ae||!ae.id||ae.id==='cmd-input') return null;
  if(!(ae.tagName==='INPUT'||ae.tagName==='SELECT'||ae.tagName==='TEXTAREA')) return null;
  if(!ae.closest('.panel-right,.panel-left,.lib-popup')) return null;
  return ae;
}
refreshUI=function(){
  if(_panelFieldFocused()){
    if(_refreshUIDeferred) return;
    _refreshUIDeferred=true;
    setTimeout(()=>{
      _refreshUIDeferred=false;
      const before=document.activeElement;
      _origRefreshUI();
      // 다시 그리기로 떨어져 나간 요소에 포커스가 있었으면 복원
      if(before&&before.id&&!document.contains(before)){_restoreFieldFocusTo(before);}
    },0);
    return;
  }
  _origRefreshUI();
};
function _restoreFieldFocusTo(oldEl){
  const el=document.getElementById(oldEl.id);
  if(!el) return;
  let s0=null,e0=null;try{s0=oldEl.selectionStart;e0=oldEl.selectionEnd;}catch(_){}
  try{el.focus({preventScroll:true});}catch(_){try{el.focus();}catch(__){}}
  if(s0!=null&&el.setSelectionRange&&/^(text|search|url|tel|password)$/.test(el.type||'text')){try{el.setSelectionRange(s0,e0);}catch(_){}}
}

// v5.2: cmdMode 변경 시 빠른칩/다각형 FAB 자동 표시 (래퍼)
const _origEnter=enterCmdMode;
enterCmdMode=function(mode,data,promptLabel,hintText){
  _origEnter(mode,data,promptLabel,hintText);
  if(['rect-w','rect-h','wall-len','measure-rel'].includes(mode)){
    showQuickChips(mode);
  }else{
    hideQuickChips();
  }
  document.getElementById('polyclose-fab').classList.add('hidden');
};
const _origExit=exitCmdMode;
exitCmdMode=function(){
  _origExit();
  hideQuickChips();
  document.getElementById('polyclose-fab').classList.add('hidden');
};

// 2026-08-19: 핀치 줌·2손가락 패닝·S펜/손가락 구분·팜 리젝션 → js/touch.js (initTouch) 로 이관


console.log('%c ECOREAN MiniCAD v5.9 ','background:#C9A961;color:#0A0A0A;font-weight:bold;padding:4px 8px;');
console.log('  v5.9 신규: 내력벽/기둥/지시선/무한안내선/자유곡선 / 벽 정렬(내벽·중심·외벽) / 배경 트레이싱 / JSON 무결성 리포트');
console.log('  v5.8 유지: 공간 변 스냅 / 벽 교차 자동 분할 / 공정별 합산표 / SEMANTIC_MAP 79종 / 테스트 스위트 (?test=1)');
console.log('  v5.7 유지: 2.5D 토글 / AI 생성 파이프라인 SSoT JSON / exportAIBundle');
console.log('  헌법: 단가 추정 금지·NEEDS_CONFIRMATION·방수 CONDITIONAL·mm 정수·평면 모드 기본·인쇄/JSON 시 2.5D 강제 OFF');
console.log('L=선/벽 (AutoCAD) / 라이브러리 5개 통합 (1~5) / 공조·소방 15종 / 옵셋(O) + 미러(mi)');
console.log('Stage:',stage.width(),'×',stage.height(),' / 모바일:',STATE.isMobile);

}

// 평면도 라이브러리 연동 — /catalog/plans/ 에서 열기
// ?plan=<도면 JSON URL> : 표준 평면도를 실제 공간·벽 객체로 생성 (2026-08-25 대표 지시 — 이미지가 아닌 실측값 공간)
// ?bg=<이미지 URL>      : 트레이싱용 배경 이미지 (사진·스캔 도면용)
// 둘 다 자사 정적 파일(같은 오리진)·자사 Supabase 스토리지만 허용
window.addEventListener('load',()=>{
  let bg,name,plan;
  try{
    const p=new URL(location.href).searchParams;
    bg=p.get('bg');
    name=p.get('bgname')||'평면도';
    plan=p.get('plan');
  }catch(e){return;}
  const ok=u=>u&&((u.startsWith('/')&&!u.startsWith('//'))||u.startsWith('https://gdcfqbdgubgpzusbtftf.supabase.co/storage/'));
  // 앱 초기화(initApp: load+50ms) 전에 로드가 끝나면 bgLayer 미생성 → drawGrid TypeError
  //  → 캔버스 레이어 준비를 기다렸다가 적용
  const whenReady=fn=>{const t=()=>{if(typeof bgLayer!=='undefined'&&bgLayer)fn();else setTimeout(t,120);};t();};
  if(ok(plan)){
    fetch(plan)
      .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(d=>{
        if(!d||!d.schema||!String(d.schema).startsWith('ECOREAN.FloorPlan'))throw new Error('MiniCAD 도면 JSON이 아닙니다');
        whenReady(()=>{
          applyLoadedData(d);
          // 벡터와 원본 이미지를 함께 보여준다 — 벽이 도면과 맞는지 눈으로 대조할 수 있어야 한다
          const bgMeta=(d.meta&&d.meta.background)||null;
          if(bgMeta&&ok(bgMeta.url)) applyPlanBackground(bgMeta,(d.meta&&d.meta.project)||'평면도 원본');
          else if(ok(bg)) fetch(bg).then(r=>r.blob())
            .then(b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b);}))
            .then(u=>setBgImage(u,name)).catch(()=>{});
          const nW=STATE.walls.length,nS=STATE.spaces.length;
          showStatus('실도면 로드 — '+((d.meta&&d.meta.project)||'')+' · 벽 '+nW+'개'+(nS?' · 공간 '+nS+'개':'')+
            ((d.meta&&d.meta.verified)?' (전용면적 기준 스케일 · 시공 전 실측 확인)':' (스케일 미검증 — 배경만 참고)'));
        });
      })
      .catch(err=>showStatus('표준 평면도 로드 실패: '+err.message));
    return; // plan 우선 — bg 병행 시 무시
  }
  if(!ok(bg))return;
  fetch(bg)
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.blob();})
    .then(b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b);}))
    .then(dataURL=>{whenReady(()=>setBgImage(dataURL,name));})
    .catch(err=>showStatus('평면도 밑그림 로드 실패: '+err.message));
});

// ===== 2026-08-30: 입면도 그리기 · 창 (대표 지시 — 평면도 정보로 자동 생성) =====
//  도면 관례를 따른다: 바닥선을 제일 굵게, 벽면 외곽 실선, 문·창은 개구부 표기,
//  아래에 구간 치수와 전체 치수 두 줄, 왼쪽에 천장고, 기구마다 설치 높이.
const ELEV_PAD={l:260,r:130,t:110,b:620};    // 도면 여백 (좌표 단위 = mm)
const ELEV_FS={dim:66,tag:78,title:104};
function _eTxt(x,y,t,fs,col,anchor,extra){
  return '<text x="'+Math.round(x)+'" y="'+Math.round(y)+'" font-size="'+fs+'" fill="'+(col||'#333')+
    '" text-anchor="'+(anchor||'middle')+'"'+(extra||'')+'>'+escapeHtml(String(t))+'</text>';
}
// 가로 치수선 — 양 끝 짧은 눈금, 가운데 숫자
function _eDimH(x1,x2,y,t,col){
  if(!(x2-x1>0)) return '';
  const c=col||'#666';
  return '<g stroke="'+c+'" stroke-width="7" fill="none">'+
    '<line x1="'+Math.round(x1)+'" y1="'+Math.round(y)+'" x2="'+Math.round(x2)+'" y2="'+Math.round(y)+'"/>'+
    '<line x1="'+Math.round(x1)+'" y1="'+Math.round(y-32)+'" x2="'+Math.round(x1)+'" y2="'+Math.round(y+32)+'"/>'+
    '<line x1="'+Math.round(x2)+'" y1="'+Math.round(y-32)+'" x2="'+Math.round(x2)+'" y2="'+Math.round(y+32)+'"/>'+
    '</g>'+_eTxt((x1+x2)/2,y-26,t,ELEV_FS.dim,c);
}
// 세로 치수선 — 숫자를 눕혀서 적는다
function _eDimV(x,y1,y2,t,col){
  const a=Math.min(y1,y2), b=Math.max(y1,y2);
  if(!(b-a>0)) return '';
  const c=col||'#666';
  return '<g stroke="'+c+'" stroke-width="7" fill="none">'+
    '<line x1="'+Math.round(x)+'" y1="'+Math.round(a)+'" x2="'+Math.round(x)+'" y2="'+Math.round(b)+'"/>'+
    '<line x1="'+Math.round(x-32)+'" y1="'+Math.round(a)+'" x2="'+Math.round(x+32)+'" y2="'+Math.round(a)+'"/>'+
    '<line x1="'+Math.round(x-32)+'" y1="'+Math.round(b)+'" x2="'+Math.round(x+32)+'" y2="'+Math.round(b)+'"/>'+
    '</g>'+_eTxt(x-26,(a+b)/2,t,ELEV_FS.dim,c,'middle',
      ' transform="rotate(-90 '+Math.round(x-26)+' '+Math.round((a+b)/2)+')"');
}
// 입면 하나를 SVG 로. opt.color = 색을 넣을지, opt.devices = 스위치·콘센트를 그릴지
function elevationSVG(e,opt){
  opt=opt||{};
  const showDev=(opt.devices!==false);
  const P=ELEV_PAD, VW=e.L+P.l+P.r, VH=e.H+P.t+P.b;
  const X=x=>P.l+x, Y=y=>P.t+(e.H-y);        // 바닥이 아래로 오도록 뒤집는다
  const wallFill=opt.color?'#FAF6EE':'#FFFFFF';
  let g='';
  g+='<rect x="0" y="0" width="'+Math.round(VW)+'" height="'+Math.round(VH)+'" fill="#FFFFFF"/>';
  if(e.faces&&e.faces.length){
    // 절단선 입면 — 벽면이 여러 장이다. 먼 것부터 깔고 가까운 것을 위에 덮는다.
    //  멀수록 옅게 칠해 어느 것이 앞인지 눈으로 바로 알게 한다 (도면 관례).
    // 옅기는 '절단면에서 얼마나 먼가'로 정한다 — 제일 먼 벽 기준으로 재면
    //  벽이 하나뿐일 때 그 하나가 제일 진해져 앞뒤가 거꾸로 읽힌다
    const far=Math.max(1500,e.depth||6000);
    g+='<line x1="'+X(0)+'" y1="'+Y(e.H)+'" x2="'+X(e.L)+'" y2="'+Y(e.H)+
       '" stroke="#999" stroke-width="6" stroke-dasharray="40,26"/>';   // 최고 천장선
    e.faces.forEach(f=>{
      const k=Math.min(1,f.dist/far);
      const lv=Math.round(255-58*k);                                    // 멀수록 옅게
      // 절단면에 걸린 벽(dist 0)과 옆에서 본 벽은 '잘린 부재' — 도면 관례대로 진하게 채운다
      const cut=f.edge||f.dist<60;
      const fill=cut?(opt.color?'#B9AE9A':'#B5B5B5')
                    :(opt.color?'rgb('+lv+','+(lv-4)+','+(lv-12)+')':'rgb('+lv+','+lv+','+lv+')');
      const hF=Math.min(f.h,e.H);
      (f.vis||[[f.left,f.right]]).forEach(([l,r])=>{      // 앞 벽에 가려진 부분은 빼고 그린다
        const wF=Math.max(1,r-l);
        g+='<rect x="'+Math.round(X(l))+'" y="'+Math.round(Y(hF))+'" width="'+Math.round(wF)+
           '" height="'+Math.round(hF)+'" fill="'+fill+'" stroke="#111" stroke-width="'+
           (cut?11:(k<0.34?10:7))+'"/>';
      });
    });
  }else{
    g+='<rect x="'+X(0)+'" y="'+Y(e.H)+'" width="'+e.L+'" height="'+e.H+'" fill="'+wallFill+
       '" stroke="#111" stroke-width="10"/>';
  }
  // 바닥선 — 제일 굵게
  g+='<line x1="'+(X(0)-70)+'" y1="'+Y(0)+'" x2="'+(X(e.L)+70)+'" y2="'+Y(0)+
     '" stroke="#000" stroke-width="26"/>';
  // 문·창
  e.ops.forEach(o=>{
    const l=Math.max(0,o.left), r=Math.min(e.L,o.left+o.w);
    const top=Math.min(e.H,o.top), bot=Math.min(o.sill,e.H);
    const x=X(l), w=r-l, y=Y(top), h=top-bot;
    if(!(w>0&&h>0)) return;
    g+='<rect x="'+Math.round(x)+'" y="'+Math.round(y)+'" width="'+Math.round(w)+'" height="'+Math.round(h)+
       '" fill="'+(opt.color?(o.isDoor?'#F2E6CE':'#D9EAF6'):'#FFFFFF')+'" stroke="#111" stroke-width="10"/>';
    if(o.isDoor){
      g+='<circle cx="'+Math.round(x+w-95)+'" cy="'+Math.round(y+h/2)+'" r="30" fill="#111"/>';  // 손잡이
    }else{
      g+='<line x1="'+Math.round(x+w/2)+'" y1="'+Math.round(y)+'" x2="'+Math.round(x+w/2)+
         '" y2="'+Math.round(y+h)+'" stroke="#111" stroke-width="7"/>';                          // 중간 창틀
      g+='<rect x="'+Math.round(x+70)+'" y="'+Math.round(y+70)+'" width="'+Math.round(Math.max(0,w-140))+
         '" height="'+Math.round(Math.max(0,h-140))+'" fill="none" stroke="#111" stroke-width="5"/>';
      if(o.sill>0) g+=_eDimV(x+w/2,Y(0),Y(o.sill),'SILL '+o.sill,'#7A6A3A');                     // 창대 높이
    }
    g+=_eTxt(x+w/2,y+h/2-14,o.name,ELEV_FS.tag,'#333');
    g+=_eTxt(x+w/2,y+h/2+ELEV_FS.tag+8,o.w+'×'+o.h,ELEV_FS.tag,'#333');
  });
  // 스위치·콘센트 — 설치 높이까지 같이
  if(showDev) e.devs.forEach(d=>{
    const x=X(d.left), y=Y(d.h+d.bh/2);
    g+='<rect x="'+Math.round(x)+'" y="'+Math.round(y)+'" width="'+d.w+'" height="'+d.bh+
       '" fill="'+(opt.color?'#EAF3E1':'#FFFFFF')+'" stroke="#3F6B2E" stroke-width="8"/>';
    g+=_eTxt(x+d.w/2,y+d.bh/2+22,d.sym||'',60,'#3F6B2E');
    g+=_eTxt(x+d.w/2,y-24,d.name,58,'#3F6B2E');
    // 설치 높이 — 바닥까지 가는 인출선 하나, 숫자는 기구 바로 밑에.
    //  가운데에 적으면 문·창 글씨와 겹친다 (실물 확인에서 나온 문제)
    g+='<g stroke="#3F6B2E" stroke-width="6" fill="none">'+
       '<line x1="'+Math.round(x+d.w/2)+'" y1="'+Math.round(Y(0))+'" x2="'+Math.round(x+d.w/2)+
       '" y2="'+Math.round(y+d.bh)+'"/>'+
       '<line x1="'+Math.round(x+d.w/2-30)+'" y1="'+Math.round(Y(0))+'" x2="'+Math.round(x+d.w/2+30)+
       '" y2="'+Math.round(Y(0))+'"/></g>';
    g+=_eTxt(x+d.w/2,y+d.bh+72,'H'+d.h,58,'#3F6B2E');
  });
  // 아래 치수 두 줄 — 구간(문·창 사이) + 전체
  const yb1=Y(0)+170, yb2=Y(0)+400;
  let cut=[0];
  e.ops.forEach(o=>{cut.push(Math.max(0,Math.min(e.L,o.left)),Math.max(0,Math.min(e.L,o.left+o.w)));});
  cut.push(e.L);
  cut=[...new Set(cut.map(v=>Math.round(v)))].sort((a,b)=>a-b);
  if(cut.length>2) for(let i=0;i<cut.length-1;i++)
    g+=_eDimH(X(cut[i]),X(cut[i+1]),yb1,cut[i+1]-cut[i]);
  g+=_eDimH(X(0),X(e.L),yb2,e.L,'#111');
  // 왼쪽 천장고
  g+=_eDimV(X(0)-130,Y(0),Y(e.H),'CH '+e.H,'#111');
  // 이름표
  const isSec=!!(e.faces&&e.faces.length);
  const t1=(e.label?('['+e.label+'] '):'')+(e.spaceName||'')+' '+e.dir+' 입면도'+
    (e.viewSide==='out'?' (밖에서 봄)':'');
  const t2=[(isSec?'절단길이 ':'벽 ')+e.L+' × 천장고 '+e.H,
    (isSec?('깊이 '+(e.depth?e.depth:'제한 없음')):(e.thickness?('두께 '+e.thickness):'')),
    (isSec?('벽면 '+e.faces.length):(e.material||'')),(e.bearing?'내력벽':''),
    (e.ops.length?('문·창 '+e.ops.length):''),(showDev&&e.devs.length?('전기 '+e.devs.length):'')]
    .filter(Boolean).join('  ·  ');
  g+=_eTxt(X(0),Y(0)+P.b-140,t1,ELEV_FS.title,'#000','start',' font-weight="700"');
  g+=_eTxt(X(0),Y(0)+P.b-40,t2,ELEV_FS.dim,'#555','start');
  return '<svg viewBox="0 0 '+Math.round(VW)+' '+Math.round(VH)+'" width="100%" '+
    'preserveAspectRatio="xMidYMid meet" style="display:block">'+g+'</svg>';
}

// 한 공간의 입면 여러 장은 같은 축척으로 — 짧은 벽이 긴 벽만큼 넓게 그려지면 서로 견줄 수 없다.
//  제일 긴 벽을 100%로 두고 나머지를 그 비율만큼 좁게 놓는다.
function elevationSetWidths(elevs){
  const vw=elevs.map(e=>e.L+ELEV_PAD.l+ELEV_PAD.r);
  const mx=Math.max(1,...vw);
  return vw.map(v=>(v/mx*100).toFixed(2)+'%');
}
// ===== 입면도 창 =====
let _elevDlg=null, _elevCur=null;
const _elevOpt={devices:true,color:true};
let _elevMode='space';   // 'space' = 방의 벽별 / 'section' = 절단선별
let _elevSecId=null;
function closeElevationDialog(){
  if(_elevDlg){_elevDlg.remove();_elevDlg=null;}
  document.removeEventListener('keydown',_elevKey,true);
}
function _elevKey(ev){ if(ev.key==='Escape'){ev.preventDefault();closeElevationDialog();} }
function openElevationDialog(spaceId,opts){
  closeElevationDialog();
  const spaces=elevationSpaces();
  const secs=STATE.sections||[];
  if(opts&&opts.mode) _elevMode=opts.mode;
  if(opts&&opts.sectionId){_elevMode='section';_elevSecId=opts.sectionId;}
  if(_elevMode==='section'&&!secs.length) _elevMode='space';
  if(!spaces.length&&secs.length) _elevMode='section';
  if(!spaces.length&&!secs.length){
    cmdToast('벽이 있는 공간도, 절단선도 없습니다 — 공간을 그리거나 절단선을 그어주세요');return;}
  let sid=spaceId||(STATE.selectedKind==='space'?STATE.selectedId:null);
  if(STATE.selectedKind==='wall'){
    const w=STATE.walls.find(x=>x.id===STATE.selectedId);
    if(w&&w.spaceId) sid=w.spaceId;
  }
  if(!spaces.some(x=>x.id===sid)) sid=spaces[0].id;
  const wrap=document.createElement('div');
  wrap.id='elev-dialog';
  wrap.style.cssText='position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,0.62);'+
    'display:flex;justify-content:center;align-items:center;padding:14px';
  wrap.innerHTML=
    '<div style="width:min(1180px,97vw);height:min(800px,94vh);background:var(--bg-card,#1A1B2E);'+
      'border:1px solid var(--gold,#C9A961);border-radius:10px;display:flex;flex-direction:column;'+
      'overflow:hidden;box-shadow:0 14px 52px rgba(0,0,0,0.6)">'+
      '<div style="display:flex;align-items:center;gap:10px;padding:11px 14px;'+
        'border-bottom:1px solid var(--border,#3D4466)">'+
        '<div style="font-size:14px;font-weight:700;color:var(--text-primary,#F5F1EB)">📐 입면도</div>'+
        '<div id="ev-info" style="font-size:11.5px;color:var(--text-secondary,#A9B0C9)"></div>'+
        '<button type="button" class="btn sm" id="ev-x" style="margin-left:auto">✕</button>'+
      '</div>'+
      '<div style="flex:1;display:flex;min-height:0">'+
        '<div id="ev-left" style="width:282px;flex:none;overflow-y:auto;padding:12px 13px;'+
          'border-right:1px solid var(--border,#3D4466)"></div>'+
        '<div id="ev-body" style="flex:1;min-width:0;overflow-y:auto;padding:12px;background:#70747F"></div>'+
      '</div>'+
      '<div style="display:flex;gap:7px;align-items:center;padding:10px 14px;'+
        'border-top:1px solid var(--border,#3D4466)">'+
        '<div style="font-size:11px;color:var(--text-tertiary,#7B82B5)">'+
          '평면도를 고치면 입면도도 따라 바뀝니다</div>'+
        '<button type="button" class="btn sm" id="ev-close" style="margin-left:auto">닫기</button>'+
        '<button type="button" class="btn sm gold" id="ev-print" style="font-weight:700">🖨 인쇄</button>'+
      '</div>'+
    '</div>';
  wrap.addEventListener('pointerdown',ev=>{if(ev.target===wrap)closeElevationDialog();});
  document.body.appendChild(wrap);
  _elevDlg=wrap;
  document.addEventListener('keydown',_elevKey,true);
  document.getElementById('ev-x').addEventListener('click',closeElevationDialog);
  document.getElementById('ev-close').addEventListener('click',closeElevationDialog);
  document.getElementById('ev-print').addEventListener('click',()=>printElevations());
  renderElevationDialog(sid);
}
// 절단선 도구로 바로 보내기 — 창을 닫고 도면에서 선을 긋게 한다
function elevationDrawSection(){
  closeElevationDialog();
  setTool('section');
}
function renderElevationDialog(sid){
  const left=document.getElementById('ev-left'), body=document.getElementById('ev-body');
  if(!left||!body) return;
  const spaces=elevationSpaces();
  const secs=STATE.sections||[];
  if(_elevMode==='section'&&!secs.length) _elevMode='space';
  const chk=(id,on,txt)=>'<label style="display:flex;align-items:center;gap:6px;font-size:11.5px;'+
    'color:var(--text-secondary,#A9B0C9);margin-top:5px;cursor:pointer">'+
    '<input type="checkbox" id="'+id+'"'+(on?' checked':'')+'>'+txt+'</label>';
  const tab=(m,txt)=>'<button type="button" class="btn sm ev-tab" data-m="'+m+'" style="flex:1'+
    (_elevMode===m?';background:rgba(201,169,97,0.25);border-color:#C9A961;color:#C9A961;font-weight:700':'')+
    '">'+txt+'</button>';
  const tabs='<div style="display:flex;gap:4px;margin-bottom:11px">'+
    tab('space','공간별 벽')+tab('section','절단선 '+(secs.length?('('+secs.length+')'):''))+'</div>';
  const foot='<div style="font-size:10.5px;letter-spacing:0.06em;color:var(--gold,#C9A961);'+
      'font-weight:700;margin:13px 0 2px">표기</div>'+
    chk('ev-dev',_elevOpt.devices,'스위치·콘센트 (설치 높이)')+
    chk('ev-col',_elevOpt.color,'화면 미리보기 색');
  let elevs=[], title='', widthKey='wallId';
  if(_elevMode==='section'){
    // ===== 절단선 모드 — 방에 갇히지 않고 원하는 자리에서 원하는 방향으로 =====
    if(!secs.some(x=>x.id===_elevSecId)) _elevSecId=secs.length?secs[0].id:null;
    const sec=secs.find(x=>x.id===_elevSecId)||null;
    const e=sec?buildSectionElevation(sec):null;
    elevs=e?[e]:[];widthKey='sectionId';
    title=e?(e.label+' · '+e.dir+' · 길이 '+e.L+'mm'):'절단선을 그어주세요';
    const dpick=v=>'<button type="button" class="btn sm ev-depth" data-v="'+v+'" style="flex:1;'+
      'padding:3px 2px;font-size:11px'+
      ((sec&&sectionDepthOf(sec)===(v?v:Infinity))?';background:rgba(201,169,97,0.25);border-color:#C9A961;color:#C9A961':'')+
      '">'+(v?(v/1000+'m'):'전부')+'</button>';
    left.innerHTML=tabs+
      '<div style="font-size:10.5px;letter-spacing:0.06em;color:var(--gold,#C9A961);font-weight:700;'+
        'margin-bottom:5px">절단선</div>'+
      (secs.length?secs.map(x=>{
        const on=(x.id===_elevSecId);
        const len=Math.round(Math.hypot(x.x2-x.x1,x.y2-x.y1));
        return '<div class="ev-sec" data-s="'+x.id+'" style="display:flex;align-items:center;gap:6px;'+
          'padding:5px 6px;margin-top:2px;border-radius:4px;font-size:11.5px;cursor:pointer;background:'+
          (on?'rgba(201,169,97,0.18)':'rgba(255,255,255,0.04)')+'">'+
          '<b style="color:var(--gold,#C9A961);width:15px">'+sectionLabelOf(x)+'</b>'+
          '<span style="flex:1;color:var(--text-secondary,#A9B0C9)">'+
            escapeHtml(x.name||'')+(x.name?' · ':'')+len+'mm</span>'+
          '<span style="color:var(--text-tertiary,#7B82B5)">'+elevCompass(sectionViewDir(x).dx,sectionViewDir(x).dy)+'</span>'+
        '</div>';}).join(''):'<div class="hint">아직 절단선이 없습니다</div>')+
      '<button type="button" class="btn sm" id="ev-newsec" style="width:100%;margin-top:7px">'+
        '✎ 도면에서 절단선 긋기 (K)</button>'+
      (sec?('<div style="font-size:10.5px;letter-spacing:0.06em;color:var(--gold,#C9A961);'+
          'font-weight:700;margin:13px 0 4px">보는 방향 · 깊이</div>'+
        '<button type="button" class="btn sm" id="ev-flip" style="width:100%">⇄ 반대쪽에서 보기 ('+
          elevCompass(sectionViewDir(sec).dx,sectionViewDir(sec).dy)+' → '+
          elevCompass(-sectionViewDir(sec).dx,-sectionViewDir(sec).dy)+')</button>'+
        '<div style="display:flex;gap:3px;margin-top:5px">'+SECTION_DEPTHS.map(dpick).join('')+'</div>'+
        '<div class="hint" style="margin-top:5px">깊이 = 절단면에서 이만큼 앞에 있는 것까지 그린다</div>'
        ):'')+
      foot+
      '<div class="hint" style="margin-top:11px">도면에 선을 긋고 어느 쪽을 볼지 고르면 그 방향의 '+
        '입면이 나옵니다. 방 하나에 갇히지 않아 여러 방을 가로질러도 됩니다.</div>';
  }else{
    // ===== 공간별 벽 모드 =====
    if(!spaces.some(x=>x.id===sid)) sid=spaces.length?spaces[0].id:null;
    elevs=sid?buildSpaceElevations(sid):[];
    const sp=STATE.spaces.find(x=>x.id===sid)||null;
    title=((sp&&(sp.name||((SPACE_TYPES[sp.type]||{}).name)))||'')+
      ' · 벽 '+elevs.length+'면 · 천장고 '+((sp&&sp.ceilingHeight_mm)||STATE.ceilingHeight)+'mm';
    left.innerHTML=tabs+
      '<div style="font-size:10.5px;letter-spacing:0.06em;color:var(--gold,#C9A961);font-weight:700;'+
        'margin-bottom:6px">공간</div>'+
      '<select id="ev-space" style="width:100%;font-size:12px">'+
        spaces.map(x=>'<option value="'+x.id+'"'+(x.id===sid?' selected':'')+'>'+
          escapeHtml(x.name||((SPACE_TYPES[x.type]||{}).name)||x.type)+'</option>').join('')+'</select>'+
      '<div style="font-size:10.5px;letter-spacing:0.06em;color:var(--gold,#C9A961);font-weight:700;'+
        'margin:13px 0 5px">벽 '+elevs.length+'면 — 보는 방향을 고를 수 있습니다</div>'+
      (elevs.length?elevs.map(e=>
        '<div class="ev-wallrow" data-w="'+e.wallId+'" style="display:flex;align-items:center;'+
          'gap:5px;padding:3px 5px;margin-top:2px;border-radius:4px;'+
          'background:rgba(255,255,255,0.04);font-size:11.5px">'+
          '<b class="ev-row" data-w="'+e.wallId+'" style="color:var(--gold,#C9A961);width:15px;cursor:pointer">'+
            e.label+'</b>'+
          '<span class="ev-row" data-w="'+e.wallId+'" style="flex:1;cursor:pointer;'+
            'color:var(--text-secondary,#A9B0C9)">'+e.dir+' · '+e.L+
            '<span style="color:var(--text-tertiary,#7B82B5)"> '+
              (e.ops.length?('문창'+e.ops.length):'')+(e.devs.length?(' 전기'+e.devs.length):'')+'</span></span>'+
          '<button type="button" class="btn sm ev-side" data-w="'+e.wallId+'" title="이 벽을 어느 쪽에서 볼지"'+
            ' style="padding:1px 6px;font-size:10.5px'+
            (e.viewSide==='out'?';background:rgba(201,169,97,0.25);border-color:#C9A961;color:#C9A961':'')+
            '">'+(e.viewSide==='out'?'밖':'안')+'</button>'+
        '</div>').join(''):'<div class="hint">벽이 없습니다</div>')+
      foot+
      '<div class="hint" style="margin-top:11px">벽 길이·천장고·문창 위치와 크기·창대 높이·마감재를 '+
        '평면도에서 그대로 읽어 그립니다. 안/밖 으로 보는 쪽을 바꿀 수 있습니다.</div>';
  }
  _elevCur={mode:_elevMode,spaceId:sid,sectionId:_elevSecId,elevs,title};
  const info=document.getElementById('ev-info');
  if(info) info.textContent=title;
  // --- 공통 손잡이 ---
  document.querySelectorAll('.ev-tab').forEach(b=>b.addEventListener('click',()=>{
    _elevMode=b.dataset.m;renderElevationDialog(sid);}));
  const bind=(id,key)=>{const el=document.getElementById(id);
    if(el) el.addEventListener('change',()=>{_elevOpt[key]=el.checked;renderElevationDialog(sid);});};
  bind('ev-dev','devices'); bind('ev-col','color');
  const selEl=document.getElementById('ev-space');
  if(selEl) selEl.addEventListener('change',ev=>renderElevationDialog(ev.target.value));
  document.querySelectorAll('.ev-side').forEach(b=>b.addEventListener('click',()=>{
    const w=STATE.walls.find(x=>x.id===b.dataset.w);
    if(!w) return;
    w.elevSide=(w.elevSide==='out')?'in':'out';
    saveHistory();renderElevationDialog(sid);
    showStatus('입면 보는 쪽: '+(w.elevSide==='out'?'벽 바깥에서':'방 안에서'));
  }));
  document.querySelectorAll('.ev-sec').forEach(r=>r.addEventListener('click',()=>{
    _elevSecId=r.dataset.s;renderElevationDialog(sid);}));
  const nb=document.getElementById('ev-newsec');
  if(nb) nb.addEventListener('click',elevationDrawSection);
  const fb=document.getElementById('ev-flip');
  if(fb) fb.addEventListener('click',()=>{
    const sec=(STATE.sections||[]).find(x=>x.id===_elevSecId);
    if(!sec) return;
    sec.side=(sec.side===-1)?1:-1;
    saveHistory();renderAll();renderElevationDialog(sid);
    showStatus('절단선 '+sectionLabelOf(sec)+' — 반대쪽에서 봅니다');
  });
  document.querySelectorAll('.ev-depth').forEach(b=>b.addEventListener('click',()=>{
    const sec=(STATE.sections||[]).find(x=>x.id===_elevSecId);
    if(!sec) return;
    sec.depth_mm=parseInt(b.dataset.v,10)||0;
    saveHistory();renderElevationDialog(sid);
  }));
  // --- 그림 ---
  const ws=elevationSetWidths(elevs);
  body.innerHTML=elevs.length
    ? elevs.map((e,i)=>'<div id="evc-'+(e[widthKey]||i)+'" style="background:#fff;border-radius:4px;'+
        'margin-bottom:12px;padding:8px;width:'+ws[i]+'">'+
        elevationSVG(e,{color:_elevOpt.color,devices:_elevOpt.devices})+'</div>').join('')
    : '<div style="color:#fff;font-size:12px;padding:8px">'+
        (_elevMode==='section'?'절단선을 그으면 여기에 입면이 나옵니다':'이 공간에는 벽이 없습니다')+'</div>';
  document.querySelectorAll('.ev-row').forEach(r=>r.addEventListener('click',()=>{
    const t=document.getElementById('evc-'+r.dataset.w);
    if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
  }));
}
// 입면도 인쇄 — A3 가로, 한 장에 4면
function printElevations(sel){
  const s=sel||_elevCur;
  if(!s||!s.elevs||!s.elevs.length){cmdToast('인쇄할 입면도가 없습니다');return;}
  const sp=STATE.spaces.find(x=>x.id===s.spaceId)||null;
  const spName=(s.mode==='section')
    ? ((s.elevs[0]&&(s.elevs[0].label+(s.elevs[0].spaceName?(' · '+s.elevs[0].spaceName):'')))||'절단선')
    : ((sp&&(sp.name||((SPACE_TYPES[sp.type]||{}).name)))||'');
  const d=new Date();
  const date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const pages=[];
  for(let i=0;i<s.elevs.length;i+=4) pages.push(s.elevs.slice(i,i+4));
  const pw=elevationSetWidths(s.elevs);
  const css='@page{size:420mm 297mm;margin:0}*{box-sizing:border-box}'+
    "body{margin:0;background:#fff;color:#000;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;"+
    '-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
    '.sheet{width:420mm;height:297mm;padding:11mm;page-break-after:always;display:flex;flex-direction:column}'+
    '.sheet:last-child{page-break-after:auto}'+
    '.hd{display:flex;align-items:baseline;gap:7mm;border-bottom:0.7mm solid #000;padding-bottom:2mm;flex:none}'+
    '.hd h1{font-size:6mm;margin:0}.hd .m{font-size:3.3mm;color:#333}.hd .p{margin-left:auto;font-size:3.3mm}'+
    '.grid{flex:1;display:flex;flex-wrap:wrap;align-content:flex-start;gap:5mm;margin-top:4mm}'+
    '.cell{width:calc(50% - 2.5mm);border:0.25mm solid #999;padding:2.5mm}';
  const html='<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>'+
    escapeHtml((STATE.projectName||'MiniCAD')+' 입면도 '+spName)+'</title><style>'+css+'</style></head><body>'+
    pages.map((pg,i)=>'<div class="sheet"><div class="hd">'+
      '<h1>'+escapeHtml(STATE.projectName||'')+' — 입면도</h1>'+
      '<div class="m">'+escapeHtml(spName)+' · 천장고 '+
        ((s.mode==='section')?(s.elevs[0]?s.elevs[0].H:STATE.ceilingHeight)
                             :((sp&&sp.ceilingHeight_mm)||STATE.ceilingHeight))+
        'mm · 단위 mm · '+date+'</div>'+
      '<div class="p">'+(i+1)+' / '+pages.length+'</div></div>'+
      '<div class="grid">'+pg.map(e=>'<div class="cell"><div style="width:'+
        pw[s.elevs.indexOf(e)]+'">'+
        elevationSVG(e,{color:false,devices:_elevOpt.devices})+'</div></div>').join('')+'</div></div>').join('')+
    '<scr'+'ipt>window.onload=function(){setTimeout(function(){window.print();},400);};</scr'+'ipt>'+
    '</body></html>';
  const w=window.open('','_blank');
  if(!w){alert('팝업이 차단되었습니다 — 팝업을 허용한 뒤 다시 인쇄하세요');return;}
  w.document.write(html);w.document.close();
  cmdToast('입면도 인쇄 — '+spName+' '+s.elevs.length+'면');
}
