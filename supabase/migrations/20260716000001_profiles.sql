-- ECOREAN OS — 마이그레이션 12: profiles (D-011 / D-021 5역할 체계의 신원 테이블)
-- 목적: ecorean.net(내부) 접근 제어. 접근 주체는 도메인이 아니라 role (D-021).
-- 보안 원칙:
--   - 신규 사용자 기본 role = 'visitor' (최소 권한). staff 이상 승격은 service_role 경로만.
--   - 클라이언트는 자기 profile SELECT만 가능. 쓰기 정책 없음 → 권한 상승 불가.
--   - admin(4)/master(5)는 전체 profiles 조회 가능 (직원 관리 화면용).
-- rollback (헌법 4조):
--   drop trigger if exists trg_on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
--   drop function if exists public.current_role_level();
--   drop function if exists public.role_level(text);
--   drop table if exists public.profiles;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id text not null default 'HQ',
  email text,
  full_name text,
  role text not null default 'visitor' check (role in
    ('visitor','business_customer','staff','admin','master')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- 역할 서열 (D-021: visitor 1 → master 5)
create or replace function public.role_level(r text) returns int
language sql immutable as $$
  select case r
    when 'master' then 5
    when 'admin' then 4
    when 'staff' then 3
    when 'business_customer' then 2
    when 'visitor' then 1
    else 0 end
$$;

-- 현재 로그인 사용자의 역할 서열 (RLS 정책용. security definer 로 profiles 정책 재귀 회피)
create or replace function public.current_role_level() returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select role_level(role) from profiles where id = auth.uid()), 0)
$$;

alter table public.profiles enable row level security;
create policy "read_own_profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "admin_read_all_profiles" on public.profiles
  for select to authenticated using (public.current_role_level() >= 4);
-- 쓰기 정책 없음 → service_role 만 쓰기 가능 (권한 상승 차단)

-- 신규 auth 사용자 → profile 자동 생성 (기본 visitor)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end
$$;
drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

comment on table public.profiles is
  '사용자 신원·역할 (D-021 5역할). 기본 visitor — staff 이상 승격은 service_role 경로만. 클라이언트 쓰기 정책 없음(권한 상승 차단)';
