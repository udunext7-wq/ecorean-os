-- rollback: 20260826000001_studio_links.sql
drop table if exists public.mb_compare_pairs;
drop table if exists public.mb_style_presets;
drop policy if exists "mbi_update" on public.moodboard_images;
alter table public.moodboard_images drop column if exists materials;
