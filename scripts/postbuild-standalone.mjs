import { cpSync, existsSync } from 'node:fs';

// next build with output: standalone leaves .next/static and public/ outside the
// standalone tree, so `node .next/standalone/server.js` serves a page with no
// css or js until they are copied in. the Dockerfile already does this; this
// makes `npm start` behave the same locally.
const copies = [
  ['.next/static', '.next/standalone/.next/static'],
  ['public', '.next/standalone/public'],
];

for (const [from, to] of copies) {
  if (existsSync(from)) {
    cpSync(from, to, { recursive: true });
    console.log(`copied ${from} -> ${to}`);
  }
}
