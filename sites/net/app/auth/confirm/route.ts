// 메일 링크 착지 — 재설정·가입확인 링크를 세션으로 교환 후 목적지로 이동
// token_hash(커스텀 템플릿)와 code(PKCE 기본 흐름) 두 형태 모두 처리한다.
import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabase } from '@/core/db/server';

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/hub'; // open redirect 방지
  return raw;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));

  const supabase = createServerSupabase();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  // 만료·재사용·다른 브라우저에서 열기 등 — 흐름별 재요청 화면으로
  const fallback = type === 'signup' ? '/login?error=link' : '/reset-password?error=link';
  return NextResponse.redirect(new URL(fallback, url.origin));
}
