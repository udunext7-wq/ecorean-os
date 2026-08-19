-- 20260819000001 — 서버 문서(app_documents)·스펙북 공유 정책을 role_level 기반으로 통일
--
-- 문제: app_documents / spec_books / spec_book_items 의 staff_all 정책이
--       role IN ('staff','admin','master') 하드코딩이라 2026-08-07 추가된
--       executive(레벨 4) 계정이 서버 문서를 보지도 저장하지도 못함.
-- 조치: 다른 테이블과 동일하게 current_role_level() >= 3 으로 교체
--       → staff(3)·executive(4)·admin(5)·master(6) 전원 공유.
-- 원격 적용: 2026-08-19 (supabase_migrations 버전 20260819130000)

drop policy if exists staff_all on public.app_documents;
create policy staff_all on public.app_documents
  for all to authenticated
  using (public.current_role_level() >= 3)
  with check (public.current_role_level() >= 3);

drop policy if exists staff_all on public.spec_books;
create policy staff_all on public.spec_books
  for all to authenticated
  using (public.current_role_level() >= 3)
  with check (public.current_role_level() >= 3);

drop policy if exists staff_all on public.spec_book_items;
create policy staff_all on public.spec_book_items
  for all to authenticated
  using (public.current_role_level() >= 3)
  with check (public.current_role_level() >= 3);
