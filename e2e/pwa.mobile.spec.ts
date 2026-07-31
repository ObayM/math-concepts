import { test, expect } from '@playwright/test';

// installing happens before you sign in, so every one of these has to answer
// without a session cookie. the proxy redirects anything it does not know.
test('the manifest and the worker are reachable without a session', async ({ page }) => {
  const gated = await page.request.get('/dashboard', { maxRedirects: 0 });
  expect(gated.status(), 'the auth gate must be live for this test to mean anything').toBe(307);

  for (const path of ['/manifest.webmanifest', '/sw.js', '/offline', '/icon-192.png']) {
    const res = await page.request.get(path, { maxRedirects: 0 });
    expect(res.status(), `${path} should not be gated`).toBe(200);
  }
});

test('the manifest describes an installable app', async ({ page }) => {
  const res = await page.request.get('/manifest.webmanifest');
  const manifest = await res.json();

  expect(manifest.name).toBe('Mathly');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/dashboard');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
});

test('the document points at the manifest and a touch icon', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest'
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
});

test('the viewport opts into the safe area', async ({ page }) => {
  await page.goto('/login');
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content).toContain('width=device-width');
  expect(content).toContain('viewport-fit=cover');
});
