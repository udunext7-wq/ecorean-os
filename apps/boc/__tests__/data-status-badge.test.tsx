// 헌법 9조 UI 검증 — 미확정 데이터는 경고 톤으로 드러난다
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataStatusBadge } from '../components/DataStatusBadge';

describe('DataStatusBadge', () => {
  it('NEEDS_RESEARCH는 경고(warn) 톤 + 한글 라벨 "조사필요"', () => {
    render(<DataStatusBadge status="NEEDS_RESEARCH" />);
    const badge = screen.getByText('조사필요');
    expect(badge.getAttribute('data-tone')).toBe('warn');
  });
  it('VERIFIED는 ok 톤 + "검증됨"', () => {
    render(<DataStatusBadge status="VERIFIED" />);
    expect(screen.getByText('검증됨').getAttribute('data-tone')).toBe('ok');
  });
  it('MARKET_RESEARCH는 중립 톤', () => {
    render(<DataStatusBadge status="MARKET_RESEARCH" />);
    expect(screen.getByText('시장조사').getAttribute('data-tone')).toBe('neutral');
  });
});
