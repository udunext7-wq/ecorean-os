// 자재 설정 — 자재 직접 추가·CSV 일괄 업로드 + 직접 등록분 목록 (admin 이상)
// 쓰기는 전부 materials_upsert_batch(security definer)가 검증한다 (D-051 승인 원칙)
import Link from 'next/link';
import { getSessionProfile } from '@/core/auth/session';
import { hasRole } from '@/core/auth/roles';
import { createServerSupabase } from '@/core/db/server';
import { PageHeader, Table, THead, Th, Td, Badge } from '@/core/ui';
import { formatKRW } from '@/shared/utils/format';
import { MaterialsUploader } from '../components/MaterialsUploader';

type ManualMaterialRow = {
  mat_id: string;
  name: string;
  brand: string | null;
  unit: string | null;
  unit_price: number;
  spec: string | null;
  source_detail: string | null;
  source_date: string | null;
};

export default async function MaterialsManagePage() {
  const profile = await getSessionProfile();
  const isAdmin = !!profile && hasRole(profile.role, 'admin');

  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('materials')
    .select('mat_id,name,brand,unit,unit_price,spec,source_detail,source_date')
    .eq('source', 'principal_input')
    .order('mat_id')
    .limit(200);
  const rows = (data ?? []) as ManualMaterialRow[];

  return (
    <div>
      <PageHeader
        title="자재 설정"
        description="자재를 직접 추가하거나 CSV로 일괄 업로드합니다. 등록분은 통합 자재 목록에 합산됩니다."
      />
      <p className="mb-4 text-sm">
        <Link href="/boc/materials" className="text-brand-400 hover:underline">
          ← 통합 자재 목록으로
        </Link>
      </p>

      {isAdmin ? (
        <MaterialsUploader />
      ) : (
        <p className="rounded-md border border-stroke bg-panel2 p-4 text-sm text-muted">
          자재 등록은 관리자(admin) 이상만 가능합니다. 목록 열람은 아래에서 가능합니다.
        </p>
      )}

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-faint">
        직접 등록된 자재 <Badge tone="info">{rows.length}건</Badge>
      </h2>
      <Table>
        <THead>
          <tr>
            <Th>ID</Th>
            <Th>자재명</Th>
            <Th>브랜드</Th>
            <Th>단위</Th>
            <Th className="text-right">단가</Th>
            <Th>규격</Th>
            <Th>출처</Th>
          </tr>
        </THead>
        <tbody className="divide-y divide-stroke">
          {rows.map((r) => (
            <tr key={r.mat_id} className="hover:bg-panel2">
              <Td className="font-mono text-xs">{r.mat_id}</Td>
              <Td className="font-medium text-cream">{r.name}</Td>
              <Td>{r.brand ?? '—'}</Td>
              <Td>{r.unit ?? '—'}</Td>
              <Td className="text-right tabular-nums">{formatKRW(r.unit_price)}</Td>
              <Td className="max-w-[220px] truncate text-xs">{r.spec ?? '—'}</Td>
              <Td className="max-w-[200px] truncate text-xs">{r.source_detail ?? '—'}</Td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <Td colSpan={7} className="py-8 text-center text-faint">
                직접 등록된 자재가 아직 없습니다
              </Td>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </div>
  );
}
