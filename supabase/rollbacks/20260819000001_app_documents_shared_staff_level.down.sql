-- ROLLBACK for 20260819000001_app_documents_shared_staff_level.sql
-- 되돌리는 내용: app_documents / spec_books / spec_book_items 의 staff_all 정책을
--   role_level 기반(current_role_level() >= 3) → 이전 하드코딩(role IN staff/admin/master) 으로 복원
-- 주의: 복원 시 executive 계정은 다시 서버 문서·스펙북 접근 불가가 된다 (의도된 이전 상태).
-- 적용: MCP execute_sql 로 전체 실행 (DDL 이므로 트랜잭션 안에서 실행 가능)

drop policy if exists staff_all on public.app_documents;
create policy staff_all on public.app_documents
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin','master')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin','master')));

drop policy if exists staff_all on public.spec_books;
create policy staff_all on public.spec_books
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin','master')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin','master')));

drop policy if exists staff_all on public.spec_book_items;
create policy staff_all on public.spec_book_items
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin','master')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff','admin','master')));

-- 이력 정리: 원격 supabase_migrations 에서 해당 버전 제거
delete from supabase_migrations.schema_migrations where version = '20260819130000';
