-- AI 스튜디오 — 무드보드 갤러리 (대표 지시 2026-08-25)
-- 현장·컨셉별 레퍼런스/AI 이미지 보드. staff 이상 열람·등록, 삭제는 본인 또는 admin.
-- rollback: supabase/rollbacks/20260825000001_moodboards.down.sql

create table if not exists public.moodboards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  concept text,
  site text,
  cover_url text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_moodboards_updated before update on public.moodboards
  for each row execute function public.set_updated_at();
alter table public.moodboards enable row level security;
create policy "mb_select" on public.moodboards
  for select to authenticated using (public.current_role_level() >= 3);
create policy "mb_insert" on public.moodboards
  for insert to authenticated with check (public.current_role_level() >= 3 and created_by = auth.uid());
create policy "mb_update" on public.moodboards
  for update to authenticated
  using (public.current_role_level() >= 3 and (created_by = auth.uid() or public.current_role_level() >= 4));
create policy "mb_delete" on public.moodboards
  for delete to authenticated using (created_by = auth.uid() or public.current_role_level() >= 4);

create table if not exists public.moodboard_images (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.moodboards(id) on delete cascade,
  url text not null,
  caption text,
  tags text[] not null default '{}',
  sort int not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists idx_mbimg_board on public.moodboard_images(board_id);
alter table public.moodboard_images enable row level security;
create policy "mbi_select" on public.moodboard_images
  for select to authenticated using (public.current_role_level() >= 3);
create policy "mbi_insert" on public.moodboard_images
  for insert to authenticated with check (public.current_role_level() >= 3 and created_by = auth.uid());
create policy "mbi_delete" on public.moodboard_images
  for delete to authenticated using (created_by = auth.uid() or public.current_role_level() >= 4);

-- 스토리지: moodboards 버킷 (공개 읽기, 업로드 staff+, 삭제 본인/admin)
insert into storage.buckets (id, name, public) values ('moodboards', 'moodboards', true)
  on conflict (id) do nothing;
create policy "mb_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'moodboards' and public.current_role_level() >= 3);
create policy "mb_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'moodboards' and (owner = auth.uid() or public.current_role_level() >= 4));
