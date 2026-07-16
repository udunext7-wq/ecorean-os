import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
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
