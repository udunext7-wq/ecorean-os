'use client';

// 인증 화면 공통 셸 v2 — 홀로그램·3D 입체 연출 (대표 지시 2026-08-24)
// 마우스 추적 3D 틸트 + 홀로 광택(시안·골드·바이올렛) + 궤도 링. 터치·모션 최소화 환경은 자동 비활성.
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import { JetBrains_Mono } from 'next/font/google';

const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });

export function AuthShell({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const raf = useRef(0);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return () => cancelAnimationFrame(raf.current);
  }, []);

  function setVars(rx: number, ry: number, mx: number, my: number) {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty('--rx', `${rx}deg`);
    el.style.setProperty('--ry', `${ry}deg`);
    el.style.setProperty('--mx', `${mx}`);
    el.style.setProperty('--my', `${my}`);
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce.current || e.pointerType !== 'mouse') return;
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setVars(-(y - 0.5) * 9, (x - 0.5) * 12, x, y));
  }

  function onLeave() {
    cancelAnimationFrame(raf.current);
    setVars(0, 0, 0.5, 0.5);
  }

  return (
    <main className="auth-scene flex min-h-screen items-center justify-center p-4">
      <div className="auth-aurora" aria-hidden />
      <div className="auth-grid" aria-hidden />
      <div
        ref={stageRef}
        className="auth-stage relative w-full max-w-sm"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
      >
        <div className="auth-ring" aria-hidden />
        <div className="auth-tilt">
          <header className="auth-float mb-6 text-center">
            {/* 공식 로고 (크로마키 + 다크배경용 변환) — 대표 지시 2026-08-25 */}
            <img
              src="/brand/ecorean-logo-dark.png"
              alt="ECOREAN"
              width={168}
              height={168}
              draggable={false}
              className="auth-logo"
            />
            <p className={`${mono.className} auth-eyebrow mt-1`}>Build Operation Center</p>
            <div className="auth-hairline" aria-hidden />
          </header>
          <div className="auth-frame">
            <div className="auth-card">
              <span className="auth-tick auth-tick-tl" aria-hidden />
              <span className="auth-tick auth-tick-tr" aria-hidden />
              <span className="auth-tick auth-tick-bl" aria-hidden />
              <span className="auth-tick auth-tick-br" aria-hidden />
              <div className="auth-depth">{children}</div>
            </div>
          </div>
        </div>
        <p className={`${mono.className} auth-foot`}>SECURE ACCESS · ECOREAN.NET</p>
      </div>
    </main>
  );
}
