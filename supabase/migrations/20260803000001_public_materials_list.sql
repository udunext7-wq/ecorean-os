-- 홈페이지 자재 라이브러리 공개 조회 함수 (2026-08-03, 대표 지시)
-- 보안: 단가(unit_price/retail_price) 미노출 — 자재명·브랜드·카테고리·규격·이미지만.
--       내부 도면 코드(minicad_material_codes)는 공개 대상에서 제외.
-- anon 호출 허용 (홈페이지 공개 섹션). 페이지당 최대 60건.

create or replace function public.public_materials_list(
  p_q text default null,
  p_origin text default null,
  p_limit int default 24,
  p_offset int default 0
) returns table (origin_table text, name text, brand text, category text, spec text, img_url text, total bigint)
language sql stable security definer set search_path = public as $$
  with base as (
    select v.origin_table, v.name, v.brand, v.category, v.spec, v.img_url
    from v_all_materials v
    where v.name is not null and v.name <> ''
      and v.origin_table <> 'minicad_material_codes'
      and (p_origin is null or v.origin_table = p_origin)
      and (p_q is null or p_q = '' or v.name ilike '%'||p_q||'%' or v.brand ilike '%'||p_q||'%' or v.category ilike '%'||p_q||'%')
  )
  select b.origin_table, b.name, b.brand, b.category, b.spec, b.img_url,
         count(*) over() as total
  from base b
  order by (b.img_url is null), b.origin_table, b.name
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
