// 카카오 "나에게 보내기" 연동 시작 (관리자 전용, 1회)
// 로그인된 admin/master 가 방문하면 카카오 동의 화면으로 보낸다.
//
// KOE006(앱 관리자 설정 오류)은 여기서 보내는 redirect_uri 가 카카오 콘솔에
// 등록돼 있지 않을 때 난다. 그런데 그 주소가 화면에 안 보여서 무엇을 등록해야 할지
// 알 수가 없었다 → ?show=1 로 붙여넣을 주소를 그대로 보여준다.
import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole } from '@/core/auth/roles';
import { kakaoAuthorizeUrl, kakaoRedirectUri, restKeyHint } from '@/sites/net/lib/kakao-notify';

export const dynamic = 'force-dynamic';

function guidePage(redirectUri: string, authorizeUrl: string | null, request: Request): NextResponse {
  const keyOk = Boolean(authorizeUrl); // 값은 절대 화면에 내보내지 않는다
  // next.config 의 trailingSlash:true 때문에 브라우저에서 주소를 확인하면
  // 슬래시가 붙은 형태가 남는다 → 네 가지를 모두 등록하면 어긋날 일이 없다.
  const apex = redirectUri.replace('://www.', '://');
  const www = apex.replace('://', '://www.');
  const variants = [apex, `${apex}/`, www, `${www}/`];
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
      `<b>KOE006</b> = 리다이렉트 URI 불일치 · <b>KOE010</b> = 클라이언트 시크릿 미전송. 아래 순서대로 하시면 둘 다 풀립니다.</p>` +
      `<p style="font-size:14px;margin:0 0 10px;color:#E0C089"><b>콘솔 구조가 바뀌었습니다.</b> 리다이렉트 URI 는 이제 <b>키마다 따로</b> 등록합니다 — JavaScript 키에 등록해 두었다면 REST API 키로 도는 이 연동에는 적용되지 않습니다.</p>` +
      `<p style="font-size:14px;margin:0 0 4px">1. <b>developers.kakao.com</b> → 내 애플리케이션 → 앱 선택</p>` +
      `<p style="font-size:14px;margin:0 0 4px">2. <b>[앱] → [플랫폼 키] → [REST API 키]</b> 를 엽니다 (아래 키와 같은지 확인)</p>` +
      `<p style="font-size:14px;margin:0 0 4px">3. 그 화면의 <b>[카카오 로그인 리다이렉트 URI]</b> 에 아래 <b>네 개를 모두</b> 등록 → KOE006 해결</p>` +
      variants.map(box).join('') +
      `<p style="font-size:14px;margin:16px 0 4px">4. <b>같은 화면의 [클라이언트 시크릿]</b> → <b>[활성화] 를 OFF</b> 로 바꾸세요 → KOE010 해결<br><span style="color:#9A9285;font-size:13px">새로 만든 REST API 키는 클라이언트 시크릿이 <b>기본으로 켜진 채</b> 발급됩니다. 켜 두시려면 그 코드값을 서버에 KAKAO_CLIENT_SECRET 으로 넣어야 합니다.</span></p>` +
      `<p style="font-size:14px;margin:0 0 4px">5. <b>[카카오 로그인] → [사용 설정]</b> 을 <b>ON</b></p>` +
      `<p style="font-size:14px;margin:0 0 4px">6. <b>[카카오 로그인] → [동의항목]</b> → <b>카카오톡 메시지 전송</b> 을 이용 중 동의로</p>` +
      `<p style="font-size:14px;margin:0 0 4px">7. <b>[앱] → [제품 링크 관리] → [웹 도메인]</b> 에 <code>https://ecorean.net</code> 등록</p>` +
      `<p style="font-size:13px;color:${keyOk ? '#7FBF7F' : '#E08A7A'};margin:18px 0 8px">` +
      `서버 REST 키: <b>${keyOk ? (restKeyHint() ?? '등록됨') : '없음 — Vercel 환경변수 KAKAO_REST_API_KEY 를 먼저 채우세요'}</b></p>` +
      `<p style="font-size:13px;color:#B8965A;margin:0 0 8px">` +
      `↑ 이 값이 <b>앱 설정 → 앱 키 → REST API 키</b> 와 같은지 확인하세요. ` +
      `JavaScript 키를 넣으면 카카오가 KOE010 으로 거부합니다.</p>` +
      `<p style="font-size:13px;color:#9A9285;margin:0 0 8px">위 설정을 마친 뒤 아래 버튼을 누르세요.</p>` +
      (authorizeUrl
        ? `<a href="${authorizeUrl}" style="display:inline-block;background:#FEE500;color:#191600;font-weight:700;` +
          `padding:13px 20px;border-radius:10px;text-decoration:none">카카오 연동 시작하기</a>`
        : `<div style="color:#E08A7A">KAKAO_REST_API_KEY 가 없습니다 — Vercel 환경변수를 먼저 등록하세요.</div>`) +
      `<hr style="border:none;border-top:1px solid #3A3428;margin:24px 0">` +
      `<p style="font-size:12px;color:#9A9285;margin:0 0 6px">진단 정보 (등록한 주소와 아래가 정확히 같아야 합니다)</p>` +
      `<pre style="background:#0F0D0A;border:1px solid #3A3428;border-radius:8px;padding:10px 12px;` +
      `font-size:12px;color:#C8C0B4;overflow-x:auto;margin:0">` +
      `x-forwarded-host : ${request.headers.get('x-forwarded-host') ?? '(없음)'}
` +
      `host             : ${request.headers.get('host') ?? '(없음)'}
` +
      `x-forwarded-proto: ${request.headers.get('x-forwarded-proto') ?? '(없음)'}
` +
      `보내는 redirect_uri : ${redirectUri}</pre>` +
      `<p style="margin-top:24px"><a href="/hub" style="color:#D4B483;font-size:14px">업무 허브로 돌아가기</a></p>` +
      `</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(request: Request) {
  const redirectUri = kakaoRedirectUri(request);
  const url = kakaoAuthorizeUrl(redirectUri);

  // 안내 화면은 로그인 없이도 볼 수 있게 한다 — 여기엔 비밀이 없고(콜백 주소·키 유무만),
  // KOE006 이 났을 때 무엇을 등록해야 하는지 확인하는 것이 목적이다.
  if (new URL(request.url).searchParams.get('show') === '1') {
    return guidePage(redirectUri, url, request);
  }

  const profile = await getSessionProfile();
  if (!profile || !hasRole(profile.role, 'admin')) {
    const self = new URL(request.url);
    const back = encodeURIComponent(self.pathname + self.search);
    return NextResponse.redirect(new URL(`/login?next=${back}`, request.url));
  }
  if (!url) {
    return NextResponse.json(
      { error: 'KAKAO_REST_API_KEY 미설정 — Vercel 환경변수를 먼저 등록하세요' },
      { status: 500 },
    );
  }
  return NextResponse.redirect(url);
}
