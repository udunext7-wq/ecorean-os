-- 되돌리기: 편집 잠금 다시 켜기 (2026-09-07)
-- 주의: 켜면 암호로 잠금을 푼 사람만 저장·삭제할 수 있다. 화면 쪽 관문도 함께 되살려야 한다.
create or replace function public.pms_edit_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pms_edit_sessions
                 where user_id = auth.uid() and unlocked_until > now());
$$;
