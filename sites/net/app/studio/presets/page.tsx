'use client';

// AI 스튜디오 — 스타일 프리셋 (대표 지시 2026-08-26)
// 무드보드에서 추출한 자재 조합·컨셉. 추후 헌법 엔진 5(DefaultSpec)·6(Preset)의 시드가 된다.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Preset = {
  id: string;
  board_id: string | null;
  name: string;
  notes: string | null;
  material_ids: string[];
  created_at: string;
};
type Mat = { id: string; name: string; brand: string | null; unit: string | null; unit_price: number | null };

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [mats, setMats] = useState<Record<string, Mat>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createBrowserSupabase();
    const { data, error: err } = await supabase
      .from('mb_style_presets')
      .select('id,board_id,name,notes,material_ids,created_at')
      .order('created_at', { ascending: false });
    if (err) {
      setError('프리셋을 불러오지 못했습니다 — 직원(staff) 권한이 필요할 수 있습니다.');
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Preset[];
    setPresets(list);
    const ids = [...new Set(list.flatMap((p) => p.material_ids ?? []))];
    if (ids.length) {
      const { data: rows } = await supabase
        .from('materials')
        .select('id,name,brand,unit,unit_price')
        .in('id', ids);
      const map: Record<string, Mat> = {};
      (rows ?? []).forEach((m) => {
        map[(m as Mat).id] = m as Mat;
      });
      setMats(map);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(p: Preset) {
    if (!window.confirm(`"${p.name}" 프리셋을 삭제할까요?`)) return;
    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.from('mb_style_presets').delete().eq('id', p.id);
    if (err) setError('삭제 권한이 없습니다 (본인 또는 admin).');
    else load();
  }

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-[#9BC9D8]/15 pb-5">
          <Link href="/hub" className="text-xs tracking-[0.3em] text-[#9BC9D8]/70 hover:text-[#c8e4ee]">
            ← WORK HUB
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0deb9]">
            AI 스튜디오 · 스타일 프리셋
          </h1>
          <p className="mt-1 text-sm text-[#94aab8]">
            무드보드에서 추출한 자재 조합입니다. 보드 상세의 "스타일 프리셋으로 저장"으로 쌓입니다 —
            향후 MiniCAD·견적 기본사양의 재료가 됩니다.
          </p>
        </header>

        {error ? <p className="mb-5 text-sm text-[#E5726A]">{error}</p> : null}
        {loading ? <p className="text-sm text-[#94aab8]">불러오는 중…</p> : null}
        {!loading && presets.length === 0 && !error ? (
          <p className="mt-16 text-center text-sm text-[#94aab8]">
            아직 프리셋이 없습니다 — 무드보드에 자재를 연결한 뒤 "스타일 프리셋으로 저장"을 눌러보세요.
          </p>
        ) : null}

        <div className="space-y-3">
          {presets.map((p) => (
            <div key={p.id} className="rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/80">
              <button
                type="button"
                onClick={() => setOpen((v) => (v === p.id ? null : p.id))}
                className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3.5 text-left"
              >
                <span className="font-semibold text-[#ecf2f5]">{p.name}</span>
                <span className="text-xs text-[#94aab8]">{p.notes ?? ''}</span>
                <span className="ml-auto text-[10px] tracking-[0.25em] text-[#9BC9D8]/60">
                  {p.material_ids.length} MATERIALS · {p.created_at.slice(0, 10)}
                </span>
              </button>
              {open === p.id ? (
                <div className="border-t border-[#9BC9D8]/12 px-5 py-3">
                  {p.material_ids.length === 0 ? (
                    <p className="text-sm text-[#94aab8]">연결된 자재 없음</p>
                  ) : (
                    <ul className="grid gap-1 text-sm sm:grid-cols-2">
                      {p.material_ids.map((id) => (
                        <li key={id} className="flex justify-between gap-3">
                          <span className="text-[#ebf1f5]">
                            {mats[id]?.name ?? '—'}{' '}
                            <span className="text-xs text-[#94aab8]">{mats[id]?.brand ?? ''}</span>
                          </span>
                          <span className="text-xs tabular-nums text-[#e8c99b]">
                            {mats[id]?.unit_price != null
                              ? `${mats[id]!.unit_price!.toLocaleString()}/${mats[id]?.unit ?? ''}`
                              : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex gap-3 text-xs">
                    {p.board_id ? (
                      <Link
                        href={`/studio/moodboards/view?id=${p.board_id}`}
                        className="text-[#9BC9D8] hover:underline"
                      >
                        원본 무드보드 열기
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      className="text-[#E5726A]/80 hover:text-[#E5726A]"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
