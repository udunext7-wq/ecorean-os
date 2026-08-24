'use client';

// 비밀번호 찾기 — 가입 이메일로 재설정 링크 발송 (링크 → /auth/confirm → /update-password)
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Button, Card, Input } from '@/core/ui';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // /auth/confirm 에서 만료·무효 링크로 되돌아온 경우 안내
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('error');
    if (err === 'link') {
      setNotice('재설정 링크가 만료되었거나 이미 사용되었습니다. 메일을 다시 요청해 주세요.');
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    // 링크가 /update-password 로 직접 착지 — code(PKCE)·해시 토큰 두 형태 모두 그 화면에서 처리
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (error) {
      setError(
        /rate limit/i.test(error.message)
          ? '메일 발송량이 일시 제한되었습니다. 급하신 경우 관리자(대표)에게 임시 비밀번호 발급을 요청하세요. (1시간 후 재시도 가능)'
          : /security purposes/i.test(error.message)
            ? '잠시 후 다시 시도해 주세요. (연속 요청은 60초 간격 제한)'
            : `발송 실패: ${error.message}`,
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-cream">재설정 메일을 보냈습니다</h1>
          <p className="mt-2 text-sm text-muted">
            {email} 이 가입된 이메일이라면 비밀번호 재설정 메일이 도착합니다.
            <br />
            메일의 링크를 눌러 새 비밀번호를 설정해 주세요.
          </p>
          <p className="mt-2 text-xs text-faint">
            메일이 안 보이면 스팸함을 확인하거나 1분 후 다시 요청해 주세요.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
            로그인으로 이동
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-cream">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-muted">
          가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
        </p>
        {notice ? <p className="mt-3 text-sm text-danger">{notice}</p> : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input
            type="email"
            required
            placeholder="가입한 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            autoComplete="email"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '발송 중…' : '재설정 메일 보내기'}
          </Button>
        </form>
        <p className="mt-4 border-t border-stroke pt-4 text-center text-sm text-muted">
          비밀번호가 기억나셨나요?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            로그인
          </Link>
        </p>
      </Card>
    </main>
  );
}
