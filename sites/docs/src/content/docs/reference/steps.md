---
title: Steps
description: Every field on a TourStep. Only target and some content really matter on their own, everything else has a sane default.
---

Only `target` and some content really matter on their own. Everything
else has a working default.

| Field | Type | What it does |
| --- | --- | --- |
| `id` | `string` | Stable handle for `goTo('id')`, deep links and analytics. |
| `target` | `string \| Element \| fn` | CSS selector, element, or a function that returns one. Leave it off (or pass `null`) for a centred step. |
| `title` | `string` | Heading. Becomes part of the card's accessible name. |
| `text` | `string` | Body copy, inserted as text. Never parsed as HTML. |
| `html` | `string \| HTMLElement` | Escape hatch for markup. Sanitising is on you. |
| `placement` | `Placement` | See [Placement](/guides/placement). Falls back to the tour's. |
| `fallbackPlacements` | `Placement[]` | Placements to try in order when your first pick doesn't fit (JS strategy). |
| `offset` | `number` | Gap between target and card, in px. Default 12. |
| `padding` | `number` | Breathing room around the spotlight cutout. Default 6. |
| `radius` | `number` | Spotlight corner radius. Defaults to whatever the target already has. |
| `interactive` | `boolean` | Keep this target clickable. Overrides the tour setting. |
| `buttons` | `StepButton[]` | Replaces the default row. See [Buttons](/guides/buttons-and-labels). |
| `scrollTo` | `boolean` | Default true, but it only scrolls if the target is actually clipped. |
| `waitFor` | `number \| fn` | Milliseconds to wait for the target, or a predicate to await. Default 0, so no waiting. |
| `advanceOn` | `{ selector?, event, when? }` | Move on when the user performs the real action. |
| `beforeShow` | `(tour) => void \| Promise` | Runs before the step renders. Await it to stall. |
| `afterHide` | `(tour) => void \| Promise` | Runs after the step is torn down. |
| `focus` | `'card' \| 'target' \| 'none'` | Where focus lands. Default `card`. |
| `when` | `() => boolean` | Return false and the step gets skipped entirely. |
| `classes` | `string` | Extra class names on the card, for per-step styling. |

## StepButton

| Field | Type | What it does |
| --- | --- | --- |
| `label` | `string` | Visible label. |
| `action` | `'next' \| 'back' \| 'cancel' \| 'complete' \| ((tour) => void)` | Built-in action, or your own handler. |
| `classes` | `string` | Extra class names for styling hooks. |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | Visual weight. Defaults to `secondary` for back, `primary` for next. |
| `disabled` | `boolean` | Gets `aria-disabled` and not the real `disabled` attribute, so it stays focusable. |

## AdvanceOn

| Field | Type | What it does |
| --- | --- | --- |
| `selector` | `string` | Element to listen on. Defaults to the step's target. |
| `event` | `string` | DOM event name, e.g. `click`, `input`, `submit`. |
| `when` | `(event) => boolean` | Only advance when this returns true. |
