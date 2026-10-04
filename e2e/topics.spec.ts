import { test, expect } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';
const admin = `e2e-topics-admin-${Date.now()}@mathly.local`;
const student = `e2e-topics-student-${Date.now()}@mathly.local`;
const title = `E2E Topic ${Date.now()}`;

const SOURCE = `lesson "${title}" {
  unit: "E2E Subject"
  summary: "One idea, no course."
  slide "Pick one" {
    id: "pick"
    > The power rule brings the exponent down.
    quiz {
      ask "Which rule differentiates $x^5$?"
      * "The power rule"
      - "The product rule"
    }
  }
}`;

test.beforeAll(async ({ request, baseURL }) => {
  await createUser(request, baseURL!, admin, 'super_admin');
  await createUser(request, baseURL!, student, 'student');
});

test.afterAll(async () => {
  await prisma.lesson.deleteMany({ where: { title } });
  await prisma.user.deleteMany({ where: { email: { in: [admin, student] } } });
  await disconnect();
});

test('an admin publishes a topic and a student finds it from the dashboard', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, admin);
  await page.goto('/admin/content');
  const res = await page.request.post(`${baseURL}/api/admin/topics`, {
    headers: { origin: baseURL! },
    data: { source: SOURCE, lang: 'en', publish: true },
  });
  expect(res.status()).toBe(201);
  const { key, published } = await res.json();
  expect(published).toBe(true);

  await page.context().clearCookies();
  await authenticate(page.context(), request, baseURL!, student);

  await page.goto('/dashboard');
  await page.getByRole('link', { name: /stuck on one thing/i }).click();
  await expect(page).toHaveURL(/\/topics$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'E2E Subject' })).toBeVisible();

  await page.getByPlaceholder('Search topics').fill('no such thing anywhere');
  await expect(page.getByText(title)).toBeHidden();
  await page.getByPlaceholder('Search topics').fill(title);
  await page.getByText(title).click();
  await expect(page).toHaveURL(new RegExp(`/topics/${key}$`), { timeout: 30_000 });

  await page.getByRole('radio', { name: 'The power rule' }).click();
  await expect(page.getByText(/day streak/i)).toBeHidden();
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: /complete/i }).click();

  await expect(page.getByRole('button', { name: /back to topics/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/day streak/i)).toBeHidden();
  await expect(page.getByText(/\+\d+ XP/)).toBeHidden();

  await page.getByRole('button', { name: /back to topics/i }).click();
  await expect(page).toHaveURL(/\/topics$/, { timeout: 30_000 });
  await page.getByPlaceholder('Search topics').fill(title);
  await expect(page.getByText('Done')).toBeVisible();

  const user = await prisma.user.findUnique({ where: { email: student } });
  expect(await prisma.userDailyActivity.count({ where: { userId: user!.id } })).toBe(0);
});
