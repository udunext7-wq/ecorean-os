# -*- coding: utf-8 -*-
"""
ECOREAN BOC — Horizontal Full-Screen Layout Transform
Removes sidebar, adds top HUD bar, makes full-width multi-column layout.
"""
from pathlib import Path

SRC = Path(__file__).parent / 'ECOREAN_BOC_v1.html'
content = SRC.read_text(encoding='utf-8')

# ─────────────────────────────────────────────────────────────────────────────
# 1. NEW CSS (prepend before </style>)
# ─────────────────────────────────────────────────────────────────────────────
LAYOUT_CSS = """
/* ══════════════════════════════════════════════════
   ECOREAN BOC — Horizontal Layout v3
══════════════════════════════════════════════════ */

/* ── Override: estimate view = flex column full height ── */
#view-estimate {
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  height: 100% !important;
  padding: 0 !important;
}

/* ── Hide old sidebar completely ── */
#sidebar { display: none !important }

/* ── Top HUD Bar ─────────────────────────────────── */
#hud-bar {
  display: flex;
  align-items: stretch;
  background: rgba(3,3,5,.97);
  border-bottom: 1px solid rgba(201,168,76,.28);
  flex-shrink: 0;
  height: 76px;
  font-family: var(--font-mono);
  box-shadow: 0 2px 20px rgba(0,0,0,.5);
}
.hud-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px 24px;
  border-right: 1px solid rgba(201,168,76,.1);
  min-width: 0;
}
.hud-section:last-of-type { border-right: none }
.hud-sec-title {
  font-size: 7px; font-weight: 700;
  letter-spacing: .22em; color: rgba(201,168,76,.5);
  margin-bottom: 8px; text-transform: uppercase;
}
.hud-kpis {
  display: flex; gap: 20px; align-items: baseline;
  flex-wrap: nowrap; overflow: hidden;
}
.hud-kpi { display: flex; flex-direction: column; gap: 1px; min-width: 0 }
.hk-lbl {
  font-size: 7px; color: rgba(201,168,76,.35);
  letter-spacing: .06em; white-space: nowrap;
}
.hk-val {
  font-size: 12px; color: rgba(255,255,255,.9);
  font-weight: 600; white-space: nowrap;
  transition: color .25s;
}
.hk-val.gold { color: var(--gold-bright) }
.hk-val.updating { animation: val-update .3s ease }
.hud-warn-area {
  display: flex; align-items: center;
  padding: 0 16px; flex-shrink: 0; gap: 6px;
}
.hud-warn {
  font-size: 8px; color: var(--orange);
  font-family: var(--font-mono);
  display: flex; align-items: center; gap: 4px;
}
.hud-warn::before {
  content: '';
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 7px solid var(--orange);
  flex-shrink: 0;
}

/* ── Content Wrapper — full width, scrollable ── */
#content-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px 24px;
}
#content-wrap::-webkit-scrollbar { width: 4px }
#content-wrap::-webkit-scrollbar-track { background: transparent }
#content-wrap::-webkit-scrollbar-thumb { background: rgba(201,168,76,.2); border-radius: 2px }

/* max-width container inside content-wrap */
.cw-inner {
  max-width: 1400px;
  margin: 0 auto;
}

/* ── Step page: default block ── */
.step-page { display: none; }
.step-page.active, .step-page.act { display: block; }

/* ── Page title ── */
.page-title {
  font-size: 17px; font-weight: 600;
  color: var(--gold); margin-bottom: 6px;
  font-family: var(--font-head); letter-spacing: .06em;
}
.page-sub { font-size: 11px; color: var(--dim); margin-bottom: 24px; line-height: 1.6 }

/* ── STEP 1: 2×2 grid  ── */
#page0 > .page-title,
#page0 > .page-sub { /* span full width — they're block by default */ }
#page0 > .card:first-of-type { /* drawing upload = full width */ }
.step1-grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 0;
}
.step1-grid > .card { margin-bottom: 0 }

/* ── STEP 2: full width  ── */
#page1 > .card { max-width: 100% }

/* ── STEP 3: 2-column  ── */
.step3-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.step3-grid > .card { margin-bottom: 0 }

/* ── STEP 4: scope cards 3-col  ── */
#page3 .scope-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
#page3 .scope-cards-grid > .scope-card { margin-bottom: 0 }

/* ── STEP 5: 2-column  ── */
.step5-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.step5-grid > .card { margin-bottom: 0 }

/* ── STEP 6: result layout  ── */
.step6-kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.step6-main {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  margin-bottom: 20px;
}
.step6-actions {
  display: flex; gap: 12px; justify-content: center;
  flex-wrap: wrap;
}

/* ── Nav bar ── */
#nav {
  padding: 12px 40px;
  background: rgba(4,4,10,.95);
  border-top: 1px solid var(--border2);
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
  backdrop-filter: blur(16px);
}

/* ── Remove inner #main layout quirks ── */
#view-estimate > #main {
  display: contents; /* flatten the redundant wrapper */
}

/* ── Responsive ── */
@media (max-width: 1200px) {
  .step1-grid { grid-template-columns: 1fr 1fr }
  .step6-kpi-row { grid-template-columns: repeat(3, 1fr) }
  .step6-main { grid-template-columns: 1fr }
  #page3 .scope-cards-grid { grid-template-columns: 1fr 1fr }
}
@media (max-width: 768px) {
  #hud-bar { height: auto; flex-direction: column; height: auto }
  .hud-section { border-right: none; border-bottom: 1px solid rgba(201,168,76,.1) }
  .step1-grid, .step3-grid, .step5-grid { grid-template-columns: 1fr }
  .step6-kpi-row { grid-template-columns: 1fr 1fr }
  #page3 .scope-cards-grid { grid-template-columns: 1fr }
  #content-wrap { padding: 20px 16px }
}
"""

content = content.replace('</style>', LAYOUT_CSS + '\n</style>', 1)

# ─────────────────────────────────────────────────────────────────────────────
# 2. REPLACE inner #main + sidebar + #content wrapper
#    Lines 987-1017 → new HUD bar + content-wrap
# ─────────────────────────────────────────────────────────────────────────────
OLD_INNER = '''<div id="main">

<!-- ── 사이드바 HUD ── -->
<div id="sidebar">
  <div class="sb-section">
    <div class="sb-title">STRUCTURE</div>
    <div class="sb-row"><span class="lbl">유형</span><span class="dots"></span><span class="val" id="sb-btype">APT</span></div>
    <div class="sb-row"><span class="lbl">연식</span><span class="dots"></span><span class="val" id="sb-age">—</span></div>
    <div class="sb-row"><span class="lbl">층수</span><span class="dots"></span><span class="val" id="sb-floor">—</span></div>
    <div class="sb-row"><span class="lbl">접근성</span><span class="dots"></span><span class="val" id="sb-access">—</span></div>
  </div>
  <div class="sb-section">
    <div class="sb-title">AREA</div>
    <div class="sb-row"><span class="lbl">바닥</span><span class="dots"></span><span class="val gold" id="sb-fa">0.00 ㎡</span></div>
    <div class="sb-row"><span class="lbl">벽면</span><span class="dots"></span><span class="val" id="sb-wa">0.00 ㎡</span></div>
    <div class="sb-row"><span class="lbl">천장</span><span class="dots"></span><span class="val" id="sb-ca">0.00 ㎡</span></div>
    <div class="sb-row"><span class="lbl">둘레</span><span class="dots"></span><span class="val" id="sb-pr">0.0 m</span></div>
  </div>
  <div class="sb-section">
    <div class="sb-title">ESTIMATE</div>
    <div class="sb-row"><span class="lbl">공급가</span><span class="dots"></span><span class="val" id="sb-sup">₩0</span></div>
    <div class="sb-row"><span class="lbl">도급</span><span class="dots"></span><span class="val" id="sb-con">₩0</span></div>
    <div class="sb-row"><span class="lbl">최종</span><span class="dots"></span><span class="val gold" id="sb-fin">₩0</span></div>
    <div class="sb-row"><span class="lbl">㎡단가</span><span class="dots"></span><span class="val" id="sb-sqm">—</span></div>
    <div class="sb-row"><span class="lbl">평단가</span><span class="dots"></span><span class="val" id="sb-pyg">—</span></div>
  </div>
  <div id="sb-warnings"></div>
</div>

<!-- ── 컨텐츠 ── -->
<div id="content">'''

NEW_INNER = '''<!-- ── 상단 HUD 바 ── -->
<div id="hud-bar">
  <div class="hud-section">
    <div class="hud-sec-title">STRUCTURE</div>
    <div class="hud-kpis">
      <div class="hud-kpi"><span class="hk-lbl">유형</span><span class="hk-val" id="sb-btype">APT</span></div>
      <div class="hud-kpi"><span class="hk-lbl">연식</span><span class="hk-val" id="sb-age">—</span></div>
      <div class="hud-kpi"><span class="hk-lbl">층수</span><span class="hk-val" id="sb-floor">—</span></div>
      <div class="hud-kpi"><span class="hk-lbl">접근성</span><span class="hk-val" id="sb-access">—</span></div>
    </div>
  </div>
  <div class="hud-section">
    <div class="hud-sec-title">AREA</div>
    <div class="hud-kpis">
      <div class="hud-kpi"><span class="hk-lbl">바닥</span><span class="hk-val gold" id="sb-fa">0.0㎡</span></div>
      <div class="hud-kpi"><span class="hk-lbl">벽면</span><span class="hk-val" id="sb-wa">0.0㎡</span></div>
      <div class="hud-kpi"><span class="hk-lbl">천장</span><span class="hk-val" id="sb-ca">0.0㎡</span></div>
      <div class="hud-kpi"><span class="hk-lbl">둘레</span><span class="hk-val" id="sb-pr">0.0m</span></div>
    </div>
  </div>
  <div class="hud-section">
    <div class="hud-sec-title">ESTIMATE</div>
    <div class="hud-kpis">
      <div class="hud-kpi"><span class="hk-lbl">공급가</span><span class="hk-val" id="sb-sup">₩0</span></div>
      <div class="hud-kpi"><span class="hk-lbl">도급</span><span class="hk-val" id="sb-con">₩0</span></div>
      <div class="hud-kpi"><span class="hk-lbl">최종</span><span class="hk-val gold" id="sb-fin">₩0</span></div>
      <div class="hud-kpi"><span class="hk-lbl">㎡단가</span><span class="hk-val" id="sb-sqm">—</span></div>
      <div class="hud-kpi"><span class="hk-lbl">평단가</span><span class="hk-val" id="sb-pyg">—</span></div>
    </div>
  </div>
  <div class="hud-warn-area" id="sb-warnings"></div>
</div>

<!-- ── 컨텐츠 ── -->
<div id="content-wrap"><div class="cw-inner">
<div id="content">'''

content = content.replace(OLD_INNER, NEW_INNER, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Fix closing: </div><!-- /content --> + nav + </div>(closes inner #main)
#    → </div><!-- /content-wrap -->
# ─────────────────────────────────────────────────────────────────────────────
OLD_CLOSE = '''</div><!-- /content -->
  <div id="nav">
    <div class="nvinfo">STEP <b id="ns">1</b> / 6</div>
    <div class="btns">
      <button class="nbtn prev" id="prevBtn" onclick="prevStep()" style="display:none">← 이전</button>
      <button class="nbtn next" id="nextBtn" onclick="nextStep()">다음 →</button>
      <button class="nbtn go" id="genBtn" onclick="genAll()" style="display:none"> 견적 생성</button>
    </div>
  </div>
</div>'''

NEW_CLOSE = '''</div><!-- /content -->
</div></div><!-- /content-wrap -->
<div id="nav">
  <div class="nvinfo">STEP <b id="ns">1</b> / 6</div>
  <div class="btns">
    <button class="nbtn prev" id="prevBtn" onclick="prevStep()" style="display:none">← 이전</button>
    <button class="nbtn next" id="nextBtn" onclick="nextStep()">다음 →</button>
    <button class="nbtn go" id="genBtn" onclick="genAll()" style="display:none"> 견적 생성</button>
  </div>
</div>'''

content = content.replace(OLD_CLOSE, NEW_CLOSE, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 4. STEP 1 — wrap cards in 4-column grid
#    Cards: project info | building type | year/floor/region | accessibility
# ─────────────────────────────────────────────────────────────────────────────
# The step1 page has:
#   .page-title
#   .page-sub
#   card (drawing upload) — keep full width
#   card (project info)    ┐
#   card (building type)   ├ → step1-grid
#   card (accessibility)   ┘
# We wrap just the last 2 cards in a grid; drawing upload stays full-width

OLD_STEP1_CARDS = '''  <!-- 도면 업로드 카드 -->
  <div class="card" style="border:1.5px dashed var(--accent);background:rgba(99,179,237,.04)">'''

# Instead of trying to wrap, we apply a CSS approach:
# Inject a grid wrapper div around cards 2-4 in step 1
# Find the PROJECT 기본 card start and ACCESS card end and wrap them

# Approach: inject a <div class="step1-grid"> before 'PROJECT 기본' card
# and close it after 'ACCESS' card

STEP1_GRID_OPEN = '''  <div class="step1-grid">
  <div class="card">
    <div class="card-title">PROJECT — 기본 정보</div>'''

STEP1_GRID_OPEN_TARGET = '''  <div class="card">
    <div class="card-title">PROJECT — 기본 정보</div>'''

content = content.replace(STEP1_GRID_OPEN_TARGET, STEP1_GRID_OPEN, 1)

# Close after accessWarnings card (before </div> that closes page0)
# The access card ends with:
OLD_ACCESS_END = '''    <div id="accessWarnings" style="margin-top:12px"></div>
  </div>
</div>

<!-- ═══ STEP 2'''

NEW_ACCESS_END = '''    <div id="accessWarnings" style="margin-top:12px"></div>
  </div>
  </div><!-- /step1-grid -->
</div>

<!-- ═══ STEP 2'''

content = content.replace(OLD_ACCESS_END, NEW_ACCESS_END, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 5. STEP 3 — wrap 2 cards in step3-grid
# ─────────────────────────────────────────────────────────────────────────────
OLD_STEP3_START = '''<div class="step-page" id="page2">
  <div class="page-title">STEP 3 — 기존 현장 상태 조사</div>
  <div class="page-sub">철거 전 확인한 기존 상태를 입력합니다. 공사 범위와 리스크가 자동 반영됩니다.</div>

  <div class="card">
    <div class="card-title">SURFACE — 바닥·벽·천장</div>'''

NEW_STEP3_START = '''<div class="step-page" id="page2">
  <div class="page-title">STEP 3 — 기존 현장 상태 조사</div>
  <div class="page-sub">철거 전 확인한 기존 상태를 입력합니다. 공사 범위와 리스크가 자동 반영됩니다.</div>
  <div class="step3-grid">
  <div class="card">
    <div class="card-title">SURFACE — 바닥·벽·천장</div>'''

content = content.replace(OLD_STEP3_START, NEW_STEP3_START, 1)

# Find the closing of STEP 3 — it ends before <!-- ═══ STEP 4 -->
OLD_STEP3_END = '''</div>

<!-- ═══ STEP 4: 공사 범위 ═══ -->'''

NEW_STEP3_END = '''</div>
  </div><!-- /step3-grid -->

<!-- ═══ STEP 4: 공사 범위 ═══ -->'''

content = content.replace(OLD_STEP3_END, NEW_STEP3_END, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 6. STEP 4 — wrap scope cards in 3-column grid
# ─────────────────────────────────────────────────────────────────────────────
OLD_STEP4_SCOPES_START = '''  <!-- 욕실 -->
  <div id="bathroomScopes"></div>

  <!-- 주방 -->
  <div class="scope-card">'''

NEW_STEP4_SCOPES_START = '''  <!-- 욕실 -->
  <div id="bathroomScopes"></div>
  <div class="scope-cards-grid">
  <!-- 주방 -->
  <div class="scope-card">'''

content = content.replace(OLD_STEP4_SCOPES_START, NEW_STEP4_SCOPES_START, 1)

# Close before STEP 5
OLD_STEP4_END = '''</div>

<!-- ═══ STEP 5: 자재 등급 ═══ -->'''

NEW_STEP4_END = '''</div>
  </div><!-- /scope-cards-grid -->

<!-- ═══ STEP 5: 자재 등급 ═══ -->'''

content = content.replace(OLD_STEP4_END, NEW_STEP4_END, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 7. STEP 5 — 2-column grid
# ─────────────────────────────────────────────────────────────────────────────
OLD_STEP5_START = '''<div class="step-page" id="page4">
  <div class="page-title">STEP 5 — 자재 등급 선택</div>
  <div class="page-sub">공간별 또는 전체 자재 등급을 선택합니다. 등급에 따라 단가 계수가 자동 적용됩니다.</div>

  <div class="card">
    <div class="card-title">전체 패키지 등급</div>'''

NEW_STEP5_START = '''<div class="step-page" id="page4">
  <div class="page-title">STEP 5 — 자재 등급 선택</div>
  <div class="page-sub">공간별 또는 전체 자재 등급을 선택합니다. 등급에 따라 단가 계수가 자동 적용됩니다.</div>
  <div class="step5-grid">
  <div class="card">
    <div class="card-title">전체 패키지 등급</div>'''

content = content.replace(OLD_STEP5_START, NEW_STEP5_START, 1)

OLD_STEP5_END = '''</div>

<!-- ═══ STEP 6: 견적 결과 & 일정 ═══ -->'''

NEW_STEP5_END = '''</div>
  </div><!-- /step5-grid -->

<!-- ═══ STEP 6: 견적 결과 & 일정 ═══ -->'''

content = content.replace(OLD_STEP5_END, NEW_STEP5_END, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 8. UPDATE updateSidebar JS — use hk-val IDs (same IDs, no change needed)
#    But we need to ensure sb-warnings uses new hud-warn class
# ─────────────────────────────────────────────────────────────────────────────
# The existing JS sets innerHTML of sb-warnings; add .sb-warn → .hud-warn alias
WARN_CLASS_CSS = """
/* hud-warn alias for sb-warn (JS compatibility) */
.sb-warn {
  font-size: 8px; color: var(--orange);
  font-family: var(--font-mono);
  display: flex; align-items: center; gap: 4px;
}
.sb-warn::before {
  content: '';
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 7px solid var(--orange);
  flex-shrink: 0;
}
.sb-warn.danger { color: var(--red) }
.sb-warn.danger::before { border-bottom-color: var(--red) }
"""
content = content.replace('</style>', WARN_CLASS_CSS + '\n</style>', 1)

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
SRC.write_text(content, encoding='utf-8')
print(f'Done: {content.count(chr(10))} lines, {len(content):,} bytes')
