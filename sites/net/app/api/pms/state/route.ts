// 공정표(PMS) 상태 동기화 API — boc_pms_state
// GET  : 전체 상태 로드 (RLS: staff 이상)
// POST : {key, data} 저장 — DB의 pms_save_state(security definer, staff+)가 권한 검증
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data, error } = await supabase
    .from('boc_pms_state')
    .select('key, data, updated_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const key = body?.key;
  if (typeof key !== 'string' || !/^boc_[a-z0-9_]{2,40}$/.test(key) || body?.data === undefined) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const { data: updatedAt, error } = await supabase.rpc('pms_save_state', {
    p_key: key,
    p_data: body.data,
  });
  if (error) {
    const status = error.message.includes('NOT_AUTHORIZED') ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ status: 'saved', key, updated_at: updatedAt });
}
