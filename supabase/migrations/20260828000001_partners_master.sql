-- ECOREAN — 시공거래처(협력업체) 마스터 v1
-- 대표 지시 2026-08-28. 확정된 결정 3건:
--   (1) 시공·자재·장비·운반을 "한 명부"로 관리 (kinds[] 로 겸업 허용)
--   (2) 단가는 표준 단가표 참조 + 업체별 계약단가 둘 다 지원
--   (3) 직영 인력 미포함 — labor_roles 는 건드리지 않음
--
-- 배경(실측 2026-08-28): 거래처가 엔티티가 아니라 문자열로 흩어져 있었다.
--   work_purchase_orders.vendor_name / work_invoices.counterparty 는 자유 입력,
--   work_schedule_items 에는 업체 컬럼이 아예 없음, work_daily_reports.workers 는 직종만.
--   같은 업체를 세 곳에 각각 손으로 적어 집계가 불가능했다. 이 마이그레이션은
--   "축(거래처)"만 추가하고 기존 데이터는 그대로 둔다(기존 텍스트 컬럼 보존 = 무중단).
--
-- 헌법 준수:
--   3조 Master DB 무승인 금지 → 이 테이블들에 직접 쓰기 정책을 만들지 않는다.
--                               모든 쓰기는 아래 security definer 함수 경유.
--   9조 단가 추정 금지        → 계약단가는 is_approved=false 로 들어오고
--                               admin+ 승인(partner_price_decide) 전에는 유효단가 뷰에 나오지 않는다.
--   8조 rollback SQL 필수     → supabase/rollbacks/20260828000001_partners_master.down.sql
--
-- 권한 레벨은 DB 기준(public.role_level): visitor 1 / business_customer 2 /
--   staff·executive 3 / admin 4 / master 5.  조회·등록 = 3 이상, 단가 승인 = 4 이상.

-- ─────────────────────────────────────────────────────────────
-- 0) 공정군 참조 어휘 시드 (작업내용의 축)
--    원천: assets/data/db.json categories — 16 공정군 C01~C16.
--    새 분류를 만들지 않고 이미 선언된 원천을 적재한다(통찰 #3 온톨로지 동적 관리).
-- ─────────────────────────────────────────────────────────────
insert into public.process_groups (tenant_id, code, name, color, origin_dataset) values
  ('HQ', 'C01', '철거',     '#FF4444', 'db.json'),
  ('HQ', 'C02', '방수',     '#4488FF', 'db.json'),
  ('HQ', 'C03', '조적',     '#FF8844', 'db.json'),
  ('HQ', 'C04', '미장',     '#FFCC44', 'db.json'),
  ('HQ', 'C05', '타일',     '#44FFCC', 'db.json'),
  ('HQ', 'C06', '석공',     '#8844FF', 'db.json'),
  ('HQ', 'C07', '목공',     '#88CC44', 'db.json'),
  ('HQ', 'C08', '경량철골', '#C9A84C', 'db.json'),
  ('HQ', 'C09', '창호',     '#44CCFF', 'db.json'),
  ('HQ', 'C10', '도장',     '#FF44CC', 'db.json'),
  ('HQ', 'C11', '도배',     '#CCFF44', 'db.json'),
  ('HQ', 'C12', '바닥재',   '#FF8888', 'db.json'),
  ('HQ', 'C13', '단열',     '#88CCFF', 'db.json'),
  ('HQ', 'C14', '전기',     '#FFDD88', 'db.json'),
  ('HQ', 'C15', '설비',     '#88FFDD', 'db.json'),
  ('HQ', 'C16', '기타',     '#AAAAAA', 'db.json')
on conflict (tenant_id, code) do update
  set name = excluded.name, color = excluded.color, updated_at = now();

-- ─────────────────────────────────────────────────────────────
-- 1) partners — 거래처 마스터 (신원)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.partners (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     text not null default 'HQ',
  partner_code  text not null,                    -- PTN-0001 (자동 발급)
  name          text not null,                    -- 상호
  kinds         text[] not null default '{}',     -- 결정 1: 겸업 허용 (시공+자재 등)
  trade_groups  text[] not null default '{}',     -- 작업내용 = process_groups.code (C01~C16)
  biz_reg_no    text,                             -- 사업자등록번호
  rep_name      text,                             -- 대표자
  phone         text,
  email         text,
  zipcode       text,
  address       text,
  bank_name     text,
  bank_account  text,
  bank_holder   text,
  grade         text,                             -- 내부 등급
  status        text not null default 'ACTIVE',
  memo          text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint partners_code_uk    unique (tenant_id, partner_code),
  constraint partners_status_chk check (status in ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
  constraint partners_grade_chk  check (grade is null or grade in ('A', 'B', 'C', 'D')),
  -- 결정 1의 4종. 한 업체가 여러 개를 가질 수 있다(겸업).
  constraint partners_kinds_chk  check (kinds <@ array['시공', '자재', '장비', '운반']::text[])
);

comment on table public.partners is
  '시공거래처(협력업체) 마스터. 시공·자재·장비·운반 한 명부(kinds[] 겸업 허용, 대표 결정 2026-08-28). 직영 인력 미포함 — 직종 노임은 labor_roles.';
comment on column public.partners.trade_groups is
  '작업내용 = process_groups.code 배열(C01~C16). 22 시공섹션은 공간 축이라 거래처에 쓰지 않는다.';

-- 사업자번호는 있으면 유일. 무등록 인력팀도 등록 가능해야 하므로 partial unique.
create unique index if not exists partners_biz_reg_no_uk
  on public.partners (tenant_id, biz_reg_no) where biz_reg_no is not null;
create index if not exists partners_status_idx       on public.partners (tenant_id, status);
create index if not exists partners_trade_groups_idx on public.partners using gin (trade_groups);
create index if not exists partners_kinds_idx        on public.partners using gin (kinds);
create index if not exists partners_name_idx         on public.partners (name);

create sequence if not exists public.partners_code_seq start 1;

drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2) partner_contracts — 계약사항 (기간·조건)
--    발주서와 분리한 이유: 발주는 건별 1회성, 계약은 기간 조건이다.
--    발주서에 넣으면 매 발주마다 같은 조건을 반복 입력해야 한다.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.partner_contracts (
  id                    uuid primary key default gen_random_uuid(),
  partner_id            uuid not null references public.partners(id) on delete cascade,
  contract_no           text,
  title                 text not null,
  start_date            date,
  end_date              date,
  payment_terms         text,          -- 지급조건 서술 (예: 기성 70% / 준공 30%)
  payment_closing_day   smallint,      -- 마감일
  payment_day           smallint,      -- 결제일
  payment_cycle         text,          -- MONTHLY / PER_ORDER / MILESTONE
  retention_rate        numeric(5,2),  -- 유보율 %
  warranty_months       smallint,      -- 하자보증 개월
  safety_docs_expire_at date,          -- 안전서류 만료 (현장 출입 차단 사유)
  insurance_4major      boolean not null default false,  -- 4대보험 가입
  insurance_expire_at   date,
  status                text not null default 'DRAFT',
  file_url              text,
  memo                  text,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint partner_contracts_status_chk check (status in ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  constraint partner_contracts_cycle_chk  check (payment_cycle is null or payment_cycle in ('MONTHLY', 'PER_ORDER', 'MILESTONE')),
  constraint partner_contracts_period_chk check (end_date is null or start_date is null or end_date >= start_date),
  constraint partner_contracts_day_chk    check (
    (payment_day is null or payment_day between 1 and 31) and
    (payment_closing_day is null or payment_closing_day between 1 and 31)),
  constraint partner_contracts_retention_chk check (
    retention_rate is null or (retention_rate >= 0 and retention_rate <= 100))
);

comment on table public.partner_contracts is
  '거래처 계약사항 — 기간·지급조건·하자보증·안전서류. 발주(work_purchase_orders)와 분리: 발주=건별 1회성, 계약=기간 조건.';

create index if not exists partner_contracts_partner_idx on public.partner_contracts (partner_id, status);
create index if not exists partner_contracts_expiry_idx  on public.partner_contracts (safety_docs_expire_at)
  where safety_docs_expire_at is not null;

drop trigger if exists partner_contracts_set_updated_at on public.partner_contracts;
create trigger partner_contracts_set_updated_at before update on public.partner_contracts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3) partner_prices — 업체별 단가 (결정 2: 표준 참조 + 계약단가 둘 다)
--    cost_item_id / subcontractor_id 를 채우면 = 표준 단가표 참조.
--    contract_price 를 채우면      = 그 업체 계약단가(표준보다 우선).
--    둘 다 채우면 "표준 대비 얼마"를 감사할 수 있다(std_price_snapshot).
--    승인 전(is_approved=false)에는 v_partner_price_effective 에 나오지 않는다 — 헌법 9조.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.partner_prices (
  id                 uuid primary key default gen_random_uuid(),
  partner_id         uuid not null references public.partners(id) on delete cascade,
  contract_id        uuid references public.partner_contracts(id) on delete set null,
  cost_item_id       uuid references public.cost_items(id) on delete set null,
  subcontractor_id   uuid references public.subcontractors(id) on delete set null,
  trade_group        text,                     -- process_groups.code
  item_name          text not null,
  unit               text,
  contract_price     bigint,                   -- 업체별 계약단가 (원)
  std_price_snapshot bigint,                   -- 등록 시점 표준단가 (비교·감사용)
  effective_from     date not null default current_date,
  effective_to       date,
  data_status        text not null default 'MARKET_RESEARCH',
  is_approved        boolean not null default false,
  approved_at        timestamptz,
  approved_by        text,
  notes              text,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint partner_prices_price_chk    check (contract_price is null or contract_price >= 0),
  constraint partner_prices_std_chk      check (std_price_snapshot is null or std_price_snapshot >= 0),
  constraint partner_prices_period_chk   check (effective_to is null or effective_to >= effective_from),
  -- 승인된 단가는 반드시 금액이 있어야 한다 (빈 승인 = 추정 유입 경로 차단)
  constraint partner_prices_approved_chk check (is_approved = false or contract_price is not null)
);

comment on table public.partner_prices is
  '업체별 단가. 표준 단가표 참조(cost_item_id/subcontractor_id)와 계약단가(contract_price)를 함께 보관 — 대표 결정 2026-08-28. 승인 전에는 유효단가 뷰에 노출되지 않는다(헌법 9조).';

create index if not exists partner_prices_partner_idx  on public.partner_prices (partner_id, is_approved);
create index if not exists partner_prices_costitem_idx on public.partner_prices (cost_item_id) where cost_item_id is not null;
create index if not exists partner_prices_trade_idx    on public.partner_prices (trade_group);

drop trigger if exists partner_prices_set_updated_at on public.partner_prices;
create trigger partner_prices_set_updated_at before update on public.partner_prices
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4) 기존 운영 테이블에 거래처 축 연결 (기존 텍스트 컬럼은 보존 — 무중단)
--    work_daily_reports.workers 는 하루에 여러 팀이 들어오므로 jsonb 를 유지하고
--    각 원소에 선택적 partner_id 키를 넣는다(스키마 변경 불필요).
-- ─────────────────────────────────────────────────────────────
alter table public.work_purchase_orders
  add column if not exists partner_id uuid references public.partners(id) on delete set null;
alter table public.work_invoices
  add column if not exists partner_id uuid references public.partners(id) on delete set null;
alter table public.work_schedule_items
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

create index if not exists work_purchase_orders_partner_idx on public.work_purchase_orders (partner_id);
create index if not exists work_invoices_partner_idx        on public.work_invoices (partner_id);
create index if not exists work_schedule_items_partner_idx  on public.work_schedule_items (partner_id);

comment on column public.work_schedule_items.partner_id is
  '이 공정을 수행하는 거래처. 이전에는 업체 컬럼이 없어 "누가 언제 들어오는지"가 시스템에 없었다.';
