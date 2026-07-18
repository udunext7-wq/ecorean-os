// core/design/tokens.ts — ECOREAN 디자인 토큰 (pack-contract 2.3-2: 앱 자체 색상표 금지)
// 모든 앱 팩은 이 토큰(Tailwind preset)만 사용한다.
// 2026-07-19: 블랙&골드 테마 (대표 지시) — 홈페이지(--gold #B8965A / --dark) 톤과 통일

export const colors = {
  // 브랜드 (골드) — 50·100은 다크 배경 위 틴트, 400~700은 텍스트·버튼용
  brand: {
    50: '#241E14',
    100: '#332A1B',
    400: '#D6B87E',
    500: '#C9A76A',
    600: '#B8965A',
    700: '#D6B87E', // 다크 테마: hover 시 더 밝게
  },
  // 표면 (블랙 계열)
  ink: '#0F0E0C',    // 페이지 배경
  panel: '#1A1814',  // 카드·사이드바
  panel2: '#242019', // 표 헤더·행 hover
  stroke: '#2E2922', // 경계선
  // 텍스트
  cream: '#F0EAE0',  // 본문 강조
  muted: '#A79F8F',  // 보조
  faint: '#736C5F',  // 흐림
  // 상태
  ok: '#5DBE7E',
  warn: '#D9A03F',
  danger: '#E5726A',
  info: '#C9A76A',
} as const;

/** Tailwind preset — 각 sites/{도메인}/tailwind.config 에서 presets 로 사용 */
export const ecoreanPreset = {
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        ink: colors.ink,
        panel: colors.panel,
        panel2: colors.panel2,
        stroke: colors.stroke,
        cream: colors.cream,
        muted: colors.muted,
        faint: colors.faint,
        ok: colors.ok,
        warn: colors.warn,
        danger: colors.danger,
        info: colors.info,
      },
    },
  },
};
