'use client';

// AI 스튜디오 — 제안서 초안 생성기 (대표 지시 2026-08-26)
// 무드보드의 제목·컨셉·연결 자재를 조립해 고객 제안 문구 초안을 만든다 (수정 후 복사).
// 단가는 OFFICIAL 데이터만 인용하고, 수량 미반영임을 문구에 명시한다 (헌법: 추정 금지).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Mat = { id: string; name: string; brand: string | null; unit: string | null; unit_price: number | null };

export default function DraftPage() {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const boardId = new URLSearchParams(window.location.search).get('board');
      if (!boardId) {
        setError('보드 정보가 없습니다 — 무드보드 상세에서 "제안서 초안 만들기"로 진입하세요.');
        return;
      }
      const supabase = createBrowserSupabase();
      const [{ data: board }, { data: imgs }] = await Promise.all([
        supabase.from('moodboards').select('title,site,concept').eq('id', boardId).maybeSingle(),
        supabase.from('moodboard_images').select('materials').eq('board_id', boardId),
      ]);
      if (!board) {
        setError('보드를 찾을 수 없습니다.');
        return;
      }
      const ids = [...new Set((imgs ?? []).flatMap((r) => (r.materials as string[]) ?? []))];
      let mats: Mat[] = [];
      if (ids.length) {
        const { data: rows } = await supabase
          .from('materials')
          .select('id,name,brand,unit,unit_price')
          .in('id', ids);
        mats = (rows ?? []) as Mat[];
      }
      setTitle(board.title);
      const matLines = mats.length
        ? mats
            .map(
              (m) =>
                `  · ${m.name}${m.brand ? ` (${m.brand})` : ''}${
                  m.unit_price != null ? ` — 참조 단가 ${m.unit_price.toLocaleString()}원/${m.unit ?? '단위'}` : ''
                }`,
            )
            .join('\n')
        : '  · (무드보드에 자재를 연결하면 여기 자동으로 채워집니다)';
      setText(
        `[ECOREAN 디자인 제안]\n` +
          `제안명: ${board.title}\n` +
          (board.site ? `대상 현장: ${board.site}\n` : '') +
          `\n■ 디자인 컨셉\n${board.concept ?? '(컨셉 메모를 입력해 주세요)'}\n` +
          `\n첨부된 무드보드와 파생 시안은 위 컨셉을 시각화한 것으로, 실제 시공 시 현장 여건에 맞춰 조정됩니다.\n` +
          `\n■ 제안 주요 자재 (${mats.length}종)\n${matLines}\n` +
          `\n※ 표기된 단가는 자재 단위당 참조가이며, 수량·시공비·부자재가 반영되지 않은 값입니다.\n` +
          `   정식 견적은 실측 후 별도 산출하여 드립니다.\n` +
          `\nECOREAN | 설계·시공 하이엔드 인테리어\n`,
      );
    })();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('복사에 실패했습니다 — 텍스트를 직접 선택해 복사해 주세요.');
    }
  }

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 border-b border-[#9BC9D8]/15 pb-5">
          <Link
            href="/studio/moodboards"
            className="text-xs tracking-[0.3em] text-[#9BC9D8]/70 hover:text-[#c8e4ee]"
          >
            ← MOODBOARDS
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0deb9]">
            제안서 초안 {title ? `— ${title}` : ''}
          </h1>
          <p className="mt-1 text-sm text-[#94aab8]">
            보드의 컨셉·자재로 조립한 초안입니다. 아래에서 자유롭게 다듬은 뒤 복사해 쓰세요.
          </p>
        </header>

        {error ? <p className="mb-4 text-sm text-[#E5726A]">{error}</p> : null}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={22}
          className="w-full rounded-xl border border-[#9BC9D8]/20 bg-[#0b111a]/80 p-5 font-mono text-[13px] leading-relaxed text-[#e6edf2] outline-none focus:border-[#9BC9D8]/50"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={copy}
            className="rounded-full bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-6 py-2 text-sm font-semibold text-[#0f0e0c]"
          >
            {copied ? '복사됨 ✓' : '전체 복사'}
          </button>
        </div>
      </div>
    </main>
  );
}
