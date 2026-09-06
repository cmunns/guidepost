/**
 * Reproducible evidence for the comparison table in the README.
 *
 *   npm i --no-save driver.js shepherd.js intro.js react-joyride @reactour/tour tourguidejs
 *   node scripts/compare.mjs
 *
 * Measures each library's own published bundle (min+gzip, including any
 * stylesheet it ships) and probes it for the accessibility primitives a tour
 * needs. It reads shipped artefacts only — no claims from documentation.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LIBS = {
  'driver.js': ['dist/driver.js.mjs', 'dist/driver.css'],
  'shepherd.js': ['dist/js/shepherd.mjs', 'dist/css/shepherd.css'],
  'intro.js': ['minified/intro.min.js', 'minified/introjs.min.css'],
  'react-joyride': ['dist/index.mjs'],
  '@reactour/tour': ['dist/index.mjs', 'dist/index.css'],
  tourguidejs: ['tourguide.min.js'],
};

const PROBES = {
  'top layer (popover)': /showPopover/,
  'native tether (anchor)': /anchor-name|position-area/,
  inert: /\.inert\b|["']inert["']|\sinert[\s=\]]/,
  'aria-live': /aria-live/,
  'aria-modal': /aria-modal/,
  'reduced motion': /prefers-reduced-motion/,
  'moves focus': /\.focus\(/,
  'Escape exit': /Escape|exitOnEsc|keyCode\s*===?\s*27/,
};

const kb = (n) => (n / 1024).toFixed(1) + ' kB';

function read(paths) {
  return paths
    .map((p) => (existsSync(p) ? readFileSync(p, 'utf8') : ''))
    .join('\n');
}

function biggest(dir, re) {
  let best = null;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (!/node_modules|src/.test(e.name)) walk(p);
      } else if (re.test(e.name)) {
        const s = statSync(p).size;
        if (!best || s > best[1]) best = [p, s];
      }
    }
  };
  try {
    walk(dir);
  } catch {
    return null;
  }
  return best;
}

const rows = [];

// Guidepost measures itself the same way: minified bundle, stylesheet included
// (ours is inlined in the JS), gzipped.
const own = biggest('dist', /\.js$/);
if (own) {
  const { execFileSync } = await import('node:child_process');
  execFileSync('npx', [
    'esbuild', 'src/index.ts', '--bundle', '--minify',
    '--format=esm', '--outfile=.compare-tmp.js',
  ]);
  const src = readFileSync('.compare-tmp.js', 'utf8');
  rows.push({
    name: 'guidepost',
    version: JSON.parse(readFileSync('package.json', 'utf8')).version,
    license: 'MIT',
    deps: 0,
    size: gzipSync(src).length,
    src,
  });
}

for (const [name, files] of Object.entries(LIBS)) {
  const dir = join('node_modules', name);
  if (!existsSync(dir)) {
    console.log(`skipping ${name} — not installed`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const src = read(files.map((f) => join(dir, f)));
  if (!src) {
    console.log(`skipping ${name} — expected files not found`);
    continue;
  }
  rows.push({
    name,
    version: pkg.version,
    license: pkg.license,
    deps: Object.keys(pkg.dependencies ?? {}).length,
    size: gzipSync(src).length,
    src,
  });
}

const probeNames = Object.keys(PROBES);
const w = Math.max(...rows.map((r) => r.name.length)) + 2;

console.log('\nOwn bundle, minified + gzipped, shipped stylesheet included\n');
for (const r of rows.slice().sort((a, b) => a.size - b.size)) {
  console.log(
    `  ${r.name.padEnd(w)} ${kb(r.size).padStart(8)}   ${String(r.deps).padStart(2)} deps   ${r.license}`,
  );
}

console.log('\nAccessibility primitives present in the shipped bundle\n');
console.log('  ' + ''.padEnd(w) + probeNames.map((n) => n.slice(0, 9).padEnd(11)).join(''));
for (const r of rows) {
  console.log(
    '  ' +
      r.name.padEnd(w) +
      probeNames.map((n) => (PROBES[n].test(r.src) ? 'yes' : '-').padEnd(11)).join(''),
  );
}
console.log(
  '\nA regex probe proves a primitive is *used*, not that it is used correctly.\n' +
    'It is evidence, not an audit.\n',
);
