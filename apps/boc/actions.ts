'use server';

// 승급 신청 결정 — DB의 decide_role_request(security definer)가 권한을 검증한다
// (admin 이상 + 승인자 레벨 > 요청 역할. 클라이언트 신뢰하지 않음)
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/core/db/server';

export async function decideRoleRequest(formData: FormData): Promise<void> {
  const reqId = String(formData.get('id') ?? '');
  const approve = formData.get('decision') === 'approve';
  if (!reqId) return;

  const supabase = createServerSupabase();
  const { error } = await supabase.rpc('decide_role_request', {
    req_id: reqId,
    approve,
  });
  if (error) throw new Error(`결정 실패: ${error.message}`);
  revalidatePath('/boc/role-requests');
}

// 자재 일괄 등록 — DB의 materials_upsert_batch(security definer, admin+)가 권한 검증 (D-051)
export async function uploadMaterials(
  rows: Record<string, string>[],
  sourceDetail: string | null,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: '등록할 자재가 없습니다' };
  if (rows.length > 500) return { ok: false, error: '한 번에 최대 500건까지 가능합니다' };

  const clean = rows
    .map((r) => ({
      name: String(r.name ?? '').slice(0, 200),
      brand: String(r.brand ?? '').slice(0, 100),
      unit: String(r.unit ?? '').slice(0, 30),
      unit_price: String(r.unit_price ?? '').replace(/[^\d]/g, ''),
      spec: String(r.spec ?? '').slice(0, 300),
      notes: String(r.notes ?? '').slice(0, 500),
      data_status: 'OFFICIAL',
    }))
    .filter((r) => r.name.trim().length > 0);
  if (clean.length === 0) return { ok: false, error: '자재명이 있는 행이 없습니다' };

  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc('materials_upsert_batch', {
    p_rows: clean,
    p_source_detail: sourceDetail?.slice(0, 200) ?? null,
  });
  if (error) {
    const msg = error.message.includes('NOT_AUTHORIZED')
      ? '관리자(admin) 이상만 자재를 등록할 수 있습니다'
      : error.message;
    return { ok: false, error: msg };
  }
  revalidatePath('/boc/materials');
  revalidatePath('/boc/materials/manage');
  return { ok: true, count: Number(data ?? clean.length) };
}

// MiniCAD 단가 제안 승인/거절 — DB의 minicad_decide_price(admin+)가 권한 검증.
// 승인 = price_override 확정 + is_approved → v_minicad_price_table 로 전사 노출 (D-051 승인 절차)
export async function decideMinicadPrice(formData: FormData): Promise<void> {
  const priceKey = String(formData.get('price_key') ?? '');
  const approve = formData.get('decision') === 'approve';
  if (!priceKey) return;

  const supabase = createServerSupabase();
  const { error } = await supabase.rpc('minicad_decide_price', {
    p_key: priceKey,
    approve,
  });
  if (error) throw new Error(`결정 실패: ${error.message}`);
  revalidatePath('/boc/minicad-prices');
}
