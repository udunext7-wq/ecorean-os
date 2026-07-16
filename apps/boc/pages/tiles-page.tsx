// 타일 SKU 목록 (tile_products) — 벤더 실 SKU 2,550건, 읽기 전용
import { createServerSupabase } from '@/core/db/server';
import type { TileProductRow } from '@/core/db/types';
import { PageHeader, Table, THead, Th, Td, Pagination } from '@/core/ui';
import { formatKRW, formatSizeMm } from '@/shared/utils/format';
import { DataStatusBadge } from '../components/DataStatusBadge';
import { SearchForm } from '../components/SearchForm';
import type { ListSearchParams } from './cost-items-page';

const PAGE_SIZE = 25;

export default async function TilesPage({ searchParams }: { searchParams: ListSearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createServerSupabase();
  let query = supabase
    .from('tile_products')
    .select(
      'id, code, tag, name, category, brand, unit, unit_price, size_w_mm, size_h_mm, box_qty, img_thumb_url, data_status',
      { count: 'exact' },
    )
    .order('category')
    .order('code')
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%,tag.ilike.%${q}%,category.ilike.%${q}%`);

  const { data, count, error } = await query;
  const rows = (data ?? []) as TileProductRow[];

  return (
    <div>
      <PageHeader
        title="타일 SKU"
        description="tile_products — 벤더 실 SKU 2,550건 (박스 실공급가·재고·이미지)"
      />
      <SearchForm action="/boc/tiles" placeholder="제품명·코드·계열·카테고리 검색" defaultValue={q} />

      {error ? (
        <p className="text-sm text-danger">조회 오류: {error.message}</p>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>이미지</Th>
                <Th>코드</Th>
                <Th>제품</Th>
                <Th>카테고리</Th>
                <Th>브랜드</Th>
                <Th>규격(mm)</Th>
                <Th className="text-right">공급가</Th>
                <Th>상태</Th>
              </tr>
            </THead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>
                    {r.img_thumb_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.img_thumb_url}
                        alt={r.tag ?? r.name}
                        loading="lazy"
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-300">없음</span>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">{r.code}</Td>
                  <Td className="font-medium text-slate-900">{r.tag || r.name}</Td>
                  <Td>{r.category}</Td>
                  <Td>{r.brand ?? '—'}</Td>
                  <Td className="tabular-nums">{formatSizeMm(r.size_w_mm, r.size_h_mm)}</Td>
                  <Td className="text-right tabular-nums">{formatKRW(r.unit_price)}</Td>
                  <Td>
                    <DataStatusBadge status={r.data_status} />
                  </Td>
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
            makeHref={(p) => `/boc/tiles?q=${encodeURIComponent(q)}&page=${p}`}
          />
        </>
      )}
    </div>
  );
}
