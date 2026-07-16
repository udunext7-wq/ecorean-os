import Link from 'next/link';

/** 서버 컴포넌트용 페이지네이션 — searchParams 기반 링크 이동 */
export function Pagination({
  page,
  pageSize,
  total,
  makeHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  makeHref: (page: number) => string;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const prev = Math.max(1, page - 1);
  const next = Math.min(lastPage, page + 1);
  const linkCls =
    'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-40';

  return (
    <nav className="mt-4 flex items-center justify-between">
      <p className="text-sm text-slate-500">
        총 {total.toLocaleString('ko-KR')}건 · {page}/{lastPage} 페이지
      </p>
      <div className="flex gap-2">
        <Link href={makeHref(prev)} aria-disabled={page <= 1} className={linkCls}>
          이전
        </Link>
        <Link href={makeHref(next)} aria-disabled={page >= lastPage} className={linkCls}>
          다음
        </Link>
      </div>
    </nav>
  );
}
