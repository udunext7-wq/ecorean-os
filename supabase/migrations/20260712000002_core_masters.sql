-- ECOREAN OS — 마이그레이션 2/7: 핵심 마스터 (공정단가·자재·브랜드·인건비)
-- 공통 컬럼 설계: 레거시 v6.0 cost_items (assets/data/db-legacy/migrations/v6.0/004_cost_items_up.sql) 계승
--   source 5종 분류 + is_approved(구 is_approved_by_principal) + tenant_id
-- 헌법: 단가 추정 금지 — 미확정은 data_status='NEEDS_RESEARCH', 승인 전 is_approved=false

-- ── cost_items: 공정 단가 (cost-items-v2.json 622건 + 공정단가DB v2.2 62건 병합) ──
create table if not exists public.cost_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  code text not null,
  major_category text not null,
  middle_category text,
  name text not null,
  unit text not null,
  labor_cost integer not null default 0 check (labor_cost >= 0),
  material_cost integer not null default 0 check (material_cost >= 0),
  equipment_cost integer not null default 0 check (equipment_cost >= 0),
  accessory_cost integer not null default 0 check (accessory_cost >= 0),
  waste_rate numeric,
  default_margin_rate numeric,
  default_duration integer,
  lead_time_days integer,
  trigger_type text,
  quantity_formula text,
  -- 출처·승인 (레거시 v6.0 계승)
  source text not null default 'principal_seed' check (source in
    ('principal_seed','principal_input','invoice','simulation','ai_market_avg')),
  source_detail text,
  source_date date,
  data_status text not null default 'NEEDS_RESEARCH' check (data_status in
    ('OFFICIAL','INTERNAL_ESTIMATED','MARKET_RESEARCH','NEEDS_RESEARCH',
     'PARTIAL','STRUCTURE_READY','EMPTY','VERIFIED','INTERNAL_VALIDATED')),
  is_approved boolean not null default false,
  is_ai_estimated boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  origin_dataset text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists idx_cost_items_major on public.cost_items (major_category);
create index if not exists idx_cost_items_source on public.cost_items (source);
create index if not exists idx_cost_items_approved on public.cost_items (is_approved);
create trigger trg_cost_items_updated before update on public.cost_items
  for each row execute function public.set_updated_at();
comment on table public.cost_items is '공정 단가 마스터. 원천: cost-items-v2.json(base) + ECOREAN_공정단가DB_v2.2.json(enrich). 단가 추정 금지 — 승인 전 is_approved=false';

-- ── materials: 개별 자재 (ECOREAN_자재DB.json 35건, 발주서 자동 생성용) ──
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  mat_id text not null,
  name text not null,
  unit text not null,
  unit_price integer check (unit_price >= 0),
  coverage_per_unit numeric,
  process_code text,          -- cost_items.code soft ref (FK 미강제, 검증 쿼리로 대조)
  brand text,
  spec text,
  lead_days integer,
  source text not null default 'principal_seed' check (source in
    ('principal_seed','principal_input','invoice','simulation','ai_market_avg')),
  source_detail text,
  source_date date,
  data_status text not null default 'NEEDS_RESEARCH' check (data_status in
    ('OFFICIAL','INTERNAL_ESTIMATED','MARKET_RESEARCH','NEEDS_RESEARCH',
     'PARTIAL','STRUCTURE_READY','EMPTY','VERIFIED','INTERNAL_VALIDATED')),
  is_approved boolean not null default false,
  is_ai_estimated boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  origin_dataset text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, mat_id)
);
create trigger trg_materials_updated before update on public.materials
  for each row execute function public.set_updated_at();
comment on table public.materials is '개별 자재 마스터 (발주서 생성용). 원천: ECOREAN_자재DB.json';

-- ── brands: 브랜드별 실공급가 (ECOREAN_브랜드DB.json 35건) ──
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  brand_id text not null,
  category text not null,     -- flooring / wallpaper / windows / kitchen / bathroom / tile / countherTop(원본 표기 유지)
  brand text not null,
  product text not null,
  unit text,
  supply_price integer check (supply_price >= 0),
  retail_price integer check (retail_price >= 0),
  grade text,
  lead_days integer,
  attrs jsonb not null default '{}'::jsonb,  -- thickness, feature, rollWidth, rollLength, sqmPerRoll 등 카테고리별 가변 필드
  source text not null default 'principal_seed' check (source in
    ('principal_seed','principal_input','invoice','simulation','ai_market_avg')),
  source_detail text,
  source_date date,
  data_status text not null default 'NEEDS_RESEARCH' check (data_status in
    ('OFFICIAL','INTERNAL_ESTIMATED','MARKET_RESEARCH','NEEDS_RESEARCH',
     'PARTIAL','STRUCTURE_READY','EMPTY','VERIFIED','INTERNAL_VALIDATED')),
  is_approved boolean not null default false,
  is_ai_estimated boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  origin_dataset text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, brand_id)
);
create index if not exists idx_brands_category on public.brands (category);
create trigger trg_brands_updated before update on public.brands
  for each row execute function public.set_updated_at();
comment on table public.brands is '브랜드별 실공급가 (B2B). 원천: ECOREAN_브랜드DB.json';

-- ── labor_roles: 직종별 노임 (ECOREAN_인건비DB_2025공식.json 18건 + seeds-legacy 누락분) ──
create table if not exists public.labor_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  role_id text not null,
  role_name text not null,
  grade text,
  daily_rate_official integer check (daily_rate_official >= 0),
  daily_rate_ecorean integer check (daily_rate_ecorean >= 0),
  hourly_rate integer check (hourly_rate >= 0),
  productivity jsonb not null default '{}'::jsonb,     -- sqmPerDay: 공정명 키 가변
  regional_factor jsonb not null default '{}'::jsonb,  -- 지역 계수
  source text not null default 'principal_seed' check (source in
    ('principal_seed','principal_input','invoice','simulation','ai_market_avg')),
  source_detail text,
  source_date date,
  data_status text not null default 'NEEDS_RESEARCH' check (data_status in
    ('OFFICIAL','INTERNAL_ESTIMATED','MARKET_RESEARCH','NEEDS_RESEARCH',
     'PARTIAL','STRUCTURE_READY','EMPTY','VERIFIED','INTERNAL_VALIDATED')),
  is_approved boolean not null default false,
  is_ai_estimated boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  origin_dataset text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, role_id)
);
create trigger trg_labor_roles_updated before update on public.labor_roles
  for each row execute function public.set_updated_at();
comment on table public.labor_roles is '직종별 노임 마스터. 원천: ECOREAN_인건비DB_2025공식.json (대한건설협회 시중노임단가)';
