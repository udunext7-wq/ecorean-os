// (net) 레이아웃 — 역할 게이트 (D-021: 접근 제어 주체는 role) + 사이드바
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole, netRedirectTarget } from '@/core/auth/roles';
import { manifest as bocManifest } from '@/apps/boc/pack.manifest';
import { Badge, Button, Card } from '@/core/ui';

const MENU: { href: string; label: string; minRole?: 'admin' }[] = [
  { href: '/boc', label: '대시보드' },
  { href: '/boc/cost-items', label: '공정 단가' },
  { href: '/boc/materials', label: '통합 자재' },
  { href: '/boc/tiles', label: '타일 SKU' },
  { href: '/boc/role-requests', label: '승급 신청 관리', minRole: 'admin' },
];

export default async function NetLayout({ children }: { children: ReactNode }) {
  const profile = await getSessionProfile();
  const target = netRedirectTarget(profile?.role ?? null);

  if (!profile) redirect('/login');
  // D-021: 상업고객이 net 접속 시 kr 로 리다이렉트
  if (target === 'kr') redirect('https://ecorean.kr');
  // visitor 등 권한 미부여 계정 — 승급 신청 안내
  if (target === 'login') {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <h1 className="text-lg font-semibold text-slate-900">접근 권한이 없습니다</h1>
          <p className="mt-2 text-sm text-slate-500">
            {profile.email} 계정에 직원 권한(staff 이상)이 아직 부여되지 않았습니다.
          </p>
          <Link
            href="/request-role"
            className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            승급 신청하기
          </Link>
          <form action="/auth/signout" method="post" className="mt-3">
            <Button type="submit" variant="secondary">
              로그아웃
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="text-sm font-bold text-brand-700">ECOREAN 내부 운영</p>
          <p className="text-xs text-slate-400">ecorean.net</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <p className="px-2 pb-1 text-xs font-semibold uppercase text-slate-400">
            {bocManifest.menu.group}
          </p>
          {MENU.filter((item) => !item.minRole || hasRole(profile.role, item.minRole)).map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <p className="truncate text-xs text-slate-500">{profile.email}</p>
          <div className="mt-1 flex items-center justify-between">
            <Badge tone="info">{profile.role}</Badge>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-xs text-slate-400 hover:text-slate-600">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
