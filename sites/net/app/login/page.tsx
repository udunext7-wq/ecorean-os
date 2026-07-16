'use client';

// 로그인 — Supabase Auth (D-011). 이메일+비밀번호.
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/db/browser';
import { Button, Card, Input } from '@/core/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    router.push('/');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-slate-900">ECOREAN 내부 운영</h1>
        <p className="mt-1 text-sm text-slate-500">직원 계정으로 로그인하세요.</p>
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
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '확인 중…' : '로그인'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
