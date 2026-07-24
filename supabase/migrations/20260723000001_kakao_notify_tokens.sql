-- 카카오 "나에게 보내기" 알림용 토큰 저장소 (2026-07-23, 07-24 config 테이블 방식으로 확정)
-- 상담신청(/api/contact) 시 대표 개인 카톡(나와의 채팅)으로 알림 발송.
-- 접근: RLS로 전면 차단. 서버(KAKAO_REST_API_KEY 보유)만 definer 함수 경유로 접근.
-- 검증 키(카카오 REST API 키)는 레포에 두지 않는다:
--   DB:   kakao_notify_config 테이블에 1행 insert (별도 수동 적용, RLS 차단)
--   서버: Vercel env KAKAO_REST_API_KEY (동일 값)
-- ※ GUC(alter database set) 방식은 Supabase 권한 제한으로 불가하여 테이블 방식 채택.

create table if not exists public.kakao_notify_tokens (
  id int primary key default 1 check (id = 1), -- 단일 행 (대표 계정 1개)
  access_token text,
  access_expires_at timestamptz,
  refresh_token text,
  updated_at timestamptz not null default now()
);
alter table public.kakao_notify_tokens enable row level security;

create table if not exists public.kakao_notify_config (
  id int primary key default 1 check (id = 1),
  rest_key text not null
);
alter table public.kakao_notify_config enable row level security;
-- 두 테이블 모두 정책 없음 → anon/authenticated 직접 접근 전면 차단

create or replace function public.kakao_save_tokens(
  p_secret text,
  p_access text,
  p_access_expires_at timestamptz,
  p_refresh text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  select rest_key into v_key from kakao_notify_config where id = 1;
  if v_key is null or p_secret is distinct from v_key then
    raise exception 'FORBIDDEN';
  end if;
  insert into kakao_notify_tokens (id, access_token, access_expires_at, refresh_token, updated_at)
  values (1, p_access, p_access_expires_at, p_refresh, now())
  on conflict (id) do update set
    access_token = excluded.access_token,
    access_expires_at = excluded.access_expires_at,
    -- 카카오는 refresh 갱신 시에만 새 refresh_token을 주므로 null이면 기존 값 유지
    refresh_token = coalesce(excluded.refresh_token, kakao_notify_tokens.refresh_token),
    updated_at = now();
end $$;

create or replace function public.kakao_get_tokens(p_secret text)
returns table (access_token text, access_expires_at timestamptz, refresh_token text)
language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  select rest_key into v_key from kakao_notify_config where id = 1;
  if v_key is null or p_secret is distinct from v_key then
    raise exception 'FORBIDDEN';
  end if;
  return query
    select t.access_token, t.access_expires_at, t.refresh_token
    from kakao_notify_tokens t where t.id = 1;
end $$;
