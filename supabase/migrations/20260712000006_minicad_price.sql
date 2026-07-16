-- ECOREAN OS — 마이그레이션 6/7: MiniCAD 단가표 연동
-- MiniCAD v5.9 규약: priceKey = "카탈로그키.옵션" (예: FLOORING.STRONG), 금액 = 정수(원)
-- 교환 스키마: ECOREAN.PriceTable.v1 { items: {key: price}, config: {overheadPct, vatPct} }
-- 헌법: 단가 추정 금지 — 승인·확정된 키만 뷰에 노출, 미확정 키는 앱이 NEEDS_RESEARCH 처리

-- ── minicad_price_keys: priceKey ↔ 단가 원천 매핑 ──
create table if not exists public.minicad_price_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  price_key text not null,              -- "FLOORING.STRONG" 형식
  cost_item_code text,                  -- cost_items.code soft ref (매핑 시)
  material_id text,                     -- materials.mat_id soft ref (매핑 시)
  price_override integer check (price_override >= 0),  -- 매핑 대신 직접 확정 단가
  is_approved boolean not null default false,
  approved_at timestamptz,
  approved_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, price_key)
);
create trigger trg_minicad_price_keys_updated before update on public.minicad_price_keys
  for each row execute function public.set_updated_at();
comment on table public.minicad_price_keys is 'MiniCAD priceKey("카탈로그키.옵션") ↔ cost_items/materials 매핑. 자동 매핑 불가 — 수동 등록(minicad-key-map.json)으로 점진 확장';

-- ── minicad_config: 견적 공통 설정 (간접비율·부가세율) ──
create table if not exists public.minicad_config (
  tenant_id text primary key default 'HQ',
  overhead_pct numeric not null default 10,
  vat_pct numeric not null default 10,
  updated_at timestamptz not null default now()
);
create trigger trg_minicad_config_updated before update on public.minicad_config
  for each row execute function public.set_updated_at();
insert into public.minicad_config (tenant_id) values ('HQ')
on conflict (tenant_id) do nothing;
comment on table public.minicad_config is 'MiniCAD 견적 설정 (ECOREAN.PriceTable.v1의 config)';

-- ── v_minicad_price_table: 앱이 읽는 확정 단가 뷰 ──
-- 우선순위: price_override > cost_items 합산(노무+자재+장비+부자재)
-- is_approved=true 이고 단가가 실제로 존재하는 행만 노출 (헌법: 미확정 단가 미노출)
create or replace view public.v_minicad_price_table
with (security_invoker = true) as
select
  k.tenant_id,
  k.price_key,
  coalesce(
    k.price_override,
    ci.labor_cost + ci.material_cost + ci.equipment_cost + ci.accessory_cost,
    m.unit_price
  ) as price
from public.minicad_price_keys k
left join public.cost_items ci
  on ci.tenant_id = k.tenant_id and ci.code = k.cost_item_code and ci.is_approved
left join public.materials m
  on m.tenant_id = k.tenant_id and m.mat_id = k.material_id and m.is_approved
where k.is_approved
  and coalesce(
    k.price_override,
    ci.labor_cost + ci.material_cost + ci.equipment_cost + ci.accessory_cost,
    m.unit_price
  ) is not null;

comment on view public.v_minicad_price_table is 'MiniCAD ECOREAN.PriceTable.v1 items 원천 — 승인+확정 단가만. 앱: 이 뷰 + minicad_config로 JSON 조립';
