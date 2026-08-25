-- 무드보드 스토리지 정책 보정 (2026-08-25, E2E 실측으로 발견)
-- ① 삭제 정책이 구식 owner(항상 null) 참조 → owner_id 로 교체 (본인 업로드 삭제 가능)
-- ② 스토리지 API 삭제/목록 흐름은 objects SELECT 권한 요구 → 버킷 한정 조회 정책 추가
-- rollback: supabase/rollbacks/20260825000003_moodboards_storage_fix.down.sql
drop policy if exists "mb_storage_delete" on storage.objects;
create policy "mb_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'moodboards' and (owner_id = (select auth.uid())::text or public.current_role_level() >= 4));
create policy "mb_storage_select" on storage.objects
  for select to authenticated using (bucket_id = 'moodboards');
