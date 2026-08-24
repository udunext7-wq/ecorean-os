'use client';

// 업무 허브 — 오비탈 셀렉터 (대표 지시 2026-08-24)
// 중앙 ECOREAN 코어 주위를 섹션 노드가 천천히 공전. 노드 클릭 → 아래 패널에 모듈 목록(1클릭 진입).
// 호버 시 공전 정지, 선택 섹션은 브라우저에 저장, 모션 최소화 환경은 자동 정지.
import { useEffect, useState } from 'react';
import { Cinzel } from 'next/font/google';

const cinzel = Cinzel({ subsets: ['latin'], weight: ['500'], display: 'swap' });

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

const SEL_KEY = 'ecorean.hubOrbit.section';

function ItemRow({ item }: { item: TreeItem }) {
  return (
    <li>
      <a
        href={item.href}
        className="flex flex-wrap items-baseline gap-x-3 rounded-md px-2 py-1.5 transition-colors hover:bg-panel2"
      >
        <span className="font-medium text-cream">{item.name}</span>
        <span className="text-xs text-muted">{item.desc}</span>
      </a>
    </li>
  );
}

export function HubOrbit({ sections }: { sections: TreeSection[] }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEL_KEY);
      const idx = sections.findIndex((s) => s.title === saved);
      if (idx >= 0) setSelected(idx);
    } catch {
      /* no-op */
    }
    // sections 는 역할별로 고정 — 최초 1회만 복원
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(idx: number) {
    setSelected(idx);
    try {
      localStorage.setItem(SEL_KEY, sections[idx].title);
    } catch {
      /* no-op */
    }
  }

  const current = sections[selected] ?? sections[0];
  const staffItems = current.items.filter((i) => !i.admin);
  const adminItems = current.items.filter((i) => i.admin);
  const step = 360 / sections.length;

  return (
    <div>
      {/* ── 궤도 ── */}
      <div className="hub-orbit-wrap" role="tablist" aria-label="업무 섹션">
        <div className="hub-orbit-ring" aria-hidden />
        <div className="hub-orbit-ring hub-orbit-ring-inner" aria-hidden />
        <div className="hub-core" aria-hidden>
          <span className="hub-core-star">✦</span>
          <span className={`${cinzel.className} hub-core-name`}>ECOREAN</span>
          <span className="hub-core-sub">WORK HUB</span>
        </div>
        <div className="hub-orbit">
          {sections.map((sec, i) => (
            <div key={sec.title} className="hub-node" style={{ ['--a' as string]: `${-90 + i * step}deg` }}>
              <div className="hub-node-anti">
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === selected}
                  onClick={() => select(i)}
                  className={`hub-node-btn ${i === selected ? 'is-selected' : ''}`}
                >
                  <span className="hub-node-dot" aria-hidden />
                  <span className="hub-node-label">{sec.title}</span>
                  <span className="hub-node-count">{sec.items.length}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 선택된 섹션 패널 ── */}
      <section key={current.title} className="hub-panel mt-2 rounded-xl border border-stroke bg-panel">
        <div className="flex items-baseline gap-3 border-b border-stroke px-5 py-3.5">
          <span className="font-semibold text-cream">{current.title}</span>
          <span className="text-xs text-faint">{current.desc}</span>
        </div>
        <div className="px-5 pb-4 pt-2">
          {staffItems.length > 0 ? (
            <ul className="ml-1.5 space-y-0.5 border-l-2 border-stroke pl-4">
              {staffItems.map((item) => (
                <ItemRow key={item.href} item={item} />
              ))}
            </ul>
          ) : null}
          {adminItems.length > 0 ? (
            <div className="ml-1.5 mt-3 border-l-2 border-brand-600 pl-4">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                관리 · admin 전용
              </p>
              <ul className="space-y-0.5">
                {adminItems.map((item) => (
                  <ItemRow key={item.href} item={item} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
