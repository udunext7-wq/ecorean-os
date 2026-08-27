-- 한 지번의 여러 동(아파트 단지 등)을 모두 캐시하도록 키 확장 (2026-08-27) — 적용 완료 기록본
alter table public.gov_building_cache add column if not exists mgm_pk text default '0';
drop index if exists uq_gov_bld;
create unique index if not exists uq_gov_bld on public.gov_building_cache(sigungu_cd, bjdong_cd, bun, ji, mgm_pk);
