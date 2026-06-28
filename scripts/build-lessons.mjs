// compiles every prisma/lessons/*.dsl to *.json using the DSL compiler.
// transpiles the compiler chain with the local tsc (no extra deps, works offline),
// then runs compileLesson over each .dsl. run via `npm run build:lessons`.
import { execSync } from 'node:child_process';
import Module, { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.lessons-build');
const lessonsDir = path.join(root, 'prisma', 'lessons');
const cfg = path.join(root, '.lessons-build.tsconfig.json');

fs.writeFileSync(
  cfg,
  JSON.stringify({
    compilerOptions: {
      module: 'commonjs',
      target: 'es2019',
      skipLibCheck: true,
      moduleResolution: 'node',
      esModuleInterop: true,
      resolveJsonModule: true,
      baseUrl: '.',
      paths: { '@/*': ['./src/*'] },
      rootDir: './src',
      outDir: '.lessons-build',
      noEmit: false,
      jsx: 'react-jsx',
      ignoreDeprecations: '6.0',
    },
    include: ['src/engine/lang/**/*.ts', 'src/engine/ir/**/*.ts', 'src/lib/lessons/**/*.ts'],
  })
);

try {
  execSync(`"${path.join(root, 'node_modules/.bin/tsc')}" -p .lessons-build.tsconfig.json`, {
    cwd: root,
    stdio: 'inherit',
  });

  // tsc keeps the `@/...` imports literal, so map them onto the build dir

  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) {
    if (req.startsWith('@/')) req = path.join(out, req.slice(2));
    return origResolve.call(this, req, ...rest);
  };

  const require = createRequire(import.meta.url);
  const { compileLesson } = require(path.join(out, 'lib/lessons/dsl.js'));

  const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.dsl'));
  for (const file of files) {
    const src = fs.readFileSync(path.join(lessonsDir, file), 'utf8');
    const data = compileLesson(src);
    const jsonPath = path.join(lessonsDir, file.replace(/\.dsl$/, '.json'));
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
    console.log(`built ${file} -> ${path.basename(jsonPath)} (${data.slides.length} slides)`);
  }
} finally {
  fs.rmSync(out, { recursive: true, force: true });
  fs.rmSync(cfg, { force: true });
}
