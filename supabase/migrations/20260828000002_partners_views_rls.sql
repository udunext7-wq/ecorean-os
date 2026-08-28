-- ECOREAN — 거래처 마스터 뷰 + RLS (20260828000001 후속)
--
-- RLS 방침 (헌법 3조): 조회는 staff+ 에게 열되, INSERT/UPDATE/DELETE 정책은
--   "만들지 않는다". 쓰기 경로는 20260828000003_partners_rpc.sql 의
--   security definer 함수뿐이며, 권한 검증은 그 함수 안에서 한다.
--   → 클라이언트가 anon/authenticated 키로 직접 거래처를 고칠 수 없다.
--
-- 뷰는 security_invoker = true — 뷰를 통해 RLS 를 우회하지 못하게 한다.

-- ─────────────────────────────────────────────────────────────
-- 1) 유효단가 뷰 — 결정 2("둘 다")가 실제로 작동하는 지점
--    승인된 계약단가가 있으면 그것을, 없으면 표준 단가표 값을 쓴다.
--    price_source 로 어느 쪽이 적용됐는지 항상 드러낸다(추정 은폐 방지).
--    미승인 단가는 여기 나오지 않는다 — 헌법 9조.
-- ─────────────────────────────────────────────────────────────
create or replace view public.v_partner_price_effective
with (security_invoker = true) as
select
  pp.id,
  pp.partner_id,
  p.partner_code,
  p.name                                                        as partner_name,
  pp.trade_group,
  pp.item_name,
  pp.unit,
  pp.contract_price,
  nullif(coalesce(ci.labor_cost, 0) + coalesce(ci.material_cost, 0), 0) as std_cost_item_price,
  sc.price_typical                                              as std_subcontractor_price,
  coalesce(
    pp.contract_price,
    nullif(coalesce(ci.labor_cost, 0) + coalesce(ci.material_cost, 0), 0),
    sc.price_typical
  )                                                             as effective_price,
  case
    when pp.contract_price is not null then 'CONTRACT'
    when ci.id is not null              then 'STANDARD_COST_ITEM'
    when sc.id is not null              then 'STANDARD_SUBCONTRACTOR'
    else 'UNKNOWN'
  end                                                           as price_source,
  pp.std_price_snapshot,
  pp.effective_from,
  pp.effective_to,
  pp.cost_item_id,
  pp.subcontractor_id,
  pp.contract_id,
  pp.data_status,
  pp.notes
from public.partner_prices pp
join public.partners p            on p.id  = pp.partner_id
left join public.cost_items ci     on ci.id = pp.cost_item_id
left join public.subcontractors sc on sc.id = pp.subcontractor_id
where pp.is_approved = true
  and p.status = 'ACTIVE'
  and pp.effective_from <= current_date
  and (pp.effective_to is null or pp.effective_to >= current_date);

comment on view public.v_partner_price_effective is
  '거래처 유효단가 — 승인된 계약단가 우선, 없으면 표준 단가표. price_source 로 출처를 항상 표시. 미승인 단가는 제외(헌법 9조).';

-- ─────────────────────────────────────────────────────────────
-- 2) 거래처 종합 뷰 — "한 창"의 목록·요약이 읽는 곳
--    스케줄·거래이력은 기존 work_* 테이블에서 끌어온다(사본 저장 안 함).
-- ─────────────────────────────────────────────────────────────
create or replace view public.v_partner_overview
with (security_invoker = true) as
select
  p.id                as partner_id,
  p.tenant_id,
  p.partner_code,
  p.name,
  p.kinds,
  p.trade_groups,
  p.grade,
  p.status,
  p.phone,
  p.rep_name,
  p.biz_reg_no,
  (select count(*) from public.partner_contracts c
     where c.partner_id = p.id and c.status = 'ACTIVE')                      as active_contracts,
  (select count(*) from public.partner_prices pr
     where pr.partner_id = p.id and pr.is_approved)                          as approved_prices,
  (select count(*) from public.partner_prices pr
     where pr.partner_id = p.id and not pr.is_approved)                      as pending_prices,
  (select count(*) from public.work_purchase_orders po
     where po.partner_id = p.id)                                             as po_count,
  (select coalesce(sum(po.total_amount), 0) from public.work_purchase_orders po
     where po.partner_id = p.id)                                             as po_amount,
  (select coalesce(sum(iv.total_amount), 0) from public.work_invoices iv
     where iv.partner_id = p.id)                                             as invoice_amount,
  (select count(*) from public.work_schedule_items si
     where si.partner_id = p.id)                                             as schedule_count,
  (select min(si.start_date) from public.work_schedule_items si
     where si.partner_id = p.id and si.start_date >= current_date)           as next_start_date,
  (select min(c.safety_docs_expire_at) from public.partner_contracts c
     where c.partner_id = p.id and c.safety_docs_expire_at is not null)      as safety_docs_expire_at,
  p.created_at,
  p.updated_at
from public.partners p;

comment on view public.v_partner_overview is
  '거래처 한 줄 요약 — 계약·단가·발주·계산서·예정공정을 기존 테이블에서 집계. 사본을 저장하지 않는다.';

-- ─────────────────────────────────────────────────────────────
-- 3) RLS — 조회만 staff+ 허용. 쓰기 정책 없음(정의 함수 경유만).
-- ─────────────────────────────────────────────────────────────
alter table public.partners          enable row level security;
alter table public.partner_contracts enable row level security;
alter table public.partner_prices    enable row level security;

drop policy if exists "partners_select_staff" on public.partners;
create policy "partners_select_staff" on public.partners
  for select to authenticated using (public.current_role_level() >= 3);

drop policy if exists "partner_contracts_select_staff" on public.partner_contracts;
create policy "partner_contracts_select_staff" on public.partner_contracts
  for select to authenticated using (public.current_role_level() >= 3);

drop policy if exists "partner_prices_select_staff" on public.partner_prices;
create policy "partner_prices_select_staff" on public.partner_prices
  for select to authenticated using (public.current_role_level() >= 3);

-- 의도적으로 insert/update/delete 정책을 만들지 않는다.
-- 쓰기는 partner_upsert / partner_contract_upsert / partner_price_propose /
-- partner_price_decide (security definer) 경유만 — 헌법 3조.
