'use strict';

const PROVIDERS = {
  claude: {
    getUrl: ()     => 'https://api.anthropic.com/v1/messages',
    getHeaders: (key) => ({
      'Content-Type':      'application/json',
      'x-api-key':         key,
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
        code:    'AI_UNKNOWN_PROVIDER',
        message: `알 수 없는 프로바이더: ${provider}. claude|openai|gemini|ollama 중 선택`,
        context: { provider },
        ts:      new Date().toISOString()
      }
    };
  }

  if (provider !== 'ollama' && !key) {
    return {
      ok: false,
      error: {
        code:    'AI_NO_KEY',
        message: `${provider} API 키가 없습니다. .env BOC_AI_KEY 설정 필요`,
        context: { provider },
        ts:      new Date().toISOString()
      }
    };
  }

  try {
    const fetch   = require('node-fetch');
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
          code:    `AI_HTTP_${res.status}`,
          message: data?.error?.message || `HTTP ${res.status}`,
          context: { provider, status: res.status },
          ts:      new Date().toISOString()
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
        code:    'AI_CALL_FAIL',
        message: e.message,
        context: { provider },
        ts:      new Date().toISOString()
      }
    };
  }
}

module.exports = { callAI, PROVIDERS };
