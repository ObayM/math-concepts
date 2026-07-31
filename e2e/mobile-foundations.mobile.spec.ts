import { test, expect, type Page } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';

const student = `e2e-mobile-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  test.setTimeout(180_000);
  await createUser(request, baseURL!, student);
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: student } });
  await disconnect();
});

async function navHeight(page: Page) {
  return page.evaluate(() => {
    const declared = getComputedStyle(document.documentElement).getPropertyValue('--nav-h');
    const header = document.querySelector('header');
    return { declared: parseFloat(declared), actual: header?.getBoundingClientRect().height ?? 0 };
  });
}

async function overflowsSideways(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
}

test('the viewport is declared, and it opts into the safe area', async ({ page }) => {
  await page.goto('/login');
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content).toContain('width=device-width');
  expect(content).toContain('viewport-fit=cover');
});

test('--nav-h matches the navbar that actually renders on a phone', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/dashboard');
  const { declared, actual } = await navHeight(page);
  expect(actual).toBeGreaterThan(0);
  expect(Math.abs(declared - actual)).toBeLessThanOrEqual(1);
});

test('the pages that already fit a phone do not scroll sideways', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);

  for (const path of ['/dashboard', '/courses', '/courses/calculus', '/settings']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await overflowsSideways(page), `${path} overflows horizontally`).toBe(false);
  }
});
