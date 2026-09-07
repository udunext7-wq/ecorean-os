// 공정표 편집 잠금 (2026-09-07 대표 지시: "누구나 수정하면 공정이 꼬인다")
// 열람은 직원 누구나 / 편집은 암호로 잠금을 푼 사람만. 판정은 전부 DB 함수가 한다.
// GET    현재 상태 (해제 여부·만료·암호 변경 권한)
// POST   {password} 잠금 해제 (8시간)
// DELETE 지금 잠그기
// PUT    {password} 암호 변경 — 관리자(role_level>=4)만, 변경 시 전원 재입력
// 주의: 프로덕션(vercel.json 수동 routes)에서는 /api/* 에 미들웨어가 걸리지 않으므로 라우트가 직접 인증한다.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

type Status = { unlocked: boolean; until: string | null; has_password: boolean; can_manage: boolean };

async function requireUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('NOT_AUTHORIZED')) {
    return NextResponse.json({ error: 'NOT_AUTHORIZED', message: '권한이 없습니다.' }, { status: 403 });
  }
  if (message.includes('NO_PASSWORD_SET')) {
    return NextResponse.json(
      { error: 'NO_PASSWORD_SET', message: '편집 암호가 아직 설정되지 않았습니다. 관리자에게 요청해 주세요.' },
      { status: 409 },
    );
  }
  if (message.includes('TOO_SHORT')) {
    return NextResponse.json({ error: 'TOO_SHORT', message: '암호는 4자 이상이어야 합니다.' }, { status: 400 });
  }
  return NextResponse.json({ error: 'FAILED', message }, { status: 400 });
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data, error } = await supabase.rpc('pms_edit_status');
  if (error) return fail(error);
  const row = (Array.isArray(data) ? data[0] : data) as Status | undefined;
  return NextResponse.json({
    ok: true,
    unlocked: Boolean(row?.unlocked),
    until: row?.until ?? null,
    hasPassword: Boolean(row?.has_password),
    canManage: Boolean(row?.can_manage),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) return NextResponse.json({ error: 'BAD_REQUEST', message: '암호를 입력해 주세요.' }, { status: 400 });

  const { data, error } = await supabase.rpc('pms_edit_unlock', { p_password: password });
  if (error) return fail(error);
  const row = (Array.isArray(data) ? data[0] : data) as { ok: boolean; until: string | null } | undefined;
  if (!row?.ok) {
    return NextResponse.json({ ok: false, message: '암호가 맞지 않습니다.' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, unlocked: true, until: row.until });
}

export async function DELETE() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { error } = await supabase.rpc('pms_edit_lock_now');
  if (error) return fail(error);
  return NextResponse.json({ ok: true, unlocked: false });
}

export async function PUT(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password.trim() : '';
  if (password.length < 4) {
    return NextResponse.json({ error: 'TOO_SHORT', message: '암호는 4자 이상이어야 합니다.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('pms_edit_set_password', { p_new: password });
  if (error) return fail(error);
  // 암호가 바뀌면 모든 사람의 해제가 풀린다 (본인 포함) — 화면이 다시 잠금 상태로 돌아간다
  return NextResponse.json({ ok: true, changed: true });
}
