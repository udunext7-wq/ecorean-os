'use client';

// AI 스튜디오 — 공정표 자동 생성 (대표 지시 2026-08-27)
// 온톨로지 그래프(ontology_nodes)의 표준 공기 + 생애주기 12단계 순서로 일정을 자동 배정한다.
// 데이터 근거: BOC cost_items 670건의 default_duration. 추정 없이 등록값만 사용.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';
import { StudioNav } from '../StudioNav';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Row = {
  phase: number;
  phase_name: string;
  category: string;
  process: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  unit: string | null;
  unit_cost: number | null;
};

const PHASE_COLOR: Record<number, string> = {
  1: '#A5B4FF', 2: '#8FA3B8', 3: '#6FB3D6', 4: '#5BC8FF', 5: '#4FE0E3', 6: '#4FE3B8',
  7: '#7FE39B', 8: '#A9E37F', 9: '#C9E36B', 10: '#F2C35C', 11: '#F2A05C', 12: '#F58FA8',
};

export default function SchedulePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [domain, setDomain] = useState<string>('');
  const [parallel, setParallel] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<number | null>(null);
  // 건축물대장에서 넘어온 규모·범위 (2026-08-28)
  const [ctx, setCtx] = useState<{ bld: string; area: number | null } | null>(null);
  const [ready, setReady] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { data, error: err } = await supabase.rpc('ontology_schedule', {
      p_start: start,
      p_domain: domain || null,
      p_categories: null,
      p_parallel: parallel,
    });
    setLoading(false);
    if (err) {
      setError(`생성 실패: ${err.message}`);
      return;
    }
    setRows((data ?? []) as Row[]);
  }, [start, domain, parallel]);

  // /studio/building 의 "이 규모로 공정표 생성" 에서 넘어온 값을 이어받는다.
  // (첫 생성 전에 범위를 확정해 RPC 를 두 번 부르지 않는다)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get('domain');
    if (d === '건축' || d === '인테리어') setDomain(d);
    const area = Number(p.get('area'));
    const bld = (p.get('bld') ?? '').trim();
    const hasArea = Number.isFinite(area) && area > 0;
    if (bld || hasArea) setCtx({ bld, area: hasArea ? area : null });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) run();
  }, [ready, run]);

  // 단계 요약
  const phases = [...new Set(rows.map((r) => r.phase))].sort((a, b) => a - b);
  const summary = phases.map((p) => {
    const rs = rows.filter((r) => r.phase === p);
    return {
      phase: p,
      name: rs[0]?.phase_name ?? '',
      count: rs.length,
      start: rs.reduce((m, r) => (r.start_date < m ? r.start_date : m), rs[0]?.start_date ?? ''),
      end: rs.reduce((m, r) => (r.end_date > m ? r.end_date : m), rs[0]?.end_date ?? ''),
      rows: rs,
    };
  });
  const projStart = rows.length ? summary[0].start : '';
  const projEnd = rows.length ? summary.reduce((m, s) => (s.end > m ? s.end : m), summary[0].end) : '';
  const totalDays =
    projStart && projEnd
      ? Math.round((new Date(projEnd).getTime() - new Date(projStart).getTime()) / 86400000)
      : 0;

  // 간트 좌표
  const span = Math.max(1, totalDays);
  const barPos = (s: string, e: string) => {
    const a = (new Date(s).getTime() - new Date(projStart).getTime()) / 86400000;
    const b = (new Date(e).getTime() - new Date(s).getTime()) / 86400000;
    return { left: `${(a / span) * 100}%`, width: `${Math.max(0.6, (b / span) * 100)}%` };
  };

  function exportCsv() {
    const head = ['단계', '단계명', '대분류', '공정', '공기(일)', '착수', '완료', '단위', '단가'];
    const csv =
      '﻿' +
      [head, ...rows.map((r) => [r.phase, r.phase_name, r.category, r.process, r.duration_days, r.start_date, r.end_date, r.unit ?? '', r.unit_cost ?? ''])]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ECOREAN_공정표_${start}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-[1400px]">
        <StudioNav />
        <header className="mb-5 border-b border-[#9BC9D8]/15 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#f0deb9]">AI 스튜디오 · 공정표 자동 생성</h1>
          <p className="mt-1 text-sm text-[#94aab8]">
            온톨로지 그래프의 <b className="text-[#c8e4ee]">생애주기 12단계 순서</b>와 BOC 공정 단가에
            등록된 <b className="text-[#c8e4ee]">표준 공기</b>로 일정을 자동 배정합니다. 단계 내 공정은
            병행, 단계 간에는 선행 완료 후 착수합니다.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">착수일</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="rounded-md border border-[#9BC9D8]/25 bg-[#0b111a] px-3 py-1.5 outline-none focus:border-[#9BC9D8]/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">공사 범위</span>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="rounded-md border border-[#9BC9D8]/25 bg-[#0b111a] px-3 py-1.5 outline-none"
              >
                <option value="">전체 (건축+인테리어)</option>
                <option value="건축">건축</option>
                <option value="인테리어">인테리어</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">동시 진행 팀</span>
              <input
                type="number"
                min={1}
                max={12}
                value={parallel}
                onChange={(e) => setParallel(Number(e.target.value))}
                className="w-24 rounded-md border border-[#9BC9D8]/25 bg-[#0b111a] px-3 py-1.5 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="rounded-full bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-5 py-2 text-sm font-semibold text-[#0f0e0c] disabled:opacity-50"
            >
              {loading ? '산출 중…' : '공정표 생성'}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!rows.length}
              className="rounded-full border border-[#9BC9D8]/30 px-4 py-2 text-xs text-[#c8e4ee] hover:bg-[#9BC9D8]/10 disabled:opacity-40"
            >
              CSV 내보내기
            </button>
          </div>
        </header>

        {ctx ? (
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[#E8C99B]/25 bg-[#E8C99B]/[0.05] px-4 py-2.5 text-xs">
            <span className="text-[10px] tracking-[0.3em] text-[#e8c99b]/80">건축물대장 연계</span>
            {ctx.bld ? <b className="text-[#f0deb9]">{ctx.bld}</b> : null}
            {ctx.area ? (
              <span className="text-[#94aab8]">
                연면적 <b className="text-[#c8e4ee]">{ctx.area.toLocaleString()}㎡</b> (
                {Math.round(ctx.area / 3.3058).toLocaleString()}평)
              </span>
            ) : null}
            <span className="text-[#94aab8]">— 공기는 표준 공정 기준, 면적별 물량은 견적에서 반영합니다</span>
            <Link href="/studio/building" className="ml-auto text-[#9BC9D8] underline underline-offset-2">
              대장으로 돌아가기
            </Link>
          </div>
        ) : null}

        {error ? <p className="mb-4 text-sm text-[#E5726A]">{error}</p> : null}

        {rows.length ? (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/60 px-4 py-2.5 text-xs text-[#94aab8]">
              <span>
                공정 <b className="text-[#c8e4ee]">{rows.length}</b>건
              </span>
              <span>
                착수 <b className="text-[#c8e4ee]">{projStart}</b>
              </span>
              <span>
                준공 <b className="text-[#f0deb9]">{projEnd}</b>
              </span>
              <span>
                총 공기 <b className="text-[#f0deb9]">{totalDays}일</b> (약 {Math.round(totalDays / 30)}개월)
              </span>
              <span className="text-[#F2A05C]/80">표준 공기 기준 · 현장 여건·인허가 대기 미반영</span>
            </div>

            {/* 단계 간트 */}
            <div className="mb-6 space-y-1.5 rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/70 p-4">
              {summary.map((s) => (
                <div key={s.phase} className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setOpenPhase((v) => (v === s.phase ? null : s.phase))}
                    className="w-40 shrink-0 truncate text-left hover:underline"
                    style={{ color: PHASE_COLOR[s.phase] }}
                  >
                    {String(s.phase).padStart(2, '0')} {s.name}
                  </button>
                  <div className="relative h-5 flex-1 rounded bg-[#0a1017]">
                    <div
                      className="absolute top-0 h-5 rounded"
                      style={{
                        ...barPos(s.start, s.end),
                        background: `linear-gradient(90deg, ${PHASE_COLOR[s.phase]}cc, ${PHASE_COLOR[s.phase]}55)`,
                      }}
                      title={`${s.start} ~ ${s.end}`}
                    />
                  </div>
                  <span className="w-52 shrink-0 text-right tabular-nums text-[#94aab8]">
                    {s.start} ~ {s.end} · {s.count}건
                  </span>
                </div>
              ))}
            </div>

            {/* 선택 단계 상세 */}
            {openPhase ? (
              <div className="overflow-hidden rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/80">
                <div className="border-b border-[#9BC9D8]/12 px-5 py-3 text-sm font-semibold" style={{ color: PHASE_COLOR[openPhase] }}>
                  {String(openPhase).padStart(2, '0')} {summary.find((s) => s.phase === openPhase)?.name} — 공정 상세
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#0b111a]">
                      <tr className="text-left text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">
                        <th className="px-4 py-2">대분류</th>
                        <th className="px-4 py-2">공정</th>
                        <th className="px-4 py-2 text-right">공기</th>
                        <th className="px-4 py-2">착수</th>
                        <th className="px-4 py-2">완료</th>
                        <th className="px-4 py-2 text-right">단가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#9BC9D8]/8">
                      {summary
                        .find((s) => s.phase === openPhase)!
                        .rows.map((r, i) => (
                          <tr key={i} className="hover:bg-[#9BC9D8]/5">
                            <td className="px-4 py-1.5 text-[#94aab8]">{r.category}</td>
                            <td className="px-4 py-1.5 text-[#ebf1f5]">{r.process}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-[#c8e4ee]">{r.duration_days}일</td>
                            <td className="px-4 py-1.5 tabular-nums text-[#94aab8]">{r.start_date}</td>
                            <td className="px-4 py-1.5 tabular-nums text-[#94aab8]">{r.end_date}</td>
                            <td className="px-4 py-1.5 text-right tabular-nums text-[#e8c99b]">
                              {r.unit_cost ? `${r.unit_cost.toLocaleString()}/${r.unit ?? ''}` : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-[#94aab8]">단계 이름을 클릭하면 해당 공정 목록이 열립니다.</p>
            )}
          </>
        ) : !loading ? (
          <p className="mt-16 text-center text-sm text-[#94aab8]">
            공정 데이터를 불러오지 못했습니다 — 직원(staff) 권한이 필요할 수 있습니다.
          </p>
        ) : null}
      </div>
    </main>
  );
}
