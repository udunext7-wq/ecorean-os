import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      // shared 디렉토리의 JSX 파일도 React 플러그인이 처리하도록
      include: ['**/*.{jsx,tsx}', '../shared/**/*.{jsx,tsx}'],
    }),
  ],
  resolve: {
    alias: {
      '@ecorean/shared': path.resolve(__dirname, '../shared'),
    },
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
