'use client';

// AI 스튜디오 — 스타일 프리셋 (완성판, 대표 지시 2026-08-27)
// 무드보드에서 추출하거나 직접 만든 "시공 스타일 규격": 색상 팔레트 + BOC 자재 조합 + 공간/스타일 태그.
// 향후 헌법 엔진 5(DefaultSpec)·6(Preset)의 시드가 된다. 스펙 텍스트·CSV로 즉시 실무 반출.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';
import { StudioNav } from '../StudioNav';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Preset = {
  id: string;
  board_id: string | null;
  name: string;
  notes: string | null;
  material_ids: string[];
  colors: string[];
  space: string | null;
  style_tags: string[];
  cover_url: string | null;
  created_at: string;
};
type Mat = { id: string; name: string; brand: string | null; unit: string | null; unit_price: number | null };

const SPACES = ['거실', '주방', '침실', '욕실', '현관', '서재', '상업공간', '전체'];

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [mats, setMats] = useState<Record<string, Mat>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Preset | null>(null); // 편집 중 사본
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [spaceFilter, setSpaceFilter] = useState<string | null>(null);
  const [matQuery, setMatQuery] = useState('');
  const [matResults, setMatResults] = useState<Mat[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error: err } = await supabase
      .from('mb_style_presets')
      .select('id,board_id,name,notes,material_ids,colors,space,style_tags,cover_url,created_at')
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
      setMats((prev) => ({ ...prev, ...map }));
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2200);
  }

  // ── 생성 ──
  async function createPreset() {
    const name = window.prompt('새 프리셋 이름 (예: 웜 미니멀 · 무광 브라스)');
    if (!name?.trim()) return;
    const supabase = createBrowserSupabase();
    const { data, error: err } = await supabase
      .from('mb_style_presets')
      .insert({ name: name.trim() })
      .select('id,board_id,name,notes,material_ids,colors,space,style_tags,cover_url,created_at')
      .single();
    if (err) {
      setError(`생성 실패: ${err.message}`);
      return;
    }
    await load();
    setOpen((data as Preset).id);
    setEdit(data as Preset);
  }

  // ── 저장 ──
  async function save() {
    if (!edit || !edit.name.trim()) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { error: err } = await supabase
      .from('mb_style_presets')
      .update({
        name: edit.name.trim(),
        notes: edit.notes?.trim() || null,
        space: edit.space || null,
        style_tags: edit.style_tags,
        colors: edit.colors,
        material_ids: edit.material_ids,
        updated_at: new Date().toISOString(),
      })
      .eq('id', edit.id);
    setBusy(false);
    if (err) {
      setError('수정 권한이 없습니다 (본인 프리셋 또는 admin).');
      return;
    }
    setPresets((arr) => arr.map((p) => (p.id === edit.id ? edit : p)));
    setEdit(null);
    flash('저장했습니다');
  }

  async function remove(p: Preset) {
    if (!window.confirm(`"${p.name}" 프리셋을 삭제할까요?`)) return;
    const supabase = createBrowserSupabase();
    const { error: err } = await supabase.from('mb_style_presets').delete().eq('id', p.id);
    if (err) setError('삭제 권한이 없습니다 (본인 또는 admin).');
    else load();
  }

  // ── 자재 검색·연결 ──
  async function searchMaterials(v: string) {
    setMatQuery(v);
    if (v.trim().length < 2) {
      setMatResults([]);
      return;
    }
    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from('materials')
      .select('id,name,brand,unit,unit_price')
      .ilike('name', `%${v.trim()}%`)
      .limit(8);
    setMatResults((data ?? []) as Mat[]);
  }
  function addMat(m: Mat) {
    if (!edit || edit.material_ids.includes(m.id)) return;
    setMats((prev) => ({ ...prev, [m.id]: m }));
    setEdit({ ...edit, material_ids: [...edit.material_ids, m.id] });
    setMatQuery('');
    setMatResults([]);
  }

  // ── 커버 이미지에서 색상 추출 ──
  async function extractColors() {
    if (!edit?.cover_url) {
      setError('커버 이미지가 없는 프리셋입니다 — 원본 무드보드에서 저장하면 커버가 붙습니다.');
      return;
    }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = edit.cover_url;
      await img.decode();
      const c = document.createElement('canvas');
      const S = 64;
      c.width = S;
      c.height = S;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, S, S);
      const { data } = ctx.getImageData(0, 0, S, S);
      const bins: Record<string, { n: number; r: number; g: number; b: number }> = {};
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const e = bins[key] ?? { n: 0, r: 0, g: 0, b: 0 };
        bins[key] = { n: e.n + 1, r: e.r + r, g: e.g + g, b: e.b + b };
      }
      const hex = Object.values(bins)
        .sort((a, b) => b.n - a.n)
        .slice(0, 6)
        .map((e) => {
          const to = (v: number) => Math.round(v / e.n).toString(16).padStart(2, '0');
          return `#${to(e.r)}${to(e.g)}${to(e.b)}`.toUpperCase();
        });
      setEdit({ ...edit, colors: [...new Set([...edit.colors, ...hex])].slice(0, 10) });
      flash('커버에서 색상 6종을 추출했습니다');
    } catch {
      setError('색상 추출에 실패했습니다 — 이미지를 불러올 수 없습니다.');
    }
  }

  // ── 반출 ──
  function specText(p: Preset) {
    const ms = p.material_ids.map((id) => mats[id]).filter(Boolean);
    return (
      `[ECOREAN 스타일 규격] ${p.name}\n` +
      (p.space ? `적용 공간: ${p.space}\n` : '') +
      (p.style_tags.length ? `스타일: ${p.style_tags.join(' · ')}\n` : '') +
      (p.notes ? `컨셉: ${p.notes}\n` : '') +
      (p.colors.length ? `색상: ${p.colors.join('  ')}\n` : '') +
      `\n자재 (${ms.length}종)\n` +
      (ms.length
        ? ms
            .map(
              (m) =>
                `  · ${m.name}${m.brand ? ` (${m.brand})` : ''}${
                  m.unit_price != null ? ` — ${m.unit_price.toLocaleString()}원/${m.unit ?? '단위'}` : ''
                }`,
            )
            .join('\n')
        : '  · (없음)') +
      `\n\n※ 단가는 자재 단위당 참조가이며 수량·시공비 미반영. 정식 견적은 실측 후 산출.\n`
    );
  }
  async function copySpec(p: Preset) {
    try {
      await navigator.clipboard.writeText(specText(p));
      flash('스펙 텍스트를 복사했습니다');
    } catch {
      setError('복사 실패 — 브라우저 권한을 확인해 주세요.');
    }
  }
  function exportCsv(p: Preset) {
    const ms = p.material_ids.map((id) => mats[id]).filter(Boolean);
    const rows = [
      ['자재명', '브랜드', '단위', '참조단가'],
      ...ms.map((m) => [m.name, m.brand ?? '', m.unit ?? '', String(m.unit_price ?? '')]),
    ];
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name}_자재.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(
    () =>
      presets.filter((p) => {
        const k = q.trim().toLowerCase();
        const hitQ =
          !k ||
          [p.name, p.notes, p.space, ...(p.style_tags ?? [])].some((v) => v?.toLowerCase().includes(k));
        const hitSpace = !spaceFilter || p.space === spaceFilter;
        return hitQ && hitSpace;
      }),
    [presets, q, spaceFilter],
  );

  function sum(p: Preset) {
    return p.material_ids.reduce((s, id) => s + (mats[id]?.unit_price ?? 0), 0);
  }

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-5xl">
        <StudioNav />
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#9BC9D8]/15 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#f0deb9]">
              AI 스튜디오 · 스타일 프리셋
            </h1>
            <p className="mt-1 text-sm text-[#94aab8]">
              색상 팔레트 + 자재 조합 + 적용 공간을 하나의 시공 규격으로 저장합니다. 스펙 복사·CSV로
              발주·스펙북에 그대로 옮겨 쓰세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="프리셋 검색"
              className="w-48 rounded-full border border-[#9BC9D8]/25 bg-[#0b111a] px-4 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
            <button
              type="button"
              onClick={createPreset}
              className="rounded-full border border-[#E8C99B]/40 px-5 py-2 text-sm font-medium text-[#e8c99b] transition hover:bg-[#E8C99B]/10"
            >
              + 새 프리셋
            </button>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSpaceFilter(null)}
            className={`rounded-full border px-3 py-1 ${!spaceFilter ? 'border-[#f0deb9]/60 text-[#f0deb9]' : 'border-[#9BC9D8]/25 text-[#94aab8]'}`}
          >
            전체 공간
          </button>
          {SPACES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpaceFilter((v) => (v === s ? null : s))}
              className={`rounded-full border px-3 py-1 ${spaceFilter === s ? 'border-[#9BC9D8]/60 bg-[#9BC9D8]/12 text-[#dff4fa]' : 'border-[#9BC9D8]/20 text-[#94aab8] hover:text-[#c8e4ee]'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {error ? <p className="mb-4 text-sm text-[#E5726A]">{error}</p> : null}
        {notice ? <p className="mb-4 text-sm text-[#86efac]">{notice}</p> : null}
        {loading ? <p className="text-sm text-[#94aab8]">불러오는 중…</p> : null}
        {!loading && filtered.length === 0 && !error ? (
          <p className="mt-16 text-center text-sm text-[#94aab8]">
            {presets.length === 0
              ? '아직 프리셋이 없습니다 — "+ 새 프리셋"으로 만들거나, 무드보드에서 "스타일 프리셋으로 저장"을 눌러보세요.'
              : '조건에 맞는 프리셋이 없습니다.'}
          </p>
        ) : null}

        <div className="space-y-3">
          {filtered.map((p) => {
            const isOpen = open === p.id;
            const editing = edit?.id === p.id;
            const cur = editing ? edit : p;
            return (
              <div key={p.id} className="overflow-hidden rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/80">
                <button
                  type="button"
                  onClick={() => {
                    setOpen((v) => (v === p.id ? null : p.id));
                    setEdit(null);
                  }}
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
                >
                  {p.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#9BC9D8]/20 text-[#9BC9D8]/40">
                      ✦
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[#ecf2f5]">{p.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94aab8]">
                      {p.space ? <span className="text-[#9BC9D8]">{p.space}</span> : null}
                      {p.style_tags?.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-full border border-[#9BC9D8]/25 px-1.5">
                          {t}
                        </span>
                      ))}
                      <span className="truncate">{p.notes ?? ''}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {p.colors?.slice(0, 5).map((c) => (
                      <span
                        key={c}
                        className="h-4 w-4 rounded-sm border border-white/15"
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </span>
                  <span className="shrink-0 text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">
                    {p.material_ids.length} MAT
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-[#9BC9D8]/12 px-5 py-4">
                    {editing ? (
                      <div className="mb-5 space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={cur.name}
                            onChange={(e) => setEdit({ ...cur, name: e.target.value })}
                            placeholder="프리셋 이름"
                            className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                          />
                          <select
                            value={cur.space ?? ''}
                            onChange={(e) => setEdit({ ...cur, space: e.target.value || null })}
                            className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none"
                          >
                            <option value="">— 적용 공간 —</option>
                            {SPACES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                        <input
                          value={cur.notes ?? ''}
                          onChange={(e) => setEdit({ ...cur, notes: e.target.value })}
                          placeholder="컨셉 메모 (예: 웜톤 오크 + 무광 브라스)"
                          className="w-full rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                        />

                        {/* 스타일 태그 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] tracking-[0.25em] text-[#9BC9D8]/60">스타일</span>
                          {cur.style_tags.map((t) => (
                            <span
                              key={t}
                              className="flex items-center gap-1 rounded-full border border-[#9BC9D8]/30 px-2 py-0.5 text-xs text-[#c8e4ee]"
                            >
                              {t}
                              <button
                                type="button"
                                onClick={() => setEdit({ ...cur, style_tags: cur.style_tags.filter((x) => x !== t) })}
                                className="text-[#94aab8] hover:text-[#E5726A]"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <input
                            placeholder="태그 입력 후 Enter"
                            className="w-40 rounded-full border border-[#9BC9D8]/20 bg-[#04070c] px-3 py-0.5 text-xs outline-none focus:border-[#9BC9D8]/50"
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              const v = (e.target as HTMLInputElement).value.trim();
                              if (v && !cur.style_tags.includes(v)) {
                                setEdit({ ...cur, style_tags: [...cur.style_tags, v] });
                              }
                              (e.target as HTMLInputElement).value = '';
                            }}
                          />
                        </div>

                        {/* 색상 팔레트 */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] tracking-[0.25em] text-[#9BC9D8]/60">색상</span>
                          {cur.colors.map((c) => (
                            <span key={c} className="group relative">
                              <span
                                className="block h-7 w-7 rounded border border-white/15"
                                style={{ background: c }}
                                title={c}
                              />
                              <button
                                type="button"
                                onClick={() => setEdit({ ...cur, colors: cur.colors.filter((x) => x !== c) })}
                                className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 rounded-full bg-[#E5726A] text-[10px] leading-4 text-white group-hover:block"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <input
                            type="color"
                            onChange={(e) => {
                              const v = e.target.value.toUpperCase();
                              if (!cur.colors.includes(v)) setEdit({ ...cur, colors: [...cur.colors, v] });
                            }}
                            className="h-7 w-9 cursor-pointer rounded border border-[#9BC9D8]/25 bg-transparent"
                            title="색상 추가"
                          />
                          <button
                            type="button"
                            onClick={extractColors}
                            className="rounded-full border border-[#9BC9D8]/30 px-3 py-1 text-xs text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
                          >
                            커버에서 추출
                          </button>
                        </div>

                        {/* 자재 검색 */}
                        <div>
                          <input
                            value={matQuery}
                            onChange={(e) => searchMaterials(e.target.value)}
                            placeholder="자재 추가 — 2자 이상 검색 (예: 타일, 마루)"
                            className="w-full rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                          />
                          {matResults.length > 0 ? (
                            <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-[#9BC9D8]/15 bg-[#0b111a]">
                              {matResults.map((m) => (
                                <li key={m.id}>
                                  <button
                                    type="button"
                                    onClick={() => addMat(m)}
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
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={save}
                            disabled={busy || !cur.name.trim()}
                            className="rounded-md bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-5 py-1.5 text-sm font-semibold text-[#0f0e0c] disabled:opacity-50"
                          >
                            {busy ? '저장 중…' : '저장'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEdit(null)}
                            className="rounded-md border border-[#9BC9D8]/30 px-4 py-1.5 text-sm text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* 자재 목록 */}
                    {cur.material_ids.length === 0 ? (
                      <p className="text-sm text-[#94aab8]">연결된 자재 없음</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#9BC9D8]/12 text-left text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">
                            <th className="py-2">자재</th>
                            <th className="py-2">브랜드</th>
                            <th className="py-2">단위</th>
                            <th className="py-2 text-right">참조 단가</th>
                            {editing ? <th className="w-8" /> : null}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#9BC9D8]/8">
                          {cur.material_ids.map((id) => (
                            <tr key={id}>
                              <td className="py-1.5 text-[#ebf1f5]">{mats[id]?.name ?? '—'}</td>
                              <td className="py-1.5 text-[#94aab8]">{mats[id]?.brand ?? '—'}</td>
                              <td className="py-1.5 text-[#94aab8]">{mats[id]?.unit ?? '—'}</td>
                              <td className="py-1.5 text-right tabular-nums text-[#e8c99b]">
                                {mats[id]?.unit_price != null ? mats[id]!.unit_price!.toLocaleString() : '—'}
                              </td>
                              {editing ? (
                                <td className="py-1.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEdit({ ...cur, material_ids: cur.material_ids.filter((x) => x !== id) })
                                    }
                                    className="text-[#E5726A]/80 hover:text-[#E5726A]"
                                  >
                                    ×
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          ))}
                          <tr className="bg-[#101826]/60">
                            <td className="py-2 text-xs text-[#9BC9D8]/70" colSpan={3}>
                              참조 단가 합계 — 단위당 단가의 단순 합 (수량·시공비 미반영, 견적 아님)
                            </td>
                            <td className="py-2 text-right font-semibold tabular-nums text-[#f0deb9]">
                              {sum(cur).toLocaleString()}
                            </td>
                            {editing ? <td /> : null}
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {!editing ? (
                      <div className="mt-4 flex flex-wrap gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => setEdit({ ...p })}
                          className="rounded-full border border-[#9BC9D8]/35 px-3.5 py-1 text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
                        >
                          편집
                        </button>
                        <button
                          type="button"
                          onClick={() => copySpec(p)}
                          className="rounded-full border border-[#E8C99B]/35 px-3.5 py-1 text-[#e8c99b] hover:bg-[#E8C99B]/10"
                        >
                          스펙 복사
                        </button>
                        <button
                          type="button"
                          onClick={() => exportCsv(p)}
                          className="rounded-full border border-[#9BC9D8]/25 px-3.5 py-1 text-[#94aab8] hover:text-[#c8e4ee]"
                        >
                          자재 CSV
                        </button>
                        {p.board_id ? (
                          <Link
                            href={`/studio/moodboards/view?id=${p.board_id}`}
                            className="rounded-full border border-[#9BC9D8]/25 px-3.5 py-1 text-[#9BC9D8] hover:bg-[#9BC9D8]/10"
                          >
                            원본 무드보드
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => remove(p)}
                          className="ml-auto rounded-full border border-[#E5726A]/35 px-3.5 py-1 text-[#E5726A]/90 hover:bg-[#E5726A]/10"
                        >
                          삭제
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
