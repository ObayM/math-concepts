import { test, expect, type BrowserContext, type APIRequestContext } from '@playwright/test';
import { createUser, disconnect, PASSWORD } from './helpers';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const host = (lang: string) => `http://${lang}.mathly.local:${PORT}`;
// node cannot resolve *.mathly.local, only the browser can, so auth goes over
// loopback and the resulting token is planted on the parent domain by hand
const LOOPBACK = `http://localhost:${PORT}`;

// sign-up and sign-in are rate limited, so the whole file shares one session
let sessionToken: Promise<string> | null = null;

function tokenFor(request: APIRequestContext, email: string): Promise<string> {
  sessionToken ??= (async () => {
    await createUser(request, LOOPBACK, email);
    const res = await request.post(`${LOOPBACK}/api/auth/sign-in/email`, {
      data: { email, password: PASSWORD },
      headers: { origin: LOOPBACK },
    });
    if (!res.ok()) throw new Error(`sign-in failed (${res.status()}): ${await res.text()}`);
    const pair = res
      .headersArray()
      .filter((h) => h.name.toLowerCase() === 'set-cookie')
      .map((h) => h.value.split(';')[0])
      .find((c) => c.startsWith('better-auth.session_token='));
    if (!pair) throw new Error('no session cookie returned');
    return pair;
  })();
  return sessionToken;
}

async function signInAcrossHosts(
  context: BrowserContext,
  request: APIRequestContext,
  email: string
) {
  const pair = await tokenFor(request, email);
  const eq = pair.indexOf('=');
  await context.addCookies([
    { name: pair.slice(0, eq), value: pair.slice(eq + 1), domain: '.mathly.local', path: '/' },
  ]);
}

test.afterAll(async () => {
  await disconnect();
});

// this project resolves *.mathly.local to loopback in the browser, so the
// locale really is derived from the Host header here, not from a ?lang override
test.describe('the subdomain decides the language', () => {
  test('arabic host renders rtl and arabic chrome', async ({ page }) => {
    await page.goto(`${host('ar')}/login`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByLabel('التنقل').getByRole('link', { name: 'الدورات' })).toBeVisible();
  });

  test('english host is untouched on the same server', async ({ page }) => {
    await page.goto(`${host('en')}/login`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByLabel('Global').getByRole('link', { name: 'Courses' })).toBeVisible();
  });

  test('a real locale host ignores ?lang, so the url cannot lie', async ({ page }) => {
    await page.goto(`${host('ar')}/login?lang=en`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('the apex sends an arabic browser to the arabic host', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'ar-EG' });
    const page = await ctx.newPage();
    await page.goto(`http://mathly.local:${PORT}/login`);
    expect(page.url()).toContain(`ar.mathly.local:${PORT}`);
    await ctx.close();
  });

  test('the apex sends everyone else to english', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'fr-FR' });
    const page = await ctx.newPage();
    await page.goto(`http://mathly.local:${PORT}/login`);
    expect(page.url()).toContain(`en.mathly.local:${PORT}`);
    await ctx.close();
  });

  test('admin stays english even when reached from the arabic host', async ({ page }) => {
    const res = await page.goto(`${host('ar')}/prism`);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});

test.describe('arabic content', () => {
  const email = 'e2e-locale@mathly.local';

  test.beforeEach(async ({ page, request }) => {
    await signInAcrossHosts(page.context(), request, email);
  });

  test('the arabic lesson plays on the arabic host', async ({ page }) => {
    await page.goto(`${host('ar')}/courses/calculus-ar/ar-calc-1`);
    await expect(page.getByText('ما ميل هذا الخط؟')).toBeVisible();
  });

  test('the same lesson is not served on the english host', async ({ page }) => {
    await page.goto(`${host('en')}/courses/calculus-ar/ar-calc-1`);
    await expect(page.getByText('ما ميل هذا الخط؟')).toHaveCount(0);
  });

  test('math inside arabic prose renders right to left in book notation', async ({ page }) => {
    await page.goto(`${host('ar')}/courses/calculus-ar/ar-calc-1`);
    const math = page.locator('.rich-text math.artex').first();
    await expect(math).toBeVisible();
    await expect(math).toHaveCSS('direction', 'rtl');
    await expect(page.locator('.rich-text .katex')).toHaveCount(0);
  });

  test('the arabic catalog shows only arabic courses', async ({ page }) => {
    await page.goto(`${host('ar')}/courses`);
    await expect(page.getByRole('heading', { name: 'التفاضل والتكامل' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Calculus' })).toHaveCount(0);
  });
});
