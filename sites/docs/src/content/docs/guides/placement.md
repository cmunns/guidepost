---
title: Placement
description: Four sides with optional alignment, plus center for a card with no target, and what happens when the card doesn't fit.
---

Four sides, each with an optional alignment:
`top`, `right`, `bottom`, `left`,
any of them suffixed `-start`, `-center` or `-end`,
plus `center` for a card with no target at all.

You're stating a preference here, not a coordinate. When the card doesn't fit,
the browser's `position-try-fallbacks` flips it. On the JS path, your
`fallbackPlacements` get tried in order and the card gets clamped into the
viewport. The arrow is measured afterward, so it always agrees with where the
card actually landed.

Each placement is demonstrated live at [the live demo](https://guidepost.live).
