import { test, expect } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';
const email = `e2e-events-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  await createUser(request, baseURL!, email);
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await disconnect();
});

test('playing a lesson leaves a trail of events, and leaving it beacons the close', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, email);
  await page.goto('/courses/calculus/differentiation-2');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);

  await page.goto('/courses/calculus');

  const types = () =>
    prisma.lessonEvent
      .findMany({ where: { user: { email } }, orderBy: { clientAt: 'asc' } })
      .then((rows) => rows.map((r) => r.type));
  await expect
    .poll(types, { timeout: 15_000 })
    .toEqual(expect.arrayContaining(['lesson_open', 'slide_enter', 'slide_leave', 'lesson_close']));

  const leave = await prisma.lessonEvent.findFirstOrThrow({
    where: { user: { email }, type: 'slide_leave' },
  });
  expect((leave.payload as { activeMs: number }).activeMs).toBeGreaterThan(1000);
});
