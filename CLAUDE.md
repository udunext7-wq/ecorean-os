# ECOREAN BOC — Claude Code 설정

## 자동 승인 설정
이 프로젝트에서는 아래 작업을 자동 승인한다:
- 파일 생성·수정·삭제
- npm·pip 패키지 설치
- git add·commit·push
- 서버 실행·종료
- 빌드·테스트 실행

## 절대 자동 승인 금지
- src/master-db/seed/ 파일 직접 수정
  (반드시 대표 승인 후 반영)
- .env 파일 수정
- GitHub 계정 설정 변경
