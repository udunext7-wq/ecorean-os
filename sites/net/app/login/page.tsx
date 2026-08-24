'use client';

// 로그인 — Supabase Auth (D-011). 회원가입·승급신청 진입점 + 아이디 저장 (대표 지시 2026-07-20)
// 오류 구분(미인증/비밀번호 불일치) + 인증메일 재발송 + 비밀번호 찾기 (대표 지시 2026-08-24)
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
  const [notice, setNotice] = useState<string | null>(null);
  const [needConfirm, setNeedConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);

  // 저장된 아이디 프리필 + 메일 링크 만료로 되돌아온 경우 안내
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
    const err = new URLSearchParams(window.location.search).get('error');
    if (err === 'link') {
      setNotice('인증 링크가 만료되었거나 이미 사용되었습니다. 로그인하시거나 인증메일을 다시 받아주세요.');
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    setNeedConfirm(false);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        // 가입은 됐지만 메일 인증 미완료 — 비밀번호 문제로 오인하지 않게 명확히 구분
        setNeedConfirm(true);
        setError('이메일 인증이 완료되지 않은 계정입니다. 받은 메일함(스팸함 포함)의 인증 링크를 눌러주세요.');
      } else if (/invalid login credentials/i.test(error.message)) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다. 비밀번호가 기억나지 않으면 아래 "비밀번호 찾기"를 이용하세요.');
      } else if (/rate limit/i.test(error.message)) {
        setError('로그인 시도가 많아 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setError(`로그인 실패: ${error.message}`);
      }
      return;
    }
    try {
      if (remember) localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
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

  async function resendConfirm() {
    setResending(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/login` },
    });
    setResending(false);
    setNeedConfirm(false);
    if (error) {
      setError(
        /rate limit|security purposes/i.test(error.message)
          ? '요청이 많아 잠시 제한되었습니다. 1분 후 다시 시도해 주세요.'
          : `재발송 실패: ${error.message}`,
      );
      return;
    }
    setNotice(`${email.trim()} 로 인증 메일을 다시 보냈습니다. 링크를 누른 뒤 로그인해 주세요.`);
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
          {notice ? <p className="text-sm text-brand-600">{notice}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {needConfirm ? (
            <Button
              type="button"
              variant="secondary"
              disabled={resending}
              onClick={resendConfirm}
              className="w-full"
            >
              {resending ? '발송 중…' : '인증 메일 재발송'}
            </Button>
          ) : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '확인 중…' : '로그인'}
          </Button>
        </form>

        <div className="mt-4 border-t border-stroke pt-4 text-center text-sm text-muted">
          <p>
            <Link href="/reset-password" className="font-medium text-brand-600 hover:underline">
              비밀번호 찾기
            </Link>
          </p>
          <p className="mt-1">
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
