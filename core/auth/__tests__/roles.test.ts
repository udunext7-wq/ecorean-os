// D-021 5역할 접근 제어 테스트
import { describe, it, expect } from 'vitest';
import { ROLE_LEVEL, hasRole, canAccessZone, netRedirectTarget } from '../roles';

describe('ROLE_LEVEL (D-021 서열)', () => {
  it('visitor(1) < business_customer(2) < staff(3) < admin(4) < master(5)', () => {
    expect(ROLE_LEVEL.visitor).toBe(1);
    expect(ROLE_LEVEL.business_customer).toBe(2);
    expect(ROLE_LEVEL.staff).toBe(3);
    expect(ROLE_LEVEL.admin).toBe(4);
    expect(ROLE_LEVEL.master).toBe(5);
  });
});

describe('hasRole', () => {
  it('같은 역할은 통과', () => {
    expect(hasRole('staff', 'staff')).toBe(true);
  });
  it('상위 역할은 하위 요구를 충족', () => {
    expect(hasRole('master', 'staff')).toBe(true);
    expect(hasRole('admin', 'staff')).toBe(true);
  });
  it('하위 역할은 상위 요구를 충족하지 못함', () => {
    expect(hasRole('staff', 'admin')).toBe(false);
    expect(hasRole('business_customer', 'staff')).toBe(false);
  });
  it('미로그인(null/undefined)은 항상 거부', () => {
    expect(hasRole(null, 'staff')).toBe(false);
    expect(hasRole(undefined, 'visitor')).toBe(false);
  });
});

describe('canAccessZone (D-020 / D-021)', () => {
  it('net은 staff 이상만', () => {
    expect(canAccessZone('staff', 'net')).toBe(true);
    expect(canAccessZone('admin', 'net')).toBe(true);
    expect(canAccessZone('master', 'net')).toBe(true);
    expect(canAccessZone('business_customer', 'net')).toBe(false);
    expect(canAccessZone('visitor', 'net')).toBe(false);
    expect(canAccessZone(null, 'net')).toBe(false);
  });
  it('kr은 전 역할 접근 가능', () => {
    expect(canAccessZone('visitor', 'kr')).toBe(true);
    expect(canAccessZone('business_customer', 'kr')).toBe(true);
    expect(canAccessZone('master', 'kr')).toBe(true);
  });
});

describe('netRedirectTarget (D-021: 상업고객 → kr 리다이렉트)', () => {
  it('staff 이상은 접근 허용(null)', () => {
    expect(netRedirectTarget('staff')).toBeNull();
    expect(netRedirectTarget('master')).toBeNull();
  });
  it('business_customer는 kr로', () => {
    expect(netRedirectTarget('business_customer')).toBe('kr');
  });
  it('visitor·미로그인은 login으로', () => {
    expect(netRedirectTarget('visitor')).toBe('login');
    expect(netRedirectTarget(null)).toBe('login');
  });
});
