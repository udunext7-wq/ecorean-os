# -*- coding: utf-8 -*-
"""
ECOREAN BOC — Design Overhaul Transform
Applies 8 design improvements to ECOREAN_BOC_v1.html
"""
import re
from pathlib import Path

SRC = Path(__file__).parent / 'ECOREAN_BOC_v1.html'
content = SRC.read_text(encoding='utf-8')

# ─────────────────────────────────────────────────────────────────────────────
# 1. EMOJI REMOVAL
# ─────────────────────────────────────────────────────────────────────────────
EMOJI_MAP = {
    # Tabs
    '📊 견적 마법사':    '견적 마법사',
    '📁 프로젝트':       '프로젝트',
    '⭐ 프리셋':         '프리셋',
    '📄 보고서':         '보고서',
    '✅ 완료보고':       '완료보고',
    '🔐 승인함':         '승인함',
    '⚙️ DB관리':         'DB관리',
    # Header icons (replace with SVG inline)
    '>🔔<': '><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><',
    '>⚙️<': '><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><',
    # Card titles
    '📐 도면 업로드 (선택) — 공간 자동 입력': 'DRAWING — 도면 업로드 (선택)',
    '📂 도면 선택 (.dxf / .dwg / .pdf)': '도면 선택 (.dxf / .dwg / .pdf)',
    '✅ 공간 자동 입력 적용': '적용',
    '📋 프로젝트 기본': 'PROJECT — 기본 정보',
    '🏢 건물 유형': 'BUILDING — 건물 유형',
    '🚛 현장 접근성': 'ACCESS — 현장 접근성',
    '➕ 공간 추가': '+ 공간 추가',
    '🪵 바닥·벽·천장 기존 상태': 'SURFACE — 바닥·벽·천장',
    '🔧 설비·배관 상태': 'SYSTEM — 설비·배관',
    '🍳 주방': '주방',
    '🛋️ 거실·침실 공통': '거실·침실 공통',
    '🪟 창호·문': '창호·문',
    '💡 전기·조명': '전기·조명',
    '🚿 욕실': '욕실',
    '🚪 현관·복도': '현관·복도',
    '🏗️ 건축·구조': '건축·구조',
    '🏪 상업공간': '상업공간',
    '💨 방음·단열': '방음·단열',
    '🎨 특수 마감': '특수 마감',
    '⚠️ 교체 필수': '[교체 필수]',
    '⚠️': '[!]',
    '있음 ⚠️': '있음 [!]',
    '💧 습식': '습식',
    '🏠 경사천장': '경사천장',
    '⬆️ 2층': '2층',
    # Process page titles (keep clean)
    '📊': '',
    '📁': '',
    '⭐': '',
    '📄': '',
    '✅': '',
    '🔐': '',
    '🏗': '',
    '🏪': '',
    '💨': '',
    '🎨': '',
    '🔩': '',
    '🪟': '',
    '💡': '',
    '🚿': '',
    '🚪': '',
    '🏠': '',
    '⬆': '',
    '💧': '',
    '🛋': '',
    '🍳': '',
    '🪵': '',
    '🔧': '',
    '📐': '',
    '📋': '',
    '🏢': '',
    '🚛': '',
    '➕': '+',
    '📂': '',
    '🔔': '',
    '⚙': '',
    '️': '',  # variation selector
}
for old, new in EMOJI_MAP.items():
    content = content.replace(old, new)

# Clean up remaining emoji via regex (any char in Unicode emoji ranges)
def strip_emoji(text):
    emoji_pattern = re.compile(
        u'[\U0001F300-\U0001F9FF'
        u'\U00002600-\U000027FF'
        u'\U0000FE00-\U0000FE0F]+', flags=re.UNICODE)
    return emoji_pattern.sub('', text)
content = strip_emoji(content)

# ─────────────────────────────────────────────────────────────────────────────
# 2. NEW CSS — inject before </style>
# ─────────────────────────────────────────────────────────────────────────────
NEW_CSS = """
/* ══════════════════════════════════════════════════
   ECOREAN BOC — Design Overhaul v2
══════════════════════════════════════════════════ */

/* ── Sidebar HUD ─────────────────────────────────── */
#sidebar {
  width: 220px; flex-shrink: 0;
  background: linear-gradient(160deg, rgba(3,3,5,.97) 0%, rgba(13,13,26,.93) 100%);
  border-right: 1px solid rgba(201,168,76,.2);
  font-family: var(--font-mono);
  overflow-y: auto;
  display: flex; flex-direction: column;
  gap: 0;
}
.sb-section {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(201,168,76,.08);
}
.sb-section:last-child { border-bottom: none }
.sb-title {
  display: flex; align-items: center;
  font-size: 8px; font-weight: 700; letter-spacing: .18em;
  color: var(--gold); text-transform: uppercase;
  margin-bottom: 10px; gap: 8px;
}
.sb-title::before, .sb-title::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201,168,76,.35));
}
.sb-title::before { background: linear-gradient(90deg, rgba(201,168,76,.35), transparent) }
.sb-title::after  { background: linear-gradient(90deg, transparent, rgba(201,168,76,.35)) }
.sb-row {
  display: flex; align-items: baseline;
  padding: 3px 0;
  border-bottom: 1px solid rgba(201,168,76,.04);
}
.sb-row:last-child { border-bottom: none }
.sb-row .lbl {
  font-size: 9px; color: rgba(201,168,76,.5);
  letter-spacing: .04em; white-space: nowrap; flex-shrink: 0;
  min-width: 52px;
}
.sb-row .dots {
  flex: 1; border-bottom: 1px dotted rgba(201,168,76,.2);
  margin: 0 5px; height: 1px; align-self: flex-end; margin-bottom: 3px;
}
.sb-row .val {
  font-size: 10px; color: #fff; text-align: right;
  font-family: var(--font-mono); white-space: nowrap;
  transition: color .3s, opacity .3s;
}
.sb-row .val.gold { color: var(--gold-bright) }
.sb-row .val.updating {
  animation: val-update .3s ease;
}
@keyframes val-update {
  0%   { opacity: .3; transform: translateY(-3px) }
  100% { opacity: 1;  transform: none }
}
#sb-warnings { padding: 8px 12px }
#sb-warnings .sb-warn {
  display: flex; align-items: center; gap: 7px;
  font-size: 9px; color: var(--orange); margin-bottom: 5px;
  font-family: var(--font-mono);
}
#sb-warnings .sb-warn::before {
  content: '';
  display: inline-block; width: 0; height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid var(--orange);
  flex-shrink: 0;
}
#sb-warnings .sb-warn.danger { color: var(--red) }
#sb-warnings .sb-warn.danger::before { border-bottom-color: var(--red) }

/* ── Building Type Cards ─────────────────────────── */
.btn-group.btype-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  margin-top: 8px;
}
.bgoption.btype {
  flex-direction: column; align-items: center; justify-content: center;
  padding: 14px 8px; gap: 10px;
  background: rgba(255,255,255,.03); border: 1px solid var(--border2);
  border-radius: var(--r); transition: all .2s;
  min-height: 80px;
}
.bgoption.btype:hover { border-color: rgba(201,168,76,.3); background: var(--gold4) }
.bgoption.btype.active {
  border-color: var(--gold) !important;
  background: var(--gold3) !important;
  box-shadow: 0 0 18px rgba(201,168,76,.12), inset 0 0 20px rgba(201,168,76,.04);
}
.bgoption.btype.active .btype-icon * { stroke: var(--gold-bright) }
.bgoption.btype .btype-label { font-size: 9px; color: var(--dim); letter-spacing: .04em; text-align: center }
.bgoption.btype.active .btype-label { color: var(--gold) }
.btype-icon { display: flex; align-items: flex-end; justify-content: center; height: 32px }
.btype-icon svg * { transition: stroke .2s }

/* ── Step Bar — HUD Diamond ──────────────────────── */
.step-dot, .sdot {
  width: 22px !important; height: 22px !important;
  border-radius: 4px !important;
  transform: rotate(45deg);
  border: 1.5px solid var(--border2) !important;
  background: var(--raised) !important;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .25s;
  box-shadow: none !important;
}
.step-dot span, .sdot span { transform: rotate(-45deg); display: block }
.step-dot.active, .sdot.active, .step-dot.act, .sdot.act {
  border-color: var(--gold) !important;
  background: var(--gold2) !important;
  box-shadow: 0 0 14px rgba(201,168,76,.3), 0 0 4px rgba(201,168,76,.5) !important;
  animation: diamond-pulse 2s infinite;
}
@keyframes diamond-pulse {
  0%,100% { box-shadow: 0 0 8px rgba(201,168,76,.3) }
  50%      { box-shadow: 0 0 20px rgba(201,168,76,.6), 0 0 4px rgba(201,168,76,.8) }
}
.step-dot.done, .sdot.done {
  border-color: var(--green) !important;
  background: var(--green) !important;
  box-shadow: 0 0 10px rgba(93,221,154,.4) !important;
  animation: none !important;
}
.step-line, .sline {
  flex: 1; height: 1px; margin: 0 6px;
  background: repeating-linear-gradient(90deg,
    var(--border2) 0px, var(--border2) 4px,
    transparent 4px, transparent 8px) !important;
  transition: background .3s !important;
}
.step-line.done, .sline.done {
  background: linear-gradient(90deg, var(--green), rgba(93,221,154,.4)) !important;
}

/* ── LED Condition Buttons ───────────────────────── */
.bgoption.led-btn {
  padding: 6px 12px;
  border: 1px solid var(--border2);
  border-radius: 4px;
  background: rgba(255,255,255,.03);
  display: flex; align-items: center; gap: 7px;
  font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  color: var(--dim); cursor: pointer; transition: all .2s;
}
.bgoption.led-btn::before {
  content: '';
  width: 6px; height: 6px; border-radius: 50%;
  flex-shrink: 0; transition: all .2s;
}
.bgoption.led-btn.led-good::before  { background: var(--green); opacity: .4 }
.bgoption.led-btn.led-fair::before  { background: var(--orange); opacity: .4 }
.bgoption.led-btn.led-poor::before  { background: var(--red); opacity: .4 }
.bgoption.led-btn.active {
  border-color: currentColor;
}
.bgoption.led-btn.led-good.active  {
  color: var(--green); border-color: rgba(93,221,154,.4);
  background: rgba(93,221,154,.07);
}
.bgoption.led-btn.led-good.active::before {
  opacity: 1; box-shadow: 0 0 8px var(--green), 0 0 3px var(--green);
  animation: led-pulse-g 1.5s infinite;
}
.bgoption.led-btn.led-fair.active  {
  color: var(--orange); border-color: rgba(255,170,68,.4);
  background: rgba(255,170,68,.07);
}
.bgoption.led-btn.led-fair.active::before {
  opacity: 1; box-shadow: 0 0 8px var(--orange), 0 0 3px var(--orange);
  animation: led-pulse-o 1.5s infinite;
}
.bgoption.led-btn.led-poor.active  {
  color: var(--red); border-color: rgba(255,85,100,.4);
  background: rgba(255,85,100,.07);
}
.bgoption.led-btn.led-poor.active::before {
  opacity: 1; box-shadow: 0 0 8px var(--red), 0 0 3px var(--red);
  animation: led-pulse-r 1.5s infinite;
}
@keyframes led-pulse-g { 0%,100%{box-shadow:0 0 4px var(--green)} 50%{box-shadow:0 0 12px var(--green)} }
@keyframes led-pulse-o { 0%,100%{box-shadow:0 0 4px var(--orange)} 50%{box-shadow:0 0 12px var(--orange)} }
@keyframes led-pulse-r { 0%,100%{box-shadow:0 0 4px var(--red)} 50%{box-shadow:0 0 12px var(--red)} }

/* ── Input Fields — Underline Only ───────────────── */
.field input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=time]),
.field select,
.field textarea {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid rgba(201,168,76,.25) !important;
  border-radius: 0 !important;
  padding: 6px 2px !important;
  color: var(--text) !important;
  position: relative;
}
.field input:not([type=checkbox]):not([type=file]):not([type=time]):focus,
.field select:focus,
.field textarea:focus {
  outline: none !important;
  border-bottom-color: var(--gold) !important;
  color: var(--gold-bright) !important;
  text-shadow: 0 0 12px rgba(201,168,76,.4) !important;
}

/* Scan animation on focus wrapper */
.field { position: relative }
.field::after {
  content: '';
  position: absolute; bottom: 0; left: 0;
  width: 0; height: 1px;
  background: var(--gold-bright);
  transition: width .4s cubic-bezier(.4,0,.2,1);
  pointer-events: none;
}
.field:focus-within::after { width: 100% }

/* ── Custom Select Arrow ─────────────────────────── */
.field select {
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23C9A84C' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 4px center !important;
  padding-right: 22px !important;
  cursor: pointer;
}
.field select option {
  background: var(--surface);
  color: var(--text);
}

/* ── inp-group underline style ───────────────────── */
.inp-group {
  display: flex; align-items: stretch;
  border-bottom: 1px solid rgba(201,168,76,.25);
  transition: border-color .2s;
}
.inp-group:focus-within { border-bottom-color: var(--gold) }
.inp-group input {
  flex: 1; background: transparent !important;
  border: none !important; border-bottom: none !important;
  padding: 6px 2px !important; color: var(--text); font-size: 12px;
}
.inp-group input:focus { outline: none; color: var(--gold-bright); text-shadow: 0 0 10px rgba(201,168,76,.3) }
.unit-badge {
  font-size: 9px; color: var(--gold-dim); padding: 0 4px;
  display: flex; align-items: center; font-family: var(--font-mono);
  letter-spacing: .04em;
}

/* ── Alert / Warning — CSS Triangle ─────────────── */
.alert.warn, .alert.danger {
  padding-left: 14px;
}
.alert.warn::before, .alert.danger::before {
  content: '';
  display: inline-block; width: 0; height: 0; flex-shrink: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
}
.alert.warn::before   { border-bottom: 10px solid var(--orange) }
.alert.danger::before { border-bottom: 10px solid var(--red) }
.alert { font-family: var(--font-mono); font-size: 10.5px }

/* ── Card Title ──────────────────────────────────── */
.card-title {
  font-size: 9.5px; font-weight: 700; letter-spacing: .14em;
  color: var(--gold); text-transform: uppercase;
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--gold3);
  font-family: var(--font-body);
  display: flex; align-items: center; gap: 8px;
}
.card-title::before {
  content: '';
  width: 2px; height: 12px;
  background: linear-gradient(180deg, var(--gold-bright), var(--gold-dim));
  border-radius: 1px; flex-shrink: 0;
}
.page-title {
  font-size: 16px; font-weight: 600; color: var(--gold);
  margin-bottom: 4px; font-family: var(--font-head);
  letter-spacing: .06em;
}
.page-sub { font-size: 11px; color: var(--dim); margin-bottom: 18px; line-height: 1.6 }

/* ── bgoption default (non-LED, non-btype) ───────── */
.btn-group { display: flex; gap: 4px; flex-wrap: wrap }
.bgoption:not(.btype):not(.led-btn) {
  padding: 5px 12px;
  border: 1px solid var(--border2);
  border-radius: 3px;
  background: rgba(255,255,255,.03);
  font-size: 10px; color: var(--dim);
  cursor: pointer; transition: all .15s;
  font-family: var(--font-body);
}
.bgoption:not(.btype):not(.led-btn):hover { border-color: rgba(201,168,76,.3); color: var(--text) }
.bgoption:not(.btype):not(.led-btn).active {
  border-color: var(--gold);
  background: var(--gold2);
  color: var(--gold);
}

/* ── scope-card scope-hd h4 ─────────────────────── */
.scope-hd h4 {
  font-size: 10.5px; font-weight: 700;
  letter-spacing: .06em; color: var(--text2);
  text-transform: uppercase;
}

/* ── Tab icon dots ───────────────────────────────── */
.tab-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: currentColor; opacity: .5; flex-shrink: 0;
}
.tab.act .tab-dot { opacity: 1; background: var(--gold-bright) }
"""

content = content.replace('</style>', NEW_CSS + '\n</style>', 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3. SIDEBAR HTML — HUD format
# ─────────────────────────────────────────────────────────────────────────────
OLD_SIDEBAR = '''<!-- ── 사이드바 요약 ── -->
<div id="sidebar">
  <div class="sb-section">
    <div class="sb-title">건물 정보</div>
    <div class="sb-row"><span class="lbl">유형</span><span class="val" id="sb-btype">—</span></div>
    <div class="sb-row"><span class="lbl">연식</span><span class="val" id="sb-age">—</span></div>
    <div class="sb-row"><span class="lbl">층수</span><span class="val" id="sb-floor">—</span></div>
    <div class="sb-row"><span class="lbl">접근성</span><span class="val" id="sb-access">—</span></div>
  </div>
  <div class="sb-section">
    <div class="sb-title">면적 요약</div>
    <div class="sb-row"><span class="lbl">총 바닥면적</span><span class="val gold" id="sb-fa">0 ㎡</span></div>
    <div class="sb-row"><span class="lbl">총 벽면적</span><span class="val" id="sb-wa">0 ㎡</span></div>
    <div class="sb-row"><span class="lbl">총 천장면적</span><span class="val" id="sb-ca">0 ㎡</span></div>
    <div class="sb-row"><span class="lbl">총 둘레</span><span class="val" id="sb-pr">0 m</span></div>
  </div>
  <div class="sb-section">
    <div class="sb-title">견적 요약</div>
    <div class="sb-row"><span class="lbl">공급가</span><span class="val" id="sb-sup">₩0</span></div>
    <div class="sb-row"><span class="lbl">도급합계</span><span class="val" id="sb-con">₩0</span></div>
    <div class="sb-row"><span class="lbl">VAT포함 합계</span><span class="val gold" id="sb-fin">₩0</span></div>
    <div class="sb-row"><span class="lbl">㎡당 단가</span><span class="val" id="sb-sqm">—</span></div>
    <div class="sb-row"><span class="lbl">평당 단가</span><span class="val" id="sb-pyg">—</span></div>
  </div>
  <div id="sb-warnings"></div>
</div>'''

NEW_SIDEBAR = '''<!-- ── 사이드바 HUD ── -->
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
</div>'''

content = content.replace(OLD_SIDEBAR, NEW_SIDEBAR, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 4. BUILDING TYPE — CSS icon cards
# ─────────────────────────────────────────────────────────────────────────────
OLD_BTYPE = '''      <div class="btn-group" style="margin-top:6px">
        <button class="bgoption active" onclick="setBuildType('apartment',this)">아파트</button>
        <button class="bgoption" onclick="setBuildType('villa',this)">빌라·연립</button>
        <button class="bgoption" onclick="setBuildType('officetel',this)">오피스텔</button>
        <button class="bgoption" onclick="setBuildType('house1',this)">단독주택 단층</button>
        <button class="bgoption" onclick="setBuildType('house2',this)">단독주택 2층</button>
        <button class="bgoption" onclick="setBuildType('commercial',this)">상가·사무실</button>
      </div>'''

NEW_BTYPE = '''      <div class="btn-group btype-grid" style="margin-top:6px">
        <button class="bgoption btype active" onclick="setBuildType('apartment',this)">
          <div class="btype-icon"><svg width="28" height="32" viewBox="0 0 28 32" fill="none"><rect x="4" y="2" width="20" height="30" stroke="currentColor" stroke-width="1.2"/><rect x="7" y="5" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="13" y="5" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="17" y="5" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="7" y="11" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="13" y="11" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="17" y="11" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="7" y="17" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="13" y="17" width="4" height="4" fill="currentColor" opacity=".4"/><rect x="10" y="22" width="8" height="10" stroke="currentColor" stroke-width="1.2"/></svg></div>
          <div class="btype-label">아파트</div>
        </button>
        <button class="bgoption btype" onclick="setBuildType('villa',this)">
          <div class="btype-icon"><svg width="36" height="28" viewBox="0 0 36 28" fill="none"><rect x="2" y="8" width="32" height="20" stroke="currentColor" stroke-width="1.2"/><rect x="6" y="12" width="5" height="5" fill="currentColor" opacity=".4"/><rect x="15" y="12" width="5" height="5" fill="currentColor" opacity=".4"/><rect x="25" y="12" width="5" height="5" fill="currentColor" opacity=".4"/><rect x="14" y="18" width="8" height="10" stroke="currentColor" stroke-width="1.2"/><path d="M0 8h36" stroke="currentColor" stroke-width="1.2"/></svg></div>
          <div class="btype-label">빌라·연립</div>
        </button>
        <button class="bgoption btype" onclick="setBuildType('officetel',this)">
          <div class="btype-icon"><svg width="20" height="36" viewBox="0 0 20 36" fill="none"><rect x="2" y="2" width="16" height="34" stroke="currentColor" stroke-width="1.2"/><rect x="5" y="5" width="4" height="3" fill="currentColor" opacity=".35"/><rect x="11" y="5" width="4" height="3" fill="currentColor" opacity=".35"/><rect x="5" y="10" width="4" height="3" fill="currentColor" opacity=".35"/><rect x="11" y="10" width="4" height="3" fill="currentColor" opacity=".35"/><rect x="5" y="15" width="4" height="3" fill="currentColor" opacity=".35"/><rect x="11" y="15" width="4" height="3" fill="currentColor" opacity=".35"/><rect x="5" y="20" width="4" height="3" fill="currentColor" opacity=".35"/><rect x="7" y="27" width="6" height="9" stroke="currentColor" stroke-width="1.2"/></svg></div>
          <div class="btype-label">오피스텔</div>
        </button>
        <button class="bgoption btype" onclick="setBuildType('house1',this)">
          <div class="btype-icon"><svg width="36" height="28" viewBox="0 0 36 28" fill="none"><polygon points="18,2 34,14 2,14" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".1"/><rect x="4" y="14" width="28" height="14" stroke="currentColor" stroke-width="1.2"/><rect x="14" y="18" width="8" height="10" stroke="currentColor" stroke-width="1.2"/><rect x="6" y="17" width="5" height="5" fill="currentColor" opacity=".4"/><rect x="25" y="17" width="5" height="5" fill="currentColor" opacity=".4"/></svg></div>
          <div class="btype-label">단독 단층</div>
        </button>
        <button class="bgoption btype" onclick="setBuildType('house2',this)">
          <div class="btype-icon"><svg width="36" height="32" viewBox="0 0 36 32" fill="none"><polygon points="18,2 34,12 2,12" stroke="currentColor" stroke-width="1.2" fill="currentColor" fill-opacity=".1"/><rect x="4" y="12" width="28" height="20" stroke="currentColor" stroke-width="1.2"/><rect x="14" y="22" width="8" height="10" stroke="currentColor" stroke-width="1.2"/><rect x="6" y="14" width="5" height="5" fill="currentColor" opacity=".4"/><rect x="25" y="14" width="5" height="5" fill="currentColor" opacity=".4"/><line x1="4" y1="20" x2="32" y2="20" stroke="currentColor" stroke-width=".8" stroke-dasharray="2,2"/></svg></div>
          <div class="btype-label">단독 2층</div>
        </button>
        <button class="bgoption btype" onclick="setBuildType('commercial',this)">
          <div class="btype-icon"><svg width="40" height="26" viewBox="0 0 40 26" fill="none"><rect x="2" y="4" width="36" height="22" stroke="currentColor" stroke-width="1.2"/><rect x="5" y="8" width="8" height="8" fill="currentColor" opacity=".35"/><rect x="16" y="8" width="8" height="8" fill="currentColor" opacity=".35"/><rect x="27" y="8" width="8" height="8" fill="currentColor" opacity=".35"/><rect x="16" y="17" width="8" height="9" stroke="currentColor" stroke-width="1.2"/><path d="M0 4h40" stroke="currentColor" stroke-width="1.5"/><path d="M0 4 Q20 0 40 4" stroke="currentColor" stroke-width="1" fill="none"/></svg></div>
          <div class="btype-label">상가·사무실</div>
        </button>
      </div>'''

content = content.replace(OLD_BTYPE, NEW_BTYPE, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 5. CONDITION BUTTONS — LED toggles (양호/보통/불량)
# ─────────────────────────────────────────────────────────────────────────────
# Replace all occurrences of the pattern: active=양호, 보통, 불량
content = content.replace(
    'onclick="setOpt(\'floorLevel2\',\'good\',this)">양호</button>\n          <button class="bgoption" onclick="setOpt(\'floorLevel2\',\'fair\',this)">보통</button>\n          <button class="bgoption" onclick="setOpt(\'floorLevel2\',\'poor\',this)">불량',
    'onclick="setOpt(\'floorLevel2\',\'good\',this)">GOOD</button>\n          <button class="bgoption led-btn led-fair" onclick="setOpt(\'floorLevel2\',\'fair\',this)">FAIR</button>\n          <button class="bgoption led-btn led-poor" onclick="setOpt(\'floorLevel2\',\'poor\',this)">POOR'
)

# Generic LED button upgrade: find all btn-groups with 양호/보통/불량 pattern
def upgrade_condition_buttons(html):
    def replace_group(m):
        block = m.group(0)
        # Replace 양호 button
        block = re.sub(
            r'<button class="bgoption(\s+active)?" onclick="([^"]+\'good\'[^"]+)">양호</button>',
            lambda x: f'<button class="bgoption led-btn led-good{x.group(1) or ""}" onclick="{x.group(2)}">GOOD</button>',
            block
        )
        block = re.sub(
            r'<button class="bgoption(\s+active)?" onclick="([^"]+\'fair\'[^"]+)">보통</button>',
            lambda x: f'<button class="bgoption led-btn led-fair{x.group(1) or ""}" onclick="{x.group(2)}">FAIR</button>',
            block
        )
        block = re.sub(
            r'<button class="bgoption(\s+active)?" onclick="([^"]+\'poor\'[^"]+)">불량</button>',
            lambda x: f'<button class="bgoption led-btn led-poor{x.group(1) or ""}" onclick="{x.group(2)}">POOR</button>',
            block
        )
        return block
    # Match btn-group divs containing 양호/보통/불량
    pattern = re.compile(
        r'<div class="btn-group"[^>]*>(?:(?!</div>).)*?(?:양호|불량)(?:(?!</div>).)*?</div>',
        re.DOTALL
    )
    return pattern.sub(replace_group, html)

content = upgrade_condition_buttons(content)

# ─────────────────────────────────────────────────────────────────────────────
# 6. STEP BAR — wrap numbers in <span> for diamond rotation
# ─────────────────────────────────────────────────────────────────────────────
def wrap_step_numbers(html):
    # step-dot / sdot content: digit needs span wrapper for counter-rotation
    def do_wrap(m):
        tag_open = m.group(1)
        num = m.group(2)
        return f'{tag_open}<span>{num}</span>'
    html = re.sub(
        r'(<div class="step-dot[^"]*"[^>]*>)(\d)',
        do_wrap, html
    )
    return html
content = wrap_step_numbers(content)

# ─────────────────────────────────────────────────────────────────────────────
# 7. [!] WARNING TEXT → CSS triangle (remove inline [!] text)
# ─────────────────────────────────────────────────────────────────────────────
# The CSS .alert::before already adds the triangle, so [!] text in alerts is redundant
content = re.sub(r'<div class="alert (warn|danger)">(\s*)\[!\]', r'<div class="alert \1">\2', content)

# ─────────────────────────────────────────────────────────────────────────────
# 8. SIDEBAR JS — animate val changes (inject into existing updateSidebar)
# ─────────────────────────────────────────────────────────────────────────────
SIDEBAR_ANIM_JS = """
// Sidebar value update animation
function setSbVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent === String(val)) return;
  el.classList.remove('updating');
  void el.offsetWidth; // reflow
  el.textContent = val;
  el.classList.add('updating');
}
"""
# Inject before closing </script> of luxury JS block
content = content.replace(
    '\n</script>\n</body>',
    '\n' + SIDEBAR_ANIM_JS + '\n</script>\n</body>',
    1
)

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
SRC.write_text(content, encoding='utf-8')
lines = content.count('\n')
print(f'Done: {lines} lines, {len(content):,} bytes')
