'use client';

// 업무 허브 v4 — 4장 전체가 보이는 3D 빌보드 카루셀 (대표 지시 2026-08-24)
// 카드 4장이 원형 궤도를 돌며 항상 정면을 향한다(빌보드). 대기 시 연속 회전 쇼케이스,
// 드래그·화살표·점·키보드로 제어. 깊이에 따라 크기·밝기·높이가 달라져 입체감을 만든다.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Cinzel, JetBrains_Mono } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400'], display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

const SEL_KEY = 'ecorean.hubCarousel.section';
const IDLE_DEG_PER_SEC = 9; // 대기 회전 속도

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

export function HubCarousel({ sections }: { sections: TreeSection[] }) {
  const n = sections.length;
  const step = 360 / n;
  const [rot, setRot] = useState(0);
  const [radius, setRadius] = useState(340);
  const [snapping, setSnapping] = useState(false);
  const idle = useRef(true);
  const paused = useRef(false);
  const raf = useRef(0);
  const rotRef = useRef(0);
  const dragging = useRef<{ x: number; rot0: number; moved: boolean } | null>(null);
  rotRef.current = rot;

  // 반응형 반경
  useEffect(() => {
    function measure() {
      setRadius(window.innerWidth < 640 ? 205 : 340);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // 저장된 섹션 복원 → 대기 회전 없이 그 카드가 정면
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

  // 대기 연속 회전 (모션 최소화 환경 제외, 호버 시 일시정지)
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

  function snapTo(i: number) {
    idle.current = false;
    const r = rotRef.current;
    const delta = mod(-i * step - r + 180, 360) - 180;
    setSnapping(true);
    setRot(r + delta);
    try {
      localStorage.setItem(SEL_KEY, sections[mod(i, n)].title);
    } catch {
      /* no-op */
    }
    window.setTimeout(() => setSnapping(false), 750);
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
        <div className="hubc-floor" aria-hidden />
        <div className="hubc-ring3d">
          {sections.map((sec, i) => {
            const theta = ((i * step + rot) * Math.PI) / 180;
            const depth = (Math.cos(theta) + 1) / 2; // 1 = 정면, 0 = 뒤
            const x = Math.sin(theta) * radius;
            const z = (Math.cos(theta) - 1) * radius;
            const y = (1 - depth) * -34;
            const scale = 0.58 + 0.42 * depth;
            const isFront = i === nearest;
            const staffItems = sec.items.filter((it) => !it.admin);
            const adminItems = sec.items.filter((it) => it.admin);
            return (
              <div
                key={sec.title}
                className={`hubc-card ${isFront ? 'is-front' : ''} ${snapping ? 'is-snap' : ''}`}
                style={{
                  transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) scale(${scale.toFixed(3)})`,
                  opacity: 0.55 + 0.45 * depth,
                  filter: `brightness(${(0.55 + 0.45 * depth).toFixed(3)}) saturate(${(0.8 + 0.2 * depth).toFixed(3)})`,
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

      <div className="hubc-hud">
        <button type="button" className="hubc-arrow" onClick={() => snapTo(nearest - 1)} aria-label="이전 섹션">
          ◀
        </button>
        <div className="hubc-status">
          <span className={`${mono.className} hubc-sector`}>
            SECTOR {String(nearest + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
          <div className="hubc-dots" aria-hidden>
            {sections.map((s, i) => (
              <button
                key={s.title}
                type="button"
                tabIndex={-1}
                className={`hubc-dot ${i === nearest ? 'is-on' : ''}`}
                onClick={() => snapTo(i)}
              />
            ))}
          </div>
          <span className="hubc-status-title">{sections[nearest].title}</span>
        </div>
        <button type="button" className="hubc-arrow" onClick={() => snapTo(nearest + 1)} aria-label="다음 섹션">
          ▶
        </button>
      </div>
    </div>
  );
}
