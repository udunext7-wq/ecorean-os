-- executive 역할이 role_level() 에 누락 → 레벨 0 처리로 staff 기능(무드보드·PMS 저장 등)이
-- 전면 차단되던 버그 수정 (2026-08-25, 무드보드 오류 조사 중 발견 — blue4154 계정이 executive)
-- TS(core/auth/roles.ts) 서열과 정합: executive 는 staff 이상, admin 미만 → DB 게이트 기준 3
-- rollback: supabase/rollbacks/20260825000002_role_level_executive.down.sql
create or replace function public.role_level(r text) returns int
language sql immutable as $$
  select case r
    when 'master' then 5
    when 'admin' then 4
    when 'executive' then 3
    when 'staff' then 3
    when 'business_customer' then 2
    when 'visitor' then 1
    else 0 end
$$;
