# core/ — 공유 기반

모든 팩(앱·엔진)이 공유하는 기반. 한 번 만들고 계속 재사용.

- design/          디자인 시스템 (컬러·타이포·간격 토큰)
- auth/            인증·권한 (Supabase Auth, 5역할, RLS 헬퍼)
- db/              DB 클라이언트·타입
- ui/              공통 컴포넌트 (Button, Card, Badge…)
- ontology-client/ Neo4j 조회 클라이언트

규칙: 2개 이상이 공유하는 것만. core 수정은 전체 영향 → 승인 대상.
