'use client';

// 업무 허브 v5 — 5슬롯 3D 빌보드 카루셀 + 카드 드로우 연출 (대표 지시 2026-08-24)
// 5개 슬롯(섹션 4 + 예비 1)이 원궤도를 공전. 정면에 가까워진 카드는 덱에서 뽑히듯
// 앞으로 튀어나오며 스포트라이트를 받는다. 조명: 상단 빔·바닥 글로우 풀·림라이트·부유 입자.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Cinzel, JetBrains_Mono } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400'], display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

type Slot = { kind: 'section'; sec: TreeSection } | { kind: 'ghost' };

const SEL_KEY = 'ecorean.hubCarousel.section';
const IDLE_DEG_PER_SEC = 8;
const MOTES = [
  { left: '12%', top: '58%', delay: '0s', dur: '13s' },
  { left: '24%', top: '72%', delay: '3s', dur: '16s' },
  { left: '41%', top: '64%', delay: '7s', dur: '12s' },
  { left: '58%', top: '76%', delay: '1.5s', dur: '15s' },
  { left: '72%', top: '60%', delay: '5s', dur: '14s' },
  { left: '86%', top: '70%', delay: '9s', dur: '17s' },
  { left: '33%', top: '82%', delay: '11s', dur: '13s' },
];

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

export function HubCarousel({ sections }: { sections: TreeSection[] }) {
  const slots: Slot[] = [...sections.map((sec) => ({ kind: 'section' as const, sec })), { kind: 'ghost' }];
  const n = slots.length;
  const step = 360 / n;
  const [rot, setRot] = useState(0);
  const [radius, setRadius] = useState(330);
  const [snapping, setSnapping] = useState(false);
  const idle = useRef(true);
  const paused = useRef(false);
  const raf = useRef(0);
  const rotRef = useRef(0);
  const dragging = useRef<{ x: number; rot0: number; moved: boolean } | null>(null);
  rotRef.current = rot;

  useEffect(() => {
    function measure() {
      setRadius(window.innerWidth < 640 ? 200 : 330);
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
        setRot(-i * step);
      }
    } catch {
      /* no-op */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대기 연속 회전 — 모션 최소화 환경 제외, 호버·드래그 시 정지
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

  const nearest = mod(Math.round(-rot / step), n);
  const nearestSlot = slots[nearest];

  function snapTo(i: number) {
    idle.current = false;
    const r = rotRef.current;
    const delta = mod(-i * step - r + 180, 360) - 180;
    setSnapping(true);
    setRot(r + delta);
    const slot = slots[mod(i, n)];
    try {
      localStorage.setItem(SEL_KEY, slot.kind === 'section' ? slot.sec.title : '__reserved');
    } catch {
      /* no-op */
    }
    window.setTimeout(() => setSnapping(false), 800);
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
    if (d.moved) setRot(d.rot0 + dx * 0.22);
  }
  function onPointerUp() {
    const d = dragging.current;
    dragging.current = null;
    if (d?.moved) snapTo(mod(Math.round(-rotRef.current / step), n));
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') snapTo(nearest + 1);
    if (e.key === 'ArrowLeft') snapTo(nearest - 1);
  }

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
            const depth = (Math.cos(theta) + 1) / 2; // 1 = 정면, 0 = 뒤
            // 카드 드로우: 정면 근접(depth>0.86)부터 덱에서 뽑히듯 전방·상승
            const pop = Math.max(0, (depth - 0.86) / 0.14);
            const x = Math.sin(theta) * radius;
            const z = (Math.cos(theta) - 1) * radius + pop * 84;
            const y = (1 - depth) * -46 - pop * 22;
            const scale = 0.52 + 0.48 * depth + pop * 0.05;
            const lit = depth;
            const lx = 50 - Math.sin(theta) * 45; // 정면 광원 기준 측면광 이동
            const isFront = i === nearest;
            return (
              <div
                key={i}
                className={`hubc-card ${slot.kind === 'ghost' ? 'is-ghost' : ''} ${
                  isFront ? 'is-front' : ''
                } ${snapping ? 'is-snap' : ''}`}
                style={{
                  transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) scale(${scale.toFixed(3)})`,
                  opacity: 0.42 + 0.58 * depth,
                  filter: `brightness(${(0.5 + 0.5 * depth + pop * 0.08).toFixed(3)}) saturate(${(0.8 + 0.2 * depth).toFixed(3)})`,
                  ['--lit' as string]: lit.toFixed(3),
                  ['--lx' as string]: `${lx.toFixed(1)}%`,
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
            );
          })}
        </div>
      </div>

      <div className="hubc-hud">
        <button type="button" className="hubc-arrow" onClick={() => snapTo(nearest - 1)} aria-label="이전 섹션">
          ◀
        </button>
        <div className="hubc-status">
          <span className={`${mono.className} hubc-sector`}>
            SECTOR {String(nearest + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <div className="hubc-dots" aria-hidden>
            {slots.map((slot, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                className={`hubc-dot ${slot.kind === 'ghost' ? 'is-ghost' : ''} ${i === nearest ? 'is-on' : ''}`}
                onClick={() => snapTo(i)}
              />
            ))}
          </div>
          <span className="hubc-status-title">
            {nearestSlot.kind === 'section' ? nearestSlot.sec.title : '예비 슬롯'}
          </span>
        </div>
        <button type="button" className="hubc-arrow" onClick={() => snapTo(nearest + 1)} aria-label="다음 섹션">
          ▶
        </button>
      </div>
    </div>
  );
}
