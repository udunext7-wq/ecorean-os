-- 공정표(PMS) 상태 저장 보안 강화 (대표 지시 2026-07-19: 공정표 DB 연동 정식화)
-- 기존: boc_pms_state 에 anon 읽기/쓰기 전면 허용 → 공개 anon 키로 누구나 조작 가능 (구멍)
-- 변경: anon 정책 제거. 읽기 = staff 이상. 쓰기 = pms_save_state(security definer, staff+)만.
--       앱은 직접 REST 대신 /api/pms/state (세션 인증 프록시) 경유.
-- 데이터는 그대로 보존. rollback:
--   drop function if exists public.pms_save_state(text, jsonb);
--   alter table public.boc_pms_state drop column if exists updated_by;
--   (이전 anon 정책 재생성은 권장하지 않음 — 보안 구멍)

alter table public.boc_pms_state add column if not exists updated_by text;

drop policy if exists boc_pms_state_insert on public.boc_pms_state;
drop policy if exists boc_pms_state_update on public.boc_pms_state;
drop policy if exists boc_pms_state_select on public.boc_pms_state;

create policy "pms_state_staff_read" on public.boc_pms_state
  for select to authenticated using (public.current_role_level() >= 3);
-- 쓰기 정책 없음 → 아래 함수/service_role 만

create or replace function public.pms_save_state(p_key text, p_data jsonb)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  ts timestamptz;
begin
  if public.current_role_level() < 3 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_key is null or p_key !~ '^boc_[a-z0-9_]{2,40}$' then
    raise exception 'BAD_KEY';
  end if;
  if p_data is null or pg_column_size(p_data) > 4194304 then
    raise exception 'BAD_DATA';
  end if;
  insert into boc_pms_state (key, data, updated_at, updated_by)
  values (p_key, p_data, now(), (select email from profiles where id = auth.uid()))
  on conflict (key) do update
    set data = excluded.data,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
  returning updated_at into ts;
  return ts;
end
$$;
