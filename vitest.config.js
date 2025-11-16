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
      // exclude test runner and build config files and editor artifacts
      exclude: [
        'e2e/**',
        'playwright.config.ts',
        'vite.config.ts',
        'vitest.config.ts',
        // ignore root JS config files so they don't appear as 0% in coverage
  'vite.config.js',
  'vitest.config.js',
  'eslint.config.js',
      ],
    },
  },
});
