import type { ReactNode } from 'react';

const TONES = {
  ok: 'bg-brand-100 text-brand-700',
  warn: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-blue-100 text-blue-700',
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      data-tone={tone}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
