import { test, expect, type Page } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';

const student = `e2e-warmup-phone-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  test.setTimeout(180_000);
  await createUser(request, baseURL!, student);
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: student } });
  await disconnect();
});

const box = (page: Page) => page.getByLabel(/^Answer for /);

const overflowsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

test('the keypad drives the answer and the phone keyboard never opens', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/warmup/3');
  await expect(box(page)).toBeVisible();

  await expect(box(page)).toHaveAttribute('readonly', '');
  await expect(box(page)).toHaveAttribute('inputmode', 'none');

  await page.getByRole('button', { name: '4' }).tap();
  await page.getByRole('button', { name: '2' }).tap();
  await expect(box(page)).toHaveValue('42');

  await page.getByRole('button', { name: 'backspace' }).tap();
  await expect(box(page)).toHaveValue('4');

  await page.getByRole('button', { name: 'minus' }).tap();
  await expect(box(page)).toHaveValue('-4');
});

test('a drill answered entirely by tapping gets recorded', async ({ page, request, baseURL }) => {
  test.setTimeout(90_000);
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/warmup/3');
  await expect(box(page)).toBeVisible();

  const prompt = (await box(page).getAttribute('aria-label'))!.replace('Answer for ', '');
  const [a, b] = prompt.split(' × ').map(Number);
  for (const digit of String(a * b)) {
    await page.getByRole('button', { name: digit }).tap();
  }
  await page.getByRole('button', { name: /Check/ }).tap();

  await expect(page.getByText(/Nice/)).toBeVisible();
  await expect(page.getByText('1/1')).toBeVisible();
});

test('every key is a thumb sized target', async ({ page, request, baseURL }) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/warmup/3');
  await expect(box(page)).toBeVisible();

  for (const name of ['7', '0', 'minus', 'backspace']) {
    const size = await page.getByRole('button', { name }).boundingBox();
    expect(size!.height, `${name} is too short`).toBeGreaterThanOrEqual(44);
    expect(size!.width, `${name} is too narrow`).toBeGreaterThanOrEqual(44);
  }
  const check = await page.getByRole('button', { name: /Check/ }).boundingBox();
  expect(check!.height).toBeGreaterThanOrEqual(44);
});

test('the drill takes the bottom of the screen, so the tab bar does not sit under the keypad', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);

  await page.goto('/warmup');
  await expect(page.locator('nav[aria-label="Primary"]').getByText('Warm up')).toBeVisible();

  await page.goto('/warmup/3');
  await expect(box(page)).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(0);
});

test('the keypad and the whole drill fit the viewport without scrolling sideways', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);

  for (const path of ['/warmup', '/warmup/3', '/warmup/history']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await overflowsSideways(page), `${path} overflows horizontally`).toBe(false);
  }
});

test('the keypad sits inside the safe area at the bottom', async ({ page, request, baseURL }) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/warmup/3');
  await expect(box(page)).toBeVisible();

  const check = await page.getByRole('button', { name: /Check/ }).boundingBox();
  const viewport = page.viewportSize()!;
  expect(check!.y + check!.height).toBeLessThanOrEqual(viewport.height);
});
