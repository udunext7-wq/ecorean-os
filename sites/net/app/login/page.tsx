'use client';

// 로그인 — Supabase Auth (D-011). 회원가입·승급신청 진입점 + 아이디 저장 (대표 지시 2026-07-20)
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/db/browser';
import { Button, Card, Input } from '@/core/ui';

const SAVED_EMAIL_KEY = 'ecorean.savedEmail';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 저장된 아이디 프리필
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {
      /* no-op */
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('로그인 실패: 이메일 또는 비밀번호를 확인하세요.');
      return;
    }
    try {
      if (remember) localStorage.setItem(SAVED_EMAIL_KEY, email);
      else localStorage.removeItem(SAVED_EMAIL_KEY);
    } catch {
      /* no-op */
    }
    // ?next= 가 있으면 그 모듈로, 없으면 업무 허브로 (open redirect 방지)
    const raw = new URLSearchParams(window.location.search).get('next');
    const next = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/hub';
    router.push(next);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-cream">업무시스템 로그인</h1>
        <p className="mt-1 text-sm text-muted">ECOREAN 내부 운영 — 직원 계정으로 로그인하세요.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input
            type="email"
            required
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            autoComplete="email"
          />
          <Input
            type="password"
            required
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            autoComplete="current-password"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[#B8965A]"
            />
            아이디 저장
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '확인 중…' : '로그인'}
          </Button>
        </form>

        <div className="mt-4 border-t border-stroke pt-4 text-center text-sm text-muted">
          <p>
            계정이 없으신가요?{' '}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline">
              회원가입
            </Link>
          </p>
          <p className="mt-1">
            직원 권한이 필요하신가요?{' '}
            <Link href="/request-role" className="font-medium text-brand-600 hover:underline">
              승급 신청
            </Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
