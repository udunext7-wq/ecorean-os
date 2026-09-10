-- 되돌리기 — 버킷이 비어 있을 때만 안전하다
drop policy if exists "ff_tex_read" on storage.objects;
drop policy if exists "ff_tex_insert" on storage.objects;
drop policy if exists "ff_tex_delete" on storage.objects;
delete from storage.buckets where id='freeform';
