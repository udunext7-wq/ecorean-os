'use client';

// 업무 허브 v3 — 3D 홀로그램 카루셀 (대표 지시 2026-08-24)
// 인트로(ACCESS PORTAL) 언어: #02060E × 네온 시안 × 샴페인 골드, Cinzel 글로우, 코너 브래킷.
// 섹션 카드 4장이 3D 링 위에서 회전 — 드래그·화살표·측면 카드 클릭으로 회전, 대기 시 자동 순환.
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { Cinzel, JetBrains_Mono } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400'], display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

const SEL_KEY = 'ecorean.hubCarousel.section';
const AUTO_MS = 7000;

export function HubCarousel({ sections }: { sections: TreeSection[] }) {
  const n = sections.length;
  const step = 360 / n;
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const dragging = useRef<{ x: number; moved: boolean } | null>(null);
  const interacted = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEL_KEY);
      const i = sections.findIndex((s) => s.title === saved);
      if (i >= 0) {
        setIndex(i);
        interacted.current = true; // 저장된 선택이 있으면 자동 순환 없이 그 자리 유지
      }
    } catch {
      /* no-op */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대기 시 쇼케이스 자동 회전 — 첫 상호작용 시 중단
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => {
      if (!interacted.current && !dragging.current) setIndex((i) => (i + 1) % n);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [n]);

  function select(i: number) {
    interacted.current = true;
    const next = ((i % n) + n) % n;
    setIndex(next);
    try {
      localStorage.setItem(SEL_KEY, sections[next].title);
    } catch {
      /* no-op */
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = { x: e.clientX, moved: false };
    interacted.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) d.moved = true;
    setDrag(dx * 0.18);
  }
  function onPointerUp() {
    const d = dragging.current;
    dragging.current = null;
    if (!d) return;
    if (d.moved) select(index - Math.round(drag / step));
    setDrag(0);
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') select(index + 1);
    if (e.key === 'ArrowLeft') select(index - 1);
  }

  const rotation = -(index * step) + drag;

  return (
    <div className="hubc">
      {/* 브랜드 */}
      <header className="hubc-head">
        <div className="hubc-hairline" aria-hidden />
        <p className={`${cinzel.className} hubc-brand`}>ECOREAN</p>
        <p className={`${mono.className} hubc-sub`}>WORK HUB · OPERATION DECK</p>
      </header>

      {/* 3D 카루셀 */}
      <div
        className="hubc-viewport"
        role="listbox"
        aria-label="업무 섹션"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          className={`hubc-ring ${dragging.current ? 'is-dragging' : ''}`}
          style={{ transform: `translateZ(calc(var(--hubc-r) * -1)) rotateY(${rotation}deg)` }}
        >
          {sections.map((sec, i) => {
            const facing = ((i - index) % n + n) % n;
            const isFront = facing === 0 && Math.abs(drag) < step / 2;
            const staffItems = sec.items.filter((it) => !it.admin);
            const adminItems = sec.items.filter((it) => it.admin);
            return (
              <div
                key={sec.title}
                className={`hubc-card ${isFront ? 'is-front' : ''}`}
                style={{ ['--a' as string]: `${i * step}deg` }}
                role="option"
                aria-selected={isFront}
                onClick={() => {
                  if (!isFront && !dragging.current) select(i);
                }}
              >
                <span className="hubc-tick hubc-tick-tl" aria-hidden />
                <span className="hubc-tick hubc-tick-tr" aria-hidden />
                <span className="hubc-tick hubc-tick-bl" aria-hidden />
                <span className="hubc-tick hubc-tick-br" aria-hidden />
                <div className="hubc-card-head">
                  <span className={`${mono.className} hubc-card-no`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="hubc-card-title">{sec.title}</span>
                  <span className={`${mono.className} hubc-card-desc`}>{sec.desc}</span>
                </div>
                <div className="hubc-card-body">
                  <ul className="hubc-list">
                    {staffItems.map((item) => (
                      <li key={item.href}>
                        <a href={item.href} className="hubc-item" tabIndex={isFront ? 0 : -1}>
                          <span className="hubc-item-name">{item.name}</span>
                          <span className="hubc-item-desc">{item.desc}</span>
                        </a>
                      </li>
                    ))}
                    {adminItems.map((item) => (
                      <li key={item.href}>
                        <a href={item.href} className="hubc-item is-admin" tabIndex={isFront ? 0 : -1}>
                          <span className="hubc-item-name">{item.name}</span>
                          <span className="hubc-item-desc">{item.desc}</span>
                          <span className={`${mono.className} hubc-item-tag`}>ADMIN</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${mono.className} hubc-card-foot`}>
                  {sec.items.length} MODULES · AUTHORIZED
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HUD 컨트롤 */}
      <div className="hubc-hud">
        <button type="button" className="hubc-arrow" onClick={() => select(index - 1)} aria-label="이전 섹션">
          ◀
        </button>
        <div className="hubc-status">
          <span className={`${mono.className} hubc-sector`}>
            SECTOR {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <div className="hubc-dots" aria-hidden>
            {sections.map((s, i) => (
              <button
                key={s.title}
                type="button"
                tabIndex={-1}
                className={`hubc-dot ${i === index ? 'is-on' : ''}`}
                onClick={() => select(i)}
              />
            ))}
          </div>
          <span className="hubc-status-title">{sections[index].title}</span>
        </div>
        <button type="button" className="hubc-arrow" onClick={() => select(index + 1)} aria-label="다음 섹션">
          ▶
        </button>
      </div>
    </div>
  );
}
