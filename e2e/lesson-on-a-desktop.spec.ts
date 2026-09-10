import { test, expect } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';

const reader = `e2e-desktop-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  test.setTimeout(180_000);
  await createUser(request, baseURL!, reader);
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: reader } });
  await disconnect();
});

test('the check bar stays on screen while a tall slide scrolls', async ({
  page,
  request,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await authenticate(page.context(), request, baseURL!, reader);
  await page.goto('/courses/calculus/differentiation-2');

  const action = page.getByRole('button', { name: /^(Continue|Check|Complete!)$/ }).last();
  await expect(action).toBeVisible({ timeout: 20_000 });

  await action.click();
  await expect(page.getByRole('heading', { name: 'The Product Rule' })).toBeVisible();

  const height = page.viewportSize()!.height;
  const before = await action.boundingBox();
  expect(
    before!.y + before!.height,
    'the action bar should be reachable without scrolling the page'
  ).toBeLessThanOrEqual(height + 1);

  const scrolled = await page.evaluate(() => {
    const box = [...document.querySelectorAll('div')].find(
      (el) => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight + 20
    );
    if (!box) return false;
    box.scrollTop = box.scrollHeight;
    return box.scrollTop > 0;
  });
  expect(scrolled, 'the slide body should scroll inside the card, not the page').toBe(true);
  await page.waitForTimeout(300);

  const after = await action.boundingBox();
  expect(after!.y + after!.height).toBeLessThanOrEqual(height + 1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
});
