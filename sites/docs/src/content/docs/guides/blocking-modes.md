---
title: Blocking modes
description: Three combinations of blocking and interactive, and why this choice matters more than any styling decision.
---

Three combinations, and this choice matters more than any styling decision
you'll make.

## Blocking and interactive (the default)

The page is dimmed and inert, but the spotlighted element stays live, so the
user can do the thing the step is describing. The cutout passes clicks through
because `clip-path` affects hit testing.

```js
new Tour({ steps }); // blocking: true, interactive: true
```

## Fully blocking

Nothing outside the card responds. Good for steps that are purely explanatory,
where a stray click would derail everything. This is the only mode that sets
`aria-modal`, because it's the only one where that's actually true.

```js
new Tour({ steps, interactive: false });
```

## Non-blocking

Hints alongside a working app. Nothing goes inert, nothing intercepts clicks,
and the user can ignore the tour completely. You get the weakest focus
guarantees here, and that trade is on purpose.

```js
new Tour({ steps, blocking: false });
```

All three modes are running side by side at [the live demo](https://guidepost.live).
