// 승급 신청 관리 (admin 이상) — 승인 시 profiles.role 이 요청 역할로 변경된다
import { createServerSupabase } from '@/core/db/server';
import type { RoleRequestRow } from '@/core/db/types';
import { PageHeader, Table, THead, Th, Td, Badge, Button } from '@/core/ui';
import { decideRoleRequest } from '../actions';

const STATUS_BADGE: Record<RoleRequestRow['status'], { label: string; tone: 'warn' | 'ok' | 'neutral' }> = {
  pending: { label: '대기', tone: 'warn' },
  approved: { label: '승인', tone: 'ok' },
  rejected: { label: '거절', tone: 'neutral' },
};

export default async function RoleRequestsPage() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('role_requests')
    .select('*')
    .order('status', { ascending: false }) // pending 먼저
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = (data ?? []) as RoleRequestRow[];

  return (
    <div>
      <PageHeader
        title="승급 신청 관리"
        description="승인하면 신청자의 역할이 즉시 변경됩니다. 권한 검증은 DB 함수가 수행합니다."
      />

      {error ? (
        <p className="text-sm text-danger">조회 오류: {error.message}</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>신청일</Th>
              <Th>이름</Th>
              <Th>이메일</Th>
              <Th>연락처</Th>
              <Th>요청 역할</Th>
              <Th>사유</Th>
              <Th>상태</Th>
              <Th>처리</Th>
            </tr>
          </THead>
          <tbody className="divide-y divide-stroke">
            {rows.map((r) => {
              const badge = STATUS_BADGE[r.status];
              return (
                <tr key={r.id} className="hover:bg-panel2">
                  <Td className="whitespace-nowrap text-xs">{r.created_at?.slice(0, 10)}</Td>
                  <Td className="font-medium text-cream">{r.name ?? '—'}</Td>
                  <Td>{r.email ?? '—'}</Td>
                  <Td>{r.phone ?? '—'}</Td>
                  <Td>
                    <Badge tone="info">{r.requested_role}</Badge>
                  </Td>
                  <Td className="max-w-xs truncate" title={r.reason ?? ''}>
                    {r.reason ?? '—'}
                  </Td>
                  <Td>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </Td>
                  <Td>
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <form action={decideRoleRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <Button type="submit" className="px-3 py-1 text-xs">
                            승인
                          </Button>
                        </form>
                        <form action={decideRoleRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
                            거절
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-faint">완료</span>
                    )}
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={8} className="py-8 text-center text-faint">
                  승급 신청이 없습니다
                </Td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      )}
    </div>
  );
}
