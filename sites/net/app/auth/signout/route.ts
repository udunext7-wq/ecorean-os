// 로그아웃 — POST /auth/signout
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  // 홈페이지로 복귀 (홈 드롭다운·플랫폼 어디서든 일관)
  return NextResponse.redirect(new URL('/', request.url), { status: 302 });
}
