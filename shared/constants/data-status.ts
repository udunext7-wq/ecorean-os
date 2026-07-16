// shared/constants/data-status.ts — 마스터 데이터 상태 코드 (마이그레이션 check 제약과 동일)
// 헌법 9조: 미확보 단가는 NEEDS_RESEARCH 로 표시만 한다.

export const DATA_STATUSES = [
  'OFFICIAL',
  'INTERNAL_ESTIMATED',
  'MARKET_RESEARCH',
  'NEEDS_RESEARCH',
  'PARTIAL',
  'STRUCTURE_READY',
  'EMPTY',
  'VERIFIED',
  'INTERNAL_VALIDATED',
] as const;

export type DataStatus = (typeof DATA_STATUSES)[number];

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  OFFICIAL: '공식',
  INTERNAL_ESTIMATED: '내부추정',
  MARKET_RESEARCH: '시장조사',
  NEEDS_RESEARCH: '조사필요',
  PARTIAL: '부분',
  STRUCTURE_READY: '구조준비',
  EMPTY: '빈값',
  VERIFIED: '검증됨',
  INTERNAL_VALIDATED: '내부검증',
};

/** 주의가 필요한(값이 확정되지 않은) 상태 */
export const ATTENTION_STATUSES: readonly DataStatus[] = [
  'NEEDS_RESEARCH',
  'PARTIAL',
  'EMPTY',
];
