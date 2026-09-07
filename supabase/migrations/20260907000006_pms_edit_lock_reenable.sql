-- 편집 암호 다시 켜기 (2026-09-07 저녁 대표 지시) — 적용 완료 기록본
-- "저장된 파일은 누구나 볼 수 있지만, 수정하려면 비밀번호를 입력해야 한다"
-- 20260907000004 에서 비활성화(true)했던 판정을 원래대로 되돌린다.
-- 이번 화면 구현은 편집 '진입'만 막고 되돌리기를 하지 않으므로 지난번 무한 루프가 재현되지 않는다.
create or replace function public.pms_edit_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pms_edit_sessions
    where user_id = auth.uid() and unlocked_until > now()
  );
$$;
