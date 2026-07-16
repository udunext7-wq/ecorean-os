-- ECOREAN OS — 마이그레이션 5/7: 전체 DB 카탈로그 (수집 현황 관리)
-- 543개 항목의 "모아야 할 데이터" 마스터 정의. 단가 없음 — 수집 진행 상황 추적용.

create table if not exists public.db_catalog (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  category text not null,               -- 공정DB / 자재DB / 부자재·소모품DB / ...
  subcategory text,
  item_name text not null,
  required_data_fields text[] not null default '{}',
  source_candidates text[] not null default '{}',
  priority smallint check (priority between 1 and 3),
  data_status text not null default 'NEEDS_RESEARCH' check (data_status in
    ('OFFICIAL','INTERNAL_ESTIMATED','MARKET_RESEARCH','NEEDS_RESEARCH',
     'PARTIAL','STRUCTURE_READY','EMPTY','VERIFIED','INTERNAL_VALIDATED')),
  owner text,
  update_cycle text,
  connections text[] not null default '{}',  -- Master DB / Estimate Engine / Schedule Engine ...
  origin_dataset text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, category, subcategory, item_name)
);
create index if not exists idx_db_catalog_status on public.db_catalog (data_status);
create index if not exists idx_db_catalog_priority on public.db_catalog (priority);
create trigger trg_db_catalog_updated before update on public.db_catalog
  for each row execute function public.set_updated_at();

comment on table public.db_catalog is '전체 DB 수집 대상 카탈로그 543항목 — 수집 현황 관리. 원천: full-db-catalog.json. 외부 데이터 수집(다음 단계)의 작업 목록';
