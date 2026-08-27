'use client';

// AI 스튜디오 — 건축물대장 조회 (공공데이터포털 연동, 대표 지시 2026-08-27)
// 지번으로 건축물대장 표제부를 조회해 연면적·구조·층수·용도를 가져오고,
// 그 연면적으로 온톨로지 공정표의 개략 물량 기준을 잡는다. (합법 무료 국가 데이터)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Noto_Sans_KR } from 'next/font/google';
import { StudioNav } from '../StudioNav';

const noto = Noto_Sans_KR({ subsets: ['latin'], weight: ['300', '400', '500', '700'], display: 'swap' });

type Bld = {
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
};

export default function BuildingPage() {
  const [sigungu, setSigungu] = useState('');
  const [bjdong, setBjdong] = useState('');
  const [bun, setBun] = useState('');
  const [ji, setJi] = useState('0');
  const [bld, setBld] = useState<Bld | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; applyUrl?: string } | null>(null);
  const [recent, setRecent] = useState<Bld[]>([]);
  const [status, setStatus] = useState<{ state: string; message?: string; applyUrl?: string; myKeyUrl?: string } | null>(null);

  // 연동 상태 실측 — 키 보유 여부뿐 아니라 '이 API 활용신청 여부'까지 확인
  useEffect(() => {
    fetch('/api/gov/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createBrowserSupabase();
      const { data } = await supabase
        .from('gov_building_cache')
        .select('address,bld_nm,main_purps,strct,plat_area,arch_area,tot_area,grnd_flr_cnt,ugrnd_flr_cnt,use_apr_day')
        .order('fetched_at', { ascending: false })
        .limit(8);
      setRecent((data ?? []) as Bld[]);
    })();
  }, [bld]);

  async function lookup() {
    setLoading(true);
    setError(null);
    setBld(null);
    try {
      const res = await fetch(
        `/api/gov/building?sigunguCd=${encodeURIComponent(sigungu)}&bjdongCd=${encodeURIComponent(bjdong)}&bun=${encodeURIComponent(bun)}&ji=${encodeURIComponent(ji || '0')}`,
      );
      const j = await res.json();
      if (!res.ok) {
        setError({ message: j.message ?? j.error ?? '조회 실패', applyUrl: j.applyUrl });
        return;
      }
      setBld(j.building as Bld);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  const area = bld?.tot_area ?? 0;
  const pyeong = area ? Math.round((area / 3.3058) * 10) / 10 : 0;

  return (
    <main className={`${noto.className} min-h-screen bg-[#04070c] p-6 text-[#e6edf2]`}>
      <div className="mx-auto max-w-4xl">
        <StudioNav />
        <header className="mb-6 border-b border-[#9BC9D8]/15 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#f0deb9]">
            AI 스튜디오 · 건축물대장 조회
          </h1>
          <p className="mt-1 text-sm text-[#94aab8]">
            국토교통부 <b className="text-[#c8e4ee]">건축물대장정보 서비스</b>(공공데이터포털 무료 개방)에서
            지번으로 연면적·구조·층수·용도를 가져옵니다. 현장 실측 전 기본 제원을 확보해 견적·공정표의
            출발점으로 씁니다.
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
          <p className="mb-4 text-xs text-[#86efac]">공공데이터포털 연결됨 · 조회 가능</p>
        ) : null}

        <div className="mb-6 grid gap-3 rounded-xl border border-[#9BC9D8]/20 bg-[#0b111a]/80 p-5 sm:grid-cols-[1fr_1fr_1fr_0.6fr_auto]">
          <label className="flex flex-col gap-1 text-xs">
            <span className="tracking-[0.2em] text-[#9BC9D8]/60">시군구코드 (5)</span>
            <input
              value={sigungu}
              onChange={(e) => setSigungu(e.target.value)}
              placeholder="11680"
              className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="tracking-[0.2em] text-[#9BC9D8]/60">법정동코드 (5)</span>
            <input
              value={bjdong}
              onChange={(e) => setBjdong(e.target.value)}
              placeholder="10300"
              className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="tracking-[0.2em] text-[#9BC9D8]/60">번</span>
            <input
              value={bun}
              onChange={(e) => setBun(e.target.value)}
              placeholder="12"
              className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="tracking-[0.2em] text-[#9BC9D8]/60">지</span>
            <input
              value={ji}
              onChange={(e) => setJi(e.target.value)}
              placeholder="0"
              className="rounded-md border border-[#9BC9D8]/25 bg-[#04070c] px-3 py-2 text-sm outline-none focus:border-[#9BC9D8]/60"
            />
          </label>
          <button
            type="button"
            onClick={lookup}
            disabled={loading || !sigungu || !bjdong || !bun}
            className="self-end rounded-md bg-gradient-to-b from-[#d6b87e] to-[#b8965a] px-5 py-2 text-sm font-semibold text-[#0f0e0c] disabled:opacity-40"
          >
            {loading ? '조회 중…' : '대장 조회'}
          </button>
          <p className="text-[10px] leading-relaxed text-[#94aab8] sm:col-span-5">
            코드를 모르면{' '}
            <a
              href="https://www.code.go.kr/stdcode/regCodeL.do"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9BC9D8] underline"
            >
              행정표준코드 법정동코드 조회
            </a>
            에서 확인하세요 — 앞 5자리가 시군구코드, 뒤 5자리가 법정동코드입니다. (예: 서울 강남구
            대치동 1168010300 → 11680 / 10300)
          </p>
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

        {bld ? (
          <div className="mb-8 overflow-hidden rounded-xl border border-[#E8C99B]/25 bg-[#0b111a]/80">
            <div className="border-b border-[#9BC9D8]/12 px-5 py-3">
              <p className="text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">건축물대장 표제부</p>
              <h2 className="mt-1 text-lg font-bold text-[#f0deb9]">{bld.bld_nm || '(건물명 없음)'}</h2>
              <p className="mt-0.5 text-xs text-[#94aab8]">{bld.address ?? '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-[#9BC9D8]/8 sm:grid-cols-4">
              {[
                ['주용도', bld.main_purps ?? '—'],
                ['구조', bld.strct ?? '—'],
                ['대지면적', bld.plat_area ? `${bld.plat_area.toLocaleString()}㎡` : '—'],
                ['건축면적', bld.arch_area ? `${bld.arch_area.toLocaleString()}㎡` : '—'],
                ['연면적', bld.tot_area ? `${bld.tot_area.toLocaleString()}㎡ (${pyeong}평)` : '—'],
                ['지상층', bld.grnd_flr_cnt != null ? `${bld.grnd_flr_cnt}층` : '—'],
                ['지하층', bld.ugrnd_flr_cnt != null ? `${bld.ugrnd_flr_cnt}층` : '—'],
                ['사용승인', bld.use_apr_day ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#0b111a] px-4 py-3">
                  <p className="text-[10px] tracking-[0.2em] text-[#9BC9D8]/60">{k}</p>
                  <p className="mt-1 text-sm font-medium text-[#ecf2f5]">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-[#9BC9D8]/12 px-5 py-3 text-xs">
              <Link
                href="/studio/schedule"
                className="rounded-full border border-[#E8C99B]/35 px-4 py-1.5 text-[#e8c99b] hover:bg-[#E8C99B]/10"
              >
                이 규모로 공정표 생성 →
              </Link>
              <span className="text-[#94aab8]">
                연면적 {bld.tot_area?.toLocaleString() ?? '—'}㎡ 기준으로 물량·공기를 잡습니다
              </span>
            </div>
          </div>
        ) : null}

        {recent.length ? (
          <section>
            <p className="mb-2 text-[10px] tracking-[0.3em] text-[#9BC9D8]/60">최근 조회 · 캐시</p>
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
                    <tr key={i}>
                      <td className="px-4 py-1.5 text-[#ebf1f5]">{r.bld_nm || '—'}</td>
                      <td className="max-w-xs truncate px-4 py-1.5 text-[#94aab8]">{r.address ?? '—'}</td>
                      <td className="px-4 py-1.5 text-[#94aab8]">{r.main_purps ?? '—'}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-[#e8c99b]">
                        {r.tot_area ? `${r.tot_area.toLocaleString()}㎡` : '—'}
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
              — 표제부·층별·전유부 (현재 연동)
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
            <li>
              ·{' '}
              <a href="https://business.juso.go.kr/addrlink/openApi/apiExprn.do" target="_blank" rel="noopener noreferrer" className="text-[#9BC9D8] underline">
                도로명주소 검색 API
              </a>{' '}
              — 주소 → 법정동코드 자동 변환 (다음 연동 대상)
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
