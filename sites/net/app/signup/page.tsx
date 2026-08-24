'use client';

// 회원가입 — 가입 즉시 역할은 visitor(최소 권한). 이후 승급 신청 → admin 승인 시 staff.
// 비밀번호 확인·표시 추가 — 오타로 다른 비밀번호가 저장되는 사고 방지 (대표 지시 2026-08-24)
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/core/db/browser';
import { Button, Input } from '@/core/ui';
import { AuthShell } from '../_auth/AuthShell';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needConfirm, setNeedConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        // 확인 링크 → /auth/confirm 에서 세션 교환 후 승급 신청으로 (Supabase URL 허용목록 등록 필요)
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/request-role`,
      },
    });
    setLoading(false);
    if (error) {
      const msg = /rate limit/i.test(error.message)
        ? '가입 요청이 몰려 잠시 제한되었습니다. 1시간 후 다시 시도해 주세요.'
        : /already registered/i.test(error.message)
          ? '이미 가입된 이메일입니다. 로그인해 주세요.'
          : `가입 실패: ${error.message}`;
      setError(msg);
      return;
    }
    if (data.session) {
      // 즉시 로그인됨 → 바로 승급 신청으로
      router.push('/request-role');
      router.refresh();
    } else if (data.user && (data.user.identities?.length ?? 0) === 0) {
      // 이미 가입된 이메일 — Supabase 는 보안상 성공처럼 응답하지만 identities 가 비어 있고
      // 확인 메일도 발송되지 않으므로, 확인 안내 대신 로그인 유도가 맞다 (2026-07-24 대표 실사용 혼동)
      setError('이미 가입된 이메일입니다. 로그인해 주세요.');
    } else {
      // 이메일 확인이 켜져 있는 경우
      setNeedConfirm(true);
    }
  }

  if (needConfirm) {
    return (
      <AuthShell>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-cream">확인 메일을 보냈습니다</h1>
          <p className="mt-2 text-sm text-muted">
            {email} 로 보낸 메일의 링크를 눌러 가입을 완료한 뒤,
            <br />
            로그인하고 승급 신청을 해주세요.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
            로그인으로 이동
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-lg font-semibold text-cream">회원가입</h1>
        <p className="mt-1 text-sm text-muted">
          가입 후 승급 신청을 하면 관리자 승인 뒤 업무시스템을 사용할 수 있습니다.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input
            required
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
            autoComplete="name"
          />
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
            type={showPw ? 'text' : 'password'}
            required
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
            autoComplete="new-password"
          />
          <Input
            type={showPw ? 'text' : 'password'}
            required
            placeholder="비밀번호 확인"
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
            {loading ? '가입 중…' : '가입하기'}
          </Button>
        </form>
        <p className="mt-4 border-t border-stroke pt-4 text-center text-sm text-muted">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            로그인
          </Link>
        </p>
    </AuthShell>
  );
}
