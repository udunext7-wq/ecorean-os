// /hub — 직원 포털 홈. 모든 업무 모듈을 토글 트리로 진입한다 (대표 지시 2026-08-24).
// 접근: staff 이상 (D-021). 섹션 열림 상태는 브라우저에 저장.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole, netRedirectTarget } from '@/core/auth/roles';
import { Badge, Button, Card } from '@/core/ui';
import { HubFan, type TreeSection } from './HubFan';

export const dynamic = 'force-dynamic';

// 포털 섹션 — 일상 업무(포털·장부)를 최상단에 (2026-08-24 대표 지시로 트리 개편)
type HubItem = { href: string; name: string; desc: string; minRole?: 'admin' };
type HubSection = { title: string; desc: string; items: HubItem[] };

const SECTIONS: HubSection[] = [
  {
    title: '직원 포털 · 장부',
    desc: '발주 · 일보 · 계산서 — 매일 쓰는 업무',
    items: [
      { href: '/work/#po', name: '발주서', desc: '직원 포털' },
      { href: '/work/#daily', name: '공사일보', desc: '현장 대시보드·일보 작성' },
      { href: '/work/#invoice', name: '계산서', desc: '직원 포털' },
      { href: '/biz/', name: '사업장부', desc: 'BOC BIZ' },
    ],
  },
  {
    title: '설계 · 견적',
    desc: '도면에서 견적까지',
    items: [
      { href: '/minicad/', name: 'MiniCAD', desc: '도면·견적' },
      { href: '/catalog/plans/', name: '평면도 라이브러리', desc: '주거 평면도 DB → MiniCAD 밑그림' },
      { href: '/estimate/', name: '자동 견적', desc: '통합견적 OS · MiniCAD 도면 연동' },
      { href: '/estform/', name: '견적서 양식', desc: '주거·상업 반자동' },
      { href: '/pms/', name: '공정표', desc: '공정관리 PMS' },
      { href: '/editor/', name: '아티팩트 생성기', desc: '비주얼 에디터' },
      { href: '/vector/', name: '벡터 변환기', desc: '이미지→SVG' },
    ],
  },
  {
    title: '자재 · 스펙북',
    desc: '도감 열람과 사양서 발행',
    items: [
      { href: '/catalog/usong/', name: '유송타일 도감', desc: '단가 포함 · 직원용' },
      { href: '/catalog/lx/', name: 'LX Z:IN 도감', desc: '단가 포함 · 직원용' },
      { href: '/catalog/specbook/', name: '스펙북 발행', desc: '장바구니 → 현장 사양서' },
      { href: '/materials/', name: '자재 라이브러리', desc: '자재 열람' },
    ],
  },
  {
    title: 'BOC 마스터 DB',
    desc: '단가·자재 기준 데이터와 관리',
    items: [
      { href: '/boc', name: 'BOC 대시보드', desc: '마스터 DB 현황' },
      { href: '/boc/cost-items', name: '공정 단가', desc: '670건' },
      { href: '/boc/materials', name: '통합 자재', desc: '5,248건 · 타일 포함' },
      { href: '/boc/materials/manage', name: '자재 설정', desc: '추가·CSV 업로드', minRole: 'admin' },
      { href: '/boc/minicad-prices', name: 'MiniCAD 단가 승인', desc: '제안 단가 확정', minRole: 'admin' },
      { href: '/boc/role-requests', name: '승급 신청 관리', desc: '직원 승인', minRole: 'admin' },
      { href: '/boc/users', name: '회원 관리', desc: '임시 비밀번호 발급', minRole: 'admin' },
    ],
  },
];

export default async function HubPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login?next=%2Fhub');
  const target = netRedirectTarget(profile.role);
  if (target === 'kr') redirect('https://ecorean.kr');
  if (target === 'login') {
    // visitor — 승급 신청 안내
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink p-4">
        <Card className="w-full max-w-md text-center">
          <h1 className="text-lg font-semibold text-cream">직원 권한이 필요합니다</h1>
          <p className="mt-2 text-sm text-muted">
            {profile.email} 계정은 아직 직원(staff) 권한이 없습니다.
            <br />
            승급 신청 후 관리자 승인을 받아주세요.
          </p>
          <Link
            href="/request-role"
            className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink hover:bg-brand-400"
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

  // 역할 필터 후 트리 데이터로 변환 (admin 항목은 하위 가지로 구분)
  const treeSections: TreeSection[] = SECTIONS.map((section) => ({
    title: section.title,
    desc: section.desc,
    items: section.items
      .filter((m) => !m.minRole || hasRole(profile.role, m.minRole))
      .map((m) => ({ href: m.href, name: m.name, desc: m.desc, admin: m.minRole === 'admin' })),
  })).filter((s) => s.items.length > 0);

  return (
    <main className="hubc-scene min-h-screen p-6">
      <div className="hubc-bk tl" aria-hidden />
      <div className="hubc-bk tr" aria-hidden />
      <div className="hubc-bk bl" aria-hidden />
      <div className="hubc-bk br" aria-hidden />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-3 flex items-center justify-end gap-3 text-sm">
          <span className="text-muted">
            {profile.email} <Badge tone="info">{profile.role}</Badge>
          </span>
          <Link
            href="/update-password"
            className="rounded-full border border-[#00EAFF]/25 px-4 py-1.5 text-xs font-medium text-[#9fd9e4] transition-colors hover:border-[#00EAFF]/60 hover:text-[#dff8fd]"
          >
            비밀번호 변경
          </Link>
          <form action="/auth/signout" method="post">
            <Button
              type="submit"
              variant="secondary"
              className="rounded-full border-[#E8C99B]/30 bg-transparent px-4 py-1.5 text-xs text-[#e8c99b] hover:bg-[#E8C99B]/10"
            >
              로그아웃
            </Button>
          </form>
        </div>

        <HubFan sections={treeSections} />
      </div>
    </main>
  );
}
