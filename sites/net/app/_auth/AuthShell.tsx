// 인증 화면 공통 셸 — 고급·미래 연출 (대표 지시 2026-08-24)
// 인트로/포털(Cinzel·모노)의 분위기를 로그인 계열 화면까지 이어간다.
import type { ReactNode } from 'react';
import { Cinzel, JetBrains_Mono } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '500'], display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-scene flex min-h-screen items-center justify-center p-4">
      <div className="auth-aurora" aria-hidden />
      <div className="auth-grid" aria-hidden />
      <div className="relative w-full max-w-sm">
        <header className="mb-7 text-center">
          <p className={`${mono.className} auth-eyebrow`}>Build Operation Center</p>
          <p className={`${cinzel.className} auth-wordmark`}>ECOREAN</p>
          <div className="auth-hairline" aria-hidden />
        </header>
        <div className="auth-card">
          <span className="auth-tick auth-tick-tl" aria-hidden />
          <span className="auth-tick auth-tick-tr" aria-hidden />
          <span className="auth-tick auth-tick-bl" aria-hidden />
          <span className="auth-tick auth-tick-br" aria-hidden />
          {children}
        </div>
        <p className={`${mono.className} auth-foot`}>SECURE ACCESS · ECOREAN.NET</p>
      </div>
    </main>
  );
}
