// apps/order-form/pack.manifest.ts
// 발주서 앱 팩 매니페스트 — 규약 준수 본보기
// 새 앱 팩을 만들 때 이 형식을 따른다. (pack-contract.md 2.1)

import type { AppPackManifest } from '../../shared/types/pack';

export const manifest: AppPackManifest = {
  id: 'order-form',
  name: '발주서',
  icon: 'file-text',
  version: '0.1.0',

  zone: 'net',
  roles: ['staff', 'admin', 'master'],

  engines: ['procurement'],
  tables: {
    read: ['projects', 'estimate_items', 'vendors', 'vendor_prices'],
    write: ['purchase_orders', 'order_items'],
  },

  routes: ['/admin/orders', '/admin/orders/new'],
  menu: {
    area: 'admin',
    group: '현장',
    order: 3,
  },

  hooks: ['onEstimateApproved'], // 견적 승인 시 발주서 자동 생성 트리거
};
