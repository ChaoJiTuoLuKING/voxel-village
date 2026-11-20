import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: './projects/voxel-village/tests/e2e',
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    timeout: 60_000,
  },
});
