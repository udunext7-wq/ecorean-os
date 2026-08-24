'use client';

// 새 비밀번호 설정 — 재설정 메일 링크로 진입(복구 세션) 또는 로그인 상태에서 비밀번호 변경
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/db/browser';
import { Button, Card, Input } from '@/core/ui';

type SessionState = 'checking' | 'ready' | 'none';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const [linkError, setLinkError] = useState<string | null>(null);

  // 복구 링크 착지 처리 — ?code(PKCE)·#access_token(암시적) 두 형태 모두 세션으로 교환.
  // 비동기라 초기 확인 + 이벤트 구독 병행. 만료 링크는 해시의 error_code 로 판별.
  useEffect(() => {
    const supabase = createBrowserSupabase();
    let cancelled = false;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hashParams.get('error_code') === 'otp_expired') {
      setLinkError('재설정 링크가 만료되었습니다 (유효시간 1시간). 메일을 다시 요청해 주세요.');
      setSessionState('none');
      return undefined;
    }

    const code = new URLSearchParams(window.location.search).get('code');

    async function establish() {
      // detectSessionInUrl 이 자동 처리하지만, 실패 대비 code 는 명시적으로도 교환
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) setSessionState('ready');
        return;
      }
      if (code) {
        const { data: ex, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && ex?.session && !error) {
          setSessionState('ready');
          return;
        }
        if (!cancelled && error) {
          // 메일을 요청한 브라우저와 다른 곳에서 열면 PKCE 교환 불가
          setLinkError('링크가 만료되었거나, 메일을 요청한 브라우저와 다른 곳에서 열렸습니다.');
        }
      }
      if (!cancelled) setSessionState((s) => (s === 'ready' ? s : 'none'));
    }
    establish();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setSessionState('ready');
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호가 서로 일치하지 않습니다. 다시 확인해 주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      const msg = /different from the old password|same password/i.test(error.message)
        ? '이전과 같은 비밀번호입니다. 다른 비밀번호를 입력해 주세요.'
        : /rate limit/i.test(error.message)
          ? '요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.'
          : `변경 실패: ${error.message}`;
      setError(msg);
      return;
    }
    setDone(true);
  }

  if (sessionState === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-muted">확인 중…</p>
      </main>
    );
  }

  if (sessionState === 'none') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-cream">링크가 유효하지 않습니다</h1>
          <p className="mt-2 text-sm text-muted">
            {linkError ?? '재설정 링크가 만료되었거나, 메일을 요청한 브라우저와 다른 곳에서 열렸습니다.'}
            <br />
            재설정 메일을 다시 요청하거나, 관리자(대표)에게 임시 비밀번호 발급을 요청하세요.
          </p>
          <div className="mt-4 space-y-1 text-sm">
            <Link href="/reset-password" className="block font-medium text-brand-600 hover:underline">
              재설정 메일 다시 요청
            </Link>
            <Link href="/login" className="block font-medium text-brand-600 hover:underline">
              로그인으로 이동
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-cream">비밀번호가 변경되었습니다</h1>
          <p className="mt-2 text-sm text-muted">새 비밀번호로 계속 이용하실 수 있습니다.</p>
          <Button
            className="mt-4 w-full"
            onClick={() => {
              router.push('/hub');
              router.refresh();
            }}
          >
            업무 허브로 이동
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-cream">새 비밀번호 설정</h1>
        <p className="mt-1 text-sm text-muted">사용할 새 비밀번호를 입력해 주세요.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input
            type={showPw ? 'text' : 'password'}
            required
            placeholder="새 비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            autoComplete="new-password"
          />
          <Input
            type={showPw ? 'text' : 'password'}
            required
            placeholder="새 비밀번호 확인"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full"
            autoComplete="new-password"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showPw}
              onChange={(e) => setShowPw(e.target.checked)}
              className="h-4 w-4 accent-[#B8965A]"
            />
            비밀번호 표시
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '변경 중…' : '비밀번호 변경'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
