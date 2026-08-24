'use client';

// 업무 허브 v6 — 내려다보는 원탁 카드덱 (대표 지시 2026-08-24)
// 살짝 위에서 내려다보는 타원 궤도 위에 5장(섹션 4 + 예비 1)이 뒷면을 보인 채 돌고,
// 정면 슬롯에 온 한 장이 "뽑혀서" 일어서며 앞면(모듈 목록)을 보여준다. 뽑힌 자리는 공란.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Cinzel, JetBrains_Mono } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400'], display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

type Slot = { kind: 'section'; sec: TreeSection } | { kind: 'ghost' };

const SEL_KEY = 'ecorean.hubCarousel.section';
const IDLE_DEG_PER_SEC = 10;
const MORPH_MS = 900;
const MOTES = [
  { left: '14%', top: '52%', delay: '0s', dur: '13s' },
  { left: '26%', top: '68%', delay: '3s', dur: '16s' },
  { left: '43%', top: '60%', delay: '7s', dur: '12s' },
  { left: '60%', top: '72%', delay: '1.5s', dur: '15s' },
  { left: '74%', top: '56%', delay: '5s', dur: '14s' },
  { left: '88%', top: '66%', delay: '9s', dur: '17s' },
];

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

export function HubCarousel({ sections }: { sections: TreeSection[] }) {
  const slots: Slot[] = [...sections.map((sec) => ({ kind: 'section' as const, sec })), { kind: 'ghost' }];
  const n = slots.length;
  const step = 360 / n;
  const [rot, setRot] = useState(0);
  const [wide, setWide] = useState(true);
  const [animAll, setAnimAll] = useState(false);
  const [morphs, setMorphs] = useState<number[]>([]);
  const idle = useRef(true);
  const paused = useRef(false);
  const raf = useRef(0);
  const rotRef = useRef(0);
  const featuredRef = useRef(0);
  const dragging = useRef<{ x: number; rot0: number; moved: boolean } | null>(null);
  rotRef.current = rot;

  const featured = mod(Math.round(-rot / step), n); // 정면 슬롯의 카드가 뽑힌다
  // 뽑힘/복귀 전환 애니메이션 대상 표시
  useEffect(() => {
    const prev = featuredRef.current;
    if (prev === featured) return undefined;
    featuredRef.current = featured;
    setMorphs([prev, featured]);
    const t = window.setTimeout(() => setMorphs([]), MORPH_MS);
    return () => window.clearTimeout(t);
  }, [featured]);

  useEffect(() => {
    function measure() {
      setWide(window.innerWidth >= 640);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEL_KEY);
      const i = sections.findIndex((s) => s.title === saved);
      if (i >= 0) {
        idle.current = false;
        featuredRef.current = i;
        setRot(-i * step);
      }
    } catch {
      /* no-op */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대기 시 원탁 연속 회전 — 정면을 지나는 카드가 차례로 뽑혔다 돌아간다
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      idle.current = false;
      return undefined;
    }
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      if (idle.current && !paused.current && !dragging.current) {
        setRot((r) => r - IDLE_DEG_PER_SEC * dt);
      }
      raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  function snapTo(i: number) {
    idle.current = false;
    const r = rotRef.current;
    const delta = mod(-i * step - r + 180, 360) - 180;
    setAnimAll(true);
    setRot(r + delta);
    const slot = slots[mod(i, n)];
    try {
      localStorage.setItem(SEL_KEY, slot.kind === 'section' ? slot.sec.title : '__reserved');
    } catch {
      /* no-op */
    }
    window.setTimeout(() => setAnimAll(false), MORPH_MS);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = { x: e.clientX, rot0: rotRef.current, moved: false };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) {
      d.moved = true;
      idle.current = false;
    }
    if (d.moved) setRot(d.rot0 + dx * 0.25);
  }
  function onPointerUp() {
    const d = dragging.current;
    dragging.current = null;
    if (d?.moved) snapTo(mod(Math.round(-rotRef.current / step), n));
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') snapTo(featured + 1);
    if (e.key === 'ArrowLeft') snapTo(featured - 1);
  }

  // 무대 좌표 — 내려다보는 타원 원탁
  const RX = wide ? 300 : 185; // 좌우 반경
  const RY = wide ? 92 : 70; // 상하(원근) 반경
  const RZ = 130; // 깊이 반경
  const RING_Y = wide ? 168 : 150; // 원탁 중심의 화면상 높이
  const featuredSlot = slots[featured];

  return (
    <div className="hubc">
      <header className="hubc-head">
        <div className="hubc-hairline" aria-hidden />
        <p className={`${cinzel.className} hubc-brand`}>ECOREAN</p>
        <p className={`${mono.className} hubc-sub`}>WORK HUB · OPERATION DECK</p>
      </header>

      <div
        className="hubc-viewport"
        role="listbox"
        aria-label="업무 섹션"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={() => {
          paused.current = true;
        }}
        onPointerLeave={() => {
          paused.current = false;
          onPointerUp();
        }}
        onKeyDown={onKeyDown}
      >
        <div className="hubc-spot" aria-hidden />
        <div className="hubc-floor" aria-hidden />
        <div className="hubc-glowpool" aria-hidden />
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="hubc-mote"
            aria-hidden
            style={{ left: m.left, top: m.top, animationDelay: m.delay, animationDuration: m.dur }}
          />
        ))}
        <div className="hubc-ring3d">
          {slots.map((slot, i) => {
            const theta = ((i * step + rot) * Math.PI) / 180;
            const isFront = i === featured;
            // 원탁 슬롯 좌표 (θ=0 이 정면·화면 아래쪽)
            const sx = Math.sin(theta) * RX;
            const sy = RING_Y - Math.cos(theta) * RY;
            const sz = (Math.cos(theta) - 1) * RZ;
            const depth = (Math.cos(theta) + 1) / 2;
            const transform = isFront
              ? `translate3d(0px, ${wide ? -74 : -58}px, 250px) rotateX(0deg) scale(1)`
              : `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, ${sz.toFixed(1)}px) rotateX(48deg) rotateZ(${(Math.sin(theta) * -7).toFixed(1)}deg) scale(0.42)`;
            const animating = animAll || morphs.includes(i);
            return (
              <div
                key={i}
                className={`hubc-card ${slot.kind === 'ghost' ? 'is-ghost' : ''} ${
                  isFront ? 'is-front' : ''
                } ${animating ? 'is-morph' : ''}`}
                style={{
                  transform,
                  opacity: isFront ? 1 : 0.5 + 0.5 * depth,
                  filter: isFront
                    ? 'none'
                    : `brightness(${(0.55 + 0.4 * depth).toFixed(3)}) saturate(0.85)`,
                  ['--lit' as string]: (isFront ? 1 : depth * 0.7).toFixed(3),
                  ['--lx' as string]: `${(50 - Math.sin(theta) * 45).toFixed(1)}%`,
                  zIndex: isFront ? 40 : 10 + Math.round(depth * 20),
                }}
                role="option"
                aria-selected={isFront}
                onClick={() => {
                  if (!isFront && !dragging.current?.moved) snapTo(i);
                }}
              >
                <span className="hubc-tick hubc-tick-tl" aria-hidden />
                <span className="hubc-tick hubc-tick-tr" aria-hidden />
                <span className="hubc-tick hubc-tick-bl" aria-hidden />
                <span className="hubc-tick hubc-tick-br" aria-hidden />

                {/* 카드 뒷면 — 원탁 위에서 보이는 문양 */}
                <div className="hubc-back" aria-hidden={isFront}>
                  <span className={`${mono.className} hubc-back-no`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="hubc-back-emblem">✦</span>
                  <span className="hubc-back-title">
                    {slot.kind === 'section' ? slot.sec.title : 'RESERVED'}
                  </span>
                  <span className={`${mono.className} hubc-back-brand`}>ECOREAN</span>
                </div>

                {/* 카드 앞면 — 뽑혔을 때만 */}
                <div className="hubc-face" aria-hidden={!isFront}>
                  {slot.kind === 'ghost' ? (
                    <div className="hubc-ghost-body">
                      <span className={`${mono.className} hubc-card-no`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`${mono.className} hubc-ghost-label`}>RESERVED</span>
                      <span className="hubc-ghost-desc">확장 슬롯 · 대기 중</span>
                    </div>
                  ) : (
                    <>
                      <div className="hubc-card-head">
                        <span className={`${mono.className} hubc-card-no`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="hubc-card-title">{slot.sec.title}</span>
                        <span className={`${mono.className} hubc-card-desc`}>{slot.sec.desc}</span>
                      </div>
                      <div className="hubc-card-body">
                        <ul className="hubc-list">
                          {slot.sec.items
                            .filter((it) => !it.admin)
                            .map((item) => (
                              <li key={item.href}>
                                <a href={item.href} className="hubc-item" tabIndex={isFront ? 0 : -1}>
                                  <span className="hubc-item-name">{item.name}</span>
                                  <span className="hubc-item-desc">{item.desc}</span>
                                </a>
                              </li>
                            ))}
                          {slot.sec.items
                            .filter((it) => it.admin)
                            .map((item) => (
                              <li key={item.href}>
                                <a
                                  href={item.href}
                                  className="hubc-item is-admin"
                                  tabIndex={isFront ? 0 : -1}
                                >
                                  <span className="hubc-item-name">{item.name}</span>
                                  <span className="hubc-item-desc">{item.desc}</span>
                                  <span className={`${mono.className} hubc-item-tag`}>ADMIN</span>
                                </a>
                              </li>
                            ))}
                        </ul>
                      </div>
                      <div className={`${mono.className} hubc-card-foot`}>
                        {slot.sec.items.length} MODULES · AUTHORIZED
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="hubc-hud">
        <button type="button" className="hubc-arrow" onClick={() => snapTo(featured - 1)} aria-label="이전 섹션">
          ◀
        </button>
        <div className="hubc-status">
          <span className={`${mono.className} hubc-sector`}>
            SECTOR {String(featured + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <div className="hubc-dots" aria-hidden>
            {slots.map((slot, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                className={`hubc-dot ${slot.kind === 'ghost' ? 'is-ghost' : ''} ${i === featured ? 'is-on' : ''}`}
                onClick={() => snapTo(i)}
              />
            ))}
          </div>
          <span className="hubc-status-title">
            {featuredSlot.kind === 'section' ? featuredSlot.sec.title : '예비 슬롯'}
          </span>
        </div>
        <button type="button" className="hubc-arrow" onClick={() => snapTo(featured + 1)} aria-label="다음 섹션">
          ▶
        </button>
      </div>
    </div>
  );
}
