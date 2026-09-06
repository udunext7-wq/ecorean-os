-- 공정표 실시간 공유 (2026-09-07 대표 지시) — Supabase 적용 완료 기록본
-- "내가 수정하면 다른 직원들이 하나의 공정표를 바라본다" → 폴링(15초)을 기다리지 않고 즉시 반영.
-- RLS(staff 이상 조회)는 Realtime 에도 그대로 적용된다.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pms_projects'
  ) then
    alter publication supabase_realtime add table public.pms_projects;
  end if;
end $$;
