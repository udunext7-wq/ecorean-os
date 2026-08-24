'use client';

// 업무 허브 v7 — 5장 펼쳐 세운 3D 팬 스프레드 (대표 지시 2026-08-25)
// 회전 없음. 카드 5장(섹션 4 + 예비 1)이 완만한 호를 그리며 서 있고,
// 마우스 시차 + 호버 시 카드가 정면으로 일어서며 앞으로 나오는 3D 효과만 준다.
import { useRef, type PointerEvent } from 'react';
import { Cinzel, JetBrains_Mono } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['400'], display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400'], display: 'swap' });

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

type Slot = { kind: 'section'; sec: TreeSection } | { kind: 'ghost' };

// 중앙(2번)에 첫 섹션(일상 업무), 안쪽 → 바깥쪽 순으로 배치
const POS_ORDER = [2, 1, 3, 0, 4];

export function HubFan({ sections }: { sections: TreeSection[] }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const raf = useRef(0);

  const slots: Slot[] = Array.from({ length: 5 }, () => ({ kind: 'ghost' as const }));
  sections.slice(0, 5).forEach((sec, k) => {
    slots[POS_ORDER[k]] = { kind: 'section', sec };
  });

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return;
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--prx', `${((x - 0.5) * 6).toFixed(2)}deg`);
      el.style.setProperty('--pry', `${((y - 0.5) * -4).toFixed(2)}deg`);
    });
  }
  function onLeave() {
    cancelAnimationFrame(raf.current);
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty('--prx', '0deg');
    el.style.setProperty('--pry', '0deg');
  }

  return (
    <div className="hubc">
      <header className="hubc-head">
        <div className="hubc-hairline" aria-hidden />
        <p className={`${cinzel.className} hubc-brand`}>ECOREAN</p>
        <p className={`${mono.className} hubc-sub`}>WORK HUB · OPERATION DECK</p>
      </header>

      <div ref={stageRef} className="hubf-stage" onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="hubc-spot" aria-hidden />
        <div className="hubc-glowpool" aria-hidden />
        <div className="hubf-fan">
          {slots.map((slot, i) => (
            <div key={i} className={`hubf-slot hubf-s${i}`}>
              <div className={`hubf-card ${slot.kind === 'ghost' ? 'is-ghost' : ''}`}>
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
                              <a href={item.href} className="hubc-item">
                                <span className="hubc-item-name">{item.name}</span>
                                <span className="hubc-item-desc">{item.desc}</span>
                              </a>
                            </li>
                          ))}
                        {slot.sec.items
                          .filter((it) => it.admin)
                          .map((item) => (
                            <li key={item.href}>
                              <a href={item.href} className="hubc-item is-admin">
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
          ))}
        </div>
      </div>
    </div>
  );
}
