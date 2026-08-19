-- ROLLBACK for <YYYYMMDD>NNNNNN_<name>.sql
-- 되돌리는 내용: <forward 마이그레이션이 만든 것을 한 줄로>
-- 주의: <데이터 유실 여부 — 테이블 drop 이면 "데이터 유실" 명시, 정책/함수 교체면 "무손실">
-- 적용: MCP execute_sql 로 전체 실행

-- 1) forward 의 역순으로 되돌린다 (마지막에 만든 것부터 먼저 제거)
-- drop policy if exists ... ;
-- drop function if exists ... ;
-- drop table if exists ... ;          -- 데이터 유실이면 주석으로 경고
-- create or replace function ...      -- 교체형이면 이전 정의를 그대로 복원

-- 2) 원격 마이그레이션 이력 제거 (apply_migration 으로 올린 경우 원격 version 을 적는다)
-- delete from supabase_migrations.schema_migrations where version = '<원격 version>';
