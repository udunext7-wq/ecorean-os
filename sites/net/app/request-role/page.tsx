'use client';

// 승급 신청 — 로그인 필요 (미들웨어가 미로그인 시 /login 으로 보냄).
// visitor 가 staff 승급을 신청하면 admin 이상이 boc 에서 승인한다.
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/core/db/browser';
import { Badge, Button, Input } from '@/core/ui';
import { AuthShell } from '../_auth/AuthShell';
import { hasRole } from '@/core/auth/roles';
import type { Role } from '@/shared/types/pack';

type ViewState = 'loading' | 'already-staff' | 'pending' | 'form' | 'done';

export default function RequestRolePage() {
  const [state, setState] = useState<ViewState>('loading');
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return; // 미들웨어가 /login 처리
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('id', user.id)
        .maybeSingle();
      const r = (profile?.role ?? 'visitor') as Role;
      setRole(r);
      if (profile?.display_name) setName(profile.display_name);
      if (hasRole(r, 'staff')) {
        setState('already-staff');
        return;
      }
      const { data: pending } = await supabase
        .from('role_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      setState(pending ? 'pending' : 'form');
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('role_requests').insert({
      user_id: user.id,
      email: user.email,
      name,
      phone,
      reason,
      requested_role: 'staff',
    });
    setLoading(false);
    if (error) {
      setError(`신청 실패: ${error.message}`);
      return;
    }
    setState('done');
  }

  return (
    <AuthShell>
      <h1 className="text-lg font-semibold text-cream">승급 신청</h1>

        {state === 'loading' ? (
          <p className="mt-4 text-sm text-faint">확인 중…</p>
        ) : null}

        {state === 'already-staff' ? (
          <div className="mt-4 text-sm text-muted">
            <p>
              이미 직원 권한입니다 <Badge tone="ok">{role}</Badge>
            </p>
            <Link href="/boc" className="mt-3 inline-block font-medium text-brand-600 hover:underline">
              업무시스템으로 이동
            </Link>
          </div>
        ) : null}

        {state === 'pending' ? (
          <p className="mt-4 text-sm text-muted">
            이미 접수된 승급 신청이 <b>승인 대기 중</b>입니다. 관리자 승인 후 다시 로그인해 주세요.
          </p>
        ) : null}

        {state === 'done' ? (
          <p className="mt-4 text-sm text-muted">
            승급 신청이 접수되었습니다. 관리자 승인 후 업무시스템을 사용할 수 있습니다.
          </p>
        ) : null}

        {state === 'form' ? (
          <>
            <p className="mt-1 text-sm text-muted">
              현재 권한 <Badge>{role ?? 'visitor'}</Badge> → 직원(staff) 승급을 신청합니다.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <Input
                required
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
              <Input
                placeholder="연락처"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full"
              />
              <Input
                required
                placeholder="신청 사유 (소속·직무 등)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full"
              />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? '접수 중…' : '승급 신청하기'}
              </Button>
            </form>
          </>
        ) : null}
    </AuthShell>
  );
}
