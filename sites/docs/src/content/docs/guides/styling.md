---
title: Styling
description: Everything's a custom property. Light and dark both work out of the box, so override whichever you want.
---

Everything's a custom property. Light and dark are both defined out of the box,
so override one or both.

```css
.gp-card {
  --gp-accent: #0f766e;
  --gp-surface: #fff;
  --gp-text: #12171c;
  --gp-radius: 10px;
  --gp-card-width: 24rem;
  --gp-font: 400 15px/1.55 "Inter", system-ui, sans-serif;
}
.gp-scrim { --gp-overlay: rgb(0 0 0 / .55); }
.gp-ring  { --gp-ring-halo: rgb(15 118 110 / .3); }
```

Class hooks, all of them also exposed as `part` attributes:
`.gp-scrim`, `.gp-ring`, `.gp-card`,
`.gp-arrow`, `.gp-counter`, `.gp-title`,
`.gp-body`, `.gp-progress`, `.gp-dot`,
`.gp-actions`, `.gp-btn`, `.gp-close`.

Got a one-off step? `classes` lands on the card, so
`.gp-card.danger { --gp-accent: #b91c1c; }` does what you'd expect.

There's a restyled tour running at [the live demo](https://guidepost.live).
