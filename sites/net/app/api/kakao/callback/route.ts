// 카카오 연동 콜백 (관리자 전용) — 인가 코드를 토큰으로 교환·저장 후 테스트 알림 1건 발송
import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole } from '@/core/auth/roles';
import { kakaoExchangeCode, kakaoSendToMe, kakaoState, kakaoRedirectUri } from '@/sites/net/lib/kakao-notify';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, ok: boolean): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>` +
      `<body style="font-family:'Malgun Gothic',sans-serif;background:#1A1814;color:#F8F4EE;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">` +
      `<div style="text-align:center;padding:2rem"><div style="font-size:3rem">${ok ? '✅' : '⚠️'}</div>` +
      `<h1 style="font-size:1.2rem">${title}</h1><p style="color:#B8965A">${body}</p>` +
      (ok ? '' : `<p style="font-size:13px;color:#9A9285;max-width:420px;margin:14px auto">` +
        `설정이 문제라면 <a href="/api/kakao/connect?show=1" style="color:#D4B483">등록할 주소 확인</a> 에서 ` +
        `카카오에 넣을 Redirect URI 를 그대로 복사할 수 있습니다.</p>`) +
      `<a href="/hub" style="color:#D4B483">업무 허브로 돌아가기</a></div></body></html>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !hasRole(profile.role, 'admin')) {
    return NextResponse.redirect(new URL('/login?next=%2Fapi%2Fkakao%2Fconnect', request.url));
  }
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const kakaoError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (kakaoError) return page('카카오 연동 실패', kakaoError, false);
  if (!code) return page('카카오 연동 실패', '인가 코드가 없습니다.', false);
  if (state !== kakaoState()) return page('카카오 연동 실패', 'state 불일치 — /api/kakao/connect 부터 다시 시작하세요.', false);

  // 인가 요청 때와 '똑같은' 주소여야 토큰 교환이 된다 (다르면 카카오가 거부한다)
  const redirectUri = kakaoRedirectUri(request);
  const result = await kakaoExchangeCode(code, redirectUri);
  if (!result.ok) return page('카카오 연동 실패', result.detail ?? '토큰 교환 실패', false);

  const testSent = await kakaoSendToMe(
    '[에코리안] 카카오 알림 연동 완료 ✅\n이제 상담신청이 접수되면 이 채팅(나와의 채팅)으로 알림이 옵니다.',
  );
  return page(
    '카카오 알림 연동 완료',
    testSent
      ? '카톡 "나와의 채팅"에 테스트 알림을 보냈습니다. 확인해 보세요.'
      : '토큰은 저장됐지만 테스트 발송에 실패했습니다. 다시 시도하거나 로그를 확인하세요.',
    true,
  );
}
