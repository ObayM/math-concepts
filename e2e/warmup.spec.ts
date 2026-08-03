import { test, expect, type Page } from '@playwright/test';
import { authenticate, createUser, disconnect, prisma } from './helpers';

const student = `e2e-warmup-${Date.now()}@mathly.local`;

test.beforeAll(async ({ request, baseURL }) => {
  test.setTimeout(180_000);
  await createUser(request, baseURL!, student);
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: student } });
  await disconnect();
});

function solve(prompt: string): number {
  const squared = /^(\d+)²$/.exec(prompt);
  if (squared) return Number(squared[1]) ** 2;

  const bracket = /^\((\d+) \+ (\d+)\) × (\d+) - (\d+)$/.exec(prompt);
  if (bracket) {
    const [, a, b, c, d] = bracket;
    return (Number(a) + Number(b)) * Number(c) - Number(d);
  }

  const factored = /^(\d+)\(x ([+-]) (\d+)\) = (-?\d+)$/.exec(prompt);
  if (factored) {
    const [, a, sign, b, rhs] = factored;
    const inner = Number(rhs) / Number(a);
    return sign === '+' ? inner - Number(b) : inner + Number(b);
  }

  const bothSides = /^(\d+)x \+ (\d+) = (\d+)x \+ (\d+)$/.exec(prompt);
  if (bothSides) {
    const [, a, b, c, d] = bothSides;
    return (Number(d) - Number(b)) / (Number(a) - Number(c));
  }

  const equation = /^(\d*)x\s*([+-])?\s*(\d+)?\s*=\s*(-?\d+)$/.exec(prompt);
  if (equation) {
    const [, coefficient, sign, constant, rhs] = equation;
    const a = coefficient ? Number(coefficient) : 1;
    const b = constant ? Number(constant) : 0;
    const target = Number(rhs) - (sign === '+' ? b : sign === '-' ? -b : 0);
    return target / a;
  }
  const plainX = /^x\s*([+÷-])\s*(\d+)\s*=\s*(-?\d+)$/.exec(prompt);
  if (plainX) {
    const [, op, operand, rhs] = plainX;
    const n = Number(operand);
    if (op === '+') return Number(rhs) - n;
    if (op === '-') return Number(rhs) + n;
    return Number(rhs) * n;
  }
  const percent = /^(\d+)% of (\d+)$/.exec(prompt);
  if (percent) return (Number(percent[1]) / 100) * Number(percent[2]);
  const fraction = /^(\d+)\/(\d+) of (\d+)$/.exec(prompt);
  if (fraction) return (Number(fraction[1]) / Number(fraction[2])) * Number(fraction[3]);

  const tokens = prompt.split(' ');
  const nums = [Number(tokens[0])];
  const ops: string[] = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = Number(tokens[i + 1]);
    if (op === '×') nums[nums.length - 1] *= n;
    else if (op === '÷') nums[nums.length - 1] /= n;
    else {
      ops.push(op);
      nums.push(n);
    }
  }
  return ops.reduce((sum, op, i) => (op === '+' ? sum + nums[i + 1] : sum - nums[i + 1]), nums[0]);
}

const box = (page: Page) => page.getByLabel(/^Answer for /);

async function answerOne(page: Page, correctly = true) {
  const field = box(page);
  const prompt = (await field.getAttribute('aria-label'))!.replace('Answer for ', '');
  const truth = solve(prompt);
  await field.fill(String(correctly ? truth : truth + 7));
  await field.press('Enter');
  return { prompt, truth };
}

test('a student picks a level, drills, stops and finds the session in their history', async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await authenticate(page.context(), request, baseURL!, student);

  await page.goto('/warmup');
  await expect(page.getByRole('heading', { name: /Get fast at the easy stuff/i })).toBeVisible();

  await page.getByRole('link', { name: /^3 Times tables/ }).click();
  await expect(page).toHaveURL(/\/warmup\/3$/);
  await expect(box(page)).toBeVisible();

  for (let i = 0; i < 4; i++) {
    await answerOne(page);
    await expect(page.getByText(/Nice/)).toHaveCount(0, { timeout: 5_000 });
  }
  await expect(page.getByText('4/4')).toBeVisible();

  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('4 out of 4')).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();

  await page.getByRole('link', { name: /See your history/i }).click();
  await expect(page).toHaveURL(/\/warmup\/history$/);
  await expect(page.getByRole('heading', { name: 'Your history' })).toBeVisible();
  const sessions = page
    .getByRole('heading', { name: 'Every session' })
    .locator('xpath=ancestor::div[1]/following-sibling::div[1]');
  await expect(sessions).toBeVisible();

  const rows = sessions.locator('tbody tr');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('4');
  await expect(rows.first()).toContainText('100%');
});

test('a wrong answer holds the question up with the right answer', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/warmup/3');
  await expect(box(page)).toBeVisible();

  const { prompt, truth } = await answerOne(page, false);
  await expect(page.getByText(`it's ${truth}`)).toBeVisible();
  await expect(page.getByLabel(`Answer for ${prompt}`)).toBeVisible();

  await page.waitForTimeout(1_000);
  await expect(page.getByLabel(`Answer for ${prompt}`)).toBeVisible();

  await box(page).press('Enter');
  await expect(page.getByText(`it's ${truth}`)).toHaveCount(0);
});

test('a forged answer is graded wrong by the server and pays no xp', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);

  const start = await page.request.post(`${baseURL}/api/warmup/session`, {
    data: { level: 3, timezone: 'UTC' },
    headers: { origin: baseURL! },
  });
  expect(start.ok()).toBe(true);
  const { sessionId } = await start.json();

  const flush = await page.request.post(`${baseURL}/api/warmup/answers`, {
    data: {
      sessionId,
      answers: [{ idx: 0, given: '999999', elapsedMs: 10, correct: true }],
    },
    headers: { origin: baseURL! },
  });
  expect(flush.ok()).toBe(true);
  const body = await flush.json();
  expect(body.session.correct).toBe(0);
  expect(body.session.xp).toBe(0);

  const row = await prisma.warmupAnswer.findFirst({ where: { sessionId } });
  expect(row!.correct).toBe(false);
  expect(row!.answer).not.toBe('999999');
});

test('the level ladder is entirely unlocked and every level is reachable', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/warmup');

  const links = page.locator('a[href^="/warmup/"]').filter({ hasNotText: 'history' });
  const hrefs = await links.evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('href')).filter((h) => /^\/warmup\/\d+$/.test(h ?? ''))
  );
  for (let level = 1; level <= 10; level++) {
    expect(hrefs).toContain(`/warmup/${level}`);
  }
});

test('a level off the ladder shows not found instead of a broken drill', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);
  for (const path of ['/warmup/0', '/warmup/11', '/warmup/abc', '/warmup/2.5']) {
    await page.goto(path);
    await expect(page.getByText(/This page doesn/i), path).toBeVisible();
    await expect(page.getByLabel(/^Answer for /)).toHaveCount(0);
  }
});

test('the csv export downloads with real rows in it', async ({ page, request, baseURL }) => {
  test.setTimeout(90_000);
  await authenticate(page.context(), request, baseURL!, student);

  await page.goto('/warmup/4');
  await expect(box(page)).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await answerOne(page);
    await expect(page.getByText(/Nice/)).toHaveCount(0, { timeout: 5_000 });
  }
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText(/out of/)).toBeVisible();

  const sessions = await page.request.get(`${baseURL}/api/warmup/export?scope=sessions`);
  expect(sessions.headers()['content-type']).toContain('text/csv');
  expect(sessions.headers()['content-disposition']).toContain('attachment');
  const sessionCsv = await sessions.text();
  expect(sessionCsv.split('\r\n')[0]).toContain('seconds_per_question');
  expect(sessionCsv.trim().split('\r\n').length).toBeGreaterThan(1);

  const answers = await page.request.get(`${baseURL}/api/warmup/export?scope=answers`);
  const answerCsv = await answers.text();
  expect(answerCsv.split('\r\n')[0]).toContain('prompt');
  expect(answerCsv.trim().split('\r\n').length).toBeGreaterThan(1);
});

test('warm up is reachable from the navbar and the dashboard', async ({
  page,
  request,
  baseURL,
}) => {
  await authenticate(page.context(), request, baseURL!, student);
  await page.goto('/dashboard');

  await expect(page.locator('header').getByRole('link', { name: 'Warm up' })).toBeVisible();
  await page.locator('a[href="/warmup"]:not(header a)').first().click();
  await expect(page).toHaveURL(/\/warmup$/);
  await expect(page.getByRole('heading', { name: /Get fast at the easy stuff/i })).toBeVisible();
});

test('an anonymous visitor is sent to login, not into a drill', async ({ page }) => {
  await page.goto('/warmup');
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/warmup/3');
  await expect(page).toHaveURL(/\/login/);
});
