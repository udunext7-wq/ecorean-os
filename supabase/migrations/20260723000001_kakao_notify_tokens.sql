-- 카카오 "나에게 보내기" 알림용 토큰 저장소 (2026-07-23)
-- 상담신청(/api/contact) 시 대표 개인 카톡(나와의 채팅)으로 알림 발송.
-- 접근: RLS로 전면 차단, 서버 전용 시크릿을 아는 호출자만 security definer 함수 경유.
-- 시크릿 값은 레포에 두지 않는다:
--   DB:   alter database postgres set app.kakao_rest_key = '<카카오 REST API 키>';  (별도 수동 적용)
--   서버: Vercel env KAKAO_REST_API_KEY (동일 값 — REST 키를 공유 비밀로 겸용)

create table if not exists public.kakao_notify_tokens (
  id int primary key default 1 check (id = 1), -- 단일 행 (대표 계정 1개)
  access_token text,
  access_expires_at timestamptz,
  refresh_token text,
  updated_at timestamptz not null default now()
);

alter table public.kakao_notify_tokens enable row level security;
-- 정책 없음 → anon/authenticated 직접 접근 전면 차단

create or replace function public.kakao_save_tokens(
  p_secret text,
  p_access text,
  p_access_expires_at timestamptz,
  p_refresh text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.kakao_rest_key', true), '') = ''
     or p_secret is distinct from current_setting('app.kakao_rest_key', true) then
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
begin
  if coalesce(current_setting('app.kakao_rest_key', true), '') = ''
     or p_secret is distinct from current_setting('app.kakao_rest_key', true) then
    raise exception 'FORBIDDEN';
  end if;
  return query
    select t.access_token, t.access_expires_at, t.refresh_token
    from kakao_notify_tokens t where t.id = 1;
end $$;
