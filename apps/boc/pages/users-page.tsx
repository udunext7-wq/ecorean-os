// 회원 관리 (admin 이상) — 전체 회원 목록 + 임시 비밀번호 즉시 발급 (메일 불필요)
// 배경: Supabase 기본 SMTP 시간당 2건 제한으로 비밀번호 찾기 메일이 지연될 수 있음 (대표 지시 2026-08-24)
import { createServerSupabase } from '@/core/db/server';
import type { ProfileRow } from '@/core/db/types';
import { PageHeader, Table, THead, Th, Td, Badge } from '@/core/ui';
import { PasswordResetForm } from '../components/PasswordResetForm';

const ROLE_BADGE: Record<string, 'ok' | 'info' | 'warn' | 'neutral'> = {
  master: 'ok',
  admin: 'ok',
  staff: 'info',
  business_customer: 'neutral',
  visitor: 'warn',
};

export default async function UsersPage() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (data ?? []) as ProfileRow[];

  return (
    <div>
      <PageHeader
        title="회원 관리"
        description="비밀번호를 잊은 회원에게 임시 비밀번호를 즉시 발급합니다 (메일 발송 불필요). 발급 시 기존 로그인은 모두 종료되며, 미인증 이메일은 인증 처리됩니다."
      />

      {error ? (
        <p className="text-sm text-danger">조회 오류: {error.message}</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>가입일</Th>
              <Th>이름</Th>
              <Th>이메일</Th>
              <Th>역할</Th>
              <Th>임시 비밀번호 발급</Th>
            </tr>
          </THead>
          <tbody className="divide-y divide-stroke">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-panel2">
                <Td className="whitespace-nowrap text-xs">{p.created_at?.slice(0, 10)}</Td>
                <Td className="font-medium text-cream">{p.display_name ?? '—'}</Td>
                <Td>{p.email ?? '—'}</Td>
                <Td>
                  <Badge tone={ROLE_BADGE[p.role] ?? 'neutral'}>{p.role}</Badge>
                </Td>
                <Td>{p.email ? <PasswordResetForm email={p.email} /> : '—'}</Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-6 text-center text-muted">
                  회원이 없습니다
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      )}
    </div>
  );
}
