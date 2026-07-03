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
    this.messages    = [];
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

  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;flex-shrink:0;">
    <button data-action="kpi"      style="${this._btnStyle()}">📊 KPI 요약</button>
    <button data-action="anomaly"  style="${this._btnStyle()}">🔍 견적 이상 탐지</button>
    <button data-action="schedule" style="${this._btnStyle()}">📅 공정 지연 분석</button>
    <button data-action="risk"     style="${this._btnStyle()}">⚠️ 리스크 평가</button>
    <button data-action="clear"    style="${this._btnStyle('#333')}">🗑 대화 초기화</button>
  </div>

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

  <div style="display:flex;gap:8px;flex-shrink:0;">
    <textarea id="ai-input" rows="2"
      placeholder="질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
      style="${IS}height:auto;flex:1;resize:none;"></textarea>
    <button id="ai-send" style="
      padding:0 18px;background:#C9A84C;border:none;
      color:#0A0A0A;font-size:11px;font-weight:700;cursor:pointer;
      white-space:nowrap;align-self:stretch;">전송</button>
  </div>

  <div id="ai-no-key-warn" style="display:none;margin-top:8px;padding:8px 12px;background:#1A0F0F;border:1px solid #4A2A2A;font-size:10px;color:#C96D6D;">
    ⚠️ API 키가 설정되지 않았습니다. <code>.env</code> 파일에 <code>BOC_AI_KEY</code>를 설정하거나
    Ollama를 사용하세요 (<code>BOC_AI_PROVIDER=ollama</code>).
  </div>
</div>`;

    this._clickHandler = (e) => {
      const action = e.target.dataset.action;
      if (action === 'kpi')      this._quickAnalysis('kpi');
      if (action === 'anomaly')  this._quickAnalysis('anomaly');
      if (action === 'schedule') this._quickAnalysis('schedule');
      if (action === 'risk')     this._quickAnalysis('risk');
      if (action === 'clear')    this._clearMessages();
      if (e.target.id === 'ai-send') this._sendMessage();
    };
    this.containerEl.addEventListener('click', this._clickHandler);

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
      kpi:      '현재 BOC 시스템의 KPI 상태를 분석하고 주요 이슈와 개선 방향을 알려주세요.',
      anomaly:  '최근 견적 데이터에서 이상 패턴(비용 급등, 면적 대비 단가 이상 등)을 탐지해주세요.',
      schedule: '공정 일정 중 지연 리스크가 있는 항목과 원인, 대응 방안을 분석해주세요.',
      risk:     '현재 진행 중인 계약과 공정에서 리스크 요소를 평가하고 우선순위를 매겨주세요.'
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
      const messages = [
        { role: 'user',      content: SYSTEM_PROMPT },
        { role: 'assistant', content: '네, ECOREAN BOC AI 임원으로서 분석을 도와드리겠습니다.' },
        ...this.messages.slice(-6),
        { role: 'user', content: userText }
      ];

      const api = window.boc?.ai;
      let result;

      if (api) {
        result = await api.query({ messages });
      } else {
        result = {
          ok: true,
          data: {
            text: `[개발 모드] "${userText}"에 대한 AI 분석 결과입니다.\n\nElectron 환경에서 실제 AI 응답이 표시됩니다.\n현재는 .env BOC_AI_PROVIDER와 BOC_AI_KEY 설정 후 npm start로 실행해주세요.`,
            provider: 'mock'
          }
        };
      }

      if (loadingEl) {
        if (result.ok) {
          loadingEl.innerHTML = this._formatAIText(result.data.text);
          loadingEl.dataset.provider = result.data.provider || '';
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
    const el = this.containerEl.querySelector('#ai-messages');
    if (!el) return null;

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
  unmount() {
    if (this._clickHandler) {
      this.containerEl.removeEventListener('click', this._clickHandler);
    }
    this.messages = [];
    this.containerEl.innerHTML = '';
  }
}

module.exports = { AIExecutivePage };
