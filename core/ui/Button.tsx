import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary:
    'bg-brand-600 text-ink font-semibold hover:bg-brand-400 disabled:bg-stroke disabled:text-faint',
  secondary: 'bg-panel text-cream border border-stroke hover:bg-panel2',
} as const;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
}

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
