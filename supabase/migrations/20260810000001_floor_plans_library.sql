-- 평면도 라이브러리 (2026-08-10 대표 지시)
-- 출처: 고객 제공 도면·공공 분양 자료·현장 실측·MiniCAD 작성분 (정당 보유 자료만)
create table if not exists public.floor_plans (
  id uuid primary key default gen_random_uuid(),
  complex_name text not null,                -- 단지/건물명
  region_sido text,                          -- 시/도
  region_gugun text,                         -- 시/군/구
  address text,                              -- 상세 주소 (선택)
  area_type text,                            -- 평형/타입 (예: 84A, 25평형)
  exclusive_area_m2 numeric,                 -- 전용면적(㎡)
  rooms smallint,                            -- 방 개수
  baths smallint,                            -- 욕실 개수
  source text not null default 'customer'
    check (source in ('customer','public','survey','minicad')),
  source_note text,                          -- 출처 상세 (고객명/공고명 등)
  image_path text not null,                  -- storage floor-plans 버킷 내 경로
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists floor_plans_complex_idx on public.floor_plans (complex_name);
create index if not exists floor_plans_region_idx on public.floor_plans (region_sido, region_gugun);
create index if not exists floor_plans_created_idx on public.floor_plans (created_at desc);

alter table public.floor_plans enable row level security;

-- 직원(로그인 사용자) 전용: 조회·등록·수정·삭제
create policy "floor_plans_select_auth" on public.floor_plans
  for select to authenticated using (true);
create policy "floor_plans_insert_auth" on public.floor_plans
  for insert to authenticated with check (true);
create policy "floor_plans_update_auth" on public.floor_plans
  for update to authenticated using (true);
create policy "floor_plans_delete_auth" on public.floor_plans
  for delete to authenticated using (true);

-- updated_at 자동 갱신
create or replace function public.floor_plans_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger floor_plans_touch before update on public.floor_plans
  for each row execute function public.floor_plans_touch();

-- 이미지 버킷: 공개 읽기(MiniCAD 밑그림 로드용), 쓰기는 로그인 사용자만
insert into storage.buckets (id, name, public)
  values ('floor-plans','floor-plans', true)
  on conflict (id) do nothing;

create policy "floor_plans_storage_read" on storage.objects
  for select using (bucket_id = 'floor-plans');
create policy "floor_plans_storage_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'floor-plans');
create policy "floor_plans_storage_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'floor-plans');
