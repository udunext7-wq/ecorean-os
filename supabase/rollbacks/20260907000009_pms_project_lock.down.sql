-- 되돌리기: 공정표별 잠금 제거 (모든 공정표를 누구나 수정 가능하게)
drop function if exists public.pms_project_set_lock(text,text);
drop function if exists public.pms_project_unlock(text,text);
drop function if exists public.pms_project_can_edit(text);
drop table if exists public.pms_project_unlocks;
alter table public.pms_projects drop column if exists is_locked;
alter table public.pms_projects drop column if exists lock_hash;
alter table public.pms_projects drop column if exists lock_set_at;
-- 이후 pms_project_save/delete 를 20260907000001 정의로 되돌릴 것.
