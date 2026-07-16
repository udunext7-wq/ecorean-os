// ECOREAN OS 테스트 러너 (헌법 10조: TDD 강제)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'core/**/__tests__/**/*.test.{ts,tsx}',
      'apps/**/__tests__/**/*.test.{ts,tsx}',
      'shared/**/__tests__/**/*.test.{ts,tsx}',
      'engines/**/__tests__/**/*.test.{ts,tsx}',
    ],
  },
});
