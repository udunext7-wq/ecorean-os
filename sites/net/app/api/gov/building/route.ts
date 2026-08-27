// 공공데이터포털 — 국토교통부 건축HUB 건축물대장정보 서비스 프록시 (대표 지시 2026-08-27)
// 신청: https://www.data.go.kr/data/15134735/openapi.do (건축물대장정보 서비스)
// 키는 서버 환경변수 DATA_GO_KR_KEY 에만 두고, 브라우저로 노출하지 않는다.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

const BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 로그인 직원만 (미들웨어가 /api 미인증을 401 처리하지만 이중 확인)
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
          '공공데이터포털 인증키가 설정되지 않았습니다. data.go.kr 에서 건축물대장정보 서비스 활용신청 후 발급받은 키를 Vercel 환경변수 DATA_GO_KR_KEY 로 등록해 주세요.',
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
  if (!sigunguCd || !bjdongCd || !bun) {
    return NextResponse.json({ error: 'BAD_REQUEST', message: '시군구코드·법정동코드·번지가 필요합니다.' }, { status: 400 });
  }

  const url =
    `${BASE}?serviceKey=${encodeURIComponent(key)}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}` +
    `&bun=${bun}&ji=${ji}&numOfRows=10&pageNo=1&_type=json`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      // 공공데이터포털은 오류 시 XML 로 응답한다
      return NextResponse.json({ error: 'UPSTREAM_ERROR', message: text.slice(0, 400) }, { status: 502 });
    }
    const body = (json as { response?: { body?: { items?: { item?: unknown } } } })?.response?.body;
    const raw = body?.items?.item;
    const item = (Array.isArray(raw) ? raw[0] : raw) as Record<string, string | number> | undefined;
    if (!item) {
      return NextResponse.json({ error: 'NOT_FOUND', message: '해당 지번의 건축물대장을 찾지 못했습니다.' }, { status: 404 });
    }

    const row = {
      sigungu_cd: sigunguCd,
      bjdong_cd: bjdongCd,
      bun,
      ji,
      address: [item.platPlc, item.newPlatPlc].filter(Boolean).join(' / ') || null,
      bld_nm: (item.bldNm as string) || null,
      main_purps: (item.mainPurpsCdNm as string) || null,
      strct: (item.strctCdNm as string) || null,
      plat_area: Number(item.platArea) || null,
      arch_area: Number(item.archArea) || null,
      tot_area: Number(item.totArea) || null,
      grnd_flr_cnt: Number(item.grndFlrCnt) || null,
      ugrnd_flr_cnt: Number(item.ugrndFlrCnt) || null,
      use_apr_day: (item.useAprDay as string) || null,
      raw: item as unknown as Record<string, unknown>,
    };

    // 캐시 저장 (RLS: staff 이상)
    await supabase.from('gov_building_cache').upsert(row, { onConflict: 'sigungu_cd,bjdong_cd,bun,ji' });

    return NextResponse.json({ ok: true, building: row });
  } catch (e) {
    return NextResponse.json(
      { error: 'FETCH_FAILED', message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
