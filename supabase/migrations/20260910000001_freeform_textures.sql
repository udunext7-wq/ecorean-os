-- 프리폼 이미지 재질(텍스처) 저장소 (2026-09-10, 대표 지시 "계속 개선해줘")
--  종전: 가로 512px 로 줄인 data URL 을 프리폼 문서 안에 넣었다.
--        → 브라우저 저장소 5MB 한도를 재질이 같이 먹고, 벽 한 면을 크게 덮으면 흐렸다.
--  변경: 원본 해상도(최대 2048px)로 이 버킷에 올리고 문서에는 공개 URL 만 남긴다.
--  정책은 moodboards 버킷과 같은 모양 — 읽기는 공개, 올리기는 직원(level>=3), 지우기는 올린 사람 또는 관리자(>=4).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('freeform','freeform',true,20971520,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

drop policy if exists "ff_tex_read" on storage.objects;
create policy "ff_tex_read" on storage.objects
  for select using (bucket_id = 'freeform');

drop policy if exists "ff_tex_insert" on storage.objects;
create policy "ff_tex_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'freeform' and public.current_role_level() >= 3);

drop policy if exists "ff_tex_delete" on storage.objects;
create policy "ff_tex_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'freeform'
         and (owner_id = ((select auth.uid()))::text or public.current_role_level() >= 4));
