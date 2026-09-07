---
title: Options
description: Every option new Tour(options) takes, what it defaults to, and the lifecycle callbacks.
---

| Option | Default | What it does |
| --- | --- | --- |
| `steps` | none | Required. |
| `id` | none | Used by `remember`, and written into the root as a data attribute. |
| `blocking` | `true` | Apply `inert` to the rest of the page. Also hides that content from assistive tech. |
| `interactive` | `true` | Keep the spotlighted element usable. Ignored when `blocking` is false. |
| `placement` | `'bottom'` | Default for every step. |
| `fallbackPlacements` | `[]` | Tried in order when your first pick doesn't fit (JS strategy). |
| `offset` / `padding` / `radius` | `12` / `6` / auto | Tour-wide geometry defaults. |
| `strategy` | `'auto'` | `auto`, `anchor` or `js`. See [Browser support](/reference/browser-support). |
| `keyboard` | `true` | Escape, arrows, Home and End. |
| `exitOnEscape` | `true` | Escape cancels the tour. |
| `exitOnOverlayClick` | `false` | Clicking the dim cancels. Needs `blocking`. |
| `showClose` | `true` | Show the × in the card corner. |
| `showProgress` | `true` | Show the progress dots. |
| `showCounter` | `true` | Show the "Step n of m" line. |
| `animate` | `'auto'` | `auto` honours `prefers-reduced-motion`, `true` always animates, `false` never does. |
| `flip` | `true` | Morph the card between steps instead of jumping. The shell glides and resizes while the content cross-fades. |
| `injectStyles` | `true` | Set false if you're importing the CSS yourself. |
| `container` | `document.body` | Where the tour DOM gets appended. |
| `onMissingTarget` | `'skip'` | `skip`, `center` or `error`. |
| `remember` | `false` | Writes `guidepost:<id>` to localStorage on completion. |
| `labels` | English | Every string is overridable. See [Labels](/guides/buttons-and-labels). |

## Labels

`labels` takes a `Partial<TourLabels>`, so override only the strings you care
about.

| Field | Type | What it does |
| --- | --- | --- |
| `next` | `string` | Next button. |
| `back` | `string` | Back button. |
| `done` | `string` | Next button on the last step. |
| `close` | `string` | Accessible name for the close ×. |
| `counter` | `(index, total) => string` | Builds the card's counter text, e.g. "Step 2 of 5". |
| `progress` | `string` | Accessible name for the progress dots. |

## Callbacks

```js
new Tour({
  steps,
  onStart:    (tour) => analytics.track('tour_started'),
  onShow:     (tour, step, i) => analytics.track('tour_step', { id: step.id, i }),
  onComplete: (tour) => analytics.track('tour_completed'),
  onCancel:   (tour) => analytics.track('tour_abandoned', { at: tour.index }),
  onDestroy:  (tour) => {},
});
```
