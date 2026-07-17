-- MiniCAD 단가 DB 연동 (대표 지시 2026-07-17) — 적용됨 (3분할:
-- minicad_proposal_columns / minicad_propose_fn / minicad_decide_fn)
-- 흐름: 직원이 MiniCAD에서 단가 입력 → 제안(proposed_price) → admin+ 승인 시
--       price_override + is_approved=true → v_minicad_price_table 로 전사 노출.
-- 헌법 3조: 무승인 마스터 업데이트 금지 — 승인 없이는 공식 단가에 반영되지 않음.
-- rollback:
--   drop function if exists public.minicad_decide_price(text, boolean);
--   drop function if exists public.minicad_propose_price(text, integer);
--   alter table public.minicad_price_keys
--     drop column if exists proposed_price,
--     drop column if exists proposed_by,
--     drop column if exists proposed_at;

alter table public.minicad_price_keys
  add column if not exists proposed_price integer check (proposed_price >= 0);
alter table public.minicad_price_keys
  add column if not exists proposed_by text;
alter table public.minicad_price_keys
  add column if not exists proposed_at timestamptz;

-- 단가 제안 (staff 이상) — upsert, 승인 전까지 뷰에 노출되지 않음
create or replace function public.minicad_propose_price(p_key text, p_price integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role_level() < 3 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_price is null or p_price < 0 or p_price > 1000000000 then
    raise exception 'BAD_PRICE';
  end if;
  if p_key is null or p_key !~ '^[A-Za-z0-9_.\-]{2,80}$' then
    raise exception 'BAD_KEY';
  end if;
  insert into minicad_price_keys (tenant_id, price_key, proposed_price, proposed_by, proposed_at)
  values ('HQ', p_key, p_price,
          (select email from profiles where id = auth.uid()), now())
  on conflict (tenant_id, price_key) do update
    set proposed_price = excluded.proposed_price,
        proposed_by    = excluded.proposed_by,
        proposed_at    = excluded.proposed_at;
end
$$;

-- 제안 승인/거절 (admin 이상 = D-051 승인 절차)
create or replace function public.minicad_decide_price(p_key text, approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  if public.current_role_level() < 4 then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into r from minicad_price_keys
    where tenant_id = 'HQ' and price_key = p_key and proposed_price is not null
    for update;
  if not found then
    raise exception 'NO_PROPOSAL';
  end if;
  if approve then
    update minicad_price_keys
      set price_override = r.proposed_price,
          is_approved = true,
          approved_by = (select email from profiles where id = auth.uid()),
          approved_at = now(),
          proposed_price = null, proposed_by = null, proposed_at = null
      where id = r.id;
  else
    update minicad_price_keys
      set proposed_price = null, proposed_by = null, proposed_at = null
      where id = r.id;
  end if;
end
$$;
