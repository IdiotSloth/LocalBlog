import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  workers: 1, // sequential to avoid DB conflicts
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3456',
    screenshot: 'only-on-failure',
  },
  // Run `npm run build` before tests to ensure frontend is compiled
  // Server serves React SPA from out/renderer/
  webServer: {
    command: 'npm run server',
    url: 'http://localhost:3456',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
