import { test, expect } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';

const student = `e2e-phone-${Date.now()}@mathly.local`;
// the scroll test needs a lesson that has not been progressed through, and the
// other tests here move that progress along
const reader = `e2e-phone-read-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  // createUser waits out the sign-up rate limit, which can outlast the default
  test.setTimeout(180_000);
  await createUser(request, baseURL!, student);
  await createUser(request, baseURL!, reader);
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [student, reader] } } });
  await disconnect();
});

test.beforeEach(async ({ page, request, baseURL }) => {
  await authenticate(page.context(), request, baseURL!, student);
});

test('a lesson can be answered end to end with taps alone', async ({ page }) => {
  await page.goto('/courses/calculus/differentiation-2');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Continue' }).tap();
  await page.getByRole('button', { name: 'Continue' }).tap();

  const input = page.getByPlaceholder('your answer');
  await expect(input).toBeVisible();
  await input.tap();
  await input.fill('16');

  const check = page.getByRole('button', { name: 'Check' });
  await expect(check).toBeEnabled();
  await check.tap();

  await expect(page.getByRole('button', { name: /Continue|Complete/ })).toBeEnabled();
});

test('the check bar stays on screen while the slide scrolls', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, reader);
  await page.goto('/courses/calculus/differentiation-2');
  const action = page.getByRole('button', { name: /^(Continue|Check|Complete!)$/ }).last();
  await expect(action).toBeVisible({ timeout: 20_000 });
  // slide 2 is the long one: prose plus a scene, taller than a phone
  await action.tap();
  await expect(page.getByRole('heading', { name: 'The Product Rule' })).toBeVisible();

  const height = page.viewportSize()!.height;
  const before = await action.boundingBox();
  expect(before!.y + before!.height).toBeLessThanOrEqual(height + 1);

  const scrolled = await page.evaluate(() => {
    const box = [...document.querySelectorAll('div')].find(
      (el) => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight + 20
    );
    if (!box) return false;
    box.scrollTop = box.scrollHeight;
    return box.scrollTop > 0;
  });
  expect(scrolled, 'the slide body should scroll inside the card').toBe(true);
  await page.waitForTimeout(300);

  const after = await action.boundingBox();
  expect(after!.y + after!.height).toBeLessThanOrEqual(height + 1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
});

test('no student page scrolls sideways on a phone', async ({ page }) => {
  for (const path of [
    '/dashboard',
    '/courses',
    '/courses/calculus',
    '/courses/calculus/differentiation-2',
    '/settings',
  ]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflows, `${path} scrolls sideways`).toBe(false);
  }
});

test('the tab bar carries navigation, and steps aside inside a lesson', async ({ page }) => {
  await page.goto('/dashboard');
  const tabs = page.locator('nav[aria-label="Primary"]');
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('link')).toHaveCount(4);

  await tabs.getByRole('link', { name: 'Courses' }).tap();
  await expect(page).toHaveURL(/\/courses$/);

  await page.goto('/courses/calculus/differentiation-2');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible({ timeout: 20_000 });
  await expect(tabs).toHaveCount(0);
});
