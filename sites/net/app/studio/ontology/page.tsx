'use client';

// AI 스튜디오 — 온톨로지 뷰어 (대표 지시 2026-08-26)
// 공정 자동연계 규칙(assets/data/ontology-rules.json — 시스템의 헌법)을 원형 그래프로 시각화.
// 노드 = 공정, 간선 = 자동연계(관계유형별 색). 조회 전용 — 편집은 헌법 절차(엔진 12)로만.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Noto_Sans_KR } from 'next/font/google';
import data from './rules.json';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Rule = {
  triggerProcess: string;
  relationshipType: string;
  autoLinkProcess: string;
  condition: string;
  quantityCalc: string;
  note: string;
};

const REL_COLOR: Record<string, string> = {
  필수: '#E8C99B',
  권장: '#7FD3E6',
  보완: '#86efac',
  조건: '#c4b5fd',
};

const SIZE = 720;
const R = 292;
const CX = SIZE / 2;
const CY = SIZE / 2;

export default function OntologyPage() {
  const rules = (data as { rules: Rule[] }).rules;
  const meta = (data as { _meta: { version: string; totalCount: number } })._meta;
  const [focus, setFocus] = useState<string | null>(null); // 공정 노드 포커스
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const names = [...new Set(rules.flatMap((r) => [r.triggerProcess, r.autoLinkProcess]))];
    return names.map((name, i) => {
      const a = (i / names.length) * Math.PI * 2 - Math.PI / 2;
      return { name, x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R, angle: a };
    });
  }, [rules]);
  const pos = useMemo(() => {
    const m: Record<string, { x: number; y: number; angle: number }> = {};
    nodes.forEach((n) => {
      m[n.name] = n;
    });
    return m;
  }, [nodes]);

  const visible = rules.filter(
    (r) =>
      (!typeFilter || r.relationshipType === typeFilter) &&
      (!focus || r.triggerProcess === focus || r.autoLinkProcess === focus),
  );
  const activeNames = new Set(visible.flatMap((r) => [r.triggerProcess, r.autoLinkProcess]));

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 border-b border-[#9BC9D8]/15 pb-5">
          <Link href="/hub" className="text-xs tracking-[0.3em] text-[#9BC9D8]/70 hover:text-[#c8e4ee]">
            ← WORK HUB
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0deb9]">
            AI 스튜디오 · 온톨로지
          </h1>
          <p className="mt-1 text-sm text-[#94aab8]">
            공정 자동연계 규칙 {meta.totalCount}건 (v{meta.version}) — 견적·발주가 따르는 시스템의
            헌법입니다. 조회 전용이며, 변경은 마스터 DB 승인 절차로만 이뤄집니다.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              className={`rounded-full border px-3 py-1 ${!typeFilter ? 'border-[#f0deb9]/60 text-[#f0deb9]' : 'border-[#9BC9D8]/25 text-[#94aab8]'}`}
            >
              전체
            </button>
            {Object.entries(REL_COLOR).map(([t, c]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter((v) => (v === t ? null : t))}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${typeFilter === t ? 'border-current' : 'border-[#9BC9D8]/25'}`}
                style={{ color: typeFilter === t ? c : '#94aab8' }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
                {t}
              </button>
            ))}
            {focus ? (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="rounded-full border border-[#E5726A]/40 px-3 py-1 text-[#E5726A]"
              >
                포커스 해제: {focus} ×
              </button>
            ) : null}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* 원형 그래프 */}
          <div className="overflow-x-auto rounded-xl border border-[#9BC9D8]/15 bg-[#070b12]/80 p-3">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block max-w-[720px]">
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(155,201,216,0.1)" strokeDasharray="3 6" />
              {visible.map((r, i) => {
                const a = pos[r.triggerProcess];
                const b = pos[r.autoLinkProcess];
                if (!a || !b) return null;
                return (
                  <path
                    key={i}
                    d={`M ${a.x} ${a.y} Q ${CX} ${CY} ${b.x} ${b.y}`}
                    fill="none"
                    stroke={REL_COLOR[r.relationshipType] ?? '#9BC9D8'}
                    strokeWidth={1.4}
                    opacity={0.65}
                  />
                );
              })}
              {nodes.map((n) => {
                const dim = !activeNames.has(n.name);
                const deg = (n.angle * 180) / Math.PI;
                const flip = deg > 90 || deg < -90;
                const lx = CX + Math.cos(n.angle) * (R + 12);
                const ly = CY + Math.sin(n.angle) * (R + 12);
                return (
                  <g key={n.name} opacity={dim ? 0.22 : 1} className="cursor-pointer" onClick={() => setFocus((v) => (v === n.name ? null : n.name))}>
                    <circle cx={n.x} cy={n.y} r={focus === n.name ? 6 : 4} fill={focus === n.name ? '#f0deb9' : '#9BC9D8'} />
                    <text
                      x={lx}
                      y={ly}
                      fontSize={10}
                      fill={focus === n.name ? '#f0deb9' : '#c3d4dd'}
                      textAnchor={flip ? 'end' : 'start'}
                      dominantBaseline="middle"
                      transform={`rotate(${flip ? deg + 180 : deg} ${lx} ${ly})`}
                    >
                      {n.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 규칙 목록 */}
          <div className="max-h-[76vh] space-y-2 overflow-y-auto pr-1">
            <p className="text-[10px] tracking-[0.25em] text-[#9BC9D8]/60">
              규칙 {visible.length} / {rules.length}
            </p>
            {visible.map((r, i) => (
              <div key={i} className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/80 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[#ebf1f5]">{r.triggerProcess}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${REL_COLOR[r.relationshipType]}22`, color: REL_COLOR[r.relationshipType] }}
                  >
                    {r.relationshipType}
                  </span>
                  <span className="text-[#94aab8]">→</span>
                  <span className="font-medium text-[#e8c99b]">{r.autoLinkProcess}</span>
                </div>
                <p className="mt-1.5 text-xs text-[#94aab8]">
                  조건 {r.condition} · 수량 {r.quantityCalc}
                  {r.note ? ` · ${r.note}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
