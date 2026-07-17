-- ⚠️ 아직 원격 미적용 — 대표 승인 후 MCP apply_migration 으로 적용할 것
-- profiles 정합화 — 7/15 수동 생성분과 v0.1 마이그레이션 병합 정리
-- 핵심: profiles_update_own 정책은 본인 role 자가 승격(→master)을 허용하는 보안 구멍
-- rollback:
--   drop constraint profiles_role_check; alter column role set default 'customer';
--   (제거한 정책들은 supabase 대시보드 이력 참조하여 재생성)

-- 1) 컬럼 보강 (코드 타입과 일치)
alter table public.profiles add column if not exists tenant_id text not null default 'HQ';

-- 2) 역할 체계를 D-021 5역할로 정규화
alter table public.profiles alter column role set default 'visitor';
update public.profiles set role = 'business_customer' where role = 'customer';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check
      check (role in ('visitor','business_customer','staff','admin','master'));
  end if;
end $$;

-- 3) 권한 상승 차단: 클라이언트 쓰기 정책 제거 (role 부여는 service_role 경로만)
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;

-- 4) SELECT 정책 중복 정리 (read_own_profile + admin_read_all_profiles 로 일원화)
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;
