-- SQLite ALTER TABLE DROP COLUMN 미지원 (v3.35 미만)
-- 롤백: 컬럼 제거 불가 → 값을 0으로 초기화
BEGIN TRANSACTION;
UPDATE contracts SET actual_amount = 0, actual_note = NULL;
COMMIT;
