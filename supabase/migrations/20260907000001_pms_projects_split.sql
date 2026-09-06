-- 공정표(PMS) 프로젝트 행 단위 분리 (2026-09-07 대표 승인) — Supabase 적용 완료 기록본
-- 배경: boc_pms_state.boc_projects_v1 에 프로젝트 5건이 44KB 한 덩어리로 저장돼,
--       두 컴퓨터가 서로의 수정본을 통째로 덮어썼다(마지막에 '페이지를 연' 쪽이 이김).
-- 조치: 1프로젝트=1행 + 저장 시 기준 시각(base) 비교로 충돌 감지 + 소프트 삭제(묘비).
-- 백업: boc_pms_state 의 '_backup_20260907_before_split' 키에 이관 전 원본 보관.
-- 전체 SQL 은 이 파일과 동일한 내용으로 적용되었으며, 롤백은 rollbacks/ 참조.

create table if not exists public.pms_projects (
  id text primary key,
  name text,
  addr text,
  start_date text,
  data jsonb not null,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  updated_email text
);
create index if not exists ix_pms_projects_updated on public.pms_projects (updated_at);
alter table public.pms_projects enable row level security;

drop policy if exists pms_projects_staff_read on public.pms_projects;
create policy pms_projects_staff_read on public.pms_projects
  for select to authenticated using (current_role_level() >= 3);

-- 저장: base 보다 서버가 최신이면 덮어쓰지 않고 CONFLICT + 서버본을 돌려준다 (base null = 강제 덮어쓰기)
create or replace function public.pms_project_save(p_id text, p_data jsonb, p_base timestamptz default null)
returns table (status text, updated_at timestamptz, server_data jsonb)
language plpgsql security definer set search_path = public as $$
declare cur record; who text;
begin
  if current_role_level() < 3 then raise exception 'NOT_AUTHORIZED'; end if;
  if p_id is null or p_data is null then raise exception 'BAD_REQUEST'; end if;
  select * into cur from public.pms_projects where id = p_id;
  if found and p_base is not null and cur.updated_at > p_base then
    return query select 'CONFLICT'::text, cur.updated_at, cur.data;
    return;
  end if;
  select u.email into who from auth.users u where u.id = auth.uid();
  insert into public.pms_projects (id, name, addr, start_date, data, deleted_at, updated_at, updated_by, updated_email)
  values (p_id, p_data->>'name', p_data->>'addr', p_data->>'startDate', p_data, null, now(), auth.uid(), who)
  on conflict (id) do update set
    name = excluded.name, addr = excluded.addr, start_date = excluded.start_date,
    data = excluded.data, deleted_at = null, updated_at = now(),
    updated_by = excluded.updated_by, updated_email = excluded.updated_email;
  return query select 'SAVED'::text, p.updated_at, null::jsonb from public.pms_projects p where p.id = p_id;
end $$;

-- 삭제: 묘비를 남긴다 (다른 PC 가 부팅 때 되살리는 사고 방지)
create or replace function public.pms_project_delete(p_id text, p_base timestamptz default null)
returns table (status text, updated_at timestamptz, server_data jsonb)
language plpgsql security definer set search_path = public as $$
declare cur record; who text;
begin
  if current_role_level() < 3 then raise exception 'NOT_AUTHORIZED'; end if;
  select * into cur from public.pms_projects where id = p_id;
  if not found then return query select 'GONE'::text, now(), null::jsonb; return; end if;
  if p_base is not null and cur.updated_at > p_base then
    return query select 'CONFLICT'::text, cur.updated_at, cur.data;
    return;
  end if;
  select u.email into who from auth.users u where u.id = auth.uid();
  update public.pms_projects
     set deleted_at = now(), updated_at = now(), updated_by = auth.uid(), updated_email = who
   where id = p_id;
  return query select 'DELETED'::text, p.updated_at, null::jsonb from public.pms_projects p where p.id = p_id;
end $$;

revoke all on function public.pms_project_save(text, jsonb, timestamptz) from public, anon;
revoke all on function public.pms_project_delete(text, timestamptz) from public, anon;
grant execute on function public.pms_project_save(text, jsonb, timestamptz) to authenticated;
grant execute on function public.pms_project_delete(text, timestamptz) to authenticated;

-- 기존 한 덩어리를 행으로 이관 (적용 시 5건)
insert into public.pms_projects (id, name, addr, start_date, data, updated_at, updated_email)
select e->>'id', e->>'name', e->>'addr', e->>'startDate', e,
       coalesce((select s.updated_at from public.boc_pms_state s where s.key = 'boc_projects_v1'), now()),
       'migrated'
from (select jsonb_array_elements(data) e from public.boc_pms_state where key = 'boc_projects_v1') t
where e->>'id' is not null
on conflict (id) do nothing;

comment on table public.pms_projects is
  '공정표(PMS) 프로젝트 — 1프로젝트=1행. boc_pms_state 한 덩어리 저장이 컴퓨터 간 덮어쓰기를 유발해 2026-09-07 분리. 쓰기는 pms_project_save/delete(충돌 감지)로만.';
