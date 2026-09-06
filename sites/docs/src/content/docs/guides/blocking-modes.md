---
title: Blocking modes
description: Three combinations of blocking and interactive — and the choice matters more than any styling decision.
---

Three combinations, and the choice matters more than any styling decision.

## Blocking and interactive — the default

The page is dimmed and inert, but the spotlighted element stays live, so the user
can do the thing the step is describing. The cutout passes clicks through because
`clip-path` affects hit testing.

```js
new Tour({ steps }); // blocking: true, interactive: true
```

## Fully blocking

Nothing outside the card responds. Use it for steps that are purely explanatory,
where a stray click would derail things. This is the only mode that sets
`aria-modal`, because it is the only one where it is true.

```js
new Tour({ steps, interactive: false });
```

## Non-blocking

Hints alongside a working app. Nothing is inert, nothing intercepts clicks, and the
user can ignore the tour entirely. Weakest focus guarantees — the trade is
deliberate.

```js
new Tour({ steps, blocking: false });
```

All three modes are running side by side at [guidepost.dev](https://guidepost.dev).
</content>
