-- 프리셋 이름·메모 수정 허용 (본인 또는 admin) — 2026-08-26 실용화 패스
-- rollback: supabase/rollbacks/20260826000002_studio_preset_update.down.sql
create policy "msp_update" on public.mb_style_presets
  for update to authenticated
  using (public.current_role_level() >= 3 and (created_by = auth.uid() or public.current_role_level() >= 4));
