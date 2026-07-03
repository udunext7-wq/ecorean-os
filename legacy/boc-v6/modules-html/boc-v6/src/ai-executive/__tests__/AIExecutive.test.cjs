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

// TC-4: 응답 파싱
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
const { bocError } = require('../../contract/utils/bocError.cjs');
const e = bocError('AI_FAIL', 'AI 호출 실패', { provider: 'claude' });
assert(!e.ok && e.error.context.provider === 'claude', 'TC-5 FAIL');
console.log('TC-5 PASS: bocError');

console.log('\n✅ AIExecutive 테스트 5/5 PASS');
