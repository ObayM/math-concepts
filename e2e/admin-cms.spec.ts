import { test, expect } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';
const admin = `e2e-admin-${Date.now()}@mathly.local`;
const student = `e2e-cms-student-${Date.now()}@mathly.local`;
const courseName = `E2E Trig ${Date.now()}`;

test.beforeAll(async ({ request, baseURL }) => {
  await createUser(request, baseURL!, admin, 'super_admin');
  await createUser(request, baseURL!, student, 'student');
});

test.afterAll(async () => {
  await prisma.course.deleteMany({ where: { name: courseName } });
  await prisma.user.deleteMany({ where: { email: { in: [admin, student] } } });
  await disconnect();
});

test('a student cannot see the admin console', async ({ page, request, baseURL }) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/admin/content');
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('body')).not.toContainText('New course');
});

test('an admin creates a course, and it stays invisible until published', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, admin);
  await page.goto('/admin/content');

  await page.locator('form input[name="name"]').first().fill(courseName);
  await page.getByRole('button', { name: 'Create course' }).click();

  await expect
    .poll(async () => (await prisma.course.findFirst({ where: { name: courseName } }))?.status, {
      timeout: 20_000,
    })
    .toBe('draft');

  await page.reload();
  await expect(page.getByRole('heading', { name: courseName })).toBeVisible({ timeout: 15_000 });

  // a draft course is invisible to students
  await expect(
    page.locator('body').filter({ hasText: courseName }).getByText('draft').first()
  ).toBeVisible();

  // publishing an empty course is refused, because students would land on nothing
  const publishForm = page.locator('form').filter({
    has: page.locator(`input[name="name"][value="${courseName}"]`),
  });
  await publishForm.getByRole('button', { name: /publish course/i }).click();
  await expect(page.getByText(/publish at least one lesson/i)).toBeVisible({ timeout: 20_000 });

  const stillDraft = await prisma.course.findFirstOrThrow({ where: { name: courseName } });
  expect(stillDraft.status).toBe('draft');
});

test('every privileged action lands in the audit log', async ({ page, request, baseURL }) => {
  await authenticate(page.context(), request, baseURL!, admin);
  await page.goto('/admin/audit');

  await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
  await expect(page.locator('body')).toContainText('course.created', { timeout: 15_000 });
  await expect(page.locator('body')).toContainText(admin);
});
