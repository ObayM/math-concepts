import { test, expect, type Page, type Locator } from '@playwright/test';

const BUILD_SOURCE = String.raw`lesson "Drag" {
  slide "Power rule" {
    build {
      ask "Complete the power rule."
      template: "$\frac{d}{dx}\left[x^{3}\right] =$ ___ $\cdot$ ___"
      bank: ["3", "2", "$x^{2}$", "$x^{3}$"]
      answer: ["3", "$x^{2}$"]
    }
  }
}`;

const SCENE_SOURCE = String.raw`lesson "Scene" {
  slide "Drag the point" {
    scene {
      x: [-5, 5]
      y: [-5, 5]
      param a = 0 { range: [-5, 5], step: 1 }
      point p = (a, 0) { drag: x -> a, color: primary }
    }
    goal "move it right" when: a > 2
  }
}`;

// a mouse drag in a touch context still reports pointerType "mouse", so the
// only way to prove a finger works is to dispatch real touch events
async function touchDrag(page: Page, from: Locator, to: Locator) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error('missing box');
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: start.x, y: start.y }],
  });
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: start.x + ((end.x - start.x) * i) / steps,
          y: start.y + ((end.y - start.y) * i) / steps,
        },
      ],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('a token can be dragged into a slot with a finger', async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(BUILD_SOURCE);
  await expect(page.getByText('Complete the power rule.')).toBeVisible({ timeout: 20_000 });

  const slot = page.getByRole('button', { name: /^slot 1,/ });
  await expect(slot).toHaveText('');

  await touchDrag(page, page.locator('[aria-label="Token bank"] button').first(), slot);

  await expect(page.getByRole('button', { name: /^slot 1, filled/ })).toHaveText('3');
});

test('a tap still places a token, so drag stays additive on touch', async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(BUILD_SOURCE);
  await expect(page.getByText('Complete the power rule.')).toBeVisible({ timeout: 20_000 });

  await page.locator('[aria-label="Token bank"] button').first().tap();

  await expect(page.getByRole('button', { name: /^slot 1, filled/ })).toHaveText('3');
});

test('a scene point can be dragged with a finger', async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(SCENE_SOURCE);
  await expect(page.locator('svg[viewBox]').first()).toBeVisible({ timeout: 20_000 });

  const svg = page.locator('svg[viewBox]').first();
  const box = await svg.boundingBox();
  if (!box) throw new Error('no scene');

  const cdp = await page.context().newCDPSession(page);
  const y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box.x + box.width / 2, y }],
  });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width / 2 + (box.width * 0.35 * i) / 12, y }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();

  await expect(page.getByText(/move it right/i)).toBeVisible();
});

test('the scene svg locks page scrolling so a drag is never a scroll', async ({ page }) => {
  await page.goto('/prism/play');
  await page.locator('textarea').fill(SCENE_SOURCE);
  const svg = page.locator('svg[viewBox]').first();
  await expect(svg).toBeVisible({ timeout: 20_000 });

  await expect(svg).toHaveCSS('touch-action', 'none');
});
