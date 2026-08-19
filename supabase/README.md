# supabase/ — 트랜잭션 DB (D-002)

BOC 프로젝트 (ref `gdcfqbdgubgpzusbtftf`, ap-northeast-2) 의 스키마·시드 원본.

```
migrations/   forward SQL (YYYYMMDDNNNNNN_<name>.sql). MCP apply_migration 과 동일 내용을 파일로도 보관
rollbacks/    위 파일과 1:1 대응하는 되돌리기 SQL (<같은 이름>.down.sql) — "롤백 규약" 참조
seeds/        JSON 원본에서 생성한 시드 SQL (직접 수정 금지 — ETL 로 재생성)
seeds/etl/    JSON → SQL 변환기 (Node). 원본 JSON 은 읽기 전용
policies/     (미사용 — RLS 는 migrations/…_rls.sql 에 포함)
```

## 롤백 규약 (2026-08-19 도입)

**1 forward = 1 rollback.** `migrations/<ts>_<name>.sql` 을 추가하면 같은 커밋에
`rollbacks/<ts>_<name>.down.sql` 을 함께 넣는다. pre-commit 훅(`scripts/git-hooks/pre-commit` 6번)이
누락 시 커밋을 **차단**한다. (훅 설치: `npm run hooks:install` — 클론 직후 1회)

| 항목 | 규칙 |
|---|---|
| 파일명 | forward 와 **완전히 동일한 이름** + `.down.sql` (훅이 이름으로 짝을 찾음) |
| 위치 | `supabase/rollbacks/` — `migrations/` 에 두지 않는다 (Supabase CLI 가 forward 로 오인) |
| 머리말 | 4줄 고정: `ROLLBACK for …` / 되돌리는 내용 / 주의(데이터 유실 여부) / 적용 방법 — `_TEMPLATE.down.sql` 복사 |
| 본문 순서 | forward 의 **역순** (마지막에 만든 객체부터 제거). 교체형(정책·함수·뷰)은 이전 정의를 그대로 복원 |
| 데이터 유실 | `drop table` 류는 머리말에 **"데이터 유실"** 명시. 무손실이면 "무손실" |
| 이력 | apply_migration 으로 올린 경우 마지막 줄에 `delete from supabase_migrations.schema_migrations where version='<원격 version>'` |
| 적용 | MCP `execute_sql` 로 전체 실행 (트랜잭션 안에서 실행 가능) → 실행 후 `pg_policies`/`pg_tables` 로 확인 |
| 소급 | 2026-08-19 이전 28건은 소급 작성하지 않는다 (필요해지면 그때 작성) |
| 우회 | 정말 롤백이 불가능한 변경(데이터 일회성 정리 등)만 `SKIP_ROLLBACK_CHECK=1 git commit …` + 커밋 메시지에 사유 |

왜 이렇게 하나: 운영 DB 에 잘못 올라간 정책/함수를 몇 분 안에 되돌릴 수 있어야 하고,
"되돌리는 SQL 을 쓸 수 있는가"가 forward 가 제대로 설계됐는지 검증하는 역할을 한다.

규칙: Neo4j ID를 FK로 참조만. 온톨로지 정의 복제 금지. (D-040)

## 적재 현황 (2026-07-14 기준)

| 테이블 | 건수 | 원천 |
|---|---|---|
| `tile_products` | 2,550 | ecorean-tile-catalog/index.html `TILE_CATALOG` |
| `cost_items` | 670 | cost-items-v2.json + ECOREAN_공정단가DB_v2.2.json |
| `db_catalog` | 543 | full-db-catalog.json (수집 대상 543항목) |
| `legacy_processes` | 234 | db.json (P001~P234, 온톨로지 코드 해석용) |
| `process_categories` | 146 | process-categories.json |
| `ontology_rules` | 53 | ontology.json(30) + ontology-rules.json(23) |
| `minicad_material_codes` | 38 | MiniCAD-v5.9/js/data.js |
| `materials` / `brands` / `schedule_templates` | 35 / 35 / 35 | 자재DB / 브랜드DB / 공정일정템플릿 |
| `labor_roles` | 32 | 인건비DB 2025공식(18) + seeds-legacy 보충(14) |
| `subcontractors` / `defect_types` / `process_groups` | 21 / 16 / 16 | 외주업체DB / 하자유형DB / db.json |

**뷰**
- `v_all_materials` (2,658) — 자재 4개 원천 통합 조회
- `v_minicad_price_table` (0) — MiniCAD `ECOREAN.PriceTable.v1` items 원천. **승인·확정 단가만** 노출. 현재 0건 = 승인된 단가 없음(정상)

## 재현 방법

```bash
node supabase/seeds/etl/generate-seeds.mjs        # assets/data/*.json  → seeds/seed_*.sql
node supabase/seeds/etl/generate-tile-seeds.mjs   # tile-catalog        → seeds/tile/*.sql
```
생성된 SQL 은 전부 멱등(`on conflict do update`)이라 재실행해도 행수가 변하지 않는다.
적용은 MCP `apply_migration`(DDL) / `execute_sql`(시드) 로 한다.

## 지켜야 할 규칙 (헌법)

- **단가 추정 금지.** 미확보 단가는 `unit_price = null` + `data_status = 'NEEDS_RESEARCH'` 로 남긴다. 빈칸을 채우지 않는다.
- **출처·승인 추적.** 모든 마스터는 `source`(5종) / `source_detail` / `data_status` / `is_approved` / `origin_dataset` 를 가진다. 승인 전 데이터는 `is_approved = false` 이며 `v_minicad_price_table` 에 노출되지 않는다.
- **원본 불변.** `assets/data/*.json` 과 tile-catalog `index.html` 은 ETL 이 읽기만 한다. (`cost-items-v2.json` 은 CLAUDE.md 보호파일)
- **금액은 정수(원), 치수는 정수(mm).**

## 알려진 데이터 이슈 (추정으로 메우지 않고 표시만 해둔 것)

1. **단가 충돌 2건** — `PRE_WS`(폐기물 수거·반출), `WIN_SCR`(방충망 교체) 는 cost-items-v2 와 v2.2 의 단가가 다르다. 출처 메타가 있는 **v2.2 값을 채택**했으나 실값 확인 필요.
2. **제품명 유실 SKU 277건** — tile_products 중 원본 카탈로그에 `tag` 공란 + `name='M'` 인 항목. 단가·규격·이미지는 유효하며 `notes` 로 표시해 두었다. 제품명 확인 필요.
3. **무단가 22건** — tile_products 중 원본에 가격이 없는 항목. `NEEDS_RESEARCH`.
4. **고아 참조** — `schedule_templates` 가 참조하는 `FLR_WB`, `TILE_GRW`, `PLB_KIT` 와 `materials.MAT-FLR-001 → FLR_WB` 는 `cost_items` 에 없는 코드다. FK 를 강제하지 않고 soft ref 로 두었다 (데이터 수집 진행 중).
5. **`process-categories.json` 중복** — `CARP_DW` 가 2번 등장(module `carp` / `door`)하여 147 → 146 행.

## 후속 작업

- **RLS 5역할 세분화 (D-011)** — 현재는 골격만: 전 테이블 RLS 활성 + `authenticated` SELECT 만, 쓰기는 service_role. `tenant_id` 컬럼은 있으나 정책에서 아직 미사용. 세분화 시 `using (true)` → `using (tenant_id = auth.jwt()->>'tenant_id' and <role>)`.
- **`minicad_price_keys` 매핑** — MiniCAD priceKey(`FLOORING.STRONG` 형식) ↔ `cost_items`/`tile_products` 매핑은 자동 생성이 불가해 비워 두었다. 수동 등록으로 채워야 MiniCAD 자동 견적이 DB 단가를 쓴다.
- **`ontology_rules` → Neo4j (D-040)** — 현재 테이블은 Neo4j 미도입 상태의 임시 스테이징. 도입 시 `rule_id` 만 남기고 정의는 Neo4j 로 이관 (`raw` jsonb 에 원본 무손실 보존해 둠).
- **tile-catalog 앱 연동** — 앱이 아직 1MB 하드코딩 + localStorage 를 쓴다. `GET /rest/v1/tile_products` 로 교체하면 단가 수정이 전사 공유된다. 이미지 URL 은 외부 호스트(usongtile.netlify.app)라 중기적으로 Storage 미러링 권장.
