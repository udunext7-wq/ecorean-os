-- ECOREAN OS — 마이그레이션 8: MiniCAD 자재 코드표
-- 원천: MiniCAD-v5.9-Galaxy/js/data.js — FLOOR_MATERIALS(14) / WALL_MATERIALS(15) / CEILING_MATERIALS(9)
-- FloorPlan JSON(ECOREAN.FloorPlan.v5.9)의 spaces[].floorMaterial/ceilingMaterial 코드가 이 표를 참조.
-- 헌법: 코드표에는 단가 없음 — 단가는 cost_items / minicad_price_keys 에서만.

create table if not exists public.minicad_material_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  surface text not null check (surface in ('floor','wall','ceiling')),
  code text not null,
  name text not null,
  sort_order integer,
  origin_dataset text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, surface, code)
);
create trigger trg_minicad_material_codes_updated before update on public.minicad_material_codes
  for each row execute function public.set_updated_at();
comment on table public.minicad_material_codes is 'MiniCAD 마감재 코드표 (바닥/벽/천장). 원천: MiniCAD-v5.9-Galaxy/js/data.js. 단가 없음 — 코드·명칭만';

alter table public.minicad_material_codes enable row level security;
create policy "authenticated_read" on public.minicad_material_codes for select to authenticated using (true);
