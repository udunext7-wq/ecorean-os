'use strict';
// ===== UI / 패널 / 저장·로드 / 버튼 바인딩 =====
// v5.6: 라이브러리 카테고리 전환 — 도구 + UI 패널 동기화
function setLibCategory(toolName){
  // 라이브러리 패널의 현재 카테고리에 맞는 항목 표시
  rebuildLibPanel(toolName);
  cmdToast({furniture:'1 가구',fixture:'2 위생/주방',light:'3 조명',electric:'4 전기',hvac:'5 공조/소방'}[toolName]||toolName);
}
function rebuildLibPanel(toolName){
  const panel=document.getElementById('lib-panel');
  if(!panel) return;
  const lib={furniture:FURNITURE_LIB,fixture:FIXTURE_LIB,light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB}[toolName];
  if(!lib) return;
  const kindMap={furniture:'furniture',fixture:'fixtures',light:'lights',electric:'electric',hvac:'hvac'};
  panel.innerHTML='';
  Object.entries(lib).forEach(([k,d])=>{
    const btn=document.createElement('button');
    btn.className='lib-btn'+(STATE.selectedLib===k?' active':'');
    btn.dataset.libKey=k;
    btn.dataset.libKind=kindMap[toolName];
    btn.innerHTML='<span class="lib-name">'+d.name+'</span>';
    btn.addEventListener('click',()=>{
      STATE.selectedLib=k;
      panel.querySelectorAll('.lib-btn').forEach(b=>b.classList.toggle('active',b.dataset.libKey===k));
    });
    panel.appendChild(btn);
  });
  // 카테고리 탭 강조 동기화
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===toolName));
}

// v5.2: 직교 토글 함수
function toggleOrtho(){
  STATE.snap.ortho=!STATE.snap.ortho;
  const onOff=STATE.snap.ortho?'ON':'OFF';
  cmdToast('직교 (Ortho) '+onOff+' — F8 / Ctrl+L');
  updateOrthoFAB();
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
  STATE.selectedTool=tool;
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  drawState=null;STATE.measureFirst=null;polyState=null;
  drawGroup.destroyChildren();previewLayer.batchDraw();
  container.className='tool-'+tool;
  document.querySelectorAll('.libcat-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===tool));
  const libTools={furniture:FURNITURE_LIB,fixture:FIXTURE_LIB,light:LIGHT_LIB,electric:ELECTRIC_LIB,hvac:HVAC_FIRE_LIB};
  if(libTools[tool]) rebuildLibPanel(tool);
  else{const p=document.getElementById('lib-panel');if(p)p.innerHTML='';STATE.selectedLib=null;}
  showStatus('도구: '+tool);
}
document.querySelectorAll('.tool-btn').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));

// ===== 라이브러리 팝업 =====
function showLibPopup(tool,lib){
  const titles={furniture:'1 가구',fixture:'2 위생/주방',light:'3 조명',electric:'4 전기',hvac:'5 공조/소방'};
  document.getElementById('lib-popup-title').textContent=titles[tool]||'라이브러리';
  const grid=document.getElementById('lib-popup-grid');
  grid.innerHTML='';
  Object.entries(lib).forEach(([key,def])=>{
    const btn=document.createElement('button');
    btn.className='lib-btn';btn.dataset.key=key;
    const icon=def.sym?def.sym:'■';
    btn.innerHTML='<span class="lib-icon" style="color:'+def.c+'">'+icon+'</span><span>'+def.name+'</span>';
    btn.addEventListener('click',()=>{
      STATE.selectedLib=key;
      grid.querySelectorAll('.lib-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      showStatus(def.name+' 선택');
    });
    grid.appendChild(btn);
  });
  const fk=Object.keys(lib)[0];
  STATE.selectedLib=fk;
  setTimeout(()=>{const fb=grid.querySelector('[data-key="'+fk+'"]');if(fb) fb.classList.add('active');},10);
  const popup=document.getElementById('lib-popup');
  popup.style.bottom='50px';popup.style.right='10px';popup.style.top='auto';popup.style.left='auto';
  popup.classList.add('show');
}
function hideLibPopup(){document.getElementById('lib-popup').classList.remove('show');}

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
    electric:['전기','#7BA05B'],circles:['원','#C9A961'],arcs:['아크','#D4B872'],
    dimensions:['치수','#B8B0A0'],text:['주석','#F5F1EB']};
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
function buildSnapUI(){
  const list=document.getElementById('snap-list');list.innerHTML='';
  const labels={grid:['그리드 스냅','#C9A961'],endpoint:['끝점 스냅','#7BA05B'],ortho:['직교 (Shift)','#5B8DA0']};
  Object.entries(labels).forEach(([k,[name,color]])=>{
    const row=document.createElement('div');
    row.className='layer-row'+(STATE.snap[k]?'':' off');
    row.innerHTML='<span class="layer-dot" style="background:'+color+'"></span><span class="layer-name">'+name+'</span><span class="layer-eye">●</span>';
    row.addEventListener('click',()=>{
      STATE.snap[k]=!STATE.snap[k];
      row.classList.toggle('off',!STATE.snap[k]);
      showStatus(name+': '+(STATE.snap[k]?'ON':'OFF'));
    });
    list.appendChild(row);
  });
}

// ===== UI =====
function refreshUI(){refreshHeader();refreshSpaceList();refreshDetail();refreshEstimate();refreshJSON();refreshMaterial();}
function refreshHeader(){
  const ta=STATE.spaces.reduce((s,sp)=>s+spArea(sp),0);
  document.getElementById('total-area').value=ta.toFixed(2);
  document.getElementById('total-pyeong').value=(ta*0.3025).toFixed(2);
  document.getElementById('space-count').textContent=STATE.spaces.length;
  const oc=STATE.openings.length+STATE.walls.length+STATE.furniture.length+STATE.fixtures.length+STATE.lights.length+STATE.electric.length+STATE.texts.length+STATE.measures.length;
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
function refreshDetail(){
  const empty=document.getElementById('sp-empty');
  const detail=document.getElementById('sp-detail');
  const stats=document.getElementById('detail-stats-card');
  const warn=document.getElementById('detail-warn-card');
  if(!STATE.selectedKind||!STATE.selectedId){empty.style.display='block';detail.style.display='none';return;}
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
      '<input type="number" id="d-ch" value="'+(s.ceilingHeight_mm||'')+'" placeholder="'+STATE.ceilingHeight+'"></div>'+
      // v5.8: 바닥재 / 벽자재 드롭다운
      '<div class="field-row"><div class="field"><label class="field-label">바닥재</label>'+
      '<select id="d-floor">'+
      Object.entries(FLOOR_MATERIALS).map(([k,m])=>'<option value="'+k+'"'+(k===s.floorMaterial?' selected':'')+'>'+m.name+'</option>').join('')+
      '</select></div>'+
      '<div class="field"><label class="field-label">벽자재</label>'+
      '<span style="font-size:11px;color:var(--text-tertiary)">벽 선택 → 개별 설정</span>'+
      '</div></div>'+
      '<div class="field-row"><div class="field"><label class="field-label">자재 등급</label>'+
      '<select id="d-grade"><option value="STANDARD"'+(s.materialGrade==='STANDARD'?' selected':'')+'>표준</option>'+
      '<option value="PREMIUM"'+(s.materialGrade==='PREMIUM'?' selected':'')+'>프리미엄</option>'+
      '<option value="LUXURY"'+(s.materialGrade==='LUXURY'?' selected':'')+'>럭셔리</option></select></div>'+
      '<div class="field"><label class="field-label">난이도</label>'+
      '<select id="d-diff"><option value="NORMAL"'+(s.difficulty==='NORMAL'?' selected':'')+'>보통</option>'+
      '<option value="HARD"'+(s.difficulty==='HARD'?' selected':'')+'>높음</option>'+
      '<option value="VERY_HARD"'+(s.difficulty==='VERY_HARD'?' selected':'')+'>최고</option></select></div></div>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:6px">삭제 (Del)</button>';
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
    document.getElementById('d-grade').addEventListener('change',e=>{s.materialGrade=e.target.value;refreshUI();});
    document.getElementById('d-diff').addEventListener('change',e=>{s.difficulty=e.target.value;refreshUI();});
    document.getElementById('d-del').addEventListener('click',deleteSelected);
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
      '<div class="field"><label class="field-label">가로 W (mm)</label><input type="number" id="d-w" value="'+o.width_mm+'" step="50"></div>'+
      '<div class="field"><label class="field-label">세로 H (mm)</label><input type="number" id="d-h" value="'+o.height_mm+'" step="50"></div>'+
      '<div class="field"><label class="field-label">뎁스 D (mm)</label><input type="number" id="d-d" value="'+o.depth_mm+'" step="10"></div>'+
      '</div>'+
      (!isDoor?'<div class="field"><label class="field-label">창대 높이 (mm) — 바닥에서</label><input type="number" id="d-sill" value="'+(o.sillHeight_mm||0)+'" step="50"></div>':'')+
      '<div class="field"><label class="field-label">회전 (°) — 0~359</label>'+
      '<input type="number" id="d-angle" value="'+Math.round(o.angle||0)+'" step="1" min="-360" max="360"></div>'+
      '<div class="hint">통상값 자동 적용. 회전은 벽 가까이 추가 시 자동 정렬됨.</div>'+
      '<div style="display:flex;gap:4px;margin-top:6px">'+
      '<button class="btn sm" id="d-rot-90" style="flex:1">+90°</button>'+
      '<button class="btn sm" id="d-rot-m90" style="flex:1">−90°</button>'+
      '<button class="btn sm" id="d-rot-180" style="flex:1">180°</button>'+
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
    document.getElementById('d-w').addEventListener('change',e=>{o.width_mm=parseInt(e.target.value);saveHistory();renderAll();refreshUI();});
    document.getElementById('d-h').addEventListener('change',e=>{o.height_mm=parseInt(e.target.value);saveHistory();refreshUI();});
    document.getElementById('d-d').addEventListener('change',e=>{o.depth_mm=parseInt(e.target.value);saveHistory();refreshUI();});
    if(!isDoor){
      const sf=document.getElementById('d-sill');
      if(sf) sf.addEventListener('change',e=>{o.sillHeight_mm=parseInt(e.target.value);saveHistory();refreshUI();});
    }
    document.getElementById('d-angle').addEventListener('change',e=>{
      const v=parseFloat(e.target.value);
      if(isFinite(v)){o.angle=((v%360)+360)%360;saveHistory();renderAll();refreshUI();}
    });
    document.getElementById('d-rot-90').addEventListener('click',()=>{o.angle=((o.angle||0)+90)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-rot-m90').addEventListener('click',()=>{o.angle=((o.angle||0)-90+360)%360;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-rot-180').addEventListener('click',()=>{o.angle=((o.angle||0)+180)%360;saveHistory();renderAll();refreshUI();});
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
      '<div class="field"><label class="field-label">개별 높이 (mm)</label>'+
      '<input type="number" id="d-wh" value="'+(w.height_mm||'')+'" placeholder="공간 천장고 따름" step="50"></div>'+
      '<div class="field"><label class="field-label">두께 (mm)</label>'+
      '<input type="number" id="d-wthick" value="'+(w.thickness||100)+'" step="10"></div>'+
      '<button class="btn sm" id="d-dup" style="width:100%;margin-top:6px">복제</button>'+
      '<button class="btn danger sm" id="d-del" style="width:100%;margin-top:5px">삭제 (Del)</button>';
    document.getElementById('d-wmat').addEventListener('change',e=>{w.finishMaterial=e.target.value||null;saveHistory();refreshUI();showStatus('벽 마감재: '+(WALL_MATERIALS[e.target.value]?.name||'미정'));});
    document.getElementById('d-wh').addEventListener('change',e=>{w.height_mm=e.target.value?parseInt(e.target.value):null;saveHistory();refreshUI();});
    document.getElementById('d-wthick').addEventListener('change',e=>{w.thickness=parseInt(e.target.value)||100;saveHistory();renderAll();refreshUI();});
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
  else{
    const kn={wall:'벽',furniture:'가구',fixtures:'위생/주방',lights:'조명',electric:'전기',texts:'텍스트',measures:'치수'};
    const arr=getArr(STATE.selectedKind);
    const obj=arr?arr.find(x=>x.id===STATE.selectedId):null;
    const hasAngle=obj&&'angle' in obj;
    let extraHtml='';
    if(hasAngle){
      extraHtml=
        '<div class="field"><label class="field-label">회전 (°)</label>'+
        '<input type="number" id="d-angle" value="'+Math.round(obj.angle||0)+'" step="1" min="-360" max="360"></div>'+
        '<div style="display:flex;gap:4px;margin-top:6px">'+
        '<button class="btn sm" id="d-rot-90" style="flex:1">+90°</button>'+
        '<button class="btn sm" id="d-rot-m90" style="flex:1">−90°</button>'+
        '<button class="btn sm" id="d-rot-180" style="flex:1">180°</button>'+
        '</div>';
    }
    dc.innerHTML='<p style="font-size:11px;color:var(--text-secondary);margin-bottom:10px">선택: <strong style="color:var(--gold)">'+kn[STATE.selectedKind]+'</strong></p>'+
      extraHtml+
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
    document.getElementById('d-dup').addEventListener('click',duplicateSelected);
    document.getElementById('d-del').addEventListener('click',deleteSelected);
  }
}
function computeWarns(s){
  const out=[];
  if(s.type==='BATHROOM') out.push({lv:'critical',msg:'⚠ 방수 = CONDITIONAL.<div class="pre">헌법 절대규칙 #1</div>'});
  if(s.type==='BALCONY') out.push({lv:'warning',msg:'⚠ 발코니 방수 CONDITIONAL.'});
  if(!s.ceilingHeight_mm) out.push({lv:'warning',msg:'천장고 미입력.<div class="pre">NEEDS_CONFIRMATION</div>'});
  if(s.polygon.length>4) out.push({lv:'warning',msg:'다각형 '+s.polygon.length+'각.'});
  const a=spArea(s);
  if(a<1) out.push({lv:'critical',msg:'면적 비정상: '+a.toFixed(2)+'㎡'});
  if(a>100) out.push({lv:'warning',msg:'면적 매우 큼: '+a.toFixed(2)+'㎡'});
  return out;
}

// *** 견적 카탈로그 24종 (요구사항 #5) ***
function refreshEstimate(){
  let tf=0,tw=0,tp=0,twa=0;
  STATE.spaces.forEach(s=>{tf+=spArea(s);tw+=spWall(s);tp+=spPeri(s);if(s.type==='BATHROOM'||s.type==='BALCONY') twa+=spArea(s);});
  document.getElementById('t-floor').textContent=tf.toFixed(2);
  document.getElementById('t-wall').textContent=tw.toFixed(2);
  document.getElementById('t-ceiling').textContent=tf.toFixed(2);
  document.getElementById('t-peri').textContent=tp.toFixed(2);
  document.getElementById('t-water').textContent=twa.toFixed(2);
  document.getElementById('t-open').textContent=STATE.openings.length;
  
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
// 외부 클릭 시 컨텍스트 메뉴 닫기
document.addEventListener('mousedown',e=>{
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
  sink_k:{tag:'kitchen',kw:'single-bowl stainless steel kitchen sink'},
  sink_k_double:{tag:'kitchen',kw:'double-bowl stainless steel kitchen sink'},
  stove:{tag:'kitchen',kw:'4-burner gas stove'},
  induction:{tag:'kitchen',kw:'4-zone induction cooktop'},
  oven:{tag:'kitchen',kw:'built-in oven'},
  microwave:{tag:'kitchen',kw:'countertop microwave oven'},
  fridge:{tag:'kitchen',kw:'tall refrigerator'},
  fridge_2door:{tag:'kitchen',kw:'side-by-side double-door refrigerator'},
  dishwasher:{tag:'kitchen',kw:'built-in dishwasher'},
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
  // ===== ELECTRIC_LIB (11종) =====
  outlet_w:{tag:'outlet',kw:'2-gang wall outlet'},
  outlet_w4:{tag:'outlet',kw:'4-gang wall outlet'},
  outlet_f:{tag:'outlet',kw:'floor outlet'},
  switch_1:{tag:'switch',kw:'single light switch'},
  switch_2:{tag:'switch',kw:'2-gang light switch'},
  switch_3:{tag:'switch',kw:'3-gang light switch'},
  internet:{tag:'data_outlet',kw:'internet and TV outlet panel'},
  ac:{tag:'split_ac',kw:'wall-mounted split air conditioner'},
  ac_floor:{tag:'split_ac',kw:'floor-standing split air conditioner'},
  intercom:{tag:'intercom',kw:'intercom panel'},
  boiler_ctrl:{tag:'boiler_control',kw:'boiler control panel'},
  // ===== HVAC_FIRE_LIB (15종) =====
  ac_ceiling:{tag:'system_ac',kw:'ceiling cassette air conditioning unit'},
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
  for(const s of STATE.spaces){
    if(pointInPolygon(p,s.polygon)) return s.id;
  }
  return null;
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

// v5.7: 도어를 가장 가까운 벽에 매핑 (parentId)
function findNearestWallId(o){
  let bestId=null,bestD=Infinity;
  STATE.walls.forEach(w=>{
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
      layers[ln]={
        element:ln.split('-')[1]||defaultElem,
        spaceCode:sp?SPACE_TYPES[sp.type].code:null,
        spaceName:sp?sp.name:null,
        spaceType:sp?sp.type:null,
        color:sp?SPACE_TYPES[sp.type].color:'#C9A961',
        objectIds:[],
      };
    }
    layers[ln].objectIds.push(o.id);
  });
  STATE.spaces.forEach(s=>{
    const ln=s.layerName||('A-AREA-'+SPACE_TYPES[s.type].code);
    layers[ln]={element:'AREA',spaceCode:SPACE_TYPES[s.type].code,spaceName:s.name,
      spaceType:s.type,color:SPACE_TYPES[s.type].color,objectIds:[s.id]};
  });
  collect(STATE.walls,'WALL');
  collect(STATE.openings.filter(o=>o.type==='DOOR'),'DOOR');
  collect(STATE.openings.filter(o=>o.type==='WINDOW'),'WIND');
  collect(STATE.furniture,'FURN');collect(STATE.fixtures,'FIXT');
  collect(STATE.lights,'LITE');collect(STATE.electric,'ELEC');
  collect(STATE.hvac,'HVAC');
  collect(STATE.circles,'CIRC');collect(STATE.arcs,'ARC');

  // v5.7: 객체별 의미 태그/프롬프트 키워드/배치 자동 산정
  const enrichLib=(arr,kindElem)=>arr.map(o=>{
    const sm=semanticOf(o.type);
    const sp=o.spaceId?STATE.spaces.find(s=>s.id===o.spaceId):null
            ||STATE.spaces.find(s=>s.id===findContainingSpace({x:o.x,y:o.y}));
    return{
      ...o,
      flipped:!!o.flipped,
      semanticTag:sm.tag,
      promptKeyword:sm.kw,
      placement:placementOf(o,sp),
      parentSpaceId:sp?sp.id:'NEEDS_CONFIRMATION',
    };
  });

  // v5.7: 도어/창은 parentWallId 추가
  const enrichOpenings=STATE.openings.map(o=>({
    ...o,
    semanticTag:o.type==='DOOR'?'door':'window',
    promptKeyword:o.type==='DOOR'?'interior door':'window with view',
    parentWallId:findNearestWallId(o)||'NEEDS_CONFIRMATION',
    parentSpaceId:o.spaceId||'NEEDS_CONFIRMATION',
  }));

  // v5.7: 명시적 관계 그래프
  const relationships=[];
  enrichOpenings.forEach(o=>{
    if(o.parentWallId&&o.parentWallId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentWallId,type:'embedded_in_wall'});
    if(o.parentSpaceId&&o.parentSpaceId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentSpaceId,type:'opens_into_space'});
  });
  ['furniture','fixtures','lights','electric','hvac'].forEach(k=>{
    enrichLib(STATE[k]).forEach(o=>{
      if(o.parentSpaceId&&o.parentSpaceId!=='NEEDS_CONFIRMATION') relationships.push({from:o.id,to:o.parentSpaceId,type:'contained_in_space'});
    });
  });
  // 인접 공간(공유 도어로 연결된 두 공간)
  const doorPairs={};
  enrichOpenings.filter(o=>o.type==='DOOR').forEach(d=>{
    if(d.parentWallId&&d.parentWallId!=='NEEDS_CONFIRMATION'){
      doorPairs[d.parentWallId]=doorPairs[d.parentWallId]||[];
      if(d.parentSpaceId&&d.parentSpaceId!=='NEEDS_CONFIRMATION') doorPairs[d.parentWallId].push(d.parentSpaceId);
    }
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

  return{
    schema:'ECOREAN.FloorPlan.v5.8',
    vertices:STATE.vertices,  // VEF: 공유 버텍스 원본
    meta:{
      project:STATE.projectName,
      unit:'mm',
      ceilingHeight_mm:STATE.ceilingHeight,
      drawnAt:new Date().toISOString(),
      tool:'ECOREAN MiniCAD v5.8',
      coordOrigin:{x:0,y:0,units:'mm',rotation_deg:0},
      layerNamingScheme:'A-{ELEMENT}-{SPACECODE}-{INDEX02}',
      elementCodes:['AREA','WALL','DOOR','WIND','FURN','FIXT','LITE','ELEC','HVAC','CIRC','ARC','DIMS','ANNO'],
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
    spaces:STATE.spaces.map(s=>({
      id:s.id,name:s.name,type:s.type,typeIndex:s.typeIndex||1,
      layerName:s.layerName||makeLayerName('AREA',s),
      ksCode:SPACE_TYPES[s.type].ks,
      code:SPACE_TYPES[s.type].code,
      color:SPACE_TYPES[s.type].color,
      polygon:s.polygon,
      ceilingHeight_mm:s.ceilingHeight_mm||STATE.ceilingHeight,
      materialGrade:s.materialGrade,difficulty:s.difficulty,
      waterproofRecommended:SPACE_TYPES[s.type].waterproof?'CONDITIONAL':false, // 헌법: AUTO 금지
      area_m2:parseFloat(spArea(s).toFixed(4)),
      perimeter_m:parseFloat(spPeri(s).toFixed(4)),
      wallArea_m2:parseFloat(spWall(s).toFixed(4)),
      // v5.8: 자재 선정 (사용자 드롭다운 입력)
      floorMaterial:s.floorMaterial||'UNDECIDED',
      floorMaterialName:FLOOR_MATERIALS[s.floorMaterial||'UNDECIDED'].name,
      // v5.7: AI 친화 시맨틱
      semanticTag:'space_'+SPACE_TYPES[s.type].code.toLowerCase(),
      promptDescriptor:(s.name||SPACE_TYPES[s.type].name)+', '+parseFloat(spArea(s).toFixed(2))+'sqm, '+SPACE_TYPES[s.type].code.toLowerCase(),
    })),
    walls:STATE.walls.map(w=>({...w,semanticTag:w.spaceId?'interior_partition':'free_wall'})),
    openings:enrichOpenings,
    furniture:enrichLib(STATE.furniture,'FURN'),
    fixtures:enrichLib(STATE.fixtures,'FIXT'),
    lights:enrichLib(STATE.lights,'LITE'),
    electric:enrichLib(STATE.electric,'ELEC'),
    hvac:enrichLib(STATE.hvac,'HVAC'),
    texts:STATE.texts,measures:STATE.measures,
    circles:STATE.circles,arcs:STATE.arcs,
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
      unitPrice:'NEEDS_RESEARCH',
    });
  });
  let tf=0,tw=0,tp=0,twa=0;
  STATE.spaces.forEach(s=>{tf+=spArea(s);tw+=spWall(s);tp+=spPeri(s);if(s.type==='BATHROOM'||s.type==='BALCONY') twa+=spArea(s);});
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
      needsConfirmation:STATE.spaces.filter(s=>!s.ceilingHeight_mm).map(s=>({spaceId:s.id,field:'ceilingHeight_mm',reason:'천장고 미입력'})),
    },
  };
}
function refreshJSON(){
  const t=JSON.stringify(buildJSON(),null,2);
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
function getArr(kind){return{space:STATE.spaces,wall:STATE.walls,opening:STATE.openings,furniture:STATE.furniture,fixtures:STATE.fixtures,lights:STATE.lights,electric:STATE.electric,texts:STATE.texts,measures:STATE.measures,circles:STATE.circles,arcs:STATE.arcs,hvac:STATE.hvac}[kind];}

// v5.7: 다중 선택 헬퍼 — boxSelection 우선, 비어있으면 단일 selected
function getSelectedTargets(){
  if(STATE.boxSelection.length>0) return [...STATE.boxSelection];
  if(STATE.selectedKind&&STATE.selectedId) return [{kind:STATE.selectedKind,id:STATE.selectedId}];
  return [];
}

function rotateSelected(){
  // 공간 선택 시: 점·선·면·벽·치수 포함 전체 회전 — 각도 입력 모드
  if(STATE.selectedKind==='space'&&STATE.selectedId){
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
    obj.angle=((obj.angle||0)+90)%360; n++;
  });
  if(n===0) return;
  saveHistory();renderAll();showStatus('회전 90° ('+n+'개)');
}
function duplicateSelected(){
  const targets=getSelectedTargets();
  if(targets.length===0) return;
  const newSel=[];
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    const copy=JSON.parse(JSON.stringify(obj));
    copy.id=makeId(t.kind.charAt(0));
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
function deleteSelected(){
  const targets=getSelectedTargets();
  if(targets.length===0) return;
  targets.forEach(t=>{
    if(t.kind==='space'){
      STATE.spaces=STATE.spaces.filter(x=>x.id!==t.id);
      STATE.openings=STATE.openings.filter(o=>o.spaceId!==t.id);
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
  cleanupOrphanVertices();
  saveHistory();renderAll();refreshUI();showStatus('삭제 ('+targets.length+'개)');
}

// ===== 토글 =====
function toggleGrid(){STATE.showGrid=!STATE.showGrid;document.getElementById('btn-grid').classList.toggle('gold',STATE.showGrid);drawGrid();showStatus('그리드: '+(STATE.showGrid?'ON':'OFF'));}
function toggleDim(){STATE.showDimensions=!STATE.showDimensions;document.getElementById('btn-dim').classList.toggle('gold',STATE.showDimensions);renderAll();showStatus('치수: '+(STATE.showDimensions?'ON':'OFF'));}
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
  const newZoom=Math.max(0.2,Math.min(5,oldZoom*factor));
  if(newZoom===oldZoom) return;
  const cx=stage.width()/2,cy=stage.height()/2;
  STATE.offsetX=cx-(cx-STATE.offsetX)*(newZoom/oldZoom);
  STATE.offsetY=cy-(cy-STATE.offsetY)*(newZoom/oldZoom);
  STATE.zoom=newZoom;
  drawGrid();renderAll();
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
}
function zoomFit(){
  if(STATE.spaces.length===0){STATE.zoom=1;STATE.offsetX=200;STATE.offsetY=100;drawGrid();renderAll();document.getElementById('zoom-pct').textContent='100%';return;}
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  STATE.spaces.forEach(s=>s.polygon.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}));
  const wMm=maxX-minX,hMm=maxY-minY,padding=120;
  const zw=(stage.width()-padding*2)/((wMm/1000)*STATE.scale);
  const zh=(stage.height()-padding*2)/((hMm/1000)*STATE.scale);
  STATE.zoom=Math.min(zw,zh,3);
  STATE.offsetX=padding-mmToPx(minX);
  STATE.offsetY=padding-mmToPx(minY);
  drawGrid();renderAll();
  document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
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
        STATE.projectName=d.meta.project||'불러온 프로젝트';
        STATE.ceilingHeight=d.meta.ceilingHeight_mm||2400;
        STATE.vertices=d.vertices||[];
        STATE.spaces=d.spaces||[];STATE.walls=d.walls||[];
        STATE.openings=d.openings||[];STATE.furniture=d.furniture||[];
        STATE.fixtures=d.fixtures||[];STATE.lights=d.lights||[];
        STATE.electric=d.electric||[];STATE.texts=d.texts||[];
        STATE.measures=d.measures||[];
        // v5.7: 데이터 손실 버그 수정 — circles/arcs/hvac 누락 보충
        STATE.circles=d.circles||[];
        STATE.arcs=d.arcs||[];
        STATE.hvac=d.hvac||[];
        // v5.7: AI 프롬프트 힌트 복구 (있으면 덮어씀)
        if(d.meta.aiPromptHints) STATE.aiPromptHints={...STATE.aiPromptHints,...d.meta.aiPromptHints};
        // v5.7: 구버전(v5.0~v5.6) 마이그레이션
        migrateLoadedState(d.schema);
        document.getElementById('project-name').value=STATE.projectName;
        document.getElementById('ceiling-height').value=STATE.ceilingHeight;
        saveHistory();renderAll();refreshUI();
        showStatus('불러옴 ('+d.schema+' → v5.7 마이그레이션)');
      }catch(err){alert('파일 읽기 실패: '+err.message);}
    };
    r.readAsText(f);
  };
  input.click();
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

// ===== 인쇄 =====
// v5.7: 인쇄 시 2.5D 강제 OFF (시공 도면은 평면 모드만 허용)
function printPlan(){
  const wasPlus2D=STATE.plus2D;
  if(wasPlus2D){STATE.plus2D=false;renderAll();}
  const dataURL=stage.toDataURL({pixelRatio:2,mimeType:'image/png'});
  if(wasPlus2D){STATE.plus2D=true;renderAll();} // 원래 상태 복구
  const w=window.open('','_blank');
  if(!w){alert('팝업 차단');return;}
  w.document.write('<html><head><title>'+STATE.projectName+'</title>'+
    '<style>body{margin:0;padding:20px;background:white;font-family:sans-serif;text-align:center}'+
    'h1{font-size:18px;margin-bottom:8px}p{font-size:11px;color:#666}img{max-width:100%;border:1px solid #ddd}'+
    '@media print{body{padding:0}h1{font-size:14px}}</style></head>'+
    '<body><h1>'+STATE.projectName+'</h1>'+
    '<p>면적: '+document.getElementById('total-area').value+'㎡ · 평수: '+document.getElementById('total-pyeong').value+'평 · 평면 모드 (시공 도면)</p>'+
    '<img src="'+dataURL+'" onload="setTimeout(()=>window.print(),300)"></body></html>');
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

  // 2) JSON SSoT
  const json=buildJSON();
  json.meta.ssotPipeline.plus2D_active=false; // export 시점은 강제 OFF
  json.meta.ssotPipeline.note='AI bundle export — 평면 모드 (AI vision 친화 보장)';

  // 3) 공간별 이미지 생성 프롬프트 텍스트 조립
  const imgPrompts=[];
  imgPrompts.push('# ECOREAN MiniCAD v5.7 — 이미지 생성 프롬프트 묶음');
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
  vidLines.push('# ECOREAN MiniCAD v5.7 — 영상 생성 프롬프트');
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
  downloadText(dxfText,safe+'_v5.8.dxf','application/dxf');
  showStatus('DXF 내보내기 완료 — AutoCAD R12 호환 ('+lyrs.size+'개 레이어)');
}

function importDXF(text){
  // ASCII DXF R12/R14 파서 — LINE → 벽, 닫힌 POLYLINE → 공간
  const rows=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const pairs=[];
  for(let i=0;i+1<rows.length;i+=2) pairs.push({c:parseInt(rows[i].trim(),10),v:rows[i+1].trim()});

  let newWalls=0,newSpaces=0,i=0;
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
        STATE.walls.push(makeWallVEF(dv1.id,dv2.id,{thickness:100,layerName:lyr}));
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
    } else { i++; }
  }
  STATE.videoSequenceOrder=null; // 공간 변경 시 자동 순서 초기화
  saveHistory();renderAll();refreshUI();
  showStatus('DXF 가져오기 완료 — 벽 '+newWalls+'개 · 공간 '+newSpaces+'개');
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
}));

// ===== 버튼 =====
document.getElementById('btn-undo').addEventListener('click',undo);
document.getElementById('btn-redo').addEventListener('click',redo);
document.getElementById('btn-grid').addEventListener('click',toggleGrid);
document.getElementById('btn-dim').addEventListener('click',toggleDim);
document.getElementById('btn-2_5d').addEventListener('click',toggle2_5D); // v5.7
document.getElementById('btn-ai-bundle').addEventListener('click',exportAIBundle); // v5.7
document.getElementById('btn-print').addEventListener('click',printPlan);
// v5.8 Task 3: DXF
document.getElementById('btn-dxf-export').addEventListener('click',exportDXF);
document.getElementById('btn-dxf-import').addEventListener('click',()=>document.getElementById('dxf-file-input').click());
document.getElementById('dxf-file-input').addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{importDXF(ev.target.result);};
  reader.readAsText(file,'utf-8');
  e.target.value=''; // 같은 파일 재선택 허용
});
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
document.getElementById('btn-clear-all').addEventListener('click',()=>{
  if(STATE.spaces.length===0&&STATE.walls.length===0) return;
  if(!confirm('모든 객체를 삭제할까요?')) return;
  STATE.spaces=[];STATE.walls=[];STATE.openings=[];
  STATE.furniture=[];STATE.fixtures=[];STATE.lights=[];STATE.electric=[];
  STATE.texts=[];STATE.measures=[];STATE.estimateConfig={};
  STATE.selectedKind=null;STATE.selectedId=null;
  saveHistory();renderAll();refreshUI();showStatus('전체 삭제');
});
document.getElementById('btn-export').addEventListener('click',()=>{
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab==='estimate'));
  document.querySelectorAll('.tab-content').forEach(x=>x.classList.toggle('active',x.dataset.tabContent==='estimate'));
});
document.getElementById('btn-copy-json').addEventListener('click',()=>copyToClipboard(JSON.stringify(buildJSON(),null,2)));
document.getElementById('btn-help').addEventListener('click',()=>{
  document.getElementById('canvas-help').classList.toggle('visible');
});
document.getElementById('snap-unit').addEventListener('change',e=>{STATE.gridSize=parseInt(e.target.value);drawGrid();showStatus('스냅 거리: '+e.target.value+'mm');});
document.getElementById('ceiling-height').addEventListener('change',e=>{STATE.ceilingHeight=parseInt(e.target.value);refreshUI();});
document.getElementById('project-name').addEventListener('change',e=>{STATE.projectName=e.target.value;});
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
  // 외부 클릭 시 닫기
  document.addEventListener('mousedown',e=>{
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
    if(cmd.trim()){processCommand(cmd);inp.value='';inp.blur();}
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
  if(/^(l|line)$/i.test(c)){setTool('line');return;}
  if(/^(b|wall|벽)$/i.test(c)){setTool('wall');return;}

  // del / delete
  if(/^(del|delete|d)$/i.test(c)){deleteSelected();cmdToast('삭제');return;}

  // r [angle] — 회전
  const rotM=c.match(/^r\s+(-?\d+\.?\d*)$/i);
  if(rotM){const ang=parseFloat(rotM[1]);rotateSelectedBy(ang);return;}

  // m x,y — 이동
  const mvM=c.match(/^m\s+(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/i);
  if(mvM){moveSelectedBy(parseFloat(mvM[1]),parseFloat(mvM[2]));return;}

  // cp x,y — 복제
  const cpM=c.match(/^cp\s+(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/i);
  if(cpM){duplicateSelectedAt(parseFloat(cpM[1]),parseFloat(cpM[2]));return;}

  // @x,y — 상대 좌표
  const relM=c.match(/^@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if(relM){handleRelativeCoord(parseFloat(relM[1]),parseFloat(relM[2]));return;}

  // W,H,D — 도어/창 3차원 크기
  const d3M=c.match(/^(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)$/);
  if(d3M){handleSizeInput(parseFloat(d3M[1]),parseFloat(d3M[2]),parseFloat(d3M[3]));return;}

  // WxHxD 또는 W×H×D
  const xM=c.match(/^(\d+\.?\d*)\s*[x×]\s*(\d+\.?\d*)(?:\s*[x×]\s*(\d+\.?\d*))?$/i);
  if(xM){handleSizeInput(parseFloat(xM[1]),parseFloat(xM[2]),xM[3]?parseFloat(xM[3]):null);return;}

  // x,y — 절대좌표 또는 2D 크기
  const absM=c.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if(absM){handleAbsoluteOrSize(parseFloat(absM[1]),parseFloat(absM[2]));return;}

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
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 거리(mm) 입력');return true;}
    offsetState={distance:num};
    exitCmdMode();
    cmdToast('거리 '+num+'mm 설정 — 옵셋할 객체 클릭');
    return true;
  }

  // ===== circlespace-r: 원형공간 반지름 =====
  if(mode==='circlespace-r'){
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    const{cx,cy}=STATE.cmdData;
    addCircleSpace(cx,cy,num);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    return true;
  }
  // v5.3 ===== circle-r: 원 반지름 =====
  if(mode==='circle-r'){
    const num=parseFloat(c);
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
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 반지름(mm) 입력');return true;}
    STATE.cmdData.r=num;
    enterCmdMode('arc-start',STATE.cmdData,'시작각(°):','시작 각도 (0=동쪽, 90=북, 180=서, 270=남)');
    return true;
  }
  if(mode==='arc-start'){
    const num=parseFloat(c);
    if(!isFinite(num)){cmdToast('각도(°) 입력');return true;}
    STATE.cmdData.startAngle=num;
    enterCmdMode('arc-end',STATE.cmdData,'끝각(°):','끝 각도 (시계방향)');
    return true;
  }
  if(mode==='arc-end'){
    const num=parseFloat(c);
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
    const num=parseFloat(c);
    if(!isFinite(num)||num<=0){cmdToast('양수 폭(mm) 입력 필요');return true;}
    STATE.cmdData.w=Math.round(num);
    enterCmdMode('rect-h',STATE.cmdData,'높이(mm):','세로 길이 입력 후 Enter');
    return true;
  }
  // ===== rect-h: 높이 입력 → 사각공간 생성 =====
  if(mode==='rect-h'){
    const num=parseFloat(c);
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
    // @dx,dy 형식도 허용
    const relM=c.match(/^@\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if(relM){
      const dx=parseFloat(relM[1]),dy=parseFloat(relM[2]);
      const s=drawState.start;
      isLineMode?addLine(s.x,s.y,s.x+dx,s.y+dy):addWall(s.x,s.y,s.x+dx,s.y+dy);
      drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
      exitCmdMode();
      cmdToast((isLineMode?'선':'벽')+' 추가: '+Math.round(Math.sqrt(dx*dx+dy*dy))+'mm');
      return true;
    }
    const num=parseFloat(c);
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
    isLineMode?addLine(s.x,s.y,endX,endY):addWall(s.x,s.y,endX,endY);
    drawState=null;drawGroup.destroyChildren();previewLayer.batchDraw();
    exitCmdMode();
    cmdToast('벽 '+Math.round(num)+'mm 추가');
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
    const r=parseFloat(c);
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
      const num=parseFloat(c);
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

  // ===== rotate-space: 공간 회전 각도 입력 =====
  if(mode==='rotate-space'){
    const ang=parseFloat(c);
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
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    if('x' in obj){obj.x+=dx;obj.y+=dy;}
    if('v1Id' in obj){
      moveVertex(obj.v1Id,obj.x1+dx,obj.y1+dy);
      moveVertex(obj.v2Id,obj.x2+dx,obj.y2+dy);
    } else if('x1' in obj){
      obj.x1+=dx;obj.y1+=dy;obj.x2+=dx;obj.y2+=dy;
    }
    if('vertexIds' in obj){
      obj.vertexIds.forEach(vid=>{const v=getVertex(vid);if(v){v.x=Math.round(v.x+dx);v.y=Math.round(v.y+dy);}});
    } else if(obj.polygon){
      obj.polygon=obj.polygon.map(p=>({x:p.x+dx,y:p.y+dy}));
    }
    n++;
  });
  if(n===0) return;
  saveHistory();renderAll();refreshUI();
  cmdToast('이동: '+dx+','+dy+'mm ('+n+'개)');
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
    obj.angle=((obj.angle||0)+angle)%360; n++;
  });
  if(n===0){cmdToast('회전 가능 객체 없음');return;}
  saveHistory();renderAll();
  cmdToast('회전 '+angle+'° ('+n+'개)');
}

function duplicateSelectedAt(dx,dy){
  const targets=getSelectedTargets();
  if(targets.length===0){cmdToast('객체 선택 필요');return;}
  const newSel=[];
  targets.forEach(t=>{
    const arr=getArr(t.kind); if(!arr) return;
    const obj=arr.find(x=>x.id===t.id); if(!obj) return;
    const copy=JSON.parse(JSON.stringify(obj));
    copy.id=makeId(t.kind.charAt(0));
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
  alert(`ECOREAN MiniCAD v5.1 — AutoCAD 스타일 단계별 입력

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
  // 정다각형 도구 활성 시 — 꼭짓점 수 입력
  if(tool==='polygon'){
    polyState=null;
    enterCmdMode('polygon-n',{},'꼭짓점 수:','3~20 정수 입력 (예: 6 = 정육각형)');
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
buildSpaceTypeUI();buildLayerUI();buildSnapUI();
drawGrid();saveHistory();refreshUI();
document.getElementById('btn-grid').classList.add('gold');
document.getElementById('btn-dim').classList.add('gold');
setTimeout(handleResize,100);setTimeout(handleResize,500);
document.getElementById('cmd-hint').textContent=CMD_HINTS.select;
document.getElementById('loading').classList.add('hidden');

// v5.2: 모바일 감지
STATE.isMobile=/Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent)||(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);

// v5.2: 직교 FAB
document.getElementById('ortho-fab').addEventListener('click',toggleOrtho);
updateOrthoFAB();

// 정다각형 도구에서는 닫기 FAB 사용 안 함
document.getElementById('polyclose-fab').addEventListener('click',()=>{});

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

// v5.2: 핀치 줌 + 2손가락 패닝
let pinchState=null;
container.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    e.preventDefault();
    isPanning=false;isMouseDown=false;mouseDownPos=null;
    const t1=e.touches[0],t2=e.touches[1];
    const dx=t2.clientX-t1.clientX, dy=t2.clientY-t1.clientY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const cx=(t1.clientX+t2.clientX)/2, cy=(t1.clientY+t2.clientY)/2;
    const rect=container.getBoundingClientRect();
    pinchState={dist,cx:cx-rect.left,cy:cy-rect.top,zoom:STATE.zoom,offsetX:STATE.offsetX,offsetY:STATE.offsetY};
  }
},{passive:false});
container.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&pinchState){
    e.preventDefault();
    const t1=e.touches[0],t2=e.touches[1];
    const dx=t2.clientX-t1.clientX, dy=t2.clientY-t1.clientY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const cx=(t1.clientX+t2.clientX)/2, cy=(t1.clientY+t2.clientY)/2;
    const rect=container.getBoundingClientRect();
    const lcx=cx-rect.left, lcy=cy-rect.top;
    const scale=dist/pinchState.dist;
    const newZoom=Math.max(0.2,Math.min(5,pinchState.zoom*scale));
    STATE.offsetX=lcx-(pinchState.cx-pinchState.offsetX)*(newZoom/pinchState.zoom);
    STATE.offsetY=lcy-(pinchState.cy-pinchState.offsetY)*(newZoom/pinchState.zoom);
    STATE.offsetX+=(lcx-pinchState.cx);
    STATE.offsetY+=(lcy-pinchState.cy);
    STATE.zoom=newZoom;
    drawGrid();renderAll();
    document.getElementById('zoom-pct').textContent=Math.round(STATE.zoom*100)+'%';
  }
},{passive:false});
container.addEventListener('touchend',e=>{
  if(e.touches.length<2) pinchState=null;
});


console.log('%c ECOREAN MiniCAD v5.8 ','background:#C9A961;color:#0A0A0A;font-weight:bold;padding:4px 8px;');
console.log('  v5.8 신규: 공간 변 스냅 / 라이브러리 객체 드래그 / 벽 교차 자동 vertex 분할 / 공정별 합산표 / 바닥재·벽자재 드롭다운');
console.log('  v5.8 완성: SEMANTIC_MAP 79종 / 자체 테스트 스위트 (?test=1)');
console.log('  v5.7 유지: 2.5D 토글 / AI 생성 파이프라인 SSoT JSON / exportAIBundle');
console.log('  헌법: 단가 추정 금지·NEEDS_CONFIRMATION·방수 CONDITIONAL·mm 정수·평면 모드 기본·인쇄/JSON 시 2.5D 강제 OFF');
console.log('L=선/벽 (AutoCAD) / 라이브러리 5개 통합 (1~5) / 공조·소방 15종 / 옵셋(O) + 미러(mi)');
console.log('Stage:',stage.width(),'×',stage.height(),' / 모바일:',STATE.isMobile);

}
