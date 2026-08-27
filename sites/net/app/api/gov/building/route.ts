// 공공데이터포털 — 국토교통부 건축HUB 건축물대장정보 서비스 프록시 (대표 지시 2026-08-27)
// 신청: https://www.data.go.kr/data/15134735/openapi.do
// 키는 서버 환경변수 DATA_GO_KR_KEY 에만 두고 브라우저로 노출하지 않는다.
// 한 지번에 여러 동(아파트 단지 등)이 있으므로 목록 전체를 돌려주고 캐시한다.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

const BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo';

export const dynamic = 'force-dynamic';

type Item = Record<string, string | number>;

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const key = process.env.DATA_GO_KR_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: 'NO_API_KEY',
        message:
          '공공데이터포털 인증키가 설정되지 않았습니다. 활용신청 후 발급 키를 DATA_GO_KR_KEY 환경변수로 등록해 주세요.',
        applyUrl: 'https://www.data.go.kr/data/15134735/openapi.do',
      },
      { status: 503 },
    );
  }

  const sp = request.nextUrl.searchParams;
  const sigunguCd = sp.get('sigunguCd');
  const bjdongCd = sp.get('bjdongCd');
  const bun = (sp.get('bun') ?? '').padStart(4, '0');
  const ji = (sp.get('ji') ?? '0').padStart(4, '0');
  const rows = Math.min(50, Math.max(1, Number(sp.get('rows') ?? 30)));
  if (!sigunguCd || !bjdongCd || !bun) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: '시군구코드·법정동코드·번지가 필요합니다.' },
      { status: 400 },
    );
  }

  const url =
    `${BASE}?serviceKey=${encodeURIComponent(key)}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}` +
    `&bun=${bun}&ji=${ji}&numOfRows=${rows}&pageNo=1&_type=json`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
      return NextResponse.json(
        {
          error: 'NOT_APPLIED',
          message: '이 인증키로 건축물대장 API 활용신청이 되어 있지 않습니다.',
          applyUrl: 'https://www.data.go.kr/data/15134735/openapi.do',
        },
        { status: 503 },
      );
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'UPSTREAM_ERROR', message: text.slice(0, 400) }, { status: 502 });
    }
    const body = (json as { response?: { body?: { items?: { item?: unknown }; totalCount?: number } } })?.response
      ?.body;
    const raw = body?.items?.item;
    const items: Item[] = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Item[];
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '해당 지번의 건축물대장을 찾지 못했습니다. 코드·번지를 확인해 주세요.' },
        { status: 404 },
      );
    }

    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n !== 0 ? n : null;
    };
    const rowsOut = items.map((it) => ({
      sigungu_cd: sigunguCd,
      bjdong_cd: bjdongCd,
      bun,
      ji,
      mgm_pk: String(it.mgmBldrgstPk ?? '0'),
      address: [it.platPlc, it.newPlatPlc].filter(Boolean).join(' / ') || null,
      bld_nm: (it.bldNm as string)?.trim() || null,
      main_purps: (it.mainPurpsCdNm as string) || null,
      strct: (it.strctCdNm as string) || null,
      plat_area: num(it.platArea),
      arch_area: num(it.archArea),
      tot_area: num(it.totArea),
      grnd_flr_cnt: num(it.grndFlrCnt),
      ugrnd_flr_cnt: num(it.ugrndFlrCnt),
      use_apr_day: (it.useAprDay as string) || null,
      raw: it as unknown as Record<string, unknown>,
    }));
    // 연면적 큰 순 (단지의 주 건물이 먼저 보이도록)
    rowsOut.sort((a, b) => (b.tot_area ?? 0) - (a.tot_area ?? 0));

    await supabase
      .from('gov_building_cache')
      .upsert(rowsOut, { onConflict: 'sigungu_cd,bjdong_cd,bun,ji,mgm_pk' });

    return NextResponse.json({
      ok: true,
      totalCount: body?.totalCount ?? rowsOut.length,
      returned: rowsOut.length,
      buildings: rowsOut,
      building: rowsOut[0],
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'FETCH_FAILED', message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
