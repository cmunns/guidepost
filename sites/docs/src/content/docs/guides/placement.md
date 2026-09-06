---
title: Placement
description: Four sides with optional alignment, plus center for a card with no target at all — and what happens when the card will not fit.
---

Four sides, each with an optional alignment:
`top`, `right`, `bottom`, `left`,
any of them suffixed `-start`, `-center` or `-end`,
plus `center` for a card with no target at all.

You are stating a preference, not a coordinate. When the card will not fit, the
browser's `position-try-fallbacks` flips it — or, on the JS path,
your `fallbackPlacements` are tried in order and the card is clamped
into the viewport. The arrow is measured after the fact, so it always agrees with
where the card actually ended up.

Each placement is demonstrated live at [guidepost.dev](https://guidepost.dev).
</content>
