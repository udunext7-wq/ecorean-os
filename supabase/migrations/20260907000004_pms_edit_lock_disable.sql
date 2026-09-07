-- 편집 잠금 비활성화 (2026-09-07) — Supabase 적용 완료 기록본
-- 대표 지시: "잠금하는 것도 내가 원하는 게 아니다" + 잠금 로직이 공정표 열기 무한 루프를 유발함.
-- 판정 함수만 항상 true 로 바꾼다. 테이블·나머지 함수(pms_edit_unlock 등)는 남겨두어,
-- 원하는 잠금 형태가 정해지면 20260907000003 의 정의를 되살리기만 하면 된다.
create or replace function public.pms_edit_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select true;
$$;
