import { defineConfig, devices } from '@playwright/test'

const port = 3100
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Runs the production build; `npm run build` must run first.
    command: 'node .output/server/index.mjs',
    url: baseURL,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
