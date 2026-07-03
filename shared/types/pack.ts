// shared/types/pack.ts
// 팩 매니페스트 타입 정의 — pack-contract.md 규약의 코드 구현

/** 접근 구역 */
export type Zone = 'kr' | 'net' | 'both';

/** 5단계 역할 (DECISIONS.md D-021) */
export type Role =
  | 'visitor'            // 1. 서치 고객
  | 'business_customer'  // 2. 상업고객
  | 'staff'              // 3. 일반 직원
  | 'admin'              // 4. 관리자
  | 'master';            // 5. 마스터

/** DB 테이블 접근 선언 */
export interface TableAccess {
  read: string[];
  write: string[];
}

/** 메뉴 등록 위치 */
export interface MenuLocation {
  area: 'homepage' | 'customer' | 'admin' | 'partner' | 'system';
  group: string;
  order: number;
}

/** 앱 팩 매니페스트 (apps/{앱}/pack.manifest.ts) */
export interface AppPackManifest {
  id: string;              // kebab-case, 폴더명과 일치
  name: string;            // 한글 표시명
  icon: string;            // Lucide 아이콘명
  version: string;         // semver
  zone: Zone;
  roles: Role[];
  engines: string[];       // 호출하는 엔진 팩 ID
  tables: TableAccess;
  routes: string[];
  menu: MenuLocation;
  hooks?: string[];        // 연동 이벤트 (선택)
}

/** 엔진 팩 매니페스트 (engines/{엔진}/engine.manifest.ts) */
export interface EnginePackManifest {
  id: string;
  name: string;
  version: string;
  inputSchema: string;     // JSON 스키마 경로
  outputSchema: string;
  dependencies: string[];  // 의존 엔진 ID
  pure: true;              // 항상 true (UI 의존성 0)
  tables: TableAccess;
}

/** 표준 훅 이벤트 (pack-contract.md 4장) */
export type HookEvent =
  | 'onLeadCreated'
  | 'onEstimateApproved'
  | 'onContractSigned'
  | 'onOrderConfirmed'
  | 'onScheduleUpdated'
  | 'onSiteReportSubmitted'
  | 'onProjectCompleted';
