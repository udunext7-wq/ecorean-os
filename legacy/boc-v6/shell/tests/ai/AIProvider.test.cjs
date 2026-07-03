'use strict';
const assert = require('assert');
const { callAI, PROVIDERS } = require('../../src/ai/AIProvider.cjs');

// TC-1: 지원 프로바이더 4개 확인
assert('claude'  in PROVIDERS, 'TC-1 FAIL: claude');
assert('openai'  in PROVIDERS, 'TC-1 FAIL: openai');
assert('gemini'  in PROVIDERS, 'TC-1 FAIL: gemini');
assert('ollama'  in PROVIDERS, 'TC-1 FAIL: ollama');
console.log('TC-1 PASS: 4개 프로바이더 정의');

async function run() {
  // TC-2: 알 수 없는 프로바이더 → bocError 구조
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
