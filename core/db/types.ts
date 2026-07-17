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
  origin_table: 'materials' | 'brands' | 'minicad_material_codes' | 'tile_products';
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
