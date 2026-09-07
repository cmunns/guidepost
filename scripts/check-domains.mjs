// Reports whether the custom domains are resolving and serving yet.
// DNS changes propagate on their own schedule; this just answers "is it live".
import { execFileSync } from 'node:child_process';

const targets = [
  ['guidepost.live', 'demo'],
  ['www.guidepost.live', 'demo (www)'],
  ['docs.guidepost.live', 'docs'],
];

const dig = (host, type) => {
  try {
    return execFileSync('dig', ['+short', type, host], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

let allLive = true;

for (const [host, label] of targets) {
  const a = dig(host, 'A') || dig(host, 'CNAME');
  let status;
  if (!a) {
    status = 'no DNS record yet';
    allLive = false;
  } else {
    let code = '000';
    try {
      code = execFileSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}',
        '--max-time', '10', `https://${host}/`], { encoding: 'utf8' }).trim();
    } catch { /* leave 000 */ }
    status = code === '200' ? `serving (HTTP 200)` : `resolves to ${a.split('\n')[0]} but HTTP ${code}`;
    if (code !== '200') allLive = false;
  }
  console.log(`  ${label.padEnd(12)} ${host.padEnd(22)} ${status}`);
}

console.log(allLive
  ? '\n\x1b[32m✓ Both domains are live.\x1b[0m'
  : '\n\x1b[33mNot live yet.\x1b[0m Point DNS at Vercel, then re-run: npm run check:domains');
