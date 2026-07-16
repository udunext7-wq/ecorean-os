// apps/boc/page.tsx — BOC 대시보드 (마스터 DB 현황, 읽기 전용)
import { createServerSupabase } from '@/core/db/server';
import { PageHeader, StatCard, Card } from '@/core/ui';

async function countOf(
  supabase: ReturnType<typeof createServerSupabase>,
  table: string,
  filter?: (q: any) => any,
): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count } = await query;
  return count ?? 0;
}

export default async function BocDashboardPage() {
  const supabase = createServerSupabase();

  const [costItems, tiles, allMaterials, laborRoles, tilesNoPrice, costNeedsResearch] =
    await Promise.all([
      countOf(supabase, 'cost_items'),
      countOf(supabase, 'tile_products'),
      countOf(supabase, 'v_all_materials'),
      countOf(supabase, 'labor_roles'),
      countOf(supabase, 'tile_products', (q) => q.is('unit_price', null)),
      countOf(supabase, 'cost_items', (q) => q.eq('data_status', 'NEEDS_RESEARCH')),
    ]);

  return (
    <div>
      <PageHeader
        title="BOC 대시보드"
        description="마스터 DB 적재 현황 — 읽기 전용 v0.1. 단가 수정·승인 기능은 승인 절차와 함께 추가됩니다."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="공정 단가 (cost_items)" value={costItems.toLocaleString('ko-KR')} />
        <StatCard label="타일 SKU (tile_products)" value={tiles.toLocaleString('ko-KR')} />
        <StatCard label="통합 자재 (v_all_materials)" value={allMaterials.toLocaleString('ko-KR')} />
        <StatCard label="직종 노임 (labor_roles)" value={laborRoles.toLocaleString('ko-KR')} />
      </div>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">데이터 이슈 (헌법 9조: 추정 금지 — 표시만)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>
            단가 미확보 타일 SKU: <b>{tilesNoPrice.toLocaleString('ko-KR')}건</b> (unit_price=null →
            NEEDS_RESEARCH)
          </li>
          <li>
            조사 필요 공정 단가: <b>{costNeedsResearch.toLocaleString('ko-KR')}건</b>
          </li>
          <li>단가 충돌 2건(PRE_WS·WIN_SCR)은 v2.2 값 채택 — 실값 확인 필요 (supabase/README.md)</li>
        </ul>
      </Card>
    </div>
  );
}
