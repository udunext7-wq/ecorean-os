/* ECOREAN 12개 탭 모듈 */
'use strict';

const MODULES = (() => {
  const TAB_CONFIG = [
    { id: 0,  icon: '🏠', label: '대시보드',   render: renderDashboard },
    { id: 1,  icon: '📋', label: '공정DB',     render: renderProcessDB },
    { id: 2,  icon: '🗂️', label: '카테고리',   render: renderCategory },
    { id: 3,  icon: '🔗', label: '온톨로지',   render: renderOntology },
    { id: 4,  icon: '📐', label: '면적계산',   render: renderAreaCalc },
    { id: 5,  icon: '📦', label: '패키지',     render: renderPackage },
    { id: 6,  icon: '🔍', label: '공정검색',   render: renderSearch },
    { id: 7,  icon: '📊', label: '분석',       render: renderAnalysis },
    { id: 8,  icon: '📁', label: '프로젝트',   render: renderProject },
    { id: 9,  icon: '⚙️', label: '설정',       render: renderSettings },
    { id: 10, icon: '💰', label: '견적서',     render: renderEstimate },
    { id: 11, icon: '🖨️', label: '출력/저장',  render: renderPrint }
  ];

  let currentTab = 0;
  let estimateItems = [];
  let projectInfo = {
    name: '',
    client: '',
    site: '',
    date: new Date().toISOString().split('T')[0],
    manager: 'ECOREAN'
  };

  function getTabConfig() { return TAB_CONFIG; }
  function getCurrentTab() { return currentTab; }

  function switchTab(id) {
    currentTab = id;
    UI.renderTab(id);
  }

  /* ─────────── TAB 0: 대시보드 ─────────── */
  function renderDashboard(container) {
    const procs = CALC.getAllProcesses();
    const cats = CALC.getAllCategories();
    const result = CALC.calcEstimate(estimateItems);
    const catBreak = CALC.calcByCategory(result.details || []);

    container.innerHTML = `
      <div class="dash-grid">
        <div class="dash-card gold-border">
          <div class="dash-card-title">총 공정 수</div>
          <div class="dash-card-value">${procs.length}<span>개</span></div>
        </div>
        <div class="dash-card gold-border">
          <div class="dash-card-title">카테고리 수</div>
          <div class="dash-card-value">${cats.length}<span>개</span></div>
        </div>
        <div class="dash-card gold-border">
          <div class="dash-card-title">현재 견적 항목</div>
          <div class="dash-card-value">${estimateItems.length}<span>건</span></div>
        </div>
        <div class="dash-card gold-border highlight">
          <div class="dash-card-title">견적 합계 (VAT 포함)</div>
          <div class="dash-card-value large">${CALC.formatKRW(result.total)}</div>
        </div>
      </div>

      <div class="dash-row">
        <div class="dash-section">
          <h3 class="section-title">카테고리별 요약</h3>
          <div class="cat-summary">
            ${cats.map(c => {
              const data = catBreak[c.id];
              return `<div class="cat-row">
                <span class="cat-dot" style="background:${c.color}"></span>
                <span class="cat-name">${c.name}</span>
                <span class="cat-amount">${data ? CALC.formatKRW(data.total) : '-'}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="dash-section">
          <h3 class="section-title">빠른 액션</h3>
          <div class="quick-btns">
            <button class="qbtn" onclick="MODULES.switchTab(10)">💰 견적서 작성</button>
            <button class="qbtn" onclick="MODULES.switchTab(1)">📋 공정 찾기</button>
            <button class="qbtn" onclick="MODULES.switchTab(5)">📦 패키지 적용</button>
            <button class="qbtn" onclick="MODULES.switchTab(3)">🔗 온톨로지 보기</button>
            <button class="qbtn" onclick="MODULES.switchTab(11)">🖨️ 출력하기</button>
          </div>
        </div>
      </div>
    `;
  }

  /* ─────────── TAB 1: 공정DB ─────────── */
  function renderProcessDB(container) {
    const procs = CALC.getAllProcesses();
    const cats = CALC.getAllCategories();
    let filterCat = container._filterCat || '';

    container.innerHTML = `
      <div class="toolbar">
        <select id="catFilter" class="sel">
          <option value="">전체 카테고리</option>
          ${cats.map(c => `<option value="${c.id}" ${filterCat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
        <span class="count-badge">${procs.length}개 공정</span>
      </div>
      <div class="table-wrap">
        <table class="data-table" id="procTable">
          <thead>
            <tr>
              <th>ID</th><th>카테고리</th><th>공정명</th><th>단위</th>
              <th>단가(원)</th><th>노무비</th><th>재료비</th><th>비고</th><th>추가</th>
            </tr>
          </thead>
          <tbody id="procTbody"></tbody>
        </table>
      </div>
    `;

    const tbody = container.querySelector('#procTbody');
    const catSel = container.querySelector('#catFilter');

    function renderRows(filter) {
      const filtered = filter ? procs.filter(p => p.cat === filter) : procs;
      tbody.innerHTML = filtered.map(p => {
        const cat = cats.find(c => c.id === p.cat);
        return `<tr>
          <td class="mono">${p.id}</td>
          <td><span class="cat-badge" style="border-color:${cat ? cat.color : '#666'}">${cat ? cat.name : p.cat}</span></td>
          <td>${p.name}</td>
          <td class="center">${p.unit}</td>
          <td class="right mono">${p.price.toLocaleString()}</td>
          <td class="right mono gold">${p.labor.toLocaleString()}</td>
          <td class="right mono">${p.material.toLocaleString()}</td>
          <td class="small">${p.note}</td>
          <td class="center">
            <button class="add-btn" onclick="MODULES.addToEstimate('${p.id}', 1)">+ 추가</button>
          </td>
        </tr>`;
      }).join('');
    }

    renderRows(filterCat);
    catSel.addEventListener('change', e => {
      container._filterCat = e.target.value;
      renderRows(e.target.value);
    });
  }

  /* ─────────── TAB 2: 카테고리 ─────────── */
  function renderCategory(container) {
    const cats = CALC.getAllCategories();
    const procs = CALC.getAllProcesses();
    container.innerHTML = `
      <div class="cat-grid">
        ${cats.map(c => {
          const items = procs.filter(p => p.cat === c.id);
          const avgPrice = items.length ? Math.round(items.reduce((s, p) => s + p.price, 0) / items.length) : 0;
          return `<div class="cat-card" onclick="this.classList.toggle('open')">
            <div class="cat-card-head" style="border-left: 4px solid ${c.color}">
              <span class="cat-icon">●</span>
              <span class="cat-card-name">${c.name}</span>
              <span class="cat-card-cnt">${items.length}개</span>
            </div>
            <div class="cat-card-body">
              <div class="cat-avg">평균 단가: ${CALC.formatKRW(avgPrice)}</div>
              <ul class="cat-proc-list">
                ${items.slice(0, 8).map(p =>
                  `<li><span>${p.name}</span><span class="mono">${p.price.toLocaleString()}원/${p.unit}</span></li>`
                ).join('')}
                ${items.length > 8 ? `<li class="more">+${items.length - 8}개 더...</li>` : ''}
              </ul>
              <button class="qbtn small" onclick="event.stopPropagation(); MODULES.addCategoryPackage('${c.id}')">
                전체 목록 보기
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  /* ─────────── TAB 3: 온톨로지 ─────────── */
  function renderOntology(container) {
    const rules = CALC.getAllRules();
    const procs = CALC.getAllProcesses();

    container.innerHTML = `
      <div class="onto-layout">
        <div class="onto-sidebar">
          <h3 class="section-title">연결 규칙 목록 <span class="count-badge">${rules.length}건</span></h3>
          <div class="onto-filter">
            <label class="onto-filter-label">
              <input type="checkbox" id="filterRequired" checked> 필수
            </label>
            <label class="onto-filter-label">
              <input type="checkbox" id="filterRecommends" checked> 권장
            </label>
          </div>
          <div id="ruleList" class="rule-list">
            ${rules.map(r => `
              <div class="rule-item ${r.relation.toLowerCase()}" data-trigger="${r.trigger}">
                <div class="rule-trigger">${r.triggerName}</div>
                <div class="rule-arrow">${r.relation === 'REQUIRES' ? '→ 필수' : '→ 권장'}</div>
                <div class="rule-targets">${r.requiresNames.join(', ')}</div>
                <div class="rule-desc">${r.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="onto-main">
          <div class="onto-toolbar">
            <button class="gold-btn" id="btnBuildGraph">그래프 생성</button>
            <button class="qbtn" id="btnResetGraph">초기화</button>
            <span class="hint">더블클릭: 줌 리셋 | 드래그: 노드이동 | 휠: 줌</span>
          </div>
          <canvas id="ontoCanvas" class="onto-canvas"></canvas>
        </div>
      </div>
    `;

    GRAPH.init('ontoCanvas');

    container.querySelector('#btnBuildGraph').onclick = () => {
      const showReq  = container.querySelector('#filterRequired').checked;
      const showRec  = container.querySelector('#filterRecommends').checked;
      const filtered = rules.filter(r =>
        (r.relation === 'REQUIRES'   && showReq) ||
        (r.relation === 'RECOMMENDS' && showRec)
      );
      GRAPH.buildGraph(procs, filtered);
    };

    container.querySelector('#btnResetGraph').onclick = () => GRAPH.reset();

    /* 규칙 클릭 → 해당 노드 하이라이트는 그래프 내부에서 처리 */
    container.querySelector('#filterRequired').addEventListener('change', () =>
      container.querySelector('#btnBuildGraph').click()
    );
    container.querySelector('#filterRecommends').addEventListener('change', () =>
      container.querySelector('#btnBuildGraph').click()
    );

    /* 최초 자동 빌드 */
    GRAPH.buildGraph(procs, rules);
  }

  /* ─────────── TAB 4: 면적계산 ─────────── */
  function renderAreaCalc(container) {
    const cats = CALC.getAllCategories();
    const procs = CALC.getAllProcesses().filter(p => ['㎡', 'm'].includes(p.unit));
    container.innerHTML = `
      <div class="area-layout">
        <div class="area-input-section">
          <h3 class="section-title">면적 입력</h3>
          <div class="area-inputs">
            <label>거실/주방 (㎡) <input type="number" id="aLiving" value="0" min="0" class="num-input"></label>
            <label>침실 (㎡) <input type="number" id="aBed" value="0" min="0" class="num-input"></label>
            <label>욕실 (㎡) <input type="number" id="aBath" value="0" min="0" class="num-input"></label>
            <label>현관 (㎡) <input type="number" id="aEntry" value="0" min="0" class="num-input"></label>
            <label>베란다 (㎡) <input type="number" id="aBalc" value="0" min="0" class="num-input"></label>
            <label>벽면적 (㎡) <input type="number" id="aWall" value="0" min="0" class="num-input"></label>
            <label>천장면적 (㎡) <input type="number" id="aCeil" value="0" min="0" class="num-input"></label>
          </div>
          <div class="area-total">
            전체면적: <span id="totalArea">0</span> ㎡
          </div>
          <button class="gold-btn" onclick="MODULES.calcAreaEstimate()">견적 계산</button>
        </div>
        <div class="area-result-section">
          <h3 class="section-title">면적 기반 예상 견적</h3>
          <div id="areaResult" class="area-result">면적을 입력하고 계산 버튼을 클릭하세요.</div>
        </div>
      </div>
    `;

    const inputs = ['aLiving', 'aBed', 'aBath', 'aEntry', 'aBalc', 'aWall', 'aCeil'];
    inputs.forEach(id => {
      container.querySelector('#' + id).addEventListener('input', () => {
        let total = inputs.reduce((s, i) => s + (parseFloat(container.querySelector('#' + i).value) || 0), 0);
        container.querySelector('#totalArea').textContent = total.toFixed(1);
      });
    });
  }

  function calcAreaEstimate() {
    const get = id => parseFloat(document.getElementById(id)?.value) || 0;
    const living = get('aLiving'), bed = get('aBed'), bath = get('aBath');
    const entry = get('aEntry'), balc = get('aBalc');
    const wall = get('aWall'), ceil = get('aCeil');
    const total = living + bed + bath + entry + balc;

    const items = [];
    if (living + bed > 0) {
      items.push({ label: '강마루 (거실+침실)', area: living + bed, proc: CALC.getProcess('P120') });
      items.push({ label: '걸레받이', area: Math.sqrt((living + bed)) * 4, proc: CALC.getProcess('P063'), unit: 'm' });
    }
    if (bath > 0) {
      items.push({ label: '욕실 바닥타일', area: bath, proc: CALC.getProcess('P045') });
      items.push({ label: '방수 (욕실)', area: bath, proc: CALC.getProcess('P017') });
      items.push({ label: '줄눈', area: bath, proc: CALC.getProcess('P047') });
    }
    if (wall > 0) {
      items.push({ label: '벽 도배 (실크)', area: wall, proc: CALC.getProcess('P112') });
    }
    if (ceil > 0) {
      items.push({ label: '천장 도장', area: ceil, proc: CALC.getProcess('P100') });
    }

    let sum = 0;
    const rows = items.filter(i => i.proc && (i.area || 0) > 0).map(i => {
      const amt = Math.round(i.proc.price * i.area);
      sum += amt;
      return `<tr>
        <td>${i.label}</td>
        <td class="center">${i.area.toFixed(1)} ${i.unit || '㎡'}</td>
        <td class="right mono">${i.proc.price.toLocaleString()}원</td>
        <td class="right mono gold">${amt.toLocaleString()}원</td>
      </tr>`;
    });

    const vat = Math.round(sum * 0.1);
    document.getElementById('areaResult').innerHTML = `
      <table class="data-table">
        <thead><tr><th>항목</th><th>수량</th><th>단가</th><th>금액</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot>
          <tr class="subtotal-row"><td colspan="3">소계</td><td class="right mono">${sum.toLocaleString()}원</td></tr>
          <tr><td colspan="3">VAT (10%)</td><td class="right mono">${vat.toLocaleString()}원</td></tr>
          <tr class="total-row"><td colspan="3"><strong>합계</strong></td><td class="right mono gold"><strong>${(sum + vat).toLocaleString()}원</strong></td></tr>
        </tfoot>
      </table>
      <div class="area-add-all">
        <button class="gold-btn" onclick="MODULES.addAreaItemsToEstimate()">견적서에 추가</button>
      </div>
    `;
    window._lastAreaItems = items.filter(i => i.proc && i.area > 0).map(i => ({
      processId: i.proc.id, qty: i.area
    }));
  }

  function addAreaItemsToEstimate() {
    if (!window._lastAreaItems) return;
    window._lastAreaItems.forEach(item => addToEstimate(item.processId, item.qty));
    switchTab(10);
  }

  /* ─────────── TAB 5: 패키지 ─────────── */
  function renderPackage(container) {
    const groups = CALC.getAllGroups();
    container.innerHTML = `
      <div class="pkg-grid">
        ${groups.map(g => {
          const procs = g.processes.map(id => CALC.getProcess(id)).filter(Boolean);
          const total = procs.reduce((s, p) => s + p.price, 0);
          const alreadyApplied = g.processes.every(id => estimateItems.find(i => i.processId === id));
          return `<div class="pkg-card${alreadyApplied ? ' pkg-applied' : ''}">
            <div class="pkg-title">${g.name}${alreadyApplied ? ' <span class="pkg-applied-badge">적용됨</span>' : ''}</div>
            <div class="pkg-desc">${g.description}</div>
            <ul class="pkg-list">
              ${procs.map(p => {
                const inEst = estimateItems.find(i => i.processId === p.id);
                return `<li class="${inEst ? 'pkg-item-done' : ''}">
                  <span>${p.name}</span>
                  <span class="mono">${p.price.toLocaleString()}원/${p.unit}</span>
                </li>`;
              }).join('')}
            </ul>
            <div class="pkg-total">기본 합계: ${CALC.formatKRW(total)}</div>
            <div class="pkg-actions">
              <button class="gold-btn" onclick="MODULES.applyPackage('${g.id}')">패키지 적용</button>
              <button class="qbtn small" onclick="MODULES.previewPackage('${g.id}')">상세 보기</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  function applyPackage(groupId) {
    const group = CALC.getGroup(groupId);
    if (!group) return;
    group.processes.forEach(id => {
      if (!estimateItems.find(i => i.processId === id)) {
        estimateItems.push({ processId: id, qty: 1 });
      }
    });
    UI.showToast(`"${group.name}" 패키지 적용 완료!`);
    switchTab(10);
  }

  /* ─────────── TAB 6: 공정검색 ─────────── */
  function renderSearch(container) {
    container.innerHTML = `
      <div class="search-layout">
        <div class="search-bar">
          <input type="text" id="searchInput" placeholder="공정명, 단위, 비고 검색..." class="search-input">
          <button class="gold-btn" onclick="MODULES.doSearch()">검색</button>
        </div>
        <div id="searchResult" class="search-result">검색어를 입력하세요.</div>
      </div>
    `;
    const inp = container.querySelector('#searchInput');
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    inp.focus();
  }

  function doSearch() {
    const kw = document.getElementById('searchInput')?.value || '';
    const results = CALC.searchProcesses(kw);
    const el = document.getElementById('searchResult');
    if (!el) return;
    if (!results.length) { el.innerHTML = '<p class="hint">검색 결과가 없습니다.</p>'; return; }
    el.innerHTML = `<div class="count-badge">${results.length}개 발견</div>
      <table class="data-table">
        <thead><tr><th>ID</th><th>공정명</th><th>단위</th><th>단가</th><th>비고</th><th>추가</th></tr></thead>
        <tbody>${results.map(p => `<tr>
          <td class="mono">${p.id}</td>
          <td>${p.name}</td>
          <td class="center">${p.unit}</td>
          <td class="right mono">${p.price.toLocaleString()}</td>
          <td class="small">${p.note}</td>
          <td><button class="add-btn" onclick="MODULES.addToEstimate('${p.id}',1)">+ 추가</button></td>
        </tr>`).join('')}</tbody>
      </table>`;
  }

  /* ─────────── TAB 7: 분석 ─────────── */
  function renderAnalysis(container) {
    const result = CALC.calcEstimate(estimateItems);
    const catBreak = CALC.calcByCategory(result.details || []);
    const cats = CALC.getAllCategories();

    const catData = cats.map(c => ({ ...c, amount: catBreak[c.id]?.total || 0 }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const maxAmt = catData.length ? catData[0].amount : 1;

    container.innerHTML = `
      <div class="analysis-layout">
        <div class="analysis-summary">
          <div class="anal-card"><div class="anal-title">노무비 합계</div><div class="anal-val gold">${CALC.formatKRW(result.labor)}</div></div>
          <div class="anal-card"><div class="anal-title">재료비 합계</div><div class="anal-val">${CALC.formatKRW(result.material)}</div></div>
          <div class="anal-card"><div class="anal-title">순공사비</div><div class="anal-val">${CALC.formatKRW(result.subtotal)}</div></div>
          <div class="anal-card"><div class="anal-title">VAT</div><div class="anal-val">${CALC.formatKRW(result.vat)}</div></div>
          <div class="anal-card highlight"><div class="anal-title">최종 합계</div><div class="anal-val gold large">${CALC.formatKRW(result.total)}</div></div>
        </div>
        <div class="analysis-chart">
          <h3 class="section-title">카테고리별 비중</h3>
          ${catData.length === 0 ? '<p class="hint">견적 항목을 추가하면 분석이 표시됩니다.</p>' :
            catData.map(c => `
              <div class="bar-row">
                <span class="bar-label">${c.name}</span>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${Math.round(c.amount/maxAmt*100)}%; background:${c.color}"></div>
                </div>
                <span class="bar-val mono">${CALC.formatKRW(c.amount)}</span>
                <span class="bar-pct">${result.subtotal ? Math.round(c.amount/result.subtotal*100) : 0}%</span>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }

  /* ─────────── TAB 8: 프로젝트 ─────────── */
  function renderProject(container) {
    container.innerHTML = `
      <div class="project-form">
        <h3 class="section-title">프로젝트 정보</h3>
        <div class="form-grid">
          <label>프로젝트명 <input type="text" id="pName" value="${projectInfo.name}" class="text-input" placeholder="예: 강남 아파트 리모델링"></label>
          <label>발주처(고객) <input type="text" id="pClient" value="${projectInfo.client}" class="text-input" placeholder="고객사명"></label>
          <label>현장주소 <input type="text" id="pSite" value="${projectInfo.site}" class="text-input" placeholder="서울시 강남구..."></label>
          <label>견적일자 <input type="date" id="pDate" value="${projectInfo.date}" class="text-input"></label>
          <label>담당자 <input type="text" id="pManager" value="${projectInfo.manager}" class="text-input"></label>
        </div>
        <button class="gold-btn" onclick="MODULES.saveProject()">저장</button>
      </div>
      <div class="project-save-section">
        <h3 class="section-title">견적 저장/불러오기</h3>
        <div class="save-btns">
          <button class="qbtn" onclick="MODULES.saveEstimateToLocal()">💾 로컬 저장</button>
          <button class="qbtn" onclick="MODULES.loadEstimateFromLocal()">📂 불러오기</button>
          <button class="qbtn" onclick="MODULES.exportJSON()">📤 JSON 내보내기</button>
          <button class="qbtn danger" onclick="MODULES.clearEstimate()">🗑️ 견적 초기화</button>
        </div>
      </div>
    `;
  }

  function saveProject() {
    projectInfo = {
      name: document.getElementById('pName')?.value || '',
      client: document.getElementById('pClient')?.value || '',
      site: document.getElementById('pSite')?.value || '',
      date: document.getElementById('pDate')?.value || '',
      manager: document.getElementById('pManager')?.value || 'ECOREAN'
    };
    UI.showToast('프로젝트 정보가 저장되었습니다.');
  }

  function saveEstimateToLocal() {
    const data = { projectInfo, estimateItems, savedAt: new Date().toISOString() };
    localStorage.setItem('ecorean_estimate', JSON.stringify(data));
    UI.showToast('로컬 스토리지에 저장되었습니다.');
  }

  function loadEstimateFromLocal() {
    const raw = localStorage.getItem('ecorean_estimate');
    if (!raw) { UI.showToast('저장된 데이터가 없습니다.'); return; }
    const data = JSON.parse(raw);
    projectInfo = data.projectInfo || projectInfo;
    estimateItems = data.estimateItems || [];
    UI.showToast('불러오기 완료!');
    switchTab(10);
  }

  function exportJSON() {
    const result = CALC.calcEstimate(estimateItems);
    const data = { projectInfo, estimateItems, result, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ECOREAN_견적_${projectInfo.name || 'export'}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '').replace(/ /g, '')}.json`;
    a.click();
  }

  function clearEstimate() {
    if (!confirm('견적 항목을 모두 초기화하겠습니까?')) return;
    estimateItems = [];
    UI.showToast('견적이 초기화되었습니다.');
    switchTab(10);
  }

  /* ─────────── TAB 9: 설정 ─────────── */
  function renderSettings(container) {
    container.innerHTML = `
      <div class="settings-layout">
        <h3 class="section-title">시스템 설정</h3>
        <div class="setting-item">
          <label>VAT 적용</label>
          <label class="toggle"><input type="checkbox" id="vatToggle" checked> <span class="toggle-slider"></span></label>
        </div>
        <div class="setting-item">
          <label>간접비율 (%)</label>
          <input type="number" id="overheadRate" value="5" min="0" max="30" class="num-input small">
        </div>
        <div class="setting-item">
          <label>이윤율 (%)</label>
          <input type="number" id="profitRate" value="10" min="0" max="50" class="num-input small">
        </div>
        <div class="setting-item">
          <label>통화 단위</label>
          <select class="sel"><option>원 (KRW)</option></select>
        </div>
        <div class="setting-item">
          <label>DB 버전</label>
          <span class="version-badge">v2.0 (234 공정)</span>
        </div>
        <div class="setting-item">
          <label>시스템 정보</label>
          <span class="hint">ECOREAN 전문견적 OS v2.0</span>
        </div>
      </div>
    `;
  }

  /* ─────────── TAB 10: 견적서 (INDEX=10) ─────────── */
  function renderEstimate(container) {
    const result = CALC.calcEstimate(estimateItems);
    const missing = CALC.getMissingRequired(estimateItems);
    const cats = CALC.getAllCategories();

    container.innerHTML = `
      <div class="est-layout">
        <div class="est-header">
          <div class="est-project-info">
            <span>${projectInfo.name || '프로젝트명 미입력'}</span>
            <span class="sep">|</span>
            <span>${projectInfo.client || '발주처 미입력'}</span>
            <span class="sep">|</span>
            <span>${projectInfo.date}</span>
          </div>
          <div class="est-toolbar">
            <button class="qbtn" onclick="MODULES.switchTab(1)">+ 공정 추가</button>
            <button class="qbtn" onclick="MODULES.switchTab(6)">🔍 검색 추가</button>
            <button class="qbtn" onclick="MODULES.applyMissingRequired()">⚠️ 누락 공정 추가</button>
          </div>
        </div>

        ${missing.length > 0 ? `
          <div class="missing-alert">
            <strong>⚠️ 온톨로지 경고 — 누락된 필수 공정 ${missing.length}건</strong>
            <ul>${missing.map(m => `<li>${m.triggerName} → <strong>${m.missingName}</strong> 필요</li>`).join('')}</ul>
          </div>
        ` : ''}

        <div class="table-wrap">
          <table class="data-table est-table">
            <thead>
              <tr>
                <th>#</th><th>공정명</th><th>단위</th><th>수량</th>
                <th>단가(원)</th><th>노무비</th><th>재료비</th><th>금액</th><th>관리</th>
              </tr>
            </thead>
            <tbody id="estTbody">
              ${(result.details || []).map((d, i) => `<tr>
                <td class="center mono">${i + 1}</td>
                <td>${d.processName || d.processId}</td>
                <td class="center">${d.unit || '-'}</td>
                <td class="center">
                  <input type="number" class="qty-input" value="${d.qty}" min="0" step="0.1"
                    onchange="MODULES.updateQty(${i}, this.value)">
                </td>
                <td class="right mono">${(d.unitPrice || 0).toLocaleString()}</td>
                <td class="right mono gold">${(d.labor || 0).toLocaleString()}</td>
                <td class="right mono">${(d.material || 0).toLocaleString()}</td>
                <td class="right mono gold-bright">${(d.total || 0).toLocaleString()}</td>
                <td class="center">
                  <button class="del-btn" onclick="MODULES.removeItem(${i})">✕</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="9" class="center hint">항목이 없습니다. 공정을 추가하세요.</td></tr>'}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="7" class="right">소계 (순공사비)</td>
                <td class="right mono gold-bright">${result.subtotal.toLocaleString()}원</td>
                <td></td>
              </tr>
              <tr>
                <td colspan="4" class="right small">노무비</td>
                <td colspan="3" class="right small">재료비</td>
                <td colspan="2"></td>
              </tr>
              <tr class="labor-material-row">
                <td colspan="4" class="right mono gold">${result.labor.toLocaleString()}원</td>
                <td colspan="3" class="right mono">${result.material.toLocaleString()}원</td>
                <td colspan="2"></td>
              </tr>
              <tr class="vat-row">
                <td colspan="7" class="right">부가세 (VAT 10%)</td>
                <td class="right mono">${result.vat.toLocaleString()}원</td>
                <td></td>
              </tr>
              <tr class="total-row">
                <td colspan="7" class="right"><strong>최종 합계</strong></td>
                <td class="right mono gold-bright large"><strong>${result.total.toLocaleString()}원</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="est-footer">
          <button class="gold-btn large" onclick="MODULES.switchTab(11)">🖨️ 출력 / 저장</button>
          <button class="qbtn" onclick="MODULES.switchTab(7)">📊 분석 보기</button>
        </div>
      </div>
    `;
  }

  /* ─────────── TAB 11: 출력/저장 ─────────── */
  function renderPrint(container) {
    const result = CALC.calcEstimate(estimateItems);
    container.innerHTML = `
      <div class="print-layout">
        <div class="print-actions">
          <button class="gold-btn large" onclick="window.print()">🖨️ 인쇄</button>
          <button class="qbtn" onclick="MODULES.exportJSON()">📤 JSON 내보내기</button>
          <button class="qbtn" onclick="MODULES.saveEstimateToLocal()">💾 로컬 저장</button>
        </div>
        <div class="print-preview" id="printArea">
          <div class="print-header">
            <div class="print-logo">ECOREAN</div>
            <div class="print-title">전문 공사 견적서</div>
          </div>
          <div class="print-info-grid">
            <div class="print-info-block">
              <div class="print-info-row"><span>프로젝트</span><strong>${projectInfo.name || '-'}</strong></div>
              <div class="print-info-row"><span>발주처</span><strong>${projectInfo.client || '-'}</strong></div>
              <div class="print-info-row"><span>현장</span><strong>${projectInfo.site || '-'}</strong></div>
            </div>
            <div class="print-info-block">
              <div class="print-info-row"><span>견적일</span><strong>${projectInfo.date}</strong></div>
              <div class="print-info-row"><span>담당자</span><strong>${projectInfo.manager}</strong></div>
              <div class="print-info-row"><span>유효기간</span><strong>견적일로부터 30일</strong></div>
            </div>
          </div>
          <table class="print-table">
            <thead>
              <tr><th>No.</th><th>공정명</th><th>단위</th><th>수량</th><th>단가</th><th>금액</th></tr>
            </thead>
            <tbody>
              ${(result.details || []).map((d, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${d.processName || '-'}</td>
                  <td>${d.unit || '-'}</td>
                  <td>${d.qty}</td>
                  <td class="right">${(d.unitPrice || 0).toLocaleString()}</td>
                  <td class="right"><strong>${(d.total || 0).toLocaleString()}</strong></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="subtotal-row"><td colspan="5">순공사비</td><td class="right">${result.subtotal.toLocaleString()}</td></tr>
              <tr><td colspan="5">부가세 (10%)</td><td class="right">${result.vat.toLocaleString()}</td></tr>
              <tr class="print-total"><td colspan="5"><strong>합계</strong></td><td class="right"><strong>${result.total.toLocaleString()} 원</strong></td></tr>
            </tfoot>
          </table>
          <div class="print-footer">
            <p>본 견적은 현장 조건에 따라 변동될 수 있습니다.</p>
            <p>ECOREAN 전문견적 OS | ${new Date().toLocaleDateString('ko-KR')}</p>
          </div>
        </div>
      </div>
    `;
  }

  /* ─────────── 공통 기능 ─────────── */
  function addToEstimate(processId, qty = 1) {
    const existing = estimateItems.find(i => i.processId === processId);
    if (existing) {
      existing.qty += qty;
      UI.showToast('수량이 추가되었습니다.');
    } else {
      estimateItems.push({ processId, qty });
      UI.showToast('견적에 추가되었습니다.');
    }

    const links = CALC.getOntologyLinks(processId);
    const requires = links.filter(r => r.relation === 'REQUIRES');
    if (requires.length > 0) {
      const newItems = [];
      requires.forEach(r => {
        r.requires.forEach(reqId => {
          if (!estimateItems.find(i => i.processId === reqId)) {
            newItems.push(reqId);
          }
        });
      });
      if (newItems.length > 0) {
        const proc = CALC.getProcess(processId);
        const names = newItems.map(id => CALC.getProcess(id)?.name).filter(Boolean);
        setTimeout(() => {
          UI.showToast(`온톨로지: "${proc?.name}" 연결 공정 — ${names.join(', ')} 추가를 확인하세요.`, 'warning', 4000);
        }, 300);
      }
    }
  }

  function updateQty(index, value) {
    const qty = parseFloat(value) || 0;
    if (estimateItems[index]) {
      estimateItems[index].qty = qty;
      renderEstimate(document.getElementById('tabContent'));
    }
  }

  function removeItem(index) {
    estimateItems.splice(index, 1);
    renderEstimate(document.getElementById('tabContent'));
  }

  function applyMissingRequired() {
    const missing = CALC.getMissingRequired(estimateItems);
    if (missing.length === 0) { UI.showToast('누락된 필수 공정이 없습니다.'); return; }
    missing.forEach(m => {
      if (!estimateItems.find(i => i.processId === m.missingId)) {
        estimateItems.push({ processId: m.missingId, qty: 1 });
      }
    });
    UI.showToast(`${missing.length}개 필수 공정이 추가되었습니다.`);
    renderEstimate(document.getElementById('tabContent'));
  }

  function addCategoryPackage(catId) {
    /* 공정DB 탭으로 전환하면서 해당 카테고리 필터 적용 */
    const container = document.getElementById('tabContent');
    container._filterCat = catId;
    UI.activateTab(1);
  }

  function previewPackage(groupId) {
    const group = CALC.getGroup(groupId);
    if (!group) return;
    const procs = group.processes.map(id => CALC.getProcess(id)).filter(Boolean);
    const total = procs.reduce((s, p) => s + p.price, 0);
    alert(`[${group.name}]\n${group.description}\n\n` +
      procs.map(p => `• ${p.name}  ${p.price.toLocaleString()}원/${p.unit}`).join('\n') +
      `\n\n기본 합계: ${CALC.formatKRW(total)}`
    );
  }

  return {
    getTabConfig, getCurrentTab, switchTab,
    renderDashboard, renderProcessDB, renderCategory, renderOntology,
    renderAreaCalc, renderPackage, renderSearch, renderAnalysis,
    renderProject, renderSettings, renderEstimate, renderPrint,
    addToEstimate, updateQty, removeItem, applyMissingRequired,
    applyPackage, calcAreaEstimate, addAreaItemsToEstimate,
    saveProject, saveEstimateToLocal, loadEstimateFromLocal, exportJSON, clearEstimate,
    addCategoryPackage, previewPackage, doSearch
  };
})();
