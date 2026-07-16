// core/auth/session.ts — 세션·프로필 조회 (서버 전용)
import 'server-only';
import { createServerSupabase } from '@/core/db/server';
import type { ProfileRow } from '@/core/db/types';

/**
 * 현재 로그인 사용자의 프로필(역할 포함)을 반환. 미로그인 시 null.
 * profiles RLS: 본인 행만 SELECT 가능 → 단건 조회.
 */
export async function getSessionProfile(): Promise<ProfileRow | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // profiles 행이 아직 없으면(마이그레이션 이전 가입자) 최소 권한으로 취급
  if (!data) {
    return {
      id: user.id,
      tenant_id: 'HQ',
      email: user.email ?? null,
      full_name: null,
      role: 'visitor',
      created_at: '',
      updated_at: '',
    };
  }
  return data as ProfileRow;
}
