'use client';

// 온톨로지 — 공정 상세 패널 (완성판, 대표 지시 2026-08-27)
// 선택 공정의 ① 하류 자동연계 ② 상류(이 공정을 부르는) ③ 재귀 연쇄 체인(견적 누락 방지)
// ④ BOC 실데이터 매칭: 공정 단가(cost_items) · 통합 자재(materials) 키워드 조회.
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/core/db/browser';

export type Rule = {
  triggerProcess: string;
  relationshipType: string;
  autoLinkProcess: string;
  condition: string;
  quantityCalc: string;
  note: string;
};
type CostItem = {
  id: string;
  name: string;
  unit: string | null;
  labor_cost: number | null;
  material_cost: number | null;
  middle_category: string | null;
};
type Mat = { id: string; name: string; brand: string | null; unit: string | null; unit_price: number | null };

// 공정명에서 검색 키워드 추출 — 괄호·수식어 제거 후 핵심 명사만
export function coreKeyword(name: string): string {
  const base = name.replace(/\(.*?\)/g, ' ').replace(/[·/]/g, ' ').trim();
  const words = base.split(/\s+/).filter(Boolean);
  // 가장 긴 한글 토큰이 대체로 핵심 자재/공정명 (예: "LGS 경량틀" → "경량틀")
  const ko = words.filter((w) => /[가-힣]/.test(w)).sort((a, b) => b.length - a.length);
  return (ko[0] ?? words[0] ?? name).slice(0, 8);
}

// 재귀 연쇄 — 선택 공정에서 자동연계를 따라간 전체 필요 공정 (순환 안전)
export function chainFrom(rules: Rule[], start: string, maxDepth = 4) {
  const out: { name: string; depth: number; via: string }[] = [];
  const seen = new Set([start]);
  let frontier = [start];
  for (let d = 1; d <= maxDepth && frontier.length; d += 1) {
    const next: string[] = [];
    frontier.forEach((cur) => {
      rules
        .filter((r) => r.triggerProcess === cur)
        .forEach((r) => {
          if (seen.has(r.autoLinkProcess)) return;
          seen.add(r.autoLinkProcess);
          out.push({ name: r.autoLinkProcess, depth: d, via: r.relationshipType });
          next.push(r.autoLinkProcess);
        });
    });
    frontier = next;
  }
  return out;
}

export function OntologyPanel({
  name,
  rules,
  relColor,
  onPick,
}: {
  name: string;
  rules: Rule[];
  relColor: Record<string, string>;
  onPick: (n: string) => void;
}) {
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [mats, setMats] = useState<Mat[]>([]);
  const [loading, setLoading] = useState(true);

  const downstream = rules.filter((r) => r.triggerProcess === name);
  const upstream = rules.filter((r) => r.autoLinkProcess === name);
  const chain = chainFrom(rules, name);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const kw = coreKeyword(name);
      const supabase = createBrowserSupabase();
      const [{ data: ci }, { data: mt }] = await Promise.all([
        supabase
          .from('cost_items')
          .select('id,name,unit,labor_cost,material_cost,middle_category')
          .ilike('name', `%${kw}%`)
          .limit(6),
        supabase.from('materials').select('id,name,brand,unit,unit_price').ilike('name', `%${kw}%`).limit(6),
      ]);
      if (cancelled) return;
      setCosts((ci ?? []) as CostItem[]);
      setMats((mt ?? []) as Mat[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  const Row = ({ r, dir }: { r: Rule; dir: 'down' | 'up' }) => (
    <li className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/70 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `${relColor[r.relationshipType]}22`, color: relColor[r.relationshipType] }}
        >
          {r.relationshipType}
        </span>
        <button
          type="button"
          onClick={() => onPick(dir === 'down' ? r.autoLinkProcess : r.triggerProcess)}
          className="font-medium text-[#e8c99b] hover:underline"
        >
          {dir === 'down' ? r.autoLinkProcess : r.triggerProcess}
        </button>
      </div>
      <p className="mt-1 text-xs text-[#94aab8]">
        조건 {r.condition} · 수량 {r.quantityCalc}
        {r.note ? ` · ${r.note}` : ''}
      </p>
    </li>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E8C99B]/25 bg-[#0b111a]/80 p-4">
        <p className="text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">선택 공정</p>
        <h2 className="mt-1 text-lg font-bold text-[#f0deb9]">{name}</h2>
        <p className="mt-1 text-xs text-[#94aab8]">
          하류 {downstream.length} · 상류 {upstream.length} · 연쇄 총 {chain.length}개 공정
        </p>
      </div>

      {downstream.length ? (
        <section>
          <p className="mb-1.5 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">
            이 공정이 부르는 연계 · DOWNSTREAM
          </p>
          <ul className="space-y-1.5">
            {downstream.map((r, i) => (
              <Row key={`d${i}`} r={r} dir="down" />
            ))}
          </ul>
        </section>
      ) : null}

      {upstream.length ? (
        <section>
          <p className="mb-1.5 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">
            이 공정을 부르는 선행 · UPSTREAM
          </p>
          <ul className="space-y-1.5">
            {upstream.map((r, i) => (
              <Row key={`u${i}`} r={r} dir="up" />
            ))}
          </ul>
        </section>
      ) : null}

      {chain.length ? (
        <section>
          <p className="mb-1.5 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">
            연쇄 체인 · 함께 잡아야 할 공정
          </p>
          <div className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/70 p-3">
            {chain.map((c) => (
              <div key={c.name} className="flex items-center gap-2 py-0.5 text-sm">
                <span className="text-[#9BC9D8]/40" style={{ paddingLeft: (c.depth - 1) * 12 }}>
                  {'└'}
                </span>
                <button
                  type="button"
                  onClick={() => onPick(c.name)}
                  className="text-[#ebf1f5] hover:text-[#f0deb9] hover:underline"
                >
                  {c.name}
                </button>
                <span className="text-[10px]" style={{ color: relColor[c.via] }}>
                  {c.via}
                </span>
              </div>
            ))}
            <p className="mt-2 border-t border-[#9BC9D8]/10 pt-2 text-xs text-[#94aab8]">
              견적에서 이 {chain.length}개 공정이 빠지면 누락입니다.
            </p>
          </div>
        </section>
      ) : null}

      <section>
        <p className="mb-1.5 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">
          BOC 매칭 · &quot;{coreKeyword(name)}&quot; 기준
        </p>
        {loading ? (
          <p className="text-xs text-[#94aab8]">조회 중…</p>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/70 p-3">
              <p className="mb-1 text-xs font-semibold text-[#c8e4ee]">공정 단가 {costs.length}건</p>
              {costs.length === 0 ? (
                <p className="text-xs text-[#94aab8]">매칭된 단가 항목 없음</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {costs.map((c) => (
                    <li key={c.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[#ebf1f5]">{c.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-[#e8c99b]">
                        {((c.labor_cost ?? 0) + (c.material_cost ?? 0)).toLocaleString()}
                        <span className="text-[#94aab8]">/{c.unit ?? ''}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a]/70 p-3">
              <p className="mb-1 text-xs font-semibold text-[#c8e4ee]">통합 자재 {mats.length}건</p>
              {mats.length === 0 ? (
                <p className="text-xs text-[#94aab8]">매칭된 자재 없음</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {mats.map((m) => (
                    <li key={m.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[#ebf1f5]">
                        {m.name} <span className="text-xs text-[#94aab8]">{m.brand ?? ''}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-[#e8c99b]">
                        {m.unit_price != null ? `${m.unit_price.toLocaleString()}/${m.unit ?? ''}` : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-[10px] leading-relaxed text-[#94aab8]">
              공정명 키워드로 조회한 참고 자료입니다. 정식 단가는 BOC 마스터 DB 승인값을 따릅니다.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
