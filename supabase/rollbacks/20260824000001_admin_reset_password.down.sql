-- rollback: 20260824000001_admin_reset_password.sql
drop function if exists public.admin_reset_password(text, text);
