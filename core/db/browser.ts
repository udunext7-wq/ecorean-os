// core/db/browser.ts — 클라이언트 컴포넌트용 Supabase 클라이언트 (로그인 화면 등)
'use client';
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
