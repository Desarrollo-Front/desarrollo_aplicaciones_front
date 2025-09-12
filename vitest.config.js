/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 0,
        functions: 0,
        statements: 0,
        branches: 0,
      },
      exclude: ['e2e/**', 'playwright.config.ts', 'vite.config.ts', 'vitest.config.ts'],
    },
  },
});
