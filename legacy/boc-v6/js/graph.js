/* ECOREAN 온톨로지 Force-Directed 시각화 */
'use strict';

const GRAPH = (() => {
  let canvas, ctx, nodes = [], edges = [], animFrame = null;
  let dragging = null, offsetX = 0, offsetY = 0;
  let viewX = 0, viewY = 0, scale = 1;
  let isPanning = false, panStart = { x: 0, y: 0 };
  let simTick = 0, simRunning = false;

  const COLORS = {
    bg: '#070707',
    edgeRequired: '#C9A84C',
    edgeRecommends: '#555533',
    text: '#E0C97F',
    textSmall: '#666655',
    catColors: {
      C01: '#FF4444', C02: '#4488FF', C03: '#FF8844', C04: '#FFCC44',
      C05: '#44FFCC', C06: '#8844FF', C07: '#88CC44', C08: '#C9A84C',
      C09: '#44CCFF', C10: '#FF44CC', C11: '#CCFF44', C12: '#FF8888',
      C13: '#88CCFF', C14: '#FFDD88', C15: '#88FFDD', C16: '#AAAAAA'
    }
  };

  const SIM = {
    springLen:  160,
    repulsion:  9000,
    attraction: 0.035,
    gravity:    0.018,
    damping:    0.76,
    maxVel:     10,
    maxTicks:   350
  };

  /* ── 초기화 ── */
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    bindEvents();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    render();
  }

  /* ── 그래프 빌드 ── */
  function buildGraph(processes, rules) {
    nodes = [];
    edges = [];
    simTick = 0;
    simRunning = true;

    const nodeMap  = {};
    const activeIds = new Set();
    rules.forEach(r => {
      activeIds.add(r.trigger);
      r.requires.forEach(id => activeIds.add(id));
    });

    const activeProcs = processes.filter(p => activeIds.has(p.id));
    const n  = activeProcs.length;
    const cx = canvas ? canvas.width  / 2 : 500;
    const cy = canvas ? canvas.height / 2 : 300;
    const radius = Math.min(cx, cy) * 0.7;

    activeProcs.forEach((p, i) => {
      const angle = (i / n) * Math.PI * 2;
      const node = {
        id: p.id,
        name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
        fullName: p.name,
        cat: p.cat,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        r: 38,
        hovered: false,
        pinned: false
      };
      nodes.push(node);
      nodeMap[p.id] = node;
    });

    rules.forEach(r => {
      const src = nodeMap[r.trigger];
      r.requires.forEach(reqId => {
        const tgt = nodeMap[reqId];
        if (src && tgt) {
          edges.push({ src, tgt, relation: r.relation, label: r.relation === 'REQUIRES' ? '필수' : '권장' });
        }
      });
    });

    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
  }

  /* ── 메인 루프 ── */
  function loop() {
    if (simRunning && simTick < SIM.maxTicks) {
      runSim();
      simTick++;
    } else if (simTick >= SIM.maxTicks) {
      simRunning = false;
    }
    render();
    animFrame = requestAnimationFrame(loop);
  }

  /* ── 물리 시뮬레이션 1스텝 ── */
  function runSim() {
    const cx = canvas ? canvas.width  / 2 : 500;
    const cy = canvas ? canvas.height / 2 : 300;
    const cooling = Math.max(0.05, 1 - simTick / SIM.maxTicks);

    /* 반발력 (Coulomb) */
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.pinned) continue;
      let fx = 0, fy = 0;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b  = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const f  = SIM.repulsion / (d * d);
        fx += (dx / d) * f;
        fy += (dy / d) * f;
      }

      /* 중심 인력 */
      fx += (cx - a.x) * SIM.gravity;
      fy += (cy - a.y) * SIM.gravity;

      a.vx = (a.vx + fx) * SIM.damping * cooling;
      a.vy = (a.vy + fy) * SIM.damping * cooling;

      const vel = Math.hypot(a.vx, a.vy);
      if (vel > SIM.maxVel) { a.vx = a.vx / vel * SIM.maxVel; a.vy = a.vy / vel * SIM.maxVel; }
    }

    /* 스프링 인력 (Hooke) */
    edges.forEach(e => {
      const dx = e.tgt.x - e.src.x;
      const dy = e.tgt.y - e.src.y;
      const d  = Math.hypot(dx, dy) || 0.1;
      const f  = SIM.attraction * (d - SIM.springLen);
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      if (!e.src.pinned) { e.src.vx += fx; e.src.vy += fy; }
      if (!e.tgt.pinned) { e.tgt.vx -= fx; e.tgt.vy -= fy; }
    });

    /* 위치 갱신 + 경계 */
    const mg = 55, w = canvas ? canvas.width : 800, h = canvas ? canvas.height : 600;
    nodes.forEach(n => {
      if (n.pinned) return;
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < mg)     { n.x = mg;     n.vx *= -0.4; }
      if (n.x > w - mg) { n.x = w - mg; n.vx *= -0.4; }
      if (n.y < mg)     { n.y = mg;     n.vy *= -0.4; }
      if (n.y > h - mg) { n.y = h - mg; n.vy *= -0.4; }
    });
  }

  /* ── 렌더 ── */
  function render() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (nodes.length === 0) { drawEmptyState(); return; }

    ctx.save();
    ctx.translate(viewX, viewY);
    ctx.scale(scale, scale);
    drawEdges();
    drawNodes();
    ctx.restore();

    if (simRunning) drawSimBar();
  }

  function drawSimBar() {
    const pct = simTick / SIM.maxTicks;
    ctx.fillStyle = '#C9A84C44';
    ctx.fillRect(0, canvas.height - 3, canvas.width * pct, 3);
  }

  function drawEmptyState() {
    ctx.fillStyle = '#333322';
    ctx.font = '15px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('그래프 생성 버튼을 클릭하세요', canvas.width / 2, canvas.height / 2);
  }

  /* ── 엣지 그리기 ── */
  function drawEdges() {
    edges.forEach(e => {
      const req = e.relation === 'REQUIRES';
      ctx.strokeStyle = req ? COLORS.edgeRequired : COLORS.edgeRecommends;
      ctx.lineWidth   = req ? 2.2 : 1.4;
      ctx.setLineDash(req ? [] : [7, 5]);
      ctx.globalAlpha = req ? 0.85 : 0.5;

      const dx = e.tgt.x - e.src.x, dy = e.tgt.y - e.src.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const sx = e.src.x + ux * e.src.r;
      const sy = e.src.y + uy * e.src.r;
      const tx = e.tgt.x - ux * (e.tgt.r + 9);
      const ty = e.tgt.y - uy * (e.tgt.r + 9);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      drawArrow(tx, ty, ux, uy, req ? COLORS.edgeRequired : COLORS.edgeRecommends);

      ctx.fillStyle  = req ? COLORS.edgeRequired : '#777755';
      ctx.font       = '9px "Noto Sans KR", sans-serif';
      ctx.textAlign  = 'center';
      ctx.globalAlpha = 0.75;
      ctx.fillText(e.label, (sx + tx) / 2, (sy + ty) / 2 - 7);
      ctx.globalAlpha = 1;
    });
  }

  function drawArrow(x, y, ux, uy, color) {
    const s = 11, a = Math.PI / 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - s * (ux * Math.cos(a) - uy * Math.sin(a)), y - s * (uy * Math.cos(a) + ux * Math.sin(a)));
    ctx.lineTo(x - s * (ux * Math.cos(a) + uy * Math.sin(a)), y - s * (uy * Math.cos(a) - ux * Math.sin(a)));
    ctx.closePath();
    ctx.fill();
  }

  /* ── 노드 그리기 ── */
  function drawNodes() {
    nodes.forEach(n => {
      const cc = COLORS.catColors[n.cat] || '#C9A84C';

      if (n.hovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 12, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(n.x, n.y, n.r, n.x, n.y, n.r + 12);
        glow.addColorStop(0, cc + '55');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fill();
      }

      /* 외곽선 */
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 2, 0, Math.PI * 2);
      ctx.fillStyle = n.hovered ? '#2a2200' : '#111100';
      ctx.fill();
      ctx.strokeStyle = cc;
      ctx.lineWidth   = n.hovered ? 3 : 1.8;
      ctx.stroke();

      /* 본체 그라디언트 */
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(n.x - n.r * 0.35, n.y - n.r * 0.35, n.r * 0.08, n.x, n.y, n.r);
      g.addColorStop(0, n.hovered ? '#2e2400' : '#1e1c00');
      g.addColorStop(1, '#040404');
      ctx.fillStyle = g;
      ctx.fill();

      /* 카테고리 색 점 */
      ctx.beginPath();
      ctx.arc(n.x, n.y - n.r + 8, 5, 0, Math.PI * 2);
      ctx.fillStyle = cc;
      ctx.fill();

      /* 텍스트 */
      ctx.fillStyle    = n.hovered ? '#FFE566' : COLORS.text;
      ctx.font         = 'bold 9px "Noto Sans KR", sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      const words = n.name.split(' ');
      if (words.length >= 3) {
        ctx.fillText(words.slice(0, 2).join(' '), n.x, n.y - 7);
        ctx.fillText(words.slice(2).join(' '),    n.x, n.y + 6);
      } else if (words.length === 2) {
        ctx.fillText(words[0], n.x, n.y - 6);
        ctx.fillText(words[1], n.x, n.y + 6);
      } else {
        ctx.fillText(n.name, n.x, n.y);
      }

      /* ID 표시 */
      ctx.fillStyle = COLORS.textSmall;
      ctx.font      = '7px monospace';
      ctx.fillText(n.id, n.x, n.y + n.r - 8);
    });
  }

  /* ── 이벤트 ── */
  function getNodeAt(x, y) {
    const wx = (x - viewX) / scale, wy = (y - viewY) / scale;
    return nodes.find(n => Math.hypot(n.x - wx, n.y - wy) <= n.r);
  }

  function bindEvents() {
    canvas.addEventListener('mousedown', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const hit = getNodeAt(mx, my);
      if (hit) {
        dragging = hit;
        hit.pinned = true;
        offsetX = hit.x - (mx - viewX) / scale;
        offsetY = hit.y - (my - viewY) / scale;
      } else {
        isPanning = true;
        panStart = { x: e.clientX - viewX, y: e.clientY - viewY };
      }
    });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (dragging) {
        dragging.x = (mx - viewX) / scale + offsetX;
        dragging.y = (my - viewY) / scale + offsetY;
      } else if (isPanning) {
        viewX = e.clientX - panStart.x;
        viewY = e.clientY - panStart.y;
      } else {
        nodes.forEach(n => { n.hovered = false; });
        const hit = getNodeAt(mx, my);
        if (hit) {
          hit.hovered = true;
          canvas.style.cursor = 'grab';
          canvas.title = hit.fullName;
        } else {
          canvas.style.cursor = 'default';
          canvas.title = '';
        }
      }
    });

    canvas.addEventListener('mouseup', () => {
      if (dragging) { dragging.vx = 0; dragging.vy = 0; dragging = null; }
      isPanning = false;
    });

    canvas.addEventListener('mouseleave', () => {
      if (dragging) { dragging.vx = 0; dragging.vy = 0; dragging = null; }
      isPanning = false;
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      scale = Math.max(0.2, Math.min(4, scale * (e.deltaY > 0 ? 0.88 : 1.12)));
    }, { passive: false });

    canvas.addEventListener('dblclick', () => {
      scale = 1; viewX = 0; viewY = 0;
    });
  }

  function reset() {
    nodes = []; edges = [];
    simRunning = false; simTick = 0;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    if (ctx && canvas) {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawEmptyState();
    }
  }

  function stopAnimation() {
    simRunning = false;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  return { init, buildGraph, reset, stopAnimation };
})();
