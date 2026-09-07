-- 공정표 편집 잠금 (2026-09-07 대표 지시) — Supabase 적용 완료 기록본
-- "누구나 수정을 해버리면 공정이 꼬인다" → 열람은 직원 누구나, 편집은 암호로 잠금을 푼 사람만 8시간.
-- 화면만이 아니라 저장·삭제 함수에서 강제하므로 API 를 직접 호출해도 막힌다.
-- 암호는 bcrypt 해시로만 보관(pgcrypto=extensions 스키마이므로 search_path 에 포함해야 crypt 가 보인다).
-- 초기 암호는 이 파일에 두지 않는다 — 배포 후 관리자 화면(편집 암호 변경)에서 바꾼다.

create table if not exists public.pms_edit_lock (
  id boolean primary key default true check (id),
  password_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  updated_email text
);
create table if not exists public.pms_edit_sessions (
  user_id uuid primary key,
  email text,
  unlocked_at timestamptz not null default now(),
  unlocked_until timestamptz not null
);
-- 두 테이블 모두 정책 없음 = 클라이언트 직접 접근 불가. 아래 함수로만 다룬다.
alter table public.pms_edit_lock enable row level security;
alter table public.pms_edit_sessions enable row level security;

create or replace function public.pms_edit_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pms_edit_sessions
                 where user_id = auth.uid() and unlocked_until > now());
$$;

create or replace function public.pms_edit_status()
returns table (unlocked boolean, until timestamptz, has_password boolean, can_manage boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if current_role_level() < 3 then raise exception 'NOT_AUTHORIZED'; end if;
  return query
    select coalesce((select s.unlocked_until > now() from public.pms_edit_sessions s where s.user_id = auth.uid()), false),
           (select s.unlocked_until from public.pms_edit_sessions s where s.user_id = auth.uid()),
           exists (select 1 from public.pms_edit_lock),
           current_role_level() >= 4;
end $$;

create or replace function public.pms_edit_unlock(p_password text)
returns table (ok boolean, until timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare h text; who text; exp timestamptz;
begin
  if current_role_level() < 3 then raise exception 'NOT_AUTHORIZED'; end if;
  select password_hash into h from public.pms_edit_lock where id;
  if h is null then raise exception 'NO_PASSWORD_SET'; end if;
  if p_password is null or crypt(p_password, h) <> h then
    return query select false, null::timestamptz; return;
  end if;
  select u.email into who from auth.users u where u.id = auth.uid();
  exp := now() + interval '8 hours';
  insert into public.pms_edit_sessions (user_id, email, unlocked_at, unlocked_until)
  values (auth.uid(), who, now(), exp)
  on conflict (user_id) do update set unlocked_at = now(), unlocked_until = exp, email = excluded.email;
  return query select true, exp;
end $$;

create or replace function public.pms_edit_lock_now()
returns void language sql security definer set search_path = public as $$
  delete from public.pms_edit_sessions where user_id = auth.uid();
$$;

-- 암호 변경은 관리자(role_level >= 4)만. 바꾸면 전원 해제가 풀린다.
create or replace function public.pms_edit_set_password(p_new text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare who text;
begin
  if current_role_level() < 4 then raise exception 'NOT_AUTHORIZED'; end if;
  if p_new is null or length(btrim(p_new)) < 4 then raise exception 'TOO_SHORT'; end if;
  select u.email into who from auth.users u where u.id = auth.uid();
  insert into public.pms_edit_lock (id, password_hash, updated_at, updated_by, updated_email)
  values (true, crypt(btrim(p_new), gen_salt('bf')), now(), auth.uid(), who)
  on conflict (id) do update set password_hash = excluded.password_hash, updated_at = now(),
                                 updated_by = excluded.updated_by, updated_email = excluded.updated_email;
  delete from public.pms_edit_sessions;
  return true;
end $$;

revoke all on function public.pms_edit_unlock(text) from public, anon;
revoke all on function public.pms_edit_set_password(text) from public, anon;
grant execute on function public.pms_edit_status(), public.pms_edit_unlock(text),
                          public.pms_edit_lock_now(), public.pms_edit_set_password(text) to authenticated;

-- 저장·삭제에 잠금 강제 (본문은 20260907000001 과 동일, 아래 한 줄만 추가됨)
--   if not pms_edit_allowed() then raise exception 'EDIT_LOCKED'; end if;
-- 실제 적용된 전체 정의는 pms_project_save / pms_project_delete 함수 정의를 참조.

comment on table public.pms_edit_lock is '공정표 편집 암호(bcrypt). 열람은 직원 누구나, 편집은 암호 해제자만 (2026-09-07)';
comment on table public.pms_edit_sessions is '공정표 편집 잠금 해제 상태 — 사용자별 8시간 (2026-09-07)';
