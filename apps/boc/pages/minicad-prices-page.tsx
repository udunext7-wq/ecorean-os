// MiniCAD 단가 승인 (admin 이상) — 직원이 MiniCAD에서 제안한 단가를 승인하면
// v_minicad_price_table 을 통해 전 직원의 MiniCAD 공식 단가가 된다 (헌법 3조·D-051)
import { createServerSupabase } from '@/core/db/server';
import type { MinicadPriceKeyRow } from '@/core/db/types';
import { PageHeader, Table, THead, Th, Td, Badge, Button } from '@/core/ui';
import { formatKRW } from '@/shared/utils/format';
import { decideMinicadPrice } from '../actions';

export default async function MinicadPricesPage() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('minicad_price_keys')
    .select('*')
    .order('proposed_at', { ascending: false, nullsFirst: false })
    .order('price_key')
    .limit(300);
  const rows = (data ?? []) as MinicadPriceKeyRow[];
  const pending = rows.filter((r) => r.proposed_price != null);
  const decided = rows.filter((r) => r.proposed_price == null);

  return (
    <div>
      <PageHeader
        title="MiniCAD 단가 승인"
        description="직원이 MiniCAD에서 입력한 단가 제안. 승인하면 전 직원의 공식 단가로 반영됩니다 (미승인 단가는 노출되지 않음 — 헌법 3조)."
      />

      {error ? (
        <p className="text-sm text-danger">조회 오류: {error.message}</p>
      ) : (
        <>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            승인 대기 <Badge tone="warn">{pending.length}건</Badge>
          </h2>
          <Table>
            <THead>
              <tr>
                <Th>priceKey</Th>
                <Th className="text-right">제안 단가</Th>
                <Th>제안자</Th>
                <Th>제안일</Th>
                <Th className="text-right">현재 승인 단가</Th>
                <Th>처리</Th>
              </tr>
            </THead>
            <tbody className="divide-y divide-slate-100">
              {pending.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs">{r.price_key}</Td>
                  <Td className="text-right font-medium tabular-nums text-slate-900">
                    {formatKRW(r.proposed_price)}
                  </Td>
                  <Td>{r.proposed_by ?? '—'}</Td>
                  <Td className="whitespace-nowrap text-xs">{r.proposed_at?.slice(0, 16).replace('T', ' ')}</Td>
                  <Td className="text-right tabular-nums">
                    {r.is_approved ? formatKRW(r.price_override) : '—'}
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <form action={decideMinicadPrice}>
                        <input type="hidden" name="price_key" value={r.price_key} />
                        <input type="hidden" name="decision" value="approve" />
                        <Button type="submit" className="px-3 py-1 text-xs">
                          승인
                        </Button>
                      </form>
                      <form action={decideMinicadPrice}>
                        <input type="hidden" name="price_key" value={r.price_key} />
                        <input type="hidden" name="decision" value="reject" />
                        <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
                          거절
                        </Button>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
              {pending.length === 0 ? (
                <tr>
                  <Td colSpan={6} className="py-6 text-center text-slate-400">
                    대기 중인 제안이 없습니다
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>

          <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
            등록된 priceKey <Badge>{decided.length}건</Badge>
          </h2>
          <Table>
            <THead>
              <tr>
                <Th>priceKey</Th>
                <Th className="text-right">승인 단가</Th>
                <Th>상태</Th>
                <Th>승인자</Th>
                <Th>매핑</Th>
              </tr>
            </THead>
            <tbody className="divide-y divide-slate-100">
              {decided.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs">{r.price_key}</Td>
                  <Td className="text-right tabular-nums">{formatKRW(r.price_override)}</Td>
                  <Td>
                    {r.is_approved ? <Badge tone="ok">승인</Badge> : <Badge tone="warn">미승인</Badge>}
                  </Td>
                  <Td className="text-xs">{r.approved_by ?? '—'}</Td>
                  <Td className="font-mono text-xs">
                    {r.cost_item_code ?? r.material_id ?? '직접 단가'}
                  </Td>
                </tr>
              ))}
              {decided.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-slate-400">
                    아직 등록된 priceKey가 없습니다 — MiniCAD에서 단가를 입력하면 여기에 제안이 쌓입니다
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}
