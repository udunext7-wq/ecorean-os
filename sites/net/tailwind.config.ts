import type { Config } from 'tailwindcss';
import { ecoreanPreset } from '../../core/design/tokens';

export default {
  presets: [ecoreanPreset as Partial<Config>],
  content: [
    './app/**/*.{ts,tsx}',
    '../../apps/**/*.{ts,tsx}',
    '../../core/ui/**/*.{ts,tsx}',
  ],
} satisfies Config;
