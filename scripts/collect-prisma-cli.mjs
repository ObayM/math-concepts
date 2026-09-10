import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const modules = path.join(root, 'node_modules');
const out = process.argv[2];

if (!out) {
  console.error('usage: node scripts/collect-prisma-cli.mjs <staging-dir>');
  process.exit(1);
}

function manifestOf(name) {
  const direct = path.join(modules, name, 'package.json');
  if (fs.existsSync(direct)) return direct;
  try {
    return require.resolve(`${name}/package.json`, { paths: [modules, root] });
  } catch {
    return null;
  }
}

const ALREADY_IN_RUNNER = (name) => name === 'prisma' || name.startsWith('@prisma/');

const seen = new Set();
const queue = ['prisma'];
const found = [];

while (queue.length) {
  const name = queue.shift();
  if (seen.has(name)) continue;
  seen.add(name);

  const manifest = manifestOf(name);
  if (!manifest) continue;

  const dir = path.dirname(manifest);
  if (!ALREADY_IN_RUNNER(name)) found.push({ name, dir });

  const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  for (const dep of Object.keys(pkg.dependencies ?? {})) queue.push(dep);
  for (const [dep, meta] of Object.entries(pkg.peerDependenciesMeta ?? {})) {
    if (!meta?.optional) queue.push(dep);
  }
}

fs.rmSync(out, { recursive: true, force: true });
for (const { name, dir } of found) {
  const dest = path.join(out, 'node_modules', name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(dir, dest, { recursive: true, dereference: true });
}

console.log(`staged ${found.length} packages for the prisma cli into ${out}`);
