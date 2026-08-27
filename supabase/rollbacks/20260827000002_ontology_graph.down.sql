-- rollback: 20260827000002_ontology_graph.sql
drop function if exists public.ontology_schedule(date, text, text[], int);
drop function if exists public.cost_item_phase(text);
drop function if exists public.ontology_ingest_rules(jsonb);
drop table if exists public.ontology_edges;
drop table if exists public.ontology_nodes;
