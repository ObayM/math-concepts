import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src', 'app', 'og-assets');

const COPY = {
  en: {
    dir: 'ltr',
    font: "'Fraunces', Georgia, serif",
    title: 'Make math click',
    blurb: 'Interactive lessons you can drag, build and poke at.',
  },
  ar: {
    dir: 'rtl',
    font: "'Rubik', 'Noto Naskh Arabic', sans-serif",
    title: 'خلي الرياضيات تبان',
    blurb: 'دروس تفاعلية تقدر تسحبها وتبنيها وتجرب فيها.',
  },
};

function page({ dir, font, title, blurb }) {
  return `<!doctype html>
<html dir="${dir}">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Rubik:wght@600;700&family=Noto+Naskh+Arabic:wght@700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    padding: 80px;
    display: flex; flex-direction: column; justify-content: space-between;
    background-color: #ffffff;
    background-image: radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0);
    background-size: 32px 32px;
    font-family: ${font};
  }
  .brand { display: flex; align-items: center; gap: 16px; }
  .mark {
    width: 56px; height: 56px; border-radius: 16px; background: #2563eb; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Fraunces', Georgia, serif; font-weight: 700; font-size: 34px;
  }
  .name { font-size: 34px; color: #0f172a; font-weight: 700; font-family: 'Fraunces', Georgia, serif; }
  h1 { font-size: 92px; line-height: 1.1; color: #0f172a; max-width: 940px; font-weight: 700; }
  p { margin-top: 24px; font-size: 38px; color: #64748b; max-width: 900px; font-weight: 400; }
  .rule { display: flex; height: 10px; border-radius: 999px; overflow: hidden; }
  .rule i { background: #2563eb; flex: 3; }
  .rule u { background: #e2e8f0; flex: 1; }
</style>
</head>
<body>
  <div class="brand"><div class="mark">M</div><div class="name">Mathly</div></div>
  <div><h1>${title}</h1><p>${blurb}</p></div>
  <div class="rule"><i></i><u></u></div>
</body>
</html>`;
}

const browser = await chromium.launch();
fs.mkdirSync(out, { recursive: true });

for (const [locale, copy] of Object.entries(COPY)) {
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await tab.setContent(page(copy), { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  const file = path.join(out, `og-${locale}.png`);
  await tab.screenshot({ path: file });
  await tab.close();
  console.log(`built ${path.relative(root, file)}`);
}

await browser.close();
