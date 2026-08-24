'use client';

// 회원 관리 — 임시 비밀번호 즉시 발급 폼 (행 단위)
// 발급은 서버 액션 → admin_reset_password(security definer, admin+ 검증) 경유
import { useState, useTransition } from 'react';
import { Button, Input } from '@/core/ui';
import { resetUserPassword } from '../actions';

// 읽기 쉬운 임시 비밀번호 생성 (혼동 문자 제외)
function generateTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const rand = new Uint32Array(8);
  crypto.getRandomValues(rand);
  for (let i = 0; i < 8; i += 1) out += chars[rand[i] % chars.length];
  return `${out}!`;
}

export function PasswordResetForm({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const pw = password.trim();
    if (pw.length < 6) {
      setResult({ ok: false, msg: '6자 이상 입력' });
      return;
    }
    startTransition(async () => {
      const res = await resetUserPassword(email, pw);
      setResult(
        res.ok
          ? { ok: true, msg: `발급 완료 — 임시 비밀번호: ${pw}` }
          : { ok: false, msg: res.error ?? '발급 실패' },
      );
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="임시 비밀번호 (6자+)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-40 px-2 py-1 text-xs"
        />
        <Button
          type="button"
          variant="secondary"
          className="whitespace-nowrap px-2 py-1 text-xs"
          onClick={() => setPassword(generateTempPassword())}
        >
          자동생성
        </Button>
        <Button
          type="button"
          disabled={pending || password.trim().length < 6}
          className="whitespace-nowrap px-3 py-1 text-xs"
          onClick={submit}
        >
          {pending ? '발급 중…' : '발급'}
        </Button>
      </div>
      {result ? (
        <p className={`mt-1 text-xs ${result.ok ? 'text-brand-600' : 'text-danger'}`}>
          {result.msg}
          {result.ok ? ' — 본인에게 전달 후 로그인 → 비밀번호 변경 안내' : ''}
        </p>
      ) : null}
    </div>
  );
}
