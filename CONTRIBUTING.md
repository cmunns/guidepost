# Working on Guidepost

Everything runs from the repo root. The library lives in `src/`; the two
public sites are npm workspaces under `sites/`.

```
src/            the library — the only thing that gets published
sites/demo/     the demo app (Vite)      → guidepost.live
sites/docs/     the docs site (Starlight) → docs.guidepost.live
scripts/        build, release, and size tooling
test/           Playwright tests, run against the built demo
artifact/       the original self-contained Claude Desktop pages (kept for reference)
```

## Setup

```bash
npm install     # installs the root package and both site workspaces
```

## Day to day

| Command | What it does |
| --- | --- |
| `npm run dev` | Rebuild the library on change (tsup watch) |
| `npm run dev:demo` | Demo at 127.0.0.1:5173, against your working-tree build |
| `npm run dev:docs` | Docs at 127.0.0.1:4321 |
| `npm run build` | Build the library into `dist/` |
| `npm run build:sites` | Build the library and both sites |
| `npm test` | Playwright suite (builds the demo first) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run size` | Bundle size against the 10.5 kB budget |

The demo imports the library by package name (`@cmunns/guidepost`), aliased in
`sites/demo/vite.config.js` to the local `dist/`. So it exercises the same entry
point a real consumer would, with no `npm link` step — but it does need
`npm run build` to have run at least once.

## Docs

Pages are Markdown/MDX in `sites/docs/src/content/docs/`. The sidebar is
declared in `sites/docs/astro.config.mjs` — a new page needs an entry there or
it will not appear in navigation. Search (Pagefind) and the sitemap are
generated at build time; nothing to maintain.

Theme colours are ported from the original hand-authored docs page into
Starlight's tokens in `sites/docs/src/styles/theme.css`.

## Releasing

```bash
npm run release -- patch --dry-run   # verify without touching anything
npm run release -- patch             # or minor / major / an explicit x.y.z
```

The script refuses to run on a dirty tree, off `main`, or without CI publish
credentials. It typechecks, builds, tests, and inspects the tarball, then
versions, tags, and pushes.

**Publishing happens in CI, not on your machine.** The npm account has 2FA set
to `auth-and-writes`, so `npm publish` from a script tries to open a browser
and fails. Instead, the pushed tag triggers
`.github/workflows/release.yml`, which publishes with provenance using a token
and cuts a GitHub release.

### One-time setup

Create a **granular access token** at
https://www.npmjs.com/settings/cmunns/tokens — scoped to `@cmunns/guidepost`,
with read and write, and 2FA bypass enabled so automation can use it. Then:

```bash
gh secret set NPM_TOKEN
```

Without that secret the release script stops before it changes anything.

### If a release fails midway

The tag is pushed before publishing, so CI can be retried without re-tagging:
run the Release workflow manually from the Actions tab and give it the existing
tag. Nothing needs to be reset locally.

## Deploys

Both Vercel projects build from the repo root (no root-directory setting) using
`vercel-build:demo` / `vercel-build:docs`, which build the library first and then
the site. Pushes to `main` deploy to production; pull requests get preview URLs.
