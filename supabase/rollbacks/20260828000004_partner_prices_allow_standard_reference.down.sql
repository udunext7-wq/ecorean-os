-- ROLLBACK for 20260828000004_partner_prices_allow_standard_reference.sql
-- 되돌리는 내용: 승인 조건 완화(계약단가 OR 표준참조)를 원래의 엄격한 조건(계약단가 필수)으로 복원
-- 주의: 무손실이지만 **되돌리면 결정 2의 절반이 다시 죽는다** — 표준 단가표만 참조하는
--       승인 행이 제약 위반이 되므로, 그런 행이 이미 있으면 ALTER 자체가 실패한다.
--       필요하면 먼저 `update public.partner_prices set is_approved=false
--       where contract_price is null;` 로 정리한 뒤 실행한다.
-- 적용: MCP execute_sql 로 전체 실행. 되돌림 순서상 가장 먼저.

-- 1) 제약을 이전 정의로 복원 (교체형)
alter table public.partner_prices drop constraint if exists partner_prices_approved_chk;
alter table public.partner_prices add constraint partner_prices_approved_chk check (
  is_approved = false or contract_price is not null
);

comment on constraint partner_prices_approved_chk on public.partner_prices is
  '승인된 단가는 반드시 금액이 있어야 한다 (빈 승인 = 추정 유입 경로 차단).';

-- 승인 함수도 이전 정의 그대로 복원
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
  '업체별 단가 승인·반려 (admin+). 금액 없는 행은 승인 불가 — 헌법 9조 추정 금지 게이트.';

-- 2) 원격 마이그레이션 이력 제거
delete from supabase_migrations.schema_migrations where version = '20260828115033';
