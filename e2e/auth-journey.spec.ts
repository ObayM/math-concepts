import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = `e2e-journey-${Date.now()}@mathly.local`;
const password = 'e2e-password-123';

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

test('a visitor cannot reach the app, then signs up and can', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/signup');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign up|create/i }).click();

  // wait for the credential row, not just the user: better-auth writes the
  // account (which holds the password hash) separately, and signing in before
  // it lands looks exactly like a wrong password.
  await expect
    .poll(
      async () =>
        prisma.account.count({
          where: { user: { email }, password: { not: null } },
        }),
      { timeout: 20_000 }
    )
    .toBeGreaterThan(0);

  // no SMTP in test, so stand in for clicking the verification link
  await prisma.user.update({ where: { email }, data: { emailVerified: true } });

  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await expect(page).toHaveURL(/\/onboarding|\/dashboard/, { timeout: 20_000 });

  if (page.url().includes('/onboarding')) {
    const username = `e2e${Date.now().toString().slice(-8)}`;
    await page.getByPlaceholder(/obay/i).fill(username);
    const submit = page.getByRole('button', { name: /complete profile/i });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    // the browser's timezone is captured at onboarding, no settings needed
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.username).toBe(username);
    expect(user.timezone).toBeTruthy();
  }

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/hey|welcome/i);
});

test('the /@username shortcut reaches a public profile', async ({ page }) => {
  const someone = await prisma.user.findFirst({
    where: { username: { not: null } },
    select: { username: true, name: true },
  });
  test.skip(!someone, 'no user with a username yet');

  const res = await page.goto(`/@${someone!.username}`);
  expect(res!.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/@${someone!.username}$`));
  await expect(page.locator('body')).toContainText(someone!.name);
});
