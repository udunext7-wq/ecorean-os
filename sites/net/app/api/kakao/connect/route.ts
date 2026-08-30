// 카카오 "나에게 보내기" 연동 시작 (관리자 전용, 1회)
// 로그인된 admin/master 가 방문하면 카카오 동의 화면으로 보낸다.
//
// KOE006(앱 관리자 설정 오류)은 여기서 보내는 redirect_uri 가 카카오 콘솔에
// 등록돼 있지 않을 때 난다. 그런데 그 주소가 화면에 안 보여서 무엇을 등록해야 할지
// 알 수가 없었다 → ?show=1 로 붙여넣을 주소를 그대로 보여준다.
import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole } from '@/core/auth/roles';
import { kakaoAuthorizeUrl, kakaoRedirectUri } from '@/sites/net/lib/kakao-notify';

export const dynamic = 'force-dynamic';

function guidePage(redirectUri: string, authorizeUrl: string | null): NextResponse {
  const keyOk = Boolean(authorizeUrl); // 값은 절대 화면에 내보내지 않는다
  const alt = redirectUri.includes('://www.')
    ? redirectUri.replace('://www.', '://')
    : redirectUri.replace('://', '://www.');
  const box = (v: string) =>
    `<div style="background:#0F0D0A;border:1px solid #3A3428;border-radius:8px;padding:12px 14px;margin:6px 0;` +
    `font-family:ui-monospace,Consolas,monospace;font-size:13px;word-break:break-all;color:#F8F4EE">${v}</div>`;
  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1"><title>카카오 연동 설정</title></head>` +
      `<body style="font-family:'Malgun Gothic',sans-serif;background:#1A1814;color:#F8F4EE;margin:0;padding:28px 20px">` +
      `<div style="max-width:640px;margin:0 auto">` +
      `<h1 style="font-size:1.25rem;margin:0 0 6px">카카오 연동 설정</h1>` +
      `<p style="color:#B8965A;margin:0 0 20px;font-size:14px">` +
      `<b>KOE006 (앱 관리자 설정 오류)</b> 는 아래 주소가 카카오에 등록돼 있지 않을 때 납니다.</p>` +
      `<p style="font-size:14px;margin:0 0 4px">1. <b>developers.kakao.com</b> → 내 애플리케이션 → <b>카카오 로그인</b></p>` +
      `<p style="font-size:14px;margin:0 0 4px">2. <b>활성화 설정 ON</b></p>` +
      `<p style="font-size:14px;margin:0 0 4px">3. <b>Redirect URI</b> 에 아래 주소를 <b>그대로</b> 등록 (두 개 다 넣으면 안전합니다)</p>` +
      box(redirectUri) + box(alt) +
      `<p style="font-size:14px;margin:16px 0 4px">4. <b>동의항목</b> → <b>카카오톡 메시지 전송</b>(talk_message) 을 <b>이용 중 동의</b>로 설정</p>` +
      `<p style="font-size:14px;margin:0 0 4px">5. <b>앱 설정 → 플랫폼 → Web</b> 에 사이트 도메인 등록</p>` +
      `<p style="font-size:13px;color:${keyOk ? '#7FBF7F' : '#E08A7A'};margin:18px 0 8px">` +
      `서버 REST 키: <b>${keyOk ? '등록됨' : '없음 — Vercel 환경변수 KAKAO_REST_API_KEY 를 먼저 채우세요'}</b></p>` +
      `<p style="font-size:13px;color:#9A9285;margin:0 0 8px">위 설정을 마친 뒤 아래 버튼을 누르세요.</p>` +
      (authorizeUrl
        ? `<a href="${authorizeUrl}" style="display:inline-block;background:#FEE500;color:#191600;font-weight:700;` +
          `padding:13px 20px;border-radius:10px;text-decoration:none">카카오 연동 시작하기</a>`
        : `<div style="color:#E08A7A">KAKAO_REST_API_KEY 가 없습니다 — Vercel 환경변수를 먼저 등록하세요.</div>`) +
      `<p style="margin-top:24px"><a href="/hub" style="color:#D4B483;font-size:14px">업무 허브로 돌아가기</a></p>` +
      `</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !hasRole(profile.role, 'admin')) {
    // 로그인 후 원래 주소(쿼리 포함)로 돌아와야 한다 — ?show=1 이 떨어지면
    // 안내 화면 대신 카카오로 바로 넘어가 KOE006 만 다시 보게 된다.
    const self = new URL(request.url);
    const back = encodeURIComponent(self.pathname + self.search);
    return NextResponse.redirect(new URL(`/login?next=${back}`, request.url));
  }
  const redirectUri = kakaoRedirectUri(request);
  const url = kakaoAuthorizeUrl(redirectUri);

  // 등록할 주소를 확인하고 싶을 때 (KOE006 이 났을 때 여기로 온다)
  if (new URL(request.url).searchParams.get('show') === '1') {
    return guidePage(redirectUri, url);
  }
  if (!url) {
    return NextResponse.json(
      { error: 'KAKAO_REST_API_KEY 미설정 — Vercel 환경변수를 먼저 등록하세요' },
      { status: 500 },
    );
  }
  return NextResponse.redirect(url);
}
