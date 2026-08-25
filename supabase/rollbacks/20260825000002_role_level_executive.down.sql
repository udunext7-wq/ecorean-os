-- rollback: 20260825000002_role_level_executive.sql (executive 항목 제거 — 20260716000001 원형)
create or replace function public.role_level(r text) returns int
language sql immutable as $$
  select case r
    when 'master' then 5
    when 'admin' then 4
    when 'staff' then 3
    when 'business_customer' then 2
    when 'visitor' then 1
    else 0 end
$$;
