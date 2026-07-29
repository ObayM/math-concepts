import { test, expect } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';
const email = `e2e-detour-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  await createUser(request, baseURL!, email);
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await disconnect();
});

test.beforeEach(async ({ page, request, baseURL }) => {
  await authenticate(page.context(), request, baseURL!, email);
});

test('a wrong answer sends you on a detour and brings you back', async ({
  page,
  request,
  baseURL,
}) => {
  // resume straight onto the slide that carries onwrong:, which also exercises
  // the resume path
  const cookies = await page.context().cookies();
  await request.post(`${baseURL}/api/progress`, {
    headers: {
      origin: baseURL!,
      cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      'content-type': 'application/json',
    },
    data: { lessonKey: 'differentiation-2', currentStep: 3, isCompleted: false },
  });

  await page.goto('/courses/calculus/differentiation-2');
  await expect(page.getByText(/pick the product rule/i)).toBeVisible({ timeout: 20_000 });

  // assemble a deliberately wrong answer: the u'v' trap, then uv
  const token = (n: number) => page.locator('[aria-label="Token bank"] button').nth(n);
  const assembleWrong = async () => {
    await token(2).click();
    await token(3).click();
  };

  await assembleWrong();
  await page.getByRole('button', { name: 'Check' }).click();

  // the player offers the scaffold rather than plain Continue
  const backUp = page.getByRole('button', { name: "Let's back up" });
  await expect(backUp).toBeVisible({ timeout: 10_000 });
  await backUp.click();

  await expect(page.getByText(/quick detour/i)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/sum, not a product/i);

  // the scaffold is an ordinary slide, so it has its own exercise to work
  await page.getByRole('radio').first().click();
  await page.getByRole('button', { name: 'Check' }).click();

  // the branch was authored `retry`, so it returns you to the question
  const tryAgain = page.getByRole('button', { name: /try it again/i });
  await expect(tryAgain).toBeVisible({ timeout: 10_000 });
  await tryAgain.click();

  await expect(page.getByText(/quick detour/i)).toBeHidden();

  // coming back resets the answer, so the slots are empty again
  await expect(page.getByRole('button', { name: /^slot 1, empty/ })).toBeVisible();

  // a detour fires at most once per slide
  await assembleWrong();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('button', { name: "Let's back up" })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
});

test('answers are recorded server side, and a forged one does not count', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/courses/calculus/differentiation-2');
  const cookies = await page.context().cookies();
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  const res = await request.post(`${baseURL}/api/progress`, {
    headers: { origin: baseURL!, cookie, 'content-type': 'application/json' },
    data: {
      lessonKey: 'differentiation-2',
      currentStep: 3,
      isCompleted: false,
      quizHistory: [
        {
          title: 'Product rule',
          question: 'forged',
          slideId: 'd2-quiz-product',
          kind: 'build',
          correct: true,
          answer: ["$u'v'$", '$uv$'],
        },
      ],
    },
  });
  expect(res.status()).toBe(200);

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const attempt = await prisma.lessonAttempt.findFirstOrThrow({
    where: { userId: user.id, slideId: 'd2-quiz-product' },
  });
  expect(attempt.correct).toBe(false);
});

test('a cross origin write is refused even with a valid session', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/dashboard');
  const cookies = await page.context().cookies();
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  const res = await request.post(`${baseURL}/api/activity`, {
    headers: { origin: 'https://evil.test', cookie },
    data: {},
  });
  expect(res.status()).toBe(403);
});
