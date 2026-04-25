# -*- coding: utf-8 -*-
"""ECOREAN BOC v1 — 전체 버그 수정 및 개선 스크립트"""
import re, sys

with open('ECOREAN_BOC_v1.html', 'r', encoding='utf-8') as f:
    html = f.read()

# ══════════════════════════════════════════════════════════════════════
# [1] KPI 상단바 HTML — 5개 항목 (공급가/도급/최종합계/㎡단가/평단가)
# ══════════════════════════════════════════════════════════════════════
OLD_KPI_HTML = '''  <div class="hkpis">
    <div class="hkpi"><div class="hkpiv" id="hv1">₩0</div><div class="hkpil">VAT포함 합계</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv2">—</div><div class="hkpil">㎡당 단가</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv3">0</div><div class="hkpil">저장 프로젝트</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv4" style="color:var(--orange)">0</div><div class="hkpil">승인 대기</div></div>
  </div>'''
NEW_KPI_HTML = '''  <div class="hkpis">
    <div class="hkpi"><div class="hkpiv" id="hv1">₩0</div><div class="hkpil">공급가</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv2">₩0</div><div class="hkpil">도급</div></div>
    <div class="hkpi hkpi-final"><div class="hkpiv hkpiv-final" id="hv3">₩0</div><div class="hkpil">최종합계</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv4">—</div><div class="hkpil">㎡단가</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv5">—</div><div class="hkpil">평단가</div></div>
    <div class="hkpi hkpi-cnt"><div class="hkpiv" id="hv-proj" style="color:#888">0</div><div class="hkpil">프로젝트</div></div>
    <div class="hkpi hkpi-cnt"><div class="hkpiv" id="hv-pend" style="color:var(--orange)">0</div><div class="hkpil">승인대기</div></div>
  </div>'''
if OLD_KPI_HTML in html:
    html = html.replace(OLD_KPI_HTML, NEW_KPI_HTML)
    print('[1] KPI HTML OK')
else:
    print('[1] KPI HTML SKIP — already changed')

# ══════════════════════════════════════════════════════════════════════
# [1b] KPI 상단바 CSS 추가 (기존 .hkpi override 블록 뒤)
# ══════════════════════════════════════════════════════════════════════
KPI_CSS_OLD = '''.hkpi:last-child { border-right: none !important }
.hkpi:hover { background: rgba(201,168,76,.06) !important }
.hkpiv     { font-size: 20px !important; font-weight: 700 !important; font-family: var(--font-mono) !important }
.hkpil     { font-size: 9.5px !important; letter-spacing: .1em !important }

.hkpi:nth-child(1) .hkpiv { color: var(--gold-bright) !important }
.hkpi:nth-child(2) .hkpiv { color: #e8e8f0 !important }
.hkpi:nth-child(3) .hkpiv { color: #e8e8f0 !important }
.hkpi:nth-child(4) .hkpiv { color: var(--red) !important }'''
KPI_CSS_NEW = '''.hkpi:last-child { border-right: none !important }
.hkpi:hover { background: rgba(201,168,76,.06) !important }
.hkpiv     { font-size: 18px !important; font-weight: 700 !important; font-family: var(--font-mono) !important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.hkpil     { font-size: 9px !important; letter-spacing: .08em !important; color:rgba(201,168,76,.55) !important; text-transform:uppercase }
/* 개별 컬럼 컬러 */
.hkpi:nth-child(1) .hkpiv { color: #c8c8d8 !important }
.hkpi:nth-child(2) .hkpiv { color: #c8c8d8 !important }
.hkpi-final        { background: rgba(201,168,76,.08) !important; border-left: 2px solid rgba(201,168,76,.35) !important; border-right: 2px solid rgba(201,168,76,.35) !important }
.hkpiv-final       { color: var(--gold-bright) !important; font-size: 20px !important }
.hkpi:nth-child(4) .hkpiv { color: #e0e0ec !important }
.hkpi:nth-child(5) .hkpiv { color: #e0e0ec !important }
.hkpi-cnt          { min-width: 70px !important; opacity:.7 }
.hkpi-cnt .hkpiv   { font-size: 14px !important }'''
if KPI_CSS_OLD in html:
    html = html.replace(KPI_CSS_OLD, KPI_CSS_NEW)
    print('[1b] KPI CSS OK')
else:
    print('[1b] KPI CSS SKIP')

# ══════════════════════════════════════════════════════════════════════
# [1c] KPI JS 업데이트 — recalc()에서 hv1-hv5 모두 설정
# ══════════════════════════════════════════════════════════════════════
OLD_RECALC_KPI = '''  safeTxt('hv1', fmt(safeNum(final)));
  safeTxt('hv2', t.fa>0?(Math.round(safeNum(final/t.fa))).toLocaleString()+'/㎡':'—');'''
NEW_RECALC_KPI = '''  // 상단바 KPI 5종 업데이트
  safeTxt('hv1', fmt(safeNum(totalSup)));
  safeTxt('hv2', fmt(safeNum(contract)));
  safeTxt('hv3', fmt(safeNum(final)));
  safeTxt('hv4', t.fa>0?(Math.round(safeNum(final/t.fa))).toLocaleString()+'/㎡':'—');
  safeTxt('hv5', t.fa>0?fmt(safeNum(final/(t.fa/3.306)))+'/평':'—');'''
if OLD_RECALC_KPI in html:
    html = html.replace(OLD_RECALC_KPI, NEW_RECALC_KPI)
    print('[1c] recalc KPI OK')
else:
    print('[1c] recalc KPI SKIP')

# generateAll() KPI 업데이트
OLD_GEN_KPI = '''  safeTxt('hv1', fmt(final));
  safeTxt('hv2', totals.fa>0?Math.round(final/totals.fa).toLocaleString()+'/㎡':'—');'''
NEW_GEN_KPI = '''  safeTxt('hv1', fmt(totalSup));
  safeTxt('hv2', fmt(contract));
  safeTxt('hv3', fmt(final));
  safeTxt('hv4', totals.fa>0?Math.round(final/totals.fa).toLocaleString()+'/㎡':'—');
  safeTxt('hv5', totals.fa>0?fmt(Math.round(final/(totals.fa/3.306)))+'/평':'—');'''
if OLD_GEN_KPI in html:
    html = html.replace(OLD_GEN_KPI, NEW_GEN_KPI)
    print('[1d] generateAll KPI OK')
else:
    print('[1d] generateAll KPI SKIP')

# bocRefreshCounters: hv3→hv-proj, hv4→hv-pend
html = html.replace(
    "const h3=document.getElementById('hv3');if(h3)h3.textContent=BOC.projects.length;",
    "const h3=document.getElementById('hv-proj');if(h3)h3.textContent=BOC.projects.length;"
)
html = html.replace(
    "const h4=document.getElementById('hv4');if(h4)h4.textContent=pend;",
    "const h4=document.getElementById('hv-pend');if(h4)h4.textContent=pend;"
)
html = html.replace(
    "document.getElementById('hv3').textContent=BOC.projects.length;",
    "document.getElementById('hv-proj') && (document.getElementById('hv-proj').textContent=BOC.projects.length);"
)
# BOC extension reset
html = html.replace(
    "else { safeTxt('hv1','₩0'); safeTxt('hv2','—'); }",
    "else { safeTxt('hv1','₩0'); safeTxt('hv2','₩0'); safeTxt('hv3','₩0'); safeTxt('hv4','—'); safeTxt('hv5','—'); }"
)
# BOC extension recalc override hv2
html = html.replace(
    "    const el=document.getElementById('hv2');\n    if(el&&window.lastResult?.totals?.fa>0)el.textContent=Math.round(window.lastResult.final/window.lastResult.totals.fa).toLocaleString()+'/㎡';",
    "    // hv4 = ㎡단가 업데이트\n    const el=document.getElementById('hv4');\n    if(el&&window.lastResult?.totals?.fa>0)el.textContent=Math.round(window.lastResult.final/window.lastResult.totals.fa).toLocaleString()+'/㎡';"
)
html = html.replace(
    "['hkv1','hv1'].forEach(id=>safeTxt(id, v1));",
    "safeTxt('hkv1', v1); safeTxt('hv3', v1);"
)
html = html.replace(
    "['hkv2','hv2'].forEach(id=>safeTxt(id, v2));",
    "safeTxt('hkv2', v2); safeTxt('hv4', v2);"
)
html = html.replace(
    "['hkv3','hv3'].forEach(id=>safeTxt(id, v3));",
    "safeTxt('hkv3', v3);"
)
html = html.replace(
    "['hkv4','hv4'].forEach(id=>safeTxt(id, v4));",
    "safeTxt('hkv4', v4);"
)
print('[1e] bocRefreshCounters hv refs OK')

# ══════════════════════════════════════════════════════════════════════
# [2] 탭 전환 강화
# ══════════════════════════════════════════════════════════════════════
OLD_TAB = '''document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('act'));b.classList.add('act');
  const v=b.dataset.v;
  document.querySelectorAll('.view').forEach(vv=>vv.classList.remove('act'));
  document.getElementById('view-'+v)?.classList.add('act');
  toggleEstimateUI(v==='estimate');
  if(v==='projects')renderProjects();
  if(v==='presets')renderPresets();
  if(v==='approval'){renderApproval();renderApprovalLog();}
  if(v==='dbmgr')renderDB2();
  if(v==='completion')updCmpSel();
  if(v==='ontology')renderOntologyView();
  if(v==='aiengine')renderAIEngineView();
}));'''
NEW_TAB = '''(function initTabs(){
  function activateTab(v){
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('act'));
    const btn=document.querySelector('[data-v="'+v+'"]');
    if(btn) btn.classList.add('act');
    document.querySelectorAll('.view').forEach(vv=>{
      vv.classList.remove('act');
      vv.style.display='none';
    });
    const view=document.getElementById('view-'+v);
    if(view){ view.classList.add('act'); view.style.display=(v==='estimate')?'':'block'; }
    toggleEstimateUI(v==='estimate');
    // 탭별 렌더 호출
    try{
      if(v==='projects')  renderProjects();
      if(v==='presets')   renderPresets();
      if(v==='approval')  { renderApproval(); renderApprovalLog(); }
      if(v==='dbmgr')     { if(typeof renderDB2==='function') renderDB2(); if(typeof renderRuleManager==='function') renderRuleManager(); }
      if(v==='completion')updCmpSel();
      if(v==='ontology')  { renderOntologyView(); renderDandelion(); }
      if(v==='aiengine')  renderAIEngineView();
      if(v==='reports')   { if(typeof renderReportList==='function') renderReportList(); }
    }catch(e){ console.warn('tab render error',v,e); }
    // Fabric.js CAD 캔버스 offset 재계산
    if(v==='estimate' && window.fc){
      requestAnimationFrame(()=>{
        try{
          const wrap=document.getElementById('cad-canvas-wrap');
          if(wrap){ const nw=Math.max(400,wrap.clientWidth-220),nh=Math.max(500,window.innerHeight-400); window.fc.setWidth(nw); window.fc.setHeight(nh); }
          window.fc.calcOffset(); window.fc.renderAll();
        }catch(e){}
      });
    }
    // 상단바 KPI 업데이트
    bocRefreshCounters();
  }
  document.querySelectorAll('#tabs .tab').forEach(b=>{
    b.addEventListener('click', ()=> activateTab(b.dataset.v||'estimate'));
  });
  window.gotoTab=function(v){ activateTab(v); };
  window.activateTab=activateTab;
})();'''
if OLD_TAB in html:
    html = html.replace(OLD_TAB, NEW_TAB)
    print('[2] 탭 전환 OK')
else:
    print('[2] 탭 전환 SKIP — already changed or not found')

# gotoTab standalone 함수 중복 제거 (새 버전에서 window.gotoTab 할당으로 대체)
OLD_GOTOTTAB = '''function gotoTab(v){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('act'));document.querySelector('[data-v="'+v+'"]')?.classList.add('act');
  document.querySelectorAll('.view').forEach(vv=>vv.classList.remove('act'));document.getElementById('view-'+v)?.classList.add('act');
  toggleEstimateUI(v==='estimate');
  if(v==='dbmgr'){ renderRuleManager(); renderStatisticsPanel(); }
}'''
if OLD_GOTOTTAB in html:
    html = html.replace(OLD_GOTOTTAB, '// gotoTab은 initTabs()에서 window.gotoTab으로 등록됨')
    print('[2b] gotoTab dedup OK')
else:
    print('[2b] gotoTab dedup SKIP')

# ══════════════════════════════════════════════════════════════════════
# [4] 온톨로지 탭 — 민들레 캔버스 추가
# ══════════════════════════════════════════════════════════════════════
OLD_ONTO_DIV = '''  <!-- 규칙 카드 그리드 -->
  <div class="onto-grid" id="onto-cards"></div>'''
NEW_ONTO_DIV = '''  <!-- 규칙 카드 그리드 -->
  <div class="onto-grid" id="onto-cards"></div>

  <!-- 민들레 네트워크 시각화 -->
  <div style="margin-top:28px">
    <div class="ai-section-title" style="margin-bottom:10px">RULE NETWORK — 온톨로지 그래프</div>
    <canvas id="ontology-canvas" width="900" height="380"
      style="width:100%;height:380px;border-radius:10px;background:#07070F;cursor:crosshair;display:block"></canvas>
  </div>'''
if OLD_ONTO_DIV in html:
    html = html.replace(OLD_ONTO_DIV, NEW_ONTO_DIV)
    print('[4] 온톨로지 캔버스 HTML OK')
else:
    print('[4] 온톨로지 캔버스 HTML SKIP')

# ══════════════════════════════════════════════════════════════════════
# [4b] renderDandelion 함수 — renderOntologyView() 다음에 삽입
# ══════════════════════════════════════════════════════════════════════
DANDELION_FN = r'''
// ── 민들레 3D 네트워크 시각화 ─────────────────────────────────────
function renderDandelion(hoverX, hoverY){
  const canvas=document.getElementById('ontology-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width=canvas.offsetWidth||900;
  const H=canvas.height=380;
  const cx=W/2, cy=H/2;
  const R=Math.min(cx,cy)*0.72;
  const allRules=[...ONTO_RULES,...(_pendingRules||[]).map(r=>({...r,status:'pending'}))];
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#07070F'; ctx.fillRect(0,0,W,H);
  // 배경 그리드
  ctx.strokeStyle='rgba(201,168,76,0.04)'; ctx.lineWidth=1;
  for(let r=60;r<=R*1.5;r+=60){
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  }
  // 중앙 코어 글로우
  const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,36);
  grad.addColorStop(0,'rgba(201,168,76,0.7)'); grad.addColorStop(1,'rgba(201,168,76,0)');
  ctx.beginPath(); ctx.arc(cx,cy,36,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2);
  ctx.fillStyle='rgba(7,7,15,0.9)'; ctx.fill();
  ctx.strokeStyle='rgba(201,168,76,0.8)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle='#C9A84C'; ctx.font='bold 9px Inter,sans-serif'; ctx.textAlign='center';
  ctx.fillText('ONTO',cx,cy-3); ctx.fillText('LOGY',cx,cy+9);
  // 각 규칙 노드 및 줄기
  allRules.forEach((rule,i)=>{
    const angle=(i/allRules.length)*Math.PI*2-Math.PI/2;
    const typeColors={AUTO_INCLUDE:'rgba(90,173,255,',WARN_CONDITIONAL:'rgba(255,170,68,',FORCED:'rgba(255,51,85,',pending:'rgba(150,150,180,'};
    const baseColor=typeColors[rule.type]||typeColors[rule.status]||'rgba(200,200,200,';
    const nodeR=(rule.type==='WARN_CONDITIONAL'?0.65:(rule.status==='pending'?0.55:0.82))*R;
    const nx=cx+Math.cos(angle)*nodeR, ny=cy+Math.sin(angle)*nodeR;
    // 줄기 (베지어 곡선)
    const cp1x=cx+Math.cos(angle-0.25)*nodeR*0.45;
    const cp1y=cy+Math.sin(angle-0.25)*nodeR*0.45;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.quadraticCurveTo(cp1x,cp1y,nx,ny);
    ctx.strokeStyle=baseColor+'0.35)'; ctx.lineWidth=1.5; ctx.stroke();
    // 호버 감지
    const dist=hoverX!==undefined?Math.hypot(hoverX-nx,hoverY-ny):999;
    const isHover=dist<22;
    // 트리거 노드 원
    const nr=isHover?22:16;
    ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2);
    ctx.fillStyle=baseColor+(isHover?'0.3)':'0.12)'); ctx.fill();
    ctx.strokeStyle=baseColor+(isHover?'0.9)':'0.55)'); ctx.lineWidth=isHover?2:1; ctx.stroke();
    // 텍스트
    ctx.fillStyle=isHover?'#fff':baseColor+'0.9)';
    ctx.font=(isHover?'bold ':'')+'8px JetBrains Mono,monospace'; ctx.textAlign='center';
    const trigText=(rule.trigger||rule.id||'?').split('/')[0].substring(0,8);
    ctx.fillText(trigText,nx,ny+3);
    // 호버 시 상세 정보
    if(isHover){
      const bx=Math.min(nx+20,W-160), by=Math.max(ny-40,10);
      ctx.fillStyle='rgba(3,3,5,0.95)';
      roundRect(ctx,bx,by,155,55,6); ctx.fill();
      ctx.strokeStyle=baseColor+'0.7)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 9px Inter,sans-serif'; ctx.textAlign='left';
      ctx.fillText((rule.id||'?')+': '+(rule.trigger||'').substring(0,16),bx+8,by+14);
      ctx.fillStyle='#aaa'; ctx.font='8px Inter,sans-serif';
      ctx.fillText('→ '+(rule.triggered||'').substring(0,20),bx+8,by+27);
      ctx.fillStyle=baseColor+'0.9)';
      ctx.fillText(rule.type||rule.status||'',bx+8,by+42);
    }
    // linked 노드
    const links=Array.isArray(rule.triggered)?rule.triggered:(rule.triggered||'').split('+').filter(Boolean);
    links.forEach((link,j)=>{
      if(!link||link.startsWith('(')) return;
      const la=angle+(j-links.length/2+0.5)*0.28;
      const lr=nodeR*1.28;
      const lx=cx+Math.cos(la)*lr, ly=cy+Math.sin(la)*lr;
      ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(lx,ly);
      ctx.strokeStyle='rgba(93,221,154,0.25)'; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.arc(lx,ly,9,0,Math.PI*2);
      ctx.fillStyle='rgba(93,221,154,0.1)'; ctx.fill();
      ctx.strokeStyle='rgba(93,221,154,0.4)'; ctx.lineWidth=0.8; ctx.stroke();
      ctx.fillStyle='rgba(93,221,154,0.9)'; ctx.font='7px JetBrains Mono,monospace'; ctx.textAlign='center';
      ctx.fillText(link.substring(0,7),lx,ly+3);
    });
  });
  // 범례
  const legend=[['AUTO_INCLUDE','rgba(90,173,255,0.7)'],['WARN','rgba(255,170,68,0.7)'],['FORCED','rgba(255,51,85,0.7)'],['PENDING','rgba(150,150,180,0.7)']];
  legend.forEach(([lbl,clr],i)=>{
    const lx=10+i*120, ly=H-14;
    ctx.beginPath(); ctx.arc(lx+6,ly-3,5,0,Math.PI*2); ctx.fillStyle=clr; ctx.fill();
    ctx.fillStyle='rgba(200,200,200,0.6)'; ctx.font='9px Inter,sans-serif'; ctx.textAlign='left';
    ctx.fillText(lbl,lx+15,ly);
  });
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
// 마우스 인터랙션 — 온톨로지 캔버스
(function initDandelionInteraction(){
  let _dd_init=false;
  function attachMouse(){
    const canvas=document.getElementById('ontology-canvas');
    if(!canvas||_dd_init) return;
    _dd_init=true;
    canvas.addEventListener('mousemove',e=>{
      const r=canvas.getBoundingClientRect();
      const scaleX=canvas.width/r.width, scaleY=canvas.height/r.height;
      renderDandelion((e.clientX-r.left)*scaleX,(e.clientY-r.top)*scaleY);
    });
    canvas.addEventListener('mouseleave',()=>renderDandelion());
  }
  window._attachDandelionMouse=attachMouse;
})();
'''

DANDELION_INSERT_AFTER = 'let _ontoFilter = \'ALL\';\nlet _pendingRules = JSON.parse(localStorage.getItem(\'boc_pending_rules\')||\'[]\');'
if DANDELION_INSERT_AFTER in html:
    html = html.replace(DANDELION_INSERT_AFTER, DANDELION_INSERT_AFTER + DANDELION_FN)
    print('[4b] renderDandelion OK')
else:
    print('[4b] renderDandelion SKIP — anchor not found')

# renderOntologyView에서 renderDandelion 자동 호출
OLD_ONTO_RENDER_END = '''  renderOntologyView();
}
'''
# 이 패턴은 여러 번 나올 수 있으니, renderOntologyView 함수 끝에 추가
OLD_ONTO_FN_END = '''function filterOnto(type, btn){'''
NEW_ONTO_FN_END = '''  // 민들레 시각화 자동 렌더
  setTimeout(()=>{ renderDandelion(); if(window._attachDandelionMouse) window._attachDandelionMouse(); }, 50);
}

function filterOnto(type, btn){'''
if OLD_ONTO_FN_END in html:
    html = html.replace(OLD_ONTO_FN_END, NEW_ONTO_FN_END, 1)
    print('[4c] renderDandelion auto-call OK')
else:
    print('[4c] renderDandelion auto-call SKIP')

# ══════════════════════════════════════════════════════════════════════
# [5a] NaN/Infinity 방지 — 나눗셈 보호 (recalc 내부)
# ══════════════════════════════════════════════════════════════════════
# 이미 safeNum이 있으므로 추가로 0 체크 강화
OLD_SAFE_NUM = '  const safeNum = n => (isFinite(n) && !isNaN(n)) ? n : 0;'
NEW_SAFE_NUM = '''  const safeNum = n => (isFinite(n) && !isNaN(n) && n != null) ? n : 0;
  const safeDivide = (a, b) => b > 0 ? safeNum(a/b) : 0;'''
if OLD_SAFE_NUM in html:
    html = html.replace(OLD_SAFE_NUM, NEW_SAFE_NUM, 1)
    print('[5a] safeNum/safeDivide OK')
else:
    print('[5a] safeNum SKIP')

# ══════════════════════════════════════════════════════════════════════
# [5b] 공간 면적 sanity check — fcCreateRoom에서 경고
# ══════════════════════════════════════════════════════════════════════
OLD_SANITY = '''  if(wMm<MIN_MM||hMm<MIN_MM){
      fcRestoreSelect(); return;
    }
    fcShowNamePopup(x, y, w, h, wMm, hMm);'''
NEW_SANITY = '''  if(wMm<MIN_MM||hMm<MIN_MM){
      fcRestoreSelect(); return;
    }
    // 단일 공간 면적 sanity check
    const areaSqm=wMm/1000*hMm/1000;
    if(areaSqm>500){ if(!confirm('단일 공간이 '+areaSqm.toFixed(0)+'㎡입니다. 계속하시겠습니까?')){ fcRestoreSelect(); return; } }
    fcShowNamePopup(x, y, w, h, wMm, hMm);'''
if OLD_SANITY in html:
    html = html.replace(OLD_SANITY, NEW_SANITY)
    print('[5b] 공간 sanity check OK')
else:
    print('[5b] 공간 sanity check SKIP')

# ══════════════════════════════════════════════════════════════════════
# [5c] Fabric.js 이벤트 중복 방지 — fcInit에 guard 추가
# ══════════════════════════════════════════════════════════════════════
OLD_FC_INIT = '''function fcInit(){
  const wrap = document.getElementById('cad-canvas-wrap');
  if(!wrap || !window.fabric) { setTimeout(fcInit, 200); return; }'''
NEW_FC_INIT = '''let _fcInitDone=false;
function fcInit(){
  if(_fcInitDone) return;
  const wrap = document.getElementById('cad-canvas-wrap');
  if(!wrap || !window.fabric) { setTimeout(fcInit, 200); return; }
  _fcInitDone=true;'''
if OLD_FC_INIT in html:
    html = html.replace(OLD_FC_INIT, NEW_FC_INIT)
    print('[5c] fcInit guard OK')
else:
    print('[5c] fcInit guard SKIP')

# ══════════════════════════════════════════════════════════════════════
# [6] TODO 주석 — IIFE 끝 전에 삽입
# ══════════════════════════════════════════════════════════════════════
TODO_COMMENT = '''
// ════════════════════════════════════════════════════════════════════
// TODO: 다음 개선 예정
// ════════════════════════════════════════════════════════════════════
// 1. 비정형 공간 (L자, T자) 지원 — Fabric.js Polygon 오브젝트
// 2. 3D 뷰 전환 (Three.js) — 평면도→입체 렌더링
// 3. 실제 DXF 파일 파싱 → 공간 자동 배치 (parser-server.py 연동)
// 4. 고객 공유 링크 생성 — 견적 URL 암호화 공유
// 5. 태블릿 터치 최적화 — 멀티터치 줌/팬
// 6. 창호 BIM 데이터 → KS 규격 자동 연동
// 7. AI 단가 예측 — 완료보고 누적 학습 후 견적 자동보정
'''
OLD_FC_IIFE_END = '''})(); // end IIFE — ECOREAN Fabric CAD v3'''
NEW_FC_IIFE_END = TODO_COMMENT + '''})(); // end IIFE — ECOREAN Fabric CAD v3'''
if OLD_FC_IIFE_END in html:
    html = html.replace(OLD_FC_IIFE_END, NEW_FC_IIFE_END)
    print('[6] TODO OK')
else:
    print('[6] TODO SKIP')

# ══════════════════════════════════════════════════════════════════════
# 저장
# ══════════════════════════════════════════════════════════════════════
with open('ECOREAN_BOC_v1.html', 'w', encoding='utf-8') as f:
    f.write(html)

lines = html.count('\n')
size = len(html)
print(f'\nDone: {lines} lines, {size:,} bytes')
