// Reports the shipped bundle size and fails if it exceeds the budget the
// README advertises. Keeps the headline number in the docs honest.
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_KB = 10.5;

const out = join(mkdtempSync(join(tmpdir(), 'guidepost-size-')), 'bundle.js');
execFileSync('npx', ['esbuild', 'src/index.ts', '--bundle', '--minify',
  '--format=esm', '--target=es2022', `--outfile=${out}`], { cwd: root, stdio: 'pipe' });

const min = readFileSync(out);
const gz = gzipSync(min, { level: 9 });
const kb = gz.length / 1024;

console.log(`minified     ${(min.length / 1024).toFixed(2)} KB`);
console.log(`min + gzip   ${kb.toFixed(2)} KB   (budget ${BUDGET_KB} KB)`);

if (kb > BUDGET_KB) {
  console.error(`\n✗ Over budget by ${(kb - BUDGET_KB).toFixed(2)} KB.`);
  process.exit(1);
}
console.log('✓ within budget');
