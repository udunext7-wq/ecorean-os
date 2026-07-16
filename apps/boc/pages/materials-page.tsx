// 통합 자재 목록 (v_all_materials) — 자재 4개 원천 합본, 읽기 전용
import { createServerSupabase } from '@/core/db/server';
import type { AllMaterialRow } from '@/core/db/types';
import { PageHeader, Table, THead, Th, Td, Badge, Pagination } from '@/core/ui';
import { formatKRW } from '@/shared/utils/format';
import { DataStatusBadge } from '../components/DataStatusBadge';
import { SearchForm } from '../components/SearchForm';
import type { ListSearchParams } from './cost-items-page';

const PAGE_SIZE = 25;

const ORIGIN_LABEL: Record<AllMaterialRow['origin_table'], string> = {
  materials: '공정자재',
  brands: '브랜드',
  minicad_material_codes: 'MiniCAD',
  tile_products: '타일SKU',
};

export default async function MaterialsPage({ searchParams }: { searchParams: ListSearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createServerSupabase();
  let query = supabase
    .from('v_all_materials')
    .select('*', { count: 'exact' })
    .order('origin_table')
    .order('item_id')
    .range(from, from + PAGE_SIZE - 1);
  if (q) query = query.or(`name.ilike.%${q}%,item_id.ilike.%${q}%,brand.ilike.%${q}%`);

  const { data, count, error } = await query;
  const rows = (data ?? []) as AllMaterialRow[];

  return (
    <div>
      <PageHeader
        title="통합 자재"
        description="v_all_materials — materials + brands + MiniCAD 코드 + 타일 SKU 합본 (2,658건)"
      />
      <SearchForm action="/boc/materials" placeholder="자재명·ID·브랜드 검색" defaultValue={q} />

      {error ? (
        <p className="text-sm text-danger">조회 오류: {error.message}</p>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>원천</Th>
                <Th>ID</Th>
                <Th>자재명</Th>
                <Th>브랜드</Th>
                <Th>단위</Th>
                <Th className="text-right">단가</Th>
                <Th>상태</Th>
              </tr>
            </THead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={`${r.origin_table}-${r.item_id}`} className="hover:bg-slate-50">
                  <Td>
                    <Badge tone="info">{ORIGIN_LABEL[r.origin_table]}</Badge>
                  </Td>
                  <Td className="font-mono text-xs">{r.item_id}</Td>
                  <Td className="font-medium text-slate-900">{r.name}</Td>
                  <Td>{r.brand ?? '—'}</Td>
                  <Td>{r.unit ?? '—'}</Td>
                  <Td className="text-right tabular-nums">{formatKRW(r.unit_price)}</Td>
                  <Td>
                    <DataStatusBadge status={r.data_status} />
                  </Td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-slate-400">
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
            makeHref={(p) => `/boc/materials?q=${encodeURIComponent(q)}&page=${p}`}
          />
        </>
      )}
    </div>
  );
}
