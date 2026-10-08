import { test, expect } from '@playwright/test';
import { compileLesson } from '@/engine/lang';
import { authenticate, createUser, disconnect, prisma } from './helpers';

const stamp = Date.now();
const email = `e2e-bank-${stamp}@mathly.local`;
const courseName = `E2E Bank ${stamp}`;
const slug = `e2e-bank-${stamp}`;
const lessonKey = `e2e-bank-${stamp}`;

const question = (n: number, round: string) => `  slide "Q${n}" {
    id: "q${n}"
    cat: "${round}"
    numeric {
      ask "What is ${n} + ${n}?"
      skill: "doubling"
      answer: ${2 * n}
      ! "Two lots of ${n}."
    }
  }`;

const SOURCE = `lesson "Doubling bank" {
  kind: "bank"
${[1, 2, 3, 4].map((n) => question(n, 'Warm up')).join('\n')}
${[5, 6].map((n) => question(n, 'Faster')).join('\n')}
}`;

test.beforeAll(async ({ request, baseURL }) => {
  await createUser(request, baseURL!, email);
  const data = compileLesson(SOURCE);
  const course = await prisma.course.create({ data: { name: courseName, slug } });
  await prisma.lesson.create({
    data: {
      courseId: course.id,
      lessonKey,
      source: SOURCE,
      data: data as never,
      publishedSource: SOURCE,
      publishedData: data as never,
      title: data.title,
      kind: 'bank',
      status: 'published',
      publishedAt: new Date(),
      sortOrder: 1,
    },
  });
});

test.afterAll(async () => {
  await prisma.course.deleteMany({ where: { name: courseName } });
  await prisma.user.deleteMany({ where: { email } });
  await disconnect();
});

test('a bank resumes where you left it, keeps your answers and stops between rounds', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, email);
  await page.goto(`/courses/${slug}/${lessonKey}`);

  const heading = page.getByRole('heading', { level: 1 });
  const input = page.getByRole('textbox', { name: 'your answer' });
  const answer = async (n: number) => {
    await expect(heading).toHaveText(`Q${n}`, { timeout: 20_000 });
    await input.fill(String(2 * n));
    await page.getByRole('button', { name: 'Check' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
  };

  await expect(page.getByText('Round 1 of 2 · Warm up')).toBeVisible({ timeout: 20_000 });
  for (const n of [1, 2, 3]) await answer(n);
  await expect(heading).toHaveText('Q4');

  await expect
    .poll(
      async () =>
        (
          await prisma.userLessonProgress.findFirst({
            where: { user: { email }, lesson: { lessonKey } },
          })
        )?.currentStep,
      { timeout: 10_000 }
    )
    .toBe(3);

  await page.reload();
  await expect(heading).toHaveText('Q4', { timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Question 3, right' })).toBeVisible();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(heading).toHaveText('Q3');
  await expect(input).toHaveValue('6');
  await expect(input).toBeDisabled();

  await page.getByRole('button', { name: 'Continue' }).click();
  await answer(4);

  await expect(page.getByText('Round 1 done')).toBeVisible();
  await expect(page.getByText('4 of 4 right')).toBeVisible();
  await page.getByRole('button', { name: 'Next round' }).click();
  await expect(heading).toHaveText('Q5');
  await expect(page.getByText('Round 2 of 2 · Faster')).toBeVisible();
});
