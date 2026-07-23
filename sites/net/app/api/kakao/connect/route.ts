// 카카오 "나에게 보내기" 연동 시작 (관리자 전용, 1회)
// 로그인된 admin/master 가 방문하면 카카오 동의 화면으로 보낸다.
import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole } from '@/core/auth/roles';
import { kakaoAuthorizeUrl } from '@/sites/net/lib/kakao-notify';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile || !hasRole(profile.role, 'admin')) {
    return NextResponse.redirect(new URL('/login?next=%2Fapi%2Fkakao%2Fconnect', request.url));
  }
  const redirectUri = new URL('/api/kakao/callback', request.url).toString();
  const url = kakaoAuthorizeUrl(redirectUri);
  if (!url) {
    return NextResponse.json({ error: 'KAKAO_REST_API_KEY 미설정 — Vercel 환경변수를 먼저 등록하세요' }, { status: 500 });
  }
  return NextResponse.redirect(url);
}
