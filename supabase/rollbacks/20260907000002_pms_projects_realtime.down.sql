-- 되돌리기: 공정표 실시간 발행 해제 (2026-09-07). 해제해도 15초 폴링으로 동작한다.
alter publication supabase_realtime drop table public.pms_projects;
