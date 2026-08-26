/* ECOREAN MiniCAD — 반응형 레이아웃 / 도면 집중 모드 (2026-08-19, 태블릿·모바일 대응)
   문제: 좌(240px)·우(360px) 패널이 항상 펼쳐져 있어 갤럭시탭·폰에서는 가운데 도면창이 거의 보이지 않음.
   해결: "서랍(drawer) 모드" — 패널을 화면 밖으로 접고 도면창이 전체 폭을 쓴다.
         필요할 때만 하단 명령바의 [◧ 도구] [속성 ◨] 버튼 / 화면 가장자리 스와이프 / 퀵바 ◧ 로 서랍을 꺼낸다.
   모드: auto(기본: 좁은 화면·터치 기기면 서랍, 넓은 데스크톱은 분할) / focus(항상 서랍 = 도면 집중) / split(항상 분할)
   저장: localStorage minicad.layout.mode
   로드 순서: ui.js 이후, touch.js 이전. initApp() 에서 initLayout() 호출.
*/
function initLayout(){
  const body=document.body;
  const main=document.querySelector('.main');
  const left=document.querySelector('.panel-left');
  const right=document.querySelector('.panel-right');
  const cmdBar=document.querySelector('.cmd-bar');
  const canvasArea=document.querySelector('.canvas-area');
  if(!main||!left||!right||!cmdBar) return;

  const LS_KEY='minicad.layout.mode';
  let mode='auto';
  try{mode=localStorage.getItem(LS_KEY)||'auto';}catch(e){}
  if(!['auto','focus','split'].includes(mode)) mode='auto';
  STATE.layout={mode,drawer:false,leftOpen:false,rightOpen:false};
  const L=STATE.layout;

  const coarse=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
  function wantDrawer(){
    if(L.mode==='focus') return true;
    if(L.mode==='split') return false;
    const w=window.innerWidth;
    // 터치 기기(갤럭시탭 1280px 등)는 1500px 미만, 마우스 기기는 1100px 미만이면 서랍
    return coarse?w<1500:w<1100;
  }
  function isPhone(){return window.innerWidth<700;}

  // ── DOM: 명령바 양끝 버튼 + 서랍 닫기 버튼 + 폰용 백드롭
  const btnL=document.createElement('button');
  btnL.type='button';btnL.id='drawer-btn-left';btnL.className='drawer-btn';btnL.title='도구 패널 열기/닫기';
  btnL.innerHTML='<span class="db-ic">◧</span><span class="db-tx">도구</span>';
  const btnR=document.createElement('button');
  btnR.type='button';btnR.id='drawer-btn-right';btnR.className='drawer-btn';btnR.title='속성·견적 패널 열기/닫기';
  btnR.innerHTML='<span class="db-tx">속성</span><span class="db-ic">◨</span><span class="db-badge" id="drawer-badge-right"></span>';
  cmdBar.insertBefore(btnL,cmdBar.firstChild);
  cmdBar.appendChild(btnR);
  const backdrop=document.createElement('div');
  backdrop.id='drawer-backdrop';
  document.body.appendChild(backdrop);
  function mkClose(panel,side){
    const b=document.createElement('button');
    b.type='button';b.className='drawer-close';b.title='패널 닫기';b.textContent='✕';
    b.addEventListener('click',()=>toggleDrawer(side,false));
    panel.appendChild(b);
  }
  mkClose(left,'left');mkClose(right,'right');

  // ── 서랍 위치: 상단바(.topbar+.kpi-bar) 아래 ~ 명령바 위
  function measure(){
    const mr=main.getBoundingClientRect();
    const cr=cmdBar.getBoundingClientRect();
    document.documentElement.style.setProperty('--drawer-top',Math.max(0,Math.round(mr.top))+'px');
    document.documentElement.style.setProperty('--drawer-bottom',Math.max(0,Math.round(window.innerHeight-cr.top))+'px');
  }

  function apply(){
    const drawer=wantDrawer();
    L.drawer=drawer;
    body.classList.toggle('layout-drawer',drawer);
    body.classList.toggle('layout-phone',drawer&&isPhone());
    body.classList.toggle('layout-focus',L.mode==='focus');
    if(!drawer){toggleDrawer('left',false,true);toggleDrawer('right',false,true);}
    measure();
    requestAnimationFrame(()=>{measure();if(typeof handleResize==='function') handleResize();});
    refreshButtons();
  }
  function refreshButtons(){
    btnL.classList.toggle('active',L.leftOpen);
    btnR.classList.toggle('active',L.rightOpen);
    const sel=!!(STATE.selectedKind&&STATE.selectedId)||!!(STATE.boxSelection&&STATE.boxSelection.length);
    const bd=document.getElementById('drawer-badge-right');
    if(bd) bd.classList.toggle('on',sel&&!L.rightOpen&&L.drawer);
    const tb=document.getElementById('btn-layout');
    if(tb){tb.classList.toggle('gold',L.mode==='focus');tb.title='레이아웃: '+({auto:'자동',focus:'도면 집중(패널 서랍)',split:'분할 고정'})[L.mode]+' — 클릭하여 전환';}
    if(typeof refreshTouchQuickBar==='function') refreshTouchQuickBar();
  }
  function toggleDrawer(side,force,silent){
    if(!L.drawer&&force!==false){return;} // 분할 모드에선 서랍 개념 없음
    const key=side==='left'?'leftOpen':'rightOpen';
    const next=(typeof force==='boolean')?force:!L[key];
    if(L[key]===next){refreshButtons();return;}
    L[key]=next;
    // 폰: 한 번에 하나만
    if(next&&isPhone()){const other=side==='left'?'rightOpen':'leftOpen';L[other]=false;}
    body.classList.toggle('drawer-left-open',L.leftOpen);
    body.classList.toggle('drawer-right-open',L.rightOpen);
    backdrop.classList.toggle('on',isPhone()&&(L.leftOpen||L.rightOpen));
    refreshButtons();
    if(!silent&&next&&side==='right'&&typeof refreshUI==='function'){try{refreshUI();}catch(e){}}
  }
  function setMode(m){
    if(!['auto','focus','split'].includes(m)) return;
    L.mode=m;
    try{localStorage.setItem(LS_KEY,m);}catch(e){}
    apply();
    if(typeof cmdToast==='function') cmdToast('레이아웃: '+({auto:'자동 (화면 크기에 맞춤)',focus:'도면 집중 — 패널은 서랍으로',split:'분할 고정'})[m]);
  }
  function cycleMode(){setMode(L.mode==='auto'?'focus':L.mode==='focus'?'split':'auto');}
  // 2026-08-26: 객체 선택 시 속성 서랍 자동 열기 (대표 보고 — 태블릿에서 패널이 안 보임)
  //  서랍 모드에서만 동작. '도면 집중(focus)' 모드는 사용자가 의도적으로 접은 것이므로 존중.
  window.autoOpenPropsDrawer=function(){
    if(!L.drawer||L.mode==='focus'||L.rightOpen) return;
    toggleDrawer('right',true);
  };
  window.toggleDrawer=toggleDrawer;
  window.setLayoutMode=setMode;
  window.cycleLayoutMode=cycleMode;
  window.refreshLayoutButtons=refreshButtons;

  btnL.addEventListener('click',()=>toggleDrawer('left'));
  btnR.addEventListener('click',()=>toggleDrawer('right'));
  backdrop.addEventListener('click',()=>{toggleDrawer('left',false);toggleDrawer('right',false);});
  const tb=document.getElementById('btn-layout');
  if(tb) tb.addEventListener('click',cycleMode);

  // ── 폰: 도구를 고르면 왼쪽 서랍 자동 닫기 (setTool 래핑)
  if(typeof setTool==='function'){
    const _orig=setTool;
    setTool=function(){const r=_orig.apply(this,arguments);if(L.drawer&&isPhone()&&L.leftOpen) toggleDrawer('left',false);return r;};
  }
  // ── 선택 변화 → 속성 버튼 배지
  if(typeof refreshUI==='function'){
    const _prev=refreshUI;
    refreshUI=function(){const r=_prev.apply(this,arguments);refreshButtons();return r;};
  }

  // ── 화면 가장자리 스와이프로 서랍 열기/닫기 (터치)
  //   왼쪽 가장자리 18px 에서 오른쪽으로 40px 이상 → 도구 서랍, 오른쪽 가장자리 → 속성 서랍
  //   열린 서랍 위에서 바깥쪽으로 60px 이상 스와이프 → 닫기
  const EDGE=18,SWIPE=40;
  let sw=null;
  document.addEventListener('touchstart',e=>{
    if(!L.drawer||e.touches.length!==1) return;
    const t=e.touches[0];
    const w=window.innerWidth;
    if(t.clientX<=EDGE&&!L.leftOpen){sw={side:'left',x:t.clientX,y:t.clientY,open:true};e.stopImmediatePropagation();}
    else if(t.clientX>=w-EDGE&&!L.rightOpen){sw={side:'right',x:t.clientX,y:t.clientY,open:true};e.stopImmediatePropagation();}
    else if(L.leftOpen&&left.contains(e.target)){sw={side:'left',x:t.clientX,y:t.clientY,open:false};}
    else if(L.rightOpen&&right.contains(e.target)){sw={side:'right',x:t.clientX,y:t.clientY,open:false};}
  },{capture:true,passive:false});
  document.addEventListener('touchmove',e=>{
    if(!sw) return;
    const t=e.touches[0];if(!t) return;
    const dx=t.clientX-sw.x,dy=t.clientY-sw.y;
    if(Math.abs(dy)>Math.abs(dx)*1.2&&Math.abs(dy)>24){if(sw.open) sw=null;return;} // 세로 스크롤 의도
    if(sw.open){
      e.stopImmediatePropagation();if(e.cancelable) e.preventDefault();
      if((sw.side==='left'&&dx>SWIPE)||(sw.side==='right'&&dx<-SWIPE)){toggleDrawer(sw.side,true);sw=null;}
    }else{
      if((sw.side==='left'&&dx<-60)||(sw.side==='right'&&dx>60)){toggleDrawer(sw.side,false);sw=null;}
    }
  },{capture:true,passive:false});
  document.addEventListener('touchend',()=>{sw=null;},{capture:true,passive:true});
  document.addEventListener('touchcancel',()=>{sw=null;},{capture:true,passive:true});

  // ── 크기 변화 추적: 창 리사이즈 → 모드 재판정, 캔버스 영역 크기 변화 → 스테이지 리사이즈
  let rt=null;
  window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(apply,120);});
  if(window.ResizeObserver&&canvasArea){
    let raf=false;
    new ResizeObserver(()=>{if(raf) return;raf=true;requestAnimationFrame(()=>{raf=false;measure();if(typeof handleResize==='function') handleResize();});}).observe(canvasArea);
  }
  apply();
  console.log('[layout] 모드:',L.mode,'/ 서랍:',L.drawer,'/ 폭:',window.innerWidth);
}
