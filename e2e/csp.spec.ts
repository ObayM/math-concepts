import { test, expect, type Page } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';

const admin = `e2e-csp-admin-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  await createUser(request, baseURL!, admin, 'super_admin');
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: admin } });
  await disconnect();
});

function watchForViolations(page: Page) {
  const hits: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to (load|execute|apply|connect)/i.test(m.text())) {
      hits.push(m.text());
    }
  });
  return hits;
}

test('the policy is served, and it does not allow eval in production', async ({ page }) => {
  const res = await page.goto('/login');
  const policy = res!.headers()['content-security-policy'];

  expect(policy).toContain("default-src 'self'");
  expect(policy).toMatch(/script-src [^;]*'nonce-/);
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain('unsafe-eval');
  expect(policy).not.toMatch(/script-src [^;]*'unsafe-inline'/);
});

test('every nonce is fresh, so one leaked page cannot authorise another', async ({ page }) => {
  const first = (await page.goto('/login'))!.headers()['content-security-policy'];
  const second = (await page.goto('/signup'))!.headers()['content-security-policy'];
  expect(first).not.toBe(second);
});

test('the student pages run clean under the policy', async ({ page, request, baseURL }) => {
  const hits = watchForViolations(page);
  await authenticate(page.context(), request, baseURL!, admin);

  for (const path of ['/dashboard', '/courses/calculus', '/courses/calculus/differentiation-2']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  expect(hits).toEqual([]);
});

test('the Monaco editor loads and runs under the policy', async ({ page, request, baseURL }) => {
  const hits = watchForViolations(page);
  await authenticate(page.context(), request, baseURL!, admin);

  const lesson = await prisma.lesson.findFirstOrThrow({
    where: { lessonKey: 'differentiation-2' },
  });
  await page.goto(`/admin/content/lessons/${lesson.id}/edit`);

  // monaco is the real risk here: it spins up workers and injects its own
  // stylesheets, both of which a careless policy blocks outright
  await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);

  expect(hits).toEqual([]);
});
