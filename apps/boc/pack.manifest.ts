// apps/boc/pack.manifest.ts — 관리자 BOC 앱 팩 (pack-contract 2.1)
import type { AppPackManifest } from '@/shared/types/pack';

export const manifest: AppPackManifest = {
  id: 'boc',
  name: 'BOC 관리',
  icon: 'layout-dashboard',
  version: '0.1.0',

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
    ],
    write: [], // v0.1 읽기 전용. 쓰기(승인·단가 수정)는 헌법 3조에 따라 승인 절차와 함께 추가
  },

  routes: ['/', '/boc/cost-items', '/boc/materials', '/boc/tiles'],
  menu: {
    area: 'admin',
    group: '마스터 DB',
    order: 1,
  },
};
