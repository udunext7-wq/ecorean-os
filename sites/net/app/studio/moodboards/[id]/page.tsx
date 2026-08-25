'use client';

// AI 스튜디오 — 무드보드 상세: 이미지 업로드·메이슨리 갤러리·전체화면 라이트박스 (대표 지시 2026-08-25)
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Board = { id: string; title: string; concept: string | null; site: string | null; cover_url: string | null };
type Img = { id: string; url: string; caption: string | null; created_at: string };

export default function MoodboardDetailPage() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;
  const [board, setBoard] = useState<Board | null>(null);
  const [images, setImages] = useState<Img[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0); // 남은 업로드 수
  const [lightbox, setLightbox] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const [{ data: b }, { data: imgs, error: e2 }] = await Promise.all([
      supabase.from('moodboards').select('id,title,concept,site,cover_url').eq('id', boardId).maybeSingle(),
      supabase.from('moodboard_images').select('id,url,caption,created_at').eq('board_id', boardId).order('created_at', { ascending: false }),
    ]);
    setBoard((b as Board) ?? null);
    if (e2) setError('이미지를 불러오지 못했습니다 — 직원(staff) 권한이 필요할 수 있습니다.');
    else setImages((imgs ?? []) as Img[]);
  }, [boardId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const supabase = createBrowserSupabase();
    setUploading(files.length);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${boardId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('moodboards').upload(path, file, {
          cacheControl: '31536000',
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('moodboards').getPublicUrl(path);
        const url = pub.publicUrl;
        const { error: insErr } = await supabase
          .from('moodboard_images')
          .insert({ board_id: boardId, url });
        if (insErr) throw insErr;
        // 첫 이미지는 보드 커버로
        if (board && !board.cover_url) {
          await supabase.from('moodboards').update({ cover_url: url }).eq('id', boardId);
          setBoard({ ...board, cover_url: url });
        }
      } catch (err) {
        setError(`업로드 실패: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setUploading((v) => v - 1);
      }
    }
    load();
  }

  async function removeImage(img: Img) {
    const supabase = createBrowserSupabase();
    const { error: delErr } = await supabase.from('moodboard_images').delete().eq('id', img.id);
    if (delErr) {
      setError('삭제 권한이 없습니다 (본인 등록분 또는 admin만 삭제 가능).');
      return;
    }
    // 스토리지 원본도 정리 (URL 에서 버킷 경로 추출)
    const m = img.url.split('/object/public/moodboards/')[1];
    if (m) await supabase.storage.from('moodboards').remove([decodeURIComponent(m)]);
    setLightbox(null);
    load();
  }

  // 라이트박스 키보드
  useEffect(() => {
    if (lightbox === null) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((v) => (v === null ? v : (v + 1) % images.length));
      if (e.key === 'ArrowLeft') setLightbox((v) => (v === null ? v : (v - 1 + images.length) % images.length));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, images.length]);

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[#9BC9D8]/15 pb-5">
          <div>
            <Link href="/studio/moodboards" className="text-xs tracking-[0.3em] text-[#9BC9D8]/70 hover:text-[#c8e4ee]">
              ← MOODBOARDS
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0deb9]">
              {board?.title ?? '무드보드'}
            </h1>
            <p className="mt-1 text-sm text-[#94aab8]">
              {[board?.site, board?.concept].filter(Boolean).join(' · ') || '컨셉 메모 없음'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading > 0}
              className="rounded-full bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-5 py-2 text-sm font-semibold text-[#0f0e0c] disabled:opacity-50"
            >
              {uploading > 0 ? `업로드 중… (${uploading})` : '+ 이미지 업로드'}
            </button>
          </div>
        </header>

        {error ? <p className="mb-5 text-sm text-[#E5726A]">{error}</p> : null}
        {images.length === 0 && !error ? (
          <p className="mt-16 text-center text-sm text-[#94aab8]">
            아직 이미지가 없습니다 — 레퍼런스 사진이나 AI 렌더링을 올려보세요. (여러 장 한 번에 가능)
          </p>
        ) : null}

        {/* 메이슨리 갤러리 */}
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightbox(i)}
              className="group block w-full overflow-hidden rounded-lg border border-[#9BC9D8]/12 bg-[#0b111a] transition hover:border-[#E8C99B]/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.caption ?? ''}
                loading="lazy"
                className="w-full transition duration-500 group-hover:scale-[1.03] group-hover:brightness-110"
              />
            </button>
          ))}
        </div>
      </div>

      {/* 라이트박스 — 전체화면 뷰 */}
      {lightbox !== null && images[lightbox] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox].url}
            alt=""
            className="max-h-[88vh] max-w-[92vw] rounded-md object-contain shadow-[0_0_80px_-20px_rgba(155,201,216,0.35)]"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="이전"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-[#9BC9D8]/30 px-4 py-3 text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((v) => (v === null ? v : (v - 1 + images.length) % images.length));
            }}
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="다음"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-[#9BC9D8]/30 px-4 py-3 text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((v) => (v === null ? v : (v + 1) % images.length));
            }}
          >
            ▶
          </button>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 text-xs text-[#94aab8]">
            <span>
              {lightbox + 1} / {images.length}
            </span>
            <button
              type="button"
              className="rounded-full border border-[#E5726A]/40 px-3 py-1 text-[#E5726A] hover:bg-[#E5726A]/10"
              onClick={(e) => {
                e.stopPropagation();
                removeImage(images[lightbox]);
              }}
            >
              삭제
            </button>
            <span className="hidden sm:inline">ESC 닫기 · ←→ 이동</span>
          </div>
        </div>
      ) : null}
    </main>
  );
}
