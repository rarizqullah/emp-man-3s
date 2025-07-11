import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // Run tests serially to avoid shared DB conflicts
  fullyParallel: false,
  workers: 1,
  timeout: 30 * 1000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  // Automatically start Next.js server before the tests run
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start -p 3000' : 'npm run dev',
    port: 3000,
    timeout: 120 * 1000, // 2 minutes
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_dummydummy_dummy_dummy_dummy_dummy_dummy_dummy_dummy_dummy_dummy_dummy_dummy.dummy',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
}) 