-- ECOREAN OS — 마이그레이션 9: 통합 자재 뷰
-- 자재 데이터가 3개 테이블에 나뉘어 있다:
--   materials              — 개별 자재(발주서용). 단가 있음
--   brands                 — 브랜드별 실공급가(B2B). 카테고리별 제품
--   minicad_material_codes — MiniCAD 마감재 코드표. 단가 없음(코드·명칭만)
-- 이 뷰는 셋을 한 화면에서 조회하기 위한 통합 카탈로그다. 단가는 원본 그대로 노출하며
-- 추정하지 않는다(헌법). 단가 없는 행은 unit_price = null 로 남는다 → NEEDS_RESEARCH 대상.

create or replace view public.v_all_materials
with (security_invoker = true) as
select
  m.tenant_id,
  'materials'::text        as origin_table,
  m.mat_id                 as item_id,
  m.name                   as name,
  m.brand                  as brand,
  null::text               as product,
  m.unit                   as unit,
  m.unit_price             as unit_price,
  null::integer            as retail_price,
  m.process_code           as process_code,
  m.spec                   as spec,
  m.lead_days              as lead_days,
  m.data_status            as data_status,
  m.is_approved            as is_approved,
  m.origin_dataset         as origin_dataset
from public.materials m
union all
select
  b.tenant_id,
  'brands'::text,
  b.brand_id,
  b.product,
  b.brand,
  b.product,
  b.unit,
  b.supply_price,
  b.retail_price,
  null::text,
  nullif(concat_ws(' / ', b.grade, b.attrs->>'thickness', b.attrs->>'feature'), ''),
  b.lead_days,
  b.data_status,
  b.is_approved,
  b.origin_dataset
from public.brands b
union all
select
  c.tenant_id,
  'minicad_material_codes'::text,
  c.surface || '.' || c.code,
  c.name,
  null::text,
  null::text,
  null::text,
  null::integer,
  null::integer,
  null::text,
  c.surface,
  null::integer,
  'STRUCTURE_READY'::text,
  false,
  c.origin_dataset
from public.minicad_material_codes c;

comment on view public.v_all_materials is '통합 자재 카탈로그 — materials(개별자재) + brands(브랜드공급가) + minicad_material_codes(마감재코드) 합본. unit_price가 null이면 단가 미확보(NEEDS_RESEARCH). 단가 추정 금지 원칙에 따라 원본 값만 노출';
