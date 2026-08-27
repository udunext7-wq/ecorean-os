'use client';

// AI 스튜디오 — 온톨로지 3D 민들레 뷰어 v2 (대표 지시 2026-08-27)
// 공정 262개를 구면(피보나치)에 배치하고 중심에서 줄기가 뻗는 민들레. 색 = 시공 단계 9종.
// 드래그 자유 회전 · 대기 자전 · 커서 근접 글로우. 간선 = 자동연계/선행/대체 규칙. 조회 전용.
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Noto_Sans_KR } from 'next/font/google';
import { StudioNav } from '../StudioNav';
import { OntologyPanel, chainFrom, type Rule as PanelRule } from './OntologyPanel';
import data from './rules.json';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Rule = {
  triggerProcess: string;
  relationshipType: string;
  autoLinkProcess: string;
  condition: string;
  quantityCalc: string;
  note: string;
  phase?: number;
};
type Phase = { id: number; name: string; category: string };
type Process = { name: string; phase: number };

const REL_COLOR: Record<string, string> = {
  필수: '#E8C99B',
  권장: '#7FD3E6',
  선택: '#86efac',
  제안: '#c4b5fd',
  조건: '#F2A05C',
  선행: '#9BB8FF',
  대체: '#F58FA8',
};

// 시공 순서를 색 스펙트럼으로 (차가운 초기 단계 → 따뜻한 마감 단계)
const PHASE_COLOR: Record<number, string> = {
  0: '#9BC9D8',
  1: '#9BB8FF',
  2: '#8FA3B8',
  3: '#5BC8FF',
  4: '#4FE3D0',
  5: '#7FE39B',
  6: '#C9E36B',
  7: '#F2C35C',
  8: '#F2A05C',
  9: '#F58FA8',
};

const SIZE = 760;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 250;
const FOV = 1000;
const PROX = 120; // 근접 글로우 반경

export default function OntologyPage() {
  const rules = (data as { rules: Rule[] }).rules;
  const meta = (
    data as { _meta: { version: string; totalCount: number; processCount: number; status: string } }
  )._meta;
  const phases = (data as { phases?: Phase[] }).phases ?? [];
  const processes = (data as { processes?: Process[] }).processes ?? [];

  const [focus, setFocus] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [rot, setRot] = useState({ yaw: 0.6, pitch: -0.35 });
  const [ptr, setPtr] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef<{ x: number; y: number; yaw0: number; pitch0: number } | null>(null);
  const hovering = useRef(false);
  const raf = useRef(0);
  const ptrRaf = useRef(0);
  const rotRef = useRef(rot);
  rotRef.current = rot;

  // 암호 게이트 — portal.html(ACCESS PORTAL) 통과자만 열람
  const [gate, setGate] = useState<'checking' | 'open'>('checking');
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('granted') === '1') {
        sessionStorage.setItem('ecorean.ontologyGate', '1');
        window.history.replaceState({}, '', '/studio/ontology');
        setGate('open');
        return;
      }
      if (sessionStorage.getItem('ecorean.ontologyGate') === '1') {
        setGate('open');
        return;
      }
    } catch {
      /* no-op */
    }
    window.location.href = '/portal.html?next=' + encodeURIComponent('/studio/ontology?granted=1');
  }, []);

  // 대기 자전
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!dragging.current && !hovering.current) setRot((r) => ({ ...r, yaw: r.yaw + dt * 0.16 }));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const phaseOf = useMemo(() => {
    const m: Record<string, number> = {};
    processes.forEach((p) => {
      m[p.name] = p.phase;
    });
    return m;
  }, [processes]);

  // 구면 좌표 (피보나치 분포)
  const seeds = useMemo(() => {
    const names = [...new Set(rules.flatMap((r) => [r.triggerProcess, r.autoLinkProcess]))];
    const GA = Math.PI * (3 - Math.sqrt(5));
    return names.map((name, i) => {
      const y = 1 - (2 * (i + 0.5)) / names.length;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * GA;
      return { name, p: [rr * Math.cos(th) * RADIUS, y * RADIUS, rr * Math.sin(th) * RADIUS] as const };
    });
  }, [rules]);

  const projected = useMemo(() => {
    const { yaw, pitch } = rot;
    const cy1 = Math.cos(yaw);
    const sy1 = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const m: Record<string, { x: number; y: number; z: number; s: number }> = {};
    seeds.forEach(({ name, p }) => {
      const [x0, y0, z0] = p;
      const x1 = x0 * cy1 + z0 * sy1;
      const z1 = -x0 * sy1 + z0 * cy1;
      const y2 = y0 * cp - z1 * sp;
      const z2 = y0 * sp + z1 * cp;
      const s = FOV / (FOV - z2);
      m[name] = { x: CX + x1 * s, y: CY + y2 * s, z: z2, s };
    });
    return m;
  }, [seeds, rot]);

  const visible = rules.filter(
    (r) =>
      (!typeFilter || r.relationshipType === typeFilter) &&
      (!phaseFilter ||
        phaseOf[r.triggerProcess] === phaseFilter ||
        phaseOf[r.autoLinkProcess] === phaseFilter) &&
      (!focus || r.triggerProcess === focus || r.autoLinkProcess === focus) &&
      (!q.trim() ||
        r.triggerProcess.includes(q.trim()) ||
        r.autoLinkProcess.includes(q.trim()) ||
        r.note.includes(q.trim())),
  );
  const activeNames = new Set(visible.flatMap((r) => [r.triggerProcess, r.autoLinkProcess]));

  // 무결성 점검
  const audit = useMemo(() => {
    const names = [...new Set(rules.flatMap((r) => [r.triggerProcess, r.autoLinkProcess]))];
    const cycles = names.filter((n) => chainFrom(rules as PanelRule[], n, 5).some((c) => c.name === n));
    const triggers = new Set(rules.map((r) => r.triggerProcess));
    const byType: Record<string, number> = {};
    rules.forEach((r) => {
      byType[r.relationshipType] = (byType[r.relationshipType] ?? 0) + 1;
    });
    return { nodes: names.length, cycles, leaves: names.filter((n) => !triggers.has(n)).length, byType };
  }, [rules]);

  function exportCsv() {
    const head = ['트리거 공정', '관계유형', '자동연계 공정', '조건', '수량계산', '비고', '단계'];
    const rows = [
      head,
      ...rules.map((r) => [
        r.triggerProcess,
        r.relationshipType,
        r.autoLinkProcess,
        r.condition,
        r.quantityCalc,
        r.note,
        String(phaseOf[r.triggerProcess] ?? ''),
      ]),
    ];
    const csv =
      '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ECOREAN_공정온톨로지_v${meta.version}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const seedOrder = [...seeds].sort((a, b) => projected[a.name].z - projected[b.name].z);

  function onDown(e: PointerEvent<SVGSVGElement>) {
    dragging.current = {
      x: e.clientX,
      y: e.clientY,
      yaw0: rotRef.current.yaw,
      pitch0: rotRef.current.pitch,
    };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const scale = SIZE / (rect.width || SIZE);
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    if (!ptrRaf.current) {
      ptrRaf.current = requestAnimationFrame(() => {
        ptrRaf.current = 0;
        setPtr({ x: px, y: py });
      });
    }
    const d = dragging.current;
    if (!d) return;
    setRot({
      yaw: d.yaw0 + (e.clientX - d.x) * 0.008,
      pitch: Math.max(-1.2, Math.min(1.2, d.pitch0 + (e.clientY - d.y) * 0.008)),
    });
  }
  function onUp() {
    dragging.current = null;
  }

  if (gate !== 'open') {
    return (
      <main className={`${noto.className} flex min-h-screen items-center justify-center bg-[#04070c]`}>
        <p className="text-xs tracking-[0.4em] text-[#9BC9D8]/70">ACCESS PORTAL 연결 중…</p>
      </main>
    );
  }

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-7xl">
        <StudioNav />
        <header className="mb-6 border-b border-[#9BC9D8]/15 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#f0deb9]">AI 스튜디오 · 온톨로지</h1>
          <p className="mt-1 text-sm text-[#94aab8]">
            공정 {meta.processCount ?? audit.nodes}개 · 연계 규칙 {meta.totalCount}건 (v{meta.version}) —
            견적·발주가 따르는 시스템의 헌법입니다. 씨앗 색은 시공 단계이며, 클릭하면 그 공정의
            연쇄·단가가 열립니다.
          </p>
          {meta.status ? <p className="mt-1 text-[11px] text-[#F2A05C]/80">{meta.status}</p> : null}

          {/* 단계 필터 */}
          {phases.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setPhaseFilter(null)}
                className={`rounded-full border px-3 py-1 ${!phaseFilter ? 'border-[#f0deb9]/60 text-[#f0deb9]' : 'border-[#9BC9D8]/25 text-[#94aab8]'}`}
              >
                전 단계
              </button>
              {phases.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhaseFilter((v) => (v === p.id ? null : p.id))}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${phaseFilter === p.id ? 'border-current' : 'border-[#9BC9D8]/20'}`}
                  style={{ color: phaseFilter === p.id ? PHASE_COLOR[p.id] : '#94aab8' }}
                  title={p.category}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: PHASE_COLOR[p.id] }}
                  />
                  {p.id}. {p.name}
                </button>
              ))}
            </div>
          ) : null}

          {/* 관계 유형 + 검색 */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              className={`rounded-full border px-3 py-1 ${!typeFilter ? 'border-[#f0deb9]/60 text-[#f0deb9]' : 'border-[#9BC9D8]/25 text-[#94aab8]'}`}
            >
              전체 관계
            </button>
            {Object.entries(REL_COLOR).map(([t, c]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter((v) => (v === t ? null : t))}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${typeFilter === t ? 'border-current' : 'border-[#9BC9D8]/20'}`}
                style={{ color: typeFilter === t ? c : '#94aab8' }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
                {t} {audit.byType[t] ?? 0}
              </button>
            ))}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="공정 검색 (예: 타일, 방수)"
              className="w-44 rounded-full border border-[#9BC9D8]/25 bg-[#0b111a] px-3.5 py-1 outline-none focus:border-[#9BC9D8]/60"
            />
            {focus ? (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="rounded-full border border-[#E5726A]/40 px-3 py-1 text-[#E5726A]"
              >
                포커스 해제 ×
              </button>
            ) : null}
            <button
              type="button"
              onClick={exportCsv}
              className="ml-auto rounded-full border border-[#9BC9D8]/25 px-3 py-1 text-[#94aab8] hover:text-[#c8e4ee]"
            >
              규칙 CSV
            </button>
          </div>

          {/* 무결성 점검 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/60 px-4 py-2 text-[11px] text-[#94aab8]">
            <span>
              공정 <b className="text-[#c8e4ee]">{audit.nodes}</b>
            </span>
            <span>
              규칙 <b className="text-[#c8e4ee]">{rules.length}</b>
            </span>
            <span>
              표시 중 <b className="text-[#c8e4ee]">{visible.length}</b>
            </span>
            <span>
              종단 공정 <b className="text-[#c8e4ee]">{audit.leaves}</b>
            </span>
            <span className={audit.cycles.length ? 'text-[#E5726A]' : 'text-[#86efac]'}>
              순환 연계 {audit.cycles.length ? `${audit.cycles.length}건 — 검토 필요` : '없음 ✓'}
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div
            className="onto-stage overflow-hidden rounded-xl border border-[#9BC9D8]/15"
            onMouseEnter={() => {
              hovering.current = true;
            }}
            onMouseLeave={() => {
              hovering.current = false;
              setPtr(null);
            }}
          >
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="mx-auto block max-w-[760px] cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <defs>
                {Object.entries(PHASE_COLOR).map(([id, c]) => (
                  <radialGradient key={`o${id}`} id={`orb${id}`} cx="35%" cy="30%" r="75%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
                    <stop offset="38%" stopColor={c} />
                    <stop offset="78%" stopColor={c} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.12} />
                  </radialGradient>
                ))}
                {Object.entries(PHASE_COLOR).map(([id, c]) => (
                  <radialGradient key={`g${id}`} id={`glow${id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={c} stopOpacity={0.5} />
                    <stop offset="60%" stopColor={c} stopOpacity={0.14} />
                    <stop offset="100%" stopColor={c} stopOpacity={0} />
                  </radialGradient>
                ))}
                <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(80,180,255,0)" />
                  <stop offset="45%" stopColor="rgba(120,200,255,0.3)" />
                  <stop offset="55%" stopColor="rgba(160,220,255,0.42)" />
                  <stop offset="100%" stopColor="rgba(80,180,255,0)" />
                </linearGradient>
              </defs>

              <rect x={CX - 2.5} y={CY - RADIUS * 1.25} width={5} height={RADIUS * 2.5} fill="url(#beam)" />
              <circle cx={CX} cy={CY} r={RADIUS * 1.02} fill="none" stroke="rgba(155,201,216,0.06)" />

              {/* 연계선 */}
              {visible
                .map((r, i) => ({
                  r,
                  i,
                  za: (projected[r.triggerProcess]?.z ?? 0) + (projected[r.autoLinkProcess]?.z ?? 0),
                }))
                .sort((a, b) => a.za - b.za)
                .map(({ r, i }) => {
                  const a = projected[r.triggerProcess];
                  const b = projected[r.autoLinkProcess];
                  if (!a || !b) return null;
                  const depth = ((a.z + b.z) / 2 + RADIUS) / (2 * RADIUS);
                  const near = ptr
                    ? Math.max(
                        0,
                        1 -
                          Math.min(
                            Math.hypot(a.x - ptr.x, a.y - ptr.y),
                            Math.hypot(b.x - ptr.x, b.y - ptr.y),
                          ) /
                            PROX,
                      )
                    : 0;
                  const lit = focus ? 1 : near;
                  return (
                    <line
                      key={`e${i}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={REL_COLOR[r.relationshipType] ?? '#9BC9D8'}
                      strokeWidth={0.5 + depth * 0.4 + lit * 0.9}
                      opacity={0.04 + depth * 0.1 + lit * 0.45}
                    />
                  );
                })}

              {/* 씨앗 */}
              {seedOrder.map(({ name }) => {
                const pt = projected[name];
                const depth = (pt.z + RADIUS) / (2 * RADIUS);
                const dimmed = !activeNames.has(name);
                const isFocus = focus === name;
                const near = ptr ? Math.max(0, 1 - Math.hypot(pt.x - ptr.x, pt.y - ptr.y) / PROX) : 0;
                const showLabel = isFocus || (!dimmed && (near > 0.55 || depth > 0.93));
                const ph = phaseOf[name] ?? 0;
                const R0 = (isFocus ? 9 : 3.6 + depth * 3.4) * pt.s * (1 + near * 0.3);
                const k = R0 / 8;
                return (
                  <g
                    key={name}
                    opacity={dimmed ? 0.08 : 0.2 + depth * 0.34 + near * 0.46}
                    className="cursor-pointer"
                    onClick={() => setFocus((v) => (v === name ? null : name))}
                  >
                    <line
                      x1={CX}
                      y1={CY}
                      x2={pt.x}
                      y2={pt.y}
                      stroke={PHASE_COLOR[ph] ?? PHASE_COLOR[0]}
                      strokeWidth={0.3 + depth * 0.4 + near * 0.5}
                      opacity={0.05 + near * 0.2}
                    />
                    <g transform={`translate(${pt.x} ${pt.y}) scale(${k})`}>
                      <circle r={14 + near * 22} fill={`url(#glow${ph})`} opacity={0.4 + near * 0.6} />
                      <circle r={8} fill={`url(#orb${ph})`} />
                      <ellipse
                        rx={8}
                        ry={2.8}
                        fill="none"
                        stroke="#ffffff"
                        strokeOpacity={0.5}
                        strokeWidth={0.45}
                      />
                      <ellipse
                        rx={2.8}
                        ry={8}
                        fill="none"
                        stroke="#ffffff"
                        strokeOpacity={0.32}
                        strokeWidth={0.4}
                      />
                      <circle
                        r={8}
                        fill="none"
                        stroke="#ffffff"
                        strokeOpacity={0.25 + near * 0.6}
                        strokeWidth={0.5 + near * 0.5}
                      />
                      <circle cx={-2.6} cy={-2.8} r={1.4} fill="#ffffff" opacity={0.85} />
                    </g>
                    {showLabel ? (
                      <text
                        x={pt.x}
                        y={pt.y - 9 * pt.s - R0}
                        fontSize={8.5 + depth * 3}
                        textAnchor="middle"
                        fill={isFocus ? '#f0deb9' : '#dbe8ef'}
                        stroke="#04070c"
                        strokeWidth={3}
                        paintOrder="stroke"
                      >
                        {name}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {/* 중심 코어 */}
              <circle cx={CX} cy={CY} r={44} fill="url(#glow3)" />
              <ellipse
                cx={CX}
                cy={CY}
                rx={46}
                ry={11}
                fill="none"
                stroke="rgba(240,190,90,0.5)"
                strokeWidth={1}
                transform={`rotate(-12 ${CX} ${CY})`}
              />
              <ellipse
                cx={CX}
                cy={CY}
                rx={56}
                ry={14}
                fill="none"
                stroke="rgba(120,200,255,0.25)"
                strokeWidth={0.8}
                transform={`rotate(-12 ${CX} ${CY})`}
              />
              <circle cx={CX} cy={CY} r={17} fill="url(#orb3)" />
              <ellipse
                cx={CX}
                cy={CY}
                rx={17}
                ry={6}
                fill="none"
                stroke="rgba(180,230,255,0.6)"
                strokeWidth={0.7}
              />
              <ellipse
                cx={CX}
                cy={CY}
                rx={6}
                ry={17}
                fill="none"
                stroke="rgba(180,230,255,0.45)"
                strokeWidth={0.6}
              />
              <circle cx={CX - 5.5} cy={CY - 6} r={2.6} fill="rgba(255,255,255,0.9)" />
              <text
                x={CX}
                y={CY + 42}
                fontSize={10}
                textAnchor="middle"
                fill="rgba(232,201,155,0.55)"
                letterSpacing={4}
              >
                ONTOLOGY
              </text>
            </svg>
          </div>

          {/* 우측: 포커스 시 공정 상세, 아니면 규칙 목록 */}
          <div className="max-h-[80vh] space-y-2 overflow-y-auto pr-1">
            {focus ? (
              <>
                <div className="mb-1 flex items-center gap-2 text-[11px]">
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{
                      background: `${PHASE_COLOR[phaseOf[focus] ?? 0]}22`,
                      color: PHASE_COLOR[phaseOf[focus] ?? 0],
                    }}
                  >
                    {phases.find((p) => p.id === (phaseOf[focus] ?? 0))?.name ?? '공통'} 단계
                  </span>
                </div>
                <OntologyPanel
                  name={focus}
                  rules={rules as PanelRule[]}
                  relColor={REL_COLOR}
                  onPick={(n) => setFocus(n)}
                />
              </>
            ) : (
              <>
                <p className="text-[10px] tracking-[0.25em] text-[#9BC9D8]/60">
                  규칙 {visible.length} / {rules.length}
                </p>
                {visible.map((r, i) => (
                  <div key={i} className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/80 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFocus(r.triggerProcess)}
                        className="font-medium text-[#ebf1f5] hover:underline"
                      >
                        {r.triggerProcess}
                      </button>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: `${REL_COLOR[r.relationshipType]}22`,
                          color: REL_COLOR[r.relationshipType],
                        }}
                      >
                        {r.relationshipType}
                      </span>
                      <span className="text-[#94aab8]">→</span>
                      <button
                        type="button"
                        onClick={() => setFocus(r.autoLinkProcess)}
                        className="font-medium text-[#e8c99b] hover:underline"
                      >
                        {r.autoLinkProcess}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-[#94aab8]">
                      조건 {r.condition} · 수량 {r.quantityCalc}
                      {r.note ? ` · ${r.note}` : ''}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
