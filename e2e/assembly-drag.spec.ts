import { test, expect } from '@playwright/test';

const SOURCE = String.raw`lesson "Drag" {
  slide "Power rule" {
    build {
      ask "Complete the power rule."
      template: "$\frac{d}{dx}\left[x^{3}\right] =$ ___ $\cdot$ ___"
      bank: ["3", "2", "$x^{2}$", "$x^{3}$"]
      answer: ["3", "$x^{2}$"]
    }
  }
}`;

const SORT_SOURCE = String.raw`lesson "Drag" {
  slide "Which rule" {
    sort {
      ask "Which rule opens each derivative?"
      bin "Product rule": ["a sin x", "b ln x"]
      bin "Chain rule": ["(c+1)^3", "sin(3d)"]
    }
  }
}`;

async function dragOnto(page: import('@playwright/test').Page, from: any, to: any) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error('missing box');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 8, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(SOURCE);
  await expect(page.getByText('Complete the power rule.')).toBeVisible({ timeout: 20_000 });
});

test('a token can be dragged from the bank into a slot', async ({ page }) => {
  const slot = page.getByRole('button', { name: /^slot 1,/ });
  await expect(slot).toHaveText('');

  await dragOnto(page, page.locator('[aria-label="Token bank"] button').first(), slot);

  await expect(page.getByRole('button', { name: /^slot 1, filled/ })).toHaveText('3');
});

test('a plain tap still places a token, so the keyboard path survives', async ({ page }) => {
  await page.locator('[aria-label="Token bank"] button').first().click();
  await expect(page.getByRole('button', { name: /^slot 1, filled/ })).toHaveText('3');
});

test('a placed token can be dragged back to the bank to remove it', async ({ page }) => {
  await page.locator('[aria-label="Token bank"] button').first().click();
  const slot = page.getByRole('button', { name: /^slot 1, filled/ });
  await expect(slot).toHaveText('3');

  await dragOnto(page, slot, page.locator('[aria-label="Token bank"]'));

  await expect(page.getByRole('button', { name: /^slot 1, empty/ })).toBeVisible();
});

test('dropping outside every zone leaves the answer alone', async ({ page }) => {
  await page.locator('[aria-label="Token bank"] button').first().click();
  const slot = page.getByRole('button', { name: /^slot 1, filled/ });

  const a = await slot.boundingBox();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(a!.x + 400, a!.y + 500, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByRole('button', { name: /^slot 1, filled/ })).toHaveText('3');
});

test('a sort item can be dragged into a bin and back out again', async ({ page }) => {
  await page.locator('textarea').fill(SORT_SOURCE);
  await expect(page.getByText('Which rule opens each derivative?')).toBeVisible({
    timeout: 20_000,
  });

  const tray = page.locator('[aria-label="Items left to sort"] button');
  await expect(tray).toHaveCount(4);

  await dragOnto(page, tray.first(), page.getByRole('button', { name: /^Chain rule/ }));
  await expect(tray).toHaveCount(3);

  await dragOnto(
    page,
    page.getByRole('button', { name: /in Chain rule/ }).first(),
    page.locator('[aria-label="Items left to sort"]')
  );
  await expect(tray).toHaveCount(4);
});
