-- 버그 수정 (2026-07-20 적용됨): 신규 가입 전면 실패 해결
-- 원인: 7/15 대시보드에서 생성된 구 profiles_role_check 가 ('customer','staff','admin')만 허용
--   → handle_new_user 의 기본 role 'visitor' insert 가 check 위반으로 실패
--   → GoTrue "Database error saving new user" (회원가입 불가)
--   (20260717000002 하드닝의 DO 블록이 "동명 제약 존재"로 교체를 건너뛴 것이 누락 원인)
-- rollback: 구 제약 복원은 가입을 다시 깨뜨리므로 없음
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('visitor','business_customer','staff','admin','master'));
