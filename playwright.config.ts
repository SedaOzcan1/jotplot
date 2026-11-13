import { defineConfig, devices } from '@playwright/test'
import { authFile } from './test/e2e/helpers'

// Local runs read SUPABASE_URL and SUPABASE_KEY from .env; CI sets them from the local Supabase it starts.
try {
  process.loadEnvFile()
} catch {
  // No .env file: rely on the environment.
}

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
    // Signs up one test user and saves the signed-in browser state for the other projects.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'desktop',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: authFile,
      },
    },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: { ...devices['Pixel 7'], storageState: authFile },
    },
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
