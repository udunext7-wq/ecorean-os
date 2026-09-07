-- 되돌리기: 편집 암호 다시 끄기 (누구나 수정 가능해진다)
create or replace function public.pms_edit_allowed()
returns boolean language sql stable security definer set search_path = public as $$ select true $$;
