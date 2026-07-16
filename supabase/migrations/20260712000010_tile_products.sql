-- ECOREAN OS — 마이그레이션 10: 벤더 실 SKU 카탈로그 (타일·위생도기·부자재)
-- 원천: ecorean-tile-catalog/index.html 의 TILE_CATALOG (2,550건 / 24 카테고리)
-- 이 데이터는 지금까지 1MB HTML 한 줄 + 브라우저 localStorage 에만 존재했다 (기기별 분기·소실 위험).
--
-- materials(공정 연계 자재 35건)와 별도 테이블인 이유: 성격이 다르다.
--   materials     = 공정에 물리는 자재 (processId 연계, 발주서 산출용)
--   tile_products = 벤더 실 SKU (박스 단위 실공급가·창고 재고·제품 이미지)
-- brands(견적용 ㎡ 대표단가 35건)와도 중복 없음 — brands는 추상 등급, 여기는 구체 품목.
--   예: brands.TIL-002(포세린 ㎡ 35,000)의 실체가 이 표의 포세린 317건 + REGNO 237건이다.
--
-- 헌법: 단가 추정 금지. 무단가 22건은 unit_price=null / data_status='NEEDS_RESEARCH' 로 남긴다.

create table if not exists public.tile_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  code text not null,                    -- 벤더 SKU 코드 (원본 중복 0건 — 자연키)
  tag text,                              -- 제품 계열명 (한글)
  name text not null,                    -- 원 제품명
  category text not null,                -- 24종: 이태리유럽 / 위생도기 / 포세린 / REGNO / 부자재 ...
  section text check (section in ('wall','floor','porcelain','polishing','stair','stone','sanitary','subsidiary')),
  brand text,                            -- 수입 / 태영 / 대동 / 대보 / KT세라믹 / 이누스 / REGNO
  unit text,                             -- 박스 / 개 / 세트 / 봉
  unit_price integer check (unit_price >= 0),   -- 벤더 공급가 (단위당). null = 미확보

  -- spec 원문에서 파싱한 규격. 파싱 커버리지가 100%가 아니므로(규격 77%, 박스 62%)
  -- spec_raw 가 원본 진실이고 아래 컬럼은 보조다. 파싱 실패 시 null.
  size_w_mm integer,
  size_h_mm integer,
  thickness_mm numeric,
  box_qty numeric,                       -- 박스당 입수
  area_per_box_m2 numeric,               -- 박스당 ㎡ (면적 → 박스 수량 산출용)
  weight_kg numeric,
  stock jsonb not null default '{}'::jsonb,   -- 창고별 재고 {"여주":27,"대자동":25}
  spec_raw text,                         -- spec 원문 보존 (필수)

  portal_id integer,                     -- 이미지 URL 전건 패턴: .../images/{thumb|original}/portal_<id>.jpg
  img_thumb_url text generated always as (
    case when portal_id is null then null
    else 'https://usongtile.netlify.app/images/thumb/portal_' || portal_id || '.jpg' end) stored,
  img_full_url text generated always as (
    case when portal_id is null then null
    else 'https://usongtile.netlify.app/images/original/portal_' || portal_id || '.jpg' end) stored,

  source text not null default 'principal_seed' check (source in
    ('principal_seed','principal_input','invoice','simulation','ai_market_avg')),
  source_detail text,
  data_status text not null default 'NEEDS_RESEARCH' check (data_status in
    ('OFFICIAL','INTERNAL_ESTIMATED','MARKET_RESEARCH','NEEDS_RESEARCH',
     'PARTIAL','STRUCTURE_READY','EMPTY','VERIFIED','INTERNAL_VALIDATED')),
  is_approved boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  origin_dataset text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists idx_tile_products_category on public.tile_products (category);
create index if not exists idx_tile_products_section on public.tile_products (section);
create index if not exists idx_tile_products_brand on public.tile_products (brand);
create index if not exists idx_tile_products_status on public.tile_products (data_status);
create trigger trg_tile_products_updated before update on public.tile_products
  for each row execute function public.set_updated_at();

comment on table public.tile_products is '벤더 실 SKU 카탈로그 2,550건 (타일·위생도기·부자재). 원천: ecorean-tile-catalog/index.html TILE_CATALOG. 이미지 URL은 portal_id에서 생성. spec_raw가 규격 원본 진실 — 파싱 컬럼은 보조';

alter table public.tile_products enable row level security;
create policy "authenticated_read" on public.tile_products for select to authenticated using (true);
