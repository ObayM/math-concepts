import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

// the locale comes from the host in production, and the ?lang= override only
// fires on hosts that carry no locale. resolving these names to loopback in the
// browser is what lets the suite exercise the real path instead of the override.
const APP_DOMAIN = `mathly.local:${PORT}`;
const localeHost = (lang: string) => `http://${lang}.${APP_DOMAIN}`;
const resolverRules = `MAP *.mathly.local 127.0.0.1, MAP mathly.local 127.0.0.1`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  timeout: 60_000,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*\.(mobile|locale)\.spec\.ts/,
    },
    {
      name: 'locale',
      testMatch: /.*\.locale\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: localeHost('ar'),
        launchOptions: { args: [`--host-resolver-rules=${resolverRules}`] },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run build && npm start',
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      PORT: String(PORT),
      NEXT_PUBLIC_APP_URL: baseURL,
      BETTER_AUTH_URL: baseURL,
      APP_DOMAIN,
      // APP_DOMAIN narrows the accepted origins to the locale hosts, and every
      // other spec signs in over loopback
      TRUSTED_ORIGINS: `${baseURL},http://127.0.0.1:${PORT}`,
      // the suite runs over plain http, and https would make the session cookie
      // __Secure- prefixed and therefore unsettable
      APP_PROTOCOL: 'http',
      DISABLE_HIBP: '1',
    },
  },
});
