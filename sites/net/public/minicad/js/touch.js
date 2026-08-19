/* ECOREAN MiniCAD — 태블릿 터치·S펜 입력 레이어 (2026-08-19, 갤럭시탭 대응)
   로드 순서: ui.js 이후 (stage / container / STATE / beginViewTransform 등 전역 사용).
   initApp() 에서 initTouch() 를 호출한다.

   제공 기능
   ─ 펜 / 손가락 / 마우스 구분 (Pointer Events) + 상태바 입력모드 배지
   ─ 팜 리젝션: 펜 작도 중(또는 직후 0.7s) 손바닥·손가락 터치 무시
   ─ 손가락 모드: "이동" (손가락=팬, 펜=작도) ↔ "작도" (손가락도 그림) — 펜 감지 시 기본 "이동"
   ─ 2손가락 핀치 줌 + 패닝 (레이어 변환 방식, 제스처 종료 시 1회 재구성) — ZOOM_MIN 5% ~ ZOOM_MAX 800%
   ─ 2손가락 더블탭 = 전체 보기(zoomFit) / 퀵바 ⊖ ⊕ ⊡ 줌 버튼
   ─ 롱프레스(0.6s) = 우클릭 컨텍스트 메뉴
   ─ 터치 기기에서 Konva 히트 영역 확대 (가는 선·핸들 선택 용이)
   ─ 터치 퀵바: Esc · Enter · Del · Undo · Redo · Shift 고정 · 손가락 모드 · 키보드
   ─ touchcancel / pointercancel 시 진행 중 제스처 안전 취소 (cancelPointerGesture)
*/
function initTouch(){
  if(typeof stage==='undefined'||typeof container==='undefined'||!container) return;
  const coarse=!!(window.matchMedia&&window.matchMedia('(pointer:coarse)').matches);
  const anyHover=!!(window.matchMedia&&window.matchMedia('(any-hover:hover)').matches);
  const isTouchDevice=coarse||('ontouchstart' in window)||navigator.maxTouchPoints>0;

  const PEN_PALM_GRACE=700;   // 펜 떼고 이 시간(ms) 안의 손가락 터치 = 손바닥으로 간주
  const LONGPRESS_MS=600;     // 롱프레스 → 우클릭
  const LONGPRESS_MOVE=12;    // 롱프레스 허용 이동(px)
  const HIT_SCALE=1.75;       // 터치 기기 히트영역 배수

  let savedFingerPan=null;
  try{savedFingerPan=localStorage.getItem('minicad.touch.fingerPan');}catch(e){}
  STATE.touch={
    enabled:isTouchDevice,
    coarse,
    hasPen:false,
    lastType:'mouse',        // 마지막 pointerdown 의 pointerType
    penDown:false,
    penSeenAt:0,             // 펜이 마지막으로 감지된 시각 (down/move/up)
    palmReject:true,
    fingerPan:savedFingerPan===null?null:savedFingerPan==='1', // null = 펜 감지 시 자동 ON
    gesture:null,            // null | 'pinch' | 'fingerpan'
  };
  const T=STATE.touch;
  document.body.classList.toggle('touch-device',isTouchDevice);
  document.body.classList.toggle('pointer-coarse',coarse);

  // ── 0. 터치 기기: Konva 히트 영역 확대 (숫자 hitStrokeWidth ×1.75, 가는 선 auto → 최소 10px)
  if(isTouchDevice&&window.Konva&&Konva.Shape&&Konva.Shape.prototype.hitStrokeWidth&&!Konva.Shape.prototype.__ecoHitPatched){
    const orig=Konva.Shape.prototype.hitStrokeWidth;
    Konva.Shape.prototype.hitStrokeWidth=function(v){
      if(arguments.length) return orig.call(this,v);
      const r=orig.call(this);
      if(typeof r==='number'&&r>0) return r*HIT_SCALE;
      if(r==='auto'&&Konva.Line&&this instanceof Konva.Line&&!this.closed()){
        const sw=this.strokeWidth();
        if(typeof sw==='number'&&sw>0&&sw<10) return 10;
      }
      return r;
    };
    Konva.Shape.prototype.__ecoHitPatched=true;
  }

  // ── 1. 입력모드 배지 (상태바)
  let badge=document.getElementById('input-mode-badge');
  if(!badge){
    const info=document.querySelector('.canvas-info');
    if(info){
      const wrap=document.createElement('span');
      wrap.innerHTML='<span class="gold">입력:</span> <span id="input-mode-badge">마우스</span>';
      info.appendChild(wrap);
      badge=wrap.querySelector('#input-mode-badge');
    }
  }
  function fingerPanOn(){return T.fingerPan===null?T.hasPen:T.fingerPan;}
  function setInputMode(type){
    if(T.lastType===type&&badge&&badge.dataset.t===type) return;
    T.lastType=type;
    document.body.classList.toggle('input-pen',type==='pen');
    document.body.classList.toggle('input-touch',type==='touch');
    document.body.classList.toggle('input-mouse',type==='mouse');
    if(badge){
      badge.dataset.t=type;
      badge.textContent=type==='pen'?'S펜':type==='touch'?(fingerPanOn()?'손가락(이동)':'손가락(작도)'):'마우스';
    }
    refreshQuickBar();
  }

  // ── 2. 포인터 타입 추적 (캡처 단계 — Konva보다 먼저)
  let lastPointerDownType='mouse',lastPointerDownAt=0;
  container.addEventListener('pointerdown',e=>{
    const now=performance.now();
    lastPointerDownType=e.pointerType||'mouse';lastPointerDownAt=now;
    if(e.pointerType==='pen'){
      if(!T.hasPen){T.hasPen=true;onPenDetected();}
      T.penDown=true;T.penSeenAt=now;
      setInputMode('pen');
    }else if(e.pointerType==='touch'){
      setInputMode('touch');
    }else{
      setInputMode('mouse');
    }
  },{capture:true,passive:true});
  container.addEventListener('pointermove',e=>{
    if(e.pointerType==='pen'){
      T.penSeenAt=performance.now();
      if(!T.hasPen){T.hasPen=true;onPenDetected();}
      if(T.lastType!=='pen') setInputMode('pen'); // 호버(에어뷰)만으로도 펜 모드 전환
    }
  },{capture:true,passive:true});
  const penUp=e=>{if(e.pointerType==='pen'){T.penDown=false;T.penSeenAt=performance.now();}};
  container.addEventListener('pointerup',penUp,{capture:true,passive:true});
  container.addEventListener('pointercancel',e=>{
    penUp(e);
    if(typeof cancelPointerGesture==='function') cancelPointerGesture();
  },{capture:true,passive:true});
  // 펜 호버 시 마우스 커서 모양 유지 (crosshair) — 일부 안드로이드 브라우저가 none 으로 바꿈
  function onPenDetected(){
    if(typeof cmdToast==='function') cmdToast('S펜 감지 — 손가락은 화면 이동, 펜으로 작도합니다 (퀵바에서 변경)');
    refreshQuickBar();
  }

  // ── 3. 터치 제스처 (캡처 단계에서 가로채기)
  const touchType=new Map();   // identifier → 'pen' | 'touch'
  const rejected=new Set();    // 팜 리젝션/소비된 터치 id
  let fingers=[];              // 현재 손가락(펜 아님, 미거부) Touch 목록 [{id,x,y}]
  let pinch=null,fingerPanSt=null,lpTimer=null,lpTouch=null;
  let lastTwoTapAt=0;          // 2손가락 더블탭(전체 보기) 판정용
  const PINCH_STEP=1.25;       // 퀵바 ⊖ ⊕ 한 번 누를 때 배율

  function relPos(t){const r=container.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top};}
  function updateZoomLabel(){const z=document.getElementById('zoom-pct');if(z) z.textContent=Math.round(STATE.zoom*100)+'%';}
  function clearLongPress(){if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}lpTouch=null;}
  function cancelTools(){if(typeof cancelPointerGesture==='function') cancelPointerGesture();}
  function block(e){e.stopImmediatePropagation();if(e.cancelable) e.preventDefault();}

  function startPinch(){
    cancelTools();clearLongPress();
    const a=fingers[0],b=fingers[1];
    const dx=b.x-a.x,dy=b.y-a.y;
    pinch={dist:Math.max(1,Math.hypot(dx,dy)),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,zoom:STATE.zoom,offsetX:STATE.offsetX,offsetY:STATE.offsetY,
      t0:performance.now(),moved:0};
    fingerPanSt=null;T.gesture='pinch';
    beginViewTransform();
  }
  function movePinch(){
    if(!pinch||fingers.length<2) return;
    const a=fingers[0],b=fingers[1];
    const dx=b.x-a.x,dy=b.y-a.y;
    const dist=Math.max(1,Math.hypot(dx,dy));
    const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
    // 두 손가락을 벌리면 확대, 오므리면 축소 — 시작 거리 대비 비율 그대로(1:1), 한계는 clampZoom(5%~800%)
    const newZoom=(typeof clampZoom==='function'?clampZoom:z=>Math.max(0.05,Math.min(8,z)))(pinch.zoom*(dist/pinch.dist));
    const k=newZoom/pinch.zoom;
    pinch.moved=Math.max(pinch.moved,Math.abs(dist-pinch.dist),Math.hypot(cx-pinch.cx,cy-pinch.cy));
    // 시작 중심점이 같은 월드 좌표에 머물도록 + 중심 이동량만큼 패닝
    STATE.offsetX=pinch.cx-(pinch.cx-pinch.offsetX)*k+(cx-pinch.cx);
    STATE.offsetY=pinch.cy-(pinch.cy-pinch.offsetY)*k+(cy-pinch.cy);
    STATE.zoom=newZoom;
    applyViewTransform();updateZoomLabel();
  }
  function endGesture(){
    if(!T.gesture) return;
    // 2손가락 짧은 탭(이동 거의 없음)을 0.4s 안에 두 번 → 전체 보기
    if(T.gesture==='pinch'&&pinch&&pinch.moved<10&&(performance.now()-pinch.t0)<250){
      const now=performance.now();
      if(now-lastTwoTapAt<400){lastTwoTapAt=0;T.gesture=null;pinch=null;fingerPanSt=null;
        if(typeof zoomFit==='function'){zoomFit();if(typeof cmdToast==='function') cmdToast('전체 보기');}
        else endViewTransform();
        updateZoomLabel();return;}
      lastTwoTapAt=now;
    }
    T.gesture=null;pinch=null;fingerPanSt=null;endViewTransform();updateZoomLabel();
  }
  function fireLongPress(t){
    // 롱프레스 → 우클릭(컨텍스트 메뉴). 진행 중이던 도구 동작은 취소.
    cancelTools();
    rejected.add(t.identifier);
    fingers=fingers.filter(f=>f.id!==t.identifier);
    if(T.gesture) endGesture();
    const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:t.clientX,clientY:t.clientY,button:2,buttons:2});
    ev.__ecoTouch=true; // tools.js contextmenu 핸들러가 태블릿 통합 메뉴로 분기
    container.dispatchEvent(ev);
    if(navigator.vibrate) try{navigator.vibrate(12);}catch(e){}
  }

  function tapSelectAt(x,y){
    if(STATE.selectedTool!=='select') return;
    let hit=null;
    try{hit=stage.getIntersection({x,y});}catch(e){}
    let id=null,node=hit;
    while(node&&node!==stage){if(node.id&&node.id()){id=node.id();break;}node=node.getParent();}
    if(id&&typeof findObjById==='function'){
      const found=findObjById(id);
      if(found&&typeof selectObj==='function'){selectObj(found.kind,found.id);return;}
    }
    if(!STATE.shiftPressed&&typeof deselect==='function') deselect();
  }

  container.addEventListener('touchstart',e=>{
    const now=performance.now();
    const ct=Array.from(e.changedTouches);
    // pointerdown(pen) 직후(80ms)의 touchstart = 펜 접촉
    const isPen=lastPointerDownType==='pen'&&(now-lastPointerDownAt)<80;
    if(isPen){
      ct.forEach(t=>touchType.set(t.identifier,'pen'));
      // 펜이 닿으면 진행 중이던 손가락 제스처는 종료, 남은 손가락은 무시
      if(T.gesture) endGesture();
      fingers.forEach(f=>rejected.add(f.id));fingers=[];clearLongPress();
      // 2026-08-19: 펜도 길게 누르면(0.6s, 12px 이내) 통합 메뉴 — 이전엔 S펜 측면 버튼으로만 가능했음
      const pt=ct[0];
      if(pt){
        lpTouch={id:pt.identifier,x:pt.clientX,y:pt.clientY,touch:pt,pen:true};
        lpTimer=setTimeout(()=>{if(lpTouch&&lpTouch.pen){const tt=lpTouch.touch;clearLongPress();fireLongPress(tt);}},LONGPRESS_MS);
      }
      return; // 펜은 Konva(도구)로 그대로 전달
    }
    let added=0,blocked=0;
    ct.forEach(t=>{
      touchType.set(t.identifier,'touch');
      // 팜 리젝션: 펜 작도 중 / 직후의 손가락·손바닥 터치 무시
      if(T.palmReject&&T.hasPen&&(T.penDown||(now-T.penSeenAt)<PEN_PALM_GRACE)){rejected.add(t.identifier);blocked++;return;}
      const p=relPos(t);
      fingers.push({id:t.identifier,x:p.x,y:p.y,x0:p.x,y0:p.y,t0:now});
      added++;
    });
    if(added===0){if(blocked) block(e);return;}

    if(fingers.length>=2){
      if(T.gesture!=='pinch') startPinch();
      block(e);return;
    }
    // 손가락 1개
    const t=ct.find(x=>touchType.get(x.identifier)==='touch'&&!rejected.has(x.identifier));
    if(t){
      clearLongPress();
      lpTouch={id:t.identifier,x:t.clientX,y:t.clientY,touch:t};
      lpTimer=setTimeout(()=>{if(lpTouch&&T.gesture!=='pinch'){const tt=lpTouch.touch;clearLongPress();fireLongPress(tt);}},LONGPRESS_MS);
    }
    if(fingerPanOn()){
      // 손가락 = 화면 이동 (짧은 탭은 touchend 에서 선택으로 처리)
      cancelTools();
      const f=fingers[0];
      fingerPanSt={x:f.x,y:f.y};T.gesture='fingerpan';
      beginViewTransform();
      block(e);return;
    }
    // 손가락 작도 모드: Konva 로 통과
  },{capture:true,passive:false});

  container.addEventListener('touchmove',e=>{
    const ct=Array.from(e.changedTouches);
    let anyFinger=false,anyPen=false;
    ct.forEach(t=>{
      const ty=touchType.get(t.identifier);
      if(lpTouch&&lpTouch.id===t.identifier&&(Math.abs(t.clientX-lpTouch.x)>LONGPRESS_MOVE||Math.abs(t.clientY-lpTouch.y)>LONGPRESS_MOVE)) clearLongPress();
      if(ty==='pen'){if(!rejected.has(t.identifier)) anyPen=true;return;}
      if(rejected.has(t.identifier)) return;
      const f=fingers.find(x=>x.id===t.identifier);
      if(f){const p=relPos(t);f.x=p.x;f.y=p.y;anyFinger=true;}
      if(lpTouch&&lpTouch.id===t.identifier&&(Math.abs(t.clientX-lpTouch.x)>LONGPRESS_MOVE||Math.abs(t.clientY-lpTouch.y)>LONGPRESS_MOVE)) clearLongPress();
    });
    if(anyPen) return; // 펜 이동은 도구가 처리 (롱프레스로 소비된 펜 터치는 아래에서 차단)
    if(T.gesture==='pinch'){movePinch();block(e);return;}
    if(T.gesture==='fingerpan'&&fingerPanSt&&fingers.length===1){
      const f=fingers[0];
      STATE.offsetX+=f.x-fingerPanSt.x;STATE.offsetY+=f.y-fingerPanSt.y;
      fingerPanSt={x:f.x,y:f.y};
      applyViewTransform();block(e);return;
    }
    // 거부된 터치만 포함된 move 는 차단
    if(!anyFinger&&ct.every(t=>rejected.has(t.identifier))){block(e);return;}
  },{capture:true,passive:false});

  const onTouchEnd=e=>{
    const ct=Array.from(e.changedTouches);
    let onlyRejected=ct.length>0,penEnd=false,endedFinger=null;
    ct.forEach(t=>{
      const ef=fingers.find(f=>f.id===t.identifier);if(ef) endedFinger=ef;
      const ty=touchType.get(t.identifier);
      if(ty==='pen'&&!rejected.has(t.identifier)) penEnd=true;
      if(!rejected.has(t.identifier)) onlyRejected=false;
      if(lpTouch&&lpTouch.id===t.identifier) clearLongPress();
      fingers=fingers.filter(f=>f.id!==t.identifier);
      touchType.delete(t.identifier);
      rejected.delete(t.identifier);
    });
    if(penEnd&&!onlyRejected) return;
    if(T.gesture==='fingerpan'&&fingers.length===0){
      // 이동 없이 짧게 탭 → 해당 위치 객체 선택 (select 도구) / 빈 곳 탭 → 선택 해제
      const f=endedFinger;
      if(f&&(performance.now()-f.t0)<350&&Math.hypot(f.x-f.x0,f.y-f.y0)<8){
        endGesture();tapSelectAt(f.x,f.y);block(e);return;
      }
    }
    if(T.gesture){
      // 제스처 중이던 손가락이 떨어짐 — 남은 손가락 수에 따라 전환/종료
      if(T.gesture==='pinch'&&fingers.length>=2){startPinch();}
      else if(fingers.length===1&&fingerPanOn()){T.gesture='fingerpan';pinch=null;fingerPanSt={x:fingers[0].x,y:fingers[0].y};}
      else endGesture();
      block(e);return;
    }
    if(onlyRejected){block(e);return;}
  };
  container.addEventListener('touchend',onTouchEnd,{capture:true,passive:false});
  container.addEventListener('touchcancel',e=>{onTouchEnd(e);cancelTools();},{capture:true,passive:false});

  // 창 포커스 이탈 — 모든 터치 상태 초기화
  window.addEventListener('blur',()=>{fingers=[];touchType.clear();rejected.clear();clearLongPress();if(T.gesture) endGesture();cancelTools();});

  // ── 4. 터치 퀵바 (키보드 없는 태블릿용)
  let bar=document.getElementById('touch-quickbar');
  function mkBtn(id,label,title,fn){
    const b=document.createElement('button');
    b.id=id;b.className='tq-btn';b.type='button';b.textContent=label;b.title=title;
    b.addEventListener('pointerdown',ev=>{ev.preventDefault();}); // 포커스 이동/키보드 방지
    b.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();fn(b);});
    return b;
  }
  function key(k){
    const tgt=document.body;
    tgt.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
    tgt.dispatchEvent(new KeyboardEvent('keyup',{key:k,bubbles:true,cancelable:true}));
  }
  if(!bar){
    const area=container.parentElement||document.querySelector('.canvas-area')||document.body;
    bar=document.createElement('div');bar.id='touch-quickbar';
    bar.appendChild(mkBtn('tq-zoom-out','⊖','축소 (두 손가락 오므리기)',()=>{if(typeof zoomBy==='function') zoomBy(1/PINCH_STEP);}));
    bar.appendChild(mkBtn('tq-zoom-in','⊕','확대 (두 손가락 벌리기)',()=>{if(typeof zoomBy==='function') zoomBy(PINCH_STEP);}));
    bar.appendChild(mkBtn('tq-zoom-fit','⊡','전체 보기 (두 손가락 더블탭)',()=>{if(typeof zoomFit==='function') zoomFit();}));
    bar.appendChild(mkBtn('tq-esc','Esc','취소 / 선택 해제 (Esc)',()=>key('Escape')));
    bar.appendChild(mkBtn('tq-enter','↵','확정 / 다음 단계 (Enter)',()=>{
      const ci=document.getElementById('cmd-input');
      if(ci&&document.activeElement===ci){ci.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));}
      else key('Enter');
    }));
    bar.appendChild(mkBtn('tq-del','Del','선택 삭제 (Delete)',()=>key('Delete')));
    bar.appendChild(mkBtn('tq-undo','↶','실행 취소 (Ctrl+Z)',()=>{if(typeof undo==='function') undo();}));
    bar.appendChild(mkBtn('tq-redo','↷','다시 실행 (Ctrl+Y)',()=>{if(typeof redo==='function') redo();}));
    bar.appendChild(mkBtn('tq-shift','⇧','Shift 고정 (다중 선택 / 직교)',b=>{
      STATE.shiftPressed=!STATE.shiftPressed;
      if(typeof _refreshShiftOrtho==='function') try{_refreshShiftOrtho();}catch(e){}
      b.classList.toggle('active',!!STATE.shiftPressed);
    }));
    bar.appendChild(mkBtn('tq-alt','⎇','Alt 고정 1회 — 다음 드래그가 복제 (Alt+드래그)',b=>{
      STATE.altLatched=!STATE.altLatched;
      b.classList.toggle('active',!!STATE.altLatched);
      if(typeof cmdToast==='function') cmdToast(STATE.altLatched?'Alt 고정 — 다음 드래그 = 복제 (드래그 끝나면 해제)':'Alt 고정 해제');
    }));
    bar.appendChild(mkBtn('tq-finger','☝',"손가락 역할 전환: 이동 ↔ 작도",()=>{
      const cur=fingerPanOn();
      T.fingerPan=!cur;
      try{localStorage.setItem('minicad.touch.fingerPan',T.fingerPan?'1':'0');}catch(e){}
      if(typeof cmdToast==='function') cmdToast(T.fingerPan?'손가락 = 화면 이동 / 펜 = 작도':'손가락 = 작도 (두 손가락 = 이동·줌)');
      if(T.lastType==='touch'&&badge){badge.textContent=T.fingerPan?'손가락(이동)':'손가락(작도)';}
      refreshQuickBar();
    }));
    bar.appendChild(mkBtn('tq-menu','☰','메뉴 — 우클릭 기능 (마감재·Boolean·잠금·회전·복제·삭제)',b=>{
      if(document.getElementById('touch-ctx-menu')){hideTouchCtxMenu();return;}
      const r=b.getBoundingClientRect();
      if(typeof showTouchCtxMenu==='function') showTouchCtxMenu(r.left-260,r.top,null);
    }));
    bar.appendChild(mkBtn('tq-kbd','⌨','명령창 열기 (숫자 입력)',()=>{
      const ci=document.getElementById('cmd-input');
      if(ci){ci.focus();try{ci.setSelectionRange(ci.value.length,ci.value.length);}catch(e){}}
    }));
    area.appendChild(bar);
  }
  function refreshQuickBar(){
    if(!bar) return;
    bar.classList.toggle('hidden',!(isTouchDevice||T.hasPen));
    const fb=document.getElementById('tq-finger');
    if(fb){fb.textContent=fingerPanOn()?'☝⇄':'☝✎';fb.classList.toggle('active',fingerPanOn());}
    const sb=document.getElementById('tq-shift');
    if(sb) sb.classList.toggle('active',!!STATE.shiftPressed);
    const ab=document.getElementById('tq-alt');
    if(ab) ab.classList.toggle('active',!!STATE.altLatched);
  }
  window.refreshTouchQuickBar=refreshQuickBar;
  refreshQuickBar();
  // Shift 키보드 입력과 퀵바 상태 동기화
  document.addEventListener('keyup',e=>{if(e.key==='Shift') refreshQuickBar();},{passive:true});
  document.addEventListener('keydown',e=>{if(e.key==='Shift') refreshQuickBar();},{passive:true});

  // ── 5. 기타 브라우저 제스처 억제: 더블탭 줌·당겨서 새로고침·길게 눌러 텍스트 선택
  document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false}); // iOS Safari 핀치
  document.addEventListener('dblclick',e=>{if(container.contains(e.target)) e.preventDefault();},{passive:false});

  console.log('[touch] 터치·S펜 레이어 준비 — coarse:',coarse,'/ anyHover:',anyHover,'/ touchDevice:',isTouchDevice);
}

// ─────────────────────────────────────────────────────────────────────────
// 태블릿 통합 컨텍스트 메뉴 (2026-08-19) — 데스크톱 "우클릭" 기능 전부를 한 메뉴로
//   호출: 롱프레스(0.6s) / S펜 측면 버튼 / 마우스 우클릭(터치 입력 직후) → tools.js contextmenu 핸들러
//   데스크톱 대응표
//     Ctrl+우클릭 (벽·공간 마감재)      → 🎨 마감재 설정
//     우클릭 (공간 2+)  Boolean          → ⊕ 병합 / A−B / B−A / ∩ 교집합
//     우클릭 (원·곡선)  변환·색상·텍스트  → ⟳ 변환·색상 메뉴 열기
//     우클릭 (선택)     🔒 잠금           → 🔒 잠금 / 해제
//     키보드 R / Delete / Ctrl+Z / Alt+드래그 → ↻ 회전 / 🗑 삭제 / ↶ 실행취소 / ⧉ 복제
//     빈 캔버스: ⤢ 전체보기 / ▦ 격자 / ⟂ 직교 / ↶ 실행취소 / ✕ 도구 취소
// ─────────────────────────────────────────────────────────────────────────
function hideTouchCtxMenu(){const m=document.getElementById('touch-ctx-menu');if(m) m.remove();}
window.hideTouchCtxMenu=hideTouchCtxMenu;
window.showTouchCtxMenu=function(px,py,hitFound){
  hideTouchCtxMenu();
  if(typeof hideSpaceCtxMenu==='function') hideSpaceCtxMenu();
  if(typeof hideSelectionCtxMenu==='function') hideSelectionCtxMenu();
  if(typeof hideShapeConvertMenu==='function') hideShapeConvertMenu();
  const KIND_NAMES={space:'공간',wall:'벽',opening:'창문/도어',furniture:'가구',fixtures:'위생/주방',lights:'조명',electric:'전기',hvac:'공조/소방',
    texts:'텍스트',measures:'치수',circles:'원',arcs:'호',curves:'곡선',leaders:'지시선',xlines:'안내선',pillars:'기둥'};
  const items=(STATE.boxSelection&&STATE.boxSelection.length>0)
    ? STATE.boxSelection.slice()
    : (STATE.selectedKind&&STATE.selectedId?[{kind:STATE.selectedKind,id:STATE.selectedId}]:[]);
  const objs=items.map(it=>{const arr=getArr(it.kind);const o=arr?arr.find(x=>x.id===it.id):null;return o?{kind:it.kind,id:it.id,obj:o}:null;}).filter(Boolean);
  const spaceIds=objs.filter(o=>o.kind==='space').map(o=>o.id);
  const single=objs.length===1?objs[0]:null;
  const allLocked=objs.length>0&&objs.every(o=>!!o.obj.locked);
  const kindCount={};objs.forEach(o=>{kindCount[o.kind]=(kindCount[o.kind]||0)+1;});
  const kindStr=Object.entries(kindCount).map(([k,n])=>(KIND_NAMES[k]||k)+' '+n).join(' · ');

  const rows=[]; // {label,icon,op,cls}
  const sep=()=>rows.push({sep:true});
  if(objs.length===0){
    rows.push({head:'캔버스'});
    rows.push({icon:'⤢',label:'전체보기',op:'fit'});
    rows.push({icon:'▦',label:(STATE.showGrid?'격자 끄기':'격자 켜기'),op:'grid'});
    rows.push({icon:'⟂',label:'직교 '+((STATE.snap&&STATE.snap.ortho)?'끄기':'켜기')+' (F8)',op:'ortho'});
    sep();
    rows.push({icon:'↶',label:'실행 취소',op:'undo'});
    rows.push({icon:'↷',label:'다시 실행',op:'redo'});
    if(STATE.selectedTool!=='select') rows.push({icon:'✕',label:'도구 취소 → 선택',op:'esc'});
  }else{
    rows.push({head:'선택 — '+kindStr});
    if(single&&(single.kind==='wall'||single.kind==='space')) rows.push({icon:'🎨',label:'마감재 설정 (바닥·벽·천장)',op:'finish',cls:'accent'});
    if(spaceIds.length>=2){
      const A=(objs.find(o=>o.id===spaceIds[0])||{}).obj,B=(objs.find(o=>o.id===spaceIds[1])||{}).obj;
      const nA=(A&&A.name)||'A',nB=(B&&B.name)||'B';
      rows.push({icon:'⊕',label:'공간 병합 ('+spaceIds.length+'개, 공유 변 기준)',op:'merge',cls:'blue'});
      if(spaceIds.length===2){
        rows.push({icon:'−',label:nA+' − '+nB+' (빼기)',op:'sub-ab',cls:'green'});
        rows.push({icon:'−',label:nB+' − '+nA+' (빼기)',op:'sub-ba',cls:'green'});
        rows.push({icon:'∩',label:'교집합',op:'intersect',cls:'brown'});
      }
    }
    if(single&&(single.kind==='circles'||single.kind==='curves')) rows.push({icon:'⟳',label:(single.kind==='circles'?'원':'곡선')+' 변환·색상·텍스트…',op:'convert'});
    sep();
    rows.push({icon:'🔒',label:allLocked?'잠금 해제':'잠금 (이동·편집 차단)',op:'lock'});
    rows.push({icon:'↻',label:single&&single.kind==='space'?'회전 (각도 입력)':'회전 (R)',op:'rotate'});
    if(single) rows.push({icon:'⧉',label:'복제 (300mm 옆에)',op:'dup'});
    rows.push({icon:'🗑',label:'삭제',op:'del',cls:'danger'});
    sep();
    rows.push({icon:'◻',label:'선택 해제 (Esc)',op:'esc'});
  }

  const menu=document.createElement('div');
  menu.id='touch-ctx-menu';
  let html='';
  rows.forEach(r=>{
    if(r.sep){html+='<div class="tcm-sep"></div>';return;}
    if(r.head){html+='<div class="tcm-head">'+escapeHtml(r.head)+'</div>';return;}
    html+='<button type="button" class="tcm-btn'+(r.cls?' tcm-'+r.cls:'')+'" data-op="'+r.op+'"><span class="tcm-ic">'+r.icon+'</span><span>'+escapeHtml(r.label)+'</span></button>';
  });
  html+='<button type="button" class="tcm-btn tcm-cancel" data-op="cancel">닫기</button>';
  menu.innerHTML=html;
  document.body.appendChild(menu);
  // 위치: 누른 지점 기준, 화면 밖이면 안쪽으로 (손가락에 가리지 않게 살짝 오른쪽·위)
  const W=menu.offsetWidth,H=menu.offsetHeight;
  let left=px+12,top=py-16;
  if(left+W>window.innerWidth-8) left=Math.max(8,px-W-12);
  if(top+H>window.innerHeight-8) top=Math.max(8,window.innerHeight-H-8);
  if(top<8) top=8;
  menu.style.left=left+'px';menu.style.top=top+'px';

  function run(op){
    hideTouchCtxMenu();
    const key=k=>{document.body.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));};
    switch(op){
      case 'fit': if(typeof zoomFit==='function') zoomFit(); break;
      case 'grid': if(typeof toggleGrid==='function') toggleGrid(); break;
      case 'ortho': if(typeof toggleOrtho==='function') toggleOrtho(); break;
      case 'undo': if(typeof undo==='function') undo(); break;
      case 'redo': if(typeof redo==='function') redo(); break;
      case 'esc': key('Escape'); break;
      case 'finish': if(single&&typeof showFinishMenu==='function') showFinishMenu(single.kind,single.obj,px,py); break;
      case 'merge': if(typeof mergeAdjacentSpaces==='function') mergeAdjacentSpaces(); break;
      case 'sub-ab': if(typeof subtractSelectedSpaces==='function') subtractSelectedSpaces(spaceIds[0],spaceIds[1]); break;
      case 'sub-ba': if(typeof subtractSelectedSpaces==='function') subtractSelectedSpaces(spaceIds[1],spaceIds[0]); break;
      case 'intersect': if(typeof intersectSelectedSpaces==='function') intersectSelectedSpaces(spaceIds[0],spaceIds[1]); break;
      case 'convert': if(single&&typeof showShapeConvertMenu==='function') showShapeConvertMenu(px,py,single.kind,single.id); break;
      case 'lock': if(typeof applyLockToSelection==='function') applyLockToSelection(!allLocked); break;
      case 'rotate': if(typeof rotateSelected==='function') rotateSelected(); break;
      case 'dup':
        if(single&&typeof altCopyObj==='function'){
          if(single.obj.locked){if(typeof cmdToast==='function') cmdToast('잠긴 객체는 복제할 수 없습니다');break;}
          const copy=altCopyObj(single.kind,single.obj);
          if(copy){
            STATE.boxSelection=[];STATE.selectedKind=single.kind;STATE.selectedId=copy.id;
            if(typeof _nudgeSelected==='function') _nudgeSelected(300,300);
            if(typeof saveHistory==='function') saveHistory();
            if(typeof renderAll==='function') renderAll();
            if(typeof refreshUI==='function') refreshUI();
            if(typeof cmdToast==='function') cmdToast('복제됨 — 드래그해서 위치 조정');
          }
        }
        break;
      case 'del': key('Delete'); break;
      default: break;
    }
  }
  menu.querySelectorAll('.tcm-btn').forEach(b=>{
    b.addEventListener('pointerdown',ev=>ev.stopPropagation());
    b.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();run(b.dataset.op);});
  });
  setTimeout(()=>{
    const closeOnOutside=ev=>{
      if(!menu.contains(ev.target)){hideTouchCtxMenu();document.removeEventListener('pointerdown',closeOnOutside,true);}
    };
    document.addEventListener('pointerdown',closeOnOutside,true);
    const onKey=ev=>{if(ev.key==='Escape'){hideTouchCtxMenu();document.removeEventListener('keydown',onKey,true);}};
    document.addEventListener('keydown',onKey,true);
  },50);
  return menu;
};
