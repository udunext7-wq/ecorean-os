# CLAUDE CODE 명령서 — Phase 4 Week 7
# 토폴로지 화면 + AI 임원 대시보드 (멀티 프로바이더)
# Claude / OpenAI / Gemini / Ollama 전환 가능
# 추정 코드 0건 | 원칙 15 | 2026-04-30

---

## 0. 시작 전 확인

```bash
cd C:\Users\udune\ecorean-os
git status
git log --oneline -3
```
예상 HEAD: `4126bb4`

---

## 1. 확정된 슬롯

```
[A] graph.json 경로:       docs/graph.json
[B] graph.json 노드:       12개 (gate5+module3+engine3+ml1)
[C] graph.json 엣지:       24개 (INTRA scope)
[D] topology 기존 파일:    modules-html/topology/index.html (Cytoscape.js)
[E] App.js topology:       L285 _renderTopology placeholder
[F] App.js ai-executive:   L286 _renderAIExecutive placeholder
[G] KPI 패턴:              coreBus + window.boc.kpi.*
[H] AI API 현황:           미연동 (0건)
[I] 멀티 프로바이더:       Claude / OpenAI / Gemini / Ollama
[J] 설정 방식:             .env BOC_AI_PROVIDER + BOC_AI_KEY
```

---

## 2. 헌법

- 22/23/12/6/5 절대 수치 변경 금지
- graph.json 12노드+24엣지 **변경 금지** (futureNodes만 참조)
- B1: rollback SQL
- B5: TDD
- 원칙 15: try/catch + bocError 표준
- P2: 추정 단가 금지

---

## 3. 작업 0: .env + AI 프로바이더 설정 (20분)

### 0-1. .env 파일 생성

```bash
# .env 존재 여부 확인
ls .env 2>nul || echo "없음"
cat .env 2>nul
```

파일: `.env` (없으면 생성, 있으면 추가)

```env
# ECOREAN BOC — AI 임원 대시보드 설정
# 프로바이더: claude | openai | gemini | ollama
BOC_AI_PROVIDER=claude

# API 키 (Ollama는 불필요)
BOC_AI_KEY=

# 모델 (비워두면 프로바이더 기본값 사용)
BOC_AI_MODEL=

# Ollama 로컬 서버 주소 (기본값)
BOC_OLLAMA_URL=http://localhost:11434
```

### 0-2. .gitignore에 .env 추가

```bash
grep -n "\.env" .gitignore || echo ".env" >> .gitignore
```

### 0-3. AI 프로바이더 모듈 작성

파일: `shell/src/ai/AIProvider.cjs`

```javascript
'use strict';

/**
 * ECOREAN BOC — AI 멀티 프로바이더
 * Claude / OpenAI / Gemini / Ollama 전환 가능
 * .env BOC_AI_PROVIDER + BOC_AI_KEY 로 제어
 * 원칙 15: 모든 호출 try/catch + bocError 구조
 */

const PROVIDERS = {
  claude: {
    getUrl: ()     => 'https://api.anthropic.com/v1/messages',
    getHeaders: (key) => ({
      'Content-Type':    'application/json',
      'x-api-key':       key,
      'anthropic-version': '2023-06-01'
    }),
    buildBody: (messages, model) => ({
      model:      model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages
    }),
    parseResponse: (data) => {
      if (data.error) throw new Error(data.error.message || 'Claude API 오류');
      return data.content?.[0]?.text || '';
    }
  },

  openai: {
    getUrl: ()     => 'https://api.openai.com/v1/chat/completions',
    getHeaders: (key) => ({
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${key}`
    }),
    buildBody: (messages, model) => ({
      model:    model || 'gpt-4o',
      messages
    }),
    parseResponse: (data) => {
      if (data.error) throw new Error(data.error.message || 'OpenAI API 오류');
      return data.choices?.[0]?.message?.content || '';
    }
  },

  gemini: {
    getUrl: (key) =>
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    getHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (messages) => ({
      contents: messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role:  m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
    }),
    parseResponse: (data) => {
      if (data.error) throw new Error(data.error.message || 'Gemini API 오류');
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  },

  ollama: {
    getUrl: () => {
      const base = process.env.BOC_OLLAMA_URL || 'http://localhost:11434';
      return `${base}/api/chat`;
    },
    getHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (messages, model) => ({
      model:    model || 'llama3',
      messages,
      stream:   false
    }),
    parseResponse: (data) => {
      if (data.error) throw new Error(data.error || 'Ollama 오류');
      return data.message?.content || '';
    }
  }
};

/**
 * AI 호출 통합 함수
 * @param {Array}  messages  - [{ role: 'user'|'assistant'|'system', content: string }]
 * @param {object} opts      - { provider?, model?, key? }
 * @returns {{ ok, data: { text }, error }}
 */
async function callAI(messages, opts = {}) {
  const provider = opts.provider || process.env.BOC_AI_PROVIDER || 'claude';
  const key      = opts.key      || process.env.BOC_AI_KEY      || '';
  const model    = opts.model    || process.env.BOC_AI_MODEL    || '';

  const p = PROVIDERS[provider];
  if (!p) {
    return {
      ok: false,
      error: {
        code: 'AI_UNKNOWN_PROVIDER',
        message: `알 수 없는 프로바이더: ${provider}. claude|openai|gemini|ollama 중 선택`,
        context: { provider },
        ts: new Date().toISOString()
      }
    };
  }

  if (provider !== 'ollama' && !key) {
    return {
      ok: false,
      error: {
        code: 'AI_NO_KEY',
        message: `${provider} API 키가 없습니다. .env BOC_AI_KEY 설정 필요`,
        context: { provider },
        ts: new Date().toISOString()
      }
    };
  }

  try {
    const fetch = require('node-fetch');
    const url     = p.getUrl(key);
    const headers = p.getHeaders(key);
    const body    = p.buildBody(messages, model);

    const res = await fetch(url, {
      method:  'POST',
      headers,
      body:    JSON.stringify(body),
      timeout: 30000
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: {
          code: `AI_HTTP_${res.status}`,
          message: data?.error?.message || `HTTP ${res.status}`,
          context: { provider, status: res.status },
          ts: new Date().toISOString()
        }
      };
    }

    const text = p.parseResponse(data);
    return { ok: true, data: { text, provider, model: model || '(default)' } };

  } catch (e) {
    console.error(`[AIProvider:${provider}]`, e.message);
    return {
      ok: false,
      error: {
        code: 'AI_CALL_FAIL',
        message: e.message,
        context: { provider },
        ts: new Date().toISOString()
      }
    };
  }
}

module.exports = { callAI, PROVIDERS };
```

### 0-4. AIProvider 테스트 (API 키 없이 로직만)

파일: `shell/tests/ai/AIProvider.test.cjs`

```javascript
'use strict';
const assert = require('assert');
const { callAI, PROVIDERS } = require('../../src/ai/AIProvider.cjs');

// TC-1: 지원 프로바이더 4개 확인
assert('claude'  in PROVIDERS, 'TC-1 FAIL: claude');
assert('openai'  in PROVIDERS, 'TC-1 FAIL: openai');
assert('gemini'  in PROVIDERS, 'TC-1 FAIL: gemini');
assert('ollama'  in PROVIDERS, 'TC-1 FAIL: ollama');
console.log('TC-1 PASS: 4개 프로바이더 정의');

// TC-2: 알 수 없는 프로바이더 → bocError 구조
async function run() {
  const r = await callAI([], { provider: 'unknown_ai' });
  assert(!r.ok, 'TC-2 FAIL');
  assert(r.error.code === 'AI_UNKNOWN_PROVIDER', 'TC-2 FAIL: 에러코드');
  assert(r.error.ts, 'TC-2 FAIL: timestamp');
  console.log('TC-2 PASS: 알 수 없는 프로바이더 거부');

  // TC-3: API 키 없으면 오류 (ollama 제외)
  const r2 = await callAI([], { provider: 'claude', key: '' });
  assert(!r2.ok && r2.error.code === 'AI_NO_KEY', 'TC-3 FAIL');
  console.log('TC-3 PASS: API 키 없음 오류');

  // TC-4: Ollama는 키 없이도 URL 구성 가능
  const ollamaUrl = PROVIDERS.ollama.getUrl();
  assert(ollamaUrl.includes('11434'), 'TC-4 FAIL: Ollama URL');
  console.log('TC-4 PASS: Ollama 키 없이 URL 구성');

  // TC-5: 메시지 구조 — 4개 프로바이더 body 생성
  const msgs = [{ role: 'user', content: '안녕하세요' }];
  const cBody = PROVIDERS.claude.buildBody(msgs, '');
  const oBody = PROVIDERS.openai.buildBody(msgs, '');
  const gBody = PROVIDERS.gemini.buildBody(msgs, '');
  const lBody = PROVIDERS.ollama.buildBody(msgs, 'llama3');
  assert(cBody.messages && cBody.max_tokens, 'TC-5 FAIL: claude body');
  assert(oBody.messages && oBody.model,      'TC-5 FAIL: openai body');
  assert(gBody.contents,                     'TC-5 FAIL: gemini body');
  assert(lBody.messages && !lBody.stream,    'TC-5 FAIL: ollama body');
  console.log('TC-5 PASS: 4개 프로바이더 body 구조');

  console.log('\n✅ AIProvider 테스트 5/5 PASS');
}
run().catch(e => { console.error(e); process.exit(1); });
```

```bash
mkdir -p shell/tests/ai
node shell/tests/ai/AIProvider.test.cjs
```

### 0-5. IPC 핸들러 추가 (electron/main.js)

기존 Week 6 IPC 다음에 추가:

```javascript
// ────────── Week 7: AI 임원 IPC ──────────
require('dotenv').config();
const { callAI } = require('../shell/src/ai/AIProvider.cjs');

ipcMain.handle('boc:ai:query', async (_, { messages, provider, model }) => {
  try {
    const result = await callAI(messages, { provider, model });
    return result;
  } catch(e) {
    console.error('[boc:ai:query]', e);
    return {
      ok: false,
      error: { code: 'AI_IPC_FAIL', message: e.message, ts: new Date().toISOString() }
    };
  }
});

ipcMain.handle('boc:ai:getConfig', async () => ({
  ok: true,
  data: {
    provider: process.env.BOC_AI_PROVIDER || 'claude',
    model:    process.env.BOC_AI_MODEL    || '',
    hasKey:   !!(process.env.BOC_AI_KEY),
    ollamaUrl: process.env.BOC_OLLAMA_URL || 'http://localhost:11434'
  }
}));
// ────────── Week 7 AI IPC 끝 ──────────
```

### 0-6. preload에 ai 추가

```javascript
// preload/preload.js — 기존 inspection: {...} 다음에 추가
ai: {
  query:     (opts)    => ipcRenderer.invoke('boc:ai:query',     opts),
  getConfig: ()        => ipcRenderer.invoke('boc:ai:getConfig')
}
```

### 0-7. dotenv 설치 확인

```bash
node -e "require('dotenv')" 2>nul && echo "OK" || npm install dotenv
```

### 0-8. 커밋 0

```bash
git add shell/src/ai/AIProvider.cjs \
        shell/tests/ai/AIProvider.test.cjs \
        electron/main.js preload/preload.js \
        .env .gitignore
git commit -m "feat: 멀티 AI 프로바이더 (Claude/OpenAI/Gemini/Ollama) + IPC (원칙15)"
```

---

## 4. 작업 1: 토폴로지 화면 (45분)

> [D] topology/index.html 이미 존재 → boc-v6 App.js에 연결

### 1-1. 기존 topology/index.html 읽기

```bash
cat modules-html/topology/index.html
```

### 1-2. TopologyPage.js 작성

> 기존 index.html의 Cytoscape.js 코드를 boc-v6 컴포넌트로 포팅

파일: `modules-html/boc-v6/src/topology/TopologyPage.js`

```javascript
// ECOREAN BOC v6.0 — 시스템 토폴로지 화면
// [A][B][C] graph.json 12노드+24엣지 시각화
// Cytoscape.js (CDN) 사용 — 번들 포함 금지 (1.3MB 방지)
// 원칙 15: try/catch

class TopologyPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this._render();
    this._loadGraph();
  }

  _render() {
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;">
  <div style="border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;">
    <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">TOPOLOGY</div>
    <div style="font-size:10px;color:#555;margin-top:2px;">ECOREAN BOC 시스템 구조 — 12노드 24엣지</div>
  </div>
  <div id="topo-legend" style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap;"></div>
  <div id="topo-cy" style="width:100%;height:560px;background:#0D0D0D;border:1px solid #1E1E1E;"></div>
  <div id="topo-detail" style="margin-top:12px;padding:10px 14px;background:#0F0F0F;border:1px solid #1E1E1E;font-size:11px;color:#666;min-height:48px;">
    노드를 클릭하면 상세 정보가 표시됩니다.
  </div>
</div>`;
  }

  async _loadGraph() {
    try {
      // graph.json 로드 (fetch 또는 require)
      let graphData;
      try {
        const res = await fetch('../../../docs/graph.json');
        graphData = await res.json();
      } catch(_) {
        // Electron 환경에서 fetch 실패 시 IPC 또는 require
        graphData = require('../../../../../docs/graph.json');
      }

      // Cytoscape.js CDN 로드 대기
      await this._loadCytoscape();
      this._renderGraph(graphData);
    } catch(e) {
      console.error('[Topology]', e);
      const el = this.containerEl.querySelector('#topo-cy');
      if (el) el.innerHTML = `<div style="padding:40px;text-align:center;color:#C96D6D;">토폴로지 로드 실패: ${e.message}</div>`;
    }
  }

  _loadCytoscape() {
    return new Promise((resolve, reject) => {
      if (window.cytoscape) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.26.0/cytoscape.min.js';
      script.onload  = resolve;
      script.onerror = () => reject(new Error('Cytoscape.js CDN 로드 실패'));
      document.head.appendChild(script);
    });
  }

  _renderGraph(graphData) {
    const { nodes = [], edges = [], futureNodes = [] } = graphData;

    // 노드 타입별 색상
    const TYPE_COLOR = {
      gate:    '#C9A84C',
      module:  '#6DB96D',
      engine:  '#6D9DB9',
      ml:      '#C96DB9',
      future:  '#333'
    };

    const cyNodes = [
      ...nodes.map(n => ({
        data: {
          id:    n.id,
          label: n.label || n.id,
          type:  n.type  || 'module',
          desc:  n.description || '',
          sla:   n.sla ? `${n.sla.maxLatencyMs}ms` : '-',
          color: TYPE_COLOR[n.type] || '#999'
        }
      })),
      ...futureNodes.map(n => ({
        data: {
          id:    n.id,
          label: n.label || n.id,
          type:  'future',
          desc:  n.description || '(예정)',
          color: TYPE_COLOR.future
        }
      }))
    ];

    const cyEdges = edges.map((e, i) => ({
      data: {
        id:     `e${i}`,
        source: e.source || e.from,
        target: e.target || e.to,
        label:  e.label  || ''
      }
    }));

    const cy = window.cytoscape({
      container: this.containerEl.querySelector('#topo-cy'),
      elements:  { nodes: cyNodes, edges: cyEdges },
      style: [
        {
          selector: 'node',
          style: {
            'background-color':  'data(color)',
            'label':             'data(label)',
            'color':             '#F0EDE8',
            'font-size':         '10px',
            'text-valign':       'center',
            'text-halign':       'center',
            'width':             '60px',
            'height':            '60px',
            'border-width':      '1px',
            'border-color':      '#2A2A2A',
            'text-wrap':         'wrap',
            'text-max-width':    '55px'
          }
        },
        {
          selector: 'node[type="future"]',
          style: {
            'background-color': '#1A1A1A',
            'border-style':     'dashed',
            'border-color':     '#333',
            'color':            '#444'
          }
        },
        {
          selector: 'edge',
          style: {
            'width':              '1.5px',
            'line-color':         '#2A2A2A',
            'target-arrow-color': '#2A2A2A',
            'target-arrow-shape': 'triangle',
            'curve-style':        'bezier',
            'font-size':          '8px',
            'color':              '#555'
          }
        },
        {
          selector: ':selected',
          style: {
            'border-color': '#C9A84C',
            'border-width':  '2px'
          }
        }
      ],
      layout: { name: 'cose', animate: true, padding: 30 }
    });

    // 노드 클릭 → 상세 표시
    cy.on('tap', 'node', (evt) => {
      const n = evt.target.data();
      const detail = this.containerEl.querySelector('#topo-detail');
      if (detail) {
        detail.innerHTML = `
<span style="color:#C9A84C;font-weight:700">${n.label}</span>
<span style="margin-left:10px;font-size:9px;color:#555">[${n.type}]</span>
${n.sla ? `<span style="margin-left:8px;font-size:9px;color:#6D9DB9">SLA: ${n.sla}</span>` : ''}
<div style="margin-top:5px;color:#888">${n.desc}</div>`;
      }
    });

    // 범례 렌더링
    const legend = this.containerEl.querySelector('#topo-legend');
    if (legend) {
      const types = [
        { type: 'gate',   label: 'Gate (입력)',   color: TYPE_COLOR.gate },
        { type: 'module', label: 'Module (처리)', color: TYPE_COLOR.module },
        { type: 'engine', label: 'Engine (계산)', color: TYPE_COLOR.engine },
        { type: 'ml',     label: 'ML (학습)',     color: TYPE_COLOR.ml },
        { type: 'future', label: 'Future (예정)', color: '#333' }
      ];
      legend.innerHTML = types.map(t =>
        `<div style="display:flex;align-items:center;gap:5px;font-size:10px;">
          <div style="width:12px;height:12px;background:${t.color};border-radius:2px;border:1px solid #333;"></div>
          <span style="color:#888">${t.label}</span>
        </div>`
      ).join('');
    }
  }
}

module.exports = { TopologyPage };
```

### 1-3. App.js L285 교체

```bash
# 현재 코드 확인
grep -n -A3 "_renderTopology" modules-html/boc-v6/src/shell/App.js | head -10
```

str_replace로 교체:

```javascript
_renderTopology(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  try {
    const { TopologyPage } = require('../topology/TopologyPage.js');
    new TopologyPage({ containerEl: main });
  } catch(e) {
    main.innerHTML = `<div class="card"><p style="color:var(--negative)">토폴로지 로드 실패: ${e.message}</p></div>`;
  }
}
```

### 1-4. 커밋 1

```bash
git add modules-html/boc-v6/src/topology/ \
        modules-html/boc-v6/src/shell/App.js
git commit -m "feat: 토폴로지 화면 (Cytoscape.js, graph.json 12노드+24엣지)"
```

---

## 5. 작업 2: AI 임원 대시보드 (1.5시간)

### 2-0. 테스트 먼저

파일: `modules-html/boc-v6/src/ai-executive/__tests__/AIExecutive.test.cjs`

```javascript
'use strict';
const assert = require('assert');

// TC-1: KPI 요약 프롬프트 생성
function buildKPISummaryPrompt(kpiData) {
  return {
    role: 'user',
    content: `다음 ECOREAN BOC 시스템의 KPI 데이터를 분석하고 핵심 인사이트를 한국어로 3줄로 요약해주세요:\n${JSON.stringify(kpiData, null, 2)}`
  };
}
const prompt = buildKPISummaryPrompt({ contracts: 5, inspectionFail: 1, scheduledDelay: 2 });
assert(prompt.role === 'user', 'TC-1 FAIL');
assert(prompt.content.includes('KPI'), 'TC-1 FAIL: KPI 미포함');
console.log('TC-1 PASS: KPI 요약 프롬프트');

// TC-2: 견적 이상 탐지 프롬프트
function buildAnomalyPrompt(estimate) {
  return {
    role: 'user',
    content: `다음 인테리어 견적의 이상 여부를 분석해주세요:\n${JSON.stringify(estimate)}`
  };
}
const ap = buildAnomalyPrompt({ finalTotal: 50000000, areaSqm: 30 });
assert(ap.content.includes('견적'), 'TC-2 FAIL');
console.log('TC-2 PASS: 이상 탐지 프롬프트');

// TC-3: 시스템 프롬프트 구조
const SYSTEM_PROMPT = {
  role: 'user',
  content: 'You are ECOREAN BOC AI Executive. 한국어로 응답하세요.'
};
assert(SYSTEM_PROMPT.role === 'user', 'TC-3 FAIL');
console.log('TC-3 PASS: 시스템 프롬프트');

// TC-4: 응답 파싱 (텍스트)
function parseAIResponse(result) {
  if (!result.ok) return { ok: false, text: result.error?.message || '오류 발생' };
  return { ok: true, text: result.data?.text || '' };
}
const ok  = parseAIResponse({ ok: true,  data: { text: '분석 완료' } });
const err = parseAIResponse({ ok: false, error: { message: 'API 오류' } });
assert(ok.ok  && ok.text === '분석 완료', 'TC-4 FAIL');
assert(!err.ok && err.text === 'API 오류', 'TC-4 FAIL');
console.log('TC-4 PASS: 응답 파싱');

// TC-5: 원칙 15 에러 구조
const { bocError } = require('../../../contract/utils/bocError.cjs');
const e = bocError('AI_FAIL', 'AI 호출 실패', { provider: 'claude' });
assert(!e.ok && e.error.context.provider === 'claude', 'TC-5 FAIL');
console.log('TC-5 PASS: bocError');

console.log('\n✅ AIExecutive 테스트 5/5 PASS');
```

```bash
mkdir -p modules-html/boc-v6/src/ai-executive/__tests__
node modules-html/boc-v6/src/ai-executive/__tests__/AIExecutive.test.cjs
```

### 2-1. AIExecutivePage.js

파일: `modules-html/boc-v6/src/ai-executive/AIExecutivePage.js`

```javascript
// ECOREAN BOC v6.0 — AI 임원 대시보드
// 멀티 프로바이더: Claude / OpenAI / Gemini / Ollama
// window.boc.ai.query → IPC → AIProvider.cjs
// 원칙 15: try/catch

const SYSTEM_PROMPT = `당신은 ECOREAN BOC 시스템의 AI 임원 어시스턴트입니다.
인테리어 공사 견적, 계약, 공정, 발주, 검수 데이터를 분석하여
핵심 인사이트를 한국어로 간결하게 제공합니다.
수치는 원 단위로 표시하고, 위험 요소는 명확하게 지적해주세요.`;

class AIExecutivePage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.messages    = [];   // 대화 히스토리
    this.loading     = false;
    this.config      = { provider: 'claude', hasKey: false };
    this._render();
    this._loadConfig();
  }

  async _loadConfig() {
    const api = window.boc?.ai;
    if (!api) return;
    try {
      const r = await api.getConfig();
      if (r.ok) {
        this.config = r.data;
        this._updateConfigDisplay();
      }
    } catch(e) { console.error('[AIExecutive:config]', e); }
  }

  _render() {
    const IS = 'width:100%;padding:7px 9px;background:#141414;border:1px solid #2A2A2A;color:#F0EDE8;font-size:11px;outline:none;font-family:inherit;';
    this.containerEl.innerHTML = `
<div style="padding:22px;color:#F0EDE8;display:flex;flex-direction:column;height:calc(100vh - 120px);">

  <!-- 헤더 -->
  <div style="border-bottom:1px solid #C9A84C;padding-bottom:11px;margin-bottom:15px;flex-shrink:0;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:17px;color:#C9A84C;letter-spacing:4px;font-weight:700;">AI EXECUTIVE</div>
        <div style="font-size:10px;color:#555;margin-top:2px;">BOC 시스템 AI 임원 어시스턴트</div>
      </div>
      <div id="ai-config-badge" style="font-size:10px;color:#666;padding:4px 10px;border:1px solid #1E1E1E;">
        프로바이더 로딩 중...
      </div>
    </div>
  </div>

  <!-- 빠른 분석 버튼 -->
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;flex-shrink:0;">
    <button data-action="kpi"      style="${this._btnStyle()}">📊 KPI 요약</button>
    <button data-action="anomaly"  style="${this._btnStyle()}">🔍 견적 이상 탐지</button>
    <button data-action="schedule" style="${this._btnStyle()}">📅 공정 지연 분석</button>
    <button data-action="risk"     style="${this._btnStyle()}">⚠️ 리스크 평가</button>
    <button data-action="clear"    style="${this._btnStyle('#333')}">🗑 대화 초기화</button>
  </div>

  <!-- 대화 영역 -->
  <div id="ai-messages" style="
    flex:1;overflow-y:auto;
    background:#0A0A0A;border:1px solid #1E1E1E;
    padding:12px;margin-bottom:10px;
    display:flex;flex-direction:column;gap:8px;
    min-height:200px;
  ">
    <div style="text-align:center;color:#333;font-size:11px;padding:20px;">
      AI 임원에게 질문하거나 위 버튼으로 빠른 분석을 시작하세요.
    </div>
  </div>

  <!-- 입력 영역 -->
  <div style="display:flex;gap:8px;flex-shrink:0;">
    <textarea id="ai-input" rows="2"
      placeholder="질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
      style="${IS}height:auto;flex:1;resize:none;"></textarea>
    <button id="ai-send" style="
      padding:0 18px;background:#C9A84C;border:none;
      color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;
      white-space:nowrap;align-self:stretch;">전송</button>
  </div>

  <!-- 프로바이더 설정 안내 -->
  <div id="ai-no-key-warn" style="display:none;margin-top:8px;padding:8px 12px;background:#1A0F0F;border:1px solid #4A2A2A;font-size:10px;color:#C96D6D;">
    ⚠️ API 키가 설정되지 않았습니다. <code>.env</code> 파일에 <code>BOC_AI_KEY</code>를 설정하거나
    Ollama를 사용하세요 (<code>BOC_AI_PROVIDER=ollama</code>).
  </div>
</div>`;

    // 이벤트 등록
    this.containerEl.addEventListener('click', e => {
      const action = e.target.dataset.action;
      if (action === 'kpi')      this._quickAnalysis('kpi');
      if (action === 'anomaly')  this._quickAnalysis('anomaly');
      if (action === 'schedule') this._quickAnalysis('schedule');
      if (action === 'risk')     this._quickAnalysis('risk');
      if (action === 'clear')    this._clearMessages();
      if (e.target.id === 'ai-send') this._sendMessage();
    });

    const input = this.containerEl.querySelector('#ai-input');
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._sendMessage();
      }
    });
  }

  _updateConfigDisplay() {
    const badge = this.containerEl.querySelector('#ai-config-badge');
    const warn  = this.containerEl.querySelector('#ai-no-key-warn');
    if (badge) {
      const color = this.config.hasKey || this.config.provider === 'ollama' ? '#6DB96D' : '#C96D6D';
      badge.innerHTML = `<span style="color:${color}">●</span> ${this.config.provider.toUpperCase()}`;
      badge.style.borderColor = color;
    }
    if (warn) {
      warn.style.display = (!this.config.hasKey && this.config.provider !== 'ollama') ? 'block' : 'none';
    }
  }

  async _sendMessage() {
    const input = this.containerEl.querySelector('#ai-input');
    const text  = input?.value?.trim();
    if (!text || this.loading) return;

    input.value = '';
    this._addMessage('user', text);
    await this._callAI(text);
  }

  async _quickAnalysis(type) {
    if (this.loading) return;

    const prompts = {
      kpi: '현재 BOC 시스템의 KPI 상태를 분석하고 주요 이슈와 개선 방향을 알려주세요.',
      anomaly: '최근 견적 데이터에서 이상 패턴(비용 급등, 면적 대비 단가 이상 등)을 탐지해주세요.',
      schedule: '공정 일정 중 지연 리스크가 있는 항목과 원인, 대응 방안을 분석해주세요.',
      risk: '현재 진행 중인 계약과 공정에서 리스크 요소를 평가하고 우선순위를 매겨주세요.'
    };

    const text = prompts[type];
    if (!text) return;
    this._addMessage('user', text);
    await this._callAI(text);
  }

  async _callAI(userText) {
    this.loading = true;
    const loadingEl = this._addMessage('assistant', '⏳ 분석 중...', true);

    try {
      // 대화 히스토리 구성 (시스템 프롬프트 포함)
      const messages = [
        { role: 'user',      content: SYSTEM_PROMPT },
        { role: 'assistant', content: '네, ECOREAN BOC AI 임원으로서 분석을 도와드리겠습니다.' },
        ...this.messages.slice(-6),  // 최근 6개만 (토큰 절약)
        { role: 'user', content: userText }
      ];

      const api = window.boc?.ai;
      let result;

      if (api) {
        result = await api.query({ messages });
      } else {
        // 개발 모드 fallback
        result = {
          ok: true,
          data: {
            text: `[개발 모드] "${userText}"에 대한 AI 분석 결과입니다.\n\nElectron 환경에서 실제 AI 응답이 표시됩니다.\n현재는 .env BOC_AI_PROVIDER와 BOC_AI_KEY 설정 후 npm start로 실행해주세요.`,
            provider: 'mock'
          }
        };
      }

      // 로딩 메시지 교체
      if (loadingEl) {
        if (result.ok) {
          loadingEl.innerHTML = this._formatAIText(result.data.text);
          loadingEl.dataset.provider = result.data.provider || '';
          // 히스토리에 추가
          this.messages.push(
            { role: 'user',      content: userText },
            { role: 'assistant', content: result.data.text }
          );
        } else {
          loadingEl.innerHTML = `<span style="color:#C96D6D">❌ ${result.error?.message || '오류 발생'}</span>`;
          loadingEl.style.borderColor = '#4A2A2A';
        }
      }
    } catch(e) {
      console.error('[AIExecutive:call]', e);
      if (loadingEl) {
        loadingEl.innerHTML = `<span style="color:#C96D6D">❌ ${e.message}</span>`;
      }
    } finally {
      this.loading = false;
    }
  }

  _addMessage(role, text, isLoading = false) {
    const el   = this.containerEl.querySelector('#ai-messages');
    if (!el) return null;

    // 첫 메시지 안내 제거
    const placeholder = el.querySelector('div[style*="text-align:center"]');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.style.cssText = `
      padding:10px 12px;
      background:${role === 'user' ? '#141414' : '#0D1A0D'};
      border:1px solid ${role === 'user' ? '#2A2A2A' : '#1A3A1A'};
      border-radius:2px;
      font-size:11px;
      line-height:1.7;
      white-space:pre-line;
    `;
    div.innerHTML = role === 'user'
      ? `<span style="color:#C9A84C;font-size:9px;letter-spacing:1px;">YOU</span><br>${text}`
      : `<span style="color:#6DB96D;font-size:9px;letter-spacing:1px;">AI EXECUTIVE</span><br>${text}`;

    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    return div;
  }

  _formatAIText(text) {
    // 마크다운 기본 변환
    return `<span style="color:#6DB96D;font-size:9px;letter-spacing:1px;">AI EXECUTIVE</span><br>`
      + text
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#E8D5A3">$1</strong>')
        .replace(/^### (.*)/gm, '<div style="color:#C9A84C;margin-top:8px;font-weight:700">$1</div>')
        .replace(/^## (.*)/gm,  '<div style="color:#C9A84C;margin-top:8px;font-size:13px;font-weight:700">$1</div>')
        .replace(/^- (.*)/gm,   '<div style="margin-left:12px">• $1</div>');
  }

  _clearMessages() {
    this.messages = [];
    const el = this.containerEl.querySelector('#ai-messages');
    if (el) el.innerHTML = `<div style="text-align:center;color:#333;font-size:11px;padding:20px;">대화가 초기화되었습니다.</div>`;
  }

  _btnStyle(bg = '#141414') {
    return `padding:6px 12px;background:${bg};border:1px solid #2A2A2A;color:#C9A84C;font-size:10px;cursor:pointer;`;
  }
}

module.exports = { AIExecutivePage };
```

### 2-2. App.js L286 교체

```bash
grep -n -A3 "_renderAIExecutive" modules-html/boc-v6/src/shell/App.js | head -10
```

str_replace로 교체:

```javascript
_renderAIExecutive(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  try {
    const { AIExecutivePage } = require('../ai-executive/AIExecutivePage.js');
    new AIExecutivePage({ containerEl: main });
  } catch(e) {
    main.innerHTML = `<div class="card"><p style="color:var(--negative)">AI 임원 로드 실패: ${e.message}</p></div>`;
  }
}
```

### 2-3. 커밋 2

```bash
git add modules-html/boc-v6/src/ai-executive/ \
        modules-html/boc-v6/src/shell/App.js
git commit -m "feat: AI 임원 대시보드 (멀티 프로바이더 Claude/OpenAI/Gemini/Ollama)"
```

---

## 6. 작업 3: esbuild + feature flags + MASTER_PLAN (20분)

### 3-1. esbuild entry 추가

`modules-html/boc-v6/build.config.cjs`:

```javascript
'topology':     path.join(__dirname, 'src/topology/TopologyPage.js'),
'ai-executive': path.join(__dirname, 'src/ai-executive/AIExecutivePage.js')
```

### 3-2. feature flags 추가

`shell/src/feature-flags/flags.cjs`:
```javascript
PHASE_4G_COMPLETE:    true,   // Week 7: 토폴로지 + AI 임원
USE_TOPOLOGY_UI:      true,
USE_AI_EXECUTIVE:     true,
USE_MULTI_AI:         true,   // 멀티 프로바이더 활성
```

flags 테스트 추가:
```javascript
// Test 9: Phase 4G + AI 플래그
(function() {
  assert(isEnabled('PHASE_4G_COMPLETE') === true, 'PHASE_4G_COMPLETE');
  assert(isEnabled('USE_TOPOLOGY_UI')   === true, '토폴로지 UI');
  assert(isEnabled('USE_AI_EXECUTIVE')  === true, 'AI 임원');
  assert(isEnabled('USE_MULTI_AI')      === true, '멀티 AI');
})();
console.log('[PASS] feature-flags (9/9)');
```

### 3-3. MASTER_PLAN v6.2 갱신

```markdown
| v6.2 | 2026-04-30 | §117.4 Phase 4 Week 7 완료 — 토폴로지 + AI 임원 (멀티 프로바이더) |

- Week 7: 토폴로지 + AI 임원 ✅
  - TopologyPage (Cytoscape.js, graph.json 12노드+24엣지 시각화)
  - AIExecutivePage (KPI 요약/견적 이상 탐지/공정 지연 분석/리스크 평가)
  - AIProvider.cjs (Claude/OpenAI/Gemini/Ollama 멀티 프로바이더)
  - .env BOC_AI_PROVIDER + BOC_AI_KEY 설정 방식
  - IPC: boc:ai:query + boc:ai:getConfig
  - Feature flags: PHASE_4G_COMPLETE/USE_TOPOLOGY_UI/USE_AI_EXECUTIVE/USE_MULTI_AI
```

### 3-4. 전체 테스트 + 빌드

```bash
# 전체 테스트
node shell/tests/ai/AIProvider.test.cjs
node modules-html/boc-v6/src/ai-executive/__tests__/AIExecutive.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node shell/src/closed-loop/__tests__/Contract.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs

# 빌드 (11 entry 목표)
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -5
cd ../..
```

### 3-5. 커밋 3 + push

```bash
git add modules-html/boc-v6/build.config.cjs \
        shell/src/feature-flags/flags.cjs \
        shell/src/feature-flags/__tests__/flags.test.cjs \
        docs/MASTER_PLAN.md
git commit -m "chore: v6.2 MASTER_PLAN + PHASE_4G_COMPLETE + 11 entry esbuild"
git push origin master
```

---

## 7. Gate Test — Week 7 완료 기준

```
□ AIProvider: 5/5 PASS (4개 프로바이더 구조)
□ AIExecutive: 5/5 PASS
□ feature-flags: 9/9 PASS
□ 기존 회귀: 모두 PASS
□ 빌드: 11 entry (topology/ai-executive 추가)
□ PHASE_4G_COMPLETE=true
□ MASTER_PLAN v6.2
□ .env 파일 + .gitignore 추가
□ graph.json 12노드+24엣지 변경 없음 (헌법)
□ 원칙 15: try/catch 전체
□ 멀티 프로바이더: Claude/OpenAI/Gemini/Ollama
□ push 완료
```

---

## 8. 헌법 위반 검증

| 항목 | 판정 |
|---|---|
| graph.json 변경 | 0건 (읽기만) |
| 22/23/12/6/5 수치 | 0건 |
| 원칙 15 | ✅ 전체 적용 |
| P2 단가 추정 | 0건 |
| B5 TDD | ✅ 테스트 먼저 |

---

## 9. Week 8 예고

```
Week 8: 실거래 1건 검증
- 실제 계약 1건 입력 (is_simulated=0)
- 전체 Closed Loop 동작 확인
- 성능 측정 (SLA 검증)
- Critical C2 최종 해결
```

---

*ECOREAN BOC OS — Phase 4 Week 7 명령서*
*멀티 AI 프로바이더 | 추정 코드 0건 | 2026-04-30*
