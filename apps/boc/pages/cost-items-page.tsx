// 공정 단가 목록 (cost_items) — 읽기 전용
import { createServerSupabase } from '@/core/db/server';
import type { CostItemRow } from '@/core/db/types';
import { PageHeader, Table, THead, Th, Td, Badge, Pagination } from '@/core/ui';
import { formatKRW } from '@/shared/utils/format';
import { DataStatusBadge } from '../components/DataStatusBadge';
import { SearchForm } from '../components/SearchForm';

const PAGE_SIZE = 25;

export interface ListSearchParams {
  q?: string;
  page?: string;
}

export default async function CostItemsPage({ searchParams }: { searchParams: ListSearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createServerSupabase();
  let query = supabase
    .from('cost_items')
    .select(
      'id, code, major_category, middle_category, name, unit, labor_cost, material_cost, data_status, is_approved',
      { count: 'exact' },
    )
    .order('major_category')
    .order('code')
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,major_category.ilike.%${q}%`);

  const { data, count, error } = await query;
  const rows = (data ?? []) as CostItemRow[];

  return (
    <div>
      <PageHeader title="공정 단가" description="cost_items — 670건. 단가 수정은 승인 절차 도입 후." />
      <SearchForm action="/boc/cost-items" placeholder="공정명·코드·대분류 검색" defaultValue={q} />

      {error ? (
        <p className="text-sm text-danger">조회 오류: {error.message}</p>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>코드</Th>
                <Th>대분류</Th>
                <Th>공정명</Th>
                <Th>단위</Th>
                <Th className="text-right">노무비</Th>
                <Th className="text-right">자재비</Th>
                <Th>상태</Th>
                <Th>승인</Th>
              </tr>
            </THead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs">{r.code}</Td>
                  <Td>{r.major_category}</Td>
                  <Td className="font-medium text-slate-900">{r.name}</Td>
                  <Td>{r.unit}</Td>
                  <Td className="text-right tabular-nums">{formatKRW(r.labor_cost)}</Td>
                  <Td className="text-right tabular-nums">{formatKRW(r.material_cost)}</Td>
                  <Td>
                    <DataStatusBadge status={r.data_status} />
                  </Td>
                  <Td>{r.is_approved ? <Badge tone="ok">승인</Badge> : <Badge>미승인</Badge>}</Td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={8} className="py-8 text-center text-slate-400">
                    결과 없음
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={count ?? 0}
            makeHref={(p) => `/boc/cost-items?q=${encodeURIComponent(q)}&page=${p}`}
          />
        </>
      )}
    </div>
  );
}
