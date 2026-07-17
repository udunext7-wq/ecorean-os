// pack-contract 규약 검증 — boc 매니페스트
import { describe, it, expect } from 'vitest';
import { manifest } from '../pack.manifest';
import { ROLE_LEVEL } from '@/core/auth/roles';

describe('boc pack.manifest (pack-contract 2.1)', () => {
  it('id는 폴더명과 일치하는 kebab-case', () => {
    expect(manifest.id).toBe('boc');
  });
  it('zone은 net — 내부 전용 (D-020, 고객용/내부용 혼합 금지: 헌법 5조)', () => {
    expect(manifest.zone).toBe('net');
  });
  it('roles는 staff 이상만 (D-021)', () => {
    expect(manifest.roles.length).toBeGreaterThan(0);
    for (const role of manifest.roles) {
      expect(ROLE_LEVEL[role]).toBeGreaterThanOrEqual(ROLE_LEVEL.staff);
    }
  });
  it('마스터 DB 테이블은 write 선언 금지 (헌법 3조: Master DB 무승인 업데이트 금지)', () => {
    const masterTables = ['cost_items', 'materials', 'brands', 'labor_roles', 'tile_products'];
    for (const t of masterTables) {
      expect(manifest.tables.write).not.toContain(t);
    }
    // 승급 결정은 security definer 함수 경유만 허용
    expect(manifest.tables.write).toEqual(['role_requests', 'profiles']);
  });
  it('read 테이블에 화면이 실제 조회하는 테이블이 선언됨 (준수사항 5)', () => {
    for (const t of ['cost_items', 'tile_products', 'v_all_materials', 'profiles']) {
      expect(manifest.tables.read).toContain(t);
    }
  });
  it('routes와 menu가 선언됨', () => {
    expect(manifest.routes.length).toBeGreaterThan(0);
    expect(manifest.menu.area).toBe('admin');
  });
});
