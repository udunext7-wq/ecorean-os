-- ROLLBACK for 20260828000001_partners_master.sql
-- 되돌리는 내용: 거래처 마스터 3테이블 + work_* 의 partner_id 연결 + 공정군 16행 시드
-- 주의: **데이터 유실** — partners / partner_contracts / partner_prices 가 통째로 사라진다.
--       work_* 의 기존 vendor_name·counterparty 텍스트는 애초에 건드리지 않았으므로 무손실.
-- 적용: MCP execute_sql 로 전체 실행. 002·003·004 를 먼저 되돌린 뒤 마지막에 이 파일.

-- 1) forward 의 역순
drop index if exists public.work_schedule_items_partner_idx;
drop index if exists public.work_invoices_partner_idx;
drop index if exists public.work_purchase_orders_partner_idx;
alter table public.work_schedule_items  drop column if exists partner_id;
alter table public.work_invoices        drop column if exists partner_id;
alter table public.work_purchase_orders drop column if exists partner_id;

drop trigger if exists partner_prices_set_updated_at on public.partner_prices;
drop table if exists public.partner_prices;          -- 데이터 유실

drop trigger if exists partner_contracts_set_updated_at on public.partner_contracts;
drop table if exists public.partner_contracts;       -- 데이터 유실

drop trigger if exists partners_set_updated_at on public.partners;
drop table if exists public.partners;                -- 데이터 유실
drop sequence if exists public.partners_code_seq;

-- 공정군 시드는 db.json 에서 넣은 16행만 제거 (다른 경로로 들어온 행은 보존)
delete from public.process_groups
where tenant_id = 'HQ'
  and origin_dataset = 'db.json'
  and code in ('C01','C02','C03','C04','C05','C06','C07','C08',
               'C09','C10','C11','C12','C13','C14','C15','C16');

-- 2) 원격 마이그레이션 이력 제거
delete from supabase_migrations.schema_migrations where version = '20260828113944';
