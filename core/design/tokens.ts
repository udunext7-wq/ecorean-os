// core/design/tokens.ts — ECOREAN 디자인 토큰 (pack-contract 2.3-2: 앱 자체 색상표 금지)
// 모든 앱 팩은 이 토큰(Tailwind preset)만 사용한다.

export const colors = {
  // 브랜드 (에코 그린)
  brand: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#16a34a',
    600: '#15803d',
    700: '#166534',
  },
  // 상태
  ok: '#16a34a',      // 승인·검증
  warn: '#d97706',    // 조사필요·부분
  danger: '#dc2626',  // 오류·차단
  info: '#2563eb',
} as const;

/** Tailwind preset — 각 sites/{도메인}/tailwind.config 에서 presets 로 사용 */
export const ecoreanPreset = {
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        ok: colors.ok,
        warn: colors.warn,
        danger: colors.danger,
        info: colors.info,
      },
    },
  },
};
