-- 관리자 즉시 비밀번호 재설정 (대표 지시 2026-08-24: 메일 지연 없이 바로 진행)
-- 배경: Supabase 기본 SMTP 는 시간당 2건 제한 → 비밀번호 찾기 메일이 바로 안 갈 수 있음.
--   admin+ 가 BOC 회원 관리에서 임시 비밀번호를 즉시 발급하는 경로를 신설한다.
-- 보안 (decide_role_request 패턴):
--   - security definer. admin(레벨 4)+ 만 호출. raise 메시지는 코드형.
--   - 대상 역할이 호출자 레벨 이상이면 차단 (본인은 예외) — admin 이 master 비밀번호 변경 불가.
--   - 변경 시 대상의 기존 세션 전부 종료(강제 재로그인) + 이메일 미인증이면 인증 처리.
-- rollback:
--   drop function if exists public.admin_reset_password(text, text);

create or replace function public.admin_reset_password(target_email text, new_password text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  caller_level int := public.current_role_level();
  target_id uuid;
  target_role text;
begin
  if caller_level < 4 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if new_password is null or length(new_password) < 6 then
    raise exception 'PASSWORD_TOO_SHORT';
  end if;

  select u.id, coalesce(p.role, 'visitor') into target_id, target_role
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(u.email) = lower(trim(target_email))
    limit 1;
  if target_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;
  if target_id <> auth.uid() and public.role_level(target_role) >= caller_level then
    raise exception 'NEEDS_HIGHER_APPROVER';
  end if;

  update auth.users
    set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = target_id;

  -- 기존 로그인 전부 종료 (임시 비밀번호 발급 후 본인만 새로 로그인 가능)
  delete from auth.sessions where user_id = target_id;
end
$$;

revoke all on function public.admin_reset_password(text, text) from public, anon;
grant execute on function public.admin_reset_password(text, text) to authenticated;

comment on function public.admin_reset_password(text, text) is
  '관리자(admin+) 즉시 임시 비밀번호 발급. 대상 역할 < 호출자 레벨(본인 예외). 세션 전부 종료 + 미인증 이메일 인증 처리';
