// Bundles the library into a single self-contained demo page (no build step,
// no network) — useful for sharing, embedding, or opening straight off disk.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

execFileSync(
  'npx',
  ['esbuild', 'src/index.ts', '--bundle', '--minify', '--format=iife',
   '--global-name=Guidepost', '--target=es2022', '--outfile=artifact/bundle.js'],
  { cwd: root, stdio: 'inherit' },
);

const bundle = readFileSync(join(root, 'artifact/bundle.js'), 'utf8').trim();

// The logo ships as a real PNG in the repo and is inlined as a data URI at
// build time, because a published artifact cannot load images from anywhere else.
const logo =
  'data:image/png;base64,' +
  readFileSync(join(root, 'artifact/assets/guidepost-logo.png')).toString('base64');

for (const [src, out] of [
  ['artifact/demo.src.html', 'artifact/guidepost-demo.html'],
  ['artifact/docs.src.html', 'artifact/guidepost-docs.html'],
]) {
  const page = readFileSync(join(root, src), 'utf8')
    .replace('/*__GUIDEPOST_BUNDLE__*/', bundle)
    .replaceAll('__GUIDEPOST_LOGO__', logo);
  writeFileSync(join(root, out), page);
  console.log(`wrote ${out}`);
}
