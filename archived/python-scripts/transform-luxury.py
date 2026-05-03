"""
ECOREAN BOC v1 → Luxury UI Transform
Surgically replaces CSS, header, tabs, and injects new JS.
"""
import re
from pathlib import Path

SRC = Path(__file__).parent / 'ECOREAN_BOC_v1.html'
content = SRC.read_text(encoding='utf-8')

# ─── 1. Google Fonts ──────────────────────────────────────────────────────────
FONTS_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">'
content = content.replace('<style>', FONTS_LINK + '\n<style>', 1)

# ─── 2. Luxury CSS ────────────────────────────────────────────────────────────
OLD_STYLE_PAT = re.compile(r'<style>.*?</style>', re.DOTALL)

LUXURY_CSS = '''<style>
/* ═══════════════════════════════════════════════════
   ECOREAN BOC — Luxury Design System
═══════════════════════════════════════════════════ */
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
  /* Core Palette */
  --void:    #04040A;
  --deep:    #080810;
  --surface: #0D0D1A;
  --raised:  #121220;
  --elevated:#181828;
  --overlay: #1E1E32;

  /* Gold System */
  --gold-bright: #F0C04A;
  --gold:        #C9A84C;
  --gold-dim:    #9A7A32;
  --gold-glow:   rgba(201,168,76,.35);
  --gold2:       rgba(201,168,76,.15);
  --gold3:       rgba(201,168,76,.07);
  --gold4:       rgba(201,168,76,.03);

  /* Semantic Colors */
  --text:    #EDE5D5;
  --text2:   #B8A98A;
  --dim:     #666680;
  --border:  rgba(201,168,76,.22);
  --border2: rgba(255,255,255,.07);
  --border3: rgba(255,255,255,.04);

  /* Status */
  --green:  #5DDDA0;
  --blue:   #5AADFF;
  --red:    #FF5574;
  --orange: #FFAA44;
  --purple: #A78BFA;

  /* Old compat aliases */
  --bg:  var(--void);
  --bg2: var(--surface);
  --bg3: var(--raised);
  --bg4: var(--elevated);

  /* Radii */
  --r:  8px;
  --rl: 14px;
  --rx: 20px;

  /* Typography */
  --font-head: 'Cormorant Garamond', 'Apple SD Gothic Neo', serif;
  --font-body: 'Inter', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;

  /* Shadows */
  --shadow-gold: 0 0 30px rgba(201,168,76,.12), 0 0 60px rgba(201,168,76,.05);
  --shadow-card: 0 4px 24px rgba(0,0,0,.4), 0 1px 4px rgba(0,0,0,.6);
  --shadow-hover: 0 8px 40px rgba(0,0,0,.5), 0 0 20px rgba(201,168,76,.1);
}

/* ── Reset ────────────────────────────────────────── */
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box }

body {
  background: var(--void);
  color: var(--text);
  font-family: var(--font-body);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.5;
}

input,button,select,textarea { font-family: inherit }
button { cursor: pointer }

::-webkit-scrollbar { width: 4px; height: 4px }
::-webkit-scrollbar-track { background: var(--deep) }
::-webkit-scrollbar-thumb { background: rgba(201,168,76,.25); border-radius: 2px }
::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,.45) }

/* ── Canvas / Grid Overlay ────────────────────────── */
#particle-canvas {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  opacity: .6;
}
.grid-overlay {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(201,168,76,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(201,168,76,.04) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%);
}

/* ── Header (Topbar) ──────────────────────────────── */
#hdr {
  position: relative; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 64px; flex-shrink: 0;
  background: rgba(8,8,16,.92);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 1px 0 var(--border), var(--shadow-gold);
}
.tb-left { display:flex; align-items:center; gap:16px }
.logo-mark {
  width:36px; height:36px; border-radius:10px;
  background: linear-gradient(135deg, var(--gold-dim), var(--gold-bright));
  display:flex; align-items:center; justify-content:center;
  font-family: var(--font-head); font-weight:700; font-size:14px; color:#000;
  box-shadow: 0 0 16px var(--gold-glow);
  flex-shrink:0;
}
.logo {
  display:flex; flex-direction:column; gap:1px;
}
.logo-name {
  font-size:11px; font-weight:700; letter-spacing:.2em;
  color: var(--gold-bright); text-transform:uppercase;
}
.logo-sub {
  font-size:8px; color: var(--dim); letter-spacing:.08em;
}
/* compat: old .logo em */
.logo em { color:var(--dim); font-style:normal; font-weight:400; margin-left:6px; letter-spacing:.04em; font-size:9px }

.tb-kpis { display:flex; gap:2px; align-items:center }
.hkpis { display:flex; gap:2px }
.hkpi {
  display:flex; flex-direction:column; align-items:flex-end;
  padding:6px 14px; border-radius:var(--r);
  background: rgba(255,255,255,.03);
  border: 1px solid var(--border3);
  min-width:90px; text-align:right;
  transition: all .2s;
}
.hkpi:hover { background:var(--gold4); border-color:var(--border) }
.hkpiv {
  font-family: var(--font-mono); font-size:15px; font-weight:600;
  color: var(--gold-bright); line-height:1;
  letter-spacing:-.02em;
}
.hkpil {
  font-size:7.5px; color:var(--dim); letter-spacing:.08em;
  text-transform:uppercase; margin-top:3px;
}
.tb-right { display:flex; align-items:center; gap:8px }
.tb-clock {
  font-family: var(--font-mono); font-size:12px; color:var(--text2);
  letter-spacing:.06em; padding:0 12px;
}
.tb-icon-btn {
  width:34px; height:34px; border-radius:10px;
  background:rgba(255,255,255,.04); border:1px solid var(--border3);
  display:flex; align-items:center; justify-content:center;
  font-size:15px; cursor:pointer; transition:all .2s; color:var(--dim);
}
.tb-icon-btn:hover { background:var(--gold4); border-color:var(--border); color:var(--gold) }
.tb-user {
  display:flex; align-items:center; gap:8px;
  padding:4px 12px; border-radius:var(--r);
  background:rgba(255,255,255,.03); border:1px solid var(--border3);
  cursor:pointer; transition:all .2s;
}
.tb-user:hover { background:var(--gold4); border-color:var(--border) }
.tb-avatar {
  width:26px; height:26px; border-radius:8px;
  background: linear-gradient(135deg, var(--gold-dim), var(--gold-bright));
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:700; color:#000;
}
.tb-uname { font-size:10px; color:var(--text2); font-weight:600 }

/* ── Tabs ─────────────────────────────────────────── */
#tabs {
  position:relative; z-index:99;
  display:flex; align-items:center;
  background: rgba(8,8,16,.88);
  border-bottom:1px solid var(--border2);
  overflow-x:auto; flex-shrink:0; padding:0 8px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
#tabs::-webkit-scrollbar { height:0 }

.tab-slider {
  position:absolute; bottom:0; left:0;
  height:2px; background:linear-gradient(90deg, var(--gold-dim), var(--gold-bright), var(--gold-dim));
  border-radius:2px 2px 0 0;
  transition: left .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 0 12px var(--gold-glow);
  pointer-events:none; z-index:2;
}

.tab {
  position:relative; padding:0 18px; height:44px;
  display:flex; align-items:center; gap:6px;
  font-size:10.5px; font-weight:600; cursor:pointer;
  color:var(--dim); border-bottom:2px solid transparent;
  white-space:nowrap; transition:color .2s;
  background:transparent; border-top:none; border-left:none; border-right:none;
  letter-spacing:.02em;
}
.tab.act { color:var(--gold-bright) }
.tab:hover:not(.act) { color:var(--text) }
.tbadge {
  font-size:9px; padding:1px 5px; border-radius:8px;
  background:var(--gold2); color:var(--gold);
}

/* ── Main Layout ──────────────────────────────────── */
#main { flex:1; overflow:hidden; display:flex; flex-direction:column; position:relative; z-index:1 }
.view { display:none; flex:1; overflow-y:auto; padding:24px }
.view.act { display:block }

/* ── Cards (Glassmorphism) ───────────────────────── */
.card {
  background: rgba(13,13,26,.75);
  border: 1px solid var(--border2);
  border-radius: var(--rl);
  padding: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  box-shadow: var(--shadow-card);
  transition: box-shadow .3s, border-color .3s;
}
.card:hover { border-color:rgba(201,168,76,.15); box-shadow:var(--shadow-hover) }

.chd {
  font-size:10px; font-weight:700; letter-spacing:.12em;
  text-transform:uppercase; color:var(--gold); margin-bottom:14px;
  padding-bottom:10px; border-bottom:1px solid var(--gold3);
  font-family: var(--font-body);
}

/* ── Grid helpers ─────────────────────────────────── */
.grid { display:grid; gap:12px }
.g2 { grid-template-columns:1fr 1fr }
.g3 { grid-template-columns:1fr 1fr 1fr }
.g4 { grid-template-columns:1fr 1fr 1fr 1fr }

/* ── Fields ───────────────────────────────────────── */
.field { display:flex; flex-direction:column; gap:4px }
.field label { font-size:9px; color:var(--dim); letter-spacing:.06em; text-transform:uppercase }
.field input,.field select,.field textarea {
  padding:8px 12px;
  background:rgba(255,255,255,.04);
  border:1px solid var(--border2);
  border-radius:var(--r);
  color:var(--text); font-size:12px;
  transition:border-color .15s, box-shadow .15s;
}
.field input:focus,.field select:focus,.field textarea:focus {
  outline:none; border-color:var(--gold);
  box-shadow: 0 0 0 3px rgba(201,168,76,.1);
}
.field textarea { resize:vertical; min-height:60px }
.field .hint { font-size:9px; color:var(--dim); margin-top:2px }
.fcalc { color:var(--green)!important; background:rgba(93,221,154,.06)!important; border-color:rgba(93,221,154,.2)!important }

/* ── Buttons ──────────────────────────────────────── */
.btn {
  position:relative; overflow:hidden;
  padding:9px 18px; border-radius:var(--r);
  border:1px solid var(--border);
  background:var(--gold2); color:var(--gold);
  font-size:10.5px; font-weight:700; cursor:pointer;
  transition:all .2s; letter-spacing:.04em; white-space:nowrap;
  font-family:var(--font-body);
}
.btn::after {
  content:''; position:absolute; inset:0;
  background:radial-gradient(circle at var(--rx,50%) var(--ry,50%), rgba(255,255,255,.25) 0%, transparent 60%);
  opacity:0; transition:opacity .3s;
}
.btn:hover { background:rgba(201,168,76,.28); box-shadow:0 0 20px rgba(201,168,76,.15) }
.btn:hover::after { opacity:1 }
.btn:active { transform:scale(.97) }
.btn.ghost { background:rgba(255,255,255,.04); border-color:var(--border2); color:var(--dim) }
.btn.ghost:hover { border-color:var(--gold); color:var(--gold); background:var(--gold4) }
.btn.danger { background:rgba(255,85,100,.1); border-color:rgba(255,85,100,.3); color:var(--red) }
.btn.success { background:rgba(93,221,154,.1); border-color:rgba(93,221,154,.3); color:var(--green) }
.btn.full { width:100% }
.btn.primary {
  background: linear-gradient(135deg, var(--gold-dim) 0%, var(--gold-bright) 100%);
  color:#000; border-color:transparent; font-weight:700;
  box-shadow:0 4px 20px rgba(201,168,76,.25);
}
.btn.primary:hover { box-shadow:0 6px 30px rgba(201,168,76,.4); transform:translateY(-1px) }
.btns { display:flex; gap:8px; flex-wrap:wrap }

/* ── Badges ───────────────────────────────────────── */
.badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:10px; font-size:9px; font-weight:700 }
.badge.gold { background:var(--gold2); color:var(--gold); border:1px solid var(--border) }
.badge.green { background:rgba(93,221,154,.1); color:var(--green); border:1px solid rgba(93,221,154,.2) }
.badge.red { background:rgba(255,85,100,.1); color:var(--red); border:1px solid rgba(255,85,100,.2) }
.badge.orange { background:rgba(255,170,68,.1); color:var(--orange); border:1px solid rgba(255,170,68,.2) }

/* ── Tables ───────────────────────────────────────── */
.tbl { width:100%; border-collapse:collapse; font-size:11.5px }
.tbl th {
  padding:9px 12px; text-align:left; font-size:9px; font-weight:700;
  letter-spacing:.1em; color:var(--dim); text-transform:uppercase;
  border-bottom:1px solid var(--border);
  background:rgba(8,8,16,.9); position:sticky; top:0; z-index:3;
}
.tbl td { padding:8px 12px; border-bottom:1px solid var(--border3) }
.tbl tr:hover td { background:rgba(255,255,255,.025) }
.tbl .num { text-align:right; font-family:var(--font-mono); font-variant-numeric:tabular-nums }

/* ── Alerts ───────────────────────────────────────── */
.alert { padding:10px 14px; border-radius:var(--r); margin-bottom:10px; display:flex; gap:8px; align-items:flex-start; font-size:11px }
.alert.warn { background:rgba(255,170,68,.08); border:1px solid rgba(255,170,68,.25); color:var(--orange) }
.alert.info { background:rgba(90,173,255,.08); border:1px solid rgba(90,173,255,.2); color:var(--blue) }
.alert.ok { background:rgba(93,221,154,.08); border:1px solid rgba(93,221,154,.2); color:var(--green) }
.alert.danger { background:rgba(255,85,100,.08); border:1px solid rgba(255,85,100,.2); color:var(--red) }

/* ── KPI Cards ────────────────────────────────────── */
.kgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px }
.kcard {
  background: rgba(13,13,26,.75);
  border:1px solid var(--border2); border-radius:var(--rl);
  padding:16px 18px;
  backdrop-filter:blur(20px);
  transition:all .3s;
}
.kcard:hover { border-color:var(--border); box-shadow:var(--shadow-hover) }
.kcard.gold { border-color:var(--border); background:var(--gold3) }
.kcard .kl { font-size:8px; color:var(--dim); letter-spacing:.1em; text-transform:uppercase; margin-bottom:6px }
.kcard .kv { font-size:22px; font-weight:700; color:var(--gold); line-height:1; font-family:var(--font-mono) }
.kcard .ks { font-size:10px; color:var(--dim); margin-top:4px }

/* ── Step Bar ─────────────────────────────────────── */
#stepbar {
  display:flex; padding:12px 24px;
  background:rgba(8,8,16,.9);
  border-bottom:1px solid var(--border2);
  flex-shrink:0; gap:0;
  backdrop-filter:blur(16px);
}
.si,.step-item { display:flex; align-items:center; flex:1 }
.si:last-child,.step-item:last-child { flex:0 }

/* support both .sdot and .step-dot */
.sdot,.step-dot {
  width:28px; height:28px; border-radius:50%;
  border:1.5px solid var(--border2);
  display:flex; align-items:center; justify-content:center;
  font-size:9px; font-weight:700; color:var(--dim);
  background:var(--raised); flex-shrink:0;
  transition:all .25s cubic-bezier(.4,0,.2,1); cursor:pointer;
}
.sdot.act,.sdot.active,.step-dot.act,.step-dot.active {
  border-color:var(--gold); color:var(--gold);
  background:var(--gold2);
  box-shadow:0 0 14px rgba(201,168,76,.25);
}
.sdot.done,.step-dot.done {
  border-color:var(--green); color:var(--void);
  background:var(--green);
  box-shadow:0 0 12px rgba(93,221,154,.3);
}

.sl,.step-label {
  font-size:9px; color:var(--dim); margin-left:6px;
  letter-spacing:.04em; white-space:nowrap;
}
.sl.act,.sl.active,.step-label.act,.step-label.active { color:var(--gold) }
.sl.done,.step-label.done { color:var(--green) }

.sline,.step-line {
  flex:1; height:1px; background:var(--border2); margin:0 8px;
  transition:background .25s;
}
.sline.done,.step-line.done { background:var(--green) }

/* ── Modal ────────────────────────────────────────── */
.modal-bg {
  position:fixed; inset:0; z-index:500;
  background:rgba(0,0,0,.7);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center;
}
.modal {
  background: rgba(13,13,26,.95);
  border:1px solid var(--border);
  border-radius:var(--rx); padding:28px;
  width:560px; max-width:95vw; max-height:88vh; overflow-y:auto;
  box-shadow: 0 20px 80px rgba(0,0,0,.7), var(--shadow-gold);
  animation: modal-in .25s cubic-bezier(.34,1.56,.64,1);
}
@keyframes modal-in {
  from { opacity:0; transform:translateY(16px) scale(.97) }
  to   { opacity:1; transform:none }
}
.modal-title { font-size:18px; font-weight:600; color:var(--gold); margin-bottom:4px; font-family:var(--font-head) }
.modal-sub { font-size:11px; color:var(--dim); margin-bottom:20px }
.modal-btns { display:flex; gap:8px; justify-content:flex-end; margin-top:20px }

/* ── Status Bar ───────────────────────────────────── */
#stbar {
  padding:5px 24px;
  background:rgba(4,4,10,.95);
  border-top:1px solid var(--border2);
  font-size:9px; color:var(--dim);
  display:flex; align-items:center; gap:14px; flex-shrink:0;
}
.stdot { width:5px; height:5px; border-radius:50%; background:var(--green); animation:pulse 2s infinite }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* ── Step Pages ───────────────────────────────────── */
.step-page { display:none }
.step-page.act { display:block }

/* ── Scope Cards ──────────────────────────────────── */
.scope-card {
  background:rgba(18,18,32,.7);
  border:1px solid var(--border2);
  border-radius:var(--r); margin-bottom:10px;
  backdrop-filter:blur(12px);
  transition:border-color .2s;
}
.scope-card:hover { border-color:rgba(201,168,76,.18) }
.scope-hd {
  padding:10px 14px; display:flex; align-items:center; gap:8px;
  border-bottom:1px solid var(--border3);
}
.scope-hd h4 { font-size:11px; font-weight:700 }
.scope-body { padding:12px 14px }
.slvls { display:flex; gap:4px; margin-bottom:10px }
.slvl {
  flex:1; padding:7px; border-radius:var(--r);
  border:1px solid var(--border2); text-align:center; cursor:pointer;
  font-size:9px; font-weight:700; color:var(--dim); transition:all .15s;
}
.slvl.act { border-color:var(--gold); background:var(--gold2); color:var(--gold) }
.sopts { display:grid; grid-template-columns:1fr 1fr; gap:4px }
.scope-opts { display:grid; grid-template-columns:1fr 1fr; gap:4px }
.sopt { display:flex; align-items:center; gap:6px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,.03); cursor:pointer }
.sopt label { font-size:10px; color:var(--text); cursor:pointer; flex:1 }
.sopt input[type=checkbox] { accent-color:var(--gold); width:12px; height:12px }
.sopt select { padding:2px 5px; background:var(--elevated); border:1px solid var(--border2); border-radius:4px; color:var(--text); font-size:9px }

/* ── List Items ───────────────────────────────────── */
.item-list { display:flex; flex-direction:column; gap:8px }
.list-item {
  background:rgba(18,18,32,.7); border:1px solid var(--border2);
  border-radius:var(--r); padding:12px 14px;
  display:flex; align-items:center; gap:12px;
  transition:all .2s; backdrop-filter:blur(8px);
}
.list-item:hover { border-color:var(--border); box-shadow:var(--shadow-hover) }
.list-item .li-icon { width:36px; height:36px; border-radius:8px; background:var(--gold2); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0 }
.list-item .li-info { flex:1; min-width:0 }
.list-item .li-name { font-size:12px; font-weight:700; color:var(--text) }
.list-item .li-sub { font-size:10px; color:var(--dim); margin-top:2px }
.list-item .li-btns { display:flex; gap:6px; flex-shrink:0 }

/* ── Input Groups ─────────────────────────────────── */
.ig { display:flex; align-items:stretch }
.ig input { border-radius:var(--r) 0 0 var(--r); flex:1; border-right:none }
.ig .iu { padding:0 10px; background:var(--elevated); border:1px solid var(--border2); border-radius:0 var(--r) var(--r) 0; font-size:9px; color:var(--dim); display:flex; align-items:center; white-space:nowrap }

/* ── Package Buttons ──────────────────────────────── */
.pkgbs { display:flex; gap:4px }
.pkgb { flex:1; padding:7px 0; border-radius:var(--r); border:1px solid var(--border2); background:rgba(255,255,255,.03); color:var(--dim); font-size:9px; font-weight:700; cursor:pointer; text-align:center; transition:all .15s }
.pkgb.act { border-color:var(--gold); background:var(--gold2); color:var(--gold) }

/* ── bgoption (scope level selector) ─────────────── */
.bgoption { display:flex; align-items:center; gap:6px; padding:4px 0; cursor:pointer }
.bgoption.active .bgo-dot { background:var(--gold); box-shadow:0 0 8px var(--gold-glow) }

/* ── Spec Panels ──────────────────────────────────── */
.sp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; margin-bottom:12px }
.sp-card { background:rgba(18,18,32,.7); border:1px solid var(--border2); border-radius:var(--r); overflow:hidden }
.sp-hd { padding:8px 12px; display:flex; align-items:center; justify-content:space-between; background:rgba(4,4,10,.6); border-bottom:1px solid var(--border2) }
.sp-hd .snm { font-size:11px; font-weight:700 }
.sp-body { padding:10px 12px }
.sp-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; margin-bottom:6px }
.sp-val .sv { font-size:9px; color:var(--dim) }
.sp-val span { display:block; font-size:11px; font-weight:700; color:var(--text); margin-top:1px }
.sp-calc { display:flex; gap:8px; flex-wrap:wrap }
.sc .sck { font-size:9px; color:var(--dim) }
.sc span { color:var(--green); font-weight:700 }

/* ── Nav Buttons (Wizard) ─────────────────────────── */
#nav {
  padding:14px 24px;
  background:rgba(8,8,16,.92);
  border-top:1px solid var(--border2);
  display:flex; align-items:center; justify-content:space-between;
  flex-shrink:0; backdrop-filter:blur(16px);
}
.nvinfo { font-size:10px; color:var(--dim) }
.nvinfo b { color:var(--text) }
.nbtn {
  padding:10px 28px; border-radius:var(--r);
  border:1px solid var(--border);
  font-size:11.5px; font-weight:700; cursor:pointer;
  transition:all .2s; letter-spacing:.04em;
  font-family:var(--font-body);
}
.nbtn.prev { background:rgba(255,255,255,.04); color:var(--dim) }
.nbtn.prev:hover { color:var(--text); border-color:var(--border2) }
.nbtn.next { background:var(--gold2); color:var(--gold) }
.nbtn.next:hover { background:rgba(201,168,76,.28); box-shadow:0 0 20px rgba(201,168,76,.15) }
.nbtn.go {
  background:linear-gradient(135deg, var(--gold-dim), var(--gold-bright));
  color:#000; border-color:transparent; font-weight:800;
  box-shadow:0 4px 24px rgba(201,168,76,.3);
}
.nbtn.go:hover { box-shadow:0 6px 36px rgba(201,168,76,.45); transform:translateY(-1px) }

/* ── Toast Notifications ──────────────────────────── */
#toast-container {
  position:fixed; top:80px; right:20px; z-index:2000;
  display:flex; flex-direction:column; gap:8px; pointer-events:none;
}
.toast {
  display:flex; align-items:center; gap:10px;
  padding:12px 18px; border-radius:var(--r);
  background:rgba(13,13,26,.95);
  border:1px solid var(--border);
  backdrop-filter:blur(20px);
  font-size:11px; color:var(--text);
  box-shadow:var(--shadow-card);
  animation:toast-in .3s cubic-bezier(.34,1.56,.64,1);
  pointer-events:auto; min-width:220px; max-width:340px;
}
.toast.ok  { border-color:rgba(93,221,154,.4) }
.toast.err { border-color:rgba(255,85,100,.4) }
.toast.warn{ border-color:rgba(255,170,68,.4) }
@keyframes toast-in  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:none} }
@keyframes toast-out { from{opacity:1;transform:none} to{opacity:0;transform:translateX(20px)} }

/* ── View Transitions ─────────────────────────────── */
.view { animation:view-in .2s ease-out }
@keyframes view-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

/* ── Responsive ───────────────────────────────────── */
@media (max-width:1024px) {
  .kgrid { grid-template-columns:repeat(2,1fr) }
  .g4 { grid-template-columns:1fr 1fr }
  .hkpi { min-width:70px }
  .hkpiv { font-size:12px }
  .tb-clock { display:none }
}
@media (max-width:768px) {
  #hdr { height:52px; padding:0 14px }
  .logo-mark { width:30px; height:30px; font-size:12px }
  .logo-name { font-size:9px }
  .hkpi { min-width:60px; padding:4px 8px }
  .hkpiv { font-size:11px }
  .tb-user .tb-uname { display:none }
  .tab { padding:0 10px; font-size:9.5px }
  .g3 { grid-template-columns:1fr 1fr }
  .sopts,.scope-opts { grid-template-columns:1fr }
  .kgrid { grid-template-columns:repeat(2,1fr) }
  .sp-row { grid-template-columns:1fr 1fr }
}

/* ── Print ────────────────────────────────────────── */
@media print {
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact }
  #particle-canvas,.grid-overlay,#tabs,#stepbar,#nav,#stbar,#toast-container { display:none!important }
  body,#hdr,#main,.view,.card,.modal-bg { background:#fff!important; color:#000!important }
  .view { display:block!important; overflow:visible!important }
  .card { border:1px solid #ddd!important; box-shadow:none!important; break-inside:avoid }
  .hkpiv,.logo-name { color:#000!important }
  .gold,.chd,.kcard .kv { color:#333!important }
}
</style>'''

content = OLD_STYLE_PAT.sub(LUXURY_CSS, content, count=1)

# ─── 3. Canvas + Grid Overlay after <body> ────────────────────────────────────
content = content.replace(
    '<body>',
    '''<body>
<canvas id="particle-canvas"></canvas>
<div class="grid-overlay"></div>
<div id="toast-container"></div>''',
    1
)

# ─── 4. Replace Header ────────────────────────────────────────────────────────
OLD_HDR = '''<div id="hdr">
  <div class="logo">ECOREAN BOC <em>Build Operation Center v1.0</em></div>
  <div class="hkpis">
    <div class="hkpi"><div class="hkpiv" id="hv1">₩0</div><div class="hkpil">VAT포함 합계</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv2">—</div><div class="hkpil">㎡당 단가</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv3">0</div><div class="hkpil">저장 프로젝트</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv4" style="color:var(--orange)">0</div><div class="hkpil">승인 대기</div></div>
  </div>
</div>'''

NEW_HDR = '''<div id="hdr">
  <div class="tb-left">
    <div class="logo-mark">E</div>
    <div class="logo">
      <div class="logo-name">ECOREAN BOC</div>
      <div class="logo-sub">Build Operation Center v1.0</div>
    </div>
  </div>
  <div class="hkpis">
    <div class="hkpi"><div class="hkpiv" id="hv1">₩0</div><div class="hkpil">VAT포함 합계</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv2">—</div><div class="hkpil">㎡당 단가</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv3">0</div><div class="hkpil">저장 프로젝트</div></div>
    <div class="hkpi"><div class="hkpiv" id="hv4" style="color:var(--orange)">0</div><div class="hkpil">승인 대기</div></div>
  </div>
  <div class="tb-right">
    <div class="tb-clock" id="tb-clock">--:--:--</div>
    <div class="tb-icon-btn" title="알림">🔔</div>
    <div class="tb-icon-btn" title="설정">⚙️</div>
    <div class="tb-user">
      <div class="tb-avatar">EC</div>
      <div class="tb-uname">대표</div>
    </div>
  </div>
</div>'''

content = content.replace(OLD_HDR, NEW_HDR, 1)

# ─── 5. Add Tab Slider ────────────────────────────────────────────────────────
OLD_TABS_END = '  <button class="tab" data-v="dbmgr">⚙️ DB관리</button>\n</div>'
NEW_TABS_END = '  <button class="tab" data-v="dbmgr">⚙️ DB관리</button>\n  <div class="tab-slider" id="tab-slider"></div>\n</div>'
content = content.replace(OLD_TABS_END, NEW_TABS_END, 1)

# ─── 6. Luxury JS ─────────────────────────────────────────────────────────────
LUXURY_JS = '''
<script>
/* ═══════════════════════════════════════════════════
   ECOREAN BOC — Luxury JS Enhancements
═══════════════════════════════════════════════════ */

// ── Clock ──────────────────────────────────────────
(function initClock() {
  const el = document.getElementById('tb-clock');
  if (!el) return;
  function tick() {
    const d = new Date();
    el.textContent = d.toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  }
  tick();
  setInterval(tick, 1000);
})();

// ── Tab Slider ─────────────────────────────────────
(function initTabSlider() {
  const slider = document.getElementById('tab-slider');
  if (!slider) return;

  function moveSlider(tab) {
    const tr = tab.getBoundingClientRect();
    const pr = tab.parentElement.getBoundingClientRect();
    slider.style.left  = (tr.left - pr.left + tab.parentElement.scrollLeft) + 'px';
    slider.style.width = tr.width + 'px';
  }

  const tabs = document.querySelectorAll('#tabs .tab');
  const active = document.querySelector('#tabs .tab.act');
  if (active) moveSlider(active);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => moveSlider(tab));
  });

  // MutationObserver for dynamic tab activation
  const obs = new MutationObserver(() => {
    const a = document.querySelector('#tabs .tab.act');
    if (a) moveSlider(a);
  });
  const tabsEl = document.getElementById('tabs');
  if (tabsEl) obs.observe(tabsEl, {attributes:true, subtree:true, attributeFilter:['class']});

  window.addEventListener('resize', () => {
    const a = document.querySelector('#tabs .tab.act');
    if (a) moveSlider(a);
  });
})();

// ── Button Ripple ──────────────────────────────────
(function initRipple() {
  function addRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
    const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
    btn.style.setProperty('--rx', x + '%');
    btn.style.setProperty('--ry', y + '%');
  }

  function attach(btn) {
    if (btn.dataset.ripple) return;
    btn.dataset.ripple = '1';
    btn.addEventListener('mouseenter', addRipple);
  }

  document.querySelectorAll('.btn,.nbtn').forEach(attach);

  const obs = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.matches?.('.btn,.nbtn')) attach(n);
      n.querySelectorAll?.('.btn,.nbtn').forEach(attach);
    }));
  });
  obs.observe(document.body, {childList:true, subtree:true});
})();

// ── Web Audio Click Sound ──────────────────────────
(function initSound() {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function playTick(freq, dur) {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch(e) {}
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('.btn,.nbtn,.tab,.sdot,.step-dot,.slvl,.pkgb');
    if (t) playTick(t.classList.contains('go') ? 880 : 660, 0.08);
  });
})();

// ── Particle System ────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], mouse = {x:-999, y:-999};

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  class Particle {
    constructor() { this.reset(true) }
    reset(init) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : H + 10;
      this.size = Math.random() * 1.5 + .5;
      this.speedY = -(Math.random() * .4 + .1);
      this.speedX = (Math.random() - .5) * .15;
      this.opacity = Math.random() * .6 + .1;
      this.life = 1;
      this.decay = Math.random() * .002 + .001;
    }
    update() {
      const dx = this.x - mouse.x, dy = this.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 100) { this.speedX += dx/dist * .02; this.speedY += dy/dist * .02; }
      this.x += this.speedX; this.y += this.speedY;
      this.life -= this.decay;
      if (this.life <= 0 || this.y < -10) this.reset(false);
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.life * this.opacity;
      ctx.fillStyle = `hsl(${43 + Math.sin(Date.now()*.001 + this.x) * 8}, 65%, 60%)`;
      ctx.shadowColor = 'rgba(201,168,76,.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < 50; i++) particles.push(new Particle());

  function frame() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(frame);
  }
  frame();
})();

// ── Toast Notification ─────────────────────────────
window.showToast = function(msg, type) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type||'');
  const icon = type==='ok'?'✓':type==='err'?'✕':type==='warn'?'⚠':'ℹ';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toast-out .3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 3000);
};

// ── Count-up Animation for KPI values ─────────────
(function initCountUp() {
  const obs = new MutationObserver(muts => {
    muts.forEach(m => {
      if (m.type !== 'childList' && m.type !== 'characterData') return;
      const el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      if (!el || !el.classList.contains('hkpiv')) return;
      const raw = el.textContent.replace(/[₩,]/g, '').trim();
      const num = parseFloat(raw);
      if (isNaN(num) || num === 0) return;
      el.style.transition = 'color .3s';
      el.style.color = 'var(--gold-bright)';
      setTimeout(() => { el.style.color = '' }, 400);
    });
  });
  document.querySelectorAll('.hkpiv').forEach(el =>
    obs.observe(el, {childList:true, characterData:true, subtree:true})
  );
})();

</script>'''

# Insert before </body></html>
content = content.replace('</script>\n</body>\n</html>', '</script>' + LUXURY_JS + '\n</body>\n</html>', 1)

# ─── Write ────────────────────────────────────────────────────────────────────
SRC.write_text(content, encoding='utf-8')
print(f'Done - {SRC} ({len(content):,} bytes)')
