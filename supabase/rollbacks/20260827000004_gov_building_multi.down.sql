-- rollback: 20260827000004_gov_building_multi.sql
drop index if exists uq_gov_bld;
create unique index if not exists uq_gov_bld on public.gov_building_cache(sigungu_cd, bjdong_cd, bun, ji);
alter table public.gov_building_cache drop column if exists mgm_pk;
