import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { guidepostCSS } = await import(join(root, 'dist', 'index.js'));

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(
  join(root, 'dist', 'guidepost.css'),
  `/* guidepost — default stylesheet. Import this instead of passing\n   injectStyles: false if you'd rather own the CSS pipeline. */\n${guidepostCSS}`,
);
console.log('wrote dist/guidepost.css');
