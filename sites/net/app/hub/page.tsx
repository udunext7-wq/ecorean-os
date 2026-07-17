// /hub — 업무시스템 허브. 로그인 창 안에서 열리며, 기존 홈페이지 드롭다운에 있던
// 모듈들을 그대로 라우팅한다 (+ 새 BOC). 접근: staff 이상 (D-021).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole, netRedirectTarget } from '@/core/auth/roles';
import { Badge, Button, Card } from '@/core/ui';

export const dynamic = 'force-dynamic';

// 기존 홈페이지 '업무 시스템 ▾' 드롭다운의 모듈 그대로
const MODULES: { href: string; name: string; desc: string; external?: boolean }[] = [
  { href: '/minicad/', name: 'MiniCAD', desc: '도면·견적' },
  { href: '/work/#po', name: '발주서', desc: '직원 포털' },
  { href: '/work/#daily', name: '공사일보', desc: '직원 포털' },
  { href: '/work/#invoice', name: '계산서', desc: '직원 포털' },
  { href: '/pms/', name: '공정표', desc: '공정관리 PMS' },
  { href: '/daily/', name: '현장 일보', desc: '단독앱' },
  { href: '/vector/', name: '벡터 변환기', desc: '이미지→SVG' },
  { href: '/editor/', name: '아티팩트 생성기', desc: '비주얼 에디터' },
  { href: '/work/', name: '직원 포털 홈', desc: 'WORK' },
  { href: '/biz/', name: '사업장부', desc: 'BOC BIZ' },
];

const BOC_MODULES: { href: string; name: string; desc: string; minRole?: 'admin' }[] = [
  { href: '/boc', name: 'BOC 대시보드', desc: '마스터 DB 현황' },
  { href: '/boc/cost-items', name: '공정 단가', desc: '670건' },
  { href: '/boc/materials', name: '통합 자재', desc: '2,658건' },
  { href: '/boc/tiles', name: '타일 SKU', desc: '2,550건' },
  { href: '/boc/role-requests', name: '승급 신청 관리', desc: '직원 승인', minRole: 'admin' },
];

export default async function HubPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login?next=%2Fhub');
  const target = netRedirectTarget(profile.role);
  if (target === 'kr') redirect('https://ecorean.kr');
  if (target === 'login') {
    // visitor — 승급 신청 안내
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-md text-center">
          <h1 className="text-lg font-semibold text-slate-900">직원 권한이 필요합니다</h1>
          <p className="mt-2 text-sm text-slate-500">
            {profile.email} 계정은 아직 직원(staff) 권한이 없습니다.
            <br />
            승급 신청 후 관리자 승인을 받아주세요.
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

  const tile =
    'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-500 hover:shadow-md';

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">ECOREAN 업무시스템</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {profile.email} <Badge tone="info">{profile.role}</Badge>
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary">
              로그아웃
            </Button>
          </form>
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          업무 모듈
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MODULES.map((m) => (
            <a key={m.href} href={m.href} className={tile}>
              <p className="font-semibold text-slate-900">{m.name}</p>
              <p className="mt-1 text-xs text-slate-500">{m.desc}</p>
            </a>
          ))}
        </div>

        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
          BOC 마스터 DB
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BOC_MODULES.filter((m) => !m.minRole || hasRole(profile.role, m.minRole)).map((m) => (
            <Link key={m.href} href={m.href} className={tile}>
              <p className="font-semibold text-slate-900">{m.name}</p>
              <p className="mt-1 text-xs text-slate-500">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
