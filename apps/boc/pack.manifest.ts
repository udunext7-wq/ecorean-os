// apps/boc/pack.manifest.ts — 관리자 BOC 앱 팩 (pack-contract 2.1)
import type { AppPackManifest } from '@/shared/types/pack';

export const manifest: AppPackManifest = {
  id: 'boc',
  name: 'BOC 관리',
  icon: 'layout-dashboard',
  version: '0.2.0',

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
    ],
    // 마스터 DB 쓰기는 여전히 없음 (헌법 3조). 승급 결정은 DB 함수
    // decide_role_request(security definer) 경유 — 함수가 권한 검증.
    write: ['role_requests', 'profiles'],
  },

  routes: ['/boc', '/boc/cost-items', '/boc/materials', '/boc/tiles', '/boc/role-requests'],
  menu: {
    area: 'admin',
    group: '마스터 DB',
    order: 1,
  },
};
