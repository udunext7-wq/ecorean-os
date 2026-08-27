'use client';

// AI 스튜디오 — 무드보드 상세: 이미지 업로드·메이슨리 갤러리·전체화면 라이트박스 (대표 지시 2026-08-25)
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';
import { StudioNav, optimizeImage } from '../../StudioNav';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Board = { id: string; title: string; concept: string | null; site: string | null; cover_url: string | null };
type Img = { id: string; url: string; caption: string | null; created_at: string; materials: string[] };
type Mat = { id: string; name: string; brand: string | null; unit: string | null; unit_price: number | null };
type Pair = { id: string; before_url: string; after_url: string; caption: string | null };

// Before/After 슬라이더 비교 — 가운데 분할선을 끌어 전후를 비교한다
function ComparePair({ pair, onDelete }: { pair: Pair; onDelete: () => void }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="overflow-hidden rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]">
      <div className="relative select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pair.after_url} alt="after" className="block w-full" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pair.before_url}
          alt="before"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 w-[2px] bg-[#F5DCB0] shadow-[0_0_10px_rgba(245,220,176,0.8)]"
          style={{ left: `${pos}%` }}
        />
        <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-0.5 text-[10px] tracking-[0.2em] text-[#c8e4ee]">
          BEFORE
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/55 px-2 py-0.5 text-[10px] tracking-[0.2em] text-[#e8c99b]">
          AFTER
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="전후 비교 위치"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-[#94aab8]">
        <span className="truncate">{pair.caption || '현장 비교'}</span>
        <button type="button" onClick={onDelete} className="text-[#E5726A]/80 hover:text-[#E5726A]">
          삭제
        </button>
      </div>
    </div>
  );
}

export default function MoodboardDetailPage() {
  // vercel.json 수동 routes 가 동적 세그먼트를 못 태워 404 → 쿼리(?id=) 방식 (2026-08-25)
  const [boardId, setBoardId] = useState<string | null>(null);
  useEffect(() => {
    setBoardId(new URLSearchParams(window.location.search).get('id'));
  }, []);
  const [board, setBoard] = useState<Board | null>(null);
  const [images, setImages] = useState<Img[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0); // 남은 업로드 수
  const [lightbox, setLightbox] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const refFileRef = useRef<HTMLInputElement | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [matCatalog, setMatCatalog] = useState<Record<string, Mat>>({});
  const [matQuery, setMatQuery] = useState('');
  const [matResults, setMatResults] = useState<Mat[]>([]);
  const beforeRef = useRef<HTMLInputElement | null>(null);
  const afterRef = useRef<HTMLInputElement | null>(null);
  const [pairBusy, setPairBusy] = useState(false);
  const [refSize, setRefSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [refView, setRefView] = useState(false); // 기준 이미지 전체화면
  useEffect(() => {
    try {
      const s = localStorage.getItem('ecorean.mb.refSize');
      if (s === 'sm' || s === 'md' || s === 'lg') setRefSize(s);
    } catch {
      /* no-op */
    }
  }, []);
  function changeRefSize(s: 'sm' | 'md' | 'lg') {
    setRefSize(s);
    try {
      localStorage.setItem('ecorean.mb.refSize', s);
    } catch {
      /* no-op */
    }
  }
  const [eTitle, setETitle] = useState('');
  const [eSite, setESite] = useState('');
  const [eConcept, setEConcept] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!boardId) return;
    const supabase = createBrowserSupabase();
    const [{ data: b }, { data: imgs, error: e2 }, { data: prs }] = await Promise.all([
      supabase.from('moodboards').select('id,title,concept,site,cover_url').eq('id', boardId).maybeSingle(),
      supabase
        .from('moodboard_images')
        .select('id,url,caption,created_at,materials')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false }),
      supabase
        .from('mb_compare_pairs')
        .select('id,before_url,after_url,caption')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false }),
    ]);
    setBoard((b as Board) ?? null);
    setPairs((prs ?? []) as Pair[]);
    if (e2) {
      setError('이미지를 불러오지 못했습니다 — 직원(staff) 권한이 필요할 수 있습니다.');
      return;
    }
    const list = (imgs ?? []) as Img[];
    setImages(list);
    // 연결된 자재 카탈로그 로드 (BOC 통합 자재)
    const ids = [...new Set(list.flatMap((im) => im.materials ?? []))];
    if (ids.length) {
      const { data: mats } = await supabase
        .from('materials')
        .select('id,name,brand,unit,unit_price')
        .in('id', ids);
      const map: Record<string, Mat> = {};
      (mats ?? []).forEach((m) => {
        map[(m as Mat).id] = m as Mat;
      });
      setMatCatalog(map);
    } else {
      setMatCatalog({});
    }
  }, [boardId]);

  useEffect(() => {
    load();
  }, [load]);

  // 클립보드 붙여넣기 업로드 (Ctrl+V) — 스크린샷·복사 이미지 즉시 등록
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) onFiles(files);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const [matPanel, setMatPanel] = useState(true); // 라이트박스 자재 패널 접기

  // 이미지 캡션 저장
  async function saveCaption(img: Img, caption: string) {
    const supabase = createBrowserSupabase();
    await supabase.from('moodboard_images').update({ caption: caption || null }).eq('id', img.id);
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0 || !boardId) return;
    const supabase = createBrowserSupabase();
    setUploading(files.length);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const opt = await optimizeImage(file);
        const path = `${boardId}/${crypto.randomUUID()}.${opt.ext}`;
        const { error: upErr } = await supabase.storage.from('moodboards').upload(path, opt.blob, {
          cacheControl: '31536000',
          contentType: opt.type || undefined,
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

  // 보드 정보 편집 (제목·현장·컨셉) — RLS: 본인 보드 또는 admin
  function startEdit() {
    if (!board) return;
    setETitle(board.title);
    setESite(board.site ?? '');
    setEConcept(board.concept ?? '');
    setEditing(true);
  }
  async function saveEdit() {
    if (!boardId || !eTitle.trim()) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { error: updErr } = await supabase
      .from('moodboards')
      .update({ title: eTitle.trim(), site: eSite.trim() || null, concept: eConcept.trim() || null })
      .eq('id', boardId);
    setBusy(false);
    if (updErr) {
      setError('수정 권한이 없습니다 (본인 보드 또는 admin만 수정 가능).');
      return;
    }
    setBoard((b) => (b ? { ...b, title: eTitle.trim(), site: eSite.trim() || null, concept: eConcept.trim() || null } : b));
    setEditing(false);
  }

  // 보드 삭제 — 파생 이미지 행(cascade)·스토리지 파일까지 정리 후 목록으로
  async function deleteBoard() {
    if (!boardId || !board) return;
    if (!window.confirm(`"${board.title}" 보드와 파생 이미지 ${images.length}장을 모두 삭제할까요?\n되돌릴 수 없습니다.`)) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { error: delErr } = await supabase.from('moodboards').delete().eq('id', boardId);
    if (delErr) {
      setBusy(false);
      setError('삭제 권한이 없습니다 (본인 보드 또는 admin만 삭제 가능).');
      return;
    }
    // 스토리지 파일 정리 (best-effort — 실패해도 보드는 이미 삭제됨)
    try {
      const { data: objs } = await supabase.storage.from('moodboards').list(boardId, { limit: 1000 });
      const paths = (objs ?? []).map((o) => `${boardId}/${o.name}`);
      if (paths.length) await supabase.storage.from('moodboards').remove(paths);
    } catch {
      /* no-op */
    }
    window.location.href = '/studio/moodboards';
  }

  // ── 자재 매핑 (BOC 통합 자재 연결) ──
  async function searchMaterials(q: string) {
    setMatQuery(q);
    if (q.trim().length < 2) {
      setMatResults([]);
      return;
    }
    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from('materials')
      .select('id,name,brand,unit,unit_price')
      .ilike('name', `%${q.trim()}%`)
      .limit(8);
    setMatResults((data ?? []) as Mat[]);
  }
  async function setImageMaterials(img: Img, next: string[]) {
    const supabase = createBrowserSupabase();
    const { error: updErr } = await supabase
      .from('moodboard_images')
      .update({ materials: next })
      .eq('id', img.id);
    if (updErr) {
      setError('자재 연결 권한이 없습니다 (본인 등록 이미지 또는 admin).');
      return;
    }
    setImages((arr) => arr.map((x) => (x.id === img.id ? { ...x, materials: next } : x)));
  }
  async function addMaterial(img: Img, mat: Mat) {
    if ((img.materials ?? []).includes(mat.id)) return;
    setMatCatalog((m) => ({ ...m, [mat.id]: mat }));
    await setImageMaterials(img, [...(img.materials ?? []), mat.id]);
    setMatQuery('');
    setMatResults([]);
  }

  // 보드 전체에서 연결된 자재 (중복 제거)
  const boardMaterialIds = [...new Set(images.flatMap((im) => im.materials ?? []))];
  const boardMaterials = boardMaterialIds.map((id) => matCatalog[id]).filter(Boolean);
  const priceSum = boardMaterials.reduce((s, m) => s + (m.unit_price ?? 0), 0);

  // 스타일 프리셋 저장 — 보드의 자재 조합·컨셉을 프리셋으로
  async function savePreset() {
    if (!boardId || !board) return;
    const name = window.prompt('프리셋 이름을 입력하세요', `${board.title} 스타일`);
    if (!name?.trim()) return;
    const supabase = createBrowserSupabase();
    const { error: insErr } = await supabase.from('mb_style_presets').insert({
      board_id: boardId,
      name: name.trim(),
      notes: board.concept,
      material_ids: boardMaterialIds,
      cover_url: board.cover_url, // 기준 무드 이미지를 프리셋 커버로 (색상 추출 원본)
    });
    if (insErr) setError(`프리셋 저장 실패: ${insErr.message}`);
    else window.alert('프리셋으로 저장했습니다 — AI 스튜디오 > 스타일 프리셋에서 확인하세요.');
  }

  // ── Before/After 현장 비교 ──
  async function addPair() {
    const bf = beforeRef.current?.files?.[0];
    const af = afterRef.current?.files?.[0];
    if (!boardId || !bf || !af) {
      setError('Before 와 After 이미지를 각각 선택해 주세요.');
      return;
    }
    setPairBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    try {
      const up = async (file: File, label: string) => {
        const opt = await optimizeImage(file);
        const path = `${boardId}/cmp-${label}-${crypto.randomUUID()}.${opt.ext}`;
        const { error: e } = await supabase.storage.from('moodboards').upload(path, opt.blob, {
          cacheControl: '31536000',
          contentType: opt.type || undefined,
        });
        if (e) throw e;
        return supabase.storage.from('moodboards').getPublicUrl(path).data.publicUrl;
      };
      const [bu, au] = [await up(bf, 'before'), await up(af, 'after')];
      const { error: insErr } = await supabase
        .from('mb_compare_pairs')
        .insert({ board_id: boardId, before_url: bu, after_url: au });
      if (insErr) throw insErr;
      if (beforeRef.current) beforeRef.current.value = '';
      if (afterRef.current) afterRef.current.value = '';
      load();
    } catch (err) {
      setError(`비교 등록 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPairBusy(false);
    }
  }
  async function deletePair(p: Pair) {
    const supabase = createBrowserSupabase();
    const { error: delErr } = await supabase.from('mb_compare_pairs').delete().eq('id', p.id);
    if (delErr) {
      setError('삭제 권한이 없습니다.');
      return;
    }
    for (const u of [p.before_url, p.after_url]) {
      const m = u.split('/object/public/moodboards/')[1];
      if (m) await supabase.storage.from('moodboards').remove([decodeURIComponent(m)]);
    }
    load();
  }

  // 기준 무드보드 이미지 업로드/교체 — 이 보드의 출발점이 되는 원본
  async function onRefFile(files: FileList | null) {
    const file = files?.[0];
    if (!file || !boardId) return;
    const supabase = createBrowserSupabase();
    setRefUploading(true);
    setError(null);
    try {
      const opt = await optimizeImage(file);
      const path = `${boardId}/ref-${crypto.randomUUID()}.${opt.ext}`;
      const { error: upErr } = await supabase.storage.from('moodboards').upload(path, opt.blob, {
        cacheControl: '31536000',
        contentType: opt.type || undefined,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('moodboards').getPublicUrl(path);
      const { error: updErr } = await supabase
        .from('moodboards')
        .update({ cover_url: pub.publicUrl })
        .eq('id', boardId);
      if (updErr) throw updErr;
      setBoard((b) => (b ? { ...b, cover_url: pub.publicUrl } : b));
    } catch (err) {
      setError(`기준 이미지 업로드 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRefUploading(false);
    }
  }

  // 파생 이미지 중 하나를 기준으로 승격
  async function setAsReference(img: Img) {
    const supabase = createBrowserSupabase();
    const { error: updErr } = await supabase
      .from('moodboards')
      .update({ cover_url: img.url })
      .eq('id', boardId);
    if (!updErr) setBoard((b) => (b ? { ...b, cover_url: img.url } : b));
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
        <StudioNav />
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[#9BC9D8]/15 pb-5">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="mt-2 grid max-w-2xl gap-2 sm:grid-cols-2">
                <input
                  value={eTitle}
                  onChange={(e) => setETitle(e.target.value)}
                  placeholder="보드 이름"
                  className="rounded-md border border-[#9BC9D8]/30 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60 sm:col-span-2"
                />
                <input
                  value={eSite}
                  onChange={(e) => setESite(e.target.value)}
                  placeholder="현장 (선택)"
                  className="rounded-md border border-[#9BC9D8]/30 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                />
                <input
                  value={eConcept}
                  onChange={(e) => setEConcept(e.target.value)}
                  placeholder="컨셉 메모"
                  className="rounded-md border border-[#9BC9D8]/30 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                />
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={busy || !eTitle.trim()}
                    className="rounded-md bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-4 py-1.5 text-sm font-semibold text-[#0f0e0c] disabled:opacity-50"
                  >
                    {busy ? '저장 중…' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-md border border-[#9BC9D8]/30 px-4 py-1.5 text-sm text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0deb9]">
                  {board?.title ?? '무드보드'}
                </h1>
                <p className="mt-1 text-sm text-[#94aab8]">
                  {[board?.site, board?.concept].filter(Boolean).join(' · ') || '컨셉 메모 없음'}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!editing ? (
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-full border border-[#9BC9D8]/35 px-4 py-1.5 text-xs text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
                >
                  편집
                </button>
                <button
                  type="button"
                  onClick={deleteBoard}
                  disabled={busy}
                  className="rounded-full border border-[#E5726A]/40 px-4 py-1.5 text-xs text-[#E5726A] hover:bg-[#E5726A]/10 disabled:opacity-50"
                >
                  {busy ? '삭제 중…' : '보드 삭제'}
                </button>
              </>
            ) : null}
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
              {uploading > 0 ? `업로드 중… (${uploading})` : '+ 파생 이미지 업로드'}
            </button>
          </div>
        </header>

        {error ? <p className="mb-5 text-sm text-[#E5726A]">{error}</p> : null}

        {/* 기준 무드보드 — 이 보드의 출발점 */}
        <section className="mb-9">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold tracking-[0.3em] text-[#9BC9D8]/80">
              기준 무드보드 <span className="text-[#9BC9D8]/40">REFERENCE</span>
            </h2>
            <div className="flex items-center gap-1 rounded-full border border-[#9BC9D8]/20 p-0.5 text-[10px]">
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeRefSize(s)}
                  className={`rounded-full px-2.5 py-1 transition ${
                    refSize === s ? 'bg-[#9BC9D8]/20 text-[#dff4fa]' : 'text-[#94aab8] hover:text-[#c8e4ee]'
                  }`}
                >
                  {s === 'sm' ? '작게' : s === 'md' ? '중간' : '크게'}
                </button>
              ))}
            </div>
            <input
              ref={refFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onRefFile(e.target.files)}
            />
            <button
              type="button"
              onClick={() => refFileRef.current?.click()}
              disabled={refUploading}
              className="rounded-full border border-[#9BC9D8]/35 px-4 py-1.5 text-xs text-[#c8e4ee] hover:bg-[#9BC9D8]/10 disabled:opacity-50"
            >
              {refUploading ? '업로드 중…' : board?.cover_url ? '기준 이미지 변경' : '기준 이미지 업로드'}
            </button>
          </div>
          {board?.cover_url ? (
            <button
              type="button"
              onClick={() => setRefView(true)}
              title="클릭하면 크게 보기"
              className="group block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={board.cover_url}
                alt="기준 무드보드"
                className={`rounded-xl border border-[#E8C99B]/25 object-cover shadow-[0_0_60px_-24px_rgba(214,190,145,0.45)] transition group-hover:brightness-110 ${
                  refSize === 'sm'
                    ? 'h-44 w-auto max-w-full'
                    : refSize === 'md'
                      ? 'h-72 w-auto max-w-full'
                      : 'max-h-[46vh] w-full'
                }`}
              />
            </button>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[#9BC9D8]/25 text-sm text-[#94aab8]">
              기준이 될 무드보드 이미지를 먼저 올려주세요 — 여기서 파생 이미지들이 시작됩니다
            </div>
          )}
        </section>

        {/* 파생 이미지 */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.3em] text-[#9BC9D8]/80">
            파생 이미지 <span className="text-[#9BC9D8]/40">DERIVED · {images.length}</span>
          </h2>
        </div>
        {images.length === 0 && !error ? (
          <p className="mt-10 text-center text-sm text-[#94aab8]">
            아직 파생 이미지가 없습니다 — 업로드 버튼, 화면에 드래그, 또는 Ctrl+V 붙여넣기로 올릴 수 있습니다.
          </p>
        ) : null}

        {/* 메이슨리 갤러리 */}
        <div
          className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
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

        {/* ── 연결된 자재 (BOC 통합 자재) ── */}
        <section className="mt-12">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold tracking-[0.3em] text-[#9BC9D8]/80">
              연결된 자재 <span className="text-[#9BC9D8]/40">MATERIALS · {boardMaterials.length}</span>
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={savePreset}
                disabled={boardMaterials.length === 0}
                className="rounded-full border border-[#E8C99B]/40 px-4 py-1.5 text-xs text-[#e8c99b] hover:bg-[#E8C99B]/10 disabled:opacity-40"
              >
                스타일 프리셋으로 저장
              </button>
              <Link
                href={`/studio/draft?board=${boardId ?? ''}`}
                className="rounded-full border border-[#9BC9D8]/35 px-4 py-1.5 text-xs text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
              >
                제안서 초안 만들기
              </Link>
            </div>
          </div>
          {boardMaterials.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#9BC9D8]/20 p-5 text-center text-sm text-[#94aab8]">
              아직 연결된 자재가 없습니다 — 파생 이미지를 눌러 전체화면에서 "자재 연결"로 BOC 통합
              자재를 붙여보세요. 붙는 순간 이 무드가 견적의 재료가 됩니다.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#9BC9D8]/12 text-left text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">
                    <th className="px-4 py-2.5">자재</th>
                    <th className="px-4 py-2.5">브랜드</th>
                    <th className="px-4 py-2.5">단위</th>
                    <th className="px-4 py-2.5 text-right">단가</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#9BC9D8]/8">
                  {boardMaterials.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2 text-[#ebf1f5]">{m.name}</td>
                      <td className="px-4 py-2 text-[#94aab8]">{m.brand ?? '—'}</td>
                      <td className="px-4 py-2 text-[#94aab8]">{m.unit ?? '—'}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-[#e8c99b]">
                        {m.unit_price != null ? m.unit_price.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#101826]/60">
                    <td className="px-4 py-2.5 text-xs text-[#9BC9D8]/70" colSpan={3}>
                      참조 단가 합계 — 단위당 단가의 단순 합 (수량·시공비 미반영, 견적 아님)
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[#f0deb9]">
                      {priceSum.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── 현장 비교 Before / After ── */}
        <section className="mt-12">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold tracking-[0.3em] text-[#9BC9D8]/80">
              현장 비교 <span className="text-[#9BC9D8]/40">BEFORE / AFTER · {pairs.length}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-[#94aab8]">
                Before
                <input ref={beforeRef} type="file" accept="image/*" className="w-44 text-[10px]" />
              </label>
              <label className="flex items-center gap-1.5 text-[#94aab8]">
                After
                <input ref={afterRef} type="file" accept="image/*" className="w-44 text-[10px]" />
              </label>
              <button
                type="button"
                onClick={addPair}
                disabled={pairBusy}
                className="rounded-full bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-4 py-1.5 font-semibold text-[#0f0e0c] disabled:opacity-50"
              >
                {pairBusy ? '등록 중…' : '비교 등록'}
              </button>
            </div>
          </div>
          {pairs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#9BC9D8]/20 p-5 text-center text-sm text-[#94aab8]">
              현장 사진(Before)과 AI 시안/완공 사진(After)을 등록하면 슬라이더로 비교할 수 있습니다 —
              고객 제안·완공 보고에 그대로 쓰세요.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {pairs.map((p) => (
                <ComparePair key={p.id} pair={p} onDelete={() => deletePair(p)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 기준 이미지 전체화면 */}
      {refView && board?.cover_url ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-6 backdrop-blur-sm"
          onClick={() => setRefView(false)}
          role="dialog"
          aria-modal
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={board.cover_url}
            alt="기준 무드보드"
            className="max-h-[90vh] max-w-[94vw] rounded-md object-contain shadow-[0_0_80px_-20px_rgba(214,190,145,0.4)]"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs tracking-[0.3em] text-[#e8c99b]/80">
            REFERENCE · 아무 곳이나 눌러 닫기
          </p>
        </div>
      ) : null}

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
          {/* 자재 연결 — 이 이미지에 보이는 BOC 자재를 붙인다 */}
          <div
            className="absolute bottom-16 left-1/2 w-[min(640px,92vw)] -translate-x-1/2 rounded-xl border border-[#9BC9D8]/20 bg-[#070b12]/90 p-3 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2">
              <input
                key={images[lightbox].id}
                defaultValue={images[lightbox].caption ?? ''}
                placeholder="캡션 (예: 거실 웜그레이 톤 — Enter 저장)"
                className="min-w-0 flex-1 rounded-md border border-[#9BC9D8]/20 bg-transparent px-2.5 py-1 text-xs text-[#e6edf2] outline-none focus:border-[#9BC9D8]/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = (e.target as HTMLInputElement).value.trim();
                    saveCaption(images[lightbox], v);
                    setImages((arr) => arr.map((x) => (x.id === images[lightbox].id ? { ...x, caption: v || null } : x)));
                  }
                  e.stopPropagation();
                }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  saveCaption(images[lightbox], v);
                  setImages((arr) => arr.map((x) => (x.id === images[lightbox].id ? { ...x, caption: v || null } : x)));
                }}
              />
              <button
                type="button"
                onClick={() => setMatPanel((v) => !v)}
                className="shrink-0 rounded-full border border-[#9BC9D8]/25 px-3 py-1 text-[10px] text-[#94aab8] hover:text-[#c8e4ee]"
              >
                자재 {matPanel ? '접기 ▾' : '펼치기 ▴'}
              </button>
            </div>
            {matPanel ? (
            <>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] tracking-[0.25em] text-[#9BC9D8]/60">자재 연결</span>
              {(images[lightbox].materials ?? []).map((mid) => (
                <span
                  key={mid}
                  className="flex items-center gap-1 rounded-full border border-[#E8C99B]/30 bg-[#E8C99B]/8 px-2 py-0.5 text-[11px] text-[#e8c99b]"
                >
                  {matCatalog[mid]?.name ?? '자재'}
                  <button
                    type="button"
                    aria-label="자재 해제"
                    className="text-[#e8c99b]/60 hover:text-[#E5726A]"
                    onClick={() =>
                      setImageMaterials(
                        images[lightbox],
                        (images[lightbox].materials ?? []).filter((x) => x !== mid),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              value={matQuery}
              onChange={(e) => searchMaterials(e.target.value)}
              placeholder="자재 검색 (2자 이상 — 예: 타일, 마루, 도장)"
              className="w-full rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-1.5 text-sm text-[#e6edf2] outline-none focus:border-[#9BC9D8]/60"
            />
            {matResults.length > 0 ? (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-[#9BC9D8]/15 bg-[#0b111a]">
                {matResults.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => addMaterial(images[lightbox], m)}
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-[#9BC9D8]/8"
                    >
                      <span className="text-[#ebf1f5]">
                        {m.name} <span className="text-xs text-[#94aab8]">{m.brand ?? ''}</span>
                      </span>
                      <span className="text-xs tabular-nums text-[#e8c99b]">
                        {m.unit_price != null ? `${m.unit_price.toLocaleString()}/${m.unit ?? ''}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            </>
            ) : null}
          </div>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 text-xs text-[#94aab8]">
            <span>
              {lightbox + 1} / {images.length}
            </span>
            <button
              type="button"
              className="rounded-full border border-[#E8C99B]/40 px-3 py-1 text-[#e8c99b] hover:bg-[#E8C99B]/10"
              onClick={(e) => {
                e.stopPropagation();
                setAsReference(images[lightbox]);
              }}
            >
              기준으로 지정
            </button>
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
