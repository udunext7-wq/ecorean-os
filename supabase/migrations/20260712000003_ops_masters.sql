-- ECOREAN OS — 마이그레이션 3/7: 운영 마스터 (외주·하자·일정·공정카테고리·공정군·레거시공정)

-- ── subcontractors: 외주업체·특수공사 단가 (ECOREAN_외주업체DB.json 21건) ──
create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  sub_id text not null,
  category text not null,
  name text not null,
  unit text,
  price_min integer check (price_min >= 0),
  price_max integer check (price_max >= 0),
  price_typical integer check (price_typical >= 0),
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
  unique (tenant_id, sub_id),
  check (price_min is null or price_max is null or price_min <= price_max)
);
create trigger trg_subcontractors_updated before update on public.subcontractors
  for each row execute function public.set_updated_at();
comment on table public.subcontractors is '외주·장비·운반 단가. 원천: ECOREAN_외주업체DB.json. 현장 조건 변동 폭 큼 — min/max/typical';

-- ── defect_types: 하자 유형 (ECOREAN_하자유형DB.json 16건) ──
create table if not exists public.defect_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  defect_id text not null,
  category text not null,
  name text not null,
  severity text check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  typical_cause text,
  repair_method text,
  repair_cost_min integer check (repair_cost_min >= 0),
  repair_cost_max integer check (repair_cost_max >= 0),
  warranty_years integer,
  prevention text,
  responsibility text,
  check_timing text,
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
  unique (tenant_id, defect_id)
);
create trigger trg_defect_types_updated before update on public.defect_types
  for each row execute function public.set_updated_at();
comment on table public.defect_types is '하자 유형·AS 추적. 원천: ECOREAN_하자유형DB.json';

-- ── schedule_templates: 공정 일정 템플릿 (ECOREAN_공정일정템플릿.json 35건) ──
create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  process_code text not null,           -- cost_items.code soft ref
  process_name text not null,
  default_start_day integer,
  default_duration integer,
  predecessors text[] not null default '{}',
  successors text[] not null default '{}',
  critical_path boolean not null default false,
  worker_role text,
  min_workers integer,
  curring_hours numeric,                -- 양생 시간 (원본 필드명 curringHours 유지)
  lead_time_days integer,
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
  unique (tenant_id, process_code)
);
create trigger trg_schedule_templates_updated before update on public.schedule_templates
  for each row execute function public.set_updated_at();
comment on table public.schedule_templates is '착공일 기준 자동 스케줄 템플릿. 원천: ECOREAN_공정일정템플릿.json';

-- ── process_categories: 공정 코드별 노출 방식 (process-categories.json 147건) ──
create table if not exists public.process_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  code text not null,                   -- cost_items.code soft ref (커버리지 불일치로 FK 미강제)
  exposure text not null check (exposure in ('AUTO','SELECT','QTY','CONDITIONAL')),
  input_type text,
  module text,
  condition text,
  formula text,
  enabled boolean not null default true,
  origin_dataset text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create trigger trg_process_categories_updated before update on public.process_categories
  for each row execute function public.set_updated_at();
comment on table public.process_categories is '공정 코드별 노출방식(AUTO/SELECT/QTY/CONDITIONAL)·입력타입·모듈. 원천: process-categories.json';

-- ── process_groups: 공정군 룩업 (db.json categories 16건, C01 철거 ~) ──
create table if not exists public.process_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  code text not null,                   -- C01 ~ C16
  name text not null,
  color text,
  origin_dataset text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create trigger trg_process_groups_updated before update on public.process_groups
  for each row execute function public.set_updated_at();
comment on table public.process_groups is '공정군 색상 룩업 (C01 철거 등). 원천: db.json categories';

-- ── legacy_processes: P-코드 공정 단가 (db.json processes 234건) ──
-- 온톨로지 규칙(ontology.json)이 P001~P234 코드를 참조하므로 해석용으로 적재.
-- cost_items(MNG_PM 등 신 코드체계)와 코드 공간이 다른 구세대 데이터 — 혼입 방지 위해 별도 테이블.
create table if not exists public.legacy_processes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  code text not null,                   -- P001 ~ P234
  group_code text,                      -- process_groups.code (C01 ~)
  name text not null,
  unit text,
  price integer check (price >= 0),
  labor_cost integer check (labor_cost >= 0),
  material_cost integer check (material_cost >= 0),
  source text not null default 'principal_seed' check (source in
    ('principal_seed','principal_input','invoice','simulation','ai_market_avg')),
  data_status text not null default 'INTERNAL_ESTIMATED' check (data_status in
    ('OFFICIAL','INTERNAL_ESTIMATED','MARKET_RESEARCH','NEEDS_RESEARCH',
     'PARTIAL','STRUCTURE_READY','EMPTY','VERIFIED','INTERNAL_VALIDATED')),
  is_approved boolean not null default false,
  origin_dataset text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create trigger trg_legacy_processes_updated before update on public.legacy_processes
  for each row execute function public.set_updated_at();
comment on table public.legacy_processes is 'P-코드(P001~P234) 구세대 공정 단가. 원천: db.json v2.0. ontology_rules의 trigger/target 코드 해석용. 신규 견적에는 cost_items 사용';
