-- 자재 설정(관리) 화면용 일괄 업서트 함수 (2026-07-30, 대표 지시)
-- D-051 승인 원칙 준수: admin+ (role_level >= 4) 만 실행 가능, 실행 = 승인으로 기록.
-- mat_id 미지정 시 MAT-USR-#### 자동 발급.

create sequence if not exists materials_usr_seq start 1;

create or replace function public.materials_upsert_batch(
  p_rows jsonb,
  p_source_detail text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
  v_email text;
  r jsonb;
  v_mat_id text;
begin
  if public.current_role_level() < 4 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_INPUT';
  end if;
  if jsonb_array_length(p_rows) > 500 then
    raise exception 'TOO_MANY_ROWS';
  end if;
  select email into v_email from profiles where id = auth.uid();

  for r in select * from jsonb_array_elements(p_rows) loop
    if coalesce(trim(r->>'name'), '') = '' then continue; end if;
    v_mat_id := coalesce(nullif(trim(r->>'mat_id'), ''),
                         'MAT-USR-' || lpad(nextval('materials_usr_seq')::text, 4, '0'));
    insert into materials (
      tenant_id, mat_id, name, unit, unit_price, brand, spec, process_code, notes,
      source, source_detail, source_date, data_status,
      is_approved, approved_at, approved_by
    ) values (
      'HQ',
      v_mat_id,
      trim(r->>'name'),
      nullif(trim(coalesce(r->>'unit', '')), ''),
      coalesce(nullif(trim(coalesce(r->>'unit_price', '')), ''), '0')::int,
      nullif(trim(coalesce(r->>'brand', '')), ''),
      nullif(trim(coalesce(r->>'spec', '')), ''),
      nullif(trim(coalesce(r->>'process_code', '')), ''),
      nullif(trim(coalesce(r->>'notes', '')), ''),
      'principal_input',
      p_source_detail,
      current_date,
      coalesce(nullif(trim(coalesce(r->>'data_status', '')), ''), 'MARKET_RESEARCH'),
      true, now(), v_email
    )
    on conflict (tenant_id, mat_id) do update set
      name = excluded.name,
      unit = excluded.unit,
      unit_price = excluded.unit_price,
      brand = excluded.brand,
      spec = excluded.spec,
      process_code = excluded.process_code,
      notes = excluded.notes,
      source_detail = excluded.source_detail,
      source_date = excluded.source_date,
      data_status = excluded.data_status,
      is_approved = true, approved_at = now(), approved_by = v_email,
      updated_at = now();
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
