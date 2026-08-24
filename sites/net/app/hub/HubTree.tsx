'use client';

// 직원 포털 홈 — 토글 트리 (대표 지시 2026-08-24: 대부분의 업무를 포털 홈에서 진입)
// 섹션별 접기/펼치기 상태는 localStorage 에 저장되어 다음 방문에도 유지된다.
import { useEffect, useState } from 'react';

export type TreeItem = { href: string; name: string; desc: string; admin?: boolean };
export type TreeSection = { title: string; desc: string; items: TreeItem[] };

const OPEN_KEY = 'ecorean.hubTree.open';

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

export function HubTree({ sections }: { sections: TreeSection[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(OPEN_KEY);
      if (saved) setOpen(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      /* no-op */
    }
  }, []);

  function toggle(title: string) {
    setOpen((prev) => {
      const next = { ...prev, [title]: !(prev[title] ?? true) };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* no-op */
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {sections.map((sec) => {
        const isOpen = open[sec.title] ?? true;
        const staffItems = sec.items.filter((i) => !i.admin);
        const adminItems = sec.items.filter((i) => i.admin);
        return (
          <section key={sec.title} className="rounded-xl border border-stroke bg-panel">
            <button
              type="button"
              onClick={() => toggle(sec.title)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 rounded-xl px-5 py-3.5 text-left transition-colors hover:bg-panel2"
            >
              <span
                className={`text-[10px] text-brand-600 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                aria-hidden
              >
                ▶
              </span>
              <span className="font-semibold text-cream">{sec.title}</span>
              <span className="hidden text-xs text-faint sm:inline">{sec.desc}</span>
              <span className="ml-auto text-xs tabular-nums text-faint">{sec.items.length}</span>
            </button>
            {isOpen ? (
              <div className="border-t border-stroke px-5 pb-4 pt-2">
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
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
