'use client';

// AI 스튜디오 — 온톨로지 3D 민들레 뷰어 (대표 지시 2026-08-26)
// 공정 노드를 구면(피보나치 분포)에 씨앗처럼 배치하고 중심에서 줄기가 뻗는 민들레 형태.
// 드래그로 자유 회전, 가만두면 천천히 자전. 간선 = 자동연계 규칙(관계유형별 색). 조회 전용.
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
};

const REL_COLOR: Record<string, string> = {
  필수: '#E8C99B',
  권장: '#7FD3E6',
  보완: '#86efac',
  조건: '#c4b5fd',
};

const SIZE = 760;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 235; // 구 반지름
const FOV = 950; // 원근 초점거리

export default function OntologyPage() {
  const rules = (data as { rules: Rule[] }).rules;
  const meta = (data as { _meta: { version: string; totalCount: number } })._meta;
  const [focus, setFocus] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [rot, setRot] = useState({ yaw: 0.6, pitch: -0.35 });
  const dragging = useRef<{ x: number; y: number; yaw0: number; pitch0: number } | null>(null);
  const hovering = useRef(false);
  const raf = useRef(0);
  const rotRef = useRef(rot);
  rotRef.current = rot;

  // 암호 게이트 — portal.html(ACCESS PORTAL) 통과자만 열람 (대표 지시 2026-08-26)
  // 통과 표식은 세션 동안만 유지되고, 탭을 닫으면 다시 관문을 거친다.
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

  // 자동 자전 — 드래그·호버 중엔 정지, 모션 최소화 존중
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!dragging.current && !hovering.current) {
        setRot((r) => ({ ...r, yaw: r.yaw + dt * 0.18 }));
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // 구면 좌표 (피보나치 분포 — 민들레 씨앗처럼 고르게)
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

  // 회전 + 원근 투영
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

  // 씨앗 색 배정 — 이름 해시로 약 1/4 골드, 나머지 블루 (레퍼런스 이미지 비율)
  function isGold(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return h % 4 === 0;
  }

  const visible = rules.filter(
    (r) =>
      (!typeFilter || r.relationshipType === typeFilter) &&
      (!focus || r.triggerProcess === focus || r.autoLinkProcess === focus) &&
      (!q.trim() ||
        r.triggerProcess.includes(q.trim()) ||
        r.autoLinkProcess.includes(q.trim()) ||
        r.note.includes(q.trim())),
  );
  const activeNames = new Set(visible.flatMap((r) => [r.triggerProcess, r.autoLinkProcess]));

  // 무결성 점검 — 순환 연계, 고립 공정, 유형별 분포 (조회 전용 진단)
  const audit = useMemo(() => {
    const names = [...new Set(rules.flatMap((r) => [r.triggerProcess, r.autoLinkProcess]))];
    const cycles: string[] = [];
    names.forEach((n) => {
      if (chainFrom(rules as PanelRule[], n, 5).some((c) => c.name === n)) cycles.push(n);
    });
    const triggers = new Set(rules.map((r) => r.triggerProcess));
    const leaves = names.filter((n) => !triggers.has(n));
    const byType: Record<string, number> = {};
    rules.forEach((r) => {
      byType[r.relationshipType] = (byType[r.relationshipType] ?? 0) + 1;
    });
    return { nodes: names.length, cycles, leaves: leaves.length, byType };
  }, [rules]);

  // 규칙 CSV 내보내기 — 회의·검토용 반출
  function exportCsv() {
    const head = ['트리거 공정', '관계유형', '자동연계 공정', '조건', '수량계산', '비고'];
    const rows = [head, ...rules.map((r) => [r.triggerProcess, r.relationshipType, r.autoLinkProcess, r.condition, r.quantityCalc, r.note])];
    const csv = '\ufeff' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ECOREAN_공정자동연계_규칙_v${meta.version}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 페인터 정렬 (뒤 → 앞)
  const seedOrder = [...seeds].sort((a, b) => projected[a.name].z - projected[b.name].z);

  function onDown(e: PointerEvent<SVGSVGElement>) {
    dragging.current = { x: e.clientX, y: e.clientY, yaw0: rotRef.current.yaw, pitch0: rotRef.current.pitch };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent<SVGSVGElement>) {
    const d = dragging.current;
    if (!d) return;
    const yaw = d.yaw0 + (e.clientX - d.x) * 0.008;
    const pitch = Math.max(-1.2, Math.min(1.2, d.pitch0 + (e.clientY - d.y) * 0.008));
    setRot({ yaw, pitch });
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
            공정 자동연계 규칙 {meta.totalCount}건 (v{meta.version}) — 시스템의 헌법입니다. 민들레를
            잡고 돌려보세요. 씨앗(공정)을 클릭하면 그 공정의 연계만 남습니다. 조회 전용.
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
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="공정 검색 (예: 타일, 도장)"
              className="w-44 rounded-full border border-[#9BC9D8]/25 bg-[#0b111a] px-3.5 py-1 outline-none focus:border-[#9BC9D8]/60"
            />
            {focus ? (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="rounded-full border border-[#E5726A]/40 px-3 py-1 text-[#E5726A]"
              >
                포커스 해제: {focus} ×
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

          {/* 무결성 점검 요약 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/60 px-4 py-2 text-[11px] text-[#94aab8]">
            <span>
              공정 <b className="text-[#c8e4ee]">{audit.nodes}</b>
            </span>
            <span>
              규칙 <b className="text-[#c8e4ee]">{rules.length}</b>
            </span>
            {Object.entries(audit.byType).map(([t, n]) => (
              <span key={t} style={{ color: REL_COLOR[t] }}>
                {t} {n}
              </span>
            ))}
            <span>
              종단 공정 <b className="text-[#c8e4ee]">{audit.leaves}</b>
            </span>
            <span className={audit.cycles.length ? 'text-[#E5726A]' : 'text-[#86efac]'}>
              순환 연계 {audit.cycles.length ? `${audit.cycles.length}건 — 검토 필요` : '없음 ✓'}
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* 3D 민들레 */}
          <div
            className="onto-stage overflow-hidden rounded-xl border border-[#9BC9D8]/15"
            onMouseEnter={() => {
              hovering.current = true;
            }}
            onMouseLeave={() => {
              hovering.current = false;
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
                <radialGradient id="orbB" cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#eaf8ff" />
                  <stop offset="35%" stopColor="#6cc4ff" />
                  <stop offset="75%" stopColor="rgba(20,90,190,0.55)" />
                  <stop offset="100%" stopColor="rgba(8,30,70,0.15)" />
                </radialGradient>
                <radialGradient id="orbG" cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#fff6dd" />
                  <stop offset="35%" stopColor="#f2c35c" />
                  <stop offset="75%" stopColor="rgba(190,130,30,0.55)" />
                  <stop offset="100%" stopColor="rgba(80,50,10,0.15)" />
                </radialGradient>
                <radialGradient id="glowB" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(80,180,255,0.5)" />
                  <stop offset="60%" stopColor="rgba(60,150,255,0.16)" />
                  <stop offset="100%" stopColor="rgba(60,150,255,0)" />
                </radialGradient>
                <radialGradient id="glowG" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(250,200,90,0.5)" />
                  <stop offset="60%" stopColor="rgba(240,180,60,0.15)" />
                  <stop offset="100%" stopColor="rgba(240,180,60,0)" />
                </radialGradient>
                <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(80,180,255,0)" />
                  <stop offset="45%" stopColor="rgba(120,200,255,0.35)" />
                  <stop offset="55%" stopColor="rgba(160,220,255,0.5)" />
                  <stop offset="100%" stopColor="rgba(80,180,255,0)" />
                </linearGradient>
              </defs>

              {/* 중심 수직 광선 */}
              <rect x={CX - 2.5} y={CY - RADIUS * 1.25} width={5} height={RADIUS * 2.5} fill="url(#beam)" />

              {/* 은은한 구 실루엣 */}
              <circle cx={CX} cy={CY} r={RADIUS * 1.02} fill="none" stroke="rgba(155,201,216,0.07)" />

              {/* 간선(규칙) — 뒤쪽 먼저 */}
              {visible
                .map((r, i) => ({ r, i, za: (projected[r.triggerProcess]?.z ?? 0) + (projected[r.autoLinkProcess]?.z ?? 0) }))
                .sort((a, b) => a.za - b.za)
                .map(({ r, i }) => {
                  const a = projected[r.triggerProcess];
                  const b = projected[r.autoLinkProcess];
                  if (!a || !b) return null;
                  const depth = ((a.z + b.z) / 2 + RADIUS) / (2 * RADIUS);
                  return (
                    <line
                      key={`e${i}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={REL_COLOR[r.relationshipType] ?? '#9BC9D8'}
                      strokeWidth={1 + depth}
                      opacity={0.2 + depth * 0.6}
                    />
                  );
                })}

              {/* 줄기 + 씨앗 (뒤 → 앞) */}
              {seedOrder.map(({ name }) => {
                const pt = projected[name];
                const depth = (pt.z + RADIUS) / (2 * RADIUS); // 0 뒤 ~ 1 앞
                const dimmed = !activeNames.has(name);
                const isFocus = focus === name;
                const showLabel = isFocus || (!dimmed && depth > 0.62);
                return (
                  <g
                    key={name}
                    opacity={dimmed ? 0.14 : 0.35 + depth * 0.65}
                    className="cursor-pointer"
                    onClick={() => setFocus((v) => (v === name ? null : name))}
                  >
                    <line
                      x1={CX}
                      y1={CY}
                      x2={pt.x}
                      y2={pt.y}
                      stroke="rgba(90,180,255,0.8)"
                      strokeWidth={0.5 + depth * 0.7}
                      opacity={0.22}
                    />
                    {(() => {
                      const gold = isFocus || isGold(name);
                      const R0 = (isFocus ? 11 : 5.5 + depth * 4.5) * pt.s; // 구체 반지름
                      const k = R0 / 8;
                      const wire = gold ? 'rgba(255,225,160,0.75)' : 'rgba(160,220,255,0.75)';
                      return (
                        <g transform={`translate(${pt.x} ${pt.y}) scale(${k})`}>
                          {/* 외부 발광 */}
                          <circle r={20} fill={`url(#${gold ? 'glowG' : 'glowB'})`} />
                          {/* 구체 본체 */}
                          <circle r={8} fill={`url(#${gold ? 'orbG' : 'orbB'})`} />
                          {/* 내부 와이어프레임 (위도·자오선) */}
                          <ellipse rx={8} ry={2.8} fill="none" stroke={wire} strokeWidth={0.5} opacity={0.8} />
                          <ellipse rx={8} ry={2.8} fill="none" stroke={wire} strokeWidth={0.45} opacity={0.55} transform="rotate(58)" />
                          <ellipse rx={2.8} ry={8} fill="none" stroke={wire} strokeWidth={0.45} opacity={0.55} />
                          {/* 내부 네트워크 점 */}
                          <circle cx={2.6} cy={-1.8} r={0.7} fill="#ffffff" opacity={0.85} />
                          <circle cx={-2.2} cy={2.4} r={0.6} fill={wire} opacity={0.8} />
                          <circle cx={-0.6} cy={-3.2} r={0.5} fill={wire} opacity={0.7} />
                          {/* 림 + 스펙큘러 하이라이트 */}
                          <circle r={8} fill="none" stroke={gold ? 'rgba(255,235,190,0.5)' : 'rgba(190,235,255,0.5)'} strokeWidth={0.6} />
                          <circle cx={-2.6} cy={-2.8} r={1.5} fill="rgba(255,255,255,0.9)" />
                        </g>
                      );
                    })()}
                    {showLabel ? (
                      <text
                        x={pt.x}
                        y={pt.y - 10 * pt.s}
                        fontSize={9 + depth * 3}
                        textAnchor="middle"
                        fill={isFocus ? '#f0deb9' : '#c3d4dd'}
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

              {/* 중심 코어 — 홀로그램 구 + 궤도 링 */}
              <circle cx={CX} cy={CY} r={44} fill="url(#glowB)" />
              <ellipse cx={CX} cy={CY} rx={46} ry={11} fill="none" stroke="rgba(240,190,90,0.55)" strokeWidth={1} transform={`rotate(-12 ${CX} ${CY})`} />
              <ellipse cx={CX} cy={CY} rx={56} ry={14} fill="none" stroke="rgba(120,200,255,0.3)" strokeWidth={0.8} transform={`rotate(-12 ${CX} ${CY})`} />
              <circle cx={CX} cy={CY} r={17} fill="url(#orbB)" />
              <ellipse cx={CX} cy={CY} rx={17} ry={6} fill="none" stroke="rgba(180,230,255,0.7)" strokeWidth={0.7} />
              <ellipse cx={CX} cy={CY} rx={6} ry={17} fill="none" stroke="rgba(180,230,255,0.5)" strokeWidth={0.6} />
              <circle cx={CX - 5.5} cy={CY - 6} r={2.8} fill="rgba(255,255,255,0.9)" />
              <text
                x={CX}
                y={CY + 40}
                fontSize={10}
                textAnchor="middle"
                fill="rgba(232,201,155,0.6)"
                letterSpacing={4}
              >
                ONTOLOGY
              </text>
            </svg>
          </div>

          {/* 우측: 포커스 시 공정 상세, 아니면 규칙 목록 */}
          <div className="max-h-[76vh] space-y-2 overflow-y-auto pr-1">
            {focus ? (
              <OntologyPanel
                name={focus}
                rules={rules as PanelRule[]}
                relColor={REL_COLOR}
                onPick={(n) => setFocus(n)}
              />
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
                    style={{ background: `${REL_COLOR[r.relationshipType]}22`, color: REL_COLOR[r.relationshipType] }}
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
