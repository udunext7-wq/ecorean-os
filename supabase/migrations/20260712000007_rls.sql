-- ECOREAN OS — 마이그레이션 7/7: RLS 골격
-- D-011(Auth + RLS 5역할)의 골격만 적용:
--   - 전 테이블 RLS 활성화
--   - authenticated: SELECT만 허용
--   - anon: 정책 없음 = 읽기·쓰기 모두 차단
--   - 쓰기 정책 없음 → service_role(RLS 우회)만 쓰기 가능 (ETL 경로)
-- 5역할 세분화 시(후속 작업) 각 정책의 using(true)를
--   using (tenant_id = auth.jwt()->>'tenant_id' and <role 조건>) 형태로 교체할 것.

alter table public.import_batches      enable row level security;
alter table public.cost_items          enable row level security;
alter table public.materials           enable row level security;
alter table public.brands              enable row level security;
alter table public.labor_roles         enable row level security;
alter table public.subcontractors      enable row level security;
alter table public.defect_types        enable row level security;
alter table public.schedule_templates  enable row level security;
alter table public.process_categories  enable row level security;
alter table public.process_groups      enable row level security;
alter table public.legacy_processes    enable row level security;
alter table public.ontology_rules      enable row level security;
alter table public.db_catalog          enable row level security;
alter table public.minicad_price_keys  enable row level security;
alter table public.minicad_config      enable row level security;

create policy "authenticated_read" on public.import_batches      for select to authenticated using (true);
create policy "authenticated_read" on public.cost_items          for select to authenticated using (true);
create policy "authenticated_read" on public.materials           for select to authenticated using (true);
create policy "authenticated_read" on public.brands              for select to authenticated using (true);
create policy "authenticated_read" on public.labor_roles         for select to authenticated using (true);
create policy "authenticated_read" on public.subcontractors      for select to authenticated using (true);
create policy "authenticated_read" on public.defect_types        for select to authenticated using (true);
create policy "authenticated_read" on public.schedule_templates  for select to authenticated using (true);
create policy "authenticated_read" on public.process_categories  for select to authenticated using (true);
create policy "authenticated_read" on public.process_groups      for select to authenticated using (true);
create policy "authenticated_read" on public.legacy_processes    for select to authenticated using (true);
create policy "authenticated_read" on public.ontology_rules      for select to authenticated using (true);
create policy "authenticated_read" on public.db_catalog          for select to authenticated using (true);
create policy "authenticated_read" on public.minicad_price_keys  for select to authenticated using (true);
create policy "authenticated_read" on public.minicad_config      for select to authenticated using (true);
