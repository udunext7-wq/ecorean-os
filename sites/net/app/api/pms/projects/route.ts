// 공정표(PMS) 프로젝트 동기화 API — pms_projects (2026-09-07 대표 승인)
// 종전에는 프로젝트 5건이 boc_pms_state 에 44KB 한 덩어리로 저장돼 두 컴퓨터가 서로를 덮어썼다.
// 이제 1프로젝트=1행이고, 저장할 때 내가 받아둔 서버 시각(base)을 함께 보내 충돌을 감지한다.
// GET    ?since=ISO  변경분만 (묘비 포함) / since 없으면 살아있는 전체
// POST   {project, base}  저장 → {status: SAVED|CONFLICT, updatedAt, serverData}
// DELETE ?id=&base=      소프트 삭제 → {status: DELETED|CONFLICT|GONE, updatedAt}
// 주의: 프로덕션(vercel.json 수동 routes)에서는 /api/* 에 미들웨어가 걸리지 않으므로 라우트가 직접 인증한다.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/core/db/server';

export const dynamic = 'force-dynamic';

type SaveResult = { status: string; updated_at: string; server_data: unknown };

/** DB 함수가 올린 예외를 화면이 알아들을 수 있는 응답으로 바꾼다 */
function rpcFail(message: string) {
  // 남이 만든 공정표를 바꾸려 한 경우 — 작성자를 함께 알려준다
  const owner = /LOCKED_OWNER:([^\s"]+)/.exec(message)?.[1];
  if (owner || message.includes('EDIT_LOCKED')) {
    const who = owner ? owner.split('@')[0] : '다른 직원';
    return NextResponse.json(
      {
        error: 'EDIT_LOCKED',
        owner: owner ?? null,
        message: `${who} 님이 작성한 공정표입니다. 변경하려면 잠금 암호가 필요합니다.`,
      },
      { status: 423 },
    );
  }
  if (message.includes('NOT_AUTHORIZED')) {
    return NextResponse.json({ error: 'NOT_AUTHORIZED', message: '권한이 없습니다.' }, { status: 403 });
  }
  return NextResponse.json({ error: 'FAILED', message }, { status: 400 });
}

async function requireUser() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const since = request.nextUrl.searchParams.get('since');
  // 기준 시각은 조회 '전'에 찍는다. 조회 직후에 찍으면 그 사이에 저장된 행이 다음 폴링에서 영영 빠진다.
  const serverTime = new Date().toISOString();
  let q = supabase
    .from('pms_projects')
    .select('id,data,deleted_at,updated_at,updated_email,created_email')
    .order('updated_at', { ascending: true });
  // since 가 있으면 변경분만 (삭제 묘비도 함께 내려 다른 PC 에서 지워지도록)
  if (since) q = q.gt('updated_at', since);
  else q = q.is('deleted_at', null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({ ok: true, serverTime, count: rows.length, projects: rows });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const project = body?.project as { id?: string } | undefined;
  if (!project || typeof project.id !== 'string' || !/^prj_[A-Za-z0-9_-]{1,60}$/.test(project.id)) {
    return NextResponse.json({ error: 'BAD_REQUEST', message: '프로젝트 id 가 올바르지 않습니다.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('pms_project_save', {
    p_id: project.id,
    p_data: project,
    p_base: body?.base ?? null, // null 이면 강제 덮어쓰기 (사용자가 '내 것으로 덮어쓰기' 선택)
  });
  if (error) return rpcFail(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SaveResult | undefined;
  return NextResponse.json({
    ok: true,
    status: row?.status ?? 'SAVED',
    updatedAt: row?.updated_at ?? null,
    serverData: row?.server_data ?? null,
  });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const id = sp.get('id');
  if (!id || !/^prj_[A-Za-z0-9_-]{1,60}$/.test(id)) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('pms_project_delete', {
    p_id: id,
    p_base: sp.get('base') ?? null,
  });
  if (error) return rpcFail(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SaveResult | undefined;
  return NextResponse.json({
    ok: true,
    status: row?.status ?? 'DELETED',
    updatedAt: row?.updated_at ?? null,
    serverData: row?.server_data ?? null,
  });
}
