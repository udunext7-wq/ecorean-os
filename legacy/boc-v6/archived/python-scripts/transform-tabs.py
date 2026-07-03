# -*- coding: utf-8 -*-
"""
ECOREAN BOC — Add [온톨로지] and [AI 엔진] tabs
"""
from pathlib import Path

SRC = Path(__file__).parent / 'ECOREAN_BOC_v1.html'
c = SRC.read_text(encoding='utf-8')

# ─────────────────────────────────────────────────────────────────────────────
# 1. CSS
# ─────────────────────────────────────────────────────────────────────────────
NEW_CSS = """
/* ═══════════════════════════════════════════
   온톨로지 탭
═══════════════════════════════════════════ */
.onto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}
.onto-card {
  background: rgba(13,13,26,.82);
  border: 1px solid var(--border2);
  border-radius: var(--rl);
  padding: 16px;
  backdrop-filter: blur(12px);
  transition: all .2s;
  border-left: 3px solid transparent;
}
.onto-card:hover { box-shadow: var(--shadow-hover); border-color: rgba(201,168,76,.2) }
.onto-card.type-auto    { border-left-color: var(--blue) }
.onto-card.type-warn    { border-left-color: var(--orange) }
.onto-card.type-forced  { border-left-color: var(--red) }
.onto-card.type-n-a     { opacity: .5 }
.onto-card-hd {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.onto-id {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--gold); font-weight: 600;
}
.onto-type-badge {
  font-size: 8px; font-weight: 700;
  padding: 2px 7px; border-radius: 3px;
  font-family: var(--font-mono);
}
.onto-type-badge.auto   { background: rgba(90,173,255,.15); color: var(--blue) }
.onto-type-badge.warn   { background: rgba(255,170,68,.15); color: var(--orange) }
.onto-type-badge.forced { background: rgba(255,85,100,.15); color: var(--red) }
.onto-flow {
  display: flex; align-items: center; gap: 8px;
  margin: 8px 0; flex-wrap: wrap;
}
.onto-trigger {
  font-family: var(--font-mono); font-size: 10px;
  color: var(--blue); background: rgba(90,173,255,.08);
  border: 1px solid rgba(90,173,255,.2);
  border-radius: 4px; padding: 2px 8px;
}
.onto-arrow { color: var(--gold-dim); font-size: 14px; flex-shrink: 0 }
.onto-triggered {
  font-family: var(--font-mono); font-size: 10px;
  color: var(--green); background: rgba(93,221,154,.08);
  border: 1px solid rgba(93,221,154,.2);
  border-radius: 4px; padding: 2px 8px;
}
.onto-note { font-size: 10px; color: var(--dim); margin-top: 6px; line-height: 1.5 }
.onto-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px; padding-top: 8px;
  border-top: 1px solid var(--border3);
}
.onto-status {
  display: flex; align-items: center; gap: 5px;
  font-size: 9px; color: var(--dim); font-family: var(--font-mono);
}
.onto-led {
  width: 6px; height: 6px; border-radius: 50%;
}
.onto-led.active  { background: var(--green); box-shadow: 0 0 6px var(--green) }
.onto-led.pending { background: var(--orange) }
.onto-led.na      { background: var(--dim) }

/* ── Crawler candidates ── */
.craw-cand {
  background: rgba(13,13,26,.7);
  border: 1px solid var(--border2);
  border-radius: var(--r);
  padding: 12px 14px;
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 6px;
}
.craw-cand .cc-id {
  font-family: var(--font-mono); font-size: 10px; color: var(--gold);
  min-width: 80px;
}
.craw-cand .cc-nm { flex: 1; font-size: 11px; color: var(--text) }
.craw-cand .cc-val {
  font-family: var(--font-mono); font-size: 11px; color: var(--text2);
  margin-right: 8px;
}

/* ── Onto stat pills ── */
.onto-stats {
  display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;
}
.onto-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: var(--r);
  background: rgba(255,255,255,.03); border: 1px solid var(--border2);
  font-size: 12px; font-weight: 600;
}
.onto-pill .op-num { font-family: var(--font-mono); font-size: 20px; font-weight: 700 }

/* ═══════════════════════════════════════════
   AI 엔진 탭
═══════════════════════════════════════════ */
.ai-section-title {
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  color: var(--gold); text-transform: uppercase;
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--gold3);
  display: flex; align-items: center; gap: 8px;
}
.ai-section-title::before {
  content: '';
  width: 2px; height: 12px;
  background: linear-gradient(180deg, var(--gold-bright), var(--gold-dim));
  border-radius: 1px; flex-shrink: 0;
}

/* Gauge */
.ai-gauge-wrap { margin: 16px 0 }
.ai-gauge-nums {
  display: flex; justify-content: space-between;
  font-family: var(--font-mono); font-size: 10px; color: var(--dim);
  margin-bottom: 6px;
}
.ai-gauge-track {
  height: 10px; background: rgba(255,255,255,.06);
  border-radius: 5px; overflow: hidden; position: relative;
}
.ai-gauge-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gold-dim), var(--gold-bright));
  border-radius: 5px;
  transition: width 1s cubic-bezier(.4,0,.2,1);
  position: relative;
}
.ai-gauge-fill::after {
  content: '';
  position: absolute; right: 0; top: 50%;
  transform: translateY(-50%);
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--gold-bright);
  box-shadow: 0 0 10px var(--gold-glow);
}
.ai-gauge-markers {
  display: flex; justify-content: space-between;
  margin-top: 6px; position: relative;
}
.ai-gauge-mark {
  font-size: 8.5px; font-family: var(--font-mono);
  color: var(--dim); display: flex; flex-direction: column;
  align-items: center; gap: 2px;
}
.ai-gauge-mark.passed .mark-num { color: var(--gold) }
.ai-gauge-mark .mark-line {
  width: 1px; height: 6px; background: var(--dim);
}
.ai-gauge-mark.passed .mark-line { background: var(--gold) }

/* Roadmap */
.ai-roadmap {
  display: flex; position: relative; margin: 24px 0;
  padding: 0 20px;
}
.ai-roadmap::before {
  content: ''; position: absolute;
  top: 20px; left: 20px; right: 20px;
  height: 2px; background: var(--border2);
}
.ai-roadmap .rm-fill {
  position: absolute; top: 20px; left: 20px; height: 2px;
  background: linear-gradient(90deg, var(--gold-dim), var(--gold));
  transition: width 1s ease;
}
.ai-milestone {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 8px; position: relative; z-index: 1;
}
.ai-ms-dot {
  width: 40px; height: 40px; border-radius: 50%;
  border: 2px solid var(--border2);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 700; font-family: var(--font-mono);
  background: var(--void); color: var(--dim);
  transition: all .4s;
}
.ai-ms-dot.reached { border-color: var(--gold); color: var(--gold); background: var(--gold2) }
.ai-ms-dot.current {
  border-color: var(--green); color: var(--void); background: var(--green);
  box-shadow: 0 0 20px rgba(93,221,154,.4);
  animation: led-pulse-g 1.5s infinite;
}
.ai-ms-label { font-size: 9px; color: var(--dim); letter-spacing: .04em; text-align: center }
.ai-ms-mode  { font-size: 11px; font-weight: 700; text-align: center; color: var(--text2) }
.ai-ms-mode.current { color: var(--green) }
.ai-ms-mode.reached { color: var(--gold) }
.ai-ms-threshold {
  font-size: 8px; font-family: var(--font-mono); color: var(--dim);
  padding: 1px 6px; border-radius: 3px; background: rgba(255,255,255,.04);
}

/* Error rate bar chart */
.ai-bar-chart { display: flex; flex-direction: column; gap: 8px }
.ai-bar-row { display: flex; align-items: center; gap: 10px }
.ai-bar-label {
  font-size: 10px; color: var(--dim); width: 70px;
  flex-shrink: 0; text-align: right;
  font-family: var(--font-mono);
}
.ai-bar-track {
  flex: 1; height: 7px; background: rgba(255,255,255,.06);
  border-radius: 4px; overflow: hidden;
}
.ai-bar-fill { height: 100%; border-radius: 4px; transition: width .7s ease }
.ai-bar-val {
  font-size: 10px; color: var(--text2);
  width: 42px; font-family: var(--font-mono); text-align: right;
}

/* Pending corrections */
.corr-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  background: rgba(18,18,32,.7); border: 1px solid var(--border2);
  border-radius: var(--r); margin-bottom: 6px;
  transition: border-color .2s;
}
.corr-item:hover { border-color: var(--border) }
.corr-pid {
  font-family: var(--font-mono); font-size: 11px;
  color: var(--gold); min-width: 90px;
}
.corr-desc { flex: 1; font-size: 11px; color: var(--text) }
.corr-pct {
  font-family: var(--font-mono); font-size: 13px; font-weight: 700;
  min-width: 50px; text-align: right;
}
.corr-pct.up   { color: var(--red) }
.corr-pct.down { color: var(--green) }

/* Crawler log */
.craw-log-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border3); font-size: 10px;
}
.craw-log-row:last-child { border-bottom: none }
.craw-log-time { font-family: var(--font-mono); color: var(--dim); min-width: 120px }
.craw-log-msg { flex: 1; color: var(--text) }
.craw-log-badge {
  font-size: 9px; padding: 1px 7px; border-radius: 3px;
  font-family: var(--font-mono);
}
.craw-log-badge.ok  { background: rgba(93,221,154,.15); color: var(--green) }
.craw-log-badge.err { background: rgba(255,85,100,.15); color: var(--red) }
.craw-log-badge.run { background: rgba(201,168,76,.15); color: var(--gold) }
"""

c = c.replace('</style>', NEW_CSS + '\n</style>', 1)

# ─────────────────────────────────────────────────────────────────────────────
# 2. TAB BUTTONS
# ─────────────────────────────────────────────────────────────────────────────
OLD_TABS_END = '  <div class="tab-slider" id="tab-slider"></div>\n</div>'
NEW_TABS_END = (
    '  <button class="tab" data-v="ontology">온톨로지</button>\n'
    '  <button class="tab" data-v="aiengine">AI 엔진</button>\n'
    '  <div class="tab-slider" id="tab-slider"></div>\n</div>'
)
c = c.replace(OLD_TABS_END, NEW_TABS_END, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3. VIEW HTML — insert before </div><!-- /main -->
# ─────────────────────────────────────────────────────────────────────────────
NEW_VIEWS = """
<!-- ═══════════════════════════════════════════════════ 온톨로지 탭 -->
<div class="view" id="view-ontology">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <h2 style="font-size:17px;font-weight:700;color:var(--gold);font-family:var(--font-head)">온톨로지 Rule Engine</h2>
    <div class="btns">
      <button class="btn ghost" style="font-size:11px" onclick="renderOntologyView()">새로고침</button>
      <button class="btn" style="font-size:11px" onclick="showAddRuleModalPro()">+ 규칙 추가 요청</button>
    </div>
  </div>
  <div style="font-size:11px;color:var(--dim);margin-bottom:18px">규칙 변경은 대표 승인 필수. 승인된 규칙만 견적 계산에 반영됩니다.</div>

  <!-- 통계 요약 pills -->
  <div class="onto-stats" id="onto-stats-row"></div>

  <!-- 필터 탭 -->
  <div class="btns" style="margin-bottom:16px" id="onto-filter-bar">
    <button class="btn active" data-filter="ALL" onclick="filterOnto('ALL',this)">전체</button>
    <button class="btn ghost" data-filter="AUTO_INCLUDE" onclick="filterOnto('AUTO_INCLUDE',this)">AUTO_INCLUDE</button>
    <button class="btn ghost" data-filter="WARN_CONDITIONAL" onclick="filterOnto('WARN_CONDITIONAL',this)">WARN</button>
    <button class="btn ghost" data-filter="FORCED" onclick="filterOnto('FORCED',this)">FORCED</button>
    <button class="btn ghost" data-filter="PENDING" onclick="filterOnto('PENDING',this)">승인 대기</button>
  </div>

  <!-- 규칙 카드 그리드 -->
  <div class="onto-grid" id="onto-cards"></div>

  <!-- 크롤러 후보 섹션 -->
  <div style="margin-top:32px">
    <div class="ai-section-title">CRAWLER CANDIDATES — 신규 규칙 후보</div>
    <div style="font-size:11px;color:var(--dim);margin-bottom:14px">크롤러가 발견한 단가 패턴 후보입니다. 승인 시 온톨로지에 추가됩니다.</div>
    <div id="onto-candidates"></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ AI 엔진 탭 -->
<div class="view" id="view-aiengine">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <h2 style="font-size:17px;font-weight:700;color:var(--gold);font-family:var(--font-head)">AI 엔진 대시보드</h2>
    <div class="btns">
      <button class="btn ghost" style="font-size:11px" onclick="renderAIEngineView()">새로고침</button>
      <button class="btn ghost" style="font-size:11px" onclick="loadStatsFromFile()">통계 파일 불러오기</button>
    </div>
  </div>
  <div style="font-size:11px;color:var(--dim);margin-bottom:24px">완료보고 누적 건수에 따라 AI 모드가 자동 활성화됩니다.</div>

  <div class="grid g2" style="gap:20px;margin-bottom:24px">

    <!-- 학습 데이터 게이지 카드 -->
    <div class="card">
      <div class="ai-section-title">LEARNING DATA</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px">
        <span style="font-family:var(--font-mono);font-size:40px;font-weight:700;color:var(--gold-bright)" id="ai-data-count">0</span>
        <span style="font-size:13px;color:var(--dim)">건</span>
        <span style="font-size:11px;color:var(--dim);margin-left:8px">/ 목표 500건</span>
      </div>
      <div class="ai-gauge-wrap">
        <div class="ai-gauge-track">
          <div class="ai-gauge-fill" id="ai-gauge-fill" style="width:0%"></div>
        </div>
        <div class="ai-gauge-markers">
          <div class="ai-gauge-mark" id="ai-mark-0"><div class="mark-line"></div><span class="mark-num">0</span></div>
          <div class="ai-gauge-mark" id="ai-mark-50"><div class="mark-line"></div><span class="mark-num">50</span></div>
          <div class="ai-gauge-mark" id="ai-mark-100"><div class="mark-line"></div><span class="mark-num">100</span></div>
          <div class="ai-gauge-mark" id="ai-mark-500"><div class="mark-line"></div><span class="mark-num">500</span></div>
        </div>
      </div>
      <div style="margin-top:16px;font-size:11px;color:var(--dim)">
        현재 모드: <span id="ai-current-mode" style="color:var(--gold);font-weight:700;font-family:var(--font-mono)">수동 입력</span>
      </div>
    </div>

    <!-- 단계별 활성화 로드맵 -->
    <div class="card">
      <div class="ai-section-title">ACTIVATION ROADMAP</div>
      <div class="ai-roadmap">
        <div class="rm-fill" id="rm-fill" style="width:0%"></div>
        <div class="ai-milestone">
          <div class="ai-ms-dot" id="ms0">0</div>
          <div class="ai-ms-mode" id="ms0-mode">수동 입력</div>
          <div class="ai-ms-threshold">0건</div>
          <div class="ai-ms-label">Manual</div>
        </div>
        <div class="ai-milestone">
          <div class="ai-ms-dot" id="ms50">50</div>
          <div class="ai-ms-mode" id="ms50-mode">통계 분석</div>
          <div class="ai-ms-threshold">50건</div>
          <div class="ai-ms-label">Statistical</div>
        </div>
        <div class="ai-milestone">
          <div class="ai-ms-dot" id="ms100">100</div>
          <div class="ai-ms-mode" id="ms100-mode">XGBoost</div>
          <div class="ai-ms-threshold">100건</div>
          <div class="ai-ms-label">ML</div>
        </div>
        <div class="ai-milestone">
          <div class="ai-ms-dot" id="ms500">500</div>
          <div class="ai-ms-mode" id="ms500-mode">딥러닝</div>
          <div class="ai-ms-threshold">500건</div>
          <div class="ai-ms-label">Deep Learning</div>
        </div>
      </div>
    </div>
  </div>

  <div class="grid g2" style="gap:20px;margin-bottom:24px">

    <!-- 공정별 오차율 차트 -->
    <div class="card">
      <div class="ai-section-title">PROCESS ERROR RATE</div>
      <div style="font-size:10px;color:var(--dim);margin-bottom:14px">통계 파일 기반. 오차 클수록 AI 보정 우선순위 높음.</div>
      <div class="ai-bar-chart" id="ai-error-chart">
        <div style="text-align:center;padding:20px;color:var(--dim);font-size:11px">
          통계 파일을 불러오면 차트가 표시됩니다.
        </div>
      </div>
    </div>

    <!-- 보정 대기 항목 -->
    <div class="card">
      <div class="ai-section-title" style="justify-content:space-between">
        <span>CORRECTION QUEUE</span>
        <span id="ai-corr-count" style="font-family:var(--font-mono);font-size:13px;color:var(--orange)">0</span>
      </div>
      <div id="ai-correction-list">
        <div style="text-align:center;padding:20px;color:var(--dim);font-size:11px">보정 대기 없음</div>
      </div>
    </div>
  </div>

  <!-- 크롤러 최근 실행 결과 -->
  <div class="card">
    <div class="ai-section-title" style="justify-content:space-between">
      <span>CRAWLER LOG</span>
      <div class="btns">
        <button class="btn ghost" style="font-size:10px" onclick="loadCrawlerResult()">결과 파일 불러오기</button>
        <button class="btn ghost" style="font-size:10px" onclick="clearCrawlerLog()">로그 초기화</button>
      </div>
    </div>
    <div id="ai-crawler-log">
      <div style="text-align:center;padding:20px;color:var(--dim);font-size:11px">
        크롤러 로그 없음. <code style="font-size:9px">python src/crawlers/labor-rate-crawler.py</code>
      </div>
    </div>
  </div>
</div>

"""

c = c.replace('</div><!-- /main -->', NEW_VIEWS + '\n</div><!-- /main -->', 1)

# ─────────────────────────────────────────────────────────────────────────────
# 4. MODALS — Add rule modal + approve/reject modal
# ─────────────────────────────────────────────────────────────────────────────
NEW_MODALS = """
<!-- 모달: 규칙 추가 요청 -->
<div class="modal-bg" id="addRuleModal" style="display:none">
  <div class="modal">
    <div class="modal-title">온톨로지 규칙 추가 요청</div>
    <div class="modal-sub">대표 승인 후 ontology-rules.json에 반영됩니다.</div>
    <div class="grid g2" style="gap:12px;margin-bottom:12px">
      <div class="field"><label>트리거 공정 ID *</label><input id="rule-trigger" type="text" placeholder="예: FLR_HB"></div>
      <div class="field"><label>자동포함 공정 ID *</label><input id="rule-triggered" type="text" placeholder="예: MSN_SL"></div>
    </div>
    <div class="grid g2" style="gap:12px;margin-bottom:12px">
      <div class="field"><label>규칙 타입</label>
        <select id="rule-type">
          <option value="AUTO_INCLUDE">AUTO_INCLUDE</option>
          <option value="WARN_CONDITIONAL">WARN_CONDITIONAL</option>
          <option value="FORCED">FORCED</option>
        </select>
      </div>
      <div class="field"><label>적용 조건</label><input id="rule-condition" type="text" placeholder="예: 헤링본 선택 시"></div>
    </div>
    <div class="field" style="margin-bottom:12px"><label>규칙 설명 *</label><textarea id="rule-note" rows="2" placeholder="이 규칙이 필요한 이유..."></textarea></div>
    <div class="field"><label>요청 사유</label><input id="rule-reason" type="text" placeholder="실무 경험 / 도면 분석 기반..."></div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal('addRuleModal')">취소</button>
      <button class="btn" onclick="submitRuleRequest()">승인 요청 제출</button>
    </div>
  </div>
</div>
"""

# Insert modals before </body>
c = c.replace('\n</body>\n</html>', NEW_MODALS + '\n</body>\n</html>', 1)

# ─────────────────────────────────────────────────────────────────────────────
# 5. TAB HANDLER UPDATE
# ─────────────────────────────────────────────────────────────────────────────
OLD_HANDLER = "  if(v==='dbmgr')renderDB2();\n  if(v==='completion')updCmpSel();"
NEW_HANDLER = "  if(v==='dbmgr')renderDB2();\n  if(v==='completion')updCmpSel();\n  if(v==='ontology')renderOntologyView();\n  if(v==='aiengine')renderAIEngineView();"
c = c.replace(OLD_HANDLER, NEW_HANDLER, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 6. JS FUNCTIONS — insert before </script> of main block
# ─────────────────────────────────────────────────────────────────────────────
NEW_JS = r"""
// ════════════════════════════════════════════════════════════════
// 온톨로지 Rule Engine — 카드 시각화
// ════════════════════════════════════════════════════════════════
const ONTO_RULES = [
  {id:'R001',trigger:'LGS_WL',      triggered:'GYP_WL',          type:'AUTO_INCLUDE',   condition:'LGS 선택 시',      status:'active', note:'LGS 경량틀 → 석고보드 자동 포함'},
  {id:'R002',trigger:'TILE_BT',     triggered:'WTP_BT+WTP_PM',   type:'WARN_CONDITIONAL',condition:'욕실·습식',         status:'active', note:'바닥타일 → 방수+보호몰탈 경고'},
  {id:'R003',trigger:'TILE_BT/BW',  triggered:'TILE_GRF/GRW',    type:'AUTO_INCLUDE',   condition:'타일 선택 시',      status:'active', note:'타일 → 줄눈 자동 포함'},
  {id:'R004',trigger:'FLR_HB',      triggered:'MSN_SL',          type:'AUTO_INCLUDE',   condition:'헤링본 선택 시',    status:'active', note:'헤링본 강마루 → 셀프레벨링 자동'},
  {id:'R005',trigger:'TILE_PO',     triggered:'MSN_SL',          type:'AUTO_INCLUDE',   condition:'대형슬랩 선택 시',  status:'active', note:'대형포세린 → 셀프레벨링 자동'},
  {id:'R006',trigger:'FLR_HW',      triggered:'FLR_SK',          type:'AUTO_INCLUDE',   condition:'바닥재 선택 시',    status:'active', note:'강마루·원목 → 걸레받이 자동'},
  {id:'R007',trigger:'FLR_OW',      triggered:'FLR_OS',          type:'AUTO_INCLUDE',   condition:'원목마루 선택 시',  status:'active', note:'원목마루 → 오일스테인 자동'},
  {id:'R008',trigger:'PNT_WB',      triggered:'PNT_PT+PNT_PR',   type:'AUTO_INCLUDE',   condition:'수성페인트 선택 시',status:'active', note:'수성페인트 → 퍼티+프라이머 자동'},
  {id:'R009',trigger:'PNT_WB',      triggered:'PNT_PR',          type:'AUTO_INCLUDE',   condition:'천장 도장 시',      status:'active', note:'수성페인트(천장) → 프라이머 자동'},
  {id:'R010',trigger:'WLP_PP',      triggered:'WLP_UB',          type:'AUTO_INCLUDE',   condition:'도배 선택 시',      status:'active', note:'실크·천연벽지 → 초배 자동'},
  {id:'R011',trigger:'WIN_SYS',     triggered:'WIN_PU',          type:'AUTO_INCLUDE',   condition:'창호교체 시',       status:'active', note:'창호 → EVA폼+코킹 자동'},
  {id:'R012',trigger:'WTP_BT',      triggered:'WTP_PM',          type:'AUTO_INCLUDE',   condition:'욕실방수 선택 시',  status:'active', note:'욕실방수 → 보호몰탈 자동'},
  {id:'R013',trigger:'BAT_SH',      triggered:'WTP_BT',          type:'WARN_CONDITIONAL',condition:'샤워부스 설치 시', status:'active', note:'샤워부스 → 욕실방수 경고'},
  {id:'R014',trigger:'PLB_BLR',     triggered:'PLB_HTF',         type:'AUTO_INCLUDE',   condition:'보일러교체 시',     status:'active', note:'보일러교체 → 난방배관 자동'},
  {id:'R015',trigger:'DR_INT',      triggered:'(built-in)',       type:'AUTO_INCLUDE',   condition:'항상',              status:'active', note:'문틀+문짝+문선 세트 자동 포함'},
  {id:'R016',trigger:'FLR_EP',      triggered:'MSN_SL+PNT_PR',   type:'AUTO_INCLUDE',   condition:'에폭시 선택 시',    status:'active', note:'에폭시바닥 → 셀프레벨링+프라이머'},
  {id:'R017',trigger:'MAR_FL/WL',   triggered:'MAR_POL',         type:'AUTO_INCLUDE',   condition:'대리석 선택 시',    status:'active', note:'대리석 → 석재연마+왁스 자동'},
  {id:'R018',trigger:'MAS_BLK',     triggered:'MSN_FL',          type:'AUTO_INCLUDE',   condition:'조적 선택 시',      status:'active', note:'조적(블록) → 시멘트미장 자동'},
  {id:'R019',trigger:'GYP_ID',      triggered:'LGS_WL',          type:'AUTO_INCLUDE',   condition:'간접등박스 시',     status:'active', note:'간접등박스 → LGS틀 자동'},
  {id:'R020',trigger:'TILE_BT/BW',  triggered:'(진단경고)',       type:'WARN_CONDITIONAL',condition:'욕실 리모델링',    status:'active', note:'욕실타일 → 철거여부 확인 제안'},
  {id:'R021',trigger:'EXT_EIFS',    triggered:'EXT_STC',         type:'AUTO_INCLUDE',   condition:'외단열 선택 시',    status:'active', note:'외단열EIFS → 스타코+탄성도료'},
  {id:'R022',trigger:'FLR_DK',      triggered:'FLR_OS+TILE_GRF', type:'AUTO_INCLUDE',   condition:'데크 선택 시',      status:'active', note:'목재데크 → 오일스테인+줄눈'},
  {id:'R023',trigger:'GYP_WL(욕실)',triggered:'WTP_BT+TILE_BW',  type:'WARN_CONDITIONAL',condition:'욕실',             status:'active', note:'방수석고보드 → 욕실방수+벽타일 경고'},
  {id:'R-F1',trigger:'철거공정',    triggered:'PRE_BY+PRE_WS',   type:'FORCED',         condition:'항상',              status:'active', note:'철거 → 보양+폐기물 강제 포함'},
  {id:'R-F2',trigger:'갈바나이즈관',triggered:'PLB_RG',          type:'FORCED',         condition:'배관 불량 감지',    status:'active', note:'갈바나이즈관 감지 → 배관 강제교체'},
  {id:'R-F3',trigger:'노후(>20년)', triggered:'ELE_RG',          type:'FORCED',         condition:'건축연도 20년+',    status:'active', note:'20년 초과 → 전기배선 권장'},
];

let _ontoFilter = 'ALL';
let _pendingRules = JSON.parse(localStorage.getItem('boc_pending_rules')||'[]');

function renderOntologyView() {
  const statsRow = document.getElementById('onto-stats-row');
  const cards = document.getElementById('onto-cards');
  const candidates = document.getElementById('onto-candidates');
  if (!cards) return;

  const allRules = [...ONTO_RULES, ..._pendingRules.map(r=>({...r,status:'pending'}))];
  const autoCount   = allRules.filter(r=>r.type==='AUTO_INCLUDE').length;
  const warnCount   = allRules.filter(r=>r.type==='WARN_CONDITIONAL').length;
  const forcedCount = allRules.filter(r=>r.type==='FORCED').length;
  const pendingCount= _pendingRules.length;

  // Stats pills
  if (statsRow) statsRow.innerHTML = `
    <div class="onto-pill"><span class="op-num" style="color:var(--blue)">${autoCount}</span><span style="color:var(--dim);font-size:11px">AUTO</span></div>
    <div class="onto-pill"><span class="op-num" style="color:var(--orange)">${warnCount}</span><span style="color:var(--dim);font-size:11px">WARN</span></div>
    <div class="onto-pill"><span class="op-num" style="color:var(--red)">${forcedCount}</span><span style="color:var(--dim);font-size:11px">FORCED</span></div>
    <div class="onto-pill"><span class="op-num" style="color:var(--gold)">${allRules.length}</span><span style="color:var(--dim);font-size:11px">총 규칙</span></div>
    ${pendingCount>0?`<div class="onto-pill"><span class="op-num" style="color:var(--orange)">${pendingCount}</span><span style="color:var(--dim);font-size:11px">승인 대기</span></div>`:''}
  `;

  // Filter
  let filtered = allRules;
  if (_ontoFilter === 'AUTO_INCLUDE')     filtered = allRules.filter(r=>r.type==='AUTO_INCLUDE');
  else if (_ontoFilter === 'WARN_CONDITIONAL') filtered = allRules.filter(r=>r.type==='WARN_CONDITIONAL');
  else if (_ontoFilter === 'FORCED')      filtered = allRules.filter(r=>r.type==='FORCED');
  else if (_ontoFilter === 'PENDING')     filtered = _pendingRules.map(r=>({...r,status:'pending'}));

  // Cards
  cards.innerHTML = filtered.map(r => {
    const typeCls = r.type==='AUTO_INCLUDE'?'auto':r.type==='WARN_CONDITIONAL'?'warn':'forced';
    const typeLbl = r.type==='AUTO_INCLUDE'?'AUTO':r.type==='WARN_CONDITIONAL'?'WARN':'FORCED';
    const cardCls = `onto-card type-${typeCls}${r.status==='pending'?' type-n-a':''}`;
    const ledCls  = r.status==='active'?'active':r.status==='pending'?'pending':'na';
    return `
    <div class="${cardCls}">
      <div class="onto-card-hd">
        <span class="onto-id">${r.id}</span>
        <span class="onto-type-badge ${typeCls}">${typeLbl}</span>
      </div>
      <div class="onto-flow">
        <span class="onto-trigger">${r.trigger}</span>
        <span class="onto-arrow">&#10140;</span>
        <span class="onto-triggered">${r.triggered}</span>
      </div>
      <div class="onto-note">${r.condition} &nbsp;·&nbsp; ${r.note}</div>
      <div class="onto-footer">
        <div class="onto-status">
          <div class="onto-led ${ledCls}"></div>
          ${r.status==='active'?'ACTIVE':r.status==='pending'?'PENDING APPROVAL':'N/A'}
        </div>
        ${r.status==='pending'?`<div class="btns">
          <button class="btn success" style="font-size:9px;padding:3px 8px" onclick="approveRuleReq('${r.id}')">승인</button>
          <button class="btn danger" style="font-size:9px;padding:3px 8px" onclick="rejectRuleReq('${r.id}')">거부</button>
        </div>`:''}
      </div>
    </div>`;
  }).join('');

  // Crawler candidates
  const crawData = JSON.parse(localStorage.getItem('boc_crawler_candidates')||'[]');
  if (candidates) {
    if (crawData.length === 0) {
      candidates.innerHTML = `<div style="text-align:center;padding:16px;color:var(--dim);font-size:11px">크롤러 후보 없음. 크롤러 실행 후 결과를 불러오세요.</div>`;
    } else {
      candidates.innerHTML = crawData.map(d=>`
        <div class="craw-cand">
          <span class="cc-id">${d.code||'?'}</span>
          <span class="cc-nm">${d.name||d.rule||''}</span>
          <span class="cc-val">${d.value||d.rate||''}</span>
          <button class="btn" style="font-size:9px;padding:4px 10px" onclick="approveCrawlCandidate('${d.code}')">적용</button>
          <button class="btn ghost" style="font-size:9px;padding:4px 10px" onclick="rejectCrawlCandidate('${d.code}')">무시</button>
        </div>`).join('');
    }
  }
}

function filterOnto(type, btn) {
  _ontoFilter = type;
  document.querySelectorAll('#onto-filter-bar .btn').forEach(b=>{
    b.classList.remove('active'); b.classList.add('ghost');
  });
  btn.classList.remove('ghost'); btn.classList.add('active');
  renderOntologyView();
}

function showAddRuleModalPro() {
  document.getElementById('addRuleModal').style.display='flex';
}

function submitRuleRequest() {
  const trigger   = document.getElementById('rule-trigger')?.value?.trim();
  const triggered = document.getElementById('rule-triggered')?.value?.trim();
  const type      = document.getElementById('rule-type')?.value;
  const condition = document.getElementById('rule-condition')?.value?.trim();
  const note      = document.getElementById('rule-note')?.value?.trim();
  const reason    = document.getElementById('rule-reason')?.value?.trim();
  if (!trigger || !triggered || !note) { alert('트리거, 자동포함 공정 ID, 설명은 필수입니다.'); return; }
  const id = 'R-REQ-' + Date.now();
  const newRule = { id, trigger, triggered, type, condition: condition||'—', note, reason, status:'pending', requestedAt:new Date().toISOString() };
  _pendingRules.push(newRule);
  localStorage.setItem('boc_pending_rules', JSON.stringify(_pendingRules));
  // 승인함에도 등록
  BOC.approvalReqs.unshift({ id:'RULE-'+id, type:'rule_add', rule:newRule, requestedAt:newRule.requestedAt, status:'pending' });
  bocSave(); updHdrBoc();
  closeModal('addRuleModal');
  document.getElementById('rule-trigger').value='';
  document.getElementById('rule-triggered').value='';
  document.getElementById('rule-condition').value='';
  document.getElementById('rule-note').value='';
  document.getElementById('rule-reason').value='';
  renderOntologyView();
  st('규칙 추가 요청 등록 — 대표 승인 후 반영됩니다');
}

function approveRuleReq(id) {
  _pendingRules = _pendingRules.filter(r=>r.id!==id);
  localStorage.setItem('boc_pending_rules', JSON.stringify(_pendingRules));
  renderOntologyView();
  st('규칙 승인 완료 (실제 반영은 ontology-rules.json 수동 업데이트 필요)');
}
function rejectRuleReq(id) {
  _pendingRules = _pendingRules.filter(r=>r.id!==id);
  localStorage.setItem('boc_pending_rules', JSON.stringify(_pendingRules));
  renderOntologyView(); st('규칙 요청 거부됨');
}
function approveCrawlCandidate(code) {
  let d = JSON.parse(localStorage.getItem('boc_crawler_candidates')||'[]');
  d = d.filter(x=>x.code!==code);
  localStorage.setItem('boc_crawler_candidates', JSON.stringify(d));
  renderOntologyView(); st(`[${code}] 크롤러 후보 적용`);
}
function rejectCrawlCandidate(code) {
  let d = JSON.parse(localStorage.getItem('boc_crawler_candidates')||'[]');
  d = d.filter(x=>x.code!==code);
  localStorage.setItem('boc_crawler_candidates', JSON.stringify(d));
  renderOntologyView(); st(`[${code}] 크롤러 후보 무시`);
}

// ════════════════════════════════════════════════════════════════
// AI 엔진 대시보드
// ════════════════════════════════════════════════════════════════
function renderAIEngineView() {
  // 학습 데이터 건수 (완료보고 기반)
  const completions = JSON.parse(localStorage.getItem('boc_completions')||'[]');
  const dataCount = Math.max(completions.length, BOC.projects.filter(p=>p.completedAt).length);
  const el = document.getElementById('ai-data-count');
  if (el) el.textContent = dataCount.toLocaleString();

  // 게이지
  const gaugePct = Math.min(100, (dataCount / 500) * 100);
  const fill = document.getElementById('ai-gauge-fill');
  if (fill) setTimeout(()=>{ fill.style.width = gaugePct + '%' }, 100);

  // 마커 상태
  [0,50,100,500].forEach(n=>{
    const m = document.getElementById('ai-mark-'+n);
    if (m) m.classList.toggle('passed', dataCount >= n);
  });

  // 현재 모드
  let mode = '수동 입력', modeColor = 'var(--dim)';
  if (dataCount >= 500) { mode = '딥러닝'; modeColor = 'var(--gold-bright)'; }
  else if (dataCount >= 100) { mode = 'XGBoost'; modeColor = 'var(--gold)'; }
  else if (dataCount >= 50)  { mode = '통계 분석'; modeColor = 'var(--blue)'; }
  else { mode = '수동 입력'; modeColor = 'var(--dim)'; }
  const modeEl = document.getElementById('ai-current-mode');
  if (modeEl) { modeEl.textContent = mode; modeEl.style.color = modeColor; }

  // 로드맵 업데이트
  const milestones = [{id:'ms0',thr:0},{id:'ms50',thr:50},{id:'ms100',thr:100},{id:'ms500',thr:500}];
  milestones.forEach((ms,i)=>{
    const dot  = document.getElementById(ms.id);
    const modeDiv = document.getElementById(ms.id+'-mode');
    if (!dot) return;
    dot.className = 'ai-ms-dot';
    if (modeDiv) modeDiv.className = 'ai-ms-mode';
    const nextThr = milestones[i+1]?.thr ?? Infinity;
    if (dataCount >= nextThr) {
      dot.classList.add('reached');
      if (modeDiv) modeDiv.classList.add('reached');
    } else if (dataCount >= ms.thr) {
      dot.classList.add('current');
      if (modeDiv) modeDiv.classList.add('current');
    }
  });

  // 로드맵 진행 바
  const rmFill = document.getElementById('rm-fill');
  if (rmFill) {
    const pct = Math.min(100, (dataCount/500)*100);
    setTimeout(()=>{ rmFill.style.width = pct + '%' }, 150);
  }

  // 공정별 오차율 차트
  const statsData = localStorage.getItem('boc_stats');
  const chartEl = document.getElementById('ai-error-chart');
  if (chartEl && statsData) {
    try {
      const result = JSON.parse(statsData);
      const stats = result.stats || [];
      const catMap = {};
      stats.forEach(s=>{
        const cat = s.processId?.split('_')[0] || '기타';
        if (!catMap[cat]) catMap[cat] = {sum:0,count:0};
        catMap[cat].sum += Math.abs(parseFloat(s.correctionPct)||0);
        catMap[cat].count++;
      });
      const bars = Object.entries(catMap)
        .map(([k,v])=>({cat:k, avg:v.sum/v.count}))
        .sort((a,b)=>b.avg-a.avg)
        .slice(0,8);
      const maxVal = Math.max(...bars.map(b=>b.avg), 1);
      chartEl.innerHTML = bars.map(b=>{
        const pct = (b.avg/maxVal*100).toFixed(0);
        const col = b.avg>15?'var(--red)':b.avg>8?'var(--orange)':'var(--green)';
        return `<div class="ai-bar-row">
          <span class="ai-bar-label">${b.cat}</span>
          <div class="ai-bar-track"><div class="ai-bar-fill" style="width:${pct}%;background:${col}"></div></div>
          <span class="ai-bar-val">${b.avg.toFixed(1)}%</span>
        </div>`;
      }).join('') || '<div style="color:var(--dim);font-size:10px;padding:8px">데이터 없음</div>';
    } catch(e) {
      chartEl.innerHTML = `<div style="color:var(--red);font-size:10px">파싱 오류</div>`;
    }
  }

  // 보정 대기 항목
  const corrList = document.getElementById('ai-correction-list');
  const corrCount = document.getElementById('ai-corr-count');
  const pending = BOC.approvalReqs.filter(r=>r.status==='pending');
  if (corrCount) corrCount.textContent = pending.length;
  if (corrList) {
    if (pending.length === 0) {
      corrList.innerHTML = `<div style="text-align:center;padding:16px;color:var(--dim);font-size:11px">보정 대기 없음</div>`;
    } else {
      corrList.innerHTML = pending.slice(0,10).map(r=>{
        const pct = r.correctionPct || r.rule?.type || '';
        const pctNum = parseFloat(pct);
        const pctCls = pctNum>0?'up':'down';
        const desc = r.type==='rule_add'?`규칙 추가: ${r.rule?.trigger}→${r.rule?.triggered}`
                    : `단가 보정: ${r.processId||r.id}`;
        return `<div class="corr-item">
          <span class="corr-pid">${r.id?.slice(0,12)||'—'}</span>
          <span class="corr-desc">${desc}</span>
          ${pctNum?`<span class="corr-pct ${pctCls}">${pctNum>0?'+':''}${pctNum}%</span>`:''}
          <button class="btn success" style="font-size:9px;padding:4px 10px" onclick="approveItem('${r.id||r.requestId}')">승인</button>
          <button class="btn danger" style="font-size:9px;padding:4px 10px" onclick="rejectItem('${r.id||r.requestId}')">거부</button>
        </div>`;
      }).join('');
    }
  }

  // 크롤러 로그
  renderCrawlerLog();
}

function approveItem(id) {
  const req = BOC.approvalReqs.find(r=>(r.id||r.requestId)===id);
  if (req) { req.status='approved'; bocSave(); renderAIEngineView(); updHdrBoc(); st('항목 승인 완료'); }
}
function rejectItem(id) {
  const req = BOC.approvalReqs.find(r=>(r.id||r.requestId)===id);
  if (req) { req.status='rejected'; bocSave(); renderAIEngineView(); updHdrBoc(); st('항목 거부됨'); }
}

function renderCrawlerLog() {
  const el = document.getElementById('ai-crawler-log');
  if (!el) return;
  const log = JSON.parse(localStorage.getItem('boc_crawler_log')||'[]');
  if (log.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--dim);font-size:11px">크롤러 로그 없음</div>`;
    return;
  }
  el.innerHTML = log.slice(0,15).map(l=>`
    <div class="craw-log-row">
      <span class="craw-log-time">${(l.ts||l.time||'—').slice(0,16)}</span>
      <span class="craw-log-msg">${l.message||l.msg||''}</span>
      <span class="craw-log-badge ${l.ok||l.status==='ok'?'ok':l.status==='running'?'run':'err'}">${l.ok||l.status==='ok'?'OK':l.status==='running'?'RUNNING':'FAIL'}</span>
    </div>`).join('');
}

function loadCrawlerResult() {
  const input = document.createElement('input');
  input.type='file'; input.accept='.json,.md,.txt';
  input.onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target.result;
        // Try JSON parse
        let entry;
        try {
          const data = JSON.parse(text);
          entry = { ts:new Date().toISOString(), message:`${f.name}: ${data.count||data.total||Object.keys(data).length}건 처리`, status:'ok', ok:true, data };
        } catch {
          entry = { ts:new Date().toISOString(), message:f.name+': '+text.slice(0,80), status:'ok', ok:true };
        }
        const log = JSON.parse(localStorage.getItem('boc_crawler_log')||'[]');
        log.unshift(entry); log.splice(50);
        localStorage.setItem('boc_crawler_log', JSON.stringify(log));
        renderAIEngineView(); st('크롤러 결과 로드 완료');
      } catch(err) { alert('로드 오류: '+err.message); }
    };
    reader.readAsText(f);
  };
  input.click();
}

function clearCrawlerLog() {
  if (!confirm('크롤러 로그를 초기화하시겠습니까?')) return;
  localStorage.removeItem('boc_crawler_log');
  renderAIEngineView(); st('크롤러 로그 초기화');
}
"""

# Insert before the closing </script> of the FIRST (main) script block
# The main script ends just before the luxury JS <script> tag
c = c.replace('\n</script>\n<script>\n/* ═══════════════════════════════════════════════════\n   ECOREAN BOC — Luxury JS Enhancements',
              NEW_JS + '\n</script>\n<script>\n/* ═══════════════════════════════════════════════════\n   ECOREAN BOC — Luxury JS Enhancements', 1)

# ─────────────────────────────────────────────────────────────────────────────
# WRITE
# ─────────────────────────────────────────────────────────────────────────────
SRC.write_text(c, encoding='utf-8')
print(f'Done: {c.count(chr(10))} lines, {len(c):,} bytes')
