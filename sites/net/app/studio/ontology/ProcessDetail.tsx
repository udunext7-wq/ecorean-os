'use client';

// 그래프 DB 모드 — 공정 상세 (연결 자재 · 적용 규칙)
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/core/db/browser';

type Detail = {
  node: { id: string; name: string; unit: string | null; duration_days: number | null; unit_price: number | null; meta: Record<string, unknown> } | null;
  materials: { name: string; price: number | null; unit: string | null; brand: string | null }[];
  materialCount: number;
  rules: { concept: string; rel: string; target: string; condition: string | null; quantity: string | null; note: string | null }[];
};

const REL_COLOR: Record<string, string> = {
  필수: '#E8C99B', 권장: '#7FD3E6', 선택: '#86efac', 제안: '#c4b5fd',
  조건: '#F2A05C', 선행: '#9BB8FF', 대체: '#F58FA8',
};

export function ProcessDetail({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createBrowserSupabase();
      const { data } = await supabase.rpc('ontology_process_detail', { p_id: id });
      if (!cancelled) {
        setD(data as Detail);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const meta = (d?.node?.meta ?? {}) as Record<string, string>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E8C99B]/25 bg-[#0b111a]/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">공정 상세 · BOC 등록값</p>
            <h2 className="mt-1 text-lg font-bold text-[#f0deb9]">{name}</h2>
            <p className="mt-1 text-xs text-[#94aab8]">
              {meta.major ?? ''} › {meta.middle ?? ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-[#94aab8] hover:text-[#E5726A]">
            닫기 ×
          </button>
        </div>
        {d?.node ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-[#9BC9D8]/12 py-2">
              <p className="text-[#94aab8]">표준 공기</p>
              <p className="mt-0.5 font-semibold text-[#c8e4ee]">{d.node.duration_days ?? '—'}일</p>
            </div>
            <div className="rounded-lg border border-[#9BC9D8]/12 py-2">
              <p className="text-[#94aab8]">단가</p>
              <p className="mt-0.5 font-semibold text-[#e8c99b]">
                {d.node.unit_price ? d.node.unit_price.toLocaleString() : '—'}
                <span className="text-[10px] text-[#94aab8]">/{d.node.unit ?? ''}</span>
              </p>
            </div>
            <div className="rounded-lg border border-[#9BC9D8]/12 py-2">
              <p className="text-[#94aab8]">연결 자재</p>
              <p className="mt-0.5 font-semibold text-[#c8e4ee]">{d.materialCount}건</p>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? <p className="text-xs text-[#94aab8]">불러오는 중…</p> : null}

      {d?.rules?.length ? (
        <section>
          <p className="mb-1.5 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">적용 규칙 · 온톨로지 연계</p>
          <ul className="space-y-1.5">
            {d.rules.map((r, i) => (
              <li key={i} className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/70 p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[#94aab8]">{r.concept}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: `${REL_COLOR[r.rel] ?? '#9BC9D8'}22`, color: REL_COLOR[r.rel] ?? '#9BC9D8' }}
                  >
                    {r.rel}
                  </span>
                  <span className="font-medium text-[#e8c99b]">{r.target}</span>
                </div>
                {r.note ? <p className="mt-1 text-xs text-[#94aab8]">{r.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {d?.materials?.length ? (
        <section>
          <p className="mb-1.5 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">
            연결 자재 · 상위 {d.materials.length} / {d.materialCount}건
          </p>
          <div className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/70">
            <ul className="max-h-72 divide-y divide-[#9BC9D8]/8 overflow-y-auto text-sm">
              {d.materials.map((m, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <span className="min-w-0 truncate text-[#ebf1f5]">
                    {m.name} <span className="text-xs text-[#94aab8]">{m.brand ?? ''}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[#e8c99b]">
                    {m.price != null ? `${m.price.toLocaleString()}/${m.unit ?? ''}` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-1.5 text-[10px] text-[#94aab8]">
            자재 연결은 카테고리 키워드 매칭(신뢰도 0.6)입니다. 정식 사양은 스펙북·승인 단가를 따릅니다.
          </p>
        </section>
      ) : null}
    </div>
  );
}
