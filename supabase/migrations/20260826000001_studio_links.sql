-- AI 스튜디오 연계 1차 (2026-08-26 대표 지시): 이미지-자재 매핑, 스타일 프리셋, 현장 비교(Before/After)
-- rollback: supabase/rollbacks/20260826000001_studio_links.down.sql
alter table public.moodboard_images add column if not exists materials uuid[] not null default '{}';
create policy "mbi_update" on public.moodboard_images
  for update to authenticated
  using (public.current_role_level() >= 3 and (created_by = auth.uid() or public.current_role_level() >= 4));

create table if not exists public.mb_style_presets (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.moodboards(id) on delete set null,
  name text not null,
  notes text,
  material_ids uuid[] not null default '{}',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.mb_style_presets enable row level security;
create policy "msp_select" on public.mb_style_presets
  for select to authenticated using (public.current_role_level() >= 3);
create policy "msp_insert" on public.mb_style_presets
  for insert to authenticated with check (public.current_role_level() >= 3 and created_by = auth.uid());
create policy "msp_delete" on public.mb_style_presets
  for delete to authenticated using (created_by = auth.uid() or public.current_role_level() >= 4);

create table if not exists public.mb_compare_pairs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.moodboards(id) on delete cascade,
  before_url text not null,
  after_url text not null,
  caption text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.mb_compare_pairs enable row level security;
create policy "mcp_select" on public.mb_compare_pairs
  for select to authenticated using (public.current_role_level() >= 3);
create policy "mcp_insert" on public.mb_compare_pairs
  for insert to authenticated with check (public.current_role_level() >= 3 and created_by = auth.uid());
create policy "mcp_delete" on public.mb_compare_pairs
  for delete to authenticated using (created_by = auth.uid() or public.current_role_level() >= 4);
