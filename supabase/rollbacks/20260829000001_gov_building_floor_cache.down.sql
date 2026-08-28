-- 되돌리기: 건축물대장 층별개요 캐시 제거 (2026-08-29)
-- 캐시 전용 테이블이라 삭제해도 원본(공공데이터포털)에서 다시 받을 수 있다.
drop table if exists public.gov_building_floor_cache;
