-- rollback: 20260827000001_studio_presets_v2.sql
alter table public.mb_style_presets drop column if exists updated_at;
alter table public.mb_style_presets drop column if exists cover_url;
alter table public.mb_style_presets drop column if exists style_tags;
alter table public.mb_style_presets drop column if exists space;
alter table public.mb_style_presets drop column if exists colors;
