export const VERSION = '1.0.0'; // TODO: 구현 예정

export type AreaUnit = 'm2' | 'pyeong';

const M2_PER_PYEONG = 3.305785;

export function m2ToPyeong(m2: number): number {
  return Number((m2 / M2_PER_PYEONG).toFixed(2));
}

export function pyeongToM2(pyeong: number): number {
  return Number((pyeong * M2_PER_PYEONG).toFixed(2));
}

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  if (from === to) return value;
  return from === 'm2' ? m2ToPyeong(value) : pyeongToM2(value);
}

export const UNIT_LABELS: Record<string, string> = {
  m2: 'm²',
  pyeong: '평',
  ea: '개',
  set: 'SET',
  m: 'm',
  ton: 'T',
  sheet: '매',
  room: '실',
};
