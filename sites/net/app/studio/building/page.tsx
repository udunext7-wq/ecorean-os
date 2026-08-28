'use client';

// AI 스튜디오 — 건축물대장 조회 (공공데이터포털 연동, 대표 지시 2026-08-27 / 완성 2026-08-28)
// 주소 한 줄 → 법정동코드 자동 변환 → 지번의 전 동 표제부 → 동별 층별개요까지 한 화면에서 끝낸다.
// 연면적·세대·구조·준공연도는 견적 물량과 공정표 공기의 출발점이 된다. (합법 무료 국가 데이터)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';
import { StudioNav } from '../StudioNav';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Bld = {
  mgm_pk?: string;
  sigungu_cd?: string;
  bjdong_cd?: string;
  bun?: string;
  ji?: string;
  address: string | null;
  bld_nm: string | null;
  main_purps: string | null;
  strct: string | null;
  plat_area: number | null;
  arch_area: number | null;
  tot_area: number | null;
  grnd_flr_cnt: number | null;
  ugrnd_flr_cnt: number | null;
  use_apr_day: string | null;
  // 상세 (raw 파생)
  dong_nm?: string | null;
  regstr_gb?: string | null;
  regstr_kind?: string | null;
  main_atch?: string | null;
  etc_purps?: string | null;
  roof?: string | null;
  hhld_cnt?: number | null;
  fmly_cnt?: number | null;
  ho_cnt?: number | null;
  heit?: number | null;
  bc_rat?: number | null;
  vl_rat?: number | null;
  tot_dong_area?: number | null;
  elvt_cnt?: number | null;
  parking_cnt?: number | null;
  engr_grade?: string | null;
  quake_applied?: boolean;
  pms_day?: string | null;
  new_plat_plc?: string | null;
};

type Floor = {
  mgm_pk: string;
  gb: string | null;
  flr_no: number | null;
  flr_nm: string | null;
  purps: string | null;
  etc_purps: string | null;
  strct: string | null;
  area: number | null;
};
type FloorGroup = { mgm_pk: string; dong_nm: string | null; bld_nm: string | null; floors: Floor[] };

type AddrHit = {
  jibun: string;
  road: string | null;
  bldNm: string | null;
  sigunguCd: string;
  bjdongCd: string;
  bun: string;
  ji: string;
  platGbCd: '0' | '1';
};

type Loc = { sigungu: string; bjdong: string; bun: string; ji: string; plat: '0' | '1' };

const PY = 3.3058;
const fmt = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: digits });
const py = (m2: number | null | undefined) => (m2 == null ? '—' : fmt(m2 / PY, 1));

/** 20221014 → 2022-10-14 */
function ymd(v: string | null | undefined) {
  if (!v || v.length < 8) return v || '—';
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}
/** 사용승인일 → 경과 연수 (리모델링 판단의 1차 기준) */
function ageYears(v: string | null | undefined) {
  if (!v || v.length < 4) return null;
  const y = Number(v.slice(0, 4));
  if (!Number.isFinite(y) || y < 1900) return null;
  return new Date().getFullYear() - y;
}

export default function BuildingPage() {
  // 검색 입력
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<AddrHit[] | null>(null);
  const [addrMsg, setAddrMsg] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loc, setLoc] = useState<Loc>({ sigungu: '', bjdong: '', bun: '', ji: '0', plat: '0' });

  // 조회 결과
  const [list, setList] = useState<Bld[]>([]);
  const [sel, setSel] = useState<Bld | null>(null);
  const [meta, setMeta] = useState<{ source: string; fetchedAt: string | null; total: number; truncated: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; applyUrl?: string } | null>(null);
  const [dongQ, setDongQ] = useState('');

  // 층별개요 (지번 단위로 한 번 받아 동별로 나눠 쓴다)
  const [floors, setFloors] = useState<Record<string, FloorGroup> | null>(null);
  const [floorLoading, setFloorLoading] = useState(false);
  const [floorError, setFloorError] = useState<string | null>(null);
  const [floorMeta, setFloorMeta] = useState<{ source: string; fetchedAt: string | null } | null>(null);

  const [recent, setRecent] = useState<Bld[]>([]);
  const [status, setStatus] = useState<{
    state: string;
    message?: string;
    applyUrl?: string;
    myKeyUrl?: string;
    address?: {
      provider: 'JUSO' | 'KAKAO' | null;
      state: 'NO_PROVIDER' | 'READY' | 'DENIED' | 'ERROR';
      message?: string;
      jusoApplyUrl: string;
      kakaoApplyUrl: string;
    };
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const locRef = useRef(loc);
  locRef.current = loc;

  // 연동 상태 실측 — 키 보유 여부뿐 아니라 '이 API 활용신청 여부'까지 확인
  useEffect(() => {
    fetch('/api/gov/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const loadRecent = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from('gov_building_cache')
      .select(
        'sigungu_cd,bjdong_cd,bun,ji,mgm_pk,address,bld_nm,main_purps,strct,plat_area,arch_area,tot_area,grnd_flr_cnt,ugrnd_flr_cnt,use_apr_day',
      )
      .order('fetched_at', { ascending: false })
      .limit(8);
    setRecent((data ?? []) as Bld[]);
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent, list]);

  // ── 주소 검색 ────────────────────────────────────────────────
  async function searchAddr() {
    const keyword = q.trim();
    if (keyword.length < 2) return;
    setSearching(true);
    setAddrMsg(null);
    setHits(null);
    try {
      const res = await fetch(`/api/gov/address?q=${encodeURIComponent(keyword)}`);
      const j = await res.json();
      if (!res.ok) {
        setAddrMsg(j.message ?? j.error ?? '주소 검색 실패');
        if (j.error === 'NO_PROVIDER') setShowCode(true);
        return;
      }
      setHits(j.results as AddrHit[]);
      if ((j.results as AddrHit[]).length === 0) setAddrMsg('일치하는 지번이 없습니다. 동·번지까지 입력해 보세요.');
    } catch (e) {
      setAddrMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  function pickHit(h: AddrHit) {
    const next: Loc = {
      sigungu: h.sigunguCd,
      bjdong: h.bjdongCd,
      bun: h.bun,
      ji: h.ji || '0',
      plat: h.platGbCd,
    };
    setLoc(next);
    setHits(null);
    setQ(h.road || h.jibun);
    lookup(next);
  }

  // ── 대장 조회 ────────────────────────────────────────────────
  const lookup = useCallback(async (target?: Loc, fresh = false) => {
    const l = target ?? locRef.current;
    if (!/^\d{5}$/.test(l.sigungu) || !/^\d{5}$/.test(l.bjdong) || !l.bun) {
      setError({ message: '시군구코드 5자리·법정동코드 5자리·번지를 확인해 주세요.' });
      return;
    }
    setLoading(true);
    setError(null);
    setFloors(null);
    setFloorError(null);
    setFloorMeta(null);
    setDongQ('');
    try {
      const qs = new URLSearchParams({
        sigunguCd: l.sigungu,
        bjdongCd: l.bjdong,
        bun: l.bun,
        ji: l.ji || '0',
        platGbCd: l.plat,
      });
      if (fresh) qs.set('fresh', '1');
      const res = await fetch(`/api/gov/building?${qs.toString()}`);
      const j = await res.json();
      if (!res.ok) {
        setList([]);
        setSel(null);
        setMeta(null);
        setError({ message: j.message ?? j.error ?? '조회 실패', applyUrl: j.applyUrl });
        return;
      }
      const bs = (j.buildings ?? []) as Bld[];
      setList(bs);
      setSel(bs[0] ?? null);
      setMeta({
        source: j.source,
        fetchedAt: j.fetchedAt ?? null,
        total: Number(j.totalCount ?? bs.length),
        truncated: Boolean(j.truncated),
      });
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadFloors(fresh = false) {
    const l = locRef.current;
    setFloorLoading(true);
    setFloorError(null);
    try {
      const qs = new URLSearchParams({
        sigunguCd: l.sigungu,
        bjdongCd: l.bjdong,
        bun: l.bun,
        ji: l.ji || '0',
        platGbCd: l.plat,
        op: 'floors',
      });
      if (fresh) qs.set('fresh', '1');
      const res = await fetch(`/api/gov/building?${qs.toString()}`);
      const j = await res.json();
      if (!res.ok) {
        setFloorError(j.message ?? j.error ?? '층별개요 조회 실패');
        return;
      }
      setFloors(j.byDong as Record<string, FloorGroup>);
      setFloorMeta({ source: j.source, fetchedAt: j.fetchedAt ?? null });
    } catch (e) {
      setFloorError(e instanceof Error ? e.message : String(e));
    } finally {
      setFloorLoading(false);
    }
  }

  /** 최근 조회 행 클릭 → 그 지번으로 되돌아간다 */
  function restore(r: Bld) {
    if (!r.sigungu_cd || !r.bjdong_cd || !r.bun) return;
    const next: Loc = {
      sigungu: r.sigungu_cd,
      bjdong: r.bjdong_cd,
      bun: String(Number(r.bun)),
      ji: String(Number(r.ji ?? '0')),
      plat: '0',
    };
    setLoc(next);
    setQ(r.address?.split(' / ')[0] ?? '');
    lookup(next);
  }

  /** 10자리 법정동코드를 붙여넣으면 5+5 로 자동 분리 */
  function onSigunguChange(v: string) {
    const d = v.replace(/\D/g, '');
    if (d.length >= 10) {
      setLoc((p) => ({ ...p, sigungu: d.slice(0, 5), bjdong: d.slice(5, 10) }));
      return;
    }
    setLoc((p) => ({ ...p, sigungu: d.slice(0, 5) }));
  }

  const selFloors = sel?.mgm_pk && floors ? floors[sel.mgm_pk] : undefined;
  const totals = useMemo(() => {
    const area = list.reduce((s, b) => s + (b.tot_area ?? 0), 0);
    const hhld = list.reduce((s, b) => s + (b.hhld_cnt ?? 0), 0);
    return { area, hhld };
  }, [list]);
  const shown = useMemo(() => {
    const needle = dongQ.trim();
    if (!needle) return list;
    return list.filter((b) => `${b.bld_nm ?? ''} ${b.dong_nm ?? ''}`.includes(needle));
  }, [list, dongQ]);

  const age = ageYears(sel?.use_apr_day);
  const perHhld = sel?.hhld_cnt && sel?.tot_area ? sel.tot_area / sel.hhld_cnt : null;

  function copySpec() {
    if (!sel) return;
    const lines = [
      `${sel.bld_nm ?? '(건물명 없음)'} — 건축물대장 표제부`,
      `주소: ${sel.address ?? '—'}`,
      `주용도: ${sel.main_purps ?? '—'}${sel.etc_purps ? ` (${sel.etc_purps})` : ''}`,
      `구조: ${sel.strct ?? '—'} / 지붕: ${sel.roof ?? '—'}`,
      `연면적: ${fmt(sel.tot_area, 2)}㎡ (${py(sel.tot_area)}평)`,
      `대지면적: ${fmt(sel.plat_area, 2)}㎡ / 건축면적: ${fmt(sel.arch_area, 2)}㎡`,
      `층수: 지상 ${sel.grnd_flr_cnt ?? '—'} / 지하 ${sel.ugrnd_flr_cnt ?? '—'}`,
      `세대/가구/호: ${sel.hhld_cnt ?? 0} / ${sel.fmly_cnt ?? 0} / ${sel.ho_cnt ?? 0}`,
      `사용승인: ${ymd(sel.use_apr_day)}${age != null ? ` (${age}년 경과)` : ''}`,
      `승강기: ${sel.elvt_cnt ?? 0}대 / 주차: ${sel.parking_cnt ?? 0}대`,
      `내진설계 적용: ${sel.quake_applied ? '예' : '표기 없음'}`,
      '출처: 국토교통부 건축물대장정보 서비스(공공데이터포털)',
    ];
    navigator.clipboard?.writeText(lines.join('\n')).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  }

  function exportCsv() {
    if (!list.length) return;
    const head = ['동', '건물명', '주용도', '구조', '연면적(㎡)', '건축면적(㎡)', '지상층', '지하층', '세대', '사용승인'];
    const body = list.map((b) => [
      b.dong_nm ?? '',
      b.bld_nm ?? '',
      b.main_purps ?? '',
      b.strct ?? '',
      b.tot_area ?? '',
      b.arch_area ?? '',
      b.grnd_flr_cnt ?? '',
      b.ugrnd_flr_cnt ?? '',
      b.hhld_cnt ?? '',
      ymd(b.use_apr_day),
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `건축물대장_${loc.sigungu}${loc.bjdong}_${loc.bun}-${loc.ji}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const scheduleHref = sel
    ? `/studio/schedule?${new URLSearchParams({
        domain: (sel.main_purps ?? '').includes('주택') ? '인테리어' : '',
        area: sel.tot_area ? String(Math.round(sel.tot_area)) : '',
        bld: sel.bld_nm ?? '',
      }).toString()}`
    : '/studio/schedule';

  const provider = status?.address?.provider ?? null;
  const addrState = status?.address?.state ?? 'NO_PROVIDER';

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-4xl">
        <StudioNav />
        <header className="mb-6 border-b border-[#9BC9D8]/15 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#f0deb9]">AI 스튜디오 · 건축물대장 조회</h1>
          <p className="mt-1 text-sm text-[#94aab8]">
            국토교통부 <b className="text-[#c8e4ee]">건축물대장정보 서비스</b>(공공데이터포털 무료 개방)에서 주소로
            연면적·구조·층수·용도·세대수를 가져옵니다. 현장 실측 전 기본 제원을 확보해 견적·공정표의 출발점으로 씁니다.
          </p>
        </header>

        {status && status.state !== 'READY' ? (
          <div className="mb-6 rounded-xl border border-[#E8C99B]/35 bg-[#E8C99B]/[0.06] p-5">
            <p className="text-[10px] tracking-[0.3em] text-[#e8c99b]/80">
              {status.state === 'NOT_APPLIED' ? '활용신청 1건만 남았습니다 · 무료 · 약 2분' : '인증키 설정 필요 · 무료 · 약 5분'}
            </p>
            <h2 className="mt-1 text-base font-semibold text-[#f0deb9]">
              {status.state === 'NOT_APPLIED'
                ? '인증키는 이미 있습니다 — 건축물대장 API만 추가 신청하면 바로 열립니다'
                : '공공데이터포털 인증키를 등록하면 바로 조회됩니다'}
            </h2>
            {status.message ? <p className="mt-1.5 text-xs text-[#94aab8]">{status.message}</p> : null}
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-[#c8d6de]">
              {status.state === 'NOT_APPLIED' ? (
                <>
                  <li>
                    <b className="text-[#e8c99b]">1.</b> 아래 <b>건축물대장 API 활용신청</b> 버튼 → 로그인 → 활용신청
                    (자동 승인, 기존 키 그대로 사용)
                  </li>
                  <li>
                    <b className="text-[#e8c99b]">2.</b> 승인 반영까지 수 분 소요 — 이 페이지를 새로고침하면 상태가
                    <b className="text-[#86efac]"> 연결됨</b>으로 바뀝니다
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <b className="text-[#e8c99b]">1.</b> 아래 버튼으로 이동해 <b>활용신청</b> (로그인 필요, 자동 승인)
                  </li>
                  <li>
                    <b className="text-[#e8c99b]">2.</b> 마이페이지 → 개발계정 → <b>일반 인증키(Decoding)</b> 복사
                  </li>
                  <li>
                    <b className="text-[#e8c99b]">3.</b> Vercel → Settings → Environment Variables →{' '}
                    <code className="rounded bg-[#0b111a] px-1.5 py-0.5 text-[#9BC9D8]">DATA_GO_KR_KEY</code> 등록 후 재배포
                  </li>
                </>
              )}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <a
                href="https://www.data.go.kr/data/15134735/openapi.do"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-5 py-2 font-semibold text-[#0f0e0c]"
              >
                건축물대장 API 활용신청 →
              </a>
              <a
                href="https://www.data.go.kr/iim/api/selectAPIAcountView.do"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#9BC9D8]/35 px-4 py-2 text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
              >
                내 인증키 확인
              </a>
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#9BC9D8]/25 px-4 py-2 text-[#94aab8] hover:text-[#c8e4ee]"
              >
                Vercel 환경변수 설정
              </a>
            </div>
          </div>
        ) : null}

        {status?.state === 'READY' ? (
          <p className="mb-4 text-xs text-[#86efac]">
            공공데이터포털 연결됨 · 조회 가능
            {addrState === 'READY' ? (
              <span className="ml-2 text-[#9BC9D8]/70">
                주소 검색 가능: {provider === 'JUSO' ? '도로명주소 API' : '카카오 로컬'}
              </span>
            ) : addrState === 'NO_PROVIDER' ? (
              <span className="ml-2 text-[#e8c99b]/80">주소 검색 키 미등록 — 코드 직접 입력으로 조회하세요</span>
            ) : (
              <span className="ml-2 text-[#e8c99b]">
                주소 검색 불가 ({provider === 'JUSO' ? '도로명주소 API' : '카카오 로컬'}) —{' '}
                {status.address?.message ?? '권한을 확인해 주세요'}{' '}
                <a
                  href={provider === 'JUSO' ? status.address?.jusoApplyUrl : status.address?.kakaoApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9BC9D8] underline"
                >
                  설정 열기
                </a>
              </span>
            )}
          </p>
        ) : null}

        {/* 주소 검색 */}
        <div className="mb-3 rounded-xl border border-[#9BC9D8]/20 bg-[#0b111a]/80 p-5">
          <label className="flex flex-col gap-1 text-xs">
            <span className="tracking-[0.2em] text-[#9BC9D8]/60">주소로 조회</span>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchAddr();
                }}
                placeholder="예) 강남구 개포동 12   ·   서초대로 74길 33"
                className="grow rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
              />
              <button
                type="button"
                onClick={searchAddr}
                disabled={searching || q.trim().length < 2}
                className="rounded-md bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-5 py-2 text-sm font-semibold text-[#0f0e0c] disabled:opacity-40"
              >
                {searching ? '검색 중…' : '주소 검색'}
              </button>
            </div>
          </label>

          {addrMsg ? <p className="mt-2 text-xs text-[#e8c99b]">{addrMsg}</p> : null}

          {hits?.length ? (
            <ul className="mt-3 divide-y divide-[#9BC9D8]/10 overflow-hidden rounded-lg border border-[#9BC9D8]/20">
              {hits.map((h, i) => (
                <li key={`${h.sigunguCd}${h.bjdongCd}${h.bun}${h.ji}${i}`}>
                  <button
                    type="button"
                    onClick={() => pickHit(h)}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-[#9BC9D8]/8"
                  >
                    <span className="text-sm text-[#ecf2f5]">
                      {h.jibun}
                      {h.bldNm ? <span className="ml-2 text-xs text-[#e8c99b]">{h.bldNm}</span> : null}
                    </span>
                    <span className="text-[11px] text-[#94aab8]">
                      {h.road ?? '도로명 없음'}
                      <span className="ml-2 text-[#9BC9D8]/60">
                        {h.sigunguCd}-{h.bjdongCd} · {h.platGbCd === '1' ? '산 ' : ''}
                        {h.bun}
                        {h.ji !== '0' ? `-${h.ji}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="mt-3 text-[11px] text-[#9BC9D8]/70 underline underline-offset-2 hover:text-[#c8e4ee]"
          >
            {showCode ? '코드 직접 입력 닫기' : '코드로 직접 조회 (시군구·법정동코드)'}
          </button>

          {showCode ? (
            <div className="mt-3 grid gap-3 border-t border-[#9BC9D8]/12 pt-4 sm:grid-cols-[1fr_1fr_1fr_0.6fr_0.8fr_auto]">
              <label className="flex flex-col gap-1 text-xs">
                <span className="tracking-[0.2em] text-[#9BC9D8]/60">시군구코드 (5)</span>
                <input
                  value={loc.sigungu}
                  onChange={(e) => onSigunguChange(e.target.value)}
                  placeholder="11680"
                  inputMode="numeric"
                  className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="tracking-[0.2em] text-[#9BC9D8]/60">법정동코드 (5)</span>
                <input
                  value={loc.bjdong}
                  onChange={(e) => setLoc((p) => ({ ...p, bjdong: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                  placeholder="10300"
                  inputMode="numeric"
                  className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="tracking-[0.2em] text-[#9BC9D8]/60">번</span>
                <input
                  value={loc.bun}
                  onChange={(e) => setLoc((p) => ({ ...p, bun: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') lookup();
                  }}
                  placeholder="12"
                  inputMode="numeric"
                  className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="tracking-[0.2em] text-[#9BC9D8]/60">지</span>
                <input
                  value={loc.ji}
                  onChange={(e) => setLoc((p) => ({ ...p, ji: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') lookup();
                  }}
                  placeholder="0"
                  inputMode="numeric"
                  className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="tracking-[0.2em] text-[#9BC9D8]/60">지목</span>
                <select
                  value={loc.plat}
                  onChange={(e) => setLoc((p) => ({ ...p, plat: e.target.value === '1' ? '1' : '0' }))}
                  className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
                >
                  <option value="0">대지</option>
                  <option value="1">산</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => lookup()}
                disabled={loading || !loc.sigungu || !loc.bjdong || !loc.bun}
                className="self-end rounded-md border border-[#E8C99B]/45 px-5 py-2 text-sm font-semibold text-[#e8c99b] disabled:opacity-40"
              >
                {loading ? '조회 중…' : '대장 조회'}
              </button>
              <p className="text-[10px] leading-relaxed text-[#94aab8] sm:col-span-6">
                코드를 모르면{' '}
                <a
                  href="https://www.code.go.kr/stdcode/regCodeL.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9BC9D8] underline"
                >
                  행정표준코드 법정동코드 조회
                </a>
                에서 확인하세요 — 10자리를 시군구코드 칸에 붙여넣으면 5+5로 자동 분리됩니다. (예: 서울 강남구 개포동
                1168010300 → 11680 / 10300)
              </p>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-[#E5726A]/30 bg-[#E5726A]/5 p-5 text-sm">
            <p className="text-[#E5726A]">{error.message}</p>
            {error.applyUrl ? (
              <div className="mt-3 space-y-1.5 text-xs text-[#94aab8]">
                <p className="font-semibold text-[#c8e4ee]">설정 방법 (5분)</p>
                <p>
                  1.{' '}
                  <a href={error.applyUrl} target="_blank" rel="noopener noreferrer" className="text-[#9BC9D8] underline">
                    공공데이터포털 · 건축물대장정보 서비스
                  </a>{' '}
                  에서 <b>활용신청</b> (무료, 자동 승인)
                </p>
                <p>2. 마이페이지 → 개발계정 → 일반 인증키(Decoding) 복사</p>
                <p>
                  3. Vercel 프로젝트 → Settings → Environment Variables →{' '}
                  <code className="rounded bg-[#0b111a] px-1">DATA_GO_KR_KEY</code> 로 등록 후 재배포
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 동 목록 */}
        {list.length ? (
          <div className="mb-4 rounded-xl border border-[#9BC9D8]/20 bg-[#0b111a]/70 p-4">
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">
                이 지번의 건축물 {meta?.total ?? list.length}동 (표시 {list.length})
              </p>
              <p className="text-xs text-[#94aab8]">
                연면적 합계 <b className="text-[#e8c99b]">{fmt(totals.area)}㎡</b> ({fmt(totals.area / PY)}평)
                {totals.hhld ? <span className="ml-2">· 세대 합계 {fmt(totals.hhld)}세대</span> : null}
              </p>
              <span className="ml-auto flex items-center gap-2 text-[10px] text-[#9BC9D8]/60">
                {meta?.source === 'cache' ? '캐시' : '실시간 조회'}
                {meta?.fetchedAt ? ` · ${new Date(meta.fetchedAt).toLocaleString('ko-KR')}` : ''}
                <button
                  type="button"
                  onClick={() => lookup(undefined, true)}
                  disabled={loading}
                  className="rounded-full border border-[#9BC9D8]/25 px-2.5 py-0.5 text-[#94aab8] hover:text-[#c8e4ee] disabled:opacity-40"
                >
                  새로 받기
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-full border border-[#9BC9D8]/25 px-2.5 py-0.5 text-[#94aab8] hover:text-[#c8e4ee]"
                >
                  CSV
                </button>
              </span>
            </div>
            {meta?.truncated ? (
              <p className="mb-2 text-[11px] text-[#e8c99b]">
                동이 많아 상위 {list.length}동만 받았습니다 (전체 {meta.total}동).
              </p>
            ) : null}
            {list.length > 8 ? (
              <input
                value={dongQ}
                onChange={(e) => setDongQ(e.target.value)}
                placeholder="동 이름으로 거르기 (예: 306)"
                className="mb-2 w-full rounded-md border border-[#9BC9D8]/20 bg-[#04070c] px-3 py-1.5 text-xs outline-none focus:border-[#9BC9D8]/50"
              />
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {shown.map((b, i) => (
                <button
                  key={b.mgm_pk ?? i}
                  type="button"
                  onClick={() => setSel(b)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    sel === b
                      ? 'border-[#E8C99B]/60 bg-[#E8C99B]/10 text-[#f0deb9]'
                      : 'border-[#9BC9D8]/25 text-[#94aab8] hover:text-[#c8e4ee]'
                  }`}
                >
                  {b.bld_nm || (b.dong_nm ? `${b.dong_nm}동` : `(동 ${i + 1})`)}
                  <span className="ml-1.5 text-[10px] text-[#9BC9D8]/60">{b.tot_area ? `${fmt(b.tot_area)}㎡` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 선택 동 상세 */}
        {sel ? (
          <div className="mb-8 overflow-hidden rounded-xl border border-[#E8C99B]/25 bg-[#0b111a]/80">
            <div className="border-b border-[#9BC9D8]/12 px-5 py-3">
              <p className="text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">
                건축물대장 {sel.regstr_kind ?? '표제부'}
                {sel.regstr_gb ? ` · ${sel.regstr_gb}` : ''}
                {sel.main_atch ? ` · ${sel.main_atch}` : ''}
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#f0deb9]">{sel.bld_nm || '(건물명 없음)'}</h2>
              <p className="mt-0.5 text-xs text-[#94aab8]">{sel.address ?? '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#9BC9D8]/8 sm:grid-cols-4">
              {[
                ['주용도', sel.main_purps ? `${sel.main_purps}${sel.etc_purps ? ` (${sel.etc_purps})` : ''}` : '—'],
                ['구조', sel.strct ?? '—'],
                ['지붕', sel.roof ?? '—'],
                ['대지면적', sel.plat_area ? `${fmt(sel.plat_area, 2)}㎡` : '—'],
                ['건축면적', sel.arch_area ? `${fmt(sel.arch_area, 2)}㎡` : '—'],
                ['연면적', sel.tot_area ? `${fmt(sel.tot_area, 2)}㎡ (${py(sel.tot_area)}평)` : '—'],
                ['지상층', sel.grnd_flr_cnt != null ? `${sel.grnd_flr_cnt}층` : '—'],
                ['지하층', sel.ugrnd_flr_cnt != null ? `${sel.ugrnd_flr_cnt}층` : '—'],
                ['세대/가구/호', `${fmt(sel.hhld_cnt)} / ${fmt(sel.fmly_cnt)} / ${fmt(sel.ho_cnt)}`],
                ['세대당 연면적', perHhld ? `${fmt(perHhld, 1)}㎡ (${py(perHhld)}평)` : '—'],
                ['승강기', sel.elvt_cnt ? `${sel.elvt_cnt}대` : '—'],
                ['주차', sel.parking_cnt ? `${sel.parking_cnt}대` : '—'],
                ['허가일', ymd(sel.pms_day)],
                ['사용승인', `${ymd(sel.use_apr_day)}${age != null ? ` · ${age}년 경과` : ''}`],
                ['내진설계', sel.quake_applied ? '적용' : '표기 없음'],
                ['에너지효율등급', sel.engr_grade ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#0b111a] px-4 py-3">
                  <p className="text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">{k}</p>
                  <p className="mt-1 text-sm font-medium text-[#ecf2f5]">{v}</p>
                </div>
              ))}
            </div>

            {/* 층별개요 */}
            <div className="border-t border-[#9BC9D8]/12 px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">층별개요</p>
                {!floors ? (
                  <button
                    type="button"
                    onClick={() => loadFloors()}
                    disabled={floorLoading}
                    className="rounded-full border border-[#9BC9D8]/35 px-4 py-1 text-xs text-[#c8e4ee] hover:bg-[#9BC9D8]/10 disabled:opacity-40"
                  >
                    {floorLoading ? '불러오는 중…' : '층별 용도·면적 불러오기'}
                  </button>
                ) : (
                  <>
                    <span className="text-xs text-[#94aab8]">
                      {selFloors ? `${selFloors.floors.length}개 층` : '이 동의 층 정보가 없습니다'}
                    </span>
                    <span className="text-[10px] text-[#9BC9D8]/60">
                      {floorMeta?.source === 'cache' ? '캐시' : '실시간 조회'}
                      {floorMeta?.fetchedAt ? ` · ${new Date(floorMeta.fetchedAt).toLocaleDateString('ko-KR')}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => loadFloors(true)}
                      disabled={floorLoading}
                      className="rounded-full border border-[#9BC9D8]/25 px-2.5 py-0.5 text-[10px] text-[#94aab8] hover:text-[#c8e4ee] disabled:opacity-40"
                    >
                      {floorLoading ? '갱신 중…' : '새로 받기'}
                    </button>
                  </>
                )}
              </div>
              {floorError ? <p className="mt-2 text-xs text-[#E5726A]">{floorError}</p> : null}
              {selFloors?.floors.length ? (
                <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-[#9BC9D8]/15">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0b111a]">
                      <tr className="border-b border-[#9BC9D8]/12 text-left tracking-[0.2em] text-[10px] text-[#9BC9D8]/60">
                        <th className="px-3 py-2">층</th>
                        <th className="px-3 py-2">용도</th>
                        <th className="px-3 py-2">구조</th>
                        <th className="px-3 py-2 text-right">면적(㎡)</th>
                        <th className="px-3 py-2 text-right">평</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#9BC9D8]/8">
                      {selFloors.floors.map((f, i) => (
                        <tr key={`${f.flr_nm ?? i}-${i}`}>
                          <td className="whitespace-nowrap px-3 py-1.5 text-[#ecf2f5]">{f.flr_nm ?? '—'}</td>
                          <td className="px-3 py-1.5 text-[#94aab8]">
                            {f.purps ?? '—'}
                            {f.etc_purps && f.etc_purps !== f.purps ? (
                              <span className="ml-1 text-[#9BC9D8]/60">({f.etc_purps})</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-1.5 text-[#94aab8]">{f.strct ?? '—'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-[#e8c99b]">{fmt(f.area, 2)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-[#94aab8]">{py(f.area)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#9BC9D8]/15 bg-[#04070c]">
                        <td className="px-3 py-1.5 text-[#9BC9D8]/70" colSpan={3}>
                          층 면적 합계
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[#f0deb9]">
                          {fmt(selFloors.floors.reduce((s, f) => s + (f.area ?? 0), 0), 2)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[#94aab8]">
                          {py(selFloors.floors.reduce((s, f) => s + (f.area ?? 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[#9BC9D8]/12 px-5 py-3 text-xs">
              <Link
                href={scheduleHref}
                className="rounded-full border border-[#E8C99B]/35 px-4 py-1.5 text-[#e8c99b] hover:bg-[#E8C99B]/10"
              >
                이 규모로 공정표 생성 →
              </Link>
              <button
                type="button"
                onClick={copySpec}
                className="rounded-full border border-[#9BC9D8]/30 px-4 py-1.5 text-[#c8e4ee] hover:bg-[#9BC9D8]/10"
              >
                {copied ? '복사됨' : '제원 복사'}
              </button>
              <span className="text-[#94aab8]">
                연면적 {fmt(sel.tot_area)}㎡ 기준으로 물량·공기를 잡습니다
                {age != null && age >= 25 ? ' · 준공 25년 이상 — 설비·배관 노후 확인 필요' : ''}
              </span>
            </div>
          </div>
        ) : null}

        {recent.length ? (
          <section>
            <p className="mb-2 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">최근 조회 · 캐시 (클릭하면 다시 엽니다)</p>
            <div className="overflow-hidden rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#9BC9D8]/12 text-left text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">
                    <th className="px-4 py-2">건물</th>
                    <th className="px-4 py-2">주소</th>
                    <th className="px-4 py-2">용도</th>
                    <th className="px-4 py-2 text-right">연면적</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#9BC9D8]/8">
                  {recent.map((r, i) => (
                    <tr
                      key={`${r.mgm_pk ?? i}`}
                      onClick={() => restore(r)}
                      className="cursor-pointer transition hover:bg-[#9BC9D8]/8"
                    >
                      <td className="px-4 py-1.5 text-[#ebf1f5]">{r.bld_nm || '—'}</td>
                      <td className="max-w-xs truncate px-4 py-1.5 text-[#94aab8]">{r.address ?? '—'}</td>
                      <td className="px-4 py-1.5 text-[#94aab8]">{r.main_purps ?? '—'}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-[#e8c99b]">
                        {r.tot_area ? `${fmt(r.tot_area)}㎡` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-xl border border-[#9BC9D8]/15 bg-[#0b111a]/60 p-5 text-xs leading-relaxed text-[#94aab8]">
          <p className="mb-2 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">확장 가능한 공공 데이터 (무료·합법)</p>
          <ul className="space-y-1.5">
            <li>
              ·{' '}
              <a href="https://www.data.go.kr/data/15134735/openapi.do" target="_blank" rel="noopener noreferrer" className="text-[#9BC9D8] underline">
                건축물대장정보 서비스
              </a>{' '}
              — 표제부·층별개요 (현재 연동) / 전유부·전유공용면적 (동일 키로 확장 가능)
            </li>
            <li>
              ·{' '}
              <a href="https://business.juso.go.kr/addrlink/openApi/apiExprn.do" target="_blank" rel="noopener noreferrer" className="text-[#9BC9D8] underline">
                도로명주소 검색 API
              </a>{' '}
              — 주소 → 법정동코드 자동 변환 {provider === 'JUSO' ? '(현재 연동)' : provider === 'KAKAO' ? '(카카오 로컬로 대체 연동 중)' : '(키 등록 시 즉시 사용)'}
            </li>
            <li>
              ·{' '}
              <a href="https://www.data.go.kr/data/15056093/openapi.do" target="_blank" rel="noopener noreferrer" className="text-[#9BC9D8] underline">
                건축인허가 정보 서비스
              </a>{' '}
              — 허가·착공·사용승인 이력
            </li>
            <li>
              ·{' '}
              <a href="https://www.data.go.kr/data/15126474/openapi.do" target="_blank" rel="noopener noreferrer" className="text-[#9BC9D8] underline">
                국토교통부 실거래가 정보
              </a>{' '}
              — 시세 참고
            </li>
            <li>
              ·{' '}
              <a href="https://kosis.kr/openapi/" target="_blank" rel="noopener noreferrer" className="text-[#9BC9D8] underline">
                KOSIS 국가통계 OpenAPI
              </a>{' '}
              — 건설공사비지수(단가 물가 보정)
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
