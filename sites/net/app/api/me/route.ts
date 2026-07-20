// 현재 로그인 사용자 요약 — 홈페이지 드롭다운의 로그인 상태 표시용
import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/core/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await getSessionProfile();
  if (!profile) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return NextResponse.json({
    email: profile.email,
    role: profile.role,
    display_name: profile.display_name,
  });
}
