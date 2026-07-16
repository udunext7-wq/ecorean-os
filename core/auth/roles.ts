// core/auth/roles.ts — 5역할 접근 제어 (DECISIONS.md D-021)
// 접근 제어의 주체는 도메인이 아니라 role. DB의 public.role_level() 과 서열이 동일해야 한다.
import type { Role, Zone } from '@/shared/types/pack';

/** 역할 서열 (supabase public.role_level() 과 1:1) */
export const ROLE_LEVEL: Record<Role, number> = {
  visitor: 1,
  business_customer: 2,
  staff: 3,
  admin: 4,
  master: 5,
};

/** userRole이 minRole 이상인가 */
export function hasRole(userRole: Role | null | undefined, minRole: Role): boolean {
  if (!userRole) return false;
  return (ROLE_LEVEL[userRole] ?? 0) >= ROLE_LEVEL[minRole];
}

/**
 * 구역 접근 판정 (D-020 / D-021)
 * net(내부): staff 이상만.
 * kr(고객): 전 역할 (직원도 고객 사이트 열람 가능).
 */
export function canAccessZone(userRole: Role | null | undefined, zone: Zone): boolean {
  if (zone === 'kr' || zone === 'both') return true;
  return hasRole(userRole, 'staff');
}

/**
 * net 접속 거부 시 이동할 곳 (D-021: 상업고객이 net 접속 시 kr로 리다이렉트)
 * 반환: 'kr' = ecorean.kr로 리다이렉트, 'login' = 로그인 필요, null = 접근 허용
 */
export function netRedirectTarget(userRole: Role | null | undefined): 'kr' | 'login' | null {
  if (canAccessZone(userRole, 'net')) return null;
  if (userRole === 'business_customer') return 'kr';
  return 'login';
}
