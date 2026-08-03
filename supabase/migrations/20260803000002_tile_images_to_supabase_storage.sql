-- 타일 이미지 원천 이전: Netlify(usongtile.netlify.app) → Supabase Storage 'tiles' 버킷 (2026-08-03, 대표 지시)
-- 사전 작업(코드 외): storage.buckets에 'tiles'(public) 생성 + thumb/2,550장 + original/2,550장 업로드 완료.
-- img_thumb_url/img_full_url 은 portal_id 기반 generated 컬럼이라 베이스 URL 교체를 위해 재정의.
-- 의존 뷰 v_all_materials 드롭 후 원형 그대로 재생성. (DB 적용 완료)
begin;

drop view if exists public.v_all_materials;

alter table public.tile_products drop column img_thumb_url;
alter table public.tile_products drop column img_full_url;

alter table public.tile_products add column img_thumb_url text generated always as (
  case when portal_id is null then null::text
  else 'https://gdcfqbdgubgpzusbtftf.supabase.co/storage/v1/object/public/tiles/thumb/portal_' || portal_id || '.jpg' end
) stored;

alter table public.tile_products add column img_full_url text generated always as (
  case when portal_id is null then null::text
  else 'https://gdcfqbdgubgpzusbtftf.supabase.co/storage/v1/object/public/tiles/original/portal_' || portal_id || '.jpg' end
) stored;

create view public.v_all_materials as
 SELECT m.tenant_id, 'materials'::text AS origin_table, m.mat_id AS item_id, m.name, m.brand,
    NULL::text AS category, m.unit, m.unit_price, NULL::integer AS retail_price,
    m.process_code, m.spec, NULL::text AS img_url, m.lead_days, m.data_status, m.is_approved, m.origin_dataset
   FROM materials m
UNION ALL
 SELECT b.tenant_id, 'brands'::text AS origin_table, b.brand_id AS item_id, b.product AS name, b.brand,
    b.category, b.unit, b.supply_price AS unit_price, b.retail_price,
    NULL::text AS process_code,
    NULLIF(concat_ws(' / '::text, b.grade, b.attrs ->> 'thickness'::text, b.attrs ->> 'feature'::text), ''::text) AS spec,
    NULL::text AS img_url, b.lead_days, b.data_status, b.is_approved, b.origin_dataset
   FROM brands b
UNION ALL
 SELECT c.tenant_id, 'minicad_material_codes'::text AS origin_table, (c.surface || '.'::text) || c.code AS item_id, c.name,
    NULL::text AS brand, c.surface AS category, NULL::text AS unit, NULL::integer AS unit_price, NULL::integer AS retail_price,
    NULL::text AS process_code, NULL::text AS spec, NULL::text AS img_url, NULL::integer AS lead_days,
    'STRUCTURE_READY'::text AS data_status, false AS is_approved, c.origin_dataset
   FROM minicad_material_codes c
UNION ALL
 SELECT t.tenant_id, 'tile_products'::text AS origin_table, t.code AS item_id,
    COALESCE(NULLIF(t.tag, ''::text), NULLIF(t.name, 'M'::text), t.name) AS name,
    t.brand, t.category, t.unit, t.unit_price, NULL::integer AS retail_price,
    NULL::text AS process_code, t.spec_raw AS spec, t.img_thumb_url AS img_url, NULL::integer AS lead_days,
    t.data_status, t.is_approved, t.origin_dataset
   FROM tile_products t;

commit;
