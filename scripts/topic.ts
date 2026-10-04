import fs from 'fs';
import path from 'path';
import { compileLesson, CompileError, formatCompileError } from '@/engine/lang';
import { verifyLesson, isBlocking } from '@/engine/verify';

const USAGE = `usage: npm run topic -- <file.prism> --lang en|ar [--to URL] [--key KEY] [--draft]

  compiles and verifies locally, then posts to /api/content/topics.
  --to     site to publish on (default NEXT_PUBLIC_APP_URL, else http://localhost:3000)
  --key    update this topic instead of making a new one. remembered per file and site
           in .topic-keys.json next to the file, so a rerun updates rather than duplicates
  --draft  save without publishing
  needs CONTENT_API_TOKEN in the env (a shell value beats .env)`;

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const file = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const lang = flag('lang');
const to = (flag('to') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  ''
);
const draft = argv.includes('--draft');
const token = process.env.CONTENT_API_TOKEN;

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

if (!file) die(USAGE);
if (lang && !['en', 'ar'].includes(lang)) die(`--lang must be en or ar\n\n${USAGE}`);
if (!token) die('CONTENT_API_TOKEN is not set');

const filePath = path.resolve(file);
const source = fs.readFileSync(filePath, 'utf8');
const keysPath = path.join(path.dirname(filePath), '.topic-keys.json');
const keys: Record<string, Record<string, string>> = fs.existsSync(keysPath)
  ? JSON.parse(fs.readFileSync(keysPath, 'utf8'))
  : {};
const name = path.basename(filePath);
const key = flag('key') ?? keys[name]?.[to];
if (!key && !lang) die(`--lang is required for a new topic\n\n${USAGE}`);

try {
  const blocking = verifyLesson(compileLesson(source)).filter(isBlocking);
  if (blocking.length && !draft) {
    for (const f of blocking) console.error(`${f.code} ${f.slideId}: ${f.message}`);
    die(`\n${blocking.length} blocking finding(s). fix them, or pass --draft to save anyway`);
  }
} catch (e) {
  die(e instanceof CompileError ? formatCompileError(source, e) : String(e));
}

async function main() {
  const res = await fetch(`${to}/api/content/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source, publish: !draft, ...(key ? { key } : { lang }) }),
  });
  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) die(`${res.status} ${body.error ?? ''}\n${body.detail ?? ''}`.trim());

  keys[name] = { ...keys[name], [to]: body.key };
  fs.writeFileSync(keysPath, `${JSON.stringify(keys, null, 2)}\n`);

  for (const f of body.blocking ?? []) console.error(`${f.code} ${f.slideId}: ${f.message}`);
  console.log(`${key ? 'updated' : 'created'} ${body.key} (${body.status})`);
  console.log(body.url);
}

main().catch((e) => die(String(e)));
