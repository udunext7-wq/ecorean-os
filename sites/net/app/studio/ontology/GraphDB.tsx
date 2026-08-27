'use client';

// 온톨로지 — 그래프 DB 모드 (대표 지시 2026-08-27)
// 73,185 엣지를 그대로 그릴 수 없으므로 대분류(40) → 중분류(227) → 공정(670) → 상세로 드릴다운한다.
// 각 계층은 서버에서 집約해 20KB 안팎만 내려받는다.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { createBrowserSupabase } from '@/core/db/browser';

export type GNode = {
  id: string;
  name: string;
  phase: number;
  processes?: number;
  materials?: number;
  avgDays?: number;
  totalDays?: number;
  days?: number;
  unit?: string | null;
  cost?: number;
};
type GEdge = { src: string; dst: string; rel: string; n: number };
type Level = { level: string; nodes: GNode[]; edges: GEdge[]; major?: string; middle?: string };

const PHASE_COLOR: Record<number, string> = {
  1: '#A5B4FF', 2: '#8FA3B8', 3: '#6FB3D6', 4: '#5BC8FF', 5: '#4FE0E3', 6: '#4FE3B8',
  7: '#7FE39B', 8: '#A9E37F', 9: '#C9E36B', 10: '#F2C35C', 11: '#F2A05C', 12: '#F58FA8',
};
const REL_COLOR: Record<string, string> = {
  필수: '#E8C99B', 권장: '#7FD3E6', 조건: '#F2A05C', 선행: '#9BB8FF',
  대체: '#F58FA8', 자재공유: '#6FB3D6', 매칭: '#86efac',
};

const SIZE = 980;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 340;
const FOV = 1350;
const PROX = 150;

export function GraphDB({ onDetail }: { onDetail: (id: string, name: string) => void }) {
  const [data, setData] = useState<Level | null>(null);
  const [trail, setTrail] = useState<{ major?: string; middle?: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rot, setRot] = useState({ yaw: 0.5, pitch: -0.3 });
  const [ptr, setPtr] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef<{ x: number; y: number; yaw0: number; pitch0: number } | null>(null);
  const hovering = useRef(false);
  const raf = useRef(0);
  const ptrRaf = useRef(0);
  const rotRef = useRef(rot);
  rotRef.current = rot;

  const load = useCallback(async (major?: string, middle?: string) => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const res = major
      ? await supabase.rpc('ontology_drill', { p_major: major, p_middle: middle ?? null })
      : await supabase.rpc('ontology_overview');
    setLoading(false);
    if (res.error) {
      setError(`그래프를 불러오지 못했습니다: ${res.error.message}`);
      return;
    }
    setData(res.data as Level);
    setTrail({ major, middle });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 대기 자전
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!dragging.current && !hovering.current) setRot((r) => ({ ...r, yaw: r.yaw + dt * 0.14 }));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  // 단계 밴드 배치
  const { yaw, pitch } = rot;
  const cy1 = Math.cos(yaw);
  const sy1 = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const project = (x0: number, y0: number, z0: number) => {
    const x1 = x0 * cy1 + z0 * sy1;
    const z1 = -x0 * sy1 + z0 * cy1;
    const y2 = y0 * cp - z1 * sp;
    const z2 = y0 * sp + z1 * cp;
    const sc = FOV / (FOV - z2);
    return { x: CX + x1 * sc, y: CY + y2 * sc, z: z2, s: sc };
  };
  const GA = Math.PI * (3 - Math.sqrt(5));
  const byPhase: Record<number, GNode[]> = {};
  nodes.forEach((n) => {
    (byPhase[n.phase] ??= []).push(n);
  });
  const pos: Record<string, { x: number; y: number; z: number; s: number }> = {};
  Object.entries(byPhase).forEach(([phStr, list]) => {
    const ph = Number(phStr);
    const yA = -1 + (2 * (ph - 1)) / 12;
    const yB = -1 + (2 * ph) / 12;
    const rows = Math.min(3, Math.max(1, Math.ceil(list.length / 8)));
    list.forEach((n, i) => {
      const y = yA + (yB - yA) * (((i % rows) + 0.5) / rows);
      const rr = Math.sqrt(Math.max(0.06, 1 - y * y));
      const th = i * GA + ph * 0.7;
      pos[n.id] = project(rr * Math.cos(th) * RADIUS, y * RADIUS, rr * Math.sin(th) * RADIUS);
    });
  });
  const order = [...nodes].sort((a, b) => (pos[a.id]?.z ?? 0) - (pos[b.id]?.z ?? 0));

  function onDown(e: PointerEvent<SVGSVGElement>) {
    dragging.current = { x: e.clientX, y: e.clientY, yaw0: rotRef.current.yaw, pitch0: rotRef.current.pitch };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const sc = SIZE / (rect.width || SIZE);
    const px = (e.clientX - rect.left) * sc;
    const py = (e.clientY - rect.top) * sc;
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

  function click(n: GNode) {
    if (!trail.major) load(n.id);
    else if (!trail.middle) load(trail.major, n.id);
    else onDetail(n.id, n.name);
  }

  const levelLabel =
    data?.level === 'major' ? '대분류 40' : data?.level === 'middle' ? `중분류 · ${trail.major}` : `공정 · ${trail.middle}`;

  return (
    <div>
      {/* 브레드크럼 */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => load()}
          className={`rounded-full border px-3 py-1 ${!trail.major ? 'border-[#f0deb9]/60 text-[#f0deb9]' : 'border-[#9BC9D8]/25 text-[#94aab8] hover:text-[#c8e4ee]'}`}
        >
          전체 (대분류)
        </button>
        {trail.major ? (
          <>
            <span className="text-[#9BC9D8]/40">›</span>
            <button
              type="button"
              onClick={() => load(trail.major)}
              className={`rounded-full border px-3 py-1 ${!trail.middle ? 'border-[#f0deb9]/60 text-[#f0deb9]' : 'border-[#9BC9D8]/25 text-[#94aab8] hover:text-[#c8e4ee]'}`}
            >
              {trail.major}
            </button>
          </>
        ) : null}
        {trail.middle ? (
          <>
            <span className="text-[#9BC9D8]/40">›</span>
            <span className="rounded-full border border-[#f0deb9]/60 px-3 py-1 text-[#f0deb9]">{trail.middle}</span>
          </>
        ) : null}
        <span className="ml-auto text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">
          {levelLabel} · 노드 {nodes.length} · 관계 {edges.length}
          {loading ? ' · 불러오는 중…' : ''}
        </span>
      </div>

      {error ? <p className="mb-2 text-sm text-[#E5726A]">{error}</p> : null}

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
          className="mx-auto block w-full max-w-[980px] cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <defs>
            {Object.entries(PHASE_COLOR).map(([id, c]) => (
              <radialGradient key={`o${id}`} id={`gorb${id}`} cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
                <stop offset="38%" stopColor={c} />
                <stop offset="78%" stopColor={c} stopOpacity={0.5} />
                <stop offset="100%" stopColor={c} stopOpacity={0.12} />
              </radialGradient>
            ))}
            {Object.entries(PHASE_COLOR).map(([id, c]) => (
              <radialGradient key={`g${id}`} id={`gglow${id}`} cx="50%" cy="50%" r="50%">
                {[0.12, 0.2, 0.3, 0.45, 0.65, 0.85, 1].map((f) => (
                  <stop key={f} offset={`${(f * 100).toFixed(0)}%`} stopColor={c} stopOpacity={Math.min(1, (0.12 / f) ** 2)} />
                ))}
                <stop offset="100%" stopColor={c} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>

          <circle cx={CX} cy={CY} r={RADIUS * 1.02} fill="none" stroke="rgba(155,201,216,0.06)" />

          {/* 관계선 */}
          {edges.map((e, i) => {
            const a = pos[e.src];
            const b = pos[e.dst];
            if (!a || !b) return null;
            const depth = ((a.z + b.z) / 2 + RADIUS) / (2 * RADIUS);
            const near = ptr
              ? Math.max(0, 1 - Math.min(Math.hypot(a.x - ptr.x, a.y - ptr.y), Math.hypot(b.x - ptr.x, b.y - ptr.y)) / PROX)
              : 0;
            return (
              <line
                key={`e${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={REL_COLOR[e.rel] ?? '#9BC9D8'}
                strokeWidth={0.4 + Math.min(1.6, Math.log10(1 + e.n) * 0.6) + near * 0.8}
                opacity={0.04 + depth * 0.1 + near * 0.45}
              />
            );
          })}

          {/* 노드 */}
          {order.map((n) => {
            const pt = pos[n.id];
            if (!pt) return null;
            const depth = (pt.z + RADIUS) / (2 * RADIUS);
            const near = ptr ? Math.max(0, 1 - Math.hypot(pt.x - ptr.x, pt.y - ptr.y) / PROX) : 0;
            const col = PHASE_COLOR[n.phase] ?? '#9BC9D8';
            // 크기 = 규모(공정 수 또는 공기)
            const scale = Math.log10(1 + (n.processes ?? n.days ?? 1)) * 1.6 + 1.4;
            const R0 = scale * pt.s * (1 + near * 0.35);
            const haloR = (14 + depth * 12 + near * 30) * pt.s * (1 + scale * 0.18);
            const showLabel = near > 0.4 || depth > 0.9 || nodes.length <= 24;
            return (
              <g key={n.id} className="cursor-pointer" opacity={0.28 + depth * 0.34 + near * 0.38} onClick={() => click(n)}>
                <line x1={CX} y1={CY} x2={pt.x} y2={pt.y} stroke={col} strokeWidth={0.3 + near * 0.5} opacity={0.06 + near * 0.2} />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={haloR}
                  fill={`url(#gglow${n.phase})`}
                  opacity={0.3 + depth * 0.25 + near * 0.4}
                  style={{ mixBlendMode: 'screen' }}
                  pointerEvents="none"
                />
                <g transform={`translate(${pt.x} ${pt.y}) scale(${R0 / 8})`}>
                  <circle r={8} fill={`url(#gorb${n.phase})`} />
                  <ellipse rx={8} ry={2.8} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={0.45} />
                  <circle r={8} fill="none" stroke="#fff" strokeOpacity={0.22 + near * 0.55} strokeWidth={0.5} />
                  <circle cx={-2.6} cy={-2.8} r={1.4} fill="#fff" opacity={0.85} />
                </g>
                {showLabel ? (
                  <text
                    x={pt.x}
                    y={pt.y - R0 - 6 * pt.s}
                    fontSize={8.5 + depth * 3}
                    textAnchor="middle"
                    fill="#dbe8ef"
                    stroke="#04070c"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {n.name}
                    {n.processes ? ` (${n.processes})` : ''}
                  </text>
                ) : null}
              </g>
            );
          })}

          <circle cx={CX} cy={CY} r={40} fill="url(#gglow7)" />
          <circle cx={CX} cy={CY} r={15} fill="url(#gorb7)" />
          <text x={CX} y={CY + 38} fontSize={9} textAnchor="middle" fill="rgba(232,201,155,0.5)" letterSpacing={4}>
            {trail.middle ?? trail.major ?? 'ECOREAN'}
          </text>
        </svg>
        <p className="border-t border-[#9BC9D8]/10 px-4 py-2 text-[10px] text-[#94aab8]">
          그래프 DB 6,323 노드 · 73,185 관계 — 계층 집約 후 표시합니다. 노드를 클릭하면 대분류 → 중분류 →
          공정 순으로 파고들고, 공정에서 연결 자재·규칙이 열립니다. 구 크기는 하위 공정 수(또는 공기)입니다.
        </p>
      </div>
    </div>
  );
}
