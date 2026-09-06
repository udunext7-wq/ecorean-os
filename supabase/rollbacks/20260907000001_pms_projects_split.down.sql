-- 되돌리기: 공정표 프로젝트 행 분리 취소 (2026-09-07)
-- 주의: 되돌리기 전에 현재 행들을 다시 한 덩어리로 합쳐 boc_pms_state 에 넣는다.
--       (분리 이후 수정분을 잃지 않기 위함. 이관 전 원본은 '_backup_20260907_before_split' 키에 있다)
insert into public.boc_pms_state (key, data)
select 'boc_projects_v1', coalesce(jsonb_agg(data order by updated_at), '[]'::jsonb)
from public.pms_projects where deleted_at is null
on conflict (key) do update set data = excluded.data, updated_at = now();

drop function if exists public.pms_project_save(text, jsonb, timestamptz);
drop function if exists public.pms_project_delete(text, timestamptz);
drop table if exists public.pms_projects;
