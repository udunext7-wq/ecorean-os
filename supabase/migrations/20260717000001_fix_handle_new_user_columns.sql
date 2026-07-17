-- 버그 수정 (2026-07-17 적용됨): 마이그레이션 'profiles'의 handle_new_user 가
-- 실제 테이블에 없는 full_name 컬럼을 insert 해 신규 가입이 실패하던 문제.
-- 배경: profiles 테이블은 7/15에 대시보드에서 선생성되어 있었고
--   (id, display_name, phone, role, email, created_at, updated_at 스키마),
--   'profiles' 마이그레이션의 create table if not exists 는 no-op 이었다.
-- rollback: 함수를 이전 정의(full_name insert)로 되돌리면 됨 (권장하지 않음)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end
$$;
