// 공공데이터포털 연동 상태 — 키 보유 여부 + 실제 사용 가능 여부를 실측한다.
// data.go.kr 은 계정 키 1개를 서비스마다 별도 '활용신청' 해야 쓸 수 있어,
// 키가 있어도 미신청이면 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 가 난다. (키 값은 절대 노출하지 않음)
// 2026-08-28: 주소 검색 공급자(JUSO/KAKAO) 상태도 함께 알려 화면이 안내를 바꾸도록 한다.
// 주의: 프로덕션(vercel.json 수동 routes)에서는 /api/* 에 미들웨어가 걸리지 않는다.
// 실측 결과 이 경로가 미인증으로 열려 있었다 → 라우트에서 직접 로그인 여부를 확인한다. (2026-08-29)
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/db/server';
import { APPLY_URL, CODE_URL, MY_KEY_URL, govKey } from '@/sites/net/lib/gov-building';
import { JUSO_APPLY_URL, KAKAO_APPLY_URL, probeAddress } from '@/sites/net/lib/gov-address';

export const dynamic = 'force-dynamic';

const PROBE =
  'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo' +
  '?sigunguCd=11680&bjdongCd=10300&bun=0012&ji=0000&numOfRows=1&pageNo=1&_type=json';

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const key = govKey();
  // 주소 검색도 실제 호출로 판정한다 (키가 있어도 카카오 로컬 권한이 닫혀 있을 수 있음)
  const address = {
    ...(await probeAddress()),
    jusoApplyUrl: JUSO_APPLY_URL,
    kakaoApplyUrl: KAKAO_APPLY_URL,
  };
  const links = { applyUrl: APPLY_URL, myKeyUrl: MY_KEY_URL, codeUrl: CODE_URL };
  if (!key) return NextResponse.json({ state: 'NO_KEY', hasKey: false, address, ...links });

  try {
    const res = await fetch(`${PROBE}&serviceKey=${encodeURIComponent(key)}`, { cache: 'no-store' });
    const text = await res.text();
    if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
      return NextResponse.json({
        state: 'NOT_APPLIED',
        hasKey: true,
        message:
          '인증키는 있으나 건축물대장 API에 활용신청이 되어 있지 않습니다. 같은 키로 이 서비스만 추가 신청하면 됩니다.',
        address,
        ...links,
      });
    }
    if (text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS')) {
      return NextResponse.json({
        state: 'QUOTA',
        hasKey: true,
        message: '오늘 호출 한도를 초과했습니다.',
        address,
        ...links,
      });
    }
    if (text.trim().startsWith('{')) {
      return NextResponse.json({ state: 'READY', hasKey: true, address, ...links });
    }
    return NextResponse.json({ state: 'UNKNOWN', hasKey: true, message: text.slice(0, 200), address, ...links });
  } catch (e) {
    return NextResponse.json({
      state: 'ERROR',
      hasKey: true,
      message: e instanceof Error ? e.message : String(e),
      address,
      ...links,
    });
  }
}
