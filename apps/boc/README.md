# apps/boc — 관리자 BOC 앱 팩

## 무엇을

마스터 DB(공정 단가·통합 자재·타일 SKU) 조회 대시보드. **v0.1 읽기 전용.**

| 라우트 | 화면 | 원천 테이블 |
|---|---|---|
| `/` | 대시보드 (적재 현황 + 데이터 이슈) | 집계 count |
| `/boc/cost-items` | 공정 단가 목록·검색 | `cost_items` |
| `/boc/materials` | 통합 자재 목록·검색 | `v_all_materials` |
| `/boc/tiles` | 타일 SKU 목록·검색 | `tile_products` |

## 누가

`staff` / `admin` / `master` (D-021). zone `net` — sites/net 에 마운트.

## 어떤 엔진

v0.1은 조회 전용이라 엔진 호출 없음. 견적·발주 기능 추가 시
`engines/estimate`·`engines/procurement` 를 manifest.engines 에 선언하고 호출한다 (D-030).

## 헌법 준수

- 단가 미확보(`unit_price=null`)는 `—` 로 표시, 추정하지 않음 (9조)
- `data_status` / `is_approved` 항상 노출 — 미확정 데이터를 숨기지 않음
- 쓰기 기능 없음 — Master DB 변경은 승인 절차(3조·D-051)와 함께 별도 구현
