import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    css: false,
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3001/api'),
  },
});
