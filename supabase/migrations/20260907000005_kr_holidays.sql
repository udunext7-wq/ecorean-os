-- 한국 공휴일·기념일 (2026-09-07 대표 지시: 공정관리 대시보드 캘린더) — 적용 완료 기록본
-- 원천: 구글 공개 캘린더 ko.south_korea#holiday ICS (키 불필요, 대체공휴일 포함).
--   공공데이터포털 특일정보 API 는 같은 키로 활용신청이 안 되어 있어 사용 불가(2026-09-07 실측).
-- 공정표가 쉬는 날을 알아야 공기 산정이 맞으므로 is_off 로 휴무 여부를 구분한다.
create table if not exists public.kr_holidays (
  day date primary key,
  name text not null,
  kind text not null default 'public',   -- public 법정공휴일·대체 / labor 노동절 / memorial 기념일(근무)
  is_off boolean not null default true,
  source text not null default 'google-ics',
  fetched_at timestamptz not null default now()
);
create index if not exists ix_kr_holidays_day on public.kr_holidays (day);
alter table public.kr_holidays enable row level security;

drop policy if exists kr_holidays_read on public.kr_holidays;
create policy kr_holidays_read on public.kr_holidays
  for select to authenticated using (current_role_level() >= 3);

-- 서버 라우트(/api/calendar/holidays)가 로그인 세션으로 자동 갱신하므로 쓰기도 직원 이상
drop policy if exists kr_holidays_write on public.kr_holidays;
create policy kr_holidays_write on public.kr_holidays
  for all to authenticated using (current_role_level() >= 3) with check (current_role_level() >= 3);

comment on table public.kr_holidays is '한국 공휴일·기념일 (구글 공개 ICS 원천). 공정 캘린더·공기 산정용 — 2026-09-07';
-- 초기 데이터: supabase/seeds/seed_13_kr_holidays.sql (2021~2031, 273건). 적용 시 2026~2028 78건 선반영.
