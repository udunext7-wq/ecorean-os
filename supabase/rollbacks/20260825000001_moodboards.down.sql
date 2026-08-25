-- rollback: 20260825000001_moodboards.sql
drop policy if exists "mb_storage_insert" on storage.objects;
drop policy if exists "mb_storage_delete" on storage.objects;
delete from storage.buckets where id = 'moodboards';
drop table if exists public.moodboard_images;
drop table if exists public.moodboards;
