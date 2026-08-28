-- ECOREAN — 거래처 쓰기 함수 (20260828000002 후속)
--
-- 헌법 3조: 마스터 DB 직접 쓰기 금지 → RLS 에 쓰기 정책을 두지 않고
--   여기 security definer 함수만 쓰기 경로로 남긴다. 권한 검증은 함수 안에서 한다.
--   클라이언트를 신뢰하지 않는다(materials_upsert_batch 와 동일 방식).
--
-- 권한(DB role_level 기준): 등록·수정 = 3(staff) 이상 / 단가 승인 = 4(admin) 이상.
--   거래처 등록을 admin 전용으로 두면 현장 실무가 막히고, 단가는 돈이 걸리므로 승인 분리.

-- ─────────────────────────────────────────────────────────────
-- 1) partner_upsert — 거래처 등록·수정 (staff+)
--    id 가 없으면 신규(코드 자동 발급 PTN-0001), 있으면 수정.
-- ─────────────────────────────────────────────────────────────
create or replace function public.partner_upsert(p jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id           uuid;
  v_name         text;
  v_kinds        text[];
  v_trade_groups text[];
  v_bad          text;
  v_code         text;
begin
  if public.current_role_level() < 3 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'INVALID_INPUT';
  end if;

  v_name := nullif(trim(coalesce(p->>'name', '')), '');
  if v_name is null then
    raise exception 'NAME_REQUIRED';
  end if;

  v_kinds := coalesce(
    (select array_agg(distinct trim(x)) from jsonb_array_elements_text(
       case when jsonb_typeof(p->'kinds') = 'array' then p->'kinds' else '[]'::jsonb end) as t(x)
     where trim(x) <> ''),
    '{}');
  v_trade_groups := coalesce(
    (select array_agg(distinct upper(trim(x))) from jsonb_array_elements_text(
       case when jsonb_typeof(p->'trade_groups') = 'array' then p->'trade_groups' else '[]'::jsonb end) as t(x)
     where trim(x) <> ''),
    '{}');

  -- 작업내용은 process_groups 에 실재하는 코드만 (정적 하드코딩 대신 DB 참조 — 통찰 #3)
  select string_agg(g, ',') into v_bad
  from unnest(v_trade_groups) as g
  where not exists (select 1 from public.process_groups pg where pg.code = g);
  if v_bad is not null then
    raise exception 'UNKNOWN_TRADE_GROUP: %', v_bad;
  end if;

  v_id := nullif(p->>'id', '')::uuid;

  if v_id is null then
    v_code := coalesce(
      nullif(trim(coalesce(p->>'partner_code', '')), ''),
      'PTN-' || lpad(nextval('public.partners_code_seq')::text, 4, '0'));

    insert into public.partners (
      tenant_id, partner_code, name, kinds, trade_groups, biz_reg_no, rep_name,
      phone, email, zipcode, address, bank_name, bank_account, bank_holder,
      grade, status, memo, created_by
    ) values (
      coalesce(nullif(trim(coalesce(p->>'tenant_id', '')), ''), 'HQ'),
      v_code, v_name, v_kinds, v_trade_groups,
      nullif(regexp_replace(coalesce(p->>'biz_reg_no', ''), '[^0-9]', '', 'g'), ''),
      nullif(trim(coalesce(p->>'rep_name', '')), ''),
      nullif(trim(coalesce(p->>'phone', '')), ''),
      nullif(trim(coalesce(p->>'email', '')), ''),
      nullif(trim(coalesce(p->>'zipcode', '')), ''),
      nullif(trim(coalesce(p->>'address', '')), ''),
      nullif(trim(coalesce(p->>'bank_name', '')), ''),
      nullif(trim(coalesce(p->>'bank_account', '')), ''),
      nullif(trim(coalesce(p->>'bank_holder', '')), ''),
      nullif(trim(coalesce(p->>'grade', '')), ''),
      coalesce(nullif(trim(coalesce(p->>'status', '')), ''), 'ACTIVE'),
      nullif(trim(coalesce(p->>'memo', '')), ''),
      auth.uid()
    )
    returning id into v_id;
  else
    update public.partners set
      name         = v_name,
      kinds        = v_kinds,
      trade_groups = v_trade_groups,
      biz_reg_no   = nullif(regexp_replace(coalesce(p->>'biz_reg_no', ''), '[^0-9]', '', 'g'), ''),
      rep_name     = nullif(trim(coalesce(p->>'rep_name', '')), ''),
      phone        = nullif(trim(coalesce(p->>'phone', '')), ''),
      email        = nullif(trim(coalesce(p->>'email', '')), ''),
      zipcode      = nullif(trim(coalesce(p->>'zipcode', '')), ''),
      address      = nullif(trim(coalesce(p->>'address', '')), ''),
      bank_name    = nullif(trim(coalesce(p->>'bank_name', '')), ''),
      bank_account = nullif(trim(coalesce(p->>'bank_account', '')), ''),
      bank_holder  = nullif(trim(coalesce(p->>'bank_holder', '')), ''),
      grade        = nullif(trim(coalesce(p->>'grade', '')), ''),
      status       = coalesce(nullif(trim(coalesce(p->>'status', '')), ''), status),
      memo         = nullif(trim(coalesce(p->>'memo', '')), '')
    where id = v_id;
    if not found then
      raise exception 'PARTNER_NOT_FOUND';
    end if;
  end if;

  return v_id;
end $$;

comment on function public.partner_upsert(jsonb) is
  '거래처 등록·수정 (staff+). 신규는 PTN-#### 자동 발급. trade_groups 는 process_groups 에 실재하는 코드만 허용.';

-- ─────────────────────────────────────────────────────────────
-- 2) partner_contract_upsert — 계약사항 등록·수정 (staff+)
-- ─────────────────────────────────────────────────────────────
create or replace function public.partner_contract_upsert(p jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_partner_id uuid;
  v_title      text;
begin
  if public.current_role_level() < 3 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'INVALID_INPUT';
  end if;

  v_partner_id := nullif(p->>'partner_id', '')::uuid;
  if v_partner_id is null then
    raise exception 'PARTNER_REQUIRED';
  end if;
  if not exists (select 1 from public.partners where id = v_partner_id) then
    raise exception 'PARTNER_NOT_FOUND';
  end if;

  v_title := nullif(trim(coalesce(p->>'title', '')), '');
  if v_title is null then
    raise exception 'TITLE_REQUIRED';
  end if;

  v_id := nullif(p->>'id', '')::uuid;

  if v_id is null then
    insert into public.partner_contracts (
      partner_id, contract_no, title, start_date, end_date,
      payment_terms, payment_closing_day, payment_day, payment_cycle,
      retention_rate, warranty_months, safety_docs_expire_at,
      insurance_4major, insurance_expire_at, status, file_url, memo, created_by
    ) values (
      v_partner_id,
      nullif(trim(coalesce(p->>'contract_no', '')), ''),
      v_title,
      nullif(p->>'start_date', '')::date,
      nullif(p->>'end_date', '')::date,
      nullif(trim(coalesce(p->>'payment_terms', '')), ''),
      nullif(p->>'payment_closing_day', '')::smallint,
      nullif(p->>'payment_day', '')::smallint,
      nullif(trim(coalesce(p->>'payment_cycle', '')), ''),
      nullif(p->>'retention_rate', '')::numeric,
      nullif(p->>'warranty_months', '')::smallint,
      nullif(p->>'safety_docs_expire_at', '')::date,
      coalesce((p->>'insurance_4major')::boolean, false),
      nullif(p->>'insurance_expire_at', '')::date,
      coalesce(nullif(trim(coalesce(p->>'status', '')), ''), 'DRAFT'),
      nullif(trim(coalesce(p->>'file_url', '')), ''),
      nullif(trim(coalesce(p->>'memo', '')), ''),
      auth.uid()
    )
    returning id into v_id;
  else
    update public.partner_contracts set
      contract_no           = nullif(trim(coalesce(p->>'contract_no', '')), ''),
      title                 = v_title,
      start_date            = nullif(p->>'start_date', '')::date,
      end_date              = nullif(p->>'end_date', '')::date,
      payment_terms         = nullif(trim(coalesce(p->>'payment_terms', '')), ''),
      payment_closing_day   = nullif(p->>'payment_closing_day', '')::smallint,
      payment_day           = nullif(p->>'payment_day', '')::smallint,
      payment_cycle         = nullif(trim(coalesce(p->>'payment_cycle', '')), ''),
      retention_rate        = nullif(p->>'retention_rate', '')::numeric,
      warranty_months       = nullif(p->>'warranty_months', '')::smallint,
      safety_docs_expire_at = nullif(p->>'safety_docs_expire_at', '')::date,
      insurance_4major      = coalesce((p->>'insurance_4major')::boolean, insurance_4major),
      insurance_expire_at   = nullif(p->>'insurance_expire_at', '')::date,
      status                = coalesce(nullif(trim(coalesce(p->>'status', '')), ''), status),
      file_url              = nullif(trim(coalesce(p->>'file_url', '')), ''),
      memo                  = nullif(trim(coalesce(p->>'memo', '')), '')
    where id = v_id and partner_id = v_partner_id;
    if not found then
      raise exception 'CONTRACT_NOT_FOUND';
    end if;
  end if;

  return v_id;
end $$;

comment on function public.partner_contract_upsert(jsonb) is
  '거래처 계약사항 등록·수정 (staff+). 발주와 분리된 기간 조건.';

-- ─────────────────────────────────────────────────────────────
-- 3) partner_price_propose — 업체별 단가 제안 (staff+, 항상 미승인으로 들어옴)
--    표준 단가표를 참조하면 그 시점 표준값을 std_price_snapshot 에 박아둔다.
--    헌법 9조: 여기서 승인은 절대 일어나지 않는다.
-- ─────────────────────────────────────────────────────────────
create or replace function public.partner_price_propose(p jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid;
  v_partner uuid;
  v_costid  uuid;
  v_subid   uuid;
  v_item    text;
  v_std     bigint;
  v_trade   text;
begin
  if public.current_role_level() < 3 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'INVALID_INPUT';
  end if;

  v_partner := nullif(p->>'partner_id', '')::uuid;
  if v_partner is null or not exists (select 1 from public.partners where id = v_partner) then
    raise exception 'PARTNER_NOT_FOUND';
  end if;

  v_costid := nullif(p->>'cost_item_id', '')::uuid;
  v_subid  := nullif(p->>'subcontractor_id', '')::uuid;
  v_trade  := nullif(upper(trim(coalesce(p->>'trade_group', ''))), '');
  if v_trade is not null and not exists (select 1 from public.process_groups where code = v_trade) then
    raise exception 'UNKNOWN_TRADE_GROUP: %', v_trade;
  end if;

  -- 항목명: 표준 참조가 있으면 거기서 끌어오고, 없으면 입력값 필수
  v_item := nullif(trim(coalesce(p->>'item_name', '')), '');
  if v_item is null and v_costid is not null then
    select ci.name into v_item from public.cost_items ci where ci.id = v_costid;
  end if;
  if v_item is null and v_subid is not null then
    select sc.name into v_item from public.subcontractors sc where sc.id = v_subid;
  end if;
  if v_item is null then
    raise exception 'ITEM_NAME_REQUIRED';
  end if;

  -- 표준단가 스냅샷 (비교·감사용)
  if v_costid is not null then
    select nullif(coalesce(ci.labor_cost, 0) + coalesce(ci.material_cost, 0), 0)
      into v_std from public.cost_items ci where ci.id = v_costid;
  elsif v_subid is not null then
    select sc.price_typical into v_std from public.subcontractors sc where sc.id = v_subid;
  end if;

  v_id := nullif(p->>'id', '')::uuid;

  if v_id is null then
    insert into public.partner_prices (
      partner_id, contract_id, cost_item_id, subcontractor_id, trade_group,
      item_name, unit, contract_price, std_price_snapshot,
      effective_from, effective_to, data_status, notes, created_by
    ) values (
      v_partner,
      nullif(p->>'contract_id', '')::uuid,
      v_costid, v_subid, v_trade,
      v_item,
      nullif(trim(coalesce(p->>'unit', '')), ''),
      nullif(regexp_replace(coalesce(p->>'contract_price', ''), '[^0-9]', '', 'g'), '')::bigint,
      v_std,
      coalesce(nullif(p->>'effective_from', '')::date, current_date),
      nullif(p->>'effective_to', '')::date,
      coalesce(nullif(trim(coalesce(p->>'data_status', '')), ''), 'MARKET_RESEARCH'),
      nullif(trim(coalesce(p->>'notes', '')), ''),
      auth.uid()
    )
    returning id into v_id;
  else
    -- 수정하면 승인은 초기화된다 (승인 후 몰래 금액을 바꾸는 경로 차단)
    update public.partner_prices set
      contract_id        = nullif(p->>'contract_id', '')::uuid,
      cost_item_id       = v_costid,
      subcontractor_id   = v_subid,
      trade_group        = v_trade,
      item_name          = v_item,
      unit               = nullif(trim(coalesce(p->>'unit', '')), ''),
      contract_price     = nullif(regexp_replace(coalesce(p->>'contract_price', ''), '[^0-9]', '', 'g'), '')::bigint,
      std_price_snapshot = v_std,
      effective_from     = coalesce(nullif(p->>'effective_from', '')::date, effective_from),
      effective_to       = nullif(p->>'effective_to', '')::date,
      data_status        = coalesce(nullif(trim(coalesce(p->>'data_status', '')), ''), data_status),
      notes              = nullif(trim(coalesce(p->>'notes', '')), ''),
      is_approved        = false,
      approved_at        = null,
      approved_by        = null
    where id = v_id and partner_id = v_partner;
    if not found then
      raise exception 'PRICE_NOT_FOUND';
    end if;
  end if;

  return v_id;
end $$;

comment on function public.partner_price_propose(jsonb) is
  '업체별 단가 제안 (staff+). 항상 is_approved=false 로 들어오며, 수정 시 승인이 초기화된다. 승인은 partner_price_decide(admin+).';

-- ─────────────────────────────────────────────────────────────
-- 4) partner_price_decide — 단가 승인·반려 (admin+)
--    승인해야만 v_partner_price_effective 에 나타난다 — 헌법 9조 게이트.
-- ─────────────────────────────────────────────────────────────
create or replace function public.partner_price_decide(p_id uuid, approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_price bigint;
begin
  if public.current_role_level() < 4 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  select contract_price into v_price from public.partner_prices where id = p_id;
  if not found then
    raise exception 'PRICE_NOT_FOUND';
  end if;
  -- 금액 없는 행을 승인하면 "빈 단가"가 견적에 유입된다 (헌법 9조: 추정 금지)
  if approve and v_price is null then
    raise exception 'PRICE_REQUIRED_FOR_APPROVAL';
  end if;

  select email into v_email from public.profiles where id = auth.uid();

  update public.partner_prices set
    is_approved = approve,
    approved_at = case when approve then now() else null end,
    approved_by = case when approve then v_email else null end
  where id = p_id;
end $$;

comment on function public.partner_price_decide(uuid, boolean) is
  '업체별 단가 승인·반려 (admin+). 금액이 없는 행은 승인 불가 — 헌법 9조 추정 금지 게이트.';
