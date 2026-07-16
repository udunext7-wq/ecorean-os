-- ECOREAN OS — Supabase 이관 마이그레이션 1/7: 공통 헬퍼 + ETL 계보
-- 거버넌스: D-002 (트랜잭션 DB = Supabase)

-- updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ETL 계보·멱등성 근거 테이블
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  dataset_name text not null,
  file_name text not null,
  file_sha256 text not null,
  record_count integer not null check (record_count >= 0),
  imported_at timestamptz not null default now(),
  notes text,
  unique (dataset_name, file_sha256)
);

comment on table public.import_batches is 'ETL 실행 기록 — 어느 JSON 원본(해시)에서 몇 건이 들어왔는지 계보 추적';
