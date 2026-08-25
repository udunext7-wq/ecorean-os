'use client';

// AI 스튜디오 — 무드보드 갤러리: 보드 목록 (대표 지시 2026-08-25)
// 현장·컨셉별 레퍼런스/AI 이미지 보드. staff 이상 (RLS 가 데이터 접근을 통제).
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Board = {
  id: string;
  title: string;
  concept: string | null;
  site: string | null;
  cover_url: string | null;
  created_at: string;
  image_count: number;
};

export default function MoodboardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [site, setSite] = useState('');
  const [concept, setConcept] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createBrowserSupabase();
    const { data, error: err } = await supabase
      .from('moodboards')
      .select('id,title,concept,site,cover_url,created_at,moodboard_images(count)')
      .order('created_at', { ascending: false });
    if (err) {
      setError('보드를 불러오지 못했습니다 — 직원(staff) 권한이 필요할 수 있습니다.');
    } else {
      setBoards(
        (data ?? []).map((b) => ({
          ...b,
          image_count: (b.moodboard_images as unknown as { count: number }[])?.[0]?.count ?? 0,
        })) as Board[],
      );
      setError(null);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.from('moodboards').insert({
      title: title.trim(),
      site: site.trim() || null,
      concept: concept.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(`보드 생성 실패: ${err.message}`);
      return;
    }
    setTitle('');
    setSite('');
    setConcept('');
    setShowForm(false);
    load();
  }

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#9BC9D8]/15 pb-5">
          <div>
            <Link href="/hub" className="text-xs tracking-[0.3em] text-[#9BC9D8]/70 hover:text-[#c8e4ee]">
              ← WORK HUB
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0deb9]">
              AI 스튜디오 · 무드보드 갤러리
            </h1>
            <p className="mt-1 text-sm text-[#94aab8]">
              현장·컨셉별 레퍼런스와 AI 이미지를 보드로 모아 보관하고, 미팅에서 바로 펼쳐 보여주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full border border-[#E8C99B]/40 px-5 py-2 text-sm font-medium text-[#e8c99b] transition hover:bg-[#E8C99B]/10"
          >
            {showForm ? '닫기' : '+ 새 보드'}
          </button>
        </header>

        {showForm ? (
          <form
            onSubmit={onCreate}
            className="mb-8 grid gap-3 rounded-xl border border-[#9BC9D8]/20 bg-[#0b111a]/80 p-5 sm:grid-cols-[1fr_1fr_2fr_auto]"
          >
            <input
              required
              placeholder="보드 이름 (예: 청담 J 아파트)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-[#9BC9D8]/20 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
            <input
              placeholder="현장 (선택)"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="rounded-md border border-[#9BC9D8]/20 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
            <input
              placeholder="컨셉 메모 (예: 미니멀 웜톤 · 무광 브라스)"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="rounded-md border border-[#9BC9D8]/20 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-5 py-2 text-sm font-semibold text-[#0f0e0c] disabled:opacity-50"
            >
              {saving ? '생성 중…' : '만들기'}
            </button>
          </form>
        ) : null}

        {error ? <p className="mb-6 text-sm text-[#E5726A]">{error}</p> : null}
        {loading ? <p className="text-sm text-[#94aab8]">불러오는 중…</p> : null}
        {!loading && boards.length === 0 && !error ? (
          <p className="mt-16 text-center text-sm text-[#94aab8]">
            아직 보드가 없습니다 — "+ 새 보드"로 첫 무드보드를 만들어보세요.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/studio/moodboards/view?id=${b.id}`}
              className="group overflow-hidden rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/80 transition hover:border-[#E8C99B]/40 hover:shadow-[0_0_40px_-16px_rgba(214,190,145,0.4)]"
            >
              <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#101826] to-[#070b12]">
                {b.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.cover_url}
                    alt={b.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-[#9BC9D8]/25">✦</div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-[#ecf2f5]">{b.title}</p>
                <p className="mt-0.5 truncate text-xs text-[#94aab8]">
                  {[b.site, b.concept].filter(Boolean).join(' · ') || '—'}
                </p>
                <p className="mt-2 text-[10px] tracking-[0.25em] text-[#9BC9D8]/60">
                  {b.image_count} IMAGES
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
