# pack-contract.md — 팩 규약 (모든 팩이 반드시 준수)

> 목적: 모든 앱 팩·엔진 팩이 지킬 표준을 정의한다. 규약을 지키면 팩이 100개로 늘어도 일관성이 유지된다.
> 규칙: 규약을 어긴 팩은 pre-commit hook이 커밋을 차단한다. 이것이 "짜집기 재발"을 코드로 막는 장치.
> 근거: DECISIONS.md D-030(엔진/앱 분리), D-032(팩 로더 나중), repo-boundary.md
> 최종 갱신: 2026-07-01

---

## 1. 팩의 두 종류 (다시 확인)

```
엔진 팩 (engines/)   백엔드 두뇌. 판단·계산·규칙. 순수 함수. UI 없음.
앱 팩 (apps/)        프론트 얼굴. 화면·입력·표시. 엔진을 호출.

핵심: 앱 팩은 엔진 팩을 "호출"만 한다. 로직을 자기 안에 만들지 않는다. (P2)
```

---

## 2. 앱 팩 규약

### 2.1 필수 파일 — pack.manifest.ts

모든 앱 팩은 폴더 루트에 이 파일이 반드시 있어야 한다. 없으면 커밋 차단.

```typescript
// apps/{앱}/pack.manifest.ts
import type { AppPackManifest } from '@/shared/types/pack';

export const manifest: AppPackManifest = {
  id: 'order-form',                    // 고유 ID (kebab-case, 폴더명과 일치)
  name: '발주서',                       // 표시명 (한글)
  icon: 'file-text',                   // Lucide 아이콘명
  version: '1.0.0',                    // semver

  zone: 'net',                         // 'kr' | 'net' | 'both'
  roles: ['staff', 'admin', 'master'], // 접근 가능 역할

  engines: ['procurement'],            // 호출하는 엔진 팩 ID 목록
  tables: {                            // 사용 DB 테이블 선언
    read:  ['projects', 'estimate_items', 'vendors', 'vendor_prices'],
    write: ['purchase_orders', 'order_items'],
  },

  routes: ['/admin/orders', '/admin/orders/new'], // 진입 경로
  menu: {                              // 메뉴 등록 위치
    area: 'admin',                     // 어느 대시보드
    group: '현장',                      // 메뉴 그룹
    order: 3,                          // 정렬 순서
  },

  hooks: ['onEstimateApproved'],       // 다른 팩과의 연동점 (선택)
};
```

### 2.2 앱 팩 폴더 표준 구조

```
apps/{앱}/
├── pack.manifest.ts     ★ 필수
├── page.tsx             진입 화면 (Next.js)
├── components/          이 앱 전용 컴포넌트
├── hooks/               이 앱 전용 훅
└── README.md            이 앱 설명 (무엇을/누가/어떤 엔진)

금지:
✗ 견적/발주 계산 로직 (→ engines/로)
✗ 공통 컴포넌트 (→ core/ui/로)
✗ 다른 앱 직접 import (→ engines/ 또는 shared/ 경유)
```

### 2.3 앱 팩 6대 준수 사항

```
1. manifest 필수         — pack.manifest.ts 없으면 차단
2. 코어 디자인 사용       — core/design 토큰 사용. 자체 색상표 금지
3. 코어 UI 재사용         — Button 등은 core/ui 사용. 재구현 금지
4. 엔진 호출              — 로직은 engines/ 호출. 자체 구현 금지
5. 테이블 선언            — manifest.tables에 선언한 것만 접근
6. 역할 준수              — manifest.roles 외 접근은 미들웨어가 차단
```

---

## 3. 엔진 팩 규약

### 3.1 필수 파일 — engine.manifest.ts

```typescript
// engines/{엔진}/engine.manifest.ts
import type { EnginePackManifest } from '@/shared/types/pack';

export const manifest: EnginePackManifest = {
  id: 'procurement',                          // 고유 ID
  name: 'ProcurementEngine',                  // 엔진명
  version: '1.0.0',

  inputSchema:  'shared/schemas/procurement-input.json',   // 입력 검증
  outputSchema: 'shared/schemas/procurement-output.json',  // 출력 검증

  dependencies: ['rule'],                     // 의존 엔진 ID
  pure: true,                                 // UI 의존성 0 (항상 true)

  tables: {                                   // DB 접근 선언
    read:  ['estimate_items', 'vendors', 'vendor_prices'],
    write: ['purchase_orders', 'order_items'],
  },
};
```

### 3.2 엔진 팩 폴더 표준 구조

```
engines/{엔진}/
├── engine.manifest.ts   ★ 필수
├── index.ts             엔진 진입점 (순수 함수 export)
├── logic/               계산·판단 로직
├── __tests__/           ★ 필수 (D-050 헌법 10조: TDD 강제)
└── README.md            입력→처리→출력 설명

금지:
✗ React / JSX import (P2 위반, 커밋 차단)
✗ 화면·UI 코드
✗ 다른 앱 import
```

### 3.3 엔진 팩 5대 준수 사항

```
1. manifest 필수         — engine.manifest.ts 없으면 차단
2. 순수 함수             — 입력→출력. UI/화면 의존성 0
3. 스키마 검증           — 입출력을 JSON 스키마로 검증 (Zod)
4. 테스트 필수           — __tests__/ 없으면 차단 (TDD 강제)
5. 헌법 준수             — D-050 헌법 10조 위반 로직 금지
                          (방수 AUTO 금지, 단가 추정 금지 등)
```

---

## 4. 팩 간 연동 규약 (hooks)

앱 팩끼리 직접 import는 금지(repo-boundary D). 대신 hooks로 연동한다.

```
예: 견적 승인 → 발주서 자동 생성

1. estimate 앱이 견적 승인 시 이벤트 발행:
   emit('onEstimateApproved', { estimateId })

2. order-form 앱이 manifest.hooks에 'onEstimateApproved' 선언

3. 이벤트 버스가 order-form에 전달 → engines/procurement 호출

핵심: 앱끼리 직접 안 부른다. 이벤트로 느슨하게 연결.
      이래야 발주서 팩을 빼도 견적 팩이 안 깨진다.
```

표준 훅 이벤트 (초기):
```
onLeadCreated          리드 생성
onEstimateApproved     견적 승인
onContractSigned       계약 완료
onOrderConfirmed       발주 확정
onScheduleUpdated      공정표 변경
onSiteReportSubmitted  공사일보 제출
onProjectCompleted     준공
```

---

## 5. 새 팩을 만드는 표준 절차

```
새 앱 팩을 만들 때 (예: 새 기능 앱):

1. 이 앱이 코어의 무엇을 재사용하나? (디자인·인증·UI)
2. 어떤 데이터를 읽고 쓰나? (기존 테이블? 새 테이블?)
3. 어떤 엔진을 호출하나? (없으면 → 엔진 먼저 만들기)
4. 누가 쓰나? (역할 지정)
5. 어느 메뉴에 등록하나?
6. → apps/{앱}/ 폴더 생성
7. → pack.manifest.ts 작성 (위 2.1 형식)
8. → core/ui, engines/ 가져다 화면만 구현
9. → README.md 작성
10. → 커밋 (pre-commit hook이 규약 검사)

새 엔진 팩을 만들 때:
1. 입력 스키마 정의 (shared/schemas/)
2. 출력 스키마 정의
3. __tests__/ 먼저 작성 (TDD)
4. logic/ 구현
5. engine.manifest.ts 작성
6. 커밋
```

---

## 6. pre-commit 강제 검사 (규약 위반 차단)

```
커밋 시 자동 검사 (.github/ hook):

앱 팩:
├─ pack.manifest.ts 존재?          없으면 → 차단
├─ manifest 필수 필드 채워짐?        누락 → 차단
├─ core/design 토큰 사용?           자체 색상 → 경고
├─ 계산 로직 포함?                  engines/ 미호출 로직 → 경고
└─ 다른 apps/ import?              → 차단

엔진 팩:
├─ engine.manifest.ts 존재?        없으면 → 차단
├─ React/JSX import?              → 차단 (P2 위반)
├─ __tests__/ 존재?                없으면 → 차단
├─ 입출력 스키마 존재?              없으면 → 차단
└─ 헌법 위반 패턴?                  (방수 AUTO 등) → 차단
```

---

## 7. 팩 로더는 나중에 (D-032 재확인)

```
지금 (Phase 0~7): "논리적 팩"
  = 규약을 지킨 폴더. 수동으로 앱에 포함.

나중 (Phase 8 이후): "물리적 팩 시스템"
  = 동적 로더. manifest 읽어서 자동 등록.
  = 켜고 끄기. 프랜차이즈별 팩 구성.

왜 나중: 팩 3~4개 쌓여 패턴 검증된 후 만들어야 실패 없음.
        지금 로더부터 만들면 본체를 못 만드는 오버엔지니어링.
```

---

## 변경 이력

| 날짜 | 변경 | 주체 |
|------|------|------|
| 2026-07-01 | 최초 작성. 앱/엔진 팩 규약 + hooks + pre-commit 확정. | 대표 + 김비서 |
