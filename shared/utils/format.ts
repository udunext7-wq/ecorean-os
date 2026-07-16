// shared/utils/format.ts — 공통 표시 유틸
// 헌법 9조: 단가 추정 금지 — 값이 없으면(null) '—'로 표시하고 절대 지어내지 않는다.
// supabase README 규칙: 금액은 정수(원), 치수는 정수(mm).

/** 정수 원화 표시. null/undefined = 단가 미확보 → '—' */
export function formatKRW(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('ko-KR')}원`;
}

/** 일반 수치 표시. null = '—' */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('ko-KR');
}

/** mm 규격 표시 (예: 600×600) */
export function formatSizeMm(
  w: number | null | undefined,
  h: number | null | undefined,
): string {
  if (!w && !h) return '—';
  return `${w ?? '?'}×${h ?? '?'}`;
}
