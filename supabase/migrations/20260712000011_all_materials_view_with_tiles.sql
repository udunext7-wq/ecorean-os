-- ECOREAN OS — 마이그레이션 11: 통합 자재 뷰에 벤더 실 SKU(tile_products) 편입
-- 자재 원천 4개를 한 곳에서 조회한다:
--   materials(35)              — 공정 연계 자재 (processId)
--   brands(35)                 — 견적용 ㎡ 대표단가 (추상 등급)
--   minicad_material_codes(38) — MiniCAD 마감재 코드표 (단가 없음)
--   tile_products(2550)        — 벤더 실 SKU (박스 실공급가·재고·이미지)
-- 단가는 원본 그대로 노출하며 추정하지 않는다(헌법). unit_price=null → 단가 미확보.
-- 마이그레이션 9의 뷰와 컬럼 구성이 다르므로 재생성(drop → create).

drop view if exists public.v_all_materials;

create view public.v_all_materials
with (security_invoker = true) as
select
  m.tenant_id,
  'materials'::text        as origin_table,
  m.mat_id                 as item_id,
  m.name                   as name,
  m.brand                  as brand,
  null::text               as category,
  m.unit                   as unit,
  m.unit_price             as unit_price,
  null::integer            as retail_price,
  m.process_code           as process_code,
  m.spec                   as spec,
  null::text               as img_url,
  m.lead_days              as lead_days,
  m.data_status            as data_status,
  m.is_approved            as is_approved,
  m.origin_dataset         as origin_dataset
from public.materials m
union all
select
  b.tenant_id, 'brands'::text, b.brand_id, b.product, b.brand, b.category, b.unit,
  b.supply_price, b.retail_price, null::text,
  nullif(concat_ws(' / ', b.grade, b.attrs->>'thickness', b.attrs->>'feature'), ''),
  null::text, b.lead_days, b.data_status, b.is_approved, b.origin_dataset
from public.brands b
union all
select
  c.tenant_id, 'minicad_material_codes'::text, c.surface || '.' || c.code, c.name,
  null::text, c.surface, null::text,
  null::integer, null::integer, null::text, null::text, null::text, null::integer,
  'STRUCTURE_READY'::text, false, c.origin_dataset
from public.minicad_material_codes c
union all
select
  t.tenant_id, 'tile_products'::text, t.code,
  -- 원본에 제품명이 유실된 SKU(name='M', 277건)는 tag/규격으로 식별 — 값을 지어내지 않는다
  coalesce(nullif(t.tag, ''), nullif(t.name, 'M'), t.name) as name,
  t.brand, t.category, t.unit,
  t.unit_price, null::integer, null::text,
  t.spec_raw, t.img_thumb_url, null::integer,
  t.data_status, t.is_approved, t.origin_dataset
from public.tile_products t;

comment on view public.v_all_materials is '통합 자재 카탈로그 — materials(공정자재) + brands(견적 대표단가) + minicad_material_codes(마감재코드) + tile_products(벤더 실SKU) 합본. unit_price=null 이면 단가 미확보(NEEDS_RESEARCH). 단가 추정 금지 — 원본 값만 노출';
