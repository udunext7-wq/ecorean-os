// 로그아웃 — POST /auth/signout
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 302 });
}
