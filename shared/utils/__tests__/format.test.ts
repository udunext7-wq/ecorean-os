// 헌법 9조: 단가 추정 금지 — null은 '—'로 표시하고 절대 값을 만들지 않는다
import { describe, it, expect } from 'vitest';
import { formatKRW, formatNumber, formatSizeMm } from '../format';

describe('formatKRW', () => {
  it('정수 원화를 천단위 구분으로 표시', () => {
    expect(formatKRW(35000)).toBe('35,000원');
    expect(formatKRW(0)).toBe('0원');
  });
  it('null/undefined(단가 미확보)는 — 로 표시 (헌법 9조)', () => {
    expect(formatKRW(null)).toBe('—');
    expect(formatKRW(undefined)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('수치 천단위 표시, null은 —', () => {
    expect(formatNumber(2550)).toBe('2,550');
    expect(formatNumber(null)).toBe('—');
  });
});

describe('formatSizeMm', () => {
  it('가로×세로 표시', () => {
    expect(formatSizeMm(600, 600)).toBe('600×600');
  });
  it('부분 파싱 실패는 ? 로, 전부 없으면 —', () => {
    expect(formatSizeMm(600, null)).toBe('600×?');
    expect(formatSizeMm(null, null)).toBe('—');
  });
});
