// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173', // 👈
  },
  webServer: {
    command: 'npm run dev', // o: npm run preview (ver abajo)
    url: 'http://localhost:5173', // 👈 debe coincidir con baseURL
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
