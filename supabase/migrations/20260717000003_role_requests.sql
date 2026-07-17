-- 승급 신청 (대표 지시 2026-07-17: 로그인창에 회원가입·승급신청) — 적용됨(3분할:
-- role_requests_table / role_requests_policies / role_requests_decide_fn.
-- 원격 함수의 raise 메시지는 코드형: NOT_AUTHORIZED / NOT_PENDING / NEEDS_HIGHER_APPROVER)
-- 흐름: 가입(visitor) → 승급 신청 → admin+ 승인 시 profiles.role 변경
-- 보안: profiles 직접 쓰기 정책 없음 유지. 승격은 security definer 함수만.
--   승인자 레벨 >= 4(admin, D-021 '승인' 권한) 이고 요청 역할보다 높아야 함
--   (admin은 staff까지, master는 admin까지 승인 가능. master 요청은 불가)
-- rollback:
--   drop function if exists public.decide_role_request(uuid, boolean);
--   drop table if exists public.role_requests;

create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  requested_role text not null default 'staff'
    check (requested_role in ('business_customer','staff','admin')),
  reason text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
-- 사용자당 대기 중 신청 1건만
create unique index if not exists uq_role_requests_pending
  on public.role_requests (user_id) where status = 'pending';

alter table public.role_requests enable row level security;
create policy "insert_own_request" on public.role_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "select_own_request" on public.role_requests
  for select to authenticated using (user_id = auth.uid());
create policy "admin_select_requests" on public.role_requests
  for select to authenticated using (public.current_role_level() >= 4);
-- update/delete 정책 없음 → 결정은 아래 함수만

create or replace function public.decide_role_request(req_id uuid, approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  req record;
  approver_level int := public.current_role_level();
begin
  if approver_level < 4 then
    raise exception '승인 권한 없음 (admin 이상 필요)';
  end if;
  select * into req from role_requests where id = req_id and status = 'pending' for update;
  if not found then
    raise exception '대기 중인 신청이 아님';
  end if;
  if approver_level <= public.role_level(req.requested_role) then
    raise exception '요청 역할(%)이 승인자 권한 이상 — 상위 관리자 필요', req.requested_role;
  end if;

  update role_requests
    set status = case when approve then 'approved' else 'rejected' end,
        decided_by = auth.uid(),
        decided_at = now()
    where id = req_id;

  if approve then
    update profiles set role = req.requested_role where id = req.user_id;
  end if;
end
$$;

comment on table public.role_requests is
  '역할 승급 신청. 대기 1건/인. 결정은 decide_role_request(security definer)만 — 승인자 레벨이 요청 역할보다 높아야 함';
