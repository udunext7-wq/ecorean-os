-- ECOREAN OS — 마이그레이션 4/7: 온톨로지 스테이징
-- D-040: Neo4j 온톨로지 정의 복제 금지 — 이 테이블은 Neo4j 미도입 상태의 임시 스테이징 사본이다.
--        Neo4j 도입 시 rule_id(FK 참조)만 남기고 정의 본문은 Neo4j로 이관한다. raw에 원본 무손실 보존.

create table if not exists public.ontology_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'HQ',
  rule_id text not null,                -- ontology.json: R001~ / ontology-rules.json: OR-001~ (ETL 부여)
  trigger_code text,                    -- legacy_processes.code (P076 등) — ontology.json 계열만
  trigger_name text not null,
  relation text not null,               -- REQUIRES / 필수 / 권장 / 선택 / 제안
  targets text[] not null default '{}', -- P-코드 목록 (ontology.json) 또는 빈 배열
  target_names text[] not null default '{}',
  default_target text,
  condition text,
  quantity_calc text,                   -- ontology-rules.json의 자연어 수량식 ("타일면적 × 1.1")
  qty_formulas jsonb not null default '{}'::jsonb,  -- ontology.json의 구조화 수량식 {P078:{type,factor}}
  priority integer,
  description text,
  raw jsonb not null,                   -- 원본 규칙 무손실 보존 (D-040 이관 대비)
  origin_dataset text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, rule_id)
);
create index if not exists idx_ontology_rules_trigger on public.ontology_rules (trigger_code);
create trigger trg_ontology_rules_updated before update on public.ontology_rules
  for each row execute function public.set_updated_at();

comment on table public.ontology_rules is 'D-040: Neo4j 도입 시 이 테이블은 rule_id만 남기고 정의는 Neo4j로 이관. 현재는 임시 SoR(스테이징). 원천: ontology.json(30) + ontology-rules.json(23). qty_formula type: multiply/perimeter/fixed/manual';
