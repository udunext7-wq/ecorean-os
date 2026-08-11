-- 평면도 라이브러리 접근을 직원(staff, level 3) 이상으로 제한 (2026-08-11)
-- 배경: 사이트는 일반인 회원가입(visitor)이 가능하므로 authenticated 전체 허용은 과도.
-- 테이블 읽기·쓰기 모두 staff+ / 스토리지 쓰기 staff+ (읽기는 공개 유지 — MiniCAD 밑그림
-- fetch 가 무헤더 요청이며 경로가 UUID 라 추측 불가).
drop policy if exists "floor_plans_select_auth" on public.floor_plans;
drop policy if exists "floor_plans_insert_auth" on public.floor_plans;
drop policy if exists "floor_plans_update_auth" on public.floor_plans;
drop policy if exists "floor_plans_delete_auth" on public.floor_plans;

create policy "floor_plans_select_staff" on public.floor_plans
  for select to authenticated using (public.current_role_level() >= 3);
create policy "floor_plans_insert_staff" on public.floor_plans
  for insert to authenticated with check (public.current_role_level() >= 3);
create policy "floor_plans_update_staff" on public.floor_plans
  for update to authenticated using (public.current_role_level() >= 3);
create policy "floor_plans_delete_staff" on public.floor_plans
  for delete to authenticated using (public.current_role_level() >= 3);

drop policy if exists "floor_plans_storage_insert" on storage.objects;
drop policy if exists "floor_plans_storage_delete" on storage.objects;

create policy "floor_plans_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'floor-plans' and public.current_role_level() >= 3);
create policy "floor_plans_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'floor-plans' and public.current_role_level() >= 3);
