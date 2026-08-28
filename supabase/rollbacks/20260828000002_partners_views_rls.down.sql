-- ROLLBACK for 20260828000002_partners_views_rls.sql
-- 되돌리는 내용: 거래처 뷰 2개 + SELECT 정책 3개 + RLS 활성화
-- 주의: 무손실 (뷰·정책만 제거, 행 데이터는 그대로)
-- 적용: MCP execute_sql 로 전체 실행. 003·004 를 먼저 되돌린 뒤 이 파일, 그다음 001.

-- 1) forward 의 역순
drop view if exists public.v_partner_overview;
drop view if exists public.v_partner_price_effective;

drop policy if exists "partner_prices_select_staff"    on public.partner_prices;
drop policy if exists "partner_contracts_select_staff" on public.partner_contracts;
drop policy if exists "partners_select_staff"          on public.partners;

-- RLS 자체를 끈다. 단, 정책이 하나도 없는 상태에서 RLS 를 끄면 테이블이 그대로
-- 노출되므로, 001 로 테이블을 드롭할 것이 아니라면 이 두 줄은 건너뛴다.
alter table public.partner_prices    disable row level security;
alter table public.partner_contracts disable row level security;
alter table public.partners          disable row level security;

-- 2) 원격 마이그레이션 이력 제거
delete from supabase_migrations.schema_migrations where version = '20260828114023';
