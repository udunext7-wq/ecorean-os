// 주소 검색 → 건축물대장 조회 파라미터(시군구·법정동·번·지) 변환 (2026-08-28)
// 키는 서버에만 둔다: JUSO_KEY(도로명주소 API) 또는 KAKAO_REST_API_KEY(카카오 로컬).
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';
import { JUSO_APPLY_URL, KAKAO_APPLY_URL, searchAddress } from '@/sites/net/lib/gov-address';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: '검색어를 2자 이상 입력해 주세요. (예: 강남구 개포동 12)' },
      { status: 400 },
    );
  }

  try {
    const found = await searchAddress(q, 10);
    if (!found) {
      return NextResponse.json(
        {
          error: 'NO_PROVIDER',
          message:
            '주소 검색 키가 없어 코드를 직접 입력해야 합니다. 도로명주소 API 키(JUSO_KEY) 또는 카카오 REST 키(KAKAO_REST_API_KEY) 중 하나만 등록하면 주소 한 줄로 조회됩니다.',
          jusoApplyUrl: JUSO_APPLY_URL,
          kakaoApplyUrl: KAKAO_APPLY_URL,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, provider: found.provider, count: found.hits.length, results: found.hits });
  } catch (e) {
    return NextResponse.json(
      { error: 'SEARCH_FAILED', message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
