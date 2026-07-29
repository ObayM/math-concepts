import { test, expect } from '@playwright/test';

const HOTSPOT = String.raw`lesson "Keys" {
  slide "Find it" {
    scene plane {
      x: [-6, 6]
      y: [-6, 6]
      grid
      axes
      curve f = x^2 - 4 { color: primary }
    }
    hotspot {
      ask "Tap the vertex of the parabola."
      target circle (0, -4) { r: 1.5 }
    }
  }
}`;

const POINTS = String.raw`lesson "Keys" {
  slide "Plot it" {
    scene plane {
      x: [-6, 6]
      y: [-6, 6]
      grid
      axes
    }
    sketch points {
      ask "Plot the two roots."
      near (-2, 0)
      near (2, 0)
      tol: 1.2
    }
  }
}`;

const surface = (page: import('@playwright/test').Page) =>
  page.locator('[role="application"]').first();

test('a hotspot can be answered with the keyboard alone', async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(HOTSPOT);
  await expect(page.getByText('Tap the vertex of the parabola.')).toBeVisible({ timeout: 20_000 });

  const check = page.getByRole('button', { name: /^Check$/ });
  await expect(check).toBeDisabled();

  await surface(page).focus();
  // the crosshair starts dead centre at (0, 0); step down to the vertex at (0, -4)
  for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Enter');

  await expect(check).toBeEnabled();
  await check.click();
  await expect(page.getByText(/Right on target/i)).toBeVisible();
});

test('a sketch can be answered with the keyboard alone', async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(POINTS);
  await expect(page.getByText('Plot the two roots.')).toBeVisible({ timeout: 20_000 });

  const check = page.getByRole('button', { name: /^Check$/ });
  await expect(check).toBeDisabled();

  // span is 12, so a shift-step is 1.5: one left lands at -1.5, inside tol 1.2 of -2
  await surface(page).focus();
  await page.keyboard.press('Shift+ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(check).toBeDisabled();

  for (let i = 0; i < 2; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Enter');

  await expect(check).toBeEnabled();
  await check.click();
  await expect(page.getByText(/good match/i)).toBeVisible();
});

test('backspace takes back the last sketched point', async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(POINTS);
  await expect(page.getByText('Plot the two roots.')).toBeVisible({ timeout: 20_000 });

  await surface(page).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Enter');

  const check = page.getByRole('button', { name: /^Check$/ });
  await expect(check).toBeEnabled();

  await page.keyboard.press('Backspace');
  await expect(check).toBeDisabled();
});
