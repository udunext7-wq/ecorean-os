-- 되돌리기: 공정표 편집 잠금 해제 (2026-09-07)
-- 주의: 이걸 실행하면 직원 누구나 다시 공정표를 수정할 수 있게 된다.
create or replace function public.pms_edit_allowed()
returns boolean language sql stable security definer set search_path = public as $$ select true $$;
drop function if exists public.pms_edit_set_password(text);
drop function if exists public.pms_edit_unlock(text);
drop function if exists public.pms_edit_lock_now();
drop function if exists public.pms_edit_status();
drop table if exists public.pms_edit_sessions;
drop table if exists public.pms_edit_lock;
