// One command to cut a release: verify, version, tag, publish, push.
//
//   npm run release -- patch|minor|major|<explicit version>   [--dry-run]
//
// Everything is checked before anything is written, so a failure leaves the
// working tree exactly as it was.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });
const step = (msg) => console.log(`\n\x1b[36m▸ ${msg}\x1b[0m`);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bump = args.find((a) => !a.startsWith('--')) ?? 'patch';

if (!/^(patch|minor|major|\d+\.\d+\.\d+(-[\w.]+)?)$/.test(bump)) {
  console.error(`Unrecognised version "${bump}". Use patch, minor, major, or an explicit x.y.z.`);
  process.exit(1);
}

// ---- preflight -------------------------------------------------------------
step('Checking working tree');
if (run('git', ['status', '--porcelain']).trim()) {
  console.error('Working tree is dirty. Commit or stash first.');
  process.exit(1);
}

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
if (branch !== 'main') {
  console.error(`On branch "${branch}". Releases are cut from main.`);
  process.exit(1);
}

// CI does the publishing, so what matters here is that CI holds a token —
// not whether this machine is logged in.
step('Checking CI publish credentials');
try {
  const secrets = run('gh', ['secret', 'list', '--json', 'name'], { stdio: ['ignore', 'pipe', 'pipe'] });
  if (!JSON.parse(secrets).some((s) => s.name === 'NPM_TOKEN')) {
    console.error('No NPM_TOKEN secret on the repo, so CI cannot publish.');
    console.error('Create a granular token at https://www.npmjs.com/settings/cmunns/tokens');
    console.error('then: gh secret set NPM_TOKEN');
    process.exit(1);
  }
  console.log('  NPM_TOKEN present');
} catch (err) {
  if (err.status === 1 && !err.stdout) throw err;
  console.error('Could not read repo secrets. Is `gh` authenticated?');
  process.exit(1);
}

step('Type checking');
run('npm', ['run', 'typecheck'], { stdio: 'inherit' });

step('Building');
run('npm', ['run', 'build'], { stdio: 'inherit' });

step('Testing');
try {
  run('npm', ['test'], { stdio: 'inherit' });
} catch {
  console.error('\nTests failed. Release aborted.');
  process.exit(1);
}

// Confirm the tarball contains what it should before publishing it.
step('Verifying package contents');
const packed = JSON.parse(run('npm', ['pack', '--dry-run', '--json']));
const files = packed[0].files.map((f) => f.path);
const required = ['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/guidepost.css', 'README.md', 'LICENSE'];
const missing = required.filter((f) => !files.includes(f));
if (missing.length) {
  console.error(`Package is missing: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`  ${files.length} files, ${(packed[0].size / 1024).toFixed(1)} KB tarball`);

if (dryRun) {
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  console.log(`\n\x1b[32m✓ Dry run passed.\x1b[0m ${version} → would bump "${bump}" and publish.`);
  process.exit(0);
}

// ---- release ---------------------------------------------------------------
// Version, tag, push. Publishing happens in CI, triggered by the pushed tag:
// this account requires 2FA on writes, so `npm publish` from a script would
// try to open a browser and fail. The tag is pushed before anything can go
// wrong locally, so a failure never leaves a tag stranded on this machine.
step(`Bumping version (${bump})`);
// `npm version` writes package.json, commits, and creates the tag.
const tag = run('npm', ['version', bump, '-m', 'Release %s']).trim();
console.log(`  ${tag}`);

step('Pushing to GitHub');
run('git', ['push', '--follow-tags'], { stdio: 'inherit' });

const { name, version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
console.log(`\n\x1b[32m✓ Tagged ${name}@${version} and pushed.\x1b[0m`);
console.log('  CI is now publishing to npm. Watch it with:');
console.log('    gh run watch $(gh run list --workflow=Release --limit 1 --json databaseId -q \'.[0].databaseId\')');
console.log(`  npm     https://www.npmjs.com/package/${name}`);
console.log(`  install npm i ${name}@${version}`);
