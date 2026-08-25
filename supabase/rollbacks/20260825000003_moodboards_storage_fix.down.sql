-- rollback: 20260825000003_moodboards_storage_fix.sql
drop policy if exists "mb_storage_select" on storage.objects;
drop policy if exists "mb_storage_delete" on storage.objects;
create policy "mb_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'moodboards' and (owner = auth.uid() or public.current_role_level() >= 4));
