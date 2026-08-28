// apps/boc/pack.manifest.ts — 관리자 BOC 앱 팩 (pack-contract 2.1)
import type { AppPackManifest } from '@/shared/types/pack';

export const manifest: AppPackManifest = {
  id: 'boc',
  name: 'BOC 관리',
  icon: 'layout-dashboard',
  version: '0.3.0',

  zone: 'net',                          // ecorean.net 내부 전용 (D-020)
  roles: ['staff', 'admin', 'master'],  // 직원 이상 (D-021)

  // v0.1은 마스터 DB 조회 전용 — 아직 엔진 호출 없음.
  // 견적·발주 기능 추가 시 engines/estimate·procurement 를 여기에 선언하고 호출한다 (D-030).
  engines: [],

  tables: {
    read: [
      'profiles',
      'cost_items',
      'materials',
      'brands',
      'labor_roles',
      'tile_products',
      'v_all_materials', // 통합 자재 뷰
      'role_requests', // 승급 신청 (admin+ 목록)
      'minicad_price_keys', // MiniCAD 단가 제안·승인 현황
      'v_minicad_price_table', // MiniCAD 승인 단가 뷰
      'minicad_config',
      // 거래처(협력업체) — 2026-08-28
      'partners',
      'partner_contracts',
      'partner_prices',
      'v_partner_overview', // 목록·요약 (기존 work_* 집계)
      'v_partner_price_effective', // 승인된 유효단가
      'process_groups', // 작업내용의 축 = 공정군 C01~C16
      // 스케줄·거래이력 탭이 거래처 기준으로 읽기만 하는 운영 테이블
      'work_schedule_items',
      'work_purchase_orders',
      'work_invoices',
      'work_sites',
    ],
    // 마스터 DB 직접 쓰기는 여전히 없음 (헌법 3조). 모든 쓰기는 security definer
    // 함수(decide_role_request / minicad_decide_price / partner_upsert /
    // partner_contract_upsert / partner_price_propose / partner_price_decide) 경유
    // — 함수가 role_level 로 권한을 검증한다.
    write: [
      'role_requests',
      'profiles',
      'minicad_price_keys',
      'partners',
      'partner_contracts',
      'partner_prices',
    ],
  },

  routes: [
    '/boc',
    '/boc/cost-items',
    '/boc/materials',
    '/boc/tiles',
    '/boc/role-requests',
    '/boc/minicad-prices',
    '/boc/partners',
  ],
  menu: {
    area: 'admin',
    group: '마스터 DB',
    order: 1,
  },
};
