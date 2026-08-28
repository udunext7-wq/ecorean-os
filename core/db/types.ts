// core/db/types.ts — 트랜잭션 DB 행 타입 (supabase/migrations 스키마와 1:1)
// 전체 생성 타입 도입 전까지 boc v0.1이 사용하는 컬럼만 정의한다.
import type { Role } from '@/shared/types/pack';
import type { DataStatus } from '@/shared/constants/data-status';

/** public.profiles — 실 스키마 기준 (7/15 선생성 + 20260717 마이그레이션) */
export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

/** public.role_requests (20260717000003_role_requests.sql) */
export interface RoleRequestRow {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  requested_role: 'business_customer' | 'staff' | 'admin';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

/** public.minicad_price_keys (20260712000006 + 20260717000004) */
export interface MinicadPriceKeyRow {
  id: string;
  tenant_id: string;
  price_key: string;
  cost_item_code: string | null;
  material_id: string | null;
  price_override: number | null;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  proposed_price: number | null;
  proposed_by: string | null;
  proposed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** public.cost_items (20260712000002_core_masters.sql) */
export interface CostItemRow {
  id: string;
  tenant_id: string;
  code: string;
  major_category: string;
  middle_category: string | null;
  name: string;
  unit: string;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  accessory_cost: number;
  data_status: DataStatus;
  is_approved: boolean;
  origin_dataset: string;
  notes: string | null;
}

/** public.tile_products (20260712000010_tile_products.sql) */
export interface TileProductRow {
  id: string;
  tenant_id: string;
  code: string;
  tag: string | null;
  name: string;
  category: string;
  section: string | null;
  brand: string | null;
  unit: string | null;
  unit_price: number | null;
  size_w_mm: number | null;
  size_h_mm: number | null;
  box_qty: number | null;
  area_per_box_m2: number | null;
  spec_raw: string | null;
  img_thumb_url: string | null;
  data_status: DataStatus;
  is_approved: boolean;
}

/** public.v_all_materials (20260712000011_all_materials_view_with_tiles.sql) */
export interface AllMaterialRow {
  tenant_id: string;
  origin_table: 'materials' | 'brands' | 'minicad_material_codes' | 'tile_products' | 'lx_products';
  item_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string | null;
  unit_price: number | null;
  retail_price: number | null;
  process_code: string | null;
  spec: string | null;
  img_url: string | null;
  lead_days: number | null;
  data_status: DataStatus;
  is_approved: boolean;
  origin_dataset: string;
}

// ─────────────────────────────────────────────────────────────
// 거래처(협력업체) — 20260828000001~3 (대표 지시 2026-08-28)
// 결정: 시공·자재·장비·운반 한 명부 / 표준·계약단가 둘 다 / 직영 미포함
// ─────────────────────────────────────────────────────────────

/** 거래처 구분 — 한 업체가 여러 개를 가질 수 있다(겸업) */
export type PartnerKind = '시공' | '자재' | '장비' | '운반';
export const PARTNER_KINDS: readonly PartnerKind[] = ['시공', '자재', '장비', '운반'];

export type PartnerStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type PaymentCycle = 'MONTHLY' | 'PER_ORDER' | 'MILESTONE';

/** public.process_groups — 공정군 C01~C16 (거래처 작업내용의 축) */
export interface ProcessGroupRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  color: string | null;
}

/** public.partners */
export interface PartnerRow {
  id: string;
  tenant_id: string;
  partner_code: string;
  name: string;
  kinds: PartnerKind[];
  trade_groups: string[]; // process_groups.code
  biz_reg_no: string | null;
  rep_name: string | null;
  phone: string | null;
  email: string | null;
  zipcode: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  grade: string | null;
  status: PartnerStatus;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

/** public.v_partner_overview — 목록·요약 (기존 work_* 에서 집계, 사본 아님) */
export interface PartnerOverviewRow {
  partner_id: string;
  tenant_id: string;
  partner_code: string;
  name: string;
  kinds: PartnerKind[];
  trade_groups: string[];
  grade: string | null;
  status: PartnerStatus;
  phone: string | null;
  rep_name: string | null;
  biz_reg_no: string | null;
  active_contracts: number;
  approved_prices: number;
  pending_prices: number;
  po_count: number;
  po_amount: number;
  invoice_amount: number;
  schedule_count: number;
  next_start_date: string | null;
  safety_docs_expire_at: string | null;
  created_at: string;
  updated_at: string;
}

/** public.partner_contracts — 계약사항(기간 조건). 발주=건별과 분리 */
export interface PartnerContractRow {
  id: string;
  partner_id: string;
  contract_no: string | null;
  title: string;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  payment_closing_day: number | null;
  payment_day: number | null;
  payment_cycle: PaymentCycle | null;
  retention_rate: number | null;
  warranty_months: number | null;
  safety_docs_expire_at: string | null;
  insurance_4major: boolean;
  insurance_expire_at: string | null;
  status: ContractStatus;
  file_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

/** public.partner_prices — 표준 참조 + 계약단가. 승인 전 유효단가 뷰 제외(헌법 9조) */
export interface PartnerPriceRow {
  id: string;
  partner_id: string;
  contract_id: string | null;
  cost_item_id: string | null;
  subcontractor_id: string | null;
  trade_group: string | null;
  item_name: string;
  unit: string | null;
  contract_price: number | null;
  std_price_snapshot: number | null;
  effective_from: string;
  effective_to: string | null;
  data_status: DataStatus;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  notes: string | null;
}

/** 이 업체가 잡힌 공정 (work_schedule_items + work_sites) — 스케줄 탭 */
export interface PartnerScheduleRow {
  id: string;
  site_id: string | null;
  process_name: string | null;
  process_code: string | null;
  start_date: string | null;
  end_date: string | null;
  progress: number | null;
  work_sites: { name: string | null } | null;
}
