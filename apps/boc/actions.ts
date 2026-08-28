'use server';

// 승급 신청 결정 — DB의 decide_role_request(security definer)가 권한을 검증한다
// (admin 이상 + 승인자 레벨 > 요청 역할. 클라이언트 신뢰하지 않음)
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

// 임시 비밀번호 즉시 발급 — DB의 admin_reset_password(security definer, admin+ 검증)가 권한 검증.
// 배경: Supabase 기본 SMTP 시간당 2건 제한으로 재설정 메일이 바로 안 감 (대표 지시 2026-08-24)
const RESET_ERROR_MSG: Record<string, string> = {
  NOT_AUTHORIZED: '관리자(admin) 이상만 발급할 수 있습니다',
  PASSWORD_TOO_SHORT: '비밀번호는 6자 이상이어야 합니다',
  USER_NOT_FOUND: '해당 이메일의 회원이 없습니다',
  NEEDS_HIGHER_APPROVER: '동급 이상 관리자의 비밀번호는 변경할 수 없습니다 (상위 관리자 필요)',
};

export async function resetUserPassword(
  targetEmail: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!targetEmail.trim()) return { ok: false, error: '이메일이 없습니다' };
  const supabase = createServerSupabase();
  const { error } = await supabase.rpc('admin_reset_password', {
    target_email: targetEmail.trim(),
    new_password: newPassword,
  });
  if (error) {
    const code = Object.keys(RESET_ERROR_MSG).find((k) => error.message.includes(k));
    return { ok: false, error: code ? RESET_ERROR_MSG[code] : `발급 실패: ${error.message}` };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// 거래처(협력업체) — 대표 지시 2026-08-28
// 쓰기는 전부 security definer 함수 경유 (헌법 3조: 마스터 DB 직접 쓰기 금지).
// 이 파일은 권한을 판단하지 않는다 — DB 함수가 role_level 로 검증한다.
// ─────────────────────────────────────────────────────────────
const PARTNER_ERROR_MSG: Record<string, string> = {
  NOT_AUTHORIZED: '직원(staff) 이상만 거래처를 등록·수정할 수 있습니다',
  NAME_REQUIRED: '상호를 입력하세요',
  TITLE_REQUIRED: '계약명을 입력하세요',
  ITEM_NAME_REQUIRED: '품목명을 입력하세요',
  PARTNER_REQUIRED: '거래처가 지정되지 않았습니다',
  PARTNER_NOT_FOUND: '거래처를 찾을 수 없습니다',
  CONTRACT_NOT_FOUND: '계약을 찾을 수 없습니다',
  PRICE_NOT_FOUND: '단가 항목을 찾을 수 없습니다',
  UNKNOWN_TRADE_GROUP: '등록되지 않은 공정군입니다',
  PRICE_REQUIRED_FOR_APPROVAL: '금액이 없는 단가는 승인할 수 없습니다 (헌법 9조: 추정 금지)',
  INVALID_INPUT: '입력값이 올바르지 않습니다',
};

/** DB 함수가 올린 예외 코드를 사람이 읽는 문구로 */
function partnerError(message: string): Error {
  const code = Object.keys(PARTNER_ERROR_MSG).find((k) => message.includes(k));
  return new Error(code ? PARTNER_ERROR_MSG[code] : `처리 실패: ${message}`);
}

const str = (fd: FormData, key: string): string => String(fd.get(key) ?? '').trim();
const strOrNull = (fd: FormData, key: string): string | null => str(fd, key) || null;

/** 거래처 등록·수정 — partner_upsert(staff+) */
export async function savePartner(formData: FormData): Promise<void> {
  const payload = {
    id: strOrNull(formData, 'id'),
    name: str(formData, 'name'),
    // 겸업 허용 — 체크박스 다중 선택 (대표 결정 1: 한 명부)
    kinds: formData.getAll('kinds').map(String).filter(Boolean),
    trade_groups: formData.getAll('trade_groups').map(String).filter(Boolean),
    biz_reg_no: strOrNull(formData, 'biz_reg_no'),
    rep_name: strOrNull(formData, 'rep_name'),
    phone: strOrNull(formData, 'phone'),
    email: strOrNull(formData, 'email'),
    zipcode: strOrNull(formData, 'zipcode'),
    address: strOrNull(formData, 'address'),
    bank_name: strOrNull(formData, 'bank_name'),
    bank_account: strOrNull(formData, 'bank_account'),
    bank_holder: strOrNull(formData, 'bank_holder'),
    grade: strOrNull(formData, 'grade'),
    status: strOrNull(formData, 'status'),
    memo: strOrNull(formData, 'memo'),
  };

  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc('partner_upsert', { p: payload });
  if (error) throw partnerError(error.message);

  revalidatePath('/boc/partners');
  redirect(`/boc/partners?sel=${data}&tab=info`);
}

/** 계약사항 등록·수정 — partner_contract_upsert(staff+) */
export async function savePartnerContract(formData: FormData): Promise<void> {
  const partnerId = str(formData, 'partner_id');
  const payload = {
    id: strOrNull(formData, 'id'),
    partner_id: partnerId,
    contract_no: strOrNull(formData, 'contract_no'),
    title: str(formData, 'title'),
    start_date: strOrNull(formData, 'start_date'),
    end_date: strOrNull(formData, 'end_date'),
    payment_terms: strOrNull(formData, 'payment_terms'),
    payment_closing_day: strOrNull(formData, 'payment_closing_day'),
    payment_day: strOrNull(formData, 'payment_day'),
    payment_cycle: strOrNull(formData, 'payment_cycle'),
    retention_rate: strOrNull(formData, 'retention_rate'),
    warranty_months: strOrNull(formData, 'warranty_months'),
    safety_docs_expire_at: strOrNull(formData, 'safety_docs_expire_at'),
    insurance_4major: formData.get('insurance_4major') === 'on',
    insurance_expire_at: strOrNull(formData, 'insurance_expire_at'),
    status: strOrNull(formData, 'status'),
    memo: strOrNull(formData, 'memo'),
  };

  const supabase = createServerSupabase();
  const { error } = await supabase.rpc('partner_contract_upsert', { p: payload });
  if (error) throw partnerError(error.message);

  revalidatePath('/boc/partners');
  redirect(`/boc/partners?sel=${partnerId}&tab=contract`);
}

/**
 * 업체별 단가 제안 — partner_price_propose(staff+).
 * 항상 미승인으로 들어간다. 승인은 decidePartnerPrice(admin+) 만이 한다.
 */
export async function savePartnerPrice(formData: FormData): Promise<void> {
  const partnerId = str(formData, 'partner_id');
  const payload = {
    id: strOrNull(formData, 'id'),
    partner_id: partnerId,
    contract_id: strOrNull(formData, 'contract_id'),
    cost_item_id: strOrNull(formData, 'cost_item_id'),
    subcontractor_id: strOrNull(formData, 'subcontractor_id'),
    trade_group: strOrNull(formData, 'trade_group'),
    item_name: str(formData, 'item_name'),
    unit: strOrNull(formData, 'unit'),
    contract_price: strOrNull(formData, 'contract_price'),
    effective_from: strOrNull(formData, 'effective_from'),
    effective_to: strOrNull(formData, 'effective_to'),
    notes: strOrNull(formData, 'notes'),
  };

  const supabase = createServerSupabase();
  const { error } = await supabase.rpc('partner_price_propose', { p: payload });
  if (error) throw partnerError(error.message);

  revalidatePath('/boc/partners');
  redirect(`/boc/partners?sel=${partnerId}&tab=price`);
}

/** 단가 승인·반려 — partner_price_decide(admin+). 헌법 9조 게이트 */
export async function decidePartnerPrice(formData: FormData): Promise<void> {
  const priceId = str(formData, 'price_id');
  const partnerId = str(formData, 'partner_id');
  if (!priceId) return;

  const supabase = createServerSupabase();
  const { error } = await supabase.rpc('partner_price_decide', {
    p_id: priceId,
    approve: formData.get('decision') === 'approve',
  });
  if (error) throw partnerError(error.message);

  revalidatePath('/boc/partners');
  redirect(`/boc/partners?sel=${partnerId}&tab=price`);
}
