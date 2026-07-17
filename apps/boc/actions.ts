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
