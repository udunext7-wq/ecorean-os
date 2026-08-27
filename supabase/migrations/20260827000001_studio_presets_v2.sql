-- 스타일 프리셋 완성 (2026-08-27 대표 지시): 색상 팔레트·공간·스타일 태그·커버·수정시각
-- rollback: supabase/rollbacks/20260827000001_studio_presets_v2.down.sql
alter table public.mb_style_presets add column if not exists colors text[] not null default '{}';
alter table public.mb_style_presets add column if not exists space text;
alter table public.mb_style_presets add column if not exists style_tags text[] not null default '{}';
alter table public.mb_style_presets add column if not exists cover_url text;
alter table public.mb_style_presets add column if not exists updated_at timestamptz not null default now();
