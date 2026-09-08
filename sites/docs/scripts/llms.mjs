// Generates public/llms.txt (an index) and public/llms-full.txt (every page
// in one file) from the docs content, so LLMs and agents can read the whole
// manual in one request instead of crawling the rendered site.
//
// Runs before `astro build` and `astro dev` (see package.json). The starlight
// llms-txt plugin needs a newer Starlight than this site is on, so this does
// the same job in forty lines.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const content = join(root, 'src', 'content', 'docs');
const out = join(root, 'public');
const SITE = 'https://docs.guidepost.live';

// Same order as the sidebar in astro.config.mjs.
const ORDER = [
  'index',
  'install',
  'quick-start',
  'guides/placement',
  'guides/blocking-modes',
  'guides/async-steps',
  'guides/buttons-and-labels',
  'guides/styling',
  'guides/accessibility',
  'guides/recipes',
  'guides/agents',
  'guides/troubleshooting',
  'reference/steps',
  'reference/options',
  'reference/methods',
  'reference/browser-support',
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function parse(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const fm = Object.fromEntries(
    (m?.[1] ?? '')
      .split('\n')
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, '')]),
  );
  let body = raw.slice(m?.[0].length ?? 0);
  // MDX: drop imports and unwrap Starlight components, keeping their text.
  body = body
    .replace(/^import .*from ['"]@astrojs\/.*$/gm, '')
    .replace(/<Card\b[^>]*title="([^"]*)"[^>]*>/g, '**$1.**')
    .replace(/<\/?(Card|CardGrid|Tabs|TabItem|Aside|Steps)\b[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const slug = relative(content, file).replace(/\.(md|mdx)$/, '');
  const url = slug === 'index' ? `${SITE}/` : `${SITE}/${slug}/`;
  return { slug, url, title: fm.title ?? slug, description: fm.description ?? '', body };
}

const pages = walk(content)
  .filter((f) => /\.(md|mdx)$/.test(f))
  .map(parse)
  .sort((a, b) => {
    const ia = ORDER.indexOf(a.slug);
    const ib = ORDER.indexOf(b.slug);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib) || a.slug.localeCompare(b.slug);
  });

const intro = [
  '# Guidepost',
  '',
  '> Accessible product tours built on native browser primitives: the Popover API, CSS anchor positioning, `inert`, and an animated `clip-path` spotlight. 9.7 kB minified and gzipped with the stylesheet included, zero runtime dependencies, MIT licensed.',
  '',
  '- npm package: `@cmunns/guidepost`',
  '- Live demo (registers WebMCP tools an agent can call): https://guidepost.live',
  '- Source and issues: https://github.com/cmunns/guidepost',
  '- Every docs page in one file: https://docs.guidepost.live/llms-full.txt',
  '',
];

const index = [
  ...intro,
  '## Docs',
  '',
  ...pages.map((p) => `- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ''}`),
  '',
];

const full = [
  ...intro,
  ...pages.flatMap((p) => [
    '',
    '---',
    '',
    `# ${p.title}`,
    '',
    `Source: ${p.url}`,
    p.description ? `\n${p.description}` : '',
    '',
    p.body,
    '',
  ]),
];

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'llms.txt'), index.join('\n'));
writeFileSync(join(out, 'llms-full.txt'), full.join('\n'));
console.log(`llms.txt: ${pages.length} pages indexed; llms-full.txt: ${full.join('\n').length} chars`);
