---
title: Agents and WebMCP
description: Let an AI agent drive a tour through the browser's own tool API instead of clicking around the DOM, and what this site does to be readable by LLMs.
---

Guidepost is built on browser primitives, and browsers are growing one more:
[WebMCP](https://developer.chrome.com/docs/ai/webmcp), a way for a page to hand
an agent a list of typed tools instead of making it guess at buttons. A tour
is a natural fit. It already has a small, well-defined controller (`start`,
`next`, `back`, `goTo`, `cancel`), and those map onto tools one for one.

[The live demo](https://guidepost.live) does exactly this. Open it in a browser
with WebMCP enabled and an agent can start the tour, pick a mode, step through
it, and read where it is, without touching a pixel.

## What the demo registers

| Tool | What it does |
| --- | --- |
| `start_tour` | Starts the tour. Optional `mode` (`default`, `js`, `open`) and `step` (a step id) |
| `next_step`, `previous_step` | Move one step |
| `go_to_step` | Jump to a step by id |
| `end_tour` | Dismiss the tour |
| `get_tour_state` | Read-only. Whether a tour is running, the current step, the mode, and every step's id and title |
| `get_browser_support` | Read-only. Which underlying browser features this browser has |
| `get_library_info` | Read-only. Package name, version, install command, docs links |

Every mutating tool returns the new tour state as JSON, so an agent never has
to follow up with a read to learn what happened.

## Wrap your own tour

Registration is a few lines. Feature-detect, describe each tool with a JSON
Schema, and call the controller from `execute`.

```js
import { Tour } from '@cmunns/guidepost';

const tour = new Tour({ id: 'onboarding', steps });
const ids = steps.map((s) => s.id);

const state = () => JSON.stringify({
  active: tour.isActive,
  step: tour.current?.id ?? null,
  index: tour.index,
  total: steps.length,
});

const tools = [
  {
    name: 'start_tour',
    description: 'Start the onboarding tour. Optionally start at a specific step id.',
    inputSchema: {
      type: 'object',
      properties: { step: { type: 'string', enum: ids, description: 'Step id to start at.' } },
    },
    execute: async ({ step }) => { await tour.start(step ?? 0); return state(); },
  },
  {
    name: 'next_step',
    description: 'Advance the running tour by one step. Finishes the tour on the last step.',
    inputSchema: { type: 'object', properties: {} },
    execute: async () => { await tour.next(); return state(); },
  },
  {
    name: 'get_tour_state',
    description: 'Read whether the tour is running and which step it is on.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: async () => state(),
  },
];

// document.modelContext is where Chrome puts it. Older drafts used navigator.
const modelContext = document.modelContext ?? navigator.modelContext;
if (modelContext?.registerTool) {
  for (const tool of tools) modelContext.registerTool(tool);
}
```

Three habits that make tools worth calling:

- **Enumerate what you can.** Step ids as an `enum` mean the agent can't ask for
  a step that doesn't exist, and the schema doubles as documentation.
- **Return state, not "ok".** `await tour.next()` resolves after the step is on
  screen, so the state you return is the state the user is looking at.
- **Mark reads read-only.** `annotations.readOnlyHint` lets an agent call them
  freely while it decides what to do.

Chrome's [tool-building guide](https://developer.chrome.com/docs/ai/webmcp/build-tools)
and [security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
cover naming, descriptions and what not to expose.

## Turning it on

WebMCP ships in Chrome 149+ behind an
[origin trial](https://developer.chrome.com/origintrials). Register your origin,
then put the token on the page:

```html
<meta http-equiv="origin-trial" content="…token…">
```

For local development, enable `chrome://flags/#enable-webmcp-testing` instead.
The API is absent everywhere else, and the snippet above does nothing there,
so it is safe to ship unconditionally.

To see what a page has registered, run Lighthouse's
[Registered WebMCP tools](https://developer.chrome.com/docs/lighthouse/agentic-browsing/registered-webmcp-tools)
audit, or in the console:

```js
(await document.modelContext.getTools()).map((t) => t.name);
```

## Readable by LLMs

Both sites also publish plain-text summaries for models that read pages rather
than run them:

- [guidepost.live/llms.txt](https://guidepost.live/llms.txt), what the library
  is, the API in brief, and the tools the demo registers
- [docs.guidepost.live/llms.txt](https://docs.guidepost.live/llms.txt), an index
  of these docs
- [docs.guidepost.live/llms-full.txt](https://docs.guidepost.live/llms-full.txt),
  every page in one file

Both `robots.txt` files allow AI crawlers by name, and both sites have sitemaps.
