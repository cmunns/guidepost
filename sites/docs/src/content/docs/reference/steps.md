---
title: Steps
description: Every field on a TourStep. Only target and some content are meaningful on their own — everything else has a working default.
---

Only `target` and some content are meaningful on their own. Everything
else has a working default.

| Field | Type | What it does |
| --- | --- | --- |
| `id` | `string` | Stable handle for `goTo('id')`, deep links and analytics. |
| `target` | `string \| Element \| fn` | CSS selector, element, or a function returning one. Omit (or pass `null`) for a centred step. |
| `title` | `string` | Heading. Becomes part of the card's accessible name. |
| `text` | `string` | Body copy, inserted as text — never parsed as HTML. |
| `html` | `string \| HTMLElement` | Escape hatch for markup. You own the sanitising. |
| `placement` | `Placement` | See [Placement](/guides/placement). Defaults to the tour's. |
| `fallbackPlacements` | `Placement[]` | Ordered placements to try when the preferred one does not fit (JS strategy). |
| `offset` | `number` | Gap between target and card, in px. Default 12. |
| `padding` | `number` | Breathing room around the spotlight cutout. Default 6. |
| `radius` | `number` | Spotlight corner radius. Defaults to the target's own. |
| `interactive` | `boolean` | Keep this target clickable. Overrides the tour setting. |
| `buttons` | `StepButton[]` | Replaces the default row. See [Buttons](/guides/buttons-and-labels). |
| `scrollTo` | `boolean` | Default true — but only scrolls if the target is actually clipped. |
| `waitFor` | `number \| fn` | Milliseconds to wait for the target, or a predicate to await. Default 0 — no wait. |
| `advanceOn` | `{ selector?, event, when? }` | Advance when the user performs the real action. |
| `beforeShow` | `(tour) => void \| Promise` | Runs before the step renders. Await it to delay. |
| `afterHide` | `(tour) => void \| Promise` | Runs after the step is torn down. |
| `focus` | `'card' \| 'target' \| 'none'` | Where focus lands. Default `card`. |
| `when` | `() => boolean` | Return false to skip the step entirely. |
| `classes` | `string` | Extra class names on the card, for per-step styling. |

## StepButton

| Field | Type | What it does |
| --- | --- | --- |
| `label` | `string` | Visible label. |
| `action` | `'next' \| 'back' \| 'cancel' \| 'complete' \| ((tour) => void)` | Built-in action, or a custom handler. |
| `classes` | `string` | Extra class names for styling hooks. |
| `variant` | `'primary' \| 'secondary' \| 'ghost'` | Visual weight. Defaults to `secondary` for back, `primary` for next. |
| `disabled` | `boolean` | Rendered with `aria-disabled` rather than `disabled` so it stays focusable. |

## AdvanceOn

| Field | Type | What it does |
| --- | --- | --- |
| `selector` | `string` | Element to listen on. Defaults to the step's target. |
| `event` | `string` | DOM event name, e.g. `click`, `input`, `submit`. |
| `when` | `(event) => boolean` | Only advance when this returns true. |
</content>
