export const VERSION = '1.0.0'; // TODO: 구현 예정

const VAT_RATE = 0.1;

export function addVat(amount: number): number {
  return Math.round(amount * (1 + VAT_RATE));
}

export function vatAmount(amount: number): number {
  return Math.round(amount * VAT_RATE);
}

export function round(amount: number, unit = 1): number {
  return Math.round(amount / unit) * unit;
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

export function parseKRW(value: string): number {
  return Number(value.replace(/[^0-9.-]/g, ''));
}
