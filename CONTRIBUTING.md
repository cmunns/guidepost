# Working on Guidepost

Everything runs from the repo root. The library lives in `src/`; the two
public sites are npm workspaces under `sites/`.

```
src/            the library — the only thing that gets published
sites/demo/     the demo app (Vite)      → guidepost-demo.vercel.app
sites/docs/     the docs site (Starlight) → guidepost-docs.vercel.app
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
npm run release -- patch --dry-run   # verify without publishing
npm run release -- patch             # or minor / major / an explicit x.y.z
```

The script refuses to run on a dirty tree or off `main`. It typechecks, builds,
tests, and inspects the tarball before it versions, tags, publishes to npm, and
pushes. Pushing the tag also triggers `.github/workflows/release.yml`, which
publishes with provenance and cuts a GitHub release — so CI needs an `NPM_TOKEN`
secret.

## Deploys

Both Vercel projects build from the repo root (no root-directory setting) using
`vercel-build:demo` / `vercel-build:docs`, which build the library first and then
the site. Pushes to `main` deploy to production; pull requests get preview URLs.
