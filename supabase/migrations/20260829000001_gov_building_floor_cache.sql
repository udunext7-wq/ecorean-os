-- 건축물대장 층별개요 캐시 (2026-08-29 대표 지시) — Supabase 적용 완료 기록본
-- 층별개요는 한 지번당 수백 건(개포동 12 = 443건 / 5페이지)이라 매번 호출하면 일일 한도를 갉아먹는다.
-- 동(mgm_pk) 단위로 층 배열을 통째로 보관한다. 층 구성은 거의 바뀌지 않으므로 캐시 수명이 길다.
create table if not exists public.gov_building_floor_cache (
  id uuid primary key default gen_random_uuid(),
  sigungu_cd text not null,
  bjdong_cd text not null,
  bun text not null,
  ji text not null,
  mgm_pk text not null,
  dong_nm text,
  bld_nm text,
  floors jsonb not null default '[]'::jsonb,
  floor_cnt integer,
  area_sum numeric,
  fetched_by uuid default auth.uid(),
  fetched_at timestamptz not null default now()
);

create unique index if not exists uq_gov_bld_floor
  on public.gov_building_floor_cache (sigungu_cd, bjdong_cd, bun, ji, mgm_pk);
create index if not exists ix_gov_bld_floor_lot
  on public.gov_building_floor_cache (sigungu_cd, bjdong_cd, bun, ji);

alter table public.gov_building_floor_cache enable row level security;

-- gov_building_cache 와 동일한 권한 기준: 직원(role_level 3) 이상만 조회·기록
drop policy if exists gov_bld_flr_select on public.gov_building_floor_cache;
create policy gov_bld_flr_select on public.gov_building_floor_cache
  for select to authenticated using (current_role_level() >= 3);

drop policy if exists gov_bld_flr_insert on public.gov_building_floor_cache;
create policy gov_bld_flr_insert on public.gov_building_floor_cache
  for insert to authenticated with check (current_role_level() >= 3);

drop policy if exists gov_bld_flr_update on public.gov_building_floor_cache;
create policy gov_bld_flr_update on public.gov_building_floor_cache
  for update to authenticated using (current_role_level() >= 3);

comment on table public.gov_building_floor_cache is
  '건축물대장 층별개요 캐시 — 국토교통부 건축HUB getBrFlrOulnInfo 응답을 동 단위로 보관 (2026-08-29)';
