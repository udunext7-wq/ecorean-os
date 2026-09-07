// 공정표별 잠금 (2026-09-07 대표 지시)
// "내가 만들었다면 내 것에 내가 임의로 비밀번호를 기입해서 락을 걸 수 있게."
// POST   {id, password}  잠금 걸기/바꾸기 — 작성자(또는 관리자)만
// DELETE ?id=            잠금 풀기(암호 제거) — 작성자(또는 관리자)만
// PUT    {id, password}  남이 암호를 입력해 그 공정표를 여는 것 (8시간)
// 판정은 전부 DB 함수가 한다. 화면을 우회해도 서버가 막는다.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

async function requireUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function fail(message: string) {
  const owner = /ONLY_OWNER:([^\s"]+)/.exec(message)?.[1];
  if (owner) {
    return NextResponse.json(
      { error: 'ONLY_OWNER', owner, message: `${owner.split('@')[0]} 님이 만든 공정표라 그분만 잠금을 걸 수 있습니다.` },
      { status: 403 },
    );
  }
  if (message.includes('TOO_SHORT')) {
    return NextResponse.json({ error: 'TOO_SHORT', message: '암호는 4자 이상이어야 합니다.' }, { status: 400 });
  }
  if (message.includes('NOT_FOUND')) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: '서버에 저장된 공정표에만 잠금을 걸 수 있습니다. 먼저 저장해 주세요.' },
      { status: 404 },
    );
  }
  if (message.includes('NOT_AUTHORIZED')) {
    return NextResponse.json({ error: 'NOT_AUTHORIZED', message: '권한이 없습니다.' }, { status: 403 });
  }
  return NextResponse.json({ error: 'FAILED', message }, { status: 400 });
}

const idOk = (v: unknown): v is string => typeof v === 'string' && /^prj_[A-Za-z0-9_-]{1,60}$/.test(v);

/** 잠금 걸기 / 바꾸기 */
export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password.trim() : '';
  if (!idOk(body?.id)) return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  if (password.length < 4) {
    return NextResponse.json({ error: 'TOO_SHORT', message: '암호는 4자 이상이어야 합니다.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('pms_project_set_lock', { p_id: body.id, p_password: password });
  if (error) return fail(error.message);
  return NextResponse.json({ ok: true, locked: true });
}

/** 잠금 풀기 (암호 자체를 없앤다) */
export async function DELETE(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!idOk(id)) return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });

  const { error } = await supabase.rpc('pms_project_set_lock', { p_id: id, p_password: '' });
  if (error) return fail(error.message);
  return NextResponse.json({ ok: true, locked: false });
}

/** 남이 암호를 입력해 여는 것 */
export async function PUT(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!idOk(body?.id)) return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  const password = typeof body?.password === 'string' ? body.password : '';

  const { data, error } = await supabase.rpc('pms_project_unlock', { p_id: body.id, p_password: password });
  if (error) return fail(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; until: string | null } | undefined;
  if (!row?.ok) return NextResponse.json({ ok: false, message: '암호가 맞지 않습니다.' }, { status: 401 });
  return NextResponse.json({ ok: true, until: row.until });
}
