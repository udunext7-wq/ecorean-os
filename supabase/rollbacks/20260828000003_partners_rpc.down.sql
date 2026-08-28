-- ROLLBACK for 20260828000003_partners_rpc.sql
-- 되돌리는 내용: 거래처 쓰기 함수 4개 (security definer)
-- 주의: 무손실 (함수만 제거). 단, 제거하면 거래처 화면의 모든 쓰기 경로가 사라진다
--       — RLS 에 쓰기 정책이 없으므로 등록·수정이 전부 불가능해진다(설계상 의도).
-- 적용: MCP execute_sql 로 전체 실행. 004 를 먼저 되돌린 뒤 이 파일.

-- 1) forward 의 역순
drop function if exists public.partner_price_decide(uuid, boolean);
drop function if exists public.partner_price_propose(jsonb);
drop function if exists public.partner_contract_upsert(jsonb);
drop function if exists public.partner_upsert(jsonb);

-- 2) 원격 마이그레이션 이력 제거
delete from supabase_migrations.schema_migrations where version = '20260828114136';
