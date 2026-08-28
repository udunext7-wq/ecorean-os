-- 수정: "표준 단가표를 그대로 쓴다"는 행이 승인 가능해야 한다 (대표 결정 2 = 둘 다)
--
-- 발견 경위(2026-08-28 검증): 20260828000001 의 승인 제약이 contract_price 를 반드시
--   요구했다. 그 결과 계약단가 없이 표준 단가표만 참조하는 행(= 이 업체는 표준가로 간다)은
--   승인이 불가능했고, 유효단가 뷰(v_partner_price_effective)에 영원히 나타나지 못했다.
--   결정 2("표준 참조 + 계약단가 둘 다")의 절반이 죽어 있었다.
--
-- 헌법 9조의 취지는 "근거 없는 값을 승인하지 말라"이지 "계약단가를 반드시 넣어라"가 아니다.
--   → 승인 조건을 "계약단가가 있거나, 표준 단가표를 참조하고 있을 것"으로 바꾼다.
--     둘 다 없는 행(금액도 근거도 없음)은 여전히 승인할 수 없다.

alter table public.partner_prices drop constraint if exists partner_prices_approved_chk;
alter table public.partner_prices add constraint partner_prices_approved_chk check (
  is_approved = false
  or contract_price is not null
  or cost_item_id is not null
  or subcontractor_id is not null
);

comment on constraint partner_prices_approved_chk on public.partner_prices is
  '승인하려면 계약단가가 있거나 표준 단가표를 참조해야 한다. 금액도 근거도 없는 행은 승인 불가 (헌법 9조).';

-- 승인 함수도 같은 규칙으로 (근거 없는 승인만 막는다)
create or replace function public.partner_price_decide(p_id uuid, approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_row   public.partner_prices%rowtype;
begin
  if public.current_role_level() < 4 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_row from public.partner_prices where id = p_id;
  if not found then
    raise exception 'PRICE_NOT_FOUND';
  end if;

  -- 금액도 없고 표준 참조도 없으면 근거가 없는 승인이다 (헌법 9조: 추정 금지)
  if approve
     and v_row.contract_price is null
     and v_row.cost_item_id is null
     and v_row.subcontractor_id is null then
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
  '업체별 단가 승인·반려 (admin+). 계약단가도 표준 참조도 없는 행은 승인 불가 — 헌법 9조.';
