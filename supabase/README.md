# supabase/ — 트랜잭션 DB

- migrations/ 테이블 생성 SQL (순차 번호)
- policies/   RLS 정책 (5역할)
- seeds/      초기 데이터

규칙: Neo4j ID를 FK로 참조만. 온톨로지 정의 복제 금지. (D-040)
