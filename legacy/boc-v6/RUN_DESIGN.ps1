# ECOREAN Design Auto Runner
Set-Location "C:\Users\udune\ecorean-os"
$prompt = @'
ECOREAN BOC 전체 UI를 세계 최고급 수준으로 완전 재설계해줘.
파일: ECOREAN_BOC_v1.html

[디자인 시스템]
컬러:
--void: #030305
--deep: #07070F
--surface: #0D0D1A
--glass: rgba(255,255,255,0.03)
--gold: #C9A84C
--gold-bright: #FFD700
--gold-dim: rgba(201,168,76,0.15)
--gold-glow: rgba(201,168,76,0.4)
--platinum: #E8E0D0
--dim: #555566
--green: #00FFB2
--red: #FF3355
--blue: #00AAFF
--border: rgba(201,168,76,0.12)

폰트: Google Fonts - Cormorant Garamond(헤딩) + Inter(본문) + JetBrains Mono(숫자)

[1] 살아있는 배경
- canvas 골드 파티클 50개 (마우스 반응)
- 배경 그라디언트 애니메이션
- 미세한 골드 격자 오버레이

[2] 물방울 버튼
- 3D 볼록한 물방울 형태 border-radius
- hover: 부풀기 + translateY
- click: 골드 파문 ripple
- Web Audio API 물방울 소리 (외부파일 없이 코드로 생성):
  function playDropSound() {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime+0.3);
    filter.Q.value = 15;
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime+0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.3);
  }
  모든 버튼 클릭에 연결

[3] 글래스모피즘 카드
- backdrop-filter blur(20px)
- 골드 테두리 hover glow
- 부상 효과 translateY(-2px)
- cubic-bezier(0.23,1,0.32,1) 트랜지션

[4] TOP BAR
- 좌: ECOREAN BOC 로고 + 실시간 시계
- 중: KPI 5개 (합계/㎡단가/프로젝트수/승인대기/날짜) 카운트업 애니메이션
- 우: 알림벨 + 설정
- 승인대기 빨간 펄스

[5] 탭 네비
- 액체 슬라이더 언더라인
- 활성탭 골드 글로우

[6] 견적 마법사
- 스텝바: 물처럼 채워지는 진행바
- STEP1: 건물유형 아이콘 카드 그리드 (선택시 부상+골드테두리)
- STEP2: 공간카드 + 물방울 추가버튼 + 실시간 면적 롤링숫자
- STEP3: 상태별 색상코드 카드 (양호=green/주의=orange/불량=red) 위험시 진동
- STEP4: 카테고리 접이식 패널 (물결 펼침) + [자동] 뱃지
- STEP5: 등급 슬라이더 (프리미엄 선택시 파티클 폭발)
- STEP6: 금액 카운트업 + 도넛차트 + 바차트 + 발주 타임라인

[7] 견적 결과
- 중앙 대형 금액: Cormorant Garamond 48px 골드그라디언트 카운트업
- KPI 4카드: 글래스모피즘
- 공정 테이블: 카테고리헤더 골드/[자동]초록뱃지/금액 JetBrains Mono
- 하단 물방울 버튼 4개: 저장/프리셋/고객용/내부용

[8] 인쇄 (고객용 견적서)
@media print:
- 배경 완전 흰색, 텍스트 검정
- 애니메이션/canvas/그림자 전부 제거
- A4 최적화, 상단 로고+견적번호+날짜
- 공정 테이블, 합계+VAT+서명란+도장란
- ECOREAN 워터마크 연하게

[9] 알림 시스템
- 성공: 초록 글로우 슬라이드
- 경고: 오렌지 펄스 진동
- 오류: 레드 플래시 + 낮은 물방울 경고음

[10] 반응형
- PC 1440px+: 풀레이아웃 멀티컬럼
- 태블릿 768px: 2컬럼 큰터치버튼
- 모바일 320px: 단일컬럼 하단탭바 48px터치

[11] 전환 애니메이션
- 탭전환: 물결 슬라이드
- 스텝전환: 카드 흐름 교체
- 모달: 물방울 터지며 확장/수축

[12] 버그 체크 (구현 후 반드시)
1. AudioContext 모바일 정책 (첫 클릭 후 활성화)
2. backdrop-filter Safari 호환
3. canvas 60fps 성능
4. 인쇄시 canvas/animation 제거
5. 모든 버튼 이벤트 정상
6. 견적 계산 결과 동일 유지
7. localStorage 저장/불러오기 유지
8. 온톨로지 자동포함 정상
9. 모바일 터치 정상
10. 탭전환 데이터 유지

완료 후:
- npm start 테스트
- 모든 탭 클릭 확인
- 견적 생성 1회 테스트
- 인쇄 미리보기 확인
- Electron 재빌드
- git push

'@
$prompt | claude --dangerously-skip-permissions
